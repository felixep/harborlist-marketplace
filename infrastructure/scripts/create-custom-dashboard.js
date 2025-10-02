#!/usr/bin/env node

/**
 * Create Custom CloudWatch Dashboard for Cloudflare Tunnel Monitoring
 * This script creates additional dashboards beyond the basic CDK-generated one
 */

const AWS = require('aws-sdk');

const cloudwatch = new AWS.CloudWatch({ region: 'us-east-1' });

async function createCustomDashboard(environment, instanceId) {
  const dashboardName = `cloudflare-tunnel-detailed-${environment}`;
  
  const dashboardBody = {
    widgets: [
      {
        type: "metric",
        x: 0,
        y: 0,
        width: 12,
        height: 6,
        properties: {
          metrics: [
            ["AWS/EC2", "CPUUtilization", "InstanceId", instanceId],
            [".", "NetworkIn", ".", "."],
            [".", "NetworkOut", ".", "."]
          ],
          view: "timeSeries",
          stacked: false,
          region: "us-east-1",
          title: "Instance Performance Overview",
          period: 300,
          stat: "Average"
        }
      },
      {
        type: "metric",
        x: 12,
        y: 0,
        width: 12,
        height: 6,
        properties: {
          metrics: [
            ["AWS/EC2", "StatusCheckFailed", "InstanceId", instanceId],
            [".", "StatusCheckFailed_Instance", ".", "."],
            [".", "StatusCheckFailed_System", ".", "."]
          ],
          view: "timeSeries",
          stacked: false,
          region: "us-east-1",
          title: "Health Checks",
          period: 60,
          stat: "Maximum",
          yAxis: {
            left: {
              min: 0,
              max: 1
            }
          }
        }
      },
      {
        type: "metric",
        x: 0,
        y: 6,
        width: 8,
        height: 6,
        properties: {
          metrics: [
            ["AWS/EC2", "NetworkPacketsIn", "InstanceId", instanceId],
            [".", "NetworkPacketsOut", ".", "."]
          ],
          view: "timeSeries",
          stacked: false,
          region: "us-east-1",
          title: "Network Packets",
          period: 300,
          stat: "Sum"
        }
      },
      {
        type: "metric",
        x: 8,
        y: 6,
        width: 8,
        height: 6,
        properties: {
          metrics: [
            ["AWS/EC2", "DiskReadBytes", "InstanceId", instanceId],
            [".", "DiskWriteBytes", ".", "."]
          ],
          view: "timeSeries",
          stacked: false,
          region: "us-east-1",
          title: "Disk I/O",
          period: 300,
          stat: "Sum"
        }
      },
      {
        type: "metric",
        x: 16,
        y: 6,
        width: 8,
        height: 6,
        properties: {
          metrics: [
            ["AWS/EC2", "CPUCreditUsage", "InstanceId", instanceId],
            [".", "CPUCreditBalance", ".", "."]
          ],
          view: "timeSeries",
          stacked: false,
          region: "us-east-1",
          title: "CPU Credits (T3 Instance)",
          period: 300,
          stat: "Average"
        }
      },
      {
        type: "log",
        x: 0,
        y: 12,
        width: 24,
        height: 6,
        properties: {
          query: `SOURCE '/aws/ec2/cloudflare-tunnel/${environment}'\n| fields @timestamp, @message\n| filter @message like /ERROR/\n| sort @timestamp desc\n| limit 100`,
          region: "us-east-1",
          title: "Recent Tunnel Errors",
          view: "table"
        }
      }
    ]
  };

  const params = {
    DashboardName: dashboardName,
    DashboardBody: JSON.stringify(dashboardBody)
  };

  try {
    await cloudwatch.putDashboard(params).promise();
    console.log(`✅ Custom dashboard created: ${dashboardName}`);
    console.log(`🔗 URL: https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=${dashboardName}`);
    return dashboardName;
  } catch (error) {
    console.error('❌ Error creating dashboard:', error.message);
    throw error;
  }
}

async function createTunnelHealthCheck(environment, instanceId) {
  const alarmName = `cloudflare-tunnel-health-composite-${environment}`;
  
  // Create a composite alarm that combines multiple health indicators
  const params = {
    AlarmName: alarmName,
    AlarmDescription: 'Composite health check for Cloudflare Tunnel',
    AlarmRule: `(ALARM "cloudflare-tunnel-instance-status-${environment}" OR ALARM "cloudflare-tunnel-system-status-${environment}" OR ALARM "cloudflare-tunnel-network-${environment}")`,
    ActionsEnabled: true,
    AlarmActions: [
      // This would be populated with the SNS topic ARN from the stack
    ]
  };

  try {
    await cloudwatch.putCompositeAlarm(params).promise();
    console.log(`✅ Composite health alarm created: ${alarmName}`);
  } catch (error) {
    console.error('❌ Error creating composite alarm:', error.message);
    // Don't throw - this is optional
  }
}

// Main execution
async function main() {
  const environment = process.argv[2] || 'dev';
  const instanceId = process.argv[3];

  if (!instanceId) {
    console.error('❌ Usage: node create-custom-dashboard.js <environment> <instance-id>');
    console.error('   Example: node create-custom-dashboard.js dev i-1234567890abcdef0');
    process.exit(1);
  }

  console.log(`🔧 Creating custom monitoring dashboard for ${environment} environment`);
  console.log(`📊 Instance ID: ${instanceId}`);

  try {
    const dashboardName = await createCustomDashboard(environment, instanceId);
    await createTunnelHealthCheck(environment, instanceId);
    
    console.log('');
    console.log('🎯 Custom monitoring setup complete!');
    console.log('================================');
    console.log(`Dashboard: ${dashboardName}`);
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Review the dashboard and customize widgets as needed');
    console.log('2. Set up log aggregation for tunnel service logs');
    console.log('3. Configure Cloudflare analytics monitoring');
    console.log('4. Test alert notifications');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createCustomDashboard, createTunnelHealthCheck };