/**
 * Enhanced Error Handling System for HarborList Marketplace
 * 
 * Provides comprehensive error types, handling mechanisms, and user-friendly
 * error messages for all new features including multi-engine boats, billing,
 * content moderation, user tiers, and finance calculations.
 * 
 * Features:
 * - Specific error types for each domain
 * - Error recovery mechanisms and fallback options
 * - User-friendly error message translation
 * - Structured error responses with context
 * - Error categorization and severity levels
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import { ErrorResponse } from '../types/common';

/**
 * Enhanced error codes for all new marketplace features
 */
export enum EnhancedErrorCodes {
  // Multi-engine boat errors
  INVALID_ENGINE_CONFIGURATION = 'INVALID_ENGINE_CONFIGURATION',
  MISSING_ENGINE_SPECIFICATIONS = 'MISSING_ENGINE_SPECIFICATIONS',
  ENGINE_VALIDATION_FAILED = 'ENGINE_VALIDATION_FAILED',
  DUPLICATE_ENGINE_POSITION = 'DUPLICATE_ENGINE_POSITION',
  INVALID_TOTAL_HORSEPOWER = 'INVALID_TOTAL_HORSEPOWER',
  ENGINE_LIMIT_EXCEEDED = 'ENGINE_LIMIT_EXCEEDED',
  
  // Content moderation errors
  MODERATION_QUEUE_FULL = 'MODERATION_QUEUE_FULL',
  INSUFFICIENT_MODERATION_PERMISSIONS = 'INSUFFICIENT_MODERATION_PERMISSIONS',
  MODERATION_ASSIGNMENT_FAILED = 'MODERATION_ASSIGNMENT_FAILED',
  INVALID_MODERATION_STATUS = 'INVALID_MODERATION_STATUS',
  MODERATION_DECISION_REQUIRED = 'MODERATION_DECISION_REQUIRED',
  LISTING_ALREADY_MODERATED = 'LISTING_ALREADY_MODERATED',
  MODERATION_TIMEOUT = 'MODERATION_TIMEOUT',
  
  // User tier and membership errors
  TIER_LIMIT_EXCEEDED = 'TIER_LIMIT_EXCEEDED',
  PREMIUM_MEMBERSHIP_EXPIRED = 'PREMIUM_MEMBERSHIP_EXPIRED',
  INVALID_USER_TYPE_TRANSITION = 'INVALID_USER_TYPE_TRANSITION',
  INSUFFICIENT_TIER_PERMISSIONS = 'INSUFFICIENT_TIER_PERMISSIONS',
  MEMBERSHIP_UPGRADE_FAILED = 'MEMBERSHIP_UPGRADE_FAILED',
  CAPABILITY_ASSIGNMENT_FAILED = 'CAPABILITY_ASSIGNMENT_FAILED',
  USER_TIER_NOT_FOUND = 'USER_TIER_NOT_FOUND',
  
  // Finance calculator errors
  INVALID_LOAN_PARAMETERS = 'INVALID_LOAN_PARAMETERS',
  CALCULATION_SAVE_FAILED = 'CALCULATION_SAVE_FAILED',
  CALCULATION_SHARE_FAILED = 'CALCULATION_SHARE_FAILED',
  INVALID_INTEREST_RATE = 'INVALID_INTEREST_RATE',
  INVALID_LOAN_TERM = 'INVALID_LOAN_TERM',
  CALCULATION_NOT_FOUND = 'CALCULATION_NOT_FOUND',
  CALCULATION_ACCESS_DENIED = 'CALCULATION_ACCESS_DENIED',
  
  // Billing and payment errors
  PAYMENT_PROCESSING_FAILED = 'PAYMENT_PROCESSING_FAILED',
  SUBSCRIPTION_NOT_FOUND = 'SUBSCRIPTION_NOT_FOUND',
  BILLING_ACCOUNT_SUSPENDED = 'BILLING_ACCOUNT_SUSPENDED',
  PAYMENT_METHOD_INVALID = 'PAYMENT_METHOD_INVALID',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  PAYMENT_DECLINED = 'PAYMENT_DECLINED',
  SUBSCRIPTION_CREATION_FAILED = 'SUBSCRIPTION_CREATION_FAILED',
  REFUND_PROCESSING_FAILED = 'REFUND_PROCESSING_FAILED',
  BILLING_ADDRESS_REQUIRED = 'BILLING_ADDRESS_REQUIRED',
  PAYMENT_PROCESSOR_ERROR = 'PAYMENT_PROCESSOR_ERROR',
  
