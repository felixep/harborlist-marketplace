#!/usr/bin/env node

/**
 * API Configuration Verification Script
 * 
 * This script verifies that the API domain is properly configured
 * and working as expected.
 */

const https = require('https');

const CONFIG = {
  apiDomain: 'https://api-dev.harborlist.com',
  apiGateway: 'https://cgrvwa10s3.execute-api.us-east-1.amazonaws.com/prod',
  regionalDomain: 'https://d-0fbbiy9nsg.execute-api.us-east-1.amazonaws.com',
  timeout: 10000
};

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: CONFIG.timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
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

async function verifyConfiguration() {
  console.log('🔍 Verifying API Configuration...\n');
  
  // Test 1: Direct API Gateway
  console.log('1. Testing Direct API Gateway...');
  try {
    const response = await makeRequest(`${CONFIG.apiGateway}/health`);
    if (response.statusCode === 403) {
      console.log('   ✅ API Gateway working correctly (403 - requires auth)');
    } else {
      console.log(`   ⚠️  API Gateway returned unexpected status: ${response.statusCode}`);
    }
  } catch (error) {
    console.log(`   ❌ API Gateway failed: ${error.message}`);
    return false;
  }
  
  // Test 2: API Domain through Cloudflare
  console.log('\n2. Testing API Domain through Cloudflare...');
  try {
    const response = await makeRequest(`${CONFIG.apiDomain}/health`);
    if (response.statusCode === 403) {
      console.log('   ✅ API Domain working correctly (403 - requires auth)');
      console.log('   ✅ Cloudflare configuration is correct!');
      return true;
    } else if (response.statusCode === 530) {
      console.log('   ❌ API Domain returning 530 (Origin Error)');
      console.log('   📋 Origin URL needs to be updated in Cloudflare');
      return false;
    } else if (response.statusCode === 525) {
      console.log('   ❌ API Domain returning 525 (SSL Handshake Failed)');
      console.log('   📋 SSL/TLS mode needs to be set to "Full" or "Full (strict)" in Cloudflare');
      return false;
    } else {
      console.log(`   ⚠️  API Domain returned unexpected status: ${response.statusCode}`);
      console.log('   📋 Check cloudflare-api-configuration.md for troubleshooting');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ API Domain failed: ${error.message}`);
    return false;
  }
}

async function main() {
  const success = await verifyConfiguration();
  
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('🎉 API Configuration is working correctly!');
    console.log('✅ All tests passed');
  } else {
    console.log('❌ API Configuration needs attention');
    console.log('📋 Please check cloudflare-api-configuration.md for setup instructions');
  }
  console.log('='.repeat(60));
  
  process.exit(success ? 0 : 1);
}

main().catch(console.error);