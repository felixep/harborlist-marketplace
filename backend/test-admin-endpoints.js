#!/usr/bin/env node

/**
 * Simple test script to verify admin endpoints are working
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.API_URL || 'https://local-api.harborlist.com';
const TEST_TOKEN = process.env.TEST_ADMIN_TOKEN || 'test-token';

const endpoints = [
  '/api/admin/test',
  '/api/admin/health',
  '/api/admin/dashboard/metrics',
  '/api/admin/system/health',
  '/api/admin/system/alerts?status=active',
  '/api/admin/system/errors?timeRange=1h&limit=10',
  '/api/admin/listings/flagged',
  '/api/admin/moderation/queue',
  '/api/admin/moderation/stats'
];

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, BASE_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      // For local development with self-signed certificates
      rejectUnauthorized: false
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          endpoint,
          status: res.statusCode,
          success: res.statusCode < 400,
          data: data.length > 0 ? JSON.parse(data) : null
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        endpoint,
        status: 0,
        success: false,
        error: error.message
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        endpoint,
        status: 0,
        success: false,
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing admin endpoints...\n');
  
  const results = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${endpoint} - ${result.status} ${result.error || ''}`);
  }
  
  console.log('\nSummary:');
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  console.log(`${successful}/${total} endpoints working`);
  
  if (successful < total) {
    console.log('\nFailed endpoints:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`- ${r.endpoint}: ${r.error || `HTTP ${r.status}`}`);
    });
  }
}

runTests().catch(console.error);