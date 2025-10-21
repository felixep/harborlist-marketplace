# Tier Management Enhancement - Implementation Plan
**Sales Team Ownership Initiative**

---

## 📋 Executive Summary

Transform the Tier Management system from an admin-only tool to a comprehensive **Sales Team platform** that enables data-driven pricing decisions, customer journey tracking, and revenue optimization.

**Current State:**
- ✅ Basic tier CRUD operations
- ✅ Feature management per tier
- ✅ Admin-only access (SYSTEM_CONFIG permission)
- ✅ 4 default tiers initialized

**Target State:**
- 🎯 Sales team ownership with dedicated permissions
- 📊 Real-time analytics and revenue metrics
- 🎨 Promotional campaigns and A/B testing
- 💼 Customer journey tracking and upsell opportunities
- 📈 Pricing intelligence and optimization
- 🤝 CRM integration and sales workflow automation

---

## 🎯 Business Objectives

1. **Empower Sales Team** - Give sales full control over tiers, pricing, and promotions
2. **Increase Revenue** - Optimize pricing through data-driven experimentation
3. **Reduce Churn** - Identify at-risk customers and intervene proactively
4. **Improve Conversion** - Track funnel metrics and optimize upgrade paths
5. **Streamline Operations** - Automate approval workflows and reporting

---

## 📊 Success Metrics

| Metric | Baseline | Target (6 months) |
|--------|----------|-------------------|
| Conversion Rate (Free → Premium) | TBD | +25% |
| Monthly Recurring Revenue (MRR) | TBD | +40% |
| Churn Rate | TBD | -30% |
| Average Deal Size | TBD | +15% |
| Sales Team Efficiency | Manual pricing | 80% automated quotes |
| Quote-to-Close Rate | TBD | +20% |

---

## 🏗️ Implementation Phases

### **Phase 1: Foundation & Sales Team Access** ⚡ CRITICAL
**Duration:** 1 week  
**Effort:** Low  
**Value:** High

#### 1.1 Separate Tier Management Permission
**Files to Modify:**
- `packages/shared-types/src/common.ts`
- `packages/shared-types/src/teams.ts`
- `backend/src/tier/index.ts`
- `backend/src/auth-service/interfaces.ts`

**Changes:**
```typescript
// packages/shared-types/src/common.ts
export enum AdminPermission {
  // ... existing
  TIER_MANAGEMENT = 'tier_management',        // NEW: Sales-specific
  PRICING_MANAGEMENT = 'pricing_management',  // NEW: Pricing changes
  PROMOTION_MANAGEMENT = 'promotion_management', // NEW: Discounts
}

// packages/shared-types/src/teams.ts
[TeamId.SALES]: {
  id: TeamId.SALES,
  name: 'Sales Team',
  defaultPermissions: [
    'view_leads',
    'respond_to_leads',
    'view_customer_info',
    'view_analytics',
    'tier_management',        // NEW
    'view_tier_metrics',      // NEW
  ],
  managerPermissions: [
    // ... existing + new
    'tier_management',
    'pricing_management',
    'promotion_management',
    'approve_custom_pricing',
    'view_revenue_metrics',
  ]
}
```

**Backend Updates:**
```typescript
// backend/src/tier/index.ts
export const listTiers = async (event) => {
  const user = await getUserFromEvent(event);
- requireAdminRole(user, [AdminPermission.SYSTEM_CONFIG]);
+ requireAdminRole(user, [AdminPermission.TIER_MANAGEMENT]);
  // ... rest
};

// Apply to all 9 tier endpoints
```

**Testing:**
- ✅ Sales team member can view tiers
- ✅ Sales manager can modify tiers
- ✅ Non-sales staff cannot access
- ✅ System config remains for admin-only features

**Deliverables:**
- [ ] Permission enum updated
- [ ] Team definitions updated
- [ ] Backend auth updated (9 endpoints)
- [ ] Frontend access updated
- [ ] Documentation updated
- [ ] Unit tests passing

---

### **Phase 2: Analytics & Metrics Dashboard** 📊 CRITICAL
**Duration:** 2 weeks  
**Effort:** Medium  
**Value:** High

#### 2.1 Backend Analytics API

**New File:** `backend/src/tier/analytics.ts`

