# Enhanced Features Troubleshooting Guide

## Overview

This guide covers common issues and solutions for the enhanced HarborList features including multi-engine listings, user tier management, billing, finance calculations, and content moderation.

## Multi-Engine Listing Issues

### Engine Configuration Problems

#### Issue: "Total horsepower calculation is incorrect"

**Symptoms:**
- Displayed total horsepower doesn't match sum of individual engines
- Search results don't include listing when filtering by horsepower

**Diagnosis:**
```typescript
// Check engine data consistency
const listing = await listingService.getListingWithEngines(listingId);
const calculatedHP = listing.engines.reduce((sum, engine) => sum + engine.horsepower, 0);
console.log('Stored HP:', listing.totalHorsepower);
console.log('Calculated HP:', calculatedHP);
```

**Solutions:**
1. **Recalculate total horsepower:**
   ```typescript
   await listingService.updateTotalHorsepower(listingId);
   ```

2. **Check for invalid engine data:**
   ```typescript
   const invalidEngines = listing.engines.filter(e => 
     !e.horsepower || e.horsepower <= 0 || isNaN(e.horsepower)
   );
   ```

3. **Database consistency check:**
   ```sql
   -- Check for orphaned engine records
   SELECT * FROM engines WHERE listingId NOT IN (SELECT listingId FROM listings);
   ```

#### Issue: "Cannot add more than 4 engines"

**Symptoms:**
- Form prevents adding additional engines
- API returns validation error

**Solutions:**
1. **Check current engine count:**
   ```typescript
   if (listing.engines.length >= 4) {
     throw new Error('Maximum 4 engines supported');
   }
   ```

2. **Remove unused engines first:**
   ```typescript
   await engineService.removeEngine(engineId);
   ```

3. **Contact support for boats with more than 4 engines**

### SEO-Friendly URL Issues

#### Issue: "Listing URL returns 404 error"

**Symptoms:**
- SEO-friendly URLs not working
- Slug-based routing fails

**Diagnosis:**
```typescript
// Check slug generation and uniqueness
const listing = await listingService.getBySlug(slug);
const duplicateSlugs = await listingService.findDuplicateSlugs(slug);
```

**Solutions:**
1. **Regenerate slug:**
   ```typescript
   const newSlug = generateUniqueSlug(listing.title);
   await listingService.updateSlug(listingId, newSlug);
   ```

2. **Check slug format:**
   ```typescript
   const validSlug = /^[a-z0-9-]+$/.test(slug);
   ```

3. **Fallback to ID-based URL:**
   ```typescript
   if (!listing) {
     // Try ID-based lookup as fallback
     listing = await listingService.getById(extractIdFromSlug(slug));
   }
   ```

## User Tier Management Issues

### Premium Membership Problems

#### Issue: "User cannot access premium features after upgrade"

**Symptoms:**
- Premium features not available after payment
- User tier shows as upgraded but features disabled

**Diagnosis:**
```typescript
// Check user tier and capabilities
const user = await userService.getUser(userId);
console.log('User Type:', user.userType);
console.log('Premium Active:', user.premiumActive);
console.log('Capabilities:', user.capabilities);
console.log('Membership Expires:', new Date(user.premiumExpiresAt));
```

**Solutions:**
1. **Refresh user capabilities:**
   ```typescript
   await userService.refreshCapabilities(userId);
   ```

2. **Check billing status:**
   ```typescript
   const billing = await billingService.getBillingAccount(userId);
   if (billing.status !== 'active') {
     await billingService.reactivateAccount(userId);
   }
   ```

3. **Manual capability assignment:**
   ```typescript
   await userService.assignCapabilities(userId, [
     { feature: 'priority_placement', enabled: true },
     { feature: 'enhanced_analytics', enabled: true }
   ]);
   ```

#### Issue: "Tier limits not enforced correctly"

**Symptoms:**
- Users can exceed their tier limits
- Features available that shouldn't be

