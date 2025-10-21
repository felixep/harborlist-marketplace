# Content Moderation Fix - Complete Analysis & Resolution

## 🔍 Issues Found & Fixed

### Issue #1: Status Field Mismatch ✅ FIXED
**Problem:** Database query was looking for the wrong status values
- Listings created with: `status: 'pending_moderation'`
- Query was looking for: `status: 'pending_review'`
- Result: Pending listings were not returned by the query

**Fix:** Updated query to include both status values:
```typescript
FilterExpression: '#status IN (:pending_moderation, :pending_review, :flagged)'
```

### Issue #2: Status Value Mapping ✅ FIXED
**Problem:** Type mismatch between database and frontend
- Database uses: `'pending_moderation' | 'pending_review' | 'flagged' | 'active' | 'rejected'`
- Frontend expects: `'pending' | 'under_review' | 'approved' | 'rejected'`
- Result: Even if listings were returned, the status values wouldn't match the interface

**Fix:** Added status mapping logic:
```typescript
let mappedStatus: 'pending' | 'under_review' | 'approved' | 'rejected';
if (listing.status === 'pending_moderation' || listing.status === 'pending_review') {
  mappedStatus = 'pending';
} else if (listing.status === 'flagged') {
  mappedStatus = 'under_review';
} else if (listing.status === 'active' || listing.status === 'approved') {
  mappedStatus = 'approved';
} else {
  mappedStatus = 'rejected';
}
```

### Issue #3: Missing Required Fields ✅ FIXED
**Problem:** Frontend `FlaggedListing` interface requires fields that weren't being provided
- Missing: `ownerName`, `ownerEmail`, `flags[]`
- Result: TypeScript type errors and potential runtime issues

**Fix:** 
1. Added owner data lookup from USERS_TABLE
2. Created default `flags` array for new listings
3. Properly formatted all required fields

### Issue #4: Statistics Not Counting Pending Listings ✅ FIXED
**Problem:** Stats functions were also using wrong status values
- `handleGetModerationStats` only counted `'pending_review'`
- `getRealListingsData` was using wrong field `moderationStatus` instead of `status`

**Fix:** Updated both functions to include `'pending_moderation'` status

## 📝 All Changes Made

### File: `backend/src/admin-service/index.ts`

#### Change 1: handleGetFlaggedListings (Complete Rewrite)
**Location:** ~Line 3095

**Before:**
```typescript
async function handleGetFlaggedListings(event: AuthenticatedEvent): Promise<APIGatewayProxyResult> {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: LISTINGS_TABLE,
      FilterExpression: '#status IN (:pending, :flagged)',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':pending': 'pending_review',  // ❌ Wrong value
        ':flagged': 'flagged'
      }
    }));

    const listings = (result.Items || []).map((listing: any) => ({
      listingId: listing.listingId,
      title: listing.title,
      ownerId: listing.ownerId,
      flagReason: listing.moderationStatus?.rejectionReason || 'Pending review',
      status: listing.status,  // ❌ Wrong status type
      // ❌ Missing: ownerName, ownerEmail, flags
      flaggedAt: ...,
      images: listing.images || [],
      price: listing.price,
      location: listing.location
    }));

    return createResponse(200, { listings });
  } catch (error) { ... }
}
```

**After:**
```typescript
async function handleGetFlaggedListings(event: AuthenticatedEvent): Promise<APIGatewayProxyResult> {
  try {
    // ✅ Query includes both status values
    const result = await docClient.send(new ScanCommand({
      TableName: LISTINGS_TABLE,
      FilterExpression: '#status IN (:pending_moderation, :pending_review, :flagged)',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':pending_moderation': 'pending_moderation',  // ✅ Added
        ':pending_review': 'pending_review',
        ':flagged': 'flagged'
      }
    }));

    // ✅ Fetch owner details
    const ownerIds = [...new Set((result.Items || []).map((item: any) => item.ownerId))];
    const ownerMap = new Map<string, any>();

    for (const ownerId of ownerIds) {
      try {
        const ownerResult = await docClient.send(new GetCommand({
          TableName: USERS_TABLE,
          Key: { userId: ownerId }
        }));
        if (ownerResult.Item) {
          ownerMap.set(ownerId, ownerResult.Item);
        }
      } catch (err) {
        console.error(`Failed to fetch owner ${ownerId}:`, err);
      }
    }

    const listings = (result.Items || []).map((listing: any) => {
      // ✅ Map database status to frontend status
      let mappedStatus: 'pending' | 'under_review' | 'approved' | 'rejected';
      if (listing.status === 'pending_moderation' || listing.status === 'pending_review') {
        mappedStatus = 'pending';
      } else if (listing.status === 'flagged') {
        mappedStatus = 'under_review';
      } else if (listing.status === 'active' || listing.status === 'approved') {
        mappedStatus = 'approved';
      } else {
        mappedStatus = 'rejected';
      }

      // ✅ Get owner info
      const owner = ownerMap.get(listing.ownerId);
      const ownerName = owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email : 'Unknown Owner';
      const ownerEmail = owner?.email || '';

      return {
        listingId: listing.listingId,
        title: listing.title,
        ownerId: listing.ownerId,
        ownerName,  // ✅ Added
        ownerEmail,  // ✅ Added
        flagReason: listing.moderationStatus?.rejectionReason || 'Pending review',
        status: mappedStatus,  // ✅ Correctly mapped
        flags: listing.flags || [{  // ✅ Added default flags
          id: `flag-${listing.listingId}`,
          type: 'new_listing',
          reason: 'New listing pending review',
          reportedBy: 'system',
          reportedAt: new Date(listing.createdAt * 1000).toISOString(),
          severity: 'medium' as const,
          status: 'pending' as const
        }],
        flaggedAt: listing.moderationStatus?.reviewedAt 
          ? new Date(listing.moderationStatus.reviewedAt * 1000).toISOString()
          : new Date(listing.createdAt * 1000).toISOString(),
        images: listing.images || [],
        price: listing.price,
        location: listing.location
      };
    });

    return createResponse(200, { listings });
  } catch (error) { ... }
}
```

