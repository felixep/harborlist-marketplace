# 📊 Monitoring & Observability

## 📋 **Overview**

The HarborList monitoring and observability framework provides comprehensive visibility into system health, performance, and user experience across all platform components. Our monitoring strategy combines infrastructure metrics, application performance monitoring, business intelligence, and proactive alerting to ensure optimal platform reliability.

---

## 🏗️ **Architecture Overview**

### **Monitoring Stack**

```typescript
// CloudWatch Enhanced Monitoring Configuration
export const MONITORING_CONFIG = {
  // Infrastructure Monitoring
  infrastructure: {
    ec2Instances: {
      metrics: ['CPUUtilization', 'NetworkIn', 'NetworkOut', 'DiskReadOps', 'DiskWriteOps'],
      alarms: {
        highCPU: { threshold: 80, evaluationPeriods: 2, period: 300 },
        highMemory: { threshold: 85, evaluationPeriods: 3, period: 300 },
        diskSpace: { threshold: 90, evaluationPeriods: 1, period: 600 },
      },
    },
    
    rds: {
      metrics: ['DatabaseConnections', 'CPUUtilization', 'FreeStorageSpace', 'ReadLatency', 'WriteLatency'],
      alarms: {
        connectionOverload: { threshold: 80, evaluationPeriods: 2, period: 300 },
        highLatency: { threshold: 0.2, evaluationPeriods: 3, period: 300 },
        lowStorage: { threshold: 2000000000, evaluationPeriods: 1, period: 600 }, // 2GB
      },
    },
    
    dynamodb: {
      metrics: ['ConsumedReadCapacityUnits', 'ConsumedWriteCapacityUnits', 'ThrottledRequests', 'SuccessfulRequestLatency'],
      alarms: {
        throttling: { threshold: 1, evaluationPeriods: 1, period: 300 },
        highLatency: { threshold: 100, evaluationPeriods: 3, period: 300 },
        capacity: { threshold: 80, evaluationPeriods: 2, period: 300 },
      },
    },
  },
  
  // Application Performance Monitoring
  application: {
    apiGateway: {
      metrics: ['Count', 'Latency', '4XXError', '5XXError'],
      alarms: {
        errorRate: { threshold: 5, evaluationPeriods: 2, period: 300 }, // 5% error rate
        latency: { threshold: 1000, evaluationPeriods: 3, period: 300 }, // 1s latency
      },
    },
    
    lambda: {
      metrics: ['Duration', 'Errors', 'Throttles', 'ConcurrentExecutions'],
      alarms: {
        duration: { threshold: 10000, evaluationPeriods: 2, period: 300 }, // 10s duration
        errorRate: { threshold: 1, evaluationPeriods: 1, period: 300 },
        throttling: { threshold: 1, evaluationPeriods: 1, period: 300 },
      },
    },
  },
  
  // Business Intelligence
  business: {
    userEngagement: {
      metrics: ['ActiveUsers', 'SessionDuration', 'PageViews', 'ConversionRate'],
      dashboards: ['UserEngagement', 'BusinessMetrics', 'RevenueTracking'],
    },
    
    platformHealth: {
      metrics: ['ListingCreations', 'SearchQueries', 'ContactRequests', 'UserRegistrations'],
      alerts: ['LowActivity', 'HighErrorRate', 'SystemDown'],
    },
  },
};

// Custom CloudWatch Metrics Client
export class CloudWatchMetricsService {
  private cloudWatch: CloudWatchClient;
  private namespace: string;

  constructor() {
    this.cloudWatch = new CloudWatchClient({ region: process.env.AWS_REGION });
    this.namespace = 'HarborList/Application';
  }

  async putMetric(metricName: string, value: number, unit: string = 'Count', dimensions: Dimension[] = []): Promise<void> {
    try {
      await this.cloudWatch.send(new PutMetricDataCommand({
        Namespace: this.namespace,
        MetricData: [{
          MetricName: metricName,
          Value: value,
          Unit: unit as StandardUnit,
          Dimensions: dimensions,
          Timestamp: new Date(),
        }],
      }));
    } catch (error) {
      console.error(`Failed to put CloudWatch metric ${metricName}:`, error);
    }
  }

  async putBusinessMetric(event: BusinessEvent): Promise<void> {
    const dimensions: Dimension[] = [
      { Name: 'EventType', Value: event.type },
      { Name: 'Source', Value: event.source || 'unknown' },
    ];

    if (event.userId) {
      dimensions.push({ Name: 'UserId', Value: event.userId });
    }

    await this.putMetric(
      'BusinessEvent',
      event.value || 1,
      event.unit || 'Count',
      dimensions
    );

    // Track revenue metrics separately
    if (event.revenue) {
      await this.putMetric(
        'Revenue',
        event.revenue,
        'None', // Currency amount
        dimensions
      );
    }
  }

  async createCustomDashboard(dashboardName: string, widgets: DashboardWidget[]): Promise<void> {
    const dashboard = {
      widgets: widgets.map(widget => ({
        type: 'metric',
        properties: {
          metrics: widget.metrics,
          view: widget.view || 'timeSeries',
          stacked: widget.stacked || false,
          region: process.env.AWS_REGION,
          title: widget.title,
          period: widget.period || 300,
        },
      })),
    };

    await this.cloudWatch.send(new PutDashboardCommand({
      DashboardName: dashboardName,
      DashboardBody: JSON.stringify(dashboard),
    }));
  }
}
```

