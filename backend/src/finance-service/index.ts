/**
 * @fileoverview Finance calculator service for HarborList marketplace loan calculations.
 * 
 * Provides comprehensive finance calculation operations including:
 * - Loan payment calculation with principal, interest, and term parameters
 * - Total cost calculation including interest and fees
 * - Payment schedule generation with amortization details
 * - Calculation saving and sharing functionality
 * - Multiple loan scenario comparison features
 * 
 * Security Features:
 * - User authentication for saved calculations
 * - Input validation and sanitization
 * - Rate limiting for calculation requests
 * - Secure sharing with unique tokens
 * 
 * Business Rules:
 * - Loan amount validation ($1,000 - $10,000,000)
 * - Interest rate validation (0.1% - 30%)
 * - Term validation (12 - 360 months)
 * - Down payment validation (0% - 90% of boat price)
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { db } from '../shared/database';
import { createResponse, createErrorResponse, parseBody, getUserId, generateId, validateRequired, sanitizeString } from '../shared/utils';
import { FinanceCalculation, PaymentScheduleItem } from '@harborlist/shared-types';

/**
 * Finance calculation parameters interface
 */
interface CalculationParams {
  boatPrice: number;
  downPayment: number;
  interestRate: number;
  termMonths: number;
  includeSchedule?: boolean;
}

/**
 * Loan scenario comparison interface
 */
interface LoanScenario {
  scenarioId: string;
  name: string;
  params: CalculationParams;
  result: FinanceCalculation;
}

/**
 * Helper function to validate calculation parameters
 * 
 * @param params - Calculation parameters to validate
 * @returns string | null - Error message or null if valid
 */
function validateCalculationParams(params: CalculationParams): string | null {
  // Validate boat price
  if (!params.boatPrice || params.boatPrice < 1000 || params.boatPrice > 10000000) {
    return 'Boat price must be between $1,000 and $10,000,000';
  }

  // Validate down payment
  if (params.downPayment < 0 || params.downPayment > params.boatPrice * 0.9) {
    return 'Down payment must be between $0 and 90% of boat price';
  }

  // Validate interest rate (annual percentage)
  if (params.interestRate === undefined || params.interestRate < 0 || params.interestRate > 30) {
    return 'Interest rate must be between 0% and 30%';
  }

  // Validate loan term
  if (!params.termMonths || params.termMonths < 12 || params.termMonths > 360) {
    return 'Loan term must be between 12 and 360 months';
  }

  // Validate loan amount
  const loanAmount = params.boatPrice - params.downPayment;
  if (loanAmount < 1000) {
    return 'Loan amount must be at least $1,000';
  }

  return null;
}

/**
 * Core finance calculation engine
 * 
 * Calculates monthly payment, total interest, and total cost using standard
 * amortization formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 * 
 * @param params - Calculation parameters
 * @returns FinanceCalculation - Complete calculation results
 */
function calculateLoanPayment(params: CalculationParams): Omit<FinanceCalculation, 'calculationId' | 'listingId' | 'userId' | 'saved' | 'shared' | 'createdAt'> {
  const { boatPrice, downPayment, interestRate, termMonths } = params;
  
  const loanAmount = boatPrice - downPayment;
  const monthlyRate = (interestRate / 100) / 12; // Convert annual percentage to monthly decimal
  
  // Calculate monthly payment using amortization formula
  let monthlyPayment: number;
  if (monthlyRate === 0) {
    // Handle 0% interest rate case
    monthlyPayment = loanAmount / termMonths;
  } else {
    const numerator = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths);
    const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;
    monthlyPayment = numerator / denominator;
  }
  
  const totalPayments = monthlyPayment * termMonths;
  const totalInterest = totalPayments - loanAmount;
  const totalCost = boatPrice + totalInterest;
  
  // Generate payment schedule if requested
  let paymentSchedule: PaymentScheduleItem[] | undefined;
  if (params.includeSchedule) {
    paymentSchedule = generatePaymentSchedule(loanAmount, monthlyRate, monthlyPayment, termMonths);
  }
  
  return {
    boatPrice,
    downPayment,
    loanAmount,
    interestRate,
    termMonths,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100, // Round to 2 decimal places
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    paymentSchedule,
  };
}

