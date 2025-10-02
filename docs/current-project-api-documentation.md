# 🔌 HarborList API Documentation

## 📋 **Overview**

The HarborList Marketplace API is a comprehensive RESTful service built on AWS Lambda microservices architecture. This documentation reflects the current implementation as of October 2025, providing accurate endpoint specifications, request/response formats, and integration examples.

## 🏗️ **Architecture**

### **Core Services**
- **Auth Service** - User authentication, JWT management, MFA
- **Listing Service** - Boat listing CRUD operations  
- **Admin Service** - Administrative functions with RBAC
- **Search Service** - Advanced search with filters
- **Media Service** - Image upload and processing
- **Email Service** - Notification services
- **Stats Service** - Analytics and reporting

### **Infrastructure**
- **API Gateway** - REST API with CORS support
- **AWS Lambda** - Serverless compute (Node.js 18)
- **DynamoDB** - NoSQL database with GSI indexes
- **S3** - Media storage and static hosting
- **CloudWatch** - Monitoring and alerting

---

## 🔐 **Authentication**

### **JWT Token Structure**
```typescript
interface JWTPayload {
  sub: string;        // User ID
  email: string;      // User email
  name: string;       // User name
  role: UserRole;     // User role (user, admin, superadmin)
  iat: number;        // Issued at timestamp
  exp: number;        // Expiration timestamp
}
```

### **Authentication Headers**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## 👤 **Authentication Endpoints**

### **POST /auth/login**
Authenticate users with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    },
    "expiresIn": 3600
  }
}
```

### **POST /auth/register**  
Register new users.

**Request:**
```json
{
  "name": "John Doe",
  "email": "user@example.com", 
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    }
  }
}
```

### **POST /auth/admin/login**
Admin authentication with enhanced security.

**Request:**
```json
{
  "email": "admin@harborlist.com",
  "password": "adminPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "admin-123",
      "email": "admin@harborlist.com", 
      "name": "Admin User",
      "role": "admin",
      "permissions": ["USER_MANAGEMENT", "CONTENT_MODERATION"]
    },
    "sessionId": "session-456"
  }
}
```

### **POST /auth/refresh**
Refresh JWT tokens.

**Request:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

### **POST /auth/logout**  
Terminate user session.

**Headers:** `Authorization: Bearer <token>`

---

## 🚢 **Listing Endpoints**

### **GET /listings**
Retrieve paginated boat listings.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `status` - Filter by status: `active`, `inactive`, `sold`
- `priceMin` - Minimum price filter
- `priceMax` - Maximum price filter
- `state` - Filter by state/location

**Example Request:**
```http
GET /listings?page=1&limit=20&status=active&priceMin=10000&priceMax=500000&state=FL
```

**Response:**
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "listingId": "listing-123",
        "ownerId": "user-456", 
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
          "engine": "Twin MerCruiser 8.2L",
          "hours": 150,
          "condition": "Excellent"
        },
        "features": ["GPS", "Radar", "Autopilot", "Generator"],
        "images": [
          "https://media-bucket.s3.amazonaws.com/listing-123/image1.jpg",
          "https://media-bucket.s3.amazonaws.com/listing-123/image2.jpg"
        ],
        "thumbnails": [
          "https://media-bucket.s3.amazonaws.com/listing-123/thumb1.jpg"
        ],
        "status": "active",
        "views": 45,
        "createdAt": 1696204800000,
        "updatedAt": 1696204800000
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 15,
      "totalItems": 285,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### **GET /listings/{id}**
Get specific listing details with view tracking.

**Parameters:**
- `id` - Listing ID (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "listingId": "listing-123",
    "ownerId": "user-456",
    "title": "2018 Sea Ray Sundancer 350",
    "description": "Beautiful boat in excellent condition. Well maintained with low hours. Recent service completed. Perfect for family cruising or entertaining guests.",
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
    "features": [
      "GPS Navigation",
      "Radar System",
      "Autopilot",
      "Generator",
      "Air Conditioning", 
      "Full Galley",
      "Master Stateroom"
    ],
    "images": [
      "https://media-bucket.s3.amazonaws.com/listing-123/image1.jpg",
      "https://media-bucket.s3.amazonaws.com/listing-123/image2.jpg",
      "https://media-bucket.s3.amazonaws.com/listing-123/image3.jpg"
    ],
    "videos": [
      "https://media-bucket.s3.amazonaws.com/listing-123/video1.mp4"
    ],
    "thumbnails": [
      "https://media-bucket.s3.amazonaws.com/listing-123/thumb1.jpg",
      "https://media-bucket.s3.amazonaws.com/listing-123/thumb2.jpg"
    ],
    "status": "active",
    "views": 46,
    "createdAt": 1696204800000,
    "updatedAt": 1696291200000,
    "ownerContact": {
      "name": "John Smith",
      "phone": "+1-555-0123",
      "email": "contact@example.com"
    }
  }
}
```

