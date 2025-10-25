/**
 * @fileoverview Unified Response Handler for Lambda Functions
 * 
 * Provides standardized response handling across all service handlers,
 * eliminating duplicate error handling and response formatting code.
 * 
 * Features:
 * - Automatic error handling with consistent format
 * - Request tracking and logging
 * - Type-safe response handling
 * - Automatic CORS headers
 * - Structured error responses
 * 
 * Benefits:
 * - Reduces ~150 lines of duplicate code across services
 * - Consistent error format across all endpoints
 * - Single point of maintenance
 * - Easier to add middleware (logging, metrics, rate limiting)
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { APIGatewayProxyResult } from 'aws-lambda';
import { createResponse, createErrorResponse } from './utils';

/**
 * Standard service result interface
 */
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  statusCode?: number;
  metadata?: {
    requestId?: string;
    timestamp?: string;
    [key: string]: any;
  };
}

/**
 * Handler execution options
 */
export interface HandlerOptions {
  operation: string;
  requestId: string;
  successCode?: number;
  logErrors?: boolean;
  includeMetadata?: boolean;
}

/**
 * Unified Response Handler for Lambda functions
 * 
 * Eliminates duplicate error handling and response formatting across services.
 */
export class ResponseHandler {
  /**
   * Handles service operation results with standardized responses
   * 
   * @template T - Type of success data
   * @param result - Service operation result
   * @param requestId - Request tracking ID
   * @param successCode - HTTP status code for success (default: 200)
   * @returns Formatted API Gateway response
   * 
   * @example
   * const result = await someService.operation();
   * return ResponseHandler.handleServiceResult(result, requestId);
   */
  static handleServiceResult<T>(
    result: ServiceResult<T>,
    requestId: string,
    successCode: number = 200
  ): APIGatewayProxyResult {
    if (result.success) {
      return createResponse(successCode, {
        success: true,
        data: result.data,
        metadata: result.metadata || {
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      return createErrorResponse(
        result.statusCode || 400,
        result.errorCode || 'OPERATION_FAILED',
        result.error || 'Operation failed',
        requestId
      );
    }
  }

  /**
   * Wraps handler execution with automatic error handling
   * 
   * Provides try-catch wrapper with consistent error responses,
   * logging, and request tracking.
   * 
   * @template T - Type of handler result
   * @param handler - Async function to execute
   * @param options - Handler execution options
   * @returns Formatted API Gateway response
   * 
   * @example
   * async function handleLogin(body: any, requestId: string) {
   *   return ResponseHandler.wrapHandler(
   *     () => authService.login(body.email, body.password),
   *     { operation: 'Customer Login', requestId }
   *   );
   * }
   */
  static async wrapHandler<T>(
    handler: () => Promise<ServiceResult<T>>,
    options: HandlerOptions
  ): Promise<APIGatewayProxyResult> {
    const startTime = Date.now();
    
    try {
      const result = await handler();
      
      // Add execution time to metadata if requested
      if (options.includeMetadata) {
        result.metadata = {
          ...result.metadata,
          executionTimeMs: Date.now() - startTime,
          operation: options.operation,
        };
      }
      
      return this.handleServiceResult(
        result,
        options.requestId,
        options.successCode
      );
    } catch (error) {
      // Log error if enabled
      if (options.logErrors !== false) {
        console.error(`${options.operation} error:`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          requestId: options.requestId,
          operation: options.operation,
          executionTimeMs: Date.now() - startTime,
        });
      }

      // Handle known error types
      if (error instanceof Error) {
        // Check for validation errors
        if (error.message.includes('validation')) {
          return createErrorResponse(
            400,
            'VALIDATION_ERROR',
            error.message,
            options.requestId
          );
        }

        // Check for authentication errors
        if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
          return createErrorResponse(
            401,
            'AUTHENTICATION_ERROR',
            error.message,
            options.requestId
          );
        }

        // Check for authorization errors
        if (error.message.includes('authorization') || error.message.includes('forbidden')) {
          return createErrorResponse(
            403,
            'AUTHORIZATION_ERROR',
            error.message,
            options.requestId
          );
        }

        // Check for not found errors
        if (error.message.includes('not found')) {
          return createErrorResponse(
            404,
            'NOT_FOUND',
            error.message,
            options.requestId
          );
        }
      }

      // Generic error response
      return createErrorResponse(
        500,
        'INTERNAL_ERROR',
        'Internal server error',
        options.requestId
      );
    }
  }

  /**
   * Creates a success result object
   * 
   * @template T - Type of result data
   * @param data - Success data
   * @param metadata - Optional metadata
   * @returns Service result object
   * 
   * @example
   * return ResponseHandler.success({ userId: '123', email: 'user@example.com' });
   */
  static success<T>(data: T, metadata?: Record<string, any>): ServiceResult<T> {
    return {
      success: true,
      data,
      metadata,
    };
  }

  /**
   * Creates an error result object
   * 
   * @param error - Error message
   * @param errorCode - Error code
   * @param statusCode - HTTP status code (default: 400)
   * @returns Service result object
   * 
   * @example
   * return ResponseHandler.error('Invalid email format', 'INVALID_EMAIL', 400);
   */
  static error(
    error: string,
    errorCode: string,
    statusCode: number = 400
  ): ServiceResult<never> {
    return {
      success: false,
      error,
      errorCode,
      statusCode,
    };
  }

  /**
   * Wraps async operations with automatic result conversion
   * 
   * Converts thrown errors into ServiceResult error objects,
   * and successful values into ServiceResult success objects.
   * 
   * @template T - Type of operation result
   * @param operation - Async operation to execute
   * @returns Service result (success or error)
   * 
   * @example
   * const result = await ResponseHandler.tryAsync(
   *   () => database.getUser(userId)
   * );
   */
  static async tryAsync<T>(
    operation: () => Promise<T>
  ): Promise<ServiceResult<T>> {
    try {
      const data = await operation();
      return this.success(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.error(message, 'OPERATION_FAILED', 500);
    }
  }

  /**
   * Validates required fields and returns error if any are missing
   * 
   * @param data - Object to validate
   * @param requiredFields - Array of required field names
   * @returns Error result if validation fails, null if passes
   * 
   * @example
   * const validationError = ResponseHandler.validateRequired(
   *   body,
   *   ['email', 'password']
   * );
   * if (validationError) return ResponseHandler.handleServiceResult(validationError, requestId);
   */
  static validateRequired(
    data: Record<string, any>,
    requiredFields: string[]
  ): ServiceResult<never> | null {
    const missing = requiredFields.filter(
      field => data[field] === undefined || data[field] === null || data[field] === ''
    );

    if (missing.length > 0) {
      return this.error(
        `Missing required fields: ${missing.join(', ')}`,
        'MISSING_REQUIRED_FIELDS',
        400
      );
    }

    return null;
  }
}

/**
 * Export convenience functions for backward compatibility
 */
export const handleServiceResult = ResponseHandler.handleServiceResult.bind(ResponseHandler);
export const wrapHandler = ResponseHandler.wrapHandler.bind(ResponseHandler);
export const successResult = ResponseHandler.success.bind(ResponseHandler);
export const errorResult = ResponseHandler.error.bind(ResponseHandler);
export const tryAsync = ResponseHandler.tryAsync.bind(ResponseHandler);
export const validateRequired = ResponseHandler.validateRequired.bind(ResponseHandler);
