# 🚢 HarborList Local Development Environment

This guide will help you set up and run the complete HarborList marketplace platform on your local machine using Docker Compose.

## 🏗️ Architecture Overview

The local development environment mirrors our production AWS serverless architecture with **NPM workspaces** for shared types and comprehensive SSL-enabled local services:

```mermaid
graph TB
    subgraph "Local Development Environment"
        subgraph "NPM Workspace Architecture"
            ST[📦 @harborlist/shared-types<br/>packages/shared-types/<br/>🔗 Centralized TypeScript definitions]
        end
        
        subgraph "Application Layer"
            FE[Frontend - React + Vite<br/>https://local.harborlist.com<br/>🔥 Hot Reload + SSL Enabled]
            BE[Backend - Express + Lambda<br/>https://local-api.harborlist.com<br/>🔥 Hot Reload + SSL Enabled]
        end
        
        subgraph "Reverse Proxy & SSL"
            TRAEFIK[Traefik v3<br/>Port 443/80<br/>🔒 SSL Termination & Routing]
        end
        
        subgraph "Local AWS Services"
            DDB[DynamoDB Local<br/>localhost:8000<br/>📊 In-Memory Mode]
            S3[LocalStack S3<br/>localhost:4566<br/>📁 File Storage & CDN]
            SES[LocalStack SES<br/>localhost:4566<br/>📧 Email Service]
        end
        
        subgraph "Development Tools"
            ADMIN[DynamoDB Admin UI<br/>localhost:8001<br/>🛠️ Database Management]
            REDIS[Redis Cache<br/>localhost:6379<br/>⚡ Session & Cache Storage]
        end
    end
    
    FE -->|Import Types| ST
    BE -->|Import Types| ST
    FE -->|HTTPS API Calls| TRAEFIK
    TRAEFIK -->|Route to Backend| BE
    BE -->|Database Queries| DDB
    BE -->|File Operations| S3
    BE -->|Email Sending| SES
    BE -->|Cache Operations| REDIS
    
    style FE fill:#61dafb,stroke:#333,stroke-width:2px
    style BE fill:#68a063,stroke:#333,stroke-width:2px
    style ST fill:#f39c12,stroke:#333,stroke-width:2px
    style TRAEFIK fill:#24a0ed,stroke:#333,stroke-width:2px
    style DDB fill:#ff9900,stroke:#333,stroke-width:2px
    style S3 fill:#ff9900,stroke:#333,stroke-width:2px
    style ADMIN fill:#f39c12,stroke:#333,stroke-width:2px
```

## 📋 Prerequisites

### Required Software
- **Docker Desktop** (4.0+) with Docker Compose
- **Node.js** (18+) and **npm** (9+)
- **Git** for version control
- **AWS CLI** (for local table setup)

### System Requirements
- **macOS/Linux/Windows** with WSL2
- **4GB RAM** minimum (8GB recommended)
- **10GB free disk space**

## 🏗️ NPM Workspaces & Shared Types Architecture

HarborList uses **NPM workspaces** to manage dependencies and share TypeScript definitions across frontend, backend, and shared packages.

### Workspace Structure
```
harborlist-marketplace/
├── package.json                    # Root workspace configuration
├── frontend/                       # React application workspace
├── backend/                        # Node.js/Lambda services workspace
└── packages/
    └── shared-types/              # Centralized TypeScript definitions
        ├── package.json           # @harborlist/shared-types package
        ├── src/
        │   ├── index.ts          # Main export file
        │   └── common.ts         # Domain types & enums
        ├── dist/                 # Compiled JavaScript output
        └── types/                # TypeScript declaration files
```

### Key Benefits
- ✅ **Type Safety**: Shared TypeScript interfaces across all services
- ✅ **Single Source of Truth**: Centralized domain definitions
- ✅ **Development Efficiency**: Hot reload works across workspace packages
- ✅ **Build Optimization**: Automatic dependency linking and compilation
- ✅ **Production Ready**: Proper npm package with versioning support

