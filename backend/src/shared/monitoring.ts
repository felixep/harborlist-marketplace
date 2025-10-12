/**
 * Monitoring and Alerting Configuration
 * 
 * Provides monitoring configuration, alerting rules, and dashboard
 * integration for all new marketplace features.
 * 
 * Features:
 * - CloudWatch metrics integration
 * - Custom metrics for business logic
 * - Alerting rules and thresholds
 * - Dashboard configuration
 * - Real-time monitoring support
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import { Logger, EventTracker, EventType } from './logger';
import { EnhancedError, ErrorSeverity } from './errors';

/**
 * Metric types for monitoring
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer'
}

/**
 * Metric interface
 */
export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  unit?: string;
  dimensions?: Record<string, string>;
  timestamp?: number;
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  name: string;
  metric: string;
  threshold: number;
  comparison: 'greater_than' | 'less_than' | 'equal_to';
  period: number; // in seconds
  evaluationPeriods: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

/**
 * Dashboard widget configuration
 */
export interface DashboardWidget {
  title: string;
  type: 'line' | 'bar' | 'pie' | 'number' | 'table';
  metrics: string[];
  period: number;
  dimensions?: Record<string, string>;
}

/**
 * Monitoring service for collecting and sending metrics
 */
export class MonitoringService {
  private static instance: MonitoringService;
  private logger: Logger;
  private metrics: Metric[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.logger = Logger.getInstance('monitoring-service');
    this.startMetricsFlushing();
  }
  
  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }
  
  /**
   * Record a metric
   */
  recordMetric(metric: Metric): void {
    const metricWithTimestamp = {
      ...metric,
      timestamp: metric.timestamp || Date.now()
    };
    
    this.metrics.push(metricWithTimestamp);
    
    // Log metric for debugging
    this.logger.debug('Metric recorded', metricWithTimestamp);
    
    // Flush immediately for critical metrics
    if (metric.name.includes('error') || metric.name.includes('critical')) {
      this.flushMetrics();
    }
  }
  
  /**
   * Record counter metric
   */
  recordCounter(name: string, value: number = 1, dimensions?: Record<string, string>): void {
    this.recordMetric({
      name,
      type: MetricType.COUNTER,
      value,
      dimensions
    });
  }
  
  /**
   * Record gauge metric
   */
  recordGauge(name: string, value: number, unit?: string, dimensions?: Record<string, string>): void {
    this.recordMetric({
      name,
      type: MetricType.GAUGE,
      value,
      unit,
      dimensions
    });
  }
  
  /**
   * Record timer metric
   */
  recordTimer(name: string, duration: number, dimensions?: Record<string, string>): void {
    this.recordMetric({
      name,
      type: MetricType.TIMER,
      value: duration,
      unit: 'milliseconds',
      dimensions
    });
  }
  
  /**
   * Start automatic metrics flushing
   */
  private startMetricsFlushing(): void {
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, 30000); // Flush every 30 seconds
  }
  
  /**
   * Flush metrics to monitoring service
   */
  private async flushMetrics(): Promise<void> {
    if (this.metrics.length === 0) return;
    
    const metricsToFlush = [...this.metrics];
    this.metrics = [];
    
    try {
      await this.sendMetricsToCloudWatch(metricsToFlush);
      this.logger.debug(`Flushed ${metricsToFlush.length} metrics to CloudWatch`);
    } catch (error) {
      this.logger.error('Failed to flush metrics', error);
      // Re-add metrics for retry
      this.metrics.unshift(...metricsToFlush);
    }
  }
  
  /**
   * Send metrics to CloudWatch
   */
  private async sendMetricsToCloudWatch(metrics: Metric[]): Promise<void> {
    // Implementation would use AWS SDK to send metrics to CloudWatch
    // This is a placeholder for the actual implementation
    console.log('[CLOUDWATCH_METRICS]', JSON.stringify(metrics));
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flushMetrics();
  }
}

/**
 * Business metrics tracking for specific features
 */
export class BusinessMetrics {
  private static monitoring = MonitoringService.getInstance();
  
