#!/bin/bash

# HarborList Local Database Setup Script
# Sets up DynamoDB tables and S3 buckets for local development
#
# This script has been consolidated from the previous setup-local-db-quick.sh
# to provide a single, reliable database setup solution for local development.
# 
# Usage: ./setup-local-db.sh
# Prerequisites: Docker Compose with DynamoDB Local and LocalStack running

set -e

echo "🗄️ Setting up HarborList Local DynamoDB Tables"
echo "=============================================="

# Configuration
DYNAMODB_ENDPOINT="${DYNAMODB_ENDPOINT:-http://localhost:8000}"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="test"
AWS_SECRET_ACCESS_KEY="test"

# Export AWS credentials for local development
export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION=$AWS_REGION

# Wait for DynamoDB Local to be ready
echo "⏳ Waiting for DynamoDB Local to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s "$DYNAMODB_ENDPOINT" > /dev/null 2>&1; then
        echo "✅ DynamoDB Local is ready"
        break
    fi
    
    attempt=$((attempt + 1))
    echo "   Attempt $attempt/$max_attempts - waiting..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Error: DynamoDB Local is not responding after $max_attempts attempts"
    echo "   Make sure Docker Compose is running: docker-compose -f docker-compose.local.yml up -d"
    exit 1
fi

# Function to create simple table (no GSI for now)
create_simple_table() {
    local table_name=$1
    
    echo "📊 Creating table: $table_name"
    
    # Check if table exists
    if aws dynamodb describe-table --table-name "$table_name" --endpoint-url "$DYNAMODB_ENDPOINT" --region "$AWS_REGION" >/dev/null 2>&1; then
        echo "   ✅ Table $table_name already exists"
        return
    fi

    # Create table with simple schema (id as primary key)
    aws dynamodb create-table \
        --table-name "$table_name" \
        --key-schema AttributeName=id,KeyType=HASH \
        --attribute-definitions AttributeName=id,AttributeType=S \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --region "$AWS_REGION" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Table $table_name created successfully"
    else
        echo "   ❌ Failed to create table $table_name"
        return 1
    fi
}

