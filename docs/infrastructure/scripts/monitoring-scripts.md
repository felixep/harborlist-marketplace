# Monitoring Scripts

This section documents all scripts responsible for monitoring system health, performance tracking, and alerting infrastructure.

## 📋 Scripts Overview

| Script | Purpose | Type | Usage |
|---|---|---|---|
| `setup-monitoring.sh` | Deploy monitoring infrastructure | Shell | Initial monitoring setup |
| `test-monitoring.sh` | Validate monitoring components | Shell | Monitoring validation |
| `dev-environment-status-report.js` | Generate comprehensive status reports | Node.js | Status reporting |
| `create-custom-dashboard.js` | Create custom CloudWatch dashboards | Node.js | Dashboard management |

---

## 📊 setup-monitoring.sh

**Comprehensive monitoring setup script for HarborList infrastructure**

### Purpose
Automates the deployment and configuration of comprehensive monitoring and alerting infrastructure for the HarborList boat marketplace platform, establishing CloudWatch monitoring, SNS alerting, and operational dashboards.

### Key Features
- **Automated monitoring infrastructure deployment**
- **Environment-specific monitoring configurations**
- **Multi-channel alerting** (email, SMS, webhooks)
- **Comprehensive health check coverage**
- **Performance monitoring and optimization guidance**

### Monitoring Architecture
- CloudWatch metrics collection and analysis
- Custom alarms with environment-appropriate thresholds
- SNS topics for multi-channel alert distribution
- Operational dashboards for real-time visibility
- Log aggregation and analysis capabilities

### Monitoring Coverage

#### 1. Infrastructure Monitoring
- EC2 instance health and performance
- Lambda function execution metrics
- DynamoDB performance and throttling
- S3 bucket access patterns

#### 2. Application Monitoring
- API endpoint response times
- Error rates and patterns
- User authentication metrics
- Business logic performance

#### 3. Security Monitoring
- Failed authentication attempts
- Unusual access patterns
- Security event correlation
- Compliance monitoring

#### 4. Performance Monitoring
- Response time percentiles
- Throughput and capacity utilization
- Resource consumption patterns
- Scalability indicators

### Usage

```bash
# Setup monitoring for development environment
./setup-monitoring.sh dev

# Setup monitoring for production with enhanced alerting
./setup-monitoring.sh prod --enhanced-alerts

# Setup monitoring with custom thresholds
./setup-monitoring.sh staging --custom-thresholds

# Dry run to validate configuration
./setup-monitoring.sh dev --dry-run
```

### Parameters

| Parameter | Description | Required | Default |
|---|---|---|---|
| `environment` | Target environment (dev/staging/prod) | Yes | - |
| `--enhanced-alerts` | Enable additional alerting channels | No | false |
| `--custom-thresholds` | Use custom alert thresholds | No | false |
| `--dry-run` | Validate configuration without deployment | No | false |
| `--email` | Alert email address | No | Environment default |

### Alert Strategy

#### Critical Alerts (Immediate Response)
- Lambda function failures
- DynamoDB throttling
- API endpoint unavailability
- Security breaches

#### Warning Alerts (Monitor Closely)
- High CPU usage
- Elevated response times
- Unusual traffic patterns
- Resource utilization trends

#### Information Alerts (Track Patterns)
- Deployment completions
- Scheduled maintenance
- Configuration changes
- Performance improvements

### Setup Process

1. **Environment Validation**
   - Validates AWS credentials and permissions
   - Checks CloudFormation stack status
   - Verifies monitoring prerequisites

2. **SNS Topic Configuration**
   - Creates alert topics for different severity levels
   - Configures email subscriptions
   - Sets up webhook integrations

3. **CloudWatch Alarm Creation**
   - Lambda function error rates
   - DynamoDB performance metrics
   - EC2 instance health checks
   - API Gateway response times

4. **Dashboard Deployment**
   - Infrastructure overview dashboard
   - Application performance dashboard
   - Security monitoring dashboard
   - Business metrics dashboard