  // Sales role and admin errors
  SALES_ASSIGNMENT_FAILED = 'SALES_ASSIGNMENT_FAILED',
  CUSTOMER_ACCESS_DENIED = 'CUSTOMER_ACCESS_DENIED',
  ADMIN_PERMISSION_REQUIRED = 'ADMIN_PERMISSION_REQUIRED',
  BULK_OPERATION_FAILED = 'BULK_OPERATION_FAILED',
  USER_MANAGEMENT_ERROR = 'USER_MANAGEMENT_ERROR',
  
  // SEO and listing errors
  SLUG_GENERATION_FAILED = 'SLUG_GENERATION_FAILED',
  DUPLICATE_SLUG = 'DUPLICATE_SLUG',
  INVALID_LISTING_STATUS = 'INVALID_LISTING_STATUS',
  LISTING_UPDATE_FAILED = 'LISTING_UPDATE_FAILED',
  
  // System and infrastructure errors
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  EXTERNAL_SERVICE_UNAVAILABLE = 'EXTERNAL_SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  RESOURCE_QUOTA_EXCEEDED = 'RESOURCE_QUOTA_EXCEEDED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}

/**
 * Error severity levels for categorization and handling
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories for better organization and handling
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  SYSTEM = 'system',
  USER_INPUT = 'user_input'
}

/**
 * Enhanced error interface with additional context and recovery options
 */
export interface EnhancedError extends Error {
  code: EnhancedErrorCodes;
  severity: ErrorSeverity;
  category: ErrorCategory;
  userMessage: string;
  technicalMessage: string;
  context?: Record<string, any>;
  recoveryOptions?: RecoveryOption[];
  retryable: boolean;
  timestamp: number;
  requestId?: string;
}

/**
 * Recovery option interface for providing user guidance
 */
export interface RecoveryOption {
  action: string;
  description: string;
  url?: string;
  automated?: boolean;
}

/**
 * Error context for providing additional debugging information
 */
export interface ErrorContext {
  userId?: string;
  listingId?: string;
  transactionId?: string;
  calculationId?: string;
  moderationId?: string;
  operation?: string;
  parameters?: Record<string, any>;
  stackTrace?: string;
  originalError?: string;
  [key: string]: any; // Allow additional context properties
}

/**
 * User-friendly error messages mapping
 */
