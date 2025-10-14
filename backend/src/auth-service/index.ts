/**
 * @fileoverview AWS Cognito dual-pool authentication service for HarborList boat marketplace.
 * 
 * Provides comprehensive authentication and authorization services with dual Cognito User Pools:
 * - Customer authentication (Individual/Dealer/Premium tiers) via Customer User Pool
 * - Staff authentication (Super Admin/Admin/Manager/Team Member roles) via Staff User Pool
 * - JWT-based session management with refresh tokens
 * - Multi-factor authentication (MFA) support
 * - Role-based access control via Cognito Groups
 * - Environment-aware configuration (LocalStack vs AWS)
 * - Comprehensive audit logging for security events
 * 
 * Security Features:
 * - Dual User Pool architecture for separation of concerns
 * - Cognito-managed password policies and security
 * - JWT tokens with configurable expiration per user type
 * - Cross-pool access prevention
 * - Enhanced security for staff authentication
 * - Comprehensive audit trail for compliance
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  RespondToAuthChallengeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  GlobalSignOutCommand,
  AdminUserGlobalSignOutCommand,
  GetUserCommand,
  ChangePasswordCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  ListUsersInGroupCommand,
  AdminListGroupsForUserCommand,
  AdminRemoveUserFromGroupCommand,
  AuthFlowType,
  ChallengeNameType,
  MessageActionType,
  DeliveryMediumType,
  AttributeType,
  UserType,
  GroupType
} from '@aws-sdk/client-cognito-identity-provider';
import { createResponse, createErrorResponse } from '../shared/utils';
import { getEnvironmentConfig, validateEnvironmentConfig } from './config';
import {
  AuthService,
  CustomerAuthResult,
  StaffAuthResult,
  CustomerRegistration,
  StaffRegistration,
  CustomerClaims,
  StaffClaims,
  TokenSet,
  CustomerTier,
  StaffRole,
  AuthEvent,
  CUSTOMER_PERMISSIONS,
  STAFF_PERMISSIONS,
  isCustomerClaims,
  isStaffClaims
} from './interfaces';
import {
  AuthError,
  AuthErrorCodes,
  createAuthError,
  createCrossPoolError,
  handleCognitoError,
  logAuthError
} from './auth-errors';
import { AdminPermission } from '../types/common';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validateJWTToken } from './jwt-utils';
import { mfaService } from './mfa-service';
import { logAuthEvent } from './audit-service';
import { securityService, checkRateLimit } from './security-service';

/**
 * AWS Cognito dual-pool authentication service implementation
 * Provides separate authentication domains for customers and staff
 */
class CognitoAuthService implements AuthService {
  private customerCognitoClient: CognitoIdentityProviderClient;
  private staffCognitoClient: CognitoIdentityProviderClient;
  private config: ReturnType<typeof getEnvironmentConfig>;

  constructor() {
    // Validate environment configuration
    validateEnvironmentConfig();
    this.config = getEnvironmentConfig();

    // Log configuration for debugging
    console.log('🔧 Auth Service Configuration:');
    console.log(`   Environment: ${this.config.deployment.environment}`);
    console.log(`   UseLocalStack: ${this.config.deployment.useLocalStack}`);
    console.log(`   Customer Pool: ${this.config.cognito.customer.poolId}`);
    console.log(`   Staff Pool: ${this.config.cognito.staff.poolId}`);
    console.log(`   Customer Endpoint: ${this.config.cognito.customer.endpoint || 'AWS'}`);
    console.log(`   Staff Endpoint: ${this.config.cognito.staff.endpoint || 'AWS'}`);

    // Initialize Cognito clients for both user pools
    const cognitoConfig = {
      region: this.config.deployment.region,
      ...(this.config.deployment.useLocalStack && {
        endpoint: this.config.cognito.customer.endpoint,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      }),
    };

    console.log(`🔗 Initializing Cognito clients with endpoint: ${cognitoConfig.endpoint || 'AWS'}`);

    this.customerCognitoClient = new CognitoIdentityProviderClient(cognitoConfig);
    this.staffCognitoClient = new CognitoIdentityProviderClient(cognitoConfig);
  }

  /**
   * Customer authentication methods
   */

  async customerLogin(email: string, password: string, clientInfo: any, deviceId?: string): Promise<CustomerAuthResult> {
    try {
      // Check rate limiting
      const rateLimitResult = await checkRateLimit(email, 'login', 'customer', clientInfo.ipAddress, clientInfo.userAgent);
      if (!rateLimitResult.allowed) {
        await logAuthEvent({
          eventType: 'FAILED_LOGIN',
          userType: 'customer',
          email,
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          timestamp: new Date().toISOString(),
          success: false,
          errorCode: 'RATE_LIMITED',
          additionalData: { rateLimitResult },
        });

        return {
          success: false,
          error: 'Too many login attempts. Please try again later.',
          errorCode: 'RATE_LIMITED',
        };
      }

      // Check if IP is blocked
      if (await securityService.isIPBlocked(clientInfo.ipAddress)) {
        await logAuthEvent({
          eventType: 'FAILED_LOGIN',
          userType: 'customer',
          email,
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          timestamp: new Date().toISOString(),
          success: false,
          errorCode: 'IP_BLOCKED',
        });

        return {
          success: false,
          error: 'Access denied from this IP address.',
          errorCode: 'IP_BLOCKED',
        };
      }

      const command = new AdminInitiateAuthCommand({
        UserPoolId: this.config.cognito.customer.poolId,
        ClientId: this.config.cognito.customer.clientId,
        AuthFlow: AuthFlowType.ADMIN_NO_SRP_AUTH,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
        ...(deviceId && {
          ContextData: {
            IpAddress: clientInfo.ipAddress,
            ServerName: 'harborlist.com',
            ServerPath: '/auth/customer/login',
            HttpHeaders: [
              {
                headerName: 'X-Device-ID',
                headerValue: deviceId,
              },
            ],
          },
        }),
      });

      const response = await this.customerCognitoClient.send(command);

      // Handle MFA challenge
      if (response.ChallengeName) {
        await logAuthEvent({
          eventType: 'LOGIN',
          userType: 'customer',
          email,
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          timestamp: new Date().toISOString(),
          success: true,
          additionalData: { requiresMFA: true, challengeName: response.ChallengeName },
        });

        return {
          success: false,
          requiresMFA: true,
          mfaToken: response.Session,
          error: 'MFA verification required',
        };
      }

      // Extract tokens
      if (!response.AuthenticationResult) {
        await logAuthEvent({
          eventType: 'FAILED_LOGIN',
          userType: 'customer',
          email,
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          timestamp: new Date().toISOString(),
          success: false,
          errorCode: 'AUTH_FAILED',
        });

        return {
          success: false,
          error: 'Authentication failed',
          errorCode: 'AUTH_FAILED',
        };
      }

      const tokens: TokenSet = {
        accessToken: response.AuthenticationResult.AccessToken!,
        refreshToken: response.AuthenticationResult.RefreshToken!,
        idToken: response.AuthenticationResult.IdToken,
        tokenType: 'Bearer',
        expiresIn: response.AuthenticationResult.ExpiresIn || 3600,
      };

      // Get user details and groups
      const userDetails = await this.getCustomerUserDetails(response.AuthenticationResult.AccessToken!);
      
      // Validate customer claims and create session
      const claims = await this.validateCustomerToken(tokens.accessToken);
      const session = await securityService.createSession(
        userDetails.id,
        'customer',
        userDetails.email,
        clientInfo.ipAddress,
        clientInfo.userAgent,
        claims,
        deviceId
      );

      // Log successful login
      await logAuthEvent({
        eventType: 'LOGIN',
        userType: 'customer',
        userId: userDetails.id,
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: true,
        additionalData: { sessionId: session.sessionId, customerType: userDetails.customerType },
      });
      
      return {
        success: true,
        tokens,
        customer: userDetails,
      };
    } catch (error: any) {
      console.error('Customer login error:', error);
      
      // Log failed login
      await logAuthEvent({
        eventType: 'FAILED_LOGIN',
        userType: 'customer',
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: false,
        errorCode: error.name,
        additionalData: { error: error.message },
      });

      return this.handleCognitoError(error, 'customer', {
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        endpoint: '/auth/customer/login'
      });
    }
  }

