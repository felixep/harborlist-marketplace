/**
 * @fileoverview Customer Authentication Stack for AWS Cognito User Pool
 * 
 * This stack creates and configures the Customer User Pool for the HarborList
 * boat marketplace, supporting Individual, Dealer, and Premium customer tiers
 * with appropriate security settings and group-based permissions.
 * 
 * Features:
 * - Customer User Pool with email-based authentication
 * - Customer Groups for tier management (Individual, Dealer, Premium)
 * - Optional MFA support for enhanced security
 * - Lambda triggers for custom authentication logic
 * - LocalStack compatibility for local development
 * - Environment-specific configuration
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import {
  Environment,
  EnvironmentConfig,
  getEnvironmentConfig,
  getOAuthCallbackUrls,
  getOAuthLogoutUrls,
  applyEnvironmentTags
} from './environment-config';

/**
 * Properties for the Customer Authentication Stack
 */
export interface CustomerAuthStackProps extends cdk.StackProps {
  /** Deployment environment (local/dev/staging/prod) */
  environment: Environment;
}

/**
 * Customer Authentication Stack
 * 
 * Creates AWS Cognito User Pool infrastructure for customer authentication
 * with support for multiple customer tiers and environment-specific configuration.
 */
export class CustomerAuthStack extends cdk.Stack {
  /** The Customer User Pool */
  public readonly userPool: cognito.UserPool;

  /** The Customer User Pool Client */
  public readonly userPoolClient: cognito.UserPoolClient;

  /** Customer Groups for tier management */
  public readonly customerGroups: {
    individual: cognito.CfnUserPoolGroup;
    dealer: cognito.CfnUserPoolGroup;
    premium: cognito.CfnUserPoolGroup;
  };

  constructor(scope: Construct, id: string, props: CustomerAuthStackProps) {
    super(scope, id, props);

    const { environment } = props;
    const config = getEnvironmentConfig(this, environment);

    // Apply environment tags
    applyEnvironmentTags(this, config);

    // Customer User Pool Configuration
    this.userPool = new cognito.UserPool(this, 'CustomerUserPool', {
      userPoolName: `harborlist-customers-${environment}`,

      // Sign-in configuration
      signInAliases: {
        email: true,
        username: false,
        phone: false,
      },

      // Auto-verified attributes
      autoVerify: {
        email: true,
      },

      // Standard attributes
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        phoneNumber: {
          required: false,
          mutable: true,
        },
        givenName: {
          required: false,
          mutable: true,
        },
        familyName: {
          required: false,
          mutable: true,
        },
      },

      // Custom attributes for customer management
      customAttributes: {
        'customer_type': new cognito.StringAttribute({
          minLen: 1,
          maxLen: 20,
          mutable: true,
        }),
        'tier': new cognito.StringAttribute({
          minLen: 1,
          maxLen: 20,
          mutable: true,
        }),
        'registration_date': new cognito.DateTimeAttribute({
          mutable: false,
        }),
      },

      // Password policy - moderate security for customers
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false, // More user-friendly for customers
        tempPasswordValidity: cdk.Duration.days(7),
      },

      // Account recovery
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

      // MFA configuration - optional for customers
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },

      // Email configuration
      email: cognito.UserPoolEmail.withCognito(),

      // User invitation configuration
      userInvitation: {
        emailSubject: 'Welcome to HarborList!',
        emailBody: 'Hello {username}, welcome to HarborList! Your temporary password is {####}',
      },

      // User verification
      userVerification: {
        emailSubject: 'Verify your HarborList account',
        emailBody: 'Thank you for signing up to HarborList! Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },

      // Device tracking
      deviceTracking: {
        challengeRequiredOnNewDevice: true,
        deviceOnlyRememberedOnUserPrompt: false,
      },

      // Advanced security features - using standard threat protection
      // Note: Advanced security features require Cognito Plus plan

      // Deletion protection for production
      deletionProtection: environment === 'prod',

      // Removal policy based on environment
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // Customer User Pool Client
    this.userPoolClient = new cognito.UserPoolClient(this, 'CustomerUserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `harborlist-customers-client-${environment}`,

      // Authentication flows
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: false,
        adminUserPassword: false, // Not needed for customer authentication
      },

      // OAuth configuration
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: getOAuthCallbackUrls(config, '/auth/callback'),
        logoutUrls: getOAuthLogoutUrls(config, '/auth/logout'),
      },