### **POST /listings** 🔒
Create new boat listing (authenticated users only).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "2020 Boston Whaler 285 Conquest",
  "description": "Exceptional fishing and cruising boat with low hours...",
  "price": 195000,
  "location": {
    "city": "Fort Lauderdale",
    "state": "FL", 
    "zipCode": "33316"
  },
  "boatDetails": {
    "type": "Center Console",
    "manufacturer": "Boston Whaler",
    "model": "285 Conquest",
    "year": 2020,
    "length": 28.5,
    "engine": "Twin Mercury 300HP",
    "hours": 75,
    "condition": "Excellent"
  },
  "features": ["GPS", "Fishfinder", "Livewell", "T-Top"],
  "images": ["image1.jpg", "image2.jpg"],
  "videos": ["video1.mp4"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "listingId": "listing-789",
    "message": "Listing created successfully"
  }
}
```

### **PUT /listings/{id}** 🔒
Update existing listing (owner only).

**Headers:** `Authorization: Bearer <token>`

**Parameters:**
- `id` - Listing ID (required)

**Request:** Same format as POST /listings

### **DELETE /listings/{id}** 🔒
Delete listing (owner only).

**Headers:** `Authorization: Bearer <token>`

**Parameters:**
- `id` - Listing ID (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Listing deleted successfully"
  }
}
```

---

## 🔍 **Search Endpoint**

### **POST /search**
Advanced search with filters.

**Request:**
```json
{
  "query": "Sea Ray",
  "filters": {
    "priceRange": {
      "min": 50000,
      "max": 500000
    },
    "location": {
      "state": "FL",
      "radius": 50
    },
    "boatType": "Sport Cruiser",
    "yearRange": {
      "min": 2015,
      "max": 2023
    },
    "lengthRange": {
      "min": 30,
      "max": 50
    },
    "condition": ["Excellent", "Good"],
    "features": ["GPS", "Generator"]
  },
  "sort": {
    "field": "price",
    "direction": "desc"
  },
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

**Response:** Same format as GET /listings

---

## 📸 **Media Endpoint**

### **POST /media** 🔒
Upload images and videos for listings.

**Headers:** 
```http
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request:**
```multipart
Content-Disposition: form-data; name="file"; filename="boat-image.jpg"
Content-Type: image/jpeg

<binary image data>

Content-Disposition: form-data; name="listingId"
listing-123

Content-Disposition: form-data; name="type"
image
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://media-bucket.s3.amazonaws.com/listing-123/image1.jpg",
    "thumbnailUrl": "https://media-bucket.s3.amazonaws.com/listing-123/thumb1.jpg", 
    "type": "image",
    "size": 1024000,
    "dimensions": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

---

## 📧 **Email Endpoint**

### **POST /email**
Send notifications and inquiries.

**Request:**
```json
{
  "type": "listing_inquiry",
  "to": "owner@example.com",
  "listingId": "listing-123",
  "from": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1-555-0456"
  },
  "message": "I'm interested in your boat listing. Could we schedule a viewing?",
  "subject": "Inquiry about 2018 Sea Ray Sundancer 350"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "msg-789",
    "status": "sent"
  }
}
```

---

## 📊 **Stats Endpoint**

### **GET /stats/platform**
Get platform-wide statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalListings": 1247,
    "activeListings": 892,
    "totalUsers": 3456,
    "totalViews": 125890,
    "averagePrice": 187500,
    "popularCategories": [
      {
        "type": "Sport Cruiser", 
        "count": 245
      },
      {
        "type": "Center Console",
        "count": 189
      }
    ],
    "recentActivity": {
      "newListings": 23,
      "newUsers": 12,
      "totalViews": 1456
    },
    "priceDistribution": {
      "under50k": 156,
      "50k-100k": 234,
      "100k-250k": 345,
      "250k-500k": 123,
      "over500k": 34
    }
  }
}
```

