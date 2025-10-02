# Cloudflare Management Scripts

This section documents all scripts responsible for managing Cloudflare tunnel, CDN configuration, security settings, and performance optimization.

## 📋 Scripts Overview

| Script | Purpose | Type | Usage |
|---|---|---|---|
| `cloudflare-tunnel-validation.js` | Cloudflare tunnel architecture validation | Node.js | Tunnel security and performance testing |
| `tunnel-backup.sh` | Tunnel configuration backup and recovery | Shell | Configuration backup automation |
| `tunnel-rollback.sh` | Tunnel configuration rollback procedures | Shell | Emergency rollback capabilities |
| `tunnel-resilience-test.sh` | Tunnel resilience and failover testing | Shell | Disaster recovery testing |
| `update-cloudflare-config.js` | Cloudflare configuration updates | Node.js | DNS and routing configuration |
| `purge-cloudflare-cache.js` | Cache purging and invalidation | Node.js | Cache management automation |

---

## 🌐 cloudflare-tunnel-validation.js

**Comprehensive Cloudflare tunnel architecture validation and security testing**

### Purpose
Validates the Cloudflare tunnel architecture requirements, ensuring security compliance, performance standards, and proper configuration for the HarborList platform.

### Key Features
- **Security architecture validation**
- **End-to-end encryption verification**
- **Performance requirements testing**
- **SPA routing functionality validation**
- **DNS and SSL configuration verification**

### Security Architecture Requirements

#### 1. S3 Bucket Security
- **Private S3 Configuration**: Ensures S3 bucket is NOT publicly accessible
- **Access Control**: Validates proper IAM policies and bucket permissions
- **VPC Endpoint Access**: Verifies private connectivity through VPC endpoints
- **Encryption**: Confirms data encryption at rest and in transit

#### 2. Cloudflare Tunnel Security
- **Secure Tunnel Connection**: Validates encrypted tunnel establishment
- **SSL/TLS Configuration**: Verifies proper certificate management
- **Access Controls**: Validates authentication and authorization mechanisms
- **DDoS Protection**: Confirms Cloudflare security features activation

#### 3. End-to-End Encryption
- **Client to Cloudflare**: HTTPS with valid SSL certificates
- **Cloudflare to Origin**: Secure tunnel encryption
- **No Public Endpoints**: Confirms no direct internet access to origin

### Usage

```bash
# Standard tunnel validation
node cloudflare-tunnel-validation.js

# Comprehensive security and performance validation
node cloudflare-tunnel-validation.js --comprehensive

# Security-focused validation only
node cloudflare-tunnel-validation.js --security-only

# Performance benchmarking
node cloudflare-tunnel-validation.js --performance

# Generate detailed security report
node cloudflare-tunnel-validation.js --security-report
```

### Parameters

| Parameter | Description | Values | Default |
|---|---|---|---|
| `--comprehensive` | Run full validation suite | boolean | false |
| `--security-only` | Focus on security validation | boolean | false |
| `--performance` | Include performance benchmarks | boolean | false |
| `--security-report` | Generate detailed security analysis | boolean | false |
| `--timeout` | Request timeout in milliseconds | number | 10000 |

### Validation Categories

#### 1. Architecture Security Validation
```bash
🔒 Security Architecture Validation

✅ S3 Bucket Security
   ✓ S3 bucket NOT publicly accessible (security requirement)
   ✓ Bucket policy denies public read access
   ✓ VPC endpoint configuration validated
   ✓ IAM policies follow least privilege principle

✅ Cloudflare Tunnel Security
   ✓ Tunnel connection established and encrypted
   ✓ No direct internet access to origin servers
   ✓ SSL/TLS encryption end-to-end
   ✓ Origin server accessible only through tunnel
```

#### 2. Performance and Accessibility Testing
```bash
⚡ Performance and Accessibility Testing

✅ Frontend Accessibility
   ✓ Frontend accessible through Cloudflare: https://dev.harborlist.com
   ✓ Page load time: 1,247ms (within 3s target)
   ✓ SSL certificate valid and properly configured
   ✓ SPA routing works correctly for all routes

✅ API Accessibility
   ✓ API accessible through Cloudflare: https://api-dev.harborlist.com
   ✓ API response time: 189ms (within 500ms target)
   ✓ CORS configuration properly applied
   ✓ Authentication flow functional
```

