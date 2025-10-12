/**
 * End-to-End Admin and Sales Workflow Tests
 * Tests admin user management, moderation, billing, and sales workflows
 * Requirements: 6.1, 7.1, 8.1, 9.1
 */

import { DatabaseService } from '../shared/database';
import { UserService } from '../user-service';
import { AdminService } from '../admin-service';
import { BillingService } from '../billing-service';
import { ListingService } from '../listing';
import { testUtils } from '../shared/test-utils';

describe('End-to-End Admin and Sales Workflows', () => {
  let db: DatabaseService;
  let userService: UserService;
  let adminService: AdminService;
  let billingService: BillingService;
  let listingService: ListingService;

  beforeAll(async () => {
    // Initialize services
    db = new DatabaseService();
    userService = new UserService(db);
    adminService = new AdminService(db);
    billingService = new BillingService(db);
    listingService = new ListingService(db);

    // Setup test database
    await testUtils.setupTestDatabase();
  });

  afterAll(async () => {
    await testUtils.cleanupTestDatabase();
  });

  beforeEach(async () => {
    await testUtils.clearTestData();
  });

  describe('Admin User Management and Tier Assignment', () => {
    let adminUser: any;

    beforeEach(async () => {
      adminUser = await testUtils.createTestUser({
        role: 'admin',
        permissions: ['user_management', 'tier_management', 'billing_management']
      });
    });

    test('should complete user tier assignment workflow', async () => {
      // Step 1: Create regular user
      const regularUser = await testUtils.createTestUser({
        userType: 'individual',
        status: 'active'
      });

      // Step 2: Admin upgrades user to dealer
      const tierUpdate = {
        userType: 'dealer',
        capabilities: ['bulk_operations', 'dealer_dashboard'],
        limits: {
          maxListings: 50,
          maxImages: 25,
          priorityPlacement: false
        }
      };

      const updatedUser = await adminService.updateUserTier(
        adminUser.userId,
        regularUser.userId,
        tierUpdate
      );

      // Step 3: Verify tier assignment
      expect(updatedUser.userType).toBe('dealer');
      expect(updatedUser.capabilities).toContain('bulk_operations');
      expect(updatedUser.capabilities).toContain('dealer_dashboard');

      // Step 4: Verify limits updated
      const userLimits = await userService.getUserLimits(regularUser.userId);
      expect(userLimits.maxListings).toBe(50);
      expect(userLimits.maxImages).toBe(25);

      // Step 5: Verify audit log entry
      const auditLogs = await adminService.getAuditLogs({
        userId: regularUser.userId,
        action: 'tier_update'
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].performedBy).toBe(adminUser.userId);
      expect(auditLogs[0].details.oldTier).toBe('individual');
      expect(auditLogs[0].details.newTier).toBe('dealer');
    });

    test('should complete premium membership assignment workflow', async () => {
      // Step 1: Create individual user
      const user = await testUtils.createTestUser({
        userType: 'individual'
      });

      // Step 2: Admin assigns premium membership
      const premiumAssignment = {
        userType: 'premium_individual',
        plan: 'premium_individual',
        features: ['priority_placement', 'featured_listings', 'analytics_access'],
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
        autoRenew: false
      };

      const updatedUser = await adminService.assignPremiumMembership(
        adminUser.userId,
        user.userId,
        premiumAssignment
      );

      // Step 3: Verify premium assignment
      expect(updatedUser.userType).toBe('premium_individual');
      expect(updatedUser.premiumActive).toBe(true);
      expect(updatedUser.membershipDetails.plan).toBe('premium_individual');

      // Step 4: Verify premium capabilities
      const capabilities = await userService.getUserCapabilities(user.userId);
      expect(capabilities).toContain('priority_placement');
      expect(capabilities).toContain('featured_listings');
      expect(capabilities).toContain('analytics_access');

      // Step 5: Verify premium limits
      const userLimits = await userService.getUserLimits(user.userId);
      expect(userLimits.maxListings).toBe(25);
      expect(userLimits.priorityPlacement).toBe(true);
      expect(userLimits.featuredListings).toBe(3);
    });

    test('should complete bulk user management workflow', async () => {
      // Step 1: Create multiple users
      const users = await Promise.all([
        testUtils.createTestUser({ userType: 'individual', email: 'bulk1@example.com' }),
        testUtils.createTestUser({ userType: 'individual', email: 'bulk2@example.com' }),
        testUtils.createTestUser({ userType: 'individual', email: 'bulk3@example.com' })
      ]);

      const userIds = users.map(u => u.userId);

      // Step 2: Admin performs bulk tier update
      const bulkUpdate = {
        userType: 'dealer',
        capabilities: ['bulk_operations'],
        limits: { maxListings: 50 }
      };

      const results = await adminService.bulkUpdateUserTiers(
        adminUser.userId,
        userIds,
        bulkUpdate
      );

      // Step 3: Verify bulk update results
      expect(results.successful).toHaveLength(3);
      expect(results.failed).toHaveLength(0);

      // Step 4: Verify all users updated
      for (const userId of userIds) {
        const user = await userService.getUser(userId);
        expect(user.userType).toBe('dealer');
        expect(user.capabilities).toContain('bulk_operations');
      }

      // Step 5: Verify audit logs for bulk operation
      const auditLogs = await adminService.getAuditLogs({
        performedBy: adminUser.userId,
        action: 'bulk_tier_update'
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].details.affectedUsers).toHaveLength(3);
    });

    test('should complete user group management workflow', async () => {
      // Step 1: Create user group
      const groupData = {
        name: 'Premium Dealers',
        description: 'Premium dealer user group',
        permissions: ['advanced_analytics', 'priority_support'],
        memberIds: []
      };

      const group = await adminService.createUserGroup(adminUser.userId, groupData);
      expect(group.groupId).toBeDefined();
      expect(group.name).toBe('Premium Dealers');

      // Step 2: Create users and add to group
      const users = await Promise.all([
        testUtils.createTestUser({ userType: 'premium_dealer', email: 'group1@example.com' }),
        testUtils.createTestUser({ userType: 'premium_dealer', email: 'group2@example.com' })
      ]);

      await adminService.addUsersToGroup(
        adminUser.userId,
        group.groupId,
        users.map(u => u.userId)
      );

      // Step 3: Verify group membership
      const updatedGroup = await adminService.getUserGroup(group.groupId);
      expect(updatedGroup.memberIds).toHaveLength(2);

      // Step 4: Verify users have group permissions
      for (const user of users) {
        const userPermissions = await userService.getUserPermissions(user.userId);
        expect(userPermissions).toContain('advanced_analytics');
        expect(userPermissions).toContain('priority_support');
      }

      // Step 5: Remove user from group
      await adminService.removeUserFromGroup(
        adminUser.userId,
        group.groupId,
        users[0].userId
      );

      const finalGroup = await adminService.getUserGroup(group.groupId);
      expect(finalGroup.memberIds).toHaveLength(1);
      expect(finalGroup.memberIds).not.toContain(users[0].userId);
    });
  });

  describe('Moderation Queue Processing and Decision Workflows', () => {
    let moderator: any;
    let adminUser: any;

    beforeEach(async () => {
      moderator = await testUtils.createTestUser({
        role: 'content_moderator',
        permissions: ['moderate_listings']
      });

      adminUser = await testUtils.createTestUser({
        role: 'admin',
        permissions: ['moderation_management']
      });
    });

    test('should complete moderation queue assignment workflow', async () => {
      // Step 1: Create listings requiring moderation
      const listings = await Promise.all([
        testUtils.createTestListing({ status: 'pending_review', title: 'Listing 1' }),
        testUtils.createTestListing({ status: 'pending_review', title: 'Listing 2' }),
        testUtils.createTestListing({ status: 'pending_review', title: 'Listing 3' })
      ]);

      // Step 2: Verify listings in moderation queue
      const queue = await adminService.getModerationQueue();
      expect(queue.filter(item => item.status === 'pending')).toHaveLength(3);

      // Step 3: Admin assigns moderation tasks
      for (const listing of listings) {
        await adminService.assignModeration(listing.listingId, moderator.userId);
      }

      // Step 4: Verify assignments
      const assignedQueue = await adminService.getModerationQueue({
        assignedTo: moderator.userId
      });
      expect(assignedQueue).toHaveLength(3);

      // Step 5: Verify moderator workload
      const workload = await adminService.getModeratorWorkload(moderator.userId);
      expect(workload.assigned).toBe(3);
      expect(workload.pending).toBe(3);
      expect(workload.completed).toBe(0);
    });

    test('should complete moderation approval workflow', async () => {
      // Step 1: Create listing requiring moderation
      const listing = await testUtils.createTestListing({
        status: 'pending_review',
        title: 'Quality Boat Listing'
      });

      // Step 2: Assign to moderator
      await adminService.assignModeration(listing.listingId, moderator.userId);

      // Step 3: Moderator approves listing
      const decision = {
        decision: 'approve' as const,
        reason: 'Meets all quality standards',
        publicNotes: 'Excellent listing with complete information',
        internalNotes: 'All documentation verified, images are high quality'
      };

      await adminService.processModerationDecision(
        listing.listingId,
        moderator.userId,
        decision
      );

      // Step 4: Verify listing approval
      const approvedListing = await listingService.getListing(listing.listingId);
      expect(approvedListing.status).toBe('active');
      expect(approvedListing.moderationStatus.status).toBe('approved');
      expect(approvedListing.moderationStatus.reviewedBy).toBe(moderator.userId);

      // Step 5: Verify moderation queue updated
      const queue = await adminService.getModerationQueue({
        listingId: listing.listingId
      });
      expect(queue[0].status).toBe('approved');

      // Step 6: Verify moderator statistics
      const stats = await adminService.getModeratorStats(moderator.userId);
      expect(stats.totalReviewed).toBe(1);
      expect(stats.approved).toBe(1);
      expect(stats.rejected).toBe(0);
    });

    test('should complete moderation rejection workflow', async () => {
      // Step 1: Create problematic listing
      const listing = await testUtils.createTestListing({
        status: 'pending_review',
        title: 'Incomplete Listing',
        description: 'Missing details' // Intentionally incomplete
      });

      // Step 2: Assign to moderator
      await adminService.assignModeration(listing.listingId, moderator.userId);

      // Step 3: Moderator rejects listing
      const decision = {
        decision: 'reject' as const,
        reason: 'Insufficient information provided',
        publicNotes: 'Please provide complete boat specifications and additional photos',
        internalNotes: 'Missing engine details, only 1 photo, vague description',
        requiredChanges: [
          'Add detailed engine specifications',
          'Upload at least 5 high-quality photos',
          'Provide complete boat description'
        ]
      };

      await adminService.processModerationDecision(
        listing.listingId,
        moderator.userId,
        decision
      );

      // Step 4: Verify listing rejection
      const rejectedListing = await listingService.getListing(listing.listingId);
      expect(rejectedListing.status).toBe('rejected');
      expect(rejectedListing.moderationStatus.status).toBe('rejected');
      expect(rejectedListing.moderationStatus.rejectionReason).toBe('Insufficient information provided');

      // Step 5: Verify owner notification sent
      const notifications = await adminService.getUserNotifications(listing.ownerId);
      const rejectionNotification = notifications.find(n => n.type === 'listing_rejected');
      expect(rejectionNotification).toBeDefined();
      expect(rejectionNotification.data.listingId).toBe(listing.listingId);
    });

    test('should complete bulk moderation workflow', async () => {
      // Step 1: Create multiple listings
      const listings = await Promise.all([
        testUtils.createTestListing({ status: 'pending_review', title: 'Bulk 1' }),
        testUtils.createTestListing({ status: 'pending_review', title: 'Bulk 2' }),
        testUtils.createTestListing({ status: 'pending_review', title: 'Bulk 3' })
      ]);

      const listingIds = listings.map(l => l.listingId);

      // Step 2: Assign all to moderator
      await adminService.bulkAssignModeration(listingIds, moderator.userId);

      // Step 3: Bulk approve listings
      const bulkDecision = {
        decision: 'approve' as const,
        reason: 'Batch approval - all meet standards',
        publicNotes: 'Approved in batch review',
        internalNotes: 'Standard quality listings'
      };

      const results = await adminService.bulkModerationDecision(
        listingIds,
        moderator.userId,
        bulkDecision
      );

      // Step 4: Verify bulk approval results
      expect(results.successful).toHaveLength(3);
      expect(results.failed).toHaveLength(0);

      // Step 5: Verify all listings approved
      for (const listingId of listingIds) {
        const listing = await listingService.getListing(listingId);
        expect(listing.status).toBe('active');
        expect(listing.moderationStatus.status).toBe('approved');
      }
    });
  });

  describe('Billing Management and Financial Reporting', () => {
    let adminUser: any;
    let billingAdmin: any;

    beforeEach(async () => {
      adminUser = await testUtils.createTestUser({
        role: 'admin',
        permissions: ['billing_management']
      });

      billingAdmin = await testUtils.createTestUser({
        role: 'billing_admin',
        permissions: ['billing_management', 'financial_reporting', 'refund_processing']
      });
    });

    test('should complete customer billing management workflow', async () => {
      // Step 1: Create premium user with billing account
      const user = await testUtils.createTestUser({
        userType: 'premium_individual'
      });

      const billingAccount = await testUtils.createTestBillingAccount({
        userId: user.userId,
        plan: 'premium_individual',
        amount: 29.99,
        status: 'active'
      });

      // Step 2: Admin views customer billing
      const customerBilling = await adminService.getCustomerBilling(user.userId);
      expect(customerBilling.billingAccount).toBeDefined();
      expect(customerBilling.billingAccount.plan).toBe('premium_individual');
      expect(customerBilling.billingAccount.status).toBe('active');

      // Step 3: View payment history
      const paymentHistory = await adminService.getPaymentHistory(user.userId);
      expect(paymentHistory).toBeDefined();

      // Step 4: Update payment method
      const newPaymentMethod = {
        type: 'card',
        last4: '4321',
        expiryMonth: 12,
        expiryYear: 2026
      };

      await adminService.updateCustomerPaymentMethod(
        billingAdmin.userId,
        user.userId,
        newPaymentMethod
      );

      // Step 5: Verify payment method update
      const updatedBilling = await adminService.getCustomerBilling(user.userId);
      expect(updatedBilling.paymentMethod.last4).toBe('4321');
    });

    test('should complete refund processing workflow', async () => {
      // Step 1: Create transaction requiring refund
      const user = await testUtils.createTestUser({
        userType: 'premium_individual'
      });

      const transaction = await testUtils.createTestTransaction({
        userId: user.userId,
        type: 'payment',
        amount: 29.99,
        status: 'completed',
        paymentMethod: 'card'
      });

      // Step 2: Process refund request
      const refundRequest = {
        transactionId: transaction.transactionId,
        amount: 29.99,
        reason: 'Customer requested cancellation',
        refundType: 'full'
      };

      const refund = await adminService.processRefund(
        billingAdmin.userId,
        refundRequest
      );

      // Step 3: Verify refund processing
      expect(refund.status).toBe('processed');
      expect(refund.amount).toBe(29.99);
      expect(refund.originalTransactionId).toBe(transaction.transactionId);

      // Step 4: Verify refund transaction created
      const refundTransaction = await billingService.getTransaction(refund.refundTransactionId);
      expect(refundTransaction.type).toBe('refund');
      expect(refundTransaction.amount).toBe(-29.99);
      expect(refundTransaction.status).toBe('completed');

      // Step 5: Verify audit log
      const auditLogs = await adminService.getAuditLogs({
        action: 'refund_processed',
        performedBy: billingAdmin.userId
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].details.transactionId).toBe(transaction.transactionId);
    });

    test('should complete financial reporting workflow', async () => {
      // Step 1: Create test financial data
      const users = await Promise.all([
        testUtils.createTestUser({ userType: 'premium_individual' }),
        testUtils.createTestUser({ userType: 'premium_dealer' })
      ]);

      const transactions = await Promise.all([
        testUtils.createTestTransaction({
          userId: users[0].userId,
          type: 'payment',
          amount: 29.99,
          status: 'completed'
        }),
        testUtils.createTestTransaction({
          userId: users[1].userId,
          type: 'payment',
          amount: 99.99,
          status: 'completed'
        })
      ]);

      // Step 2: Generate revenue report
      const revenueReport = await adminService.generateRevenueReport({
        startDate: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: Date.now(),
        groupBy: 'plan'
      });

      expect(revenueReport.totalRevenue).toBe(129.98);
      expect(revenueReport.byPlan.premium_individual).toBe(29.99);
      expect(revenueReport.byPlan.premium_dealer).toBe(99.99);

      // Step 3: Generate subscription analytics
      const subscriptionAnalytics = await adminService.getSubscriptionAnalytics();
      expect(subscriptionAnalytics.totalActiveSubscriptions).toBe(2);
      expect(subscriptionAnalytics.byPlan.premium_individual).toBe(1);
      expect(subscriptionAnalytics.byPlan.premium_dealer).toBe(1);

      // Step 4: Generate churn analysis
      const churnAnalysis = await adminService.getChurnAnalysis({
        period: 'monthly'
      });
      expect(churnAnalysis).toBeDefined();
      expect(churnAnalysis.churnRate).toBeGreaterThanOrEqual(0);

      // Step 5: Export financial data
      const exportData = await adminService.exportFinancialData({
        format: 'csv',
        startDate: Date.now() - (30 * 24 * 60 * 60 * 1000),
        endDate: Date.now()
      });

      expect(exportData.format).toBe('csv');
      expect(exportData.data).toBeDefined();
      expect(exportData.filename).toContain('financial_export');
    });
  });

  describe('Sales Role Customer Management and Plan Configuration', () => {
    let salesUser: any;
    let salesManager: any;

    beforeEach(async () => {
      salesUser = await testUtils.createTestUser({
        role: 'sales',
        permissions: ['customer_management', 'plan_configuration']
      });

      salesManager = await testUtils.createTestUser({
        role: 'sales_manager',
        permissions: ['sales_management', 'customer_management', 'plan_configuration']
      });
    });

    test('should complete customer assignment workflow', async () => {
      // Step 1: Create customers
      const customers = await Promise.all([
        testUtils.createTestUser({ userType: 'individual', email: 'customer1@example.com' }),
        testUtils.createTestUser({ userType: 'dealer', email: 'customer2@example.com' })
      ]);

      // Step 2: Sales manager assigns customers to sales rep
      await adminService.assignCustomersToSalesRep(
        salesManager.userId,
        salesUser.userId,
        customers.map(c => c.userId)
      );

      // Step 3: Verify customer assignments
      const assignedCustomers = await adminService.getSalesRepCustomers(salesUser.userId);
      expect(assignedCustomers).toHaveLength(2);
      expect(assignedCustomers.map(c => c.userId)).toEqual(
        expect.arrayContaining(customers.map(c => c.userId))
      );

      // Step 4: Verify sales rep assignment in customer records
      for (const customer of customers) {
        const updatedCustomer = await userService.getUser(customer.userId);
        expect(updatedCustomer.salesRepId).toBe(salesUser.userId);
      }
    });

    test('should complete plan configuration workflow', async () => {
      // Step 1: Create customer
      const customer = await testUtils.createTestUser({
        userType: 'individual',
        salesRepId: salesUser.userId
      });

      // Step 2: Sales rep configures premium plan
      const planConfig = {
        plan: 'premium_individual',
        features: ['priority_placement', 'featured_listings', 'analytics_access'],
        limits: {
          maxListings: 25,
          maxImages: 20,
          featuredListings: 3
        },
        pricing: {
          monthly: 29.99,
          yearly: 299.99
        }
      };

      const configuredPlan = await adminService.configurePremiumPlan(
        salesUser.userId,
        customer.userId,
        planConfig
      );

      // Step 3: Verify plan configuration
      expect(configuredPlan.plan).toBe('premium_individual');
      expect(configuredPlan.features).toContain('priority_placement');
      expect(configuredPlan.limits.maxListings).toBe(25);

      // Step 4: Apply plan to customer
      await adminService.applyPlanToCustomer(
        salesUser.userId,
        customer.userId,
        configuredPlan.planId
      );

      // Step 5: Verify customer plan activation
      const updatedCustomer = await userService.getUser(customer.userId);
      expect(updatedCustomer.userType).toBe('premium_individual');
      expect(updatedCustomer.membershipDetails.plan).toBe('premium_individual');

      // Step 6: Verify capabilities assigned
      const capabilities = await userService.getUserCapabilities(customer.userId);
      expect(capabilities).toContain('priority_placement');
      expect(capabilities).toContain('featured_listings');
    });

    test('should complete sales performance tracking workflow', async () => {
      // Step 1: Create sales activities
      const customers = await Promise.all([
        testUtils.createTestUser({ userType: 'individual', salesRepId: salesUser.userId }),
        testUtils.createTestUser({ userType: 'dealer', salesRepId: salesUser.userId })
      ]);

      // Step 2: Record sales conversions
      await adminService.recordSalesConversion(salesUser.userId, {
        customerId: customers[0].userId,
        conversionType: 'premium_upgrade',
        value: 29.99,
        plan: 'premium_individual'
      });

      await adminService.recordSalesConversion(salesUser.userId, {
        customerId: customers[1].userId,
        conversionType: 'premium_upgrade',
        value: 99.99,
        plan: 'premium_dealer'
      });

      // Step 3: Generate sales performance report
      const performance = await adminService.getSalesPerformance(salesUser.userId, {
        period: 'monthly'
      });

      expect(performance.totalConversions).toBe(2);
      expect(performance.totalRevenue).toBe(129.98);
      expect(performance.conversionRate).toBeGreaterThan(0);

      // Step 4: Compare with targets
      const targets = await adminService.getSalesTargets(salesUser.userId);
      const achievement = await adminService.calculateTargetAchievement(
        salesUser.userId,
        targets
      );

      expect(achievement.monthly.revenue).toBe(129.98);
      expect(achievement.monthly.conversions).toBe(2);

      // Step 5: Generate commission calculation
      const commission = await adminService.calculateCommission(salesUser.userId, {
        period: 'monthly',
        commissionRate: 0.1 // 10%
      });

      expect(commission.totalCommission).toBe(12.998);
      expect(commission.conversions).toHaveLength(2);
    });

    test('should complete customer capability management workflow', async () => {
      // Step 1: Create customer assigned to sales rep
      const customer = await testUtils.createTestUser({
        userType: 'dealer',
        salesRepId: salesUser.userId
      });

      // Step 2: Sales rep assigns custom capabilities
      const customCapabilities = [
        {
          feature: 'advanced_analytics',
          enabled: true,
          expiresAt: Date.now() + (90 * 24 * 60 * 60 * 1000), // 90 days
          reason: 'Trial period for advanced analytics'
        },
        {
          feature: 'priority_support',
          enabled: true,
          reason: 'High-value customer'
        }
      ];

      await adminService.assignCustomCapabilities(
        salesUser.userId,
        customer.userId,
        customCapabilities
      );

      // Step 3: Verify capabilities assigned
      const capabilities = await userService.getUserCapabilities(customer.userId);
      expect(capabilities).toContain('advanced_analytics');
      expect(capabilities).toContain('priority_support');

      // Step 4: Modify capability settings
      await adminService.modifyCustomerCapability(
        salesUser.userId,
        customer.userId,
        'advanced_analytics',
        {
          enabled: false,
          reason: 'Trial period ended'
        }
      );

      // Step 5: Verify capability modification
      const updatedCapabilities = await userService.getUserCapabilities(customer.userId);
      expect(updatedCapabilities).not.toContain('advanced_analytics');
      expect(updatedCapabilities).toContain('priority_support');

      // Step 6: Verify audit trail
      const auditLogs = await adminService.getAuditLogs({
        userId: customer.userId,
        action: 'capability_modified',
        performedBy: salesUser.userId
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].details.capability).toBe('advanced_analytics');
      expect(auditLogs[0].details.enabled).toBe(false);
    });
  });

  describe('Complete Admin Workflow Integration', () => {
    test('should complete full admin management workflow', async () => {
      // Step 1: Create admin user
      const admin = await testUtils.createTestUser({
        role: 'super_admin',
        permissions: ['user_management', 'billing_management', 'moderation_management']
      });

      // Step 2: Create regular user
      const user = await testUtils.createTestUser({
        userType: 'individual',
        email: 'integration.test@example.com'
      });

      // Step 3: Upgrade user to premium
      await adminService.assignPremiumMembership(admin.userId, user.userId, {
        userType: 'premium_individual',
        plan: 'premium_individual',
        features: ['priority_placement', 'featured_listings'],
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000)
      });

      // Step 4: User creates listing
      const listing = await testUtils.createTestListing({
        ownerId: user.userId,
        status: 'pending_review'
      });

      // Step 5: Admin processes moderation
      const moderator = await testUtils.createTestUser({ role: 'content_moderator' });
      await adminService.assignModeration(listing.listingId, moderator.userId);
      await adminService.processModerationDecision(listing.listingId, moderator.userId, {
        decision: 'approve',
        reason: 'Meets standards'
      });

      // Step 6: Create billing transaction
      const transaction = await testUtils.createTestTransaction({
        userId: user.userId,
        type: 'payment',
        amount: 29.99,
        status: 'completed'
      });

      // Step 7: Generate comprehensive report
      const report = await adminService.generateComprehensiveReport({
        userId: user.userId,
        includeListings: true,
        includeBilling: true,
        includeModeration: true
      });

      // Step 8: Verify complete workflow
      expect(report.user.userType).toBe('premium_individual');
      expect(report.listings).toHaveLength(1);
      expect(report.listings[0].status).toBe('active');
      expect(report.billing.transactions).toHaveLength(1);
      expect(report.moderation.reviewedListings).toHaveLength(1);
    });
  });
});