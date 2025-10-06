# 🔧 Backend Services Documentation

## 📋 **Overview**

The HarborList backend is a microservices-based architecture built with Node.js 18 and TypeScript, deployed as AWS Lambda functions. The system provides robust APIs for boat listings, user management, authentication, and administrative functions with comprehensive security, audit logging, and monitoring.

**Current Implementation**: October 2025 - Based on actual deployed codebase

---

## 🏗️ **Backend Architecture (Current Structure)**

### **Actual Service Structure**

### **Backend Microservices Architecture**

```mermaid
graph TB
    subgraph "Backend Services - backend/src/"
        BackendRoot[backend/src/<br/>🔧 Node.js 18 + TypeScript<br/>Microservices Architecture]
        
        subgraph "Core Services"
            AdminService[admin-service/<br/>👤 Administrative Operations<br/>• RBAC Implementation<br/>• Analytics Dashboard<br/>• User Management<br/>• Audit Logging]
            
            AuthService[auth-service/<br/>🔐 Authentication & Security<br/>• JWT Token Management<br/>• MFA Support<br/>• Session Management<br/>• Password Security]
            
            ListingService[listing/<br/>🚢 Boat Listing Management<br/>• CRUD Operations<br/>• Ownership Validation<br/>• Status Management<br/>• Business Rules]
            
            ListingEnhanced[listing-service/<br/>🚢 Enhanced Listing Operations<br/>• Authentication Utilities<br/>• Advanced Validation<br/>• Extended Features]
        end
        
        subgraph "Specialized Services"
            SearchService[search/<br/>🔍 Search & Filtering<br/>• DynamoDB-based Search<br/>• Advanced Filtering<br/>• Geospatial Queries<br/>• Performance Optimization]
            
            MediaService[media/<br/>📸 Media Management<br/>• S3 Integration<br/>• Image Processing (Sharp)<br/>• Presigned URLs<br/>• CDN Integration]
            
            EmailService[email/<br/>📧 Email Communications<br/>• SES Integration<br/>• Template Management<br/>• Notification System<br/>• Delivery Tracking]
            
            StatsService[stats-service/<br/>📊 Analytics & Metrics<br/>• Real-time Statistics<br/>• Business Intelligence<br/>• Performance Metrics<br/>• Reporting]
        end
        
        subgraph "Shared Infrastructure"
            SharedUtils[shared/<br/>🔄 Common Utilities<br/>• database.ts - DynamoDB Client<br/>• utils.ts - Response Formatting<br/>• middleware.ts - Auth & Logging]
            
            TypeDefs[types/<br/>📝 TypeScript Definitions<br/>• common.ts - Shared Interfaces<br/>• API Types & Enums<br/>• Database Schemas<br/>• Response Models]
        end
        
        subgraph "Service Implementation Details"
            AdminImpl[Admin Service Files<br/>• index.ts - Main Handler<br/>• versioning.ts - API Versions<br/>• *.test.ts - Test Suite]
            
            AuthImpl[Auth Service Files<br/>• index.ts - Auth Handlers<br/>• JWT Management<br/>• MFA Implementation]
            
            ListingImpl[Listing Service Files<br/>• index.ts - CRUD Operations<br/>• Validation Logic<br/>• Business Rules]
        end
    end
    
    BackendRoot --> AdminService
    BackendRoot --> AuthService
    BackendRoot --> ListingService
    BackendRoot --> ListingEnhanced
    BackendRoot --> SearchService
    BackendRoot --> MediaService
    BackendRoot --> EmailService
    BackendRoot --> StatsService
    BackendRoot --> SharedUtils
    BackendRoot --> TypeDefs
    
    AdminService --> AdminImpl
    AuthService --> AuthImpl
    ListingService --> ListingImpl
    
    %% Dependencies
    AdminService -.-> SharedUtils
    AuthService -.-> SharedUtils
    ListingService -.-> SharedUtils
    SearchService -.-> SharedUtils
    MediaService -.-> SharedUtils
    EmailService -.-> SharedUtils
    StatsService -.-> SharedUtils
    
    AdminService -.-> TypeDefs
    AuthService -.-> TypeDefs
    ListingService -.-> TypeDefs
    
    style BackendRoot fill:#e3f2fd,stroke:#1565c0,stroke-width:3px
    style AdminService fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style AuthService fill:#ffebee,stroke:#d32f2f,stroke-width:2px
    style ListingService fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    style SearchService fill:#e0f2f1,stroke:#00796b,stroke-width:2px
    style MediaService fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style EmailService fill:#fce4ec,stroke:#ad1457,stroke-width:2px
    style StatsService fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    style SharedUtils fill:#f1f8e9,stroke:#689f38,stroke-width:2px
    style TypeDefs fill:#fafafa,stroke:#616161,stroke-width:2px
```

### **Lambda Functions & Deployment**

```typescript
// Current Lambda deployment configuration from CDK
const lambdaFunctions = {
  authFunction: {
    handler: 'auth-service/index.handler',
    runtime: 'nodejs18.x',
    timeout: 30,
    environment: {
      USERS_TABLE: 'boat-users',
      JWT_SECRET_ARN: 'arn:aws:secretsmanager:...',
      LOGIN_ATTEMPTS_TABLE: 'boat-login-attempts'
    }
  },
  listingFunction: {
    handler: 'listing/index.handler', 
    runtime: 'nodejs18.x',
    environment: {
      LISTINGS_TABLE: 'boat-listings',
      USERS_TABLE: 'boat-users'
    }
  },
  adminFunction: {
    handler: 'admin-service/index.handler',
    runtime: 'nodejs18.x',
    timeout: 30,
    memorySize: 512,
    environment: {
      AUDIT_LOGS_TABLE: 'boat-audit-logs',
      ADMIN_SESSIONS_TABLE: 'boat-admin-sessions',
      JWT_SECRET_ARN: 'arn:aws:secretsmanager:...'
    }
  },
  searchFunction: {
    handler: 'search/index.handler',
    environment: {
      LISTINGS_TABLE: 'boat-listings'
    }
  },
  mediaFunction: {
    handler: 'media/index.handler',
    environment: {
      MEDIA_BUCKET: 'boat-listing-media-[account]',
      THUMBNAILS_BUCKET: 'boat-listing-media-[account]'
    }
  },
  emailFunction: {
    handler: 'email/index.handler'
  },
  statsFunction: {
    handler: 'stats-service/index.handler',
    environment: {
      LISTINGS_TABLE: 'boat-listings',
      USERS_TABLE: 'boat-users'
    }
  }
};
```

### **Technology Stack & Deep Implementation Details**

| Technology | Version | Purpose | Implementation Details |
|------------|---------|---------|----------------------|
| **Node.js** | 18.x LTS | Runtime Environment | Lambda Layer optimization, ES modules support, memory profiling |
| **TypeScript** | 5.0+ | Type Safety | Strict mode, path mapping, incremental compilation |
| **AWS Lambda** | Latest | Serverless Compute | Provisioned concurrency, ARM64 Graviton2 processors |
| **API Gateway** | REST API | HTTP Management | CORS pre-flight, request validation, throttling |
| **DynamoDB** | Latest | NoSQL Database | Adaptive capacity, DAX caching layer, stream processing |
| **S3** | Latest | Object Storage | Multipart uploads, lifecycle rules, CloudFront integration |
| **SES** | Latest | Email Service | DKIM authentication, bounce handling, reputation monitoring |
| **CloudWatch** | Latest | Observability | Custom metrics, log insights, X-Ray tracing integration |

### **Performance Optimizations**

```typescript
// Lambda Cold Start Optimization
export const handler = async (event: APIGatewayProxyEvent) => {
  // Connection pooling for DynamoDB
  const dynamoClient = new DynamoDBClient({
    region: process.env.AWS_REGION,
    maxAttempts: 3,
    retryMode: 'adaptive'
  });

  // Implement connection reuse across invocations
  const docClient = DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertClassInstanceToMap: true
    }
  });

  // Memory optimization for large payloads
  const response = await processRequest(event);
  
  // Explicit garbage collection hints for Node.js 18
  if (global.gc && process.memoryUsage().heapUsed > 100 * 1024 * 1024) {
    global.gc();
  }
  
  return response;
};

// Database connection optimization
class DatabaseOptimizer {
  private static instance: DynamoDBDocumentClient;
  
  static getInstance(): DynamoDBDocumentClient {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = DynamoDBDocumentClient.from(
        new DynamoDBClient({
          region: process.env.AWS_REGION,
          httpOptions: {
            connectTimeout: 3000,    // 3 second connection timeout
            timeout: 10000,         // 10 second total timeout
            agent: new Agent({      // HTTP keep-alive
              keepAlive: true,
              maxSockets: 50
            })
          }
        })
      );
    }
    return DatabaseOptimizer.instance;
  }
}
```

