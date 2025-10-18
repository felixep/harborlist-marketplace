# Team-Based Staff Roles - Management Guide

## Overview

The Team-Based Staff Roles system provides a flexible, permission-based approach to managing staff members across different organizational functions. Staff members can belong to multiple teams, with each team granting specific permissions based on their role (Manager or Member).

## Key Concepts

### Teams

The system includes 8 predefined teams:

1. **Sales Team** (`sales`)
   - Manages dealer relationships and sales operations
   - Base Permissions: dealer accounts, analytics view, listing approval
   - Manager Permissions: + dealer management, bulk operations

2. **Customer Support Team** (`customer-support`)
   - Handles user support and issue resolution
   - Base Permissions: ticket management, user support, basic analytics
   - Manager Permissions: + ticket escalation, support reports, team reports

3. **Content Moderation Team** (`content-moderation`)
   - Reviews and moderates user-generated content
   - Base Permissions: listing moderation, content review, moderation dashboard
   - Manager Permissions: + moderation policy management, moderator management, advanced moderation tools

4. **Technical Operations Team** (`technical-operations`)
   - Manages infrastructure and technical operations
   - Base Permissions: system monitoring, basic operations, analytics view
   - Manager Permissions: + system configuration, deployment management, infrastructure management

5. **Marketing Team** (`marketing`)
   - Handles marketing campaigns and content
   - Base Permissions: content management, campaign view, analytics view
   - Manager Permissions: + campaign management, marketing analytics, budget management

6. **Finance Team** (`finance`)
   - Manages billing, payments, and financial operations
   - Base Permissions: billing view, payment processing, financial reports (read-only)
   - Manager Permissions: + financial management, invoice management, payment configuration

7. **Product Team** (`product`)
   - Handles product strategy and feature management
   - Base Permissions: analytics view, feature flags (read), user feedback
   - Manager Permissions: + product management, feature management, roadmap planning

8. **Executive Team** (`executive`)
   - Senior leadership with comprehensive access
   - Base Permissions: Full analytics, all reports, strategic dashboard
   - Manager Permissions: + executive reports, strategic planning, policy management

### Team Roles

Each team member has one of two roles:

- **Member**: Base permissions for the team
- **Manager**: Base permissions + additional manager-specific permissions

### Permission Model

Staff members' effective permissions are calculated as:

```
effectivePermissions = basePermissions ∪ teamPermissions₁ ∪ teamPermissions₂ ∪ ... ∪ teamPermissionsₙ
```

Where:
- `basePermissions`: Permissions assigned directly to the user
- `teamPermissions`: Permissions from each team the user belongs to
- The union (∪) ensures no duplicate permissions

## Staff Creation with Teams

### Basic Staff Creation (No Teams)

```bash
POST /api/admin/users/staff
{
  "email": "staff@example.com",
  "name": "John Doe",
  "role": "admin",
  "password": "SecurePassword123!",
  "permissions": ["analytics_view"]
}
```

**Result**:
- User created with only base permissions
- Empty teams array
- effectivePermissions = ["analytics_view"]

### Staff Creation with Team Assignments

```bash
POST /api/admin/users/staff
{
  "email": "sales.manager@example.com",
  "name": "Sarah Johnson",
  "role": "admin",
  "password": "SecurePassword123!",
  "permissions": ["user_management"],
  "teams": [
    { "teamId": "sales", "role": "manager" },
    { "teamId": "marketing", "role": "member" }
  ]
}
```

**Result**:
- User created with base permissions + team permissions
- Teams array populated with assignments
- effectivePermissions includes:
  - Base: `user_management`
  - Sales Manager: `dealer_accounts`, `analytics_view`, `listing_approval`, `dealer_management`, `bulk_operations`
  - Marketing Member: `content_management`, `campaign_view`
- All duplicates removed automatically

### Staff Creation - Best Practices

1. **Assign Relevant Teams During Creation**: It's more efficient to assign teams during staff creation than adding them later

2. **Use Minimal Base Permissions**: Let teams provide most permissions. Only add base permissions for unique requirements

3. **Manager Assignments**: Carefully consider manager role assignments as they grant elevated permissions

4. **Validation**: The system automatically validates:
   - Team IDs must match predefined teams
   - Roles must be "manager" or "member"
   - Invalid values result in 400 error

## Team Management Operations

### 1. List All Teams

Get an overview of all teams:

```bash
GET /api/admin/teams
```

