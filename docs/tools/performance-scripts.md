# Performance Scripts

This section documents all scripts responsible for performance testing, optimization, and benchmarking of the HarborList infrastructure and applications.

## 📋 Scripts Overview

| Script | Purpose | Type | Usage |
|---|---|---|---|
| `performance-testing.js` | Comprehensive performance analysis | Node.js | Page load and API performance testing |
| `run-performance-tests.sh` | Performance test suite runner | Shell | Automated performance testing workflow |
| `dns-performance-test.js` | DNS resolution and latency testing | Node.js | DNS and networking performance |
| `caching-test.js` | Cache performance and effectiveness testing | Node.js | CDN and cache optimization |

---

## ⚡ performance-testing.js

**Comprehensive performance testing script for Cloudflare Tunnel architecture**

### Purpose
Tests page load times, DNS resolution performance, API response times, and overall system performance to ensure optimal user experience and identify optimization opportunities.

### Key Features
- **Page load time measurement**
- **DNS resolution performance testing**
- **API endpoint response time analysis**
- **Caching effectiveness validation**
- **Performance trend analysis and reporting**

### Performance Testing Categories

#### 1. Frontend Performance Testing
- **Page Load Times**: Measures complete page loading duration
- **Resource Loading**: Analyzes CSS, JavaScript, and image loading times
- **Time to First Byte (TTFB)**: Measures server response time
- **Time to Interactive (TTI)**: Measures when page becomes interactive

#### 2. API Performance Testing
- **Endpoint Response Times**: Measures API call latency
- **Throughput Testing**: Tests requests per second capacity
- **Concurrent User Simulation**: Tests performance under load
- **Database Query Performance**: Analyzes backend data operations

#### 3. DNS and Network Performance
- **DNS Resolution Time**: Measures domain name lookup speed
- **Geographic Performance**: Tests performance from different locations
- **CDN Effectiveness**: Validates content delivery network performance
- **SSL/TLS Handshake Time**: Measures secure connection establishment

#### 4. Caching Performance
- **Cache Hit Rates**: Measures cache effectiveness
- **Cache Invalidation**: Tests cache update mechanisms
- **Browser Caching**: Validates client-side caching
- **CDN Cache Performance**: Tests edge cache effectiveness

### Usage

```bash
# Run standard performance tests
node performance-testing.js

# Run comprehensive performance analysis
node performance-testing.js --comprehensive

# Test specific components
node performance-testing.js --component frontend
node performance-testing.js --component api

# Generate detailed report
node performance-testing.js --detailed-report

# Test from multiple locations
node performance-testing.js --multi-location

# Benchmark against targets
node performance-testing.js --benchmark
```

### Parameters

| Parameter | Description | Values | Default |
|---|---|---|---|
| `--comprehensive` | Run all performance tests | boolean | false |
| `--component` | Test specific component | frontend, api, dns, cache | all |
| `--detailed-report` | Generate detailed analysis | boolean | false |
| `--multi-location` | Test from multiple regions | boolean | false |
| `--benchmark` | Compare against targets | boolean | false |
| `--iterations` | Number of test iterations | number | 5 |
| `--output` | Output format | json, html, markdown | console |

### Test Configuration

```javascript
const CONFIG = {
  domains: {
    frontend: 'https://dev.harborlist.com',
    api: 'https://api-dev.harborlist.com'
  },
  testPages: [
    '/',           // Homepage
    '/search',     // Search functionality
    '/about',      // Static content
    '/contact'     // Form pages
  ],
  apiEndpoints: [
    '/health',     // Health check
    '/api/listings',  // Data endpoints
    '/api/stats'   // Analytics endpoints
  ],
  iterations: 5,
  timeout: 30000,
  performanceTargets: {
    pageLoadTime: 3000,    // 3 seconds
    apiResponseTime: 500,  // 500ms
    dnsResolution: 100,    // 100ms
    ttfb: 1000            // 1 second
  }
};
```

### Performance Test Results

