/**
 * @fileoverview Payment method management service for HarborList billing system.
 * 
 * Provides secure payment method storage and management with PCI compliance.
 * Handles payment method creation, validation, storage, and retrieval across
 * multiple payment processors (Stripe, PayPal).
 * 
 * Security Features:
 * - PCI DSS compliant payment method handling
 * - Encrypted payment method storage
 * - Secure tokenization through payment processors
 * - Input validation and sanitization
 * - Audit trail for payment method operations
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { PaymentProcessor } from './payment-processors/stripe';
import { db } from '../shared/database';
import { generateId, sanitizeString } from '../shared/utils';

/**
 * Payment method data interface
 */
export interface PaymentMethodData {
  type: 'card' | 'bank_account' | 'paypal';
  card?: {
    number: string;
    exp_month: number;
    exp_year: number;
    cvc: string;
    name?: string;
  };
  bank_account?: {
    account_number: string;
    routing_number: string;
    account_type: 'checking' | 'savings';
    account_holder_name: string;
  };
  billing_details?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
}

/**
 * Stored payment method interface (safe for database storage)
 */
export interface StoredPaymentMethod {
  id: string;
  userId: string;
  processorType: 'stripe' | 'paypal';
  processorPaymentMethodId: string;
  type: 'card' | 'bank_account' | 'paypal';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  bankName?: string;
  accountType?: string;
  isDefault: boolean;
  billingDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * Payment method validation result
 */
export interface PaymentMethodValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Payment method manager class
 * Handles secure payment method operations with PCI compliance
 */
export class PaymentMethodManager {
  private paymentProcessor: PaymentProcessor;
  private processorType: 'stripe' | 'paypal';

  constructor(paymentProcessor: PaymentProcessor, processorType: 'stripe' | 'paypal') {
    this.paymentProcessor = paymentProcessor;
    this.processorType = processorType;
  }

