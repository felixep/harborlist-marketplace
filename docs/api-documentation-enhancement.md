# 🔧 Documentation Enhancement Implementation Guide

## 📋 **Overview**

This guide provides step-by-step instructions for implementing the documentation enhancements proposed for the HarborList platform. It includes specific file modifications, new content creation, and integration strategies to transform the existing documentation into an industry-leading technical resource.

---

## 🎯 **Phase 1: Critical Infrastructure Enhancements**

### **1.1 API Documentation Overhaul**

#### **Current State Analysis**
The existing `development/api-reference.md` file contains only basic endpoint information (47 lines). Here's the proposed enhancement:

#### **Enhanced API Reference Structure**
```bash
# Proposed new API documentation structure
api/
├── README.md                           # Main API overview
├── openapi-specification.yaml          # Complete OpenAPI 3.1 spec  
├── authentication.md                   # Enhanced auth guide
├── endpoints/
│   ├── listings.md                    # Listing endpoints detail
│   ├── users.md                       # User management endpoints  
│   ├── admin.md                       # Admin endpoints
│   └── media.md                       # Media upload endpoints
├── examples/
│   ├── typescript-sdk.md              # TypeScript client examples
│   ├── python-sdk.md                  # Python client examples
│   ├── curl-examples.md               # cURL command examples
│   └── webhook-integration.md         # Webhook setup guide
├── schemas/
│   ├── request-schemas.json           # Request validation schemas
│   ├── response-schemas.json          # Response format schemas
│   └── error-schemas.json             # Error response formats
└── tools/
    ├── postman-collection.json        # Postman collection
    └── swagger-ui-config.json         # Swagger UI configuration
```

#### **Implementation Steps**

