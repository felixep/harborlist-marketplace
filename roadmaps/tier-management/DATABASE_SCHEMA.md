# Database Schema - Tier Management Enhancements

This document outlines all database schema changes needed for the Sales-owned Tier Management system.

---

## 📊 New Tables

### 1. tier-analytics
**Purpose**: Time-series metrics for tier performance tracking  
**Access Pattern**: Query by date and tier for trend analysis

```typescript
{
  // Primary Key
  analyticsId: string,              // HASH: "YYYY-MM-DD#tierId"
  
  // Attributes
  date: string,                     // YYYY-MM-DD
  tierId: string,
  tierName: string,
  tierType: 'individual' | 'dealer',
  isPremium: boolean,
  
  // Subscription Metrics
  activeSubscriptions: number,
  newSubscriptions: number,
  cancellations: number,
  netChange: number,                // new - cancellations
  growthRate: number,               // % change from previous period
  
  // Revenue Metrics
  mrr: number,                      // Monthly Recurring Revenue
  arr: number,                      // Annual Recurring Revenue
  arpu: number,                     // Average Revenue Per User
  
  // Conversion Metrics
  trialSignups: number,
  trialConversions: number,
  conversionRate: number,           // %
  upgradesFromLowerTier: number,
  downgradesFromHigherTier: number,
  
  // Usage Metrics
  avgListingsPerUser: number,
  avgImagesPerListing: number,
  avgLimitUtilization: number,      // % of limits used
  
  // Timestamps
  createdAt: string,
  updatedAt: string,
}

// GSI: DateIndex
// HASH: date, RANGE: tierId
// Purpose: Get all tiers for a specific date

// GSI: TierIndex
// HASH: tierId, RANGE: date
// Purpose: Get time-series data for a specific tier
```

**Sample Query:**
```typescript
// Get last 90 days for Premium Individual tier
const result = await dynamoDB.query({
  TableName: 'tier-analytics',
  IndexName: 'TierIndex',
  KeyConditionExpression: 'tierId = :tid AND #date BETWEEN :start AND :end',
  ExpressionAttributeNames: { '#date': 'date' },
  ExpressionAttributeValues: {
    ':tid': 'premium-individual',
    ':start': '2025-07-20',
    ':end': '2025-10-20'
  }
});
```

---

### 2. tier-transitions
**Purpose**: Track all tier changes for customer journey analysis  
**Access Pattern**: Query by user, tier, or time period

```typescript
{
  // Primary Key
  transitionId: string,             // HASH: UUID
  
  // Transition Details
  userId: string,
  userEmail: string,
  userName: string,
  timestamp: string,                // ISO 8601
  
  // Tier Change
  event: 'signup' | 'upgrade' | 'downgrade' | 'cancel' | 'reactivate' | 'renewal',
  fromTier?: string,                // null for signup
  fromTierName?: string,
  toTier: string,
  toTierName: string,
  
  // Trigger Information
  trigger: {
    type: 'self_service' | 'sales_assisted' | 'automated' | 'promotion' | 'admin_action',
    salesRep?: string,              // If sales-assisted
    promotionId?: string,           // If promotion used
    promotionCode?: string,
    reason?: string,                // Free text
    notes?: string,
  },
  
  // Financial Impact
  previousMRR: number,
  newMRR: number,
  mrrChange: number,
  expectedLifetimeValue: number,
  
  // Metadata
  billingPeriod?: 'monthly' | 'yearly',
  referralSource?: string,
  userAgent?: string,
  ipAddress?: string,
  
  // Timestamps
  createdAt: string,
}

// GSI: UserIndex
// HASH: userId, RANGE: timestamp
// Purpose: Get all transitions for a user

// GSI: ToTierIndex
// HASH: toTier, RANGE: timestamp
// Purpose: Get all users who moved to a tier

// GSI: FromTierIndex
// HASH: fromTier, RANGE: timestamp
// Purpose: Get all users who left a tier

// GSI: EventTypeIndex
// HASH: event, RANGE: timestamp
// Purpose: Get all upgrades, downgrades, etc.

// GSI: SalesRepIndex
// HASH: trigger.salesRep, RANGE: timestamp
// Purpose: Track sales rep performance
```

