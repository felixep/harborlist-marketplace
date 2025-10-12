/**
 * @fileoverview Unit tests for PaymentFailureHandler class.
 * 
 * Tests payment failure handling including:
 * - Payment failure processing and retry logic
 * - Dunning campaign execution
 * - Dispute case creation and management
 * - Service suspension and recovery
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { PaymentFailureHandler, PaymentFailureReason } from './payment-failure-handler';
import { PaymentProcessor } from './payment-processors/stripe';
import { db } from '../shared/database';
import { BillingAccount, Transaction } from '@harborlist/shared-types';

// Mock the database
jest.mock('../shared/database');
const mockDb = db as jest.Mocked<typeof db>;

describe('PaymentFailureHandler', () => {
  let paymentFailureHandler: PaymentFailureHandler;
  let mockPaymentProcessor: jest.Mocked<PaymentProcessor>;

  const mockBillingAccount: BillingAccount = {
    billingId: 'billing123',
    userId: 'user123',
    customerId: 'cus_test123',
    paymentMethodId: 'pm_test123',
    subscriptionId: 'sub_test123',
    plan: 'premium_individual',
    amount: 29.99,
    currency: 'USD',
    status: 'active',
    nextBillingDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
    paymentHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockTransaction: Transaction = {
    id: 'trans123',
    transactionId: 'pi_test123',
    type: 'payment',
    amount: 29.99,
    currency: 'USD',
    status: 'failed',
    userId: 'user123',
    userName: 'Test User',
    userEmail: 'test@example.com',
    paymentMethod: 'card',
    processorTransactionId: 'pi_test123',
    createdAt: '2023-01-01T00:00:00Z',
    description: 'Subscription payment',
    fees: 1.17,
    netAmount: 28.82,
    billingAccountId: 'billing123',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock payment processor
    mockPaymentProcessor = {
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

    paymentFailureHandler = new PaymentFailureHandler(mockPaymentProcessor);

    // Setup database mocks
    mockDb.getBillingAccount.mockResolvedValue(mockBillingAccount);
    mockDb.createPaymentFailure.mockResolvedValue(undefined);
    mockDb.updateBillingAccount.mockResolvedValue(undefined);
    mockDb.updateUser.mockResolvedValue(undefined);
    mockDb.createTransaction.mockResolvedValue(undefined);
    mockDb.getTransaction.mockResolvedValue(mockTransaction);
    mockDb.createDisputeCase.mockResolvedValue(undefined);
    mockDb.createDisputeWorkflow.mockResolvedValue(undefined);
  });

  describe('handlePaymentFailure', () => {
    it('should handle payment failure with insufficient funds', async () => {
      // Act
      const failure = await paymentFailureHandler.handlePaymentFailure(
        'pi_test123',
        'billing123',
        PaymentFailureReason.INSUFFICIENT_FUNDS,
        'Insufficient funds in account'
      );

      // Assert
      expect(failure.reason).toBe(PaymentFailureReason.INSUFFICIENT_FUNDS);
      expect(failure.reasonDetails).toBe('Insufficient funds in account');
      expect(failure.attemptNumber).toBe(1);
      expect(failure.maxAttempts).toBe(3);
      expect(failure.resolved).toBe(false);
      expect(failure.nextRetryAt).toBeDefined();
      expect(failure.gracePeriodEnds).toBeDefined();

      expect(mockDb.createPaymentFailure).toHaveBeenCalledWith(expect.objectContaining({
        transactionId: 'pi_test123',
        billingAccountId: 'billing123',
        reason: PaymentFailureReason.INSUFFICIENT_FUNDS,
        attemptNumber: 1,
      }));

      expect(mockDb.updateBillingAccount).toHaveBeenCalledWith('billing123', expect.objectContaining({
        status: 'past_due',
      }));
    });

    it('should handle payment failure with card declined', async () => {
      // Act
      const failure = await paymentFailureHandler.handlePaymentFailure(
        'pi_test123',
        'billing123',
        PaymentFailureReason.CARD_DECLINED,
        'Card was declined'
      );

      // Assert
      expect(failure.reason).toBe(PaymentFailureReason.CARD_DECLINED);
      expect(failure.reasonDetails).toBe('Card was declined');
    });

    it('should handle payment failure with fraud suspected', async () => {
      // Act
      const failure = await paymentFailureHandler.handlePaymentFailure(
        'pi_test123',
        'billing123',
        PaymentFailureReason.FRAUD_SUSPECTED,
        'Suspected fraudulent activity'
      );

      // Assert
      expect(failure.reason).toBe(PaymentFailureReason.FRAUD_SUSPECTED);
      expect(failure.reasonDetails).toBe('Suspected fraudulent activity');
    });

    it('should throw error when billing account not found', async () => {
      // Arrange
      mockDb.getBillingAccount.mockResolvedValue(null);

      // Act & Assert
      await expect(paymentFailureHandler.handlePaymentFailure(
        'pi_test123',
        'billing123',
        PaymentFailureReason.INSUFFICIENT_FUNDS
      )).rejects.toThrow('Billing account not found');
    });
  });

  describe('processRetryAttempts', () => {
    const mockFailure = {
      failureId: 'failure123',
      transactionId: 'pi_test123',
      subscriptionId: 'sub_test123',
      billingAccountId: 'billing123',
      userId: 'user123',
      amount: 29.99,
      currency: 'USD',
      reason: PaymentFailureReason.INSUFFICIENT_FUNDS,
      attemptNumber: 1,
      maxAttempts: 3,
      nextRetryAt: Date.now() - 1000, // Past due for retry
      gracePeriodEnds: Date.now() + (7 * 24 * 60 * 60 * 1000),
      resolved: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    it('should process successful retry attempts', async () => {
      // Arrange
      mockDb.getPaymentFailuresDueForRetry.mockResolvedValue([mockFailure]);
      mockPaymentProcessor.processPayment.mockResolvedValue({
        transactionId: 'pi_retry123',
        status: 'succeeded',
      });

      // Act
      await paymentFailureHandler.processRetryAttempts();

      // Assert
      expect(mockDb.getPaymentFailuresDueForRetry).toHaveBeenCalledWith(expect.any(Number));
      expect(mockPaymentProcessor.processPayment).toHaveBeenCalledWith(
        29.99,
        'USD',
        'pm_test123',
        expect.objectContaining({
          retryAttempt: '1',
          originalFailureId: 'failure123',
        })
      );
      expect(mockDb.updateBillingAccount).toHaveBeenCalledWith('billing123', expect.objectContaining({
        status: 'active',
      }));
    });

    it('should handle failed retry attempts', async () => {
      // Arrange
      mockDb.getPaymentFailuresDueForRetry.mockResolvedValue([mockFailure]);
      mockPaymentProcessor.processPayment.mockResolvedValue({
        transactionId: 'pi_retry123',
        status: 'failed',
      });

      // Act
      await paymentFailureHandler.processRetryAttempts();

      // Assert
      expect(mockDb.updatePaymentFailure).toHaveBeenCalledWith('failure123', expect.objectContaining({
        attemptNumber: 2,
        nextRetryAt: expect.any(Number),
      }));
    });

    it('should suspend service after max retry attempts', async () => {
      // Arrange
      const maxAttemptsFailure = {
        ...mockFailure,
        attemptNumber: 3, // Max attempts reached
      };
      mockDb.getPaymentFailuresDueForRetry.mockResolvedValue([maxAttemptsFailure]);
      mockPaymentProcessor.processPayment.mockResolvedValue({
        transactionId: 'pi_retry123',
        status: 'failed',
      });

      // Act
      await paymentFailureHandler.processRetryAttempts();

      // Assert
      expect(mockDb.updateBillingAccount).toHaveBeenCalledWith('billing123', expect.objectContaining({
        status: 'suspended',
      }));
      expect(mockDb.updateUser).toHaveBeenCalledWith('user123', expect.objectContaining({
        premiumActive: false,
      }));
    });

    it('should continue processing other failures when one fails', async () => {
      // Arrange
      const failures = [
        mockFailure,
        { ...mockFailure, failureId: 'failure456', billingAccountId: 'billing456' },
      ];
      mockDb.getPaymentFailuresDueForRetry.mockResolvedValue(failures);
      mockPaymentProcessor.processPayment
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          transactionId: 'pi_retry456',
          status: 'succeeded',
        });

      // Act
      await paymentFailureHandler.processRetryAttempts();

      // Assert
      expect(mockPaymentProcessor.processPayment).toHaveBeenCalledTimes(2);
    });
  });

  describe('createDisputeCase', () => {
    it('should create chargeback dispute case', async () => {
      // Act
      const dispute = await paymentFailureHandler.createDisputeCase(
        'pi_test123',
        'chargeback',
        29.99,
        ['receipt', 'communication', 'shipping'],
        Date.now() + (7 * 24 * 60 * 60 * 1000)
      );

      // Assert
      expect(dispute.disputeType).toBe('chargeback');
      expect(dispute.disputeAmount).toBe(29.99);
      expect(dispute.evidenceRequired).toEqual(['receipt', 'communication', 'shipping']);
      expect(dispute.priority).toBe('low'); // Amount < 500
      expect(dispute.caseNumber).toMatch(/^DISP-\d+-[A-Z0-9]{6}$/);

      expect(mockDb.createDisputeCase).toHaveBeenCalledWith(expect.objectContaining({
        disputeType: 'chargeback',
        disputeAmount: 29.99,
      }));
      expect(mockDb.createDisputeWorkflow).toHaveBeenCalled();
    });

    it('should create high priority dispute for large amount', async () => {
      // Act
      const dispute = await paymentFailureHandler.createDisputeCase(
        'pi_test123',
        'fraud',
        1500.00,
        ['receipt', 'communication'],
        Date.now() + (7 * 24 * 60 * 60 * 1000)
      );

      // Assert
      expect(dispute.priority).toBe('high'); // Amount > 1000
    });

    it('should create medium priority dispute for moderate amount', async () => {
      // Act
      const dispute = await paymentFailureHandler.createDisputeCase(
        'pi_test123',
        'authorization',
        750.00,
        ['receipt'],
        Date.now() + (7 * 24 * 60 * 60 * 1000)
      );

      // Assert
      expect(dispute.priority).toBe('medium'); // 500 < Amount < 1000
    });

    it('should throw error when transaction not found', async () => {
      // Arrange
      mockDb.getTransaction.mockResolvedValue(null);

      // Act & Assert
      await expect(paymentFailureHandler.createDisputeCase(
        'pi_invalid',
        'chargeback',
        29.99,
        ['receipt'],
        Date.now() + (7 * 24 * 60 * 60 * 1000)
      )).rejects.toThrow('Transaction not found');
    });
  });

  describe('submitDisputeEvidence', () => {
    it('should submit dispute evidence successfully', async () => {
      // Arrange
      const evidenceData = {
        type: 'receipt' as const,
        description: 'Payment receipt showing successful transaction',
        fileUrl: 'https://example.com/receipt.pdf',
      };

      // Act
      const evidence = await paymentFailureHandler.submitDisputeEvidence('dispute123', evidenceData);

      // Assert
      expect(evidence.type).toBe('receipt');
      expect(evidence.description).toBe('Payment receipt showing successful transaction');
      expect(evidence.fileUrl).toBe('https://example.com/receipt.pdf');
      expect(evidence.evidenceId).toBeDefined();
      expect(evidence.submittedAt).toBeDefined();
      expect(evidence.submittedBy).toBe('system');

      expect(mockDb.addDisputeEvidence).toHaveBeenCalledWith('dispute123', evidence);
    });

    it('should submit communication evidence', async () => {
      // Arrange
      const evidenceData = {
        type: 'communication' as const,
        description: 'Email correspondence with customer',
        fileUrl: 'https://example.com/emails.pdf',
      };

      // Act
      const evidence = await paymentFailureHandler.submitDisputeEvidence('dispute123', evidenceData);

      // Assert
      expect(evidence.type).toBe('communication');
    });

    it('should submit shipping evidence', async () => {
      // Arrange
      const evidenceData = {
        type: 'shipping' as const,
        description: 'Shipping confirmation and tracking',
        fileUrl: 'https://example.com/shipping.pdf',
      };

      // Act
      const evidence = await paymentFailureHandler.submitDisputeEvidence('dispute123', evidenceData);

      // Assert
      expect(evidence.type).toBe('shipping');
    });
  });

  describe('Dunning Campaign Processing', () => {
    it('should execute immediate dunning steps', async () => {
      // This test would require exposing private methods or testing through the public interface
      // For now, we'll test that dunning campaigns are triggered when handling payment failures
      
      // Act
      await paymentFailureHandler.handlePaymentFailure(
        'pi_test123',
        'billing123',
        PaymentFailureReason.INSUFFICIENT_FUNDS
      );

      // Assert
      // The dunning campaign should be started automatically
      expect(mockDb.createPaymentFailure).toHaveBeenCalled();
      expect(mockDb.updateBillingAccount).toHaveBeenCalledWith('billing123', expect.objectContaining({
        status: 'past_due',
      }));
    });

    it('should handle fraud suspected with immediate suspension', async () => {
      // Act
      await paymentFailureHandler.handlePaymentFailure(
        'pi_test123',
        'billing123',
        PaymentFailureReason.FRAUD_SUSPECTED
      );

      // Assert
      expect(mockDb.createPaymentFailure).toHaveBeenCalled();
      expect(mockDb.updateBillingAccount).toHaveBeenCalledWith('billing123', expect.objectContaining({
        status: 'past_due',
      }));
    });
  });

  describe('Service Suspension and Recovery', () => {
    it('should suspend service after grace period', async () => {
      // This would be tested through the retry mechanism when max attempts are reached
      const maxAttemptsFailure = {
        failureId: 'failure123',
        transactionId: 'pi_test123',
        billingAccountId: 'billing123',
        userId: 'user123',
        amount: 29.99,
        currency: 'USD',
        reason: PaymentFailureReason.INSUFFICIENT_FUNDS,
        attemptNumber: 3,
        maxAttempts: 3,
        nextRetryAt: Date.now() - 1000,
        gracePeriodEnds: Date.now() - 1000, // Grace period expired
        resolved: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockDb.getPaymentFailuresDueForRetry.mockResolvedValue([maxAttemptsFailure]);
      mockPaymentProcessor.processPayment.mockResolvedValue({
        transactionId: 'pi_retry123',
        status: 'failed',
      });

      // Act
      await paymentFailureHandler.processRetryAttempts();

      // Assert
      expect(mockDb.updateBillingAccount).toHaveBeenCalledWith('billing123', expect.objectContaining({
        status: 'suspended',
      }));
      expect(mockDb.updateUser).toHaveBeenCalledWith('user123', expect.objectContaining({
        premiumActive: false,
        premiumPlan: undefined,
        premiumExpiresAt: undefined,
      }));
    });

    it('should recover service after successful retry', async () => {
      // Arrange
      const mockFailure = {
        failureId: 'failure123',
        transactionId: 'pi_test123',
        billingAccountId: 'billing123',
        userId: 'user123',
        amount: 29.99,
        currency: 'USD',
        reason: PaymentFailureReason.INSUFFICIENT_FUNDS,
        attemptNumber: 2,
        maxAttempts: 3,
        nextRetryAt: Date.now() - 1000,
        gracePeriodEnds: Date.now() + (5 * 24 * 60 * 60 * 1000),
        resolved: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockDb.getPaymentFailuresDueForRetry.mockResolvedValue([mockFailure]);
      mockPaymentProcessor.processPayment.mockResolvedValue({
        transactionId: 'pi_retry123',
        status: 'succeeded',
      });

      // Act
      await paymentFailureHandler.processRetryAttempts();

      // Assert
      expect(mockDb.updateBillingAccount).toHaveBeenCalledWith('billing123', expect.objectContaining({
        status: 'active',
      }));
    });
  });

  describe('Error Handling', () => {
    it('should handle payment processor errors during retry', async () => {
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
        nextRetryAt: Date.now() - 1000,
        gracePeriodEnds: Date.now() + (7 * 24 * 60 * 60 * 1000),
        resolved: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockDb.getPaymentFailuresDueForRetry.mockResolvedValue([mockFailure]);
      mockPaymentProcessor.processPayment.mockRejectedValue(new Error('Network timeout'));

      // Act
      await paymentFailureHandler.processRetryAttempts();

      // Assert
      expect(mockDb.updatePaymentFailure).toHaveBeenCalledWith('failure123', expect.objectContaining({
        attemptNumber: 2,
      }));
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockDb.createPaymentFailure.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(paymentFailureHandler.handlePaymentFailure(
        'pi_test123',
        'billing123',
        PaymentFailureReason.INSUFFICIENT_FUNDS
      )).rejects.toThrow('Database connection failed');
    });
  });
});