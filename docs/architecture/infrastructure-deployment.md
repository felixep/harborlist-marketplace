# 🚀 Infrastructure & Deployment Architecture

## ☁️ **AWS Infrastructure Architecture**

### **Complete AWS Infrastructure Stack**

```mermaid
graph TB
    subgraph "AWS Account - HarborList Production"
        subgraph "Compute Services"
            Lambda[AWS Lambda Functions<br/>- Node.js 18 Runtime<br/>- 7 Microservices<br/>- Provisioned Concurrency]
            
            subgraph "Lambda Functions Detail"
                AuthLambda[Auth Service<br/>- JWT Management<br/>- MFA Support<br/>- Session Tracking]
                ListingLambda[Listing Service<br/>- CRUD Operations<br/>- Validation Logic<br/>- Business Rules]
                AdminLambda[Admin Service<br/>- User Management<br/>- Analytics<br/>- Audit Logging]
                SearchLambda[Search Service<br/>- Advanced Filtering<br/>- Geospatial Queries<br/>- Performance Optimization]
                MediaLambda[Media Service<br/>- Image Processing<br/>- S3 Integration<br/>- CDN Management]
                EmailLambda[Email Service<br/>- SES Integration<br/>- Template Management<br/>- Delivery Tracking]
                StatsLambda[Stats Service<br/>- Real-time Analytics<br/>- Business Intelligence<br/>- Reporting]
            end
        end
        
        subgraph "API & Networking"
            APIGateway[API Gateway REST API<br/>- Custom Domain<br/>- CORS Configuration<br/>- Usage Plans & Keys]
            
            CloudFront[CloudFront CDN<br/>- Global Distribution<br/>- SSL Certificates<br/>- Custom Headers]
        end
        
        subgraph "Storage Services"
            DynamoDB[DynamoDB Tables<br/>- Users Table<br/>- Listings Table<br/>- Audit Logs<br/>- Admin Sessions<br/>- Login Attempts]
            
            S3[S3 Buckets<br/>- Media Storage<br/>- Static Website Hosting<br/>- Lifecycle Policies<br/>- Versioning]
        end
        
        subgraph "Security Services"
            SecretsManager[AWS Secrets Manager<br/>- JWT Secrets<br/>- API Keys<br/>- Database Credentials<br/>- Rotation Policies]
            
            IAM[IAM Roles & Policies<br/>- Least Privilege Access<br/>- Service-to-Service Auth<br/>- Cross-Account Access]
            
            VPC[VPC - Optional<br/>- Private Subnets<br/>- Security Groups<br/>- NACLs]
        end
        
        subgraph "Monitoring & Logging"
            CloudWatch[CloudWatch<br/>- Custom Dashboards<br/>- Metrics & Alarms<br/>- Log Groups<br/>- Insights Queries]
            
            XRay[AWS X-Ray<br/>- Distributed Tracing<br/>- Performance Analysis<br/>- Service Maps<br/>- Error Analysis]
            
            SNS[SNS Topics<br/>- Alert Notifications<br/>- Email Subscriptions<br/>- Webhook Integration]
        end
        
        subgraph "Email Services"
            SES[Amazon SES<br/>- Email Sending<br/>- DKIM Authentication<br/>- Bounce Handling<br/>- Reputation Monitoring]
        end
    end
    
    subgraph "External Services"
        Cloudflare[Cloudflare<br/>- DNS Management<br/>- WAF Protection<br/>- DDoS Mitigation<br/>- Analytics]
        
        GitHub[GitHub<br/>- Code Repository<br/>- CI/CD Actions<br/>- Secrets Management<br/>- Issue Tracking]
    end
    
    APIGateway --> Lambda
    Lambda --> AuthLambda
    Lambda --> ListingLambda
    Lambda --> AdminLambda
    Lambda --> SearchLambda
    Lambda --> MediaLambda
    Lambda --> EmailLambda
    Lambda --> StatsLambda
    
    AuthLambda --> DynamoDB
    ListingLambda --> DynamoDB
    AdminLambda --> DynamoDB
    SearchLambda --> DynamoDB
    StatsLambda --> DynamoDB
    
    MediaLambda --> S3
    EmailLambda --> SES
    
    AuthLambda --> SecretsManager
    AdminLambda --> SecretsManager
    
    Lambda --> CloudWatch
    Lambda --> XRay
    CloudWatch --> SNS
    
    Cloudflare --> APIGateway
    GitHub --> Lambda
    
    style Lambda fill:#ff9800
    style DynamoDB fill:#4caf50
    style S3 fill:#2196f3
    style CloudWatch fill:#9c27b0
```

