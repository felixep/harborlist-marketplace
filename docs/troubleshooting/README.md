# 🔧 HarborList Troubleshooting Guide

## 📋 **Overview**

This comprehensive troubleshooting guide provides systematic solutions for common issues encountered during development and deployment of the HarborList marketplace platform. Updated with recent architectural improvements including NPM workspaces, SSL-enabled local development, and DynamoDB Local configurations.

## 🏠 **Local Development Troubleshooting** 

### **Frontend Issues**

#### 🚫 **Blank Page on Load**
**Symptoms**: Frontend loads but displays blank page
**Root Cause**: Shared types import errors across workspace boundaries
**Solution**:
```bash
# Rebuild shared types package
cd packages/shared-types && npm run build

# Clean install frontend dependencies
cd ../../frontend && rm -rf node_modules && npm install && npm run dev
```

#### 🔒 **SSL Certificate Errors in Chrome**
**Symptoms**: `ERR_SSL_KEY_USAGE_INCOMPATIBLE` 
**Root Cause**: Missing Chrome-compatible SSL certificate extensions
**Solution**:
```bash
# Regenerate SSL certificates
docker-compose -f docker-compose.local.yml down
docker volume rm harborlist-marketplace_traefik_certs
docker-compose -f docker-compose.local.yml --profile enhanced up -d
```

#### 🌐 **DNS Resolution Issues**
**Symptoms**: `local.harborlist.com` not resolving
**Root Cause**: Corrupted `/etc/hosts` file
**Solution**:
```bash
# Fix hosts file
sudo sed -i '' '/harborlist/d' /etc/hosts
echo "127.0.0.1 local.harborlist.com" | sudo tee -a /etc/hosts
echo "127.0.0.1 local-api.harborlist.com" | sudo tee -a /etc/hosts
```

### **Backend Issues**

#### 🗄️ **Database Connection Errors**
**Symptoms**: `ValidationException: Value null at 'tableName'`
**Root Cause**: Environment variables not loaded in container
**Solution**:
```bash
# Completely recreate backend container
docker-compose -f docker-compose.local.yml stop backend
docker-compose -f docker-compose.local.yml rm -f backend  
docker-compose -f docker-compose.local.yml --profile enhanced up -d backend
```

#### 🔐 **Authentication 401 Errors**
**Symptoms**: Login returns 401 even with correct credentials
**Root Cause**: User status is `pending_verification` instead of `active`
**Solution**:
```bash
# Activate user via DynamoDB update
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test aws dynamodb update-item \
  --table-name boat-users --key '{"id":{"S":"USER_ID"}}' \
  --update-expression "SET #status = :status, #emailVerified = :emailVerified" \
  --expression-attribute-names '{"#status":"status","#emailVerified":"emailVerified"}' \
  --expression-attribute-values '{":status":{"S":"active"},":emailVerified":{"BOOL":true}}' \
  --endpoint-url http://localhost:8000 --region us-east-1
```

#### 🐘 **DynamoDB SQLite Errors** 
**Symptoms**: `SQLiteException: unable to open database file`
**Root Cause**: DynamoDB Local persistence issues in Docker
**Solution**: Already configured for in-memory mode to prevent this issue
```yaml
# docker-compose.local.yml configuration:
command: ["-jar", "DynamoDBLocal.jar", "-inMemory", "-sharedDb"]
```

---

## 🚨 **Quick Reference - Emergency Procedures**

### **Service Outage Response**

```bash
# Emergency Service Recovery Checklist
# 1. Immediate Assessment (< 2 minutes)
curl -I https://api.harborlist.com/health
aws cloudwatch get-metric-statistics --namespace "AWS/ApiGateway" --metric-name "5XXError" --start-time $(date -u -d '15 minutes ago' +%Y-%m-%dT%H:%M:%S) --end-time $(date -u +%Y-%m-%dT%H:%M:%S) --period 300 --statistics Sum

# 2. Quick Recovery Actions
# Restart Lambda functions (cold start)
aws lambda invoke --function-name harborlist-production-api-handler --payload '{}' /tmp/test.json

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E1234567890123 --paths "/*"

# Check database connectivity
aws dynamodb describe-table --table-name harborlist-production

# 3. Rollback Procedures (if needed)
cd infrastructure
npx cdk deploy HarborListStack-production-blue --require-approval never

# 4. Communication
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚨 Service outage detected. Investigating..."}' \
  $SLACK_WEBHOOK_URL
```

### **Performance Degradation Response**