---

## 🛡️ **Admin Endpoints**

### **Authentication**
All admin endpoints require authentication with `Authorization: Bearer <admin_token>`

### **GET /admin/dashboard**
Get admin dashboard metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "userStats": {
      "totalUsers": 3456,
      "newUsersToday": 12,
      "activeUsers": 234
    },
    "listingStats": {
      "totalListings": 1247,
      "pendingApproval": 23,
      "flaggedListings": 5
    },
    "systemHealth": {
      "apiStatus": "healthy",
      "dbStatus": "healthy",
      "errorRate": 0.02
    },
    "recentAlerts": [
      {
        "id": "alert-123",
        "type": "high_error_rate",
        "message": "API error rate above threshold",
        "severity": "warning",
        "timestamp": 1696291200000
      }
    ]
  }
}
```

### **GET /admin/users**
Get users with filtering and pagination.

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page  
- `search` - Search term
- `status` - Filter by status: `active`, `suspended`, `banned`
- `role` - Filter by role: `user`, `admin`

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-123",
        "email": "user@example.com",
        "name": "John Doe", 
        "role": "user",
        "status": "active",
        "createdAt": 1696204800000,
        "lastLogin": 1696291200000,
        "listingsCount": 3,
        "flaggedContent": 0
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 35,
      "totalItems": 687
    }
  }
}
```

### **GET /admin/users/{id}**
Get detailed user information.

**Parameters:**
- `id` - User ID (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "status": "active", 
    "createdAt": 1696204800000,
    "lastLogin": 1696291200000,
    "profile": {
      "phone": "+1-555-0123",
      "location": "Miami, FL",
      "verified": true
    },
    "activity": {
      "listingsCount": 3,
      "totalViews": 456,
      "messagesExchanged": 23,
      "flaggedContent": 0
    },
    "recentListings": [
      {
        "listingId": "listing-456",
        "title": "2019 Boston Whaler 270 Dauntless",
        "status": "active",
        "createdAt": 1696204800000
      }
    ],
    "auditTrail": [
      {
        "timestamp": 1696291200000,
        "action": "LOGIN",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0..."
      }
    ]
  }
}
```

### **PUT /admin/users/{id}/status**
Update user status.

**Parameters:**
- `id` - User ID (required)

**Request:**
```json
{
  "status": "suspended",
  "reason": "Violation of terms of service",
  "notes": "Inappropriate listing content reported by multiple users"
}
```

### **GET /admin/listings**
Get listings for moderation.

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `status` - Filter: `active`, `pending`, `flagged`, `removed`
- `flagged` - Show only flagged listings: `true`/`false`

**Response:**
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "listingId": "listing-123",
        "title": "2018 Sea Ray Sundancer 350",
        "ownerId": "user-456",
        "ownerName": "John Smith",
        "status": "active",
        "flagged": false,
        "flagReason": null,
        "price": 285000,
        "createdAt": 1696204800000,
        "moderationStatus": "approved",
        "moderatedBy": "admin-789",
        "moderatedAt": 1696204800000
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 42,
      "totalItems": 827
    }
  }
}
```

