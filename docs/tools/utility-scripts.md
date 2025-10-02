# Utility Scripts

This section documents helper scripts for common administrative and maintenance tasks that support the overall HarborList infrastructure management.

## 📋 Scripts Overview

| Script | Purpose | Type | Usage |
|---|---|---|---|
| `verify-deployment.sh` | Post-deployment verification and validation | Shell | Deployment validation |
| `update-cost-tracking.js` | Cost tracking data maintenance and updates | Node.js | Cost data management |

---

## ✅ verify-deployment.sh

**Comprehensive post-deployment verification and validation utility**

### Purpose
Performs thorough verification of deployed infrastructure and applications to ensure all components are functioning correctly and meet operational requirements.

### Key Features
- **Infrastructure health verification**
- **Application functionality validation**  
- **Security configuration checking**
- **Performance baseline establishment**
- **Operational readiness assessment**

### Verification Categories

#### 1. Infrastructure Health Check
- **AWS Resource Status**: Validates all CloudFormation resources are healthy
- **Service Availability**: Confirms all services are running and accessible
- **Network Connectivity**: Tests network paths and security group configurations
- **Database Connectivity**: Verifies database connections and query performance

#### 2. Application Functionality
- **Frontend Accessibility**: Tests web application loading and functionality
- **API Endpoint Testing**: Validates all API endpoints and response formats
- **Authentication Flow**: Tests user authentication and authorization mechanisms
- **Data Processing**: Verifies data CRUD operations and business logic

#### 3. Security Validation
- **Access Control**: Validates IAM roles and permission configurations
- **Encryption**: Confirms data encryption at rest and in transit
- **Network Security**: Tests security group rules and network ACLs
- **SSL/TLS Configuration**: Validates certificate installation and security protocols

#### 4. Performance Validation
- **Response Time Testing**: Measures API and web application response times
- **Load Capacity**: Tests system capacity under normal load conditions
- **Resource Utilization**: Monitors CPU, memory, and storage utilization
- **Scalability Assessment**: Validates auto-scaling and capacity mechanisms

### Usage

```bash
# Standard deployment verification
./verify-deployment.sh

# Comprehensive verification with detailed reporting
./verify-deployment.sh --comprehensive

# Quick health check only
./verify-deployment.sh --quick

# Environment-specific verification
./verify-deployment.sh --env production

# Security-focused verification
./verify-deployment.sh --security-only

# Performance benchmarking
./verify-deployment.sh --performance-test
```

### Parameters

| Parameter | Description | Values | Default |
|---|---|---|---|
| `--env` | Target environment to verify | dev, staging, prod | dev |
| `--comprehensive` | Run complete verification suite | boolean | false |
| `--quick` | Run only essential health checks | boolean | false |
| `--security-only` | Focus on security validation | boolean | false |
| `--performance-test` | Include performance benchmarks | boolean | false |
| `--skip-external` | Skip external dependency tests | boolean | false |
| `--timeout` | Test timeout in seconds | number | 300 |

### Verification Process Flow