#### Change 2: handleGetModerationStats
**Location:** ~Line 3138

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

#### Change 3: getRealListingsData
**Location:** ~Line 1880

**Before:**
```typescript
const pendingResult = await docClient.send(new ScanCommand({
  TableName: LISTINGS_TABLE,
  FilterExpression: 'moderationStatus = :pending',  // ❌ Wrong field
  ExpressionAttributeValues: { ':pending': 'pending' },
  Select: 'COUNT'
}));
```

**After:**
```typescript
const pendingResult = await docClient.send(new ScanCommand({
  TableName: LISTINGS_TABLE,
  FilterExpression: '#status IN (:pending_moderation, :pending_review)',  // ✅ Correct field
  ExpressionAttributeNames: { '#status': 'status' },
  ExpressionAttributeValues: {
    ':pending_moderation': 'pending_moderation',
    ':pending_review': 'pending_review'
  },
  Select: 'COUNT'
}));
```

## 🧪 Testing Checklist

### 1. Backend Health Check
```bash
curl http://local-api.harborlist.com:3001/health
# Expected: {"status":"healthy"}
```

### 2. Check Flagged Listings Endpoint
```bash
# Replace YOUR_TOKEN with actual admin JWT token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://local-api.harborlist.com:3001/api/admin/listings/flagged
```

**Expected Response:**
```json
{
  "listings": [
    {
      "listingId": "...",
      "title": "...",
      "ownerId": "...",
      "ownerName": "John Doe",
      "ownerEmail": "john@example.com",
      "status": "pending",
      "flags": [...],
      "flaggedAt": "...",
      "price": 50000,
      "location": {...}
    }
  ]
}
```

### 3. Frontend Testing
1. **Login to Admin Portal:**
   - URL: http://local.harborlist.com:3000/admin
   - Use admin credentials

2. **Navigate to Content Moderation:**
   - Should see "Content Moderation" in sidebar
   - Click to open

3. **Verify Listings Display:**
   - ✅ Pending listings should be visible
   - ✅ Owner name should be displayed
   - ✅ Status should show as "Pending" or "Under Review"
   - ✅ Can click to view details
   - ✅ Can approve/reject listings

### 4. Create New Listing Test
1. Logout from admin
2. Login as regular user
3. Create a new boat listing
4. Login back as admin
5. Verify new listing appears in moderation queue immediately

## 🎯 Why Listings Weren't Showing

### The Complete Picture:

1. **Query Issue:** Backend wasn't querying for the correct status value
2. **Type Mismatch:** Even if found, status values wouldn't match frontend types
3. **Missing Data:** Required fields like `ownerName` and `flags` were not provided
4. **Stats Issue:** Dashboard statistics also weren't counting pending listings

### The Fix:

1. ✅ Query now includes `'pending_moderation'` status
2. ✅ Status values are mapped from database format to frontend format
3. ✅ Owner information is fetched and included
4. ✅ Default flags are created for new listings
5. ✅ Statistics functions now count all pending listings correctly

## 📊 Expected Behavior Now

### Before:
- Moderation Queue: Empty (0 listings)
- Pending Count: 0
- Error: None (just no data returned)

### After:
- Moderation Queue: Shows all listings with `pending_moderation` or `pending_review` status
- Pending Count: Accurate count of pending listings
- Owner Info: Displays owner name and email
- Status: Correctly shows "Pending" for new listings

## 🚀 Deployment Status

- ✅ Code changes applied
- ✅ Backend restarted
- ✅ No TypeScript errors
- ✅ Backward compatible (supports legacy `pending_review` status)
- ✅ No database migration needed

## 🐛 Troubleshooting

### If listings still don't appear:

1. **Check Backend Logs:**
```bash
docker-compose -f docker-compose.application.yml -f docker-compose.infrastructure.yml logs -f backend
```

2. **Verify Listing Status in Database:**
   - Open DynamoDB Admin: http://localhost:8001
   - Check the `HarborListListings` table
   - Verify listings have `status: 'pending_moderation'`

3. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for API errors
   - Check the response from `/api/admin/listings/flagged`

4. **Verify Admin Permissions:**
   - Ensure your admin user has `CONTENT_MODERATION` permission
   - Check Cognito groups or user attributes

### If you see TypeScript errors:
```bash
cd backend && npm run build
```

## 📚 Related Files

- `/backend/src/admin-service/index.ts` - Main fixes
- `/backend/src/listing/index.ts` - Creates listings with `pending_moderation`
- `/packages/shared-types/src/common.ts` - Type definitions
- `/frontend/src/hooks/useModerationQueue.ts` - Frontend hook
- `/frontend/src/services/adminApi.ts` - API service

---

**Fixed:** October 20, 2025  
**Backend Restarted:** ✅  
**Status:** Ready for testing  
**Breaking Changes:** None  
**Database Changes:** None
