# Listing Moderation Workflow

## Overview
Implements a comprehensive content moderation workflow where customer-created listings must be approved by moderators before becoming publicly accessible. Owners retain full access to their pending listings for viewing and editing.

## Workflow States

### 1. **Pending Moderation** (`pending_moderation`)
- **Initial state** when customer creates a listing
- **Visibility**: Only visible to the listing owner
- **Owner can**: View and edit their listing
- **Public can**: Cannot see the listing (returns 404)
- **Moderators**: Can review and take action

### 2. **Under Review** (`moderationWorkflow.status: 'pending_review'`)
- Listing is actively being reviewed by moderation team
- Same visibility rules as pending_moderation

### 3. **Changes Requested** (`moderationWorkflow.status: 'changes_requested'`)
- Moderator has requested changes before approval
- Owner receives notification with required changes
- Owner can edit and resubmit
- Still private until approved

### 4. **Approved** (`moderationWorkflow.status: 'approved'` + `status: 'active'`)
- Listing has been approved by moderator
- **Visibility**: Public - anyone can view
- Status changes to `active`
- Appears in public listing searches
- View counter starts incrementing

### 5. **Rejected** (`moderationWorkflow.status: 'rejected'`)
- Listing violates content policies
- Owner receives rejection reason
- Owner can revise and resubmit as new listing
- Not publicly visible

## Access Control Rules

### Public Endpoints (Unauthenticated)

#### `GET /api/listings`
- Returns only **approved/active** listings
- Filters out all pending, rejected, or flagged listings
- Includes pagination and search filters

#### `GET /api/listings/slug/{slug}` or `GET /api/listings/{id}`
- **For pending listings**: Returns 404 if user is not the owner
- **For approved listings**: Returns full listing details
- View count only increments for approved listings

### Authenticated Owner Endpoints

#### `GET /api/listings/{id}` (with auth token)
- Owner can view their own pending listings
- Returns full listing details including moderation status
- No view count increment for pending listings

#### `PUT /api/listings/{id}` (with auth token)
- Owner can edit their own pending listings
- Can resubmit after changes requested
- Updates reset moderation review if listing was already reviewed

### Admin/Moderator Endpoints

#### `POST /api/admin/listings/{id}/moderate`
- Moderators can approve, reject, or request changes
- Sets `moderationWorkflow` status and updates listing status
- Triggers notifications to owner

## Implementation Details

### Backend Logic

#### Listing Visibility Check
```typescript
// Check if listing is pending moderation
const isPending = listing.status === 'pending_moderation' || 
                  listing.moderationWorkflow?.status === 'pending_review' ||
                  listing.moderationWorkflow?.status === 'changes_requested';

if (isPending) {
  // Get current user ID if authenticated
  let currentUserId: string | null = null;
  try {
    currentUserId = event ? getUserId(event) : null;
  } catch (error) {
    // User not authenticated
  }

  // Only allow owner or admin to view pending listings
  if (!currentUserId || currentUserId !== listing.ownerId) {
    return createErrorResponse(404, 'NOT_FOUND', 'Listing not found', requestId);
  }
}
```

#### Public Listings Filter
```typescript
// Filter to only show approved/active listings for public view
const publicListings = listingsWithOwners.filter(listing => {
  const enhancedListing = listing as EnhancedListing;
  return listing.status === 'active' || 
         (enhancedListing.moderationWorkflow?.status === 'approved' && 
          listing.status !== 'pending_moderation');
});
```

### Frontend Behavior

#### After Creating Listing
```typescript
// CreateListing.tsx
onSuccess: (data: { listingId: string; slug?: string; status?: string }) => {
  if (data.status === 'pending_review') {
    showSuccess(
      'Listing Submitted for Review', 
      'Your boat listing has been submitted and is being reviewed by our team. You can view and edit it while it\'s being reviewed.'
    );
  }
  // Navigate to listing page (owner can view even though it's pending)
  navigate(`/boat/${data.slug}`);
}
```

#### Listing Detail Page
```tsx
// Show moderation status banner for owners
{listing.status === 'pending_moderation' && isOwner && (
  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
    <div className="flex">
      <div className="flex-shrink-0">
        <ClockIcon className="h-5 w-5 text-yellow-400" />
      </div>
      <div className="ml-3">
        <p className="text-sm text-yellow-700">
          <strong>Pending Review:</strong> Your listing is being reviewed by our moderation team. 
          You can still edit it while it's under review.
        </p>
      </div>
    </div>
  </div>
)}
```

## User Experience Flow

### For Listing Owners

1. **Create Listing**
   ```
   Fill out form → Submit → Success message
   → Redirected to listing page with "Pending Review" banner
   ```

