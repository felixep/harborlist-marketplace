# 🔌 HarborList API Reference Documentation

## 📋 **Overview**

The HarborList API is a RESTful service built on AWS Lambda microservices and API Gateway, providing comprehensive endpoints for boat marketplace operations. This documentation reflects the current implementation as of October 2025, based on the actual deployed codebase.

### **Current Architecture**
- **Runtime**: Node.js 18 with TypeScript
- **API Gateway**: REST API with CORS enabled
- **Authentication**: JWT tokens with AWS Secrets Manager
- **Database**: DynamoDB with optimized GSI indexes
- **File Storage**: S3 with presigned URL generation
- **Monitoring**: CloudWatch metrics and SNS alerting

---

## 🌐 **Base Configuration**

### **API Endpoints (Current Deployment)**

```bash
# Main API Gateway endpoint (environment-specific)
API_BASE_URL="https://[api-gateway-id].execute-api.[region].amazonaws.com/prod"

# Custom domain (when configured with Cloudflare)
CUSTOM_API_URL="https://api.harborlist.com"
```

### **Environment Configuration**
```typescript
// Current environment setup from infrastructure
const environments = {
  dev: {
    stage: 'dev',
    domainName: 'dev-api.harborlist.com',
    corsOrigins: ['http://localhost:5173', 'https://dev.harborlist.com']
  },
  staging: {
    stage: 'staging', 
    domainName: 'staging-api.harborlist.com',
    corsOrigins: ['https://staging.harborlist.com']
  },
  prod: {
    stage: 'prod',
    domainName: 'api.harborlist.com', 
    corsOrigins: ['https://harborlist.com']
  }
};
```

### **Request Headers**
```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <jwt_token>  # For authenticated endpoints
X-Requested-With: XMLHttpRequest   # For CORS preflight
X-Request-ID: <uuid>               # Optional request tracking
```

---

## � **Current API Gateway Routes (Deployed)**

### **Route Configuration**
Based on the actual CDK infrastructure deployment:

```typescript
// Enhanced API Gateway configuration from boat-listing-stack.ts
const apiRoutes = {
  // Public endpoints
  'GET /listings': 'listingFunction',
  'GET /listings/{slug}': 'listingFunction', // SEO-friendly URLs
  'GET /listings/{id}': 'listingFunction', // Legacy ID support
  'POST /search': 'searchFunction', // Enhanced multi-engine search
  'GET /stats/platform': 'statsFunction',
  
  // Authentication endpoints  
  'POST /auth/login': 'authFunction',
  'POST /auth/register': 'authFunction', // Enhanced with user types
  'POST /auth/admin/login': 'authFunction',
  'POST /auth/refresh': 'authFunction',
  'POST /auth/logout': 'authFunction',
  
  // Protected user endpoints (require JWT)
  'POST /listings': 'listingFunction', // Multi-engine support
  'PUT /listings/{id}': 'listingFunction',
  'DELETE /listings/{id}': 'listingFunction',
  'POST /media': 'mediaFunction',
  'POST /email': 'emailFunction',
  
  // Enhanced user management endpoints
  'GET /users/profile': 'userFunction',
  'PUT /users/profile': 'userFunction',
  'POST /users/upgrade': 'userFunction', // Premium upgrades
  'GET /users/capabilities': 'userFunction',
  
  // Finance calculator endpoints
  'POST /finance/calculate': 'financeFunction',
  'POST /finance/save': 'financeFunction',
  'GET /finance/calculations': 'financeFunction',
  'POST /finance/share': 'financeFunction',
  
  // Billing endpoints
  'GET /billing/account': 'billingFunction',
  'POST /billing/payment-method': 'billingFunction',
  'POST /billing/subscription': 'billingFunction',
  'GET /billing/transactions': 'billingFunction',
  'POST /billing/refund': 'billingFunction',
  
  // Admin endpoints (require admin JWT + permissions)
  'GET /admin': 'adminFunction',
  'POST /admin': 'adminFunction', 
  'PUT /admin': 'adminFunction',
  'DELETE /admin': 'adminFunction',
  
  // Enhanced admin endpoints
  'GET /admin/users': 'adminFunction', // User tier management
  'PUT /admin/users/{id}/tier': 'adminFunction',
  'GET /admin/moderation/queue': 'adminFunction',
  'POST /admin/moderation/decision': 'adminFunction',
  'GET /admin/billing/overview': 'adminFunction',
  'GET /admin/analytics/dashboard': 'adminFunction',
  
  // Sales role endpoints
  'GET /sales/customers': 'userFunction',
  'PUT /sales/customers/{id}/plan': 'userFunction',
  'POST /sales/customers/{id}/capabilities': 'userFunction',
  
  'ANY /admin/{proxy+}': 'adminFunction' // Catch-all for admin routes
};
```

---

## 🔐 **Authentication - Deep Implementation**

### **Current JWT Implementation Details**

```typescript
// Actual JWT payload structure from auth-service/index.ts
interface JWTTokenPayload {
  sub: string;        // User ID (DynamoDB PK)
  email: string;      // User email for identification  
  name: string;       // User display name
  role: 'user' | 'admin' | 'superadmin';  // Role-based access
  iat: number;        // Issued at (Unix timestamp)
  exp: number;        // Expires at (Unix timestamp)
  jti: string;        // JWT ID for token blacklisting
  aud: string;        // Audience: 'harborlist-marketplace'
  iss: string;        // Issuer: 'auth-service'
}

// Admin-specific payload extensions
interface AdminJWTPayload extends JWTTokenPayload {
  permissions: AdminPermission[];  // Granular permissions
  sessionId: string;              // Admin session tracking
  mfaVerified: boolean;          // MFA verification status
  lastActivity: number;          // Session activity tracking
}
```

