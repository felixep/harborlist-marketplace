#!/bin/bash

# Test Monitoring Setup for Cloudflare Tunnel Infrastructure
# This script validates that all monitoring components are working correctly

set -e

ENVIRONMENT=${1:-dev}
STACK_NAME="BoatListingStack-$ENVIRONMENT"

echo "🧪 Testing monitoring setup for environment: $ENVIRONMENT"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists aws; then
    echo "❌ AWS CLI not found. Please install it first."
    exit 1
fi

if ! command_exists jq; then
    echo "⚠️  jq not found. Installing via package manager recommended for better output formatting."
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure' first"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Get stack outputs
echo "📊 Retrieving stack information..."

get_stack_output() {
    local output_key=$1
    aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" \
        --output text 2>/dev/null || echo "Not found"
}

INSTANCE_ID=$(get_stack_output "CloudflareTunnelTunnelInstanceId")
DASHBOARD_URL=$(get_stack_output "MonitoringDashboardUrl")
ALERT_TOPIC_ARN=$(get_stack_output "MonitoringAlertTopicArn")
LOG_GROUP=$(get_stack_output "MonitoringTunnelLogGroup")

if [ "$INSTANCE_ID" = "Not found" ]; then
    echo "❌ Could not find EC2 instance ID. Is the stack deployed?"
    exit 1
fi

echo "✅ Stack information retrieved"
echo "   Instance ID: $INSTANCE_ID"
echo "   Dashboard: $DASHBOARD_URL"
echo "   Alert Topic: $ALERT_TOPIC_ARN"
echo "   Log Group: $LOG_GROUP"

# Test 1: Check EC2 instance status
echo ""
echo "🔍 Test 1: EC2 Instance Health"
echo "================================"

INSTANCE_STATE=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].State.Name' \
    --output text)

INSTANCE_STATUS=$(aws ec2 describe-instance-status \
    --instance-ids $INSTANCE_ID \
    --query 'InstanceStatuses[0].InstanceStatus.Status' \
    --output text 2>/dev/null || echo "initializing")

SYSTEM_STATUS=$(aws ec2 describe-instance-status \
    --instance-ids $INSTANCE_ID \
    --query 'InstanceStatuses[0].SystemStatus.Status' \
    --output text 2>/dev/null || echo "initializing")

echo "Instance State: $INSTANCE_STATE"
echo "Instance Status: $INSTANCE_STATUS"
echo "System Status: $SYSTEM_STATUS"

if [ "$INSTANCE_STATE" = "running" ]; then
    echo "✅ EC2 instance is running"
else
    echo "⚠️  EC2 instance is not running (State: $INSTANCE_STATE)"
fi

# Test 2: Check CloudWatch alarms
echo ""
echo "🔍 Test 2: CloudWatch Alarms"
echo "================================"

ALARMS=$(aws cloudwatch describe-alarms \
    --alarm-name-prefix "cloudflare-tunnel" \
    --query 'MetricAlarms[*].[AlarmName,StateValue,StateReason]' \
    --output text)

if [ -n "$ALARMS" ]; then
    echo "Alarm Status:"
    echo "$ALARMS" | while IFS=$'\t' read -r name state reason; do
        if [ "$state" = "OK" ]; then
            echo "✅ $name: $state"
        elif [ "$state" = "INSUFFICIENT_DATA" ]; then
            echo "⚠️  $name: $state (waiting for data)"
        else
            echo "❌ $name: $state - $reason"
        fi
    done
else
    echo "❌ No alarms found with prefix 'cloudflare-tunnel'"
fi

# Test 3: Check CloudWatch metrics
echo ""
echo "🔍 Test 3: CloudWatch Metrics"
echo "================================"

# Get recent CPU utilization
END_TIME=$(date -u +%Y-%m-%dT%H:%M:%S)
START_TIME=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)

CPU_METRICS=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/EC2 \
    --metric-name CPUUtilization \
    --dimensions Name=InstanceId,Value=$INSTANCE_ID \
    --start-time $START_TIME \
    --end-time $END_TIME \
    --period 300 \
    --statistics Average \
    --query 'Datapoints[*].Average' \
    --output text 2>/dev/null || echo "")

if [ -n "$CPU_METRICS" ]; then
    echo "✅ CPU metrics available (last hour averages):"
    echo "$CPU_METRICS" | tr '\t' '\n' | head -5 | while read -r value; do
        if [ -n "$value" ]; then
            printf "   %.2f%%\n" "$value"
        fi
    done
else
    echo "⚠️  No CPU metrics available yet (may take a few minutes after instance start)"
fi

# Test 4: Check SNS topic
echo ""
echo "🔍 Test 4: SNS Alert Topic"
echo "================================"

if [ "$ALERT_TOPIC_ARN" != "Not found" ]; then
    TOPIC_ATTRS=$(aws sns get-topic-attributes \
        --topic-arn $ALERT_TOPIC_ARN \
        --query 'Attributes.SubscriptionsConfirmed' \
        --output text 2>/dev/null || echo "0")
    
    echo "Topic ARN: $ALERT_TOPIC_ARN"
    echo "Confirmed Subscriptions: $TOPIC_ATTRS"
    
    if [ "$TOPIC_ATTRS" -gt "0" ]; then
        echo "✅ SNS topic has confirmed subscriptions"
    else
        echo "⚠️  SNS topic has no confirmed subscriptions"
        echo "   Run: aws sns subscribe --topic-arn $ALERT_TOPIC_ARN --protocol email --notification-endpoint your-email@domain.com"
    fi
