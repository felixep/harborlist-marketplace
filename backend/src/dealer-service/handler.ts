/**
 * @fileoverview Dealer Sub-Account API Handler
 * 
 * Lambda-style handler for dealer sub-account management API endpoints.
 * Provides REST API for creating, listing, updating, and deleting sub-accounts.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import {
  createSubAccount,
  listSubAccounts,
  getSubAccount,
  updateSubAccount,
  deleteSubAccount,
  CreateSubAccountRequest,
  UpdateSubAccountRequest
} from './index';
import { DealerSubAccountRole } from '../types/common';
import {
  requireDealerTier,
  requireSubAccountOwnership,
  extractAuthorizationContext
} from '../auth-service/authorization-middleware';
import type { CustomerClaims, StaffClaims, isCustomerClaims } from '../auth-service/interfaces';

/**
 * Extract user information from Lambda authorizer context
 */
function getUserFromEvent(event: APIGatewayProxyEvent): {
  userId: string;
  email: string;
  role: string;
  permissions?: string[];
} | null {
  const authorizer = event.requestContext?.authorizer;
  
  if (!authorizer || !authorizer.claims) {
    return null;
  }

  return {
    userId: authorizer.claims.sub,
    email: authorizer.claims.email,
    role: authorizer.claims.role,
    permissions: authorizer.claims.permissions 
      ? JSON.parse(authorizer.claims.permissions) 
      : []
  };
}

/**
 * Extract claims from the event (for authorization middleware)
 */
function getClaimsFromEvent(event: APIGatewayProxyEvent): CustomerClaims | StaffClaims | null {
  const authorizer = event.requestContext?.authorizer;
  
  if (!authorizer || !authorizer.claims) {
    return null;
  }

  return authorizer.claims as CustomerClaims | StaffClaims;
}

/**
 * Main Lambda handler for dealer sub-account API
 */
