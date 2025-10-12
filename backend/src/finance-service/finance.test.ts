/**
 * @fileoverview Unit tests for finance calculator service
 * 
 * Tests core finance calculation functionality including:
 * - Loan payment calculations with various parameters
 * - Payment schedule generation and amortization
 * - Input validation and error handling
 * - Calculation saving and sharing functionality
 * - Multiple scenario comparisons
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './index';
import { db } from '../shared/database';
import { FinanceCalculation } from '@harborlist/shared-types';

// Mock the database module
jest.mock('../shared/database');
const mockDb = db as jest.Mocked<typeof db>;

// Mock the utils module
jest.mock('../shared/utils', () => ({
  createResponse: jest.fn((statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })),
  createErrorResponse: jest.fn((statusCode, code, message, requestId) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: { code, message, requestId } })
  })),
  parseBody: jest.fn((event) => JSON.parse(event.body || '{}')),
  getUserId: jest.fn(() => 'test-user-123'),
  generateId: jest.fn(() => 'test-id-123'),
  validateRequired: jest.fn(),
  sanitizeString: jest.fn((str) => str),
}));

describe('Finance Calculator Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /finance/calculate', () => {
    const mockEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'POST',
      path: '/finance/calculate',
      body: JSON.stringify({
        boatPrice: 100000,
        downPayment: 20000,
        interestRate: 6.5,
        termMonths: 240,
        includeSchedule: true
      }),
      requestContext: { requestId: 'test-request-123' } as any,
    };

    it('should calculate loan payment correctly', async () => {
      const result = await handler(mockEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      
      const response = JSON.parse(result.body);
      expect(response.calculation).toBeDefined();
      expect(response.calculation.loanAmount).toBe(80000);
      expect(response.calculation.monthlyPayment).toBeCloseTo(596.46, 2);
      expect(response.calculation.totalInterest).toBeCloseTo(63150.04, 2);
      expect(response.calculation.totalCost).toBeCloseTo(163150.04, 2);
    });

    it('should generate payment schedule when requested', async () => {
      const result = await handler(mockEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      
      const response = JSON.parse(result.body);
      expect(response.calculation.paymentSchedule).toBeDefined();
      expect(response.calculation.paymentSchedule).toHaveLength(240);
      
      // Check first payment
      const firstPayment = response.calculation.paymentSchedule[0];
      expect(firstPayment.paymentNumber).toBe(1);
      expect(firstPayment.interestAmount).toBeCloseTo(433.33, 2);
      expect(firstPayment.principalAmount).toBeCloseTo(163.13, 2);
      expect(firstPayment.totalPayment).toBeCloseTo(596.46, 2);
    });

    it('should handle zero interest rate correctly', async () => {
      const zeroInterestEvent = {
        ...mockEvent,
        body: JSON.stringify({
          boatPrice: 100000,
          downPayment: 20000,
          interestRate: 0,
          termMonths: 240
        })
      };

      const result = await handler(zeroInterestEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      
      const response = JSON.parse(result.body);
      expect(response.calculation.monthlyPayment).toBeCloseTo(333.33, 2);
      expect(response.calculation.totalInterest).toBe(0);
      expect(response.calculation.totalCost).toBe(100000);
    });

    it('should validate boat price range', async () => {
      const invalidPriceEvent = {
        ...mockEvent,
        body: JSON.stringify({
          boatPrice: 500, // Too low
          downPayment: 100,
          interestRate: 6.5,
          termMonths: 240
        })
      };

      const result = await handler(invalidPriceEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      
      const response = JSON.parse(result.body);
      expect(response.error.message).toContain('Boat price must be between $1,000 and $10,000,000');
    });

    it('should validate down payment range', async () => {
      const invalidDownPaymentEvent = {
        ...mockEvent,
        body: JSON.stringify({
          boatPrice: 100000,
          downPayment: 95000, // Too high (>90%)
          interestRate: 6.5,
          termMonths: 240
        })
      };

      const result = await handler(invalidDownPaymentEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      
      const response = JSON.parse(result.body);
      expect(response.error.message).toContain('Down payment must be between $0 and 90% of boat price');
    });

    it('should validate interest rate range', async () => {
      const invalidRateEvent = {
        ...mockEvent,
        body: JSON.stringify({
          boatPrice: 100000,
          downPayment: 20000,
          interestRate: 35, // Too high
          termMonths: 240
        })
      };

      const result = await handler(invalidRateEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      
      const response = JSON.parse(result.body);
      expect(response.error.message).toContain('Interest rate must be between 0% and 30%');
    });

    it('should validate loan term range', async () => {
      const invalidTermEvent = {
        ...mockEvent,
        body: JSON.stringify({
          boatPrice: 100000,
          downPayment: 20000,
          interestRate: 6.5,
          termMonths: 6 // Too short
        })
      };

      const result = await handler(invalidTermEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      
      const response = JSON.parse(result.body);
      expect(response.error.message).toContain('Loan term must be between 12 and 360 months');
    });
  });

  describe('POST /finance/calculate/scenarios', () => {
    const mockScenariosEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'POST',
      path: '/finance/calculate/scenarios',
      body: JSON.stringify({
        baseParams: {
          boatPrice: 100000,
          downPayment: 20000,
          interestRate: 6.5,
          termMonths: 240
        },
        scenarios: [
          { interestRate: 5.5 },
          { interestRate: 7.5 },
          { termMonths: 180 },
          { downPayment: 30000 }
        ],
        listingId: 'listing-123'
      }),
      requestContext: { requestId: 'test-request-123' } as any,
    };

    it('should calculate multiple scenarios correctly', async () => {
      const result = await handler(mockScenariosEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      
      const response = JSON.parse(result.body);
      expect(response.scenarios).toHaveLength(4);
      expect(response.scenarios[0].result.interestRate).toBe(5.5);
      expect(response.scenarios[1].result.interestRate).toBe(7.5);
      expect(response.scenarios[2].result.termMonths).toBe(180);
      expect(response.scenarios[3].result.downPayment).toBe(30000);
    });

    it('should limit scenarios to maximum of 10', async () => {
      const tooManyScenarios = Array(15).fill({ interestRate: 6.0 });
      const invalidEvent = {
        ...mockScenariosEvent,
        body: JSON.stringify({
          baseParams: {
            boatPrice: 100000,
            downPayment: 20000,
            interestRate: 6.5,
            termMonths: 240
          },
          scenarios: tooManyScenarios
        })
      };

      const result = await handler(invalidEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      
      const response = JSON.parse(result.body);
      expect(response.error.message).toContain('Maximum of 10 scenarios allowed');
    });
  });

  describe('POST /finance/calculate/save', () => {
    const mockSaveEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'POST',
      path: '/finance/calculate/save',
      body: JSON.stringify({
        boatPrice: 100000,
        downPayment: 20000,
        interestRate: 6.5,
        termMonths: 240,
        listingId: 'listing-123',
        calculationNotes: 'Test calculation',
        lenderInfo: {
          name: 'Test Bank',
          rate: 6.5,
          terms: '20 years'
        }
      }),
      requestContext: { requestId: 'test-request-123' } as any,
      headers: { Authorization: 'Bearer test-token' }
    };

    it('should save calculation for authenticated user', async () => {
      mockDb.createFinanceCalculation.mockResolvedValue();

      const result = await handler(mockSaveEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(201);
      expect(mockDb.createFinanceCalculation).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-123',
          saved: true,
          calculationNotes: 'Test calculation',
          lenderInfo: expect.objectContaining({
            name: 'Test Bank',
            rate: 6.5,
            terms: '20 years'
          })
        })
      );
    });
  });

  describe('GET /finance/calculations/{userId}', () => {
    const mockGetCalculationsEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'GET',
      path: '/finance/calculations/test-user-123',
      pathParameters: { userId: 'test-user-123' },
      queryStringParameters: { limit: '10' },
      requestContext: { requestId: 'test-request-123' } as any,
      headers: { Authorization: 'Bearer test-token' }
    };

    it('should return user calculations', async () => {
      const mockCalculations: FinanceCalculation[] = [
        {
          calculationId: 'calc-1',
          listingId: 'listing-123',
          userId: 'test-user-123',
          boatPrice: 100000,
          downPayment: 20000,
          loanAmount: 80000,
          interestRate: 6.5,
          termMonths: 240,
          monthlyPayment: 588.72,
          totalInterest: 61293.28,
          totalCost: 161293.28,
          saved: true,
          shared: false,
          createdAt: Date.now()
        }
      ];

      mockDb.getFinanceCalculationsByUser.mockResolvedValue({
        calculations: mockCalculations,
        lastKey: undefined
      });

      const result = await handler(mockGetCalculationsEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      
      const response = JSON.parse(result.body);
      expect(response.calculations).toHaveLength(1);
      expect(response.calculations[0].calculationId).toBe('calc-1');
    });

    it('should prevent access to other users calculations', async () => {
      const unauthorizedEvent = {
        ...mockGetCalculationsEvent,
        pathParameters: { userId: 'other-user-456' }
      };

      const result = await handler(unauthorizedEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(403);
      
      const response = JSON.parse(result.body);
      expect(response.error.message).toContain('You can only access your own calculations');
    });
  });

  describe('POST /finance/share/{calculationId}', () => {
    const mockShareEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'POST',
      path: '/finance/share/calc-123',
      pathParameters: { calculationId: 'calc-123' },
      requestContext: { requestId: 'test-request-123' } as any,
      headers: { Authorization: 'Bearer test-token' }
    };

    it('should generate share token for user calculation', async () => {
      const mockCalculation: FinanceCalculation = {
        calculationId: 'calc-123',
        listingId: 'listing-123',
        userId: 'test-user-123',
        boatPrice: 100000,
        downPayment: 20000,
        loanAmount: 80000,
        interestRate: 6.5,
        termMonths: 240,
        monthlyPayment: 588.72,
        totalInterest: 61293.28,
        totalCost: 161293.28,
        saved: true,
        shared: false,
        createdAt: Date.now()
      };

      mockDb.getFinanceCalculation.mockResolvedValue(mockCalculation);
      mockDb.updateFinanceCalculation.mockResolvedValue();

      const result = await handler(mockShareEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      
      const response = JSON.parse(result.body);
      expect(response.shareToken).toBeDefined();
      expect(response.shareUrl).toContain(response.shareToken);
      expect(mockDb.updateFinanceCalculation).toHaveBeenCalledWith(
        'calc-123',
        expect.objectContaining({
          shared: true,
          shareToken: expect.any(String)
        })
      );
    });
  });

  describe('GET /finance/rates/suggested', () => {
    const mockRatesEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'GET',
      path: '/finance/rates/suggested',
      queryStringParameters: {
        loanAmount: '80000',
        termMonths: '240'
      },
      requestContext: { requestId: 'test-request-123' } as any,
    };

    it('should return suggested interest rates', async () => {
      const result = await handler(mockRatesEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      
      const response = JSON.parse(result.body);
      expect(response.suggestedRates).toHaveLength(4);
      expect(response.suggestedRates[0]).toBeGreaterThan(0);
      expect(response.suggestedRates[3]).toBeGreaterThan(response.suggestedRates[0]);
    });

    it('should validate loan amount parameter', async () => {
      const invalidEvent = {
        ...mockRatesEvent,
        queryStringParameters: {
          loanAmount: '500', // Too low
          termMonths: '240'
        }
      };

      const result = await handler(invalidEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      
      const response = JSON.parse(result.body);
      expect(response.error.message).toContain('Valid loan amount is required (minimum $1,000)');
    });
  });

  describe('DELETE /finance/calculations/{calculationId}', () => {
    const mockDeleteEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'DELETE',
      path: '/finance/calculations/calc-123',
      pathParameters: { calculationId: 'calc-123' },
      requestContext: { requestId: 'test-request-123' } as any,
      headers: { Authorization: 'Bearer test-token' }
    };

    it('should delete user calculation', async () => {
      const mockCalculation: FinanceCalculation = {
        calculationId: 'calc-123',
        listingId: 'listing-123',
        userId: 'test-user-123',
        boatPrice: 100000,
        downPayment: 20000,
        loanAmount: 80000,
        interestRate: 6.5,
        termMonths: 240,
        monthlyPayment: 588.72,
        totalInterest: 61293.28,
        totalCost: 161293.28,
        saved: true,
        shared: false,
        createdAt: Date.now()
      };

      mockDb.getFinanceCalculation.mockResolvedValue(mockCalculation);
      mockDb.deleteFinanceCalculation.mockResolvedValue();

      const result = await handler(mockDeleteEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      expect(mockDb.deleteFinanceCalculation).toHaveBeenCalledWith('calc-123');
    });

    it('should prevent deletion of other users calculations', async () => {
      const mockCalculation: FinanceCalculation = {
        calculationId: 'calc-123',
        listingId: 'listing-123',
        userId: 'other-user-456', // Different user
        boatPrice: 100000,
        downPayment: 20000,
        loanAmount: 80000,
        interestRate: 6.5,
        termMonths: 240,
        monthlyPayment: 588.72,
        totalInterest: 61293.28,
        totalCost: 161293.28,
        saved: true,
        shared: false,
        createdAt: Date.now()
      };

      mockDb.getFinanceCalculation.mockResolvedValue(mockCalculation);

      const result = await handler(mockDeleteEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(403);
      
      const response = JSON.parse(result.body);
      expect(response.error.message).toContain('You can only delete your own calculations');
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported HTTP methods', async () => {
      const invalidMethodEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'PATCH',
        path: '/finance/calculate',
        requestContext: { requestId: 'test-request-123' } as any,
      };

      const result = await handler(invalidMethodEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(405);
      
      const response = JSON.parse(result.body);
      expect(response.error.message).toContain('Method PATCH not allowed');
    });

    it('should handle database errors gracefully', async () => {
      const mockEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/finance/calculate/save',
        body: JSON.stringify({
          boatPrice: 100000,
          downPayment: 20000,
          interestRate: 6.5,
          termMonths: 240
        }),
        requestContext: { requestId: 'test-request-123' } as any,
        headers: { Authorization: 'Bearer test-token' }
      };

      mockDb.createFinanceCalculation.mockRejectedValue(new Error('Database connection failed'));

      const result = await handler(mockEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(500);
      
      const response = JSON.parse(result.body);
      expect(response.error.message).toContain('Failed to save calculation');
    });
  });
});