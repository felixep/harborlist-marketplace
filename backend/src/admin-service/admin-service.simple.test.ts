import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './index';
import { UserRole, UserStatus, AdminPermission } from '../types/common';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

// Mock dependencies
jest.mock('../shared/utils', () => ({
  createResponse: jest.fn((statusCode, body) => ({
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify(body)
  })),
  createErrorResponse: jest.fn((statusCode, code, message, requestId) => ({
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify({
      error: {
        code,
        message,
        requestId
      }
    })
  }))
}));

jest.mock('../shared/middleware', () => ({
  withAdminAuth: jest.fn(() => (handler: any) => handler),
  withRateLimit: jest.fn(() => (handler: any) => handler),
  withAuditLog: jest.fn(() => (handler: any) => handler),
  compose: jest.fn((...middlewares: any[]) => (handler: any) => handler),
  createValidator: jest.fn(() => () => ({ valid: true, errors: [] })),
  validators: {
    required: jest.fn(() => true),
    email: jest.fn(() => true),
    uuid: jest.fn(() => true)
  }
}));

// Mock DynamoDB responses
const mockDocClient = {
  send: jest.fn()
};

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({
      send: jest.fn()
    }))
  },
  ScanCommand: jest.fn(),
  QueryCommand: jest.fn(),
  GetCommand: jest.fn(),
  UpdateCommand: jest.fn(),
  PutCommand: jest.fn()
}));

describe('Admin Service', () => {
  const mockRequestContext = {
    requestId: 'test-request-id',
    identity: {
      sourceIp: '127.0.0.1'
    }
  };

  const mockAdminUser = {
    sub: 'admin-user-id',
    email: 'admin@example.com',
    name: 'Admin User',
    role: UserRole.ADMIN,
    permissions: [AdminPermission.USER_MANAGEMENT, AdminPermission.ANALYTICS_VIEW],
    sessionId: 'session-123',
    deviceId: 'device-123',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.USERS_TABLE = 'test-users';
    process.env.LISTINGS_TABLE = 'test-listings';
    process.env.AUDIT_LOGS_TABLE = 'test-audit-logs';
    process.env.SESSIONS_TABLE = 'test-sessions';
  });

  describe('Basic Functionality', () => {
    it('should handle OPTIONS requests for CORS', async () => {
      const event = {
        httpMethod: 'OPTIONS',
        path: '/admin/dashboard',
        requestContext: mockRequestContext,
        headers: {}
      } as any;

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should return 404 for unknown endpoints', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/admin/unknown',
        requestContext: mockRequestContext,
        headers: {}
      } as any;

      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should handle admin auth verification', async () => {
      const mockUser = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        name: 'Admin User',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        permissions: [AdminPermission.USER_MANAGEMENT],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      mockDocClient.send.mockResolvedValueOnce({
        Item: mockUser
      });

      const event = {
        httpMethod: 'POST',
        path: '/admin/auth/verify',
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      } as any;

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.user.id).toBe('admin-user-id');
      expect(body.permissions).toEqual([AdminPermission.USER_MANAGEMENT]);
    });

    it('should handle dashboard metrics request', async () => {
      // Mock user stats
      mockDocClient.send
        .mockResolvedValueOnce({ Count: 150 }) // total users
        .mockResolvedValueOnce({ Count: 120 }) // active users
        .mockResolvedValueOnce({ Count: 5 })   // new users today
        .mockResolvedValueOnce({ Count: 75 })  // total listings
        .mockResolvedValueOnce({ Count: 60 }); // active listings

      const event = {
        httpMethod: 'GET',
        path: '/admin/dashboard',
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      } as any;

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.metrics.totalUsers).toBe(150);
      expect(body.metrics.activeUsers).toBe(120);
      expect(body.systemHealth).toBeDefined();
    });

    it('should handle user list request', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User One',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          createdAt: '2023-01-01T00:00:00Z'
        }
      ];

      mockDocClient.send.mockResolvedValueOnce({
        Items: mockUsers
      });

      const event = {
        httpMethod: 'GET',
        path: '/admin/users',
        queryStringParameters: {
          page: '1',
          limit: '20'
        },
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      } as any;

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.users).toHaveLength(1);
      expect(body.pagination.page).toBe(1);
    });

    it('should handle system health check', async () => {
      mockDocClient.send.mockResolvedValueOnce({
        Items: []
      });

      const event = {
        httpMethod: 'GET',
        path: '/admin/system/health',
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      } as any;

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('healthy');
      expect(body.services.database).toBe('healthy');
      expect(body.services.api).toBe('healthy');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDocClient.send.mockRejectedValue(new Error('Database error'));

      const event = {
        httpMethod: 'GET',
        path: '/admin/dashboard',
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      } as any;

      const result = await handler(event);
      
      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle missing path parameters', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/admin/users/',
        pathParameters: null,
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      } as any;

      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('MISSING_USER_ID');
    });
  });
});