### **DynamoDB Table Design & GSI Architecture**

```mermaid
graph TB
    subgraph "DynamoDB Tables Architecture"
        subgraph "Users Table (boat-users)"
            UsersTable[Users Table<br/>PK: userId<br/>Attributes: email, name, role, status]
            UsersEmailIndex[GSI: email-index<br/>PK: email<br/>For login lookups]
            UsersRoleIndex[GSI: role-index<br/>PK: role, SK: createdAt<br/>For admin user filtering]
        end
        
        subgraph "Listings Table (boat-listings)"
            ListingsTable[Listings Table<br/>PK: listingId<br/>Attributes: ownerId, title, price, status]
            ListingsOwnerIndex[GSI: owner-index<br/>PK: ownerId, SK: createdAt<br/>User's listings]
            ListingsStatusIndex[GSI: status-index<br/>PK: status, SK: updatedAt<br/>Active listings filtering]
            ListingsLocationIndex[GSI: location-index<br/>PK: state, SK: city<br/>Geographic filtering]
            ListingsPriceIndex[GSI: price-index<br/>PK: priceRange, SK: price<br/>Price-based queries]
        end
        
        subgraph "Audit Logs Table (boat-audit-logs)"
            AuditTable[Audit Logs Table<br/>PK: logId<br/>Attributes: userId, action, timestamp]
            AuditUserIndex[GSI: user-index<br/>PK: userId, SK: timestamp<br/>User audit history]
            AuditActionIndex[GSI: action-index<br/>PK: action, SK: timestamp<br/>Action-based filtering]
            AuditResourceIndex[GSI: resource-index<br/>PK: resource, SK: timestamp<br/>Resource audit trail]
        end
        
        subgraph "Admin Sessions (boat-admin-sessions)"
            SessionsTable[Admin Sessions Table<br/>PK: sessionId<br/>TTL: expiresAt]
            SessionsUserIndex[GSI: user-index<br/>PK: userId, SK: lastActivity<br/>User session management]
        end
        
        subgraph "Login Attempts (boat-login-attempts)"
            LoginAttemptsTable[Login Attempts Table<br/>PK: id, SK: timestamp<br/>TTL: 24 hours]
            LoginEmailIndex[GSI: email-index<br/>PK: email, SK: timestamp<br/>Email-based rate limiting]
            LoginIPIndex[GSI: ip-index<br/>PK: ipAddress, SK: timestamp<br/>IP-based rate limiting]
        end
    end
    
    UsersTable --> UsersEmailIndex
    UsersTable --> UsersRoleIndex
    
    ListingsTable --> ListingsOwnerIndex
    ListingsTable --> ListingsStatusIndex
    ListingsTable --> ListingsLocationIndex
    ListingsTable --> ListingsPriceIndex
    
    AuditTable --> AuditUserIndex
    AuditTable --> AuditActionIndex
    AuditTable --> AuditResourceIndex
    
    SessionsTable --> SessionsUserIndex
    
    LoginAttemptsTable --> LoginEmailIndex
    LoginAttemptsTable --> LoginIPIndex
    
    style UsersTable fill:#e3f2fd
    style ListingsTable fill:#e8f5e8
    style AuditTable fill:#fff3e0
    style SessionsTable fill:#f3e5f5
```

### **S3 Bucket Architecture & CDN Integration**

