# Cognito Configuration Management - Single Source of Truth

## Architecture Overview

This document explains how Cognito Pool IDs are managed across the HarborList application to ensure consistency and prevent authentication issues.

## Single Source of Truth: Environment Files

**The `.env` and `.env.local` files are the SINGLE SOURCE OF TRUTH** for Cognito Pool IDs.

All components read from these files:
- ✅ Backend services (`process.env.STAFF_USER_POOL_ID`, etc.)
- ✅ Docker Compose (`${STAFF_USER_POOL_ID}` injection)
- ✅ Setup scripts (read and validate against existing pools)
- ✅ Admin user creation scripts

## Configuration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    .env and .env.local                       │
│                  (SOURCE OF TRUTH)                           │
│                                                              │
│  CUSTOMER_USER_POOL_ID=us-east-1_xxxx                       │
│  CUSTOMER_USER_POOL_CLIENT_ID=xxxx                          │
│  STAFF_USER_POOL_ID=us-east-1_yyyy                          │
│  STAFF_USER_POOL_CLIENT_ID=yyyy                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Read by
                            ▼
        ┌───────────────────────────────────────┐
        │                                       │
        │    ┌─────────────────────┐            │
        │    │ Docker Compose      │            │
        │    │ (injects env vars)  │            │
        │    └──────────┬──────────┘            │
        │               │                       │
        │               ▼                       │
        │    ┌─────────────────────┐            │
        │    │ Backend Containers  │            │
        │    │ process.env.*       │            │
        │    └─────────────────────┘            │
        │                                       │
        │    ┌─────────────────────┐            │
        │    │ Setup Scripts       │            │
        │    │ (read & validate)   │            │
        │    └─────────────────────┘            │
        │                                       │
        │    ┌─────────────────────┐            │
        │    │ Admin Scripts       │            │
        │    │ (create users)      │            │
        │    └─────────────────────┘            │
        └───────────────────────────────────────┘
```

## Key Principles

### 1. Scripts READ, Don't WRITE

**WRONG (Old Behavior):**
```bash
# Script creates pools
create_user_pool
# Script writes to .env.local  ❌ BAD
echo "STAFF_USER_POOL_ID=$POOL_ID" > .env.local
```

**CORRECT (New Behavior):**
```bash
# Script reads from .env.local
POOL_ID=$(grep "STAFF_USER_POOL_ID=" .env.local | cut -d'=' -f2)
# Script checks if pool exists
if pool_exists $POOL_ID; then
    echo "Using existing pool: $POOL_ID"
else
    echo "Pool doesn't exist, creating new one..."
    create_user_pool
    echo "⚠️  Update .env.local with new Pool ID: $NEW_POOL_ID"
fi
```

### 2. Manual Configuration Updates

When Cognito Pools are created or recreated, use the dedicated update script:

```bash
./tools/development/update-cognito-config.sh
```

This script will:
1. Show current values from `.env.local`
2. Prompt for new values
3. Update both `.env` and `.env.local`
4. Remind you to restart containers

### 3. Environment Variables Backend Expects

The backend (`backend/src/auth-service/config.ts`) reads these environment variables:

```typescript
// Customer Pool
process.env.CUSTOMER_USER_POOL_ID
process.env.CUSTOMER_USER_POOL_CLIENT_ID

// Staff Pool
process.env.STAFF_USER_POOL_ID
process.env.STAFF_USER_POOL_CLIENT_ID

// LocalStack Configuration
process.env.COGNITO_ENDPOINT
process.env.IS_LOCALSTACK
process.env.AWS_REGION
```

### 4. Docker Compose Injection

Docker Compose (`docker-compose.local.yml`) injects these from `.env.local`:

```yaml
environment:
  - CUSTOMER_USER_POOL_ID=${CUSTOMER_USER_POOL_ID}
  - CUSTOMER_USER_POOL_CLIENT_ID=${CUSTOMER_USER_POOL_CLIENT_ID}
  - STAFF_USER_POOL_ID=${STAFF_USER_POOL_ID}
  - STAFF_USER_POOL_CLIENT_ID=${STAFF_USER_POOL_CLIENT_ID}
  - COGNITO_ENDPOINT=http://localstack:4566
  - IS_LOCALSTACK=true
```

## Common Workflows

### Initial Setup (Fresh Environment)

1. **Create Cognito Pools in LocalStack:**
   ```bash
   ./tools/development/setup-local-cognito.sh
   ```
   
2. **Note the Pool IDs displayed at the end**

3. **Update configuration files:**
   ```bash
   ./tools/development/update-cognito-config.sh
   ```
   Enter the Pool IDs from step 2

4. **Start/Restart containers:**
   ```bash
   docker-compose -f docker-compose.local.yml restart
   ```

### After Deployment Script (Pool Mismatch)

If the deployment script creates new pools but they don't match `.env.local`:

1. **Check deployment logs** for the new Pool IDs

2. **Update configuration:**
   ```bash
   ./tools/development/update-cognito-config.sh
   ```

3. **Restart containers:**
   ```bash
   docker-compose -f docker-compose.local.yml restart
   ```

### Reusing Existing Pools (Recommended)

1. **Ensure `.env.local` has correct Pool IDs**

2. **Run setup script** - it will detect and reuse existing pools:
   ```bash
   ./tools/development/setup-local-cognito.sh
   ```

3. **Verify match** - script will show if IDs match `.env.local`

4. **No container restart needed** if IDs match

### Creating Admin User

Always create admin users AFTER ensuring Pool IDs are synchronized:

```bash
# Verify Pool IDs match
docker exec harborlist-marketplace-backend-1 env | grep USER_POOL