**Sample Queries:**
```typescript
// Get customer journey for user
const journey = await dynamoDB.query({
  TableName: 'tier-transitions',
  IndexName: 'UserIndex',
  KeyConditionExpression: 'userId = :uid',
  ExpressionAttributeValues: { ':uid': 'user-123' },
  ScanIndexForward: true  // Chronological order
});

// Get all upgrades this month
const upgrades = await dynamoDB.query({
  TableName: 'tier-transitions',
  IndexName: 'EventTypeIndex',
  KeyConditionExpression: 'event = :evt AND #ts >= :start',
  ExpressionAttributeNames: { '#ts': 'timestamp' },
  ExpressionAttributeValues: {
    ':evt': 'upgrade',
    ':start': '2025-10-01T00:00:00Z'
  }
});
```

---

### 3. promotions
**Purpose**: Store promotional campaign definitions  
**Access Pattern**: Query by status, date, or tier

```typescript
{
  // Primary Key
  promotionId: string,              // HASH: UUID
  
  // Basic Info
  name: string,
  description: string,
  internalNotes?: string,
  
  // Discount Configuration
  discountType: 'percentage' | 'fixed_amount' | 'free_trial' | 'extended_trial',
  discountValue: number,
  appliesTo: 'monthly' | 'yearly' | 'both' | 'first_month',
  
  // Targeting
  targetTiers: string[],            // List of eligible tier IDs
  eligibilityRules: {
    userType: 'all' | 'new' | 'existing' | 'churned' | 'custom',
    minAccountAge?: number,         // Days
    maxAccountAge?: number,
    currentTiers?: string[],
    excludeTiers?: string[],
    segments?: string[],
    minLifetimeValue?: number,
    maxLifetimeValue?: number,
  },
  
  // Limitations
  maxRedemptions?: number,          // Total cap
  redemptionsPerUser: number,
  minimumCommitmentMonths?: number,
  stackable: boolean,
  
  // Timing
  startDate: string,
  endDate: string,
  active: boolean,
  autoExpire: boolean,
  
  // Codes
  requiresCode: boolean,
  promotionCodes: string[],         // Multiple codes for same promo
  
  // Tracking Metrics
  redemptionCount: number,
  uniqueUsers: number,
  totalRevenue: number,
  totalDiscount: number,
  conversionRate: number,
  averageDealSize: number,
  
  // Attribution
  createdBy: string,
  createdByName: string,
  approvedBy?: string,
  approvedByName?: string,
  
  // Status
  status: 'draft' | 'pending_approval' | 'active' | 'paused' | 'completed' | 'cancelled',
  
  // Timestamps
  createdAt: string,
  updatedAt: string,
  approvedAt?: string,
  activatedAt?: string,
  completedAt?: string,
}

// GSI: StatusIndex
// HASH: status, RANGE: startDate
// Purpose: Get all active/pending promotions

// GSI: DateRangeIndex
// HASH: active (boolean), RANGE: startDate
// Purpose: Get active promotions in date range

// GSI: CreatorIndex
// HASH: createdBy, RANGE: createdAt
// Purpose: Get promotions by sales rep
```

**Sample Queries:**
```typescript
// Get all active promotions
const active = await dynamoDB.query({
  TableName: 'promotions',
  IndexName: 'StatusIndex',
  KeyConditionExpression: '#status = :status',
  ExpressionAttributeNames: { '#status': 'status' },
  ExpressionAttributeValues: { ':status': 'active' }
});

// Get promotions created by sales rep
const repPromos = await dynamoDB.query({
  TableName: 'promotions',
  IndexName: 'CreatorIndex',
  KeyConditionExpression: 'createdBy = :rep',
  ExpressionAttributeValues: { ':rep': 'sarah@harborlist.com' }
});
```

---

### 4. promotion-redemptions
**Purpose**: Track individual promotion usage  
**Access Pattern**: Query by promotion, user, or date