```typescript
/**
 * Tier Analytics Service
 * Provides comprehensive metrics for sales team
 */

export interface TierMetrics {
  tierId: string;
  name: string;
  type: 'individual' | 'dealer';
  isPremium: boolean;
  
  // Subscription Metrics
  activeSubscriptions: number;
  newSubscriptionsThisMonth: number;
  cancellationsThisMonth: number;
  netChange: number;
  growthRate: number;          // % change month-over-month
  
  // Revenue Metrics
  mrr: number;                 // Monthly Recurring Revenue
  arr: number;                 // Annual Recurring Revenue
  arpu: number;                // Average Revenue Per User
  lifetimeValue: number;       // Estimated LTV
  
  // Conversion Metrics
  conversionRate: number;      // % from trial/free
  upgradeRate: number;         // % from lower tier
  downgradeRate: number;       // % to lower tier
  retentionRate: number;       // % retained after 90 days
  
  // Usage Metrics
  avgListingsPerUser: number;
  avgImagesPerListing: number;
  limitUtilization: number;    // % using >80% of limits
  
  // Feature Adoption
  featureUsage: {
    featureId: string;
    name: string;
    usersUsingFeature: number;
    usagePercentage: number;
    avgUsagePerUser: number;
  }[];
  
  // Trends (last 12 months)
  monthlyTrends: {
    month: string;
    subscriptions: number;
    revenue: number;
    churn: number;
  }[];
}

export interface TierAnalyticsSummary {
  totalMRR: number;
  totalARR: number;
  totalActiveSubscriptions: number;
  averageChurnRate: number;
  
  topPerformingTier: string;
  fastestGrowingTier: string;
  highestChurnTier: string;
  
  conversionFunnel: {
    freeUsers: number;
    trialUsers: number;
    paidUsers: number;
    freeToTrial: number;      // %
    trialToPaid: number;      // %
    freeToDirectPaid: number; // %
  };
  
  revenueBreakdown: {
    byTier: { tierId: string; revenue: number; percentage: number }[];
    byType: { type: string; revenue: number; percentage: number }[];
    byBillingPeriod: { period: string; revenue: number; percentage: number }[];
  };
  
  metrics: TierMetrics[];
}

// API Endpoints
export const getTierAnalytics = async (event: APIGatewayProxyEvent) => {
  const user = await getUserFromEvent(event);
  requireAdminRole(user, [AdminPermission.TIER_MANAGEMENT]);
  
  // Calculate metrics from users table
  // ... implementation
};

export const getTierMetrics = async (event: APIGatewayProxyEvent) => {
  // Get metrics for specific tier
};

export const getRevenueTrends = async (event: APIGatewayProxyEvent) => {
  // Revenue trends over time
};

export const getConversionFunnel = async (event: APIGatewayProxyEvent) => {
  // Conversion funnel analysis
};
```

**API Endpoints:**
- `GET /api/admin/tiers/analytics` - Overall summary
- `GET /api/admin/tiers/:tierId/metrics` - Specific tier metrics
- `GET /api/admin/tiers/revenue` - Revenue breakdown
- `GET /api/admin/tiers/funnel` - Conversion funnel

#### 2.2 Frontend Analytics Dashboard

**New File:** `frontend/src/pages/admin/TierAnalytics.tsx`

```typescript
/**
 * Sales Analytics Dashboard
 * Comprehensive view of tier performance for sales team
 */

export default function TierAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['tier-analytics'],
    queryFn: fetchTierAnalytics,
    refetchInterval: 60000, // Refresh every minute
  });

  return (
    <div className="p-6">
      <PageHeader
        title="Tier Analytics"
        subtitle="Real-time metrics and performance tracking"
      />

      {/* Key Metrics Cards */}
      <MetricsGrid>
        <MetricCard
          label="Monthly Recurring Revenue"
          value={formatCurrency(analytics.totalMRR)}
          change="+12.3%"
          trend="up"
          icon={<DollarIcon />}
        />
        <MetricCard
          label="Active Subscriptions"
          value={analytics.totalActiveSubscriptions}
          change="+23"
          trend="up"
          icon={<UsersIcon />}
        />
        <MetricCard
          label="Churn Rate"
          value={`${analytics.averageChurnRate}%`}
          change="-0.8%"
          trend="down"
          icon={<TrendIcon />}
        />
        <MetricCard
          label="Conversion Rate"
          value={`${analytics.conversionFunnel.trialToPaid}%`}
          change="+2.1%"
          trend="up"
          icon={<ConversionIcon />}
        />
      </MetricsGrid>

      {/* Revenue Chart */}
      <Card className="mb-6">
        <CardHeader>
          <h3>Revenue Trends</h3>
          <PeriodSelector />
        </CardHeader>
        <RevenueChart data={analytics.metrics} />
      </Card>

      {/* Tier Performance Table */}
      <Card className="mb-6">
        <CardHeader>
          <h3>Tier Performance</h3>
        </CardHeader>
        <TierPerformanceTable tiers={analytics.metrics} />
      </Card>

      {/* Conversion Funnel */}
      <Card className="mb-6">
        <CardHeader>
          <h3>Conversion Funnel</h3>
        </CardHeader>
        <FunnelChart data={analytics.conversionFunnel} />
      </Card>

      {/* Feature Adoption */}
      <Card>
        <CardHeader>
          <h3>Feature Adoption by Tier</h3>
        </CardHeader>
        <FeatureAdoptionMatrix data={analytics.metrics} />
      </Card>
    </div>
  );
}
```

**Deliverables:**
- [ ] Backend analytics service
- [ ] API endpoints (4 new)
- [ ] Frontend dashboard page
- [ ] Chart components (revenue, funnel, adoption)
- [ ] Real-time data refresh
- [ ] Export to CSV/PDF
- [ ] Unit tests
- [ ] Integration tests

---

### **Phase 3: Customer Journey Tracking** 💼 HIGH PRIORITY
**Duration:** 1 week  
**Effort:** Medium  
**Value:** High

#### 3.1 Journey Tracking Backend

**New File:** `backend/src/tier/customer-journey.ts`

