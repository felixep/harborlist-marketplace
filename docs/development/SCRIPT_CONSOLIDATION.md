# Script Consolidation - Backend to Tools Migration

## Overview

All development and operations scripts have been consolidated from `backend/scripts/` into the `tools/` directory structure for better organization and maintainability.

## Changes Made

### Scripts Moved

#### 1. Database Setup Script
- **From**: `backend/scripts/setup-local-db.sh` (514 lines, comprehensive)
- **To**: `tools/development/setup-local-dynamodb.sh`
- **Replaced**: Previous simpler version (133 lines)
- **Reason**: The backend version was more complete with proper GSI definitions

#### 2. Admin User Creation
- **From**: `backend/scripts/create-admin-user.ts`
- **To**: `tools/operations/create-admin-user.ts`
- **Type**: TypeScript script
- **Usage**: Creates admin users in Cognito Staff User Pool

#### 3. Admin Setup Helper
- **From**: `backend/scripts/setup-local-admin.sh`
- **To**: `tools/operations/setup-local-admin.sh`
- **Purpose**: Wrapper script for admin user creation

### Directory Structure

```
tools/
├── development/          # Development setup scripts
│   ├── setup-local-cognito.sh
│   ├── setup-local-dynamodb.sh    ← Moved from backend/scripts/setup-local-db.sh
│   ├── setup-s3-buckets.sh
│   ├── query-local-users.sh
│   ├── test-customer-auth.sh
│   ├── test-dual-auth.sh
│   └── ...
│
├── operations/          # Operational scripts
│   ├── create-admin-user.sh      # Bash wrapper
│   ├── create-admin-user.ts      ← Moved from backend/scripts/
│   ├── setup-local-admin.sh      ← Moved from backend/scripts/
│   └── ...
│
└── deployment/         # Deployment scripts
    ├── deploy.sh
    ├── cleanup.sh
    └── ...

backend/
└── scripts/            # ⚠️ DEPRECATED - Scripts moved to tools/
    ├── create-admin-user.ts    # → tools/operations/
    ├── setup-local-admin.sh    # → tools/operations/
    └── setup-local-db.sh       # → tools/development/setup-local-dynamodb.sh
```

## Benefits

### 1. **Centralized Script Management**
All scripts are now in one location (`tools/`) making them easier to find and maintain.

### 2. **Clear Separation of Concerns**
- `tools/development/` - Local development setup
- `tools/operations/` - Operational tasks (user management, etc.)
- `tools/deployment/` - Deployment automation

### 3. **Consistency**
No more confusion about whether to use `backend/scripts/setup-local-db.sh` or `tools/development/setup-local-dynamodb.sh` - there's only one version now.

### 4. **Better Docker Integration**
Docker Compose containers can mount just the `tools/` directory instead of multiple directories:

```yaml
volumes:
  - ./tools:/tools
```

## Updated References

### Deploy Script
**File**: `tools/deployment/deploy.sh`

```bash
# OLD
"${PROJECT_ROOT}/backend/scripts/setup-local-db.sh"

# NEW
"${PROJECT_ROOT}/tools/development/setup-local-dynamodb.sh"
```

### Docker Compose
**File**: `docker-compose.local.yml`

All init containers now only need:
```yaml
volumes:
  - ./tools:/tools
```

## Migration Path for Existing Scripts

If you have custom scripts or documentation referencing the old paths:

### Database Setup
```bash
# OLD (deprecated)
./backend/scripts/setup-local-db.sh

# NEW
./tools/development/setup-local-dynamodb.sh
```

### Admin User Creation
```bash
# OLD (deprecated)
cd backend && npx ts-node scripts/create-admin-user.ts

# NEW - Use the wrapper script
./tools/operations/create-admin-user.sh --environment local --email admin@example.com

# OR - Direct TypeScript execution
cd backend && npx ts-node ../tools/operations/create-admin-user.ts
```

### Admin Setup
```bash
# OLD (deprecated)
./backend/scripts/setup-local-admin.sh

# NEW
./tools/operations/setup-local-admin.sh
```

## Cleanup

### Files to Remove (After Verification)

Once you've verified everything works with the new paths:

```bash
# Remove deprecated backend scripts directory
rm -rf backend/scripts/

# Remove old backup file
rm tools/development/setup-local-dynamodb.sh.old
```

⚠️ **Warning**: Only remove these after confirming your deployment works with the new paths!

## Testing

To verify the migration:

```bash
# 1. Clean deployment
./tools/deployment/cleanup.sh local --force

# 2. Deploy with new script paths
./tools/deployment/deploy.sh local

# 3. Verify database tables created
aws dynamodb list-tables --endpoint-url http://localhost:8000 --region us-east-1

# 4. Verify admin user creation works
./tools/operations/create-admin-user.sh \
  --environment local \
  --email test@example.com \
  --name "Test Admin" \
  --role super-admin
```

## Documentation Updates Needed

The following documentation files reference old paths and should be updated:

### Priority Updates
1. `docs/DEPLOYMENT_STATUS.md` - Line 8, 73
2. `tools/deployment/deploy.sh` - ✅ Already updated
3. `docker-compose.local.yml` - ✅ Already updated

### Secondary Updates
1. `docs/architecture/aws-health-monitoring-summary.md` - Line 201
2. `docs/deployment/local-development-implementation.md` - Line 20
3. `docs/troubleshooting/local-development.md` - Lines 18, 23, 208
4. `docs/DATABASE_SETUP_GSI_UPDATE.md` - Line 123
5. `docs/development/COGNITO_CONFIGURATION.md` - Line 265
6. `docs/tools/admin-user-creation-updates.md` - Line 30

## Version History

- **v1.0** (2025-10-17) - Initial consolidation
  - Moved database setup script from backend to tools
  - Moved admin user creation scripts to tools/operations
  - Updated deploy.sh references
  - Updated Docker Compose volume mounts

## Related Documentation

- [Cognito Deployment Flow](./COGNITO_DEPLOYMENT_FLOW.md)
- [Deployment Guide](../deployment/README.md)
- [Tools Directory README](../../tools/README.md)
