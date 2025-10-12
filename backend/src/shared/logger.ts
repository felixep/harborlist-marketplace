/**
 * Comprehensive Logging and Monitoring System
 * 
 * Provides structured logging, performance monitoring, and analytics
 * for all new marketplace features including multi-engine boats, billing,
 * content moderation, user tiers, and finance calculations.
 * 
 * Features:
 * - Structured JSON logging with correlation IDs
 * - Performance monitoring and metrics collection
 * - Business event tracking and analytics
 * - Error tracking and alerting integration
 * - Audit trail logging for compliance
 * - Real-time monitoring dashboards support
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { EnhancedError } from './errors';

/**
 * Log levels for different types of messages
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Event types for business logic tracking
 */
export enum EventType {
  // Listing events
  LISTING_CREATED = 'listing_created',
  LISTING_UPDATED = 'listing_updated',
  LISTING_DELETED = 'listing_deleted',
  LISTING_VIEWED = 'listing_viewed',
  
  // Multi-engine events
  ENGINE_ADDED = 'engine_added',
  ENGINE_UPDATED = 'engine_updated',
  ENGINE_REMOVED = 'engine_removed',
  ENGINE_VALIDATION_FAILED = 'engine_validation_failed',
  
  // Moderation events
  MODERATION_SUBMITTED = 'moderation_submitted',
  MODERATION_ASSIGNED = 'moderation_assigned',
  MODERATION_APPROVED = 'moderation_approved',
  MODERATION_REJECTED = 'moderation_rejected',
  MODERATION_ESCALATED = 'moderation_escalated',
  
  // User tier events
  USER_REGISTERED = 'user_registered',
  USER_UPGRADED = 'user_upgraded',
  USER_DOWNGRADED = 'user_downgraded',
  MEMBERSHIP_EXPIRED = 'membership_expired',
  CAPABILITY_ASSIGNED = 'capability_assigned',
  
  // Finance calculator events
  CALCULATION_CREATED = 'calculation_created',
  CALCULATION_SAVED = 'calculation_saved',
  CALCULATION_SHARED = 'calculation_shared',
  CALCULATION_VIEWED = 'calculation_viewed',
  
  // Billing events
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  REFUND_PROCESSED = 'refund_processed',
  
  // Admin events
  ADMIN_LOGIN = 'admin_login',
  ADMIN_ACTION = 'admin_action',
  BULK_OPERATION = 'bulk_operation',
  SETTINGS_CHANGED = 'settings_changed',
  
  // System events
  SERVICE_STARTED = 'service_started',
  SERVICE_ERROR = 'service_error',
  PERFORMANCE_ALERT = 'performance_alert',
  SECURITY_ALERT = 'security_alert'
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  requestId: string;
  functionName: string;
  duration: number;
  memoryUsed: number;
  coldStart: boolean;
  statusCode: number;
  errorCount: number;
  dbQueryCount?: number;
  dbQueryTime?: number;
  externalApiCalls?: number;
  externalApiTime?: number;
}

/**
 * Business event interface
 */
export interface BusinessEvent {
  eventType: EventType;
  userId?: string;
  listingId?: string;
  transactionId?: string;
  calculationId?: string;
  moderationId?: string;
  metadata?: Record<string, any>;
  timestamp: number;
  requestId?: string;
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  action: string;
  resource: string;
  resourceId?: string;
  userId: string;
  userEmail?: string;
  userRole?: string;
  changes?: {
    before?: any;
    after?: any;
  };
  ipAddress?: string;
  userAgent?: string;
  timestamp: number;
  requestId?: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Log entry interface
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  service: string;
  operation?: string;
  duration?: number;
  metadata?: Record<string, any>;
  error?: {
    code?: string;
    message: string;
    stack?: string;
  };
}

/**
 * Main logger class with comprehensive logging capabilities
 */
export class Logger {
  private static instance: Logger;
  private service: string;
  private requestId?: string;
  private userId?: string;
  private correlationId?: string;
  
  constructor(service: string) {
    this.service = service;
  }
  
