/**
 * @fileoverview Billing service for HarborList marketplace payment processing and membership management.
 * 
 * Provides comprehensive billing operations including:
 * - Billing account management with payment method storage
 * - Subscription creation, updates, and cancellation
 * - Transaction processing with payment processor integration
 * - Premium membership billing cycles and renewals
 * - Financial reporting and transaction management
 * - Payment failure handling and dispute resolution
 * 
 * Security Features:
 * - PCI compliance for payment data handling
 * - Secure payment processor integration
 * - Input validation and sanitization
 * - Audit trail for all financial operations
 * - Role-based access control for billing operations
 * 
 * Business Rules:
 * - Subscription billing cycles (monthly/yearly)
 * - Prorated billing for plan changes
 * - Automatic membership expiration handling
 * - Payment retry mechanisms for failed transactions
 * - Commission calculation for marketplace transactions
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { db } from '../shared/database';
import { createResponse, createErrorResponse, parseBody, getUserId, generateId, validateRequired, sanitizeString } from '../shared/utils';
import { BillingAccount, Transaction, EnhancedUser } from '@harborlist/shared-types';

import { PaymentProcessor } from './payment-processors/stripe';
import { SubscriptionManager, CreateSubscriptionRequest, UpdateSubscriptionRequest } from './subscription-manager';
import { PaymentFailureHandler } from './payment-failure-handler';
import { WebhookHandler } from './webhook-handler';
import { PaymentMethodManager, createPaymentMethodManager } from './payment-method-manager';
import { getPaymentProcessorConfigManager, getPrimaryPaymentProcessor } from './payment-processor-config';

// Initialize payment processor configuration manager
const configManager = getPaymentProcessorConfigManager();

// Get primary payment processor
const paymentProcessor: PaymentProcessor | null = getPrimaryPaymentProcessor();

if (!paymentProcessor) {
  console.error('No payment processor available. Check configuration.');
  throw new Error('Payment processor initialization failed');
}

// Initialize related services
const subscriptionManager = new SubscriptionManager(paymentProcessor);
const paymentFailureHandler = new PaymentFailureHandler(paymentProcessor);
const webhookHandler = new WebhookHandler(paymentProcessor, paymentFailureHandler, subscriptionManager);

// Initialize payment method manager
const processorType = process.env.PAYMENT_PROCESSOR === 'paypal' ? 'paypal' : 'stripe';
const paymentMethodManager = createPaymentMethodManager(paymentProcessor, processorType);

/**
 * Helper function to validate billing account data
 * 
 * @param billingData - Billing account data to validate
 * @returns string | null - Error message or null if valid
 */
function validateBillingAccount(billingData: Partial<BillingAccount>): string | null {
  if (!billingData.userId) {
    return 'User ID is required';
  }

  if (!billingData.plan) {
    return 'Billing plan is required';
  }

  if (!billingData.amount || billingData.amount <= 0) {
    return 'Valid billing amount is required';
  }

  if (!billingData.currency) {
    return 'Currency is required';
  }

  const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD'];
  if (!validCurrencies.includes(billingData.currency)) {
    return 'Invalid currency. Supported currencies: USD, EUR, GBP, CAD';
  }

  return null;
}

/**
 * Helper function to validate transaction data
 * 
 * @param transactionData - Transaction data to validate
 * @returns string | null - Error message or null if valid
 */
function validateTransaction(transactionData: Partial<Transaction>): string | null {
  if (!transactionData.userId) {
    return 'User ID is required';
  }

  if (!transactionData.type) {
    return 'Transaction type is required';
  }

  const validTypes = ['payment', 'refund', 'commission', 'payout', 'membership', 'subscription'];
  if (!validTypes.includes(transactionData.type)) {
    return 'Invalid transaction type';
  }

  if (!transactionData.amount || transactionData.amount <= 0) {
    return 'Valid transaction amount is required';
  }

  if (!transactionData.currency) {
    return 'Currency is required';
  }

  return null;
}

/**
 * Helper function to calculate subscription pricing
 * 
 * @param plan - Subscription plan name
 * @param billingCycle - Billing cycle (monthly/yearly)
 * @returns object - Pricing information
 */
function calculateSubscriptionPricing(plan: string, billingCycle: 'monthly' | 'yearly'): { amount: number; currency: string } {
  const pricingTable: Record<string, { monthly: number; yearly: number }> = {
    'premium_individual': { monthly: 29.99, yearly: 299.99 },
    'premium_dealer': { monthly: 99.99, yearly: 999.99 },
    'basic': { monthly: 0, yearly: 0 },
  };

  const planPricing = pricingTable[plan] || pricingTable['basic'];
  return {
    amount: billingCycle === 'yearly' ? planPricing.yearly : planPricing.monthly,
    currency: 'USD'
  };
}

/**
 * Helper function to calculate prorated billing for plan changes
 * 
 * @param currentPlan - Current subscription plan
 * @param newPlan - New subscription plan
 * @param billingCycle - Billing cycle
 * @param daysRemaining - Days remaining in current billing period
 * @returns object - Prorated pricing information
 */
function calculateProratedBilling(
  currentPlan: string, 
  newPlan: string, 
  billingCycle: 'monthly' | 'yearly',
  daysRemaining: number
): { proratedAmount: number; refundAmount: number; upgradeAmount: number } {
  const currentPricing = calculateSubscriptionPricing(currentPlan, billingCycle);
  const newPricing = calculateSubscriptionPricing(newPlan, billingCycle);
  
  const totalDays = billingCycle === 'yearly' ? 365 : 30;
  const dailyCurrentRate = currentPricing.amount / totalDays;
  const dailyNewRate = newPricing.amount / totalDays;
  
  const refundAmount = dailyCurrentRate * daysRemaining;
  const upgradeAmount = dailyNewRate * daysRemaining;
  const proratedAmount = upgradeAmount - refundAmount;
  
  return {
    proratedAmount: Math.max(0, proratedAmount), // Never negative
    refundAmount,
    upgradeAmount
  };
}

/**
 * Helper function to check if membership should expire
 * 
 * @param expirationDate - Membership expiration timestamp
 * @returns boolean - True if membership has expired
 */
function isMembershipExpired(expirationDate: number): boolean {
  return Date.now() > expirationDate;
}

/**
 * Helper function to calculate next billing date
 * 
 * @param billingCycle - Billing cycle (monthly/yearly)
 * @param fromDate - Starting date (defaults to now)
 * @returns number - Next billing date timestamp
 */
