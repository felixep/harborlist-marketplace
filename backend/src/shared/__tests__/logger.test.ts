/**
 * Tests for Comprehensive Logging and Monitoring System
 * 
 * Tests for structured logging, performance monitoring, business event tracking,
 * audit logging, and system monitoring utilities.
 */

import {
  Logger,
  LogLevel,
  EventType,
  EventTracker,
  PerformanceMonitor,
  AuditLogger,
  SystemMonitor,
  withLogging
} from '../logger';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Mock console methods
const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation();
const mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = Logger.getInstance('test-service');
    logger.setContext('request-123', 'user-456', 'correlation-789');
  });

  describe('Log Level Methods', () => {
    it('should log debug messages when LOG_LEVEL is debug', () => {
      process.env.LOG_LEVEL = 'debug';
      
      logger.debug('Debug message', { key: 'value' });
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        expect.stringContaining('"level":"debug"')
      );
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Debug message"')
      );
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        expect.stringContaining('"requestId":"request-123"')
      );
    });

    it('should not log debug messages when LOG_LEVEL is not debug', () => {
      process.env.LOG_LEVEL = 'info';
      
      logger.debug('Debug message');
      
      expect(mockConsoleDebug).not.toHaveBeenCalled();
    });

    it('should log info messages', () => {
      logger.info('Info message', { operation: 'test' });
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('"level":"info"')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Info message"')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('"operation":"test"')
      );
    });

    it('should log warning messages', () => {
      logger.warn('Warning message', { issue: 'performance' });
      
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('"level":"warn"')
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Warning message"')
      );
    });

    it('should log error messages with error details', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      
      logger.error('Error occurred', error, { context: 'test' });
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('"level":"error"')
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Error occurred"')
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('"stack":"Error stack trace"')
      );
    });

    it('should log critical messages and send alerts', () => {
      const error = new Error('Critical error');
      
      logger.critical('Critical issue', error, { severity: 'high' });
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('"level":"critical"')
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[CRITICAL_ALERT]')
      );
    });
  });

  describe('Context Management', () => {
    it('should include context in log entries', () => {
      logger.info('Test message');
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('"requestId":"request-123"')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('"userId":"user-456"')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('"correlationId":"correlation-789"')
      );
    });

    it('should handle missing context gracefully', () => {
      const newLogger = Logger.getInstance('new-service');
      
      newLogger.info('Test message');
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('"requestId":null')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('"userId":null')
      );
    });
  });

  describe('Log Entry Structure', () => {
    it('should create properly structured log entries', () => {
      logger.info('Structured message', { custom: 'data' });
      
      const logCall = mockConsoleInfo.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry).toHaveProperty('level', 'info');
      expect(logEntry).toHaveProperty('message', 'Structured message');
      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).toHaveProperty('requestId', 'request-123');
      expect(logEntry).toHaveProperty('userId', 'user-456');
      expect(logEntry).toHaveProperty('service', 'test-service');
      expect(logEntry.metadata).toHaveProperty('custom', 'data');
      expect(logEntry.metadata).toHaveProperty('correlationId', 'correlation-789');
    });
  });
});

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    // Clear any existing metrics
    PerformanceMonitor['metrics'].clear();
  });

  describe('Performance Tracking', () => {
    it('should track request performance', () => {
      PerformanceMonitor.startTracking('request-123', 'test-function', false);
      
      // Simulate some processing time
      setTimeout(() => {
        const metrics = PerformanceMonitor.endTracking('request-123', 200, 0);
        
        expect(metrics).toBeDefined();
        expect(metrics?.requestId).toBe('request-123');
        expect(metrics?.functionName).toBe('test-function');
        expect(metrics?.statusCode).toBe(200);
        expect(metrics?.errorCount).toBe(0);
        expect(metrics?.duration).toBeGreaterThan(0);
        expect(metrics?.memoryUsed).toBeGreaterThan(0);
      }, 10);
    });

    it('should track cold start metrics', () => {
      PerformanceMonitor.startTracking('request-456', 'test-function', true);
      const metrics = PerformanceMonitor.endTracking('request-456', 200, 0);
      
      expect(metrics?.coldStart).toBe(true);
    });

    it('should handle missing metrics gracefully', () => {
      const metrics = PerformanceMonitor.endTracking('nonexistent-request', 200, 0);
      
      expect(metrics).toBeUndefined();
    });
  });

  describe('Database Metrics', () => {
    it('should add database query metrics', () => {
      PerformanceMonitor.startTracking('request-789', 'test-function', false);
      PerformanceMonitor.addDatabaseMetrics('request-789', 3, 150);
      PerformanceMonitor.addDatabaseMetrics('request-789', 2, 75);
      
      const metrics = PerformanceMonitor.endTracking('request-789', 200, 0);
      
      expect(metrics?.dbQueryCount).toBe(5);
      expect(metrics?.dbQueryTime).toBe(225);
    });
  });

  describe('External API Metrics', () => {
    it('should add external API call metrics', () => {
      PerformanceMonitor.startTracking('request-101', 'test-function', false);
      PerformanceMonitor.addExternalApiMetrics('request-101', 2, 300);
      PerformanceMonitor.addExternalApiMetrics('request-101', 1, 100);
      
      const metrics = PerformanceMonitor.endTracking('request-101', 200, 0);
      
      expect(metrics?.externalApiCalls).toBe(3);
      expect(metrics?.externalApiTime).toBe(400);
    });
  });

  describe('Performance Alerts', () => {
    it('should log warning for slow requests', () => {
      PerformanceMonitor.startTracking('slow-request', 'test-function', false);
      
      // Mock a slow request by manipulating the start time
      const metrics = PerformanceMonitor['metrics'].get('slow-request');
      if (metrics) {
        metrics.duration = Date.now() - 6000; // 6 seconds ago
      }
      
      PerformanceMonitor.endTracking('slow-request', 200, 0);
      
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Slow request detected')
      );
    });

    it('should log warning for slow database queries', () => {
      PerformanceMonitor.startTracking('db-slow-request', 'test-function', false);
      PerformanceMonitor.addDatabaseMetrics('db-slow-request', 1, 3000); // 3 seconds
      
      PerformanceMonitor.endTracking('db-slow-request', 200, 0);
      
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Slow database queries detected')
      );
    });
  });
});