---

## 🔐 **Authentication Service - Deep Implementation**

### **JWT Token Management & Security Layer**

```typescript
// Complete JWT Configuration with Security Features
interface JWTTokenPayload {
  sub: string;           // User ID (primary identifier)
  email: string;         // User email for lookup
  name: string;          // Display name
  role: UserRole;        // Role-based access control
  permissions?: AdminPermission[];  // Granular permissions for admin users
  iat: number;           // Issued at timestamp
  exp: number;           // Expiration timestamp
  jti: string;           // JWT ID for token blacklisting
  aud: string;           // Audience (harborlist-marketplace)
  iss: string;           // Issuer (auth-service)
}

// Advanced Token Management with Environment-Conditional Secrets
export class TokenService {
  private jwtSecret: string | null = null;
  private readonly blacklistedTokens = new Set<string>();

  constructor() {
    // JWT secret is now retrieved dynamically based on environment
  }

  /**
   * Environment-conditional JWT secret retrieval
   * Local: Hardcoded secret (fast, no AWS costs)
   * AWS: Secrets Manager (secure, encrypted)
   */
  private async getJwtSecret(): Promise<string> {
    if (this.jwtSecret) {
      return this.jwtSecret;
    }

    const environment = process.env.ENVIRONMENT || 'local';
    
    if (environment === 'local') {
      // Local development - use hardcoded secret
      this.jwtSecret = process.env.JWT_SECRET || 'local-dev-secret-harborlist-2025';
    } else {
      // AWS environments - retrieve from Secrets Manager
      const authConfig = await getAuthConfig();
      this.jwtSecret = authConfig.JWT_SECRET;
    }
    
    return this.jwtSecret;
  }

  async generateTokenPair(user: User): Promise<TokenPair> {
    const jti = generateUUID();
    const now = Math.floor(Date.now() / 1000);
    
    const accessTokenPayload: JWTTokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.role === 'admin' ? user.permissions : undefined,
      iat: now,
      exp: now + (15 * 60), // 15 minutes
      jti: jti,
      aud: 'harborlist-marketplace',
      iss: 'auth-service'
    };

    const refreshTokenPayload = {
      sub: user.id,
      type: 'refresh',
      iat: now,
      exp: now + (7 * 24 * 60 * 60), // 7 days
      jti: generateUUID()
    };

    const accessToken = jwt.sign(accessTokenPayload, this.jwtSecret, {
      algorithm: 'HS256',
      header: {
        typ: 'JWT',
        alg: 'HS256',
        kid: process.env.JWT_KEY_ID || 'default'
      }
    });

    const refreshToken = jwt.sign(refreshTokenPayload, this.jwtSecret, {
      algorithm: 'HS256'
    });

    // Store refresh token in DynamoDB for tracking and revocation
    await this.storeRefreshToken(user.id, refreshTokenPayload.jti, refreshTokenPayload.exp);

    return { accessToken, refreshToken, expiresIn: 900 }; // 15 minutes
  }

  async verifyToken(token: string): Promise<JWTTokenPayload> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
        audience: 'harborlist-marketplace',
        issuer: 'auth-service'
      }) as JWTTokenPayload;

      // Check token blacklist
      if (this.blacklistedTokens.has(decoded.jti)) {
        throw new Error('Token has been revoked');
      }

      // Verify token hasn't expired (additional check)
      if (decoded.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token has expired');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error(`Invalid token: ${error.message}`);
      }
      throw error;
    }
  }

  async revokeToken(jti: string): Promise<void> {
    this.blacklistedTokens.add(jti);
    
    // Store in DynamoDB for persistence across Lambda instances
    await this.docClient.put({
      TableName: process.env.BLACKLISTED_TOKENS_TABLE!,
      Item: {
        jti: jti,
        revokedAt: Date.now(),
        ttl: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hour TTL
      }
    }).promise();
  }

  private async getSecretFromAWS(): Promise<string> {
    const secretsManager = new SecretsManagerClient({});
    const response = await secretsManager.send(
      new GetSecretValueCommand({
        SecretId: process.env.JWT_SECRET_ARN!
      })
    );
    
    const secret = JSON.parse(response.SecretString!);
    return secret.jwtSecret;
  }
}

// Authentication Middleware with Advanced Security Features
export const withAuthentication = (requiredPermissions?: AdminPermission[]) => {
  return async (event: APIGatewayProxyEvent): Promise<AuthenticatedEvent> => {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);
    
    try {
      const payload = await tokenService.verifyToken(token);
      
      // Rate limiting by user
      await rateLimiter.checkUserLimit(payload.sub, 'api_requests', 1000, 60000); // 1000 req/min
      
      // Permission validation for admin endpoints
      if (requiredPermissions && requiredPermissions.length > 0) {
        if (payload.role !== 'admin' && payload.role !== 'superadmin') {
          throw new ForbiddenError('Admin access required');
        }
        
        const hasRequiredPermissions = requiredPermissions.every(permission =>
          payload.permissions?.includes(permission)
        );
        
        if (!hasRequiredPermissions) {
          throw new ForbiddenError('Insufficient permissions');
        }
      }

      // Audit logging for authenticated requests
      await auditLogger.log({
        userId: payload.sub,
        action: `${event.httpMethod} ${event.path}`,
        timestamp: new Date().toISOString(),
        ipAddress: event.requestContext.identity?.sourceIp,
        userAgent: event.headers?.['User-Agent'],
        sessionId: event.headers?.['X-Session-Id']
      });

      return {
        ...event,
        user: payload,
        requestContext: {
          ...event.requestContext,
          authorizer: {
            userId: payload.sub,
            role: payload.role,
            permissions: payload.permissions || []
          }
        }
      } as AuthenticatedEvent;
      
    } catch (error) {
      // Security event logging for failed authentication
      await securityLogger.logSecurityEvent({
        type: 'AUTHENTICATION_FAILURE',
        severity: 'MEDIUM',
        ipAddress: event.requestContext.identity?.sourceIp,
        userAgent: event.headers?.['User-Agent'],
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  };
};

// Session Management for Admin Users
export class SessionManager {
  private readonly SESSION_TABLE = process.env.ADMIN_SESSIONS_TABLE!;
  private readonly SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour

  async createSession(userId: string, metadata: SessionMetadata): Promise<Session> {
    const sessionId = generateUUID();
    const now = Date.now();
    
    const session: Session = {
      sessionId,
      userId,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + this.SESSION_TIMEOUT,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      isActive: true
    };

    await this.docClient.put({
      TableName: this.SESSION_TABLE,
      Item: session
    }).promise();

    // Cleanup old sessions for this user (keep only latest 5)
    await this.cleanupOldSessions(userId);

    return session;
  }

  async validateSession(sessionId: string): Promise<Session | null> {
    const result = await this.docClient.get({
      TableName: this.SESSION_TABLE,
      Key: { sessionId }
    }).promise();

    if (!result.Item) {
      return null;
    }

    const session = result.Item as Session;
    
    // Check if session is expired
    if (session.expiresAt < Date.now() || !session.isActive) {
      await this.invalidateSession(sessionId);
      return null;
    }

    // Update last activity
    await this.updateLastActivity(sessionId);
    
    return session;
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.docClient.update({
      TableName: this.SESSION_TABLE,
      Key: { sessionId },
      UpdateExpression: 'SET isActive = :false, invalidatedAt = :now',
      ExpressionAttributeValues: {
        ':false': false,
        ':now': Date.now()
      }
    }).promise();
  }

  private async updateLastActivity(sessionId: string): Promise<void> {
    const now = Date.now();
    await this.docClient.update({
      TableName: this.SESSION_TABLE,
      Key: { sessionId },
      UpdateExpression: 'SET lastActivity = :now, expiresAt = :expires',
      ExpressionAttributeValues: {
        ':now': now,
        ':expires': now + this.SESSION_TIMEOUT
      }
    }).promise();
  }
}
```

---

## 🛡️ **Admin Service - Advanced RBAC & Management**

### **Role-Based Access Control (RBAC) Deep Implementation**

