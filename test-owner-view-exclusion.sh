#!/bin/bash

# Test script to verify that owner views are excluded from analytics

API_URL="https://local-api.harborlist.com"

echo "========================================"
echo "Owner View Exclusion Test"
echo "========================================"
echo ""

# Get a test user token (listing owner)
echo "1. Logging in as test user (listing owner)..."
OWNER_TOKEN=$(curl -sk -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test-user@example.com","password":"Password123*+"}' | jq -r '.tokens.accessToken')

if [ "$OWNER_TOKEN" = "null" ] || [ -z "$OWNER_TOKEN" ]; then
  echo "   ✗ Failed to get owner token"
  exit 1
fi

echo "   ✓ Owner token obtained"
echo ""

# Get the owner's listing
echo "2. Fetching owner's listings..."
LISTING_ID=$(curl -sk "$API_URL/api/listings" \
  -H "Authorization: Bearer $OWNER_TOKEN" | jq -r '.listings[0].listingId')

if [ "$LISTING_ID" = "null" ] || [ -z "$LISTING_ID" ]; then
  echo "   ✗ No listings found for this user"
  exit 1
fi

echo "   ✓ Found listing: $LISTING_ID"
echo ""

# Test 1: Owner viewing their own listing (should NOT be tracked)
echo "3. Testing OWNER view (should NOT be tracked)..."
OWNER_VIEW_RESULT=$(curl -sk -X POST "$API_URL/api/analytics/track" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -d "{\"eventType\":\"LISTING_VIEW\",\"listingId\":\"$LISTING_ID\"}")

echo "   Response: $OWNER_VIEW_RESULT" | jq '.'
if echo "$OWNER_VIEW_RESULT" | jq -e '.ownerView == true' > /dev/null; then
  echo "   ✅ PASS: Owner view correctly NOT tracked"
else
  echo "   ❌ FAIL: Owner view was tracked (should be excluded)"
fi
echo ""

# Get a different user token
echo "4. Getting token for a different user (not owner)..."
# Create a new customer for testing
curl -sk -X POST "$API_URL/api/auth/customer/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"viewer@example.com",
    "password":"Password123*+",
    "name":"Test Viewer",
    "customerType":"individual"
  }' > /dev/null 2>&1

# Try to login
VIEWER_TOKEN=$(curl -sk -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@example.com","password":"Password123*+"}' | jq -r '.tokens.accessToken')

if [ "$VIEWER_TOKEN" = "null" ] || [ -z "$VIEWER_TOKEN" ]; then
  echo "   ⚠️  Could not get viewer token (user may need email confirmation)"
  echo "   Skipping non-owner view test"
else
  echo "   ✓ Viewer token obtained"
  echo ""

  # Test 2: Non-owner viewing listing (SHOULD be tracked)
  echo "5. Testing NON-OWNER view (SHOULD be tracked)..."
  VIEWER_RESULT=$(curl -sk -X POST "$API_URL/api/analytics/track" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $VIEWER_TOKEN" \
    -d "{\"eventType\":\"LISTING_VIEW\",\"listingId\":\"$LISTING_ID\"}")

  echo "   Response: $VIEWER_RESULT" | jq '.'
  if echo "$VIEWER_RESULT" | jq -e '.success == true and (.ownerView == false or .ownerView == null)' > /dev/null; then
    echo "   ✅ PASS: Non-owner view correctly tracked"
  else
    echo "   ❌ FAIL: Non-owner view was not tracked properly"
  fi
  echo ""
fi

# Test 3: Anonymous viewing (SHOULD be tracked)
echo "6. Testing ANONYMOUS view (SHOULD be tracked)..."
ANON_RESULT=$(curl -sk -X POST "$API_URL/api/analytics/track" \
  -H "Content-Type: application/json" \
  -d "{\"eventType\":\"LISTING_VIEW\",\"listingId\":\"$LISTING_ID\"}")

echo "   Response: $ANON_RESULT" | jq '.'
if echo "$ANON_RESULT" | jq -e '.success == true and .eventId' > /dev/null; then
  echo "   ✅ PASS: Anonymous view correctly tracked"
else
  echo "   ❌ FAIL: Anonymous view was not tracked"
fi

echo ""
echo "========================================"
echo "Test complete!"
echo "========================================"
