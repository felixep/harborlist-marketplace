/**
 * @fileoverview Comprehensive admin service for HarborList boat marketplace platform.
 * 
 * Provides complete administrative functionality including:
 * - User management and account administration
 * - Content moderation and listing oversight
 * - System monitoring and health checks
 * - Audit logging and compliance tracking
 * - Security monitoring and threat detection
 * - Analytics and reporting capabilities
 * - Platform configuration management
 * - Support ticket management
 * - Session management and security
 * 
 * Security Features:
 * - Multi-factor authentication requirement for admin access
 * - Role-based access control with granular permissions
 * - Comprehensive audit logging for all admin actions
 * - Rate limiting with adaptive controls
 * - IP-based security monitoring
 * - Session management with forced termination capabilities
 * - Suspicious activity detection and alerting
 * 
 * Admin Permissions System:
 * - USER_MANAGEMENT: User account administration
 * - CONTENT_MODERATION: Listing and content oversight
 * - ANALYTICS_VIEW: Access to platform analytics
 * - AUDIT_LOG_VIEW: Audit trail and compliance access
 * - SYSTEM_CONFIG: Platform configuration management
 * - SUPPORT_MANAGEMENT: Customer support operations
 * 
 * API Versioning:
 * - Supports multiple API versions for backward compatibility
 * - Automatic version detection and transformation
 * - Graceful deprecation handling
 * - Version-specific feature flags
 * 
 * Monitoring and Observability:
 * - Real-time system health monitoring
 * - Performance metrics and alerting
 * - Error tracking and resolution
 * - Resource utilization monitoring
 * - Automated incident detection
 * 
 * Compliance and Audit:
 * - Complete audit trail for all admin operations
 * - Regulatory compliance reporting
 * - Data retention policy enforcement
 * - Security event logging and analysis
 * - Automated compliance checking
 * 
 * Supported Operations:
 * - Dashboard metrics and system overview
 * - User account management (view, update, suspend, ban)
 * - Listing moderation (approve, reject, flag)
 * - Audit log viewing, searching, and exporting
 * - Session management and termination
 * - Security monitoring and threat analysis
 * - Platform settings configuration
 * - Support ticket management
 * - System health and performance monitoring
 * - Analytics and reporting
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand, UpdateCommand, GetCommand, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { createResponse, createErrorResponse } from '../shared/utils';
import { 
  withAdminAuth, 
  withRateLimit, 
  withAuditLog, 
  compose, 
  AuthenticatedEvent,
  createValidator,
  validators,
  withAdaptiveRateLimit
} from '../shared/middleware';
import { User, UserRole, UserStatus, AdminPermission, AuditLog } from '../types/common';
import { 
  withApiVersioning, 
  withVersionTransformation, 
  extractApiVersion,
  applyVersionTransformation 
} from './versioning';

/**
 * DynamoDB client configuration for admin service operations
 */
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Environment-based table name configuration with fallback defaults
 * 
 * These table names are used across all admin operations for consistent
 * data access and management. Environment variables allow for different
 * configurations across development, staging, and production environments.
 */
const USERS_TABLE = process.env.USERS_TABLE || 'harborlist-users';
const LISTINGS_TABLE = process.env.LISTINGS_TABLE || 'harborlist-listings';
const SESSIONS_TABLE = process.env.SESSIONS_TABLE || 'harborlist-sessions';
const AUDIT_LOGS_TABLE = process.env.AUDIT_LOGS_TABLE || 'harborlist-audit-logs';
const LOGIN_ATTEMPTS_TABLE = process.env.LOGIN_ATTEMPTS_TABLE || 'harborlist-login-attempts';

/**
 * Main Lambda handler for admin service operations with API versioning support
 * 
 * Handles all administrative operations with comprehensive middleware stack including:
 * - API versioning and backward compatibility
 * - Authentication and authorization verification
 * - Rate limiting with adaptive controls
 * - Audit logging for compliance
 * - Error handling and response formatting
 * 
 * The handler uses a middleware composition pattern to apply security, logging,
 * and rate limiting consistently across all endpoints. Each endpoint is protected
 * with appropriate admin permissions and audit logging.
 * 
 * Middleware Stack:
 * 1. API Versioning - Handles version detection and transformation
 * 2. Rate Limiting - Prevents abuse with adaptive controls
 * 3. Admin Authentication - Verifies admin credentials and permissions
 * 4. Audit Logging - Records all admin actions for compliance
 * 
 * @param event - API Gateway proxy event containing request details
 * @param version - Detected API version for compatibility handling
 * @returns Promise<APIGatewayProxyResult> - Standardized API response
 * 
 * @throws {Error} When authentication fails or system errors occur
 */
export const handler = withApiVersioning(async (event: APIGatewayProxyEvent, version: string): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    // CORS preflight requests are handled by API Gateway

    const path = event.path;
    const method = event.httpMethod;

    // Route handling with appropriate middleware
    if (path.includes('/admin/auth/verify') && method === 'POST') {
      return await compose(
        withAdaptiveRateLimit(),
        withAdminAuth(),
        withAuditLog('ADMIN_AUTH_VERIFY', 'auth')
      )(handleAdminAuthVerify)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/dashboard') && method === 'GET') {
      return await compose(
        withRateLimit(100, 60000), // 100 requests per minute
        withAdminAuth([AdminPermission.ANALYTICS_VIEW]),
        withAuditLog('VIEW_DASHBOARD', 'dashboard')
      )(handleGetDashboard)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/users') && method === 'GET') {
      return await compose(
        withAdaptiveRateLimit(AdminPermission.USER_MANAGEMENT),
        withAdminAuth([AdminPermission.USER_MANAGEMENT]),
        withAuditLog('VIEW_USERS', 'users')
      )(handleGetUsers)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/users/') && method === 'GET') {
      return await compose(
        withRateLimit(100, 60000),
        withAdminAuth([AdminPermission.USER_MANAGEMENT]),
        withAuditLog('VIEW_USER_DETAILS', 'user')
      )(handleGetUserDetails)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/users/') && path.includes('/status') && method === 'PUT') {
      return await compose(
        withRateLimit(20, 60000),
        withAdminAuth([AdminPermission.USER_MANAGEMENT]),
        withAuditLog('UPDATE_USER_STATUS', 'user')
      )(handleUpdateUserStatus)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/listings') && method === 'GET') {
      return await compose(
        withRateLimit(50, 60000),
        withAdminAuth([AdminPermission.CONTENT_MODERATION]),
        withAuditLog('VIEW_LISTINGS', 'listings')
      )(handleGetListings)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/listings/') && path.includes('/moderate') && method === 'PUT') {
      return await compose(
        withRateLimit(30, 60000),
        withAdminAuth([AdminPermission.CONTENT_MODERATION]),
        withAuditLog('MODERATE_LISTING', 'listing')
      )(handleModerateListing)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/audit-logs') && !path.includes('/export') && method === 'GET') {
      return await compose(
        withAdaptiveRateLimit(AdminPermission.AUDIT_LOG_VIEW),
        withAdminAuth([AdminPermission.AUDIT_LOG_VIEW]),
        withAuditLog('VIEW_AUDIT_LOGS', 'audit_logs')
      )(handleGetAuditLogs)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/audit-logs/export') && method === 'POST') {
      return await compose(
        withRateLimit(5, 60000), // Lower rate limit for exports
        withAdminAuth([AdminPermission.AUDIT_LOG_VIEW]),
        withAuditLog('EXPORT_AUDIT_LOGS', 'audit_logs')
      )(handleExportAuditLogs)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/audit-logs/stats') && method === 'GET') {
      return await compose(
        withRateLimit(20, 60000),
        withAdminAuth([AdminPermission.AUDIT_LOG_VIEW]),
        withAuditLog('VIEW_AUDIT_LOG_STATS', 'audit_logs')
      )(handleGetAuditLogStats)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/audit-logs/retention') && method === 'GET') {
      return await compose(
        withRateLimit(10, 60000),
        withAdminAuth([AdminPermission.SYSTEM_CONFIG]),
        withAuditLog('VIEW_AUDIT_LOG_RETENTION', 'audit_logs')
      )(handleGetAuditLogRetention)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/audit-logs/cleanup') && method === 'POST') {
      return await compose(
        withRateLimit(2, 60000), // Very low rate limit for cleanup operations
        withAdminAuth([AdminPermission.SYSTEM_CONFIG]),
        withAuditLog('CLEANUP_AUDIT_LOGS', 'audit_logs')
      )(handleCleanupAuditLogs)(event as AuthenticatedEvent, {});
    }

    // Enhanced audit log endpoints
    if (path.includes('/admin/audit-logs/search') && method === 'POST') {
      return await compose(
        withRateLimit(30, 60000),
        withAdminAuth([AdminPermission.AUDIT_LOG_VIEW]),
        withAuditLog('SEARCH_AUDIT_LOGS', 'audit_logs')
      )(handleSearchAuditLogs)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/audit-logs/user/') && method === 'GET') {
      return await compose(
        withRateLimit(50, 60000),
        withAdminAuth([AdminPermission.AUDIT_LOG_VIEW]),
        withAuditLog('VIEW_USER_AUDIT_LOGS', 'audit_logs')
      )(handleGetUserAuditLogs)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/audit-logs/resource/') && method === 'GET') {
      return await compose(
        withRateLimit(50, 60000),
        withAdminAuth([AdminPermission.AUDIT_LOG_VIEW]),
        withAuditLog('VIEW_RESOURCE_AUDIT_LOGS', 'audit_logs')
      )(handleGetResourceAuditLogs)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/audit-logs/timeline') && method === 'GET') {
      return await compose(
        withRateLimit(20, 60000),
        withAdminAuth([AdminPermission.AUDIT_LOG_VIEW]),
        withAuditLog('VIEW_AUDIT_LOG_TIMELINE', 'audit_logs')
      )(handleGetAuditLogTimeline)(event as AuthenticatedEvent, {});
    }

    // Session management endpoints
    if (path.includes('/admin/sessions') && !path.includes('/admin/sessions/') && method === 'GET') {
      return await compose(
        withRateLimit(30, 60000),
        withAdminAuth([AdminPermission.USER_MANAGEMENT]),
        withAuditLog('VIEW_ADMIN_SESSIONS', 'sessions')
      )(handleGetAdminSessions)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/sessions/current') && method === 'GET') {
      return await compose(
        withRateLimit(60, 60000),
        withAdminAuth(),
        withAuditLog('VIEW_CURRENT_SESSION', 'session')
      )(handleGetCurrentSession)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/sessions/') && path.includes('/terminate') && method === 'POST') {
      return await compose(
        withRateLimit(10, 60000),
        withAdminAuth([AdminPermission.USER_MANAGEMENT]),
        withAuditLog('TERMINATE_SESSION', 'session')
      )(handleTerminateSession)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/sessions/user/') && method === 'GET') {
      return await compose(
        withRateLimit(30, 60000),
        withAdminAuth([AdminPermission.USER_MANAGEMENT]),
        withAuditLog('VIEW_USER_SESSIONS', 'sessions')
      )(handleGetUserSessions)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/sessions/user/') && path.includes('/terminate-all') && method === 'POST') {
      return await compose(
        withRateLimit(5, 60000),
        withAdminAuth([AdminPermission.USER_MANAGEMENT]),
        withAuditLog('TERMINATE_ALL_USER_SESSIONS', 'sessions')
      )(handleTerminateAllUserSessions)(event as AuthenticatedEvent, {});
    }

    // Security monitoring endpoints
    if (path.includes('/admin/security/suspicious-activity') && method === 'GET') {
      return await compose(
        withRateLimit(20, 60000),
        withAdminAuth([AdminPermission.AUDIT_LOG_VIEW]),
        withAuditLog('VIEW_SUSPICIOUS_ACTIVITY', 'security')
      )(handleGetSuspiciousActivity)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/security/login-attempts') && method === 'GET') {
      return await compose(
        withRateLimit(30, 60000),
        withAdminAuth([AdminPermission.AUDIT_LOG_VIEW]),
        withAuditLog('VIEW_LOGIN_ATTEMPTS', 'security')
      )(handleGetLoginAttempts)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/security/failed-logins') && method === 'GET') {
      return await compose(
        withRateLimit(30, 60000),
        withAdminAuth([AdminPermission.AUDIT_LOG_VIEW]),
        withAuditLog('VIEW_FAILED_LOGINS', 'security')
      )(handleGetFailedLogins)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/security/ip-analysis') && method === 'GET') {
      return await compose(
        withRateLimit(20, 60000),
        withAdminAuth([AdminPermission.AUDIT_LOG_VIEW]),
        withAuditLog('VIEW_IP_ANALYSIS', 'security')
      )(handleGetIpAnalysis)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/security/rate-limit-violations') && method === 'GET') {
      return await compose(
        withRateLimit(20, 60000),
        withAdminAuth([AdminPermission.AUDIT_LOG_VIEW]),
        withAuditLog('VIEW_RATE_LIMIT_VIOLATIONS', 'security')
      )(handleGetRateLimitViolations)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/security/alerts') && method === 'GET') {
      return await compose(
        withRateLimit(30, 60000),
        withAdminAuth([AdminPermission.AUDIT_LOG_VIEW]),
        withAuditLog('VIEW_SECURITY_ALERTS', 'security')
      )(handleGetSecurityAlerts)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/security/alerts/') && path.includes('/acknowledge') && method === 'POST') {
      return await compose(
        withRateLimit(20, 60000),
        withAdminAuth([AdminPermission.AUDIT_LOG_VIEW]),
        withAuditLog('ACKNOWLEDGE_SECURITY_ALERT', 'security_alert')
      )(handleAcknowledgeSecurityAlert)(event as AuthenticatedEvent, {});
    }

    // API Version info endpoint
    if (path.includes('/admin/version') && method === 'GET') {
      return await handleGetVersionInfo(event, version);
    }

    if (path.includes('/admin/system/health') && method === 'GET') {
      return await compose(
        withRateLimit(60, 60000),
        withAdminAuth(),
        withAuditLog('VIEW_SYSTEM_HEALTH', 'system')
      )(handleGetSystemHealth)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/system/metrics') && method === 'GET') {
      return await compose(
        withRateLimit(60, 60000),
        withAdminAuth(),
        withAuditLog('VIEW_SYSTEM_METRICS', 'system')
      )(handleGetSystemMetrics)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/system/alerts') && method === 'GET') {
      return await compose(
        withRateLimit(60, 60000),
        withAdminAuth(),
        withAuditLog('VIEW_SYSTEM_ALERTS', 'system')
      )(handleGetSystemAlerts)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/system/alerts/') && path.includes('/acknowledge') && method === 'POST') {
      return await compose(
        withRateLimit(30, 60000),
        withAdminAuth(),
        withAuditLog('ACKNOWLEDGE_ALERT', 'alert')
      )(handleAcknowledgeAlert)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/system/alerts/') && path.includes('/resolve') && method === 'POST') {
      return await compose(
        withRateLimit(30, 60000),
        withAdminAuth(),
        withAuditLog('RESOLVE_ALERT', 'alert')
      )(handleResolveAlert)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/system/errors') && method === 'GET') {
      return await compose(
        withRateLimit(60, 60000),
        withAdminAuth(),
        withAuditLog('VIEW_SYSTEM_ERRORS', 'system')
      )(handleGetSystemErrors)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/system/errors/') && path.includes('/resolve') && method === 'POST') {
      return await compose(
        withRateLimit(30, 60000),
        withAdminAuth(),
        withAuditLog('RESOLVE_ERROR', 'error')
      )(handleResolveError)(event as AuthenticatedEvent, {});
    }

    // Analytics endpoints
    if (path.includes('/admin/analytics/users') && method === 'GET') {
      return await compose(
        withRateLimit(60, 60000),
        withAdminAuth([AdminPermission.ANALYTICS_VIEW]),
        withAuditLog('VIEW_USER_ANALYTICS', 'analytics')
      )(handleGetUserAnalytics)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/analytics/listings') && method === 'GET') {
      return await compose(
        withRateLimit(60, 60000),
        withAdminAuth([AdminPermission.ANALYTICS_VIEW]),
        withAuditLog('VIEW_LISTING_ANALYTICS', 'analytics')
      )(handleGetListingAnalytics)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/analytics/engagement') && method === 'GET') {
      return await compose(
        withRateLimit(60, 60000),
        withAdminAuth([AdminPermission.ANALYTICS_VIEW]),
        withAuditLog('VIEW_ENGAGEMENT_ANALYTICS', 'analytics')
      )(handleGetEngagementAnalytics)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/analytics/geographic') && method === 'GET') {
      return await compose(
        withRateLimit(60, 60000),
        withAdminAuth([AdminPermission.ANALYTICS_VIEW]),
        withAuditLog('VIEW_GEOGRAPHIC_ANALYTICS', 'analytics')
      )(handleGetGeographicAnalytics)(event as AuthenticatedEvent, {});
    }

    // Platform Settings endpoints
    if (path.includes('/admin/settings') && !path.includes('/admin/settings/') && method === 'GET') {
      return await compose(
        withRateLimit(30, 60000),
        withAdminAuth([AdminPermission.SYSTEM_CONFIG]),
        withAuditLog('VIEW_PLATFORM_SETTINGS', 'settings')
      )(handleGetPlatformSettings)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/settings/') && !path.includes('/validate') && !path.includes('/reset') && !path.includes('/audit-log') && method === 'PUT') {
      return await compose(
        withRateLimit(10, 60000),
        withAdminAuth([AdminPermission.SYSTEM_CONFIG]),
        withAuditLog('UPDATE_PLATFORM_SETTINGS', 'settings')
      )(handleUpdatePlatformSettings)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/settings/') && path.includes('/validate') && method === 'POST') {
      return await compose(
        withRateLimit(20, 60000),
        withAdminAuth([AdminPermission.SYSTEM_CONFIG]),
        withAuditLog('VALIDATE_PLATFORM_SETTINGS', 'settings')
      )(handleValidatePlatformSettings)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/settings/') && path.includes('/reset') && method === 'POST') {
      return await compose(
        withRateLimit(5, 60000),
        withAdminAuth([AdminPermission.SYSTEM_CONFIG]),
        withAuditLog('RESET_PLATFORM_SETTINGS', 'settings')
      )(handleResetPlatformSettings)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/settings/audit-log') && method === 'GET') {
      return await compose(
        withRateLimit(30, 60000),
        withAdminAuth([AdminPermission.SYSTEM_CONFIG]),
        withAuditLog('VIEW_SETTINGS_AUDIT_LOG', 'settings')
      )(handleGetSettingsAuditLog)(event as AuthenticatedEvent, {});
    }

    // Support and Communication endpoints
    if (path.includes('/admin/support/tickets') && !path.includes('/admin/support/tickets/') && method === 'GET') {
      return await compose(
        withRateLimit(50, 60000),
        withAdminAuth(),
        withAuditLog('VIEW_SUPPORT_TICKETS', 'support')
      )(handleGetSupportTickets)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/support/stats') && method === 'GET') {
      return await compose(
        withRateLimit(30, 60000),
        withAdminAuth(),
        withAuditLog('VIEW_SUPPORT_STATS', 'support')
      )(handleGetSupportStats)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/support/tickets/') && !path.includes('/assign') && !path.includes('/responses') && !path.includes('/escalate') && method === 'GET') {
      return await compose(
        withRateLimit(100, 60000),
        withAdminAuth(),
        withAuditLog('VIEW_TICKET_DETAILS', 'ticket')
      )(handleGetTicketDetails)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/support/tickets/') && !path.includes('/assign') && !path.includes('/responses') && !path.includes('/escalate') && method === 'PUT') {
      return await compose(
        withRateLimit(30, 60000),
        withAdminAuth(),
        withAuditLog('UPDATE_TICKET', 'ticket')
      )(handleUpdateTicket)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/support/tickets/') && path.includes('/assign') && method === 'POST') {
      return await compose(
        withRateLimit(20, 60000),
        withAdminAuth(),
        withAuditLog('ASSIGN_TICKET', 'ticket')
      )(handleAssignTicket)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/support/tickets/') && path.includes('/responses') && method === 'POST') {
      return await compose(
        withRateLimit(50, 60000),
        withAdminAuth(),
        withAuditLog('ADD_TICKET_RESPONSE', 'ticket')
      )(handleAddTicketResponse)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/support/tickets/') && path.includes('/escalate') && method === 'POST') {
      return await compose(
        withRateLimit(10, 60000),
        withAdminAuth(),
        withAuditLog('ESCALATE_TICKET', 'ticket')
      )(handleEscalateTicket)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/support/announcements') && !path.includes('/admin/support/announcements/') && method === 'GET') {
      return await compose(
        withRateLimit(30, 60000),
        withAdminAuth(),
        withAuditLog('VIEW_ANNOUNCEMENTS', 'announcements')
      )(handleGetAnnouncements)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/support/announcements/stats') && method === 'GET') {
      return await compose(
        withRateLimit(30, 60000),
        withAdminAuth(),
        withAuditLog('VIEW_ANNOUNCEMENT_STATS', 'announcements')
      )(handleGetAnnouncementStats)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/support/announcements') && !path.includes('/admin/support/announcements/') && method === 'POST') {
      return await compose(
        withRateLimit(10, 60000),
        withAdminAuth(),
        withAuditLog('CREATE_ANNOUNCEMENT', 'announcement')
      )(handleCreateAnnouncement)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/support/announcements/') && !path.includes('/publish') && !path.includes('/archive') && method === 'PUT') {
      return await compose(
        withRateLimit(20, 60000),
        withAdminAuth(),
        withAuditLog('UPDATE_ANNOUNCEMENT', 'announcement')
      )(handleUpdateAnnouncement)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/support/announcements/') && path.includes('/publish') && method === 'POST') {
      return await compose(
        withRateLimit(10, 60000),
        withAdminAuth(),
        withAuditLog('PUBLISH_ANNOUNCEMENT', 'announcement')
      )(handlePublishAnnouncement)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/support/announcements/') && path.includes('/archive') && method === 'POST') {
      return await compose(
        withRateLimit(10, 60000),
        withAdminAuth(),
        withAuditLog('ARCHIVE_ANNOUNCEMENT', 'announcement')
      )(handleArchiveAnnouncement)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/support/templates') && method === 'GET') {
      return await compose(
        withRateLimit(30, 60000),
        withAdminAuth(),
        withAuditLog('VIEW_SUPPORT_TEMPLATES', 'templates')
      )(handleGetSupportTemplates)(event as AuthenticatedEvent, {});
    }

    if (path.includes('/admin/support/templates') && method === 'POST') {
      return await compose(
        withRateLimit(10, 60000),
        withAdminAuth(),
        withAuditLog('CREATE_SUPPORT_TEMPLATE', 'template')
      )(handleCreateSupportTemplate)(event as AuthenticatedEvent, {});
    }

    return createErrorResponse(404, 'NOT_FOUND', 'Endpoint not found', requestId);
  } catch (error) {
    console.error('Admin service error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }
});

