/**
 * Load and Performance Testing Suite
 * Tests system performance with large datasets and concurrent operations
 * Requirements: All requirements - performance validation
 */

import { DatabaseService } from '../shared/database';
import { UserService } from '../user-service';
import { ListingService } from '../listing';
import { AdminService } from '../admin-service';
import { BillingService } from '../billing-service';
import { FinanceService } from '../finance-service';
import { testUtils } from '../shared/test-utils';

describe('Load and Performance Testing', () => {
  let db: DatabaseService;
  let userService: UserService;
  let listingService: ListingService;
  let adminService: AdminService;
  let billingService: BillingService;
  let financeService: FinanceService;

  beforeAll(async () => {
    // Initialize services
    db = new DatabaseService();
    userService = new UserService(db);
    listingService = new ListingService(db);
    adminService = new AdminService(db);
    billingService = new BillingService(db);
    financeService = new FinanceService(db);

    // Setup test database with performance optimizations
    await testUtils.setupTestDatabase();
  });

  afterAll(async () => {
    await testUtils.cleanupTestDatabase();
  });

  beforeEach(async () => {
    await testUtils.clearTestData();
  });

  describe('Multi-Engine Listing Performance Tests', () => {
    test('should handle large numbers of multi-engine listings efficiently', async () => {
      const startTime = Date.now();
      const listingCount = 1000;
      const batchSize = 50;

      // Step 1: Create test users for listings
      const users = [];
      for (let i = 0; i < 20; i++) {
        const user = await testUtils.createTestUser({
          userType: 'dealer',
          email: `dealer${i}@example.com`
        });
        users.push(user);
      }

      // Step 2: Create listings in batches
      const listings = [];
      for (let batch = 0; batch < listingCount / batchSize; batch++) {
        const batchPromises = [];
        
        for (let i = 0; i < batchSize; i++) {
          const listingIndex = batch * batchSize + i;
          const user = users[listingIndex % users.length];
          
          const listingData = {
            title: `Performance Test Boat ${listingIndex}`,
            description: `Performance testing boat with multiple engines`,
            price: 50000 + (listingIndex * 1000),
            location: {
              city: 'Test City',
              state: 'FL',
              zipCode: '12345'
            },
            boatDetails: {
              year: 2020,
              make: 'Test Make',
              model: `Model ${listingIndex}`,
              length: 25 + (listingIndex % 20),
              beam: 8,
              draft: 2,
              hullMaterial: 'fiberglass'
            },
            engines: [
              {
                type: 'outboard',
                manufacturer: 'Test Engine Co',
                model: 'Test 250',
                horsepower: 250,
                fuelType: 'gasoline',
                hours: 100,
                year: 2020,
                condition: 'excellent',
                position: 1
              },
              {
                type: 'outboard',
                manufacturer: 'Test Engine Co',
                model: 'Test 250',
                horsepower: 250,
                fuelType: 'gasoline',
                hours: 100,
                year: 2020,
                condition: 'excellent',
                position: 2
              }
            ],
            features: ['GPS', 'Fish Finder'],
            images: [`test${listingIndex}_1.jpg`, `test${listingIndex}_2.jpg`],
            status: 'active'
          };

          batchPromises.push(
            listingService.createListing(user.userId, listingData)
          );
        }

        const batchResults = await Promise.all(batchPromises);
        listings.push(...batchResults);

        // Log progress
        console.log(`Created batch ${batch + 1}/${listingCount / batchSize} (${listings.length} total listings)`);
      }

      const creationTime = Date.now() - startTime;
      console.log(`Created ${listingCount} multi-engine listings in ${creationTime}ms`);

      // Step 3: Performance test - Search by total horsepower
      const searchStartTime = Date.now();
      const searchResults = await listingService.searchListings({
        minHorsepower: 400,
        maxHorsepower: 600,
        limit: 100
      });
      const searchTime = Date.now() - searchStartTime;

      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchTime).toBeLessThan(2000); // Should complete within 2 seconds
      console.log(`Horsepower search completed in ${searchTime}ms`);

      // Step 4: Performance test - Get listings by engine configuration
      const configSearchStartTime = Date.now();
      const twinEngineListings = await listingService.getListingsByEngineConfiguration('twin');
      const configSearchTime = Date.now() - configSearchStartTime;

      expect(twinEngineListings.length).toBe(listingCount);
      expect(configSearchTime).toBeLessThan(3000); // Should complete within 3 seconds
      console.log(`Engine configuration search completed in ${configSearchTime}ms`);

      // Step 5: Performance test - Bulk listing operations
      const bulkUpdateStartTime = Date.now();
      const listingIds = listings.slice(0, 100).map(l => l.listingId);
      await listingService.bulkUpdateListings(listingIds, {
        status: 'featured'
      });
      const bulkUpdateTime = Date.now() - bulkUpdateStartTime;

      expect(bulkUpdateTime).toBeLessThan(5000); // Should complete within 5 seconds
      console.log(`Bulk update of 100 listings completed in ${bulkUpdateTime}ms`);

      // Performance assertions
      expect(creationTime / listingCount).toBeLessThan(100); // Less than 100ms per listing
      expect(searchTime).toBeLessThan(2000);
      expect(configSearchTime).toBeLessThan(3000);
      expect(bulkUpdateTime).toBeLessThan(5000);
    });

    test('should handle concurrent multi-engine listing creation', async () => {
      const concurrentUsers = 10;
      const listingsPerUser = 20;

      // Step 1: Create concurrent users
      const users = await Promise.all(
        Array.from({ length: concurrentUsers }, (_, i) =>
          testUtils.createTestUser({
            userType: 'dealer',
            email: `concurrent${i}@example.com`
          })
        )
      );

      // Step 2: Create listings concurrently
      const startTime = Date.now();
      const concurrentPromises = users.map(async (user, userIndex) => {
        const userListings = [];
        
        for (let i = 0; i < listingsPerUser; i++) {
          const listingData = {
            title: `Concurrent Boat ${userIndex}-${i}`,
            description: 'Concurrent creation test',
            price: 75000,
            location: { city: 'Test City', state: 'FL', zipCode: '12345' },
            boatDetails: {
              year: 2020,
              make: 'Concurrent Make',
              model: `Model ${userIndex}-${i}`,
              length: 30,
              beam: 10,
              draft: 2.5,
              hullMaterial: 'fiberglass'
            },
            engines: [
              {
                type: 'outboard',
                manufacturer: 'Concurrent Engine',
                model: 'CE 300',
                horsepower: 300,
                fuelType: 'gasoline',
                hours: 50,
                year: 2020,
                condition: 'excellent',
                position: 1
              },
              {
                type: 'outboard',
                manufacturer: 'Concurrent Engine',
                model: 'CE 300',
                horsepower: 300,
                fuelType: 'gasoline',
                hours: 50,
                year: 2020,
                condition: 'excellent',
                position: 2
              }
            ],
            features: ['Twin Engines', 'GPS'],
            images: [`concurrent${userIndex}_${i}.jpg`],
            status: 'active'
          };

          const listing = await listingService.createListing(user.userId, listingData);
          userListings.push(listing);
        }

        return userListings;
      });

      const results = await Promise.all(concurrentPromises);
      const totalTime = Date.now() - startTime;
      const totalListings = results.flat().length;

      console.log(`Created ${totalListings} listings concurrently in ${totalTime}ms`);

      // Step 3: Verify all listings created successfully
      expect(totalListings).toBe(concurrentUsers * listingsPerUser);
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Step 4: Verify data integrity
      for (const userListings of results) {
        for (const listing of userListings) {
          expect(listing.engines).toHaveLength(2);
          expect(listing.totalHorsepower).toBe(600);
          expect(listing.engineConfiguration).toBe('twin');
        }
      }

      // Performance assertion
      expect(totalTime / totalListings).toBeLessThan(500); // Less than 500ms per listing on average
    });
  });

  describe('Moderation Queue Performance Tests', () => {
    test('should handle high volume moderation queue efficiently', async () => {
      const queueSize = 2000;
      const moderatorCount = 10;

      // Step 1: Create moderators
      const moderators = await Promise.all(
        Array.from({ length: moderatorCount }, (_, i) =>
          testUtils.createTestUser({
            role: 'content_moderator',
            email: `moderator${i}@example.com`,
            permissions: ['moderate_listings']
          })
        )
      );

      // Step 2: Create large moderation queue
      const startTime = Date.now();
      const listings = [];
      
      for (let i = 0; i < queueSize; i++) {
        const listing = await testUtils.createTestListing({
          title: `Queue Test Listing ${i}`,
          status: 'pending_review'
        });
        listings.push(listing);
      }

      const queueCreationTime = Date.now() - startTime;
      console.log(`Created moderation queue of ${queueSize} items in ${queueCreationTime}ms`);

      // Step 3: Performance test - Get moderation queue
      const queueRetrievalStartTime = Date.now();
      const queue = await adminService.getModerationQueue({
        limit: 100,
        sortBy: 'priority',
        sortOrder: 'desc'
      });
      const queueRetrievalTime = Date.now() - queueRetrievalStartTime;

      expect(queue.length).toBe(100);
      expect(queueRetrievalTime).toBeLessThan(1000); // Should complete within 1 second
      console.log(`Retrieved moderation queue in ${queueRetrievalTime}ms`);

      // Step 4: Performance test - Bulk assignment
      const bulkAssignmentStartTime = Date.now();
      const listingIds = listings.slice(0, 500).map(l => l.listingId);
      
      // Distribute assignments across moderators
      const assignmentPromises = [];
      for (let i = 0; i < listingIds.length; i++) {
        const moderator = moderators[i % moderators.length];
        assignmentPromises.push(
          adminService.assignModeration(listingIds[i], moderator.userId)
        );
      }

      await Promise.all(assignmentPromises);
      const bulkAssignmentTime = Date.now() - bulkAssignmentStartTime;

      expect(bulkAssignmentTime).toBeLessThan(10000); // Should complete within 10 seconds
      console.log(`Bulk assigned 500 moderation tasks in ${bulkAssignmentTime}ms`);

      // Step 5: Performance test - Concurrent moderation processing
      const concurrentModerationStartTime = Date.now();
      const moderationPromises = [];

      for (let i = 0; i < 100; i++) {
        const listing = listings[i];
        const moderator = moderators[i % moderators.length];
        
        moderationPromises.push(
          adminService.processModerationDecision(listing.listingId, moderator.userId, {
            decision: 'approve',
            reason: 'Performance test approval',
            publicNotes: 'Approved for testing',
            internalNotes: 'Load test'
          })
        );
      }

      await Promise.all(moderationPromises);
      const concurrentModerationTime = Date.now() - concurrentModerationStartTime;

      expect(concurrentModerationTime).toBeLessThan(15000); // Should complete within 15 seconds
      console.log(`Processed 100 moderation decisions concurrently in ${concurrentModerationTime}ms`);

      // Step 6: Verify moderator workload distribution
      const workloadPromises = moderators.map(m => 
        adminService.getModeratorWorkload(m.userId)
      );
      const workloads = await Promise.all(workloadPromises);

      const totalAssigned = workloads.reduce((sum, w) => sum + w.assigned, 0);
      expect(totalAssigned).toBe(500);

      // Performance assertions
      expect(queueRetrievalTime).toBeLessThan(1000);
      expect(bulkAssignmentTime).toBeLessThan(10000);
      expect(concurrentModerationTime).toBeLessThan(15000);
    });

    test('should maintain performance with complex moderation workflows', async () => {
      const complexListingCount = 500;

      // Step 1: Create complex listings with multiple flags
      const startTime = Date.now();
      const complexListings = [];

      for (let i = 0; i < complexListingCount; i++) {
        const listing = await testUtils.createTestListing({
          title: `Complex Listing ${i}`,
          status: 'pending_review',
          flags: [
            { type: 'inappropriate_content', severity: 'medium' },
            { type: 'pricing_concern', severity: 'low' },
            { type: 'image_quality', severity: 'high' }
          ]
        });
        complexListings.push(listing);
      }

      const creationTime = Date.now() - startTime;
      console.log(`Created ${complexListingCount} complex listings in ${creationTime}ms`);

      // Step 2: Performance test - Priority-based queue retrieval
      const priorityQueueStartTime = Date.now();
      const highPriorityQueue = await adminService.getModerationQueue({
        priority: 'high',
        limit: 50
      });
      const priorityQueueTime = Date.now() - priorityQueueStartTime;

      expect(highPriorityQueue.length).toBeGreaterThan(0);
      expect(priorityQueueTime).toBeLessThan(2000);
      console.log(`Retrieved high priority queue in ${priorityQueueTime}ms`);

      // Step 3: Performance test - Complex moderation decisions
      const complexDecisionStartTime = Date.now();
      const moderator = await testUtils.createTestUser({ role: 'content_moderator' });

      const complexDecisionPromises = complexListings.slice(0, 50).map(listing =>
        adminService.processModerationDecision(listing.listingId, moderator.userId, {
          decision: 'request_changes',
          reason: 'Multiple issues identified',
          publicNotes: 'Please address the following concerns',
          internalNotes: 'Complex case with multiple flags',
          requiredChanges: [
            'Update inappropriate content',
            'Verify pricing accuracy',
            'Improve image quality'
          ]
        })
      );

      await Promise.all(complexDecisionPromises);
      const complexDecisionTime = Date.now() - complexDecisionStartTime;

      expect(complexDecisionTime).toBeLessThan(10000);
      console.log(`Processed 50 complex moderation decisions in ${complexDecisionTime}ms`);

      // Performance assertions
      expect(creationTime / complexListingCount).toBeLessThan(200);
      expect(priorityQueueTime).toBeLessThan(2000);
      expect(complexDecisionTime).toBeLessThan(10000);
    });
  });

  describe('Billing System Performance Tests', () => {
    test('should handle concurrent billing transactions efficiently', async () => {
      const userCount = 500;
      const transactionsPerUser = 10;

      // Step 1: Create users with billing accounts
      const startTime = Date.now();
      const users = [];

      for (let i = 0; i < userCount; i++) {
        const user = await testUtils.createTestUser({
          userType: 'premium_individual',
          email: `billing${i}@example.com`
        });

        const billingAccount = await testUtils.createTestBillingAccount({
          userId: user.userId,
          plan: 'premium_individual',
          amount: 29.99,
          status: 'active'
        });

        users.push({ user, billingAccount });
      }

      const setupTime = Date.now() - startTime;
      console.log(`Set up ${userCount} billing accounts in ${setupTime}ms`);

      // Step 2: Process concurrent transactions
      const transactionStartTime = Date.now();
      const transactionPromises = [];

      for (const { user } of users) {
        for (let i = 0; i < transactionsPerUser; i++) {
          transactionPromises.push(
            billingService.processPayment({
              userId: user.userId,
              amount: 29.99,
              currency: 'USD',
              paymentMethod: 'card',
              description: `Monthly subscription ${i + 1}`
            })
          );
        }
      }

      const transactions = await Promise.all(transactionPromises);
      const transactionTime = Date.now() - transactionStartTime;
      const totalTransactions = transactions.length;

      console.log(`Processed ${totalTransactions} transactions in ${transactionTime}ms`);

      // Step 3: Performance test - Billing queries
      const queryStartTime = Date.now();
      
      // Test various billing queries
      const [
        revenueReport,
        subscriptionAnalytics,
        paymentHistory,
        failedPayments
      ] = await Promise.all([
        billingService.generateRevenueReport({
          startDate: Date.now() - (30 * 24 * 60 * 60 * 1000),
          endDate: Date.now()
        }),
        billingService.getSubscriptionAnalytics(),
        billingService.getPaymentHistory({ limit: 100 }),
        billingService.getFailedPayments({ limit: 50 })
      ]);

      const queryTime = Date.now() - queryStartTime;

      expect(revenueReport.totalRevenue).toBeGreaterThan(0);
      expect(subscriptionAnalytics.totalActiveSubscriptions).toBe(userCount);
      expect(paymentHistory.length).toBe(100);
      expect(queryTime).toBeLessThan(5000);

      console.log(`Completed billing queries in ${queryTime}ms`);

      // Performance assertions
      expect(transactionTime / totalTransactions).toBeLessThan(100); // Less than 100ms per transaction
      expect(queryTime).toBeLessThan(5000);
    });

    test('should handle subscription management at scale', async () => {
      const subscriptionCount = 1000;

      // Step 1: Create subscriptions
      const startTime = Date.now();
      const subscriptions = [];

      for (let i = 0; i < subscriptionCount; i++) {
        const user = await testUtils.createTestUser({
          userType: 'premium_individual',
          email: `sub${i}@example.com`
        });

        const subscription = await billingService.createSubscription({
          userId: user.userId,
          plan: i % 2 === 0 ? 'premium_individual' : 'premium_dealer',
          amount: i % 2 === 0 ? 29.99 : 99.99,
          billingCycle: 'monthly'
        });

        subscriptions.push(subscription);
      }

      const creationTime = Date.now() - startTime;
      console.log(`Created ${subscriptionCount} subscriptions in ${creationTime}ms`);

      // Step 2: Performance test - Subscription renewals
      const renewalStartTime = Date.now();
      const renewalPromises = subscriptions.slice(0, 100).map(sub =>
        billingService.processSubscriptionRenewal(sub.subscriptionId)
      );

      await Promise.all(renewalPromises);
      const renewalTime = Date.now() - renewalStartTime;

      expect(renewalTime).toBeLessThan(10000);
      console.log(`Processed 100 subscription renewals in ${renewalTime}ms`);

      // Step 3: Performance test - Bulk subscription updates
      const bulkUpdateStartTime = Date.now();
      const subscriptionIds = subscriptions.slice(100, 200).map(s => s.subscriptionId);

      await billingService.bulkUpdateSubscriptions(subscriptionIds, {
        status: 'paused',
        reason: 'Performance test pause'
      });

      const bulkUpdateTime = Date.now() - bulkUpdateStartTime;

      expect(bulkUpdateTime).toBeLessThan(5000);
      console.log(`Bulk updated 100 subscriptions in ${bulkUpdateTime}ms`);

      // Performance assertions
      expect(creationTime / subscriptionCount).toBeLessThan(150);
      expect(renewalTime).toBeLessThan(10000);
      expect(bulkUpdateTime).toBeLessThan(5000);
    });
  });

  describe('Admin Dashboard Performance Tests', () => {
    test('should load admin dashboard with large datasets efficiently', async () => {
      // Step 1: Create large dataset
      const dataSetupStartTime = Date.now();
      
      // Create users
      const users = await Promise.all(
        Array.from({ length: 1000 }, (_, i) =>
          testUtils.createTestUser({
            userType: i % 4 === 0 ? 'premium_individual' : 
                     i % 4 === 1 ? 'premium_dealer' :
                     i % 4 === 2 ? 'dealer' : 'individual',
            email: `dashboard${i}@example.com`
          })
        )
      );

      // Create listings
      const listings = await Promise.all(
        Array.from({ length: 2000 }, (_, i) =>
          testUtils.createTestListing({
            ownerId: users[i % users.length].userId,
            title: `Dashboard Test Listing ${i}`,
            status: i % 5 === 0 ? 'pending_review' : 'active'
          })
        )
      );

      // Create transactions
      const transactions = await Promise.all(
        Array.from({ length: 5000 }, (_, i) =>
          testUtils.createTestTransaction({
            userId: users[i % users.length].userId,
            type: 'payment',
            amount: 29.99,
            status: 'completed'
          })
        )
      );

      const dataSetupTime = Date.now() - dataSetupStartTime;
      console.log(`Set up large dataset in ${dataSetupTime}ms`);

      // Step 2: Performance test - Dashboard metrics
      const metricsStartTime = Date.now();
      const dashboardMetrics = await adminService.getDashboardMetrics();
      const metricsTime = Date.now() - metricsStartTime;

      expect(dashboardMetrics.totalUsers).toBe(1000);
      expect(dashboardMetrics.totalListings).toBe(2000);
      expect(dashboardMetrics.totalRevenue).toBeGreaterThan(0);
      expect(metricsTime).toBeLessThan(3000);

      console.log(`Loaded dashboard metrics in ${metricsTime}ms`);

      // Step 3: Performance test - User analytics
      const analyticsStartTime = Date.now();
      const userAnalytics = await adminService.getUserAnalytics({
        groupBy: 'userType',
        period: 'monthly'
      });
      const analyticsTime = Date.now() - analyticsStartTime;

      expect(userAnalytics.byUserType).toBeDefined();
      expect(analyticsTime).toBeLessThan(2000);

      console.log(`Generated user analytics in ${analyticsTime}ms`);

      // Step 4: Performance test - Financial reports
      const financialStartTime = Date.now();
      const financialReport = await adminService.generateFinancialReport({
        startDate: Date.now() - (30 * 24 * 60 * 60 * 1000),
        endDate: Date.now(),
        groupBy: 'plan'
      });
      const financialTime = Date.now() - financialStartTime;

      expect(financialReport.totalRevenue).toBeGreaterThan(0);
      expect(financialTime).toBeLessThan(4000);

      console.log(`Generated financial report in ${financialTime}ms`);

      // Step 5: Performance test - System health
      const healthStartTime = Date.now();
      const systemHealth = await adminService.getSystemHealth();
      const healthTime = Date.now() - healthStartTime;

      expect(systemHealth.status).toBeDefined();
      expect(healthTime).toBeLessThan(1000);

      console.log(`Retrieved system health in ${healthTime}ms`);

      // Performance assertions
      expect(metricsTime).toBeLessThan(3000);
      expect(analyticsTime).toBeLessThan(2000);
      expect(financialTime).toBeLessThan(4000);
      expect(healthTime).toBeLessThan(1000);
    });

    test('should handle concurrent admin operations efficiently', async () => {
      const concurrentOperations = 50;

      // Step 1: Set up test data
      const users = await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          testUtils.createTestUser({
            userType: 'individual',
            email: `concurrent${i}@example.com`
          })
        )
      );

      // Step 2: Perform concurrent admin operations
      const operationStartTime = Date.now();
      const operationPromises = [];

      for (let i = 0; i < concurrentOperations; i++) {
        const user = users[i % users.length];
        
        // Mix different types of operations
        if (i % 5 === 0) {
          operationPromises.push(
            adminService.updateUserTier('admin-user-id', user.userId, {
              userType: 'dealer',
              capabilities: ['bulk_operations']
            })
          );
        } else if (i % 5 === 1) {
          operationPromises.push(
            adminService.getUserAnalytics({ userId: user.userId })
          );
        } else if (i % 5 === 2) {
          operationPromises.push(
            adminService.getAuditLogs({ userId: user.userId, limit: 10 })
          );
        } else if (i % 5 === 3) {
          operationPromises.push(
            adminService.getCustomerBilling(user.userId)
          );
        } else {
          operationPromises.push(
            adminService.getUserPermissions(user.userId)
          );
        }
      }

      const results = await Promise.all(operationPromises);
      const operationTime = Date.now() - operationStartTime;

      expect(results.length).toBe(concurrentOperations);
      expect(operationTime).toBeLessThan(15000); // Should complete within 15 seconds

      console.log(`Completed ${concurrentOperations} concurrent admin operations in ${operationTime}ms`);

      // Performance assertion
      expect(operationTime / concurrentOperations).toBeLessThan(300); // Less than 300ms per operation on average
    });
  });

  describe('Overall System Performance Tests', () => {
    test('should maintain performance under mixed load conditions', async () => {
      const testDuration = 30000; // 30 seconds
      const startTime = Date.now();
      const operations = [];

      // Step 1: Create base dataset
      const users = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          testUtils.createTestUser({
            userType: i % 2 === 0 ? 'dealer' : 'individual',
            email: `mixed${i}@example.com`
          })
        )
      );

      // Step 2: Run mixed operations for test duration
      const operationPromises = [];
      let operationCount = 0;

      while (Date.now() - startTime < testDuration) {
        const user = users[operationCount % users.length];
        
        // Mix of different operations
        const operationType = operationCount % 6;
        
        if (operationType === 0) {
          // Create listing
          operationPromises.push(
            listingService.createListing(user.userId, {
              title: `Mixed Load Listing ${operationCount}`,
              description: 'Mixed load test',
              price: 50000,
              location: { city: 'Test', state: 'FL', zipCode: '12345' },
              boatDetails: {
                year: 2020,
                make: 'Test',
                model: 'Model',
                length: 25,
                beam: 8,
                draft: 2,
                hullMaterial: 'fiberglass'
              },
              engines: [{
                type: 'outboard',
                manufacturer: 'Test',
                model: 'Test 250',
                horsepower: 250,
                fuelType: 'gasoline',
                hours: 100,
                year: 2020,
                condition: 'excellent',
                position: 1
              }],
              features: ['GPS'],
              images: ['test.jpg'],
              status: 'active'
            })
          );
        } else if (operationType === 1) {
          // Search listings
          operationPromises.push(
            listingService.searchListings({
              minPrice: 40000,
              maxPrice: 60000,
              limit: 20
            })
          );
        } else if (operationType === 2) {
          // Finance calculation
          operationPromises.push(
            financeService.calculateFinancing({
              boatPrice: 50000,
              downPayment: 10000,
              interestRate: 6.5,
              termMonths: 180
            })
          );
        } else if (operationType === 3) {
          // User operations
          operationPromises.push(
            userService.getUserCapabilities(user.userId)
          );
        } else if (operationType === 4) {
          // Billing operations
          operationPromises.push(
            billingService.getPaymentHistory({ userId: user.userId, limit: 10 })
          );
        } else {
          // Admin operations
          operationPromises.push(
            adminService.getAuditLogs({ userId: user.userId, limit: 5 })
          );
        }

        operationCount++;
        
        // Process operations in batches to avoid overwhelming the system
        if (operationPromises.length >= 20) {
          await Promise.all(operationPromises);
          operations.push(...operationPromises);
          operationPromises.length = 0;
        }
      }

      // Process remaining operations
      if (operationPromises.length > 0) {
        await Promise.all(operationPromises);
        operations.push(...operationPromises);
      }

      const totalTime = Date.now() - startTime;
      const throughput = operationCount / (totalTime / 1000); // Operations per second

      console.log(`Completed ${operationCount} mixed operations in ${totalTime}ms`);
      console.log(`Throughput: ${throughput.toFixed(2)} operations/second`);

      // Performance assertions
      expect(operationCount).toBeGreaterThan(100); // Should complete at least 100 operations
      expect(throughput).toBeGreaterThan(5); // Should maintain at least 5 ops/second
    });

    test('should handle memory usage efficiently with large datasets', async () => {
      const initialMemory = process.memoryUsage();
      
      // Step 1: Create large dataset
      const largeDatasetSize = 5000;
      const createdData = [];

      for (let i = 0; i < largeDatasetSize; i++) {
        const user = await testUtils.createTestUser({
          userType: 'individual',
          email: `memory${i}@example.com`
        });

        const listing = await testUtils.createTestListing({
          ownerId: user.userId,
          title: `Memory Test Listing ${i}`
        });

        createdData.push({ user, listing });

        // Check memory usage periodically
        if (i % 1000 === 0) {
          const currentMemory = process.memoryUsage();
          const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed;
          console.log(`Memory usage after ${i} items: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
        }
      }

      // Step 2: Perform operations on large dataset
      const operationStartTime = Date.now();
      
      const [
        searchResults,
        userAnalytics,
        listingStats
      ] = await Promise.all([
        listingService.searchListings({ limit: 100 }),
        adminService.getUserAnalytics({ groupBy: 'userType' }),
        adminService.getListingStatistics()
      ]);

      const operationTime = Date.now() - operationStartTime;
      const finalMemory = process.memoryUsage();
      const totalMemoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Operations on large dataset completed in ${operationTime}ms`);
      console.log(`Total memory increase: ${(totalMemoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      // Performance assertions
      expect(searchResults.length).toBe(100);
      expect(userAnalytics).toBeDefined();
      expect(listingStats).toBeDefined();
      expect(operationTime).toBeLessThan(10000);
      expect(totalMemoryIncrease).toBeLessThan(500 * 1024 * 1024); // Less than 500MB increase
    });
  });
});