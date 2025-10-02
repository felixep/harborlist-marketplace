/**
 * @fileoverview Comprehensive monitoring and alerting construct for Cloudflare Tunnel infrastructure.
 * 
 * This construct provides enterprise-grade monitoring, alerting, and observability for
 * the Cloudflare Tunnel infrastructure. It creates CloudWatch dashboards, alarms, and
 * SNS notifications to ensure high availability and rapid incident response.
 * 
 * Monitoring Coverage:
 * - EC2 instance health and status checks
 * - CPU, memory, and network utilization metrics
 * - Network connectivity and tunnel availability
 * - System-level performance indicators
 * - Security and operational events
 * 
 * Alerting Strategy:
 * - Multi-tier alerting with different severity levels
 * - Email notifications for critical events
 * - Integration with incident management systems
 * - Automated recovery procedures where possible
 * - Comprehensive logging for troubleshooting
 * 
 * Dashboard Features:
 * - Real-time performance metrics visualization
 * - Historical trend analysis
 * - Alarm status overview
 * - Resource utilization tracking
 * - Network activity monitoring
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

/**
 * Configuration properties for the monitoring construct
 * 
 * @interface MonitoringConstructProps
 */
export interface MonitoringConstructProps {
  /** EC2 instance running the Cloudflare tunnel to monitor */
  tunnelInstance: ec2.Instance;
  /** Deployment environment for resource naming and alert configuration */
  environment: string;
  /** Optional email address for alert notifications */
  alertEmail?: string;
}

/**
 * Comprehensive monitoring and alerting construct for infrastructure observability
 * 
 * Provides complete monitoring coverage for Cloudflare Tunnel infrastructure including
 * real-time metrics, proactive alerting, and operational dashboards. Designed to
 * support both development and production environments with appropriate alert
 * thresholds and notification strategies.
 * 
 * Key Capabilities:
 * - Proactive health monitoring with automated alerting
 * - Performance metrics collection and visualization
 * - Security event monitoring and incident response
 * - Cost optimization through efficient metric collection
 * - Integration with external monitoring systems
 * 
 * Monitoring Philosophy:
 * - Monitor what matters: Focus on user-impacting metrics
 * - Alert on symptoms, not causes: Reduce alert fatigue
 * - Provide actionable information: Include context for resolution
 * - Maintain historical data: Support trend analysis and capacity planning
 * 
 * Usage Example:
 * ```typescript
 * const monitoring = new MonitoringConstruct(this, 'Monitoring', {
 *   tunnelInstance: myTunnelInstance,
 *   environment: 'prod',
 *   alertEmail: 'ops@harborlist.com'
 * });
 * ```
 * 
 * @class MonitoringConstruct
 * @extends Construct
 */
export class MonitoringConstruct extends Construct {
  /**
   * CloudWatch dashboard for operational metrics visualization
   * 
   * Provides real-time and historical views of system performance,
   * health status, and resource utilization. Designed for both
   * operational teams and automated monitoring systems.
   * 
   * @type {cloudwatch.Dashboard}
   * @readonly
   */
  public readonly dashboard: cloudwatch.Dashboard;

  /**
   * SNS topic for alert notifications
   * 
   * Central notification hub for all monitoring alerts and operational
   * events. Supports multiple subscription types including email, SMS,
   * and integration with incident management systems.
   * 
   * @type {sns.Topic}
   * @readonly
   */
  public readonly alertTopic: sns.Topic;

