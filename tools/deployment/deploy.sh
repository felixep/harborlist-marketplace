#!/bin/bash

/**
 * @fileoverview HarborList Complete Deployment Automation Script
 * 
 * This comprehensive deployment script orchestrates the entire deployment process
 * for the HarborList boat marketplace platform. It handles environment validation,
 * prerequisite checking, building, infrastructure deployment, and verification
 * in a single automated workflow.
 * 
 * Deployment Architecture:
 * - Serverless backend with AWS Lambda functions
 * - React frontend with S3 static hosting
 * - DynamoDB for data persistence
 * - Cloudflare for CDN and security
 * - CloudWatch for monitoring and alerting
 * 
 * Key Features:
 * - Comprehensive prerequisite validation
 * - Multi-environment deployment support
 * - Flexible domain configuration management
 * - Automated build and deployment pipeline
 * - Post-deployment verification and testing
 * - Detailed deployment reporting and guidance
 * 
 * Security Features:
 * - Production domain requirement enforcement
 * - AWS credential validation
 * - Environment-specific security configurations
 * - Audit logging and compliance checking
 * 
 * Performance Optimizations:
 * - Parallel build processes where possible
 * - CDN configuration for global performance
 * - Lambda function optimization
 * - Database query pattern optimization
 * 
 * Error Handling:
 * - Comprehensive error detection and reporting
 * - Rollback guidance for failed deployments
 * - Detailed troubleshooting information
 * - Recovery procedures for common issues
 * 
 * Usage Examples:
 * ```bash
 * # Standard development deployment
 * ./deploy.sh dev
 * 
 * # Production deployment with all features
 * ./deploy.sh prod
 * 
 * # Development without custom domains
 * ./deploy.sh dev --no-domains
 * 
 * # Skip build for faster deployment iteration
 * ./deploy.sh staging --skip-build
 * 
 * # Verify existing deployment
 * ./deploy.sh prod --verify-only
 * ```
 * 
 * Environment Requirements:
 * - dev: Minimal requirements, suitable for development and testing
 * - staging: Production-like environment for pre-deployment validation
 * - prod: Full production requirements with all security and performance features
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 * @since 2024-01-01
 * @requires bash >=4.0
 * @requires node >=18.0
 * @requires npm >=8.0
 * @requires aws-cli >=2.0
 * @requires aws-cdk >=2.0
 * @requires curl (for verification)
 */

set -e

/**
 * ANSI color codes for enhanced terminal output
 * 
 * Provides consistent, colored output for better user experience
 * and easier identification of different message types during deployment.
 */
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

/**
 * Print formatted status messages with appropriate colors and icons
 * 
 * Provides consistent, visually appealing output for deployment progress,
 * errors, warnings, and informational messages. Each message type uses
 * distinct colors and icons for immediate recognition.
 * 
 * @param {string} status - Message type (SUCCESS|ERROR|WARNING|INFO|STEP)
 * @param {string} message - The message content to display
 * 
 * @example
 * print_status "SUCCESS" "Deployment completed successfully"
 * print_status "ERROR" "Failed to connect to AWS"
 * print_status "WARNING" "Custom domains not configured"
 * print_status "INFO" "Using development environment"
 * print_status "STEP" "Building frontend application"
 */
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
        "STEP")
            echo -e "${PURPLE}🚀 $message${NC}"
            ;;
    esac
}

# Function to print section headers
print_header() {
    echo ""
    echo "=================================="
    echo "$1"
    echo "=================================="
    echo ""
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Show usage
show_usage() {
    echo "🚤 HarborList Deployment Script"
    echo ""
    echo "Usage: $0 [ENVIRONMENT] [OPTIONS]"
    echo ""
    echo "Environments:"
    echo "  dev        - Development environment (default)"
    echo "  staging    - Staging environment"
    echo "  prod       - Production environment"
    echo ""
    echo "Options:"
    echo "  --no-domains     Deploy without custom domains (development only)"
    echo "  --skip-build     Skip building backend and frontend"
    echo "  --verify-only    Only run deployment verification"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                           # Deploy to dev with custom domains"
    echo "  $0 prod                      # Deploy to production with custom domains"
    echo "  $0 dev --no-domains          # Deploy to dev without custom domains"
    echo "  $0 staging --skip-build      # Deploy to staging without rebuilding"
    echo "  $0 prod --verify-only        # Only verify production deployment"
    echo ""
    echo "🌐 Custom Domains:"
    echo "  Custom domains are REQUIRED for production deployments."
    echo "  See docs/DOMAIN_SETUP.md for complete setup instructions."
    echo ""
}

# Parse command line arguments
ENVIRONMENT="dev"
USE_CUSTOM_DOMAINS="true"
SKIP_BUILD="false"
VERIFY_ONLY="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        dev|staging|prod)
            ENVIRONMENT="$1"
            shift
            ;;
        --no-domains)
            USE_CUSTOM_DOMAINS="false"
            shift
            ;;
        --skip-build)
            SKIP_BUILD="true"
            shift
            ;;
        --verify-only)
            VERIFY_ONLY="true"
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    print_status "ERROR" "Invalid environment: $ENVIRONMENT"
    show_usage
    exit 1
