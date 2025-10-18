# Phase 3: Team-Based Staff Roles - E2E Testing Guide

## Overview
Comprehensive end-to-end testing guide for the team-based staff roles system implemented in Phase 3.

## Prerequisites
- Admin user with full permissions
- Local server running (`npm run dev` in backend)
- Base URL: `http://localhost:3002/api/admin`
- Admin JWT token

## Setup

### 1. Get Admin Token
```bash
# Login as admin
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@harborlist.com",
    "password": "your-admin-password"
  }'

# Export token for use in tests
export ADMIN_TOKEN="eyJhbGc..."
```

## Testing Scenarios

### Scenario 1: List All Teams
**Purpose**: Verify all 8 teams are defined and accessible

```bash
curl -X GET http://localhost:3002/api/admin/teams \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "teams": [
    {
      "id": "sales",
      "name": "Sales Team",
      "description": "Manages dealer relationships...",
      "basePermissions": ["dealer_accounts", "analytics_view", ...],
      "memberCount": 0,
      "managerCount": 0
    },
    // ... 7 more teams
  ],
  "totalTeams": 8
}
```

**Validation**:
- Response status: 200
- `teams` array has 8 elements
- Each team has id, name, description, basePermissions, memberCount, managerCount

---

### Scenario 2: Get Team Details
**Purpose**: Retrieve detailed information about a specific team

```bash
curl -X GET http://localhost:3002/api/admin/teams/sales \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "team": {
    "id": "sales",
    "name": "Sales Team",
    "description": "Manages dealer relationships...",
    "basePermissions": ["dealer_accounts", "analytics_view", ...],
    "managerPermissions": ["dealer_management", "bulk_operations", ...],
    "memberCount": 0,
    "managerCount": 0
  }
}
```

**Validation**:
- Response status: 200
- Team details include both base and manager permissions
- Correct team metadata returned

---

### Scenario 3: Create Staff Member WITH Team Assignments
**Purpose**: Create a new staff member and assign them to teams during creation

```bash
curl -X POST http://localhost:3002/api/admin/users/staff \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sales.manager@harborlist.com",
    "name": "Sarah Johnson",
    "role": "admin",
    "password": "SecurePass123!",
    "permissions": ["user_management"],
    "teams": [
      { "teamId": "sales", "role": "manager" },
      { "teamId": "marketing", "role": "member" }
    ]
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "staff": {
    "id": "user-123...",
    "email": "sales.manager@harborlist.com",
    "name": "Sarah Johnson",
    "role": "admin",
    "teams": [
      {
        "teamId": "sales",
        "role": "manager",
        "assignedAt": "2025-01-18T..."
      },
      {
        "teamId": "marketing",
        "role": "member",
        "assignedAt": "2025-01-18T..."
      }
    ],
    "effectivePermissions": ["user_management", "dealer_accounts", "analytics_view", ...],
    "permissionCount": 15
  }
}
```

**Validation**:
- Response status: 201
- User created with teams array populated
- effectivePermissions includes base + sales manager + marketing member permissions
- No duplicate permissions in effectivePermissions

**Save userId for later tests**:
```bash
export STAFF_USER_ID="user-123..."
```

---

### Scenario 4: Create Staff Member WITHOUT Teams
**Purpose**: Verify staff creation still works without team assignments

```bash
curl -X POST http://localhost:3002/api/admin/users/staff \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "basic.staff@harborlist.com",
    "name": "John Doe",
    "role": "admin",
    "password": "SecurePass123!",
    "permissions": ["analytics_view"]
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "staff": {
    "id": "user-456...",
    "email": "basic.staff@harborlist.com",
    "name": "John Doe",
    "teams": [],
    "effectivePermissions": ["analytics_view"],
    "permissionCount": 1
  }
}
```

**Validation**:
- Response status: 201
- teams array is empty
- effectivePermissions only includes base permissions

**Save userId**:
```bash
export BASIC_STAFF_ID="user-456..."
```

---

### Scenario 5: Invalid Team Assignment During Creation
**Purpose**: Test validation of team IDs and roles

```bash
# Test invalid team ID
curl -X POST http://localhost:3002/api/admin/users/staff \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@harborlist.com",
    "name": "Test User",
    "role": "admin",
    "password": "SecurePass123!",
    "teams": [
      { "teamId": "invalid-team", "role": "member" }
    ]
  }'
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Invalid team ID: invalid-team"
}
```

**Validation**:
- Response status: 400
- Error message indicates invalid team ID

```bash
# Test invalid role
curl -X POST http://localhost:3002/api/admin/users/staff \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@harborlist.com",
    "name": "Test User",
    "role": "admin",
    "password": "SecurePass123!",
    "teams": [
      { "teamId": "sales", "role": "invalid-role" }
    ]
  }'
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Invalid team role: invalid-role"
}
```