export const ERROR_MESSAGES: Record<EnhancedErrorCodes, {
  userMessage: string;
  technicalMessage: string;
  recoveryOptions: RecoveryOption[];
}> = {
  // Multi-engine boat errors
  [EnhancedErrorCodes.INVALID_ENGINE_CONFIGURATION]: {
    userMessage: 'The engine configuration you specified is not valid. Please check that all engines have the required information.',
    technicalMessage: 'Engine configuration validation failed due to missing or invalid engine specifications',
    recoveryOptions: [
      { action: 'review_engines', description: 'Review and correct engine specifications' },
      { action: 'contact_support', description: 'Contact support for assistance with engine configuration' }
    ]
  },
  
  [EnhancedErrorCodes.MISSING_ENGINE_SPECIFICATIONS]: {
    userMessage: 'Some engine specifications are missing. Please provide all required engine details.',
    technicalMessage: 'Required engine specifications (type, horsepower, fuel type) are missing',
    recoveryOptions: [
      { action: 'complete_specs', description: 'Complete all required engine specifications' },
      { action: 'save_draft', description: 'Save as draft and complete later' }
    ]
  },
  
  [EnhancedErrorCodes.ENGINE_VALIDATION_FAILED]: {
    userMessage: 'One or more engines have invalid specifications. Please check the engine details.',
    technicalMessage: 'Engine validation failed due to invalid horsepower, fuel type, or other specifications',
    recoveryOptions: [
      { action: 'validate_engines', description: 'Check and correct engine specifications' },
      { action: 'remove_invalid', description: 'Remove engines with invalid specifications' }
    ]
  },
  
  [EnhancedErrorCodes.DUPLICATE_ENGINE_POSITION]: {
    userMessage: 'Multiple engines cannot have the same position. Please assign unique positions to each engine.',
    technicalMessage: 'Duplicate engine position detected in multi-engine configuration',
    recoveryOptions: [
      { action: 'reassign_positions', description: 'Assign unique positions to each engine' },
      { action: 'auto_assign', description: 'Automatically assign engine positions', automated: true }
    ]
  },
  
  [EnhancedErrorCodes.INVALID_TOTAL_HORSEPOWER]: {
    userMessage: 'The total horsepower calculation appears incorrect. Please verify your engine specifications.',
    technicalMessage: 'Total horsepower calculation does not match sum of individual engine horsepower',
    recoveryOptions: [
      { action: 'recalculate', description: 'Recalculate total horsepower automatically', automated: true },
      { action: 'manual_review', description: 'Manually review and correct engine horsepower values' }
    ]
  },
  
  [EnhancedErrorCodes.ENGINE_LIMIT_EXCEEDED]: {
    userMessage: 'You have exceeded the maximum number of engines allowed per boat listing.',
    technicalMessage: 'Engine count exceeds maximum allowed limit for boat listings',
    recoveryOptions: [
      { action: 'remove_engines', description: 'Remove some engines to stay within the limit' },
      { action: 'upgrade_tier', description: 'Upgrade to premium for higher engine limits', url: '/premium' }
    ]
  },
  
  // Content moderation errors
  [EnhancedErrorCodes.MODERATION_QUEUE_FULL]: {
    userMessage: 'The moderation queue is currently full. Your listing will be reviewed as soon as possible.',
    technicalMessage: 'Moderation queue has reached maximum capacity',
    recoveryOptions: [
      { action: 'wait_queue', description: 'Wait for queue to process current items' },
      { action: 'save_draft', description: 'Save listing as draft and submit later' }
    ]
  },
  
  [EnhancedErrorCodes.INSUFFICIENT_MODERATION_PERMISSIONS]: {
    userMessage: 'You do not have permission to perform this moderation action.',
    technicalMessage: 'User lacks required permissions for moderation operation',
    recoveryOptions: [
      { action: 'request_permissions', description: 'Request moderation permissions from administrator' },
      { action: 'contact_admin', description: 'Contact administrator for assistance' }
    ]
  },
  
  [EnhancedErrorCodes.MODERATION_ASSIGNMENT_FAILED]: {
    userMessage: 'Unable to assign this listing for moderation. Please try again.',
    technicalMessage: 'Failed to assign listing to moderation queue or moderator',
    recoveryOptions: [
      { action: 'retry_assignment', description: 'Retry moderation assignment' },
      { action: 'manual_assignment', description: 'Manually assign to specific moderator' }
    ]
  },
  
  [EnhancedErrorCodes.INVALID_MODERATION_STATUS]: {
    userMessage: 'The moderation status is invalid for this operation.',
    technicalMessage: 'Attempted operation not allowed for current moderation status',
    recoveryOptions: [
      { action: 'check_status', description: 'Check current moderation status' },
      { action: 'wait_review', description: 'Wait for moderation review to complete' }
    ]
  },
  
  [EnhancedErrorCodes.MODERATION_DECISION_REQUIRED]: {
    userMessage: 'A moderation decision is required before proceeding.',
    technicalMessage: 'Operation requires completed moderation decision',
    recoveryOptions: [
      { action: 'complete_review', description: 'Complete the moderation review' },
      { action: 'assign_moderator', description: 'Assign to another moderator' }
    ]
  },
  
  [EnhancedErrorCodes.LISTING_ALREADY_MODERATED]: {
    userMessage: 'This listing has already been moderated and cannot be changed.',
    technicalMessage: 'Attempted to modify listing that has completed moderation',
    recoveryOptions: [
      { action: 'view_decision', description: 'View moderation decision details' },
      { action: 'appeal_decision', description: 'Appeal the moderation decision' }
    ]
  },
  
  [EnhancedErrorCodes.MODERATION_TIMEOUT]: {
    userMessage: 'The moderation review has timed out. The listing will be reassigned for review.',
    technicalMessage: 'Moderation review exceeded maximum time limit',
    recoveryOptions: [
      { action: 'reassign_review', description: 'Reassign to another moderator', automated: true },
      { action: 'escalate_review', description: 'Escalate to senior moderator' }
    ]
  },
  
  // User tier and membership errors
  [EnhancedErrorCodes.TIER_LIMIT_EXCEEDED]: {
    userMessage: 'You have reached the limit for your current membership tier. Upgrade to continue.',
    technicalMessage: 'User has exceeded tier-specific limits (listings, images, etc.)',
    recoveryOptions: [
      { action: 'upgrade_tier', description: 'Upgrade to a higher tier', url: '/premium' },
      { action: 'remove_content', description: 'Remove some content to stay within limits' }
    ]
  },
  
  [EnhancedErrorCodes.PREMIUM_MEMBERSHIP_EXPIRED]: {
    userMessage: 'Your premium membership has expired. Renew to continue using premium features.',
    technicalMessage: 'Premium membership subscription has expired',
    recoveryOptions: [
      { action: 'renew_membership', description: 'Renew premium membership', url: '/premium/renew' },
      { action: 'downgrade_features', description: 'Continue with basic features' }
    ]
  },
  
  [EnhancedErrorCodes.INVALID_USER_TYPE_TRANSITION]: {
    userMessage: 'Cannot change to the requested user type. Please contact support for assistance.',
    technicalMessage: 'Invalid user type transition attempted',
    recoveryOptions: [
      { action: 'contact_support', description: 'Contact support for user type changes' },
      { action: 'review_requirements', description: 'Review requirements for user type change' }
    ]
  },
  
  [EnhancedErrorCodes.INSUFFICIENT_TIER_PERMISSIONS]: {
    userMessage: 'Your current membership tier does not include access to this feature.',
    technicalMessage: 'User tier lacks required permissions for requested operation',
    recoveryOptions: [
      { action: 'upgrade_tier', description: 'Upgrade to access this feature', url: '/premium' },
      { action: 'view_features', description: 'View available features for your tier' }
    ]
  },
  
  [EnhancedErrorCodes.MEMBERSHIP_UPGRADE_FAILED]: {
    userMessage: 'Unable to upgrade your membership at this time. Please try again or contact support.',
    technicalMessage: 'Membership upgrade process failed',
    recoveryOptions: [
      { action: 'retry_upgrade', description: 'Try upgrading again' },
      { action: 'contact_support', description: 'Contact support for upgrade assistance' }
    ]
  },
  
  [EnhancedErrorCodes.CAPABILITY_ASSIGNMENT_FAILED]: {
    userMessage: 'Unable to assign the requested capabilities. Please contact your administrator.',
    technicalMessage: 'Failed to assign user capabilities',
    recoveryOptions: [
      { action: 'contact_admin', description: 'Contact administrator for capability assignment' },
      { action: 'retry_assignment', description: 'Retry capability assignment' }
    ]
  },
  
  [EnhancedErrorCodes.USER_TIER_NOT_FOUND]: {
    userMessage: 'The requested user tier was not found. Please select a valid tier.',
    technicalMessage: 'Specified user tier does not exist',
    recoveryOptions: [
      { action: 'select_valid_tier', description: 'Select from available tiers' },
      { action: 'contact_support', description: 'Contact support if tier should exist' }
    ]
  },
  
  // Finance calculator errors
  [EnhancedErrorCodes.INVALID_LOAN_PARAMETERS]: {
    userMessage: 'The loan parameters you entered are not valid. Please check your inputs.',
    technicalMessage: 'Loan calculation parameters failed validation',
    recoveryOptions: [
      { action: 'correct_parameters', description: 'Correct the loan parameters' },
      { action: 'use_defaults', description: 'Use default loan parameters' }
    ]
  },
  
  [EnhancedErrorCodes.CALCULATION_SAVE_FAILED]: {
    userMessage: 'Unable to save your calculation. Please try again.',
    technicalMessage: 'Failed to save finance calculation to database',
    recoveryOptions: [
      { action: 'retry_save', description: 'Try saving again' },
      { action: 'export_calculation', description: 'Export calculation data' }
    ]
  },
  
  [EnhancedErrorCodes.CALCULATION_SHARE_FAILED]: {
    userMessage: 'Unable to create a shareable link for your calculation. Please try again.',
    technicalMessage: 'Failed to generate shareable calculation link',
    recoveryOptions: [
      { action: 'retry_share', description: 'Try creating share link again' },
      { action: 'copy_details', description: 'Copy calculation details manually' }
    ]
  },
  
  [EnhancedErrorCodes.INVALID_INTEREST_RATE]: {
    userMessage: 'The interest rate you entered is not valid. Please enter a rate between 0.1% and 50%.',
    technicalMessage: 'Interest rate outside acceptable range',
    recoveryOptions: [
      { action: 'correct_rate', description: 'Enter a valid interest rate' },
      { action: 'use_market_rate', description: 'Use current market rate', automated: true }
    ]
  },
  
  [EnhancedErrorCodes.INVALID_LOAN_TERM]: {
    userMessage: 'The loan term you entered is not valid. Please enter a term between 1 and 30 years.',
    technicalMessage: 'Loan term outside acceptable range',
    recoveryOptions: [
      { action: 'correct_term', description: 'Enter a valid loan term' },
      { action: 'use_standard_term', description: 'Use standard loan terms' }
    ]
  },
  
  [EnhancedErrorCodes.CALCULATION_NOT_FOUND]: {
    userMessage: 'The calculation you are looking for was not found.',
    technicalMessage: 'Finance calculation not found in database',
    recoveryOptions: [
      { action: 'create_new', description: 'Create a new calculation' },
      { action: 'view_saved', description: 'View your saved calculations' }
    ]
  },
  
  [EnhancedErrorCodes.CALCULATION_ACCESS_DENIED]: {
    userMessage: 'You do not have permission to access this calculation.',
    technicalMessage: 'User lacks permission to access finance calculation',
    recoveryOptions: [
      { action: 'request_access', description: 'Request access from calculation owner' },
      { action: 'create_own', description: 'Create your own calculation' }
    ]
  },
  
  // Billing and payment errors
  [EnhancedErrorCodes.PAYMENT_PROCESSING_FAILED]: {
    userMessage: 'Your payment could not be processed. Please check your payment information and try again.',
    technicalMessage: 'Payment processor returned failure response',
    recoveryOptions: [
      { action: 'retry_payment', description: 'Try payment again' },
      { action: 'update_payment_method', description: 'Update payment method' },
      { action: 'contact_bank', description: 'Contact your bank or card issuer' }
    ]
  },
  
  [EnhancedErrorCodes.SUBSCRIPTION_NOT_FOUND]: {
    userMessage: 'Your subscription was not found. Please contact support for assistance.',
    technicalMessage: 'Subscription record not found in database',
    recoveryOptions: [
      { action: 'contact_support', description: 'Contact support for subscription assistance' },
      { action: 'create_subscription', description: 'Create a new subscription' }
    ]
  },
  
  [EnhancedErrorCodes.BILLING_ACCOUNT_SUSPENDED]: {
    userMessage: 'Your billing account has been suspended. Please contact support to resolve this issue.',
    technicalMessage: 'Billing account is in suspended status',
    recoveryOptions: [
      { action: 'contact_support', description: 'Contact support to resolve suspension' },
      { action: 'update_payment', description: 'Update payment information' }
    ]
  },
  
  [EnhancedErrorCodes.PAYMENT_METHOD_INVALID]: {
    userMessage: 'Your payment method is invalid or expired. Please update your payment information.',
    technicalMessage: 'Payment method failed validation or is expired',
    recoveryOptions: [
      { action: 'update_payment_method', description: 'Update payment method' },
      { action: 'add_new_method', description: 'Add a new payment method' }
    ]
  },
  
  [EnhancedErrorCodes.INSUFFICIENT_FUNDS]: {
    userMessage: 'Your payment was declined due to insufficient funds. Please use a different payment method.',
    technicalMessage: 'Payment declined by processor due to insufficient funds',
    recoveryOptions: [
      { action: 'use_different_method', description: 'Use a different payment method' },
      { action: 'add_funds', description: 'Add funds to your account' }
    ]
  },
  
  [EnhancedErrorCodes.PAYMENT_DECLINED]: {
    userMessage: 'Your payment was declined. Please contact your bank or try a different payment method.',
    technicalMessage: 'Payment declined by payment processor',
    recoveryOptions: [
      { action: 'contact_bank', description: 'Contact your bank or card issuer' },
      { action: 'try_different_method', description: 'Try a different payment method' }
    ]
  },
  
  [EnhancedErrorCodes.SUBSCRIPTION_CREATION_FAILED]: {
    userMessage: 'Unable to create your subscription. Please try again or contact support.',
    technicalMessage: 'Failed to create subscription with payment processor',
    recoveryOptions: [
      { action: 'retry_subscription', description: 'Try creating subscription again' },
      { action: 'contact_support', description: 'Contact support for assistance' }
    ]
  },
  
  [EnhancedErrorCodes.REFUND_PROCESSING_FAILED]: {
    userMessage: 'Unable to process your refund at this time. Please contact support.',
    technicalMessage: 'Refund processing failed with payment processor',
    recoveryOptions: [
      { action: 'contact_support', description: 'Contact support for refund assistance' },
      { action: 'retry_refund', description: 'Retry refund processing' }
    ]
  },
  
  [EnhancedErrorCodes.BILLING_ADDRESS_REQUIRED]: {
    userMessage: 'A billing address is required for this payment. Please provide your billing information.',
    technicalMessage: 'Billing address required but not provided',
    recoveryOptions: [
      { action: 'add_billing_address', description: 'Add billing address information' },
      { action: 'use_saved_address', description: 'Use previously saved address' }
    ]
  },
  
  [EnhancedErrorCodes.PAYMENT_PROCESSOR_ERROR]: {
    userMessage: 'There was an issue with our payment system. Please try again in a few minutes.',
    technicalMessage: 'Payment processor returned system error',
    recoveryOptions: [
      { action: 'retry_later', description: 'Try again in a few minutes' },
      { action: 'contact_support', description: 'Contact support if problem persists' }
    ]
  },
  
  // Sales role and admin errors
  [EnhancedErrorCodes.SALES_ASSIGNMENT_FAILED]: {
    userMessage: 'Unable to assign sales representative. Please try again or contact support.',
    technicalMessage: 'Failed to assign sales representative to customer',
    recoveryOptions: [
      { action: 'retry_assignment', description: 'Try assignment again' },
      { action: 'manual_assignment', description: 'Manually assign sales representative' }
    ]
  },
  
  [EnhancedErrorCodes.CUSTOMER_ACCESS_DENIED]: {
    userMessage: 'You do not have permission to access this customer account.',
    technicalMessage: 'Sales representative lacks access to customer account',
    recoveryOptions: [
      { action: 'request_access', description: 'Request access from manager' },
      { action: 'contact_admin', description: 'Contact administrator for permissions' }
    ]
  },
  
  [EnhancedErrorCodes.ADMIN_PERMISSION_REQUIRED]: {
    userMessage: 'Administrator permissions are required for this action.',
    technicalMessage: 'Operation requires admin-level permissions',
    recoveryOptions: [
      { action: 'contact_admin', description: 'Contact administrator for assistance' },
      { action: 'request_permissions', description: 'Request elevated permissions' }
    ]
  },
  
  [EnhancedErrorCodes.BULK_OPERATION_FAILED]: {
    userMessage: 'The bulk operation could not be completed. Some items may have been processed.',
    technicalMessage: 'Bulk operation failed partially or completely',
    recoveryOptions: [
      { action: 'review_results', description: 'Review operation results' },
      { action: 'retry_failed', description: 'Retry failed items' }
    ]
  },
  
  [EnhancedErrorCodes.USER_MANAGEMENT_ERROR]: {
    userMessage: 'Unable to complete the user management operation. Please try again.',
    technicalMessage: 'User management operation failed',
    recoveryOptions: [
      { action: 'retry_operation', description: 'Retry the operation' },
      { action: 'contact_support', description: 'Contact support for assistance' }
    ]
  },
  
  // SEO and listing errors
  [EnhancedErrorCodes.SLUG_GENERATION_FAILED]: {
    userMessage: 'Unable to generate a URL for your listing. Please try again.',
    technicalMessage: 'SEO slug generation failed',
    recoveryOptions: [
      { action: 'retry_generation', description: 'Try generating URL again' },
      { action: 'manual_slug', description: 'Manually specify URL slug' }
    ]
  },
  
  [EnhancedErrorCodes.DUPLICATE_SLUG]: {
    userMessage: 'A listing with this URL already exists. Please modify your title or specify a different URL.',
    technicalMessage: 'Generated slug conflicts with existing listing',
    recoveryOptions: [
      { action: 'modify_title', description: 'Modify listing title' },
      { action: 'custom_slug', description: 'Specify custom URL slug' }
    ]
  },
  
  [EnhancedErrorCodes.INVALID_LISTING_STATUS]: {
    userMessage: 'The listing status is invalid for this operation.',
    technicalMessage: 'Operation not allowed for current listing status',
    recoveryOptions: [
      { action: 'check_status', description: 'Check current listing status' },
      { action: 'contact_support', description: 'Contact support for status issues' }
    ]
  },
  
  [EnhancedErrorCodes.LISTING_UPDATE_FAILED]: {
    userMessage: 'Unable to update your listing. Please try again.',
    technicalMessage: 'Listing update operation failed',
    recoveryOptions: [
      { action: 'retry_update', description: 'Try updating again' },
      { action: 'save_draft', description: 'Save changes as draft' }
    ]
  },
  
  // System and infrastructure errors
  [EnhancedErrorCodes.DATABASE_CONNECTION_ERROR]: {
    userMessage: 'We are experiencing technical difficulties. Please try again in a few minutes.',
    technicalMessage: 'Database connection failed',
    recoveryOptions: [
      { action: 'retry_later', description: 'Try again in a few minutes' },
      { action: 'contact_support', description: 'Contact support if problem persists' }
    ]
  },
  
  [EnhancedErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE]: {
    userMessage: 'A required service is temporarily unavailable. Please try again later.',
    technicalMessage: 'External service dependency is unavailable',
    recoveryOptions: [
      { action: 'retry_later', description: 'Try again later' },
      { action: 'use_fallback', description: 'Use alternative method if available' }
    ]
  },
  
  [EnhancedErrorCodes.RATE_LIMIT_EXCEEDED]: {
    userMessage: 'You have made too many requests. Please wait a moment before trying again.',
    technicalMessage: 'API rate limit exceeded',
    recoveryOptions: [
      { action: 'wait_retry', description: 'Wait before retrying' },
      { action: 'upgrade_limits', description: 'Upgrade for higher limits', url: '/premium' }
    ]
  },
  
  [EnhancedErrorCodes.RESOURCE_QUOTA_EXCEEDED]: {
    userMessage: 'You have exceeded your resource quota. Please upgrade your plan or contact support.',
    technicalMessage: 'Resource quota limit exceeded',
    recoveryOptions: [
      { action: 'upgrade_plan', description: 'Upgrade to higher quota plan', url: '/premium' },
      { action: 'contact_support', description: 'Contact support for quota increase' }
    ]
  },
  
  [EnhancedErrorCodes.CONFIGURATION_ERROR]: {
    userMessage: 'There is a configuration issue. Please contact support.',
    technicalMessage: 'System configuration error detected',
    recoveryOptions: [
      { action: 'contact_support', description: 'Contact support for configuration issues' },
      { action: 'check_settings', description: 'Check system settings' }
    ]
  }
};

