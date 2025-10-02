# Cost Management Scripts

This section documents all scripts responsible for cost analysis, billing monitoring, and resource optimization for the HarborList infrastructure.

## 📋 Scripts Overview

| Script | Purpose | Type | Usage |
|---|---|---|---|
| `cost-analysis.js` | Comprehensive cost analysis and comparison | Node.js | Cost reporting and optimization |
| `aws-billing-monitor.js` | Real-time AWS billing monitoring | Node.js | Billing alerts and tracking |
| `cost-alert.sh` | Automated cost threshold alerting | Shell | Daily cost monitoring |
| `cost-monitoring-dashboard.js` | Cost visualization dashboard creation | Node.js | Cost dashboard management |
| `update-cost-tracking.js` | Cost tracking data updates | Node.js | Cost data maintenance |

---

## 💰 cost-analysis.js

**Comprehensive cost analysis and architecture comparison tool**

### Purpose
Performs detailed cost analysis of the current Cloudflare Tunnel architecture compared to previous CloudFront setup, providing insights for cost optimization and budget planning.

### Key Features
- **Architecture cost comparison** (Cloudflare Tunnel vs CloudFront)
- **Detailed resource cost breakdown**
- **Monthly and yearly cost projections**
- **Optimization recommendations**
- **ROI analysis for architectural changes**

### Cost Analysis Components

#### Current Architecture (Cloudflare Tunnel)
- **EC2 t3.micro**: $7.49/month for tunnel instance
- **NAT Gateway**: $32.40/month for outbound connectivity
- **S3 Storage**: $0.023/GB/month for static hosting
- **VPC Endpoints**: Free (S3 Gateway endpoints)
- **Lambda Functions**: Pay per invocation
- **DynamoDB**: Pay per request and storage

#### Previous Architecture (CloudFront)
- **CloudFront Distribution**: $0.085/GB data transfer
- **S3 Origin**: Standard S3 pricing
- **Origin Requests**: $0.0075 per 10,000 requests
- **SSL Certificate**: Free with CloudFront

### Usage

```bash
# Standard cost analysis
node cost-analysis.js

# Detailed analysis with projections
node cost-analysis.js --detailed

# Compare with specific timeframe
node cost-analysis.js --timeframe 30d

# Export analysis to file
node cost-analysis.js --output cost-report.json

# Include optimization recommendations
node cost-analysis.js --optimize
```

### Parameters

| Parameter | Description | Values | Default |
|---|---|---|---|
| `--detailed` | Include detailed breakdown | boolean | false |
| `--timeframe` | Analysis timeframe | 7d, 30d, 90d, 365d | 30d |
| `--output` | Output file path | file path | console |
| `--optimize` | Include optimization suggestions | boolean | false |
| `--format` | Output format | json, csv, markdown | markdown |

### Analysis Output

#### 1. Executive Summary
```bash
💰 HarborList Infrastructure Cost Analysis
Analysis Period: 2024-01-01 to 2024-01-31

📊 Current Month Summary:
   Total Cost: $47.23
   Daily Average: $1.52
   Projected Monthly: $47.23
   Budget Utilization: 94.5% of $50 budget

🔄 Architecture Comparison:
   Cloudflare Tunnel: $47.23/month
   CloudFront (Previous): $52.15/month
   Monthly Savings: $4.92 (9.4%)
```

#### 2. Resource Breakdown
#### 🏗️ Cost Breakdown by Service

| Service | Monthly Cost | Daily Cost | Percentage |
|---------|-------------|------------|------------|
| NAT Gateway | $32.40 | $1.05 | 68.6% |
| EC2 (t3.micro) | $7.49 | $0.24 | 15.9% |
| Lambda | $3.45 | $0.11 | 7.3% |
| DynamoDB | $2.67 | $0.09 | 5.7% |
| S3 Storage | $1.22 | $0.04 | 2.6% |
| **Total** | **$47.23** | **$1.53** | **100%** |

#### 3. Optimization Recommendations
```bash
🚀 Cost Optimization Opportunities:

1. NAT Gateway Optimization (High Impact: $25+ savings/month)
   - Consider NAT Instance instead of NAT Gateway
   - Implement VPC Endpoints for AWS services
   - Optimize outbound data transfer

2. EC2 Right-sizing (Medium Impact: $2-4 savings/month)
   - Monitor CPU utilization (currently 15%)
   - Consider t3.nano for lower workloads
   - Implement auto-scaling if traffic varies

3. Lambda Optimization (Low Impact: $0.5-1 savings/month)
   - Optimize memory allocation
   - Reduce cold start times
   - Use provisioned concurrency strategically

4. Storage Optimization (Low Impact: $0.2-0.5 savings/month)
   - Implement S3 lifecycle policies
   - Use appropriate storage classes
   - Enable S3 compression
```