---

## 📈 **Application Performance Monitoring**

### **Lambda Function Monitoring**

```typescript
// Enhanced Lambda Monitoring with X-Ray
export class LambdaMonitoringService {
  private xray: XRayClient;
  private metricsService: CloudWatchMetricsService;

  constructor() {
    this.xray = new XRayClient({ region: process.env.AWS_REGION });
    this.metricsService = new CloudWatchMetricsService();
  }

  // Performance Middleware for Lambda Functions
  createPerformanceMiddleware() {
    return {
      before: async (handler: any) => {
        // Start performance tracking
        handler.context.startTime = performance.now();
        handler.context.traceId = AWSXRay.getTraceId();
        
        // Custom segment for detailed tracing
        const segment = AWSXRay.getSegment();
        if (segment) {
          segment.addAnnotation('FunctionName', handler.context.functionName);
          segment.addAnnotation('RequestId', handler.context.awsRequestId);
        }
      },

      after: async (handler: any) => {
        const duration = performance.now() - handler.context.startTime;
        const functionName = handler.context.functionName;

        // Record performance metrics
        await this.metricsService.putMetric(
          'FunctionDuration',
          duration,
          'Milliseconds',
          [{ Name: 'FunctionName', Value: functionName }]
        );

        // Record memory usage
        const memoryUsed = process.memoryUsage();
        await this.metricsService.putMetric(
          'MemoryUtilization',
          (memoryUsed.heapUsed / memoryUsed.heapTotal) * 100,
          'Percent',
          [{ Name: 'FunctionName', Value: functionName }]
        );

        // Add custom annotations to X-Ray
        const segment = AWSXRay.getSegment();
        if (segment) {
          segment.addAnnotation('Duration', duration);
          segment.addAnnotation('MemoryUsed', memoryUsed.heapUsed);
        }
      },

      onError: async (handler: any) => {
        const functionName = handler.context.functionName;
        const error = handler.error;

        // Record error metrics
        await this.metricsService.putMetric(
          'FunctionErrors',
          1,
          'Count',
          [
            { Name: 'FunctionName', Value: functionName },
            { Name: 'ErrorType', Value: error.name || 'UnknownError' },
          ]
        );

        // Add error details to X-Ray
        const segment = AWSXRay.getSegment();
        if (segment) {
          segment.addError(error);
          segment.addAnnotation('ErrorType', error.name);
          segment.addAnnotation('ErrorMessage', error.message);
        }

        // Send to error tracking service
        await this.sendErrorAlert(functionName, error, handler.context);
      },
    };
  }

  async sendErrorAlert(functionName: string, error: Error, context: any): Promise<void> {
    const errorDetails = {
      functionName,
      errorType: error.name,
      errorMessage: error.message,
      stackTrace: error.stack,
      requestId: context.awsRequestId,
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
    };

    // Send to SNS for immediate alerting
    await this.publishToSNS('lambda-error-alerts', errorDetails);
    
    // Log structured error for analysis
    console.error('Lambda Error:', JSON.stringify(errorDetails, null, 2));
  }

  private async publishToSNS(topicArn: string, message: any): Promise<void> {
    const sns = new SNSClient({ region: process.env.AWS_REGION });
    
    try {
      await sns.send(new PublishCommand({
        TopicArn: process.env[topicArn.toUpperCase().replace('-', '_')],
        Message: JSON.stringify(message),
        Subject: `Lambda Error: ${message.functionName}`,
      }));
    } catch (error) {
      console.error('Failed to publish SNS message:', error);
    }
  }
}

// Usage in Lambda Functions
const monitoringService = new LambdaMonitoringService();
const performanceMiddleware = monitoringService.createPerformanceMiddleware();

export const listingSearchHandler = middy(async (event: APIGatewayProxyEvent) => {
  // Function implementation
  const startTime = performance.now();
  
  try {
    const searchParams = JSON.parse(event.body || '{}');
    const results = await searchService.searchListings(searchParams);
    
    // Track search performance
    const searchDuration = performance.now() - startTime;
    await metricsService.putMetric('SearchDuration', searchDuration, 'Milliseconds');
    
    // Track business metrics
    await metricsService.putBusinessMetric({
      type: 'SEARCH_PERFORMED',
      source: 'api',
      value: 1,
      metadata: {
        query: searchParams.query,
        resultsCount: results.data.length,
        filters: searchParams.filters,
      },
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: results,
        metadata: {
          searchDuration: searchDuration.toFixed(2),
          traceId: AWSXRay.getTraceId(),
        },
      }),
    };
  } catch (error) {
    // Error will be handled by middleware
    throw error;
  }
})
  .use(performanceMiddleware)
  .use(cors())
  .use(jsonBodyParser());
```