  async customerRegister(userData: CustomerRegistration): Promise<{ success: boolean; message: string; requiresVerification?: boolean }> {
    try {
      const command = new SignUpCommand({
        ClientId: this.config.cognito.customer.clientId,
        Username: userData.email,
        Password: userData.password,
        UserAttributes: [
          {
            Name: 'email',
            Value: userData.email,
          },
          {
            Name: 'name',
            Value: userData.name,
          },
          {
            Name: 'custom:customer_type',
            Value: userData.customerType,
          },
          ...(userData.phone ? [{
            Name: 'phone_number',
            Value: userData.phone,
          }] : []),
        ],
      });

      const response = await this.customerCognitoClient.send(command);

      // Add user to appropriate group based on customer type
      if (response.UserSub) {
        await this.addCustomerToGroup(userData.email, userData.customerType);
      }

      return {
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        requiresVerification: !response.UserConfirmed,
      };
    } catch (error: any) {
      console.error('Customer registration error:', error);
      const authError = createAuthError(error, 'customer', {
        email: userData.email,
        endpoint: '/auth/customer/register'
      });
      await logAuthError(authError, 'customer_registration');
      return {
        success: false,
        message: authError.userMessage,
      };
    }
  }

  async customerRefreshToken(refreshToken: string): Promise<TokenSet> {
    try {
      const command = new AdminInitiateAuthCommand({
        UserPoolId: this.config.cognito.customer.poolId,
        ClientId: this.config.cognito.customer.clientId,
        AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      });

      const response = await this.customerCognitoClient.send(command);

      if (!response.AuthenticationResult) {
        throw new Error('Token refresh failed');
      }

      return {
        accessToken: response.AuthenticationResult.AccessToken!,
        refreshToken: refreshToken, // Refresh token doesn't change
        idToken: response.AuthenticationResult.IdToken,
        tokenType: 'Bearer',
        expiresIn: response.AuthenticationResult.ExpiresIn || 3600,
      };
    } catch (error: any) {
      console.error('Customer token refresh error:', error);
      throw new Error('Token refresh failed');
    }
  }

