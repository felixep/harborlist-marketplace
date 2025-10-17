# End-to-End Testing Guide for Dual Cognito Authentication

## Overview

This guide provides comprehensive testing procedures for the dual Cognito User Pool authentication system using the automated deployment script. It covers local environment deployment, authentication flow testing, and security validation.

## Prerequisites

Before starting the testing process, ensure you have:

- Docker and Docker Compose installed
- Node.js 18+ installed
- AWS CLI configured (for AWS environment testing)
- Host file entries configured for custom domains (optional but recommended)

## Phase 1: Local Environment Deployment

### Step 1: Deploy Local Environment

Use the updated deployment script to deploy the complete local environment:

```bash
# Navigate to project root
cd /path/to/harborlist-marketplace

# Deploy local environment with dual Cognito authentication
./tools/deployment/deploy.sh local
```

### Expected Deployment Output

The deployment script should:

1. ✅ Check Docker prerequisites
2. ✅ Start Docker Compose services with enhanced profile
3. ✅ Wait for LocalStack to be ready
4. ✅ Create LocalStack Cognito User Pools automatically
5. ✅ Set up Customer User Pool with groups (individual, dealer, premium)
6. ✅ Set up Staff User Pool with groups (super-admin, admin, manager, team-member)
7. ✅ Create test users for all tiers and roles
8. ✅ Generate `.env.local` with configuration
9. ✅ Run authentication validation tests
10. ✅ Display access information and test credentials

### Verification Checklist

After deployment, verify the following:

- [ ] All Docker services are running (`docker-compose ps`)
- [ ] LocalStack is accessible at http://localhost:4566
- [ ] Auth service is accessible at http://localhost:3001
- [ ] Frontend is accessible at http://localhost:3000
- [ ] `.env.local` file is created with Cognito configuration
- [ ] Test users are created and accessible

### Test User Credentials

The deployment script creates the following test users:

| User Type | Email | Password | Tier/Role | Pool |
|-----------|-------|----------|-----------|------|
| Customer (Individual) | test.customer@example.com | CustomerPass123! | individual-customers | Customer Pool |
| Customer (Dealer) | test.dealer@example.com | DealerPass123! | dealer-customers | Customer Pool |
| Staff (Admin) | test.admin@example.com | AdminPass123!@# | admin | Staff Pool |

## Phase 2: Customer Authentication Flow Testing

### Test 2.1: Customer Registration

Test new customer registration through the auth service:

```bash
# Test customer registration
curl -X POST http://localhost:3001/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newcustomer@example.com",
    "password": "NewCustomer123!",
    "name": "New Customer",
    "tier": "individual"
  }'
```

