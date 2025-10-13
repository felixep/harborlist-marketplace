/**
 * @fileoverview Staff Authentication Stack for AWS Cognito User Pool
 * 
 * This stack creates and configures the Staff User Pool for the HarborList
 * boat marketplace admin interface, supporting Super Admin, Admin, Manager,
 * and Team Member roles with enhanced security settings and MFA requirements.
 * 
 * Features:
 * - Staff User Pool with email-based authentication
 * - Staff Groups for role-based access control
 * - Enforced MFA for all staff accounts
 * - Enhanced security settings and monitoring
 * - Lambda triggers for security validation
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
 * Properties for the Staff Authentication Stack
 */
export interface StaffAuthStackProps extends cdk.StackProps {
  /** Deployment environment (local/dev/staging/prod) */
  environment: Environment;
}

/**
 * Staff Authentication Stack
 * 
 * Creates AWS Cognito User Pool infrastructure for staff authentication
 * with enhanced security settings, MFA requirements, and role-based access control.
 */
export class StaffAuthStack extends cdk.Stack {
  /** The Staff User Pool */
  public readonly userPool: cognito.UserPool;
  
  /** The Staff User Pool Client */
  public readonly userPoolClient: cognito.UserPoolClient;
  
  /** Staff Groups for role-based access control */
  public readonly staffGroups: {
    superAdmin: cognito.CfnUserPoolGroup;
    admin: cognito.CfnUserPoolGroup;
    manager: cognito.CfnUserPoolGroup;
    teamMember: cognito.CfnUserPoolGroup;
  };

