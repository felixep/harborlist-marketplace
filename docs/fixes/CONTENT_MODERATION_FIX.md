# Content Moderation Queue - Missing Listings Fix

## Issue Summary
Listings with `pending_moderation` status were not appearing in the Admin Portal's Content Moderation section.

## Root Cause
There was a **status field mismatch** between:
1. **Listing creation** - New listings are created with `status: 'pending_moderation'`
2. **Admin queries** - The Content Moderation API was only looking for `status: 'pending_review'`

Since these don't match, newly created pending listings were invisible to moderators in the Admin Portal.

## Status Field Architecture
Listings use two status fields:
- **`status`** (main field): `'active' | 'inactive' | 'sold' | 'pending_moderation' | 'flagged' | 'rejected'`
- **`moderationWorkflow.status`** (sub-field): `'pending_review' | 'approved' | 'rejected' | 'changes_requested'`

When a listing is created:
- `status` = `'pending_moderation'`
- `moderationWorkflow.status` = `'pending_review'`

## Changes Made

### 1. Fixed `handleGetFlaggedListings` Query
**File:** `backend/src/admin-service/index.ts` (line ~3095)

**Before:**
```typescript
const result = await docClient.send(new ScanCommand({
  TableName: LISTINGS_TABLE,
  FilterExpression: '#status IN (:pending, :flagged)',
  ExpressionAttributeNames: {
    '#status': 'status'
  },
  ExpressionAttributeValues: {
    ':pending': 'pending_review',  // ❌ This doesn't match created listings
    ':flagged': 'flagged'
  }
}));
```

**After:**
```typescript
const result = await docClient.send(new ScanCommand({
  TableName: LISTINGS_TABLE,
  FilterExpression: '#status IN (:pending_moderation, :pending_review, :flagged)',
  ExpressionAttributeNames: {
    '#status': 'status'
  },
  ExpressionAttributeValues: {
    ':pending_moderation': 'pending_moderation',  // ✅ Now includes this
    ':pending_review': 'pending_review',           // ✅ Keep for legacy
    ':flagged': 'flagged'
  }
}));
```

### 2. Fixed `handleGetModerationStats` Pending Count
**File:** `backend/src/admin-service/index.ts` (line ~3138)

**Before:**
```typescript
const pending = listings.filter((l: any) => l.status === 'pending_review').length;
```

**After:**
```typescript
const pending = listings.filter((l: any) => 
  l.status === 'pending_moderation' || l.status === 'pending_review'
).length;
```

### 3. Fixed `getRealListingsData` Analytics
**File:** `backend/src/admin-service/index.ts` (line ~1880)

**Before:**
```typescript
const pendingResult = await docClient.send(new ScanCommand({
  TableName: LISTINGS_TABLE,
  FilterExpression: 'moderationStatus = :pending',  // ❌ Wrong field
  ExpressionAttributeValues: {
    ':pending': 'pending'
  },
  Select: 'COUNT'
}));
```

**After:**
```typescript
const pendingResult = await docClient.send(new ScanCommand({
  TableName: LISTINGS_TABLE,
  FilterExpression: '#status IN (:pending_moderation, :pending_review)',  // ✅ Correct field
  ExpressionAttributeNames: {
    '#status': 'status'
  },
  ExpressionAttributeValues: {
    ':pending_moderation': 'pending_moderation',
    ':pending_review': 'pending_review'
  },
  Select: 'COUNT'
}));
```

## Testing Instructions

### 1. Create a Test Listing
```bash
# Login as a regular user
# Create a new boat listing through the frontend
# The listing should be created with status: 'pending_moderation'
```

### 2. Verify in Admin Portal
```bash
# Login as admin (admin@harborlist.local)
# Navigate to Admin Portal > Content Moderation
# You should now see the pending listing in the moderation queue
```

### 3. Check Statistics
```bash
# Verify the "Pending Review" count in the stats panel shows correct number
# The count should include all listings with:
#   - status: 'pending_moderation' 
#   - status: 'pending_review'
```

## API Endpoints Affected
- `GET /api/admin/listings/flagged` - Now returns all pending listings
- `GET /api/admin/moderation/stats` - Now counts pending listings correctly
- Dashboard analytics - Now shows accurate pending counts

## Deployment Notes
- **No database migration required** - Only query logic changed
- **Backward compatible** - Still supports legacy `pending_review` status
- **No frontend changes needed** - Backend fix only

## Related Files
- `backend/src/admin-service/index.ts` - Main fixes
- `backend/src/listing/index.ts` - Creates listings with `pending_moderation` status
- `packages/shared-types/src/common.ts` - Status type definitions

## Status Values Reference

### Main Status Field (`status`)
- `'active'` - Live listing visible to public
- `'inactive'` - Hidden by owner
- `'sold'` - Marked as sold
- `'pending_moderation'` - **Newly created, awaiting review**
- `'pending_review'` - Legacy status (still supported)
- `'flagged'` - Reported by users
- `'rejected'` - Rejected by moderator

### Moderation Workflow Status (`moderationWorkflow.status`)
- `'pending_review'` - Awaiting moderator action
- `'approved'` - Approved by moderator (becomes `status: 'active'`)
- `'rejected'` - Rejected by moderator
- `'changes_requested'` - Moderator requested changes

## Verification Checklist
- [ ] New listings appear in Content Moderation queue
- [ ] "Pending Review" count is accurate
- [ ] Can approve/reject listings from queue
- [ ] Stats dashboard shows correct numbers
- [ ] No TypeScript errors
- [ ] Backward compatibility maintained

## Fixed By
Date: 2025-10-20
Issue: Pending listings not showing in Admin Portal Content Moderation