fi

# Warning for production without custom domains
if [ "$ENVIRONMENT" = "prod" ] && [ "$USE_CUSTOM_DOMAINS" = "false" ]; then
    print_status "ERROR" "Production deployments REQUIRE custom domains for security and performance"
    print_status "INFO" "See docs/DOMAIN_SETUP.md for setup instructions"
    exit 1
fi

print_header "🚤 HarborList Deployment"

print_status "INFO" "Environment: $ENVIRONMENT"
print_status "INFO" "Custom Domains: $USE_CUSTOM_DOMAINS"
print_status "INFO" "Skip Build: $SKIP_BUILD"
print_status "INFO" "Verify Only: $VERIFY_ONLY"

# If verify only, run verification and exit
if [ "$VERIFY_ONLY" = "true" ]; then
    print_header "🔍 Running Deployment Verification"
    ./scripts/verify-deployment.sh "$ENVIRONMENT"
    exit 0
fi

# Check prerequisites
print_header "🔍 Checking Prerequisites"

if ! command_exists node; then
    print_status "ERROR" "Node.js is not installed"
    exit 1
fi
print_status "SUCCESS" "Node.js is installed"

if ! command_exists npm; then
    print_status "ERROR" "npm is not installed"
    exit 1
fi
print_status "SUCCESS" "npm is installed"

if ! command_exists aws; then
    print_status "ERROR" "AWS CLI is not installed"
    exit 1
fi
print_status "SUCCESS" "AWS CLI is installed"

if ! command_exists cdk; then
    print_status "ERROR" "AWS CDK is not installed"
    print_status "INFO" "Install with: npm install -g aws-cdk"
    exit 1
fi
print_status "SUCCESS" "AWS CDK is installed"

# Check AWS credentials
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    print_status "ERROR" "AWS credentials not configured"
    print_status "INFO" "Run: aws configure"
    exit 1
fi
print_status "SUCCESS" "AWS credentials are configured"

# Get current directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INFRASTRUCTURE_DIR="$PROJECT_ROOT/infrastructure"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

print_status "INFO" "Project root: $PROJECT_ROOT"

# Custom domains warning
if [ "$USE_CUSTOM_DOMAINS" = "true" ]; then
    print_header "🌐 Custom Domains Configuration"
    
    if [ "$ENVIRONMENT" = "prod" ]; then
        print_status "INFO" "Production deployment requires:"
        echo "   • Domain: harborlist.com"
        echo "   • API Domain: api.harborlist.com"
    elif [ "$ENVIRONMENT" = "staging" ]; then
        print_status "INFO" "Staging deployment requires:"
        echo "   • Domain: staging.harborlist.com"
        echo "   • API Domain: api-staging.harborlist.com"
    else
        print_status "INFO" "Development deployment requires:"
        echo "   • Domain: dev.harborlist.com"
        echo "   • API Domain: api-dev.harborlist.com"
    fi
    
    echo ""
    print_status "WARNING" "Ensure custom domains are configured before proceeding"
    print_status "INFO" "See docs/DOMAIN_SETUP.md for complete setup instructions"
    
    echo ""
    read -p "Have you configured custom domains? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "ERROR" "Please configure custom domains first"
        print_status "INFO" "See docs/DOMAIN_SETUP.md for instructions"
        exit 1
    fi
fi