**Expected Result**: 
- ✅ Registration successful
- ✅ User created in Customer User Pool
- ✅ User assigned to individual-customers group
- ✅ Confirmation email sent (check SMTP4Dev at http://localhost:5001)

### Test 2.2: Customer Login (Individual Tier)

Test individual customer login:

```bash
# Test individual customer login
curl -X POST http://localhost:3001/auth/customer/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.customer@example.com",
    "password": "CustomerPass123!"
  }'
```

**Expected Result**:
- ✅ Login successful
- ✅ Access token returned
- ✅ Refresh token returned
- ✅ Token contains customer tier claims
- ✅ Token valid for 1 hour

### Test 2.3: Customer Login (Dealer Tier)

Test dealer customer login:

```bash
# Test dealer customer login
curl -X POST http://localhost:3001/auth/customer/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.dealer@example.com",
    "password": "DealerPass123!"
  }'
```

**Expected Result**:
- ✅ Login successful
- ✅ Access token contains dealer tier claims
- ✅ Enhanced permissions available

### Test 2.4: Customer API Access

Test customer API access with different tiers:

```bash
# Save customer token from login response
CUSTOMER_TOKEN="<access_token_from_login>"

# Test customer profile access
curl -X GET http://localhost:3001/api/customer/profile \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"

# Test customer listings access
curl -X GET http://localhost:3001/api/customer/listings \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"
```

**Expected Result**:
- ✅ Customer endpoints accessible with customer token
- ✅ Proper authorization based on tier
- ✅ API Gateway authorizer validates token correctly

### Test 2.5: Customer Token Refresh

Test customer token refresh:

```bash
# Save refresh token from login response
REFRESH_TOKEN="<refresh_token_from_login>"

# Test token refresh
curl -X POST http://localhost:3001/auth/customer/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "'$REFRESH_TOKEN'"
  }'
```

**Expected Result**:
- ✅ New access token returned
- ✅ Token refresh successful
- ✅ New token valid for 1 hour

## Phase 3: Staff Authentication Flow Testing

### Test 3.1: Staff Login

Test staff login with admin user:

```bash
# Test staff login
curl -X POST http://localhost:3001/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.admin@example.com",
    "password": "AdminPass123!@#"
  }'
```

**Expected Result**:
- ✅ Login successful
- ✅ Access token returned with 8-hour TTL
- ✅ Staff role claims included
- ✅ MFA challenge handled (if configured)

### Test 3.2: Staff API Access

Test staff API access with admin endpoints:

```bash
# Save staff token from login response
STAFF_TOKEN="<access_token_from_staff_login>"

# Test admin user management access
curl -X GET http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer $STAFF_TOKEN"

# Test admin analytics access
curl -X GET http://localhost:3001/api/admin/analytics \
  -H "Authorization: Bearer $STAFF_TOKEN"
```

**Expected Result**:
- ✅ Admin endpoints accessible with staff token
- ✅ Proper authorization based on role
- ✅ Staff authorizer validates token correctly

### Test 3.3: Admin Interface Integration

Test admin interface integration:

1. **Open Admin Interface**: Navigate to http://localhost:3000/admin
2. **Login with Staff Credentials**: 
   - Email: test.admin@example.com
   - Password: AdminPass123!@#
3. **Verify Admin Functionality**:
   - ✅ Login successful through admin interface
   - ✅ Admin dashboard loads correctly
   - ✅ Staff permissions applied correctly
   - ✅ Session management works (8-hour TTL)

### Test 3.4: Staff Token Refresh

Test staff token refresh:

```bash
# Save refresh token from staff login response
STAFF_REFRESH_TOKEN="<refresh_token_from_staff_login>"

# Test staff token refresh
curl -X POST http://localhost:3001/auth/staff/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "'$STAFF_REFRESH_TOKEN'"
  }'
```

**Expected Result**:
- ✅ New staff access token returned
- ✅ Token valid for 8 hours
- ✅ Staff permissions maintained

## Phase 4: Cross-Pool Security Testing

### Test 4.1: Customer Token on Staff Endpoints

Test that customer tokens cannot access staff endpoints:

```bash
# Use customer token on admin endpoint
curl -X GET http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"
```

**Expected Result**:
- ❌ Access denied (403 Forbidden)
- ✅ Cross-pool access prevented
- ✅ Security error logged

### Test 4.2: Staff Token on Customer Endpoints

Test that staff tokens cannot access customer endpoints:

```bash
# Use staff token on customer endpoint
curl -X GET http://localhost:3001/api/customer/profile \
  -H "Authorization: Bearer $STAFF_TOKEN"
```

**Expected Result**:
- ❌ Access denied (403 Forbidden)
- ✅ Cross-pool access prevented
- ✅ Security error logged

### Test 4.3: Invalid Token Handling

Test invalid token handling:

```bash
# Test with invalid token
curl -X GET http://localhost:3001/api/customer/profile \
  -H "Authorization: Bearer invalid_token_here"
```

**Expected Result**:
- ❌ Access denied (401 Unauthorized)
- ✅ Invalid token detected
- ✅ Proper error response

## Phase 5: Deployment Features Testing

### Test 5.1: Authentication Validation Script

The deployment script includes automated authentication validation:

```bash
# Run authentication validation manually
./tools/development/test-dual-auth.sh
```

**Expected Result**:
- ✅ Customer authentication test passes
- ✅ Staff authentication test passes
- ✅ All authentication endpoints functional

### Test 5.2: Health Check Functionality

Test the health check script:

```bash
# Run health check
./scripts/health-check.sh
```

**Expected Result**:
- ✅ All services running
- ✅ LocalStack Cognito available
- ✅ Authentication service healthy
- ✅ Database connections working

### Test 5.3: Environment Configuration

Verify environment configuration:

```bash
# Check environment variables
cat .env.local

# Verify Cognito configuration
echo "Customer Pool ID: $CUSTOMER_POOL_ID"
echo "Staff Pool ID: $STAFF_POOL_ID"
```

**Expected Result**:
- ✅ All required environment variables set
- ✅ Cognito Pool IDs configured
- ✅ LocalStack endpoints configured

## Phase 6: Performance and Load Testing

### Test 6.1: Concurrent Authentication

Test concurrent authentication requests:

```bash
# Run multiple authentication requests simultaneously
for i in {1..10}; do
  curl -X POST http://localhost:3001/auth/customer/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test.customer@example.com",
      "password": "CustomerPass123!"
    }' &
done
wait
```

**Expected Result**:
- ✅ All requests handled successfully
- ✅ No authentication failures
- ✅ Reasonable response times

### Test 6.2: Token Validation Performance

Test token validation performance:

```bash
# Run multiple API requests with tokens
for i in {1..20}; do
  curl -X GET http://localhost:3001/api/customer/profile \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" &
done
wait
```

**Expected Result**:
- ✅ All requests authorized successfully
- ✅ Fast token validation
- ✅ No performance degradation

## Troubleshooting Common Issues

### Issue 1: LocalStack Not Ready

**Symptoms**: Cognito setup fails, connection refused errors

**Solution**:
```bash
# Check LocalStack status
curl http://localhost:4566/health

# Restart LocalStack if needed
docker-compose -f docker-compose.local.yml restart localstack

# Wait and retry setup
sleep 10
./tools/development/setup-local-cognito.sh
```

### Issue 2: Authentication Service Not Responding

**Symptoms**: Auth endpoints return connection errors

**Solution**:
```bash
# Check auth service logs
docker-compose -f docker-compose.local.yml logs auth-service

# Restart auth service
docker-compose -f docker-compose.local.yml restart auth-service

# Verify environment variables
docker-compose -f docker-compose.local.yml exec auth-service env | grep COGNITO
```

### Issue 3: Test Users Not Created

**Symptoms**: Login fails with user not found errors

**Solution**:
```bash
# Manually run Cognito setup
./tools/development/setup-local-cognito.sh

# Verify users exist in LocalStack
aws cognito-idp list-users \
  --user-pool-id $CUSTOMER_POOL_ID \
  --endpoint-url http://localhost:4566
```

### Issue 4: Cross-Pool Access Not Blocked

**Symptoms**: Customer tokens work on admin endpoints

**Solution**:
```bash
# Check authorizer configuration
docker-compose -f docker-compose.local.yml logs api-gateway

# Verify token validation logic
# Check authorizer Lambda function logs
```

## Test Results Documentation

Document all test results in `roadmaps/auth-refactor/testing-results.md`:

### Template for Test Results

```markdown
# Testing Results - Dual Cognito Authentication

## Test Execution Date
[Date and Time]

## Environment
- Local development with LocalStack
- Docker Compose version: [version]
- LocalStack version: [version]

## Test Results Summary

### Phase 1: Deployment ✅ PASSED
- [x] Local environment deployed successfully
- [x] LocalStack Cognito configured
- [x] Test users created
- [x] Services started correctly

### Phase 2: Customer Authentication ✅ PASSED
- [x] Customer registration working
- [x] Individual tier login successful
- [x] Dealer tier login successful
- [x] Customer API access validated
- [x] Token refresh working

### Phase 3: Staff Authentication ✅ PASSED
- [x] Staff login successful
- [x] Admin API access validated
- [x] Admin interface integration working
- [x] Staff token refresh working

### Phase 4: Cross-Pool Security ✅ PASSED
- [x] Customer tokens blocked from staff endpoints
- [x] Staff tokens blocked from customer endpoints
- [x] Invalid tokens properly rejected

### Phase 5: Deployment Features ✅ PASSED
- [x] Authentication validation script working
- [x] Health checks passing
- [x] Environment configuration correct

### Phase 6: Performance Testing ✅ PASSED
- [x] Concurrent authentication handled
- [x] Token validation performance acceptable

## Issues Found
[List any issues discovered during testing]

## Recommendations
[List any recommendations for improvements]
```

## Next Steps

After completing all tests successfully:

1. **Update Milestone Tracking**: Update `roadmaps/auth-refactor/milestones.md`
2. **Commit Changes**: Make final commit with comprehensive testing results
3. **Prepare for AWS Deployment**: Use lessons learned for AWS environment testing
4. **Document Lessons Learned**: Update deployment guide with any improvements

This comprehensive testing guide ensures the dual Cognito authentication system is thoroughly validated before moving to production deployment.