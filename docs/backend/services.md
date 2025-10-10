# 📊 Service Documentation

## 📋 **Overview**

HarborList backend consists of 7 core microservices, each responsible for specific business functionality. All services are implemented as AWS Lambda functions with a shared architectural pattern for consistency and maintainability.

---

## 🔐 **Auth Service**

### **User Authentication & Session Management**

#### **Service Responsibilities**
- User registration and login
- JWT token generation and validation
- Admin multi-factor authentication (MFA)
- Session management and security
- Password reset and account recovery

#### **API Endpoints**
```typescript
// Public Authentication Endpoints
POST /auth/register        // User registration
POST /auth/login          // User login
POST /auth/refresh        // Token refresh
POST /auth/logout         // User logout
POST /auth/forgot-password // Password reset request
POST /auth/reset-password  // Password reset confirmation

// Admin Authentication Endpoints  
POST /auth/admin/login    // Admin login with MFA
POST /auth/admin/setup-mfa // MFA setup for admins
POST /auth/admin/verify-mfa // MFA verification
```

#### **Key Features**
- **Rate Limiting**: Prevents brute force attacks
- **Account Lockout**: Temporary suspension after failed attempts
- **Secure Password Storage**: Bcrypt hashing with salt
- **TOTP MFA**: Time-based one-time passwords for admins

#### **Implementation Example**
```typescript
export const handler = async (event: APIGatewayProxyEvent) => {
  const { httpMethod, path } = event;
  
  switch (`${httpMethod} ${path}`) {
    case 'POST /auth/login':
      return await handleLogin(event);
    case 'POST /auth/register':
      return await handleRegistration(event);
    case 'POST /auth/admin/login':
      return await handleAdminLogin(event);
    default:
      return createResponse(404, { error: 'Endpoint not found' });
  }
};
```

---

## 📋 **Listing Service**

### **Boat Listing CRUD Operations & Search**

#### **Service Responsibilities**
- Boat listing creation, reading, updating, deletion
- Ownership validation and authorization
- Listing status management (draft, active, sold)
- Basic listing search and filtering
- Listing validation and data integrity

#### **API Endpoints**
```typescript
// Listing Management
GET    /listings                    // Get public listings
GET    /listings/{id}              // Get specific listing
POST   /listings                   // Create new listing (auth required)
PUT    /listings/{id}              // Update listing (owner only)
DELETE /listings/{id}              // Delete listing (owner/admin only)

// User's Listings  
GET    /listings/my-listings       // Get user's own listings (auth required)
```

#### **Data Validation**
```typescript
interface ListingCreateRequest {
  title: string;                    // Required, 5-100 characters
  description: string;              // Required, max 2000 characters
  price: number;                    // Required, positive number
  boatType: string;                 // Required, from enum
  year: number;                     // Required, 1900-current year
  location: {
    state: string;                  // Required
    city: string;                   // Required
    coordinates?: [number, number]; // Optional GPS coordinates
  };
  images: string[];                 // Optional, S3 URLs
}
```

#### **Business Logic**
- **Ownership Validation**: Users can only modify their own listings
- **Status Transitions**: Draft → Active → Sold workflow
- **Duplicate Detection**: Prevent similar listings by same user
- **Price Validation**: Market price analysis and warnings
- **Content Moderation**: Automated content filtering

---

## 👤 **Admin Service**

### **Administrative Functions & Dashboard APIs**

#### **Service Responsibilities**
- User management and moderation
- Administrative dashboard data
- System analytics and reporting
- Audit log management
- Platform configuration

#### **API Endpoints**
```typescript
// User Management (Admin Only)
GET    /admin/users                // List all users
GET    /admin/users/{id}          // Get user details
PUT    /admin/users/{id}/status   // Update user status
DELETE /admin/users/{id}          // Delete user account

// Listing Management (Admin Only)
GET    /admin/listings            // List all listings
PUT    /admin/listings/{id}/status // Update listing status
DELETE /admin/listings/{id}       // Remove listing

// Analytics & Reporting
GET    /admin/analytics/users     // User statistics
GET    /admin/analytics/listings  // Listing statistics  
GET    /admin/analytics/platform  // Platform metrics

// Audit & Compliance
GET    /admin/audit-logs          // System audit logs
GET    /admin/reports/compliance  // Compliance reports
```

