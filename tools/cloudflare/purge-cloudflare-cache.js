#!/usr/bin/env node

/**
 * Cloudflare Cache Purge Script
 * 
 * This script purges the Cloudflare cache for our domains to ensure
 * fresh content is served during testing.
 */

const { execSync } = require('child_process');

const CONFIG = {
  zoneName: 'harborlist.com',
  domains: [
    'https://dev.harborlist.com',
    'https://api-dev.harborlist.com'
  ]
};

async function makeCloudflareRequest(endpoint, method = 'GET', data = null) {
  const baseUrl = 'https://api.cloudflare.com/client/v4';
  
  try {
    let curlCommand = `curl -s -X ${method} "${baseUrl}${endpoint}" \\
      -H "Authorization: Bearer $(wrangler auth token 2>/dev/null || echo 'INVALID')" \\
      -H "Content-Type: application/json"`;
    
    if (data) {
      curlCommand += ` -d '${JSON.stringify(data)}'`;
    }
    
    const result = execSync(curlCommand, { encoding: 'utf8' });
    return JSON.parse(result);
  } catch (error) {
    console.error('API request failed:', error.message);
    return null;
  }
}

async function getZoneId() {
  console.log(`🔍 Finding zone ID for ${CONFIG.zoneName}...`);
  
  const response = await makeCloudflareRequest('/zones');
  if (!response || !response.success) {
    console.error('❌ Failed to fetch zones');
    return null;
  }
  
  const zone = response.result.find(z => z.name === CONFIG.zoneName);
  if (!zone) {
    console.error(`❌ Zone ${CONFIG.zoneName} not found`);
    return null;
  }
  
  console.log(`✅ Found zone: ${zone.name} (${zone.id})`);
  return zone.id;
}

async function purgeCache(zoneId, urls = null) {
  console.log('🧹 Purging Cloudflare cache...');
  
  const purgeData = urls ? { files: urls } : { purge_everything: true };
  
  const response = await makeCloudflareRequest(`/zones/${zoneId}/purge_cache`, 'POST', purgeData);
  
  if (!response || !response.success) {
    console.error('❌ Failed to purge cache:', response?.errors || 'Unknown error');
    return false;
  }
  
  console.log('✅ Cache purged successfully');
  return true;
}

async function main() {
  console.log('🚀 Cloudflare Cache Purge\n');
  
  // Check authentication
  try {
    const result = execSync('wrangler whoami', { encoding: 'utf8' });
    if (!result.includes('You are logged in')) {
      console.log('❌ Please run "wrangler login" first');
      process.exit(1);
    }
    console.log('✅ Authenticated with Cloudflare');
  } catch (error) {
    console.log('❌ Not authenticated with Cloudflare');
    process.exit(1);
  }
  
  // Get zone ID
  const zoneId = await getZoneId();
  if (!zoneId) {
    process.exit(1);
  }
  
  // Purge specific URLs
  const urlsToPurge = [
    'https://dev.harborlist.com/',
    'https://dev.harborlist.com/search',
    'https://dev.harborlist.com/about',
    'https://api-dev.harborlist.com/health',
    'https://api-dev.harborlist.com/api/listings'
  ];
  
  const success = await purgeCache(zoneId, urlsToPurge);
  
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('✅ Cache purged successfully!');
    console.log('⏱️  Wait 30 seconds for propagation, then run tests');
    console.log('🧪 Test command: node comprehensive-dev-environment-test.js');
  } else {
    console.log('❌ Cache purge failed');
    console.log('💡 Try purging manually in Cloudflare Dashboard');
  }
  console.log('='.repeat(60));
}

main().catch(console.error);