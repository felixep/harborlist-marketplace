# Deployment Scripts

This section documents all scripts responsible for deploying, updating, and managing the HarborList infrastructure lifecycle.

## 📋 Scripts Overview

| Script | Purpose | Type | Usage |
|---|---|---|---|
| `deploy.sh` | Complete infrastructure deployment | Shell | Primary deployment automation |
| `verify-deployment.sh` | Post-deployment verification | Shell | Deployment validation |

---

## 🚀 deploy.sh

**Primary deployment automation script for HarborList infrastructure**

### Purpose
Orchestrates the complete deployment process for the HarborList boat marketplace platform, handling environment validation, building, infrastructure deployment, and verification in a single automated workflow.

### Key Features
- **Comprehensive prerequisite validation**
- **Multi-environment deployment support** (dev/staging/prod)
- **Flexible domain configuration management**
- **Automated build and deployment pipeline**
- **Post-deployment verification and testing**
- **Detailed deployment reporting and guidance**

### Architecture Support
- Serverless backend with AWS Lambda functions
- React frontend with S3 static hosting
- DynamoDB for data persistence
- Cloudflare for CDN and security
- CloudWatch for monitoring and alerting

### Security Features
- Production domain requirement enforcement
- AWS credential validation
- Environment-specific security configurations
- Audit logging and compliance checking

### Usage

```bash
# Standard development deployment
./deploy.sh dev

# Staging deployment
./deploy.sh staging

# Production deployment with all features
./deploy.sh prod

# Development deployment without custom domains
./deploy.sh dev --no-domains

# Production deployment with custom domains
./deploy.sh prod --with-domains
```

### Parameters

| Parameter | Description | Required | Default |
|---|---|---|---|
| `environment` | Target environment (dev/staging/prod) | Yes | - |
| `--no-domains` | Deploy without custom domain configuration | No | false |
| `--with-domains` | Force custom domain configuration | No | false |
| `--skip-build` | Skip frontend/backend build steps | No | false |
| `--dry-run` | Perform validation without actual deployment | No | false |

### Prerequisites
- AWS CLI configured with valid credentials
- Node.js 18+ installed
- CDK CLI installed globally
- Appropriate IAM permissions for target environment

### Process Flow

1. **Environment Validation**
   - Validates AWS credentials and permissions
   - Checks CDK bootstrap status
   - Verifies environment-specific requirements

2. **Prerequisite Checking**
   - Validates Node.js and npm versions
   - Checks for required dependencies
   - Verifies AWS services availability

3. **Build Process**
   - Compiles TypeScript backend code
   - Builds optimized frontend bundles
   - Creates Lambda deployment packages

4. **Infrastructure Deployment**
   - Synthesizes CDK templates
   - Deploys AWS resources via CloudFormation
   - Configures environment variables

5. **Post-Deployment Verification**
   - Tests API endpoints
   - Validates frontend accessibility
   - Verifies database connectivity

6. **Reporting**
   - Generates deployment summary
   - Provides access URLs and configuration details
   - Offers troubleshooting guidance

### Output
```bash
✅ Deployment completed successfully!

📊 Deployment Summary:
   Environment: dev
   Stack Name: BoatListingStack-dev
   Region: us-east-1
   
🔗 Access URLs:
   Frontend: https://dev.harborlist.com
   API: https://api-dev.harborlist.com
   Admin Dashboard: https://dev.harborlist.com/admin
   
📋 Next Steps:
   1. Configure Cloudflare tunnel: ./scripts/cloudflare-tunnel-validation.js
   2. Set up monitoring: ./scripts/setup-monitoring.sh
   3. Run tests: ./scripts/run-performance-tests.sh
```

### Error Handling
- Comprehensive error detection and reporting
- Rollback guidance for failed deployments
- Detailed troubleshooting information
- Recovery procedures for common issues

### Log Files
- Deployment logs: `infrastructure/reports/deployment-{timestamp}.log`
- Error logs: `infrastructure/reports/deployment-errors-{timestamp}.log`
- CDK outputs: `infrastructure/cdk.out/`

---

## ✅ verify-deployment.sh

**Post-deployment verification and validation script**

### Purpose
Performs comprehensive testing and validation of deployed infrastructure to ensure all components are functioning correctly and meet performance requirements.

