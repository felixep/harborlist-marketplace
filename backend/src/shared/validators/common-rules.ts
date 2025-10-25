/**
 * @fileoverview Common Validation Rules
 * 
 * Provides reusable validation rules for common patterns used across services.
 * Eliminates duplicate validation logic and ensures consistent validation behavior.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { ValidationRule, ValidationRuleResult } from './validation-framework';
import { validateEmail as utilValidateEmail, validatePrice as utilValidatePrice, validateYear as utilValidateYear } from '../utils';

/**
 * Common validation rules for HarborList services
 */
export class CommonRules {
  /**
   * Validates that a field is required (not empty, null, or undefined)
   * 
   * @param field - Field name
   * @param label - Human-readable field label (optional)
   * @returns Validation rule
   * 
   * @example
   * CommonRules.required('email', 'Email address')
   */
  static required(field: string, label?: string): ValidationRule {
    const fieldLabel = label || field;
    return {
      field,
      validate: (data): ValidationRuleResult => {
        const value = data[field];
        const isEmpty = value === undefined || value === null || value === '';
        
        return {
          isValid: !isEmpty,
          message: `${fieldLabel} is required`,
          code: 'REQUIRED_FIELD',
        };
      },
    };
  }

  /**
   * Validates email format
   * 
   * @param field - Field name (default: 'email')
   * @returns Validation rule
   * 
   * @example
   * CommonRules.email()
   * CommonRules.email('contactEmail')
   */
  static email(field: string = 'email'): ValidationRule {
    return {
      field,
      validate: (data): ValidationRuleResult => ({
        isValid: utilValidateEmail(data[field]),
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
      }),
    };
  }

  /**
   * Validates minimum string length
   * 
   * @param field - Field name
   * @param minLength - Minimum length
   * @param label - Human-readable field label
   * @returns Validation rule
   * 
   * @example
   * CommonRules.minLength('password', 8, 'Password')
   */
  static minLength(field: string, minLength: number, label?: string): ValidationRule {
    const fieldLabel = label || field;
    return {
      field,
      validate: (data): ValidationRuleResult => {
        const value = String(data[field] || '');
        return {
          isValid: value.length >= minLength,
          message: `${fieldLabel} must be at least ${minLength} characters`,
          code: 'MIN_LENGTH',
        };
      },
    };
  }

  /**
   * Validates maximum string length
   * 
   * @param field - Field name
   * @param maxLength - Maximum length
   * @param label - Human-readable field label
   * @returns Validation rule
   * 
   * @example
   * CommonRules.maxLength('title', 100, 'Title')
   */
  static maxLength(field: string, maxLength: number, label?: string): ValidationRule {
    const fieldLabel = label || field;
    return {
      field,
      validate: (data): ValidationRuleResult => {
        const value = String(data[field] || '');
        return {
          isValid: value.length <= maxLength,
          message: `${fieldLabel} must be at most ${maxLength} characters`,
          code: 'MAX_LENGTH',
        };
      },
    };
  }

  /**
   * Validates string length range
   * 
   * @param field - Field name
   * @param min - Minimum length
   * @param max - Maximum length
   * @param label - Human-readable field label
   * @returns Validation rule
   * 
   * @example
   * CommonRules.lengthRange('title', 10, 100, 'Title')
   */
  static lengthRange(field: string, min: number, max: number, label?: string): ValidationRule {
    const fieldLabel = label || field;
    return {
      field,
      validate: (data): ValidationRuleResult => {
        const value = String(data[field] || '');
        const length = value.length;
        return {
          isValid: length >= min && length <= max,
          message: `${fieldLabel} must be between ${min} and ${max} characters`,
          code: 'LENGTH_RANGE',
        };
      },
    };
  }

  /**
   * Validates price range ($1 - $10,000,000)
   * 
   * @param field - Field name (default: 'price')
   * @returns Validation rule
   * 
   * @example
   * CommonRules.priceRange()
   * CommonRules.priceRange('listingPrice')
   */
  static priceRange(field: string = 'price'): ValidationRule {
    return {
      field,
      validate: (data): ValidationRuleResult => ({
        isValid: utilValidatePrice(data[field]),
        message: 'Price must be between $1 and $10,000,000',
        code: 'INVALID_PRICE_RANGE',
      }),
    };
  }

  /**
   * Validates year range (1900 - current year + 1)
   * 
   * @param field - Field name (default: 'year')
   * @returns Validation rule
   * 
   * @example
   * CommonRules.yearRange()
   * CommonRules.yearRange('manufactureYear')
   */
  static yearRange(field: string = 'year'): ValidationRule {
    const currentYear = new Date().getFullYear();
    return {
      field,
      validate: (data): ValidationRuleResult => ({
        isValid: utilValidateYear(data[field]),
        message: `Year must be between 1900 and ${currentYear + 1}`,
        code: 'INVALID_YEAR_RANGE',
      }),
    };
  }

  /**
   * Validates numeric range
   * 
   * @param field - Field name
   * @param min - Minimum value
   * @param max - Maximum value
   * @param label - Human-readable field label
   * @returns Validation rule
   * 
   * @example
   * CommonRules.numericRange('horsepower', 1, 2000, 'Horsepower')
   */
  static numericRange(field: string, min: number, max: number, label?: string): ValidationRule {
    const fieldLabel = label || field;
    return {
      field,
      validate: (data): ValidationRuleResult => {
        const value = Number(data[field]);
        return {
          isValid: !isNaN(value) && value >= min && value <= max,
          message: `${fieldLabel} must be between ${min} and ${max}`,
          code: 'NUMERIC_RANGE',
        };
      },
    };
  }

