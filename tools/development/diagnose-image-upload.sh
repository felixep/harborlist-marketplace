#!/bin/bash

# Image Upload Diagnostic Script
# This script helps diagnose issues with image uploads in the local development environment

set -e

echo "========================================"
echo "HarborList Image Upload Diagnostic Tool"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running
echo "1. Checking Docker Services..."
echo "----------------------------------------"

BACKEND_STATUS=$(docker inspect -f '{{.State.Status}}' harborlist-app-backend 2>/dev/null || echo "not_found")
LOCALSTACK_STATUS=$(docker inspect -f '{{.State.Status}}' harborlist-infrastructure-localstack 2>/dev/null || echo "not_found")
TRAEFIK_STATUS=$(docker inspect -f '{{.State.Status}}' harborlist-app-traefik 2>/dev/null || echo "not_found")

if [ "$BACKEND_STATUS" == "running" ]; then
  echo -e "${GREEN}✓${NC} Backend is running"
else
  echo -e "${RED}✗${NC} Backend is not running (Status: $BACKEND_STATUS)"
fi

if [ "$LOCALSTACK_STATUS" == "running" ]; then
  echo -e "${GREEN}✓${NC} LocalStack is running"
else
  echo -e "${RED}✗${NC} LocalStack is not running (Status: $LOCALSTACK_STATUS)"
fi

if [ "$TRAEFIK_STATUS" == "running" ]; then
  echo -e "${GREEN}✓${NC} Traefik is running"
else
  echo -e "${RED}✗${NC} Traefik is not running (Status: $TRAEFIK_STATUS)"
fi

echo ""

# Check S3 buckets
echo "2. Checking S3 Buckets..."
echo "----------------------------------------"

MEDIA_BUCKET="harborlist-media-local"
THUMBNAILS_BUCKET="harborlist-thumbnails-local"

