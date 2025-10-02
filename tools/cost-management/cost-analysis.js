#!/usr/bin/env node

/**
 * Cost Analysis Script for Dev Environment
 * Compares Cloudflare Tunnel architecture costs with previous CloudFront setup
 */

const fs = require('fs');
const path = require('path');

// AWS Pricing (US East 1 - as of 2024)
const AWS_PRICING = {
  // EC2 t3.micro pricing
  ec2: {
    t3_micro_hourly: 0.0104, // per hour
    t3_micro_monthly: 0.0104 * 24 * 30, // ~$7.49/month
  },
  
  // NAT Gateway pricing
  natGateway: {
    hourly: 0.045, // per hour
    monthly: 0.045 * 24 * 30, // ~$32.40/month
    dataProcessing: 0.045, // per GB processed
  },
  
  // VPC Endpoint pricing (Gateway endpoints are free)
  vpcEndpoint: {
    s3Gateway: 0, // S3 Gateway endpoints are free
  },
  
  // S3 pricing
  s3: {
    storage: 0.023, // per GB/month (Standard)
    requests_get: 0.0004 / 1000, // per 1000 GET requests
    requests_put: 0.005 / 1000, // per 1000 PUT requests
    dataTransfer: 0.09, // per GB out to internet (first 1GB free)
  },
  
  // CloudFront pricing (previous architecture)
  cloudfront: {
    dataTransfer: 0.085, // per GB for first 10TB
    requests: 0.0075 / 10000, // per 10,000 requests
    originRequests: 0.0075 / 10000, // per 10,000 origin requests
  },
  
  // API Gateway pricing
  apiGateway: {
    requests: 3.50 / 1000000, // per million requests
    dataTransfer: 0.09, // per GB out
  },
  
  // Lambda pricing
  lambda: {
    requests: 0.20 / 1000000, // per million requests
    duration: 0.0000166667, // per GB-second
  },
  
  // DynamoDB pricing
  dynamodb: {
    onDemand_write: 1.25 / 1000000, // per million write request units
    onDemand_read: 0.25 / 1000000, // per million read request units
    storage: 0.25, // per GB/month
  }
};

// Estimated usage patterns for dev environment
const DEV_USAGE = {
  // Traffic estimates (low for dev environment)
  monthlyPageViews: 1000,
  monthlyApiCalls: 5000,
  averagePageSize: 2, // MB
  averageApiResponse: 0.01, // MB (10KB)
  
  // Storage estimates
  frontendAssets: 0.1, // GB (100MB)
  mediaStorage: 1, // GB
  databaseStorage: 0.1, // GB
  
  // Development activity
  deployments: 20, // per month
  developmentHours: 160, // hours per month (full-time dev)
};

class CostAnalyzer {
  constructor() {
    this.currentArchitectureCosts = {};
    this.previousArchitectureCosts = {};
    this.analysis = {};
  }

