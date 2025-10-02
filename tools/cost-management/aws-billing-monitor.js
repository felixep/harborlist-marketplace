#!/usr/bin/env node

/**
 * AWS Billing Monitor Script
 * Retrieves actual AWS costs for the dev environment resources
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AWSBillingMonitor {
  constructor() {
    this.region = 'us-east-1';
    this.accountId = null;
    this.stackName = 'BoatListingStack-dev';
  }

  async getAccountId() {
    try {
      const result = execSync('aws sts get-caller-identity --query Account --output text', { encoding: 'utf8' });
      this.accountId = result.trim();
      console.log(`📋 AWS Account ID: ${this.accountId}`);
      return this.accountId;
    } catch (error) {
      console.error('❌ Error getting AWS account ID:', error.message);
      console.log('💡 Make sure AWS CLI is configured with valid credentials');
      return null;
    }
  }

  async getStackResources() {
    try {
      console.log(`🔍 Getting resources for stack: ${this.stackName}`);
      const result = execSync(`aws cloudformation describe-stack-resources --stack-name ${this.stackName} --region ${this.region} --output json`, { encoding: 'utf8' });
      const resources = JSON.parse(result);
      
      console.log(`📦 Found ${resources.StackResources.length} resources in stack`);
      
      const resourcesByType = {};
      resources.StackResources.forEach(resource => {
        const type = resource.ResourceType;
        if (!resourcesByType[type]) {
          resourcesByType[type] = [];
        }
        resourcesByType[type].push({
          logicalId: resource.LogicalResourceId,
          physicalId: resource.PhysicalResourceId,
          type: resource.ResourceType,
          status: resource.ResourceStatus
        });
      });
      
      return resourcesByType;
    } catch (error) {
      console.error('❌ Error getting stack resources:', error.message);
      console.log('💡 Make sure the stack exists and you have permissions to describe it');
      return null;
    }
  }

  async getCostAndUsage(startDate, endDate) {
    try {
      console.log(`💰 Getting cost and usage data from ${startDate} to ${endDate}`);
      
      const command = `aws ce get-cost-and-usage \\
        --time-period Start=${startDate},End=${endDate} \\
        --granularity MONTHLY \\
        --metrics BLENDED_COST \\
        --group-by Type=DIMENSION,Key=SERVICE \\
        --region ${this.region} \\
        --output json`;
      
      const result = execSync(command, { encoding: 'utf8' });
      const costData = JSON.parse(result);
      
      return costData;
    } catch (error) {
      console.error('❌ Error getting cost and usage data:', error.message);
      console.log('💡 Make sure you have Cost Explorer API permissions');
      return null;
    }
  }

  async getEC2Costs(startDate, endDate) {
    try {
      const command = `aws ce get-cost-and-usage \\
        --time-period Start=${startDate},End=${endDate} \\
        --granularity MONTHLY \\
        --metrics BLENDED_COST \\
        --group-by Type=DIMENSION,Key=INSTANCE_TYPE \\
        --filter '{"Dimensions":{"Key":"SERVICE","Values":["Amazon Elastic Compute Cloud - Compute"]}}' \\
        --region ${this.region} \\
        --output json`;
      
      const result = execSync(command, { encoding: 'utf8' });
      return JSON.parse(result);
    } catch (error) {
      console.error('❌ Error getting EC2 costs:', error.message);
      return null;
    }
  }

  async getCurrentMonthCosts() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = startOfMonth.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];
    
    console.log(`📅 Analyzing costs for current month: ${startDate} to ${endDate}`);
    
    const costData = await this.getCostAndUsage(startDate, endDate);
    if (!costData) return null;
    
    const serviceCosts = {};
    let totalCost = 0;
    
    if (costData.ResultsByTime && costData.ResultsByTime.length > 0) {
      const monthData = costData.ResultsByTime[0];
      
      monthData.Groups.forEach(group => {
        const serviceName = group.Keys[0];
        const cost = parseFloat(group.Metrics.BLENDED_COST.Amount);
        serviceCosts[serviceName] = cost;
        totalCost += cost;
      });
    }
    
    return {
      period: `${startDate} to ${endDate}`,
      serviceCosts,
      totalCost,
      currency: costData.ResultsByTime?.[0]?.Total?.BlendedCost?.Unit || 'USD'
    };
  }

  async getResourceUtilization() {
    try {
      // Get EC2 instance utilization
      const ec2Command = `aws cloudwatch get-metric-statistics \\
        --namespace AWS/EC2 \\
        --metric-name CPUUtilization \\
        --dimensions Name=InstanceId,Value=i-0123456789abcdef0 \\
        --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \\
        --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \\
        --period 3600 \\
        --statistics Average \\
        --region ${this.region} \\
        --output json`;
      
      // Note: This would need the actual instance ID from the stack resources
      console.log('📊 Resource utilization monitoring would require specific resource IDs');
      console.log('💡 Implement after getting actual resource IDs from stack');
      
      return {
        note: 'Resource utilization monitoring requires specific resource IDs',
        recommendation: 'Use CloudWatch dashboards for detailed utilization metrics'
      };
    } catch (error) {
      console.error('❌ Error getting resource utilization:', error.message);
      return null;
    }
  }

  generateBillingReport(costData, resources) {
    const reportDate = new Date().toISOString().split('T')[0];
    
    const report = {
      reportDate,
      accountId: this.accountId,
      region: this.region,
      stackName: this.stackName,
      period: costData?.period || 'N/A',
      actualCosts: costData || {},
      resources: resources || {},
      recommendations: [
        'Set up AWS Budgets to track spending',
        'Enable Cost Anomaly Detection',
        'Use AWS Cost Explorer for detailed analysis',
        'Implement cost allocation tags for better tracking',
        'Consider Reserved Instances for predictable workloads'
      ],
      costOptimizations: [
        {
          service: 'EC2',
          current: 'On-Demand t3.micro',
          recommendation: 'Use Spot Instances for dev environment',
          potentialSavings: '70%'
        },
        {
          service: 'NAT Gateway',
          current: 'Always-on NAT Gateway',
          recommendation: 'Implement auto-shutdown during off-hours',
          potentialSavings: '60%'
        },
        {
          service: 'VPC',
          current: 'Basic VPC setup',
          recommendation: 'Add more VPC endpoints to reduce NAT Gateway usage',
          potentialSavings: '20-30%'
        }
      ]
    };
    
    // Save report
    const reportPath = path.join(__dirname, '..', 'reports', `billing-report-${reportDate}.json`);
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Billing report saved to: ${reportPath}`);
    
    return report;
  }

  async run() {
    console.log('💳 AWS Billing Monitor for Dev Environment\n');
    
    // Get account information
    await this.getAccountId();
    if (!this.accountId) {
      console.log('❌ Cannot proceed without AWS account access');
      return;
    }
    
    // Get stack resources
    console.log('\n🔍 Analyzing Stack Resources...');
    const resources = await this.getStackResources();
    
    if (resources) {
      console.log('\n📦 Resource Summary:');
      Object.keys(resources).forEach(type => {
        console.log(`   ${type}: ${resources[type].length} resource(s)`);
      });
    }
    
    // Get current month costs
    console.log('\n💰 Analyzing Current Month Costs...');
    const costData = await this.getCurrentMonthCosts();
    
    if (costData) {
      console.log(`\n💵 Current Month Spending (${costData.period}):`);
      console.log(`   Total: $${costData.totalCost.toFixed(2)} ${costData.currency}`);
      
      if (Object.keys(costData.serviceCosts).length > 0) {
        console.log('\n📊 Costs by Service:');
        Object.entries(costData.serviceCosts)
          .sort(([,a], [,b]) => b - a)
          .forEach(([service, cost]) => {
            if (cost > 0.01) { // Only show costs > $0.01
              console.log(`   ${service}: $${cost.toFixed(2)}`);
            }
          });
      } else {
        console.log('   No significant costs found for current month');
      }
    }
    
    // Generate report
    console.log('\n📋 Generating Billing Report...');
    const report = this.generateBillingReport(costData, resources);
    
    console.log('\n✅ Billing analysis complete!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Set up AWS Budgets for cost alerts');
    console.log('   2. Enable detailed billing reports');
    console.log('   3. Implement cost allocation tags');
    console.log('   4. Review and implement cost optimizations');
    
    return report;
  }
}

// Run if executed directly
if (require.main === module) {
  const monitor = new AWSBillingMonitor();
  monitor.run().catch(console.error);
}

module.exports = AWSBillingMonitor;