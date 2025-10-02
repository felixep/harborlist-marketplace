# 🔌 API Architecture Diagrams

## 📡 **API Gateway Architecture**

### **Current API Gateway Route Structure**

```mermaid
graph TB
    subgraph "API Gateway - REST API"
        Root[/ Root Resource]
        
        subgraph "Public Endpoints"
            Listings[/listings]
            ListingId[/listings/{id}]
            Search[/search]
            Stats[/stats]
            StatsPlatform[/stats/platform]
        end
        
        subgraph "Authentication Endpoints"
            Auth[/auth]
            Login[/auth/login]
            Register[/auth/register]
            AdminAuth[/auth/admin]
            AdminLogin[/auth/admin/login]
            Refresh[/auth/refresh]
            Logout[/auth/logout]
        end
        
        subgraph "Protected User Endpoints"
            Media[/media]
            Email[/email]
        end
        
        subgraph "Admin Endpoints"
            Admin[/admin]
            AdminProxy[/admin/{proxy+}]
        end
    end
    
    subgraph "Lambda Functions"
        ListingLambda[Listing Function<br/>listing/index.handler]
        SearchLambda[Search Function<br/>search/index.handler]
        StatsLambda[Stats Function<br/>stats-service/index.handler]
        AuthLambda[Auth Function<br/>auth-service/index.handler]
        MediaLambda[Media Function<br/>media/index.handler]
        EmailLambda[Email Function<br/>email/index.handler]
        AdminLambda[Admin Function<br/>admin-service/index.handler]
    end
    
    Root --> Listings
    Root --> Search
    Root --> Stats
    Root --> Auth
    Root --> Media
    Root --> Email
    Root --> Admin
    
    Listings --> ListingLambda
    ListingId --> ListingLambda
    Search --> SearchLambda
    Stats --> StatsLambda
    StatsPlatform --> StatsLambda
    
    Auth --> AuthLambda
    Login --> AuthLambda
    Register --> AuthLambda
    AdminAuth --> AuthLambda
    AdminLogin --> AuthLambda
    Refresh --> AuthLambda
    Logout --> AuthLambda
    
    Media --> MediaLambda
    Email --> EmailLambda
    
    Admin --> AdminLambda
    AdminProxy --> AdminLambda
    
    style Listings fill:#e8f5e8
    style Auth fill:#ffebee
    style Admin fill:#f3e5f5
    style Media fill:#fff3e0
```

### **API Request Lifecycle**

```mermaid
sequenceDiagram
    participant Client as Client App
    participant CF as Cloudflare
    participant APIGW as API Gateway
    participant Auth as JWT Authorizer
    participant Lambda as Lambda Function
    participant DDB as DynamoDB
    participant CW as CloudWatch
    
    Client->>CF: HTTPS Request
    Note over CF: CDN Cache Check
    CF->>APIGW: Forward Request
    
    alt Authenticated Endpoint
        APIGW->>Auth: Validate JWT Token
        Auth->>Auth: Token Verification
        alt Valid Token
            Auth-->>APIGW: User Context
        else Invalid Token
            Auth-->>APIGW: 401 Unauthorized
            APIGW-->>CF: Error Response
            CF-->>Client: 401 Error
        end
    end
    
    APIGW->>Lambda: Invoke Function
    Note over Lambda: Business Logic Processing
    
    Lambda->>DDB: Database Query/Write
    DDB-->>Lambda: Data Response
    
    Lambda->>CW: Log Metrics & Events
    
    alt Success
        Lambda-->>APIGW: Success Response
        APIGW-->>CF: HTTP 200
        CF-->>Client: JSON Response
    else Error
        Lambda-->>APIGW: Error Response
        APIGW-->>CF: HTTP 4xx/5xx
        CF-->>Client: Error Response
    end
```

### **Lambda Function Architecture**