```typescript
// Performance Monitoring Quick Checks
export class EmergencyDiagnostics {
  static async quickHealthCheck(): Promise<HealthReport> {
    const checks = await Promise.allSettled([
      this.checkAPIResponse(),
      this.checkDatabaseLatency(),
      this.checkCacheHitRate(),
      this.checkMemoryUsage(),
      this.checkErrorRates(),
    ]);

    return {
      api: checks[0].status === 'fulfilled' ? checks[0].value : { status: 'error', message: checks[0].reason },
      database: checks[1].status === 'fulfilled' ? checks[1].value : { status: 'error', message: checks[1].reason },
      cache: checks[2].status === 'fulfilled' ? checks[2].value : { status: 'error', message: checks[2].reason },
      memory: checks[3].status === 'fulfilled' ? checks[3].value : { status: 'error', message: checks[3].reason },
      errors: checks[4].status === 'fulfilled' ? checks[4].value : { status: 'error', message: checks[4].reason },
    };
  }

  private static async checkAPIResponse(): Promise<DiagnosticResult> {
    const startTime = performance.now();
    
    try {
      const response = await fetch('https://api.harborlist.com/health');
      const duration = performance.now() - startTime;
      
      return {
        status: response.ok ? 'healthy' : 'degraded',
        responseTime: duration,
        details: { httpStatus: response.status },
      };
    } catch (error) {
      return {
        status: 'error',
        responseTime: performance.now() - startTime,
        details: { error: error.message },
      };
    }
  }

  private static async checkDatabaseLatency(): Promise<DiagnosticResult> {
    // Check DynamoDB response times
    const startTime = performance.now();
    
    try {
      await dynamoClient.send(new DescribeTableCommand({
        TableName: 'harborlist-production',
      }));
      
      const duration = performance.now() - startTime;
      
      return {
        status: duration < 100 ? 'healthy' : duration < 500 ? 'degraded' : 'critical',
        responseTime: duration,
        details: { operation: 'describe-table' },
      };
    } catch (error) {
      return {
        status: 'error',
        responseTime: performance.now() - startTime,
        details: { error: error.message },
      };
    }
  }
}

// Run emergency diagnostics
const healthReport = await EmergencyDiagnostics.quickHealthCheck();
console.log('Emergency Health Report:', JSON.stringify(healthReport, null, 2));
```

---

## 🔍 **Common Issues & Solutions**

### **Authentication & Authorization Issues**

#### **Problem**: JWT Token Validation Failures

**Symptoms:**
- Users receiving 401 Unauthorized errors
- "Invalid token" error messages
- Token appears valid but authentication fails

**Diagnosis:**
```bash
# Check JWT token details
echo "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." | base64 -d | jq '.'

# Verify token signature
node -e "
const jwt = require('jsonwebtoken');
const token = 'YOUR_TOKEN_HERE';
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('Token valid:', decoded);
} catch (err) {
  console.log('Token invalid:', err.message);
}
"

# Check user permissions
aws dynamodb get-item --table-name harborlist-production \
  --key '{"PK": {"S": "USER#user-id"}, "SK": {"S": "PROFILE"}}'
```

**Solutions:**
1. **Token Expiry**: Issue new token with extended expiration
2. **Secret Mismatch**: Verify JWT_SECRET consistency across environments
3. **Clock Skew**: Synchronize server time with NTP
4. **Corrupted Token**: Clear client storage and re-authenticate

**Prevention:**
```typescript
// Enhanced JWT validation middleware
export const validateJWTMiddleware = async (event: APIGatewayProxyEvent) => {
  const token = extractTokenFromEvent(event);
  
  if (!token) {
    return createErrorResponse(401, 'No token provided');
  }

  try {
    // Verify token with clock tolerance
    const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
      clockTolerance: 30, // 30 seconds tolerance
    });

    // Additional validation
    const user = await getUserFromDatabase(decoded.sub);
    if (!user || user.status !== 'active') {
      return createErrorResponse(401, 'User account inactive');
    }

    // Check token blacklist (for logout functionality)
    const isBlacklisted = await checkTokenBlacklist(token);
    if (isBlacklisted) {
      return createErrorResponse(401, 'Token has been revoked');
    }

    return { user, decoded };
  } catch (error) {
    logger.warn('JWT validation failed', { error: error.message, token: token.substring(0, 20) + '...' });
    return createErrorResponse(401, 'Invalid token');
  }
};
```

#### **Problem**: Permission Denied Errors

**Symptoms:**
- Users can authenticate but cannot access certain resources
- "Insufficient permissions" error messages
- Operations failing for valid users

