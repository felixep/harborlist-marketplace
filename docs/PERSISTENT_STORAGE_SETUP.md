# Persistent Storage Configuration

## Overview

HarborList has been configured to use **persistent storage** for DynamoDB Local instead of in-memory storage. This means your data (users, listings, sessions, etc.) will survive container restarts and system reboots.

## What Changed

### Before (In-Memory Storage)
```yaml
dynamodb-local:
  command: [ "-jar", "DynamoDBLocal.jar", "-inMemory", "-sharedDb" ]
```
- ❌ Data lost on container restart
- ❌ Data lost on system reboot
- ❌ Need to recreate test data frequently

### After (Persistent Storage)
```yaml
dynamodb-local:
  volumes:
    - dynamodb_data:/home/dynamodblocal/data
  working_dir: /home/dynamodblocal
  user: root
  command: [ "-jar", "DynamoDBLocal.jar", "-sharedDb", "-dbPath", "./data" ]
```
- ✅ Data persists across container restarts
- ✅ Data persists across system reboots
- ✅ Test data (users, listings) maintained
- ✅ Docker volume manages the data

## Docker Volume

The persistent data is stored in a Docker volume named `dynamodb_data`:

```yaml
volumes:
  dynamodb_data:
    driver: local
```

### Volume Location
- **Mac/Windows**: Docker Desktop manages the volume
- **Linux**: Typically `/var/lib/docker/volumes/harborlist-marketplace_dynamodb_data`

### Managing the Volume

**View volume info:**
```bash
docker volume inspect harborlist-marketplace_dynamodb_data
```

**Backup the volume:**
```bash
docker run --rm -v harborlist-marketplace_dynamodb_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/dynamodb-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
```

**Restore from backup:**
```bash
docker run --rm -v harborlist-marketplace_dynamodb_data:/data -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/dynamodb-backup-YYYYMMDD-HHMMSS.tar.gz"
```

**Clear all data (start fresh):**
```bash
docker-compose -f docker-compose.local.yml down
docker volume rm harborlist-marketplace_dynamodb_data
docker-compose -f docker-compose.local.yml up -d
cd backend/scripts && bash setup-local-db.sh
```

## Database Tables

All 20 DynamoDB tables are created with proper schemas and indexes:

### Core Tables
- `harborlist-users` - User accounts with email-index GSI
- `harborlist-listings` - Boat listings with SlugIndex, OwnerIndex, StatusIndex GSIs
- `harborlist-sessions` - User sessions with user-index GSI
- `harborlist-admin-sessions` - Admin sessions with user-index GSI
- `harborlist-login-attempts` - Login attempt tracking
- `harborlist-audit-logs` - Audit trail
- `harborlist-reviews` - Listing reviews

### Enhanced Feature Tables
- `harborlist-engines` - Engine details with ListingIndex GSI
- `harborlist-billing-accounts` - Billing information
- `harborlist-transactions` - Payment transactions
- `harborlist-finance-calculations` - Finance calculations
- `harborlist-moderation-queue` - Content moderation queue
- `harborlist-user-groups` - User group assignments

### Admin Tables
- `harborlist-platform-settings` - Platform configuration
- `harborlist-settings-audit` - Settings change history
- `harborlist-support-tickets` - Support tickets with user-index, status-index GSIs
- `harborlist-support-responses` - Support responses
- `harborlist-support-templates` - Support email templates
- `harborlist-announcements` - Platform announcements with status-index GSI
- `harborlist-analytics` - Analytics data

## Setup Process

### Initial Setup (Already Done)
The setup script has already been run. All tables are created and ready to use.

### If You Need to Recreate Tables
```bash
cd backend/scripts
bash setup-local-db.sh
```

This script:
1. ✅ Waits for DynamoDB to be ready
2. ✅ Creates all 20 tables with proper schemas
3. ✅ Creates Global Secondary Indexes (GSIs) where needed
4. ✅ Sets up S3 buckets in LocalStack
5. ✅ Verifies everything was created successfully

## Benefits of Persistent Storage

### 1. **Data Consistency**
- Listings you create stay in the database
- User accounts persist between sessions
- No need to recreate test data

### 2. **Development Efficiency**
- Test workflows that depend on existing data
- Debug issues with consistent state
- Faster development iteration

### 3. **Testing Scenarios**
- Test moderation workflows with pending listings
- Verify user permissions across sessions
- Test data relationships and integrity

### 4. **Production Parity**
- Closer to production behavior
- Test data migrations
- Validate backup/restore procedures

## Important Notes

### Data Persistence Scope
✅ **Persists Across:**
- Container restarts
- System reboots
- Docker Compose down/up

❌ **Does NOT Persist:**
- When volume is explicitly deleted
- When docker volume prune is run
- When volume is corrupted

### When Data is Lost
You'll need to recreate data if:
1. You run `docker volume rm harborlist-marketplace_dynamodb_data`
2. You run `docker volume prune` (removes unused volumes)
3. You delete the volume manually

