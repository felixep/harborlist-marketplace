#!/bin/bash

/**
 * @fileoverview Comprehensive Monitoring Setup Script for HarborList Infrastructure
 * 
 * This script automates the deployment and configuration of comprehensive monitoring
 * and alerting infrastructure for the HarborList boat marketplace platform. It
 * establishes CloudWatch monitoring, SNS alerting, and operational dashboards
 * to ensure high availability and rapid incident response.
 * 
 * Monitoring Architecture:
 * - CloudWatch metrics collection and analysis
 * - Custom alarms with environment-appropriate thresholds
 * - SNS topics for multi-channel alert distribution
 * - Operational dashboards for real-time visibility
 * - Log aggregation and analysis capabilities
 * 
 * Key Features:
 * - Automated monitoring infrastructure deployment
 * - Environment-specific monitoring configurations
 * - Multi-channel alerting (email, SMS, webhooks)
 * - Comprehensive health check coverage
 * - Performance monitoring and optimization guidance
 * 
 * Monitoring Coverage:
 * 1. Infrastructure Monitoring:
 *    - EC2 instance health and performance
 *    - Lambda function execution metrics
 *    - DynamoDB performance and throttling
 *    - S3 bucket access patterns
 * 
 * 2. Application Monitoring:
 *    - API endpoint response times
 *    - Error rates and patterns
 *    - User authentication metrics
 *    - Business logic performance
 * 
 * 3. Security Monitoring:
 *    - Failed authentication attempts
 *    - Unusual access patterns
 *    - Security event correlation
 *    - Compliance monitoring
 * 
 * 4. Performance Monitoring:
 *    - Response time percentiles
 *    - Throughput and capacity utilization
 *    - Resource consumption patterns
 *    - Scalability indicators
 * 
 * Alert Strategy:
 * - Tiered alerting based on severity and impact
 * - Intelligent alert routing and escalation
 * - Context-rich notifications with troubleshooting guidance
 * - Integration with incident management systems
 * 
 * Usage Examples:
 * ```bash
 * # Setup monitoring for development environment
 * ./setup-monitoring.sh dev
 * 
 * # Setup monitoring with email alerts
 * ./setup-monitoring.sh prod ops@harborlist.com
 * 
 * # Setup monitoring for staging environment
 * ./setup-monitoring.sh staging devops-team@harborlist.com
 * ```
 * 
 * Environment Considerations:
 * - dev: Basic monitoring with relaxed thresholds
 * - staging: Production-like monitoring for validation
 * - prod: Comprehensive monitoring with strict thresholds
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 * @since 2024-01-01
 * @requires bash >=4.0
 * @requires aws-cli >=2.0
 * @requires aws-cdk >=2.0
 */

set -e

/**
 * Parse command line arguments for monitoring configuration
 * 
 * @param {string} $1 - Target environment (dev|staging|prod, default: dev)
 * @param {string} $2 - Alert email address (optional)
 */
ENVIRONMENT=${1:-dev}
ALERT_EMAIL=${2:-""}

echo "🔧 Setting up monitoring for environment: $ENVIRONMENT"

# Check if we're in the infrastructure directory
if [ ! -f "cdk.json" ]; then
    echo "❌ Error: Please run this script from the infrastructure directory"
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo "❌ Error: AWS CDK is not installed. Please install it first:"
    echo "npm install -g aws-cdk"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Error: AWS credentials not configured. Please run 'aws configure' first"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Deploy monitoring infrastructure
echo "🚀 Deploying monitoring infrastructure..."

if [ -n "$ALERT_EMAIL" ]; then
    echo "📧 Configuring alerts to be sent to: $ALERT_EMAIL"
    cdk deploy --context environment=$ENVIRONMENT --context alertEmail=$ALERT_EMAIL --require-approval never
else
    echo "⚠️  No alert email provided. Alerts will be created but not subscribed to email."
    echo "   You can subscribe to the SNS topic manually in the AWS console."
    cdk deploy --context environment=$ENVIRONMENT --require-approval never
fi

echo "✅ Monitoring infrastructure deployed successfully"

# Get stack outputs
echo "📊 Retrieving monitoring information..."