**Use Case**: Dashboard view, team selection interfaces

### 2. Get Team Details

View detailed information about a specific team:

```bash
GET /api/admin/teams/{teamId}
```

**Use Case**: Team management pages, permission review

### 3. Get Team Members

List all members of a team:

```bash
GET /api/admin/teams/{teamId}/members
```

**Returns**:
- List of all team members
- Each member's role (manager/member)
- Assignment timestamps
- Total member count

### 4. Assign User to Team

Add an existing staff member to a team:

```bash
POST /api/admin/teams/{teamId}/members
{
  "userId": "user-123",
  "role": "member"
}
```

**What Happens**:
1. User's team assignment is added
2. Effective permissions are recalculated
3. New permissions are returned
4. Assignment is audited

**Use Case**: Adding staff to new responsibilities

### 5. Update Team Role

Change a user's role within a team:

```bash
PUT /api/admin/teams/{teamId}/members/{userId}/role
{
  "role": "manager"
}
```

**What Happens**:
1. User's role is updated (e.g., member → manager)
2. Additional manager permissions are granted
3. Permission delta is calculated
4. Change is audited

**Use Case**: Promotions, responsibility changes

### 6. Remove from Team

Remove a user from a team:

```bash
DELETE /api/admin/teams/{teamId}/members/{userId}
```

**What Happens**:
1. Team assignment is removed
2. Team-specific permissions are revoked
3. Other team permissions remain intact
4. Effective permissions recalculated

**Use Case**: Role changes, team restructuring

### 7. Get User's Team Information

View all teams and permissions for a specific user:

```bash
GET /api/admin/teams/users/{userId}
```

**Returns**:
- All team assignments
- Role in each team
- Permissions from each team
- Base permissions
- Effective permissions (deduplicated)
- Summary counts

**Use Case**: User profile, permission audits

### 8. Bulk Assign Users

Add multiple users to a team at once:

```bash
POST /api/admin/teams/{teamId}/members/bulk
{
  "userIds": ["user-1", "user-2", "user-3"],
  "role": "member"
}
```

**What Happens**:
1. Each user is assigned to the team
2. Permissions calculated for each
3. Individual success/failure tracked
4. Bulk operation audited

**Use Case**: Team onboarding, reorganizations

### 9. List Unassigned Staff

Find staff members not assigned to any team:

```bash
GET /api/admin/teams/unassigned
```

**Use Case**: Identifying staff needing team assignments

### 10. Get Team Statistics

Overview of all teams and membership:

```bash
GET /api/admin/teams/stats
```

**Returns**:
- Total teams, staff, assignments
- Members per team
- Managers per team
- Teams without members
- Average team size

**Use Case**: Admin dashboards, reporting

### 11. Recalculate User Permissions

Force recalculation of a user's effective permissions:

```bash
POST /api/admin/teams/users/{userId}/permissions/recalculate
```

**When to Use**:
- After manual database changes
- Debugging permission issues
- Verifying permission calculations

### 12. Recalculate All Staff Permissions

Bulk recalculate permissions for all staff:

```bash
POST /api/admin/teams/permissions/recalculate-all
```

**When to Use**:
- After team definition updates
- System maintenance
- Data migrations
- Fixing bulk permission issues

## Permission Calculation Details

### How It Works

1. **Base Permissions**: Assigned directly to the user record
   ```typescript
   permissions: ["user_management", "analytics_view"]
   ```

2. **Team Permissions**: Derived from team assignments
   ```typescript
   teams: [
     { teamId: "sales", role: "manager" },
     { teamId: "marketing", role: "member" }
   ]
   ```

3. **Calculation**: Union of all permission sets
   ```typescript
   effectivePermissions = [
     ...basePermissions,
     ...salesManagerPermissions,
     ...marketingMemberPermissions
   ].filter(unique)
   ```

### Permission Precedence

- No permission "overrides" another
- All permissions are additive
- Duplicates are automatically removed
- Manager role grants additional permissions, doesn't replace member permissions

### Example Calculation

**User Profile**:
- Base Permissions: `["user_management"]`
- Sales Manager: `["dealer_accounts", "analytics_view", "listing_approval", "dealer_management", "bulk_operations"]`
- Marketing Member: `["content_management", "campaign_view", "analytics_view"]`

**Effective Permissions** (deduplicated):
```
[
  "user_management",
  "dealer_accounts",
  "analytics_view",        // Only appears once
  "listing_approval",
  "dealer_management",
  "bulk_operations",
  "content_management",
  "campaign_view"
]
```