### Cost Forecasting
- **Daily Trend Analysis**: Identifies cost patterns and anomalies
- **Monthly Projections**: Predicts end-of-month costs based on current usage
- **Yearly Planning**: Provides annual cost estimates for budgeting
- **Scenario Modeling**: Compares costs under different usage scenarios

---

## 📊 aws-billing-monitor.js

**Real-time AWS billing monitoring and resource tracking**

### Purpose
Retrieves actual AWS costs for environment resources, providing real-time billing information and resource utilization insights for cost management.

### Key Features
- **Real-time cost retrieval** from AWS Cost Explorer
- **Resource-specific cost attribution**
- **Stack-based cost analysis**
- **Service cost breakdown**
- **Automated reporting and alerting**

### Usage

```bash
# Monitor costs for development environment
node aws-billing-monitor.js --env dev

# Generate detailed billing report
node aws-billing-monitor.js --detailed

# Monitor specific service costs
node aws-billing-monitor.js --service lambda

# Set up automated monitoring
node aws-billing-monitor.js --schedule daily

# Export billing data
node aws-billing-monitor.js --export billing-data.json
```

### Parameters

| Parameter | Description | Values | Default |
|---|---|---|---|
| `--env` | Target environment | dev, staging, prod | dev |
| `--detailed` | Include detailed breakdown | boolean | false |
| `--service` | Monitor specific service | lambda, dynamodb, s3, ec2 | all |
| `--schedule` | Automated monitoring frequency | hourly, daily, weekly | - |
| `--export` | Export data to file | file path | - |

### Monitoring Features

#### 1. Stack Resource Discovery
```bash
📋 AWS Account ID: 676032292155
🔍 Getting resources for stack: BoatListingStack-dev
📦 Found 47 resources in stack

🏗️ Resource Breakdown:
   AWS::Lambda::Function: 7 resources
   AWS::DynamoDB::Table: 5 resources
   AWS::S3::Bucket: 2 resources
   AWS::EC2::Instance: 1 resource
   AWS::EC2::VPC: 1 resource
   AWS::IAM::Role: 12 resources
```

#### 2. Cost Attribution
#### 💰 Cost by Resource Type (Last 30 days)

| Resource Type | Cost | Trend |
|---------------|------|-------|
| EC2 Instance | $22.47 | ↑ +5.2% |
| NAT Gateway | $32.40 | → stable |
| Lambda Functions | $3.45 | ↓ -2.1% |
| DynamoDB Tables | $2.67 | ↑ +1.8% |
| S3 Buckets | $1.22 | → stable |
| **Total** | **$62.21** | **↑ +2.8%** |

#### 3. Usage Analytics
```bash
📈 Usage Patterns:
   Lambda Invocations: 1.2M/month (avg: 40K/day)
   DynamoDB Reads: 850K/month (avg: 28K/day)
   DynamoDB Writes: 125K/month (avg: 4K/day)
   S3 Requests: 45K/month (avg: 1.5K/day)
   Data Transfer: 85GB/month (avg: 2.8GB/day)
```

### Alert Conditions
- **Budget Threshold Exceeded**: When costs exceed predefined limits
- **Unusual Spending Patterns**: When daily costs deviate significantly
- **Service Cost Spikes**: When individual service costs increase dramatically
- **Resource Utilization**: When resources are under or over-utilized

---

## 🚨 cost-alert.sh

**Automated cost threshold alerting system**

### Purpose
Provides automated daily cost monitoring with configurable thresholds and alert mechanisms to prevent unexpected billing surprises.

### Key Features
- **Configurable cost thresholds**
- **Multi-level alerting** (warning, critical)
- **Historical cost tracking**
- **Integration with notification systems**
- **Automated daily execution via cron**

### Configuration

```bash
# Alert thresholds (configurable)
BUDGET_LIMIT=50           # Monthly budget limit
WARNING_THRESHOLD=25      # Warning at 50% of budget
CRITICAL_THRESHOLD=40     # Critical at 80% of budget
```

### Usage

```bash
# Manual cost check
./cost-alert.sh

# Run with custom thresholds
BUDGET_LIMIT=100 WARNING_THRESHOLD=50 ./cost-alert.sh

# Set up automated daily monitoring
crontab -e
# Add: 0 9 * * * /path/to/cost-alert.sh
```

### Alert Levels