/**
 * Creates an enhanced error with full context and recovery options
 */
export function createEnhancedError(
  code: EnhancedErrorCodes,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  category: ErrorCategory = ErrorCategory.BUSINESS_LOGIC,
  context?: ErrorContext,
  customMessage?: string,
  requestId?: string
): EnhancedError {
  const errorInfo = ERROR_MESSAGES[code];
  
  const error = new Error(customMessage || errorInfo.technicalMessage) as EnhancedError;
  error.code = code;
  error.severity = severity;
  error.category = category;
  error.userMessage = customMessage || errorInfo.userMessage;
  error.technicalMessage = errorInfo.technicalMessage;
  error.context = context;
  error.recoveryOptions = errorInfo.recoveryOptions;
  error.retryable = isRetryableError(code);
  error.timestamp = Date.now();
  error.requestId = requestId;
  
  return error;
}

/**
 * Determines if an error is retryable based on its code
 */
export function isRetryableError(code: EnhancedErrorCodes): boolean {
  const retryableErrors = [
    EnhancedErrorCodes.DATABASE_CONNECTION_ERROR,
    EnhancedErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE,
    EnhancedErrorCodes.PAYMENT_PROCESSING_FAILED,
    EnhancedErrorCodes.CALCULATION_SAVE_FAILED,
    EnhancedErrorCodes.MODERATION_ASSIGNMENT_FAILED,
    EnhancedErrorCodes.LISTING_UPDATE_FAILED,
    EnhancedErrorCodes.SLUG_GENERATION_FAILED,
    EnhancedErrorCodes.SUBSCRIPTION_CREATION_FAILED,
    EnhancedErrorCodes.REFUND_PROCESSING_FAILED
  ];
  
  return retryableErrors.includes(code);
}

