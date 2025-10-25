/**
 * @fileoverview Declarative Validation Framework
 * 
 * Provides a reusable, type-safe validation framework to eliminate
 * duplicate validation code across all service handlers.
 * 
 * Features:
 * - Declarative validation rules
 * - Type-safe validation
 * - Composable validators
 * - Field-specific error messages
 * - Common validation patterns
 * 
 * Benefits:
 * - Reduces ~300 lines of duplicate validation code
 * - Consistent validation errors across endpoints
 * - Easier to add new validation rules
 * - Better error messages with field details
 * - Supports complex validation chains
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { APIGatewayProxyResult } from 'aws-lambda';
import { createErrorResponse } from '../utils';

/**
 * Validation result for a single rule
 */
export interface ValidationRuleResult {
  isValid: boolean;
  message?: string;
  code?: string;
}

/**
 * Validation error with field context
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * Validation rule interface
 */
export interface ValidationRule<T = any> {
  field: string;
  validate: (data: any) => ValidationRuleResult;
  optional?: boolean;
}

/**
 * Result of validation framework execution
 */
export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors?: ValidationError[];
  response?: APIGatewayProxyResult;
}

/**
 * Declarative Validation Framework
 * 
 * Provides type-safe, declarative validation with automatic error responses.
 */
export class ValidationFramework {
  /**
   * Validates data against a set of rules
   * 
   * @template T - Type of validated data
   * @param data - Data to validate
   * @param rules - Array of validation rules
   * @param requestId - Request tracking ID
   * @returns Validation result with errors or validated data
   * 
   * @example
   * const validation = ValidationFramework.validate(
   *   body,
   *   [
   *     CommonRules.required('email'),
   *     CommonRules.email(),
   *     CommonRules.required('password'),
   *   ],
   *   requestId
   * );
   * if (!validation.isValid) return validation.response;
   */
  static validate<T = any>(
    data: any,
    rules: ValidationRule<T>[],
    requestId: string
  ): ValidationResult<T> {
    const errors: ValidationError[] = [];

    for (const rule of rules) {
      // Skip validation if field is optional and not present
      if (rule.optional && (data[rule.field] === undefined || data[rule.field] === null)) {
        continue;
      }

      const result = rule.validate(data);
      if (!result.isValid) {
        errors.push({
          field: rule.field,
          message: result.message || `Validation failed for ${rule.field}`,
          code: result.code || 'VALIDATION_ERROR',
          value: data[rule.field],
        });
      }
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        response: createErrorResponse(
          400,
          'VALIDATION_ERROR',
          errors.length === 1 
            ? errors[0].message 
            : `Validation failed for ${errors.length} field(s)`,
          requestId,
          errors as any[]
        ),
      };
    }

    return {
      isValid: true,
      data: data as T,
    };
  }

  /**
   * Combines multiple validation rules with AND logic
   * 
   * @param rules - Rules to combine
   * @returns Combined validation rule
   * 
   * @example
   * const passwordRule = ValidationFramework.combine([
   *   CommonRules.required('password'),
   *   CommonRules.minLength('password', 8),
   *   CommonRules.hasUppercase('password'),
   * ]);
   */
  static combine(rules: ValidationRule[]): ValidationRule {
    return {
      field: rules[0]?.field || 'combined',
      validate: (data) => {
        for (const rule of rules) {
          const result = rule.validate(data);
          if (!result.isValid) {
            return result;
          }
        }
        return { isValid: true };
      },
    };
  }

  /**
   * Creates a custom validation rule
   * 
   * @param field - Field name to validate
   * @param validator - Validation function
   * @param errorMessage - Error message if validation fails
   * @param errorCode - Error code
   * @returns Validation rule
   * 
   * @example
   * const customRule = ValidationFramework.custom(
   *   'age',
   *   (value) => value >= 18,
   *   'Must be 18 or older',
   *   'AGE_REQUIREMENT'
   * );
   */
  static custom(
    field: string,
    validator: (value: any, data: any) => boolean,
    errorMessage: string,
    errorCode: string = 'CUSTOM_VALIDATION_ERROR'
  ): ValidationRule {
    return {
      field,
      validate: (data) => ({
        isValid: validator(data[field], data),
        message: errorMessage,
        code: errorCode,
      }),
    };
  }
}