**Permission Count**: 8 unique permissions

## Authorization Middleware

### Available Middleware Functions

The system provides several middleware functions for protecting routes:

#### 1. requireTeamAccess(teamId)

Ensures user belongs to a specific team:

```typescript
router.get('/sales/reports', 
  authenticateJWT,
  requireTeamAccess(TeamId.SALES),
  getSalesReports
);
```

**Allows**: Any member or manager of the team

#### 2. requireAnyPermission(permissions[])

User must have at least ONE of the specified permissions:

```typescript
router.get('/analytics', 
  authenticateJWT,
  requireAnyPermission([
    AdminPermission.ANALYTICS_VIEW,
    AdminPermission.FULL_ANALYTICS
  ]),
  getAnalytics
);
```

**Logic**: OR - Any matching permission grants access

#### 3. requireAllPermissions(permissions[])

User must have ALL specified permissions:

```typescript
router.post('/users/bulk-delete', 
  authenticateJWT,
  requireAllPermissions([
    AdminPermission.USER_MANAGEMENT,
    AdminPermission.BULK_OPERATIONS
  ]),
  bulkDeleteUsers
);
```

**Logic**: AND - Must have every permission

#### 4. requireTeamManager(teamId)

User must be a manager of the specific team:

```typescript
router.put('/sales/config', 
  authenticateJWT,
  requireTeamManager(TeamId.SALES),
  updateSalesConfig
);
```

**Allows**: Only managers of the team

### Helper Functions

#### userHasPermission(userId, permission)

Check if a user has a specific permission:

```typescript
const canManageDealers = await userHasPermission(
  userId,
  AdminPermission.DEALER_MANAGEMENT
);
```

#### getUserTeams(userId)

Get all teams a user belongs to:

```typescript
const teams = await getUserTeams(userId);
// Returns: TeamAssignment[]
```

#### getUserEffectivePermissions(userId)

Get user's calculated effective permissions:

```typescript
const permissions = await getUserEffectivePermissions(userId);
// Returns: string[]
```

## Common Workflows

### Workflow 1: Onboard New Sales Manager

```bash
# 1. Create staff member with sales manager role
POST /api/admin/users/staff
{
  "email": "sales.lead@example.com",
  "name": "Alice Cooper",
  "role": "admin",
  "password": "SecurePass123!",
  "permissions": ["user_management"],
  "teams": [
    { "teamId": "sales", "role": "manager" }
  ]
}

# Result: User has sales management permissions immediately
```

### Workflow 2: Promote Member to Manager

```bash
# 1. Update role in existing team
PUT /api/admin/teams/sales/members/{userId}/role
{
  "role": "manager"
}

# Result: Additional manager permissions granted automatically
```

### Workflow 3: Cross-Functional Team Member

```bash
# 1. Create user with base permissions
POST /api/admin/users/staff
{
  "email": "crossfunctional@example.com",
  "name": "Bob Smith",
  "role": "admin",
  "password": "SecurePass123!",
  "teams": [
    { "teamId": "sales", "role": "member" },
    { "teamId": "marketing", "role": "member" },
    { "teamId": "customer-support", "role": "member" }
  ]
}

# Result: User can access sales, marketing, and support functions
```

### Workflow 4: Temporary Team Assignment

```bash
# 1. Assign to team for temporary project
POST /api/admin/teams/product/members
{
  "userId": "user-123",
  "role": "member"
}

# ... user works on project ...

# 2. Remove from team when project ends
DELETE /api/admin/teams/product/members/user-123

# Result: Project permissions granted and revoked cleanly
```

### Workflow 5: Permission Audit

```bash
# 1. Get user's complete team and permission info
GET /api/admin/teams/users/{userId}

# 2. Review effective permissions
# 3. Verify against expected permissions
# 4. If discrepancy found, recalculate:
POST /api/admin/teams/users/{userId}/permissions/recalculate
```

## Best Practices

### Team Assignment Strategy

1. **Single Responsibility**: Most staff should belong to 1-2 teams maximum
2. **Clear Ownership**: Each team should have designated managers
3. **Regular Audits**: Review team memberships quarterly
4. **Minimal Base Permissions**: Let teams provide most permissions

### Permission Management

1. **Use Teams Over Direct Permissions**: Assign users to teams rather than granting individual permissions
2. **Manager Role Carefully**: Manager role grants elevated permissions - use judiciously
3. **Regular Recalculation**: Run bulk recalculation after system updates
4. **Audit Trail**: All team changes are logged for compliance