  /**
   * Validates that value is one of allowed options
   * 
   * @param field - Field name
   * @param allowedValues - Array of allowed values
   * @param label - Human-readable field label
   * @returns Validation rule
   * 
   * @example
   * CommonRules.oneOf('status', ['active', 'pending', 'rejected'], 'Status')
   */
  static oneOf<T = string>(field: string, allowedValues: T[], label?: string): ValidationRule {
    const fieldLabel = label || field;
    return {
      field,
      validate: (data): ValidationRuleResult => ({
        isValid: allowedValues.includes(data[field]),
        message: `${fieldLabel} must be one of: ${allowedValues.join(', ')}`,
        code: 'INVALID_VALUE',
      }),
    };
  }

  /**
   * Validates UUID format
   * 
   * @param field - Field name
   * @param label - Human-readable field label
   * @returns Validation rule
   * 
   * @example
   * CommonRules.uuid('userId', 'User ID')
   */
  static uuid(field: string, label?: string): ValidationRule {
    const fieldLabel = label || field;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    return {
      field,
      validate: (data): ValidationRuleResult => ({
        isValid: uuidRegex.test(data[field]),
        message: `${fieldLabel} must be a valid UUID`,
        code: 'INVALID_UUID',
      }),
    };
  }

  /**
   * Validates boolean value
   * 
   * @param field - Field name
   * @param label - Human-readable field label
   * @returns Validation rule
   * 
   * @example
   * CommonRules.boolean('termsAccepted', 'Terms and Conditions')
   */
  static boolean(field: string, label?: string): ValidationRule {
    const fieldLabel = label || field;
    return {
      field,
      validate: (data): ValidationRuleResult => ({
        isValid: typeof data[field] === 'boolean',
        message: `${fieldLabel} must be true or false`,
        code: 'INVALID_BOOLEAN',
      }),
    };
  }

  /**
   * Validates password strength
   * 
   * @param field - Field name (default: 'password')
   * @param requireUppercase - Require uppercase letter (default: true)
   * @param requireNumber - Require number (default: true)
   * @param minLength - Minimum length (default: 8)
   * @returns Validation rule
   * 
   * @example
   * CommonRules.passwordStrength()
   * CommonRules.passwordStrength('newPassword', true, true, 12)
   */
  static passwordStrength(
    field: string = 'password',
    requireUppercase: boolean = true,
    requireNumber: boolean = true,
    minLength: number = 8
  ): ValidationRule {
    return {
      field,
      validate: (data): ValidationRuleResult => {
        const password = data[field] || '';
        const requirements: string[] = [];

        if (password.length < minLength) {
          requirements.push(`at least ${minLength} characters`);
        }
        if (requireUppercase && !/[A-Z]/.test(password)) {
          requirements.push('one uppercase letter');
        }
        if (!/[a-z]/.test(password)) {
          requirements.push('one lowercase letter');
        }
        if (requireNumber && !/\d/.test(password)) {
          requirements.push('one number');
        }

        if (requirements.length > 0) {
          return {
            isValid: false,
            message: `Password must contain ${requirements.join(', ')}`,
            code: 'WEAK_PASSWORD',
          };
        }

        return { isValid: true };
      },
    };
  }

  /**
   * Validates array is not empty
   * 
   * @param field - Field name
   * @param label - Human-readable field label
   * @returns Validation rule
   * 
   * @example
   * CommonRules.arrayNotEmpty('images', 'Images')
   */
  static arrayNotEmpty(field: string, label?: string): ValidationRule {
    const fieldLabel = label || field;
    return {
      field,
      validate: (data): ValidationRuleResult => {
        const value = data[field];
        return {
          isValid: Array.isArray(value) && value.length > 0,
          message: `${fieldLabel} must contain at least one item`,
          code: 'ARRAY_EMPTY',
        };
      },
    };
  }

  /**
   * Validates array length range
   * 
   * @param field - Field name
   * @param min - Minimum array length
   * @param max - Maximum array length
   * @param label - Human-readable field label
   * @returns Validation rule
   * 
   * @example
   * CommonRules.arrayLength('images', 1, 20, 'Images')
   */
  static arrayLength(field: string, min: number, max: number, label?: string): ValidationRule {
    const fieldLabel = label || field;
    return {
      field,
      validate: (data): ValidationRuleResult => {
        const value = data[field];
        if (!Array.isArray(value)) {
          return {
            isValid: false,
            message: `${fieldLabel} must be an array`,
            code: 'INVALID_TYPE',
          };
        }
        
        return {
          isValid: value.length >= min && value.length <= max,
          message: `${fieldLabel} must contain between ${min} and ${max} items`,
          code: 'ARRAY_LENGTH',
        };
      },
    };
  }

  /**
   * Makes a validation rule optional
   * 
   * @param rule - Rule to make optional
   * @returns Optional validation rule
   * 
   * @example
   * CommonRules.optional(CommonRules.email('secondaryEmail'))
   */
  static optional(rule: ValidationRule): ValidationRule {
    return {
      ...rule,
      optional: true,
    };
  }
}