### Shared Types Usage
```typescript
// Backend services
import { User, Listing, ListingStatus } from '@harborlist/shared-types';

// Frontend components
import { APIResponse, PaginatedResponse } from '@harborlist/shared-types';

// Both runtime enums and TypeScript types available
const status: ListingStatus = ListingStatus.ACTIVE;
```

## 🚀 Quick Start (5 minutes)

### 1. Clone and Install
```bash
# Clone the repository
git clone https://github.com/felixep/harborlist-marketplace.git
cd harborlist-marketplace

# Install all dependencies
npm run install
```

### 2. Setup Local Domains
```bash
# Add local domains to your hosts file (requires sudo)
npm run hosts:setup

# Manual alternative: Add these lines to /etc/hosts
# 127.0.0.1 local.harborlist.com
# 127.0.0.1 local-api.harborlist.com
```

### 3. Setup Environment
```bash
# Copy environment variables
cp .env.example .env.local

# Setup local services and database
npm run dev:setup
```

### 4. Start Development Environment
```bash
# Start all services with SSL-enabled configuration
npm run dev:start

# Or start in background
npm run dev:start:bg
```

### 5. Database Setup & SSL Configuration

The local environment automatically handles:

- **🔒 SSL Certificates**: Auto-generated Chrome-compatible certificates
- **📊 DynamoDB Tables**: Created automatically with proper schema:
  - `boat-listings` - Boat marketplace listings
  - `boat-users` - User accounts and authentication
  - `boat-reviews` - User reviews and ratings
  - `boat-sessions` - Authentication sessions
  - `boat-login-attempts` - Security monitoring
  - `boat-audit-logs` - Compliance and audit trail

### 6. Create Admin User
```bash
# In a new terminal, create your first admin user
npm run dev:admin
```

### 6. Access the Application

🎉 **SSL-Enabled Local Services**:
- **Frontend**: https://local.harborlist.com (React + Vite with HMR)
- **Backend API**: https://local-api.harborlist.com (Express + Lambda handlers)
- **API Health**: https://local-api.harborlist.com/health

**Development Tools**:
- **DynamoDB Admin**: http://localhost:8001
- **LocalStack Dashboard**: http://localhost:4566
- **Traefik Dashboard**: http://traefik.local.harborlist.com

## 🛠️ Development Commands

### Environment Management
```bash
# Start development environment
npm run dev:start                 # Start all services (foreground)
npm run dev:start:bg              # Start all services (background)
npm run dev:stop                  # Stop all services
npm run dev:restart               # Restart all services
npm run dev:clean                 # Stop and remove all data volumes

# Status and monitoring
npm run dev:status                # Show service status
npm run dev:logs                  # Show all service logs
npm run dev:logs:backend          # Show backend logs only
npm run dev:logs:frontend         # Show frontend logs only
```

### Database Management
```bash
# Setup/reset local database
cd backend && npm run dev:setup-db

# Create admin user
npm run dev:admin

# Access DynamoDB Admin UI
open http://localhost:8001
```

### Service Access
```bash
# Open shell in containers
npm run dev:shell:backend         # Access backend container
npm run dev:shell:frontend        # Access frontend container
```

### Cleanup
```bash
# Remove local domains from hosts file
npm run hosts:remove

# Clean all Docker data
npm run dev:clean
```

## 🔧 Individual Service Development

### Frontend Development
```bash
cd frontend

# Start frontend dev server directly (without Docker)
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

### Backend Development
```bash
cd backend

# Start backend dev server directly (without Docker)
npm run dev:local

# Run tests
npm run test

