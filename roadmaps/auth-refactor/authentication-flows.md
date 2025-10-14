# Authentication Flow Documentation

## Overview

This document describes the authentication flows for the dual Cognito User Pool architecture, covering both customer and staff authentication patterns, API endpoint structures, and authorizer behavior.

## Customer Authentication Flow

### Registration Flow

```mermaid
sequenceDiagram
    participant C as Customer App
    participant CP as Customer Pool
    participant CG as Customer Groups
    participant API as API Gateway
    participant AS as Auth Service

    C->>AS: POST /auth/customer/register
    AS->>CP: CreateUser (email, password, tier)
    CP->>CP: Send verification email
    CP-->>AS: User created (unconfirmed)
    AS-->>C: Registration success, check email
    
    Note over C: Customer clicks email link
    C->>AS: POST /auth/customer/confirm
    AS->>CP: ConfirmSignUp
    CP->>CG: Add to tier group (individual/dealer/premium)
    CP-->>AS: User confirmed
    AS-->>C: Account confirmed, ready to login
```

### Login Flow

```mermaid
sequenceDiagram
    participant C as Customer App
    participant AS as Auth Service
    participant CP as Customer Pool
    participant JWT as JWT Token

    C->>AS: POST /auth/customer/login
    AS->>CP: InitiateAuth (email, password)
    CP->>CP: Validate credentials
    CP->>JWT: Generate access/refresh tokens
    JWT->>JWT: Include tier claims (individual/dealer/premium)
    CP-->>AS: AuthResult with tokens
    AS-->>C: Login success with tokens
    
    Note over C: Store tokens securely
```

### API Access Flow

```mermaid
sequenceDiagram
    participant C as Customer App
    participant AG as API Gateway
    participant CA as Customer Authorizer
    participant API as Backend API
    participant JWT as JWT Validator

    C->>AG: GET /api/customer/listings (Bearer token)
    AG->>CA: Validate token
    CA->>JWT: Verify JWT signature
    JWT->>JWT: Extract customer tier claims
    JWT-->>CA: Valid token with permissions
    CA-->>AG: Allow with policy document
    AG->>API: Forward request with user context
    API-->>AG: Response data
    AG-->>C: API response
```

## Staff Authentication Flow

### Login Flow

```mermaid
sequenceDiagram
    participant A as Admin Interface
    participant AS as Auth Service
    participant SP as Staff Pool
    participant MFA as MFA Service
    participant JWT as JWT Token

    A->>AS: POST /auth/staff/login
    AS->>SP: InitiateAuth (email, password)
    SP->>SP: Validate credentials
    SP->>MFA: Require MFA challenge
    MFA-->>AS: MFA challenge required
    AS-->>A: MFA challenge (TOTP/SMS)
    
    A->>AS: POST /auth/staff/mfa-verify
    AS->>SP: RespondToAuthChallenge
    SP->>JWT: Generate tokens (8hr TTL)
    JWT->>JWT: Include staff role claims
    SP-->>AS: AuthResult with tokens
    AS-->>A: Login success with tokens
```

### Admin API Access Flow

```mermaid
sequenceDiagram
    participant A as Admin Interface
    participant AG as API Gateway
    participant SA as Staff Authorizer
    participant API as Admin API
    participant JWT as JWT Validator

    A->>AG: POST /api/admin/users (Bearer token)
    AG->>SA: Validate staff token
    SA->>JWT: Verify JWT signature
    JWT->>JWT: Extract staff role claims
    JWT->>JWT: Validate permissions (user_management)
    JWT-->>SA: Valid token with admin permissions
    SA-->>AG: Allow with policy document
    AG->>API: Forward request with staff context
    API-->>AG: Response data
    AG-->>C: API response
```

## Cross-Pool Security Flow

### Prevention of Cross-Pool Access

