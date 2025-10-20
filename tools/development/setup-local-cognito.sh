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
    # Try both old and new health endpoints
    if ! curl -s "$LOCALSTACK_ENDPOINT/_localstack/health" > /dev/null 2>&1 && \
       ! curl -s "$LOCALSTACK_ENDPOINT/health" > /dev/null 2>&1; then
        echo "❌ LocalStack is not running. Please start LocalStack first."
        echo "   Run: docker-compose up localstack"
        echo "   Checked: $LOCALSTACK_ENDPOINT/_localstack/health"
        exit 1
    fi
    echo "✅ LocalStack is running"
}

# Function to check if a User Pool exists in LocalStack
check_user_pool_exists() {
    local pool_id=$1
    local pool_name=$2
    
    if [[ -z "$pool_id" ]]; then
        echo "ℹ️  No $pool_name ID found in .env.local"
        return 1
    fi
    
    # Try to describe the user pool
    if aws cognito-idp describe-user-pool \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --user-pool-id "$pool_id" \
        --region "$AWS_REGION" &>/dev/null; then
        echo "✅ Found existing $pool_name: $pool_id"
        return 0
    else
        echo "⚠️  $pool_name ID found in .env.local ($pool_id) but pool doesn't exist in LocalStack"
        echo "   This can happen after cleanup or LocalStack restart. Will create new pool."
        return 1
    fi
}

