# Admin User DynamoDB Synchronization Fix

## Issue: Admin Users Not Visible in Admin Console

### Problem Description

When creating admin users using the `create-admin-user.ts` script, users could authenticate successfully but were not visible in the admin console's user management interface.

**Root Cause**: The script only created users in Cognito but did not create corresponding records in the DynamoDB `users` table.

### Impact

- ✅ **Authentication worked**: Users could log in via Cognito
- ❌ **User management failed**: Admin console couldn't list/manage users
- ❌ **Missing user data**: No user profiles, metadata, or audit trail in DynamoDB

## Solution

Updated `tools/operations/create-admin-user.ts` to synchronize user records to DynamoDB after Cognito creation.

### Changes Made

#### 1. Added DynamoDB Client

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient(dynamoConfig);
const docClient = DynamoDBDocumentClient.from(dynamoClient);
```

#### 2. Created Sync Function

```typescript
async function syncUserToDynamoDB(
  cognitoUserId: string, 
  email: string, 
  name: string, 
  role: AdminRole
): Promise<void> {
  const userRecord = {
    id: cognitoUserId,  // Cognito sub as primary key
    email: email,
    name: name,
    role: role,
    status: 'active',
    emailVerified: true,
    phoneVerified: false,
    mfaEnabled: false,
    loginAttempts: 0,
    createdAt: now,
    updatedAt: now,
    permissions: role === 'super-admin' ? ['all'] : [],
    sessionTimeout: 480 // 8 hours
  };

  await docClient.send(new PutCommand({
    TableName: USERS_TABLE,
    Item: userRecord
  }));
}
```

#### 3. Updated User Creation Flow

```typescript
// After creating user in Cognito
const cognitoUser = await cognitoClient.send(new AdminGetUserCommand({
  UserPoolId: STAFF_USER_POOL_ID,
  Username: email
}));

const cognitoUserId = cognitoUser.UserAttributes?.find(attr => attr.Name === 'sub')?.Value;
if (cognitoUserId) {
  await syncUserToDynamoDB(cognitoUserId, email, name, role);
}
```

#### 4. Updated setup-local-admin.sh

Added environment variables for DynamoDB and Cognito:

```bash
export DYNAMODB_ENDPOINT=${DYNAMODB_ENDPOINT:-"http://localhost:8000"}
export COGNITO_ENDPOINT=${COGNITO_ENDPOINT:-"http://localhost:4566"}
export IS_LOCALSTACK=${IS_LOCALSTACK:-"true"}
export STAFF_USER_POOL_ID=$(grep STAFF_USER_POOL_ID ../../.env.local | cut -d'=' -f2)
```

### User Record Schema

The DynamoDB user record includes:

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Cognito user ID (sub) - Primary Key |
| `email` | String | User email address |
| `name` | String | Full name |
| `role` | String | Admin role (super-admin, admin, etc.) |
| `status` | String | Account status (active, suspended, etc.) |
| `emailVerified` | Boolean | Email verification status |
| `phoneVerified` | Boolean | Phone verification status |
| `mfaEnabled` | Boolean | MFA enablement status |
| `loginAttempts` | Number | Failed login attempt counter |
| `createdAt` | String | ISO timestamp of creation |
| `updatedAt` | String | ISO timestamp of last update |
| `permissions` | Array | Permission list |
| `sessionTimeout` | Number | Session timeout in minutes |

### Testing

#### 1. Create a New Admin User

```bash
cd tools/operations

# Set environment variables
export IS_LOCALSTACK=true
export COGNITO_ENDPOINT=http://localhost:4566
export DYNAMODB_ENDPOINT=http://localhost:8000
export STAFF_USER_POOL_ID=$(grep STAFF_USER_POOL_ID ../../.env.local | cut -d'=' -f2)
export AWS_REGION=us-east-1

# Create admin user
npx ts-node create-admin-user.ts \
  --email admin@harborlist.local \
  --name "HarborList Administrator" \
  --role super-admin
```

#### 2. Verify Cognito User

```bash
aws --endpoint-url=http://localhost:4566 cognito-idp list-users \
  --user-pool-id $STAFF_USER_POOL_ID
```

#### 3. Verify DynamoDB Record

```bash
aws --endpoint-url=http://localhost:8000 dynamodb scan \
  --table-name harborlist-users \
  --filter-expression "email = :email" \
  --expression-attribute-values '{":email":{"S":"admin@harborlist.local"}}'
```

#### 4. Verify in Admin Console

1. Log in to admin console at https://local.harborlist.com/admin/login
2. Navigate to User Management section
3. Verify admin user appears in the list

### Files Modified

- ✅ `tools/operations/create-admin-user.ts` - Added DynamoDB sync
- ✅ `tools/operations/setup-local-admin.sh` - Added environment variables
- ✅ `backend/package.json` - Already had DynamoDB SDK dependencies

### Deployment Flow

The updated deployment flow now includes:

1. **localstack-init**: Sets up DynamoDB tables
2. **init-cognito**: Creates Cognito pools and updates .env.local
3. **Backend services**: Start with correct Pool IDs (after recreation)
4. **Admin user creation**: Creates user in BOTH Cognito AND DynamoDB

### Related Issues

- Original issue: Admin user 401 Unauthorized (RESOLVED)
- User Pool ID mismatch (RESOLVED by container recreation)
- Missing bcryptjs dependency (RESOLVED)
- **Admin users not visible in console (RESOLVED by this change)**

### Best Practices

1. **Always sync to DynamoDB**: Any user creation in Cognito should have a corresponding DynamoDB record
2. **Use Cognito sub as ID**: The Cognito `sub` attribute should be the primary key in DynamoDB
3. **Idempotent operations**: Check if user exists before creating to avoid duplicates
4. **Error handling**: Log errors but don't fail deployment if sync fails

### Future Improvements

- [ ] Add bulk user import with automatic DynamoDB sync
- [ ] Create migration script to sync existing Cognito users to DynamoDB
- [ ] Add webhook/trigger to auto-sync on Cognito user creation
- [ ] Implement user update sync when modifying Cognito attributes

## Version History

- **v1.0** (2025-10-17) - Initial DynamoDB synchronization implementation
- Fixed admin user visibility issue in admin console
- Users now properly appear in user management interface

## Related Documentation

- [Admin Access Fix](../ADMIN_ACCESS_FIX.md)
- [Cognito Deployment Flow](./COGNITO_DEPLOYMENT_FLOW.md)
- [Docker Init Container Fixes](./DOCKER_INIT_CONTAINER_FIXES.md)