```typescript
// Comprehensive Permission System
export enum AdminPermission {
  // User Management
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  USER_SUSPEND = 'user:suspend',
  USER_SESSIONS_MANAGE = 'user:sessions:manage',
  
  // Content Management
  CONTENT_READ = 'content:read',
  CONTENT_MODERATE = 'content:moderate',
  CONTENT_DELETE = 'content:delete',
  CONTENT_FEATURE = 'content:feature',
  
  // System Administration
  SYSTEM_HEALTH = 'system:health',
  SYSTEM_METRICS = 'system:metrics',
  SYSTEM_LOGS = 'system:logs',
  SYSTEM_CONFIG = 'system:config',
  
  // Analytics & Reporting
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_EXPORT = 'analytics:export',
  ANALYTICS_PII = 'analytics:pii',
  
  // Audit & Compliance
  AUDIT_READ = 'audit:read',
  AUDIT_EXPORT = 'audit:export',
  
  // Super Admin
  ADMIN_MANAGE = 'admin:manage',
  ROLE_ASSIGN = 'role:assign'
}

// Role Definitions with Hierarchical Permissions
export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  viewer: [
    AdminPermission.USER_READ,
    AdminPermission.CONTENT_READ,
    AdminPermission.ANALYTICS_READ
  ],
  
  moderator: [
    ...ROLE_PERMISSIONS.viewer,
    AdminPermission.CONTENT_MODERATE,
    AdminPermission.USER_SUSPEND,
    AdminPermission.AUDIT_READ
  ],
  
  admin: [
    ...ROLE_PERMISSIONS.moderator,
    AdminPermission.USER_WRITE,
    AdminPermission.CONTENT_DELETE,
    AdminPermission.SYSTEM_HEALTH,
    AdminPermission.SYSTEM_METRICS,
    AdminPermission.ANALYTICS_EXPORT,
    AdminPermission.USER_SESSIONS_MANAGE
  ],
  
  superadmin: [
    ...ROLE_PERMISSIONS.admin,
    AdminPermission.USER_DELETE,
    AdminPermission.SYSTEM_CONFIG,
    AdminPermission.ANALYTICS_PII,
    AdminPermission.AUDIT_EXPORT,
    AdminPermission.ADMIN_MANAGE,
    AdminPermission.ROLE_ASSIGN
  ]
};

// Advanced Permission Checker with Context Awareness
export class PermissionManager {
  constructor(private auditLogger: AuditLogger) {}

  async checkPermission(
    userId: string,
    permission: AdminPermission,
    context?: PermissionContext
  ): Promise<boolean> {
    const user = await this.getAdminUser(userId);
    
    if (!user || user.status !== 'active') {
      await this.auditLogger.log({
        userId,
        action: 'PERMISSION_DENIED',
        resource: permission,
        reason: 'User inactive or not found',
        timestamp: Date.now()
      });
      return false;
    }

    // Check role-based permissions
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    const hasBasePermission = userPermissions.includes(permission);
    
    if (!hasBasePermission) {
      await this.auditLogger.log({
        userId,
        action: 'PERMISSION_DENIED',
        resource: permission,
        reason: 'Insufficient role permissions',
        userRole: user.role,
        timestamp: Date.now()
      });
      return false;
    }

    // Context-aware permission checks
    if (context) {
      const contextCheck = await this.checkContextualPermissions(user, permission, context);
      if (!contextCheck.allowed) {
        await this.auditLogger.log({
          userId,
          action: 'PERMISSION_DENIED',
          resource: permission,
          reason: contextCheck.reason,
          context: context,
          timestamp: Date.now()
        });
        return false;
      }
    }

    return true;
  }

  private async checkContextualPermissions(
    user: AdminUser,
    permission: AdminPermission,
    context: PermissionContext
  ): Promise<{ allowed: boolean; reason?: string }> {
    
    // Resource ownership validation
    if (context.resourceType === 'user' && context.resourceId) {
      // Users cannot modify their own admin status
      if (context.resourceId === user.id && 
          [AdminPermission.USER_DELETE, AdminPermission.ROLE_ASSIGN].includes(permission)) {
        return { allowed: false, reason: 'Cannot modify own admin status' };
      }
    }

    // Time-based access restrictions
    if (context.timeRestrictions) {
      const now = new Date();
      const currentHour = now.getHours();
      
      if (context.timeRestrictions.businessHoursOnly && (currentHour < 9 || currentHour > 17)) {
        return { allowed: false, reason: 'Action restricted to business hours' };
      }
    }

    // IP-based restrictions for sensitive operations
    if (context.ipAddress && permission === AdminPermission.SYSTEM_CONFIG) {
      const allowedIPs = await this.getAllowedIPs();
      if (!allowedIPs.includes(context.ipAddress)) {
        return { allowed: false, reason: 'IP not in allowed list for system configuration' };
      }
    }

    return { allowed: true };
  }
}

// Comprehensive Admin Analytics Engine
export class AdminAnalyticsService {
  private readonly ANALYTICS_TABLE = process.env.ANALYTICS_TABLE!;
  private readonly metricsCollector = new MetricsCollector();

  async generatePlatformMetrics(dateRange: DateRange): Promise<PlatformMetrics> {
    const startTime = performance.now();
    
    try {
      // Parallel data collection for performance
      const [userMetrics, listingMetrics, engagementMetrics, revenueMetrics] = await Promise.all([
        this.getUserMetrics(dateRange),
        this.getListingMetrics(dateRange),
        this.getEngagementMetrics(dateRange),
        this.getRevenueMetrics(dateRange)
      ]);

      // Real-time calculations
      const totalUsers = userMetrics.newUsers + userMetrics.returningUsers;
      const conversionRate = listingMetrics.totalListings > 0 
        ? (listingMetrics.soldListings / listingMetrics.totalListings) * 100 
        : 0;

      const platformMetrics: PlatformMetrics = {
        dateRange,
        overview: {
          totalUsers,
          activeUsers: userMetrics.activeUsers,
          totalListings: listingMetrics.totalListings,
          activeLisings: listingMetrics.activeListings,
          totalViews: engagementMetrics.totalViews,
          conversionRate,
          averagePrice: listingMetrics.averagePrice,
          platformRevenue: revenueMetrics.totalRevenue
        },
        growth: {
          userGrowth: this.calculateGrowthRate(userMetrics.previousPeriod?.newUsers, userMetrics.newUsers),
          listingGrowth: this.calculateGrowthRate(listingMetrics.previousPeriod?.newListings, listingMetrics.newListings),
          revenueGrowth: this.calculateGrowthRate(revenueMetrics.previousPeriod?.revenue, revenueMetrics.totalRevenue)
        },
        geographic: await this.getGeographicDistribution(dateRange),
        categories: await this.getCategoryBreakdown(dateRange),
        timeSeriesData: await this.getTimeSeriesData(dateRange),
        generatedAt: Date.now(),
        processingTime: performance.now() - startTime
      };

      // Cache results for faster subsequent requests
      await this.cacheMetrics(dateRange, platformMetrics);

      return platformMetrics;
      
    } catch (error) {
      logger.error('Error generating platform metrics', { error, dateRange });
      throw new Error('Failed to generate platform metrics');
    }
  }

  private async getUserMetrics(dateRange: DateRange): Promise<UserMetrics> {
    const params = {
      TableName: process.env.USERS_TABLE!,
      FilterExpression: '#createdAt BETWEEN :start AND :end',
      ExpressionAttributeNames: {
        '#createdAt': 'createdAt'
      },
      ExpressionAttributeValues: {
        ':start': dateRange.startDate,
        ':end': dateRange.endDate
      }
    };

    const result = await this.docClient.scan(params).promise();
    const users = result.Items as User[];

    // Active users in last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const activeUsers = users.filter(user => 
      user.lastLoginAt && user.lastLoginAt > thirtyDaysAgo
    );

    // New vs returning user analysis
    const newUsers = users.filter(user => user.createdAt >= dateRange.startDate);
    const returningUsers = activeUsers.filter(user => user.createdAt < dateRange.startDate);

    return {
      totalUsers: users.length,
      newUsers: newUsers.length,
      returningUsers: returningUsers.length,
      activeUsers: activeUsers.length,
      userRetentionRate: users.length > 0 ? (returningUsers.length / users.length) * 100 : 0,
      averageSessionDuration: await this.calculateAverageSessionDuration(users),
      topUserLocations: this.getTopLocations(users)
    };
  }

  private async getListingMetrics(dateRange: DateRange): Promise<ListingMetrics> {
    // Use GSI for efficient querying by date
    const params = {
      TableName: process.env.LISTINGS_TABLE!,
      IndexName: 'date-index',
      KeyConditionExpression: '#date BETWEEN :start AND :end',
      ExpressionAttributeNames: {
        '#date': 'createdAt'
      },
      ExpressionAttributeValues: {
        ':start': dateRange.startDate,
        ':end': dateRange.endDate
      }
    };

    const result = await this.docClient.query(params).promise();
    const listings = result.Items as Listing[];

    const activeListings = listings.filter(listing => listing.status === 'active');
    const soldListings = listings.filter(listing => listing.status === 'sold');
    const totalViews = listings.reduce((sum, listing) => sum + (listing.views || 0), 0);
    const averagePrice = listings.length > 0 
      ? listings.reduce((sum, listing) => sum + listing.price, 0) / listings.length 
      : 0;

    return {
      totalListings: listings.length,
      newListings: listings.filter(listing => 
        listing.createdAt >= dateRange.startDate && listing.createdAt <= dateRange.endDate
      ).length,
      activeListings: activeListings.length,
      soldListings: soldListings.length,
      averagePrice,
      totalViews,
      averageViewsPerListing: listings.length > 0 ? totalViews / listings.length : 0,
      priceDistribution: this.calculatePriceDistribution(listings),
      popularCategories: this.getPopularCategories(listings),
      averageTimeToSale: await this.calculateAverageTimeToSale(soldListings)
    };
  }
}

// Real-time System Health Monitoring
export class SystemHealthMonitor {
  private readonly cloudWatch = new CloudWatchClient({});
  private readonly healthChecks = new Map<string, HealthCheck>();

  async performComprehensiveHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();
    
    try {
      // Parallel health checks for all system components
      const [
        apiHealth,
        databaseHealth, 
        storageHealth,
        emailHealth,
        cacheHealth,
        externalServicesHealth
      ] = await Promise.all([
        this.checkAPIHealth(),
        this.checkDatabaseHealth(),
        this.checkStorageHealth(),
        this.checkEmailServiceHealth(),
        this.checkCacheHealth(),
        this.checkExternalServices()
      ]);

      const overallStatus = this.determineOverallHealth([
        apiHealth, databaseHealth, storageHealth, emailHealth, cacheHealth, externalServicesHealth
      ]);

      const systemHealth: SystemHealth = {
        status: overallStatus,
        timestamp: Date.now(),
        checkDuration: Date.now() - startTime,
        services: {
          api: apiHealth,
          database: databaseHealth,
          storage: storageHealth,
          email: emailHealth,
          cache: cacheHealth,
          external: externalServicesHealth
        },
        metrics: await this.collectSystemMetrics(),
        alerts: await this.getActiveAlerts()
      };

      // Store health check result for historical analysis
      await this.storeHealthCheckResult(systemHealth);

      return systemHealth;

    } catch (error) {
      logger.error('Health check failed', { error });
      
      return {
        status: 'critical',
        timestamp: Date.now(),
        checkDuration: Date.now() - startTime,
        error: error.message,
        services: {},
        metrics: {},
        alerts: []
      };
    }
  }

  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Test read operation
      const readTest = await this.docClient.scan({
        TableName: process.env.LISTINGS_TABLE!,
        Limit: 1
      }).promise();

      // Test write operation (with cleanup)
      const testId = `health-check-${Date.now()}`;
      await this.docClient.put({
        TableName: process.env.LISTINGS_TABLE!,
        Item: {
          listingId: testId,
          title: 'Health Check Test',
          ttl: Math.floor(Date.now() / 1000) + 60 // Expire in 1 minute
        }
      }).promise();

      // Cleanup test record
      await this.docClient.delete({
        TableName: process.env.LISTINGS_TABLE!,
        Key: { listingId: testId }
      }).promise();

      const responseTime = Date.now() - startTime;

      // Get DynamoDB metrics
      const metrics = await this.getDynamoDBMetrics();

      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: Date.now(),
        metrics: {
          readLatency: metrics.readLatency,
          writeLatency: metrics.writeLatency,
          throttling: metrics.throttledRequests,
          connectionCount: metrics.connectionCount
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: Date.now(),
        error: error.message
      };
    }
  }

  private async getDynamoDBMetrics(): Promise<DatabaseMetrics> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 5 * 60 * 1000); // Last 5 minutes

    const params = {
      Namespace: 'AWS/DynamoDB',
      MetricName: 'ConsumedReadCapacityUnits',
      Dimensions: [
        {
          Name: 'TableName',
          Value: process.env.LISTINGS_TABLE!
        }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 300, // 5 minutes
      Statistics: ['Average']
    };

    try {
      const result = await this.cloudWatch.send(
        new GetMetricStatisticsCommand(params)
      );

      return {
        readLatency: result.Datapoints?.[0]?.Average || 0,
        writeLatency: 0, // Would need separate query
        throttledRequests: 0, // Would need separate query  
        connectionCount: 0 // Would need separate query
      };
    } catch (error) {
      logger.warn('Failed to fetch DynamoDB metrics', { error });
      return {
        readLatency: 0,
        writeLatency: 0,
        throttledRequests: 0,
        connectionCount: 0
      };
    }
  }
}
```

