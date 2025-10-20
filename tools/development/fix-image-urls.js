#!/usr/bin/env node

/**
 * Fix Image URLs in Existing Listings
 * 
 * This script updates existing listings that have s3.local.harborlist.com URLs
 * to use localhost:4566 URLs for LocalStack compatibility.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

const LISTINGS_TABLE = 'harborlist-listings';

async function fixListingImageUrls() {
  console.log('🔍 Scanning for listings with incorrect image URLs...\n');

  try {
    // Scan all listings
    const scanResult = await docClient.send(new ScanCommand({
      TableName: LISTINGS_TABLE,
    }));

    const listings = scanResult.Items || [];
    console.log(`Found ${listings.length} total listings`);

    let updatedCount = 0;

    for (const listing of listings) {
      let needsUpdate = false;
      let updatedImages = listing.images || [];
      let updatedThumbnails = listing.thumbnails || [];

      // Check and fix image URLs
      if (listing.images && Array.isArray(listing.images)) {
        updatedImages = listing.images.map(url => {
          if (url.includes('s3.local.harborlist.com')) {
            needsUpdate = true;
            return url.replace('https://s3.local.harborlist.com/', 'http://localhost:4566/');
          }
          return url;
        });
      }

      // Check and fix thumbnail URLs
      if (listing.thumbnails && Array.isArray(listing.thumbnails)) {
        updatedThumbnails = listing.thumbnails.map(url => {
          if (url.includes('s3.local.harborlist.com')) {
            needsUpdate = true;
            return url.replace('https://s3.local.harborlist.com/', 'http://localhost:4566/');
          }
          return url;
        });
      }

      if (needsUpdate) {
        console.log(`\n📝 Updating listing: ${listing.listingId} - "${listing.title}"`);
        console.log(`   Images: ${updatedImages.length}, Thumbnails: ${updatedThumbnails.length}`);

        await docClient.send(new UpdateCommand({
          TableName: LISTINGS_TABLE,
          Key: { listingId: listing.listingId },
          UpdateExpression: 'SET images = :images, thumbnails = :thumbnails, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':images': updatedImages,
            ':thumbnails': updatedThumbnails,
            ':updatedAt': Date.now(),
          },
        }));

        updatedCount++;
        console.log('   ✅ Updated successfully');
      }
    }

    console.log(`\n✨ Migration complete!`);
    console.log(`   Updated ${updatedCount} listing(s)`);
    console.log(`   ${listings.length - updatedCount} listing(s) were already correct`);

  } catch (error) {
    console.error('❌ Error fixing image URLs:', error);
    process.exit(1);
  }
}

// Run the migration
fixListingImageUrls();
