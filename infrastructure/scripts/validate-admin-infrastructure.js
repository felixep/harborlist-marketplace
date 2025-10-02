#!/usr/bin/env node

/**
 * Admin Infrastructure Validation Script
 * 
 * This script validates that all admin dashboard infrastructure components
 * are properly deployed and configured.
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS SDK
const region = process.env.AWS_REGION || 'us-east-1';
AWS.config.update({ region });

const dynamodb = new AWS.DynamoDB();
const lambda = new AWS.Lambda();
const cloudwatch = new AWS.CloudWatch();
const secretsmanager = new AWS.SecretsManager();
const sns = new AWS.SNS();

class AdminInfrastructureValidator {
  constructor(environment = 'dev') {
    this.environment = environment;
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  log(level, message, details = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, details };
    
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    if (details) {
      console.log('  Details:', JSON.stringify(details, null, 2));
    }
    
    this.results.details.push(logEntry);
    
    if (level === 'error') this.results.failed++;
    else if (level === 'warn') this.results.warnings++;
    else if (level === 'info') this.results.passed++;
  }

  async validateDynamoDBTables() {
    console.log('\n=== Validating DynamoDB Tables ===');
    
    const requiredTables = [
      {
        name: 'boat-audit-logs',
        requiredAttributes: ['id', 'timestamp', 'userId', 'action', 'resource'],
        requiredGSIs: ['user-index', 'action-index', 'resource-index'],
        ttlAttribute: 'ttl'
      },
      {
        name: 'boat-admin-sessions',
        requiredAttributes: ['sessionId', 'userId', 'lastActivity'],
        requiredGSIs: ['user-index'],
        ttlAttribute: 'expiresAt'
      },
      {
        name: 'boat-login-attempts',
        requiredAttributes: ['id', 'timestamp', 'email', 'ipAddress'],
        requiredGSIs: ['email-index', 'ip-index'],
        ttlAttribute: 'ttl'
      }
    ];

    for (const tableConfig of requiredTables) {
      try {
        const result = await dynamodb.describeTable({ TableName: tableConfig.name }).promise();
        const table = result.Table;

        // Check table status
        if (table.TableStatus !== 'ACTIVE') {
          this.log('error', `Table ${tableConfig.name} is not active`, { status: table.TableStatus });
          continue;
        }

        // Check billing mode
        if (table.BillingModeSummary?.BillingMode !== 'PAY_PER_REQUEST') {
          this.log('warn', `Table ${tableConfig.name} is not using on-demand billing`);
        }

        // Check TTL configuration
        try {
          const ttlResult = await dynamodb.describeTimeToLive({ TableName: tableConfig.name }).promise();
          if (ttlResult.TimeToLiveDescription?.TimeToLiveStatus !== 'ENABLED') {
            this.log('error', `Table ${tableConfig.name} does not have TTL enabled`);
          } else if (ttlResult.TimeToLiveDescription?.AttributeName !== tableConfig.ttlAttribute) {
            this.log('error', `Table ${tableConfig.name} TTL attribute mismatch`, {
              expected: tableConfig.ttlAttribute,
              actual: ttlResult.TimeToLiveDescription?.AttributeName
            });
          } else {
            this.log('info', `Table ${tableConfig.name} TTL configuration is correct`);
          }
        } catch (error) {
          this.log('error', `Failed to check TTL for table ${tableConfig.name}`, error.message);
        }

        // Check GSIs
        const actualGSIs = table.GlobalSecondaryIndexes?.map(gsi => gsi.IndexName) || [];
        const missingGSIs = tableConfig.requiredGSIs.filter(gsi => !actualGSIs.includes(gsi));
        
        if (missingGSIs.length > 0) {
          this.log('error', `Table ${tableConfig.name} missing GSIs`, { missing: missingGSIs });
        } else {
          this.log('info', `Table ${tableConfig.name} has all required GSIs`);
        }

        this.log('info', `Table ${tableConfig.name} validation completed`);

      } catch (error) {
        this.log('error', `Failed to validate table ${tableConfig.name}`, error.message);
      }
    }
  }

  async validateLambdaFunction() {
    console.log('\n=== Validating Lambda Function ===');
    
    try {
      // Get function name from CDK outputs or use pattern
      const functionName = `BoatListingStack-AdminFunction*`;
      
      const functions = await lambda.listFunctions().promise();
      const adminFunction = functions.Functions.find(f => 
        f.FunctionName.includes('AdminFunction') || 
        f.FunctionName.includes('admin-service')
      );

      if (!adminFunction) {
        this.log('error', 'Admin Lambda function not found');
        return;
      }

      // Check function configuration
      const config = await lambda.getFunctionConfiguration({ 
        FunctionName: adminFunction.FunctionName 
      }).promise();

      // Validate runtime
      if (config.Runtime !== 'nodejs18.x') {
        this.log('warn', `Admin function using runtime ${config.Runtime}, expected nodejs18.x`);
      }

      // Validate timeout
      if (config.Timeout < 30) {
        this.log('warn', `Admin function timeout is ${config.Timeout}s, recommended 30s`);
      }

      // Validate memory
      if (config.MemorySize < 512) {
        this.log('warn', `Admin function memory is ${config.MemorySize}MB, recommended 512MB`);
      }

      // Check environment variables
      const requiredEnvVars = [
        'LISTINGS_TABLE',
        'USERS_TABLE', 
        'AUDIT_LOGS_TABLE',
        'ADMIN_SESSIONS_TABLE',
        'LOGIN_ATTEMPTS_TABLE',
        'JWT_SECRET_ARN',
        'ENVIRONMENT'
      ];

      const missingEnvVars = requiredEnvVars.filter(envVar => 
        !config.Environment?.Variables?.[envVar]
      );

      if (missingEnvVars.length > 0) {
        this.log('error', 'Admin function missing environment variables', { missing: missingEnvVars });
      } else {
        this.log('info', 'Admin function has all required environment variables');
      }

      this.log('info', `Admin function ${adminFunction.FunctionName} validation completed`);

    } catch (error) {
      this.log('error', 'Failed to validate Lambda function', error.message);
    }
  }

  async validateSecretsManager() {
    console.log('\n=== Validating Secrets Manager ===');
    
    try {
      const secretName = `boat-listing-admin-jwt-${this.environment}`;
      
      const secret = await secretsmanager.describeSecret({ SecretId: secretName }).promise();
      
      if (secret.DeletedDate) {
        this.log('error', `JWT secret ${secretName} is scheduled for deletion`);
        return;
      }

      // Try to retrieve the secret value (this validates permissions)
      try {
        await secretsmanager.getSecretValue({ SecretId: secretName }).promise();
        this.log('info', `JWT secret ${secretName} is accessible`);
      } catch (error) {
        this.log('error', `Cannot access JWT secret ${secretName}`, error.message);
      }

    } catch (error) {
      this.log('error', 'Failed to validate Secrets Manager', error.message);
    }
  }

  async validateCloudWatchAlarms() {
    console.log('\n=== Validating CloudWatch Alarms ===');
    
    const requiredAlarms = [
      `admin-function-errors-${this.environment}`,
      `admin-function-duration-${this.environment}`,
      `admin-function-throttles-${this.environment}`,
      `audit-logs-throttles-${this.environment}`,
      `admin-sessions-throttles-${this.environment}`
    ];

    try {
      const alarms = await cloudwatch.describeAlarms().promise();
      
      for (const alarmName of requiredAlarms) {
        const alarm = alarms.MetricAlarms.find(a => a.AlarmName === alarmName);
        
        if (!alarm) {
          this.log('error', `CloudWatch alarm ${alarmName} not found`);
          continue;
        }

        if (alarm.StateValue === 'INSUFFICIENT_DATA') {
          this.log('warn', `Alarm ${alarmName} has insufficient data`);
        } else if (alarm.StateValue === 'ALARM') {
          this.log('warn', `Alarm ${alarmName} is currently in ALARM state`);
        } else {
          this.log('info', `Alarm ${alarmName} is in OK state`);
        }
      }

    } catch (error) {
      this.log('error', 'Failed to validate CloudWatch alarms', error.message);
    }
  }

  async validateSNSTopic() {
    console.log('\n=== Validating SNS Topic ===');
    
    try {
      const topics = await sns.listTopics().promise();
      const adminTopic = topics.Topics.find(t => 
        t.TopicArn.includes(`admin-service-alerts-${this.environment}`)
      );

      if (!adminTopic) {
        this.log('error', `Admin service alerts SNS topic not found`);
        return;
      }

      // Check subscriptions
      const subscriptions = await sns.listSubscriptionsByTopic({ 
        TopicArn: adminTopic.TopicArn 
      }).promise();

      if (subscriptions.Subscriptions.length === 0) {
        this.log('warn', 'Admin alerts SNS topic has no subscriptions');
      } else {
        this.log('info', `Admin alerts SNS topic has ${subscriptions.Subscriptions.length} subscription(s)`);
      }

    } catch (error) {
      this.log('error', 'Failed to validate SNS topic', error.message);
    }
  }

  async validateCloudWatchDashboard() {
    console.log('\n=== Validating CloudWatch Dashboard ===');
    
    try {
      const dashboards = await cloudwatch.listDashboards().promise();
      const adminDashboard = dashboards.DashboardEntries.find(d => 
        d.DashboardName === `admin-service-${this.environment}`
      );

      if (!adminDashboard) {
        this.log('error', `Admin service CloudWatch dashboard not found`);
        return;
      }

      // Get dashboard details
      const dashboard = await cloudwatch.getDashboard({ 
        DashboardName: adminDashboard.DashboardName 
      }).promise();

      const dashboardBody = JSON.parse(dashboard.DashboardBody);
      const widgetCount = dashboardBody.widgets?.length || 0;

      if (widgetCount < 3) {
        this.log('warn', `Admin dashboard has only ${widgetCount} widgets, expected at least 3`);
      } else {
        this.log('info', `Admin dashboard has ${widgetCount} widgets`);
      }

    } catch (error) {
      this.log('error', 'Failed to validate CloudWatch dashboard', error.message);
    }
  }

  async generateReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      region: region,
      summary: {
        total_checks: this.results.passed + this.results.failed + this.results.warnings,
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings,
        success_rate: Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)
      },
      details: this.results.details
    };

    // Write report to file
    const reportPath = path.join(__dirname, '..', 'reports', `admin-infrastructure-validation-${this.environment}-${Date.now()}.json`);
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(`\n=== Validation Report ===`);
    console.log(`Total Checks: ${reportData.summary.total_checks}`);
    console.log(`Passed: ${reportData.summary.passed}`);
    console.log(`Failed: ${reportData.summary.failed}`);
    console.log(`Warnings: ${reportData.summary.warnings}`);
    console.log(`Success Rate: ${reportData.summary.success_rate}%`);
    console.log(`Report saved to: ${reportPath}`);

    return reportData;
  }

  async run() {
    console.log(`Starting admin infrastructure validation for environment: ${this.environment}`);
    console.log(`AWS Region: ${region}`);
    
    try {
      await this.validateDynamoDBTables();
      await this.validateLambdaFunction();
      await this.validateSecretsManager();
      await this.validateCloudWatchAlarms();
      await this.validateSNSTopic();
      await this.validateCloudWatchDashboard();
      
      const report = await this.generateReport();
      
      // Exit with error code if there are failures
      if (this.results.failed > 0) {
        console.error(`\nValidation failed with ${this.results.failed} errors`);
        process.exit(1);
      }
      
      console.log('\nValidation completed successfully!');
      return report;
      
    } catch (error) {
      console.error('Validation failed with unexpected error:', error);
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const environment = process.argv[2] || 'dev';
  const validator = new AdminInfrastructureValidator(environment);
  validator.run();
}

module.exports = AdminInfrastructureValidator;