  async customerForgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: this.config.cognito.customer.clientId,
        Username: email,
      });

      await this.customerCognitoClient.send(command);

      return {
        success: true,
        message: 'Password reset code sent to your email',
      };
    } catch (error: any) {
      console.error('Customer forgot password error:', error);
      const authError = createAuthError(error, 'customer', {
        email,
        endpoint: '/auth/customer/forgot-password'
      });
      await logAuthError(authError, 'customer_forgot_password');
      return {
        success: false,
        message: authError.userMessage,
      };
    }
  }

  async customerConfirmForgotPassword(email: string, confirmationCode: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: this.config.cognito.customer.clientId,
        Username: email,
        ConfirmationCode: confirmationCode,
        Password: newPassword,
      });

      await this.customerCognitoClient.send(command);

      return {
        success: true,
        message: 'Password reset successfully',
      };
    } catch (error: any) {
      console.error('Customer confirm forgot password error:', error);
      const authError = createAuthError(error, 'customer', {
        email,
        endpoint: '/auth/customer/confirm-forgot-password'
      });
      await logAuthError(authError, 'customer_confirm_forgot_password');
      return {
        success: false,
        message: authError.userMessage,
      };
    }
  }

  async customerResendConfirmation(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const command = new ResendConfirmationCodeCommand({
        ClientId: this.config.cognito.customer.clientId,
        Username: email,
      });

      await this.customerCognitoClient.send(command);

      return {
        success: true,
        message: 'Confirmation code resent to your email',
      };
    } catch (error: any) {
      console.error('Customer resend confirmation error:', error);
      const authError = createAuthError(error, 'customer', {
        email,
        endpoint: '/auth/customer/resend-confirmation'
      });
      await logAuthError(authError, 'customer_resend_confirmation');
      return {
        success: false,
        message: authError.userMessage,
      };
    }
  }

  async customerConfirmSignUp(email: string, confirmationCode: string): Promise<{ success: boolean; message: string }> {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: this.config.cognito.customer.clientId,
        Username: email,
        ConfirmationCode: confirmationCode,
      });

      await this.customerCognitoClient.send(command);

      return {
        success: true,
        message: 'Email verified successfully. You can now log in.',
      };
    } catch (error: any) {
      console.error('Customer confirm sign up error:', error);
      const authError = createAuthError(error, 'customer', {
        email,
        endpoint: '/auth/customer/confirm-signup'
      });
      await logAuthError(authError, 'customer_confirm_signup');
      return {
        success: false,
        message: authError.userMessage,
      };
    }
  }

  /**
   * Staff authentication methods
   */

  async staffLogin(email: string, password: string, clientInfo: any, deviceId?: string): Promise<StaffAuthResult> {
    try {
      // Check rate limiting (stricter for staff)
      const rateLimitResult = await checkRateLimit(email, 'login', 'staff', clientInfo.ipAddress, clientInfo.userAgent);
      if (!rateLimitResult.allowed) {
        await logAuthEvent({
          eventType: 'FAILED_LOGIN',
          userType: 'staff',
          email,
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          timestamp: new Date().toISOString(),
          success: false,
          errorCode: 'RATE_LIMITED',
          additionalData: { rateLimitResult },
        });

        return {
          success: false,
          error: 'Too many login attempts. Please try again later.',
          errorCode: 'RATE_LIMITED',
        };
      }

      // Check if IP is blocked
      if (await securityService.isIPBlocked(clientInfo.ipAddress)) {
        await logAuthEvent({
          eventType: 'FAILED_LOGIN',
          userType: 'staff',
          email,
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          timestamp: new Date().toISOString(),
          success: false,
          errorCode: 'IP_BLOCKED',
        });

        return {
          success: false,
          error: 'Access denied from this IP address.',
          errorCode: 'IP_BLOCKED',
        };
      }

      const command = new AdminInitiateAuthCommand({
        UserPoolId: this.config.cognito.staff.poolId,
        ClientId: this.config.cognito.staff.clientId,
        AuthFlow: AuthFlowType.ADMIN_NO_SRP_AUTH,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
        ...(deviceId && {
          ContextData: {
            IpAddress: clientInfo.ipAddress,
            ServerName: 'admin.harborlist.com',
            ServerPath: '/auth/staff/login',
            HttpHeaders: [
              {
                headerName: 'X-Device-ID',
                headerValue: deviceId,
              },
            ],
          },
        }),
      });

      const response = await this.staffCognitoClient.send(command);

      // Handle MFA challenge (required for staff)
      if (response.ChallengeName) {
        await logAuthEvent({
          eventType: 'LOGIN',
          userType: 'staff',
          email,
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          timestamp: new Date().toISOString(),
          success: true,
          additionalData: { requiresMFA: true, challengeName: response.ChallengeName },
        });

        return {
          success: false,
          requiresMFA: true,
          mfaToken: response.Session,
          error: 'MFA verification required',
        };
      }

      // Extract tokens
      if (!response.AuthenticationResult) {
        await logAuthEvent({
          eventType: 'FAILED_LOGIN',
          userType: 'staff',
          email,
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          timestamp: new Date().toISOString(),
          success: false,
          errorCode: 'AUTH_FAILED',
        });

        return {
          success: false,
          error: 'Authentication failed',
          errorCode: 'AUTH_FAILED',
        };
      }

      const tokens: TokenSet = {
        accessToken: response.AuthenticationResult.AccessToken!,
        refreshToken: response.AuthenticationResult.RefreshToken!,
        idToken: response.AuthenticationResult.IdToken,
        tokenType: 'Bearer',
        expiresIn: response.AuthenticationResult.ExpiresIn || 3600,
      };

      // Get staff user details and groups
      const staffDetails = await this.getStaffUserDetails(response.AuthenticationResult.AccessToken!);
      
      // Validate staff claims and create session
      const claims = await this.validateStaffToken(tokens.accessToken);
      const session = await securityService.createSession(
        staffDetails.id,
        'staff',
        staffDetails.email,
        clientInfo.ipAddress,
        clientInfo.userAgent,
        claims,
        deviceId
      );

      // Log successful login
      await logAuthEvent({
        eventType: 'LOGIN',
        userType: 'staff',
        userId: staffDetails.id,
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: true,
        additionalData: { sessionId: session.sessionId, role: staffDetails.role },
      });
      
      return {
        success: true,
        tokens,
        staff: staffDetails,
      };
    } catch (error: any) {
      console.error('Staff login error:', error);
      
      // Log failed login
      await logAuthEvent({
        eventType: 'FAILED_LOGIN',
        userType: 'staff',
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: false,
        errorCode: error.name,
        additionalData: { error: error.message },
      });

      return this.handleCognitoError(error, 'staff', {
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        endpoint: '/auth/staff/login'
      }) as StaffAuthResult;
    }
  }

  async staffRefreshToken(refreshToken: string): Promise<TokenSet> {
    try {
      const command = new AdminInitiateAuthCommand({
        UserPoolId: this.config.cognito.staff.poolId,
        ClientId: this.config.cognito.staff.clientId,
        AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      });

      const response = await this.staffCognitoClient.send(command);

      if (!response.AuthenticationResult) {
        throw new Error('Token refresh failed');
      }

      return {
        accessToken: response.AuthenticationResult.AccessToken!,
        refreshToken: refreshToken, // Refresh token doesn't change
        idToken: response.AuthenticationResult.IdToken,
        tokenType: 'Bearer',
        expiresIn: response.AuthenticationResult.ExpiresIn || 3600,
      };
    } catch (error: any) {
      console.error('Staff token refresh error:', error);
      throw new Error('Token refresh failed');
    }
  }

  async staffForgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: this.config.cognito.staff.clientId,
        Username: email,
      });

      await this.staffCognitoClient.send(command);

      return {
        success: true,
        message: 'Password reset code sent to your email',
      };
    } catch (error: any) {
      console.error('Staff forgot password error:', error);
      const authError = createAuthError(error, 'staff', {
        email,
        endpoint: '/auth/staff/forgot-password'
      });
      await logAuthError(authError, 'staff_forgot_password');
      return {
        success: false,
        message: authError.userMessage,
      };
    }
  }

  async staffConfirmForgotPassword(email: string, confirmationCode: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: this.config.cognito.staff.clientId,
        Username: email,
        ConfirmationCode: confirmationCode,
        Password: newPassword,
      });

      await this.staffCognitoClient.send(command);

      return {
        success: true,
        message: 'Password reset successfully',
      };
    } catch (error: any) {
      console.error('Staff confirm forgot password error:', error);
      const authError = createAuthError(error, 'staff', {
        email,
        endpoint: '/auth/staff/confirm-forgot-password'
      });
      await logAuthError(authError, 'staff_confirm_forgot_password');
      return {
        success: false,
        message: authError.userMessage,
      };
    }
  }

  /**
   * Token validation methods
   */

  async validateCustomerToken(token: string): Promise<CustomerClaims> {
    try {
      // Validate JWT token using Cognito JWKS
      const verified = await validateJWTToken(
        token,
        this.config.cognito.customer.poolId,
        this.config.cognito.customer.clientId,
        this.config.deployment.region,
        this.config.cognito.customer.endpoint
      );

      // Extract customer claims
      const customerClaims: CustomerClaims = {
        sub: verified.sub,
        email: verified.email,
        email_verified: verified.email_verified,
        name: verified.name,
        'custom:customer_type': verified['custom:customer_type'] as CustomerTier,
        'cognito:groups': verified['cognito:groups'] || [],
        permissions: this.getCustomerPermissions(verified['custom:customer_type'] as CustomerTier),
        iss: verified.iss,
        aud: verified.aud,
        token_use: verified.token_use,
        iat: verified.iat,
        exp: verified.exp,
      };

      return customerClaims;
    } catch (error: any) {
      console.error('Customer token validation error:', error);
      throw new Error('Invalid customer token');
    }
  }

  async validateStaffToken(token: string): Promise<StaffClaims> {
    try {
      // Validate JWT token using Cognito JWKS
      const verified = await validateJWTToken(
        token,
        this.config.cognito.staff.poolId,
        this.config.cognito.staff.clientId,
        this.config.deployment.region,
        this.config.cognito.staff.endpoint
      );

      // Enhanced security: Check token expiration with shorter TTL for staff
      const now = Math.floor(Date.now() / 1000);
      const tokenAge = now - verified.iat;
      const maxStaffTokenAge = this.config.security.staffSessionTTL;
      
      if (tokenAge > maxStaffTokenAge) {
        throw new Error('Staff token has exceeded maximum session duration');
      }

      // Parse permissions from custom attribute
      let permissions: AdminPermission[] = [];
      try {
        const permissionsStr = verified['custom:permissions'];
        if (permissionsStr) {
          permissions = JSON.parse(permissionsStr);
        }
      } catch (error) {
        console.warn('Failed to parse staff permissions from token, using role-based permissions');
      }

      // Determine role from groups
      const groups = verified['cognito:groups'] || [];
      let staffRole = StaffRole.TEAM_MEMBER; // Default role
      
      // Find the highest precedence role
      for (const role of Object.values(StaffRole)) {
        if (groups.includes(role)) {
          staffRole = role;
          break; // Roles are ordered by precedence in enum
        }
      }

      // If no permissions in token, use role-based permissions
      if (permissions.length === 0) {
        permissions = this.getStaffPermissions(staffRole);
      }

      // Extract staff claims with enhanced security validation
      const staffClaims: StaffClaims = {
        sub: verified.sub,
        email: verified.email,
        email_verified: verified.email_verified,
        name: verified.name,
        'custom:permissions': verified['custom:permissions'] || JSON.stringify(permissions),
        'custom:team': verified['custom:team'],
        'cognito:groups': groups,
        permissions,
        role: staffRole,
        iss: verified.iss,
        aud: verified.aud,
        token_use: verified.token_use,
        iat: verified.iat,
        exp: verified.exp,
      };

      return staffClaims;
    } catch (error: any) {
      console.error('Staff token validation error:', error);
      throw new Error('Invalid staff token');
    }
  }

  /**
   * MFA methods - integrated with MFA service
   */

  async customerSetupMFA(accessToken: string, clientInfo: any): Promise<{ secretCode: string; qrCodeUrl: string }> {
    const result = await mfaService.setupCustomerTOTP(accessToken, clientInfo);
    if (!result.success) {
      throw new Error(result.error || 'MFA setup failed');
    }
    return {
      secretCode: result.secretCode!,
      qrCodeUrl: result.qrCodeUrl!,
    };
  }

  async customerVerifyMFA(accessToken: string, mfaCode: string, clientInfo: any): Promise<{ success: boolean; message: string }> {
    const result = await mfaService.verifyTOTPSetup(accessToken, mfaCode, 'customer', clientInfo);
    return {
      success: result.success,
      message: result.message,
    };
  }

  async staffSetupMFA(accessToken: string, clientInfo: any): Promise<{ secretCode: string; qrCodeUrl: string }> {
    const result = await mfaService.setupStaffTOTP(accessToken, clientInfo);
    if (!result.success) {
      throw new Error(result.error || 'MFA setup failed');
    }
    return {
      secretCode: result.secretCode!,
      qrCodeUrl: result.qrCodeUrl!,
    };
  }

  async staffVerifyMFA(accessToken: string, mfaCode: string, clientInfo: any): Promise<{ success: boolean; message: string }> {
    const result = await mfaService.verifyTOTPSetup(accessToken, mfaCode, 'staff', clientInfo);
    return {
      success: result.success,
      message: result.message,
    };
  }

  /**
   * Session management methods
   */

  async logout(accessToken: string, userType: 'customer' | 'staff', clientInfo: any, sessionId?: string): Promise<{ success: boolean; message: string }> {
    try {
      const client = userType === 'customer' ? this.customerCognitoClient : this.staffCognitoClient;
      
      // Get user details for logging
      const getUserCommand = new GetUserCommand({ AccessToken: accessToken });
      const userResponse = await client.send(getUserCommand);
      const email = this.getAttributeValue(userResponse.UserAttributes, 'email');

      // Invalidate session if provided
      if (sessionId) {
        await securityService.invalidateSession(sessionId, 'logout');
      }

      const command = new GlobalSignOutCommand({
        AccessToken: accessToken,
      });

      await client.send(command);

      // Log successful logout
      await logAuthEvent({
        eventType: 'LOGOUT',
        userType,
        userId: userResponse.Username,
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: true,
        additionalData: { sessionId },
      });

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error: any) {
      console.error('Logout error:', error);
      
      // Log failed logout
      await logAuthEvent({
        eventType: 'LOGOUT',
        userType,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: false,
        errorCode: error.name,
        additionalData: { error: error.message },
      });

      return {
        success: false,
        message: 'Logout failed',
      };
    }
  }

  async logoutAllDevices(accessToken: string, userType: 'customer' | 'staff', clientInfo: any): Promise<{ success: boolean; message: string }> {
    try {
      const client = userType === 'customer' ? this.customerCognitoClient : this.staffCognitoClient;
      const poolId = userType === 'customer' ? this.config.cognito.customer.poolId : this.config.cognito.staff.poolId;

      // Get user details first
      const getUserCommand = new GetUserCommand({
        AccessToken: accessToken,
      });
      const userResponse = await client.send(getUserCommand);
      const email = this.getAttributeValue(userResponse.UserAttributes, 'email');

      // Invalidate all user sessions
      const invalidatedCount = await securityService.invalidateAllUserSessions(
        userResponse.Username!,
        'logout_all_devices'
      );

      // Sign out user from all devices
      const signOutCommand = new AdminUserGlobalSignOutCommand({
        UserPoolId: poolId,
        Username: userResponse.Username!,
      });

      await client.send(signOutCommand);

      // Log successful logout from all devices
      await logAuthEvent({
        eventType: 'LOGOUT',
        userType,
        userId: userResponse.Username,
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: true,
        additionalData: { 
          logoutType: 'all_devices',
          invalidatedSessions: invalidatedCount 
        },
      });

      return {
        success: true,
        message: 'Logged out from all devices successfully',
      };
    } catch (error: any) {
      console.error('Logout all devices error:', error);
      
      // Log failed logout
      await logAuthEvent({
        eventType: 'LOGOUT',
        userType,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: false,
        errorCode: error.name,
        additionalData: { 
          logoutType: 'all_devices',
          error: error.message 
        },
      });

      return {
        success: false,
        message: 'Logout from all devices failed',
      };
    }
  }

  /**
   * Helper methods
   */

  private async getCustomerUserDetails(accessToken: string) {
    try {
      const command = new GetUserCommand({
        AccessToken: accessToken,
      });

      const response = await this.customerCognitoClient.send(command);
      
      const getAttributeValue = (name: string) => {
        const attr = response.UserAttributes?.find(attr => attr.Name === name);
        return attr?.Value || '';
      };

      const customerType = getAttributeValue('custom:customer_type') as CustomerTier || CustomerTier.INDIVIDUAL;

      return {
        id: response.Username!,
        email: getAttributeValue('email'),
        name: getAttributeValue('name'),
        customerType,
        emailVerified: getAttributeValue('email_verified') === 'true',
        phoneVerified: getAttributeValue('phone_number_verified') === 'true',
      };
    } catch (error: any) {
      console.error('Error getting customer user details:', error);
      throw new Error('Failed to get user details');
    }
  }

  private async getStaffUserDetails(accessToken: string) {
    try {
      const command = new GetUserCommand({
        AccessToken: accessToken,
      });

      const response = await this.staffCognitoClient.send(command);
      
      const getAttributeValue = (name: string) => {
        const attr = response.UserAttributes?.find(attr => attr.Name === name);
        return attr?.Value || '';
      };

      // Get user groups to determine role
      const groupsCommand = new AdminListGroupsForUserCommand({
        UserPoolId: this.config.cognito.staff.poolId,
        Username: response.Username!,
      });

      const groupsResponse = await this.staffCognitoClient.send(groupsCommand);
      const userGroups = groupsResponse.Groups || [];
      
      // Determine staff role from groups (highest precedence wins)
      let staffRole = StaffRole.TEAM_MEMBER; // Default role
      let highestPrecedence = 999;
      
      for (const group of userGroups) {
        const groupName = group.GroupName;
        if (groupName && Object.values(StaffRole).includes(groupName as StaffRole)) {
          const precedence = group.Precedence || 999;
          if (precedence < highestPrecedence) {
            highestPrecedence = precedence;
            staffRole = groupName as StaffRole;
          }
        }
      }

      // Get permissions based on role
      const permissions = this.getStaffPermissions(staffRole);

      // Check if MFA is enabled
      const mfaEnabled = getAttributeValue('custom:mfa_enabled') === 'true';

      // Map StaffRole (with hyphens) to frontend UserRole format (with underscores)
      const roleMapping: Record<StaffRole, string> = {
        [StaffRole.SUPER_ADMIN]: 'super_admin',
        [StaffRole.ADMIN]: 'admin',
        [StaffRole.MANAGER]: 'moderator', // Map manager to moderator for frontend compatibility
        [StaffRole.TEAM_MEMBER]: 'support', // Map team member to support for frontend compatibility
      };

      return {
        id: response.Username!,
        email: getAttributeValue('email'),
        name: getAttributeValue('name'),
        role: roleMapping[staffRole],
        permissions,
        team: getAttributeValue('custom:team'),
        mfaEnabled,
      };
    } catch (error: any) {
      console.error('Error getting staff user details:', error);
      throw new Error('Failed to get staff user details');
    }
  }

  private async addCustomerToGroup(username: string, customerType: CustomerTier) {
    try {
      const groupName = `${customerType}-customers`;
      
      const command = new AdminAddUserToGroupCommand({
        UserPoolId: this.config.cognito.customer.poolId,
        Username: username,
        GroupName: groupName,
      });

      await this.customerCognitoClient.send(command);
    } catch (error: any) {
      console.error('Error adding customer to group:', error);
      // Don't throw error as this is not critical for registration
    }
  }

  /**
   * Customer tier management methods
   */

  async assignCustomerTier(email: string, newTier: CustomerTier, adminUserId?: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get current user details
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: this.config.cognito.customer.poolId,
        Username: email,
      });

      const userResponse = await this.customerCognitoClient.send(getUserCommand);
      if (!userResponse.Username) {
        return {
          success: false,
          message: 'Customer not found',
        };
      }

      // Get current groups
      const listGroupsCommand = new AdminListGroupsForUserCommand({
        UserPoolId: this.config.cognito.customer.poolId,
        Username: email,
      });

      const groupsResponse = await this.customerCognitoClient.send(listGroupsCommand);
      const currentGroups = groupsResponse.Groups || [];

      // Remove from all customer tier groups
      for (const group of currentGroups) {
        if (group.GroupName?.endsWith('-customers')) {
          const removeCommand = new AdminRemoveUserFromGroupCommand({
            UserPoolId: this.config.cognito.customer.poolId,
            Username: email,
            GroupName: group.GroupName,
          });
          await this.customerCognitoClient.send(removeCommand);
        }
      }

      // Add to new tier group
      await this.addCustomerToGroup(email, newTier);

      // Update custom attribute
      const updateAttributesCommand = new AdminUpdateUserAttributesCommand({
        UserPoolId: this.config.cognito.customer.poolId,
        Username: email,
        UserAttributes: [
          {
            Name: 'custom:customer_type',
            Value: newTier,
          },
        ],
      });

      await this.customerCognitoClient.send(updateAttributesCommand);

      // Log tier change
      await logAuthEvent({
        eventType: 'TIER_CHANGE' as any,
        userType: 'customer',
        userId: userResponse.Username,
        email,
        ipAddress: 'system',
        userAgent: 'auth-service',
        timestamp: new Date().toISOString(),
        success: true,
        additionalData: { 
          newTier, 
          adminUserId,
          previousGroups: currentGroups.map(g => g.GroupName).filter(Boolean)
        },
      });

      return {
        success: true,
        message: `Customer tier updated to ${newTier}`,
      };
    } catch (error: any) {
      console.error('Error assigning customer tier:', error);
      const authError = createAuthError(error, 'customer', {
        email,
        endpoint: '/auth/customer/assign-tier'
      });
      await logAuthError(authError, 'assign_customer_tier');
      return {
        success: false,
        message: authError.userMessage,
      };
    }
  }

  async modifyCustomerTier(email: string, targetTier: CustomerTier, adminUserId: string): Promise<{ success: boolean; message: string; previousTier?: CustomerTier }> {
    try {
      // Get current customer details
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: this.config.cognito.customer.poolId,
        Username: email,
      });

      const userResponse = await this.customerCognitoClient.send(getUserCommand);
      if (!userResponse.Username) {
        return {
          success: false,
          message: 'Customer not found',
        };
      }

      // Get current tier from attributes
      const currentTierAttr = userResponse.UserAttributes?.find(attr => attr.Name === 'custom:customer_type');
      const currentTier = currentTierAttr?.Value as CustomerTier;

      if (currentTier === targetTier) {
        return {
          success: true,
          message: `Customer is already in ${targetTier} tier`,
          previousTier: currentTier,
        };
      }

      // Use assignCustomerTier to handle the change
      const result = await this.assignCustomerTier(email, targetTier, adminUserId);

      return {
        ...result,
        previousTier: currentTier,
      };
    } catch (error: any) {
      console.error('Error modifying customer tier:', error);
      const authError = createAuthError(error, 'customer', {
        email,
        endpoint: '/auth/customer/modify-tier'
      });
      await logAuthError(authError, 'modify_customer_tier');
      return {
        success: false,
        message: authError.userMessage,
      };
    }
  }

  async validateCustomerTierAccess(email: string, requiredFeature: string): Promise<{ hasAccess: boolean; customerTier?: CustomerTier; message?: string }> {
    try {
      // Get customer details
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: this.config.cognito.customer.poolId,
        Username: email,
      });

      const userResponse = await this.customerCognitoClient.send(getUserCommand);
      if (!userResponse.Username) {
        return {
          hasAccess: false,
          message: 'Customer not found',
        };
      }

      // Get customer tier
      const tierAttr = userResponse.UserAttributes?.find(attr => attr.Name === 'custom:customer_type');
      const customerTier = tierAttr?.Value as CustomerTier || CustomerTier.INDIVIDUAL;

      // Get permissions for tier
      const permissions = this.getCustomerPermissions(customerTier);

      // Handle Premium tier inheritance logic
      let hasAccess = permissions.includes(requiredFeature);
      
      if (!hasAccess && customerTier === CustomerTier.PREMIUM) {
        // Premium customers inherit Individual and Dealer permissions
        const individualPermissions = this.getCustomerPermissions(CustomerTier.INDIVIDUAL);
        const dealerPermissions = this.getCustomerPermissions(CustomerTier.DEALER);
        hasAccess = individualPermissions.includes(requiredFeature) || dealerPermissions.includes(requiredFeature);
      }

      return {
        hasAccess,
        customerTier,
        message: hasAccess ? 'Access granted' : `Feature '${requiredFeature}' requires higher tier`,
      };
    } catch (error: any) {
      console.error('Error validating customer tier access:', error);
      return {
        hasAccess: false,
        message: 'Error validating access',
      };
    }
  }

  async getCustomerTierInfo(email: string): Promise<{ success: boolean; customerTier?: CustomerTier; permissions?: string[]; groups?: string[]; message?: string }> {
    try {
      // Get customer details
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: this.config.cognito.customer.poolId,
        Username: email,
      });

      const userResponse = await this.customerCognitoClient.send(getUserCommand);
      if (!userResponse.Username) {
        return {
          success: false,
          message: 'Customer not found',
        };
      }

      // Get customer tier
      const tierAttr = userResponse.UserAttributes?.find(attr => attr.Name === 'custom:customer_type');
      const customerTier = tierAttr?.Value as CustomerTier || CustomerTier.INDIVIDUAL;

      // Get groups
      const listGroupsCommand = new AdminListGroupsForUserCommand({
        UserPoolId: this.config.cognito.customer.poolId,
        Username: email,
      });

      const groupsResponse = await this.customerCognitoClient.send(listGroupsCommand);
      const groups = groupsResponse.Groups?.map(g => g.GroupName).filter((name): name is string => Boolean(name)) || [];

      // Get permissions (including Premium inheritance)
      let permissions = this.getCustomerPermissions(customerTier);
      
      if (customerTier === CustomerTier.PREMIUM) {
        // Premium customers inherit all lower tier permissions
        const individualPermissions = this.getCustomerPermissions(CustomerTier.INDIVIDUAL);
        const dealerPermissions = this.getCustomerPermissions(CustomerTier.DEALER);
        permissions = [...new Set([...permissions, ...individualPermissions, ...dealerPermissions])];
      }

      return {
        success: true,
        customerTier,
        permissions,
        groups,
      };
    } catch (error: any) {
      console.error('Error getting customer tier info:', error);
      const authError = createAuthError(error, 'customer', {
        email,
        endpoint: '/auth/customer/tier-info'
      });
      await logAuthError(authError, 'get_customer_tier_info');
      return {
        success: false,
        message: authError.userMessage,
      };
    }
  }

  /**
   * Staff role management methods
   */

  async assignStaffRole(email: string, newRole: StaffRole, permissions: AdminPermission[], adminUserId: string, team?: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get current user details
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: this.config.cognito.staff.poolId,
        Username: email,
      });

      const userResponse = await this.staffCognitoClient.send(getUserCommand);
      if (!userResponse.Username) {
        return {
          success: false,
          message: 'Staff member not found',
        };
      }

      // Get current groups
      const listGroupsCommand = new AdminListGroupsForUserCommand({
        UserPoolId: this.config.cognito.staff.poolId,
        Username: email,
      });

      const groupsResponse = await this.staffCognitoClient.send(listGroupsCommand);
      const currentGroups = groupsResponse.Groups || [];

      // Remove from all staff role groups
      for (const group of currentGroups) {
        if (Object.values(StaffRole).includes(group.GroupName as StaffRole)) {
          const removeCommand = new AdminRemoveUserFromGroupCommand({
            UserPoolId: this.config.cognito.staff.poolId,
            Username: email,
            GroupName: group.GroupName,
          });
          await this.staffCognitoClient.send(removeCommand);
        }
      }

      // Add to new role group
      const addToGroupCommand = new AdminAddUserToGroupCommand({
        UserPoolId: this.config.cognito.staff.poolId,
        Username: email,
        GroupName: newRole,
      });
      await this.staffCognitoClient.send(addToGroupCommand);

      // Update custom attributes
      const updateAttributesCommand = new AdminUpdateUserAttributesCommand({
        UserPoolId: this.config.cognito.staff.poolId,
        Username: email,
        UserAttributes: [
          {
            Name: 'custom:permissions',
            Value: JSON.stringify(permissions),
          },
          ...(team ? [{
            Name: 'custom:team',
            Value: team,
          }] : []),
        ],
      });

      await this.staffCognitoClient.send(updateAttributesCommand);

      // Log role change
      await logAuthEvent({
        eventType: 'ROLE_CHANGE' as any,
        userType: 'staff',
        userId: userResponse.Username,
        email,
        ipAddress: 'system',
        userAgent: 'auth-service',
        timestamp: new Date().toISOString(),
        success: true,
        additionalData: { 
          newRole, 
          permissions,
          team,
          adminUserId,
          previousGroups: currentGroups.map(g => g.GroupName).filter(Boolean)
        },
      });

      return {
        success: true,
        message: `Staff role updated to ${newRole}`,
      };
    } catch (error: any) {
      console.error('Error assigning staff role:', error);
      const authError = createAuthError(error, 'staff', {
        email,
        endpoint: '/auth/staff/assign-role'
      });
      await logAuthError(authError, 'assign_staff_role');
      return {
        success: false,
        message: authError.userMessage,
      };
    }
  }

  async modifyStaffPermissions(email: string, permissions: AdminPermission[], adminUserId: string): Promise<{ success: boolean; message: string; previousPermissions?: AdminPermission[] }> {
    try {
      // Get current staff details
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: this.config.cognito.staff.poolId,
        Username: email,
      });

      const userResponse = await this.staffCognitoClient.send(getUserCommand);
      if (!userResponse.Username) {
        return {
          success: false,
          message: 'Staff member not found',
        };
      }

      // Get current permissions
      const currentPermissionsAttr = userResponse.UserAttributes?.find(attr => attr.Name === 'custom:permissions');
      let previousPermissions: AdminPermission[] = [];
      
      if (currentPermissionsAttr?.Value) {
        try {
          previousPermissions = JSON.parse(currentPermissionsAttr.Value);
        } catch (error) {
          console.warn('Failed to parse existing permissions, using role-based permissions');
        }
      }

      // Update permissions
      const updateAttributesCommand = new AdminUpdateUserAttributesCommand({
        UserPoolId: this.config.cognito.staff.poolId,
        Username: email,
        UserAttributes: [
          {
            Name: 'custom:permissions',
            Value: JSON.stringify(permissions),
          },
        ],
      });

      await this.staffCognitoClient.send(updateAttributesCommand);

      // Log permission change
      await logAuthEvent({
        eventType: 'PERMISSION_CHANGE' as any,
        userType: 'staff',
        userId: userResponse.Username,
        email,
        ipAddress: 'system',
        userAgent: 'auth-service',
        timestamp: new Date().toISOString(),
        success: true,
        additionalData: { 
          newPermissions: permissions,
          previousPermissions,
          adminUserId
        },
      });

      return {
        success: true,
        message: 'Staff permissions updated successfully',
        previousPermissions,
      };
    } catch (error: any) {
      console.error('Error modifying staff permissions:', error);
      const authError = createAuthError(error, 'staff', {
        email,
        endpoint: '/auth/staff/modify-permissions'
      });
      await logAuthError(authError, 'modify_staff_permissions');
      return {
        success: false,
        message: authError.userMessage,
      };
    }
  }

  async assignStaffToTeam(email: string, team: string, adminUserId: string): Promise<{ success: boolean; message: string; previousTeam?: string }> {
    try {
      // Get current staff details
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: this.config.cognito.staff.poolId,
        Username: email,
      });

      const userResponse = await this.staffCognitoClient.send(getUserCommand);
      if (!userResponse.Username) {
        return {
          success: false,
          message: 'Staff member not found',
        };
      }

      // Get current team
      const currentTeamAttr = userResponse.UserAttributes?.find(attr => attr.Name === 'custom:team');
      const previousTeam = currentTeamAttr?.Value;

      // Update team assignment
      const updateAttributesCommand = new AdminUpdateUserAttributesCommand({
        UserPoolId: this.config.cognito.staff.poolId,
        Username: email,
        UserAttributes: [
          {
            Name: 'custom:team',
            Value: team,
          },
        ],
      });

      await this.staffCognitoClient.send(updateAttributesCommand);

      // Log team assignment
      await logAuthEvent({
        eventType: 'TEAM_ASSIGNMENT' as any,
        userType: 'staff',
        userId: userResponse.Username,
        email,
        ipAddress: 'system',
        userAgent: 'auth-service',
        timestamp: new Date().toISOString(),
        success: true,
        additionalData: { 
          newTeam: team,
          previousTeam,
          adminUserId
        },
      });

      return {
        success: true,
        message: `Staff member assigned to team: ${team}`,
        previousTeam,
      };
    } catch (error: any) {
      console.error('Error assigning staff to team:', error);
      const authError = createAuthError(error, 'staff', {
        email,
        endpoint: '/auth/staff/assign-team'
      });
      await logAuthError(authError, 'assign_staff_to_team');
      return {
        success: false,
        message: authError.userMessage,
      };
    }
  }

  async getStaffRoleInfo(email: string): Promise<{ success: boolean; role?: StaffRole; permissions?: AdminPermission[]; team?: string; groups?: string[]; message?: string }> {
    try {
      // Get staff details
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: this.config.cognito.staff.poolId,
        Username: email,
      });

      const userResponse = await this.staffCognitoClient.send(getUserCommand);
      if (!userResponse.Username) {
        return {
          success: false,
          message: 'Staff member not found',
        };
      }

      // Get groups
      const listGroupsCommand = new AdminListGroupsForUserCommand({
        UserPoolId: this.config.cognito.staff.poolId,
        Username: email,
      });

      const groupsResponse = await this.staffCognitoClient.send(listGroupsCommand);
      const groups = groupsResponse.Groups?.map(g => g.GroupName).filter((name): name is string => Boolean(name)) || [];

      // Determine role from groups
      let role = StaffRole.TEAM_MEMBER; // Default role
      for (const staffRole of Object.values(StaffRole)) {
        if (groups.includes(staffRole)) {
          role = staffRole;
          break; // Roles are ordered by precedence
        }
      }

      // Get permissions from custom attribute
      const permissionsAttr = userResponse.UserAttributes?.find(attr => attr.Name === 'custom:permissions');
      let permissions: AdminPermission[] = [];
      
      if (permissionsAttr?.Value) {
        try {
          permissions = JSON.parse(permissionsAttr.Value);
        } catch (error) {
          console.warn('Failed to parse permissions, using role-based permissions');
          permissions = this.getStaffPermissions(role);
        }
      } else {
        permissions = this.getStaffPermissions(role);
      }

      // Get team
      const teamAttr = userResponse.UserAttributes?.find(attr => attr.Name === 'custom:team');
      const team = teamAttr?.Value;

      return {
        success: true,
        role,
        permissions,
        team,
        groups,
      };
    } catch (error: any) {
      console.error('Error getting staff role info:', error);
      const authError = createAuthError(error, 'staff', {
        email,
        endpoint: '/auth/staff/role-info'
      });
      await logAuthError(authError, 'get_staff_role_info');
      return {
        success: false,
        message: authError.userMessage,
      };
    }
  }

  async validateStaffPermission(email: string, requiredPermission: AdminPermission): Promise<{ hasPermission: boolean; role?: StaffRole; message?: string }> {
    try {
      const roleInfo = await this.getStaffRoleInfo(email);
      
      if (!roleInfo.success) {
        return {
          hasPermission: false,
          message: roleInfo.message,
        };
      }

      const hasPermission = roleInfo.permissions?.includes(requiredPermission) || 
                           roleInfo.role === StaffRole.SUPER_ADMIN || // Super admin has all permissions
                           false;

      return {
        hasPermission,
        role: roleInfo.role,
        message: hasPermission ? 'Permission granted' : `Permission '${requiredPermission}' denied`,
      };
    } catch (error: any) {
      console.error('Error validating staff permission:', error);
      return {
        hasPermission: false,
        message: 'Error validating permission',
      };
    }
  }

  private getCustomerPermissions(customerType: CustomerTier): string[] {
    return [...(CUSTOMER_PERMISSIONS[customerType] || CUSTOMER_PERMISSIONS[CustomerTier.INDIVIDUAL])];
  }

  private getStaffPermissions(staffRole: StaffRole): AdminPermission[] {
    return [...(STAFF_PERMISSIONS[staffRole] || STAFF_PERMISSIONS[StaffRole.TEAM_MEMBER])];
  }

  /**
   * Enhanced Cognito error handling with dual-pool support
   * Uses the new comprehensive error handling system
   */
  private handleCognitoError(
    error: any, 
    userType: 'customer' | 'staff',
    context?: {
      email?: string;
      ipAddress?: string;
      userAgent?: string;
      endpoint?: string;
      requestId?: string;
    }
  ): CustomerAuthResult | StaffAuthResult {
    // Use the new comprehensive error handling
    return handleCognitoError(error, userType, context);
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use handleCognitoError instead
   */
  private getCognitoErrorMessage(error: any): string {
    const authError = createAuthError(error, 'customer');
    return authError.userMessage;
  }

  private getAttributeValue(attributes: AttributeType[] | undefined, name: string): string {
    if (!attributes) return '';
    const attr = attributes.find(attr => attr.Name === name);
    return attr?.Value || '';
  }
}

