/**
 * Performance Test Runner
 * Orchestrates all performance tests and generates comprehensive reports
 * Requirements: All requirements - performance validation
 */

import { 
  PerformanceMonitor, 
  measurePerformance, 
  measureBatchPerformance,
  measureConcurrentPerformance,
  PerformanceAssertions,
  LoadTester,
  generatePerformanceReport,
  createLoadTestData
} from '../shared/performance-utils';

import { DatabaseService } from '../shared/database';
import { UserService } from '../user-service';
import { ListingService } from '../listing';
import { AdminService } from '../admin-service';
import { BillingService } from '../billing-service';
import { FinanceService } from '../finance-service';
import { testUtils } from '../shared/test-utils';

describe('Performance Test Runner', () => {
  let db: DatabaseService;
  let userService: UserService;
  let listingService: ListingService;
  let adminService: AdminService;
  let billingService: BillingService;
  let financeService: FinanceService;

  const testResults: Array<{ testName: string; metrics: any }> = [];

  beforeAll(async () => {
    // Initialize services
    db = new DatabaseService();
    userService = new UserService(db);
    listingService = new ListingService(db);
    adminService = new AdminService(db);
    billingService = new BillingService(db);
    financeService = new FinanceService(db);

    await testUtils.setupTestDatabase();
  });

  afterAll(async () => {
    // Generate and log comprehensive performance report
    const report = generatePerformanceReport(testResults);
    console.log(report);
    
    await testUtils.cleanupTestDatabase();
  });

  beforeEach(async () => {
    await testUtils.clearTestData();
  });

  describe('Database Performance Tests', () => {
    test('should measure database connection and query performance', async () => {
      const { metrics } = await measurePerformance(async () => {
        // Test basic database operations
        const operations = [];
        
        for (let i = 0; i < 100; i++) {
          operations.push(async () => {
            const user = await testUtils.createTestUser({
              email: `perf${i}@example.com`,
              userType: 'individual'
            });
            return user;
          });
        }

        const { results } = await measureBatchPerformance(operations, 'Database User Creation', 10);
        return results;
      }, 'Database Operations');

      testResults.push({ testName: 'Database Operations', metrics });

      // Assert performance requirements
      PerformanceAssertions.assertPerformanceProfile(metrics, {
        maxDuration: 10000, // 10 seconds for 100 users
        maxMemoryMB: 50
      }, 'Database Operations');
    });

    test('should measure complex query performance', async () => {
      // Setup test data
      const users = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          testUtils.createTestUser({
            email: `query${i}@example.com`,
            userType: i % 2 === 0 ? 'dealer' : 'individual'
          })
        )
      );

      const listings = await Promise.all(
        Array.from({ length: 200 }, (_, i) =>
          testUtils.createTestListing({
            ownerId: users[i % users.length].userId,
            title: `Query Test Listing ${i}`,
            price: 50000 + (i * 1000)
          })
        )
      );

      const { metrics } = await measurePerformance(async () => {
        // Test complex queries
        const [
          searchResults,
          userListings,
          priceRangeResults,
          recentListings
        ] = await Promise.all([
          listingService.searchListings({
            minPrice: 60000,
            maxPrice: 100000,
            userType: 'dealer',
            limit: 50
          }),
          listingService.getUserListings(users[0].userId),
          listingService.getListingsByPriceRange(70000, 90000),
          listingService.getRecentListings(30)
        ]);

        return { searchResults, userListings, priceRangeResults, recentListings };
      }, 'Complex Database Queries');

      testResults.push({ testName: 'Complex Database Queries', metrics });

      PerformanceAssertions.assertPerformanceProfile(metrics, {
        maxDuration: 3000, // 3 seconds for complex queries
        maxMemoryMB: 30
      }, 'Complex Database Queries');
    });
  });

  describe('Service Layer Performance Tests', () => {
    test('should measure user service performance under load', async () => {
      const loadTester = new LoadTester({
        userCount: 20,
        operationsPerUser: 10,
        rampUpTime: 2000,
        testDuration: 30000,
        maxConcurrency: 10
      });

      const { metrics } = await loadTester.runLoadTest(
        async (userIndex, operationIndex) => {
          const operations = [
            () => userService.registerUser({
              email: `load${userIndex}_${operationIndex}@example.com`,
              name: `Load Test User ${userIndex}-${operationIndex}`,
              password: 'LoadTest123!',
              userType: 'individual',
              acceptTerms: true
            }),
            () => userService.getUserCapabilities(`user-${userIndex}`),
            () => userService.getUserLimits(`user-${userIndex}`),
            () => userService.updateUserProfile(`user-${userIndex}`, {
              name: `Updated User ${userIndex}-${operationIndex}`
            })
          ];

          const operation = operations[operationIndex % operations.length];
          return await operation();
        },
        'User Service Load Test'
      );

      testResults.push({ testName: 'User Service Load Test', metrics });

      PerformanceAssertions.assertPerformanceProfile(metrics, {
        minThroughput: 5, // At least 5 operations per second
        maxMemoryMB: 100
      }, 'User Service Load Test');
    });

    test('should measure listing service performance with multi-engine listings', async () => {
      const { metrics } = await measurePerformance(async () => {
        const users = await Promise.all(
          Array.from({ length: 10 }, (_, i) =>
            testUtils.createTestUser({
              email: `listing${i}@example.com`,
              userType: 'dealer'
            })
          )
        );

        const listingOperations = users.map((user, i) => async () => {
          const engines = [];
          const engineCount = (i % 4) + 1; // 1-4 engines

          for (let e = 0; e < engineCount; e++) {
            engines.push({
              type: 'outboard',
              manufacturer: 'Performance Engine Co',
              model: `PE ${250 + (e * 50)}`,
              horsepower: 250 + (e * 50),
              fuelType: 'gasoline',
              hours: 100,
              year: 2020,
              condition: 'excellent',
              position: e + 1
            });
          }

          return await listingService.createListing(user.userId, {
            title: `Multi-Engine Performance Test ${i}`,
            description: 'Performance testing multi-engine boat',
            price: 75000 + (i * 5000),
            location: { city: 'Test City', state: 'FL', zipCode: '12345' },
            boatDetails: {
              year: 2020,
              make: 'Performance Make',
              model: `Model ${i}`,
              length: 30 + i,
              beam: 10,
              draft: 2.5,
              hullMaterial: 'fiberglass'
            },
            engines,
            features: ['GPS', 'Fish Finder'],
            images: [`perf${i}_1.jpg`, `perf${i}_2.jpg`],
            status: 'active'
          });
        });

        const { results } = await measureConcurrentPerformance(
          listingOperations,
          'Multi-Engine Listing Creation',
          5
        );

        return results;
      }, 'Multi-Engine Listing Performance');

      testResults.push({ testName: 'Multi-Engine Listing Performance', metrics });

      PerformanceAssertions.assertPerformanceProfile(metrics, {
        maxDuration: 15000, // 15 seconds for 10 multi-engine listings
        maxMemoryMB: 75
      }, 'Multi-Engine Listing Performance');
    });

    test('should measure billing service performance under transaction load', async () => {
      // Setup users with billing accounts
      const users = await Promise.all(
        Array.from({ length: 25 }, (_, i) =>
          testUtils.createTestUser({
            email: `billing${i}@example.com`,
            userType: 'premium_individual'
          })
        )
      );

      const billingAccounts = await Promise.all(
        users.map(user =>
          testUtils.createTestBillingAccount({
            userId: user.userId,
            plan: 'premium_individual',
            amount: 29.99,
            status: 'active'
          })
        )
      );

      const { metrics } = await measurePerformance(async () => {
        const transactionOperations = [];

        // Create multiple transactions per user
        for (const user of users) {
          for (let t = 0; t < 5; t++) {
            transactionOperations.push(async () => {
              return await billingService.processPayment({
                userId: user.userId,
                amount: 29.99,
                currency: 'USD',
                paymentMethod: 'card',
                description: `Performance test payment ${t + 1}`
              });
            });
          }
        }

        const { results } = await measureConcurrentPerformance(
          transactionOperations,
          'Billing Transaction Processing',
          15
        );

        return results;
      }, 'Billing Service Performance');

      testResults.push({ testName: 'Billing Service Performance', metrics });

      PerformanceAssertions.assertPerformanceProfile(metrics, {
        maxDuration: 20000, // 20 seconds for 125 transactions
        minThroughput: 6, // At least 6 transactions per second
        maxMemoryMB: 60
      }, 'Billing Service Performance');
    });

    test('should measure finance calculator performance with complex scenarios', async () => {
      const { metrics } = await measurePerformance(async () => {
        const calculationOperations = [];

        // Create various calculation scenarios
        const scenarios = [
          { boatPrice: 50000, downPayment: 10000, interestRate: 5.5, termMonths: 120 },
          { boatPrice: 75000, downPayment: 15000, interestRate: 6.0, termMonths: 180 },
          { boatPrice: 100000, downPayment: 20000, interestRate: 6.5, termMonths: 240 },
          { boatPrice: 150000, downPayment: 30000, interestRate: 7.0, termMonths: 300 },
          { boatPrice: 200000, downPayment: 40000, interestRate: 7.5, termMonths: 360 }
        ];

        for (let i = 0; i < 50; i++) {
          const scenario = scenarios[i % scenarios.length];
          calculationOperations.push(async () => {
            const calculation = await financeService.calculateFinancing({
              ...scenario,
              listingId: `listing-${i}`,
              userId: `user-${i % 10}`
            });

            // Also test saving calculation
            return await financeService.saveCalculation(calculation);
          });
        }

        const { results } = await measureBatchPerformance(
          calculationOperations,
          'Finance Calculations',
          10
        );

        return results;
      }, 'Finance Calculator Performance');

      testResults.push({ testName: 'Finance Calculator Performance', metrics });

      PerformanceAssertions.assertPerformanceProfile(metrics, {
        maxDuration: 8000, // 8 seconds for 50 calculations
        minThroughput: 6, // At least 6 calculations per second
        maxMemoryMB: 40
      }, 'Finance Calculator Performance');
    });
  });

  describe('Admin Service Performance Tests', () => {
    test('should measure admin dashboard performance with large datasets', async () => {
      // Create large dataset
      const users = await Promise.all(
        Array.from({ length: 200 }, (_, i) =>
          testUtils.createTestUser({
            email: `admin${i}@example.com`,
            userType: i % 4 === 0 ? 'premium_individual' : 
                     i % 4 === 1 ? 'premium_dealer' :
                     i % 4 === 2 ? 'dealer' : 'individual'
          })
        )
      );

      const listings = await Promise.all(
        Array.from({ length: 500 }, (_, i) =>
          testUtils.createTestListing({
            ownerId: users[i % users.length].userId,
            title: `Admin Dashboard Test ${i}`,
            status: i % 10 === 0 ? 'pending_review' : 'active'
          })
        )
      );

      const transactions = await Promise.all(
        Array.from({ length: 1000 }, (_, i) =>
          testUtils.createTestTransaction({
            userId: users[i % users.length].userId,
            type: 'payment',
            amount: 29.99,
            status: 'completed'
          })
        )
      );

      const { metrics } = await measurePerformance(async () => {
        // Test various admin dashboard operations
        const [
          dashboardMetrics,
          userAnalytics,
          listingStats,
          revenueReport,
          moderationQueue,
          systemHealth
        ] = await Promise.all([
          adminService.getDashboardMetrics(),
          adminService.getUserAnalytics({ groupBy: 'userType' }),
          adminService.getListingStatistics(),
          adminService.generateRevenueReport({
            startDate: Date.now() - (30 * 24 * 60 * 60 * 1000),
            endDate: Date.now()
          }),
          adminService.getModerationQueue({ limit: 50 }),
          adminService.getSystemHealth()
        ]);

        return {
          dashboardMetrics,
          userAnalytics,
          listingStats,
          revenueReport,
          moderationQueue,
          systemHealth
        };
      }, 'Admin Dashboard Performance');

      testResults.push({ testName: 'Admin Dashboard Performance', metrics });

      PerformanceAssertions.assertPerformanceProfile(metrics, {
        maxDuration: 5000, // 5 seconds for dashboard load
        maxMemoryMB: 80
      }, 'Admin Dashboard Performance');
    });

    test('should measure moderation workflow performance', async () => {
      // Create moderation queue
      const listings = await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          testUtils.createTestListing({
            title: `Moderation Test ${i}`,
            status: 'pending_review'
          })
        )
      );

      const moderators = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          testUtils.createTestUser({
            email: `moderator${i}@example.com`,
            role: 'content_moderator',
            permissions: ['moderate_listings']
          })
        )
      );

      const { metrics } = await measurePerformance(async () => {
        // Test moderation workflow operations
        const moderationOperations = [];

        // Assign moderation tasks
        for (let i = 0; i < listings.length; i++) {
          const listing = listings[i];
          const moderator = moderators[i % moderators.length];
          
          moderationOperations.push(async () => {
            await adminService.assignModeration(listing.listingId, moderator.userId);
            
            // Process moderation decision
            return await adminService.processModerationDecision(
              listing.listingId,
              moderator.userId,
              {
                decision: i % 10 === 0 ? 'reject' : 'approve',
                reason: i % 10 === 0 ? 'Needs improvement' : 'Meets standards',
                publicNotes: 'Performance test decision',
                internalNotes: 'Automated performance test'
              }
            );
          });
        }

        const { results } = await measureConcurrentPerformance(
          moderationOperations,
          'Moderation Workflow',
          8
        );

        return results;
      }, 'Moderation Workflow Performance');

      testResults.push({ testName: 'Moderation Workflow Performance', metrics });

      PerformanceAssertions.assertPerformanceProfile(metrics, {
        maxDuration: 25000, // 25 seconds for 100 moderation decisions
        minThroughput: 4, // At least 4 decisions per second
        maxMemoryMB: 70
      }, 'Moderation Workflow Performance');
    });
  });

  describe('End-to-End Performance Tests', () => {
    test('should measure complete user workflow performance', async () => {
      const { metrics } = await measurePerformance(async () => {
        const workflowOperations = [];

        for (let i = 0; i < 20; i++) {
          workflowOperations.push(async () => {
            // Complete user workflow: register -> create listing -> calculate finance -> moderate
            
            // 1. User registration
            const user = await userService.registerUser({
              email: `workflow${i}@example.com`,
              name: `Workflow User ${i}`,
              password: 'Workflow123!',
              userType: 'dealer',
              acceptTerms: true
            });

            // 2. Create listing
            const listing = await listingService.createListing(user.userId, {
              title: `Workflow Test Boat ${i}`,
              description: 'End-to-end workflow test',
              price: 75000,
              location: { city: 'Test City', state: 'FL', zipCode: '12345' },
              boatDetails: {
                year: 2020,
                make: 'Workflow Make',
                model: `Model ${i}`,
                length: 30,
                beam: 10,
                draft: 2.5,
                hullMaterial: 'fiberglass'
              },
              engines: [{
                type: 'outboard',
                manufacturer: 'Workflow Engine',
                model: 'WE 300',
                horsepower: 300,
                fuelType: 'gasoline',
                hours: 50,
                year: 2020,
                condition: 'excellent',
                position: 1
              }],
              features: ['GPS'],
              images: [`workflow${i}.jpg`],
              status: 'pending_review'
            });

            // 3. Finance calculation
            const calculation = await financeService.calculateFinancing({
              listingId: listing.listingId,
              userId: user.userId,
              boatPrice: 75000,
              downPayment: 15000,
              interestRate: 6.5,
              termMonths: 180
            });

            await financeService.saveCalculation(calculation);

            // 4. Moderation (approve)
            const moderator = await testUtils.createTestUser({
              role: 'content_moderator',
              email: `mod${i}@example.com`
            });

            await adminService.assignModeration(listing.listingId, moderator.userId);
            await adminService.processModerationDecision(listing.listingId, moderator.userId, {
              decision: 'approve',
              reason: 'Workflow test approval'
            });

            return { user, listing, calculation };
          });
        }

        const { results } = await measureConcurrentPerformance(
          workflowOperations,
          'Complete User Workflows',
          5
        );

        return results;
      }, 'End-to-End Workflow Performance');

      testResults.push({ testName: 'End-to-End Workflow Performance', metrics });

      PerformanceAssertions.assertPerformanceProfile(metrics, {
        maxDuration: 45000, // 45 seconds for 20 complete workflows
        minThroughput: 0.4, // At least 0.4 workflows per second
        maxMemoryMB: 120
      }, 'End-to-End Workflow Performance');
    });

    test('should measure system performance under mixed load', async () => {
      const loadTester = new LoadTester({
        userCount: 15,
        operationsPerUser: 8,
        rampUpTime: 5000,
        testDuration: 60000, // 1 minute test
        maxConcurrency: 12
      });

      const { metrics } = await loadTester.runLoadTest(
        async (userIndex, operationIndex) => {
          const operationType = operationIndex % 6;
          
          switch (operationType) {
            case 0:
              // User operations
              return await userService.registerUser({
                email: `mixed${userIndex}_${operationIndex}@example.com`,
                name: `Mixed User ${userIndex}-${operationIndex}`,
                password: 'Mixed123!',
                userType: 'individual',
                acceptTerms: true
              });
              
            case 1:
              // Listing operations
              const user = await testUtils.createTestUser({
                email: `listingowner${userIndex}_${operationIndex}@example.com`,
                userType: 'dealer'
              });
              
              return await listingService.createListing(user.userId, {
                title: `Mixed Load Listing ${userIndex}-${operationIndex}`,
                description: 'Mixed load test',
                price: 50000,
                location: { city: 'Test', state: 'FL', zipCode: '12345' },
                boatDetails: {
                  year: 2020,
                  make: 'Mixed',
                  model: 'Load',
                  length: 25,
                  beam: 8,
                  draft: 2,
                  hullMaterial: 'fiberglass'
                },
                engines: [{
                  type: 'outboard',
                  manufacturer: 'Mixed',
                  model: 'ML 250',
                  horsepower: 250,
                  fuelType: 'gasoline',
                  hours: 100,
                  year: 2020,
                  condition: 'excellent',
                  position: 1
                }],
                features: ['GPS'],
                images: ['mixed.jpg'],
                status: 'active'
              });
              
            case 2:
              // Finance calculations
              return await financeService.calculateFinancing({
                boatPrice: 60000,
                downPayment: 12000,
                interestRate: 6.0,
                termMonths: 180
              });
              
            case 3:
              // Search operations
              return await listingService.searchListings({
                minPrice: 40000,
                maxPrice: 80000,
                limit: 20
              });
              
            case 4:
              // Billing operations
              const billingUser = await testUtils.createTestUser({
                email: `billing${userIndex}_${operationIndex}@example.com`,
                userType: 'premium_individual'
              });
              
              return await billingService.processPayment({
                userId: billingUser.userId,
                amount: 29.99,
                currency: 'USD',
                paymentMethod: 'card',
                description: 'Mixed load test payment'
              });
              
            case 5:
              // Admin operations
              return await adminService.getDashboardMetrics();
              
            default:
              return null;
          }
        },
        'Mixed Load Test'
      );

      testResults.push({ testName: 'Mixed Load Test', metrics });

      PerformanceAssertions.assertPerformanceProfile(metrics, {
        minThroughput: 2, // At least 2 operations per second under mixed load
        maxMemoryMB: 150
      }, 'Mixed Load Test');
    });
  });
});