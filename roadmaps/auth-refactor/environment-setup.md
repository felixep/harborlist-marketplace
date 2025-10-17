# Environment Setup Instructions

## Overview

This document provides comprehensive setup instructions for the dual Cognito authentication system across different environments: Local Development (LocalStack), AWS Development/Staging, and AWS Production.

## Local Development Setup with LocalStack

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed
- AWS CLI configured (for CDK deployment to AWS environments)

### 1. LocalStack Configuration

Create or update your `docker-compose.local.yml`:

```yaml
version: '3.8'

services:
  localstack:
    image: localstack/localstack:latest
    container_name: harborlist-localstack
    ports:
      - "4566:4566"
      - "4510-4559:4510-4559"
    environment:
      - SERVICES=cognito-idp,apigateway,lambda,iam,sts
      - DEBUG=1
      - COGNITO_PROVIDER_DEVELOPER_USER_POOL=true
      - LAMBDA_EXECUTOR=docker
      - DOCKER_HOST=unix:///var/run/docker.sock
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock"
      - "./localstack-data:/tmp/localstack"
    networks:
      - harborlist-network

  auth-service:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: harborlist-auth-service
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=local
      - COGNITO_ENDPOINT=http://localstack:4566
      - AWS_REGION=us-east-1
      - AWS_ACCESS_KEY_ID=test
      - AWS_SECRET_ACCESS_KEY=test
      - CUSTOMER_POOL_ID=local_customer_pool
      - CUSTOMER_CLIENT_ID=local_customer_client
      - STAFF_POOL_ID=local_staff_pool
      - STAFF_CLIENT_ID=local_staff_client
    depends_on:
      - localstack
    networks:
      - harborlist-network
    volumes:
      - ./backend/src:/app/src
      - ./backend/node_modules:/app/node_modules

networks:
  harborlist-network:
    driver: bridge
```

### 2. LocalStack Initialization Script

Create `tools/development/setup-local-cognito.sh`:

```bash
#!/bin/bash

# Setup Local Cognito User Pools in LocalStack

set -e

LOCALSTACK_ENDPOINT="http://localhost:4566"
AWS_REGION="us-east-1"

echo "Setting up LocalStack Cognito User Pools..."

# Configure AWS CLI for LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=$AWS_REGION

# Create Customer User Pool
echo "Creating Customer User Pool..."
CUSTOMER_POOL_ID=$(aws cognito-idp create-user-pool \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --pool-name "HarborList-Customers-Local" \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": false,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": false
    }
  }' \
  --auto-verified-attributes email \
  --username-attributes email \
  --mfa-configuration OFF \
  --query 'UserPool.Id' \
  --output text)

echo "Customer Pool ID: $CUSTOMER_POOL_ID"

# Create Customer User Pool Client
CUSTOMER_CLIENT_ID=$(aws cognito-idp create-user-pool-client \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --user-pool-id $CUSTOMER_POOL_ID \
  --client-name "HarborList-Customer-Client" \
  --generate-secret \
  --explicit-auth-flows ADMIN_NO_SRP_AUTH ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --token-validity-units '{
    "AccessToken": "hours",
    "IdToken": "hours", 
    "RefreshToken": "days"
  }' \
  --access-token-validity 1 \
  --id-token-validity 1 \
  --refresh-token-validity 30 \
  --query 'UserPoolClient.ClientId' \
  --output text)

echo "Customer Client ID: $CUSTOMER_CLIENT_ID"

# Create Customer Groups
aws cognito-idp create-group \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --group-name "individual-customers" \
  --user-pool-id $CUSTOMER_POOL_ID \
  --description "Individual customers with basic access" \
  --precedence 3

aws cognito-idp create-group \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --group-name "dealer-customers" \
  --user-pool-id $CUSTOMER_POOL_ID \
  --description "Dealer customers with enhanced features" \
  --precedence 2

aws cognito-idp create-group \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --group-name "premium-customers" \
  --user-pool-id $CUSTOMER_POOL_ID \
  --description "Premium customers with all features" \
  --precedence 1

# Create Staff User Pool
echo "Creating Staff User Pool..."
STAFF_POOL_ID=$(aws cognito-idp create-user-pool \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --pool-name "HarborList-Staff-Local" \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 12,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": true
    }
  }' \
  --auto-verified-attributes email \
  --username-attributes email \
  --mfa-configuration OPTIONAL \
  --query 'UserPool.Id' \
  --output text)

echo "Staff Pool ID: $STAFF_POOL_ID"

# Create Staff User Pool Client
STAFF_CLIENT_ID=$(aws cognito-idp create-user-pool-client \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --user-pool-id $STAFF_POOL_ID \
  --client-name "HarborList-Staff-Client" \
  --generate-secret \
  --explicit-auth-flows ADMIN_NO_SRP_AUTH ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --token-validity-units '{
    "AccessToken": "hours",
    "IdToken": "hours",
    "RefreshToken": "days"
  }' \
  --access-token-validity 8 \
  --id-token-validity 8 \
  --refresh-token-validity 7 \
  --query 'UserPoolClient.ClientId' \
  --output text)

echo "Staff Client ID: $STAFF_CLIENT_ID"

# Create Staff Groups
aws cognito-idp create-group \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --group-name "super-admin" \
  --user-pool-id $STAFF_POOL_ID \
  --description "Super administrators with full access" \
  --precedence 1

aws cognito-idp create-group \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --group-name "admin" \
  --user-pool-id $STAFF_POOL_ID \
  --description "Administrators with management access" \
  --precedence 2

aws cognito-idp create-group \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --group-name "manager" \
  --user-pool-id $STAFF_POOL_ID \
  --description "Managers with team oversight" \
  --precedence 3

aws cognito-idp create-group \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --group-name "team-member" \
  --user-pool-id $STAFF_POOL_ID \
  --description "Team members with basic staff access" \
  --precedence 4

# Create test users
echo "Creating test users..."

# Test Customer Users
aws cognito-idp admin-create-user \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --user-pool-id $CUSTOMER_POOL_ID \
  --username "test.customer@example.com" \
  --user-attributes Name=email,Value=test.customer@example.com Name=email_verified,Value=true \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --user-pool-id $CUSTOMER_POOL_ID \
  --username "test.customer@example.com" \
  --password "CustomerPass123!" \
  --permanent

aws cognito-idp admin-add-user-to-group \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --user-pool-id $CUSTOMER_POOL_ID \
  --username "test.customer@example.com" \
  --group-name "individual-customers"

# Test Dealer User
aws cognito-idp admin-create-user \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --user-pool-id $CUSTOMER_POOL_ID \
  --username "test.dealer@example.com" \
  --user-attributes Name=email,Value=test.dealer@example.com Name=email_verified,Value=true \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --user-pool-id $CUSTOMER_POOL_ID \
  --username "test.dealer@example.com" \
  --password "DealerPass123!" \
  --permanent

aws cognito-idp admin-add-user-to-group \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --user-pool-id $CUSTOMER_POOL_ID \
  --username "test.dealer@example.com" \
  --group-name "dealer-customers"

# Test Staff User
aws cognito-idp admin-create-user \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --user-pool-id $STAFF_POOL_ID \
  --username "test.admin@example.com" \
  --user-attributes Name=email,Value=test.admin@example.com Name=email_verified,Value=true \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --user-pool-id $STAFF_POOL_ID \
  --username "test.admin@example.com" \
  --password "AdminPass123!@#" \
  --permanent

aws cognito-idp admin-add-user-to-group \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --user-pool-id $STAFF_POOL_ID \
  --username "test.admin@example.com" \
  --group-name "admin"

# Save configuration to .env.local
cat > .env.local << EOF
# LocalStack Cognito Configuration
NODE_ENV=local
COGNITO_ENDPOINT=http://localhost:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

# Customer Pool Configuration
CUSTOMER_POOL_ID=$CUSTOMER_POOL_ID
CUSTOMER_CLIENT_ID=$CUSTOMER_CLIENT_ID

# Staff Pool Configuration  
STAFF_POOL_ID=$STAFF_POOL_ID
STAFF_CLIENT_ID=$STAFF_CLIENT_ID

# Test User Credentials
TEST_CUSTOMER_EMAIL=test.customer@example.com
TEST_CUSTOMER_PASSWORD=CustomerPass123!
TEST_DEALER_EMAIL=test.dealer@example.com
TEST_DEALER_PASSWORD=DealerPass123!
TEST_ADMIN_EMAIL=test.admin@example.com
TEST_ADMIN_PASSWORD=AdminPass123!@#
EOF

echo "LocalStack Cognito setup complete!"
echo "Configuration saved to .env.local"
echo ""
echo "Test Users Created:"
echo "Customer: test.customer@example.com / CustomerPass123!"
echo "Dealer: test.dealer@example.com / DealerPass123!"
echo "Admin: test.admin@example.com / AdminPass123!@#"
```