```mermaid
sequenceDiagram
    participant C as Customer App
    participant AG as API Gateway
    participant SA as Staff Authorizer
    participant CA as Customer Authorizer

    Note over C: Customer tries to access admin endpoint
    C->>AG: GET /api/admin/users (Customer token)
    AG->>SA: Validate token
    SA->>SA: Detect customer token
    SA-->>AG: Deny with 403 Forbidden
    AG-->>C: Error: Insufficient permissions
    
    Note over C: Staff tries to access customer endpoint
    C->>AG: GET /api/customer/listings (Staff token)
    AG->>CA: Validate token
    CA->>CA: Detect staff token
    CA-->>AG: Deny with 403 Forbidden
    AG-->>C: Error: Invalid token type
```

## Token Refresh Flow

### Customer Token Refresh

```mermaid
sequenceDiagram
    participant C as Customer App
    participant AS as Auth Service
    participant CP as Customer Pool

    C->>AS: POST /auth/customer/refresh
    AS->>CP: InitiateAuth (REFRESH_TOKEN)
    CP->>CP: Validate refresh token
    CP->>CP: Generate new access token
    CP-->>AS: New access token
    AS-->>C: Refreshed tokens
```

### Staff Token Refresh

```mermaid
sequenceDiagram
    participant A as Admin Interface
    participant AS as Auth Service
    participant SP as Staff Pool

    A->>AS: POST /auth/staff/refresh
    AS->>SP: InitiateAuth (REFRESH_TOKEN)
    SP->>SP: Validate refresh token
    SP->>SP: Generate new access token (8hr TTL)
    SP-->>AS: New access token
    AS-->>A: Refreshed tokens
```

## API Endpoint Structure

### Customer Endpoints

| Endpoint | Method | Description | Required Permissions |
|----------|--------|-------------|---------------------|
| `/auth/customer/register` | POST | Customer registration | None |
| `/auth/customer/login` | POST | Customer login | None |
| `/auth/customer/refresh` | POST | Token refresh | Valid refresh token |
| `/auth/customer/logout` | POST | Customer logout | Valid access token |
| `/auth/customer/confirm` | POST | Email confirmation | None |
| `/auth/customer/forgot-password` | POST | Password reset | None |
| `/api/customer/profile` | GET/PUT | Profile management | customer:profile |
| `/api/customer/listings` | GET | View listings | customer:view |
| `/api/customer/listings` | POST | Create listing (dealers) | customer:create |
| `/api/customer/inquiries` | GET/POST | Manage inquiries | customer:inquire |

### Staff Endpoints

| Endpoint | Method | Description | Required Permissions |
|----------|--------|-------------|---------------------|
| `/auth/staff/login` | POST | Staff login | None |
| `/auth/staff/refresh` | POST | Token refresh | Valid refresh token |
| `/auth/staff/logout` | POST | Staff logout | Valid access token |
| `/auth/staff/mfa-verify` | POST | MFA verification | None |
| `/api/admin/users` | GET/POST/PUT | User management | user_management |
| `/api/admin/listings` | GET/PUT/DELETE | Content moderation | content_moderation |
| `/api/admin/analytics` | GET | System analytics | analytics_view |
| `/api/admin/audit` | GET | Audit logs | audit_log_view |
| `/api/admin/billing` | GET/POST | Billing management | billing_management |
| `/api/admin/settings` | GET/PUT | System configuration | system_config |

## Authorizer Behavior

### Customer Authorizer Logic

```typescript
// Pseudo-code for customer authorizer
function customerAuthorizer(event) {
  const token = extractBearerToken(event.authorizationToken);
  
  try {
    const claims = verifyJWT(token, CUSTOMER_POOL_KEYS);
    
    // Validate token is from customer pool
    if (claims.token_use !== 'access' || claims.aud !== CUSTOMER_CLIENT_ID) {
      return denyPolicy();
    }
    
    // Extract customer permissions
    const permissions = extractCustomerPermissions(claims);
    const tier = claims['custom:tier'] || 'individual';
    
    return allowPolicy({
      userId: claims.sub,
      userType: 'customer',
      tier: tier,
      permissions: permissions
    });
    
  } catch (error) {
    return denyPolicy();
  }
}
```

### Staff Authorizer Logic

