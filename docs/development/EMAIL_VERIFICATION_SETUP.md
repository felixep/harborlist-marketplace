# Email Verification Setup for Local Development

## Current Status

### ✅ Completed
- Customer registration now syncs to DynamoDB
- Email verification updates DynamoDB status  
- Helper script created for manual email verification

### 📋 Summary

**Problem**: With Cognito authentication refactor, email verification emails are not being sent in local development because LocalStack uses `COGNITO_DEFAULT` email configuration which doesn't actually send emails locally.

**Solution for Local Development**:
1. Use manual verification helper script
2. SMTP4Dev is available but not yet integrated with LocalStack Cognito

## How to Verify Customer Emails Locally

### Method 1: Helper Script (Recommended)

```bash
# Verify a customer's email
./tools/development/verify-customer-email.sh <email>

# Example
./tools/development/verify-customer-email.sh test-user@example.com
```

This script:
- Checks if user exists in Cognito
- Confirms their email status
- Updates Cognito to `CONFIRMED` state
- Sets `email_verified` to `true`

### Method 2: AWS CLI Direct

```bash
# Get user pool ID
CUSTOMER_POOL_ID=$(grep "CUSTOMER_USER_POOL_ID" .env.local | cut -d'=' -f2)

# Manually confirm user
docker exec harborlist-marketplace-localstack-1 \
  awslocal cognito-idp admin-confirm-sign-up \
  --user-pool-id "$CUSTOMER_POOL_ID" \
  --username "user@example.com"
```

### Method 3: Auto-Verification (Future Enhancement)

Modify `infrastructure/scripts/setup-local-cognito.sh` to auto-verify emails on registration:

```javascript
// Lambda Pre-SignUp Trigger
exports.handler = async (event) => {
  if (process.env.ENVIRONMENT === 'local') {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
  }
  return event;
};
```

## SMTP4Dev Integration

### Current Setup
- **Service**: Running at http://localhost:5001 or https://mail.local.harborlist.com
- **SMTP Port**: 25 (accessible at `smtp4dev:25` from containers)
- **Status**: ⚠️ Not integrated with LocalStack Cognito

### Why It's Not Currently Used

LocalStack Cognito is configured with:
```json
{
  "EmailConfiguration": {
    "EmailSendingAccount": "COGNITO_DEFAULT"
  }
}
```

This means LocalStack handles emails internally, but doesn't actually send them in local mode.

### To Integrate SMTP4Dev (Future Enhancement)

Would require:
1. LocalStack Pro custom SMTP configuration
2. Configure SES endpoint to use SMTP4Dev
3. Update Cognito to use SES instead of COGNITO_DEFAULT

```bash
# In setup-local-cognito.sh
--email-configuration '{
  "EmailSendingAccount": "DEVELOPER",
  "SourceArn": "arn:aws:ses:us-east-1:000000000000:identity/noreply@harborlist.local",
  "From": "HarborList <noreply@harborlist.local>",
  "ReplyToEmailAddress": "support@harborlist.local"
}'
```

Then configure LocalStack SES to forward to SMTP4Dev:
```bash
# Set SMTP endpoint in LocalStack
export SMTP_HOST=smtp4dev
export SMTP_PORT=25
```

## Testing Flow

### 1. Register New Customer

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

**Result**:
- ✅ User created in Cognito (`UserStatus: UNCONFIRMED`)
- ✅ User record created in DynamoDB (`emailVerified: false`)

### 2. Verify Email

```bash
./tools/development/verify-customer-email.sh newcustomer@test.com
```

**Result**:
- ✅ Cognito updated (`UserStatus: CONFIRMED`, `email_verified: true`)

### 3. Login

```bash
curl -X POST http://localhost:3001/api/auth/customer/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newcustomer@test.com",
    "password": "TestPass123!"
  }'
```

**Result**:
- ✅ Login successful
- ✅ Returns access token, refresh token, and user info

### 4. Check Admin Panel

1. Navigate to `https://local.harborlist.com/admin`
2. Go to **User Management** > **Customers** tab
3. **Result**: ✅ See the new customer listed with verified status

## For Existing Users

If you have users that were created before the DynamoDB sync was implemented:

1. They exist in Cognito but not in DynamoDB
2. They won't appear in admin panel
3. Solution: They need to login once after the update, or register again

To manually sync an existing user:
1. Verify their email: `./tools/development/verify-customer-email.sh <email>`
2. Have them login once - this will create their DynamoDB record

## Production Configuration

For production deployment, configure AWS SES:

1. **Verify Domain**:
   ```bash
   aws ses verify-domain-identity --domain harborlist.com
   ```

2. **Configure Cognito**:
   ```typescript
   email: cognito.UserPoolEmail.withSES({
     fromEmail: 'noreply@harborlist.com',
     fromName: 'HarborList',
     sesRegion: 'us-east-1',
     sesVerifiedDomain: 'harborlist.com',
   })
   ```

3. **Custom Email Templates**:
   - Verification email template
   - Password reset template
   - Welcome email template

## Checklist

- [x] Registration syncs to DynamoDB
- [x] Email confirmation syncs to DynamoDB
- [x] Manual verification helper script created
- [x] Users appear in admin panel after registration
- [ ] SMTP4Dev integrated with LocalStack (future)
- [ ] Auto-verification for local environment (future)
- [ ] Production SES configuration (when deploying)

## Related Files

- `backend/src/auth-service/index.ts` - Auth service with DynamoDB sync
- `tools/development/verify-customer-email.sh` - Manual verification helper
- `CUSTOMER_REGISTRATION_SYNC.md` - Detailed technical documentation
- `infrastructure/scripts/setup-local-cognito.sh` - Cognito setup script
- `docker-compose.local.yml` - SMTP4Dev configuration

