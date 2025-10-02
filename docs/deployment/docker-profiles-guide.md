# 🚢 Docker Compose Profile Architecture

## Overview

We use a **single Docker Compose file** (`docker-compose.local.yml`) with **Docker profiles** to provide both basic and enhanced local development environments:

- **Basic Profile**: Simple development setup with direct port access
- **Enhanced Profile**: Production-like setup with Traefik reverse proxy

## Profile Configuration

### Services by Profile

| Service | Basic | Enhanced | Purpose |
|---------|-------|----------|---------|
| `frontend` | ✅ | ✅ | React app with Vite HMR |
| `backend` | ✅ | ✅ | Express + Lambda wrapper |
| `dynamodb-local` | ✅ | ✅ | AWS DynamoDB emulation |
| `localstack` | ✅ | ✅ | S3, SES, CloudWatch |
| `redis` | ✅ | ✅ | Cache and session storage |
| `dynamodb-admin` | ✅ | ✅ | Database management UI |
| `traefik` | ❌ | ✅ | Reverse proxy with SSL |

### Usage Commands

```bash
# Basic Environment
npm run dev:start                # Start basic environment
npm run dev:start:bg            # Start basic environment in background

# Enhanced Environment  
npm run dev:setup:enhanced      # Setup enhanced environment
npm run dev:start:enhanced      # Start enhanced environment
npm run dev:start:enhanced:bg   # Start enhanced environment in background

# Common Commands
npm run dev:stop                # Stop services
npm run dev:clean              # Clean volumes and containers
npm run dev:logs               # View all logs
npm run dev:logs:traefik       # View Traefik logs (enhanced only)
```

## Why This Approach?

1. **Single Source of Truth**: One Docker Compose file to maintain
2. **Simplified Development**: Choose complexity level as needed
3. **Consistent Configuration**: Services behave identically across profiles
4. **Easy Switching**: Change profiles without file duplication
5. **Clear Separation**: Enhanced features clearly marked with Traefik labels

## Access Points

### Basic Profile
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`
- DynamoDB Admin: `http://localhost:8001`

### Enhanced Profile
- Frontend: `http://local.harborlist.com` (via Traefik)
- Backend API: `http://local-api.harborlist.com` (via Traefik)
- Traefik Dashboard: `http://traefik.local.harborlist.com`
- DynamoDB Admin: `http://localhost:8001`

## Technical Implementation

The enhanced profile adds:
- SSL/TLS termination
- Rate limiting
- Security headers
- Host-based routing
- Production-like request flow

All services include Traefik labels but only activate when Traefik is running (enhanced profile).