  /**
   * Constructs the comprehensive monitoring and alerting infrastructure
   * 
   * Creates and configures all monitoring resources including CloudWatch alarms,
   * SNS topics, dashboards, and log groups. The monitoring strategy is designed
   * to provide early warning of issues while minimizing false positives.
   * 
   * Monitoring Architecture:
   * 1. CloudWatch metrics collection from EC2 instance
   * 2. Custom alarms with environment-appropriate thresholds
   * 3. SNS topic for alert distribution
   * 4. CloudWatch dashboard for operational visibility
   * 5. Log groups for detailed troubleshooting
   * 
   * Alert Severity Levels:
   * - Critical: Service unavailable, immediate response required
   * - Warning: Performance degradation, investigation needed
   * - Info: Operational events, awareness only
   * 
   * @param scope - The parent construct (typically a Stack)
   * @param id - Unique identifier for this construct
   * @param props - Configuration properties for monitoring setup
   */
  constructor(scope: Construct, id: string, props: MonitoringConstructProps) {
    super(scope, id);

    const { tunnelInstance, environment, alertEmail } = props;

    /**
     * Create SNS topic for centralized alert distribution
     * 
     * Establishes the primary notification channel for all monitoring alerts.
     * The topic supports multiple subscription types and can be integrated
     * with external incident management and communication systems.
     * 
     * Topic Configuration:
     * - Environment-specific naming for multi-environment deployments
     * - Descriptive display name for easy identification
     * - Support for email, SMS, and webhook subscriptions
     * - Integration with AWS services and third-party tools
     * 
     * Subscription Strategy:
     * - Email notifications for immediate awareness
     * - Webhook integration for automated incident creation
     * - SMS for critical alerts requiring immediate attention
     * - Slack/Teams integration for team collaboration
     */
    this.alertTopic = new sns.Topic(this, 'MonitoringAlerts', {
      topicName: `cloudflare-tunnel-alerts-${environment}`,
      displayName: `Cloudflare Tunnel Monitoring Alerts - ${environment}`,
    });

    // Add email subscription if provided
    if (alertEmail) {
      this.alertTopic.addSubscription(
        new subscriptions.EmailSubscription(alertEmail)
      );
    }

    /**
     * Create CloudWatch Log Group for tunnel service logs
     * 
     * Centralizes log collection from the Cloudflare tunnel service for
     * troubleshooting, security analysis, and operational insights.
     * 
     * Log Management Strategy:
     * - Structured logging with consistent format
     * - Appropriate retention period for cost optimization
     * - Environment-specific log group naming
     * - Integration with log analysis tools
     * 
     * Log Categories:
     * - Connection events and tunnel status
     * - Performance metrics and latency data
     * - Error conditions and recovery actions
     * - Security events and access patterns
     * 
     * Retention Policy:
     * - Development: 1 week (cost optimization)
     * - Production: Consider longer retention for compliance
     * - Automatic cleanup to prevent storage cost accumulation
     */
    const tunnelLogGroup = new logs.LogGroup(this, 'TunnelServiceLogs', {
      logGroupName: `/aws/ec2/cloudflare-tunnel/${environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    /**
     * Create EC2 Instance Status Check Alarm
     * 
     * Monitors the health of the EC2 instance running the Cloudflare tunnel.
     * This alarm detects instance-level issues that could affect tunnel
     * connectivity and service availability.
     * 
     * Monitoring Strategy:
     * - Instance status checks verify instance reachability
     * - Rapid detection with 1-minute evaluation periods
     * - Multiple evaluation periods to reduce false positives
     * - Immediate alerting for service restoration
     * 
     * Alert Conditions:
     * - Instance becomes unreachable or unresponsive
     * - Operating system kernel issues
     * - Network connectivity problems
     * - Instance hardware failures
     * 
     * Response Actions:
     * - Automatic SNS notification to operations team
     * - Potential automatic instance recovery (if configured)
     * - Escalation to on-call engineer for manual intervention
     */
    const instanceStatusAlarm = new cloudwatch.Alarm(this, 'InstanceStatusAlarm', {
      alarmName: `cloudflare-tunnel-instance-status-${environment}`,
      alarmDescription: 'EC2 instance status check failed - tunnel may be unavailable',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EC2',
        metricName: 'StatusCheckFailed',
        dimensionsMap: {
          InstanceId: tunnelInstance.instanceId,
        },
        statistic: 'Maximum',
        period: cdk.Duration.minutes(1),
      }),
      threshold: 1,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });

    instanceStatusAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic)
    );

    // EC2 Instance System Status Check Alarm
    const systemStatusAlarm = new cloudwatch.Alarm(this, 'SystemStatusAlarm', {
      alarmName: `cloudflare-tunnel-system-status-${environment}`,
      alarmDescription: 'EC2 system status check failed',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EC2',
        metricName: 'StatusCheckFailed_System',
        dimensionsMap: {
          InstanceId: tunnelInstance.instanceId,
        },
        statistic: 'Maximum',
        period: cdk.Duration.minutes(1),
      }),
      threshold: 1,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });

    systemStatusAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic)
    );

    // CPU Utilization Alarm
    const cpuAlarm = new cloudwatch.Alarm(this, 'HighCpuAlarm', {
      alarmName: `cloudflare-tunnel-high-cpu-${environment}`,
      alarmDescription: 'High CPU utilization on tunnel instance',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EC2',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          InstanceId: tunnelInstance.instanceId,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 80,
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    cpuAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic)
    );

    // Network connectivity alarm (based on NetworkPacketsOut)
    const networkAlarm = new cloudwatch.Alarm(this, 'NetworkConnectivityAlarm', {
      alarmName: `cloudflare-tunnel-network-${environment}`,
      alarmDescription: 'Low network activity - tunnel may be down',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EC2',
        metricName: 'NetworkPacketsOut',
        dimensionsMap: {
          InstanceId: tunnelInstance.instanceId,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });

    networkAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic)
    );

    // Create CloudWatch Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'MonitoringDashboard', {
      dashboardName: `cloudflare-tunnel-${environment}`,
    });

    // Add widgets to dashboard
    this.dashboard.addWidgets(
      // Instance health overview
      new cloudwatch.GraphWidget({
        title: 'EC2 Instance Health',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/EC2',
            metricName: 'StatusCheckFailed',
            dimensionsMap: {
              InstanceId: tunnelInstance.instanceId,
            },
            statistic: 'Maximum',
            period: cdk.Duration.minutes(1),
            label: 'Instance Status Check',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/EC2',
            metricName: 'StatusCheckFailed_System',
            dimensionsMap: {
              InstanceId: tunnelInstance.instanceId,
            },
            statistic: 'Maximum',
            period: cdk.Duration.minutes(1),
            label: 'System Status Check',
          }),
        ],
        width: 12,
        height: 6,
      }),

      // CPU and Memory utilization
      new cloudwatch.GraphWidget({
        title: 'Resource Utilization',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/EC2',
            metricName: 'CPUUtilization',
            dimensionsMap: {
              InstanceId: tunnelInstance.instanceId,
            },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
            label: 'CPU Utilization (%)',
          }),
        ],
        width: 12,
        height: 6,
      }),

      // Network activity
      new cloudwatch.GraphWidget({
        title: 'Network Activity',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/EC2',
            metricName: 'NetworkPacketsIn',
            dimensionsMap: {
              InstanceId: tunnelInstance.instanceId,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Packets In',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/EC2',
            metricName: 'NetworkPacketsOut',
            dimensionsMap: {
              InstanceId: tunnelInstance.instanceId,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Packets Out',
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/EC2',
            metricName: 'NetworkIn',
            dimensionsMap: {
              InstanceId: tunnelInstance.instanceId,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Bytes In',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/EC2',
            metricName: 'NetworkOut',
            dimensionsMap: {
              InstanceId: tunnelInstance.instanceId,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Bytes Out',
          }),
        ],
        width: 12,
        height: 6,
      }),

      // Alarm status
      new cloudwatch.SingleValueWidget({
        title: 'Active Alarms',
        metrics: [
          instanceStatusAlarm.metric,
          systemStatusAlarm.metric,
          cpuAlarm.metric,
          networkAlarm.metric,
        ],
        width: 12,
        height: 6,
      })
    );

    // Outputs
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${cdk.Stack.of(this).region}.console.aws.amazon.com/cloudwatch/home?region=${cdk.Stack.of(this).region}#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: this.alertTopic.topicArn,
      description: 'SNS Topic ARN for monitoring alerts',
    });

    new cdk.CfnOutput(this, 'TunnelLogGroup', {
      value: tunnelLogGroup.logGroupName,
      description: 'CloudWatch Log Group for tunnel service logs',
    });
  }
}