```typescript
{
  // Primary Key
  redemptionId: string,             // HASH: UUID
  
  // References
  promotionId: string,
  promotionName: string,
  userId: string,
  userEmail: string,
  
  // Redemption Details
  redeemedAt: string,               // ISO 8601
  code?: string,                    // If code was used
  
  // Pricing
  originalPrice: number,
  discountAmount: number,
  finalPrice: number,
  
  // Tier Change
  tierBefore?: string,
  tierAfter: string,
  billingPeriod: 'monthly' | 'yearly',
  
  // Attribution
  salesRep?: string,
  salesRepName?: string,
  referralSource?: string,
  
  // Status
  status: 'active' | 'expired' | 'cancelled',
  expiresAt?: string,               // If time-limited
  
  // Timestamps
  createdAt: string,
}

// GSI: PromotionIndex
// HASH: promotionId, RANGE: redeemedAt
// Purpose: Get all redemptions for a promotion

// GSI: UserIndex
// HASH: userId, RANGE: redeemedAt
// Purpose: Get user's promotion history

// GSI: SalesRepIndex
// HASH: salesRep, RANGE: redeemedAt
// Purpose: Track sales rep conversions

// GSI: DateIndex
// HASH: status, RANGE: redeemedAt
// Purpose: Get redemptions by date
```

**Sample Queries:**
```typescript
// Get all redemptions for a promotion
const redemptions = await dynamoDB.query({
  TableName: 'promotion-redemptions',
  IndexName: 'PromotionIndex',
  KeyConditionExpression: 'promotionId = :pid',
  ExpressionAttributeValues: { ':pid': 'promo-123' }
});

// Check if user already redeemed
const userRedemptions = await dynamoDB.query({
  TableName: 'promotion-redemptions',
  IndexName: 'UserIndex',
  KeyConditionExpression: 'userId = :uid',
  FilterExpression: 'promotionId = :pid',
  ExpressionAttributeValues: {
    ':uid': 'user-123',
    ':pid': 'promo-123'
  }
});
```

---

### 5. quotes
**Purpose**: Store custom pricing quotes  
**Access Pattern**: Query by sales rep, status, or customer

```typescript
{
  // Primary Key
  quoteId: string,                  // HASH: UUID
  
  // Quote Info
  quoteNumber: string,              // Q-2025-001 (human-readable)
  status: 'draft' | 'pending_approval' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'cancelled',
  
  // Customer/Prospect
  customerId?: string,              // If existing customer
  prospectEmail: string,
  prospectName: string,
  prospectCompany?: string,
  prospectPhone?: string,
  
  // Sales Attribution
  salesRep: string,
  salesRepName: string,
  createdBy: string,
  
  // Quote Details
  baseTier: string,
  baseTierName: string,
  billingPeriod: 'monthly' | 'yearly',
  basePrice: number,
  
  // Customizations
  customizations: {
    additionalListings?: {
      quantity: number,
      pricePerUnit: number,
      total: number,
    },
    additionalImages?: {
      quantity: number,
      pricePerUnit: number,
      total: number,
    },
    customFeatures?: {
      featureId: string,
      name: string,
      price: number,
    }[],
    customLimits?: Record<string, number>,
  },
  
  // Discounts
  discounts: {
    type: 'percentage' | 'fixed_amount',
    value: number,
    reason: string,
    approvalRequired: boolean,
    approvedBy?: string,
    approvedByName?: string,
    approvedAt?: string,
  }[],
  
  // Pricing Summary
  subtotal: number,
  totalDiscount: number,
  finalPrice: number,
  
  // Terms
  validUntil: string,
  commitmentMonths?: number,
  termsAndConditions: string,
  notes?: string,
  
  // Tracking
  viewCount: number,
  lastViewedAt?: string,
  trackingUrl?: string,
  pdfUrl?: string,
  
  // Timestamps
  createdAt: string,
  updatedAt: string,
  sentAt?: string,
  acceptedAt?: string,
  rejectedAt?: string,
  expiresAt: string,
}

// GSI: SalesRepIndex
// HASH: salesRep, RANGE: createdAt
// Purpose: Get sales rep's quotes

// GSI: StatusIndex
// HASH: status, RANGE: createdAt
// Purpose: Get quotes by status

// GSI: CustomerIndex
// HASH: prospectEmail, RANGE: createdAt
// Purpose: Get customer's quote history

// GSI: ExpirationIndex
// HASH: status, RANGE: expiresAt
// Purpose: Find expiring quotes
```