#### 3. DNS and Routing Validation
```bash
🌍 DNS and Routing Validation

✅ DNS Configuration
   ✓ DNS resolution: harborlist.com (45ms)
   ✓ Subdomain resolution: api-dev.harborlist.com (38ms)
   ✓ DNS propagation complete globally
   ✓ DNSSEC validation successful

✅ Routing Configuration
   ✓ Cloudflare routing rules active
   ✓ Origin server mapping correct
   ✓ Load balancing configuration optimal
   ✓ Failover mechanisms operational
```

#### 4. Security Testing Results
```bash
🛡️ Security Testing Summary

✅ Encryption Validation (5/5 tests passed)
   ✓ End-to-end HTTPS encryption verified
   ✓ TLS 1.3 protocol in use
   ✓ Strong cipher suites configured
   ✓ Perfect Forward Secrecy enabled
   ✓ No mixed content issues detected

✅ Access Control Validation (4/4 tests passed)
   ✓ S3 bucket properly secured (no public access)
   ✓ Origin servers not directly accessible
   ✓ Cloudflare security features active
   ✓ DDoS protection mechanisms enabled

⚠️ Security Recommendations
   - Consider implementing additional rate limiting
   - Review and update security headers configuration
   - Schedule regular security assessments
```

### Test Configuration

```javascript
const CONFIG = {
  domains: {
    frontend: 'https://dev.harborlist.com',
    api: 'https://api-dev.harborlist.com'
  },
  s3DirectEndpoint: 'http://boat-listing-frontend-676032292155.s3-website.us-east-1.amazonaws.com',
  timeout: 10000,
  maxLoadTime: 3000,
  securityTests: {
    validateS3Security: true,
    testTunnelEncryption: true,
    verifyAccessControls: true,
    checkSSLConfiguration: true
  }
};
```

---

## 💾 tunnel-backup.sh

**Cloudflare tunnel configuration backup and recovery automation**

### Purpose
Creates automated backups of Cloudflare tunnel configuration files, stores them securely, and provides recovery procedures for disaster recovery scenarios.

### Key Features
- **Automated configuration backup**
- **S3 integration for secure storage**
- **Retention policy management**
- **Backup validation and integrity checking**
- **Recovery procedure automation**

### Backup Components
- **Configuration Files**: `/etc/cloudflared/config.yml`
- **Credentials**: Tunnel authentication credentials (encrypted)
- **Service Configuration**: systemd service files
- **SSL Certificates**: Custom certificates and keys
- **Routing Rules**: Cloudflare routing configurations

### Usage

```bash
# Create manual backup
./tunnel-backup.sh

# Create backup with custom retention
RETENTION_DAYS=60 ./tunnel-backup.sh

# Backup to specific S3 bucket
BACKUP_S3_BUCKET=my-backup-bucket ./tunnel-backup.sh

# Validate existing backups
./tunnel-backup.sh --validate

# List available backups
./tunnel-backup.sh --list
```

### Configuration Variables

```bash
# Backup configuration
BACKUP_DIR="/opt/cloudflare-backups"
RETENTION_DAYS=30
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_PREFIX="dev-environment/tunnel-configs"

# Backup components
CONFIG_FILES=(
  "/etc/cloudflared/config.yml"
  "/etc/cloudflared/*.json"
  "/etc/systemd/system/cloudflared.service"
)
```

### Backup Process Flow

```bash
🔄 Cloudflare Tunnel Backup Process

✅ Backup Initialization
   ✓ Backup directory created: /opt/cloudflare-backups
   ✓ Log file initialized: /var/log/tunnel-backup.log
   ✓ Retention policy: 30 days
   ✓ S3 bucket configured: harborlist-backups

✅ Configuration Backup
   ✓ Main config: /etc/cloudflared/config.yml
   ✓ Credentials: /etc/cloudflared/tunnel-credentials.json
   ✓ Service file: /etc/systemd/system/cloudflared.service
   ✓ Archive created: tunnel-config-backup-20240115_143000.tar.gz

✅ Backup Storage
   ✓ Local storage: /opt/cloudflare-backups/
   ✓ S3 upload: s3://harborlist-backups/dev-environment/tunnel-configs/
   ✓ Backup integrity validated
   ✓ Encryption applied during storage

✅ Cleanup and Maintenance
   ✓ Old backups removed (>30 days)
   ✓ Storage space optimized
   ✓ Backup catalog updated
   ✓ Monitoring alerts configured
```

