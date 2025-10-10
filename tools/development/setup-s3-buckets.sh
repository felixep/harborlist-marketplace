#!/bin/bash

# LocalStack S3 Bucket Setup Script
# Creates necessary S3 buckets for local development

set -e

echo "Setting up LocalStack S3 buckets..."

# LocalStack endpoint
LOCALSTACK_ENDPOINT="http://localhost:4566"

# Bucket names (should match docker-compose.local.yml)
MEDIA_BUCKET="harborlist-media-local"
THUMBNAILS_BUCKET="harborlist-thumbnails-local"

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
until curl -s "${LOCALSTACK_ENDPOINT}/health" >/dev/null 2>&1; do
  echo "LocalStack not ready yet, waiting..."
  sleep 2
done

echo "LocalStack is ready!"

# Function to create bucket
create_bucket() {
  local bucket_name=$1
  echo "Creating bucket: ${bucket_name}"
  
  aws --endpoint-url="${LOCALSTACK_ENDPOINT}" s3 mb "s3://${bucket_name}" 2>/dev/null || {
    echo "Bucket ${bucket_name} might already exist, checking..."
    if aws --endpoint-url="${LOCALSTACK_ENDPOINT}" s3 ls "s3://${bucket_name}" >/dev/null 2>&1; then
      echo "Bucket ${bucket_name} already exists"
    else
      echo "Failed to create or access bucket ${bucket_name}"
      exit 1
    fi
  }
  
  # Set bucket policy for public read access (local development only)
  echo "Setting public read policy for ${bucket_name}..."
  aws --endpoint-url="${LOCALSTACK_ENDPOINT}" s3api put-bucket-policy \
    --bucket "${bucket_name}" \
    --policy '{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "PublicReadGetObject",
          "Effect": "Allow",
          "Principal": "*",
          "Action": "s3:GetObject",
          "Resource": "arn:aws:s3:::'"${bucket_name}"'/*"
        }
      ]
    }' 2>/dev/null || echo "Note: Could not set bucket policy (this is usually fine for local development)"
}

# Set AWS credentials for LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1

# Create buckets
create_bucket "${MEDIA_BUCKET}"
create_bucket "${THUMBNAILS_BUCKET}"

echo ""
echo "✅ LocalStack S3 setup complete!"
echo ""
echo "Buckets created:"
echo "  - ${MEDIA_BUCKET} (for original media files)"
echo "  - ${THUMBNAILS_BUCKET} (for processed thumbnails)"
echo ""
echo "You can verify the buckets exist by running:"
echo "  aws --endpoint-url=${LOCALSTACK_ENDPOINT} s3 ls"
echo ""