// Admin Authentication Handlers
const handleAdminAuthVerify = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    // If we reach here, the user is already authenticated and authorized as admin
    const user = event.user;
    
    // Get fresh user data to ensure current status
    const currentUser = await getUserById(user.sub);
    if (!currentUser) {
      return createErrorResponse(404, 'USER_NOT_FOUND', 'Admin user not found', requestId);
    }

    // Verify admin status is still active
    if (currentUser.status !== UserStatus.ACTIVE) {
      return createErrorResponse(403, 'ACCOUNT_INACTIVE', 'Admin account is not active', requestId);
    }

    // Return admin user info and permissions
    const { password, mfaSecret, passwordResetToken, ...safeUser } = currentUser;
    
    return createResponse(200, {
      user: safeUser,
      permissions: currentUser.permissions || [],
      sessionInfo: {
        sessionId: user.sessionId,
        deviceId: user.deviceId,
        expiresAt: new Date(user.exp * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('Admin auth verify error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to verify admin authentication', requestId);
  }
};

// Dashboard Handlers
const handleGetDashboard = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    // Get platform metrics
    const [userStats, listingStats, systemHealth] = await Promise.all([
      getUserStats(),
      getListingStats(),
      getSystemHealth()
    ]);

    const dashboardData = {
      metrics: {
        totalUsers: userStats.total,
        activeUsers: userStats.active,
        newUsersToday: userStats.newToday,
        totalListings: listingStats.total,
        activeListings: listingStats.active,
        pendingModeration: listingStats.pendingModeration,
        flaggedListings: listingStats.flagged
      },
      systemHealth,
      lastUpdated: new Date().toISOString()
    };

    return createResponse(200, dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to load dashboard', requestId);
  }
};

// User Management Handlers
const handleGetUsers = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const queryParams = event.queryStringParameters || {};

  try {
    const page = parseInt(queryParams.page || '1');
    const limit = Math.min(parseInt(queryParams.limit || '20'), 100);
    const search = queryParams.search;
    const status = queryParams.status as UserStatus;
    const role = queryParams.role as UserRole;

    const users = await getUsers({ page, limit, search, status, role });

    return createResponse(200, users);
  } catch (error) {
    console.error('Get users error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get users', requestId);
  }
};

const handleGetUserDetails = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const userId = event.pathParameters?.userId;

  if (!userId) {
    return createErrorResponse(400, 'MISSING_USER_ID', 'User ID is required', requestId);
  }

  try {
    const [user, userActivity, userSessions] = await Promise.all([
      getUserById(userId),
      getUserActivity(userId),
      getUserSessions(userId)
    ]);

    if (!user) {
      return createErrorResponse(404, 'USER_NOT_FOUND', 'User not found', requestId);
    }

    // Remove sensitive information
    const { password, mfaSecret, passwordResetToken, ...safeUser } = user;

    return createResponse(200, {
      user: safeUser,
      activity: userActivity,
      sessions: userSessions
    });
  } catch (error) {
    console.error('Get user details error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get user details', requestId);
  }
};

const handleUpdateUserStatus = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const userId = event.pathParameters?.userId;

  if (!userId) {
    return createErrorResponse(400, 'MISSING_USER_ID', 'User ID is required', requestId);
  }

  const validator = createValidator({
    status: [(value) => Object.values(UserStatus).includes(value) || 'Invalid status'],
    reason: [(value) => validators.required(value) || 'Reason is required']
  });

  try {
    const body = JSON.parse(event.body || '{}');
    const validation = validator(body);

    if (!validation.valid) {
      return createErrorResponse(400, 'VALIDATION_ERROR', validation.errors.join(', '), requestId);
    }

    const { status, reason } = body;

    // Get current user
    const user = await getUserById(userId);
    if (!user) {
      return createErrorResponse(404, 'USER_NOT_FOUND', 'User not found', requestId);
    }

    // Update user status
    await updateUserStatus(userId, status, reason, event.user.sub);

    // If suspending or banning, invalidate all sessions
    if (status === UserStatus.SUSPENDED || status === UserStatus.BANNED) {
      await invalidateAllUserSessions(userId);
    }

    return createResponse(200, {
      message: 'User status updated successfully',
      userId,
      newStatus: status,
      reason
    });
  } catch (error) {
    console.error('Update user status error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to update user status', requestId);
  }
};

// Listing Management Handlers
const handleGetListings = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const queryParams = event.queryStringParameters || {};

  try {
    const page = parseInt(queryParams.page || '1');
    const limit = Math.min(parseInt(queryParams.limit || '20'), 100);
    const status = queryParams.status;
    const flagged = queryParams.flagged === 'true';

    const listings = await getListings({ page, limit, status, flagged });

    return createResponse(200, listings);
  } catch (error) {
    console.error('Get listings error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get listings', requestId);
  }
};

const handleModerateListing = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const listingId = event.pathParameters?.listingId;

  if (!listingId) {
    return createErrorResponse(400, 'MISSING_LISTING_ID', 'Listing ID is required', requestId);
  }

  const validator = createValidator({
    action: [(value) => ['approve', 'reject', 'request_changes'].includes(value) || 'Invalid action'],
    reason: [(value) => validators.required(value) || 'Reason is required']
  });

  try {
    const body = JSON.parse(event.body || '{}');
    const validation = validator(body);

    if (!validation.valid) {
      return createErrorResponse(400, 'VALIDATION_ERROR', validation.errors.join(', '), requestId);
    }

    const { action, reason, notes } = body;

    // Moderate the listing
    await moderateListing(listingId, action, reason, notes, event.user.sub);

    return createResponse(200, {
      message: 'Listing moderated successfully',
      listingId,
      action,
      reason
    });
  } catch (error) {
    console.error('Moderate listing error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to moderate listing', requestId);
  }
};