```typescript
/**
 * Customer Tier Journey Tracking
 * Track customer lifecycle and tier transitions
 */

export interface TierTransition {
  transitionId: string;
  userId: string;
  timestamp: string;
  
  event: 'signup' | 'upgrade' | 'downgrade' | 'cancel' | 'reactivate' | 'renewal';
  fromTier?: string;
  toTier: string;
  
  trigger: {
    type: 'self_service' | 'sales_assisted' | 'automated' | 'promotion';
    salesRep?: string;
    promotionId?: string;
    reason?: string;
  };
  
  financialImpact: {
    previousMRR: number;
    newMRR: number;
    mrrChange: number;
    expectedLTV: number;
  };
  
  metadata: {
    billingPeriod?: 'monthly' | 'yearly';
    userAgent?: string;
    referralSource?: string;
  };
}

export interface CustomerJourney {
  userId: string;
  email: string;
  name: string;
  
  // Current State
  currentTier: string;
  currentTierName: string;
  isPremium: boolean;
  subscriptionStatus: 'active' | 'cancelled' | 'past_due' | 'trialing';
  
  // Timeline
  signupDate: string;
  firstPaidDate?: string;
  nextRenewalDate?: string;
  daysAsCustomer: number;
  
  // Financial
  lifetimeValue: number;
  totalSpent: number;
  averageMonthlySpend: number;
  
  // Journey History
  transitions: TierTransition[];
  transitionCount: number;
  upgradeCount: number;
  downgradeCount: number;
  
  // Engagement
  lastLoginDate: string;
  loginCount: number;
  listingCount: number;
  averageUsage: number;       // % of tier limits used
  
  // Risk Assessment
  churnRisk: 'low' | 'medium' | 'high';
  churnProbability: number;    // 0-100
  churnFactors: string[];
  
  // Opportunities
  upsellOpportunity: boolean;
  upsellScore: number;         // 0-100
  recommendedTier?: string;
  upsellReasons: string[];
  
  // Sales Activity
  lastContactDate?: string;
  lastContactType?: string;
  assignedSalesRep?: string;
  salesNotes: {
    timestamp: string;
    rep: string;
    note: string;
    nextAction?: string;
  }[];
}

// API Handlers
export const trackTierTransition = async (transition: TierTransition) => {
  // Record transition in audit log
  // Update customer journey
  // Trigger webhooks/notifications
  // Update sales metrics
};

export const getCustomerJourney = async (event: APIGatewayProxyEvent) => {
  const user = await getUserFromEvent(event);
  requireAdminRole(user, [AdminPermission.TIER_MANAGEMENT]);
  
  const { userId } = event.pathParameters;
  // Build comprehensive journey view
};

export const getUpsellOpportunities = async (event: APIGatewayProxyEvent) => {
  // Find customers near tier limits
  // High usage on free tier
  // Recently downgraded premium users
  // Annual renewal approaching
};

export const getChurnRiskCustomers = async (event: APIGatewayProxyEvent) => {
  // Identify at-risk customers
  // Low usage
  // Approaching limit frustration
  // No recent logins
};
```

#### 3.2 Customer Journey UI

**New File:** `frontend/src/pages/admin/CustomerJourney.tsx`

```typescript
/**
 * Customer Journey Viewer
 * Visualize customer tier transitions and opportunities
 */

export default function CustomerJourneyPage() {
  return (
    <div className="p-6">
      <PageHeader title="Customer Journeys" />

      {/* Opportunity Lists */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <OpportunityCard
          title="Upsell Opportunities"
          count={34}
          icon={<TrendUpIcon />}
          color="green"
          onClick={() => setFilter('upsell')}
        />
        <OpportunityCard
          title="Churn Risk"
          count={12}
          icon={<AlertIcon />}
          color="red"
          onClick={() => setFilter('churn')}
        />
        <OpportunityCard
          title="Win-Back"
          count={8}
          icon={<RefreshIcon />}
          color="blue"
          onClick={() => setFilter('winback')}
        />
      </div>

      {/* Customer List with Journey Preview */}
      <Card>
        <CustomerJourneyTable
          customers={filteredCustomers}
          onViewJourney={showJourneyModal}
        />
      </Card>

      {/* Journey Detail Modal */}
      {selectedCustomer && (
        <JourneyModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        >
          {/* Timeline Visualization */}
          <JourneyTimeline transitions={selectedCustomer.transitions} />
          
          {/* Metrics */}
          <MetricsSection customer={selectedCustomer} />
          
          {/* Sales Notes */}
          <SalesNotesSection
            notes={selectedCustomer.salesNotes}
            onAddNote={handleAddNote}
          />
          
          {/* Actions */}
          <ActionSection>
            <Button onClick={assignToMe}>Assign to Me</Button>
            <Button onClick={createQuote}>Generate Quote</Button>
            <Button onClick={scheduleCall}>Schedule Call</Button>
          </ActionSection>
        </JourneyModal>
      )}
    </div>
  );
}
```

**Deliverables:**
- [ ] Journey tracking backend service
- [ ] Transition recording system
- [ ] Risk scoring algorithm
- [ ] Upsell opportunity detection
- [ ] Customer journey API endpoints
- [ ] Frontend journey viewer
- [ ] Timeline visualization
- [ ] Sales notes system
- [ ] Opportunity filters
- [ ] Unit tests

---

### **Phase 4: Promotional Campaigns** 🎨 HIGH PRIORITY
**Duration:** 1.5 weeks  
**Effort:** Medium  
**Value:** High

#### 4.1 Promotions Backend

**New File:** `backend/src/tier/promotions.ts`