### **Multi-Factor Authentication (MFA) Implementation**

```typescript
// TOTP-based MFA for Admin Users
export class MFAService {
  private readonly MFA_TABLE = process.env.MFA_TABLE || 'boat-mfa-settings';
  
  async setupMFA(userId: string): Promise<MFASetup> {
    const secret = authenticator.generateSecret();
    const qrCodeUrl = await this.generateQRCode(userId, secret);
    const backupCodes = this.generateBackupCodes();
    
    // Store temporarily (not verified yet)
    await this.docClient.put({
      TableName: this.MFA_TABLE,
      Item: {
        userId,
        secret,
        backupCodes,
        isVerified: false,
        createdAt: Date.now(),
        ttl: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes to verify
      }
    }).promise();
    
    return {
      secret,
      qrCodeUrl,
      backupCodes
    };
  }
  
  async verifyMFA(userId: string, token: string): Promise<boolean> {
    const mfaRecord = await this.getMFARecord(userId);
    
    if (!mfaRecord) {
      throw new Error('MFA not set up for user');
    }
    
    // Verify TOTP token
    const isValidToken = authenticator.verify({
      token,
      secret: mfaRecord.secret
    });
    
    // Check backup codes if TOTP fails
    if (!isValidToken && mfaRecord.backupCodes?.includes(token)) {
      // Remove used backup code
      const updatedCodes = mfaRecord.backupCodes.filter(code => code !== token);
      await this.updateBackupCodes(userId, updatedCodes);
      return true;
    }
    
    if (isValidToken && !mfaRecord.isVerified) {
      // Mark MFA as verified on first successful verification
      await this.markMFAVerified(userId);
    }
    
    return isValidToken;
  }
  
  private generateBackupCodes(): string[] {
    return Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
  }
  
  private async generateQRCode(userId: string, secret: string): Promise<string> {
    const user = await this.getUserById(userId);
    const serviceName = 'HarborList';
    const accountName = user.email;
    
    const otpauthUrl = authenticator.keyuri(accountName, serviceName, secret);
    return qrcode.toDataURL(otpauthUrl);
  }
}
```
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions,
        type: 'access',
      },
      this.config.accessToken.secret,
      {
        expiresIn: this.config.accessToken.expiresIn,
        algorithm: this.config.accessToken.algorithm,
        issuer: 'harborlist-auth',
        audience: 'harborlist-api',
      }
    );
  }

  generateRefreshToken(userId: string): string {
    return jwt.sign(
      {
        userId,
        type: 'refresh',
        jti: generateUUID(), // Unique token ID for revocation
      },
      this.config.refreshToken.secret,
      {
        expiresIn: this.config.refreshToken.expiresIn,
        algorithm: this.config.refreshToken.algorithm,
      }
    );
  }

  async verifyToken(token: string, type: 'access' | 'refresh' | 'admin'): Promise<TokenPayload> {
    try {
      const secret = this.getSecret(type);
      const payload = jwt.verify(token, secret) as TokenPayload;
      
      // Validate token type
      if (payload.type !== type) {
        throw new AuthError('Invalid token type', 'INVALID_TOKEN_TYPE');
      }

      // Check if token is revoked (for refresh tokens)
      if (type === 'refresh') {
        const isRevoked = await this.isTokenRevoked(payload.jti);
        if (isRevoked) {
          throw new AuthError('Token has been revoked', 'TOKEN_REVOKED');
        }
      }

      return payload;
    } catch (error) {
      throw new AuthError('Invalid token', 'TOKEN_INVALID');
    }
  }

  private getSecret(type: 'access' | 'refresh' | 'admin'): string {
    switch (type) {
      case 'access':
        return this.config.accessToken.secret;
      case 'refresh':
        return this.config.refreshToken.secret;
      case 'admin':
        return this.config.adminToken.secret;
    }
  }
}

