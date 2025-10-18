# Phase 2.7: Dealer Sub-Accounts End-to-End Testing Guide

## Date: October 18, 2025

## Overview

This document provides a comprehensive testing guide for the Dealer Sub-Account feature. Follow these steps to verify the complete implementation.

## Prerequisites

- Local environment running (`./tools/deployment/deploy.sh local`)
- Backend server running on port 3001
- DynamoDB with ParentDealerIndex GSI
- Valid JWT tokens for authentication

## Test Scenarios

### Scenario 1: Create Dealer Account

**Objective:** Verify dealer account creation with proper tier assignment.

#### Steps:

```bash
# 1. Create a dealer account
cd backend
npm run create-dealer -- --email dealer@test.com --name "Test Dealer" --tier dealer

# Expected Output:
# ✅ Dealer user created successfully in Cognito!
# ✅ Dealer record synced to DynamoDB
# 🆔 ID: [dealer-id]
# 🔐 Password: [generated-password]
```

#### Verification:

```bash
# Query DynamoDB to verify dealer account
aws dynamodb get-item \
  --table-name harborlist-users \
  --key '{"id":{"S":"[dealer-id]"}}' \
  --endpoint-url http://localhost:8000 \
  --region us-east-1 \
  --output json

# Verify:
# - userType = "customer"
# - customerTier = "dealer"
# - canCreateSubAccounts = true
# - maxSubAccounts = 10
```

#### Success Criteria:
- ✅ Dealer account created in Cognito
- ✅ Dealer record exists in DynamoDB
- ✅ Correct tier assigned
- ✅ Password generated and displayed

---

### Scenario 2: Create Premium Dealer Account

**Objective:** Verify premium dealer creation with increased sub-account limit.

#### Steps:

```bash
# Create a premium dealer account
npm run create-dealer -- --email premium@test.com --name "Premium Dealer" --tier premium_dealer
```

#### Verification:

```bash
# Query DynamoDB
aws dynamodb get-item \
  --table-name harborlist-users \
  --key '{"id":{"S":"[premium-dealer-id]"}}' \
  --endpoint-url http://localhost:8000 \
  --region us-east-1

# Verify:
# - customerTier = "premium_dealer"
# - maxSubAccounts = 50
```

#### Success Criteria:
- ✅ Premium dealer created
- ✅ maxSubAccounts = 50

---

### Scenario 3: Create Sub-Account (Manager Role)

**Objective:** Verify sub-account creation with manager permissions.

#### Steps:

```bash
# Create manager sub-account (use dealer-id from Scenario 1)
npm run create-dealer -- \
  --parent-id [dealer-id] \
  --email manager@dealer.com \
  --name "Dealer Manager" \
  --role manager

# Expected Output:
# ✅ Sub-account created successfully in Cognito!
# ✅ Sub-account record synced to DynamoDB
# 🔑 Role: manager
# 👥 Parent Dealer: [dealer-id]
# 🎯 Permissions: manage_listings, create_listings, edit_listings, ...
```

#### Verification:

```bash
# Query DynamoDB
aws dynamodb get-item \
  --table-name harborlist-users \
  --key '{"id":{"S":"[manager-id]"}}' \
  --endpoint-url http://localhost:8000 \
  --region us-east-1

# Verify:
# - isDealerSubAccount = true
# - parentDealerId = [dealer-id]
# - dealerAccountRole = "manager"
# - delegatedPermissions includes manager permissions
# - accessScope.listings = "all"
# - accessScope.leads = true
# - accessScope.analytics = true
```

#### Success Criteria:
- ✅ Sub-account created with manager role
- ✅ Linked to parent dealer
- ✅ Manager permissions assigned
- ✅ Full access scope configured

---

### Scenario 4: Create Sub-Account (Staff Role)

**Objective:** Verify sub-account creation with limited staff permissions.

#### Steps:

```bash
# Create staff sub-account
npm run create-dealer -- \
  --parent-id [dealer-id] \
  --email staff@dealer.com \
  --name "Dealer Staff" \
  --role staff
```

#### Verification:

```bash
# Query DynamoDB
aws dynamodb get-item \
  --table-name harborlist-users \
  --key '{"id":{"S":"[staff-id]"}}' \
  --endpoint-url http://localhost:8000 \
  --region us-east-1

# Verify:
# - dealerAccountRole = "staff"
# - delegatedPermissions = ["edit_listings", "respond_to_leads", "manage_communications"]
# - accessScope.leads = false (staff doesn't see leads)
# - accessScope.analytics = false
# - accessScope.pricing = false
```

#### Success Criteria:
- ✅ Staff sub-account created
- ✅ Limited permissions assigned
- ✅ Restricted access scope

---

### Scenario 5: Query ParentDealerIndex GSI

**Objective:** Verify GSI can efficiently query all sub-accounts for a dealer.

#### Steps:

```bash
# Query all sub-accounts for dealer
aws dynamodb query \
  --table-name harborlist-users \
  --index-name ParentDealerIndex \
  --key-condition-expression "parentDealerId = :dealerId" \
  --expression-attribute-values '{":dealerId":{"S":"[dealer-id]"}}' \
  --endpoint-url http://localhost:8000 \
  --region us-east-1 \
  --query 'Items[*].{Email:email.S,Name:name.S,Role:dealerAccountRole.S,CreatedAt:createdAt.S}' \
  --output table
```

#### Expected Output:

```
----------------------------------------------------------
|                        Query                          |
+------------------------+---------------+---------------+
|         Email          |     Name      |     Role      |
+------------------------+---------------+---------------+
|  manager@dealer.com    | Dealer Manager|  manager      |
|  staff@dealer.com      | Dealer Staff  |  staff        |
+------------------------+---------------+---------------+
```

#### Success Criteria:
- ✅ GSI query returns all sub-accounts
- ✅ Results sorted by createdAt
- ✅ Query performance < 100ms

---

### Scenario 6: Test API - List Sub-Accounts

**Objective:** Verify API endpoint returns dealer's sub-accounts.

#### Steps:

```bash
# 1. Get dealer JWT token (authenticate as dealer)
DEALER_TOKEN="[dealer-jwt-token]"

# 2. Call list sub-accounts API
curl -X GET \
  "http://local-api.harborlist.com:3001/api/dealer/sub-accounts" \
  -H "Authorization: Bearer $DEALER_TOKEN" \
  -H "Content-Type: application/json" | jq

# Expected Response:
# {
#   "subAccounts": [
#     {
#       "id": "[manager-id]",
#       "email": "manager@dealer.com",
#       "name": "Dealer Manager",
#       "dealerAccountRole": "manager",
#       "status": "active",
#       "createdAt": "2025-10-18T..."
#     },
#     {
#       "id": "[staff-id]",
#       "email": "staff@dealer.com",
#       "name": "Dealer Staff",
#       "dealerAccountRole": "staff",
#       "status": "active",
#       "createdAt": "2025-10-18T..."
#     }
#   ],
#   "count": 2
# }
```

#### Success Criteria:
- ✅ API returns 200 OK
- ✅ Returns all sub-accounts for authenticated dealer
- ✅ Includes correct count
- ✅ Proper authorization enforced

---

### Scenario 7: Test API - Create Sub-Account

**Objective:** Verify API endpoint creates sub-account with validation.

#### Steps:

```bash
# Call create sub-account API
curl -X POST \
  "http://local-api.harborlist.com:3001/api/dealer/sub-accounts" \
  -H "Authorization: Bearer $DEALER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newstaff@dealer.com",
    "name": "New Staff Member",
    "dealerAccountRole": "staff",
    "accessScope": {
      "listings": "all",
      "leads": false,
      "analytics": false,
      "inventory": true,
      "pricing": false,
      "communications": true
    }
  }' | jq

# Expected Response:
# {
#   "message": "Sub-account created successfully",
#   "subAccount": {
#     "id": "[new-staff-id]",
#     "email": "newstaff@dealer.com",
#     ...
#   }
# }
```

#### Success Criteria:
- ✅ API returns 201 Created
- ✅ Sub-account created in DynamoDB
- ✅ Custom access scope applied
- ✅ Returns sub-account details

---

### Scenario 8: Test API - Get Specific Sub-Account

**Objective:** Verify API retrieves sub-account details with ownership validation.

#### Steps:

