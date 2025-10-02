# Cost Management Scripts

This directory contains scripts for monitoring, analyzing, and optimizing AWS costs for HarborList Marketplace.

## Scripts Overview

### 💰 **aws-billing-monitor.js**
**Purpose**: Real-time AWS billing monitoring and alerting
- **Usage**: `node aws-billing-monitor.js [threshold]`
- **Features**:
  - Daily/monthly cost tracking
  - Budget threshold alerts
  - Service-level cost breakdown
  - Trend analysis
  - Automated notifications
- **Default Threshold**: $100/month

### 📊 **cost-analysis.js**
**Purpose**: Comprehensive cost analysis and reporting
- **Usage**: `node cost-analysis.js [start-date] [end-date]`
- **Analysis**:
  - Service cost breakdown
  - Resource utilization efficiency
  - Cost trends over time
  - Optimization recommendations
  - Comparative analysis across environments
- **Output**: Detailed JSON and HTML reports

### 📈 **cost-monitoring-dashboard.js**
**Purpose**: Creates and maintains cost monitoring dashboards
- **Usage**: `node cost-monitoring-dashboard.js [action]`
- **Actions**: create, update, delete
- **Dashboard Features**:
  - Real-time cost metrics
  - Budget vs actual spending
  - Service cost distribution
  - Forecasting projections
  - Historical comparisons

### 🚨 **cost-alert.sh**
**Purpose**: Sets up automated cost alerts and notifications
- **Usage**: `./cost-alert.sh [budget-amount] [alert-threshold]`
- **Alert Types**:
  - Budget exceeded warnings
  - Unusual spending patterns
  - Resource waste detection
  - Forecasted overage alerts
- **Notification Channels**: Email, Slack, SNS

### 🎛️ **create-custom-dashboard.js**
**Purpose**: Creates customizable cost dashboards for specific needs
- **Usage**: `node create-custom-dashboard.js [config-file]`
- **Features**:
  - Custom metric selections
  - Flexible time ranges
  - Multi-environment views
  - Export capabilities
  - Automated refresh schedules

## Usage Examples

```bash
# Monitor billing with $50 threshold
node aws-billing-monitor.js 50

# Analyze costs for last month
node cost-analysis.js 2024-09-01 2024-09-30

# Create cost monitoring dashboard
node cost-monitoring-dashboard.js create

# Set up $100 budget alert at 80% threshold
./cost-alert.sh 100 80

# Create custom dashboard from config
node create-custom-dashboard.js config/production-costs.json
```

## Cost Optimization Features

### 📋 **Automated Recommendations**
- Unused resources identification
- Right-sizing suggestions
- Reserved instance opportunities
- Storage class optimization

### 📊 **Cost Categories**
- **Compute**: EC2, Lambda, ECS costs
- **Storage**: S3, EBS, backup costs
- **Database**: DynamoDB, RDS costs
- **Networking**: Data transfer, VPC costs
- **Monitoring**: CloudWatch, logging costs

### 🎯 **Budget Targets**
- **Development**: $20/month
- **Staging**: $50/month
- **Production**: $200/month
- **Total Portfolio**: $300/month

## Configuration

### Environment Variables Required
```bash
AWS_PROFILE=harborlist
AWS_REGION=us-east-1
NOTIFICATION_EMAIL=admin@harborlist.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

### Budget Thresholds
- **Warning**: 50% of budget
- **Alert**: 80% of budget
- **Critical**: 100% of budget
- **Emergency**: 120% of budget

## Related Documentation

- [Monitoring Scripts](../monitoring/README.md)
- [Performance Scripts](../performance/README.md)
- [AWS Cost Management Best Practices](../../docs/aws-cost-optimization.md)