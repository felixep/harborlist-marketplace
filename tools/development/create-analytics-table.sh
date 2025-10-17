#!/bin/bash

# Create Analytics Events Table for tracking user behavior
# This table stores all user interactions: views, clicks, searches, etc.

set -e

DYNAMODB_ENDPOINT="http://localhost:8000"
AWS_REGION="us-east-1"
TABLE_NAME="harborlist-analytics-events"

export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_DEFAULT_REGION=$AWS_REGION

echo "📊 Creating Analytics Events Table: $TABLE_NAME"

# Check if table exists
if aws dynamodb describe-table --table-name "$TABLE_NAME" --endpoint-url "$DYNAMODB_ENDPOINT" --region "$AWS_REGION" >/dev/null 2>&1; then
    echo "✅ Table $TABLE_NAME already exists"
    exit 0
fi

# Create analytics events table
# Structure:
# - eventId (PK): Unique event identifier
# - timestamp (Sort Key via GSI): When the event occurred
# - eventType: VIEW, CLICK, SEARCH, CONTACT, SHARE, FAVORITE, etc.
# - userId: Customer ID (if authenticated)
# - sessionId: Anonymous session ID (for non-authenticated users)
# - listingId: Related listing (if applicable)
# - metadata: Additional context (search terms, referrer, device info, etc.)

aws dynamodb create-table \
    --table-name "$TABLE_NAME" \
    --key-schema AttributeName=eventId,KeyType=HASH \
    --attribute-definitions \
        AttributeName=eventId,AttributeType=S \
        AttributeName=timestamp,AttributeType=S \
        AttributeName=eventType,AttributeType=S \
        AttributeName=listingId,AttributeType=S \
        AttributeName=userId,AttributeType=S \
    --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=10 \
    --global-secondary-indexes \
        '[
            {
                "IndexName": "TimestampIndex",
                "KeySchema": [
                    {"AttributeName": "timestamp", "KeyType": "HASH"}
                ],
                "Projection": {"ProjectionType": "ALL"},
                "ProvisionedThroughput": {
                    "ReadCapacityUnits": 5,
                    "WriteCapacityUnits": 5
                }
            },
            {
                "IndexName": "ListingEventsIndex",
                "KeySchema": [
                    {"AttributeName": "listingId", "KeyType": "HASH"},
                    {"AttributeName": "timestamp", "KeyType": "RANGE"}
                ],
                "Projection": {"ProjectionType": "ALL"},
                "ProvisionedThroughput": {
                    "ReadCapacityUnits": 5,
                    "WriteCapacityUnits": 5
                }
            },
            {
                "IndexName": "UserEventsIndex",
                "KeySchema": [
                    {"AttributeName": "userId", "KeyType": "HASH"},
                    {"AttributeName": "timestamp", "KeyType": "RANGE"}
                ],
                "Projection": {"ProjectionType": "ALL"},
                "ProvisionedThroughput": {
                    "ReadCapacityUnits": 5,
                    "WriteCapacityUnits": 5
                }
            },
            {
                "IndexName": "EventTypeIndex",
                "KeySchema": [
                    {"AttributeName": "eventType", "KeyType": "HASH"},
                    {"AttributeName": "timestamp", "KeyType": "RANGE"}
                ],
                "Projection": {"ProjectionType": "ALL"},
                "ProvisionedThroughput": {
                    "ReadCapacityUnits": 5,
                    "WriteCapacityUnits": 5
                }
            }
        ]' \
    --endpoint-url "$DYNAMODB_ENDPOINT" \
    --region "$AWS_REGION"

echo "✅ Analytics Events Table created successfully"
echo ""
echo "Table supports tracking:"
echo "  - Listing views (authenticated & anonymous)"
echo "  - Listing clicks (card clicks, image views)"
echo "  - Search queries"
echo "  - Contact seller actions"
echo "  - Favorites/bookmarks"
echo "  - Share actions"
echo "  - Filter usage"
echo "  - Time spent on listings"
echo ""
echo "Indexes created:"
echo "  - TimestampIndex: Query events by time range"
echo "  - ListingEventsIndex: Get all events for a listing"
echo "  - UserEventsIndex: Get all events for a user"
echo "  - EventTypeIndex: Query by event type"