**Diagnosis:**
```typescript
// Check capability enforcement
const userLimits = await userService.getUserLimits(userId);
const currentUsage = await userService.getCurrentUsage(userId);
console.log('Limits:', userLimits);
console.log('Usage:', currentUsage);
```

**Solutions:**
1. **Enforce limits in middleware:**
   ```typescript
   export const enforceTierLimits = async (userId: string, action: string) => {
     const limits = await userService.getUserLimits(userId);
     const usage = await userService.getCurrentUsage(userId);
     
     if (usage.listings >= limits.maxListings) {
       throw new TierLimitExceededError('Maximum listings reached');
     }
   };
   ```

2. **Update usage counters:**
   ```typescript
   await userService.updateUsageCounters(userId);
   ```

### Sales Role Issues

#### Issue: "Sales rep cannot manage assigned customers"

**Symptoms:**
- Permission denied errors for customer management
- Cannot modify customer plans or capabilities

**Diagnosis:**
```typescript
// Check sales rep permissions
const salesRep = await userService.getUser(salesRepId);
console.log('Role:', salesRep.role);
console.log('Permissions:', salesRep.permissions);
console.log('Assigned Customers:', salesRep.assignedCustomers);
```

**Solutions:**
1. **Verify sales role permissions:**
   ```typescript
   const requiredPermissions = [
     'USER_MANAGEMENT',
     'TIER_MANAGEMENT', 
     'CAPABILITY_ASSIGNMENT'
   ];
   
   const hasPermissions = requiredPermissions.every(p => 
     salesRep.permissions.includes(p)
   );
   ```

2. **Check customer assignment:**
   ```typescript
   const isAssigned = await salesService.isCustomerAssigned(salesRepId, customerId);
   if (!isAssigned) {
     await salesService.assignCustomer(salesRepId, customerId);
   }
   ```

## Billing and Payment Issues

### Payment Processing Problems

#### Issue: "Payment fails during premium upgrade"

**Symptoms:**
- Payment processor returns error
- Subscription not created despite successful payment

**Diagnosis:**
```typescript
// Check payment method and billing account
const paymentMethod = await billingService.getPaymentMethod(paymentMethodId);
const billingAccount = await billingService.getBillingAccount(userId);
console.log('Payment Method:', paymentMethod);
console.log('Billing Status:', billingAccount?.status);
```

**Solutions:**
1. **Retry payment with error handling:**
   ```typescript
   try {
     await billingService.processPayment(userId, amount, paymentMethodId);
   } catch (error) {
     if (error.code === 'CARD_DECLINED') {
       // Notify user to update payment method
       await notificationService.sendPaymentFailureNotification(userId);
     }
   }
   ```

2. **Check payment processor status:**
   ```typescript
   const processorStatus = await paymentProcessor.getStatus();
   if (!processorStatus.operational) {
     // Use backup payment processor or queue for retry
   }
   ```

3. **Manual subscription creation:**
   ```typescript
   await billingService.createManualSubscription(userId, plan, {
     reason: 'Payment processor issue',
     adminId: 'admin_123'
   });
   ```

#### Issue: "Subscription renewal fails"

**Symptoms:**
- Automatic renewal doesn't process
- User downgraded unexpectedly

**Diagnosis:**
```typescript
// Check renewal status and payment history
const subscription = await billingService.getSubscription(subscriptionId);
const recentTransactions = await billingService.getRecentTransactions(userId, 30);
console.log('Next Billing Date:', new Date(subscription.nextBillingDate));
console.log('Recent Transactions:', recentTransactions);
```

**Solutions:**
1. **Retry failed renewal:**
   ```typescript
   await billingService.retryRenewal(subscriptionId);
   ```

2. **Update payment method:**
   ```typescript
   await billingService.updatePaymentMethod(userId, newPaymentMethodId);
   ```

3. **Extend grace period:**
   ```typescript
   await billingService.extendGracePeriod(userId, 7); // 7 days
   ```

## Finance Calculator Issues

### Calculation Problems