**Step 1: Create Comprehensive OpenAPI Specification**
```yaml
# api/openapi-specification.yaml
openapi: 3.1.0
info:
  title: HarborList Marketplace API
  description: |
    Complete REST API for the HarborList boat marketplace platform.
    
    ## Authentication
    All authenticated endpoints require a valid JWT token in the Authorization header:
    ```
    Authorization: Bearer <jwt-token>
    ```
    
    ## Rate Limiting  
    - Anonymous users: 100 requests/hour
    - Authenticated users: 1000 requests/hour
    - Premium users: 5000 requests/hour
    
  version: 2.0.0
  contact:
    name: HarborList API Support
    email: api-support@harborlist.com
    url: https://docs.harborlist.com
  license:
    name: MIT License
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.harborlist.com/v1
    description: Production server
  - url: https://staging-api.harborlist.com/v1  
    description: Staging server
  - url: http://localhost:3000/api/v1
    description: Local development server

security:
  - bearerAuth: []
  - apiKey: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |
        JWT authentication token obtained from /auth/login endpoint.
        
        Example:
        ```
        Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        ```
    
    apiKey:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key for service-to-service authentication

  schemas:
    # Core Data Models
    Listing:
      type: object
      required: [id, title, price, currency, boatType, location]
      properties:
        id:
          type: string
          format: uuid
          description: Unique listing identifier
          example: "123e4567-e89b-12d3-a456-426614174000"
        title:
          type: string
          minLength: 10
          maxLength: 100
          description: Listing title
          example: "Beautiful 35ft Sailboat - Well Maintained"
        description:
          type: string
          maxLength: 5000
          description: Detailed listing description
        price:
          type: number
          minimum: 0
          description: Listing price in specified currency
          example: 125000
        currency:
          type: string
          enum: [USD, EUR, GBP, CAD, AUD]
          default: USD
          description: Price currency code
        boatType:
          type: string
          enum: [sailboat, motorboat, yacht, catamaran, pontoon, fishing, speedboat]
          description: Type of boat
        location:
          $ref: '#/components/schemas/Location'
        specifications:
          $ref: '#/components/schemas/BoatSpecifications'
        images:
          type: array
          items:
            $ref: '#/components/schemas/MediaItem'
          maxItems: 20
        owner:
          $ref: '#/components/schemas/User'
        createdAt:
          type: string
          format: date-time
          description: Listing creation timestamp
        updatedAt:
          type: string
          format: date-time
          description: Last modification timestamp
        status:
          type: string
          enum: [draft, active, sold, expired, suspended]
          description: Current listing status

    Location:
      type: object
      required: [city, state, country]
      properties:
        city:
          type: string
          example: "Miami"
        state:
          type: string  
          example: "FL"
        country:
          type: string
          example: "USA"
        zipCode:
          type: string
          pattern: '^\d{5}(-\d{4})?$'
          example: "33101"
        coordinates:
          type: object
          properties:
            latitude:
              type: number
              minimum: -90
              maximum: 90
            longitude:
              type: number
              minimum: -180
              maximum: 180

    BoatSpecifications:
      type: object
      properties:
        length:
          type: number
          minimum: 10
          maximum: 500
          description: Boat length in feet
        beam:
          type: number
          description: Boat width in feet  
        draft:
          type: number
          description: Boat draft in feet
        year:
          type: integer
          minimum: 1900
          maximum: 2030
          description: Year manufactured
        manufacturer:
          type: string
          example: "Beneteau"
        model:
          type: string
          example: "Oceanis 35"
        hullMaterial:
          type: string
          enum: [fiberglass, aluminum, steel, wood, carbon_fiber]
        engineType:
          type: string
          enum: [inboard, outboard, saildrive, jet]
        fuelType:
          type: string
          enum: [gasoline, diesel, electric, hybrid]
        engineHours:
          type: integer
          minimum: 0

    User:
      type: object
      required: [id, email, firstName, lastName]
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        firstName:
          type: string
          minLength: 1
          maxLength: 50
        lastName:
          type: string
          minLength: 1  
          maxLength: 50
        phone:
          type: string
          pattern: '^\+?[\d\s\-\(\)]{10,}$'
        avatar:
          $ref: '#/components/schemas/MediaItem'
        verified:
          type: boolean
          description: Email verification status
        role:
          type: string
          enum: [user, premium_user, admin, super_admin]
        createdAt:
          type: string
          format: date-time

    MediaItem:
      type: object
      required: [id, url, type]
      properties:
        id:
          type: string
          format: uuid
        url:
          type: string
          format: uri
          description: CDN URL for the media item
        thumbnailUrl:
          type: string
          format: uri
          description: Thumbnail version URL
        type:
          type: string
          enum: [image, video, document]
        size:
          type: integer
          description: File size in bytes
        width:
          type: integer
          description: Image/video width in pixels
        height:
          type: integer
          description: Image/video height in pixels
        caption:
          type: string
          maxLength: 200

    # API Response Wrappers
    ApiResponse:
      type: object
      required: [success, data]
      properties:
        success:
          type: boolean
          description: Indicates if the request was successful
        data:
          type: object
          description: Response payload
        message:
          type: string
          description: Human-readable success message
        metadata:
          type: object
          description: Additional response metadata

    ErrorResponse:
      type: object
      required: [success, error]
      properties:
        success:
          type: boolean
          enum: [false]
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
              description: Machine-readable error code
              example: "VALIDATION_ERROR"
            message:
              type: string
              description: Human-readable error message  
              example: "Invalid input parameters"
            details:
              type: object
              description: Additional error details
            requestId:
              type: string
              description: Unique request identifier for debugging

    PaginatedResponse:
      allOf:
        - $ref: '#/components/schemas/ApiResponse'
        - type: object
          properties:
            pagination:
              type: object
              required: [page, limit, total, pages]
              properties:
                page:
                  type: integer
                  minimum: 1
                  description: Current page number
                limit:
                  type: integer
                  minimum: 1
                  maximum: 100
                  description: Items per page
                total:
                  type: integer
                  minimum: 0
                  description: Total number of items
                pages:
                  type: integer
                  minimum: 0
                  description: Total number of pages
                hasNext:
                  type: boolean
                  description: Whether there are more pages
                hasPrev:
                  type: boolean
                  description: Whether there are previous pages

paths:
  # Listing Management Endpoints
  /listings:
    get:
      summary: Search and list boats
      description: |
        Retrieve a paginated list of boat listings with optional filtering and sorting.
        
        ## Search Features
        - Full-text search across title and description
        - Geographic radius search  
        - Price range filtering
        - Boat type and specification filtering
        - Advanced sorting options
        
      tags: [Listings]
      parameters:
        - name: q
          in: query
          description: Search query for title/description
          schema:
            type: string
            maxLength: 100
          example: "sailboat miami"
        
        - name: boatType
          in: query
          description: Filter by boat type
          schema:
            type: string
            enum: [sailboat, motorboat, yacht, catamaran, pontoon, fishing, speedboat]
        
        - name: minPrice
          in: query
          description: Minimum price filter
          schema:
            type: number
            minimum: 0
        
        - name: maxPrice  
          in: query
          description: Maximum price filter
          schema:
            type: number
            minimum: 0
        
        - name: location
          in: query
          description: Location filter (city, state, or zip code)
          schema:
            type: string
        
        - name: radius
          in: query
          description: Search radius in miles (requires location)
          schema:
            type: number
            minimum: 1
            maximum: 500
            default: 50
        
        - name: minYear
          in: query
          description: Minimum manufacturing year
          schema:
            type: integer
            minimum: 1900
        
        - name: maxYear
          in: query  
          description: Maximum manufacturing year
          schema:
            type: integer
            maximum: 2030
        
        - name: minLength
          in: query
          description: Minimum boat length in feet
          schema:
            type: number
            minimum: 10
        
        - name: maxLength
          in: query
          description: Maximum boat length in feet  
          schema:
            type: number
            maximum: 500
        
        - name: sortBy
          in: query
          description: Sort field
          schema:
            type: string
            enum: [price, createdAt, updatedAt, length, year]
            default: createdAt
        
        - name: sortOrder
          in: query
          description: Sort direction
          schema:
            type: string
            enum: [asc, desc]
            default: desc
        
        - name: page
          in: query
          description: Page number for pagination
          schema:
            type: integer
            minimum: 1
            default: 1
        
        - name: limit
          in: query
          description: Number of items per page
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20

      responses:
        '200':
          description: Successful response with listings
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/PaginatedResponse'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          listings:
                            type: array
                            items:
                              $ref: '#/components/schemas/Listing'
              examples:
                successful_search:
                  summary: Successful search results
                  value:
                    success: true
                    data:
                      listings:
                        - id: "123e4567-e89b-12d3-a456-426614174000"
                          title: "Beautiful 35ft Sailboat - Well Maintained"
                          price: 125000
                          currency: "USD"
                          boatType: "sailboat"
                          location:
                            city: "Miami"
                            state: "FL"
                            country: "USA"
                          images:
                            - id: "img_001"
                              url: "https://cdn.harborlist.com/listings/123e4567/image1.jpg"
                              thumbnailUrl: "https://cdn.harborlist.com/listings/123e4567/thumb1.jpg"
                              type: "image"
                    pagination:
                      page: 1
                      limit: 20
                      total: 156
                      pages: 8
                      hasNext: true
                      hasPrev: false
        
        '400':
          description: Bad request - invalid parameters
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                success: false
                error:
                  code: "INVALID_PARAMETERS"
                  message: "Invalid search parameters provided"
                  details:
                    invalidFields: ["minPrice", "maxPrice"]
                  requestId: "req_123456789"

        '429':
          description: Rate limit exceeded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                success: false
                error:
                  code: "RATE_LIMIT_EXCEEDED"
                  message: "Too many requests. Please try again later."
                  requestId: "req_123456789"

    post:
      summary: Create a new boat listing
      description: |
        Create a new boat listing. Requires authentication.
        
        ## Upload Process
        1. Create listing with basic information
        2. Upload images using the media upload endpoint
        3. Update listing with image IDs
        
      tags: [Listings]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [title, price, currency, boatType, location]
              properties:
                title:
                  type: string
                  minLength: 10
                  maxLength: 100
                description:
                  type: string
                  maxLength: 5000
                price:
                  type: number
                  minimum: 0
                currency:
                  type: string
                  enum: [USD, EUR, GBP, CAD, AUD]
                boatType:
                  type: string
                  enum: [sailboat, motorboat, yacht, catamaran, pontoon, fishing, speedboat]
                location:
                  $ref: '#/components/schemas/Location'
                specifications:
                  $ref: '#/components/schemas/BoatSpecifications'
            examples:
              sailboat_listing:
                summary: Sailboat listing example
                value:
                  title: "Beautiful 35ft Beneteau Sailboat"
                  description: "Well-maintained sailboat perfect for coastal cruising..."
                  price: 125000
                  currency: "USD"
                  boatType: "sailboat"
                  location:
                    city: "Miami"
                    state: "FL"
                    country: "USA"
                    zipCode: "33101"
                  specifications:
                    length: 35
                    beam: 12
                    year: 2018
                    manufacturer: "Beneteau"
                    model: "Oceanis 35"

      responses:
        '201':
          description: Listing created successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/ApiResponse'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          listing:
                            $ref: '#/components/schemas/Listing'
        
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        
        '401':
          description: Authentication required
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /listings/{listingId}:
    get:
      summary: Get listing details
      description: Retrieve detailed information for a specific listing
      tags: [Listings]
      parameters:
        - name: listingId
          in: path
          required: true
          description: Unique listing identifier
          schema:
            type: string
            format: uuid

      responses:
        '200':
          description: Listing details retrieved successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/ApiResponse'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          listing:
                            $ref: '#/components/schemas/Listing'
        
        '404':
          description: Listing not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  # Authentication Endpoints  
  /auth/login:
    post:
      summary: User authentication
      description: |
        Authenticate user with email and password. Returns JWT token for subsequent requests.
        
        ## Token Expiration
        - Access tokens expire in 24 hours
        - Refresh tokens expire in 30 days
        
      tags: [Authentication]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
                rememberMe:
                  type: boolean
                  default: false
                  description: Extend token expiration
            example:
              email: "user@example.com"
              password: "securePassword123"
              rememberMe: true

      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/ApiResponse'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          token:
                            type: string
                            description: JWT access token
                          refreshToken:
                            type: string
                            description: Refresh token for obtaining new access tokens
                          user:
                            $ref: '#/components/schemas/User'
                          expiresAt:
                            type: string
                            format: date-time
                            description: Token expiration timestamp
        
        '401':
          description: Invalid credentials
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /auth/register:
    post:
      summary: User registration
      description: Create a new user account
      tags: [Authentication]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password, firstName, lastName]
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
                  pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
                  description: Must contain uppercase, lowercase, number, and special character
                firstName:
                  type: string
                  minLength: 1
                  maxLength: 50
                lastName:
                  type: string
                  minLength: 1
                  maxLength: 50
                phone:
                  type: string
                  pattern: '^\+?[\d\s\-\(\)]{10,}$'

      responses:
        '201':
          description: User registered successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/ApiResponse'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          user:
                            $ref: '#/components/schemas/User'
                          verificationRequired:
                            type: boolean
                            description: Whether email verification is required

# Continue with more endpoints...
```

