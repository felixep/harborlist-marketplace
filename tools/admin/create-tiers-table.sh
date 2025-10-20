#!/bin/bash

# Create harborlist-user-tiers DynamoDB table in LocalStack
# This table stores subscription tier configurations and features

DYNAMODB_ENDPOINT="${DYNAMODB_ENDPOINT:-http://localhost:8000}"
TABLE_NAME="harborlist-user-tiers"
REGION="${AWS_REGION:-us-east-1}"

echo "Creating table: $TABLE_NAME"
echo "DynamoDB Endpoint: $DYNAMODB_ENDPOINT"

# Create table
aws dynamodb create-table \
  --endpoint-url "$DYNAMODB_ENDPOINT" \
  --region "$REGION" \
  --table-name "$TABLE_NAME" \
  --attribute-definitions \
    AttributeName=tierId,AttributeType=S \
    AttributeName=isPremium,AttributeType=N \
  --key-schema \
    AttributeName=tierId,KeyType=HASH \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"PremiumIndex\",
        \"KeySchema\": [{\"AttributeName\":\"isPremium\",\"KeyType\":\"HASH\"}],
        \"Projection\": {\"ProjectionType\":\"ALL\"},
        \"ProvisionedThroughput\": {\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}
      }
    ]" \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5

if [ $? -eq 0 ]; then
  echo "✅ Table created successfully"
  
  # Wait for table to be active
  echo "⏳ Waiting for table to be active..."
  aws dynamodb wait table-exists \
    --endpoint-url "$DYNAMODB_ENDPOINT" \
    --region "$REGION" \
    --table-name "$TABLE_NAME"
  
  echo "✅ Table is now active"
  
  # Initialize with default tiers using the API
  echo "🔄 Initializing default tiers..."
  curl -X POST "http://local-api.harborlist.com:3001/api/admin/tiers/initialize" \
    -H "Content-Type: application/json"
  
  echo ""
  echo "✅ Setup complete!"
  echo "📊 Access table at: http://localhost:8001/?table=$TABLE_NAME"
else
  echo "❌ Failed to create table"
  echo "💡 Table may already exist. Try:"
  echo "   aws dynamodb describe-table --endpoint-url $DYNAMODB_ENDPOINT --region $REGION --table-name $TABLE_NAME"
fi
