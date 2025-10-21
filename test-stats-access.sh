#!/bin/bash

# Test script to verify analytics data segmentation

API_URL="https://local-api.harborlist.com"

echo "========================================"
echo "Analytics Data Segmentation Test"
echo "========================================"
echo ""

# Test 1: Non-authenticated user (public)
echo "1. Testing as NON-AUTHENTICATED user (public):"
echo "   Expected: Only public marketplace stats"
echo ""
curl -sk "$API_URL/api/stats/platform" | jq '.'
echo ""
echo "----------------------------------------"
echo ""

# Test 2: Authenticated customer
echo "2. Testing as AUTHENTICATED CUSTOMER:"
echo "   Email: test-user@example.com"
echo "   Expected: Public stats + total listings + 30-day views"
echo ""

CUSTOMER_TOKEN=$(curl -sk -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test-user@example.com","password":"Password123*+"}' | jq -r '.tokens.accessToken')

if [ "$CUSTOMER_TOKEN" != "null" ] && [ -n "$CUSTOMER_TOKEN" ]; then
  echo "   ✓ Customer token obtained"
  curl -sk "$API_URL/api/stats/platform" \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" | jq '.'
else
  echo "   ✗ Failed to get customer token"
fi
echo ""
echo "----------------------------------------"
echo ""

# Test 3: Staff/Admin user
echo "3. Testing as STAFF/ADMIN user:"
echo "   Email: admin@harborlist.local"
echo "   Expected: Full analytics (users, events, conversion rates)"
echo ""

ADMIN_TOKEN=$(curl -sk -X POST "$API_URL/api/auth/staff/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@harborlist.local","password":"oimWFx34>q%|k*KW"}' | jq -r '.tokens.accessToken')

if [ "$ADMIN_TOKEN" != "null" ] && [ -n "$ADMIN_TOKEN" ]; then
  echo "   ✓ Admin token obtained"
  curl -sk "$API_URL/api/stats/platform" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
else
  echo "   ✗ Failed to get admin token"
fi

echo ""
echo "========================================"
echo "Test complete!"
echo "========================================"
