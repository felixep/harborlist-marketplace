# Current Authentication System Analysis

## Overview

This document analyzes the existing authentication and authorization system in the HarborList boat marketplace to inform the AWS Cognito dual-pool refactoring strategy.

## Current Authentication Architecture

### Authentication Service (`backend/src/auth-service/index.ts`)

The current authentication system is implemented as a Lambda function with the following key features:

#### Core Authentication Methods
- **User Registration**: Email-based registration with password validation and email verification
- **User Login**: Email/password authentication with account lockout protection
- **Admin Login**: Enhanced admin authentication with optional MFA support
- **Token Refresh**: JWT token refresh mechanism using refresh tokens
- **Password Reset**: Secure password reset flow with time-limited tokens
- **Email Verification**: Email verification system for new user accounts

#### Security Features
- **Password Hashing**: bcrypt with salt rounds for secure password storage
- **JWT Tokens**: Access tokens (configurable expiry) and refresh tokens (7 days)
- **Account Lockout**: Protection against brute force attacks (5 attempts, 30-minute lockout)
- **MFA Support**: Optional TOTP-based multi-factor authentication
- **Session Management**: Device-based session tracking with IP and user agent logging
- **Audit Logging**: Comprehensive audit trail for all authentication events

#### Current Token Structure
```typescript
interface JWTPayload {
  sub: string;        // User ID
  email: string;
  name: string;
  role: UserRole;
  permissions?: AdminPermission[];
  sessionId: string;
  deviceId: string;
  iat: number;
  exp: number;
}
```

### User Management and Roles

#### User Roles (`backend/src/types/common.ts`)
```typescript
enum UserRole {
  USER = 'user',
  ADMIN = 'admin', 
  SUPER_ADMIN = 'super_admin',
  MODERATOR = 'moderator',
  SUPPORT = 'support'
}
```

#### Admin Permissions
```typescript
enum AdminPermission {
  USER_MANAGEMENT = 'user_management',
  CONTENT_MODERATION = 'content_moderation',
  FINANCIAL_ACCESS = 'financial_access',
  SYSTEM_CONFIG = 'system_config',
  ANALYTICS_VIEW = 'analytics_view',
  AUDIT_LOG_VIEW = 'audit_log_view',
  TIER_MANAGEMENT = 'tier_management',
  CAPABILITY_ASSIGNMENT = 'capability_assignment',
  BILLING_MANAGEMENT = 'billing_management',
  SALES_MANAGEMENT = 'sales_management'
}
```

#### User Status Management
```typescript
enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  PENDING_VERIFICATION = 'pending_verification'
}
```

### Authorization System

#### Middleware-Based Authorization (`backend/src/shared/middleware.ts`)
- **withAuth**: Basic authentication middleware for JWT token validation
- **withAdminAuth**: Admin-specific middleware with permission checking
- **Role-Based Access Control**: Granular permission system for admin functions
- **Rate Limiting**: Adaptive rate limiting based on user roles and permissions

#### Current Authorization Flow
1. Extract JWT token from Authorization header
2. Verify token signature and expiration
3. Extract user information and permissions
4. Check role requirements for endpoint access
5. Validate specific permissions if required
6. Log access attempts for audit trail

### Admin Interface Integration

#### Admin Service (`backend/src/admin-service/index.ts`)
- Uses existing middleware system for authentication
- Requires admin role and specific permissions for endpoints
- Integrates with audit logging system
- Supports dashboard metrics, user management, and system monitoring

#### Current Admin Authentication Flow
1. Admin login through `/admin/login` endpoint
2. Enhanced security with optional MFA
3. Shorter session timeout for admin users
4. Permission-based access to admin functions
5. Comprehensive audit logging of admin actions

### Session Management

#### Session Storage
- DynamoDB-based session storage (`harborlist-sessions` table)
- Device-based session tracking with unique device IDs
- IP address and user agent tracking for security
- Automatic session expiration and cleanup

#### Session Security Features
- Session invalidation on password reset
- Concurrent session limits
- Session activity tracking
- Automatic logout on role changes

### Database Schema