/**
 * Global authentication service instance
 */
const authService = new CognitoAuthService();

// Export the class for testing
export { CognitoAuthService };

/**
 * Main Lambda handler for AWS Cognito dual-pool authentication service
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const clientInfo = getClientInfo(event);

  try {
    const path = event.path;
    const method = event.httpMethod;
    const body = JSON.parse(event.body || '{}');
    
    console.log(`🔍 Auth handler - Path: ${path}, Method: ${method}`);

    // Health check endpoint
    if (path.endsWith('/health') && method === 'GET') {
      return createResponse(200, { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'cognito-auth-service',
        version: '2.0.0',
        environment: getEnvironmentConfig().deployment.environment,
        userPools: {
          customer: !!getEnvironmentConfig().cognito.customer.poolId,
          staff: !!getEnvironmentConfig().cognito.staff.poolId,
        }
      });
    }

    // Customer authentication endpoints
    if (path.includes('/auth/customer/login') && method === 'POST') {
      return await handleCustomerLogin(body, requestId, clientInfo);
    } else if (path.includes('/auth/customer/register') && method === 'POST') {
      return await handleCustomerRegister(body, requestId, clientInfo);
    } else if (path.includes('/auth/customer/refresh') && method === 'POST') {
      return await handleCustomerRefresh(body, requestId, clientInfo);
    } else if (path.includes('/auth/customer/logout') && method === 'POST') {
      return await handleCustomerLogout(event, requestId, clientInfo);
    } else if (path.includes('/auth/customer/forgot-password') && method === 'POST') {
      return await handleCustomerForgotPassword(body, requestId, clientInfo);
    } else if (path.includes('/auth/customer/confirm-forgot-password') && method === 'POST') {
      return await handleCustomerConfirmForgotPassword(body, requestId, clientInfo);
    } else if (path.includes('/auth/customer/confirm-signup') && method === 'POST') {
      return await handleCustomerConfirmSignUp(body, requestId, clientInfo);
    } else if (path.includes('/auth/customer/resend-confirmation') && method === 'POST') {
      return await handleCustomerResendConfirmation(body, requestId, clientInfo);
    }

    // Staff authentication endpoints
    if (path.includes('/auth/staff/login') && method === 'POST') {
      console.log('✅ Matched staff login endpoint');
      return await handleStaffLogin(body, requestId, clientInfo);
    } else if (path.includes('/auth/staff/refresh') && method === 'POST') {
      return await handleStaffRefresh(body, requestId, clientInfo);
    } else if (path.includes('/auth/staff/logout') && method === 'POST') {
      return await handleStaffLogout(event, requestId, clientInfo);
    }

    // Backward compatibility for existing endpoints
    if (path.endsWith('/login') && method === 'POST') {
      console.log('⚠️  Matched backward compatibility customer login endpoint');
      return await handleCustomerLogin(body, requestId, clientInfo);
    } else if (path.endsWith('/register') && method === 'POST') {
      return await handleCustomerRegister(body, requestId, clientInfo);
    } else if (path.endsWith('/admin/login') && method === 'POST') {
      return await handleStaffLogin(body, requestId, clientInfo);
    }

    return createErrorResponse(404, 'NOT_FOUND', 'Endpoint not found', requestId);
  } catch (error) {
    console.error('Auth service error:', error);
    await logAuditEvent('AUTH_ERROR', 'system', { error: error instanceof Error ? error.message : String(error) }, clientInfo, requestId);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }
};

/**
 * Utility function to extract client information from API Gateway event
 */
