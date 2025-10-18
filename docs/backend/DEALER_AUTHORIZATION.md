# Dealer Sub-Account Authorization System

## Overview

The dealer authorization system provides secure access control for dealer sub-account management. It ensures that only verified dealer accounts can manage sub-accounts, and that dealers can only access sub-accounts they own.

## Architecture

### Authorization Layers

1. **Authentication Layer**: Validates JWT tokens from AWS Cognito
2. **Tier Verification Layer**: Confirms user has dealer or premium_dealer tier
3. **Ownership Validation Layer**: Ensures dealers can only access their own sub-accounts

### Components

#### Authorization Middleware (`authorization-middleware.ts`)

Located in `backend/src/auth-service/authorization-middleware.ts`

##### Core Functions

**`isDealerTier(userId: string): Promise<boolean>`**
- Checks if a user has dealer or premium_dealer tier
- Queries DynamoDB users table
- Returns `true` if user is a dealer, `false` otherwise
- Handles LocalStack and AWS environments

**`validateDealerSubAccountOwnership(userId: string, subAccountId: string)`**
- Validates that a dealer owns a specific sub-account
- Checks that `parentDealerId` matches the requesting user's ID
- Returns authorization result with optional error message
- Prevents unauthorized access to other dealers' sub-accounts

**`requireDealerTier(feature?: string)`**
- Middleware factory for dealer tier requirement
- Returns 403 Forbidden if user is not a dealer
- Provides user-friendly error messages with upgrade prompts
- Logs authorization failures for security monitoring

**`requireSubAccountOwnership(getSubAccountId: (event) => string)`**
- Middleware factory for sub-account ownership validation
- Takes a function to extract sub-account ID from the request
- Returns 403 Forbidden if ownership validation fails
- Provides clear error messages about access restrictions

#### Dealer API Handler (`dealer-service/handler.ts`)

Located in `backend/src/dealer-service/handler.ts`

##### Authorization Flow

1. **Extract User Claims**
   ```typescript
   const user = getUserFromEvent(event);
   const claims = getClaimsFromEvent(event);
   ```

2. **Apply Dealer Tier Authorization**
   ```typescript
   const dealerAuthResult = await requireDealerTier('sub-account management')(event, claims);
   if (dealerAuthResult) {
     return dealerAuthResult; // 403 Forbidden
   }
   ```

3. **Apply Ownership Validation** (for GET/PUT/DELETE operations on specific sub-accounts)
   ```typescript
   const ownershipAuthResult = await requireSubAccountOwnership(
     (e) => e.pathParameters?.id || ''
   )(event, claims);
   if (ownershipAuthResult) {
     return ownershipAuthResult; // 403 Forbidden
   }
   ```

## API Endpoints

### Protected Endpoints

All dealer API endpoints require authentication and dealer tier:

| Endpoint | Method | Additional Authorization |
|----------|--------|-------------------------|
| `/api/dealer/sub-accounts` | GET | Dealer tier only |
| `/api/dealer/sub-accounts` | POST | Dealer tier only |
| `/api/dealer/sub-accounts/:id` | GET | Dealer tier + Ownership |
| `/api/dealer/sub-accounts/:id` | PUT | Dealer tier + Ownership |
| `/api/dealer/sub-accounts/:id` | DELETE | Dealer tier + Ownership |

## Security Features

### 1. Multi-Layer Protection

- **JWT Validation**: AWS Cognito validates tokens
- **Tier Verification**: Checks customer tier from DynamoDB
- **Ownership Validation**: Verifies parentDealerId matches

### 2. Error Handling

All authorization failures return structured error responses:

```json
{
  "error": "Forbidden",
  "message": "Technical error message",
  "userMessage": "User-friendly explanation",
  "requiredTier": "dealer",
  "upgradeRequired": true
}
```

### 3. Audit Logging

- All authorization failures are logged
- Includes user context (email, IP, user agent)
- Tracks endpoint and request ID
- Integration with comprehensive error handling system

### 4. Cross-Pool Protection

- Prevents staff users from accessing dealer endpoints
- Prevents customers from accessing staff endpoints
- Clear error messages for cross-pool attempts

## Usage Examples

### In API Handlers

```typescript
import {
  requireDealerTier,
  requireSubAccountOwnership
} from '../auth-service/authorization-middleware';

export async function handler(event: APIGatewayProxyEvent) {
  const claims = getClaimsFromEvent(event);
  
  // Require dealer tier for all operations
  const tierAuthResult = await requireDealerTier('feature name')(event, claims);
  if (tierAuthResult) return tierAuthResult;
  
  // For operations on specific sub-accounts, also require ownership
  if (event.pathParameters?.id) {
    const ownershipAuthResult = await requireSubAccountOwnership(
      (e) => e.pathParameters?.id || ''
    )(event, claims);
    if (ownershipAuthResult) return ownershipAuthResult;
  }
  
  // Proceed with business logic
  // ...
}
```

