/**
 * @fileoverview Shared utility functions for HarborList backend services.
 * 
 * Provides common functionality used across all Lambda services including:
 * - HTTP response formatting with CORS support
 * - Error response standardization
 * - Request body parsing and validation
 * - User authentication extraction
 * - Data validation and sanitization
 * - ID generation and formatting
 * 
 * Response Standards:
 * - Consistent JSON response format
 * - Proper HTTP status codes
 * - CORS headers for cross-origin requests
 * - Error response standardization
 * - Request tracking with unique IDs
 * 
 * Security Features:
 * - Input sanitization to prevent XSS
 * - Email format validation
 * - Data type validation
 * - Authentication context extraction
 * - Safe error message handling
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse, ErrorResponse } from '../types/common';
import { EnhancedError, createEnhancedError, EnhancedErrorCodes, ErrorSeverity, ErrorCategory } from './errors';

/**
 * Creates a standardized HTTP response for API Gateway
 * 
 * Generates a properly formatted API Gateway response with consistent
 * headers, CORS support, and JSON serialization. Includes security
 * headers and cross-origin resource sharing configuration.
 * 
 * @param statusCode - HTTP status code (200, 201, 400, 404, 500, etc.)
 * @param data - Response data to be JSON serialized
 * @param headers - Additional headers to include (optional)
 * @returns Formatted API Gateway proxy result
 * 
 * @example
 * ```typescript
 * // Success response
 * return createResponse(200, { message: 'Success', data: results });
 * 
 * // Created response with custom headers
 * return createResponse(201, { id: 'new-id' }, { 'Location': '/api/resource/new-id' });
 * 
 * // No content response
 * return createResponse(204, null);
 * ```
 */
export function createResponse<T>(
  statusCode: number,
  data: T,
  headers: Record<string, string> = {}
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://local.harborlist.com',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Credentials': 'true',
      ...headers,
    },
    body: JSON.stringify(data),
  };
}

/**
 * Creates a standardized error response for API Gateway
 * 
 * Generates consistent error responses with proper HTTP status codes,
 * error categorization, and request tracking. Includes optional details
 * for debugging while maintaining security by not exposing sensitive information.
 * 
 * @param statusCode - HTTP error status code (400, 401, 403, 404, 500, etc.)
 * @param code - Application-specific error code for categorization
 * @param message - Human-readable error message
 * @param requestId - Unique request identifier for tracking and debugging
 * @param details - Optional additional error details (validation errors, etc.)
 * @returns Formatted error response
 * 
 * @example
 * ```typescript
 * // Validation error
 * return createErrorResponse(400, 'VALIDATION_ERROR', 'Invalid input data', requestId, [
 *   { field: 'email', message: 'Invalid email format' },
 *   { field: 'password', message: 'Password too short' }
 * ]);
 * 
 * // Authentication error
 * return createErrorResponse(401, 'UNAUTHORIZED', 'Invalid credentials', requestId);
 * 
 * // Not found error
 * return createErrorResponse(404, 'NOT_FOUND', 'Resource not found', requestId);
 * 
 * // Internal server error
 * return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
 * ```
 */
export function createErrorResponse(
  statusCode: number,
  code: string,
  message: string,
  requestId: string,
  details?: any[]
): APIGatewayProxyResult {
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      details,
      requestId,
    },
  };

  return createResponse(statusCode, errorResponse);
}

/**
 * Parses and validates JSON request body from API Gateway event
 * 
 * Safely parses the JSON request body with proper error handling.
 * Throws descriptive errors for missing or malformed JSON data.
 * 
 * @param event - API Gateway proxy event containing request body
 * @returns Parsed and typed request body data
 * 
 * @throws {Error} When request body is missing or contains invalid JSON
 * 
 * @example
 * ```typescript
 * interface CreateUserRequest {
 *   name: string;
 *   email: string;
 *   password: string;
 * }
 * 
 * const userData = parseBody<CreateUserRequest>(event);
 * console.log(userData.name, userData.email);
 * ```
 */
export function parseBody<T>(event: APIGatewayProxyEvent): T {
  if (!event.body) {
    throw createEnhancedError(
      EnhancedErrorCodes.INVALID_LOAN_PARAMETERS,
      ErrorSeverity.HIGH,
      ErrorCategory.VALIDATION,
      { operation: 'parseBody' },
      'Request body is required'
    );
  }

  try {
    return JSON.parse(event.body) as T;
  } catch (error) {
    throw createEnhancedError(
      EnhancedErrorCodes.INVALID_LOAN_PARAMETERS,
      ErrorSeverity.HIGH,
      ErrorCategory.VALIDATION,
      { operation: 'parseBody', originalError: String(error) },
      'Invalid JSON in request body'
    );
  }
}