#### **Role-Based Access Control**
```typescript
interface AdminPermissions {
  users: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  listings: {
    read: boolean;
    moderate: boolean;
    delete: boolean;
  };
  analytics: {
    view: boolean;
    export: boolean;
  };
  system: {
    configure: boolean;
    maintenance: boolean;
  };
}
```

#### **Analytics Features**
- **Real-time Metrics**: Live user and listing counts
- **Growth Analytics**: User registration and engagement trends
- **Revenue Tracking**: Platform monetization metrics
- **Performance Monitoring**: System health and performance data

---

## 📸 **Media Service**

### **Image Upload, Processing & CDN Integration**

#### **Service Responsibilities**
- Environment-aware S3/LocalStack integration
- Secure image upload via presigned URLs
- Image processing and optimization
- Thumbnail generation and multiple formats
- CDN integration and cache management
- Media validation and virus scanning

> 📖 **Complete Implementation Guide**: See [Media Infrastructure Integration](../deployment/media-infrastructure-integration.md) for comprehensive S3 bucket setup, environment configuration, and deployment integration.

#### **API Endpoints**
```typescript
// Media Upload
POST /media/upload-url            // Get presigned upload URL
POST /media/process              // Process uploaded image
GET  /media/{id}                 // Get media metadata
DELETE /media/{id}               // Delete media (owner/admin only)

// Image Processing
POST /media/resize               // Generate thumbnails
POST /media/optimize             // Optimize image quality
```

#### **Image Processing Pipeline**
```typescript
interface ImageProcessingOptions {
  resize: {
    thumbnail: { width: 150, height: 150 };
    medium: { width: 400, height: 300 };
    large: { width: 800, height: 600 };
  };
  formats: ['webp', 'jpeg'];
  quality: {
    webp: 80;
    jpeg: 85;
  };
  optimization: {
    compress: true;
    stripMetadata: true;
    progressive: true;
  };
}
```

#### **Security Features**
- **File Type Validation**: Only allow image formats (JPEG, PNG, WebP)
- **Size Limits**: Maximum 10MB per image, 20 images per listing
- **Virus Scanning**: Automated malware detection
- **Content Filtering**: Inappropriate content detection
- **Watermarking**: Optional watermark for premium listings

---

## 📧 **Email Service**

### **Notification & Communication Systems**

#### **Service Responsibilities**
- Transactional email delivery
- Email template management
- Notification preferences
- Delivery tracking and analytics
- Bounce and complaint handling

#### **API Endpoints**
```typescript
// Email Operations
POST /email/send                 // Send email (internal use)
POST /email/inquiry             // Send listing inquiry
GET  /email/preferences         // Get user email preferences
PUT  /email/preferences         // Update email preferences

// Email Templates
GET  /email/templates           // List available templates
GET  /email/templates/{id}      // Get specific template
```

#### **Email Types & Templates**
```typescript
enum EmailType {
  WELCOME = 'welcome',
  LISTING_CREATED = 'listing_created',
  LISTING_INQUIRY = 'listing_inquiry', 
  PASSWORD_RESET = 'password_reset',
  ADMIN_ALERT = 'admin_alert',
  WEEKLY_DIGEST = 'weekly_digest'
}

interface EmailTemplate {
  id: string;
  type: EmailType;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];          // Template variables
  active: boolean;
}
```

#### **Delivery Features**
- **AWS SES Integration**: Reliable email delivery
- **Template Engine**: Dynamic content with variables
- **Delivery Tracking**: Open rates, click tracking, bounces
- **Unsubscribe Management**: One-click unsubscribe compliance
- **Email Verification**: DKIM and SPF authentication

---

## 📊 **Stats Service**

### **Platform Analytics & Reporting**

#### **Service Responsibilities**
- Real-time platform statistics
- Business intelligence and metrics
- Performance monitoring data
- User engagement analytics
- Revenue and conversion tracking