```typescript
/**
 * Promotional Campaign Management
 * Create and manage discounts, trials, and special offers
 */

export interface Promotion {
  promotionId: string;
  name: string;
  description: string;
  internalNotes?: string;
  
  // Discount Configuration
  discountType: 'percentage' | 'fixed_amount' | 'free_trial' | 'extended_trial';
  discountValue: number;
  appliesTo: 'monthly' | 'yearly' | 'both' | 'first_month';
  
  // Targeting
  targetTiers: string[];              // Which tiers eligible
  eligibilityRules: {
    userType: 'all' | 'new' | 'existing' | 'churned' | 'custom';
    minAccountAge?: number;           // Days
    maxAccountAge?: number;
    currentTiers?: string[];          // Current tier restrictions
    excludeTiers?: string[];
    segments?: string[];              // Custom segments
  };
  
  // Limitations
  maxRedemptions?: number;
  redemptionsPerUser: number;
  minimumCommitmentMonths?: number;
  stackable: boolean;                 // Can combine with other promos
  
  // Timing
  startDate: string;
  endDate: string;
  active: boolean;
  autoExpire: boolean;
  
  // Codes
  requiresCode: boolean;
  promotionCodes: string[];           // Multiple codes for same promo
  
  // Tracking
  redemptionCount: number;
  uniqueUsers: number;
  totalRevenue: number;
  totalDiscount: number;
  conversionRate: number;
  averageDealSize: number;
  
  // Attribution
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  
  // Status
  status: 'draft' | 'pending_approval' | 'active' | 'paused' | 'completed' | 'cancelled';
}

export interface PromotionRedemption {
  redemptionId: string;
  promotionId: string;
  userId: string;
  
  redeemedAt: string;
  code?: string;
  
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  
  tierBefore?: string;
  tierAfter: string;
  billingPeriod: 'monthly' | 'yearly';
  
  salesRep?: string;
}

// API Handlers
export const createPromotion = async (event: APIGatewayProxyEvent) => {
  const user = await getUserFromEvent(event);
  requireAdminRole(user, [AdminPermission.PROMOTION_MANAGEMENT]);
  
  const promotion = JSON.parse(event.body);
  
  // Validate
  // Check for approval requirements
  // Save to database
  // Trigger notifications if needs approval
};

export const validatePromotionCode = async (
  code: string,
  userId: string,
  tierId: string
): Promise<{ valid: boolean; promotion?: Promotion; error?: string }> => {
  // Check code exists
  // Check user eligibility
  // Check redemption limits
  // Check timing
  // Return validation result
};

export const redeemPromotion = async (
  promotionId: string,
  userId: string,
  tierId: string
): Promise<PromotionRedemption> => {
  // Record redemption
  // Apply discount
  // Update counters
  // Track in analytics
};
```

#### 4.2 Promotion Management UI

**New File:** `frontend/src/pages/admin/PromotionManagement.tsx`

```typescript
/**
 * Promotion Campaign Manager
 * Create, manage, and track promotional campaigns
 */

export default function PromotionManagement() {
  return (
    <div className="p-6">
      <PageHeader
        title="Promotional Campaigns"
        actions={
          <Button onClick={createPromotion}>
            Create Campaign
          </Button>
        }
      />

      {/* Active Campaigns */}
      <Section title="Active Campaigns">
        <PromotionGrid>
          {activePromotions.map(promo => (
            <PromotionCard
              key={promo.promotionId}
              promotion={promo}
              metrics={{
                redemptions: promo.redemptionCount,
                revenue: promo.totalRevenue,
                conversionRate: promo.conversionRate,
              }}
              actions={
                <>
                  <Button size="sm" onClick={() => editPromotion(promo)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => pausePromotion(promo)}>
                    Pause
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => viewDetails(promo)}>
                    Details
                  </Button>
                </>
              }
            />
          ))}
        </PromotionGrid>
      </Section>

      {/* Campaign Performance */}
      <Section title="Campaign Performance">
        <PromotionMetricsTable
          promotions={allPromotions}
          sortBy="redemptions"
        />
      </Section>

      {/* Drafts & Pending Approval */}
      <Section title="Drafts & Pending Approval">
        <PromotionList
          promotions={draftPromotions}
          onEdit={editPromotion}
          onSubmitForApproval={submitForApproval}
          onDelete={deletePromotion}
        />
      </Section>
    </div>
  );
}

function CreatePromotionModal() {
  return (
    <Modal title="Create Promotional Campaign">
      <Form>
        {/* Basic Info */}
        <Section title="Campaign Details">
          <Input label="Campaign Name" />
          <Textarea label="Description" />
          <Input label="Internal Notes" />
        </Section>

        {/* Discount Configuration */}
        <Section title="Discount Setup">
          <Select label="Discount Type">
            <option value="percentage">Percentage Off</option>
            <option value="fixed_amount">Fixed Amount Off</option>
            <option value="free_trial">Free Trial Extension</option>
          </Select>
          <Input label="Discount Value" type="number" />
          <Select label="Applies To">
            <option value="both">All Billing Periods</option>
            <option value="monthly">Monthly Only</option>
            <option value="yearly">Yearly Only</option>
            <option value="first_month">First Month Only</option>
          </Select>
        </Section>

        {/* Target Audience */}
        <Section title="Target Audience">
          <MultiSelect label="Eligible Tiers">
            {availableTiers.map(tier => (
              <option key={tier.tierId} value={tier.tierId}>
                {tier.name}
              </option>
            ))}
          </MultiSelect>
          <Select label="User Type">
            <option value="all">All Users</option>
            <option value="new">New Signups Only</option>
            <option value="existing">Existing Customers</option>
            <option value="churned">Win-Back (Churned Users)</option>
          </Select>
        </Section>

        {/* Limitations */}
        <Section title="Limitations & Rules">
          <Input label="Max Total Redemptions" type="number" />
          <Input label="Redemptions Per User" type="number" />
          <Input label="Minimum Commitment (months)" type="number" />
          <Checkbox label="Allow stacking with other promotions" />
        </Section>

        {/* Timing */}
        <Section title="Campaign Timing">
          <DatePicker label="Start Date" />
          <DatePicker label="End Date" />
          <Checkbox label="Auto-expire after end date" />
        </Section>

        {/* Promotion Codes */}
        <Section title="Promotion Codes">
          <Checkbox label="Require promotion code" />
          <TagInput label="Codes" placeholder="Enter codes..." />
        </Section>

        {/* Actions */}
        <FormActions>
          <Button type="submit" variant="primary">
            Create Campaign
          </Button>
          <Button variant="outline">
            Save as Draft
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
}
```

