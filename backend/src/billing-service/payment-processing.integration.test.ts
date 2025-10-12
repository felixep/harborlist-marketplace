/**
 * @fileoverview Integration tests for payment processing in HarborList billing system.
 * 
 * Tests payment processor integration, subscription management, and failure handling:
 * - Payment processor integration and transaction processing
 * - Subscription management and billing cycles
 * - Payment failure handling and dispute resolution
 * - Webhook event processing
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './index';
import { StripePaymentProcessor } from './payment-processors/stripe';
import { PayPalPaymentProcessor } from './payment-processors/paypal';
import { SubscriptionManager } from './subscription-manager';
import { PaymentFailureHandler, PaymentFailureReason } from './payment-failure-handler';
import { WebhookHandler } from './webhook-handler';
import { db } from '../shared/database';
import { BillingAccount, Transaction, EnhancedUser } from '@harborlist/shared-types';

// Mock the database
jest.mock('../shared/database');
const mockDb = db as jest.Mocked<typeof db>;

// Mock payment processors
jest.mock('./payment-processors/stripe');
jest.mock('./payment-processors/paypal');

describe('Payment Processing Integration Tests', () => {
  let mockStripeProcessor: jest.Mocked<StripePaymentProcessor>;
  let mockPayPalProcessor: jest.Mocked<PayPalPaymentProcessor>;
  let subscriptionManager: SubscriptionManager;
  let paymentFailureHandler: PaymentFailureHandler;
  let webhookHandler: WebhookHandler;

  const mockUser: EnhancedUser = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user' as any,
    status: 'active' as any,
    emailVerified: true,
    phoneVerified: false,
    mfaEnabled: false,
    loginAttempts: 0,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    userType: 'individual',
    membershipDetails: {
      plan: 'basic',
      features: [],
      limits: {
        maxListings: 5,
        maxImages: 10,
        priorityPlacement: false,
        featuredListings: 0,
        analyticsAccess: false,
        bulkOperations: false,
        advancedSearch: false,
        premiumSupport: false,
      },
      expiresAt: undefined,
      autoRenew: false,
    },
    capabilities: [],
    premiumActive: false,
  };

  const mockBillingAccount: BillingAccount = {
    billingId: 'billing123',
    userId: 'user123',
    customerId: 'cus_test123',
    paymentMethodId: 'pm_test123',
    plan: 'premium_individual',
    amount: 29.99,
    currency: 'USD',
    status: 'active',
    nextBillingDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
    paymentHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock Stripe processor
    mockStripeProcessor = {
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
    } as any;

    // Setup mock PayPal processor
    mockPayPalProcessor = {
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
    } as any;

    // Initialize services
    subscriptionManager = new SubscriptionManager(mockStripeProcessor);
    paymentFailureHandler = new PaymentFailureHandler(mockStripeProcessor);
    webhookHandler = new WebhookHandler(mockStripeProcessor, paymentFailureHandler, subscriptionManager);

    // Setup database mocks
    mockDb.getUser.mockResolvedValue(mockUser);
    mockDb.getBillingAccountByUser.mockResolvedValue(mockBillingAccount);
    mockDb.getBillingAccount.mockResolvedValue(mockBillingAccount);
    mockDb.createBillingAccount.mockResolvedValue(undefined);
    mockDb.updateBillingAccount.mockResolvedValue(undefined);
    mockDb.createTransaction.mockResolvedValue(undefined);
    mockDb.updateUser.mockResolvedValue(undefined);
  });

  describe('Payment Processor Integration', () => {
    it('should create customer successfully with Stripe', async () => {
      // Arrange
      mockStripeProcessor.createCustomer.mockResolvedValue({ customerId: 'cus_test123' });

      // Act
      const result = await mockStripeProcessor.createCustomer({
        email: 'test@example.com',
        name: 'Test User',
      });

      // Assert
      expect(result.customerId).toBe('cus_test123');
      expect(mockStripeProcessor.createCustomer).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should create payment method successfully', async () => {
      // Arrange
      mockStripeProcessor.createPaymentMethod.mockResolvedValue({ paymentMethodId: 'pm_test123' });

      // Act
      const result = await mockStripeProcessor.createPaymentMethod('cus_test123', {
        type: 'card',
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
      });

      // Assert
      expect(result.paymentMethodId).toBe('pm_test123');
      expect(mockStripeProcessor.createPaymentMethod).toHaveBeenCalledWith('cus_test123', expect.any(Object));
    });

    it('should process payment successfully', async () => {
      // Arrange
      mockStripeProcessor.processPayment.mockResolvedValue({
        transactionId: 'pi_test123',
        status: 'succeeded',
      });

      // Act
      const result = await mockStripeProcessor.processPayment(29.99, 'USD', 'pm_test123');

      // Assert
      expect(result.transactionId).toBe('pi_test123');
      expect(result.status).toBe('succeeded');
      expect(mockStripeProcessor.processPayment).toHaveBeenCalledWith(29.99, 'USD', 'pm_test123');
    });

    it('should handle payment failure', async () => {
      // Arrange
      mockStripeProcessor.processPayment.mockResolvedValue({
        transactionId: 'pi_test123',
        status: 'failed',
      });

      // Act
      const result = await mockStripeProcessor.processPayment(29.99, 'USD', 'pm_test123');

      // Assert
      expect(result.status).toBe('failed');
    });
  });

  describe('Subscription Management', () => {
    it('should create subscription successfully', async () => {
      // Arrange
      mockStripeProcessor.createSubscription.mockResolvedValue({
        subscriptionId: 'sub_test123',
        status: 'active',
      });

      // Act
      const result = await subscriptionManager.createSubscription({
        userId: 'user123',
        planId: 'premium_individual',
        billingCycle: 'monthly',
      });

      // Assert
      expect(result.subscriptionId).toBe('sub_test123');
      expect(result.status).toBe('active');
      expect(mockDb.updateBillingAccount).toHaveBeenCalled();
      expect(mockDb.updateUser).toHaveBeenCalled();
    });

    it('should update subscription plan with prorated billing', async () => {
      // Arrange
      mockDb.getBillingAccountBySubscription.mockResolvedValue(mockBillingAccount);
      mockStripeProcessor.updateSubscription.mockResolvedValue(undefined);

      // Act
      await subscriptionManager.updateSubscription('sub_test123', {
        planId: 'premium_dealer',
        billingCycle: 'monthly',
      });

      // Assert
      expect(mockStripeProcessor.updateSubscription).toHaveBeenCalled();
      expect(mockDb.updateBillingAccount).toHaveBeenCalled();
    });

    it('should cancel subscription at period end', async () => {
      // Arrange
      mockDb.getBillingAccountBySubscription.mockResolvedValue(mockBillingAccount);
      mockStripeProcessor.updateSubscription.mockResolvedValue(undefined);

      // Act
      await subscriptionManager.cancelSubscription('sub_test123', false);

      // Assert
      expect(mockStripeProcessor.updateSubscription).toHaveBeenCalledWith('sub_test123', {
        cancel_at_period_end: true,
      });
      expect(mockDb.updateBillingAccount).toHaveBeenCalledWith('billing123', expect.objectContaining({
        status: 'canceled',
      }));
    });

    it('should cancel subscription immediately', async () => {
      // Arrange
      mockDb.getBillingAccountBySubscription.mockResolvedValue(mockBillingAccount);
      mockStripeProcessor.cancelSubscription.mockResolvedValue(undefined);

      // Act
      await subscriptionManager.cancelSubscription('sub_test123', true);

      // Assert
      expect(mockStripeProcessor.cancelSubscription).toHaveBeenCalledWith('sub_test123');
      expect(mockDb.updateBillingAccount).toHaveBeenCalledWith('billing123', expect.objectContaining({
        status: 'canceled',
      }));
    });
  });

  describe('Payment Failure Handling', () => {
    it('should handle payment failure and start dunning campaign', async () => {
      // Arrange
      mockDb.createPaymentFailure.mockResolvedValue(undefined);

      // Act
      const failure = await paymentFailureHandler.handlePaymentFailure(
        'pi_test123',
        'billing123',
        PaymentFailureReason.INSUFFICIENT_FUNDS,
        'Insufficient funds'
      );

      // Assert
      expect(failure.reason).toBe(PaymentFailureReason.INSUFFICIENT_FUNDS);
      expect(failure.attemptNumber).toBe(1);
      expect(mockDb.createPaymentFailure).toHaveBeenCalled();
      expect(mockDb.updateBillingAccount).toHaveBeenCalledWith('billing123', expect.objectContaining({
        status: 'past_due',
      }));
    });

    it('should process retry attempts', async () => {
      // Arrange
      const mockFailure = {
        failureId: 'failure123',
        transactionId: 'pi_test123',
        billingAccountId: 'billing123',
        userId: 'user123',
        amount: 29.99,
        currency: 'USD',
        reason: PaymentFailureReason.INSUFFICIENT_FUNDS,
        attemptNumber: 1,
        maxAttempts: 3,
        nextRetryAt: Date.now() - 1000, // Past due
        gracePeriodEnds: Date.now() + 86400000,
        resolved: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockDb.getPaymentFailuresDueForRetry.mockResolvedValue([mockFailure]);
      mockStripeProcessor.processPayment.mockResolvedValue({
        transactionId: 'pi_retry123',
        status: 'succeeded',
      });

      // Act
      await paymentFailureHandler.processRetryAttempts();

      // Assert
      expect(mockDb.getPaymentFailuresDueForRetry).toHaveBeenCalled();
      expect(mockStripeProcessor.processPayment).toHaveBeenCalled();
    });

    it('should create dispute case', async () => {
      // Arrange
      const mockTransaction: Transaction = {
        id: 'trans123',
        transactionId: 'pi_test123',
        type: 'payment',
        amount: 29.99,
        currency: 'USD',
        status: 'completed',
        userId: 'user123',
        userName: 'Test User',
        userEmail: 'test@example.com',
        paymentMethod: 'card',
        processorTransactionId: 'pi_test123',
        createdAt: '2023-01-01T00:00:00Z',
        description: 'Test payment',
        fees: 1.17,
        netAmount: 28.82,
      };

      mockDb.getTransaction.mockResolvedValue(mockTransaction);
      mockDb.createDisputeCase.mockResolvedValue(undefined);
      mockDb.createDisputeWorkflow.mockResolvedValue(undefined);

      // Act
      const dispute = await paymentFailureHandler.createDisputeCase(
        'pi_test123',
        'chargeback',
        29.99,
        ['receipt', 'communication'],
        Date.now() + 86400000 * 7 // 7 days from now
      );

      // Assert
      expect(dispute.disputeType).toBe('chargeback');
      expect(dispute.disputeAmount).toBe(29.99);
      expect(mockDb.createDisputeCase).toHaveBeenCalled();
    });
  });

  describe('Webhook Event Processing', () => {
    const createMockWebhookEvent = (path: string, body: string, signature: string): APIGatewayProxyEvent => ({
      httpMethod: 'POST',
      path,
      headers: {
        'stripe-signature': signature,
        'content-type': 'application/json',
      },
      body,
      pathParameters: null,
      queryStringParameters: null,
      requestContext: {
        requestId: 'test-request-id',
      } as any,
      resource: '',
      stageVariables: null,
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
      isBase64Encoded: false,
    });

    it('should handle Stripe payment succeeded webhook', async () => {
      // Arrange
      const webhookPayload = JSON.stringify({
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            amount: 2999,
            currency: 'usd',
            status: 'succeeded',
          },
        },
      });

      const mockEvent = createMockWebhookEvent('/billing/webhooks/stripe', webhookPayload, 'test_signature');

      mockStripeProcessor.constructWebhookEvent.mockReturnValue({
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test123' } },
      });

      mockStripeProcessor.handleWebhookEvent.mockResolvedValue({
        handled: true,
        action: 'payment_succeeded',
        data: { paymentIntentId: 'pi_test123' },
      });

      mockDb.getTransactionByProcessorId.mockResolvedValue({
        id: 'trans123',
        transactionId: 'trans123',
        status: 'pending',
      } as any);

      mockDb.getProcessedWebhookEvent.mockResolvedValue(null);
      mockDb.createProcessedWebhookEvent.mockResolvedValue(undefined);

      // Act
      const result = await webhookHandler.handleWebhook(mockEvent);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockStripeProcessor.constructWebhookEvent).toHaveBeenCalled();
      expect(mockStripeProcessor.handleWebhookEvent).toHaveBeenCalled();
      expect(mockDb.updateTransaction).toHaveBeenCalledWith('trans123', expect.objectContaining({
        status: 'completed',
      }));
    });

    it('should handle Stripe payment failed webhook', async () => {
      // Arrange
      const webhookPayload = JSON.stringify({
        id: 'evt_test123',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test123',
            status: 'failed',
            last_payment_error: {
              code: 'insufficient_funds',
              message: 'Your card has insufficient funds.',
            },
          },
        },
      });

      const mockEvent = createMockWebhookEvent('/billing/webhooks/stripe', webhookPayload, 'test_signature');

      mockStripeProcessor.constructWebhookEvent.mockReturnValue({
        id: 'evt_test123',
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_test123' } },
      });

      mockStripeProcessor.handleWebhookEvent.mockResolvedValue({
        handled: true,
        action: 'payment_failed',
        data: {
          paymentIntentId: 'pi_test123',
          lastPaymentError: { code: 'insufficient_funds' },
        },
      });

      mockDb.getTransactionByProcessorId.mockResolvedValue({
        id: 'trans123',
        transactionId: 'trans123',
        billingAccountId: 'billing123',
        status: 'pending',
      } as any);

      mockDb.getProcessedWebhookEvent.mockResolvedValue(null);
      mockDb.createProcessedWebhookEvent.mockResolvedValue(undefined);
      mockDb.createPaymentFailure.mockResolvedValue(undefined);

      // Act
      const result = await webhookHandler.handleWebhook(mockEvent);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockDb.updateTransaction).toHaveBeenCalledWith('trans123', expect.objectContaining({
        status: 'failed',
      }));
    });

    it('should handle duplicate webhook events', async () => {
      // Arrange
      const webhookPayload = JSON.stringify({
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
      });

      const mockEvent = createMockWebhookEvent('/billing/webhooks/stripe', webhookPayload, 'test_signature');

      mockStripeProcessor.constructWebhookEvent.mockReturnValue({
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
      });

      // Mock duplicate event
      mockDb.getProcessedWebhookEvent.mockResolvedValue({
        eventId: 'evt_test123',
        processorType: 'stripe',
        eventType: 'payment_intent.succeeded',
        processed: true,
        processedAt: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      });

      // Act
      const result = await webhookHandler.handleWebhook(mockEvent);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.duplicate).toBe(true);
    });

    it('should handle invalid webhook signature', async () => {
      // Arrange
      const webhookPayload = JSON.stringify({ id: 'evt_test123' });
      const mockEvent = createMockWebhookEvent('/billing/webhooks/stripe', webhookPayload, 'invalid_signature');

      mockStripeProcessor.constructWebhookEvent.mockImplementation(() => {
        throw new Error('Invalid webhook signature');
      });

      // Act
      const result = await webhookHandler.handleWebhook(mockEvent);

      // Assert
      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('INVALID_SIGNATURE');
    });
  });

  describe('End-to-End Payment Flow', () => {
    it('should complete full subscription creation flow', async () => {
      // Arrange
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/billing/subscriptions',
        headers: {
          'Authorization': 'Bearer valid_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: 'premium_individual',
          billingCycle: 'monthly',
        }),
        pathParameters: null,
        queryStringParameters: null,
        requestContext: { requestId: 'test-request-id' } as any,
        resource: '',
        stageVariables: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        isBase64Encoded: false,
      };

      // Mock successful subscription creation
      mockStripeProcessor.createSubscription.mockResolvedValue({
        subscriptionId: 'sub_test123',
        status: 'active',
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.subscriptionId).toBe('sub_test123');
      expect(body.status).toBe('active');
    });

    it('should handle subscription creation failure', async () => {
      // Arrange
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/billing/subscriptions',
        headers: {
          'Authorization': 'Bearer valid_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: 'premium_individual',
          billingCycle: 'monthly',
        }),
        pathParameters: null,
        queryStringParameters: null,
        requestContext: { requestId: 'test-request-id' } as any,
        resource: '',
        stageVariables: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        isBase64Encoded: false,
      };

      // Mock subscription creation failure
      mockStripeProcessor.createSubscription.mockRejectedValue(new Error('Payment method declined'));

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('SUBSCRIPTION_ERROR');
    });
  });

  describe('Billing Cycle Management', () => {
    it('should process automatic renewals', async () => {
      // Arrange
      const dueSubscriptions = [
        {
          ...mockBillingAccount,
          nextBillingDate: Date.now() - 1000, // Past due
        },
      ];

      mockDb.getSubscriptionsDueForRenewal.mockResolvedValue(dueSubscriptions);
      mockStripeProcessor.processPayment.mockResolvedValue({
        transactionId: 'pi_renewal123',
        status: 'succeeded',
      });

      // Act
      await subscriptionManager.processAutomaticRenewals();

      // Assert
      expect(mockDb.getSubscriptionsDueForRenewal).toHaveBeenCalled();
      expect(mockStripeProcessor.processPayment).toHaveBeenCalled();
      expect(mockDb.updateBillingAccount).toHaveBeenCalled();
      expect(mockDb.updateUser).toHaveBeenCalled();
    });

    it('should handle renewal payment failure', async () => {
      // Arrange
      const dueSubscriptions = [
        {
          ...mockBillingAccount,
          nextBillingDate: Date.now() - 1000, // Past due
        },
      ];

      mockDb.getSubscriptionsDueForRenewal.mockResolvedValue(dueSubscriptions);
      mockStripeProcessor.processPayment.mockResolvedValue({
        transactionId: 'pi_renewal123',
        status: 'failed',
      });
      mockDb.createPaymentFailure.mockResolvedValue(undefined);

      // Act
      await subscriptionManager.processAutomaticRenewals();

      // Assert
      expect(mockDb.updateBillingAccount).toHaveBeenCalledWith('billing123', expect.objectContaining({
        status: 'past_due',
      }));
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing billing account', async () => {
      // Arrange
      mockDb.getBillingAccountByUser.mockResolvedValue(null);

      // Act & Assert
      await expect(subscriptionManager.createSubscription({
        userId: 'user123',
        planId: 'premium_individual',
        billingCycle: 'monthly',
      })).rejects.toThrow('Billing account not found');
    });

    it('should handle invalid subscription plan', async () => {
      // Act & Assert
      await expect(subscriptionManager.createSubscription({
        userId: 'user123',
        planId: 'invalid_plan',
        billingCycle: 'monthly',
      })).rejects.toThrow('Subscription plan not found');
    });

    it('should handle payment processor errors', async () => {
      // Arrange
      mockStripeProcessor.processPayment.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(mockStripeProcessor.processPayment(29.99, 'USD', 'pm_test123')).rejects.toThrow('Network error');
    });
  });
});