# Create admin user
cd backend
npm run create-admin -- \
  --email admin@harborlist.local \
  --name "Admin User" \
  --role super-admin
```

## Troubleshooting

### Issue: 401 Unauthorized on Admin Login

**Cause:** Backend is looking for user in different User Pool than where user was created.

**Solution:**
1. Check backend container's Pool IDs:
   ```bash
   docker exec harborlist-marketplace-backend-1 env | grep USER_POOL
   ```

2. Check `.env.local` Pool IDs:
   ```bash
   grep USER_POOL .env.local
   ```

3. If they don't match, update `.env.local` and restart:
   ```bash
   ./tools/development/update-cognito-config.sh
   docker-compose -f docker-compose.local.yml restart
   ```

### Issue: Script Creates New Pools Every Time

**Cause:** Script can't find existing pools in LocalStack (pools were deleted/recreated).

**Solution:**
1. Let script create new pools
2. Note the new Pool IDs
3. Update configuration files:
   ```bash
   ./tools/development/update-cognito-config.sh
   ```
4. Restart containers

### Issue: Deployment Creates Different Pool IDs

**Cause:** Deployment script's LocalStack was reset or first-time setup.

**Solution:**
1. After deployment, check logs for new Pool IDs
2. Update configuration:
   ```bash
   ./tools/development/update-cognito-config.sh
   ```
3. Restart containers

## File Responsibilities

### `.env` and `.env.local`
- **Purpose:** Source of truth for all Cognito configuration
- **Modified by:** Manual editing or `update-cognito-config.sh`
- **Read by:** Docker Compose, all scripts
- **NEVER write to from:** setup-local-cognito.sh, deploy.sh

### `tools/development/setup-local-cognito.sh`
- **Purpose:** Create/verify Cognito pools in LocalStack
- **Reads from:** `.env.local` (to check existing pools)
- **Writes to:** Nothing (only creates pools in LocalStack)
- **Output:** Displays Pool IDs and whether they match `.env.local`

### `tools/development/update-cognito-config.sh`
- **Purpose:** Update `.env` and `.env.local` with new Pool IDs
- **Reads from:** `.env.local` (current values)
- **Writes to:** `.env` and `.env.local`
- **When to use:** After creating new pools or deployment

### `backend/scripts/create-admin-user.ts`
- **Purpose:** Create admin users in Cognito
- **Reads from:** `process.env.STAFF_USER_POOL_ID`, etc.
- **Writes to:** Cognito User Pool (creates users)
- **Prerequisite:** Pool IDs must be synchronized

### `tools/deployment/deploy.sh`
- **Purpose:** Full deployment including Cognito setup
- **Uses:** `setup-local-cognito.sh` internally
- **Output:** May create new pools, displays IDs
- **Post-deployment:** Update configuration if pools changed

## Best Practices

1. ✅ **Always check Pool ID match** before creating admin users
2. ✅ **Use update script** when Pool IDs change
3. ✅ **Restart containers** after updating `.env.local`
4. ✅ **Commit `.env.local`** if team shares LocalStack setup
5. ❌ **Never manually edit Pool IDs** in multiple places
6. ❌ **Never assume pools exist** without checking
7. ❌ **Never run scripts that write** to `.env.local` automatically

## Current Configuration (Example)

Your current `.env.local` should look like this:

```bash
# Customer User Pool
CUSTOMER_USER_POOL_ID=us-east-1_8861406589e44c78a8eb5aa342bb46ef
CUSTOMER_USER_POOL_CLIENT_ID=472rxypx8h89mzjrturcrsn628

# Staff User Pool
STAFF_USER_POOL_ID=us-east-1_8e6df0f000504776ac499fd690eadeaf
STAFF_USER_POOL_CLIENT_ID=zd9e8tsnh2kxg2b6plxznoz0o9

# LocalStack Configuration
AWS_REGION=us-east-1
COGNITO_ENDPOINT=http://localhost:4566
IS_LOCALSTACK=true
```

These IDs should match:
- What LocalStack has
- What Docker Compose injects
- What backend uses
- What admin user creation uses

## Migration from Old System

If you're migrating from the old system where scripts wrote to `.env.local`:

1. **Identify current working Pool IDs:**
   ```bash
   docker exec harborlist-marketplace-backend-1 env | grep USER_POOL
   ```

2. **Verify these pools exist in LocalStack:**
   ```bash
   docker exec harborlist-marketplace-localstack-1 \
     awslocal cognito-idp describe-user-pool \
     --user-pool-id <POOL_ID>
   ```

3. **Update `.env.local` manually** or use update script

4. **From now on, treat `.env.local` as source of truth**

## Summary

**Remember:** 
- 📄 `.env.local` and `.env` = Source of Truth
- 🔍 Scripts = Read and Validate
- ✏️ Manual Updates = Via update script only
- 🔄 Container Restart = After any configuration change