#### Users Table (`harborlist-users`)
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  permissions?: AdminPermission[];
  emailVerified: boolean;
  mfaEnabled: boolean;
  password?: string;
  loginAttempts: number;
  lockedUntil?: string;
  // ... additional fields
}
```

#### Supporting Tables
- **Sessions Table**: Active user sessions with device tracking
- **Login Attempts Table**: Failed login attempt tracking
- **Audit Logs Table**: Comprehensive audit trail

### Environment Configuration

#### JWT Secret Management
- **Local Development**: Environment variables with fallback defaults
- **AWS Deployment**: AWS Secrets Manager integration with fallback
- **Dynamic Secret Retrieval**: ConfigService for deployment-aware secret management

#### Environment Detection
```typescript
interface DeploymentContext {
  isDocker: boolean;
  isAWS: boolean;
  environment: string;
  deploymentTarget: 'docker' | 'aws';
}
```

## Current Limitations and Challenges

### Authentication Limitations
1. **Single Authentication Domain**: No separation between customer and staff authentication
2. **Limited Customer Tiers**: Basic role system doesn't support customer tier management (Individual/Dealer/Premium)
3. **Manual Permission Management**: No automated group-based permission assignment
4. **Session Management Complexity**: Custom session management instead of leveraging AWS Cognito features

### Security Concerns
1. **Password Management**: Custom password policies instead of AWS Cognito's built-in security
2. **MFA Implementation**: Custom TOTP implementation instead of AWS Cognito MFA
3. **Token Management**: Manual JWT token lifecycle management
4. **Cross-Pool Security**: No built-in prevention of cross-domain token usage

### Operational Challenges
1. **Scalability**: Custom authentication service may not scale as efficiently as AWS Cognito
2. **Maintenance**: Significant custom code for authentication features
3. **Compliance**: Manual audit logging instead of AWS CloudTrail integration
4. **Backup and Recovery**: Custom user data backup instead of AWS Cognito's built-in features

## Integration Points for Cognito Migration

### Preserve Existing Features
1. **Admin Interface**: Maintain existing admin UI without duplication
2. **Permission System**: Integrate existing AdminPermission enum with Cognito Groups
3. **Audit Logging**: Enhance existing audit system with Cognito events
4. **Session Management**: Migrate to Cognito session management while preserving device tracking

### Migration Strategy Considerations
1. **Backward Compatibility**: Ensure smooth transition without breaking existing functionality
2. **Data Migration**: Plan for migrating existing users to Cognito User Pools
3. **API Compatibility**: Maintain existing API endpoints during transition
4. **Testing Strategy**: Comprehensive testing of dual-pool authentication flows

### Key Integration Points
1. **Middleware System**: Update existing middleware to work with Cognito tokens
2. **Admin Service**: Integrate admin service with Staff User Pool
3. **User Service**: Update user management to work with Customer User Pool
4. **Database Schema**: Plan for schema changes to support Cognito integration

## Recommendations for Cognito Integration

### High Priority
1. **Dual User Pool Architecture**: Separate Customer and Staff authentication domains
2. **Group-Based Permissions**: Migrate existing permission system to Cognito Groups
3. **Enhanced Security**: Leverage AWS Cognito's built-in security features
4. **Simplified Token Management**: Use Cognito's token lifecycle management

### Medium Priority
1. **MFA Enhancement**: Upgrade to AWS Cognito's MFA capabilities
2. **Password Policies**: Migrate to Cognito's password policy management
3. **Audit Integration**: Enhance audit logging with CloudTrail integration
4. **Session Optimization**: Optimize session management with Cognito features

### Low Priority
1. **Advanced Features**: Implement advanced Cognito features like risk-based authentication
2. **Federation**: Consider future integration with social identity providers
3. **Custom Attributes**: Leverage Cognito custom attributes for user metadata
4. **Lambda Triggers**: Implement Cognito Lambda triggers for custom business logic

## Next Steps

1. **Infrastructure Analysis**: Review current CDK infrastructure and Docker Compose setup
2. **Refactoring Strategy**: Develop detailed migration plan with phases and milestones
3. **Testing Plan**: Create comprehensive testing strategy for dual-pool authentication
4. **Implementation Roadmap**: Define tasks and dependencies for Cognito integration