**Step 2: Create Enhanced Endpoint Documentation**

Replace the existing basic `development/api-reference.md` with comprehensive endpoint documentation:

```markdown
# HarborList API Reference

## 🚀 **Quick Start**

### Base URLs
- **Production**: `https://api.harborlist.com/v1`
- **Staging**: `https://staging-api.harborlist.com/v1`  
- **Development**: `http://localhost:3000/api/v1`

### Authentication
```bash
# Include JWT token in Authorization header
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://api.harborlist.com/v1/listings
```

### Rate Limits
| User Type | Requests/Hour | Burst Limit |
|-----------|---------------|-------------|
| Anonymous | 100 | 10/minute |
| Authenticated | 1,000 | 50/minute |
| Premium | 5,000 | 200/minute |

---

## 📋 **Core Endpoints**

### **Listings API**

#### `GET /listings` - Search Listings
**Purpose**: Search and filter boat listings with pagination

**Query Parameters**:
```typescript
interface SearchParams {
  q?: string;              // Search query
  boatType?: BoatType;     // Filter by boat type
  minPrice?: number;       // Minimum price
  maxPrice?: number;       // Maximum price
  location?: string;       // City, state, or zip
  radius?: number;         // Search radius in miles
  sortBy?: 'price' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;           // Page number (1-based)
  limit?: number;          // Items per page (max 100)
}
```