### **Current Authentication Endpoints**

#### **POST /auth/login** 
User authentication with security features.

**Implementation**: `auth-service/index.ts -> handleLogin()`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Current Response Structure:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_string_here",
    "user": {
      "id": "user-uuid-here",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "createdAt": 1696291200000,
      "verified": true
    },
    "expiresIn": 900,  // 15 minutes in seconds
    "tokenType": "Bearer"
  },
  "requestId": "req-uuid-here"
}
```

**Security Features Implemented:**
- Bcrypt password hashing with salt rounds: 12
- Rate limiting: 5 attempts per IP per 15 minutes
- Account lockout: 5 failed attempts locks account for 30 minutes  
- Login attempt tracking in `boat-login-attempts` table
- IP address and User-Agent logging for security analysis
- Session fingerprinting for anomaly detection

#### **POST /auth/admin/login**
Admin authentication with MFA requirement.

**Implementation**: `auth-service/index.ts -> handleAdminLogin()`

**Request:**
```json
{
  "email": "admin@harborlist.com",
  "password": "adminSecurePassword",
  "mfaToken": "123456"  // TOTP token (optional on first step)
}
```

**Two-Step Response Process:**

**Step 1 - Password Verification:**
```json
{
  "success": true,
  "data": {
    "requiresMFA": true,
    "mfaSetup": false,  // true if MFA needs to be set up
    "sessionId": "temp-session-id",
    "qrCode": "data:image/png;base64,..."  // If MFA setup required
  }
}
```

**Step 2 - MFA Verification:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "admin-uuid",
      "email": "admin@harborlist.com",
      "name": "Admin User",
      "role": "admin",
      "permissions": [
        "USER_MANAGEMENT",
        "CONTENT_MODERATION", 
        "ANALYTICS_READ"
      ]
    },
    "session": {
      "sessionId": "session-uuid",
      "expiresAt": 1696295400000,  // 1 hour from now
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0..."
    },
    "expiresIn": 1800  // 30 minutes
  }
}
```

#### **POST /auth/register**
User registration with validation.

**Implementation**: `auth-service/index.ts -> handleRegister()`

**Request Validation (Current):**
```json
{
  "name": "John Doe",          // Required, 2-50 characters
  "email": "user@example.com", // Required, valid email format
  "password": "SecurePass123!" // Required, 8+ chars, uppercase, lowercase, number, special
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "new-user-uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "status": "active",
      "createdAt": 1696291200000,
      "verified": false  // Email verification pending
    },
    "expiresIn": 900
  },
  "message": "Registration successful. Please check your email for verification."
}
```

**Current Validation Rules:**
- Email uniqueness check against `boat-users` table
- Password strength validation (implemented in shared/utils.ts)
- Input sanitization to prevent XSS attacks
- Rate limiting: 3 registrations per IP per hour

---

## 🚢 **Listing Endpoints - Current Implementation**

### **GET /listings**
Retrieve boat listings with pagination and filtering.

**Implementation**: `listing/index.ts -> handleGetListings()`

**Query Parameters (Current):**
```typescript
interface ListingQueryParams {
  page?: string;          // Default: "1"
  limit?: string;         // Default: "20", Max: "100"
  status?: 'active' | 'inactive' | 'sold';
  priceMin?: string;      // Minimum price filter
  priceMax?: string;      // Maximum price filter  
  state?: string;         // US state abbreviation (e.g., "FL")
  city?: string;          // City name filter
  boatType?: string;      // Boat type filter
  yearMin?: string;       // Minimum year
  yearMax?: string;       // Maximum year
  lengthMin?: string;     // Minimum length in feet
  lengthMax?: string;     // Maximum length in feet
  sortBy?: 'price' | 'date' | 'views';  // Sort field
  sortOrder?: 'asc' | 'desc';           // Sort direction
}
```

**Example Request:**
```http
GET /listings?page=1&limit=20&status=active&state=FL&priceMin=50000&priceMax=500000&sortBy=price&sortOrder=desc
```

