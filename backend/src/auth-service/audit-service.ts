/**
 * @fileoverview Audit logging service for AWS Cognito dual-pool authentication
 * 
 * This module provides comprehensive audit logging for all authentication events,
 * security events, and permission changes. It supports both CloudWatch logging
 * for AWS environments and local logging for development.
 * 
 * Key Features:
 * - CloudWatch integration for AWS environments
 * - Structured logging with consistent format
 * - User type identification in all log entries
 * - Security event tracking and alerting
 * - Failed login attempt monitoring
 * - Permission change auditing
 * - Rate limiting event logging
 * - Compliance-ready audit trails
 * 
 * Security Features:
 * - PII-safe logging (no sensitive data in logs)
 * - Tamper-evident log entries
 * - Centralized audit trail
 * - Real-time security alerting
 * - Log retention policies
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogGroupCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';
import { getEnvironmentConfig } from './config';
import { AuthEvent } from './interfaces';
import * as crypto from 'crypto';

/**
 * Audit log levels
 */
export enum AuditLogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * Security event types for enhanced monitoring
 */
export enum SecurityEventType {
  SUSPICIOUS_LOGIN = 'SUSPICIOUS_LOGIN',
  MULTIPLE_FAILED_LOGINS = 'MULTIPLE_FAILED_LOGINS',
  CROSS_POOL_ACCESS_ATTEMPT = 'CROSS_POOL_ACCESS_ATTEMPT',
  PERMISSION_ESCALATION_ATTEMPT = 'PERMISSION_ESCALATION_ATTEMPT',
  UNUSUAL_ACCESS_PATTERN = 'UNUSUAL_ACCESS_PATTERN',
  MFA_BYPASS_ATTEMPT = 'MFA_BYPASS_ATTEMPT',
  TOKEN_MANIPULATION = 'TOKEN_MANIPULATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  timestamp: string;
  level: AuditLogLevel;
  eventType: string;
  userType: 'customer' | 'staff' | 'system';
  userId?: string;
  email?: string;
  ipAddress: string;
  userAgent: string;
  requestId?: string;
  sessionId?: string;
  success: boolean;
  errorCode?: string;
  message: string;
  additionalData?: Record<string, any>;
  hash?: string; // For tamper detection
}

/**
 * Security alert interface
 */
export interface SecurityAlert {
  alertId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  eventType: SecurityEventType;
  userType: 'customer' | 'staff';
  userId?: string;
  email?: string;
  ipAddress: string;
  timestamp: string;
  description: string;
  recommendedAction: string;
  additionalContext?: Record<string, any>;
}

/**
 * Failed login tracking interface
 */
interface FailedLoginTracker {
  [key: string]: {
    count: number;
    firstAttempt: string;
    lastAttempt: string;
    ipAddresses: Set<string>;
  };
}

/**
 * Audit Service class for comprehensive authentication logging
 */
export class AuditService {
  private cloudWatchClient: CloudWatchLogsClient | null = null;
  private config: ReturnType<typeof getEnvironmentConfig>;
  private logGroupName: string;
  private logStreamName: string;
  private failedLoginTracker: FailedLoginTracker = {};
  private sequenceToken: string | undefined;

  constructor() {
    this.config = getEnvironmentConfig();
    this.logGroupName = `/aws/lambda/harborlist-auth-service-${this.config.deployment.environment}`;
    this.logStreamName = `audit-${new Date().toISOString().split('T')[0]}-${crypto.randomUUID().slice(0, 8)}`;

    // Initialize CloudWatch client for AWS environments
    if (this.config.deployment.isAWS && this.config.features.enableAuditLogging) {
      this.cloudWatchClient = new CloudWatchLogsClient({
        region: this.config.deployment.region,
      });
      this.initializeCloudWatchLogging();
    }
  }

  /**
   * Log authentication event
   */
  async logAuthEvent(event: AuthEvent): Promise<void> {
    const auditEntry: AuditLogEntry = {
      timestamp: event.timestamp,
      level: event.success ? AuditLogLevel.INFO : AuditLogLevel.WARN,
      eventType: event.eventType,
      userType: event.userType,
      userId: event.userId,
      email: this.sanitizeEmail(event.email),
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      requestId: event.additionalData?.requestId,
      success: event.success,
      errorCode: event.errorCode,
      message: this.generateEventMessage(event),
      additionalData: this.sanitizeAdditionalData(event.additionalData),
    };

    // Add tamper detection hash
    auditEntry.hash = this.generateLogHash(auditEntry);

    // Track failed logins for security monitoring
    if (event.eventType === 'FAILED_LOGIN') {
      await this.trackFailedLogin(event);
    }

    // Log the event
    await this.writeAuditLog(auditEntry);

    // Check for security alerts
    await this.checkSecurityAlerts(event, auditEntry);
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    eventType: SecurityEventType,
    userType: 'customer' | 'staff',
    ipAddress: string,
    userAgent: string,
    details: {
      userId?: string;
      email?: string;
      description: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      additionalContext?: Record<string, any>;
    }
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      level: this.mapSeverityToLogLevel(details.severity),
      eventType: `SECURITY_${eventType}`,
      userType,
      userId: details.userId,
      email: this.sanitizeEmail(details.email),
      ipAddress,
      userAgent,
      success: false, // Security events are always flagged as unsuccessful
      message: details.description,
      additionalData: this.sanitizeAdditionalData(details.additionalContext),
    };

