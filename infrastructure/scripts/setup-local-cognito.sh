#!/bin/bash

# Setup script for LocalStack Cognito User Pools
# This script initializes the Customer and Staff User Pools in LocalStack
# for local development and testing

set -e

echo "🚀 Setting up LocalStack Cognito User Pools for HarborList..."

# LocalStack endpoint - use service name when running in Docker Compose
LOCALSTACK_ENDPOINT="${LOCALSTACK_ENDPOINT:-http://localstack:4566}"
AWS_REGION="us-east-1"

# Configure AWS CLI for LocalStack
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_DEFAULT_REGION="us-east-1"

# Function to check if LocalStack is running
check_localstack() {
    echo "🔍 Checking if LocalStack is running..."
    if ! curl -s "$LOCALSTACK_ENDPOINT/health" > /dev/null; then
        echo "❌ LocalStack is not running. Please start LocalStack first."
        echo "   Run: docker-compose up localstack"
        exit 1
    fi
    echo "✅ LocalStack is running"
}

# Function to create Customer User Pool
create_customer_pool() {
    echo "👥 Creating Customer User Pool..."
    
    # Create Customer User Pool
    CUSTOMER_POOL_ID=$(aws cognito-idp create-user-pool \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --pool-name "harborlist-customers-local" \
        --policies '{
            "PasswordPolicy": {
                "MinimumLength": 8,
                "RequireUppercase": true,
                "RequireLowercase": true,
                "RequireNumbers": true,
                "RequireSymbols": false,
                "TemporaryPasswordValidityDays": 7
            }
        }' \
        --auto-verified-attributes email \
        --username-attributes email \
        --mfa-configuration OFF \
        --device-configuration '{
            "ChallengeRequiredOnNewDevice": true,
            "DeviceOnlyRememberedOnUserPrompt": false
        }' \
        --email-configuration '{
            "EmailSendingAccount": "COGNITO_DEFAULT"
        }' \
        --user-pool-tags '{
            "Environment": "local",
            "Service": "harborlist",
            "UserType": "customer"
        }' \
        --schema '[
            {
                "Name": "email",
                "AttributeDataType": "String",
                "Required": true,
                "Mutable": true
            },
            {
                "Name": "phone_number",
                "AttributeDataType": "String",
                "Required": false,
                "Mutable": true
            },
            {
                "Name": "given_name",
                "AttributeDataType": "String",
                "Required": false,
                "Mutable": true
            },
            {
                "Name": "family_name",
                "AttributeDataType": "String",
                "Required": false,
                "Mutable": true
            },
            {
                "Name": "customer_type",
                "AttributeDataType": "String",
                "Required": false,
                "Mutable": true
            },
            {
                "Name": "tier",
                "AttributeDataType": "String",
                "Required": false,
                "Mutable": true
            }
        ]' \
        --query 'UserPool.Id' \
        --output text)
    
    echo "✅ Customer User Pool created: $CUSTOMER_POOL_ID"
    
    # Create Customer User Pool Client
    CUSTOMER_CLIENT_ID=$(aws cognito-idp create-user-pool-client \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --user-pool-id "$CUSTOMER_POOL_ID" \
        --client-name "harborlist-customers-client-local" \
        --explicit-auth-flows USER_SRP_AUTH USER_PASSWORD_AUTH \
        --supported-identity-providers COGNITO \
        --callback-urls "http://localhost:3000/auth/callback" "http://localhost:3000/" \
        --logout-urls "http://localhost:3000/auth/logout" "http://localhost:3000/" \
        --allowed-o-auth-flows authorization_code \
        --allowed-o-auth-scopes email openid profile \
        --allowed-o-auth-flows-user-pool-client \
        --access-token-validity 60 \
        --id-token-validity 60 \
        --refresh-token-validity 43200 \
        --prevent-user-existence-errors ENABLED \
        --query 'UserPoolClient.ClientId' \
        --output text)
    
    echo "✅ Customer User Pool Client created: $CUSTOMER_CLIENT_ID"
    
    # Create Customer Groups
    echo "👥 Creating Customer Groups..."
    
    aws cognito-idp create-group \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --group-name "individual-customers" \
        --user-pool-id "$CUSTOMER_POOL_ID" \
        --description "Individual customers with basic marketplace access" \
        --precedence 3
    
    aws cognito-idp create-group \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --group-name "dealer-customers" \
        --user-pool-id "$CUSTOMER_POOL_ID" \
        --description "Dealer customers with enhanced listing capabilities" \
        --precedence 2
    
    aws cognito-idp create-group \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --group-name "premium-customers" \
        --user-pool-id "$CUSTOMER_POOL_ID" \
        --description "Premium customers with all features and benefits" \
        --precedence 1
    
    echo "✅ Customer Groups created"
    
    # Save Customer Pool configuration
    cat > /tmp/customer-pool-config.json << EOF
{
    "userPoolId": "$CUSTOMER_POOL_ID",
    "clientId": "$CUSTOMER_CLIENT_ID",
    "region": "$AWS_REGION",
    "endpoint": "$LOCALSTACK_ENDPOINT"
}
EOF
    
    echo "📝 Customer Pool configuration saved to /tmp/customer-pool-config.json"
}

