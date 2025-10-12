/**
 * Error Handler Middleware and Utilities
 * 
 * Provides centralized error handling middleware for Lambda functions,
 * error logging, monitoring integration, and user-friendly error responses.
 * 
 * Features:
 * - Centralized error handling for all services
 * - Automatic error logging and monitoring
 * - User-friendly error response formatting
 * - Error recovery and retry mechanisms
 * - Performance monitoring integration
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { 
  EnhancedError, 
  EnhancedErrorCodes, 
  ErrorSeverity, 
  ErrorCategory,
  createEnhancedError,
  createEnhancedErrorResponse,
  ErrorRecovery
} from './errors';
import { createErrorResponse, createResponse } from './utils';

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  enableStackTrace: boolean;
  enableRetry: boolean;
  maxRetries: number;
  logErrors: boolean;
  monitoringEnabled: boolean;
  environment: 'development' | 'staging' | 'production';
}

/**
 * Default error handler configuration
 */
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  enableStackTrace: process.env.NODE_ENV !== 'production',
  enableRetry: true,
  maxRetries: 3,
  logErrors: true,
  monitoringEnabled: true,
  environment: (process.env.NODE_ENV as any) || 'development'
};

/**
 * Lambda handler wrapper with comprehensive error handling
 */
export function withErrorHandler<T = any>(
  handler: (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>,
  serviceName?: string,
  config: Partial<ErrorHandlerConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const requestId = context.awsRequestId;
    const startTime = Date.now();
    
    try {
      // Add request tracking
      console.log(`[${requestId}] Request started:`, {
        method: event.httpMethod,
        path: event.path,
        userAgent: event.headers['User-Agent'],
        sourceIp: event.requestContext.identity.sourceIp
      });
      
      // Execute the handler with retry logic if enabled
      let result: APIGatewayProxyResult;
      
      if (finalConfig.enableRetry) {
        result = await ErrorRecovery.attemptRecovery(
          () => handler(event, context),
          finalConfig.maxRetries,
          1000
        );
      } else {
        result = await handler(event, context);
      }
      
      // Log successful requests
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] Request completed successfully:`, {
        statusCode: result.statusCode,
        duration: `${duration}ms`
      });
      
      // Add performance monitoring
      if (finalConfig.monitoringEnabled) {
        await logPerformanceMetrics(requestId, event, duration, result.statusCode);
      }
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Convert to enhanced error if not already
      const enhancedError = error instanceof Error && 'code' in error 
        ? error as EnhancedError
        : convertToEnhancedError(error, requestId);
      
      // Log the error
      if (finalConfig.logErrors) {
        await logError(enhancedError, event, context, duration);
      }
      
      // Send error monitoring data
      if (finalConfig.monitoringEnabled) {
        await sendErrorMetrics(enhancedError, event, context);
      }
      
      // Create user-friendly error response
      const errorResponse = createEnhancedErrorResponse(
        enhancedError,
        getHttpStatusCode(enhancedError),
        finalConfig.enableStackTrace
      );
      
      return createResponse(getHttpStatusCode(enhancedError), errorResponse);
    }
  };
}

/**
 * Converts unknown errors to enhanced errors
 */
function convertToEnhancedError(error: any, requestId: string): EnhancedError {
  if (error instanceof Error && 'code' in error) {
    return error as EnhancedError;
  }
  
  // Handle common error types
  if (error instanceof Error) {
    // Database connection errors
    if (error.message.includes('connection') || error.message.includes('timeout')) {
      return createEnhancedError(
        EnhancedErrorCodes.DATABASE_CONNECTION_ERROR,
        ErrorSeverity.HIGH,
        ErrorCategory.SYSTEM,
        { originalError: error.message },
        undefined,
        requestId
      );
    }
    
    // Validation errors
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return createEnhancedError(
        EnhancedErrorCodes.INVALID_LOAN_PARAMETERS,
        ErrorSeverity.MEDIUM,
        ErrorCategory.VALIDATION,
        { originalError: error.message },
        undefined,
        requestId
      );
    }
    
    // Permission errors
    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return createEnhancedError(
        EnhancedErrorCodes.ADMIN_PERMISSION_REQUIRED,
        ErrorSeverity.HIGH,
        ErrorCategory.AUTHORIZATION,
        { originalError: error.message },
        undefined,
        requestId
      );
    }
  }
  
  // Default to generic system error
  return createEnhancedError(
    EnhancedErrorCodes.CONFIGURATION_ERROR,
    ErrorSeverity.CRITICAL,
    ErrorCategory.SYSTEM,
    { originalError: String(error) },
    'An unexpected error occurred',
    requestId
  );
}

/**
 * Maps enhanced errors to HTTP status codes
 */
function getHttpStatusCode(error: EnhancedError): number {
  switch (error.category) {
    case ErrorCategory.AUTHENTICATION:
      return 401;
    case ErrorCategory.AUTHORIZATION:
      return 403;
    case ErrorCategory.VALIDATION:
    case ErrorCategory.USER_INPUT:
      return 400;
    case ErrorCategory.BUSINESS_LOGIC:
      return 422;
    case ErrorCategory.EXTERNAL_SERVICE:
      return 502;
    case ErrorCategory.SYSTEM:
      return error.severity === ErrorSeverity.CRITICAL ? 500 : 503;
    default:
      return 500;
  }
}

/**
 * Comprehensive error logging
 */
async function logError(
  error: EnhancedError,
  event: APIGatewayProxyEvent,
  context: Context,
  duration: number
): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    requestId: context.awsRequestId,
    error: {
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      severity: error.severity,
      category: error.category,
      retryable: error.retryable,
      context: error.context,
      stack: error.stack
    },
    request: {
      method: event.httpMethod,
      path: event.path,
      userAgent: event.headers['User-Agent'],
      sourceIp: event.requestContext.identity.sourceIp,
      userId: event.requestContext.authorizer?.claims?.sub,
      duration: `${duration}ms`
    },
    lambda: {
      functionName: context.functionName,
      functionVersion: context.functionVersion,
      memoryLimitInMB: context.memoryLimitInMB,
      remainingTimeInMS: context.getRemainingTimeInMillis()
    }
  };
  
  // Log based on severity
  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
      console.error('[CRITICAL ERROR]', JSON.stringify(logEntry, null, 2));
      break;
    case ErrorSeverity.HIGH:
      console.error('[HIGH ERROR]', JSON.stringify(logEntry, null, 2));
      break;
    case ErrorSeverity.MEDIUM:
      console.warn('[MEDIUM ERROR]', JSON.stringify(logEntry, null, 2));
      break;
    case ErrorSeverity.LOW:
      console.info('[LOW ERROR]', JSON.stringify(logEntry, null, 2));
      break;
  }
  
  // Send to external logging service if configured
  if (process.env.EXTERNAL_LOGGING_ENDPOINT) {
    try {
      await sendToExternalLogging(logEntry);
    } catch (loggingError) {
      console.error('Failed to send error to external logging:', loggingError);
    }
  }
}

/**
 * Performance metrics logging
 */
async function logPerformanceMetrics(
  requestId: string,
  event: APIGatewayProxyEvent,
  duration: number,
  statusCode: number
): Promise<void> {
  const metrics = {
    timestamp: new Date().toISOString(),
    requestId,
    performance: {
      duration,
      statusCode,
      method: event.httpMethod,
      path: event.path,
      userAgent: event.headers['User-Agent'],
      contentLength: event.headers['Content-Length'] || '0'
    }
  };
  
  console.info('[PERFORMANCE]', JSON.stringify(metrics));
  
  // Send to monitoring service if configured
  if (process.env.MONITORING_ENDPOINT) {
    try {
      await sendToMonitoring(metrics);
    } catch (monitoringError) {
      console.error('Failed to send performance metrics:', monitoringError);
    }
  }
}

/**
 * Error metrics for monitoring and alerting
 */
async function sendErrorMetrics(
  error: EnhancedError,
  event: APIGatewayProxyEvent,
  context: Context
): Promise<void> {
  const metrics = {
    timestamp: new Date().toISOString(),
    service: context.functionName,
    error: {
      code: error.code,
      severity: error.severity,
      category: error.category,
      retryable: error.retryable
    },
    request: {
      method: event.httpMethod,
      path: event.path,
      userId: event.requestContext.authorizer?.claims?.sub
    }
  };
  
  console.info('[ERROR_METRICS]', JSON.stringify(metrics));
  
  // Send to monitoring service
  if (process.env.ERROR_MONITORING_ENDPOINT) {
    try {
      await sendToErrorMonitoring(metrics);
    } catch (monitoringError) {
      console.error('Failed to send error metrics:', monitoringError);
    }
  }
}

/**
 * Send logs to external logging service
 */
async function sendToExternalLogging(logEntry: any): Promise<void> {
  // Implementation would depend on the logging service (e.g., CloudWatch, Datadog, etc.)
  // This is a placeholder for the actual implementation
  console.debug('Sending to external logging service:', logEntry);
}

/**
 * Send metrics to monitoring service
 */
async function sendToMonitoring(metrics: any): Promise<void> {
  // Implementation would depend on the monitoring service (e.g., CloudWatch, New Relic, etc.)
  // This is a placeholder for the actual implementation
  console.debug('Sending to monitoring service:', metrics);
}

/**
 * Send error metrics to error monitoring service
 */
async function sendToErrorMonitoring(metrics: any): Promise<void> {
  // Implementation would depend on the error monitoring service (e.g., Sentry, Rollbar, etc.)
  // This is a placeholder for the actual implementation
  console.debug('Sending to error monitoring service:', metrics);
}

/**
 * Error boundary for React-like error handling in Lambda
 */
export class LambdaErrorBoundary {
  private static instance: LambdaErrorBoundary;
  private errorHandlers: Map<string, (error: EnhancedError) => Promise<void>> = new Map();
  
  static getInstance(): LambdaErrorBoundary {
    if (!LambdaErrorBoundary.instance) {
      LambdaErrorBoundary.instance = new LambdaErrorBoundary();
    }
    return LambdaErrorBoundary.instance;
  }
  
  /**
   * Register error handler for specific error codes
   */
  registerHandler(errorCode: EnhancedErrorCodes, handler: (error: EnhancedError) => Promise<void>): void {
    this.errorHandlers.set(errorCode, handler);
  }
  
  /**
   * Handle error with registered handlers
   */
  async handleError(error: EnhancedError): Promise<void> {
    const handler = this.errorHandlers.get(error.code);
    if (handler) {
      try {
        await handler(error);
      } catch (handlerError) {
        console.error('Error handler failed:', handlerError);
      }
    }
  }
}

/**
 * Utility functions for common error scenarios
 */
export class ErrorUtils {
  /**
   * Handles database operation errors with automatic retry
   */
  static async handleDatabaseOperation<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = 3
  ): Promise<T> {
    try {
      return await ErrorRecovery.attemptRecovery(operation, maxRetries);
    } catch (error) {
      throw createEnhancedError(
        EnhancedErrorCodes.DATABASE_CONNECTION_ERROR,
        ErrorSeverity.HIGH,
        ErrorCategory.SYSTEM,
        { operation: context, originalError: String(error) }
      );
    }
  }
  
  /**
   * Handles external service calls with fallback
   */
  static async handleExternalService<T>(
    primaryCall: () => Promise<T>,
    fallbackCall?: () => Promise<T>,
    serviceName: string = 'external service'
  ): Promise<T> {
    const result = await ErrorRecovery.gracefulDegrade(primaryCall, fallbackCall);
    if (result === undefined) {
      throw createEnhancedError(
        EnhancedErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE,
        ErrorSeverity.MEDIUM,
        ErrorCategory.EXTERNAL_SERVICE,
        { service: serviceName }
      );
    }
    return result as T;
  }
  
  /**
   * Handles payment processing errors with specific error mapping
   */
  static handlePaymentError(error: any, context?: any): EnhancedError {
    const errorMessage = String(error).toLowerCase();
    
    if (errorMessage.includes('insufficient funds')) {
      return createEnhancedError(
        EnhancedErrorCodes.INSUFFICIENT_FUNDS,
        ErrorSeverity.MEDIUM,
        ErrorCategory.BUSINESS_LOGIC,
        context
      );
    }
    
    if (errorMessage.includes('declined') || errorMessage.includes('card')) {
      return createEnhancedError(
        EnhancedErrorCodes.PAYMENT_DECLINED,
        ErrorSeverity.MEDIUM,
        ErrorCategory.BUSINESS_LOGIC,
        context
      );
    }
    
    if (errorMessage.includes('expired')) {
      return createEnhancedError(
        EnhancedErrorCodes.PAYMENT_METHOD_INVALID,
        ErrorSeverity.MEDIUM,
        ErrorCategory.VALIDATION,
        context
      );
    }
    
    if (errorMessage.includes('invalid')) {
      return createEnhancedError(
        EnhancedErrorCodes.PAYMENT_METHOD_INVALID,
        ErrorSeverity.MEDIUM,
        ErrorCategory.VALIDATION,
        context
      );
    }
    
    return createEnhancedError(
      EnhancedErrorCodes.PAYMENT_PROCESSING_FAILED,
      ErrorSeverity.HIGH,
      ErrorCategory.EXTERNAL_SERVICE,
      { ...context, originalError: String(error) }
    );
  }
  
  /**
   * Validates and handles user permissions
   */
  static validateUserPermissions(
    user: any,
    requiredPermissions: string[],
    operation: string
  ): void {
    if (!user) {
      throw createEnhancedError(
        EnhancedErrorCodes.ADMIN_PERMISSION_REQUIRED,
        ErrorSeverity.HIGH,
        ErrorCategory.AUTHENTICATION,
        { operation, requiredPermissions }
      );
    }
    
    const userPermissions = user.permissions || [];
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasPermission) {
      throw createEnhancedError(
        EnhancedErrorCodes.ADMIN_PERMISSION_REQUIRED,
        ErrorSeverity.HIGH,
        ErrorCategory.AUTHORIZATION,
        { 
          operation, 
          requiredPermissions, 
          userPermissions,
          userId: user.id 
        }
      );
    }
  }
  
  /**
   * Handles rate limiting with appropriate error response
   */
  static handleRateLimit(
    identifier: string,
    limit: number,
    window: number,
    current: number
  ): void {
    if (current >= limit) {
      throw createEnhancedError(
        EnhancedErrorCodes.RATE_LIMIT_EXCEEDED,
        ErrorSeverity.MEDIUM,
        ErrorCategory.BUSINESS_LOGIC,
        { 
          identifier, 
          limit, 
          window, 
          current,
          resetTime: Date.now() + window
        }
      );
    }
  }
}

/**
 * Error monitoring and alerting utilities
 */
export class ErrorMonitoring {
  /**
   * Check if error should trigger an alert
   */
  static shouldAlert(error: EnhancedError): boolean {
    return error.severity === ErrorSeverity.CRITICAL || 
           error.severity === ErrorSeverity.HIGH;
  }
  
  /**
   * Generate alert message for error
   */
  static generateAlertMessage(error: EnhancedError, context?: any): string {
    return `[${error.severity.toUpperCase()}] ${error.code}: ${error.message}
    
Context: ${JSON.stringify(error.context || context, null, 2)}
Recovery Options: ${error.recoveryOptions?.map(opt => opt.description).join(', ')}
Retryable: ${error.retryable}
Timestamp: ${new Date(error.timestamp).toISOString()}`;
  }
  
  /**
   * Track error patterns for analysis
   */
  static trackErrorPattern(error: EnhancedError): void {
    const pattern = {
      code: error.code,
      severity: error.severity,
      category: error.category,
      timestamp: error.timestamp,
      context: error.context
    };
    
    console.info('[ERROR_PATTERN]', JSON.stringify(pattern));
  }
}