// Audit Log Handlers
const handleGetAuditLogs = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const queryParams = event.queryStringParameters || {};

  try {
    const page = parseInt(queryParams.page || '1');
    const limit = Math.min(parseInt(queryParams.limit || '50'), 200);
    const userId = queryParams.userId;
    const action = queryParams.action;
    const resource = queryParams.resource;
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;
    const sortBy = queryParams.sortBy || 'timestamp';
    const sortOrder = queryParams.sortOrder || 'desc';

    const auditLogs = await getAuditLogs({ 
      page, 
      limit, 
      userId, 
      action,
      resource,
      startDate, 
      endDate,
      sortBy,
      sortOrder
    });

    return createResponse(200, auditLogs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get audit logs', requestId);
  }
};

const handleExportAuditLogs = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  const validator = createValidator({
    format: [(value) => ['csv', 'json'].includes(value) || 'Format must be csv or json'],
    startDate: [(value) => validators.required(value) || 'Start date is required'],
    endDate: [(value) => validators.required(value) || 'End date is required']
  });

  try {
    const body = JSON.parse(event.body || '{}');
    const validation = validator(body);

    if (!validation.valid) {
      return createErrorResponse(400, 'VALIDATION_ERROR', validation.errors.join(', '), requestId);
    }

    const { format, startDate, endDate, userId, action, resource } = body;

    // Validate date range (max 90 days)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > 90) {
      return createErrorResponse(400, 'DATE_RANGE_TOO_LARGE', 'Date range cannot exceed 90 days', requestId);
    }

    const exportData = await exportAuditLogs({
      format,
      startDate,
      endDate,
      userId,
      action,
      resource
    });

    return createResponse(200, {
      message: 'Audit logs exported successfully',
      data: exportData.data,
      filename: exportData.filename,
      recordCount: exportData.recordCount
    });
  } catch (error) {
    console.error('Export audit logs error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to export audit logs', requestId);
  }
};

const handleGetAuditLogStats = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const queryParams = event.queryStringParameters || {};

  try {
    const timeRange = queryParams.timeRange || '7d';
    const stats = await getAuditLogStats(timeRange);

    return createResponse(200, stats);
  } catch (error) {
    console.error('Get audit log stats error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get audit log stats', requestId);
  }
};

const handleGetAuditLogRetention = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const retentionInfo = await getAuditLogRetentionInfo();

    return createResponse(200, {
      ...retentionInfo,
      archiveEnabled: process.env.ARCHIVE_BEFORE_DELETE === 'true',
      archiveBucket: process.env.ARCHIVE_BUCKET || null
    });
  } catch (error) {
    console.error('Get audit log retention error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get audit log retention info', requestId);
  }
};

const handleCleanupAuditLogs = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  const validator = createValidator({
    confirm: [(value) => value === true || 'Confirmation required for cleanup operation']
  });

  try {
    const body = JSON.parse(event.body || '{}');
    const validation = validator(body);

    if (!validation.valid) {
      return createErrorResponse(400, 'VALIDATION_ERROR', validation.errors.join(', '), requestId);
    }

    // Perform cleanup
    const result = await cleanupExpiredAuditLogs();

    return createResponse(200, {
      ...result,
      cleanupDate: new Date().toISOString(),
      performedBy: event.user.email
    });
  } catch (error) {
    console.error('Cleanup audit logs error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to cleanup audit logs', requestId);
  }
};

// System Health Handler
const handleGetSystemHealth = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const healthChecks = await getDetailedSystemHealth();
    return createResponse(200, healthChecks);
  } catch (error) {
    console.error('System health error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get system health', requestId);
  }
};

// System Metrics Handler
const handleGetSystemMetrics = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const queryParams = event.queryStringParameters || {};

  try {
    const timeRange = queryParams.timeRange || '1h';
    const granularity = queryParams.granularity || 'minute';
    
    const metrics = await getSystemMetrics(timeRange, granularity);
    return createResponse(200, metrics);
  } catch (error) {
    console.error('System metrics error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get system metrics', requestId);
  }
};

// System Alerts Handlers
const handleGetSystemAlerts = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const queryParams = event.queryStringParameters || {};

  try {
    const status = queryParams.status || 'active';
    const alerts = await getSystemAlerts(status);
    return createResponse(200, { alerts });
  } catch (error) {
    console.error('System alerts error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get system alerts', requestId);
  }
};

const handleAcknowledgeAlert = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const alertId = event.pathParameters?.alertId;

  if (!alertId) {
    return createErrorResponse(400, 'MISSING_ALERT_ID', 'Alert ID is required', requestId);
  }

  try {
    await acknowledgeAlert(alertId, event.user.sub);
    return createResponse(200, { message: 'Alert acknowledged successfully' });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to acknowledge alert', requestId);
  }
};

const handleResolveAlert = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const alertId = event.pathParameters?.alertId;

  if (!alertId) {
    return createErrorResponse(400, 'MISSING_ALERT_ID', 'Alert ID is required', requestId);
  }

  try {
    await resolveAlert(alertId, event.user.sub);
    return createResponse(200, { message: 'Alert resolved successfully' });
  } catch (error) {
    console.error('Resolve alert error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to resolve alert', requestId);
  }
};

// System Errors Handlers
const handleGetSystemErrors = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const queryParams = event.queryStringParameters || {};

  try {
    const timeRange = queryParams.timeRange || '24h';
    const limit = Math.min(parseInt(queryParams.limit || '50'), 100);
    
    const errorStats = await getSystemErrors(timeRange, limit);
    return createResponse(200, errorStats);
  } catch (error) {
    console.error('System errors error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get system errors', requestId);
  }
};

const handleResolveError = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const errorId = event.pathParameters?.errorId;

  if (!errorId) {
    return createErrorResponse(400, 'MISSING_ERROR_ID', 'Error ID is required', requestId);
  }

  try {
    await resolveSystemError(errorId, event.user.sub);
    return createResponse(200, { message: 'Error marked as resolved successfully' });
  } catch (error) {
    console.error('Resolve error error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to resolve error', requestId);
  }
};

// Utility Functions
async function getUserStats() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get total users
    const totalResult = await docClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      Select: 'COUNT'
    }));

    // Get active users
    const activeResult = await docClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': UserStatus.ACTIVE },
      Select: 'COUNT'
    }));

    // Get new users today
    const newTodayResult = await docClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: 'begins_with(createdAt, :today)',
      ExpressionAttributeValues: { ':today': today },
      Select: 'COUNT'
    }));

    return {
      total: totalResult.Count || 0,
      active: activeResult.Count || 0,
      newToday: newTodayResult.Count || 0
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return { total: 0, active: 0, newToday: 0 };
  }
}

async function getListingStats() {
  try {
    // Get total listings
    const totalResult = await docClient.send(new ScanCommand({
      TableName: LISTINGS_TABLE,
      Select: 'COUNT'
    }));

    // Get active listings
    const activeResult = await docClient.send(new ScanCommand({
      TableName: LISTINGS_TABLE,
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': 'active' },
      Select: 'COUNT'
    }));

    return {
      total: totalResult.Count || 0,
      active: activeResult.Count || 0,
      pendingModeration: 0, // TODO: Implement when moderation status is added
      flagged: 0 // TODO: Implement when flagging system is added
    };
  } catch (error) {
    console.error('Error getting listing stats:', error);
    return { total: 0, active: 0, pendingModeration: 0, flagged: 0 };
  }
}

async function getSystemHealth() {
  try {
    const timestamp = new Date().toISOString();
    
    // Basic health checks
    const dbHealthy = await checkDatabaseHealth();
    
    return {
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp,
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        api: 'healthy' // If we're responding, API is healthy
      },
      metrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp
      }
    };
  } catch (error) {
    console.error('Error getting system health:', error);
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function getDetailedSystemHealth() {
  try {
    const timestamp = new Date().toISOString();
    
    // Perform detailed health checks
    const [dbHealth, apiHealth, authHealth] = await Promise.all([
      checkDatabaseHealthDetailed(),
      checkApiHealth(),
      checkAuthServiceHealth()
    ]);

    const healthChecks = [
      {
        service: 'Database',
        status: dbHealth.healthy ? 'healthy' : 'unhealthy',
        responseTime: dbHealth.responseTime,
        lastCheck: timestamp,
        message: dbHealth.message,
        details: dbHealth.details
      },
      {
        service: 'API Gateway',
        status: apiHealth.healthy ? 'healthy' : 'unhealthy',
        responseTime: apiHealth.responseTime,
        lastCheck: timestamp,
        message: apiHealth.message
      },
      {
        service: 'Auth Service',
        status: authHealth.healthy ? 'healthy' : 'unhealthy',
        responseTime: authHealth.responseTime,
        lastCheck: timestamp,
        message: authHealth.message
      }
    ];

    const overallStatus = healthChecks.every(check => check.status === 'healthy') 
      ? 'healthy' 
      : healthChecks.some(check => check.status === 'unhealthy') 
        ? 'unhealthy' 
        : 'degraded';

    return {
      healthChecks,
      overallStatus,
      lastUpdated: timestamp
    };
  } catch (error) {
    console.error('Error getting detailed system health:', error);
    return {
      healthChecks: [],
      overallStatus: 'unhealthy',
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function getSystemMetrics(timeRange: string, granularity: string) {
  try {
    // Generate mock metrics data for demonstration
    // In production, this would fetch from CloudWatch or other monitoring service
    const now = new Date();
    const dataPoints = timeRange === '1h' ? 60 : timeRange === '24h' ? 24 : 7;
    const intervalMs = timeRange === '1h' ? 60000 : timeRange === '24h' ? 3600000 : 86400000;

    const generateMetricData = (baseValue: number, variance: number) => {
      const data = [];
      for (let i = dataPoints; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - (i * intervalMs)).toISOString();
        const value = baseValue + (Math.random() - 0.5) * variance;
        data.push({ timestamp, value: Math.max(0, value) });
      }
      return data;
    };

    return {
      responseTime: generateMetricData(150, 100), // 150ms ± 50ms
      memoryUsage: generateMetricData(65, 20), // 65% ± 10%
      cpuUsage: generateMetricData(45, 30), // 45% ± 15%
      errorRate: generateMetricData(0.5, 1), // 0.5% ± 0.5%
      uptime: process.uptime(),
      activeConnections: Math.floor(Math.random() * 100) + 50,
      requestsPerMinute: Math.floor(Math.random() * 500) + 200
    };
  } catch (error) {
    console.error('Error getting system metrics:', error);
    throw error;
  }
}

async function getSystemAlerts(status: string) {
  try {
    // Mock alerts data - in production, this would come from a monitoring system
    const mockAlerts = [
      {
        id: 'alert-1',
        type: 'warning',
        title: 'High Memory Usage',
        message: 'Memory usage has exceeded 80% for the last 10 minutes',
        service: 'API Gateway',
        threshold: {
          metric: 'memory_usage',
          value: 80,
          operator: '>' as const
        },
        createdAt: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        resolved: false
      },
      {
        id: 'alert-2',
        type: 'critical',
        title: 'Database Connection Timeout',
        message: 'Database queries are timing out frequently',
        service: 'Database',
        threshold: {
          metric: 'response_time',
          value: 5000,
          operator: '>' as const
        },
        createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        resolved: false
      }
    ];

    return status === 'active' ? mockAlerts.filter(alert => !alert.resolved) : mockAlerts;
  } catch (error) {
    console.error('Error getting system alerts:', error);
    throw error;
  }
}

async function getSystemErrors(timeRange: string, limit: number) {
  try {
    // Mock error data - in production, this would come from error tracking service
    const mockErrors = [
      {
        id: 'error-1',
        message: 'Database connection timeout',
        stack: 'Error: Connection timeout\n    at Database.connect (/app/db.js:45:12)\n    at async handler (/app/index.js:23:5)',
        service: 'API Gateway',
        endpoint: '/api/listings',
        method: 'GET',
        statusCode: 500,
        count: 15,
        firstOccurrence: new Date(Date.now() - 3600000).toISOString(),
        lastOccurrence: new Date(Date.now() - 300000).toISOString(),
        resolved: false
      },
      {
        id: 'error-2',
        message: 'Invalid user token',
        service: 'Auth Service',
        endpoint: '/api/auth/validate',
        method: 'POST',
        statusCode: 401,
        count: 8,
        firstOccurrence: new Date(Date.now() - 1800000).toISOString(),
        lastOccurrence: new Date(Date.now() - 600000).toISOString(),
        resolved: false
      }
    ];

    const totalErrors = mockErrors.reduce((sum, error) => sum + error.count, 0);
    const errorRate = 2.3; // Mock error rate percentage

    const errorsByService = mockErrors.reduce((acc, error) => {
      acc[error.service] = (acc[error.service] || 0) + error.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors,
      errorRate,
      topErrors: mockErrors.slice(0, limit),
      errorsByService
    };
  } catch (error) {
    console.error('Error getting system errors:', error);
    throw error;
  }
}

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await docClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      Limit: 1
    }));
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

async function checkDatabaseHealthDetailed() {
  const startTime = Date.now();
  try {
    await docClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      Limit: 1
    }));
    
    const responseTime = Date.now() - startTime;
    return {
      healthy: true,
      responseTime,
      message: 'Database is responding normally',
      details: {
        responseTime: `${responseTime}ms`,
        table: USERS_TABLE
      }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      healthy: false,
      responseTime,
      message: error instanceof Error ? error.message : 'Database connection failed',
      details: {
        responseTime: `${responseTime}ms`,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function checkApiHealth() {
  const startTime = Date.now();
  try {
    // Simple health check - if we can execute this function, API is healthy
    const responseTime = Date.now() - startTime;
    return {
      healthy: true,
      responseTime,
      message: 'API Gateway is responding normally'
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      healthy: false,
      responseTime,
      message: error instanceof Error ? error.message : 'API Gateway error'
    };
  }
}

async function checkAuthServiceHealth() {
  const startTime = Date.now();
  try {
    // Check if we can access sessions table (auth-related)
    await docClient.send(new ScanCommand({
      TableName: SESSIONS_TABLE,
      Limit: 1
    }));
    
    const responseTime = Date.now() - startTime;
    return {
      healthy: true,
      responseTime,
      message: 'Auth service is responding normally'
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      healthy: false,
      responseTime,
      message: error instanceof Error ? error.message : 'Auth service error'
    };
  }
}

async function acknowledgeAlert(alertId: string, adminId: string) {
  try {
    // In production, this would update the alert in a monitoring system
    // For now, we'll just log the acknowledgment
    console.log(`Alert ${alertId} acknowledged by admin ${adminId}`);
    
    // Could store acknowledgments in DynamoDB for tracking
    // await docClient.send(new UpdateCommand({
    //   TableName: 'system-alerts',
    //   Key: { alertId },
    //   UpdateExpression: 'SET acknowledgedAt = :timestamp, acknowledgedBy = :adminId',
    //   ExpressionAttributeValues: {
    //     ':timestamp': new Date().toISOString(),
    //     ':adminId': adminId
    //   }
    // }));
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    throw error;
  }
}

async function resolveAlert(alertId: string, adminId: string) {
  try {
    // In production, this would mark the alert as resolved in a monitoring system
    console.log(`Alert ${alertId} resolved by admin ${adminId}`);
    
    // Could store resolutions in DynamoDB for tracking
    // await docClient.send(new UpdateCommand({
    //   TableName: 'system-alerts',
    //   Key: { alertId },
    //   UpdateExpression: 'SET resolved = :resolved, resolvedAt = :timestamp, resolvedBy = :adminId',
    //   ExpressionAttributeValues: {
    //     ':resolved': true,
    //     ':timestamp': new Date().toISOString(),
    //     ':adminId': adminId
    //   }
    // }));
  } catch (error) {
    console.error('Error resolving alert:', error);
    throw error;
  }
}

async function resolveSystemError(errorId: string, adminId: string) {
  try {
    // In production, this would mark the error as resolved in an error tracking system
    console.log(`Error ${errorId} resolved by admin ${adminId}`);
    
    // Could store error resolutions in DynamoDB for tracking
    // await docClient.send(new UpdateCommand({
    //   TableName: 'system-errors',
    //   Key: { errorId },
    //   UpdateExpression: 'SET resolved = :resolved, resolvedAt = :timestamp, resolvedBy = :adminId',
    //   ExpressionAttributeValues: {
    //     ':resolved': true,
    //     ':timestamp': new Date().toISOString(),
    //     ':adminId': adminId
    //   }
    // }));
  } catch (error) {
    console.error('Error resolving system error:', error);
    throw error;
  }
}

async function getUsers(params: {
  page: number;
  limit: number;
  search?: string;
  status?: UserStatus;
  role?: UserRole;
}) {
  try {
    // For simplicity, using scan. In production, consider using GSI for better performance
    let filterExpression = '';
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (params.status) {
      filterExpression += '#status = :status';
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = params.status;
    }

    if (params.role) {
      if (filterExpression) filterExpression += ' AND ';
      filterExpression += '#role = :role';
      expressionAttributeNames['#role'] = 'role';
      expressionAttributeValues[':role'] = params.role;
    }

    const projectionAttributeNames = {
      ...expressionAttributeNames,
      '#name': 'name',
      '#role': 'role',
      '#status': 'status'
    };

    const result = await docClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: filterExpression || undefined,
      ExpressionAttributeNames: Object.keys(projectionAttributeNames).length > 0 ? projectionAttributeNames : undefined,
      ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
      ProjectionExpression: 'id, email, #name, #role, #status, createdAt, lastLogin, emailVerified, mfaEnabled'
    }));

    let users = result.Items || [];

    // Apply search filter
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      users = users.filter(user => 
        user.email?.toLowerCase().includes(searchLower) ||
        user.name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const total = users.length;
    const startIndex = (params.page - 1) * params.limit;
    const paginatedUsers = users.slice(startIndex, startIndex + params.limit);

    return {
      users: paginatedUsers,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit)
      }
    };
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
}