### **Database Performance Monitoring**

```typescript
// DynamoDB Enhanced Monitoring
export class DynamoDBMonitoringService {
  private dynamodb: DynamoDBClient;
  private metricsService: CloudWatchMetricsService;

  constructor() {
    this.dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
    this.metricsService = new CloudWatchMetricsService();
  }

  // Instrumented DynamoDB Operations
  async instrumentedQuery(params: QueryCommandInput): Promise<QueryCommandOutput> {
    const startTime = performance.now();
    const tableName = params.TableName || 'unknown';
    
    try {
      const result = await this.dynamodb.send(new QueryCommand(params));
      const duration = performance.now() - startTime;

      // Record performance metrics
      await this.recordQueryMetrics(tableName, duration, result.Count || 0, 'SUCCESS');

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      await this.recordQueryMetrics(tableName, duration, 0, 'ERROR');
      throw error;
    }
  }

  async instrumentedScan(params: ScanCommandInput): Promise<ScanCommandOutput> {
    const startTime = performance.now();
    const tableName = params.TableName || 'unknown';
    
    try {
      const result = await this.dynamodb.send(new ScanCommand(params));
      const duration = performance.now() - startTime;

      await this.recordScanMetrics(tableName, duration, result.Count || 0, 'SUCCESS');
      
      // Alert on expensive scan operations
      if (duration > 1000 || (result.Count || 0) > 1000) {
        await this.sendPerformanceAlert('EXPENSIVE_SCAN', {
          tableName,
          duration,
          itemsScanned: result.ScannedCount,
          itemsReturned: result.Count,
        });
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      await this.recordScanMetrics(tableName, duration, 0, 'ERROR');
      throw error;
    }
  }

  async instrumentedPutItem(params: PutItemCommandInput): Promise<PutItemCommandOutput> {
    const startTime = performance.now();
    const tableName = params.TableName || 'unknown';
    
    try {
      const result = await this.dynamodb.send(new PutItemCommand(params));
      const duration = performance.now() - startTime;

      await this.recordWriteMetrics(tableName, duration, 1, 'PUT', 'SUCCESS');

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      await this.recordWriteMetrics(tableName, duration, 1, 'PUT', 'ERROR');
      throw error;
    }
  }

  private async recordQueryMetrics(
    tableName: string,
    duration: number,
    itemCount: number,
    status: string
  ): Promise<void> {
    const dimensions = [
      { Name: 'TableName', Value: tableName },
      { Name: 'Operation', Value: 'Query' },
      { Name: 'Status', Value: status },
    ];

    await Promise.all([
      this.metricsService.putMetric('OperationDuration', duration, 'Milliseconds', dimensions),
      this.metricsService.putMetric('ItemsReturned', itemCount, 'Count', dimensions),
      this.metricsService.putMetric('OperationCount', 1, 'Count', dimensions),
    ]);
  }

  private async recordScanMetrics(
    tableName: string,
    duration: number,
    itemCount: number,
    status: string
  ): Promise<void> {
    const dimensions = [
      { Name: 'TableName', Value: tableName },
      { Name: 'Operation', Value: 'Scan' },
      { Name: 'Status', Value: status },
    ];

    await Promise.all([
      this.metricsService.putMetric('OperationDuration', duration, 'Milliseconds', dimensions),
      this.metricsService.putMetric('ItemsReturned', itemCount, 'Count', dimensions),
      this.metricsService.putMetric('OperationCount', 1, 'Count', dimensions),
    ]);
  }

  private async recordWriteMetrics(
    tableName: string,
    duration: number,
    itemCount: number,
    operation: string,
    status: string
  ): Promise<void> {
    const dimensions = [
      { Name: 'TableName', Value: tableName },
      { Name: 'Operation', Value: operation },
      { Name: 'Status', Value: status },
    ];

    await Promise.all([
      this.metricsService.putMetric('OperationDuration', duration, 'Milliseconds', dimensions),
      this.metricsService.putMetric('ItemsWritten', itemCount, 'Count', dimensions),
      this.metricsService.putMetric('OperationCount', 1, 'Count', dimensions),
    ]);
  }

  async sendPerformanceAlert(alertType: string, details: any): Promise<void> {
    const alert = {
      alertType,
      timestamp: new Date().toISOString(),
      details,
      severity: this.calculateSeverity(alertType, details),
    };

    // Send to monitoring webhook
    await fetch(process.env.MONITORING_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    }).catch(console.error);
  }

  private calculateSeverity(alertType: string, details: any): string {
    switch (alertType) {
      case 'EXPENSIVE_SCAN':
        if (details.duration > 5000 || details.itemsScanned > 10000) return 'HIGH';
        if (details.duration > 2000 || details.itemsScanned > 5000) return 'MEDIUM';
        return 'LOW';
      default:
        return 'LOW';
    }
  }
}
```

