/**
 * @fileoverview Main CDK stack for HarborList boat marketplace infrastructure.
 * 
 * This stack defines the complete serverless infrastructure for the boat marketplace
 * platform including:
 * 
 * Core Infrastructure:
 * - DynamoDB tables for data persistence with GSI indexes
 * - S3 buckets for media storage and static website hosting
 * - Lambda functions for serverless compute
 * - API Gateway for RESTful API endpoints
 * - CloudWatch monitoring and alerting
 * 
 * Security & Authentication:
 * - JWT-based authentication with AWS Secrets Manager
 * - IAM roles and policies with least privilege access
 * - Audit logging for compliance and security monitoring
 * - Session management with automatic expiration
 * 
 * Networking & CDN:
 * - Direct S3 website hosting with public access
 * - Custom domain support with SSL certificates
 * - CORS configuration for cross-origin requests
 * 
 * Monitoring & Observability:
 * - CloudWatch dashboards for operational metrics
 * - SNS alerts for critical system events
 * - Performance monitoring and error tracking
 * - Security event monitoring and alerting
 * 
 * Environment Support:
 * - Multi-environment deployment (dev/staging/prod)
 * - Environment-specific configuration
 * - Resource naming conventions
 * - Automated deployment pipelines
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
// Cloudflare security construct removed - using standard security instead
import { StandardSecurityConstruct } from './standard-security-construct';

/**
 * Stack properties interface for HarborList boat marketplace infrastructure
 * 
 * Defines the configuration options available when deploying the stack
 * including environment settings, domain configuration, and operational
 * notification preferences.
 * 
 * @interface HarborListStackProps
 * @extends cdk.StackProps
 */
interface HarborListStackProps extends cdk.StackProps {
  /** Deployment environment (local/dev/staging/prod) */
  environment: 'local' | 'dev' | 'staging' | 'prod';
  /** Custom domain name for frontend (e.g., app.harborlist.com) */
  domainName?: string;
  /** Custom domain name for API (e.g., api.harborlist.com) */
  apiDomainName?: string;
  /** Email address for operational alerts and notifications */
  alertEmail?: string;
}

/**
 * Main CDK stack class for HarborList boat marketplace infrastructure
 * 
 * Creates and configures all AWS resources required for the serverless
 * boat marketplace platform including data storage, compute functions,
 * API endpoints, monitoring, and security components.
 * 
 * Architecture Overview:
 * - Frontend: React SPA hosted on S3 with direct public access
 * - Backend: Node.js Lambda functions with API Gateway
 * - Database: DynamoDB with optimized GSI indexes
 * - Storage: S3 for media files and static assets
 * - Security: JWT authentication with MFA support
 * - Monitoring: CloudWatch metrics, alarms, and dashboards
 * 
 * @class HarborListStack
 * @extends cdk.Stack
 */