#### 1. Page Load Performance
```bash
🌐 Frontend Performance Results

📊 Page Load Times (Average over 5 iterations):
   ┌─────────────────┬──────────┬──────────┬──────────┬─────────┐
   │ Page            │ Load Time│ TTFB     │ Status   │ Target  │
   ├─────────────────┼──────────┼──────────┼──────────┼─────────┤
   │ Homepage (/)    │ 1,247ms  │ 234ms    │ ✅ PASS  │ <3000ms │
   │ Search          │ 1,156ms  │ 189ms    │ ✅ PASS  │ <3000ms │
   │ About           │ 891ms    │ 145ms    │ ✅ PASS  │ <3000ms │
   │ Contact         │ 1,034ms  │ 167ms    │ ✅ PASS  │ <3000ms │
   └─────────────────┴──────────┴──────────┴──────────┴─────────┘

📈 Performance Summary:
   Average Load Time: 1,082ms
   Best Performance: About page (891ms)
   Slowest Page: Homepage (1,247ms)
   Overall Grade: A (All pages under 3s target)
```

#### 2. API Performance
```bash
🚀 API Performance Results

📊 API Response Times (Average over 5 iterations):
   ┌─────────────────┬──────────┬──────────┬──────────┬─────────┐
   │ Endpoint        │ Response │ Min      │ Max      │ Target  │
   ├─────────────────┼──────────┼──────────┼──────────┼─────────┤
   │ /health         │ 145ms    │ 132ms    │ 167ms    │ ✅<500ms│
   │ /api/listings   │ 289ms    │ 245ms    │ 334ms    │ ✅<500ms│
   │ /api/stats      │ 234ms    │ 198ms    │ 278ms    │ ✅<500ms│
   └─────────────────┴──────────┴──────────┴──────────┴─────────┘

📈 API Performance Summary:
   Average Response Time: 223ms
   Fastest Endpoint: Health check (145ms)
   Slowest Endpoint: Listings API (289ms)
   Overall Grade: A+ (All endpoints well under 500ms target)
```

#### 3. Network Performance
```bash
🌍 Network and DNS Performance

📊 DNS Resolution Times:
   Primary Domain (harborlist.com): 45ms
   API Subdomain (api-dev): 38ms
   Average DNS Resolution: 42ms ✅ (Target: <100ms)

📊 Geographic Performance (Simulated):
   US East (Virginia): 145ms
   US West (California): 198ms
   Europe (London): 267ms
   Asia (Tokyo): 334ms
   
🔄 Cloudflare CDN Effectiveness:
   Cache Hit Rate: 87%
   Edge Response Time: 12ms
   Origin Response Time: 234ms
   CDN Performance Gain: 95% improvement
```

#### 4. Performance Recommendations
```bash
🚀 Performance Optimization Recommendations

🎯 High Impact Optimizations:
   1. Image Optimization (Est. 200ms improvement)
      - Implement WebP format for modern browsers
      - Add lazy loading for below-the-fold images
      - Optimize image sizes and compression

   2. JavaScript Optimization (Est. 150ms improvement)
      - Implement code splitting for route-based chunks
      - Remove unused dependencies
      - Enable tree shaking optimization

   3. Cache Optimization (Est. 100ms improvement)
      - Increase browser cache duration for static assets
      - Implement service worker for offline capabilities
      - Optimize cache invalidation strategies

🔧 Medium Impact Optimizations:
   1. Database Query Optimization (Est. 50ms improvement)
      - Add database indexes for frequently queried fields
      - Implement query result caching
      - Optimize DynamoDB read patterns

   2. API Optimization (Est. 30ms improvement)
      - Implement response compression
      - Optimize payload sizes
      - Add request batching capabilities
```

---

## 🏃 run-performance-tests.sh

**Comprehensive performance test suite runner and automation framework**

### Purpose
Executes a complete performance testing workflow, orchestrating multiple testing tools and generating comprehensive performance reports for the entire HarborList infrastructure.

### Key Features
- **Automated test suite execution**
- **Multiple testing tool integration**
- **Comprehensive reporting and analysis**
- **Performance trend tracking**
- **Automated alerting on performance degradation**

### Test Suite Components

#### 1. Frontend Performance Testing
- Page load speed testing
- Resource optimization analysis
- Mobile performance testing
- Accessibility performance impact

#### 2. Backend API Testing
- API endpoint performance
- Database query performance
- Authentication flow performance
- Concurrent user simulation

#### 3. Infrastructure Performance
- CDN effectiveness testing
- DNS resolution performance
- SSL/TLS performance
- Network latency analysis