#### **API Endpoints**
```typescript
// Public Statistics
GET /stats/platform              // Public platform stats
GET /stats/listings/summary      // Listing count and trends

// Private Analytics (Auth Required)
GET /stats/user/dashboard        // Personal user statistics
GET /stats/listings/performance  // Listing performance metrics

// Admin Analytics (Admin Only)
GET /stats/admin/overview        // Complete platform overview
GET /stats/admin/users           // Detailed user analytics
GET /stats/admin/revenue         // Revenue and monetization data
```

#### **Key Metrics Tracked**
```typescript
interface PlatformMetrics {
  users: {
    total: number;
    active: number;            // Active in last 30 days
    new: number;               // New this month
    retention: number;         // 30-day retention rate
  };
  listings: {
    total: number;
    active: number;
    sold: number;
    avgPrice: number;
    views: number;
  };
  engagement: {
    avgSessionDuration: number;
    pagesPerSession: number;
    bounceRate: number;
    searchesPerUser: number;
  };
  performance: {
    avgResponseTime: number;
    errorRate: number;
    uptime: number;
  };
}
```

#### **Real-time Features**
- **Live Dashboards**: WebSocket updates for admin dashboards
- **Event Tracking**: Real-time user interaction tracking
- **Alert Generation**: Threshold-based alerting for key metrics
- **Trend Analysis**: Historical data analysis and forecasting

---

## 🔍 **Search Service**

### **Advanced Filtering & Search Functionality**

#### **Service Responsibilities**
- Advanced listing search with multiple filters
- Geospatial search and location-based filtering
- Full-text search across listing content
- Search result ranking and relevance
- Search analytics and optimization

#### **API Endpoints**
```typescript
// Search Operations
GET /search                      // Basic search with filters
GET /search/suggestions          // Search term suggestions
GET /search/facets              // Available filter facets
POST /search/advanced           // Complex search queries

// Geospatial Search
GET /search/nearby              // Location-based search
GET /search/map                 // Map view search results
```

#### **Search Filters**
```typescript
interface SearchFilters {
  query?: string;               // Full-text search
  priceMin?: number;
  priceMax?: number;
  boatType?: string[];
  yearMin?: number;
  yearMax?: number;
  location?: {
    state?: string;
    city?: string;
    radius?: number;            // Miles from coordinates
    coordinates?: [number, number];
  };
  status?: 'active' | 'sold';
  sortBy?: 'price' | 'date' | 'relevance';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
```

#### **Search Features**
- **Faceted Search**: Filter by multiple criteria simultaneously
- **Fuzzy Matching**: Handle typos and partial matches
- **Saved Searches**: Users can save and subscribe to searches
- **Search History**: Track user search patterns for improvement
- **Performance Optimization**: Caching and query optimization

---

## 🔧 **Shared Infrastructure**

### **Common Patterns Across Services**

#### **Error Handling**
```typescript
class ServiceError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode: number, code: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Standardized error responses
const handleError = (error: Error): APIGatewayProxyResult => {
  if (error instanceof ServiceError) {
    return createResponse(error.statusCode, {
      error: error.message,
      code: error.code,
      details: error.details
    });
  }
  
  // Log unexpected errors
  console.error('Unexpected error:', error);
  return createResponse(500, { error: 'Internal server error' });
};
```

#### **Response Formatting**
```typescript
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: string;
  requestId: string;
}

const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'X-Request-ID': context.requestId
  },
  body: JSON.stringify({
    ...body,
    timestamp: new Date().toISOString(),
    requestId: context.requestId
  })
});
```

#### **Middleware Pipeline**
1. **CORS Handling**: Cross-origin resource sharing
2. **Authentication**: JWT token validation
3. **Authorization**: Role-based access control
4. **Rate Limiting**: Request throttling
5. **Input Validation**: Request schema validation
6. **Audit Logging**: Security and compliance logging
7. **Error Handling**: Standardized error responses

---

**📅 Last Updated**: October 2025  
**📝 Version**: 1.0.0  
**👥 Maintained By**: HarborList Development Team