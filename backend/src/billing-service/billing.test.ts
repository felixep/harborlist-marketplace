/**
 * @fileoverview Unit tests for billing service
 * 
 * Tests billing account management, payment processing,
 * subscription management, and transaction handling.
 */

import { handler } from './index';
import { db } from '../shared/database';
import { APIGatewayProxyEvent } from 'aws-lambda';

// Mock the database service
jest.mock('../shared/database');
const mockDb = db as jest.Mocked<typeof db>;

// Mock the utils
jest.mock('../shared/utils', () => ({
  createResponse: jest.fn((statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })),
  createErrorResponse: jest.fn((statusCode, code, message, requestId) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: { code, message, requestId } }),
  })),
  parseBody: jest.fn((event) => JSON.parse(event.body || '{}')),
  getUserId: jest.fn(() => 'test-user-123'),
  generateId: jest.fn(() => 'test-id-123'),
  validateRequired: jest.fn(),
  sanitizeString: jest.fn((str) => str),
}));

describe('Billing Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Billing Account Management', () => {
    test('should create billing account successfully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/accounts',
        body: JSON.stringify({
          plan: 'premium_individual',
          billingCycle: 'monthly',
          paymentMethod: {
            type: 'card',
            cardNumber: '4242424242424242',
            expiryMonth: 12,
            expiryYear: 2025,
            cvv: '123'
          },
          billingAddress: {
            street: '123 Main St',
            city: 'Miami',
            state: 'FL',
            zipCode: '33101',
            country: 'US'
          }
        }),
        requestContext: { requestId: 'test-request' } as any,
        pathParameters: null,
      };

      mockDb.getUser.mockResolvedValue({
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User'
      } as any);
      mockDb.createBillingAccount.mockResolvedValue();
      mockDb.updateUser.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(201);
      expect(mockDb.createBillingAccount).toHaveBeenCalled();
      expect(mockDb.updateUser).toHaveBeenCalled();
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.plan).toBe('premium_individual');
      expect(responseBody.message).toContain('created successfully');
    });

    test('should get billing account successfully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/billing/accounts/test-user-123',
        pathParameters: { userId: 'test-user-123' },
        requestContext: { requestId: 'test-request' } as any,
      };

      const mockBillingAccount = {
        billingId: 'billing-123',
        userId: 'test-user-123',
        plan: 'premium_individual',
        amount: 29.99,
        currency: 'USD',
        status: 'active'
      };

      mockDb.getBillingAccountByUser.mockResolvedValue(mockBillingAccount as any);

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.billingAccount.plan).toBe('premium_individual');
      expect(responseBody.billingAccount.paymentMethodId).toBeUndefined(); // Should be removed for security
    });

    test('should return 404 for non-existent billing account', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/billing/accounts/non-existent-user',
        pathParameters: { userId: 'non-existent-user' },
        requestContext: { requestId: 'test-request' } as any,
      };

      mockDb.getBillingAccountByUser.mockResolvedValue(null);

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(404);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('NOT_FOUND');
    });

    test('should update billing account successfully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'PUT',
        path: '/billing/accounts/billing-123',
        pathParameters: { billingId: 'billing-123' },
        body: JSON.stringify({
          plan: 'premium_dealer'
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      const mockBillingAccount = {
        billingId: 'billing-123',
        userId: 'test-user-123',
        plan: 'premium_individual',
        amount: 29.99,
        currency: 'USD',
        status: 'active'
      };

      mockDb.getBillingAccount.mockResolvedValue(mockBillingAccount as any);
      mockDb.updateBillingAccount.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      expect(mockDb.updateBillingAccount).toHaveBeenCalledWith('billing-123', expect.objectContaining({
        plan: 'premium_dealer',
        amount: 99.99, // Should recalculate pricing
      }));
    });

    test('should prevent unauthorized billing account updates', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'PUT',
        path: '/billing/accounts/billing-123',
        pathParameters: { billingId: 'billing-123' },
        body: JSON.stringify({
          plan: 'premium_dealer'
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      const mockBillingAccount = {
        billingId: 'billing-123',
        userId: 'different-user',
        plan: 'premium_individual',
        amount: 29.99,
        currency: 'USD',
        status: 'active'
      };

      mockDb.getBillingAccount.mockResolvedValue(mockBillingAccount as any);

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(403);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Payment Processing', () => {
    test('should process payment successfully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/transactions',
        body: JSON.stringify({
          amount: 100.00,
          currency: 'USD',
          type: 'payment',
          description: 'Test payment',
          listingId: 'listing-123'
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      const mockBillingAccount = {
        billingId: 'billing-123',
        userId: 'test-user-123',
        paymentMethodId: 'pm_123',
        paymentHistory: []
      };

      mockDb.getBillingAccountByUser.mockResolvedValue(mockBillingAccount as any);
      mockDb.createTransaction.mockResolvedValue();
      mockDb.updateBillingAccount.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      expect(mockDb.createTransaction).toHaveBeenCalled();
      expect(mockDb.updateBillingAccount).toHaveBeenCalled();
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.amount).toBe(100.00);
      expect(responseBody.currency).toBe('USD');
    });

    test('should handle payment failure', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/transactions',
        body: JSON.stringify({
          amount: 100.00,
          currency: 'USD',
          type: 'payment',
          description: 'Test payment that will fail'
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      const mockBillingAccount = {
        billingId: 'billing-123',
        userId: 'test-user-123',
        paymentMethodId: 'pm_123',
        paymentHistory: []
      };

      mockDb.getBillingAccountByUser.mockResolvedValue(mockBillingAccount as any);
      mockDb.createTransaction.mockResolvedValue();
      mockDb.updateBillingAccount.mockResolvedValue();

      // Mock payment processor to simulate failure
      jest.spyOn(Math, 'random').mockReturnValue(0.05); // Force failure (< 0.1)

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.status).toBe('failed');
      expect(responseBody.message).toContain('failed');

      // Restore Math.random
      jest.spyOn(Math, 'random').mockRestore();
    });

    test('should require billing account for payment', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/transactions',
        body: JSON.stringify({
          amount: 100.00,
          currency: 'USD',
          type: 'payment',
          description: 'Test payment'
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      mockDb.getBillingAccountByUser.mockResolvedValue(null);

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(404);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('BILLING_ACCOUNT_NOT_FOUND');
    });
  });

  describe('Subscription Management', () => {
    test('should create subscription successfully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/subscriptions',
        body: JSON.stringify({
          plan: 'premium_individual',
          billingCycle: 'monthly'
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      const mockBillingAccount = {
        billingId: 'billing-123',
        userId: 'test-user-123',
        customerId: 'cus_123',
        paymentMethodId: 'pm_123'
      };

      mockDb.getBillingAccountByUser.mockResolvedValue(mockBillingAccount as any);
      mockDb.updateBillingAccount.mockResolvedValue();
      mockDb.updateUser.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(201);
      expect(mockDb.updateBillingAccount).toHaveBeenCalled();
      expect(mockDb.updateUser).toHaveBeenCalled();
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.plan).toBe('premium_individual');
      expect(responseBody.billingCycle).toBe('monthly');
      expect(responseBody.amount).toBe(29.99);
    });

    test('should cancel subscription successfully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'DELETE',
        path: '/billing/subscriptions/sub_123',
        pathParameters: { subscriptionId: 'sub_123' },
        requestContext: { requestId: 'test-request' } as any,
      };

      const mockBillingAccount = {
        billingId: 'billing-123',
        userId: 'test-user-123',
        subscriptionId: 'sub_123'
      };

      mockDb.getBillingAccountByUser.mockResolvedValue(mockBillingAccount as any);
      mockDb.updateBillingAccount.mockResolvedValue();
      mockDb.updateUser.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      expect(mockDb.updateBillingAccount).toHaveBeenCalledWith('billing-123', expect.objectContaining({
        status: 'canceled'
      }));
      expect(mockDb.updateUser).toHaveBeenCalledWith('test-user-123', expect.objectContaining({
        premiumActive: false
      }));
    });
  });

  describe('Transaction History', () => {
    test('should get transaction history successfully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/billing/transactions',
        queryStringParameters: {
          limit: '10',
          type: 'payment',
          status: 'completed'
        },
        requestContext: { requestId: 'test-request' } as any,
      };

      const mockTransactions = [
        {
          transactionId: 'txn_1',
          type: 'payment',
          amount: 29.99,
          currency: 'USD',
          status: 'completed'
        },
        {
          transactionId: 'txn_2',
          type: 'payment',
          amount: 29.99,
          currency: 'USD',
          status: 'completed'
        }
      ];

      mockDb.getTransactionHistoryWithFilters.mockResolvedValue({
        transactions: mockTransactions as any,
        total: 2
      });

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.transactions).toHaveLength(2);
      expect(responseBody.total).toBe(2);
    });
  });

  describe('Refund Processing', () => {
    test('should process refund successfully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/refunds',
        body: JSON.stringify({
          transactionId: 'txn_123',
          amount: 50.00,
          reason: 'Customer requested refund'
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      const mockOriginalTransaction = {
        transactionId: 'txn_123',
        amount: 100.00,
        currency: 'USD',
        userId: 'test-user-123',
        processorTransactionId: 'pi_123'
      };

      mockDb.getTransaction.mockResolvedValue(mockOriginalTransaction as any);
      mockDb.createTransaction.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      expect(mockDb.createTransaction).toHaveBeenCalled();
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.amount).toBe(50.00);
      expect(responseBody.message).toContain('successfully');
    });

    test('should reject refund amount exceeding original transaction', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/refunds',
        body: JSON.stringify({
          transactionId: 'txn_123',
          amount: 150.00, // More than original
          reason: 'Customer requested refund'
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      const mockOriginalTransaction = {
        transactionId: 'txn_123',
        amount: 100.00,
        currency: 'USD',
        userId: 'test-user-123',
        processorTransactionId: 'pi_123'
      };

      mockDb.getTransaction.mockResolvedValue(mockOriginalTransaction as any);

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('INVALID_REFUND_AMOUNT');
    });
  });

  describe('Membership Management', () => {
    test('should upgrade membership with prorated billing', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/memberships/upgrade',
        body: JSON.stringify({
          newPlan: 'premium_dealer',
          billingCycle: 'monthly'
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      const mockBillingAccount = {
        billingId: 'billing-123',
        userId: 'test-user-123',
        plan: 'premium_individual',
        amount: 29.99,
        currency: 'USD',
        paymentMethodId: 'pm_123',
        nextBillingDate: Date.now() + (15 * 24 * 60 * 60 * 1000) // 15 days from now
      };

      mockDb.getBillingAccountByUser.mockResolvedValue(mockBillingAccount as any);
      mockDb.updateBillingAccount.mockResolvedValue();
      mockDb.updateUser.mockResolvedValue();
      mockDb.createTransaction.mockResolvedValue();

      // Mock payment processor to succeed
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5); // Force success (> 0.1)

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.newPlan).toBe('premium_dealer');
      expect(responseBody.proratedAmount).toBeGreaterThan(0);
      expect(responseBody.features).toContain('dealer_badge');
      expect(mockDb.updateBillingAccount).toHaveBeenCalled();
      expect(mockDb.updateUser).toHaveBeenCalled();

      // Restore Math.random
      randomSpy.mockRestore();
    });

    test('should reject invalid upgrade (same or lower tier)', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/memberships/upgrade',
        body: JSON.stringify({
          newPlan: 'basic'
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      const mockBillingAccount = {
        billingId: 'billing-123',
        userId: 'test-user-123',
        plan: 'premium_individual',
        amount: 29.99,
        currency: 'USD'
      };

      mockDb.getBillingAccountByUser.mockResolvedValue(mockBillingAccount as any);

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('INVALID_UPGRADE');
    });

    test('should downgrade membership immediately with refund', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/memberships/downgrade',
        body: JSON.stringify({
          newPlan: 'basic',
          effectiveDate: 'immediate'
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      const mockBillingAccount = {
        billingId: 'billing-123',
        userId: 'test-user-123',
        plan: 'premium_individual',
        amount: 29.99,
        currency: 'USD',
        nextBillingDate: Date.now() + (20 * 24 * 60 * 60 * 1000) // 20 days from now
      };

      mockDb.getBillingAccountByUser.mockResolvedValue(mockBillingAccount as any);
      mockDb.updateBillingAccount.mockResolvedValue();
      mockDb.updateUser.mockResolvedValue();
      mockDb.createTransaction.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.newPlan).toBe('basic');
      expect(responseBody.effectiveDate).toBe('immediate');
      expect(responseBody.refundAmount).toBeGreaterThan(0);
      expect(mockDb.createTransaction).toHaveBeenCalled(); // Refund transaction
    });

    test('should schedule downgrade for next billing cycle', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/memberships/downgrade',
        body: JSON.stringify({
          newPlan: 'premium_individual',
          effectiveDate: 'next_billing_cycle'
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      const mockBillingAccount = {
        billingId: 'billing-123',
        userId: 'test-user-123',
        plan: 'premium_dealer',
        amount: 99.99,
        currency: 'USD',
        nextBillingDate: Date.now() + (25 * 24 * 60 * 60 * 1000) // 25 days from now
      };

      mockDb.getBillingAccountByUser.mockResolvedValue(mockBillingAccount as any);
      mockDb.updateBillingAccount.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.newPlan).toBe('premium_individual');
      expect(responseBody.currentPlan).toBe('premium_dealer');
      expect(responseBody.effectiveDate).toBeDefined();
      expect(mockDb.updateBillingAccount).toHaveBeenCalledWith('billing-123', expect.objectContaining({
        metadata: expect.objectContaining({
          pendingDowngrade: expect.any(Object)
        })
      }));
    });

    test('should renew membership successfully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/memberships/renew',
        body: JSON.stringify({
          billingCycle: 'yearly'
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      const mockBillingAccount = {
        billingId: 'billing-123',
        userId: 'test-user-123',
        plan: 'premium_individual',
        amount: 29.99,
        currency: 'USD',
        paymentMethodId: 'pm_123'
      };

      mockDb.getBillingAccountByUser.mockResolvedValue(mockBillingAccount as any);
      mockDb.updateBillingAccount.mockResolvedValue();
      mockDb.updateUser.mockResolvedValue();
      mockDb.createTransaction.mockResolvedValue();

      // Mock payment processor to succeed
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5); // Force success (> 0.1)

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.plan).toBe('premium_individual');
      expect(responseBody.amount).toBe(299.99); // Yearly pricing
      expect(responseBody.nextBillingDate).toBeDefined();
      expect(mockDb.createTransaction).toHaveBeenCalled();
      expect(mockDb.updateBillingAccount).toHaveBeenCalled();
      expect(mockDb.updateUser).toHaveBeenCalled();

      // Restore Math.random
      randomSpy.mockRestore();
    });

    test('should expire membership and downgrade to basic', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/memberships/expire',
        body: JSON.stringify({}),
        requestContext: { requestId: 'test-request' } as any,
      };

      const mockBillingAccount = {
        billingId: 'billing-123',
        userId: 'test-user-123',
        plan: 'premium_individual',
        amount: 29.99,
        currency: 'USD',
        nextBillingDate: Date.now() - (5 * 24 * 60 * 60 * 1000) // 5 days ago (expired)
      };

      mockDb.getBillingAccountByUser.mockResolvedValue(mockBillingAccount as any);
      mockDb.updateBillingAccount.mockResolvedValue();
      mockDb.updateUser.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.newPlan).toBe('basic');
      expect(responseBody.features).toContain('basic_listing_creation');
      expect(mockDb.updateBillingAccount).toHaveBeenCalledWith('billing-123', expect.objectContaining({
        plan: 'basic',
        status: 'canceled'
      }));
      expect(mockDb.updateUser).toHaveBeenCalledWith('test-user-123', expect.objectContaining({
        premiumActive: false
      }));
    });

    test('should reject expiring non-expired membership', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/memberships/expire',
        body: JSON.stringify({}),
        requestContext: { requestId: 'test-request' } as any,
      };

      const mockBillingAccount = {
        billingId: 'billing-123',
        userId: 'test-user-123',
        plan: 'premium_individual',
        amount: 29.99,
        currency: 'USD',
        nextBillingDate: Date.now() + (10 * 24 * 60 * 60 * 1000) // 10 days from now (not expired)
      };

      mockDb.getBillingAccountByUser.mockResolvedValue(mockBillingAccount as any);

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('MEMBERSHIP_NOT_EXPIRED');
    });
  });

  describe('Financial Reporting and Analytics', () => {
    test('should generate revenue report successfully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/reports/revenue',
        queryStringParameters: {
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-01-31T23:59:59.999Z',
          groupBy: 'day'
        },
        requestContext: { requestId: 'test-request' } as any,
      };

      mockDb.getFinancialReportingData.mockResolvedValue({
        totalRevenue: 5000,
        totalTransactions: 50,
        breakdown: []
      } as any);

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.report.title).toBe('Revenue Report');
      expect(responseBody.report.metrics.totalRevenue).toBeGreaterThan(0);
      expect(responseBody.report.metrics.revenueByType).toBeDefined();
      expect(responseBody.report.metrics.revenueByPeriod).toBeDefined();
      expect(responseBody.report.dateRange.startDate).toBe('2024-01-01T00:00:00.000Z');
    });

    test('should generate commission report successfully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/reports/commissions',
        queryStringParameters: {
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-01-31T23:59:59.999Z',
          commissionRate: '0.05'
        },
        requestContext: { requestId: 'test-request' } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.report.title).toBe('Commission Report');
      expect(responseBody.report.summary.totalCommissionEarned).toBeGreaterThan(0);
      expect(responseBody.report.summary.totalSalesVolume).toBeGreaterThan(0);
      expect(responseBody.report.breakdown.byPeriod).toBeDefined();
      expect(responseBody.report.breakdown.topSellers).toBeDefined();
      expect(responseBody.report.payouts.scheduled).toBeDefined();
    });

    test('should get financial dashboard data successfully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/analytics/dashboard',
        queryStringParameters: {
          timeframe: '30d',
          currency: 'USD'
        },
        requestContext: { requestId: 'test-request' } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.dashboard.title).toBe('Financial Dashboard');
      expect(responseBody.dashboard.timeframe).toBe('30d');
      expect(responseBody.dashboard.currency).toBe('USD');
      expect(responseBody.dashboard.data.summary).toBeDefined();
      expect(responseBody.dashboard.data.revenueChart).toBeDefined();
      expect(responseBody.dashboard.data.subscriptionChart).toBeDefined();
      expect(responseBody.dashboard.data.recentTransactions).toBeDefined();
      expect(responseBody.dashboard.data.forecasting).toBeDefined();
    });

    test('should handle different timeframes for dashboard', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/analytics/dashboard',
        queryStringParameters: {
          timeframe: '7d',
          currency: 'EUR'
        },
        requestContext: { requestId: 'test-request' } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.dashboard.timeframe).toBe('7d');
      expect(responseBody.dashboard.currency).toBe('EUR');
      expect(responseBody.dashboard.data.summary.totalRevenue).toBeGreaterThan(0);
    });

    test('should include revenue growth and conversion metrics', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/reports/revenue',
        queryStringParameters: {
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-01-31T23:59:59.999Z'
        },
        requestContext: { requestId: 'test-request' } as any,
      };

      mockDb.getFinancialReportingData.mockResolvedValue({} as any);

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.report.metrics.conversionMetrics).toBeDefined();
      expect(responseBody.report.metrics.conversionMetrics.subscriptionConversionRate).toBeGreaterThan(0);
      expect(responseBody.report.metrics.conversionMetrics.churnRate).toBeGreaterThan(0);
      expect(responseBody.report.metrics.topPaymentMethods).toBeDefined();
    });

    test('should include commission payout scheduling', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/reports/commissions',
        queryStringParameters: {
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-01-31T23:59:59.999Z'
        },
        requestContext: { requestId: 'test-request' } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.report.payouts.scheduled).toBeDefined();
      expect(responseBody.report.payouts.totalScheduled).toBeGreaterThan(0);
      expect(responseBody.report.breakdown.topSellers).toBeDefined();
      expect(responseBody.report.breakdown.byCategory).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing required fields', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/billing/accounts',
        body: JSON.stringify({
          plan: 'premium_individual'
          // Missing required fields
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      // Mock validateRequired to throw error
      const { validateRequired } = require('../shared/utils');
      validateRequired.mockImplementation(() => {
        throw new Error('Missing required fields: billingCycle, paymentMethod, billingAddress');
      });

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('VALIDATION_ERROR');
    });

    test('should handle database errors gracefully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/billing/accounts/test-user-123',
        pathParameters: { userId: 'test-user-123' },
        requestContext: { requestId: 'test-request' } as any,
      };

      mockDb.getBillingAccountByUser.mockRejectedValue(new Error('Database connection failed'));

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('BILLING_ERROR');
    });

    test('should handle invalid endpoints', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/billing/invalid-endpoint',
        requestContext: { requestId: 'test-request' } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(404);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('NOT_FOUND');
    });

    test('should handle unsupported HTTP methods', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'PATCH',
        path: '/billing/accounts',
        requestContext: { requestId: 'test-request' } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(405);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('METHOD_NOT_ALLOWED');
    });
  });
});