```mermaid
graph TB
    subgraph "S3 Storage Architecture"
        subgraph "Media Bucket (boat-listing-media-[account])"
            MediaBucket[Media Bucket<br/>- Original Images<br/>- Processed Images<br/>- Video Files<br/>- Thumbnails]
            
            subgraph "Folder Structure"
                ListingFolder[/listing-{id}/<br/>- image1.jpg<br/>- image2.jpg<br/>- thumb1.jpg<br/>- video1.mp4]
                
                ProcessedFolder[/processed/<br/>- Optimized Images<br/>- Multiple Sizes<br/>- WebP Format<br/>- Compressed Videos]
                
                TempFolder[/temp/<br/>- Upload Processing<br/>- Temporary Storage<br/>- TTL: 24 hours]
            end
        end
        
        subgraph "Frontend Bucket (boat-listing-frontend-[account])"
            FrontendBucket[Frontend Bucket<br/>- React Build Output<br/>- Static Assets<br/>- Index.html<br/>- Manifest Files]
            
            subgraph "Static Assets Structure"
                AssetsFolder[/assets/<br/>- CSS Files<br/>- JS Bundles<br/>- Fonts<br/>- Icons]
                
                ImagesFolder[/images/<br/>- UI Images<br/>- Logos<br/>- Backgrounds<br/>- Placeholders]
            end
        end
    end
    
    subgraph "CDN & Distribution"
        CloudFrontDist[CloudFront Distribution<br/>- Global Edge Locations<br/>- Custom Cache Behaviors<br/>- SSL Certificate<br/>- Origin Request Policies]
        
        CloudflareCDN[Cloudflare CDN<br/>- DNS Management<br/>- Additional Caching<br/>- Security Rules<br/>- Performance Optimization]
    end
    
    subgraph "Image Processing Pipeline"
        UploadTrigger[S3 Upload Event<br/>- Object Created<br/>- Lambda Trigger<br/>- Metadata Extraction]
        
        ProcessingLambda[Image Processing Lambda<br/>- Sharp Library<br/>- Multiple Formats<br/>- Size Optimization<br/>- Thumbnail Generation]
        
        QualityCheck[Quality Validation<br/>- Format Verification<br/>- Content Scanning<br/>- Virus Checking<br/>- Metadata Sanitization]
    end
    
    MediaBucket --> ListingFolder
    MediaBucket --> ProcessedFolder
    MediaBucket --> TempFolder
    
    FrontendBucket --> AssetsFolder
    FrontendBucket --> ImagesFolder
    
    MediaBucket --> CloudFrontDist
    FrontendBucket --> CloudFrontDist
    CloudFrontDist --> CloudflareCDN
    
    MediaBucket --> UploadTrigger
    UploadTrigger --> ProcessingLambda
    ProcessingLambda --> QualityCheck
    QualityCheck --> ProcessedFolder
    
    style MediaBucket fill:#2196f3
    style FrontendBucket fill:#4caf50
    style CloudFrontDist fill:#ff9800
    style ProcessingLambda fill:#9c27b0
```

---

## 🔄 **CI/CD Pipeline Architecture**

### **GitHub Actions Deployment Pipeline**

