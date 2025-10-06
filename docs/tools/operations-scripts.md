# Operations Scripts Documentation

This document provides comprehensive information about the operations scripts in the HarborList platform.

## Overview

The operations scripts handle system administration tasks, user management, and operational procedures across all environments. These tools are designed for platform administrators and operations teams.

## Available Scripts

### 🧑‍💼 User Management Scripts

#### `create-admin-user.sh`
**Purpose**: Create admin users across different environments with proper role-based permissions.

**Location**: `tools/operations/create-admin-user.sh`

**Features**:
- Multi-environment support (local, dev, staging, prod)
- Role-based permission assignment
- Secure password generation
- Interactive confirmation with force override
- Dry-run capability for testing
- Comprehensive validation and error handling
- Color-coded output for better user experience

**Usage**:
```bash
# Basic usage
./tools/operations/create-admin-user.sh \
  --email admin@harborlist.com \
  --name "Super Admin" \
  --role super_admin

# Production deployment with custom password
./tools/operations/create-admin-user.sh \
  --environment prod \
  --email admin@company.com \
  --name "Production Admin" \
  --role admin \
  --password "SecurePass123!"

# Dry run for testing
./tools/operations/create-admin-user.sh \
  --dry-run \
  --email test@example.com \
  --name "Test User" \
  --role moderator
```

**Arguments**:
- `--email` (required): Admin user email address
- `--name` (required): Admin user full name
- `--role` (required): Admin role (super_admin, admin, moderator, support)
- `--environment` (optional): Target environment (default: local)
- `--password` (optional): Custom password (auto-generated if not provided)
- `--permissions` (optional): Comma-separated permissions list
- `--force`: Skip confirmation prompts
- `--dry-run`: Show what would be done without executing
- `--help`: Show detailed help information

**Roles & Permissions**:

| Role | Default Permissions | Description |
|------|-------------------|-------------|
| `super_admin` | All permissions | Full system access |
| `admin` | user_management, content_moderation, analytics_view, audit_log_view | Standard admin access |
| `moderator` | content_moderation, audit_log_view | Content moderation focus |
| `support` | audit_log_view | Limited support access |

**Available Permissions**:
- `user_management`: Manage user accounts and profiles
- `content_moderation`: Moderate listings and user content
- `analytics_view`: View system analytics and reports
- `audit_log_view`: Access audit logs and system events
- `system_config`: Modify system configuration
- `financial_reports`: Access financial and payment reports

**Environment Configuration**:

| Environment | Users Table | Region | Admin URL |
|-------------|-------------|--------|-----------|
| Local | `boat-users` | `us-east-1` | http://local.harborlist.com/admin |
| Dev | `harborlist-users-dev` | `us-east-1` | https://dev-admin.harborlist.com/admin |
| Staging | `harborlist-users-staging` | `us-east-1` | https://staging-admin.harborlist.com/admin |
| Production | `harborlist-users-prod` | `us-east-1` | https://admin.harborlist.com/admin |

**Security Considerations**:
- All production admin accounts require MFA setup
- Super admins have shorter session timeouts (30 min vs 60 min)
- Generated passwords are cryptographically secure (16 characters with mixed case, numbers, symbols)
- All admin actions are logged for audit purposes

**Prerequisites**:
- Node.js (v18+) and npm installed
- Backend dependencies installed (`npm install` in backend/)
- AWS credentials configured for target environment
- TypeScript/ts-node available

**Error Handling**:
The script includes comprehensive error handling for:
- Invalid email formats
- Invalid roles or permissions
- Missing prerequisites
- AWS authentication failures
- DynamoDB table access issues
- Existing user conflicts

**Examples**:

```bash
# Create local development super admin
./tools/operations/create-admin-user.sh \
  --email dev@harborlist.com \
  --name "Development Admin" \
  --role super_admin

# Create staging moderator with specific permissions
./tools/operations/create-admin-user.sh \
  --environment staging \
  --email moderator@harborlist.com \
  --name "Content Moderator" \
  --role moderator \
  --permissions "content_moderation,audit_log_view"

# Production admin with force flag (skip confirmations)
./tools/operations/create-admin-user.sh \
  --environment prod \
  --email admin@company.com \
  --name "Production Administrator" \
  --role admin \
  --force
```

## Best Practices

### Security
1. **Use Dry Run First**: Always test with `--dry-run` before actual execution
2. **Role-Based Access**: Assign minimal required permissions
3. **Strong Passwords**: Use complex passwords or let the system generate them
4. **Environment Separation**: Never use production scripts on development data
5. **Credential Security**: Store generated passwords in secure password managers

### Operations
1. **Document Admin Users**: Maintain a record of all admin accounts created
2. **Regular Audits**: Review admin permissions regularly
3. **MFA Enforcement**: Ensure all admin accounts enable MFA after creation
4. **Password Rotation**: Implement regular password rotation policies
5. **Audit Logging**: Monitor admin actions through audit logs

### Development Workflow
1. **Test Locally First**: Create and test admin users in local environment
2. **Staging Validation**: Validate admin functionality in staging before production
3. **Production Deployment**: Use force flag with caution in production
4. **Backup Procedures**: Have account recovery procedures in place

## Troubleshooting

### Common Issues

#### Permission Denied on Script
```bash
chmod +x tools/operations/create-admin-user.sh
```

#### AWS Authentication Errors
```bash
# Verify AWS credentials
aws sts get-caller-identity

# Set correct profile
export AWS_PROFILE=harborlist-prod
```

#### Backend Dependencies Missing
```bash
cd backend/
npm install
```

#### DynamoDB Table Not Found
- Verify the target environment is properly deployed
- Check AWS credentials have access to the DynamoDB table
- Confirm table names match environment configuration

#### User Already Exists
- Check if the email is already registered
- Use a different email or delete the existing user first
- Review audit logs to understand previous user creation

### Debugging
Enable verbose output by setting:
```bash
export DEBUG=1
./tools/operations/create-admin-user.sh [options]
```

## Integration with Other Tools

### Deployment Scripts
The admin user creation is often used in conjunction with:
- `tools/deployment/deploy.sh` - Deploy infrastructure first
- `tools/deployment/verify-deployment.sh` - Verify deployment before user creation

### Monitoring Scripts
After creating admin users, use:
- `tools/monitoring/test-monitoring.sh` - Verify admin login monitoring
- `tools/security/validate-admin-infrastructure.js` - Validate admin security

### Audit and Compliance
- All admin user creation is logged in audit tables
- Use `tools/utilities/audit-report.sh` to generate compliance reports
- Review admin access patterns with monitoring tools

## Related Documentation

- [Backend Authentication System](../../docs/backend/security.md)
- [User Management Architecture](../../docs/architecture/user-management.md)
- [Security Best Practices](../../docs/security/README.md)
- [Operations Runbooks](../../docs/operations/README.md)

---

**Maintained by**: HarborList Operations Team  
**Last Updated**: October 2025  
**Version**: 1.0.0