#### Issue: "Finance calculations are incorrect"

**Symptoms:**
- Monthly payment doesn't match expected value
- Total interest calculation seems wrong

**Diagnosis:**
```typescript
// Verify calculation inputs and formula
const params = {
  boatPrice: 100000,
  downPayment: 20000,
  interestRate: 6.5,
  termMonths: 180
};

const manualCalculation = calculateLoanPayment(
  params.boatPrice - params.downPayment,
  params.interestRate / 100 / 12,
  params.termMonths
);

console.log('Service Result:', serviceResult.monthlyPayment);
console.log('Manual Calculation:', manualCalculation);
```

**Solutions:**
1. **Verify loan formula implementation:**
   ```typescript
   function calculateLoanPayment(principal: number, monthlyRate: number, termMonths: number): number {
     if (monthlyRate === 0) {
       return principal / termMonths;
     }
     
     const factor = Math.pow(1 + monthlyRate, termMonths);
     return principal * (monthlyRate * factor) / (factor - 1);
   }
   ```

2. **Check for rounding errors:**
   ```typescript
   const roundedPayment = Math.round(monthlyPayment * 100) / 100;
   ```

3. **Validate input parameters:**
   ```typescript
   if (interestRate < 0 || interestRate > 50) {
     throw new Error('Invalid interest rate');
   }
   ```

#### Issue: "Saved calculations not loading"

**Symptoms:**
- User's saved calculations don't appear
- Calculation sharing links broken

**Diagnosis:**
```typescript
// Check calculation storage and retrieval
const savedCalculations = await financeService.getSavedCalculations(userId);
const sharedCalculation = await financeService.getSharedCalculation(shareId);
console.log('Saved Calculations:', savedCalculations.length);
console.log('Shared Calculation:', sharedCalculation);
```

**Solutions:**
1. **Check user authentication:**
   ```typescript
   if (!userId) {
     throw new Error('User must be logged in to save calculations');
   }
   ```

2. **Verify share link expiration:**
   ```typescript
   if (sharedCalculation.expiresAt < Date.now()) {
     throw new Error('Shared calculation has expired');
   }
   ```

3. **Regenerate share link:**
   ```typescript
   const newShareId = await financeService.createShareLink(calculationId);
   ```

## Content Moderation Issues

### Moderation Queue Problems

#### Issue: "Listings stuck in moderation queue"

**Symptoms:**
- Listings remain in "pending_review" status
- No moderator assigned to queue items

**Diagnosis:**
```typescript
// Check queue status and assignments
const queueItem = await moderationService.getQueueItem(listingId);
const availableModerators = await moderationService.getAvailableModerators();
console.log('Queue Item:', queueItem);
console.log('Available Moderators:', availableModerators.length);
```

**Solutions:**
1. **Auto-assign to available moderator:**
   ```typescript
   const moderator = await moderationService.getNextAvailableModerator();
   await moderationService.assignToModerator(queueId, moderator.userId);
   ```

2. **Escalate high-priority items:**
   ```typescript
   if (queueItem.priority === 'high' && queueItem.submittedAt < Date.now() - 3600000) {
     await moderationService.escalateToSeniorModerator(queueId);
   }
   ```

3. **Manual approval for stuck items:**
   ```typescript
   await moderationService.manualApproval(queueId, {
     reason: 'Queue processing issue',
     adminId: 'admin_123'
   });
   ```

#### Issue: "Moderation decisions not updating listing status"

**Symptoms:**
- Listing approved but still shows as pending
- Rejected listings still visible to users

**Diagnosis:**
```typescript
// Check moderation decision processing
const moderationHistory = await moderationService.getModerationHistory(listingId);
const currentStatus = await listingService.getListingStatus(listingId);
console.log('Moderation History:', moderationHistory);
console.log('Current Status:', currentStatus);
```

**Solutions:**
1. **Reprocess moderation decision:**
   ```typescript
   await moderationService.reprocessDecision(queueId);
   ```

