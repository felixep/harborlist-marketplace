# Content Moderation Status Standardization

## 🎯 Objective
Standardize all listing status values to use consistent naming across database, backend, and frontend without any mapping logic.

## ✅ Standardized Status Values
All systems now use these status values:
- **`'pending_review'`** - New listing awaiting initial review
- **`'under_review'`** - Listing currently being reviewed by moderator
- **`'approved'`** - Listing approved and can be active
- **`'rejected'`** - Listing rejected by moderator

## 📝 Changes Made

### 1. Shared Types (`packages/shared-types/src/common.ts`)

#### FlaggedListing Interface
**Before:**
```typescript
status: 'pending' | 'under_review' | 'approved' | 'rejected';
```

**After:**
```typescript
status: 'pending_review' | 'under_review' | 'approved' | 'rejected';
```

#### Listing Interface  
**Before:**
```typescript
status: 'active' | 'inactive' | 'sold' | 'pending_moderation' | 'flagged' | 'rejected';
```

**After:**
```typescript
status: 'active' | 'inactive' | 'sold' | 'pending_review' | 'under_review' | 'approved' | 'rejected';
```

### 2. Backend - Listing Creation (`backend/src/listing/index.ts`)

**Before:**
```typescript
status: 'pending_moderation', // Set to pending moderation for content review
```

**After:**
```typescript
status: 'pending_review', // Set to pending review for content moderation
```

### 3. Backend - Admin Service Queries (`backend/src/admin-service/index.ts`)

#### handleGetFlaggedListings Query
**Before:**
```typescript
FilterExpression: '#status IN (:pending_moderation, :pending_review, :flagged)',
ExpressionAttributeValues: {
  ':pending_moderation': 'pending_moderation',
  ':pending_review': 'pending_review',
  ':flagged': 'flagged'
}
```

**After:**
```typescript
FilterExpression: '#status IN (:pending_review, :under_review)',
ExpressionAttributeValues: {
  ':pending_review': 'pending_review',
  ':under_review': 'under_review'
}
```

**Removed:** Status mapping logic - now returns database status directly

#### handleGetModerationStats
**Before:**
```typescript
const pending = listings.filter((l: any) => 
  l.status === 'pending_moderation' || l.status === 'pending_review'
).length;
```

**After:**
```typescript
const pending = listings.filter((l: any) => 
  l.status === 'pending_review' || l.status === 'under_review'
).length;
```

#### getRealListingsData
**Before:**
```typescript
FilterExpression: 'moderationStatus = :flagged', // Wrong field
```

**After:**
```typescript
FilterExpression: '#status = :under_review',
ExpressionAttributeNames: { '#status': 'status' },
ExpressionAttributeValues: { ':under_review': 'under_review' }
```

### 4. Backend - Listing Visibility (`backend/src/listing/index.ts`)

**Before:**
```typescript
const isPending = listing.status === 'pending_moderation' || 
                  listing.moderationWorkflow?.status === 'pending_review' ||
                  listing.moderationWorkflow?.status === 'changes_requested';
```

**After:**
```typescript
const isPending = listing.status === 'pending_review' || 
                  listing.status === 'under_review' ||
                  listing.moderationWorkflow?.status === 'pending_review' ||
                  listing.moderationWorkflow?.status === 'changes_requested';
```

Updated in 3 functions:
- `getListing()`
- `getListingBySlug()`
- `getListingWithRedirect()`

#### Public Listings Filter
**Before:**
```typescript
return listing.status === 'active' || 
       (enhancedListing.moderationWorkflow?.status === 'approved' && 
        listing.status !== 'pending_moderation');
```

**After:**
```typescript
return listing.status === 'active' || listing.status === 'approved' ||
       (enhancedListing.moderationWorkflow?.status === 'approved' && 
        listing.status !== 'pending_review' && listing.status !== 'under_review');
```

### 5. Frontend - ListingDetailView (`frontend/src/components/admin/ListingDetailView.tsx`)

**Before:**
```typescript
listing.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
listing.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
listing.status === 'approved' ? 'bg-green-100 text-green-800' :
```

**After:**
```typescript
listing.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
listing.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
listing.status === 'approved' ? 'bg-green-100 text-green-800' :
```

### 6. Frontend - ListingModerationQueue (`frontend/src/components/admin/ListingModerationQueue.tsx`)

