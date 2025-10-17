#!/usr/bin/env node

/**
 * Manual thumbnail generation script for existing images
 * This script downloads existing images from S3 and generates thumbnails
 */

const AWS = require('aws-sdk');
const sharp = require('sharp');
const fetch = require('node-fetch');

// Configure AWS SDK for LocalStack
const s3 = new AWS.S3({
  endpoint: 'http://localhost:4566',
  accessKeyId: 'test',
  secretAccessKey: 'test',
  region: 'us-east-1',
  s3ForcePathStyle: true
});

const MEDIA_BUCKET = 'harborlist-media-local';
const THUMBNAILS_BUCKET = 'harborlist-thumbnails-local';

async function generateThumbnails() {
  try {
    console.log('🔍 Listing objects in media bucket...');
    
    // List all objects in the media bucket
    const objects = await s3.listObjectsV2({
      Bucket: MEDIA_BUCKET
    }).promise();

    console.log(`📸 Found ${objects.Contents.length} images to process`);

    for (const object of objects.Contents) {
      const key = object.Key;
      console.log(`\n🖼️  Processing: ${key}`);

      try {
        // Download the image
        const imageData = await s3.getObject({
          Bucket: MEDIA_BUCKET,
          Key: key
        }).promise();

        if (!imageData.Body) {
          console.log(`❌ No image data found for ${key}`);
          continue;
        }

        // Generate thumbnail
        const thumbnailBuffer = await sharp(imageData.Body)
          .resize(300, 300, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 85 })
          .toBuffer();

        // Upload thumbnail
        const thumbnailKey = `${key}_thumb.jpg`;
        await s3.putObject({
          Bucket: THUMBNAILS_BUCKET,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: 'image/jpeg',
          Metadata: {
            'original-key': key,
            'generated-date': new Date().toISOString()
          }
        }).promise();

        console.log(`✅ Generated thumbnail: ${thumbnailKey}`);

      } catch (error) {
        console.error(`❌ Failed to process ${key}:`, error.message);
      }
    }

    console.log('\n🎉 Thumbnail generation complete!');

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
generateThumbnails();