if aws --endpoint-url=http://localhost:4566 s3 ls s3://$MEDIA_BUCKET 2>/dev/null; then
  FILE_COUNT=$(aws --endpoint-url=http://localhost:4566 s3 ls s3://$MEDIA_BUCKET --recursive 2>/dev/null | wc -l | tr -d ' ')
  echo -e "${GREEN}✓${NC} Media bucket exists ($FILE_COUNT files)"
else
  echo -e "${RED}✗${NC} Media bucket does not exist"
fi

if aws --endpoint-url=http://localhost:4566 s3 ls s3://$THUMBNAILS_BUCKET 2>/dev/null; then
  THUMB_COUNT=$(aws --endpoint-url=http://localhost:4566 s3 ls s3://$THUMBNAILS_BUCKET --recursive 2>/dev/null | wc -l | tr -d ' ')
  echo -e "${GREEN}✓${NC} Thumbnails bucket exists ($THUMB_COUNT files)"
else
  echo -e "${RED}✗${NC} Thumbnails bucket does not exist"
fi

echo ""

# Check /etc/hosts entries
echo "3. Checking /etc/hosts Configuration..."
echo "----------------------------------------"

REQUIRED_HOSTS=(
  "local.harborlist.com"
  "local-api.harborlist.com"
  "s3.local.harborlist.com"
  "traefik.local.harborlist.com"
)

for host in "${REQUIRED_HOSTS[@]}"; do
  if grep -q "$host" /etc/hosts 2>/dev/null; then
    echo -e "${GREEN}✓${NC} $host is in /etc/hosts"
  else
    echo -e "${RED}✗${NC} $host is MISSING from /etc/hosts"
    echo -e "   ${YELLOW}Add this line to /etc/hosts:${NC} 127.0.0.1 $host"
  fi
done

echo ""

# Check Traefik routes
echo "4. Checking Traefik Routes..."
echo "----------------------------------------"

if curl -k -s https://traefik.local.harborlist.com/api/http/routers 2>/dev/null | grep -q "s3-https"; then
  echo -e "${GREEN}✓${NC} S3 HTTPS route is configured in Traefik"
else
  echo -e "${YELLOW}⚠${NC}  S3 HTTPS route not found in Traefik (may need restart)"
fi

if curl -k -s https://traefik.local.harborlist.com/api/http/routers 2>/dev/null | grep -q "backend-https"; then
  echo -e "${GREEN}✓${NC} Backend HTTPS route is configured in Traefik"
else
  echo -e "${YELLOW}⚠${NC}  Backend HTTPS route not found in Traefik"
fi

echo ""

# Test S3 access
echo "5. Testing S3 Access..."
echo "----------------------------------------"

# Test direct LocalStack access
if curl -s http://localhost:4566/_localstack/health | grep -q '"s3": "available"'; then
  echo -e "${GREEN}✓${NC} LocalStack S3 service is available (direct)"
else
  echo -e "${RED}✗${NC} LocalStack S3 service is not responding"
fi

# Test S3 through Traefik
if curl -k -s -o /dev/null -w "%{http_code}" https://s3.local.harborlist.com/$MEDIA_BUCKET/ 2>/dev/null | grep -q "200\|404"; then
  echo -e "${GREEN}✓${NC} S3 is accessible through Traefik (s3.local.harborlist.com)"
else
  CODE=$(curl -k -s -o /dev/null -w "%{http_code}" https://s3.local.harborlist.com/$MEDIA_BUCKET/ 2>/dev/null)
  echo -e "${RED}✗${NC} S3 is NOT accessible through Traefik (HTTP $CODE)"
fi

echo ""

# Check recent uploads
echo "6. Recent Uploads..."
echo "----------------------------------------"

echo "Recent files in media bucket:"
aws --endpoint-url=http://localhost:4566 s3 ls s3://$MEDIA_BUCKET --recursive 2>/dev/null | tail -n 5 || echo "No files found"

echo ""

# Summary and recommendations
echo "========================================"
echo "Summary and Recommendations"
echo "========================================"
echo ""

# Count issues
ISSUES=0

if [ "$BACKEND_STATUS" != "running" ]; then ((ISSUES++)); fi
if [ "$LOCALSTACK_STATUS" != "running" ]; then ((ISSUES++)); fi
if [ "$TRAEFIK_STATUS" != "running" ]; then ((ISSUES++)); fi

if [ $ISSUES -eq 0 ]; then
  echo -e "${GREEN}✓ All services are running${NC}"
else
  echo -e "${RED}✗ $ISSUES service(s) are not running${NC}"
  echo ""
  echo "To start services:"
  echo "  docker-compose -f docker-compose.infrastructure.yml up -d"
  echo "  docker-compose -f docker-compose.application.yml up -d"
fi

# Check for missing hosts entries
MISSING_HOSTS=0
for host in "${REQUIRED_HOSTS[@]}"; do
  if ! grep -q "$host" /etc/hosts 2>/dev/null; then
    ((MISSING_HOSTS++))
  fi
done

if [ $MISSING_HOSTS -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}⚠  Missing /etc/hosts entries${NC}"
  echo ""
  echo "Run this command to add required hosts:"
  echo "----------------------------------------"
  echo "sudo sh -c 'echo \"\" >> /etc/hosts && echo \"# HarborList Local Development\" >> /etc/hosts && echo \"127.0.0.1 local.harborlist.com local-api.harborlist.com s3.local.harborlist.com traefik.local.harborlist.com\" >> /etc/hosts'"
fi

echo ""
echo "To test image upload manually:"
echo "----------------------------------------"
echo "1. Open https://local.harborlist.com in your browser"
echo "2. Create a new listing and upload images"
echo "3. Check browser console for any errors"
echo "4. Verify images appear in the listing"
echo ""
echo "To view uploaded files:"
echo "  aws --endpoint-url=http://localhost:4566 s3 ls s3://$MEDIA_BUCKET --recursive"
echo ""
echo "To check backend logs:"
echo "  docker logs harborlist-app-backend --tail=50 -f"
echo ""
