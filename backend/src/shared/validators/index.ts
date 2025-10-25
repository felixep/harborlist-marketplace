/**
 * @fileoverview Validators Export Module
 * 
 * Central export point for all validation utilities.
 * Simplifies imports across services.
 * 
 * @example
 * import { ValidationFramework, CommonRules } from '../shared/validators';
 */

export { ValidationFramework } from './validation-framework';
export type { ValidationRule, ValidationRuleResult, ValidationError } from './validation-framework';
export { CommonRules } from './common-rules';