# Function to create Staff User Pool
create_staff_pool() {
    echo "👨‍💼 Creating Staff User Pool..."
    
    # Create Staff User Pool
    STAFF_POOL_ID=$(aws cognito-idp create-user-pool \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --pool-name "harborlist-staff-local" \
        --policies '{
            "PasswordPolicy": {
                "MinimumLength": 12,
                "RequireUppercase": true,
                "RequireLowercase": true,
                "RequireNumbers": true,
                "RequireSymbols": true,
                "TemporaryPasswordValidityDays": 1
            }
        }' \
        --auto-verified-attributes email \
        --username-attributes email \
        --mfa-configuration OFF \
        --device-configuration '{
            "ChallengeRequiredOnNewDevice": true,
            "DeviceOnlyRememberedOnUserPrompt": true
        }' \
        --email-configuration '{
            "EmailSendingAccount": "COGNITO_DEFAULT"
        }' \
        --user-pool-tags '{
            "Environment": "local",
            "Service": "harborlist",
            "UserType": "staff"
        }' \
        --schema '[
            {
                "Name": "email",
                "AttributeDataType": "String",
                "Required": true,
                "Mutable": true
            },
            {
                "Name": "phone_number",
                "AttributeDataType": "String",
                "Required": true,
                "Mutable": true
            },
            {
                "Name": "given_name",
                "AttributeDataType": "String",
                "Required": true,
                "Mutable": true
            },
            {
                "Name": "family_name",
                "AttributeDataType": "String",
                "Required": true,
                "Mutable": true
            },
            {
                "Name": "role",
                "AttributeDataType": "String",
                "Required": false,
                "Mutable": true
            },
            {
                "Name": "permissions",
                "AttributeDataType": "String",
                "Required": false,
                "Mutable": true
            },
            {
                "Name": "team",
                "AttributeDataType": "String",
                "Required": false,
                "Mutable": true
            }
        ]' \
        --query 'UserPool.Id' \
        --output text)
    
    echo "✅ Staff User Pool created: $STAFF_POOL_ID"
    
    # Create Staff User Pool Client
    STAFF_CLIENT_ID=$(aws cognito-idp create-user-pool-client \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --user-pool-id "$STAFF_POOL_ID" \
        --client-name "harborlist-staff-client-local" \
        --explicit-auth-flows USER_SRP_AUTH ADMIN_USER_PASSWORD_AUTH \
        --supported-identity-providers COGNITO \
        --callback-urls "http://localhost:3000/admin/auth/callback" "http://localhost:3000/admin" \
        --logout-urls "http://localhost:3000/admin/auth/logout" "http://localhost:3000/" \
        --allowed-o-auth-flows authorization_code \
        --allowed-o-auth-scopes email openid profile \
        --allowed-o-auth-flows-user-pool-client \
        --access-token-validity 30 \
        --id-token-validity 30 \
        --refresh-token-validity 480 \
        --prevent-user-existence-errors ENABLED \
        --query 'UserPoolClient.ClientId' \
        --output text)
    
    echo "✅ Staff User Pool Client created: $STAFF_CLIENT_ID"
    
    # Create Staff Groups
    echo "👨‍💼 Creating Staff Groups..."
    
    aws cognito-idp create-group \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --group-name "super-admin" \
        --user-pool-id "$STAFF_POOL_ID" \
        --description "Super administrators with full system access" \
        --precedence 1
    
    aws cognito-idp create-group \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --group-name "admin" \
        --user-pool-id "$STAFF_POOL_ID" \
        --description "Administrators with broad system access" \
        --precedence 2
    
    aws cognito-idp create-group \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --group-name "manager" \
        --user-pool-id "$STAFF_POOL_ID" \
        --description "Managers with team-specific access" \
        --precedence 3
    
    aws cognito-idp create-group \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --group-name "team-member" \
        --user-pool-id "$STAFF_POOL_ID" \
        --description "Team members with basic staff operations access" \
        --precedence 4
    
    echo "✅ Staff Groups created"
    
    # Save Staff Pool configuration
    cat > /tmp/staff-pool-config.json << EOF
{
    "userPoolId": "$STAFF_POOL_ID",
    "clientId": "$STAFF_CLIENT_ID",
    "region": "$AWS_REGION",
    "endpoint": "$LOCALSTACK_ENDPOINT"
}
EOF
    
    echo "📝 Staff Pool configuration saved to /tmp/staff-pool-config.json"
}

