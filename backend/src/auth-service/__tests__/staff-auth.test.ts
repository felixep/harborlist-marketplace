/**
 * @fileoverview Unit tests for staff authentication functionality
 * 
 * Tests staff authentication methods including login, token validation,
 * MFA requirements, and role-based permissions for the AWS Cognito
 * dual-pool authentication system.
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import { jest } from '@jest/globals';
import { 
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  AdminListGroupsForUserCommand,
  GetUserCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GlobalSignOutCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { 
  StaffRole,
  StaffAuthResult,
  StaffClaims,
  STAFF_PERMISSIONS
} from '../interfaces';
import { AdminPermission } from '../../types/common';
import { validateJWTToken } from '../jwt-utils';

// Mock AWS SDK
jest.mock('@aws-sdk/client-cognito-identity-provider');
jest.mock('../jwt-utils');
jest.mock('../config');

// Mock configuration
const mockConfig = {
  deployment: {
    environment: 'local' as const,
    isLocal: true,
    isAWS: false,
    useLocalStack: true,
    region: 'us-east-1',
  },
  cognito: {
    customer: {
      poolId: 'test-customer-pool',
      clientId: 'test-customer-client',
      region: 'us-east-1',
      endpoint: 'http://localhost:4566',
    },
    staff: {
      poolId: 'test-staff-pool',
      clientId: 'test-staff-client',
      region: 'us-east-1',
      endpoint: 'http://localhost:4566',
    },
  },
  security: {
    customerSessionTTL: 86400,
    staffSessionTTL: 28800, // 8 hours
    mfaRequired: {
      customer: false,
      staff: true,
    },
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: false,
    },
  },
  features: {
    enableMFA: true,
    enableAuditLogging: true,
    enableRateLimiting: false,
  },
};

// Import the auth service after mocking
import { getEnvironmentConfig } from '../config';
(getEnvironmentConfig as jest.MockedFunction<typeof getEnvironmentConfig>).mockReturnValue(mockConfig);

// Import the class after mocking dependencies
import { CognitoAuthService } from '../index';

describe('Staff Authentication', () => {
  let authService: any;
  let mockCognitoClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock Cognito client
    mockCognitoClient = {
      send: jest.fn(),
    };

    // Mock the CognitoIdentityProviderClient constructor
    (CognitoIdentityProviderClient as jest.MockedClass<typeof CognitoIdentityProviderClient>)
      .mockImplementation(() => mockCognitoClient);

    // Create auth service instance
    authService = new (CognitoAuthService as any)();
  });

  describe('Staff Login', () => {
    it('should successfully authenticate a staff member', async () => {
      // Mock successful authentication response
      mockCognitoClient.send.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'mock-staff-access-token',
          RefreshToken: 'mock-staff-refresh-token',
          IdToken: 'mock-staff-id-token',
          ExpiresIn: 3600,
        },
      });

      // Mock user details response
      mockCognitoClient.send.mockResolvedValueOnce({
        Username: 'test-staff-id',
        UserAttributes: [
          { Name: 'email', Value: 'admin@example.com' },
          { Name: 'name', Value: 'Test Admin' },
          { Name: 'custom:team', Value: 'operations' },
          { Name: 'custom:mfa_enabled', Value: 'true' },
        ],
      });

      // Mock groups response
      mockCognitoClient.send.mockResolvedValueOnce({
        Groups: [
          {
            GroupName: StaffRole.ADMIN,
            Precedence: 2,
            Description: 'Admin role',
          },
        ],
      });

      const result = await authService.staffLogin('admin@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(result.tokens?.accessToken).toBe('mock-staff-access-token');
      expect(result.tokens?.refreshToken).toBe('mock-staff-refresh-token');
      expect(result.staff).toBeDefined();
      expect(result.staff?.email).toBe('admin@example.com');
      expect(result.staff?.role).toBe(StaffRole.ADMIN);
      expect(result.staff?.mfaEnabled).toBe(true);
      expect(result.staff?.team).toBe('operations');
    });

    it('should handle MFA challenge during staff login', async () => {
      // Mock MFA challenge response
      mockCognitoClient.send.mockResolvedValueOnce({
        ChallengeName: 'SOFTWARE_TOKEN_MFA',
        Session: 'mock-staff-mfa-session',
      });

      const result = await authService.staffLogin('admin@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.requiresMFA).toBe(true);
      expect(result.mfaToken).toBe('mock-staff-mfa-session');
      expect(result.error).toBe('MFA verification required');
    });

    it('should handle invalid staff credentials', async () => {
      mockCognitoClient.send.mockRejectedValueOnce({
        name: 'NotAuthorizedException',
        message: 'Incorrect username or password',
      });

      const result = await authService.staffLogin('admin@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(result.errorCode).toBe('NotAuthorizedException');
    });

    it('should correctly determine staff role from groups with precedence', async () => {
      // Mock successful authentication
      mockCognitoClient.send.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'mock-access-token',
          RefreshToken: 'mock-refresh-token',
          ExpiresIn: 3600,
        },
      });

      // Mock user details
      mockCognitoClient.send.mockResolvedValueOnce({
        Username: 'test-super-admin',
        UserAttributes: [
          { Name: 'email', Value: 'superadmin@example.com' },
          { Name: 'name', Value: 'Super Admin' },
          { Name: 'custom:mfa_enabled', Value: 'true' },
        ],
      });

      // Mock groups response with multiple roles (super-admin should win due to precedence)
      mockCognitoClient.send.mockResolvedValueOnce({
        Groups: [
          {
            GroupName: StaffRole.ADMIN,
            Precedence: 2,
          },
          {
            GroupName: StaffRole.SUPER_ADMIN,
            Precedence: 1, // Higher precedence (lower number)
          },
          {
            GroupName: StaffRole.MANAGER,
            Precedence: 3,
          },
        ],
      });

      const result = await authService.staffLogin('superadmin@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.staff?.role).toBe(StaffRole.SUPER_ADMIN);
      expect(result.staff?.permissions).toEqual(STAFF_PERMISSIONS[StaffRole.SUPER_ADMIN]);
    });
  });

  describe('Staff Token Validation', () => {
    const mockToken = 'mock.staff.jwt.token';
    const mockVerifiedToken = {
      sub: 'test-staff-id',
      email: 'admin@example.com',
      email_verified: true,
      name: 'Test Admin',
      'custom:permissions': JSON.stringify([AdminPermission.USER_MANAGEMENT, AdminPermission.CONTENT_MODERATION]),
      'custom:team': 'operations',
      'cognito:groups': [StaffRole.ADMIN],
      iss: 'https://cognito-idp.us-east-1.amazonaws.com/test-staff-pool',
      aud: 'test-staff-client',
      token_use: 'access',
      iat: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };

    beforeEach(() => {
      (validateJWTToken as jest.MockedFunction<typeof validateJWTToken>)
        .mockResolvedValue(mockVerifiedToken);
    });

    it('should successfully validate a staff token', async () => {
      const claims = await authService.validateStaffToken(mockToken);

      expect(claims).toBeDefined();
      expect(claims.sub).toBe('test-staff-id');
      expect(claims.email).toBe('admin@example.com');
      expect(claims.role).toBe(StaffRole.ADMIN);
      expect(claims.permissions).toEqual([AdminPermission.USER_MANAGEMENT, AdminPermission.CONTENT_MODERATION]);
      expect(claims['custom:team']).toBe('operations');

      // Verify JWT validation was called with correct parameters
      expect(validateJWTToken).toHaveBeenCalledWith(
        mockToken,
        'test-staff-pool',
        'test-staff-client',
        'us-east-1',
        'http://localhost:4566'
      );
    });

    it('should extract correct permissions for super admin role', async () => {
      const superAdminToken = {
        ...mockVerifiedToken,
        'cognito:groups': [StaffRole.SUPER_ADMIN],
        'custom:permissions': JSON.stringify(Object.values(AdminPermission)),
      };

      (validateJWTToken as jest.MockedFunction<typeof validateJWTToken>)
        .mockResolvedValue(superAdminToken);

      const claims = await authService.validateStaffToken(mockToken);

      expect(claims.role).toBe(StaffRole.SUPER_ADMIN);
      expect(claims.permissions).toEqual(Object.values(AdminPermission));
      expect(claims.permissions).toContain(AdminPermission.USER_MANAGEMENT);
      expect(claims.permissions).toContain(AdminPermission.SYSTEM_CONFIG);
      expect(claims.permissions).toContain(AdminPermission.BILLING_MANAGEMENT);
    });

    it('should extract correct permissions for manager role', async () => {
      const managerToken = {
        ...mockVerifiedToken,
        'cognito:groups': [StaffRole.MANAGER],
        'custom:permissions': JSON.stringify(STAFF_PERMISSIONS[StaffRole.MANAGER]),
      };

      (validateJWTToken as jest.MockedFunction<typeof validateJWTToken>)
        .mockResolvedValue(managerToken);

      const claims = await authService.validateStaffToken(mockToken);

      expect(claims.role).toBe(StaffRole.MANAGER);
      expect(claims.permissions).toEqual(STAFF_PERMISSIONS[StaffRole.MANAGER]);
      expect(claims.permissions).toContain(AdminPermission.USER_MANAGEMENT);
      expect(claims.permissions).toContain(AdminPermission.CONTENT_MODERATION);
      expect(claims.permissions).not.toContain(AdminPermission.SYSTEM_CONFIG);
      expect(claims.permissions).not.toContain(AdminPermission.BILLING_MANAGEMENT);
    });

    it('should extract correct permissions for team member role', async () => {
      const teamMemberToken = {
        ...mockVerifiedToken,
        'cognito:groups': [StaffRole.TEAM_MEMBER],
        'custom:permissions': JSON.stringify(STAFF_PERMISSIONS[StaffRole.TEAM_MEMBER]),
      };

      (validateJWTToken as jest.MockedFunction<typeof validateJWTToken>)
        .mockResolvedValue(teamMemberToken);

      const claims = await authService.validateStaffToken(mockToken);

      expect(claims.role).toBe(StaffRole.TEAM_MEMBER);
      expect(claims.permissions).toEqual(STAFF_PERMISSIONS[StaffRole.TEAM_MEMBER]);
      expect(claims.permissions).toContain(AdminPermission.CONTENT_MODERATION);
      expect(claims.permissions).toContain(AdminPermission.ANALYTICS_VIEW);
      expect(claims.permissions).not.toContain(AdminPermission.USER_MANAGEMENT);
      expect(claims.permissions).not.toContain(AdminPermission.SYSTEM_CONFIG);
    });

    it('should use role-based permissions when custom permissions are not available', async () => {
      const tokenWithoutCustomPermissions = {
        ...mockVerifiedToken,
        'custom:permissions': undefined,
        'cognito:groups': [StaffRole.ADMIN],
      };

      (validateJWTToken as jest.MockedFunction<typeof validateJWTToken>)
        .mockResolvedValue(tokenWithoutCustomPermissions);

      const claims = await authService.validateStaffToken(mockToken);

      expect(claims.role).toBe(StaffRole.ADMIN);
      expect(claims.permissions).toEqual(STAFF_PERMISSIONS[StaffRole.ADMIN]);
    });

    it('should enforce shorter TTL validation for staff tokens', async () => {
      const expiredStaffToken = {
        ...mockVerifiedToken,
        iat: Math.floor(Date.now() / 1000) - 29000, // 29000 seconds ago (> 8 hours)
      };

      (validateJWTToken as jest.MockedFunction<typeof validateJWTToken>)
        .mockResolvedValue(expiredStaffToken);

      await expect(authService.validateStaffToken(mockToken))
        .rejects.toThrow('Invalid staff token');
    });

    it('should handle invalid staff tokens', async () => {
      (validateJWTToken as jest.MockedFunction<typeof validateJWTToken>)
        .mockRejectedValue(new Error('Invalid token'));

      await expect(authService.validateStaffToken(mockToken))
        .rejects.toThrow('Invalid staff token');
    });

    it('should handle malformed permissions in token', async () => {
      const tokenWithMalformedPermissions = {
        ...mockVerifiedToken,
        'custom:permissions': 'invalid-json',
        'cognito:groups': [StaffRole.ADMIN],
      };

      (validateJWTToken as jest.MockedFunction<typeof validateJWTToken>)
        .mockResolvedValue(tokenWithMalformedPermissions);

      const claims = await authService.validateStaffToken(mockToken);

      // Should fall back to role-based permissions
      expect(claims.role).toBe(StaffRole.ADMIN);
      expect(claims.permissions).toEqual(STAFF_PERMISSIONS[StaffRole.ADMIN]);
    });
  });

  describe('Staff Token Refresh', () => {
    it('should successfully refresh staff tokens', async () => {
      mockCognitoClient.send.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'new-staff-access-token',
          IdToken: 'new-staff-id-token',
          ExpiresIn: 3600,
        },
      });

      const tokens = await authService.staffRefreshToken('mock-staff-refresh-token');

      expect(tokens.accessToken).toBe('new-staff-access-token');
      expect(tokens.refreshToken).toBe('mock-staff-refresh-token'); // Refresh token doesn't change
      expect(tokens.idToken).toBe('new-staff-id-token');
      expect(tokens.tokenType).toBe('Bearer');
      expect(tokens.expiresIn).toBe(3600);

      // Verify correct command was sent to staff pool
      expect(mockCognitoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            UserPoolId: 'test-staff-pool',
            ClientId: 'test-staff-client',
            AuthFlow: 'REFRESH_TOKEN_AUTH',
            AuthParameters: {
              REFRESH_TOKEN: 'mock-staff-refresh-token',
            },
          }),
        })
      );
    });

    it('should handle staff refresh token errors', async () => {
      mockCognitoClient.send.mockRejectedValueOnce({
        name: 'NotAuthorizedException',
        message: 'Refresh token is expired',
      });

      await expect(authService.staffRefreshToken('invalid-staff-refresh-token'))
        .rejects.toThrow('Token refresh failed');
    });
  });

  describe('Staff Password Reset', () => {
    it('should successfully initiate staff password reset', async () => {
      mockCognitoClient.send.mockResolvedValueOnce({});

      const result = await authService.staffForgotPassword('admin@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Password reset code sent');

      expect(mockCognitoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            ClientId: 'test-staff-client',
            Username: 'admin@example.com',
          }),
        })
      );
    });

    it('should successfully confirm staff password reset', async () => {
      mockCognitoClient.send.mockResolvedValueOnce({});

      const result = await authService.staffConfirmForgotPassword(
        'admin@example.com',
        '123456',
        'NewStaffPassword123!'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Password reset successfully');

      expect(mockCognitoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            ClientId: 'test-staff-client',
            Username: 'admin@example.com',
            ConfirmationCode: '123456',
            Password: 'NewStaffPassword123!',
          }),
        })
      );
    });

    it('should handle staff password reset errors', async () => {
      mockCognitoClient.send.mockRejectedValueOnce({
        name: 'UserNotFoundException',
        message: 'User not found',
      });

      const result = await authService.staffForgotPassword('nonexistent@example.com');

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not found');
    });
  });

  describe('Role-Based Permission Mapping', () => {
    it('should correctly map super admin permissions', () => {
      const permissions = STAFF_PERMISSIONS[StaffRole.SUPER_ADMIN];
      
      expect(permissions).toEqual(Object.values(AdminPermission));
      expect(permissions).toContain(AdminPermission.USER_MANAGEMENT);
      expect(permissions).toContain(AdminPermission.SYSTEM_CONFIG);
      expect(permissions).toContain(AdminPermission.BILLING_MANAGEMENT);
      expect(permissions).toContain(AdminPermission.SALES_MANAGEMENT);
    });

    it('should correctly map admin permissions', () => {
      const permissions = STAFF_PERMISSIONS[StaffRole.ADMIN];
      
      expect(permissions).toContain(AdminPermission.USER_MANAGEMENT);
      expect(permissions).toContain(AdminPermission.CONTENT_MODERATION);
      expect(permissions).toContain(AdminPermission.SYSTEM_CONFIG);
      expect(permissions).toContain(AdminPermission.ANALYTICS_VIEW);
      expect(permissions).toContain(AdminPermission.BILLING_MANAGEMENT);
      expect(permissions).not.toContain(AdminPermission.SALES_MANAGEMENT);
    });

    it('should correctly map manager permissions', () => {
      const permissions = STAFF_PERMISSIONS[StaffRole.MANAGER];
      
      expect(permissions).toContain(AdminPermission.USER_MANAGEMENT);
      expect(permissions).toContain(AdminPermission.CONTENT_MODERATION);
      expect(permissions).toContain(AdminPermission.ANALYTICS_VIEW);
      expect(permissions).toContain(AdminPermission.SALES_MANAGEMENT);
      expect(permissions).not.toContain(AdminPermission.SYSTEM_CONFIG);
      expect(permissions).not.toContain(AdminPermission.BILLING_MANAGEMENT);
    });

    it('should correctly map team member permissions', () => {
      const permissions = STAFF_PERMISSIONS[StaffRole.TEAM_MEMBER];
      
      expect(permissions).toContain(AdminPermission.CONTENT_MODERATION);
      expect(permissions).toContain(AdminPermission.ANALYTICS_VIEW);
      expect(permissions).not.toContain(AdminPermission.USER_MANAGEMENT);
      expect(permissions).not.toContain(AdminPermission.SYSTEM_CONFIG);
      expect(permissions).not.toContain(AdminPermission.BILLING_MANAGEMENT);
    });
  });

  describe('Enhanced Security Features', () => {
    const mockToken = 'mock.staff.jwt.token';
    const mockVerifiedToken = {
      sub: 'test-staff-id',
      email: 'admin@example.com',
      email_verified: true,
      name: 'Test Admin',
      'custom:permissions': JSON.stringify([AdminPermission.USER_MANAGEMENT, AdminPermission.CONTENT_MODERATION]),
      'custom:team': 'operations',
      'cognito:groups': [StaffRole.ADMIN],
      iss: 'https://cognito-idp.us-east-1.amazonaws.com/test-staff-pool',
      aud: 'test-staff-client',
      token_use: 'access',
      iat: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };

    it('should validate staff token age against shorter TTL', async () => {
      const recentToken = {
        ...mockVerifiedToken,
        iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago (within 8 hour limit)
      };

      (validateJWTToken as jest.MockedFunction<typeof validateJWTToken>)
        .mockResolvedValue(recentToken);

      const claims = await authService.validateStaffToken(mockToken);
      expect(claims).toBeDefined();
      expect(claims.sub).toBe('test-staff-id');
    });

    it('should reject staff tokens that exceed maximum session duration', async () => {
      const oldToken = {
        ...mockVerifiedToken,
        iat: Math.floor(Date.now() / 1000) - 30000, // Much older than 8 hours
      };

      (validateJWTToken as jest.MockedFunction<typeof validateJWTToken>)
        .mockResolvedValue(oldToken);

      await expect(authService.validateStaffToken(mockToken))
        .rejects.toThrow('Invalid staff token');
    });

    it('should handle MFA requirements for staff authentication', async () => {
      // Mock MFA challenge
      mockCognitoClient.send.mockResolvedValueOnce({
        ChallengeName: 'SOFTWARE_TOKEN_MFA',
        Session: 'mfa-session-token',
      });

      const result = await authService.staffLogin('admin@example.com', 'password123');

      expect(result.requiresMFA).toBe(true);
      expect(result.mfaToken).toBe('mfa-session-token');
      expect(result.success).toBe(false);
    });
  });
});