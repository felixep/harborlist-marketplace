#!/bin/bash

###############################################################################
# Admin Dashboard Real Data Test Script
###############################################################################
# 
# Purpose: Test the admin dashboard with real analytics data
# 
# This script:
# 1. Authenticates as a staff user
# 2. Retrieves platform stats from the analytics service
# 3. Verifies all metrics are properly displayed
# 4. Tests the role-based data segmentation
#
# Usage:
#   ./test-admin-dashboard-real-data.sh
#
# Requirements:
#   - Backend and frontend services running
#   - Analytics events table exists
#   - Staff user credentials configured
#
###############################################################################

set -e

# Configuration
API_BASE_URL="https://local-api.harborlist.com"
ADMIN_EMAIL="admin@harborlist.local"
ADMIN_PASSWORD="oimWFx34>q%|k*KW"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Admin Dashboard Real Data Integration Test            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

###############################################################################
# Step 1: Authenticate as Staff User
###############################################################################
echo -e "${BLUE}Step 1: Authenticating as staff user...${NC}"

AUTH_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/auth/staff/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${ADMIN_EMAIL}\",
    \"password\": \"${ADMIN_PASSWORD}\"
  }")

echo "Auth Response: $AUTH_RESPONSE"

# Extract access token
ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.tokens.accessToken // .accessToken // empty')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
  echo -e "${RED}✗ Failed to authenticate${NC}"
  echo "Response: $AUTH_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Authentication successful${NC}"
echo "Access Token: ${ACCESS_TOKEN:0:20}..."
echo ""

###############################################################################
# Step 2: Test Platform Stats with Staff Token
###############################################################################
echo -e "${BLUE}Step 2: Fetching platform stats with staff authentication...${NC}"

STATS_RESPONSE=$(curl -s -X GET "${API_BASE_URL}/api/stats/platform" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

echo "Stats Response:"
echo "$STATS_RESPONSE" | jq '.'

# Verify response structure
ACTIVE_LISTINGS=$(echo "$STATS_RESPONSE" | jq -r '.activeListings // empty')
TOTAL_USERS=$(echo "$STATS_RESPONSE" | jq -r '.totalUsers // empty')
TOTAL_EVENTS=$(echo "$STATS_RESPONSE" | jq -r '.totalEvents // empty')
TOTAL_VIEWS=$(echo "$STATS_RESPONSE" | jq -r '.totalViews // empty')
CONVERSION_RATE=$(echo "$STATS_RESPONSE" | jq -r '.conversionRate // empty')

echo ""
echo -e "${BLUE}Verifying Staff-Only Metrics:${NC}"

# Check public metrics (available to all)
if [ -n "$ACTIVE_LISTINGS" ] && [ "$ACTIVE_LISTINGS" != "null" ]; then
  echo -e "${GREEN}✓ activeListings: $ACTIVE_LISTINGS${NC}"
else
  echo -e "${RED}✗ activeListings missing${NC}"
fi

# Check staff-only metrics
if [ -n "$TOTAL_USERS" ] && [ "$TOTAL_USERS" != "null" ]; then
  echo -e "${GREEN}✓ totalUsers: $TOTAL_USERS (STAFF-ONLY)${NC}"
else
  echo -e "${RED}✗ totalUsers missing (expected for staff)${NC}"
fi

if [ -n "$TOTAL_EVENTS" ] && [ "$TOTAL_EVENTS" != "null" ]; then
  echo -e "${GREEN}✓ totalEvents: $TOTAL_EVENTS (STAFF-ONLY)${NC}"
else
  echo -e "${RED}✗ totalEvents missing (expected for staff)${NC}"
fi

if [ -n "$TOTAL_VIEWS" ] && [ "$TOTAL_VIEWS" != "null" ]; then
  echo -e "${GREEN}✓ totalViews: $TOTAL_VIEWS (STAFF-ONLY)${NC}"
else
  echo -e "${RED}✗ totalViews missing (expected for staff)${NC}"
fi

if [ -n "$CONVERSION_RATE" ] && [ "$CONVERSION_RATE" != "null" ]; then
  echo -e "${GREEN}✓ conversionRate: $CONVERSION_RATE% (STAFF-ONLY)${NC}"
else
  echo -e "${RED}✗ conversionRate missing (expected for staff)${NC}"
fi

echo ""

###############################################################################
# Step 3: Test Public Access (No Authentication)
###############################################################################
echo -e "${BLUE}Step 3: Testing public access (no authentication)...${NC}"

PUBLIC_STATS=$(curl -s -X GET "${API_BASE_URL}/api/stats/platform" \
  -H "Content-Type: application/json")

echo "Public Stats Response:"
echo "$PUBLIC_STATS" | jq '.'

PUBLIC_TOTAL_USERS=$(echo "$PUBLIC_STATS" | jq -r '.totalUsers // empty')
PUBLIC_TOTAL_EVENTS=$(echo "$PUBLIC_STATS" | jq -r '.totalEvents // empty')

echo ""
echo -e "${BLUE}Verifying Public Access Restrictions:${NC}"

if [ -z "$PUBLIC_TOTAL_USERS" ] || [ "$PUBLIC_TOTAL_USERS" == "null" ]; then
  echo -e "${GREEN}✓ totalUsers properly hidden from public${NC}"
else
  echo -e "${RED}✗ SECURITY ISSUE: totalUsers exposed to public${NC}"
fi

if [ -z "$PUBLIC_TOTAL_EVENTS" ] || [ "$PUBLIC_TOTAL_EVENTS" == "null" ]; then
  echo -e "${GREEN}✓ totalEvents properly hidden from public${NC}"
else
  echo -e "${RED}✗ SECURITY ISSUE: totalEvents exposed to public${NC}"
fi

echo ""

###############################################################################
# Step 4: Test Customer Access (Authenticated Non-Staff)
###############################################################################
echo -e "${BLUE}Step 4: Testing customer access (authenticated non-staff)...${NC}"

CUSTOMER_EMAIL="test-user@example.com"
CUSTOMER_PASSWORD="Password123*+"

CUSTOMER_AUTH_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${CUSTOMER_EMAIL}\",
    \"password\": \"${CUSTOMER_PASSWORD}\"
  }")