### Backup Validation

```bash
📋 Backup Validation Results

✅ File Integrity Check
   ✓ Archive integrity: PASSED
   ✓ Configuration syntax: VALID
   ✓ Credentials format: VALID
   ✓ Service configuration: VALID

✅ Backup Completeness
   ✓ All required files included
   ✓ File permissions preserved
   ✓ Timestamps accurate
   ✓ Archive size: 2.4 KB (expected range)

✅ Storage Validation
   ✓ Local backup accessible
   ✓ S3 backup accessible
   ✓ Backup encryption verified
   ✓ Retention policy applied
```

### Recovery Procedures

```bash
# Restore from latest backup
./tunnel-backup.sh --restore latest

# Restore from specific backup
./tunnel-backup.sh --restore tunnel-config-backup-20240115_143000.tar.gz

# Restore from S3
./tunnel-backup.sh --restore-from-s3 backup-filename

# Test restore without applying changes
./tunnel-backup.sh --test-restore backup-filename
```

---

## ⚡ tunnel-rollback.sh

**Emergency tunnel configuration rollback and recovery procedures**

### Purpose
Provides emergency rollback capabilities for Cloudflare tunnel configurations, enabling rapid recovery from configuration errors or security incidents.

### Key Features
- **Rapid rollback procedures**
- **Configuration versioning**
- **Emergency recovery automation**
- **Rollback validation and testing**
- **Incident response integration**

### Usage

```bash
# Emergency rollback to last known good configuration
./tunnel-rollback.sh --emergency

# Rollback to specific backup
./tunnel-rollback.sh --restore tunnel-config-backup-20240115_143000.tar.gz

# Test rollback without applying changes
./tunnel-rollback.sh --test-rollback

# List available rollback points
./tunnel-rollback.sh --list-backups
```

### Emergency Rollback Process

```bash
🚨 Emergency Tunnel Rollback Initiated

✅ Pre-Rollback Validation
   ✓ Current configuration backed up
   ✓ Service status captured
   ✓ Network connectivity tested
   ✓ Rollback target validated

✅ Rollback Execution
   ✓ Service stopped gracefully
   ✓ Configuration files restored
   ✓ Permissions and ownership applied
   ✓ Service restarted successfully

✅ Post-Rollback Validation
   ✓ Service operational
   ✓ Tunnel connectivity restored
   ✓ Frontend accessible
   ✓ API endpoints functional

🎉 Emergency rollback completed successfully
   Rollback time: 45 seconds
   Service downtime: 23 seconds
   All services restored to normal operation
```

---

## 🔄 tunnel-resilience-test.sh

**Tunnel resilience and disaster recovery testing**

### Purpose
Tests tunnel resilience mechanisms, failover procedures, and disaster recovery capabilities to ensure high availability and rapid recovery from failures.

### Key Features
- **Failover testing automation**
- **Disaster recovery simulation**
- **Performance impact analysis**
- **Recovery time measurement**
- **Resilience reporting**

### Usage

```bash
# Run standard resilience tests
./tunnel-resilience-test.sh

# Run comprehensive disaster recovery test
./tunnel-resilience-test.sh --disaster-recovery

# Test specific failure scenarios
./tunnel-resilience-test.sh --scenario network-failure
./tunnel-resilience-test.sh --scenario service-restart

# Generate resilience report
./tunnel-resilience-test.sh --report
```

---

## ⚙️ update-cloudflare-config.js

**Cloudflare DNS and routing configuration management**

### Purpose
Updates Cloudflare DNS records, origin rules, and routing configurations to maintain proper connectivity and optimize performance.

### Key Features
- **DNS record management**
- **Origin rule updates**
- **Host header configuration**
- **Load balancing optimization**
- **Configuration validation**

### Usage

```bash
# Update API Gateway origin mapping
node update-cloudflare-config.js --update-origin

# Update DNS records
node update-cloudflare-config.js --update-dns

# Update routing rules
node update-cloudflare-config.js --update-routing

# Validate current configuration
node update-cloudflare-config.js --validate
```

