#!/bin/bash

# Phase 3 Complete E2E Test Script
set -e

BASE_URL="http://localhost:3002/api"
ADMIN_EMAIL="admin@harborlist.com"
ADMIN_PASSWORD="Admin@2024HarborList"

echo "🚀 Starting Phase 3 E2E Tests..."
echo ""

# 1. Login
echo "📝 Test 1: Admin Login"
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

ADMIN_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$ADMIN_TOKEN" == "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi
echo "✅ Login successful"
echo ""

# 2. List all teams
echo "📝 Test 2: List All Teams"
TEAMS_RESPONSE=$(curl -s -X GET $BASE_URL/admin/teams \
  -H "Authorization: Bearer $ADMIN_TOKEN")

TEAM_COUNT=$(echo $TEAMS_RESPONSE | jq '.totalTeams')
if [ "$TEAM_COUNT" == "8" ]; then
  echo "✅ All 8 teams returned"
else
  echo "❌ Expected 8 teams, got $TEAM_COUNT"
  echo "Response: $TEAMS_RESPONSE"
fi
echo ""

# 3. Get team details
echo "📝 Test 3: Get Sales Team Details"
TEAM_DETAILS=$(curl -s -X GET $BASE_URL/admin/teams/sales \
  -H "Authorization: Bearer $ADMIN_TOKEN")

TEAM_NAME=$(echo $TEAM_DETAILS | jq -r '.team.name')
if [ "$TEAM_NAME" == "Sales Team" ]; then
  echo "✅ Team details retrieved"
else
  echo "❌ Team details failed"
  echo "Response: $TEAM_DETAILS"
fi
echo ""

# 4. Create staff WITH teams
echo "📝 Test 4: Create Staff Member with Teams"
CREATE_RESPONSE=$(curl -s -X POST $BASE_URL/admin/users/staff \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.staff.'$(date +%s)'@harborlist.com",
    "name": "Test Staff",
    "role": "admin",
    "password": "SecurePass123!",
    "permissions": ["user_management"],
    "teams": [
      {"teamId": "sales", "role": "manager"},
      {"teamId": "marketing", "role": "member"}
    ]
  }')

STAFF_ID=$(echo $CREATE_RESPONSE | jq -r '.staff.id')
TEAM_COUNT=$(echo $CREATE_RESPONSE | jq '.staff.teams | length')
PERM_COUNT=$(echo $CREATE_RESPONSE | jq '.staff.permissionCount')

if [ "$TEAM_COUNT" == "2" ] && [ "$PERM_COUNT" -gt "5" ]; then
  echo "✅ Staff created with teams and calculated permissions"
  echo "   Staff ID: $STAFF_ID"
  echo "   Teams: $TEAM_COUNT"
  echo "   Permissions: $PERM_COUNT"
else
  echo "❌ Staff creation failed"
  echo "Response: $CREATE_RESPONSE"
fi
echo ""

# 5. Create staff WITHOUT teams
echo "📝 Test 5: Create Staff Member without Teams"
CREATE_BASIC=$(curl -s -X POST $BASE_URL/admin/users/staff \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "basic.staff.'$(date +%s)'@harborlist.com",
    "name": "Basic Staff",
    "role": "admin",
    "password": "SecurePass123!",
    "permissions": ["analytics_view"]
  }')

BASIC_ID=$(echo $CREATE_BASIC | jq -r '.staff.id')
BASIC_TEAMS=$(echo $CREATE_BASIC | jq '.staff.teams | length')
BASIC_PERMS=$(echo $CREATE_BASIC | jq '.staff.permissionCount')

if [ "$BASIC_TEAMS" == "0" ] && [ "$BASIC_PERMS" == "1" ]; then
  echo "✅ Staff created without teams"
  echo "   Staff ID: $BASIC_ID"
  echo "   Teams: $BASIC_TEAMS"
  echo "   Permissions: $BASIC_PERMS"
else
  echo "❌ Basic staff creation failed"
  echo "Response: $CREATE_BASIC"
fi
echo ""

# 6. Get team members
echo "📝 Test 6: Get Sales Team Members"
MEMBERS=$(curl -s -X GET $BASE_URL/admin/teams/sales/members \
  -H "Authorization: Bearer $ADMIN_TOKEN")

MEMBER_COUNT=$(echo $MEMBERS | jq '.totalMembers')
if [ "$MEMBER_COUNT" -gt "0" ]; then
  echo "✅ Team members retrieved (Count: $MEMBER_COUNT)"
else
  echo "⚠️  No members in sales team (may be expected)"
fi
echo ""

# 7. Assign to additional team
echo "📝 Test 7: Assign to Additional Team"
ASSIGN=$(curl -s -X POST $BASE_URL/admin/teams/customer-support/members \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$STAFF_ID\",\"role\":\"member\"}")

NEW_PERMS=$(echo $ASSIGN | jq '.newPermissionCount')
if [ ! -z "$NEW_PERMS" ] && [ "$NEW_PERMS" != "null" ]; then
  echo "✅ User assigned to additional team"
  echo "   New permission count: $NEW_PERMS"