### Security Considerations

1. **Least Privilege**: Users should only belong to teams they actively need
2. **Manager Oversight**: Team managers should review their team's membership regularly
3. **Separation of Duties**: Avoid assigning conflicting team roles (e.g., finance + operations)
4. **Executive Access**: Executive team membership should be highly restricted

## Troubleshooting

### User Missing Expected Permissions

1. Check user's team assignments:
   ```bash
   GET /api/admin/teams/users/{userId}
   ```

2. Verify team definitions include expected permissions:
   ```bash
   GET /api/admin/teams/{teamId}
   ```

3. Recalculate user permissions:
   ```bash
   POST /api/admin/teams/users/{userId}/permissions/recalculate
   ```

### Duplicate Permissions

- Duplicates are automatically removed during calculation
- If seeing duplicates in effectivePermissions, run recalculation
- Check for data corruption if issue persists

### Permission Not Taking Effect

1. Verify user is assigned to correct team:
   ```bash
   GET /api/admin/teams/users/{userId}
   ```

2. Check user's role in team (member vs manager):
   - Manager permissions require "manager" role

3. Force recalculation:
   ```bash
   POST /api/admin/teams/users/{userId}/permissions/recalculate
   ```

4. Check middleware protecting the route requires correct permissions

### Team Assignment Failed

Common causes:
- Invalid team ID (check spelling, use TeamId enum)
- Invalid role (must be "member" or "manager")
- User already in team (check existing assignments)
- Database connection issues

## API Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/teams` | GET | List all teams |
| `/api/admin/teams/{teamId}` | GET | Get team details |
| `/api/admin/teams/{teamId}/members` | GET | List team members |
| `/api/admin/teams/{teamId}/members` | POST | Assign user to team |
| `/api/admin/teams/{teamId}/members/{userId}/role` | PUT | Update user's role |
| `/api/admin/teams/{teamId}/members/{userId}` | DELETE | Remove from team |
| `/api/admin/teams/users/{userId}` | GET | Get user's teams |
| `/api/admin/teams/{teamId}/members/bulk` | POST | Bulk assign users |
| `/api/admin/teams/unassigned` | GET | List unassigned staff |
| `/api/admin/teams/stats` | GET | Get team statistics |
| `/api/admin/teams/users/{userId}/permissions/recalculate` | POST | Recalculate user permissions |
| `/api/admin/teams/permissions/recalculate-all` | POST | Recalculate all permissions |
| `/api/admin/users/staff` | POST | Create staff (with optional teams) |

## Team Definitions Reference

### Sales Team
**ID**: `sales`  
**Manager Permissions**: dealer_management, bulk_operations  
**Member Permissions**: dealer_accounts, analytics_view, listing_approval

### Customer Support Team
**ID**: `customer-support`  
**Manager Permissions**: ticket_escalation, support_reports, team_reports  
**Member Permissions**: ticket_management, user_support, analytics_view

### Content Moderation Team
**ID**: `content-moderation`  
**Manager Permissions**: moderation_policy, moderator_management, advanced_moderation  
**Member Permissions**: listing_moderation, content_review, moderation_dashboard

### Technical Operations Team
**ID**: `technical-operations`  
**Manager Permissions**: system_configuration, deployment_management, infrastructure_management  
**Member Permissions**: system_monitoring, basic_operations, analytics_view

### Marketing Team
**ID**: `marketing`  
**Manager Permissions**: campaign_management, marketing_analytics, budget_management  
**Member Permissions**: content_management, campaign_view, analytics_view

### Finance Team
**ID**: `finance`  
**Manager Permissions**: financial_management, invoice_management, payment_configuration  
**Member Permissions**: billing_view, payment_processing, financial_reports

### Product Team
**ID**: `product`  
**Manager Permissions**: product_management, feature_management, roadmap_planning  
**Member Permissions**: analytics_view, feature_flags, user_feedback

### Executive Team
**ID**: `executive`  
**Manager Permissions**: executive_reports, strategic_planning, policy_management  
**Member Permissions**: full_analytics, all_reports, strategic_dashboard

## Next Steps

1. Review team definitions and adjust permissions as needed
2. Create initial team assignments for existing staff
3. Implement UI for team management
4. Set up monitoring for team-based access patterns
5. Create dashboards showing team utilization
6. Document team-specific workflows
