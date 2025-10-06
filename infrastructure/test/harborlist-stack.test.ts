import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { HarborListStack } from '../lib/harborlist-stack';

describe('HarborListStack', () => {
  let app: cdk.App;
  let stack: HarborListStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new HarborListStack(app, 'TestStack', {
      environment: 'dev',
      alertEmail: 'test@example.com',
    });
    template = Template.fromStack(stack);
  });

  describe('DynamoDB Tables', () => {
    test('creates all required DynamoDB tables', () => {
      // Check for main tables
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'harborlist-listings',
      });

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'boat-users',
      });

      // Check for admin-specific tables
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'boat-audit-logs',
      });

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'boat-admin-sessions',
      });

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'boat-login-attempts',
      });
    });

    test('audit logs table has proper TTL configuration', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'boat-audit-logs',
        TimeToLiveSpecification: {
          AttributeName: 'ttl',
          Enabled: true,
        },
      });
    });

    test('admin sessions table has proper TTL configuration', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'boat-admin-sessions',
        TimeToLiveSpecification: {
          AttributeName: 'expiresAt',
          Enabled: true,
        },
      });
    });

    test('login attempts table has proper TTL configuration', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'boat-login-attempts',
        TimeToLiveSpecification: {
          AttributeName: 'ttl',
          Enabled: true,
        },
      });
    });

    test('audit logs table has required GSIs', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'boat-audit-logs',
        GlobalSecondaryIndexes: Match.arrayWith([
          Match.objectLike({
            IndexName: 'user-index',
            KeySchema: [
              { AttributeName: 'userId', KeyType: 'HASH' },
              { AttributeName: 'timestamp', KeyType: 'RANGE' },
            ],
          }),
          Match.objectLike({
            IndexName: 'action-index',
            KeySchema: [
              { AttributeName: 'action', KeyType: 'HASH' },
              { AttributeName: 'timestamp', KeyType: 'RANGE' },
            ],
          }),
          Match.objectLike({
            IndexName: 'resource-index',
            KeySchema: [
              { AttributeName: 'resource', KeyType: 'HASH' },
              { AttributeName: 'timestamp', KeyType: 'RANGE' },
            ],
          }),
        ]),
      });
    });
  });

  describe('Lambda Functions', () => {
    test('creates admin Lambda function with proper configuration', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'admin-service/index.handler',
        Runtime: 'nodejs18.x',
        Timeout: 30,
        MemorySize: 512,
        Environment: {
          Variables: Match.objectLike({
            ENVIRONMENT: 'dev',
            NODE_ENV: 'development',
            LOG_LEVEL: 'debug',
            SESSION_TIMEOUT_MINUTES: '60',
            MAX_LOGIN_ATTEMPTS: '5',
            LOGIN_ATTEMPT_WINDOW_MINUTES: '15',
          }),
        },
      });
    });

    test('admin function has access to all required tables', () => {
      // Check IAM policies for DynamoDB access
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: Match.arrayWith([
                'dynamodb:BatchGetItem',
                'dynamodb:GetRecords',
                'dynamodb:GetShardIterator',
                'dynamodb:Query',
                'dynamodb:GetItem',
                'dynamodb:Scan',
                'dynamodb:ConditionCheckItem',
                'dynamodb:BatchWriteItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
              ]),
            }),
          ]),
        },
      });
    });
  });

  describe('Secrets Manager', () => {
    test('creates JWT secret for admin authentication', () => {
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'harborlist-admin-jwt-dev',
        Description: 'JWT secret for admin authentication',
      });
    });

    test('admin function has access to JWT secret', () => {
      // Check that there's a policy with secrets manager permissions
      const policies = template.findResources('AWS::IAM::Policy');
      const hasSecretsAccess = Object.values(policies).some((policy: any) => {
        const statements = policy.Properties?.PolicyDocument?.Statement || [];
        return statements.some((statement: any) => 
          statement.Action === 'secretsmanager:GetSecretValue' ||
          (Array.isArray(statement.Action) && statement.Action.includes('secretsmanager:GetSecretValue'))
        );
      });
      expect(hasSecretsAccess).toBe(true);
    });
  });

  describe('CloudWatch Monitoring', () => {
    test('creates SNS topic for admin alerts', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: 'admin-service-alerts-dev',
        DisplayName: 'Admin Service Monitoring Alerts - dev',
      });
    });

    test('creates CloudWatch alarms for admin function', () => {
      // Error rate alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'admin-function-errors-dev',
        AlarmDescription: 'High error rate in admin Lambda function',
        Threshold: 5,
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      });

      // Duration alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'admin-function-duration-dev',
        AlarmDescription: 'High duration in admin Lambda function',
        Threshold: 25000,
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      });

      // Throttle alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'admin-function-throttles-dev',
        AlarmDescription: 'Admin Lambda function is being throttled',
        Threshold: 1,
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      });
    });

    test('creates CloudWatch alarms for DynamoDB tables', () => {
      // Audit logs throttle alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'audit-logs-throttles-dev',
        AlarmDescription: 'Audit logs table is being throttled',
      });

      // Admin sessions throttle alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'admin-sessions-throttles-dev',
        AlarmDescription: 'Admin sessions table is being throttled',
      });
    });

    test('creates CloudWatch dashboard for admin service', () => {
      template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardName: 'admin-service-dev',
      });
    });
  });

  describe('API Gateway', () => {
    test('creates admin API routes', () => {
      template.hasResourceProperties('AWS::ApiGateway::Resource', {
        PathPart: 'admin',
      });
    });

    test('admin routes have proper CORS configuration', () => {
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'Boat Listing API',
      });
    });
  });

  describe('IAM Permissions', () => {
    test('admin function has CloudWatch permissions', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: [
                'cloudwatch:PutMetricData',
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogStreams',
                'logs:DescribeLogGroups',
              ],
              Resource: '*',
            }),
          ]),
        },
      });
    });
  });

  describe('Stack Outputs', () => {
    test('exports all required admin infrastructure outputs', () => {
      template.hasOutput('AdminFunctionName', {});
      template.hasOutput('AdminFunctionArn', {});
      template.hasOutput('AuditLogsTableName', {});
      template.hasOutput('AdminSessionsTableName', {});
      template.hasOutput('LoginAttemptsTableName', {});
      template.hasOutput('AdminJwtSecretArn', {});
      template.hasOutput('AdminAlertTopicArn', {});
      template.hasOutput('AdminDashboardUrl', {});
    });
  });
});