```mermaid
graph TD
    subgraph "Source Code Management"
        Developer[Developer<br/>Local Development]
        FeatureBranch[Feature Branch<br/>git checkout -b feature/new-listing]
        MainBranch[Main Branch<br/>Production Ready Code]
        PullRequest[Pull Request<br/>Code Review Process]
    end
    
    subgraph "CI/CD Pipeline (GitHub Actions)"
        subgraph "Code Quality Gates"
            LintCheck[ESLint & Prettier<br/>Code Style Validation]
            TypeCheck[TypeScript Compilation<br/>Type Safety Verification]
            UnitTests[Unit Tests<br/>Jest Test Suite]
            SecurityScan[Security Scanning<br/>npm audit & Snyk]
        end
        
        subgraph "Build Process"
            FrontendBuild[Frontend Build<br/>Vite Production Build]
            BackendBuild[Backend Build<br/>TypeScript Compilation]
            PackageLambdas[Package Lambda Functions<br/>ZIP Creation & Optimization]
        end
        
        subgraph "Infrastructure Deployment"
            CDKSynth[CDK Synth<br/>CloudFormation Template Generation]
            CDKDeploy[CDK Deploy<br/>Infrastructure Update]
            LambdaDeploy[Lambda Deployment<br/>Function Code Update]
        end
        
        subgraph "Post-Deployment"
            SmokeTests[Smoke Tests<br/>API Health Checks]
            IntegrationTests[Integration Tests<br/>End-to-End Validation]
            PerformanceTests[Performance Tests<br/>Load & Response Time]
        end
    end
    
    subgraph "Environment Stages"
        DevEnvironment[Development Environment<br/>- Feature Testing<br/>- Integration Testing<br/>- Developer Validation]
        
        StagingEnvironment[Staging Environment<br/>- Production-like Testing<br/>- User Acceptance Testing<br/>- Performance Validation]
        
        ProductionEnvironment[Production Environment<br/>- Blue/Green Deployment<br/>- Gradual Rollout<br/>- Monitoring & Alerting]
    end
    
    subgraph "Monitoring & Rollback"
        HealthMonitoring[Health Monitoring<br/>- API Response Times<br/>- Error Rates<br/>- User Experience Metrics]
        
        AlertSystem[Alert System<br/>- CloudWatch Alarms<br/>- SNS Notifications<br/>- PagerDuty Integration]
        
        RollbackMechanism[Automatic Rollback<br/>- Health Check Failures<br/>- Error Rate Thresholds<br/>- Manual Rollback Triggers]
    end
    
    Developer --> FeatureBranch
    FeatureBranch --> PullRequest
    PullRequest --> LintCheck
    
    LintCheck --> TypeCheck
    TypeCheck --> UnitTests
    UnitTests --> SecurityScan
    
    SecurityScan --> FrontendBuild
    FrontendBuild --> BackendBuild
    BackendBuild --> PackageLambdas
    
    PackageLambdas --> CDKSynth
    CDKSynth --> CDKDeploy
    CDKDeploy --> LambdaDeploy
    
    LambdaDeploy --> SmokeTests
    SmokeTests --> IntegrationTests
    IntegrationTests --> PerformanceTests
    
    PerformanceTests --> DevEnvironment
    DevEnvironment --> StagingEnvironment
    StagingEnvironment --> ProductionEnvironment
    
    ProductionEnvironment --> HealthMonitoring
    HealthMonitoring --> AlertSystem
    AlertSystem --> RollbackMechanism
    
    RollbackMechanism -.->|Rollback| StagingEnvironment
    
    PullRequest --> MainBranch
    
    style LintCheck fill:#e3f2fd
    style ProductionEnvironment fill:#4caf50
    style HealthMonitoring fill:#ff9800
    style RollbackMechanism fill:#f44336
```

### **Blue/Green Deployment Strategy**

```mermaid
stateDiagram-v2
    [*] --> BlueActive: Initial Deployment
    
    state "Blue Environment (Active)" as BlueActive {
        [*] --> ServingTraffic
        ServingTraffic --> HealthyState
        HealthyState --> ServingTraffic
    }
    
    state "Green Environment (Staging)" as GreenStaging {
        [*] --> Deploying
        Deploying --> Testing
        Testing --> ReadyForSwitch
        ReadyForSwitch --> [*]
    }
    
    BlueActive --> DeploymentInitiated: New Release
    DeploymentInitiated --> GreenStaging: Deploy to Green
    
    GreenStaging --> TrafficSwitching: Tests Pass
    TrafficSwitching --> GreenActive: Switch DNS/Load Balancer
    
    state "Green Environment (Active)" as GreenActive {
        [*] --> ServingTraffic
        ServingTraffic --> MonitoringHealth
        MonitoringHealth --> ServingTraffic
        MonitoringHealth --> RollbackInitiated: Health Check Fails
    }
    
    state "Blue Environment (Standby)" as BlueStandby {
        [*] --> StandbyMode
        StandbyMode --> ReadyForRollback
        ReadyForRollback --> [*]
    }
    
    TrafficSwitching --> BlueStandby: Blue becomes Standby
    
    GreenActive --> RollbackInitiated: Issues Detected
    RollbackInitiated --> BlueActive: Quick Rollback
    
    GreenActive --> BlueStaging: Next Deployment Cycle
    
    note right of TrafficSwitching
        - DNS Update (Cloudflare)
        - API Gateway Stage Switch
        - CloudFront Origin Update
        - Health Check Validation
    end note
    
    note right of RollbackInitiated
        - Automatic on Health Failures
        - Manual Admin Trigger
        - < 30 seconds rollback time
        - Zero downtime process
    end note
```

