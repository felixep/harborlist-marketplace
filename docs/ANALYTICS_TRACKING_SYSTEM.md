# Analytics & Tracking System - Implementation Summary

## Overview

Comprehensive analytics and behavior tracking system that monitors ALL user interactions across the HarborList platform, including both authenticated customers and anonymous visitors.

## Features Implemented

### 1. Analytics Events Table (`harborlist-analytics-events`)

**Structure:**
- `eventId` (PK): Unique event identifier
- `timestamp`: When the event occurred
- `eventType`: Type of event (VIEW, CLICK, SEARCH, etc.)
- `userId`: Customer ID (if authenticated)
- `sessionId`: Anonymous session ID (for non-authenticated users)
- `listingId`: Related listing (if applicable)
- `metadata`: Additional context (search terms, referrer, device info, etc.)

**Indexes:**
- `TimestampIndex`: Query events by time range
- `ListingEventsIndex`: Get all events for a specific listing
- `UserEventsIndex`: Get all events for a specific user
- `EventTypeIndex`: Query by event type

### 2. Backend Analytics Service (`backend/src/analytics-service/index.ts`)

**Endpoints:**

#### `POST /api/analytics/track`
Track any user interaction event
- Automatically captures user info (authenticated or anonymous)
- Records device type, IP, user agent, referrer
- Generates session IDs for anonymous users
- Non-blocking, fire-and-forget tracking

#### `GET /api/stats/platform`
Get platform-wide statistics
- Total listings (active and all)
- Total users
- Total views and events
- User satisfaction score
- Engagement metrics

#### `GET /api/analytics/listings/:id/stats`
Get analytics for a specific listing
- Total views, clicks, contacts
- Shares and favorites
- Unique visitors (authenticated + anonymous)
- Last viewed timestamp

#### `GET /api/analytics/stats/users` (Admin only)
Get user behavior statistics
- Events by type
- Unique users and sessions
- Average events per session
- Configurable date range

#### `GET /api/analytics/stats/top-listings`
Get top listings by views/engagement
- Configurable time range
- Configurable limit
- Returns listings sorted by view count

### 3. Frontend Tracking Hook (`frontend/src/hooks/useTracking.ts`)

**Automatic Tracking:**
- Page views (on component mount)
- Time spent on page (on unmount, minimum 3 seconds)
- Scroll depth (25%, 50%, 75%, 90% milestones)
- Session management (30-minute anonymous sessions)

**Manual Tracking Functions:**

```tsx
const {
  // Page tracking
  trackPageView,
  
  // Listing tracking
  trackListingView,        // When listing detail page loads
  trackListingClick,       // When listing card is clicked
  trackImageView,          // When images are viewed/expanded
  
  // Search tracking
  trackSearch,             // Search queries
  trackFilterApply,        // Filter usage
  trackSearchResultClick,  // Search result clicks with position
  trackCategoryBrowse,     // Category browsing
  
  // Interaction tracking
  trackContactSeller,      // Contact button clicks
  trackPhoneReveal,        // Phone number reveals
  trackEmailClick,         // Email clicks
  trackShare,              // Share actions (with method)
  trackFavorite,           // Favorite/unfavorite actions
  
  // Generic tracking
  trackClick               // Custom click events
} = useTracking();
```

### 4. Event Types Supported

**Listing Interactions:**
- `LISTING_VIEW` - Listing detail page view
- `LISTING_CARD_CLICK` - Listing card clicked in search/home
- `LISTING_IMAGE_VIEW` - Image viewed in gallery
- `LISTING_IMAGE_EXPAND` - Image expanded to full screen
- `LISTING_CONTACT_CLICK` - Contact seller button clicked
- `LISTING_PHONE_REVEAL` - Phone number revealed
- `LISTING_EMAIL_CLICK` - Email link clicked
- `LISTING_SHARE` - Listing shared (with method: facebook, twitter, email, etc.)
- `LISTING_FAVORITE` / `LISTING_UNFAVORITE` - Bookmark actions

**Search & Discovery:**
- `SEARCH_QUERY` - Search performed (with query and filters)
- `SEARCH_FILTER_APPLY` - Filters applied/changed
- `SEARCH_RESULT_CLICK` - Search result clicked (with position)
- `CATEGORY_BROWSE` - Category navigation