**Diagnosis:**
```bash
# Check user roles and permissions
aws dynamodb query --table-name harborlist-production \
  --key-condition-expression "PK = :pk AND begins_with(SK, :sk)" \
  --expression-attribute-values '{
    ":pk": {"S": "USER#user-id"},
    ":sk": {"S": "ROLE#"}
  }'

# Verify resource ownership
aws dynamodb get-item --table-name harborlist-production \
  --key '{"PK": {"S": "LISTING#listing-id"}, "SK": {"S": "METADATA"}}'
```

**Solutions:**
1. **Role Assignment**: Assign appropriate roles to user
2. **Resource Ownership**: Verify user owns the resource they're trying to access
3. **Permission Updates**: Refresh user permissions cache

**Code Fix:**
```typescript
// Enhanced permission checking
export class PermissionService {
  static async checkPermission(
    userId: string, 
    resource: string, 
    action: string, 
    resourceId?: string
  ): Promise<boolean> {
    // Check user roles
    const userRoles = await this.getUserRoles(userId);
    
    // Check role-based permissions
    const hasRolePermission = await this.checkRolePermissions(userRoles, resource, action);
    if (hasRolePermission) return true;
    
    // Check resource ownership
    if (resourceId) {
      const isOwner = await this.checkResourceOwnership(userId, resource, resourceId);
      if (isOwner) return true;
    }
    
    // Log permission denial for audit
    logger.info('Permission denied', {
      userId,
      resource,
      action,
      resourceId,
      userRoles,
    });
    
    return false;
  }

  private static async checkResourceOwnership(
    userId: string, 
    resource: string, 
    resourceId: string
  ): Promise<boolean> {
    try {
      const item = await dynamoClient.send(new GetItemCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Key: marshall({
          PK: `${resource.toUpperCase()}#${resourceId}`,
          SK: 'METADATA',
        }),
      }));

      if (!item.Item) return false;
      
      const resourceData = unmarshall(item.Item);
      return resourceData.userId === userId;
    } catch (error) {
      logger.error('Error checking resource ownership', { error, userId, resource, resourceId });
      return false;
    }
  }
}
```

---

### **Database Performance Issues**

#### **Problem**: DynamoDB Throttling

**Symptoms:**
- "ProvisionedThroughputExceededException" errors
- Slow response times during peak usage
- Failed write operations

**Diagnosis:**
```bash
# Check consumed capacity
aws cloudwatch get-metric-statistics \
  --namespace "AWS/DynamoDB" \
  --metric-name "ConsumedReadCapacityUnits" \
  --dimensions Name=TableName,Value=harborlist-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# Check for hot partitions
aws dynamodb describe-table --table-name harborlist-production | jq '.Table.GlobalSecondaryIndexes[].ProvisionedThroughput'

# Analyze access patterns
aws logs filter-log-events \
  --log-group-name /aws/lambda/harborlist-production-api-handler \
  --filter-pattern "ERROR ProvisionedThroughputExceededException" \
  --start-time $(date -d '1 hour ago' +%s)000
```

**Solutions:**
1. **Increase Capacity**: Scale up read/write capacity units
2. **Optimize Queries**: Reduce scan operations, use query instead
3. **Implement Caching**: Add ElastiCache or in-memory caching
4. **Request Retry Logic**: Implement exponential backoff

**Code Fix:**
```typescript
// Enhanced DynamoDB client with retry logic
export class ResilientDynamoClient {
  private client: DynamoDBClient;
  private maxRetries = 5;
  private baseDelay = 100; // Base delay in milliseconds

  constructor() {
    this.client = new DynamoDBClient({
      region: process.env.AWS_REGION,
      maxAttempts: this.maxRetries,
      retryMode: 'adaptive',
    });
  }

  async queryWithRetry(params: QueryCommandInput): Promise<QueryCommandOutput> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const startTime = performance.now();
        const result = await this.client.send(new QueryCommand(params));
        const duration = performance.now() - startTime;
        
        // Log performance metrics
        await metricsService.putMetric('DynamoDBQueryDuration', duration, 'Milliseconds');
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (error.name === 'ProvisionedThroughputExceededException' && attempt < this.maxRetries - 1) {
          const delay = this.calculateBackoffDelay(attempt);
          logger.warn(`DynamoDB throttling, retrying in ${delay}ms`, {
            attempt: attempt + 1,
            tableName: params.TableName,
          });
          
          await this.sleep(delay);
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError!;
  }

