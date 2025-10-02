import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
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
  withAdminAuth: jest.fn((permissions) => (handler) => handler),
  withRateLimit: jest.fn((max, window) => (handler) => handler),
  withAuditLog: jest.fn((action, resource) => (handler) => handler),
  compose: jest.fn((...middlewares) => (handler) => handler),
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
    from: jest.fn(() => mockDocClient)
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

  describe('CORS Handling', () => {
    it('should handle OPTIONS requests', async () => {
      const event = {
        httpMethod: 'OPTIONS',
        path: '/admin/dashboard',
        requestContext: mockRequestContext,
        headers: {}
      } as APIGatewayProxyEvent;

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
    });
  });

  describe('Admin Authentication Verification', () => {
    it('should verify admin authentication successfully', async () => {
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

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/admin/auth/verify',
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.user.id).toBe('admin-user-id');
      expect(body.permissions).toEqual([AdminPermission.USER_MANAGEMENT]);
      expect(body.sessionInfo.sessionId).toBe('session-123');
    });

    it('should reject inactive admin accounts', async () => {
      const mockUser = {
        id: 'admin-user-id',
        status: UserStatus.SUSPENDED,
        role: UserRole.ADMIN
      };

      mockDocClient.send.mockResolvedValueOnce({
        Item: mockUser
      });

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/admin/auth/verify',
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('ACCOUNT_INACTIVE');
    });
  });

  describe('Dashboard Metrics', () => {
    it('should return dashboard metrics successfully', async () => {
      // Mock user stats
      mockDocClient.send
        .mockResolvedValueOnce({ Count: 150 }) // total users
        .mockResolvedValueOnce({ Count: 120 }) // active users
        .mockResolvedValueOnce({ Count: 5 })   // new users today
        .mockResolvedValueOnce({ Count: 75 })  // total listings
        .mockResolvedValueOnce({ Count: 60 }); // active listings

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/dashboard',
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.metrics.totalUsers).toBe(150);
      expect(body.metrics.activeUsers).toBe(120);
      expect(body.metrics.newUsersToday).toBe(5);
      expect(body.metrics.totalListings).toBe(75);
      expect(body.metrics.activeListings).toBe(60);
      expect(body.systemHealth).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      mockDocClient.send.mockRejectedValue(new Error('Database error'));

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/dashboard',
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('User Management', () => {
    it('should return paginated user list', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User One',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          createdAt: '2023-01-01T00:00:00Z'
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          name: 'User Two',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          createdAt: '2023-01-02T00:00:00Z'
        }
      ];

      mockDocClient.send.mockResolvedValueOnce({
        Items: mockUsers
      });

      const event: Partial<APIGatewayProxyEvent> = {
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
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.users).toHaveLength(2);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.total).toBe(2);
    });

    it('should filter users by status', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          status: UserStatus.ACTIVE
        }
      ];

      mockDocClient.send.mockResolvedValueOnce({
        Items: mockUsers
      });

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/users',
        queryStringParameters: {
          status: UserStatus.ACTIVE
        },
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.users).toHaveLength(1);
    });

    it('should get user details with activity', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User One',
        role: UserRole.USER,
        status: UserStatus.ACTIVE
      };

      const mockActivity = [
        {
          id: 'activity-1',
          action: 'LOGIN',
          timestamp: '2023-01-01T00:00:00Z'
        }
      ];

      const mockSessions = [
        {
          sessionId: 'session-1',
          isActive: true,
          lastActivity: '2023-01-01T00:00:00Z'
        }
      ];

      mockDocClient.send
        .mockResolvedValueOnce({ Item: mockUser })
        .mockResolvedValueOnce({ Items: mockActivity })
        .mockResolvedValueOnce({ Items: mockSessions });

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/users/user-1',
        pathParameters: {
          userId: 'user-1'
        },
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.user.id).toBe('user-1');
      expect(body.activity).toHaveLength(1);
      expect(body.sessions).toHaveLength(1);
    });

    it('should update user status', async () => {
      const mockUser = {
        id: 'user-1',
        status: UserStatus.ACTIVE
      };

      mockDocClient.send
        .mockResolvedValueOnce({ Item: mockUser })
        .mockResolvedValueOnce({}); // Update command

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'PUT',
        path: '/admin/users/user-1/status',
        pathParameters: {
          userId: 'user-1'
        },
        body: JSON.stringify({
          status: UserStatus.SUSPENDED,
          reason: 'Policy violation'
        }),
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('User status updated successfully');
      expect(body.newStatus).toBe(UserStatus.SUSPENDED);
    });
  });

  describe('Listing Management', () => {
    it('should return paginated listings', async () => {
      const mockListings = [
        {
          listingId: 'listing-1',
          title: 'Boat 1',
          status: 'active',
          createdAt: '2023-01-01T00:00:00Z'
        }
      ];

      mockDocClient.send.mockResolvedValueOnce({
        Items: mockListings
      });

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/listings',
        queryStringParameters: {
          page: '1',
          limit: '20'
        },
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.listings).toHaveLength(1);
    });

    it('should moderate a listing', async () => {
      mockDocClient.send.mockResolvedValueOnce({}); // Update command

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'PUT',
        path: '/admin/listings/listing-1/moderate',
        pathParameters: {
          listingId: 'listing-1'
        },
        body: JSON.stringify({
          action: 'approve',
          reason: 'Content approved'
        }),
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Listing moderated successfully');
      expect(body.action).toBe('approve');
    });
  });

  describe('System Health', () => {
    it('should return system health status', async () => {
      mockDocClient.send.mockResolvedValueOnce({
        Items: []
      });

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/system/health',
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('healthy');
      expect(body.services.database).toBe('healthy');
      expect(body.services.api).toBe('healthy');
    });

    it('should detect unhealthy database', async () => {
      mockDocClient.send.mockRejectedValue(new Error('Database connection failed'));

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/system/health',
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('degraded');
      expect(body.services.database).toBe('unhealthy');
    });
  });

  describe('Audit Logs', () => {
    it('should return paginated audit logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          action: 'LOGIN',
          timestamp: '2023-01-01T00:00:00Z'
        }
      ];

      mockDocClient.send.mockResolvedValueOnce({
        Items: mockLogs
      });

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/audit-logs',
        queryStringParameters: {
          page: '1',
          limit: '50'
        },
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.auditLogs).toHaveLength(1);
    });

    it('should filter audit logs by user', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          action: 'LOGIN'
        }
      ];

      mockDocClient.send.mockResolvedValueOnce({
        Items: mockLogs
      });

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/audit-logs',
        queryStringParameters: {
          userId: 'user-1'
        },
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.auditLogs).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/unknown',
        requestContext: mockRequestContext,
        headers: {}
      };

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should handle missing path parameters', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/users/',
        pathParameters: null,
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('MISSING_USER_ID');
    });

    it('should handle invalid JSON in request body', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'PUT',
        path: '/admin/users/user-1/status',
        pathParameters: {
          userId: 'user-1'
        },
        body: 'invalid json',
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(500);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to endpoints', async () => {
      // This test verifies that rate limiting middleware is applied
      // The actual rate limiting logic is tested in middleware tests
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/dashboard',
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        user: mockAdminUser
      };

      // Mock the middleware to simulate rate limit exceeded
      const { withRateLimit } = require('../shared/middleware');
      withRateLimit.mockImplementationOnce(() => () => {
        throw new Error('Rate limit exceeded');
      });

      await expect(handler(event as any)).rejects.toThrow('Rate limit exceeded');
    });
  });
});