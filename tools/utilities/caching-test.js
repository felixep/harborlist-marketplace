#!/usr/bin/env node

/**
 * Cloudflare Caching Effectiveness Test
 * Tests caching behavior for static assets and dynamic content
 */

const https = require('https');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  baseUrl: 'https://dev.harborlist.com',
  testAssets: [
    // Static assets that should be cached
    { path: '/', type: 'html', expectedCache: 'dynamic' },
    { path: '/static/css/main.css', type: 'css', expectedCache: 'hit' },
    { path: '/static/js/main.js', type: 'js', expectedCache: 'hit' },
    { path: '/static/media/logo.svg', type: 'image', expectedCache: 'hit' },
    { path: '/favicon.ico', type: 'icon', expectedCache: 'hit' },
    // API endpoints that should not be cached
    { path: '/api/health', type: 'api', expectedCache: 'dynamic', baseUrl: 'https://api-dev.harborlist.com' }
  ],
  iterations: 3,
  cacheBustDelay: 2000, // Wait between requests to allow cache to settle
  timeout: 30000
};

class CachingTester {
  constructor() {
    this.results = [];
  }

  async makeRequest(url, headers = {}) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const urlObj = new URL(url);
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        timeout: CONFIG.timeout,
        headers: {
          'User-Agent': 'Caching-Test-Bot/1.0',
          'Accept': '*/*',
          'Cache-Control': 'no-cache', // Force fresh request initially
          ...headers
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        const firstByteTime = performance.now();
        
        res.on('data', (chunk) => {
          if (data === '') {
            res.ttfb = firstByteTime - startTime;
          }
          data += chunk;
        });

        res.on('end', () => {
          const endTime = performance.now();
          resolve({
            url,
            statusCode: res.statusCode,
            headers: res.headers,
            responseTime: endTime - startTime,
            ttfb: res.ttfb,
            contentLength: data.length,
            cacheStatus: res.headers['cf-cache-status'] || 'unknown',
            cacheControl: res.headers['cache-control'] || 'none',
            etag: res.headers['etag'] || null,
            lastModified: res.headers['last-modified'] || null,
            expires: res.headers['expires'] || null,
            age: res.headers['age'] || null,
            timestamp: new Date().toISOString()
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.end();
    });
  }

  async testAssetCaching(asset) {
    const url = (asset.baseUrl || CONFIG.baseUrl) + asset.path;
    console.log(`\n🧪 Testing caching for: ${asset.path} (${asset.type})`);
    
    const requests = [];
    
    // First request - should be MISS or DYNAMIC
    console.log('  Making initial request (cache miss expected)...');
    try {
      const firstRequest = await this.makeRequest(url);
      requests.push({ ...firstRequest, requestNumber: 1 });
      console.log(`    Response: ${firstRequest.responseTime.toFixed(2)}ms, Cache: ${firstRequest.cacheStatus}, Status: ${firstRequest.statusCode}`);
    } catch (error) {
      console.error(`    Error on first request: ${error.message}`);
      requests.push({ url, error: error.message, requestNumber: 1 });
    }

    // Wait for cache to settle
    await new Promise(resolve => setTimeout(resolve, CONFIG.cacheBustDelay));

    // Subsequent requests - should be HIT for cacheable assets
    for (let i = 2; i <= CONFIG.iterations; i++) {
      console.log(`  Making request ${i} (cache hit expected for static assets)...`);
      try {
        const request = await this.makeRequest(url, { 'Cache-Control': 'max-age=0' });
        requests.push({ ...request, requestNumber: i });
        console.log(`    Response: ${request.responseTime.toFixed(2)}ms, Cache: ${request.cacheStatus}, Status: ${request.statusCode}`);
      } catch (error) {
        console.error(`    Error on request ${i}: ${error.message}`);
        requests.push({ url, error: error.message, requestNumber: i });
      }

      // Small delay between requests
      if (i < CONFIG.iterations) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return this.analyzeAssetCaching(asset, requests);
  }

  analyzeAssetCaching(asset, requests) {
    const successfulRequests = requests.filter(r => !r.error && r.statusCode === 200);
    
    if (successfulRequests.length === 0) {
      return {
        asset: asset.path,
        type: asset.type,
        status: 'failed',
        error: 'No successful requests',
        requests
      };
    }

    const firstRequest = successfulRequests[0];
    const subsequentRequests = successfulRequests.slice(1);
    
    // Analyze cache behavior
    const cacheHits = subsequentRequests.filter(r => r.cacheStatus === 'HIT').length;
    const cacheMisses = subsequentRequests.filter(r => r.cacheStatus === 'MISS').length;
    const dynamicResponses = subsequentRequests.filter(r => r.cacheStatus === 'DYNAMIC').length;
    
    // Calculate performance improvements
    const avgFirstRequestTime = firstRequest.responseTime;
    const avgSubsequentTime = subsequentRequests.length > 0 
      ? subsequentRequests.reduce((sum, r) => sum + r.responseTime, 0) / subsequentRequests.length
      : 0;
    
    const performanceImprovement = avgFirstRequestTime - avgSubsequentTime;
    const improvementPercentage = avgFirstRequestTime > 0 
      ? (performanceImprovement / avgFirstRequestTime) * 100 
      : 0;

    // Determine if caching is working as expected
    let cachingEffectiveness = 'unknown';
    let recommendations = [];

    if (asset.expectedCache === 'hit') {
      if (cacheHits >= subsequentRequests.length * 0.8) {
        cachingEffectiveness = 'excellent';
      } else if (cacheHits >= subsequentRequests.length * 0.5) {
        cachingEffectiveness = 'good';
        recommendations.push('Some requests are not being cached. Check cache headers.');
      } else {
        cachingEffectiveness = 'poor';
        recommendations.push('Static assets are not being cached effectively. Review Cloudflare cache settings.');
      }
    } else if (asset.expectedCache === 'dynamic') {
      if (dynamicResponses >= subsequentRequests.length * 0.8) {
        cachingEffectiveness = 'correct';
      } else {
        cachingEffectiveness = 'unexpected';
        recommendations.push('Dynamic content is being cached when it should not be.');
      }
    }

    // Check cache headers
    if (firstRequest.cacheControl === 'none' && asset.type !== 'api') {
      recommendations.push('Missing Cache-Control headers. Add appropriate cache headers.');
    }

    if (asset.type !== 'api' && !firstRequest.etag && !firstRequest.lastModified) {
      recommendations.push('Missing ETag or Last-Modified headers for cache validation.');
    }

    return {
      asset: asset.path,
      type: asset.type,
      expectedCache: asset.expectedCache,
      status: 'success',
      caching: {
        effectiveness: cachingEffectiveness,
        hitRate: subsequentRequests.length > 0 ? (cacheHits / subsequentRequests.length) * 100 : 0,
        hits: cacheHits,
        misses: cacheMisses,
        dynamic: dynamicResponses
      },
      performance: {
        firstRequestTime: avgFirstRequestTime,
        avgSubsequentTime: avgSubsequentTime,
        improvement: performanceImprovement,
        improvementPercentage: improvementPercentage
      },
      headers: {
        cacheControl: firstRequest.cacheControl,
        etag: firstRequest.etag,
        lastModified: firstRequest.lastModified,
        expires: firstRequest.expires
      },
      recommendations,
      requests
    };
  }

  async runAllTests() {
    console.log('🧪 Starting Cloudflare Caching Effectiveness Tests');
    console.log('==================================================');
    console.log(`Testing ${CONFIG.testAssets.length} assets with ${CONFIG.iterations} iterations each`);
    
    const allResults = [];
    
    for (const asset of CONFIG.testAssets) {
      try {
        const result = await this.testAssetCaching(asset);
        allResults.push(result);
        this.results.push(result);
      } catch (error) {
        console.error(`❌ Error testing ${asset.path}:`, error.message);
        allResults.push({
          asset: asset.path,
          type: asset.type,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return this.generateReport();
  }

  generateReport() {
    const report = {
      testRun: {
        timestamp: new Date().toISOString(),
        baseUrl: CONFIG.baseUrl,
        assetsTestedCount: CONFIG.testAssets.length,
        iterationsPerAsset: CONFIG.iterations
      },
      summary: {
        overallCachingEffectiveness: 'unknown',
        averageHitRate: 0,
        averagePerformanceImprovement: 0,
        staticAssetsCached: 0,
        dynamicContentHandled: 0,
        issuesFound: 0
      },
      assetResults: this.results,
      recommendations: []
    };

    const successfulResults = this.results.filter(r => r.status === 'success');
    
    if (successfulResults.length === 0) {
      report.summary.overallCachingEffectiveness = 'failed';
      report.recommendations.push('All caching tests failed. Check connectivity and Cloudflare configuration.');
      return report;
    }

    // Calculate summary statistics
    const staticAssets = successfulResults.filter(r => r.expectedCache === 'hit');
    const dynamicAssets = successfulResults.filter(r => r.expectedCache === 'dynamic');
    
    if (staticAssets.length > 0) {
      report.summary.averageHitRate = staticAssets.reduce((sum, r) => sum + r.caching.hitRate, 0) / staticAssets.length;
      report.summary.averagePerformanceImprovement = staticAssets.reduce((sum, r) => sum + r.performance.improvementPercentage, 0) / staticAssets.length;
      report.summary.staticAssetsCached = staticAssets.filter(r => r.caching.effectiveness === 'excellent' || r.caching.effectiveness === 'good').length;
    }

    report.summary.dynamicContentHandled = dynamicAssets.filter(r => r.caching.effectiveness === 'correct').length;
    
    // Count issues
    report.summary.issuesFound = successfulResults.reduce((sum, r) => sum + r.recommendations.length, 0);

    // Determine overall effectiveness
    const excellentCaching = successfulResults.filter(r => r.caching.effectiveness === 'excellent').length;
    const goodCaching = successfulResults.filter(r => r.caching.effectiveness === 'good').length;
    const totalAssets = successfulResults.length;

    if ((excellentCaching + goodCaching) / totalAssets >= 0.8) {
      report.summary.overallCachingEffectiveness = 'excellent';
    } else if ((excellentCaching + goodCaching) / totalAssets >= 0.6) {
      report.summary.overallCachingEffectiveness = 'good';
    } else {
      report.summary.overallCachingEffectiveness = 'needs-improvement';
    }

    // Generate overall recommendations
    if (report.summary.averageHitRate < 80) {
      report.recommendations.push('Cache hit rate is below 80%. Review Cloudflare cache settings and asset headers.');
    }

    if (report.summary.averagePerformanceImprovement < 20) {
      report.recommendations.push('Performance improvement from caching is minimal. Consider optimizing cache headers.');
    }

    if (report.summary.issuesFound > 0) {
      report.recommendations.push(`${report.summary.issuesFound} caching issues found. Review individual asset recommendations.`);
    }

    // Collect unique recommendations from all assets
    const allRecommendations = new Set();
    successfulResults.forEach(result => {
      result.recommendations.forEach(rec => allRecommendations.add(rec));
    });
    
    allRecommendations.forEach(rec => {
      if (!report.recommendations.includes(rec)) {
        report.recommendations.push(rec);
      }
    });

    return report;
  }

  printSummary(report) {
    console.log('\n📊 Caching Effectiveness Summary');
    console.log('=================================');
    console.log(`Overall Effectiveness: ${report.summary.overallCachingEffectiveness.toUpperCase()}`);
    console.log(`Average Hit Rate: ${report.summary.averageHitRate.toFixed(1)}%`);
    console.log(`Average Performance Improvement: ${report.summary.averagePerformanceImprovement.toFixed(1)}%`);
    console.log(`Static Assets Cached Properly: ${report.summary.staticAssetsCached}/${report.assetResults.filter(r => r.expectedCache === 'hit').length}`);
    console.log(`Dynamic Content Handled Correctly: ${report.summary.dynamicContentHandled}/${report.assetResults.filter(r => r.expectedCache === 'dynamic').length}`);
    console.log(`Issues Found: ${report.summary.issuesFound}`);

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }

    console.log('\n📋 Asset Details:');
    report.assetResults.forEach(result => {
      if (result.status === 'success') {
        console.log(`  ${result.asset} (${result.type}): ${result.caching.effectiveness.toUpperCase()} - ${result.caching.hitRate.toFixed(1)}% hit rate`);
      } else {
        console.log(`  ${result.asset} (${result.type}): FAILED - ${result.error || 'Unknown error'}`);
      }
    });
  }
}

// Main execution
async function main() {
  const tester = new CachingTester();
  
  try {
    const report = await tester.runAllTests();
    
    tester.printSummary(report);
    
    // Save detailed report
    const fs = require('fs');
    const reportPath = 'infrastructure/reports/caching-test-report.json';
    fs.mkdirSync('infrastructure/reports', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed caching report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Caching effectiveness testing failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = CachingTester;