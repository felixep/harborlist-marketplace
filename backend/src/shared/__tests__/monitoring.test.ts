/**
 * Tests for Monitoring and Alerting System
 * 
 * Tests for metrics collection, business metrics tracking, error monitoring,
 * performance tracking, and monitoring configuration.
 */

import {
  MonitoringService,
  BusinessMetrics,
  ErrorMonitoring,
  PerformanceTracker,
  MetricType,
  ALERT_CONFIGS,
  DASHBOARD_WIDGETS,
  initializeMonitoring
} from '../monitoring';
import { EventType } from '../logger';
import { createEnhancedError, EnhancedErrorCodes, ErrorSeverity, ErrorCategory } from '../errors';

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation();

// Mock timers
jest.useFakeTimers();

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.clearAllTimers();
});

describe('MonitoringService', () => {
  let monitoring: MonitoringService;

  beforeEach(() => {
    monitoring = MonitoringService.getInstance();
  });

  describe('Metric Recording', () => {
    it('should record counter metrics', () => {
      monitoring.recordCounter('test.counter', 5, { service: 'test' });
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'test.counter',
          type: MetricType.COUNTER,
          value: 5,
          dimensions: { service: 'test' }
        })
      );
    });

    it('should record gauge metrics', () => {
      monitoring.recordGauge('test.gauge', 42.5, 'percent', { region: 'us-east-1' });
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'test.gauge',
          type: MetricType.GAUGE,
          value: 42.5,
          unit: 'percent',
          dimensions: { region: 'us-east-1' }
        })
      );
    });

    it('should record timer metrics', () => {
      monitoring.recordTimer('test.timer', 1500, { operation: 'database_query' });
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'test.timer',
          type: MetricType.TIMER,
          value: 1500,
          unit: 'milliseconds',
          dimensions: { operation: 'database_query' }
        })
      );
    });

    it('should add timestamp to metrics', () => {
      const beforeTime = Date.now();
      monitoring.recordCounter('test.timestamped');
      const afterTime = Date.now();
      
      const logCall = mockConsoleDebug.mock.calls[0][1];
      expect(logCall.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(logCall.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Metrics Flushing', () => {
    it('should flush metrics immediately for critical metrics', () => {
      monitoring.recordCounter('error.critical', 1);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[CLOUDWATCH_METRICS]',
        expect.stringContaining('error.critical')
      );
    });

    it('should flush metrics periodically', () => {
      monitoring.recordCounter('test.periodic', 1);
      
      // Fast-forward time to trigger periodic flush
      jest.advanceTimersByTime(30000);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[CLOUDWATCH_METRICS]',
        expect.stringContaining('test.periodic')
      );
    });

    it('should handle flush errors gracefully', () => {
      // Mock console.log to throw error
      mockConsoleLog.mockImplementationOnce(() => {
        throw new Error('Flush failed');
      });
      
      monitoring.recordCounter('test.flush_error', 1);
      
      // Should not throw error
      expect(() => {
        jest.advanceTimersByTime(30000);
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', () => {
      monitoring.cleanup();
      
      // Should flush remaining metrics
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[CLOUDWATCH_METRICS]',
        expect.any(String)
      );
    });
  });
});

