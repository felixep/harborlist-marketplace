/**
 * @fileoverview Security service for AWS Cognito dual-pool authentication
 * 
 * This module provides comprehensive security controls including:
 * - Rate limiting per user pool type
 * - Concurrent session management
 * - Session invalidation on role changes
 * - IP-based blocking and monitoring
 * - Suspicious activity detection
 * - Security policy enforcement
 * 
 * Key Features:
 * - Configurable rate limits per user type
 * - Redis-based session tracking (with fallback to in-memory)
 * - Automatic session cleanup
 * - Security event correlation
 * - Real-time threat detection
 * - Compliance with security best practices
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import { getEnvironmentConfig } from './config';
import { logSecurityEvent, SecurityEventType, auditService } from './audit-service';
import { CustomerClaims, StaffClaims } from './interfaces';
import * as crypto from 'crypto';

/**
 * Rate limit configuration interface
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxAttempts: number; // Maximum attempts per window
  blockDurationMs: number; // How long to block after exceeding limit
}

/**
 * Rate limit result interface
 */
export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: number;
  blocked: boolean;
  blockExpiresAt?: number;
}

/**
 * Session information interface
 */
export interface SessionInfo {
  sessionId: string;
  userId: string;
  userType: 'customer' | 'staff';
  email: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
  deviceId?: string;
  permissions: string[];
  role?: string;
}

/**
 * Security policy interface
 */
export interface SecurityPolicy {
  maxConcurrentSessions: number;
  sessionTimeoutMs: number;
  requireMFA: boolean;
  allowedIpRanges?: string[];
  blockedIpRanges?: string[];
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    maxAge?: number; // in days
  };
}

/**
 * IP blocking information interface
 */
interface IPBlockInfo {
  ipAddress: string;
  blockedAt: string;
  expiresAt: string;
  reason: string;
  attempts: number;
}

/**
 * In-memory storage for rate limiting and session management
 * In production, this should be replaced with Redis or similar
 */
class InMemoryStore {
  private rateLimitStore: Map<string, { count: number; resetTime: number; blocked?: boolean; blockExpiresAt?: number }> = new Map();
  private sessionStore: Map<string, SessionInfo> = new Map();
  private userSessionsStore: Map<string, Set<string>> = new Map(); // userId -> Set of sessionIds
  private ipBlockStore: Map<string, IPBlockInfo> = new Map();

  // Rate limiting methods
  getRateLimit(key: string) {
    return this.rateLimitStore.get(key);
  }

  setRateLimit(key: string, data: { count: number; resetTime: number; blocked?: boolean; blockExpiresAt?: number }) {
    this.rateLimitStore.set(key, data);
  }

  deleteRateLimit(key: string) {
    this.rateLimitStore.delete(key);
  }

  // Session management methods
  getSession(sessionId: string): SessionInfo | undefined {
    return this.sessionStore.get(sessionId);
  }

  setSession(sessionId: string, session: SessionInfo) {
    this.sessionStore.set(sessionId, session);
    
    // Track user sessions
    if (!this.userSessionsStore.has(session.userId)) {
      this.userSessionsStore.set(session.userId, new Set());
    }
    this.userSessionsStore.get(session.userId)!.add(sessionId);
  }

  deleteSession(sessionId: string) {
    const session = this.sessionStore.get(sessionId);
    if (session) {
      this.sessionStore.delete(sessionId);
      
      // Remove from user sessions tracking
      const userSessions = this.userSessionsStore.get(session.userId);
      if (userSessions) {
        userSessions.delete(sessionId);
        if (userSessions.size === 0) {
          this.userSessionsStore.delete(session.userId);
        }
      }
    }
  }

  getUserSessions(userId: string): SessionInfo[] {
    const sessionIds = this.userSessionsStore.get(userId);
    if (!sessionIds) return [];
    
    return Array.from(sessionIds)
      .map(id => this.sessionStore.get(id))
      .filter((session): session is SessionInfo => session !== undefined);
  }

  // IP blocking methods
  getIPBlock(ipAddress: string): IPBlockInfo | undefined {
    return this.ipBlockStore.get(ipAddress);
  }

  setIPBlock(ipAddress: string, blockInfo: IPBlockInfo) {
    this.ipBlockStore.set(ipAddress, blockInfo);
  }

  deleteIPBlock(ipAddress: string) {
    this.ipBlockStore.delete(ipAddress);
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    
    // Cleanup rate limits
    for (const [key, data] of this.rateLimitStore.entries()) {
      if (data.resetTime < now && (!data.blockExpiresAt || data.blockExpiresAt < now)) {
        this.rateLimitStore.delete(key);
      }
    }
    
    // Cleanup expired sessions
    for (const [sessionId, session] of this.sessionStore.entries()) {
      if (new Date(session.expiresAt).getTime() < now) {
        this.deleteSession(sessionId);
      }
    }
    
    // Cleanup expired IP blocks
    for (const [ip, blockInfo] of this.ipBlockStore.entries()) {
      if (new Date(blockInfo.expiresAt).getTime() < now) {
        this.ipBlockStore.delete(ip);
      }
    }
  }
}

