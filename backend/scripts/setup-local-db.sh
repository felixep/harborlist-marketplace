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
DYNAMODB_ENDPOINT="http://localhost:8000"
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

# Function to create listings table with proper schema and indexes
create_listings_table() {
    local table_name="harborlist-listings"
    
    echo "📊 Creating listings table: $table_name"
    
    # Check if table exists
    if aws dynamodb describe-table --table-name "$table_name" --endpoint-url "$DYNAMODB_ENDPOINT" --region "$AWS_REGION" >/dev/null 2>&1; then
        echo "   ✅ Table $table_name already exists"
        return
    fi

    # Create listings table with listingId as primary key and slug GSI
    aws dynamodb create-table \
        --table-name "$table_name" \
        --key-schema AttributeName=listingId,KeyType=HASH \
        --attribute-definitions \
            AttributeName=listingId,AttributeType=S \
            AttributeName=slug,AttributeType=S \
            AttributeName=ownerId,AttributeType=S \
            AttributeName=status,AttributeType=S \
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
        }]' \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --region "$AWS_REGION" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Listings table $table_name created successfully with SlugIndex, OwnerIndex, and StatusIndex GSIs"
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

    # Create users table with id as primary key and email GSI
    aws dynamodb create-table \
        --table-name "$table_name" \
        --key-schema AttributeName=id,KeyType=HASH \
        --attribute-definitions \
            AttributeName=id,AttributeType=S \
            AttributeName=email,AttributeType=S \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --global-secondary-indexes \
        '[{
            "IndexName": "email-index",
            "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }]' \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --region "$AWS_REGION" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Users table $table_name created successfully with email-index GSI"
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

    # Create engines table with engineId as primary key and listingId GSI
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
create_simple_table "harborlist-moderation-queue"
create_simple_table "harborlist-user-groups"

# Admin-specific tables
create_simple_table "harborlist-platform-settings"
create_simple_table "harborlist-settings-audit"
create_simple_table "harborlist-support-tickets"
create_simple_table "harborlist-support-responses"
create_simple_table "harborlist-announcements"
create_simple_table "harborlist-support-templates"

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
S3_ENDPOINT="http://localhost:4566"

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
aws s3 ls --endpoint-url "$S3_ENDPOINT"

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