  /**
   * Track listing metrics
   */
  static trackListingMetrics(eventType: EventType, listingId: string, metadata?: any): void {
    const dimensions = {
      listingId,
      eventType,
      ...metadata
    };
    
    switch (eventType) {
      case EventType.LISTING_CREATED:
        this.monitoring.recordCounter('listings.created', 1, dimensions);
        EventTracker.trackListingEvent(eventType, listingId, metadata?.userId, metadata);
        break;
        
      case EventType.LISTING_VIEWED:
        this.monitoring.recordCounter('listings.views', 1, dimensions);
        EventTracker.trackListingEvent(eventType, listingId, metadata?.userId, metadata);
        break;
        
      case EventType.ENGINE_ADDED:
        this.monitoring.recordCounter('engines.added', 1, dimensions);
        this.monitoring.recordGauge('engines.total_per_listing', metadata?.engineCount || 1, 'count', dimensions);
        break;
        
      case EventType.ENGINE_VALIDATION_FAILED:
        this.monitoring.recordCounter('engines.validation_errors', 1, dimensions);
        break;
    }
  }
  
  /**
   * Track user tier metrics
   */
  static trackUserTierMetrics(eventType: EventType, userId: string, metadata?: any): void {
    const dimensions = {
      userId,
      eventType,
      userType: metadata?.userType,
      tier: metadata?.tier
    };
    
    switch (eventType) {
      case EventType.USER_REGISTERED:
        this.monitoring.recordCounter('users.registered', 1, dimensions);
        this.monitoring.recordCounter(`users.registered.${metadata?.userType}`, 1, dimensions);
        break;
        
      case EventType.USER_UPGRADED:
        this.monitoring.recordCounter('users.upgraded', 1, dimensions);
        this.monitoring.recordCounter(`users.tier.${metadata?.newTier}`, 1, dimensions);
        break;
        
      case EventType.MEMBERSHIP_EXPIRED:
        this.monitoring.recordCounter('memberships.expired', 1, dimensions);
        break;
    }
  }
  
  /**
   * Track moderation metrics
   */
  static trackModerationMetrics(eventType: EventType, moderationId: string, metadata?: any): void {
    const dimensions = {
      moderationId,
      eventType,
      priority: metadata?.priority,
      moderatorId: metadata?.moderatorId
    };
    
    switch (eventType) {
      case EventType.MODERATION_SUBMITTED:
        this.monitoring.recordCounter('moderation.submitted', 1, dimensions);
        this.monitoring.recordGauge('moderation.queue_size', metadata?.queueSize || 0, 'count');
        break;
        
      case EventType.MODERATION_APPROVED:
        this.monitoring.recordCounter('moderation.approved', 1, dimensions);
        if (metadata?.reviewTime) {
          this.monitoring.recordTimer('moderation.review_time', metadata.reviewTime, dimensions);
        }
        break;
        
      case EventType.MODERATION_REJECTED:
        this.monitoring.recordCounter('moderation.rejected', 1, dimensions);
        break;
        
      case EventType.MODERATION_ESCALATED:
        this.monitoring.recordCounter('moderation.escalated', 1, dimensions);
        break;
    }
  }
  
  /**
   * Track finance calculator metrics
   */
  static trackFinanceMetrics(eventType: EventType, calculationId: string, metadata?: any): void {
    const dimensions = {
      calculationId,
      eventType,
      userId: metadata?.userId
    };
    
    switch (eventType) {
      case EventType.CALCULATION_CREATED:
        this.monitoring.recordCounter('finance.calculations_created', 1, dimensions);
        if (metadata?.loanAmount) {
          this.monitoring.recordGauge('finance.average_loan_amount', metadata.loanAmount, 'dollars', dimensions);
        }
        break;
        
      case EventType.CALCULATION_SAVED:
        this.monitoring.recordCounter('finance.calculations_saved', 1, dimensions);
        break;
        
      case EventType.CALCULATION_SHARED:
        this.monitoring.recordCounter('finance.calculations_shared', 1, dimensions);
        break;
    }
  }
  