### Custom Middleware

```typescript
// Combine multiple authorization requirements
async function requireDealerWithCustomPermission(event, claims) {
  // Check dealer tier
  const tierResult = await requireDealerTier()(event, claims);
  if (tierResult) return tierResult;
  
  // Check custom permission
  if (!hasCustomPermission(claims)) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Forbidden' })
    };
  }
  
  return null; // Authorization passed
}
```

## Testing

### Unit Tests

Test authorization middleware with mocked DynamoDB:

```typescript
import { isDealerTier, validateDealerSubAccountOwnership } from '../authorization-middleware';

describe('Dealer Authorization', () => {
  test('isDealerTier returns true for dealer accounts', async () => {
    // Mock DynamoDB to return dealer tier
    const result = await isDealerTier('dealer-user-id');
    expect(result).toBe(true);
  });
  
  test('validateDealerSubAccountOwnership checks parentDealerId', async () => {
    // Mock DynamoDB to return sub-account with parentDealerId
    const result = await validateDealerSubAccountOwnership(
      'dealer-id',
      'sub-account-id'
    );
    expect(result.authorized).toBe(true);
  });
});
```

### Integration Tests

Test full API flow with authorization:

```bash
# Create dealer account
./backend/scripts/create-dealer-account.sh

# Test dealer API endpoints
curl -H "Authorization: Bearer $DEALER_TOKEN" \
  http://local-api.harborlist.com:3001/api/dealer/sub-accounts

# Test ownership validation
curl -X GET -H "Authorization: Bearer $DEALER_TOKEN" \
  http://local-api.harborlist.com:3001/api/dealer/sub-accounts/sub-123
```

## Environment Configuration

### Required Environment Variables

```bash
# DynamoDB Configuration
AWS_REGION=us-east-1
USERS_TABLE=harborlist-users

# LocalStack (for local development)
IS_LOCALSTACK=true
DYNAMODB_ENDPOINT=http://localhost:8000
```

### Database Requirements

The authorization system requires the following DynamoDB setup:

1. **Users Table**: `harborlist-users`
   - Primary Key: `id` (string)
   - Attributes: `customerTier`, `parentDealerId`

2. **GSI: ParentDealerIndex**
   - Partition Key: `parentDealerId`
   - Sort Key: `createdAt`
   - Used for listing sub-accounts

## Error Codes

| Code | Description | Status Code |
|------|-------------|-------------|
| `TIER_ACCESS_DENIED` | User doesn't have dealer tier | 403 |
| `CROSS_POOL_ACCESS_DENIED` | Wrong user type (staff vs customer) | 403 |
| `UNAUTHORIZED_ACCESS` | Doesn't own the sub-account | 403 |
| `SUB_ACCOUNT_NOT_FOUND` | Sub-account doesn't exist | 404 |

## Best Practices

### 1. Always Use Middleware

Don't manually check dealer tier or ownership. Use the provided middleware:

```typescript
// ✅ GOOD
const authResult = await requireDealerTier()(event, claims);
if (authResult) return authResult;

// ❌ BAD
if (!user.customerTier === 'dealer') {
  return { statusCode: 403, body: '...' };
}
```

### 2. Provide Context

Include feature names in authorization calls for better error messages:

```typescript
// ✅ GOOD
await requireDealerTier('sub-account analytics')(event, claims);

// ❌ BAD
await requireDealerTier()(event, claims);
```

### 3. Log Authorization Failures

The middleware automatically logs failures, but add context for custom checks:

```typescript
if (!customCheck) {
  await logAuthorizationError(error, 'custom_check_failed');
  return errorResponse;
}
```

### 4. Handle Ownership at Route Level

Apply ownership validation per-route, not globally:

```typescript
// ✅ GOOD - Only validate ownership for specific routes
if (path.includes('/:id') && method !== 'POST') {
  const ownershipResult = await requireSubAccountOwnership(...);
}

// ❌ BAD - Don't validate ownership for list operations
```

## Future Enhancements

### Phase 3: Team-Based Staff Roles

- Add dealer sub-account permission checks to staff authorization
- Allow super_admin to manage dealer sub-accounts
- Add audit trail for sub-account modifications

### Performance Optimization

- Cache dealer tier status in JWT claims
- Use DynamoDB batch operations for bulk validation
- Implement rate limiting per dealer account

### Enhanced Security

- Add IP allowlist for dealer accounts
- Implement MFA requirement for sensitive operations
- Add session management for sub-accounts

## Related Documentation

- [Staff Roles and Permissions](../STAFF_ROLES_AND_PERMISSIONS.md)
- [Dealer Sub-Account Service](./dealer-service.md)
- [Authorization Middleware Tests](../../backend/src/auth-service/__tests__/authorization-middleware.test.ts)
- [Implementation Plan](../../roadmaps/roles_and_permissions/roles_and_permission_implementation.txt)
