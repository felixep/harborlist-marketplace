# Security & Validation Scripts

This section documents all scripts responsible for security testing, infrastructure validation, and compliance checking for the HarborList platform.

## 📋 Scripts Overview

| Script | Purpose | Type | Usage |
|---|---|---|---|
| `validate-admin-infrastructure.js` | Admin infrastructure validation | Node.js | Security and compliance validation |
| `validate-and-test-admin.sh` | Comprehensive admin testing | Shell | End-to-end admin validation |
| `verify-api-configuration.js` | API security configuration validation | Node.js | API security testing |
| `comprehensive-dev-environment-test.js` | Full environment validation | Node.js | Complete system validation |

---

## 🔒 validate-admin-infrastructure.js

**Comprehensive admin infrastructure security and compliance validation**

### Purpose
Validates that all admin dashboard infrastructure components are properly deployed, configured, and secure according to best practices and compliance requirements.

### Key Features
- **Complete admin infrastructure validation**
- **Security configuration verification**
- **Compliance checking against standards**
- **Performance and availability testing**
- **Detailed reporting and remediation guidance**

### Validation Categories

#### 1. DynamoDB Tables Validation
- Table existence and configuration
- GSI (Global Secondary Index) validation
- TTL (Time To Live) configuration
- Backup and recovery settings
- Access control and encryption

#### 2. Lambda Functions Validation
- Function deployment status
- Environment variables configuration
- IAM role and permissions
- Memory and timeout settings
- Error handling and logging

#### 3. Secrets Manager Validation
- JWT secret existence and accessibility
- Encryption configuration
- Access policies and permissions
- Rotation policies
- Compliance with security standards

#### 4. CloudWatch Monitoring Validation
- Alarm configuration and thresholds
- SNS topic setup and subscriptions
- Dashboard configuration
- Log group settings and retention
- Metric collection and analysis

#### 5. API Gateway Validation
- Endpoint configuration and security
- CORS settings and policies
- Authentication and authorization
- Rate limiting and throttling
- SSL/TLS configuration

### Usage

```bash
# Validate admin infrastructure for development
node validate-admin-infrastructure.js --env dev

# Comprehensive validation with detailed reporting
node validate-admin-infrastructure.js --comprehensive

# Security-focused validation
node validate-admin-infrastructure.js --security-only

# Generate compliance report
node validate-admin-infrastructure.js --compliance-report

# Validate specific component
node validate-admin-infrastructure.js --component dynamodb
```

### Parameters

| Parameter | Description | Values | Default |
|---|---|---|---|
| `--env` | Target environment | dev, staging, prod | dev |
| `--comprehensive` | Run all validation tests | boolean | false |
| `--security-only` | Focus on security validation | boolean | false |
| `--compliance-report` | Generate compliance report | boolean | false |
| `--component` | Validate specific component | dynamodb, lambda, secrets, cloudwatch | all |
| `--output` | Output format | json, markdown, html | console |

### Validation Process

#### 1. Environment Setup Validation
```bash
🔍 Validating Admin Infrastructure for: dev

✅ Environment Setup
   ✓ AWS credentials configured
   ✓ Region set to us-east-1
   ✓ CloudFormation stack exists: BoatListingStack-dev
   ✓ Stack status: CREATE_COMPLETE
```

#### 2. DynamoDB Tables Validation
```bash
📊 DynamoDB Tables Validation
   ✅ Audit Logs Table (boat-audit-logs-dev)
      ✓ Table exists and is ACTIVE
      ✓ TTL configured on 'ttl' attribute
      ✓ GSI indexes: user-index, action-index, resource-index
      ✓ Point-in-time recovery enabled
      ✓ Encryption at rest enabled
   
   ✅ Admin Sessions Table (boat-admin-sessions-dev)
      ✓ Table exists and is ACTIVE
      ✓ TTL configured on 'expiresAt' attribute
      ✓ GSI indexes: user-index
      ✓ Encryption at rest enabled
   
   ✅ Login Attempts Table (boat-login-attempts-dev)
      ✓ Table exists and is ACTIVE
      ✓ TTL configured on 'ttl' attribute
      ✓ GSI indexes: email-index, ip-index
      ✓ Encryption at rest enabled
```