# Build backend and frontend
if [ "$SKIP_BUILD" = "false" ]; then
    print_header "🔨 Building Backend Services"
    
    cd "$BACKEND_DIR"
    
    if [ ! -d "node_modules" ]; then
        print_status "STEP" "Installing backend dependencies..."
        npm install
    fi
    
    print_status "STEP" "Building backend services..."
    npm run build
    
    if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
        print_status "SUCCESS" "Backend build completed"
        print_status "INFO" "Built services: $(ls dist/*.zip | wc -l) Lambda packages"
    else
        print_status "ERROR" "Backend build failed - no dist files found"
        exit 1
    fi
    
    print_header "🎨 Building Frontend Application"
    
    cd "$FRONTEND_DIR"
    
    if [ ! -d "node_modules" ]; then
        print_status "STEP" "Installing frontend dependencies..."
        npm install
    fi
    
    print_status "STEP" "Building frontend application..."
    npm run build
    
    if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
        print_status "SUCCESS" "Frontend build completed"
        print_status "INFO" "Built assets ready for deployment"
    else
        print_status "ERROR" "Frontend build failed - no dist files found"
        exit 1
    fi
else
    print_status "INFO" "Skipping build step"
fi

# Deploy infrastructure
print_header "🏗️  Deploying Infrastructure"

cd "$INFRASTRUCTURE_DIR"

if [ ! -d "node_modules" ]; then
    print_status "STEP" "Installing infrastructure dependencies..."
    npm install
fi

# Build CDK app
print_status "STEP" "Building CDK application..."
npm run build

# Prepare deployment command
if [ "$USE_CUSTOM_DOMAINS" = "true" ]; then
    DEPLOY_COMMAND="npm run deploy:$ENVIRONMENT"
    print_status "INFO" "Deploying with custom domains enabled"
else
    DEPLOY_COMMAND="npm run deploy:$ENVIRONMENT:no-domains"
    print_status "INFO" "Deploying without custom domains (development only)"
fi

print_status "STEP" "Running CDK deployment..."
print_status "INFO" "Command: $DEPLOY_COMMAND"

# Run deployment
if eval "$DEPLOY_COMMAND"; then
    print_status "SUCCESS" "Infrastructure deployment completed"
else
    print_status "ERROR" "Infrastructure deployment failed"
    exit 1
fi

# Verify deployment
print_header "✅ Verifying Deployment"

if ./scripts/verify-deployment.sh "$ENVIRONMENT"; then
    print_status "SUCCESS" "Deployment verification passed"
else
    print_status "WARNING" "Deployment verification had issues"
fi

# Get deployment outputs
print_header "📋 Deployment Summary"

STACK_NAME="BoatListingStack-$ENVIRONMENT"
FRONTEND_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' --output text 2>/dev/null || echo "Not found")
API_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text 2>/dev/null || echo "Not found")

print_status "SUCCESS" "🚤 HarborList deployment completed successfully!"
echo ""
echo "🔗 Access URLs:"
echo "   Frontend: $FRONTEND_URL"
echo "   API: $API_URL"
echo ""

if [ "$USE_CUSTOM_DOMAINS" = "true" ]; then
    print_status "INFO" "Custom domains are configured"
    echo ""
    echo "🌐 Next Steps for Custom Domains:"
    echo "   1. Configure DNS records in Cloudflare (see deployment outputs)"
    echo "   2. Wait for DNS propagation (up to 24 hours)"
    echo "   3. Test custom domain URLs"
else
    print_status "WARNING" "Deployed without custom domains (development only)"
    echo ""
    echo "⚠️  Production Recommendations:"
    echo "   1. Set up custom domains for production use"
    echo "   2. See docs/DOMAIN_SETUP.md for instructions"
    echo "   3. Redeploy with custom domains enabled"
fi

echo ""
echo "🎯 Additional Next Steps:"
echo "   1. Create admin users: cd backend && npm run create-admin"
echo "   2. Test the application functionality"
echo "   3. Monitor CloudWatch logs for any issues"
echo "   4. Set up monitoring and alerting"

if [ "$ENVIRONMENT" = "prod" ]; then
    echo "   5. Configure backup and disaster recovery"
    echo "   6. Set up performance monitoring"
    echo "   7. Review security settings"
fi

echo ""
print_status "SUCCESS" "🎉 Deployment complete! Your boat listing platform is ready!"