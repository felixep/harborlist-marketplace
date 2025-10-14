/**
 * @fileoverview Comprehensive middleware system for HarborList backend services.
 * 
 * Provides a robust middleware stack for Lambda functions including:
 * - Authentication and authorization middleware
 * - Role-based access control with granular permissions
 * - Adaptive rate limiting based on user roles and permissions
 * - Request validation and input sanitization
 * - Comprehensive audit logging for compliance
 * - Middleware composition for flexible request processing
 * 
 * Authentication Features:
 * - JWT token validation and user extraction
 * - Admin role verification with permission checks
 * - Session-based authentication support
 * - Client information extraction for security
 * 
 * Rate Limiting Features:
 * - Adaptive rate limits based on admin roles
 * - Permission-specific rate limiting tiers
 * - In-memory rate limit tracking
 * - Rate limit headers for client feedback
 * - Automatic rate limit violation logging
 * 
 * Validation Features:
 * - Comprehensive input validation functions
 * - XSS and SQL injection prevention
 * - HTML sanitization and escaping
 * - Email, URL, and data format validation
 * - Custom validation schema support
 * 
 * Audit Logging Features:
 * - Automatic logging of all admin actions
 * - Request duration tracking
 * - Error and success event logging
 * - Client information capture
 * - Compliance-ready audit trails
 * 
 * Security Features:
 * - Input sanitization to prevent attacks
 * - SQL injection pattern detection
 * - XSS protection through HTML escaping
 * - Safe HTML validation
 * - IP address and user agent tracking
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  getUserFromEvent, 
  requireAdminRole, 
  getClientInfo, 
  createAuditLog,
  JWTPayload 
} from './auth';
import { AdminPermission } from '../types/common';
import { createErrorResponse } from './utils';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const AUDIT_LOGS_TABLE = process.env.AUDIT_LOGS_TABLE || 'boat-audit-logs';

export interface AuthenticatedEvent extends APIGatewayProxyEvent {
  user: JWTPayload;
}

export type AuthenticatedHandler = (
  event: AuthenticatedEvent,
  context: any
) => Promise<APIGatewayProxyResult>;

/**
 * Middleware to authenticate requests and extract user information
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    const requestId = event.requestContext.requestId;

    try {
      const user = await getUserFromEvent(event);
      const authenticatedEvent = { ...event, user } as AuthenticatedEvent;
      
      return await handler(authenticatedEvent, context);
    } catch (error) {
      console.error('Authentication error:', error);
      return createErrorResponse(401, 'UNAUTHORIZED', error instanceof Error ? error.message : 'Authentication failed', requestId);
    }
  };
}

/**
 * Middleware to require admin role and specific permissions
 */