// User Authentication Handler
export const loginHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { email, password } = JSON.parse(event.body || '{}');

    // Validate input
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      return createErrorResponse(400, 'Invalid input', validation.error.errors);
    }

    // Find user
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Use same timing to prevent email enumeration
      await bcrypt.compare(password, '$2b$10$dummy.hash');
      return createErrorResponse(401, 'Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return createErrorResponse(401, 'Invalid credentials');
    }

    // Check account status
    if (user.status !== UserStatus.ACTIVE) {
      return createErrorResponse(403, 'Account is not active');
    }

    // Generate tokens
    const tokenService = new TokenService(tokenConfig);
    const accessToken = tokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    });
    
    const refreshToken = tokenService.generateRefreshToken(user.id);

    // Store refresh token
    await refreshTokenRepository.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Update last login
    await userRepository.updateLastLogin(user.id);

    // Log successful login
    await auditLogger.log({
      userId: user.id,
      action: 'user_login',
      resource: 'auth',
      metadata: {
        ip: event.requestContext.identity.sourceIp,
        userAgent: event.headers['User-Agent'],
      },
    });

    return createSuccessResponse({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
    });

  } catch (error) {
    console.error('Login error:', error);
    
    await auditLogger.log({
      action: 'login_failed',
      resource: 'auth',
      metadata: {
        error: error.message,
        ip: event.requestContext.identity.sourceIp,
      },
    });

    return createErrorResponse(500, 'Internal server error');
  }
};
```

### **Admin Multi-Factor Authentication**

```typescript
// MFA Service Implementation
export class MFAService {
  constructor(
    private totpService: TOTPService,
    private smsService: SMSService,
    private auditLogger: AuditLogger
  ) {}

  async setupTOTP(adminId: string): Promise<TOTPSetupResponse> {
    try {
      const admin = await adminRepository.findById(adminId);
      if (!admin) {
        throw new NotFoundError('Admin not found');
      }

      // Generate TOTP secret
      const secret = this.totpService.generateSecret();
      
      // Store temporary secret (not activated until verified)
      await mfaRepository.storeTempSecret(adminId, secret);

      // Generate QR code
      const qrCode = await this.totpService.generateQRCode(
        admin.email,
        'HarborList Admin',
        secret
      );

      return {
        secret,
        qrCode,
        backupCodes: this.generateBackupCodes(),
      };

    } catch (error) {
      console.error('TOTP setup error:', error);
      throw error;
    }
  }

  async verifyTOTP(adminId: string, token: string, isSetup = false): Promise<boolean> {
    try {
      const admin = await adminRepository.findById(adminId);
      if (!admin) {
        throw new NotFoundError('Admin not found');
      }

      let secret: string;
      
      if (isSetup) {
        // Get temporary secret during setup
        const tempSecret = await mfaRepository.getTempSecret(adminId);
        if (!tempSecret) {
          throw new BadRequestError('No setup session found');
        }
        secret = tempSecret;
      } else {
        // Get active secret for login
        const mfaConfig = await mfaRepository.getConfig(adminId);
        if (!mfaConfig?.totpSecret) {
          throw new BadRequestError('TOTP not configured');
        }
        secret = mfaConfig.totpSecret;
      }

      // Verify TOTP token
      const isValid = this.totpService.verifyToken(token, secret);
      
      if (isValid && isSetup) {
        // Activate TOTP for admin
        await mfaRepository.activateTOTP(adminId, secret);
        await mfaRepository.deleteTempSecret(adminId);
        
        await this.auditLogger.log({
          userId: adminId,
          action: 'mfa_totp_activated',
          resource: 'admin_auth',
        });
      }

      if (isValid && !isSetup) {
        await this.auditLogger.log({
          userId: adminId,
          action: 'mfa_totp_verified',
          resource: 'admin_auth',
        });
      }

      return isValid;

    } catch (error) {
      console.error('TOTP verification error:', error);
      
      await this.auditLogger.log({
        userId: adminId,
        action: 'mfa_verification_failed',
        resource: 'admin_auth',
        metadata: { error: error.message },
      });

      return false;
    }
  }

  private generateBackupCodes(): string[] {
    return Array.from({ length: 8 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
  }
}

// Admin Login with MFA
export const adminLoginHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { email, password, mfaToken } = JSON.parse(event.body || '{}');

    // Phase 1: Validate credentials
    const admin = await adminRepository.findByEmail(email);
    if (!admin) {
      return createErrorResponse(401, 'Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!isValidPassword) {
      return createErrorResponse(401, 'Invalid credentials');
    }

    // Check if MFA is required
    const mfaConfig = await mfaRepository.getConfig(admin.id);
    
    if (!mfaConfig?.totpSecret) {
      // No MFA configured - require setup
      return createSuccessResponse({
        requiresMFASetup: true,
        adminId: admin.id,
      });
    }

    // Phase 2: Validate MFA token
    if (!mfaToken) {
      return createSuccessResponse({
        requiresMFA: true,
        adminId: admin.id,
      });
    }

    const mfaService = new MFAService(totpService, smsService, auditLogger);
    const isMFAValid = await mfaService.verifyTOTP(admin.id, mfaToken);
    
    if (!isMFAValid) {
      return createErrorResponse(401, 'Invalid MFA token');
    }

    // Generate admin token with enhanced permissions
    const tokenService = new TokenService(tokenConfig);
    const adminToken = tokenService.generateAdminToken({
      adminId: admin.id,
      email: admin.email,
      permissions: admin.permissions,
      mfaVerified: true,
    });

    // Log successful admin login
    await auditLogger.log({
      userId: admin.id,
      action: 'admin_login',
      resource: 'admin_auth',
      metadata: {
        ip: event.requestContext.identity.sourceIp,
        userAgent: event.headers['User-Agent'],
      },
    });

    return createSuccessResponse({
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        permissions: admin.permissions,
      },
      adminToken,
      expiresIn: 1800, // 30 minutes
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
```

---

## 📝 **Listing Service**

### **Boat Listing Management**

```typescript
// Listing Model
interface Listing {
  id: string;
  userId: string;              // Owner of the listing
  title: string;
  description: string;
  price: number;
  currency: 'USD' | 'EUR' | 'GBP';
  
  // Boat Details
  boatType: BoatType;
  manufacturer?: string;
  model?: string;
  year?: number;
  length: number;             // in feet
  beam?: number;              // width in feet
  draft?: number;             // depth in feet
  
  // Location
  location: {
    city: string;
    state: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Media
  images: string[];           // S3 URLs
  documents?: string[];       // Registration, insurance docs
  
  // Status & Visibility
  status: ListingStatus;
  featured: boolean;
  priority: number;           // For sorting
  
  // SEO & Search
  tags: string[];
  searchKeywords?: string[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  expiresAt?: string;
  
  // Analytics
  viewCount: number;
  contactCount: number;
  favoriteCount: number;
  
  // Moderation
  moderationStatus: ModerationStatus;
  moderationNotes?: string;
  moderatedBy?: string;
  moderatedAt?: string;
}

// Listing Repository
export class ListingRepository {
  constructor(private dynamoDb: DynamoDBClient) {}

  async create(listing: CreateListingRequest): Promise<Listing> {
    const now = new Date().toISOString();
    const id = generateUUID();
    
    const newListing: Listing = {
      ...listing,
      id,
      status: ListingStatus.DRAFT,
      featured: false,
      priority: 0,
      viewCount: 0,
      contactCount: 0,
      favoriteCount: 0,
      moderationStatus: ModerationStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    };

    // Single table design - GSI for user listings
    const item = {
      PK: `LISTING#${id}`,
      SK: `METADATA`,
      GSI1PK: `USER#${listing.userId}`,
      GSI1SK: `LISTING#${now}#${id}`,
      GSI2PK: `STATUS#${newListing.status}`,
      GSI2SK: `CREATED#${now}#${id}`,
      Type: 'Listing',
      ...newListing,
    };

    await this.dynamoDb.send(new PutItemCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Item: marshall(item),
      ConditionExpression: 'attribute_not_exists(PK)',
    }));

    // Index for search service
    await this.indexForSearch(newListing);
    
    return newListing;
  }

  async findById(id: string): Promise<Listing | null> {
    try {
      const result = await this.dynamoDb.send(new GetItemCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Key: marshall({
          PK: `LISTING#${id}`,
          SK: 'METADATA',
        }),
      }));

      if (!result.Item) {
        return null;
      }

      const listing = unmarshall(result.Item) as Listing;
      
      // Increment view count asynchronously
      this.incrementViewCount(id).catch(console.error);
      
      return listing;
      
    } catch (error) {
      console.error('Error finding listing:', error);
      throw error;
    }
  }

  async search(filters: SearchFilters): Promise<SearchResponse> {
    // Use OpenSearch for complex queries
    const searchService = new SearchService();
    return await searchService.search(filters);
  }

  async update(id: string, userId: string, updates: UpdateListingRequest): Promise<Listing> {
    const now = new Date().toISOString();
    
    // Build update expression
    const updateExpr = this.buildUpdateExpression(updates, now);
    
    try {
      const result = await this.dynamoDb.send(new UpdateItemCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Key: marshall({
          PK: `LISTING#${id}`,
          SK: 'METADATA',
        }),
        UpdateExpression: updateExpr.expression,
        ExpressionAttributeNames: updateExpr.names,
        ExpressionAttributeValues: marshall(updateExpr.values),
        ConditionExpression: 'userId = :userId AND attribute_exists(PK)',
        ExpressionAttributeValues: {
          ...marshall(updateExpr.values),
          ':userId': { S: userId },
        },
        ReturnValues: 'ALL_NEW',
      }));

      const updatedListing = unmarshall(result.Attributes!) as Listing;
      
      // Update search index
      await this.indexForSearch(updatedListing);
      
      return updatedListing;
      
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new ForbiddenError('Not authorized to update this listing');
      }
      throw error;
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      await this.dynamoDb.send(new DeleteItemCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Key: marshall({
          PK: `LISTING#${id}`,
          SK: 'METADATA',
        }),
        ConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: marshall({
          ':userId': userId,
        }),
      }));

      // Remove from search index
      const searchService = new SearchService();
      await searchService.deleteDocument(id);
      
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new ForbiddenError('Not authorized to delete this listing');
      }
      throw error;
    }
  }

  private async indexForSearch(listing: Listing): Promise<void> {
    const searchService = new SearchService();
    await searchService.indexListing(listing);
  }

  private async incrementViewCount(listingId: string): Promise<void> {
    try {
      await this.dynamoDb.send(new UpdateItemCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Key: marshall({
          PK: `LISTING#${listingId}`,
          SK: 'METADATA',
        }),
        UpdateExpression: 'ADD viewCount :inc',
        ExpressionAttributeValues: marshall({
          ':inc': 1,
        }),
      }));
    } catch (error) {
      console.error('Error incrementing view count:', error);
      // Don't throw - this is a background operation
    }
  }
}

