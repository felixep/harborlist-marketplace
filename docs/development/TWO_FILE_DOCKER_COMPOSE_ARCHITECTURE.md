# Two-File Docker Compose Architecture

## Overview

HarborList now uses a **two-file Docker Compose architecture** to solve the environment variable timing issue that was causing 401 Unauthorized authentication errors.

## The Problem

Previously, when using a single `docker-compose.local.yml`:

1. Docker Compose reads `.env.local` when you run `docker-compose up`
2. The `init-cognito` container starts and updates `.env.local` with Pool IDs
3. **BUT** the backend containers already have their environment variables "baked in" from step 1
4. Result: Backend starts with **empty Cognito Pool IDs**, causing 401 errors

```
Single-file flow (BROKEN):
┌─────────────────────────────────────────────────────────────┐
│ docker-compose up                                            │
│   ↓                                                          │
│ Read .env.local (Pool IDs = empty)                          │
│   ↓                                                          │
│ Start ALL containers with empty Pool IDs                    │
│   ├─ init-cognito: Updates .env.local ✓                     │
│   └─ backend: Already running with empty Pool IDs ✗         │
└─────────────────────────────────────────────────────────────┘
```

## The Solution

Split into two files orchestrated sequentially:

### File 1: `docker-compose.infrastructure.yml`
Contains services that **create** the infrastructure:
- `dynamodb-local`: DynamoDB database
- `localstack`: AWS emulation (Cognito, S3, SES)
- `localstack-init`: Sets up S3 buckets and DynamoDB tables
- `init-cognito`: **Creates Cognito pools and updates .env.local**
- `dynamodb-admin`: DynamoDB admin UI

### File 2: `docker-compose.application.yml`
Contains services that **consume** the infrastructure:
- `traefik`: Reverse proxy
- `frontend`: React/Vite frontend
- `backend`: Express API server
- `billing-service`: Payment processing
- `finance-service`: Financial calculations
- `smtp4dev`: Email testing
- `redis`: Caching

## How It Works

```
Two-file flow (CORRECT):
┌─────────────────────────────────────────────────────────────┐
│ Step 1: docker-compose -f infrastructure.yml up -d          │
│   ↓                                                          │
│ Start infrastructure services                               │
│   ├─ localstack starts                                      │
│   ├─ localstack-init creates buckets/tables                 │
│   └─ init-cognito creates pools → updates .env.local ✓      │
│                                                              │
│ Step 2: Wait for init-cognito to exit successfully          │
│   ↓                                                          │
│ init-cognito completed, .env.local now has Pool IDs ✓       │
│                                                              │
│ Step 3: docker-compose -f application.yml up -d             │
│   ↓                                                          │
│ Read .env.local (Pool IDs = POPULATED) ✓                    │
│   ↓                                                          │
│ Start application services with correct Pool IDs ✓          │
│   ├─ backend: CUSTOMER_USER_POOL_ID=us-east-1_abc123 ✓     │
│   ├─ backend: STAFF_USER_POOL_ID=us-east-1_xyz789 ✓        │
│   ├─ billing-service: Has correct Pool IDs ✓               │
│   └─ finance-service: Has correct Pool IDs ✓               │
└─────────────────────────────────────────────────────────────┘
```

## Network Sharing

Both compose files share a common Docker network:

**Infrastructure file creates it:**
```yaml
networks:
  harborlist-local-network:
    driver: bridge
    name: harborlist-local-network
```

**Application file uses it:**
```yaml
networks:
  harborlist-local:
    external: true
    name: harborlist-local-network
```

## Container Naming

To avoid confusion, containers are prefixed differently:

- **Infrastructure containers:** `harborlist-infrastructure-*`
  - `harborlist-infrastructure-dynamodb`
  - `harborlist-infrastructure-localstack`
  - `harborlist-infrastructure-init`
  - `harborlist-infrastructure-cognito`
  - `harborlist-infrastructure-dynamodb-admin`

- **Application containers:** `harborlist-app-*`
  - `harborlist-app-traefik`
  - `harborlist-app-frontend`
  - `harborlist-app-backend`
  - `harborlist-app-billing`
  - `harborlist-app-finance`
  - `harborlist-app-smtp`
  - `harborlist-app-redis`

## Deployment Script

The `tools/deployment/deploy.sh` script orchestrates both files:

```bash
# Step 1: Start infrastructure
docker-compose -f docker-compose.infrastructure.yml up -d

# Step 2: Wait for init-cognito to complete
wait_for_container "harborlist-infrastructure-cognito"

# Step 3: Verify Pool IDs in .env.local
source .env.local
if [[ -z "$CUSTOMER_USER_POOL_ID" ]]; then
  echo "ERROR: Pool IDs not set"
  exit 1
fi

# Step 4: Start application (reads updated .env.local)
docker-compose -f docker-compose.application.yml up -d

# Step 5: Wait for backend health
wait_for_backend_health

# Step 6: Create admin user
create_default_admin_user
```

## Cleanup Script

The `tools/deployment/cleanup.sh` handles both files:

```bash
# Stop application first
docker-compose -f docker-compose.application.yml down --remove-orphans

# Then stop infrastructure
docker-compose -f docker-compose.infrastructure.yml down --remove-orphans

# Clean up volumes and networks
docker volume prune -f
docker network prune -f
```

## Usage

### Deployment
```bash
./tools/deployment/deploy.sh local
```

The script automatically:
1. Starts infrastructure services
2. Waits for initialization
3. Verifies Cognito Pool IDs
4. Starts application services
5. Creates admin user

### Cleanup
```bash
./tools/deployment/cleanup.sh local
```

### Manual Commands

**View logs from both:**
```bash
docker-compose -f docker-compose.infrastructure.yml -f docker-compose.application.yml logs -f
```

**View infrastructure logs:**
```bash
docker-compose -f docker-compose.infrastructure.yml logs -f
```

**View application logs:**
```bash
docker-compose -f docker-compose.application.yml logs -f
```

**View specific service:**
```bash
docker logs -f harborlist-app-backend
docker logs -f harborlist-infrastructure-cognito
```

**Stop everything:**
```bash
docker-compose -f docker-compose.application.yml down
docker-compose -f docker-compose.infrastructure.yml down
```

**Restart just application:**
```bash
docker-compose -f docker-compose.application.yml down
docker-compose -f docker-compose.application.yml up -d
```

## Why This Fixes 401 Errors

The two-file architecture ensures:

1. ✅ **Infrastructure completes first**: Cognito pools are created before application starts
2. ✅ **.env.local updated before read**: Pool IDs are written before backend reads them
3. ✅ **No stale environment variables**: Application containers never start with empty Pool IDs
4. ✅ **Proper initialization order**: Database → AWS services → Cognito setup → Application
5. ✅ **Clean separation of concerns**: Infrastructure and application are independent units

## Migration from Single File

The old `docker-compose.local.yml` is **preserved** for backward compatibility, but the deployment script now uses the two-file architecture by default.

To migrate:
1. Run cleanup: `./tools/deployment/cleanup.sh local`
2. Run new deployment: `./tools/deployment/deploy.sh local`
3. Verify authentication works at `https://local-api.harborlist.com`

## Troubleshooting

### Infrastructure fails to start
```bash
# Check infrastructure logs
docker-compose -f docker-compose.infrastructure.yml logs

# Check specific container
docker logs harborlist-infrastructure-cognito
```

### Application has wrong Pool IDs
```bash
# 1. Check .env.local
cat .env.local | grep USER_POOL_ID

# 2. Check backend container environment
docker exec harborlist-app-backend env | grep USER_POOL_ID

# If they don't match, recreate application:
docker-compose -f docker-compose.application.yml down
docker-compose -f docker-compose.application.yml up -d
```

### Init container stuck
```bash
# Check status
docker inspect harborlist-infrastructure-cognito | jq '.[0].State'

# View logs
docker logs harborlist-infrastructure-cognito

# If stuck, restart infrastructure
docker-compose -f docker-compose.infrastructure.yml down
docker-compose -f docker-compose.infrastructure.yml up -d
```

## Benefits

1. **Solves 401 errors**: Proper timing ensures correct Pool IDs
2. **Better separation**: Infrastructure and application are independent
3. **Easier debugging**: Can restart application without rebuilding infrastructure
4. **Faster iteration**: Changes to application don't require infrastructure restart
5. **Production-like**: Mirrors real deployment where infrastructure exists first

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Infrastructure Layer                     │
│  docker-compose.infrastructure.yml                           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  DynamoDB    │  │  LocalStack  │  │ DynamoDB     │      │
│  │  Local       │  │  (Cognito,   │  │ Admin        │      │
│  │              │  │   S3, SES)   │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ localstack-  │  │ init-cognito │                        │
│  │ init         │→ │ (updates     │                        │
│  │ (S3, tables) │  │ .env.local)  │                        │
│  └──────────────┘  └──────────────┘                        │
│                           ↓                                 │
│                    .env.local updated                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    Wait for completion
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  docker-compose.application.yml                              │
│                                                              │
│  Reads .env.local with correct Pool IDs                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Traefik    │  │   Frontend   │  │   Backend    │      │
│  │ (Reverse     │  │   (Vite)     │  │  (Express)   │      │
│  │  Proxy)      │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Billing    │  │   Finance    │  │   SMTP4Dev   │      │
│  │   Service    │  │   Service    │  │   + Redis    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  All services have correct Cognito Pool IDs ✓               │
└─────────────────────────────────────────────────────────────┘
```

## Conclusion

The two-file Docker Compose architecture is the **definitive solution** to the 401 authentication errors. By separating infrastructure initialization from application deployment, we ensure that Cognito Pool IDs are always available before the backend services start.

This architecture is:
- ✅ **Reliable**: No more timing issues
- ✅ **Maintainable**: Clear separation of concerns
- ✅ **Debuggable**: Easy to isolate issues
- ✅ **Production-like**: Infrastructure-first approach
- ✅ **Developer-friendly**: Fast iteration on application code