describe('BusinessMetrics', () => {
  describe('Listing Metrics', () => {
    it('should track listing creation', () => {
      BusinessMetrics.trackListingMetrics(
        EventType.LISTING_CREATED,
        'listing-123',
        { userId: 'user-456', category: 'sailboat' }
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'listings.created',
          value: 1
        })
      );
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        '[BUSINESS_EVENT]',
        expect.stringContaining('listing_created')
      );
    });

    it('should track listing views', () => {
      BusinessMetrics.trackListingMetrics(
        EventType.LISTING_VIEWED,
        'listing-456',
        { userId: 'user-789', source: 'search' }
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'listings.views',
          value: 1
        })
      );
    });

    it('should track engine additions', () => {
      BusinessMetrics.trackListingMetrics(
        EventType.ENGINE_ADDED,
        'listing-789',
        { engineCount: 2, engineType: 'outboard' }
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'engines.added',
          value: 1
        })
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'engines.total_per_listing',
          value: 2
        })
      );
    });

    it('should track engine validation failures', () => {
      BusinessMetrics.trackListingMetrics(
        EventType.ENGINE_VALIDATION_FAILED,
        'listing-101',
        { validationError: 'invalid_horsepower' }
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'engines.validation_errors',
          value: 1
        })
      );
    });
  });

  describe('User Tier Metrics', () => {
    it('should track user registrations', () => {
      BusinessMetrics.trackUserTierMetrics(
        EventType.USER_REGISTERED,
        'user-123',
        { userType: 'individual', tier: 'basic' }
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'users.registered',
          value: 1
        })
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'users.registered.individual',
          value: 1
        })
      );
    });

    it('should track user upgrades', () => {
      BusinessMetrics.trackUserTierMetrics(
        EventType.USER_UPGRADED,
        'user-456',
        { userType: 'dealer', newTier: 'premium', oldTier: 'basic' }
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'users.upgraded',
          value: 1
        })
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'users.tier.premium',
          value: 1
        })
      );
    });

    it('should track membership expirations', () => {
      BusinessMetrics.trackUserTierMetrics(
        EventType.MEMBERSHIP_EXPIRED,
        'user-789',
        { tier: 'premium', expirationDate: '2024-01-01' }
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'memberships.expired',
          value: 1
        })
      );
    });
  });

  describe('Moderation Metrics', () => {
    it('should track moderation submissions', () => {
      BusinessMetrics.trackModerationMetrics(
        EventType.MODERATION_SUBMITTED,
        'mod-123',
        { priority: 'high', queueSize: 25 }
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'moderation.submitted',
          value: 1
        })
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'moderation.queue_size',
          value: 25
        })
      );
    });

    it('should track moderation approvals with review time', () => {
      BusinessMetrics.trackModerationMetrics(
        EventType.MODERATION_APPROVED,
        'mod-456',
        { moderatorId: 'mod-user-123', reviewTime: 300 }
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'moderation.approved',
          value: 1
        })
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'moderation.review_time',
          value: 300
        })
      );
    });

    it('should track moderation escalations', () => {
      BusinessMetrics.trackModerationMetrics(
        EventType.MODERATION_ESCALATED,
        'mod-789',
        { reason: 'complex_case', escalatedTo: 'senior-mod-123' }
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'moderation.escalated',
          value: 1
        })
      );
    });
  });

  describe('Finance Metrics', () => {
    it('should track finance calculations', () => {
      BusinessMetrics.trackFinanceMetrics(
        EventType.CALCULATION_CREATED,
        'calc-123',
        { userId: 'user-456', loanAmount: 50000 }
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'finance.calculations_created',
          value: 1
        })
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'finance.average_loan_amount',
          value: 50000
        })
      );
    });

    it('should track calculation saves and shares', () => {
      BusinessMetrics.trackFinanceMetrics(
        EventType.CALCULATION_SAVED,
        'calc-456',
        { userId: 'user-789' }
      );
      
      BusinessMetrics.trackFinanceMetrics(
        EventType.CALCULATION_SHARED,
        'calc-456',
        { userId: 'user-789', shareMethod: 'email' }
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'finance.calculations_saved',
          value: 1
        })
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'finance.calculations_shared',
          value: 1
        })
      );
    });
  });

  describe('Billing Metrics', () => {
    it('should track payment lifecycle', () => {
      // Payment initiated
      BusinessMetrics.trackBillingMetrics(
        EventType.PAYMENT_INITIATED,
        'txn-123',
        { paymentMethod: 'credit_card', amount: 99.99, currency: 'USD' }
      );
      
      // Payment completed
      BusinessMetrics.trackBillingMetrics(
        EventType.PAYMENT_COMPLETED,
        'txn-123',
        { paymentMethod: 'credit_card', currency: 'USD' }
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'billing.payments_initiated',
          value: 1
        })
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'billing.payment_amount',
          value: 99.99
        })
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'billing.payments_completed',
          value: 1
        })
      );
    });

    it('should track payment failures', () => {
      BusinessMetrics.trackBillingMetrics(
        EventType.PAYMENT_FAILED,
        'txn-456',
        { paymentMethod: 'credit_card', failureReason: 'insufficient_funds' }
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'billing.payments_failed',
          value: 1
        })
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'billing.failures.insufficient_funds',
          value: 1
        })
      );
    });

    it('should track subscriptions and refunds', () => {
      BusinessMetrics.trackBillingMetrics(
        EventType.SUBSCRIPTION_CREATED,
        'sub-123',
        { plan: 'premium', currency: 'USD' }
      );
      
      BusinessMetrics.trackBillingMetrics(
        EventType.REFUND_PROCESSED,
        'refund-456',
        { amount: 25.00, currency: 'USD', reason: 'customer_request' }
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'billing.subscriptions_created',
          value: 1
        })
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'billing.refunds_processed',
          value: 1
        })
      );
    });
  });
});