#### 3. Lambda Functions Validation
```bash
🚀 Lambda Functions Validation
   ✅ Admin Function (boat-listing-admin-dev)
      ✓ Function exists and is active
      ✓ Runtime: nodejs18.x
      ✓ Memory: 512 MB
      ✓ Timeout: 30 seconds
      ✓ Environment variables configured
      ✓ IAM role permissions validated
      ✓ VPC configuration (if applicable)
      ✓ Error handling configured
```

#### 4. Security Configuration Validation
```bash
🔒 Security Configuration Validation
   ✅ Secrets Manager
      ✓ JWT secret exists: boat-listing-admin-jwt-dev
      ✓ Encryption with AWS managed key
      ✓ Access policies configured
      ✓ No unauthorized access detected
   
   ✅ IAM Permissions
      ✓ Admin function has minimal required permissions
      ✓ Cross-service access properly configured
      ✓ No wildcard permissions detected
      ✓ Resource-level permissions applied
   
   ✅ Network Security
      ✓ Security groups properly configured
      ✓ VPC endpoints configured for AWS services
      ✓ No public subnets with sensitive resources
      ✓ Network ACLs configured appropriately
```

#### 5. Monitoring and Alerting Validation
```bash
⚠️ Monitoring and Alerting Validation
   ✅ CloudWatch Alarms
      ✓ Admin function error alarm configured
      ✓ Admin function duration alarm configured
      ✓ DynamoDB throttle alarms configured
      ✓ Alarm thresholds appropriate for environment
   
   ✅ SNS Topics and Subscriptions
      ✓ Admin alerts topic exists
      ✓ Email subscriptions configured
      ✓ Delivery policies configured
      ✓ Dead letter queue configured
   
   ✅ CloudWatch Dashboards
      ✓ Admin service dashboard exists
      ✓ All required widgets configured
      ✓ Appropriate time ranges set
      ✓ Dashboard permissions configured
```

### Compliance Validation

#### Security Standards Compliance
- **AWS Well-Architected Framework** compliance
- **OWASP Top 10** security considerations
- **SOC 2 Type II** control requirements
- **GDPR** data protection compliance
- **Industry best practices** implementation

#### Compliance Report Output
```bash
📋 Compliance Report Summary
   Security Score: 94/100
   
   ✅ Passed Controls (47/50):
      - Data encryption at rest and in transit
      - Access control and authentication
      - Audit logging and monitoring
      - Network security configurations
      - Backup and disaster recovery
   
   ⚠️  Areas for Improvement (3):
      - Implement additional MFA requirements
      - Enhanced logging for sensitive operations
      - Regular security assessments scheduling
   
   📊 Compliance Status:
      AWS Well-Architected: 95% compliant
      OWASP Top 10: 100% compliant
      SOC 2 Controls: 92% compliant
```

---

## 🧪 validate-and-test-admin.sh

**Comprehensive admin infrastructure testing and validation workflow**

### Purpose
Executes a complete validation and testing workflow for admin infrastructure, combining infrastructure tests, deployment validation, and end-to-end testing.

### Key Features
- **Complete testing workflow automation**
- **Infrastructure build and test validation**
- **Deployment verification**
- **Integration testing**
- **Performance validation**

### Testing Workflow

#### 1. Infrastructure Testing
- CDK infrastructure build validation
- TypeScript compilation verification
- Unit test execution
- Infrastructure template validation

#### 2. Deployment Validation
- AWS resource existence verification
- Configuration validation
- Security settings verification
- Connectivity testing

#### 3. Integration Testing
- API endpoint testing
- Database connectivity validation
- Authentication flow testing
- Admin dashboard functionality

#### 4. Performance Testing
- Response time validation
- Load testing (if configured)
- Resource utilization checks
- Scalability assessment

