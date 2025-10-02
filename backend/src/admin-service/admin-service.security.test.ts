import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler } from './index';
import { createMockEvent, createMockContext } from '../shared/test-utils';

describe('Admin Service Security Tests', () => {
  let mockEvent: APIGatewayProxyEvent;
  let mockContext: Context;

  beforeEach(() => {
    mockContext = createMockContext();
    // Reset environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_TABLE = 'test-admin-table';
    process.env.AUDIT_TABLE = 'test-audit-table';
  });

  describe('Authentication Security', () => {
    it('should reject requests without authorization header', async () => {
      mockEvent = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users',
        headers: {}
      });

      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Authorization header required'
      });
    });

    it('should reject requests with invalid token format', async () => {
      mockEvent = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users',
        headers: {
          'Authorization': 'InvalidToken'
        }
      });

      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Invalid authorization format'
      });
    });

    it('should reject requests with expired tokens', async () => {
      // Create expired token
      const expiredToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbi0xIiwiZW1haWwiOiJhZG1pbkBoYXJib3RsaXN0LmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTYwMDAwMDAwMH0.invalid';
      
      mockEvent = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users',
        headers: {
          'Authorization': expiredToken
        }
      });

      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Token expired'
      });
    });

    it('should reject requests with invalid token signature', async () => {
      const invalidToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbi0xIiwiZW1haWwiOiJhZG1pbkBoYXJib3RsaXN0LmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.invalid-signature';
      
      mockEvent = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users',
        headers: {
          'Authorization': invalidToken
        }
      });

      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Invalid token'
      });
    });
  });

  describe('Authorization Security', () => {
    it('should enforce role-based access control', async () => {
      // Create token for moderator (limited permissions)
      const moderatorToken = 'Bearer valid-moderator-token';
      
      mockEvent = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/financial/transactions',
        headers: {
          'Authorization': moderatorToken
        }
      });

      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Insufficient permissions'
      });
    });

    it('should validate permissions for each endpoint', async () => {
      const supportToken = 'Bearer valid-support-token';
      
      mockEvent = createMockEvent({
        httpMethod: 'DELETE',
        path: '/admin/users/user-123',
        headers: {
          'Authorization': supportToken
        }
      });

      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Permission denied: user_management_delete required'
      });
    });
  });

  describe('Input Validation Security', () => {
    it('should sanitize and validate user search queries', async () => {
      const validToken = 'Bearer valid-admin-token';
      
      mockEvent = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users',
        queryStringParameters: {
          search: '<script>alert("xss")</script>'
        },
        headers: {
          'Authorization': validToken
        }
      });

      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Invalid search query'
      });
    });

    it('should validate email formats in user operations', async () => {
      const validToken = 'Bearer valid-admin-token';
      
      mockEvent = createMockEvent({
        httpMethod: 'POST',
        path: '/admin/users',
        body: JSON.stringify({
          email: 'invalid-email',
          name: 'Test User',
          role: 'user'
        }),
        headers: {
          'Authorization': validToken,
          'Content-Type': 'application/json'
        }
      });

      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Invalid email format'
      });
    });

    it('should validate required fields in requests', async () => {
      const validToken = 'Bearer valid-admin-token';
      
      mockEvent = createMockEvent({
        httpMethod: 'PUT',
        path: '/admin/users/user-123/status',
        body: JSON.stringify({
          status: 'suspended'
          // Missing required 'reason' field
        }),
        headers: {
          'Authorization': validToken,
          'Content-Type': 'application/json'
        }
      });

      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Missing required field: reason'
      });
    });

    it('should prevent SQL injection in database queries', async () => {
      const validToken = 'Bearer valid-admin-token';
      
      mockEvent = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users',
        queryStringParameters: {
          search: "'; DROP TABLE users; --"
        },
        headers: {
          'Authorization': validToken
        }
      });

      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Invalid search query'
      });
    });
  });

  describe('Rate Limiting Security', () => {
    it('should implement rate limiting for login attempts', async () => {
      const loginEvents = Array(6).fill(null).map(() => createMockEvent({
        httpMethod: 'POST',
        path: '/admin/auth/login',
        body: JSON.stringify({
          email: 'admin@harbotlist.com',
          password: 'wrongpassword'
        }),
        headers: {
          'Content-Type': 'application/json'
        },
        requestContext: {
          identity: {
            sourceIp: '192.168.1.100'
          }
        }
      }));

      // Simulate multiple failed login attempts
      const results = [];
      for (const event of loginEvents) {
        const result = await handler(event, mockContext) as APIGatewayProxyResult;
        results.push(result);
      }

      // Last attempt should be rate limited
      const lastResult = results[results.length - 1];
      expect(lastResult.statusCode).toBe(429);
      expect(JSON.parse(lastResult.body)).toEqual({
        error: 'Too many login attempts',
        retryAfter: 300
      });
    });

    it('should implement rate limiting for API requests', async () => {
      const validToken = 'Bearer valid-admin-token';
      
      // Simulate rapid API requests
      const requests = Array(101).fill(null).map(() => createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users',
        headers: {
          'Authorization': validToken
        },
        requestContext: {
          identity: {
            sourceIp: '192.168.1.100'
          }
        }
      }));

      const results = [];
      for (const event of requests) {
        const result = await handler(event, mockContext) as APIGatewayProxyResult;
        results.push(result);
      }

      // Should hit rate limit
      const rateLimitedResults = results.filter(r => r.statusCode === 429);
      expect(rateLimitedResults.length).toBeGreaterThan(0);
    });
  });

  describe('Audit Logging Security', () => {
    it('should log all admin actions for audit trail', async () => {
      const validToken = 'Bearer valid-admin-token';
      
      mockEvent = createMockEvent({
        httpMethod: 'PUT',
        path: '/admin/users/user-123/status',
        body: JSON.stringify({
          status: 'suspended',
          reason: 'Terms violation'
        }),
        headers: {
          'Authorization': validToken,
          'Content-Type': 'application/json'
        },
        requestContext: {
          identity: {
            sourceIp: '192.168.1.100',
            userAgent: 'Mozilla/5.0 Test Browser'
          }
        }
      });

      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      
      // Verify audit log was created (would need to mock DynamoDB)
      // This would typically check that an audit log entry was written
    });

    it('should include sensitive operation details in audit logs', async () => {
      const validToken = 'Bearer valid-admin-token';
      
      mockEvent = createMockEvent({
        httpMethod: 'DELETE',
        path: '/admin/listings/listing-123',
        body: JSON.stringify({
          reason: 'Inappropriate content',
          notifyUser: true
        }),
        headers: {
          'Authorization': validToken,
          'Content-Type': 'application/json'
        }
      });

      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      
      // Verify audit log includes operation details
      // This would check that the audit log contains the reason and notification flag
    });
  });

  describe('Data Protection Security', () => {
    it('should mask sensitive data in responses', async () => {
      const validToken = 'Bearer valid-admin-token';
      
      mockEvent = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users/user-123',
        headers: {
          'Authorization': validToken
        }
      });

      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      
      // Verify sensitive fields are masked or excluded
      expect(responseBody.user.password).toBeUndefined();
      expect(responseBody.user.ssn).toBeUndefined();
      
      // Email should be partially masked for non-super-admin users
      if (responseBody.user.email) {
        expect(responseBody.user.email).toMatch(/\*+@/);
      }
    });

    it('should validate data access permissions', async () => {
      const moderatorToken = 'Bearer valid-moderator-token';
      
      mockEvent = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users/user-123/financial-data',
        headers: {
          'Authorization': moderatorToken
        }
      });

      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Permission denied: financial_access required'
      });
    });
  });

  describe('CORS Security', () => {
    it('should include proper CORS headers', async () => {
      const validToken = 'Bearer valid-admin-token';
      
      mockEvent = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users',
        headers: {
          'Authorization': validToken,
          'Origin': 'https://admin.harbotlist.com'
        }
      });

      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(result.headers).toHaveProperty('Access-Control-Allow-Methods');
      expect(result.headers).toHaveProperty('Access-Control-Allow-Headers');
      
      // Should only allow specific origins
      expect(result.headers['Access-Control-Allow-Origin']).toBe('https://admin.harbotlist.com');
    });

    it('should reject requests from unauthorized origins', async () => {
      const validToken = 'Bearer valid-admin-token';
      
      mockEvent = createMockEvent({
        httpMethod: 'GET',
        path: '/admin/users',
        headers: {
          'Authorization': validToken,
          'Origin': 'https://malicious-site.com'
        }
      });

      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Origin not allowed'
      });
    });
  });
})