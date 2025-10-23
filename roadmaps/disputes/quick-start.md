# Dispute System - Quick Start Guide

## 🎯 MVP (Minimum Viable Product) - 1 Week

If you need disputes working ASAP, focus on these core features:

### Day 1-2: Backend Foundation
```bash
# 1. Create disputes table
aws dynamodb create-table --table-name harborlist-disputes ...

# 2. Create dispute-service
backend/src/dispute-service/index.ts
  - POST /api/disputes
  - GET /api/disputes/:id
  - GET /api/admin/disputes
  - PUT /api/admin/disputes/:id/status

# 3. Update local-server.ts
app.use('/api/disputes', lambdaToExpress('./dispute-service'));
```

### Day 3-4: Customer UI
```tsx
// Transaction History - Add dispute button
<button onClick={() => openDisputeModal(transaction)}>
  Dispute
</button>

// Dispute Modal
<DisputeModal
  transaction={transaction}
  onSubmit={createDispute}
/>
```

### Day 5-7: Admin UI
```tsx
// Update FinancialManagement.tsx Disputes Tab
const disputes = await adminApi.getDisputes();

// Add action buttons
<button onClick={() => resolveDispute(disputeId, 'refund')}>
  Refund
</button>
```

## 📋 Essential Fields Only

### Dispute Record (Minimum)
```typescript
{
  disputeId: string;
  transactionId: string;
  userId: string;
  amount: number;
  reason: 'unauthorized' | 'not_received' | 'not_as_described';
  description: string;
  status: 'open' | 'under_review' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
}
```

## 🚀 Implementation Order

### Priority 1: Core Flow (Week 1)
1. ✅ Database table
2. ✅ Create dispute endpoint
3. ✅ List disputes endpoint
4. ✅ Customer dispute button
5. ✅ Admin dispute list
6. ✅ Admin resolve action

### Priority 2: Enhancements (Week 2)
7. Evidence upload
8. Email notifications
9. In-app notifications
10. Status tracking
11. Refund processing
12. Analytics basics

### Priority 3: Integration (Week 3)
13. Stripe webhooks
14. Evidence submission to Stripe
15. Auto-escalation
16. Advanced analytics
17. Bulk actions
18. Documentation

## 🔑 Key Decisions

### 1. Where to Store Disputes?
**Recommended**: Separate `harborlist-disputes` table
- Clean separation
- Better query patterns
- Easier to add features

### 2. Who Can Dispute?
**Recommended**: Transaction owner only
- Must be completed transaction
- Within 60 days
- Not already refunded

### 3. Refund Handling?
**Recommended**: Manual admin approval
- Review evidence first
- Full or partial refund
- Track in transaction history

### 4. Stripe Integration?
**Start**: Manual handling
**Later**: Webhook automation
- Phase 1: Platform disputes only
- Phase 2: Add Stripe webhooks

## 📊 Simple Analytics

Track these 4 metrics first:
1. **Open disputes** - How many need attention
2. **Resolution time** - Average days to resolve
3. **Dispute rate** - Disputes / transactions (%)
4. **Refund rate** - Refunds / disputes (%)

## 🎨 UI Components Priority

### Must Have
- ✅ Dispute button on transactions
- ✅ Dispute form modal
- ✅ Admin dispute list
- ✅ Status change dropdown

### Nice to Have
- Evidence upload
- Timeline view
- Bulk actions
- Advanced filters
- Charts/graphs

## ⚡ Quick Win Features

These add big value with minimal effort:

1. **Auto-assign by workload** (30 min)
2. **Email on dispute creation** (1 hour)
3. **Status badge on transactions** (30 min)
4. **Quick filters** (open, mine, high priority) (1 hour)
5. **Dispute count on admin nav** (30 min)

## 🐛 Common Pitfalls

### ❌ Don't Do This
- Store full card numbers
- Allow disputes on any transaction
- Process refunds without verification
- Ignore Stripe dispute deadlines
- Skip evidence collection

### ✅ Do This
- Validate transaction eligibility
- Require description (min 50 chars)
- Log all actions for audit
- Set up notifications
- Test with Stripe test mode first

## 🧪 Testing Checklist

### Manual Tests
- [ ] Create dispute as customer
- [ ] View dispute in admin panel
- [ ] Change dispute status
- [ ] Process refund
- [ ] Receive notifications
- [ ] Try to dispute twice (should fail)
- [ ] Try to dispute old transaction (should fail)

### Stripe Tests (if integrated)
- [ ] Webhook signature verification
- [ ] Create test dispute in Stripe dashboard
- [ ] Verify dispute syncs to platform
- [ ] Submit evidence to Stripe
- [ ] Handle dispute closure from Stripe

## 📚 Code Snippets

### Create Dispute (Backend)
```typescript
async function createDispute(event: APIGatewayProxyEvent) {
  const { transactionId, reason, description } = JSON.parse(event.body);
  const userId = event.requestContext.authorizer.userId;
  
  // Validate transaction eligibility
  const transaction = await getTransaction(transactionId);
  if (transaction.userId !== userId) {
    return createErrorResponse(403, 'NOT_AUTHORIZED');
  }
  if (transaction.status !== 'completed') {
    return createErrorResponse(400, 'INVALID_TRANSACTION');
  }
  
  // Create dispute
  const dispute = {
    disputeId: generateId(),
    transactionId,
    userId,
    amount: transaction.amount,
    reason,
    description,
    status: 'open',
    createdAt: new Date().toISOString()
  };
  
  await docClient.send(new PutCommand({
    TableName: DISPUTES_TABLE,
    Item: dispute
  }));
  
  // Send notification
  await createNotification({
    userId,
    type: 'dispute_created',
    title: 'Dispute Created',
    message: 'Your dispute has been submitted for review.',
    link: `/disputes/${dispute.disputeId}`
  });
  
  return createResponse(200, dispute);
}
```

### Dispute Button (Frontend)
```tsx
function TransactionRow({ transaction }) {
  const canDispute = 
    transaction.status === 'completed' &&
    !transaction.isDisputed &&
    !transaction.isRefunded &&
    daysSince(transaction.completedAt) < 60;
  
  return (
    <tr>
      <td>{transaction.description}</td>
      <td>${transaction.amount / 100}</td>
      <td>{transaction.status}</td>
      <td>
        {canDispute && (
          <button onClick={() => openDisputeModal(transaction)}>
            Dispute
          </button>
        )}
      </td>
    </tr>
  );
}
```

## 📞 Support & Help

### Questions to Ask Before Building
1. What's the expected dispute volume? (affects architecture)
2. Who handles disputes? (dedicated team vs all admins)
3. What's the SLA for resolution? (affects priority/automation)
4. Are there legal/compliance requirements? (affects process)
5. Which payment processors to support? (Stripe, PayPal, both?)

### Resources
- [Full Implementation Plan](./implementation-plan.md)
- [Dispute System Documentation](../docs/CUSTOMER_DISPUTE_SYSTEM.md)
- [Stripe Disputes API](https://stripe.com/docs/disputes)
- [Card Network Chargeback Rules](https://stripe.com/docs/disputes/preventing)

---

**Remember**: Start simple, iterate based on real usage!