/**
 * Creates a standardized error response for API Gateway with enhanced error information
 */
export function createEnhancedErrorResponse(
  error: EnhancedError,
  statusCode: number = 400,
  includeStackTrace: boolean = false
): ErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.userMessage,
      details: [
        {
          severity: error.severity,
          category: error.category,
          retryable: error.retryable,
          timestamp: error.timestamp,
          context: error.context,
          recoveryOptions: error.recoveryOptions,
          ...(includeStackTrace && { stackTrace: error.stack })
        }
      ],
      requestId: error.requestId || 'unknown'
    }
  };
}

/**
 * Error recovery utility functions
 */
export class ErrorRecovery {
  /**
   * Attempts automatic recovery for retryable errors
   */
  static async attemptRecovery<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: EnhancedError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as EnhancedError;
        
        if (!lastError.retryable || attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, backoffMs * Math.pow(2, attempt - 1)));
      }
    }
    
    throw lastError!;
  }
  
  /**
   * Provides fallback value for non-critical operations
   */
  static withFallback<T>(
    operation: () => T,
    fallbackValue: T,
    logError: boolean = true
  ): T {
    try {
      return operation();
    } catch (error) {
      if (logError) {
        console.warn('Operation failed, using fallback:', error);
      }
      return fallbackValue;
    }
  }
  
  /**
   * Graceful degradation for feature operations
   */
  static async gracefulDegrade<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>,
    defaultValue?: T
  ): Promise<T | undefined> {
    try {
      return await primaryOperation();
    } catch (error) {
      console.warn('Primary operation failed, attempting fallback:', error);
      
      if (fallbackOperation) {
        try {
          return await fallbackOperation();
        } catch (fallbackError) {
          console.warn('Fallback operation also failed:', fallbackError);
        }
      }
      
      return defaultValue;
    }
  }
}