  calculateCurrentArchitectureCosts() {
    console.log('📊 Calculating Current Architecture Costs (Cloudflare Tunnel)...\n');
    
    // EC2 Instance (t3.micro)
    const ec2Cost = AWS_PRICING.ec2.t3_micro_monthly;
    console.log(`EC2 t3.micro instance: $${ec2Cost.toFixed(2)}/month`);
    
    // NAT Gateway
    const natGatewayCost = AWS_PRICING.natGateway.monthly;
    const natDataCost = (DEV_USAGE.monthlyPageViews * DEV_USAGE.averagePageSize + 
                        DEV_USAGE.monthlyApiCalls * DEV_USAGE.averageApiResponse) * 
                        AWS_PRICING.natGateway.dataProcessing / 1024; // Convert MB to GB
    console.log(`NAT Gateway (fixed): $${natGatewayCost.toFixed(2)}/month`);
    console.log(`NAT Gateway (data processing): $${natDataCost.toFixed(2)}/month`);
    
    // S3 Storage and requests
    const s3StorageCost = DEV_USAGE.frontendAssets * AWS_PRICING.s3.storage;
    const s3RequestsCost = (DEV_USAGE.monthlyPageViews * 5) * AWS_PRICING.s3.requests_get; // ~5 requests per page
    console.log(`S3 Storage: $${s3StorageCost.toFixed(2)}/month`);
    console.log(`S3 Requests: $${s3RequestsCost.toFixed(2)}/month`);
    
    // API Gateway
    const apiGatewayCost = DEV_USAGE.monthlyApiCalls * AWS_PRICING.apiGateway.requests;
    console.log(`API Gateway: $${apiGatewayCost.toFixed(2)}/month`);
    
    // Lambda (minimal for dev)
    const lambdaCost = DEV_USAGE.monthlyApiCalls * AWS_PRICING.lambda.requests + 
                      (DEV_USAGE.monthlyApiCalls * 0.1) * AWS_PRICING.lambda.duration; // 100ms average
    console.log(`Lambda: $${lambdaCost.toFixed(2)}/month`);
    
    // DynamoDB (minimal usage)
    const dynamoDbCost = (DEV_USAGE.monthlyApiCalls * 0.5) * AWS_PRICING.dynamodb.onDemand_read +
                        (DEV_USAGE.monthlyApiCalls * 0.2) * AWS_PRICING.dynamodb.onDemand_write +
                        DEV_USAGE.databaseStorage * AWS_PRICING.dynamodb.storage;
    console.log(`DynamoDB: $${dynamoDbCost.toFixed(2)}/month`);
    
    const totalCurrent = ec2Cost + natGatewayCost + natDataCost + s3StorageCost + 
                        s3RequestsCost + apiGatewayCost + lambdaCost + dynamoDbCost;
    
    this.currentArchitectureCosts = {
      ec2: ec2Cost,
      natGateway: natGatewayCost + natDataCost,
      s3: s3StorageCost + s3RequestsCost,
      apiGateway: apiGatewayCost,
      lambda: lambdaCost,
      dynamodb: dynamoDbCost,
      total: totalCurrent
    };
    
    console.log(`\n💰 Total Current Architecture: $${totalCurrent.toFixed(2)}/month\n`);
    return totalCurrent;
  }

  calculatePreviousArchitectureCosts() {
    console.log('📊 Calculating Previous Architecture Costs (CloudFront + S3)...\n');
    
    // CloudFront
    const totalDataTransfer = (DEV_USAGE.monthlyPageViews * DEV_USAGE.averagePageSize) / 1024; // Convert to GB
    const cloudfrontDataCost = Math.max(0, totalDataTransfer - 1) * AWS_PRICING.cloudfront.dataTransfer; // First 1GB free
    const cloudfrontRequestsCost = DEV_USAGE.monthlyPageViews * AWS_PRICING.cloudfront.requests;
    const cloudfrontOriginCost = DEV_USAGE.monthlyPageViews * AWS_PRICING.cloudfront.originRequests;
    const totalCloudfrontCost = cloudfrontDataCost + cloudfrontRequestsCost + cloudfrontOriginCost;
    console.log(`CloudFront (data transfer): $${cloudfrontDataCost.toFixed(2)}/month`);
    console.log(`CloudFront (requests): $${cloudfrontRequestsCost.toFixed(2)}/month`);
    console.log(`CloudFront (origin requests): $${cloudfrontOriginCost.toFixed(2)}/month`);
    console.log(`CloudFront Total: $${totalCloudfrontCost.toFixed(2)}/month`);
    
    // S3 (same as current)
    const s3StorageCost = DEV_USAGE.frontendAssets * AWS_PRICING.s3.storage;
    const s3RequestsCost = (DEV_USAGE.monthlyPageViews * 5) * AWS_PRICING.s3.requests_get;
    console.log(`S3 Storage: $${s3StorageCost.toFixed(2)}/month`);
    console.log(`S3 Requests: $${s3RequestsCost.toFixed(2)}/month`);
    
    // API Gateway (same as current)
    const apiGatewayCost = DEV_USAGE.monthlyApiCalls * AWS_PRICING.apiGateway.requests;
    console.log(`API Gateway: $${apiGatewayCost.toFixed(2)}/month`);
    
    // Lambda (same as current)
    const lambdaCost = DEV_USAGE.monthlyApiCalls * AWS_PRICING.lambda.requests + 
                      (DEV_USAGE.monthlyApiCalls * 0.1) * AWS_PRICING.lambda.duration;
    console.log(`Lambda: $${lambdaCost.toFixed(2)}/month`);
    
    // DynamoDB (same as current)
    const dynamoDbCost = (DEV_USAGE.monthlyApiCalls * 0.5) * AWS_PRICING.dynamodb.onDemand_read +
                        (DEV_USAGE.monthlyApiCalls * 0.2) * AWS_PRICING.dynamodb.onDemand_write +
                        DEV_USAGE.databaseStorage * AWS_PRICING.dynamodb.storage;
    console.log(`DynamoDB: $${dynamoDbCost.toFixed(2)}/month`);
    
    const totalPrevious = totalCloudfrontCost + s3StorageCost + s3RequestsCost + 
                         apiGatewayCost + lambdaCost + dynamoDbCost;
    
    this.previousArchitectureCosts = {
      cloudfront: totalCloudfrontCost,
      s3: s3StorageCost + s3RequestsCost,
      apiGateway: apiGatewayCost,
      lambda: lambdaCost,
      dynamodb: dynamoDbCost,
      total: totalPrevious
    };
    
    console.log(`\n💰 Total Previous Architecture: $${totalPrevious.toFixed(2)}/month\n`);
    return totalPrevious;
  }