#### ✅ Normal Operation
```bash
🔍 Checking AWS costs for 2024-01...
💰 Current month cost: $23.45
✅ Cost within acceptable range
```

#### ⚠️ Warning Level (50-79% of budget)
```bash
🔍 Checking AWS costs for 2024-01...
💰 Current month cost: $32.50
⚠️  WARNING: Cost exceeded $25.00
📧 Warning notification sent to team
```

#### 🚨 Critical Level (80%+ of budget)
```bash
🔍 Checking AWS costs for 2024-01...
💰 Current month cost: $45.75
🚨 CRITICAL: Cost exceeded $40.00!
📱 Critical alert sent to on-call team
🔒 Consider implementing cost controls
```

### Integration Options
- **Email notifications** via SES or external SMTP
- **Slack/Teams integration** for team communication
- **SMS alerts** for critical thresholds
- **PagerDuty integration** for incident management
- **Webhook notifications** for custom integrations

---

## 📊 cost-monitoring-dashboard.js

**Cost visualization dashboard creation and management**

### Purpose
Creates comprehensive cost monitoring dashboards in CloudWatch and external visualization tools for real-time cost tracking and analysis.

### Key Features
- **Real-time cost visualization**
- **Service-level cost breakdown**
- **Historical trend analysis**
- **Budget vs. actual comparisons**
- **Cost optimization recommendations**

### Dashboard Components

#### 1. Executive Cost Summary
- Current month spending
- Budget utilization percentage
- Daily cost trends
- Year-over-year comparisons

#### 2. Service Cost Breakdown
- Cost by AWS service
- Resource utilization metrics
- Cost per transaction/request
- Efficiency indicators

#### 3. Forecast and Trends
- Monthly cost projections
- Seasonal spending patterns
- Growth trend analysis
- Budget variance tracking

#### 4. Optimization Opportunities
- Under-utilized resources
- Right-sizing recommendations
- Reserved instance opportunities
- Cleanup candidates

### Usage

```bash
# Create standard cost dashboard
node cost-monitoring-dashboard.js --env dev

# Create executive summary dashboard
node cost-monitoring-dashboard.js --type executive

# Create detailed operational dashboard
node cost-monitoring-dashboard.js --type operational --detailed

# Update existing dashboard
node cost-monitoring-dashboard.js --update dashboard-name
```

---

## 🔄 update-cost-tracking.js

**Cost tracking data maintenance and updates**

### Purpose
Maintains historical cost data, updates tracking databases, and ensures data consistency for cost analysis and reporting.

### Key Features
- **Automated data collection**
- **Historical data maintenance**
- **Data validation and cleanup**
- **Integration with external systems**
- **Backup and recovery procedures**

### Usage

```bash
# Update cost tracking data
node update-cost-tracking.js

# Update with specific cost value
node update-cost-tracking.js --cost 47.23

# Perform data validation
node update-cost-tracking.js --validate

# Cleanup old data
node update-cost-tracking.js --cleanup 90d
```

---

## 📝 Best Practices

### Cost Management Strategy
1. **Set up automated monitoring** with appropriate thresholds
2. **Regular cost reviews** (weekly/monthly) with stakeholders
3. **Implement cost allocation tags** for better visibility
4. **Use budget alerts** at multiple threshold levels
5. **Regular optimization reviews** quarterly

### Resource Optimization
- Monitor resource utilization continuously
- Right-size instances based on actual usage
- Implement auto-scaling for variable workloads
- Use reserved instances for predictable workloads
- Clean up unused resources regularly

### Cost Allocation
- Tag all resources with environment and project identifiers
- Implement chargeback mechanisms for different teams
- Track costs by feature or application component
- Monitor cost per user or transaction metrics

---

## 🔧 Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|---|---|---|
| Cost API not accessible | Missing permissions | Add Cost Explorer and Billing permissions to IAM role |
| Incorrect cost data | Currency or region mismatch | Verify AWS account settings and region |
| Alert not triggering | Threshold configuration error | Check threshold values and comparison logic |
| Dashboard not updating | Data source configuration | Verify CloudWatch metrics and data sources |

### Debug Commands
```bash
# Test Cost Explorer access
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity MONTHLY --metrics BLENDED_COST

# Check budget configuration
aws budgets describe-budgets --account-id 123456789012

# Validate IAM permissions
aws iam simulate-principal-policy --policy-source-arn arn:aws:iam::account:role/role-name --action-names ce:GetCostAndUsage

# Test SNS notifications
aws sns publish --topic-arn arn:aws:sns:region:account:topic --message "Cost alert test"
```

---

**Next**: [Security & Validation Scripts →](./security-validation-scripts.md)