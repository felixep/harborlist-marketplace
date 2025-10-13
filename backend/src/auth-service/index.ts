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
  AuthError,
  AuthEvent,
  CUSTOMER_PERMISSIONS,
  STAFF_PERMISSIONS,
  isCustomerClaims,
  isStaffClaims
} from './interfaces';
import { AdminPermission } from '../types/common';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validateJWTToken } from './jwt-utils';

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

    this.customerCognitoClient = new CognitoIdentityProviderClient(cognitoConfig);
    this.staffCognitoClient = new CognitoIdentityProviderClient(cognitoConfig);
  }

  /**
   * Customer authentication methods
   */

  async customerLogin(email: string, password: string, deviceId?: string): Promise<CustomerAuthResult> {
    try {
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
        return {
          success: false,
          requiresMFA: true,
          mfaToken: response.Session,
          error: 'MFA verification required',
        };
      }

      // Extract tokens
      if (!response.AuthenticationResult) {
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
      
      return {
        success: true,
        tokens,
        customer: userDetails,
      };
    } catch (error: any) {
      console.error('Customer login error:', error);
      return this.handleCognitoError(error, 'customer');
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
          ...(userData.phone && [{
            Name: 'phone_number',
            Value: userData.phone,
          }]),
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
      return {
        success: false,
        message: this.getCognitoErrorMessage(error),
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
      return {
        success: false,
        message: this.getCognitoErrorMessage(error),
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
      return {
        success: false,
        message: this.getCognitoErrorMessage(error),
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
      return {
        success: false,
        message: this.getCognitoErrorMessage(error),
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
      return {
        success: false,
        message: this.getCognitoErrorMessage(error),
      };
    }
  }

  /**
   * Staff authentication methods (placeholder implementations)
   */

  async staffLogin(email: string, password: string, deviceId?: string): Promise<StaffAuthResult> {
    // TODO: Implement staff authentication in next task
    throw new Error('Staff authentication not yet implemented');
  }

  async staffRefreshToken(refreshToken: string): Promise<TokenSet> {
    // TODO: Implement staff token refresh in next task
    throw new Error('Staff token refresh not yet implemented');
  }

  async staffForgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    // TODO: Implement staff password reset in next task
    throw new Error('Staff password reset not yet implemented');
  }

  async staffConfirmForgotPassword(email: string, confirmationCode: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    // TODO: Implement staff password reset confirmation in next task
    throw new Error('Staff password reset confirmation not yet implemented');
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
    // TODO: Implement staff token validation in next task
    throw new Error('Staff token validation not yet implemented');
  }

  /**
   * MFA methods (placeholder implementations)
   */

  async customerSetupMFA(accessToken: string): Promise<{ secretCode: string; qrCodeUrl: string }> {
    // TODO: Implement customer MFA setup
    throw new Error('Customer MFA setup not yet implemented');
  }

  async customerVerifyMFA(accessToken: string, mfaCode: string): Promise<{ success: boolean; message: string }> {
    // TODO: Implement customer MFA verification
    throw new Error('Customer MFA verification not yet implemented');
  }

  async staffSetupMFA(accessToken: string): Promise<{ secretCode: string; qrCodeUrl: string }> {
    // TODO: Implement staff MFA setup
    throw new Error('Staff MFA setup not yet implemented');
  }

  async staffVerifyMFA(accessToken: string, mfaCode: string): Promise<{ success: boolean; message: string }> {
    // TODO: Implement staff MFA verification
    throw new Error('Staff MFA verification not yet implemented');
  }

  /**
   * Session management methods
   */

  async logout(accessToken: string, userType: 'customer' | 'staff'): Promise<{ success: boolean; message: string }> {
    try {
      const client = userType === 'customer' ? this.customerCognitoClient : this.staffCognitoClient;
      
      const command = new GlobalSignOutCommand({
        AccessToken: accessToken,
      });

      await client.send(command);

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error: any) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'Logout failed',
      };
    }
  }

  async logoutAllDevices(accessToken: string, userType: 'customer' | 'staff'): Promise<{ success: boolean; message: string }> {
    try {
      const client = userType === 'customer' ? this.customerCognitoClient : this.staffCognitoClient;
      const poolId = userType === 'customer' ? this.config.cognito.customer.poolId : this.config.cognito.staff.poolId;

      // Get user details first
      const getUserCommand = new GetUserCommand({
        AccessToken: accessToken,
      });
      const userResponse = await client.send(getUserCommand);

      // Sign out user from all devices
      const signOutCommand = new AdminUserGlobalSignOutCommand({
        UserPoolId: poolId,
        Username: userResponse.Username!,
      });

      await client.send(signOutCommand);

      return {
        success: true,
        message: 'Logged out from all devices successfully',
      };
    } catch (error: any) {
      console.error('Logout all devices error:', error);
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

  private getCustomerPermissions(customerType: CustomerTier): string[] {
    return CUSTOMER_PERMISSIONS[customerType] || CUSTOMER_PERMISSIONS[CustomerTier.INDIVIDUAL];
  }

  private handleCognitoError(error: any, userType: 'customer' | 'staff'): CustomerAuthResult | StaffAuthResult {
    const errorCode = error.name || 'UNKNOWN_ERROR';
    const errorMessage = this.getCognitoErrorMessage(error);

    if (userType === 'customer') {
      return {
        success: false,
        error: errorMessage,
        errorCode,
      } as CustomerAuthResult;
    } else {
      return {
        success: false,
        error: errorMessage,
        errorCode,
      } as StaffAuthResult;
    }
  }

  private getCognitoErrorMessage(error: any): string {
    switch (error.name) {
      case 'NotAuthorizedException':
        return 'Invalid email or password';
      case 'UserNotConfirmedException':
        return 'Please verify your email address before logging in';
      case 'UserNotFoundException':
        return 'User not found';
      case 'InvalidPasswordException':
        return 'Password does not meet requirements';
      case 'UsernameExistsException':
        return 'User with this email already exists';
      case 'InvalidParameterException':
        return 'Invalid parameters provided';
      case 'TooManyRequestsException':
        return 'Too many requests. Please try again later';
      case 'LimitExceededException':
        return 'Request limit exceeded. Please try again later';
      case 'CodeMismatchException':
        return 'Invalid verification code';
      case 'ExpiredCodeException':
        return 'Verification code has expired';
      default:
        return error.message || 'Authentication failed';
    }
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
 * 
 * Handles authentication operations for both customer and staff user pools:
 * - Customer endpoints: /auth/customer/* (Individual/Dealer/Premium tiers)
 * - Staff endpoints: /auth/staff/* (Super Admin/Admin/Manager/Team Member roles)
 * - Token validation and refresh for both user types
 * - MFA setup and verification
 * - Password reset functionality
 * - Session management and logout
 * 
 * Supported endpoints:
 * - POST /auth/customer/login - Customer authentication
 * - POST /auth/customer/register - Customer registration
 * - POST /auth/customer/refresh - Customer token refresh
 * - POST /auth/customer/logout - Customer logout
 * - POST /auth/customer/forgot-password - Customer password reset
 * - POST /auth/customer/confirm-forgot-password - Customer password reset confirmation
 * - POST /auth/customer/confirm-signup - Customer email verification
 * - POST /auth/customer/resend-confirmation - Resend customer verification code
 * - POST /auth/staff/login - Staff authentication (existing admin interface)
 * - POST /auth/staff/refresh - Staff token refresh
 * - POST /auth/staff/logout - Staff logout
 * - GET /health - Health check endpoint
 * 
 * @param event - API Gateway proxy event containing request details
 * @returns Promise<APIGatewayProxyResult> - Standardized API response
 * 
 * @throws {Error} When Cognito operations fail or invalid requests are made
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const clientInfo = getClientInfo(event);

  try {
    const path = event.path;
    const method = event.httpMethod;
    const body = JSON.parse(event.body || '{}');

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

    // Staff authentication endpoints (placeholder for next task)
    if (path.includes('/auth/staff/login') && method === 'POST') {
      return await handleStaffLogin(body, requestId, clientInfo);
    } else if (path.includes('/auth/staff/refresh') && method === 'POST') {
      return await handleStaffRefresh(body, requestId, clientInfo);
    } else if (path.includes('/auth/staff/logout') && method === 'POST') {
      return await handleStaffLogout(event, requestId, clientInfo);
    }

    // Backward compatibility for existing endpoints
    if (path.endsWith('/login') && method === 'POST') {
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
 * Customer authentication handler functions
 */

/**
 * Handles customer login authentication via Customer User Pool
 * 
 * Authenticates customers (Individual/Dealer/Premium) using AWS Cognito
 * with support for MFA challenges and tier-based permissions.
 * 
 * @param body - Login request containing email, password, and optional deviceId
 * @param requestId - Unique request identifier for tracking
 * @param clientInfo - Client metadata (IP address, user agent)
 * @returns Promise<APIGatewayProxyResult> - Authentication result with tokens or MFA requirement
 */
const handleCustomerLogin = async (
  body: { email: string; password: string; deviceId?: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { email, password, deviceId } = body;

  if (!email || !password) {
    return createErrorResponse(400, 'MISSING_FIELDS', 'Email and password are required', requestId);
  }

  if (!validateEmail(email)) {
    return createErrorResponse(400, 'INVALID_EMAIL', 'Invalid email format', requestId);
  }

  try {
    // Log login attempt
    await logAuditEvent('CUSTOMER_LOGIN_ATTEMPT', 'customer', { email }, clientInfo, requestId);

    const result = await authService.customerLogin(email, password, deviceId);

    if (result.success) {
      // Log successful login
      await logAuditEvent('CUSTOMER_LOGIN_SUCCESS', 'customer', { 
        userId: result.customer?.id,
        customerType: result.customer?.customerType 
      }, clientInfo, requestId, result.customer?.id);

      return createResponse(200, {
        success: true,
        tokens: result.tokens,
        customer: result.customer,
        message: 'Login successful'
      });
    } else {
      // Log failed login
      await logAuditEvent('CUSTOMER_LOGIN_FAILED', 'customer', { 
        email,
        error: result.error,
        errorCode: result.errorCode 
      }, clientInfo, requestId);

      if (result.requiresMFA) {
        return createResponse(200, {
          requiresMFA: true,
          mfaToken: result.mfaToken,
          message: result.error || 'MFA verification required'
        });
      }

      return createErrorResponse(401, result.errorCode || 'AUTH_FAILED', result.error || 'Authentication failed', requestId);
    }
  } catch (error) {
    console.error('Customer login error:', error);
    await logAuditEvent('CUSTOMER_LOGIN_ERROR', 'customer', { email, error: error instanceof Error ? error.message : String(error) }, clientInfo, requestId);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Login failed', requestId);
  }
};

/**
 * Handles customer registration via Customer User Pool
 * 
 * Registers new customers with tier assignment and email verification.
 * 
 * @param body - Registration request containing customer details
 * @param requestId - Unique request identifier for tracking
 * @param clientInfo - Client metadata (IP address, user agent)
 * @returns Promise<APIGatewayProxyResult> - Registration result
 */
const handleCustomerRegister = async (
  body: CustomerRegistration,
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { email, password, name, phone, customerType, agreeToTerms } = body;

  if (!email || !password || !name || !customerType || !agreeToTerms) {
    return createErrorResponse(400, 'MISSING_FIELDS', 'Email, password, name, customer type, and terms agreement are required', requestId);
  }

  if (!validateEmail(email)) {
    return createErrorResponse(400, 'INVALID_EMAIL', 'Invalid email format', requestId);
  }

  if (!Object.values(CustomerTier).includes(customerType)) {
    return createErrorResponse(400, 'INVALID_CUSTOMER_TYPE', 'Invalid customer type', requestId);
  }

  try {
    // Log registration attempt
    await logAuditEvent('CUSTOMER_REGISTER_ATTEMPT', 'customer', { email, customerType }, clientInfo, requestId);

    const result = await authService.customerRegister(body);

    if (result.success) {
      // Log successful registration
      await logAuditEvent('CUSTOMER_REGISTER_SUCCESS', 'customer', { email, customerType }, clientInfo, requestId);

      return createResponse(201, {
        success: true,
        message: result.message,
        requiresVerification: result.requiresVerification
      });
    } else {
      // Log failed registration
      await logAuditEvent('CUSTOMER_REGISTER_FAILED', 'customer', { email, error: result.message }, clientInfo, requestId);

      return createErrorResponse(400, 'REGISTRATION_FAILED', result.message, requestId);
    }
  } catch (error) {
    console.error('Customer registration error:', error);
    await logAuditEvent('CUSTOMER_REGISTER_ERROR', 'customer', { email, error: error instanceof Error ? error.message : String(error) }, clientInfo, requestId);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Registration failed', requestId);
  }
};

/**
 * Handles customer token refresh
 */
const handleCustomerRefresh = async (
  body: { refreshToken: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { refreshToken } = body;

  if (!refreshToken) {
    return createErrorResponse(400, 'MISSING_FIELDS', 'Refresh token is required', requestId);
  }

  try {
    const tokens = await authService.customerRefreshToken(refreshToken);

    // Log token refresh
    await logAuditEvent('CUSTOMER_TOKEN_REFRESH', 'customer', {}, clientInfo, requestId);

    return createResponse(200, {
      success: true,
      tokens,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Customer token refresh error:', error);
    await logAuditEvent('CUSTOMER_TOKEN_REFRESH_FAILED', 'customer', { error: error instanceof Error ? error.message : String(error) }, clientInfo, requestId);
    return createErrorResponse(401, 'TOKEN_REFRESH_FAILED', 'Token refresh failed', requestId);
  }
};

/**
 * Handles customer logout
 */
const handleCustomerLogout = async (
  event: APIGatewayProxyEvent,
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  try {
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return createErrorResponse(400, 'MISSING_TOKEN', 'Authorization token required', requestId);
    }

    const result = await authService.logout(token, 'customer');

    if (result.success) {
      await logAuditEvent('CUSTOMER_LOGOUT', 'customer', {}, clientInfo, requestId);
      return createResponse(200, { success: true, message: result.message });
    } else {
      return createErrorResponse(500, 'LOGOUT_FAILED', result.message, requestId);
    }
  } catch (error) {
    console.error('Customer logout error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Logout failed', requestId);
  }
};

/**
 * Handles customer forgot password
 */
const handleCustomerForgotPassword = async (
  body: { email: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { email } = body;

  if (!email || !validateEmail(email)) {
    return createErrorResponse(400, 'INVALID_EMAIL', 'Valid email is required', requestId);
  }

  try {
    const result = await authService.customerForgotPassword(email);

    // Log password reset request (don't log whether user exists)
    await logAuditEvent('CUSTOMER_PASSWORD_RESET_REQUEST', 'customer', { email }, clientInfo, requestId);

    return createResponse(200, {
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('Customer forgot password error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Password reset request failed', requestId);
  }
};

/**
 * Handles customer forgot password confirmation
 */
const handleCustomerConfirmForgotPassword = async (
  body: { email: string; confirmationCode: string; newPassword: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { email, confirmationCode, newPassword } = body;

  if (!email || !confirmationCode || !newPassword) {
    return createErrorResponse(400, 'MISSING_FIELDS', 'Email, confirmation code, and new password are required', requestId);
  }

  if (!validateEmail(email)) {
    return createErrorResponse(400, 'INVALID_EMAIL', 'Valid email is required', requestId);
  }

  try {
    const result = await authService.customerConfirmForgotPassword(email, confirmationCode, newPassword);

    if (result.success) {
      await logAuditEvent('CUSTOMER_PASSWORD_RESET_SUCCESS', 'customer', { email }, clientInfo, requestId);
    } else {
      await logAuditEvent('CUSTOMER_PASSWORD_RESET_FAILED', 'customer', { email, error: result.message }, clientInfo, requestId);
    }

    return createResponse(200, {
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('Customer confirm forgot password error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Password reset confirmation failed', requestId);
  }
};

/**
 * Handles customer email verification
 */
const handleCustomerConfirmSignUp = async (
  body: { email: string; confirmationCode: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { email, confirmationCode } = body;

  if (!email || !confirmationCode) {
    return createErrorResponse(400, 'MISSING_FIELDS', 'Email and confirmation code are required', requestId);
  }

  if (!validateEmail(email)) {
    return createErrorResponse(400, 'INVALID_EMAIL', 'Valid email is required', requestId);
  }

  try {
    const result = await authService.customerConfirmSignUp(email, confirmationCode);

    if (result.success) {
      await logAuditEvent('CUSTOMER_EMAIL_VERIFIED', 'customer', { email }, clientInfo, requestId);
    } else {
      await logAuditEvent('CUSTOMER_EMAIL_VERIFICATION_FAILED', 'customer', { email, error: result.message }, clientInfo, requestId);
    }

    return createResponse(200, {
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('Customer confirm sign up error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Email verification failed', requestId);
  }
};

/**
 * Handles customer resend confirmation code
 */
const handleCustomerResendConfirmation = async (
  body: { email: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { email } = body;

  if (!email || !validateEmail(email)) {
    return createErrorResponse(400, 'INVALID_EMAIL', 'Valid email is required', requestId);
  }

  try {
    const result = await authService.customerResendConfirmation(email);

    // Log resend confirmation attempt
    await logAuditEvent('CUSTOMER_RESEND_CONFIRMATION', 'customer', { email }, clientInfo, requestId);

    return createResponse(200, {
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('Customer resend confirmation error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Resend confirmation failed', requestId);
  }
};

/**
 * Staff authentication handler functions (placeholder implementations)
 */

/**
 * Handles staff login authentication via Staff User Pool
 * TODO: Implement in next task
 */
const handleStaffLogin = async (
  body: { email: string; password: string; mfaCode?: string; deviceId?: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  return createErrorResponse(501, 'NOT_IMPLEMENTED', 'Staff authentication not yet implemented', requestId);
};

/**
 * Handles staff token refresh
 * TODO: Implement in next task
 */
const handleStaffRefresh = async (
  body: { refreshToken: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  return createErrorResponse(501, 'NOT_IMPLEMENTED', 'Staff token refresh not yet implemented', requestId);
};

/**
 * Handles staff logout
 * TODO: Implement in next task
 */
const handleStaffLogout = async (
  event: APIGatewayProxyEvent,
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  return createErrorResponse(501, 'NOT_IMPLEMENTED', 'Staff logout not yet implemented', requestId);
};
/**
 * Utility functions
 */

/**
 * Validates email format using regex
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

 getting user by ID:', error);
    return null;
  }
}

async function getUserByResetToken(token: string): Promise<User | null> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'password-reset-token-index',
      KeyConditionExpression: 'passwordResetToken = :token',
      ExpressionAttributeValues: {
        ':token': token
      }
    }));

    return result.Items && result.Items.length > 0 ? result.Items[0] as User : null;
  } catch (error) {
    console.error('Error getting user by reset token:', error);
    return null;
  }
}

async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
  try {
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (value !== undefined) {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpression.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
      }
    });

    if (updateExpression.length === 0) return;

    // Always update the updatedAt timestamp
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { id: userId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    }));
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

async function handleFailedLogin(user: User, clientInfo: { ipAddress: string; userAgent: string }): Promise<void> {
  const newAttempts = (user.loginAttempts || 0) + 1;
  const updates: Partial<User> = { loginAttempts: newAttempts };

  if (shouldLockAccount(newAttempts)) {
    updates.lockedUntil = calculateLockoutExpiry();
  }

  await updateUser(user.id, updates);
  await logAuditEvent('FAILED_LOGIN_ATTEMPT', 'security', { 
    userId: user.id, 
    attempts: newAttempts,
    locked: !!updates.lockedUntil 
  }, clientInfo, '', user.id);
}

async function resetLoginAttempts(userId: string): Promise<void> {
  await updateUser(userId, { 
    loginAttempts: 0, 
    lockedUntil: undefined 
  });
}

async function createUserSession(
  user: User, 
  deviceId: string, 
  clientInfo: { ipAddress: string; userAgent: string },
  isAdmin: boolean = false
): Promise<LoginResult> {
  // Create session
  const session = createAuthSession(user.id, deviceId, clientInfo);
  
  // Store session in database
  await docClient.send(new PutCommand({
    TableName: SESSIONS_TABLE,
    Item: session
  }));

  // Create tokens
  const accessToken = createAccessToken(user, session.sessionId, deviceId);
  const refreshToken = createRefreshToken(user.id, session.sessionId);

  // Update last login (skip if fails in development)
  try {
    await updateUser(user.id, { lastLogin: new Date().toISOString() });
  } catch (updateError) {
    console.error('Failed to update user last login (non-critical):', updateError);
  }

  return {
    success: true,
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: AUTH_CONFIG.ACCESS_TOKEN_EXPIRY_SECONDS,
      tokenType: 'Bearer'
    },
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      mfaEnabled: user.mfaEnabled
    }
  };
}

async function getSession(sessionId: string): Promise<AuthSession | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: SESSIONS_TABLE,
      Key: { sessionId }
    }));

    return result.Item as AuthSession || null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

async function updateSessionActivity(sessionId: string): Promise<void> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: SESSIONS_TABLE,
      Key: { sessionId },
      UpdateExpression: 'SET lastActivity = :lastActivity',
      ExpressionAttributeValues: {
        ':lastActivity': new Date().toISOString()
      }
    }));
  } catch (error) {
    console.error('Error updating session activity:', error);
  }
}

async function invalidateSession(sessionId: string): Promise<void> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: SESSIONS_TABLE,
      Key: { sessionId },
      UpdateExpression: 'SET isActive = :isActive',
      ExpressionAttributeValues: {
        ':isActive': false
      }
    }));
  } catch (error) {
    console.error('Error invalidating session:', error);
  }
}

async function invalidateAllUserSessions(userId: string): Promise<void> {
  try {
    // Query all active sessions for user
    const result = await docClient.send(new QueryCommand({
      TableName: SESSIONS_TABLE,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: 'isActive = :isActive',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':isActive': true
      }
    }));

    // Invalidate each session
    if (result.Items) {
      for (const session of result.Items) {
        await invalidateSession(session.sessionId);
      }
    }
  } catch (error) {
    console.error('Error invalidating user sessions:', error);
  }
}

async function logLoginAttempt(
  email: string, 
  clientInfo: { ipAddress: string; userAgent: string }, 
  success: boolean,
  type: string = 'user'
): Promise<void> {
  try {
    const loginAttempt: LoginAttempt = {
      id: crypto.randomUUID(),
      email,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      success,
      timestamp: new Date().toISOString(),
      failureReason: success ? undefined : 'Invalid credentials'
    };

    await docClient.send(new PutCommand({
      TableName: LOGIN_ATTEMPTS_TABLE,
      Item: loginAttempt
    }));
  } catch (error) {
    console.error('Error logging login attempt:', error);
  }
}

async function logAuditEvent(
  action: string,
  resource: string,
  details: Record<string, any>,
  clientInfo: { ipAddress: string; userAgent: string },
  requestId: string,
  userId?: string
): Promise<void> {
  try {
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      userId: userId || 'system',
      userEmail: details.email || 'system',
      action,
      resource,
      resourceId: details.resourceId,
      details,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      timestamp: new Date().toISOString(),
      sessionId: details.sessionId || requestId
    };

    await docClient.send(new PutCommand({
      TableName: AUDIT_LOGS_TABLE,
      Item: auditLog
    }));
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
}