  /**
   * Track billing metrics
   */
  static trackBillingMetrics(eventType: EventType, transactionId: string, metadata?: any): void {
    const dimensions = {
      transactionId,
      eventType,
      paymentMethod: metadata?.paymentMethod,
      currency: metadata?.currency
    };
    
    switch (eventType) {
      case EventType.PAYMENT_INITIATED:
        this.monitoring.recordCounter('billing.payments_initiated', 1, dimensions);
        if (metadata?.amount) {
          this.monitoring.recordGauge('billing.payment_amount', metadata.amount, 'dollars', dimensions);
        }
        break;
        
      case EventType.PAYMENT_COMPLETED:
        this.monitoring.recordCounter('billing.payments_completed', 1, dimensions);
        this.monitoring.recordGauge('billing.success_rate', 1, 'percent', dimensions);
        break;
        
      case EventType.PAYMENT_FAILED:
        this.monitoring.recordCounter('billing.payments_failed', 1, dimensions);
        this.monitoring.recordCounter(`billing.failures.${metadata?.failureReason}`, 1, dimensions);
        break;
        
      case EventType.SUBSCRIPTION_CREATED:
        this.monitoring.recordCounter('billing.subscriptions_created', 1, dimensions);
        break;
        
      case EventType.REFUND_PROCESSED:
        this.monitoring.recordCounter('billing.refunds_processed', 1, dimensions);
        if (metadata?.amount) {
          this.monitoring.recordGauge('billing.refund_amount', metadata.amount, 'dollars', dimensions);
        }
        break;
    }
  }
}

/**
 * Error monitoring and alerting
 */
export class ErrorMonitoring {
  private static monitoring = MonitoringService.getInstance();
  private static logger = Logger.getInstance('error-monitoring');
  
  /**
   * Track error metrics
   */
  static trackError(error: EnhancedError, context?: any): void {
    const dimensions = {
      errorCode: error.code,
      severity: error.severity,
      category: error.category,
      service: context?.service || 'unknown',
      retryable: error.retryable.toString()
    };
    
    // Record error counter
    this.monitoring.recordCounter('errors.total', 1, dimensions);
    this.monitoring.recordCounter(`errors.${error.severity}`, 1, dimensions);
    this.monitoring.recordCounter(`errors.category.${error.category}`, 1, dimensions);
    
    // Track error patterns
    this.monitoring.recordCounter(`errors.code.${error.code}`, 1, dimensions);
    
    // Log error for analysis
    this.logger.error('Error tracked', error, { context, dimensions });
    
    // Send alert for critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.sendCriticalErrorAlert(error, context);
    }
  }
  
  /**
   * Track error recovery
   */
  static trackErrorRecovery(errorCode: string, recoveryAction: string, success: boolean): void {
    const dimensions = {
      errorCode,
      recoveryAction,
      success: success.toString()
    };
    
    this.monitoring.recordCounter('errors.recovery_attempts', 1, dimensions);
    if (success) {
      this.monitoring.recordCounter('errors.recovery_success', 1, dimensions);
    }
  }
  
  /**
   * Send critical error alert
   */
  private static async sendCriticalErrorAlert(error: EnhancedError, context?: any): Promise<void> {
    const alertData = {
      timestamp: new Date().toISOString(),
      error: {
        code: error.code,
        message: error.message,
        severity: error.severity,
        category: error.category
      },
      context,
      recoveryOptions: error.recoveryOptions
    };
    
    console.error('[CRITICAL_ERROR_ALERT]', JSON.stringify(alertData));
    
    // Implementation would send to alerting service (SNS, PagerDuty, etc.)
    try {
      await this.sendToAlertingService(alertData);
    } catch (alertError) {
      this.logger.error('Failed to send critical error alert', alertError);
    }
  }
  
  /**
   * Send to alerting service
   */
  private static async sendToAlertingService(alertData: any): Promise<void> {
    // Implementation would integrate with actual alerting service
    console.debug('Sending critical error alert:', alertData);
  }
}

/**
 * Performance monitoring for specific operations
 */
export class PerformanceTracker {
  private static monitoring = MonitoringService.getInstance();
  private static activeOperations: Map<string, number> = new Map();
  
  /**
   * Start tracking an operation
   */
  static startOperation(operationId: string, operationType: string): void {
    this.activeOperations.set(operationId, Date.now());
    this.monitoring.recordCounter(`operations.${operationType}.started`, 1, { operationType });
  }
  
  /**
   * End tracking an operation
   */
  static endOperation(operationId: string, operationType: string, success: boolean = true): void {
    const startTime = this.activeOperations.get(operationId);
    if (!startTime) return;
    
    const duration = Date.now() - startTime;
    this.activeOperations.delete(operationId);
    
    const dimensions = { operationType, success: success.toString() };
    
    this.monitoring.recordTimer(`operations.${operationType}.duration`, duration, dimensions);
    this.monitoring.recordCounter(`operations.${operationType}.completed`, 1, dimensions);
    
    if (success) {
      this.monitoring.recordCounter(`operations.${operationType}.success`, 1, dimensions);
    } else {
      this.monitoring.recordCounter(`operations.${operationType}.failure`, 1, dimensions);
    }
  }
  
