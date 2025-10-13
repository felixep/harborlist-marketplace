/**
 * @fileoverview Staff API Gateway Lambda Authorizer
 * 
 * This Lambda function serves as an API Gateway authorizer for staff endpoints.
 * It validates JWT tokens from the Staff Cognito User Pool and returns appropriate
 * IAM policy documents for API Gateway authorization with enhanced security checks.
 * 
 * Features:
 * - Validates staff JWT tokens using Cognito JWKS
 * - Enhanced security with shorter TTL validation
 * - Extracts staff role and permissions from token claims
 * - Returns IAM policy documents for API Gateway
 * - Prevents cross-pool access (customer tokens cannot access staff endpoints)
 * - Integrates with existing admin interface routing
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { 
  APIGatewayTokenAuthorizerEvent, 
  APIGatewayAuthorizerResult,
  PolicyDocument,
  Statement
} from 'aws-lambda';
import { validateJWTToken } from '../../backend/src/auth-service/jwt-utils';
import { StaffClaims, StaffRole, STAFF_PERMISSIONS } from '../../backend/src/auth-service/interfaces';
import { AdminPermission } from '../../backend/src/types/common';

/**
 * Environment configuration interface
 */
interface AuthorizerConfig {
  staffPoolId: string;
  staffClientId: string;
  region: string;
  cognitoEndpoint?: string; // For LocalStack
  staffSessionTTL: number; // Enhanced security: shorter TTL for staff
}

/**
 * Get environment configuration
 */
function getAuthorizerConfig(): AuthorizerConfig {
  const environment = process.env.ENVIRONMENT || 'local';
  const useLocalStack = process.env.DEPLOYMENT_TARGET === 'localstack';
  
  return {
    staffPoolId: process.env.STAFF_USER_POOL_ID || '',
    staffClientId: process.env.STAFF_USER_POOL_CLIENT_ID || '',
    region: process.env.AWS_REGION || 'us-east-1',
    cognitoEndpoint: useLocalStack ? process.env.COGNITO_ENDPOINT : undefined,
    staffSessionTTL: parseInt(process.env.STAFF_SESSION_TTL || '28800'), // 8 hours default
  };
}

/**
 * Generate IAM policy document for API Gateway
 */
function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context?: Record<string, string | number | boolean>
): APIGatewayAuthorizerResult {
  const policyDocument: PolicyDocument = {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
      } as Statement,
    ],
  };

  return {
    principalId,
    policyDocument,
    context: context || {},
  };
}

/**
 * Generate allow policy for staff with permissions context
 */
function generateStaffAllowPolicy(
  claims: StaffClaims,
  resource: string
): APIGatewayAuthorizerResult {
  const context = {
    userId: claims.sub,
    email: claims.email,
    role: claims.role,
    permissions: JSON.stringify(claims.permissions),
    groups: JSON.stringify(claims['cognito:groups'] || []),
    team: claims['custom:team'] || '',
    tokenUse: claims.token_use,
    sessionAge: Math.floor(Date.now() / 1000) - claims.iat,
  };

  return generatePolicy(claims.sub, 'Allow', resource, context);
}

/**
 * Generate deny policy with error context
 */
function generateDenyPolicy(
  principalId: string,
  resource: string,
  errorCode: string,
  errorMessage: string
): APIGatewayAuthorizerResult {
  const context = {
    errorCode,
    errorMessage,
    timestamp: new Date().toISOString(),
  };

  return generatePolicy(principalId, 'Deny', resource, context);
}

/**
 * Validate that the token is from the staff pool (not customer pool)
 */
function validateStaffPoolToken(claims: any): boolean {
  // Check if this is a staff token by looking for staff-specific claims
  return (
    claims['custom:permissions'] !== undefined && // Staff tokens have this field
    !claims['custom:customer_type'] && // Customer tokens have this field
    claims.token_use === 'access'
  );
}

/**
 * Determine staff role from groups with precedence
 */
function determineStaffRole(groups: string[]): StaffRole {
  // Roles are ordered by precedence in the enum
  for (const role of Object.values(StaffRole)) {
    if (groups.includes(role)) {
      return role;
    }
  }
  return StaffRole.TEAM_MEMBER; // Default role
}

/**
 * Parse staff permissions from token or derive from role
 */
function parseStaffPermissions(claims: any, role: StaffRole): AdminPermission[] {
  try {
    const permissionsStr = claims['custom:permissions'];
    if (permissionsStr) {
      return JSON.parse(permissionsStr);
    }
  } catch (error) {
    console.warn('Failed to parse staff permissions from token, using role-based permissions');
  }
  
  // Fall back to role-based permissions
  return STAFF_PERMISSIONS[role] || STAFF_PERMISSIONS[StaffRole.TEAM_MEMBER];
}