**Example Request**:
```bash
curl "https://api.harborlist.com/v1/listings?q=sailboat&location=miami&radius=50&minPrice=50000&maxPrice=200000&page=1&limit=20"
```

**Response**:
```typescript
interface ListingSearchResponse {
  success: true;
  data: {
    listings: Listing[];
    filters: AppliedFilters;
    suggestions: SearchSuggestion[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

#### `POST /listings` - Create Listing
**Purpose**: Create a new boat listing (requires authentication)

**Request Body**:
```typescript
interface CreateListingRequest {
  title: string;                    // 10-100 characters
  description?: string;             // Up to 5000 characters
  price: number;                    // Price in specified currency
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';
  boatType: BoatType;
  location: {
    city: string;
    state: string;
    country: string;
    zipCode?: string;
  };
  specifications?: {
    length?: number;               // Feet
    beam?: number;                // Feet
    year?: number;                // Manufacturing year
    manufacturer?: string;
    model?: string;
    engineType?: EngineType;
    fuelType?: FuelType;
  };
}
```

**Example Request**:
```bash
curl -X POST https://api.harborlist.com/v1/listings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Beautiful 35ft Sailboat - Well Maintained",
    "description": "Excellent condition sailboat perfect for coastal cruising...",
    "price": 125000,
    "currency": "USD",
    "boatType": "sailboat",
    "location": {
      "city": "Miami",
      "state": "FL",
      "country": "USA"
    },
    "specifications": {
      "length": 35,
      "year": 2018,
      "manufacturer": "Beneteau",
      "model": "Oceanis 35"
    }
  }'