function calculateNextBillingDate(billingCycle: 'monthly' | 'yearly', fromDate: number = Date.now()): number {
  const date = new Date(fromDate);
  
  if (billingCycle === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  
  return date.getTime();
}

/**
 * Helper function to get membership features based on plan
 * 
 * @param plan - Subscription plan name
 * @returns array - List of features included in the plan
 */
function getMembershipFeatures(plan: string): string[] {
  const featureMap: Record<string, string[]> = {
    'basic': [
      'basic_listing_creation',
      'standard_search',
      'basic_support'
    ],
    'premium_individual': [
      'unlimited_listings',
      'priority_placement',
      'advanced_analytics',
      'premium_support',
      'featured_listings',
      'enhanced_photos'
    ],
    'premium_dealer': [
      'unlimited_listings',
      'priority_placement',
      'advanced_analytics',
      'premium_support',
      'featured_listings',
      'enhanced_photos',
      'bulk_operations',
      'dealer_badge',
      'inventory_management',
      'lead_management',
      'custom_branding'
    ]
  };
  
  return featureMap[plan] || featureMap['basic'];
}

/**
 * Main Lambda handler for billing operations
 * 
 * Handles all billing-related operations including account management,
 * subscription processing, and transaction handling.
 * 
 * Supported operations:
 * - GET /billing/accounts/{userId} - Get billing account
 * - POST /billing/accounts - Create billing account
 * - PUT /billing/accounts/{billingId} - Update billing account
 * - DELETE /billing/accounts/{billingId} - Cancel billing account
 * - GET /billing/transactions - Get transaction history
 * - POST /billing/transactions - Process payment
 * - POST /billing/subscriptions - Create subscription
 * - PUT /billing/subscriptions/{subscriptionId} - Update subscription
 * - DELETE /billing/subscriptions/{subscriptionId} - Cancel subscription
 * - POST /billing/refunds - Process refund
 * 
 * @param event - API Gateway proxy event containing request details
 * @returns Promise<APIGatewayProxyResult> - Standardized API response
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const method = event.httpMethod;
    const pathParameters = event.pathParameters || {};
    const path = event.path || '';

    switch (method) {
      case 'GET':
        if (path.includes('/billing/accounts/') && pathParameters.userId) {
          return await getBillingAccount(pathParameters.userId, requestId);
        } else if (path.includes('/billing/transactions')) {
          return await getTransactionHistory(event, requestId);
        } else if (path.includes('/billing/payment-methods')) {
          return await getUserPaymentMethods(event, requestId);
        } else if (path.includes('/billing/health-check')) {
          return await getProcessorHealthStatus(event, requestId);
        } else {
          return createErrorResponse(404, 'NOT_FOUND', 'Endpoint not found', requestId);
        }

      case 'POST':
        if (path.includes('/billing/accounts')) {
          return await createBillingAccount(event, requestId);
        } else if (path.includes('/billing/transactions')) {
          return await processPayment(event, requestId);
        } else if (path.includes('/billing/subscriptions')) {
          return await createEnhancedSubscription(event, requestId);
        } else if (path.includes('/billing/refunds')) {
          return await processRefund(event, requestId);
        } else if (path.includes('/billing/memberships/upgrade')) {
          return await upgradeMembership(event, requestId);
        } else if (path.includes('/billing/memberships/downgrade')) {
          return await downgradeMembership(event, requestId);
        } else if (path.includes('/billing/memberships/renew')) {
          return await renewMembership(event, requestId);
        } else if (path.includes('/billing/memberships/expire')) {
          return await expireMembership(event, requestId);
        } else if (path.includes('/billing/reports/revenue')) {
          return await generateRevenueReport(event, requestId);
        } else if (path.includes('/billing/reports/commissions')) {
          return await generateCommissionReport(event, requestId);
        } else if (path.includes('/billing/analytics/dashboard')) {
          return await getFinancialDashboard(event, requestId);
        } else if (path.includes('/billing/plans')) {
          return await getSubscriptionPlans(event, requestId);
        } else if (path.includes('/billing/renewals/process')) {
          return await processSubscriptionRenewals(event, requestId);
        } else if (path.includes('/billing/webhooks/stripe')) {
          return await webhookHandler.handleWebhook(event);
        } else if (path.includes('/billing/webhooks/paypal')) {
          return await webhookHandler.handleWebhook(event);
        } else if (path.includes('/billing/failures/retry')) {
          return await processPaymentRetries(event, requestId);
        } else if (path.includes('/billing/payment-methods')) {
          return await createPaymentMethod(event, requestId);
        } else if (path.includes('/billing/health-check')) {
          return await getProcessorHealthStatus(event, requestId);
        } else {
          return createErrorResponse(404, 'NOT_FOUND', 'Endpoint not found', requestId);
        }

      case 'PUT':
        if (path.includes('/billing/accounts/') && pathParameters.billingId) {
          return await updateBillingAccount(pathParameters.billingId, event, requestId);
        } else if (path.includes('/billing/subscriptions/') && pathParameters.subscriptionId) {
          return await updateEnhancedSubscription(pathParameters.subscriptionId, event, requestId);
        } else if (path.includes('/billing/payment-methods/') && pathParameters.paymentMethodId) {
          return await updatePaymentMethod(pathParameters.paymentMethodId, event, requestId);
        } else {
          return createErrorResponse(404, 'NOT_FOUND', 'Endpoint not found', requestId);
        }

      case 'DELETE':
        if (path.includes('/billing/accounts/') && pathParameters.billingId) {
          return await cancelBillingAccount(pathParameters.billingId, event, requestId);
        } else if (path.includes('/billing/subscriptions/') && pathParameters.subscriptionId) {
          return await cancelEnhancedSubscription(pathParameters.subscriptionId, event, requestId);
        } else if (path.includes('/billing/payment-methods/') && pathParameters.paymentMethodId) {
          return await deletePaymentMethod(pathParameters.paymentMethodId, event, requestId);
        } else {
          return createErrorResponse(404, 'NOT_FOUND', 'Endpoint not found', requestId);
        }

      default:
        return createErrorResponse(405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed`, requestId);
    }
  } catch (error) {
    console.error('Error in billing service:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }
};

/**
 * Creates a new billing account with payment method storage
 * 
 * @param event - API Gateway event containing billing account data
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Created billing account or error
 */
async function createBillingAccount(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const body = parseBody<{
      plan: string;
      billingCycle: 'monthly' | 'yearly';
      paymentMethod: {
        type: 'card' | 'bank_account';
        cardNumber?: string;
        expiryMonth?: number;
        expiryYear?: number;
        cvv?: string;
        accountNumber?: string;
        routingNumber?: string;
      };
      billingAddress: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
      };
    }>(event);

    // Validate required fields
    validateRequired(body, ['plan', 'billingCycle', 'paymentMethod', 'billingAddress']);
    validateRequired(body.billingAddress!, ['street', 'city', 'state', 'zipCode', 'country']);

    // Get user information
    const user = await db.getUser(userId);
    if (!user) {
      return createErrorResponse(404, 'USER_NOT_FOUND', 'User not found', requestId);
    }

    // Calculate pricing
    const pricing = calculateSubscriptionPricing(body.plan!, body.billingCycle!);

    // Create customer in payment processor
    const { customerId } = await paymentProcessor.createCustomer({
      email: user.email,
      name: user.name
    });

    // Create payment method
    const { paymentMethodId } = await paymentProcessor.createPaymentMethod(customerId, body.paymentMethod);

    // Create billing account
    const billingId = generateId();
    const billingAccount: BillingAccount = {
      billingId,
      userId,
      customerId,
      paymentMethodId,
      plan: body.plan!,
      amount: pricing.amount,
      currency: pricing.currency,
      status: 'active',
      nextBillingDate: Date.now() + (body.billingCycle === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000),
      paymentHistory: [],
      billingAddress: {
        street: sanitizeString(body.billingAddress!.street),
        city: sanitizeString(body.billingAddress!.city),
        state: body.billingAddress!.state,
        zipCode: sanitizeString(body.billingAddress!.zipCode),
        country: body.billingAddress!.country,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Validate billing account
    const validationError = validateBillingAccount(billingAccount);
    if (validationError) {
      return createErrorResponse(400, 'VALIDATION_ERROR', validationError, requestId);
    }

    // Save billing account to database
    await db.createBillingAccount(billingAccount);

    // Update user with billing information
    await db.updateUser(userId, {
      billingInfo: {
        customerId,
        paymentMethodId,
        billingAddress: billingAccount.billingAddress,
      },
      updatedAt: Date.now(),
    });

    return createResponse(201, {
      billingId: billingAccount.billingId,
      plan: billingAccount.plan,
      amount: billingAccount.amount,
      currency: billingAccount.currency,
      status: billingAccount.status,
      nextBillingDate: billingAccount.nextBillingDate,
      message: 'Billing account created successfully'
    });
  } catch (error) {
    console.error('Error creating billing account:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Missing required fields')) {
        return createErrorResponse(400, 'VALIDATION_ERROR', error.message, requestId);
      }
      if (error.message.includes('User not authenticated')) {
        return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
      }
    }

    return createErrorResponse(500, 'BILLING_ERROR', 'Failed to create billing account', requestId);
  }
}

/**
 * Retrieves billing account information
 * 
 * @param userId - User ID to get billing account for
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Billing account data or error
 */
async function getBillingAccount(userId: string, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const billingAccount = await db.getBillingAccountByUser(userId);
    
    if (!billingAccount) {
      return createErrorResponse(404, 'NOT_FOUND', 'Billing account not found', requestId);
    }

    // Remove sensitive payment information from response
    const safeBillingAccount = {
      ...billingAccount,
      paymentMethodId: undefined, // Don't expose payment method ID
      customerId: undefined, // Don't expose customer ID
    };

    return createResponse(200, { billingAccount: safeBillingAccount });
  } catch (error) {
    console.error('Error getting billing account:', error);
    return createErrorResponse(500, 'BILLING_ERROR', 'Failed to retrieve billing account', requestId);
  }
}

/**
 * Updates an existing billing account
 * 
 * @param billingId - Billing account ID to update
 * @param event - API Gateway event containing update data
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Success response or error
 */
async function updateBillingAccount(billingId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const body = parseBody<Partial<BillingAccount>>(event);

    // Check if billing account exists and user owns it
    const existingAccount = await db.getBillingAccount(billingId);
    if (!existingAccount) {
      return createErrorResponse(404, 'NOT_FOUND', 'Billing account not found', requestId);
    }

    if (existingAccount.userId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'You can only update your own billing account', requestId);
    }

    // Prepare updates
    const updates: Partial<BillingAccount> = {
      ...body,
      updatedAt: Date.now(),
    };

    // Remove fields that shouldn't be updated directly
    delete updates.billingId;
    delete updates.userId;
    delete updates.customerId;
    delete updates.createdAt;

    // If plan is being changed, recalculate pricing
    if (updates.plan && updates.plan !== existingAccount.plan) {
      const billingCycle = 'monthly'; // Default to monthly, this would come from request body in real implementation
      const pricing = calculateSubscriptionPricing(updates.plan, billingCycle);
      updates.amount = pricing.amount;
      updates.currency = pricing.currency;
    }

    await db.updateBillingAccount(billingId, updates);

    return createResponse(200, { message: 'Billing account updated successfully' });
  } catch (error) {
    console.error('Error updating billing account:', error);
    
    if (error instanceof Error && error.message.includes('User not authenticated')) {
      return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
    }

    return createErrorResponse(500, 'BILLING_ERROR', 'Failed to update billing account', requestId);
  }
}