function getClientInfo(event: APIGatewayProxyEvent): { ipAddress: string; userAgent: string } {
  return {
    ipAddress: event.requestContext.identity.sourceIp || 'unknown',
    userAgent: event.headers['User-Agent'] || 'unknown',
  };
}

/**
 * Utility function to log audit events
 */
async function logAuditEvent(
  eventType: string,
  category: string,
  data: any,
  clientInfo: { ipAddress: string; userAgent: string },
  requestId: string,
  userId?: string
): Promise<void> {
  try {
    const auditEvent: AuthEvent = {
      eventType: eventType as any,
      userType: category.includes('customer') ? 'customer' : 'staff',
      userId,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      timestamp: new Date().toISOString(),
      success: !eventType.includes('ERROR') && !eventType.includes('FAILED'),
      additionalData: { ...data, requestId },
    };

    // TODO: Implement CloudWatch logging for audit events
    console.log('Audit Event:', JSON.stringify(auditEvent));
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Email validation utility
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Initialize auth service instance (singleton)
let authServiceInstance: CognitoAuthService | null = null;

function getAuthService(): CognitoAuthService {
  if (!authServiceInstance) {
    authServiceInstance = new CognitoAuthService();
  }
  return authServiceInstance;
}

// Handler functions - implementing actual dual authentication
async function handleCustomerLogin(body: any, requestId: string, clientInfo: any): Promise<APIGatewayProxyResult> {
  try {
    const { email, password, deviceId } = body;
    
    if (!email || !password) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Email and password are required', requestId);
    }

    if (!validateEmail(email)) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Invalid email format', requestId);
    }

    const result = await getAuthService().customerLogin(email, password, clientInfo, deviceId);
    
    if (result.success) {
      return createResponse(200, {
        success: true,
        tokens: result.tokens,
        customer: result.customer,
      });
    } else {
      return createErrorResponse(401, result.errorCode || 'AUTH_FAILED', result.error || 'Authentication failed', requestId);
    }
  } catch (error) {
    console.error('Customer login handler error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }
}

async function handleCustomerRegister(body: any, requestId: string, clientInfo: any): Promise<APIGatewayProxyResult> {
  try {
    const { email, password, name, customerType, phone } = body;
    
    if (!email || !password || !name || !customerType) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Email, password, name, and customer type are required', requestId);
    }

    if (!validateEmail(email)) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Invalid email format', requestId);
    }

    if (!['individual', 'dealer', 'premium'].includes(customerType)) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Invalid customer type', requestId);
    }

    const userData: CustomerRegistration = {
      email,
      password,
      name,
      customerType: customerType as CustomerTier,
      phone,
      agreeToTerms: body.agreeToTerms || true, // Default to true for testing
      marketingOptIn: body.marketingOptIn || false,
    };

    const result = await getAuthService().customerRegister(userData);
    
    if (result.success) {
      return createResponse(201, {
        success: true,
        message: result.message,
        requiresVerification: result.requiresVerification,
      });
    } else {
      return createErrorResponse(400, 'REGISTRATION_FAILED', result.message, requestId);
    }
  } catch (error) {
    console.error('Customer register handler error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }
}

async function handleCustomerRefresh(body: any, requestId: string, clientInfo: any): Promise<APIGatewayProxyResult> {
  try {
    const { refreshToken } = body;
    
    if (!refreshToken) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Refresh token is required', requestId);
    }

    const tokens = await getAuthService().customerRefreshToken(refreshToken);
    
    return createResponse(200, {
      success: true,
      tokens,
    });
  } catch (error) {
    console.error('Customer refresh handler error:', error);
    return createErrorResponse(401, 'TOKEN_REFRESH_FAILED', 'Token refresh failed', requestId);
  }
}

