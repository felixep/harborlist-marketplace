# HarborList Operations Tools

This directory contains operational scripts and tools for managing the HarborList platform across different environments.

## Overview

The operations tools provide automated solutions for common administrative tasks, including user management, system maintenance, and environment-specific operations.

## Available Scripts

### 🧑‍💼 User Management

#### `create-admin-user.sh`
Creates admin users across different environments (local, dev, staging, prod).

**Features:**
- Multi-environment support with automatic configuration
- Role-based permission assignment
- Secure password generation
- Dry-run capability for testing
- Interactive confirmations with force override
- Comprehensive validation and error handling
- Color-coded output for better user experience

**Quick Start:**
```bash
# Create a super admin for local development
./tools/operations/create-admin-user.sh \
  --email admin@harborlist.com \
  --name "Super Admin" \
  --role super_admin

# Create a production admin with custom password
./tools/operations/create-admin-user.sh \
  --environment prod \
  --email admin@company.com \
  --name "Production Admin" \
  --role admin \
  --password "SecurePass123!"

# Dry run to preview what would be created
./tools/operations/create-admin-user.sh \
  --dry-run \
  --email test@example.com \
  --name "Test User" \
  --role moderator
```

**Available Roles:**
- `super_admin`: Full system access (all permissions)
- `admin`: User management, content moderation, analytics
- `moderator`: Content moderation and audit log access
- `support`: Limited support access (audit logs only)

**Available Permissions:**
- `user_management`: Manage user accounts and profiles
- `content_moderation`: Moderate listings and user content
- `analytics_view`: View system analytics and reports
- `audit_log_view`: Access audit logs and system events
- `system_config`: Modify system configuration
- `financial_reports`: Access financial and payment reports

## Environment Configuration

Each environment has specific configurations:

| Environment | Users Table | Region | Access Method |
|-------------|-------------|--------|---------------|
| **Local** | `boat-users` | `us-east-1` | http://local.harborlist.com/admin |
| **Dev** | `harborlist-users-dev` | `us-east-1` | https://dev-admin.harborlist.com/admin |
| **Staging** | `harborlist-users-staging` | `us-east-1` | https://staging-admin.harborlist.com/admin |
| **Production** | `harborlist-users-prod` | `us-east-1` | https://admin.harborlist.com/admin |

## Prerequisites

### System Requirements
- **Node.js** (v18 or higher)
- **npm** (for dependency management)
- **TypeScript/ts-node** (for script execution)
- **AWS CLI** (configured with appropriate credentials)
- **Bash** (v4 or higher for script execution)

### AWS Credentials
Ensure AWS credentials are configured for the target environment:

```bash
# For specific AWS profiles
export AWS_PROFILE=harborlist-dev

# Or using environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

### Backend Dependencies
Install backend dependencies before running scripts:

```bash
cd backend/
npm install
```

## Security Considerations

### Production Environment
- **MFA Required**: All production admin accounts must enable MFA
- **Strong Passwords**: Use complex passwords or let the system generate them
- **Audit Logging**: All admin actions are logged for security auditing
- **Session Timeouts**: Super admins have shorter session timeouts (30 min vs 60 min)
- **Credential Management**: Never store admin credentials in version control

### Best Practices
1. **Use Dry Run**: Always test with `--dry-run` first
2. **Role-Based Access**: Assign minimal required permissions
3. **Regular Rotation**: Change admin passwords regularly
4. **Environment Separation**: Never use production scripts on development data
5. **Secure Storage**: Store generated passwords in secure password managers

## Troubleshooting

### Common Issues

#### Script Permission Denied
```bash
chmod +x tools/operations/create-admin-user.sh
```

#### AWS Authentication Errors
```bash
# Verify AWS credentials
aws sts get-caller-identity

# Set correct profile
export AWS_PROFILE=your-profile-name
```

#### Backend Dependencies Missing
```bash
cd backend/
npm install
```

#### DynamoDB Table Not Found
- Verify the environment is deployed
- Check AWS credentials have access to the table
- Confirm table names match environment configuration

### Getting Help

For detailed usage information:
```bash
./tools/operations/create-admin-user.sh --help
```

## Contributing

When adding new operational scripts:

1. **Follow Naming Convention**: Use kebab-case for script names
2. **Add Documentation**: Update this README with script details
3. **Include Help Text**: Add `--help` option to all scripts
4. **Error Handling**: Implement comprehensive error handling
5. **Validation**: Validate all inputs before execution
6. **Logging**: Use colored output for better user experience
7. **Dry Run**: Support `--dry-run` for testing

## Script Template

When creating new scripts, use this basic structure:

```bash
#!/bin/bash
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_usage() {
    # Add usage information
}

main() {
    # Script logic here
}

main "$@"
```

## Related Documentation

- [Backend Services Documentation](../../docs/backend/README.md)
- [Authentication & Security](../../docs/backend/security.md)
- [Deployment Guide](../../docs/deployment/README.md)
- [Infrastructure Overview](../../docs/architecture/README.md)

---

**Maintained by**: HarborList Operations Team  
**Last Updated**: October 2025  
**Version**: 1.0.0