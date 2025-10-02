# Infrastructure Scripts Documentation

This section provides comprehensive documentation for all automation scripts used in the HarborList Marketplace infrastructure management, deployment, and monitoring.

## 📋 Overview

The HarborList infrastructure includes over 25 specialized scripts that automate various aspects of platform management, from deployment and monitoring to cost optimization and performance testing. These scripts are organized into several categories:

## 📁 Script Categories

### 🚀 [Deployment Scripts](./deployment-scripts.md)
Scripts responsible for deploying and managing the infrastructure lifecycle.

### 📊 [Monitoring Scripts](./monitoring-scripts.md)  
Scripts for system health monitoring, alerting, and performance tracking.

### 💰 [Cost Management Scripts](./cost-management-scripts.md)
Scripts for cost analysis, billing monitoring, and resource optimization.

### 🔒 [Security & Validation Scripts](./security-validation-scripts.md)
Scripts for security testing, infrastructure validation, and compliance checking.

### ⚡ [Performance Scripts](./performance-scripts.md)
Scripts for performance testing, optimization, and benchmarking.

### 🌐 [Cloudflare Management Scripts](./cloudflare-scripts.md)
Scripts for managing Cloudflare tunnel, CDN, and security configurations.

### 🔧 [Utility Scripts](./utility-scripts.md)
Helper scripts for common administrative and maintenance tasks.

## 🎯 Quick Reference

| Script Category | Primary Use Case | Key Scripts |
|---|---|---|
| Deployment | Infrastructure deployment and updates | `deploy.sh`, `verify-deployment.sh` |
| Monitoring | System health and performance tracking | `setup-monitoring.sh`, `test-monitoring.sh` |
| Cost Management | Cost optimization and billing analysis | `aws-billing-monitor.js`, `cost-analysis.js` |
| Security | Security validation and compliance | `validate-admin-infrastructure.js` |
| Performance | Performance testing and optimization | `performance-testing.js`, `run-performance-tests.sh` |
| Cloudflare | CDN and tunnel management | `cloudflare-tunnel-validation.js`, `tunnel-backup.sh` |

## 🛠️ Prerequisites

Before using these scripts, ensure you have:

- **AWS CLI** configured with appropriate credentials
- **Node.js** (v18+) for JavaScript-based scripts
- **Bash** shell for shell scripts
- **CDK CLI** for infrastructure operations
- **Cloudflare API credentials** (for Cloudflare scripts)

## 📖 Usage Patterns

### Standard Deployment Workflow
```bash
# 1. Deploy infrastructure
./infrastructure/scripts/deploy.sh dev

# 2. Verify deployment
./infrastructure/scripts/verify-deployment.sh

# 3. Set up monitoring  
./infrastructure/scripts/setup-monitoring.sh

# 4. Run performance tests
./infrastructure/scripts/run-performance-tests.sh
```

### Monitoring Workflow
```bash
# 1. Check system health
./infrastructure/scripts/test-monitoring.sh

# 2. Analyze costs
node ./infrastructure/scripts/cost-analysis.js

# 3. Generate reports
node ./infrastructure/scripts/dev-environment-status-report.js
```

## 🚨 Important Notes

- **Environment Variables**: Many scripts require environment-specific configuration
- **Permissions**: Ensure proper AWS IAM permissions for script operations
- **Dependencies**: Some scripts have interdependencies and should be run in sequence
- **Logging**: All scripts generate detailed logs for troubleshooting

## 📞 Support

For issues with infrastructure scripts:
1. Check the individual script documentation
2. Review the generated logs in the `infrastructure/reports/` directory
3. Validate AWS credentials and permissions
4. Ensure all prerequisites are installed

---

**Next**: Choose a specific script category to explore detailed documentation and usage examples.