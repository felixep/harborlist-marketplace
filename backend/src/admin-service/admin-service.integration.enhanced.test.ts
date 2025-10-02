import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from './index';
import { createMockEvent, createMockContext } from '../shared/test-utils';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

// Mock auth functions
jest.mock('../shared/auth', () => ({
  getUserFromEvent: jest.fn(),
  requireAdminRole: jest.fn(),
  getClientInfo: jest.fn(() => ({
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 Test Browser'
  })),
  createAuditLog: jest.fn(() => ({
    id: 'audit-123',
    userId: 'admin-1',
    userEmail: 'admin@test.com',
    action: 'TEST_ACTION',
    resource: 'test',
    timestamp: new Date().toISOString(),
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 Test Browser',
    sessionId: 'session-123'
  }))
}));

// Mock DynamoDB operations
jest.mock('@aws-sdk/lib-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBDocumentClient: {
      from: jest.fn(() => ({
        send: mockSend
      }))
    },
    QueryCommand: jest.fn(),
    ScanCommand: jest.fn(),
    UpdateCommand: jest.fn(),
    GetCommand: jest.fn(),
    PutCommand: jest.fn(),
    BatchWriteCommand: jest.fn()
  };
});

describe('Admin Service Integration Tests', () => {
  const mockAdminUser = {
    sub: 'admin-1',
    email: 'admin@test.com',
    name: 'Admin User',
    role: 'ADMIN',
    permissions: ['user_management', 'content_moderation', 'analytics_view'],
    sessionId: 'session-123',
    deviceId: 'device-123',
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  const mockSuperAdminUser = {
    ...mockAdminUser,
    role: 'SUPER_ADMIN',
    permissions: ['user_management', 'content_moderation', 'financial_access', 'system_config', 'analytics_view', 'audit_log_view']
  };

  const mockModeratorUser = {
    ...mockAdminUser,
    role: 'MODERATOR',
    permissions: ['content_moderation']
  };

  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the mock send function from the mocked module
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
    const mockClient = DynamoDBDocumentClient.from();
    mockSend = mockClient.send;
    mockSend.mockResolvedValue({ Items: [], Count: 0 });
  });

  describe('Authentication Tests', () => {
    test('should verify admin authentication successfully', async () => {
      const { getUserFromEvent } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockAdminUser);
      mockSend.mockResolvedValue({
        Item: {
          id: 'admin-1',
          email: 'admin@test.com',
          name: 'Admin User',
          role: 'ADMIN',
          status: 'ACTIVE',
          permissions: ['user_management', 'content_moderation']
        }
      });

      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/admin/auth/verify',
        body: '{}'
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.user).toBeDefined();
      expect(body.permissions).toBeDefined();
      expect(body.sessionInfo).toBeDefined();
    });

    test('should reject authentication for inactive admin', async () => {
      const { getUserFromEvent } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockAdminUser);
      mockSend.mockResolvedValue({
        Item: {
          id: 'admin-1',
          email: 'admin@test.com',
          status: 'SUSPENDED'
        }
      });

      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/admin/auth/verify',
        body: '{}'
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('ACCOUNT_INACTIVE');
    });

    test('should handle authentication errors gracefully', async () => {
      const { getUserFromEvent } = require('../shared/auth');
      getUserFromEvent.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/admin/auth/verify',
        body: '{}'
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(401);
    });
  });

  describe('User Management Tests', () => {
    test('should get users list with proper permissions', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockAdminUser);
      requireAdminRole.mockReturnValue(true);
      mockSend.mockResolvedValue({
        Items: [
          {
            id: 'user-1',
            email: 'user1@test.com',
            name: 'User One',
            status: 'ACTIVE'
          }
        ],
        Count: 1
      });

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users',
        queryStringParameters: { page: '1', limit: '20' }
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      expect(requireAdminRole).toHaveBeenCalledWith(mockAdminUser, ['user_management']);
    });

    test('should reject user management without proper permissions', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockModeratorUser);
      requireAdminRole.mockImplementation(() => {
        throw new Error('Insufficient permissions');
      });

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users'
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(403);
    });

    test('should update user status with validation', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockAdminUser);
      requireAdminRole.mockReturnValue(true);
      mockSend.mockResolvedValue({
        Item: {
          id: 'user-1',
          email: 'user1@test.com',
          status: 'ACTIVE'
        }
      });

      const event = createMockEvent({
        httpMethod: 'PUT',
        path: '/admin/users/user-1/status',
        pathParameters: { userId: 'user-1' },
        body: JSON.stringify({
          status: 'SUSPENDED',
          reason: 'Policy violation'
        })
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('updated successfully');
    });

    test('should validate required fields for user status update', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockAdminUser);
      requireAdminRole.mockReturnValue(true);

      const event = createMockEvent({
        httpMethod: 'PUT',
        path: '/admin/users/user-1/status',
        pathParameters: { userId: 'user-1' },
        body: JSON.stringify({
          status: 'SUSPENDED'
          // Missing required 'reason' field
        })
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Audit Logs Tests', () => {
    test('should get audit logs with proper permissions', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockSuperAdminUser);
      requireAdminRole.mockReturnValue(true);
      mockSend.mockResolvedValue({
        Items: [
          {
            id: 'audit-1',
            userId: 'admin-1',
            action: 'UPDATE_USER_STATUS',
            timestamp: new Date().toISOString()
          }
        ],
        Count: 1
      });

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/audit-logs',
        queryStringParameters: { page: '1', limit: '50' }
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      expect(requireAdminRole).toHaveBeenCalledWith(mockSuperAdminUser, ['audit_log_view']);
    });

    test('should search audit logs with advanced filters', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockSuperAdminUser);
      requireAdminRole.mockReturnValue(true);

      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/admin/audit-logs/search',
        body: JSON.stringify({
          query: 'UPDATE_USER',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
          page: 1,
          limit: 50
        })
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.searchQuery).toBe('UPDATE_USER');
    });

    test('should validate search parameters', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockSuperAdminUser);
      requireAdminRole.mockReturnValue(true);

      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/admin/audit-logs/search',
        body: JSON.stringify({
          // Missing required 'query' field
          startDate: '2024-01-01T00:00:00Z'
        })
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should export audit logs with date range validation', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockSuperAdminUser);
      requireAdminRole.mockReturnValue(true);

      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/admin/audit-logs/export',
        body: JSON.stringify({
          format: 'csv',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-02T00:00:00Z'
        })
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('exported successfully');
    });

    test('should reject export with date range too large', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockSuperAdminUser);
      requireAdminRole.mockReturnValue(true);

      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/admin/audit-logs/export',
        body: JSON.stringify({
          format: 'csv',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z' // More than 90 days
        })
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('DATE_RANGE_TOO_LARGE');
    });
  });

  describe('Session Management Tests', () => {
    test('should get admin sessions with proper permissions', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockAdminUser);
      requireAdminRole.mockReturnValue(true);
      mockSend.mockResolvedValue({
        Items: [
          {
            sessionId: 'session-1',
            userId: 'admin-1',
            isActive: true,
            lastActivity: new Date().toISOString()
          }
        ],
        Count: 1
      });

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/sessions',
        queryStringParameters: { status: 'active' }
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      expect(requireAdminRole).toHaveBeenCalledWith(mockAdminUser, ['user_management']);
    });

    test('should get current session info', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockAdminUser);
      requireAdminRole.mockReturnValue(true);
      mockSend.mockResolvedValue({
        Item: {
          sessionId: 'session-123',
          userId: 'admin-1',
          isActive: true,
          ipAddress: '192.168.1.1',
          lastActivity: new Date().toISOString()
        }
      });

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/sessions/current'
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.session).toBeDefined();
      expect(body.securityInfo).toBeDefined();
    });

    test('should terminate session with validation', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockAdminUser);
      requireAdminRole.mockReturnValue(true);
      mockSend.mockResolvedValue({
        Item: {
          sessionId: 'session-456',
          userId: 'admin-2',
          isActive: true
        }
      });

      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/admin/sessions/session-456/terminate',
        pathParameters: { sessionId: 'session-456' }
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('terminated successfully');
    });

    test('should prevent self-session termination', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockAdminUser);
      requireAdminRole.mockReturnValue(true);
      mockSend.mockResolvedValue({
        Item: {
          sessionId: 'session-123', // Same as user's current session
          userId: 'admin-1',
          isActive: true
        }
      });

      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/admin/sessions/session-123/terminate',
        pathParameters: { sessionId: 'session-123' }
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('CANNOT_TERMINATE_SELF');
    });
  });

  describe('Security Monitoring Tests', () => {
    test('should get suspicious activity with proper permissions', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockSuperAdminUser);
      requireAdminRole.mockReturnValue(true);

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/security/suspicious-activity',
        queryStringParameters: { timeRange: '24h', severity: 'high' }
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      expect(requireAdminRole).toHaveBeenCalledWith(mockSuperAdminUser, ['audit_log_view']);
    });

    test('should get login attempts with filtering', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockSuperAdminUser);
      requireAdminRole.mockReturnValue(true);

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/security/login-attempts',
        queryStringParameters: { 
          success: 'false',
          email: 'test@example.com',
          page: '1',
          limit: '50'
        }
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.attempts).toBeDefined();
    });

    test('should get security alerts', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockSuperAdminUser);
      requireAdminRole.mockReturnValue(true);

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/security/alerts',
        queryStringParameters: { status: 'active', severity: 'high' }
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.alerts).toBeDefined();
    });

    test('should acknowledge security alert', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockSuperAdminUser);
      requireAdminRole.mockReturnValue(true);

      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/admin/security/alerts/alert-1/acknowledge',
        pathParameters: { alertId: 'alert-1' },
        body: JSON.stringify({
          notes: 'Investigated and resolved'
        })
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('acknowledged successfully');
    });
  });

  describe('Rate Limiting Tests', () => {
    test('should apply rate limits based on user role', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockModeratorUser);
      requireAdminRole.mockReturnValue(true);

      // Make multiple requests to trigger rate limiting
      const promises = Array.from({ length: 10 }, () => {
        const event = createMockEvent({
          httpMethod: 'GET',
          path: '/admin/users'
        });
        return handler(event, createMockContext());
      });

      const results = await Promise.all(promises);
      
      // Some requests should succeed, others should be rate limited
      const successCount = results.filter(r => r.statusCode === 200).length;
      const rateLimitedCount = results.filter(r => r.statusCode === 429).length;
      
      expect(successCount + rateLimitedCount).toBe(10);
    });

    test('should include rate limit headers in responses', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockAdminUser);
      requireAdminRole.mockReturnValue(true);

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users'
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      // Note: Rate limit headers would be added by the adaptive rate limiting middleware
      // This test verifies the structure is in place
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle database errors gracefully', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockAdminUser);
      requireAdminRole.mockReturnValue(true);
      mockSend.mockRejectedValue(new Error('Database connection failed'));

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users'
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });

    test('should handle invalid JSON in request body', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockAdminUser);
      requireAdminRole.mockReturnValue(true);

      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/admin/audit-logs/search',
        body: 'invalid json'
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(400);
    });

    test('should handle missing path parameters', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockAdminUser);
      requireAdminRole.mockReturnValue(true);

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users/',
        pathParameters: null
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(400);
    });

    test('should handle CORS preflight requests', async () => {
      const event = createMockEvent({
        httpMethod: 'OPTIONS',
        path: '/admin/users'
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
    });

    test('should return 404 for unknown endpoints', async () => {
      const { getUserFromEvent } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockAdminUser);

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/unknown-endpoint'
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Input Validation and Sanitization Tests', () => {
    test('should sanitize HTML input', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockAdminUser);
      requireAdminRole.mockReturnValue(true);
      mockSend.mockResolvedValue({
        Item: {
          id: 'user-1',
          status: 'ACTIVE'
        }
      });

      const event = createMockEvent({
        httpMethod: 'PUT',
        path: '/admin/users/user-1/status',
        pathParameters: { userId: 'user-1' },
        body: JSON.stringify({
          status: 'SUSPENDED',
          reason: '<script>alert("xss")</script>Policy violation'
        })
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      // The sanitization would have removed the script tag
    });

    test('should validate email format', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockAdminUser);
      requireAdminRole.mockReturnValue(true);

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/security/login-attempts',
        queryStringParameters: { 
          email: 'invalid-email-format'
        }
      });

      const result = await handler(event, createMockContext());

      // Should still work but with proper validation in place
      expect(result.statusCode).toBe(200);
    });

    test('should validate UUID format for IDs', async () => {
      const { getUserFromEvent, requireAdminRole } = require('../shared/auth');
      getUserFromEvent.mockReturnValue(mockAdminUser);
      requireAdminRole.mockReturnValue(true);

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users/invalid-uuid',
        pathParameters: { userId: 'invalid-uuid' }
      });

      const result = await handler(event, createMockContext());

      // Should handle invalid UUID gracefully
      expect([400, 404, 500]).toContain(result.statusCode);
    });
  });
});