async function handleCustomerLogout(event: any, requestId: string, clientInfo: any): Promise<APIGatewayProxyResult> {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Authorization header is required', requestId);
    }

    const accessToken = authHeader.substring(7);
    const sessionId = event.headers['X-Session-ID'] || event.headers['x-session-id'];

    const result = await getAuthService().logout(accessToken, 'customer', clientInfo, sessionId);
    
    if (result.success) {
      return createResponse(200, {
        success: true,
        message: result.message,
      });
    } else {
      return createErrorResponse(400, 'LOGOUT_FAILED', result.message, requestId);
    }
  } catch (error) {
    console.error('Customer logout handler error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }
}

async function handleCustomerForgotPassword(body: any, requestId: string, clientInfo: any): Promise<APIGatewayProxyResult> {
  try {
    const { email } = body;
    
    if (!email) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Email is required', requestId);
    }

    if (!validateEmail(email)) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Invalid email format', requestId);
    }

    const result = await getAuthService().customerForgotPassword(email);
    
    if (result.success) {
      return createResponse(200, {
        success: true,
        message: result.message,
      });
    } else {
      return createErrorResponse(400, 'FORGOT_PASSWORD_FAILED', result.message, requestId);
    }
  } catch (error) {
    console.error('Customer forgot password handler error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }
}

async function handleCustomerConfirmForgotPassword(body: any, requestId: string, clientInfo: any): Promise<APIGatewayProxyResult> {
  try {
    const { email, confirmationCode, newPassword } = body;
    
    if (!email || !confirmationCode || !newPassword) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Email, confirmation code, and new password are required', requestId);
    }

    if (!validateEmail(email)) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Invalid email format', requestId);
    }

    const result = await getAuthService().customerConfirmForgotPassword(email, confirmationCode, newPassword);
    
    if (result.success) {
      return createResponse(200, {
        success: true,
        message: result.message,
      });
    } else {
      return createErrorResponse(400, 'CONFIRM_FORGOT_PASSWORD_FAILED', result.message, requestId);
    }
  } catch (error) {
    console.error('Customer confirm forgot password handler error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }
}

async function handleCustomerConfirmSignUp(body: any, requestId: string, clientInfo: any): Promise<APIGatewayProxyResult> {
  try {
    const { email, confirmationCode } = body;
    
    if (!email || !confirmationCode) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Email and confirmation code are required', requestId);
    }

    if (!validateEmail(email)) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Invalid email format', requestId);
    }

    const result = await getAuthService().customerConfirmSignUp(email, confirmationCode);
    
    if (result.success) {
      return createResponse(200, {
        success: true,
        message: result.message,
      });
    } else {
      return createErrorResponse(400, 'CONFIRM_SIGNUP_FAILED', result.message, requestId);
    }
  } catch (error) {
    console.error('Customer confirm signup handler error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }
}

async function handleCustomerResendConfirmation(body: any, requestId: string, clientInfo: any): Promise<APIGatewayProxyResult> {
  try {
    const { email } = body;
    
    if (!email) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Email is required', requestId);
    }

    if (!validateEmail(email)) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Invalid email format', requestId);
    }

    const result = await getAuthService().customerResendConfirmation(email);
    
    if (result.success) {
      return createResponse(200, {
        success: true,
        message: result.message,
      });
    } else {
      return createErrorResponse(400, 'RESEND_CONFIRMATION_FAILED', result.message, requestId);
    }
  } catch (error) {
    console.error('Customer resend confirmation handler error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }
}

async function handleStaffLogin(body: any, requestId: string, clientInfo: any): Promise<APIGatewayProxyResult> {
  try {
    const { email, password, deviceId } = body;
    
    if (!email || !password) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Email and password are required', requestId);
    }

    if (!validateEmail(email)) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Invalid email format', requestId);
    }

    const result = await getAuthService().staffLogin(email, password, clientInfo, deviceId);
    
    if (result.success) {
      return createResponse(200, {
        success: true,
        tokens: result.tokens,
        staff: result.staff,
      });
    } else {
      return createErrorResponse(401, result.errorCode || 'AUTH_FAILED', result.error || 'Authentication failed', requestId);
    }
  } catch (error) {
    console.error('Staff login handler error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }
}

async function handleStaffRefresh(body: any, requestId: string, clientInfo: any): Promise<APIGatewayProxyResult> {
  try {
    const { refreshToken } = body;
    
    if (!refreshToken) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Refresh token is required', requestId);
    }

    const tokens = await getAuthService().staffRefreshToken(refreshToken);
    
    return createResponse(200, {
      success: true,
      tokens,
    });
  } catch (error) {
    console.error('Staff refresh handler error:', error);
    return createErrorResponse(401, 'TOKEN_REFRESH_FAILED', 'Token refresh failed', requestId);
  }
}

async function handleStaffLogout(event: any, requestId: string, clientInfo: any): Promise<APIGatewayProxyResult> {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Authorization header is required', requestId);
    }

    const accessToken = authHeader.substring(7);
    const sessionId = event.headers['X-Session-ID'] || event.headers['x-session-id'];

    const result = await getAuthService().logout(accessToken, 'staff', clientInfo, sessionId);
    
    if (result.success) {
      return createResponse(200, {
        success: true,
        message: result.message,
      });
    } else {
      return createErrorResponse(400, 'LOGOUT_FAILED', result.message, requestId);
    }
  } catch (error) {
    console.error('Staff logout handler error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }
}