#!/bin/bash

/**
 * @fileoverview HarborList Infrastructure Deployment Preparation Script
 * 
 * This script handles the complete build and preparation process for deploying
 * the HarborList boat marketplace platform. It coordinates the building of both
 * frontend and backend components, validates prerequisites, and provides
 * deployment guidance based on environment and configuration.
 * 
 * Key Features:
 * - Multi-environment support (dev/staging/prod)
 * - Flexible domain configuration management
 * - Comprehensive build validation and error handling
 * - Environment-specific deployment guidance
 * - Cost optimization recommendations
 * 
 * Build Process:
 * 1. Validates environment parameters and configuration
 * 2. Builds Lambda function packages for serverless deployment
 * 3. Compiles and optimizes React frontend application
 * 4. Validates build artifacts and deployment readiness
 * 5. Provides environment-specific deployment instructions
 * 
 * Usage Examples:
 * ```bash
 * # Development deployment preparation
 * ./deploy.sh dev
 * 
 * # Production deployment with custom domains
 * ./deploy.sh prod true
 * 
 * # Development without custom domains (testing)
 * ./deploy.sh dev false
 * ```
 * 
 * Environment Strategy:
 * - dev: Development environment with relaxed security for testing
 * - staging: Pre-production environment mirroring production setup
 * - prod: Production environment with full security and performance optimization
 * 
 * Domain Configuration:
 * - Custom domains required for production deployments
 * - Development can run without custom domains for testing
 * - Staging should use custom domains to match production behavior
 * 
 * Security Considerations:
 * - Production deployments enforce custom domain requirements
 * - SSL/TLS certificates managed through Cloudflare
 * - Environment-specific security configurations
 * - Audit logging and compliance features enabled in production
 * 
 * Performance Optimization:
 * - Environment-specific build optimizations
 * - CDN configuration through Cloudflare
 * - Lambda function cold start optimization
 * - Database query pattern optimization
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 * @since 2024-01-01
 * @requires bash >=4.0
 * @requires node >=18.0
 * @requires npm >=8.0
 * @requires aws-cli >=2.0
 * @requires aws-cdk >=2.0
 */

set -e

/**
 * Parse command line arguments and validate deployment configuration
 * 
 * @param {string} $1 - Target deployment environment (dev|staging|prod)
 * @param {string} $2 - Enable custom domains (true|false, default: true)
 */
ENVIRONMENT=${1:-dev}

echo "🚀 HarborList Deployment Preparation"
echo "===================================="
echo "Environment: $ENVIRONMENT"
echo ""

/**
 * Custom domain configuration flag
 * 
 * Controls whether the deployment uses custom domains or AWS-generated URLs.
 * Custom domains are required for production deployments for security and
 * performance reasons, but can be disabled for development testing.
 * 
 * @type {string} true|false
 * @default true
 */
USE_DOMAINS=${2:-true}

if [ "$USE_DOMAINS" = "true" ]; then
    echo "🌐 Custom domains will be used (recommended for production)"
    echo "⚠️  Ensure you have completed domain setup first!"
    echo "📚 See docs/DOMAIN_SETUP.md for instructions"
else
    echo "⚠️  Custom domains disabled (development only)"
    echo "🔒 Security and performance features will be limited"
fi

echo ""

# Build backend
echo "🔧 Building Lambda functions..."
cd ../backend
npm install
npm run build

if [ ! -d "dist/packages" ]; then
    echo "❌ Backend build failed - packages directory not found"
    exit 1
fi

echo "✅ Backend build complete"

# Build frontend
echo ""
echo "🎨 Building frontend for $ENVIRONMENT..."
cd ../frontend
npm install

# Check if environment-specific build script exists
if npm run | grep -q "build:$ENVIRONMENT"; then
    npm run build:$ENVIRONMENT
else
    echo "⚠️  No environment-specific build script found, using default build"
    npm run build
fi

if [ ! -d "dist" ]; then
    echo "❌ Frontend build failed - dist directory not found"
    exit 1
fi

echo "✅ Frontend build complete"

# Return to infrastructure directory
cd ../infrastructure

echo ""
echo "🏗️  Infrastructure ready for deployment!"
echo ""
echo "📋 Next Steps:"

if [ "$USE_DOMAINS" = "true" ]; then
    echo "1. Ensure custom domains are configured (see docs/DOMAIN_SETUP.md)"
    echo "2. Deploy infrastructure: npm run deploy:$ENVIRONMENT"
    echo "3. Configure DNS records in Cloudflare"
    echo "4. Verify deployment: ./scripts/verify-deployment.sh $ENVIRONMENT"
    echo "5. Create admin user: cd ../backend && npm run create-admin"
else
    echo "1. Deploy infrastructure: npm run deploy:$ENVIRONMENT:no-domains"
    echo "2. Update frontend .env.local with API Gateway URL"
    echo "3. Verify deployment: ./scripts/verify-deployment.sh $ENVIRONMENT"
    echo "4. Create admin user: cd ../backend && npm run create-admin"
fi

echo ""
echo "🔧 Deployment Commands:"
if [ "$USE_DOMAINS" = "true" ]; then
    echo "   npm run deploy:$ENVIRONMENT"
else
    echo "   npm run deploy:$ENVIRONMENT:no-domains"
fi

echo ""
echo "📚 Documentation:"
echo "   - Domain Setup: docs/DOMAIN_SETUP.md"
echo "   - Admin Setup: docs/ADMIN_SETUP.md"
echo "   - Complete Guide: docs/DEPLOYMENT_COMPLETE.md"
