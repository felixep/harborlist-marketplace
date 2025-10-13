/**
 * @fileoverview Unit tests for customer authentication functionality
 * 
 * Tests customer authentication methods including registration, login,
 * token validation, and tier-based permissions for the AWS Cognito
 * dual-pool authentication system.
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import { jest } from '@jest/globals';
import { 
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  SignUpCommand,
  AdminAddUserToGroupCommand,
  GetUserCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GlobalSignOutCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { 
  CustomerTier,
  CustomerAuthResult,
  CustomerRegistration,
  CustomerClaims,
  CUSTOMER_PERMISSIONS
} from '../interfaces';
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
    staffSessionTTL: 28800,
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

describe('Customer Authentication', () => {
  let authService: any;
  let mockCognitoClient: jest.Mocked<CognitoIdentityProviderClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock Cognito client
    mockCognitoClient = {
      send: jest.fn().mockResolvedValue({}),
    } as any;

    // Mock the CognitoIdentityProviderClient constructor
    (CognitoIdentityProviderClient as jest.MockedClass<typeof CognitoIdentityProviderClient>)
      .mockImplementation(() => mockCognitoClient);

    // Create auth service instance
    authService = new (CognitoAuthService as any)();
  });

  describe('Customer Registration', () => {
    const mockRegistrationData: CustomerRegistration = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      name: 'Test User',
      phone: '+1234567890',
      customerType: CustomerTier.INDIVIDUAL,
      agreeToTerms: true,
      marketingOptIn: false,
    };

    it('should successfully register a new customer', async () => {
      // Mock successful registration response
      mockCognitoClient.send.mockResolvedValueOnce({
        UserSub: 'test-user-id',
        UserConfirmed: false,
      });

      // Mock successful group assignment
      mockCognitoClient.send.mockResolvedValueOnce({});

      const result = await authService.customerRegister(mockRegistrationData);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Registration successful');
      expect(result.requiresVerification).toBe(true);

      // Verify SignUpCommand was called with correct parameters
      expect(mockCognitoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            ClientId: 'test-customer-client',
            Username: 'test@example.com',
            Password: 'TestPassword123!',
            UserAttributes: expect.arrayContaining([
              { Name: 'email', Value: 'test@example.com' },
              { Name: 'name', Value: 'Test User' },
              { Name: 'custom:customer_type', Value: CustomerTier.INDIVIDUAL },
              { Name: 'phone_number', Value: '+1234567890' },
            ]),
          }),
        })
      );

      // Verify group assignment was called
      expect(mockCognitoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            UserPoolId: 'test-customer-pool',
            Username: 'test@example.com',
            GroupName: 'individual-customers',
          }),
        })
      );
    });

    it('should handle registration with different customer tiers', async () => {
      const dealerRegistration = {
        ...mockRegistrationData,
        customerType: CustomerTier.DEALER,
      };

      mockCognitoClient.send.mockResolvedValueOnce({
        UserSub: 'test-dealer-id',
        UserConfirmed: false,
      });
      mockCognitoClient.send.mockResolvedValueOnce({});

      const result = await authService.customerRegister(dealerRegistration);

      expect(result.success).toBe(true);

      // Verify dealer group assignment
      expect(mockCognitoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            GroupName: 'dealer-customers',
          }),
        })
      );
    });

    it('should handle premium customer registration', async () => {
      const premiumRegistration = {
        ...mockRegistrationData,
        customerType: CustomerTier.PREMIUM,
      };

      mockCognitoClient.send.mockResolvedValueOnce({
        UserSub: 'test-premium-id',
        UserConfirmed: false,
      });
      mockCognitoClient.send.mockResolvedValueOnce({});

      const result = await authService.customerRegister(premiumRegistration);

      expect(result.success).toBe(true);

      // Verify premium group assignment
      expect(mockCognitoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            GroupName: 'premium-customers',
          }),
        })
      );
    });

    it('should handle registration errors', async () => {
      mockCognitoClient.send.mockRejectedValueOnce({
        name: 'UsernameExistsException',
        message: 'User already exists',
      });

      const result = await authService.customerRegister(mockRegistrationData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User with this email already exists');
    });
  });

  describe('Customer Login', () => {
    it('should successfully authenticate a customer', async () => {
      // Mock successful authentication response
      mockCognitoClient.send.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'mock-access-token',
          RefreshToken: 'mock-refresh-token',
          IdToken: 'mock-id-token',
          ExpiresIn: 3600,
        },
      });

      // Mock user details response
      mockCognitoClient.send.mockResolvedValueOnce({
        Username: 'test-user-id',
        UserAttributes: [
          { Name: 'email', Value: 'test@example.com' },
          { Name: 'name', Value: 'Test User' },
          { Name: 'custom:customer_type', Value: CustomerTier.INDIVIDUAL },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'phone_number_verified', Value: 'false' },
        ],
      });

      const result = await authService.customerLogin('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(result.tokens?.accessToken).toBe('mock-access-token');
      expect(result.tokens?.refreshToken).toBe('mock-refresh-token');
      expect(result.customer).toBeDefined();
      expect(result.customer?.email).toBe('test@example.com');
      expect(result.customer?.customerType).toBe(CustomerTier.INDIVIDUAL);
    });

    it('should handle MFA challenge during login', async () => {
      // Mock MFA challenge response
      mockCognitoClient.send.mockResolvedValueOnce({
        ChallengeName: 'SOFTWARE_TOKEN_MFA',
        Session: 'mock-mfa-session',
      });

      const result = await authService.customerLogin('test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.requiresMFA).toBe(true);
      expect(result.mfaToken).toBe('mock-mfa-session');
    });

    it('should handle invalid credentials', async () => {
      mockCognitoClient.send.mockRejectedValueOnce({
        name: 'NotAuthorizedException',
        message: 'Incorrect username or password',
      });

      const result = await authService.customerLogin('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(result.errorCode).toBe('NotAuthorizedException');
    });

    it('should handle unconfirmed user', async () => {
      mockCognitoClient.send.mockRejectedValueOnce({
        name: 'UserNotConfirmedException',
        message: 'User is not confirmed',
      });

      const result = await authService.customerLogin('test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Please verify your email address before logging in');
    });
  });

  describe('Customer Token Validation', () => {
    const mockToken = 'mock.jwt.token';
    const mockVerifiedToken = {
      sub: 'test-user-id',
      email: 'test@example.com',
      email_verified: true,
      name: 'Test User',
      'custom:customer_type': CustomerTier.DEALER,
      'cognito:groups': ['dealer-customers'],
      iss: 'https://cognito-idp.us-east-1.amazonaws.com/test-customer-pool',
      aud: 'test-customer-client',
      token_use: 'access',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    beforeEach(() => {
      (validateJWTToken as jest.MockedFunction<typeof validateJWTToken>)
        .mockResolvedValue(mockVerifiedToken);
    });

    it('should successfully validate a customer token', async () => {
      const claims = await authService.validateCustomerToken(mockToken);

      expect(claims).toBeDefined();
      expect(claims.sub).toBe('test-user-id');
      expect(claims.email).toBe('test@example.com');
      expect(claims['custom:customer_type']).toBe(CustomerTier.DEALER);
      expect(claims.permissions).toEqual(CUSTOMER_PERMISSIONS[CustomerTier.DEALER]);

      // Verify JWT validation was called with correct parameters
      expect(validateJWTToken).toHaveBeenCalledWith(
        mockToken,
        'test-customer-pool',
        'test-customer-client',
        'us-east-1',
        'http://localhost:4566'
      );
    });

    it('should extract correct permissions for individual customers', async () => {
      const individualToken = {
        ...mockVerifiedToken,
        'custom:customer_type': CustomerTier.INDIVIDUAL,
        'cognito:groups': ['individual-customers'],
      };

      (validateJWTToken as jest.MockedFunction<typeof validateJWTToken>)
        .mockResolvedValue(individualToken);

      const claims = await authService.validateCustomerToken(mockToken);

      expect(claims.permissions).toEqual(CUSTOMER_PERMISSIONS[CustomerTier.INDIVIDUAL]);
      expect(claims.permissions).toContain('view_listings');
      expect(claims.permissions).toContain('create_inquiry');
      expect(claims.permissions).not.toContain('create_listing');
    });

    it('should extract correct permissions for dealer customers', async () => {
      const claims = await authService.validateCustomerToken(mockToken);

      expect(claims.permissions).toEqual(CUSTOMER_PERMISSIONS[CustomerTier.DEALER]);
      expect(claims.permissions).toContain('view_listings');
      expect(claims.permissions).toContain('create_listing');
      expect(claims.permissions).toContain('dealer_analytics');
      expect(claims.permissions).not.toContain('premium_support');
    });

    it('should extract correct permissions for premium customers', async () => {
      const premiumToken = {
        ...mockVerifiedToken,
        'custom:customer_type': CustomerTier.PREMIUM,
        'cognito:groups': ['premium-customers'],
      };

      (validateJWTToken as jest.MockedFunction<typeof validateJWTToken>)
        .mockResolvedValue(premiumToken);

      const claims = await authService.validateCustomerToken(mockToken);

      expect(claims.permissions).toEqual(CUSTOMER_PERMISSIONS[CustomerTier.PREMIUM]);
      expect(claims.permissions).toContain('premium_support');
      expect(claims.permissions).toContain('advanced_search');
      expect(claims.permissions).toContain('export_data');
    });

    it('should handle invalid tokens', async () => {
      (validateJWTToken as jest.MockedFunction<typeof validateJWTToken>)
        .mockRejectedValue(new Error('Invalid token'));

      await expect(authService.validateCustomerToken(mockToken))
        .rejects.toThrow('Invalid customer token');
    });
  });

  describe('Customer Token Refresh', () => {
    it('should successfully refresh customer tokens', async () => {
      mockCognitoClient.send.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'new-access-token',
          IdToken: 'new-id-token',
          ExpiresIn: 3600,
        },
      });

      const tokens = await authService.customerRefreshToken('mock-refresh-token');

      expect(tokens.accessToken).toBe('new-access-token');
      expect(tokens.refreshToken).toBe('mock-refresh-token'); // Refresh token doesn't change
      expect(tokens.idToken).toBe('new-id-token');
      expect(tokens.tokenType).toBe('Bearer');
      expect(tokens.expiresIn).toBe(3600);

      // Verify correct command was sent
      expect(mockCognitoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            UserPoolId: 'test-customer-pool',
            ClientId: 'test-customer-client',
            AuthFlow: 'REFRESH_TOKEN_AUTH',
            AuthParameters: {
              REFRESH_TOKEN: 'mock-refresh-token',
            },
          }),
        })
      );
    });

    it('should handle refresh token errors', async () => {
      mockCognitoClient.send.mockRejectedValueOnce({
        name: 'NotAuthorizedException',
        message: 'Refresh token is expired',
      });

      await expect(authService.customerRefreshToken('invalid-refresh-token'))
        .rejects.toThrow('Token refresh failed');
    });
  });

  describe('Customer Password Reset', () => {
    it('should successfully initiate password reset', async () => {
      mockCognitoClient.send.mockResolvedValueOnce({});

      const result = await authService.customerForgotPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Password reset code sent');

      expect(mockCognitoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            ClientId: 'test-customer-client',
            Username: 'test@example.com',
          }),
        })
      );
    });

    it('should successfully confirm password reset', async () => {
      mockCognitoClient.send.mockResolvedValueOnce({});

      const result = await authService.customerConfirmForgotPassword(
        'test@example.com',
        '123456',
        'NewPassword123!'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Password reset successfully');

      expect(mockCognitoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            ClientId: 'test-customer-client',
            Username: 'test@example.com',
            ConfirmationCode: '123456',
            Password: 'NewPassword123!',
          }),
        })
      );
    });
  });

  describe('Customer Email Verification', () => {
    it('should successfully confirm sign up', async () => {
      mockCognitoClient.send.mockResolvedValueOnce({});

      const result = await authService.customerConfirmSignUp('test@example.com', '123456');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Email verified successfully');

      expect(mockCognitoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            ClientId: 'test-customer-client',
            Username: 'test@example.com',
            ConfirmationCode: '123456',
          }),
        })
      );
    });

    it('should successfully resend confirmation code', async () => {
      mockCognitoClient.send.mockResolvedValueOnce({});

      const result = await authService.customerResendConfirmation('test@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Confirmation code resent');

      expect(mockCognitoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            ClientId: 'test-customer-client',
            Username: 'test@example.com',
          }),
        })
      );
    });
  });

  describe('Customer Logout', () => {
    it('should successfully logout customer', async () => {
      mockCognitoClient.send.mockResolvedValueOnce({});

      const result = await authService.logout('mock-access-token', 'customer');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');

      expect(mockCognitoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            AccessToken: 'mock-access-token',
          }),
        })
      );
    });
  });

  describe('Permission Extraction', () => {
    it('should correctly map individual customer permissions', () => {
      const permissions = CUSTOMER_PERMISSIONS[CustomerTier.INDIVIDUAL];
      
      expect(permissions).toContain('view_listings');
      expect(permissions).toContain('create_inquiry');
      expect(permissions).toContain('manage_profile');
      expect(permissions).not.toContain('create_listing');
      expect(permissions).not.toContain('premium_support');
    });

    it('should correctly map dealer customer permissions', () => {
      const permissions = CUSTOMER_PERMISSIONS[CustomerTier.DEALER];
      
      expect(permissions).toContain('view_listings');
      expect(permissions).toContain('create_listing');
      expect(permissions).toContain('dealer_analytics');
      expect(permissions).toContain('bulk_operations');
      expect(permissions).not.toContain('premium_support');
      expect(permissions).not.toContain('advanced_search');
    });

    it('should correctly map premium customer permissions', () => {
      const permissions = CUSTOMER_PERMISSIONS[CustomerTier.PREMIUM];
      
      expect(permissions).toContain('view_listings');
      expect(permissions).toContain('create_listing');
      expect(permissions).toContain('premium_analytics');
      expect(permissions).toContain('advanced_search');
      expect(permissions).toContain('premium_support');
      expect(permissions).toContain('export_data');
    });
  });
});