      // Token validity
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),

      // Prevent user existence errors
      preventUserExistenceErrors: true,

      // Read and write attributes
      readAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          phoneNumber: true,
          givenName: true,
          familyName: true,
        })
        .withCustomAttributes('customer_type', 'tier', 'registration_date'),

      writeAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          phoneNumber: true,
          givenName: true,
          familyName: true,
        })
        .withCustomAttributes('customer_type', 'tier'),
    });

    // Customer Groups for tier management
    this.customerGroups = {
      individual: new cognito.CfnUserPoolGroup(this, 'IndividualCustomersGroup', {
        userPoolId: this.userPool.userPoolId,
        groupName: 'individual-customers',
        description: 'Individual customers with basic marketplace access',
        precedence: 3,
      }),

      dealer: new cognito.CfnUserPoolGroup(this, 'DealerCustomersGroup', {
        userPoolId: this.userPool.userPoolId,
        groupName: 'dealer-customers',
        description: 'Dealer customers with enhanced listing capabilities',
        precedence: 2,
      }),

      premium: new cognito.CfnUserPoolGroup(this, 'PremiumCustomersGroup', {
        userPoolId: this.userPool.userPoolId,
        groupName: 'premium-customers',
        description: 'Premium customers with all features and benefits',
        precedence: 1,
      }),
    };

    // Lambda triggers for custom logic
    // Note: These may not work in LocalStack but are defined for AWS deployment
    {
      // Pre Sign-up trigger for custom validation
      const preSignUpTrigger = new lambda.Function(this, 'CustomerPreSignUpTrigger', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline(`
          exports.handler = async (event) => {
            console.log('Customer Pre Sign-up trigger:', JSON.stringify(event, null, 2));
            
            // Auto-confirm email for development environments
            if (event.triggerSource === 'PreSignUp_SignUp') {
              event.response.autoConfirmUser = ${environment !== 'prod'};
              event.response.autoVerifyEmail = ${environment !== 'prod'};
            }
            
            return event;
          };
        `),
        description: 'Customer pre sign-up trigger for validation and auto-confirmation',
        logGroup: new logs.LogGroup(this, 'CustomerPreSignUpTriggerLogGroup', {
          retention: logs.RetentionDays.ONE_MONTH,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      });

      // Post Authentication trigger for group assignment
      const postAuthTrigger = new lambda.Function(this, 'CustomerPostAuthTrigger', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline(`
          const AWS = require('aws-sdk');
          const cognito = new AWS.CognitoIdentityServiceProvider();
          
          exports.handler = async (event) => {
            console.log('Customer Post Authentication trigger:', JSON.stringify(event, null, 2));
            
            const { userPoolId, userName } = event;
            
            try {
              // Check if user is already in a group
              const userGroups = await cognito.adminListGroupsForUser({
                UserPoolId: userPoolId,
                Username: userName,
              }).promise();
              
              // If user is not in any group, assign to individual-customers by default
              if (userGroups.Groups.length === 0) {
                await cognito.adminAddUserToGroup({
                  UserPoolId: userPoolId,
                  Username: userName,
                  GroupName: 'individual-customers',
                }).promise();
                
                console.log(\`Added user \${userName} to individual-customers group\`);
              }
            } catch (error) {
              console.error('Error in post authentication trigger:', error);
            }
            
            return event;
          };
        `),
        description: 'Customer post authentication trigger for group assignment',
        timeout: cdk.Duration.seconds(30),
        logGroup: new logs.LogGroup(this, 'CustomerPostAuthTriggerLogGroup', {
          retention: logs.RetentionDays.ONE_MONTH,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      });

      // Grant permissions to the post auth trigger
      postAuthTrigger.addToRolePolicy(new iam.PolicyStatement({
        actions: [
          'cognito-idp:AdminListGroupsForUser',
          'cognito-idp:AdminAddUserToGroup',
        ],
        resources: [this.userPool.userPoolArn],
      }));

      // Add triggers to User Pool
      this.userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, preSignUpTrigger);
      this.userPool.addTrigger(cognito.UserPoolOperation.POST_AUTHENTICATION, postAuthTrigger);
    }

    // Outputs for other stacks to reference
    new cdk.CfnOutput(this, 'CustomerUserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Customer User Pool ID',
      exportName: `CustomerUserPoolId-${environment}`,
    });

    new cdk.CfnOutput(this, 'CustomerUserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Customer User Pool Client ID',
      exportName: `CustomerUserPoolClientId-${environment}`,
    });

    new cdk.CfnOutput(this, 'CustomerUserPoolArn', {
      value: this.userPool.userPoolArn,
      description: 'Customer User Pool ARN',
      exportName: `CustomerUserPoolArn-${environment}`,
    });
  }
}