---

### Scenario 6: Get Team Members
**Purpose**: List all members of a specific team

```bash
curl -X GET http://localhost:3002/api/admin/teams/sales/members \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "teamId": "sales",
  "members": [
    {
      "userId": "user-123...",
      "email": "sales.manager@harborlist.com",
      "name": "Sarah Johnson",
      "role": "manager",
      "assignedAt": "2025-01-18T...",
      "assignedBy": "admin-user-id"
    }
  ],
  "totalMembers": 1,
  "managers": 1,
  "regularMembers": 0
}
```

**Validation**:
- Response status: 200
- Sarah Johnson appears as manager
- Correct role and metadata

---

### Scenario 7: Assign User to Additional Team
**Purpose**: Add an existing staff member to another team

```bash
curl -X POST http://localhost:3002/api/admin/teams/customer-support/members \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$STAFF_USER_ID'",
    "role": "member"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "User assigned to team successfully",
  "userId": "user-123...",
  "teamId": "customer-support",
  "role": "member",
  "previousPermissionCount": 15,
  "newPermissionCount": 20,
  "addedPermissions": ["ticket_management", "user_support", ...]
}
```

**Validation**:
- Response status: 200
- Permission count increased
- addedPermissions listed correctly

---

### Scenario 8: Update User's Team Role
**Purpose**: Change a user's role within a team

```bash
curl -X PUT http://localhost:3002/api/admin/teams/customer-support/members/$STAFF_USER_ID/role \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "manager"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "User role updated successfully",
  "userId": "user-123...",
  "teamId": "customer-support",
  "oldRole": "member",
  "newRole": "manager",
  "previousPermissionCount": 20,
  "newPermissionCount": 25,
  "addedPermissions": ["ticket_escalation", "team_reports", ...]
}
```

**Validation**:
- Response status: 200
- Role changed from member to manager
- Additional manager permissions granted

---

### Scenario 9: Get User Team Information
**Purpose**: Retrieve all teams a user belongs to

```bash
curl -X GET http://localhost:3002/api/admin/teams/users/$STAFF_USER_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "userId": "user-123...",
  "email": "sales.manager@harborlist.com",
  "name": "Sarah Johnson",
  "teams": [
    {
      "teamId": "sales",
      "teamName": "Sales Team",
      "role": "manager",
      "assignedAt": "2025-01-18T...",
      "permissions": ["dealer_accounts", "analytics_view", ...]
    },
    {
      "teamId": "marketing",
      "teamName": "Marketing Team",
      "role": "member",
      "assignedAt": "2025-01-18T...",
      "permissions": ["content_management", ...]
    },
    {
      "teamId": "customer-support",
      "teamName": "Customer Support Team",
      "role": "manager",
      "assignedAt": "2025-01-18T...",
      "permissions": ["ticket_management", "ticket_escalation", ...]
    }
  ],
  "basePermissions": ["user_management"],
  "effectivePermissions": ["user_management", "dealer_accounts", ...],
  "totalTeams": 3,
  "managerOf": ["sales", "customer-support"],
  "memberOf": ["marketing"]
}
```

**Validation**:
- Response status: 200
- All 3 team assignments listed
- Permissions correctly segregated by team
- No duplicate permissions in effectivePermissions

---

### Scenario 10: Bulk Assign Users to Team
**Purpose**: Add multiple users to a team at once

```bash
curl -X POST http://localhost:3002/api/admin/teams/finance/members/bulk \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["'$STAFF_USER_ID'", "'$BASIC_STAFF_ID'"],
    "role": "member"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Bulk assignment completed",
  "teamId": "finance",
  "role": "member",
  "results": [
    {
      "userId": "user-123...",
      "success": true
    },
    {
      "userId": "user-456...",
      "success": true
    }
  ],
  "successCount": 2,
  "failureCount": 0
}
```

**Validation**:
- Response status: 200
- Both users successfully assigned
- No failures

---

### Scenario 11: Get Unassigned Staff Users
**Purpose**: List staff members not assigned to any team

```bash
curl -X GET http://localhost:3002/api/admin/teams/unassigned \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "unassignedUsers": [],
  "count": 0
}
```

**Validation**:
- Response status: 200
- Empty array (all test users assigned to teams)

---

### Scenario 12: Get All Team Stats
**Purpose**: Get overview statistics for all teams

```bash
curl -X GET http://localhost:3002/api/admin/teams/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "stats": {
    "totalTeams": 8,
    "totalStaffMembers": 2,
    "totalAssignments": 6,
    "averageMembersPerTeam": 0.75,
    "teams": [
      {
        "teamId": "sales",
        "teamName": "Sales Team",
        "totalMembers": 1,
        "managers": 1,
        "regularMembers": 0
      },
      // ... other teams
    ],
    "teamsWithoutMembers": ["technical-operations", "product", "executive"]
  }
}
```