5. **Log Group Configuration**
   - Centralized log collection
   - Log retention policies
   - Log analysis queries
   - Alert triggers from log patterns

### Output Example
```bash
🚀 Setting up monitoring for environment: dev

✅ Environment Validation
   ✓ AWS credentials valid
   ✓ CloudFormation stack accessible
   ✓ IAM permissions verified

📬 SNS Topic Configuration
   ✓ Critical alerts topic: arn:aws:sns:us-east-1:123:critical-alerts-dev
   ✓ Warning alerts topic: arn:aws:sns:us-east-1:123:warning-alerts-dev
   ✓ Email subscription configured: admin@harborlist.com

⚠️ CloudWatch Alarms Created
   ✓ Lambda error rate alarm: admin-function-errors-dev
   ✓ DynamoDB throttle alarm: audit-logs-throttles-dev
   ✓ EC2 health alarm: tunnel-instance-status-dev
   ✓ API response time alarm: api-response-time-dev

📊 Dashboards Deployed
   ✓ Infrastructure Dashboard: https://console.aws.amazon.com/cloudwatch/home#dashboards:name=infrastructure-dev
   ✓ Application Dashboard: https://console.aws.amazon.com/cloudwatch/home#dashboards:name=application-dev

📝 Log Configuration
   ✓ Application logs: /aws/lambda/admin-function-dev
   ✓ Infrastructure logs: /aws/ec2/cloudflare-tunnel/dev
   ✓ Log retention: 7 days (dev), 30 days (prod)

🎉 Monitoring setup completed successfully!

📋 Next Steps:
   1. Test alerts: ./test-monitoring.sh dev
   2. Review dashboards: Check CloudWatch console
   3. Configure additional subscribers: Add team members to SNS topics
```

---

## 🧪 test-monitoring.sh

**Monitoring validation and testing script**

### Purpose
Validates that all monitoring components are working correctly, tests alert mechanisms, and verifies dashboard functionality.

### Key Features
- **Comprehensive monitoring validation**
- **Alert mechanism testing**
- **Dashboard accessibility verification**
- **Performance metric validation**
- **Health check simulation**

### Usage

```bash
# Test monitoring setup for development
./test-monitoring.sh dev

# Test monitoring with alert simulation
./test-monitoring.sh prod --simulate-alerts

# Quick health check only
./test-monitoring.sh dev --quick

# Comprehensive test suite
./test-monitoring.sh staging --comprehensive
```

### Parameters

| Parameter | Description | Required | Default |
|---|---|---|---|
| `environment` | Target environment to test | No | dev |
| `--simulate-alerts` | Trigger test alerts | No | false |
| `--quick` | Run only basic checks | No | false |
| `--comprehensive` | Run full test suite | No | false |

### Test Categories

#### 1. Infrastructure Health Tests
- CloudFormation stack status
- EC2 instance connectivity
- Lambda function availability
- DynamoDB table accessibility

#### 2. Monitoring Component Tests
- CloudWatch metric collection
- SNS topic functionality
- Dashboard accessibility
- Log group configuration

#### 3. Alert Mechanism Tests
- Alarm state validation
- SNS delivery testing
- Email notification verification
- Webhook endpoint testing

#### 4. Performance Metric Tests
- Response time measurement
- Throughput validation
- Resource utilization checking
- Scalability indicator verification

