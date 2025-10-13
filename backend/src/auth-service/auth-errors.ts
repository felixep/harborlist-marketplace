/**
 * @fileoverview Comprehensive error handling for AWS Cognito dual-pool authentication
 * 
 * This module provides standardized error handling for both Customer and Staff User Pools,
 * including specific Cognito error mapping, user-friendly messages, and proper logging
 * with request tracking for audit and debugging purposes.
 * 
 * Features:
 * - Cognito-specific error code mapping
 * - User-friendly error messages per user type
 * - Cross-pool access prevention errors
 * - Request tracking and audit logging
 * - Recovery suggestions and retry logic
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import { ErrorSeverity, ErrorCategory } from '../shared/errors';
import { logAuthEvent } from './audit-service';

/**
 * Authentication-specific error codes for dual-pool architecture
 */
export enum AuthErrorCodes {
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_NOT_CONFIRMED = 'USER_NOT_CONFIRMED',
  PASSWORD_RESET_REQUIRED = 'PASSWORD_RESET_REQUIRED',
  TEMPORARY_PASSWORD_EXPIRED = 'TEMPORARY_PASSWORD_EXPIRED',
  
  // Token errors
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  TOKEN_VALIDATION_FAILED = 'TOKEN_VALIDATION_FAILED',
  
  // MFA errors
  MFA_REQUIRED = 'MFA_REQUIRED',
  MFA_CODE_INVALID = 'MFA_CODE_INVALID',
  MFA_CODE_EXPIRED = 'MFA_CODE_EXPIRED',
  MFA_SETUP_REQUIRED = 'MFA_SETUP_REQUIRED',
  MFA_CHALLENGE_FAILED = 'MFA_CHALLENGE_FAILED',
  
  // Rate limiting and security
  RATE_LIMITED = 'RATE_LIMITED',
  IP_BLOCKED = 'IP_BLOCKED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  
  // Cross-pool access errors
  CROSS_POOL_ACCESS_DENIED = 'CROSS_POOL_ACCESS_DENIED',
  CUSTOMER_TOKEN_ON_STAFF_ENDPOINT = 'CUSTOMER_TOKEN_ON_STAFF_ENDPOINT',
  STAFF_TOKEN_ON_CUSTOMER_ENDPOINT = 'STAFF_TOKEN_ON_CUSTOMER_ENDPOINT',
  
  // Permission errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ROLE_NOT_AUTHORIZED = 'ROLE_NOT_AUTHORIZED',
  TIER_ACCESS_DENIED = 'TIER_ACCESS_DENIED',
  
  // Registration errors
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  INVALID_EMAIL = 'INVALID_EMAIL',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  
  // Password reset errors
  INVALID_VERIFICATION_CODE = 'INVALID_VERIFICATION_CODE',
  CODE_EXPIRED = 'CODE_EXPIRED',
  PASSWORD_RESET_FAILED = 'PASSWORD_RESET_FAILED',
  
