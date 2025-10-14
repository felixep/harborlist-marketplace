# Cognito Authentication Quick Reference

## Environment Setup

```bash
# Required environment variables
COGNITO_REGION=us-east-1
BUYER_USER_POOL_ID=your-buyer-pool-id
SELLER_USER_POOL_ID=your-seller-pool-id
```

## How Authentication Works

### 1. User Signs In (Frontend → Cognito)

```javascript
// Frontend uses AWS Amplify or Cognito SDK
import { signIn } from 'aws-amplify/auth';

const { tokens } = await signIn({
  username: 'user@example.com',
  password: 'Password123!'
});

// Get the ID token (JWT)
const idToken = tokens.idToken.toString();
```

### 2. Frontend Makes API Request

```javascript
// Include token in Authorization header
fetch('https://api.harborlist.com/listings', {
  headers: {
    'Authorization': `Bearer ${idToken}`
  }
});
```

### 3. Backend Verifies Token

```typescript
// In backend/src/shared/auth.ts
import { verifyToken, getUserFromEvent } from './shared/auth';

// From API Gateway event
const user = await getUserFromEvent(event);
// { sub, email, name, role, userType, ... }

// Or from raw token
const payload = await verifyToken(token);
```

## Token Structure

### Cognito ID Token Claims

```json
{
  "sub": "a1b2c3d4-...",
  "cognito:groups": ["Admins"],
  "cognito:username": "user@example.com",
  "email": "user@example.com",
  "email_verified": true,
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXX",
  "iat": 1697216400,
  "exp": 1697220000
}
```

### Our JWTPayload Format

```typescript
{
  sub: "a1b2c3d4-...",           // Cognito user ID
  email: "user@example.com",
  name: "John Doe",
  role: "admin" | "user",        // Mapped from cognito:groups
  userType: "buyer" | "seller",  // Determined from issuer
  permissions: [...],
  "cognito:username": "user@example.com",
  "cognito:groups": ["Admins"],
  iat: 1697216400,
  exp: 1697220000
}
```

## Common Usage Patterns

### Protect an Endpoint

```typescript
import { getUserFromEvent, requireAdminRole } from './shared/auth';

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    // Get and verify user
    const user = await getUserFromEvent(event);
    
    // Require admin role
    requireAdminRole(user);
    
    // User is authenticated and authorized
    // ... your logic here
    
  } catch (error) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
};
```

### Check Specific Permissions

```typescript
import { getUserFromEvent, requireAdminRole } from './shared/auth';
import { AdminPermission } from './types/common';

export const handler = async (event: APIGatewayProxyEvent) => {
  const user = await getUserFromEvent(event);
  
  // Require specific permissions
  requireAdminRole(user, [
    AdminPermission.MANAGE_USERS,
    AdminPermission.VIEW_ANALYTICS
  ]);
  
  // User has required permissions
  // ... your logic here
};
```

### Get User Type

```typescript
const user = await getUserFromEvent(event);

if (user.userType === 'buyer') {
  // Buyer-specific logic
} else if (user.userType === 'seller') {
  // Seller-specific logic
}
```

### Audit Logging

```typescript
import { getUserFromEvent, createAuditLog, getClientInfo } from './shared/auth';

const user = await getUserFromEvent(event);
const clientInfo = getClientInfo(event);

const auditLog = createAuditLog(
  user,
  'UPDATE_LISTING',
  'listings',
  { listingId, changes },
  clientInfo,
  listingId
);

// Save audit log to database
await db.createAuditLog(auditLog);
```

## User Pools Setup

### Buyer User Pool
- For regular marketplace users (buyers)
- Can browse and purchase items
- Limited permissions

### Seller User Pool
- For sellers and vendors
- Can list items, manage inventory
- Extended permissions

### Groups
- `Admins` - Mapped to `UserRole.ADMIN`
- `SuperAdmins` - Mapped to `UserRole.SUPER_ADMIN`
- Default (no group) - Mapped to `UserRole.USER`

## Verification Process

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ 1. Sign in with Cognito
       ▼
┌─────────────┐
│   Cognito   │
│  User Pool  │
└──────┬──────┘
       │ 2. Return JWT (ID Token)
       ▼
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 3. API Request + Bearer Token
       ▼
┌─────────────┐
│  Backend    │
│  (Lambda)   │
└──────┬──────┘
       │ 4. verifyToken(token)
       ▼
┌─────────────┐
│   Cognito   │
│    JWKS     │ ← Public keys for verification
└──────┬──────┘
       │ 5. Return public key
       ▼
┌─────────────┐
│  Backend    │
│  Verifies   │
│  Signature  │
└──────┬──────┘
       │ 6. Return user payload
       ▼
┌─────────────┐
│   Handler   │
│   Logic     │
└─────────────┘
```

## Error Handling

### Invalid Token
```typescript
try {
  const user = await verifyToken(token);
} catch (error) {
  // error.message: "Invalid token format"
  // error.message: "Not a Cognito token"
  // error.message: "Token expired"
}
```

### Missing Authorization
```typescript
const token = extractTokenFromEvent(event);
if (!token) {
  return {
    statusCode: 401,
    body: JSON.stringify({ error: 'No authentication token provided' })
  };
}
```

### Insufficient Permissions
```typescript
try {
  requireAdminRole(user, [AdminPermission.MANAGE_USERS]);
} catch (error) {
  // error.message: "Admin access required"
  // error.message: "Insufficient permissions"
  return {
    statusCode: 403,
    body: JSON.stringify({ error: error.message })
  };
}
```

## Testing Locally

### With LocalStack Cognito

```bash
# Create user pool
aws cognito-idp create-user-pool \
  --pool-name buyer-pool \
  --endpoint-url http://localhost:4566

# Create user
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_XXXXXX \
  --username test@example.com \
  --endpoint-url http://localhost:4566

# Initiate auth
aws cognito-idp admin-initiate-auth \
  --user-pool-id us-east-1_XXXXXX \
  --client-id XXXXXX \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --auth-parameters USERNAME=test@example.com,PASSWORD=Test123! \
  --endpoint-url http://localhost:4566
```

### Mock Tokens for Testing

For unit tests, you can mock the verifyToken function:

```typescript
import * as auth from './shared/auth';

jest.spyOn(auth, 'verifyToken').mockResolvedValue({
  sub: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  userType: 'buyer'
});
```

## Security Best Practices

1. **Always verify tokens server-side** - Never trust client claims
2. **Use HTTPS in production** - Tokens should never go over HTTP
3. **Short token lifetimes** - Cognito tokens expire in 1 hour by default
4. **Refresh tokens** - Implement token refresh flow in frontend
5. **Rate limiting** - Add rate limiting to auth endpoints
6. **Audit logging** - Log all authentication and authorization events

## Troubleshooting

### "Invalid token: Not a Cognito token"
- Token doesn't have `iss` claim with `cognito-idp`
- Token might be from wrong source
- Check token format

### "No kid found in token"
- Token header is missing `kid` (key ID)
- Token might be malformed
- Check token structure

### "No signing key found"
- JWKS endpoint unreachable
- Wrong user pool ID
- Network issues

### "Token expired"
- Token's `exp` claim is in the past
- Frontend needs to refresh token
- Implement token refresh flow

---

**Last Updated:** October 14, 2025  
**Version:** 1.0 - Cognito-only implementation