---

## 🚨 **Alerting & Incident Response**

### **Multi-Channel Alerting System**

```typescript
// Comprehensive Alerting Service
export class AlertingService {
  private sns: SNSClient;
  private ses: SESClient;
  private slack: WebClient;

  constructor() {
    this.sns = new SNSClient({ region: process.env.AWS_REGION });
    this.ses = new SESClient({ region: process.env.AWS_REGION });
    this.slack = new WebClient(process.env.SLACK_BOT_TOKEN);
  }

  async processAlert(alert: SystemAlert): Promise<void> {
    const enrichedAlert = await this.enrichAlert(alert);
    const severity = this.calculateSeverity(enrichedAlert);
    
    // Route alerts based on severity
    switch (severity) {
      case 'CRITICAL':
        await this.sendCriticalAlert(enrichedAlert);
        break;
      case 'HIGH':
        await this.sendHighPriorityAlert(enrichedAlert);
        break;
      case 'MEDIUM':
        await this.sendMediumPriorityAlert(enrichedAlert);
        break;
      case 'LOW':
        await this.sendLowPriorityAlert(enrichedAlert);
        break;
    }

    // Record alert for analytics
    await this.recordAlert(enrichedAlert, severity);
  }

  private async enrichAlert(alert: SystemAlert): Promise<EnrichedAlert> {
    // Add context and correlation data
    const enriched: EnrichedAlert = {
      ...alert,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      region: process.env.AWS_REGION || 'us-east-1',
      correlationId: this.generateCorrelationId(),
      
      // Add system health context
      systemHealth: await this.getSystemHealthSnapshot(),
      
      // Add recent similar alerts
      recentSimilarAlerts: await this.getRecentSimilarAlerts(alert),
      
      // Add runbook links
      runbookUrl: this.getRunbookUrl(alert.type),
    };

    return enriched;
  }

  private async sendCriticalAlert(alert: EnrichedAlert): Promise<void> {
    // Page on-call engineer immediately
    await this.sendPagerDutyAlert(alert);
    
    // Send to critical Slack channel
    await this.sendSlackAlert('#incidents-critical', alert, {
      color: 'danger',
      priority: 'URGENT',
    });
    
    // Send SMS to on-call team
    await this.sendSMSAlert(process.env.ONCALL_PHONE!, alert);
    
    // Send email to engineering leads
    await this.sendEmailAlert(
      process.env.ENGINEERING_LEADS_EMAIL!.split(','),
      alert,
      'CRITICAL ALERT'
    );
  }

  private async sendSlackAlert(
    channel: string,
    alert: EnrichedAlert,
    options: SlackAlertOptions
  ): Promise<void> {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🚨 ${options.priority} Alert: ${alert.title}`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Type:*\n${alert.type}` },
          { type: 'mrkdwn', text: `*Severity:*\n${alert.severity}` },
          { type: 'mrkdwn', text: `*Environment:*\n${alert.environment}` },
          { type: 'mrkdwn', text: `*Time:*\n${alert.timestamp}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Description:*\n${alert.description}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Runbook' },
            url: alert.runbookUrl,
            style: 'primary',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Metrics' },
            url: this.getMetricsDashboardUrl(alert),
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Acknowledge' },
            action_id: `acknowledge_${alert.correlationId}`,
            style: 'danger',
          },
        ],
      },
    ];

    await this.slack.chat.postMessage({
      channel,
      blocks,
      text: `Alert: ${alert.title}`, // Fallback text
    });
  }

  private async sendPagerDutyAlert(alert: EnrichedAlert): Promise<void> {
    const payload = {
      routing_key: process.env.PAGERDUTY_INTEGRATION_KEY,
      event_action: 'trigger',
      dedup_key: alert.correlationId,
      payload: {
        summary: alert.title,
        severity: alert.severity.toLowerCase(),
        source: 'HarborList Monitoring',
        component: alert.component || 'unknown',
        group: alert.service || 'platform',
        class: alert.type,
        custom_details: {
          description: alert.description,
          environment: alert.environment,
          runbook_url: alert.runbookUrl,
          metrics_dashboard: this.getMetricsDashboardUrl(alert),
        },
      },
    };

    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  // Alert Correlation and Noise Reduction
  private async getRecentSimilarAlerts(alert: SystemAlert): Promise<SystemAlert[]> {
    // Query recent alerts with similar characteristics
    const timeWindow = 30 * 60 * 1000; // 30 minutes
    const cutoffTime = new Date(Date.now() - timeWindow);

    // This would typically query a database or time-series store
    // For now, we'll return an empty array
    return [];
  }

  private async shouldSuppressAlert(alert: SystemAlert): Promise<boolean> {
    const recentSimilar = await this.getRecentSimilarAlerts(alert);
    
    // Suppress if we've seen 3+ similar alerts in the last 15 minutes
    const recentCount = recentSimilar.filter(
      a => Date.parse(a.timestamp) > Date.now() - (15 * 60 * 1000)
    ).length;

    return recentCount >= 3;
  }

  // System Health Dashboard Integration
  private async getSystemHealthSnapshot(): Promise<SystemHealthSnapshot> {
    const healthchecks = await Promise.allSettled([
      this.checkAPIHealth(),
      this.checkDatabaseHealth(),
      this.checkSearchHealth(),
      this.checkExternalServicesHealth(),
    ]);

    return {
      api: healthchecks[0].status === 'fulfilled' ? healthchecks[0].value : { status: 'error' },
      database: healthchecks[1].status === 'fulfilled' ? healthchecks[1].value : { status: 'error' },
      search: healthchecks[2].status === 'fulfilled' ? healthchecks[2].value : { status: 'error' },
      externalServices: healthchecks[3].status === 'fulfilled' ? healthchecks[3].value : { status: 'error' },
      overallStatus: this.calculateOverallHealth(healthchecks),
    };
  }

  private async checkAPIHealth(): Promise<HealthStatus> {
    try {
      const response = await fetch(`${process.env.API_BASE_URL}/health`);
      return {
        status: response.ok ? 'healthy' : 'degraded',
        responseTime: performance.now(), // This would be measured properly
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        lastCheck: new Date().toISOString(),
      };
    }
  }
}