```

#### `PUT /listings/{id}` - Update Listing
**Purpose**: Update an existing listing (owner only)

**Path Parameters**:
- `id` (string, required): Listing UUID

**Request Body**: Same as create listing, all fields optional

**Example Request**:
```bash
curl -X PUT https://api.harborlist.com/v1/listings/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price": 120000}'
```

#### `DELETE /listings/{id}` - Delete Listing
**Purpose**: Delete a listing (owner only)

**Example Request**:
```bash
curl -X DELETE https://api.harborlist.com/v1/listings/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **Authentication API**

#### `POST /auth/login` - User Login
**Purpose**: Authenticate user and receive JWT token

**Request Body**:
```typescript
interface LoginRequest {
  email: string;           // Valid email address
  password: string;        // User password
  rememberMe?: boolean;    // Extend token expiration
}
```

**Response**:
```typescript
interface LoginResponse {
  success: true;
  data: {
    token: string;         // JWT access token
    refreshToken: string;  // Refresh token
    user: User;           // User profile
    expiresAt: string;    // ISO timestamp
  };
}
```

#### `POST /auth/register` - User Registration
**Purpose**: Create new user account

**Request Body**:
```typescript
interface RegisterRequest {
  email: string;          // Must be unique
  password: string;       // Min 8 chars, mixed case + numbers + symbols
  firstName: string;      // 1-50 characters
  lastName: string;       // 1-50 characters
  phone?: string;         // Optional phone number
}
```

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number
- At least one special character (@$!%*?&)

#### `POST /auth/refresh` - Refresh Token
**Purpose**: Get new access token using refresh token

**Request Body**:
```typescript
interface RefreshRequest {
  refreshToken: string;
}
```

### **User Management API**

#### `GET /users/profile` - Get User Profile
**Purpose**: Get current user's profile information

**Example Request**:
```bash
curl https://api.harborlist.com/v1/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### `PUT /users/profile` - Update Profile
**Purpose**: Update user profile information

**Request Body**:
```typescript
interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;              // Up to 500 characters
  location?: {
    city: string;
    state: string;
    country: string;
  };
}
```

#### `GET /users/{userId}/listings` - Get User Listings
**Purpose**: Get listings by specific user

**Query Parameters**:
- `status` (optional): Filter by listing status
- `page` (optional): Page number
- `limit` (optional): Items per page

### **Media Upload API**

#### `POST /media/upload` - Upload Media
**Purpose**: Upload images/videos for listings

**Request**: Multipart form data
- `file` (required): Media file (max 10MB per file)
- `type` (required): 'listing' | 'avatar' | 'document'
- `listingId` (optional): Associate with specific listing

**Supported Formats**:
- **Images**: JPEG, PNG, WebP (max 10MB)
- **Videos**: MP4, MOV (max 50MB)
- **Documents**: PDF (max 5MB)

**Example Request**:
```bash
curl -X POST https://api.harborlist.com/v1/media/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@boat_photo.jpg" \
  -F "type=listing" \
  -F "listingId=123e4567-e89b-12d3-a456-426614174000"
