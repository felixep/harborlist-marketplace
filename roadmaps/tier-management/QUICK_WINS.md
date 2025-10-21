# Quick Wins - Tier Management for Sales Team
**Immediate Value Additions (Next 2 Weeks)**

These enhancements can be implemented quickly to provide immediate value to the sales team while the larger roadmap is being executed.

---

## 🎯 Week 1: Permission & Basic Metrics

### Day 1-2: Change Permission from SYSTEM_CONFIG to TIER_MANAGEMENT

**Impact**: Sales team can access tier management immediately  
**Effort**: 4 hours  
**Priority**: 🔴 CRITICAL

**Files to Change:**

```typescript
// 1. Add new permission (packages/shared-types/src/common.ts)
export enum AdminPermission {
  // ... existing
  TIER_MANAGEMENT = 'tier_management',
}

// 2. Update Sales team definition (packages/shared-types/src/teams.ts)
[TeamId.SALES]: {
  defaultPermissions: [
    // ... existing
    'tier_management',
  ],
  managerPermissions: [
    // ... existing
    'tier_management',
    'view_tier_metrics',
  ]
}

// 3. Update all tier endpoints (backend/src/tier/index.ts)
// Replace in 9 functions:
- requireAdminRole(user, [AdminPermission.SYSTEM_CONFIG]);
+ requireAdminRole(user, [AdminPermission.TIER_MANAGEMENT]);

// 4. Update backend permission mapping (backend/src/auth-service/interfaces.ts)
export const STAFF_PERMISSIONS = {
  [StaffRole.MANAGER]: [
    // ... existing
    AdminPermission.TIER_MANAGEMENT,
  ],
};
```

**Testing:**
```bash
# Create a sales team member
# Login as sales team member
# Access /admin/tiers
# Should see tier management page
# Should be able to view/edit tiers
```

---

### Day 3-4: Add "View Customers" to Tier Cards

**Impact**: See who's using each tier  
**Effort**: 6 hours  
**Priority**: 🟠 HIGH

**Backend API:**

```typescript
// backend/src/tier/customers.ts
export const getTierCustomers = async (event: APIGatewayProxyEvent) => {
  const user = await getUserFromEvent(event);
  requireAdminRole(user, [AdminPermission.TIER_MANAGEMENT]);
  
  const { tierId } = event.pathParameters;
  
  // Query users table for this tier
  const result = await dynamoDB.send(new QueryCommand({
    TableName: 'harborlist-users',
    IndexName: 'TierIndex',
    KeyConditionExpression: 'premiumTier = :tierId',
    ExpressionAttributeValues: {
      ':tierId': tierId
    }
  }));
  
  return response(200, {
    success: true,
    tierId,
    customers: result.Items.map(user => ({
      userId: user.userId,
      email: user.email,
      name: user.name,
      signupDate: user.createdAt,
      listingCount: user.listingCount || 0,
      lastActive: user.lastLoginDate,
    })),
    count: result.Count
  });
};
```

**Frontend Addition:**

```typescript
// frontend/src/pages/admin/TierManagement.tsx
<div className="tier-card">
  {/* Existing tier card content */}
  
  {/* Add this button */}
  <button
    onClick={() => viewCustomers(tier.tierId)}
    className="text-sm text-blue-600 hover:text-blue-800 mt-2"
  >
    View {customerCount} Customers →
  </button>
</div>

// Modal to show customers
<CustomerListModal
  tierId={selectedTier}
  customers={customers}
  onClose={() => setSelectedTier(null)}
/>
```

**Route:**
```typescript
// backend/src/local-server.ts
app.use('/api/admin/tiers/:tierId/customers', lambdaToExpress('./tier/customers'));
```

---

### Day 5: Add Basic Metrics to Tier Cards

**Impact**: See key metrics at a glance  
**Effort**: 4 hours  
**Priority**: 🟠 HIGH

**Backend:**

```typescript
// backend/src/tier/index.ts - Enhance listTiers
export const listTiers = async (event) => {
  // ... existing code
  
  // For each tier, add metrics
  const tiersWithMetrics = await Promise.all(tiers.map(async (tier) => {
    // Count active subscriptions
    const activeCount = await dynamoDB.send(new QueryCommand({
      TableName: 'harborlist-users',
      IndexName: 'TierIndex',
      KeyConditionExpression: 'premiumTier = :tierId',
      ExpressionAttributeValues: { ':tierId': tier.tierId },
      Select: 'COUNT'
    }));
    
    // Calculate MRR
    const mrr = (tier.pricing.monthly || 0) * activeCount.Count;
    
    return {
      ...tier,
      metrics: {
        activeSubscriptions: activeCount.Count,
        mrr: mrr,
        arr: mrr * 12,
      }
    };
  }));
  
  return response(200, {
    success: true,
    tiers: tiersWithMetrics,
    // ... rest
  });
};
```

