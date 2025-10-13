# Current Infrastructure and Environment Analysis

## Overview

This document analyzes the existing infrastructure and environment setup for the HarborList boat marketplace to inform the AWS Cognito dual-pool integration strategy.

## Current CDK Infrastructure

### Stack Architecture (`infrastructure/lib/boat-listing-stack.ts`)

The current infrastructure is defined as a single CDK stack with the following components:

#### DynamoDB Tables
- **Users Table** (`harborlist-users`)
  - Partition Key: `id` (string)
  - GSI: `email-index` for email-based lookups
  - Stores user authentication and profile data
  
- **Listings Table** (`harborlist-listings`)
  - Partition Key: `id` (string)
  - GSI: `location-index` for location-based searches
  - Stores boat listing data
  
- **Audit Logs Table** (`harborlist-audit-logs`)
  - Partition Key: `id` (string)
  - Sort Key: `timestamp` (string)
  - GSI: `user-index`, `action-index`, `resource-index`
  - TTL enabled for automatic cleanup
  
- **Admin Sessions Table** (`harborlist-admin-sessions`)
  - Partition Key: `sessionId` (string)
  - GSI: `user-index` for user-based session queries
  - TTL enabled with `expiresAt` attribute
  
- **Login Attempts Table** (`harborlist-login-attempts`)
  - Partition Key: `id` (string)
  - Sort Key: `timestamp` (string)
  - GSI: `email-index`, `ip-index` for security monitoring
  - TTL enabled for automatic cleanup

#### S3 Buckets
- **Media Bucket** (`harborlist-media-{account}`)
  - CORS enabled for file uploads
  - Used for boat images and media files
  
- **Frontend Bucket** (configurable name)
  - Website hosting enabled
  - Public read access for SPA hosting
  - CORS configured for API access

#### Lambda Functions
- **Auth Function**: Handles authentication and authorization
- **Listing Function**: Manages boat listings CRUD operations
- **Search Function**: Provides search functionality
- **Media Function**: Handles file uploads and media processing
- **Email Function**: Manages email notifications
- **Stats Function**: Provides platform analytics
- **Admin Function**: Comprehensive admin operations

#### API Gateway Configuration
- **REST API**: Single API Gateway with multiple resources
- **CORS**: Configured for cross-origin requests
- **Endpoints**:
  - `/auth/*` - Authentication endpoints
  - `/auth/admin/*` - Admin authentication
  - `/listings/*` - Listing management
  - `/search` - Search functionality
  - `/media` - File upload
  - `/admin/*` - Admin operations
  - `/health` - Health checks

#### Security Configuration
- **JWT Secret**: AWS Secrets Manager for production
- **IAM Roles**: Least privilege access for Lambda functions
- **Standard Security Construct**: Basic security controls
- **SSL Certificate**: ACM certificate for custom domains

#### Monitoring and Alerting
- **CloudWatch Alarms**: Error rate and duration monitoring
- **SNS Topics**: Alert notifications
- **Audit Logging**: Comprehensive audit trail

### Environment Configuration

#### Multi-Environment Support
The stack supports multiple environments through CDK context:
- **Development**: Basic configuration with relaxed security
- **Staging**: Production-like environment for testing
- **Production**: Full security and monitoring enabled

#### Environment-Specific Settings
```typescript
interface HarborListStackProps {
  environment: 'dev' | 'staging' | 'prod';
  domainName?: string;
  apiDomainName?: string;
  alertEmail?: string;
}
```

## Current Docker Compose Setup

### Local Development Architecture (`docker-compose.local.yml`)

The local development environment provides a comprehensive setup with two profiles:

#### Basic Profile Services
- **Frontend**: React development server (port 3000)
- **Backend**: Express wrapper for Lambda functions (port 3001)
- **DynamoDB Local**: Local DynamoDB instance (port 8000)
- **LocalStack**: AWS services emulation (port 4566)
- **DynamoDB Admin**: Web UI for database management (port 8001)
- **Redis**: Caching service (port 6379)
- **SMTP4Dev**: Email testing service (port 5001)

