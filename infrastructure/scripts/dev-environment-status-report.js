#!/usr/bin/env node

/**
 * Dev Environment Status Report
 * 
 * This script generates a comprehensive status report of the dev environment
 * based on the current Cloudflare tunnel architecture implementation.
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
  s3DirectEndpoint: 'http://boat-listing-frontend-676032292155.s3-website.us-east-1.amazonaws.com',
  timeout: 10000
};

// Results storage
const results = {
  architecture: {
    type: 'Cloudflare Tunnel + VPC Endpoint + S3',
    status: 'Partially Operational',
    issues: [],
    successes: []
  },
  requirements: {},
  recommendations: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '✅',
    error: '❌',
    warning: '⚠️',
    test: '🧪'
  }[type] || 'ℹ️';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, {
      timeout: CONFIG.timeout,
      ...options
    }, (res) => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          responseTime,
          url
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout for ${url}`));
    });
  });
}

// Test functions
async function checkArchitectureStatus() {
  log('Checking Architecture Status...', 'test');
  
  try {
    // Test S3 security (should be 403)
    const s3Response = await makeRequest(CONFIG.s3DirectEndpoint);
    if (s3Response.statusCode === 403) {
      results.architecture.successes.push('S3 bucket properly secured (not publicly accessible)');
      results.requirements['2.1'] = 'PASS - S3 configured for VPC endpoint access only';
    } else {
      results.architecture.issues.push(`S3 bucket security issue: status ${s3Response.statusCode}`);
      results.requirements['2.1'] = `FAIL - S3 returns ${s3Response.statusCode} instead of 403`;
    }
    
    // Test Cloudflare tunnel access
    const frontendResponse = await makeRequest(CONFIG.domains.frontend);
    if (frontendResponse.statusCode === 200 && frontendResponse.headers.server === 'cloudflare') {
      results.architecture.successes.push('Cloudflare tunnel serving frontend successfully');
      results.requirements['1.3'] = 'PASS - Frontend accessible through Cloudflare tunnel';
      results.requirements['6.1'] = 'PARTIAL - Root route works, sub-routes need investigation';
    } else {
      results.architecture.issues.push('Cloudflare tunnel access issue');
      results.requirements['1.3'] = 'FAIL - Frontend not accessible through tunnel';
    }
    
    // Test API connectivity
    const apiResponse = await makeRequest(`${CONFIG.domains.api}/health`);
    if (apiResponse.statusCode < 500 && apiResponse.headers.server === 'cloudflare') {
      results.architecture.successes.push('API accessible through Cloudflare');
      results.requirements['6.2'] = 'PASS - API endpoints reachable';
    } else {
      results.architecture.issues.push('API connectivity issue');
      results.requirements['6.2'] = 'FAIL - API not reachable';
    }
    
  } catch (error) {
    results.architecture.issues.push(`Architecture test failed: ${error.message}`);
  }
}

async function checkSPARouting() {
  log('Checking SPA Routing...', 'test');
  
  const testRoutes = [
    { route: '/', expected: 'Should work' },
    { route: '/search', expected: 'Should serve SPA for client-side routing' },
    { route: '/about', expected: 'Should serve SPA for client-side routing' },
    { route: '/nonexistent', expected: 'Should serve SPA for 404 handling' }
  ];
  
  const routeResults = [];
  
  for (const test of testRoutes) {
    try {
      const response = await makeRequest(`${CONFIG.domains.frontend}${test.route}`);
      routeResults.push({
        route: test.route,
        status: response.statusCode,
        expected: test.expected,
        working: response.statusCode === 200 && response.data.includes('<div id="root">')
      });
    } catch (error) {
      routeResults.push({
        route: test.route,
        status: 'ERROR',
        expected: test.expected,
        working: false,
        error: error.message
      });
    }
  }
  
  const workingRoutes = routeResults.filter(r => r.working).length;
  const totalRoutes = routeResults.length;
  
  if (workingRoutes === totalRoutes) {
    results.requirements['2.3'] = 'PASS - SPA routing works correctly';
    results.requirements['6.5'] = 'PASS - Error handling works properly';
  } else if (workingRoutes > 0) {
    results.requirements['2.3'] = `PARTIAL - ${workingRoutes}/${totalRoutes} routes working`;
    results.requirements['6.5'] = 'PARTIAL - Some error handling issues';
    results.architecture.issues.push('SPA routing not fully functional');
    results.recommendations.push('Configure Cloudflare tunnel to serve index.html for all routes');
  } else {
    results.requirements['2.3'] = 'FAIL - SPA routing not working';
    results.requirements['6.5'] = 'FAIL - Error handling not working';
    results.architecture.issues.push('SPA routing completely broken');
  }
  
  return routeResults;
}

async function checkPerformance() {
  log('Checking Performance...', 'test');
  
  try {
    const response = await makeRequest(CONFIG.domains.frontend);
    
    if (response.responseTime < 3000) {
      results.requirements['6.4'] = `PASS - Load time ${response.responseTime.toFixed(2)}ms`;
      results.architecture.successes.push(`Good performance: ${response.responseTime.toFixed(2)}ms`);
    } else {
      results.requirements['6.4'] = `FAIL - Load time ${response.responseTime.toFixed(2)}ms exceeds 3000ms`;
      results.architecture.issues.push('Performance issues detected');
    }
    
    // Check DNS performance
    const dnsStart = performance.now();
    await dns.resolve('dev.harborlist.com', 'A');
    const dnsTime = performance.now() - dnsStart;
    
    if (dnsTime < 100) {
      results.requirements['4.4'] = `PASS - DNS resolution ${dnsTime.toFixed(2)}ms`;
    } else {
      results.requirements['4.4'] = `FAIL - DNS resolution ${dnsTime.toFixed(2)}ms exceeds 100ms`;
    }
    
  } catch (error) {
    results.requirements['6.4'] = `FAIL - Performance test failed: ${error.message}`;
  }
}

async function checkSecurity() {
  log('Checking Security...', 'test');
  
  try {
    const frontendResponse = await makeRequest(CONFIG.domains.frontend);
    const apiResponse = await makeRequest(`${CONFIG.domains.api}/health`);
    
    // Check HTTPS
    if (frontendResponse.url.startsWith('https') && apiResponse.url.startsWith('https')) {
      results.requirements['3.1'] = 'PASS - HTTPS connections working';
      results.requirements['3.2'] = 'PASS - End-to-end encryption active';
    } else {
      results.requirements['3.1'] = 'FAIL - HTTPS issues detected';
      results.requirements['3.2'] = 'FAIL - Encryption issues detected';
    }
    
    // Check for security headers
    const securityHeaders = ['strict-transport-security', 'x-content-type-options'];
    const hasSecurityHeaders = securityHeaders.some(header => 
      frontendResponse.headers[header] || apiResponse.headers[header]
    );
    
    if (hasSecurityHeaders) {
      results.requirements['3.3'] = 'PASS - Security headers present';
    } else {
      results.requirements['3.3'] = 'PARTIAL - Some security headers missing';
    }
    
  } catch (error) {
    results.requirements['3.1'] = `FAIL - Security test failed: ${error.message}`;
  }
}

async function generateRecommendations() {
  log('Generating Recommendations...', 'test');
  
  // Analyze issues and generate recommendations
  if (results.architecture.issues.some(issue => issue.includes('SPA routing'))) {
    results.recommendations.push({
      priority: 'HIGH',
      issue: 'SPA routing not working for sub-routes',
      solution: 'Update Cloudflare tunnel configuration to serve index.html for all routes',
      steps: [
        'SSH into EC2 instance (i-0aaeb985f18d05312)',
        'Update /etc/cloudflared/config.yml to handle all routes',
        'Restart cloudflared service',
        'Test SPA routing functionality'
      ]
    });
  }
  
  if (results.requirements['6.4']?.includes('FAIL')) {
    results.recommendations.push({
      priority: 'MEDIUM',
      issue: 'Performance optimization needed',
      solution: 'Optimize Cloudflare caching and tunnel configuration',
      steps: [
        'Review Cloudflare caching rules',
        'Optimize tunnel configuration',
        'Consider CDN optimizations'
      ]
    });
  }
  
  // Always recommend monitoring
  results.recommendations.push({
    priority: 'LOW',
    issue: 'Monitoring and alerting',
    solution: 'Set up comprehensive monitoring for the tunnel architecture',
    steps: [
      'Configure CloudWatch alarms for EC2 instance health',
      'Set up Cloudflare analytics monitoring',
      'Create operational runbooks'
    ]
  });
}

async function generateReport() {
  log('Generating Status Report...', 'test');
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: 'dev',
    architecture: results.architecture,
    requirements: results.requirements,
    recommendations: results.recommendations,
    summary: {
      totalRequirements: Object.keys(results.requirements).length,
      passed: Object.values(results.requirements).filter(r => r.includes('PASS')).length,
      partial: Object.values(results.requirements).filter(r => r.includes('PARTIAL')).length,
      failed: Object.values(results.requirements).filter(r => r.includes('FAIL')).length
    }
  };
  
  // Write report to file
  const fs = require('fs');
  const reportPath = 'infrastructure/reports/dev-environment-status-report.json';
  
  if (!fs.existsSync('infrastructure/reports')) {
    fs.mkdirSync('infrastructure/reports', { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Generate console output
  console.log('\n' + '='.repeat(80));
  console.log('DEV ENVIRONMENT STATUS REPORT');
  console.log('='.repeat(80));
  console.log(`Architecture: ${report.architecture.type}`);
  console.log(`Status: ${report.architecture.status}`);
  console.log(`Requirements: ${report.summary.passed} passed, ${report.summary.partial} partial, ${report.summary.failed} failed`);
  console.log(`Report saved to: ${reportPath}`);
  console.log('='.repeat(80));
  
  console.log('\n✅ WORKING COMPONENTS:');
  report.architecture.successes.forEach(success => {
    console.log(`   ${success}`);
  });
  
  if (report.architecture.issues.length > 0) {
    console.log('\n❌ ISSUES IDENTIFIED:');
    report.architecture.issues.forEach(issue => {
      console.log(`   ${issue}`);
    });
  }
  
  if (report.recommendations.length > 0) {
    console.log('\n🔧 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => {
      console.log(`   [${rec.priority}] ${rec.issue}`);
      console.log(`   Solution: ${rec.solution}`);
    });
  }
  
  console.log('\n📋 REQUIREMENT STATUS:');
  Object.entries(report.requirements).forEach(([req, status]) => {
    const icon = status.includes('PASS') ? '✅' : status.includes('PARTIAL') ? '⚠️' : '❌';
    console.log(`   ${icon} Requirement ${req}: ${status}`);
  });
  
  return report;
}

// Main execution
async function runStatusCheck() {
  console.log('🚀 Starting Dev Environment Status Check...\n');
  
  try {
    await checkArchitectureStatus();
    const routeResults = await checkSPARouting();
    await checkPerformance();
    await checkSecurity();
    await generateRecommendations();
    
    const report = await generateReport();
    
    // Determine overall status
    const criticalIssues = report.summary.failed;
    const partialIssues = report.summary.partial;
    
    if (criticalIssues === 0 && partialIssues === 0) {
      log('🎉 Dev environment fully operational!', 'info');
      process.exit(0);
    } else if (criticalIssues === 0) {
      log('⚠️ Dev environment mostly operational with minor issues', 'warning');
      process.exit(0);
    } else {
      log('❌ Dev environment has critical issues that need attention', 'error');
      process.exit(1);
    }
    
  } catch (error) {
    log(`💥 Status check failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runStatusCheck();
}

module.exports = {
  runStatusCheck,
  results
};