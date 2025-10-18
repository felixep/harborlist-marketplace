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
import { DynamoDB } from 'aws-sdk';
// Phase 3 imports
import { TeamId, TeamAssignment } from '../types/teams';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasTeamAccess as checkTeamAccess,
  isTeamManager as checkTeamManager,
  canPerformAction
} from '../shared/team-permissions';

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

/**
 * Dealer-specific authorization functions
 */

/**
 * Check if user has dealer or premium_dealer tier
 */
export async function isDealerTier(userId: string): Promise<boolean> {
  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient, GetCommand } = await import('@aws-sdk/lib-dynamodb');
  
  const dynamoClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    ...(process.env.IS_LOCALSTACK === 'true' && {
      endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    }),
  });

  const docClient = DynamoDBDocumentClient.from(dynamoClient);
  const USERS_TABLE = process.env.USERS_TABLE || 'harborlist-users';

  try {
    const result = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { id: userId }
    }));

    if (!result.Item) {
      return false;
    }

    const customerTier = result.Item.customerTier;
    return customerTier === 'dealer' || customerTier === 'premium_dealer';
  } catch (error) {
    console.error('Error checking dealer tier:', error);
    return false;
  }
}

/**
 * Validate dealer sub-account ownership
 * Ensures the user can only access sub-accounts they own (parentDealerId matches)
 */
export async function validateDealerSubAccountOwnership(
  userId: string,
  subAccountId: string
): Promise<{ authorized: boolean; error?: string }> {
  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient, GetCommand } = await import('@aws-sdk/lib-dynamodb');
  
  const dynamoClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    ...(process.env.IS_LOCALSTACK === 'true' && {
      endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    }),
  });

  const docClient = DynamoDBDocumentClient.from(dynamoClient);
  const USERS_TABLE = process.env.USERS_TABLE || 'harborlist-users';

  try {
    // Get the sub-account
    const result = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { id: subAccountId }
    }));

    if (!result.Item) {
      return {
        authorized: false,
        error: 'Sub-account not found'
      };
    }

    // Verify it's actually a sub-account
    if (!result.Item.parentDealerId) {
      return {
        authorized: false,
        error: 'Not a sub-account'
      };
    }

    // Verify ownership
    if (result.Item.parentDealerId !== userId) {
      return {
        authorized: false,
        error: 'You do not have permission to access this sub-account'
      };
    }

    return { authorized: true };
  } catch (error) {
    console.error('Error validating sub-account ownership:', error);
    return {
      authorized: false,
      error: 'Failed to validate sub-account ownership'
    };
  }
}

/**
 * Dealer tier requirement middleware
 */
export function requireDealerTier(feature?: string) {
  return async (
    event: APIGatewayProxyEvent,
    claims: CustomerClaims | StaffClaims
  ): Promise<APIGatewayProxyResult | null> => {
    const context = extractAuthorizationContext(event, claims);
    
    // Must be a customer
    if (context.userType !== 'customer' || !isCustomerClaims(context.claims)) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'This endpoint is only accessible to customers',
          userMessage: 'Access denied. This feature is only available to dealer accounts.'
        })
      };
    }

    // Check if user has dealer tier
    const isDealer = await isDealerTier(context.userId);
    
    if (!isDealer) {
      const tierError = createTierAccessError(
        'basic', // Assume basic if not dealer
        'dealer',
        feature || 'sub-account management',
        {
          email: context.email,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          endpoint: context.endpoint,
          requestId: context.requestId
        }
      );
      
      await logAuthorizationError(tierError, 'dealer_tier_required');
      
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Insufficient Tier',
          message: tierError.message,
          userMessage: createUserFriendlyErrorMessage(tierError, {
            action: 'access sub-account management',
            feature: feature || 'sub-account management'
          }),
          requiredTier: 'dealer',
          upgradeRequired: true
        })
      };
    }
    
    return null; // Authorization successful
  };
}

/**
 * Dealer sub-account ownership requirement middleware
 */
export function requireSubAccountOwnership(getSubAccountId: (event: APIGatewayProxyEvent) => string) {
  return async (
    event: APIGatewayProxyEvent,
    claims: CustomerClaims | StaffClaims
  ): Promise<APIGatewayProxyResult | null> => {
    const context = extractAuthorizationContext(event, claims);
    
    // Must be a customer
    if (context.userType !== 'customer' || !isCustomerClaims(context.claims)) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'This endpoint is only accessible to customers'
        })
      };
    }

    // Get sub-account ID from the event
    const subAccountId = getSubAccountId(event);
    
    if (!subAccountId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'Sub-account ID is required'
        })
      };
    }

    // Validate ownership
    const validation = await validateDealerSubAccountOwnership(context.userId, subAccountId);
    
    if (!validation.authorized) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Forbidden',
          message: validation.error || 'You do not have permission to access this sub-account',
          userMessage: 'You can only manage sub-accounts that belong to your dealer account.'
        })
      };
    }
    
    return null; // Authorization successful
  };
}

