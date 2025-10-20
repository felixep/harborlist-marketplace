# Comparable Listings Feature - Admin Setup Guide

## Overview
The Comparable Listings feature allows premium boat owners to see similar boats on the market for pricing comparison. This is a premium-only feature that needs to be configured in the tier management system.

---

## 🔧 Required Changes

### 1. **Add Feature to UserTier Type**

The feature is already defined in `packages/shared-types/src/common.ts` as part of the `TierFeature` interface. The system supports flexible feature flags.

**Feature ID to use:** `comparable_listings`

### 2. **Database Schema - User Tiers Table**

If you don't already have a `user-tiers` table, you'll need to create one:

```typescript
// Table: harborlist-user-tiers
{
  tierId: string (HASH key)
  name: string
  type: 'individual' | 'dealer'
  isPremium: boolean
  features: TierFeature[] // Array of feature objects
  limits: UserLimits
  pricing: {
    monthly?: number
    yearly?: number
    currency: string
  }
  active: boolean
  description?: string
  displayOrder: number
  createdAt: string
  updatedAt: string
}
```

### 3. **Add Comparable Listings Feature to Premium Tiers**

You need to add the feature to existing premium tiers. Here's the feature object to add:

```json
{
  "featureId": "comparable_listings",
  "name": "Market Comparables",
  "description": "See similar boats on the market with real-time pricing comparisons to stay competitive",
  "enabled": true,
  "limits": {
    "maxComparables": 5
  }
}
```

**Add this to:**
- ✅ Premium Individual tier
- ✅ Premium Dealer tier
- ❌ Free/Basic tiers (should NOT have this feature)

### 4. **DynamoDB Update Script**

Create a script to update existing tiers:

```javascript
// tools/admin/add-comparable-listings-feature.js
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient({
  endpoint: 'http://localhost:8000', // LocalStack
  region: 'us-east-1'
});

const TIERS_TABLE = 'harborlist-user-tiers';

const comparableListingsFeature = {
  featureId: 'comparable_listings',
  name: 'Market Comparables',
  description: 'See similar boats on the market with real-time pricing comparisons to stay competitive',
  enabled: true,
  limits: {
    maxComparables: 5
  }
};

async function addFeatureToPremiumTiers() {
  try {
    // Scan for all premium tiers
    const result = await dynamodb.scan({
      TableName: TIERS_TABLE,
      FilterExpression: 'isPremium = :premium',
      ExpressionAttributeValues: {
        ':premium': true
      }
    }).promise();

    console.log(`Found ${result.Items.length} premium tiers`);

    // Update each premium tier
    for (const tier of result.Items) {
      const features = tier.features || [];
      
      // Check if feature already exists
      const hasFeature = features.some(f => f.featureId === 'comparable_listings');
      
      if (!hasFeature) {
        features.push(comparableListingsFeature);
        
        await dynamodb.update({
          TableName: TIERS_TABLE,
          Key: { tierId: tier.tierId },
          UpdateExpression: 'SET features = :features, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':features': features,
            ':updatedAt': new Date().toISOString()
          }
        }).promise();
        
        console.log(`✅ Added comparable_listings to tier: ${tier.name} (${tier.tierId})`);
      } else {
        console.log(`⏭️  Tier ${tier.name} already has comparable_listings feature`);
      }
    }
    
    console.log('\n✨ All premium tiers updated successfully!');
  } catch (error) {
    console.error('❌ Error updating tiers:', error);
  }
}

addFeatureToPremiumTiers();
```

**To run:**
```bash
node tools/admin/add-comparable-listings-feature.js
```

### 5. **Manual DynamoDB Update (Alternative)**

If you prefer manual updates via AWS CLI:

```bash
# Get all premium tiers
aws dynamodb scan \
  --table-name harborlist-user-tiers \
  --filter-expression "isPremium = :premium" \
  --expression-attribute-values '{":premium":{"BOOL":true}}' \
  --endpoint-url http://localhost:8000 \
  --region us-east-1

# Update a specific tier (replace TIER_ID with actual tier ID)
aws dynamodb update-item \
  --table-name harborlist-user-tiers \
  --key '{"tierId":{"S":"TIER_ID"}}' \
  --update-expression "SET features = list_append(features, :new_feature), updatedAt = :updated" \
  --expression-attribute-values file://comparable-feature.json \
  --endpoint-url http://localhost:8000 \
  --region us-east-1
```