**Current Response Structure:**
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "listingId": "listing-uuid-123",
        "ownerId": "user-uuid-456",
        "title": "2018 Sea Ray Sundancer 350", 
        "description": "Beautiful boat in excellent condition...",
        "price": 285000,
        "location": {
          "city": "Miami",
          "state": "FL",
          "zipCode": "33101",
          "coordinates": {
            "lat": 25.7617,
            "lon": -80.1918
          }
        },
        "boatDetails": {
          "type": "Sport Cruiser",
          "manufacturer": "Sea Ray", 
          "model": "Sundancer 350",
          "year": 2018,
          "length": 35,
          "beam": 11.5,
          "draft": 2.8,
          "engine": "Twin MerCruiser 8.2L",
          "hours": 150,
          "condition": "Excellent"
        },
        "features": ["GPS Navigation", "Radar System", "Autopilot", "Generator"],
        "images": [
          "https://boat-listing-media-123456789.s3.amazonaws.com/listing-uuid-123/image1.jpg",
          "https://boat-listing-media-123456789.s3.amazonaws.com/listing-uuid-123/image2.jpg"
        ],
        "thumbnails": [
          "https://boat-listing-media-123456789.s3.amazonaws.com/listing-uuid-123/thumb1.jpg"
        ],
        "status": "active",
        "views": 45,
        "createdAt": 1696204800000,
        "updatedAt": 1696291200000
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 15,
      "totalItems": 285,
      "itemsPerPage": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "filters": {
      "appliedFilters": {
        "status": "active",
        "state": "FL", 
        "priceRange": [50000, 500000]
      },
      "availableFilters": {
        "states": ["FL", "CA", "TX", "NY"],
        "boatTypes": ["Sport Cruiser", "Center Console", "Sailboat"],
        "priceRanges": {
          "min": 5000,
          "max": 2500000
        }
      }
    }
  },
  "requestId": "req-uuid-here",
  "processingTime": 145  // milliseconds
}
```

### **GET /listings/{id}**
Get specific listing with view tracking.

**Implementation**: `listing/index.ts -> handleGetListing()`

**Parameters:**
- `id` (path): Listing UUID (required)

**Current Features:**
- View count increment (anonymous tracking)
- Owner contact information (authenticated users only)
- Related listings suggestions
- SEO-optimized response

**Response:**
```json
{
  "success": true,
  "data": {
    "listingId": "listing-uuid-123",
    "ownerId": "user-uuid-456",
    "title": "2018 Sea Ray Sundancer 350",
    "description": "Beautiful boat in excellent condition. Well maintained with service records...",
    "price": 285000,
    "location": {
      "city": "Miami",
      "state": "FL",
      "zipCode": "33101",
      "coordinates": {
        "lat": 25.7617,
        "lon": -80.1918
      },
      "marina": "Miami Beach Marina",
      "slipNumber": "A-45"
    },
    "boatDetails": {
      "type": "Sport Cruiser",
      "manufacturer": "Sea Ray",
      "model": "Sundancer 350",
      "year": 2018,
      "length": 35,
      "beam": 11.5,
      "draft": 2.8,
      "displacement": 12500,
      "engine": "Twin MerCruiser 8.2L",
      "engineHours": 150,
      "fuel": "Gasoline",
      "fuelCapacity": 300,
      "condition": "Excellent",
      "hullMaterial": "Fiberglass"
    },
    "features": [
      "GPS Navigation System",
      "Radar with Chart Plotter", 
      "Autopilot",
      "Generator - 5.5kW",
      "Air Conditioning",
      "Full Galley with Microwave",
      "Master Stateroom",
      "Guest Cabin",
      "Electric Windlass"
    ],
    "images": [
      {
        "url": "https://boat-listing-media-123456789.s3.amazonaws.com/listing-uuid-123/image1.jpg",
        "thumbnail": "https://boat-listing-media-123456789.s3.amazonaws.com/listing-uuid-123/thumb1.jpg",
        "caption": "Exterior starboard view",
        "order": 1
      },
      {
        "url": "https://boat-listing-media-123456789.s3.amazonaws.com/listing-uuid-123/image2.jpg", 
        "thumbnail": "https://boat-listing-media-123456789.s3.amazonaws.com/listing-uuid-123/thumb2.jpg",
        "caption": "Helm station",
        "order": 2
      }
    ],
    "videos": [
      {
        "url": "https://boat-listing-media-123456789.s3.amazonaws.com/listing-uuid-123/video1.mp4",
        "thumbnail": "https://boat-listing-media-123456789.s3.amazonaws.com/listing-uuid-123/video1-thumb.jpg",
        "duration": 120,
        "title": "Engine room walkthrough"
      }
    ],
    "status": "active",
    "views": 46,  // Incremented after this request
    "createdAt": 1696204800000,
    "updatedAt": 1696291200000,
    "lastViewedAt": 1696291200000,
    "ownerInfo": {  // Only visible to authenticated users
      "name": "John Smith",
      "phone": "+1-555-0123",
      "email": "johnsmith@example.com",
      "preferredContact": "phone",
      "responseTime": "Within 2 hours"
    },
    "marketAnalysis": {
      "averagePrice": 275000,
      "pricePercentile": 85,
      "daysOnMarket": 45,
      "similarListings": 12
    },
    "seo": {
      "slug": "2018-sea-ray-sundancer-350-miami-fl",
      "metaTitle": "2018 Sea Ray Sundancer 350 for Sale in Miami, FL - $285,000",
      "metaDescription": "Beautiful 2018 Sea Ray Sundancer 350 for sale in Miami, FL. Excellent condition with low hours. Contact owner for viewing."
    }
  },
  "requestId": "req-uuid-here"
}
```

### **POST /listings** 🔒
Create new boat listing (authenticated users only).

**Implementation**: `listing/index.ts -> handleCreateListing()`
**Authentication**: JWT required, `listing-service/auth.ts -> requireAuth()`

**Request Headers:**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body Validation (Current Schema):**
```json
{
  "title": "2020 Boston Whaler 285 Conquest",           // Required, 10-100 chars
  "description": "Exceptional fishing and cruising...", // Required, max 5000 chars  
  "price": 195000,                                     // Required, positive number
  "location": {                                        // Required
    "city": "Fort Lauderdale",                        // Required, max 50 chars
    "state": "FL",                                    // Required, 2 chars
    "zipCode": "33316"                                // Optional, format validation
  },
  "boatDetails": {                                     // Required
    "type": "Center Console",                         // Required, enum validation
    "manufacturer": "Boston Whaler",                  // Optional, max 50 chars
    "model": "285 Conquest",                         // Optional, max 50 chars
    "year": 2020,                                    // Required, 1900-2030
    "length": 28.5,                                  // Required, 10-500 feet
    "beam": 10.5,                                    // Optional, max 50 feet
    "draft": 1.8,                                    // Optional, max 20 feet
    "engine": "Twin Mercury 300HP",                  // Optional, max 100 chars
    "hours": 75,                                     // Optional, non-negative
    "condition": "Excellent"                         // Required, enum
  },
  "features": [                                      // Optional array
    "GPS Navigation",
    "Fishfinder", 
    "Livewell",
    "T-Top"
  ],
  "images": [                                        // Optional, uploaded separately
    "temp-image-id-1",
    "temp-image-id-2"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "listingId": "listing-new-uuid-789",
    "message": "Listing created successfully",
    "status": "active",
    "createdAt": 1696291200000,
    "estimatedValue": {
      "min": 180000,
      "max": 210000,
      "confidence": 0.85
    },
    "nextSteps": [
      "Upload high-quality images",
      "Add detailed boat specifications", 
      "Complete ownership verification"
    ]
  },
  "requestId": "req-uuid-here"
}
```

**Current Validation & Processing:**
- Input sanitization via shared/utils.ts
- Price validation and market analysis
- Automatic coordinate lookup from city/state
- Duplicate listing detection (title + owner similarity)
- Auto-generated SEO-friendly slug
- Owner verification required for high-value listings (>$100k)

---

## 🔍 **Search Service - Advanced Implementation**

### **POST /search**
Advanced search with filters and ranking.

**Implementation**: `search/index.ts -> handleSearch()`
**Current Search Strategy**: DynamoDB scan with client-side filtering (OpenSearch integration planned)

**Request Body:**
```json
{
  "query": "Sea Ray cruiser",                    // Full-text search query
  "filters": {
    "priceRange": {
      "min": 50000,
      "max": 500000
    },
    "location": {
      "state": "FL",                            // State filter
      "city": "Miami",                          // City filter (optional)
      "radius": 50,                            // Miles from city center
      "coordinates": {                         // Search by proximity
        "lat": 25.7617,
        "lon": -80.1918,
        "radius": 25
      }
    },
    "boatDetails": {
      "type": ["Sport Cruiser", "Motor Yacht"], // Multiple types
      "manufacturer": ["Sea Ray", "Azimut"],    // Multiple manufacturers  
      "yearRange": {
        "min": 2015,
        "max": 2023
      },
      "lengthRange": {
        "min": 30,
        "max": 60
      },
      "condition": ["Excellent", "Good"],       // Condition filters
      "engineType": "Diesel"                    // Engine preference
    },
    "features": [                              // Must have features
      "GPS Navigation",
      "Generator"
    ],
    "availability": {
      "status": ["active"],                    // Listing status
      "priceReduced": true,                   // Recently price-reduced
      "newListings": 30                       // Listed within X days
    }
  },
  "sort": {
    "field": "price",                         // price, date, views, relevance
    "direction": "desc",                      // asc, desc
    "secondary": {                           // Secondary sort
      "field": "date", 
      "direction": "desc"
    }
  },
  "pagination": {
    "page": 1,
    "limit": 20
  },
  "options": {
    "includeAnalytics": true,                // Include market analysis
    "includeSimilar": true,                  // Include similar listings
    "facets": ["manufacturer", "type", "state"] // Return faceted counts
  }
}
```

**Response with Enhanced Data:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "listingId": "listing-uuid-123",
        "title": "2018 Sea Ray Sundancer 350",
        "price": 285000,
        "location": {
          "city": "Miami",
          "state": "FL",
          "distance": 12.5  // Miles from search center
        },
        "images": ["url1", "url2"],
        "relevanceScore": 0.95,              // Search relevance (0-1)
        "matchedFeatures": [                 // Which search criteria matched
          "manufacturer:Sea Ray",
          "type:Sport Cruiser", 
          "features:GPS Navigation"
        ],
        "marketIndicators": {
          "pricePercentile": 75,             // Price compared to similar
          "daysOnMarket": 45,
          "viewTrend": "increasing"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 8,
      "totalResults": 156,
      "resultsPerPage": 20
    },
    "searchMeta": {
      "query": "Sea Ray cruiser",
      "executionTime": 234,                  // Search time in ms
      "totalScanned": 1247,                 // Total records scanned
      "filtersApplied": 6,
      "suggestions": [                       // Query suggestions
        "Sea Ray Sundancer",
        "Sea Ray Express Cruiser"
      ]
    },
    "facets": {                             // Aggregated filter options
      "manufacturer": {
        "Sea Ray": 45,
        "Azimut": 23, 
        "Princess": 18
      },
      "type": {
        "Sport Cruiser": 67,
        "Motor Yacht": 34,
        "Express Cruiser": 28
      },
      "state": {
        "FL": 89,
        "CA": 34,
        "TX": 23
      }
    },
    "marketAnalysis": {
      "averagePrice": 312000,
      "medianPrice": 285000,
      "priceRange": [145000, 850000],
      "totalInventory": 156,
      "newListingsThisWeek": 12
    }
  },
  "requestId": "search-uuid-here"
}
```

