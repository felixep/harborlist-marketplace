/**
 * Tests for Error Handler Middleware and Utilities
 * 
 * Tests for Lambda error handling wrapper, error conversion,
 * logging, monitoring integration, and utility functions.
 */

import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import {
  withErrorHandler,
  ErrorUtils,
  ErrorMonitoring,
  LambdaErrorBoundary
} from '../error-handler';
import {
  EnhancedErrorCodes,
  ErrorSeverity,
  ErrorCategory,
  createEnhancedError
} from '../errors';

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation();

// Mock event and context
const mockEvent: APIGatewayProxyEvent = {
  httpMethod: 'POST',
  path: '/test',
  headers: {
    'User-Agent': 'test-agent',
    'Content-Type': 'application/json'
  },
  requestContext: {
    identity: {
      sourceIp: '127.0.0.1'
    },
    authorizer: {
      claims: {
        sub: 'user-123'
      }
    }
  } as any,
  body: '{"test": "data"}',
  isBase64Encoded: false,
  multiValueHeaders: {},
  multiValueQueryStringParameters: null,
  pathParameters: null,
  queryStringParameters: null,
  resource: '',
  stageVariables: null
};

const mockContext: Context = {
  awsRequestId: 'request-123',
  functionName: 'test-function',
  functionVersion: '1',
  memoryLimitInMB: '128',
  getRemainingTimeInMillis: () => 30000,
  coldStart: false
} as any;

describe('Error Handler Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withErrorHandler', () => {
    it('should handle successful requests', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ success: true })
      });

      const wrappedHandler = withErrorHandler(mockHandler, 'test-service');
      const result = await wrappedHandler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      expect(mockHandler).toHaveBeenCalledWith(mockEvent, mockContext);
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('[request-123] Request started:')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('[request-123] Request completed successfully:')
      );
    });

    it('should handle enhanced errors', async () => {
      const testError = createEnhancedError(
        EnhancedErrorCodes.TIER_LIMIT_EXCEEDED,
        ErrorSeverity.MEDIUM,
        ErrorCategory.BUSINESS_LOGIC,
        { userId: 'user-123' },
        undefined,
        'request-123'
      );

      const mockHandler = jest.fn().mockRejectedValue(testError);
      const wrappedHandler = withErrorHandler(mockHandler, 'test-service');
      
      const result = await wrappedHandler(mockEvent, mockContext);

      expect(result.statusCode).toBe(422); // Business logic error
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe(EnhancedErrorCodes.TIER_LIMIT_EXCEEDED);
      expect(responseBody.error.message).toBe(testError.userMessage);
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should convert unknown errors to enhanced errors', async () => {
      const unknownError = new Error('Unknown error occurred');
      const mockHandler = jest.fn().mockRejectedValue(unknownError);
      const wrappedHandler = withErrorHandler(mockHandler, 'test-service');
      
      const result = await wrappedHandler(mockEvent, mockContext);

      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe(EnhancedErrorCodes.CONFIGURATION_ERROR);
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should retry retryable operations', async () => {
      let attempts = 0;
      const mockHandler = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw createEnhancedError(EnhancedErrorCodes.DATABASE_CONNECTION_ERROR);
        }
        return {
          statusCode: 200,
          body: JSON.stringify({ success: true })
        };
      });

      const wrappedHandler = withErrorHandler(mockHandler, 'test-service', {
        enableRetry: true,
        maxRetries: 3
      });
      
      const result = await wrappedHandler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      expect(attempts).toBe(3);
      expect(mockHandler).toHaveBeenCalledTimes(3);
    });

    it('should not include stack trace in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const testError = createEnhancedError(EnhancedErrorCodes.DATABASE_CONNECTION_ERROR);
      const mockHandler = jest.fn().mockRejectedValue(testError);
      const wrappedHandler = withErrorHandler(mockHandler, 'test-service');
      
      const result = await wrappedHandler(mockEvent, mockContext);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.details[0].stackTrace).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack trace in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const testError = createEnhancedError(EnhancedErrorCodes.DATABASE_CONNECTION_ERROR);
      const mockHandler = jest.fn().mockRejectedValue(testError);
      const wrappedHandler = withErrorHandler(mockHandler, 'test-service');
      
      const result = await wrappedHandler(mockEvent, mockContext);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.details[0].stackTrace).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });
});