**Page Views:**
- `PAGE_VIEW` - Generic page view
- `HOME_VIEW` - Home page view
- `PROFILE_VIEW` - Profile page view

**User Actions:**
- `USER_REGISTER` - Account created
- `USER_LOGIN` - User logged in
- `USER_LOGOUT` - User logged out

**Engagement Metrics:**
- `TIME_ON_PAGE` - Time spent (tracked on unmount, >3s)
- `SCROLL_DEPTH` - Scroll milestones reached

## Usage Examples

### Track Listing View (Automatic)

```tsx
// In ListingDetail component
import { useTracking } from '../hooks/useTracking';

function ListingDetail({ listingId }) {
  const { trackListingView } = useTracking();
  
  useEffect(() => {
    trackListingView(listingId);
  }, [listingId]);
  
  // ... rest of component
}
```

### Track Listing Click (Search Results)

```tsx
// In SearchResults component
import { useTracking } from '../hooks/useTracking';

function SearchResults({ listings }) {
  const { trackListingClick } = useTracking();
  
  return listings.map((listing, index) => (
    <Link 
      to={`/listings/${listing.id}`}
      onClick={() => trackListingClick(listing.id, index)}
    >
      <ListingCard listing={listing} />
    </Link>
  ));
}
```

### Track Search with Filters

```tsx
// In SearchPage component
import { useTracking } from '../hooks/useTracking();

function SearchPage() {
  const { trackSearch, trackFilterApply } = useTracking();
  
  const handleSearch = (query: string, filters: any) => {
    trackSearch(query, filters);
    // ... perform search
  };
  
  const handleFilterChange = (newFilters: any) => {
    trackFilterApply(newFilters);
    // ... apply filters
  };
  
  // ... rest of component
}
```

### Track Contact Seller

```tsx
// In ListingDetail component
import { useTracking } from '../hooks/useTracking';

function ContactSection({ listingId }) {
  const { trackContactSeller, trackPhoneReveal, trackEmailClick } = useTracking();
  
  return (
    <>
      <button onClick={() => {
        trackContactSeller(listingId);
        // Show contact form
      }}>
        Contact Seller
      </button>
      
      <button onClick={() => {
        trackPhoneReveal(listingId);
        // Show phone number
      }}>
        Show Phone
      </button>
      
      <a href={`mailto:${email}`} onClick={() => trackEmailClick(listingId)}>
        Send Email
      </a>
    </>
  );
}
```

### Track Share Action

```tsx
// In ShareButton component
import { useTracking } from '../hooks/useTracking';

function ShareButton({ listingId }) {
  const { trackShare } = useTracking();
  
  const handleShare = (method: string) => {
    trackShare(listingId, method);
    // ... perform share action
  };
  
  return (
    <>
      <button onClick={() => handleShare('facebook')}>Share on Facebook</button>
      <button onClick={() => handleShare('twitter')}>Share on Twitter</button>
      <button onClick={() => handleShare('email')}>Share via Email</button>
    </>
  );
}
```

## Data Flow

1. **User Action** → Frontend component detects interaction
2. **Track Event** → `useTracking` hook called with event type
3. **Session ID** → Automatic session management for anonymous users
4. **API Call** → Non-blocking POST to `/api/analytics/track`
5. **Store Event** → Analytics service stores in DynamoDB
6. **Query Stats** → Admin can query aggregated statistics

## Privacy & Performance

**Privacy:**
- Anonymous session IDs for non-authenticated users
- Session expires after 30 minutes of inactivity
- No personally identifiable information stored without consent
- IP addresses hashed before storage (recommended)

**Performance:**
- Non-blocking, fire-and-forget tracking
- `keepalive: true` ensures events tracked even during page transitions
- Silent failures don't disrupt user experience
- Passive scroll listeners for minimal performance impact
- Debounced/throttled where appropriate

## Admin Analytics

Admins can query detailed analytics:

```typescript
// Get platform stats
const stats = await fetch('/api/stats/platform').then(r => r.json());
// Returns: totalListings, totalUsers, totalViews, userSatisfactionScore

// Get listing stats
const listingStats = await fetch(`/api/analytics/listings/${listingId}/stats`).then(r => r.json());
// Returns: views, clicks, contacts, shares, favorites, uniqueVisitors

// Get top listings
const topListings = await fetch('/api/analytics/stats/top-listings?days=30&limit=10').then(r => r.json());
// Returns: Top 10 most viewed listings in last 30 days

// Get user behavior stats
const userStats = await fetch('/api/analytics/stats/users?days=7').then(r => r.json());
// Returns: Events by type, unique users, sessions, average events per session
```