### **PUT /admin/listings/{id}/moderate**
Moderate a listing.

**Parameters:**
- `id` - Listing ID (required)

**Request:**
```json
{
  "decision": "approve",
  "notes": "Content verified and compliant",
  "action": null
}
```

or

```json
{
  "decision": "reject", 
  "notes": "Inappropriate content - misleading description",
  "action": "remove",
  "notifyOwner": true
}
```

### **GET /admin/analytics/metrics**
Get detailed analytics.

**Query Parameters:**
- `startDate` - Start date (YYYY-MM-DD)
- `endDate` - End date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "dateRange": {
      "startDate": "2025-09-01",
      "endDate": "2025-09-30"
    },
    "userMetrics": {
      "newUsers": 234,
      "activeUsers": 1456,
      "userRetention": 0.73
    },
    "listingMetrics": {
      "newListings": 123,
      "totalViews": 45678,
      "averageViewsPerListing": 28.5
    },
    "engagementMetrics": {
      "inquiriesCount": 345,
      "averageTimeOnSite": 245,
      "bounceRate": 0.32
    },
    "geographicDistribution": [
      {
        "state": "FL",
        "listings": 234,
        "users": 456
      },
      {
        "state": "CA",
        "listings": 189,
        "users": 367
      }
    ]
  }
}
```

### **GET /admin/system/health**
Get system health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": 1696291200000,
    "services": {
      "api": {
        "status": "healthy",
        "responseTime": 145,
        "errorRate": 0.01
      },
      "database": {
        "status": "healthy", 
        "connectionCount": 12,
        "readLatency": 23,
        "writeLatency": 34
      },
      "storage": {
        "status": "healthy",
        "totalSpace": "1TB",
        "usedSpace": "245GB"
      }
    },
    "metrics": {
      "requestsPerMinute": 1234,
      "averageResponseTime": 156,
      "memoryUsage": 0.67,
      "cpuUsage": 0.45
    }
  }
}
```

### **GET /admin/audit-logs**
Get audit log entries.

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `userId` - Filter by user ID
- `action` - Filter by action type
- `startDate` - Start date filter
- `endDate` - End date filter

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log-123",
        "timestamp": 1696291200000,
        "userId": "user-456",
        "adminId": "admin-789",
        "action": "UPDATE_USER_STATUS",
        "resource": "user",
        "resourceId": "user-456", 
        "details": {
          "oldStatus": "active",
          "newStatus": "suspended",
          "reason": "Terms violation"
        },
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "sessionId": "session-456"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 127,
      "totalItems": 2534
    }
  }
}
```

---

## 🚨 **Error Responses**

### **Standard Error Format**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error context",
    "requestId": "req-123-456",
    "timestamp": 1696291200000
  }
}
```

### **Common Error Codes**

| Code | Status | Description |
|------|---------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### **Validation Error Example**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters", 
    "details": [
      {
        "field": "price",
        "message": "Price must be a positive number",
        "value": -1000
      },
      {
        "field": "email", 
        "message": "Email format is invalid",
        "value": "invalid-email"
      }
    ],
    "requestId": "req-123-456"
  }
}
```

---

## 📝 **Rate Limiting**

### **Current Limits**
- **Authentication**: 5 requests per minute per IP
- **Listings**: 100 requests per minute per user
- **Search**: 30 requests per minute per IP  
- **Media Upload**: 10 requests per minute per user
- **Admin Operations**: Varies by endpoint (10-100 requests per minute)

### **Rate Limit Headers**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1696291260
```

---

## 🔗 **Integration Examples**