/**
 * Cancels a billing account and associated subscriptions
 * 
 * @param billingId - Billing account ID to cancel
 * @param event - API Gateway event containing user context
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Success response or error
 */
async function cancelBillingAccount(billingId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);

    // Check if billing account exists and user owns it
    const existingAccount = await db.getBillingAccount(billingId);
    if (!existingAccount) {
      return createErrorResponse(404, 'NOT_FOUND', 'Billing account not found', requestId);
    }

    if (existingAccount.userId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'You can only cancel your own billing account', requestId);
    }

    // Cancel subscription in payment processor if exists
    if (existingAccount.subscriptionId) {
      await paymentProcessor.cancelSubscription(existingAccount.subscriptionId);
    }

    // Update billing account status
    await db.updateBillingAccount(billingId, {
      status: 'canceled',
      canceledAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update user to remove premium status
    await db.updateUser(userId, {
      premiumActive: false,
      premiumExpiresAt: Date.now(),
      updatedAt: Date.now(),
    });

    return createResponse(200, { message: 'Billing account canceled successfully' });
  } catch (error) {
    console.error('Error canceling billing account:', error);
    
    if (error instanceof Error && error.message.includes('User not authenticated')) {
      return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
    }

    return createErrorResponse(500, 'BILLING_ERROR', 'Failed to cancel billing account', requestId);
  }
}

/**
 * Processes a payment transaction
 * 
 * @param event - API Gateway event containing payment data
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Transaction result or error
 */
async function processPayment(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const body = parseBody<{
      amount: number;
      currency: string;
      type: 'payment' | 'commission' | 'membership';
      description: string;
      listingId?: string;
      metadata?: Record<string, any>;
    }>(event);

    // Validate required fields
    validateRequired(body, ['amount', 'currency', 'type', 'description']);

    // Get user's billing account
    const billingAccount = await db.getBillingAccountByUser(userId);
    if (!billingAccount) {
      return createErrorResponse(404, 'BILLING_ACCOUNT_NOT_FOUND', 'No billing account found for user', requestId);
    }

    // Process payment through payment processor
    const paymentResult = await paymentProcessor.processPayment(
      body.amount!,
      body.currency!,
      billingAccount.paymentMethodId!,
      body.metadata
    );

    // Create transaction record
    const transactionId = generateId();
    const transaction: Transaction = {
      id: transactionId,
      transactionId,
      type: body.type!,
      amount: body.amount!,
      currency: body.currency!,
      status: paymentResult.status === 'completed' ? 'completed' : 'failed',
      userId,
      userName: '', // This would be populated from user data
      userEmail: '', // This would be populated from user data
      listingId: body.listingId,
      paymentMethod: 'card', // This would come from billing account
      processorTransactionId: paymentResult.transactionId,
      createdAt: new Date().toISOString(),
      completedAt: paymentResult.status === 'completed' ? new Date().toISOString() : undefined,
      description: sanitizeString(body.description!),
      fees: body.amount! * 0.029 + 0.30, // Example fee calculation (2.9% + $0.30)
      netAmount: body.amount! - (body.amount! * 0.029 + 0.30),
      metadata: body.metadata,
      billingAccountId: billingAccount.billingId,
    };

    // Validate transaction
    const validationError = validateTransaction(transaction);
    if (validationError) {
      return createErrorResponse(400, 'VALIDATION_ERROR', validationError, requestId);
    }

    // Save transaction to database
    await db.createTransaction(transaction);

    // Update billing account payment history
    const updatedPaymentHistory = [...(billingAccount.paymentHistory || []), transaction];
    await db.updateBillingAccount(billingAccount.billingId, {
      paymentHistory: updatedPaymentHistory,
      updatedAt: Date.now(),
    });

    return createResponse(200, {
      transactionId: transaction.transactionId,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      processorTransactionId: transaction.processorTransactionId,
      message: transaction.status === 'completed' ? 'Payment processed successfully' : 'Payment failed'
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Missing required fields')) {
        return createErrorResponse(400, 'VALIDATION_ERROR', error.message, requestId);
      }
      if (error.message.includes('User not authenticated')) {
        return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
      }
    }

    return createErrorResponse(500, 'PAYMENT_ERROR', 'Failed to process payment', requestId);
  }
}

/**
 * Creates a subscription for premium membership
 * 
 * @param event - API Gateway event containing subscription data
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Subscription result or error
 */
async function createSubscription(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const body = parseBody<{
      plan: string;
      billingCycle: 'monthly' | 'yearly';
    }>(event);

    // Validate required fields
    validateRequired(body, ['plan', 'billingCycle']);

    // Get user's billing account
    const billingAccount = await db.getBillingAccountByUser(userId);
    if (!billingAccount) {
      return createErrorResponse(404, 'BILLING_ACCOUNT_NOT_FOUND', 'No billing account found for user', requestId);
    }

    // Calculate pricing
    const pricing = calculateSubscriptionPricing(body.plan!, body.billingCycle!);

    // Create subscription in payment processor
    const { subscriptionId } = await paymentProcessor.createSubscription(
      billingAccount.customerId!,
      `price_${body.plan}_${body.billingCycle}`, // This would be actual price ID from payment processor
      billingAccount.paymentMethodId!
    );

    // Update billing account with subscription
    await db.updateBillingAccount(billingAccount.billingId, {
      subscriptionId,
      plan: body.plan!,
      amount: pricing.amount,
      currency: pricing.currency,
      status: 'active',
      nextBillingDate: Date.now() + (body.billingCycle === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000),
      updatedAt: Date.now(),
    });

    // Update user with premium membership
    await db.updateUser(userId, {
      premiumActive: true,
      premiumPlan: body.plan!,
      premiumExpiresAt: Date.now() + (body.billingCycle === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000),
      updatedAt: Date.now(),
    });

    return createResponse(201, {
      subscriptionId,
      plan: body.plan!,
      billingCycle: body.billingCycle!,
      amount: pricing.amount,
      currency: pricing.currency,
      nextBillingDate: Date.now() + (body.billingCycle === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000),
      message: 'Subscription created successfully'
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Missing required fields')) {
        return createErrorResponse(400, 'VALIDATION_ERROR', error.message, requestId);
      }
      if (error.message.includes('User not authenticated')) {
        return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
      }
    }

    return createErrorResponse(500, 'SUBSCRIPTION_ERROR', 'Failed to create subscription', requestId);
  }
}

/**
 * Updates an existing subscription
 * 
 * @param subscriptionId - Subscription ID to update
 * @param event - API Gateway event containing update data
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Success response or error
 */
async function updateSubscription(subscriptionId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const body = parseBody<{
      plan?: string;
      billingCycle?: 'monthly' | 'yearly';
    }>(event);

    // Get user's billing account
    const billingAccount = await db.getBillingAccountByUser(userId);
    if (!billingAccount || billingAccount.subscriptionId !== subscriptionId) {
      return createErrorResponse(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found or not owned by user', requestId);
    }

    // Update subscription in payment processor
    await paymentProcessor.updateSubscription(subscriptionId, body);

    // Calculate new pricing if plan or cycle changed
    let updates: Partial<BillingAccount> = { updatedAt: Date.now() };
    
    if (body.plan || body.billingCycle) {
      const newPlan = body.plan || billingAccount.plan;
      const newCycle = body.billingCycle || 'monthly';
      const pricing = calculateSubscriptionPricing(newPlan, newCycle);
      
      updates = {
        ...updates,
        plan: newPlan,
        amount: pricing.amount,
        currency: pricing.currency,
      };
    }

    // Update billing account
    await db.updateBillingAccount(billingAccount.billingId, updates);

    // Update user premium information if plan changed
    if (body.plan) {
      await db.updateUser(userId, {
        premiumPlan: body.plan,
        updatedAt: Date.now(),
      });
    }

    return createResponse(200, { message: 'Subscription updated successfully' });
  } catch (error) {
    console.error('Error updating subscription:', error);
    
    if (error instanceof Error && error.message.includes('User not authenticated')) {
      return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
    }

    return createErrorResponse(500, 'SUBSCRIPTION_ERROR', 'Failed to update subscription', requestId);
  }
}

