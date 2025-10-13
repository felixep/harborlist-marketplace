/**
 * @fileoverview Test setup for auth service tests
 * 
 * Configures global test environment, mocks, and utilities
 * for AWS Cognito dual-pool authentication service tests.
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import { jest } from '@jest/globals';

// Global test configuration
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.ENVIRONMENT = 'local';
  process.env.AWS_REGION = 'us-east-1';
  process.env.CUSTOMER_USER_POOL_ID = 'test-customer-pool';
  process.env.CUSTOMER_USER_POOL_CLIENT_ID = 'test-customer-client';
  process.env.STAFF_USER_POOL_ID = 'test-staff-pool';
  process.env.STAFF_USER_POOL_CLIENT_ID = 'test-staff-client';
  process.env.LOCALSTACK_ENDPOINT = 'http://localhost:4566';
});

// Global test cleanup
afterAll(() => {
  jest.clearAllMocks();
});

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock fetch for JWKS requests
global.fetch = jest.fn();

// Utility functions for tests
export const createMockCognitoResponse = (overrides: any = {}) => ({
  $metadata: {
    httpStatusCode: 200,
    requestId: 'test-request-id',
  },
  ...overrides,
});

export const createMockJWTToken = (payload: any = {}) => {
  const header = {
    alg: 'RS256',
    kid: 'test-key-id',
    typ: 'JWT',
  };

  const defaultPayload = {
    sub: 'test-user-id',
    email: 'test@example.com',
    email_verified: true,
    name: 'Test User',
    'custom:customer_type': 'individual',
    'cognito:groups': ['individual-customers'],
    iss: 'https://cognito-idp.us-east-1.amazonaws.com/test-customer-pool',
    aud: 'test-customer-client',
    token_use: 'access',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...payload,
  };

  // Create a mock JWT token (not actually signed)
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(defaultPayload)).toString('base64url');
  const signature = 'mock-signature';

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

export const createMockJWKS = () => ({
  keys: [
    {
      kid: 'test-key-id',
      kty: 'RSA',
      use: 'sig',
      n: 'mock-modulus',
      e: 'AQAB',
      alg: 'RS256',
    },
  ],
});

// Mock AWS SDK responses
export const mockCognitoResponses = {
  signUp: {
    UserSub: 'test-user-id',
    UserConfirmed: false,
  },
  adminInitiateAuth: {
    AuthenticationResult: {
      AccessToken: 'mock-access-token',
      RefreshToken: 'mock-refresh-token',
      IdToken: 'mock-id-token',
      ExpiresIn: 3600,
    },
  },
  getUser: {
    Username: 'test-user-id',
    UserAttributes: [
      { Name: 'email', Value: 'test@example.com' },
      { Name: 'name', Value: 'Test User' },
      { Name: 'custom:customer_type', Value: 'individual' },
      { Name: 'email_verified', Value: 'true' },
    ],
  },
  mfaChallenge: {
    ChallengeName: 'SOFTWARE_TOKEN_MFA',
    Session: 'mock-mfa-session',
  },
};

// Test data factories
export const createCustomerRegistrationData = (overrides: any = {}) => ({
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User',
  phone: '+1234567890',
  customerType: 'individual' as const,
  agreeToTerms: true,
  marketingOptIn: false,
  ...overrides,
});

export const createStaffRegistrationData = (overrides: any = {}) => ({
  email: 'admin@example.com',
  temporaryPassword: 'TempPassword123!',
  name: 'Admin User',
  role: 'admin' as const,
  permissions: ['user_management', 'content_moderation'],
  team: 'operations',
  requireMFA: true,
  ...overrides,
});

// Error simulation utilities
export const createCognitoError = (name: string, message: string) => {
  const error = new Error(message);
  error.name = name;
  return error;
};

export const commonCognitoErrors = {
  notAuthorized: createCognitoError('NotAuthorizedException', 'Incorrect username or password'),
  userNotConfirmed: createCognitoError('UserNotConfirmedException', 'User is not confirmed'),
  userNotFound: createCognitoError('UserNotFoundException', 'User does not exist'),
  usernameExists: createCognitoError('UsernameExistsException', 'An account with the given email already exists'),
  invalidPassword: createCognitoError('InvalidPasswordException', 'Password does not meet requirements'),
  codeMismatch: createCognitoError('CodeMismatchException', 'Invalid verification code provided'),
  expiredCode: createCognitoError('ExpiredCodeException', 'Invalid code provided, please request a code again'),
  tooManyRequests: createCognitoError('TooManyRequestsException', 'Attempt limit exceeded, please try after some time'),
};