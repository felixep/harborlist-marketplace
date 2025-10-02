# Utility Scripts

This directory contains general-purpose utility scripts for HarborList Marketplace operations, validation, and maintenance.

## Scripts Overview

### 🧪 **caching-test.js**
**Purpose**: Comprehensive caching system testing and validation
- **Usage**: `node caching-test.js [cache-type] [test-mode]`
- **Cache Types**:
  - `redis`: Redis cache performance
  - `cloudflare`: CDN cache validation
  - `browser`: Client-side caching
  - `api`: API response caching
- **Test Modes**: `performance`, `correctness`, `expiration`, `full`
- **Features**:
  - Cache hit/miss ratio analysis
  - Performance benchmarking
  - Cache invalidation testing
  - Memory usage monitoring

### 📊 **update-cost-tracking.js**
**Purpose**: Automated cost tracking data updates and synchronization
- **Usage**: `node update-cost-tracking.js [period] [services]`
- **Periods**: `daily`, `weekly`, `monthly`, `custom`
- **Services**: Individual AWS services or `all`
- **Features**:
  - Cost data aggregation
  - Trend analysis updates
  - Budget variance calculations
  - Automated reporting
- **Integration**: Connects with cost management dashboard

### 🔍 **validate-admin-infrastructure.js**
**Purpose**: Comprehensive admin infrastructure validation and health checks
- **Usage**: `node validate-admin-infrastructure.js [environment]`
- **Validation Areas**:
  - Admin API endpoints
  - Database connections
  - Authentication systems
  - Authorization policies
  - Audit logging
  - Security configurations
- **Output**: Detailed validation report with remediation steps

### ✅ **validate-and-test-admin.sh**
**Purpose**: Complete admin system validation and testing suite
- **Usage**: `./validate-and-test-admin.sh [test-suite] [environment]`
- **Test Suites**:
  - `auth`: Authentication and authorization
  - `crud`: CRUD operations testing
  - `security`: Security policy validation
  - `performance`: Admin panel performance
  - `integration`: End-to-end testing
- **Features**:
  - Automated test execution
  - User simulation
  - Security penetration testing
  - Performance benchmarking

### 🔧 **verify-api-configuration.js**
**Purpose**: API configuration validation and compliance checking
- **Usage**: `node verify-api-configuration.js [api-name] [environment]`
- **Verification Areas**:
  - API Gateway configuration
  - Lambda function settings
  - CORS policies
  - Rate limiting
  - Authentication methods
  - Response formats
  - Error handling
- **Standards**: OpenAPI specification compliance

## Usage Examples

```bash
# Test Redis cache performance
node caching-test.js redis performance

# Full cache system validation
node caching-test.js all full

# Update monthly cost tracking for all services
node update-cost-tracking.js monthly all

# Update daily costs for specific services
node update-cost-tracking.js daily "lambda,dynamodb,s3"

# Validate admin infrastructure in production
node validate-admin-infrastructure.js production

# Run complete admin test suite
./validate-and-test-admin.sh integration staging

# Verify specific API configuration
node verify-api-configuration.js listing-api production

# Verify all API configurations
node verify-api-configuration.js all dev
```

## Utility Categories

### 📊 **Data & Analytics**
- **Cost Tracking**: Automated cost data updates
- **Cache Analysis**: Performance and efficiency metrics
- **Configuration Validation**: System configuration checks
- **Health Monitoring**: System health assessments

### 🔒 **Security & Compliance**
- **Admin Validation**: Admin system security checks
- **API Verification**: API security and compliance
- **Infrastructure Auditing**: Security policy validation
- **Access Control**: Permission and role verification

### ⚡ **Performance & Optimization**
- **Cache Testing**: Cache system optimization
- **API Performance**: Endpoint response validation
- **Resource Monitoring**: System resource tracking
- **Bottleneck Identification**: Performance issue detection

## Configuration Files

### 📁 **Cache Test Configuration** (`cache-test-config.json`)
```json
{
  "redis": {
    "host": "redis.harborlist.com",
    "port": 6379,
    "testKeys": 1000,
    "iterations": 100
  },
  "cloudflare": {
    "zones": ["harborlist.com"],
    "testUrls": ["api", "assets", "images"],
    "regions": ["NA", "EU", "APAC"]
  }
}
```

### 💰 **Cost Tracking Configuration** (`cost-config.json`)
```json
{
  "services": {
    "lambda": { "budget": 50, "alerts": [25, 40] },
    "dynamodb": { "budget": 30, "alerts": [15, 25] },
    "s3": { "budget": 10, "alerts": [5, 8] }
  },
  "reporting": {
    "frequency": "daily",
    "recipients": ["admin@harborlist.com"]
  }
}
```

## Automated Scheduling

### ⏰ **Cron Jobs** (Recommended Schedule)
```bash
# Daily cost tracking update (6 AM)
0 6 * * * cd /tools/utilities && node update-cost-tracking.js daily all

# Weekly cache performance test (Sunday 2 AM)
0 2 * * 0 cd /tools/utilities && node caching-test.js all performance

# Monthly admin infrastructure validation (1st day, 3 AM)
0 3 1 * * cd /tools/utilities && node validate-admin-infrastructure.js production

# Daily API configuration verification (8 AM)
0 8 * * * cd /tools/utilities && node verify-api-configuration.js all production
```

## Integration Points

### 🔄 **CI/CD Integration**
- **Pre-deployment**: API configuration validation
- **Post-deployment**: Infrastructure validation
- **Scheduled**: Regular health checks and updates
- **Triggered**: On configuration changes

### 📊 **Monitoring Integration**
- **CloudWatch**: Metrics and alarms
- **Dashboards**: Utility script results
- **Alerts**: Failure notifications
- **Reporting**: Automated status reports

## Troubleshooting

### 🐛 **Common Issues**
1. **Cache Connection Failures**: Check Redis/Cloudflare connectivity
2. **Cost Data Inconsistencies**: Verify AWS billing API access
3. **Admin Validation Failures**: Review authentication credentials
4. **API Configuration Errors**: Check AWS API Gateway settings

### 🔧 **Debug Mode**
```bash
# Enable debug logging for all utilities
export DEBUG=harborlist:utilities:*

# Verbose output for cache testing
node caching-test.js redis performance --verbose

# Detailed validation reporting
node validate-admin-infrastructure.js dev --detailed
```

## Related Documentation

- [Cost Management Scripts](../cost-management/README.md)
- [Monitoring Scripts](../monitoring/README.md)
- [Performance Scripts](../performance/README.md)
- [API Documentation](../../docs/api-reference.md)
- [System Architecture](../../docs/architecture.md)