---

## 🛡️ **Admin Endpoints - Comprehensive Management**

### **Admin Authentication Required**
All admin endpoints require:
```http
Authorization: Bearer <admin_jwt_token>
X-Admin-Session: <session_id>
```

### **GET /admin/dashboard**
Admin dashboard with real-time metrics.

**Implementation**: `admin-service/index.ts -> handleGetDashboard()`
**Required Permission**: `ANALYTICS_READ`

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 3456,
      "activeUsers": 1234,                  // Active in last 30 days
      "newUsersToday": 23,
      "totalListings": 1247,
      "activeListings": 892,
      "newListingsToday": 12,
      "totalViews": 125890,
      "viewsToday": 2341,
      "flaggedContent": 5,
      "pendingApprovals": 8
    },
    "systemHealth": {
      "status": "healthy",                  // healthy, degraded, critical
      "apiResponseTime": 145,               // Average response time (ms)
      "databaseLatency": 23,               // Database latency (ms)
      "errorRate": 0.02,                   // Error rate (0-1)
      "uptime": 99.97                      // Uptime percentage
    },
    "recentActivity": [
      {
        "id": "activity-123",
        "type": "user_registration",
        "description": "New user registered: john@example.com",
        "timestamp": 1696291200000,
        "severity": "info"
      },
      {
        "id": "activity-124", 
        "type": "listing_flagged",
        "description": "Listing flagged for inappropriate content",
        "timestamp": 1696291140000,
        "severity": "warning",
        "listingId": "listing-456"
      }
    ],
    "alerts": [
      {
        "id": "alert-789",
        "type": "high_error_rate",
        "message": "API error rate above threshold (3.2%)",
        "severity": "warning",
        "timestamp": 1696291200000,
        "acknowledged": false
      }
    ],
    "performanceMetrics": {
      "requestsPerMinute": 145,
      "peakConcurrentUsers": 89,
      "memoryUsage": 67.5,                 // Percentage
      "cpuUsage": 45.2                     // Percentage
    }
  },
  "generatedAt": 1696291200000,
  "cacheExpiry": 300                       // Seconds until refresh needed
}
```

### **GET /admin/users**
User management with advanced filtering.

**Implementation**: `admin-service/index.ts -> handleGetUsers()`
**Required Permission**: `USER_READ`

**Query Parameters:**
```http
GET /admin/users?page=1&limit=25&search=john&status=active&role=user&sortBy=createdAt&sortOrder=desc&flagged=false
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-uuid-123",
        "email": "john.doe@example.com",
        "name": "John Doe",
        "role": "user",
        "status": "active",                 // active, suspended, banned
        "createdAt": 1696204800000,
        "lastLoginAt": 1696291200000,
        "emailVerified": true,
        "profile": {
          "phone": "+1-555-0123",
          "location": {
            "city": "Miami",
            "state": "FL"
          },
          "preferredContact": "email"
        },
        "activity": {
          "listingsCount": 3,
          "totalViews": 1456,
          "messagesExchanged": 28,
          "averageResponseTime": "2 hours",
          "lastActivity": 1696291200000
        },
        "moderation": {
          "flaggedContent": 0,
          "violations": 0,
          "warningsIssued": 0,
          "trustScore": 95.5              // 0-100 trust score
        },
        "analytics": {
          "loginFrequency": "Daily",
          "sessionDuration": 1847,        // Average seconds
          "deviceTypes": ["Desktop", "Mobile"],
          "locations": ["Miami, FL", "Fort Lauderdale, FL"]
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 35,
      "totalUsers": 856,
      "usersPerPage": 25
    },
    "aggregates": {
      "totalActive": 789,
      "totalSuspended": 45,
      "totalBanned": 22,
      "newThisMonth": 67,
      "avgTrustScore": 87.3
    }
  }
}
```

### **PUT /admin/users/{id}/status**
Update user status with audit trail.

**Implementation**: `admin-service/index.ts -> handleUpdateUserStatus()`
**Required Permission**: `USER_WRITE`

**Request:**
```json
{
  "status": "suspended",
  "reason": "Violation of terms of service",
  "notes": "Multiple reports of inappropriate listing content",
  "duration": 7,                          // Days (optional, for temporary actions)
  "notifyUser": true,                     // Send notification email
  "escalate": false                       // Flag for senior admin review
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid-123",
    "previousStatus": "active",
    "newStatus": "suspended",
    "effectiveDate": 1696291200000,
    "expiryDate": 1696896000000,          // If temporary suspension
    "auditLogId": "audit-uuid-456",
    "notificationSent": true,
    "moderatedBy": {
      "adminId": "admin-uuid-789",
      "adminName": "Admin User",
      "timestamp": 1696291200000
    }
  },
  "message": "User status updated successfully"
}
```

### **GET /admin/analytics/comprehensive**
Detailed platform analytics.

**Implementation**: `admin-service/index.ts -> handleGetComprehensiveAnalytics()`
**Required Permission**: `ANALYTICS_READ`

**Query Parameters:**
```http
GET /admin/analytics/comprehensive?startDate=2025-09-01&endDate=2025-09-30&granularity=daily&includeDetails=true
```

**Response (Comprehensive):**
```json
{
  "success": true,
  "data": {
    "dateRange": {
      "startDate": "2025-09-01",
      "endDate": "2025-09-30", 
      "totalDays": 30
    },
    "userAnalytics": {
      "registrations": {
        "total": 234,
        "daily": [8, 12, 6, 15, 9, 11, 7],  // Last 7 days
        "sources": {
          "organic": 156,
          "referral": 45,
          "direct": 33
        },
        "conversionRate": 23.5              // Visitor to registration %
      },
      "engagement": {
        "dailyActiveUsers": 1456,
        "weeklyActiveUsers": 3241,
        "monthlyActiveUsers": 8934,
        "averageSessionDuration": 847,      // Seconds
        "bounceRate": 32.1,                 // Percentage
        "returnUserRate": 68.7              // Percentage
      }
    },
    "listingAnalytics": {
      "creation": {
        "total": 123,
        "daily": [4, 6, 3, 8, 5, 7, 2],
        "categories": {
          "Sport Cruiser": 45,
          "Center Console": 34,
          "Sailboat": 28,
          "Motor Yacht": 16
        }
      },
      "performance": {
        "totalViews": 45678,
        "averageViewsPerListing": 28.5,
        "contactRate": 12.3,               // % of views that contact owner
        "conversionRate": 4.7              // % of listings that sell
      }
    },
    "geographicAnalytics": {
      "usersByState": {
        "FL": 2134,
        "CA": 1567,
        "TX": 1234,
        "NY": 987
      },
      "listingsByState": {
        "FL": 345,
        "CA": 234,
        "TX": 178,
        "NY": 156
      },
      "topMarkets": [
        {
          "city": "Miami",
          "state": "FL", 
          "users": 567,
          "listings": 89,
          "averagePrice": 285000
        }
      ]
    },
    "revenueAnalytics": {
      "projectedRevenue": 125000,          // Based on listing fees
      "paidListings": 89,
      "premiumFeatures": 34,
      "averageListingValue": 267000
    },
    "trends": {
      "growthRate": 15.7,                 // Month over month %
      "seasonality": {
        "peakMonths": ["March", "April", "May"],
        "lowMonths": ["December", "January"]
      },
      "priceMovement": {
        "averageChange": "+5.2%",
        "trendDirection": "increasing"
      }
    }
  },
  "generatedAt": 1696291200000,
  "processingTime": 1247                   // Milliseconds to generate
}
```
      "lastName": "Doe",
      "role": "user",
      "status": "active",
      "createdAt": "2024-01-15T08:30:00Z",
      "lastLoginAt": "2024-10-01T14:22:00Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "timestamp": "2024-10-01T14:22:00Z",
    "requestId": "req_abcd1234"
  }
}
```