  performComparison() {
    const currentTotal = this.currentArchitectureCosts.total;
    const previousTotal = this.previousArchitectureCosts.total;
    const difference = currentTotal - previousTotal;
    const percentageChange = ((difference / previousTotal) * 100);
    
    console.log('🔍 Cost Comparison Analysis\n');
    console.log('=' .repeat(50));
    console.log(`Previous Architecture (CloudFront): $${previousTotal.toFixed(2)}/month`);
    console.log(`Current Architecture (Tunnel):      $${currentTotal.toFixed(2)}/month`);
    console.log('=' .repeat(50));
    
    if (difference > 0) {
      console.log(`❌ Cost INCREASE: +$${difference.toFixed(2)}/month (+${percentageChange.toFixed(1)}%)`);
    } else {
      console.log(`✅ Cost SAVINGS: -$${Math.abs(difference).toFixed(2)}/month (${Math.abs(percentageChange).toFixed(1)}%)`);
    }
    
    console.log(`\n📈 Annual Impact: ${difference > 0 ? '+' : ''}$${(difference * 12).toFixed(2)}/year\n`);
    
    this.analysis = {
      currentTotal,
      previousTotal,
      difference,
      percentageChange,
      annualImpact: difference * 12,
      meetsRequirement: Math.abs(percentageChange) >= 20 // Requirement 5.4: at least 20% cheaper
    };
  }