  private calculateBackoffDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * exponentialDelay * 0.1;
    return Math.min(exponentialDelay + jitter, 5000); // Max 5 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Cache implementation for frequently accessed data
export class DynamoDBCache {
  private cache = new Map<string, CacheEntry>();
  private ttl = 5 * 60 * 1000; // 5 minutes TTL

  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.data as T;
    }
    
    try {
      const data = await fetcher();
      this.cache.set(key, {
        data,
        expiry: Date.now() + this.ttl,
      });
      
      return data;
    } catch (error) {
      // Return stale cache on error if available
      if (cached) {
        logger.warn('Returning stale cache due to fetch error', { key, error });
        return cached.data as T;
      }
      
      throw error;
    }
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
```

---

### **API Performance Issues**

#### **Problem**: High API Latency

**Symptoms:**
- Response times > 2 seconds
- Timeout errors from frontend
- Poor user experience

**Diagnosis:**
```bash
# Check API Gateway metrics
aws cloudwatch get-metric-statistics \
  --namespace "AWS/ApiGateway" \
  --metric-name "Latency" \
  --dimensions Name=ApiName,Value=harborlist-api-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# Check Lambda function performance
aws cloudwatch get-metric-statistics \
  --namespace "AWS/Lambda" \
  --metric-name "Duration" \
  --dimensions Name=FunctionName,Value=harborlist-production-api-handler \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# Analyze X-Ray traces
aws xray get-trace-summaries \
  --time-range-type TimeRangeByStartTime \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --filter-expression "ResponseTime > 2"
```

**Solutions:**
1. **Database Optimization**: Optimize queries and indexes
2. **Caching**: Implement response caching
3. **Connection Pooling**: Reuse database connections
4. **Memory Allocation**: Increase Lambda memory size

**Performance Optimization:**
```typescript
// Performance monitoring and optimization
export class APIPerformanceOptimizer {
  private performanceCache = new Map<string, PerformanceData>();

  async optimizeHandler(handler: Function): Promise<Function> {
    return async (event: APIGatewayProxyEvent, context: Context) => {
      const startTime = performance.now();
      const endpoint = `${event.httpMethod} ${event.path}`;
      
      try {
        // Check cache first
        const cacheKey = this.generateCacheKey(event);
        const cached = await this.getFromCache(cacheKey);
        
        if (cached) {
          await this.recordMetrics(endpoint, performance.now() - startTime, 'cache-hit');
          return cached;
        }
        
        // Execute handler
        const result = await handler(event, context);
        
        // Cache successful responses
        if (result.statusCode === 200) {
          await this.setCache(cacheKey, result);
        }
        
        await this.recordMetrics(endpoint, performance.now() - startTime, 'cache-miss');
        return result;
        
      } catch (error) {
        await this.recordMetrics(endpoint, performance.now() - startTime, 'error');
        throw error;
      }
    };
  }

  private generateCacheKey(event: APIGatewayProxyEvent): string {
    const { httpMethod, path, queryStringParameters, headers } = event;
    const userId = headers.authorization ? this.extractUserId(headers.authorization) : 'anonymous';
    
    // Include relevant parameters in cache key
    const keyComponents = [
      httpMethod,
      path,
      JSON.stringify(queryStringParameters || {}),
      userId,
    ];
    
    return crypto.createHash('md5').update(keyComponents.join('|')).digest('hex');
  }

  private async recordMetrics(endpoint: string, duration: number, cacheStatus: string): Promise<void> {
    await Promise.all([
      metricsService.putMetric('APIResponseTime', duration, 'Milliseconds', [
        { Name: 'Endpoint', Value: endpoint },
        { Name: 'CacheStatus', Value: cacheStatus },
      ]),
      
      metricsService.putMetric('APIRequestCount', 1, 'Count', [
        { Name: 'Endpoint', Value: endpoint },
        { Name: 'CacheStatus', Value: cacheStatus },
      ]),
    ]);
  }
}

// Connection pooling for external services
export class ConnectionPool {
  private static pools = new Map<string, any>();

