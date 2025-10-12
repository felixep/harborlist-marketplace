/**
 * Tests for Enhanced Error Handling System
 * 
 * Comprehensive tests for error types, error creation, validation,
 * recovery mechanisms, and user-friendly error messages.
 */

import {
  EnhancedErrorCodes,
  ErrorSeverity,
  ErrorCategory,
  createEnhancedError,
  createEnhancedErrorResponse,
  isRetryableError,
  ErrorRecovery,
  ErrorValidation,
  ERROR_MESSAGES
} from '../errors';

describe('Enhanced Error System', () => {
  describe('Error Creation', () => {
    it('should create enhanced error with all properties', () => {
      const context = { userId: 'test-user', operation: 'test-operation' };
      const error = createEnhancedError(
        EnhancedErrorCodes.INVALID_ENGINE_CONFIGURATION,
        ErrorSeverity.HIGH,
        ErrorCategory.VALIDATION,
        context,
        'Custom message',
        'request-123'
      );

      expect(error.code).toBe(EnhancedErrorCodes.INVALID_ENGINE_CONFIGURATION);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.context).toEqual(context);
      expect(error.userMessage).toBe('Custom message');
      expect(error.requestId).toBe('request-123');
      expect(error.retryable).toBe(false);
      expect(error.recoveryOptions).toBeDefined();
      expect(error.timestamp).toBeGreaterThan(0);
    });

    it('should use default values when not provided', () => {
      const error = createEnhancedError(EnhancedErrorCodes.PAYMENT_PROCESSING_FAILED);

      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.category).toBe(ErrorCategory.BUSINESS_LOGIC);
      expect(error.userMessage).toBe(ERROR_MESSAGES[EnhancedErrorCodes.PAYMENT_PROCESSING_FAILED].userMessage);
      expect(error.technicalMessage).toBe(ERROR_MESSAGES[EnhancedErrorCodes.PAYMENT_PROCESSING_FAILED].technicalMessage);
    });
  });

  describe('Error Response Creation', () => {
    it('should create enhanced error response', () => {
      const error = createEnhancedError(
        EnhancedErrorCodes.TIER_LIMIT_EXCEEDED,
        ErrorSeverity.MEDIUM,
        ErrorCategory.BUSINESS_LOGIC,
        { operation: 'tier_check', parameters: { userTier: 'basic' } },
        undefined,
        'request-456'
      );

      const response = createEnhancedErrorResponse(error, 422, false);

      expect(response.error.code).toBe(EnhancedErrorCodes.TIER_LIMIT_EXCEEDED);
      expect(response.error.message).toBe(error.userMessage);
      expect(response.error.requestId).toBe('request-456');
      expect(response.error.details).toHaveLength(1);
      expect(response.error.details).toBeDefined();
      expect(response.error.details![0].severity).toBe(ErrorSeverity.MEDIUM);
      expect(response.error.details![0].category).toBe(ErrorCategory.BUSINESS_LOGIC);
      expect(response.error.details![0].retryable).toBe(false);
      expect(response.error.details![0].context).toEqual({ operation: 'tier_check', parameters: { userTier: 'basic' } });
      expect(response.error.details![0].recoveryOptions).toBeDefined();
    });

    it('should include stack trace when enabled', () => {
      const error = createEnhancedError(EnhancedErrorCodes.DATABASE_CONNECTION_ERROR);
      const response = createEnhancedErrorResponse(error, 500, true);

      expect(response.error.details![0].stackTrace).toBeDefined();
    });

    it('should not include stack trace when disabled', () => {
      const error = createEnhancedError(EnhancedErrorCodes.DATABASE_CONNECTION_ERROR);
      const response = createEnhancedErrorResponse(error, 500, false);

      expect(response.error.details![0].stackTrace).toBeUndefined();
    });
  });

  describe('Retryable Error Detection', () => {
    it('should identify retryable errors', () => {
      const retryableErrors = [
        EnhancedErrorCodes.DATABASE_CONNECTION_ERROR,
        EnhancedErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE,
        EnhancedErrorCodes.PAYMENT_PROCESSING_FAILED,
        EnhancedErrorCodes.CALCULATION_SAVE_FAILED
      ];

      retryableErrors.forEach(errorCode => {
        expect(isRetryableError(errorCode)).toBe(true);
      });
    });

    it('should identify non-retryable errors', () => {
      const nonRetryableErrors = [
        EnhancedErrorCodes.INVALID_ENGINE_CONFIGURATION,
        EnhancedErrorCodes.TIER_LIMIT_EXCEEDED,
        EnhancedErrorCodes.PREMIUM_MEMBERSHIP_EXPIRED,
        EnhancedErrorCodes.ADMIN_PERMISSION_REQUIRED
      ];

      nonRetryableErrors.forEach(errorCode => {
        expect(isRetryableError(errorCode)).toBe(false);
      });
    });
  });

  describe('Error Messages', () => {
    it('should have user-friendly messages for all error codes', () => {
      Object.values(EnhancedErrorCodes).forEach(errorCode => {
        const errorInfo = ERROR_MESSAGES[errorCode];
        expect(errorInfo).toBeDefined();
        expect(errorInfo.userMessage).toBeDefined();
        expect(errorInfo.technicalMessage).toBeDefined();
        expect(errorInfo.recoveryOptions).toBeDefined();
        expect(errorInfo.recoveryOptions.length).toBeGreaterThan(0);
      });
    });

    it('should have appropriate recovery options', () => {
      const errorInfo = ERROR_MESSAGES[EnhancedErrorCodes.PAYMENT_PROCESSING_FAILED];
      
      expect(errorInfo.recoveryOptions).toContainEqual(
        expect.objectContaining({
          action: 'retry_payment',
          description: 'Try payment again'
        })
      );
      
      expect(errorInfo.recoveryOptions).toContainEqual(
        expect.objectContaining({
          action: 'update_payment_method',
          description: 'Update payment method'
        })
      );
    });
  });
});

