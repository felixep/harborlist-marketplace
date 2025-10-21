#!/bin/bash

echo "🗑️  Deleting all listings from database..."

# Get all listing IDs
LISTING_IDS=$(docker-compose -f docker-compose.application.yml -f docker-compose.infrastructure.yml exec -T localstack \
  awslocal dynamodb scan \
    --table-name HarborListListings \
    --projection-expression "listingId" \
    --output json 2>/dev/null | jq -r '.Items[].listingId.S')

if [ -z "$LISTING_IDS" ]; then
  echo "ℹ️  No listings found in database"
  exit 0
fi

# Count listings
COUNT=$(echo "$LISTING_IDS" | wc -l | tr -d ' ')
echo "📊 Found $COUNT listing(s) to delete"

# Delete each listing
echo "$LISTING_IDS" | while read -r listing_id; do
  if [ ! -z "$listing_id" ]; then
    echo "  Deleting: $listing_id"
    docker-compose -f docker-compose.application.yml -f docker-compose.infrastructure.yml exec -T localstack \
      awslocal dynamodb delete-item \
        --table-name HarborListListings \
        --key "{\"listingId\": {\"S\": \"$listing_id\"}}" 2>/dev/null
  fi
done

echo "✅ All listings deleted successfully!"
echo ""
echo "🎯 Next steps:"
echo "   1. Go to: http://local.harborlist.com:3000"
echo "   2. Login as a regular user"
echo "   3. Create a new boat listing"
echo "   4. Login as admin and check Content Moderation"