**Validation**:
- Response status: 200
- Correct counts for all metrics
- Teams with members show correct counts

---

### Scenario 13: Recalculate User Permissions
**Purpose**: Force recalculation of a user's effective permissions

```bash
curl -X POST http://localhost:3002/api/admin/teams/users/$STAFF_USER_ID/permissions/recalculate \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Permissions recalculated successfully",
  "userId": "user-123...",
  "previousPermissionCount": 25,
  "newPermissionCount": 25,
  "effectivePermissions": ["user_management", "dealer_accounts", ...],
  "teams": [
    { "teamId": "sales", "role": "manager" },
    { "teamId": "marketing", "role": "member" },
    { "teamId": "customer-support", "role": "manager" },
    { "teamId": "finance", "role": "member" }
  ]
}
```

**Validation**:
- Response status: 200
- Permission count matches expected total
- No duplicate permissions

---

### Scenario 14: Remove User from Team
**Purpose**: Remove a staff member from a specific team

```bash
curl -X DELETE http://localhost:3002/api/admin/teams/marketing/members/$STAFF_USER_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "User removed from team successfully",
  "userId": "user-123...",
  "teamId": "marketing",
  "previousPermissionCount": 25,
  "newPermissionCount": 22,
  "removedPermissions": ["content_management", "campaign_view", ...]
}
```

**Validation**:
- Response status: 200
- Permission count decreased
- Marketing permissions removed

---

### Scenario 15: Recalculate All Staff Permissions
**Purpose**: Bulk recalculate permissions for all staff members (admin operation)

```bash
curl -X POST http://localhost:3002/api/admin/teams/permissions/recalculate-all \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "All staff permissions recalculated",
  "processedCount": 2,
  "results": [
    {
      "userId": "user-123...",
      "email": "sales.manager@harborlist.com",
      "success": true,
      "permissionCount": 22
    },
    {
      "userId": "user-456...",
      "email": "basic.staff@harborlist.com",
      "success": true,
      "permissionCount": 5
    }
  ]
}
```

**Validation**:
- Response status: 200
- All staff members processed
- Correct permission counts

---

### Scenario 16: Duplicate Team Assignment Prevention
**Purpose**: Verify system prevents duplicate assignments

```bash
curl -X POST http://localhost:3002/api/admin/teams/sales/members \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$STAFF_USER_ID'",
    "role": "member"
  }'
```

**Expected Response**:
```json
{
  "success": false,
  "error": "User is already a member of this team"
}
```

**Validation**:
- Response status: 400
- Duplicate prevented
- Appropriate error message

---

### Scenario 17: Authorization - Non-Admin Cannot Access Teams
**Purpose**: Verify team endpoints require proper authorization

```bash
# Create dealer user for this test
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dealer@harborlist.com",
    "password": "SecurePass123!",
    "name": "Dealer User",
    "userType": "dealer"
  }'

# Login as dealer
DEALER_TOKEN=$(curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dealer@harborlist.com",
    "password": "SecurePass123!"
  }' | jq -r '.token')

# Try to access teams endpoint
curl -X GET http://localhost:3002/api/admin/teams \
  -H "Authorization: Bearer $DEALER_TOKEN"
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Unauthorized: Admin access required"
}
```

**Validation**:
- Response status: 401 or 403
- Access denied for non-admin users

---

## Complete Test Flow Script

Create a file `test-phase3-complete.sh`:

```bash
#!/bin/bash

# Phase 3 Complete E2E Test Script
set -e

BASE_URL="http://localhost:3002/api"
ADMIN_EMAIL="admin@harborlist.com"
ADMIN_PASSWORD="your-admin-password"

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
else
  echo "❌ Staff creation failed"
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
else
  echo "❌ Basic staff creation failed"
fi
echo ""

# 6. Get team members
echo "📝 Test 6: Get Sales Team Members"
MEMBERS=$(curl -s -X GET $BASE_URL/admin/teams/sales/members \
  -H "Authorization: Bearer $ADMIN_TOKEN")

MEMBER_COUNT=$(echo $MEMBERS | jq '.totalMembers')
if [ "$MEMBER_COUNT" -gt "0" ]; then
  echo "✅ Team members retrieved"
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
else
  echo "❌ Team assignment failed"
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
  echo "✅ Team role updated"
else
  echo "❌ Role update failed"
fi
echo ""

# 9. Get user team info
echo "📝 Test 9: Get User Team Information"
USER_TEAMS=$(curl -s -X GET $BASE_URL/admin/teams/users/$STAFF_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN")

TOTAL_TEAMS=$(echo $USER_TEAMS | jq '.totalTeams')
if [ "$TOTAL_TEAMS" -ge "2" ]; then
  echo "✅ User team information retrieved"
else
  echo "❌ User team info failed"
fi
echo ""

# 10. Get team stats
echo "📝 Test 10: Get Team Stats"
STATS=$(curl -s -X GET $BASE_URL/admin/teams/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN")

TOTAL_TEAMS_STAT=$(echo $STATS | jq '.stats.totalTeams')
if [ "$TOTAL_TEAMS_STAT" == "8" ]; then
  echo "✅ Team stats retrieved"
else
  echo "❌ Team stats failed"
fi
echo ""

# 11. Recalculate permissions
echo "📝 Test 11: Recalculate User Permissions"
RECALC=$(curl -s -X POST $BASE_URL/admin/teams/users/$STAFF_ID/permissions/recalculate \
  -H "Authorization: Bearer $ADMIN_TOKEN")

RECALC_SUCCESS=$(echo $RECALC | jq -r '.success')
if [ "$RECALC_SUCCESS" == "true" ]; then
  echo "✅ Permissions recalculated"
else
  echo "❌ Permission recalculation failed"
fi
echo ""

# 12. Remove from team
echo "📝 Test 12: Remove User from Team"
REMOVE=$(curl -s -X DELETE $BASE_URL/admin/teams/marketing/members/$STAFF_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN")

REMOVE_SUCCESS=$(echo $REMOVE | jq -r '.success')
if [ "$REMOVE_SUCCESS" == "true" ]; then
  echo "✅ User removed from team"
else
  echo "❌ Team removal failed"
fi
echo ""

# Summary
echo ""
echo "========================================="
echo "✅ Phase 3 E2E Tests Complete!"
echo "========================================="
echo "Test Staff User ID: $STAFF_ID"
echo "Basic Staff User ID: $BASIC_ID"
echo ""
```

Make it executable:
```bash
chmod +x test-phase3-complete.sh
```

Run tests:
```bash
./test-phase3-complete.sh
```

---

## Permission Validation Tests

### Test Permission Calculation Accuracy

```bash
# Create staff with known teams
curl -X POST http://localhost:3002/api/admin/users/staff \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "perm.test@harborlist.com",
    "name": "Permission Test",
    "role": "admin",
    "password": "SecurePass123!",
    "permissions": ["analytics_view"],
    "teams": [
      {"teamId": "sales", "role": "manager"}
    ]
  }' | jq '{
    basePermissions: .staff.permissions,
    teams: .staff.teams,
    effectivePermissions: .staff.effectivePermissions,
    permissionCount: .staff.permissionCount
  }'
```

**Manual Validation**:
1. Base permissions: `["analytics_view"]`
2. Sales manager permissions: `["dealer_accounts", "analytics_view", "listing_approval", "dealer_management", "bulk_operations"]`
3. Expected effective: All unique permissions (should be ~6 after deduplication)

---

## Edge Cases

### Test 1: Invalid Team ID
```bash
curl -X POST http://localhost:3002/api/admin/users/staff \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@harborlist.com",
    "name": "Test",
    "role": "admin",
    "password": "SecurePass123!",
    "teams": [{"teamId": "nonexistent", "role": "member"}]
  }'
```
**Expected**: 400 error with "Invalid team ID"

### Test 2: Invalid Role
```bash
curl -X POST http://localhost:3002/api/admin/users/staff \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@harborlist.com",
    "name": "Test",
    "role": "admin",
    "password": "SecurePass123!",
    "teams": [{"teamId": "sales", "role": "superadmin"}]
  }'
```
**Expected**: 400 error with "Invalid team role"

### Test 3: Empty Teams Array
```bash
curl -X POST http://localhost:3002/api/admin/users/staff \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@harborlist.com",
    "name": "Test",
    "role": "admin",
    "password": "SecurePass123!",
    "teams": []
  }'
```
**Expected**: 201 success with empty teams array

---

## Test Summary Checklist

- [ ] Can list all 8 teams
- [ ] Can get individual team details
- [ ] Can create staff WITH team assignments
- [ ] Can create staff WITHOUT team assignments
- [ ] Validates team IDs during creation
- [ ] Validates team roles during creation
- [ ] Can list team members
- [ ] Can assign user to additional teams
- [ ] Can update user's team role
- [ ] Can get user's team information
- [ ] Can bulk assign users
- [ ] Can list unassigned staff
- [ ] Can get team statistics
- [ ] Can recalculate individual permissions
- [ ] Can recalculate all staff permissions
- [ ] Can remove user from team
- [ ] Prevents duplicate team assignments
- [ ] Enforces admin-only access
- [ ] Effective permissions calculated correctly
- [ ] No duplicate permissions in effectivePermissions

---

## Next Steps

After completing all tests:
1. Document any failures or unexpected behavior
2. Verify permission calculations are accurate
3. Test with real-world scenarios
4. Create admin UI testing guide
5. Performance test with large numbers of staff/teams
