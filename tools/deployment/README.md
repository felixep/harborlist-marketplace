# Deployment Scripts

This directory contains scripts for deploying and verifying the HarborList Marketplace infrastructure.

## Scripts Overview

### 🚀 **deploy.sh**
**Purpose**: Main deployment script for AWS infrastructure using CDK
- **Usage**: `./deploy.sh [environment]`
- **Environment**: Supports dev, staging, prod
- **Dependencies**: AWS CDK, Node.js, valid AWS credentials
- **Features**:
  - Pre-deployment validation
  - Infrastructure synthesis and deployment
  - Post-deployment health checks
  - Rollback capability on failure

### ✅ **verify-deployment.sh**
**Purpose**: Comprehensive deployment verification and health checks
- **Usage**: `./verify-deployment.sh [stack-name]`
- **Checks**:
  - Stack deployment status
  - API Gateway endpoints
  - DynamoDB table availability
  - S3 bucket configuration
  - Lambda function health
  - CloudWatch alarms
- **Output**: Detailed verification report with pass/fail status

## Usage Examples

```bash
# Deploy to development environment
./deploy.sh dev

# Deploy to production
./deploy.sh prod

# Verify specific stack deployment
./verify-deployment.sh harborlist-dev-stack

# Verify all deployments
./verify-deployment.sh
```

## Prerequisites

- AWS CLI configured with appropriate permissions
- AWS CDK v2 installed globally
- Node.js 18+ installed
- Valid environment variables set

## Related Documentation

- [Main Infrastructure README](../../infrastructure/README.md)
- [Monitoring Scripts](../monitoring/README.md)
- [Cost Management](../cost-management/README.md)