// ============================================================================
// Phase 3: Team-Based Authorization Functions
// ============================================================================

const dynamoDB = new DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE_NAME || 'harborlist-users';

/**
 * Get user's team assignments and effective permissions from database
 * 
 * @param userId - User ID to fetch teams for
 * @returns User's teams and effective permissions, or null if not found
 */
async function getUserTeamsAndPermissions(userId: string): Promise<{
  teams: TeamAssignment[];
  effectivePermissions: string[];
} | null> {
  try {
    const result = await dynamoDB.get({
      TableName: USERS_TABLE,
      Key: { id: userId }
    }).promise();
    
    if (!result.Item) {
      return null;
    }
    
    return {
      teams: result.Item.teams || [],
      effectivePermissions: result.Item.effectivePermissions || []
    };
  } catch (error) {
    console.error('Error fetching user teams:', error);
    return null;
  }
}

/**
 * Middleware: Require user to have access to a specific team
 * 
 * Use this to restrict endpoints to team members only
 * 
 * @param teamId - Team that user must be a member of
 * @returns Middleware function
 */
export function requireTeamAccess(teamId: TeamId) {
  return async (
    event: APIGatewayProxyEvent,
    claims: CustomerClaims | StaffClaims
  ): Promise<APIGatewayProxyResult | null> => {
    const context = extractAuthorizationContext(event, claims);
    
    // Only check for staff users
    if (context.userType !== 'staff') {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'This endpoint is only accessible to staff members',
          userMessage: 'You do not have permission to access this resource.'
        })
      };
    }
    
    // Fetch user's team assignments
    const userData = await getUserTeamsAndPermissions(context.userId);
    
    if (!userData) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to fetch user team assignments',
          userMessage: 'An error occurred while verifying your access.'
        })
      };
    }
    
    // Check team access
    if (!checkTeamAccess(userData.teams, teamId)) {
      // Log authorization failure
      console.warn('Team access denied', {
        userId: context.userId,
        email: context.email,
        requiredTeam: teamId,
        userTeams: userData.teams.map(t => t.teamId),
        endpoint: context.endpoint,
        timestamp: new Date().toISOString()
      });
      
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Insufficient Team Access',
          message: `User is not a member of the required team: ${teamId}`,
          userMessage: 'You do not have access to this team\'s resources.',
          requiredTeam: teamId
        })
      };
    }
    
    return null; // Authorization successful
  };
}

/**
 * Middleware: Require user to have ANY of the specified permissions
 * 
 * User needs at least one of the permissions (OR logic)
 * 
 * @param permissions - Array of acceptable permissions
 * @param errorMessage - Optional custom error message
 * @returns Middleware function
 */
export function requireAnyPermission(
  permissions: string[],
  errorMessage?: string
) {
  return async (
    event: APIGatewayProxyEvent,
    claims: CustomerClaims | StaffClaims
  ): Promise<APIGatewayProxyResult | null> => {
    const context = extractAuthorizationContext(event, claims);
    
    // Only check for staff users
    if (context.userType !== 'staff') {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'This endpoint is only accessible to staff members',
          userMessage: 'You do not have permission to access this resource.'
        })
      };
    }
    
    // Fetch user's effective permissions
    const userData = await getUserTeamsAndPermissions(context.userId);
    
    if (!userData) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to fetch user permissions',
          userMessage: 'An error occurred while verifying your permissions.'
        })
      };
    }
    
    // Check if user has any of the required permissions
    if (!hasAnyPermission(userData.effectivePermissions, permissions)) {
      // Log authorization failure
      console.warn('Permission denied (requireAny)', {
        userId: context.userId,
        email: context.email,
        requiredPermissions: permissions,
        userPermissions: userData.effectivePermissions,
        endpoint: context.endpoint,
        timestamp: new Date().toISOString()
      });
      
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Insufficient Permissions',
          message: errorMessage || `User must have at least one of the following permissions: ${permissions.join(', ')}`,
          userMessage: 'You do not have the required permissions to perform this action.',
          requiredPermissions: permissions
        })
      };
    }
    
    return null; // Authorization successful
  };
}