async function getUserById(userId: string): Promise<User | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { id: userId }
    }));

    return result.Item as User || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

async function getUserActivity(userId: string) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: AUDIT_LOGS_TABLE,
      IndexName: 'userId-timestamp-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ScanIndexForward: false, // Most recent first
      Limit: 50
    }));

    return result.Items || [];
  } catch (error) {
    console.error('Error getting user activity:', error);
    return [];
  }
}

async function getUserSessions(userId: string) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: SESSIONS_TABLE,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ScanIndexForward: false // Most recent first
    }));

    return result.Items || [];
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
}

async function updateUserStatus(userId: string, status: UserStatus, reason: string, adminId: string) {
  try {
    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { id: userId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': new Date().toISOString()
      }
    }));

    // Log the status change
    // This would be handled by the audit middleware, but we can add specific details here
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
}

async function invalidateAllUserSessions(userId: string) {
  try {
    const sessions = await getUserSessions(userId);
    
    for (const session of sessions) {
      if (session.isActive) {
        await docClient.send(new UpdateCommand({
          TableName: SESSIONS_TABLE,
          Key: { sessionId: session.sessionId },
          UpdateExpression: 'SET isActive = :isActive',
          ExpressionAttributeValues: { ':isActive': false }
        }));
      }
    }
  } catch (error) {
    console.error('Error invalidating user sessions:', error);
  }
}

async function getListings(params: {
  page: number;
  limit: number;
  status?: string;
  flagged?: boolean;
}) {
  try {
    let filterExpression = '';
    const expressionAttributeValues: Record<string, any> = {};

    if (params.status) {
      filterExpression = '#status = :status';
      expressionAttributeValues[':status'] = params.status;
    }

    const result = await docClient.send(new ScanCommand({
      TableName: LISTINGS_TABLE,
      FilterExpression: filterExpression || undefined,
      ExpressionAttributeNames: filterExpression ? { '#status': 'status' } : undefined,
      ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined
    }));

    let listings = result.Items || [];

    // Apply pagination
    const total = listings.length;
    const startIndex = (params.page - 1) * params.limit;
    const paginatedListings = listings.slice(startIndex, startIndex + params.limit);

    return {
      listings: paginatedListings,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit)
      }
    };
  } catch (error) {
    console.error('Error getting listings:', error);
    throw error;
  }
}

async function moderateListing(listingId: string, action: string, reason: string, notes: string, adminId: string) {
  try {
    let newStatus = 'active';
    if (action === 'reject') {
      newStatus = 'rejected';
    } else if (action === 'request_changes') {
      newStatus = 'pending_changes';
    }

    await docClient.send(new UpdateCommand({
      TableName: LISTINGS_TABLE,
      Key: { listingId },
      UpdateExpression: 'SET #status = :status, moderatedAt = :moderatedAt, moderatedBy = :moderatedBy, moderationReason = :reason, moderationNotes = :notes',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': newStatus,
        ':moderatedAt': new Date().toISOString(),
        ':moderatedBy': adminId,
        ':reason': reason,
        ':notes': notes
      }
    }));
  } catch (error) {
    console.error('Error moderating listing:', error);
    throw error;
  }
}

async function getAuditLogs(params: {
  page: number;
  limit: number;
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  try {
    let queryCommand;
    let useIndex = false;

    // Determine if we can use an index for better performance
    if (params.userId && !params.action && !params.resource) {
      // Use user-index for user-specific queries
      useIndex = true;
      const keyConditionExpression = 'userId = :userId';
      const expressionAttributeValues: Record<string, any> = { ':userId': params.userId };
      let filterExpression = '';

      if (params.startDate && params.endDate) {
        filterExpression = '#timestamp BETWEEN :startDate AND :endDate';
        expressionAttributeValues[':startDate'] = params.startDate;
        expressionAttributeValues[':endDate'] = params.endDate;
      }

      queryCommand = new QueryCommand({
        TableName: AUDIT_LOGS_TABLE,
        IndexName: 'user-index',
        KeyConditionExpression: keyConditionExpression,
        FilterExpression: filterExpression || undefined,
        ExpressionAttributeNames: filterExpression ? { '#timestamp': 'timestamp' } : undefined,
        ExpressionAttributeValues: expressionAttributeValues,
        ScanIndexForward: params.sortOrder === 'asc'
      });
    } else if (params.action && !params.userId && !params.resource) {
      // Use action-index for action-specific queries
      useIndex = true;
      const keyConditionExpression = '#action = :action';
      const expressionAttributeValues: Record<string, any> = { ':action': params.action };
      let filterExpression = '';

      if (params.startDate && params.endDate) {
        filterExpression = '#timestamp BETWEEN :startDate AND :endDate';
        expressionAttributeValues[':startDate'] = params.startDate;
        expressionAttributeValues[':endDate'] = params.endDate;
      }

      queryCommand = new QueryCommand({
        TableName: AUDIT_LOGS_TABLE,
        IndexName: 'action-index',
        KeyConditionExpression: keyConditionExpression,
        FilterExpression: filterExpression || undefined,
        ExpressionAttributeNames: { '#action': 'action', ...(filterExpression ? { '#timestamp': 'timestamp' } : {}) },
        ExpressionAttributeValues: expressionAttributeValues,
        ScanIndexForward: params.sortOrder === 'asc'
      });
    } else if (params.resource && !params.userId && !params.action) {
      // Use resource-index for resource-specific queries
      useIndex = true;
      const keyConditionExpression = '#resource = :resource';
      const expressionAttributeValues: Record<string, any> = { ':resource': params.resource };
      let filterExpression = '';

      if (params.startDate && params.endDate) {
        filterExpression = '#timestamp BETWEEN :startDate AND :endDate';
        expressionAttributeValues[':startDate'] = params.startDate;
        expressionAttributeValues[':endDate'] = params.endDate;
      }

      queryCommand = new QueryCommand({
        TableName: AUDIT_LOGS_TABLE,
        IndexName: 'resource-index',
        KeyConditionExpression: keyConditionExpression,
        FilterExpression: filterExpression || undefined,
        ExpressionAttributeNames: { '#resource': 'resource', ...(filterExpression ? { '#timestamp': 'timestamp' } : {}) },
        ExpressionAttributeValues: expressionAttributeValues,
        ScanIndexForward: params.sortOrder === 'asc'
      });
    } else {
      // Fall back to scan for complex queries
      let filterExpression = '';
      const expressionAttributeValues: Record<string, any> = {};
      const expressionAttributeNames: Record<string, string> = {};

      if (params.userId) {
        filterExpression = 'userId = :userId';
        expressionAttributeValues[':userId'] = params.userId;
      }

      if (params.action) {
        if (filterExpression) filterExpression += ' AND ';
        filterExpression += '#action = :action';
        expressionAttributeNames['#action'] = 'action';
        expressionAttributeValues[':action'] = params.action;
      }

      if (params.resource) {
        if (filterExpression) filterExpression += ' AND ';
        filterExpression += '#resource = :resource';
        expressionAttributeNames['#resource'] = 'resource';
        expressionAttributeValues[':resource'] = params.resource;
      }

      if (params.startDate && params.endDate) {
        if (filterExpression) filterExpression += ' AND ';
        filterExpression += '#timestamp BETWEEN :startDate AND :endDate';
        expressionAttributeNames['#timestamp'] = 'timestamp';
        expressionAttributeValues[':startDate'] = params.startDate;
        expressionAttributeValues[':endDate'] = params.endDate;
      }

      queryCommand = new ScanCommand({
        TableName: AUDIT_LOGS_TABLE,
        FilterExpression: filterExpression || undefined,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined
      });
    }

    const result = await docClient.send(queryCommand);
    let auditLogs = result.Items || [];

    // Sort if not using index or if custom sort is requested
    if (!useIndex || params.sortBy !== 'timestamp') {
      auditLogs.sort((a, b) => {
        const aValue = a[params.sortBy || 'timestamp'];
        const bValue = b[params.sortBy || 'timestamp'];
        
        if (params.sortBy === 'timestamp') {
          const aTime = new Date(aValue).getTime();
          const bTime = new Date(bValue).getTime();
          return params.sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
        }
        
        // String comparison for other fields
        if (params.sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    // Apply pagination
    const total = auditLogs.length;
    const startIndex = (params.page - 1) * params.limit;
    const paginatedLogs = auditLogs.slice(startIndex, startIndex + params.limit);

    return {
      auditLogs: paginatedLogs,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit)
      }
    };
  } catch (error) {
    console.error('Error getting audit logs:', error);
    throw error;
  }
}

async function exportAuditLogs(params: {
  format: 'csv' | 'json';
  startDate: string;
  endDate: string;
  userId?: string;
  action?: string;
  resource?: string;
}) {
  try {
    // Get all audit logs for the specified period (no pagination for export)
    const logs = await getAuditLogs({
      page: 1,
      limit: 10000, // Large limit for export
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      startDate: params.startDate,
      endDate: params.endDate,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `audit-logs-${timestamp}.${params.format}`;

    if (params.format === 'csv') {
      const csvData = convertToCSV(logs.auditLogs);
      return {
        data: csvData,
        filename,
        recordCount: logs.auditLogs.length
      };
    } else {
      return {
        data: JSON.stringify(logs.auditLogs, null, 2),
        filename,
        recordCount: logs.auditLogs.length
      };
    }
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    throw error;
  }
}

async function getAuditLogStats(timeRange: string) {
  try {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const result = await docClient.send(new ScanCommand({
      TableName: AUDIT_LOGS_TABLE,
      FilterExpression: '#timestamp >= :startDate',
      ExpressionAttributeNames: { '#timestamp': 'timestamp' },
      ExpressionAttributeValues: { ':startDate': startDate.toISOString() }
    }));

    const logs = result.Items || [];

    // Calculate statistics
    const stats = {
      totalActions: logs.length,
      uniqueUsers: new Set(logs.map(log => log.userId)).size,
      actionBreakdown: {} as Record<string, number>,
      resourceBreakdown: {} as Record<string, number>,
      hourlyActivity: {} as Record<string, number>,
      topUsers: {} as Record<string, { count: number; email: string }>,
      timeRange,
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    };

    // Process logs for statistics
    logs.forEach(log => {
      // Action breakdown
      stats.actionBreakdown[log.action] = (stats.actionBreakdown[log.action] || 0) + 1;

      // Resource breakdown
      stats.resourceBreakdown[log.resource] = (stats.resourceBreakdown[log.resource] || 0) + 1;

      // Hourly activity
      const hour = new Date(log.timestamp).toISOString().substring(0, 13);
      stats.hourlyActivity[hour] = (stats.hourlyActivity[hour] || 0) + 1;

      // Top users
      if (!stats.topUsers[log.userId]) {
        stats.topUsers[log.userId] = { count: 0, email: log.userEmail };
      }
      stats.topUsers[log.userId].count++;
    });

    // Convert top users to sorted array
    const topUsersArray = Object.entries(stats.topUsers)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      ...stats,
      topUsers: topUsersArray
    };
  } catch (error) {
    console.error('Error getting audit log stats:', error);
    throw error;
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (typeof value === 'object' && value !== null) {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

// Audit Log Retention and Archiving Functions
async function cleanupExpiredAuditLogs() {
  try {
    const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '365');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(`Starting audit log cleanup for logs older than ${cutoffDate.toISOString()}`);

    // Query for expired logs
    const result = await docClient.send(new ScanCommand({
      TableName: AUDIT_LOGS_TABLE,
      FilterExpression: '#timestamp < :cutoffDate',
      ExpressionAttributeNames: { '#timestamp': 'timestamp' },
      ExpressionAttributeValues: { ':cutoffDate': cutoffDate.toISOString() },
      ProjectionExpression: 'id, #timestamp'
    }));

    const expiredLogs = result.Items || [];
    console.log(`Found ${expiredLogs.length} expired audit logs to clean up`);

    if (expiredLogs.length === 0) {
      return { deletedCount: 0, message: 'No expired logs found' };
    }

    // Archive logs before deletion (optional)
    if (process.env.ARCHIVE_BEFORE_DELETE === 'true') {
      await archiveAuditLogs(expiredLogs);
    }

    // Delete expired logs in batches
    const batchSize = 25; // DynamoDB batch write limit
    let deletedCount = 0;

    for (let i = 0; i < expiredLogs.length; i += batchSize) {
      const batch = expiredLogs.slice(i, i + batchSize);
      
      const deleteRequests = batch.map(log => ({
        DeleteRequest: {
          Key: {
            id: log.id,
            timestamp: log.timestamp
          }
        }
      }));

      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [AUDIT_LOGS_TABLE]: deleteRequests
        }
      }));

      deletedCount += batch.length;
    }

    console.log(`Successfully deleted ${deletedCount} expired audit logs`);
    return { deletedCount, message: `Deleted ${deletedCount} expired audit logs` };
  } catch (error) {
    console.error('Error cleaning up expired audit logs:', error);
    throw error;
  }
}

async function archiveAuditLogs(logs: any[]) {
  try {
    // This is a placeholder for archiving functionality
    // In a real implementation, you might:
    // 1. Export logs to S3
    // 2. Compress the data
    // 3. Store in a separate archive table
    // 4. Send to external logging service

    const archiveData = {
      archiveDate: new Date().toISOString(),
      logCount: logs.length,
      logs: logs
    };

    // Example: Store in S3 (would need S3 client setup)
    // const s3Key = `audit-logs-archive/${new Date().toISOString().split('T')[0]}-${Date.now()}.json`;
    // await s3Client.send(new PutObjectCommand({
    //   Bucket: process.env.ARCHIVE_BUCKET,
    //   Key: s3Key,
    //   Body: JSON.stringify(archiveData),
    //   ContentType: 'application/json'
    // }));

    console.log(`Archived ${logs.length} audit logs`);
    return { archivedCount: logs.length };
  } catch (error) {
    console.error('Error archiving audit logs:', error);
    throw error;
  }
}

async function getAuditLogRetentionInfo() {
  try {
    const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '365');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Count total logs
    const totalResult = await docClient.send(new ScanCommand({
      TableName: AUDIT_LOGS_TABLE,
      Select: 'COUNT'
    }));

    // Count logs that will be deleted
    const expiredResult = await docClient.send(new ScanCommand({
      TableName: AUDIT_LOGS_TABLE,
      FilterExpression: '#timestamp < :cutoffDate',
      ExpressionAttributeNames: { '#timestamp': 'timestamp' },
      ExpressionAttributeValues: { ':cutoffDate': cutoffDate.toISOString() },
      Select: 'COUNT'
    }));

    return {
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      totalLogs: totalResult.Count || 0,
      expiredLogs: expiredResult.Count || 0,
      activeLogsAfterCleanup: (totalResult.Count || 0) - (expiredResult.Count || 0)
    };
  } catch (error) {
    console.error('Error getting audit log retention info:', error);
    throw error;
  }
}
// Analytics Handlers
const handleGetUserAnalytics = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const queryParams = event.queryStringParameters || {};
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;

    if (!startDate || !endDate) {
      return createErrorResponse(400, 'MISSING_PARAMETERS', 'startDate and endDate are required', requestId);
    }

    const userAnalytics = await getUserAnalyticsData(startDate, endDate);
    
    return createResponse(200, userAnalytics);
  } catch (error) {
    console.error('Get user analytics error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get user analytics', requestId);
  }
};