# Function to load existing User Pool IDs from .env.local
load_existing_pools() {
    if [[ -f ".env.local" ]]; then
        echo "🔍 Checking for existing User Pools in .env.local..."
        EXISTING_CUSTOMER_POOL_ID=$(grep "^CUSTOMER_USER_POOL_ID=" .env.local 2>/dev/null | cut -d'=' -f2 || echo "")
        EXISTING_CUSTOMER_CLIENT_ID=$(grep "^CUSTOMER_USER_POOL_CLIENT_ID=" .env.local 2>/dev/null | cut -d'=' -f2 || echo "")
        EXISTING_STAFF_POOL_ID=$(grep "^STAFF_USER_POOL_ID=" .env.local 2>/dev/null | cut -d'=' -f2 || echo "")
        EXISTING_STAFF_CLIENT_ID=$(grep "^STAFF_USER_POOL_CLIENT_ID=" .env.local 2>/dev/null | cut -d'=' -f2 || echo "")
    fi
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
        --group-name "super_admin" \
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
        --group-name "team_member" \
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

# Function to display pool configuration
# Update both .env and .env.local with Cognito Pool IDs
# This is called ONLY when creating NEW pools (not when reusing existing ones)
update_env_local() {
    echo "🔧 Updating environment files with new Cognito Pool IDs..."
    
    # Docker-volume-friendly update function (avoids sed -i which can't rename mounted files)
    update_or_append() {
        local key=$1
        local value=$2
        local file=$3
        local temp_file="/tmp/$(basename $file).tmp"
        
        if grep -q "^${key}=" "$file" 2>/dev/null; then
            # Update existing line using awk (no file renaming needed)
            awk -v key="$key" -v value="$value" \
                'BEGIN {found=0} 
                 $0 ~ "^"key"=" {print key"="value; found=1; next} 
                 {print} 
                 END {if(!found) print key"="value}' "$file" > "$temp_file"
            cat "$temp_file" > "$file"
            rm -f "$temp_file"
        else
            # Append new line
            echo "${key}=${value}" >> "$file"
        fi
    }
    
    # Update .env.local
    if [[ ! -f ".env.local" ]]; then
        echo "⚠️  .env.local not found, creating it..."
        touch ".env.local"
    fi
    
    update_or_append "CUSTOMER_USER_POOL_ID" "$CUSTOMER_POOL_ID" ".env.local"
    update_or_append "CUSTOMER_USER_POOL_CLIENT_ID" "$CUSTOMER_CLIENT_ID" ".env.local"
    update_or_append "STAFF_USER_POOL_ID" "$STAFF_POOL_ID" ".env.local"
    update_or_append "STAFF_USER_POOL_CLIENT_ID" "$STAFF_CLIENT_ID" ".env.local"
    
    echo "  ✅ Updated .env.local"
    
    # Update .env (if it exists)
    if [[ -f ".env" ]]; then
        update_or_append "CUSTOMER_USER_POOL_ID" "$CUSTOMER_POOL_ID" ".env"
        update_or_append "CUSTOMER_USER_POOL_CLIENT_ID" "$CUSTOMER_CLIENT_ID" ".env"
        update_or_append "STAFF_USER_POOL_ID" "$STAFF_POOL_ID" ".env"
        update_or_append "STAFF_USER_POOL_CLIENT_ID" "$STAFF_CLIENT_ID" ".env"
        
        echo "  ✅ Updated .env"
    else
        echo "  ℹ️  .env not found, skipping (only .env.local updated)"
    fi
    
    echo "✅ Environment files updated with new Cognito Pool IDs"
}

display_pool_config() {
    echo ""
    echo "📋 Cognito Pool Configuration:"
    echo "================================"
    echo ""
    echo "Customer Pool:"
    echo "  Pool ID:   $CUSTOMER_POOL_ID"
    echo "  Client ID: $CUSTOMER_CLIENT_ID"
    echo ""
    echo "Staff Pool:"
    echo "  Pool ID:   $STAFF_POOL_ID"
    echo "  Client ID: $STAFF_CLIENT_ID"
    echo ""
    
    # Verify configuration matches .env.local
    if [[ -f ".env.local" ]]; then
        LOCAL_CUSTOMER_POOL=$(grep "^CUSTOMER_USER_POOL_ID=" .env.local 2>/dev/null | cut -d'=' -f2)
        LOCAL_STAFF_POOL=$(grep "^STAFF_USER_POOL_ID=" .env.local 2>/dev/null | cut -d'=' -f2)
        
        if [[ "$CUSTOMER_POOL_ID" == "$LOCAL_CUSTOMER_POOL" ]] && [[ "$STAFF_POOL_ID" == "$LOCAL_STAFF_POOL" ]]; then
            echo "✅ Configuration synchronized with .env.local"
        else
            echo "⚠️  WARNING: Pool IDs don't match .env.local!"
            echo "   This shouldn't happen if setup completed successfully."
            echo "   Current pools: Customer=$CUSTOMER_POOL_ID, Staff=$STAFF_POOL_ID"
            echo "   .env.local has: Customer=$LOCAL_CUSTOMER_POOL, Staff=$LOCAL_STAFF_POOL"
        fi
    else
        echo "⚠️  WARNING: .env.local file not found - configuration may not persist!"
    fi
}

# Main execution
main() {
    echo "🏗️  HarborList LocalStack Cognito Setup"
    echo "======================================"
    
    check_localstack
    load_existing_pools
    
    # Track whether we created new pools
    POOLS_CREATED=false
    
    # Check if Customer Pool exists, create if not
    if check_user_pool_exists "$EXISTING_CUSTOMER_POOL_ID" "Customer User Pool"; then
        CUSTOMER_POOL_ID=$EXISTING_CUSTOMER_POOL_ID
        CUSTOMER_CLIENT_ID=$EXISTING_CUSTOMER_CLIENT_ID
        echo "♻️  Reusing existing Customer User Pool"
        
        # Save to temp config for consistency
        cat > /tmp/customer-pool-config.json << EOF
{
    "userPoolId": "$CUSTOMER_POOL_ID",
    "clientId": "$CUSTOMER_CLIENT_ID",
    "region": "$AWS_REGION",
    "endpoint": "$LOCALSTACK_ENDPOINT"
}
EOF
    else
        create_customer_pool
        POOLS_CREATED=true
    fi
    
    # Check if Staff Pool exists, create if not
    if check_user_pool_exists "$EXISTING_STAFF_POOL_ID" "Staff User Pool"; then
        STAFF_POOL_ID=$EXISTING_STAFF_POOL_ID
        STAFF_CLIENT_ID=$EXISTING_STAFF_CLIENT_ID
        echo "♻️  Reusing existing Staff User Pool"
        
        # Save to temp config for consistency
        cat > /tmp/staff-pool-config.json << EOF
{
    "userPoolId": "$STAFF_POOL_ID",
    "clientId": "$STAFF_CLIENT_ID",
    "region": "$AWS_REGION",
    "endpoint": "$LOCALSTACK_ENDPOINT"
}
EOF
    else
        create_staff_pool
        POOLS_CREATED=true
    fi
    
    # Auto-update .env.local ONLY if we created new pools
    if [[ "$POOLS_CREATED" == "true" ]]; then
        echo ""
        echo "📝 New Cognito Pools were created, updating .env.local..."
        update_env_local
    else
        echo ""
        echo "✅ Reusing existing Cognito Pools, no .env.local update needed"
    fi
    
    # create_test_users  # Commented out - no test users during deployment
    display_pool_config
    
    echo ""
    echo "🎉 LocalStack Cognito setup completed successfully!"
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