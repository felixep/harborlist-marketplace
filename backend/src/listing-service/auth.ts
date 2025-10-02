/**
 * @fileoverview Authentication utilities for listing service operations.
 * 
 * Provides JWT token verification and user authentication middleware
 * specifically for listing-related operations. Handles token extraction,
 * validation, and user context injection for protected endpoints.
 * 
 * Security Features:
 * - JWT token verification with configurable secrets
 * - Bearer token extraction from Authorization headers
 * - User context injection for authenticated requests
 * - Comprehensive error handling for authentication failures
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import jwt from 'jsonwebtoken';
import { createErrorResponse } from '../shared/utils';

/**
 * JWT payload structure for authenticated users
 * 
 * Contains essential user information extracted from JWT tokens
 * for authorization and audit purposes.
 */
interface JWTPayload {
  /** User unique identifier */
  sub: string;
  /** User email address */
  email: string;
  /** User display name */
  name: string;
  /** Token issued at timestamp */
  iat: number;
  /** Token expiration timestamp */
  exp: number;
}

/**
 * Verifies and decodes a JWT token
 * 
 * Validates the JWT token signature using the configured secret
 * and returns the decoded payload containing user information.
 * Throws an error if the token is invalid, expired, or malformed.
 * 
 * @param token - JWT token string to verify
 * @returns Decoded JWT payload with user information
 * 
 * @throws {Error} When token is invalid, expired, or verification fails
 * 
 * @example
 * ```typescript
 * try {
 *   const payload = verifyToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
 *   console.log(`User: ${payload.email}`);
 * } catch (error) {
 *   console.error('Token verification failed:', error.message);
 * }
 * ```
 */
export const verifyToken = (token: string): JWTPayload => {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.verify(token, secret) as JWTPayload;
};

/**
 * Extracts and verifies user information from API Gateway event
 * 
 * Parses the Authorization header from the API Gateway event,
 * extracts the Bearer token, verifies it, and returns the user
 * information. Supports both 'Authorization' and 'authorization'
 * header variations for compatibility.
 * 
 * @param event - API Gateway proxy event containing headers
 * @returns Decoded user information from JWT token
 * 
 * @throws {Error} When authorization header is missing or invalid
 * @throws {Error} When token verification fails
 * 
 * @example
 * ```typescript
 * export const handler = async (event: APIGatewayProxyEvent) => {
 *   try {
 *     const user = extractUserFromEvent(event);
 *     console.log(`Authenticated user: ${user.email}`);
 *     // Process request with user context
 *   } catch (error) {
 *     return createErrorResponse(401, 'UNAUTHORIZED', error.message);
 *   }
 * };
 * ```
 */
export const extractUserFromEvent = (event: any) => {
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid authorization header');
  }

  const token = authHeader.substring(7);
  return verifyToken(token);
};

/**
 * Higher-order function that adds authentication middleware to Lambda handlers
 * 
 * Wraps Lambda handler functions with authentication logic, automatically
 * verifying JWT tokens and injecting user context into the event object.
 * Returns standardized error responses for authentication failures.
 * 
 * The wrapped handler will receive the original event with an additional
 * 'user' property containing the authenticated user information.
 * 
 * @param handler - Lambda handler function to wrap with authentication
 * @returns Wrapped handler function with authentication middleware
 * 
 * @example
 * ```typescript
 * const protectedHandler = async (event: APIGatewayProxyEvent & { user: JWTPayload }) => {
 *   // Access authenticated user via event.user
 *   const userId = event.user.sub;
 *   const userEmail = event.user.email;
 *   
 *   // Process authenticated request
 *   return createResponse(200, { message: `Hello ${event.user.name}` });
 * };
 * 
 * export const handler = requireAuth(protectedHandler);
 * ```
 * 
 * @example
 * ```typescript
 * // Usage with listing operations
 * const createListingHandler = async (event: APIGatewayProxyEvent & { user: JWTPayload }) => {
 *   const listing = {
 *     ...parseBody(event),
 *     ownerId: event.user.sub, // Automatically set from authenticated user
 *     createdBy: event.user.email
 *   };
 *   
 *   await db.createListing(listing);
 *   return createResponse(201, { listingId: listing.id });
 * };
 * 
 * export const handler = requireAuth(createListingHandler);
 * ```
 */
export const requireAuth = (handler: Function) => {
  return async (event: any, context: any) => {
    try {
      const user = extractUserFromEvent(event);
      event.user = user;
      return await handler(event, context);
    } catch (error) {
      const requestId = event.requestContext?.requestId || 'unknown';
      return createErrorResponse(401, 'UNAUTHORIZED', 'Invalid or missing authentication token', requestId);
    }
  };
};
