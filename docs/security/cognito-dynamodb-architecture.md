# Cognito and DynamoDB Architecture

**Last Updated:** October 14, 2025  
**Version:** 2.0.0  
**Status:** Production

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [System Responsibilities](#system-responsibilities)
4. [Data Flow](#data-flow)
5. [User Lifecycle](#user-lifecycle)
6. [Security Model](#security-model)
7. [Implementation Details](#implementation-details)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

HarborList uses a dual-system architecture for user management, combining AWS Cognito for authentication/identity management with DynamoDB for application data storage. This separation of concerns provides robust security while maintaining flexibility for business logic.

### Key Principle

**Cognito = "Who you are"** (Identity & Authentication)  
**DynamoDB = "What you do"** (Application Data & Business Logic)  
**Bridge = User ID** (`sub` from Cognito = `id` in DynamoDB)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React/TypeScript)                   │
│  • Login forms                                                   │
│  • User profile display                                          │
│  • JWT token storage (localStorage/memory)                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    API Request with JWT Token
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Backend API (Express/Lambda Functions)              │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              auth-service/index.ts                          │ │
│  │  • staffLogin() - Authenticates staff users                 │ │
│  │  • customerLogin() - Authenticates customers                │ │
│  │  • registerCustomer() - Creates new customer accounts       │ │
│  │  • verifyToken() - Validates JWT tokens                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              shared/auth.ts                                 │ │
│  │  • verifyToken() - JWT validation & permission mapping      │ │
│  │  • getUserFromEvent() - Extract user from API Gateway event │ │
│  │  • requireAdminRole() - Authorization checks                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              admin-service/index.ts                         │ │
│  │  • User management endpoints                                │ │
│  │  • System monitoring                                        │ │
│  │  • Dashboard metrics                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         ↓                                            ↓
         ↓                                            ↓
┌──────────────────────┐                 ┌──────────────────────────┐
│   AWS Cognito        │                 │      DynamoDB            │
│   (LocalStack)       │                 │   (Local/AWS)            │
├──────────────────────┤                 ├──────────────────────────┤
│ AUTHENTICATION       │                 │ APPLICATION DATA         │
├──────────────────────┤                 ├──────────────────────────┤
│ • User credentials   │                 │ • User profiles          │
│ • Encrypted passwords│                 │ • User metadata          │
│ • JWT token issuance │                 │ • User preferences       │
│ • Token refresh      │                 │ • User activity history  │
│ • User groups/roles  │                 │ • Listings created       │
│   - super-admin      │                 │ • Reviews written        │
│   - admin            │                 │ • Saved searches         │
│   - moderator        │                 │ • User groups            │
│   - support          │                 │ • Sessions               │
│ • MFA secrets        │                 │ • Login attempts         │
│ • Email verification │                 │ • Audit logs             │
│ • Password reset     │                 │ • User relationships     │
│ • OAuth/SAML tokens  │                 │ • Business logic data    │
└──────────────────────┘                 └──────────────────────────┘
   Two User Pools:                         Multiple Tables:
   1. Customer Pool                        • harborlist-users
   2. Staff Pool                           • harborlist-sessions
                                          • harborlist-listings
                                          • harborlist-reviews
                                          • harborlist-audit-logs
                                          • harborlist-login-attempts
                                          • harborlist-user-groups
```

---

## System Responsibilities

### AWS Cognito Responsibilities

#### 1. **Authentication**
- Validates email/password combinations
- Manages password complexity requirements
- Handles account lockouts after failed attempts
- Provides secure password reset flows

#### 2. **Token Management**
- Issues JWT tokens (Access, ID, Refresh)
- Token expiration management
- Token revocation on logout
- Refresh token rotation

#### 3. **Identity Verification**
- Email verification
- Phone number verification (SMS)
- Multi-factor authentication (MFA)
- TOTP and SMS-based MFA

#### 4. **User Groups & Roles**
- Assigns users to groups (`cognito:groups` claim)
- Group-based access control
- Role hierarchy management

#### 5. **OAuth & Federation**
- Social login (Google, Facebook, etc.)
- SAML integration for enterprise SSO
- Custom authentication flows

### DynamoDB Responsibilities

#### 1. **User Profiles**
```typescript
{
  id: string;              // UUID (matches Cognito sub)
  email: string;           // User email
  name: string;            // Display name
  phone?: string;          // Contact number
  location?: string;       // User location
  role: UserRole;          // Application role
  status: UserStatus;      // Account status
  emailVerified: boolean;  // Verification status
  phoneVerified: boolean;  // Phone verification
  mfaEnabled: boolean;     // MFA status
  createdAt: string;       // Account creation
  updatedAt: string;       // Last update
}
```

#### 2. **Application Metadata**
- User preferences and settings
- UI customization preferences
- Notification preferences
- Language and timezone settings

#### 3. **Activity Tracking**
- Login history
- Failed login attempts
- User actions audit trail
- Feature usage analytics

#### 4. **Business Relationships**
- Listings owned by user
- Reviews written by user
- Saved searches and favorites
- User group memberships
- Seller/buyer relationships

#### 5. **Session Management**
- Active sessions tracking
- Device fingerprinting
- Session expiration
- Concurrent session limits

---

## Data Flow

### 1. User Registration Flow

```
┌─────────────┐
│   Frontend  │
│   Register  │
└──────┬──────┘
       │
       │ POST /api/auth/customer/register
       │ { email, password, name }
       ↓
┌─────────────────────────────────────┐
│   Backend: auth-service             │
│                                     │
│   1. Validate input                 │
│   2. Check email availability       │
│      (query Cognito)                │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│   AWS Cognito                       │
│   cognito.signUp()                  │
│   • Create user account             │
│   • Store encrypted password        │
│   • Generate verification token     │
│   • Assign to default group         │
│   • Return user sub (UUID)          │
└──────┬──────────────────────────────┘
       │
       │ sub: "2380421d-ea13-4fe9-baa7-112a52dc8db2"
       ↓
┌─────────────────────────────────────┐
│   Backend: Create DynamoDB Record   │
│                                     │
│   dynamodb.putItem({                │
│     TableName: "harborlist-users",  │
│     Item: {                         │
│       id: cognitoSub,               │ ← Same as Cognito sub
│       email: email,                 │
│       name: name,                   │
│       role: "user",                 │
│       status: "pending_verification"│
│       emailVerified: false,         │
│       createdAt: timestamp          │
│     }                               │
│   })                                │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│   Send Verification Email           │
│   (via SES/SMTP)                    │
└──────┬──────────────────────────────┘
       │
       ↓ Success Response
┌─────────────┐
│   Frontend  │
│   Show      │
│   "Check    │
│   Email"    │
└─────────────┘
```

### 2. User Login Flow

```
┌─────────────┐
│   Frontend  │
│   Login     │
└──────┬──────┘
       │
       │ POST /api/auth/staff/login
       │ { email, password }
       ↓
┌─────────────────────────────────────────────────────┐
│   Backend: auth-service.staffLogin()                │
│                                                     │
│   Step 1: Authenticate with Cognito                │
└──────┬──────────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────────┐
│   AWS Cognito                                       │
│   cognito.initiateAuth()                            │
│   • Validate email/password                         │
│   • Check account status                            │
│   • Verify email if required                        │
│   • Check MFA if enabled                            │
│   • Generate JWT tokens                             │
│                                                     │
│   Returns:                                          │
│   {                                                 │
│     AccessToken: "eyJhbGci...",                     │
│     IdToken: "eyJhbGci...",                         │
│     RefreshToken: "4e166630",                       │
│     TokenType: "Bearer",                            │
│     ExpiresIn: 108000                               │
│   }                                                 │
│                                                     │
│   JWT Payload includes:                             │
│   {                                                 │
│     sub: "2380421d-ea13-4fe9-baa7-112a52dc8db2",   │ ← User ID
│     email: "admin@harborlist.local",                │
│     cognito:groups: ["super-admin"],                │ ← Role info
│     exp: 1760565770,                                │
│     iat: 1760457770                                 │
│   }                                                 │
└──────┬──────────────────────────────────────────────┘
       │
       │ tokens + sub
       ↓
┌─────────────────────────────────────────────────────┐
│   Backend: Enrich with DynamoDB data                │
│                                                     │
│   Step 2: Query DynamoDB using Cognito sub          │
│                                                     │
│   const user = await dynamodb.getItem({             │
│     TableName: "harborlist-users",                  │
│     Key: { id: cognitoSub }                         │ ← Same ID
│   });                                               │
│                                                     │
│   Step 3: Map permissions from role                 │
│   const permissions = getPermissionsForRole(        │
│     user.role  // "super_admin"                     │
│   );                                                │
│   // Returns: [USER_MANAGEMENT, CONTENT_MODERATION, │
│   //           ANALYTICS_VIEW, ...]                 │
└──────┬──────────────────────────────────────────────┘
       │
       │ Combined response
       ↓
┌─────────────────────────────────────────────────────┐
│   Return to Frontend                                │
│   {                                                 │
│     success: true,                                  │
│     tokens: {                                       │
│       accessToken: "eyJhbGci...",                   │ ← From Cognito
│       refreshToken: "4e166630",                     │ ← From Cognito
│       idToken: "eyJhbGci...",                       │ ← From Cognito
│       expiresIn: 108000                             │
│     },                                              │
│     staff: {                                        │
│       id: "2380421d-ea13-4fe9-baa7-112a52dc8db2",  │ ← From DynamoDB
│       email: "admin@harborlist.local",              │ ← From DynamoDB
│       name: "HarborList Administrator",             │ ← From DynamoDB
│       role: "super_admin",                          │ ← From DynamoDB
│       permissions: [                                │ ← Computed
│         "user_management",                          │
│         "content_moderation",                       │
│         "analytics_view",                           │
│         ...                                         │
│       ]                                             │
│     }                                               │
│   }                                                 │
└──────┬──────────────────────────────────────────────┘
       │
       ↓
┌─────────────┐
│   Frontend  │
│   Store     │
│   tokens +  │
│   user data │
└─────────────┘
```

### 3. API Request with JWT Token

```
┌─────────────┐
│   Frontend  │
│   API Call  │
└──────┬──────┘
       │
       │ GET /api/admin/users
       │ Authorization: Bearer eyJhbGci...
       ↓
┌─────────────────────────────────────────────────────┐
│   Backend: Middleware (withAuth)                    │
│                                                     │
│   Step 1: Extract token from header                │
│   const token = event.headers.Authorization        │
│                .split(' ')[1];                      │
└──────┬──────────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────────┐
│   shared/auth.ts: verifyToken()                     │
│                                                     │
│   Step 2: Validate JWT signature                   │
│   • Check expiration                                │
│   • Verify signature (JWKS from Cognito)            │
│   • Decode payload                                  │
│                                                     │
│   Decoded payload:                                  │
│   {                                                 │
│     sub: "2380421d-ea13-4fe9-baa7-112a52dc8db2",   │
│     email: "admin@harborlist.local",                │
│     cognito:groups: ["super-admin"]                 │
│   }                                                 │
│                                                     │
│   Step 3: Map role from cognito:groups             │
│   const role = mapCognitoGroupsToRole(              │
│     ["super-admin"]                                 │
│   );                                                │
│   // Returns: UserRole.SUPER_ADMIN                  │
│                                                     │
│   Step 4: Get permissions for role                 │
│   const permissions = getPermissionsForRole(role);  │
│   // Returns all AdminPermission values             │
│                                                     │
│   Returns enriched payload:                         │
│   {                                                 │
│     sub: "2380421d-ea13-4fe9-baa7-112a52dc8db2",   │
│     email: "admin@harborlist.local",                │
│     role: "super_admin",                            │
│     permissions: [                                  │
│       "user_management",                            │
│       "content_moderation",                         │
│       "analytics_view",                             │
│       ...                                           │
│     ]                                               │
│   }                                                 │
└──────┬──────────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────────┐
│   Backend: requireAdminRole()                       │
│   • Check if role is in admin roles                 │
│   • Check if user has required permissions          │
│   • Throw error if unauthorized                     │
└──────┬──────────────────────────────────────────────┘
       │
       ↓ Authorized
┌─────────────────────────────────────────────────────┐
│   Backend: Execute business logic                   │
│   • Query DynamoDB for users list                   │
│   • Apply filters and pagination                    │
│   • Return results                                  │
└──────┬──────────────────────────────────────────────┘
       │
       ↓
┌─────────────┐
│   Frontend  │
│   Display   │
│   results   │
└─────────────┘
```

---

## User Lifecycle

### Phase 1: Registration
```
Cognito: Create user account with credentials
DynamoDB: Create user profile with status="pending_verification"
```

### Phase 2: Email Verification
```
Cognito: Verify email token, mark as verified
DynamoDB: Update status to "active"
```

### Phase 3: Active Usage
```
Cognito: Handle authentication, issue tokens
DynamoDB: Store user activity, preferences, created content
```

### Phase 4: Password Reset
```
Cognito: Generate reset token, validate token, update password
DynamoDB: Log password change event in audit logs
```

### Phase 5: Account Suspension
```
Cognito: Disable user account (prevents login)
DynamoDB: Update status to "suspended", record reason
```

### Phase 6: Account Deletion
```
Cognito: Delete user account
DynamoDB: Either delete or soft-delete (mark as deleted)
         Retain audit logs per compliance requirements
```

---

## Security Model

### Token-Based Authentication

#### JWT Structure
```json
{
  "header": {
    "alg": "RS256",
    "kid": "0fa9f9b3-c02d-4e78-b00e-ada933e951ce",
    "typ": "JWT"
  },
  "payload": {
    "sub": "2380421d-ea13-4fe9-baa7-112a52dc8db2",  // User ID
    "email": "admin@harborlist.local",
    "cognito:username": "2380421d-ea13-4fe9-baa7-112a52dc8db2",
    "cognito:groups": ["super-admin"],               // Role groups
    "iss": "http://localhost:4566/us-east-1_fda2cf0e211442aaba3f84ecb123172b",
    "exp": 1760565770,                                // Expiration
    "iat": 1760457770,                                // Issued at
    "token_use": "access"
  },
  "signature": "..."  // RS256 signature
}
```

#### Token Validation Process
1. **Extract**: Get token from `Authorization: Bearer` header
2. **Decode**: Parse JWT into header, payload, signature
3. **Verify Signature**: Use JWKS public key from Cognito
4. **Check Expiration**: Ensure token hasn't expired
5. **Validate Issuer**: Confirm token issued by correct Cognito pool
6. **Extract Claims**: Get user ID, email, groups
7. **Map Permissions**: Convert groups to application permissions
8. **Authorize**: Check permissions for requested operation

### Role-Based Access Control (RBAC)

#### Role Hierarchy
```
super_admin     (All permissions)
    ↓
admin           (Most permissions, no system config)
    ↓
moderator       (Content moderation + user management)
    ↓
support         (Content moderation only)
    ↓
user            (No admin permissions)
```

#### Permission Mapping
```typescript
// backend/src/auth-service/interfaces.ts
export const STAFF_PERMISSIONS = {
  [StaffRole.SUPER_ADMIN]: Object.values(AdminPermission),
  [StaffRole.ADMIN]: [
    AdminPermission.USER_MANAGEMENT,
    AdminPermission.CONTENT_MODERATION,
    AdminPermission.SYSTEM_CONFIG,
    AdminPermission.ANALYTICS_VIEW,
    AdminPermission.AUDIT_LOG_VIEW,
    AdminPermission.TIER_MANAGEMENT,
    AdminPermission.BILLING_MANAGEMENT
  ],
  [StaffRole.MANAGER]: [
    AdminPermission.USER_MANAGEMENT,
    AdminPermission.CONTENT_MODERATION,
    AdminPermission.ANALYTICS_VIEW,
    AdminPermission.AUDIT_LOG_VIEW,
    AdminPermission.SALES_MANAGEMENT
  ],
  [StaffRole.TEAM_MEMBER]: [
    AdminPermission.CONTENT_MODERATION,
    AdminPermission.ANALYTICS_VIEW
  ]
};
```

### Data Security

#### Cognito Security
- ✅ Passwords encrypted at rest (AWS-managed encryption)
- ✅ Passwords hashed with bcrypt (automatic)
- ✅ TLS/SSL for data in transit
- ✅ Password complexity requirements enforced
- ✅ Account lockout after failed attempts
- ✅ MFA support (TOTP, SMS)
- ✅ Token rotation on refresh

#### DynamoDB Security
- ✅ Encryption at rest (AWS KMS)
- ✅ Encryption in transit (TLS)
- ✅ IAM-based access control
- ✅ Fine-grained access control with IAM policies
- ✅ Audit logging via CloudTrail
- ✅ Backup and point-in-time recovery

### Environment-Aware Security

#### LocalStack (Development)
```typescript
const isLocalStack = !!process.env.COGNITO_ENDPOINT || 
                     !!process.env.LOCALSTACK_ENDPOINT;

if (isLocalStack) {
  // Relaxed validation for local development
  // Skip audience/issuer validation
  // Use simplified token verification
}
```

#### AWS (Production)
```typescript
else {
  // Strict validation for production
  // Verify token signature with JWKS
  // Validate audience and issuer
  // Enforce all security policies
}
```

---

## Implementation Details

### Key Files

#### 1. **backend/src/auth-service/index.ts**
- `staffLogin()` - Staff authentication
- `customerLogin()` - Customer authentication
- `registerCustomer()` - New user registration
- `getStaffUserDetails()` - Fetch staff profile from Cognito
- `getStaffPermissions()` - Map role to permissions

#### 2. **backend/src/shared/auth.ts**
- `verifyToken()` - JWT validation with environment detection
- `mapCognitoGroupsToRole()` - Convert Cognito groups to UserRole
- `getPermissionsForRole()` - Map UserRole to AdminPermission[]
- `getUserFromEvent()` - Extract user from API Gateway event
- `requireAdminRole()` - Authorization middleware

#### 3. **backend/src/admin-service/index.ts**
- `handleListUsers()` - List all users (with filtering)
- `handleListCustomers()` - List customer users only
- `handleListStaff()` - List staff users only
- Admin endpoints with permission checks

### Environment Variables

#### Cognito Configuration
```bash
# Customer User Pool
CUSTOMER_USER_POOL_ID=us-east-1_211be235f8b0447fa8500c82e32b1351
CUSTOMER_USER_POOL_CLIENT_ID=6cdjfvqo4t8p0ld94fvt8fiu14
CUSTOMER_USER_POOL_REGION=us-east-1

# Staff User Pool
STAFF_USER_POOL_ID=us-east-1_fda2cf0e211442aaba3f84ecb123172b
STAFF_USER_POOL_CLIENT_ID=ychk9h9c86u206sbqxd24uoo3z
STAFF_USER_POOL_REGION=us-east-1

# LocalStack endpoint (local development only)
COGNITO_ENDPOINT=http://localstack:4566
IS_LOCALSTACK=true
```

#### DynamoDB Configuration
```bash
# Table names
USERS_TABLE=harborlist-users
SESSIONS_TABLE=harborlist-sessions
AUDIT_LOGS_TABLE=harborlist-audit-logs
LOGIN_ATTEMPTS_TABLE=harborlist-login-attempts
USER_GROUPS_TABLE=harborlist-user-groups

# LocalStack endpoint (local development only)
DYNAMODB_ENDPOINT=http://dynamodb-local:8000

# AWS region
AWS_REGION=us-east-1
```

### Data Synchronization

#### When User Data Changes in Cognito
```typescript
// Example: Email verified in Cognito
await cognito.adminUpdateUserAttributes({
  UserPoolId: STAFF_USER_POOL_ID,
  Username: userId,
  UserAttributes: [
    { Name: 'email_verified', Value: 'true' }
  ]
});

// Sync to DynamoDB
await dynamodb.updateItem({
  TableName: USERS_TABLE,
  Key: { id: userId },
  UpdateExpression: 'SET emailVerified = :verified, updatedAt = :now',
  ExpressionAttributeValues: {
    ':verified': true,
    ':now': new Date().toISOString()
  }
});
```

#### When User Data Changes in DynamoDB
```typescript
// Example: User updates profile name
await dynamodb.updateItem({
  TableName: USERS_TABLE,
  Key: { id: userId },
  UpdateExpression: 'SET #name = :name, updatedAt = :now',
  ExpressionAttributeNames: {
    '#name': 'name'
  },
  ExpressionAttributeValues: {
    ':name': 'New Name',
    ':now': new Date().toISOString()
  }
});

// Optionally sync to Cognito (for display in admin console)
await cognito.adminUpdateUserAttributes({
  UserPoolId: STAFF_USER_POOL_ID,
  Username: userId,
  UserAttributes: [
    { Name: 'name', Value: 'New Name' }
  ]
});
```

---

## Best Practices

### 1. **Always Use User ID as Bridge**
```typescript
// ✅ Good: Use Cognito sub as DynamoDB id
const cognitoUser = await cognito.adminGetUser({...});
const userId = cognitoUser.Username; // This is the sub

await dynamodb.putItem({
  TableName: USERS_TABLE,
  Item: {
    id: userId,  // ← Same as Cognito sub
    ...otherFields
  }
});
```

### 2. **Never Store Passwords in DynamoDB**
```typescript
// ❌ Bad: Storing password
await dynamodb.putItem({
  TableName: USERS_TABLE,
  Item: {
    id: userId,
    password: hashedPassword  // ❌ Never do this!
  }
});

// ✅ Good: Let Cognito handle passwords
await cognito.signUp({
  Username: email,
  Password: password  // Cognito encrypts this
});
```

### 3. **Enrich JWT Tokens with DynamoDB Data**
```typescript
// ✅ Good: Combine Cognito auth with DynamoDB profile
async function login(email: string, password: string) {
  // Step 1: Authenticate with Cognito
  const authResult = await cognito.initiateAuth({...});
  
  // Step 2: Get profile from DynamoDB
  const userProfile = await getUserProfile(authResult.Username);
  
  // Step 3: Return both
  return {
    tokens: authResult,      // From Cognito
    user: userProfile        // From DynamoDB
  };
}
```

### 4. **Validate Tokens on Every Request**
```typescript
// ✅ Good: Validate token before processing
export const withAuth = (handler) => async (event) => {
  // Extract and verify token
  const token = extractTokenFromEvent(event);
  const user = await verifyToken(token);
  
  // Add user to event
  event.user = user;
  
  // Execute handler
  return await handler(event);
};
```

### 5. **Map Permissions from Roles**
```typescript
// ✅ Good: Derive permissions from role during token verification
function verifyToken(token: string): JWTPayload {
  const payload = jwt.decode(token);
  const role = mapCognitoGroupsToRole(payload['cognito:groups']);
  
  // Map role to permissions
  const permissions = getPermissionsForRole(role);
  
  return {
    ...payload,
    role,
    permissions  // ← Add permissions to payload
  };
}
```

### 6. **Handle Token Expiration Gracefully**
```typescript
// ✅ Good: Refresh expired tokens automatically
async function makeAuthenticatedRequest(url, token) {
  try {
    return await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (error) {
    if (error.status === 401) {
      // Token expired, refresh it
      const newToken = await refreshToken(refreshToken);
      return await makeAuthenticatedRequest(url, newToken);
    }
    throw error;
  }
}
```

### 7. **Log Security Events**
```typescript
// ✅ Good: Audit all authentication events
await logAdminAction(user, 'LOGIN_SUCCESS', 'auth', {
  userId: user.sub,
  email: user.email,
  timestamp: new Date().toISOString(),
  ipAddress: clientIp,
  userAgent: userAgent
});
```

---

## Troubleshooting

### Problem 1: "Invalid token format" Error

**Symptom:**
```
Error: Invalid token format
```

**Cause:** Token not properly extracted from Authorization header or malformed JWT

**Solution:**
```typescript
// Check Authorization header format
const authHeader = event.headers.Authorization || event.headers.authorization;
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  throw new Error('Invalid Authorization header');
}
const token = authHeader.split(' ')[1];
```

### Problem 2: "JWT audience invalid" Error

**Symptom:**
```
JsonWebTokenError: jwt audience invalid. expected: ychk9h9c86u206sbqxd24uoo3z
```

**Cause:** LocalStack tokens have different audience format than AWS Cognito

**Solution:** Use environment-aware validation
```typescript
const isLocalStack = !!process.env.COGNITO_ENDPOINT;
if (!isLocalStack) {
  verifyOptions.audience = clientId;  // Only validate in AWS
}
```

### Problem 3: "Admin access required" Error

**Symptom:**
```
Error 403: Admin access required
```

**Cause:** JWT token missing permissions or role not mapped correctly

**Solution:** Check permission mapping
```typescript
// Debug: Log what's in the token
console.log('Token payload:', {
  role: payload.role,
  permissions: payload.permissions,
  groups: payload['cognito:groups']
});

// Ensure permissions are mapped during token verification
const permissions = getPermissionsForRole(role);
```

### Problem 4: User Not Found in DynamoDB

**Symptom:**
```
Error: User not found in database
```

**Cause:** User exists in Cognito but not in DynamoDB (data sync issue)

**Solution:** Create DynamoDB record during registration
```typescript
async function registerUser(email, password, name) {
  // Step 1: Create in Cognito
  const cognitoResult = await cognito.signUp({...});
  
  // Step 2: Create in DynamoDB (important!)
  await dynamodb.putItem({
    TableName: USERS_TABLE,
    Item: {
      id: cognitoResult.UserSub,  // Use Cognito sub
      email,
      name,
      role: 'user',
      status: 'pending_verification',
      createdAt: new Date().toISOString()
    }
  });
}
```

### Problem 5: Permissions Not Working

**Symptom:** User has correct role but permissions check fails

**Cause:** Permissions not added to JWT payload during token verification

**Solution:** Update verifyToken to include permissions
```typescript
// backend/src/shared/auth.ts
export async function verifyToken(token: string): Promise<JWTPayload> {
  const payload = jwt.decode(token);
  const role = mapCognitoGroupsToRole(payload['cognito:groups']);
  
  // ✅ Add this: Map role to permissions
  const permissions = getPermissionsForRole(role);
  
  return {
    ...payload,
    role,
    permissions  // ← Must include this
  };
}
```

---

## Additional Resources

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [JWT.io - JWT Debugger](https://jwt.io/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2025-10-14 | Initial comprehensive documentation |
| | | - Documented dual-system architecture |
| | | - Added detailed data flow diagrams |
| | | - Included security model and best practices |
| | | - Added troubleshooting guide |

---

**Document Owner:** HarborList Security Team  
**Review Cycle:** Quarterly  
**Next Review:** January 2026