**Deliverables:**
- [ ] Promotions backend service
- [ ] Validation and redemption logic
- [ ] Promotion codes system
- [ ] API endpoints (6 new)
- [ ] Frontend campaign manager
- [ ] Campaign creation wizard
- [ ] Performance tracking
- [ ] Code generator
- [ ] Approval workflow
- [ ] Unit tests

---

### **Phase 5: Quote Generator** 💼 MEDIUM PRIORITY
**Duration:** 1 week  
**Effort:** Medium  
**Value:** Medium

#### 5.1 Quote System Backend

**New File:** `backend/src/tier/quotes.ts`

```typescript
/**
 * Quote Generation System
 * Create custom pricing quotes for sales prospects
 */

export interface Quote {
  quoteId: string;
  quoteNumber: string;            // Human-readable (Q-2025-001)
  
  // Customer Info
  customerId?: string;            // If existing customer
  prospectEmail: string;
  prospectName: string;
  prospectCompany?: string;
  
  // Sales Info
  salesRep: string;
  createdBy: string;
  createdAt: string;
  
  // Quote Details
  baseTier: string;
  baseTierName: string;
  billingPeriod: 'monthly' | 'yearly';
  basePrice: number;
  
  // Customizations
  customizations: {
    additionalListings?: {
      quantity: number;
      pricePerUnit: number;
      total: number;
    };
    additionalImages?: {
      quantity: number;
      pricePerUnit: number;
      total: number;
    };
    customFeatures?: {
      featureId: string;
      name: string;
      price: number;
    }[];
    customLimits?: Record<string, number>;
  };
  
  // Discounts
  discounts: {
    type: 'percentage' | 'fixed_amount';
    value: number;
    reason: string;
    approvalRequired: boolean;
    approvedBy?: string;
    approvedAt?: string;
  }[];
  
  // Pricing Summary
  subtotal: number;
  totalDiscount: number;
  finalPrice: number;
  
  // Terms
  validUntil: string;
  commitmentMonths?: number;
  termsAndConditions: string;
  notes?: string;
  
  // Status
  status: 'draft' | 'pending_approval' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  
  // Actions
  sentAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  expiresAt: string;
  
  // Tracking
  viewCount: number;
  lastViewedAt?: string;
}

// API Handlers
export const createQuote = async (event: APIGatewayProxyEvent) => {
  const user = await getUserFromEvent(event);
  requireAdminRole(user, [AdminPermission.TIER_MANAGEMENT]);
  
  const quoteData = JSON.parse(event.body);
  
  // Generate quote number
  // Calculate pricing
  // Check if approval needed (discount > threshold)
  // Save quote
  // Return quote object
};

export const requestQuoteApproval = async (quoteId: string) => {
  // Notify sales manager
  // Add to approval queue
  // Track in audit log
};

export const approveQuote = async (
  quoteId: string,
  managerId: string
): Promise<Quote> => {
  // Update quote status
  // Notify sales rep
  // Enable sending to customer
};

export const sendQuote = async (
  quoteId: string
): Promise<{ emailSent: boolean; trackingUrl: string }> => {
  // Generate PDF
  // Create tracking link
  // Send email to prospect
  // Update quote status
};

export const acceptQuote = async (
  quoteId: string,
  userId: string
): Promise<{ subscriptionCreated: boolean; subscriptionId: string }> => {
  // Create subscription with custom pricing
  // Apply tier with customizations
  // Record conversion
  // Notify sales rep
  // Update CRM
};
```

#### 5.2 Quote Generator UI

**New File:** `frontend/src/pages/admin/QuoteGenerator.tsx`