export function withAdminAuth(requiredPermissions?: AdminPermission[]) {
  return function(handler: AuthenticatedHandler) {
    return withAuth(async (event: AuthenticatedEvent, context: any): Promise<APIGatewayProxyResult> => {
      const requestId = event.requestContext.requestId;
      const clientInfo = getClientInfo(event);

      try {
        // Check admin role and permissions
        requireAdminRole(event.user, requiredPermissions);

        // Log admin action
        await logAdminAction(
          event.user,
          'ADMIN_ACCESS',
          'admin_endpoint',
          {
            path: event.path,
            method: event.httpMethod,
            requiredPermissions
          },
          clientInfo
        );

        return await handler(event, context);
      } catch (error) {
        console.error('Admin authorization error:', error);
        
        // Log unauthorized admin access attempt
        await logAdminAction(
          event.user,
          'ADMIN_ACCESS_DENIED',
          'admin_endpoint',
          {
            path: event.path,
            method: event.httpMethod,
            requiredPermissions,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          clientInfo
        );

        return createErrorResponse(403, 'FORBIDDEN', error instanceof Error ? error.message : 'Access forbidden', requestId);
      }
    });
  };
}

/**
 * Rate limit tiers based on admin roles
 */
const RATE_LIMIT_TIERS = {
  [AdminPermission.USER_MANAGEMENT]: {
    SUPER_ADMIN: { maxRequests: 200, windowMs: 60000 },
    ADMIN: { maxRequests: 150, windowMs: 60000 },
    MODERATOR: { maxRequests: 100, windowMs: 60000 },
    SUPPORT: { maxRequests: 80, windowMs: 60000 }
  },
  [AdminPermission.CONTENT_MODERATION]: {
    SUPER_ADMIN: { maxRequests: 300, windowMs: 60000 },
    ADMIN: { maxRequests: 250, windowMs: 60000 },
    MODERATOR: { maxRequests: 200, windowMs: 60000 },
    SUPPORT: { maxRequests: 50, windowMs: 60000 }
  },
  [AdminPermission.FINANCIAL_ACCESS]: {
    SUPER_ADMIN: { maxRequests: 100, windowMs: 60000 },
    ADMIN: { maxRequests: 80, windowMs: 60000 },
    MODERATOR: { maxRequests: 20, windowMs: 60000 },
    SUPPORT: { maxRequests: 10, windowMs: 60000 }
  },
  [AdminPermission.SYSTEM_CONFIG]: {
    SUPER_ADMIN: { maxRequests: 50, windowMs: 60000 },
    ADMIN: { maxRequests: 30, windowMs: 60000 },
    MODERATOR: { maxRequests: 10, windowMs: 60000 },
    SUPPORT: { maxRequests: 5, windowMs: 60000 }
  },
  [AdminPermission.ANALYTICS_VIEW]: {
    SUPER_ADMIN: { maxRequests: 150, windowMs: 60000 },
    ADMIN: { maxRequests: 120, windowMs: 60000 },
    MODERATOR: { maxRequests: 80, windowMs: 60000 },
    SUPPORT: { maxRequests: 60, windowMs: 60000 }
  },
  [AdminPermission.AUDIT_LOG_VIEW]: {
    SUPER_ADMIN: { maxRequests: 100, windowMs: 60000 },
    ADMIN: { maxRequests: 80, windowMs: 60000 },
    MODERATOR: { maxRequests: 50, windowMs: 60000 },
    SUPPORT: { maxRequests: 30, windowMs: 60000 }
  },
  [AdminPermission.TIER_MANAGEMENT]: {
    SUPER_ADMIN: { maxRequests: 50, windowMs: 60000 },
    ADMIN: { maxRequests: 30, windowMs: 60000 },
    MODERATOR: { maxRequests: 10, windowMs: 60000 },
    SUPPORT: { maxRequests: 5, windowMs: 60000 }
  },
  [AdminPermission.CAPABILITY_ASSIGNMENT]: {
    SUPER_ADMIN: { maxRequests: 50, windowMs: 60000 },
    ADMIN: { maxRequests: 30, windowMs: 60000 },
    MODERATOR: { maxRequests: 10, windowMs: 60000 },
    SUPPORT: { maxRequests: 5, windowMs: 60000 }
  },
  [AdminPermission.BILLING_MANAGEMENT]: {
    SUPER_ADMIN: { maxRequests: 100, windowMs: 60000 },
    ADMIN: { maxRequests: 80, windowMs: 60000 },
    MODERATOR: { maxRequests: 20, windowMs: 60000 },
    SUPPORT: { maxRequests: 10, windowMs: 60000 }
  },
  [AdminPermission.SALES_MANAGEMENT]: {
    SUPER_ADMIN: { maxRequests: 150, windowMs: 60000 },
    ADMIN: { maxRequests: 120, windowMs: 60000 },
    MODERATOR: { maxRequests: 50, windowMs: 60000 },
    SUPPORT: { maxRequests: 30, windowMs: 60000 }
  }
};

/**
 * Middleware for rate limiting
 */
export function withRateLimit(maxRequests: number, windowMs: number) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return function(handler: AuthenticatedHandler) {
    return withAuth(async (event: AuthenticatedEvent, context: any): Promise<APIGatewayProxyResult> => {
      const requestId = event.requestContext.requestId;
      const clientInfo = getClientInfo(event);
      const identifier = event.user.sub; // Use user ID for rate limiting
      const now = Date.now();

      // Get or create rate limit record
      let record = requests.get(identifier);
      if (!record || now > record.resetTime) {
        record = { count: 0, resetTime: now + windowMs };
        requests.set(identifier, record);
      }

      // Check rate limit
      if (record.count >= maxRequests) {
        await logAdminAction(
          event.user,
          'RATE_LIMIT_EXCEEDED',
          'rate_limit',
          {
            path: event.path,
            method: event.httpMethod,
            maxRequests,
            windowMs
          },
          clientInfo
        );

        return createErrorResponse(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests', requestId);
      }

      // Increment counter
      record.count++;

      return await handler(event, context);
    });
  };
}

/**
 * Advanced rate limiting based on admin role and permission
 */
export function withAdaptiveRateLimit(permission?: AdminPermission, customLimits?: { maxRequests: number; windowMs: number }) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return function(handler: AuthenticatedHandler) {
    return async (event: AuthenticatedEvent, context: any): Promise<APIGatewayProxyResult> => {
      const requestId = event.requestContext.requestId;
      const clientInfo = getClientInfo(event);
      const identifier = event.user.sub;
      const userRole = event.user.role;
      const now = Date.now();

      // Determine rate limits
      let limits = customLimits;
      if (!limits && permission && RATE_LIMIT_TIERS[permission]) {
        const tierLimits = RATE_LIMIT_TIERS[permission] as any;
        if (tierLimits[userRole]) {
          limits = tierLimits[userRole];
        }
      }
      
      // Default fallback limits
      if (!limits) {
        limits = { maxRequests: 60, windowMs: 60000 };
      }

      // Get or create rate limit record
      let record = requests.get(identifier);
      if (!record || now > record.resetTime) {
        record = { count: 0, resetTime: now + limits.windowMs };
        requests.set(identifier, record);
      }

      // Check rate limit
      if (record.count >= limits.maxRequests) {
        await logAdminAction(
          event.user,
          'RATE_LIMIT_EXCEEDED',
          'rate_limit',
          {
            path: event.path,
            method: event.httpMethod,
            userRole,
            permission,
            maxRequests: limits.maxRequests,
            windowMs: limits.windowMs
          },
          clientInfo
        );

        return createErrorResponse(429, 'RATE_LIMIT_EXCEEDED', 
          `Rate limit exceeded. Maximum ${limits.maxRequests} requests per ${limits.windowMs / 1000} seconds for ${userRole} role.`, 
          requestId);
      }

      // Increment counter
      record.count++;

      // Add rate limit headers
      const response = await handler(event, context);
      const responseHeaders = {
        ...JSON.parse(response.headers ? JSON.stringify(response.headers) : '{}'),
        'X-RateLimit-Limit': limits.maxRequests.toString(),
        'X-RateLimit-Remaining': (limits.maxRequests - record.count).toString(),
        'X-RateLimit-Reset': Math.ceil(record.resetTime / 1000).toString()
      };

      return {
        ...response,
        headers: responseHeaders
      };
    };
  };
}