#### 4. End-to-End Performance
- User journey performance
- Complete workflow testing
- Integration performance
- Cross-browser compatibility

### Usage

```bash
# Run complete performance test suite
./run-performance-tests.sh

# Run specific test category
./run-performance-tests.sh --category frontend
./run-performance-tests.sh --category api
./run-performance-tests.sh --category infrastructure

# Run with different load levels
./run-performance-tests.sh --load light
./run-performance-tests.sh --load medium
./run-performance-tests.sh --load heavy

# Generate detailed reports
./run-performance-tests.sh --detailed-report

# Run continuous performance monitoring
./run-performance-tests.sh --monitor --interval 1h
```

### Parameters

| Parameter | Description | Values | Default |
|---|---|---|---|
| `--category` | Test category to run | frontend, api, infrastructure, all | all |
| `--load` | Load testing level | light, medium, heavy | light |
| `--detailed-report` | Generate detailed analysis | boolean | false |
| `--monitor` | Continuous monitoring mode | boolean | false |
| `--interval` | Monitoring interval | 15m, 1h, 6h, 24h | 1h |
| `--baseline` | Set performance baseline | boolean | false |
| `--compare` | Compare with baseline | boolean | false |

### Test Execution Workflow

```bash
🚀 HarborList Performance Test Suite
Started: 2024-01-15 14:30:00 UTC
Environment: dev
Configuration: Comprehensive testing with detailed reporting

✅ Prerequisites Check
   ✓ Node.js available (v18.17.0)
   ✓ curl available (7.68.0)
   ✓ jq available (1.6)
   ✓ Performance testing tools ready

🌐 Frontend Performance Tests (5 minutes)
   ✓ Page Load Testing: 4 pages tested
   ✓ Resource Optimization Analysis: Complete
   ✓ Mobile Performance: Responsive design validated
   ✓ Core Web Vitals: All metrics within targets

🚀 Backend API Tests (3 minutes)
   ✓ API Endpoint Testing: 15 endpoints tested
   ✓ Database Performance: Query optimization validated
   ✓ Authentication Performance: JWT flow optimized
   ✓ Load Testing: Handled 100 concurrent users

🏗️ Infrastructure Tests (4 minutes)
   ✓ CDN Performance: 95% cache hit rate
   ✓ DNS Resolution: Average 42ms globally
   ✓ SSL Performance: TLS 1.3 optimized
   ✓ Network Latency: Within acceptable ranges

🔄 End-to-End Tests (6 minutes)
   ✓ User Journey Testing: Complete workflows tested
   ✓ Cross-Browser Compatibility: Chrome, Firefox, Safari
   ✓ Integration Performance: All services coordinated
   ✓ Error Handling: Graceful degradation validated

📊 Test Results Summary:
   Total Tests: 127
   Passed: 125 (98.4%)
   Failed: 2 (1.6%)
   Performance Score: 94/100
   
   Frontend Grade: A
   Backend Grade: A+
   Infrastructure Grade: A
   Overall Grade: A
```

### Performance Report Generation

```bash
📋 Performance Report Generated
   Location: infrastructure/reports/performance-test-suite-20240115_143000.json
   
📈 Key Performance Indicators:
   Average Page Load Time: 1,082ms (Target: <3,000ms) ✅
   Average API Response: 223ms (Target: <500ms) ✅
   DNS Resolution: 42ms (Target: <100ms) ✅
   Cache Hit Rate: 95% (Target: >80%) ✅
   
🎯 Performance Trends:
   Week over Week: +2.3% improvement
   Month over Month: +8.7% improvement
   Performance Stability: 99.2%
   
⚠️ Performance Alerts:
   - Minor: Homepage load time increased by 50ms
   - Info: API response times trending upward
   
📋 Recommendations:
   1. Implement image optimization for homepage
   2. Review database query patterns for listings API
   3. Consider CDN cache preloading for popular content
```

---

## 🌐 dns-performance-test.js

**DNS resolution and network latency testing**

### Purpose
Tests DNS resolution performance, geographic latency patterns, and network optimization effectiveness for global accessibility.

### Key Features
- **DNS resolution time measurement**
- **Geographic performance analysis**
- **DNS propagation testing**
- **CDN edge performance validation**
- **Network route optimization assessment**

### Usage