/**
 * Main Lambda authorizer handler
 */
export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  console.log('Staff Authorizer Event:', JSON.stringify(event, null, 2));

  const { authorizationToken, methodArn } = event;
  const config = getAuthorizerConfig();

  // Extract token from Authorization header
  if (!authorizationToken || !authorizationToken.startsWith('Bearer ')) {
    console.log('Missing or invalid authorization token format');
    return generateDenyPolicy(
      'unknown',
      methodArn,
      'INVALID_TOKEN_FORMAT',
      'Authorization token must be in Bearer format'
    );
  }

  const token = authorizationToken.substring(7); // Remove 'Bearer ' prefix

  try {
    // Validate JWT token using Cognito JWKS
    const verifiedToken = await validateJWTToken(
      token,
      config.staffPoolId,
      config.staffClientId,
      config.region,
      config.cognitoEndpoint
    );

    console.log('Token verified successfully:', {
      sub: verifiedToken.sub,
      email: verifiedToken.email,
      groups: verifiedToken['cognito:groups'],
      tokenUse: verifiedToken.token_use,
    });

    // Validate this is a staff pool token (prevent cross-pool access)
    if (!validateStaffPoolToken(verifiedToken)) {
      console.log('Cross-pool access attempt detected - not a staff token');
      return generateDenyPolicy(
        verifiedToken.sub || 'unknown',
        methodArn,
        'CROSS_POOL_ACCESS',
        'Customer tokens cannot access staff endpoints'
      );
    }

    // Enhanced security: Check token age against shorter TTL for staff
    const now = Math.floor(Date.now() / 1000);
    const tokenAge = now - verifiedToken.iat;
    
    if (tokenAge > config.staffSessionTTL) {
      console.log('Staff token has exceeded maximum session duration:', {
        tokenAge,
        maxAge: config.staffSessionTTL,
      });
      return generateDenyPolicy(
        verifiedToken.sub,
        methodArn,
        'SESSION_EXPIRED',
        'Staff token has exceeded maximum session duration'
      );
    }

    // Check standard token expiration
    if (verifiedToken.exp < now) {
      console.log('Token has expired');
      return generateDenyPolicy(
        verifiedToken.sub,
        methodArn,
        'TOKEN_EXPIRED',
        'Access token has expired'
      );
    }

    // Determine staff role from groups
    const groups = verifiedToken['cognito:groups'] || [];
    const staffRole = determineStaffRole(groups);
    
    // Parse permissions from token or derive from role
    const permissions = parseStaffPermissions(verifiedToken, staffRole);

    // Extract staff claims
    const staffClaims: StaffClaims = {
      sub: verifiedToken.sub,
      email: verifiedToken.email,
      email_verified: verifiedToken.email_verified,
      name: verifiedToken.name,
      'custom:permissions': verifiedToken['custom:permissions'] || JSON.stringify(permissions),
      'custom:team': verifiedToken['custom:team'],
      'cognito:groups': groups,
      permissions,
      role: staffRole,
      iss: verifiedToken.iss,
      aud: verifiedToken.aud,
      token_use: verifiedToken.token_use,
      iat: verifiedToken.iat,
      exp: verifiedToken.exp,
    };

    // Generate allow policy with staff context
    console.log('Authorizing staff access:', {
      userId: staffClaims.sub,
      role: staffClaims.role,
      permissions: staffClaims.permissions.length,
      sessionAge: tokenAge,
    });

    return generateStaffAllowPolicy(staffClaims, methodArn);

  } catch (error: any) {
    console.error('Token validation failed:', error);

    // Determine error type for appropriate response
    let errorCode = 'INVALID_TOKEN';
    let errorMessage = 'Invalid or expired token';

    if (error.message?.includes('Token is expired')) {
      errorCode = 'TOKEN_EXPIRED';
      errorMessage = 'Access token has expired';
    } else if (error.message?.includes('Invalid signature')) {
      errorCode = 'INVALID_SIGNATURE';
      errorMessage = 'Token signature is invalid';
    } else if (error.message?.includes('Invalid audience')) {
      errorCode = 'INVALID_AUDIENCE';
      errorMessage = 'Token audience is invalid';
    }

    return generateDenyPolicy(
      'unknown',
      methodArn,
      errorCode,
      errorMessage
    );
  }
};