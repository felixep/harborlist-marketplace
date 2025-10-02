#!/bin/bash

# HarborList Local Database Setup Script
# Sets up DynamoDB tables for local development

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

# Function to create table if it doesn't exist
create_table_if_not_exists() {
    local table_name=$1
    local key_schema=$2
    local attribute_definitions=$3
    local provisioned_throughput=${4:-"ReadCapacityUnits=5,WriteCapacityUnits=5"}
    local global_secondary_indexes=$5

    echo "📊 Creating table: $table_name"
    
    # Check if table exists
    if aws dynamodb describe-table --table-name "$table_name" --endpoint-url "$DYNAMODB_ENDPOINT" --region "$AWS_REGION" > /dev/null 2>&1; then
        echo "   ✅ Table $table_name already exists"
        return
    fi

    # Build the create-table command
    local cmd="aws dynamodb create-table \
        --table-name $table_name \
        --key-schema $key_schema \
        --attribute-definitions $attribute_definitions \
        --provisioned-throughput $provisioned_throughput \
        --endpoint-url $DYNAMODB_ENDPOINT \
        --region $AWS_REGION"

    # Add GSI if provided
    if [ -n "$global_secondary_indexes" ]; then
        cmd="$cmd --global-secondary-indexes $global_secondary_indexes"
    fi

    # Execute command
    eval $cmd > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Table $table_name created successfully"
    else
        echo "   ❌ Failed to create table $table_name"
        return 1
    fi
}

echo ""
echo "🔧 Creating DynamoDB Tables..."

# Users table
create_table_if_not_exists \
    "boat-users" \
    "AttributeName=id,KeyType=HASH" \
    "AttributeName=id,AttributeType=S AttributeName=email,AttributeType=S AttributeName=role,AttributeType=S" \
    "ReadCapacityUnits=5,WriteCapacityUnits=5" \
    '[
        {
            "IndexName": "EmailIndex",
            "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        },
        {
            "IndexName": "RoleIndex", 
            "KeySchema": [{"AttributeName": "role", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }
    ]'

# Listings table
create_table_if_not_exists \
    "boat-listings" \
    "AttributeName=id,KeyType=HASH" \
    "AttributeName=id,AttributeType=S AttributeName=userId,AttributeType=S AttributeName=status,AttributeType=S AttributeName=createdAt,AttributeType=S" \
    "ReadCapacityUnits=5,WriteCapacityUnits=5" \
    '[
        {
            "IndexName": "UserIndex",
            "KeySchema": [{"AttributeName": "userId", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        },
        {
            "IndexName": "StatusIndex",
            "KeySchema": [{"AttributeName": "status", "KeyType": "HASH"}, {"AttributeName": "createdAt", "KeyType": "RANGE"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }
    ]'

# Sessions table (for JWT blacklist/session management)
create_table_if_not_exists \
    "boat-sessions" \
    "AttributeName=id,KeyType=HASH" \
    "AttributeName=id,AttributeType=S AttributeName=userId,AttributeType=S" \
    "ReadCapacityUnits=5,WriteCapacityUnits=5" \
    '[
        {
            "IndexName": "UserIndex",
            "KeySchema": [{"AttributeName": "userId", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }
    ]'

# Analytics/Stats table
create_table_if_not_exists \
    "boat-analytics" \
    "AttributeName=id,KeyType=HASH" \
    "AttributeName=id,AttributeType=S AttributeName=date,AttributeType=S AttributeName=type,AttributeType=S" \
    "ReadCapacityUnits=5,WriteCapacityUnits=5" \
    '[
        {
            "IndexName": "DateIndex",
            "KeySchema": [{"AttributeName": "date", "KeyType": "HASH"}, {"AttributeName": "type", "KeyType": "RANGE"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }
    ]'

# Admin audit logs table
create_table_if_not_exists \
    "boat-audit-logs" \
    "AttributeName=id,KeyType=HASH" \
    "AttributeName=id,AttributeType=S AttributeName=adminId,AttributeType=S AttributeName=timestamp,AttributeType=S" \
    "ReadCapacityUnits=5,WriteCapacityUnits=5" \
    '[
        {
            "IndexName": "AdminIndex",
            "KeySchema": [{"AttributeName": "adminId", "KeyType": "HASH"}, {"AttributeName": "timestamp", "KeyType": "RANGE"}],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }
    ]'

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