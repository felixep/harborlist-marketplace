# Monitoring Scripts

This directory contains scripts for setting up, testing, and managing monitoring infrastructure for HarborList Marketplace.

## Scripts Overview

### 📊 **setup-monitoring.sh**
**Purpose**: Initial setup of CloudWatch monitoring, alarms, and dashboards
- **Usage**: `./setup-monitoring.sh [environment]`
- **Features**:
  - Creates CloudWatch dashboards
  - Sets up metric alarms
  - Configures log groups
  - Establishes notification channels
- **Dependencies**: AWS CLI, CloudWatch permissions

### 🧪 **test-monitoring.sh**
**Purpose**: Validates monitoring setup and alert functionality
- **Usage**: `./test-monitoring.sh`
- **Tests**:
  - Alarm trigger simulations
  - Metric collection verification
  - Dashboard accessibility
  - Notification delivery
- **Output**: Test results with pass/fail indicators

### 📈 **dev-environment-status-report.js**
**Purpose**: Generates comprehensive development environment health reports
- **Usage**: `node dev-environment-status-report.js`
- **Reports On**:
  - Service availability
  - Performance metrics
  - Error rates
  - Resource utilization
  - Dependencies status
- **Output**: JSON report with detailed metrics

### ⚡ **performance-testing.js**
**Purpose**: Automated performance testing and monitoring
- **Usage**: `node performance-testing.js [test-suite]`
- **Features**:
  - Load testing scenarios
  - Response time monitoring
  - Throughput analysis
  - Error rate tracking
  - Performance regression detection
- **Test Suites**: api, frontend, database, full

## Usage Examples

```bash
# Setup monitoring for development
./setup-monitoring.sh dev

# Test all monitoring components
./test-monitoring.sh

# Generate status report
node dev-environment-status-report.js

# Run API performance tests
node performance-testing.js api

# Run full performance test suite
node performance-testing.js full
```

## Monitoring Dashboards

The setup script creates the following dashboards:
- **API Performance**: Request rates, latencies, error rates
- **Database Metrics**: Query performance, connection counts
- **Infrastructure**: CPU, memory, storage utilization
- **Business Metrics**: User activity, listing statistics

## Alerts Configuration

Standard alerts include:
- High error rates (>5%)
- Slow response times (>2s)
- High CPU utilization (>80%)
- Database connection issues
- Storage capacity warnings

## Related Documentation

- [Performance Scripts](../performance/README.md)
- [Cost Management](../cost-management/README.md)
- [Infrastructure Documentation](../../infrastructure/README.md)