else
    echo "❌ SNS topic not found"
fi

# Test 5: Check CloudWatch dashboard
echo ""
echo "🔍 Test 5: CloudWatch Dashboard"
echo "================================"

DASHBOARD_NAME="cloudflare-tunnel-$ENVIRONMENT"
DASHBOARD_EXISTS=$(aws cloudwatch list-dashboards \
    --query "DashboardEntries[?DashboardName=='$DASHBOARD_NAME'].DashboardName" \
    --output text)

if [ -n "$DASHBOARD_EXISTS" ]; then
    echo "✅ Dashboard exists: $DASHBOARD_NAME"
    echo "🔗 URL: $DASHBOARD_URL"
else
    echo "❌ Dashboard not found: $DASHBOARD_NAME"
fi

# Test 6: Check log group
echo ""
echo "🔍 Test 6: CloudWatch Log Group"
echo "================================"

if [ "$LOG_GROUP" != "Not found" ]; then
    LOG_GROUP_EXISTS=$(aws logs describe-log-groups \
        --log-group-name-prefix "$LOG_GROUP" \
        --query 'logGroups[0].logGroupName' \
        --output text 2>/dev/null || echo "None")
    
    if [ "$LOG_GROUP_EXISTS" != "None" ]; then
        echo "✅ Log group exists: $LOG_GROUP"
        
        # Check for recent log streams
        RECENT_STREAMS=$(aws logs describe-log-streams \
            --log-group-name "$LOG_GROUP" \
            --order-by LastEventTime \
            --descending \
            --max-items 1 \
            --query 'logStreams[0].logStreamName' \
            --output text 2>/dev/null || echo "None")
        
        if [ "$RECENT_STREAMS" != "None" ]; then
            echo "✅ Recent log streams found"
        else
            echo "⚠️  No log streams found (tunnel may not be logging yet)"
        fi
    else
        echo "❌ Log group not found: $LOG_GROUP"
    fi
else
    echo "❌ Log group ARN not found in stack outputs"
fi

# Test 7: Network connectivity test
echo ""
echo "🔍 Test 7: Network Connectivity"
echo "================================"

# Check if we can get network metrics
NETWORK_METRICS=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/EC2 \
    --metric-name NetworkPacketsOut \
    --dimensions Name=InstanceId,Value=$INSTANCE_ID \
    --start-time $START_TIME \
    --end-time $END_TIME \
    --period 300 \
    --statistics Sum \
    --query 'Datapoints[*].Sum' \
    --output text 2>/dev/null || echo "")

if [ -n "$NETWORK_METRICS" ]; then
    TOTAL_PACKETS=$(echo "$NETWORK_METRICS" | tr ' ' '\n' | awk '{sum += $1} END {print sum}')
    echo "✅ Network activity detected (total packets out: ${TOTAL_PACKETS:-0})"
    
    if [ "${TOTAL_PACKETS:-0}" -gt "100" ]; then
        echo "✅ Good network activity level"
    else
        echo "⚠️  Low network activity - tunnel may not be active"
    fi
else
    echo "⚠️  No network metrics available yet"
fi

# Summary
echo ""
echo "📋 Test Summary"
echo "================================"

# Count successful tests
TESTS_PASSED=0
TESTS_TOTAL=7

[ "$INSTANCE_STATE" = "running" ] && ((TESTS_PASSED++))
[ -n "$ALARMS" ] && ((TESTS_PASSED++))
[ -n "$CPU_METRICS" ] && ((TESTS_PASSED++))
[ "$ALERT_TOPIC_ARN" != "Not found" ] && ((TESTS_PASSED++))
[ -n "$DASHBOARD_EXISTS" ] && ((TESTS_PASSED++))
[ "$LOG_GROUP_EXISTS" != "None" ] && ((TESTS_PASSED++))
[ -n "$NETWORK_METRICS" ] && ((TESTS_PASSED++))

echo "Tests Passed: $TESTS_PASSED/$TESTS_TOTAL"

if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
    echo "🎉 All monitoring tests passed!"
    echo ""
    echo "🔗 Quick Links:"
    echo "   • CloudWatch Dashboard: $DASHBOARD_URL"
    echo "   • EC2 Console: https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#Instances:instanceId=$INSTANCE_ID"
    echo "   • CloudWatch Alarms: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:"
    echo ""
    echo "✅ Monitoring is fully operational!"
elif [ $TESTS_PASSED -gt $((TESTS_TOTAL / 2)) ]; then
    echo "⚠️  Most monitoring tests passed, but some issues need attention"
    echo "   Review the warnings above and fix any configuration issues"
else
    echo "❌ Multiple monitoring tests failed"
    echo "   Please review the setup and ensure all components are properly deployed"
    exit 1
fi

echo ""
echo "📚 Next Steps:"
echo "1. Configure Cloudflare analytics (see docs/cloudflare-monitoring-setup.md)"
echo "2. Subscribe to SNS alerts if not already done"
echo "3. Test alert notifications"
echo "4. Set up operational runbooks"