# DynamoDB GSI Index Reference

Complete reference of all Global Secondary Indexes (GSI) in the HarborList database schema.

## Table: harborlist-listings
**Primary Key:** `listingId` (HASH)

| Index Name | Hash Key | Range Key | Purpose |
|------------|----------|-----------|---------|
| `SlugIndex` | slug | - | SEO-friendly URL lookups (e.g., `/boats/2021-key-west-189fs`) |
| `OwnerIndex` | ownerId | - | Query all listings by owner, including pending/draft listings |
| `StatusIndex` | status | - | Filter listings by status (active, pending_moderation, sold, rejected, draft) |
| `TotalHorsepowerIndex` | totalHorsepower | - | Search boats by total horsepower range |
| `EngineConfigurationIndex` | engineConfiguration | - | Filter by engine configuration (single, twin, triple, quad) |

**Total GSIs:** 5

---

## Table: harborlist-users
**Primary Key:** `id` (HASH)

| Index Name | Hash Key | Range Key | Purpose |
|------------|----------|-----------|---------|
| `email-index` | email | - | User lookup by email address for authentication |
| `UserTypeIndex` | userType | - | Query users by type (individual, dealer, premium_individual, premium_dealer) |
| `PremiumExpirationIndex` | premiumActive | premiumExpiresAt | Find users with expiring premium memberships for renewal reminders |

**Total GSIs:** 3

---

## Table: harborlist-engines
**Primary Key:** `engineId` (HASH)

| Index Name | Hash Key | Range Key | Purpose |
|------------|----------|-----------|---------|
| `ListingIndex` | listingId | - | Retrieve all engines for a specific boat listing |

**Total GSIs:** 1

---

## Table: harborlist-moderation-queue
**Primary Key:** `id` (HASH)

| Index Name | Hash Key | Range Key | Purpose |
|------------|----------|-----------|---------|
| `StatusIndex` | status | submittedAt | Query pending/approved/rejected items, sorted by submission time |
| `PriorityIndex` | priority | submittedAt | Query by priority level (low, medium, high), sorted by submission time |

**Total GSIs:** 2

---

## Table: harborlist-sessions
**Primary Key:** `sessionId` (HASH)

| Index Name | Hash Key | Range Key | Purpose |
|------------|----------|-----------|---------|
| `user-index` | userId | - | Find all active sessions for a user (logout all devices) |

**Total GSIs:** 1

---

## Table: harborlist-admin-sessions
**Primary Key:** `sessionId` (HASH)

| Index Name | Hash Key | Range Key | Purpose |
|------------|----------|-----------|---------|
| `user-index` | userId | - | Find all active admin sessions for a user |

**Total GSIs:** 1

---

## Table: harborlist-support-tickets
**Primary Key:** `id` (HASH), `createdAt` (RANGE)

| Index Name | Hash Key | Range Key | Purpose |
|------------|----------|-----------|---------|
| `user-index` | userId | createdAt | Find all tickets for a user, sorted by creation date |
| `status-index` | status | createdAt | Query tickets by status (open, in_progress, resolved), sorted by date |

**Total GSIs:** 2

---

## Table: harborlist-announcements
**Primary Key:** `id` (HASH), `createdAt` (RANGE)

| Index Name | Hash Key | Range Key | Purpose |
|------------|----------|-----------|---------|
| `status-index` | status | createdAt | Query announcements by status (draft, published, archived), sorted by date |

**Total GSIs:** 1

---

## Simple Tables (No GSIs)
These tables use only their primary key and don't require GSI indexes:

- `harborlist-login-attempts` - Primary Key: `id`
- `harborlist-audit-logs` - Primary Key: `id`
- `harborlist-reviews` - Primary Key: `id`
- `harborlist-analytics` - Primary Key: `id`
- `harborlist-billing-accounts` - Primary Key: `id`
- `harborlist-transactions` - Primary Key: `id`
- `harborlist-finance-calculations` - Primary Key: `id`
- `harborlist-user-groups` - Primary Key: `id`
- `harborlist-platform-settings` - Primary Key: `id`
- `harborlist-settings-audit` - Primary Key: `id`
- `harborlist-support-responses` - Primary Key: `id`
- `harborlist-support-templates` - Primary Key: `id`

---

## GSI Performance Notes

### Query vs Scan
- **With GSI:** `QueryCommand` - O(log n) complexity, fast and efficient
- **Without GSI:** `ScanCommand` - O(n) complexity, slow and expensive

### Capacity Units
All GSIs are provisioned with:
- **ReadCapacityUnits:** 5
- **WriteCapacityUnits:** 5

Adjust based on production load requirements.

### Projection Type
All GSIs use `ProjectionType: "ALL"` which includes all attributes. This:
- ✅ Eliminates need for additional table queries
- ✅ Simplifies code (single query gets all data)
- ❌ Increases storage costs
- ❌ Increases write costs (every attribute write updates index)

Consider `KEYS_ONLY` or `INCLUDE` projections for large tables with many attributes where only specific fields are queried.

---

## Verification Commands

Check all indexes for a table:
```bash
aws dynamodb describe-table \
  --table-name harborlist-listings \
  --endpoint-url http://localhost:8000 \
  --region us-east-1 \
  --query 'Table.GlobalSecondaryIndexes[*].[IndexName,IndexStatus]' \
  --output table
```

Check index status (must be ACTIVE to use):
```bash
aws dynamodb describe-table \
  --table-name harborlist-listings \
  --endpoint-url http://localhost:8000 \
  --region us-east-1 \
  --query 'Table.GlobalSecondaryIndexes[?IndexStatus!=`ACTIVE`]'
```

---

## Common Issues

### "Index not found" Error
**Cause:** Table created without GSI or GSI still building
**Solution:** Verify index exists and status is ACTIVE

### "ValidationException: Query condition missed key schema element"
**Cause:** Query using wrong key or attempting range query on hash-only index
**Solution:** Check GSI definition, ensure using correct hash and range keys

### Slow Queries Despite GSI
**Cause:** Not using GSI in query, falling back to scan
**Solution:** Ensure `IndexName` is specified in QueryCommand

---

## Total Index Count
- **Tables with GSIs:** 8
- **Total GSI indexes:** 16
- **Simple tables (no GSI):** 12

Last updated: January 2025