```bash
🔍 HarborList Deployment Verification
Environment: dev
Started: 2024-01-15 15:45:00 UTC

✅ Infrastructure Health Check (5 minutes)
   ✓ CloudFormation Stack: BoatListingStack-dev (CREATE_COMPLETE)
   ✓ Lambda Functions: 7/7 active and healthy
   ✓ DynamoDB Tables: 5/5 active and accessible
   ✓ S3 Buckets: 2/2 configured and accessible
   ✓ EC2 Instances: 1/1 running (Cloudflare tunnel)
   ✓ VPC Configuration: Subnets, routes, and endpoints operational
   ✓ Security Groups: Properly configured, no open vulnerabilities

✅ Application Functionality (4 minutes)
   ✓ Frontend Application: https://dev.harborlist.com
      - Homepage load time: 1.2s ✅
      - React routing functional: ✅
      - Static assets loading: ✅
      - JavaScript execution: ✅
   
   ✓ Backend API: https://api-dev.harborlist.com
      - Health endpoint: 200 OK (145ms) ✅
      - Authentication: JWT flow working ✅
      - Listings API: CRUD operations functional ✅
      - Admin API: Dashboard endpoints responsive ✅
      - Search API: Query processing working ✅

✅ Security Validation (3 minutes)
   ✓ Access Control
      - IAM roles configured with least privilege ✅
      - Service-to-service authentication working ✅
      - Admin access controls properly enforced ✅
   
   ✓ Encryption
      - Data at rest encrypted (DynamoDB, S3) ✅
      - Data in transit encrypted (HTTPS/TLS) ✅
      - Secrets properly managed (AWS Secrets Manager) ✅
   
   ✓ Network Security
      - Security groups restrictive and appropriate ✅
      - No public database access ✅
      - VPC endpoints configured for AWS services ✅

✅ Performance Validation (2 minutes)
   ✓ Response Times
      - API average response: 185ms (target: <500ms) ✅
      - Frontend load time: 1.2s (target: <3s) ✅
      - Database queries: <20ms (target: <100ms) ✅
   
   ✓ Resource Utilization
      - Lambda memory usage: 65% average ✅
      - EC2 CPU utilization: 15% average ✅
      - DynamoDB capacity: 25% utilized ✅

✅ Operational Readiness (2 minutes)
   ✓ Monitoring and Alerting
      - CloudWatch dashboards accessible ✅
      - SNS alert topics configured ✅
      - Log aggregation working ✅
   
   ✓ Backup and Recovery
      - Automated backups enabled ✅
      - Recovery procedures documented ✅
      - Backup retention policies applied ✅

🎉 Deployment Verification Completed Successfully!

📊 Verification Summary:
   Total Checks: 45
   Passed: 45 (100%)
   Failed: 0 (0%)
   Warnings: 0
   
   Overall Status: ✅ HEALTHY
   Performance Grade: A
   Security Score: 98/100
   
📋 System Status:
   ✅ All systems operational
   ✅ Performance within targets
   ✅ Security posture excellent
   ✅ Ready for production traffic

📈 Key Metrics:
   - Average API Response: 185ms
   - Frontend Load Time: 1.2s  
   - System Uptime: 99.9%
   - Error Rate: 0.01%

🔗 Quick Access URLs:
   Frontend: https://dev.harborlist.com
   Admin Portal: https://dev.harborlist.com/admin
   API Health: https://api-dev.harborlist.com/health
   Monitoring: https://console.aws.amazon.com/cloudwatch/home#dashboards:
```

### Error Handling and Reporting

```bash
❌ Deployment Verification Issues Detected

🚨 Critical Issues (1):
   - Database Connection Pool Exhausted
     Impact: High - API requests failing
     Resolution: Scale database read replicas
     ETA: 15 minutes

⚠️ Warnings (2):
   - Lambda Cold Start Time Elevated (450ms)
     Impact: Medium - Slower initial requests  
     Resolution: Consider provisioned concurrency
     ETA: 30 minutes
   
   - S3 Bucket Versioning Disabled
     Impact: Low - Backup risk
     Resolution: Enable versioning on critical buckets
     ETA: 5 minutes

📋 Remediation Steps:
   1. Immediate: Scale database capacity
   2. Short-term: Optimize Lambda memory allocation
   3. Long-term: Implement comprehensive monitoring

🔔 Notifications Sent:
   ✓ Critical alert sent to on-call team
   ✓ Warning notifications sent to dev team
   ✓ Status update posted to team Slack channel
```

---

## 💰 update-cost-tracking.js

**Cost tracking data maintenance and financial monitoring utility**

### Purpose
Maintains historical cost data, updates tracking databases, ensures data consistency for cost analysis, and provides automated financial reporting capabilities.

### Key Features
- **Automated cost data collection**
- **Historical trend analysis**
- **Budget variance tracking**
- **Cost allocation by service/environment**
- **Financial reporting automation**

### Data Management Functions