#### **POST /api/v1/auth/register**
Register a new user account.

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1-555-123-4567",
  "agreeToTerms": true
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_0987654321",
      "email": "newuser@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "status": "pending_verification",
      "createdAt": "2024-10-01T14:22:00Z"
    },
    "message": "Verification email sent to newuser@example.com"
  }
}
```

#### **POST /api/v1/auth/refresh**
Refresh expired access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

#### **POST /api/v1/auth/logout**
Invalidate user tokens and end session.

**Request Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

---

## 🚢 **Listing Endpoints**

### **GET /api/v1/listings**
Search and filter boat listings.

**Query Parameters:**
```
?q=sailboat                     // Text search
&minPrice=25000                 // Minimum price filter
&maxPrice=100000                // Maximum price filter  
&boatType=sailboat              // Boat type filter
&location=San Francisco         // Location search
&minYear=2015                   // Minimum year
&maxYear=2024                   // Maximum year
&minLength=25                   // Minimum length (feet)
&maxLength=50                   // Maximum length (feet)
&sortBy=price                   // Sort field (price|date|length|year)
&sortOrder=asc                  // Sort order (asc|desc)
&page=1                         // Page number (1-based)
&limit=20                       // Results per page (max 100)
&featured=true                  // Featured listings only
&status=active                  // Listing status filter
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "lst_1234567890",
        "title": "Beautiful 35ft Catalina Sailboat",
        "description": "Well-maintained sailboat perfect for weekend adventures...",
        "price": 125000,
        "currency": "USD",
        "boatType": "sailboat",
        "manufacturer": "Catalina",
        "model": "C350",
        "year": 2020,
        "length": 35,
        "beam": 12.5,
        "draft": 5.5,
        "location": {
          "city": "San Francisco",
          "state": "CA",
          "country": "US",
          "coordinates": {
            "latitude": 37.7749,
            "longitude": -122.4194
          }
        },
        "images": [
          "https://cdn.harborlist.com/listings/lst_1234567890/image1.jpg",
          "https://cdn.harborlist.com/listings/lst_1234567890/image2.jpg"
        ],
        "featured": true,
        "status": "active",
        "viewCount": 156,
        "contactCount": 8,
        "favoriteCount": 23,
        "createdAt": "2024-09-15T10:30:00Z",
        "updatedAt": "2024-09-28T16:45:00Z",
        "publishedAt": "2024-09-16T08:00:00Z",
        "user": {
          "id": "usr_5678901234",
          "firstName": "Bob",
          "lastName": "Johnson",
          "memberSince": "2023-05-12T00:00:00Z",
          "responseRate": 95,
          "averageResponseTime": 240
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1247,
      "totalPages": 63,
      "hasMore": true
    },
    "aggregations": {
      "priceRanges": {
        "0-25000": 87,
        "25000-50000": 234,
        "50000-100000": 456,
        "100000-250000": 312,
        "250000+": 158
      },
      "boatTypes": {
        "sailboat": 567,
        "motorboat": 423,
        "yacht": 156,
        "catamaran": 89,
        "pontoon": 12
      },
      "locations": {
        "CA": 445,
        "FL": 321,
        "NY": 198,
        "TX": 156,
        "WA": 127
      }
    }
  }
}
```

### **GET /api/v1/listings/{id}**
Retrieve a specific boat listing by ID.

**Path Parameters:**
- `id` (string): Listing ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "listing": {
      "id": "lst_1234567890",
      "title": "Beautiful 35ft Catalina Sailboat",
      "description": "Well-maintained sailboat perfect for weekend adventures. Recently upgraded electronics and rigging. Includes trailer and full sail inventory.",
      "price": 125000,
      "currency": "USD",
      "boatType": "sailboat",
      "manufacturer": "Catalina",
      "model": "C350",
      "year": 2020,
      "length": 35,
      "beam": 12.5,
      "draft": 5.5,
      "engine": {
        "type": "inboard",
        "manufacturer": "Yanmar",
        "model": "3YM30",
        "horsepower": 29,
        "hours": 450,
        "fuelType": "diesel"
      },
      "location": {
        "city": "San Francisco",
        "state": "CA",
        "country": "US",
        "zipCode": "94105",
        "marina": "South Beach Marina",
        "coordinates": {
          "latitude": 37.7749,
          "longitude": -122.4194
        }
      },
      "images": [
        {
          "url": "https://cdn.harborlist.com/listings/lst_1234567890/image1.jpg",
          "caption": "Exterior port view",
          "isPrimary": true
        },
        {
          "url": "https://cdn.harborlist.com/listings/lst_1234567890/image2.jpg",
          "caption": "Interior salon",
          "isPrimary": false
        }
      ],
      "features": [
        "GPS Navigation System",
        "Autopilot",
        "Wind Instruments", 
        "Roller Furling Jib",
        "Full Batten Mainsail",
        "Electric Winches"
      ],
      "documents": [
        {
          "type": "registration",
          "url": "https://cdn.harborlist.com/docs/lst_1234567890/registration.pdf"
        },
        {
          "type": "survey",
          "url": "https://cdn.harborlist.com/docs/lst_1234567890/survey.pdf"
        }
      ],
      "tags": ["cruising", "well-maintained", "electronics", "turnkey"],
      "featured": true,
      "status": "active",
      "viewCount": 156,
      "contactCount": 8,
      "favoriteCount": 23,
      "createdAt": "2024-09-15T10:30:00Z",
      "updatedAt": "2024-09-28T16:45:00Z",
      "publishedAt": "2024-09-16T08:00:00Z",
      "user": {
        "id": "usr_5678901234",
        "firstName": "Bob",
        "lastName": "Johnson",
        "email": "bob@example.com",
        "phone": "+1-555-987-6543",
        "location": {
          "city": "San Francisco",
          "state": "CA"
        },
        "memberSince": "2023-05-12T00:00:00Z",
        "listingCount": 3,
        "responseRate": 95,
        "averageResponseTime": 240,
        "verified": true,
        "avatar": "https://cdn.harborlist.com/avatars/usr_5678901234.jpg"
      }
    }
  }
}
```

