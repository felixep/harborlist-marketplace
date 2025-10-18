/**
 * @fileoverview Tests for comprehensive authentication error handling
 * 
 * Tests the dual-pool authentication error handling system including:
 * - Cognito error mapping and user-friendly messages
 * - Cross-pool access prevention errors
 * - Authorization and permission errors
 * - Request tracking and audit logging
 * - Recovery options and retry logic
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import {
  AuthErrorCodes,
  createAuthError,
  createCrossPoolError,
  createPermissionError,
  createRoleAuthorizationError,
  createTierAccessError,
  validateCustomerTierAccess,
  validateStaffPermissionAccess,
  handleCognitoError,
  logAuthError,
  logAuthorizationError,
  extractUserTypeFromToken,
  createUserFriendlyErrorMessage,
  createAuthorizationErrorResponse
} from '../auth-errors';
import { ErrorSeverity, ErrorCategory } from '../../shared/errors';

// Mock the audit service
jest.mock('../audit-service', () => ({
  logAuthEvent: jest.fn().mockResolvedValue(undefined)
}));

describe('Authentication Error Handling', () => {
  describe('createAuthError', () => {
    it('should create a customer authentication error from Cognito error', () => {
      const cognitoError = {
        name: 'NotAuthorizedException',
        message: 'Incorrect username or password.'
      };

      const context = {
        email: 'customer@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        endpoint: '/auth/customer/login'
      };

      const authError = createAuthError(cognitoError, 'customer', context);

      expect(authError.code).toBe(AuthErrorCodes.INVALID_CREDENTIALS);
      expect(authError.userType).toBe('customer');
      expect(authError.userMessage).toContain('email or password you entered is incorrect');
      expect(authError.severity).toBe(ErrorSeverity.LOW);
      expect(authError.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(authError.context?.email).toBe('customer@example.com');
      expect(authError.context?.originalError).toBe('Incorrect username or password.');
      expect(authError.recoveryOptions).toHaveLength(3);
    });

    it('should create a staff authentication error with different messaging', () => {
      const cognitoError = {
        name: 'NotAuthorizedException',
        message: 'Incorrect username or password.'
      };

      const context = {
        email: 'staff@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        endpoint: '/auth/staff/login'
      };

      const authError = createAuthError(cognitoError, 'staff', context);

      expect(authError.code).toBe(AuthErrorCodes.INVALID_CREDENTIALS);
      expect(authError.userType).toBe('staff');
      expect(authError.userMessage).toContain('Invalid login credentials');
      expect(authError.recoveryOptions).toHaveLength(3);
      expect(authError.recoveryOptions?.[1]?.url).toBe('/admin/auth/forgot-password');
    });

    it('should handle unknown Cognito errors', () => {
      const cognitoError = {
        name: 'UnknownException',
        message: 'Something went wrong'
      };

      const authError = createAuthError(cognitoError, 'customer');

      expect(authError.code).toBe(AuthErrorCodes.INTERNAL_ERROR);
      expect(authError.severity).toBe(ErrorSeverity.CRITICAL);
      expect(authError.category).toBe(ErrorCategory.SYSTEM);
    });

    it('should map various Cognito error types correctly', () => {
      const testCases = [
        { cognitoError: 'UserNotConfirmedException', expectedCode: AuthErrorCodes.USER_NOT_CONFIRMED },
        { cognitoError: 'UserNotFoundException', expectedCode: AuthErrorCodes.USER_NOT_FOUND },
        { cognitoError: 'TooManyRequestsException', expectedCode: AuthErrorCodes.RATE_LIMITED },
        { cognitoError: 'CodeMismatchException', expectedCode: AuthErrorCodes.MFA_CODE_INVALID },
        { cognitoError: 'ExpiredCodeException', expectedCode: AuthErrorCodes.MFA_CODE_EXPIRED }
      ];

      testCases.forEach(({ cognitoError, expectedCode }) => {
        const error = createAuthError({ name: cognitoError }, 'customer');
        expect(error.code).toBe(expectedCode);
      });
    });
  });

  describe('createCrossPoolError', () => {
    it('should create customer token on staff endpoint error', () => {
      const context = {
        endpoint: '/api/admin/users',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const error = createCrossPoolError('customer', 'staff', context);

      expect(error.code).toBe(AuthErrorCodes.CUSTOMER_TOKEN_ON_STAFF_ENDPOINT);
      expect(error.userType).toBe('customer');
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.category).toBe(ErrorCategory.AUTHORIZATION);
      expect(error.retryable).toBe(false);
      expect(error.context?.crossPoolAttempt).toBe(true);
      expect(error.userMessage).toContain('administrative functions');
    });

    it('should create staff token on customer endpoint error', () => {
      const context = {
        endpoint: '/api/customer/profile',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const error = createCrossPoolError('staff', 'customer', context);

      expect(error.code).toBe(AuthErrorCodes.STAFF_TOKEN_ON_CUSTOMER_ENDPOINT);
      expect(error.userType).toBe('staff');
      expect(error.userMessage).toContain('customer functions with staff credentials');
      expect(error.recoveryOptions?.[0]?.url).toBe('/admin/dashboard');
    });

    it('should create generic cross-pool access error', () => {
      const error = createCrossPoolError('customer', 'customer');

      expect(error.code).toBe(AuthErrorCodes.CROSS_POOL_ACCESS_DENIED);
    });
  });

  describe('Authorization Errors', () => {
    describe('createPermissionError', () => {
      it('should create permission error for staff member', () => {
        const context = {
          email: 'staff@example.com',
          endpoint: '/api/admin/users/delete',
          resource: 'user management'
        };

        const error = createPermissionError(
          'staff',
          'user_management',
          ['content_moderation', 'analytics_view'],
          context
        );

        expect(error.code).toBe(AuthErrorCodes.INSUFFICIENT_PERMISSIONS);
        expect(error.userType).toBe('staff');
        expect(error.context?.requiredPermission).toBe('user_management');
        expect(error.context?.userPermissions).toEqual(['content_moderation', 'analytics_view']);
        expect(error.recoveryOptions?.[0]?.action).toBe('contact_admin');
      });

      it('should create permission error for customer', () => {
        const error = createPermissionError(
          'customer',
          'premium_analytics',
          ['view_listings', 'create_inquiry']
        );

        expect(error.userType).toBe('customer');
        expect(error.recoveryOptions?.[0]?.action).toBe('upgrade_account');
        expect(error.recoveryOptions?.[0]?.url).toBe('/premium');
      });
    });

    describe('createRoleAuthorizationError', () => {
      it('should create role authorization error', () => {
        const context = {
          email: 'staff@example.com',
          endpoint: '/api/admin/system/config'
        };

        const error = createRoleAuthorizationError(
          'staff',
          'team_member',
          'admin',
          context
        );

        expect(error.code).toBe(AuthErrorCodes.ROLE_NOT_AUTHORIZED);
        expect(error.context?.userRole).toBe('team_member');
        expect(error.context?.requiredRole).toBe('admin');
      });
    });

    describe('createTierAccessError', () => {
      it('should create tier access error for customer', () => {
        const context = {
          email: 'customer@example.com',
          endpoint: '/api/customer/premium-analytics'
        };

        const error = createTierAccessError(
          'individual',
          'premium',
          'Advanced Analytics',
          context
        );

        expect(error.code).toBe(AuthErrorCodes.TIER_ACCESS_DENIED);
        expect(error.userType).toBe('customer');
        expect(error.userMessage).toContain('Advanced Analytics');
        expect(error.userMessage).toContain('premium tier');
        expect(error.userMessage).toContain('individual');
        expect(error.context?.feature).toBe('Advanced Analytics');
      });
    });
  });

  describe('Validation Functions', () => {
    describe('validateCustomerTierAccess', () => {
      it('should allow access for sufficient tier', () => {
        const result = validateCustomerTierAccess('premium', 'dealer', 'Advanced Search');

        expect(result.hasAccess).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should deny access for insufficient tier', () => {
        const result = validateCustomerTierAccess('individual', 'premium', 'Premium Analytics');

        expect(result.hasAccess).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe(AuthErrorCodes.TIER_ACCESS_DENIED);
      });

      it('should handle tier hierarchy correctly', () => {
        // Premium can access dealer features
        expect(validateCustomerTierAccess('premium', 'dealer', 'Feature').hasAccess).toBe(true);
        
        // Dealer can access individual features
        expect(validateCustomerTierAccess('dealer', 'individual', 'Feature').hasAccess).toBe(true);
        
        // Individual cannot access dealer features
        expect(validateCustomerTierAccess('individual', 'dealer', 'Feature').hasAccess).toBe(false);
      });
    });

    describe('validateStaffPermissionAccess', () => {
      it('should allow access for users with required permission', () => {
        const result = validateStaffPermissionAccess(
          ['user_management', 'content_moderation'],
          'user_management'
        );

        expect(result.hasAccess).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should allow access for super admin with wildcard permission', () => {
        const result = validateStaffPermissionAccess(['*'], 'any_permission');

        expect(result.hasAccess).toBe(true);
      });

      it('should deny access for insufficient permissions', () => {
        const result = validateStaffPermissionAccess(
          ['content_moderation'],
          'user_management'
        );

        expect(result.hasAccess).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe(AuthErrorCodes.INSUFFICIENT_PERMISSIONS);
      });
    });
  });

  describe('handleCognitoError', () => {
    it('should return properly formatted customer auth result', () => {
      const cognitoError = {
        name: 'UserNotFoundException',
        message: 'User does not exist'
      };

      const result = handleCognitoError(cognitoError, 'customer', {
        email: 'test@example.com'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No account found');
      expect(result.errorCode).toBe(AuthErrorCodes.USER_NOT_FOUND);
    });

    it('should return properly formatted staff auth result', () => {
      const cognitoError = {
        name: 'TooManyRequestsException',
        message: 'Too many requests'
      };

      const result = handleCognitoError(cognitoError, 'staff');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many login attempts');
      expect(result.errorCode).toBe(AuthErrorCodes.RATE_LIMITED);
    });
  });

  describe('Utility Functions', () => {
    describe('extractUserTypeFromToken', () => {
      it('should extract customer user type from token', () => {
        // Mock JWT token with customer claims
        const payload = {
          'custom:customer_type': 'premium',
          iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_CUSTOMER123'
        };
        const token = `header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;

        const userType = extractUserTypeFromToken(token);

        expect(userType).toBe('customer');
      });

      it('should extract staff user type from token', () => {
        // Mock JWT token with staff claims
        const payload = {
          'custom:permissions': '["user_management"]',
          iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_STAFF123'
        };
        const token = `header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;

        const userType = extractUserTypeFromToken(token);

        expect(userType).toBe('staff');
      });

      it('should return null for invalid token', () => {
        const userType = extractUserTypeFromToken('invalid.token');

        expect(userType).toBe(null);
      });
    });

    describe('createUserFriendlyErrorMessage', () => {
      it('should create contextual error message', () => {
        const error = createPermissionError('customer', 'premium_feature', []);
        
        const message = createUserFriendlyErrorMessage(error, {
          action: 'access',
          feature: 'Premium Analytics'
        });

        expect(message).toContain('Premium Analytics feature');
      });

      it('should return base message when no context provided', () => {
        const error = createPermissionError('customer', 'premium_feature', []);
        
        const message = createUserFriendlyErrorMessage(error);

        expect(message).toBe(error.userMessage);
      });
    });

    describe('createAuthorizationErrorResponse', () => {
      it('should create properly formatted API Gateway response', () => {
        const error = createPermissionError('staff', 'user_management', ['content_moderation']);
        
        const response = createAuthorizationErrorResponse(error);

        expect(response.statusCode).toBe(403);
        expect(response.headers['Content-Type']).toBe('application/json');
        expect(response.headers['X-Error-Code']).toBe(AuthErrorCodes.INSUFFICIENT_PERMISSIONS);
        expect(response.headers['X-User-Type']).toBe('staff');

        const body = JSON.parse(response.body);
        expect(body.error.code).toBe(AuthErrorCodes.INSUFFICIENT_PERMISSIONS);
        expect(body.error.userType).toBe('staff');
        expect(body.error.recoveryOptions).toBeDefined();
      });

      it('should use custom status code when provided', () => {
        const error = createAuthError({ name: 'NotAuthorizedException' }, 'customer');
        
        const response = createAuthorizationErrorResponse(error, 401);

        expect(response.statusCode).toBe(401);
      });
    });
  });

  describe('Error Logging', () => {
    it('should log authentication errors with proper context', async () => {
      const { logAuthEvent } = require('../audit-service');
      const error = createAuthError({ name: 'NotAuthorizedException' }, 'customer', {
        email: 'test@example.com',
        ipAddress: '192.168.1.1'
      });

      await logAuthError(error, 'customer_login', { additionalInfo: 'test' });

      expect(logAuthEvent).toHaveBeenCalledWith({
        eventType: 'FAILED_LOGIN',
        userType: 'customer',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'unknown',
        timestamp: error.timestamp,
        success: false,
        errorCode: AuthErrorCodes.INVALID_CREDENTIALS,
        additionalData: expect.objectContaining({
          operation: 'customer_login',
          additionalInfo: 'test'
        })
      });
    });

    it('should log authorization errors with permission context', async () => {
      const { logAuthEvent } = require('../audit-service');
      const error = createPermissionError('staff', 'user_management', ['content_moderation'], {
        email: 'staff@example.com'
      });

      await logAuthorizationError(error, 'access_user_management');

      expect(logAuthEvent).toHaveBeenCalledWith({
        eventType: 'FAILED_LOGIN',
        userType: 'staff',
        email: 'staff@example.com',
        ipAddress: 'unknown',
        userAgent: 'unknown',
        timestamp: error.timestamp,
        success: false,
        errorCode: AuthErrorCodes.INSUFFICIENT_PERMISSIONS,
        additionalData: expect.objectContaining({
          operation: 'access_user_management',
          authorizationType: 'permission_check',
          requiredPermission: 'user_management',
          userPermissions: ['content_moderation']
        })
      });
    });
  });

  describe('Error Severity and Categories', () => {
    it('should assign correct severity levels', () => {
      const highSeverityError = createCrossPoolError('customer', 'staff');
      expect(highSeverityError.severity).toBe(ErrorSeverity.HIGH);

      const mediumSeverityError = createPermissionError('staff', 'permission', []);
      expect(mediumSeverityError.severity).toBe(ErrorSeverity.MEDIUM);

      const lowSeverityError = createAuthError({ name: 'NotAuthorizedException' }, 'customer');
      expect(lowSeverityError.severity).toBe(ErrorSeverity.LOW);
    });

    it('should assign correct error categories', () => {
      const authError = createAuthError({ name: 'NotAuthorizedException' }, 'customer');
      expect(authError.category).toBe(ErrorCategory.AUTHENTICATION);

      const authzError = createPermissionError('staff', 'permission', []);
      expect(authzError.category).toBe(ErrorCategory.AUTHORIZATION);

      const systemError = createAuthError({ name: 'InternalErrorException' }, 'customer');
      expect(systemError.category).toBe(ErrorCategory.SYSTEM);
    });
  });

  describe('Recovery Options', () => {
    it('should provide user-type specific recovery options', () => {
      const customerError = createAuthError({ name: 'NotAuthorizedException' }, 'customer');
      const staffError = createAuthError({ name: 'NotAuthorizedException' }, 'staff');

      expect(customerError.recoveryOptions).toContainEqual(
        expect.objectContaining({ url: '/auth/forgot-password' })
      );
      expect(staffError.recoveryOptions).toContainEqual(
        expect.objectContaining({ url: '/admin/auth/forgot-password' })
      );
    });

    it('should provide context-specific recovery options', () => {
      const tierError = createTierAccessError('individual', 'premium', 'Advanced Analytics');
      
      expect(tierError.recoveryOptions).toContainEqual(
        expect.objectContaining({ 
          action: 'upgrade_tier',
          url: '/premium'
        })
      );
    });
  });
});