### **Environment Management Architecture**

```mermaid
graph TB
    subgraph "Environment Configuration Management"
        subgraph "Development Environment"
            DevConfig[Development Configuration<br/>- Local DynamoDB<br/>- Mock Services<br/>- Debug Logging<br/>- Relaxed Security]
            
            DevSecrets[Development Secrets<br/>- Test JWT Secrets<br/>- Mock API Keys<br/>- Local Database URLs<br/>- Debug Tokens]
        end
        
        subgraph "Staging Environment"
            StagingConfig[Staging Configuration<br/>- Staging DynamoDB<br/>- Production-like Setup<br/>- Staging Domains<br/>- Performance Monitoring]
            
            StagingSecrets[Staging Secrets<br/>- Staging JWT Secrets<br/>- Test API Keys<br/>- Staging Database Access<br/>- External Service Tokens]
        end
        
        subgraph "Production Environment"
            ProdConfig[Production Configuration<br/>- Production DynamoDB<br/>- High Availability<br/>- Custom Domains<br/>- Full Monitoring]
            
            ProdSecrets[Production Secrets<br/>- Production JWT Secrets<br/>- Live API Keys<br/>- Production Database Access<br/>- Payment Service Keys]
        end
    end
    
    subgraph "Configuration Management Tools"
        AWSSecretsManager[AWS Secrets Manager<br/>- Automatic Rotation<br/>- Cross-Service Access<br/>- Encryption at Rest<br/>- Audit Logging]
        
        CDKContext[CDK Context Files<br/>- Environment Variables<br/>- Resource Naming<br/>- Stack Configuration<br/>- Feature Flags]
        
        GitHubSecrets[GitHub Secrets<br/>- Deployment Keys<br/>- AWS Credentials<br/>- External API Keys<br/>- CI/CD Configuration]
    end
    
    subgraph "Deployment Isolation"
        DevAWS[Development AWS Account<br/>- Isolated Resources<br/>- Lower Costs<br/>- Experimental Features<br/>- Developer Access]
        
        StagingAWS[Staging AWS Account<br/>- Production Mirror<br/>- Performance Testing<br/>- Integration Validation<br/>- QA Team Access]
        
        ProdAWS[Production AWS Account<br/>- Live Customer Data<br/>- High Availability<br/>- Strict Security<br/>- Limited Access]
    end
    
    DevConfig --> DevSecrets
    DevSecrets --> AWSSecretsManager
    DevConfig --> CDKContext
    DevConfig --> DevAWS
    
    StagingConfig --> StagingSecrets
    StagingSecrets --> AWSSecretsManager
    StagingConfig --> CDKContext
    StagingConfig --> StagingAWS
    
    ProdConfig --> ProdSecrets
    ProdSecrets --> AWSSecretsManager
    ProdConfig --> CDKContext
    ProdConfig --> ProdAWS
    
    CDKContext --> GitHubSecrets
    AWSSecretsManager --> GitHubSecrets
    
    style DevAWS fill:#e3f2fd
    style StagingAWS fill:#fff3e0
    style ProdAWS fill:#e8f5e8
    style AWSSecretsManager fill:#f3e5f5
```