  static getInstance(service: string): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(service);
    }
    return Logger.instance;
  }
  
  /**
   * Set request context for correlation
   */
  setContext(requestId?: string, userId?: string, correlationId?: string): void {
    this.requestId = requestId;
    this.userId = userId;
    this.correlationId = correlationId;
  }
  
  /**
   * Create base log entry with common fields
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: any
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
      userId: this.userId,
      service: this.service,
      metadata: {
        ...metadata,
        correlationId: this.correlationId
      },
      error: error ? {
        code: error.code,
        message: error.message,
        stack: error.stack
      } : undefined
    };
  }
  
  /**
   * Log debug messages
   */
  debug(message: string, metadata?: Record<string, any>): void {
    if (process.env.LOG_LEVEL === 'debug') {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, metadata);
      console.debug(JSON.stringify(entry));
    }
  }
  
  /**
   * Log info messages
   */
  info(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, metadata);
    console.info(JSON.stringify(entry));
  }
  
  /**
   * Log warning messages
   */
  warn(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, metadata);
    console.warn(JSON.stringify(entry));
  }
  
  /**
   * Log error messages
   */
  error(message: string, error?: any, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, metadata, error);
    console.error(JSON.stringify(entry));
  }
  
  /**
   * Log critical messages
   */
  critical(message: string, error?: any, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.CRITICAL, message, metadata, error);
    console.error(JSON.stringify(entry));
    
    // Send immediate alert for critical errors
    this.sendCriticalAlert(entry);
  }
  
  /**
   * Send critical alert (placeholder for actual implementation)
   */
  private async sendCriticalAlert(entry: LogEntry): Promise<void> {
    // Implementation would integrate with alerting service (SNS, PagerDuty, etc.)
    console.error('[CRITICAL_ALERT]', JSON.stringify(entry));
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static metrics: Map<string, PerformanceMetrics> = new Map();
  
  /**
   * Start performance tracking for a request
   */
  static startTracking(
    requestId: string,
    functionName: string,
    coldStart: boolean = false
  ): void {
    const metrics: PerformanceMetrics = {
      requestId,
      functionName,
      duration: Date.now(),
      memoryUsed: 0,
      coldStart,
      statusCode: 0,
      errorCount: 0
    };
    
    this.metrics.set(requestId, metrics);
  }
  
  /**
   * End performance tracking and log metrics
   */
  static endTracking(
    requestId: string,
    statusCode: number,
    errorCount: number = 0
  ): PerformanceMetrics | undefined {
    const metrics = this.metrics.get(requestId);
    if (!metrics) return undefined;
    
    metrics.duration = Date.now() - metrics.duration;
    metrics.statusCode = statusCode;
    metrics.errorCount = errorCount;
    metrics.memoryUsed = process.memoryUsage().heapUsed;
    
    // Log performance metrics
    console.info('[PERFORMANCE_METRICS]', JSON.stringify(metrics));
    
    // Check for performance alerts
    this.checkPerformanceAlerts(metrics);
    
    this.metrics.delete(requestId);
    return metrics;
  }
  
  /**
   * Add database query metrics
   */
  static addDatabaseMetrics(requestId: string, queryCount: number, queryTime: number): void {
    const metrics = this.metrics.get(requestId);
    if (metrics) {
      metrics.dbQueryCount = (metrics.dbQueryCount || 0) + queryCount;
      metrics.dbQueryTime = (metrics.dbQueryTime || 0) + queryTime;
    }
  }
  
  /**
   * Add external API call metrics
   */
  static addExternalApiMetrics(requestId: string, callCount: number, callTime: number): void {
    const metrics = this.metrics.get(requestId);
    if (metrics) {
      metrics.externalApiCalls = (metrics.externalApiCalls || 0) + callCount;
      metrics.externalApiTime = (metrics.externalApiTime || 0) + callTime;
    }
  }
  
  /**
   * Check for performance alerts
   */
  private static checkPerformanceAlerts(metrics: PerformanceMetrics): void {
    const logger = Logger.getInstance('performance-monitor');
    
    // Alert on slow requests (>5 seconds)
    if (metrics.duration > 5000) {
      logger.warn('Slow request detected', {
        requestId: metrics.requestId,
        duration: metrics.duration,
        functionName: metrics.functionName
      });
    }
    
    // Alert on high memory usage (>80% of allocated)
    const memoryLimitMB = parseInt(process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || '128');
    const memoryUsageMB = metrics.memoryUsed / 1024 / 1024;
    if (memoryUsageMB > memoryLimitMB * 0.8) {
      logger.warn('High memory usage detected', {
        requestId: metrics.requestId,
        memoryUsed: memoryUsageMB,
        memoryLimit: memoryLimitMB,
        functionName: metrics.functionName
      });
    }
    
    // Alert on database performance issues
    if (metrics.dbQueryTime && metrics.dbQueryTime > 2000) {
      logger.warn('Slow database queries detected', {
        requestId: metrics.requestId,
        queryTime: metrics.dbQueryTime,
        queryCount: metrics.dbQueryCount,
        functionName: metrics.functionName
      });
    }
  }
}

