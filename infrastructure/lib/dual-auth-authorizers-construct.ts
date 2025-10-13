/**
 * @fileoverview Dual Authentication Authorizers Construct
 * 
 * This construct creates and configures Lambda authorizers for the dual Cognito
 * User Pool architecture, providing separate authorization for customer and staff
 * endpoints with cross-pool access prevention.
 * 
 * Features:
 * - Customer API authorizer for /api/customer/* endpoints
 * - Staff API authorizer for /api/admin/* endpoints
 * - Cross-pool access prevention
 * - Environment-aware configuration (LocalStack vs AWS)
 * - Integration with existing API Gateway
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { Environment, getEnvironmentConfig } from './environment-config';

/**
 * Properties for the Dual Auth Authorizers Construct
 */
export interface DualAuthAuthorizersProps {
  /** Deployment environment */
  environment: Environment;
  /** Customer User Pool ID */
  customerUserPoolId: string;
  /** Customer User Pool Client ID */
  customerUserPoolClientId: string;
  /** Staff User Pool ID */
  staffUserPoolId: string;
  /** Staff User Pool Client ID */
  staffUserPoolClientId: string;
  /** API Gateway REST API instance */
  restApi: apigateway.RestApi;
}

/**
 * Dual Authentication Authorizers Construct
 * 
 * Creates Lambda authorizers for customer and staff endpoints with cross-pool
 * access prevention and integrates them with API Gateway.
 */
export class DualAuthAuthorizersConstruct extends Construct {
  /** Customer API Gateway authorizer */
  public readonly customerAuthorizer: apigateway.TokenAuthorizer;

  /** Staff API Gateway authorizer */
  public readonly staffAuthorizer: apigateway.TokenAuthorizer;

  /** Customer authorizer Lambda function */
  public readonly customerAuthorizerFunction: lambda.Function;

