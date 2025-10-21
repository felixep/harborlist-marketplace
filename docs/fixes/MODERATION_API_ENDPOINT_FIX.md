# Listing Moderation API Endpoint Fix

**Date:** October 20, 2025  
**Status:** ✅ Fixed

## Problem

When trying to approve/moderate a listing from the new review page, the following error occurred:

```
PUT https://local-api.harborlist.com/api/admin/listings/1760984261017-q1nzdqyqj/moderate 404 (Not Found)
```

## Root Cause

The frontend was calling the wrong endpoint:
- **Frontend called**: `PUT /api/admin/listings/:id/moderate` ❌
- **Backend expects**: `POST /api/listings/:id/moderate` ✅

### Why This Happened

The moderation endpoint was incorrectly placed under `/admin/listings/` instead of just `/listings/`. The listing service handles moderation decisions, not the admin service.

## Backend Endpoint Details

**File**: `backend/src/listing/index.ts`

**Route**: `POST /api/listings/:id/moderate`

**Handler**: `processModerationDecision()`

**Expected Body**:
```typescript
{
  action: 'approve' | 'reject' | 'request_changes';
  reason: string;
  publicNotes?: string;
  internalNotes?: string;
  requiredChanges?: string[];
}
```

**Responses**:
- `200` - Success with moderation result
- `400` - Validation error (missing required fields)
- `401` - Unauthorized
- `404` - Listing not found
- `500` - Server error

## Fix Applied

**File**: `frontend/src/services/adminApi.ts`

### Before:
```typescript
async moderateListing(listingId: string, decision: any): Promise<any> {
  return this.request(`/admin/listings/${listingId}/moderate`, {
    method: 'PUT',
    body: JSON.stringify(decision)
  }, { component: 'ListingModeration', action: 'ModerateListing' });
}
```

### After:
```typescript
async moderateListing(listingId: string, decision: any): Promise<any> {
  return this.request(`/listings/${listingId}/moderate`, {
    method: 'POST',  // Changed from PUT
    body: JSON.stringify(decision)
  }, { component: 'ListingModeration', action: 'ModerateListing' });
}
```

### Changes Made:
1. ✅ Removed `/admin` prefix from the endpoint
2. ✅ Changed HTTP method from `PUT` to `POST`

## How It Works Now

### Request Flow:

1. **User Action**:
   - Navigate to `/admin/moderation/review/:listingId`
   - Select decision (Approve/Reject/Request Changes)
   - Fill in reason and notes
   - Click "Submit Decision"

2. **Frontend**:
   - `ListingModerationReview` component calls `moderateListing()` hook
   - Hook calls `adminApi.moderateListing(listingId, decision)`
   - API client sends: `POST https://local-api.harborlist.com/api/listings/:id/moderate`

3. **Backend Routing**:
   - Local server routes to listing service: `/api/listings/:id`
   - Listing handler checks path includes `/moderate`
   - Calls `processModerationDecision()` function

4. **Processing**:
   - Validates user authentication
   - Validates request body (action, reason required)
   - Checks listing exists
   - Updates listing status based on action:
     - `approve` → status: `active`, workflow: `approved`
     - `reject` → status: `rejected`, workflow: `rejected`
     - `request_changes` → status: `pending_moderation`, workflow: `changes_requested`
   - Updates moderation queue
   - Sends notification to listing owner
   - Returns success response

5. **Frontend Response**:
   - Shows success notification
   - Navigates back to moderation queue
   - Queue auto-refreshes

## Testing Checklist

After browser refresh/rebuild, verify:

- [ ] Can approve listing successfully
- [ ] Can reject listing successfully
- [ ] Can request changes with change requests
- [ ] Listing status updates correctly in database
- [ ] Owner receives notification
- [ ] Queue shows updated status
- [ ] No 404 errors in console
- [ ] No error reporting spam

## Related Files

### Modified:
- `frontend/src/services/adminApi.ts` - Fixed endpoint and HTTP method

### Related (unchanged):
- `backend/src/listing/index.ts` - Moderation handler
- `backend/src/local-server.ts` - Route configuration
- `frontend/src/hooks/useModerationQueue.ts` - Moderation hook
- `frontend/src/pages/admin/ListingModerationReview.tsx` - Review page

## Additional Notes

### Why Not in Admin Service?

The moderation endpoint is in the listing service, not the admin service, because:
1. It modifies listing data directly
2. Listing service has access to all listing methods
3. Maintains separation of concerns
4. Admin service focuses on admin-specific features (user management, system config, etc.)
5. Both admin and potentially listing owners can use moderation workflows

### Authentication

- Admin token is sent via `Authorization: Bearer <token>` header
- `getUserId()` extracts user ID from JWT token
- Works for both admin and regular user tokens
- Admin permission checking happens at API Gateway/middleware level

### Future Improvements

Consider adding:
1. **Batch moderation** - Approve/reject multiple listings at once
2. **Moderation templates** - Pre-filled reasons for common decisions
3. **Moderation history** - Full audit trail of all decisions
4. **Escalation workflow** - Flag difficult decisions for senior review
5. **Auto-approval rules** - Automatically approve trusted sellers
6. **Appeal system** - Allow owners to appeal rejections

## Deployment Notes

This is a frontend-only fix. No backend changes or database migrations required.

### Steps:
1. ✅ Code changes applied
2. ⏳ Browser refresh or rebuild frontend
3. ⏳ Clear browser cache if needed
4. ⏳ Test moderation flow
5. ⏳ Monitor for errors

## Support

If issues persist after refresh:
1. Check browser console for actual URL being called
2. Verify backend is running (`npm run dev` in backend directory)
3. Check backend logs for incoming requests
4. Verify admin token is valid
5. Check listing exists in database

## Conclusion

The issue was a simple API endpoint mismatch. The fix aligns the frontend with the existing backend implementation. After browser refresh, moderation should work correctly.

**Status**: Ready for testing ✅
