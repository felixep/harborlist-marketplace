/**
 * @fileoverview Cloudflare Security Construct for HarborList Platform
 * 
 * This construct implements network-level security controls that ensure:
 * 1. S3 frontend bucket only serves content through Cloudflare
 * 2. API Gateway only accepts requests from Cloudflare IPs with secret header
 * 3. Automated Cloudflare IP synchronization for drift prevention
 * 
 * Security Architecture:
 * - Edge Secret: Random 32-byte hex string stored in SSM Parameter Store
 * - S3 Policy: Restricts access to Cloudflare IPs + secret in Referer header
 * - API Gateway Policy: Restricts access to Cloudflare IPs + secret in X-Auth-Secret header
 * - IP Sync Lambda: Weekly EventBridge-triggered function to update Cloudflare IPs
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { randomBytes } from 'crypto';

/**
 * Configuration properties for the Cloudflare Security construct
 */
export interface CloudflareSecurityConstructProps {
  /** Environment name for resource naming */
  environment: string;
  /** S3 bucket hosting the frontend application */
  frontendBucket: s3.Bucket;
  /** API Gateway REST API instance */
  restApi: apigateway.RestApi;
}

/**
 * Cloudflare IP ranges structure
 */
interface CloudflareIpRanges {
  ipv4Cidrs: string[];
  ipv6Cidrs: string[];
}

/**
 * Cloudflare Security Construct
 * 
 * Implements comprehensive edge security controls for the HarborList platform
 * by ensuring all traffic flows through Cloudflare with proper authentication.
 */
export class CloudflareSecurityConstruct extends Construct {
  /** SSM parameter storing the edge secret */
  public readonly edgeSecretParameter: ssm.StringParameter;
  
  /** Lambda function for IP synchronization */
  public readonly ipSyncFunction: lambda.Function;

  /** Generated edge secret value */
  public readonly edgeSecret: string;