```typescript
// Pseudo-code for staff authorizer
function staffAuthorizer(event) {
  const token = extractBearerToken(event.authorizationToken);
  
  try {
    const claims = verifyJWT(token, STAFF_POOL_KEYS);
    
    // Validate token is from staff pool
    if (claims.token_use !== 'access' || claims.aud !== STAFF_CLIENT_ID) {
      return denyPolicy();
    }
    
    // Validate token TTL (8 hours max)
    if (isTokenExpiredForStaff(claims)) {
      return denyPolicy();
    }
    
    // Extract staff permissions
    const permissions = extractStaffPermissions(claims);
    const role = claims['cognito:groups'][0] || 'team-member';
    
    return allowPolicy({
      userId: claims.sub,
      userType: 'staff',
      role: role,
      permissions: permissions
    });
    
  } catch (error) {
    return denyPolicy();
  }
}
```

## Environment-Specific Configuration

### Local Development (LocalStack)

```yaml
# docker-compose.yml configuration
services:
  localstack:
    image: localstack/localstack
    environment:
      - SERVICES=cognito-idp
      - COGNITO_PROVIDER_DEVELOPER_USER_POOL=true
    ports:
      - "4566:4566"
      
  auth-service:
    environment:
      - NODE_ENV=local
      - COGNITO_ENDPOINT=http://localstack:4566
      - CUSTOMER_POOL_ID=local_customer_pool
      - STAFF_POOL_ID=local_staff_pool
```

### AWS Development/Staging

```typescript
// Environment configuration
const config = {
  environment: 'dev',
  cognito: {
    customerPool: {
      poolId: process.env.CUSTOMER_POOL_ID,
      clientId: process.env.CUSTOMER_CLIENT_ID,
      region: 'us-east-1'
    },
    staffPool: {
      poolId: process.env.STAFF_POOL_ID,
      clientId: process.env.STAFF_CLIENT_ID,
      region: 'us-east-1'
    }
  }
};
```

### AWS Production

```typescript
// Production configuration with enhanced security
const config = {
  environment: 'prod',
  cognito: {
    customerPool: {
      poolId: process.env.CUSTOMER_POOL_ID,
      clientId: process.env.CUSTOMER_CLIENT_ID,
      region: 'us-east-1'
    },
    staffPool: {
      poolId: process.env.STAFF_POOL_ID,
      clientId: process.env.STAFF_CLIENT_ID,
      region: 'us-east-1'
    }
  },
  security: {
    enforceHTTPS: true,
    tokenEncryption: true,
    auditLogging: true
  }
};
```

## Error Handling Patterns

### Authentication Errors

| Error Code | Description | User Type | Action |
|------------|-------------|-----------|---------|
| `INVALID_CREDENTIALS` | Wrong email/password | Both | Show login error |
| `USER_NOT_CONFIRMED` | Email not verified | Customer | Resend verification |
| `MFA_REQUIRED` | MFA challenge needed | Staff | Show MFA form |
| `TOKEN_EXPIRED` | Access token expired | Both | Attempt refresh |
| `REFRESH_TOKEN_EXPIRED` | Refresh token expired | Both | Force re-login |

### Authorization Errors

| Error Code | Description | User Type | Action |
|------------|-------------|-----------|---------|
| `INSUFFICIENT_PERMISSIONS` | Missing required permission | Both | Show access denied |
| `CROSS_POOL_ACCESS` | Wrong token type for endpoint | Both | Force re-login |
| `INVALID_TOKEN_FORMAT` | Malformed JWT token | Both | Clear tokens, redirect |
| `TOKEN_SIGNATURE_INVALID` | Token signature verification failed | Both | Security alert |

## Security Considerations

### Token Security
- Access tokens: 1 hour TTL
- Refresh tokens: 30 days TTL (customers), 7 days TTL (staff)
- Automatic token rotation on refresh
- Secure storage in httpOnly cookies (web) or secure storage (mobile)

### Session Management
- Customer sessions: 24 hour maximum
- Staff sessions: 8 hour maximum
- Concurrent session limits: 3 (customers), 2 (staff)
- Session invalidation on role/permission changes

### Audit Logging
- All authentication events logged to CloudWatch
- Failed login attempts tracked with rate limiting
- Cross-pool access attempts flagged as security events
- Permission changes logged with admin approval trail