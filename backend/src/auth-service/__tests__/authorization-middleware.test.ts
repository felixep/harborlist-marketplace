/**
 * @fileoverview Tests for authorization middleware
 * 
 * Tests the dual-pool authorization middleware including:
 * - Customer tier-based authorization
 * - Staff permission-based authorization
 * - Cross-pool access prevention
 * - Error handling and logging
 * - Convenience functions
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  extractAuthorizationContext,
  validateCustomerTierAuthorization,
  validateStaffPermissionAuthorization,
  validateAuthorization,
  createAuthorizationMiddleware,
  requireCustomerTier,
  requireStaffPermission,
  requireStaffRole,
  requireStaffPermissions,
  requireCustomerAccess,
  requireStaffAccess,
  AuthorizationContext,
  AuthorizationRequirement
} from '../authorization-middleware';
import { CustomerClaims, StaffClaims, CustomerTier, StaffRole } from '../interfaces';
import { AdminPermission } from '../../types/common';
import { AuthErrorCodes } from '../auth-errors';

// Mock the error handling functions
jest.mock('../auth-errors', () => ({
  ...jest.requireActual('../auth-errors'),
  logAuthorizationError: jest.fn().mockResolvedValue(undefined),
  createCrossPoolError: jest.fn().mockReturnValue({
    code: 'CROSS_POOL_ACCESS_DENIED',
    message: 'Cross-pool access denied',
    userMessage: 'You don\'t have permission to access this resource.',
    userType: 'customer',
    severity: 'HIGH',
    category: 'AUTHORIZATION',
    retryable: false,
    timestamp: '2023-01-01T00:00:00.000Z',
    requestId: 'test-request-id',
    context: {},
    recoveryOptions: []
  }),
  createTierAccessError: jest.fn().mockReturnValue({
    code: 'TIER_ACCESS_DENIED',
    message: 'Tier access denied',
    userMessage: 'This feature requires premium tier.',
    userType: 'customer',
    severity: 'MEDIUM',
    category: 'AUTHORIZATION',
    retryable: false,
    timestamp: '2023-01-01T00:00:00.000Z',
    requestId: 'test-request-id',
    context: {},
    recoveryOptions: []
  }),
  createPermissionError: jest.fn().mockReturnValue({
    code: 'INSUFFICIENT_PERMISSIONS',
    message: 'Insufficient permissions',
    userMessage: 'You don\'t have permission to perform this action.',
    userType: 'staff',
    severity: 'MEDIUM',
    category: 'AUTHORIZATION',
    retryable: false,
    timestamp: '2023-01-01T00:00:00.000Z',
    requestId: 'test-request-id',
    context: {},
    recoveryOptions: []
  }),
  createRoleAuthorizationError: jest.fn().mockReturnValue({
    code: 'ROLE_NOT_AUTHORIZED',
    message: 'Role not authorized',
    userMessage: 'Your role doesn\'t have authorization for this action.',
    userType: 'staff',
    severity: 'MEDIUM',
    category: 'AUTHORIZATION',
    retryable: false,
    timestamp: '2023-01-01T00:00:00.000Z',
    requestId: 'test-request-id',
    context: {},
    recoveryOptions: []
  }),
  validateCustomerTierAccess: jest.fn(),
  validateStaffPermissionAccess: jest.fn(),
  createUserFriendlyErrorMessage: jest.fn().mockReturnValue('User-friendly error message'),
  createAuthorizationErrorResponse: jest.fn().mockReturnValue({
    statusCode: 403,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Forbidden' })
  })
}));

describe('Authorization Middleware', () => {
  const mockEvent: APIGatewayProxyEvent = {
    httpMethod: 'GET',
    path: '/api/test',
    headers: { 'User-Agent': 'test-agent' },
    requestContext: {
      requestId: 'test-request-id',
      identity: { sourceIp: '192.168.1.1' }
    }
  } as any;

  const mockCustomerClaims: CustomerClaims = {
    sub: 'customer-123',
    email: 'customer@example.com',
    email_verified: true,
    name: 'Test Customer',
    'custom:customer_type': CustomerTier.INDIVIDUAL,
    'cognito:groups': ['individual-customers'],
    permissions: ['view_listings', 'create_inquiry'],
    iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_CUSTOMER',
    aud: 'customer-client-id',
    token_use: 'access',
    iat: 1640995200,
    exp: 1640998800
  };

  const mockStaffClaims: StaffClaims = {
    sub: 'staff-123',
    email: 'staff@example.com',
    email_verified: true,
    name: 'Test Staff',
    'custom:permissions': JSON.stringify([AdminPermission.CONTENT_MODERATION]),
    'custom:team': 'moderation-team',
    'cognito:groups': ['team-member'],
    permissions: [AdminPermission.CONTENT_MODERATION],
    role: StaffRole.TEAM_MEMBER,
    iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_STAFF',
    aud: 'staff-client-id',
    token_use: 'access',
    iat: 1640995200,
    exp: 1640998800
  };

  describe('extractAuthorizationContext', () => {
    it('should extract customer authorization context', () => {
      const context = extractAuthorizationContext(mockEvent, mockCustomerClaims);

      expect(context.userType).toBe('customer');
      expect(context.userId).toBe('customer-123');
      expect(context.email).toBe('customer@example.com');
      expect(context.ipAddress).toBe('192.168.1.1');
      expect(context.userAgent).toBe('test-agent');
      expect(context.endpoint).toBe('GET /api/test');
      expect(context.requestId).toBe('test-request-id');
      expect(context.claims).toBe(mockCustomerClaims);
    });

    it('should extract staff authorization context', () => {
      const context = extractAuthorizationContext(mockEvent, mockStaffClaims);

      expect(context.userType).toBe('staff');
      expect(context.userId).toBe('staff-123');
      expect(context.email).toBe('staff@example.com');
      expect(context.claims).toBe(mockStaffClaims);
    });

    it('should handle missing headers gracefully', () => {
      const eventWithoutHeaders = {
        ...mockEvent,
        headers: {},
        requestContext: {
          ...mockEvent.requestContext,
          identity: {}
        }
      } as any;

      const context = extractAuthorizationContext(eventWithoutHeaders, mockCustomerClaims);

      expect(context.ipAddress).toBe('unknown');
      expect(context.userAgent).toBe('unknown');
    });
  });

  describe('validateCustomerTierAuthorization', () => {
    const customerContext: AuthorizationContext = {
      userType: 'customer',
      userId: 'customer-123',
      email: 'customer@example.com',
      ipAddress: '192.168.1.1',
      userAgent: 'test-agent',
      endpoint: 'GET /api/test',
      requestId: 'test-request-id',
      claims: mockCustomerClaims
    };

    it('should allow access for sufficient tier', async () => {
      const { validateCustomerTierAccess } = require('../auth-errors');
      validateCustomerTierAccess.mockReturnValue({ hasAccess: true });

      const requirement: AuthorizationRequirement = {
        customerTier: CustomerTier.INDIVIDUAL,
        feature: 'Basic Feature'
      };

      const result = await validateCustomerTierAuthorization(customerContext, requirement);

      expect(result.authorized).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should deny access for insufficient tier', async () => {
      const { validateCustomerTierAccess } = require('../auth-errors');
      const mockError = {
        code: AuthErrorCodes.TIER_ACCESS_DENIED,
        message: 'Tier access denied',
        userMessage: 'This feature requires premium tier.'
      };
      validateCustomerTierAccess.mockReturnValue({ 
        hasAccess: false, 
        error: mockError 
      });

      const requirement: AuthorizationRequirement = {
        customerTier: CustomerTier.PREMIUM,
        feature: 'Premium Feature'
      };

      const result = await validateCustomerTierAuthorization(customerContext, requirement);

      expect(result.authorized).toBe(false);
      expect(result.error?.code).toBe(AuthErrorCodes.TIER_ACCESS_DENIED);
      expect(result.error?.statusCode).toBe(403);
    });

    it('should deny cross-pool access from staff', async () => {
      const staffContext: AuthorizationContext = {
        ...customerContext,
        userType: 'staff',
        claims: mockStaffClaims
      };

      const requirement: AuthorizationRequirement = {
        customerTier: CustomerTier.INDIVIDUAL
      };

      const result = await validateCustomerTierAuthorization(staffContext, requirement);

      expect(result.authorized).toBe(false);
      expect(result.error?.code).toBe('CROSS_POOL_ACCESS_DENIED');
      expect(result.error?.context?.crossPoolAttempt).toBe(true);
    });
  });

  describe('validateStaffPermissionAuthorization', () => {
    const staffContext: AuthorizationContext = {
      userType: 'staff',
      userId: 'staff-123',
      email: 'staff@example.com',
      ipAddress: '192.168.1.1',
      userAgent: 'test-agent',
      endpoint: 'GET /api/admin/test',
      requestId: 'test-request-id',
      claims: mockStaffClaims
    };

    it('should allow access for sufficient permissions', async () => {
      const requirement: AuthorizationRequirement = {
        staffPermissions: [AdminPermission.CONTENT_MODERATION]
      };

      const result = await validateStaffPermissionAuthorization(staffContext, requirement);

      expect(result.authorized).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should deny access for insufficient permissions', async () => {
      const requirement: AuthorizationRequirement = {
        staffPermissions: [AdminPermission.USER_MANAGEMENT],
        resource: 'user management'
      };

      const result = await validateStaffPermissionAuthorization(staffContext, requirement);

      expect(result.authorized).toBe(false);
      expect(result.error?.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(result.error?.statusCode).toBe(403);
    });

    it('should allow access for super admin with wildcard permission', async () => {
      const superAdminClaims: StaffClaims = {
        ...mockStaffClaims,
        permissions: ['*' as AdminPermission],
        role: StaffRole.SUPER_ADMIN
      };

      const superAdminContext: AuthorizationContext = {
        ...staffContext,
        claims: superAdminClaims
      };

      const requirement: AuthorizationRequirement = {
        staffPermissions: [AdminPermission.USER_MANAGEMENT]
      };

      const result = await validateStaffPermissionAuthorization(superAdminContext, requirement);

      expect(result.authorized).toBe(true);
    });

    it('should validate staff role requirements', async () => {
      const requirement: AuthorizationRequirement = {
        staffRole: StaffRole.ADMIN,
        resource: 'admin functions'
      };

      const result = await validateStaffPermissionAuthorization(staffContext, requirement);

      expect(result.authorized).toBe(false);
      expect(result.error?.code).toBe('ROLE_NOT_AUTHORIZED');
    });

    it('should allow access for sufficient role', async () => {
      const adminClaims: StaffClaims = {
        ...mockStaffClaims,
        role: StaffRole.ADMIN
      };

      const adminContext: AuthorizationContext = {
        ...staffContext,
        claims: adminClaims
      };

      const requirement: AuthorizationRequirement = {
        staffRole: StaffRole.TEAM_MEMBER
      };

      const result = await validateStaffPermissionAuthorization(adminContext, requirement);

      expect(result.authorized).toBe(true);
    });

    it('should deny cross-pool access from customer', async () => {
      const customerContext: AuthorizationContext = {
        ...staffContext,
        userType: 'customer',
        claims: mockCustomerClaims
      };

      const requirement: AuthorizationRequirement = {
        staffPermissions: [AdminPermission.CONTENT_MODERATION]
      };

      const result = await validateStaffPermissionAuthorization(customerContext, requirement);

      expect(result.authorized).toBe(false);
      expect(result.error?.code).toBe('CROSS_POOL_ACCESS_DENIED');
    });
  });

  describe('validateAuthorization', () => {
    const customerContext: AuthorizationContext = {
      userType: 'customer',
      userId: 'customer-123',
      email: 'customer@example.com',
      ipAddress: '192.168.1.1',
      userAgent: 'test-agent',
      endpoint: 'GET /api/test',
      requestId: 'test-request-id',
      claims: mockCustomerClaims
    };

    it('should validate user type requirements', async () => {
      const requirement: AuthorizationRequirement = {
        userType: 'staff'
      };

      const result = await validateAuthorization(customerContext, requirement);

      expect(result.authorized).toBe(false);
      expect(result.error?.code).toBe('CROSS_POOL_ACCESS_DENIED');
    });

    it('should delegate to customer validation for customer context', async () => {
      const { validateCustomerTierAccess } = require('../auth-errors');
      validateCustomerTierAccess.mockReturnValue({ hasAccess: true });

      const requirement: AuthorizationRequirement = {
        userType: 'customer',
        customerTier: CustomerTier.INDIVIDUAL
      };

      const result = await validateAuthorization(customerContext, requirement);

      expect(result.authorized).toBe(true);
    });

    it('should delegate to staff validation for staff context', async () => {
      const staffContext: AuthorizationContext = {
        ...customerContext,
        userType: 'staff',
        claims: mockStaffClaims
      };

      const requirement: AuthorizationRequirement = {
        userType: 'staff',
        staffPermissions: [AdminPermission.CONTENT_MODERATION]
      };

      const result = await validateAuthorization(staffContext, requirement);

      expect(result.authorized).toBe(true);
    });
  });

  describe('createAuthorizationMiddleware', () => {
    it('should return null for successful authorization', async () => {
      const { validateCustomerTierAccess } = require('../auth-errors');
      validateCustomerTierAccess.mockReturnValue({ hasAccess: true });

      const middleware = createAuthorizationMiddleware({
        userType: 'customer',
        customerTier: CustomerTier.INDIVIDUAL
      });

      const result = await middleware(mockEvent, mockCustomerClaims);

      expect(result).toBeNull();
    });

    it('should return error response for failed authorization', async () => {
      const { validateCustomerTierAccess } = require('../auth-errors');
      const mockError = {
        code: AuthErrorCodes.TIER_ACCESS_DENIED,
        message: 'Tier access denied',
        userMessage: 'This feature requires premium tier.'
      };
      validateCustomerTierAccess.mockReturnValue({ 
        hasAccess: false, 
        error: mockError 
      });

      const middleware = createAuthorizationMiddleware({
        userType: 'customer',
        customerTier: CustomerTier.PREMIUM
      });

      const result = await middleware(mockEvent, mockCustomerClaims);

      expect(result).not.toBeNull();
      expect(result?.statusCode).toBe(403);
    });
  });

  describe('Convenience Functions', () => {
    it('should create customer tier middleware', async () => {
      const middleware = requireCustomerTier(CustomerTier.PREMIUM, 'Premium Feature');
      expect(middleware).toBeDefined();
    });

    it('should create staff permission middleware', async () => {
      const middleware = requireStaffPermission(AdminPermission.USER_MANAGEMENT, 'user management');
      expect(middleware).toBeDefined();
    });

    it('should create staff role middleware', async () => {
      const middleware = requireStaffRole(StaffRole.ADMIN, 'admin functions');
      expect(middleware).toBeDefined();
    });

    it('should create multiple staff permissions middleware', async () => {
      const middleware = requireStaffPermissions([
        AdminPermission.USER_MANAGEMENT,
        AdminPermission.CONTENT_MODERATION
      ], 'admin functions');
      expect(middleware).toBeDefined();
    });

    it('should create customer-only access middleware', async () => {
      const middleware = requireCustomerAccess();
      expect(middleware).toBeDefined();
    });

    it('should create staff-only access middleware', async () => {
      const middleware = requireStaffAccess();
      expect(middleware).toBeDefined();
    });
  });

  describe('Error Logging', () => {
    it('should log authorization errors', async () => {
      const { logAuthorizationError, validateCustomerTierAccess } = require('../auth-errors');
      const mockError = {
        code: AuthErrorCodes.TIER_ACCESS_DENIED,
        message: 'Tier access denied',
        userMessage: 'This feature requires premium tier.'
      };
      validateCustomerTierAccess.mockReturnValue({ 
        hasAccess: false, 
        error: mockError 
      });

      const customerContext: AuthorizationContext = {
        userType: 'customer',
        userId: 'customer-123',
        email: 'customer@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        endpoint: 'GET /api/test',
        requestId: 'test-request-id',
        claims: mockCustomerClaims
      };

      const requirement: AuthorizationRequirement = {
        customerTier: CustomerTier.PREMIUM,
        feature: 'Premium Feature'
      };

      await validateCustomerTierAuthorization(customerContext, requirement);

      expect(logAuthorizationError).toHaveBeenCalledWith(
        mockError,
        'customer_tier_access_denied'
      );
    });
  });
});