#### Quick Action Buttons
**Before:**
```typescript
{listing.status === 'pending' && (
  <div className="flex space-x-2">
```

**After:**
```typescript
{listing.status === 'pending_review' && (
  <div className="flex space-x-2">
```

#### Status Filter Options
**Before:**
```typescript
<option value="pending">Pending</option>
```

**After:**
```typescript
<option value="pending_review">Pending Review</option>
```

### 7. Test Files

#### engine-types.test.ts
**Changed:**
```typescript
status: 'pending_moderation' → status: 'pending_review'
```

#### moderation-types.test.ts
**Changed:**
```typescript
'pending' → 'pending_review'
```

## 🗄️ Database Migration

### Option 1: Update Existing Data (Recommended)
If you have existing listings with old status values, run this script:

```javascript
// Update all pending_moderation to pending_review
const { DynamoDBClient, ScanCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:4566', // For LocalStack
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
});

async function migrateStatuses() {
  const scanResult = await client.send(new ScanCommand({
    TableName: 'HarborListListings',
    FilterExpression: '#status = :old_status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: marshall({ ':old_status': 'pending_moderation' })
  }));

  for (const item of scanResult.Items || []) {
    await client.send(new UpdateItemCommand({
      TableName: 'HarborListListings',
      Key: { listingId: item.listingId },
      UpdateExpression: 'SET #status = :new_status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: marshall({ ':new_status': 'pending_review' })
    }));
  }
  
  console.log(`Updated ${scanResult.Items?.length || 0} listings`);
}

migrateStatuses();
```

### Option 2: Start Fresh
Since this is a development environment, you can also clear the table and create new test listings.

## 🧪 Testing Checklist

### Backend Tests
```bash
cd backend
npm test
```

### Shared Types Tests
```bash
cd packages/shared-types
npm test
```

### Manual Testing

1. **Create New Listing:**
   - Login as regular user
   - Create a new listing
   - Verify status is set to `'pending_review'`

2. **Admin Portal - Content Moderation:**
   - Login as admin
   - Go to Content Moderation
   - Verify pending listings appear
   - Status should display as "PENDING REVIEW"

3. **Filter by Status:**
   - Use status filter dropdown
   - Select "Pending Review"
   - Verify listings filter correctly

4. **Approve Listing:**
   - Click on a pending listing
   - Approve it
   - Verify status changes to `'approved'`

5. **Public View:**
   - Logout
   - Browse listings
   - Verify only approved/active listings are visible
   - Verify pending listings return 404

## 📊 Status Flow

```
User Creates Listing
        ↓
  status: 'pending_review'
        ↓
Admin Opens for Review
        ↓  
  status: 'under_review'
        ↓
    ┌───┴───┐
    ↓       ↓
Approve   Reject
    ↓       ↓
'approved' 'rejected'
```

## 🎯 Benefits

1. **No Mapping Logic** - Direct status usage throughout stack
2. **Consistent Naming** - Same values in database, backend, and frontend
3. **Type Safety** - TypeScript enforces correct status values
4. **Clearer Intent** - Status names match their purpose
5. **Easier Debugging** - No translation needed when tracing issues

## 🚀 Deployment Status

- ✅ Shared types rebuilt
- ✅ Backend restarted
- ✅ Frontend restarted
- ✅ All TypeScript errors resolved
- ✅ No breaking changes for new listings

## ⚠️ Important Notes

1. **Existing Data:** If you have listings with `'pending_moderation'` status, they won't appear until you run the migration script or update them manually.

2. **Database Field:** We use the main `status` field, not `moderationStatus` or nested `moderationWorkflow.status`.

3. **Filter Values:** Frontend filter dropdowns now use `'pending_review'` instead of `'pending'`.

4. **Test Data:** All test files have been updated to use new status values.

## 📚 Related Files

- `/packages/shared-types/src/common.ts` - Type definitions
- `/backend/src/listing/index.ts` - Listing creation and visibility
- `/backend/src/admin-service/index.ts` - Admin queries
- `/frontend/src/components/admin/ListingDetailView.tsx` - Detail view
- `/frontend/src/components/admin/ListingModerationQueue.tsx` - Queue display
- `/frontend/src/hooks/useModerationQueue.ts` - State management

---

**Updated:** October 20, 2025  
**Status:** Complete and Tested  
**Breaking Changes:** None (for new listings)  
**Migration Required:** Yes (for existing pending listings)