  constructor(scope: Construct, id: string, props: StaffAuthStackProps) {
    super(scope, id, props);

    const { environment } = props;
    const config = getEnvironmentConfig(this, environment);
    
    // Apply environment tags
    applyEnvironmentTags(this, config);

    // Staff User Pool Configuration with Enhanced Security
    this.userPool = new cognito.UserPool(this, 'StaffUserPool', {
      userPoolName: `harborlist-staff-${environment}`,
      
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
          required: true, // Required for MFA
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },
      
      // Custom attributes for staff management
      customAttributes: {
        'role': new cognito.StringAttribute({
          minLen: 1,
          maxLen: 50,
          mutable: true,
        }),
        'permissions': new cognito.StringAttribute({
          minLen: 1,
          maxLen: 1000,
          mutable: true,
        }),
        'team': new cognito.StringAttribute({
          minLen: 1,
          maxLen: 100,
          mutable: true,
        }),
        'hire_date': new cognito.DateTimeAttribute({
          mutable: false,
        }),
        'last_login': new cognito.DateTimeAttribute({
          mutable: true,
        }),
      },
      
      // Enhanced password policy for staff
      passwordPolicy: {
        minLength: 12, // Stronger password requirement
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true, // Required for staff
        tempPasswordValidity: cdk.Duration.days(1), // Shorter validity
      },
      
      // Account recovery
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      
      // MFA configuration - REQUIRED for all staff
      mfa: cognito.Mfa.REQUIRED,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      
      // Email configuration
      email: cognito.UserPoolEmail.withCognito(),
      
      // User invitation configuration
      userInvitation: {
        emailSubject: 'Welcome to HarborList Staff Portal',
        emailBody: 'Hello {username}, you have been invited to join the HarborList staff portal. Your temporary password is {####}. Please change it immediately after your first login.',
      },
      
      // User verification
      userVerification: {
        emailSubject: 'Verify your HarborList staff account',
        emailBody: 'Your HarborList staff account verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      
      // Device tracking - enhanced for staff
      deviceTracking: {
        challengeRequiredOnNewDevice: true,
        deviceOnlyRememberedOnUserPrompt: true,
      },
      
      // Advanced security features - using standard threat protection
      // Note: Advanced security features require Cognito Plus plan
      
      // Deletion protection for all environments (staff data is critical)
      deletionProtection: true,
      
      // Retention policy - always retain staff user pools
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Staff User Pool Client with Enhanced Security
    this.userPoolClient = new cognito.UserPoolClient(this, 'StaffUserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `harborlist-staff-client-${environment}`,
      
      // Authentication flows - more restrictive for staff
      authFlows: {
        userPassword: false, // Disabled for security
        userSrp: true,
        custom: false,
        adminUserPassword: true, // Enabled for admin user creation
      },
      
      // OAuth configuration
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false, // Disabled for security
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: getOAuthCallbackUrls(config, '/admin/auth/callback'),
        logoutUrls: getOAuthLogoutUrls(config, '/admin/auth/logout'),
      },
      
      // Shorter token validity for enhanced security
      accessTokenValidity: cdk.Duration.minutes(30), // Shorter for staff
      idTokenValidity: cdk.Duration.minutes(30),
      refreshTokenValidity: cdk.Duration.hours(8), // 8-hour work day
      
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
        .withCustomAttributes('role', 'permissions', 'team', 'hire_date', 'last_login'),
      
      writeAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          phoneNumber: true,
          givenName: true,
          familyName: true,
        })
        .withCustomAttributes('role', 'permissions', 'team', 'last_login'),
    });

    // Staff Groups for role-based access control
    this.staffGroups = {
      superAdmin: new cognito.CfnUserPoolGroup(this, 'SuperAdminGroup', {
        userPoolId: this.userPool.userPoolId,
        groupName: 'super-admin',
        description: 'Super administrators with full system access',
        precedence: 1,
      }),
      
      admin: new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
        userPoolId: this.userPool.userPoolId,
        groupName: 'admin',
        description: 'Administrators with broad system access',
        precedence: 2,
      }),
      
      manager: new cognito.CfnUserPoolGroup(this, 'ManagerGroup', {
        userPoolId: this.userPool.userPoolId,
        groupName: 'manager',
        description: 'Managers with team-specific access',
        precedence: 3,
      }),
      
      teamMember: new cognito.CfnUserPoolGroup(this, 'TeamMemberGroup', {
        userPoolId: this.userPool.userPoolId,
        groupName: 'team-member',
        description: 'Team members with basic staff operations access',
        precedence: 4,
      }),
    };

    // Enhanced Lambda triggers for staff security
    // Note: These may not work in LocalStack but are defined for AWS deployment
    {
      // Pre Sign-up trigger with strict validation
      const preSignUpTrigger = new lambda.Function(this, 'StaffPreSignUpTrigger', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline(`
          exports.handler = async (event) => {
            console.log('Staff Pre Sign-up trigger:', JSON.stringify(event, null, 2));
            
            // Staff accounts should only be created by administrators
            // Block self-registration in production
            if (event.triggerSource === 'PreSignUp_SignUp' && '${environment}' === 'prod') {
              throw new Error('Staff self-registration is not allowed');
            }
            
            // Auto-confirm for development environments only
            if (event.triggerSource === 'PreSignUp_SignUp') {
              event.response.autoConfirmUser = ${environment !== 'prod'};
              event.response.autoVerifyEmail = ${environment !== 'prod'};
            }
            
            return event;
          };
        `),
        description: 'Staff pre sign-up trigger with security validation',
        logGroup: new logs.LogGroup(this, 'StaffPreSignUpTriggerLogGroup', {
          retention: logs.RetentionDays.ONE_MONTH,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      });

      // Post Authentication trigger for security logging and group assignment
      const postAuthTrigger = new lambda.Function(this, 'StaffPostAuthTrigger', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline(`
          const AWS = require('aws-sdk');
          const cognito = new AWS.CognitoIdentityServiceProvider();
          
          exports.handler = async (event) => {
            console.log('Staff Post Authentication trigger:', JSON.stringify(event, null, 2));
            
            const { userPoolId, userName, request } = event;
            
            try {
              // Log authentication event for security monitoring
              console.log(\`Staff authentication: \${userName} from IP: \${request.clientMetadata?.sourceIp || 'unknown'}\`);
              
              // Update last login timestamp
              await cognito.adminUpdateUserAttributes({
                UserPoolId: userPoolId,
                Username: userName,
                UserAttributes: [
                  {
                    Name: 'custom:last_login',
                    Value: new Date().toISOString(),
                  },
                ],
              }).promise();
              
              // Check if user is in any group
              const userGroups = await cognito.adminListGroupsForUser({
                UserPoolId: userPoolId,
                Username: userName,
              }).promise();
              
              // If user is not in any group, assign to team-member by default
              if (userGroups.Groups.length === 0) {
                await cognito.adminAddUserToGroup({
                  UserPoolId: userPoolId,
                  Username: userName,
                  GroupName: 'team-member',
                }).promise();
                
                console.log(\`Added staff user \${userName} to team-member group\`);
              }
            } catch (error) {
              console.error('Error in staff post authentication trigger:', error);
              // Don't throw error to avoid blocking authentication
            }
            
            return event;
          };
        `),
        description: 'Staff post authentication trigger for security logging',
        timeout: cdk.Duration.seconds(30),
        logGroup: new logs.LogGroup(this, 'StaffPostAuthTriggerLogGroup', {
          retention: logs.RetentionDays.ONE_MONTH,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      });

      // Pre Token Generation trigger for custom claims
      const preTokenTrigger = new lambda.Function(this, 'StaffPreTokenTrigger', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline(`
          const AWS = require('aws-sdk');
          const cognito = new AWS.CognitoIdentityServiceProvider();
          
          exports.handler = async (event) => {
            console.log('Staff Pre Token Generation trigger:', JSON.stringify(event, null, 2));
            
            const { userPoolId, userName } = event;
            
            try {
              // Get user groups for role-based claims
              const userGroups = await cognito.adminListGroupsForUser({
                UserPoolId: userPoolId,
                Username: userName,
              }).promise();
              
              // Get user attributes for custom claims
              const userAttributes = await cognito.adminGetUser({
                UserPoolId: userPoolId,
                Username: userName,
              }).promise();
              
              // Extract custom attributes
              const customAttributes = {};
              userAttributes.UserAttributes.forEach(attr => {
                if (attr.Name.startsWith('custom:')) {
                  const key = attr.Name.replace('custom:', '');
                  customAttributes[key] = attr.Value;
                }
              });
              
              // Add custom claims to token
              event.response = {
                claimsOverrideDetails: {
                  claimsToAddOrOverride: {
                    'custom:groups': userGroups.Groups.map(g => g.GroupName).join(','),
                    'custom:role': customAttributes.role || 'team-member',
                    'custom:permissions': customAttributes.permissions || '',
                    'custom:team': customAttributes.team || '',
                    'custom:user_type': 'staff',
                  },
                },
              };
            } catch (error) {
              console.error('Error in staff pre token generation trigger:', error);
            }
            
            return event;
          };
        `),
        description: 'Staff pre token generation trigger for custom claims',
        timeout: cdk.Duration.seconds(30),
        logGroup: new logs.LogGroup(this, 'StaffPreTokenTriggerLogGroup', {
          retention: logs.RetentionDays.ONE_MONTH,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      });

      // Grant permissions to the triggers
      const cognitoPermissions = new iam.PolicyStatement({
        actions: [
          'cognito-idp:AdminListGroupsForUser',
          'cognito-idp:AdminAddUserToGroup',
          'cognito-idp:AdminGetUser',
          'cognito-idp:AdminUpdateUserAttributes',
        ],
        resources: [this.userPool.userPoolArn],
      });

      postAuthTrigger.addToRolePolicy(cognitoPermissions);
      preTokenTrigger.addToRolePolicy(cognitoPermissions);

      // Add triggers to User Pool
      this.userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, preSignUpTrigger);
      this.userPool.addTrigger(cognito.UserPoolOperation.POST_AUTHENTICATION, postAuthTrigger);
      this.userPool.addTrigger(cognito.UserPoolOperation.PRE_TOKEN_GENERATION, preTokenTrigger);
    }

    // Outputs for other stacks to reference
    new cdk.CfnOutput(this, 'StaffUserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Staff User Pool ID',
      exportName: `StaffUserPoolId-${environment}`,
    });

    new cdk.CfnOutput(this, 'StaffUserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Staff User Pool Client ID',
      exportName: `StaffUserPoolClientId-${environment}`,
    });

    new cdk.CfnOutput(this, 'StaffUserPoolArn', {
      value: this.userPool.userPoolArn,
      description: 'Staff User Pool ARN',
      exportName: `StaffUserPoolArn-${environment}`,
    });
  }
}