```typescript
/**
 * Quote Generator
 * Create custom pricing quotes for prospects
 */

export default function QuoteGenerator() {
  return (
    <div className="p-6">
      <PageHeader title="Quote Generator" />

      <div className="grid grid-cols-3 gap-6">
        {/* Quote Builder (Left Column) */}
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <h3>Create Quote</h3>
            </CardHeader>
            
            {/* Customer/Prospect Info */}
            <Section>
              <h4>Customer Information</h4>
              <Input label="Email" />
              <Input label="Name" />
              <Input label="Company" />
            </Section>

            {/* Base Tier Selection */}
            <Section>
              <h4>Base Tier</h4>
              <TierSelector
                tiers={availableTiers}
                selected={selectedTier}
                onChange={setSelectedTier}
              />
              <BillingPeriodToggle
                value={billingPeriod}
                onChange={setBillingPeriod}
              />
            </Section>

            {/* Customizations */}
            <Section>
              <h4>Customizations</h4>
              <NumberInput
                label="Additional Listings"
                value={additionalListings}
                onChange={setAdditionalListings}
                suffix={`× $${listingPrice} = $${additionalListings * listingPrice}`}
              />
              <NumberInput
                label="Additional Images Per Listing"
                value={additionalImages}
                onChange={setAdditionalImages}
                suffix={`× $${imagePrice} = $${additionalImages * imagePrice}`}
              />
              <FeatureSelector
                label="Add Custom Features"
                features={customFeatures}
                selected={selectedFeatures}
                onChange={setSelectedFeatures}
              />
            </Section>

            {/* Discounts */}
            <Section>
              <h4>Discounts</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={addDiscount}
              >
                + Add Discount
              </Button>
              {discounts.map((discount, idx) => (
                <DiscountRow
                  key={idx}
                  discount={discount}
                  onChange={(updated) => updateDiscount(idx, updated)}
                  onRemove={() => removeDiscount(idx)}
                />
              ))}
            </Section>

            {/* Terms */}
            <Section>
              <h4>Terms & Conditions</h4>
              <DatePicker
                label="Valid Until"
                value={validUntil}
                onChange={setValidUntil}
              />
              <NumberInput
                label="Commitment (months)"
                value={commitment}
                onChange={setCommitment}
              />
              <Textarea
                label="Additional Notes"
                value={notes}
                onChange={setNotes}
              />
            </Section>
          </Card>
        </div>

        {/* Quote Preview (Right Column) */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <h3>Quote Summary</h3>
            </CardHeader>
            
            <QuotePreview>
              <PricingBreakdown>
                <Line label="Base Price" value={basePrice} />
                {customizations.map(custom => (
                  <Line
                    key={custom.id}
                    label={custom.label}
                    value={custom.price}
                  />
                ))}
                <Divider />
                <Line label="Subtotal" value={subtotal} bold />
                {discounts.map(discount => (
                  <Line
                    key={discount.id}
                    label={discount.label}
                    value={-discount.amount}
                    className="text-green-600"
                  />
                ))}
                <Divider />
                <Line
                  label="Total"
                  value={finalPrice}
                  large
                  bold
                />
                <Line
                  label="Per Month"
                  value={finalPrice / (billingPeriod === 'yearly' ? 12 : 1)}
                  small
                  muted
                />
              </PricingBreakdown>

              {/* Approval Status */}
              {needsApproval && (
                <Alert variant="warning">
                  Discount > 15% requires manager approval
                </Alert>
              )}
            </QuotePreview>

            {/* Actions */}
            <CardActions>
              <Button
                variant="primary"
                onClick={saveAndSend}
                disabled={needsApproval}
              >
                Save & Send Quote
              </Button>
              <Button variant="outline" onClick={saveDraft}>
                Save as Draft
              </Button>
              {needsApproval && (
                <Button variant="secondary" onClick={requestApproval}>
                  Request Approval
                </Button>
              )}
            </CardActions>
          </Card>
        </div>
      </div>

      {/* Recent Quotes */}
      <Card className="mt-6">
        <CardHeader>
          <h3>Recent Quotes</h3>
        </CardHeader>
        <QuotesList
          quotes={recentQuotes}
          onView={viewQuote}
          onEdit={editQuote}
          onSend={sendQuote}
        />
      </Card>
    </div>
  );
}
```

**Deliverables:**
- [ ] Quote backend service
- [ ] PDF generation
- [ ] Email tracking
- [ ] Approval workflow
- [ ] Quote acceptance flow
- [ ] Quote generator UI
- [ ] Quote tracking page
- [ ] Approval interface for managers
- [ ] Unit tests

---

### **Phase 6: A/B Testing & Experiments** 🧪 MEDIUM PRIORITY
**Duration:** 2 weeks  
**Effort:** High  
**Value:** Medium

#### 6.1 Experimentation Framework

**New File:** `backend/src/tier/experiments.ts`

```typescript
/**
 * Pricing Experimentation System
 * A/B test pricing, features, and messaging
 */

export interface PricingExperiment {
  experimentId: string;
  name: string;
  description: string;
  hypothesis: string;
  
  // Target
  targetTier: string;
  
  // Variants
  variants: {
    variantId: string;
    name: string;                    // "Control", "Variant A", etc.
    isControl: boolean;
    allocation: number;              // % of users (total must = 100)
    
    pricing: {
      monthly?: number;
      yearly?: number;
    };
    
    features?: TierFeature[];        // Feature differences
    messaging?: {
      headline?: string;
      description?: string;
      callToAction?: string;
    };
  }[];
  
  // Configuration
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  startDate: string;
  endDate?: string;
  minSampleSize: number;
  confidenceLevel: number;           // 90, 95, 99
  
  // Metrics
  primaryMetric: 'conversion_rate' | 'revenue' | 'signups' | 'retention';
  secondaryMetrics: string[];
  
  // Results
  results: {
    variantId: string;
    
    participants: number;
    signups: number;
    conversions: number;
    revenue: number;
    
    conversionRate: number;
    averageDealSize: number;
    retention30Day: number;
    retention90Day: number;
    
    confidenceInterval: {
      lower: number;
      upper: number;
    };
  }[];
  
  // Statistical Analysis
  winner?: string;
  statisticalSignificance: boolean;
  pValue: number;
  
  // Tracking
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

// API Handlers
export const createExperiment = async (event: APIGatewayProxyEvent) => {
  // Create experiment
  // Validate variant allocations sum to 100
  // Set up tracking
};

export const assignVariant = (
  experimentId: string,
  userId: string
): string => {
  // Consistent hash-based assignment
  // Ensures same user always gets same variant
  // Returns variantId
};

export const trackExperimentMetric = async (
  experimentId: string,
  userId: string,
  metric: string,
  value: number
) => {
  // Record metric for user's assigned variant
  // Update aggregates
};

export const getExperimentResults = async (
  experimentId: string
): Promise<{
  experiment: PricingExperiment;
  hasWinner: boolean;
  recommendation: string;
}> => {
  // Calculate results for each variant
  // Perform statistical tests
  // Determine if significant
  // Recommend action
};
```