# Build Lambda packages
npm run build
```

## 📊 Service Details

### Frontend (React + Vite)
- **URL**: http://local.harborlist.com:3000
- **Hot Reload**: Enabled with file watching
- **Environment**: `VITE_ENVIRONMENT=local`
- **API Endpoint**: http://local-api.harborlist.com:3001/api

### Backend (Express + Lambda Wrapper)
- **URL**: http://local-api.harborlist.com:3001
- **Architecture**: Express server wrapping Lambda functions
- **Hot Reload**: Enabled with nodemon and ts-node
- **Environment**: `NODE_ENV=development`

### DynamoDB Local
- **Endpoint**: http://localhost:8000
- **Admin UI**: http://localhost:8001
- **Region**: us-east-1
- **Tables**: Automatically created with GSI indexes

### LocalStack (AWS Services)
- **Endpoint**: http://localhost:4566
- **Services**: S3, SES, CloudWatch, IAM
- **Buckets**: harborlist-uploads-local, harborlist-frontend-local

### Redis Cache
- **Endpoint**: redis://localhost:6379
- **Usage**: Session storage, API caching (optional)

## 🔍 Troubleshooting

### Common Issues

#### 1. "Address already in use" Error
```bash
# Check what's using the ports
lsof -ti:3000,3001,8000,8001,4566,6379

# Stop conflicting services
npm run dev:stop
```

#### 2. Domain Resolution Issues
```bash
# Verify hosts file entries
cat /etc/hosts | grep harborlist

# Re-setup domains if needed
npm run hosts:remove
npm run hosts:setup
```

#### 3. Database Connection Issues
```bash
# Reset local database
npm run dev:clean
npm run dev:setup
```

#### 4. Docker Issues
```bash
# Reset Docker state
docker-compose -f docker-compose.local.yml down -v --remove-orphans
docker system prune -f
npm run dev:setup
```

#### 5. Dependencies Out of Sync
```bash
# Clean and reinstall all dependencies
rm -rf frontend/node_modules backend/node_modules infrastructure/node_modules
npm run install
```

### Health Checks

#### Backend Health Check
```bash
curl http://local-api.harborlist.com:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-02T...",
  "environment": "local",
  "services": {
    "dynamodb": "http://dynamodb-local:8000",
    "s3": "http://localstack:4566",
    "ses": "http://localstack:4566"
  }
}
```

#### Database Health Check
```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000 --region us-east-1
```

#### LocalStack Health Check
```bash
curl http://localhost:4566/_localstack/health
```

## 📈 Performance Tips

### 1. Optimize Docker Performance
- **macOS**: Increase Docker Desktop memory to 6-8GB
- **Windows**: Use WSL2 backend for better performance
- **Linux**: Native Docker performance is optimal

### 2. Enable File Watching
- Environment variable `CHOKIDAR_USEPOLLING=true` is set for container compatibility
- Use `.dockerignore` files to exclude node_modules from context

### 3. Database Performance
- DynamoDB Local stores data in Docker volumes for persistence
- Use DynamoDB Admin UI for efficient data management

## 🔒 Security Notes

### Local Development Security
- All services use test/development credentials
- JWT secret is hardcoded for local development
- CORS is configured for local domains only
- No HTTPS required for local development

### Production Differences
- Local environment uses HTTP (not HTTPS)
- Simplified authentication (no MFA required)
- Debug logging enabled
- Relaxed CORS policies

## 🎯 Next Steps

### Development Workflow
1. **Make Changes**: Edit code in your IDE
2. **See Changes**: Hot reload automatically updates
3. **Test**: Use DynamoDB Admin UI to verify database changes
4. **Debug**: Check logs with `npm run dev:logs`

### Deployment Preparation
1. **Test Locally**: Ensure everything works in local environment
2. **Run Tests**: `npm run test` in each service
3. **Build**: `npm run build` to verify production builds
4. **Deploy**: Use existing deployment scripts for AWS

### Additional Resources
- [Main Project README](../README.md)
- [Backend Documentation](../docs/backend/README.md)
- [Frontend Documentation](../docs/frontend/README.md)
- [Infrastructure Documentation](../docs/architecture/README.md)

## � Troubleshooting Guide

### Common Issues & Solutions

#### 🚫 **Frontend Shows Blank Page**
**Problem**: Frontend loads but shows blank page
**Solution**:
```bash
# Check if shared types are properly built
cd packages/shared-types && npm run build