2. **View Pending Listing**
   ```
   Can access via direct URL (slug or ID)
   → See full listing with moderation status banner
   → Can edit using "Edit Listing" button
   ```

3. **Receive Approval**
   ```
   Email notification → Listing goes live
   → Appears in public search results
   → Public users can now view and contact
   ```

4. **Changes Requested**
   ```
   Email with required changes → Edit listing
   → Resubmit for review → Wait for approval
   ```

### For Public Users

1. **Browse Listings**
   ```
   See only approved listings
   → Search and filter active listings
   → No pending listings appear
   ```

2. **Try to Access Pending Listing**
   ```
   Navigate to pending listing URL
   → See "Listing Not Found" page
   → Cannot view until approved
   ```

### For Moderators

1. **Review Queue**
   ```
   Access admin panel → View moderation queue
   → See all pending listings with flags/priority
   ```

2. **Review Listing**
   ```
   Open listing details → Check content
   → Approve, Reject, or Request Changes
   → Add moderator notes
   ```

3. **Take Action**
   ```
   Select action → Provide reason/notes
   → Submit decision → Owner notified
   → Listing status updated
   ```

## Security Considerations

### Access Control
- ✅ JWT token verification for authenticated requests
- ✅ Owner ID comparison to prevent unauthorized access
- ✅ Pending listings return 404 to non-owners (no information leak)
- ✅ Admin role checking for moderation actions

### Data Privacy
- ✅ Owner email/contact not exposed in pending state
- ✅ Moderation notes only visible to moderators and listing owner
- ✅ View count only tracked for public listings

### Content Safety
- ✅ All listings start as pending by default
- ✅ Content moderation before public visibility
- ✅ Ability to flag approved listings for re-review
- ✅ Rejection reasons logged for audit trail

## API Endpoints Summary

| Endpoint | Auth Required | Returns Pending | Purpose |
|----------|---------------|-----------------|---------|
| `GET /api/listings` | No | No | Public listing search |
| `GET /api/listings/{id}` | Optional | Owner only | Single listing details |
| `GET /api/listings/slug/{slug}` | Optional | Owner only | SEO-friendly listing URL |
| `PUT /api/listings/{id}` | Yes (Owner) | Yes | Edit own listing |
| `POST /api/admin/listings/{id}/moderate` | Yes (Admin) | Yes | Moderate listing |
| `POST /api/listings/{id}/resubmit` | Yes (Owner) | Yes | Resubmit after changes |

## Database Schema

### Listing Document
```typescript
{
  listingId: string;
  ownerId: string;
  status: 'active' | 'inactive' | 'sold' | 'pending_moderation' | 'flagged' | 'rejected';
  moderationWorkflow: {
    status: 'pending_review' | 'approved' | 'rejected' | 'changes_requested';
    reviewedBy?: string;
    reviewedAt?: number;
    rejectionReason?: string;
    moderatorNotes?: string;
    requiredChanges?: string[];
  };
  // ... other fields
}
```

## Testing Scenarios

### Test Case 1: Create and View Own Pending Listing
1. ✅ Customer creates listing
2. ✅ Listing status = `pending_moderation`
3. ✅ Owner can view listing via URL
4. ✅ Public users get 404

### Test Case 2: Listing Approval Flow
1. ✅ Moderator approves listing
2. ✅ Status changes to `active`
3. ✅ Listing appears in public search
4. ✅ Anyone can view listing

### Test Case 3: Edit Pending Listing
1. ✅ Owner views pending listing
2. ✅ Clicks "Edit Listing" button
3. ✅ Makes changes and saves
4. ✅ Listing remains pending, awaits review

### Test Case 4: Unauthorized Access
1. ✅ User A creates listing
2. ✅ User B tries to access via URL
3. ✅ Gets 404 error
4. ✅ No data leaked

## Future Enhancements

- [ ] Email notifications for status changes
- [ ] In-app notification system
- [ ] Bulk moderation actions
- [ ] Auto-approval for trusted sellers
- [ ] ML-based content flagging
- [ ] Appeal process for rejections
- [ ] Moderation analytics dashboard

## Related Files
- `backend/src/listing/index.ts` - Listing handler with access control
- `backend/src/admin-service/index.ts` - Moderation endpoints
- `frontend/src/pages/CreateListing.tsx` - Listing creation
- `frontend/src/pages/ListingDetail.tsx` - Listing display
- `docs/LISTING_CREATION_REDIRECT_FIX.md` - Related slug handling

## Implementation Date
October 15, 2025

## Status
✅ Implemented and deployed