### **POST /api/v1/listings**
Create a new boat listing.

**Authentication:** Required

**Request:**
```json
{
  "title": "Beautiful 35ft Catalina Sailboat",
  "description": "Well-maintained sailboat perfect for weekend adventures...",
  "price": 125000,
  "currency": "USD",
  "boatType": "sailboat",
  "manufacturer": "Catalina",
  "model": "C350",
  "year": 2020,
  "length": 35,
  "beam": 12.5,
  "draft": 5.5,
  "engine": {
    "type": "inboard",
    "manufacturer": "Yanmar",
    "model": "3YM30",
    "horsepower": 29,
    "hours": 450,
    "fuelType": "diesel"
  },
  "location": {
    "city": "San Francisco",
    "state": "CA",
    "country": "US",
    "zipCode": "94105",
    "marina": "South Beach Marina"
  },
  "features": [
    "GPS Navigation System",
    "Autopilot",
    "Wind Instruments"
  ],
  "tags": ["cruising", "well-maintained", "electronics"]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "listing": {
      "id": "lst_9876543210",
      "title": "Beautiful 35ft Catalina Sailboat",
      "status": "draft",
      "moderationStatus": "pending",
      "createdAt": "2024-10-01T14:22:00Z",
      "updatedAt": "2024-10-01T14:22:00Z"
    },
    "message": "Listing created successfully. Please upload images to complete."
  }
}
```

