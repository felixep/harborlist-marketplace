# Customer Dispute System - Implementation Roadmap

## Project Overview
Build a comprehensive customer dispute system for HarborList that allows customers to dispute transactions and admins to manage/resolve disputes efficiently.

**Goal**: Enable customers to dispute payments and provide admins with tools to investigate and resolve disputes fairly.

**Timeline**: 2-3 weeks
**Priority**: Medium-High
**Dependencies**: 
- Existing transaction/billing system
- Notification system ✅ (already implemented)
- Email service
- Payment processor integration (Stripe)

---

## Phase 1: Foundation & Database Schema (2-3 days)

### 1.1 Database Design
**Task**: Design and implement disputes data model
**Assignee**: Backend Developer
**Estimated Time**: 4-6 hours

**Deliverables**:
- [ ] Create DynamoDB disputes table schema
- [ ] Add GSI indexes for efficient queries (userId, transactionId, status)
- [ ] Update shared-types package with Dispute interfaces
- [ ] Create DynamoDB table via CDK/CloudFormation
- [ ] Update local setup script for disputes table

**Schema Decision**:
```typescript
// Option A: Separate Disputes Table (RECOMMENDED)
Table: harborlist-disputes
PK: disputeId
GSI1: userId-createdAt-index
GSI2: transactionId-index  
GSI3: status-priority-index

// Benefits: Clean separation, better query patterns, scalability
```

**Files to Create/Update**:
```
backend/src/shared/database.ts
  - Add createDispute()
  - Add getDispute()
  - Add updateDisputeStatus()
  - Add getDisputesByUser()
  - Add getDisputesByTransaction()
  - Add getDisputesByStatus()

packages/shared-types/src/common.ts
  - Add Dispute interface
  - Add DisputeReason enum
  - Add DisputeStatus enum
  - Add DisputeEvidence interface
  - Add DisputeTimeline interface

infrastructure/lib/harborlist-stack.ts
  - Add disputesTable definition
  - Add GSI configurations
  - Add Lambda permissions

tools/development/setup-local-dynamodb.sh
  - Add disputes table creation
```

### 1.2 Backend Service Setup
**Task**: Create dispute service Lambda handler
**Assignee**: Backend Developer
**Estimated Time**: 4-6 hours

**Deliverables**:
- [ ] Create `backend/src/dispute-service/index.ts`
- [ ] Implement core CRUD endpoints
- [ ] Add validation middleware
- [ ] Add authorization checks
- [ ] Add error handling
- [ ] Update local-server.ts routes

**Endpoints to Implement**:
```typescript
// Customer endpoints
POST   /api/disputes                    // Create dispute
GET    /api/disputes/:disputeId         // Get dispute details
GET    /api/disputes                    // List user's disputes
POST   /api/disputes/:disputeId/evidence // Add evidence
DELETE /api/disputes/:disputeId         // Cancel dispute (before review)

// Admin endpoints  
GET    /api/admin/disputes               // List all disputes
GET    /api/admin/disputes/:disputeId    // Get dispute details
PUT    /api/admin/disputes/:disputeId    // Update dispute status
POST   /api/admin/disputes/:disputeId/assign // Assign to admin
POST   /api/admin/disputes/:disputeId/resolve // Resolve dispute
POST   /api/admin/disputes/:disputeId/refund // Process refund
```

**Files to Create**:
```
backend/src/dispute-service/
  ├── index.ts                 // Main Lambda handler
  ├── validation.ts            // Input validation
  ├── types.ts                 // Service-specific types
  └── utils.ts                 // Helper functions

backend/src/local-server.ts
  - Add /api/disputes route
  - Add /api/admin/disputes route
```

**Validation Rules**:
- Dispute can only be created within 60 days of transaction
- User must own the transaction
- Transaction must be completed (not pending/failed)
- Cannot dispute already refunded transactions
- Cannot create duplicate disputes for same transaction

---

## Phase 2: Customer UI & Basic Flow (3-4 days)

### 2.1 Transaction History Enhancement
**Task**: Add dispute capability to transaction history
**Assignee**: Frontend Developer
**Estimated Time**: 6-8 hours

**Deliverables**:
- [ ] Add "Dispute" button to transactions (when eligible)
- [ ] Implement eligibility check logic
- [ ] Add dispute status indicator for disputed transactions
- [ ] Create DisputeModal component
- [ ] Connect to dispute API