### Recovery After Data Loss
```bash
# 1. Recreate tables
cd backend/scripts
bash setup-local-db.sh

# 2. Recreate test data (if you have a script)
cd backend
npm run seed-data  # If available

# 3. Or restore from backup
docker run --rm -v harborlist-marketplace_dynamodb_data:/data \
  -v $(pwd):/backup alpine sh -c \
  "cd /data && tar xzf /backup/your-backup.tar.gz"
```

## Monitoring Storage

### Check Database Size
```bash
docker exec harborlist-marketplace-dynamodb-local-1 du -sh /home/dynamodblocal/data
```

### View Table Statistics
```bash
# Using DynamoDB Admin UI
open http://localhost:8001

# Using AWS CLI
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
  aws dynamodb describe-table \
  --table-name harborlist-listings \
  --endpoint-url http://localhost:8000 \
  --region us-east-1
```

### Count Items in Table
```bash
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
  aws dynamodb scan \
  --table-name harborlist-listings \
  --select COUNT \
  --endpoint-url http://localhost:8000 \
  --region us-east-1
```

## LocalStack Persistence

LocalStack also has persistence enabled:

```yaml
localstack:
  environment:
    - PERSISTENCE=1
    - DATA_DIR=/var/lib/localstack
  volumes:
    - localstack_data:/var/lib/localstack
```

This means:
- ✅ S3 buckets and objects persist
- ✅ Cognito user pools persist
- ✅ SES configuration persists

## Troubleshooting

### Issue: "unable to open database file"
**Symptom:** DynamoDB logs show SQLite errors

**Solution:**
```bash
# Recreate with proper permissions
cd /Users/felixparedes/Documents/Projects/harborlist-marketplace
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml up -d --force-recreate dynamodb-local
```

### Issue: Tables not found
**Symptom:** Backend errors about missing tables

**Solution:**
```bash
cd backend/scripts
bash setup-local-db.sh
```

### Issue: Data corruption
**Symptom:** Unexpected errors when reading/writing data

**Solution:**
```bash
# Backup first (if possible)
docker run --rm -v harborlist-marketplace_dynamodb_data:/data \
  -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz -C /data .

# Remove and recreate
docker-compose -f docker-compose.local.yml down
docker volume rm harborlist-marketplace_dynamodb_data
docker-compose -f docker-compose.local.yml up -d
cd backend/scripts && bash setup-local-db.sh
```

### Issue: Volume full
**Symptom:** Docker volume running out of space

**Solution:**
```bash
# Check volume size
docker system df -v

# Clean up unused resources
docker system prune -a --volumes

# Or selectively remove old data
```

## Best Practices

### 1. **Regular Backups**
Create periodic backups of important test data:
```bash
# Daily backup script
docker run --rm -v harborlist-marketplace_dynamodb_data:/data \
  -v ~/backups:/backup alpine tar czf \
  /backup/dynamodb-$(date +%Y%m%d).tar.gz -C /data .
```

### 2. **Seed Data Scripts**
Maintain scripts to recreate common test scenarios:
```bash
# Example: Create test listings, users, etc.
cd backend
npm run seed-test-data
```

### 3. **Data Snapshots**
Before major changes, create a snapshot:
```bash
# Before making changes
docker run --rm -v harborlist-marketplace_dynamodb_data:/data \
  -v $(pwd):/backup alpine tar czf \
  /backup/before-changes.tar.gz -C /data .

# If changes break something, restore
docker run --rm -v harborlist-marketplace_dynamodb_data:/data \
  -v $(pwd):/backup alpine sh -c \
  "rm -rf /data/* && cd /data && tar xzf /backup/before-changes.tar.gz"
```

### 4. **Monitor Size**
Keep an eye on storage growth:
```bash
# Add to monitoring script
docker exec harborlist-marketplace-dynamodb-local-1 \
  du -sh /home/dynamodblocal/data
```

## Current Status

✅ **Configured:** Persistent storage enabled  
✅ **Tables Created:** All 20 tables with proper schemas  
✅ **GSIs Created:** All required Global Secondary Indexes  
✅ **S3 Buckets:** LocalStack buckets created  
✅ **Backend Connected:** Backend using persistent database  

## Next Steps

1. **Create Test Data**
   - Create admin user: `admin@harborlist.local`
   - Create test customer accounts
   - Create sample listings

2. **Test Persistence**
   ```bash
   # Restart containers
   docker-compose -f docker-compose.local.yml restart
   
   # Verify data still exists
   # Login, check listings, etc.
   ```

3. **Set Up Backups** (Optional)
   - Create backup script
   - Schedule periodic backups
   - Test restore process

## Summary

Your HarborList development environment now uses **persistent storage** for DynamoDB. This means:

- 🎉 Data survives restarts
- 🎉 Faster development workflow
- 🎉 More reliable testing
- 🎉 Production-like behavior

The data is stored in Docker volume `harborlist-marketplace_dynamodb_data` and will persist until explicitly deleted.

---

**Updated:** October 15, 2025  
**Status:** Active and Working ✅