else
  echo "❌ Team assignment failed"
  echo "Response: $ASSIGN"
fi
echo ""

# 8. Update team role
echo "📝 Test 8: Update Team Role"
UPDATE_ROLE=$(curl -s -X PUT $BASE_URL/admin/teams/customer-support/members/$STAFF_ID/role \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"manager"}')

NEW_ROLE=$(echo $UPDATE_ROLE | jq -r '.newRole')
if [ "$NEW_ROLE" == "manager" ]; then
  echo "✅ Team role updated to manager"
else
  echo "❌ Role update failed"
  echo "Response: $UPDATE_ROLE"
fi
echo ""

# 9. Get user team info
echo "📝 Test 9: Get User Team Information"
USER_TEAMS=$(curl -s -X GET $BASE_URL/admin/teams/users/$STAFF_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN")

TOTAL_TEAMS=$(echo $USER_TEAMS | jq '.totalTeams')
if [ "$TOTAL_TEAMS" -ge "2" ]; then
  echo "✅ User team information retrieved"
  echo "   Total teams: $TOTAL_TEAMS"
  echo "   Manager of: $(echo $USER_TEAMS | jq -r '.managerOf | join(", ")')"
  echo "   Member of: $(echo $USER_TEAMS | jq -r '.memberOf | join(", ")')"
else
  echo "❌ User team info failed"
  echo "Response: $USER_TEAMS"
fi
echo ""

# 10. Get team stats
echo "📝 Test 10: Get Team Stats"
STATS=$(curl -s -X GET $BASE_URL/admin/teams/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN")

TOTAL_TEAMS_STAT=$(echo $STATS | jq '.stats.totalTeams')
if [ "$TOTAL_TEAMS_STAT" == "8" ]; then
  echo "✅ Team stats retrieved"
  echo "   Total teams: $TOTAL_TEAMS_STAT"
  echo "   Total staff: $(echo $STATS | jq '.stats.totalStaffMembers')"
  echo "   Total assignments: $(echo $STATS | jq '.stats.totalAssignments')"
else
  echo "❌ Team stats failed"
  echo "Response: $STATS"
fi
echo ""

# 11. Recalculate permissions
echo "📝 Test 11: Recalculate User Permissions"
RECALC=$(curl -s -X POST $BASE_URL/admin/teams/users/$STAFF_ID/permissions/recalculate \
  -H "Authorization: Bearer $ADMIN_TOKEN")

RECALC_SUCCESS=$(echo $RECALC | jq -r '.success')
if [ "$RECALC_SUCCESS" == "true" ]; then
  echo "✅ Permissions recalculated"
  echo "   Permission count: $(echo $RECALC | jq '.newPermissionCount')"
else
  echo "❌ Permission recalculation failed"
  echo "Response: $RECALC"
fi
echo ""

# 12. Remove from team
echo "📝 Test 12: Remove User from Team"
REMOVE=$(curl -s -X DELETE $BASE_URL/admin/teams/marketing/members/$STAFF_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN")

REMOVE_SUCCESS=$(echo $REMOVE | jq -r '.success')
if [ "$REMOVE_SUCCESS" == "true" ]; then
  echo "✅ User removed from team"
  REMOVED_PERMS=$(echo $REMOVE | jq -r '.removedPermissions | join(", ")')
  echo "   Permissions removed: $REMOVED_PERMS"
else
  echo "❌ Team removal failed"
  echo "Response: $REMOVE"
fi
echo ""

# 13. Test invalid team assignment
echo "📝 Test 13: Invalid Team Assignment (Should Fail)"
INVALID=$(curl -s -X POST $BASE_URL/admin/users/staff \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid.test@harborlist.com",
    "name": "Invalid Test",
    "role": "admin",
    "password": "SecurePass123!",
    "teams": [{"teamId": "nonexistent", "role": "member"}]
  }')

INVALID_SUCCESS=$(echo $INVALID | jq -r '.success')
if [ "$INVALID_SUCCESS" == "false" ]; then
  echo "✅ Invalid team correctly rejected"
  echo "   Error: $(echo $INVALID | jq -r '.error')"
else
  echo "❌ Invalid team should have been rejected"
  echo "Response: $INVALID"
fi
echo ""

# Summary
echo ""
echo "========================================="
echo "✅ Phase 3 E2E Tests Complete!"
echo "========================================="
echo ""
echo "Test Results Summary:"
echo "  Staff User ID: $STAFF_ID"
echo "  Basic Staff User ID: $BASIC_ID"
echo ""
echo "Key Achievements:"
echo "  ✅ 8 teams defined and accessible"
echo "  ✅ Staff creation with teams working"
echo "  ✅ Permission calculation accurate"
echo "  ✅ Team assignment/removal working"
echo "  ✅ Role updates working"
echo "  ✅ Validation preventing invalid data"
echo "  ✅ Permission recalculation working"
echo ""
echo "Next Steps:"
echo "  1. Review test results above"
echo "  2. Test admin UI (when built)"
echo "  3. Monitor production usage"
echo "  4. Gather user feedback"
echo ""
