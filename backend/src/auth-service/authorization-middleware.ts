/**
 * @fileoverview Authorization middleware for dual-pool authentication
 * 
 * This module provides middleware functions for validating permissions and roles
 * in both customer and staff authentication contexts. It integrates with the
 * comprehensive error handling system to provide user-friendly error messages
 * and proper audit logging.
 * 
 * Features:
 * - Customer tier-based authorization
 * - Staff permission-based authorization
 * - Cross-pool access prevention
 * - Comprehensive error handling and logging
 * - Request context preservation
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CustomerClaims, StaffClaims, CustomerTier, StaffRole, isCustomerClaims, isStaffClaims } from './interfaces';
import { AdminPermission } from '../types/common';
import {
  AuthErrorCodes,
  createPermissionError,
  createRoleAuthorizationError,
  createTierAccessError,
  createCrossPoolError,
  validateCustomerTierAccess,
  validateStaffPermissionAccess,
  logAuthorizationError,
  createAuthorizationErrorResponse,
  createUserFriendlyErrorMessage
} from './auth-errors';
import { createErrorResponse } from '../shared/utils';

/**
 * Authorization context interface
 */
export interface AuthorizationContext {
  userType: 'customer' | 'staff';
  userId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  requestId: string;
  claims: CustomerClaims | StaffClaims;
}

/**
 * Authorization requirement interface
 */
export interface AuthorizationRequirement {
  userType?: 'customer' | 'staff';
  customerTier?: CustomerTier;
  staffPermissions?: AdminPermission[];
  staffRole?: StaffRole;
  feature?: string;
  resource?: string;
}

/**
 * Authorization result interface
 */
export interface AuthorizationResult {
  authorized: boolean;
  error?: {
    code: AuthErrorCodes;
    message: string;
    userMessage: string;
    statusCode: number;
    context?: Record<string, any>;
  };
}

/**
 * Extract authorization context from API Gateway event
 */
export function extractAuthorizationContext(
  event: APIGatewayProxyEvent,
  claims: CustomerClaims | StaffClaims
): AuthorizationContext {
  const userType = isCustomerClaims(claims) ? 'customer' : 'staff';
  
  return {
    userType,
    userId: claims.sub,
    email: claims.email,
    ipAddress: event.requestContext.identity.sourceIp || 'unknown',
    userAgent: event.headers['User-Agent'] || 'unknown',
    endpoint: `${event.httpMethod} ${event.path}`,
    requestId: event.requestContext.requestId,
    claims
  };
}

/**
 * Validate customer tier authorization
 */
export async function validateCustomerTierAuthorization(
  context: AuthorizationContext,
  requirement: AuthorizationRequirement
): Promise<AuthorizationResult> {
  // Ensure this is a customer context
  if (context.userType !== 'customer' || !isCustomerClaims(context.claims)) {
    const crossPoolError = createCrossPoolError(
      context.userType,
      'customer',
      {
        email: context.email,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        endpoint: context.endpoint,
        requestId: context.requestId
      }
    );
    
    await logAuthorizationError(crossPoolError, 'customer_tier_validation_cross_pool');
    
    return {
      authorized: false,
      error: {
        code: crossPoolError.code,
        message: crossPoolError.message,
        userMessage: crossPoolError.userMessage,
        statusCode: 403,
        context: { crossPoolAttempt: true }
      }
    };
  }

  const customerClaims = context.claims as CustomerClaims;
  const customerTier = customerClaims['custom:customer_type'];
  
  // Validate tier access if required
  if (requirement.customerTier) {
    const tierValidation = validateCustomerTierAccess(
      customerTier,
      requirement.customerTier,
      requirement.feature || 'requested feature',
      {
        email: context.email,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        endpoint: context.endpoint,
        requestId: context.requestId
      }
    );
    
    if (!tierValidation.hasAccess && tierValidation.error) {
      await logAuthorizationError(tierValidation.error, 'customer_tier_access_denied');
      
      return {
        authorized: false,
        error: {
          code: tierValidation.error.code,
          message: tierValidation.error.message,
          userMessage: createUserFriendlyErrorMessage(tierValidation.error, {
            action: 'access',
            feature: requirement.feature,
            resource: requirement.resource
          }),
          statusCode: 403,
          context: {
            customerTier,
            requiredTier: requirement.customerTier,
            feature: requirement.feature
          }
        }
      };
    }
  }

  return { authorized: true };
}

/**
 * Validate staff permission authorization
 */
