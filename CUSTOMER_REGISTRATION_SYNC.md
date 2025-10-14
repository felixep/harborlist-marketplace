# Customer Registration & Email Verification Fix

## Problem Summary

### Issues Identified
1. **Users not appearing in Admin Panel**: Customers registered via Cognito were not synced to DynamoDB
2. **No verification emails**: LocalStack Cognito doesn't send real emails in local development
3. **Admin panel queries DynamoDB**: But customers only existed in Cognito User Pool

## Root Cause

When a customer registers:
1. ✅ Account created in **Cognito** (source of truth for authentication)
2. ❌ No record created in **DynamoDB** (where admin panel queries from)
3. ❌ Email verification not working in local environment

## Solution Implemented

### 1. Cognito → DynamoDB Sync

**File**: `backend/src/auth-service/index.ts`

**Changes**:
- Added `createUserInDynamoDB()` method to sync user registration
- Modified `customerRegister()` to call sync after Cognito registration
- Added `updateUserEmailVerified()` to update DynamoDB when email is confirmed
- Modified `customerConfirmSignUp()` to update DynamoDB status

**Flow**:
```
User Registers
    ↓
Create in Cognito (UserStatus: UNCONFIRMED)
    ↓
Create in DynamoDB (emailVerified: false)
    ↓
User Confirms Email
    ↓
Update Cognito (UserStatus: CONFIRMED)
    ↓
Update DynamoDB (emailVerified: true)
```

### 2. DynamoDB User Record Structure

```typescript
{
  id: string;                    // Cognito Sub
  email: string;
  name: string;
  phone?: string;
  role: 'user';                  // Customer role
  status: 'active';
  emailVerified: boolean;        // Synced from Cognito
  customerType: string;          // 'individual', 'dealer', 'premium'
  tier: string;                  // Same as customerType
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  loginCount: number;
}
```

## Email Verification in Local Development

### The Challenge

**LocalStack Cognito** uses `EmailSendingAccount: "COGNITO_DEFAULT"` but doesn't actually send emails locally.

### Options for Local Testing

#### Option 1: Auto-Verify (Simplest for Development)
Modify `infrastructure/scripts/setup-local-cognito.sh` to include Lambda trigger that auto-confirms users:

```bash
--user-pool-add-ons '{
  "AdvancedSecurityMode": "OFF"
}' \
--lambda-config '{
  "PreSignUp": "<lambda-arn-that-auto-confirms>"
}'
```

#### Option 2: Manual Admin Verification (Current Recommendation)
Use AWS CLI to manually confirm users in local environment:

```bash
# Get verification code from LocalStack logs
docker-compose logs localstack | grep "verification code"

# Or manually confirm user (for testing)
docker exec harborlist-marketplace-localstack-1 \
  awslocal cognito-idp admin-confirm-sign-up \
  --user-pool-id <POOL_ID> \
  --username <EMAIL>
```

#### Option 3: Configure SMTP4Dev with LocalStack Pro
This requires LocalStack Pro configuration to route Cognito emails through SMTP4Dev.

## Testing the Fix

### 1. Register a New Customer

```bash
curl -X POST http://localhost:3001/api/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newcustomer@test.com",
    "password": "TestPass123!",
    "name": "New Customer",
    "customerType": "individual"
  }'
```

**Expected**: User created in both Cognito AND DynamoDB

### 2. Check User in Cognito

```bash
docker exec harborlist-marketplace-localstack-1 \
  awslocal cognito-idp list-users \
  --user-pool-id $CUSTOMER_USER_POOL_ID
```

**Expected**: User with `UserStatus: "UNCONFIRMED"` and `email_verified: false`

### 3. Check User in DynamoDB

```bash
# Via DynamoDB Admin UI
open http://localhost:8001

# Or via AWS CLI
docker exec harborlist-marketplace-localstack-1 \
  awslocal dynamodb scan \
  --table-name harborlist-users \
  --filter-expression "email = :email" \
  --expression-attribute-values '{":email":{"S":"newcustomer@test.com"}}'
```

**Expected**: User record with `emailVerified: false`

### 4. Manually Verify Email (Local Testing)

```bash
# Get the user pool ID
CUSTOMER_POOL_ID=$(grep "CUSTOMER_USER_POOL_ID" .env.local | cut -d'=' -f2)

# Manually confirm the user
docker exec harborlist-marketplace-localstack-1 \
  awslocal cognito-idp admin-confirm-sign-up \
  --user-pool-id "$CUSTOMER_POOL_ID" \
  --username "newcustomer@test.com"
```

### 5. Test Email Confirmation Endpoint

```bash
curl -X POST http://localhost:3001/api/auth/customer/confirm-signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newcustomer@test.com",
    "confirmationCode": "123456"
  }'
```

**Expected**: 
- Cognito: `UserStatus: "CONFIRMED"`, `email_verified: true`
- DynamoDB: `emailVerified: true`

### 6. Verify User Appears in Admin Panel

1. Login to admin panel: `https://local.harborlist.com/admin`
2. Navigate to User Management > Customers tab
3. **Expected**: See the newly registered customer with verification status

## Files Modified

1. `backend/src/auth-service/index.ts`
   - Added `createUserInDynamoDB()` method
   - Added `updateUserEmailVerified()` method
   - Modified `customerRegister()` to sync to DynamoDB
   - Modified `customerConfirmSignUp()` to update DynamoDB

## Next Steps

### For Local Development
1. Consider auto-verification in local environment
2. Document manual verification process for team
3. Add helper script: `tools/development/verify-customer-email.sh`

### For Production
- Configure AWS SES for Cognito email sending
- Set up custom email templates
- Configure proper FROM email address
- Test email deliverability

## Verification Checklist

- [x] User created in Cognito on registration
- [x] User created in DynamoDB on registration
- [x] Email verified status synced on confirmation
- [ ] Email verification emails sent (requires SMTP config)
- [x] Users appear in admin panel after registration
- [x] Email verified status shown correctly in admin panel

## Additional Notes

### SMTP4Dev Setup
SMTP4Dev is configured in `docker-compose.local.yml`:
- Web UI: http://localhost:5001 or https://mail.local.harborlist.com
- SMTP Port: 25 (accessible at smtp4dev:25 from containers)

To use SMTP4Dev with Cognito, LocalStack Pro would need custom email configuration, which is not currently set up.

### Alternative: Pre-Verified Test Users
The setup script can create test users with email already verified:

```bash
# In setup-local-cognito.sh, add:
aws cognito-idp admin-update-user-attributes \
  --endpoint-url="$LOCALSTACK_ENDPOINT" \
  --user-pool-id "$CUSTOMER_POOL_ID" \
  --username "test@example.com" \
  --user-attributes Name=email_verified,Value=true
```