#### 1. Cost Data Collection
- **Real-time cost retrieval** from AWS Cost Explorer API
- **Service-level cost breakdown** for detailed analysis
- **Tag-based cost allocation** for environment and project tracking
- **Currency conversion** for multi-region deployments

#### 2. Historical Data Maintenance
- **Time-series data storage** for trend analysis
- **Data validation and cleanup** to ensure accuracy
- **Backup and recovery procedures** for cost data
- **Data retention policies** for compliance requirements

#### 3. Budget and Forecasting
- **Budget vs. actual comparisons** with variance analysis
- **Cost forecasting** based on historical patterns
- **Anomaly detection** for unexpected cost spikes
- **Optimization opportunity identification**

### Usage

```bash
# Update cost tracking with current data
node update-cost-tracking.js

# Update with specific cost value (manual override)
node update-cost-tracking.js --cost 47.23

# Update with detailed service breakdown
node update-cost-tracking.js --detailed --services lambda,dynamodb,s3

# Perform data validation and cleanup
node update-cost-tracking.js --validate --cleanup

# Generate cost tracking report
node update-cost-tracking.js --report --timeframe 30d

# Update budget tracking
node update-cost-tracking.js --update-budget --budget 100

# Cleanup old data beyond retention period
node update-cost-tracking.js --cleanup --retention 90d
```

### Parameters

| Parameter | Description | Values | Default |
|---|---|---|---|
| `--cost` | Manual cost value to record | number | Auto-retrieve |
| `--detailed` | Include detailed service breakdown | boolean | false |
| `--services` | Specific services to track | comma-separated | all |
| `--validate` | Perform data validation | boolean | false |
| `--cleanup` | Remove old/invalid data | boolean | false |
| `--report` | Generate cost tracking report | boolean | false |
| `--timeframe` | Report timeframe | 7d, 30d, 90d, 365d | 30d |
| `--budget` | Update budget amount | number | - |
| `--retention` | Data retention period | days | 365 |

### Cost Tracking Update Process

```bash
💰 Cost Tracking Update Process

✅ Data Collection
   ✓ AWS Cost Explorer API connected
   ✓ Current month costs retrieved: $47.23
   ✓ Service breakdown collected (7 services)
   ✓ Tag-based allocation applied

✅ Data Validation
   ✓ Cost data format validated
   ✓ Service allocations sum correctly
   ✓ Historical data consistency verified
   ✓ Anomaly detection completed

✅ Database Update
   ✓ Cost tracking database updated
   ✓ Historical trends calculated
   ✓ Budget variance computed
   ✓ Forecasting models updated

✅ Reporting and Alerts
   ✓ Daily cost report generated
   ✓ Budget alerts checked (within limits)
   ✓ Trend analysis completed
   ✓ Optimization recommendations updated

📊 Cost Summary:
   Today: $1.52
   Month-to-Date: $47.23
   Budget Utilization: 94.5%
   Trend: Stable (-2% vs last month)
```

### Cost Tracking Analytics

```bash
📈 Cost Tracking Analytics Report

💰 Financial Summary:
   Current Month: $47.23
   Previous Month: $48.15
   Monthly Change: -1.9% (↓ $0.92)
   Year-to-Date: $567.45
   
📊 Service Cost Breakdown:
   ┌─────────────────┬──────────┬──────────┬─────────────┐
   │ Service         │ Current  │ Previous │ Change      │
   ├─────────────────┼──────────┼──────────┼─────────────┤
   │ NAT Gateway     │ $32.40   │ $32.40   │ → Stable   │
   │ EC2 Instance    │ $7.49    │ $7.49    │ → Stable   │
   │ Lambda          │ $3.45    │ $3.89    │ ↓ -11.3%   │
   │ DynamoDB        │ $2.67    │ $2.45    │ ↑ +9.0%    │
   │ S3 Storage      │ $1.22    │ $1.92    │ ↓ -36.5%   │
   └─────────────────┴──────────┴──────────┴─────────────┘

🎯 Budget Analysis:
   Monthly Budget: $50.00
   Current Spend: $47.23
   Remaining: $2.77 (5.5%)
   Projected End-of-Month: $48.50
   Budget Status: ✅ Within Budget

📈 Trends and Forecasting:
   3-Month Trend: Decreasing (-3.2% monthly)
   Projected Next Month: $45.80
   Annual Forecast: $578.25
   Optimization Potential: $67.50/year

🔔 Alerts and Recommendations:
   ✅ No budget alerts triggered
   💡 Optimize Lambda memory allocation (-$0.40/month)
   💡 Consider Reserved Instances for EC2 (-$2.25/month)
   💡 Review S3 storage classes (-$0.15/month)
```

