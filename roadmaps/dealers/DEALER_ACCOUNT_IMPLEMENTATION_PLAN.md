# Dealer Account Implementation Plan
## HarborList Marketplace - Complete Dealer Management System

**Version:** 1.0  
**Date:** October 20, 2025  
**Status:** 📋 Planning Phase

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Account Architecture Scenarios](#account-architecture-scenarios)
4. [Implementation Phases](#implementation-phases)
5. [Technical Specifications](#technical-specifications)
6. [Database Schema](#database-schema)
7. [API Design](#api-design)
8. [Frontend Components](#frontend-components)
9. [Security & Authorization](#security--authorization)
10. [Testing Strategy](#testing-strategy)
11. [Migration Plan](#migration-plan)

---

## 🎯 Executive Summary

### Goal
Build a complete dealer account management system that supports:
- Self-service dealer registration with tier selection
- Single dealer account with multiple sub-accounts (current implementation)
- **NEW**: Multiple dealer accounts under one business entity
- **NEW**: Consolidated billing and management
- **NEW**: Cross-account sub-account management
- Sub-account invitation and onboarding system
- Full-featured dealer dashboard UI

### Key Scenarios Supported

**Scenario 1: Single Dealer Account** (Currently Implemented)
```
Individual Dealer → Creates 1 Dealer Account → Manages Sub-Accounts
```

**Scenario 2: Multi-Location Dealer** (New)
```
Dealership Business → Creates Multiple Location Accounts → Centralized Management
```

**Scenario 3: Dealer Group/Network** (New)
```
Parent Organization → Multiple Franchises/Locations → Each with Sub-Accounts
```

### Success Criteria
- ✅ Dealers can self-register and select tier (dealer or premium_dealer)
- ✅ Payment integration for tier subscriptions
- ✅ UI for managing sub-accounts (CRUD operations)
- ✅ Email invitation system for sub-accounts
- ✅ Support for business entity with multiple dealer accounts
- ✅ Consolidated billing across multiple locations
- ✅ Cross-account visibility and management (with proper permissions)
- ✅ Migration path for existing dealers

---

## 📊 Current State Analysis

### What's Implemented ✅

1. **Backend Foundation**:
   - `dealer-service/index.ts` - Complete CRUD for sub-accounts
   - `dealer-service/handler.ts` - REST API endpoints
   - Multi-layer authorization (tier check + ownership validation)
   - DynamoDB schema with ParentDealerIndex GSI

2. **CLI Tool**:
   - `create-dealer-account.ts` - Script for creating dealers and sub-accounts
   - Cognito + DynamoDB synchronization

3. **Type Definitions**:
   - `DealerSubAccount`, `DealerAccessScope`, `DealerSubAccountRole`
   - Shared types across frontend/backend

4. **Authentication**:
   - Dual Cognito pools (Customer/Staff)
   - Tier-based groups (individual-customers, dealer-customers, premium-customers)

### What's Missing ❌

1. **Frontend UI**:
   - No dealer dashboard
   - No sub-account management interface
   - No tier selection in registration

2. **Business Account Management**:
   - No concept of "business entity"
   - Cannot link multiple dealer accounts
   - No consolidated management view

3. **Invitation System**:
   - No email invitations for sub-accounts
   - No onboarding flow for new sub-users

4. **Payment Integration**:
   - No Stripe integration
   - No subscription management
   - No tier upgrade/downgrade flow

5. **API Gaps**:
   - API doesn't create Cognito users (only DynamoDB)
   - No invitation token generation
   - No business entity endpoints

---

## 🏗️ Account Architecture Scenarios

### Scenario 1: Single Dealer Account (Current)

**Use Case**: Independent boat dealer with one location

```
┌─────────────────────────────────────┐
│     Dealer Account (Primary)        │
│  Email: dealer@boatshop.com         │
│  Tier: dealer (10 sub-accounts)     │
│  Cognito ID: abc-123                │
└──────────────┬──────────────────────┘
               │
               ├─── Sub-Account 1 (Admin)
               │    Email: manager@boatshop.com
               │    Role: admin
               │    Access: All listings
               │
               ├─── Sub-Account 2 (Manager)
               │    Email: sales@boatshop.com
               │    Role: manager
               │    Access: Specific listings
               │
               └─── Sub-Account 3 (Staff)
                    Email: support@boatshop.com
                    Role: staff
                    Access: Limited
```

**Database Structure**:
```json
// Parent Dealer
{
  "id": "abc-123",
  "email": "dealer@boatshop.com",
  "customerTier": "dealer",
  "canCreateSubAccounts": true,
  "maxSubAccounts": 10
}

// Sub-Account
{
  "id": "def-456",
  "email": "manager@boatshop.com",
  "isDealerSubAccount": true,
  "parentDealerId": "abc-123",
  "dealerAccountRole": "admin"
}
```

**Current Limitations**:
- Cannot have multiple locations under same business
- No way to transfer sub-accounts between parents
- Billing per account, not per business

---

### Scenario 2: Multi-Location Dealer (New Implementation)

**Use Case**: Dealership with multiple locations, each needs separate inventory management

```
┌─────────────────────────────────────────────────────────┐
│            Business Entity                              │
│  Name: "Premium Marine Group"                           │
│  Business ID: business-789                              │
│  Owner: owner@premiummarinegroup.com                    │
│  Subscription: Premium Dealer (50 sub-accounts/location)│
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴─────────────┬─────────────────┐
        │                          │                 │
        ▼                          ▼                 ▼
┌────────────────┐      ┌────────────────┐   ┌────────────────┐
│ Location 1     │      │ Location 2     │   │ Location 3     │
│ Miami, FL      │      │ Fort Laud, FL  │   │ Tampa, FL      │
│ Dealer Acct 1  │      │ Dealer Acct 2  │   │ Dealer Acct 3  │
│ 15 sub-accounts│      │ 8 sub-accounts │   │ 12 sub-accounts│
└───────┬────────┘      └───────┬────────┘   └───────┬────────┘
        │                       │                     │
   Sub-Accounts            Sub-Accounts          Sub-Accounts
   (Location 1)            (Location 2)          (Location 3)
```

**Key Features**:
- **Business Entity** as top-level organization
- **Multiple Dealer Accounts** under business (locations/franchises)
- **Independent Operations** per location
- **Centralized Billing** at business level
- **Cross-Location Visibility** (optional, permission-based)
- **Consolidated Reporting** across all locations

**Database Structure**:
```json
// Business Entity (NEW)
{
  "businessId": "business-789",
  "businessName": "Premium Marine Group",
  "ownerEmail": "owner@premiummarinegroup.com",
  "ownerId": "owner-123",
  "subscriptionTier": "premium_dealer",
  "subscriptionStatus": "active",
  "billingContactId": "owner-123",
  "dealerAccountIds": ["dealer-001", "dealer-002", "dealer-003"],
  "totalSubAccountsLimit": 150, // 50 per location × 3
  "createdAt": "2025-10-20T00:00:00Z"
}

// Dealer Account (Location 1)
{
  "id": "dealer-001",
  "email": "miami@premiummarinegroup.com",
  "customerTier": "dealer",
  "businessId": "business-789", // Link to business
  "locationName": "Miami Showroom",
  "locationAddress": {
    "street": "123 Ocean Drive",
    "city": "Miami",
    "state": "FL",
    "zip": "33139"
  },
  "canCreateSubAccounts": true,
  "maxSubAccounts": 50,
  "currentSubAccountCount": 15
}

// Sub-Account under Location 1
{
  "id": "sub-001",
  "email": "john.sales@premiummarinegroup.com",
  "isDealerSubAccount": true,
  "parentDealerId": "dealer-001",
  "businessId": "business-789", // Also link to business
  "dealerAccountRole": "manager",
  "locationName": "Miami Showroom"
}
```

**New Database Tables Needed**:

1. **`harborlist-businesses`** table:
   - PK: `businessId`
   - Stores business entity info
   - Links to owner and dealer accounts
   - Subscription and billing information

2. **`harborlist-business-memberships`** table:
   - PK: `businessId`, SK: `userId`
   - Tracks who can manage the business
   - Roles: owner, admin, billing_contact

3. GSI on `harborlist-users`:
   - **BusinessIndex**: PK: `businessId`, SK: `createdAt`
   - Query all dealer accounts for a business

**Benefits**:
- ✅ Each location maintains independent inventory
- ✅ Location-specific sub-accounts
- ✅ Business owner can view all locations
- ✅ Single subscription covers all locations
- ✅ Consolidated reporting and analytics
- ✅ Transfer listings between locations

---

### Scenario 3: Dealer Group/Network (Advanced)

**Use Case**: Franchise network or dealer association with multiple independent businesses

```
┌─────────────────────────────────────────────────────────┐
│         Parent Organization / Network                   │
│  Name: "Coastal Boat Dealers Network"                   │
│  Network ID: network-456                                │
│  Type: Franchise / Association                          │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴─────────────┬─────────────────┐
        │                          │                 │
        ▼                          ▼                 ▼
┌────────────────┐      ┌────────────────┐   ┌────────────────┐
│ Business A     │      │ Business B     │   │ Business C     │
│ "Joe's Boats"  │      │ "Marina Pro"   │   │ "Sea Kings"    │
│ 2 Locations    │      │ 1 Location     │   │ 3 Locations    │
└───────┬────────┘      └───────┬────────┘   └───────┬────────┘
        │                       │                     │
   Dealer Accounts         Dealer Account        Dealer Accounts
   + Sub-Accounts          + Sub-Accounts        + Sub-Accounts
```

**Key Features**:
- **Network-level management** (reporting, branding)
- **Business independence** (separate billing per business)
- **Shared resources** (templates, training, marketing)
- **Network-wide analytics** (aggregate performance)
- **White-label options** per business

**Database Structure**:
```json
// Network Entity (NEW)
{
  "networkId": "network-456",
  "networkName": "Coastal Boat Dealers Network",
  "networkType": "franchise", // or "association"
  "adminIds": ["network-admin-1", "network-admin-2"],
  "businessIds": ["business-001", "business-002", "business-003"],
  "features": {
    "sharedMarketing": true,
    "networkReporting": true,
    "whiteLabel": true
  }
}

// Business Entity (Updated)
{
  "businessId": "business-001",
  "businessName": "Joe's Boats",
  "networkId": "network-456", // Link to network
  "networkMemberSince": "2024-01-15T00:00:00Z",
  "dealerAccountIds": ["dealer-010", "dealer-011"]
}
```

**Use Cases**:
- Franchise organizations (same brand, multiple owners)
- Dealer associations (independent dealers cooperating)
- Corporate multi-brand holdings
- Regional dealer networks

---

## 🚀 Implementation Phases

### Phase 1: Foundation & Self-Service Registration (Weeks 1-2)

**Goal**: Enable dealers to self-register and select tier

#### 1.1 Frontend Registration Enhancement

**New Components**:
```
frontend/src/components/
├── dealer/
│   ├── DealerRegistration.tsx         (NEW)
│   ├── TierSelectionCard.tsx          (NEW)
│   └── PricingComparison.tsx          (NEW)
```

**Features**:
- Tier selection UI (Individual / Dealer / Premium Dealer)
- Pricing comparison table
- Business information form (for dealer tiers)
- Payment integration with Stripe
- Terms of service for dealer accounts

**Implementation**:
```tsx
// DealerRegistration.tsx
interface DealerRegistrationData {
  // Personal info
  name: string;
  email: string;
  password: string;
  phone?: string;
  
  // Business info (for dealer tiers)
  businessName?: string;
  businessAddress?: Address;
  businessPhone?: string;
  taxId?: string;
  
  // Tier selection
  tier: 'individual' | 'dealer' | 'premium_dealer';
  
  // Payment
  paymentMethodId?: string; // Stripe payment method
}
```

#### 1.2 Backend Registration Enhancement

**Files to Modify**:
- `backend/src/auth-service/index.ts`
- `backend/src/auth-service/interfaces.ts`

**New Features**:
- Accept tier in registration request
- Create Stripe customer for dealer tiers
- Set up subscription in Stripe
- Store business information
- Send welcome email with getting started guide

**Implementation**:
```typescript
// Enhanced registration
async customerRegister(
  userData: CustomerRegistration
): Promise<{
  success: boolean;
  message: string;
  requiresVerification?: boolean;
  requiresPayment?: boolean;
  paymentIntentId?: string;
}> {
  // Existing logic...
  
  // NEW: Handle dealer tier payment
  if (userData.tier === 'dealer' || userData.tier === 'premium_dealer') {
    const stripeCustomer = await createStripeCustomer(userData);
    const subscription = await createStripeSubscription(
      stripeCustomer.id,
      userData.tier
    );
    
    // Store Stripe info in DynamoDB
    await updateUserStripeInfo(cognitoUserId, {
      stripeCustomerId: stripeCustomer.id,
      subscriptionId: subscription.id
    });
  }
  
  // Send welcome email
  await sendDealerWelcomeEmail(userData);
  
  return { success: true, ... };
}
```

#### 1.3 Stripe Integration

**New Service**:
```
backend/src/payment-service/
├── index.ts                    (NEW)
├── stripe-client.ts           (NEW)
├── subscription-manager.ts    (NEW)
└── webhook-handler.ts         (NEW)
```

**Pricing Structure**:
```typescript
const PRICING_PLANS = {
  individual: {
    price: 0, // Free
    features: ['Basic listings', 'Contact buyers']
  },
  dealer: {
    price: 99, // $99/month
    features: [
      'Up to 10 sub-accounts',
      'Advanced analytics',
      'Priority support',
      'Custom branding'
    ]
  },
  premium_dealer: {
    price: 299, // $299/month
    features: [
      'Up to 50 sub-accounts',
      'Multi-location support',
      'API access',
      'Dedicated account manager'
    ]
  }
};
```

**Deliverables**:
- ✅ Tier selection in registration UI
- ✅ Stripe payment integration
- ✅ Subscription management
- ✅ Business info collection
- ✅ Enhanced dealer user records

---

### Phase 2: Sub-Account Management UI (Weeks 3-4)

**Goal**: Build complete dealer dashboard for managing sub-accounts

#### 2.1 Dealer Dashboard

**New Components**:
```
frontend/src/components/dealer/
├── DealerDashboard.tsx              (NEW)
├── SubAccountList.tsx               (NEW)
├── SubAccountCard.tsx               (NEW)
├── CreateSubAccountModal.tsx        (NEW)
├── EditSubAccountModal.tsx          (NEW)
├── SubAccountPermissions.tsx        (NEW)
├── AccessScopeEditor.tsx            (NEW)
└── SubAccountInvitation.tsx         (NEW)
```

**Dashboard Features**:
- Overview of all sub-accounts
- Quick stats (active sub-accounts, total listings, leads)
- Create new sub-account button
- Search and filter sub-accounts
- Bulk actions (suspend, delete)

**Component Structure**:
```tsx
// DealerDashboard.tsx
export const DealerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [subAccounts, setSubAccounts] = useState<DealerSubAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadSubAccounts();
  }, []);
  
  const loadSubAccounts = async () => {
    const response = await api.get('/dealer/sub-accounts');
    setSubAccounts(response.subAccounts);
  };
  
  return (
    <div className="dealer-dashboard">
      <DashboardHeader 
        user={user}
        subAccountCount={subAccounts.length}
        maxSubAccounts={user.maxSubAccounts}
      />
      
      <SubAccountStats subAccounts={subAccounts} />
      
      <SubAccountList 
        subAccounts={subAccounts}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onInvite={handleInvite}
      />
      
      <CreateSubAccountModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={loadSubAccounts}
      />
    </div>
  );
};
```

#### 2.2 Sub-Account CRUD Operations

**API Integration**:
```typescript
// frontend/src/services/dealer-api.ts
export const dealerApi = {
  // List all sub-accounts
  async listSubAccounts(): Promise<DealerSubAccount[]> {
    const response = await api.get('/dealer/sub-accounts');
    return response.subAccounts;
  },
  
  // Create sub-account
  async createSubAccount(
    data: CreateSubAccountData
  ): Promise<DealerSubAccount> {
    const response = await api.post('/dealer/sub-accounts', data);
    return response.subAccount;
  },
  
  // Update sub-account
  async updateSubAccount(
    id: string,
    updates: Partial<DealerSubAccount>
  ): Promise<DealerSubAccount> {
    const response = await api.put(`/dealer/sub-accounts/${id}`, updates);
    return response.subAccount;
  },
  
  // Delete sub-account
  async deleteSubAccount(id: string): Promise<void> {
    await api.delete(`/dealer/sub-accounts/${id}`);
  }
};
```

#### 2.3 Permission & Scope Management UI

**Visual Permission Editor**:
```tsx
// SubAccountPermissions.tsx
export const SubAccountPermissions: React.FC<{
  role: DealerSubAccountRole;
  permissions: string[];
  onChange: (permissions: string[]) => void;
}> = ({ role, permissions, onChange }) => {
  const availablePermissions = getPermissionsForRole(role);
  
  return (
    <div className="permission-editor">
      <h3>Delegated Permissions</h3>
      
      {availablePermissions.map(permission => (
        <Checkbox
          key={permission}
          checked={permissions.includes(permission)}
          onChange={(checked) => {
            if (checked) {
              onChange([...permissions, permission]);
            } else {
              onChange(permissions.filter(p => p !== permission));
            }
          }}
          label={permissionLabels[permission]}
          description={permissionDescriptions[permission]}
        />
      ))}
    </div>
  );
};
```

**Access Scope Editor**:
```tsx
// AccessScopeEditor.tsx
export const AccessScopeEditor: React.FC<{
  scope: DealerAccessScope;
  listings: Listing[];
  onChange: (scope: DealerAccessScope) => void;
}> = ({ scope, listings, onChange }) => {
  return (
    <div className="access-scope-editor">
      <ScopeSection title="Listings Access">
        <RadioGroup
          value={scope.listings === 'all' ? 'all' : 'specific'}
          onChange={(value) => {
            if (value === 'all') {
              onChange({ ...scope, listings: 'all' });
            } else {
              onChange({ ...scope, listings: [] });
            }
          }}
        >
          <Radio value="all">All listings</Radio>
          <Radio value="specific">Specific listings</Radio>
        </RadioGroup>
        
        {scope.listings !== 'all' && (
          <ListingSelector
            listings={listings}
            selected={scope.listings}
            onChange={(selected) => 
              onChange({ ...scope, listings: selected })
            }
          />
        )}
      </ScopeSection>
      
      <ScopeSection title="Feature Access">
        <Toggle
          label="Leads & Inquiries"
          checked={scope.leads}
          onChange={(checked) => onChange({ ...scope, leads: checked })}
        />
        <Toggle
          label="Analytics Dashboard"
          checked={scope.analytics}
          onChange={(checked) => onChange({ ...scope, analytics: checked })}
        />
        {/* More toggles... */}
      </ScopeSection>
    </div>
  );
};
```

**Deliverables**:
- ✅ Full-featured dealer dashboard
- ✅ Sub-account CRUD UI
- ✅ Permission management interface
- ✅ Access scope editor
- ✅ Responsive design

---

### Phase 3: Invitation System (Weeks 5-6)

**Goal**: Allow dealers to invite sub-account users via email

#### 3.1 Invitation Token System

**New Database Table**:
```typescript
// harborlist-invitations table
interface SubAccountInvitation {
  invitationId: string;          // PK
  invitationToken: string;       // Secure random token
  parentDealerId: string;
  email: string;
  name: string;
  role: DealerSubAccountRole;
  accessScope: DealerAccessScope;
  delegatedPermissions: string[];
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  createdAt: string;
  expiresAt: string;            // 7 days from creation
  invitedBy: string;
  acceptedAt?: string;
  subAccountId?: string;        // Set when accepted
}
```

**GSI**: 
- **EmailIndex**: PK: `email`, SK: `createdAt` (check pending invitations)
- **TokenIndex**: PK: `invitationToken` (lookup by token)

#### 3.2 Backend Invitation API

**New Endpoints**:
```typescript
// POST /api/dealer/invitations
async createInvitation(request: CreateInvitationRequest) {
  // 1. Validate parent dealer
  // 2. Check sub-account limit
  // 3. Generate secure token
  // 4. Create invitation record
  // 5. Send invitation email
  
  const token = generateSecureToken(32);
  const invitation = {
    invitationId: uuidv4(),
    invitationToken: token,
    parentDealerId: request.parentDealerId,
    email: request.email,
    // ... other fields
    expiresAt: addDays(new Date(), 7)
  };
  
  await saveInvitation(invitation);
  await sendInvitationEmail(invitation);
  
  return { success: true, invitation };
}

// GET /api/dealer/invitations/:token
async getInvitation(token: string) {
  const invitation = await findInvitationByToken(token);
  
  if (!invitation) {
    return { error: 'Invalid invitation' };
  }
  
  if (invitation.status !== 'pending') {
    return { error: 'Invitation already used' };
  }
  
  if (new Date() > new Date(invitation.expiresAt)) {
    return { error: 'Invitation expired' };
  }
  
  return { invitation };
}

// POST /api/dealer/invitations/:token/accept
async acceptInvitation(token: string, password: string) {
  // 1. Validate invitation
  // 2. Create Cognito user
  // 3. Create DynamoDB sub-account
  // 4. Update invitation status
  // 5. Send welcome email
  
  const invitation = await getAndValidateInvitation(token);
  
  // Create Cognito user
  const cognitoUser = await createCognitoUser({
    email: invitation.email,
    name: invitation.name,
    password,
    customerType: 'dealer'
  });
  
  // Create sub-account
  const subAccount = await createSubAccountRecord({
    id: cognitoUser.sub,
    ...invitation,
    status: 'active'
  });
  
  // Update invitation
  await updateInvitation(invitation.invitationId, {
    status: 'accepted',
    acceptedAt: new Date().toISOString(),
    subAccountId: subAccount.id
  });
  
  return { success: true, subAccount };
}

// GET /api/dealer/invitations (list for dealer)
// DELETE /api/dealer/invitations/:id (revoke)
```

#### 3.3 Email Templates

**Invitation Email**:
```html
<!-- emails/sub-account-invitation.html -->
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #003d5c; padding: 20px; text-align: center;">
    <h1 style="color: white;">HarborList Invitation</h1>
  </div>
  
  <div style="padding: 40px 20px;">
    <h2>You've been invited!</h2>
    
    <p>Hi {{name}},</p>
    
    <p>
      <strong>{{parentDealerName}}</strong> has invited you to join their 
      team on HarborList as a <strong>{{role}}</strong>.
    </p>
    
    <h3>Your Access Includes:</h3>
    <ul>
      {{#each permissions}}
      <li>{{this}}</li>
      {{/each}}
    </ul>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="{{acceptUrl}}" 
         style="background: #ff6b35; color: white; padding: 15px 30px; 
                text-decoration: none; border-radius: 5px; display: inline-block;">
        Accept Invitation
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      This invitation expires in 7 days. If you didn't expect this invitation,
      you can safely ignore this email.
    </p>
  </div>
</body>
</html>
```

#### 3.4 Frontend Invitation Flow

**New Pages/Components**:
```
frontend/src/pages/
├── InvitationAccept.tsx          (NEW)

frontend/src/components/dealer/
├── InvitationList.tsx            (NEW)
├── SendInvitationModal.tsx       (NEW)
└── InvitationStatusBadge.tsx     (NEW)
```

**Acceptance Flow**:
```tsx
// InvitationAccept.tsx
export const InvitationAccept: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    loadInvitation();
  }, [token]);
  
  const loadInvitation = async () => {
    try {
      const response = await api.get(`/dealer/invitations/${token}`);
      setInvitation(response.invitation);
    } catch (error) {
      showError('Invalid or expired invitation');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await api.post(`/dealer/invitations/${token}/accept`, { password });
      showSuccess('Account created! Logging you in...');
      
      // Auto-login
      await login(invitation.email, password);
      navigate('/dashboard');
    } catch (error) {
      showError('Failed to accept invitation');
    }
  };
  
  return (
    <div className="invitation-accept">
      <h1>Join {invitation?.parentDealerName}</h1>
      
      <InvitationDetails invitation={invitation} />
      
      <form onSubmit={handleAccept}>
        <Input
          type="password"
          label="Create Your Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        <Button type="submit">
          Accept & Create Account
        </Button>
      </form>
    </div>
  );
};
```

**Deliverables**:
- ✅ Invitation system backend
- ✅ Email invitation templates
- ✅ Token generation and validation
- ✅ Invitation acceptance UI
- ✅ Invitation management in dealer dashboard

---

### Phase 4: Business Entity Architecture (Weeks 7-9)

**Goal**: Support multiple dealer accounts under one business entity

#### 4.1 Database Schema for Business Entities

**New Tables**:

```typescript
// harborlist-businesses table
interface Business {
  businessId: string;              // PK
  businessName: string;
  businessType: 'single_location' | 'multi_location' | 'franchise';
  ownerId: string;                 // Primary business owner
  ownerEmail: string;
  
  // Billing
  subscriptionTier: 'dealer' | 'premium_dealer';
  subscriptionStatus: 'active' | 'past_due' | 'canceled';
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  billingEmail: string;
  
  // Limits
  maxDealerAccounts: number;       // e.g., 5 locations
  maxSubAccountsPerLocation: number; // 10 or 50
  totalSubAccountsLimit: number;   // maxDealerAccounts × maxSubAccountsPerLocation
  
  // Accounts
  dealerAccountIds: string[];      // Array of linked dealer account IDs
  currentDealerAccountCount: number;
  currentTotalSubAccountCount: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  
  // Features
  features: {
    crossLocationReporting: boolean;
    consolidatedBilling: boolean;
    transferListings: boolean;
    sharedInventory: boolean;
  };
}

// harborlist-business-memberships table
interface BusinessMembership {
  membershipId: string;            // PK
  businessId: string;              // GSI PK
  userId: string;                  // GSI PK
  role: 'owner' | 'admin' | 'billing_manager' | 'viewer';
  permissions: string[];
  locationAccess: string[] | 'all'; // Specific dealer account IDs or 'all'
  addedBy: string;
  addedAt: string;
}
```

**Updated harborlist-users**:
```typescript
interface User {
  // ... existing fields ...
  
  // Business relationship
  businessId?: string;             // Link to business entity
  businessRole?: 'owner' | 'admin' | 'location_manager';
  
  // For dealer accounts
  locationName?: string;           // "Miami Showroom"
  locationAddress?: Address;
  isBusinessLocation?: boolean;    // true if part of business entity
}
```

**New GSIs**:
- **BusinessIndex** on `harborlist-users`: PK: `businessId`, SK: `createdAt`
- **UserBusinessIndex** on `harborlist-business-memberships`: PK: `userId`
- **BusinessMemberIndex** on `harborlist-business-memberships`: PK: `businessId`, SK: `addedAt`

#### 4.2 Business Entity API

**New Endpoints**:
```typescript
// Business Management
POST   /api/businesses                    // Create business entity
GET    /api/businesses/:id                // Get business details
PUT    /api/businesses/:id                // Update business
DELETE /api/businesses/:id                // Delete business

// Business Memberships
GET    /api/businesses/:id/members        // List members
POST   /api/businesses/:id/members        // Add member
PUT    /api/businesses/:id/members/:uid   // Update member role
DELETE /api/businesses/:id/members/:uid   // Remove member

// Dealer Account Management (under business)
GET    /api/businesses/:id/locations      // List all dealer accounts
POST   /api/businesses/:id/locations      // Create new location
PUT    /api/businesses/:id/locations/:lid // Update location
DELETE /api/businesses/:id/locations/:lid // Delete location

// Cross-Location Operations
GET    /api/businesses/:id/sub-accounts   // All sub-accounts across locations
GET    /api/businesses/:id/listings       // All listings across locations
GET    /api/businesses/:id/analytics      // Consolidated analytics
POST   /api/businesses/:id/transfer       // Transfer listing between locations
```

**Implementation Example**:
```typescript
// Create Business Entity
async createBusiness(request: CreateBusinessRequest) {
  const { ownerId, businessName, subscriptionTier, dealerAccounts } = request;
  
  // Validate owner
  const owner = await getUser(ownerId);
  if (!owner || owner.customerTier !== 'dealer') {
    throw new Error('Owner must be a dealer account');
  }
  
  // Create Stripe customer and subscription for business
  const stripeCustomer = await stripe.customers.create({
    email: owner.email,
    name: businessName,
    metadata: { businessType: 'multi_location' }
  });
  
  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomer.id,
    items: [{ price: getPriceId(subscriptionTier) }],
    metadata: { 
      businessId: businessId,
      maxLocations: dealerAccounts.length 
    }
  });
  
  // Create business record
  const business: Business = {
    businessId: uuidv4(),
    businessName,
    businessType: 'multi_location',
    ownerId,
    ownerEmail: owner.email,
    subscriptionTier,
    subscriptionStatus: 'active',
    stripeCustomerId: stripeCustomer.id,
    stripeSubscriptionId: subscription.id,
    maxDealerAccounts: dealerAccounts.length,
    maxSubAccountsPerLocation: subscriptionTier === 'premium_dealer' ? 50 : 10,
    totalSubAccountsLimit: dealerAccounts.length * (subscriptionTier === 'premium_dealer' ? 50 : 10),
    dealerAccountIds: [],
    currentDealerAccountCount: 0,
    currentTotalSubAccountCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    features: {
      crossLocationReporting: true,
      consolidatedBilling: true,
      transferListings: true,
      sharedInventory: false
    }
  };
  
  await saveBusiness(business);
  
  // Link existing dealer accounts to business
  for (const dealerAccountId of dealerAccounts) {
    await linkDealerAccountToBusiness(dealerAccountId, business.businessId);
  }
  
  return { success: true, business };
}

// Link dealer account to business
async linkDealerAccountToBusiness(dealerAccountId: string, businessId: string) {
  await updateUser(dealerAccountId, {
    businessId,
    isBusinessLocation: true
  });
  
  await updateBusiness(businessId, {
    dealerAccountIds: { $push: dealerAccountId },
    currentDealerAccountCount: { $inc: 1 }
  });
  
  // Also update all sub-accounts to link to business
  const subAccounts = await listSubAccounts(dealerAccountId);
  for (const subAccount of subAccounts) {
    await updateUser(subAccount.id, { businessId });
  }
}
```

#### 4.3 Business Dashboard UI

**New Components**:
```
frontend/src/components/business/
├── BusinessDashboard.tsx           (NEW)
├── LocationList.tsx                (NEW)
├── LocationCard.tsx                (NEW)
├── CreateLocationModal.tsx         (NEW)
├── BusinessSettings.tsx            (NEW)
├── BusinessMembers.tsx             (NEW)
├── ConsolidatedAnalytics.tsx       (NEW)
└── CrossLocationReporting.tsx      (NEW)
```

**Business Dashboard**:
```tsx
// BusinessDashboard.tsx
export const BusinessDashboard: React.FC = () => {
  const { businessId } = useParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [locations, setLocations] = useState<DealerAccount[]>([]);
  
  return (
    <div className="business-dashboard">
      <BusinessHeader business={business} />
      
      <BusinessMetrics 
        totalLocations={locations.length}
        totalSubAccounts={business?.currentTotalSubAccountCount}
        totalListings={/* aggregate */}
      />
      
      <LocationGrid 
        locations={locations}
        onLocationClick={handleLocationClick}
      />
      
      <ConsolidatedAnalytics businessId={businessId} />
    </div>
  );
};
```

#### 4.4 Migration & Conversion Tools

**Convert Single Account to Business**:
```typescript
// POST /api/dealer/convert-to-business
async convertDealerToBusinessEntity(dealerAccountId: string) {
  const dealer = await getUser(dealerAccountId);
  
  // Create business entity
  const business = await createBusiness({
    ownerId: dealerAccountId,
    businessName: dealer.name || `${dealer.email}'s Business`,
    subscriptionTier: dealer.customerTier,
    dealerAccounts: [dealerAccountId]
  });
  
  // Update dealer account
  await updateUser(dealerAccountId, {
    businessId: business.businessId,
    businessRole: 'owner',
    isBusinessLocation: true,
    locationName: 'Main Location'
  });
  
  return { success: true, business };
}
```

**Deliverables**:
- ✅ Business entity data model
- ✅ Business CRUD APIs
- ✅ Business dashboard UI
- ✅ Multi-location support
- ✅ Consolidated billing
- ✅ Cross-location reporting
- ✅ Migration tools

---

### Phase 5: Advanced Features (Weeks 10-12)

#### 5.1 Listing Transfer Between Locations

**Feature**: Move listings from one dealer account to another within same business

```typescript
// POST /api/businesses/:id/transfer
async transferListing(request: TransferListingRequest) {
  const { businessId, listingId, fromLocationId, toLocationId } = request;
  
  // Validate business ownership of both locations
  await validateBusinessOwnership(businessId, fromLocationId);
  await validateBusinessOwnership(businessId, toLocationId);
  
  // Get listing
  const listing = await getListing(listingId);
  if (listing.ownerId !== fromLocationId) {
    throw new Error('Listing does not belong to source location');
  }
  
  // Transfer listing
  await updateListing(listingId, {
    ownerId: toLocationId,
    transferHistory: {
      $push: {
        fromLocationId,
        toLocationId,
        transferredAt: new Date().toISOString(),
        transferredBy: request.userId
      }
    }
  });
  
  // Log audit event
  await logAuditEvent({
    eventType: 'LISTING_TRANSFER',
    businessId,
    listingId,
    fromLocationId,
    toLocationId,
    userId: request.userId
  });
  
  return { success: true };
}
```

#### 5.2 Shared Inventory System

**Feature**: View and manage inventory across all locations

```typescript
// GET /api/businesses/:id/inventory
async getBusinessInventory(businessId: string, filters?: InventoryFilters) {
  const locations = await getBusinessLocations(businessId);
  const locationIds = locations.map(loc => loc.id);
  
  // Aggregate listings from all locations
  const inventory = await queryListings({
    ownerIds: locationIds,
    status: filters?.status || 'active',
    ...filters
  });
  
  // Group by location
  const inventoryByLocation = groupBy(inventory, 'ownerId');
  
  return {
    totalListings: inventory.length,
    locations: locations.map(loc => ({
      locationId: loc.id,
      locationName: loc.locationName,
      listingCount: inventoryByLocation[loc.id]?.length || 0,
      listings: inventoryByLocation[loc.id] || []
    }))
  };
}
```

#### 5.3 Sub-Account Activity Monitoring

**Feature**: Track and audit sub-account actions

```typescript
// New table: harborlist-sub-account-activity
interface SubAccountActivity {
  activityId: string;
  subAccountId: string;
  parentDealerId: string;
  businessId?: string;
  activityType: 'listing_created' | 'listing_edited' | 'lead_responded' | 'login' | 'permission_changed';
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

// GET /api/dealer/sub-accounts/:id/activity
async getSubAccountActivity(subAccountId: string, filters?: ActivityFilters) {
  const activities = await queryActivities({
    subAccountId,
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    activityTypes: filters?.types
  });
  
  return {
    activities,
    summary: {
      totalActivities: activities.length,
      lastActive: activities[0]?.timestamp,
      mostCommonActivity: getMostCommon(activities, 'activityType')
    }
  };
}
```

#### 5.4 Tier Upgrade/Downgrade Flow

**Feature**: Allow dealers to change subscription tier

```typescript
// POST /api/dealer/subscription/upgrade
async upgradeSubscription(userId: string, newTier: 'dealer' | 'premium_dealer') {
  const user = await getUser(userId);
  
  // Get Stripe subscription
  const subscription = await stripe.subscriptions.retrieve(
    user.stripeSubscriptionId
  );
  
  // Update subscription
  await stripe.subscriptions.update(subscription.id, {
    items: [{
      id: subscription.items.data[0].id,
      price: getPriceId(newTier)
    }],
    proration_behavior: 'always_invoice'
  });
  
  // Update user tier
  await updateUser(userId, {
    customerTier: newTier,
    maxSubAccounts: newTier === 'premium_dealer' ? 50 : 10
  });
  
  // Update Cognito group
  await moveCognitoGroup(userId, `${newTier}-customers`);
  
  return { success: true, newTier };
}

// POST /api/dealer/subscription/downgrade
async downgradeSubscription(userId: string) {
  const user = await getUser(userId);
  const subAccounts = await listSubAccounts(userId);
  
  // Check if downgrade is possible
  if (subAccounts.length > 10) {
    throw new Error(
      'Cannot downgrade: You have more than 10 sub-accounts. ' +
      'Please remove some sub-accounts before downgrading.'
    );
  }
  
  // Proceed with downgrade...
}
```

**Deliverables**:
- ✅ Listing transfer functionality
- ✅ Shared inventory view
- ✅ Activity monitoring and audit logs
- ✅ Tier upgrade/downgrade with validation
- ✅ Stripe webhook handling for subscription events

---

## 🗄️ Complete Database Schema

### Tables Summary

```
1. harborlist-users (EXISTING - Enhanced)
   - PK: id
   - GSI: email-index
   - GSI: ParentDealerIndex (parentDealerId + createdAt)
   - NEW GSI: BusinessIndex (businessId + createdAt)

2. harborlist-businesses (NEW)
   - PK: businessId
   - Stores business entity information
   - Links to owner and dealer accounts

3. harborlist-business-memberships (NEW)
   - PK: membershipId
   - GSI: UserBusinessIndex (userId)
   - GSI: BusinessMemberIndex (businessId + addedAt)

4. harborlist-invitations (NEW)
   - PK: invitationId
   - GSI: EmailIndex (email + createdAt)
   - GSI: TokenIndex (invitationToken)

5. harborlist-sub-account-activity (NEW)
   - PK: activityId
   - GSI: SubAccountActivityIndex (subAccountId + timestamp)
   - GSI: ParentDealerActivityIndex (parentDealerId + timestamp)
```

### Complete User Record Example

```json
{
  // Core identity
  "id": "dealer-123",
  "email": "miami@premiummarinegroup.com",
  "name": "Miami Marine Center",
  "userType": "customer",
  "role": "user",
  
  // Customer tier
  "customerTier": "premium_dealer",
  "status": "active",
  
  // Dealer capabilities
  "canCreateSubAccounts": true,
  "maxSubAccounts": 50,
  "currentSubAccountCount": 15,
  
  // Business relationship
  "businessId": "business-789",
  "businessRole": "location_manager",
  "isBusinessLocation": true,
  "locationName": "Miami Showroom",
  "locationAddress": {
    "street": "123 Ocean Drive",
    "city": "Miami",
    "state": "FL",
    "zip": "33139",
    "coordinates": {
      "lat": 25.7617,
      "lon": -80.1918
    }
  },
  
  // Billing
  "stripeCustomerId": "cus_xxx",
  "stripeSubscriptionId": "sub_xxx",
  
  // Verification
  "emailVerified": true,
  "phoneVerified": false,
  
  // Timestamps
  "createdAt": "2025-10-15T00:00:00Z",
  "updatedAt": "2025-10-20T10:30:00Z",
  "lastLoginAt": "2025-10-20T09:00:00Z"
}
```

---

## 🔐 Security & Authorization

### Permission Matrix

| Feature | Individual | Dealer | Premium Dealer | Business Owner |
|---------|-----------|--------|----------------|----------------|
| Create listings | ✅ | ✅ | ✅ | ✅ |
| Create sub-accounts | ❌ | ✅ (max 10) | ✅ (max 50) | ✅ |
| Create locations | ❌ | ❌ | ✅ | ✅ |
| Business dashboard | ❌ | ❌ | ❌ | ✅ |
| Cross-location reporting | ❌ | ❌ | ❌ | ✅ |
| Transfer listings | ❌ | ❌ | ❌ | ✅ |
| Manage billing | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (all) |

### Authorization Middleware

```typescript
// Check if user can manage business
export function requireBusinessOwnership(
  getBusinessId: (event: APIGatewayProxyEvent) => string
) {
  return async (event: APIGatewayProxyEvent) => {
    const user = extractUserFromEvent(event);
    const businessId = getBusinessId(event);
    
    // Check if user is business owner or admin
    const membership = await getBusinessMembership(businessId, user.userId);
    
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return createForbiddenResponse(
        'You do not have permission to manage this business'
      );
    }
    
    return null; // Pass through
  };
}

// Check location access within business
export function requireLocationAccess(
  getLocationId: (event: APIGatewayProxyEvent) => string
) {
  return async (event: APIGatewayProxyEvent) => {
    const user = extractUserFromEvent(event);
    const locationId = getLocationId(event);
    
    const location = await getUser(locationId);
    
    // Check if user owns the location
    if (location.id === user.userId) {
      return null;
    }
    
    // Check if user has business-level access
    if (location.businessId) {
      const membership = await getBusinessMembership(
        location.businessId,
        user.userId
      );
      
      if (membership && 
          (membership.locationAccess === 'all' || 
           membership.locationAccess.includes(locationId))) {
        return null;
      }
    }
    
    return createForbiddenResponse(
      'You do not have access to this location'
    );
  };
}
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// Test sub-account creation
describe('Dealer Sub-Account Creation', () => {
  test('should create sub-account with valid data', async () => {
    const result = await createSubAccount({
      parentDealerId: 'dealer-123',
      email: 'test@example.com',
      name: 'Test User',
      dealerAccountRole: 'manager',
      accessScope: { listings: 'all', leads: true },
      createdBy: 'dealer-123'
    });
    
    expect(result.success).toBe(true);
    expect(result.subAccount).toBeDefined();
  });
  
  test('should reject if sub-account limit reached', async () => {
    // Create dealer with maxSubAccounts: 10
    // Create 10 sub-accounts
    // Attempt 11th sub-account
    
    const result = await createSubAccount({...});
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('SUB_ACCOUNT_LIMIT_REACHED');
  });
});

// Test business entity
describe('Business Entity Management', () => {
  test('should create business with multiple locations', async () => {
    const business = await createBusiness({
      ownerId: 'dealer-123',
      businessName: 'Test Business',
      subscriptionTier: 'premium_dealer',
      dealerAccounts: ['dealer-123', 'dealer-456']
    });
    
    expect(business.dealerAccountIds).toHaveLength(2);
  });
  
  test('should enforce location limit', async () => {
    // Test that business cannot exceed maxDealerAccounts
  });
});
```

### Integration Tests

```typescript
// Test invitation flow end-to-end
describe('Sub-Account Invitation Flow', () => {
  test('should complete full invitation flow', async () => {
    // 1. Dealer creates invitation
    const invitation = await createInvitation({...});
    expect(invitation.invitationToken).toBeDefined();
    
    // 2. Recipient receives email (mock)
    const email = await getLastEmailSent();
    expect(email.to).toBe(invitation.email);
    
    // 3. Recipient accepts invitation
    const result = await acceptInvitation(
      invitation.invitationToken,
      'password123'
    );
    expect(result.success).toBe(true);
    
    // 4. Verify sub-account created
    const subAccount = await getUser(result.subAccount.id);
    expect(subAccount.isDealerSubAccount).toBe(true);
    expect(subAccount.parentDealerId).toBe(invitation.parentDealerId);
  });
});
```

### E2E Tests (Cypress)

```typescript
// Test dealer registration flow
describe('Dealer Registration', () => {
  it('should register as dealer with payment', () => {
    cy.visit('/register');
    
    // Fill registration form
    cy.get('[data-testid="name-input"]').type('Test Dealer');
    cy.get('[data-testid="email-input"]').type('dealer@test.com');
    cy.get('[data-testid="password-input"]').type('Password123!');
    
    // Select dealer tier
    cy.get('[data-testid="tier-dealer"]').click();
    
    // Enter payment info (Stripe test mode)
    cy.get('[data-testid="card-element"]')
      .within(() => {
        cy.fillStripeElement('4242424242424242', '12/25', '123');
      });
    
    // Submit
    cy.get('[data-testid="submit-button"]').click();
    
    // Verify success
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome to HarborList');
  });
});

// Test sub-account management
describe('Sub-Account Management', () => {
  beforeEach(() => {
    cy.loginAsDealer('dealer@test.com', 'password');
  });
  
  it('should create and manage sub-account', () => {
    // Navigate to sub-accounts
    cy.visit('/dealer/sub-accounts');
    
    // Create sub-account
    cy.get('[data-testid="create-sub-account"]').click();
    cy.get('[data-testid="sub-account-email"]').type('sub@test.com');
    cy.get('[data-testid="sub-account-name"]').type('Sub User');
    cy.get('[data-testid="sub-account-role"]').select('manager');
    cy.get('[data-testid="save-sub-account"]').click();
    
    // Verify sub-account appears in list
    cy.contains('sub@test.com').should('be.visible');
    
    // Edit permissions
    cy.get('[data-testid="edit-sub-account"]').first().click();
    cy.get('[data-testid="permission-analytics"]').check();
    cy.get('[data-testid="save-permissions"]').click();
    
    // Verify update
    cy.contains('Permissions updated').should('be.visible');
  });
});
```

---

## 🚀 Migration Plan

### Existing Dealers Migration

**Step 1: Identify Existing Dealers**
```sql
SELECT * FROM harborlist-users 
WHERE customerTier IN ('dealer', 'premium_dealer')
AND isDealerSubAccount IS NULL OR isDealerSubAccount = false
```

**Step 2: Notify Dealers of New Features**
- Email campaign about business entity features
- Benefits of multi-location management
- Optional upgrade path

**Step 3: Assisted Migration**
- Support team helps dealers set up business entities
- Data validation and cleanup
- Training on new features

**Step 4: Self-Service Conversion**
- "Upgrade to Business Account" button in dealer dashboard
- Wizard to guide through conversion process
- Automatic data migration

### Data Migration Script

```typescript
// scripts/migrate-dealers-to-business.ts
async function migrateDealerToBusiness(dealerId: string) {
  const dealer = await getUser(dealerId);
  
  console.log(`Migrating dealer: ${dealer.email}`);
  
  // Create business entity
  const business = await createBusiness({
    ownerId: dealerId,
    businessName: dealer.name || dealer.email,
    businessType: 'single_location',
    subscriptionTier: dealer.customerTier,
    maxDealerAccounts: 1,
    dealerAccounts: [dealerId]
  });
  
  console.log(`Created business: ${business.businessId}`);
  
  // Update dealer account
  await updateUser(dealerId, {
    businessId: business.businessId,
    businessRole: 'owner',
    isBusinessLocation: true,
    locationName: 'Main Location'
  });
  
  // Update all sub-accounts
  const subAccounts = await listSubAccounts(dealerId);
  for (const subAccount of subAccounts) {
    await updateUser(subAccount.id, {
      businessId: business.businessId
    });
    console.log(`Updated sub-account: ${subAccount.email}`);
  }
  
  console.log(`✅ Migration complete for ${dealer.email}`);
}

// Run migration
async function main() {
  const dealers = await getAllDealers();
  
  for (const dealer of dealers) {
    try {
      await migrateDealerToBusiness(dealer.id);
    } catch (error) {
      console.error(`Failed to migrate ${dealer.email}:`, error);
    }
  }
}
```

---

## 📅 Implementation Timeline

### Month 1: Foundation
- Week 1-2: Phase 1 (Registration & Tier Selection)
- Week 3-4: Phase 2 (Sub-Account UI)

### Month 2: Advanced Features
- Week 5-6: Phase 3 (Invitation System)
- Week 7-8: Phase 4 Part 1 (Business Entity Backend)

### Month 3: Business Features
- Week 9-10: Phase 4 Part 2 (Business Dashboard UI)
- Week 11-12: Phase 5 (Advanced Features)

### Month 4: Testing & Launch
- Week 13-14: Comprehensive testing
- Week 15: Bug fixes and refinements
- Week 16: Soft launch to beta dealers
- Week 17: Full production launch

---

## 📊 Success Metrics

### Technical Metrics
- API response time < 200ms for sub-account operations
- 99.9% uptime for dealer services
- Zero data loss during migrations
- All security audits passed

### Business Metrics
- 80% of new dealer registrations complete payment
- 50% of dealers create at least one sub-account
- 20% of premium dealers upgrade to business entity
- 90% dealer satisfaction score

### User Experience Metrics
- Registration completion rate > 75%
- Average time to create first sub-account < 5 minutes
- Dashboard load time < 2 seconds
- Mobile responsiveness score > 95

---

## 🔄 Next Steps After Implementation

1. **Advanced Analytics**: 
   - Predictive analytics for dealer performance
   - Automated recommendations for sub-account permissions

2. **API Integrations**:
   - Third-party inventory management systems
   - CRM integrations
   - Marketing automation tools

3. **White-Label Solutions**:
   - Custom branding per business
   - Custom domains for dealer portals

4. **Mobile Apps**:
   - Native iOS/Android apps for dealers
   - Sub-account mobile access

5. **AI-Powered Features**:
   - Automated listing optimization
   - Lead scoring and routing
   - Chatbot for customer inquiries

---

## 📝 Appendix

### Pricing Examples

**Standard Dealer ($99/month)**:
- 1 location
- 10 sub-accounts
- Basic analytics
- Email support

**Premium Dealer ($299/month)**:
- Up to 5 locations
- 50 sub-accounts per location
- Advanced analytics
- Priority support
- API access

**Enterprise (Custom)**:
- Unlimited locations
- Custom sub-account limits
- Dedicated account manager
- Custom integrations
- SLA guarantees

### Support Plan

- Documentation portal with guides
- Video tutorials for common tasks
- Live chat support during business hours
- Dedicated Slack channel for premium dealers
- Monthly webinars on new features

### Rollback Plan

If issues arise:
1. Feature flags allow instant disable of new features
2. Database rollback scripts prepared
3. Previous API versions maintained for 3 months
4. Manual data recovery procedures documented
5. Communication plan for affected users

---

**Document Status**: ✅ Ready for Review  
**Last Updated**: October 20, 2025  
**Next Review**: After Phase 1 Completion