  // System errors
  COGNITO_SERVICE_ERROR = 'COGNITO_SERVICE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * Authentication error interface with dual-pool context
 */
export interface AuthError {
  code: AuthErrorCodes;
  message: string;
  userMessage: string;
  userType: 'customer' | 'staff';
  severity: ErrorSeverity;
  category: ErrorCategory;
  retryable: boolean;
  timestamp: string;
  requestId?: string;
  context?: {
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    poolType?: 'customer' | 'staff';
    originalError?: string;
    [key: string]: any;
  };
  recoveryOptions?: RecoveryOption[];
}

/**
 * Recovery option interface for user guidance
 */
export interface RecoveryOption {
  action: string;
  description: string;
  url?: string;
  automated?: boolean;
  userType?: 'customer' | 'staff';
}

/**
 * Cognito error code mapping to our standardized error codes
 */
const COGNITO_ERROR_MAPPING: Record<string, AuthErrorCodes> = {
  // Authentication errors
  'NotAuthorizedException': AuthErrorCodes.INVALID_CREDENTIALS,
  'UserNotFoundException': AuthErrorCodes.USER_NOT_FOUND,
  'UserNotConfirmedException': AuthErrorCodes.USER_NOT_CONFIRMED,
  'PasswordResetRequiredException': AuthErrorCodes.PASSWORD_RESET_REQUIRED,
  'InvalidPasswordException': AuthErrorCodes.INVALID_PASSWORD,
  'TempPasswordException': AuthErrorCodes.TEMPORARY_PASSWORD_EXPIRED,
  
  // Token errors
  'TokenValidationException': AuthErrorCodes.TOKEN_INVALID,
  'ExpiredTokenException': AuthErrorCodes.TOKEN_EXPIRED,
  'InvalidTokenException': AuthErrorCodes.TOKEN_INVALID,
  
  // MFA errors
  'ChallengeMismatchException': AuthErrorCodes.MFA_CHALLENGE_FAILED,
  'CodeMismatchException': AuthErrorCodes.MFA_CODE_INVALID,
  'ExpiredCodeException': AuthErrorCodes.MFA_CODE_EXPIRED,
  'MFAMethodNotFoundException': AuthErrorCodes.MFA_SETUP_REQUIRED,
  
  // Rate limiting
  'TooManyRequestsException': AuthErrorCodes.RATE_LIMITED,
  'TooManyFailedAttemptsException': AuthErrorCodes.ACCOUNT_LOCKED,
  
  // Registration errors
  'UsernameExistsException': AuthErrorCodes.USER_ALREADY_EXISTS,
  'InvalidParameterException': AuthErrorCodes.INVALID_EMAIL,
  
  // Password reset errors
  'CodeDeliveryFailureException': AuthErrorCodes.PASSWORD_RESET_FAILED,
  'InvalidVerificationCodeException': AuthErrorCodes.INVALID_VERIFICATION_CODE,
  
  // System errors
  'InternalErrorException': AuthErrorCodes.INTERNAL_ERROR,
  'ServiceUnavailableException': AuthErrorCodes.COGNITO_SERVICE_ERROR,
  'NetworkingError': AuthErrorCodes.NETWORK_ERROR
};

/**
 * User-friendly error messages for different user types
 */
const ERROR_MESSAGES: Record<AuthErrorCodes, {
  customer: { message: string; userMessage: string; recoveryOptions: RecoveryOption[] };
  staff: { message: string; userMessage: string; recoveryOptions: RecoveryOption[] };
}> = {
  [AuthErrorCodes.INVALID_CREDENTIALS]: {
    customer: {
      message: 'Invalid email or password provided for customer login',
      userMessage: 'The email or password you entered is incorrect. Please check your credentials and try again.',
      recoveryOptions: [
        { action: 'retry_login', description: 'Double-check your email and password and try again' },
        { action: 'forgot_password', description: 'Reset your password if you\'ve forgotten it', url: '/auth/forgot-password' },
        { action: 'contact_support', description: 'Contact customer support for help', url: '/support' }
      ]
    },
    staff: {
      message: 'Invalid email or password provided for staff login',
      userMessage: 'Invalid login credentials. Please verify your email and password.',
      recoveryOptions: [
        { action: 'retry_login', description: 'Verify your credentials and try again' },
        { action: 'forgot_password', description: 'Reset your password', url: '/admin/auth/forgot-password' },
        { action: 'contact_admin', description: 'Contact your administrator for assistance' }
      ]
    }
  },
  
  [AuthErrorCodes.USER_NOT_FOUND]: {
    customer: {
      message: 'Customer account not found',
      userMessage: 'No account found with this email address. Please check your email or create a new account.',
      recoveryOptions: [
        { action: 'check_email', description: 'Double-check the email address you entered' },
        { action: 'create_account', description: 'Create a new account', url: '/auth/register' },
        { action: 'contact_support', description: 'Contact support if you believe this is an error', url: '/support' }
      ]
    },
    staff: {
      message: 'Staff account not found',
      userMessage: 'No staff account found with this email address. Please contact your administrator.',
      recoveryOptions: [
        { action: 'check_email', description: 'Verify the email address you entered' },
        { action: 'contact_admin', description: 'Contact your administrator to verify your account status' }
      ]
    }
  },
  
  [AuthErrorCodes.USER_NOT_CONFIRMED]: {
    customer: {
      message: 'Customer account not verified',
      userMessage: 'Your account hasn\'t been verified yet. Please check your email for a verification link.',
      recoveryOptions: [
        { action: 'check_email', description: 'Check your email for the verification link' },
        { action: 'resend_verification', description: 'Resend verification email', url: '/auth/resend-verification' },
        { action: 'contact_support', description: 'Contact support if you need help', url: '/support' }
      ]
    },
    staff: {
      message: 'Staff account not confirmed',
      userMessage: 'Your staff account needs to be confirmed. Please contact your administrator.',
      recoveryOptions: [
        { action: 'contact_admin', description: 'Contact your administrator to confirm your account' }
      ]
    }
  },
  
  [AuthErrorCodes.PASSWORD_RESET_REQUIRED]: {
    customer: {
      message: 'Password reset required for customer account',
      userMessage: 'You need to reset your password before you can log in.',
      recoveryOptions: [
        { action: 'reset_password', description: 'Reset your password now', url: '/auth/forgot-password' }
      ]
    },
    staff: {
      message: 'Password reset required for staff account',
      userMessage: 'Your password needs to be reset. Please use the password reset option.',
      recoveryOptions: [
        { action: 'reset_password', description: 'Reset your password', url: '/admin/auth/forgot-password' }
      ]
    }
  },
  
  [AuthErrorCodes.TEMPORARY_PASSWORD_EXPIRED]: {
    customer: {
      message: 'Temporary password expired for customer',
      userMessage: 'Your temporary password has expired. Please request a new password reset.',
      recoveryOptions: [
        { action: 'request_new_reset', description: 'Request a new password reset', url: '/auth/forgot-password' }
      ]
    },
    staff: {
      message: 'Temporary password expired for staff member',
      userMessage: 'Your temporary password has expired. Please contact your administrator.',
      recoveryOptions: [
        { action: 'contact_admin', description: 'Contact your administrator for a new temporary password' }
      ]
    }
  },
  
  [AuthErrorCodes.TOKEN_EXPIRED]: {
    customer: {
      message: 'Customer access token has expired',
      userMessage: 'Your session has expired. Please log in again.',
      recoveryOptions: [
        { action: 'login_again', description: 'Log in again', url: '/auth/login' },
        { action: 'refresh_token', description: 'Refresh your session', automated: true }
      ]
    },
    staff: {
      message: 'Staff access token has expired',
      userMessage: 'Your session has expired. Please log in again.',
      recoveryOptions: [
        { action: 'login_again', description: 'Log in again', url: '/admin/auth/login' },
        { action: 'refresh_token', description: 'Refresh your session', automated: true }
      ]
    }
  },
  
  [AuthErrorCodes.TOKEN_INVALID]: {
    customer: {
      message: 'Invalid customer access token',
      userMessage: 'Your session is invalid. Please log in again.',
      recoveryOptions: [
        { action: 'login_again', description: 'Log in again', url: '/auth/login' }
      ]
    },
    staff: {
      message: 'Invalid staff access token',
      userMessage: 'Your session is invalid. Please log in again.',
      recoveryOptions: [
        { action: 'login_again', description: 'Log in again', url: '/admin/auth/login' }
      ]
    }
  },
  
  [AuthErrorCodes.TOKEN_REFRESH_FAILED]: {
    customer: {
      message: 'Failed to refresh customer token',
      userMessage: 'Unable to refresh your session. Please log in again.',
      recoveryOptions: [
        { action: 'login_again', description: 'Log in again', url: '/auth/login' }
      ]
    },
    staff: {
      message: 'Failed to refresh staff token',
      userMessage: 'Unable to refresh your session. Please log in again.',
      recoveryOptions: [
        { action: 'login_again', description: 'Log in again', url: '/admin/auth/login' }
      ]
    }
  },
  
  [AuthErrorCodes.TOKEN_VALIDATION_FAILED]: {
    customer: {
      message: 'Customer token validation failed',
      userMessage: 'Session validation failed. Please log in again.',
      recoveryOptions: [
        { action: 'login_again', description: 'Log in again', url: '/auth/login' }
      ]
    },
    staff: {
      message: 'Staff token validation failed',
      userMessage: 'Session validation failed. Please log in again.',
      recoveryOptions: [
        { action: 'login_again', description: 'Log in again', url: '/admin/auth/login' }
      ]
    }
  },
  
  [AuthErrorCodes.MFA_REQUIRED]: {
    customer: {
      message: 'MFA verification required for customer',
      userMessage: 'Multi-factor authentication is required. Please enter your verification code.',
      recoveryOptions: [
        { action: 'enter_mfa_code', description: 'Enter your MFA verification code' },
        { action: 'use_backup_code', description: 'Use a backup code if available' },
        { action: 'contact_support', description: 'Contact support if you can\'t access your MFA device', url: '/support' }
      ]
    },
    staff: {
      message: 'MFA verification required for staff member',
      userMessage: 'Multi-factor authentication is required. Please enter your verification code.',
      recoveryOptions: [
        { action: 'enter_mfa_code', description: 'Enter your MFA verification code' },
        { action: 'use_backup_code', description: 'Use a backup code if available' },
        { action: 'contact_admin', description: 'Contact your administrator if you can\'t access your MFA device' }
      ]
    }
  },
  
  [AuthErrorCodes.MFA_CODE_INVALID]: {
    customer: {
      message: 'Invalid MFA code provided by customer',
      userMessage: 'The verification code you entered is incorrect. Please try again.',
      recoveryOptions: [
        { action: 'retry_mfa_code', description: 'Enter the verification code again' },
        { action: 'use_backup_code', description: 'Use a backup code instead' },
        { action: 'contact_support', description: 'Contact support for help', url: '/support' }
      ]
    },
    staff: {
      message: 'Invalid MFA code provided by staff member',
      userMessage: 'The verification code is incorrect. Please try again.',
      recoveryOptions: [
        { action: 'retry_mfa_code', description: 'Enter the verification code again' },
        { action: 'use_backup_code', description: 'Use a backup code instead' },
        { action: 'contact_admin', description: 'Contact your administrator for assistance' }
      ]
    }
  },
  
  [AuthErrorCodes.MFA_CODE_EXPIRED]: {
    customer: {
      message: 'MFA code expired for customer',
      userMessage: 'The verification code has expired. Please request a new one.',
      recoveryOptions: [
        { action: 'request_new_code', description: 'Request a new verification code' },
        { action: 'use_backup_code', description: 'Use a backup code instead' }
      ]
    },
    staff: {
      message: 'MFA code expired for staff member',
      userMessage: 'The verification code has expired. Please request a new one.',
      recoveryOptions: [
        { action: 'request_new_code', description: 'Request a new verification code' },
        { action: 'use_backup_code', description: 'Use a backup code instead' }
      ]
    }
  },
  
  [AuthErrorCodes.MFA_SETUP_REQUIRED]: {
    customer: {
      message: 'MFA setup required for customer account',
      userMessage: 'You need to set up multi-factor authentication before you can continue.',
      recoveryOptions: [
        { action: 'setup_mfa', description: 'Set up multi-factor authentication', url: '/auth/setup-mfa' }
      ]
    },
    staff: {
      message: 'MFA setup required for staff account',
      userMessage: 'Multi-factor authentication setup is required for your account.',
      recoveryOptions: [
        { action: 'setup_mfa', description: 'Set up multi-factor authentication', url: '/admin/auth/setup-mfa' }
      ]
    }
  },
  
  [AuthErrorCodes.MFA_CHALLENGE_FAILED]: {
    customer: {
      message: 'MFA challenge failed for customer',
      userMessage: 'Multi-factor authentication challenge failed. Please try again.',
      recoveryOptions: [
        { action: 'retry_mfa', description: 'Try the MFA challenge again' },
        { action: 'contact_support', description: 'Contact support for assistance', url: '/support' }
      ]
    },
    staff: {
      message: 'MFA challenge failed for staff member',
      userMessage: 'Multi-factor authentication challenge failed. Please try again.',
      recoveryOptions: [
        { action: 'retry_mfa', description: 'Try the MFA challenge again' },
        { action: 'contact_admin', description: 'Contact your administrator for assistance' }
      ]
    }
  },
  
  [AuthErrorCodes.RATE_LIMITED]: {
    customer: {
      message: 'Rate limit exceeded for customer authentication',
      userMessage: 'Too many login attempts. Please wait a few minutes before trying again.',
      recoveryOptions: [
        { action: 'wait_and_retry', description: 'Wait 5-10 minutes and try again' },
        { action: 'contact_support', description: 'Contact support if you continue having issues', url: '/support' }
      ]
    },
    staff: {
      message: 'Rate limit exceeded for staff authentication',
      userMessage: 'Too many login attempts. Please wait before trying again.',
      recoveryOptions: [
        { action: 'wait_and_retry', description: 'Wait 5-10 minutes and try again' },
        { action: 'contact_admin', description: 'Contact your administrator if this persists' }
      ]
    }
  },
  
  [AuthErrorCodes.IP_BLOCKED]: {
    customer: {
      message: 'IP address blocked for customer access',
      userMessage: 'Access from your location has been temporarily blocked due to suspicious activity.',
      recoveryOptions: [
        { action: 'try_different_network', description: 'Try from a different network or location' },
        { action: 'contact_support', description: 'Contact support to resolve this issue', url: '/support' }
      ]
    },
    staff: {
      message: 'IP address blocked for staff access',
      userMessage: 'Access from your IP address has been blocked. Please contact your administrator.',
      recoveryOptions: [
        { action: 'contact_admin', description: 'Contact your administrator to unblock your IP address' }
      ]
    }
  },
  
  [AuthErrorCodes.ACCOUNT_LOCKED]: {
    customer: {
      message: 'Customer account locked due to failed attempts',
      userMessage: 'Your account has been temporarily locked due to too many failed login attempts.',
      recoveryOptions: [
        { action: 'wait_unlock', description: 'Wait for the account to unlock automatically (usually 15-30 minutes)' },
        { action: 'reset_password', description: 'Reset your password to unlock your account', url: '/auth/forgot-password' },
        { action: 'contact_support', description: 'Contact support for immediate assistance', url: '/support' }
      ]
    },
    staff: {
      message: 'Staff account locked due to failed attempts',
      userMessage: 'Your account has been locked due to multiple failed login attempts.',
      recoveryOptions: [
        { action: 'wait_unlock', description: 'Wait for automatic unlock (usually 15-30 minutes)' },
        { action: 'contact_admin', description: 'Contact your administrator to unlock your account immediately' }
      ]
    }
  },
  
  [AuthErrorCodes.SUSPICIOUS_ACTIVITY]: {
    customer: {
      message: 'Suspicious activity detected on customer account',
      userMessage: 'Unusual activity has been detected on your account. Additional verification may be required.',
      recoveryOptions: [
        { action: 'verify_identity', description: 'Complete additional identity verification' },
        { action: 'contact_support', description: 'Contact support for assistance', url: '/support' }
      ]
    },
    staff: {
      message: 'Suspicious activity detected on staff account',
      userMessage: 'Suspicious activity detected. Please contact your administrator immediately.',
      recoveryOptions: [
        { action: 'contact_admin', description: 'Contact your administrator immediately' }
      ]
    }
  },
  
  [AuthErrorCodes.CROSS_POOL_ACCESS_DENIED]: {
    customer: {
      message: 'Customer attempting to access staff resources',
      userMessage: 'You don\'t have permission to access this resource.',
      recoveryOptions: [
        { action: 'return_customer_area', description: 'Return to the customer area', url: '/dashboard' }
      ]
    },
    staff: {
      message: 'Staff attempting to access customer resources',
      userMessage: 'You don\'t have permission to access this resource.',
      recoveryOptions: [
        { action: 'return_admin_area', description: 'Return to the admin area', url: '/admin/dashboard' }
      ]
    }
  },
  
  [AuthErrorCodes.CUSTOMER_TOKEN_ON_STAFF_ENDPOINT]: {
    customer: {
      message: 'Customer token used on staff endpoint',
      userMessage: 'You don\'t have permission to access administrative functions.',
      recoveryOptions: [
        { action: 'return_customer_area', description: 'Return to your customer dashboard', url: '/dashboard' }
      ]
    },
    staff: {
      message: 'Customer token incorrectly used on staff endpoint',
      userMessage: 'Invalid access attempt detected.',
      recoveryOptions: [
        { action: 'login_staff', description: 'Log in with your staff credentials', url: '/admin/auth/login' }
      ]
    }
  },
  
  [AuthErrorCodes.STAFF_TOKEN_ON_CUSTOMER_ENDPOINT]: {
    customer: {
      message: 'Staff token incorrectly used on customer endpoint',
      userMessage: 'Invalid access attempt detected.',
      recoveryOptions: [
        { action: 'login_customer', description: 'Log in with your customer credentials', url: '/auth/login' }
      ]
    },
    staff: {
      message: 'Staff token used on customer endpoint',
      userMessage: 'You\'re trying to access customer functions with staff credentials.',
      recoveryOptions: [
        { action: 'return_admin_area', description: 'Return to the admin area', url: '/admin/dashboard' }
      ]
    }
  },
  
  [AuthErrorCodes.INSUFFICIENT_PERMISSIONS]: {
    customer: {
      message: 'Customer lacks required permissions',
      userMessage: 'You don\'t have permission to perform this action. You may need to upgrade your account.',
      recoveryOptions: [
        { action: 'upgrade_account', description: 'Upgrade your account for more features', url: '/premium' },
        { action: 'contact_support', description: 'Contact support about permissions', url: '/support' }
      ]
    },
    staff: {
      message: 'Staff member lacks required permissions',
      userMessage: 'You don\'t have permission to perform this action.',
      recoveryOptions: [
        { action: 'contact_admin', description: 'Contact your administrator to request additional permissions' }
      ]
    }
  },
  
  [AuthErrorCodes.ROLE_NOT_AUTHORIZED]: {
    customer: {
      message: 'Customer role not authorized for action',
      userMessage: 'Your account type doesn\'t have access to this feature.',
      recoveryOptions: [
        { action: 'upgrade_account', description: 'Upgrade to access this feature', url: '/premium' },
        { action: 'view_features', description: 'See what\'s available for your account type' }
      ]
    },
    staff: {
      message: 'Staff role not authorized for action',
      userMessage: 'Your role doesn\'t have authorization for this action.',
      recoveryOptions: [
        { action: 'contact_admin', description: 'Contact your administrator about role permissions' }
      ]
    }
  },
  
  [AuthErrorCodes.TIER_ACCESS_DENIED]: {
    customer: {
      message: 'Customer tier access denied',
      userMessage: 'This feature is not available for your current membership tier.',
      recoveryOptions: [
        { action: 'upgrade_tier', description: 'Upgrade your membership tier', url: '/premium' },
        { action: 'view_tier_features', description: 'See features available for your tier' }
      ]
    },
    staff: {
      message: 'Staff attempting customer tier operation',
      userMessage: 'This operation is not applicable to staff accounts.',
      recoveryOptions: [
        { action: 'return_admin_area', description: 'Return to admin functions', url: '/admin/dashboard' }
      ]
    }
  },
  
  [AuthErrorCodes.USER_ALREADY_EXISTS]: {
    customer: {
      message: 'Customer account already exists',
      userMessage: 'An account with this email address already exists.',
      recoveryOptions: [
        { action: 'login_instead', description: 'Log in to your existing account', url: '/auth/login' },
        { action: 'forgot_password', description: 'Reset your password if you\'ve forgotten it', url: '/auth/forgot-password' }
      ]
    },
    staff: {
      message: 'Staff account already exists',
      userMessage: 'A staff account with this email already exists.',
      recoveryOptions: [
        { action: 'contact_admin', description: 'Contact your administrator about the existing account' }
      ]
    }
  },
  
  [AuthErrorCodes.INVALID_PASSWORD]: {
    customer: {
      message: 'Invalid password format for customer',
      userMessage: 'Your password doesn\'t meet the security requirements. Please choose a stronger password.',
      recoveryOptions: [
        { action: 'choose_stronger_password', description: 'Choose a password with at least 8 characters, including uppercase, lowercase, numbers, and symbols' }
      ]
    },
    staff: {
      message: 'Invalid password format for staff',
      userMessage: 'Your password doesn\'t meet the security requirements.',
      recoveryOptions: [
        { action: 'choose_stronger_password', description: 'Choose a password meeting all security requirements' }
      ]
    }
  },
  
  [AuthErrorCodes.INVALID_EMAIL]: {
    customer: {
      message: 'Invalid email format for customer registration',
      userMessage: 'Please enter a valid email address.',
      recoveryOptions: [
        { action: 'correct_email', description: 'Check and correct your email address format' }
      ]
    },
    staff: {
      message: 'Invalid email format for staff registration',
      userMessage: 'Please enter a valid email address.',
      recoveryOptions: [
        { action: 'correct_email', description: 'Check and correct your email address format' }
      ]
    }
  },
  
  [AuthErrorCodes.REGISTRATION_FAILED]: {
    customer: {
      message: 'Customer registration failed',
      userMessage: 'Unable to create your account at this time. Please try again.',
      recoveryOptions: [
        { action: 'retry_registration', description: 'Try creating your account again' },
        { action: 'contact_support', description: 'Contact support if the problem continues', url: '/support' }
      ]
    },
    staff: {
      message: 'Staff registration failed',
      userMessage: 'Unable to create the staff account. Please contact your administrator.',
      recoveryOptions: [
        { action: 'contact_admin', description: 'Contact your administrator about the registration failure' }
      ]
    }
  },
  
  [AuthErrorCodes.INVALID_VERIFICATION_CODE]: {
    customer: {
      message: 'Invalid verification code for customer',
      userMessage: 'The verification code you entered is incorrect. Please check and try again.',
      recoveryOptions: [
        { action: 'retry_code', description: 'Double-check the code and try again' },
        { action: 'resend_code', description: 'Request a new verification code' }
      ]
    },
    staff: {
      message: 'Invalid verification code for staff',
      userMessage: 'The verification code is incorrect. Please try again.',
      recoveryOptions: [
        { action: 'retry_code', description: 'Check the code and try again' },
        { action: 'contact_admin', description: 'Contact your administrator for assistance' }
      ]
    }
  },
  
  [AuthErrorCodes.CODE_EXPIRED]: {
    customer: {
      message: 'Verification code expired for customer',
      userMessage: 'The verification code has expired. Please request a new one.',
      recoveryOptions: [
        { action: 'request_new_code', description: 'Request a new verification code' }
      ]
    },
    staff: {
      message: 'Verification code expired for staff',
      userMessage: 'The verification code has expired. Please request a new one.',
      recoveryOptions: [
        { action: 'request_new_code', description: 'Request a new verification code' }
      ]
    }
  },
  
  [AuthErrorCodes.PASSWORD_RESET_FAILED]: {
    customer: {
      message: 'Password reset failed for customer',
      userMessage: 'Unable to reset your password at this time. Please try again.',
      recoveryOptions: [
        { action: 'retry_reset', description: 'Try resetting your password again' },
        { action: 'contact_support', description: 'Contact support for assistance', url: '/support' }
      ]
    },
    staff: {
      message: 'Password reset failed for staff',
      userMessage: 'Unable to reset your password. Please contact your administrator.',
      recoveryOptions: [
        { action: 'contact_admin', description: 'Contact your administrator for password reset assistance' }
      ]
    }
  },
  
  [AuthErrorCodes.COGNITO_SERVICE_ERROR]: {
    customer: {
      message: 'Cognito service error for customer operation',
      userMessage: 'We\'re experiencing technical difficulties. Please try again in a few minutes.',
      recoveryOptions: [
        { action: 'retry_later', description: 'Try again in a few minutes' },
        { action: 'contact_support', description: 'Contact support if the problem persists', url: '/support' }
      ]
    },
    staff: {
      message: 'Cognito service error for staff operation',
      userMessage: 'Authentication service is temporarily unavailable. Please try again shortly.',
      recoveryOptions: [
        { action: 'retry_later', description: 'Try again in a few minutes' },
        { action: 'contact_admin', description: 'Contact your administrator if this continues' }
      ]
    }
  },
  
  [AuthErrorCodes.NETWORK_ERROR]: {
    customer: {
      message: 'Network error during customer authentication',
      userMessage: 'Connection problem. Please check your internet connection and try again.',
      recoveryOptions: [
        { action: 'check_connection', description: 'Check your internet connection' },
        { action: 'retry_request', description: 'Try again' }
      ]
    },
    staff: {
      message: 'Network error during staff authentication',
      userMessage: 'Network connection problem. Please check your connection and try again.',
      recoveryOptions: [
        { action: 'check_connection', description: 'Check your internet connection' },
        { action: 'retry_request', description: 'Try again' }
      ]
    }
  },
  
  [AuthErrorCodes.CONFIGURATION_ERROR]: {
    customer: {
      message: 'Configuration error in customer authentication',
      userMessage: 'System configuration issue. Please contact support.',
      recoveryOptions: [
        { action: 'contact_support', description: 'Contact support for assistance', url: '/support' }
      ]
    },
    staff: {
      message: 'Configuration error in staff authentication',
      userMessage: 'System configuration issue. Please contact your administrator.',
      recoveryOptions: [
        { action: 'contact_admin', description: 'Contact your administrator about this configuration issue' }
      ]
    }
  },
  
  [AuthErrorCodes.INTERNAL_ERROR]: {
    customer: {
      message: 'Internal error during customer authentication',
      userMessage: 'An unexpected error occurred. Please try again or contact support.',
      recoveryOptions: [
        { action: 'retry_request', description: 'Try your request again' },
        { action: 'contact_support', description: 'Contact support if the problem continues', url: '/support' }
      ]
    },
    staff: {
      message: 'Internal error during staff authentication',
      userMessage: 'An unexpected error occurred. Please try again or contact your administrator.',
      recoveryOptions: [
        { action: 'retry_request', description: 'Try your request again' },
        { action: 'contact_admin', description: 'Contact your administrator if this persists' }
      ]
    }
  }
};

/**
 * Creates a standardized authentication error
 */
export function createAuthError(
  cognitoError: any,
  userType: 'customer' | 'staff',
  context?: {
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    requestId?: string;
    [key: string]: any;
  }
): AuthError {
  // Map Cognito error to our error code
  const errorCode = COGNITO_ERROR_MAPPING[cognitoError.name] || AuthErrorCodes.INTERNAL_ERROR;
  
  // Get user-type specific error messages
  const errorInfo = ERROR_MESSAGES[errorCode][userType];
  
  // Determine error severity and category
  const severity = getErrorSeverity(errorCode);
  const category = getErrorCategory(errorCode);
  const retryable = isRetryableError(errorCode);
  
  const authError: AuthError = {
    code: errorCode,
    message: errorInfo.message,
    userMessage: errorInfo.userMessage,
    userType,
    severity,
    category,
    retryable,
    timestamp: new Date().toISOString(),
    requestId: context?.requestId || generateRequestId(),
    context: {
      ...context,
      poolType: userType,
      originalError: cognitoError.message || cognitoError.toString()
    },
    recoveryOptions: errorInfo.recoveryOptions
  };
  
  return authError;
}

/**
 * Creates a cross-pool access error
 */
export function createCrossPoolError(
  tokenUserType: 'customer' | 'staff',
  endpointUserType: 'customer' | 'staff',
  context?: {
    endpoint?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    email?: string;
  }
): AuthError {
  let errorCode: AuthErrorCodes;
  
  if (tokenUserType === 'customer' && endpointUserType === 'staff') {
    errorCode = AuthErrorCodes.CUSTOMER_TOKEN_ON_STAFF_ENDPOINT;
  } else if (tokenUserType === 'staff' && endpointUserType === 'customer') {
    errorCode = AuthErrorCodes.STAFF_TOKEN_ON_CUSTOMER_ENDPOINT;
  } else {
    errorCode = AuthErrorCodes.CROSS_POOL_ACCESS_DENIED;
  }
  
  const errorInfo = ERROR_MESSAGES[errorCode][tokenUserType];
  
  const authError: AuthError = {
    code: errorCode,
    message: errorInfo.message,
    userMessage: errorInfo.userMessage,
    userType: tokenUserType,
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.AUTHORIZATION,
    retryable: false,
    timestamp: new Date().toISOString(),
    requestId: context?.requestId || generateRequestId(),
    context: {
      ...context,
      tokenUserType,
      endpointUserType,
      crossPoolAttempt: true
    },
    recoveryOptions: errorInfo.recoveryOptions
  };
  
  return authError;
}

/**
 * Logs authentication error with proper audit trail
 */
export async function logAuthError(
  error: AuthError,
  operation: string,
  additionalContext?: Record<string, any>
): Promise<void> {
  try {
    await logAuthEvent({
      eventType: 'FAILED_LOGIN',
      userType: error.userType,
      email: error.context?.email,
      ipAddress: error.context?.ipAddress || 'unknown',
      userAgent: error.context?.userAgent || 'unknown',
      timestamp: error.timestamp,
      success: false,
      errorCode: error.code,
      additionalData: {
        operation,
        severity: error.severity,
        category: error.category,
        retryable: error.retryable,
        originalError: error.context?.originalError,
        ...additionalContext
      }
    });
  } catch (logError) {
    console.error('Failed to log authentication error:', logError);
  }
}

/**
 * Determines error severity based on error code
 */
function getErrorSeverity(errorCode: AuthErrorCodes): ErrorSeverity {
  const highSeverityErrors = [
    AuthErrorCodes.CROSS_POOL_ACCESS_DENIED,
    AuthErrorCodes.CUSTOMER_TOKEN_ON_STAFF_ENDPOINT,
    AuthErrorCodes.STAFF_TOKEN_ON_CUSTOMER_ENDPOINT,
    AuthErrorCodes.SUSPICIOUS_ACTIVITY,
    AuthErrorCodes.IP_BLOCKED
  ];
  
  const mediumSeverityErrors = [
    AuthErrorCodes.ACCOUNT_LOCKED,
    AuthErrorCodes.RATE_LIMITED,
    AuthErrorCodes.MFA_REQUIRED,
    AuthErrorCodes.INSUFFICIENT_PERMISSIONS
  ];
  
  const lowSeverityErrors = [
    AuthErrorCodes.INVALID_CREDENTIALS,
    AuthErrorCodes.USER_NOT_FOUND,
    AuthErrorCodes.TOKEN_EXPIRED,
    AuthErrorCodes.MFA_CODE_INVALID
  ];
  
  if (highSeverityErrors.includes(errorCode)) {
    return ErrorSeverity.HIGH;
  } else if (mediumSeverityErrors.includes(errorCode)) {
    return ErrorSeverity.MEDIUM;
  } else if (lowSeverityErrors.includes(errorCode)) {
    return ErrorSeverity.LOW;
  } else {
    return ErrorSeverity.CRITICAL;
  }
}

/**
 * Determines error category based on error code
 */
function getErrorCategory(errorCode: AuthErrorCodes): ErrorCategory {
  const authenticationErrors = [
    AuthErrorCodes.INVALID_CREDENTIALS,
    AuthErrorCodes.USER_NOT_FOUND,
    AuthErrorCodes.USER_NOT_CONFIRMED,
    AuthErrorCodes.PASSWORD_RESET_REQUIRED,
    AuthErrorCodes.MFA_REQUIRED,
    AuthErrorCodes.MFA_CODE_INVALID
  ];
  
  const authorizationErrors = [
    AuthErrorCodes.CROSS_POOL_ACCESS_DENIED,
    AuthErrorCodes.CUSTOMER_TOKEN_ON_STAFF_ENDPOINT,
    AuthErrorCodes.STAFF_TOKEN_ON_CUSTOMER_ENDPOINT,
    AuthErrorCodes.INSUFFICIENT_PERMISSIONS,
    AuthErrorCodes.ROLE_NOT_AUTHORIZED,
    AuthErrorCodes.TIER_ACCESS_DENIED
  ];
  
  const systemErrors = [
    AuthErrorCodes.COGNITO_SERVICE_ERROR,
    AuthErrorCodes.NETWORK_ERROR,
    AuthErrorCodes.CONFIGURATION_ERROR,
    AuthErrorCodes.INTERNAL_ERROR
  ];
  
  if (authenticationErrors.includes(errorCode)) {
    return ErrorCategory.AUTHENTICATION;
  } else if (authorizationErrors.includes(errorCode)) {
    return ErrorCategory.AUTHORIZATION;
  } else if (systemErrors.includes(errorCode)) {
    return ErrorCategory.SYSTEM;
  } else {
    return ErrorCategory.VALIDATION;
  }
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(errorCode: AuthErrorCodes): boolean {
  const retryableErrors = [
    AuthErrorCodes.NETWORK_ERROR,
    AuthErrorCodes.COGNITO_SERVICE_ERROR,
    AuthErrorCodes.TOKEN_REFRESH_FAILED,
    AuthErrorCodes.MFA_CODE_EXPIRED,
    AuthErrorCodes.CODE_EXPIRED
  ];
  
  return retryableErrors.includes(errorCode);
}

/**
 * Generates a unique request ID for tracking
 */
function generateRequestId(): string {
  return `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handles Cognito errors and returns appropriate auth result
 */
export function handleCognitoError(
  error: any,
  userType: 'customer' | 'staff',
  context?: {
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    requestId?: string;
  }
): { success: false; error: string; errorCode: string } {
  const authError = createAuthError(error, userType, context);
  
  // Log the error asynchronously
  logAuthError(authError, 'cognito_operation', { cognitoErrorName: error.name }).catch(console.error);
  
  return {
    success: false,
    error: authError.userMessage,
    errorCode: authError.code
  };
}
/**
 *
 Authorization-specific error handling for dual-pool architecture
 */

/**
 * Creates a permission-based error for insufficient permissions
 */
export function createPermissionError(
  userType: 'customer' | 'staff',
  requiredPermission: string,
  userPermissions: string[],
  context?: {
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    requestId?: string;
    resource?: string;
  }
): AuthError {
  const errorCode = AuthErrorCodes.INSUFFICIENT_PERMISSIONS;
  const errorInfo = ERROR_MESSAGES[errorCode][userType];
  
  const authError: AuthError = {
    code: errorCode,
    message: errorInfo.message,
    userMessage: errorInfo.userMessage,
    userType,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.AUTHORIZATION,
    retryable: false,
    timestamp: new Date().toISOString(),
    requestId: context?.requestId || generateRequestId(),
    context: {
      ...context,
      requiredPermission,
      userPermissions,
      permissionCheck: true
    },
    recoveryOptions: errorInfo.recoveryOptions
  };
  
  return authError;
}

/**
 * Creates a role-based authorization error
 */
export function createRoleAuthorizationError(
  userType: 'customer' | 'staff',
  userRole: string,
  requiredRole: string,
  context?: {
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    requestId?: string;
    resource?: string;
  }
): AuthError {
  const errorCode = AuthErrorCodes.ROLE_NOT_AUTHORIZED;
  const errorInfo = ERROR_MESSAGES[errorCode][userType];
  
  const authError: AuthError = {
    code: errorCode,
    message: errorInfo.message,
    userMessage: errorInfo.userMessage,
    userType,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.AUTHORIZATION,
    retryable: false,
    timestamp: new Date().toISOString(),
    requestId: context?.requestId || generateRequestId(),
    context: {
      ...context,
      userRole,
      requiredRole,
      roleCheck: true
    },
    recoveryOptions: errorInfo.recoveryOptions
  };
  
  return authError;
}

/**
 * Creates a tier access denied error for customer features
 */
export function createTierAccessError(
  customerTier: string,
  requiredTier: string,
  feature: string,
  context?: {
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    requestId?: string;
  }
): AuthError {
  const errorCode = AuthErrorCodes.TIER_ACCESS_DENIED;
  const errorInfo = ERROR_MESSAGES[errorCode]['customer'];
  
  const authError: AuthError = {
    code: errorCode,
    message: errorInfo.message,
    userMessage: `This feature (${feature}) requires ${requiredTier} tier. Your current tier is ${customerTier}.`,
    userType: 'customer',
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.AUTHORIZATION,
    retryable: false,
    timestamp: new Date().toISOString(),
    requestId: context?.requestId || generateRequestId(),
    context: {
      ...context,
      customerTier,
      requiredTier,
      feature,
      tierCheck: true
    },
    recoveryOptions: errorInfo.recoveryOptions
  };
  
  return authError;
}

/**
 * Validates customer tier access and returns appropriate error if denied
 */
export function validateCustomerTierAccess(
  customerTier: string,
  requiredTier: string,
  feature: string,
  context?: {
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    requestId?: string;
  }
): { hasAccess: boolean; error?: AuthError } {
  // Define tier hierarchy
  const tierHierarchy = {
    'individual': 1,
    'dealer': 2,
    'premium': 3
  };
  
  const userTierLevel = tierHierarchy[customerTier.toLowerCase() as keyof typeof tierHierarchy] || 0;
  const requiredTierLevel = tierHierarchy[requiredTier.toLowerCase() as keyof typeof tierHierarchy] || 999;
  
  if (userTierLevel >= requiredTierLevel) {
    return { hasAccess: true };
  }
  
  const error = createTierAccessError(customerTier, requiredTier, feature, context);
  return { hasAccess: false, error };
}

/**
 * Validates staff permission access and returns appropriate error if denied
 */
export function validateStaffPermissionAccess(
  userPermissions: string[],
  requiredPermission: string,
  userType: 'staff' = 'staff',
  context?: {
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    requestId?: string;
    resource?: string;
  }
): { hasAccess: boolean; error?: AuthError } {
  // Check if user has the required permission or is super admin
  const hasPermission = userPermissions.includes(requiredPermission) || 
                       userPermissions.includes('*') || 
                       userPermissions.includes('ALL_PERMISSIONS');
  
  if (hasPermission) {
    return { hasAccess: true };
  }
  
  const error = createPermissionError(userType, requiredPermission, userPermissions, context);
  return { hasAccess: false, error };
}

/**
 * Creates standardized authorization error responses for API Gateway
 */
export function createAuthorizationErrorResponse(
  error: AuthError,
  statusCode: number = 403
): {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
} {
  const response = {
    error: {
      code: error.code,
      message: error.userMessage,
      userType: error.userType,
      timestamp: error.timestamp,
      requestId: error.requestId,
      recoveryOptions: error.recoveryOptions,
      context: {
        endpoint: error.context?.endpoint,
        resource: error.context?.resource
      }
    }
  };
  
  return {
    statusCode,
    body: JSON.stringify(response),
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': error.requestId || 'unknown',
      'X-Error-Code': error.code,
      'X-User-Type': error.userType
    }
  };
}

/**
 * Logs authorization errors with proper audit trail
 */
export async function logAuthorizationError(
  error: AuthError,
  operation: string,
  additionalContext?: Record<string, any>
): Promise<void> {
  try {
    await logAuthEvent({
      eventType: 'FAILED_LOGIN', // Using existing event type for authorization failures
      userType: error.userType,
      email: error.context?.email,
      ipAddress: error.context?.ipAddress || 'unknown',
      userAgent: error.context?.userAgent || 'unknown',
      timestamp: error.timestamp,
      success: false,
      errorCode: error.code,
      additionalData: {
        operation,
        authorizationType: 'permission_check',
        severity: error.severity,
        category: error.category,
        requiredPermission: error.context?.requiredPermission,
        userPermissions: error.context?.userPermissions,
        requiredRole: error.context?.requiredRole,
        userRole: error.context?.userRole,
        requiredTier: error.context?.requiredTier,
        customerTier: error.context?.customerTier,
        feature: error.context?.feature,
        resource: error.context?.resource,
        endpoint: error.context?.endpoint,
        ...additionalContext
      }
    });
  } catch (logError) {
    console.error('Failed to log authorization error:', logError);
  }
}

/**
 * Utility function to extract user type from JWT token
 */
export function extractUserTypeFromToken(token: string): 'customer' | 'staff' | null {
  try {
    // Simple JWT payload extraction without verification (for error handling only)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    
    // Check issuer to determine user type
    if (payload.iss && payload.iss.includes('customer')) {
      return 'customer';
    } else if (payload.iss && payload.iss.includes('staff')) {
      return 'staff';
    }
    
    // Fallback: check for customer-specific claims
    if (payload['custom:customer_type']) {
      return 'customer';
    } else if (payload['custom:permissions']) {
      return 'staff';
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Creates user-friendly error messages for different user types and contexts
 */
export function createUserFriendlyErrorMessage(
  error: AuthError,
  context?: {
    action?: string;
    resource?: string;
    feature?: string;
  }
): string {
  const baseMessage = error.userMessage;
  
  if (!context) {
    return baseMessage;
  }
  
  // Customize message based on context
  if (context.action && context.resource) {
    return `${baseMessage} You cannot ${context.action} ${context.resource}.`;
  } else if (context.feature) {
    return `${baseMessage} The ${context.feature} feature is not available for your account.`;
  }
  
  return baseMessage;
}