### Output Example
```bash
🧪 Testing monitoring setup for environment: dev

✅ Prerequisites Check
   ✓ AWS CLI configured
   ✓ CloudFormation stack accessible
   ✓ Required permissions verified

📊 Infrastructure Health Tests
   ✓ EC2 Instance: i-1234567890abcdef0 (running)
   ✓ Lambda Functions: 7/7 active
   ✓ DynamoDB Tables: 5/5 active
   ✓ S3 Buckets: 2/2 accessible

⚠️ Monitoring Component Tests
   ✓ CloudWatch Alarms: 12/12 configured
   ✓ SNS Topics: 3/3 accessible
   ✓ Dashboards: 4/4 accessible
   ✓ Log Groups: 8/8 configured

🔔 Alert Mechanism Tests
   ✓ Test alert sent to: admin@harborlist.com
   ✓ SNS delivery confirmed
   ✓ Webhook endpoint responsive
   ✓ Alert formatting correct

📈 Performance Metric Tests
   ✓ API response time: 185ms (target: <500ms)
   ✓ Lambda cold start: 250ms (target: <1000ms)
   ✓ DynamoDB latency: 15ms (target: <100ms)
   ✓ S3 access time: 45ms (target: <200ms)

🎉 All monitoring tests passed!

📊 Monitoring URLs:
   Infrastructure Dashboard: https://console.aws.amazon.com/cloudwatch/home#dashboards:name=infrastructure-dev
   Application Dashboard: https://console.aws.amazon.com/cloudwatch/home#dashboards:name=application-dev
   Log Insights: https://console.aws.amazon.com/cloudwatch/home#logs:query
```

---

## 📈 dev-environment-status-report.js

**Comprehensive development environment status reporting**

### Purpose
Generates detailed status reports for the development environment, providing insights into system health, performance metrics, and operational status.

### Key Features
- **Real-time status collection**
- **Performance metric analysis**
- **Resource utilization reporting**
- **Trend analysis and recommendations**
- **Automated report generation**

### Usage

```bash
# Generate standard status report
node dev-environment-status-report.js

# Generate detailed report with historical data
node dev-environment-status-report.js --detailed

# Generate report for specific timeframe
node dev-environment-status-report.js --timeframe 24h

# Export report in different formats
node dev-environment-status-report.js --format json
node dev-environment-status-report.js --format html
```

### Parameters

| Parameter | Description | Values | Default |
|---|---|---|---|
| `--detailed` | Include historical analysis | boolean | false |
| `--timeframe` | Report timeframe | 1h, 6h, 24h, 7d | 24h |
| `--format` | Output format | json, html, markdown | markdown |
| `--output` | Output file path | string | console |

### Report Sections

#### 1. Executive Summary
- Overall system health status
- Key performance indicators
- Critical issues and recommendations
- Operational highlights

#### 2. Infrastructure Status
- CloudFormation stack health
- Resource utilization metrics
- Service availability status
- Configuration compliance

#### 3. Performance Metrics
- API response times and throughput
- Lambda function performance
- Database query performance
- Frontend loading metrics

#### 4. Security Status
- Authentication success rates
- Security event summary
- Compliance status
- Vulnerability assessment

#### 5. Cost Analysis
- Resource cost breakdown
- Spending trends
- Optimization opportunities
- Budget utilization

#### 6. Recommendations
- Performance optimization suggestions
- Cost reduction opportunities
- Security improvements
- Operational enhancements

### Output Example
```markdown
# HarborList Development Environment Status Report
Generated: 2024-01-15 14:30:00 UTC

## 🎯 Executive Summary
- **Overall Health**: ✅ Healthy
- **Performance Score**: 92/100
- **Uptime**: 99.8% (last 24h)
- **Critical Issues**: 0
- **Warnings**: 2

## 🏗️ Infrastructure Status
- **CloudFormation Stack**: CREATE_COMPLETE
- **EC2 Instances**: 1/1 running
- **Lambda Functions**: 7/7 healthy
- **DynamoDB Tables**: 5/5 active
- **S3 Buckets**: 2/2 accessible

## ⚡ Performance Metrics
- **API Average Response Time**: 185ms
- **Frontend Load Time**: 1.2s
- **Lambda Cold Start**: 250ms
- **DynamoDB Read Latency**: 15ms

## 💰 Cost Analysis
- **Daily Cost**: $12.45
- **Monthly Projection**: $373.50
- **Top Cost Drivers**: EC2 (45%), DynamoDB (30%), Lambda (25%)
```

---

## 📊 create-custom-dashboard.js

**Custom CloudWatch dashboard creation and management**

### Purpose
Creates and manages custom CloudWatch dashboards tailored to specific monitoring needs and operational requirements.

### Key Features
- **Custom dashboard templates**
- **Automated widget configuration**
- **Multi-environment dashboard management**
- **Dynamic metric selection**
- **Dashboard sharing and export**