/**
 * Generates detailed payment schedule with amortization
 * 
 * @param loanAmount - Principal loan amount
 * @param monthlyRate - Monthly interest rate (decimal)
 * @param monthlyPayment - Monthly payment amount
 * @param termMonths - Loan term in months
 * @returns PaymentScheduleItem[] - Complete payment schedule
 */
function generatePaymentSchedule(
  loanAmount: number,
  monthlyRate: number,
  monthlyPayment: number,
  termMonths: number
): PaymentScheduleItem[] {
  const schedule: PaymentScheduleItem[] = [];
  let remainingBalance = loanAmount;
  const startDate = new Date();
  
  for (let paymentNumber = 1; paymentNumber <= termMonths; paymentNumber++) {
    const interestAmount = remainingBalance * monthlyRate;
    const principalAmount = monthlyPayment - interestAmount;
    remainingBalance = Math.max(0, remainingBalance - principalAmount);
    
    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + paymentNumber);
    
    schedule.push({
      paymentNumber,
      paymentDate: paymentDate.toISOString().split('T')[0], // YYYY-MM-DD format
      principalAmount: Math.round(principalAmount * 100) / 100,
      interestAmount: Math.round(interestAmount * 100) / 100,
      totalPayment: Math.round(monthlyPayment * 100) / 100,
      remainingBalance: Math.round(remainingBalance * 100) / 100,
    });
  }
  
  return schedule;
}

/**
 * Helper function to calculate multiple loan scenarios for comparison
 * 
 * @param baseParams - Base calculation parameters
 * @param scenarios - Array of scenario variations
 * @returns LoanScenario[] - Array of calculated scenarios
 */
function calculateLoanScenarios(baseParams: CalculationParams, scenarios: Partial<CalculationParams>[]): LoanScenario[] {
  return scenarios.map((scenario, index) => {
    const params = { ...baseParams, ...scenario };
    const result = calculateLoanPayment(params);
    
    return {
      scenarioId: generateId(),
      name: `Scenario ${index + 1}`,
      params,
      result: {
        calculationId: generateId(),
        listingId: '', // Will be set by caller
        userId: undefined,
        saved: false,
        shared: false,
        createdAt: Date.now(),
        ...result,
      },
    };
  });
}

/**
 * Helper function to get suggested interest rates based on loan parameters
 * 
 * @param loanAmount - Principal loan amount
 * @param termMonths - Loan term in months
 * @returns number[] - Array of suggested interest rates
 */
function getSuggestedInterestRates(loanAmount: number, termMonths: number): number[] {
  // Base rates by loan amount (simplified logic)
  let baseRate = 6.5; // Default rate
  
  if (loanAmount >= 500000) {
    baseRate = 5.5; // Lower rate for larger loans
  } else if (loanAmount >= 100000) {
    baseRate = 6.0;
  } else if (loanAmount < 25000) {
    baseRate = 8.0; // Higher rate for smaller loans
  }
  
  // Adjust for term length
  if (termMonths > 240) {
    baseRate += 0.5; // Higher rate for longer terms
  } else if (termMonths < 60) {
    baseRate -= 0.25; // Lower rate for shorter terms
  }
  
  // Return range of rates around base rate
  return [
    Math.round((baseRate - 1.0) * 100) / 100,
    Math.round(baseRate * 100) / 100,
    Math.round((baseRate + 1.0) * 100) / 100,
    Math.round((baseRate + 2.0) * 100) / 100,
  ];
}

