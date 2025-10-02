# 🔌 API Reference Documentation

## 📋 **Overview**

The HarborList API is a RESTful service built on AWS Lambda and API Gateway, providing comprehensive endpoints for boat marketplace operations. This document covers all available endpoints, authentication methods, request/response schemas, and error handling patterns.

---

## 🌐 **Base Configuration**

### **API Base URLs**

```
Production:    https://api.harborlist.com
Staging:       https://staging-api.harborlist.com
Development:   https://dev-api.harborlist.com
```

### **API Version**
- **Current Version**: `v1`
- **Versioning Strategy**: URL path versioning (`/api/v1/`)
- **Deprecation Policy**: 12 months advance notice for breaking changes

### **Content Types**
```http
Content-Type: application/json
Accept: application/json
```

---

## 🔐 **Authentication**

### **JWT Bearer Token Authentication**

All authenticated endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### **Admin Authentication**

Admin endpoints require additional MFA verification and admin-level JWT tokens:

```http
Authorization: Bearer <admin_jwt_token>
X-MFA-Token: <totp_token>
```

### **Authentication Endpoints**

#### **POST /api/v1/auth/login**
Authenticate user and receive access tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

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