# Dealer Account Scenarios and Use Cases
## HarborList Marketplace - Comprehensive Scenario Documentation

**Version:** 1.0  
**Date:** October 20, 2025  
**Purpose:** Detailed scenarios for single and multi-account dealer implementations

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Scenario 1: Single Account Dealer](#scenario-1-single-account-dealer)
3. [Scenario 2: Multi-Location Dealer](#scenario-2-multi-location-dealer)
4. [Scenario 3: Dealer Group/Network](#scenario-3-dealer-groupnetwork)
5. [Scenario 4: Franchise Operations](#scenario-4-franchise-operations)
6. [Scenario 5: Dealer Migration Stories](#scenario-5-dealer-migration-stories)
7. [Edge Cases and Special Situations](#edge-cases-and-special-situations)
8. [Customer Journey Maps](#customer-journey-maps)

---

## 🎯 Overview

This document provides detailed, real-world scenarios for how dealers will use the HarborList platform. Each scenario includes:

- **Business Context**: Why this scenario exists
- **User Stories**: From the perspective of different users
- **Technical Implementation**: How the system supports this scenario
- **Data Flow**: How information moves through the system
- **Success Criteria**: What makes this scenario successful

---

## 📍 Scenario 1: Single Account Dealer

### Business Context

**Profile: "Seaside Boats" - Independent Dealer**

- **Location**: Charleston, SC
- **Size**: Small dealership, 5 employees
- **Inventory**: 20-30 boats at any time
- **Annual Sales**: ~$2M
- **Team Structure**: Owner, Sales Manager, 2 Sales Reps, Office Admin

### User Stories

#### Story 1.1: Owner Registration

**As** Sarah (Owner of Seaside Boats)  
**I want** to create a dealer account with sub-accounts for my team  
**So that** we can manage our listings collaboratively while I maintain control

**Journey**:

1. **Discovery**: Sarah searches "boat marketplace for dealers" and finds HarborList
2. **Registration**:
   ```
   Visit: https://harborlist.com/register
   - Selects "Dealer Account" tier
   - Enters business information:
     * Business Name: "Seaside Boats"
     * Email: sarah@seasideboats.com
     * Phone: (843) 555-0123
     * Address: 123 Marina Way, Charleston, SC 29401
   - Reviews pricing: $99/month for up to 10 sub-accounts
   - Enters payment information (Stripe)
   - Accepts terms and conditions
   - Submits registration
   ```

3. **Email Verification**:
   ```
   Receives email: "Welcome to HarborList - Verify Your Account"
   - Clicks verification link
   - Redirected to onboarding wizard
   ```

4. **Onboarding**:
   ```
   Step 1: Business Profile Setup
   - Upload logo
   - Add business description
   - Set business hours
   - Add social media links
   
   Step 2: Payment Confirmation
   - Review subscription details
   - Confirm billing information
   
   Step 3: Get Started Tutorial
   - Quick tour of dealer dashboard
   - Introduction to sub-account features
   ```

5. **First Actions**:
   - Create first listing
   - Invite Sales Manager as first sub-account

**Database State After Registration**:
```json
{
  "id": "dealer-ss-001",
  "email": "sarah@seasideboats.com",
  "name": "Sarah Johnson",
  "customerTier": "dealer",
  "businessInfo": {
    "businessName": "Seaside Boats",
    "address": {
      "street": "123 Marina Way",
      "city": "Charleston",
      "state": "SC",
      "zip": "29401"
    },
    "phone": "(843) 555-0123",
    "logo": "https://cdn.harborlist.com/dealers/ss-001/logo.png"
  },
  "canCreateSubAccounts": true,
  "maxSubAccounts": 10,
  "currentSubAccountCount": 0,
  "stripeCustomerId": "cus_abc123",
  "stripeSubscriptionId": "sub_def456",
  "status": "active",
  "createdAt": "2025-10-20T10:00:00Z"
}
```

#### Story 1.2: Creating Sub-Accounts

**As** Sarah (Owner)  
**I want** to create sub-accounts for my team  
**So that** they can manage listings within their assigned roles

**Team Structure to Implement**:
```
Sarah (Owner - Main Account)
├── Mike (Sales Manager - Admin Sub-Account)
├── Jessica (Sales Rep - Manager Sub-Account)
├── Tom (Sales Rep - Manager Sub-Account)
└── Linda (Office Admin - Staff Sub-Account)
```

**Creating Sales Manager (Mike)**:

1. **Navigate to Sub-Accounts**:
   ```
   Dashboard → Sub-Accounts → Create New
   ```

2. **Fill Sub-Account Form**:
   ```
   Email: mike@seasideboats.com
   Name: Mike Thompson
   Role: Admin
   
   Access Scope:
   ✅ All Listings
   ✅ Leads & Inquiries
   ✅ Analytics Dashboard
   ✅ Inventory Management
   ✅ Pricing Updates
   ✅ Customer Communications
   ✅ Manage Sub-Accounts
   
   Delegated Permissions:
   ✅ manage_listings
   ✅ create_listings
   ✅ edit_listings
   ✅ delete_listings
   ✅ view_analytics
   ✅ respond_to_leads
   ✅ manage_inventory
   ✅ update_pricing
   ✅ manage_communications
   ✅ manage_sub_accounts
   ```

3. **Send Invitation**:
   ```
   Click "Send Invitation Email"
   
   Email to Mike:
   Subject: "You've been invited to join Seaside Boats on HarborList"
   
   Hi Mike,
   
   Sarah Johnson has invited you to join the Seaside Boats team 
   on HarborList as an Admin.
   
   Your access includes:
   - Full management of all boat listings
   - View sales analytics
   - Respond to customer inquiries
   - Manage team members
   
   Click here to accept and set your password:
   https://harborlist.com/invitation/accept/abc123token
   
   This invitation expires in 7 days.
   ```

4. **Mike's Acceptance Flow**:
   ```
   Step 1: Click invitation link
   Step 2: Review permissions
   Step 3: Create password
   Step 4: Accept terms
   Step 5: Complete profile
   Step 6: Redirected to dashboard
   ```

**Database State After Sub-Account Creation**:
```json
{
  "id": "sub-ss-mike-001",
  "email": "mike@seasideboats.com",
  "name": "Mike Thompson",
  "userType": "customer",
  "role": "user",
  "customerTier": "dealer",
  "isDealerSubAccount": true,
  "parentDealerId": "dealer-ss-001",
  "parentDealerName": "Seaside Boats",
  "dealerAccountRole": "admin",
  "delegatedPermissions": [
    "manage_listings", "create_listings", "edit_listings", "delete_listings",
    "view_analytics", "respond_to_leads", "manage_inventory", 
    "update_pricing", "manage_communications", "manage_sub_accounts"
  ],
  "accessScope": {
    "listings": "all",
    "leads": true,
    "analytics": true,
    "inventory": true,
    "pricing": true,
    "communications": true
  },
  "status": "active",
  "emailVerified": true,
  "createdAt": "2025-10-20T14:30:00Z",
  "createdBy": "dealer-ss-001",
  "lastLogin": "2025-10-20T15:00:00Z"
}
```

#### Story 1.3: Sales Rep with Limited Access

**Creating Sales Rep (Jessica)**:

**As** Sarah  
**I want** to give Jessica access to specific boat categories  
**So that** she focuses on her specialty (sailboats)

**Configuration**:
```
Email: jessica@seasideboats.com
Name: Jessica Martinez
Role: Manager

Access Scope:
✅ Specific Listings (Sailboats only)
   - Listing IDs: [list-001, list-003, list-007, list-012]
✅ Leads & Inquiries (for her listings only)
✅ Analytics (limited to her listings)
❌ Inventory Management
✅ Pricing Updates (her listings only)
✅ Customer Communications

Delegated Permissions:
✅ edit_listings (her assigned boats)
✅ create_listings (sailboat category only)
✅ respond_to_leads
✅ view_analytics (filtered)
✅ manage_communications
```

**Real-World Usage**:

1. **Jessica Logs In**:
   ```
   - Sees dashboard with only sailboat listings
   - Cannot see powerboat listings
   - Analytics show only her boat performance
   ```

2. **Jessica Creates New Listing**:
   ```
   Click "Create Listing"
   - Boat category dropdown shows only "Sailboat"
   - Cannot select other categories
   - Fills out listing details
   - Submits for owner/admin review (workflow)
   ```

3. **Jessica Responds to Lead**:
   ```
   New inquiry comes in for one of her sailboats
   - Notification: "New lead for Catalina 30"
   - Opens inquiry
   - Responds to customer questions
   - Schedules showing
   - Updates lead status
   ```

4. **Jessica Tries Unauthorized Action**:
   ```
   Attempts to view powerboat listing
   → Error: "You don't have access to this listing"
   
   Attempts to delete listing
   → Button not visible (UI enforced)
   
   API call intercepted by authorization middleware
   → 403 Forbidden
   ```

#### Story 1.4: Office Admin with Minimal Access

**Creating Office Admin (Linda)**:

**As** Sarah  
**I want** Linda to handle customer communications and basic edits  
**So that** she can support the sales team without full access

**Configuration**:
```
Email: linda@seasideboats.com
Name: Linda Chen
Role: Staff

Access Scope:
✅ All Listings (view only)
✅ Leads & Inquiries (respond only)
❌ Analytics
❌ Inventory Management
❌ Pricing Updates
✅ Customer Communications

Delegated Permissions:
✅ edit_listings (minor edits only: description, photos)
✅ respond_to_leads
✅ manage_communications

Restrictions:
❌ Cannot change prices
❌ Cannot delete listings
❌ Cannot create new listings
❌ Cannot manage other sub-accounts
```

**Linda's Daily Workflow**:

```
8:00 AM - Log in to HarborList
├── Check pending customer inquiries (15 new)
├── Respond to common questions about listings
├── Schedule showings for sales reps
├── Update listing photos (replace old images)
└── Update listing descriptions (fix typos, add details)

12:00 PM - Lunch break

1:00 PM - Continue customer support
├── Follow up on previous inquiries
├── Send "thank you" emails to viewing customers
├── Update contact information in leads
└── Coordinate with sales team via internal messaging

5:00 PM - End of day
└── Log out
```

### Technical Implementation: Single Account

#### Authorization Flow

```typescript
// When Linda tries to view analytics
GET /api/analytics/listings

→ JWT Authentication ✅
→ Extract user claims
→ Check user.isDealerSubAccount = true
→ Check user.accessScope.analytics = false
→ Return 403 Forbidden

Response:
{
  "error": "Forbidden",
  "message": "You do not have access to analytics",
  "userMessage": "Analytics are not included in your account permissions. 
                  Contact your account administrator for access."
}

// When Jessica edits her assigned sailboat
PUT /api/listings/list-003

→ JWT Authentication ✅
→ Extract user claims
→ Check user.isDealerSubAccount = true
→ Check 'list-003' in user.accessScope.listings ✅
→ Check 'edit_listings' in user.delegatedPermissions ✅
→ Check listing belongs to parent dealer ✅
→ Process update ✅

Response:
{
  "success": true,
  "listing": { updated listing data }
}
```

### Success Metrics: Single Account

**Owner (Sarah) Success**:
- ✅ Created account in < 10 minutes
- ✅ Added all 4 team members
- ✅ Each team member has appropriate access
- ✅ No unauthorized access incidents
- ✅ Increased team efficiency by 40%

**Sub-Account (Mike) Success**:
- ✅ Can perform all admin tasks
- ✅ Manages other sub-accounts effectively
- ✅ Full visibility into business operations

**Sub-Account (Jessica) Success**:
- ✅ Focused on sailboat sales
- ✅ No confusion with other inventory
- ✅ Efficient lead management

**Sub-Account (Linda) Success**:
- ✅ Handles customer communications effectively
- ✅ Cannot accidentally change prices or delete listings
- ✅ Simple, focused interface

---

## 🏢 Scenario 2: Multi-Location Dealer

### Business Context

**Profile: "Premium Marine Group" - Multi-Location Dealer**

- **Locations**: 3 (Miami, Fort Lauderdale, Tampa)
- **Total Employees**: 45
- **Total Inventory**: 200+ boats
- **Annual Sales**: $25M
- **Structure**: Corporate ownership with location managers

### User Stories

#### Story 2.1: Setting Up Business Entity

**As** David (Owner/CEO of Premium Marine Group)  
**I want** to manage all three locations under one business  
**So that** I have consolidated oversight and billing

**Initial Setup**:

1. **Register First Location** (Miami):
   ```
   - David registers as Premium Dealer
   - Email: david@premiummarinegroup.com
   - Creates Miami location
   - Tier: Premium Dealer ($299/month)
   - Includes: 50 sub-accounts per location
   ```

2. **Upgrade to Business Entity**:
   ```
   Dashboard → Settings → "Upgrade to Business Account"
   
   Business Information:
   - Legal Name: "Premium Marine Group, LLC"
   - DBA: "Premium Marine Group"
   - Tax ID: 12-3456789
   - Business Type: Multi-Location Dealership
   
   Number of Locations: 3
   
   Pricing Calculation:
   Base: $299/month × 3 locations = $897/month
   Discount: 10% for multi-location = -$90
   Total: $807/month
   
   Features Included:
   ✅ 3 dealer accounts (locations)
   ✅ 50 sub-accounts per location (150 total)
   ✅ Consolidated billing
   ✅ Cross-location reporting
   ✅ Listing transfers between locations
   ✅ Shared inventory view
   ✅ Business-wide analytics
   ```

3. **Add Additional Locations**:
   ```
   Business Dashboard → Locations → Add Location
   
   Location 2: Fort Lauderdale
   - Address: 456 Coastal Blvd, Fort Lauderdale, FL 33301
   - Manager: Robert Chen (robert@premiummarinegroup.com)
   - Phone: (954) 555-0234
   
   Location 3: Tampa
   - Address: 789 Bay Street, Tampa, FL 33602
   - Manager: Maria Rodriguez (maria@premiummarinegroup.com)
   - Phone: (813) 555-0345
   ```

**Database Structure After Setup**:

```json
// Business Entity
{
  "businessId": "business-pmg-001",
  "businessName": "Premium Marine Group",
  "businessType": "multi_location",
  "ownerId": "dealer-pmg-miami-001",
  "ownerEmail": "david@premiummarinegroup.com",
  "legalName": "Premium Marine Group, LLC",
  "taxId": "12-3456789",
  
  "subscriptionTier": "premium_dealer",
  "subscriptionStatus": "active",
  "billingAmount": 807.00,
  "billingInterval": "monthly",
  "stripeCustomerId": "cus_pmg_001",
  "stripeSubscriptionId": "sub_pmg_001",
  
  "maxDealerAccounts": 3,
  "maxSubAccountsPerLocation": 50,
  "totalSubAccountsLimit": 150,
  "dealerAccountIds": [
    "dealer-pmg-miami-001",
    "dealer-pmg-ftl-002",
    "dealer-pmg-tampa-003"
  ],
  
  "currentDealerAccountCount": 3,
  "currentTotalSubAccountCount": 42,
  
  "features": {
    "crossLocationReporting": true,
    "consolidatedBilling": true,
    "transferListings": true,
    "sharedInventory": true,
    "businessAnalytics": true
  },
  
  "createdAt": "2025-10-01T00:00:00Z",
  "updatedAt": "2025-10-20T00:00:00Z"
}

// Miami Location (Dealer Account)
{
  "id": "dealer-pmg-miami-001",
  "email": "miami@premiummarinegroup.com",
  "name": "Premium Marine - Miami",
  "customerTier": "premium_dealer",
  
  "businessId": "business-pmg-001",
  "businessRole": "location_manager",
  "isBusinessLocation": true,
  
  "locationName": "Miami Showroom",
  "locationAddress": {
    "street": "123 Ocean Drive",
    "city": "Miami",
    "state": "FL",
    "zip": "33139",
    "coordinates": { "lat": 25.7617, "lon": -80.1918 }
  },
  "locationPhone": "(305) 555-0123",
  "locationManager": "David Miller",
  
  "canCreateSubAccounts": true,
  "maxSubAccounts": 50,
  "currentSubAccountCount": 18,
  
  "status": "active",
  "createdAt": "2025-10-01T00:00:00Z"
}

// Fort Lauderdale Location
{
  "id": "dealer-pmg-ftl-002",
  "email": "ftl@premiummarinegroup.com",
  "name": "Premium Marine - Fort Lauderdale",
  "customerTier": "premium_dealer",
  
  "businessId": "business-pmg-001",
  "businessRole": "location_manager",
  "isBusinessLocation": true,
  
  "locationName": "Fort Lauderdale Marina",
  "locationAddress": {
    "street": "456 Coastal Blvd",
    "city": "Fort Lauderdale",
    "state": "FL",
    "zip": "33301"
  },
  "locationManager": "Robert Chen",
  
  "maxSubAccounts": 50,
  "currentSubAccountCount": 12
}

// Tampa Location
{
  "id": "dealer-pmg-tampa-003",
  "email": "tampa@premiummarinegroup.com",
  "name": "Premium Marine - Tampa",
  "customerTier": "premium_dealer",
  
  "businessId": "business-pmg-001",
  "businessRole": "location_manager",
  "isBusinessLocation": true,
  
  "locationName": "Tampa Bay Center",
  "locationAddress": {
    "street": "789 Bay Street",
    "city": "Tampa",
    "state": "FL",
    "zip": "33602"
  },
  "locationManager": "Maria Rodriguez",
  
  "maxSubAccounts": 50,
  "currentSubAccountCount": 12
}
```

#### Story 2.2: Location Manager Operations

**As** Robert (Fort Lauderdale Location Manager)  
**I want** to manage my location independently  
**So that** I can run my operation efficiently while the CEO maintains oversight

**Robert's Daily Operations**:

```
1. Location-Specific Dashboard
   Dashboard shows:
   - Fort Lauderdale inventory only (default view)
   - Fort Lauderdale sub-accounts (12 people)
   - Fort Lauderdale leads and analytics
   - Option to view other locations (if permitted)

2. Managing Local Sub-Accounts
   - Create sub-accounts for FTL salespeople
   - Each sub-account tied to FTL location
   - Cannot create sub-accounts for other locations
   - Cannot modify Miami or Tampa sub-accounts

3. Inventory Management
   - Full control over FTL listings
   - Can create, edit, delete FTL listings
   - Cannot modify Miami or Tampa listings
   - Can request listing transfers from other locations

4. Lead Management
   - Views leads for FTL listings
   - Responds to FTL customer inquiries
   - Can route leads to appropriate salesperson
   - Cannot see other location's leads

5. Analytics
   - FTL performance metrics
   - FTL sales data
   - FTL team performance
   - Optional: compare to other locations (if CEO grants access)
```

**Example: Creating Sub-Account at FTL Location**:

```
Robert logs in → FTL Dashboard → Sub-Accounts → Create New

Sub-Account Details:
- Email: sarah.jones@premiummarinegroup.com
- Name: Sarah Jones
- Role: Manager
- Location: Fort Lauderdale (auto-filled, cannot change)

Access Scope:
✅ All FTL Listings
✅ FTL Leads
✅ FTL Analytics
❌ Miami Listings (not available)
❌ Tampa Listings (not available)

Save → Send Invitation
```

**Database Record**:
```json
{
  "id": "sub-pmg-ftl-sarah-001",
  "email": "sarah.jones@premiummarinegroup.com",
  "name": "Sarah Jones",
  "isDealerSubAccount": true,
  "parentDealerId": "dealer-pmg-ftl-002",
  "businessId": "business-pmg-001",
  "locationName": "Fort Lauderdale Marina",
  "dealerAccountRole": "manager",
  "accessScope": {
    "listings": "all",  // All FTL listings
    "leads": true,
    "analytics": true
  }
}
```

#### Story 2.3: CEO Cross-Location Oversight

**As** David (CEO/Owner)  
**I want** to view and manage all locations  
**So that** I can oversee the entire business

**David's Business Dashboard**:

```
Business Overview
├── Total Locations: 3
├── Total Sub-Accounts: 42/150
├── Total Active Listings: 187
├── Total Leads This Month: 342
└── Total Revenue (Last 30 Days): $2.4M

Location Performance Comparison:
┌─────────────────┬──────────┬──────────┬───────────┐
│ Location        │ Listings │ Leads    │ Revenue   │
├─────────────────┼──────────┼──────────┼───────────┤
│ Miami           │ 78       │ 156      │ $1.1M     │
│ Fort Lauderdale │ 54       │ 98       │ $680K     │
│ Tampa           │ 55       │ 88       │ $620K     │
└─────────────────┴──────────┴──────────┴───────────┘

Quick Actions:
[View All Locations] [Consolidated Analytics] [Transfer Listings]
[Manage Members] [Business Settings] [Billing]
```

**Consolidated Analytics View**:

```
Filter: [All Locations ▼] [Last 30 Days ▼]

Sales Performance:
- Total Sales: $2.4M
- Average Sale Price: $85,000
- Conversion Rate: 12.3%

Top Performers by Location:
Miami:
  1. Tom Wilson - $320K (8 boats)
  2. Amanda Lee - $280K (7 boats)

Fort Lauderdale:
  1. Sarah Jones - $195K (5 boats)
  2. Mike Patterson - $175K (4 boats)

Tampa:
  1. Carlos Martinez - $220K (6 boats)
  2. Jennifer White - $180K (5 boats)

Inventory Insights:
- Most Popular Category: Center Consoles (62 listings)
- Fastest Moving: Boats $50K-$100K (avg 18 days to sell)
- Slowest Moving: Luxury Yachts >$500K (avg 142 days to sell)
```

#### Story 2.4: Transferring Listing Between Locations

**Scenario**: Miami has a customer interested in a boat that's at the Tampa location

**As** Tom (Miami Sales Manager)  
**I want** to transfer a Tampa listing to Miami  
**So that** I can close the sale with my local customer

**Transfer Process**:

1. **Identify Target Listing**:
   ```
   Tom searches inventory across all locations
   - Views "Sea Ray 350 Sundancer" at Tampa location
   - Customer wants to view it in Miami
   - Initiates transfer request
   ```

2. **Request Transfer**:
   ```
   Listing Details → Actions → Request Transfer
   
   Transfer Request Form:
   - From: Tampa Bay Center
   - To: Miami Showroom
   - Reason: Customer request - local inspection preferred
   - Delivery Timeline: 3-5 business days
   - Notes: Customer pre-approved for financing, ready to purchase
   
   [Submit Request]
   ```

3. **Approval Flow**:
   ```
   Notification sent to:
   ✉ Tampa Location Manager (Maria) - Source approval
   ✉ Miami Location Manager (David) - Destination approval
   ✉ CEO (David) - Final approval
   
   Maria (Tampa) receives:
   "Transfer Request: Sea Ray 350 Sundancer to Miami"
   [Approve] [Deny] [Request More Info]
   
   Maria clicks Approve with note:
   "Boat is ready, will coordinate transport. Good luck with the sale!"
   ```

4. **Execute Transfer**:
   ```
   System updates:
   - Listing owner: Tampa → Miami
   - Listing location: Tampa coordinates → Miami coordinates
   - Adds transfer history:
     {
       "transferId": "transfer-001",
       "fromLocationId": "dealer-pmg-tampa-003",
       "toLocationId": "dealer-pmg-miami-001",
       "transferredAt": "2025-10-20T14:30:00Z",
       "transferredBy": "sub-pmg-miami-tom-001",
       "approvedBy": ["dealer-pmg-tampa-003", "dealer-pmg-miami-001"],
       "reason": "Customer request",
       "status": "completed"
     }
   
   - Notifications sent to:
     * Tom (Miami): "Transfer approved! Boat en route."
     * Tampa inventory team: "Sea Ray departing for Miami"
     * Logistics: "Schedule transport"
   ```

5. **Post-Transfer**:
   ```
   - Boat appears in Miami inventory
   - Miami team can now show to customer
   - Tampa's listing count decrements
   - Miami's listing count increments
   - Analytics reflect the transfer
   - Commission split rules apply (configurable)
   ```

**Database Update**:
```json
// Before Transfer
{
  "listingId": "listing-tampa-sr350-001",
  "ownerId": "dealer-pmg-tampa-003",
  "location": {
    "city": "Tampa",
    "coordinates": { "lat": 27.9506, "lon": -82.4572 }
  }
}

// After Transfer
{
  "listingId": "listing-tampa-sr350-001",
  "ownerId": "dealer-pmg-miami-001",  // ← Changed
  "location": {
    "city": "Miami",  // ← Changed
    "coordinates": { "lat": 25.7617, "lon": -80.1918 }  // ← Changed
  },
  "transferHistory": [
    {
      "from": "dealer-pmg-tampa-003",
      "to": "dealer-pmg-miami-001",
      "date": "2025-10-20T14:30:00Z",
      "requestedBy": "sub-pmg-miami-tom-001",
      "reason": "Customer request"
    }
  ]
}
```

### Success Metrics: Multi-Location

**Business Owner (David) Success**:
- ✅ Single dashboard for all 3 locations
- ✅ Consolidated billing ($807/month vs $897 separate)
- ✅ 15% improvement in inventory turnover via transfers
- ✅ Clear visibility into each location's performance

**Location Managers Success**:
- ✅ Independence in managing their location
- ✅ Ability to collaborate cross-location
- ✅ Streamlined hiring with instant sub-account creation

**Sales Team Success**:
- ✅ Access to company-wide inventory
- ✅ Seamless transfers for customer needs
- ✅ Better customer service with more options

---

## 🏢 Scenario 3: Dealer Group/Network

### Business Context

**Profile: "Coastal Boat Dealers Network" - Franchise Network**

- **Structure**: 12 independent franchises
- **Geographic Coverage**: East Coast (Maine to Florida)
- **Total Employees**: 300+
- **Annual Network Sales**: $150M
- **Network Benefits**: Shared marketing, training, inventory sourcing

### Network Architecture

```
Coastal Boat Dealers Network (Network Entity)
│
├── New England Region
│   ├── Portland Marine (Portland, ME)
│   ├── Boston Boat Works (Boston, MA)
│   └── Newport Yachts (Newport, RI)
│
├── Mid-Atlantic Region
│   ├── New York Marine (New York, NY)
│   ├── Philly Boats (Philadelphia, PA)
│   └── Baltimore Marine (Baltimore, MD)
│
├── Southeast Region
│   ├── Charleston Boats (Charleston, SC)
│   ├── Savannah Marine (Savannah, GA)
│   ├── Jacksonville Boats (Jacksonville, FL)
│   └── Miami Luxury Yachts (Miami, FL)
│
└── Gulf Coast Region
    ├── Tampa Bay Boats (Tampa, FL)
    └── Gulf Coast Marine (Mobile, AL)
```

### User Stories

#### Story 3.1: Network Administrator Setup

**As** Frank (Network Operations Director)  
**I want** to manage the entire franchise network  
**So that** franchisees benefit from collective infrastructure

**Network Setup Process**:

1. **Create Network Entity**:
   ```
   Register as: Network Administrator
   Network Type: Franchise Network
   
   Network Information:
   - Name: Coastal Boat Dealers Network
   - Founded: 1985
   - Headquarters: Charleston, SC
   - Tax ID: 98-7654321
   - Network Size: 12 franchises
   
   Network Services:
   ✅ Shared technology platform
   ✅ Collective marketing
   ✅ Training programs
   ✅ Inventory sourcing
   ✅ Brand management
   ✅ Network-wide analytics
   ```

2. **Onboard Franchisees**:
   ```
   For each franchise:
   
   Step 1: Send franchise invitation
   - Email franchise owner
   - Include network benefits
   - Provide registration link with network code
   
   Step 2: Franchise accepts invitation
   - Registers their business entity
   - Links to network
   - Maintains independent billing
   - Gets access to network resources
   
   Step 3: Configure franchise
   - Set location details
   - Upload branding (within network guidelines)
   - Configure team structure
   - Connect to network inventory
   ```

**Database Structure**:

```json
// Network Entity
{
  "networkId": "network-cbd-001",
  "networkName": "Coastal Boat Dealers Network",
  "networkType": "franchise",
  "headquartersLocation": {
    "city": "Charleston",
    "state": "SC"
  },
  
  "adminIds": [
    "network-admin-frank-001",
    "network-admin-susan-002"
  ],
  
  "franchiseIds": [
    "business-portland-001",
    "business-boston-002",
    // ... 10 more
  ],
  
  "networkFeatures": {
    "sharedInventory": true,
    "networkMarketing": true,
    "trainingPrograms": true,
    "networkAnalytics": true,
    "brandManagement": true,
    "inventorySourcing": true
  },
  
  "brandingGuidelines": {
    "logoUsage": "https://cdn.harborlist.com/networks/cbd/brand-guide.pdf",
    "colorScheme": {
      "primary": "#003d5c",
      "secondary": "#ff6b35"
    },
    "requiredDisclaimer": "Member of Coastal Boat Dealers Network"
  },
  
  "totalFranchises": 12,
  "totalLocations": 18,  // Some franchises have multiple locations
  "totalEmployees": 300,
  
  "createdAt": "2024-01-15T00:00:00Z"
}

// Individual Franchise (Business Entity)
{
  "businessId": "business-portland-001",
  "businessName": "Portland Marine",
  "businessType": "franchise",
  
  "networkId": "network-cbd-001",
  "networkMemberSince": "2024-02-01T00:00:00Z",
  "franchiseAgreement": {
    "signedDate": "2024-01-20T00:00:00Z",
    "expiresDate": "2034-01-20T00:00:00Z",
    "royaltyPercentage": 5.0,
    "marketingFeePercentage": 2.0
  },
  
  "ownerId": "dealer-portland-owner-001",
  "ownerName": "Bill Thompson",
  "ownerEmail": "bill@portlandmarine.com",
  
  "dealerAccountIds": [
    "dealer-portland-main-001",
    "dealer-portland-south-002"
  ],
  
  "subscriptionTier": "premium_dealer",
  "billingEmail": "billing@portlandmarine.com",
  "stripeCustomerId": "cus_portland_001",
  
  // Independent billing (not through network)
  "billingIndependent": true,
  "monthlyFees": {
    "harborlistSubscription": 299.00,
    "networkRoyalty": 2500.00,  // Paid to network
    "networkMarketing": 1000.00  // Paid to network
  }
}
```

#### Story 3.2: Shared Inventory System

**As** a franchisee sales rep  
**I want** to search inventory across all network locations  
**So that** I can find the perfect boat for my customer

**Scenario**: Customer in Portland wants a specific boat

1. **Customer Request**:
   ```
   Customer walks into Portland Marine:
   "I'm looking for a 2022 Boston Whaler 330 Outrage with twin Mercury engines."
   
   Sales Rep (Amy) checks local inventory:
   - Portland has 0 matches
   - Portland has similar models but not exact match
   ```

2. **Network Inventory Search**:
   ```
   Amy: Dashboard → Network Inventory → Advanced Search
   
   Search Criteria:
   - Manufacturer: Boston Whaler
   - Model: 330 Outrage
   - Year: 2022
   - Engine: Mercury (twin)
   - Network: Coastal Boat Dealers
   
   Results (3 matches):
   1. Boston Boat Works (Boston, MA)
      - 2022 Boston Whaler 330 Outrage
      - Twin Mercury 300hp
      - Price: $315,000
      - Condition: Excellent
      - Availability: In stock
      
   2. Charleston Boats (Charleston, SC)
      - 2022 Boston Whaler 330 Outrage
      - Twin Mercury 250hp  ← Not exact match
      - Price: $285,000
      
   3. Miami Luxury Yachts (Miami, FL)
      - 2022 Boston Whaler 330 Outrage
      - Twin Mercury 300hp
      - Price: $325,000
      - Condition: Like new, low hours
   ```

3. **Network Transfer Process**:
   ```
   Amy contacts Boston Boat Works:
   
   Internal Network Message:
   From: Amy (Portland Marine)
   To: Mike (Boston Boat Works Sales Manager)
   Subject: Network Transfer Request - Boston Whaler 330
   
   "Hi Mike,
   
   I have a qualified buyer in Portland interested in your 2022 
   Boston Whaler 330 Outrage (Listing #12345). Customer is 
   pre-approved for financing and ready to purchase.
   
   Would you be willing to transfer this boat to Portland Marine?
   We can arrange transport and handle all logistics.
   
   Network commission split: 60/40 (us/you) per standard agreement.
   
   Let me know!
   Amy"
   
   Mike responds:
   "Approved! Boat is ready. Will coordinate with logistics."
   ```

4. **Network Commission Structure**:
   ```
   Sale Price: $315,000
   
   Commission Breakdown:
   - Total Commission: $31,500 (10% of sale price)
   
   Split:
   - Portland Marine (selling dealer): 60% = $18,900
   - Boston Boat Works (sourcing dealer): 40% = $12,600
   
   Network Fees:
   - Network royalty (5% of sale): $15,750
   - Paid by selling dealer (Portland)
   
   Portland Marine Net:
   Sale: $315,000
   - Cost of boat: $285,000 (negotiated with Boston)
   - Network royalty: $15,750
   = Net profit: $14,250
   
   Boston Boat Works Net:
   Received: $285,000 (from Portland)
   - Their cost: $270,000
   = Net profit: $15,000
   ```

#### Story 3.3: Network-Wide Training and Resources

**As** a franchise owner  
**I want** access to network training and marketing  
**So that** my team is aligned with network standards

**Network Resources Portal**:

```
Network Dashboard → Resources

Training Programs:
├── Sales Training
│   ├── "Selling Premium Boats" (Video Course)
│   ├── "Customer Relationship Management" (Live Webinar)
│   └── "Financing Options Guide" (PDF)
│
├── Product Knowledge
│   ├── Manufacturer Certifications
│   ├── Boat Specifications Database
│   └── Competitive Comparisons
│
└── Operational Training
    ├── "Using HarborList Platform" (Tutorial)
    ├── "Network Inventory Search" (Guide)
    └── "Transfer Process" (Video)

Marketing Resources:
├── Email Templates
├── Social Media Graphics
├── Print Materials (Brochures, Flyers)
├── Video Ads
└── Network Brand Guidelines

Network Meetings:
├── Monthly Franchise Call (Next: Oct 25, 2:00 PM ET)
├── Quarterly Regional Meetings
└── Annual Network Conference (Miami, March 2026)

Support:
├── Network Help Desk: support@coastalboatdealers.com
├── Technical Support: tech@coastalboatdealers.com
└── Franchise Relations: frank@coastalboatdealers.com
```

#### Story 3.4: Network Analytics and Benchmarking

**As** Frank (Network Director)  
**I want** to see performance across all franchises  
**So that** I can identify best practices and areas for improvement

**Network Analytics Dashboard**:

```
Coastal Boat Dealers Network - Performance Dashboard
Period: Q3 2025 (July - September)

Network Overview:
├── Total Revenue: $38.5M
├── Total Units Sold: 487
├── Average Sale Price: $79,035
├── Network Growth: +12.3% YoY
└── Customer Satisfaction: 4.7/5.0

Top Performing Franchises:
1. Miami Luxury Yachts
   Revenue: $8.2M | Units: 42 | Avg: $195,238
   
2. Boston Boat Works
   Revenue: $6.8M | Units: 78 | Avg: $87,179
   
3. Charleston Boats
   Revenue: $5.1M | Units: 89 | Avg: $57,303

Regional Performance:
┌────────────────┬──────────┬───────┬────────────┐
│ Region         │ Revenue  │ Units │ Avg Price  │
├────────────────┼──────────┼───────┼────────────┤
│ Southeast      │ $15.2M   │ 198   │ $76,768    │
│ New England    │ $12.4M   │ 142   │ $87,324    │
│ Mid-Atlantic   │ $8.6M    │ 108   │ $79,630    │
│ Gulf Coast     │ $2.3M    │ 39    │ $58,974    │
└────────────────┴──────────┴───────┴────────────┘

Network Transfers:
├── Total Transfers: 47
├── Transfer Success Rate: 89%
├── Average Transfer Time: 5.2 days
└── Most Active Route: Boston → Miami (12 transfers)

Customer Insights:
├── Most Popular Category: Center Consoles (38%)
├── Fastest Growing Segment: Electric/Hybrid (+45%)
├── Average Time to Sale: 32 days
└── Lead Conversion Rate: 14.2%

Best Practices Identified:
✅ Boston Boat Works: Virtual tours increase closing rate by 23%
✅ Miami Luxury Yachts: White-glove delivery service
✅ Charleston Boats: Trade-in program drives repeat business
```

### Success Metrics: Network

**Network Administrator Success**:
- ✅ 12 franchises onboarded
- ✅ $150M annual network sales
- ✅ 15% increase in franchisee profitability
- ✅ Network resource usage: 85%

**Franchise Owner Success**:
- ✅ Access to 10x inventory through network
- ✅ Increased sales from network transfers
- ✅ Reduced marketing costs through shared resources
- ✅ Ongoing training and support

**Customer Success**:
- ✅ More boat options available locally
- ✅ Consistent experience across network
- ✅ Better pricing through network efficiency

---

## 🚨 Edge Cases and Special Situations

### Edge Case 1: Sub-Account Limit Reached

**Scenario**: Dealer tries to create 11th sub-account on standard tier (max 10)

**System Behavior**:
```
Error Message:
"Sub-Account Limit Reached

You have reached your limit of 10 sub-accounts on the Dealer tier.

Options:
1. Upgrade to Premium Dealer (50 sub-accounts) for $299/month
2. Remove an inactive sub-account to make room
3. Contact sales for custom enterprise plan

[Upgrade Now] [Manage Sub-Accounts] [Contact Sales]"
```

### Edge Case 2: Sub-Account Switching Dealers

**Scenario**: Employee moves from Miami location to Tampa location

**Process**:
```
1. Miami manager suspends sub-account
2. System sends notification to business owner
3. Business owner approves transfer
4. Tampa manager receives new sub-account request
5. Tampa manager reactivates with Tampa permissions
6. Employee keeps same login credentials
7. Access scope automatically updates to Tampa inventory
```

### Edge Case 3: Dealer Downgrade with Too Many Sub-Accounts

**Scenario**: Premium dealer (50 sub-accounts) wants to downgrade to standard (10 max) but has 23 active sub-accounts

**System Behavior**:
```
Downgrade Warning:
"Cannot Complete Downgrade

You currently have 23 active sub-accounts, but the Dealer tier 
allows a maximum of 10 sub-accounts.

To proceed with downgrade:
1. Archive or remove 13 sub-accounts
2. Current sub-accounts: [View List]
3. Identify which sub-accounts to keep (10 max)

Alternatively:
- Keep Premium Dealer tier
- Contact sales about custom pricing

[View Sub-Accounts] [Keep Premium] [Contact Sales]"
```

### Edge Case 4: Business Entity Deletion

**Scenario**: Business wants to dissolve entity and convert locations to independent dealers

**Process**:
```
1. Business owner initiates dissolution
2. System checks dependencies:
   - Active subscriptions
   - Pending transfers
   - Shared inventory
   - Outstanding invoices

3. Conversion plan:
   Each location becomes independent:
   - Location 1: Becomes standalone dealer account
   - Location 2: Becomes standalone dealer account  
   - Location 3: Becomes standalone dealer account

4. Data migration:
   - Sub-accounts remain with parent location
   - Listings remain with owning location
   - Analytics history preserved
   - Business entity archived (not deleted)

5. Billing updates:
   - Business subscription canceled
   - Each location gets individual subscription
   - Pro-rated charges calculated
   - New billing setup for each location

6. Confirmation required from:
   ✓ Business owner
   ✓ Each location manager
   ✓ HarborList admin review
```

---

## 🗺️ Customer Journey Maps

### Journey 1: New Dealer Registration to First Sale

```
Day 1: Discovery & Registration
├── 9:00 AM: Dealer hears about HarborList from industry contact
├── 10:30 AM: Visits harborlist.com, explores dealer features
├── 2:00 PM: Registers as dealer, enters payment info
├── 2:15 PM: Receives welcome email with setup guide
└── 3:00 PM: Completes business profile

Day 2: Setup & Configuration
├── 9:00 AM: Watches platform tutorial videos
├── 10:00 AM: Creates first listing (test boat)
├── 11:00 AM: Invites sales manager as first sub-account
├── 2:00 PM: Sales manager accepts invitation
└── 3:00 PM: Together, they create 5 more listings

Day 3-7: Team Onboarding
├── Creates remaining sub-accounts
├── Assigns specific boats to each sales rep
├── Configures permissions and access scope
├── Team starts responding to leads
└── First showing scheduled

Day 8: First Sale!
├── Customer visited through HarborList search
├── Sales rep conducted showing
├── Customer submitted offer through platform
├── Dealer accepted offer
├── Listing marked as "sold"
└── Success celebration! 🎉

Day 30: Review & Optimization
├── Review analytics: 12 boats sold
├── Team fully trained and efficient
├── Considering upgrade to premium tier
└── Referring other dealers to HarborList
```

### Journey 2: Multi-Location Expansion

```
Month 1: Single Location Success
├── Operating successfully with one location
├── 15 boats sold per month
├── Team of 8 people
└── Happy with platform

Month 2: Planning Expansion
├── Decides to open second location
├── Contacts HarborList about multi-location
├── Reviews business entity features
└── Plans transition

Month 3: Business Entity Creation
├── Upgrades to business entity
├── Links existing location
├── Creates second location account
├── Hires location manager for new site
└── Trains new team on platform

Month 4: Full Operation
├── Both locations fully operational
├── 25 boats sold across both locations
├── Successful listing transfer between locations
├── Team collaboration across sites
└── Planning third location

Month 6: Network Effect
├── Third location opened
├── Cross-location inventory sharing
├── Consolidated analytics showing growth
├── Revenue up 40% from single-location days
└── Platform became central to operations
```

---

## 📊 Summary Comparison

### Feature Matrix

| Feature | Single Account | Multi-Location | Network |
|---------|---------------|----------------|---------|
| **Locations** | 1 | 2-10 | 10+ |
| **Sub-Accounts per Location** | 10-50 | 10-50 | 10-50 |
| **Consolidated Billing** | N/A | ✅ | Optional |
| **Cross-Location Reporting** | N/A | ✅ | ✅ |
| **Listing Transfers** | N/A | ✅ | ✅ |
| **Shared Inventory View** | N/A | ✅ | ✅ |
| **Network Resources** | ❌ | ❌ | ✅ |
| **Brand Management** | ❌ | ❌ | ✅ |
| **Monthly Cost** | $99-$299 | $807 | Custom |
| **Best For** | Independent dealer | Dealership chain | Franchise network |

---

**Document Status**: ✅ Complete  
**Last Updated**: October 20, 2025  
**Next Review**: After Phase 1 Implementation
