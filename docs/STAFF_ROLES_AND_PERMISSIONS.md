# Staff Roles and Permissions System

## Overview

HarborList implements a comprehensive Role-Based Access Control (RBAC) system for staff members using AWS Cognito Staff User Pool with hierarchical roles and granular permissions. The system separates **customers** (marketplace users) from **staff** (platform administrators and moderators) through dual authentication pools.

## Architecture

### Dual Authentication System
- **Customer User Pool**: For marketplace users (buyers/sellers)
- **Staff User Pool**: For platform administrators, moderators, and support team
- Each pool has independent authentication, token management, and permission systems

### Authentication Flow
1. Staff logs in via `/api/auth/staff/login` endpoint
2. Cognito validates credentials against Staff User Pool
3. JWT token issued with role and permissions embedded
4. Token validated on each request using `getUserFromEvent()` from `auth.ts`
5. Authorization checked via `requireAdminRole()` function

---

## Staff Roles Hierarchy

The system implements 4 hierarchical staff roles, each building upon the permissions of lower roles:

### 1. **SUPER_ADMIN** (Level 4 - Highest)
**Full platform control with all permissions**

**Use Case**: Platform owners, technical leads, senior management

**Permissions**: ALL (includes all AdminPermission enum values)
- User Management
- Content Moderation
- Financial Access
- System Configuration
- Analytics View
- Audit Log View
- Tier Management
- Capability Assignment
- Billing Management
- Sales Management
- Platform Settings
- Support Access

**Capabilities**:
- ✅ Create/edit/delete any user (customers or staff)
- ✅ Approve, reject, or modify any listing
- ✅ Access all financial data and reports
- ✅ Configure system-wide settings
- ✅ Manage customer tiers and capabilities
- ✅ Assign/modify staff roles and permissions
- ✅ View all audit logs and security events
- ✅ Access billing and payment data
- ✅ Override any system restriction

**Example Account**: `admin@harborlist.local`

---

### 2. **ADMIN** (Level 3)
**Administrative access without full system control**

**Use Case**: Department heads, operations managers

**Permissions**:
- `USER_MANAGEMENT` - Manage customer accounts
- `CONTENT_MODERATION` - Review and moderate listings
- `SYSTEM_CONFIG` - Configure platform settings
- `ANALYTICS_VIEW` - View platform analytics
- `AUDIT_LOG_VIEW` - View audit logs
- `TIER_MANAGEMENT` - Manage customer tiers
- `BILLING_MANAGEMENT` - Access billing information

**Cannot Do**:
- ❌ Modify other admin/super_admin accounts
- ❌ Access sensitive financial calculations
- ❌ Change critical system configuration
- ❌ Assign SUPER_ADMIN role to others

---

### 3. **MANAGER** (Level 2)
**Team management and operational oversight**

**Use Case**: Team leads, content moderation supervisors

**Permissions**:
- `USER_MANAGEMENT` - Manage customer accounts
- `CONTENT_MODERATION` - Review and moderate listings
- `ANALYTICS_VIEW` - View platform analytics
- `AUDIT_LOG_VIEW` - View audit logs
- `SALES_MANAGEMENT` - Manage sales operations

**Cannot Do**:
- ❌ Configure system settings
- ❌ Manage customer tiers
- ❌ Access billing information
- ❌ Modify admin accounts

---

### 4. **TEAM_MEMBER** (Level 1 - Lowest)
**Basic operational access**

**Use Case**: Content moderators, support agents

**Permissions**:
- `CONTENT_MODERATION` - Review and moderate listings
- `ANALYTICS_VIEW` - View basic analytics

**Cannot Do**:
- ❌ Manage users
- ❌ Configure system
- ❌ View audit logs
- ❌ Access billing or financial data
- ❌ Manage sales operations

---

## Permission Definitions

### Core Permissions

