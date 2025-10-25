# Technical Implementation Details - HarborList Marketplace

**Last Updated:** October 24, 2025  
**Version:** 2.0.0

---

## Table of Contents

1. [Database Schema & Indexes](#database-schema--indexes)
2. [API Endpoints Reference](#api-endpoints-reference)
3. [Authentication & Authorization](#authentication--authorization)
4. [State Management Patterns](#state-management-patterns)
5. [Component Architecture](#component-architecture)
6. [Shared Type Definitions](#shared-type-definitions)
7. [Testing Strategy](#testing-strategy)
8. [Performance Patterns](#performance-patterns)

---

## Database Schema & Indexes

### Table: harborlist-listings

**Primary Key:**
- `listingId` (String) - Partition Key

**Attributes:**
- `listingId` - Unique listing identifier
- `ownerId` - User ID of listing owner
- `title` - Listing title (10-100 chars)
- `description` - Full description
- `slug` - SEO-friendly URL slug
- `price` - Price in USD
- `year` - Boat manufacture year
- `make` - Boat manufacturer
- `model` - Boat model
- `boatType` - Type of boat
- `length` - Length in feet
- `location` - { city, state, zipCode, country }
- `images` - Array of image URLs
- `status` - active | pending_review | under_review | rejected | sold
- `engines` - Array of engine objects
- `engineConfiguration` - single | twin | triple | quad
- `totalHorsepower` - Sum of all engine HP
- `views` - Number of views
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp
- `moderationWorkflow` - Moderation status object

**Global Secondary Indexes:**

1. **OwnerIndex**
   - Partition Key: `ownerId`
   - Sort Key: `createdAt`
   - Purpose: Query all listings by owner

2. **StatusIndex**
   - Partition Key: `status`
   - Sort Key: `createdAt`
   - Purpose: Query listings by status

3. **SlugIndex**
   - Partition Key: `slug`
   - Purpose: Lookup listing by SEO slug

4. **HorsepowerIndex**
   - Partition Key: `engineConfiguration`
   - Sort Key: `totalHorsepower`
   - Purpose: Query boats by engine configuration and power

**Access Patterns:**
```typescript
// Get listing by ID
const listing = await db.getListing(listingId);

// Get listing by slug
const listing = await db.getListingBySlug(slug);

// Get all listings by owner
const listings = await db.getListingsByOwner(ownerId);

// Get all active listings
const result = await db.getListings(20, lastKey);

// Query by status
const pending = await db.query({
  IndexName: 'StatusIndex',
  KeyConditionExpression: 'status = :status',
  ExpressionAttributeValues: { ':status': 'pending_review' }
});
```

---

### Table: harborlist-users

**Primary Key:**
- `id` (String) - Partition Key (same as userId)

**Attributes:**
- `id` / `userId` - Unique user identifier (Cognito sub)
- `email` - User email address
- `name` - Display name
- `customerType` - individual | dealer | premium
- `tier` - FREE | DEALER | PREMIUM
- `tierExpiration` - Premium expiration timestamp
- `capabilities` - Array of user capabilities
- `listingsCount` - Number of active listings
- `maxListings` - Max listings for tier
- `createdAt` - Account creation timestamp
- `updatedAt` - Last update timestamp
- `profile` - Additional profile data

**Global Secondary Indexes:**

1. **EmailIndex**
   - Partition Key: `email`
   - Purpose: Lookup user by email

2. **TierIndex**
   - Partition Key: `tier`
   - Sort Key: `createdAt`
   - Purpose: Query users by tier

**Tier Capabilities:**

```typescript
// FREE Tier
capabilities: [
  'CREATE_LISTING',        // Up to 3 listings
  'EDIT_LISTING',          // Edit own listings
  'DELETE_LISTING',        // Delete own listings
  'VIEW_ANALYTICS_BASIC',  // Basic view counts
  'CONTACT_SUPPORT'        // Standard support
]

// DEALER Tier
capabilities: [
  ...FREE_CAPABILITIES,
  'BULK_UPLOAD',           // Upload multiple listings
  'ADVANCED_ANALYTICS',    // Detailed analytics
  'PRIORITY_SUPPORT',      // Priority support queue
  'FEATURED_LISTING',      // Up to 5 featured
  'EXPORT_DATA'            // Export listings
]

// PREMIUM Tier
capabilities: [
  ...DEALER_CAPABILITIES,
  'UNLIMITED_LISTINGS',    // No listing limit
  'VIP_SUPPORT',           // Highest priority support
  'ADVANCED_MARKETING',    // Marketing tools
  'API_ACCESS'             // API integration
]
```

---

### Table: harborlist-engines

**Primary Key:**
- `engineId` (String) - Partition Key

**Attributes:**
- `engineId` - Unique engine identifier
- `listingId` - Associated listing ID
- `type` - outboard | inboard | sterndrive | jet | electric | hybrid
- `manufacturer` - Engine manufacturer
- `model` - Engine model
- `horsepower` - Engine horsepower
- `fuelType` - gasoline | diesel | electric | hybrid
- `hours` - Engine hours
- `year` - Engine year
- `condition` - excellent | good | fair | needs_work
- `position` - Engine position (1, 2, 3, 4)
- `serialNumber` - Engine serial number
- `lastService` - Last service date
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

**Global Secondary Indexes:**

1. **ListingIndex**
   - Partition Key: `listingId`
   - Sort Key: `position`
   - Purpose: Get all engines for a listing in order

---

### Table: billing-accounts

**Primary Key:**
- `userId` (String) - Partition Key

**Attributes:**
- `userId` - User identifier
- `stripeCustomerId` - Stripe customer ID
- `paypalCustomerId` - PayPal customer ID
- `paymentMethods` - Array of payment methods
- `defaultPaymentMethod` - Default payment method ID
- `subscriptions` - Array of active subscriptions
- `billingAddress` - Billing address object
- `createdAt` - Account creation timestamp
- `updatedAt` - Last update timestamp

---

### Table: transactions

**Primary Key:**
- `transactionId` (String) - Partition Key

**Attributes:**
- `transactionId` - Unique transaction identifier
- `userId` - User making the transaction
- `type` - subscription | listing_fee | commission
- `amount` - Amount in USD cents
- `currency` - Currency code (USD)
- `status` - pending | completed | failed | refunded
- `processor` - stripe | paypal
- `processorTransactionId` - Processor's transaction ID
- `metadata` - Additional transaction data
- `createdAt` - Transaction timestamp
- `completedAt` - Completion timestamp

**Global Secondary Indexes:**

1. **UserTransactionsIndex**
   - Partition Key: `userId`
   - Sort Key: `createdAt`
   - Purpose: Get user's transaction history

---

### Table: moderation-queue

**Primary Key:**
- `moderationId` (String) - Partition Key

**Attributes:**
- `moderationId` - Unique moderation record ID
- `listingId` - Listing being moderated
- `ownerId` - Listing owner ID
- `status` - pending_review | under_review | approved | rejected | changes_requested
- `priority` - urgent | high | standard | low
- `assignedTo` - Moderator user ID
- `assignedTeam` - Team ID
- `reason` - Reason for moderation
- `moderatorNotes` - Internal notes
- `feedback` - Feedback for owner
- `submittedAt` - Submission timestamp
- `reviewedAt` - Review timestamp
- `reviewedBy` - Reviewing moderator ID
- `decision` - approve | reject | request_changes

**Global Secondary Indexes:**

1. **StatusIndex**
   - Partition Key: `status`
   - Sort Key: `priority`
   - Purpose: Get items by status and priority

2. **AssignedIndex**
   - Partition Key: `assignedTo`
   - Sort Key: `submittedAt`
   - Purpose: Get items assigned to moderator

---

### Table: analytics-events

**Primary Key:**
- `eventId` (String) - Partition Key
- `timestamp` (String) - Sort Key

**Attributes:**
- `eventId` - Unique event identifier
- `timestamp` - ISO timestamp
- `eventType` - Type of event (LISTING_VIEW, SEARCH_QUERY, etc.)
- `userId` - User ID (if authenticated)
- `sessionId` - Session identifier
- `listingId` - Related listing (if applicable)
- `metadata` - Event metadata object
- `ttl` - Auto-deletion timestamp (90 days)

**Global Secondary Indexes:**

1. **UserEventsIndex**
   - Partition Key: `userId`
   - Sort Key: `timestamp`
   - Purpose: Get user's event history

2. **ListingEventsIndex**
   - Partition Key: `listingId`
   - Sort Key: `timestamp`
   - Purpose: Get listing analytics

---

### Table: harborlist-notifications

**Primary Key:**
- `notificationId` (String) - Partition Key
- `createdAt` (Number) - Sort Key

**Attributes:**
- `notificationId` - Unique notification ID
- `userId` - Recipient user ID
- `type` - Notification type
- `title` - Short title
- `message` - Notification message
- `status` - unread | read | archived
- `readAt` - Read timestamp
- `actionUrl` - Optional navigation URL
- `data` - Additional context data
- `createdAt` - Creation timestamp
- `ttl` - Auto-deletion timestamp (90 days)

**Global Secondary Indexes:**

1. **UserNotificationsIndex**
   - Partition Key: `userId`
   - Sort Key: `createdAt`
   - Purpose: Get user's notifications

2. **UserStatusIndex**
   - Partition Key: `userId`
   - Sort Key: `status`
   - Purpose: Filter notifications by status

---

## API Endpoints Reference

### Authentication Endpoints

```typescript
// Customer Authentication
POST   /auth/customer/register
POST   /auth/customer/login
POST   /auth/customer/verify-email
POST   /auth/customer/resend-verification
POST   /auth/customer/forgot-password
POST   /auth/customer/reset-password
POST   /auth/customer/logout
POST   /auth/customer/refresh
POST   /auth/customer/change-password

// Staff Authentication
POST   /auth/staff/register
POST   /auth/staff/login
POST   /auth/staff/logout
POST   /auth/staff/refresh

// MFA
POST   /auth/customer/mfa/enroll
POST   /auth/customer/mfa/verify
POST   /auth/customer/mfa/disable
```

### User Management Endpoints

```typescript
GET    /users/profile
PUT    /users/profile
POST   /users/upgrade
POST   /users/transition-type
GET    /users/{userId}/listings

// Admin User Management
GET    /admin/users
GET    /admin/users/customers
GET    /admin/users/staff
POST   /admin/users/staff
PUT    /admin/users/{userId}
POST   /admin/users/{userId}/verify-email
POST   /admin/users/{userId}/disable
POST   /admin/users/{userId}/enable
```

### Listing Endpoints

```typescript
// Public Listings
GET    /listings
GET    /listings/{id}
GET    /listings/slug/{slug}

// Authenticated Listings
POST   /listings
PUT    /listings/{id}
DELETE /listings/{id}

// Engine Management
POST   /listings/{id}/engines
PUT    /listings/{id}/engines/{engineId}
DELETE /listings/{id}/engines/{engineId}

// Moderation
POST   /listings/{id}/moderate
POST   /listings/{id}/resubmit
```

### Admin Dashboard Endpoints

```typescript
// Dashboard
GET    /admin/dashboard/metrics
GET    /admin/system/health
GET    /admin/system/metrics
GET    /admin/system/alerts
GET    /admin/system/errors

// Analytics
GET    /admin/analytics/users
GET    /admin/analytics/listings
GET    /admin/analytics/engagement
GET    /admin/analytics/geographic

// Moderation
GET    /admin/moderation/queue
GET    /admin/moderation/stats
POST   /admin/moderation/assign
```

### Billing Endpoints

```typescript
// Subscriptions
GET    /billing/plans
POST   /billing/subscriptions/create
PUT    /billing/subscriptions/{id}
DELETE /billing/subscriptions/{id}

// Payment Methods
GET    /billing/payment-methods
POST   /billing/payment-methods
DELETE /billing/payment-methods/{id}
POST   /billing/payment-methods/{id}/set-default

// Transactions
GET    /billing/transactions
GET    /billing/transactions/{id}

// Webhooks
POST   /billing/webhooks/stripe
POST   /billing/webhooks/paypal
```

### Analytics Endpoints

```typescript
POST   /analytics/track
GET    /analytics/platform
GET    /analytics/listings/{id}/stats
GET    /analytics/stats/users
GET    /analytics/stats/top-listings
```

### Notification Endpoints

```typescript
GET    /notifications
GET    /notifications/unread-count
PUT    /notifications/{id}/read
POST   /notifications/mark-all-read
DELETE /notifications/{id}
```

### Finance Calculator Endpoints

```typescript
POST   /finance/calculate
POST   /finance/calculations
GET    /finance/calculations
GET    /finance/calculations/{id}
DELETE /finance/calculations/{id}
```

### Team Management Endpoints

```typescript
GET    /admin/teams
GET    /admin/teams/{id}
POST   /admin/teams
PUT    /admin/teams/{id}
POST   /admin/teams/assign
POST   /admin/teams/remove
POST   /admin/teams/bulk-assign
GET    /admin/teams/unassigned-staff
POST   /admin/teams/recalculate-permissions
```

### Search Endpoints

```typescript
GET    /search?q={query}&filters={filters}
GET    /search/suggestions?q={query}
GET    /listings/featured
GET    /listings/recent
```

---

## Authentication & Authorization

### JWT Token Structure

**Customer Access Token:**
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "cognito:username": "user@example.com",
  "cognito:groups": ["Customers"],
  "userType": "customer",
  "customerType": "individual",
  "tier": "FREE",
  "iat": 1234567890,
  "exp": 1234571490,
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXX"
}
```

**Staff Access Token:**
```json
{
  "sub": "staff-id",
  "email": "admin@harborlist.com",
  "name": "Admin Name",
  "cognito:username": "admin@harborlist.com",
  "cognito:groups": ["SuperAdmin"],
  "userType": "staff",
  "role": "SUPER_ADMIN",
  "permissions": ["USER_MANAGEMENT", "CONTENT_MODERATION", ...],
  "teams": ["team-id-1", "team-id-2"],
  "iat": 1234567890,
  "exp": 1234569690,
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_YYYYY"
}
```

### Permission System

**Admin Permissions:**
```typescript
enum AdminPermission {
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  CONTENT_MODERATION = 'CONTENT_MODERATION',
  FINANCIAL_ACCESS = 'FINANCIAL_ACCESS',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
  ANALYTICS_VIEW = 'ANALYTICS_VIEW',
  AUDIT_LOG_VIEW = 'AUDIT_LOG_VIEW',
  TIER_MANAGEMENT = 'TIER_MANAGEMENT',
  CAPABILITY_ASSIGNMENT = 'CAPABILITY_ASSIGNMENT',
  BILLING_MANAGEMENT = 'BILLING_MANAGEMENT',
  TEAM_MANAGEMENT = 'TEAM_MANAGEMENT'
}
```

**Role Permission Matrix:**

| Permission | SuperAdmin | Admin | Moderator | Support |
|-----------|------------|-------|-----------|---------|
| USER_MANAGEMENT | ✅ | ✅ | ❌ | ❌ |
| CONTENT_MODERATION | ✅ | ✅ | ✅ | ❌ |
| FINANCIAL_ACCESS | ✅ | ✅ | ❌ | ❌ |
| SYSTEM_CONFIG | ✅ | ✅ | ❌ | ❌ |
| ANALYTICS_VIEW | ✅ | ✅ | ✅ | ✅ |
| AUDIT_LOG_VIEW | ✅ | ✅ | ✅ | ❌ |
| TIER_MANAGEMENT | ✅ | ✅ | ❌ | ❌ |
| BILLING_MANAGEMENT | ✅ | ✅ | ❌ | ❌ |
| TEAM_MANAGEMENT | ✅ | ✅ | ❌ | ❌ |

### Middleware Chain

```typescript
// Example: Protected admin endpoint
const handler = compose(
  withRateLimit(100, 60000),                           // Rate limiting
  withAdminAuth([AdminPermission.USER_MANAGEMENT]),    // Auth + permission check
  withAuditLog('LIST_USERS', 'users')                  // Audit logging
)(handleListUsers);
```

**Middleware Execution Order:**
1. Rate limit check
2. JWT token validation
3. User extraction
4. Permission verification
5. Audit log creation
6. Handler execution
7. Response formatting

---

## State Management Patterns

### React Query Configuration

```typescript
// App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      cacheTime: 10 * 60 * 1000,      // 10 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});
```

### Custom Hooks Pattern

```typescript
// Example: useDashboardMetrics hook
export const useDashboardMetrics = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, error, isLoading } = useQuery({
    queryKey: ['dashboard-metrics', refreshKey],
    queryFn: async () => {
      const response = await adminApi.getDashboardMetrics();
      return response;
    },
    staleTime: 2 * 60 * 1000,  // 2 minutes for dashboard
  });

  const refetch = () => setRefreshKey(prev => prev + 1);

  return {
    metrics: data?.metrics,
    chartData: data?.chartData,
    alerts: data?.alerts || [],
    loading: isLoading,
    error,
    refetch,
  };
};
```

### Context Providers

**AuthProvider:**
```typescript
// frontend/src/components/auth/AuthProvider.tsx
export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
  loading: true,
  isAuthenticated: false,
});
```

**AdminAuthProvider:**
```typescript
// frontend/src/components/admin/AdminAuthProvider.tsx
export const AdminAuthContext = createContext<AdminAuthContextType>({
  admin: null,
  permissions: [],
  login: async () => {},
  logout: () => {},
  hasPermission: () => false,
  loading: true,
});
```

---

## Component Architecture

### Component Hierarchy

```
App
├── Router
│   ├── Public Routes
│   │   ├── Home
│   │   ├── Search
│   │   ├── ListingDetail
│   │   ├── Login
│   │   └── Register
│   │
│   ├── Protected Routes (Customer)
│   │   ├── Profile
│   │   ├── CreateListing
│   │   ├── EditListing
│   │   ├── BillingDashboard
│   │   └── PremiumUpgrade
│   │
│   └── Admin Routes (Staff)
│       ├── AdminDashboard
│       ├── UserManagement
│       ├── ListingModeration
│       ├── SystemMonitoring
│       ├── Analytics
│       └── PlatformSettings
│
├── Providers
│   ├── QueryClientProvider (React Query)
│   ├── AuthProvider (Customer Auth)
│   ├── AdminAuthProvider (Staff Auth)
│   ├── ToastProvider (Notifications)
│   └── ErrorBoundary (Error Handling)
│
└── Global Components
    ├── Header
    ├── Footer
    ├── LoadingSpinner
    └── ToastNotification
```

### Component Patterns

**1. Container/Presenter Pattern:**
```typescript
// Container: pages/Search.tsx
export function Search() {
  const { listings, loading, error } = useListings(filters);
  
  return (
    <SearchPresenter
      listings={listings}
      loading={loading}
      error={error}
      onFilterChange={handleFilterChange}
    />
  );
}

// Presenter: components/search/SearchPresenter.tsx
export function SearchPresenter({ listings, loading, onFilterChange }) {
  // Pure presentational component
}
```

**2. Custom Hook Pattern:**
```typescript
// Hook encapsulates business logic
export function useListingManagement(listingId: string) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => api.updateListing(listingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['listing', listingId]);
      toast.success('Listing updated');
    },
  });

  return {
    updateListing: updateMutation.mutate,
    isUpdating: updateMutation.isLoading,
    error: updateMutation.error,
  };
}
```

**3. Compound Component Pattern:**
```typescript
// Flexible composition
<ListingCard>
  <ListingCard.Image src={listing.images[0]} />
  <ListingCard.Title>{listing.title}</ListingCard.Title>
  <ListingCard.Price>{listing.price}</ListingCard.Price>
  <ListingCard.Actions>
    <Button>View</Button>
    <Button>Contact</Button>
  </ListingCard.Actions>