/**
 * Main Lambda handler for finance calculator operations
 * 
 * Handles all finance calculation operations including loan calculations,
 * payment schedule generation, and calculation management.
 * 
 * Supported operations:
 * - POST /finance/calculate - Calculate loan payment
 * - POST /finance/calculate/scenarios - Calculate multiple scenarios
 * - POST /finance/calculate/save - Save calculation for user
 * - GET /finance/calculations/{userId} - Get user's saved calculations
 * - GET /finance/calculations/shared/{shareToken} - Get shared calculation
 * - POST /finance/share/{calculationId} - Share calculation
 * - DELETE /finance/calculations/{calculationId} - Delete saved calculation
 * - GET /finance/rates/suggested - Get suggested interest rates
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
        if (path.includes('/finance/calculations/') && pathParameters.userId) {
          return await getUserCalculations(pathParameters.userId, event, requestId);
        } else if (path.includes('/finance/calculations/shared/') && pathParameters.shareToken) {
          return await getSharedCalculation(pathParameters.shareToken, requestId);
        } else if (path.includes('/finance/rates/suggested')) {
          return await getSuggestedRates(event, requestId);
        } else {
          return createErrorResponse(404, 'NOT_FOUND', 'Endpoint not found', requestId);
        }

      case 'POST':
        if (path.includes('/finance/calculate/scenarios')) {
          return await calculateScenarios(event, requestId);
        } else if (path.includes('/finance/calculate/save')) {
          return await saveCalculation(event, requestId);
        } else if (path.includes('/finance/calculate')) {
          return await performCalculation(event, requestId);
        } else if (path.includes('/finance/share/') && pathParameters.calculationId) {
          return await shareCalculation(pathParameters.calculationId, event, requestId);
        } else {
          return createErrorResponse(404, 'NOT_FOUND', 'Endpoint not found', requestId);
        }

      case 'DELETE':
        if (path.includes('/finance/calculations/') && pathParameters.calculationId) {
          return await deleteCalculation(pathParameters.calculationId, event, requestId);
        } else {
          return createErrorResponse(404, 'NOT_FOUND', 'Endpoint not found', requestId);
        }

      default:
        return createErrorResponse(405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed`, requestId);
    }
  } catch (error) {
    console.error('Error in finance service:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }
};

/**
 * Performs a single loan calculation
 * 
 * @param event - API Gateway event containing calculation parameters
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Calculation results or error
 */
async function performCalculation(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const body = parseBody<CalculationParams & { listingId?: string }>(event);

    // Validate required fields
    validateRequired(body, ['boatPrice', 'downPayment', 'interestRate', 'termMonths']);

    // Validate calculation parameters
    const validationError = validateCalculationParams(body);
    if (validationError) {
      return createErrorResponse(400, 'VALIDATION_ERROR', validationError, requestId);
    }

    // Perform calculation
    const result = calculateLoanPayment(body);

    // Create full calculation object
    const calculation: FinanceCalculation = {
      calculationId: generateId(),
      listingId: body.listingId || '',
      userId: undefined, // Not saved by default
      saved: false,
      shared: false,
      createdAt: Date.now(),
      ...result,
    };

    return createResponse(200, {
      calculation,
      message: 'Calculation completed successfully'
    });
  } catch (error) {
    console.error('Error performing calculation:', error);
    
    if (error instanceof Error && error.message.includes('Missing required fields')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message, requestId);
    }

    return createErrorResponse(500, 'CALCULATION_ERROR', 'Failed to perform calculation', requestId);
  }
}

/**
 * Calculates multiple loan scenarios for comparison
 * 
 * @param event - API Gateway event containing base parameters and scenarios
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Array of scenario calculations or error
 */
async function calculateScenarios(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const body = parseBody<{
      baseParams: CalculationParams;
      scenarios: Partial<CalculationParams>[];
      listingId?: string;
    }>(event);

    // Validate required fields
    validateRequired(body, ['baseParams', 'scenarios']);
    validateRequired(body.baseParams!, ['boatPrice', 'downPayment', 'interestRate', 'termMonths']);

    if (!Array.isArray(body.scenarios) || body.scenarios.length === 0) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'At least one scenario is required', requestId);
    }

    if (body.scenarios.length > 10) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Maximum of 10 scenarios allowed', requestId);
    }

    // Validate base parameters
    const validationError = validateCalculationParams(body.baseParams!);
    if (validationError) {
      return createErrorResponse(400, 'VALIDATION_ERROR', `Base parameters: ${validationError}`, requestId);
    }

    // Calculate scenarios
    const scenarios = calculateLoanScenarios(body.baseParams!, body.scenarios!);

    // Set listing ID for all scenarios
    if (body.listingId) {
      scenarios.forEach(scenario => {
        scenario.result.listingId = body.listingId!;
      });
    }

    return createResponse(200, {
      scenarios,
      baseParams: body.baseParams,
      message: `${scenarios.length} scenarios calculated successfully`
    });
  } catch (error) {
    console.error('Error calculating scenarios:', error);
    
    if (error instanceof Error && error.message.includes('Missing required fields')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message, requestId);
    }

    return createErrorResponse(500, 'CALCULATION_ERROR', 'Failed to calculate scenarios', requestId);
  }
}

