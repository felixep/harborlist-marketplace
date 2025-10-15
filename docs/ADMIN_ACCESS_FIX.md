# Admin Access to Pending Listings - Fix

## Problem
Admin and moderator users (including super_admin) were unable to view pending listings created by customers. The system was returning 404 errors even though these users should have access to view all pending content for moderation purposes.

## Root Cause
While implementing access control for pending listings, a duplicate `isAdminOrModerator()` function was created in `utils.ts` that didn't properly check user roles. The system already had a proper authentication infrastructure in `auth.ts` with:
- `getUserFromEvent()` - Extracts user payload from JWT
- `requireAdminRole()` - Validates admin permissions
- Proper Cognito group → role mapping

## Solution

### What Was Changed

1. **Removed Duplicate Function** (`backend/src/shared/utils.ts`)
   - Deleted `isAdminOrModerator()` function (lines 207-238)
   - This was unnecessary duplication of existing auth infrastructure

2. **Updated Listing Access Control** (`backend/src/listing/index.ts`)
   - Changed imports to use `getUserFromEvent` from `auth.ts`
   - Updated three functions to use proper role checking:
     - `getListing()` (line 328)
     - `getListingBySlug()` (line 427)
     - `getListingWithRedirect()` (line 514)

### Proper Admin Check Pattern

```typescript
// Get user payload from JWT
const userPayload = await getUserFromEvent(event);
currentUserId = userPayload.sub;

// Check if user has any admin/moderator role
const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'SUPPORT'];
isAdmin = userPayload.role ? adminRoles.includes(userPayload.role) : false;

// Allow access if admin or owner
if (!isAdmin && (!currentUserId || currentUserId !== listing.ownerId)) {
  return createErrorResponse(404, 'NOT_FOUND', 'Listing not found', requestId);
}
```

## Admin Roles
The system recognizes these roles for admin/moderator access:
- **SUPER_ADMIN** - Full platform access (e.g., admin@harborlist.local)
- **ADMIN** - Administrative access
- **MODERATOR** - Content moderation access
- **SUPPORT** - Support team access

All these roles can view and moderate pending listings.

## Access Control Rules

### For Pending Listings
1. **Owner** - Can view and edit their own pending listings
2. **Admin/Moderator** - Can view ALL pending listings for moderation
3. **Public Users** - Receive 404 error (listing appears to not exist)

### For Approved Listings
- Visible to all users (public)

## Testing

### Test Super Admin Access
1. Login as super admin:
   - Email: `admin@harborlist.local`
   - Password: `4PXu?193Aij#Zhh:`

2. Navigate to any pending listing
3. Verify you can:
   - View the listing details
   - See moderation controls
   - Approve or request changes

### Test Customer Experience
1. Login as test customer:
   - Email: `test-user@example.com`
   - Password: `Test123!`

2. Create a new listing
3. Verify the listing status shows "Pending Moderation"
4. Verify you can view and edit your own pending listing
5. Logout and try to access the listing - should get 404

## Integration with Existing Auth

This fix properly integrates with the existing authentication system:

- **Cognito Groups** → Maps user to appropriate role
- **JWT Token** → Contains role in payload
- **getUserFromEvent()** → Extracts role from token
- **Role Check** → Validates against admin roles list

No new authentication logic was added; we now use the infrastructure that was already in place.

## Related Files
- `backend/src/shared/auth.ts` - Contains auth infrastructure
- `backend/src/listing/index.ts` - Listing access control
- `docs/LISTING_MODERATION_WORKFLOW.md` - Full moderation workflow documentation

## Commit
This fix removes duplicate functionality and uses existing auth infrastructure for admin access to pending listings.