/**
 * Cancels a subscription
 * 
 * @param subscriptionId - Subscription ID to cancel
 * @param event - API Gateway event containing user context
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Success response or error
 */
async function cancelSubscription(subscriptionId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);

    // Get user's billing account
    const billingAccount = await db.getBillingAccountByUser(userId);
    if (!billingAccount || billingAccount.subscriptionId !== subscriptionId) {
      return createErrorResponse(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found or not owned by user', requestId);
    }

    // Cancel subscription in payment processor
    await paymentProcessor.cancelSubscription(subscriptionId);

    // Update billing account
    await db.updateBillingAccount(billingAccount.billingId, {
      status: 'canceled',
      canceledAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update user to remove premium status
    await db.updateUser(userId, {
      premiumActive: false,
      premiumExpiresAt: Date.now(),
      updatedAt: Date.now(),
    });

    return createResponse(200, { message: 'Subscription canceled successfully' });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    
    if (error instanceof Error && error.message.includes('User not authenticated')) {
      return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
    }

    return createErrorResponse(500, 'SUBSCRIPTION_ERROR', 'Failed to cancel subscription', requestId);
  }
}

/**
 * Processes a refund for a transaction
 * 
 * @param event - API Gateway event containing refund data
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Refund result or error
 */
async function processRefund(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const body = parseBody<{
      transactionId: string;
      amount?: number;
      reason: string;
    }>(event);

    // Validate required fields
    validateRequired(body, ['transactionId', 'reason']);

    // Get original transaction
    const originalTransaction = await db.getTransaction(body.transactionId!);
    if (!originalTransaction) {
      return createErrorResponse(404, 'TRANSACTION_NOT_FOUND', 'Original transaction not found', requestId);
    }

    // Validate refund amount
    const refundAmount = body.amount || originalTransaction.amount;
    if (refundAmount > originalTransaction.amount) {
      return createErrorResponse(400, 'INVALID_REFUND_AMOUNT', 'Refund amount cannot exceed original transaction amount', requestId);
    }

    // Process refund through payment processor
    const { refundId } = await paymentProcessor.processRefund(
      originalTransaction.processorTransactionId,
      refundAmount
    );

    // Create refund transaction record
    const refundTransactionId = generateId();
    const refundTransaction: Transaction = {
      id: refundTransactionId,
      transactionId: refundTransactionId,
      type: 'refund',
      amount: refundAmount,
      currency: originalTransaction.currency,
      status: 'completed',
      userId: originalTransaction.userId,
      userName: originalTransaction.userName,
      userEmail: originalTransaction.userEmail,
      listingId: originalTransaction.listingId,
      paymentMethod: originalTransaction.paymentMethod,
      processorTransactionId: refundId,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      description: `Refund for transaction ${originalTransaction.transactionId}: ${sanitizeString(body.reason!)}`,
      fees: 0, // Refunds typically don't have fees
      netAmount: refundAmount,
      metadata: {
        originalTransactionId: originalTransaction.transactionId,
        refundReason: body.reason,
      },
      billingAccountId: originalTransaction.billingAccountId,
    };

    // Save refund transaction
    await db.createTransaction(refundTransaction);

    return createResponse(200, {
      refundTransactionId: refundTransaction.transactionId,
      refundId,
      amount: refundAmount,
      currency: originalTransaction.currency,
      message: 'Refund processed successfully'
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    
    if (error instanceof Error && error.message.includes('Missing required fields')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message, requestId);
    }

    return createErrorResponse(500, 'REFUND_ERROR', 'Failed to process refund', requestId);
  }
}

/**
 * Retrieves transaction history with filtering and pagination
 * 
 * @param event - API Gateway event containing query parameters
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Transaction history or error
 */
async function getTransactionHistory(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const queryParams = event.queryStringParameters || {};
    
    const filters = {
      userId,
      type: queryParams.type,
      status: queryParams.status,
      startDate: queryParams.startDate,
      endDate: queryParams.endDate,
      limit: parseInt(queryParams.limit || '20'),
      lastKey: queryParams.nextToken ? JSON.parse(Buffer.from(queryParams.nextToken, 'base64').toString()) : undefined,
    };

    const result = await db.getTransactionHistoryWithFilters(filters);

    const response: any = {
      transactions: result.transactions,
      total: result.total,
    };

    if (result.lastKey) {
      response.nextToken = Buffer.from(JSON.stringify(result.lastKey)).toString('base64');
    }

    return createResponse(200, response);
  } catch (error) {
    console.error('Error getting transaction history:', error);
    
    if (error instanceof Error && error.message.includes('User not authenticated')) {
      return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
    }

    return createErrorResponse(500, 'BILLING_ERROR', 'Failed to retrieve transaction history', requestId);
  }
}

/**
 * Upgrades a user's membership plan with prorated billing
 * 
 * @param event - API Gateway event containing upgrade data
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Upgrade result or error
 */
async function upgradeMembership(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const body = parseBody<{
      newPlan: string;
      billingCycle?: 'monthly' | 'yearly';
    }>(event);

    // Validate required fields
    validateRequired(body, ['newPlan']);

    // Get user's current billing account
    const billingAccount = await db.getBillingAccountByUser(userId);
    if (!billingAccount) {
      return createErrorResponse(404, 'BILLING_ACCOUNT_NOT_FOUND', 'No billing account found for user', requestId);
    }

    const currentPlan = billingAccount.plan;
    const newPlan = body.newPlan!;
    const billingCycle = body.billingCycle || 'monthly';

    // Check if it's actually an upgrade
    const planHierarchy = ['basic', 'premium_individual', 'premium_dealer'];
    const currentIndex = planHierarchy.indexOf(currentPlan);
    const newIndex = planHierarchy.indexOf(newPlan);

    if (newIndex <= currentIndex) {
      return createErrorResponse(400, 'INVALID_UPGRADE', 'New plan must be higher tier than current plan', requestId);
    }

    // Calculate prorated billing
    const daysRemaining = Math.ceil((billingAccount.nextBillingDate! - Date.now()) / (24 * 60 * 60 * 1000));
    const proratedBilling = calculateProratedBilling(currentPlan, newPlan, billingCycle, daysRemaining);

    // Process prorated payment if needed
    if (proratedBilling.proratedAmount > 0) {
      const paymentResult = await paymentProcessor.processPayment(
        proratedBilling.proratedAmount,
        'USD',
        billingAccount.paymentMethodId!,
        { type: 'membership_upgrade', fromPlan: currentPlan, toPlan: newPlan }
      );

      if (paymentResult.status !== 'completed') {
        return createErrorResponse(400, 'PAYMENT_FAILED', 'Failed to process upgrade payment', requestId);
      }

      // Record upgrade transaction
      const upgradeTransaction: Transaction = {
        id: generateId(),
        transactionId: generateId(),
        type: 'membership',
        amount: proratedBilling.proratedAmount,
        currency: 'USD',
        status: 'completed',
        userId,
        userName: '', // Would be populated from user data
        userEmail: '', // Would be populated from user data
        paymentMethod: 'card',
        processorTransactionId: paymentResult.transactionId,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        description: `Membership upgrade from ${currentPlan} to ${newPlan}`,
        fees: proratedBilling.proratedAmount * 0.029 + 0.30,
        netAmount: proratedBilling.proratedAmount - (proratedBilling.proratedAmount * 0.029 + 0.30),
        metadata: {
          type: 'membership_upgrade',
          fromPlan: currentPlan,
          toPlan: newPlan,
          proratedAmount: proratedBilling.proratedAmount,
          daysRemaining
        },
        billingAccountId: billingAccount.billingId,
      };

      await db.createTransaction(upgradeTransaction);
    }

    // Update billing account with new plan
    const newPricing = calculateSubscriptionPricing(newPlan, billingCycle);
    await db.updateBillingAccount(billingAccount.billingId, {
      plan: newPlan,
      amount: newPricing.amount,
      currency: newPricing.currency,
      updatedAt: Date.now(),
    });

    // Update user with new premium membership
    const newFeatures = getMembershipFeatures(newPlan);
    await db.updateUser(userId, {
      premiumActive: true,
      premiumPlan: newPlan,
      premiumExpiresAt: billingAccount.nextBillingDate,
      membershipDetails: {
        plan: newPlan,
        features: newFeatures,
        limits: {
          maxListings: newPlan.includes('dealer') ? -1 : 50, // Unlimited for dealers
          maxImages: newPlan.includes('dealer') ? 20 : 10,
          priorityPlacement: true,
          featuredListings: newPlan.includes('dealer') ? 10 : 3,
          analyticsAccess: true,
          bulkOperations: newPlan.includes('dealer'),
          advancedSearch: true,
          premiumSupport: true,
        },
        expiresAt: billingAccount.nextBillingDate,
        autoRenew: true,
        billingCycle,
      },
      updatedAt: Date.now(),
    });

    return createResponse(200, {
      message: 'Membership upgraded successfully',
      newPlan,
      proratedAmount: proratedBilling.proratedAmount,
      features: newFeatures,
      nextBillingDate: billingAccount.nextBillingDate,
    });
  } catch (error) {
    console.error('Error upgrading membership:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Missing required fields')) {
        return createErrorResponse(400, 'VALIDATION_ERROR', error.message, requestId);
      }
      if (error.message.includes('User not authenticated')) {
        return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
      }
    }

    return createErrorResponse(500, 'MEMBERSHIP_ERROR', 'Failed to upgrade membership', requestId);
  }
}

