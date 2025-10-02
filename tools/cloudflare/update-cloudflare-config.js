#!/usr/bin/env node

/**
 * Cloudflare Configuration Update Script
 * 
 * This script updates the Cloudflare Origin Rules for api-dev.harborlist.com
 * to point to the correct API Gateway with proper Host header override.
 */

const { execSync } = require('child_process');

const CONFIG = {
  zoneName: 'harborlist.com',
  subdomain: 'api-dev.harborlist.com',
  newOrigin: 'cgrvwa10s3.execute-api.us-east-1.amazonaws.com',
  oldOrigin: 'd-qf2473kfnl.execute-api.us-east-1.amazonaws.com'
};

async function getCloudflareToken() {
  try {
    // Try to get token from wrangler config
    const result = execSync('wrangler whoami', { encoding: 'utf8' });
    if (result.includes('You are logged in')) {
      console.log('✅ Authenticated with Cloudflare');
      return true;
    }
  } catch (error) {
    console.log('❌ Not authenticated with Cloudflare');
    return false;
  }
}

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

async function listOriginRules(zoneId) {
  console.log('🔍 Listing current Origin Rules...');
  
  const response = await makeCloudflareRequest(`/zones/${zoneId}/rulesets`);
  if (!response || !response.success) {
    console.error('❌ Failed to fetch rulesets');
    return [];
  }
  
  // Find origin rules ruleset
  const originRuleset = response.result.find(r => r.kind === 'zone' && r.phase === 'http_request_origin');
  if (!originRuleset) {
    console.log('ℹ️  No Origin Rules found');
    return [];
  }
  
  console.log(`✅ Found Origin Rules ruleset: ${originRuleset.id}`);
  
  // Get detailed rules
  const rulesResponse = await makeCloudflareRequest(`/zones/${zoneId}/rulesets/${originRuleset.id}`);
  if (!rulesResponse || !rulesResponse.success) {
    console.error('❌ Failed to fetch origin rules');
    return [];
  }
  
  return rulesResponse.result.rules || [];
}

async function updateOriginRule(zoneId, rules) {
  console.log('🔧 Looking for API domain rule...');
  
  // Find rule that matches our subdomain
  const apiRule = rules.find(rule => {
    return rule.expression && rule.expression.includes(CONFIG.subdomain);
  });
  
  if (!apiRule) {
    console.log('❌ No existing rule found for api-dev.harborlist.com');
    console.log('📋 Please create an Origin Rule manually in Cloudflare Dashboard');
    console.log('   Rule configuration:');
    console.log(`   - If: Hostname equals "${CONFIG.subdomain}"`);
    console.log(`   - Then: Override origin to "${CONFIG.newOrigin}"`);
    console.log(`   - And: Override Host header to "${CONFIG.newOrigin}"`);
    return false;
  }
  
  console.log(`✅ Found existing rule: ${apiRule.description || 'Unnamed rule'}`);
  console.log(`   Current expression: ${apiRule.expression}`);
  
  // Check current action
  if (apiRule.action_parameters && apiRule.action_parameters.origin) {
    console.log(`   Current origin: ${apiRule.action_parameters.origin.host || 'Not set'}`);
    console.log(`   Current host header: ${apiRule.action_parameters.host_header || 'Not set'}`);
  }
  
  // Update needed?
  const needsUpdate = !apiRule.action_parameters || 
                     apiRule.action_parameters.origin?.host !== CONFIG.newOrigin ||
                     apiRule.action_parameters.host_header !== CONFIG.newOrigin;
  
  if (!needsUpdate) {
    console.log('✅ Rule is already correctly configured!');
    return true;
  }
  
  console.log('🔧 Rule needs updating...');
  console.log('📋 Manual update required in Cloudflare Dashboard:');
  console.log(`   1. Go to Rules → Origin Rules`);
  console.log(`   2. Edit the rule for "${CONFIG.subdomain}"`);
  console.log(`   3. Set Origin to: "${CONFIG.newOrigin}"`);
  console.log(`   4. Set Host Header to: "${CONFIG.newOrigin}"`);
  
  return false;
}

async function main() {
  console.log('🚀 Cloudflare Configuration Update\n');
  
  // Check authentication
  const isAuthenticated = await getCloudflareToken();
  if (!isAuthenticated) {
    console.log('❌ Please run "wrangler login" first');
    process.exit(1);
  }
  
  // Get zone ID
  const zoneId = await getZoneId();
  if (!zoneId) {
    process.exit(1);
  }
  
  // List current rules
  const rules = await listOriginRules(zoneId);
  
  // Update rule
  const success = await updateOriginRule(zoneId, rules);
  
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('✅ Configuration is correct!');
    console.log('🧪 Run verification: node verify-api-configuration.js');
  } else {
    console.log('📋 Manual configuration required');
    console.log('📖 See cloudflare-api-configuration.md for detailed steps');
  }
  console.log('='.repeat(60));
}

main().catch(console.error);