export async function validateStaffPermissionAuthorization(
  context: AuthorizationContext,
  requirement: AuthorizationRequirement
): Promise<AuthorizationResult> {
  // Ensure this is a staff context
  if (context.userType !== 'staff' || !isStaffClaims(context.claims)) {
    const crossPoolError = createCrossPoolError(
      context.userType,
      'staff',
      {
        email: context.email,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        endpoint: context.endpoint,
        requestId: context.requestId
      }
    );
    
    await logAuthorizationError(crossPoolError, 'staff_permission_validation_cross_pool');
    
    return {
      authorized: false,
      error: {
        code: crossPoolError.code,
        message: crossPoolError.message,
        userMessage: crossPoolError.userMessage,
        statusCode: 403,
        context: { crossPoolAttempt: true }
      }
    };
  }

  const staffClaims = context.claims as StaffClaims;
  
  // Validate role if required
  if (requirement.staffRole) {
    const userRole = staffClaims.role;
    
    // Define role hierarchy for comparison
    const roleHierarchy = {
      [StaffRole.SUPER_ADMIN]: 4,
      [StaffRole.ADMIN]: 3,
      [StaffRole.MANAGER]: 2,
      [StaffRole.TEAM_MEMBER]: 1
    };
    
    const userRoleLevel = roleHierarchy[userRole] || 0;
    const requiredRoleLevel = roleHierarchy[requirement.staffRole] || 999;
    
    if (userRoleLevel < requiredRoleLevel) {
      const roleError = createRoleAuthorizationError(
        'staff',
        userRole,
        requirement.staffRole,
        {
          email: context.email,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          endpoint: context.endpoint,
          requestId: context.requestId,
          resource: requirement.resource
        }
      );
      
      await logAuthorizationError(roleError, 'staff_role_authorization_denied');
      
      return {
        authorized: false,
        error: {
          code: roleError.code,
          message: roleError.message,
          userMessage: createUserFriendlyErrorMessage(roleError, {
            action: 'perform this action',
            resource: requirement.resource
          }),
          statusCode: 403,
          context: {
            userRole,
            requiredRole: requirement.staffRole,
            resource: requirement.resource
          }
        }
      };
    }
  }
  
  // Validate permissions if required
  if (requirement.staffPermissions && requirement.staffPermissions.length > 0) {
    const userPermissions = staffClaims.permissions;
    
    // Check if user has all required permissions
    const missingPermissions = requirement.staffPermissions.filter(
      permission => !userPermissions.includes(permission) && 
                   !userPermissions.includes('*' as AdminPermission)
    );
    
    if (missingPermissions.length > 0) {
      const permissionError = createPermissionError(
        'staff',
        missingPermissions[0], // Report first missing permission
        userPermissions.map(p => p.toString()),
        {
          email: context.email,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          endpoint: context.endpoint,
          requestId: context.requestId,
          resource: requirement.resource
        }
      );
      
      await logAuthorizationError(permissionError, 'staff_permission_authorization_denied');
      
      return {
        authorized: false,
        error: {
          code: permissionError.code,
          message: permissionError.message,
          userMessage: createUserFriendlyErrorMessage(permissionError, {
            action: 'perform this action',
            resource: requirement.resource
          }),
          statusCode: 403,
          context: {
            userPermissions,
            requiredPermissions: requirement.staffPermissions,
            missingPermissions,
            resource: requirement.resource
          }
        }
      };
    }
  }

  return { authorized: true };
}

/**
 * Comprehensive authorization validation
 */
export async function validateAuthorization(
  context: AuthorizationContext,
  requirement: AuthorizationRequirement
): Promise<AuthorizationResult> {
  // Validate user type if specified
  if (requirement.userType && context.userType !== requirement.userType) {
    const crossPoolError = createCrossPoolError(
      context.userType,
      requirement.userType,
      {
        email: context.email,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        endpoint: context.endpoint,
        requestId: context.requestId
      }
    );
    
    await logAuthorizationError(crossPoolError, 'authorization_user_type_mismatch');
    
    return {
      authorized: false,
      error: {
        code: crossPoolError.code,
        message: crossPoolError.message,
        userMessage: crossPoolError.userMessage,
        statusCode: 403,
        context: { 
          userType: context.userType,
          requiredUserType: requirement.userType
        }
      }
    };
  }

  // Validate customer-specific requirements
  if (context.userType === 'customer') {
    return await validateCustomerTierAuthorization(context, requirement);
  }
  
  // Validate staff-specific requirements
  if (context.userType === 'staff') {
    return await validateStaffPermissionAuthorization(context, requirement);
  }

  return { authorized: true };
}

/**
 * Authorization middleware factory
 */
export function createAuthorizationMiddleware(requirement: AuthorizationRequirement) {
  return async (
    event: APIGatewayProxyEvent,
    claims: CustomerClaims | StaffClaims
  ): Promise<APIGatewayProxyResult | null> => {
    const context = extractAuthorizationContext(event, claims);
    const result = await validateAuthorization(context, requirement);
    
    if (!result.authorized && result.error) {
      // Create standardized error response
      const errorResponse = createAuthorizationErrorResponse({
        code: result.error.code,
        message: result.error.message,
        userMessage: result.error.userMessage,
        userType: context.userType,
        severity: 'MEDIUM' as any,
        category: 'AUTHORIZATION' as any,
        retryable: false,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
        context: result.error.context,
        recoveryOptions: []
      }, result.error.statusCode);
      
      return {
        statusCode: errorResponse.statusCode,
        headers: errorResponse.headers,
        body: errorResponse.body
      };
    }
    
    return null; // Authorization successful, continue processing
  };
}

/**
 * Convenience functions for common authorization patterns
 */

/**
 * Require customer tier
 */
export function requireCustomerTier(tier: CustomerTier, feature?: string) {
  return createAuthorizationMiddleware({
    userType: 'customer',
    customerTier: tier,
    feature
  });
}

/**
 * Require staff permission
 */
export function requireStaffPermission(permission: AdminPermission, resource?: string) {
  return createAuthorizationMiddleware({
    userType: 'staff',
    staffPermissions: [permission],
    resource
  });
}

/**
 * Require staff role
 */
export function requireStaffRole(role: StaffRole, resource?: string) {
  return createAuthorizationMiddleware({
    userType: 'staff',
    staffRole: role,
    resource
  });
}

/**
 * Require multiple staff permissions
 */
export function requireStaffPermissions(permissions: AdminPermission[], resource?: string) {
  return createAuthorizationMiddleware({
    userType: 'staff',
    staffPermissions: permissions,
    resource
  });
}

/**
 * Customer-only access
 */
export function requireCustomerAccess() {
  return createAuthorizationMiddleware({
    userType: 'customer'
  });
}

/**
 * Staff-only access
 */
export function requireStaffAccess() {
  return createAuthorizationMiddleware({
    userType: 'staff'
  });
}