#!/bin/bash

# AWS Cost Alert Script
# Run this script daily via cron to check costs

ACCOUNT_ID="676032292155"
REGION="us-east-1"
BUDGET_LIMIT=50
WARNING_THRESHOLD=25
CRITICAL_THRESHOLD=40

# Get current month costs
CURRENT_MONTH=$(date +%Y-%m)
START_DATE="${CURRENT_MONTH}-01"
END_DATE=$(date +%Y-%m-%d)

echo "🔍 Checking AWS costs for $CURRENT_MONTH..."

# Get total costs for current month
TOTAL_COST=$(aws ce get-cost-and-usage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity MONTHLY \
  --metrics BLENDED_COST \
  --query 'ResultsByTime[0].Total.BLENDED_COST.Amount' \
  --output text 2>/dev/null || echo "0")

echo "💰 Current month cost: \$${TOTAL_COST}"

# Check thresholds
if (( $(echo "$TOTAL_COST > $CRITICAL_THRESHOLD" | bc -l) )); then
  echo "🚨 CRITICAL: Cost exceeded \$${CRITICAL_THRESHOLD}!"
  # Send alert (implement notification method)
elif (( $(echo "$TOTAL_COST > $WARNING_THRESHOLD" | bc -l) )); then
  echo "⚠️  WARNING: Cost exceeded \$${WARNING_THRESHOLD}"
  # Send warning (implement notification method)
else
  echo "✅ Cost within acceptable range"
fi

# Log to file
echo "$(date): \$${TOTAL_COST}" >> /tmp/aws-cost-log.txt

# Optional: Update tracking file
node $(dirname "$0")/update-cost-tracking.js "$TOTAL_COST"