# Function to create test users
create_test_users() {
    echo "🧪 Creating test users..."
    
    # Load pool configurations
    CUSTOMER_POOL_ID=$(cat /tmp/customer-pool-config.json | grep -o '"userPoolId": "[^"]*' | cut -d'"' -f4)
    STAFF_POOL_ID=$(cat /tmp/staff-pool-config.json | grep -o '"userPoolId": "[^"]*' | cut -d'"' -f4)
    
    # Create test customer users
    echo "👥 Creating test customer users..."
    
    # Individual customer
    aws cognito-idp admin-create-user \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --user-pool-id "$CUSTOMER_POOL_ID" \
        --username "individual@test.com" \
        --user-attributes Name=email,Value=individual@test.com Name=given_name,Value=John Name=family_name,Value=Doe \
        --temporary-password "TempPass123!" \
        --message-action SUPPRESS
    
    aws cognito-idp admin-add-user-to-group \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --user-pool-id "$CUSTOMER_POOL_ID" \
        --username "individual@test.com" \
        --group-name "individual-customers"
    
    # Dealer customer
    aws cognito-idp admin-create-user \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --user-pool-id "$CUSTOMER_POOL_ID" \
        --username "dealer@test.com" \
        --user-attributes Name=email,Value=dealer@test.com Name=given_name,Value=Jane Name=family_name,Value=Smith \
        --temporary-password "TempPass123!" \
        --message-action SUPPRESS
    
    aws cognito-idp admin-add-user-to-group \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --user-pool-id "$CUSTOMER_POOL_ID" \
        --username "dealer@test.com" \
        --group-name "dealer-customers"
    
    # Premium customer
    aws cognito-idp admin-create-user \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --user-pool-id "$CUSTOMER_POOL_ID" \
        --username "premium@test.com" \
        --user-attributes Name=email,Value=premium@test.com Name=given_name,Value=Bob Name=family_name,Value=Johnson \
        --temporary-password "TempPass123!" \
        --message-action SUPPRESS
    
    aws cognito-idp admin-add-user-to-group \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --user-pool-id "$CUSTOMER_POOL_ID" \
        --username "premium@test.com" \
        --group-name "premium-customers"
    
    # Create test staff users
    echo "👨‍💼 Creating test staff users..."
    
    # Super Admin
    aws cognito-idp admin-create-user \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --user-pool-id "$STAFF_POOL_ID" \
        --username "superadmin@test.com" \
        --user-attributes Name=email,Value=superadmin@test.com Name=phone_number,Value=+1234567890 Name=given_name,Value=Super Name=family_name,Value=Admin \
        --temporary-password "TempPass123!@#" \
        --message-action SUPPRESS
    
    aws cognito-idp admin-add-user-to-group \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --user-pool-id "$STAFF_POOL_ID" \
        --username "superadmin@test.com" \
        --group-name "super-admin"
    
    # Admin
    aws cognito-idp admin-create-user \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --user-pool-id "$STAFF_POOL_ID" \
        --username "admin@test.com" \
        --user-attributes Name=email,Value=admin@test.com Name=phone_number,Value=+1234567891 Name=given_name,Value=Admin Name=family_name,Value=User \
        --temporary-password "TempPass123!@#" \
        --message-action SUPPRESS
    
    aws cognito-idp admin-add-user-to-group \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --user-pool-id "$STAFF_POOL_ID" \
        --username "admin@test.com" \
        --group-name "admin"
    
    echo "✅ Test users created successfully"
    echo ""
    echo "🔑 Test User Credentials:"
    echo "Customer Users:"
    echo "  - individual@test.com / TempPass123!"
    echo "  - dealer@test.com / TempPass123!"
    echo "  - premium@test.com / TempPass123!"
    echo ""
    echo "Staff Users:"
    echo "  - superadmin@test.com / TempPass123!@#"
    echo "  - admin@test.com / TempPass123!@#"
    echo ""
    echo "⚠️  Remember to change passwords on first login!"
}