/**
 * Error validation utilities
 */
export class ErrorValidation {
  /**
   * Validates engine configuration and throws appropriate errors
   */
  static validateEngineConfiguration(engines: any[]): void {
    if (!engines || engines.length === 0) {
      throw createEnhancedError(
        EnhancedErrorCodes.MISSING_ENGINE_SPECIFICATIONS,
        ErrorSeverity.HIGH,
        ErrorCategory.VALIDATION,
        { engineCount: 0 }
      );
    }
    
    const positions = new Set();
    let totalHorsepower = 0;
    
    for (const engine of engines) {
      // Check required fields
      if (!engine.type || !engine.horsepower || !engine.fuelType) {
        throw createEnhancedError(
          EnhancedErrorCodes.ENGINE_VALIDATION_FAILED,
          ErrorSeverity.HIGH,
          ErrorCategory.VALIDATION,
          { engine: engine }
        );
      }
      
      // Check for duplicate positions
      if (positions.has(engine.position)) {
        throw createEnhancedError(
          EnhancedErrorCodes.DUPLICATE_ENGINE_POSITION,
          ErrorSeverity.MEDIUM,
          ErrorCategory.VALIDATION,
          { position: engine.position }
        );
      }
      positions.add(engine.position);
      
      // Validate horsepower
      if (engine.horsepower <= 0 || engine.horsepower > 10000) {
        throw createEnhancedError(
          EnhancedErrorCodes.ENGINE_VALIDATION_FAILED,
          ErrorSeverity.HIGH,
          ErrorCategory.VALIDATION,
          { engine: engine, issue: 'invalid_horsepower' }
        );
      }
      
      totalHorsepower += engine.horsepower;
    }
    
    // Check engine limit
    if (engines.length > 4) {
      throw createEnhancedError(
        EnhancedErrorCodes.ENGINE_LIMIT_EXCEEDED,
        ErrorSeverity.MEDIUM,
        ErrorCategory.BUSINESS_LOGIC,
        { engineCount: engines.length, maxAllowed: 4 }
      );
    }
  }
  