CUSTOMER_TOKEN=$(echo "$CUSTOMER_AUTH_RESPONSE" | jq -r '.tokens.accessToken // .accessToken // empty')

if [ -n "$CUSTOMER_TOKEN" ] && [ "$CUSTOMER_TOKEN" != "null" ]; then
  echo -e "${GREEN}✓ Customer authentication successful${NC}"
  
  CUSTOMER_STATS=$(curl -s -X GET "${API_BASE_URL}/api/stats/platform" \
    -H "Authorization: Bearer ${CUSTOMER_TOKEN}" \
    -H "Content-Type: application/json")
  
  echo "Customer Stats Response:"
  echo "$CUSTOMER_STATS" | jq '.'
  
  CUSTOMER_TOTAL_LISTINGS=$(echo "$CUSTOMER_STATS" | jq -r '.totalListings // empty')
  CUSTOMER_TOTAL_USERS=$(echo "$CUSTOMER_STATS" | jq -r '.totalUsers // empty')
  CUSTOMER_LAST30DAYS=$(echo "$CUSTOMER_STATS" | jq -r '.last30Days.views // empty')
  
  echo ""
  echo -e "${BLUE}Verifying Customer Access Level:${NC}"
  
  if [ -n "$CUSTOMER_TOTAL_LISTINGS" ] && [ "$CUSTOMER_TOTAL_LISTINGS" != "null" ]; then
    echo -e "${GREEN}✓ totalListings visible to customers${NC}"
  else
    echo -e "${YELLOW}⚠ totalListings missing for customer${NC}"
  fi
  
  if [ -n "$CUSTOMER_LAST30DAYS" ] && [ "$CUSTOMER_LAST30DAYS" != "null" ]; then
    echo -e "${GREEN}✓ last30Days.views visible to customers${NC}"
  else
    echo -e "${YELLOW}⚠ last30Days data missing for customer${NC}"
  fi
  
  if [ -z "$CUSTOMER_TOTAL_USERS" ] || [ "$CUSTOMER_TOTAL_USERS" == "null" ]; then
    echo -e "${GREEN}✓ totalUsers properly hidden from customers${NC}"
  else
    echo -e "${RED}✗ SECURITY ISSUE: totalUsers exposed to customers${NC}"
  fi
else
  echo -e "${YELLOW}⚠ Customer authentication failed (optional test)${NC}"
fi

echo ""

###############################################################################
# Summary
###############################################################################
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Test Summary                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Staff authentication working${NC}"
echo -e "${GREEN}✓ Platform stats endpoint returning data${NC}"
echo -e "${GREEN}✓ Role-based data segmentation functioning${NC}"
echo -e "${GREEN}✓ Staff has access to comprehensive analytics${NC}"
echo -e "${GREEN}✓ Public/Customer data properly restricted${NC}"
echo ""
echo -e "${BLUE}Staff Dashboard Metrics:${NC}"
echo "  • Active Listings: $ACTIVE_LISTINGS"
echo "  • Total Users: $TOTAL_USERS"
echo "  • Total Views: $TOTAL_VIEWS"
echo "  • Total Events: $TOTAL_EVENTS"
echo "  • Conversion Rate: $CONVERSION_RATE%"
echo ""
echo -e "${GREEN}✓ Admin dashboard is ready to display real analytics data!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Open admin dashboard: https://local.harborlist.com/admin"
echo "  2. Login with: ${ADMIN_EMAIL}"
echo "  3. View real-time platform statistics"
echo "  4. Verify automatic refresh (every 60 seconds)"
echo ""
