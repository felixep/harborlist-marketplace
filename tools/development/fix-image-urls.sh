#!/bin/bash

# Fix Image URLs in Existing Listings
# Updates s3.local.harborlist.com URLs to localhost:4566 URLs

echo "🔍 Fixing image URLs in existing listings..."
echo ""

# Get all listings
LISTINGS=$(aws --endpoint-url=http://localhost:8000 dynamodb scan \
  --table-name harborlist-listings \
  --output json)

# Count total listings
TOTAL=$(echo "$LISTINGS" | jq '.Items | length')
echo "Found $TOTAL total listings"
echo ""

UPDATED=0

# Process each listing
for row in $(echo "$LISTINGS" | jq -r '.Items[] | @base64'); do
  _jq() {
    echo "${row}" | base64 --decode | jq -r "${1}"
  }
  
  LISTING_ID=$(_jq '.listingId.S')
  TITLE=$(_jq '.title.S // "Untitled"')
  
  # Check if images contain s3.local.harborlist.com
  HAS_OLD_URLS=$(echo "${row}" | base64 --decode | jq -r '.images.L[]?.S // empty' | grep -c "s3.local.harborlist.com" || echo "0")
  
  if [ "$HAS_OLD_URLS" -gt 0 ]; then
    echo "📝 Updating listing: $LISTING_ID - \"$TITLE\""
    
    # Get current images and thumbnails
    IMAGES=$(echo "${row}" | base64 --decode | jq -r '.images.L[]?.S // empty' | sed 's|https://s3.local.harborlist.com/|http://localhost:4566/|g')
    THUMBNAILS=$(echo "${row}" | base64 --decode | jq -r '.thumbnails.L[]?.S // empty' | sed 's|https://s3.local.harborlist.com/|http://localhost:4566/|g')
    
    # Build JSON arrays
    IMAGES_JSON=$(echo "$IMAGES" | jq -R . | jq -s .)
    THUMBNAILS_JSON=$(echo "$THUMBNAILS" | jq -R . | jq -s .)
    
    # Update the listing
    aws --endpoint-url=http://localhost:8000 dynamodb update-item \
      --table-name harborlist-listings \
      --key "{\"listingId\": {\"S\": \"$LISTING_ID\"}}" \
      --update-expression "SET images = :images, thumbnails = :thumbnails, updatedAt = :updatedAt" \
      --expression-attribute-values "{
        \":images\": {\"L\": $(echo "$IMAGES_JSON" | jq -c '[.[] | {S: .}]')},
        \":thumbnails\": {\"L\": $(echo "$THUMBNAILS_JSON" | jq -c '[.[] | {S: .}]')},
        \":updatedAt\": {\"N\": \"$(date +%s)000\"}
      }" > /dev/null 2>&1
    
    echo "   ✅ Updated successfully"
    UPDATED=$((UPDATED + 1))
  fi
done

echo ""
echo "✨ Migration complete!"
echo "   Updated $UPDATED listing(s)"
echo "   $((TOTAL - UPDATED)) listing(s) were already correct"
echo ""
echo "🔄 Now refresh your browser to see the images!"