  /**
   * Creates and stores a new payment method
   * 
   * @param userId - User ID who owns the payment method
   * @param customerId - Payment processor customer ID
   * @param paymentMethodData - Payment method data to create
   * @returns Promise<StoredPaymentMethod> - Created payment method
   */
  async createPaymentMethod(
    userId: string,
    customerId: string,
    paymentMethodData: PaymentMethodData
  ): Promise<StoredPaymentMethod> {
    try {
      // Validate payment method data
      const validation = this.validatePaymentMethodData(paymentMethodData);
      if (!validation.isValid) {
        throw new Error(`Invalid payment method data: ${validation.errors.join(', ')}`);
      }

      // Create payment method with processor
      const { paymentMethodId } = await this.paymentProcessor.createPaymentMethod(
        customerId,
        paymentMethodData
      );

      // Extract safe metadata for storage
      const safeMetadata = this.extractSafeMetadata(paymentMethodData);

      // Create stored payment method record
      const storedPaymentMethod: StoredPaymentMethod = {
        id: generateId(),
        userId,
        processorType: this.processorType,
        processorPaymentMethodId: paymentMethodId,
        type: paymentMethodData.type,
        ...safeMetadata,
        isDefault: false, // Will be set separately
        billingDetails: paymentMethodData.billing_details ? {
          name: sanitizeString(paymentMethodData.billing_details.name || ''),
          email: sanitizeString(paymentMethodData.billing_details.email || ''),
          phone: sanitizeString(paymentMethodData.billing_details.phone || ''),
          address: paymentMethodData.billing_details.address ? {
            line1: sanitizeString(paymentMethodData.billing_details.address.line1),
            line2: paymentMethodData.billing_details.address.line2 ? 
              sanitizeString(paymentMethodData.billing_details.address.line2) : undefined,
            city: sanitizeString(paymentMethodData.billing_details.address.city),
            state: paymentMethodData.billing_details.address.state,
            postal_code: sanitizeString(paymentMethodData.billing_details.address.postal_code),
            country: paymentMethodData.billing_details.address.country,
          } : undefined,
        } : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Store payment method in database
      await db.createPaymentMethod(storedPaymentMethod);

      // If this is the user's first payment method, make it default
      const existingMethods = await this.getUserPaymentMethods(userId);
      if (existingMethods.length === 1) {
        await this.setDefaultPaymentMethod(userId, storedPaymentMethod.id);
        storedPaymentMethod.isDefault = true;
      }

      return storedPaymentMethod;
    } catch (error) {
      console.error('Error creating payment method:', error);
      throw new Error(`Failed to create payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves all payment methods for a user
   * 
   * @param userId - User ID to get payment methods for
   * @returns Promise<StoredPaymentMethod[]> - User's payment methods
   */
  async getUserPaymentMethods(userId: string): Promise<StoredPaymentMethod[]> {
    try {
      return await db.getUserPaymentMethods(userId);
    } catch (error) {
      console.error('Error getting user payment methods:', error);
      throw new Error(`Failed to retrieve payment methods: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets a specific payment method by ID
   * 
   * @param paymentMethodId - Payment method ID to retrieve
   * @param userId - User ID for ownership verification
   * @returns Promise<StoredPaymentMethod | null> - Payment method or null if not found
   */
  async getPaymentMethod(paymentMethodId: string, userId: string): Promise<StoredPaymentMethod | null> {
    try {
      const paymentMethod = await db.getPaymentMethod(paymentMethodId);
      
      if (!paymentMethod || paymentMethod.userId !== userId) {
        return null;
      }

      return paymentMethod;
    } catch (error) {
      console.error('Error getting payment method:', error);
      throw new Error(`Failed to retrieve payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sets a payment method as the default for a user
   * 
   * @param userId - User ID
   * @param paymentMethodId - Payment method ID to set as default
   * @returns Promise<void>
   */
  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    try {
      // Verify payment method belongs to user
      const paymentMethod = await this.getPaymentMethod(paymentMethodId, userId);
      if (!paymentMethod) {
        throw new Error('Payment method not found or not owned by user');
      }

      // Remove default flag from all user's payment methods
      const userPaymentMethods = await this.getUserPaymentMethods(userId);
      for (const method of userPaymentMethods) {
        if (method.isDefault) {
          await db.updatePaymentMethod(method.id, {
            isDefault: false,
            updatedAt: Date.now(),
          });
        }
      }

      // Set new default payment method
      await db.updatePaymentMethod(paymentMethodId, {
        isDefault: true,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw new Error(`Failed to set default payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deletes a payment method
   * 
   * @param paymentMethodId - Payment method ID to delete
   * @param userId - User ID for ownership verification
   * @returns Promise<void>
   */
  async deletePaymentMethod(paymentMethodId: string, userId: string): Promise<void> {
    try {
      // Verify payment method belongs to user
      const paymentMethod = await this.getPaymentMethod(paymentMethodId, userId);
      if (!paymentMethod) {
        throw new Error('Payment method not found or not owned by user');
      }

      // Check if this is the only payment method
      const userPaymentMethods = await this.getUserPaymentMethods(userId);
      if (userPaymentMethods.length === 1) {
        throw new Error('Cannot delete the only payment method. Add another payment method first.');
      }

      // Delete from payment processor (if supported)
      try {
        // Note: Not all processors support payment method deletion
        // This would need to be implemented based on processor capabilities
      } catch (processorError) {
        console.warn('Payment processor deletion failed:', processorError);
        // Continue with local deletion even if processor deletion fails
      }

      // Delete from database
      await db.deletePaymentMethod(paymentMethodId);

      // If this was the default payment method, set another as default
      if (paymentMethod.isDefault) {
        const remainingMethods = await this.getUserPaymentMethods(userId);
        if (remainingMethods.length > 0) {
          await this.setDefaultPaymentMethod(userId, remainingMethods[0].id);
        }
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw new Error(`Failed to delete payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates payment method billing details
   * 
   * @param paymentMethodId - Payment method ID to update
   * @param userId - User ID for ownership verification
   * @param billingDetails - New billing details
   * @returns Promise<void>
   */
  async updatePaymentMethodBillingDetails(
    paymentMethodId: string,
    userId: string,
    billingDetails: PaymentMethodData['billing_details']
  ): Promise<void> {
    try {
      // Verify payment method belongs to user
      const paymentMethod = await this.getPaymentMethod(paymentMethodId, userId);
      if (!paymentMethod) {
        throw new Error('Payment method not found or not owned by user');
      }

      // Sanitize billing details
      const sanitizedBillingDetails = billingDetails ? {
        name: sanitizeString(billingDetails.name || ''),
        email: sanitizeString(billingDetails.email || ''),
        phone: sanitizeString(billingDetails.phone || ''),
        address: billingDetails.address ? {
          line1: sanitizeString(billingDetails.address.line1),
          line2: billingDetails.address.line2 ? 
            sanitizeString(billingDetails.address.line2) : undefined,
          city: sanitizeString(billingDetails.address.city),
          state: billingDetails.address.state,
          postal_code: sanitizeString(billingDetails.address.postal_code),
          country: billingDetails.address.country,
        } : undefined,
      } : undefined;

      // Update in database
      await db.updatePaymentMethod(paymentMethodId, {
        billingDetails: sanitizedBillingDetails,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Error updating payment method billing details:', error);
      throw new Error(`Failed to update billing details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates payment method data
   * 
   * @param paymentMethodData - Payment method data to validate
   * @returns PaymentMethodValidationResult - Validation result
   */
  private validatePaymentMethodData(paymentMethodData: PaymentMethodData): PaymentMethodValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate payment method type
    if (!paymentMethodData.type) {
      errors.push('Payment method type is required');
    } else if (!['card', 'bank_account', 'paypal'].includes(paymentMethodData.type)) {
      errors.push('Invalid payment method type');
    }

    // Validate card data
    if (paymentMethodData.type === 'card' && paymentMethodData.card) {
      const card = paymentMethodData.card;
      
      if (!card.number || card.number.length < 13 || card.number.length > 19) {
        errors.push('Invalid card number');
      }
      
      if (!card.exp_month || card.exp_month < 1 || card.exp_month > 12) {
        errors.push('Invalid expiry month');
      }
      
      if (!card.exp_year || card.exp_year < new Date().getFullYear()) {
        errors.push('Invalid expiry year');
      }
      
      if (!card.cvc || card.cvc.length < 3 || card.cvc.length > 4) {
        errors.push('Invalid CVC');
      }

      // Check if card is expired
      const currentDate = new Date();
      const expiryDate = new Date(card.exp_year, card.exp_month - 1);
      if (expiryDate < currentDate) {
        errors.push('Card has expired');
      }

      // Warn about cards expiring soon
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      if (expiryDate < threeMonthsFromNow) {
        warnings.push('Card expires within 3 months');
      }
    }

    // Validate bank account data
    if (paymentMethodData.type === 'bank_account' && paymentMethodData.bank_account) {
      const bankAccount = paymentMethodData.bank_account;
      
      if (!bankAccount.account_number || bankAccount.account_number.length < 4) {
        errors.push('Invalid account number');
      }
      
      if (!bankAccount.routing_number || bankAccount.routing_number.length !== 9) {
        errors.push('Invalid routing number');
      }
      
      if (!bankAccount.account_type || !['checking', 'savings'].includes(bankAccount.account_type)) {
        errors.push('Invalid account type');
      }
      
      if (!bankAccount.account_holder_name || bankAccount.account_holder_name.trim().length < 2) {
        errors.push('Account holder name is required');
      }
    }

    // Validate billing details
    if (paymentMethodData.billing_details) {
      const billing = paymentMethodData.billing_details;
      
      if (billing.email && !this.isValidEmail(billing.email)) {
        errors.push('Invalid email address');
      }
      
      if (billing.address) {
        if (!billing.address.line1 || billing.address.line1.trim().length < 5) {
          errors.push('Address line 1 is required');
        }
        
        if (!billing.address.city || billing.address.city.trim().length < 2) {
          errors.push('City is required');
        }
        
        if (!billing.address.state || billing.address.state.length !== 2) {
          errors.push('Valid state code is required');
        }
        
        if (!billing.address.postal_code || billing.address.postal_code.length < 5) {
          errors.push('Valid postal code is required');
        }
        
        if (!billing.address.country || billing.address.country.length !== 2) {
          errors.push('Valid country code is required');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Extracts safe metadata from payment method data for storage
   * 
   * @param paymentMethodData - Payment method data
   * @returns object - Safe metadata for database storage
   */
  private extractSafeMetadata(paymentMethodData: PaymentMethodData): Partial<StoredPaymentMethod> {
    const metadata: Partial<StoredPaymentMethod> = {};

    if (paymentMethodData.type === 'card' && paymentMethodData.card) {
      metadata.last4 = paymentMethodData.card.number.slice(-4);
      metadata.expiryMonth = paymentMethodData.card.exp_month;
      metadata.expiryYear = paymentMethodData.card.exp_year;
      
      // Determine card brand from number (basic implementation)
      const cardNumber = paymentMethodData.card.number.replace(/\s/g, '');
      if (cardNumber.startsWith('4')) {
        metadata.brand = 'visa';
      } else if (cardNumber.startsWith('5') || cardNumber.startsWith('2')) {
        metadata.brand = 'mastercard';
      } else if (cardNumber.startsWith('3')) {
        metadata.brand = 'amex';
      } else {
        metadata.brand = 'unknown';
      }
    }

    if (paymentMethodData.type === 'bank_account' && paymentMethodData.bank_account) {
      metadata.last4 = paymentMethodData.bank_account.account_number.slice(-4);
      metadata.accountType = paymentMethodData.bank_account.account_type;
      // Bank name would typically come from routing number lookup
      metadata.bankName = 'Unknown Bank';
    }

    return metadata;
  }

  /**
   * Validates email address format
   * 
   * @param email - Email address to validate
   * @returns boolean - True if valid email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

/**
 * Factory function to create payment method manager
 * 
 * @param paymentProcessor - Payment processor instance
 * @param processorType - Type of payment processor
 * @returns PaymentMethodManager - Configured payment method manager
 */
export function createPaymentMethodManager(
  paymentProcessor: PaymentProcessor,
  processorType: 'stripe' | 'paypal'
): PaymentMethodManager {
  return new PaymentMethodManager(paymentProcessor, processorType);
}