/**
 * Middleware for request validation
 */
export function withValidation<T>(validator: (body: any) => { valid: boolean; errors: string[] }) {
  return function(handler: AuthenticatedHandler) {
    return withAuth(async (event: AuthenticatedEvent, context: any): Promise<APIGatewayProxyResult> => {
      const requestId = event.requestContext.requestId;

      try {
        const body = JSON.parse(event.body || '{}');
        const validation = validator(body);

        if (!validation.valid) {
          return createErrorResponse(400, 'VALIDATION_ERROR', validation.errors.join(', '), requestId);
        }

        return await handler(event, context);
      } catch (error) {
        console.error('Validation error:', error);
        return createErrorResponse(400, 'INVALID_JSON', 'Invalid JSON in request body', requestId);
      }
    });
  };
}

/**
 * Middleware for audit logging
 */
export function withAuditLog(action: string, resource: string) {
  return function(handler: AuthenticatedHandler) {
    return withAuth(async (event: AuthenticatedEvent, context: any): Promise<APIGatewayProxyResult> => {
      const clientInfo = getClientInfo(event);
      const startTime = Date.now();

      try {
        const result = await handler(event, context);
        const duration = Date.now() - startTime;

        // Log successful action
        await logAdminAction(
          event.user,
          action,
          resource,
          {
            path: event.path,
            method: event.httpMethod,
            statusCode: result.statusCode,
            duration
          },
          clientInfo
        );

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Log failed action
        await logAdminAction(
          event.user,
          `${action}_FAILED`,
          resource,
          {
            path: event.path,
            method: event.httpMethod,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration
          },
          clientInfo
        );

        throw error;
      }
    });
  };
}

/**
 * Compose multiple middleware functions
 */