#### 6.2 Experiment Dashboard

**New File:** `frontend/src/pages/admin/PricingExperiments.tsx`

```typescript
/**
 * Pricing Experiments Dashboard
 * Manage and monitor A/B tests
 */

export default function PricingExperiments() {
  return (
    <div className="p-6">
      <PageHeader
        title="Pricing Experiments"
        subtitle="A/B test pricing, features, and messaging"
        actions={
          <Button onClick={createExperiment}>
            New Experiment
          </Button>
        }
      />

      {/* Active Experiments */}
      <Section title="Active Experiments">
        <ExperimentGrid>
          {activeExperiments.map(exp => (
            <ExperimentCard
              key={exp.experimentId}
              experiment={exp}
              onView={() => viewExperiment(exp)}
              onPause={() => pauseExperiment(exp)}
            >
              {/* Live Results */}
              <VariantComparison variants={exp.results} />
              
              {/* Quick Stats */}
              <StatsGrid>
                <Stat label="Participants" value={exp.totalParticipants} />
                <Stat label="Days Running" value={exp.daysRunning} />
                <Stat label="Progress" value={`${exp.progress}%`} />
              </StatsGrid>
              
              {/* Winner Badge */}
              {exp.hasWinner && (
                <WinnerBadge variant={exp.winner} />
              )}
            </ExperimentCard>
          ))}
        </ExperimentGrid>
      </Section>

      {/* Experiment Detail View */}
      {selectedExperiment && (
        <ExperimentDetailModal experiment={selectedExperiment}>
          {/* Hypothesis */}
          <Section>
            <h4>Hypothesis</h4>
            <p>{selectedExperiment.hypothesis}</p>
          </Section>

          {/* Variants */}
          <Section>
            <h4>Variants</h4>
            <VariantTable variants={selectedExperiment.variants} />
          </Section>

          {/* Results */}
          <Section>
            <h4>Results</h4>
            <ResultsChart
              data={selectedExperiment.results}
              primaryMetric={selectedExperiment.primaryMetric}
            />
            <StatisticalSignificance
              pValue={selectedExperiment.pValue}
              confidence={selectedExperiment.confidenceLevel}
            />
          </Section>

          {/* Recommendations */}
          <Section>
            <h4>Recommendation</h4>
            <RecommendationCard experiment={selectedExperiment} />
          </Section>

          {/* Actions */}
          <Actions>
            {selectedExperiment.hasWinner && (
              <Button onClick={implementWinner}>
                Implement Winner
              </Button>
            )}
            <Button variant="outline" onClick={downloadReport}>
              Download Report
            </Button>
          </Actions>
        </ExperimentDetailModal>
      )}
    </div>
  );
}
```

**Deliverables:**
- [ ] Experimentation backend service
- [ ] Variant assignment algorithm
- [ ] Statistical analysis engine
- [ ] Metrics tracking
- [ ] API endpoints
- [ ] Frontend experiment dashboard
- [ ] Experiment creation wizard
- [ ] Results visualization
- [ ] Winner implementation flow
- [ ] Unit tests

---

### **Phase 7: Pricing Intelligence** 📊 LOW PRIORITY
**Duration:** 3 weeks  
**Effort:** High  
**Value:** Medium

_(Details in separate document: `PRICING_INTELLIGENCE.md`)_

Key Features:
- Market pricing analysis
- Competitor benchmarking
- Price elasticity modeling
- Dynamic pricing recommendations
- Feature valuation
- Tier optimization suggestions

---

## 📦 Database Schema Changes

### New Tables

#### tier_analytics (Time-series data)
```sql
{
  date: string (HASH),              // YYYY-MM-DD
  tierId: string (RANGE),
  activeSubscriptions: number,
  newSubscriptions: number,
  cancellations: number,
  revenue: number,
  // ... other metrics
}
GSI: TierIndex (tierId + date)
```

#### tier_transitions
```sql
{
  transitionId: string (HASH),
  userId: string,
  timestamp: string,
  fromTier: string,
  toTier: string,
  event: string,
  trigger: object,
  financialImpact: object,
  // ... transition details
}
GSI: UserIndex (userId + timestamp)
GSI: TierIndex (toTier + timestamp)
```

#### promotions
```sql
{
  promotionId: string (HASH),
  name: string,
  status: string,
  startDate: string,
  endDate: string,
  discountType: string,
  discountValue: number,
  targetTiers: list,
  // ... promotion details
}
GSI: StatusIndex (status + startDate)
```