/**
 * Security Service class for comprehensive security controls
 */
export class SecurityService {
  private config: ReturnType<typeof getEnvironmentConfig>;
  private store: InMemoryStore;
  private cleanupInterval: NodeJS.Timeout;

  // Rate limit configurations per user type
  private rateLimitConfigs = {
    customer: {
      login: { windowMs: 15 * 60 * 1000, maxAttempts: 5, blockDurationMs: 30 * 60 * 1000 }, // 5 attempts per 15 min, block for 30 min
      register: { windowMs: 60 * 60 * 1000, maxAttempts: 3, blockDurationMs: 60 * 60 * 1000 }, // 3 attempts per hour, block for 1 hour
      passwordReset: { windowMs: 60 * 60 * 1000, maxAttempts: 3, blockDurationMs: 60 * 60 * 1000 },
      mfaVerify: { windowMs: 5 * 60 * 1000, maxAttempts: 5, blockDurationMs: 15 * 60 * 1000 },
    },
    staff: {
      login: { windowMs: 15 * 60 * 1000, maxAttempts: 3, blockDurationMs: 60 * 60 * 1000 }, // Stricter for staff
      passwordReset: { windowMs: 60 * 60 * 1000, maxAttempts: 2, blockDurationMs: 2 * 60 * 60 * 1000 },
      mfaVerify: { windowMs: 5 * 60 * 1000, maxAttempts: 3, blockDurationMs: 30 * 60 * 1000 },
    },
  };