export class HarborListStack extends cdk.Stack {
  /**
   * Constructs the HarborList boat marketplace infrastructure stack
   * 
   * @param scope - The parent construct (typically an App)
   * @param id - Unique identifier for this stack
   * @param props - Stack configuration properties
   */
  constructor(scope: Construct, id: string, props: HarborListStackProps) {
    super(scope, id, props);

    const { environment, domainName, apiDomainName, alertEmail } = props;

    // SSL Certificate - imported from ACM
    let certificate: certificatemanager.ICertificate | undefined;
    
    if (domainName && apiDomainName) {
      certificate = certificatemanager.Certificate.fromCertificateArn(
        this, 'SSLCertificate', 
        'arn:aws:acm:us-east-1:676032292155:certificate/93fe820b-e1bc-445c-8ab2-5a994cd95ed7'
      );
    }

    // DynamoDB Tables
    // Listings table
    const listingsTable = new dynamodb.Table(this, 'ListingsTable', {
      tableName: 'harborlist-listings',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    });

    listingsTable.addGlobalSecondaryIndex({
      indexName: 'location-index',
      partitionKey: { name: 'location', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'harborlist-users',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Email lookup index
    usersTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    });

    // User type index for filtering customer vs staff users with sort by creation date
    usersTable.addGlobalSecondaryIndex({
      indexName: 'UserTypeIndex',
      partitionKey: { name: 'userType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // Parent dealer index for dealer sub-account queries
    usersTable.addGlobalSecondaryIndex({
      indexName: 'ParentDealerIndex',
      partitionKey: { name: 'parentDealerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // Premium expiration index for managing premium account expirations
    usersTable.addGlobalSecondaryIndex({
      indexName: 'PremiumExpirationIndex',
      partitionKey: { name: 'premiumActive', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'premiumExpiresAt', type: dynamodb.AttributeType.NUMBER },
    });

    // Audit Logs Table
    const auditLogsTable = new dynamodb.Table(this, 'AuditLogsTable', {
      tableName: 'harborlist-audit-logs',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl', // For automatic cleanup of old logs
    });

    // GSI for querying by user
    auditLogsTable.addGlobalSecondaryIndex({
      indexName: 'user-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // GSI for querying by action
    auditLogsTable.addGlobalSecondaryIndex({
      indexName: 'action-index',
      partitionKey: { name: 'action', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // GSI for querying by resource
    auditLogsTable.addGlobalSecondaryIndex({
      indexName: 'resource-index',
      partitionKey: { name: 'resource', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // Admin Sessions Table
    const adminSessionsTable = new dynamodb.Table(this, 'AdminSessionsTable', {
      tableName: 'harborlist-admin-sessions',
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'expiresAt',
    });

    adminSessionsTable.addGlobalSecondaryIndex({
      indexName: 'user-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lastActivity', type: dynamodb.AttributeType.STRING },
    });

    // Engines Table for multi-engine boat support
    const enginesTable = new dynamodb.Table(this, 'EnginesTable', {
      tableName: 'harborlist-engines',
      partitionKey: { name: 'engineId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    });

    enginesTable.addGlobalSecondaryIndex({
      indexName: 'listing-index',
      partitionKey: { name: 'listingId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'position', type: dynamodb.AttributeType.NUMBER },
    });

    // Billing Accounts Table
    const billingAccountsTable = new dynamodb.Table(this, 'BillingAccountsTable', {
      tableName: 'harborlist-billing-accounts',
      partitionKey: { name: 'billingId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    });

    billingAccountsTable.addGlobalSecondaryIndex({
      indexName: 'user-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });

    billingAccountsTable.addGlobalSecondaryIndex({
      indexName: 'subscription-index',
      partitionKey: { name: 'subscriptionId', type: dynamodb.AttributeType.STRING },
    });

    // Transactions Table
    const transactionsTable = new dynamodb.Table(this, 'TransactionsTable', {
      tableName: 'harborlist-transactions',
      partitionKey: { name: 'transactionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    });

    transactionsTable.addGlobalSecondaryIndex({
      indexName: 'user-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    transactionsTable.addGlobalSecondaryIndex({
      indexName: 'status-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    transactionsTable.addGlobalSecondaryIndex({
      indexName: 'type-index',
      partitionKey: { name: 'type', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // Finance Calculations Table
    const financeCalculationsTable = new dynamodb.Table(this, 'FinanceCalculationsTable', {
      tableName: 'harborlist-finance-calculations',
      partitionKey: { name: 'calculationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    financeCalculationsTable.addGlobalSecondaryIndex({
      indexName: 'listing-index',
      partitionKey: { name: 'listingId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    financeCalculationsTable.addGlobalSecondaryIndex({
      indexName: 'user-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    financeCalculationsTable.addGlobalSecondaryIndex({
      indexName: 'share-token-index',
      partitionKey: { name: 'shareToken', type: dynamodb.AttributeType.STRING },
    });

    // Moderation Queue Table
    const moderationQueueTable = new dynamodb.Table(this, 'ModerationQueueTable', {
      tableName: 'harborlist-moderation-queue',
      partitionKey: { name: 'queueId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'submittedAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    moderationQueueTable.addGlobalSecondaryIndex({
      indexName: 'listing-index',
      partitionKey: { name: 'listingId', type: dynamodb.AttributeType.STRING },
    });

    moderationQueueTable.addGlobalSecondaryIndex({
      indexName: 'status-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'priority', type: dynamodb.AttributeType.STRING },
    });

    moderationQueueTable.addGlobalSecondaryIndex({
      indexName: 'assigned-index',
      partitionKey: { name: 'assignedTo', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'submittedAt', type: dynamodb.AttributeType.STRING },
    });

    // User Groups Table for enhanced user management
    const userGroupsTable = new dynamodb.Table(this, 'UserGroupsTable', {
      tableName: 'harborlist-user-groups',
      partitionKey: { name: 'groupId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    userGroupsTable.addGlobalSecondaryIndex({
      indexName: 'name-index',
      partitionKey: { name: 'name', type: dynamodb.AttributeType.STRING },
    });

    // Login Attempts Table
    const loginAttemptsTable = new dynamodb.Table(this, 'LoginAttemptsTable', {
      tableName: 'harborlist-login-attempts',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    loginAttemptsTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    loginAttemptsTable.addGlobalSecondaryIndex({
      indexName: 'ip-index',
      partitionKey: { name: 'ipAddress', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // Platform Settings Table - stores system-wide configuration
    const platformSettingsTable = new dynamodb.Table(this, 'PlatformSettingsTable', {
      tableName: 'harborlist-platform-settings',
      partitionKey: { name: 'settingKey', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    });

    // Support Tickets Table - stores customer support requests
    const supportTicketsTable = new dynamodb.Table(this, 'SupportTicketsTable', {
      tableName: 'harborlist-support-tickets',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // GSI for querying tickets by user
    supportTicketsTable.addGlobalSecondaryIndex({
      indexName: 'user-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
    });

    // GSI for querying tickets by status
    supportTicketsTable.addGlobalSecondaryIndex({
      indexName: 'status-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
    });

    // Announcements Table - stores platform announcements
    const announcementsTable = new dynamodb.Table(this, 'AnnouncementsTable', {
      tableName: 'harborlist-announcements',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // GSI for querying announcements by status
    announcementsTable.addGlobalSecondaryIndex({
      indexName: 'status-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
    });

    // S3 Buckets
    const mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: `harborlist-media-${this.account}`,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Frontend S3 Bucket configured for website hosting with custom domain
    // Using S3 website endpoint + Cloudflare Flexible SSL for user-facing HTTPS
    const frontendBucketName = domainName || `harborlist-frontend-${this.account}`;
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: frontendBucketName,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPA routing support
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      cors: [{
        allowedMethods: [s3.HttpMethods.GET],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
      publicReadAccess: true, // Enable public read access
    });

    // Note: S3 bucket policies are now managed by StandardSecurityConstruct

    // OpenSearch Collection (commented out for initial deployment)
    // const searchCollection = new opensearch.CfnCollection(this, 'SearchCollection', {
    //   name: 'harborlist-listings',
    //   type: 'SEARCH',
    // });

    // JWT Secret for authentication - Environment-conditional approach
    // For local development: use hardcoded secrets (no AWS costs)
    // For dev/staging/prod: use AWS Secrets Manager (secure)
    const jwtSecret = environment === 'local' 
      ? undefined // Skip creating Secrets Manager for local development
      : new secretsmanager.Secret(this, 'AdminJwtSecret', {
          secretName: `harborlist-admin-jwt-${environment}`,
          description: 'JWT secret for authentication services',
          generateSecretString: {
            secretStringTemplate: JSON.stringify({ username: 'admin' }),
            generateStringKey: 'password',
            passwordLength: 32,
            excludeCharacters: '"@/\\',
          },
        });

    // JWT Configuration helper function
    const getJwtConfig = () => {
      if (environment === 'local') {
        return {
          JWT_SECRET: 'local-dev-secret-harborlist-2025',
          JWT_SECRET_ARN: '',
        };
      } else {
        return {
          JWT_SECRET: '', // Empty - will retrieve from Secrets Manager at runtime
          JWT_SECRET_ARN: jwtSecret?.secretArn || '',
        };
      }
    };

    const jwtConfig = getJwtConfig();

    // Lambda Functions
    const authFunction = new lambda.Function(this, 'AuthFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'auth-service/index.handler',
      code: lambda.Code.fromAsset('../backend/dist/packages/auth-service.zip'),
      environment: {
        USERS_TABLE: usersTable.tableName,
        JWT_SECRET: jwtConfig.JWT_SECRET,
        JWT_SECRET_ARN: jwtConfig.JWT_SECRET_ARN,
        SESSIONS_TABLE: adminSessionsTable.tableName,
        AUDIT_LOGS_TABLE: auditLogsTable.tableName,
        LOGIN_ATTEMPTS_TABLE: loginAttemptsTable.tableName,
        ENVIRONMENT: environment,
        DEPLOYMENT_TARGET: 'aws',
      },
    });

    const listingFunction = new lambda.Function(this, 'ListingFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'listing/index.handler',
      code: lambda.Code.fromAsset('../backend/dist/packages/listing.zip'),
      environment: {
        LISTINGS_TABLE: listingsTable.tableName,
        USERS_TABLE: usersTable.tableName,
        ENGINES_TABLE: enginesTable.tableName,
        MODERATION_QUEUE_TABLE: moderationQueueTable.tableName,
        JWT_SECRET: jwtConfig.JWT_SECRET,
        JWT_SECRET_ARN: jwtConfig.JWT_SECRET_ARN,
        ENVIRONMENT: environment,
        DEPLOYMENT_TARGET: 'aws',
      },
    });

    const searchFunction = new lambda.Function(this, 'SearchFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'search/index.handler',
      code: lambda.Code.fromAsset('../backend/dist/packages/search.zip'),
      environment: {
        LISTINGS_TABLE: listingsTable.tableName,
        USERS_TABLE: usersTable.tableName,
        ENVIRONMENT: environment,
        DEPLOYMENT_TARGET: 'aws',
        // OPENSEARCH_ENDPOINT: searchCollection.attrCollectionEndpoint, // Commented out
      },
    });

    const mediaFunction = new lambda.Function(this, 'MediaFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'media/index.handler',
      code: lambda.Code.fromAsset('../backend/dist/packages/media.zip'),
      environment: {
        MEDIA_BUCKET: mediaBucket.bucketName,
        THUMBNAILS_BUCKET: mediaBucket.bucketName, // Using same bucket for thumbnails
        ENVIRONMENT: environment,
        DEPLOYMENT_TARGET: 'aws',
      },
    });

    const emailFunction = new lambda.Function(this, 'EmailFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'email/index.handler',
      code: lambda.Code.fromAsset('../backend/dist/packages/email.zip'),
      environment: {
        ENVIRONMENT: environment,
        DEPLOYMENT_TARGET: 'aws',
      },
    });

    const statsFunction = new lambda.Function(this, 'StatsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'stats-service/index.handler',
      code: lambda.Code.fromAsset('../backend/dist/packages/stats-service.zip'),
      environment: {
        LISTINGS_TABLE: listingsTable.tableName,
        USERS_TABLE: usersTable.tableName,
        REVIEWS_TABLE: 'harborlist-reviews', // This table will be created later when we add reviews
        ENVIRONMENT: environment,
        DEPLOYMENT_TARGET: 'aws',
      },
    });

    // Admin Service Lambda Function
    const adminFunction = new lambda.Function(this, 'AdminFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'admin-service/index.handler',
      code: lambda.Code.fromAsset('../backend/dist/packages/admin-service.zip'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        LISTINGS_TABLE: listingsTable.tableName,
        USERS_TABLE: usersTable.tableName,
        AUDIT_LOGS_TABLE: auditLogsTable.tableName,
        ADMIN_SESSIONS_TABLE: adminSessionsTable.tableName,
        LOGIN_ATTEMPTS_TABLE: loginAttemptsTable.tableName,
        ENGINES_TABLE: enginesTable.tableName,
        BILLING_ACCOUNTS_TABLE: billingAccountsTable.tableName,
        TRANSACTIONS_TABLE: transactionsTable.tableName,
        FINANCE_CALCULATIONS_TABLE: financeCalculationsTable.tableName,
        MODERATION_QUEUE_TABLE: moderationQueueTable.tableName,
        USER_GROUPS_TABLE: userGroupsTable.tableName,
        PLATFORM_SETTINGS_TABLE: platformSettingsTable.tableName,
        SUPPORT_TICKETS_TABLE: supportTicketsTable.tableName,
        ANNOUNCEMENTS_TABLE: announcementsTable.tableName,
        JWT_SECRET: jwtConfig.JWT_SECRET,
        JWT_SECRET_ARN: jwtConfig.JWT_SECRET_ARN,
        ENVIRONMENT: environment,
        DEPLOYMENT_TARGET: 'aws',
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
        LOG_LEVEL: environment === 'prod' ? 'warn' : 'debug',
        SESSION_TIMEOUT_MINUTES: '60',
        MAX_LOGIN_ATTEMPTS: '5',
        LOGIN_ATTEMPT_WINDOW_MINUTES: '15',
      },
    });

    // Billing Service Lambda Function
    const billingFunction = new lambda.Function(this, 'BillingFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'billing-service/index.handler',
      code: lambda.Code.fromAsset('../backend/dist/packages/billing-service.zip'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        USERS_TABLE: usersTable.tableName,
        BILLING_ACCOUNTS_TABLE: billingAccountsTable.tableName,
        TRANSACTIONS_TABLE: transactionsTable.tableName,
        JWT_SECRET: jwtConfig.JWT_SECRET,
        JWT_SECRET_ARN: jwtConfig.JWT_SECRET_ARN,
        ENVIRONMENT: environment,
        DEPLOYMENT_TARGET: 'aws',
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
        LOG_LEVEL: environment === 'prod' ? 'warn' : 'debug',
        // Payment processor configuration
        STRIPE_SECRET_KEY: '', // Will be set via environment variables or secrets
        STRIPE_WEBHOOK_SECRET: '', // Will be set via environment variables or secrets
        PAYPAL_CLIENT_ID: '', // Will be set via environment variables or secrets
        PAYPAL_CLIENT_SECRET: '', // Will be set via environment variables or secrets
        PAYMENT_PROCESSOR: 'stripe', // Default processor
      },
    });

    // Finance Service Lambda Function
    const financeFunction = new lambda.Function(this, 'FinanceFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'finance-service/index.handler',
      code: lambda.Code.fromAsset('../backend/dist/packages/finance-service.zip'),
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      environment: {
        LISTINGS_TABLE: listingsTable.tableName,
        USERS_TABLE: usersTable.tableName,
        FINANCE_CALCULATIONS_TABLE: financeCalculationsTable.tableName,
        JWT_SECRET: jwtConfig.JWT_SECRET,
        JWT_SECRET_ARN: jwtConfig.JWT_SECRET_ARN,
        ENVIRONMENT: environment,
        DEPLOYMENT_TARGET: 'aws',
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
        LOG_LEVEL: environment === 'prod' ? 'warn' : 'debug',
      },
    });

    // Permissions
    usersTable.grantReadWriteData(authFunction);
    listingsTable.grantReadWriteData(listingFunction);
    usersTable.grantReadWriteData(listingFunction);
    listingsTable.grantReadData(searchFunction); // Grant read access for search

    // Grant additional scan permission for search function
    searchFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Scan'],
      resources: [listingsTable.tableArn],
    }));

    mediaBucket.grantReadWrite(mediaFunction);

    // Grant permissions for OpenSearch (commented out)
    // searchFunction.addToRolePolicy(new iam.PolicyStatement({
    //   actions: ['aoss:APIAccessAll'],
    //   resources: [searchCollection.attrArn],
    // }));

    emailFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));

    // Grant stats function read access to all tables
    listingsTable.grantReadData(statsFunction);
    usersTable.grantReadData(statsFunction);

    // Grant scan permissions for stats aggregation
    statsFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Scan'],
      resources: [listingsTable.tableArn, usersTable.tableArn],
    }));

    // Grant admin function full access to all tables
    listingsTable.grantReadWriteData(adminFunction);
    usersTable.grantReadWriteData(adminFunction);
    auditLogsTable.grantReadWriteData(adminFunction);
    adminSessionsTable.grantReadWriteData(adminFunction);
    loginAttemptsTable.grantReadWriteData(adminFunction);
    enginesTable.grantReadWriteData(adminFunction);
    billingAccountsTable.grantReadWriteData(adminFunction);
    transactionsTable.grantReadWriteData(adminFunction);
    financeCalculationsTable.grantReadWriteData(adminFunction);
    moderationQueueTable.grantReadWriteData(adminFunction);
    userGroupsTable.grantReadWriteData(adminFunction);
    platformSettingsTable.grantReadWriteData(adminFunction);
    supportTicketsTable.grantReadWriteData(adminFunction);
    announcementsTable.grantReadWriteData(adminFunction);

    // Grant admin function scan permissions
    adminFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Scan'],
      resources: [
        listingsTable.tableArn, 
        usersTable.tableArn,
        auditLogsTable.tableArn,
        `${auditLogsTable.tableArn}/index/*`,
        adminSessionsTable.tableArn,
        `${adminSessionsTable.tableArn}/index/*`,
        loginAttemptsTable.tableArn,
        `${loginAttemptsTable.tableArn}/index/*`,
        enginesTable.tableArn,
        `${enginesTable.tableArn}/index/*`,
        billingAccountsTable.tableArn,
        `${billingAccountsTable.tableArn}/index/*`,
        transactionsTable.tableArn,
        `${transactionsTable.tableArn}/index/*`,
        financeCalculationsTable.tableArn,
        `${financeCalculationsTable.tableArn}/index/*`,
        moderationQueueTable.tableArn,
        `${moderationQueueTable.tableArn}/index/*`,
        userGroupsTable.tableArn,
        `${userGroupsTable.tableArn}/index/*`
      ],
    }));

    // Grant billing function access to billing-related tables
    usersTable.grantReadWriteData(billingFunction);
    billingAccountsTable.grantReadWriteData(billingFunction);
    transactionsTable.grantReadWriteData(billingFunction);
    auditLogsTable.grantReadWriteData(billingFunction);

    // Grant billing function scan permissions
    billingFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Scan'],
      resources: [
        billingAccountsTable.tableArn,
        `${billingAccountsTable.tableArn}/index/*`,
        transactionsTable.tableArn,
        `${transactionsTable.tableArn}/index/*`
      ],
    }));

    // Grant finance function access to finance-related tables
    listingsTable.grantReadData(financeFunction);
    usersTable.grantReadData(financeFunction);
    financeCalculationsTable.grantReadWriteData(financeFunction);

    // Grant finance function scan permissions
    financeFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Scan'],
      resources: [
        financeCalculationsTable.tableArn,
        `${financeCalculationsTable.tableArn}/index/*`
      ],
    }));

    // Grant listing function access to new tables for enhanced features
    enginesTable.grantReadWriteData(listingFunction);
    moderationQueueTable.grantReadWriteData(listingFunction);

    listingFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Scan'],
      resources: [
        enginesTable.tableArn,
        `${enginesTable.tableArn}/index/*`,
        moderationQueueTable.tableArn,
        `${moderationQueueTable.tableArn}/index/*`
      ],
    }));

    // Grant Lambda functions access to JWT secret (only for non-local environments)
    if (jwtSecret) {
      jwtSecret.grantRead(adminFunction);
      jwtSecret.grantRead(authFunction);
      jwtSecret.grantRead(listingFunction);
      jwtSecret.grantRead(billingFunction);
      jwtSecret.grantRead(financeFunction);
    }

    // Grant auth function access to tables
    auditLogsTable.grantReadWriteData(authFunction);
    adminSessionsTable.grantReadWriteData(authFunction);
    loginAttemptsTable.grantReadWriteData(authFunction);

    // Grant admin function CloudWatch permissions for metrics and logging
    adminFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'cloudwatch:PutMetricData',
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogStreams',
        'logs:DescribeLogGroups'
      ],
      resources: ['*'],
    }));

    // API Gateway
    const api = new apigateway.RestApi(this, 'BoatListingApi', {
      restApiName: 'Boat Listing API',
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Amz-User-Agent'
        ],
        allowCredentials: false,
        maxAge: cdk.Duration.seconds(86400), // 24 hours
      },
    });

    const listings = api.root.addResource('listings', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS.concat(['Authorization']),
      }
    });
    listings.addMethod('GET', new apigateway.LambdaIntegration(listingFunction));
    listings.addMethod('POST', new apigateway.LambdaIntegration(listingFunction));

    const listing = listings.addResource('{id}');
    listing.addMethod('GET', new apigateway.LambdaIntegration(listingFunction));
    listing.addMethod('PUT', new apigateway.LambdaIntegration(listingFunction));
    listing.addMethod('DELETE', new apigateway.LambdaIntegration(listingFunction));

    const search = api.root.addResource('search', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS.concat(['Authorization']),
      }
    });
    search.addMethod('POST', new apigateway.LambdaIntegration(searchFunction));

    const media = api.root.addResource('media');
    media.addMethod('POST', new apigateway.LambdaIntegration(mediaFunction));

    const email = api.root.addResource('email');
    email.addMethod('POST', new apigateway.LambdaIntegration(emailFunction));

    const stats = api.root.addResource('stats');
    const platform = stats.addResource('platform');
    platform.addMethod('GET', new apigateway.LambdaIntegration(statsFunction));

    const auth = api.root.addResource('auth');
    const login = auth.addResource('login');
    login.addMethod('POST', new apigateway.LambdaIntegration(authFunction));
    const register = auth.addResource('register');
    register.addMethod('POST', new apigateway.LambdaIntegration(authFunction));
    
    // Admin auth routes
    const adminAuth = auth.addResource('admin');
    const adminLogin = adminAuth.addResource('login');
    adminLogin.addMethod('POST', new apigateway.LambdaIntegration(authFunction));
    
    // Other auth routes
    const refresh = auth.addResource('refresh');
    refresh.addMethod('POST', new apigateway.LambdaIntegration(authFunction));
    const logout = auth.addResource('logout');
    logout.addMethod('POST', new apigateway.LambdaIntegration(authFunction));

    // Health endpoint
    const health = api.root.addResource('health', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      }
    });
    health.addMethod('GET', new apigateway.LambdaIntegration(authFunction));

    // Admin API routes
    const admin = api.root.addResource('admin');
    admin.addMethod('GET', new apigateway.LambdaIntegration(adminFunction));
    admin.addMethod('POST', new apigateway.LambdaIntegration(adminFunction));
    admin.addMethod('PUT', new apigateway.LambdaIntegration(adminFunction));
    admin.addMethod('DELETE', new apigateway.LambdaIntegration(adminFunction));

    const adminProxy = admin.addResource('{proxy+}');
    adminProxy.addMethod('ANY', new apigateway.LambdaIntegration(adminFunction));

    // Billing API routes
    const billing = api.root.addResource('billing', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS.concat(['Authorization']),
      }
    });
    billing.addMethod('GET', new apigateway.LambdaIntegration(billingFunction));
    billing.addMethod('POST', new apigateway.LambdaIntegration(billingFunction));
    billing.addMethod('PUT', new apigateway.LambdaIntegration(billingFunction));
    billing.addMethod('DELETE', new apigateway.LambdaIntegration(billingFunction));

    const billingProxy = billing.addResource('{proxy+}');
    billingProxy.addMethod('ANY', new apigateway.LambdaIntegration(billingFunction));

    // Finance API routes
    const finance = api.root.addResource('finance', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS.concat(['Authorization']),
      }
    });
    finance.addMethod('GET', new apigateway.LambdaIntegration(financeFunction));
    finance.addMethod('POST', new apigateway.LambdaIntegration(financeFunction));
    finance.addMethod('PUT', new apigateway.LambdaIntegration(financeFunction));
    finance.addMethod('DELETE', new apigateway.LambdaIntegration(financeFunction));

    const financeProxy = finance.addResource('{proxy+}');
    financeProxy.addMethod('ANY', new apigateway.LambdaIntegration(financeFunction));

    // Enhanced listing routes for multi-engine support
    const engines = listings.addResource('engines');
    engines.addMethod('GET', new apigateway.LambdaIntegration(listingFunction));
    engines.addMethod('POST', new apigateway.LambdaIntegration(listingFunction));
    engines.addMethod('PUT', new apigateway.LambdaIntegration(listingFunction));
    engines.addMethod('DELETE', new apigateway.LambdaIntegration(listingFunction));

    // Moderation API routes
    const moderation = api.root.addResource('moderation', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS.concat(['Authorization']),
      }
    });
    moderation.addMethod('GET', new apigateway.LambdaIntegration(adminFunction));
    moderation.addMethod('POST', new apigateway.LambdaIntegration(adminFunction));
    moderation.addMethod('PUT', new apigateway.LambdaIntegration(adminFunction));

    const moderationProxy = moderation.addResource('{proxy+}');
    moderationProxy.addMethod('ANY', new apigateway.LambdaIntegration(adminFunction));



    // API Gateway Custom Domain with SSL Certificate
    let apiDomainNameResource: apigateway.DomainName | undefined;
    
    if (certificate && apiDomainName) {
      apiDomainNameResource = new apigateway.DomainName(this, 'ApiDomainName', {
        domainName: apiDomainName,
        certificate: certificate,
        endpointType: apigateway.EndpointType.REGIONAL,
      });

      new apigateway.BasePathMapping(this, 'ApiBasePathMapping', {
        domainName: apiDomainNameResource,
        restApi: api,
      });
    }



    // DNS Records - managed externally
    // Point your DNS to the S3 website endpoint and API Gateway URL

    // Deploy frontend build to S3 website hosting
    new s3deploy.BucketDeployment(this, 'FrontendDeployment', {
      sources: [s3deploy.Source.asset('../frontend/dist')],
      destinationBucket: frontendBucket,
    });

    // Standard Security Integration
    // Implements basic security controls with public access
    const standardSecurityConstruct = new StandardSecurityConstruct(this, 'StandardSecurity', {
      environment: environment,
      frontendBucket: frontendBucket,
      restApi: api,
    });

    // Using direct S3 website + Cloudflare Flexible SSL
    // No CloudFront needed - Cloudflare handles HTTPS termination

    // Admin Service Monitoring
    const adminAlertTopic = new sns.Topic(this, 'AdminServiceAlerts', {
      topicName: `admin-service-alerts-${environment}`,
      displayName: `Admin Service Monitoring Alerts - ${environment}`,
    });

    if (alertEmail) {
      adminAlertTopic.addSubscription(
        new subscriptions.EmailSubscription(alertEmail)
      );
    }

    // Admin Function Error Rate Alarm
    const adminErrorAlarm = new cloudwatch.Alarm(this, 'AdminFunctionErrorAlarm', {
      alarmName: `admin-function-errors-${environment}`,
      alarmDescription: 'High error rate in admin Lambda function',
      metric: adminFunction.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 5,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    adminErrorAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(adminAlertTopic)
    );

    // Admin Function Duration Alarm
    const adminDurationAlarm = new cloudwatch.Alarm(this, 'AdminFunctionDurationAlarm', {
      alarmName: `admin-function-duration-${environment}`,
      alarmDescription: 'High duration in admin Lambda function',
      metric: adminFunction.metricDuration({
        period: cdk.Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 25000, // 25 seconds (close to 30s timeout)
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    adminDurationAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(adminAlertTopic)
    );

    // Admin Function Throttle Alarm
    const adminThrottleAlarm = new cloudwatch.Alarm(this, 'AdminFunctionThrottleAlarm', {
      alarmName: `admin-function-throttles-${environment}`,
      alarmDescription: 'Admin Lambda function is being throttled',
      metric: adminFunction.metricThrottles({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    adminThrottleAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(adminAlertTopic)
    );

    // DynamoDB Table Throttle Alarms for Admin Tables
    const auditLogsThrottleAlarm = new cloudwatch.Alarm(this, 'AuditLogsThrottleAlarm', {
      alarmName: `audit-logs-throttles-${environment}`,
      alarmDescription: 'Audit logs table is being throttled',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'ThrottledRequests',
        dimensionsMap: {
          TableName: auditLogsTable.tableName,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    auditLogsThrottleAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(adminAlertTopic)
    );

    const adminSessionsThrottleAlarm = new cloudwatch.Alarm(this, 'AdminSessionsThrottleAlarm', {
      alarmName: `admin-sessions-throttles-${environment}`,
      alarmDescription: 'Admin sessions table is being throttled',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'ThrottledRequests',
        dimensionsMap: {
          TableName: adminSessionsTable.tableName,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    adminSessionsThrottleAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(adminAlertTopic)
    );

    // Admin Dashboard for monitoring
    const adminDashboard = new cloudwatch.Dashboard(this, 'AdminServiceDashboard', {
      dashboardName: `admin-service-${environment}`,
    });

    adminDashboard.addWidgets(
      // Lambda function metrics
      new cloudwatch.GraphWidget({
        title: 'Admin Function Performance',
        left: [
          adminFunction.metricInvocations({
            period: cdk.Duration.minutes(5),
            statistic: 'Sum',
            label: 'Invocations',
          }),
          adminFunction.metricErrors({
            period: cdk.Duration.minutes(5),
            statistic: 'Sum',
            label: 'Errors',
          }),
        ],
        right: [
          adminFunction.metricDuration({
            period: cdk.Duration.minutes(5),
            statistic: 'Average',
            label: 'Duration (ms)',
          }),
        ],
        width: 12,
        height: 6,
      }),

      // DynamoDB metrics for admin tables
      new cloudwatch.GraphWidget({
        title: 'Admin Tables Performance',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedReadCapacityUnits',
            dimensionsMap: {
              TableName: auditLogsTable.tableName,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Audit Logs Read',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedWriteCapacityUnits',
            dimensionsMap: {
              TableName: auditLogsTable.tableName,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Audit Logs Write',
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedReadCapacityUnits',
            dimensionsMap: {
              TableName: adminSessionsTable.tableName,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Sessions Read',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedWriteCapacityUnits',
            dimensionsMap: {
              TableName: adminSessionsTable.tableName,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Sessions Write',
          }),
        ],
        width: 12,
        height: 6,
      }),

      // Security monitoring
      new cloudwatch.GraphWidget({
        title: 'Security Metrics',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ItemCount',
            dimensionsMap: {
              TableName: loginAttemptsTable.tableName,
            },
            statistic: 'Average',
            period: cdk.Duration.minutes(15),
            label: 'Login Attempts',
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ItemCount',
            dimensionsMap: {
              TableName: adminSessionsTable.tableName,
            },
            statistic: 'Average',
            period: cdk.Duration.minutes(15),
            label: 'Active Sessions',
          }),
        ],
        width: 12,
        height: 6,
      })
    );

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: apiDomainNameResource ? `https://${apiDomainName}` : api.url,
      description: 'API Gateway URL',
    });

    if (apiDomainNameResource && domainName) {
      new cdk.CfnOutput(this, 'FrontendUrl', {
        value: `https://${domainName}`,
        description: 'Frontend URL (custom domain)',
      });
      
      new cdk.CfnOutput(this, 'CustomApiUrl', {
        value: `https://${apiDomainName}`,
        description: 'Custom API Gateway URL',
      });
    }

    new cdk.CfnOutput(this, 'S3WebsiteUrl', {
      value: frontendBucket.bucketWebsiteUrl,
      description: 'S3 Website URL (proxied through Cloudflare with Flexible SSL)',
    });

    new cdk.CfnOutput(this, 'MediaBucketName', {
      value: mediaBucket.bucketName,
      description: 'S3 Media Bucket Name',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 Frontend Bucket Name',
    });

    // Admin Infrastructure Outputs
    new cdk.CfnOutput(this, 'AdminFunctionName', {
      value: adminFunction.functionName,
      description: 'Admin Lambda Function Name',
    });

    new cdk.CfnOutput(this, 'AdminFunctionArn', {
      value: adminFunction.functionArn,
      description: 'Admin Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'AuditLogsTableName', {
      value: auditLogsTable.tableName,
      description: 'Audit Logs DynamoDB Table Name',
    });

    new cdk.CfnOutput(this, 'AdminSessionsTableName', {
      value: adminSessionsTable.tableName,
      description: 'Admin Sessions DynamoDB Table Name',
    });

    new cdk.CfnOutput(this, 'LoginAttemptsTableName', {
      value: loginAttemptsTable.tableName,
      description: 'Login Attempts DynamoDB Table Name',
    });

    // JWT Secret ARN output (only for non-local environments)
    if (jwtSecret) {
      new cdk.CfnOutput(this, 'AdminJwtSecretArn', {
        value: jwtSecret.secretArn,
        description: 'Admin JWT Secret ARN',
      });
    }

    new cdk.CfnOutput(this, 'AdminAlertTopicArn', {
      value: adminAlertTopic.topicArn,
      description: 'Admin Service Alert Topic ARN',
    });

    new cdk.CfnOutput(this, 'AdminDashboardUrl', {
      value: `https://${cdk.Stack.of(this).region}.console.aws.amazon.com/cloudwatch/home?region=${cdk.Stack.of(this).region}#dashboards:name=${adminDashboard.dashboardName}`,
      description: 'Admin Service CloudWatch Dashboard URL',
    });

    // Security outputs now handled by StandardSecurityConstruct
  }
}
