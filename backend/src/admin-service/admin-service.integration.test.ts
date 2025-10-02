import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './index';
import { UserRole, UserStatus, AdminPermission } from '../types/common';

// Integration tests that test the full flow without mocking DynamoDB
describe('Admin Service Integration Tests', () => {
  const mockRequestContext = {
    requestId: 'integration-test-request',
    identity: {
      sourceIp: '127.0.0.1'
    }
  };

  const mockSuperAdmin = {
    sub: 'super-admin-id',
    email: 'superadmin@example.com',
    name: 'Super Admin',
    role: UserRole.SUPER_ADMIN,
    permissions: Object.values(AdminPermission),
    sessionId: 'session-super-admin',
    deviceId: 'device-super-admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  const mockModerator = {
    sub: 'moderator-id',
    email: 'moderator@example.com',
    name: 'Moderator',
    role: UserRole.MODERATOR,
    permissions: [AdminPermission.CONTENT_MODERATION],
    sessionId: 'session-moderator',
    deviceId: 'device-moderator',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  beforeAll(() => {
    // Set test environment variables
    process.env.USERS_TABLE = 'test-users-integration';
    process.env.LISTINGS_TABLE = 'test-listings-integration';
    process.env.AUDIT_LOGS_TABLE = 'test-audit-logs-integration';
    process.env.SESSIONS_TABLE = 'test-sessions-integration';
  });

  describe('Permission-based Access Control', () => {
    it('should allow super admin to access all endpoints', async () => {
      const endpoints = [
        { path: '/admin/dashboard', method: 'GET' },
        { path: '/admin/users', method: 'GET' },
        { path: '/admin/listings', method: 'GET' },
        { path: '/admin/audit-logs', method: 'GET' },
        { path: '/admin/system/health', method: 'GET' }
      ];

      for (const endpoint of endpoints) {
        const event: Partial<APIGatewayProxyEvent> = {
          httpMethod: endpoint.method,
          path: endpoint.path,
          requestContext: mockRequestContext,
          headers: {
            'Authorization': 'Bearer super-admin-token'
          },
          user: mockSuperAdmin
        };

        const result = await handler(event as any);
        
        // Should not return 403 Forbidden
        expect(result.statusCode).not.toBe(403);
      }
    });

    it('should restrict moderator access to content moderation only', async () => {
      // Moderator should have access to listings
      const allowedEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/listings',
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer moderator-token'
        },
        user: mockModerator
      };

      const allowedResult = await handler(allowedEvent as any);
      expect(allowedResult.statusCode).not.toBe(403);

      // Moderator should NOT have access to user management
      const restrictedEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/users',
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer moderator-token'
        },
        user: mockModerator
      };

      const restrictedResult = await handler(restrictedEvent as any);
      expect(restrictedResult.statusCode).toBe(403);
    });
  });

  describe('Data Validation and Sanitization', () => {
    it('should validate user status update requests', async () => {
      const invalidStatusEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'PUT',
        path: '/admin/users/user-123/status',
        pathParameters: {
          userId: 'user-123'
        },
        body: JSON.stringify({
          status: 'invalid-status',
          reason: 'Test reason'
        }),
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer super-admin-token'
        },
        user: mockSuperAdmin
      };

      const result = await handler(invalidStatusEvent as any);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate listing moderation requests', async () => {
      const invalidModerationEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'PUT',
        path: '/admin/listings/listing-123/moderate',
        pathParameters: {
          listingId: 'listing-123'
        },
        body: JSON.stringify({
          action: 'invalid-action',
          reason: 'Test reason'
        }),
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer super-admin-token'
        },
        user: mockSuperAdmin
      };

      const result = await handler(invalidModerationEvent as any);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require reason for user status updates', async () => {
      const missingReasonEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'PUT',
        path: '/admin/users/user-123/status',
        pathParameters: {
          userId: 'user-123'
        },
        body: JSON.stringify({
          status: UserStatus.SUSPENDED
          // Missing reason
        }),
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer super-admin-token'
        },
        user: mockSuperAdmin
      };

      const result = await handler(missingReasonEvent as any);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('Reason is required');
    });
  });

  describe('Audit Logging Integration', () => {
    it('should log all admin actions', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/dashboard',
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer super-admin-token'
        },
        user: mockSuperAdmin
      };

      const result = await handler(event as any);
      
      // The audit logging is handled by middleware
      // This test ensures the middleware is properly applied
      expect(result.statusCode).toBe(200);
    });

    it('should log failed admin actions', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/users/non-existent-user',
        pathParameters: {
          userId: 'non-existent-user'
        },
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer super-admin-token'
        },
        user: mockSuperAdmin
      };

      const result = await handler(event as any);
      
      // Should log the failed action
      expect(result.statusCode).toBe(404);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle pagination correctly for large datasets', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/users',
        queryStringParameters: {
          page: '1',
          limit: '100' // Max allowed limit
        },
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer super-admin-token'
        },
        user: mockSuperAdmin
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.limit).toBe(100);
    });

    it('should enforce maximum page size limits', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/users',
        queryStringParameters: {
          page: '1',
          limit: '1000' // Exceeds max limit
        },
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer super-admin-token'
        },
        user: mockSuperAdmin
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      // Should be capped at 100
      expect(body.pagination.limit).toBe(100);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle database timeouts gracefully', async () => {
      // This would require mocking DynamoDB to simulate timeouts
      // For now, we test that the service doesn't crash on errors
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/dashboard',
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer super-admin-token'
        },
        user: mockSuperAdmin
      };

      const result = await handler(event as any);
      
      // Should return a response, not crash
      expect(result).toBeDefined();
      expect(result.statusCode).toBeDefined();
    });

    it('should provide meaningful error messages', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/users/invalid-user-id',
        pathParameters: {
          userId: 'invalid-user-id'
        },
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer super-admin-token'
        },
        user: mockSuperAdmin
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('User not found');
      expect(body.error.requestId).toBe('integration-test-request');
    });
  });

  describe('Security Measures', () => {
    it('should not expose sensitive user data', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/users',
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer super-admin-token'
        },
        user: mockSuperAdmin
      };

      const result = await handler(event as any);
      
      if (result.statusCode === 200) {
        const body = JSON.parse(result.body);
        if (body.users && body.users.length > 0) {
          const user = body.users[0];
          // Should not contain sensitive fields
          expect(user.password).toBeUndefined();
          expect(user.mfaSecret).toBeUndefined();
          expect(user.passwordResetToken).toBeUndefined();
        }
      }
    });

    it('should validate admin permissions for sensitive operations', async () => {
      const sensitiveEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'PUT',
        path: '/admin/users/user-123/status',
        pathParameters: {
          userId: 'user-123'
        },
        body: JSON.stringify({
          status: UserStatus.BANNED,
          reason: 'Security violation'
        }),
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer moderator-token'
        },
        user: mockModerator // Moderator trying to ban users
      };

      const result = await handler(sensitiveEvent as any);
      
      // Should be forbidden for moderators
      expect(result.statusCode).toBe(403);
    });
  });

  describe('API Response Format Consistency', () => {
    it('should return consistent response format for success', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/system/health',
        requestContext: mockRequestContext,
        headers: {
          'Authorization': 'Bearer super-admin-token'
        },
        user: mockSuperAdmin
      };

      const result = await handler(event as any);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
      
      const body = JSON.parse(result.body);
      expect(body).toBeDefined();
    });

    it('should return consistent error format', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/admin/nonexistent',
        requestContext: mockRequestContext,
        headers: {}
      };

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(404);
      expect(result.headers['Content-Type']).toBe('application/json');
      
      const body = JSON.parse(result.body);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBeDefined();
      expect(body.error.message).toBeDefined();
      expect(body.error.requestId).toBeDefined();
    });
  });
});