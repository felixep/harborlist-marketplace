/**
 * @fileoverview Customer API Gateway Lambda Authorizer
 * 
 * This Lambda function serves as an API Gateway authorizer for customer endpoints.
 * It validates JWT tokens from the Customer Cognito User Pool and returns appropriate
 * IAM policy documents for API Gateway authorization.
 * 
 * Features:
 * - Validates customer JWT tokens using Cognito JWKS
 * - Extracts customer tier and permissions from token claims
 * - Returns IAM policy documents for API Gateway
 * - Prevents cross-pool access (staff tokens cannot access customer endpoints)
 * - Caches authorization results for performance
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
import { CustomerClaims, CustomerTier, CUSTOMER_PERMISSIONS } from '../../backend/src/auth-service/interfaces';
import { 
  AuthErrorCodes,
  createAuthError,
  createCrossPoolError,
  logAuthError,
  logAuthorizationError,
  extractUserTypeFromToken
} from '../../backend/src/auth-service/auth-errors';

/**
 * Environment configuration interface
 */
interface AuthorizerConfig {
  customerPoolId: string;
  customerClientId: string;
  region: string;
  cognitoEndpoint?: string; // For LocalStack
}

/**
 * Get environment configuration
 */
function getAuthorizerConfig(): AuthorizerConfig {
  const environment = process.env.ENVIRONMENT || 'local';
  const useLocalStack = process.env.DEPLOYMENT_TARGET === 'localstack';
  
  return {
    customerPoolId: process.env.CUSTOMER_USER_POOL_ID || '',
    customerClientId: process.env.CUSTOMER_USER_POOL_CLIENT_ID || '',
    region: process.env.AWS_REGION || 'us-east-1',
    cognitoEndpoint: useLocalStack ? process.env.COGNITO_ENDPOINT : undefined,
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
 * Generate allow policy for customer with permissions context
 */
function generateCustomerAllowPolicy(
  claims: CustomerClaims,
  resource: string
): APIGatewayAuthorizerResult {
  const context = {
    userId: claims.sub,
    email: claims.email,
    customerType: claims['custom:customer_type'],
    permissions: JSON.stringify(claims.permissions),
    groups: JSON.stringify(claims['cognito:groups'] || []),
    tokenUse: claims.token_use,
  };

  return generatePolicy(claims.sub, 'Allow', resource, context);
}

/**
 * Generate deny policy with comprehensive error context
 */
function generateDenyPolicy(
  principalId: string,
  resource: string,
  errorCode: AuthErrorCodes,
  errorMessage: string,
  additionalContext?: Record<string, any>
): APIGatewayAuthorizerResult {
  const context = {
    errorCode,
    errorMessage,
    timestamp: new Date().toISOString(),
    userType: 'customer',
    ...additionalContext,
  };

  return generatePolicy(principalId, 'Deny', resource, context);
}

/**
 * Validate that the token is from the customer pool (not staff pool)
 */
function validateCustomerPoolToken(claims: any): boolean {
  // Check if this is a customer token by looking for customer-specific claims
  return (
    claims['custom:customer_type'] !== undefined &&
    !claims['custom:permissions'] && // Staff tokens have this field
    claims.token_use === 'access'
  );
}

/**
 * Main Lambda authorizer handler
 */
export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  console.log('Customer Authorizer Event:', JSON.stringify(event, null, 2));

  const { authorizationToken, methodArn } = event;
  const config = getAuthorizerConfig();

  // Extract token from Authorization header
  if (!authorizationToken || !authorizationToken.startsWith('Bearer ')) {
    console.log('Missing or invalid authorization token format');
    
    const authError = createAuthError(
      { name: 'InvalidTokenException', message: 'Missing or invalid authorization token format' },
      'customer',
      { endpoint: methodArn }
    );
    
    await logAuthError(authError, 'customer_authorizer_invalid_format').catch(console.error);
    
    return generateDenyPolicy(
      'unknown',
      methodArn,
      AuthErrorCodes.TOKEN_INVALID,
      authError.userMessage
    );
  }

  const token = authorizationToken.substring(7); // Remove 'Bearer ' prefix

  try {
    // Validate JWT token using Cognito JWKS
    const verifiedToken = await validateJWTToken(
      token,
      config.customerPoolId,
      config.customerClientId,
      config.region,
      config.cognitoEndpoint
    );

    console.log('Token verified successfully:', {
      sub: verifiedToken.sub,
      email: verifiedToken.email,
      customerType: verifiedToken['custom:customer_type'],
      tokenUse: verifiedToken.token_use,
    });

    // Validate this is a customer pool token (prevent cross-pool access)
    if (!validateCustomerPoolToken(verifiedToken)) {
      console.log('Cross-pool access attempt detected - not a customer token');
      
      // Determine the actual token type
      const tokenUserType = extractUserTypeFromToken(token);
      
      const crossPoolError = createCrossPoolError(
        tokenUserType || 'staff', // Assume staff if we can't determine
        'customer',
        { endpoint: methodArn }
      );
      
      await logAuthorizationError(crossPoolError, 'cross_pool_access_attempt').catch(console.error);
      
      return generateDenyPolicy(
        verifiedToken.sub || 'unknown',
        methodArn,
        crossPoolError.code,
        crossPoolError.userMessage,
        { crossPoolAttempt: true, tokenUserType }
      );
    }

    // Extract customer claims
    const customerType = verifiedToken['custom:customer_type'] as CustomerTier || CustomerTier.INDIVIDUAL;
    const permissions = CUSTOMER_PERMISSIONS[customerType] || CUSTOMER_PERMISSIONS[CustomerTier.INDIVIDUAL];

    const customerClaims: CustomerClaims = {
      sub: verifiedToken.sub,
      email: verifiedToken.email,
      email_verified: verifiedToken.email_verified,
      name: verifiedToken.name,
      'custom:customer_type': customerType,
      'cognito:groups': verifiedToken['cognito:groups'] || [],
      permissions,
      iss: verifiedToken.iss,
      aud: verifiedToken.aud,
      token_use: verifiedToken.token_use,
      iat: verifiedToken.iat,
      exp: verifiedToken.exp,
    };

    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (customerClaims.exp < now) {
      console.log('Token has expired');
      
      const expiredError = createAuthError(
        { name: 'ExpiredTokenException', message: 'Token has expired' },
        'customer',
        { 
          email: customerClaims.email,
          endpoint: methodArn,
          tokenExpiry: customerClaims.exp,
          currentTime: now
        }
      );
      
      await logAuthError(expiredError, 'customer_authorizer_expired_token').catch(console.error);
      
      return generateDenyPolicy(
        customerClaims.sub,
        methodArn,
        AuthErrorCodes.TOKEN_EXPIRED,
        expiredError.userMessage
      );
    }

    // Generate allow policy with customer context
    console.log('Authorizing customer access:', {
      userId: customerClaims.sub,
      customerType: customerClaims['custom:customer_type'],
      permissions: customerClaims.permissions.length,
    });

    return generateCustomerAllowPolicy(customerClaims, methodArn);

  } catch (error: any) {
    console.error('Token validation failed:', error);

    // Create comprehensive auth error
    const authError = createAuthError(
      error,
      'customer',
      { 
        endpoint: methodArn,
        operation: 'token_validation'
      }
    );
    
    // Log the error for audit purposes
    await logAuthError(authError, 'customer_authorizer_validation_failed', {
      originalError: error.message,
      tokenPresent: !!token,
      tokenLength: token?.length
    }).catch(console.error);

    return generateDenyPolicy(
      'unknown',
      methodArn,
      authError.code,
      authError.userMessage,
      { 
        validationFailed: true,
        originalError: error.name
      }
    );
  }
};