#### promotion_redemptions
```sql
{
  redemptionId: string (HASH),
  promotionId: string,
  userId: string,
  redeemedAt: string,
  // ... redemption details
}
GSI: PromotionIndex (promotionId + redeemedAt)
GSI: UserIndex (userId + redeemedAt)
```

#### quotes
```sql
{
  quoteId: string (HASH),
  quoteNumber: string,
  salesRep: string,
  prospectEmail: string,
  status: string,
  createdAt: string,
  // ... quote details
}
GSI: SalesRepIndex (salesRep + createdAt)
GSI: StatusIndex (status + createdAt)
```

#### pricing_experiments
```sql
{
  experimentId: string (HASH),
  targetTier: string,
  status: string,
  startDate: string,
  variants: list,
  results: list,
  // ... experiment details
}
GSI: StatusIndex (status + startDate)
```

---

## 🔐 Permission Updates

### New Permissions

```typescript
export enum AdminPermission {
  // ... existing
  TIER_MANAGEMENT = 'tier_management',          // View/edit tiers
  PRICING_MANAGEMENT = 'pricing_management',    // Change pricing
  PROMOTION_MANAGEMENT = 'promotion_management',// Create/manage promos
  QUOTE_GENERATION = 'quote_generation',        // Generate quotes
  EXPERIMENT_MANAGEMENT = 'experiment_management', // A/B tests
  TIER_ANALYTICS = 'tier_analytics',            // View analytics
}
```

### Team Assignment

```typescript
// Sales Team Members
defaultPermissions: [
  'tier_management',
  'tier_analytics',
  'quote_generation',
  'view_customer_info',
  'view_leads',
]

// Sales Managers
managerPermissions: [
  // ... all member permissions +
  'pricing_management',
  'promotion_management',
  'experiment_management',
  'approve_custom_pricing',
  'view_revenue_metrics',
]
```

---

## 🧪 Testing Strategy

### Unit Tests
- Permission checks for each endpoint
- Analytics calculations
- Promotion validation logic
- Quote pricing calculations
- Experiment variant assignment
- Statistical analysis functions

### Integration Tests
- Complete tier lifecycle
- Customer journey transitions
- Promotion redemption flow
- Quote creation and acceptance
- Experiment creation and results
- Analytics data aggregation

### E2E Tests
- Sales rep creates promotion
- Manager approves custom pricing
- Customer redeems promotion code
- Analytics dashboard loads correctly
- Quote sent and accepted
- Experiment reaches conclusion

---

## 📈 Rollout Plan

### Week 1-2: Foundation
- ✅ Permission updates
- ✅ Sales team access
- ✅ Basic analytics backend

### Week 3-4: Core Analytics
- 📊 Analytics dashboard
- 📊 Metrics API
- 📊 Customer journey tracking

### Week 5-6: Sales Tools
- 💼 Promotions system
- 💼 Quote generator
- 💼 Approval workflows

### Week 7-9: Advanced Features
- 🧪 A/B testing framework
- 📈 Pricing intelligence
- 🤝 CRM integration

### Week 10: Polish & Launch
- 🎨 UI/UX improvements
- 📚 Documentation
- 🎓 Sales team training
- 🚀 Production deployment

---

## 📚 Documentation Deliverables

1. **Sales Team User Guide**
   - How to manage tiers
   - Creating promotions
   - Generating quotes
   - Reading analytics

2. **API Documentation**
   - All new endpoints
   - Request/response examples
   - Authentication requirements

3. **Admin Guide**
   - Permission management
   - Approval workflows
   - Experiment setup

4. **Developer Guide**
   - Architecture overview
   - Database schema
   - Integration points

---

## 🎯 Success Criteria

### Phase 1 (Foundation)
- ✅ Sales team can access tier management
- ✅ Permissions properly enforced
- ✅ No security regressions

### Phase 2 (Analytics)
- ✅ Real-time metrics displayed accurately
- ✅ Dashboard loads in < 2 seconds
- ✅ Data refreshes automatically

### Phase 3 (Customer Journey)
- ✅ All transitions tracked
- ✅ Upsell opportunities identified
- ✅ Churn risk calculated correctly

### Phase 4 (Promotions)
- ✅ Campaigns create successfully
- ✅ Codes validate correctly
- ✅ Redemptions tracked accurately

### Phase 5 (Quotes)
- ✅ Quotes generate correctly
- ✅ PDFs render properly
- ✅ Approval workflow functions

### Phase 6 (Experiments)
- ✅ Variants assigned consistently
- ✅ Metrics tracked accurately
- ✅ Statistical tests valid

---

## 🚀 Next Steps

1. **Review & Approve** - Stakeholder sign-off on plan
2. **Sprint Planning** - Break into 2-week sprints
3. **Resource Allocation** - Assign developers
4. **Kickoff Meeting** - Align team on goals
5. **Start Phase 1** - Begin implementation

---

## 📞 Contacts

- **Product Owner**: Sales Team Lead
- **Tech Lead**: Backend Engineering Lead
- **Frontend Lead**: Frontend Engineering Lead
- **QA Lead**: QA Team Lead
- **Stakeholders**: Sales Manager, Revenue Operations

---

**Document Version**: 1.0  
**Last Updated**: October 20, 2025  
**Status**: Draft - Pending Approval