| Permission | Description | Used For |
|------------|-------------|----------|
| `USER_MANAGEMENT` | Create, read, update, delete user accounts | Customer account management |
| `CONTENT_MODERATION` | Review, approve, reject listings | Listing moderation workflow |
| `FINANCIAL_ACCESS` | Access sensitive financial data | Payment processing, revenue reports |
| `SYSTEM_CONFIG` | Modify platform configuration | Settings, feature flags, integrations |
| `ANALYTICS_VIEW` | View platform metrics and reports | Business intelligence, dashboards |
| `AUDIT_LOG_VIEW` | View security and audit logs | Security monitoring, compliance |
| `TIER_MANAGEMENT` | Manage customer tier assignments | Upgrade/downgrade customer accounts |
| `CAPABILITY_ASSIGNMENT` | Assign special capabilities to users | Feature access control |
| `BILLING_MANAGEMENT` | Access billing and payment info | Invoices, subscriptions, refunds |
| `SALES_MANAGEMENT` | Manage sales operations | Sales rep assignments, commissions |
| `PLATFORM_SETTINGS` | Modify global platform settings | Maintenance mode, feature rollout |
| `SUPPORT_ACCESS` | Access support tools and tickets | Customer support operations |

---

## Implementation Details

### Code Location
```
backend/src/
├── shared/
│   └── auth.ts                    # Core auth functions (getUserFromEvent, requireAdminRole)
├── auth-service/
│   ├── interfaces.ts              # StaffRole enum, AdminPermission enum, STAFF_PERMISSIONS
│   └── authorization-middleware.ts # Role hierarchy validation
├── types/
│   └── common.ts                  # UserRole enum (legacy), AdminPermission enum
└── listing/
    └── index.ts                   # Example usage for moderation access
```

### Role Checking Pattern

```typescript
// 1. Extract user from JWT token
const userPayload = await getUserFromEvent(event);

// 2. Define admin roles that have access
const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'SUPPORT'];

// 3. Check if user has admin role
const isAdmin = userPayload.role ? adminRoles.includes(userPayload.role) : false;

// 4. Grant/deny access based on role
if (!isAdmin && !isOwner) {
  return createErrorResponse(404, 'NOT_FOUND', 'Resource not found');
}
```

### Permission Checking Pattern

```typescript
// Import from auth.ts
import { getUserFromEvent, requireAdminRole } from '../shared/auth';
import { AdminPermission } from '../types/common';

// In Lambda handler
const userPayload = await getUserFromEvent(event);

// Require specific permissions
requireAdminRole(userPayload, [AdminPermission.USER_MANAGEMENT]);

// This throws error if:
// - User doesn't have admin role
// - User doesn't have required permissions
```

### Role Hierarchy Enforcement

```typescript
const roleHierarchy = {
  [StaffRole.SUPER_ADMIN]: 4,
  [StaffRole.ADMIN]: 3,
  [StaffRole.MANAGER]: 2,
  [StaffRole.TEAM_MEMBER]: 1
};

// Check if user's role level meets requirement
const userRoleLevel = roleHierarchy[userRole] || 0;
const requiredRoleLevel = roleHierarchy[requiredRole] || 999;

if (userRoleLevel < requiredRoleLevel) {
  throw new Error('Insufficient role level');
}
```

---

## Usage Examples

### Example 1: Content Moderation Access
Any staff member with `CONTENT_MODERATION` permission can view pending listings:

```typescript
// All these roles can moderate:
// - SUPER_ADMIN (has all permissions)
// - ADMIN (explicitly has CONTENT_MODERATION)
// - MANAGER (explicitly has CONTENT_MODERATION)
// - TEAM_MEMBER (explicitly has CONTENT_MODERATION)

if (isPending) {
  const userPayload = await getUserFromEvent(event);
  const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'SUPPORT'];
  const isAdmin = userPayload.role ? adminRoles.includes(userPayload.role) : false;
  
  if (!isAdmin && currentUserId !== listing.ownerId) {
    return 404; // Not found
  }
}
```

### Example 2: User Management
Only SUPER_ADMIN, ADMIN, and MANAGER can manage users:

```typescript
const userPayload = await getUserFromEvent(event);
requireAdminRole(userPayload, [AdminPermission.USER_MANAGEMENT]);

// TEAM_MEMBER will get: "Insufficient permissions" error
// SUPER_ADMIN, ADMIN, MANAGER will proceed
```

### Example 3: Financial Access
Only SUPER_ADMIN can access financial data:

```typescript
const userPayload = await getUserFromEvent(event);
requireAdminRole(userPayload, [AdminPermission.FINANCIAL_ACCESS]);

// Only SUPER_ADMIN has this permission
// All other roles get: "Insufficient permissions" error
```

---

## Permission Mapping

### StaffRole → AdminPermission Mapping

```typescript
export const STAFF_PERMISSIONS = {
  [StaffRole.SUPER_ADMIN]: [
    // ALL 12 permissions
  ],
  
  [StaffRole.ADMIN]: [
    'USER_MANAGEMENT',
    'CONTENT_MODERATION',
    'SYSTEM_CONFIG',
    'ANALYTICS_VIEW',
    'AUDIT_LOG_VIEW',
    'TIER_MANAGEMENT',
    'BILLING_MANAGEMENT'
  ],
  
  [StaffRole.MANAGER]: [
    'USER_MANAGEMENT',
    'CONTENT_MODERATION',
    'ANALYTICS_VIEW',
    'AUDIT_LOG_VIEW',
    'SALES_MANAGEMENT'
  ],
  
  [StaffRole.TEAM_MEMBER]: [
    'CONTENT_MODERATION',
    'ANALYTICS_VIEW'
  ]
};
```

---

## Cognito Integration

### Staff User Pool Configuration

**Groups in Cognito:**
- `super-admins` → Maps to `StaffRole.SUPER_ADMIN`
- `admins` → Maps to `StaffRole.ADMIN`
- `managers` → Maps to `StaffRole.MANAGER`
- `team-members` → Maps to `StaffRole.TEAM_MEMBER`

**Custom Attributes:**
- `custom:permissions` - JSON string of AdminPermission[]
- `custom:team` - Team/department assignment
- `custom:role` - StaffRole value

**JWT Claims:**
```json
{
  "sub": "user-id",
  "email": "admin@harborlist.local",
  "cognito:groups": ["super-admins"],
  "custom:permissions": "[\"user_management\",\"content_moderation\",...]",
  "custom:team": "operations",
  "role": "super-admin"
}
```

---

## Security Considerations

### 1. **Principle of Least Privilege**
- Staff members receive minimum permissions needed for their role
- TEAM_MEMBER has most restrictive access
- SUPER_ADMIN should be assigned sparingly

### 2. **Token-Based Authorization**
- Every request validates JWT token
- Tokens expire based on role (staff tokens: 8 hours)
- Refresh tokens used for session extension

### 3. **Audit Logging**
- All admin actions logged with:
  - Staff member email
  - Action performed
  - Timestamp
  - IP address
  - Resource affected

### 4. **Role Hierarchy**
- Higher roles inherit lower role permissions
- Cannot escalate own privileges
- SUPER_ADMIN required to modify other admins

### 5. **IP Whitelisting** (Optional)
- AdminUser interface supports `ipWhitelist` array
- Can restrict access to specific IP ranges

---

## Creating Staff Members

### Via Admin API (POST /api/admin/users/staff)

**Required Permissions**: `USER_MANAGEMENT` (SUPER_ADMIN, ADMIN, or MANAGER)

**Request Body:**
```json
{
  "email": "moderator@harborlist.local",
  "name": "John Moderator",
  "role": "team-member",
  "team": "content-moderation",
  "temporaryPassword": "TempPass123!",
  "requireMFA": false
}
```

**Process:**
1. Validates requesting user has `USER_MANAGEMENT` permission
2. Creates user in Staff User Pool
3. Assigns role group in Cognito
4. Sets custom attributes (permissions, team)
5. Sends temporary password to user's email
6. User must change password on first login

---

## Testing Staff Access

### Test Accounts