#### Enhanced Profile Services
- **Traefik**: Reverse proxy with SSL termination
- **Billing Service**: Payment processing service (port 3002)
- **Finance Service**: Financial calculations service (port 3003)

#### Network Configuration
- **Custom Network**: `harborlist-local` bridge network
- **SSL Support**: Local SSL certificates with Traefik
- **Domain Mapping**: Local domain routing through Traefik

#### Service Integration
- **LocalStack Services**: S3, SES, CloudWatch, Logs
- **Database Initialization**: Automated S3 bucket setup
- **Volume Persistence**: Data persistence for development

### Environment Variables Configuration

#### Backend Environment Variables (`.env.example`)
```bash
# Database Configuration
DYNAMODB_ENDPOINT=http://localhost:8000
USERS_TABLE=boat-users
LISTINGS_TABLE=harborlist-listings
SESSIONS_TABLE=boat-sessions
AUDIT_LOGS_TABLE=boat-audit-logs

# Authentication
JWT_SECRET=local-dev-secret-harborlist-2025
ENVIRONMENT=local

# AWS Services (Local)
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
S3_ENDPOINT=http://localhost:4566
SES_ENDPOINT=http://localhost:4566

# API Configuration
API_BASE_URL=http://local-api.harborlist.com:3001
FRONTEND_URL=http://local.harborlist.com:3000
CORS_ORIGINS=http://local.harborlist.com:3000,http://localhost:3000
```

#### Docker Compose Environment Variables
```yaml
environment:
  - NODE_ENV=development
  - ENVIRONMENT=local
  - DEPLOYMENT_TARGET=docker
  - DYNAMODB_ENDPOINT=http://dynamodb-local:8000
  - S3_ENDPOINT=http://localstack:4566
  - JWT_SECRET=local-dev-secret-harborlist-2025
  - ACCESS_TOKEN_EXPIRY_SECONDS=86400  # 24 hours for local development
```

## Current API Gateway and Authorization Patterns

### API Gateway Structure
- **Single REST API**: All services routed through one API Gateway
- **Resource-Based Routing**: Different resources for different services
- **Lambda Proxy Integration**: All requests proxied to Lambda functions
- **CORS Configuration**: Comprehensive CORS setup for frontend integration

### Authorization Patterns
- **JWT-Based Authentication**: Custom JWT token validation
- **Middleware-Based Authorization**: Role and permission checking in Lambda functions
- **No API Gateway Authorizers**: Authorization handled within Lambda functions
- **Session Management**: Custom session tracking in DynamoDB

### Current Endpoint Structure
```
/auth/login          - Customer login
/auth/admin/login    - Admin login
/auth/register       - Customer registration
/auth/refresh        - Token refresh
/auth/logout         - Session termination
/admin/*             - Admin operations (requires admin auth)
/listings/*          - Listing operations (requires user auth)
/search              - Search functionality (public)
/health              - Health checks (public)
```

## Environment Detection and Configuration

### Deployment Context Detection
```typescript
interface DeploymentContext {
  isDocker: boolean;
  isAWS: boolean;
  environment: string;
  deploymentTarget: 'docker' | 'aws';
}
```

### Configuration Service
- **Docker Environment**: Uses environment variables for fast local development
- **AWS Environment**: Uses AWS Secrets Manager for secure secret management
- **Automatic Detection**: Based on AWS Lambda environment variables

### Environment-Specific Behavior
- **Local Development**: Relaxed security, extended token expiry, debug logging
- **AWS Deployment**: Enhanced security, short token expiry, production logging
- **LocalStack Integration**: Seamless switching between local and AWS services

## Current Limitations and Challenges

### Infrastructure Limitations
1. **Single Authentication Domain**: No separation between customer and staff authentication
2. **Manual Authorization**: Custom authorization logic instead of API Gateway authorizers
3. **Session Complexity**: Custom session management instead of Cognito features
4. **Limited Scalability**: Custom authentication may not scale as efficiently as Cognito