### Data Validation and Cleanup

```bash
🔍 Cost Data Validation and Cleanup

✅ Data Integrity Checks
   ✓ No duplicate entries found
   ✓ Cost calculations accurate
   ✓ Service attribution correct
   ✓ Date/time consistency validated

✅ Data Quality Assessment
   ✓ Missing data points: 0
   ✓ Anomalous values: 1 (investigated)
   ✓ Data completeness: 100%
   ✓ Accuracy score: 99.8%

🧹 Cleanup Operations
   ✓ Old debug entries removed (15 items)
   ✓ Duplicate records merged (3 items)
   ✓ Invalid service tags corrected (2 items)
   ✓ Retention policy applied (data >365 days archived)

📊 Database Health
   Records Before Cleanup: 1,247
   Records After Cleanup: 1,229
   Space Saved: 2.3 MB
   Query Performance: Improved by 12%
```

---

## 📝 Best Practices

### Deployment Verification Strategy
1. **Automate verification** as part of CI/CD pipeline
2. **Implement comprehensive test suites** covering all critical functionality
3. **Monitor verification results** and trends over time
4. **Document remediation procedures** for common issues
5. **Regular review and update** of verification criteria

### Cost Tracking Management
- **Daily cost monitoring** to catch anomalies early
- **Regular budget reviews** with stakeholders
- **Automated alerting** for budget threshold breaches
- **Historical trend analysis** for capacity planning
- **Regular cost optimization reviews**

### Data Management
- **Regular backup procedures** for critical tracking data
- **Data validation and cleanup** to maintain accuracy
- **Access control** for sensitive financial information
- **Audit trails** for all cost tracking modifications
- **Compliance** with financial reporting requirements

---

## 🔧 Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|---|---|---|
| Verification timeout | Resource unavailability or network issues | Check resource status and network connectivity |
| Cost data inconsistency | API rate limits or data synchronization | Verify API access and retry data collection |
| Database connection errors | Network or authentication issues | Check database connectivity and credentials |
| Performance degradation | Resource constraints or configuration issues | Review resource utilization and optimize |

### Debug Commands
```bash
# Test infrastructure connectivity
aws cloudformation describe-stacks --stack-name BoatListingStack-dev

# Check API endpoint availability  
curl -I https://api-dev.harborlist.com/health

# Validate cost data API access
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity MONTHLY --metrics BLENDED_COST

# Test database connectivity
aws dynamodb list-tables --region us-east-1

# Check CloudWatch metrics
aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Duration --start-time 2024-01-15T00:00:00Z --end-time 2024-01-15T23:59:59Z --period 3600 --statistics Average
```

---

## 📋 Summary

The HarborList infrastructure includes a comprehensive suite of utility scripts that provide:

- **Deployment Verification**: Automated validation of infrastructure health, application functionality, security posture, and performance benchmarks
- **Cost Management**: Detailed tracking, analysis, and optimization of AWS costs with automated reporting and alerting
- **Operational Support**: Essential utilities for day-to-day infrastructure management and maintenance

These utility scripts form the foundation for reliable, cost-effective, and well-monitored infrastructure operations, ensuring the HarborList platform maintains high availability and optimal performance while staying within budget constraints.

---

**Previous**: [← Cloudflare Management Scripts](./cloudflare-scripts.md) | **Up**: [↑ Infrastructure Scripts Overview](./README.md)