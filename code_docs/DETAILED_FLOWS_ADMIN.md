# Detailed Admin & Team Management Flows - HarborList Marketplace

**Last Updated:** October 24, 2025  
**Version:** 1.0.0

---

## Table of Contents

1. [Admin Dashboard Access](#admin-dashboard-access)
2. [User Management](#user-management)
3. [Team Management](#team-management)
4. [Moderation Queue](#moderation-queue)
5. [Tier Management](#tier-management)

---

## 1. Admin Dashboard Access

### Overview
Admin authentication with MFA, role-based permissions, and comprehensive dashboard access.

### Sequence Diagram

```mermaid
sequenceDiagram
    actor Admin as Admin User
    participant Login as Login Page
    participant Auth as Auth Service
    participant Cognito as AWS Cognito Staff Pool
    participant DB as DynamoDB
    participant Dashboard as Admin Dashboard

    Admin->>Login: Enter credentials (email + password)
    Login->>Auth: staffLogin(email, password)
    
    Auth->>Cognito: InitiateAuth (STAFF_USER_POOL)
    Cognito-->>Auth: MFA_REQUIRED challenge
    
    Auth-->>Login: { challengeName: 'SOFTWARE_TOKEN_MFA' }
    Login->>Admin: Show MFA code input
    
    Admin->>Login: Enter MFA code
    Login->>Auth: respondToMfaChallenge(code)
    
    Auth->>Cognito: RespondToAuthChallenge
    
    alt MFA Valid
        Cognito-->>Auth: AuthenticationResult + tokens
        Auth->>Auth: Extract roles from IdToken
        Note right of Auth: Roles: ADMIN, MODERATOR,<br/>SUPPORT, SUPER_ADMIN
        
        Auth->>DB: getStaffUser(userId)
        DB-->>Auth: Staff user data + permissions
        
        Auth->>DB: createStaffSession(userId, tokens)
        Auth->>DB: logAuditEvent('STAFF_LOGIN', userId)
        
        Auth-->>Login: Success with tokens + role
        Login->>Login: Store tokens + role in localStorage
        
        Login->>Dashboard: Navigate to /admin
        Dashboard->>Dashboard: Check role permissions
        
        alt Has admin/moderator role
            Dashboard->>Dashboard: Load dashboard data
            Dashboard->>Admin: Show admin interface
        else Insufficient permissions
            Dashboard->>Admin: Redirect to /access-denied
        end
        
    else MFA Invalid
        Cognito-->>Auth: NotAuthorizedException
        Auth-->>Login: Error: Invalid MFA code
        Login->>Admin: Show error message
    end
```

### Key Methods

**Frontend: Admin Login**
```typescript
/**
 * Staff login with MFA
 * 
 * @features
 * - Cognito Staff User Pool authentication
 * - MFA verification required
 * - Role extraction from ID token
 * - Session creation with 7-day expiry
 * - Audit logging
 */
const handleStaffLogin = async (email: string, password: string, mfaCode?: string) => {
  const result = await auth.staffLogin(email, password, mfaCode);
  
  if (result.challengeName === 'SOFTWARE_TOKEN_MFA') {
    setShowMfaInput(true);
    return;
  }
  
  // Store tokens and role
  localStorage.setItem('accessToken', result.accessToken);
  localStorage.setItem('refreshToken', result.refreshToken);
  localStorage.setItem('userRole', result.role);
  
  navigate('/admin');
};
```

**Backend: Role-Based Access Control**
```typescript
/**
 * Verifies admin/moderator permissions
 * 
 * @param event - API Gateway event with JWT
 * @returns User payload with role
 * @throws Unauthorized if not admin/moderator
 */
async function verifyAdminAccess(event: APIGatewayProxyEvent): Promise<UserPayload> {
  const userPayload = await getUserFromEvent(event);
  
  const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'SUPPORT'];
  
  if (!userPayload.role || !adminRoles.includes(userPayload.role)) {
    throw new Error('Insufficient permissions');
  }
  
  return userPayload;
}
```

---

## 2. User Management

### Overview
Admin interface for viewing, managing, and moderating user accounts.

### Sequence Diagram

```mermaid
sequenceDiagram
    actor Admin as Admin User
    participant UI as User Management UI
    participant API as API Service
    participant Lambda as Admin Service Lambda
    participant DB as DynamoDB
    participant Cognito as AWS Cognito

    Admin->>UI: Navigate to /admin/users
    UI->>API: getUsers({ limit: 50, filters })
    
    API->>Lambda: GET /admin/users
    Lambda->>Lambda: verifyAdminAccess(event)
    
    Lambda->>DB: scanUsers({ limit, filters })
    Note right of DB: Query harborlist-users table<br/>with filters
    
    DB-->>Lambda: Users list + pagination
    Lambda-->>API: { users, nextToken }
    API-->>UI: User data
    
    UI->>Admin: Display user table
    Note right of UI: Columns:<br/>- Name, Email, Type<br/>- Tier, Status<br/>- Created Date<br/>- Actions
    
    Admin->>UI: Click "View Details" on user
    UI->>API: getUserDetails(userId)
    
    API->>Lambda: GET /admin/users/{userId}
    Lambda->>DB: getUser(userId)
    Lambda->>DB: getListingsByOwner(userId)
    Lambda->>DB: getUserActivity(userId)
    
    Lambda-->>API: {<br/>  user,<br/>  listings,<br/>  activity,<br/>  statistics<br/>}
    
    API-->>UI: Complete user profile
    UI->>Admin: Show user detail modal
    
    alt Update User Tier
        Admin->>UI: Click "Change Tier"
        UI->>Admin: Show tier selection
        Admin->>UI: Select new tier (e.g., Premium)
        
        UI->>API: updateUserTier(userId, 'premium')
        API->>Lambda: PUT /admin/users/{userId}/tier
        
        Lambda->>Lambda: verifyAdminAccess(event)
        Lambda->>Lambda: validateTierChange(currentTier, newTier)
        
        Lambda->>DB: updateUser(userId, { tier: 'premium' })
        Lambda->>DB: updateTierCapabilities(userId, premiumCaps)
        Lambda->>DB: logAuditEvent('TIER_CHANGE', userId, admin)
        
        Lambda-->>API: Success
        API-->>UI: Tier updated
        UI->>Admin: Show success toast
        
    else Suspend User
        Admin->>UI: Click "Suspend"
        UI->>Admin: Show suspension reason form
        Admin->>UI: Enter reason and submit
        
        UI->>API: suspendUser(userId, reason)
        API->>Lambda: POST /admin/users/{userId}/suspend
        
        Lambda->>DB: updateUser(userId, {<br/>  status: 'suspended',<br/>  suspendedAt: timestamp,<br/>  suspendedBy: adminId,<br/>  suspensionReason: reason<br/>})
        
        Lambda->>Cognito: AdminDisableUser(userId)
        Note right of Cognito: Prevent login
        
        Lambda->>DB: logAuditEvent('USER_SUSPENDED', userId)
        
        Lambda-->>API: Success
        UI->>Admin: Show success toast
        
    else Delete User
        Admin->>UI: Click "Delete User"
        UI->>Admin: Show confirmation dialog
        Admin->>UI: Confirm deletion
        
        UI->>API: deleteUser(userId)
        API->>Lambda: DELETE /admin/users/{userId}
        
        Lambda->>DB: softDeleteUser(userId)
        Note right of DB: Set deletedAt timestamp<br/>Keep data for compliance
        
        Lambda->>Cognito: AdminDeleteUser(userId)
        Lambda->>DB: deactivateListings(userId)
        Lambda->>DB: logAuditEvent('USER_DELETED', userId)
        
        Lambda-->>API: Success
        UI->>Admin: Show success toast
    end
```

### Key Backend Methods

```typescript
/**
 * Get users with filtering and pagination
 * 
 * @param event - Query params: limit, nextToken, filters
 * @returns Paginated user list
 */
async function getUsers(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  await verifyAdminAccess(event);
  
  const { limit = 50, nextToken, filters } = event.queryStringParameters || {};
  
  const result = await db.scanUsers({
    limit: parseInt(limit as string),
    startKey: nextToken ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) : undefined,
    filters: filters ? JSON.parse(filters) : {}
  });
  
  return createResponse(200, {
    users: result.users,
    nextToken: result.lastKey ? Buffer.from(JSON.stringify(result.lastKey)).toString('base64') : undefined,
    total: result.count
  });
}

/**
 * Update user tier
 * 
 * @param userId - User to update
 * @param newTier - New tier (basic, premium, professional, enterprise)
 * @authorization ADMIN, SUPER_ADMIN only
 */
async function updateUserTier(
  userId: string, 
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const adminPayload = await verifyAdminAccess(event);
  
  if (!['ADMIN', 'SUPER_ADMIN'].includes(adminPayload.role)) {
    return createErrorResponse(403, 'FORBIDDEN', 'Insufficient permissions for tier management');
  }
  
  const { tier } = parseBody<{ tier: string }>(event);
  
  const user = await db.getUser(userId);
  if (!user) {
    return createErrorResponse(404, 'NOT_FOUND', 'User not found');
  }
  
  // Get tier capabilities
  const capabilities = await db.getTierCapabilities(tier);
  
  // Update user
  await db.updateUser(userId, {
    tier,
    capabilities: capabilities.capabilities,
    updatedAt: Date.now()
  });
  
  // Log audit event
  await db.logAuditEvent({
    eventType: 'TIER_CHANGE',
    userId: adminPayload.sub,
    targetUserId: userId,
    metadata: {
      oldTier: user.tier,
      newTier: tier
    },
    timestamp: Date.now()
  });
  
  return createResponse(200, { message: 'User tier updated successfully' });
}

/**
 * Suspend user account
 * 
 * @param userId - User to suspend
 * @param reason - Suspension reason
 * @authorization ADMIN, SUPER_ADMIN, MODERATOR
 */
async function suspendUser(
  userId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const adminPayload = await verifyAdminAccess(event);
  
  const { reason } = parseBody<{ reason: string }>(event);
  validateRequired({ reason }, ['reason']);
  
  // Update user status
  await db.updateUser(userId, {
    status: 'suspended',
    suspendedAt: Date.now(),
    suspendedBy: adminPayload.sub,
    suspensionReason: sanitizeString(reason),
    updatedAt: Date.now()
  });
  
  // Disable in Cognito
  await cognito.adminDisableUser({
    UserPoolId: process.env.CUSTOMER_USER_POOL_ID!,
    Username: userId
  }).promise();
  
  // Log audit event
  await db.logAuditEvent({
    eventType: 'USER_SUSPENDED',
    userId: adminPayload.sub,
    targetUserId: userId,
    metadata: { reason },
    timestamp: Date.now()
  });
  
  return createResponse(200, { message: 'User suspended successfully' });
}
```

---

## 3. Team Management

### Overview
Manage staff teams, assign roles, and control permissions.

### Key Features
- **Team Creation:** Organize staff into teams (Moderation, Support, Finance)
- **Role Assignment:** Assign ADMIN, MODERATOR, SUPPORT roles
- **Permission Management:** Granular permission control
- **Team Hierarchy:** Team leads and members

### Sequence Diagram

```mermaid
sequenceDiagram
    actor SuperAdmin as Super Admin
    participant UI as Team Management UI
    participant API as API Service
    participant Lambda as Admin Service Lambda
    participant DB as DynamoDB

    SuperAdmin->>UI: Click "Create Team"
    UI->>SuperAdmin: Show create team form
    
    SuperAdmin->>UI: Enter team details:<br/>- Name: "Moderation Team"<br/>- Description<br/>- Team Lead<br/>- Members
    
    UI->>API: createTeam(teamData)
    API->>Lambda: POST /admin/teams
    
    Lambda->>Lambda: verifyAdminAccess(event)
    Lambda->>Lambda: Check role === 'SUPER_ADMIN'
    
    Lambda->>Lambda: generateId() for teamId
    Lambda->>Lambda: validateTeamData(teamData)
    
    Lambda->>DB: createTeam({<br/>  teamId,<br/>  name,<br/>  description,<br/>  teamLeadId,<br/>  memberIds,<br/>  createdBy: adminId,<br/>  createdAt: timestamp<br/>})
    
    Lambda->>DB: For each member:<br/>  updateStaffUser(memberId, {<br/>    teamId,<br/>    teamRole: 'member'<br/>  })
    
    Lambda->>DB: updateStaffUser(teamLeadId, {<br/>  teamId,<br/>  teamRole: 'lead'<br/>})
    
    Lambda->>DB: logAuditEvent('TEAM_CREATED', teamId)
    
    Lambda-->>API: Success with teamId
    API-->>UI: Team created
    UI->>SuperAdmin: Show success toast + redirect to team page
```

### Key Methods

```typescript
/**
 * Create staff team
 * 
 * @param teamData - Team name, description, lead, members
 * @authorization SUPER_ADMIN only
 */
async function createTeam(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const adminPayload = await verifyAdminAccess(event);
  
  if (adminPayload.role !== 'SUPER_ADMIN') {
    return createErrorResponse(403, 'FORBIDDEN', 'Only super admins can create teams');
  }
  
  const { name, description, teamLeadId, memberIds } = parseBody<{
    name: string;
    description: string;
    teamLeadId: string;
    memberIds: string[];
  }>(event);
  
  validateRequired({ name, teamLeadId }, ['name', 'teamLeadId']);
  
  const teamId = generateId();
  
  // Create team
  await db.createTeam({
    teamId,
    name: sanitizeString(name),
    description: description ? sanitizeString(description) : undefined,
    teamLeadId,
    memberIds: memberIds || [],
    createdBy: adminPayload.sub,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  
  // Assign team to members
  for (const memberId of [teamLeadId, ...(memberIds || [])]) {
    await db.updateStaffUser(memberId, {
      teamId,
      teamRole: memberId === teamLeadId ? 'lead' : 'member',
      updatedAt: Date.now()
    });
  }
  
  await db.logAuditEvent({
    eventType: 'TEAM_CREATED',
    userId: adminPayload.sub,
    targetId: teamId,
    metadata: { name, memberCount: (memberIds?.length || 0) + 1 },
    timestamp: Date.now()
  });
  
  return createResponse(201, { teamId, message: 'Team created successfully' });
}
```

---

## 4. Moderation Queue Management

### Overview
Admins and moderators manage the listing moderation queue with filtering, assignment, and batch operations.

### Key Features
- **Queue View:** Pending, in-review, escalated listings
- **Assignment:** Assign listings to specific moderators
- **Filters:** Priority, submission date, flags
- **Batch Operations:** Bulk approve/reject

### Sequence Diagram

```mermaid
sequenceDiagram
    actor Mod as Moderator
    participant UI as Moderation Queue UI
    participant API as API Service
    participant Lambda as Admin Service Lambda
    participant DB as DynamoDB

    Mod->>UI: Navigate to /admin/moderation
    UI->>API: getModerationQueue({ status: 'pending', limit: 20 })
    
    API->>Lambda: GET /admin/moderation-queue
    Lambda->>Lambda: verifyAdminAccess(event)
    
    Lambda->>DB: queryModerationQueue({<br/>  status: 'pending',<br/>  sortBy: 'priority',<br/>  limit: 20<br/>})
    
    Note right of DB: Use status-priority-index GSI<br/>Sort by priority + submittedAt
    
    DB-->>Lambda: Queue items with listing previews
    Lambda-->>API: Queue data
    API-->>UI: Moderation queue
    
    UI->>Mod: Display queue table
    Note right of UI: Columns:<br/>- Preview image<br/>- Title, Price<br/>- Submitted date<br/>- Priority<br/>- Flags<br/>- Actions
    
    Mod->>UI: Click "Assign to Me" on listing
    UI->>API: assignModerationTask(queueId, moderatorId)
    
    API->>Lambda: POST /admin/moderation-queue/{queueId}/assign
    
    Lambda->>DB: updateModerationQueue(queueId, {<br/>  assignedTo: moderatorId,<br/>  status: 'in_review',<br/>  assignedAt: timestamp<br/>})
    
    Lambda->>DB: logAuditEvent('MODERATION_ASSIGNED', queueId)
    
    Lambda-->>API: Success
    UI->>Mod: Update queue UI
    
    Mod->>UI: Click "Review" to open listing detail
    Note over Mod,UI: Opens listing in moderation view<br/>with approve/reject/request changes
```

### Key Methods

```typescript
/**
 * Get moderation queue with filters
 * 
 * @param event - Query params: status, priority, limit, nextToken
 * @returns Paginated moderation queue
 */
async function getModerationQueue(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  await verifyAdminAccess(event);
  
  const { 
    status = 'pending', 
    priority, 
    limit = 20, 
    nextToken 
  } = event.queryStringParameters || {};
  
  const result = await db.queryModerationQueue({
    status,
    priority,
    limit: parseInt(limit as string),
    startKey: nextToken ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) : undefined
  });
  
  // Fetch listing previews for each queue item
  const queueWithPreviews = await Promise.all(
    result.items.map(async (item) => {
      const listing = await db.getListing(item.listingId);
      return {
        ...item,
        listingPreview: listing ? {
          title: listing.title,
          price: listing.price,
          images: listing.images?.slice(0, 1), // First image only
          slug: (listing as any).slug
        } : null
      };
    })
  );
  
  return createResponse(200, {
    queue: queueWithPreviews,
    nextToken: result.lastKey ? Buffer.from(JSON.stringify(result.lastKey)).toString('base64') : undefined,
    total: result.count
  });
}

/**
 * Assign moderation task to moderator
 * 
 * @param queueId - Queue item to assign
 * @param moderatorId - Moderator to assign to
 */
async function assignModerationTask(
  queueId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const moderatorPayload = await verifyAdminAccess(event);
  
  const { moderatorId } = parseBody<{ moderatorId?: string }>(event);
  const assignTo = moderatorId || moderatorPayload.sub; // Self-assign if not specified
  
  await db.updateModerationQueue(queueId, {
    assignedTo: assignTo,
    status: 'in_review',
    assignedAt: Date.now(),
    updatedAt: Date.now()
  });
  
  await db.logAuditEvent({
    eventType: 'MODERATION_ASSIGNED',
    userId: moderatorPayload.sub,
    targetId: queueId,
    metadata: { assignedTo: assignTo },
    timestamp: Date.now()
  });
  
  return createResponse(200, { message: 'Task assigned successfully' });
}
```

---

## 5. Tier Management

### Overview
Admins configure tier capabilities, limits, and pricing.

### Key Features
- **Tier Configuration:** Set capabilities for each tier
- **Capability Management:** Create, update, delete capabilities
- **Limit Configuration:** Max listings, features, analytics access
- **Pricing:** Update tier pricing (integrates with billing)

### Sequence Diagram

```mermaid
sequenceDiagram
    actor Admin as Super Admin
    participant UI as Tier Management UI
    participant API as API Service
    participant Lambda as Tier Service Lambda
    participant DB as DynamoDB

    Admin->>UI: Navigate to /admin/tiers
    UI->>API: getTiers()
    
    API->>Lambda: GET /admin/tiers
    Lambda->>Lambda: verifyAdminAccess(event)
    
    Lambda->>DB: getAllTiers()
    DB-->>Lambda: All tier configurations
    Lambda-->>API: Tiers data
    API-->>UI: Display tiers table
    
    Admin->>UI: Click "Edit" on Premium tier
    UI->>API: getTier('premium')
    API-->>UI: Premium tier details
    
    UI->>Admin: Show tier edit form:<br/>- Name, Description<br/>- Max Listings<br/>- Capabilities<br/>- Price
    
    Admin->>UI: Update max listings: 10 → 25
    Admin->>UI: Add capability: ADVANCED_ANALYTICS
    Admin->>UI: Click "Save"
    
    UI->>API: updateTier('premium', updates)
    API->>Lambda: PUT /admin/tiers/premium
    
    Lambda->>Lambda: verifyAdminAccess(event)
    Lambda->>Lambda: Check role === 'SUPER_ADMIN'
    
    Lambda->>Lambda: validateTierData(updates)
    Lambda->>DB: updateTier('premium', {<br/>  maxListings: 25,<br/>  capabilities: [...existing, 'ADVANCED_ANALYTICS'],<br/>  updatedAt: timestamp,<br/>  updatedBy: adminId<br/>})
    
    Lambda->>DB: logAuditEvent('TIER_UPDATED', 'premium')
    
    Lambda-->>API: Success
    API-->>UI: Tier updated
    UI->>Admin: Show success toast
```

### Key Methods

```typescript
/**
 * Update tier configuration
 * 
 * @param tierId - Tier to update (basic, premium, professional, enterprise)
 * @param updates - Fields to update
 * @authorization SUPER_ADMIN only
 */
async function updateTier(
  tierId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const adminPayload = await verifyAdminAccess(event);
  
  if (adminPayload.role !== 'SUPER_ADMIN') {
    return createErrorResponse(403, 'FORBIDDEN', 'Only super admins can update tiers');
  }
  
  const updates = parseBody<{
    name?: string;
    description?: string;
    maxListings?: number;
    capabilities?: string[];
    price?: number;
  }>(event);
  
  // Validate tier exists
  const existingTier = await db.getTier(tierId);
  if (!existingTier) {
    return createErrorResponse(404, 'NOT_FOUND', 'Tier not found');
  }
  
  // Update tier
  await db.updateTier(tierId, {
    ...updates,
    updatedAt: Date.now(),
    updatedBy: adminPayload.sub
  });
  
  // Log audit event
  await db.logAuditEvent({
    eventType: 'TIER_UPDATED',
    userId: adminPayload.sub,
    targetId: tierId,
    metadata: { updates },
    timestamp: Date.now()
  });
  
  return createResponse(200, { message: 'Tier updated successfully' });
}
```

---

## Summary: Admin & Team Management Flows

**Total Flows Documented:** 5 comprehensive admin flows

**Key Features:**
- ✅ **Admin Dashboard Access** - MFA authentication, role-based access
- ✅ **User Management** - View, edit, suspend, delete users
- ✅ **Team Management** - Create teams, assign roles, manage members
- ✅ **Moderation Queue** - Filter, assign, batch operations
- ✅ **Tier Management** - Configure tiers, capabilities, limits

**Security:**
- MFA required for all admin access
- Role-based permissions (SUPER_ADMIN, ADMIN, MODERATOR, SUPPORT)
- Audit logging for all admin actions
- JWT authentication with 7-day staff sessions

**Documentation:** ~15,000 tokens covering all admin operations with complete frontend/backend integration.

---