// Listing Handlers
export const createListingHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUserIdFromToken(event);
    const listingData = JSON.parse(event.body || '{}');

    // Validate input
    const validation = createListingSchema.safeParse(listingData);
    if (!validation.success) {
      return createErrorResponse(400, 'Invalid input', validation.error.errors);
    }

    // Check user limits
    const userListingCount = await listingRepository.countByUser(userId);
    const userPlan = await userRepository.getUserPlan(userId);
    
    if (userListingCount >= userPlan.maxListings) {
      return createErrorResponse(403, 'Listing limit exceeded for your plan');
    }

    // Create listing
    const listing = await listingRepository.create({
      ...validation.data,
      userId,
    });

    // Send for moderation
    await moderationService.submitForReview(listing.id);
    
    // Notify user
    await notificationService.send({
      userId,
      type: 'listing_created',
      data: { listingId: listing.id, title: listing.title },
    });

    return createSuccessResponse(listing, 201);

  } catch (error) {
    console.error('Create listing error:', error);
    return createErrorResponse(500, 'Failed to create listing');
  }
};
```

### **Search Service Integration**

```typescript
// OpenSearch Service
export class SearchService {
  private client: Client;

  constructor() {
    this.client = new Client({
      node: process.env.OPENSEARCH_ENDPOINT,
      auth: {
        username: process.env.OPENSEARCH_USERNAME!,
        password: process.env.OPENSEARCH_PASSWORD!,
      },
    });
  }

  async search(filters: SearchFilters): Promise<SearchResponse> {
    const query = this.buildSearchQuery(filters);
    
    try {
      const response = await this.client.search({
        index: 'listings',
        body: {
          query,
          sort: this.buildSortOptions(filters.sortBy, filters.sortOrder),
          from: (filters.page - 1) * filters.limit,
          size: filters.limit,
          highlight: {
            fields: {
              title: {},
              description: {},
            },
          },
          aggs: {
            priceRanges: {
              range: {
                field: 'price',
                ranges: [
                  { to: 25000 },
                  { from: 25000, to: 50000 },
                  { from: 50000, to: 100000 },
                  { from: 100000, to: 250000 },
                  { from: 250000 },
                ],
              },
            },
            boatTypes: {
              terms: { field: 'boatType' },
            },
            locations: {
              terms: { field: 'location.state' },
            },
          },
        },
      });

      return {
        listings: response.body.hits.hits.map(this.mapSearchHit),
        total: response.body.hits.total.value,
        aggregations: this.mapAggregations(response.body.aggregations),
        page: filters.page,
        limit: filters.limit,
      };

    } catch (error) {
      console.error('Search error:', error);
      throw new SearchError('Search request failed');
    }
  }