### Usage

```bash
# Create standard infrastructure dashboard
node create-custom-dashboard.js --type infrastructure --env dev

# Create application performance dashboard
node create-custom-dashboard.js --type application --env prod

# Create security monitoring dashboard
node create-custom-dashboard.js --type security --env staging

# Create custom dashboard from template
node create-custom-dashboard.js --template ./custom-template.json
```

### Parameters

| Parameter | Description | Values | Default |
|---|---|---|---|
| `--type` | Dashboard type | infrastructure, application, security, business | infrastructure |
| `--env` | Target environment | dev, staging, prod | dev |
| `--template` | Custom template file | file path | - |
| `--name` | Custom dashboard name | string | Auto-generated |

### Dashboard Types

#### Infrastructure Dashboard
- EC2 instance metrics
- Lambda function performance
- DynamoDB utilization
- S3 access patterns
- Network performance

#### Application Dashboard
- API endpoint metrics
- User authentication flows
- Business logic performance
- Error rates and patterns
- User engagement metrics

#### Security Dashboard
- Failed authentication attempts
- Unusual access patterns
- Security event correlation
- Compliance monitoring
- Threat detection metrics

#### Business Dashboard
- User registration trends
- Listing creation metrics
- Revenue indicators
- Geographic distribution
- Feature usage analytics

### Output Example
```bash
📊 Creating custom dashboard: infrastructure-dev

✅ Dashboard Configuration
   ✓ Dashboard name: HarborList-Infrastructure-Dev
   ✓ Widget count: 12
   ✓ Metric count: 25
   ✓ Timeframe: Last 24 hours

🎨 Widget Setup
   ✓ EC2 Instance Health (2 metrics)
   ✓ Lambda Performance (5 metrics)
   ✓ DynamoDB Utilization (4 metrics)
   ✓ API Gateway Metrics (3 metrics)
   ✓ CloudFront Distribution (2 metrics)

🔗 Dashboard Created Successfully!
   URL: https://console.aws.amazon.com/cloudwatch/home#dashboards:name=HarborList-Infrastructure-Dev
   ARN: arn:aws:cloudwatch:us-east-1:123456:dashboard/HarborList-Infrastructure-Dev
   
📋 Next Steps:
   1. Review dashboard widgets and layout
   2. Customize time ranges and periods
   3. Add additional metrics as needed
   4. Share dashboard URL with team members
```

---

## 📝 Best Practices

### Monitoring Strategy
1. **Implement layered monitoring** (infrastructure, application, business)
2. **Set appropriate alert thresholds** based on historical data
3. **Use composite alarms** for complex failure scenarios
4. **Regularly review and update** monitoring configurations
5. **Document incident response procedures**

### Dashboard Management
- Create role-specific dashboards for different team members
- Use consistent naming conventions and layouts
- Include context and documentation for metrics
- Set up automated dashboard updates
- Implement dashboard access controls

### Alert Configuration
- Classify alerts by severity and urgency
- Implement escalation procedures
- Use runbooks for common incidents
- Test alert mechanisms regularly
- Monitor alert fatigue and adjust thresholds

---

## 🔧 Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|---|---|---|
| Alarms not triggering | Incorrect thresholds or missing data | Review alarm configuration and data points |
| Dashboard not loading | Insufficient permissions | Check IAM policies for CloudWatch access |
| Metrics not appearing | Delayed metric publication | Wait for metric ingestion (up to 5 minutes) |
| SNS notifications failing | Invalid endpoints or permissions | Verify SNS topic configuration |

### Debug Commands
```bash
# Check CloudWatch alarm status
aws cloudwatch describe-alarms --alarm-names alarm-name

# Test SNS topic
aws sns publish --topic-arn arn:aws:sns:region:account:topic --message "Test"

# Validate dashboard
aws cloudwatch get-dashboard --dashboard-name dashboard-name

# Check metric availability
aws cloudwatch list-metrics --namespace AWS/Lambda
```

---

**Next**: [Cost Management Scripts →](./cost-management-scripts.md)