# Function to save environment configuration
save_env_config() {
    echo "💾 Saving environment configuration..."
    
    CUSTOMER_POOL_ID=$(cat /tmp/customer-pool-config.json | grep -o '"userPoolId": "[^"]*' | cut -d'"' -f4)
    CUSTOMER_CLIENT_ID=$(cat /tmp/customer-pool-config.json | grep -o '"clientId": "[^"]*' | cut -d'"' -f4)
    STAFF_POOL_ID=$(cat /tmp/staff-pool-config.json | grep -o '"userPoolId": "[^"]*' | cut -d'"' -f4)
    STAFF_CLIENT_ID=$(cat /tmp/staff-pool-config.json | grep -o '"clientId": "[^"]*' | cut -d'"' -f4)
    
    # Create environment configuration file
    cat > .env.local << EOF
# LocalStack Cognito Configuration
# Generated by setup-local-cognito.sh

# Customer User Pool
CUSTOMER_USER_POOL_ID=$CUSTOMER_POOL_ID
CUSTOMER_USER_POOL_CLIENT_ID=$CUSTOMER_CLIENT_ID

# Staff User Pool
STAFF_USER_POOL_ID=$STAFF_POOL_ID
STAFF_USER_POOL_CLIENT_ID=$STAFF_CLIENT_ID

# LocalStack Configuration
AWS_REGION=us-east-1
COGNITO_ENDPOINT=http://localhost:4566
IS_LOCALSTACK=true

# Development Settings
NODE_ENV=development
LOG_LEVEL=debug
EOF
    
    echo "✅ Environment configuration saved to .env.local"
}

# Main execution
main() {
    echo "🏗️  HarborList LocalStack Cognito Setup"
    echo "======================================"
    
    check_localstack
    create_customer_pool
    create_staff_pool
    # create_test_users  # Commented out - no test users during deployment
    save_env_config
    
    echo ""
    echo "🎉 LocalStack Cognito setup completed successfully!"
    echo ""
    echo "📋 Summary:"
    echo "  ✅ Customer User Pool created with 3 groups"
    echo "  ✅ Staff User Pool created with 4 groups"
    echo "  ✅ Environment configuration saved"
    echo ""
    echo "🚀 Next steps:"
    echo "  1. Start your backend services"
    echo "  2. Create admin users using tools/operations/create-admin-user.sh"
    echo "  3. Test authentication with your created users"
    echo ""
    echo "📖 For more information, see the authentication documentation."
}

# Run main function
main "$@"