### **PUT /api/v1/listings/{id}**
Update an existing listing.

**Authentication:** Required (must be listing owner)

**Path Parameters:**
- `id` (string): Listing ID

**Request:** (Same structure as POST, partial updates allowed)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "listing": {
      "id": "lst_1234567890",
      "title": "Updated Listing Title",
      "updatedAt": "2024-10-01T14:22:00Z"
    },
    "message": "Listing updated successfully"
  }
}
```

### **DELETE /api/v1/listings/{id}**
Delete a listing.

**Authentication:** Required (must be listing owner or admin)

**Path Parameters:**
- `id` (string): Listing ID

**Response (200):**
```json
{
  "success": true,
  "message": "Listing deleted successfully"
}
```

---

## 📸 **Media Endpoints**

### **POST /api/v1/listings/{id}/images**
Upload images for a listing.

**Authentication:** Required

**Request:** Multipart form data
```http
Content-Type: multipart/form-data

images[]: <file1.jpg>
images[]: <file2.jpg>
captions[]: "Exterior view"
captions[]: "Interior salon"
isPrimary[]: true
isPrimary[]: false
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "images": [
      {
        "id": "img_1234567890",
        "url": "https://cdn.harborlist.com/listings/lst_1234567890/image1.jpg",
        "caption": "Exterior view",
        "isPrimary": true,
        "uploadedAt": "2024-10-01T14:22:00Z"
      }
    ]
  }
}
```

### **DELETE /api/v1/listings/{listingId}/images/{imageId}**
Delete a listing image.

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

---

## 👤 **User Endpoints**

### **GET /api/v1/user/profile**
Get current user profile.

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_1234567890",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1-555-123-4567",
      "location": {
        "city": "San Francisco",
        "state": "CA",
        "country": "US"
      },
      "avatar": "https://cdn.harborlist.com/avatars/usr_1234567890.jpg",
      "memberSince": "2023-05-12T00:00:00Z",
      "listingCount": 5,
      "responseRate": 95,
      "averageResponseTime": 240,
      "verified": true,
      "plan": {
        "type": "premium",
        "maxListings": 10,
        "featuredListings": 2,
        "expiresAt": "2024-12-15T23:59:59Z"
      },
      "preferences": {
        "emailNotifications": true,
        "smsNotifications": false,
        "newsletter": true,
        "marketingEmails": false
      }
    }
  }
}
```

### **PUT /api/v1/user/profile**
Update user profile.