### **JavaScript/TypeScript Client**
```typescript
import axios from 'axios';

const API_BASE_URL = 'https://api.harborlist.com';

class HarborListAPI {
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` })
    };
  }

  async login(email: string, password: string) {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    });
    
    this.token = response.data.data.token;
    return response.data;
  }

  async getListings(filters: any = {}) {
    const params = new URLSearchParams(filters).toString();
    const response = await axios.get(
      `${API_BASE_URL}/listings?${params}`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async createListing(listing: any) {
    const response = await axios.post(
      `${API_BASE_URL}/listings`,
      listing,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async searchListings(searchRequest: any) {
    const response = await axios.post(
      `${API_BASE_URL}/search`,
      searchRequest,
      { headers: this.getHeaders() }
    );
    return response.data;
  }
}

// Usage
const api = new HarborListAPI();

// Login
await api.login('user@example.com', 'password');

// Get listings
const listings = await api.getListings({ 
  page: 1, 
  limit: 20, 
  status: 'active' 
});

// Search
const searchResults = await api.searchListings({
  query: 'Sea Ray',
  filters: {
    priceRange: { min: 50000, max: 300000 },
    location: { state: 'FL' }
  }
});
```

### **Python Client**
```python
import requests
import json

class HarborListAPI:
    def __init__(self, base_url='https://api.harborlist.com'):
        self.base_url = base_url
        self.token = None

    def _get_headers(self):
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        return headers

    def login(self, email, password):
        response = requests.post(
            f'{self.base_url}/auth/login',
            json={'email': email, 'password': password}
        )
        response.raise_for_status()
        data = response.json()
        self.token = data['data']['token']
        return data

    def get_listings(self, **filters):
        response = requests.get(
            f'{self.base_url}/listings',
            params=filters,
            headers=self._get_headers()
        )
        response.raise_for_status()
        return response.json()

    def create_listing(self, listing_data):
        response = requests.post(
            f'{self.base_url}/listings',
            json=listing_data,
            headers=self._get_headers()
        )
        response.raise_for_status()
        return response.json()

# Usage
api = HarborListAPI()

# Login
api.login('user@example.com', 'password')

# Get listings
listings = api.get_listings(page=1, limit=20, status='active')

# Create listing
new_listing = api.create_listing({
    'title': '2020 Boston Whaler 285 Conquest',
    'description': 'Excellent condition...',
    'price': 195000,
    # ... other fields
})
```

### **cURL Examples**
```bash
# Login
curl -X POST https://api.harborlist.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com", 
    "password": "password123"
  }'

# Get listings
curl -X GET "https://api.harborlist.com/listings?page=1&limit=20&status=active" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create listing
curl -X POST https://api.harborlist.com/listings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "2020 Boston Whaler 285 Conquest",
    "description": "Excellent condition fishing and cruising boat",
    "price": 195000,
    "location": {
      "city": "Fort Lauderdale",
      "state": "FL"
    },
    "boatDetails": {
      "type": "Center Console",
      "manufacturer": "Boston Whaler",
      "year": 2020,
      "length": 28.5
    }
  }'

# Search listings  
curl -X POST https://api.harborlist.com/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Sea Ray",
    "filters": {
      "priceRange": {"min": 50000, "max": 300000},
      "location": {"state": "FL"}
    },
    "pagination": {"page": 1, "limit": 20}
  }'

# Upload media
curl -X POST https://api.harborlist.com/media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@boat-image.jpg" \
  -F "listingId=listing-123" \
  -F "type=image"
```

---

## 🔄 **API Versioning**

The HarborList API uses URL path versioning for backward compatibility:

- Current version: `v1` (default, no prefix required)
- Future versions: `/v2/listings`, `/v2/search`, etc.

### **Version Headers**
```http
Accept: application/json
API-Version: v1
```

---

This documentation reflects the actual implementation of the HarborList Marketplace API as of October 2025. All endpoints, request/response formats, and examples are based on the current codebase and infrastructure configuration.