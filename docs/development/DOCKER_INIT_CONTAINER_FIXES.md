# Docker Compose Init Container Fixes

## Issues Resolved

### Issue 1: Script Not Found (Exit 127)
**Error**: `sh: /tools/development/setup-s3-buckets.sh: not found`

**Root Cause**: Scripts use `#!/bin/bash` but Alpine Linux only includes `sh` by default

**Fix**:
1. Install `bash` in the Alpine container
2. Execute scripts explicitly with `bash` command

```yaml
apk add --no-cache curl aws-cli bash &&
# ...
bash /tools/development/setup-s3-buckets.sh &&
bash /tools/development/setup-local-dynamodb.sh
```

### Issue 2: DynamoDB Connection Timeout (Exit 1)
**Error**: `❌ Error: DynamoDB Local is not responding after 30 attempts`

**Root Cause**: 
- `setup-local-dynamodb.sh` was hardcoded to use `http://localhost:8000`
- Inside Docker container, it needs to use `http://dynamodb-local:8000`
- Script wasn't respecting `DYNAMODB_ENDPOINT` environment variable

**Fixes**:

1. **Updated script to respect environment variable**:
```bash
# Before
DYNAMODB_ENDPOINT="http://localhost:8000"

# After  
DYNAMODB_ENDPOINT="${DYNAMODB_ENDPOINT:-http://localhost:8000}"
```

2. **Added DYNAMODB_ENDPOINT to localstack-init environment**:
```yaml
environment:
  - DYNAMODB_ENDPOINT=http://dynamodb-local:8000
```

3. **Added dependency on dynamodb-local**:
```yaml
depends_on:
  - localstack
  - dynamodb-local
```

4. **Added health check wait for DynamoDB**:
```bash
echo 'Waiting for DynamoDB Local...' &&
until curl -s http://dynamodb-local:8000 > /dev/null 2>&1; do
  echo 'Waiting for DynamoDB Local service...'
  sleep 2
done &&
```

5. **Pass DYNAMODB_ENDPOINT when running the script**:
```bash
DYNAMODB_ENDPOINT=http://dynamodb-local:8000 bash /tools/development/setup-local-dynamodb.sh
```

## Updated Docker Compose Configuration

### localstack-init Container (Final)

```yaml
localstack-init:
  image: alpine:latest
  depends_on:
    - localstack
    - dynamodb-local
  volumes:
    - ./tools:/tools
  environment:
    - AWS_ACCESS_KEY_ID=test
    - AWS_SECRET_ACCESS_KEY=test
    - AWS_DEFAULT_REGION=us-east-1
    - DYNAMODB_ENDPOINT=http://dynamodb-local:8000
  networks:
    - harborlist-local
  command: >
    sh -c "
      apk add --no-cache curl aws-cli bash &&
      echo 'Waiting for LocalStack to be ready...' &&
      until curl -s http://localstack:4566/_localstack/health | grep -q '\"s3\": \"available\"'; do
        echo 'Waiting for LocalStack S3 service...'
        sleep 2
      done &&
      echo 'Waiting for Lambda service...' &&
      until curl -s http://localstack:4566/_localstack/health | grep -q '\"lambda\": \"available\"'; do
        echo 'Waiting for LocalStack Lambda service...'
        sleep 2
      done &&
      echo 'Waiting for DynamoDB Local...' &&
      until curl -s http://dynamodb-local:8000 > /dev/null 2>&1; do
        echo 'Waiting for DynamoDB Local service...'
        sleep 2
      done &&
      echo 'LocalStack and DynamoDB are ready. Running basic setup scripts...' &&
      chmod +x /tools/development/setup-s3-buckets.sh &&
      chmod +x /tools/development/setup-local-dynamodb.sh &&
      echo 'Setting up S3 buckets...' &&
      LOCALSTACK_ENDPOINT=http://localstack:4566 bash /tools/development/setup-s3-buckets.sh &&
      echo 'Setting up DynamoDB tables...' &&
      DYNAMODB_ENDPOINT=http://dynamodb-local:8000 LOCALSTACK_ENDPOINT=http://localstack:4566 bash /tools/development/setup-local-dynamodb.sh &&
      echo 'LocalStack initialization completed successfully!'
    "
```

## Files Modified

1. **docker-compose.local.yml**
   - Added `bash` to apk install
   - Added `dynamodb-local` to depends_on
   - Added `DYNAMODB_ENDPOINT` environment variable
   - Added DynamoDB health check wait
   - Explicitly call scripts with `bash`
   - Pass `DYNAMODB_ENDPOINT` to setup script

2. **tools/development/setup-local-dynamodb.sh**
   - Changed hardcoded endpoint to respect environment variable
   - `DYNAMODB_ENDPOINT="${DYNAMODB_ENDPOINT:-http://localhost:8000}"`

## Testing

To verify the fixes:

```bash
# 1. Clean deployment
./tools/deployment/cleanup.sh local --force

# 2. Deploy
./tools/deployment/deploy.sh local

# 3. Check init container logs
docker logs harborlist-marketplace-localstack-init-1

# Should show:
# ✅ LocalStack and DynamoDB are ready
# ✅ S3 buckets created
# ✅ DynamoDB tables created
# ✅ LocalStack initialization completed successfully!
```

## Key Learnings

### 1. Alpine Linux Considerations
- Alpine uses `sh`, not `bash` by default
- Scripts with `#!/bin/bash` need bash installed
- Explicitly call with `bash script.sh` for clarity

### 2. Docker Networking
- Services use service names as hostnames
- `localhost` inside a container refers to that container only
- Use service names: `http://dynamodb-local:8000`, `http://localstack:4566`

### 3. Environment Variables
- Always make scripts respect environment variables
- Use pattern: `VAR="${VAR:-default_value}"`
- Pass environment variables explicitly when needed

### 4. Init Container Dependencies
- Use `depends_on` to ensure services start in order
- Add health checks to wait for services to be ready
- Don't assume services are ready just because they started

## Related Documentation

- [Cognito Deployment Flow](./COGNITO_DEPLOYMENT_FLOW.md)
- [Script Consolidation](./SCRIPT_CONSOLIDATION.md)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## Version History

- **v1.0** (2025-10-17) - Fixed init container script execution and DynamoDB connection issues