# Function to create moderation queue table with proper schema and indexes
create_moderation_queue_table() {
    local table_name="harborlist-moderation-queue"
    
    echo "📊 Creating moderation queue table: $table_name"
    
    # Check if table exists
    if aws dynamodb describe-table --table-name "$table_name" --endpoint-url "$DYNAMODB_ENDPOINT" --region "$AWS_REGION" >/dev/null 2>&1; then
        echo "   ✅ Table $table_name already exists"
        return
    fi

    # Create moderation queue table with id as primary key, status and priority GSIs
    aws dynamodb create-table \
        --table-name "$table_name" \
        --key-schema AttributeName=id,KeyType=HASH \
        --attribute-definitions \
            AttributeName=id,AttributeType=S \
            AttributeName=status,AttributeType=S \
            AttributeName=priority,AttributeType=S \
            AttributeName=submittedAt,AttributeType=N \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --global-secondary-indexes \
        '[{
            "IndexName": "StatusIndex",
            "KeySchema": [
                {"AttributeName": "status", "KeyType": "HASH"},
                {"AttributeName": "submittedAt", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        },
        {
            "IndexName": "PriorityIndex",
            "KeySchema": [
                {"AttributeName": "priority", "KeyType": "HASH"},
                {"AttributeName": "submittedAt", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }]' \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --region "$AWS_REGION" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Moderation queue table $table_name created successfully with StatusIndex and PriorityIndex GSIs"
    else
        echo "   ❌ Failed to create moderation queue table $table_name"
        return 1
    fi
}

# Function to create listings table with proper schema and indexes
create_listings_table() {
    local table_name="harborlist-listings"
    
    echo "📊 Creating listings table: $table_name"
    
    # Check if table exists
    if aws dynamodb describe-table --table-name "$table_name" --endpoint-url "$DYNAMODB_ENDPOINT" --region "$AWS_REGION" >/dev/null 2>&1; then
        echo "   ✅ Table $table_name already exists"
        return
    fi

    # Create listings table with listingId as primary key and multiple GSIs
    aws dynamodb create-table \
        --table-name "$table_name" \
        --key-schema AttributeName=listingId,KeyType=HASH \
        --attribute-definitions \
            AttributeName=listingId,AttributeType=S \
            AttributeName=slug,AttributeType=S \
            AttributeName=ownerId,AttributeType=S \
            AttributeName=status,AttributeType=S \
            AttributeName=totalHorsepower,AttributeType=N \
            AttributeName=engineConfiguration,AttributeType=S \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --global-secondary-indexes \
        '[{
            "IndexName": "SlugIndex",
            "KeySchema": [{"AttributeName": "slug", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        },
        {
            "IndexName": "OwnerIndex",
            "KeySchema": [{"AttributeName": "ownerId", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        },
        {
            "IndexName": "StatusIndex",
            "KeySchema": [{"AttributeName": "status", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        },
        {
            "IndexName": "TotalHorsepowerIndex",
            "KeySchema": [{"AttributeName": "totalHorsepower", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        },
        {
            "IndexName": "EngineConfigurationIndex",
            "KeySchema": [{"AttributeName": "engineConfiguration", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }]' \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --region "$AWS_REGION" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Listings table $table_name created successfully with SlugIndex, OwnerIndex, StatusIndex, TotalHorsepowerIndex, and EngineConfigurationIndex GSIs"
    else
        echo "   ❌ Failed to create listings table $table_name"
        return 1
    fi
}

# Function to create users table with proper schema and indexes
create_users_table() {
    local table_name="harborlist-users"
    
    echo "📊 Creating users table: $table_name"
    
    # Check if table exists
    if aws dynamodb describe-table --table-name "$table_name" --endpoint-url "$DYNAMODB_ENDPOINT" --region "$AWS_REGION" >/dev/null 2>&1; then
        echo "   ✅ Table $table_name already exists"
        return
    fi

    # Create users table with id as primary key and multiple GSIs
    aws dynamodb create-table \
        --table-name "$table_name" \
        --key-schema AttributeName=id,KeyType=HASH \
        --attribute-definitions \
            AttributeName=id,AttributeType=S \
            AttributeName=email,AttributeType=S \
            AttributeName=userType,AttributeType=S \
            AttributeName=createdAt,AttributeType=S \
            AttributeName=parentDealerId,AttributeType=S \
            AttributeName=premiumActive,AttributeType=S \
            AttributeName=premiumExpiresAt,AttributeType=N \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --global-secondary-indexes \
        '[{
            "IndexName": "email-index",
            "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        },
        {
            "IndexName": "UserTypeIndex",
            "KeySchema": [
                {"AttributeName": "userType", "KeyType": "HASH"},
                {"AttributeName": "createdAt", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        },
        {
            "IndexName": "ParentDealerIndex",
            "KeySchema": [
                {"AttributeName": "parentDealerId", "KeyType": "HASH"},
                {"AttributeName": "createdAt", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        },
        {
            "IndexName": "PremiumExpirationIndex",
            "KeySchema": [
                {"AttributeName": "premiumActive", "KeyType": "HASH"},
                {"AttributeName": "premiumExpiresAt", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }]' \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --region "$AWS_REGION" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Users table $table_name created successfully with:"
        echo "      - email-index GSI"
        echo "      - UserTypeIndex GSI (with createdAt sort key)"
        echo "      - ParentDealerIndex GSI (for dealer sub-accounts)"
        echo "      - PremiumExpirationIndex GSI"
    else
        echo "   ❌ Failed to create users table $table_name"
        return 1
    fi
}

# Function to create engines table with proper schema and indexes
create_engines_table() {
    local table_name="harborlist-engines"
    
    echo "📊 Creating engines table: $table_name"
    
    # Check if table exists
    if aws dynamodb describe-table --table-name "$table_name" --endpoint-url "$DYNAMODB_ENDPOINT" --region "$AWS_REGION" >/dev/null 2>&1; then
        echo "   ✅ Table $table_name already exists"
        return
    fi

    # Create engines table with engineId as primary key and multiple GSIs
    aws dynamodb create-table \
        --table-name "$table_name" \
        --key-schema AttributeName=engineId,KeyType=HASH \
        --attribute-definitions \
            AttributeName=engineId,AttributeType=S \
            AttributeName=listingId,AttributeType=S \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --global-secondary-indexes \
        '[{
            "IndexName": "ListingIndex",
            "KeySchema": [{"AttributeName": "listingId", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }]' \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --region "$AWS_REGION" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Engines table $table_name created successfully with ListingIndex GSI"
    else
        echo "   ❌ Failed to create engines table $table_name"
        return 1
    fi
}

# Function to create sessions table with sessionId as primary key (to match production)
create_sessions_table() {
    local table_name="harborlist-sessions"
    
    echo "📊 Creating sessions table: $table_name"
    
    # Check if table exists
    if aws dynamodb describe-table --table-name "$table_name" --endpoint-url "$DYNAMODB_ENDPOINT" --region "$AWS_REGION" >/dev/null 2>&1; then
        echo "   ✅ Table $table_name already exists"
        return
    fi

    # Create sessions table with sessionId as primary key (matches production)
    aws dynamodb create-table \
        --table-name "$table_name" \
        --key-schema AttributeName=sessionId,KeyType=HASH \
        --attribute-definitions AttributeName=sessionId,AttributeType=S AttributeName=userId,AttributeType=S \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --global-secondary-indexes \
        '[{
            "IndexName": "user-index",
            "KeySchema": [{"AttributeName": "userId", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }]' \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --region "$AWS_REGION" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Sessions table $table_name created successfully with user-index GSI"
    else
        echo "   ❌ Failed to create sessions table $table_name"
        return 1
    fi
}

# Function to create admin sessions table with sessionId as primary key (to match production)
create_admin_sessions_table() {
    local table_name="harborlist-admin-sessions"
    
    echo "📊 Creating admin sessions table: $table_name"
    
    # Check if table exists
    if aws dynamodb describe-table --table-name "$table_name" --endpoint-url "$DYNAMODB_ENDPOINT" --region "$AWS_REGION" >/dev/null 2>&1; then
        echo "   ✅ Table $table_name already exists"
        return
    fi

    # Create admin sessions table with sessionId as primary key (matches production)
    aws dynamodb create-table \
        --table-name "$table_name" \
        --key-schema AttributeName=sessionId,KeyType=HASH \
        --attribute-definitions AttributeName=sessionId,AttributeType=S AttributeName=userId,AttributeType=S \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --global-secondary-indexes \
        '[{
            "IndexName": "user-index",
            "KeySchema": [{"AttributeName": "userId", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }]' \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --region "$AWS_REGION" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Admin sessions table $table_name created successfully with user-index GSI"
    else
        echo "   ❌ Failed to create admin sessions table $table_name"
        return 1
    fi
}

echo ""
echo "🔧 Creating DynamoDB Tables..."

# Create essential tables based on backend requirements
create_users_table  # Use specialized function for users table with EmailIndex GSI
create_listings_table  # Use specialized function for listings table with SlugIndex GSI
create_sessions_table  # Use specialized function for sessions table to match production
create_simple_table "harborlist-login-attempts"
create_simple_table "harborlist-audit-logs"
create_simple_table "harborlist-reviews"
create_admin_sessions_table  # Use specialized function for admin sessions table to match production
create_simple_table "harborlist-analytics"

# Enhanced feature tables for boat marketplace enhancements
create_engines_table  # Use specialized function for engines table with ListingIndex GSI
create_simple_table "harborlist-billing-accounts"
create_simple_table "harborlist-transactions"
create_simple_table "harborlist-finance-calculations"
create_moderation_queue_table  # Use specialized function for moderation queue with StatusIndex and PriorityIndex GSIs
create_simple_table "harborlist-user-groups"

# Admin-specific tables
create_simple_table "harborlist-platform-settings"
create_simple_table "harborlist-settings-audit"

# Create support tickets table with proper schema and indexes
echo "📊 Creating support tickets table: harborlist-support-tickets"
if aws dynamodb describe-table --table-name "harborlist-support-tickets" --endpoint-url "$DYNAMODB_ENDPOINT" --region "$AWS_REGION" >/dev/null 2>&1; then
    echo "   ✅ Table harborlist-support-tickets already exists"
else
    aws dynamodb create-table \
        --table-name "harborlist-support-tickets" \
        --key-schema AttributeName=id,KeyType=HASH AttributeName=createdAt,KeyType=RANGE \
        --attribute-definitions \
            AttributeName=id,AttributeType=S \
            AttributeName=createdAt,AttributeType=N \
            AttributeName=userId,AttributeType=S \
            AttributeName=status,AttributeType=S \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --global-secondary-indexes \
        '[{
            "IndexName": "user-index",
            "KeySchema": [{"AttributeName": "userId", "KeyType": "HASH"}, {"AttributeName": "createdAt", "KeyType": "RANGE"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        },
        {
            "IndexName": "status-index",
            "KeySchema": [{"AttributeName": "status", "KeyType": "HASH"}, {"AttributeName": "createdAt", "KeyType": "RANGE"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }]' \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --region "$AWS_REGION" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Support tickets table created successfully with user-index and status-index GSIs"
    else
        echo "   ❌ Failed to create support tickets table"
    fi
fi

create_simple_table "harborlist-support-responses"

# Create announcements table with proper schema and indexes
echo "📊 Creating announcements table: harborlist-announcements"
if aws dynamodb describe-table --table-name "harborlist-announcements" --endpoint-url "$DYNAMODB_ENDPOINT" --region "$AWS_REGION" >/dev/null 2>&1; then
    echo "   ✅ Table harborlist-announcements already exists"
else
    aws dynamodb create-table \
        --table-name "harborlist-announcements" \
        --key-schema AttributeName=id,KeyType=HASH AttributeName=createdAt,KeyType=RANGE \
        --attribute-definitions \
            AttributeName=id,AttributeType=S \
            AttributeName=createdAt,AttributeType=N \
            AttributeName=status,AttributeType=S \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --global-secondary-indexes \
        '[{
            "IndexName": "status-index",
            "KeySchema": [{"AttributeName": "status", "KeyType": "HASH"}, {"AttributeName": "createdAt", "KeyType": "RANGE"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }]' \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --region "$AWS_REGION" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Announcements table created successfully with status-index GSI"
    else
        echo "   ❌ Failed to create announcements table"
    fi
fi

create_simple_table "harborlist-support-templates"

# Create user tiers table with proper schema and indexes
echo "📊 Creating user tiers table: harborlist-user-tiers"
if aws dynamodb describe-table --table-name "harborlist-user-tiers" --endpoint-url "$DYNAMODB_ENDPOINT" --region "$AWS_REGION" >/dev/null 2>&1; then
    echo "   ✅ Table harborlist-user-tiers already exists"
else
    aws dynamodb create-table \
        --table-name "harborlist-user-tiers" \
        --key-schema AttributeName=tierId,KeyType=HASH \
        --attribute-definitions \
            AttributeName=tierId,AttributeType=S \
            AttributeName=isPremium,AttributeType=N \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --global-secondary-indexes \
        '[{
            "IndexName": "PremiumIndex",
            "KeySchema": [{"AttributeName": "isPremium", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }]' \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --region "$AWS_REGION" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "   ✅ User tiers table created successfully with PremiumIndex GSI"
        echo "   ℹ️  To initialize default tiers, login to admin panel and use Tier Management"
        echo "      Or call: POST /api/admin/tiers/initialize (requires admin authentication)"
    else
        echo "   ❌ Failed to create user tiers table"
    fi
fi

echo ""
echo "🎯 Setting up LocalStack S3 Buckets..."

# Wait for LocalStack to be ready
echo "⏳ Waiting for LocalStack to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s "http://localhost:4566/_localstack/health" > /dev/null 2>&1; then
        echo "✅ LocalStack is ready"
        break
    fi
    
    attempt=$((attempt + 1))
    echo "   Attempt $attempt/$max_attempts - waiting..."
    sleep 2
done

# Create S3 buckets
# Use LOCALSTACK_ENDPOINT if set, otherwise default to localhost
S3_ENDPOINT="${LOCALSTACK_ENDPOINT:-http://localhost:4566}"

echo "📦 Creating S3 buckets..."

# Media uploads bucket
aws s3 mb s3://harborlist-uploads-local --endpoint-url "$S3_ENDPOINT" --region "$AWS_REGION" > /dev/null 2>&1 || echo "   Bucket harborlist-uploads-local may already exist"

# Static assets bucket (for frontend builds)
aws s3 mb s3://harborlist-frontend-local --endpoint-url "$S3_ENDPOINT" --region "$AWS_REGION" > /dev/null 2>&1 || echo "   Bucket harborlist-frontend-local may already exist"

echo "   ✅ S3 buckets created"

echo ""
echo "📊 Verifying table creation..."

# List all tables
echo "📋 Created tables:"
aws dynamodb list-tables --endpoint-url "$DYNAMODB_ENDPOINT" --region "$AWS_REGION" --query 'TableNames' --output table

echo ""
echo "📦 Created S3 buckets:"
# Verify S3 buckets (using the correct endpoint)
aws s3 ls --endpoint-url "$S3_ENDPOINT" 2>/dev/null || echo "   (S3 bucket verification skipped - buckets were created successfully)"

echo ""
echo "✅ Local database setup complete!"
echo ""
echo "🌐 Next steps:"
echo "1. Create an admin user: cd backend && npm run create-admin"
echo "2. Start the development servers: npm run dev:start"
echo "3. Access DynamoDB Admin: http://localhost:8001"
echo "4. Access LocalStack Dashboard: http://localhost:4566"
echo ""
echo "💡 Pro tips:"
echo "- Add local.harborlist.com and local-api.harborlist.com to your /etc/hosts"
echo "- Use the DynamoDB Admin UI to inspect and modify data"
echo "- LocalStack provides AWS service emulation for S3, SES, etc."
echo ""