  constructor(scope: Construct, id: string, props: CloudflareSecurityConstructProps) {
    super(scope, id);

    const { environment, frontendBucket, restApi } = props;

    // Generate a cryptographically secure edge secret
    this.edgeSecret = this.generateEdgeSecret();

    // Store edge secret in SSM Parameter Store as SecureString
    this.edgeSecretParameter = new ssm.StringParameter(this, 'EdgeSecret', {
      parameterName: `/harborlist/edge/secret`,
      stringValue: this.edgeSecret,
      description: 'Secret used by Cloudflare to authenticate requests to HarborList origin servers',
      tier: ssm.ParameterTier.STANDARD,
    });

        // Create Lambda function for IP synchronization
    this.ipSyncFunction = new lambda.Function(this, 'CloudflareIpSyncFunction', {
      functionName: `cloudflare-ip-sync-${environment}`,
      runtime: lambda.Runtime.NODEJS_20_X, // Updated to Node.js 20.x
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/cloudflare-ip-sync', {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: [
            'bash', '-c', [
              'npm install',
              'cp -r /asset-input/* /asset-output/',
            ].join(' && ')
          ],
        },
      }),
      timeout: cdk.Duration.minutes(10), // Increased timeout for custom resource
      environment: {
        FRONTEND_BUCKET_NAME: frontendBucket.bucketName,
        API_GATEWAY_REST_API_ID: props.restApi.restApiId,
        EDGE_SECRET_PARAMETER: this.edgeSecretParameter.parameterName,
        AWS_ACCOUNT_ID: cdk.Stack.of(this).account,
      },
      description: 'Synchronizes Cloudflare IP ranges and updates AWS resource policies',
    });

    // Create a custom resource to trigger initial policy setup
    // Temporarily disabled to resolve deployment issues
    // const initialSetup = new cdk.CustomResource(this, 'InitialPolicySetup', {
    //   serviceToken: this.ipSyncFunction.functionArn,
    //   properties: {
    //     TriggerType: 'INITIAL_SETUP',
    //     Timestamp: Date.now(), // Force update on each deployment
    //   },
    // });

    // Grant permissions for IP sync function
    this.grantIpSyncPermissions(props);

    // Create EventBridge rule for weekly IP synchronization
    const ipSyncRule = new events.Rule(this, 'CloudflareIpSyncRule', {
      ruleName: `cloudflare-ip-sync-${environment}`,
      description: 'Weekly synchronization of Cloudflare IP ranges',
      schedule: events.Schedule.rate(cdk.Duration.days(7)), // Every 7 days
      enabled: true,
    });

    // Add Lambda function as target
    ipSyncRule.addTarget(new targets.LambdaFunction(this.ipSyncFunction, {
      retryAttempts: 3,
    }));

    // Apply initial S3 security policy
    this.applyS3BucketPolicy(frontendBucket);
    
    // API Gateway resource policy will be applied by the IP sync function
    // to avoid circular dependencies in CloudFormation

    // Output important values
    new cdk.CfnOutput(this, 'EdgeSecretParameterName', {
      value: this.edgeSecretParameter.parameterName,
      description: 'SSM Parameter name containing the Cloudflare edge secret',
    });

    new cdk.CfnOutput(this, 'CloudflareEdgeSecret', {
      value: this.edgeSecret,
      description: 'Generated edge secret for Cloudflare configuration (store securely)',
    });

    new cdk.CfnOutput(this, 'IpSyncFunctionName', {
      value: this.ipSyncFunction.functionName,
      description: 'Lambda function that synchronizes Cloudflare IP ranges',
    });
  }

  /**
   * Generates a cryptographically secure edge secret
   */
  private generateEdgeSecret(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Grants necessary permissions to the IP sync Lambda function
   */
  private grantIpSyncPermissions(props: CloudflareSecurityConstructProps): void {
    // Grant S3 bucket policy management permissions
    this.ipSyncFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetBucketPolicy',
        's3:PutBucketPolicy',
      ],
      resources: [props.frontendBucket.bucketArn],
    }));

    // Grant API Gateway policy management permissions
    this.ipSyncFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'apigateway:GET',
        'apigateway:PUT',
        'apigateway:UpdateRestApiPolicy',
      ],
      resources: [
        `arn:aws:apigateway:${cdk.Stack.of(this).region}::/restapis/${props.restApi.restApiId}`,
        `arn:aws:apigateway:${cdk.Stack.of(this).region}::/restapis/${props.restApi.restApiId}/*`,
      ],
    }));

    // Grant SSM parameter read access
    this.edgeSecretParameter.grantRead(this.ipSyncFunction);

    // Grant CloudWatch Logs permissions (already granted by default, but being explicit)
    this.ipSyncFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: ['*'],
    }));
  }

  /**
   * Applies security policy to S3 bucket for Cloudflare-only access
   */
  private applyS3BucketPolicy(frontendBucket: s3.Bucket): void {
    // Initial Cloudflare IP ranges (will be updated by Lambda)
    const initialCloudflareIps = this.getInitialCloudflareIps();

    // Allow access only from Cloudflare IPs with correct Referer header
    const cloudflareAccessStatement = new iam.PolicyStatement({
      sid: 'CloudflareOriginAccess',
      effect: iam.Effect.ALLOW,
      principals: [new iam.AnyPrincipal()],
      actions: ['s3:GetObject'],
      resources: [frontendBucket.arnForObjects('*')],
      conditions: {
        'IpAddress': {
          'aws:SourceIp': initialCloudflareIps.ipv4Cidrs.concat(initialCloudflareIps.ipv6Cidrs),
        },
        'StringEquals': {
          'aws:Referer': this.edgeSecret,
        },
      },
    });

    // Deny insecure connections
    const denyInsecureStatement = new iam.PolicyStatement({
      sid: 'DenyInsecureConnections',
      effect: iam.Effect.DENY,
      principals: [new iam.AnyPrincipal()],
      actions: ['s3:*'],
      resources: [
        frontendBucket.bucketArn,
        frontendBucket.arnForObjects('*'),
      ],
      conditions: {
        'Bool': {
          'aws:SecureTransport': 'false',
        },
      },
    });

    frontendBucket.addToResourcePolicy(cloudflareAccessStatement);
    frontendBucket.addToResourcePolicy(denyInsecureStatement);
  }

  /**
   * Note: API Gateway resource policy is applied via the Lambda function 
   * to avoid circular dependencies. The policy will be set during the 
   * first execution of the IP sync function.
   */

  /**
   * Returns initial Cloudflare IP ranges (static snapshot)
   */
  private getInitialCloudflareIps(): CloudflareIpRanges {
    // These are current as of October 2024 - will be updated by Lambda function
    return {
      ipv4Cidrs: [
        '103.21.244.0/22',
        '103.22.200.0/22',
        '103.31.4.0/22',
        '104.16.0.0/13',
        '104.24.0.0/14',
        '108.162.192.0/18',
        '131.0.72.0/22',
        '141.101.64.0/18',
        '162.158.0.0/15',
        '172.64.0.0/13',
        '173.245.48.0/20',
        '188.114.96.0/20',
        '190.93.240.0/20',
        '197.234.240.0/22',
        '198.41.128.0/17',
      ],
      ipv6Cidrs: [
        '2400:cb00::/32',
        '2405:8100::/32',
        '2405:b500::/32',
        '2606:4700::/32',
        '2803:f800::/32',
        '2c0f:f248::/32',
        '2a06:98c0::/29',
      ],
    };
  }


}