```mermaid
graph TB
    subgraph "Lambda Function Internal Architecture"
        subgraph "Handler Layer"
            EventHandler[Event Handler<br/>APIGatewayProxyEvent]
            RouteParser[Route Parser<br/>Path & Method Detection]
            MiddlewareChain[Middleware Chain<br/>Auth, CORS, Validation]
        end
        
        subgraph "Business Logic Layer"
            AuthService[Authentication Service<br/>JWT, MFA, Sessions]
            ListingService[Listing Service<br/>CRUD, Validation, Search]
            AdminService[Admin Service<br/>Management, Analytics, Audit]
            MediaService[Media Service<br/>Upload, Processing, CDN]
        end
        
        subgraph "Data Access Layer"
            DynamoClient[DynamoDB Client<br/>Connection Pooling]
            S3Client[S3 Client<br/>Presigned URLs]
            SecretsClient[Secrets Manager<br/>JWT Secrets, API Keys]
        end
        
        subgraph "Utility Layer"
            ResponseFormatter[Response Formatter<br/>Standardized API Responses]
            ErrorHandler[Error Handler<br/>Logging, User-Friendly Messages]
            Validator[Input Validator<br/>Schema Validation, Sanitization]
        end
    end
    
    EventHandler --> RouteParser
    RouteParser --> MiddlewareChain
    
    MiddlewareChain --> AuthService
    MiddlewareChain --> ListingService
    MiddlewareChain --> AdminService
    MiddlewareChain --> MediaService
    
    AuthService --> DynamoClient
    AuthService --> SecretsClient
    ListingService --> DynamoClient
    AdminService --> DynamoClient
    MediaService --> S3Client
    
    AuthService --> ResponseFormatter
    ListingService --> ResponseFormatter
    AdminService --> ResponseFormatter
    MediaService --> ResponseFormatter
    
    ResponseFormatter --> ErrorHandler
    ErrorHandler --> Validator
    
    style EventHandler fill:#e3f2fd
    style AuthService fill:#ffebee
    style ListingService fill:#e8f5e8
    style AdminService fill:#f3e5f5
```

---

## 🔐 **Authentication Flow Architecture**

### **User Authentication Flow**

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    
    Unauthenticated --> LoginAttempt : Submit Credentials
    LoginAttempt --> ValidatingCredentials : Valid Format
    LoginAttempt --> LoginError : Invalid Format
    
    ValidatingCredentials --> CheckingRateLimit : Credentials OK
    ValidatingCredentials --> LoginError : Invalid Credentials
    
    CheckingRateLimit --> AuthenticatingUser : Within Limits
    CheckingRateLimit --> RateLimited : Too Many Attempts
    
    AuthenticatingUser --> GeneratingTokens : Valid User
    AuthenticatingUser --> LoginError : Authentication Failed
    
    GeneratingTokens --> Authenticated : Tokens Created
    
    Authenticated --> RefreshingToken : Token Near Expiry
    Authenticated --> LoggingOut : User Logout
    Authenticated --> [*] : Session Expired
    
    RefreshingToken --> Authenticated : Valid Refresh Token
    RefreshingToken --> Unauthenticated : Invalid Refresh Token
    
    LoggingOut --> Unauthenticated : Logout Complete
    LoginError --> Unauthenticated : Try Again
    RateLimited --> Unauthenticated : Wait Period
```

### **Admin Authentication with MFA**

```mermaid
sequenceDiagram
    participant Admin as Admin User
    participant UI as Admin Portal
    participant AuthAPI as Auth Service
    participant MFA as MFA Service
    participant DB as DynamoDB
    participant Audit as Audit Logger
    
    Admin->>UI: Enter Credentials
    UI->>AuthAPI: POST /auth/admin/login
    
    AuthAPI->>DB: Validate Credentials
    DB-->>AuthAPI: User Data
    
    alt First Time Login or MFA Not Setup
        AuthAPI->>MFA: Generate TOTP Secret
        MFA-->>AuthAPI: QR Code + Secret
        AuthAPI-->>UI: MFA Setup Required
        UI-->>Admin: Show QR Code
        
        Admin->>UI: Enter TOTP Code
        UI->>AuthAPI: Verify Setup Code
        AuthAPI->>MFA: Validate TOTP
        MFA-->>AuthAPI: Verification Result
        
        alt Valid TOTP
            AuthAPI->>DB: Mark MFA as Verified
            AuthAPI->>Audit: Log MFA Setup
        else Invalid TOTP
            AuthAPI-->>UI: Setup Failed
            UI-->>Admin: Try Again
        end
        
    else MFA Already Setup
        AuthAPI-->>UI: MFA Required
        UI-->>Admin: Enter TOTP Code
        
        Admin->>UI: TOTP Code
        UI->>AuthAPI: Submit MFA Code
        AuthAPI->>MFA: Validate TOTP
        MFA-->>AuthAPI: Validation Result
    end
    
    alt MFA Success
        AuthAPI->>DB: Create Admin Session
        AuthAPI->>Audit: Log Successful Login
        AuthAPI-->>UI: Admin JWT + Session
        UI-->>Admin: Redirect to Dashboard
        
    else MFA Failed
        AuthAPI->>Audit: Log Failed MFA
        AuthAPI-->>UI: Authentication Failed
        UI-->>Admin: Show Error Message
    end
