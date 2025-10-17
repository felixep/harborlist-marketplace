#!/bin/bash

# Test script for dual Cognito authentication setup
# This script validates that both Customer and Staff User Pools are working correctly

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
LOCALSTACK_ENDPOINT="${LOCALSTACK_ENDPOINT:-http://localhost:4566}"
AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_DEFAULT_REGION="us-east-1"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_test() {
    echo -e "${BLUE}🧪 $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    # Check if LocalStack is running
    if ! curl -s "$LOCALSTACK_ENDPOINT/_localstack/health" >/dev/null 2>&1; then
        print_error "LocalStack is not running. Please start it first:"
        echo "  docker-compose --profile enhanced up"
        exit 1
    fi
    
    # Check if Cognito service is available
    if ! curl -s "$LOCALSTACK_ENDPOINT/_localstack/health" | grep -q '"cognito-idp": "available"'; then
        print_error "Cognito service is not available in LocalStack"
        exit 1
    fi
    
    # Check if AWS CLI is available
    if ! command -v aws >/dev/null 2>&1; then
        print_error "AWS CLI is not installed"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Function to test Customer User Pool
test_customer_pool() {
    print_test "Testing Customer User Pool..."
    
    # List User Pools and find Customer pool
    CUSTOMER_POOLS=$(aws cognito-idp list-user-pools \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --max-items 10 \
        --query 'UserPools[?contains(Name, `customer`) || contains(Name, `Customer`)].{Id:Id,Name:Name}' \
        --output json)
    
    if [ "$CUSTOMER_POOLS" = "[]" ]; then
        print_error "No Customer User Pool found"
        return 1
    fi
    
    CUSTOMER_POOL_ID=$(echo "$CUSTOMER_POOLS" | jq -r '.[0].Id')
    CUSTOMER_POOL_NAME=$(echo "$CUSTOMER_POOLS" | jq -r '.[0].Name')
    
    print_status "Found Customer User Pool: $CUSTOMER_POOL_NAME ($CUSTOMER_POOL_ID)"
    
    # Test Customer Groups
    print_test "Checking Customer Groups..."
    CUSTOMER_GROUPS=$(aws cognito-idp list-groups \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --user-pool-id "$CUSTOMER_POOL_ID" \
        --query 'Groups[].GroupName' \
        --output json)
    
    EXPECTED_GROUPS=("individual-customers" "dealer-customers" "premium-customers")
    for group in "${EXPECTED_GROUPS[@]}"; do
        if echo "$CUSTOMER_GROUPS" | grep -q "\"$group\""; then
            print_status "Customer group '$group' exists"
        else
            print_error "Customer group '$group' missing"
            return 1
        fi
    done
    
    # Test Customer User Pool Client
    print_test "Checking Customer User Pool Client..."
    CUSTOMER_CLIENTS=$(aws cognito-idp list-user-pool-clients \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --user-pool-id "$CUSTOMER_POOL_ID" \
        --query 'UserPoolClients[].ClientName' \
        --output json)
    
    if echo "$CUSTOMER_CLIENTS" | grep -q "customer"; then
        print_status "Customer User Pool Client exists"
    else
        print_error "Customer User Pool Client missing"
        return 1
    fi
    
    # Test Customer test users
    print_test "Checking Customer test users..."
    TEST_USERS=("individual@test.com" "dealer@test.com" "premium@test.com")
    for user in "${TEST_USERS[@]}"; do
        if aws cognito-idp admin-get-user \
            --endpoint-url="$LOCALSTACK_ENDPOINT" \
            --user-pool-id "$CUSTOMER_POOL_ID" \
            --username "$user" >/dev/null 2>&1; then
            print_status "Customer test user '$user' exists"
        else
            print_warning "Customer test user '$user' missing"
        fi
    done
    
    print_status "Customer User Pool tests completed"
}

# Function to test Staff User Pool
test_staff_pool() {
    print_test "Testing Staff User Pool..."
    
    # List User Pools and find Staff pool
    STAFF_POOLS=$(aws cognito-idp list-user-pools \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --max-items 10 \
        --query 'UserPools[?contains(Name, `staff`) || contains(Name, `Staff`)].{Id:Id,Name:Name}' \
        --output json)
    
    if [ "$STAFF_POOLS" = "[]" ]; then
        print_error "No Staff User Pool found"
        return 1
    fi
    
    STAFF_POOL_ID=$(echo "$STAFF_POOLS" | jq -r '.[0].Id')
    STAFF_POOL_NAME=$(echo "$STAFF_POOLS" | jq -r '.[0].Name')
    
    print_status "Found Staff User Pool: $STAFF_POOL_NAME ($STAFF_POOL_ID)"
    
    # Test Staff Groups
    print_test "Checking Staff Groups..."
    STAFF_GROUPS=$(aws cognito-idp list-groups \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --user-pool-id "$STAFF_POOL_ID" \
        --query 'Groups[].GroupName' \
        --output json)
    
    EXPECTED_GROUPS=("super-admin" "admin" "manager" "team-member")
    for group in "${EXPECTED_GROUPS[@]}"; do
        if echo "$STAFF_GROUPS" | grep -q "\"$group\""; then
            print_status "Staff group '$group' exists"
        else
            print_error "Staff group '$group' missing"
            return 1
        fi
    done
    
    # Test Staff User Pool Client
    print_test "Checking Staff User Pool Client..."
    STAFF_CLIENTS=$(aws cognito-idp list-user-pool-clients \
        --endpoint-url="$LOCALSTACK_ENDPOINT" \
        --user-pool-id "$STAFF_POOL_ID" \
        --query 'UserPoolClients[].ClientName' \
        --output json)
    
    if echo "$STAFF_CLIENTS" | grep -q "staff"; then
        print_status "Staff User Pool Client exists"
    else
        print_error "Staff User Pool Client missing"
        return 1
    fi
    
    # Test Staff test users
    print_test "Checking Staff test users..."
    TEST_USERS=("superadmin@test.com" "admin@test.com")
    for user in "${TEST_USERS[@]}"; do
        if aws cognito-idp admin-get-user \
            --endpoint-url="$LOCALSTACK_ENDPOINT" \
            --user-pool-id "$STAFF_POOL_ID" \
            --username "$user" >/dev/null 2>&1; then
            print_status "Staff test user '$user' exists"
        else
            print_warning "Staff test user '$user' missing"
        fi
    done
    
    print_status "Staff User Pool tests completed"
}

# Function to test authentication flows
test_auth_flows() {
    print_test "Testing authentication flows..."
    
    # This would require the backend service to be running
    # For now, we'll just check if the auth endpoints would be accessible
    
    BACKEND_URL="http://localhost:3001"
    
    if curl -s "$BACKEND_URL/health" >/dev/null 2>&1; then
        print_status "Backend service is running"
        
        # Test customer auth endpoint
        if curl -s "$BACKEND_URL/auth/customer/health" >/dev/null 2>&1; then
            print_status "Customer auth endpoint is accessible"
        else
            print_warning "Customer auth endpoint not accessible"
        fi
        
        # Test staff auth endpoint
        if curl -s "$BACKEND_URL/auth/staff/health" >/dev/null 2>&1; then
            print_status "Staff auth endpoint is accessible"
        else
            print_warning "Staff auth endpoint not accessible"
        fi
    else
        print_warning "Backend service is not running - skipping auth flow tests"
        print_info "Start backend with: docker-compose --profile enhanced up"
    fi
}

# Function to test cross-pool security
test_cross_pool_security() {
    print_test "Testing cross-pool security..."
    
    # This test would verify that customer tokens can't access staff endpoints
    # and vice versa. This requires the backend service and actual token generation.
    
    print_info "Cross-pool security tests require running backend service"
    print_info "Manual testing required with actual authentication flows"
}

# Function to generate test report
generate_report() {
    echo ""
    echo "📊 Test Report Summary"
    echo "====================="
    echo "✅ LocalStack Cognito dual auth setup validation completed"
    echo ""
    echo "🔧 Next Steps:"
    echo "1. Start the full development environment:"
    echo "   docker-compose --profile enhanced up"
    echo ""
    echo "2. Test authentication flows manually:"
    echo "   - Customer login: individual@test.com / TempPass123!"
    echo "   - Staff login: admin@test.com / TempPass123!@#"
    echo ""
    echo "3. Verify cross-pool security in your application"
    echo ""
    echo "📖 For more information, see the authentication documentation."
}

# Main function
main() {
    echo "🧪 HarborList Dual Auth Testing Suite"
    echo "===================================="
    echo ""
    
    check_prerequisites
    echo ""
    
    test_customer_pool
    echo ""
    
    test_staff_pool
    echo ""
    
    test_auth_flows
    echo ""
    
    test_cross_pool_security
    echo ""
    
    generate_report
}

# Run main function
main "$@"