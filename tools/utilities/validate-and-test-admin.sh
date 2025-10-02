#!/bin/bash

# Admin Infrastructure Validation and Testing Script
# This script runs comprehensive validation and testing of admin infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${1:-dev}

echo -e "${BLUE}=== Admin Infrastructure Validation and Testing ===${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Region: ${YELLOW}${AWS_REGION:-us-east-1}${NC}"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}Error: AWS CLI is not configured or credentials are invalid${NC}"
    exit 1
fi

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
INFRASTRUCTURE_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}Step 1: Building and testing CDK infrastructure${NC}"
cd "$INFRASTRUCTURE_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Run infrastructure tests
echo "Running infrastructure tests..."
if npm test; then
    echo -e "${GREEN}✓ Infrastructure tests passed${NC}"
else
    echo -e "${RED}✗ Infrastructure tests failed${NC}"
    exit 1
fi

# Synthesize CDK template
echo "Synthesizing CDK template..."
if npm run synth:$ENVIRONMENT > /dev/null 2>&1; then
    echo -e "${GREEN}✓ CDK synthesis successful${NC}"
else
    echo -e "${RED}✗ CDK synthesis failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Validating deployed infrastructure${NC}"

# Run infrastructure validation
if node "$SCRIPT_DIR/validate-admin-infrastructure.js" "$ENVIRONMENT"; then
    echo -e "${GREEN}✓ Infrastructure validation passed${NC}"
else
    echo -e "${RED}✗ Infrastructure validation failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 3: Testing admin deployment${NC}"

# Run deployment tests
if node "$SCRIPT_DIR/test-admin-deployment.js" "$ENVIRONMENT"; then
    echo -e "${GREEN}✓ Deployment tests passed${NC}"
else
    echo -e "${RED}✗ Deployment tests failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 4: Generating comprehensive report${NC}"

# Generate combined report
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$INFRASTRUCTURE_DIR/reports/admin-infrastructure-complete-validation-$ENVIRONMENT-$TIMESTAMP.json"

# Create reports directory if it doesn't exist
mkdir -p "$INFRASTRUCTURE_DIR/reports"

# Combine all recent reports
cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "region": "${AWS_REGION:-us-east-1}",
  "validation_summary": {
    "infrastructure_tests": "PASSED",
    "cdk_synthesis": "PASSED", 
    "infrastructure_validation": "PASSED",
    "deployment_tests": "PASSED"
  },
  "recommendations": [
    "Monitor CloudWatch alarms regularly for admin service health",
    "Review audit logs periodically for security compliance",
    "Ensure JWT secret rotation is scheduled",
    "Verify backup and disaster recovery procedures",
    "Test admin dashboard functionality after deployments"
  ],
  "next_steps": [
    "Deploy admin dashboard frontend components",
    "Configure admin user accounts and permissions",
    "Set up monitoring alerts and notifications",
    "Implement admin dashboard security policies",
    "Schedule regular infrastructure health checks"
  ]
}
EOF

echo -e "${GREEN}✓ Comprehensive report generated: $REPORT_FILE${NC}"

echo ""
echo -e "${GREEN}=== All validations and tests completed successfully! ===${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo -e "  • Infrastructure tests: ${GREEN}PASSED${NC}"
echo -e "  • CDK synthesis: ${GREEN}PASSED${NC}"
echo -e "  • Infrastructure validation: ${GREEN}PASSED${NC}"
echo -e "  • Deployment tests: ${GREEN}PASSED${NC}"
echo ""
echo -e "${BLUE}Admin infrastructure is ready for use!${NC}"

# Display useful information
echo ""
echo -e "${YELLOW}Useful AWS Console Links:${NC}"
echo -e "  • CloudWatch Dashboard: https://${AWS_REGION:-us-east-1}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION:-us-east-1}#dashboards:name=admin-service-$ENVIRONMENT"
echo -e "  • DynamoDB Tables: https://${AWS_REGION:-us-east-1}.console.aws.amazon.com/dynamodbv2/home?region=${AWS_REGION:-us-east-1}#tables"
echo -e "  • Lambda Functions: https://${AWS_REGION:-us-east-1}.console.aws.amazon.com/lambda/home?region=${AWS_REGION:-us-east-1}#/functions"
echo -e "  • CloudWatch Alarms: https://${AWS_REGION:-us-east-1}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION:-us-east-1}#alarmsV2:"

exit 0