**Files to Create/Update**:
```
frontend/src/pages/user/
  ├── TransactionHistory.tsx (update)
  │   └── Add dispute button per transaction
  │   └── Show dispute status badge
  └── Transactions.tsx (update if needed)

frontend/src/components/disputes/
  ├── DisputeButton.tsx          // Dispute action button
  ├── DisputeModal.tsx            // Modal form
  ├── DisputeForm.tsx             // Form component
  └── DisputeStatusBadge.tsx      // Status indicator

frontend/src/services/
  └── disputeApi.ts               // API client
```

**DisputeModal Features**:
- Reason dropdown (unauthorized, not received, not as described, etc.)
- Description textarea (required, min 50 chars)
- Evidence upload (optional, images/PDFs)
- Terms checkbox
- Submit & Cancel buttons
- Loading states
- Error handling

### 2.2 Dispute Tracking Page
**Task**: Create customer dispute list/details pages
**Assignee**: Frontend Developer
**Estimated Time**: 6-8 hours

**Deliverables**:
- [ ] Create DisputeList page (user's disputes)
- [ ] Create DisputeDetails page (single dispute view)
- [ ] Add navigation from transaction history
- [ ] Implement real-time status updates
- [ ] Add evidence upload functionality

**Files to Create**:
```
frontend/src/pages/user/disputes/
  ├── DisputeList.tsx             // List of user's disputes
  ├── DisputeDetails.tsx          // Single dispute view
  └── AddEvidence.tsx             // Evidence upload form

frontend/src/components/disputes/
  ├── DisputeTimeline.tsx         // Timeline component
  ├── EvidenceList.tsx            // Evidence viewer
  └── DisputeActions.tsx          // Customer actions
```

**DisputeDetails Features**:
- Transaction information
- Dispute reason & description
- Status timeline with dates
- Evidence gallery
- Admin responses/notes (if shared)
- Add evidence button
- Cancel dispute button (if allowed)
- Messages/updates section

---

## Phase 3: Admin Dashboard Integration (3-4 days)

### 3.1 Admin Dispute Management
**Task**: Update FinancialManagement to handle real disputes
**Assignee**: Frontend Developer
**Estimated Time**: 8-10 hours

**Deliverables**:
- [ ] Update Disputes tab with real data
- [ ] Add dispute detail modal/page
- [ ] Implement status change workflow
- [ ] Add refund processing
- [ ] Add evidence review
- [ ] Add notes/comments system

**Files to Update/Create**:
```
frontend/src/pages/admin/
  └── FinancialManagement.tsx (update Disputes tab)
      └── Use real dispute data instead of mock

frontend/src/components/admin/disputes/
  ├── DisputeListAdmin.tsx        // Admin dispute list
  ├── DisputeDetailsAdmin.tsx     // Admin detail view
  ├── DisputeActions.tsx          // Admin action buttons
  ├── DisputeNotes.tsx            // Admin notes section
  ├── DisputeResolution.tsx       // Resolution form
  └── RefundProcessor.tsx         // Refund handling
```

**Admin Actions**:
- View all disputes (paginated, filterable)
- Filter by status, date range, amount
- Sort by priority, date, amount
- Assign dispute to admin
- Change dispute status
- Add internal notes
- Add public response to customer
- Process full/partial refund
- Close dispute with resolution
- Escalate dispute

### 3.2 Admin Workflow Tools
**Task**: Build admin tools for efficient dispute handling
**Assignee**: Frontend Developer
**Estimated Time**: 6-8 hours

**Deliverables**:
- [ ] Bulk actions (assign, close, etc.)
- [ ] Quick filters (open, high priority, mine)
- [ ] Search functionality
- [ ] Export to CSV
- [ ] Dispute statistics dashboard

**Files to Create**:
```
frontend/src/components/admin/disputes/
  ├── DisputeFilters.tsx          // Advanced filters
  ├── DisputeBulkActions.tsx      // Bulk operations
  ├── DisputeStats.tsx            // Statistics cards
  └── DisputeExport.tsx           // Export functionality

frontend/src/pages/admin/
  └── DisputeDashboard.tsx        // Dedicated disputes page
```

**Statistics to Track**:
- Total open disputes
- Average resolution time
- Dispute rate (% of transactions)
- Win/loss ratio
- Disputed amount vs refunded amount
- By dispute reason breakdown
- By admin handler performance

---

## Phase 4: Notifications & Emails (2-3 days)

### 4.1 In-App Notifications
**Task**: Integrate with existing notification system
**Assignee**: Backend Developer
**Estimated Time**: 4-6 hours

**Deliverables**:
- [ ] Send notification on dispute creation
- [ ] Send notification on status change
- [ ] Send notification on admin response
- [ ] Send notification on resolution
- [ ] Update notification service types

**Integration Points**:
```typescript
// Use existing notification-service
import { createNotification } from '../notification-service';

// Notification types to add
type: 'dispute_created'
type: 'dispute_status_changed'
type: 'dispute_resolved'
type: 'dispute_evidence_requested'
type: 'dispute_admin_response'
```

**Files to Update**:
```
backend/src/dispute-service/index.ts
  - Call createNotification() on key events

backend/src/notification-service/index.ts
  - Add dispute notification types (if needed)

packages/shared-types/src/common.ts
  - Add dispute notification types
```

### 4.2 Email Notifications
**Task**: Send email alerts for critical dispute events
**Assignee**: Backend Developer
**Estimated Time**: 6-8 hours

**Deliverables**:
- [ ] Create email templates
- [ ] Implement email sending logic
- [ ] Add email preferences
- [ ] Test email delivery

**Email Templates Needed**:
1. **dispute_created.html** - Customer confirmation
2. **dispute_received_admin.html** - Admin notification
3. **dispute_status_update.html** - Status change notification
4. **dispute_resolved.html** - Resolution notification
5. **dispute_evidence_needed.html** - Request for more evidence
6. **dispute_escalated.html** - Escalation notification

**Files to Create**:
```
backend/src/email-service/templates/disputes/
  ├── dispute_created.html
  ├── dispute_received_admin.html
  ├── dispute_status_update.html
  ├── dispute_resolved.html
  ├── dispute_evidence_needed.html
  └── dispute_escalated.html

backend/src/dispute-service/
  └── notifications.ts            // Email notification logic
```

---

## Phase 5: Payment Processor Integration (3-5 days)

### 5.1 Stripe Webhook Setup
**Task**: Handle Stripe dispute webhooks
**Assignee**: Backend Developer
**Estimated Time**: 8-10 hours

**Deliverables**:
- [ ] Set up Stripe webhook endpoint
- [ ] Handle charge.dispute.created event
- [ ] Handle charge.dispute.updated event
- [ ] Handle charge.dispute.closed event
- [ ] Sync dispute status bidirectionally
- [ ] Store Stripe dispute ID

**Webhook Events to Handle**:
```typescript
// Stripe sends these events
charge.dispute.created       // Customer filed chargeback
charge.dispute.updated       // Status changed
charge.dispute.closed        // Dispute resolved
charge.dispute.funds_withdrawn // Funds removed
charge.dispute.funds_reinstated // Funds returned
```

**Files to Create/Update**:
```
backend/src/webhooks/
  ├── stripe-webhook-handler.ts  // Main webhook handler
  ├── dispute-sync.ts             // Sync logic
  └── signature-verification.ts  // Webhook verification

backend/src/dispute-service/
  └── stripe-integration.ts       // Stripe API calls

infrastructure/lib/harborlist-stack.ts
  - Add webhook endpoint
  - Add Stripe secret key env var
```

**Webhook Handler Logic**:
1. Verify Stripe signature
2. Parse event payload
3. Check if dispute exists in DB
4. Create/update dispute record
5. Send notifications
6. Log event for audit

### 5.2 Evidence Submission to Stripe
**Task**: Submit evidence to Stripe for disputes
**Assignee**: Backend Developer
**Estimated Time**: 6-8 hours

**Deliverables**:
- [ ] Collect evidence from dispute record
- [ ] Format evidence for Stripe API
- [ ] Submit evidence before deadline
- [ ] Track evidence submission status
- [ ] Handle submission errors

**Evidence Types for Stripe**:
```typescript
{
  customer_communication: string,  // Message logs
  receipt: string,                 // Receipt URL
  service_documentation: string,   // Service proof
  shipping_documentation: string,  // Shipping proof
  duplicate_charge_id: string,     // If duplicate
  refund_policy: string,           // Policy doc
  customer_signature: string,      // Signature image
  uncategorized_file: string,      // Other files
  uncategorized_text: string       // Other text
}
```

**Files to Create**:
```
backend/src/dispute-service/
  └── evidence-submission.ts      // Format & submit evidence
```

---

## Phase 6: Advanced Features & Polish (2-3 days)

### 6.1 Auto-Escalation & Rules
**Task**: Implement automatic dispute handling rules
**Assignee**: Backend Developer
**Estimated Time**: 4-6 hours

**Deliverables**:
- [ ] Auto-escalate if no admin action in 7 days
- [ ] Auto-close if no customer response in 5 days
- [ ] Auto-assign based on workload
- [ ] Priority calculation logic
- [ ] Scheduled job for rule processing

**Rules Engine**:
```typescript
// Run daily
async function processDisputeRules() {
  // Rule 1: Escalate stale disputes
  const staleDisputes = await getDisputesByStatus('under_review', {
    olderThan: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
  for (const dispute of staleDisputes) {
    await escalateDispute(dispute.disputeId);
  }
  
  // Rule 2: Close inactive disputes
  const inactiveDisputes = await getDisputesAwaitingCustomer({
    olderThan: 5 * 24 * 60 * 60 * 1000 // 5 days
  });
  for (const dispute of inactiveDisputes) {
    await closeDispute(dispute.disputeId, 'customer_unresponsive');
  }
  
  // Rule 3: Assign unassigned high-priority
  const unassignedHigh = await getDisputesByStatus('open', {
    priority: 'high',
    assignedTo: null
  });
  for (const dispute of unassignedHigh) {
    const leastBusyAdmin = await getLeastBusyAdmin();
    await assignDispute(dispute.disputeId, leastBusyAdmin.userId);
  }
}
```

**Files to Create**:
```
backend/src/dispute-service/
  ├── rules-engine.ts             // Auto-processing rules
  └── scheduler.ts                // Scheduled job setup

infrastructure/lib/harborlist-stack.ts
  - Add EventBridge rule for daily execution
```

### 6.2 Analytics & Reporting
**Task**: Add dispute analytics to admin dashboard
**Assignee**: Frontend Developer
**Estimated Time**: 6-8 hours

**Deliverables**:
- [ ] Dispute metrics cards
- [ ] Dispute rate chart (trend over time)
- [ ] Resolution time chart
- [ ] Win/loss ratio chart
- [ ] By reason breakdown
- [ ] By admin performance table

**Metrics to Display**:
```typescript
interface DisputeMetrics {
  // Overview
  totalDisputes: number;
  openDisputes: number;
  resolvedDisputes: number;
  
  // Performance
  averageResolutionTime: number; // hours
  disputeRate: number;            // % of transactions
  winRate: number;                // % resolved in platform favor
  
  // Financial
  totalDisputedAmount: number;
  totalRefundedAmount: number;
  averageDisputeValue: number;
  
  // Breakdown
  byReason: Record<DisputeReason, number>;
  byStatus: Record<DisputeStatus, number>;
  byMonth: Array<{month: string, count: number}>;
  
  // Admin performance
  byAdmin: Array<{
    adminId: string;
    adminName: string;
    assigned: number;
    resolved: number;
    avgResolutionTime: number;
  }>;
}
```

**Files to Create**:
```
backend/src/dispute-service/
  └── analytics.ts                // Analytics calculations

frontend/src/pages/admin/
  └── DisputeAnalytics.tsx        // Analytics dashboard

frontend/src/components/admin/disputes/
  ├── DisputeMetricsCards.tsx     // Metrics overview
  ├── DisputeTrendChart.tsx       // Time series chart
  └── DisputeBreakdownChart.tsx   // Pie/bar charts
```

---

## Phase 7: Testing & Documentation (2-3 days)

### 7.1 Testing
**Task**: Comprehensive testing of dispute system
**Assignee**: QA/All Developers
**Estimated Time**: 8-12 hours

**Test Cases**:

**Customer Flow**:
- [ ] Create dispute from transaction history
- [ ] View dispute list
- [ ] View dispute details
- [ ] Add evidence to dispute
- [ ] Receive notifications
- [ ] Cancel dispute
- [ ] Cannot dispute ineligible transactions
- [ ] Cannot create duplicate disputes

**Admin Flow**:
- [ ] View all disputes with filters
- [ ] Assign dispute to admin
- [ ] Change dispute status
- [ ] Add internal notes
- [ ] Add public response
- [ ] Process full refund
- [ ] Process partial refund
- [ ] Close dispute with resolution
- [ ] Escalate dispute
- [ ] View dispute analytics

**Integration Tests**:
- [ ] Stripe webhook creates dispute
- [ ] Evidence submitted to Stripe
- [ ] Dispute status syncs from Stripe
- [ ] Notifications sent correctly
- [ ] Emails delivered
- [ ] Auto-escalation works
- [ ] Auto-closure works

**Edge Cases**:
- [ ] Expired transaction dispute attempt
- [ ] Already refunded transaction
- [ ] Concurrent dispute creation
- [ ] Missing evidence handling
- [ ] Invalid Stripe webhook signature
- [ ] Network failures
- [ ] Large file uploads

### 7.2 Documentation
**Task**: Create user and admin documentation
**Assignee**: All Developers
**Estimated Time**: 4-6 hours

**Documents to Create**:
- [ ] User guide: How to dispute a transaction
- [ ] Admin guide: How to handle disputes
- [ ] API documentation
- [ ] Webhook setup guide
- [ ] Troubleshooting guide
- [ ] Analytics guide

**Files to Create**:
```
docs/user-guides/
  └── disputing-transactions.md

docs/admin-guides/
  └── handling-disputes.md

docs/api/
  └── disputes-api.md

docs/operations/
  ├── stripe-webhook-setup.md
  └── dispute-troubleshooting.md

docs/analytics/
  └── dispute-metrics.md
```

---

## Implementation Checklist

### Week 1: Foundation & Customer UI
- [ ] Phase 1.1: Database design (Day 1)
- [ ] Phase 1.2: Backend service (Day 1-2)
- [ ] Phase 2.1: Transaction history (Day 2-3)
- [ ] Phase 2.2: Dispute tracking pages (Day 3-4)

### Week 2: Admin Dashboard & Notifications
- [ ] Phase 3.1: Admin dispute management (Day 5-6)
- [ ] Phase 3.2: Admin workflow tools (Day 6-7)
- [ ] Phase 4.1: In-app notifications (Day 7-8)
- [ ] Phase 4.2: Email notifications (Day 8-9)

### Week 3: Integration & Polish
- [ ] Phase 5.1: Stripe webhooks (Day 10-11)
- [ ] Phase 5.2: Evidence submission (Day 11-12)
- [ ] Phase 6.1: Auto-escalation (Day 12-13)
- [ ] Phase 6.2: Analytics (Day 13-14)
- [ ] Phase 7.1: Testing (Day 14-15)
- [ ] Phase 7.2: Documentation (Day 15)

---

## Success Metrics

### User Experience
- Time to create dispute: < 2 minutes
- Dispute creation success rate: > 95%
- Customer satisfaction with process: > 4/5 stars

### Admin Efficiency
- Average resolution time: < 48 hours
- Admin can handle 20+ disputes per day
- Dispute assignment time: < 5 minutes

### Business Impact
- Dispute rate: < 2% of transactions
- Win rate: > 70% (platform favor)
- Automated resolution: > 30% of disputes
- Stripe chargeback win rate: > 50%

### Technical Performance
- Dispute creation API: < 500ms response
- Dispute list load: < 1s
- Webhook processing: < 2s
- Evidence upload: < 5s for 5MB file

---

## Risk Assessment

### High Risk
1. **Stripe Integration Complexity**
   - Mitigation: Start with test mode, extensive testing
   
2. **Legal/Compliance Issues**
   - Mitigation: Review with legal team, follow card network rules

3. **Abuse/Fraud**
   - Mitigation: Rate limiting, fraud detection, manual review

### Medium Risk
1. **Performance at Scale**
   - Mitigation: Pagination, caching, database indexing
   
2. **Evidence Storage Costs**
   - Mitigation: S3 lifecycle policies, compression

3. **Email Deliverability**
   - Mitigation: Use verified email service (SES), SPF/DKIM

### Low Risk
1. **UI/UX Complexity**
   - Mitigation: User testing, iterative design
   
2. **Notification Fatigue**
   - Mitigation: Preference management, batching

---

## Dependencies

### External Services
- ✅ AWS DynamoDB (existing)
- ✅ AWS S3 (for evidence storage - existing)
- ✅ AWS SES (for emails - existing)
- ⚠️ Stripe API (requires setup)
- ✅ Notification System (already implemented)

### Internal Systems
- ✅ Transaction/Billing system
- ✅ User authentication
- ✅ Admin role management
- ✅ File upload system
- ✅ Email service

---

## Post-Launch

### Monitoring
- Dispute creation rate
- Resolution time trends
- Customer satisfaction surveys
- Admin workload metrics
- Error rates & failures
- Stripe chargeback outcomes

### Iteration Opportunities
- AI-powered dispute categorization
- Automated evidence gathering
- Predictive dispute prevention
- Customer self-service resolution
- Integration with more payment processors
- Dispute mediation system

---

## Related Documentation
- [Customer Dispute System Overview](../docs/CUSTOMER_DISPUTE_SYSTEM.md)
- [Financial Management](../docs/FINANCIAL_MANAGEMENT_SYSTEM.md)
- [Notification System](../docs/MESSAGING_NOTIFICATION_SYSTEM.md)
- [Payment Integration](../docs/PAYMENT_INTEGRATION.md)