describe('Error Recovery', () => {
  describe('Automatic Recovery', () => {
    it('should retry retryable operations', async () => {
      let attempts = 0;
      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          const error = createEnhancedError(EnhancedErrorCodes.DATABASE_CONNECTION_ERROR);
          throw error;
        }
        return 'success';
      });

      const result = await ErrorRecovery.attemptRecovery(operation, 3, 100);
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const operation = jest.fn().mockImplementation(() => {
        const error = createEnhancedError(EnhancedErrorCodes.DATABASE_CONNECTION_ERROR);
        throw error;
      });

      await expect(ErrorRecovery.attemptRecovery(operation, 2, 100))
        .rejects.toThrow();
      
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn().mockImplementation(() => {
        const error = createEnhancedError(EnhancedErrorCodes.TIER_LIMIT_EXCEEDED);
        throw error;
      });

      await expect(ErrorRecovery.attemptRecovery(operation, 3, 100))
        .rejects.toThrow();
      
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should return fallback value on error', () => {
      const operation = () => {
        throw new Error('Operation failed');
      };

      const result = ErrorRecovery.withFallback(operation, 'fallback-value');
      expect(result).toBe('fallback-value');
    });

    it('should return operation result on success', () => {
      const operation = () => 'success-value';

      const result = ErrorRecovery.withFallback(operation, 'fallback-value');
      expect(result).toBe('success-value');
    });

    it('should gracefully degrade with fallback operation', async () => {
      const primaryOperation = jest.fn().mockRejectedValue(new Error('Primary failed'));
      const fallbackOperation = jest.fn().mockResolvedValue('fallback-result');

      const result = await ErrorRecovery.gracefulDegrade(
        primaryOperation,
        fallbackOperation,
        'default-value'
      );

      expect(result).toBe('fallback-result');
      expect(primaryOperation).toHaveBeenCalledTimes(1);
      expect(fallbackOperation).toHaveBeenCalledTimes(1);
    });

    it('should return default value when both operations fail', async () => {
      const primaryOperation = jest.fn().mockRejectedValue(new Error('Primary failed'));
      const fallbackOperation = jest.fn().mockRejectedValue(new Error('Fallback failed'));

      const result = await ErrorRecovery.gracefulDegrade(
        primaryOperation,
        fallbackOperation,
        'default-value'
      );

      expect(result).toBe('default-value');
      expect(primaryOperation).toHaveBeenCalledTimes(1);
      expect(fallbackOperation).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Error Validation', () => {
  describe('Engine Configuration Validation', () => {
    it('should validate valid engine configuration', () => {
      const engines = [
        {
          type: 'outboard',
          horsepower: 250,
          fuelType: 'gasoline',
          position: 1
        },
        {
          type: 'outboard',
          horsepower: 250,
          fuelType: 'gasoline',
          position: 2
        }
      ];

      expect(() => ErrorValidation.validateEngineConfiguration(engines))
        .not.toThrow();
    });

    it('should throw error for missing engines', () => {
      expect(() => ErrorValidation.validateEngineConfiguration([]))
        .toThrow(expect.objectContaining({
          code: EnhancedErrorCodes.MISSING_ENGINE_SPECIFICATIONS
        }));
    });

    it('should throw error for invalid engine specifications', () => {
      const engines = [
        {
          type: 'outboard',
          // Missing horsepower and fuelType
          position: 1
        }
      ];

      expect(() => ErrorValidation.validateEngineConfiguration(engines))
        .toThrow(expect.objectContaining({
          code: EnhancedErrorCodes.ENGINE_VALIDATION_FAILED
        }));
    });

    it('should throw error for duplicate engine positions', () => {
      const engines = [
        {
          type: 'outboard',
          horsepower: 250,
          fuelType: 'gasoline',
          position: 1
        },
        {
          type: 'outboard',
          horsepower: 250,
          fuelType: 'gasoline',
          position: 1 // Duplicate position
        }
      ];

      expect(() => ErrorValidation.validateEngineConfiguration(engines))
        .toThrow(expect.objectContaining({
          code: EnhancedErrorCodes.DUPLICATE_ENGINE_POSITION
        }));
    });

    it('should throw error for invalid horsepower', () => {
      const engines = [
        {
          type: 'outboard',
          horsepower: -100, // Invalid horsepower
          fuelType: 'gasoline',
          position: 1
        }
      ];

      expect(() => ErrorValidation.validateEngineConfiguration(engines))
        .toThrow(expect.objectContaining({
          code: EnhancedErrorCodes.ENGINE_VALIDATION_FAILED
        }));
    });

    it('should throw error for too many engines', () => {
      const engines = Array.from({ length: 5 }, (_, i) => ({
        type: 'outboard',
        horsepower: 250,
        fuelType: 'gasoline',
        position: i + 1
      }));

      expect(() => ErrorValidation.validateEngineConfiguration(engines))
        .toThrow(expect.objectContaining({
          code: EnhancedErrorCodes.ENGINE_LIMIT_EXCEEDED
        }));
    });
  });

  describe('Finance Parameters Validation', () => {
    it('should validate valid finance parameters', () => {
      const params = {
        boatPrice: 50000,
        downPayment: 10000,
        interestRate: 5.5,
        termMonths: 120
      };

      expect(() => ErrorValidation.validateFinanceParameters(params))
        .not.toThrow();
    });

    it('should throw error for invalid boat price', () => {
      const params = {
        boatPrice: -1000,
        downPayment: 5000,
        interestRate: 5.5,
        termMonths: 120
      };

      expect(() => ErrorValidation.validateFinanceParameters(params))
        .toThrow(expect.objectContaining({
          code: EnhancedErrorCodes.INVALID_LOAN_PARAMETERS
        }));
    });

    it('should throw error for invalid down payment', () => {
      const params = {
        boatPrice: 50000,
        downPayment: 60000, // More than boat price
        interestRate: 5.5,
        termMonths: 120
      };

      expect(() => ErrorValidation.validateFinanceParameters(params))
        .toThrow(expect.objectContaining({
          code: EnhancedErrorCodes.INVALID_LOAN_PARAMETERS
        }));
    });

    it('should throw error for invalid interest rate', () => {
      const params = {
        boatPrice: 50000,
        downPayment: 10000,
        interestRate: 100, // Too high
        termMonths: 120
      };

      expect(() => ErrorValidation.validateFinanceParameters(params))
        .toThrow(expect.objectContaining({
          code: EnhancedErrorCodes.INVALID_INTEREST_RATE
        }));
    });

    it('should throw error for invalid loan term', () => {
      const params = {
        boatPrice: 50000,
        downPayment: 10000,
        interestRate: 5.5,
        termMonths: 500 // Too long
      };

      expect(() => ErrorValidation.validateFinanceParameters(params))
        .toThrow(expect.objectContaining({
          code: EnhancedErrorCodes.INVALID_LOAN_TERM
        }));
    });
  });

  describe('Tier Permissions Validation', () => {
    it('should validate valid tier permissions', () => {
      const userTier = {
        name: 'premium',
        features: ['advanced_search', 'priority_listing'],
        isPremium: true,
        expiresAt: Date.now() + 86400000 // 1 day from now
      };

      expect(() => ErrorValidation.validateTierPermissions(userTier, 'advanced_search'))
        .not.toThrow();
    });

    it('should throw error for missing tier', () => {
      expect(() => ErrorValidation.validateTierPermissions(null, 'advanced_search'))
        .toThrow(expect.objectContaining({
          code: EnhancedErrorCodes.USER_TIER_NOT_FOUND
        }));
    });

    it('should throw error for insufficient permissions', () => {
      const userTier = {
        name: 'basic',
        features: ['basic_search'],
        isPremium: false
      };

      expect(() => ErrorValidation.validateTierPermissions(userTier, 'advanced_search'))
        .toThrow(expect.objectContaining({
          code: EnhancedErrorCodes.INSUFFICIENT_TIER_PERMISSIONS
        }));
    });

    it('should throw error for expired premium membership', () => {
      const userTier = {
        name: 'premium',
        features: ['advanced_search'],
        isPremium: true,
        expiresAt: Date.now() - 86400000 // 1 day ago
      };

      expect(() => ErrorValidation.validateTierPermissions(userTier, 'advanced_search'))
        .toThrow(expect.objectContaining({
          code: EnhancedErrorCodes.PREMIUM_MEMBERSHIP_EXPIRED
        }));
    });
  });
});

describe('Error Context and Metadata', () => {
  it('should preserve error context', () => {
    const context = {
      userId: 'user-123',
      listingId: 'listing-456',
      operation: 'create_listing',
      parameters: { engineCount: 3 }
    };

    const error = createEnhancedError(
      EnhancedErrorCodes.ENGINE_LIMIT_EXCEEDED,
      ErrorSeverity.MEDIUM,
      ErrorCategory.BUSINESS_LOGIC,
      context
    );

    expect(error.context).toEqual(context);
  });

  it('should include recovery options in error', () => {
    const error = createEnhancedError(EnhancedErrorCodes.PAYMENT_PROCESSING_FAILED);

    expect(error.recoveryOptions).toBeDefined();
    expect(error.recoveryOptions).toBeDefined();
    expect(error.recoveryOptions!.length).toBeGreaterThan(0);
    expect(error.recoveryOptions![0]).toHaveProperty('action');
    expect(error.recoveryOptions![0]).toHaveProperty('description');
  });

  it('should set appropriate timestamp', () => {
    const beforeTime = Date.now();
    const error = createEnhancedError(EnhancedErrorCodes.DATABASE_CONNECTION_ERROR);
    const afterTime = Date.now();

    expect(error.timestamp).toBeGreaterThanOrEqual(beforeTime);
    expect(error.timestamp).toBeLessThanOrEqual(afterTime);
  });
});