  /**
   * Validates finance calculation parameters
   */
  static validateFinanceParameters(params: any): void {
    const { boatPrice, downPayment, interestRate, termMonths } = params;
    
    if (!boatPrice || boatPrice <= 0) {
      throw createEnhancedError(
        EnhancedErrorCodes.INVALID_LOAN_PARAMETERS,
        ErrorSeverity.HIGH,
        ErrorCategory.VALIDATION,
        { issue: 'invalid_boat_price', value: boatPrice }
      );
    }
    
    if (downPayment < 0 || downPayment >= boatPrice) {
      throw createEnhancedError(
        EnhancedErrorCodes.INVALID_LOAN_PARAMETERS,
        ErrorSeverity.HIGH,
        ErrorCategory.VALIDATION,
        { issue: 'invalid_down_payment', value: downPayment }
      );
    }
    
    if (!interestRate || interestRate < 0.1 || interestRate > 50) {
      throw createEnhancedError(
        EnhancedErrorCodes.INVALID_INTEREST_RATE,
        ErrorSeverity.HIGH,
        ErrorCategory.VALIDATION,
        { value: interestRate }
      );
    }
    
    if (!termMonths || termMonths < 12 || termMonths > 360) {
      throw createEnhancedError(
        EnhancedErrorCodes.INVALID_LOAN_TERM,
        ErrorSeverity.HIGH,
        ErrorCategory.VALIDATION,
        { value: termMonths }
      );
    }
  }
  
  /**
   * Validates user tier permissions
   */
  static validateTierPermissions(userTier: any, requiredFeature: string): void {
    if (!userTier) {
      throw createEnhancedError(
        EnhancedErrorCodes.USER_TIER_NOT_FOUND,
        ErrorSeverity.HIGH,
        ErrorCategory.AUTHENTICATION
      );
    }
    
    if (!userTier.features?.includes(requiredFeature)) {
      throw createEnhancedError(
        EnhancedErrorCodes.INSUFFICIENT_TIER_PERMISSIONS,
        ErrorSeverity.MEDIUM,
        ErrorCategory.AUTHORIZATION,
        { userTier: userTier.name, requiredFeature }
      );
    }
    
    if (userTier.isPremium && userTier.expiresAt && userTier.expiresAt < Date.now()) {
      throw createEnhancedError(
        EnhancedErrorCodes.PREMIUM_MEMBERSHIP_EXPIRED,
        ErrorSeverity.HIGH,
        ErrorCategory.AUTHORIZATION,
        { expiresAt: userTier.expiresAt }
      );
    }
  }
}