2. **Manual status update:**
   ```typescript
   await listingService.updateStatus(listingId, 'active');
   ```

3. **Check for transaction failures:**
   ```typescript
   // Ensure atomic updates
   await database.transaction([
     { update: { table: 'moderation_queue', key: queueId, data: { status: 'approved' } } },
     { update: { table: 'listings', key: listingId, data: { status: 'active' } } }
   ]);
   ```

## Performance Issues

### Database Performance

#### Issue: "Slow query performance for multi-engine searches"

**Symptoms:**
- Search results take too long to load
- Database timeouts on complex queries

**Diagnosis:**
```typescript
// Analyze query performance
const startTime = Date.now();
const results = await searchService.searchByEngineSpecs(filters);
const queryTime = Date.now() - startTime;
console.log('Query Time:', queryTime, 'ms');
console.log('Results Count:', results.length);
```

**Solutions:**
1. **Optimize query with proper indexes:**
   ```typescript
   // Use GSI for engine type queries
   const params = {
     TableName: 'boat-engines',
     IndexName: 'EngineTypeIndex',
     KeyConditionExpression: '#type = :type',
     FilterExpression: 'horsepower BETWEEN :minHp AND :maxHp'
   };
   ```

2. **Implement caching:**
   ```typescript
   const cacheKey = `search:${JSON.stringify(filters)}`;
   let results = await cache.get(cacheKey);
   if (!results) {
     results = await searchService.searchByEngineSpecs(filters);
     await cache.setex(cacheKey, 300, JSON.stringify(results)); // 5 min cache
   }
   ```

3. **Use pagination:**
   ```typescript
   const paginatedResults = await searchService.searchWithPagination(filters, {
     limit: 20,
     lastEvaluatedKey: cursor
   });
   ```

### Frontend Performance

#### Issue: "Finance calculator slow to update"

**Symptoms:**
- Calculation updates lag behind user input
- UI becomes unresponsive during calculations

**Solutions:**
1. **Debounce calculation updates:**
   ```typescript
   const debouncedCalculate = useMemo(
     () => debounce(calculatePayments, 300),
     [calculatePayments]
   );
   ```

2. **Use web workers for complex calculations:**
   ```typescript
   const worker = new Worker('/finance-calculator-worker.js');
   worker.postMessage({ params });
   worker.onmessage = (e) => {
     setCalculation(e.data);
   };
   ```

3. **Optimize rendering:**
   ```typescript
   const MemoizedCalculator = React.memo(FinanceCalculator, (prevProps, nextProps) => {
     return prevProps.boatPrice === nextProps.boatPrice &&
            prevProps.parameters === nextProps.parameters;
   });
   ```

## Monitoring and Alerting

### Setting Up Alerts

```typescript
// CloudWatch alarms for enhanced features
const alarms = [
  {
    name: 'HighModerationQueueBacklog',
    metric: 'ModerationQueue.PendingCount',
    threshold: 100,
    action: 'notify-moderation-team'
  },
  {
    name: 'PaymentProcessingFailures',
    metric: 'Billing.FailedPayments',
    threshold: 10,
    action: 'notify-billing-team'
  },
  {
    name: 'FinanceCalculatorErrors',
    metric: 'Finance.CalculationErrors',
    threshold: 50,
    action: 'notify-dev-team'
  }
];
```

### Health Checks

```typescript
// Comprehensive health check for enhanced features
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const checks = await Promise.allSettled([
    checkMultiEngineListings(),
    checkUserTierSystem(),
    checkBillingSystem(),
    checkFinanceCalculator(),
    checkModerationQueue()
  ]);
  
  return {
    status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'degraded',
    checks: checks.map((check, index) => ({
      name: ['multi-engine', 'user-tiers', 'billing', 'finance', 'moderation'][index],
      status: check.status,
      error: check.status === 'rejected' ? check.reason : null
    })),
    timestamp: new Date().toISOString()
  };
}
```

For additional troubleshooting support, contact the HarborList technical support team or check the system status dashboard.