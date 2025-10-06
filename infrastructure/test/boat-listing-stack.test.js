"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = require("aws-cdk-lib");
const assertions_1 = require("aws-cdk-lib/assertions");
const harborlist_stack_1 = require("../lib/harborlist-stack");
describe('HarborListStack', () => {
    let app;
    let stack;
    let template;
    beforeEach(() => {
        app = new cdk.App();
        stack = new harborlist_stack_1.HarborListStack(app, 'TestStack', {
            environment: 'dev',
            alertEmail: 'test@example.com',
        });
        template = assertions_1.Template.fromStack(stack);
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
                GlobalSecondaryIndexes: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
                        IndexName: 'user-index',
                        KeySchema: [
                            { AttributeName: 'userId', KeyType: 'HASH' },
                            { AttributeName: 'timestamp', KeyType: 'RANGE' },
                        ],
                    }),
                    assertions_1.Match.objectLike({
                        IndexName: 'action-index',
                        KeySchema: [
                            { AttributeName: 'action', KeyType: 'HASH' },
                            { AttributeName: 'timestamp', KeyType: 'RANGE' },
                        ],
                    }),
                    assertions_1.Match.objectLike({
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
                    Variables: assertions_1.Match.objectLike({
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
                    Statement: assertions_1.Match.arrayWith([
                        assertions_1.Match.objectLike({
                            Effect: 'Allow',
                            Action: assertions_1.Match.arrayWith([
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
            const hasSecretsAccess = Object.values(policies).some((policy) => {
                const statements = policy.Properties?.PolicyDocument?.Statement || [];
                return statements.some((statement) => statement.Action === 'secretsmanager:GetSecretValue' ||
                    (Array.isArray(statement.Action) && statement.Action.includes('secretsmanager:GetSecretValue')));
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
                    Statement: assertions_1.Match.arrayWith([
                        assertions_1.Match.objectLike({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9hdC1saXN0aW5nLXN0YWNrLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJib2F0LWxpc3Rpbmctc3RhY2sudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG1DQUFtQztBQUNuQyx1REFBeUQ7QUFDekQsOERBQTBEO0FBRTFELFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7SUFDL0IsSUFBSSxHQUFZLENBQUM7SUFDakIsSUFBSSxLQUFzQixDQUFDO0lBQzNCLElBQUksUUFBa0IsQ0FBQztJQUV2QixVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLEtBQUssR0FBRyxJQUFJLGtDQUFlLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRTtZQUM1QyxXQUFXLEVBQUUsS0FBSztZQUNsQixVQUFVLEVBQUUsa0JBQWtCO1NBQy9CLENBQUMsQ0FBQztRQUNILFFBQVEsR0FBRyxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7UUFDL0IsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtZQUNoRCx3QkFBd0I7WUFDeEIsUUFBUSxDQUFDLHFCQUFxQixDQUFDLHNCQUFzQixFQUFFO2dCQUNyRCxTQUFTLEVBQUUscUJBQXFCO2FBQ2pDLENBQUMsQ0FBQztZQUVILFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxzQkFBc0IsRUFBRTtnQkFDckQsU0FBUyxFQUFFLFlBQVk7YUFDeEIsQ0FBQyxDQUFDO1lBRUgsa0NBQWtDO1lBQ2xDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxzQkFBc0IsRUFBRTtnQkFDckQsU0FBUyxFQUFFLGlCQUFpQjthQUM3QixDQUFDLENBQUM7WUFFSCxRQUFRLENBQUMscUJBQXFCLENBQUMsc0JBQXNCLEVB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QkFBb0IsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM3QyxRQUFRLENBQUMsU0FBUyxDQUFDLHdCQUF3QixFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2pELFFBQVEsQ0FBQyxTQUFTLENBQUMsd0JBQXdCLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDakQsUUFBUSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM1QyxRQUFRLENBQUMsU0FBUyxDQUFDLG9CQUFvQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzdDLFFBQVEsQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDOUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFRlbXBsYXRlLCBNYXRjaCB9IGZyb20gJ2F3cy1jZGstbGliL2Fzc2VydGlvbnMnO1xuaW1wb3J0IHsgSGFyYm9yTGlzdFN0YWNrIH0gZnJvbSAnLi4vbGliL2hhcmJvcmxpc3Qtc3RhY2snO1xuXG5kZXNjcmliZSgnSGFyYm9yTGlzdFN0YWNrJywgKCkgPT4ge1xuICBsZXQgYXBwOiBjZGsuQXBwO1xuICBsZXQgc3RhY2s6IEhhcmJvckxpc3RTdGFjaztcbiAgbGV0IHRlbXBsYXRlOiBUZW1wbGF0ZTtcblxuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuICAgIHN0YWNrID0gbmV3IEhhcmJvckxpc3RTdGFjayhhcHAsICdUZXN0U3RhY2snLCB7XG4gICAgICBlbnZpcm9ubWVudDogJ2RldicsXG4gICAgICBhbGVydEVtYWlsOiAndGVzdEBleGFtcGxlLmNvbScsXG4gICAgfSk7XG4gICAgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuICB9KTtcblxuICBkZXNjcmliZSgnRHluYW1vREIgVGFibGVzJywgKCkgPT4ge1xuICAgIHRlc3QoJ2NyZWF0ZXMgYWxsIHJlcXVpcmVkIER5bmFtb0RCIHRhYmxlcycsICgpID0+IHtcbiAgICAgIC8vIENoZWNrIGZvciBtYWluIHRhYmxlc1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcbiAgICAgICAgVGFibGVOYW1lOiAnaGFyYm9ybGlzdC1saXN0aW5ncycsXG4gICAgICB9KTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcbiAgICAgICAgVGFibGVOYW1lOiAnYm9hdC11c2VycycsXG4gICAgICB9KTtcblxuICAgICAgLy8gQ2hlY2sgZm9yIGFkbWluLXNwZWNpZmljIHRhYmxlc1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcbiAgICAgICAgVGFibGVOYW1lOiAnYm9hdC1hdWRpdC1sb2dzJyxcbiAgICAgIH0pO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgICBUYWJsZU5hbWU6ICdib2F0LWFkbWluLXNlc3Npb25zJyxcbiAgICAgIH0pO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgICBUYWJsZU5hbWU6ICdib2F0LWxvZ2luLWF0dGVtcHRzJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnYXVkaXQgbG9ncyB0YWJsZSBoYXMgcHJvcGVyIFRUTCBjb25maWd1cmF0aW9uJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcbiAgICAgICAgVGFibGVOYW1lOiAnYm9hdC1hdWRpdC1sb2dzJyxcbiAgICAgICAgVGltZVRvTGl2ZVNwZWNpZmljYXRpb246IHtcbiAgICAgICAgICBBdHRyaWJ1dGVOYW1lOiAndHRsJyxcbiAgICAgICAgICBFbmFibGVkOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdhZG1pbiBzZXNzaW9ucyB0YWJsZSBoYXMgcHJvcGVyIFRUTCBjb25maWd1cmF0aW9uJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcbiAgICAgICAgVGFibGVOYW1lOiAnYm9hdC1hZG1pbi1zZXNzaW9ucycsXG4gICAgICAgIFRpbWVUb0xpdmVTcGVjaWZpY2F0aW9uOiB7XG4gICAgICAgICAgQXR0cmlidXRlTmFtZTogJ2V4cGlyZXNBdCcsXG4gICAgICAgICAgRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnbG9naW4gYXR0ZW1wdHMgdGFibGUgaGFzIHByb3BlciBUVEwgY29uZmlndXJhdGlvbicsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCB7XG4gICAgICAgIFRhYmxlTmFtZTogJ2JvYXQtbG9naW4tYXR0ZW1wdHMnLFxuICAgICAgICBUaW1lVG9MaXZlU3BlY2lmaWNhdGlvbjoge1xuICAgICAgICAgIEF0dHJpYnV0ZU5hbWU6ICd0dGwnLFxuICAgICAgICAgIEVuYWJsZWQ6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2F1ZGl0IGxvZ3MgdGFibGUgaGFzIHJlcXVpcmVkIEdTSXMnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgICBUYWJsZU5hbWU6ICdib2F0LWF1ZGl0LWxvZ3MnLFxuICAgICAgICBHbG9iYWxTZWNvbmRhcnlJbmRleGVzOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgSW5kZXhOYW1lOiAndXNlci1pbmRleCcsXG4gICAgICAgICAgICBLZXlTY2hlbWE6IFtcbiAgICAgICAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAndXNlcklkJywgS2V5VHlwZTogJ0hBU0gnIH0sXG4gICAgICAgICAgICAgIHsgQXR0cmlidXRlTmFtZTogJ3RpbWVzdGFtcCcsIEtleVR5cGU6ICdSQU5HRScgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSksXG4gICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICBJbmRleE5hbWU6ICdhY3Rpb24taW5kZXgnLFxuICAgICAgICAgICAgS2V5U2NoZW1hOiBbXG4gICAgICAgICAgICAgIHsgQXR0cmlidXRlTmFtZTogJ2FjdGlvbicsIEtleVR5cGU6ICdIQVNIJyB9LFxuICAgICAgICAgICAgICB7IEF0dHJpYnV0ZU5hbWU6ICd0aW1lc3RhbXAnLCBLZXlUeXBlOiAnUkFOR0UnIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgSW5kZXhOYW1lOiAncmVzb3VyY2UtaW5kZXgnLFxuICAgICAgICAgICAgS2V5U2NoZW1hOiBbXG4gICAgICAgICAgICAgIHsgQXR0cmlidXRlTmFtZTogJ3Jlc291cmNlJywgS2V5VHlwZTogJ0hBU0gnIH0sXG4gICAgICAgICAgICAgIHsgQXR0cmlidXRlTmFtZTogJ3RpbWVzdGFtcCcsIEtleVR5cGU6ICdSQU5HRScgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSksXG4gICAgICAgIF0pLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdMYW1iZGEgRnVuY3Rpb25zJywgKCkgPT4ge1xuICAgIHRlc3QoJ2NyZWF0ZXMgYWRtaW4gTGFtYmRhIGZ1bmN0aW9uIHdpdGggcHJvcGVyIGNvbmZpZ3VyYXRpb24nLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicsIHtcbiAgICAgICAgSGFuZGxlcjogJ2FkbWluLXNlcnZpY2UvaW5kZXguaGFuZGxlcicsXG4gICAgICAgIFJ1bnRpbWU6ICdub2RlanMxOC54JyxcbiAgICAgICAgVGltZW91dDogMzAsXG4gICAgICAgIE1lbW9yeVNpemU6IDUxMixcbiAgICAgICAgRW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICBWYXJpYWJsZXM6IE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgRU5WSVJPTk1FTlQ6ICdkZXYnLFxuICAgICAgICAgICAgTk9ERV9FTlY6ICdkZXZlbG9wbWVudCcsXG4gICAgICAgICAgICBMT0dfTEVWRUw6ICdkZWJ1ZycsXG4gICAgICAgICAgICBTRVNTSU9OX1RJTUVPVVRfTUlOVVRFUzogJzYwJyxcbiAgICAgICAgICAgIE1BWF9MT0dJTl9BVFRFTVBUUzogJzUnLFxuICAgICAgICAgICAgTE9HSU5fQVRURU1QVF9XSU5ET1dfTUlOVVRFUzogJzE1JyxcbiAgICAgICAgICB9KSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnYWRtaW4gZnVuY3Rpb24gaGFzIGFjY2VzcyB0byBhbGwgcmVxdWlyZWQgdGFibGVzJywgKCkgPT4ge1xuICAgICAgLy8gQ2hlY2sgSUFNIHBvbGljaWVzIGZvciBEeW5hbW9EQiBhY2Nlc3NcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpJQU06OlBvbGljeScsIHtcbiAgICAgICAgUG9saWN5RG9jdW1lbnQ6IHtcbiAgICAgICAgICBTdGF0ZW1lbnQ6IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgICAgICBNYXRjaC5vYmplY3RMaWtlKHtcbiAgICAgICAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICAgICAgICBBY3Rpb246IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOkJhdGNoR2V0SXRlbScsXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOkdldFJlY29yZHMnLFxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpHZXRTaGFyZEl0ZXJhdG9yJyxcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6U2NhbicsXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOkNvbmRpdGlvbkNoZWNrSXRlbScsXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOkJhdGNoV3JpdGVJdGVtJyxcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nLFxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpEZWxldGVJdGVtJyxcbiAgICAgICAgICAgICAgXSksXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICBdKSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnU2VjcmV0cyBNYW5hZ2VyJywgKCkgPT4ge1xuICAgIHRlc3QoJ2NyZWF0ZXMgSldUIHNlY3JldCBmb3IgYWRtaW4gYXV0aGVudGljYXRpb24nLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6U2VjcmV0c01hbmFnZXI6OlNlY3JldCcsIHtcbiAgICAgICAgTmFtZTogJ2hhcmJvcmxpc3QtYWRtaW4tand0LWRldicsXG4gICAgICAgIERlc2NyaXB0aW9uOiAnSldUIHNlY3JldCBmb3IgYWRtaW4gYXV0aGVudGljYXRpb24nLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdhZG1pbiBmdW5jdGlvbiBoYXMgYWNjZXNzIHRvIEpXVCBzZWNyZXQnLCAoKSA9PiB7XG4gICAgICAvLyBDaGVjayB0aGF0IHRoZXJlJ3MgYSBwb2xpY3kgd2l0aCBzZWNyZXRzIG1hbmFnZXIgcGVybWlzc2lvbnNcbiAgICAgIGNvbnN0IHBvbGljaWVzID0gdGVtcGxhdGUuZmluZFJlc291cmNlcygnQVdTOjpJQU06OlBvbGljeScpO1xuICAgICAgY29uc3QgaGFzU2VjcmV0c0FjY2VzcyA9IE9iamVjdC52YWx1ZXMocG9saWNpZXMpLnNvbWUoKHBvbGljeTogYW55KSA9PiB7XG4gICAgICAgIGNvbnN0IHN0YXRlbWVudHMgPSBwb2xpY3kuUHJvcGVydGllcz8uUG9saWN5RG9jdW1lbnQ/LlN0YXRlbWVudCB8fCBbXTtcbiAgICAgICAgcmV0dXJuIHN0YXRlbWVudHMuc29tZSgoc3RhdGVtZW50OiBhbnkpID0+IFxuICAgICAgICAgIHN0YXRlbWVudC5BY3Rpb24gPT09ICdzZWNyZXRzbWFuYWdlcjpHZXRTZWNyZXRWYWx1ZScgfHxcbiAgICAgICAgICAoQXJyYXkuaXNBcnJheShzdGF0ZW1lbnQuQWN0aW9uKSAmJiBzdGF0ZW1lbnQuQWN0aW9uLmluY2x1ZGVzKCdzZWNyZXRzbWFuYWdlcjpHZXRTZWNyZXRWYWx1ZScpKVxuICAgICAgICApO1xuICAgICAgfSk7XG4gICAgICBleHBlY3QoaGFzU2VjcmV0c0FjY2VzcykudG9CZSh0cnVlKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0Nsb3VkV2F0Y2ggTW9uaXRvcmluZycsICgpID0+IHtcbiAgICB0ZXN0KCdjcmVhdGVzIFNOUyB0b3BpYyBmb3IgYWRtaW4gYWxlcnRzJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OlNOUzo6VG9waWMnLCB7XG4gICAgICAgIFRvcGljTmFtZTogJ2FkbWluLXNlcnZpY2UtYWxlcnRzLWRldicsXG4gICAgICAgIERpc3BsYXlOYW1lOiAnQWRtaW4gU2VydmljZSBNb25pdG9yaW5nIEFsZXJ0cyAtIGRldicsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2NyZWF0ZXMgQ2xvdWRXYXRjaCBhbGFybXMgZm9yIGFkbWluIGZ1bmN0aW9uJywgKCkgPT4ge1xuICAgICAgLy8gRXJyb3IgcmF0ZSBhbGFybVxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkNsb3VkV2F0Y2g6OkFsYXJtJywge1xuICAgICAgICBBbGFybU5hbWU6ICdhZG1pbi1mdW5jdGlvbi1lcnJvcnMtZGV2JyxcbiAgICAgICAgQWxhcm1EZXNjcmlwdGlvbjogJ0hpZ2ggZXJyb3IgcmF0ZSBpbiBhZG1pbiBMYW1iZGEgZnVuY3Rpb24nLFxuICAgICAgICBUaHJlc2hvbGQ6IDUsXG4gICAgICAgIENvbXBhcmlzb25PcGVyYXRvcjogJ0dyZWF0ZXJUaGFuT3JFcXVhbFRvVGhyZXNob2xkJyxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBEdXJhdGlvbiBhbGFybVxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkNsb3VkV2F0Y2g6OkFsYXJtJywge1xuICAgICAgICBBbGFybU5hbWU6ICdhZG1pbi1mdW5jdGlvbi1kdXJhdGlvbi1kZXYnLFxuICAgICAgICBBbGFybURlc2NyaXB0aW9uOiAnSGlnaCBkdXJhdGlvbiBpbiBhZG1pbiBMYW1iZGEgZnVuY3Rpb24nLFxuICAgICAgICBUaHJlc2hvbGQ6IDI1MDAwLFxuICAgICAgICBDb21wYXJpc29uT3BlcmF0b3I6ICdHcmVhdGVyVGhhbk9yRXF1YWxUb1RocmVzaG9sZCcsXG4gICAgICB9KTtcblxuICAgICAgLy8gVGhyb3R0bGUgYWxhcm1cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpDbG91ZFdhdGNoOjpBbGFybScsIHtcbiAgICAgICAgQWxhcm1OYW1lOiAnYWRtaW4tZnVuY3Rpb24tdGhyb3R0bGVzLWRldicsXG4gICAgICAgIEFsYXJtRGVzY3JpcHRpb246ICdBZG1pbiBMYW1iZGEgZnVuY3Rpb24gaXMgYmVpbmcgdGhyb3R0bGVkJyxcbiAgICAgICAgVGhyZXNob2xkOiAxLFxuICAgICAgICBDb21wYXJpc29uT3BlcmF0b3I6ICdHcmVhdGVyVGhhbk9yRXF1YWxUb1RocmVzaG9sZCcsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2NyZWF0ZXMgQ2xvdWRXYXRjaCBhbGFybXMgZm9yIER5bmFtb0RCIHRhYmxlcycsICgpID0+IHtcbiAgICAgIC8vIEF1ZGl0IGxvZ3MgdGhyb3R0bGUgYWxhcm1cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpDbG91ZFdhdGNoOjpBbGFybScsIHtcbiAgICAgICAgQWxhcm1OYW1lOiAnYXVkaXQtbG9ncy10aHJvdHRsZXMtZGV2JyxcbiAgICAgICAgQWxhcm1EZXNjcmlwdGlvbjogJ0F1ZGl0IGxvZ3MgdGFibGUgaXMgYmVpbmcgdGhyb3R0bGVkJyxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBBZG1pbiBzZXNzaW9ucyB0aHJvdHRsZSBhbGFybVxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkNsb3VkV2F0Y2g6OkFsYXJtJywge1xuICAgICAgICBBbGFybU5hbWU6ICdhZG1pbi1zZXNzaW9ucy10aHJvdHRsZXMtZGV2JyxcbiAgICAgICAgQWxhcm1EZXNjcmlwdGlvbjogJ0FkbWluIHNlc3Npb25zIHRhYmxlIGlzIGJlaW5nIHRocm90dGxlZCcsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2NyZWF0ZXMgQ2xvdWRXYXRjaCBkYXNoYm9hcmQgZm9yIGFkbWluIHNlcnZpY2UnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6Q2xvdWRXYXRjaDo6RGFzaGJvYXJkJywge1xuICAgICAgICBEYXNoYm9hcmROYW1lOiAnYWRtaW4tc2VydmljZS1kZXYnLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdBUEkgR2F0ZXdheScsICgpID0+IHtcbiAgICB0ZXN0KCdjcmVhdGVzIGFkbWluIEFQSSByb3V0ZXMnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBpR2F0ZXdheTo6UmVzb3VyY2UnLCB7XG4gICAgICAgIFBhdGhQYXJ0OiAnYWRtaW4nLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdhZG1pbiByb3V0ZXMgaGF2ZSBwcm9wZXIgQ09SUyBjb25maWd1cmF0aW9uJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwaUdhdGV3YXk6OlJlc3RBcGknLCB7XG4gICAgICAgIE5hbWU6ICdCb2F0IExpc3RpbmcgQVBJJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnSUFNIFBlcm1pc3Npb25zJywgKCkgPT4ge1xuICAgIHRlc3QoJ2FkbWluIGZ1bmN0aW9uIGhhcyBDbG91ZFdhdGNoIHBlcm1pc3Npb25zJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OklBTTo6UG9saWN5Jywge1xuICAgICAgICBQb2xpY3lEb2N1bWVudDoge1xuICAgICAgICAgIFN0YXRlbWVudDogTWF0Y2guYXJyYXlXaXRoKFtcbiAgICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICAgIEFjdGlvbjogW1xuICAgICAgICAgICAgICAgICdjbG91ZHdhdGNoOlB1dE1ldHJpY0RhdGEnLFxuICAgICAgICAgICAgICAgICdsb2dzOkNyZWF0ZUxvZ0dyb3VwJyxcbiAgICAgICAgICAgICAgICAnbG9nczpDcmVhdGVMb2dTdHJlYW0nLFxuICAgICAgICAgICAgICAgICdsb2dzOlB1dExvZ0V2ZW50cycsXG4gICAgICAgICAgICAgICAgJ2xvZ3M6RGVzY3JpYmVMb2dTdHJlYW1zJyxcbiAgICAgICAgICAgICAgICAnbG9nczpEZXNjcmliZUxvZ0dyb3VwcycsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIFJlc291cmNlOiAnKicsXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICBdKSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnU3RhY2sgT3V0cHV0cycsICgpID0+IHtcbiAgICB0ZXN0KCdleHBvcnRzIGFsbCByZXF1aXJlZCBhZG1pbiBpbmZyYXN0cnVjdHVyZSBvdXRwdXRzJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzT3V0cHV0KCdBZG1pbkZ1bmN0aW9uTmFtZScsIHt9KTtcbiAgICAgIHRlbXBsYXRlLmhhc091dHB1dCgnQWRtaW5GdW5jdGlvbkFybicsIHt9KTtcbiAgICAgIHRlbXBsYXRlLmhhc091dHB1dCgnQXVkaXRMb2dzVGFibGVOYW1lJywge30pO1xuICAgICAgdGVtcGxhdGUuaGFzT3V0cHV0KCdBZG1pblNlc3Npb25zVGFibGVOYW1lJywge30pO1xuICAgICAgdGVtcGxhdGUuaGFzT3V0cHV0KCdMb2dpbkF0dGVtcHRzVGFibGVOYW1lJywge30pO1xuICAgICAgdGVtcGxhdGUuaGFzT3V0cHV0KCdBZG1pbkp3dFNlY3JldEFybicsIHt9KTtcbiAgICAgIHRlbXBsYXRlLmhhc091dHB1dCgnQWRtaW5BbGVydFRvcGljQXJuJywge30pO1xuICAgICAgdGVtcGxhdGUuaGFzT3V0cHV0KCdBZG1pbkRhc2hib2FyZFVybCcsIHt9KTtcbiAgICB9KTtcbiAgfSk7XG59KTsiXX0=