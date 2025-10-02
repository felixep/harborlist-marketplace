#!/usr/bin/env node

/**
 * Performance Testing Script for Cloudflare Tunnel Architecture
 * Tests page load times, DNS resolution, and caching effectiveness
 */

const https = require('https');
const http = require('http');
const dns = require('dns').promises;
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  domains: {
    frontend: 'https://dev.harborlist.com',
    api: 'https://api-dev.harborlist.com'
  },
  testPages: [
    '/',
    '/search',
    '/about',
    '/contact'
  ],
  apiEndpoints: [
    '/health',
    '/api/listings',
    '/api/stats'
  ],
  iterations: 5,
  timeout: 30000
};

class PerformanceTester {
  constructor() {
    this.results = {
      pageLoads: [],
      dnsResolution: [],
      caching: [],
      apiResponse: []
    };
  }

  async measurePageLoadTime(url) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const urlObj = new URL(url);
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname,
        method: 'GET',
        timeout: CONFIG.timeout,
        headers: {
          'User-Agent': 'Performance-Test-Bot/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        const firstByteTime = performance.now();
        
        res.on('data', (chunk) => {
          if (data === '') {
            // Time to first byte
            res.ttfb = firstByteTime - startTime;
          }
          data += chunk;
        });

        res.on('end', () => {
          const endTime = performance.now();
          resolve({
            url,
            statusCode: res.statusCode,
            loadTime: endTime - startTime,
            ttfb: res.ttfb,
            contentLength: data.length,
            headers: res.headers,
            timestamp: new Date().toISOString()
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.end();
    });
  }

  async measureDNSResolution(hostname) {
    const startTime = performance.now();
    try {
      const addresses = await dns.resolve4(hostname);
      const endTime = performance.now();
      return {
        hostname,
        addresses,
        resolutionTime: endTime - startTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        hostname,
        error: error.message,
        resolutionTime: -1,
        timestamp: new Date().toISOString()
      };
    }
  }

  async testCaching(url) {
    // First request to populate cache
    const firstRequest = await this.measurePageLoadTime(url);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Second request should be cached
    const secondRequest = await this.measurePageLoadTime(url);
    
    return {
      url,
      firstRequest: {
        loadTime: firstRequest.loadTime,
        ttfb: firstRequest.ttfb,
        cacheStatus: firstRequest.headers['cf-cache-status'] || 'unknown'
      },
      secondRequest: {
        loadTime: secondRequest.loadTime,
        ttfb: secondRequest.ttfb,
        cacheStatus: secondRequest.headers['cf-cache-status'] || 'unknown'
      },
      improvement: firstRequest.loadTime - secondRequest.loadTime,
      timestamp: new Date().toISOString()
    };
  }

  async runPageLoadTests() {
    console.log('🚀 Starting page load time tests...');
    
    for (const page of CONFIG.testPages) {
      const url = CONFIG.domains.frontend + page;
      console.log(`Testing: ${url}`);
      
      const pageResults = [];
      for (let i = 0; i < CONFIG.iterations; i++) {
        try {
          const result = await this.measurePageLoadTime(url);
          pageResults.push(result);
          console.log(`  Iteration ${i + 1}: ${result.loadTime.toFixed(2)}ms (TTFB: ${result.ttfb.toFixed(2)}ms)`);
        } catch (error) {
          console.error(`  Iteration ${i + 1} failed:`, error.message);
          pageResults.push({ url, error: error.message, loadTime: -1 });
        }
      }
      
      this.results.pageLoads.push({
        url,
        results: pageResults,
        average: pageResults.filter(r => r.loadTime > 0).reduce((sum, r) => sum + r.loadTime, 0) / pageResults.filter(r => r.loadTime > 0).length,
        min: Math.min(...pageResults.filter(r => r.loadTime > 0).map(r => r.loadTime)),
        max: Math.max(...pageResults.filter(r => r.loadTime > 0).map(r => r.loadTime))
      });
    }
  }

  async runDNSTests() {
    console.log('🌐 Starting DNS resolution tests...');
    
    const hostnames = [
      'dev.harborlist.com',
      'api-dev.harborlist.com'
    ];

    for (const hostname of hostnames) {
      console.log(`Testing DNS for: ${hostname}`);
      
      const dnsResults = [];
      for (let i = 0; i < CONFIG.iterations; i++) {
        const result = await this.measureDNSResolution(hostname);
        dnsResults.push(result);
        if (result.resolutionTime > 0) {
          console.log(`  Iteration ${i + 1}: ${result.resolutionTime.toFixed(2)}ms`);
        } else {
          console.log(`  Iteration ${i + 1}: Error - ${result.error}`);
        }
      }
      
      this.results.dnsResolution.push({
        hostname,
        results: dnsResults,
        average: dnsResults.filter(r => r.resolutionTime > 0).reduce((sum, r) => sum + r.resolutionTime, 0) / dnsResults.filter(r => r.resolutionTime > 0).length
      });
    }
  }

  async runCachingTests() {
    console.log('💾 Starting caching effectiveness tests...');
    
    const testUrls = [
      CONFIG.domains.frontend + '/',
      CONFIG.domains.frontend + '/static/css/main.css',
      CONFIG.domains.frontend + '/static/js/main.js'
    ];

    for (const url of testUrls) {
      console.log(`Testing caching for: ${url}`);
      try {
        const result = await this.testCaching(url);
        this.results.caching.push(result);
        console.log(`  First request: ${result.firstRequest.loadTime.toFixed(2)}ms (${result.firstRequest.cacheStatus})`);
        console.log(`  Second request: ${result.secondRequest.loadTime.toFixed(2)}ms (${result.secondRequest.cacheStatus})`);
        console.log(`  Improvement: ${result.improvement.toFixed(2)}ms`);
      } catch (error) {
        console.error(`  Error testing ${url}:`, error.message);
      }
    }
  }

  async runAPITests() {
    console.log('🔌 Starting API response time tests...');
    
    for (const endpoint of CONFIG.apiEndpoints) {
      const url = CONFIG.domains.api + endpoint;
      console.log(`Testing: ${url}`);
      
      const apiResults = [];
      for (let i = 0; i < CONFIG.iterations; i++) {
        try {
          const result = await this.measurePageLoadTime(url);
          apiResults.push(result);
          console.log(`  Iteration ${i + 1}: ${result.loadTime.toFixed(2)}ms (Status: ${result.statusCode})`);
        } catch (error) {
          console.error(`  Iteration ${i + 1} failed:`, error.message);
          apiResults.push({ url, error: error.message, loadTime: -1 });
        }
      }
      
      this.results.apiResponse.push({
        url,
        results: apiResults,
        average: apiResults.filter(r => r.loadTime > 0).reduce((sum, r) => sum + r.loadTime, 0) / apiResults.filter(r => r.loadTime > 0).length
      });
    }
  }

  generateReport() {
    const report = {
      testRun: {
        timestamp: new Date().toISOString(),
        duration: 'N/A',
        architecture: 'Cloudflare Tunnel'
      },
      summary: {
        pageLoadAverage: 0,
        dnsResolutionAverage: 0,
        cachingImprovement: 0,
        apiResponseAverage: 0
      },
      details: this.results,
      recommendations: []
    };

    // Calculate averages
    if (this.results.pageLoads.length > 0) {
      report.summary.pageLoadAverage = this.results.pageLoads.reduce((sum, p) => sum + p.average, 0) / this.results.pageLoads.length;
    }

    if (this.results.dnsResolution.length > 0) {
      report.summary.dnsResolutionAverage = this.results.dnsResolution.reduce((sum, d) => sum + d.average, 0) / this.results.dnsResolution.length;
    }

    if (this.results.caching.length > 0) {
      report.summary.cachingImprovement = this.results.caching.reduce((sum, c) => sum + c.improvement, 0) / this.results.caching.length;
    }

    if (this.results.apiResponse.length > 0) {
      report.summary.apiResponseAverage = this.results.apiResponse.reduce((sum, a) => sum + a.average, 0) / this.results.apiResponse.length;
    }

    // Generate recommendations
    if (report.summary.pageLoadAverage > 3000) {
      report.recommendations.push('Page load times are above 3 seconds. Consider optimizing static assets.');
    }

    if (report.summary.dnsResolutionAverage > 100) {
      report.recommendations.push('DNS resolution is slow. Check Cloudflare DNS configuration.');
    }

    if (report.summary.cachingImprovement < 100) {
      report.recommendations.push('Caching improvement is minimal. Review cache headers and Cloudflare settings.');
    }

    return report;
  }

  async runAllTests() {
    console.log('🧪 Starting comprehensive performance tests for Cloudflare Tunnel architecture\n');
    
    const startTime = performance.now();
    
    await this.runPageLoadTests();
    console.log('');
    
    await this.runDNSTests();
    console.log('');
    
    await this.runCachingTests();
    console.log('');
    
    await this.runAPITests();
    console.log('');
    
    const endTime = performance.now();
    const report = this.generateReport();
    report.testRun.duration = `${((endTime - startTime) / 1000).toFixed(2)} seconds`;
    
    return report;
  }
}

// Main execution
async function main() {
  const tester = new PerformanceTester();
  
  try {
    const report = await tester.runAllTests();
    
    console.log('📊 Performance Test Results Summary:');
    console.log('=====================================');
    console.log(`Average Page Load Time: ${report.summary.pageLoadAverage.toFixed(2)}ms`);
    console.log(`Average DNS Resolution: ${report.summary.dnsResolutionAverage.toFixed(2)}ms`);
    console.log(`Average Caching Improvement: ${report.summary.cachingImprovement.toFixed(2)}ms`);
    console.log(`Average API Response Time: ${report.summary.apiResponseAverage.toFixed(2)}ms`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }
    
    // Save detailed report
    const fs = require('fs');
    const reportPath = 'infrastructure/reports/performance-test-report.json';
    fs.mkdirSync('infrastructure/reports', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PerformanceTester;