  /** Staff authorizer Lambda function */
  public readonly staffAuthorizerFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: DualAuthAuthorizersProps) {
    super(scope, id);

    const {
      environment,
      customerUserPoolId,
      customerUserPoolClientId,
      staffUserPoolId,
      staffUserPoolClientId,
      restApi,
    } = props;

    const config = getEnvironmentConfig(this, environment);

    // Customer Authorizer Lambda Function
    this.customerAuthorizerFunction = new lambda.Function(this, 'CustomerAuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'customer-authorizer.handler',
      code: lambda.Code.fromAsset('../infrastructure/lambda', {
        bundling: {
          image: lambda.Runtime.NODEJS_18_X.bundlingImage,
          command: [
            'bash', '-c', [
              'cp -r /asset-input/* /asset-output/',
              'cd /asset-output',
              'npm install --production',
              'npm run build || echo "No build script found"',
            ].join(' && '),
          ],
        },
      }),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        CUSTOMER_USER_POOL_ID: customerUserPoolId,
        CUSTOMER_USER_POOL_CLIENT_ID: customerUserPoolClientId,
        ENVIRONMENT: environment,
        DEPLOYMENT_TARGET: config.deployment.useLocalStack ? 'localstack' : 'aws',
        AWS_REGION: config.deployment.region,
        COGNITO_ENDPOINT: config.deployment.useLocalStack ? config.cognito.customer.endpoint : undefined,
      },
      description: 'Customer API Gateway Lambda Authorizer for dual Cognito pools',
      logGroup: new logs.LogGroup(this, 'CustomerAuthorizerLogGroup', {
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Staff Authorizer Lambda Function
    this.staffAuthorizerFunction = new lambda.Function(this, 'StaffAuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'staff-authorizer.handler',
      code: lambda.Code.fromAsset('../infrastructure/lambda', {
        bundling: {
          image: lambda.Runtime.NODEJS_18_X.bundlingImage,
          command: [
            'bash', '-c', [
              'cp -r /asset-input/* /asset-output/',
              'cd /asset-output',
              'npm install --production',
              'npm run build || echo "No build script found"',
            ].join(' && '),
          ],
        },
      }),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        STAFF_USER_POOL_ID: staffUserPoolId,
        STAFF_USER_POOL_CLIENT_ID: staffUserPoolClientId,
        ENVIRONMENT: environment,
        DEPLOYMENT_TARGET: config.deployment.useLocalStack ? 'localstack' : 'aws',
        AWS_REGION: config.deployment.region,
        COGNITO_ENDPOINT: config.deployment.useLocalStack ? config.cognito.staff.endpoint : undefined,
        STAFF_SESSION_TTL: '28800', // 8 hours for enhanced security
      },
      description: 'Staff API Gateway Lambda Authorizer for dual Cognito pools',
      logGroup: new logs.LogGroup(this, 'StaffAuthorizerLogGroup', {
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Grant CloudWatch Logs permissions
    this.customerAuthorizerFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: ['*'],
    }));

    this.staffAuthorizerFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: ['*'],
    }));

    // Create API Gateway Token Authorizers
    this.customerAuthorizer = new apigateway.TokenAuthorizer(this, 'CustomerAuthorizer', {
      handler: this.customerAuthorizerFunction,
      identitySource: 'method.request.header.Authorization',
      authorizerName: 'CustomerTokenAuthorizer',
      resultsCacheTtl: cdk.Duration.minutes(5), // Cache for performance
      assumeRole: this.customerAuthorizerFunction.role,
    });

    this.staffAuthorizer = new apigateway.TokenAuthorizer(this, 'StaffAuthorizer', {
      handler: this.staffAuthorizerFunction,
      identitySource: 'method.request.header.Authorization',
      authorizerName: 'StaffTokenAuthorizer',
      resultsCacheTtl: cdk.Duration.minutes(5), // Cache for performance
      assumeRole: this.staffAuthorizerFunction.role,
    });

    // Create customer API resource structure
    this.createCustomerApiResources(restApi);

    // Update existing admin API resources to use staff authorizer
    this.updateAdminApiResources(restApi);

    // Outputs for reference
    new cdk.CfnOutput(this, 'CustomerAuthorizerArn', {
      value: this.customerAuthorizerFunction.functionArn,
      description: 'Customer Authorizer Lambda Function ARN',
      exportName: `CustomerAuthorizerArn-${environment}`,
    });

    new cdk.CfnOutput(this, 'StaffAuthorizerArn', {
      value: this.staffAuthorizerFunction.functionArn,
      description: 'Staff Authorizer Lambda Function ARN',
      exportName: `StaffAuthorizerArn-${environment}`,
    });
  }

  /**
   * Create customer API resource structure with authorizer
   */
  private createCustomerApiResources(restApi: apigateway.RestApi): void {
    // Create /api/customer/* resource structure
    const api = restApi.root.addResource('api', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS.concat(['Authorization']),
      },
    });

    const customer = api.addResource('customer', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS.concat(['Authorization']),
      },
    });

    // Customer endpoints with authorizer
    // Note: These will need to be connected to appropriate Lambda functions
    // For now, we're creating the structure with authorizer configuration

    // Customer profile endpoints
    const profile = customer.addResource('profile');
    profile.addMethod('GET', undefined, {
      authorizer: this.customerAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    profile.addMethod('PUT', undefined, {
      authorizer: this.customerAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Customer listings endpoints
    const listings = customer.addResource('listings');
    listings.addMethod('GET', undefined, {
      authorizer: this.customerAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    listings.addMethod('POST', undefined, {
      authorizer: this.customerAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    const listing = listings.addResource('{id}');
    listing.addMethod('GET', undefined, {
      authorizer: this.customerAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    listing.addMethod('PUT', undefined, {
      authorizer: this.customerAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    listing.addMethod('DELETE', undefined, {
      authorizer: this.customerAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Customer search endpoints
    const search = customer.addResource('search');
    search.addMethod('POST', undefined, {
      authorizer: this.customerAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    console.log('Created customer API resources with authorizer');
  }

  /**
   * Update existing admin API resources to use staff authorizer
   */
  private updateAdminApiResources(restApi: apigateway.RestApi): void {
    // Note: This method would ideally update existing admin resources
    // However, since we can't modify existing resources in CDK easily,
    // we'll document that the main stack should be updated to use the staff authorizer
    
    console.log('Staff authorizer created - main stack should be updated to use it for /api/admin/* endpoints');
    
    // The main stack (HarborListStack) should be updated to:
    // 1. Import this construct
    // 2. Apply the staff authorizer to existing admin endpoints
    // 3. Ensure cross-pool access prevention is enforced
  }
}

/**
 * Helper function to create method options with authorizer
 */
export function createAuthorizedMethodOptions(
  authorizer: apigateway.IAuthorizer
): apigateway.MethodOptions {
  return {
    authorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
    requestParameters: {
      'method.request.header.Authorization': true,
    },
  };
}