export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  console.log('Dealer API handler invoked:', {
    method: event.httpMethod,
    path: event.path,
    pathParameters: event.pathParameters
  });

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    // Extract authenticated user
    const user = getUserFromEvent(event);
    
    if (!user) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required'
        })
      };
    }

    // Get claims for authorization middleware
    const claims = getClaimsFromEvent(event);
    
    if (!claims) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid authentication token'
        })
      };
    }

    // Apply dealer tier authorization middleware
    const dealerAuthResult = await requireDealerTier('sub-account management')(event, claims);
    
    if (dealerAuthResult) {
      // Authorization failed, return the error response
      return {
        ...dealerAuthResult,
        headers: { ...dealerAuthResult.headers, ...corsHeaders }
      };
    }

    const path = event.path;
    const method = event.httpMethod;

    // Route: GET /api/dealer/sub-accounts - List all sub-accounts
    if (path === '/api/dealer/sub-accounts' && method === 'GET') {
      const result = await listSubAccounts(user.userId);
      
      if (!result.success) {
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({
            error: result.errorCode || 'LIST_FAILED',
            message: result.error
          })
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          subAccounts: result.subAccounts,
          count: result.count
        })
      };
    }

    // Route: POST /api/dealer/sub-accounts - Create new sub-account
    if (path === '/api/dealer/sub-accounts' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      
      // Validate required fields
      if (!body.email || !body.name || !body.dealerAccountRole) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'INVALID_REQUEST',
            message: 'Missing required fields: email, name, dealerAccountRole'
          })
        };
      }

      // Validate role
      if (!Object.values(DealerSubAccountRole).includes(body.dealerAccountRole)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'INVALID_ROLE',
            message: `Invalid role. Must be one of: ${Object.values(DealerSubAccountRole).join(', ')}`
          })
        };
      }

      // Validate accessScope
      if (!body.accessScope || typeof body.accessScope !== 'object') {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'INVALID_REQUEST',
            message: 'accessScope is required and must be an object'
          })
        };
      }

      const request: CreateSubAccountRequest = {
        parentDealerId: user.userId,
        email: body.email,
        name: body.name,
        dealerAccountRole: body.dealerAccountRole,
        accessScope: body.accessScope,
        delegatedPermissions: body.delegatedPermissions || [],
        createdBy: user.userId
      };

      const result = await createSubAccount(request);
      
      if (!result.success) {
        const statusCode = result.errorCode === 'EMAIL_EXISTS' ? 409 : 
                          result.errorCode === 'PARENT_DEALER_NOT_FOUND' ? 404 : 500;
        
        return {
          statusCode,
          headers: corsHeaders,
          body: JSON.stringify({
            error: result.errorCode || 'CREATION_FAILED',
            message: result.error
          })
        };
      }

      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Sub-account created successfully',
          subAccount: result.subAccount
        })
      };
    }

    // Route: GET /api/dealer/sub-accounts/:id - Get specific sub-account
    if (path.match(/^\/api\/dealer\/sub-accounts\/[^/]+$/) && method === 'GET') {
      const subAccountId = event.pathParameters?.id;
      
      if (!subAccountId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'INVALID_REQUEST',
            message: 'Sub-account ID is required'
          })
        };
      }

      // Validate ownership using authorization middleware
      const ownershipAuthResult = await requireSubAccountOwnership(
        (e) => e.pathParameters?.id || ''
      )(event, claims);
      
      if (ownershipAuthResult) {
        // Authorization failed, return the error response
        return {
          ...ownershipAuthResult,
          headers: { ...ownershipAuthResult.headers, ...corsHeaders }
        };
      }

      const result = await getSubAccount(subAccountId, user.userId);
      
      if (!result.success) {
        const statusCode = result.errorCode === 'SUB_ACCOUNT_NOT_FOUND' ? 404 :
                          result.errorCode === 'UNAUTHORIZED_ACCESS' ? 403 : 500;
        
        return {
          statusCode,
          headers: corsHeaders,
          body: JSON.stringify({
            error: result.errorCode || 'GET_FAILED',
            message: result.error
          })
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          subAccount: result.subAccount
        })
      };
    }

    // Route: PUT /api/dealer/sub-accounts/:id - Update sub-account
    if (path.match(/^\/api\/dealer\/sub-accounts\/[^/]+$/) && method === 'PUT') {
      const subAccountId = event.pathParameters?.id;
      const body = JSON.parse(event.body || '{}');
      
      if (!subAccountId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'INVALID_REQUEST',
            message: 'Sub-account ID is required'
          })
        };
      }

      // Validate ownership using authorization middleware
      const ownershipAuthResult = await requireSubAccountOwnership(
        (e) => e.pathParameters?.id || ''
      )(event, claims);
      
      if (ownershipAuthResult) {
        // Authorization failed, return the error response
        return {
          ...ownershipAuthResult,
          headers: { ...ownershipAuthResult.headers, ...corsHeaders }
        };
      }

      // Validate role if provided
      if (body.dealerAccountRole && !Object.values(DealerSubAccountRole).includes(body.dealerAccountRole)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'INVALID_ROLE',
            message: `Invalid role. Must be one of: ${Object.values(DealerSubAccountRole).join(', ')}`
          })
        };
      }

      const request: UpdateSubAccountRequest = {
        subAccountId,
        parentDealerId: user.userId,
        ...(body.dealerAccountRole && { dealerAccountRole: body.dealerAccountRole }),
        ...(body.accessScope && { accessScope: body.accessScope }),
        ...(body.delegatedPermissions && { delegatedPermissions: body.delegatedPermissions }),
        ...(body.status && { status: body.status })
      };

      const result = await updateSubAccount(request);
      
      if (!result.success) {
        const statusCode = result.errorCode === 'SUB_ACCOUNT_NOT_FOUND' ? 404 :
                          result.errorCode === 'UNAUTHORIZED_ACCESS' ? 403 : 500;
        
        return {
          statusCode,
          headers: corsHeaders,
          body: JSON.stringify({
            error: result.errorCode || 'UPDATE_FAILED',
            message: result.error
          })
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Sub-account updated successfully',
          subAccount: result.subAccount
        })
      };
    }

    // Route: DELETE /api/dealer/sub-accounts/:id - Delete sub-account
    if (path.match(/^\/api\/dealer\/sub-accounts\/[^/]+$/) && method === 'DELETE') {
      const subAccountId = event.pathParameters?.id;
      
      if (!subAccountId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'INVALID_REQUEST',
            message: 'Sub-account ID is required'
          })
        };
      }

      // Validate ownership using authorization middleware
      const ownershipAuthResult = await requireSubAccountOwnership(
        (e) => e.pathParameters?.id || ''
      )(event, claims);
      
      if (ownershipAuthResult) {
        // Authorization failed, return the error response
        return {
          ...ownershipAuthResult,
          headers: { ...ownershipAuthResult.headers, ...corsHeaders }
        };
      }

      const result = await deleteSubAccount(subAccountId, user.userId);
      
      if (!result.success) {
        const statusCode = result.errorCode === 'SUB_ACCOUNT_NOT_FOUND' ? 404 :
                          result.errorCode === 'UNAUTHORIZED_ACCESS' ? 403 : 500;
        
        return {
          statusCode,
          headers: corsHeaders,
          body: JSON.stringify({
            error: result.errorCode || 'DELETE_FAILED',
            message: result.error
          })
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Sub-account deleted successfully'
        })
      };
    }

    // Route not found
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'NOT_FOUND',
        message: `Route ${method} ${path} not found`
      })
    };

  } catch (error: any) {
    console.error('Dealer API error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'An unexpected error occurred'
      })
    };
  }
}