describe('ErrorMonitoring', () => {
  describe('Error Tracking', () => {
    it('should track error metrics', () => {
      const error = createEnhancedError(
        EnhancedErrorCodes.PAYMENT_PROCESSING_FAILED,
        ErrorSeverity.HIGH,
        ErrorCategory.EXTERNAL_SERVICE,
        { transactionId: 'txn-123' }
      );
      
      ErrorMonitoring.trackError(error, { service: 'billing-service' });
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'errors.total',
          value: 1
        })
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'errors.high',
          value: 1
        })
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'errors.category.external_service',
          value: 1
        })
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'errors.code.PAYMENT_PROCESSING_FAILED',
          value: 1
        })
      );
    });

    it('should send critical error alerts', () => {
      const criticalError = createEnhancedError(
        EnhancedErrorCodes.DATABASE_CONNECTION_ERROR,
        ErrorSeverity.CRITICAL,
        ErrorCategory.SYSTEM
      );
      
      ErrorMonitoring.trackError(criticalError);
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[CRITICAL_ERROR_ALERT]',
        expect.stringContaining('DATABASE_CONNECTION_ERROR')
      );
    });

    it('should not send alerts for non-critical errors', () => {
      const mediumError = createEnhancedError(
        EnhancedErrorCodes.TIER_LIMIT_EXCEEDED,
        ErrorSeverity.MEDIUM,
        ErrorCategory.BUSINESS_LOGIC
      );
      
      ErrorMonitoring.trackError(mediumError);
      
      expect(mockConsoleError).not.toHaveBeenCalledWith(
        expect.stringContaining('[CRITICAL_ERROR_ALERT]'),
        expect.any(String)
      );
    });
  });

  describe('Error Recovery Tracking', () => {
    it('should track successful error recovery', () => {
      ErrorMonitoring.trackErrorRecovery(
        EnhancedErrorCodes.DATABASE_CONNECTION_ERROR,
        'retry_connection',
        true
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'errors.recovery_attempts',
          value: 1
        })
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'errors.recovery_success',
          value: 1
        })
      );
    });

    it('should track failed error recovery', () => {
      ErrorMonitoring.trackErrorRecovery(
        EnhancedErrorCodes.PAYMENT_PROCESSING_FAILED,
        'retry_payment',
        false
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'errors.recovery_attempts',
          value: 1
        })
      );
      
      // Should not record recovery success
      expect(mockConsoleDebug).not.toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'errors.recovery_success'
        })
      );
    });
  });
});

describe('PerformanceTracker', () => {
  describe('Operation Tracking', () => {
    it('should track operation performance', () => {
      PerformanceTracker.startOperation('op-123', 'create_listing');
      
      // Simulate some processing time
      setTimeout(() => {
        PerformanceTracker.endOperation('op-123', 'create_listing', true);
        
        expect(mockConsoleDebug).toHaveBeenCalledWith(
          'Metric recorded',
          expect.objectContaining({
            name: 'operations.create_listing.started',
            value: 1
          })
        );
        
        expect(mockConsoleDebug).toHaveBeenCalledWith(
          'Metric recorded',
          expect.objectContaining({
            name: 'operations.create_listing.duration',
            unit: 'milliseconds'
          })
        );
        
        expect(mockConsoleDebug).toHaveBeenCalledWith(
          'Metric recorded',
          expect.objectContaining({
            name: 'operations.create_listing.success',
            value: 1
          })
        );
      }, 10);
    });

    it('should track failed operations', () => {
      PerformanceTracker.startOperation('op-456', 'process_payment');
      PerformanceTracker.endOperation('op-456', 'process_payment', false);
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'operations.process_payment.failure',
          value: 1
        })
      );
    });

    it('should handle missing operation gracefully', () => {
      // Should not throw error for non-existent operation
      expect(() => {
        PerformanceTracker.endOperation('nonexistent', 'test_operation', true);
      }).not.toThrow();
    });
  });

  describe('Database Operation Tracking', () => {
    it('should track database operations', () => {
      PerformanceTracker.trackDatabaseOperation('select_users', 150, true);
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'database.operation_duration',
          value: 150
        })
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'database.operations',
          value: 1
        })
      );
    });

    it('should track slow database operations', () => {
      PerformanceTracker.trackDatabaseOperation('complex_query', 3000, true);
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'database.slow_operations',
          value: 1
        })
      );
    });

    it('should track failed database operations', () => {
      PerformanceTracker.trackDatabaseOperation('insert_listing', 100, false);
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          dimensions: expect.objectContaining({
            success: 'false'
          })
        })
      );
    });
  });

  describe('External API Tracking', () => {
    it('should track successful API calls', () => {
      PerformanceTracker.trackExternalApiCall('payment-processor', '/charge', 250, 200);
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'external_api.call_duration',
          value: 250
        })
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'external_api.calls',
          value: 1,
          dimensions: expect.objectContaining({
            success: 'true'
          })
        })
      );
    });

    it('should track failed API calls', () => {
      PerformanceTracker.trackExternalApiCall('payment-processor', '/charge', 500, 500);
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          name: 'external_api.errors',
          value: 1
        })
      );
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Metric recorded',
        expect.objectContaining({
          dimensions: expect.objectContaining({
            success: 'false',
            statusCode: '500'
          })
        })
      );
    });
  });
});