/**
 * Downgrades a user's membership plan with refund processing
 * 
 * @param event - API Gateway event containing downgrade data
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Downgrade result or error
 */
async function downgradeMembership(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const body = parseBody<{
      newPlan: string;
      effectiveDate?: 'immediate' | 'next_billing_cycle';
    }>(event);

    // Validate required fields
    validateRequired(body, ['newPlan']);

    // Get user's current billing account
    const billingAccount = await db.getBillingAccountByUser(userId);
    if (!billingAccount) {
      return createErrorResponse(404, 'BILLING_ACCOUNT_NOT_FOUND', 'No billing account found for user', requestId);
    }

    const currentPlan = billingAccount.plan;
    const newPlan = body.newPlan!;
    const effectiveDate = body.effectiveDate || 'next_billing_cycle';

    // Check if it's actually a downgrade
    const planHierarchy = ['basic', 'premium_individual', 'premium_dealer'];
    const currentIndex = planHierarchy.indexOf(currentPlan);
    const newIndex = planHierarchy.indexOf(newPlan);

    if (newIndex >= currentIndex) {
      return createErrorResponse(400, 'INVALID_DOWNGRADE', 'New plan must be lower tier than current plan', requestId);
    }

    if (effectiveDate === 'immediate') {
      // Process immediate downgrade with refund
      const daysRemaining = Math.ceil((billingAccount.nextBillingDate! - Date.now()) / (24 * 60 * 60 * 1000));
      const proratedBilling = calculateProratedBilling(currentPlan, newPlan, 'monthly', daysRemaining);

      // Process refund if applicable
      if (proratedBilling.refundAmount > 0) {
        // In a real implementation, you'd process the refund through the payment processor
        const refundTransaction: Transaction = {
          id: generateId(),
          transactionId: generateId(),
          type: 'refund',
          amount: proratedBilling.refundAmount,
          currency: 'USD',
          status: 'completed',
          userId,
          userName: '',
          userEmail: '',
          paymentMethod: 'card',
          processorTransactionId: `refund_${generateId()}`,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          description: `Membership downgrade refund from ${currentPlan} to ${newPlan}`,
          fees: 0,
          netAmount: proratedBilling.refundAmount,
          metadata: {
            type: 'membership_downgrade_refund',
            fromPlan: currentPlan,
            toPlan: newPlan,
            refundAmount: proratedBilling.refundAmount,
            daysRemaining
          },
          billingAccountId: billingAccount.billingId,
        };

        await db.createTransaction(refundTransaction);
      }

      // Update billing account immediately
      const newPricing = calculateSubscriptionPricing(newPlan, 'monthly');
      await db.updateBillingAccount(billingAccount.billingId, {
        plan: newPlan,
        amount: newPricing.amount,
        currency: newPricing.currency,
        updatedAt: Date.now(),
      });

      // Update user membership immediately
      const newFeatures = getMembershipFeatures(newPlan);
      await db.updateUser(userId, {
        premiumActive: newPlan !== 'basic',
        premiumPlan: newPlan !== 'basic' ? newPlan : undefined,
        premiumExpiresAt: newPlan !== 'basic' ? billingAccount.nextBillingDate : Date.now(),
        membershipDetails: {
          plan: newPlan,
          features: newFeatures,
          limits: {
            maxListings: newPlan === 'basic' ? 5 : 50,
            maxImages: newPlan === 'basic' ? 5 : 10,
            priorityPlacement: newPlan !== 'basic',
            featuredListings: newPlan === 'basic' ? 0 : 3,
            analyticsAccess: newPlan !== 'basic',
            bulkOperations: false,
            advancedSearch: newPlan !== 'basic',
            premiumSupport: newPlan !== 'basic',
          },
          expiresAt: newPlan !== 'basic' ? billingAccount.nextBillingDate : Date.now(),
          autoRenew: true,
          billingCycle: 'monthly',
        },
        updatedAt: Date.now(),
      });

      return createResponse(200, {
        message: 'Membership downgraded immediately',
        newPlan,
        refundAmount: proratedBilling.refundAmount,
        features: newFeatures,
        effectiveDate: 'immediate',
      });
    } else {
      // Schedule downgrade for next billing cycle
      await db.updateBillingAccount(billingAccount.billingId, {
        // Store the pending downgrade in metadata or a separate field
        metadata: {
          pendingDowngrade: {
            newPlan,
            scheduledDate: billingAccount.nextBillingDate,
          }
        },
        updatedAt: Date.now(),
      } as any);

      return createResponse(200, {
        message: 'Membership downgrade scheduled for next billing cycle',
        newPlan,
        currentPlan,
        effectiveDate: new Date(billingAccount.nextBillingDate!).toISOString(),
        nextBillingDate: billingAccount.nextBillingDate,
      });
    }
  } catch (error) {
    console.error('Error downgrading membership:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Missing required fields')) {
        return createErrorResponse(400, 'VALIDATION_ERROR', error.message, requestId);
      }
      if (error.message.includes('User not authenticated')) {
        return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
      }
    }

    return createErrorResponse(500, 'MEMBERSHIP_ERROR', 'Failed to downgrade membership', requestId);
  }
}

/**
 * Renews a user's membership subscription
 * 
 * @param event - API Gateway event containing renewal data
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Renewal result or error
 */
async function renewMembership(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const body = parseBody<{
      billingCycle?: 'monthly' | 'yearly';
    }>(event);

    // Get user's current billing account
    const billingAccount = await db.getBillingAccountByUser(userId);
    if (!billingAccount) {
      return createErrorResponse(404, 'BILLING_ACCOUNT_NOT_FOUND', 'No billing account found for user', requestId);
    }

    const billingCycle = body.billingCycle || 'monthly';
    const pricing = calculateSubscriptionPricing(billingAccount.plan, billingCycle);

    // Process renewal payment
    const paymentResult = await paymentProcessor.processPayment(
      pricing.amount,
      pricing.currency,
      billingAccount.paymentMethodId!,
      { type: 'membership_renewal', plan: billingAccount.plan }
    );

    if (paymentResult.status !== 'completed') {
      return createErrorResponse(400, 'PAYMENT_FAILED', 'Failed to process renewal payment', requestId);
    }

    // Record renewal transaction
    const renewalTransaction: Transaction = {
      id: generateId(),
      transactionId: generateId(),
      type: 'membership',
      amount: pricing.amount,
      currency: pricing.currency,
      status: 'completed',
      userId,
      userName: '',
      userEmail: '',
      paymentMethod: 'card',
      processorTransactionId: paymentResult.transactionId,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      description: `Membership renewal for ${billingAccount.plan}`,
      fees: pricing.amount * 0.029 + 0.30,
      netAmount: pricing.amount - (pricing.amount * 0.029 + 0.30),
      metadata: {
        type: 'membership_renewal',
        plan: billingAccount.plan,
        billingCycle
      },
      billingAccountId: billingAccount.billingId,
    };

    await db.createTransaction(renewalTransaction);

    // Update billing account with new billing date
    const nextBillingDate = calculateNextBillingDate(billingCycle);
    await db.updateBillingAccount(billingAccount.billingId, {
      nextBillingDate,
      amount: pricing.amount,
      currency: pricing.currency,
      status: 'active',
      updatedAt: Date.now(),
    });

    // Update user membership expiration
    await db.updateUser(userId, {
      premiumActive: true,
      premiumExpiresAt: nextBillingDate,
      membershipDetails: {
        plan: billingAccount.plan,
        features: getMembershipFeatures(billingAccount.plan),
        limits: {
          maxListings: billingAccount.plan.includes('dealer') ? -1 : 50,
          maxImages: billingAccount.plan.includes('dealer') ? 20 : 10,
          priorityPlacement: true,
          featuredListings: billingAccount.plan.includes('dealer') ? 10 : 3,
          analyticsAccess: true,
          bulkOperations: billingAccount.plan.includes('dealer'),
          advancedSearch: true,
          premiumSupport: true,
        },
        expiresAt: nextBillingDate,
        autoRenew: true,
        billingCycle,
      },
      updatedAt: Date.now(),
    });

    return createResponse(200, {
      message: 'Membership renewed successfully',
      plan: billingAccount.plan,
      amount: pricing.amount,
      currency: pricing.currency,
      nextBillingDate,
      transactionId: renewalTransaction.transactionId,
    });
  } catch (error) {
    console.error('Error renewing membership:', error);
    
    if (error instanceof Error && error.message.includes('User not authenticated')) {
      return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
    }

    return createErrorResponse(500, 'MEMBERSHIP_ERROR', 'Failed to renew membership', requestId);
  }
}