### Usage

```bash
# Run complete admin validation and testing
./validate-and-test-admin.sh

# Run for specific environment
./validate-and-test-admin.sh dev

# Run with verbose output
./validate-and-test-admin.sh prod --verbose

# Skip specific test categories
./validate-and-test-admin.sh staging --skip-performance
```

### Test Execution Flow

```bash
=== Admin Infrastructure Validation and Testing ===
Environment: dev
Region: us-east-1

✅ Step 1: Building and testing CDK infrastructure
   Installing dependencies...
   Building TypeScript...
   Running infrastructure tests...
   ✓ Infrastructure tests passed

✅ Step 2: Validating admin infrastructure components
   Running validation script...
   ✓ All admin infrastructure components validated

✅ Step 3: Testing admin functionality
   Testing admin endpoints...
   ✓ Admin API endpoints responding correctly
   
   Testing authentication...
   ✓ Authentication flow working
   
   Testing database operations...
   ✓ Database connectivity and operations validated

✅ Step 4: Performance validation
   Measuring response times...
   ✓ All endpoints meet performance requirements
   
   Checking resource utilization...
   ✓ Resource utilization within acceptable ranges

🎉 All admin infrastructure validation and testing completed successfully!

📊 Test Summary:
   Infrastructure Tests: 17/17 passed
   Validation Tests: 25/25 passed
   Integration Tests: 8/8 passed
   Performance Tests: 5/5 passed
   
   Total: 55/55 tests passed (100%)
```

---

## 🔧 verify-api-configuration.js

**API security configuration validation and testing**

### Purpose
Validates API Gateway configuration, security settings, CORS policies, and authentication mechanisms to ensure proper security posture.

### Key Features
- **API Gateway configuration validation**
- **Security policy verification**
- **CORS configuration testing**
- **Authentication mechanism validation**
- **Rate limiting and throttling verification**

### Validation Categories

#### 1. API Gateway Configuration
- Endpoint configuration and deployment
- Stage configuration and variables
- Custom domain and SSL certificate
- Integration configuration with Lambda

#### 2. Security Configuration
- Authentication methods (JWT, API keys)
- Authorization policies and scopes
- Request validation and filtering
- Input sanitization and validation

#### 3. CORS Configuration
- Origin policies and restrictions
- Allowed methods and headers
- Preflight request handling
- Credential policies

#### 4. Rate Limiting and Throttling
- Request rate limits per endpoint
- Burst capacity configuration
- Client-specific throttling
- Usage plans and API keys

### Usage

```bash
# Validate API configuration for development
node verify-api-configuration.js --env dev

# Focus on security configuration
node verify-api-configuration.js --security-focus

# Test CORS configuration
node verify-api-configuration.js --cors-only

# Validate specific API endpoints
node verify-api-configuration.js --endpoints auth,admin
```

---

## 🌐 comprehensive-dev-environment-test.js

**Complete development environment validation and testing**

### Purpose
Performs comprehensive validation of the entire development environment, including infrastructure, applications, security, and performance aspects.

### Key Features
- **End-to-end environment validation**
- **Multi-component integration testing**
- **Security posture assessment**
- **Performance baseline establishment**
- **Operational readiness verification**

### Test Categories

#### 1. Infrastructure Validation
- AWS resource deployment status
- Network connectivity and security
- Database availability and performance
- Storage and CDN configuration

#### 2. Application Testing
- Frontend application accessibility
- Backend API functionality
- Authentication and authorization flows
- Data processing and storage

#### 3. Security Assessment
- Security configuration compliance
- Vulnerability scanning results
- Access control verification
- Data protection validation

#### 4. Performance Testing
- Load testing and capacity planning
- Response time benchmarking
- Resource utilization analysis
- Scalability assessment

#### 5. Operational Readiness
- Monitoring and alerting functionality
- Backup and recovery procedures
- Incident response capabilities
- Documentation completeness

### Usage

