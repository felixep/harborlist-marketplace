#!/usr/bin/env node

/**
 * Cost Monitoring Dashboard
 * Creates a simple dashboard to track AWS costs for the dev environment
 */

const fs = require('fs');
const path = require('path');

class CostMonitoringDashboard {
  constructor() {
    this.dashboardData = {
      lastUpdated: new Date().toISOString(),
      environment: 'dev',
      budgetLimit: 50, // $50/month budget
      alertThresholds: {
        warning: 25, // $25
        critical: 40  // $40
      },
      costTargets: {
        monthly: 10, // Target: $10/month after optimizations
        annual: 120  // Target: $120/year
      }
    };
  }

  generateCostTrackingTemplate() {
    const template = {
      month: new Date().toISOString().slice(0, 7), // YYYY-MM format
      actualCosts: {
        ec2: 0,
        natGateway: 0,
        s3: 0,
        apiGateway: 0,
        lambda: 0,
        dynamodb: 0,
        other: 0,
        total: 0
      },
      optimizations: {
        autoShutdownEnabled: false,
        spotInstancesEnabled: false,
        vpcEndpointsAdded: false,
        reservedInstancesPurchased: false
      },
      metrics: {
        costPerPageView: 0,
        costPerApiCall: 0,
        utilizationRate: 0
      },
      notes: []
    };

    return template;
  }

  createMonthlyTrackingFile() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const fileName = `cost-tracking-${currentMonth}.json`;
    const filePath = path.join(__dirname, '..', 'reports', fileName);
    
    // Check if file already exists
    if (fs.existsSync(filePath)) {
      console.log(`📊 Monthly tracking file already exists: ${fileName}`);
      return filePath;
    }

    const template = this.generateCostTrackingTemplate();
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(filePath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(template, null, 2));
    console.log(`📊 Created monthly tracking file: ${fileName}`);
    