/**
 * Expires a user's membership (automatic downgrade)
 * 
 * @param event - API Gateway event containing user context
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Expiration result or error
 */
async function expireMembership(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);

    // Get user's current billing account
    const billingAccount = await db.getBillingAccountByUser(userId);
    if (!billingAccount) {
      return createErrorResponse(404, 'BILLING_ACCOUNT_NOT_FOUND', 'No billing account found for user', requestId);
    }

    // Check if membership has actually expired
    if (!isMembershipExpired(billingAccount.nextBillingDate!)) {
      return createErrorResponse(400, 'MEMBERSHIP_NOT_EXPIRED', 'Membership has not yet expired', requestId);
    }

    // Update billing account to basic plan
    await db.updateBillingAccount(billingAccount.billingId, {
      plan: 'basic',
      amount: 0,
      currency: 'USD',
      status: 'canceled',
      canceledAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update user to basic membership
    const basicFeatures = getMembershipFeatures('basic');
    await db.updateUser(userId, {
      premiumActive: false,
      premiumPlan: undefined,
      premiumExpiresAt: Date.now(),
      membershipDetails: {
        plan: 'basic',
        features: basicFeatures,
        limits: {
          maxListings: 5,
          maxImages: 5,
          priorityPlacement: false,
          featuredListings: 0,
          analyticsAccess: false,
          bulkOperations: false,
          advancedSearch: false,
          premiumSupport: false,
        },
        expiresAt: Date.now(),
        autoRenew: false,
        billingCycle: 'monthly',
      },
      updatedAt: Date.now(),
    });

    return createResponse(200, {
      message: 'Membership expired and downgraded to basic plan',
      newPlan: 'basic',
      features: basicFeatures,
      expiredAt: Date.now(),
    });
  } catch (error) {
    console.error('Error expiring membership:', error);
    
    if (error instanceof Error && error.message.includes('User not authenticated')) {
      return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
    }

    return createErrorResponse(500, 'MEMBERSHIP_ERROR', 'Failed to expire membership', requestId);
  }
}

/**
 * Generates revenue report with filtering and aggregation
 * 
 * @param event - API Gateway event containing report parameters
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Revenue report or error
 */
async function generateRevenueReport(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    
    const filters = {
      startDate: queryParams.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Default: last 30 days
      endDate: queryParams.endDate || new Date().toISOString(),
      groupBy: queryParams.groupBy || 'day', // day, week, month
      transactionTypes: queryParams.types ? queryParams.types.split(',') : ['payment', 'membership', 'subscription'],
    };

    // Get all transactions within date range
    const validGroupBy = ['day', 'week', 'month'].includes(filters.groupBy) ? filters.groupBy as 'day' | 'week' | 'month' : 'day';
    const allTransactions = await db.getFinancialReportingData({
      start: filters.startDate,
      end: filters.endDate
    }, validGroupBy);

    // Calculate revenue metrics
    const revenueMetrics = {
      totalRevenue: 0,
      totalTransactions: 0,
      averageTransactionValue: 0,
      revenueByType: {} as Record<string, number>,
      revenueByPeriod: [] as Array<{ period: string; revenue: number; transactions: number }>,
      topPaymentMethods: [] as Array<{ method: string; count: number; amount: number }>,
      conversionMetrics: {
        subscriptionConversionRate: 0,
        averageSubscriptionValue: 0,
        churnRate: 0,
      }
    };

    // Mock data for demonstration (in real implementation, this would come from database aggregation)
    const mockTransactions = [
      { type: 'payment', amount: 100, currency: 'USD', paymentMethod: 'card', createdAt: filters.startDate },
      { type: 'membership', amount: 29.99, currency: 'USD', paymentMethod: 'card', createdAt: filters.startDate },
      { type: 'subscription', amount: 99.99, currency: 'USD', paymentMethod: 'card', createdAt: filters.startDate },
    ];

    // Calculate totals
    revenueMetrics.totalRevenue = mockTransactions.reduce((sum, txn) => sum + txn.amount, 0);
    revenueMetrics.totalTransactions = mockTransactions.length;
    revenueMetrics.averageTransactionValue = revenueMetrics.totalRevenue / revenueMetrics.totalTransactions;

    // Group by transaction type
    mockTransactions.forEach(txn => {
      revenueMetrics.revenueByType[txn.type] = (revenueMetrics.revenueByType[txn.type] || 0) + txn.amount;
    });

    // Group by time period
    const periodMap = new Map<string, { revenue: number; transactions: number }>();
    mockTransactions.forEach(txn => {
      const period = new Date(txn.createdAt).toISOString().split('T')[0]; // Group by day
      const existing = periodMap.get(period) || { revenue: 0, transactions: 0 };
      existing.revenue += txn.amount;
      existing.transactions += 1;
      periodMap.set(period, existing);
    });

    revenueMetrics.revenueByPeriod = Array.from(periodMap.entries()).map(([period, data]) => ({
      period,
      revenue: data.revenue,
      transactions: data.transactions
    }));

    // Payment method breakdown
    const paymentMethodMap = new Map<string, { count: number; amount: number }>();
    mockTransactions.forEach(txn => {
      const existing = paymentMethodMap.get(txn.paymentMethod) || { count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += txn.amount;
      paymentMethodMap.set(txn.paymentMethod, existing);
    });

    revenueMetrics.topPaymentMethods = Array.from(paymentMethodMap.entries()).map(([method, data]) => ({
      method,
      count: data.count,
      amount: data.amount
    }));

    // Mock conversion metrics
    revenueMetrics.conversionMetrics = {
      subscriptionConversionRate: 0.15, // 15% conversion rate
      averageSubscriptionValue: 64.99,
      churnRate: 0.05, // 5% monthly churn
    };

    return createResponse(200, {
      report: {
        title: 'Revenue Report',
        dateRange: {
          startDate: filters.startDate,
          endDate: filters.endDate
        },
        metrics: revenueMetrics,
        generatedAt: new Date().toISOString(),
        filters
      }
    });
  } catch (error) {
    console.error('Error generating revenue report:', error);
    return createErrorResponse(500, 'REPORT_ERROR', 'Failed to generate revenue report', requestId);
  }
}

/**
 * Generates commission report for marketplace transactions
 * 
 * @param event - API Gateway event containing report parameters
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Commission report or error
 */
async function generateCommissionReport(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    
    const filters = {
      startDate: queryParams.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: queryParams.endDate || new Date().toISOString(),
      sellerId: queryParams.sellerId, // Optional: filter by specific seller
      commissionRate: parseFloat(queryParams.commissionRate || '0.05'), // Default 5% commission
    };

    // Mock commission data (in real implementation, this would come from transaction analysis)
    const commissionData = {
      totalCommissionEarned: 1250.75,
      totalSalesVolume: 25015.00,
      averageCommissionRate: 0.05,
      commissionByPeriod: [
        { period: '2024-01-01', commission: 425.25, sales: 8505.00, transactions: 12 },
        { period: '2024-01-02', commission: 387.50, sales: 7750.00, transactions: 8 },
        { period: '2024-01-03', commission: 438.00, sales: 8760.00, transactions: 15 },
      ],
      topSellers: [
        { sellerId: 'seller-1', sellerName: 'Premium Boats LLC', commission: 675.25, sales: 13505.00, transactions: 18 },
        { sellerId: 'seller-2', sellerName: 'Marina Sales Co', commission: 425.50, sales: 8510.00, transactions: 12 },
        { sellerId: 'seller-3', sellerName: 'Yacht Brokers Inc', commission: 150.00, sales: 3000.00, transactions: 5 },
      ],
      commissionByCategory: [
        { category: 'Sailboats', commission: 625.25, sales: 12505.00, averageCommission: 0.05 },
        { category: 'Motor Boats', commission: 475.50, sales: 9510.00, averageCommission: 0.05 },
        { category: 'Yachts', commission: 150.00, sales: 3000.00, averageCommission: 0.05 },
      ],
      payoutSchedule: [
        { sellerId: 'seller-1', amount: 675.25, scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), status: 'scheduled' },
        { sellerId: 'seller-2', amount: 425.50, scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), status: 'scheduled' },
      ]
    };

    return createResponse(200, {
      report: {
        title: 'Commission Report',
        dateRange: {
          startDate: filters.startDate,
          endDate: filters.endDate
        },
        summary: {
          totalCommissionEarned: commissionData.totalCommissionEarned,
          totalSalesVolume: commissionData.totalSalesVolume,
          averageCommissionRate: commissionData.averageCommissionRate,
          totalTransactions: commissionData.commissionByPeriod.reduce((sum, period) => sum + period.transactions, 0)
        },
        breakdown: {
          byPeriod: commissionData.commissionByPeriod,
          byCategory: commissionData.commissionByCategory,
          topSellers: commissionData.topSellers
        },
        payouts: {
          scheduled: commissionData.payoutSchedule,
          totalScheduled: commissionData.payoutSchedule.reduce((sum, payout) => sum + payout.amount, 0)
        },
        generatedAt: new Date().toISOString(),
        filters
      }
    });
  } catch (error) {
    console.error('Error generating commission report:', error);
    return createErrorResponse(500, 'REPORT_ERROR', 'Failed to generate commission report', requestId);
  }
}