/**
 * Middleware: Require user to have ALL of the specified permissions
 * 
 * User needs all permissions (AND logic)
 * 
 * @param permissions - Array of required permissions
 * @param errorMessage - Optional custom error message
 * @returns Middleware function
 */
export function requireAllPermissions(
  permissions: string[],
  errorMessage?: string
) {
  return async (
    event: APIGatewayProxyEvent,
    claims: CustomerClaims | StaffClaims
  ): Promise<APIGatewayProxyResult | null> => {
    const context = extractAuthorizationContext(event, claims);
    
    // Only check for staff users
    if (context.userType !== 'staff') {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'This endpoint is only accessible to staff members',
          userMessage: 'You do not have permission to access this resource.'
        })
      };
    }
    
    // Fetch user's effective permissions
    const userData = await getUserTeamsAndPermissions(context.userId);
    
    if (!userData) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to fetch user permissions',
          userMessage: 'An error occurred while verifying your permissions.'
        })
      };
    }
    
    // Check if user has all required permissions
    if (!hasAllPermissions(userData.effectivePermissions, permissions)) {
      // Find missing permissions for better error message
      const missingPermissions = permissions.filter(
        p => !userData.effectivePermissions.includes(p)
      );
      
      // Log authorization failure
      console.warn('Permission denied (requireAll)', {
        userId: context.userId,
        email: context.email,
        requiredPermissions: permissions,
        missingPermissions,
        userPermissions: userData.effectivePermissions,
        endpoint: context.endpoint,
        timestamp: new Date().toISOString()
      });
      
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Insufficient Permissions',
          message: errorMessage || `User must have all of the following permissions: ${permissions.join(', ')}`,
          userMessage: 'You do not have the required permissions to perform this action.',
          requiredPermissions: permissions,
          missingPermissions
        })
      };
    }
    
    return null; // Authorization successful
  };
}

/**
 * Middleware: Require user to be a manager of a specific team
 * 
 * Use this for team management operations that require manager privileges
 * 
 * @param teamId - Team that user must be a manager of
 * @returns Middleware function
 */
export function requireTeamManager(teamId: TeamId) {
  return async (
    event: APIGatewayProxyEvent,
    claims: CustomerClaims | StaffClaims
  ): Promise<APIGatewayProxyResult | null> => {
    const context = extractAuthorizationContext(event, claims);
    
    // Only check for staff users
    if (context.userType !== 'staff') {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'This endpoint is only accessible to staff members',
          userMessage: 'You do not have permission to access this resource.'
        })
      };
    }
    
    // Fetch user's team assignments
    const userData = await getUserTeamsAndPermissions(context.userId);
    
    if (!userData) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to fetch user team assignments',
          userMessage: 'An error occurred while verifying your access.'
        })
      };
    }
    
    // Check if user is a manager of the team
    if (!checkTeamManager(userData.teams, teamId)) {
      // Log authorization failure
      console.warn('Team manager access denied', {
        userId: context.userId,
        email: context.email,
        requiredTeam: teamId,
        userTeams: userData.teams.map(t => ({ teamId: t.teamId, role: t.role })),
        endpoint: context.endpoint,
        timestamp: new Date().toISOString()
      });
      
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Insufficient Team Access',
          message: `User must be a manager of team: ${teamId}`,
          userMessage: 'You must be a team manager to perform this action.',
          requiredTeam: teamId,
          requiredRole: 'manager'
        })
      };
    }
    
    return null; // Authorization successful
  };
}

/**
 * Helper: Check if user has a specific permission (for use in handlers)
 * 
 * Use this inside handler functions when you need programmatic permission checking
 * 
 * @param userId - User ID to check
 * @param permission - Permission to check for
 * @returns True if user has the permission
 */
export async function userHasPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  const userData = await getUserTeamsAndPermissions(userId);
  if (!userData) return false;
  
  return hasPermission(userData.effectivePermissions, permission);
}

/**
 * Helper: Get user's team assignments (for use in handlers)
 * 
 * @param userId - User ID to get teams for
 * @returns User's team assignments
 */
export async function getUserTeams(userId: string): Promise<TeamAssignment[]> {
  const userData = await getUserTeamsAndPermissions(userId);
  return userData?.teams || [];
}

/**
 * Helper: Get user's effective permissions (for use in handlers)
 * 
 * @param userId - User ID to get permissions for
 * @returns User's effective permissions
 */
export async function getUserEffectivePermissions(userId: string): Promise<string[]> {
  const userData = await getUserTeamsAndPermissions(userId);
  return userData?.effectivePermissions || [];
}