// Alert Configuration
export const ALERT_RULES = {
  // Infrastructure Alerts
  'high-cpu-usage': {
    threshold: 80,
    duration: '5m',
    severity: 'HIGH',
    channels: ['slack-ops', 'email-oncall'],
  },
  
  'disk-space-low': {
    threshold: 90,
    duration: '1m',
    severity: 'CRITICAL',
    channels: ['slack-critical', 'pagerduty', 'sms-oncall'],
  },
  
  // Application Alerts
  'api-error-rate-high': {
    threshold: 5, // 5% error rate
    duration: '2m',
    severity: 'HIGH',
    channels: ['slack-engineering', 'email-leads'],
  },
  
  'response-time-degraded': {
    threshold: 2000, // 2 seconds
    duration: '3m',
    severity: 'MEDIUM',
    channels: ['slack-performance'],
  },
  
  // Business Alerts
  'revenue-drop': {
    threshold: -20, // 20% drop
    duration: '1h',
    severity: 'HIGH',
    channels: ['slack-business', 'email-executives'],
  },
  
  'user-registration-stopped': {
    threshold: 0, // No registrations
    duration: '30m',
    severity: 'MEDIUM',
    channels: ['slack-product'],
  },
};
```

---

## 📊 **Business Intelligence Dashboards**

### **Executive Dashboard Configuration**

```typescript
// Business Intelligence Dashboard Service
export class BIDashboardService {
  private cloudWatch: CloudWatchClient;
  
