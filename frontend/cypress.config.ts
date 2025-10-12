import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    env: {
      ADMIN_EMAIL: 'admin@harbotlist.com',
      ADMIN_PASSWORD: 'AdminTest123!',
      API_URL: 'http://localhost:3000'
    },
    setupNodeEvents(on, config) {
      // Database and test data management tasks
      on('task', {
        resetDatabase() {
          // Reset test database to clean state
          return require('./cypress/tasks/database').resetDatabase();
        },
        
        createTestUser(userData) {
          // Create test user in database
          return require('./cypress/tasks/database').createTestUser(userData);
        },
        
        createTestListing(listingData) {
          // Create test listing in database
          return require('./cypress/tasks/database').createTestListing(listingData);
        },
        
        waitForModeration(listingId) {
          // Wait for listing to appear in moderation queue
          return require('./cypress/tasks/database').waitForModeration(listingId);
        },
        
        approveListing({ listingId, moderatorId }) {
          // Approve listing through moderation workflow
          return require('./cypress/tasks/database').approveListing(listingId, moderatorId);
        }
      });
      
      return config;
    }
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    supportFile: 'cypress/support/component.ts',
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
  },
})