# Restart frontend with clean install
cd frontend && rm -rf node_modules && npm install && npm run dev
```

#### 🔒 **SSL Certificate Errors in Chrome**
**Problem**: `ERR_SSL_KEY_USAGE_INCOMPATIBLE` in Chrome
**Solution**: SSL certificates are auto-generated with Chrome-compatible extensions. If issues persist:
```bash
# Regenerate SSL certificates
docker-compose -f docker-compose.local.yml down
docker volume rm harborlist-marketplace_traefik_certs
docker-compose -f docker-compose.local.yml --profile enhanced up -d
```

#### 🌐 **DNS Resolution Issues**
**Problem**: `local.harborlist.com` not resolving
**Solution**: Check and fix `/etc/hosts` file:
```bash
# Verify hosts file
cat /etc/hosts | grep harborlist

# Re-add entries if missing
echo "127.0.0.1 local.harborlist.com" | sudo tee -a /etc/hosts
echo "127.0.0.1 local-api.harborlist.com" | sudo tee -a /etc/hosts
```

#### 🔥 **Vite HMR Not Working with HTTPS**
**Problem**: Hot reload stops working after SSL setup
**Solution**: Vite is configured for HTTPS HMR. If issues persist:
```bash
# Check frontend configuration
cd frontend && npm run dev -- --host 0.0.0.0 --port 3000
```

#### 🗄️ **DynamoDB Connection Errors**
**Problem**: `ValidationException: Value null at 'tableName'`
**Solution**: Environment variables not loaded properly:
```bash
# Restart backend completely (not just restart)
docker-compose -f docker-compose.local.yml stop backend
docker-compose -f docker-compose.local.yml rm -f backend
docker-compose -f docker-compose.local.yml --profile enhanced up -d backend
```

#### 🔐 **Authentication 401 Errors**
**Problem**: Login returns 401 even with correct credentials
**Solution**: User needs to be activated for local development:
```bash
# Create and activate test user
curl -k -X POST https://local-api.harborlist.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"TestPass123!"}'

# Then activate via DynamoDB Admin UI or AWS CLI
```

#### 📊 **Database Tables Missing**
**Problem**: API returns table not found errors
**Solution**: Recreate database tables:
```bash
# Use the setup script
cd backend && chmod +x scripts/setup-local-db.sh && ./scripts/setup-local-db.sh

# Or create manually via AWS CLI
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test aws dynamodb create-table \
  --table-name boat-listings \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --endpoint-url http://localhost:8000 --region us-east-1
```

### Debug Commands

```bash
# Check all container status
docker ps

# View specific service logs
docker logs harborlist-marketplace-frontend-1 --tail 20
docker logs harborlist-marketplace-backend-1 --tail 20
docker logs harborlist-marketplace-dynamodb-local-1 --tail 20

# Test API endpoints
curl -k https://local-api.harborlist.com/health
curl -k https://local-api.harborlist.com/api/stats/platform

# Check environment variables in containers
docker exec harborlist-marketplace-backend-1 env | grep TABLE

# Access container shell
docker exec -it harborlist-marketplace-backend-1 sh
```

## �💡 Pro Tips

### IDE Setup
- Use VS Code with Docker extension for container management
- Install Thunder Client or REST Client for API testing
- Use DynamoDB extension for database visualization

### Development Efficiency
- Keep DynamoDB Admin UI open for real-time data inspection
- Use `docker-compose logs -f [service]` for targeted debugging
- Bookmark all local URLs for quick access

### Data Management
- Use the admin user creation script for consistent test data
- DynamoDB Admin UI allows easy data export/import
- LocalStack provides S3 browser interface at http://localhost:4566

---

**🚢 Happy coding with HarborList!**

For questions or issues, check the troubleshooting section or refer to the main project documentation.