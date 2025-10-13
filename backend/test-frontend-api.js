/**
 * Test frontend API calls to debug the system monitoring issue
 */

const https = require('https');
const http = require('http');

// Test configuration
const config = {
  baseUrl: 'http://local-api.harborlist.com:3001',
  adminCredentials: {
    email: 'admin@harborlist.com',
    password: 'h]knzckN[k5|*L|v'
  },
  timeout: 10000
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = (options.protocol === 'https:' || options.port === 443) ? https : http;
    
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(config.timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testLogin() {
  console.log('🔐 Testing Admin Login...');
  
  try {
    const url = new URL('/api/auth/admin/login', config.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      protocol: 'http:'
    };

    const response = await makeRequest(options, config.adminCredentials);
    
    if (response.statusCode === 200 && response.body?.tokens?.accessToken) {
      console.log('✅ Admin login successful');
      return response.body.tokens.accessToken;
    } else {
      console.log('❌ Admin login failed:', response.statusCode, response.body);
      return null;
    }
  } catch (error) {
    console.log('❌ Admin login error:', error.message);
    return null;
  }
}

async function testSystemMetricsDetailed(token) {
  console.log('📊 Testing System Metrics (Frontend Format)...');
  
  try {
    const url = new URL('/api/admin/system/metrics?timeRange=1h&granularity=minute', config.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      protocol: 'http:'
    };

    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      console.log('✅ System Metrics endpoint accessible');
      
      const metrics = response.body;
      console.log('📊 Metrics Structure:');
      console.log(`   Uptime: ${metrics.uptime} seconds`);
      console.log(`   Active Connections: ${metrics.activeConnections}`);
      console.log(`   Requests Per Minute: ${metrics.requestsPerMinute}`);
      console.log(`   Response Time Data Points: ${metrics.responseTime?.length || 0}`);
      console.log(`   Memory Usage Data Points: ${metrics.memoryUsage?.length || 0}`);
      console.log(`   CPU Usage Data Points: ${metrics.cpuUsage?.length || 0}`);
      console.log(`   Error Rate Data Points: ${metrics.errorRate?.length || 0}`);
      
      if (metrics.responseTime && metrics.responseTime.length > 0) {
        console.log(`   Latest Response Time: ${metrics.responseTime[metrics.responseTime.length - 1].value}ms`);
      }
      
      return metrics;
    } else {
      console.log('❌ System Metrics failed:', response.statusCode, response.body);
      return null;
    }
  } catch (error) {
    console.log('❌ System Metrics error:', error.message);
    return null;
  }
}

async function testSystemHealth(token) {
  console.log('🏥 Testing System Health (Frontend Format)...');
  
  try {
    const url = new URL('/api/admin/system/health', config.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      protocol: 'http:'
    };

    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      console.log('✅ System Health endpoint accessible');
      
      const health = response.body;
      console.log('🏥 Health Structure:');
      console.log(`   Overall Status: ${health.overallStatus}`);
      console.log(`   Health Checks: ${health.healthChecks?.length || 0}`);
      
      if (health.healthChecks) {
        health.healthChecks.forEach((check, index) => {
          console.log(`   [${index}] ${check.service}: ${check.status} (${check.responseTime}ms)`);
        });
      }
      
      return health;
    } else {
      console.log('❌ System Health failed:', response.statusCode, response.body);
      return null;
    }
  } catch (error) {
    console.log('❌ System Health error:', error.message);
    return null;
  }
}

async function runFrontendApiTests() {
  console.log('🚀 Testing Frontend API Integration');
  console.log('===================================\n');

  try {
    // Test admin login
    const token = await testLogin();
    if (!token) {
      console.log('\n❌ Cannot proceed without authentication token');
      return;
    }

    console.log('');

    // Test system metrics (as frontend would call it)
    const metrics = await testSystemMetricsDetailed(token);
    console.log('');

    // Test system health (as frontend would call it)
    const health = await testSystemHealth(token);
    console.log('');

    // Summary
    console.log('📋 Frontend API Test Summary');
    console.log('============================');
    console.log(`✅ Login: ${token ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Metrics: ${metrics ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Health: ${health ? 'SUCCESS' : 'FAILED'}`);
    
    if (metrics && health) {
      console.log('\n🎯 Data Validation:');
      console.log(`   Uptime: ${metrics.uptime}s (${Math.floor(metrics.uptime / 3600)}h ${Math.floor((metrics.uptime % 3600) / 60)}m)`);
      console.log(`   Health Status: ${health.overallStatus}`);
      console.log(`   Services: ${health.healthChecks?.length || 0}`);
      console.log(`   Time Series Points: ${metrics.responseTime?.length || 0}`);
    }

  } catch (error) {
    console.log('❌ Test suite error:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  runFrontendApiTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runFrontendApiTests };