/**
 * @fileoverview Tests for security features implementation
 * 
 * This test suite validates the MFA, audit logging, and security controls
 * implemented in task 9 of the AWS Cognito dual-auth refactor.
 */

import { mfaService } from '../mfa-service';
import { auditService, logAuthEvent } from '../audit-service';
import { securityService, checkRateLimit } from '../security-service';
import { CustomerClaims, StaffClaims, CustomerTier, StaffRole } from '../interfaces';
import { AdminPermission } from '../../types/common';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-cognito-identity-provider');
jest.mock('@aws-sdk/client-cloudwatch-logs');

describe('Security Features Implementation', () => {
  const mockClientInfo = {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 Test Browser',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Clean up security service to prevent Jest from hanging
    securityService.destroy();
  });

  describe('MFA Service', () => {
    it('should have MFA service instance available', () => {
      expect(mfaService).toBeDefined();
      expect(typeof mfaService.setupCustomerTOTP).toBe('function');
      expect(typeof mfaService.setupStaffTOTP).toBe('function');
      expect(typeof mfaService.verifyTOTPSetup).toBe('function');
      expect(typeof mfaService.verifyMFAChallenge).toBe('function');
    });

    it('should have backup code functionality', () => {
      expect(typeof mfaService.verifyBackupCode).toBe('function');
      expect(typeof mfaService.getMFAStatus).toBe('function');
      expect(typeof mfaService.disableMFA).toBe('function');
    });
  });

  describe('Audit Service', () => {
    it('should have audit service instance available', () => {
      expect(auditService).toBeDefined();
      expect(typeof auditService.logAuthEvent).toBe('function');
      expect(typeof auditService.logSecurityEvent).toBe('function');
      expect(typeof auditService.logPermissionChange).toBe('function');
    });

    it('should log authentication events', async () => {
      const authEvent = {
        eventType: 'LOGIN' as const,
        userType: 'customer' as const,
        userId: 'test-user-123',
        email: 'test@example.com',
        ipAddress: mockClientInfo.ipAddress,
        userAgent: mockClientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: true,
        additionalData: { sessionId: 'session-123' },
      };

      // Should not throw error
      await expect(logAuthEvent(authEvent)).resolves.not.toThrow();
    });

    it('should handle rate limit logging', async () => {
      await expect(
        auditService.logRateLimitEvent(
          'customer',
          'test@example.com',
          'login',
          5,
          900000,
          mockClientInfo.ipAddress,
          mockClientInfo.userAgent
        )
      ).resolves.not.toThrow();
    });
  });

  describe('Security Service', () => {
    it('should have security service instance available', () => {
      expect(securityService).toBeDefined();
      expect(typeof securityService.checkRateLimit).toBe('function');
      expect(typeof securityService.createSession).toBe('function');
      expect(typeof securityService.invalidateSession).toBe('function');
    });

    it('should check rate limits', async () => {
      const result = await checkRateLimit(
        'test@example.com',
        'login',
        'customer',
        mockClientInfo.ipAddress,
        mockClientInfo.userAgent
      );

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remainingAttempts');
      expect(result).toHaveProperty('resetTime');
      expect(result).toHaveProperty('blocked');
      expect(typeof result.allowed).toBe('boolean');
    });

    it('should create sessions', async () => {
      const mockCustomerClaims: CustomerClaims = {
        sub: 'test-user-123',
        email: 'test@example.com',
        email_verified: true,
        name: 'Test User',
        'custom:customer_type': CustomerTier.INDIVIDUAL,
        'cognito:groups': ['individual-customers'],
        permissions: ['view_listings', 'create_inquiry'],
        iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TEST',
        aud: 'test-client-id',
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const session = await securityService.createSession(
        'test-user-123',
        'customer',
        'test@example.com',
        mockClientInfo.ipAddress,
        mockClientInfo.userAgent,
        mockCustomerClaims
      );

      expect(session).toHaveProperty('sessionId');
      expect(session).toHaveProperty('userId', 'test-user-123');
      expect(session).toHaveProperty('userType', 'customer');
      expect(session).toHaveProperty('email', 'test@example.com');
      expect(session).toHaveProperty('permissions');
      expect(Array.isArray(session.permissions)).toBe(true);
    });

    it('should validate security policies', async () => {
      const result = await securityService.validateSecurityPolicy(
        'customer',
        'TestPassword123!',
        mockClientInfo.ipAddress
      );

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('violations');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should get security metrics', async () => {
      const metrics = await securityService.getSecurityMetrics();

      expect(metrics).toHaveProperty('activeSessions');
      expect(metrics).toHaveProperty('blockedIPs');
      expect(metrics).toHaveProperty('rateLimitedRequests');
      expect(metrics).toHaveProperty('customerSessions');
      expect(metrics).toHaveProperty('staffSessions');
      expect(typeof metrics.activeSessions).toBe('number');
    });

    it('should handle IP blocking', async () => {
      const ipAddress = '192.168.1.100';
      
      // Initially not blocked
      expect(await securityService.isIPBlocked(ipAddress)).toBe(false);
      
      // Block IP
      await securityService.blockIP(ipAddress, 'test block', 60000);
      
      // Should be blocked now
      expect(await securityService.isIPBlocked(ipAddress)).toBe(true);
      
      // Unblock IP
      await securityService.unblockIP(ipAddress);
      
      // Should not be blocked anymore
      expect(await securityService.isIPBlocked(ipAddress)).toBe(false);
    });

    it('should handle session invalidation on role change', async () => {
      await expect(
        securityService.invalidateSessionsOnRoleChange(
          'test-user-123',
          'staff',
          'team-member',
          'admin',
          'admin-user-456',
          mockClientInfo.ipAddress,
          mockClientInfo.userAgent
        )
      ).resolves.not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should integrate rate limiting with audit logging', async () => {
      const identifier = 'integration-test@example.com';
      
      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 6; i++) {
        await checkRateLimit(
          identifier,
          'login',
          'customer',
          mockClientInfo.ipAddress,
          mockClientInfo.userAgent
        );
      }
      
      // The 6th request should be rate limited
      const result = await checkRateLimit(
        identifier,
        'login',
        'customer',
        mockClientInfo.ipAddress,
        mockClientInfo.userAgent
      );
      
      // Should be blocked after exceeding limit
      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
    });

    it('should create and manage sessions with security controls', async () => {
      const mockStaffClaims: StaffClaims = {
        sub: 'staff-user-123',
        email: 'staff@example.com',
        email_verified: true,
        name: 'Staff User',
        'custom:permissions': JSON.stringify(['user_management']),
        'custom:team': 'operations',
        'cognito:groups': ['admin'],
        permissions: [AdminPermission.USER_MANAGEMENT],
        role: StaffRole.ADMIN,
        iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_STAFF',
        aud: 'staff-client-id',
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      // Create session
      const session = await securityService.createSession(
        'staff-user-123',
        'staff',
        'staff@example.com',
        mockClientInfo.ipAddress,
        mockClientInfo.userAgent,
        mockStaffClaims
      );

      expect(session.userType).toBe('staff');
      expect(session.permissions).toContain('user_management');

      // Update session activity
      await securityService.updateSessionActivity(session.sessionId);

      // Get session
      const retrievedSession = await securityService.getSession(session.sessionId);
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession?.sessionId).toBe(session.sessionId);

      // Invalidate session
      await securityService.invalidateSession(session.sessionId, 'test cleanup');

      // Session should be gone
      const invalidatedSession = await securityService.getSession(session.sessionId);
      expect(invalidatedSession).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid rate limit parameters gracefully', async () => {
      await expect(
        checkRateLimit(
          '',
          'invalid-action',
          'customer',
          mockClientInfo.ipAddress,
          mockClientInfo.userAgent
        )
      ).resolves.not.toThrow();
    });

    it('should handle invalid session operations gracefully', async () => {
      // Try to get non-existent session
      const session = await securityService.getSession('non-existent-session');
      expect(session).toBeNull();

      // Try to invalidate non-existent session
      await expect(
        securityService.invalidateSession('non-existent-session')
      ).resolves.not.toThrow();
    });

    it('should handle audit logging errors gracefully', async () => {
      const invalidEvent = {
        eventType: 'INVALID_EVENT' as any,
        userType: 'invalid' as any,
        ipAddress: mockClientInfo.ipAddress,
        userAgent: mockClientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: false,
      };

      // Should not throw even with invalid data
      await expect(logAuthEvent(invalidEvent)).resolves.not.toThrow();
    });
  });
});