```

**Response**:
```typescript
interface MediaUploadResponse {
  success: true;
  data: {
    mediaItem: {
      id: string;              // Media item UUID
      url: string;             // CDN URL
      thumbnailUrl?: string;   // Thumbnail URL (for images)
      type: 'image' | 'video' | 'document';
      size: number;            // File size in bytes
      width?: number;          // Image/video width
      height?: number;         // Image/video height
    };
  };
}
```

---

## 🔒 **Authentication & Security**

### **JWT Token Structure**
```typescript
interface JWTPayload {
  sub: string;              // User ID
  email: string;            // User email
  role: UserRole;           // User role
  iat: number;              // Issued at timestamp
  exp: number;              // Expiration timestamp
}
```

### **API Key Authentication**
For service-to-service integration:
```bash
curl -H "X-API-Key: YOUR_API_KEY" \
     https://api.harborlist.com/v1/listings
```

### **Permissions & Roles**
| Role | Permissions |
|------|-------------|
| `user` | Create/edit own listings, search, contact sellers |
| `premium_user` | Enhanced listing features, priority support |
| `admin` | Moderate listings, manage users, access analytics |
| `super_admin` | Full system access, user management |

---

## 📊 **Error Handling**

### **Standard Error Format**
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable message
    details?: object;       // Additional error context
    requestId: string;      // Unique request identifier
  };
}
```

### **Common Error Codes**
| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

### **Validation Errors**
```typescript
interface ValidationError {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: 'Validation failed';
    details: {
      field: string;        // Field name
      message: string;      // Validation error message
      value: any;           // Provided value
    }[];
  };
}
```

---

## 🚀 **SDK Examples**

### **TypeScript/JavaScript SDK**
```typescript
import { HarborListAPI } from '@harborlist/sdk';

const api = new HarborListAPI({
  baseURL: 'https://api.harborlist.com/v1',
  apiKey: 'your-api-key',
});

// Search listings
const listings = await api.listings.search({
  q: 'sailboat',
  location: 'miami',
  minPrice: 50000,
  maxPrice: 200000,
});

// Create listing
const newListing = await api.listings.create({
  title: 'Beautiful Sailboat',
  price: 125000,
  currency: 'USD',
  boatType: 'sailboat',
  location: {
    city: 'Miami',
    state: 'FL',
    country: 'USA',
  },
});

// Upload images
const image = await api.media.upload({
  file: fileBuffer,
  type: 'listing',
  listingId: newListing.id,
});
```

### **Python SDK**
```python
from harborlist import HarborListAPI

api = HarborListAPI(
    base_url='https://api.harborlist.com/v1',
    api_key='your-api-key'
)

# Search listings
listings = api.listings.search(
    q='sailboat',
    location='miami',
    min_price=50000,
    max_price=200000
)

# Create listing
new_listing = api.listings.create({
    'title': 'Beautiful Sailboat',
    'price': 125000,
    'currency': 'USD',
    'boat_type': 'sailboat',
    'location': {
        'city': 'Miami',
        'state': 'FL',
        'country': 'USA'
    }
})
```

---

## 🔧 **Testing & Development**

### **Postman Collection**
Import our complete Postman collection: [`harborlist-api.postman_collection.json`](./tools/postman-collection.json)

### **Interactive API Explorer**
Try out the API interactively: [https://docs.harborlist.com/api-explorer](https://docs.harborlist.com/api-explorer)

### **Webhook Testing**
```bash
# Test webhook endpoint
curl -X POST https://your-webhook-url.com/harborlist \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=..." \
  -d '{"event": "listing.created", "data": {...}}'
```

---

**📅 Last Updated**: October 2025  
**📝 API Version**: 2.0.0  
**🔄 Next Review**: December 2025
```

This enhancement shows exactly how to transform the basic 47-line API reference into a comprehensive, production-ready API documentation that developers can actually use to integrate with the platform successfully.