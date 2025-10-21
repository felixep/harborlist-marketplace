#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:4566',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  }
});

const docClient = DynamoDBDocumentClient.from(client);

async function deleteListingBySlug(slug) {
  try {
    console.log(`🔍 Searching for listing with slug: ${slug}...`);
    
    // Scan for the listing with this slug
    const result = await docClient.send(new ScanCommand({
      TableName: 'HarborListListings',
      FilterExpression: 'slug = :slug',
      ExpressionAttributeValues: {
        ':slug': slug
      }
    }));

    if (!result.Items || result.Items.length === 0) {
      console.log('❌ No listing found with that slug');
      return;
    }

    const listing = result.Items[0];
    console.log(`✅ Found listing: ${listing.listingId}`);
    console.log(`   Title: ${listing.title}`);
    console.log(`   Status: ${listing.status}`);
    console.log(`   Owner: ${listing.ownerId}`);

    // Delete the listing
    await docClient.send(new DeleteCommand({
      TableName: 'HarborListListings',
      Key: {
        listingId: listing.listingId
      }
    }));

    console.log(`🗑️  Deleted listing: ${listing.listingId}`);
    console.log('');
    console.log('✅ Listing deleted successfully!');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   1. Go to: http://local.harborlist.com:3000');
    console.log('   2. Login as a regular user');
    console.log('   3. Create a new boat listing');
    console.log('   4. It will be created with status: "pending_review"');
    console.log('   5. Login as admin at: http://local.harborlist.com:3000/admin');
    console.log('   6. Go to Content Moderation to see your new listing!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

const slug = process.argv[2] || '2021-key-west';
deleteListingBySlug(slug);