/**
 * Extracts authenticated user ID from API Gateway event context
 * 
 * Retrieves the user ID from the JWT token claims stored in the
 * API Gateway authorizer context. Used for user-scoped operations
 * and authorization checks.
 * 
 * @param event - API Gateway proxy event with authorizer context
 * @returns User ID from JWT token claims
 * 
 * @throws {Error} When user is not authenticated or user ID is missing
 * 
 * @example
 * ```typescript
 * const userId = getUserId(event);
 * const userListings = await getListingsByOwner(userId);
 * ```
 */
export function getUserId(event: APIGatewayProxyEvent): string {
  const userId = event.requestContext.authorizer?.claims?.sub;
  if (!userId) {
    throw createEnhancedError(
      EnhancedErrorCodes.ADMIN_PERMISSION_REQUIRED,
      ErrorSeverity.HIGH,
      ErrorCategory.AUTHENTICATION,
      { operation: 'getUserId' },
      'User not authenticated'
    );
  }
  return userId;
}

/**
 * Generates a unique identifier with timestamp and random components
 * 
 * Creates a unique ID combining current timestamp with random string
 * for use in database records, file names, and tracking purposes.
 * Provides reasonable uniqueness for distributed systems.
 * 
 * @returns Unique identifier string
 * 
 * @example
 * ```typescript
 * const listingId = generateId();
 * const fileName = `${generateId()}.jpg`;
 * const sessionId = generateId();
 * ```
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validates that required fields are present in an object
 * 
 * Checks for the presence of required fields in request data and
 * throws a descriptive error listing any missing fields. Used for
 * input validation before processing requests.
 * 
 * @param obj - Object to validate
 * @param fields - Array of required field names
 * 
 * @throws {Error} When any required fields are missing
 * 
 * @example
 * ```typescript
 * const userData = parseBody(event);
 * validateRequired(userData, ['name', 'email', 'password']);
 * 
 * // Nested field validation
 * validateRequired(userData.address, ['street', 'city', 'state']);
 * ```
 */
export function validateRequired(obj: any, fields: string[]): void {
  const missing = fields.filter(field => !obj[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

/**
 * Sanitizes string input to prevent XSS attacks
 * 
 * Removes potentially dangerous characters and trims whitespace
 * from user input strings. Provides basic protection against
 * cross-site scripting attacks while preserving most content.
 * 
 * @param str - String to sanitize
 * @returns Sanitized string with dangerous characters removed
 * 
 * @example
 * ```typescript
 * const title = sanitizeString(userData.title);
 * const description = sanitizeString(userData.description);
 * const name = sanitizeString(userData.name);
 * ```
 */
export function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, '');
}

/**
 * Validates email address format using regex pattern
 * 
 * Checks if the provided string matches a valid email format.
 * Uses a standard email regex pattern for basic format validation.
 * 
 * @param email - Email address string to validate
 * @returns True if email format is valid, false otherwise
 * 
 * @example
 * ```typescript
 * if (!validateEmail(userData.email)) {
 *   return createErrorResponse(400, 'INVALID_EMAIL', 'Invalid email format', requestId);
 * }
 * ```
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates boat listing price within acceptable range
 * 
 * Ensures the price is within reasonable bounds for boat listings.
 * Prevents unrealistic pricing that could indicate data entry errors
 * or malicious input.
 * 
 * @param price - Price value to validate
 * @returns True if price is within valid range ($1 - $10,000,000)
 * 
 * @example
 * ```typescript
 * if (!validatePrice(listingData.price)) {
 *   return createErrorResponse(400, 'INVALID_PRICE', 'Price must be between $1 and $10,000,000', requestId);
 * }
 * ```
 */
export function validatePrice(price: number): boolean {
  return price > 0 && price <= 10000000; // Max $10M
}

/**
 * Validates boat manufacturing year within reasonable range
 * 
 * Ensures the year is within acceptable bounds for boat manufacturing.
 * Allows for current year plus one to accommodate new model years.
 * 
 * @param year - Manufacturing year to validate
 * @returns True if year is within valid range (1900 - current year + 1)
 * 
 * @example
 * ```typescript
 * if (!validateYear(boatData.year)) {
 *   return createErrorResponse(400, 'INVALID_YEAR', 'Year must be between 1900 and current year + 1', requestId);
 * }
 * ```
 */
export function validateYear(year: number): boolean {
  const currentYear = new Date().getFullYear();
  return year >= 1900 && year <= currentYear + 1;
}
