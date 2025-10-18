# Database Setup Script GSI Update

## Overview
Updated the `setup-local-db.sh` script to include all Global Secondary Indexes (GSI) required by the application code. Previously, several tables were being created without their necessary GSIs, which would cause runtime errors when the code tried to query using those indexes.

## Changes Made

### 1. Users Table (`harborlist-users`)
**Added GSIs:**
- `UserTypeIndex` - Allows querying users by type (individual, dealer, premium_individual, premium_dealer)
- `PremiumExpirationIndex` - Composite key (premiumActive + premiumExpiresAt) for finding users with expiring memberships

**Usage in code:**
- `getUsersByType()` - Bulk operations, admin analytics, notifications
- `getUsersWithExpiringMemberships()` - Automatic renewal reminders and downgrade processing

**Attributes added:**
```bash
AttributeName=userType,AttributeType=S
AttributeName=premiumActive,AttributeType=S
AttributeName=premiumExpiresAt,AttributeType=N
```

### 2. Listings Table (`harborlist-listings`)
**Added GSIs:**
- `TotalHorsepowerIndex` - Allows searching boats by total horsepower
- `EngineConfigurationIndex` - Allows filtering by engine configuration (single, twin, triple, quad)

**Existing GSIs maintained:**
- `SlugIndex` - SEO-friendly URL lookups
- `OwnerIndex` - Owner's listing management
- `StatusIndex` - Moderation and status filtering

**Usage in code:**
- `getListingsByHorsepower()` - Search boats within horsepower range
- `getListingsByEngineConfiguration()` - Filter by engine configuration preference

**Attributes added:**
```bash
AttributeName=totalHorsepower,AttributeType=N
AttributeName=engineConfiguration,AttributeType=S
```

### 3. Engines Table (`harborlist-engines`)
**No changes needed** - Already had the correct `ListingIndex` GSI

### 4. Moderation Queue Table (`harborlist-moderation-queue`)
**No changes needed** - Recently updated to include `StatusIndex` and `PriorityIndex` GSIs

## Impact

### Before Update
- Tables created without GSIs would cause **QueryCommand** operations to fail at runtime
- Queries would fall back to inefficient **ScanCommand** operations (where implemented)
- Some features would completely fail with "Index not found" errors

### After Update
- All GSI-dependent queries work correctly
- Efficient query performance using indexes
- Consistent with production database schema

## Testing Recommendations

After running the updated script, verify all indexes are created:

```bash
# Check Users table indexes
aws dynamodb describe-table \
  --table-name harborlist-users \
  --endpoint-url http://localhost:8000 \
  --region us-east-1 \
  --query 'Table.GlobalSecondaryIndexes[*].IndexName'

# Expected output: ["email-index", "UserTypeIndex", "PremiumExpirationIndex"]

# Check Listings table indexes  
aws dynamodb describe-table \
  --table-name harborlist-listings \
  --endpoint-url http://localhost:8000 \
  --region us-east-1 \
  --query 'Table.GlobalSecondaryIndexes[*].IndexName'

# Expected output: ["SlugIndex", "OwnerIndex", "StatusIndex", "TotalHorsepowerIndex", "EngineConfigurationIndex"]
```

## Recreating Tables

If tables were already created without GSIs, you need to delete and recreate them:

```bash
# Delete existing table (WARNING: This will delete all data)
aws dynamodb delete-table \
  --table-name harborlist-users \
  --endpoint-url http://localhost:8000 \
  --region us-east-1

# Wait for deletion to complete, then run setup script
cd backend/scripts
./setup-local-db.sh
```

## Production Deployment

**Important:** These GSI changes must also be applied to production databases. GSIs cannot be added to existing DynamoDB tables in production without recreating them. Use one of these approaches:

1. **AWS CDK/CloudFormation** (Recommended):
   - Update table definitions in infrastructure code
   - Deploy with proper migration strategy

2. **Manual Migration**:
   - Export existing data
   - Delete old table
   - Create new table with GSIs
   - Import data back

3. **Blue-Green Deployment**:
   - Create new table with GSIs alongside old one
   - Dual-write to both tables during migration
   - Switch read traffic to new table
   - Decommission old table

## Related Files
- `/backend/scripts/setup-local-db.sh` - Updated script with all GSIs
- `/backend/src/shared/database.ts` - Database operations using these GSIs

## Date
Updated: January 2025