describe('EventTracker', () => {
  describe('Business Event Tracking', () => {
    it('should track generic business events', () => {
      const event = {
        eventType: EventType.LISTING_CREATED,
        listingId: 'listing-123',
        userId: 'user-456',
        metadata: { category: 'sailboat' },
        timestamp: Date.now()
      };
      
      EventTracker.track(event);
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        '[BUSINESS_EVENT]',
        expect.stringContaining(EventType.LISTING_CREATED)
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('Business event: listing_created')
      );
    });

    it('should track listing events', () => {
      EventTracker.trackListingEvent(
        EventType.LISTING_VIEWED,
        'listing-789',
        'user-123',
        { source: 'search' }
      );
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        '[BUSINESS_EVENT]',
        expect.stringContaining('"eventType":"listing_viewed"')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('"listingId":"listing-789"')
      );
    });

    it('should track user events', () => {
      EventTracker.trackUserEvent(
        EventType.USER_UPGRADED,
        'user-456',
        { fromTier: 'basic', toTier: 'premium' }
      );
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        '[BUSINESS_EVENT]',
        expect.stringContaining('"eventType":"user_upgraded"')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('"userId":"user-456"')
      );
    });

    it('should track payment events', () => {
      EventTracker.trackPaymentEvent(
        EventType.PAYMENT_COMPLETED,
        'txn-789',
        'user-123',
        { amount: 99.99, currency: 'USD' }
      );
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        '[BUSINESS_EVENT]',
        expect.stringContaining('"eventType":"payment_completed"')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('"transactionId":"txn-789"')
      );
    });

    it('should track moderation events', () => {
      EventTracker.trackModerationEvent(
        EventType.MODERATION_APPROVED,
        'mod-456',
        'listing-123',
        'moderator-789',
        { reviewTime: 300 }
      );
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        '[BUSINESS_EVENT]',
        expect.stringContaining('"eventType":"moderation_approved"')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('"moderationId":"mod-456"')
      );
    });
  });

  describe('Analytics Integration', () => {
    it('should attempt to send events to analytics service when configured', () => {
      process.env.ANALYTICS_ENDPOINT = 'https://analytics.example.com';
      
      EventTracker.track({
        eventType: EventType.CALCULATION_CREATED,
        calculationId: 'calc-123',
        timestamp: Date.now()
      });
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Sending event to analytics service:',
        expect.objectContaining({
          eventType: EventType.CALCULATION_CREATED,
          calculationId: 'calc-123'
        })
      );
    });
  });
});

describe('AuditLogger', () => {
  describe('Audit Logging', () => {
    it('should log audit events', () => {
      const auditEntry = {
        action: 'update_user',
        resource: 'user',
        resourceId: 'user-123',
        userId: 'admin-456',
        changes: {
          before: { tier: 'basic' },
          after: { tier: 'premium' }
        },
        timestamp: Date.now(),
        success: true
      };
      
      AuditLogger.log(auditEntry);
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        '[AUDIT_LOG]',
        expect.stringContaining('"action":"update_user"')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('Audit: update_user on user')
      );
    });

    it('should log user management actions', () => {
      AuditLogger.logUserAction(
        'tier_upgrade',
        'user-123',
        'admin-456',
        { fromTier: 'basic', toTier: 'premium' },
        'request-789'
      );
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        '[AUDIT_LOG]',
        expect.stringContaining('"action":"tier_upgrade"')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('"resource":"user"')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('"resourceId":"user-123"')
      );
    });

    it('should log listing management actions', () => {
      AuditLogger.logListingAction(
        'approve_listing',
        'listing-456',
        'moderator-789',
        { status: 'approved' },
        'request-101'
      );
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        '[AUDIT_LOG]',
        expect.stringContaining('"action":"approve_listing"')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('"resource":"listing"')
      );
    });

    it('should log billing actions', () => {
      AuditLogger.logBillingAction(
        'process_refund',
        'txn-123',
        'admin-456',
        { amount: 50.00, reason: 'customer_request' },
        'request-202'
      );
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        '[AUDIT_LOG]',
        expect.stringContaining('"action":"process_refund"')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('"resource":"billing"')
      );
    });

    it('should log failed actions', () => {
      AuditLogger.logFailedAction(
        'delete_user',
        'user',
        'user-123',
        'admin-456',
        'User has active subscriptions',
        'request-303'
      );
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        '[AUDIT_LOG]',
        expect.stringContaining('"success":false')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('"errorMessage":"User has active subscriptions"')
      );
    });
  });

  describe('Audit Service Integration', () => {
    it('should attempt to send audit logs to service when configured', () => {
      process.env.AUDIT_ENDPOINT = 'https://audit.example.com';
      
      AuditLogger.log({
        action: 'test_action',
        resource: 'test_resource',
        userId: 'test-user',
        timestamp: Date.now(),
        success: true
      });
      
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        'Sending audit log to service:',
        expect.objectContaining({
          action: 'test_action',
          resource: 'test_resource'
        })
      );
    });
  });
});