  private buildSearchQuery(filters: SearchFilters): object {
    const must: any[] = [];
    const filter: any[] = [];

    // Text search
    if (filters.query) {
      must.push({
        multi_match: {
          query: filters.query,
          fields: [
            'title^3',
            'description^2',
            'manufacturer',
            'model',
            'tags',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    // Status filter (only active listings for public search)
    filter.push({
      term: { status: ListingStatus.ACTIVE },
    });

    // Price range
    if (filters.minPrice || filters.maxPrice) {
      const priceRange: any = {};
      if (filters.minPrice) priceRange.gte = filters.minPrice;
      if (filters.maxPrice) priceRange.lte = filters.maxPrice;
      
      filter.push({
        range: { price: priceRange },
      });
    }

    // Boat type
    if (filters.boatType) {
      filter.push({
        term: { boatType: filters.boatType },
      });
    }

    // Location
    if (filters.location) {
      must.push({
        multi_match: {
          query: filters.location,
          fields: [
            'location.city',
            'location.state',
            'location.country',
          ],
        },
      });
    }

    // Geographic bounds
    if (filters.bounds) {
      filter.push({
        geo_bounding_box: {
          'location.coordinates': {
            top_left: {
              lat: filters.bounds.north,
              lon: filters.bounds.west,
            },
            bottom_right: {
              lat: filters.bounds.south,
              lon: filters.bounds.east,
            },
          },
        },
      });
    }

    // Year range
    if (filters.minYear || filters.maxYear) {
      const yearRange: any = {};
      if (filters.minYear) yearRange.gte = filters.minYear;
      if (filters.maxYear) yearRange.lte = filters.maxYear;
      
      filter.push({
        range: { year: yearRange },
      });
    }

    // Length range
    if (filters.minLength || filters.maxLength) {
      const lengthRange: any = {};
      if (filters.minLength) lengthRange.gte = filters.minLength;
      if (filters.maxLength) lengthRange.lte = filters.maxLength;
      
      filter.push({
        range: { length: lengthRange },
      });
    }

    return {
      bool: {
        must: must.length > 0 ? must : [{ match_all: {} }],
        filter,
      },
    };
  }

  async indexListing(listing: Listing): Promise<void> {
    try {
      await this.client.index({
        index: 'listings',
        id: listing.id,
        body: {
          ...listing,
          searchKeywords: this.generateSearchKeywords(listing),
          indexedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Indexing error:', error);
      // Don't throw - indexing failures shouldn't block listing creation
    }
  }

  async deleteDocument(listingId: string): Promise<void> {
    try {
      await this.client.delete({
        index: 'listings',
        id: listingId,
      });
    } catch (error) {
      console.error('Delete from index error:', error);
      // Don't throw - this is cleanup
    }
  }

  private generateSearchKeywords(listing: Listing): string[] {
    const keywords: string[] = [];
    
    // Add title and description words
    keywords.push(...this.extractWords(listing.title));
    keywords.push(...this.extractWords(listing.description));
    
    // Add boat details
    if (listing.manufacturer) keywords.push(listing.manufacturer.toLowerCase());
    if (listing.model) keywords.push(listing.model.toLowerCase());
    if (listing.year) keywords.push(listing.year.toString());
    keywords.push(listing.boatType.toLowerCase());
    
    // Add location keywords
    keywords.push(listing.location.city.toLowerCase());
    keywords.push(listing.location.state.toLowerCase());
    
    // Add tags
    keywords.push(...listing.tags.map(tag => tag.toLowerCase()));
    
    return [...new Set(keywords)]; // Remove duplicates
  }

  private extractWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }
}
```

---

## 👥 **Admin Service**

### **Platform Analytics**

```typescript
// Analytics Service
export class AnalyticsService {
  constructor(
    private dynamoDb: DynamoDBClient,
    private cloudWatch: CloudWatchClient
  ) {}

  async getPlatformStats(timeRange: TimeRange): Promise<PlatformStats> {
    const [
      userStats,
      listingStats,
      revenueStats,
      activityStats,
    ] = await Promise.all([
      this.getUserStats(timeRange),
      this.getListingStats(timeRange),
      this.getRevenueStats(timeRange),
      this.getActivityStats(timeRange),
    ]);

    return {
      users: userStats,
      listings: listingStats,
      revenue: revenueStats,
      activity: activityStats,
      lastUpdated: new Date().toISOString(),
    };
  }

  private async getUserStats(timeRange: TimeRange): Promise<UserStats> {
    // Query user metrics from DynamoDB
    const params = this.buildTimeRangeQuery('USER', timeRange);
    
    const result = await this.dynamoDb.send(new QueryCommand({
      TableName: process.env.DYNAMODB_TABLE,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK BETWEEN :start AND :end',
      ExpressionAttributeValues: marshall({
        ':pk': 'METRICS#USER',
        ':start': params.startKey,
        ':end': params.endKey,
      }),
    }));

    const metrics = result.Items?.map(item => unmarshall(item)) || [];
    
    return {
      total: this.sumMetric(metrics, 'totalUsers'),
      active: this.sumMetric(metrics, 'activeUsers'),
      new: this.sumMetric(metrics, 'newUsers'),
      growth: this.calculateGrowthRate(metrics, 'totalUsers'),
      byPlan: this.aggregateByPlan(metrics),
      retention: await this.calculateRetentionRate(timeRange),
    };
  }

  private async getListingStats(timeRange: TimeRange): Promise<ListingStats> {
    const params = this.buildTimeRangeQuery('LISTING', timeRange);
    
    const result = await this.dynamoDb.send(new QueryCommand({
      TableName: process.env.DYNAMODB_TABLE,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK BETWEEN :start AND :end',
      ExpressionAttributeValues: marshall({
        ':pk': 'METRICS#LISTING',
        ':start': params.startKey,
        ':end': params.endKey,
      }),
    }));

    const metrics = result.Items?.map(item => unmarshall(item)) || [];
    
    return {
      total: this.sumMetric(metrics, 'totalListings'),
      active: this.sumMetric(metrics, 'activeListings'),
      new: this.sumMetric(metrics, 'newListings'),
      growth: this.calculateGrowthRate(metrics, 'totalListings'),
      byStatus: this.aggregateByStatus(metrics),
      avgPrice: this.calculateAverage(metrics, 'totalValue', 'totalListings'),
      topCategories: this.getTopCategories(metrics),
    };
  }

  async generateReport(
    type: ReportType,
    timeRange: TimeRange,
    filters?: ReportFilters
  ): Promise<Report> {
    switch (type) {
      case 'user-activity':
        return this.generateUserActivityReport(timeRange, filters);
      case 'listing-performance':
        return this.generateListingPerformanceReport(timeRange, filters);
      case 'revenue-analysis':
        return this.generateRevenueAnalysisReport(timeRange, filters);
      case 'moderation-summary':
        return this.generateModerationSummaryReport(timeRange, filters);
      default:
        throw new BadRequestError('Unknown report type');
    }
  }

  private async generateUserActivityReport(
    timeRange: TimeRange,
    filters?: ReportFilters
  ): Promise<Report> {
    // Aggregate user activity data
    const activityData = await this.queryActivityMetrics(timeRange, filters);
    
    const report: Report = {
      id: generateUUID(),
      type: 'user-activity',
      title: 'User Activity Report',
      timeRange,
      generatedAt: new Date().toISOString(),
      data: {
        summary: {
          totalUsers: activityData.totalUsers,
          activeUsers: activityData.activeUsers,
          newUsers: activityData.newUsers,
          retentionRate: activityData.retentionRate,
        },
        charts: [
          {
            type: 'line',
            title: 'Daily Active Users',
            data: activityData.dailyActiveUsers,
          },
          {
            type: 'bar',
            title: 'New User Registrations',
            data: activityData.newUserRegistrations,
          },
          {
            type: 'pie',
            title: 'User Distribution by Plan',
            data: activityData.usersByPlan,
          },
        ],
        tables: [
          {
            title: 'Top User Activities',
            headers: ['Activity', 'Count', 'Percentage'],
            rows: activityData.topActivities,
          },
        ],
      },
    };

    return report;
  }
}

// Content Moderation Service
export class ModerationService {
  constructor(
    private dynamoDb: DynamoDBClient,
    private notificationService: NotificationService
  ) {}

  async submitForReview(listingId: string): Promise<void> {
    const now = new Date().toISOString();
    
    await this.dynamoDb.send(new PutItemCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Item: marshall({
        PK: `MODERATION#${listingId}`,
        SK: 'QUEUE',
        GSI1PK: 'MODERATION_QUEUE',
        GSI1SK: `PRIORITY#1#${now}`, // Default priority
        Type: 'ModerationItem',
        listingId,
        status: ModerationStatus.PENDING,
        priority: 1,
        submittedAt: now,
      }),
    }));

    // Run automatic content checks
    await this.runAutomaticModeration(listingId);
  }

  async getModerationQueue(
    status: ModerationStatus = ModerationStatus.PENDING,
    limit = 50
  ): Promise<ModerationItem[]> {
    const result = await this.dynamoDb.send(new QueryCommand({
      TableName: process.env.DYNAMODB_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: marshall({
        ':pk': 'MODERATION_QUEUE',
        ':status': status,
      }),
      Limit: limit,
      ScanIndexForward: true, // Oldest first
    }));

    return result.Items?.map(item => unmarshall(item) as ModerationItem) || [];
  }

  async moderateListing(
    listingId: string,
    moderatorId: string,
    decision: ModerationDecision,
    notes?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    
    // Update listing moderation status
    await this.dynamoDb.send(new UpdateItemCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Key: marshall({
        PK: `LISTING#${listingId}`,
        SK: 'METADATA',
      }),
      UpdateExpression: 'SET moderationStatus = :status, moderatedBy = :moderator, moderatedAt = :time, moderationNotes = :notes',
      ExpressionAttributeValues: marshall({
        ':status': decision.status,
        ':moderator': moderatorId,
        ':time': now,
        ':notes': notes || '',
      }),
    }));

    // Update moderation queue item
    await this.dynamoDb.send(new UpdateItemCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Key: marshall({
        PK: `MODERATION#${listingId}`,
        SK: 'QUEUE',
      }),
      UpdateExpression: 'SET #status = :status, moderatedBy = :moderator, moderatedAt = :time',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: marshall({
        ':status': decision.status,
        ':moderator': moderatorId,
        ':time': now,
      }),
    }));

    // Handle decision actions
    switch (decision.status) {
      case ModerationStatus.APPROVED:
        await this.approveListing(listingId);
        break;
      case ModerationStatus.REJECTED:
        await this.rejectListing(listingId, decision.reason, notes);
        break;
      case ModerationStatus.REQUIRES_CHANGES:
        await this.requestChanges(listingId, decision.requiredChanges, notes);
        break;
    }

    // Log moderation action
    await auditLogger.log({
      userId: moderatorId,
      action: 'listing_moderated',
      resource: `listing:${listingId}`,
      metadata: {
        decision: decision.status,
        reason: decision.reason,
        notes,
      },
    });
  }

  private async runAutomaticModeration(listingId: string): Promise<void> {
    const listing = await listingRepository.findById(listingId);
    if (!listing) return;

    const issues: string[] = [];

    // Content checks
    if (this.containsProhibitedContent(listing.title + ' ' + listing.description)) {
      issues.push('Prohibited content detected');
    }

    // Price validation
    if (listing.price < 100 || listing.price > 10000000) {
      issues.push('Price outside acceptable range');
    }

    // Image validation
    if (listing.images.length === 0) {
      issues.push('No images provided');
    }

    // Required fields
    if (!listing.boatType || !listing.location.city || !listing.location.state) {
      issues.push('Missing required information');
    }

    // Auto-approve if no issues
    if (issues.length === 0) {
      await this.approveListing(listingId);
    } else {
      // Flag for manual review
      await this.flagForManualReview(listingId, issues);
    }
  }

  private containsProhibitedContent(text: string): boolean {
    const prohibitedWords = [
      // Add prohibited words/phrases
      'scam', 'fraud', 'stolen', 'illegal'
    ];

    const lowerText = text.toLowerCase();
    return prohibitedWords.some(word => lowerText.includes(word));
  }
}
```

---

## 📧 **Email Service**

### **Notification System**

```typescript
// Email Service with SES
export class EmailService {
  private sesClient: SESv2Client;
  private templateCache: Map<string, EmailTemplate> = new Map();

  constructor() {
    this.sesClient = new SESv2Client({
      region: process.env.AWS_REGION,
    });
  }

  async sendEmail(request: EmailRequest): Promise<void> {
    try {
      const template = await this.getTemplate(request.template);
      const renderedContent = this.renderTemplate(template, request.data);

      const command = new SendEmailCommand({
        FromEmailAddress: process.env.FROM_EMAIL,
        Destination: {
          ToAddresses: [request.to],
        },
        Content: {
          Simple: {
            Subject: {
              Data: renderedContent.subject,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: renderedContent.html,
                Charset: 'UTF-8',
              },
              Text: {
                Data: renderedContent.text,
                Charset: 'UTF-8',
              },
            },
          },
        },
        Tags: [
          { Name: 'Template', Value: request.template },
          { Name: 'Environment', Value: process.env.ENVIRONMENT || 'development' },
        ],
      });

      const result = await this.sesClient.send(command);
      
      await this.logEmailSent({
        messageId: result.MessageId!,
        to: request.to,
        template: request.template,
        status: 'sent',
      });

    } catch (error) {
      console.error('Email send error:', error);
      
      await this.logEmailSent({
        to: request.to,
        template: request.template,
        status: 'failed',
        error: error.message,
      });

      throw error;
    }
  }