describe('Configuration', () => {
  describe('Alert Configurations', () => {
    it('should have valid alert configurations', () => {
      expect(ALERT_CONFIGS).toBeDefined();
      expect(ALERT_CONFIGS.length).toBeGreaterThan(0);
      
      ALERT_CONFIGS.forEach(config => {
        expect(config).toHaveProperty('name');
        expect(config).toHaveProperty('metric');
        expect(config).toHaveProperty('threshold');
        expect(config).toHaveProperty('comparison');
        expect(config).toHaveProperty('period');
        expect(config).toHaveProperty('evaluationPeriods');
        expect(config).toHaveProperty('severity');
        expect(config).toHaveProperty('enabled');
        
        expect(['greater_than', 'less_than', 'equal_to']).toContain(config.comparison);
        expect(['low', 'medium', 'high', 'critical']).toContain(config.severity);
        expect(typeof config.enabled).toBe('boolean');
      });
    });

    it('should include critical error alert', () => {
      const criticalAlert = ALERT_CONFIGS.find(config => config.name === 'Critical Errors');
      
      expect(criticalAlert).toBeDefined();
      expect(criticalAlert?.metric).toBe('errors.critical');
      expect(criticalAlert?.severity).toBe('critical');
      expect(criticalAlert?.enabled).toBe(true);
    });

    it('should include payment failure alert', () => {
      const paymentAlert = ALERT_CONFIGS.find(config => config.name === 'Payment Failure Rate');
      
      expect(paymentAlert).toBeDefined();
      expect(paymentAlert?.metric).toBe('billing.payments_failed');
      expect(paymentAlert?.severity).toBe('high');
    });
  });

  describe('Dashboard Widgets', () => {
    it('should have valid dashboard widget configurations', () => {
      expect(DASHBOARD_WIDGETS).toBeDefined();
      expect(DASHBOARD_WIDGETS.length).toBeGreaterThan(0);
      
      DASHBOARD_WIDGETS.forEach(widget => {
        expect(widget).toHaveProperty('title');
        expect(widget).toHaveProperty('type');
        expect(widget).toHaveProperty('metrics');
        expect(widget).toHaveProperty('period');
        
        expect(['line', 'bar', 'pie', 'number', 'table']).toContain(widget.type);
        expect(Array.isArray(widget.metrics)).toBe(true);
        expect(widget.metrics.length).toBeGreaterThan(0);
        expect(typeof widget.period).toBe('number');
      });
    });

    it('should include error rate widget', () => {
      const errorWidget = DASHBOARD_WIDGETS.find(widget => widget.title === 'Error Rate');
      
      expect(errorWidget).toBeDefined();
      expect(errorWidget?.type).toBe('line');
      expect(errorWidget?.metrics).toContain('errors.total');
    });

    it('should include payment success rate widget', () => {
      const paymentWidget = DASHBOARD_WIDGETS.find(widget => widget.title === 'Payment Success Rate');
      
      expect(paymentWidget).toBeDefined();
      expect(paymentWidget?.type).toBe('number');
      expect(paymentWidget?.metrics).toContain('billing.success_rate');
    });
  });
});

describe('Monitoring Initialization', () => {
  it('should initialize monitoring system', () => {
    initializeMonitoring();
    
    expect(mockConsoleInfo).toHaveBeenCalledWith(
      expect.stringContaining('Initializing monitoring system'),
      expect.objectContaining({
        alertConfigs: ALERT_CONFIGS.length,
        dashboardWidgets: DASHBOARD_WIDGETS.length
      })
    );
  });

  it('should set up process exit handlers', () => {
    const mockProcessOn = jest.spyOn(process, 'on').mockImplementation();
    
    initializeMonitoring();
    
    expect(mockProcessOn).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(mockProcessOn).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    
    mockProcessOn.mockRestore();
  });
});