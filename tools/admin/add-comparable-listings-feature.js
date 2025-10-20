#!/usr/bin/env node
/**
 * Add Comparable Listings Feature to Premium Tiers
 * 
 * This script updates all premium tiers in the database to include
 * the "comparable_listings" feature.
 * 
 * Usage:
 *   node tools/admin/add-comparable-listings-feature.js
 * 
 * Environment:
 *   AWS_ENDPOINT_URL - DynamoDB endpoint (default: http://localhost:8000)
 *   AWS_REGION - AWS region (default: us-east-1)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const TIERS_TABLE = 'harborlist-user-tiers';
const ENDPOINT_URL = process.env.AWS_ENDPOINT_URL || 'http://localhost:8000';
const REGION = process.env.AWS_REGION || 'us-east-1';

// Configure DynamoDB client
const client = new DynamoDBClient({
  endpoint: ENDPOINT_URL,
  region: REGION,
});

const docClient = DynamoDBDocumentClient.from(client);

const comparableListingsFeature = {
  featureId: 'comparable_listings',
  name: 'Market Comparables',
  description: 'See similar boats on the market with real-time pricing comparisons to stay competitive',
  enabled: true,
  limits: {
    maxComparables: 5
  }
};

async function addFeatureToPremiumTiers() {
  console.log('🔍 Searching for premium tiers...\n');
  
  try {
    // Scan for all premium tiers
    const scanResult = await docClient.send(new ScanCommand({
      TableName: TIERS_TABLE,
      FilterExpression: 'isPremium = :premium',
      ExpressionAttributeValues: {
        ':premium': true
      }
    }));

    const premiumTiers = scanResult.Items || [];
    console.log(`📊 Found ${premiumTiers.length} premium tier(s)\n`);

    if (premiumTiers.length === 0) {
      console.log('⚠️  No premium tiers found. You may need to create premium tiers first.');
      console.log('\nTo create a premium tier, use the admin UI or run:');
      console.log('  node tools/admin/create-default-tiers.js\n');
      return;
    }

    // Update each premium tier
    let updated = 0;
    let skipped = 0;

    for (const tier of premiumTiers) {
      const features = tier.features || [];
      
      // Check if feature already exists
      const hasFeature = features.some(f => f.featureId === 'comparable_listings');
      
      if (!hasFeature) {
        features.push(comparableListingsFeature);
        
        await docClient.send(new UpdateCommand({
          TableName: TIERS_TABLE,
          Key: { tierId: tier.tierId },
          UpdateExpression: 'SET features = :features, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':features': features,
            ':updatedAt': new Date().toISOString()
          }
        }));
        
        console.log(`✅ Added comparable_listings to: ${tier.name} (${tier.tierId})`);
        updated++;
      } else {
        console.log(`⏭️  Skipped (already has feature): ${tier.name}`);
        skipped++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✨ Update Complete!`);
    console.log(`   Updated: ${updated} tier(s)`);
    console.log(`   Skipped: ${skipped} tier(s)`);
    console.log('='.repeat(60) + '\n');

    // Show summary of features
    if (updated > 0) {
      console.log('📋 Feature Details:');
      console.log(`   ID: ${comparableListingsFeature.featureId}`);
      console.log(`   Name: ${comparableListingsFeature.name}`);
      console.log(`   Max Comparables: ${comparableListingsFeature.limits.maxComparables}`);
      console.log('\n✅ Premium users can now access Market Comparables!\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error updating tiers:', error);
    console.error('\nTroubleshooting:');
    console.error('  1. Check that DynamoDB is running');
    console.error('  2. Verify table name: ' + TIERS_TABLE);
    console.error('  3. Check endpoint: ' + ENDPOINT_URL);
    process.exit(1);
  }
}

// Run the script
console.log('🚀 Comparable Listings Feature Installer\n');
console.log(`📍 DynamoDB Endpoint: ${ENDPOINT_URL}`);
console.log(`🌎 Region: ${REGION}`);
console.log(`📋 Table: ${TIERS_TABLE}\n`);

addFeatureToPremiumTiers();