```bash
# Get specific sub-account
curl -X GET \
  "http://local-api.harborlist.com:3001/api/dealer/sub-accounts/[manager-id]" \
  -H "Authorization: Bearer $DEALER_TOKEN" \
  -H "Content-Type: application/json" | jq

# Expected Response:
# {
#   "subAccount": {
#     "id": "[manager-id]",
#     "email": "manager@dealer.com",
#     "name": "Dealer Manager",
#     "dealerAccountRole": "manager",
#     "parentDealerId": "[dealer-id]",
#     "accessScope": {...},
#     "delegatedPermissions": [...]
#   }
# }
```

#### Success Criteria:
- ✅ API returns 200 OK
- ✅ Returns complete sub-account details
- ✅ Includes permissions and access scope

---

### Scenario 9: Test API - Update Sub-Account

**Objective:** Verify API updates sub-account with validation.

#### Steps:

```bash
# Update sub-account role and permissions
curl -X PUT \
  "http://local-api.harborlist.com:3001/api/dealer/sub-accounts/[staff-id]" \
  -H "Authorization: Bearer $DEALER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dealerAccountRole": "manager",
    "accessScope": {
      "listings": "all",
      "leads": true,
      "analytics": true,
      "inventory": true,
      "pricing": true,
      "communications": true
    }
  }' | jq

# Expected Response:
# {
#   "message": "Sub-account updated successfully",
#   "subAccount": {
#     "dealerAccountRole": "manager",
#     ...
#   }
# }
```

#### Verification:

```bash
# Verify update in DynamoDB
aws dynamodb get-item \
  --table-name harborlist-users \
  --key '{"id":{"S":"[staff-id]"}}' \
  --endpoint-url http://localhost:8000 \
  --region us-east-1

# Verify:
# - dealerAccountRole = "manager" (updated)
# - accessScope reflects new permissions
```

#### Success Criteria:
- ✅ API returns 200 OK
- ✅ Sub-account role updated
- ✅ Access scope updated
- ✅ Changes persisted to DynamoDB

---

### Scenario 10: Test API - Delete Sub-Account

**Objective:** Verify API deletes sub-account with proper authorization.

#### Steps:

```bash
# Delete sub-account
curl -X DELETE \
  "http://local-api.harborlist.com:3001/api/dealer/sub-accounts/[staff-id]" \
  -H "Authorization: Bearer $DEALER_TOKEN" \
  -H "Content-Type: application/json" | jq

# Expected Response:
# {
#   "message": "Sub-account deleted successfully"
# }
```

#### Verification:

```bash
# Verify deletion in DynamoDB
aws dynamodb get-item \
  --table-name harborlist-users \
  --key '{"id":{"S":"[staff-id]"}}' \
  --endpoint-url http://localhost:8000 \
  --region us-east-1

# Should return empty or item not found
```

#### Success Criteria:
- ✅ API returns 200 OK
- ✅ Sub-account removed from DynamoDB
- ✅ Proper authorization enforced

---

### Scenario 11: Test Authorization - Dealer Tier Requirement

**Objective:** Verify non-dealer users cannot access dealer endpoints.

#### Steps:

```bash
# 1. Create non-dealer customer account
# (Use existing customer or create one)

# 2. Get customer JWT token
CUSTOMER_TOKEN="[customer-jwt-token]"

# 3. Attempt to access dealer endpoint
curl -X GET \
  "http://local-api.harborlist.com:3001/api/dealer/sub-accounts" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" | jq

# Expected Response:
# {
#   "error": "Insufficient Tier",
#   "message": "...",
#   "userMessage": "This feature is only available to dealer accounts...",
#   "requiredTier": "dealer",
#   "upgradeRequired": true
# }
```

#### Success Criteria:
- ✅ API returns 403 Forbidden
- ✅ Clear error message displayed
- ✅ Upgrade prompt included

---

### Scenario 12: Test Authorization - Ownership Validation

**Objective:** Verify dealers cannot access other dealers' sub-accounts.

#### Steps:

```bash
# 1. Create second dealer
npm run create-dealer -- --email dealer2@test.com --name "Dealer Two" --tier dealer

# 2. Get dealer2 JWT token
DEALER2_TOKEN="[dealer2-jwt-token]"

# 3. Attempt to access dealer1's sub-account
curl -X GET \
  "http://local-api.harborlist.com:3001/api/dealer/sub-accounts/[manager-id]" \
  -H "Authorization: Bearer $DEALER2_TOKEN" \
  -H "Content-Type: application/json" | jq

# Expected Response:
# {
#   "error": "Forbidden",
#   "message": "You do not have permission to access this sub-account",
#   "userMessage": "You can only manage sub-accounts that belong to your dealer account."
# }
```

#### Success Criteria:
- ✅ API returns 403 Forbidden
- ✅ Ownership validation working
- ✅ Cannot access other dealer's sub-accounts

---

### Scenario 13: Test Permission Enforcement

**Objective:** Verify sub-accounts have correct permissions enforced.

#### Steps:

```bash
# 1. Authenticate as staff sub-account
STAFF_TOKEN="[staff-jwt-token]"

# 2. Attempt to create listing (staff should be able to edit but not create)
curl -X POST \
  "http://local-api.harborlist.com:3001/api/listings" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Listing",
    "description": "Test"
  }' | jq

# If staff doesn't have create_listings permission:
# Expected Response: 403 Forbidden

# 3. Attempt to edit existing listing (staff should have this permission)
curl -X PUT \
  "http://local-api.harborlist.com:3001/api/listings/[listing-id]" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description"
  }' | jq

# Expected Response: 200 OK (success)
```

#### Success Criteria:
- ✅ Permissions correctly enforced
- ✅ Staff can edit but not create
- ✅ Access scope restrictions working

---

## Performance Testing

### Test Query Performance

```bash
# 1. Create multiple sub-accounts (10+)
for i in {1..10}; do
  npm run create-dealer -- \
    --parent-id [dealer-id] \
    --email "sub${i}@dealer.com" \
    --name "Sub Account ${i}" \
    --role staff
done

# 2. Time the GSI query
time aws dynamodb query \
  --table-name harborlist-users \
  --index-name ParentDealerIndex \
  --key-condition-expression "parentDealerId = :dealerId" \
  --expression-attribute-values '{":dealerId":{"S":"[dealer-id]"}}' \
  --endpoint-url http://localhost:8000 \
  --region us-east-1

# Performance Goals:
# - Query time < 100ms
# - Efficient pagination support
# - Consistent performance with 50+ sub-accounts
```

---

## Cleanup

```bash
# Delete test accounts from DynamoDB
aws dynamodb delete-item \
  --table-name harborlist-users \
  --key '{"id":{"S":"[dealer-id]"}}' \
  --endpoint-url http://localhost:8000 \
  --region us-east-1

# Repeat for all test sub-accounts
```

---

## Test Results Summary

### Checklist

- [ ] Scenario 1: Create Dealer Account
- [ ] Scenario 2: Create Premium Dealer
- [ ] Scenario 3: Create Manager Sub-Account
- [ ] Scenario 4: Create Staff Sub-Account
- [ ] Scenario 5: Query ParentDealerIndex GSI
- [ ] Scenario 6: API - List Sub-Accounts
- [ ] Scenario 7: API - Create Sub-Account
- [ ] Scenario 8: API - Get Specific Sub-Account
- [ ] Scenario 9: API - Update Sub-Account
- [ ] Scenario 10: API - Delete Sub-Account
- [ ] Scenario 11: Authorization - Tier Requirement
- [ ] Scenario 12: Authorization - Ownership Validation
- [ ] Scenario 13: Permission Enforcement
- [ ] Performance Testing

### Issues Found

| Scenario | Issue Description | Severity | Status |
|----------|------------------|----------|--------|
| | | | |

### Overall Status

- **Phase 2 Implementation**: ✅ COMPLETE
- **All Tests Passing**: [ ] Yes / [ ] No
- **Ready for Phase 3**: [ ] Yes / [ ] No

---

## Next Steps

Once all tests pass:
1. ✅ Mark Phase 2.7 as complete
2. ✅ Document any issues found and resolutions
3. ✅ Proceed to Phase 3: Team-Based Staff Roles
4. ✅ Create comprehensive documentation

---

**Test Date:** October 18, 2025  
**Tester:** [Name]  
**Environment:** Local Development  
**Status:** Ready for Testing