```bash
# Run comprehensive environment test
node comprehensive-dev-environment-test.js

# Run specific test suites
node comprehensive-dev-environment-test.js --suites infrastructure,security

# Generate detailed report
node comprehensive-dev-environment-test.js --detailed-report

# Include performance benchmarking
node comprehensive-dev-environment-test.js --include-performance
```

### Test Output Example
```bash
🧪 Comprehensive Development Environment Test
Environment: dev
Started: 2024-01-15 10:30:00 UTC

🏗️ Infrastructure Validation (15/15 tests passed)
   ✅ AWS Resources: All 47 resources deployed and healthy
   ✅ Network: VPC, subnets, and security groups configured
   ✅ Database: All 5 DynamoDB tables active and accessible
   ✅ Storage: S3 buckets configured with proper policies
   ✅ CDN: Cloudflare tunnel operational and secure

🌐 Application Testing (12/12 tests passed)
   ✅ Frontend: Accessible at https://dev.harborlist.com
   ✅ Backend API: All 15 endpoints responding correctly
   ✅ Authentication: JWT-based auth flow functional
   ✅ Data Operations: CRUD operations working correctly

🔒 Security Assessment (18/18 tests passed)
   ✅ Security Groups: Properly configured, no open ports
   ✅ IAM Policies: Least privilege access implemented
   ✅ Encryption: Data encrypted at rest and in transit
   ✅ Secrets: Properly managed in AWS Secrets Manager

⚡ Performance Testing (8/8 tests passed)
   ✅ API Response Times: Average 185ms (target: <500ms)
   ✅ Frontend Load Time: 1.2s (target: <3s)
   ✅ Database Performance: <20ms response time
   ✅ Throughput: Handles 100+ requests/second

📊 Operational Readiness (10/10 tests passed)
   ✅ Monitoring: CloudWatch dashboards and alarms active
   ✅ Alerting: SNS topics and email notifications working
   ✅ Logging: Centralized logging configured
   ✅ Backup: Automated backup procedures in place

🎉 Environment Test Completed Successfully!
   Total Tests: 63/63 passed (100%)
   Test Duration: 4 minutes 32 seconds
   Environment Status: READY FOR USE
   
📋 Recommendations:
   - Environment is production-ready
   - Consider implementing additional monitoring
   - Schedule regular security assessments
   - Plan for capacity scaling based on usage
```

---

## 📝 Best Practices

### Security Validation Strategy
1. **Implement defense in depth** with multiple security layers
2. **Regular security assessments** and vulnerability scanning
3. **Automated compliance checking** in CI/CD pipelines
4. **Principle of least privilege** for all access controls
5. **Continuous monitoring** and incident response procedures

### Validation Automation
- Integrate validation scripts into CI/CD pipelines
- Run validation checks after every deployment
- Set up automated compliance reporting
- Monitor validation results and trends
- Implement automated remediation where possible

### Compliance Management
- Maintain compliance documentation and evidence
- Regular audit and assessment procedures
- Staff training on security and compliance requirements
- Incident response and breach notification procedures

---

## 🔧 Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|---|---|---|
| Validation script fails | Missing AWS permissions | Check IAM policies and permissions |
| Infrastructure not found | Wrong environment or region | Verify environment parameters and AWS region |
| Security validation fails | Misconfigured security groups or policies | Review security configurations |
| Performance tests fail | Resource constraints or network issues | Check resource utilization and network connectivity |

### Debug Commands
```bash
# Check AWS configuration
aws sts get-caller-identity
aws configure list

# Validate CloudFormation stack
aws cloudformation describe-stacks --stack-name BoatListingStack-dev

# Test API endpoints
curl -I https://api-dev.harborlist.com/health

# Check security groups
aws ec2 describe-security-groups --group-names default

# Validate IAM permissions
aws iam simulate-principal-policy --policy-source-arn arn:aws:iam::account:role/role-name --action-names lambda:InvokeFunction
```

---

**Next**: [Performance Scripts →](./performance-scripts.md)