### 3. Starting Local Development Environment

```bash
# 1. Start LocalStack and services
docker-compose -f docker-compose.local.yml up -d

# 2. Wait for LocalStack to be ready
sleep 10

# 3. Setup Cognito User Pools
chmod +x tools/development/setup-local-cognito.sh
./tools/development/setup-local-cognito.sh

# 4. Start the auth service
cd backend
npm run dev

# 5. Start the frontend (in another terminal)
cd frontend
npm run dev
```

### 4. Local Environment Verification

Create `tools/development/test-dual-auth.sh`:

```bash
#!/bin/bash

# Test Local Authentication Setup

LOCALSTACK_ENDPOINT="http://localhost:4566"
AUTH_SERVICE_ENDPOINT="http://localhost:3001"

echo "Testing Local Authentication Setup..."

# Test customer login
echo "Testing customer login..."
CUSTOMER_RESPONSE=$(curl -s -X POST $AUTH_SERVICE_ENDPOINT/auth/customer/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.customer@example.com",
    "password": "CustomerPass123!"
  }')

if echo $CUSTOMER_RESPONSE | grep -q "accessToken"; then
  echo "✅ Customer login successful"
else
  echo "❌ Customer login failed"
  echo $CUSTOMER_RESPONSE
fi

# Test staff login
echo "Testing staff login..."
STAFF_RESPONSE=$(curl -s -X POST $AUTH_SERVICE_ENDPOINT/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.admin@example.com", 
    "password": "AdminPass123!@#"
  }')

if echo $STAFF_RESPONSE | grep -q "accessToken"; then
  echo "✅ Staff login successful"
else
  echo "❌ Staff login failed"
  echo $STAFF_RESPONSE
fi

echo "Local authentication test complete!"
```

## AWS Development/Staging Setup

### 1. CDK Deployment

```bash
# Install CDK dependencies
cd infrastructure
npm install

# Bootstrap CDK (first time only)
npx cdk bootstrap --context environment=dev

# Deploy Customer Auth Stack
npx cdk deploy CustomerAuthStack-dev --context environment=dev

# Deploy Staff Auth Stack  
npx cdk deploy StaffAuthStack-dev --context environment=dev

# Deploy main application stack
npx cdk deploy HarborListStack-dev --context environment=dev
```

### 2. Environment Configuration

Create `infrastructure/config/dev.json`:

```json
{
  "environment": "dev",
  "region": "us-east-1",
  "customerPool": {
    "name": "HarborList-Customers-Dev",
    "passwordPolicy": {
      "minimumLength": 8,
      "requireUppercase": false,
      "requireLowercase": true,
      "requireNumbers": true,
      "requireSymbols": false
    },
    "mfaConfiguration": "OFF",
    "tokenValidityUnits": {
      "accessToken": "hours",
      "idToken": "hours",
      "refreshToken": "days"
    },
    "accessTokenValidity": 1,
    "idTokenValidity": 1,
    "refreshTokenValidity": 30
  },
  "staffPool": {
    "name": "HarborList-Staff-Dev",
    "passwordPolicy": {
      "minimumLength": 12,
      "requireUppercase": true,
      "requireLowercase": true,
      "requireNumbers": true,
      "requireSymbols": true
    },
    "mfaConfiguration": "OPTIONAL",
    "tokenValidityUnits": {
      "accessToken": "hours",
      "idToken": "hours", 
      "refreshToken": "days"
    },
    "accessTokenValidity": 8,
    "idTokenValidity": 8,
    "refreshTokenValidity": 7
  }
}
```