**Authentication:** Required

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe", 
  "phone": "+1-555-123-4567",
  "location": {
    "city": "San Francisco",
    "state": "CA"
  },
  "preferences": {
    "emailNotifications": true,
    "smsNotifications": false
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_1234567890",
      "updatedAt": "2024-10-01T14:22:00Z"
    }
  },
  "message": "Profile updated successfully"
}
```

### **GET /api/v1/user/listings**
Get user's listings.

**Authentication:** Required

**Query Parameters:**
```
?status=active          // Filter by status
&page=1                 // Page number
&limit=20               // Results per page
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "lst_1234567890",
        "title": "Beautiful 35ft Catalina Sailboat",
        "price": 125000,
        "status": "active",
        "viewCount": 156,
        "contactCount": 8,
        "favoriteCount": 23,
        "createdAt": "2024-09-15T10:30:00Z",
        "updatedAt": "2024-09-28T16:45:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1,
      "hasMore": false
    }
  }
}
```

---

## 📊 **Admin Endpoints**

### **GET /api/v1/admin/stats**
Get platform statistics.

**Authentication:** Required (Admin)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 15647,
      "active": 12456,
      "new": 234,
      "growth": 5.2
    },
    "listings": {
      "total": 8921,
      "active": 7234,
      "pending": 156,
      "growth": 3.8
    },
    "revenue": {
      "monthly": 45600,
      "yearly": 478900,
      "growth": 12.5
    },
    "activity": {
      "dailyActiveUsers": 2456,
      "searchesPerDay": 15678,
      "contactsPerDay": 234
    }
  }
}
```

### **GET /api/v1/admin/users**
Get users for admin management.

**Authentication:** Required (Admin)

**Query Parameters:**
```
?search=john@example.com    // Search by email/name
&status=active              // Filter by status
&role=user                  // Filter by role
&page=1                     // Page number
&limit=50                   // Results per page
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "usr_1234567890",
        "email": "john@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "status": "active",
        "role": "user",
        "listingCount": 3,
        "lastLoginAt": "2024-10-01T10:30:00Z",
        "createdAt": "2023-05-12T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 15647,
      "totalPages": 313,
      "hasMore": true
    }
  }
}
```

### **PUT /api/v1/admin/users/{id}/status**
Update user status.

**Authentication:** Required (Admin)

**Request:**
```json
{
  "status": "suspended",
  "reason": "Terms violation",
  "notes": "Repeated policy violations"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User status updated successfully"
}
```

---

## ⚠️ **Error Handling**

### **Error Response Format**

All API errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Specific field error information"
    },
    "timestamp": "2024-10-01T14:22:00Z",
    "requestId": "req_abcd1234",
    "documentation": "https://docs.harborlist.com/api/errors#ERROR_CODE"
  }
}
```

### **HTTP Status Codes**

| Status | Code | Description | Common Scenarios |
|--------|------|-------------|------------------|
| **200** | OK | Request successful | GET, PUT successful |
| **201** | Created | Resource created | POST successful |
| **204** | No Content | Request successful, no body | DELETE successful |
| **400** | Bad Request | Invalid request data | Validation errors |
| **401** | Unauthorized | Authentication required | Missing/invalid token |
| **403** | Forbidden | Insufficient permissions | Role restrictions |
| **404** | Not Found | Resource not found | Invalid ID |
| **409** | Conflict | Resource conflict | Duplicate data |
| **422** | Unprocessable Entity | Validation failed | Business rule violations |
| **429** | Too Many Requests | Rate limit exceeded | API quota exceeded |
| **500** | Internal Server Error | Server error | System failures |
| **503** | Service Unavailable | Service down | Maintenance mode |

### **Common Error Codes**

#### **Authentication Errors**
- `INVALID_CREDENTIALS`: Invalid email/password combination
- `TOKEN_EXPIRED`: JWT token has expired
- `TOKEN_INVALID`: JWT token is malformed or invalid
- `MFA_REQUIRED`: Multi-factor authentication required
- `ACCOUNT_SUSPENDED`: User account is suspended
- `ACCOUNT_UNVERIFIED`: Email verification required

#### **Authorization Errors**
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `RESOURCE_FORBIDDEN`: Cannot access this resource
- `PLAN_LIMIT_EXCEEDED`: User plan limits exceeded

#### **Validation Errors**
- `REQUIRED_FIELD`: Required field missing
- `INVALID_FORMAT`: Field format is invalid
- `VALUE_OUT_OF_RANGE`: Value outside acceptable range
- `DUPLICATE_VALUE`: Value already exists

#### **Resource Errors**
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `RESOURCE_DELETED`: Resource has been deleted
- `RESOURCE_LOCKED`: Resource is locked for editing

#### **Rate Limiting Errors**
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `QUOTA_EXCEEDED`: API quota exceeded
- `CONCURRENT_LIMIT`: Too many concurrent requests

---

## 🔄 **Rate Limiting**

### **Rate Limits by Endpoint Type**

| Endpoint Type | Rate Limit | Time Window |
|---------------|------------|-------------|
| **Authentication** | 5 requests | 1 minute |
| **Search/Browse** | 100 requests | 1 minute |
| **CRUD Operations** | 60 requests | 1 minute |
| **Image Upload** | 10 requests | 1 minute |
| **Admin Operations** | 200 requests | 1 minute |

### **Rate Limit Headers**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1633024800
X-RateLimit-Window: 60
```

---

## 📋 **Pagination**

### **Standard Pagination**

All list endpoints support pagination using query parameters:

```http
GET /api/v1/listings?page=1&limit=20
```

### **Pagination Response**

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1247,
    "totalPages": 63,
    "hasMore": true,
    "nextPage": 2,
    "prevPage": null
  }
}
```

---

## 🔗 **Related Documentation**

- **🔐 [Authentication Guide](../frontend/authentication.md)**: Detailed authentication implementation
- **🗄️ [Database Schema](../backend/database.md)**: Data models and relationships  
- **🛡️ [Security Framework](../security/README.md)**: Security implementation details
- **🧪 [API Testing](../testing/README.md)**: API testing strategies and examples
- **🔧 [Integration Guide](./integration.md)**: Client integration examples

---

**📅 Last Updated**: October 2025  
**📝 Document Version**: 1.0.0  
**👥 API Team**: HarborList Backend Team  
**🔄 Next Review**: January 2026