describe('Error Utilities', () => {
  describe('handleDatabaseOperation', () => {
    it('should handle successful database operations', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await ErrorUtils.handleDatabaseOperation(operation, 'test-operation');
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry failed database operations', async () => {
      let attempts = 0;
      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Database connection failed');
        }
        return 'success';
      });
      
      const result = await ErrorUtils.handleDatabaseOperation(operation, 'test-operation', 3);
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw enhanced error after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Database connection failed'));
      
      await expect(ErrorUtils.handleDatabaseOperation(operation, 'test-operation', 2))
        .rejects.toThrow(expect.objectContaining({
          code: EnhancedErrorCodes.DATABASE_CONNECTION_ERROR
        }));
      
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleExternalService', () => {
    it('should handle successful external service calls', async () => {
      const primaryCall = jest.fn().mockResolvedValue('primary-result');
      
      const result = await ErrorUtils.handleExternalService(primaryCall, undefined, 'test-service');
      
      expect(result).toBe('primary-result');
      expect(primaryCall).toHaveBeenCalledTimes(1);
    });

    it('should use fallback when primary call fails', async () => {
      const primaryCall = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      const fallbackCall = jest.fn().mockResolvedValue('fallback-result');
      
      const result = await ErrorUtils.handleExternalService(primaryCall, fallbackCall, 'test-service');
      
      expect(result).toBe('fallback-result');
      expect(primaryCall).toHaveBeenCalledTimes(1);
      expect(fallbackCall).toHaveBeenCalledTimes(1);
    });

    it('should throw enhanced error when both calls fail', async () => {
      const primaryCall = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      const fallbackCall = jest.fn().mockRejectedValue(new Error('Fallback failed'));
      
      await expect(ErrorUtils.handleExternalService(primaryCall, fallbackCall, 'test-service'))
        .rejects.toThrow(expect.objectContaining({
          code: EnhancedErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE
        }));
    });
  });

  describe('handlePaymentError', () => {
    it('should map insufficient funds error', () => {
      const error = new Error('Insufficient funds in account');
      const enhancedError = ErrorUtils.handlePaymentError(error);
      
      expect(enhancedError.code).toBe(EnhancedErrorCodes.INSUFFICIENT_FUNDS);
      expect(enhancedError.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should map card declined error', () => {
      const error = new Error('Card was declined by issuer');
      const enhancedError = ErrorUtils.handlePaymentError(error);
      
      expect(enhancedError.code).toBe(EnhancedErrorCodes.PAYMENT_DECLINED);
      expect(enhancedError.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should map expired card error', () => {
      const error = new Error('Card has expired');
      const enhancedError = ErrorUtils.handlePaymentError(error);
      
      expect(enhancedError.code).toBe(EnhancedErrorCodes.PAYMENT_METHOD_INVALID);
      expect(enhancedError.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should map generic payment error', () => {
      const error = new Error('Payment processing failed');
      const enhancedError = ErrorUtils.handlePaymentError(error);
      
      expect(enhancedError.code).toBe(EnhancedErrorCodes.PAYMENT_PROCESSING_FAILED);
      expect(enhancedError.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('validateUserPermissions', () => {
    it('should validate user with required permissions', () => {
      const user = {
        id: 'user-123',
        permissions: ['user_management', 'billing_management']
      };
      
      expect(() => ErrorUtils.validateUserPermissions(
        user,
        ['user_management'],
        'update_user'
      )).not.toThrow();
    });

    it('should throw error for missing user', () => {
      expect(() => ErrorUtils.validateUserPermissions(
        null,
        ['user_management'],
        'update_user'
      )).toThrow(expect.objectContaining({
        code: EnhancedErrorCodes.ADMIN_PERMISSION_REQUIRED,
        category: ErrorCategory.AUTHENTICATION
      }));
    });

    it('should throw error for insufficient permissions', () => {
      const user = {
        id: 'user-123',
        permissions: ['basic_access']
      };
      
      expect(() => ErrorUtils.validateUserPermissions(
        user,
        ['admin_access'],
        'admin_operation'
      )).toThrow(expect.objectContaining({
        code: EnhancedErrorCodes.ADMIN_PERMISSION_REQUIRED,
        category: ErrorCategory.AUTHORIZATION
      }));
    });
  });

  describe('handleRateLimit', () => {
    it('should not throw error when under limit', () => {
      expect(() => ErrorUtils.handleRateLimit('user-123', 100, 3600, 50))
        .not.toThrow();
    });

    it('should throw error when limit exceeded', () => {
      expect(() => ErrorUtils.handleRateLimit('user-123', 100, 3600, 150))
        .toThrow(expect.objectContaining({
          code: EnhancedErrorCodes.RATE_LIMIT_EXCEEDED
        }));
    });

    it('should include rate limit context in error', () => {
      try {
        ErrorUtils.handleRateLimit('user-123', 100, 3600, 150);
      } catch (error: any) {
        expect(error.context).toEqual({
          identifier: 'user-123',
          limit: 100,
          window: 3600,
          current: 150,
          resetTime: expect.any(Number)
        });
      }
    });
  });
});

describe('Error Monitoring', () => {
  describe('shouldAlert', () => {
    it('should alert for critical errors', () => {
      const error = createEnhancedError(
        EnhancedErrorCodes.DATABASE_CONNECTION_ERROR,
        ErrorSeverity.CRITICAL
      );
      
      expect(ErrorMonitoring.shouldAlert(error)).toBe(true);
    });

    it('should alert for high severity errors', () => {
      const error = createEnhancedError(
        EnhancedErrorCodes.PAYMENT_PROCESSING_FAILED,
        ErrorSeverity.HIGH
      );
      
      expect(ErrorMonitoring.shouldAlert(error)).toBe(true);
    });

    it('should not alert for medium severity errors', () => {
      const error = createEnhancedError(
        EnhancedErrorCodes.TIER_LIMIT_EXCEEDED,
        ErrorSeverity.MEDIUM
      );
      
      expect(ErrorMonitoring.shouldAlert(error)).toBe(false);
    });

    it('should not alert for low severity errors', () => {
      const error = createEnhancedError(
        EnhancedErrorCodes.CALCULATION_SAVE_FAILED,
        ErrorSeverity.LOW
      );
      
      expect(ErrorMonitoring.shouldAlert(error)).toBe(false);
    });
  });

  describe('generateAlertMessage', () => {
    it('should generate comprehensive alert message', () => {
      const error = createEnhancedError(
        EnhancedErrorCodes.PAYMENT_PROCESSING_FAILED,
        ErrorSeverity.HIGH,
        ErrorCategory.EXTERNAL_SERVICE,
        { transactionId: 'txn-123', amount: 1000 }
      );
      
      const message = ErrorMonitoring.generateAlertMessage(error);
      
      expect(message).toContain('[HIGH]');
      expect(message).toContain(EnhancedErrorCodes.PAYMENT_PROCESSING_FAILED);
      expect(message).toContain('transactionId');
      expect(message).toContain('Recovery Options:');
      expect(message).toContain('Retryable:');
      expect(message).toContain('Timestamp:');
    });
  });

  describe('trackErrorPattern', () => {
    it('should track error patterns', () => {
      const error = createEnhancedError(
        EnhancedErrorCodes.ENGINE_VALIDATION_FAILED,
        ErrorSeverity.MEDIUM,
        ErrorCategory.VALIDATION,
        { engineType: 'outboard' }
      );
      
      ErrorMonitoring.trackErrorPattern(error);
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        '[ERROR_PATTERN]',
        expect.stringContaining(EnhancedErrorCodes.ENGINE_VALIDATION_FAILED)
      );
    });
  });
});

describe('Lambda Error Boundary', () => {
  describe('Error Handler Registration', () => {
    it('should register and execute error handlers', async () => {
      const boundary = LambdaErrorBoundary.getInstance();
      const mockHandler = jest.fn().mockResolvedValue(undefined);
      
      boundary.registerHandler(EnhancedErrorCodes.PAYMENT_PROCESSING_FAILED, mockHandler);
      
      const error = createEnhancedError(EnhancedErrorCodes.PAYMENT_PROCESSING_FAILED);
      await boundary.handleError(error);
      
      expect(mockHandler).toHaveBeenCalledWith(error);
    });

    it('should handle errors in error handlers gracefully', async () => {
      const boundary = LambdaErrorBoundary.getInstance();
      const mockHandler = jest.fn().mockRejectedValue(new Error('Handler failed'));
      
      boundary.registerHandler(EnhancedErrorCodes.DATABASE_CONNECTION_ERROR, mockHandler);
      
      const error = createEnhancedError(EnhancedErrorCodes.DATABASE_CONNECTION_ERROR);
      
      // Should not throw even if handler fails
      await expect(boundary.handleError(error)).resolves.toBeUndefined();
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error handler failed:',
        expect.any(Error)
      );
    });

    it('should handle errors without registered handlers', async () => {
      const boundary = LambdaErrorBoundary.getInstance();
      const error = createEnhancedError(EnhancedErrorCodes.SLUG_GENERATION_FAILED);
      
      // Should not throw for unregistered error codes
      await expect(boundary.handleError(error)).resolves.toBeUndefined();
    });
  });
});

describe('Error Context Preservation', () => {
  it('should preserve request context in errors', async () => {
    const testError = createEnhancedError(
      EnhancedErrorCodes.TIER_LIMIT_EXCEEDED,
      ErrorSeverity.MEDIUM,
      ErrorCategory.BUSINESS_LOGIC,
      { userId: 'user-123', operation: 'create_listing' }
    );

    const mockHandler = jest.fn().mockRejectedValue(testError);
    const wrappedHandler = withErrorHandler(mockHandler, 'test-service');
    
    const result = await wrappedHandler(mockEvent, mockContext);

    const responseBody = JSON.parse(result.body);
    expect(responseBody.error.details[0].context).toEqual({
      userId: 'user-123',
      operation: 'create_listing'
    });
  });

  it('should include recovery options in error responses', async () => {
    const testError = createEnhancedError(EnhancedErrorCodes.PAYMENT_PROCESSING_FAILED);
    const mockHandler = jest.fn().mockRejectedValue(testError);
    const wrappedHandler = withErrorHandler(mockHandler, 'test-service');
    
    const result = await wrappedHandler(mockEvent, mockContext);

    const responseBody = JSON.parse(result.body);
    expect(responseBody.error.details[0].recoveryOptions).toBeDefined();
    expect(responseBody.error.details[0].recoveryOptions.length).toBeGreaterThan(0);
    expect(responseBody.error.details[0].recoveryOptions[0]).toHaveProperty('action');
    expect(responseBody.error.details[0].recoveryOptions[0]).toHaveProperty('description');
  });
});