/**
 * Gets suggested interest rates based on loan parameters
 * 
 * @param event - API Gateway event containing loan parameters
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Suggested rates or error
 */
async function getSuggestedRates(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    const loanAmount = parseFloat(queryParams.loanAmount || '0');
    const termMonths = parseInt(queryParams.termMonths || '0');

    if (!loanAmount || loanAmount < 1000) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Valid loan amount is required (minimum $1,000)', requestId);
    }

    if (!termMonths || termMonths < 12) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Valid loan term is required (minimum 12 months)', requestId);
    }

    const suggestedRates = getSuggestedInterestRates(loanAmount, termMonths);

    return createResponse(200, {
      suggestedRates,
      loanAmount,
      termMonths,
      message: 'Suggested rates calculated successfully'
    });
  } catch (error) {
    console.error('Error getting suggested rates:', error);
    return createErrorResponse(500, 'CALCULATION_ERROR', 'Failed to get suggested rates', requestId);
  }
}
/**
 *
 Saves a calculation for a registered user
 * 
 * @param event - API Gateway event containing calculation data and user context
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Saved calculation or error
 */
async function saveCalculation(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const body = parseBody<CalculationParams & {
      listingId?: string;
      calculationNotes?: string;
      lenderInfo?: {
        name?: string;
        rate?: number;
        terms?: string;
      };
    }>(event);

    // Validate required fields
    validateRequired(body, ['boatPrice', 'downPayment', 'interestRate', 'termMonths']);

    // Validate calculation parameters
    const validationError = validateCalculationParams(body);
    if (validationError) {
      return createErrorResponse(400, 'VALIDATION_ERROR', validationError, requestId);
    }

    // Perform calculation with payment schedule
    const calculationParams = { ...body, includeSchedule: true };
    const result = calculateLoanPayment(calculationParams);

    // Create calculation object
    const calculationId = generateId();
    const calculation: FinanceCalculation = {
      calculationId,
      listingId: body.listingId || '',
      userId,
      saved: true,
      shared: false,
      calculationNotes: body.calculationNotes ? sanitizeString(body.calculationNotes) : undefined,
      lenderInfo: body.lenderInfo ? {
        name: body.lenderInfo.name ? sanitizeString(body.lenderInfo.name) : undefined,
        rate: body.lenderInfo.rate,
        terms: body.lenderInfo.terms ? sanitizeString(body.lenderInfo.terms) : undefined,
      } : undefined,
      createdAt: Date.now(),
      ...result,
    };

    // Save to database
    await db.createFinanceCalculation(calculation);

    return createResponse(201, {
      calculationId: calculation.calculationId,
      calculation,
      message: 'Calculation saved successfully'
    });
  } catch (error) {
    console.error('Error saving calculation:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Missing required fields')) {
        return createErrorResponse(400, 'VALIDATION_ERROR', error.message, requestId);
      }
      if (error.message.includes('User not authenticated')) {
        return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
      }
    }

    return createErrorResponse(500, 'CALCULATION_ERROR', 'Failed to save calculation', requestId);
  }
}

/**
 * Retrieves all saved calculations for a user
 * 
 * @param userId - User ID to get calculations for
 * @param event - API Gateway event containing query parameters
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - User's calculations or error
 */