**Frontend:**

```typescript
// frontend/src/pages/admin/TierManagement.tsx
<div className="tier-card">
  {/* Existing content */}
  
  {/* Add metrics section */}
  <div className="mt-4 pt-4 border-t border-gray-200">
    <div className="grid grid-cols-3 gap-4 text-center">
      <div>
        <div className="text-2xl font-bold text-gray-900">
          {tier.metrics.activeSubscriptions}
        </div>
        <div className="text-xs text-gray-500">Active</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-green-600">
          ${tier.metrics.mrr.toLocaleString()}
        </div>
        <div className="text-xs text-gray-500">MRR</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-blue-600">
          ${tier.metrics.arr.toLocaleString()}
        </div>
        <div className="text-xs text-gray-500">ARR</div>
      </div>
    </div>
  </div>
</div>
```

---

## 🎯 Week 2: Customer Journey & Tier Changes

### Day 6-8: Track Tier Changes in Audit Log

**Impact**: See history of all tier modifications  
**Effort**: 8 hours  
**Priority**: 🟡 MEDIUM

**Backend:**

```typescript
// backend/src/tier/audit.ts
export interface TierAuditEntry {
  auditId: string;
  timestamp: string;
  tierId: string;
  tierName: string;
  
  action: 'tier_created' | 'tier_updated' | 'tier_deleted' | 'feature_added' | 'feature_removed' | 'pricing_changed';
  
  actor: {
    userId: string;
    email: string;
    role: string;
  };
  
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  
  impact: {
    affectedUsers?: number;
    revenueChange?: number;
  };
}

export const logTierChange = async (entry: TierAuditEntry) => {
  await dynamoDB.send(new PutCommand({
    TableName: 'harborlist-audit-logs',
    Item: {
      ...entry,
      auditId: `tier-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      category: 'tier_management',
    }
  }));
};

// Call from each tier modification endpoint
```

**Frontend:**

```typescript
// frontend/src/pages/admin/TierManagement.tsx
<Card>
  <CardHeader>
    <h3>Recent Changes</h3>
  </CardHeader>
  <AuditLogTable
    logs={recentChanges}
    columns={['Time', 'Action', 'User', 'Tier', 'Impact']}
  />
