# Analytics Data Segmentation

## Overview

The analytics platform stats endpoint (`/api/stats/platform`) now implements role-based data segmentation to protect sensitive business information while providing appropriate visibility to different user types.

## Access Levels

### 1. Non-Authenticated Users (Public)
**Access:** Limited public marketplace statistics only

**Response includes:**
```json
{
  "activeListings": 1,
  "averageRating": 4.5,
  "userSatisfactionScore": 4,
  "totalReviews": 0
}
```

**Use case:** Public marketplace overview for potential buyers browsing the platform

---

### 2. Authenticated Customers
**Access:** Public stats + engagement metrics

**Response includes:**
```json
{
  "activeListings": 1,
  "totalListings": 1,
  "averageRating": 4.5,
  "userSatisfactionScore": 4,
  "totalReviews": 0,
  "last30Days": {
    "views": 0
  }
}
```

**Additional data:**
- `totalListings`: Total number of listings (including pending/inactive)
- `last30Days.views`: Platform activity indicator

**Use case:** Logged-in customers can see platform growth and activity trends

---

### 3. Staff/Admin Users
**Access:** Full analytics dashboard data

**Response includes:**
```json
{
  "activeListings": 1,
  "totalListings": 1,
  "averageRating": 4.5,
  "userSatisfactionScore": 4,
  "totalReviews": 0,
  "totalUsers": 3,
  "totalViews": 0,
  "totalEvents": 0,
  "last30Days": {
    "views": 0,
    "events": 0
  },
  "pendingListings": 0,
  "conversionRate": "0.00"
}
```

**Additional data:**
- `totalUsers`: Total registered users
- `totalViews`: All-time listing views
- `totalEvents`: All tracked analytics events
- `last30Days.events`: All event types in last 30 days
- `pendingListings`: Listings awaiting approval
- `conversionRate`: Views-to-listings ratio

**Use case:** Admin dashboard, business intelligence, platform health monitoring

---

## Implementation Details

### User Context Detection

The system determines user access level by:

1. **Checking Authorization header** for Bearer token
2. **Parsing JWT payload** to extract:
   - `role`: user, admin, super_admin, moderator, support
   - `userType`: customer, staff
   - `permissions`: array of permission strings

3. **Classifying access level:**
   ```typescript
   isStaff = userType === 'staff' || 
             role in ['admin', 'super_admin', 'moderator', 'support']
   ```

### Security Considerations

1. **Token Validation**: Currently uses basic JWT parsing. Should be enhanced with:
   - Signature verification
   - Expiration checking
   - Revocation list checking

2. **Sensitive Data Protection**:
   - User counts hidden from public
   - Event tracking data restricted to staff
   - Conversion rates and business metrics staff-only

3. **Graceful Degradation**:
   - Invalid tokens treated as non-authenticated
   - Missing analytics table returns default values
   - Database errors don't expose system details

---

## Testing

### Manual Testing

```bash
# 1. Test as non-authenticated user
curl -k https://local-api.harborlist.com/api/stats/platform | jq .

# 2. Test as authenticated customer
TOKEN=$(curl -sk -X POST https://local-api.harborlist.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@example.com","password":"password"}' | jq -r '.token')

curl -k https://local-api.harborlist.com/api/stats/platform \
  -H "Authorization: Bearer $TOKEN" | jq .

# 3. Test as staff/admin
ADMIN_TOKEN=$(curl -sk -X POST https://local-api.harborlist.com/api/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@harborlist.local","password":"password"}' | jq -r '.token')

curl -k https://local-api.harborlist.com/api/stats/platform \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### Automated Testing

Use the provided test script:
```bash
./test-stats-access.sh
```

---

## Future Enhancements

### 1. Additional Segmentation
- Different staff roles (moderator vs admin) see different metrics
- Dealer accounts see their own listing analytics
- Parent dealers see aggregated sub-account stats

### 2. Rate Limiting
- Public endpoint: 100 requests/hour
- Authenticated: 1000 requests/hour
- Staff: Unlimited

### 3. Caching
- Public stats cached for 5 minutes
- Authenticated stats cached for 1 minute
- Staff stats real-time (no cache)

### 4. Additional Endpoints
- `/api/stats/my-analytics` - Customer's personal stats
- `/api/stats/dealer/:dealerId` - Dealer-specific analytics
- `/api/stats/trends` - Time-series data (staff only)

---

## Related Files

- **Implementation**: `backend/src/analytics-service/index.ts`
- **Types**: `backend/src/types/common.ts`
- **Auth**: `backend/src/shared/auth.ts`
- **Test Script**: `test-stats-access.sh`
- **Database Setup**: `tools/development/setup-local-dynamodb.sh`