| Email | Password | Role | Use For |
|-------|----------|------|---------|
| `admin@harborlist.local` | `4PXu?193Aij#Zhh:` | SUPER_ADMIN | Full platform testing |
| (Create additional) | (Generated) | ADMIN | Testing admin workflows |
| (Create additional) | (Generated) | MANAGER | Testing manager workflows |
| (Create additional) | (Generated) | TEAM_MEMBER | Testing moderation workflows |

### Login Endpoint
```bash
curl -X POST https://local-api.harborlist.com/api/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@harborlist.local",
    "password": "4PXu?193Aij#Zhh:"
  }'
```

**Response:**
```json
{
  "success": true,
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "idToken": "eyJhbGc...",
    "expiresIn": 28800
  },
  "staff": {
    "id": "...",
    "email": "admin@harborlist.local",
    "name": "Super Admin",
    "role": "super-admin",
    "permissions": ["user_management", "content_moderation", ...]
  }
}
```

---

## Common Use Cases

### 1. **Content Moderation Workflow**
- **Who**: TEAM_MEMBER, MANAGER, ADMIN, SUPER_ADMIN
- **Permission**: `CONTENT_MODERATION`
- **Actions**:
  - View pending listings
  - Approve listings (make public)
  - Reject listings (with reason)
  - Request changes from owner

### 2. **User Management**
- **Who**: MANAGER, ADMIN, SUPER_ADMIN
- **Permission**: `USER_MANAGEMENT`
- **Actions**:
  - View customer accounts
  - Suspend/ban users
  - Reset passwords
  - Modify user tiers

### 3. **System Configuration**
- **Who**: ADMIN, SUPER_ADMIN
- **Permission**: `SYSTEM_CONFIG`
- **Actions**:
  - Enable/disable features
  - Configure integrations
  - Update platform settings

### 4. **Financial Operations**
- **Who**: SUPER_ADMIN only
- **Permission**: `FINANCIAL_ACCESS`
- **Actions**:
  - View revenue reports
  - Process refunds
  - Access payment details
  - Export financial data

---

## Migration & Compatibility

### Legacy UserRole Enum
The system maintains backward compatibility with the legacy `UserRole` enum in `common.ts`:

```typescript
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',  // Maps to StaffRole.SUPER_ADMIN
  MODERATOR = 'moderator',       // Maps to StaffRole.TEAM_MEMBER with moderation
  SUPPORT = 'support'            // Maps to StaffRole.TEAM_MEMBER with support access
}
```

**Note**: New code should use `StaffRole` from `auth-service/interfaces.ts` for staff members.

---

## Future Enhancements

1. **Custom Permission Sets**: Allow creating custom permission bundles
2. **Temporary Permission Elevation**: Grant temporary higher permissions for specific tasks
3. **Department-Based Access**: Restrict access based on department assignment
4. **Time-Based Restrictions**: Allow access only during business hours
5. **Multi-Team Assignment**: Staff can belong to multiple teams
6. **Permission History**: Track permission changes over time
7. **Automated Role Assignment**: Based on onboarding workflow

---

## Related Documentation

- `docs/LISTING_MODERATION_WORKFLOW.md` - Content moderation process
- `docs/ADMIN_ACCESS_FIX.md` - Recent admin access implementation
- `backend/src/auth-service/README.md` - Authentication service details
- `backend/src/shared/auth.ts` - Core authentication functions

---

## Summary

HarborList's staff roles and permissions system provides:

✅ **4-Tier Hierarchical Roles**: SUPER_ADMIN → ADMIN → MANAGER → TEAM_MEMBER  
✅ **12 Granular Permissions**: Fine-grained access control  
✅ **Dual Auth Pools**: Separate customer and staff authentication  
✅ **JWT-Based Authorization**: Token validation on every request  
✅ **Role Hierarchy**: Higher roles inherit lower permissions  
✅ **Audit Logging**: Complete tracking of admin actions  
✅ **Cognito Integration**: Groups, custom attributes, secure token management  

This ensures platform security while enabling efficient team collaboration and operations management.