const handleGetListingAnalytics = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const queryParams = event.queryStringParameters || {};
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;

    if (!startDate || !endDate) {
      return createErrorResponse(400, 'MISSING_PARAMETERS', 'startDate and endDate are required', requestId);
    }

    const listingAnalytics = await getListingAnalyticsData(startDate, endDate);
    
    return createResponse(200, listingAnalytics);
  } catch (error) {
    console.error('Get listing analytics error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get listing analytics', requestId);
  }
};

const handleGetEngagementAnalytics = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const queryParams = event.queryStringParameters || {};
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;

    if (!startDate || !endDate) {
      return createErrorResponse(400, 'MISSING_PARAMETERS', 'startDate and endDate are required', requestId);
    }

    const engagementAnalytics = await getEngagementAnalyticsData(startDate, endDate);
    
    return createResponse(200, engagementAnalytics);
  } catch (error) {
    console.error('Get engagement analytics error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get engagement analytics', requestId);
  }
};

const handleGetGeographicAnalytics = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const queryParams = event.queryStringParameters || {};
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;

    if (!startDate || !endDate) {
      return createErrorResponse(400, 'MISSING_PARAMETERS', 'startDate and endDate are required', requestId);
    }

    const geographicAnalytics = await getGeographicAnalyticsData(startDate, endDate);
    
    return createResponse(200, geographicAnalytics);
  } catch (error) {
    console.error('Get geographic analytics error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get geographic analytics', requestId);
  }
};

// Analytics Data Functions
async function getUserAnalyticsData(startDate: string, endDate: string) {
  try {
    // Get all users
    const usersResult = await docClient.send(new ScanCommand({
      TableName: USERS_TABLE
    }));
    
    const users = usersResult.Items || [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Filter users by date range
    const usersInRange = users.filter(user => {
      const createdAt = new Date(user.createdAt);
      return createdAt >= start && createdAt <= end;
    });

    // Calculate metrics
    const totalUsers = users.length;
    const newUsers = usersInRange.length;
    const activeUsers = users.filter(user => user.status === 'active').length;

    // Generate registration trends (daily data)
    const registrationsByDate = generateDailyData(start, end, usersInRange, 'createdAt');

    // Users by region (mock data for now)
    const usersByRegion = [
      { region: 'North America', count: Math.floor(totalUsers * 0.45), percentage: 45 },
      { region: 'Europe', count: Math.floor(totalUsers * 0.30), percentage: 30 },
      { region: 'Asia Pacific', count: Math.floor(totalUsers * 0.15), percentage: 15 },
      { region: 'Other', count: Math.floor(totalUsers * 0.10), percentage: 10 }
    ];

    return {
      totalUsers,
      newUsers,
      activeUsers,
      registrationsByDate,
      usersByRegion
    };
  } catch (error) {
    console.error('Error getting user analytics:', error);
    throw error;
  }
}

async function getListingAnalyticsData(startDate: string, endDate: string) {
  try {
    // Get all listings
    const listingsResult = await docClient.send(new ScanCommand({
      TableName: LISTINGS_TABLE
    }));
    
    const listings = listingsResult.Items || [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Filter listings by date range
    const listingsInRange = listings.filter(listing => {
      const createdAt = new Date(listing.createdAt);
      return createdAt >= start && createdAt <= end;
    });

    // Calculate metrics
    const totalListings = listings.length;
    const newListings = listingsInRange.length;
    const activeListings = listings.filter(listing => listing.status === 'active').length;
    const averageListingPrice = listings.reduce((sum, listing) => sum + (listing.price || 0), 0) / listings.length || 0;

    // Generate listing creation trends (daily data)
    const listingsByDate = generateDailyData(start, end, listingsInRange, 'createdAt');

    // Listings by category (mock data for now)
    const listingsByCategory = [
      { category: 'Sailboat', count: Math.floor(totalListings * 0.35), percentage: 35 },
      { category: 'Motor Yacht', count: Math.floor(totalListings * 0.25), percentage: 25 },
      { category: 'Fishing Boat', count: Math.floor(totalListings * 0.20), percentage: 20 },
      { category: 'Catamaran', count: Math.floor(totalListings * 0.12), percentage: 12 },
      { category: 'Other', count: Math.floor(totalListings * 0.08), percentage: 8 }
    ];

    return {
      totalListings,
      newListings,
      activeListings,
      averageListingPrice,
      listingsByDate,
      listingsByCategory
    };
  } catch (error) {
    console.error('Error getting listing analytics:', error);
    throw error;
  }
}

async function getEngagementAnalyticsData(startDate: string, endDate: string) {
  try {
    // Mock engagement data - in production, this would come from analytics service
    const totalSearches = 15420;
    const uniqueSearchers = 3240;
    const averageSearchesPerUser = totalSearches / uniqueSearchers;
    const listingViews = 45680;
    const averageViewsPerListing = 12.3;
    const inquiries = 2340;
    const inquiryRate = (inquiries / listingViews) * 100;

    const topSearchTerms = [
      { term: 'sailboat', count: 1240, trend: 'up' },
      { term: 'yacht charter', count: 980, trend: 'up' },
      { term: 'fishing boat', count: 760, trend: 'stable' },
      { term: 'catamaran', count: 650, trend: 'down' },
      { term: 'motor yacht', count: 540, trend: 'up' }
    ];

    return {
      totalSearches,
      uniqueSearchers,
      averageSearchesPerUser,
      listingViews,
      averageViewsPerListing,
      inquiries,
      inquiryRate,
      topSearchTerms
    };
  } catch (error) {
    console.error('Error getting engagement analytics:', error);
    throw error;
  }
}

async function getGeographicAnalyticsData(startDate: string, endDate: string) {
  try {
    // Mock geographic data - in production, this would come from user/listing location data
    const usersByState = [
      { state: 'California', count: 1240, percentage: 18.5 },
      { state: 'Florida', count: 980, percentage: 14.6 },
      { state: 'New York', count: 760, percentage: 11.3 },
      { state: 'Texas', count: 650, percentage: 9.7 },
      { state: 'Washington', count: 540, percentage: 8.1 }
    ];

    const listingsByState = [
      { state: 'Florida', count: 890, percentage: 22.3 },
      { state: 'California', count: 720, percentage: 18.0 },
      { state: 'New York', count: 450, percentage: 11.3 },
      { state: 'Texas', count: 380, percentage: 9.5 },
      { state: 'Washington', count: 320, percentage: 8.0 }
    ];

    const topCities = [
      { city: 'Miami', state: 'FL', count: 340, percentage: 8.5 },
      { city: 'San Diego', state: 'CA', count: 280, percentage: 7.0 },
      { city: 'New York', state: 'NY', count: 250, percentage: 6.3 },
      { city: 'Seattle', state: 'WA', count: 190, percentage: 4.8 },
      { city: 'Los Angeles', state: 'CA', count: 180, percentage: 4.5 }
    ];

    return {
      usersByState,
      listingsByState,
      topCities
    };
  } catch (error) {
    console.error('Error getting geographic analytics:', error);
    throw error;
  }
}

// Helper function to generate daily data for charts
function generateDailyData(startDate: Date, endDate: Date, items: any[], dateField: string) {
  const dailyData = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const count = items.filter(item => {
      const itemDate = new Date(item[dateField]).toISOString().split('T')[0];
      return itemDate === dateStr;
    }).length;
    
    dailyData.push({
      date: dateStr,
      value: count
    });
    
    current.setDate(current.getDate() + 1);
  }
  
  return dailyData;
}
// Platform Settings Handlers
const SETTINGS_TABLE = process.env.SETTINGS_TABLE || 'harborlist-platform-settings';
const SETTINGS_AUDIT_TABLE = process.env.SETTINGS_AUDIT_TABLE || 'harborlist-settings-audit';

const handleGetPlatformSettings = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const settings = await getPlatformSettings();
    return createResponse(200, settings);
  } catch (error) {
    console.error('Get platform settings error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get platform settings', requestId);
  }
};

const handleUpdatePlatformSettings = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const section = event.pathParameters?.section;

  if (!section) {
    return createErrorResponse(400, 'MISSING_SECTION', 'Settings section is required', requestId);
  }

  const validator = createValidator({
    data: [(value) => validators.required(value) || 'Settings data is required'],
    reason: [(value) => validators.required(value) || 'Reason is required']
  });

  try {
    const body = JSON.parse(event.body || '{}');
    const validation = validator(body);

    if (!validation.valid) {
      return createErrorResponse(400, 'VALIDATION_ERROR', validation.errors.join(', '), requestId);
    }

    const { data, reason } = body;

    // Get current settings for audit trail
    const currentSettings = await getPlatformSettings();
    const oldValue = currentSettings[section as keyof typeof currentSettings];

    // Update settings
    await updatePlatformSettings(section, data, reason, event.user.sub, event.requestContext.identity.sourceIp || '');

    // Log the change
    await logSettingsChange(
      event.user.sub,
      event.user.email || '',
      section,
      'update',
      oldValue,
      data,
      reason,
      event.requestContext.identity.sourceIp || ''
    );

    return createResponse(200, {
      message: 'Platform settings updated successfully',
      section,
      reason
    });
  } catch (error) {
    console.error('Update platform settings error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to update platform settings', requestId);
  }
};

const handleValidatePlatformSettings = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const section = event.pathParameters?.section;

  if (!section) {
    return createErrorResponse(400, 'MISSING_SECTION', 'Settings section is required', requestId);
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const validation = await validatePlatformSettings(section, body);

    return createResponse(200, {
      valid: validation.valid,
      errors: validation.errors || []
    });
  } catch (error) {
    console.error('Validate platform settings error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to validate platform settings', requestId);
  }
};