**Sample Queries:**
```typescript
// Get sales rep's active quotes
const quotes = await dynamoDB.query({
  TableName: 'quotes',
  IndexName: 'SalesRepIndex',
  KeyConditionExpression: 'salesRep = :rep',
  FilterExpression: '#status IN (:draft, :sent)',
  ExpressionAttributeNames: { '#status': 'status' },
  ExpressionAttributeValues: {
    ':rep': 'sarah@harborlist.com',
    ':draft': 'draft',
    ':sent': 'sent'
  }
});

// Find quotes expiring soon
const expiring = await dynamoDB.query({
  TableName: 'quotes',
  IndexName: 'ExpirationIndex',
  KeyConditionExpression: '#status = :sent AND expiresAt <= :deadline',
  ExpressionAttributeNames: { '#status': 'status' },
  ExpressionAttributeValues: {
    ':sent': 'sent',
    ':deadline': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  }
});
```

---

### 6. pricing-experiments
**Purpose**: A/B testing framework for pricing  
**Access Pattern**: Query by tier or status

```typescript
{
  // Primary Key
  experimentId: string,             // HASH: UUID
  
  // Experiment Info
  name: string,
  description: string,
  hypothesis: string,
  
  // Target
  targetTier: string,
  targetTierName: string,
  
  // Variants
  variants: {
    variantId: string,
    name: string,                   // "Control", "Variant A", etc.
    isControl: boolean,
    allocation: number,             // % (must sum to 100)
    
    pricing: {
      monthly?: number,
      yearly?: number,
    },
    
    features?: TierFeature[],
    
    messaging?: {
      headline?: string,
      description?: string,
      callToAction?: string,
    },
  }[],
  
  // Configuration
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled',
  startDate: string,
  endDate?: string,
  minSampleSize: number,
  confidenceLevel: number,          // 90, 95, 99
  
  // Metrics
  primaryMetric: 'conversion_rate' | 'revenue' | 'signups' | 'retention',
  secondaryMetrics: string[],
  
  // Results (updated periodically)
  results: {
    variantId: string,
    
    participants: number,
    signups: number,
    conversions: number,
    revenue: number,
    
    conversionRate: number,
    averageDealSize: number,
    retention30Day: number,
    retention90Day: number,
    
    confidenceInterval: {
      lower: number,
      upper: number,
    },
  }[],
  
  // Statistical Analysis
  winner?: string,
  statisticalSignificance: boolean,
  pValue: number,
  effectSize: number,
  
  // Attribution
  createdBy: string,
  createdByName: string,
  
  // Timestamps
  createdAt: string,
  updatedAt: string,
  activatedAt?: string,
  completedAt?: string,
}

// GSI: StatusIndex
// HASH: status, RANGE: startDate
// Purpose: Get active experiments

// GSI: TierIndex
// HASH: targetTier, RANGE: startDate
// Purpose: Get experiments for a tier

// GSI: CreatorIndex
// HASH: createdBy, RANGE: createdAt
// Purpose: Track who created experiments
```

---

## 🔄 Modifications to Existing Tables

### harborlist-users
**Add fields for tier tracking:**

```typescript
{
  // ... existing fields
  
  // Enhanced Tier Tracking
  premiumTier?: string,             // Existing
  premiumActive?: boolean,          // Existing
  premiumExpiresAt?: number,        // Existing
  
  // NEW: Journey Tracking
  tierHistory?: {
    tierId: string,
    startDate: string,
    endDate?: string,
    durationDays?: number,
  }[],
  
  // NEW: Usage Tracking
  currentUsage?: {
    listingCount: number,
    imageCount: number,
    lastCalculated: string,
  },
  
  // NEW: Sales Attribution
  assignedSalesRep?: string,
  lastContactedAt?: string,
  salesNotes?: {
    timestamp: string,
    rep: string,
    note: string,
    nextAction?: string,
  }[],
  
  // NEW: Risk Assessment
  churnRisk?: 'low' | 'medium' | 'high',
  churnProbability?: number,        // 0-100
  lastRiskCalculation?: string,
}

// NEW GSI: AssignedRepIndex
// HASH: assignedSalesRep, RANGE: lastContactedAt
// Purpose: Get customers for a sales rep

// NEW GSI: ChurnRiskIndex
// HASH: churnRisk, RANGE: premiumExpiresAt
// Purpose: Find at-risk customers
```