### Configuration Updates

```bash
🔄 Cloudflare Configuration Update

✅ Authentication
   ✓ Cloudflare API token validated
   ✓ Zone access permissions confirmed
   ✓ Rate limits checked

✅ DNS Updates
   ✓ A record updated: api-dev.harborlist.com
   ✓ CNAME record updated: dev.harborlist.com
   ✓ DNS propagation initiated

✅ Origin Rules
   ✓ Origin server updated: cgrvwa10s3.execute-api.us-east-1.amazonaws.com
   ✓ Host header override configured
   ✓ SSL verification settings updated

✅ Validation
   ✓ DNS resolution testing passed
   ✓ Origin connectivity verified
   ✓ SSL certificate validation passed
   ✓ Performance impact minimal
```

---

## 🗑️ purge-cloudflare-cache.js

**Cloudflare cache purging and invalidation automation**

### Purpose
Manages Cloudflare cache purging operations, enabling efficient cache invalidation for content updates and emergency cache clearing.

### Key Features
- **Selective cache purging**
- **Bulk cache invalidation**
- **Cache warming after purge**
- **Performance impact monitoring**
- **Automated purge scheduling**

### Usage

```bash
# Purge all cache
node purge-cloudflare-cache.js --purge-all

# Purge specific URLs
node purge-cloudflare-cache.js --urls "https://dev.harborlist.com/,https://api-dev.harborlist.com/"

# Purge by file extension
node purge-cloudflare-cache.js --extensions "css,js,png"

# Purge and warm cache
node purge-cloudflare-cache.js --purge-and-warm
```

### Cache Management Results

```bash
🗑️ Cloudflare Cache Purge Operation

✅ Cache Purge Execution
   ✓ Authentication successful
   ✓ Zone identified: harborlist.com
   ✓ Purge operation initiated
   ✓ Purge completion confirmed

📊 Purge Statistics
   Files Purged: 1,247
   Cache Size Before: 45.2 MB
   Cache Size After: 0 MB
   Purge Duration: 8.3 seconds

🔄 Cache Warming (Optional)
   ✓ Critical paths pre-loaded
   ✓ Homepage cached: 1.2s
   ✓ API endpoints cached: 0.8s
   ✓ Static assets cached: 0.5s

📈 Performance Impact
   Cache Hit Rate Before: 95%
   Cache Hit Rate After Warm: 87%
   Expected Recovery: 2-4 hours
   Performance Impact: Minimal
```

---

## 📝 Best Practices

### Cloudflare Management Strategy
1. **Automate configuration backups** before any changes
2. **Test configuration changes** in development first
3. **Monitor performance impact** of configuration updates
4. **Implement rollback procedures** for quick recovery
5. **Document configuration changes** with clear reasoning

### Security Considerations
- **Regular security audits** of tunnel configurations
- **Monitor access logs** for unusual patterns
- **Implement least privilege** access controls
- **Regular credential rotation** for API tokens
- **Emergency response procedures** for security incidents

### Performance Optimization
- **Monitor cache hit rates** and optimize cache policies
- **Regular performance testing** after configuration changes
- **Optimize origin rules** for best performance
- **Use appropriate TTL settings** for different content types
- **Implement cache warming** strategies for critical content

---

## 🔧 Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|---|---|---|
| Tunnel connection failed | Invalid credentials or network issues | Check tunnel credentials and network connectivity |
| Cache not purging | API rate limits or authentication issues | Verify API tokens and respect rate limits |
| DNS not resolving | Propagation delays or misconfiguration | Wait for propagation or check DNS settings |
| SSL certificate errors | Certificate mismatch or expiration | Update SSL certificates and verify domain ownership |

### Debug Commands
```bash
# Test tunnel connectivity
cloudflared tunnel info tunnel-name

# Check DNS resolution
dig dev.harborlist.com @1.1.1.1

# Test SSL certificate
openssl s_client -connect dev.harborlist.com:443

# Check Cloudflare API connectivity
curl -H "Authorization: Bearer $CF_API_TOKEN" https://api.cloudflare.com/client/v4/zones
```

---

**Next**: [Utility Scripts →](./utility-scripts.md)