/**
 * Business event tracking for analytics
 */
export class EventTracker {
  private static logger = Logger.getInstance('event-tracker');
  
  /**
   * Track business events
   */
  static track(event: BusinessEvent): void {
    const logEntry = {
      ...event,
      timestamp: event.timestamp || Date.now()
    };
    
    console.info('[BUSINESS_EVENT]', JSON.stringify(logEntry));
    this.logger.info(`Business event: ${event.eventType}`, logEntry);
    
    // Send to analytics service if configured
    if (process.env.ANALYTICS_ENDPOINT) {
      this.sendToAnalytics(logEntry);
    }
  }
  
  /**
   * Track listing events
   */
  static trackListingEvent(
    eventType: EventType,
    listingId: string,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    this.track({
      eventType,
      listingId,
      userId,
      metadata,
      timestamp: Date.now()
    });
  }
  
  /**
   * Track user events
   */
  static trackUserEvent(
    eventType: EventType,
    userId: string,
    metadata?: Record<string, any>
  ): void {
    this.track({
      eventType,
      userId,
      metadata,
      timestamp: Date.now()
    });
  }
  
  /**
   * Track payment events
   */
  static trackPaymentEvent(
    eventType: EventType,
    transactionId: string,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    this.track({
      eventType,
      transactionId,
      userId,
      metadata,
      timestamp: Date.now()
    });
  }
  
  /**
   * Track moderation events
   */
  static trackModerationEvent(
    eventType: EventType,
    moderationId: string,
    listingId?: string,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    this.track({
      eventType,
      moderationId,
      listingId,
      userId,
      metadata,
      timestamp: Date.now()
    });
  }
  
  /**
   * Send events to analytics service
   */
  private static async sendToAnalytics(event: BusinessEvent): Promise<void> {
    try {
      // Implementation would depend on analytics service (Google Analytics, Mixpanel, etc.)
      console.debug('Sending event to analytics service:', event);
    } catch (error) {
      this.logger.error('Failed to send event to analytics', error, { event });
    }
  }
}

/**
 * Audit logging for compliance and security
 */
export class AuditLogger {
  private static logger = Logger.getInstance('audit-logger');
  
  /**
   * Log audit events
   */
  static log(entry: AuditLogEntry): void {
    const auditEntry = {
      ...entry,
      timestamp: entry.timestamp || Date.now()
    };
    
    console.info('[AUDIT_LOG]', JSON.stringify(auditEntry));
    this.logger.info(`Audit: ${entry.action} on ${entry.resource}`, auditEntry);
    
    // Send to audit service if configured
    if (process.env.AUDIT_ENDPOINT) {
      this.sendToAuditService(auditEntry);
    }
  }
  
  /**
   * Log user management actions
   */
  static logUserAction(
    action: string,
    targetUserId: string,
    performedBy: string,
    changes?: any,
    requestId?: string
  ): void {
    this.log({
      action,
      resource: 'user',
      resourceId: targetUserId,
      userId: performedBy,
      changes,
      timestamp: Date.now(),
      requestId,
      success: true
    });
  }
  
  /**
   * Log listing management actions
   */
  static logListingAction(
    action: string,
    listingId: string,
    performedBy: string,
    changes?: any,
    requestId?: string
  ): void {
    this.log({
      action,
      resource: 'listing',
      resourceId: listingId,
      userId: performedBy,
      changes,
      timestamp: Date.now(),
      requestId,
      success: true
    });
  }
  
  /**
   * Log billing actions
   */
  static logBillingAction(
    action: string,
    transactionId: string,
    performedBy: string,
    changes?: any,
    requestId?: string
  ): void {
    this.log({
      action,
      resource: 'billing',
      resourceId: transactionId,
      userId: performedBy,
      changes,
      timestamp: Date.now(),
      requestId,
      success: true
    });
  }
  