### 3. Environment Variables

Create `.env.dev`:

```bash
# AWS Development Environment
NODE_ENV=development
AWS_REGION=us-east-1

# Customer Pool Configuration (from CDK outputs)
CUSTOMER_POOL_ID=us-east-1_XXXXXXXXX
CUSTOMER_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# Staff Pool Configuration (from CDK outputs)
STAFF_POOL_ID=us-east-1_YYYYYYYYY  
STAFF_CLIENT_ID=yyyyyyyyyyyyyyyyyyyyyyyyyy

# API Gateway Configuration
API_GATEWAY_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev

# CloudWatch Logging
LOG_LEVEL=info
ENABLE_AUDIT_LOGGING=true
```

## AWS Production Setup

### 1. Production CDK Configuration

Create `infrastructure/config/prod.json`:

```json
{
  "environment": "prod",
  "region": "us-east-1",
  "customerPool": {
    "name": "HarborList-Customers-Prod",
    "passwordPolicy": {
      "minimumLength": 10,
      "requireUppercase": true,
      "requireLowercase": true,
      "requireNumbers": true,
      "requireSymbols": true
    },
    "mfaConfiguration": "OPTIONAL",
    "accountRecoverySetting": {
      "recoveryMechanisms": [
        {
          "name": "verified_email",
          "priority": 1
        }
      ]
    },
    "tokenValidityUnits": {
      "accessToken": "minutes",
      "idToken": "minutes",
      "refreshToken": "days"
    },
    "accessTokenValidity": 60,
    "idTokenValidity": 60,
    "refreshTokenValidity": 30
  },
  "staffPool": {
    "name": "HarborList-Staff-Prod",
    "passwordPolicy": {
      "minimumLength": 14,
      "requireUppercase": true,
      "requireLowercase": true,
      "requireNumbers": true,
      "requireSymbols": true
    },
    "mfaConfiguration": "ON",
    "accountRecoverySetting": {
      "recoveryMechanisms": [
        {
          "name": "verified_email",
          "priority": 1
        }
      ]
    },
    "tokenValidityUnits": {
      "accessToken": "minutes",
      "idToken": "minutes",
      "refreshToken": "hours"
    },
    "accessTokenValidity": 480,
    "idTokenValidity": 480,
    "refreshTokenValidity": 168
  },
  "security": {
    "enableWAF": true,
    "enableCloudTrail": true,
    "enableGuardDuty": true,
    "encryptionAtRest": true
  }
}
```

### 2. Production Deployment

```bash
# Deploy to production
npx cdk deploy --all --context environment=prod --require-approval never

# Verify deployment
npx cdk diff --context environment=prod
```

### 3. Production Environment Variables

Create `.env.prod`:

```bash
# AWS Production Environment
NODE_ENV=production
AWS_REGION=us-east-1

# Customer Pool Configuration
CUSTOMER_POOL_ID=us-east-1_PRODCUST
CUSTOMER_CLIENT_ID=prod_customer_client_id

# Staff Pool Configuration
STAFF_POOL_ID=us-east-1_PRODSTAFF
STAFF_CLIENT_ID=prod_staff_client_id

# Security Configuration
ENFORCE_HTTPS=true
TOKEN_ENCRYPTION_KEY=your-encryption-key-here
ENABLE_AUDIT_LOGGING=true
ENABLE_SECURITY_HEADERS=true

# Monitoring
LOG_LEVEL=warn
ENABLE_PERFORMANCE_MONITORING=true
CLOUDWATCH_LOG_GROUP=/aws/lambda/harborlist-auth
```

## Environment Switching

### 1. Environment Detection

Create `backend/src/config/environment.ts`:

```typescript
export interface EnvironmentConfig {
  environment: 'local' | 'dev' | 'staging' | 'prod';
  cognito: {
    customerPool: {
      poolId: string;
      clientId: string;
      region: string;
    };
    staffPool: {
      poolId: string;
      clientId: string;
      region: string;
    };
  };
  localstack?: {
    endpoint: string;
    region: string;
  };
}

export function getEnvironmentConfig(): EnvironmentConfig {
  const env = process.env.NODE_ENV || 'local';
  
  if (env === 'local') {
    return {
      environment: 'local',
      cognito: {
        customerPool: {
          poolId: process.env.CUSTOMER_POOL_ID || 'local_customer_pool',
          clientId: process.env.CUSTOMER_CLIENT_ID || 'local_customer_client',
          region: process.env.AWS_REGION || 'us-east-1'
        },
        staffPool: {
          poolId: process.env.STAFF_POOL_ID || 'local_staff_pool',
          clientId: process.env.STAFF_CLIENT_ID || 'local_staff_client',
          region: process.env.AWS_REGION || 'us-east-1'
        }
      },
      localstack: {
        endpoint: process.env.COGNITO_ENDPOINT || 'http://localhost:4566',
        region: process.env.AWS_REGION || 'us-east-1'
      }
    };
  }
  
  return {
    environment: env as 'dev' | 'staging' | 'prod',
    cognito: {
      customerPool: {
        poolId: process.env.CUSTOMER_POOL_ID!,
        clientId: process.env.CUSTOMER_CLIENT_ID!,
        region: process.env.AWS_REGION || 'us-east-1'
      },
      staffPool: {
        poolId: process.env.STAFF_POOL_ID!,
        clientId: process.env.STAFF_CLIENT_ID!,
        region: process.env.AWS_REGION || 'us-east-1'
      }
    }
  };
}
```

### 2. Environment Switching Script

Create `tools/operations/switch-environment.sh`:

```bash
#!/bin/bash

# Environment switching script

ENVIRONMENT=$1

if [ -z "$ENVIRONMENT" ]; then
  echo "Usage: $0 <local|dev|staging|prod>"
  exit 1
fi

case $ENVIRONMENT in
  local)
    echo "Switching to local development environment..."
    cp .env.local .env
    docker-compose -f docker-compose.local.yml up -d
    ;;
  dev)
    echo "Switching to AWS development environment..."
    cp .env.dev .env
    ;;
  staging)
    echo "Switching to AWS staging environment..."
    cp .env.staging .env
    ;;
  prod)
    echo "Switching to AWS production environment..."
    cp .env.prod .env
    ;;
  *)
    echo "Invalid environment: $ENVIRONMENT"
    echo "Valid options: local, dev, staging, prod"
    exit 1
    ;;
esac

echo "Environment switched to: $ENVIRONMENT"
echo "Please restart your services to apply the new configuration."
```

## Troubleshooting

### Common Issues

1. **LocalStack Connection Issues**
   ```bash
   # Check LocalStack status
   curl http://localhost:4566/health
   
   # Check Cognito service
   aws cognito-idp list-user-pools --max-results 10 --endpoint-url http://localhost:4566
   ```

2. **CDK Deployment Failures**
   ```bash
   # Check CDK context
   npx cdk context --clear
   
   # Verify AWS credentials
   aws sts get-caller-identity
   
   # Check CDK bootstrap
   npx cdk bootstrap --show-template
   ```

3. **Authentication Service Issues**
   ```bash
   # Check environment variables
   printenv | grep -E "(COGNITO|CUSTOMER|STAFF)"
   
   # Test auth service health
   curl http://localhost:3001/health
   ```

### Debugging Tips

1. **Enable Debug Logging**
   ```bash
   export DEBUG=aws-sdk:*
   export LOG_LEVEL=debug
   ```

2. **Check CloudWatch Logs**
   ```bash
   aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/harborlist"
   ```

3. **Validate JWT Tokens**
   ```bash
   # Use jwt.io or decode locally
   node -e "console.log(JSON.stringify(JSON.parse(Buffer.from('TOKEN_PAYLOAD'.split('.')[1], 'base64').toString()), null, 2))"
   ```

## Next Steps

After completing environment setup:

1. Run the authentication flow tests
2. Verify API Gateway authorizers
3. Test cross-pool security measures
4. Validate admin interface integration
5. Perform end-to-end testing in each environment