/**
 * Gets financial dashboard data with key metrics and charts
 * 
 * @param event - API Gateway event containing dashboard parameters
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Dashboard data or error
 */
async function getFinancialDashboard(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    
    const timeframe = queryParams.timeframe || '30d'; // 7d, 30d, 90d, 1y
    const currency = queryParams.currency || 'USD';

    // Calculate date range based on timeframe
    const now = Date.now();
    let startDate: number;
    
    switch (timeframe) {
      case '7d':
        startDate = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = now - (90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = now - (365 * 24 * 60 * 60 * 1000);
        break;
      default: // 30d
        startDate = now - (30 * 24 * 60 * 60 * 1000);
    }

    // Mock dashboard data (in real implementation, this would come from database aggregation)
    const dashboardData = {
      summary: {
        totalRevenue: 45750.25,
        totalTransactions: 342,
        averageTransactionValue: 133.77,
        activeSubscriptions: 156,
        monthlyRecurringRevenue: 8945.50,
        churnRate: 0.045, // 4.5%
        conversionRate: 0.18, // 18%
        revenueGrowth: 0.125, // 12.5% growth
      },
      revenueChart: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
          {
            label: 'Revenue',
            data: [11250.50, 12875.75, 10950.25, 10673.75],
            backgroundColor: '#3B82F6',
            borderColor: '#1D4ED8',
          }
        ]
      },
      transactionChart: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
          {
            label: 'Transactions',
            data: [85, 92, 78, 87],
            backgroundColor: '#10B981',
            borderColor: '#059669',
          }
        ]
      },
      subscriptionChart: {
        labels: ['Premium Individual', 'Premium Dealer', 'Basic'],
        datasets: [
          {
            label: 'Active Subscriptions',
            data: [89, 67, 245],
            backgroundColor: ['#8B5CF6', '#F59E0B', '#6B7280'],
          }
        ]
      },
      paymentMethodBreakdown: [
        { method: 'Credit Card', percentage: 78.5, amount: 35914.45 },
        { method: 'PayPal', percentage: 15.2, amount: 6954.04 },
        { method: 'Bank Transfer', percentage: 6.3, amount: 2881.76 },
      ],
      topPerformingPlans: [
        { plan: 'Premium Individual', subscribers: 89, revenue: 2669.11, growth: 0.15 },
        { plan: 'Premium Dealer', subscribers: 67, revenue: 6699.33, growth: 0.08 },
        { plan: 'Basic', subscribers: 245, revenue: 0, growth: -0.02 },
      ],
      recentTransactions: [
        {
          id: 'txn_001',
          type: 'subscription',
          amount: 99.99,
          currency: 'USD',
          status: 'completed',
          customerName: 'Marina Sales Co',
          createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        },
        {
          id: 'txn_002',
          type: 'payment',
          amount: 250.00,
          currency: 'USD',
          status: 'completed',
          customerName: 'John Doe',
          createdAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        },
        {
          id: 'txn_003',
          type: 'membership',
          amount: 29.99,
          currency: 'USD',
          status: 'completed',
          customerName: 'Sarah Johnson',
          createdAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        },
      ],
      alerts: [
        {
          type: 'warning',
          title: 'High Churn Rate',
          message: 'Churn rate has increased to 4.5% this month',
          severity: 'medium',
          createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          type: 'info',
          title: 'Revenue Milestone',
          message: 'Monthly revenue exceeded $45K for the first time',
          severity: 'low',
          createdAt: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
        },
      ],
      forecasting: {
        projectedRevenue: {
          nextMonth: 52450.75,
          nextQuarter: 148750.25,
          confidence: 0.85,
        },
        projectedSubscriptions: {
          nextMonth: 175,
          nextQuarter: 210,
          confidence: 0.78,
        },
      }
    };

    return createResponse(200, {
      dashboard: {
        title: 'Financial Dashboard',
        timeframe,
        currency,
        dateRange: {
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(now).toISOString()
        },
        data: dashboardData,
        lastUpdated: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error getting financial dashboard:', error);
    return createErrorResponse(500, 'DASHBOARD_ERROR', 'Failed to load financial dashboard', requestId);
  }
}
/**
 
* Creates a new subscription using the enhanced subscription manager
 * 
 * @param event - API Gateway event containing subscription data
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Subscription result or error
 */
async function createEnhancedSubscription(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const body = parseBody<{
      planId: string;
      billingCycle: 'monthly' | 'yearly';
      paymentMethodId?: string;
      trialDays?: number;
      metadata?: Record<string, string>;
    }>(event);

    // Validate required fields
    validateRequired(body, ['planId', 'billingCycle']);

    const request: CreateSubscriptionRequest = {
      userId,
      planId: body.planId!,
      billingCycle: body.billingCycle!,
      paymentMethodId: body.paymentMethodId,
      trialDays: body.trialDays,
      metadata: body.metadata,
    };

    const result = await subscriptionManager.createSubscription(request);

    return createResponse(201, {
      subscriptionId: result.subscriptionId,
      status: result.status,
      trialEnd: result.trialEnd,
      nextBillingDate: result.nextBillingDate,
      message: 'Subscription created successfully'
    });
  } catch (error) {
    console.error('Error creating enhanced subscription:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Missing required fields')) {
        return createErrorResponse(400, 'VALIDATION_ERROR', error.message, requestId);
      }
      if (error.message.includes('User not authenticated')) {
        return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
      }
      if (error.message.includes('not found')) {
        return createErrorResponse(404, 'NOT_FOUND', error.message, requestId);
      }
    }

    return createErrorResponse(500, 'SUBSCRIPTION_ERROR', 'Failed to create subscription', requestId);
  }
}

/**
 * Updates an existing subscription using the enhanced subscription manager
 * 
 * @param subscriptionId - Subscription ID to update
 * @param event - API Gateway event containing update data
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Success response or error
 */
async function updateEnhancedSubscription(subscriptionId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const body = parseBody<{
      planId?: string;
      billingCycle?: 'monthly' | 'yearly';
      cancelAtPeriodEnd?: boolean;
      metadata?: Record<string, string>;
    }>(event);

    // Verify user owns the subscription
    const billingAccount = await db.getBillingAccountBySubscription(subscriptionId);
    if (!billingAccount) {
      return createErrorResponse(404, 'NOT_FOUND', 'Subscription not found', requestId);
    }

    if (billingAccount.userId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'You can only update your own subscription', requestId);
    }

    const request: UpdateSubscriptionRequest = {
      planId: body.planId,
      billingCycle: body.billingCycle,
      cancelAtPeriodEnd: body.cancelAtPeriodEnd,
      metadata: body.metadata,
    };

    await subscriptionManager.updateSubscription(subscriptionId, request);

    return createResponse(200, { message: 'Subscription updated successfully' });
  } catch (error) {
    console.error('Error updating enhanced subscription:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('User not authenticated')) {
        return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
      }
      if (error.message.includes('not found')) {
        return createErrorResponse(404, 'NOT_FOUND', error.message, requestId);
      }
    }

    return createErrorResponse(500, 'SUBSCRIPTION_ERROR', 'Failed to update subscription', requestId);
  }
}

/**
 * Cancels a subscription using the enhanced subscription manager
 * 
 * @param subscriptionId - Subscription ID to cancel
 * @param event - API Gateway event containing user context
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Success response or error
 */
