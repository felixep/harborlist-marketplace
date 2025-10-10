# Media Infrastructure Integration

## Overview

This document describes the integration of S3 bucket management into the HarborList deployment and cleanup scripts for comprehensive media handling infrastructure.

## Changes Made

### 1. Deployment Script Integration (`tools/deployment/deploy.sh`)

**Added S3 bucket setup to local deployment:**
- Integrated S3 bucket creation after database setup
- Added error handling with graceful degradation
- Updated access information to include LocalStack S3 endpoint
- Maintains deployment flow even if S3 setup fails

**Key Changes:**
```bash
# Set up S3 buckets for media storage
print_step "Setting up S3 buckets for media storage..."
if [[ -f "${PROJECT_ROOT}/tools/development/setup-s3-buckets.sh" ]]; then
    "${PROJECT_ROOT}/tools/development/setup-s3-buckets.sh"
    if [[ $? -eq 0 ]]; then
        print_success "S3 buckets configured successfully"
    else
        print_warning "S3 bucket setup encountered issues, but deployment will continue"
        print_info "You can run it manually: ./tools/development/setup-s3-buckets.sh"
    fi
else
    print_warning "S3 bucket setup script not found. Media uploads may not work."
    print_info "Run: ./tools/development/setup-s3-buckets.sh"
fi
```

### 2. Cleanup Script Integration (`tools/deployment/cleanup.sh`)

**Added S3 bucket cleanup for local environment:**
- New `cleanup_local_s3_buckets()` function
- Handles both `awslocal` and `aws --endpoint-url` commands
- Graceful handling when LocalStack is not running
- Complete bucket emptying and deletion

**Key Features:**
- Checks if LocalStack container is running
- Uses appropriate AWS CLI variant (awslocal or aws with endpoint)
- Empties and deletes both media and thumbnails buckets
- Error handling with silent failures for non-existent buckets

## Integration Flow

### Deployment Flow
1. SSL certificate setup
2. Docker services startup
3. Database table setup
4. **S3 bucket setup** ← NEW
5. Admin user creation
6. Access information display

### Cleanup Flow
1. Container shutdown
2. Volume and network cleanup
3. SSL certificate handling
4. Data directory cleanup
5. **S3 bucket cleanup** ← NEW
6. Docker system cleanup

## Environment Variables

The following environment variables are used for S3 bucket configuration:

```yaml
# In docker-compose.local.yml
environment:
  MEDIA_BUCKET: harborlist-media-local
  THUMBNAILS_BUCKET: harborlist-thumbnails-local
```

## S3 Buckets Created

- **harborlist-media-local**: Original uploaded media files
- **harborlist-thumbnails-local**: Generated thumbnail images

## Benefits

1. **Complete Infrastructure Setup**: Single command deployment includes all media infrastructure
2. **Environment Awareness**: Different bucket names for local vs AWS environments
3. **Graceful Degradation**: Deployment continues even if S3 setup fails
4. **Complete Cleanup**: Cleanup script removes all traces including S3 data
5. **Developer Experience**: Clear error messages and manual recovery instructions

## Usage

### Deploy with Media Infrastructure
```bash
./tools/deployment/deploy.sh local
```

### Clean Up Everything (Including S3)
```bash
./tools/deployment/cleanup.sh local
```

### Manual S3 Setup (if needed)
```bash
./tools/development/setup-s3-buckets.sh
```

## Error Handling

- **Missing S3 setup script**: Warning with manual instructions
- **S3 setup failure**: Warning but deployment continues
- **LocalStack not running**: Skip S3 cleanup gracefully
- **Missing awslocal**: Fallback to aws with endpoint URL

## Future Considerations

- AWS environment S3 bucket management (dev/staging/prod)
- S3 bucket versioning and lifecycle policies
- Cross-region replication for production
- Media CDN integration