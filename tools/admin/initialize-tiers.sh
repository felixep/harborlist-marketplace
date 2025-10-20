#!/bin/bash

# Initialize Default Tiers for HarborList
# Requires admin authentication

set -e

API_URL="${API_URL:-http://local-api.harborlist.com:3001}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@harborlist.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-oimWFx34>q%|k*KW}"

echo "🔐 Logging in as admin..."

# Login and get token
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/staff/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\"
  }")

# Extract token from response (try both possible paths)
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.tokens.accessToken // .accessToken // .token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Failed to login. Response:"
  echo "$LOGIN_RESPONSE" | jq .
  exit 1
fi

echo "✅ Login successful"
echo ""
echo "🔄 Initializing default tiers..."

# Initialize tiers with authentication
RESPONSE=$(curl -s -X POST "$API_URL/api/admin/tiers/initialize" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")

# Check if successful
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ Tiers initialized successfully!"
  echo ""
  echo "📊 Created tiers:"
  echo "$RESPONSE" | jq -r '.tiers[] | "  - \(.name) (\(.type), \(if .isPremium then "Premium" else "Free" end)): $\(.pricing.monthly)/month"'
else
  echo "❌ Failed to initialize tiers:"
  echo "$RESPONSE" | jq .
  exit 1
fi

echo ""
echo "🎉 Setup complete! You can now manage tiers at:"
echo "   http://local.harborlist.com:3000/admin/tiers"
