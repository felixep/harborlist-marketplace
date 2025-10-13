/**
 * @fileoverview Unit tests for Lambda authorizers
 * 
 * Tests the customer and staff API Gateway Lambda authorizers to ensure
 * proper JWT validation, cross-pool access prevention, and policy generation.
 */

import { APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import { handler as customerHandler } from '../customer-authorizer';
import { handler as staffHandler } from '../staff-authorizer';

// Mock the JWT validation utility
jest.mock('../../../backend/src/auth-service/jwt-utils', () => ({
  validateJWTToken: jest.fn(),
}));

import { validateJWTToken } from '../../../backend/src/auth-service/jwt-utils';

describe('Customer Authorizer', () => {
  const mockEvent: APIGatewayTokenAuthorizerEvent = {
    type: 'TOKEN',
    authorizationToken: 'Bearer valid-customer-token',
    methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/api/customer/profile',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CUSTOMER_USER_POOL_ID = 'test-customer-pool';
    process.env.CUSTOMER_USER_POOL_CLIENT_ID = 'test-customer-client';
    process.env.AWS_REGION = 'us-east-1';
    process.env.ENVIRONMENT = 'test';
  });

  it('should allow valid customer token', async () => {
    const mockVerifiedToken = {
      sub: 'customer-123',
      email: 'customer@example.com',
      email_verified: true,
      name: 'Test Customer',
      'custom:customer_type': 'individual',
      'cognito:groups': ['individual-customers'],
      token_use: 'access',
      iss: 'https://cognito-idp.us-east-1.amazonaws.com/test-customer-pool',
      aud: 'test-customer-client',
      iat: Math.floor(Date.now() / 1000) - 300, // 5 minutes ago
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };

    (validateJWTToken as jest.Mock).mockResolvedValue(mockVerifiedToken);

    const result = await customerHandler(mockEvent);

    expect(result.principalId).toBe('customer-123');
    expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    expect(result.context?.customerType).toBe('individual');
  });

  it('should deny staff token (cross-pool access)', async () => {
    const mockStaffToken = {
      sub: 'staff-123',
      email: 'staff@example.com',
      'custom:permissions': '["user_management"]',
      token_use: 'access',
      iat: Math.floor(Date.now() / 1000) - 300,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    (validateJWTToken as jest.Mock).mockResolvedValue(mockStaffToken);

    const result = await customerHandler(mockEvent);

    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    expect(result.context?.errorCode).toBe('CROSS_POOL_ACCESS');
  });

  it('should deny invalid token format', async () => {
    const invalidEvent = {
      ...mockEvent,
      authorizationToken: 'InvalidToken',
    };

    const result = await customerHandler(invalidEvent);

    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    expect(result.context?.errorCode).toBe('INVALID_TOKEN_FORMAT');
  });
});

describe('Staff Authorizer', () => {
  const mockEvent: APIGatewayTokenAuthorizerEvent = {
    type: 'TOKEN',
    authorizationToken: 'Bearer valid-staff-token',
    methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/api/admin/dashboard',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STAFF_USER_POOL_ID = 'test-staff-pool';
    process.env.STAFF_USER_POOL_CLIENT_ID = 'test-staff-client';
    process.env.AWS_REGION = 'us-east-1';
    process.env.ENVIRONMENT = 'test';
    process.env.STAFF_SESSION_TTL = '28800'; // 8 hours
  });

  it('should allow valid staff token', async () => {
    const mockVerifiedToken = {
      sub: 'staff-123',
      email: 'staff@example.com',
      email_verified: true,
      name: 'Test Staff',
      'custom:permissions': '["user_management", "content_moderation"]',
      'cognito:groups': ['admin'],
      token_use: 'access',
      iss: 'https://cognito-idp.us-east-1.amazonaws.com/test-staff-pool',
      aud: 'test-staff-client',
      iat: Math.floor(Date.now() / 1000) - 300, // 5 minutes ago
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };

    (validateJWTToken as jest.Mock).mockResolvedValue(mockVerifiedToken);

    const result = await staffHandler(mockEvent);

    expect(result.principalId).toBe('staff-123');
    expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    expect(result.context?.role).toBe('admin');
  });

  it('should deny customer token (cross-pool access)', async () => {
    const mockCustomerToken = {
      sub: 'customer-123',
      email: 'customer@example.com',
      'custom:customer_type': 'individual',
      token_use: 'access',
      iat: Math.floor(Date.now() / 1000) - 300,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    (validateJWTToken as jest.Mock).mockResolvedValue(mockCustomerToken);

    const result = await staffHandler(mockEvent);

    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    expect(result.context?.errorCode).toBe('CROSS_POOL_ACCESS');
  });

  it('should deny expired staff session', async () => {
    const mockOldToken = {
      sub: 'staff-123',
      email: 'staff@example.com',
      'custom:permissions': '["user_management"]',
      'cognito:groups': ['admin'],
      token_use: 'access',
      iat: Math.floor(Date.now() / 1000) - 30000, // 8+ hours ago
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    (validateJWTToken as jest.Mock).mockResolvedValue(mockOldToken);

    const result = await staffHandler(mockEvent);

    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    expect(result.context?.errorCode).toBe('SESSION_EXPIRED');
  });
});