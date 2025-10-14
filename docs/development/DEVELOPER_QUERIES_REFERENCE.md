# Developer Reference: Useful Queries & Commands

This document contains frequently used queries and commands for managing users, debugging, and monitoring the HarborList marketplace in local development.

## Table of Contents
- [DynamoDB Queries](#dynamodb-queries)
- [Cognito User Management](#cognito-user-management)
- [User Sync & Migration](#user-sync--migration)
- [Admin Panel Testing](#admin-panel-testing)
- [Debugging & Logs](#debugging--logs)
- [Docker Operations](#docker-operations)

---

## DynamoDB Queries

### List All Users

```bash
docker exec -it harborlist-marketplace-backend-1 node -e "
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://dynamodb-local:8000',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
});

const docClient = DynamoDBDocumentClient.from(client);

(async () => {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: 'harborlist-users'
    }));
    
    console.log('\nAll users in DynamoDB:\n');
    result.Items.forEach(user => {
      const type = user.role === 'user' ? 'CUSTOMER' : 'STAFF';
      console.log(\`  [\${type}] \${user.email}\`);
      console.log(\`    - Status: \${user.status}\`);
      console.log(\`    - Email Verified: \${user.emailVerified}\`);
      console.log(\`    - Customer Type: \${user.customerType || 'N/A'}\`);
      console.log('');
    });
    console.log('Total users:', result.Count);
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
"
```

### List Only Customer Users

```bash
docker exec -it harborlist-marketplace-backend-1 node -e "
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://dynamodb-local:8000',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
});

const docClient = DynamoDBDocumentClient.from(client);

(async () => {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: 'harborlist-users',
      FilterExpression: '#r = :role',
      ExpressionAttributeNames: { '#r': 'role' },
      ExpressionAttributeValues: { ':role': 'user' }
    }));
    
    console.log('Customer users in DynamoDB:');
    result.Items.forEach(user => {
      console.log('  -', user.email, '| Status:', user.status, '| Verified:', user.emailVerified, '| Type:', user.customerType);
    });
    console.log('Total customers:', result.Count);
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
"
```

### List Only Staff Users

```bash
docker exec -it harborlist-marketplace-backend-1 node -e "
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://dynamodb-local:8000',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
});

const docClient = DynamoDBDocumentClient.from(client);

(async () => {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: 'harborlist-users',
      FilterExpression: '#r <> :role',
      ExpressionAttributeNames: { '#r': 'role' },
      ExpressionAttributeValues: { ':role': 'user' }
    }));
    
    console.log('Staff users in DynamoDB:');
    result.Items.forEach(user => {
      console.log('  -', user.email, '| Role:', user.role, '| Status:', user.status);
    });
    console.log('Total staff:', result.Count);
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
"
```

### Find User by Email

```bash
# Replace YOUR_EMAIL with actual email
EMAIL="test-user@example.com"

docker exec -it harborlist-marketplace-backend-1 node -e "
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://dynamodb-local:8000',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
});

const docClient = DynamoDBDocumentClient.from(client);

(async () => {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: 'harborlist-users',
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': process.argv[1] }
    }));
    
    if (result.Items.length === 0) {
      console.log('User not found in DynamoDB');
    } else {
      console.log('User found:');
      console.log(JSON.stringify(result.Items[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
" "$EMAIL"
```

### Update User Email Verification Status

```bash
# Replace USER_ID and STATUS with actual values
USER_ID="0b6e766c-125d-41cc-84e9-e89f7f500540"
EMAIL_VERIFIED=true

docker exec -it harborlist-marketplace-backend-1 node -e "
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://dynamodb-local:8000',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
});

const docClient = DynamoDBDocumentClient.from(client);

(async () => {
  try {
    await docClient.send(new UpdateCommand({
      TableName: 'harborlist-users',
      Key: { id: process.argv[1] },
      UpdateExpression: 'SET emailVerified = :verified, updatedAt = :updated',
      ExpressionAttributeValues: {
        ':verified': process.argv[2] === 'true',
        ':updated': new Date().toISOString()
      }
    }));
    console.log('✅ Updated emailVerified status');
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
" "$USER_ID" "$EMAIL_VERIFIED"
```

### Count Users by Type

```bash
docker exec -it harborlist-marketplace-backend-1 node -e "
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://dynamodb-local:8000',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
});

const docClient = DynamoDBDocumentClient.from(client);

(async () => {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: 'harborlist-users'
    }));
    
    const stats = {
      total: result.Count || 0,
      customers: 0,
      staff: 0,
      active: 0,
      inactive: 0,
      verified: 0,
      unverified: 0
    };
    
    result.Items.forEach(user => {
      if (user.role === 'user') stats.customers++;
      else stats.staff++;
      
      if (user.status === 'active') stats.active++;
      else stats.inactive++;
      
      if (user.emailVerified) stats.verified++;
      else stats.unverified++;
    });
    
    console.log('User Statistics:');
    console.log('  Total Users:', stats.total);
    console.log('  Customers:', stats.customers);
    console.log('  Staff:', stats.staff);
    console.log('  Active:', stats.active);
    console.log('  Inactive:', stats.inactive);
    console.log('  Email Verified:', stats.verified);
    console.log('  Email Unverified:', stats.unverified);
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
"
```

---

## Cognito User Management

### List Users in Customer User Pool

```bash
# Get pool ID from environment
CUSTOMER_POOL_ID=$(grep "CUSTOMER_USER_POOL_ID" .env.local | cut -d'=' -f2)

docker exec harborlist-marketplace-localstack-1 \
  awslocal cognito-idp list-users \
  --user-pool-id "$CUSTOMER_POOL_ID"
```

### List Users in Staff User Pool

```bash
# Get pool ID from environment
STAFF_POOL_ID=$(grep "STAFF_USER_POOL_ID" .env.local | cut -d'=' -f2)

docker exec harborlist-marketplace-localstack-1 \
  awslocal cognito-idp list-users \
  --user-pool-id "$STAFF_POOL_ID"
```

### Get Specific User Details

```bash
# Replace with your values
POOL_ID="us-east-1_211be235f8b0447fa8500c82e32b1351"
USERNAME="test-user@example.com"

docker exec harborlist-marketplace-localstack-1 \
  awslocal cognito-idp admin-get-user \
  --user-pool-id "$POOL_ID" \
  --username "$USERNAME"
```

### Check User Status and Verification

```bash
# Replace with your values
POOL_ID="us-east-1_211be235f8b0447fa8500c82e32b1351"
USERNAME="test-user@example.com"

docker exec harborlist-marketplace-localstack-1 \
  awslocal cognito-idp admin-get-user \
  --user-pool-id "$POOL_ID" \
  --username "$USERNAME" \
  --query '[UserStatus, UserAttributes[?Name==`email_verified`].Value]' \
  --output text
```

### Manually Confirm User Email

```bash
# Get pool ID
CUSTOMER_POOL_ID=$(grep "CUSTOMER_USER_POOL_ID" .env.local | cut -d'=' -f2)
EMAIL="test-user@example.com"

docker exec harborlist-marketplace-localstack-1 \
  awslocal cognito-idp admin-confirm-sign-up \
  --user-pool-id "$CUSTOMER_POOL_ID" \
  --username "$EMAIL"
```

### List User Pools

```bash
docker exec harborlist-marketplace-localstack-1 \
  awslocal cognito-idp list-user-pools --max-results 20
```

### List User Groups in Pool

```bash
POOL_ID="us-east-1_211be235f8b0447fa8500c82e32b1351"

docker exec harborlist-marketplace-localstack-1 \
  awslocal cognito-idp list-groups \
  --user-pool-id "$POOL_ID"
```

### Check User's Group Membership

```bash
POOL_ID="us-east-1_211be235f8b0447fa8500c82e32b1351"
USERNAME="test-user@example.com"

docker exec harborlist-marketplace-localstack-1 \
  awslocal cognito-idp admin-list-groups-for-user \
  --user-pool-id "$POOL_ID" \
  --username "$USERNAME"
```

---

## User Sync & Migration

### Run One-Time Sync of Cognito to DynamoDB

```bash
./tools/development/sync-cognito-users.sh
```

### Manually Verify Customer Email (Local Development)

```bash
./tools/development/verify-customer-email.sh <email>

# Example:
./tools/development/verify-customer-email.sh test-user@example.com
```

### Verify Sync Status (Compare Cognito vs DynamoDB)

```bash
echo "=== COGNITO USERS ==="
CUSTOMER_POOL_ID=$(grep "CUSTOMER_USER_POOL_ID" .env.local | cut -d'=' -f2)
docker exec harborlist-marketplace-localstack-1 \
  awslocal cognito-idp list-users \
  --user-pool-id "$CUSTOMER_POOL_ID" \
  --query 'Users[].{Email:Attributes[?Name==`email`].Value | [0], Status:UserStatus}' \
  --output table

echo ""
echo "=== DYNAMODB USERS ==="
docker exec -it harborlist-marketplace-backend-1 node -e "
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://dynamodb-local:8000',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
});

const docClient = DynamoDBDocumentClient.from(client);

(async () => {
  const result = await docClient.send(new ScanCommand({
    TableName: 'harborlist-users',
    FilterExpression: '#r = :role',
    ExpressionAttributeNames: { '#r': 'role' },
    ExpressionAttributeValues: { ':role': 'user' }
  }));
  
  console.log('Email                     | Status  | Verified');
  console.log('-----------------------------------------------');
  result.Items.forEach(u => {
    console.log(\`\${u.email.padEnd(25)} | \${u.status.padEnd(7)} | \${u.emailVerified}\`);
  });
})();
"
```

---

## Admin Panel Testing

### Test Customer Registration Flow

```bash
# 1. Register new customer
curl -X POST http://localhost:3001/api/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newcustomer@test.com",
    "password": "TestPass123!",
    "name": "New Customer",
    "customerType": "individual"
  }'

# 2. Verify email (local development)
./tools/development/verify-customer-email.sh newcustomer@test.com

# 3. Login
curl -X POST http://localhost:3001/api/auth/customer/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newcustomer@test.com",
    "password": "TestPass123!"
  }'
```

### Test Admin API Endpoints

```bash
# First, login as admin to get token
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@harborlist.local",
    "password": "YOUR_ADMIN_PASSWORD"
  }' | jq -r '.accessToken')

# List customers
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/admin/users/customers | jq

# List staff
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/admin/users/staff | jq

# Get user groups
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/admin/user-groups | jq
```

---

## Debugging & Logs

### View Backend Logs

```bash
# All logs
docker-compose -f docker-compose.local.yml logs backend

# Last 50 lines
docker-compose -f docker-compose.local.yml logs backend --tail=50

# Follow logs in real-time
docker-compose -f docker-compose.local.yml logs backend -f

# Filter for specific terms
docker-compose -f docker-compose.local.yml logs backend | grep -i "error\|customer\|register"
```

### Check Cognito Registration Logs

```bash
docker-compose -f docker-compose.local.yml logs backend --tail=100 | grep -i "customer.*register\|signup\|cognito"
```

### Check DynamoDB Connection

```bash
docker exec -it harborlist-marketplace-backend-1 node -e "
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { ListTablesCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://dynamodb-local:8000',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
});

(async () => {
  try {
    const result = await client.send(new ListTablesCommand({}));
    console.log('✅ DynamoDB Connection OK');
    console.log('Tables:', result.TableNames);
  } catch (error) {
    console.error('❌ DynamoDB Connection Failed:', error.message);
  }
})();
"
```

### Check LocalStack Health

```bash
curl -s http://localhost:4566/_localstack/health | jq
```

### View DynamoDB Admin UI

```bash
# Open in browser
open http://localhost:8001

# Or check if running
curl -s http://localhost:8001 | head -5
```

---

## Docker Operations

### Restart Backend Service

```bash
docker-compose -f docker-compose.local.yml restart backend
```

### Rebuild Backend

```bash
docker-compose -f docker-compose.local.yml up -d --build backend
```

### View Running Containers

```bash
docker-compose -f docker-compose.local.yml ps
```

### Access Backend Shell

```bash
docker exec -it harborlist-marketplace-backend-1 sh
```

### Access LocalStack Shell

```bash
docker exec -it harborlist-marketplace-localstack-1 sh
```

### Check Container Resource Usage

```bash
docker stats harborlist-marketplace-backend-1 --no-stream
```

### Clean Up (Nuclear Option)

```bash
# Stop all services
docker-compose -f docker-compose.local.yml down

# Remove volumes (WARNING: deletes all data)
docker-compose -f docker-compose.local.yml down -v

# Rebuild everything
docker-compose -f docker-compose.local.yml up -d --build
```

---

## Quick Reference Scripts

### Create Executable Aliases (Optional)

Add to your `.zshrc` or `.bashrc`:

```bash
# HarborList Dev Aliases
alias hl-backend-logs='docker-compose -f docker-compose.local.yml logs backend -f'
alias hl-restart-backend='docker-compose -f docker-compose.local.yml restart backend'
alias hl-rebuild-backend='docker-compose -f docker-compose.local.yml up -d --build backend'
alias hl-list-users='docker exec -it harborlist-marketplace-backend-1 node /workspace/tools/development/list-users.js'
alias hl-sync-users='./tools/development/sync-cognito-users.sh'
alias hl-verify-email='./tools/development/verify-customer-email.sh'
```

### Create Helper Script: List All Users

Create `tools/development/list-users.js`:

```javascript
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://dynamodb-local:8000',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
});

const docClient = DynamoDBDocumentClient.from(client);

(async () => {
  const result = await docClient.send(new ScanCommand({
    TableName: 'harborlist-users'
  }));
  
  console.log('\n📊 Users Summary:\n');
  result.Items.forEach(user => {
    const type = user.role === 'user' ? '👤 CUSTOMER' : '👨‍💼 STAFF';
    const verified = user.emailVerified ? '✅' : '❌';
    console.log(`${type} | ${verified} ${user.email}`);
  });
  console.log(`\nTotal: ${result.Count} users\n`);
})();
```

Make it executable:
```bash
chmod +x tools/development/list-users.js
```

---

## Troubleshooting Common Issues

### Issue: User not appearing in admin panel

```bash
# 1. Check if user exists in Cognito
POOL_ID=$(grep "CUSTOMER_USER_POOL_ID" .env.local | cut -d'=' -f2)
docker exec harborlist-marketplace-localstack-1 \
  awslocal cognito-idp list-users --user-pool-id "$POOL_ID"

# 2. Check if user exists in DynamoDB
# (Use "List All Users" query above)

# 3. Run sync if needed
./tools/development/sync-cognito-users.sh
```

### Issue: Email verification not working

```bash
# Manually verify in LocalStack
./tools/development/verify-customer-email.sh <email>
```

### Issue: Backend not connecting to DynamoDB

```bash
# Check DynamoDB is running
docker ps | grep dynamodb

# Check connection from backend
# (Use "Check DynamoDB Connection" query above)

# Restart DynamoDB
docker-compose -f docker-compose.local.yml restart dynamodb-local
```

---

## Notes

- All queries assume you're in the project root directory
- Replace placeholder values (email, pool ID, etc.) with actual values
- For production, replace `dynamodb-local` endpoint with actual AWS endpoint
- DynamoDB queries use the Document Client for simplified syntax
- Cognito queries use `awslocal` which is the LocalStack AWS CLI wrapper

