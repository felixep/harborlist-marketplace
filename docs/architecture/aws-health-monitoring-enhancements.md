# AWS Health Monitoring Enhancements

## Overview
Current health monitoring system handles AWS vs local environments but needs AWS-specific enhancements for production deployment.

## Current AWS Compatibility ✅

### Environment Detection
```typescript
const isAWS = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const isLocal = !isAWS;

// Adapts metrics based on environment
environment: {
  type: isAWS ? 'aws' : 'local',
  region: process.env.AWS_REGION || 'local'
}
```

### Lambda-Specific Memory Monitoring
```typescript
if (isAWS) {
  const allocatedMemory = parseInt(process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || '512') * 1024 * 1024;
  // Uses Lambda memory allocation instead of container memory
}
```

## Required AWS Enhancements 🔧

### 1. AWS Service Health Checks
```typescript
async function checkAWSServicesHealth() {
  const checks = await Promise.all([
    checkDynamoDBHealth(),
    checkS3Health(), 
    checkAPIGatewayHealth(),
    checkLambdaConcurrency()
  ]);
  
  return {
    dynamodb: checks[0],
    s3: checks[1], 
    apigateway: checks[2],
    lambda: checks[3]
  };
}

async function checkDynamoDBHealth() {
  try {
    // Check table capacity and throttling
    const tableMetrics = await cloudwatch.getMetricStatistics({
      Namespace: 'AWS/DynamoDB',
      MetricName: 'ThrottledRequests',
      Dimensions: [{ Name: 'TableName', Value: 'harborlist-users' }],
      StartTime: new Date(Date.now() - 300000), // 5 minutes ago
      EndTime: new Date(),
      Period: 300,
      Statistics: ['Sum']
    }).promise();
    
    return {
      healthy: tableMetrics.Datapoints.every(dp => dp.Sum === 0),
      throttledRequests: tableMetrics.Datapoints.reduce((sum, dp) => sum + dp.Sum, 0)
    };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}
```

### 2. CloudWatch Metrics Integration
```typescript
async function publishCustomMetrics(healthData) {
  const cloudwatch = new AWS.CloudWatch();
  
  const params = {
    Namespace: 'HarborList/HealthMonitoring',
    MetricData: [
      {
        MetricName: 'DatabaseHealth',
        Value: healthData.services.database.status === 'healthy' ? 1 : 0,
        Unit: 'Count',
        Timestamp: new Date()
      },
      {
        MetricName: 'APIResponseTime', 
        Value: healthData.performance.responseTime,
        Unit: 'Milliseconds',
        Timestamp: new Date()
      }
    ]
  };
  
  await cloudwatch.putMetricData(params).promise();
}
```

### 3. Lambda Cold Start Monitoring
```typescript
let isWarmStart = false;

async function trackLambdaPerformance() {
  const startTime = Date.now();
  const isColdStart = !isWarmStart;
  isWarmStart = true;
  
  return {
    coldStart: isColdStart,
    startupTime: Date.now() - startTime,
    concurrentExecutions: await getLambdaConcurrency(),
    memoryUtilization: process.memoryUsage()
  };
}
```

### 4. Enhanced Error Tracking
```typescript
async function getCloudWatchErrors(timeRange: string) {
  const cloudwatch = new AWS.CloudWatchLogs();
  
  const logGroups = [
    '/aws/lambda/harborlist-admin-function',
    '/aws/lambda/harborlist-auth-function',
    '/aws/lambda/harborlist-listing-function'
  ];
  
  const errors = [];
  for (const logGroup of logGroups) {
    const query = await cloudwatch.startQuery({
      logGroupName: logGroup,
      startTime: Date.now() - (24 * 60 * 60 * 1000), // 24 hours
      endTime: Date.now(),
      queryString: `
        fields @timestamp, @message
        | filter @message like /ERROR/
        | sort @timestamp desc
        | limit 100
      `
    }).promise();
    
    // Process query results...
  }
  
  return errors;
}
```

## Infrastructure Alignment

### CloudWatch Alarms (Already Implemented)
```typescript
// Current infrastructure includes:
const adminErrorAlarm = new cloudwatch.Alarm(this, 'AdminFunctionErrorAlarm', {
  metric: adminFunction.metricErrors(),
  threshold: 5,
  evaluationPeriods: 2
});

const adminDurationAlarm = new cloudwatch.Alarm(this, 'AdminFunctionDurationAlarm', {
  metric: adminFunction.metricDuration(),
  threshold: cdk.Duration.seconds(30)
});
```

### SNS Integration for Alerts
```typescript
// Should integrate with SNS topics for critical alerts
const alertTopic = new sns.Topic(this, 'HealthAlerts');

adminErrorAlarm.addAlarmAction(
  new cloudwatchActions.SnsAction(alertTopic)
);
```

## Implementation Priority

### Phase 1: Core AWS Service Checks
- DynamoDB capacity and throttling monitoring
- Lambda concurrency and duration tracking
- API Gateway error rate monitoring

### Phase 2: CloudWatch Integration  
- Custom metrics publishing
- Log aggregation and error parsing
- Dashboard integration

### Phase 3: Advanced Monitoring
- Cold start optimization tracking
- Business metric correlation
- Predictive alerting

## Environment Variables Needed

```bash
# Additional AWS-specific environment variables
CLOUDWATCH_NAMESPACE=HarborList/Monitoring
SNS_ALERT_TOPIC_ARN=arn:aws:sns:us-east-1:account:health-alerts
ENABLE_CLOUDWATCH_METRICS=true
LAMBDA_FUNCTION_NAME=harborlist-admin-function
```

## Testing Strategy

### Local Development
- Mock CloudWatch APIs for local testing
- Simulate AWS service responses
- Test environment detection logic

### AWS Staging/Production
- Verify CloudWatch integration
- Test alert thresholds
- Monitor performance impact of health checks