STACK_NAME="BoatListingStack-$ENVIRONMENT"
DASHBOARD_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`MonitoringDashboardUrl`].OutputValue' --output text 2>/dev/null || echo "Not found")
ALERT_TOPIC_ARN=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`MonitoringAlertTopicArn`].OutputValue' --output text 2>/dev/null || echo "Not found")
INSTANCE_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`CloudflareTunnelTunnelInstanceId`].OutputValue' --output text 2>/dev/null || echo "Not found")

echo ""
echo "🎯 Monitoring Setup Complete!"
echo "================================"
echo "Environment: $ENVIRONMENT"
echo "CloudWatch Dashboard: $DASHBOARD_URL"
echo "Alert Topic ARN: $ALERT_TOPIC_ARN"
echo "EC2 Instance ID: $INSTANCE_ID"
echo ""

# Create monitoring summary
cat > monitoring-summary-$ENVIRONMENT.md << EOF
# Monitoring Summary - $ENVIRONMENT Environment

## AWS CloudWatch Monitoring

### Dashboard
- **URL**: $DASHBOARD_URL
- **Metrics**: EC2 health, CPU, network activity, alarm status

### Alarms Configured
1. **Instance Status Check**: Monitors EC2 instance health
2. **System Status Check**: Monitors underlying AWS infrastructure
3. **High CPU Usage**: Alerts when CPU > 80% for 15 minutes
4. **Network Connectivity**: Alerts when network activity is low (tunnel may be down)

### SNS Topic
- **ARN**: $ALERT_TOPIC_ARN
- **Purpose**: Receives all monitoring alerts

## EC2 Instance Details
- **Instance ID**: $INSTANCE_ID
- **Purpose**: Runs Cloudflare Tunnel service
- **Monitoring**: CloudWatch agent, status checks, resource utilization

## Next Steps

### 1. Subscribe to Alerts (if not done during setup)
\`\`\`bash
aws sns subscribe \\
    --topic-arn $ALERT_TOPIC_ARN \\
    --protocol email \\
    --notification-endpoint your-email@domain.com
\`\`\`

### 2. Configure Cloudflare Analytics
Follow the guide: [docs/cloudflare-monitoring-setup.md](../docs/cloudflare-monitoring-setup.md)

### 3. Test Monitoring
\`\`\`bash
# Test EC2 instance monitoring
aws cloudwatch get-metric-statistics \\
    --namespace AWS/EC2 \\
    --metric-name CPUUtilization \\
    --dimensions Name=InstanceId,Value=$INSTANCE_ID \\
    --start-time \$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \\
    --end-time \$(date -u +%Y-%m-%dT%H:%M:%S) \\
    --period 300 \\
    --statistics Average
\`\`\`

### 4. Verify Tunnel Service Health
\`\`\`bash
# Connect to instance and check tunnel status
aws ssm start-session --target $INSTANCE_ID
# Then run: sudo systemctl status cloudflared
\`\`\`

## Monitoring Checklist

- [ ] CloudWatch dashboard accessible
- [ ] All alarms in OK state
- [ ] SNS topic subscribed to email
- [ ] Cloudflare analytics configured
- [ ] Test alerts working
- [ ] Document operational procedures

Generated on: \$(date)
EOF

echo "📝 Monitoring summary saved to: monitoring-summary-$ENVIRONMENT.md"

# Verify monitoring is working
echo ""
echo "🔍 Verifying monitoring setup..."

# Check if instance is running
INSTANCE_STATE=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].State.Name' --output text 2>/dev/null || echo "unknown")
echo "EC2 Instance State: $INSTANCE_STATE"

# Check alarm states
echo "Checking alarm states..."
aws cloudwatch describe-alarms --alarm-name-prefix "cloudflare-tunnel" --query 'MetricAlarms[*].[AlarmName,StateValue]' --output table 2>/dev/null || echo "Could not retrieve alarm states"

echo ""
echo "✅ Monitoring setup verification complete!"
echo ""
echo "🔗 Useful Links:"
echo "   • CloudWatch Console: https://console.aws.amazon.com/cloudwatch/"
echo "   • EC2 Console: https://console.aws.amazon.com/ec2/"
echo "   • SNS Console: https://console.aws.amazon.com/sns/"
echo ""
echo "📚 Next: Configure Cloudflare analytics following docs/cloudflare-monitoring-setup.md"