**comparable-feature.json:**
```json
{
  ":new_feature": {
    "L": [
      {
        "M": {
          "featureId": {"S": "comparable_listings"},
          "name": {"S": "Market Comparables"},
          "description": {"S": "See similar boats on the market with real-time pricing comparisons to stay competitive"},
          "enabled": {"BOOL": true},
          "limits": {
            "M": {
              "maxComparables": {"N": "5"}
            }
          }
        }
      }
    ]
  },
  ":updated": {"S": "2025-10-20T00:00:00.000Z"}
}
```

---

## 🎯 Admin UI Changes (Optional but Recommended)

### 1. **Tier Management Page**

Add the feature to the tier editor:

```typescript
// In admin tier management page
const AVAILABLE_FEATURES = [
  {
    id: 'priority_placement',
    name: 'Priority Placement',
    description: 'Listings appear higher in search results',
    category: 'Visibility'
  },
  {
    id: 'featured_listings',
    name: 'Featured Listings',
    description: 'Showcase listings in premium spots',
    category: 'Visibility'
  },
  {
    id: 'analytics_access',
    name: 'Advanced Analytics',
    description: 'Detailed insights and performance metrics',
    category: 'Insights'
  },
  {
    id: 'comparable_listings', // NEW
    name: 'Market Comparables',
    description: 'See similar boats on the market with real-time pricing comparisons',
    category: 'Insights'
  },
  {
    id: 'premium_support',
    name: 'Premium Support',
    description: 'Priority customer support with faster response times',
    category: 'Support'
  }
];
```

### 2. **Feature Toggle UI**

Add a toggle in the tier editor to enable/disable this feature for each tier.

---

## 📊 Verification Steps

After making the changes, verify the feature works:

### 1. **Check User Premium Status**
```javascript
// In browser console or backend
const user = await getUser('user-id');
console.log('Premium Active:', user.premiumActive);
console.log('Premium Tier:', user.premiumTier);
```

### 2. **Check Tier Has Feature**
```javascript
const tier = await getUserTier(user.premiumTier);
const hasFeature = tier.features.some(f => 
  f.featureId === 'comparable_listings' && f.enabled
);
console.log('Has Comparable Listings:', hasFeature);
```

### 3. **Test in UI**
1. As a premium user, create or view your listing
2. Scroll to "Comparable Listings" section
3. Should see actual comparable boats (if premium) or upgrade prompt (if free)

---

## 🔐 Backend Feature Check (Optional Enhancement)

If you want backend validation, add this to the listings API:

```typescript
// backend/src/listing/index.ts

async function canAccessComparables(userId: string): Promise<boolean> {
  const user = await db.getUser(userId);
  
  if (!user.premiumActive) {
    return false;
  }
  
  if (!user.premiumTier) {
    return false;
  }
  
  const tier = await db.getUserTier(user.premiumTier);
  const feature = tier.features.find(f => f.featureId === 'comparable_listings');
  
  return feature?.enabled || false;
}

// Use in comparables endpoint
export async function getComparables(event: APIGatewayProxyEvent) {
  const userId = getUserId(event);
  
  if (!await canAccessComparables(userId)) {
    return createErrorResponse(403, 'PREMIUM_REQUIRED', 'This feature requires a premium membership');
  }
  
  // ... rest of comparables logic
}
```

---

## 🚀 Rollout Plan

### Phase 1: Development (Current)
- ✅ Feature implemented in frontend
- ✅ Premium gate in place
- ✅ User type updated with premium fields

### Phase 2: Database Setup
- [ ] Create/verify user-tiers table exists
- [ ] Add comparable_listings feature to premium tiers
- [ ] Verify existing premium users have premiumActive=true

### Phase 3: Testing
- [ ] Test with free user (should see upgrade prompt)
- [ ] Test with premium user (should see comparables)
- [ ] Test edge cases (no similar boats, API errors)

### Phase 4: Production
- [ ] Deploy feature flag (optional)
- [ ] Monitor usage analytics
- [ ] Track conversion from free to premium

---

## 📈 Success Metrics

Track these metrics to measure feature impact:

1. **Engagement**
   - How many premium users view comparables
   - How often they check it

2. **Conversion**
   - Free users who see upgrade prompt
   - Upgrade rate after seeing prompt

3. **Value Delivered**
   - Do users adjust prices after seeing comparables
   - Does it help boats sell faster

---

## 🎨 Marketing Copy

Use this in the premium upgrade page:

**Feature:** Market Comparables  
**Tagline:** "Know your market position instantly"  
**Benefits:**
- See up to 5 similar boats in real-time
- Compare pricing and features instantly
- Make data-driven pricing decisions
- Stay competitive in the market

---

## Need Help?

- Check user tier structure: `docs/DATABASE_GSI_REFERENCE.md`
- Premium membership logic: `backend/src/user-service/premium-membership.test.ts`
- User type definitions: `packages/shared-types/src/common.ts`