### Environment Management Challenges
1. **Configuration Complexity**: Multiple environment variable files and configurations
2. **Secret Management**: Mixed approach between environment variables and Secrets Manager
3. **Local Development**: Complex Docker Compose setup for full feature parity
4. **Environment Switching**: Manual configuration changes required

### API Gateway Limitations
1. **No Built-in Authorization**: All authorization handled in Lambda functions
2. **Single API Structure**: No separation between customer and admin APIs
3. **CORS Complexity**: Manual CORS configuration for all endpoints
4. **Rate Limiting**: Custom rate limiting instead of API Gateway features

## Integration Points for Cognito Migration

### CDK Infrastructure Changes Required
1. **New CDK Stacks**: Separate stacks for Customer and Staff User Pools
2. **API Gateway Authorizers**: Lambda authorizers for Cognito token validation
3. **Environment Variables**: Update Lambda environment variables for Cognito endpoints
4. **IAM Permissions**: New permissions for Cognito operations

### Docker Compose Integration
1. **LocalStack Cognito**: Add Cognito service to LocalStack configuration
2. **Environment Variables**: Update environment variables for dual-pool setup
3. **Initialization Scripts**: Scripts to create User Pools and test users in LocalStack
4. **Service Dependencies**: Update service dependencies for Cognito integration

### Environment Configuration Updates
1. **Cognito Endpoints**: Environment-specific Cognito User Pool configurations
2. **Client IDs**: Separate client IDs for Customer and Staff pools
3. **Token Configuration**: Update token handling for Cognito JWT format
4. **Local Development**: LocalStack Cognito endpoint configuration

## Recommendations for Cognito Integration

### High Priority Infrastructure Changes
1. **Dual CDK Stacks**: Create separate CustomerAuthStack and StaffAuthStack
2. **API Gateway Authorizers**: Implement Lambda authorizers for each User Pool
3. **Environment Detection**: Enhance environment detection for Cognito endpoints
4. **LocalStack Integration**: Add Cognito service to local development stack

### Medium Priority Enhancements
1. **API Restructuring**: Consider separating customer and admin APIs
2. **Monitoring Integration**: Enhance monitoring with Cognito-specific metrics
3. **Secret Management**: Standardize secret management approach
4. **Configuration Simplification**: Reduce environment variable complexity

### Low Priority Optimizations
1. **CDK Constructs**: Create reusable constructs for Cognito setup
2. **Deployment Automation**: Automate User Pool configuration deployment
3. **Testing Infrastructure**: Infrastructure for automated testing of auth flows
4. **Documentation**: Comprehensive infrastructure documentation

## Migration Strategy Considerations

### Backward Compatibility
1. **Gradual Migration**: Support both authentication systems during transition
2. **API Compatibility**: Maintain existing API endpoints during migration
3. **Database Schema**: Plan for schema changes to support Cognito integration
4. **Session Migration**: Strategy for migrating existing sessions

### Environment Parity
1. **Local Development**: Ensure LocalStack Cognito matches AWS Cognito behavior
2. **Testing**: Comprehensive testing across all environments
3. **Configuration**: Consistent configuration across environments
4. **Monitoring**: Maintain monitoring capabilities during migration

### Deployment Strategy
1. **Phased Rollout**: Deploy infrastructure changes in phases
2. **Feature Flags**: Use feature flags to control authentication method
3. **Rollback Plan**: Comprehensive rollback strategy for failed migrations
4. **Monitoring**: Enhanced monitoring during migration period

## Next Steps

1. **Refactoring Strategy**: Develop detailed migration plan with phases and milestones
2. **CDK Design**: Design new CDK stacks for dual Cognito User Pools
3. **LocalStack Setup**: Configure LocalStack Cognito for local development
4. **Testing Plan**: Create comprehensive testing strategy for infrastructure changes