  constructor() {
    this.cloudWatch = new CloudWatchClient({ region: process.env.AWS_REGION });
  }

  async createExecutiveDashboard(): Promise<void> {
    const widgets = [
      // Revenue Tracking
      {
        type: 'metric',
        properties: {
          metrics: [
            ['HarborList/Business', 'Revenue', 'Source', 'Platform'],
            ['...', 'Commission'],
            ['...', 'Subscription'],
          ],
          view: 'timeSeries',
          stacked: false,
          region: process.env.AWS_REGION,
          title: 'Revenue Streams',
          period: 3600, // 1 hour
          stat: 'Sum',
        },
      },
      
      // User Engagement
      {
        type: 'metric',
        properties: {
          metrics: [
            ['HarborList/Business', 'ActiveUsers', 'Period', 'Daily'],
            ['...', 'Weekly'],
            ['...', 'Monthly'],
          ],
          view: 'timeSeries',
          region: process.env.AWS_REGION,
          title: 'Active Users',
          period: 86400, // 1 day
        },
      },
      
      // Platform Health
      {
        type: 'metric',
        properties: {
          metrics: [
            ['AWS/ApiGateway', 'Count', 'ApiName', 'HarborListAPI'],
            ['AWS/Lambda', 'Invocations', 'FunctionName', 'listingSearch'],
            ['AWS/DynamoDB', 'ConsumedReadCapacityUnits', 'TableName', process.env.DYNAMODB_TABLE],
          ],
          view: 'timeSeries',
          region: process.env.AWS_REGION,
          title: 'Platform Usage',
          period: 300,
        },
      },
      
      // Conversion Metrics
      {
        type: 'metric',
        properties: {
          metrics: [
            ['HarborList/Business', 'ConversionRate', 'Funnel', 'Registration'],
            ['...', 'ListingCreation'],
            ['...', 'ContactRequest'],
          ],
          view: 'number',
          region: process.env.AWS_REGION,
          title: 'Conversion Rates',
          period: 3600,
        },
      },
    ];

    await this.cloudWatch.send(new PutDashboardCommand({
      DashboardName: 'HarborList-Executive-Dashboard',
      DashboardBody: JSON.stringify({
        widgets: widgets.map((widget, index) => ({
          ...widget,
          x: (index % 2) * 12,
          y: Math.floor(index / 2) * 6,
          width: 12,
          height: 6,
        })),
      }),
    }));
  }

