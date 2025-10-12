/**
 * Cypress Database Tasks
 * Handles database operations for end-to-end testing
 */

const { DatabaseService } = require('../../../backend/src/shared/database');
const { UserService } = require('../../../backend/src/user-service');
const { ListingService } = require('../../../backend/src/listing');
const { AdminService } = require('../../../backend/src/admin-service');

let db, userService, listingService, adminService;

// Initialize services
function initializeServices() {
  if (!db) {
    db = new DatabaseService();
    userService = new UserService(db);
    listingService = new ListingService(db);
    adminService = new AdminService(db);
  }
}

// Reset database to clean state
async function resetDatabase() {
  initializeServices();
  
  try {
    // Clear all test data
    await db.clearTable('Users');
    await db.clearTable('Listings');
    await db.clearTable('Engines');
    await db.clearTable('BillingAccounts');
    await db.clearTable('Transactions');
    await db.clearTable('FinanceCalculations');
    await db.clearTable('ModerationQueue');
    await db.clearTable('UserGroups');
    
    console.log('Database reset completed');
    return null;
  } catch (error) {
    console.error('Database reset failed:', error);
    throw error;
  }
}

// Create test user
async function createTestUser(userData) {
  initializeServices();
  
  try {
    const defaultUserData = {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      password: 'TestPass123!',
      userType: 'individual',
      status: 'active',
      acceptTerms: true,
      ...userData
    };
    
    const user = await userService.registerUser(defaultUserData);
    console.log('Test user created:', user.userId);
    return user;
  } catch (error) {
    console.error('Create test user failed:', error);
    throw error;
  }
}

// Create test listing
async function createTestListing(listingData) {
  initializeServices();
  
  try {
    // Create owner if not provided
    let ownerId = listingData.ownerId;
    if (!ownerId) {
      const owner = await createTestUser({
        userType: 'dealer',
        email: `owner-${Date.now()}@example.com`
      });
      ownerId = owner.userId;
    }
    
    const defaultListingData = {
      title: `Test Listing ${Date.now()}`,
      description: 'Test listing for end-to-end testing',
      price: 50000,
      location: {
        city: 'Test City',
        state: 'FL',
        zipCode: '12345'
      },
      boatDetails: {
        year: 2020,
        make: 'Test Make',
        model: 'Test Model',
        length: 25,
        beam: 8,
        draft: 2,
        hullMaterial: 'fiberglass'
      },
      engines: [{
        type: 'outboard',
        manufacturer: 'Test Engine Co',
        model: 'Test 250',
        horsepower: 250,
        fuelType: 'gasoline',
        hours: 100,
        year: 2020,
        condition: 'excellent',
        position: 1
      }],
      features: ['GPS', 'Fish Finder'],
      images: ['test1.jpg', 'test2.jpg'],
      status: 'active',
      ...listingData,
      ownerId
    };
    
    const listing = await listingService.createListing(ownerId, defaultListingData);
    console.log('Test listing created:', listing.listingId);
    return listing;
  } catch (error) {
    console.error('Create test listing failed:', error);
    throw error;
  }
}

// Wait for listing to appear in moderation queue
async function waitForModeration(listingId) {
  initializeServices();
  
  try {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const queue = await adminService.getModerationQueue();
      const entry = queue.find(item => item.listingId === listingId);
      
      if (entry) {
        console.log('Listing found in moderation queue:', listingId);
        return entry;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    throw new Error(`Listing ${listingId} not found in moderation queue after ${maxAttempts} attempts`);
  } catch (error) {
    console.error('Wait for moderation failed:', error);
    throw error;
  }
}

// Approve listing through moderation workflow
async function approveListing(listingId, moderatorId) {
  initializeServices();
  
  try {
    // Create moderator if not provided
    let modId = moderatorId;
    if (!modId) {
      const moderator = await createTestUser({
        role: 'content_moderator',
        permissions: ['moderate_listings'],
        email: `moderator-${Date.now()}@example.com`
      });
      modId = moderator.userId;
    }
    
    // Assign moderation
    await adminService.assignModeration(listingId, modId);
    
    // Approve listing
    const decision = {
      decision: 'approve',
      reason: 'Test approval',
      publicNotes: 'Approved for testing',
      internalNotes: 'E2E test approval'
    };
    
    await adminService.processModerationDecision(listingId, modId, decision);
    
    console.log('Listing approved:', listingId);
    return { listingId, moderatorId: modId, approved: true };
  } catch (error) {
    console.error('Approve listing failed:', error);
    throw error;
  }
}

module.exports = {
  resetDatabase,
  createTestUser,
  createTestListing,
  waitForModeration,
  approveListing
};