### Key Features
- **API endpoint testing**
- **Frontend accessibility validation**
- **Database connectivity verification**
- **Performance benchmarking**
- **Security configuration validation**
- **Integration testing**

### Usage

```bash
# Basic deployment verification
./verify-deployment.sh

# Verify specific environment
./verify-deployment.sh --env dev

# Full verification with performance tests
./verify-deployment.sh --full

# Quick health check only
./verify-deployment.sh --quick
```

### Parameters

| Parameter | Description | Required | Default |
|---|---|---|---|
| `--env` | Target environment to verify | No | dev |
| `--full` | Run comprehensive verification suite | No | false |
| `--quick` | Run only basic health checks | No | false |
| `--skip-performance` | Skip performance testing | No | false |

### Verification Steps

1. **Infrastructure Health Check**
   - CloudFormation stack status
   - AWS resource availability
   - Service endpoint accessibility

2. **API Testing**
   - Authentication endpoints
   - CRUD operations
   - Error handling
   - Rate limiting

3. **Frontend Validation**
   - Static asset accessibility
   - SPA routing functionality
   - CDN performance
   - SSL certificate validation

4. **Database Testing**
   - Connection establishment
   - Read/write operations
   - Index performance
   - Backup verification

5. **Security Validation**
   - HTTPS enforcement
   - CORS configuration
   - Authentication flow
   - Authorization policies

6. **Performance Testing**
   - Response time measurement
   - Throughput testing
   - Load testing
   - CDN cache validation

### Output Example
```bash
🔍 Verifying deployment for environment: dev

✅ Infrastructure Health Check
   ✓ CloudFormation stack: BoatListingStack-dev (CREATE_COMPLETE)
   ✓ Lambda functions: 7/7 active
   ✓ DynamoDB tables: 5/5 active
   ✓ S3 buckets: 2/2 accessible

✅ API Testing
   ✓ Authentication: POST /auth/login (200ms)
   ✓ Listings: GET /listings (150ms)
   ✓ Admin: GET /admin/dashboard (180ms)

✅ Frontend Validation
   ✓ Homepage: https://dev.harborlist.com (250ms)
   ✓ Admin Portal: https://dev.harborlist.com/admin (300ms)
   ✓ SSL Certificate: Valid (expires 2024-12-01)

✅ Performance Metrics
   ✓ Average Response Time: 185ms
   ✓ Frontend Load Time: 1.2s
   ✓ API Throughput: 100 req/s

🎉 All verification tests passed!
```

### Troubleshooting
- Failed tests include detailed error messages
- Suggests specific remediation steps
- Provides links to relevant documentation
- Generates detailed failure reports

---

## 📝 Best Practices

### Deployment Strategy
1. **Always deploy to dev environment first**
2. **Run verification after each deployment**
3. **Use dry-run for production deployments**
4. **Monitor logs during deployment process**
5. **Keep rollback procedures ready**

### Environment Management
- Use environment-specific configuration files
- Validate prerequisites before deployment
- Monitor resource costs after deployment
- Implement proper access controls
- Document environment-specific settings

### Security Considerations
- Rotate credentials regularly
- Use least-privilege IAM policies
- Enable audit logging
- Validate SSL certificates
- Monitor security events

---

## 🔧 Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|---|---|---|
| AWS credentials not found | Missing or expired AWS credentials | Run `aws configure` or check IAM permissions |
| CDK bootstrap missing | CDK not bootstrapped for region | Run `cdk bootstrap` |
| Domain not accessible | DNS not propagated | Wait for DNS propagation (up to 48 hours) |
| Lambda deployment fails | Package size too large | Optimize dependencies or use Lambda layers |
| Frontend not loading | S3 bucket policy incorrect | Check bucket policy and CloudFront configuration |

### Debug Commands
```bash
# Check AWS configuration
aws sts get-caller-identity

# Validate CDK setup
cdk ls

# Check CloudFormation status
aws cloudformation describe-stacks --stack-name BoatListingStack-dev

# Test API endpoints
curl -I https://api-dev.harborlist.com/health

# Check frontend accessibility
curl -I https://dev.harborlist.com
```

---

**Next**: [Monitoring Scripts →](./monitoring-scripts.md)