async function getUserCalculations(userId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const requestUserId = getUserId(event);
    
    // Users can only access their own calculations
    if (requestUserId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'You can only access your own calculations', requestId);
    }

    const queryParams = event.queryStringParameters || {};
    const limit = parseInt(queryParams.limit || '20');
    const listingId = queryParams.listingId;

    // Get calculations from database
    const result = await db.getFinanceCalculationsByUser(userId, limit);
    const calculations = result.calculations;

    // Sort by creation date (newest first)
    calculations.sort((a, b) => b.createdAt - a.createdAt);

    return createResponse(200, {
      calculations,
      total: calculations.length,
      userId,
      message: 'Calculations retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting user calculations:', error);
    
    if (error instanceof Error && error.message.includes('User not authenticated')) {
      return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
    }

    return createErrorResponse(500, 'CALCULATION_ERROR', 'Failed to retrieve calculations', requestId);
  }
}

/**
 * Shares a calculation by generating a unique share token
 * 
 * @param calculationId - Calculation ID to share
 * @param event - API Gateway event containing user context
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Share token or error
 */
async function shareCalculation(calculationId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);

    // Get calculation from database
    const calculation = await db.getFinanceCalculation(calculationId);
    if (!calculation) {
      return createErrorResponse(404, 'NOT_FOUND', 'Calculation not found', requestId);
    }

    // Check if user owns the calculation
    if (calculation.userId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'You can only share your own calculations', requestId);
    }

    // Generate share token if not already shared
    let shareToken = calculation.shareToken;
    if (!shareToken) {
      shareToken = generateId();
      
      // Update calculation with share token
      await db.updateFinanceCalculation(calculationId, {
        shared: true,
        shareToken,
        updatedAt: Date.now(),
      });
    }

    // Generate share URL (this would be the frontend URL in production)
    const shareUrl = `${process.env.FRONTEND_URL || 'https://harborlist.com'}/finance/shared/${shareToken}`;

    return createResponse(200, {
      shareToken,
      shareUrl,
      calculationId,
      message: 'Calculation shared successfully'
    });
  } catch (error) {
    console.error('Error sharing calculation:', error);
    
    if (error instanceof Error && error.message.includes('User not authenticated')) {
      return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
    }

    return createErrorResponse(500, 'CALCULATION_ERROR', 'Failed to share calculation', requestId);
  }
}

/**
 * Retrieves a shared calculation by share token
 * 
 * @param shareToken - Unique share token
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Shared calculation or error
 */
async function getSharedCalculation(shareToken: string, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    // Get calculation by share token
    const calculation = await db.getFinanceCalculationByShareToken(shareToken);
    if (!calculation) {
      return createErrorResponse(404, 'NOT_FOUND', 'Shared calculation not found or expired', requestId);
    }

    if (!calculation.shared) {
      return createErrorResponse(403, 'FORBIDDEN', 'Calculation is not shared', requestId);
    }

    // Remove sensitive information for shared view
    const sharedCalculation = {
      ...calculation,
      userId: undefined, // Don't expose user ID
      calculationNotes: undefined, // Don't expose private notes
    };

    return createResponse(200, {
      calculation: sharedCalculation,
      shared: true,
      message: 'Shared calculation retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting shared calculation:', error);
    return createErrorResponse(500, 'CALCULATION_ERROR', 'Failed to retrieve shared calculation', requestId);
  }
}

/**
 * Deletes a saved calculation
 * 
 * @param calculationId - Calculation ID to delete
 * @param event - API Gateway event containing user context
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Success response or error
 */
async function deleteCalculation(calculationId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);

    // Get calculation from database
    const calculation = await db.getFinanceCalculation(calculationId);
    if (!calculation) {
      return createErrorResponse(404, 'NOT_FOUND', 'Calculation not found', requestId);
    }

    // Check if user owns the calculation
    if (calculation.userId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'You can only delete your own calculations', requestId);
    }

    // Delete calculation from database
    await db.deleteFinanceCalculation(calculationId);

    return createResponse(200, {
      calculationId,
      message: 'Calculation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting calculation:', error);
    
    if (error instanceof Error && error.message.includes('User not authenticated')) {
      return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
    }

    return createErrorResponse(500, 'CALCULATION_ERROR', 'Failed to delete calculation', requestId);
  }
}