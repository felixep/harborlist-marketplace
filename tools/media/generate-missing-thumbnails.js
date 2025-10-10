#!/usr/bin/env node

/**
 * Manual thumbnail generation script for local development
 * 
 * This script addresses the issue where S3 events don't trigger automatic
 * thumbnail generation in LocalStack. It processes all images in the media
 * bucket and generates missing thumbnails.
 * 
 * Usage:
 *   node tools/media/generate-missing-thumbnails.js
 * 
 * Environment Variables:
 *   - S3_ENDPOINT: LocalStack S3 endpoint (default: http://localhost:4566)
 *   - MEDIA_BUCKET: Source bucket with original images
 *   - THUMBNAILS_BUCKET: Destination bucket for thumbnails
 */

const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

// Configuration
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:4566';
const MEDIA_BUCKET = process.env.MEDIA_BUCKET || 'harborlist-media-local';
const THUMBNAILS_BUCKET = process.env.THUMBNAILS_BUCKET || 'harborlist-thumbnails-local';

// S3 Client configuration for LocalStack
const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});

/**
 * Convert a readable stream to Buffer
 */
async function streamToBuffer(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Generate thumbnails for a single image
 */
async function generateThumbnails(bucket, key) {
  console.log(`Processing image: ${key}`);
  
  try {
    // Download the original image
    const getObjectResponse = await s3Client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }));

    if (!getObjectResponse.Body) {
      throw new Error('No image data found');
    }

    const imageBuffer = await streamToBuffer(getObjectResponse.Body);
    
    // Define thumbnail sizes
    const thumbnailSizes = [
      { width: 150, height: 150, suffix: '_thumb_150' },
      { width: 300, height: 300, suffix: '_thumb_300' },
      { width: 600, height: 400, suffix: '_thumb_600' },
    ];

    // Generate each thumbnail size
    for (const size of thumbnailSizes) {
      const thumbnail = await sharp(imageBuffer)
        .resize(size.width, size.height, {
          fit: 'cover',
          position: 'center',
          withoutEnlargement: false,
        })
        .jpeg({ 
          quality: 85,
          progressive: true,
        })
        .toBuffer();

      const thumbnailKey = key.replace(/\.[^/.]+$/, `${size.suffix}.jpg`);
      
      await s3Client.send(new PutObjectCommand({
        Bucket: THUMBNAILS_BUCKET,
        Key: thumbnailKey,
        Body: thumbnail,
        ContentType: 'image/jpeg',
        Metadata: {
          'original-key': key,
          'thumbnail-size': `${size.width}x${size.height}`,
          'processing-date': new Date().toISOString(),
        },
      }));
      
      console.log(`  ✓ Generated ${size.width}x${size.height} thumbnail: ${thumbnailKey}`);
    }

    console.log(`  ✅ Successfully processed: ${key}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Failed to process ${key}:`, error.message);
    return false;
  }
}

/**
 * Main function to process all images
 */
async function main() {
  console.log('🖼️  Starting thumbnail generation for missing thumbnails...\n');
  console.log(`Source bucket: ${MEDIA_BUCKET}`);
  console.log(`Destination bucket: ${THUMBNAILS_BUCKET}`);
  console.log(`S3 Endpoint: ${S3_ENDPOINT}\n`);

  try {
    // List all objects in the media bucket
    const listResponse = await s3Client.send(new ListObjectsV2Command({
      Bucket: MEDIA_BUCKET,
    }));

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log('No images found in media bucket.');
      return;
    }

    console.log(`Found ${listResponse.Contents.length} objects in media bucket\n`);

    let processed = 0;
    let failed = 0;

    // Process each image
    for (const object of listResponse.Contents) {
      const key = object.Key;
      
      // Skip non-image files and already processed files
      if (!key || !key.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        console.log(`Skipping non-image file: ${key}`);
        continue;
      }

      const success = await generateThumbnails(MEDIA_BUCKET, key);
      if (success) {
        processed++;
      } else {
        failed++;
      }
    }

    console.log('\n📊 Processing Summary:');
    console.log(`✅ Successfully processed: ${processed} images`);
    console.log(`❌ Failed to process: ${failed} images`);
    console.log('🎉 Thumbnail generation complete!');

  } catch (error) {
    console.error('❌ Error during thumbnail generation:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateThumbnails, main };