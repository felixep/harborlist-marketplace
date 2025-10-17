#!/bin/bash

# Setup script for LocalStack DynamoDB tables
# This script initializes all required DynamoDB tables for local development

set -e

echo "🗄️  Setting up LocalStack DynamoDB tables for HarborList..."

# LocalStack endpoint - use service name when running in Docker Compose
LOCALSTACK_ENDPOINT="${LOCALSTACK_ENDPOINT:-http://localstack:4566}"
DYNAMODB_ENDPOINT="${DYNAMODB_ENDPOINT:-http://dynamodb-local:8000}"
AWS_REGION="us-east-1"

# Configure AWS CLI for LocalStack
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_DEFAULT_REGION="us-east-1"

# Function to check if DynamoDB is running
check_dynamodb() {
    echo "🔍 Checking if DynamoDB is running..."
    if ! curl -s "$DYNAMODB_ENDPOINT" > /dev/null; then
        echo "❌ DynamoDB is not running. Please start DynamoDB first."
        exit 1
    fi
    echo "✅ DynamoDB is running"
}

# Function to create table if it doesn't exist
create_table_if_not_exists() {
    local table_name=$1
    local key_schema=$2
    local attribute_definitions=$3
    local billing_mode=${4:-PAY_PER_REQUEST}
    
    echo "📋 Creating table: $table_name"
    
    # Check if table exists
    if aws dynamodb describe-table --endpoint-url="$DYNAMODB_ENDPOINT" --table-name "$table_name" >/dev/null 2>&1; then
        echo "✅ Table $table_name already exists"
        return 0
    fi
    
    # Create table
    aws dynamodb create-table \
        --endpoint-url="$DYNAMODB_ENDPOINT" \
        --table-name "$table_name" \
        --key-schema "$key_schema" \
        --attribute-definitions "$attribute_definitions" \
        --billing-mode "$billing_mode" \
        --region "$AWS_REGION" >/dev/null
    
    echo "✅ Table $table_name created successfully"
}

# Function to create all required tables
create_tables() {
    echo "🏗️  Creating DynamoDB tables..."
    
    # Core tables
    create_table_if_not_exists "harborlist-users" \
        "AttributeName=id,KeyType=HASH" \
        "AttributeName=id,AttributeType=S"
    
    create_table_if_not_exists "harborlist-listings" \
        "AttributeName=id,KeyType=HASH" \
        "AttributeName=id,AttributeType=S"
    
    create_table_if_not_exists "harborlist-reviews" \
        "AttributeName=id,KeyType=HASH" \
        "AttributeName=id,AttributeType=S"
    
    create_table_if_not_exists "harborlist-sessions" \
        "AttributeName=sessionId,KeyType=HASH" \
        "AttributeName=sessionId,AttributeType=S"
    
    create_table_if_not_exists "harborlist-login-attempts" \
        "AttributeName=id,KeyType=HASH" \
        "AttributeName=id,AttributeType=S"
    
    create_table_if_not_exists "harborlist-audit-logs" \
        "AttributeName=id,KeyType=HASH" \
        "AttributeName=id,AttributeType=S"
    
    # Enhanced feature tables
    create_table_if_not_exists "harborlist-engines" \
        "AttributeName=id,KeyType=HASH" \
        "AttributeName=id,AttributeType=S"
    
    create_table_if_not_exists "harborlist-billing-accounts" \
        "AttributeName=userId,KeyType=HASH" \
        "AttributeName=userId,AttributeType=S"
    
    create_table_if_not_exists "harborlist-transactions" \
        "AttributeName=id,KeyType=HASH" \
        "AttributeName=id,AttributeType=S"
    
    create_table_if_not_exists "harborlist-finance-calculations" \
        "AttributeName=id,KeyType=HASH" \
        "AttributeName=id,AttributeType=S"
    
    create_table_if_not_exists "harborlist-moderation-queue" \
        "AttributeName=id,KeyType=HASH" \
        "AttributeName=id,AttributeType=S"
    
    create_table_if_not_exists "harborlist-user-groups" \
        "AttributeName=id,KeyType=HASH" \
        "AttributeName=id,AttributeType=S"
    
    echo "✅ All DynamoDB tables created successfully"
}

# Main execution
main() {
    echo "🏗️  HarborList LocalStack DynamoDB Setup"
    echo "======================================="
    
    check_dynamodb
    create_tables
    
    echo ""
    echo "🎉 LocalStack DynamoDB setup completed successfully!"
    echo ""
    echo "📋 Tables created:"
    echo "  ✅ Core tables (users, listings, reviews, sessions, etc.)"
    echo "  ✅ Enhanced feature tables (billing, finance, moderation, etc.)"
    echo ""
    echo "🚀 DynamoDB is ready for local development!"
}

# Run main function
main "$@"