  async createOperationalDashboard(): Promise<void> {
    const widgets = [
      // System Performance
      {
        type: 'metric',
        properties: {
          metrics: [
            ['AWS/ApiGateway', 'Latency', 'ApiName', 'HarborListAPI'],
            ['AWS/Lambda', 'Duration', 'FunctionName', 'listingSearch'],
            ['AWS/DynamoDB', 'SuccessfulRequestLatency', 'TableName', process.env.DYNAMODB_TABLE],
          ],
          view: 'timeSeries',
          region: process.env.AWS_REGION,
          title: 'Response Times',
          period: 300,
          yAxis: { left: { min: 0, max: 2000 } },
        },
      },
      
      // Error Rates
      {
        type: 'metric',
        properties: {
          metrics: [
            ['AWS/ApiGateway', '4XXError', 'ApiName', 'HarborListAPI'],
            ['AWS/ApiGateway', '5XXError', 'ApiName', 'HarborListAPI'],
            ['AWS/Lambda', 'Errors', 'FunctionName', 'listingSearch'],
          ],
          view: 'timeSeries',
          region: process.env.AWS_REGION,
          title: 'Error Rates',
          period: 300,
        },
      },
      
      // Infrastructure Health
      {
        type: 'metric',
        properties: {
          metrics: [
            ['AWS/EC2', 'CPUUtilization', 'InstanceId', 'i-1234567890abcdef0'],
            ['AWS/RDS', 'CPUUtilization', 'DBInstanceIdentifier', 'harborlist-db'],
            ['AWS/DynamoDB', 'ConsumedReadCapacityUnits', 'TableName', process.env.DYNAMODB_TABLE],
          ],
          view: 'timeSeries',
          region: process.env.AWS_REGION,
          title: 'Infrastructure Utilization',
          period: 300,
        },
      },
    ];

    await this.cloudWatch.send(new PutDashboardCommand({
      DashboardName: 'HarborList-Operations-Dashboard',
      DashboardBody: JSON.stringify({
        widgets: widgets.map((widget, index) => ({
          ...widget,
          x: (index % 2) * 12,
          y: Math.floor(index / 2) * 6,
          width: 12,
          height: 6,
        })),
      }),
    }));
  }

  // Real-time Business Metrics Tracking
  async trackBusinessMetric(event: BusinessMetricEvent): Promise<void> {
    const dimensions: Dimension[] = [
      { Name: 'EventType', Value: event.type },
      { Name: 'Source', Value: event.source || 'web' },
    ];

    if (event.userId) {
      dimensions.push({ Name: 'UserId', Value: event.userId });
    }

    if (event.sessionId) {
      dimensions.push({ Name: 'SessionId', Value: event.sessionId });
    }

    // Core business metrics
    await this.cloudWatch.send(new PutMetricDataCommand({
      Namespace: 'HarborList/Business',
      MetricData: [{
        MetricName: event.metricName,
        Value: event.value,
        Unit: event.unit as StandardUnit,
        Dimensions: dimensions,
        Timestamp: new Date(),
      }],
    }));

    // Calculate derived metrics
    await this.calculateDerivedMetrics(event);
  }

  private async calculateDerivedMetrics(event: BusinessMetricEvent): Promise<void> {
    switch (event.type) {
      case 'USER_REGISTRATION':
        await this.updateConversionFunnel('registration', event.userId);
        break;
      
      case 'LISTING_CREATED':
        await this.updateConversionFunnel('listing_creation', event.userId);
        await this.updateInventoryMetrics();
        break;
      
      case 'CONTACT_REQUEST':
        await this.updateEngagementMetrics(event.userId);
        break;
      
      case 'SEARCH_PERFORMED':
        await this.updateSearchMetrics(event.metadata);
        break;
    }
  }

  private async updateConversionFunnel(step: string, userId?: string): Promise<void> {
    // Track conversion funnel progression
    const funnelSteps = ['registration', 'profile_completion', 'listing_creation', 'first_contact'];
    const stepIndex = funnelSteps.indexOf(step);
    
    if (stepIndex >= 0) {
      // Calculate conversion rate
      const conversionRate = await this.calculateConversionRate(step);
      
      await this.cloudWatch.send(new PutMetricDataCommand({
        Namespace: 'HarborList/Business',
        MetricData: [{
          MetricName: 'ConversionRate',
          Value: conversionRate,
          Unit: 'Percent',
          Dimensions: [{ Name: 'Funnel', Value: step }],
          Timestamp: new Date(),
        }],
      }));
    }
  }

  private async calculateConversionRate(step: string): Promise<number> {
    // This would typically query a database to calculate actual conversion rates
    // For now, return a placeholder value
    return Math.random() * 100;
  }
}
```

---

## 🔗 **Related Documentation**

- **📊 [Performance Testing](../performance/README.md)**: Load testing and optimization strategies
- **🔒 [Security Framework](../security/README.md)**: Security monitoring and incident response
- **🚀 [Deployment Guide](../deployment/README.md)**: CI/CD pipeline monitoring
- **🧪 [Testing Strategy](../testing/README.md)**: Automated testing and quality assurance
- **📱 [API Documentation](../api/README.md)**: API performance monitoring

---

**📅 Last Updated**: October 2025  
**📝 Document Version**: 1.0.0  
**👥 Monitoring Team**: HarborList DevOps Engineering Team  
**🔄 Next Review**: January 2026