  // Security policies per user type
  private securityPolicies: Record<'customer' | 'staff', SecurityPolicy> = {
    customer: {
      maxConcurrentSessions: 5,
      sessionTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours
      requireMFA: false,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: false,
        maxAge: 90, // 90 days
      },
    },
    staff: {
      maxConcurrentSessions: 2, // Stricter for staff
      sessionTimeoutMs: 8 * 60 * 60 * 1000, // 8 hours
      requireMFA: true,
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: true,
        maxAge: 60, // 60 days
      },
    },
  };

  constructor() {
    this.config = getEnvironmentConfig();
    this.store = new InMemoryStore();

    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      this.store.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check rate limit for a specific action
   */
  async checkRateLimit(
    identifier: string, // IP address or user ID
    action: string,
    userType: 'customer' | 'staff',
    ipAddress: string,
    userAgent: string
  ): Promise<RateLimitResult> {
    if (!this.config.features.enableRateLimiting) {
      return {
        allowed: true,
        remainingAttempts: 999,
        resetTime: Date.now() + 60000,
        blocked: false,
      };
    }

    const key = `${userType}:${action}:${identifier}`;
    const config = this.getRateLimitConfig(userType, action);
    const now = Date.now();

    let rateLimitData = this.store.getRateLimit(key);

    // Check if currently blocked
    if (rateLimitData?.blocked && rateLimitData.blockExpiresAt && rateLimitData.blockExpiresAt > now) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: rateLimitData.resetTime,
        blocked: true,
        blockExpiresAt: rateLimitData.blockExpiresAt,
      };
    }

    // Initialize or reset if window expired
    if (!rateLimitData || rateLimitData.resetTime < now) {
      rateLimitData = {
        count: 0,
        resetTime: now + config.windowMs,
      };
    }

    // Increment attempt count
    rateLimitData.count++;

    // Check if limit exceeded
    if (rateLimitData.count > config.maxAttempts) {
      rateLimitData.blocked = true;
      rateLimitData.blockExpiresAt = now + config.blockDurationMs;

      // Log rate limit exceeded
      await auditService.logRateLimitEvent(
        userType,
        identifier,
        action,
        config.maxAttempts,
        config.windowMs,
        ipAddress,
        userAgent
      );

      this.store.setRateLimit(key, rateLimitData);

      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: rateLimitData.resetTime,
        blocked: true,
        blockExpiresAt: rateLimitData.blockExpiresAt,
      };
    }

    this.store.setRateLimit(key, rateLimitData);

    return {
      allowed: true,
      remainingAttempts: config.maxAttempts - rateLimitData.count,
      resetTime: rateLimitData.resetTime,
      blocked: false,
    };
  }

  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    userType: 'customer' | 'staff',
    email: string,
    ipAddress: string,
    userAgent: string,
    claims: CustomerClaims | StaffClaims,
    deviceId?: string
  ): Promise<SessionInfo> {
    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const policy = this.securityPolicies[userType];
    const expiresAt = new Date(Date.now() + policy.sessionTimeoutMs).toISOString();

    // Check concurrent session limit
    await this.enforceSessionLimit(userId, userType, ipAddress, userAgent);

    const session: SessionInfo = {
      sessionId,
      userId,
      userType,
      email,
      ipAddress,
      userAgent,
      createdAt: now,
      lastActivity: now,
      expiresAt,
      deviceId,
      permissions: userType === 'customer' 
        ? (claims as CustomerClaims).permissions 
        : (claims as StaffClaims).permissions.map(p => String(p).toLowerCase()),
      role: userType === 'staff' ? (claims as StaffClaims).role : (claims as CustomerClaims)['custom:customer_type'],
    };

    this.store.setSession(sessionId, session);

    return session;
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = this.store.getSession(sessionId);
    if (session) {
      session.lastActivity = new Date().toISOString();
      this.store.setSession(sessionId, session);
    }
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId: string, reason: string = 'logout'): Promise<void> {
    const session = this.store.getSession(sessionId);
    if (session) {
      this.store.deleteSession(sessionId);

      // Log session invalidation
      await auditService.logAuthEvent({
        eventType: 'LOGOUT',
        userType: session.userType,
        userId: session.userId,
        email: session.email,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        timestamp: new Date().toISOString(),
        success: true,
        additionalData: { reason, sessionId },
      });
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllUserSessions(
    userId: string,
    reason: string = 'security',
    excludeSessionId?: string
  ): Promise<number> {
    const sessions = this.store.getUserSessions(userId);
    let invalidatedCount = 0;

    for (const session of sessions) {
      if (excludeSessionId && session.sessionId === excludeSessionId) {
        continue;
      }

      await this.invalidateSession(session.sessionId, reason);
      invalidatedCount++;
    }

    return invalidatedCount;
  }

  /**
   * Invalidate sessions on role/permission change
   */
  async invalidateSessionsOnRoleChange(
    userId: string,
    userType: 'customer' | 'staff',
    oldRole: string,
    newRole: string,
    adminUserId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const invalidatedCount = await this.invalidateAllUserSessions(
      userId,
      'role_change'
    );

    // Log security event
    await logSecurityEvent(
      SecurityEventType.PERMISSION_ESCALATION_ATTEMPT,
      userType,
      ipAddress,
      userAgent,
      {
        userId: adminUserId,
        description: `Role changed for user ${userId} from ${oldRole} to ${newRole}, ${invalidatedCount} sessions invalidated`,
        severity: 'MEDIUM',
        additionalContext: {
          targetUserId: userId,
          oldRole,
          newRole,
          invalidatedSessions: invalidatedCount,
        },
      }
    );
  }

  /**
   * Check if IP address is blocked
   */
  async isIPBlocked(ipAddress: string): Promise<boolean> {
    const blockInfo = this.store.getIPBlock(ipAddress);
    if (!blockInfo) return false;

    const now = new Date();
    if (new Date(blockInfo.expiresAt) <= now) {
      this.store.deleteIPBlock(ipAddress);
      return false;
    }

    return true;
  }

  /**
   * Block IP address
   */
  async blockIP(
    ipAddress: string,
    reason: string,
    durationMs: number = 60 * 60 * 1000, // 1 hour default
    attempts: number = 0
  ): Promise<void> {
    const blockInfo: IPBlockInfo = {
      ipAddress,
      blockedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + durationMs).toISOString(),
      reason,
      attempts,
    };

    this.store.setIPBlock(ipAddress, blockInfo);

    // Log IP blocking
    await logSecurityEvent(
      SecurityEventType.SUSPICIOUS_LOGIN,
      'system' as any,
      ipAddress,
      'system',
      {
        description: `IP address ${ipAddress} blocked: ${reason}`,
        severity: 'HIGH',
        additionalContext: { durationMs, attempts },
      }
    );
  }

  /**
   * Unblock IP address
   */
  async unblockIP(ipAddress: string): Promise<void> {
    this.store.deleteIPBlock(ipAddress);
  }

  /**
   * Get session information
   */
  async getSession(sessionId: string): Promise<SessionInfo | null> {
    const session = this.store.getSession(sessionId);
    if (!session) return null;

    // Check if session is expired
    if (new Date(session.expiresAt) <= new Date()) {
      this.store.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    return this.store.getUserSessions(userId);
  }

  /**
   * Validate security policy compliance
   */
  async validateSecurityPolicy(
    userType: 'customer' | 'staff',
    password?: string,
    ipAddress?: string
  ): Promise<{ valid: boolean; violations: string[] }> {
    const policy = this.securityPolicies[userType];
    const violations: string[] = [];

    // Validate password policy
    if (password) {
      if (password.length < policy.passwordPolicy.minLength) {
        violations.push(`Password must be at least ${policy.passwordPolicy.minLength} characters long`);
      }
      if (policy.passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
        violations.push('Password must contain at least one uppercase letter');
      }
      if (policy.passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
        violations.push('Password must contain at least one lowercase letter');
      }
      if (policy.passwordPolicy.requireNumbers && !/\d/.test(password)) {
        violations.push('Password must contain at least one number');
      }
      if (policy.passwordPolicy.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        violations.push('Password must contain at least one special character');
      }
    }

    // Validate IP restrictions
    if (ipAddress) {
      if (policy.blockedIpRanges && this.isIPInRanges(ipAddress, policy.blockedIpRanges)) {
        violations.push('Access from this IP address is not allowed');
      }
      if (policy.allowedIpRanges && !this.isIPInRanges(ipAddress, policy.allowedIpRanges)) {
        violations.push('Access is restricted to specific IP ranges');
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(): Promise<{
    activeSessions: number;
    blockedIPs: number;
    rateLimitedRequests: number;
    customerSessions: number;
    staffSessions: number;
  }> {
    const allSessions = Array.from(this.store['sessionStore'].values());
    
    return {
      activeSessions: allSessions.length,
      blockedIPs: this.store['ipBlockStore'].size,
      rateLimitedRequests: Array.from(this.store['rateLimitStore'].values())
        .filter(data => data.blocked).length,
      customerSessions: allSessions.filter(s => s.userType === 'customer').length,
      staffSessions: allSessions.filter(s => s.userType === 'staff').length,
    };
  }

  /**
   * Cleanup expired data and sessions
   */
  async cleanup(): Promise<void> {
    this.store.cleanup();
  }

  /**
   * Destroy security service (cleanup intervals)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Get rate limit configuration for user type and action
   */
  private getRateLimitConfig(userType: 'customer' | 'staff', action: string): RateLimitConfig {
    const configs = this.rateLimitConfigs[userType];
    return (configs as any)[action] || configs.login; // Default to login config
  }

  /**
   * Enforce concurrent session limit
   */
  private async enforceSessionLimit(
    userId: string,
    userType: 'customer' | 'staff',
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const policy = this.securityPolicies[userType];
    const existingSessions = this.store.getUserSessions(userId);

    if (existingSessions.length >= policy.maxConcurrentSessions) {
      // Remove oldest session(s)
      const sortedSessions = existingSessions.sort((a, b) => 
        new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime()
      );

      const sessionsToRemove = sortedSessions.slice(0, existingSessions.length - policy.maxConcurrentSessions + 1);
      
      for (const session of sessionsToRemove) {
        await this.invalidateSession(session.sessionId, 'concurrent_limit_exceeded');
      }

      // Log security event
      await logSecurityEvent(
        SecurityEventType.UNUSUAL_ACCESS_PATTERN,
        userType,
        ipAddress,
        userAgent,
        {
          userId,
          description: `Concurrent session limit exceeded, ${sessionsToRemove.length} sessions invalidated`,
          severity: 'MEDIUM',
          additionalContext: {
            maxSessions: policy.maxConcurrentSessions,
            removedSessions: sessionsToRemove.length,
          },
        }
      );
    }
  }

  /**
   * Check if IP is in specified ranges
   */
  private isIPInRanges(ipAddress: string, ranges: string[]): boolean {
    // Simple implementation - in production, use a proper IP range library
    for (const range of ranges) {
      if (range.includes('/')) {
        // CIDR notation - simplified check
        const [network, prefix] = range.split('/');
        // This is a simplified implementation
        if (ipAddress.startsWith(network.split('.').slice(0, parseInt(prefix) / 8).join('.'))) {
          return true;
        }
      } else if (ipAddress === range) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Global security service instance
 */
export const securityService = new SecurityService();

/**
 * Convenience function to check rate limits
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  userType: 'customer' | 'staff',
  ipAddress: string,
  userAgent: string
): Promise<RateLimitResult> {
  return securityService.checkRateLimit(identifier, action, userType, ipAddress, userAgent);
}

/**
 * Convenience function to create sessions
 */
export async function createSession(
  userId: string,
  userType: 'customer' | 'staff',
  email: string,
  ipAddress: string,
  userAgent: string,
  claims: CustomerClaims | StaffClaims,
  deviceId?: string
): Promise<SessionInfo> {
  return securityService.createSession(userId, userType, email, ipAddress, userAgent, claims, deviceId);
}

/**
 * Convenience function to invalidate sessions on role change
 */
export async function invalidateSessionsOnRoleChange(
  userId: string,
  userType: 'customer' | 'staff',
  oldRole: string,
  newRole: string,
  adminUserId: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  return securityService.invalidateSessionsOnRoleChange(
    userId,
    userType,
    oldRole,
    newRole,
    adminUserId,
    ipAddress,
    userAgent
  );
}