async function cancelEnhancedSubscription(subscriptionId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const body = parseBody<{ immediate?: boolean }>(event);

    // Verify user owns the subscription
    const billingAccount = await db.getBillingAccountBySubscription(subscriptionId);
    if (!billingAccount) {
      return createErrorResponse(404, 'NOT_FOUND', 'Subscription not found', requestId);
    }

    if (billingAccount.userId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'You can only cancel your own subscription', requestId);
    }

    await subscriptionManager.cancelSubscription(subscriptionId, body.immediate || false);

    return createResponse(200, { 
      message: body.immediate 
        ? 'Subscription canceled immediately' 
        : 'Subscription will be canceled at the end of the current billing period'
    });
  } catch (error) {
    console.error('Error canceling enhanced subscription:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('User not authenticated')) {
        return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
      }
      if (error.message.includes('not found')) {
        return createErrorResponse(404, 'NOT_FOUND', error.message, requestId);
      }
    }

    return createErrorResponse(500, 'SUBSCRIPTION_ERROR', 'Failed to cancel subscription', requestId);
  }
}

/**
 * Gets available subscription plans
 * 
 * @param event - API Gateway event
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Available plans or error
 */
async function getSubscriptionPlans(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const plans = subscriptionManager.getActiveSubscriptionPlans();
    
    // Remove sensitive information from plans
    const publicPlans = plans.map(plan => ({
      planId: plan.planId,
      name: plan.name,
      type: plan.type,
      isPremium: plan.isPremium,
      features: plan.features,
      pricing: plan.pricing,
      trialDays: plan.trialDays,
    }));

    return createResponse(200, { plans: publicPlans });
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    return createErrorResponse(500, 'PLANS_ERROR', 'Failed to retrieve subscription plans', requestId);
  }
}

/**
 * Processes automatic subscription renewals (called by scheduled job)
 * 
 * @param event - API Gateway event
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Processing result or error
 */
async function processSubscriptionRenewals(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    // This endpoint should be protected and only called by scheduled jobs
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const expectedToken = process.env.RENEWAL_JOB_TOKEN;
    
    if (!authHeader || !expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'Invalid authorization for renewal job', requestId);
    }

    await subscriptionManager.processAutomaticRenewals();

    return createResponse(200, { 
      message: 'Automatic renewals processed successfully',
      processedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing subscription renewals:', error);
    return createErrorResponse(500, 'RENEWAL_ERROR', 'Failed to process subscription renewals', requestId);
  }
}/**
 * 
Processes payment retry attempts (called by scheduled job)
 * 
 * @param event - API Gateway event
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Processing result or error
 */
async function processPaymentRetries(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    // This endpoint should be protected and only called by scheduled jobs
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const expectedToken = process.env.RETRY_JOB_TOKEN;
    
    if (!authHeader || !expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'Invalid authorization for retry job', requestId);
    }

    await paymentFailureHandler.processRetryAttempts();

    return createResponse(200, { 
      message: 'Payment retry attempts processed successfully',
      processedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing payment retries:', error);
    return createErrorResponse(500, 'RETRY_ERROR', 'Failed to process payment retries', requestId);
  }
}
/
**
 * Creates a new payment method for a user
 * 
 * @param event - API Gateway event containing payment method data
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Created payment method or error
 */
async function createPaymentMethod(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const body = parseBody<{
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
    }>(event);

    // Validate required fields
    validateRequired(body, ['type']);

    // Get user's billing account or create customer
    let billingAccount = await db.getBillingAccountByUser(userId);
    let customerId: string;

    if (!billingAccount) {
      // Create customer in payment processor
      const user = await db.getUser(userId);
      if (!user) {
        return createErrorResponse(404, 'USER_NOT_FOUND', 'User not found', requestId);
      }

      const customerResult = await paymentProcessor.createCustomer({
        email: user.email,
        name: user.name,
        metadata: { userId }
      });
      customerId = customerResult.customerId;
    } else {
      customerId = billingAccount.customerId!;
    }

    // Create payment method
    const paymentMethod = await paymentMethodManager.createPaymentMethod(
      userId,
      customerId,
      body
    );

    return createResponse(201, {
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        last4: paymentMethod.last4,
        brand: paymentMethod.brand,
        expiryMonth: paymentMethod.expiryMonth,
        expiryYear: paymentMethod.expiryYear,
        isDefault: paymentMethod.isDefault,
        billingDetails: paymentMethod.billingDetails,
      },
      message: 'Payment method created successfully'
    });
  } catch (error) {
    console.error('Error creating payment method:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Missing required fields')) {
        return createErrorResponse(400, 'VALIDATION_ERROR', error.message, requestId);
      }
      if (error.message.includes('User not authenticated')) {
        return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
      }
      if (error.message.includes('Invalid payment method data')) {
        return createErrorResponse(400, 'VALIDATION_ERROR', error.message, requestId);
      }
    }

    return createErrorResponse(500, 'PAYMENT_METHOD_ERROR', 'Failed to create payment method', requestId);
  }
}

/**
 * Retrieves all payment methods for a user
 * 
 * @param event - API Gateway event containing user context
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - User's payment methods or error
 */
async function getUserPaymentMethods(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);

    const paymentMethods = await paymentMethodManager.getUserPaymentMethods(userId);

    // Remove sensitive information from response
    const safePaymentMethods = paymentMethods.map(method => ({
      id: method.id,
      type: method.type,
      last4: method.last4,
      brand: method.brand,
      expiryMonth: method.expiryMonth,
      expiryYear: method.expiryYear,
      bankName: method.bankName,
      accountType: method.accountType,
      isDefault: method.isDefault,
      billingDetails: method.billingDetails,
      createdAt: method.createdAt,
    }));

    return createResponse(200, { paymentMethods: safePaymentMethods });
  } catch (error) {
    console.error('Error getting user payment methods:', error);
    
    if (error instanceof Error && error.message.includes('User not authenticated')) {
      return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
    }

    return createErrorResponse(500, 'PAYMENT_METHOD_ERROR', 'Failed to retrieve payment methods', requestId);
  }
}

/**
 * Updates a payment method's billing details
 * 
 * @param paymentMethodId - Payment method ID to update
 * @param event - API Gateway event containing update data
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Success response or error
 */
async function updatePaymentMethod(paymentMethodId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const body = parseBody<{
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
      setAsDefault?: boolean;
    }>(event);

    // Update billing details if provided
    if (body.billingDetails) {
      await paymentMethodManager.updatePaymentMethodBillingDetails(
        paymentMethodId,
        userId,
        body.billingDetails
      );
    }

    // Set as default if requested
    if (body.setAsDefault) {
      await paymentMethodManager.setDefaultPaymentMethod(userId, paymentMethodId);
    }

    return createResponse(200, { message: 'Payment method updated successfully' });
  } catch (error) {
    console.error('Error updating payment method:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('User not authenticated')) {
        return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
      }
      if (error.message.includes('not found or not owned by user')) {
        return createErrorResponse(404, 'NOT_FOUND', error.message, requestId);
      }
    }

    return createErrorResponse(500, 'PAYMENT_METHOD_ERROR', 'Failed to update payment method', requestId);
  }
}

/**
 * Deletes a payment method
 * 
 * @param paymentMethodId - Payment method ID to delete
 * @param event - API Gateway event containing user context
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Success response or error
 */
async function deletePaymentMethod(paymentMethodId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);

    await paymentMethodManager.deletePaymentMethod(paymentMethodId, userId);

    return createResponse(200, { message: 'Payment method deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('User not authenticated')) {
        return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
      }
      if (error.message.includes('not found or not owned by user')) {
        return createErrorResponse(404, 'NOT_FOUND', error.message, requestId);
      }
      if (error.message.includes('Cannot delete the only payment method')) {
        return createErrorResponse(400, 'VALIDATION_ERROR', error.message, requestId);
      }
    }

    return createErrorResponse(500, 'PAYMENT_METHOD_ERROR', 'Failed to delete payment method', requestId);
  }
}

/**
 * Gets payment processor health status
 * 
 * @param event - API Gateway event
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Health status or error
 */
async function getProcessorHealthStatus(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    // Perform health check
    const healthStatus = await configManager.performHealthCheck();
    
    // Convert Map to object for JSON response
    const statusObject: Record<string, any> = {};
    for (const [type, status] of healthStatus.entries()) {
      statusObject[type] = status;
    }

    // Get available processors
    const availableProcessors = configManager.getAvailableProcessors();
    
    // Get processor configurations (without sensitive data)
    const configurations: Record<string, any> = {};
    for (const processor of availableProcessors) {
      const config = configManager.getConfig(processor as 'stripe' | 'paypal');
      if (config) {
        configurations[processor] = {
          type: config.type,
          enabled: config.enabled,
          environment: config.environment,
          features: config.settings.features,
          supportedCountries: config.settings.supportedCountries,
        };
      }
    }

    return createResponse(200, {
      healthStatus: statusObject,
      availableProcessors,
      configurations,
      primaryProcessor: process.env.PAYMENT_PROCESSOR || 'stripe',
    });
  } catch (error) {
    console.error('Error getting processor health status:', error);
    return createErrorResponse(500, 'HEALTH_CHECK_ERROR', 'Failed to get processor health status', requestId);
  }
}