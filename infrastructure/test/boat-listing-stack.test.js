"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = require("aws-cdk-lib");
const assertions_1 = require("aws-cdk-lib/assertions");
const boat_listing_stack_1 = require("../lib/boat-listing-stack");
describe('BoatListingStack', () => {
    let app;
    let stack;
    let template;
    beforeEach(() => {
        app = new cdk.App();
        stack = new boat_listing_stack_1.BoatListingStack(app, 'TestStack', {
            environment: 'dev',
            alertEmail: 'test@example.com',
        });
        template = assertions_1.Template.fromStack(stack);
    });
    describe('DynamoDB Tables', () => {
        test('creates all required DynamoDB tables', () => {
            // Check for main tables
            template.hasResourceProperties('AWS::DynamoDB::Table', {
                TableName: 'boat-listings',
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
                Name: 'boat-listing-admin-jwt-dev',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9hdC1saXN0aW5nLXN0YWNrLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJib2F0LWxpc3Rpbmctc3RhY2sudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG1DQUFtQztBQUNuQyx1REFBeUQ7QUFDekQsa0VBQTZEO0FBRTdELFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsSUFBSSxHQUFZLENBQUM7SUFDakIsSUFBSSxLQUF1QixDQUFDO0lBQzVCLElBQUksUUFBa0IsQ0FBQztJQUV2QixVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLEtBQUssR0FBRyxJQUFJLHFDQUFnQixDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUU7WUFDN0MsV0FBVyxFQUFFLEtBQUs7WUFDbEIsVUFBVSxFQUFFLGtCQUFrQjtTQUMvQixDQUFDLENBQUM7UUFDSCxRQUFRLEdBQUcscUJBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdkMsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1FBQy9CLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7WUFDaEQsd0JBQXdCO1lBQ3hCLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxzQkFBc0IsRUFBRTtnQkFDckQsU0FBUyxFQUFFLGVBQWU7YUFDM0IsQ0FBQyxDQUFDO1lBRUgsUUFBUSxDQUFDLHFCQUFxQixDQUFDLHNCQUFzQixFQUFFO2dCQUNyRCxTQUFTLEVBQUUsWUFBWTthQUN4QixDQUFDLENBQUM7WUFFSCxrQ0FBa0M7WUFDbEMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLHNCQUFzQixFQUFFO2dCQUNyRCxTQUFTLEVBQUUsaUJBQWlCO2FBQzdCLENBQUMsQ0FBQztZQUVILFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxzQkFBc0IsRUFB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QUFvQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzdDLFFBQVEsQ0FBQyxTQUFTLENBQUMsd0JBQXdCLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDakQsUUFBUSxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNqRCxRQUFRLENBQUMsU0FBUyxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzVDLFFBQVEsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDN0MsUUFBUSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM5QyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgVGVtcGxhdGUsIE1hdGNoIH0gZnJvbSAnYXdzLWNkay1saWIvYXNzZXJ0aW9ucyc7XG5pbXBvcnQgeyBCb2F0TGlzdGluZ1N0YWNrIH0gZnJvbSAnLi4vbGliL2JvYXQtbGlzdGluZy1zdGFjayc7XG5cbmRlc2NyaWJlKCdCb2F0TGlzdGluZ1N0YWNrJywgKCkgPT4ge1xuICBsZXQgYXBwOiBjZGsuQXBwO1xuICBsZXQgc3RhY2s6IEJvYXRMaXN0aW5nU3RhY2s7XG4gIGxldCB0ZW1wbGF0ZTogVGVtcGxhdGU7XG5cbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgYXBwID0gbmV3IGNkay5BcHAoKTtcbiAgICBzdGFjayA9IG5ldyBCb2F0TGlzdGluZ1N0YWNrKGFwcCwgJ1Rlc3RTdGFjaycsIHtcbiAgICAgIGVudmlyb25tZW50OiAnZGV2JyxcbiAgICAgIGFsZXJ0RW1haWw6ICd0ZXN0QGV4YW1wbGUuY29tJyxcbiAgICB9KTtcbiAgICB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdEeW5hbW9EQiBUYWJsZXMnLCAoKSA9PiB7XG4gICAgdGVzdCgnY3JlYXRlcyBhbGwgcmVxdWlyZWQgRHluYW1vREIgdGFibGVzJywgKCkgPT4ge1xuICAgICAgLy8gQ2hlY2sgZm9yIG1haW4gdGFibGVzXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgICBUYWJsZU5hbWU6ICdib2F0LWxpc3RpbmdzJyxcbiAgICAgIH0pO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgICBUYWJsZU5hbWU6ICdib2F0LXVzZXJzJyxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBDaGVjayBmb3IgYWRtaW4tc3BlY2lmaWMgdGFibGVzXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgICBUYWJsZU5hbWU6ICdib2F0LWF1ZGl0LWxvZ3MnLFxuICAgICAgfSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCB7XG4gICAgICAgIFRhYmxlTmFtZTogJ2JvYXQtYWRtaW4tc2Vzc2lvbnMnLFxuICAgICAgfSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCB7XG4gICAgICAgIFRhYmxlTmFtZTogJ2JvYXQtbG9naW4tYXR0ZW1wdHMnLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdhdWRpdCBsb2dzIHRhYmxlIGhhcyBwcm9wZXIgVFRMIGNvbmZpZ3VyYXRpb24nLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgICBUYWJsZU5hbWU6ICdib2F0LWF1ZGl0LWxvZ3MnLFxuICAgICAgICBUaW1lVG9MaXZlU3BlY2lmaWNhdGlvbjoge1xuICAgICAgICAgIEF0dHJpYnV0ZU5hbWU6ICd0dGwnLFxuICAgICAgICAgIEVuYWJsZWQ6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2FkbWluIHNlc3Npb25zIHRhYmxlIGhhcyBwcm9wZXIgVFRMIGNvbmZpZ3VyYXRpb24nLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgICBUYWJsZU5hbWU6ICdib2F0LWFkbWluLXNlc3Npb25zJyxcbiAgICAgICAgVGltZVRvTGl2ZVNwZWNpZmljYXRpb246IHtcbiAgICAgICAgICBBdHRyaWJ1dGVOYW1lOiAnZXhwaXJlc0F0JyxcbiAgICAgICAgICBFbmFibGVkOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdsb2dpbiBhdHRlbXB0cyB0YWJsZSBoYXMgcHJvcGVyIFRUTCBjb25maWd1cmF0aW9uJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcbiAgICAgICAgVGFibGVOYW1lOiAnYm9hdC1sb2dpbi1hdHRlbXB0cycsXG4gICAgICAgIFRpbWVUb0xpdmVTcGVjaWZpY2F0aW9uOiB7XG4gICAgICAgICAgQXR0cmlidXRlTmFtZTogJ3R0bCcsXG4gICAgICAgICAgRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnYXVkaXQgbG9ncyB0YWJsZSBoYXMgcmVxdWlyZWQgR1NJcycsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCB7XG4gICAgICAgIFRhYmxlTmFtZTogJ2JvYXQtYXVkaXQtbG9ncycsXG4gICAgICAgIEdsb2JhbFNlY29uZGFyeUluZGV4ZXM6IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICBJbmRleE5hbWU6ICd1c2VyLWluZGV4JyxcbiAgICAgICAgICAgIEtleVNjaGVtYTogW1xuICAgICAgICAgICAgICB7IEF0dHJpYnV0ZU5hbWU6ICd1c2VySWQnLCBLZXlUeXBlOiAnSEFTSCcgfSxcbiAgICAgICAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAndGltZXN0YW1wJywgS2V5VHlwZTogJ1JBTkdFJyB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBNYXRjaC5vYmplY3RMaWtlKHtcbiAgICAgICAgICAgIEluZGV4TmFtZTogJ2FjdGlvbi1pbmRleCcsXG4gICAgICAgICAgICBLZXlTY2hlbWE6IFtcbiAgICAgICAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAnYWN0aW9uJywgS2V5VHlwZTogJ0hBU0gnIH0sXG4gICAgICAgICAgICAgIHsgQXR0cmlidXRlTmFtZTogJ3RpbWVzdGFtcCcsIEtleVR5cGU6ICdSQU5HRScgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSksXG4gICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICBJbmRleE5hbWU6ICdyZXNvdXJjZS1pbmRleCcsXG4gICAgICAgICAgICBLZXlTY2hlbWE6IFtcbiAgICAgICAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAncmVzb3VyY2UnLCBLZXlUeXBlOiAnSEFTSCcgfSxcbiAgICAgICAgICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAndGltZXN0YW1wJywgS2V5VHlwZTogJ1JBTkdFJyB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgXSksXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0xhbWJkYSBGdW5jdGlvbnMnLCAoKSA9PiB7XG4gICAgdGVzdCgnY3JlYXRlcyBhZG1pbiBMYW1iZGEgZnVuY3Rpb24gd2l0aCBwcm9wZXIgY29uZmlndXJhdGlvbicsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJywge1xuICAgICAgICBIYW5kbGVyOiAnYWRtaW4tc2VydmljZS9pbmRleC5oYW5kbGVyJyxcbiAgICAgICAgUnVudGltZTogJ25vZGVqczE4LngnLFxuICAgICAgICBUaW1lb3V0OiAzMCxcbiAgICAgICAgTWVtb3J5U2l6ZTogNTEyLFxuICAgICAgICBFbnZpcm9ubWVudDoge1xuICAgICAgICAgIFZhcmlhYmxlczogTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICBFTlZJUk9OTUVOVDogJ2RldicsXG4gICAgICAgICAgICBOT0RFX0VOVjogJ2RldmVsb3BtZW50JyxcbiAgICAgICAgICAgIExPR19MRVZFTDogJ2RlYnVnJyxcbiAgICAgICAgICAgIFNFU1NJT05fVElNRU9VVF9NSU5VVEVTOiAnNjAnLFxuICAgICAgICAgICAgTUFYX0xPR0lOX0FUVEVNUFRTOiAnNScsXG4gICAgICAgICAgICBMT0dJTl9BVFRFTVBUX1dJTkRPV19NSU5VVEVTOiAnMTUnLFxuICAgICAgICAgIH0pLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdhZG1pbiBmdW5jdGlvbiBoYXMgYWNjZXNzIHRvIGFsbCByZXF1aXJlZCB0YWJsZXMnLCAoKSA9PiB7XG4gICAgICAvLyBDaGVjayBJQU0gcG9saWNpZXMgZm9yIER5bmFtb0RCIGFjY2Vzc1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OklBTTo6UG9saWN5Jywge1xuICAgICAgICBQb2xpY3lEb2N1bWVudDoge1xuICAgICAgICAgIFN0YXRlbWVudDogTWF0Y2guYXJyYXlXaXRoKFtcbiAgICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICAgIEFjdGlvbjogTWF0Y2guYXJyYXlXaXRoKFtcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6QmF0Y2hHZXRJdGVtJyxcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6R2V0UmVjb3JkcycsXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOkdldFNoYXJkSXRlcmF0b3InLFxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpRdWVyeScsXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOkdldEl0ZW0nLFxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpTY2FuJyxcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6Q29uZGl0aW9uQ2hlY2tJdGVtJyxcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6QmF0Y2hXcml0ZUl0ZW0nLFxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpQdXRJdGVtJyxcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOkRlbGV0ZUl0ZW0nLFxuICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgIF0pLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdTZWNyZXRzIE1hbmFnZXInLCAoKSA9PiB7XG4gICAgdGVzdCgnY3JlYXRlcyBKV1Qgc2VjcmV0IGZvciBhZG1pbiBhdXRoZW50aWNhdGlvbicsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpTZWNyZXRzTWFuYWdlcjo6U2VjcmV0Jywge1xuICAgICAgICBOYW1lOiAnYm9hdC1saXN0aW5nLWFkbWluLWp3dC1kZXYnLFxuICAgICAgICBEZXNjcmlwdGlvbjogJ0pXVCBzZWNyZXQgZm9yIGFkbWluIGF1dGhlbnRpY2F0aW9uJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnYWRtaW4gZnVuY3Rpb24gaGFzIGFjY2VzcyB0byBKV1Qgc2VjcmV0JywgKCkgPT4ge1xuICAgICAgLy8gQ2hlY2sgdGhhdCB0aGVyZSdzIGEgcG9saWN5IHdpdGggc2VjcmV0cyBtYW5hZ2VyIHBlcm1pc3Npb25zXG4gICAgICBjb25zdCBwb2xpY2llcyA9IHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMoJ0FXUzo6SUFNOjpQb2xpY3knKTtcbiAgICAgIGNvbnN0IGhhc1NlY3JldHNBY2Nlc3MgPSBPYmplY3QudmFsdWVzKHBvbGljaWVzKS5zb21lKChwb2xpY3k6IGFueSkgPT4ge1xuICAgICAgICBjb25zdCBzdGF0ZW1lbnRzID0gcG9saWN5LlByb3BlcnRpZXM/LlBvbGljeURvY3VtZW50Py5TdGF0ZW1lbnQgfHwgW107XG4gICAgICAgIHJldHVybiBzdGF0ZW1lbnRzLnNvbWUoKHN0YXRlbWVudDogYW55KSA9PiBcbiAgICAgICAgICBzdGF0ZW1lbnQuQWN0aW9uID09PSAnc2VjcmV0c21hbmFnZXI6R2V0U2VjcmV0VmFsdWUnIHx8XG4gICAgICAgICAgKEFycmF5LmlzQXJyYXkoc3RhdGVtZW50LkFjdGlvbikgJiYgc3RhdGVtZW50LkFjdGlvbi5pbmNsdWRlcygnc2VjcmV0c21hbmFnZXI6R2V0U2VjcmV0VmFsdWUnKSlcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuICAgICAgZXhwZWN0KGhhc1NlY3JldHNBY2Nlc3MpLnRvQmUodHJ1ZSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdDbG91ZFdhdGNoIE1vbml0b3JpbmcnLCAoKSA9PiB7XG4gICAgdGVzdCgnY3JlYXRlcyBTTlMgdG9waWMgZm9yIGFkbWluIGFsZXJ0cycsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpTTlM6OlRvcGljJywge1xuICAgICAgICBUb3BpY05hbWU6ICdhZG1pbi1zZXJ2aWNlLWFsZXJ0cy1kZXYnLFxuICAgICAgICBEaXNwbGF5TmFtZTogJ0FkbWluIFNlcnZpY2UgTW9uaXRvcmluZyBBbGVydHMgLSBkZXYnLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjcmVhdGVzIENsb3VkV2F0Y2ggYWxhcm1zIGZvciBhZG1pbiBmdW5jdGlvbicsICgpID0+IHtcbiAgICAgIC8vIEVycm9yIHJhdGUgYWxhcm1cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpDbG91ZFdhdGNoOjpBbGFybScsIHtcbiAgICAgICAgQWxhcm1OYW1lOiAnYWRtaW4tZnVuY3Rpb24tZXJyb3JzLWRldicsXG4gICAgICAgIEFsYXJtRGVzY3JpcHRpb246ICdIaWdoIGVycm9yIHJhdGUgaW4gYWRtaW4gTGFtYmRhIGZ1bmN0aW9uJyxcbiAgICAgICAgVGhyZXNob2xkOiA1LFxuICAgICAgICBDb21wYXJpc29uT3BlcmF0b3I6ICdHcmVhdGVyVGhhbk9yRXF1YWxUb1RocmVzaG9sZCcsXG4gICAgICB9KTtcblxuICAgICAgLy8gRHVyYXRpb24gYWxhcm1cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpDbG91ZFdhdGNoOjpBbGFybScsIHtcbiAgICAgICAgQWxhcm1OYW1lOiAnYWRtaW4tZnVuY3Rpb24tZHVyYXRpb24tZGV2JyxcbiAgICAgICAgQWxhcm1EZXNjcmlwdGlvbjogJ0hpZ2ggZHVyYXRpb24gaW4gYWRtaW4gTGFtYmRhIGZ1bmN0aW9uJyxcbiAgICAgICAgVGhyZXNob2xkOiAyNTAwMCxcbiAgICAgICAgQ29tcGFyaXNvbk9wZXJhdG9yOiAnR3JlYXRlclRoYW5PckVxdWFsVG9UaHJlc2hvbGQnLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFRocm90dGxlIGFsYXJtXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6Q2xvdWRXYXRjaDo6QWxhcm0nLCB7XG4gICAgICAgIEFsYXJtTmFtZTogJ2FkbWluLWZ1bmN0aW9uLXRocm90dGxlcy1kZXYnLFxuICAgICAgICBBbGFybURlc2NyaXB0aW9uOiAnQWRtaW4gTGFtYmRhIGZ1bmN0aW9uIGlzIGJlaW5nIHRocm90dGxlZCcsXG4gICAgICAgIFRocmVzaG9sZDogMSxcbiAgICAgICAgQ29tcGFyaXNvbk9wZXJhdG9yOiAnR3JlYXRlclRoYW5PckVxdWFsVG9UaHJlc2hvbGQnLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjcmVhdGVzIENsb3VkV2F0Y2ggYWxhcm1zIGZvciBEeW5hbW9EQiB0YWJsZXMnLCAoKSA9PiB7XG4gICAgICAvLyBBdWRpdCBsb2dzIHRocm90dGxlIGFsYXJtXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6Q2xvdWRXYXRjaDo6QWxhcm0nLCB7XG4gICAgICAgIEFsYXJtTmFtZTogJ2F1ZGl0LWxvZ3MtdGhyb3R0bGVzLWRldicsXG4gICAgICAgIEFsYXJtRGVzY3JpcHRpb246ICdBdWRpdCBsb2dzIHRhYmxlIGlzIGJlaW5nIHRocm90dGxlZCcsXG4gICAgICB9KTtcblxuICAgICAgLy8gQWRtaW4gc2Vzc2lvbnMgdGhyb3R0bGUgYWxhcm1cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpDbG91ZFdhdGNoOjpBbGFybScsIHtcbiAgICAgICAgQWxhcm1OYW1lOiAnYWRtaW4tc2Vzc2lvbnMtdGhyb3R0bGVzLWRldicsXG4gICAgICAgIEFsYXJtRGVzY3JpcHRpb246ICdBZG1pbiBzZXNzaW9ucyB0YWJsZSBpcyBiZWluZyB0aHJvdHRsZWQnLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjcmVhdGVzIENsb3VkV2F0Y2ggZGFzaGJvYXJkIGZvciBhZG1pbiBzZXJ2aWNlJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkNsb3VkV2F0Y2g6OkRhc2hib2FyZCcsIHtcbiAgICAgICAgRGFzaGJvYXJkTmFtZTogJ2FkbWluLXNlcnZpY2UtZGV2JyxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnQVBJIEdhdGV3YXknLCAoKSA9PiB7XG4gICAgdGVzdCgnY3JlYXRlcyBhZG1pbiBBUEkgcm91dGVzJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwaUdhdGV3YXk6OlJlc291cmNlJywge1xuICAgICAgICBQYXRoUGFydDogJ2FkbWluJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnYWRtaW4gcm91dGVzIGhhdmUgcHJvcGVyIENPUlMgY29uZmlndXJhdGlvbicsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpBcGlHYXRld2F5OjpSZXN0QXBpJywge1xuICAgICAgICBOYW1lOiAnQm9hdCBMaXN0aW5nIEFQSScsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0lBTSBQZXJtaXNzaW9ucycsICgpID0+IHtcbiAgICB0ZXN0KCdhZG1pbiBmdW5jdGlvbiBoYXMgQ2xvdWRXYXRjaCBwZXJtaXNzaW9ucycsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpJQU06OlBvbGljeScsIHtcbiAgICAgICAgUG9saWN5RG9jdW1lbnQ6IHtcbiAgICAgICAgICBTdGF0ZW1lbnQ6IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgICAgICBNYXRjaC5vYmplY3RMaWtlKHtcbiAgICAgICAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICAgICAgICBBY3Rpb246IFtcbiAgICAgICAgICAgICAgICAnY2xvdWR3YXRjaDpQdXRNZXRyaWNEYXRhJyxcbiAgICAgICAgICAgICAgICAnbG9nczpDcmVhdGVMb2dHcm91cCcsXG4gICAgICAgICAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJyxcbiAgICAgICAgICAgICAgICAnbG9nczpQdXRMb2dFdmVudHMnLFxuICAgICAgICAgICAgICAgICdsb2dzOkRlc2NyaWJlTG9nU3RyZWFtcycsXG4gICAgICAgICAgICAgICAgJ2xvZ3M6RGVzY3JpYmVMb2dHcm91cHMnLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICBSZXNvdXJjZTogJyonLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgXSksXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1N0YWNrIE91dHB1dHMnLCAoKSA9PiB7XG4gICAgdGVzdCgnZXhwb3J0cyBhbGwgcmVxdWlyZWQgYWRtaW4gaW5mcmFzdHJ1Y3R1cmUgb3V0cHV0cycsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc091dHB1dCgnQWRtaW5GdW5jdGlvbk5hbWUnLCB7fSk7XG4gICAgICB0ZW1wbGF0ZS5oYXNPdXRwdXQoJ0FkbWluRnVuY3Rpb25Bcm4nLCB7fSk7XG4gICAgICB0ZW1wbGF0ZS5oYXNPdXRwdXQoJ0F1ZGl0TG9nc1RhYmxlTmFtZScsIHt9KTtcbiAgICAgIHRlbXBsYXRlLmhhc091dHB1dCgnQWRtaW5TZXNzaW9uc1RhYmxlTmFtZScsIHt9KTtcbiAgICAgIHRlbXBsYXRlLmhhc091dHB1dCgnTG9naW5BdHRlbXB0c1RhYmxlTmFtZScsIHt9KTtcbiAgICAgIHRlbXBsYXRlLmhhc091dHB1dCgnQWRtaW5Kd3RTZWNyZXRBcm4nLCB7fSk7XG4gICAgICB0ZW1wbGF0ZS5oYXNPdXRwdXQoJ0FkbWluQWxlcnRUb3BpY0FybicsIHt9KTtcbiAgICAgIHRlbXBsYXRlLmhhc091dHB1dCgnQWRtaW5EYXNoYm9hcmRVcmwnLCB7fSk7XG4gICAgfSk7XG4gIH0pO1xufSk7Il19