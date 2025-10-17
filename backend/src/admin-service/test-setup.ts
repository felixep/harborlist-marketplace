// Test setup file for admin service tests
import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.AWS_REGION = 'us-east-1';
process.env.USERS_TABLE = 'test-users';
process.env.LISTINGS_TABLE = 'test-listings';
process.env.SESSIONS_TABLE = 'test-sessions';
process.env.AUDIT_LOGS_TABLE = 'test-audit-logs';
process.env.LOGIN_ATTEMPTS_TABLE = 'test-login-attempts';
// JWT_SECRET no longer needed - using Cognito token verification

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log during tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock AWS SDK globally
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({})),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({
      send: jest.fn(),
    })),
  },
  ScanCommand: jest.fn(),
  QueryCommand: jest.fn(),
  GetCommand: jest.fn(),
  UpdateCommand: jest.fn(),
  PutCommand: jest.fn(),
}));

// Mock bcryptjs for password hashing
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({
    sub: 'user-id',
    email: 'user@example.com',
    name: 'Test User',
    role: 'user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  }),
  TokenExpiredError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'TokenExpiredError';
    }
  },
  JsonWebTokenError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'JsonWebTokenError';
    }
  },
}));

// Setup and teardown
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Helper functions for tests
export const createMockEvent = (overrides: any = {}) => ({
  httpMethod: 'GET',
  path: '/admin/test',
  headers: {},
  queryStringParameters: null,
  pathParameters: null,
  body: null,
  requestContext: {
    requestId: 'test-request-id',
    identity: {
      sourceIp: '127.0.0.1',
    },
  },
  ...overrides,
});

export const createMockAdminUser = (overrides: any = {}) => ({
  sub: 'admin-user-id',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin',
  permissions: ['user_management', 'analytics_view'],
  sessionId: 'session-123',
  deviceId: 'device-123',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  ...overrides,
});

export const createMockUser = (overrides: any = {}) => ({
  id: 'user-123',
  email: 'user@example.com',
  name: 'Test User',
  role: 'user',
  status: 'active',
  emailVerified: true,
  phoneVerified: false,
  mfaEnabled: false,
  loginAttempts: 0,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockListing = (overrides: any = {}) => ({
  listingId: 'listing-123',
  ownerId: 'user-123',
  title: 'Test Boat',
  description: 'A test boat listing',
  price: 50000,
  status: 'active',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockAuditLog = (overrides: any = {}) => ({
  id: 'audit-123',
  userId: 'user-123',
  userEmail: 'user@example.com',
  action: 'TEST_ACTION',
  resource: 'test_resource',
  details: {},
  ipAddress: '127.0.0.1',
  userAgent: 'test-agent',
  timestamp: '2023-01-01T00:00:00Z',
  sessionId: 'session-123',
  ...overrides,
});