</Card>
```

---

### Day 9-10: Simple Tier Upgrade/Downgrade Tool

**Impact**: Quick actions for customer success  
**Effort**: 6 hours  
**Priority**: 🟡 MEDIUM

**Backend:**

```typescript
// backend/src/tier/user-tier-management.ts
export const changeTierForUser = async (event: APIGatewayProxyEvent) => {
  const admin = await getUserFromEvent(event);
  requireAdminRole(admin, [AdminPermission.TIER_MANAGEMENT]);
  
  const { userId, newTierId, reason } = JSON.parse(event.body);
  
  // Get user
  const user = await getUser(userId);
  const oldTier = user.premiumTier;
  
  // Update user tier
  await updateUser(userId, {
    premiumTier: newTierId,
    premiumActive: true, // Assuming upgrade
    updatedAt: new Date().toISOString()
  });
  
  // Log transition
  await logTierTransition({
    userId,
    fromTier: oldTier,
    toTier: newTierId,
    trigger: {
      type: 'sales_assisted',
      salesRep: admin.email,
      reason
    }
  });
  
  // Send notification to user
  await sendEmail({
    to: user.email,
    template: 'tier_change',
    data: { oldTier, newTier: newTierId }
  });
  
  return response(200, {
    success: true,
    message: 'Tier updated successfully'
  });
};
```

**Frontend:**

```typescript
// frontend/src/components/admin/TierChangeDialog.tsx
function TierChangeDialog({ user, currentTier, onClose, onSave }) {
  return (
    <Modal title={`Change Tier for ${user.name}`}>
      <div className="space-y-4">
        <div>
          <label>Current Tier</label>
          <div className="font-semibold">{currentTier.name}</div>
        </div>
        
        <div>
          <label>New Tier</label>
          <select value={newTier} onChange={(e) => setNewTier(e.target.value)}>
            {availableTiers.map(tier => (
              <option key={tier.tierId} value={tier.tierId}>
                {tier.name} - ${tier.pricing.monthly}/mo
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label>Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this tier change being made?"
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSave}>Update Tier</button>
        </div>
      </div>
    </Modal>
  );
}
```

**Usage:**
```typescript
// From customer list modal
<button onClick={() => changeTier(customer)}>
  Change Tier
</button>
```

---

## 📊 Summary of Quick Wins

| Enhancement | Days | Priority | Value |
|-------------|------|----------|-------|
| Change to TIER_MANAGEMENT permission | 2 | 🔴 CRITICAL | Sales team access |
| View Customers per Tier | 2 | 🟠 HIGH | Customer visibility |
| Basic Metrics on Cards | 1 | 🟠 HIGH | Quick insights |
| Tier Change Audit Log | 3 | 🟡 MEDIUM | Accountability |
| Manual Tier Change Tool | 2 | 🟡 MEDIUM | Customer success |
| **TOTAL** | **10 days** | | **Immediate ROI** |

---

## 🚀 Implementation Order

**Sprint 1 (Week 1):**
1. ✅ Day 1-2: Permission change (blocks everything else)
2. ✅ Day 3-4: View customers per tier
3. ✅ Day 5: Basic metrics on cards

**Sprint 2 (Week 2):**
4. ✅ Day 6-8: Audit logging
5. ✅ Day 9-10: Manual tier change tool

---

## 🧪 Testing Checklist

**Permission Changes:**
- [ ] Sales team member can access /admin/tiers
- [ ] Sales manager can modify tiers
- [ ] Non-sales staff cannot access tier management
- [ ] System admin can still access (for troubleshooting)

**View Customers:**
- [ ] Customer list shows correct users for each tier
- [ ] Sorting and filtering work
- [ ] Performance acceptable (< 1s load time)

**Metrics:**
- [ ] Active subscription counts accurate
- [ ] MRR/ARR calculations correct
- [ ] Metrics update when users change tiers

**Audit Log:**
- [ ] All tier changes logged
- [ ] Actor information captured
- [ ] Changes detailed correctly
- [ ] Search and filter functional

**Tier Changes:**
- [ ] User tier updates correctly
- [ ] Transition logged
- [ ] Email notifications sent
- [ ] UI reflects change immediately

---

## 📈 Success Metrics

After implementing these quick wins, measure:

1. **Sales Team Adoption**
   - % of sales team accessing tier management weekly
   - Target: >80%

2. **Customer Visibility**
   - Avg time to find customer's tier
   - Target: <10 seconds

3. **Tier Changes**
   - Number of tier changes per week
   - Target: >5 (shows tool is useful)

4. **Time Savings**
   - Time to complete common tasks
   - Target: 50% reduction vs manual process

---

## 💡 Additional Nice-to-Haves (If Time Permits)

### Export Customer List
```typescript
// Add export button
<button onClick={exportCustomers}>
  Export to CSV
</button>

// Generate CSV
const exportCustomers = (customers) => {
  const csv = [
    ['Email', 'Name', 'Tier', 'Signup Date', 'Listings'],
    ...customers.map(c => [c.email, c.name, c.tier, c.signupDate, c.listingCount])
  ].map(row => row.join(',')).join('\n');
  
  downloadFile(csv, 'customers.csv');
};
```

### Quick Filters
```typescript
// Add to customer list
<FilterBar>
  <Filter label="Active Only" />
  <Filter label="At Risk" />
  <Filter label="High Value" />
  <Filter label="New This Month" />
</FilterBar>
```

### Tier Comparison View
```typescript
// Side-by-side comparison
<TierComparisonTable>
  <Column tier="free-individual" />
  <Column tier="premium-individual" />
  <Row label="Max Listings" />
  <Row label="Max Images" />
  <Row label="Price" />
  <Row label="Active Users" />
  <Row label="MRR" />
</TierComparisonTable>
```

---

## 🔄 Next Steps After Quick Wins

Once quick wins are deployed:

1. **Gather Feedback** - Interview 3-5 sales team members
2. **Measure Impact** - Track adoption and time savings
3. **Prioritize Phase 2** - Based on feedback, choose next features
4. **Plan Sprint** - Schedule Phase 2 implementation

**Recommended Phase 2 Features:**
- Analytics dashboard (most requested)
- Promotional campaigns (high revenue impact)
- Customer journey tracking (strategic value)

---

**Status**: Ready to Implement  
**Estimated Completion**: 2 weeks  
**Team Required**: 1 Backend Developer + 1 Frontend Developer  
**Review Date**: October 22, 2025