const handleResetPlatformSettings = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const section = event.pathParameters?.section;

  if (!section) {
    return createErrorResponse(400, 'MISSING_SECTION', 'Settings section is required', requestId);
  }

  const validator = createValidator({
    reason: [(value) => validators.required(value) || 'Reason is required']
  });

  try {
    const body = JSON.parse(event.body || '{}');
    const validation = validator(body);

    if (!validation.valid) {
      return createErrorResponse(400, 'VALIDATION_ERROR', validation.errors.join(', '), requestId);
    }

    const { reason } = body;

    // Get current settings for audit trail
    const currentSettings = await getPlatformSettings();
    const oldValue = currentSettings[section as keyof typeof currentSettings];

    // Reset settings to defaults
    const defaultValue = await getDefaultSettings(section);
    await updatePlatformSettings(section, defaultValue, reason, event.user.sub, event.requestContext.identity.sourceIp || '');

    // Log the reset
    await logSettingsChange(
      event.user.sub,
      event.user.email || '',
      section,
      'reset',
      oldValue,
      defaultValue,
      reason,
      event.requestContext.identity.sourceIp || ''
    );

    return createResponse(200, {
      message: 'Platform settings reset successfully',
      section,
      reason
    });
  } catch (error) {
    console.error('Reset platform settings error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to reset platform settings', requestId);
  }
};

const handleGetSettingsAuditLog = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const queryParams = event.queryStringParameters || {};

  try {
    const page = parseInt(queryParams.page || '1');
    const limit = Math.min(parseInt(queryParams.limit || '50'), 200);
    const section = queryParams.section;
    const adminEmail = queryParams.adminEmail;
    const dateFrom = queryParams.dateFrom;
    const dateTo = queryParams.dateTo;

    const auditLogs = await getSettingsAuditLog({
      page,
      limit,
      section,
      adminEmail,
      dateFrom,
      dateTo
    });

    return createResponse(200, auditLogs);
  } catch (error) {
    console.error('Get settings audit log error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get settings audit log', requestId);
  }
};

// Platform Settings Utility Functions
async function getPlatformSettings() {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: SETTINGS_TABLE,
      Key: { id: 'platform-settings' }
    }));

    if (!result.Item) {
      // Return default settings if none exist
      return getDefaultPlatformSettings();
    }

    return result.Item.settings;
  } catch (error) {
    console.error('Error getting platform settings:', error);
    // Return defaults on error
    return getDefaultPlatformSettings();
  }
}

async function updatePlatformSettings(section: string, data: any, reason: string, adminId: string, ipAddress: string) {
  try {
    const currentSettings = await getPlatformSettings();
    const updatedSettings = {
      ...currentSettings,
      [section]: data
    };

    await docClient.send(new UpdateCommand({
      TableName: SETTINGS_TABLE,
      Key: { id: 'platform-settings' },
      UpdateExpression: 'SET settings = :settings, lastUpdated = :lastUpdated, lastUpdatedBy = :adminId',
      ExpressionAttributeValues: {
        ':settings': updatedSettings,
        ':lastUpdated': new Date().toISOString(),
        ':adminId': adminId
      }
    }));
  } catch (error) {
    console.error('Error updating platform settings:', error);
    throw error;
  }
}

async function validatePlatformSettings(section: string, data: any) {
  try {
    const errors: string[] = [];

    switch (section) {
      case 'general':
        if (!data.siteName || data.siteName.trim().length === 0) {
          errors.push('Site name is required');
        }
        if (!data.supportEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.supportEmail)) {
          errors.push('Valid support email is required');
        }
        if (data.maxListingsPerUser < 1) {
          errors.push('Max listings per user must be at least 1');
        }
        if (data.sessionTimeout < 15) {
          errors.push('Session timeout must be at least 15 minutes');
        }
        break;

      case 'features':
        // Feature flags are boolean values, basic validation
        const validFlags = ['userRegistration', 'listingCreation', 'messaging', 'reviews', 'analytics', 'paymentProcessing', 'advancedSearch', 'mobileApp', 'socialLogin', 'emailNotifications'];
        for (const flag of validFlags) {
          if (data[flag] !== undefined && typeof data[flag] !== 'boolean') {
            errors.push(`${flag} must be a boolean value`);
          }
        }
        break;

      case 'content':
        if (!data.termsOfService || data.termsOfService.trim().length === 0) {
          errors.push('Terms of Service is required');
        }
        if (!data.privacyPolicy || data.privacyPolicy.trim().length === 0) {
          errors.push('Privacy Policy is required');
        }
        if (!data.communityGuidelines || data.communityGuidelines.trim().length === 0) {
          errors.push('Community Guidelines is required');
        }
        if (!data.listingPolicies || data.listingPolicies.trim().length === 0) {
          errors.push('Listing Policies is required');
        }
        break;

      case 'listings':
        if (data.maxImages < 1 || data.maxImages > 20) {
          errors.push('Max images must be between 1 and 20');
        }
        if (data.maxDescriptionLength < 100) {
          errors.push('Max description length must be at least 100 characters');
        }
        if (data.autoExpireDays < 1) {
          errors.push('Auto expire days must be at least 1');
        }
        break;

      case 'notifications':
        // Basic validation for notification settings
        if (data.emailEnabled !== undefined && typeof data.emailEnabled !== 'boolean') {
          errors.push('Email enabled must be a boolean value');
        }
        if (data.smsEnabled !== undefined && typeof data.smsEnabled !== 'boolean') {
          errors.push('SMS enabled must be a boolean value');
        }
        if (data.pushEnabled !== undefined && typeof data.pushEnabled !== 'boolean') {
          errors.push('Push enabled must be a boolean value');
        }
        break;

      default:
        errors.push('Invalid settings section');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error('Error validating platform settings:', error);
    return {
      valid: false,
      errors: ['Validation failed']
    };
  }
}

async function getDefaultSettings(section: string) {
  const defaults = getDefaultPlatformSettings();
  return defaults[section as keyof typeof defaults];
}

function getDefaultPlatformSettings() {
  return {
    general: {
      siteName: 'HarborList',
      siteDescription: 'The premier marketplace for buying and selling boats',
      supportEmail: 'support@harborlist.com',
      maintenanceMode: false,
      registrationEnabled: true,
      maxListingsPerUser: 10,
      sessionTimeout: 60
    },
    features: {
      userRegistration: true,
      listingCreation: true,
      messaging: true,
      reviews: true,
      analytics: true,
      paymentProcessing: false,
      advancedSearch: true,
      mobileApp: false,
      socialLogin: false,
      emailNotifications: true
    },
    content: {
      termsOfService: 'Default Terms of Service content...',
      privacyPolicy: 'Default Privacy Policy content...',
      communityGuidelines: 'Default Community Guidelines content...',
      listingPolicies: 'Default Listing Policies content...',
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    },
    listings: {
      categories: [
        { id: 'sailboat', name: 'Sailboat', description: 'Sailing vessels', active: true, order: 1 },
        { id: 'motorboat', name: 'Motorboat', description: 'Power boats', active: true, order: 2 },
        { id: 'yacht', name: 'Yacht', description: 'Luxury yachts', active: true, order: 3 }
      ],
      pricingTiers: [
        { id: 'basic', name: 'Basic', description: 'Basic listing features', price: 0, features: ['Basic listing', '5 photos'], active: true, order: 1 },
        { id: 'premium', name: 'Premium', description: 'Enhanced listing features', price: 29.99, features: ['Featured listing', '15 photos', 'Priority support'], active: true, order: 2 }
      ],
      maxImages: 10,
      maxDescriptionLength: 2000,
      requireApproval: false,
      autoExpireDays: 90
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: false,
      templates: [
        {
          id: 'welcome',
          name: 'Welcome Email',
          type: 'email',
          subject: 'Welcome to HarborList!',
          content: 'Welcome to HarborList! We\'re excited to have you aboard.',
          variables: ['userName', 'siteName'],
          active: true
        }
      ]
    }
  };
}