### harborlist-user-tiers
**No changes needed** - current structure supports all planned features

---

## 📈 Data Volume Estimates

### Year 1 Projections

| Table | Records/Month | Total Year 1 | Storage (GB) |
|-------|---------------|--------------|--------------|
| tier-analytics | 120 | 1,440 | 0.01 |
| tier-transitions | 500 | 6,000 | 0.05 |
| promotions | 10 | 120 | 0.001 |
| promotion-redemptions | 200 | 2,400 | 0.02 |
| quotes | 50 | 600 | 0.01 |
| pricing-experiments | 2 | 24 | 0.001 |
| **TOTAL** | | **10,584** | **0.091 GB** |

**Cost Estimate** (DynamoDB on-demand):
- Storage: $0.091 GB × $0.25/GB = $0.02/month
- Reads: ~10,000/month × $0.25/million = $0.0025/month
- Writes: ~1,000/month × $1.25/million = $0.00125/month
- **Total: ~$0.02/month** (negligible)

---

## 🔧 Setup Scripts

### Create Tables Script
```bash
#!/bin/bash
# tools/admin/create-tier-tables.sh

ENDPOINT="http://localhost:8000"
REGION="us-east-1"

echo "Creating tier management tables..."

# tier-analytics
aws dynamodb create-table \
  --table-name tier-analytics \
  --attribute-definitions \
    AttributeName=analyticsId,AttributeType=S \
    AttributeName=date,AttributeType=S \
    AttributeName=tierId,AttributeType=S \
  --key-schema \
    AttributeName=analyticsId,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "DateIndex",
        "KeySchema": [
          {"AttributeName":"date","KeyType":"HASH"},
          {"AttributeName":"tierId","KeyType":"RANGE"}
        ],
        "Projection": {"ProjectionType":"ALL"},
        "ProvisionedThroughput": {"ReadCapacityUnits":5,"WriteCapacityUnits":5}
      },
      {
        "IndexName": "TierIndex",
        "KeySchema": [
          {"AttributeName":"tierId","KeyType":"HASH"},
          {"AttributeName":"date","KeyType":"RANGE"}
        ],
        "Projection": {"ProjectionType":"ALL"},
        "ProvisionedThroughput": {"ReadCapacityUnits":5,"WriteCapacityUnits":5}
      }
    ]' \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --endpoint-url "$ENDPOINT" \
  --region "$REGION"

# Additional tables...
# (tier-transitions, promotions, promotion-redemptions, quotes, pricing-experiments)

echo "✅ All tier management tables created"
```

### Populate Analytics Script
```typescript
// tools/admin/populate-tier-analytics.ts
/**
 * Backfill tier analytics from existing user data
 */

import { scanUsers, getTierMetrics } from './helpers';

async function backfillAnalytics() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
  
  for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0];
    
    for (const tier of allTiers) {
      const metrics = await getTierMetrics(tier.tierId, dateStr);
      
      await dynamoDB.put({
        TableName: 'tier-analytics',
        Item: {
          analyticsId: `${dateStr}#${tier.tierId}`,
          date: dateStr,
          tierId: tier.tierId,
          ...metrics
        }
      });
    }
  }
  
  console.log('✅ Analytics backfilled');
}
```

---

## 🧪 Testing Data

### Sample Data Seeds
```typescript
// tools/admin/seed-tier-data.ts

const samplePromotions = [
  {
    promotionId: 'promo-black-friday-2025',
    name: 'Black Friday 2025',
    discountType: 'percentage',
    discountValue: 30,
    targetTiers: ['premium-individual', 'premium-dealer'],
    status: 'active',
    // ...
  },
  // ...
];

const sampleTransitions = [
  {
    userId: 'user-123',
    event: 'upgrade',
    fromTier: 'free-individual',
    toTier: 'premium-individual',
    trigger: { type: 'self_service' },
    // ...
  },
  // ...
];

// Seed all tables
```

---

**Document Version**: 1.0  
**Last Updated**: October 20, 2025  
**Status**: Ready for Implementation