  /**
   * Track database operation performance
   */
  static trackDatabaseOperation(operation: string, duration: number, success: boolean = true): void {
    const dimensions = { operation, success: success.toString() };
    
    this.monitoring.recordTimer('database.operation_duration', duration, dimensions);
    this.monitoring.recordCounter('database.operations', 1, dimensions);
    
    // Alert on slow database operations
    if (duration > 2000) {
      this.monitoring.recordCounter('database.slow_operations', 1, dimensions);
    }
  }
  
  /**
   * Track external API call performance
   */
  static trackExternalApiCall(service: string, endpoint: string, duration: number, statusCode: number): void {
    const dimensions = { 
      service, 
      endpoint, 
      statusCode: statusCode.toString(),
      success: (statusCode >= 200 && statusCode < 300).toString()
    };
    
    this.monitoring.recordTimer('external_api.call_duration', duration, dimensions);
    this.monitoring.recordCounter('external_api.calls', 1, dimensions);
    
    if (statusCode >= 400) {
      this.monitoring.recordCounter('external_api.errors', 1, dimensions);
    }
  }
}

/**
 * Alert configuration for different metrics
 */
export const ALERT_CONFIGS: AlertConfig[] = [
  {
    name: 'High Error Rate',
    metric: 'errors.total',
    threshold: 10,
    comparison: 'greater_than',
    period: 300, // 5 minutes
    evaluationPeriods: 2,
    severity: 'high',
    enabled: true
  },
  {
    name: 'Critical Errors',
    metric: 'errors.critical',
    threshold: 1,
    comparison: 'greater_than',
    period: 60, // 1 minute
    evaluationPeriods: 1,
    severity: 'critical',
    enabled: true
  },
  {
    name: 'Slow Database Operations',
    metric: 'database.slow_operations',
    threshold: 5,
    comparison: 'greater_than',
    period: 300, // 5 minutes
    evaluationPeriods: 2,
    severity: 'medium',
    enabled: true
  },
  {
    name: 'Payment Failure Rate',
    metric: 'billing.payments_failed',
    threshold: 5,
    comparison: 'greater_than',
    period: 600, // 10 minutes
    evaluationPeriods: 2,
    severity: 'high',
    enabled: true
  },
  {
    name: 'Moderation Queue Backlog',
    metric: 'moderation.queue_size',
    threshold: 100,
    comparison: 'greater_than',
    period: 1800, // 30 minutes
    evaluationPeriods: 1,
    severity: 'medium',
    enabled: true
  }
];

/**
 * Dashboard configuration for monitoring
 */
export const DASHBOARD_WIDGETS: DashboardWidget[] = [
  {
    title: 'Error Rate',
    type: 'line',
    metrics: ['errors.total', 'errors.critical', 'errors.high'],
    period: 300
  },
  {
    title: 'Listing Activity',
    type: 'bar',
    metrics: ['listings.created', 'listings.views'],
    period: 3600
  },
  {
    title: 'Payment Success Rate',
    type: 'number',
    metrics: ['billing.success_rate'],
    period: 3600
  },
  {
    title: 'Moderation Queue',
    type: 'line',
    metrics: ['moderation.queue_size', 'moderation.approved', 'moderation.rejected'],
    period: 1800
  },
  {
    title: 'User Registrations',
    type: 'line',
    metrics: ['users.registered', 'users.upgraded'],
    period: 3600
  },
  {
    title: 'Finance Calculator Usage',
    type: 'bar',
    metrics: ['finance.calculations_created', 'finance.calculations_saved'],
    period: 3600
  }
];

/**
 * Initialize monitoring system
 */
export function initializeMonitoring(): void {
  const monitoring = MonitoringService.getInstance();
  const logger = Logger.getInstance('monitoring-init');
  
  logger.info('Initializing monitoring system', {
    alertConfigs: ALERT_CONFIGS.length,
    dashboardWidgets: DASHBOARD_WIDGETS.length
  });
  
  // Set up cleanup on process exit
  process.on('SIGTERM', () => {
    logger.info('Cleaning up monitoring system');
    monitoring.cleanup();
  });
  
  process.on('SIGINT', () => {
    logger.info('Cleaning up monitoring system');
    monitoring.cleanup();
  });
}