## Setup Instructions

### 1. Create Analytics Table

```bash
# Run the setup script
chmod +x infrastructure/scripts/create-analytics-table.sh
./infrastructure/scripts/create-analytics-table.sh
```

### 2. Rebuild Backend

```bash
docker-compose -f docker-compose.local.yml up -d --build backend
```

### 3. Import Tracking Hook

```tsx
import { useTracking } from './hooks/useTracking';
```

### 4. Start Tracking!

The hook automatically tracks page views, time on page, and scroll depth. Add manual tracking calls for specific interactions.

## Future Enhancements

- [ ] Real-time dashboard with WebSockets
- [ ] Heatmaps for listing images
- [ ] A/B testing framework
- [ ] Conversion funnel analysis
- [ ] Cohort analysis
- [ ] Predictive analytics (likely to contact, likely to purchase)
- [ ] Geographic heatmaps
- [ ] Device and browser analytics
- [ ] Performance monitoring integration
- [ ] GDPR compliance tools (consent management)

## Database Queries for Common Analytics

### Total Views Per Listing (Last 30 Days)

```typescript
const result = await docClient.send(new QueryCommand({
  TableName: 'harborlist-analytics-events',
  IndexName: 'EventTypeIndex',
  KeyConditionExpression: 'eventType = :viewType AND #timestamp >= :thirtyDaysAgo',
  ExpressionAttributeNames: { '#timestamp': 'timestamp' },
  ExpressionAttributeValues: {
    ':viewType': 'LISTING_VIEW',
    ':thirtyDaysAgo': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
}));
```

### Unique Visitors Per Listing

```typescript
const result = await docClient.send(new QueryCommand({
  TableName: 'harborlist-analytics-events',
  IndexName: 'ListingEventsIndex',
  KeyConditionExpression: 'listingId = :listingId',
  ExpressionAttributeValues: { ':listingId': listingId },
}));

const uniqueVisitors = new Set(
  result.Items.map(e => e.userId || e.sessionId)
).size;
```

### Conversion Rate (Views → Contacts)

```typescript
const views = events.filter(e => e.eventType === 'LISTING_VIEW').length;
const contacts = events.filter(e => e.eventType === 'LISTING_CONTACT_CLICK').length;
const conversionRate = views > 0 ? (contacts / views) * 100 : 0;
```

## Environment Variables

```bash
# Analytics service configuration
ANALYTICS_EVENTS_TABLE=harborlist-analytics-events
LISTINGS_TABLE=harborlist-listings
USERS_TABLE=harborlist-users

# Optional: Enable analytics tracking
ENABLE_ANALYTICS=true
```

## Testing

### Test Tracking Event

```bash
curl -X POST http://localhost:3001/api/analytics/track \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "LISTING_VIEW",
    "listingId": "test-listing-123",
    "sessionId": "test-session",
    "metadata": {
      "page": "/listings/test-listing-123",
      "referrer": "https://google.com"
    }
  }'
```

### Test Platform Stats

```bash
curl http://localhost:3001/api/stats/platform
```

### Test Listing Stats

```bash
curl http://localhost:3001/api/analytics/listings/test-listing-123/stats
```

## Files Created/Modified

### New Files:
- `backend/src/analytics-service/index.ts` - Analytics service
- `frontend/src/hooks/useTracking.ts` - Tracking hook
- `infrastructure/scripts/create-analytics-table.sh` - Table setup script
- `docs/ANALYTICS_TRACKING_SYSTEM.md` - This documentation

### Modified Files:
- `backend/src/local-server.ts` - Added analytics routes
- `frontend/src/services/ratings.ts` - Improved platform stats error handling

## Notes

- All tracking is non-blocking and won't affect user experience
- Silent failures ensure robust operation
- Session management is automatic
- Works for both authenticated and anonymous users
- GDPR-ready with proper consent management (to be implemented)
- Scalable architecture supports millions of events

---

**Created:** October 14, 2025  
**Author:** HarborList Development Team
