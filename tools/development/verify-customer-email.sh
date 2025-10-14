#!/bin/bash

# Helper script to manually verify customer email in local development
# Usage: ./verify-customer-email.sh <email>
#
# This is needed because LocalStack Cognito doesn't send real verification emails
# in local development. This script manually confirms the user's email.

set -e

# Check if email argument is provided
if [ -z "$1" ]; then
    echo "❌ Error: Email address is required"
    echo ""
    echo "Usage: $0 <email>"
    echo "Example: $0 test-user@example.com"
    exit 1
fi

EMAIL="$1"

# Load environment variables
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
else
    echo "❌ Error: .env.local file not found"
    echo "Please run infrastructure/scripts/setup-local-cognito.sh first"
    exit 1
fi

# Check if CUSTOMER_USER_POOL_ID is set
if [ -z "$CUSTOMER_USER_POOL_ID" ]; then
    echo "❌ Error: CUSTOMER_USER_POOL_ID not found in .env.local"
    echo "Please run infrastructure/scripts/setup-local-cognito.sh first"
    exit 1
fi

echo "🔍 Verifying customer email for: $EMAIL"
echo ""

# Check if user exists
echo "📋 Checking if user exists in Cognito..."
USER_STATUS=$(docker exec harborlist-marketplace-localstack-1 \
    awslocal cognito-idp admin-get-user \
    --user-pool-id "$CUSTOMER_USER_POOL_ID" \
    --username "$EMAIL" \
    --query 'UserStatus' \
    --output text 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Error: User not found in Cognito"
    echo "Please make sure the user has registered first"
    exit 1
fi

echo "✅ User found with status: $USER_STATUS"
echo ""

# Check if already confirmed
if [ "$USER_STATUS" == "CONFIRMED" ]; then
    echo "ℹ️  User email is already verified"
    exit 0
fi

# Confirm the user
echo "📧 Manually confirming email..."
docker exec harborlist-marketplace-localstack-1 \
    awslocal cognito-idp admin-confirm-sign-up \
    --user-pool-id "$CUSTOMER_USER_POOL_ID" \
    --username "$EMAIL" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Email verified successfully!"
    echo ""
    echo "📊 Updated Status:"
    docker exec harborlist-marketplace-localstack-1 \
        awslocal cognito-idp admin-get-user \
        --user-pool-id "$CUSTOMER_USER_POOL_ID" \
        --username "$EMAIL" \
        --query '[UserStatus, UserAttributes[?Name==`email_verified`].Value]' \
        --output text
    echo ""
    echo "🎉 User can now login with their credentials"
    echo ""
    echo "💡 Note: DynamoDB sync will happen on next login or you can trigger it via:"
    echo "   curl -X POST http://localhost:3001/api/auth/customer/confirm-signup \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"email\":\"$EMAIL\",\"confirmationCode\":\"000000\"}'"
else
    echo "❌ Error: Failed to verify email"
    exit 1
fi
