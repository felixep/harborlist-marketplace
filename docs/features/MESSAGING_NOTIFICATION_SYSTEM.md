# Messaging/Notification System Implementation

## Overview

This document describes the implementation of the user notification system that was added to address the issue where moderation comments weren't appearing as messages on the customer side.

## Problem

When an admin approved a listing with a comment for the owner, the comment was not visible to the user. The `sendModerationNotification` function was only a placeholder that logged to console.

## Solution

Implemented a complete in-app notification system with the following components:

### 1. Database Layer

**Table**: `harborlist-notifications`
- **Primary Key**: `notificationId` (String) + `createdAt` (Number)
- **Attributes**:
  - `userId`: User who receives the notification
  - `type`: Notification type (listing_approved, listing_rejected, etc.)
  - `title`: Notification title
  - `message`: Notification message content
  - `status`: unread | read | archived
  - `readAt`: Timestamp when marked as read (optional)
  - `data`: Additional context data (optional)
  - `actionUrl`: Link to related resource (optional)
  - `ttl`: Auto-delete after 90 days

**Global Secondary Indexes**:
1. `user-index`: Query notifications by userId, sorted by createdAt
2. `user-status-index`: Query unread/read notifications for a user

### 2. Backend Service

**File**: `backend/src/notification-service/index.ts`

**Key Functions**:
- `createNotification()`: Creates a new notification for a user
- `getUserNotifications()`: Retrieves user notifications with pagination
- `getUnreadCount()`: Returns count of unread notifications
- `markNotificationAsRead()`: Marks a single notification as read
- `markAllNotificationsAsRead()`: Marks all user notifications as read
- `deleteNotification()`: Deletes a notification

**API Endpoints**:
- `GET /api/notifications` - Get user notifications (with pagination and status filter)
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### 3. Integration with Moderation System

**File**: `backend/src/listing/index.ts`

Updated `sendModerationNotification()` function to:
1. Determine notification type based on moderation action
2. Create appropriate notification title (✅ Listing Approved, ❌ Listing Rejected, 📝 Changes Requested)
3. Call `createNotification()` with listing details
4. Include action URL to view the listing

**Notification Types**:
- `listing_approved`: Listing approved by moderator
- `listing_rejected`: Listing rejected
- `listing_changes_requested`: Changes requested before approval
- `listing_inquiry`: Someone contacted about listing
- `system_announcement`: Platform announcements
- `account_update`: Account-related updates
- `message`: Direct messages
- `transaction_update`: Transaction status changes

### 4. Frontend Components

**Notification API Service**: `frontend/src/services/notificationApi.ts`
- Provides typed API methods for interacting with notifications
- Handles authentication headers automatically

**NotificationBell Component**: `frontend/src/components/notifications/NotificationBell.tsx`

Features:
- Bell icon with unread count badge
- Dropdown showing recent 10 notifications
- Real-time unread count updates (every 30 seconds)
- Mark individual notifications as read
- Mark all as read functionality
- Time ago formatting (e.g., "2m ago", "3h ago")
- Different icons for different notification types
- Click notification to view related resource
- Visual distinction for unread notifications (blue background)

**Header Integration**: `frontend/src/components/common/Header.tsx`
- Added NotificationBell component next to favorites icon
- Only visible for authenticated users
- Positioned in the header for easy access

## How It Works

### Moderation Flow

1. **Admin approves listing with comment**:
   - Admin selects "Approve" in moderation interface
   - Enters public notes/comment for the owner
   - Submits moderation decision

2. **Backend processing**:
   - `processModerationDecision()` handles the approval
   - Updates listing status to "active"
   - Calls `sendModerationNotification(ownerId, listingId, 'approve', message)`

3. **Notification creation**:
   - `createNotification()` is called with:
     - Type: `listing_approved`
     - Title: "✅ Listing Approved"
     - Message: The moderator's comment
     - Action URL: `/listings/${listingId}`
   - Notification stored in DynamoDB with TTL

4. **User sees notification**:
   - User logs in to frontend
   - NotificationBell fetches unread count (displays badge)
   - User clicks bell to see notifications
   - Clicks notification to mark as read and view listing

### Example Notification

```json
{
  "notificationId": "notif_abc123",
  "userId": "user_xyz789",
  "type": "listing_approved",
  "title": "✅ Listing Approved",
  "message": "Great photos and detailed specs! Your 2020 Sea Ray is now live.",
  "status": "unread",
  "createdAt": 1698765432000,
  "data": {
    "listingId": "listing_456",
    "action": "approve",
    "timestamp": 1698765432000
  },
  "actionUrl": "/listings/listing_456",
  "ttl": 1706541432
}
```