  identifyOptimizationOpportunities() {
    console.log('🔧 Cost Optimization Opportunities\n');
    
    const opportunities = [];
    
    // NAT Gateway is the biggest cost component
    if (this.currentArchitectureCosts.natGateway > 20) {
      opportunities.push({
        component: 'NAT Gateway',
        currentCost: this.currentArchitectureCosts.natGateway,
        opportunity: 'Consider using VPC Endpoints for more AWS services to reduce NAT Gateway usage',
        potentialSavings: 'Up to 50% reduction in data processing costs',
        implementation: 'Add VPC endpoints for Lambda, API Gateway, and other services'
      });
    }
    
    // EC2 instance optimization
    opportunities.push({
      component: 'EC2 Instance',
      currentCost: this.currentArchitectureCosts.ec2,
      opportunity: 'Use Spot Instances for dev environment',
      potentialSavings: 'Up to 70% reduction in EC2 costs',
      implementation: 'Configure Auto Scaling Group with Spot Instances'
    });
    
    // Reserved Instances for predictable workloads
    if (this.currentArchitectureCosts.total > 50) {
      opportunities.push({
        component: 'Overall Infrastructure',
        currentCost: this.currentArchitectureCosts.total,
        opportunity: 'Consider Reserved Instances for production environments',
        potentialSavings: 'Up to 30% reduction for 1-year commitment',
        implementation: 'Purchase Reserved Instances for EC2 and RDS (when added)'
      });
    }
    
    // Development-specific optimizations
    opportunities.push({
      component: 'Development Workflow',
      currentCost: 'N/A',
      opportunity: 'Implement auto-shutdown for dev resources during off-hours',
      potentialSavings: 'Up to 60% reduction in EC2 and NAT Gateway costs',
      implementation: 'Use AWS Instance Scheduler or Lambda functions to stop/start resources'
    });
    
    opportunities.forEach((opp, index) => {
      console.log(`${index + 1}. ${opp.component}`);
      console.log(`   Current Cost: $${typeof opp.currentCost === 'number' ? opp.currentCost.toFixed(2) : opp.currentCost}/month`);
      console.log(`   Opportunity: ${opp.opportunity}`);
      console.log(`   Potential Savings: ${opp.potentialSavings}`);
      console.log(`   Implementation: ${opp.implementation}\n`);
    });
    
    return opportunities;
  }

  generateReport() {
    const reportDate = new Date().toISOString().split('T')[0];
    const report = {
      reportDate,
      environment: 'dev',
      architecture: 'Cloudflare Tunnel with VPC Endpoint',
      costs: {
        current: this.currentArchitectureCosts,
        previous: this.previousArchitectureCosts,
        comparison: this.analysis
      },
      optimizations: this.identifyOptimizationOpportunities(),
      recommendations: [
        'Monitor actual usage patterns over 30 days to refine cost estimates',
        'Implement cost alerts in AWS Billing Console',
        'Consider auto-shutdown for dev resources during off-hours',
        'Evaluate Spot Instances for non-critical development workloads',
        'Review and optimize data transfer patterns'
      ],
      nextSteps: [
        'Set up AWS Cost Explorer for detailed cost tracking',
        'Implement CloudWatch billing alarms',
        'Create monthly cost review process',
        'Evaluate cost optimization opportunities quarterly'
      ]
    };
    
    // Save report to file
    const reportPath = path.join(__dirname, '..', 'reports', `cost-analysis-${reportDate}.json`);
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}\n`);
    
    return report;
  }

  run() {
    console.log('🏗️  AWS Cost Analysis for Dev Environment\n');
    console.log('Analyzing Cloudflare Tunnel Architecture vs Previous CloudFront Setup\n');
    
    this.calculateCurrentArchitectureCosts();
    this.calculatePreviousArchitectureCosts();
    this.performComparison();
    
    const report = this.generateReport();
    
    // Summary
    console.log('📋 Summary\n');
    console.log(`✅ Analysis completed for ${report.environment} environment`);
    console.log(`📊 Cost difference: ${this.analysis.difference > 0 ? '+' : ''}$${this.analysis.difference.toFixed(2)}/month`);
    console.log(`🎯 Meets 20% cost reduction requirement: ${this.analysis.meetsRequirement ? 'NO' : 'YES'}`);
    console.log(`📈 Annual impact: ${this.analysis.difference > 0 ? '+' : ''}$${this.analysis.annualImpact.toFixed(2)}/year`);
    
    if (!this.analysis.meetsRequirement) {
      console.log('\n⚠️  WARNING: Current architecture does not meet the 20% cost reduction requirement.');
      console.log('   Consider implementing the optimization opportunities listed above.');
    }
    
    return report;
  }
}

// Run the analysis if this script is executed directly
if (require.main === module) {
  const analyzer = new CostAnalyzer();
  analyzer.run();
}

module.exports = CostAnalyzer;