</ListingCard>
```

---

## Shared Type Definitions

### Core Entity Types

**Location:** `packages/shared-types/src/index.ts`

```typescript
// Listing Types
export interface Listing {
  listingId: string;
  ownerId: string;
  title: string;
  description: string;
  slug: string;
  price: number;
  year: number;
  make: string;
  model: string;
  boatType: string;
  length: number;
  location: Location;
  images: string[];
  status: ListingStatus;
  createdAt: number;
  updatedAt: number;
}

export interface EnhancedListing extends Listing {
  engines: Engine[];
  engineConfiguration: EngineConfiguration;
  totalHorsepower: number;
  moderationWorkflow?: ModerationWorkflow;
  views: number;
}

export interface Engine {
  engineId: string;
  listingId: string;
  type: EngineType;
  manufacturer?: string;
  model?: string;
  horsepower: number;
  fuelType: FuelType;
  hours?: number;
  year?: number;
  condition: EngineCondition;
  position: number;
  serialNumber?: string;
  lastService?: string;
}

// User Types
export interface User {
  id: string;
  userId: string;
  email: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface EnhancedUser extends User {
  customerType: CustomerType;
  tier: UserTierType;
  tierExpiration?: number;
  capabilities: UserCapability[];
  listingsCount: number;
  maxListings: number;
  profile?: UserProfile;
}

// Moderation Types
export interface ModerationWorkflow {
  moderationId: string;
  listingId: string;
  status: ModerationStatus;
  priority: ModerationPriority;
  assignedTo?: string;
  assignedTeam?: string;
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  decision?: ModerationDecision;
  feedback?: string;
  moderatorNotes?: string;
}

// Analytics Types
export interface AnalyticsMetrics {
  userMetrics: UserMetrics;
  listingMetrics: ListingMetrics;
  engagementMetrics: EngagementMetrics;
  geographicMetrics: GeographicMetrics;
}
```

### Enum Types

```typescript
export enum ListingStatus {
  ACTIVE = 'active',
  PENDING_REVIEW = 'pending_review',
  UNDER_REVIEW = 'under_review',
  CHANGES_REQUESTED = 'changes_requested',
  REJECTED = 'rejected',
  SOLD = 'sold',
  EXPIRED = 'expired'
}

export enum UserTierType {
  FREE = 'FREE',
  DEALER = 'DEALER',
  PREMIUM = 'PREMIUM'
}

export enum AdminPermission {
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  CONTENT_MODERATION = 'CONTENT_MODERATION',
  FINANCIAL_ACCESS = 'FINANCIAL_ACCESS',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
  ANALYTICS_VIEW = 'ANALYTICS_VIEW',
  AUDIT_LOG_VIEW = 'AUDIT_LOG_VIEW',
  TIER_MANAGEMENT = 'TIER_MANAGEMENT',
  BILLING_MANAGEMENT = 'BILLING_MANAGEMENT',
  TEAM_MANAGEMENT = 'TEAM_MANAGEMENT'
}
```

---

## Testing Strategy

### Backend Testing

**Unit Tests:**
```typescript
// Example: backend/src/listing/listing.test.ts
describe('Listing Service', () => {
  describe('createListing', () => {
    it('should create a listing with valid data', async () => {
      const listing = await createListing(validListingData);
      expect(listing.listingId).toBeDefined();
      expect(listing.status).toBe('pending_review');
    });

    it('should reject listing with invalid price', async () => {
      await expect(
        createListing({ ...validListingData, price: -100 })
      ).rejects.toThrow('Invalid price');
    });
  });
});
```

**Integration Tests:**
```typescript
// Example: backend/src/admin-service/admin-service.integration.test.ts
describe('Admin Service Integration', () => {
  it('should fetch dashboard metrics', async () => {
    const event = createMockEvent({
      path: '/admin/dashboard/metrics',
      httpMethod: 'GET',
    });

    const response = await handler(event, {});
    expect(response.statusCode).toBe(200);
    
    const body = JSON.parse(response.body);
    expect(body.metrics).toBeDefined();
  });
});
```

### Frontend Testing

**Component Tests:**
```typescript
// Example: frontend/src/components/listing/__tests__/ListingCard.test.tsx
describe('ListingCard', () => {
  it('renders listing information', () => {
    render(<ListingCard listing={mockListing} />);
    
    expect(screen.getByText(mockListing.title)).toBeInTheDocument();
    expect(screen.getByText(`$${mockListing.price}`)).toBeInTheDocument();
  });

  it('handles click event', () => {
    const onClick = jest.fn();
    render(<ListingCard listing={mockListing} onClick={onClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith(mockListing.listingId);
  });
});
```

**Hook Tests:**
```typescript
// Example: frontend/src/hooks/__tests__/useAuth.test.ts
describe('useAuth', () => {
  it('should login successfully', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toBeDefined();
  });
});
```

---

## Performance Patterns

### Database Optimization

**1. Batch Operations:**
```typescript
// Instead of individual puts
for (const item of items) {
  await docClient.send(new PutCommand({ TableName, Item: item }));
}

// Use batch write
const chunks = chunkArray(items, 25);
for (const chunk of chunks) {
  await docClient.send(new BatchWriteCommand({
    RequestItems: {
      [TableName]: chunk.map(item => ({
        PutRequest: { Item: item }
      }))
    }
  }));
}
```

**2. Pagination:**
```typescript
// Always use pagination for large datasets
async function* paginateListings(limit = 20) {
  let lastKey = undefined;
  
  do {
    const result = await db.getListings(limit, lastKey);
    yield result.listings;
    lastKey = result.lastKey;
  } while (lastKey);
}
```

**3. Conditional Updates:**
```typescript
// Prevent unnecessary writes
await docClient.send(new UpdateCommand({
  TableName: LISTINGS_TABLE,
  Key: { listingId },
  UpdateExpression: 'SET #views = #views + :inc',
  ConditionExpression: 'attribute_exists(listingId)',
  ExpressionAttributeNames: { '#views': 'views' },
  ExpressionAttributeValues: { ':inc': 1 }
}));
```

### Frontend Optimization

**1. React Query Optimistic Updates:**
```typescript
const updateMutation = useMutation({
  mutationFn: updateListing,
  onMutate: async (newData) => {
    await queryClient.cancelQueries(['listing', listingId]);
    const previousData = queryClient.getQueryData(['listing', listingId]);
    
    queryClient.setQueryData(['listing', listingId], newData);
    return { previousData };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['listing', listingId], context.previousData);
  },
});
```

**2. Code Splitting:**
```typescript
// Lazy load routes
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));

// Use Suspense
<Suspense fallback={<LoadingSpinner />}>
  <AdminDashboard />
</Suspense>
```

**3. Memoization:**
```typescript
// Expensive computations
const calculatedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);

// Callback stability
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

---

## Conclusion

This technical documentation provides deep implementation details for the HarborList Marketplace platform. For high-level application flows, refer to `APPLICATION_FLOWS.md`.

**Key References:**
- Database Schema: See individual table sections
- API Endpoints: See endpoints reference
- Type Definitions: `packages/shared-types/src/`
- Testing: `**/__tests__/` directories