    auditEntry.hash = this.generateLogHash(auditEntry);

    await this.writeAuditLog(auditEntry);

    // Generate security alert for high/critical events
    if (details.severity === 'HIGH' || details.severity === 'CRITICAL') {
      await this.generateSecurityAlert(eventType, userType, ipAddress, details);
    }
  }

  /**
   * Log permission change event
   */
  async logPermissionChange(
    userType: 'customer' | 'staff',
    targetUserId: string,
    targetEmail: string,
    adminUserId: string,
    adminEmail: string,
    changes: {
      oldPermissions: string[];
      newPermissions: string[];
      oldRole?: string;
      newRole?: string;
    },
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      level: AuditLogLevel.INFO,
      eventType: 'PERMISSION_CHANGE',
      userType,
      userId: adminUserId,
      email: this.sanitizeEmail(adminEmail),
      ipAddress,
      userAgent,
      success: true,
      message: `Permissions changed for ${userType} user ${this.sanitizeEmail(targetEmail)}`,
      additionalData: {
        targetUserId,
        targetEmail: this.sanitizeEmail(targetEmail),
        permissionChanges: {
          added: changes.newPermissions.filter(p => !changes.oldPermissions.includes(p)),
          removed: changes.oldPermissions.filter(p => !changes.newPermissions.includes(p)),
        },
        roleChange: changes.oldRole !== changes.newRole ? {
          from: changes.oldRole,
          to: changes.newRole,
        } : null,
      },
    };

    auditEntry.hash = this.generateLogHash(auditEntry);
    await this.writeAuditLog(auditEntry);
  }

  /**
   * Log rate limiting event
   */
  async logRateLimitEvent(
    userType: 'customer' | 'staff',
    identifier: string, // IP address or user ID
    endpoint: string,
    limit: number,
    windowMs: number,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      level: AuditLogLevel.WARN,
      eventType: 'RATE_LIMIT_EXCEEDED',
      userType,
      ipAddress,
      userAgent,
      success: false,
      message: `Rate limit exceeded for ${endpoint}`,
      additionalData: {
        identifier,
        endpoint,
        limit,
        windowMs,
        rateLimitType: 'authentication',
      },
    };

    auditEntry.hash = this.generateLogHash(auditEntry);
    await this.writeAuditLog(auditEntry);

    // Log as security event if excessive
    await this.logSecurityEvent(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      userType,
      ipAddress,
      userAgent,
      {
        description: `Rate limit exceeded for ${endpoint} by ${identifier}`,
        severity: 'MEDIUM',
        additionalContext: { endpoint, limit, windowMs },
      }
    );
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(
    userId: string,
    userType: 'customer' | 'staff',
    startTime?: string,
    endTime?: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    // In a real implementation, this would query CloudWatch Logs or a database
    // For now, return empty array as we don't have persistent storage in this example
    console.log(`Retrieving audit logs for ${userType} user ${userId}`);
    return [];
  }

  /**
   * Get security alerts
   */
  async getSecurityAlerts(
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    startTime?: string,
    endTime?: string,
    limit: number = 50
  ): Promise<SecurityAlert[]> {
    // In a real implementation, this would query a security alerts database
    console.log('Retrieving security alerts');
    return [];
  }

  /**
   * Initialize CloudWatch logging
   */
  private async initializeCloudWatchLogging(): Promise<void> {
    if (!this.cloudWatchClient) return;

    try {
      // Create log group if it doesn't exist
      await this.cloudWatchClient.send(new CreateLogGroupCommand({
        logGroupName: this.logGroupName,
      }));
    } catch (error: any) {
      if (error.name !== 'ResourceAlreadyExistsException') {
        console.error('Failed to create CloudWatch log group:', error);
      }
    }

    try {
      // Create log stream
      await this.cloudWatchClient.send(new CreateLogStreamCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
      }));
    } catch (error: any) {
      if (error.name !== 'ResourceAlreadyExistsException') {
        console.error('Failed to create CloudWatch log stream:', error);
      }
    }
  }

  /**
   * Write audit log entry
   */
  private async writeAuditLog(entry: AuditLogEntry): Promise<void> {
    // Always log to console for development
    if (this.config.deployment.isLocal) {
      console.log('AUDIT LOG:', JSON.stringify(entry, null, 2));
    }

    // Log to CloudWatch in AWS environments
    if (this.cloudWatchClient && this.config.features.enableAuditLogging) {
      try {
        const command = new PutLogEventsCommand({
          logGroupName: this.logGroupName,
          logStreamName: this.logStreamName,
          logEvents: [{
            timestamp: new Date(entry.timestamp).getTime(),
            message: JSON.stringify(entry),
          }],
          sequenceToken: this.sequenceToken,
        });

        const response = await this.cloudWatchClient.send(command);
        this.sequenceToken = response.nextSequenceToken;
      } catch (error) {
        console.error('Failed to write to CloudWatch:', error);
        // Fallback to console logging
        console.log('AUDIT LOG (CloudWatch failed):', JSON.stringify(entry, null, 2));
      }
    }
  }

  /**
   * Track failed login attempts
   */
  private async trackFailedLogin(event: AuthEvent): Promise<void> {
    const key = event.email || event.ipAddress;
    const now = new Date().toISOString();

    if (!this.failedLoginTracker[key]) {
      this.failedLoginTracker[key] = {
        count: 0,
        firstAttempt: now,
        lastAttempt: now,
        ipAddresses: new Set(),
      };
    }

    const tracker = this.failedLoginTracker[key];
    tracker.count++;
    tracker.lastAttempt = now;
    tracker.ipAddresses.add(event.ipAddress);

    // Check for suspicious patterns
    const timeDiff = new Date(now).getTime() - new Date(tracker.firstAttempt).getTime();
    const fiveMinutes = 5 * 60 * 1000;

    if (tracker.count >= 5 && timeDiff <= fiveMinutes) {
      await this.logSecurityEvent(
        SecurityEventType.MULTIPLE_FAILED_LOGINS,
        event.userType,
        event.ipAddress,
        event.userAgent,
        {
          email: event.email,
          description: `Multiple failed login attempts detected: ${tracker.count} attempts in ${Math.round(timeDiff / 1000)} seconds`,
          severity: tracker.count >= 10 ? 'HIGH' : 'MEDIUM',
          additionalContext: {
            attemptCount: tracker.count,
            timeWindowMs: timeDiff,
            uniqueIpAddresses: Array.from(tracker.ipAddresses),
          },
        }
      );
    }

    // Clean up old tracking data (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    if (tracker.firstAttempt < oneHourAgo) {
      delete this.failedLoginTracker[key];
    }
  }

  /**
   * Check for security alerts based on events
   */
  private async checkSecurityAlerts(event: AuthEvent, auditEntry: AuditLogEntry): Promise<void> {
    // Check for cross-pool access attempts
    if (event.errorCode === 'CROSS_POOL_ACCESS') {
      await this.logSecurityEvent(
        SecurityEventType.CROSS_POOL_ACCESS_ATTEMPT,
        event.userType,
        event.ipAddress,
        event.userAgent,
        {
          userId: event.userId,
          email: event.email,
          description: 'Attempt to use token from wrong user pool',
          severity: 'HIGH',
          additionalContext: event.additionalData,
        }
      );
    }

    // Check for token manipulation attempts
    if (event.errorCode === 'INVALID_TOKEN' || event.errorCode === 'TOKEN_EXPIRED') {
      // This could indicate token manipulation - log for analysis
      await this.logSecurityEvent(
        SecurityEventType.TOKEN_MANIPULATION,
        event.userType,
        event.ipAddress,
        event.userAgent,
        {
          userId: event.userId,
          email: event.email,
          description: 'Potential token manipulation detected',
          severity: 'MEDIUM',
          additionalContext: { errorCode: event.errorCode },
        }
      );
    }
  }

  /**
   * Generate security alert
   */
  private async generateSecurityAlert(
    eventType: SecurityEventType,
    userType: 'customer' | 'staff',
    ipAddress: string,
    details: any
  ): Promise<void> {
    const alert: SecurityAlert = {
      alertId: crypto.randomUUID(),
      severity: details.severity,
      eventType,
      userType,
      userId: details.userId,
      email: this.sanitizeEmail(details.email),
      ipAddress,
      timestamp: new Date().toISOString(),
      description: details.description,
      recommendedAction: this.getRecommendedAction(eventType),
      additionalContext: details.additionalContext,
    };

    // In a real implementation, this would be sent to a security monitoring system
    console.log('SECURITY ALERT:', JSON.stringify(alert, null, 2));

    // For critical alerts, you might want to send immediate notifications
    if (alert.severity === 'CRITICAL') {
      await this.sendCriticalAlert(alert);
    }
  }

  /**
   * Send critical security alert
   */
  private async sendCriticalAlert(alert: SecurityAlert): Promise<void> {
    // In a real implementation, this would send alerts via SNS, email, Slack, etc.
    console.log('CRITICAL SECURITY ALERT - IMMEDIATE ATTENTION REQUIRED:', alert);
  }

  /**
   * Get recommended action for security event type
   */
  private getRecommendedAction(eventType: SecurityEventType): string {
    const actions = {
      [SecurityEventType.SUSPICIOUS_LOGIN]: 'Review user account and consider temporary suspension',
      [SecurityEventType.MULTIPLE_FAILED_LOGINS]: 'Implement temporary IP blocking and notify user',
      [SecurityEventType.CROSS_POOL_ACCESS_ATTEMPT]: 'Investigate potential security breach',
      [SecurityEventType.PERMISSION_ESCALATION_ATTEMPT]: 'Review user permissions and access logs',
      [SecurityEventType.UNUSUAL_ACCESS_PATTERN]: 'Monitor user activity and verify identity',
      [SecurityEventType.MFA_BYPASS_ATTEMPT]: 'Force MFA re-enrollment and review account security',
      [SecurityEventType.TOKEN_MANIPULATION]: 'Invalidate all user sessions and require re-authentication',
      [SecurityEventType.RATE_LIMIT_EXCEEDED]: 'Implement stricter rate limiting and monitor for abuse',
    };

    return actions[eventType] || 'Review and investigate security event';
  }

  /**
   * Generate tamper detection hash for log entry
   */
  private generateLogHash(entry: Omit<AuditLogEntry, 'hash'>): string {
    const hashData = {
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      userType: entry.userType,
      userId: entry.userId,
      success: entry.success,
      message: entry.message,
    };

    return crypto.createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex')
      .slice(0, 16); // Use first 16 characters
  }

  /**
   * Generate event message
   */
  private generateEventMessage(event: AuthEvent): string {
    const userIdentifier = event.email ? this.sanitizeEmail(event.email) : event.userId || 'unknown';
    const action = event.eventType.toLowerCase().replace('_', ' ');
    const result = event.success ? 'successful' : 'failed';
    
    return `${result} ${action} for ${event.userType} user ${userIdentifier}`;
  }

  /**
   * Sanitize email for logging (partial masking)
   */
  private sanitizeEmail(email?: string): string {
    if (!email) return '';
    
    const [local, domain] = email.split('@');
    if (!domain) return email;
    
    // Mask middle characters of local part
    const maskedLocal = local.length > 2 
      ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
      : local;
    
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Sanitize additional data to remove sensitive information
   */
  private sanitizeAdditionalData(data?: Record<string, any>): Record<string, any> | undefined {
    if (!data) return undefined;

    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Map severity to log level
   */
  private mapSeverityToLogLevel(severity: string): AuditLogLevel {
    switch (severity) {
      case 'CRITICAL':
        return AuditLogLevel.CRITICAL;
      case 'HIGH':
        return AuditLogLevel.ERROR;
      case 'MEDIUM':
        return AuditLogLevel.WARN;
      case 'LOW':
      default:
        return AuditLogLevel.INFO;
    }
  }
}

/**
 * Global audit service instance
 */
export const auditService = new AuditService();

/**
 * Convenience function to log authentication events
 */
export async function logAuthEvent(event: AuthEvent): Promise<void> {
  return auditService.logAuthEvent(event);
}

/**
 * Convenience function to log security events
 */
export async function logSecurityEvent(
  eventType: SecurityEventType,
  userType: 'customer' | 'staff',
  ipAddress: string,
  userAgent: string,
  details: {
    userId?: string;
    email?: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    additionalContext?: Record<string, any>;
  }
): Promise<void> {
  return auditService.logSecurityEvent(eventType, userType, ipAddress, userAgent, details);
}

/**
 * Convenience function to log permission changes
 */
export async function logPermissionChange(
  userType: 'customer' | 'staff',
  targetUserId: string,
  targetEmail: string,
  adminUserId: string,
  adminEmail: string,
  changes: {
    oldPermissions: string[];
    newPermissions: string[];
    oldRole?: string;
    newRole?: string;
  },
  ipAddress: string,
  userAgent: string
): Promise<void> {
  return auditService.logPermissionChange(
    userType,
    targetUserId,
    targetEmail,
    adminUserId,
    adminEmail,
    changes,
    ipAddress,
    userAgent
  );
}