  async sendWelcomeEmail(user: User): Promise<void> {
    await this.sendEmail({
      to: user.email,
      template: 'welcome',
      data: {
        firstName: user.firstName,
        verificationUrl: this.generateVerificationUrl(user.id),
      },
    });
  }

  async sendListingNotification(notification: ListingNotification): Promise<void> {
    const template = this.getListingTemplate(notification.type);
    
    await this.sendEmail({
      to: notification.userEmail,
      template,
      data: {
        firstName: notification.firstName,
        listingTitle: notification.listingTitle,
        listingUrl: this.generateListingUrl(notification.listingId),
        ...notification.additionalData,
      },
    });
  }

  async sendBulkEmail(requests: BulkEmailRequest[]): Promise<BulkEmailResult> {
    const results: EmailResult[] = [];
    
    // Process in batches to respect SES rate limits
    const batchSize = 14; // SES allows 14 emails per second
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (request) => {
        try {
          await this.sendEmail(request);
          return { email: request.to, status: 'sent' };
        } catch (error) {
          return { 
            email: request.to, 
            status: 'failed', 
            error: error.message 
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Rate limiting delay
      if (i + batchSize < requests.length) {
        await this.sleep(1000); // Wait 1 second between batches
      }
    }

    return {
      total: requests.length,
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    };
  }

  private async getTemplate(templateName: string): Promise<EmailTemplate> {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    // Load template from S3 or database
    const template = await this.loadTemplateFromStorage(templateName);
    this.templateCache.set(templateName, template);
    
    return template;
  }

  private renderTemplate(template: EmailTemplate, data: Record<string, any>): RenderedTemplate {
    // Use a templating engine like Handlebars
    const handlebars = require('handlebars');
    
    const subjectTemplate = handlebars.compile(template.subject);
    const htmlTemplate = handlebars.compile(template.html);
    const textTemplate = handlebars.compile(template.text);

    return {
      subject: subjectTemplate(data),
      html: htmlTemplate(data),
      text: textTemplate(data),
    };
  }
}

// Notification Service
export class NotificationService {
  constructor(
    private emailService: EmailService,
    private dynamoDb: DynamoDBClient
  ) {}

  async send(notification: Notification): Promise<void> {
    // Store notification record
    await this.storeNotification(notification);

    // Get user preferences
    const preferences = await this.getUserPreferences(notification.userId);
    
    if (!this.shouldSendNotification(notification.type, preferences)) {
      return;
    }

    // Send based on preferred channel
    switch (preferences.channel) {
      case 'email':
        await this.sendEmailNotification(notification);
        break;
      case 'sms':
        await this.sendSMSNotification(notification);
        break;
      case 'push':
        await this.sendPushNotification(notification);
        break;
    }
  }

  private async sendEmailNotification(notification: Notification): Promise<void> {
    const user = await userRepository.findById(notification.userId);
    if (!user) return;

    switch (notification.type) {
      case 'listing_created':
        await this.emailService.sendListingNotification({
          type: 'listing_created',
          userEmail: user.email,
          firstName: user.firstName,
          listingTitle: notification.data.title,
          listingId: notification.data.listingId,
        });
        break;

      case 'listing_approved':
        await this.emailService.sendListingNotification({
          type: 'listing_approved',
          userEmail: user.email,
          firstName: user.firstName,
          listingTitle: notification.data.title,
          listingId: notification.data.listingId,
        });
        break;

      case 'inquiry_received':
        await this.emailService.sendEmail({
          to: user.email,
          template: 'inquiry-received',
          data: {
            firstName: user.firstName,
            inquiryMessage: notification.data.message,
            inquirerName: notification.data.inquirerName,
            listingTitle: notification.data.listingTitle,
            replyUrl: this.generateReplyUrl(notification.data.inquiryId),
          },
        });
        break;
    }
  }

  async sendScheduledNotifications(): Promise<void> {
    // Get pending scheduled notifications
    const notifications = await this.getPendingScheduledNotifications();
    
    for (const notification of notifications) {
      try {
        await this.send(notification);
        await this.markNotificationSent(notification.id);
      } catch (error) {
        console.error('Scheduled notification failed:', error);
        await this.markNotificationFailed(notification.id, error.message);
      }
    }
  }
}
```

---

## 📊 **Monitoring & Observability**

### **CloudWatch Integration**

```typescript
// Metrics Service
export class MetricsService {
  private cloudWatch: CloudWatchClient;

  constructor() {
    this.cloudWatch = new CloudWatchClient({
      region: process.env.AWS_REGION,
    });
  }

  async recordCustomMetric(
    metricName: string,
    value: number,
    unit: StandardUnit = StandardUnit.Count,
    dimensions?: Dimension[]
  ): Promise<void> {
    try {
      await this.cloudWatch.send(new PutMetricDataCommand({
        Namespace: 'HarborList/Application',
        MetricData: [
          {
            MetricName: metricName,
            Value: value,
            Unit: unit,
            Dimensions: dimensions,
            Timestamp: new Date(),
          },
        ],
      }));
    } catch (error) {
      console.error('Failed to record metric:', error);
    }
  }

  async recordBusinessMetrics(event: BusinessEvent): Promise<void> {
    const dimensions = [
      { Name: 'Environment', Value: process.env.ENVIRONMENT || 'development' },
    ];

    switch (event.type) {
      case 'listing_created':
        await this.recordCustomMetric('ListingCreated', 1, StandardUnit.Count, dimensions);
        await this.recordCustomMetric('ListingPrice', event.data.price, StandardUnit.None, dimensions);
        break;

      case 'user_registered':
        await this.recordCustomMetric('UserRegistered', 1, StandardUnit.Count, dimensions);
        break;

      case 'search_performed':
        await this.recordCustomMetric('SearchPerformed', 1, StandardUnit.Count, dimensions);
        await this.recordCustomMetric('SearchResultCount', event.data.resultCount, StandardUnit.Count, dimensions);
        break;

      case 'api_latency':
        await this.recordCustomMetric(
          'APILatency',
          event.data.duration,
          StandardUnit.Milliseconds,
          [
            ...dimensions,
            { Name: 'Endpoint', Value: event.data.endpoint },
            { Name: 'Method', Value: event.data.method },
          ]
        );
        break;
    }
  }
}

// Structured Logging
export class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log('INFO', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log('WARN', message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const errorMetadata = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    } : {};

    this.log('ERROR', message, { ...errorMetadata, ...metadata });
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.context.service || 'harborlist-backend',
      requestId: this.context.requestId,
      userId: this.context.userId,
      metadata,
    };

    console.log(JSON.stringify(logEntry));
  }

  withContext(context: Partial<LogContext>): Logger {
    return new Logger({ ...this.context, ...context });
  }
}

// Request Tracing Middleware
export const tracingMiddleware = () => {
  return async (event: APIGatewayProxyEvent, context: Context, next: Function) => {
    const startTime = Date.now();
    const requestId = context.awsRequestId;
    const traceId = generateTraceId();

    // Add tracing context to event
    event.requestContext = {
      ...event.requestContext,
      requestId,
      traceId,
    };

    const logger = new Logger({
      requestId,
      traceId,
      service: 'harborlist-api',
    });

    try {
      logger.info('Request started', {
        method: event.httpMethod,
        path: event.path,
        userAgent: event.headers['User-Agent'],
        sourceIp: event.requestContext.identity.sourceIp,
      });

      const result = await next();

      const duration = Date.now() - startTime;
      
      logger.info('Request completed', {
        statusCode: result.statusCode,
        duration,
      });

      // Record metrics
      const metricsService = new MetricsService();
      await metricsService.recordBusinessMetrics({
        type: 'api_latency',
        data: {
          endpoint: event.path,
          method: event.httpMethod,
          duration,
          statusCode: result.statusCode,
        },
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Request failed', error, {
        duration,
        statusCode: 500,
      });

      throw error;
    }
  };
};
```

---

## 🔗 **Related Documentation**

- **🏗️ [System Architecture](../architecture/README.md)**: Overall system design and integration
- **⚛️ [Frontend Application](../frontend/README.md)**: React application and UI components
- **🔧 [Operations Guide](../operations/README.md)**: Deployment and maintenance procedures
- **🧪 [Testing Documentation](../testing/README.md)**: Backend testing strategies
- **🎯 [API Documentation](../api/README.md)**: Complete API reference

---

**📅 Last Updated**: October 2025  
**📝 Document Version**: 1.0.0  
**👥 Backend Team**: HarborList API Team  
**🔄 Next Review**: January 2026