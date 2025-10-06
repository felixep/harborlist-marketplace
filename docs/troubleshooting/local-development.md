# Local Development Issues

## 🚨 API 500 Errors

### Issue: 500 Errors on All API Calls

**Symptoms:**
- All API endpoints return 500 Internal Server Error
- Backend logs show DynamoDB ResourceNotFoundException
- Frontend can't load data

**Root Cause:**
DynamoDB Local tables are not created or have incorrect names.

**Quick Fix:**
```bash
# Run the database setup script
./backend/scripts/setup-local-db.sh

# Or restart with clean database
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml --profile enhanced up -d
./backend/scripts/setup-local-db.sh
```

**Permanent Solution:**
The database setup script is now automatically run when you use the deployment script:
```bash
./tools/deployment/deploy.sh local
```

## 🐳 Container Issues

### Issue: Backend Container Fails to Start

**Symptoms:**
- Backend container exits immediately
- Logs show module not found errors
- npm install failures

**Solutions:**
```bash
# Rebuild backend without cache
docker-compose -f docker-compose.local.yml build --no-cache backend

# Or restart from scratch
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml --profile enhanced up -d --build
```

## 🌐 Network and Domain Issues

### Issue: Custom Domains Not Working

**Symptoms:**
- https://local.harborlist.com not accessible
- SSL certificate errors
- Traefik not routing correctly

**Solutions:**
1. **Check hosts file:**
```bash
# Add these entries to /etc/hosts
127.0.0.1 local.harborlist.com
127.0.0.1 local-api.harborlist.com
127.0.0.1 traefik.local.harborlist.com
```

2. **Generate or verify SSL certificates:**
```bash
# Generate local SSL certificates if missing
./tools/ssl/generate-ssl-certs.sh
```

3. **Check Traefik status:**
```bash
# View Traefik dashboard
open http://localhost:8088
```

## 💾 Database Issues

### Issue: Database Admin Interface Not Working

**Symptoms:**
- http://localhost:8001 not accessible
- DynamoDB Admin container not running

**Solutions:**
```bash
# Check container status
docker ps | grep dynamodb-admin

# Restart the admin interface
docker restart harborlist-marketplace-dynamodb-admin-1

# Access via direct port
open http://localhost:8001
```

### Issue: Environment Variable Mismatches

**Symptoms:**
- Tables exist but backend can't find them
- Different table names in logs vs database

**Root Cause:**
The Docker Compose environment variables don't match the backend defaults.

**Current Environment Variables (docker-compose.local.yml):**
```yaml
environment:
  - LISTINGS_TABLE=harborlist-listings    # ← Backend expects this
  - USERS_TABLE=boat-users               # ← Backend default
  - REVIEWS_TABLE=boat-reviews           # ← Backend default
  - SESSIONS_TABLE=boat-sessions         # ← Backend default
  - LOGIN_ATTEMPTS_TABLE=boat-login-attempts  # ← Backend default
  - AUDIT_LOGS_TABLE=boat-audit-logs     # ← Backend default
```

**Verification:**
```bash
# Check what tables exist
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test aws dynamodb list-tables \
  --endpoint-url http://localhost:8000 --region us-east-1

# Expected tables:
# - boat-users
# - harborlist-listings (from LISTINGS_TABLE env var)
# - boat-sessions
# - boat-login-attempts
# - boat-audit-logs
# - boat-reviews
# - boat-admin-sessions
```

## 🔍 Debugging Commands

### Check Container Status
```bash
# View all containers
docker ps

# Check specific container logs
docker logs harborlist-marketplace-backend-1 --tail 50
docker logs harborlist-marketplace-frontend-1 --tail 20
docker logs harborlist-marketplace-traefik-1 --tail 20
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:3001/health

# Test listings endpoint
curl http://localhost:3001/api/listings

# Test with custom domain (if SSL is set up)
curl -k https://local-api.harborlist.com/health
```

### Database Operations
```bash
# List all tables
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test aws dynamodb list-tables \
  --endpoint-url http://localhost:8000 --region us-east-1

# Describe a specific table
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test aws dynamodb describe-table \
  --table-name boat-users \
  --endpoint-url http://localhost:8000 --region us-east-1

# Scan a table (see contents)
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test aws dynamodb scan \
  --table-name boat-users \
  --endpoint-url http://localhost:8000 --region us-east-1
```

### Network Connectivity
```bash
# Test internal container networking
docker exec harborlist-marketplace-backend-1 curl -s http://dynamodb-local:8000
docker exec harborlist-marketplace-backend-1 curl -s http://redis:6379

# Test external connectivity
curl http://localhost:3001/health
curl http://localhost:3000
```

## 🚀 Quick Reset Procedure

If everything is broken and you want to start fresh:

```bash
# 1. Stop and remove all containers and volumes
docker-compose -f docker-compose.local.yml down -v

# 2. Remove any cached images (optional)
docker system prune -f

# 3. Start with enhanced profile
docker-compose -f docker-compose.local.yml --profile enhanced up -d --build

# 4. Wait for containers to start (30 seconds)
sleep 30

# 5. Set up database tables
./backend/scripts/setup-local-db.sh

# 6. Test the API
curl http://localhost:3001/health
```

## 📞 Getting Help

### Log Files to Check
1. **Backend logs**: `docker logs harborlist-marketplace-backend-1`
2. **Frontend logs**: `docker logs harborlist-marketplace-frontend-1`
3. **Traefik logs**: `docker logs harborlist-marketplace-traefik-1`
4. **DynamoDB logs**: `docker logs harborlist-marketplace-dynamodb-local-1`

### Useful URLs
- **Backend API**: http://localhost:3001
- **Frontend**: http://localhost:3000
- **DynamoDB Admin**: http://localhost:8001
- **Traefik Dashboard**: http://localhost:8088
- **Custom Domain Frontend**: https://local.harborlist.com (if SSL configured)
- **Custom Domain API**: https://local-api.harborlist.com (if SSL configured)

### Support Resources
- Check the main [README.md](../../README.md) for setup instructions
- Review [deployment documentation](../deployment/local-development.md)
- Use the deployment script: `./tools/deployment/deploy.sh local`

---

**Related Documentation:**
- [Main Troubleshooting Guide](./README.md)
- [Support Resources](./support.md)
- [Deployment Guide](../deployment/README.md)