  /**
   * Log moderation actions
   */
  static logModerationAction(
    action: string,
    moderationId: string,
    performedBy: string,
    changes?: any,
    requestId?: string
  ): void {
    this.log({
      action,
      resource: 'moderation',
      resourceId: moderationId,
      userId: performedBy,
      changes,
      timestamp: Date.now(),
      requestId,
      success: true
    });
  }
  
  /**
   * Log failed actions
   */
  static logFailedAction(
    action: string,
    resource: string,
    resourceId: string,
    performedBy: string,
    errorMessage: string,
    requestId?: string
  ): void {
    this.log({
      action,
      resource,
      resourceId,
      userId: performedBy,
      timestamp: Date.now(),
      requestId,
      success: false,
      errorMessage
    });
  }
  
  /**
   * Send to audit service
   */
  private static async sendToAuditService(entry: AuditLogEntry): Promise<void> {
    try {
      // Implementation would depend on audit service (CloudTrail, Splunk, etc.)
      console.debug('Sending audit log to service:', entry);
    } catch (error) {
      this.logger.error('Failed to send audit log', error, { entry });
    }
  }
}

/**
 * Monitoring utilities for system health
 */
export class SystemMonitor {
  private static logger = Logger.getInstance('system-monitor');
  
  /**
   * Monitor system health
   */
  static checkHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    checks: Record<string, boolean>;
    timestamp: number;
  } {
    const checks = {
      memory: this.checkMemoryUsage(),
      database: this.checkDatabaseConnection(),
      externalServices: this.checkExternalServices()
    };
    
    const allHealthy = Object.values(checks).every(check => check);
    const someUnhealthy = Object.values(checks).some(check => !check);
    
    const status = allHealthy ? 'healthy' : someUnhealthy ? 'warning' : 'critical';
    
    const health = {
      status,
      checks,
      timestamp: Date.now()
    };
    
    console.info('[HEALTH_CHECK]', JSON.stringify(health));
    
    if (status !== 'healthy') {
      this.logger.warn('System health check failed', health);
    }
    
    return health;
  }
  
  /**
   * Check memory usage
   */
  private static checkMemoryUsage(): boolean {
    const memoryUsage = process.memoryUsage();
    const memoryLimitMB = parseInt(process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || '128');
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    
    return memoryUsageMB < memoryLimitMB * 0.9;
  }
  
  /**
   * Check database connection
   */
  private static checkDatabaseConnection(): boolean {
    // Implementation would check actual database connection
    // This is a placeholder
    return true;
  }
  
  /**
   * Check external services
   */
  private static checkExternalServices(): boolean {
    // Implementation would check external service availability
    // This is a placeholder
    return true;
  }
  
  /**
   * Monitor error rates
   */
  static monitorErrorRates(
    requestCount: number,
    errorCount: number,
    timeWindow: number
  ): void {
    const errorRate = errorCount / requestCount;
    const threshold = 0.05; // 5% error rate threshold
    
    if (errorRate > threshold) {
      this.logger.warn('High error rate detected', {
        errorRate,
        threshold,
        requestCount,
        errorCount,
        timeWindow
      });
    }
  }
}

/**
 * Logging middleware for Lambda functions
 */
export function withLogging(
  handler: (event: APIGatewayProxyEvent, context: Context) => Promise<any>,
  serviceName: string
) {
  return async (event: APIGatewayProxyEvent, context: Context) => {
    const logger = Logger.getInstance(serviceName);
    const requestId = context.awsRequestId;
    const userId = event.requestContext.authorizer?.claims?.sub;
    
    // Set logging context
    logger.setContext(requestId, userId);
    
    // Start performance tracking
    PerformanceMonitor.startTracking(requestId, context.functionName, context.coldStart);
    
    // Log request start
    logger.info('Request started', {
      method: event.httpMethod,
      path: event.path,
      userAgent: event.headers['User-Agent'],
      sourceIp: event.requestContext.identity.sourceIp
    });
    
    try {
      const result = await handler(event, context);
      
      // Log successful completion
      logger.info('Request completed successfully', {
        statusCode: result.statusCode
      });
      
      // End performance tracking
      PerformanceMonitor.endTracking(requestId, result.statusCode);
      
      return result;
      
    } catch (error) {
      // Log error
      logger.error('Request failed', error, {
        method: event.httpMethod,
        path: event.path
      });
      
      // End performance tracking with error
      PerformanceMonitor.endTracking(requestId, 500, 1);
      
      throw error;
    }
  };
}