export function compose(...middlewares: Array<(handler: AuthenticatedHandler) => AuthenticatedHandler>) {
  return function(handler: AuthenticatedHandler): AuthenticatedHandler {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

/**
 * Helper function to log admin actions
 */
async function logAdminAction(
  user: JWTPayload,
  action: string,
  resource: string,
  details: Record<string, any>,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<void> {
  try {
    const auditLog = createAuditLog(
      user,
      action,
      resource,
      details,
      clientInfo
    );

    await docClient.send(new PutCommand({
      TableName: AUDIT_LOGS_TABLE,
      Item: auditLog
    }));
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}

/**
 * Common validation functions
 */
export const validators = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  uuid: (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  },

  required: (value: any): boolean => {
    return value !== null && value !== undefined && value !== '';
  },

  minLength: (value: string, min: number): boolean => {
    return typeof value === 'string' && value.length >= min;
  },

  maxLength: (value: string, max: number): boolean => {
    return typeof value === 'string' && value.length <= max;
  },

  alphanumeric: (value: string): boolean => {
    return /^[a-zA-Z0-9]+$/.test(value);
  },

  noScripts: (value: string): boolean => {
    const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    return !scriptRegex.test(value);
  },

  noSqlInjection: (value: string): boolean => {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(--|\/\*|\*\/|;|'|")/g,
      /(\bOR\b|\bAND\b).*?[=<>]/gi
    ];
    return !sqlPatterns.some(pattern => pattern.test(value));
  },

  safeHtml: (value: string): boolean => {
    const dangerousTags = /<(script|iframe|object|embed|form|input|meta|link|style)[^>]*>/gi;
    return !dangerousTags.test(value);
  },

  ipAddress: (value: string): boolean => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(value) || ipv6Regex.test(value);
  },

  dateString: (value: string): boolean => {
    return !isNaN(Date.parse(value));
  },

  positiveInteger: (value: any): boolean => {
    const num = parseInt(value);
    return !isNaN(num) && num > 0;
  },

  nonNegativeInteger: (value: any): boolean => {
    const num = parseInt(value);
    return !isNaN(num) && num >= 0;
  },

  url: (value: string): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Input sanitization functions
 */
export const sanitizers = {
  trim: (value: string): string => {
    return typeof value === 'string' ? value.trim() : value;
  },

  stripHtml: (value: string): string => {
    return typeof value === 'string' ? value.replace(/<[^>]*>/g, '') : value;
  },

  escapeHtml: (value: string): string => {
    if (typeof value !== 'string') return value;
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  },

  normalizeEmail: (value: string): string => {
    return typeof value === 'string' ? value.toLowerCase().trim() : value;
  },

  removeExtraSpaces: (value: string): string => {
    return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value;
  },

  alphanumericOnly: (value: string): string => {
    return typeof value === 'string' ? value.replace(/[^a-zA-Z0-9]/g, '') : value;
  },

  numbersOnly: (value: string): string => {
    return typeof value === 'string' ? value.replace(/[^0-9]/g, '') : value;
  }
};

/**
 * Create a validation function for request bodies
 */
export function createValidator(schema: Record<string, Array<(value: any) => boolean | string>>): (body: any) => { valid: boolean; errors: string[] } {
  return (body: any) => {
    const errors: string[] = [];

    for (const [field, validations] of Object.entries(schema)) {
      const value = body[field];

      for (const validation of validations) {
        const result = validation(value);
        if (result !== true) {
          errors.push(typeof result === 'string' ? result : `Invalid ${field}`);
          break; // Stop at first validation error for this field
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };
}

/**
 * Create a sanitization function for request bodies
 */
export function createSanitizer(schema: Record<string, Array<(value: any) => any>>): (body: any) => any {
  return (body: any) => {
    const sanitized = { ...body };

    for (const [field, sanitizers] of Object.entries(schema)) {
      if (sanitized[field] !== undefined) {
        let value = sanitized[field];
        for (const sanitizer of sanitizers) {
          value = sanitizer(value);
        }
        sanitized[field] = value;
      }
    }

    return sanitized;
  };
}

/**
 * Enhanced middleware for request validation and sanitization
 */
export function withValidationAndSanitization<T>(
  validator: (body: any) => { valid: boolean; errors: string[] },
  sanitizer?: (body: any) => any
) {
  return function(handler: AuthenticatedHandler) {
    return withAuth(async (event: AuthenticatedEvent, context: any): Promise<APIGatewayProxyResult> => {
      const requestId = event.requestContext.requestId;

      try {
        let body = JSON.parse(event.body || '{}');

        // Sanitize input first
        if (sanitizer) {
          body = sanitizer(body);
        }

        // Then validate
        const validation = validator(body);

        if (!validation.valid) {
          return createErrorResponse(400, 'VALIDATION_ERROR', validation.errors.join(', '), requestId);
        }

        // Update event with sanitized body
        event.body = JSON.stringify(body);

        return await handler(event, context);
      } catch (error) {
        console.error('Validation/Sanitization error:', error);
        return createErrorResponse(400, 'INVALID_JSON', 'Invalid JSON in request body', requestId);
      }
    });
  };
}