    return filePath;
  }

  generateCostAlertScript() {
    const alertScript = '#!/bin/bash\n\n' +
      '# AWS Cost Alert Script\n' +
      '# Run this script daily via cron to check costs\n\n' +
      'ACCOUNT_ID="676032292155"\n' +
      'REGION="us-east-1"\n' +
      'BUDGET_LIMIT=50\n' +
      'WARNING_THRESHOLD=25\n' +
      'CRITICAL_THRESHOLD=40\n\n' +
      '# Get current month costs\n' +
      'CURRENT_MONTH=$(date +%Y-%m)\n' +
      'START_DATE="${CURRENT_MONTH}-01"\n' +
      'END_DATE=$(date +%Y-%m-%d)\n\n' +
      'echo "🔍 Checking AWS costs for $CURRENT_MONTH..."\n\n' +
      '# Get total costs for current month\n' +
      'TOTAL_COST=$(aws ce get-cost-and-usage \\\n' +
      '  --time-period Start=$START_DATE,End=$END_DATE \\\n' +
      '  --granularity MONTHLY \\\n' +
      '  --metrics BLENDED_COST \\\n' +
      '  --query \'ResultsByTime[0].Total.BLENDED_COST.Amount\' \\\n' +
      '  --output text 2>/dev/null || echo "0")\n\n' +
      'echo "💰 Current month cost: \\$${TOTAL_COST}"\n\n' +
      '# Check thresholds\n' +
      'if (( $(echo "$TOTAL_COST > $CRITICAL_THRESHOLD" | bc -l) )); then\n' +
      '  echo "🚨 CRITICAL: Cost exceeded \\$${CRITICAL_THRESHOLD}!"\n' +
      '  # Send alert (implement notification method)\n' +
      'elif (( $(echo "$TOTAL_COST > $WARNING_THRESHOLD" | bc -l) )); then\n' +
      '  echo "⚠️  WARNING: Cost exceeded \\$${WARNING_THRESHOLD}"\n' +
      '  # Send warning (implement notification method)\n' +
      'else\n' +
      '  echo "✅ Cost within acceptable range"\n' +
      'fi\n\n' +
      '# Log to file\n' +
      'echo "$(date): \\$${TOTAL_COST}" >> /tmp/aws-cost-log.txt\n\n' +
      '# Optional: Update tracking file\n' +
      'node $(dirname "$0")/update-cost-tracking.js "$TOTAL_COST"\n';

    const scriptPath = path.join(__dirname, 'cost-alert.sh');
    fs.writeFileSync(scriptPath, alertScript);
    fs.chmodSync(scriptPath, '755');
    
    console.log(`🚨 Created cost alert script: ${scriptPath}`);
    return scriptPath;
  }

  generateCostUpdateScript() {
    const updateScript = `#!/usr/bin/env node

/**
 * Update Cost Tracking Script
 * Updates the monthly cost tracking file with actual costs
 */

const fs = require('fs');
const path = require('path');

const totalCost = process.argv[2];
if (!totalCost) {
  console.error('Usage: node update-cost-tracking.js <total_cost>');
  process.exit(1);
}

const currentMonth = new Date().toISOString().slice(0, 7);
const fileName = \`cost-tracking-\${currentMonth}.json\`;
const filePath = path.join(__dirname, '..', 'reports', fileName);

if (!fs.existsSync(filePath)) {
  console.error(\`Cost tracking file not found: \${fileName}\`);
  process.exit(1);
}

const trackingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
trackingData.actualCosts.total = parseFloat(totalCost);
trackingData.lastUpdated = new Date().toISOString();

fs.writeFileSync(filePath, JSON.stringify(trackingData, null, 2));
console.log(\`📊 Updated cost tracking: $\${totalCost}\`);
`;

    const scriptPath = path.join(__dirname, 'update-cost-tracking.js');
    fs.writeFileSync(scriptPath, updateScript);
    fs.chmodSync(scriptPath, '755');
    
    console.log(`📊 Created cost update script: ${scriptPath}`);
    return scriptPath;
  }

  generateOptimizationChecklist() {
    const checklist = {
      title: "AWS Cost Optimization Checklist",
      environment: "dev",
      lastUpdated: new Date().toISOString(),
      optimizations: [
        {
          id: "auto-shutdown",
          title: "Implement Auto-Shutdown for Development Hours",
          description: "Stop EC2 instances and NAT Gateway during off-hours",
          impact: "High",
          effort: "Medium",
          potentialSavings: "$24/month",
          status: "pending",
          steps: [
            "Install AWS Instance Scheduler",
            "Configure schedule for weekdays 9 AM - 6 PM",
            "Test shutdown/startup process",
            "Monitor cost reduction"
          ],
          resources: [
            "https://aws.amazon.com/solutions/implementations/instance-scheduler/",
            "https://docs.aws.amazon.com/solutions/latest/instance-scheduler/overview.html"
          ]
        },
        {
          id: "spot-instances",
          title: "Convert to Spot Instances",
          description: "Use Spot Instances for development EC2 workloads",
          impact: "Medium",
          effort: "Medium",
          potentialSavings: "$5.24/month",
          status: "pending",
          steps: [
            "Create Auto Scaling Group with Spot Instance configuration",
            "Update user data script for resilience",
            "Test instance replacement scenarios",
            "Monitor availability and costs"
          ],
          resources: [
            "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html"
          ]
        },
        {
          id: "vpc-endpoints",
          title: "Add VPC Endpoints for AWS Services",
          description: "Reduce NAT Gateway usage by adding VPC endpoints",
          impact: "Low",
          effort: "Low",
          potentialSavings: "$0.05/month",
          status: "pending",
          steps: [
            "Identify frequently used AWS services",
            "Create VPC endpoints for Lambda, API Gateway",
            "Update route tables",
            "Monitor data transfer reduction"
          ],
          resources: [
            "https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints.html"
          ]
        },
        {
          id: "cost-monitoring",
          title: "Set Up Comprehensive Cost Monitoring",
          description: "Implement budgets, alerts, and detailed tracking",
          impact: "High",
          effort: "Low",
          potentialSavings: "Prevention of cost overruns",
          status: "in-progress",
          steps: [
            "Create AWS Budget with $50 limit",
            "Set up billing alerts at $25 and $40",
            "Enable Cost Anomaly Detection",
            "Implement cost allocation tags"
          ],
          resources: [
            "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/budgets-managing-costs.html"
          ]
        },
        {
          id: "architecture-review",
          title: "Evaluate Alternative Architectures",
          description: "Consider reverting to CloudFront for dev environment",
          impact: "High",
          effort: "High",
          potentialSavings: "$39.90/month",
          status: "pending",
          steps: [
            "Document current architecture benefits",
            "Evaluate CloudFront alternative for dev",
            "Consider hybrid approach (CloudFront for dev, Tunnel for prod)",
            "Implement cost-benefit analysis"
          ],
          resources: [
            "Internal architecture documentation"
          ]
        }
      ],
      summary: {
        totalOptimizations: 5,
        totalPotentialSavings: "$69.19/month",
        highImpactItems: 3,
        quickWins: 2
      }
    };

    const checklistPath = path.join(__dirname, '..', 'reports', 'cost-optimization-checklist.json');
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(checklistPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(checklistPath, JSON.stringify(checklist, null, 2));
    console.log(`✅ Created optimization checklist: ${checklistPath}`);
    
    return checklist;
  }

  generateDashboardHTML() {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AWS Cost Monitoring Dashboard - Dev Environment</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #232f3e; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-value { font-size: 2em; font-weight: bold; color: #232f3e; }
        .metric-label { color: #666; font-size: 0.9em; }
        .alert { padding: 15px; border-radius: 4px; margin: 10px 0; }
        .alert-warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
        .alert-danger { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .alert-success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: #007bff; transition: width 0.3s ease; }
        .optimization-item { border-left: 4px solid #007bff; padding: 10px; margin: 10px 0; background: #f8f9fa; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
        .status-pending { color: #ffc107; }
        .status-complete { color: #28a745; }
        .status-in-progress { color: #007bff; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏗️ AWS Cost Monitoring Dashboard</h1>
            <p>Development Environment - Cloudflare Tunnel Architecture</p>
            <p>Last Updated: <span id="lastUpdated">${new Date().toLocaleString()}</span></p>
        </div>

        <div class="card">
            <h2>💰 Current Month Costs</h2>
            <div class="metric">
                <div class="metric-value" id="totalCost">$40.04</div>
                <div class="metric-label">Total Cost</div>
            </div>
            <div class="metric">
                <div class="metric-value" id="budgetUsed">80%</div>
                <div class="metric-label">Budget Used</div>
            </div>
            <div class="metric">
                <div class="metric-value" id="daysRemaining">3</div>
                <div class="metric-label">Days Remaining</div>
            </div>
            
            <div class="alert alert-danger">
                🚨 <strong>Critical:</strong> Cost has exceeded the warning threshold of $25/month
            </div>
            
            <h3>Budget Progress</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 80%;"></div>
            </div>
            <p>$40.04 of $50.00 budget used (80%)</p>
        </div>

        <div class="card">
            <h2>📊 Cost Breakdown</h2>
            <table>
                <thead>
                    <tr>
                        <th>Service</th>
                        <th>Current Cost</th>
                        <th>Percentage</th>
                        <th>Trend</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>NAT Gateway</td>
                        <td>$32.49</td>
                        <td>81.1%</td>
                        <td>📈 High</td>
                    </tr>
                    <tr>
                        <td>EC2 (t3.micro)</td>
                        <td>$7.49</td>
                        <td>18.7%</td>
                        <td>📈 High</td>
                    </tr>
                    <tr>
                        <td>API Gateway</td>
                        <td>$0.02</td>
                        <td>0.1%</td>
                        <td>📊 Stable</td>
                    </tr>
                    <tr>
                        <td>Lambda</td>
                        <td>$0.01</td>
                        <td>0.0%</td>
                        <td>📊 Stable</td>
                    </tr>
                    <tr>
                        <td>DynamoDB</td>
                        <td>$0.03</td>
                        <td>0.1%</td>
                        <td>📊 Stable</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="card">
            <h2>🔧 Optimization Status</h2>
            <div class="optimization-item">
                <h4>Auto-Shutdown Implementation</h4>
                <p><span class="status-pending">⏳ Pending</span> - Potential savings: $24/month</p>
                <p>Configure AWS Instance Scheduler for development hours</p>
            </div>
            <div class="optimization-item">
                <h4>Spot Instances</h4>
                <p><span class="status-pending">⏳ Pending</span> - Potential savings: $5.24/month</p>
                <p>Convert EC2 instances to Spot for development workloads</p>
            </div>
            <div class="optimization-item">
                <h4>Cost Monitoring</h4>
                <p><span class="status-in-progress">🔄 In Progress</span> - Prevention of overruns</p>
                <p>Set up AWS Budgets and billing alerts</p>
            </div>
        </div>

        <div class="card">
            <h2>📈 Recommendations</h2>
            <div class="alert alert-warning">
                <strong>Immediate Action Required:</strong>
                <ul>
                    <li>Implement auto-shutdown to reduce costs by 60%</li>
                    <li>Set up AWS Budget with $50 monthly limit</li>
                    <li>Consider reverting to CloudFront for dev environment</li>
                </ul>
            </div>
        </div>

        <div class="card">
            <h2>📋 Quick Actions</h2>
            <p>Run these commands to implement cost optimizations:</p>
            <pre><code># Set up cost monitoring
aws budgets create-budget --account-id 676032292155 --budget file://budget.json

# Check current costs
aws ce get-cost-and-usage --time-period Start=2025-09-01,End=2025-09-28 --granularity MONTHLY --metrics BLENDED_COST

# Run cost analysis
node tools/cost-management/cost-analysis.js</code></pre>
        </div>
    </div>

    <script>
        // Auto-refresh every 5 minutes
        setTimeout(() => location.reload(), 300000);
        
        // Update last updated time
        document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
    </script>
</body>
</html>`;

    const dashboardPath = path.join(__dirname, '..', 'reports', 'cost-dashboard.html');
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(dashboardPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(dashboardPath, html);
    console.log(`📊 Created cost dashboard: ${dashboardPath}`);
    
    return dashboardPath;
  }

  run() {
    console.log('📊 Setting up Cost Monitoring Dashboard...\n');
    
    // Create monthly tracking file
    const trackingFile = this.createMonthlyTrackingFile();
    
    // Generate monitoring scripts
    const alertScript = this.generateCostAlertScript();
    const updateScript = this.generateCostUpdateScript();
    
    // Create optimization checklist
    const checklist = this.generateOptimizationChecklist();
    
    // Generate HTML dashboard
    const dashboardPath = this.generateDashboardHTML();
    
    console.log('\n✅ Cost Monitoring Dashboard Setup Complete!\n');
    console.log('📁 Files Created:');
    console.log(`   📊 Monthly Tracking: ${trackingFile}`);
    console.log(`   🚨 Cost Alert Script: ${alertScript}`);
    console.log(`   📊 Cost Update Script: ${updateScript}`);
    console.log(`   ✅ Optimization Checklist: ${path.join(__dirname, '..', 'reports', 'cost-optimization-checklist.json')}`);
    console.log(`   🌐 HTML Dashboard: ${dashboardPath}`);
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Set up cron job for daily cost alerts:');
    console.log(`      echo "0 9 * * * ${alertScript}" | crontab -`);
    console.log('   2. Open HTML dashboard in browser:');
    console.log(`      open ${dashboardPath}`);
    console.log('   3. Implement cost optimizations from checklist');
    console.log('   4. Set up AWS Budgets and billing alerts');
    
    return {
      trackingFile,
      alertScript,
      updateScript,
      checklist,
      dashboardPath
    };
  }
}

// Run if executed directly
if (require.main === module) {
  const dashboard = new CostMonitoringDashboard();
  dashboard.run();
}

module.exports = CostMonitoringDashboard;