## Environment Variables

**Backend** (added to Lambda functions):
- `NOTIFICATIONS_TABLE`: harborlist-notifications

**Already configured in**:
- `infrastructure/lib/harborlist-stack.ts`
- `backend/src/local-server.ts`

## Database Setup

**Local Development**:
```bash
./tools/development/setup-local-dynamodb.sh
```

**AWS/Production**:
Table is defined in CDK stack (`infrastructure/lib/harborlist-stack.ts`) and will be created during `cdk deploy`.

## Testing

### Manual Testing Flow

1. **Start the development environment**:
   ```bash
   docker-compose up -d
   npm run dev
   ```

2. **Create a test user** (as listing owner):
   - Register at http://local.harborlist.com:3000/register
   - Note the user ID

3. **Create a test listing**:
   - Create a new boat listing
   - Listing will be in "pending_moderation" status

4. **Login as admin**:
   - Go to http://local.harborlist.com:3000/admin/login
   - Login with admin credentials

5. **Moderate the listing**:
   - Go to Moderation Queue
   - Select the listing
   - Choose "Approve"
   - Enter a comment: "Great photos! Your listing looks excellent."
   - Submit

6. **Verify notification**:
   - Logout from admin
   - Login as the listing owner
   - Check the bell icon in header
   - Should show "1" unread notification
   - Click bell to see: "✅ Listing Approved" with your comment
   - Click notification to go to listing

### Automated Testing

```bash
# Backend tests
cd backend
npm test -- notification-service

# Integration tests
npm run test:integration
```

## Future Enhancements

1. **Email Notifications**: Send email in addition to in-app notification
2. **Push Notifications**: Web push notifications for real-time alerts
3. **Notification Preferences**: Let users configure which notifications they receive
4. **Notification History Page**: Full-page view of all notifications with filtering
5. **Real-time Updates**: WebSocket/SSE for instant notification delivery
6. **Rich Notifications**: Support images, buttons, and custom actions
7. **Notification Templates**: Template system for consistent messaging
8. **Batch Operations**: Bulk mark as read/delete capabilities

## Related Files

### Infrastructure
- `infrastructure/lib/harborlist-stack.ts` - CDK table definition
- `tools/development/setup-local-dynamodb.sh` - Local DB setup

### Backend
- `backend/src/notification-service/index.ts` - Main service
- `backend/src/listing/index.ts` - Moderation integration
- `backend/src/local-server.ts` - API routes
- `backend/src/shared/utils.ts` - Shared utilities

### Frontend
- `frontend/src/services/notificationApi.ts` - API client
- `frontend/src/components/notifications/NotificationBell.tsx` - UI component
- `frontend/src/components/common/Header.tsx` - Integration point

## Troubleshooting

### Notifications not appearing

1. **Check table exists**:
   ```bash
   aws dynamodb list-tables --endpoint-url http://localhost:8000
   ```

2. **Check backend logs**:
   Look for "Created notification for user..." message

3. **Check authentication**:
   NotificationBell requires valid JWT token in localStorage

4. **Check API endpoint**:
   Test directly: `GET http://local-api.harborlist.com:3001/api/notifications`

### Unread count not updating

1. **Check polling interval**: Currently set to 30 seconds
2. **Check browser console** for API errors
3. **Verify JWT token** is being sent in Authorization header

### Notifications not marked as read

1. **Check createdAt value**: Required for DynamoDB composite key
2. **Verify API call** in Network tab
3. **Check backend logs** for errors

## Performance Considerations

- **TTL**: Automatically deletes notifications after 90 days
- **Pagination**: Limits queries to 20 notifications at a time
- **Polling**: 30-second interval to reduce API calls
- **Indexes**: GSIs optimized for common query patterns
- **Caching**: Frontend caches notification list until dropdown closes

## Security

- **Authentication**: All endpoints require valid JWT token
- **Authorization**: Users can only access their own notifications
- **Input Validation**: All inputs sanitized before storage
- **XSS Prevention**: Message content properly escaped in UI
- **Rate Limiting**: Consider adding rate limits in production

## Status

✅ **Completed**:
- Database table created
- Backend service implemented
- Moderation integration complete
- Frontend UI component built
- API endpoints functional
- Local development tested

🔄 **Next Steps**:
- Run end-to-end test with real moderation flow
- Add email notification support
- Create notification preferences UI
- Implement WebSocket for real-time updates