```bash
# Test DNS performance
node dns-performance-test.js

# Test from multiple geographic locations
node dns-performance-test.js --global

# Test DNS propagation status
node dns-performance-test.js --propagation

# Validate CDN edge performance
node dns-performance-test.js --cdn-edges
```

### Test Results

```bash
🌍 DNS Performance Test Results

📊 DNS Resolution Times:
   Primary Domain: 45ms
   API Subdomain: 38ms
   Admin Subdomain: 41ms
   
🌐 Geographic Performance:
   North America: 35-65ms
   Europe: 55-85ms
   Asia Pacific: 75-120ms
   
✅ DNS Health Status:
   Propagation: Complete (100% of DNS servers)
   TTL Settings: Optimized for performance
   DNSSEC: Enabled and validated
```

---

## 📦 caching-test.js

**Cache performance and effectiveness testing**

### Purpose
Tests caching mechanisms across the application stack, from browser caching to CDN edge caching, ensuring optimal cache performance.

### Key Features
- **Browser cache effectiveness testing**
- **CDN cache performance validation**
- **Cache invalidation mechanism testing**
- **Cache hit rate optimization**
- **Cache-related performance impact analysis**

### Usage

```bash
# Test cache performance
node caching-test.js

# Test cache invalidation
node caching-test.js --invalidation

# Analyze cache hit rates
node caching-test.js --hit-rates

# Test cache warming strategies
node caching-test.js --cache-warming
```

### Cache Performance Results

```bash
📦 Cache Performance Test Results

🎯 Cache Hit Rates:
   Cloudflare CDN: 95% hit rate
   Browser Cache: 87% hit rate
   API Cache: 78% hit rate
   
⚡ Performance Impact:
   Cached Response Time: 12ms
   Uncached Response Time: 234ms
   Performance Improvement: 95%
   
🔄 Cache Invalidation:
   Invalidation Propagation: <30 seconds
   Cache Purge Success Rate: 100%
   Auto-invalidation: Working correctly
```

---

## 📝 Best Practices

### Performance Testing Strategy
1. **Establish performance baselines** before optimization efforts
2. **Regular performance monitoring** to catch regressions early
3. **Test realistic user scenarios** rather than synthetic loads
4. **Monitor Core Web Vitals** for user experience optimization
5. **Implement performance budgets** to prevent regressions

### Optimization Priorities
- Focus on **Time to First Byte (TTFB)** for initial load performance
- Optimize **Largest Contentful Paint (LCP)** for perceived performance
- Minimize **Cumulative Layout Shift (CLS)** for visual stability
- Reduce **First Input Delay (FID)** for interactivity
- Monitor **Time to Interactive (TTI)** for complete functionality

### Performance Monitoring
- Set up **continuous performance monitoring** in production
- Implement **performance budgets** in CI/CD pipelines
- Monitor **real user metrics (RUM)** alongside synthetic testing
- Track **performance trends** over time
- Alert on **performance degradations** immediately

---

## 🔧 Troubleshooting

### Common Performance Issues

| Issue | Symptoms | Solutions |
|---|---|---|
| Slow page loads | High TTFB, slow resource loading | Optimize server response, enable compression, use CDN |
| High API latency | Slow API responses, timeout errors | Optimize database queries, implement caching, scale resources |
| Poor cache performance | Low hit rates, cache misses | Review cache headers, optimize TTL settings, implement cache warming |
| DNS resolution delays | Slow initial connections | Optimize DNS configuration, use faster DNS providers |

### Performance Debug Commands
```bash
# Test page load times
curl -w "@curl-format.txt" -s -o /dev/null https://dev.harborlist.com

# Check DNS resolution
dig harborlist.com
nslookup api-dev.harborlist.com

# Test API response times
curl -w "Response time: %{time_total}s\n" -s -o /dev/null https://api-dev.harborlist.com/health

# Check CDN cache status
curl -I https://dev.harborlist.com | grep -i cache
```

### Performance Optimization Tools
- **WebPageTest**: Detailed page performance analysis
- **Lighthouse**: Core Web Vitals and best practices
- **GTmetrix**: Performance scoring and recommendations
- **Pingdom**: Global performance monitoring
- **CloudWatch**: AWS infrastructure performance metrics

---

**Next**: [Cloudflare Management Scripts →](./cloudflare-scripts.md)