```

---

## 📊 **Data Flow Patterns**

### **Listing Creation Data Flow**

```mermaid
graph TD
    subgraph "Frontend Layer"
        Form[Listing Form<br/>React Component]
        Validation[Client Validation<br/>Real-time Feedback]
        Upload[Image Upload<br/>Drag & Drop Interface]
    end
    
    subgraph "API Layer"
        Gateway[API Gateway<br/>POST /listings]
        AuthMiddleware[JWT Authentication<br/>User Verification]
        ValidationMiddleware[Server Validation<br/>Schema Checking]
    end
    
    subgraph "Business Logic"
        ListingService[Listing Service<br/>Business Rules]
        DuplicateCheck[Duplicate Detection<br/>Title & Owner Matching]
        PriceAnalysis[Market Price Analysis<br/>Comparable Listings]
        GeocodingService[Location Services<br/>Coordinate Lookup]
    end
    
    subgraph "Data Persistence"
        DynamoDB[DynamoDB<br/>Listings Table]
        S3[S3 Bucket<br/>Image Storage]
        AuditLog[Audit Logs<br/>Change Tracking]
    end
    
    subgraph "Post-Processing"
        NotificationService[Email Notifications<br/>Owner Confirmation]
        SearchIndexing[Search Index Update<br/>Immediate Availability]
        AnalyticsTracking[Analytics Tracking<br/>Business Metrics]
    end
    
    Form --> Validation
    Validation --> Upload
    Upload --> Gateway
    
    Gateway --> AuthMiddleware
    AuthMiddleware --> ValidationMiddleware
    ValidationMiddleware --> ListingService
    
    ListingService --> DuplicateCheck
    DuplicateCheck --> PriceAnalysis
    PriceAnalysis --> GeocodingService
    
    GeocodingService --> DynamoDB
    ListingService --> S3
    ListingService --> AuditLog
    
    DynamoDB --> NotificationService
    DynamoDB --> SearchIndexing
    DynamoDB --> AnalyticsTracking
    
    style Form fill:#e1f5fe
    style ListingService fill:#e8f5e8
    style DynamoDB fill:#fff3e0
```

### **Admin Dashboard Data Aggregation**

```mermaid
graph TB
    subgraph "Admin Dashboard Request"
        AdminUI[Admin Dashboard<br/>React Components]
        RealTimeMetrics[Real-time Metrics<br/>Live Updates]
        CachedData[Cached Analytics<br/>Performance Optimization]
    end
    
    subgraph "Data Collection Services"
        UserMetrics[User Metrics Collector<br/>Registration, Activity, Retention]
        ListingMetrics[Listing Metrics Collector<br/>Creation, Views, Conversions]
        SystemMetrics[System Metrics Collector<br/>Performance, Health, Errors]
        RevenueMetrics[Revenue Metrics Collector<br/>Fees, Premium Features]
    end
    
    subgraph "Data Sources"
        UsersTable[Users Table<br/>DynamoDB]
        ListingsTable[Listings Table<br/>DynamoDB]
        AuditLogsTable[Audit Logs<br/>DynamoDB]
        SessionsTable[Admin Sessions<br/>DynamoDB]
        CloudWatchMetrics[CloudWatch<br/>System Metrics]
    end
    
    subgraph "Data Processing"
        Aggregator[Metrics Aggregator<br/>Real-time Calculations]
        TrendAnalysis[Trend Analysis<br/>Growth Patterns]
        Forecasting[Forecasting Engine<br/>Predictive Analytics]
        AlertEngine[Alert Engine<br/>Threshold Monitoring]
    end
    
    AdminUI --> RealTimeMetrics
    RealTimeMetrics --> CachedData
    
    CachedData --> UserMetrics
    CachedData --> ListingMetrics  
    CachedData --> SystemMetrics
    CachedData --> RevenueMetrics
    
    UserMetrics --> UsersTable
    UserMetrics --> SessionsTable
    ListingMetrics --> ListingsTable
    SystemMetrics --> CloudWatchMetrics
    RevenueMetrics --> AuditLogsTable
    
    UsersTable --> Aggregator
    ListingsTable --> Aggregator
    AuditLogsTable --> Aggregator
    CloudWatchMetrics --> Aggregator
    
    Aggregator --> TrendAnalysis
    TrendAnalysis --> Forecasting
    Aggregator --> AlertEngine
    
    style AdminUI fill:#f3e5f5
    style Aggregator fill:#e8f5e8
    style UsersTable fill:#fff3e0
```