  static getPool(service: string, config: any): any {
    if (!this.pools.has(service)) {
      switch (service) {
        case 'database':
          this.pools.set(service, new DatabasePool(config));
          break;
        case 'redis':
          this.pools.set(service, new RedisPool(config));
          break;
        default:
          throw new Error(`Unknown service: ${service}`);
      }
    }
    
    return this.pools.get(service);
  }
}
```

---

### **Frontend Issues**

#### **Problem**: Slow Page Load Times

**Symptoms:**
- Initial page load > 3 seconds
- Large bundle sizes
- Poor Core Web Vitals scores

**Diagnosis:**
```bash
# Check bundle sizes
npm run build:analyze

# Lighthouse audit
npx lighthouse https://harborlist.com --output=json --output-path=./lighthouse-report.json

# Check CloudFront cache hit rates
aws cloudwatch get-metric-statistics \
  --namespace "AWS/CloudFront" \
  --metric-name "CacheHitRate" \
  --dimensions Name=DistributionId,Value=E1234567890123 \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average
```

**Solutions:**
```typescript
// Bundle optimization strategies
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          utils: ['date-fns', 'lodash'],
        },
      },
    },
    
    // Enable minification and compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@vite/client', '@vite/env'],
  },
});

// Performance monitoring service worker
// service-worker.ts
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Cache static assets
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|webp|svg)$/)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then((response) => {
          const responseClone = response.clone();
          caches.open('static-assets-v1').then((cache) => {
            cache.put(event.request, responseClone);
          });
          
          return response;
        });
      })
    );
  }
  
  // Cache API responses with TTL
  if (url.pathname.startsWith('/api/v1/listings')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          const responseDate = new Date(response.headers.get('date'));
          const now = new Date();
          const age = now.getTime() - responseDate.getTime();
          
          // Cache for 5 minutes
          if (age < 5 * 60 * 1000) {
            return response;
          }
        }
        
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open('api-cache-v1').then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          
          return response;
        });
      })
    );
  }
});
```

---

## 📞 **Escalation Procedures**

### **Incident Severity Levels**

| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| **P0 - Critical** | Complete service outage | < 15 minutes | Immediate page + Engineering Manager |
| **P1 - High** | Major feature broken | < 1 hour | Slack alert + Team Lead |
| **P2 - Medium** | Performance degradation | < 4 hours | Ticket + Daily standup |
| **P3 - Low** | Minor issues | < 24 hours | Ticket + Weekly review |

### **Contact Information**

```typescript
// Emergency contact configuration
export const EMERGENCY_CONTACTS = {
  onCall: {
    primary: {
      name: "Senior Engineer",
      phone: "+1-555-0101",
      email: "oncall-primary@harborlist.com",
      slack: "@oncall-primary",
    },
    secondary: {
      name: "Lead DevOps Engineer", 
      phone: "+1-555-0102",
      email: "oncall-secondary@harborlist.com",
      slack: "@oncall-secondary",
    },
  },
  
  management: {
    engineeringManager: {
      name: "Engineering Manager",
      phone: "+1-555-0201",
      email: "em@harborlist.com",
      slack: "@engineering-manager",
    },
    cto: {
      name: "Chief Technology Officer",
      phone: "+1-555-0301", 
      email: "cto@harborlist.com",
      slack: "@cto",
    },
  },
  
  external: {
    awsSupport: "https://console.aws.amazon.com/support/",
    cloudflareSupport: "https://dash.cloudflare.com/profile/support",
  },
};

// Automated escalation service
export class IncidentEscalationService {
  async escalateIncident(incident: Incident): Promise<void> {
    const severity = this.calculateSeverity(incident);
    const escalationPlan = this.getEscalationPlan(severity);
    
    for (const step of escalationPlan) {
      await this.executeEscalationStep(step, incident);
      
      // Wait for acknowledgment before next step
      const acknowledged = await this.waitForAcknowledgment(step.timeout);
      if (acknowledged) break;
    }
  }

  private calculateSeverity(incident: Incident): IncidentSeverity {
    // Automated severity calculation based on metrics
    if (incident.errorRate > 50 || incident.availability < 90) {
      return 'P0';
    } else if (incident.errorRate > 10 || incident.responseTime > 5000) {
      return 'P1';
    } else if (incident.errorRate > 2 || incident.responseTime > 2000) {
      return 'P2';
    } else {
      return 'P3';
    }
  }
}
```

---

## 🔗 **Related Documentation**

- **📊 [Monitoring & Observability](../monitoring/README.md)**: Proactive monitoring and alerting
- **🚀 [Deployment Guide](../deployment/README.md)**: Rollback and recovery procedures
- **🔒 [Security Framework](../security/README.md)**: Security incident response
- **📊 [Performance Testing](../performance/README.md)**: Performance optimization strategies
- **📱 [API Documentation](../api/README.md)**: API error codes and handling

---

**📅 Last Updated**: October 2025  
**📝 Document Version**: 1.0.0  
**👥 Support Team**: HarborList Engineering Support Team  
**🔄 Next Review**: January 2026