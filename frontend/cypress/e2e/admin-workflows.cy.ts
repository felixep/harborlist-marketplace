/**
 * End-to-End Admin and Sales Workflow Tests (Frontend)
 * Tests admin dashboard functionality through the UI
 * Requirements: 6.1, 7.1, 8.1, 9.1
 */

describe('Admin and Sales Workflows End-to-End', () => {
  beforeEach(() => {
    // Reset database and login as admin
    cy.task('resetDatabase');
    cy.loginAsAdmin();
  });

  describe('Admin User Management and Tier Assignment', () => {
    beforeEach(() => {
      // Create test users for management
      cy.task('createTestUser', {
        email: 'user1@example.com',
        userType: 'individual',
        status: 'active'
      });
      cy.task('createTestUser', {
        email: 'user2@example.com',
        userType: 'dealer',
        status: 'active'
      });
    });

    it('should complete user tier assignment workflow', () => {
      // Step 1: Navigate to user management
      cy.visit('/admin/users');
      cy.get('[data-testid="admin-users-page"]').should('be.visible');

      // Step 2: Search for specific user
      cy.get('[data-testid="user-search"]').type('user1@example.com');
      cy.get('[data-testid="search-button"]').click();

      // Step 3: Select user and open tier management
      cy.get('[data-testid="user-row"]').first().click();
      cy.get('[data-testid="user-details-modal"]').should('be.visible');
      cy.get('[data-testid="manage-tier-button"]').click();

      // Step 4: Change user tier
      cy.get('[data-testid="tier-select"]').select('dealer');
      cy.get('[data-testid="capability-bulk-operations"]').check();
      cy.get('[data-testid="capability-dealer-dashboard"]').check();

      // Step 5: Update limits
      cy.get('[data-testid="max-listings"]').clear().type('50');
      cy.get('[data-testid="max-images"]').clear().type('25');

      // Step 6: Save changes
      cy.get('[data-testid="save-tier-changes"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'User tier updated successfully');

      // Step 7: Verify changes in user list
      cy.get('[data-testid="user-type-badge"]').should('contain', 'Dealer');
      cy.get('[data-testid="user-capabilities"]').should('contain', 'Bulk Operations');
    });

    it('should complete premium membership assignment workflow', () => {
      // Step 1: Navigate to user management
      cy.visit('/admin/users');

      // Step 2: Find individual user
      cy.get('[data-testid="user-search"]').type('user1@example.com');
      cy.get('[data-testid="search-button"]').click();
      cy.get('[data-testid="user-row"]').first().click();

      // Step 3: Assign premium membership
      cy.get('[data-testid="assign-premium-button"]').click();
      cy.get('[data-testid="premium-assignment-modal"]').should('be.visible');

      // Step 4: Configure premium plan
      cy.get('[data-testid="premium-plan-select"]').select('premium_individual');
      cy.get('[data-testid="feature-priority-placement"]').check();
      cy.get('[data-testid="feature-featured-listings"]').check();
      cy.get('[data-testid="feature-analytics-access"]').check();

      // Step 5: Set expiration
      cy.get('[data-testid="expiration-date"]').type('2025-12-31');
      cy.get('[data-testid="auto-renew"]').uncheck();

      // Step 6: Apply premium membership
      cy.get('[data-testid="apply-premium"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'Premium membership assigned');

      // Step 7: Verify premium status
      cy.get('[data-testid="premium-badge"]').should('be.visible');
      cy.get('[data-testid="membership-plan"]').should('contain', 'Premium Individual');
    });

    it('should complete bulk user management workflow', () => {
      // Step 1: Navigate to user management
      cy.visit('/admin/users');

      // Step 2: Select multiple users
      cy.get('[data-testid="select-all-checkbox"]').check();
      cy.get('[data-testid="selected-count"]').should('contain', '2 users selected');

      // Step 3: Open bulk actions
      cy.get('[data-testid="bulk-actions-button"]').click();
      cy.get('[data-testid="bulk-actions-menu"]').should('be.visible');

      // Step 4: Select bulk tier update
      cy.get('[data-testid="bulk-tier-update"]').click();
      cy.get('[data-testid="bulk-tier-modal"]').should('be.visible');

      // Step 5: Configure bulk update
      cy.get('[data-testid="bulk-tier-select"]').select('dealer');
      cy.get('[data-testid="bulk-capability-bulk-operations"]').check();
      cy.get('[data-testid="bulk-max-listings"]').clear().type('50');

      // Step 6: Apply bulk changes
      cy.get('[data-testid="apply-bulk-changes"]').click();
      cy.get('[data-testid="bulk-confirmation-modal"]').should('be.visible');
      cy.get('[data-testid="confirm-bulk-update"]').click();

      // Step 7: Verify bulk update results
      cy.get('[data-testid="bulk-success-message"]').should('contain', '2 users updated successfully');
      cy.get('[data-testid="user-type-badge"]').should('contain', 'Dealer');
    });

    it('should complete user group management workflow', () => {
      // Step 1: Navigate to group management
      cy.visit('/admin/groups');
      cy.get('[data-testid="admin-groups-page"]').should('be.visible');

      // Step 2: Create new group
      cy.get('[data-testid="create-group-button"]').click();
      cy.get('[data-testid="group-creation-modal"]').should('be.visible');

      // Step 3: Configure group
      cy.get('[data-testid="group-name"]').type('Premium Dealers');
      cy.get('[data-testid="group-description"]').type('Premium dealer user group');
      cy.get('[data-testid="permission-advanced-analytics"]').check();
      cy.get('[data-testid="permission-priority-support"]').check();

      // Step 4: Create group
      cy.get('[data-testid="create-group"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'Group created successfully');

      // Step 5: Add users to group
      cy.get('[data-testid="group-row"]').first().click();
      cy.get('[data-testid="add-members-button"]').click();
      cy.get('[data-testid="user-selector"]').should('be.visible');

      // Step 6: Select users
      cy.get('[data-testid="available-user"]').first().click();
      cy.get('[data-testid="add-selected-users"]').click();

      // Step 7: Verify group membership
      cy.get('[data-testid="group-members"]').should('contain', '1 member');
      cy.get('[data-testid="member-list"]').should('be.visible');
    });
  });

  describe('Moderation Queue Processing and Decision Workflows', () => {
    beforeEach(() => {
      // Create test listings requiring moderation
      cy.task('createTestListing', {
        title: 'Test Boat 1',
        status: 'pending_review'
      });
      cy.task('createTestListing', {
        title: 'Test Boat 2',
        status: 'pending_review'
      });
    });

    it('should complete moderation queue assignment workflow', () => {
      // Step 1: Navigate to moderation dashboard
      cy.visit('/admin/moderation');
      cy.get('[data-testid="moderation-dashboard"]').should('be.visible');

      // Step 2: View moderation queue
      cy.get('[data-testid="moderation-queue"]').should('be.visible');
      cy.get('[data-testid="queue-item"]').should('have.length', 2);

      // Step 3: Assign moderation tasks
      cy.get('[data-testid="queue-item"]').first().within(() => {
        cy.get('[data-testid="assign-button"]').click();
      });

      cy.get('[data-testid="moderator-select"]').select('content_moderator');
      cy.get('[data-testid="assign-moderator"]').click();

      // Step 4: Verify assignment
      cy.get('[data-testid="success-message"]').should('contain', 'Moderation assigned');
      cy.get('[data-testid="assigned-moderator"]').should('contain', 'content_moderator');

      // Step 5: Check moderator workload
      cy.get('[data-testid="moderator-workload"]').click();
      cy.get('[data-testid="workload-panel"]').should('be.visible');
      cy.get('[data-testid="assigned-count"]').should('contain', '1');
    });

    it('should complete moderation approval workflow', () => {
      // Step 1: Navigate to moderation queue
      cy.visit('/admin/moderation');

      // Step 2: Open listing for review
      cy.get('[data-testid="queue-item"]').first().click();
      cy.get('[data-testid="listing-review-modal"]').should('be.visible');

      // Step 3: Review listing details
      cy.get('[data-testid="listing-title"]').should('contain', 'Test Boat 1');
      cy.get('[data-testid="listing-images"]').should('be.visible');
      cy.get('[data-testid="boat-specifications"]').should('be.visible');

      // Step 4: Approve listing
      cy.get('[data-testid="approve-button"]').click();
      cy.get('[data-testid="approval-modal"]').should('be.visible');

      // Step 5: Add approval notes
      cy.get('[data-testid="approval-reason"]').type('Meets all quality standards');
      cy.get('[data-testid="public-notes"]').type('Excellent listing with complete information');
      cy.get('[data-testid="internal-notes"]').type('All documentation verified');

      // Step 6: Confirm approval
      cy.get('[data-testid="confirm-approval"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'Listing approved successfully');

      // Step 7: Verify listing status
      cy.get('[data-testid="listing-status"]').should('contain', 'Approved');
      cy.get('[data-testid="queue-item"]').should('have.length', 1); // One less in queue
    });

    it('should complete moderation rejection workflow', () => {
      // Step 1: Navigate to moderation queue
      cy.visit('/admin/moderation');

      // Step 2: Open listing for review
      cy.get('[data-testid="queue-item"]').first().click();

      // Step 3: Reject listing
      cy.get('[data-testid="reject-button"]').click();
      cy.get('[data-testid="rejection-modal"]').should('be.visible');

      // Step 4: Provide rejection details
      cy.get('[data-testid="rejection-reason"]').type('Insufficient information provided');
      cy.get('[data-testid="public-notes"]').type('Please provide complete boat specifications');
      cy.get('[data-testid="internal-notes"]').type('Missing engine details and proper images');

      // Step 5: Add required changes
      cy.get('[data-testid="add-required-change"]').click();
      cy.get('[data-testid="required-change-0"]').type('Add detailed engine specifications');
      cy.get('[data-testid="add-required-change"]').click();
      cy.get('[data-testid="required-change-1"]').type('Upload at least 5 high-quality photos');

      // Step 6: Confirm rejection
      cy.get('[data-testid="confirm-rejection"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'Listing rejected');

      // Step 7: Verify rejection status
      cy.get('[data-testid="listing-status"]').should('contain', 'Rejected');
    });

    it('should complete bulk moderation workflow', () => {
      // Step 1: Navigate to moderation queue
      cy.visit('/admin/moderation');

      // Step 2: Select multiple listings
      cy.get('[data-testid="select-all-queue"]').check();
      cy.get('[data-testid="selected-queue-count"]').should('contain', '2 items selected');

      // Step 3: Open bulk actions
      cy.get('[data-testid="bulk-moderation-actions"]').click();
      cy.get('[data-testid="bulk-actions-menu"]').should('be.visible');

      // Step 4: Bulk approve
      cy.get('[data-testid="bulk-approve"]').click();
      cy.get('[data-testid="bulk-approval-modal"]').should('be.visible');

      // Step 5: Configure bulk approval
      cy.get('[data-testid="bulk-reason"]').type('Batch approval - all meet standards');
      cy.get('[data-testid="bulk-public-notes"]').type('Approved in batch review');

      // Step 6: Confirm bulk approval
      cy.get('[data-testid="confirm-bulk-approval"]').click();
      cy.get('[data-testid="bulk-success-message"]').should('contain', '2 listings approved');

      // Step 7: Verify queue cleared
      cy.get('[data-testid="queue-empty-message"]').should('be.visible');
    });
  });

  describe('Billing Management and Financial Reporting', () => {
    beforeEach(() => {
      // Create test users with billing accounts
      cy.task('createTestUser', {
        email: 'billing1@example.com',
        userType: 'premium_individual'
      }).then((user) => {
        cy.task('createTestBillingAccount', {
          userId: user.userId,
          plan: 'premium_individual',
          amount: 29.99
        });
      });
    });

    it('should complete customer billing management workflow', () => {
      // Step 1: Navigate to billing management
      cy.visit('/admin/billing');
      cy.get('[data-testid="billing-dashboard"]').should('be.visible');

      // Step 2: Search for customer
      cy.get('[data-testid="customer-search"]').type('billing1@example.com');
      cy.get('[data-testid="search-billing"]').click();

      // Step 3: View customer billing details
      cy.get('[data-testid="customer-row"]').first().click();
      cy.get('[data-testid="billing-details-modal"]').should('be.visible');

      // Step 4: View payment history
      cy.get('[data-testid="payment-history-tab"]').click();
      cy.get('[data-testid="payment-history"]').should('be.visible');

      // Step 5: Update payment method
      cy.get('[data-testid="update-payment-method"]').click();
      cy.get('[data-testid="payment-method-modal"]').should('be.visible');

      cy.get('[data-testid="card-number"]').type('4242424242424242');
      cy.get('[data-testid="expiry-month"]').select('12');
      cy.get('[data-testid="expiry-year"]').select('2026');

      // Step 6: Save payment method
      cy.get('[data-testid="save-payment-method"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'Payment method updated');

      // Step 7: Verify update
      cy.get('[data-testid="payment-method-display"]').should('contain', '****4242');
    });

    it('should complete refund processing workflow', () => {
      // Step 1: Navigate to billing management
      cy.visit('/admin/billing');

      // Step 2: Find customer with transaction
      cy.get('[data-testid="customer-search"]').type('billing1@example.com');
      cy.get('[data-testid="search-billing"]').click();
      cy.get('[data-testid="customer-row"]').first().click();

      // Step 3: View transactions
      cy.get('[data-testid="transactions-tab"]').click();
      cy.get('[data-testid="transaction-row"]').first().within(() => {
        cy.get('[data-testid="refund-button"]').click();
      });

      // Step 4: Configure refund
      cy.get('[data-testid="refund-modal"]').should('be.visible');
      cy.get('[data-testid="refund-amount"]').should('have.value', '29.99');
      cy.get('[data-testid="refund-reason"]').type('Customer requested cancellation');
      cy.get('[data-testid="refund-type"]').select('full');

      // Step 5: Process refund
      cy.get('[data-testid="process-refund"]').click();
      cy.get('[data-testid="refund-confirmation"]').should('be.visible');
      cy.get('[data-testid="confirm-refund"]').click();

      // Step 6: Verify refund processing
      cy.get('[data-testid="success-message"]').should('contain', 'Refund processed successfully');
      cy.get('[data-testid="refund-transaction"]').should('be.visible');
    });

    it('should complete financial reporting workflow', () => {
      // Step 1: Navigate to financial reports
      cy.visit('/admin/reports/financial');
      cy.get('[data-testid="financial-reports"]').should('be.visible');

      // Step 2: Generate revenue report
      cy.get('[data-testid="report-type"]').select('revenue');
      cy.get('[data-testid="date-range"]').select('last_30_days');
      cy.get('[data-testid="group-by"]').select('plan');
      cy.get('[data-testid="generate-report"]').click();

      // Step 3: View report results
      cy.get('[data-testid="report-results"]').should('be.visible');
      cy.get('[data-testid="total-revenue"]').should('be.visible');
      cy.get('[data-testid="revenue-chart"]').should('be.visible');

      // Step 4: View subscription analytics
      cy.get('[data-testid="subscription-analytics-tab"]').click();
      cy.get('[data-testid="active-subscriptions"]').should('be.visible');
      cy.get('[data-testid="subscription-breakdown"]').should('be.visible');

      // Step 5: Export report data
      cy.get('[data-testid="export-report"]').click();
      cy.get('[data-testid="export-format"]').select('csv');
      cy.get('[data-testid="confirm-export"]').click();

      // Step 6: Verify export
      cy.get('[data-testid="export-success"]').should('contain', 'Report exported successfully');
    });
  });

  describe('Sales Role Customer Management and Plan Configuration', () => {
    beforeEach(() => {
      // Create sales user and customers
      cy.task('createTestUser', {
        email: 'sales@example.com',
        role: 'sales',
        permissions: ['customer_management', 'plan_configuration']
      });
      
      cy.task('createTestUser', {
        email: 'customer1@example.com',
        userType: 'individual'
      });
    });

    it('should complete customer assignment workflow', () => {
      // Step 1: Login as sales manager
      cy.logout();
      cy.login('sales.manager@example.com', 'SalesPass123!');

      // Step 2: Navigate to sales management
      cy.visit('/admin/sales');
      cy.get('[data-testid="sales-dashboard"]').should('be.visible');

      // Step 3: Assign customers to sales rep
      cy.get('[data-testid="assign-customers-button"]').click();
      cy.get('[data-testid="customer-assignment-modal"]').should('be.visible');

      // Step 4: Select sales rep
      cy.get('[data-testid="sales-rep-select"]').select('sales@example.com');

      // Step 5: Select customers
      cy.get('[data-testid="available-customers"]').within(() => {
        cy.get('[data-testid="customer-checkbox"]').first().check();
      });

      // Step 6: Assign customers
      cy.get('[data-testid="assign-selected"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'Customers assigned successfully');

      // Step 7: Verify assignment
      cy.get('[data-testid="sales-rep-customers"]').should('contain', '1 customer');
    });

    it('should complete plan configuration workflow', () => {
      // Step 1: Login as sales rep
      cy.logout();
      cy.login('sales@example.com', 'SalesPass123!');

      // Step 2: Navigate to customer management
      cy.visit('/sales/customers');
      cy.get('[data-testid="sales-customers"]').should('be.visible');

      // Step 3: Select customer
      cy.get('[data-testid="customer-row"]').first().click();
      cy.get('[data-testid="customer-details"]').should('be.visible');

      // Step 4: Configure premium plan
      cy.get('[data-testid="configure-plan-button"]').click();
      cy.get('[data-testid="plan-configuration-modal"]').should('be.visible');

      // Step 5: Select plan and features
      cy.get('[data-testid="plan-select"]').select('premium_individual');
      cy.get('[data-testid="feature-priority-placement"]').check();
      cy.get('[data-testid="feature-featured-listings"]').check();
      cy.get('[data-testid="feature-analytics-access"]').check();

      // Step 6: Set limits
      cy.get('[data-testid="max-listings"]').clear().type('25');
      cy.get('[data-testid="featured-listings"]').clear().type('3');

      // Step 7: Apply configuration
      cy.get('[data-testid="apply-plan-config"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'Plan configured successfully');

      // Step 8: Verify customer plan
      cy.get('[data-testid="customer-plan"]').should('contain', 'Premium Individual');
    });

    it('should complete sales performance tracking workflow', () => {
      // Step 1: Login as sales rep
      cy.logout();
      cy.login('sales@example.com', 'SalesPass123!');

      // Step 2: Navigate to performance dashboard
      cy.visit('/sales/performance');
      cy.get('[data-testid="performance-dashboard"]').should('be.visible');

      // Step 3: View performance metrics
      cy.get('[data-testid="total-conversions"]').should('be.visible');
      cy.get('[data-testid="total-revenue"]').should('be.visible');
      cy.get('[data-testid="conversion-rate"]').should('be.visible');

      // Step 4: View targets vs achievement
      cy.get('[data-testid="targets-section"]').should('be.visible');
      cy.get('[data-testid="monthly-target"]').should('be.visible');
      cy.get('[data-testid="achievement-percentage"]').should('be.visible');

      // Step 5: View commission calculation
      cy.get('[data-testid="commission-section"]').should('be.visible');
      cy.get('[data-testid="commission-amount"]').should('be.visible');

      // Step 6: Export performance report
      cy.get('[data-testid="export-performance"]').click();
      cy.get('[data-testid="export-success"]').should('contain', 'Performance report exported');
    });
  });

  describe('Complete Admin Workflow Integration', () => {
    it('should complete full admin management workflow', () => {
      // Step 1: Create user through admin interface
      cy.visit('/admin/users');
      cy.get('[data-testid="create-user-button"]').click();
      
      cy.get('[data-testid="user-email"]').type('integration.test@example.com');
      cy.get('[data-testid="user-name"]').type('Integration Test User');
      cy.get('[data-testid="user-type"]').select('individual');
      cy.get('[data-testid="create-user"]').click();

      // Step 2: Upgrade to premium
      cy.get('[data-testid="user-row"]').first().click();
      cy.get('[data-testid="assign-premium-button"]').click();
      cy.get('[data-testid="premium-plan-select"]').select('premium_individual');
      cy.get('[data-testid="apply-premium"]').click();

      // Step 3: Navigate to moderation (simulate user creating listing)
      cy.task('createTestListing', {
        ownerId: 'integration-user-id',
        status: 'pending_review'
      });

      cy.visit('/admin/moderation');
      cy.get('[data-testid="queue-item"]').first().click();
      cy.get('[data-testid="approve-button"]').click();
      cy.get('[data-testid="approval-reason"]').type('Meets standards');
      cy.get('[data-testid="confirm-approval"]').click();

      // Step 4: Check billing
      cy.visit('/admin/billing');
      cy.get('[data-testid="customer-search"]').type('integration.test@example.com');
      cy.get('[data-testid="search-billing"]').click();
      cy.get('[data-testid="customer-row"]').should('be.visible');

      // Step 5: Generate comprehensive report
      cy.visit('/admin/reports');
      cy.get('[data-testid="comprehensive-report"]').click();
      cy.get('[data-testid="user-filter"]').type('integration.test@example.com');
      cy.get('[data-testid="generate-report"]').click();

      // Step 6: Verify complete workflow
      cy.get('[data-testid="report-results"]').should('be.visible');
      cy.get('[data-testid="user-summary"]').should('contain', 'Premium Individual');
      cy.get('[data-testid="listing-summary"]').should('contain', '1 listing');
      cy.get('[data-testid="billing-summary"]').should('be.visible');
    });
  });
});