/**
 * @fileoverview Integration tests for payment processor implementations.
 * 
 * Tests the complete payment processor integration including:
 * - Stripe and PayPal processor initialization
 * - Payment method creation and management
 * - Payment processing and subscription handling
 * - Webhook event processing
 * - Error handling and security validation
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { createStripeProcessor, StripePaymentProcessor } from './payment-processors/stripe';
import { createPayPalProcessor, PayPalPaymentProcessor } from './payment-processors/paypal';
import { PaymentMethodManager, createPaymentMethodManager } from './payment-method-manager';
import { getPaymentProcessorConfigManager, getPrimaryPaymentProcessor } from './payment-processor-config';

// Mock environment variables
const mockEnv = {
  STRIPE_SECRET_KEY: 'sk_test_mock_key',
  STRIPE_WEBHOOK_SECRET: 'whsec_mock_secret',
  PAYPAL_CLIENT_ID: 'mock_client_id',
  PAYPAL_CLIENT_SECRET: 'mock_client_secret',
  PAYPAL_ENVIRONMENT: 'sandbox',
  PAYMENT_PROCESSOR: 'stripe',
};

// Mock database operations
jest.mock('../shared/database', () => ({
  db: {
    createPaymentMethod: jest.fn(),
    getUserPaymentMethods: jest.fn(),
    getPaymentMethod: jest.fn(),
    updatePaymentMethod: jest.fn(),
    deletePaymentMethod: jest.fn(),
    getUser: jest.fn(),
    getBillingAccountByUser: jest.fn(),
  },
}));

describe('Payment Processor Integration', () => {
  beforeEach(() => {
    // Set up environment variables
    Object.entries(mockEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up environment variables
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });
  });

  describe('Stripe Payment Processor', () => {
    let stripeProcessor: StripePaymentProcessor;

    beforeEach(() => {
      stripeProcessor = createStripeProcessor();
    });

    test('should initialize Stripe processor with correct configuration', () => {
      expect(stripeProcessor).toBeInstanceOf(StripePaymentProcessor);
    });

    test('should throw error when API key is missing', () => {
      delete process.env.STRIPE_SECRET_KEY;
      
      expect(() => {
        createStripeProcessor();
      }).toThrow('Stripe API key not found');
    });

    test('should throw error when webhook secret is missing', () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      
      expect(() => {
        createStripeProcessor();
      }).toThrow('Stripe webhook secret not found');
    });

    test('should create customer successfully', async () => {
      const mockCustomer = { id: 'cus_mock123' };
      
      // Mock Stripe customer creation
      const mockStripe = {
        customers: {
          create: jest.fn().mockResolvedValue(mockCustomer),
        },
      };
      
      // Replace the internal stripe instance (this would need proper mocking in real tests)
      (stripeProcessor as any).stripe = mockStripe;

      const result = await stripeProcessor.createCustomer({
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(result.customerId).toBe('cus_mock123');
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: {
          source: 'harborlist',
        },
      });
    });

    test('should handle customer creation errors', async () => {
      const mockStripe = {
        customers: {
          create: jest.fn().mockRejectedValue(new Error('Stripe API error')),
        },
      };
      
      (stripeProcessor as any).stripe = mockStripe;

      await expect(stripeProcessor.createCustomer({
        email: 'test@example.com',
        name: 'Test User',
      })).rejects.toThrow('Failed to create customer: Stripe API error');
    });

    test('should create payment method successfully', async () => {
      const mockPaymentMethod = { id: 'pm_mock123' };
      
      const mockStripe = {
        paymentMethods: {
          create: jest.fn().mockResolvedValue(mockPaymentMethod),
          attach: jest.fn().mockResolvedValue({}),
        },
      };
      
      (stripeProcessor as any).stripe = mockStripe;

      const result = await stripeProcessor.createPaymentMethod('cus_mock123', {
        type: 'card',
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
      });

      expect(result.paymentMethodId).toBe('pm_mock123');
      expect(mockStripe.paymentMethods.create).toHaveBeenCalled();
      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith('pm_mock123', {
        customer: 'cus_mock123',
      });
    });

    test('should process payment successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_mock123',
        status: 'succeeded',
        client_secret: 'pi_mock123_secret',
      };
      
      const mockStripe = {
        paymentIntents: {
          create: jest.fn().mockResolvedValue(mockPaymentIntent),
        },
      };
      
      (stripeProcessor as any).stripe = mockStripe;

      const result = await stripeProcessor.processPayment(
        100.00,
        'USD',
        'pm_mock123',
        { orderId: 'order_123' }
      );

      expect(result.transactionId).toBe('pi_mock123');
      expect(result.status).toBe('succeeded');
      expect(result.clientSecret).toBe('pi_mock123_secret');
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 10000, // Amount in cents
        currency: 'usd',
        payment_method: 'pm_mock123',
        confirm: true,
        return_url: expect.any(String),
        metadata: {
          source: 'harborlist',
          orderId: 'order_123',
        },
      });
    });
  });

  describe('PayPal Payment Processor', () => {
    let paypalProcessor: PayPalPaymentProcessor;

    beforeEach(() => {
      paypalProcessor = createPayPalProcessor();
    });

    test('should initialize PayPal processor with correct configuration', () => {
      expect(paypalProcessor).toBeInstanceOf(PayPalPaymentProcessor);
    });

    test('should throw error when client ID is missing', () => {
      delete process.env.PAYPAL_CLIENT_ID;
      
      expect(() => {
        createPayPalProcessor();
      }).toThrow('PayPal client ID not found');
    });

    test('should throw error when client secret is missing', () => {
      delete process.env.PAYPAL_CLIENT_SECRET;
      
      expect(() => {
        createPayPalProcessor();
      }).toThrow('PayPal client secret not found');
    });

    test('should create customer successfully', async () => {
      const result = await paypalProcessor.createCustomer({
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(result.customerId).toMatch(/^paypal_\d+_/);
    });

    test('should create payment method successfully', async () => {
      const result = await paypalProcessor.createPaymentMethod('paypal_customer_123', {
        type: 'paypal',
      });

      expect(result.paymentMethodId).toMatch(/^pm_paypal_\d+_/);
    });
  });

  describe('Payment Method Manager', () => {
    let paymentMethodManager: PaymentMethodManager;
    let mockProcessor: any;
    let mockDb: any;

    beforeEach(() => {
      mockProcessor = {
        createCustomer: jest.fn(),
        createPaymentMethod: jest.fn(),
      };

      mockDb = require('../shared/database').db;
      
      paymentMethodManager = createPaymentMethodManager(mockProcessor, 'stripe');
    });

    test('should create payment method successfully', async () => {
      const mockPaymentMethodData = {
        type: 'card' as const,
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
        billing_details: {
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      mockProcessor.createPaymentMethod.mockResolvedValue({
        paymentMethodId: 'pm_mock123',
      });

      mockDb.createPaymentMethod.mockResolvedValue(undefined);
      mockDb.getUserPaymentMethods.mockResolvedValue([]).mockResolvedValueOnce([{ id: 'pm_mock123' }]);
      mockDb.getPaymentMethod.mockResolvedValue({ id: 'pm_mock123', userId: 'user_123' });
      mockDb.updatePaymentMethod.mockResolvedValue(undefined);

      const result = await paymentMethodManager.createPaymentMethod(
        'user_123',
        'cus_mock123',
        mockPaymentMethodData
      );

      expect(result.id).toBeDefined();
      expect(result.userId).toBe('user_123');
      expect(result.type).toBe('card');
      expect(result.last4).toBe('4242');
      expect(result.isDefault).toBe(true); // First payment method should be default
      expect(mockProcessor.createPaymentMethod).toHaveBeenCalled();
      expect(mockDb.createPaymentMethod).toHaveBeenCalled();
    });

    test('should validate payment method data', async () => {
      const invalidPaymentMethodData = {
        type: 'card' as const,
        card: {
          number: '123', // Invalid card number
          exp_month: 13, // Invalid month
          exp_year: 2020, // Expired year
          cvc: '12', // Invalid CVC
        },
      };

      await expect(paymentMethodManager.createPaymentMethod(
        'user_123',
        'cus_mock123',
        invalidPaymentMethodData
      )).rejects.toThrow('Invalid payment method data');
    });

    test('should get user payment methods', async () => {
      const mockPaymentMethods = [
        {
          id: 'pm_1',
          userId: 'user_123',
          type: 'card',
          last4: '4242',
          isDefault: true,
        },
        {
          id: 'pm_2',
          userId: 'user_123',
          type: 'card',
          last4: '1234',
          isDefault: false,
        },
      ];

      mockDb.getUserPaymentMethods.mockResolvedValue(mockPaymentMethods);

      const result = await paymentMethodManager.getUserPaymentMethods('user_123');

      expect(result).toEqual(mockPaymentMethods);
      expect(mockDb.getUserPaymentMethods).toHaveBeenCalledWith('user_123');
    });

    test('should set default payment method', async () => {
      const mockPaymentMethod = {
        id: 'pm_1',
        userId: 'user_123',
        isDefault: false,
      };

      const mockExistingMethods = [
        { id: 'pm_2', isDefault: true },
        mockPaymentMethod,
      ];

      mockDb.getPaymentMethod.mockResolvedValue(mockPaymentMethod);
      mockDb.getUserPaymentMethods.mockResolvedValue(mockExistingMethods);
      mockDb.updatePaymentMethod.mockResolvedValue(undefined);

      await paymentMethodManager.setDefaultPaymentMethod('user_123', 'pm_1');

      expect(mockDb.updatePaymentMethod).toHaveBeenCalledWith('pm_2', {
        isDefault: false,
        updatedAt: expect.any(Number),
      });
      expect(mockDb.updatePaymentMethod).toHaveBeenCalledWith('pm_1', {
        isDefault: true,
        updatedAt: expect.any(Number),
      });
    });

    test('should delete payment method', async () => {
      const mockPaymentMethod = {
        id: 'pm_1',
        userId: 'user_123',
        isDefault: false,
      };

      const mockUserMethods = [
        mockPaymentMethod,
        { id: 'pm_2', isDefault: true },
      ];

      mockDb.getPaymentMethod.mockResolvedValue(mockPaymentMethod);
      mockDb.getUserPaymentMethods.mockResolvedValue(mockUserMethods);
      mockDb.deletePaymentMethod.mockResolvedValue(undefined);

      await paymentMethodManager.deletePaymentMethod('pm_1', 'user_123');

      expect(mockDb.deletePaymentMethod).toHaveBeenCalledWith('pm_1');
    });

    test('should prevent deleting the only payment method', async () => {
      const mockPaymentMethod = {
        id: 'pm_1',
        userId: 'user_123',
        isDefault: true,
      };

      mockDb.getPaymentMethod.mockResolvedValue(mockPaymentMethod);
      mockDb.getUserPaymentMethods.mockResolvedValue([mockPaymentMethod]);

      await expect(paymentMethodManager.deletePaymentMethod('pm_1', 'user_123'))
        .rejects.toThrow('Cannot delete the only payment method');
    });
  });

  describe('Payment Processor Configuration Manager', () => {
    test('should initialize with correct processors', () => {
      const configManager = getPaymentProcessorConfigManager();
      
      expect(configManager.getAvailableProcessors()).toContain('stripe');
      expect(configManager.isProcessorAvailable('stripe')).toBe(true);
    });

    test('should get primary processor', () => {
      const primaryProcessor = getPrimaryPaymentProcessor();
      
      expect(primaryProcessor).toBeDefined();
    });

    test('should perform health check', async () => {
      const configManager = getPaymentProcessorConfigManager();
      
      const healthStatus = await configManager.performHealthCheck();
      
      expect(healthStatus).toBeInstanceOf(Map);
      expect(healthStatus.size).toBeGreaterThan(0);
    });

    test('should validate processor configuration', () => {
      const configManager = getPaymentProcessorConfigManager();
      
      const validation = configManager.validateProcessorConfig('stripe');
      
      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('errors');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const mockProcessor = {
        createCustomer: jest.fn().mockRejectedValue(new Error('Network error')),
        createPaymentMethod: jest.fn(),
        createSubscription: jest.fn(),
        processPayment: jest.fn(),
        cancelSubscription: jest.fn(),
        updateSubscription: jest.fn(),
        processRefund: jest.fn(),
        retrievePaymentIntent: jest.fn(),
        retrieveSubscription: jest.fn(),
        constructWebhookEvent: jest.fn(),
        handleWebhookEvent: jest.fn(),
      };

      const paymentMethodManager = createPaymentMethodManager(mockProcessor, 'stripe');

      await expect(paymentMethodManager.createPaymentMethod(
        'user_123',
        'cus_mock123',
        { type: 'card', card: { number: '4242424242424242', exp_month: 12, exp_year: 2025, cvc: '123' } }
      )).rejects.toThrow('Failed to create payment method');
    });

    test('should handle invalid processor configuration', () => {
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      expect(() => {
        createStripeProcessor();
      }).toThrow();
    });
  });

  describe('Security Validation', () => {
    test('should sanitize input data', async () => {
      const mockProcessor = {
        createCustomer: jest.fn(),
        createPaymentMethod: jest.fn().mockResolvedValue({ paymentMethodId: 'pm_123' }),
        createSubscription: jest.fn(),
        processPayment: jest.fn(),
        cancelSubscription: jest.fn(),
        updateSubscription: jest.fn(),
        processRefund: jest.fn(),
        retrievePaymentIntent: jest.fn(),
        retrieveSubscription: jest.fn(),
        constructWebhookEvent: jest.fn(),
        handleWebhookEvent: jest.fn(),
      };

      const mockDb = require('../shared/database').db;
      mockDb.createPaymentMethod.mockResolvedValue(undefined);
      mockDb.getUserPaymentMethods.mockResolvedValue([]);

      const paymentMethodManager = createPaymentMethodManager(mockProcessor, 'stripe');

      const maliciousData = {
        type: 'card' as const,
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
        billing_details: {
          name: '<script>alert("xss")</script>',
          email: 'test@example.com',
        },
      };

      const result = await paymentMethodManager.createPaymentMethod(
        'user_123',
        'cus_mock123',
        maliciousData
      );

      // Check that the malicious script was sanitized
      expect(result.billingDetails?.name).not.toContain('<script>');
    });

    test('should validate email addresses', async () => {
      const mockProcessor = {
        createCustomer: jest.fn(),
        createPaymentMethod: jest.fn(),
        createSubscription: jest.fn(),
        processPayment: jest.fn(),
        cancelSubscription: jest.fn(),
        updateSubscription: jest.fn(),
        processRefund: jest.fn(),
        retrievePaymentIntent: jest.fn(),
        retrieveSubscription: jest.fn(),
        constructWebhookEvent: jest.fn(),
        handleWebhookEvent: jest.fn(),
      };

      const paymentMethodManager = createPaymentMethodManager(mockProcessor, 'stripe');

      const invalidEmailData = {
        type: 'card' as const,
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
        billing_details: {
          email: 'invalid-email',
        },
      };

      await expect(paymentMethodManager.createPaymentMethod(
        'user_123',
        'cus_mock123',
        invalidEmailData
      )).rejects.toThrow('Invalid email address');
    });
  });
});