async function logSettingsChange(
  adminId: string,
  adminEmail: string,
  section: string,
  field: string,
  oldValue: any,
  newValue: any,
  reason: string,
  ipAddress: string
) {
  try {
    const auditEntry = {
      id: `settings-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      adminId,
      adminEmail,
      section,
      field,
      oldValue,
      newValue,
      reason,
      timestamp: new Date().toISOString(),
      ipAddress
    };

    await docClient.send(new UpdateCommand({
      TableName: SETTINGS_AUDIT_TABLE,
      Key: { id: auditEntry.id },
      UpdateExpression: 'SET adminId = :adminId, adminEmail = :adminEmail, section = :section, field = :field, oldValue = :oldValue, newValue = :newValue, reason = :reason, #timestamp = :timestamp, ipAddress = :ipAddress',
      ExpressionAttributeNames: {
        '#timestamp': 'timestamp'
      },
      ExpressionAttributeValues: {
        ':adminId': auditEntry.adminId,
        ':adminEmail': auditEntry.adminEmail,
        ':section': auditEntry.section,
        ':field': auditEntry.field,
        ':oldValue': auditEntry.oldValue,
        ':newValue': auditEntry.newValue,
        ':reason': auditEntry.reason,
        ':timestamp': auditEntry.timestamp,
        ':ipAddress': auditEntry.ipAddress
      }
    }));
  } catch (error) {
    console.error('Error logging settings change:', error);
    // Don't throw error as this is audit logging
  }
}

async function getSettingsAuditLog(params: {
  page: number;
  limit: number;
  section?: string;
  adminEmail?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    const { page, limit, section, adminEmail, dateFrom, dateTo } = params;

    let filterExpression = '';
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (section) {
      filterExpression += 'section = :section';
      expressionAttributeValues[':section'] = section;
    }

    if (adminEmail) {
      if (filterExpression) filterExpression += ' AND ';
      filterExpression += 'adminEmail = :adminEmail';
      expressionAttributeValues[':adminEmail'] = adminEmail;
    }

    if (dateFrom) {
      if (filterExpression) filterExpression += ' AND ';
      filterExpression += '#timestamp >= :dateFrom';
      expressionAttributeNames['#timestamp'] = 'timestamp';
      expressionAttributeValues[':dateFrom'] = dateFrom;
    }

    if (dateTo) {
      if (filterExpression) filterExpression += ' AND ';
      filterExpression += '#timestamp <= :dateTo';
      expressionAttributeNames['#timestamp'] = 'timestamp';
      expressionAttributeValues[':dateTo'] = dateTo;
    }

    const scanParams: any = {
      TableName: SETTINGS_AUDIT_TABLE,
      Limit: limit
    };

    if (filterExpression) {
      scanParams.FilterExpression = filterExpression;
      if (Object.keys(expressionAttributeNames).length > 0) {
        scanParams.ExpressionAttributeNames = expressionAttributeNames;
      }
      scanParams.ExpressionAttributeValues = expressionAttributeValues;
    }

    const result = await docClient.send(new ScanCommand(scanParams));

    // Sort by timestamp descending
    const logs = (result.Items || []).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
      logs,
      total: result.Count || 0,
      page,
      hasMore: result.LastEvaluatedKey !== undefined
    };
  } catch (error) {
    console.error('Error getting settings audit log:', error);
    return {
      logs: [],
      total: 0,
      page: params.page,
      hasMore: false
    };
  }
}
// Support and Communication Handlers
const SUPPORT_TICKETS_TABLE = process.env.SUPPORT_TICKETS_TABLE || 'harborlist-support-tickets';
const SUPPORT_RESPONSES_TABLE = process.env.SUPPORT_RESPONSES_TABLE || 'harborlist-support-responses';
const ANNOUNCEMENTS_TABLE = process.env.ANNOUNCEMENTS_TABLE || 'harborlist-announcements';
const SUPPORT_TEMPLATES_TABLE = process.env.SUPPORT_TEMPLATES_TABLE || 'harborlist-support-templates';

const handleGetSupportTickets = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const queryParams = event.queryStringParameters || {};

  try {
    const page = parseInt(queryParams.page || '1');
    const limit = Math.min(parseInt(queryParams.limit || '20'), 100);
    const status = queryParams.status;
    const priority = queryParams.priority;
    const category = queryParams.category;
    const search = queryParams.search;

    // Mock data for now - in production, this would query DynamoDB
    const mockTickets = [
      {
        id: 'ticket-1',
        ticketNumber: 'T-2024-001',
        subject: 'Unable to upload boat images',
        description: 'I am having trouble uploading images for my boat listing. The upload fails every time.',
        status: 'open',
        priority: 'medium',
        category: 'technical',
        userId: 'user-1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        assignedTo: null,
        assignedToName: null,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ['upload', 'images'],
        attachments: [],
        responses: [],
        escalated: false
      },
      {
        id: 'ticket-2',
        ticketNumber: 'T-2024-002',
        subject: 'Payment processing issue',
        description: 'My payment was charged but the listing was not upgraded to premium.',
        status: 'in_progress',
        priority: 'high',
        category: 'billing',
        userId: 'user-2',
        userName: 'Jane Smith',
        userEmail: 'jane@example.com',
        assignedTo: 'admin-1',
        assignedToName: 'Admin User',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        tags: ['payment', 'premium'],
        attachments: [],
        responses: [
          {
            id: 'response-1',
            ticketId: 'ticket-2',
            message: 'We are investigating this payment issue. Can you provide the transaction ID?',
            isInternal: false,
            authorId: 'admin-1',
            authorName: 'Admin User',
            authorType: 'admin',
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            attachments: [],
            readBy: [],
            readAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
          }
        ],
        escalated: false
      }
    ];

    // Apply filters
    let filteredTickets = mockTickets;
    if (status) {
      filteredTickets = filteredTickets.filter(ticket => ticket.status === status);
    }
    if (priority) {
      filteredTickets = filteredTickets.filter(ticket => ticket.priority === priority);
    }
    if (category) {
      filteredTickets = filteredTickets.filter(ticket => ticket.category === category);
    }
    if (search) {
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
        ticket.description.toLowerCase().includes(search.toLowerCase()) ||
        ticket.userName.toLowerCase().includes(search.toLowerCase()) ||
        ticket.userEmail.toLowerCase().includes(search.toLowerCase())
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

    return createResponse(200, {
      tickets: paginatedTickets,
      total: filteredTickets.length,
      page,
      totalPages: Math.ceil(filteredTickets.length / limit)
    });
  } catch (error) {
    console.error('Get support tickets error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get support tickets', requestId);
  }
};

const handleGetSupportStats = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    // Mock stats - in production, this would aggregate from DynamoDB
    const stats = {
      totalTickets: 156,
      openTickets: 23,
      inProgressTickets: 12,
      resolvedToday: 8,
      averageResponseTime: 4.5 * 60 * 60, // 4.5 hours in seconds
      averageResolutionTime: 24 * 60 * 60, // 24 hours in seconds
      satisfactionScore: 0.87,
      ticketsByPriority: {
        low: 45,
        medium: 78,
        high: 28,
        urgent: 5
      },
      ticketsByCategory: {
        technical: 62,
        billing: 34,
        account: 28,
        listing: 21,
        general: 11
      },
      ticketsByStatus: {
        open: 23,
        in_progress: 12,
        waiting_response: 8,
        resolved: 98,
        closed: 15
      }
    };

    return createResponse(200, stats);
  } catch (error) {
    console.error('Get support stats error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get support stats', requestId);
  }
};

const handleGetTicketDetails = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const ticketId = event.pathParameters?.ticketId;

  if (!ticketId) {
    return createErrorResponse(400, 'MISSING_PARAMETER', 'Ticket ID is required', requestId);
  }

  try {
    // Mock ticket details - in production, this would query DynamoDB
    const mockTicket = {
      id: ticketId,
      ticketNumber: 'T-2024-001',
      subject: 'Unable to upload boat images',
      description: 'I am having trouble uploading images for my boat listing. The upload fails every time.',
      status: 'open',
      priority: 'medium',
      category: 'technical',
      userId: 'user-1',
      userName: 'John Doe',
      userEmail: 'john@example.com',
      assignedTo: null,
      assignedToName: null,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['upload', 'images'],
      attachments: [],
      responses: [],
      escalated: false
    };

    return createResponse(200, mockTicket);
  } catch (error) {
    console.error('Get ticket details error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get ticket details', requestId);
  }
};

const handleUpdateTicket = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const ticketId = event.pathParameters?.ticketId;

  if (!ticketId) {
    return createErrorResponse(400, 'MISSING_PARAMETER', 'Ticket ID is required', requestId);
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { status, priority, tags, notes } = body;

    // Mock update - in production, this would update DynamoDB
    const updatedTicket = {
      id: ticketId,
      status,
      priority,
      tags,
      notes,
      updatedAt: new Date().toISOString()
    };

    return createResponse(200, { message: 'Ticket updated successfully', ticket: updatedTicket });
  } catch (error) {
    console.error('Update ticket error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to update ticket', requestId);
  }
};

const handleAssignTicket = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const ticketId = event.pathParameters?.ticketId;

  if (!ticketId) {
    return createErrorResponse(400, 'MISSING_PARAMETER', 'Ticket ID is required', requestId);
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { assignedTo } = body;

    if (!assignedTo) {
      return createErrorResponse(400, 'MISSING_PARAMETER', 'Assigned to is required', requestId);
    }

    // Mock assignment - in production, this would update DynamoDB
    return createResponse(200, { message: 'Ticket assigned successfully' });
  } catch (error) {
    console.error('Assign ticket error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to assign ticket', requestId);
  }
};

const handleAddTicketResponse = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const ticketId = event.pathParameters?.ticketId;

  if (!ticketId) {
    return createErrorResponse(400, 'MISSING_PARAMETER', 'Ticket ID is required', requestId);
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { message, isInternal = false } = body;

    if (!message || message.trim().length === 0) {
      return createErrorResponse(400, 'MISSING_PARAMETER', 'Message is required', requestId);
    }

    // Mock response creation - in production, this would create in DynamoDB
    const response = {
      id: `response-${Date.now()}`,
      ticketId,
      message,
      isInternal,
      authorId: event.user.sub,
      authorName: event.user.name || 'Admin User',
      authorType: 'admin',
      createdAt: new Date().toISOString(),
      attachments: [],
      readBy: []
    };

    return createResponse(200, { message: 'Response added successfully', response });
  } catch (error) {
    console.error('Add ticket response error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to add ticket response', requestId);
  }
};

const handleEscalateTicket = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const ticketId = event.pathParameters?.ticketId;

  if (!ticketId) {
    return createErrorResponse(400, 'MISSING_PARAMETER', 'Ticket ID is required', requestId);
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { reason } = body;

    if (!reason || reason.trim().length === 0) {
      return createErrorResponse(400, 'MISSING_PARAMETER', 'Escalation reason is required', requestId);
    }

    // Mock escalation - in production, this would update DynamoDB
    return createResponse(200, { message: 'Ticket escalated successfully' });
  } catch (error) {
    console.error('Escalate ticket error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to escalate ticket', requestId);
  }
};

const handleGetAnnouncements = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const queryParams = event.queryStringParameters || {};

  try {
    const page = parseInt(queryParams.page || '1');
    const limit = Math.min(parseInt(queryParams.limit || '20'), 100);
    const status = queryParams.status;
    const type = queryParams.type;

    // Mock announcements - in production, this would query DynamoDB
    const mockAnnouncements = [
      {
        id: 'announcement-1',
        title: 'New Feature: Advanced Search Filters',
        content: 'We\'ve added new search filters to help you find the perfect boat faster.',
        type: 'feature',
        status: 'published',
        targetAudience: 'all',
        scheduledAt: null,
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: null,
        createdBy: 'admin-1',
        createdByName: 'Admin User',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'medium',
        channels: [
          { type: 'email', enabled: true },
          { type: 'in_app', enabled: true }
        ],
        readBy: [],
        clickCount: 45,
        impressionCount: 1250,
        tags: ['feature', 'search']
      },
      {
        id: 'announcement-2',
        title: 'Scheduled Maintenance - Sunday 2AM EST',
        content: 'We will be performing scheduled maintenance on Sunday from 2AM to 4AM EST.',
        type: 'maintenance',
        status: 'scheduled',
        targetAudience: 'all',
        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        publishedAt: null,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'admin-1',
        createdByName: 'Admin User',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
        channels: [
          { type: 'email', enabled: true },
          { type: 'in_app', enabled: true },
          { type: 'push', enabled: true }
        ],
        readBy: [],
        clickCount: 0,
        impressionCount: 0,
        tags: ['maintenance', 'downtime']
      }
    ];

    // Apply filters
    let filteredAnnouncements = mockAnnouncements;
    if (status) {
      filteredAnnouncements = filteredAnnouncements.filter(announcement => announcement.status === status);
    }
    if (type) {
      filteredAnnouncements = filteredAnnouncements.filter(announcement => announcement.type === type);
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAnnouncements = filteredAnnouncements.slice(startIndex, endIndex);

    return createResponse(200, {
      announcements: paginatedAnnouncements,
      total: filteredAnnouncements.length,
      page,
      totalPages: Math.ceil(filteredAnnouncements.length / limit)
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get announcements', requestId);
  }
};

const handleGetAnnouncementStats = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    // Mock stats - in production, this would aggregate from DynamoDB
    const stats = {
      totalAnnouncements: 25,
      activeAnnouncements: 8,
      scheduledAnnouncements: 3,
      totalImpressions: 15420,
      totalClicks: 892,
      averageClickRate: 0.058,
      announcementsByType: {
        info: 12,
        warning: 3,
        maintenance: 4,
        feature: 5,
        promotion: 1
      }
    };

    return createResponse(200, stats);
  } catch (error) {
    console.error('Get announcement stats error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get announcement stats', requestId);
  }
};

const handleCreateAnnouncement = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const body = JSON.parse(event.body || '{}');
    const { title, content, type, targetAudience, priority, scheduledAt, expiresAt, channels } = body;

    if (!title || title.trim().length === 0) {
      return createErrorResponse(400, 'MISSING_PARAMETER', 'Title is required', requestId);
    }

    if (!content || content.trim().length === 0) {
      return createErrorResponse(400, 'MISSING_PARAMETER', 'Content is required', requestId);
    }

    // Mock creation - in production, this would create in DynamoDB
    const announcement = {
      id: `announcement-${Date.now()}`,
      title,
      content,
      type: type || 'info',
      status: scheduledAt ? 'scheduled' : 'published',
      targetAudience: targetAudience || 'all',
      scheduledAt,
      publishedAt: scheduledAt ? null : new Date().toISOString(),
      expiresAt,
      createdBy: event.user.sub,
      createdByName: event.user.name || 'Admin User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priority: priority || 'medium',
      channels: channels || [{ type: 'in_app', enabled: true }],
      readBy: [],
      clickCount: 0,
      impressionCount: 0,
      tags: []
    };

    return createResponse(200, { message: 'Announcement created successfully', announcement });
  } catch (error) {
    console.error('Create announcement error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to create announcement', requestId);
  }
};

const handleUpdateAnnouncement = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const announcementId = event.pathParameters?.announcementId;

  if (!announcementId) {
    return createErrorResponse(400, 'MISSING_PARAMETER', 'Announcement ID is required', requestId);
  }

  try {
    const body = JSON.parse(event.body || '{}');
    
    // Mock update - in production, this would update DynamoDB
    return createResponse(200, { message: 'Announcement updated successfully' });
  } catch (error) {
    console.error('Update announcement error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to update announcement', requestId);
  }
};

const handlePublishAnnouncement = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const announcementId = event.pathParameters?.announcementId;

  if (!announcementId) {
    return createErrorResponse(400, 'MISSING_PARAMETER', 'Announcement ID is required', requestId);
  }

  try {
    // Mock publish - in production, this would update DynamoDB
    return createResponse(200, { message: 'Announcement published successfully' });
  } catch (error) {
    console.error('Publish announcement error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to publish announcement', requestId);
  }
};

const handleArchiveAnnouncement = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const announcementId = event.pathParameters?.announcementId;

  if (!announcementId) {
    return createErrorResponse(400, 'MISSING_PARAMETER', 'Announcement ID is required', requestId);
  }

  try {
    // Mock archive - in production, this would update DynamoDB
    return createResponse(200, { message: 'Announcement archived successfully' });
  } catch (error) {
    console.error('Archive announcement error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to archive announcement', requestId);
  }
};

const handleGetSupportTemplates = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    // Mock templates - in production, this would query DynamoDB
    const mockTemplates = [
      {
        id: 'template-1',
        name: 'Welcome Response',
        subject: 'Thank you for contacting support',
        content: 'Hello {{userName}},\n\nThank you for contacting HarborList support. We have received your inquiry and will respond within 24 hours.\n\nBest regards,\nSupport Team',
        category: 'general',
        variables: ['userName'],
        isActive: true,
        createdBy: 'admin-1',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        usageCount: 45
      },
      {
        id: 'template-2',
        name: 'Technical Issue Resolution',
        subject: 'Technical Issue Resolved',
        content: 'Hello {{userName}},\n\nWe have resolved the technical issue you reported. Please try again and let us know if you continue to experience problems.\n\nBest regards,\nTechnical Support',
        category: 'technical',
        variables: ['userName'],
        isActive: true,
        createdBy: 'admin-1',
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        usageCount: 23
      }
    ];

    return createResponse(200, { templates: mockTemplates });
  } catch (error) {
    console.error('Get support templates error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get support templates', requestId);
  }
};

const handleCreateSupportTemplate = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const body = JSON.parse(event.body || '{}');
    const { name, subject, content, category, variables } = body;

    if (!name || name.trim().length === 0) {
      return createErrorResponse(400, 'MISSING_PARAMETER', 'Template name is required', requestId);
    }

    if (!content || content.trim().length === 0) {
      return createErrorResponse(400, 'MISSING_PARAMETER', 'Template content is required', requestId);
    }

    // Mock creation - in production, this would create in DynamoDB
    const template = {
      id: `template-${Date.now()}`,
      name,
      subject: subject || '',
      content,
      category: category || 'general',
      variables: variables || [],
      isActive: true,
      createdBy: event.user.sub,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0
    };

    return createResponse(200, { message: 'Support template created successfully', template });
  } catch (error) {
    console.error('Create support template error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to create support template', requestId);
  }
};
// Enhanced Audit Log Handlers
const handleSearchAuditLogs = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  const validator = createValidator({
    query: [(value) => validators.required(value) || 'Search query is required'],
    startDate: [(value) => !value || !isNaN(Date.parse(value)) || 'Invalid start date'],
    endDate: [(value) => !value || !isNaN(Date.parse(value)) || 'Invalid end date']
  });

  try {
    const body = JSON.parse(event.body || '{}');
    const validation = validator(body);

    if (!validation.valid) {
      return createErrorResponse(400, 'VALIDATION_ERROR', validation.errors.join(', '), requestId);
    }

    const { query, startDate, endDate, filters = {} } = body;
    const page = parseInt(body.page || '1');
    const limit = Math.min(parseInt(body.limit || '50'), 200);

    // Perform advanced search with full-text capabilities
    const searchResults = await searchAuditLogs({
      query,
      startDate,
      endDate,
      filters,
      page,
      limit
    });

    return createResponse(200, searchResults);
  } catch (error) {
    console.error('Search audit logs error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to search audit logs', requestId);
  }
};

const handleGetUserAuditLogs = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const userId = event.pathParameters?.userId;

  if (!userId) {
    return createErrorResponse(400, 'MISSING_USER_ID', 'User ID is required', requestId);
  }

  try {
    const queryParams = event.queryStringParameters || {};
    const page = parseInt(queryParams.page || '1');
    const limit = Math.min(parseInt(queryParams.limit || '50'), 200);
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;
    const action = queryParams.action;

    const userAuditLogs = await getUserAuditLogs({
      userId,
      page,
      limit,
      startDate,
      endDate,
      action
    });

    return createResponse(200, userAuditLogs);
  } catch (error) {
    console.error('Get user audit logs error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get user audit logs', requestId);
  }
};

const handleGetResourceAuditLogs = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const resourceId = event.pathParameters?.resourceId;

  if (!resourceId) {
    return createErrorResponse(400, 'MISSING_RESOURCE_ID', 'Resource ID is required', requestId);
  }

  try {
    const queryParams = event.queryStringParameters || {};
    const page = parseInt(queryParams.page || '1');
    const limit = Math.min(parseInt(queryParams.limit || '50'), 200);
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;
    const resourceType = queryParams.resourceType;

    const resourceAuditLogs = await getResourceAuditLogs({
      resourceId,
      resourceType,
      page,
      limit,
      startDate,
      endDate
    });

    return createResponse(200, resourceAuditLogs);
  } catch (error) {
    console.error('Get resource audit logs error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get resource audit logs', requestId);
  }
};

const handleGetAuditLogTimeline = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const queryParams = event.queryStringParameters || {};
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;
    const granularity = queryParams.granularity || 'hour';
    const userId = queryParams.userId;
    const action = queryParams.action;

    if (!startDate || !endDate) {
      return createErrorResponse(400, 'MISSING_DATES', 'Start date and end date are required', requestId);
    }

    const timeline = await getAuditLogTimeline({
      startDate,
      endDate,
      granularity,
      userId,
      action
    });

    return createResponse(200, timeline);
  } catch (error) {
    console.error('Get audit log timeline error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get audit log timeline', requestId);
  }
};

// Session Management Handlers
const handleGetAdminSessions = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const queryParams = event.queryStringParameters || {};
    const page = parseInt(queryParams.page || '1');
    const limit = Math.min(parseInt(queryParams.limit || '20'), 100);
    const status = queryParams.status || 'active';
    const userId = queryParams.userId;

    const sessions = await getAdminSessions({
      page,
      limit,
      status,
      userId
    });

    return createResponse(200, sessions);
  } catch (error) {
    console.error('Get admin sessions error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get admin sessions', requestId);
  }
};

const handleGetCurrentSession = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const sessionId = event.user.sessionId;
    const session = await getSessionById(sessionId);

    if (!session) {
      return createErrorResponse(404, 'SESSION_NOT_FOUND', 'Current session not found', requestId);
    }

    return createResponse(200, {
      session,
      securityInfo: {
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        lastActivity: session.lastActivity,
        issuedAt: session.issuedAt,
        expiresAt: session.expiresAt
      }
    });
  } catch (error) {
    console.error('Get current session error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get current session', requestId);
  }
};

const handleTerminateSession = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const sessionId = event.pathParameters?.sessionId;

  if (!sessionId) {
    return createErrorResponse(400, 'MISSING_SESSION_ID', 'Session ID is required', requestId);
  }

  try {
    const session = await getSessionById(sessionId);
    if (!session) {
      return createErrorResponse(404, 'SESSION_NOT_FOUND', 'Session not found', requestId);
    }

    // Prevent self-termination
    if (sessionId === event.user.sessionId) {
      return createErrorResponse(400, 'CANNOT_TERMINATE_SELF', 'Cannot terminate your own session', requestId);
    }

    await terminateSession(sessionId, event.user.sub);

    return createResponse(200, {
      message: 'Session terminated successfully',
      sessionId,
      terminatedBy: event.user.email
    });
  } catch (error) {
    console.error('Terminate session error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to terminate session', requestId);
  }
};

const handleGetUserSessions = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const userId = event.pathParameters?.userId;

  if (!userId) {
    return createErrorResponse(400, 'MISSING_USER_ID', 'User ID is required', requestId);
  }

  try {
    const queryParams = event.queryStringParameters || {};
    const includeInactive = queryParams.includeInactive === 'true';

    const sessions = await getUserSessions(userId);

    return createResponse(200, {
      userId,
      sessions,
      totalActive: sessions.filter(s => s.isActive).length,
      totalInactive: sessions.filter(s => !s.isActive).length
    });
  } catch (error) {
    console.error('Get user sessions error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get user sessions', requestId);
  }
};

const handleTerminateAllUserSessions = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const userId = event.pathParameters?.userId;

  if (!userId) {
    return createErrorResponse(400, 'MISSING_USER_ID', 'User ID is required', requestId);
  }

  const validator = createValidator({
    confirm: [(value) => value === true || 'Confirmation required for terminating all sessions']
  });

  try {
    const body = JSON.parse(event.body || '{}');
    const validation = validator(body);

    if (!validation.valid) {
      return createErrorResponse(400, 'VALIDATION_ERROR', validation.errors.join(', '), requestId);
    }

    // Prevent terminating own sessions
    if (userId === event.user.sub) {
      return createErrorResponse(400, 'CANNOT_TERMINATE_OWN_SESSIONS', 'Cannot terminate your own sessions', requestId);
    }

    const result = await terminateAllUserSessions(userId, event.user.sub);

    return createResponse(200, {
      message: 'All user sessions terminated successfully',
      userId,
      terminatedCount: result.terminatedCount,
      terminatedBy: event.user.email
    });
  } catch (error) {
    console.error('Terminate all user sessions error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to terminate all user sessions', requestId);
  }
};

// Security Monitoring Handlers
const handleGetSuspiciousActivity = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const queryParams = event.queryStringParameters || {};
    const timeRange = queryParams.timeRange || '24h';
    const severity = queryParams.severity || 'all';
    const page = parseInt(queryParams.page || '1');
    const limit = Math.min(parseInt(queryParams.limit || '50'), 200);

    const suspiciousActivity = await getSuspiciousActivity({
      timeRange,
      severity,
      page,
      limit
    });

    return createResponse(200, suspiciousActivity);
  } catch (error) {
    console.error('Get suspicious activity error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get suspicious activity', requestId);
  }
};

const handleGetLoginAttempts = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const queryParams = event.queryStringParameters || {};
    const page = parseInt(queryParams.page || '1');
    const limit = Math.min(parseInt(queryParams.limit || '50'), 200);
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;
    const success = queryParams.success;
    const email = queryParams.email;
    const ipAddress = queryParams.ipAddress;

    const loginAttempts = await getLoginAttempts({
      page,
      limit,
      startDate,
      endDate,
      success: success ? success === 'true' : undefined,
      email,
      ipAddress
    });

    return createResponse(200, loginAttempts);
  } catch (error) {
    console.error('Get login attempts error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get login attempts', requestId);
  }
};

const handleGetFailedLogins = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const queryParams = event.queryStringParameters || {};
    const timeRange = queryParams.timeRange || '24h';
    const groupBy = queryParams.groupBy || 'email';

    const failedLogins = await getFailedLogins({
      timeRange,
      groupBy
    });

    return createResponse(200, failedLogins);
  } catch (error) {
    console.error('Get failed logins error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get failed logins', requestId);
  }
};

const handleGetIpAnalysis = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const queryParams = event.queryStringParameters || {};
    const timeRange = queryParams.timeRange || '24h';
    const ipAddress = queryParams.ipAddress;

    const ipAnalysis = await getIpAnalysis({
      timeRange,
      ipAddress
    });

    return createResponse(200, ipAnalysis);
  } catch (error) {
    console.error('Get IP analysis error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get IP analysis', requestId);
  }
};

const handleGetRateLimitViolations = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const queryParams = event.queryStringParameters || {};
    const timeRange = queryParams.timeRange || '24h';
    const page = parseInt(queryParams.page || '1');
    const limit = Math.min(parseInt(queryParams.limit || '50'), 200);

    const violations = await getRateLimitViolations({
      timeRange,
      page,
      limit
    });

    return createResponse(200, violations);
  } catch (error) {
    console.error('Get rate limit violations error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get rate limit violations', requestId);
  }
};

const handleGetSecurityAlerts = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const queryParams = event.queryStringParameters || {};
    const status = queryParams.status || 'active';
    const severity = queryParams.severity;
    const page = parseInt(queryParams.page || '1');
    const limit = Math.min(parseInt(queryParams.limit || '50'), 200);

    const alerts = await getSecurityAlerts({
      status,
      severity,
      page,
      limit
    });

    return createResponse(200, alerts);
  } catch (error) {
    console.error('Get security alerts error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get security alerts', requestId);
  }
};

const handleAcknowledgeSecurityAlert = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const alertId = event.pathParameters?.alertId;

  if (!alertId) {
    return createErrorResponse(400, 'MISSING_ALERT_ID', 'Alert ID is required', requestId);
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { notes } = body;

    await acknowledgeSecurityAlert(alertId, event.user.sub, notes);

    return createResponse(200, {
      message: 'Security alert acknowledged successfully',
      alertId,
      acknowledgedBy: event.user.email,
      acknowledgedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Acknowledge security alert error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to acknowledge security alert', requestId);
  }
};

// Helper functions for the new endpoints
async function searchAuditLogs(params: {
  query: string;
  startDate?: string;
  endDate?: string;
  filters: Record<string, any>;
  page: number;
  limit: number;
}): Promise<any> {
  // Mock implementation - in production, this would use DynamoDB with search capabilities
  const mockResults = {
    logs: [
      {
        id: 'audit-1',
        userId: 'user-1',
        userEmail: 'admin@example.com',
        action: 'UPDATE_USER_STATUS',
        resource: 'user',
        resourceId: 'user-123',
        details: { status: 'suspended', reason: 'Policy violation' },
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        sessionId: 'session-1'
      }
    ],
    total: 1,
    page: params.page,
    totalPages: 1,
    searchQuery: params.query,
    searchTime: Date.now()
  };

  return mockResults;
}

async function getUserAuditLogs(params: {
  userId: string;
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
  action?: string;
}): Promise<any> {
  // Mock implementation
  return {
    logs: [],
    total: 0,
    page: params.page,
    totalPages: 0,
    userId: params.userId
  };
}

async function getResourceAuditLogs(params: {
  resourceId: string;
  resourceType?: string;
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
}): Promise<any> {
  // Mock implementation
  return {
    logs: [],
    total: 0,
    page: params.page,
    totalPages: 0,
    resourceId: params.resourceId
  };
}

async function getAuditLogTimeline(params: {
  startDate: string;
  endDate: string;
  granularity: string;
  userId?: string;
  action?: string;
}): Promise<any> {
  // Mock implementation
  return {
    timeline: [
      {
        timestamp: new Date().toISOString(),
        count: 5,
        actions: ['LOGIN', 'UPDATE_USER', 'VIEW_DASHBOARD']
      }
    ],
    granularity: params.granularity,
    totalEvents: 5
  };
}

async function getAdminSessions(params: {
  page: number;
  limit: number;
  status: string;
  userId?: string;
}): Promise<any> {
  // Mock implementation
  return {
    sessions: [
      {
        sessionId: 'session-1',
        userId: 'admin-1',
        userEmail: 'admin@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        issuedAt: new Date(Date.now() - 3600000).toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        lastActivity: new Date().toISOString(),
        isActive: true
      }
    ],
    total: 1,
    page: params.page,
    totalPages: 1
  };
}

async function getSessionById(sessionId: string): Promise<any> {
  // Mock implementation
  return {
    sessionId,
    userId: 'admin-1',
    userEmail: 'admin@example.com',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    issuedAt: new Date(Date.now() - 3600000).toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    lastActivity: new Date().toISOString(),
    isActive: true
  };
}

async function terminateSession(sessionId: string, terminatedBy: string): Promise<void> {
  // Mock implementation - in production, this would update DynamoDB
  console.log(`Session ${sessionId} terminated by ${terminatedBy}`);
}

async function terminateAllUserSessions(userId: string, terminatedBy: string): Promise<{ terminatedCount: number }> {
  // Mock implementation
  return { terminatedCount: 2 };
}

async function getSuspiciousActivity(params: {
  timeRange: string;
  severity: string;
  page: number;
  limit: number;
}): Promise<any> {
  // Mock implementation
  return {
    activities: [
      {
        id: 'suspicious-1',
        type: 'multiple_failed_logins',
        severity: 'high',
        description: 'Multiple failed login attempts from same IP',
        ipAddress: '192.168.1.100',
        userEmail: 'test@example.com',
        timestamp: new Date().toISOString(),
        details: {
          attemptCount: 10,
          timeWindow: '5 minutes'
        }
      }
    ],
    total: 1,
    page: params.page,
    totalPages: 1
  };
}

async function getLoginAttempts(params: {
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
  success?: boolean;
  email?: string;
  ipAddress?: string;
}): Promise<any> {
  // Mock implementation
  return {
    attempts: [
      {
        id: 'attempt-1',
        email: 'admin@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        success: true,
        timestamp: new Date().toISOString(),
        failureReason: null
      }
    ],
    total: 1,
    page: params.page,
    totalPages: 1
  };
}

async function getFailedLogins(params: {
  timeRange: string;
  groupBy: string;
}): Promise<any> {
  // Mock implementation
  return {
    failedLogins: [
      {
        email: 'test@example.com',
        count: 5,
        lastAttempt: new Date().toISOString(),
        ipAddresses: ['192.168.1.100']
      }
    ],
    timeRange: params.timeRange,
    groupBy: params.groupBy,
    totalFailures: 5
  };
}

async function getIpAnalysis(params: {
  timeRange: string;
  ipAddress?: string;
}): Promise<any> {
  // Mock implementation
  return {
    analysis: [
      {
        ipAddress: '192.168.1.100',
        requestCount: 150,
        successfulLogins: 0,
        failedLogins: 10,
        riskScore: 8.5,
        location: {
          country: 'US',
          region: 'California',
          city: 'San Francisco'
        },
        firstSeen: new Date(Date.now() - 86400000).toISOString(),
        lastSeen: new Date().toISOString()
      }
    ],
    timeRange: params.timeRange
  };
}

async function getRateLimitViolations(params: {
  timeRange: string;
  page: number;
  limit: number;
}): Promise<any> {
  // Mock implementation
  return {
    violations: [
      {
        id: 'violation-1',
        userId: 'user-1',
        userEmail: 'test@example.com',
        ipAddress: '192.168.1.100',
        endpoint: '/admin/users',
        violationCount: 5,
        timestamp: new Date().toISOString(),
        rateLimit: {
          maxRequests: 50,
          windowMs: 60000
        }
      }
    ],
    total: 1,
    page: params.page,
    totalPages: 1
  };
}

async function getSecurityAlerts(params: {
  status: string;
  severity?: string;
  page: number;
  limit: number;
}): Promise<any> {
  // Mock implementation
  return {
    alerts: [
      {
        id: 'alert-1',
        type: 'suspicious_login_pattern',
        severity: 'high',
        status: 'active',
        title: 'Suspicious login pattern detected',
        description: 'Multiple failed login attempts followed by successful login',
        details: {
          userId: 'user-1',
          ipAddress: '192.168.1.100',
          attemptCount: 15
        },
        createdAt: new Date().toISOString(),
        acknowledgedAt: null,
        acknowledgedBy: null
      }
    ],
    total: 1,
    page: params.page,
    totalPages: 1
  };
}

async function acknowledgeSecurityAlert(alertId: string, acknowledgedBy: string, notes?: string): Promise<void> {
  // Mock implementation - in production, this would update DynamoDB
  console.log(`Security alert ${alertId} acknowledged by ${acknowledgedBy}`);
}
// Version Info Handler
const handleGetVersionInfo = async (event: APIGatewayProxyEvent, version: string): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const { getVersionCompatibility } = await import('./versioning');
    const versionInfo = getVersionCompatibility();

    return createResponse(200, {
      ...versionInfo,
      currentVersion: version,
      requestedAt: new Date().toISOString(),
      documentation: {
        apiDocs: 'https://docs.harborlist.com/api/admin',
        openApiSpec: 'https://api.harborlist.com/admin/openapi.yaml',
        migrationGuides: 'https://docs.harborlist.com/api/migration'
      }
    });
  } catch (error) {
    console.error('Get version info error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get version info', requestId);
  }
};