describe('SystemMonitor', () => {
  describe('Health Checks', () => {
    it('should perform system health check', () => {
      const health = SystemMonitor.checkHealth();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('checks');
      expect(health).toHaveProperty('timestamp');
      expect(health.checks).toHaveProperty('memory');
      expect(health.checks).toHaveProperty('database');
      expect(health.checks).toHaveProperty('externalServices');
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        '[HEALTH_CHECK]',
        expect.stringContaining('"status"')
      );
    });

    it('should report healthy status when all checks pass', () => {
      const health = SystemMonitor.checkHealth();
      
      // Assuming all checks pass in test environment
      expect(health.status).toBe('healthy');
    });

    it('should log warning for unhealthy status', () => {
      // Mock memory usage to trigger unhealthy status
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 1024 * 1024 * 1024, // 1GB
        heapTotal: 0,
        external: 0,
        rss: 0,
        arrayBuffers: 0
      });
      
      process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE = '128'; // 128MB limit
      
      const health = SystemMonitor.checkHealth();
      
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('System health check failed')
      );
      
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Error Rate Monitoring', () => {
    it('should monitor error rates', () => {
      SystemMonitor.monitorErrorRates(100, 2, 300); // 2% error rate
      
      // Should not log warning for acceptable error rate
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it('should log warning for high error rates', () => {
      SystemMonitor.monitorErrorRates(100, 10, 300); // 10% error rate
      
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('High error rate detected')
      );
    });
  });
});

describe('Logging Middleware', () => {
  const mockEvent: APIGatewayProxyEvent = {
    httpMethod: 'GET',
    path: '/test',
    headers: {
      'User-Agent': 'test-agent'
    },
    requestContext: {
      identity: {
        sourceIp: '127.0.0.1'
      },
      authorizer: {
        claims: {
          sub: 'user-123'
        }
      }
    } as any,
    body: null,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    pathParameters: null,
    queryStringParameters: null,
    resource: '',
    stageVariables: null
  };

  const mockContext: Context = {
    awsRequestId: 'request-456',
    functionName: 'test-function',
    functionVersion: '1',
    memoryLimitInMB: '128',
    getRemainingTimeInMS: () => 30000,
    coldStart: false
  } as any;

  describe('withLogging', () => {
    it('should wrap handler with logging', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ success: true })
      });
      
      const wrappedHandler = withLogging(mockHandler, 'test-service');
      const result = await wrappedHandler(mockEvent, mockContext);
      
      expect(result.statusCode).toBe(200);
      expect(mockHandler).toHaveBeenCalledWith(mockEvent, mockContext);
      
      // Check that request start and completion were logged
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('Request started')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('Request completed successfully')
      );
      
      // Check that performance metrics were logged
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        '[PERFORMANCE_METRICS]',
        expect.stringContaining('"requestId":"request-456"')
      );
    });

    it('should log errors from wrapped handler', async () => {
      const testError = new Error('Handler failed');
      const mockHandler = jest.fn().mockRejectedValue(testError);
      
      const wrappedHandler = withLogging(mockHandler, 'test-service');
      
      await expect(wrappedHandler(mockEvent, mockContext)).rejects.toThrow('Handler failed');
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Request failed'),
        testError,
        expect.objectContaining({
          method: 'GET',
          path: '/test'
        })
      );
    });

    it('should set logging context from event', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: '{}'
      });
      
      const wrappedHandler = withLogging(mockHandler, 'test-service');
      await wrappedHandler(mockEvent, mockContext);
      
      // Verify that context was set by checking log entries contain request ID and user ID
      const logCalls = mockConsoleInfo.mock.calls.flat();
      const hasRequestId = logCalls.some(call => 
        typeof call === 'string' && call.includes('"requestId":"request-456"')
      );
      const hasUserId = logCalls.some(call => 
        typeof call === 'string' && call.includes('"userId":"user-123"')
      );
      
      expect(hasRequestId).toBe(true);
      expect(hasUserId).toBe(true);
    });
  });
});