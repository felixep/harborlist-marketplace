# Cloudflare Scripts

This directory contains scripts for managing Cloudflare tunnel configuration, validation, and maintenance for HarborList Marketplace.

## Scripts Overview

### 🔍 **cloudflare-tunnel-validation.js**
**Purpose**: Comprehensive Cloudflare tunnel validation and health checks
- **Usage**: `node cloudflare-tunnel-validation.js [tunnel-name]`
- **Validations**:
  - Tunnel connectivity status
  - DNS configuration verification
  - SSL certificate validation
  - Origin server health
  - Performance metrics
  - Security policy compliance
- **Output**: Detailed validation report with recommendations

### 🗑️ **purge-cloudflare-cache.js**
**Purpose**: Automated Cloudflare cache management and purging
- **Usage**: `node purge-cloudflare-cache.js [options]`
- **Options**:
  - `--all`: Purge entire cache
  - `--url`: Purge specific URLs
  - `--tag`: Purge by cache tags
  - `--zone`: Specify zone ID
- **Features**:
  - Selective cache purging
  - Batch operations
  - Verification checks
  - Performance impact monitoring

### 💾 **tunnel-backup.sh**
**Purpose**: Backup Cloudflare tunnel configurations and settings
- **Usage**: `./tunnel-backup.sh [backup-location]`
- **Backup Items**:
  - Tunnel configurations
  - DNS records
  - Security policies
  - SSL certificates
  - Access rules
- **Features**:
  - Automated scheduling
  - Encrypted backups
  - Version control
  - Restoration procedures

### 🔧 **tunnel-resilience-test.sh**
**Purpose**: Comprehensive tunnel resilience and failover testing
- **Usage**: `./tunnel-resilience-test.sh [test-scenario]`
- **Test Scenarios**:
  - Origin server failure simulation
  - Network connectivity issues
  - High load stress testing
  - DNS failover validation
  - Geographic routing tests
- **Metrics**: Availability, recovery time, data integrity

### 🔄 **tunnel-rollback.sh**
**Purpose**: Automated tunnel configuration rollback capabilities
- **Usage**: `./tunnel-rollback.sh [backup-version] [options]`
- **Features**:
  - Configuration version management
  - Automated rollback procedures
  - Health check validation
  - Rollback verification
  - Emergency procedures
- **Safety**: Pre-rollback validation and confirmation

### ⚙️ **update-cloudflare-config.js**
**Purpose**: Dynamic Cloudflare configuration updates and management
- **Usage**: `node update-cloudflare-config.js [config-file]`
- **Configuration Updates**:
  - DNS record modifications
  - Security policy updates
  - Performance optimizations
  - Cache rule adjustments
  - SSL/TLS settings
- **Features**: Staged updates, validation, rollback capability

## Configuration Management

### 🌐 **Tunnel Configuration**
```yaml
# Example tunnel configuration
tunnel: harborlist-production
ingress:
  - hostname: api.harborlist.com
    service: http://localhost:3001
  - hostname: app.harborlist.com
    service: http://localhost:3000
  - service: http_status:404
```

### 🔒 **Security Policies**
- **WAF Rules**: Bot protection, rate limiting
- **Access Control**: IP restrictions, geographic blocks
- **SSL/TLS**: Full encryption, HSTS enforcement
- **DDoS Protection**: Automatic mitigation enabled

## Usage Examples

```bash
# Validate production tunnel
node cloudflare-tunnel-validation.js harborlist-prod

# Purge entire cache
node purge-cloudflare-cache.js --all

# Purge specific URLs
node purge-cloudflare-cache.js --url "https://harborlist.com/api/*"

# Create tunnel backup
./tunnel-backup.sh /backups/cloudflare/$(date +%Y%m%d)

# Test tunnel resilience
./tunnel-resilience-test.sh origin-failure

# Rollback to previous configuration
./tunnel-rollback.sh backup-20241001 --confirm

# Update configuration from file
node update-cloudflare-config.js configs/production.json
```

## Monitoring & Alerts

### 📊 **Tunnel Metrics**
- **Availability**: 99.9% uptime target
- **Latency**: < 150ms global average
- **Throughput**: Bandwidth utilization
- **Error Rates**: 4xx/5xx response tracking
- **Security Events**: Attack attempts, blocks

### 🚨 **Alert Thresholds**
- **Downtime**: > 1 minute
- **High Latency**: > 500ms
- **Error Rate**: > 2%
- **Security Alerts**: Unusual traffic patterns
- **Certificate Expiry**: 30-day warning

## Backup & Recovery

### 💾 **Backup Schedule**
- **Daily**: Configuration snapshots
- **Weekly**: Complete tunnel backup
- **Monthly**: Archive historical configs
- **Pre-deployment**: Automatic backups

### 🔄 **Recovery Procedures**
1. **Configuration Rollback**: Automated via script
2. **Tunnel Rebuild**: From backup configurations
3. **Emergency Bypass**: Direct origin access
4. **Disaster Recovery**: Multi-region failover

## Performance Optimization

### ⚡ **Optimization Features**
- **Smart Routing**: Optimal path selection
- **Caching**: Aggressive edge caching
- **Compression**: Automatic content compression
- **Minification**: CSS/JS optimization
- **Image Optimization**: WebP conversion, resizing

### 📈 **Performance Targets**
- **Global Latency**: < 200ms (95th percentile)
- **Cache Hit Rate**: > 90%
- **Compression Ratio**: > 70%
- **Bandwidth Savings**: > 50%

## Security Features

### 🛡️ **Protection Layers**
- **DDoS Mitigation**: Automatic detection and blocking
- **Bot Management**: Advanced bot detection
- **Rate Limiting**: Configurable request limits
- **Geo-blocking**: Country-level restrictions
- **IP Reputation**: Malicious IP filtering

## Related Documentation

- [Performance Scripts](../performance/README.md)
- [Monitoring Scripts](../monitoring/README.md)
- [Security Documentation](../../docs/security-policies.md)
- [Cloudflare Configuration Guide](../../docs/cloudflare-setup.md)