/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login as admin user
       * @example cy.loginAsAdmin()
       */
      loginAsAdmin(): Chainable<void>
      
      /**
       * Custom command to logout admin user
       * @example cy.logoutAdmin()
       */
      logoutAdmin(): Chainable<void>
      
      /**
       * Custom command to wait for API response
       * @example cy.waitForApi('@getUsersApi')
       */
      waitForApi(alias: string): Chainable<void>
      
      /**
       * Custom command to check accessibility
       * @example cy.checkA11y()
       */
      checkA11y(): Chainable<void>
      
      /**
       * Custom command to mock admin API responses
       * @example cy.mockAdminApi()
       */
      mockAdminApi(): Chainable<void>

      /**
       * Custom command to login as regular user
       * @example cy.login('user@example.com', 'password')
       */
      login(email: string, password: string): Chainable<void>
      
      /**
       * Custom command to logout regular user
       * @example cy.logout()
       */
      logout(): Chainable<void>
      
      /**
       * Custom command to create test user
       * @example cy.createTestUser({email: 'test@example.com', userType: 'individual'})
       */
      createTestUser(userData: any): Chainable<any>
      
      /**
       * Custom command to create test listing
       * @example cy.createTestListing({title: 'Test Boat', price: 50000})
       */
      createTestListing(listingData: any): Chainable<any>
      
      /**
       * Custom command to reset database
       * @example cy.resetDatabase()
       */
      resetDatabase(): Chainable<void>
      
      /**
       * Custom command to wait for moderation
       * @example cy.waitForModeration('listing-id')
       */
      waitForModeration(listingId: string): Chainable<void>
      
      /**
       * Custom command to approve listing
       * @example cy.approveListing('listing-id', 'moderator-id')
       */
      approveListing(listingId: string, moderatorId: string): Chainable<void>
    }
  }
}

// Admin login command
Cypress.Commands.add('loginAsAdmin', () => {
  cy.session('admin-session', () => {
    cy.visit('/admin/login')
    cy.get('[data-testid="admin-email-input"]').type(Cypress.env('ADMIN_EMAIL'))
    cy.get('[data-testid="admin-password-input"]').type(Cypress.env('ADMIN_PASSWORD'))
    cy.get('[data-testid="admin-login-button"]').click()
    cy.url().should('include', '/admin/dashboard')
    cy.get('[data-testid="admin-header"]').should('be.visible')
  })
})

// Admin logout command
Cypress.Commands.add('logoutAdmin', () => {
  cy.get('[data-testid="admin-user-menu"]').click()
  cy.get('[data-testid="admin-logout-button"]').click()
  cy.url().should('include', '/admin/login')
})

// Wait for API command
Cypress.Commands.add('waitForApi', (alias: string) => {
  cy.wait(alias).then((interception) => {
    expect(interception.response?.statusCode).to.be.oneOf([200, 201, 204])
  })
})

// Accessibility check command
Cypress.Commands.add('checkA11y', () => {
  cy.injectAxe()
  cy.checkA11y(undefined, {
    rules: {
      'color-contrast': { enabled: false }, // Disable for now due to design system
    }
  })
})

// Mock admin API responses
Cypress.Commands.add('mockAdminApi', () => {
  // Mock dashboard metrics
  cy.intercept('GET', '/api/admin/metrics/dashboard', {
    fixture: 'admin/dashboard-metrics.json'
  }).as('getDashboardMetrics')
  
  // Mock users list
  cy.intercept('GET', '/api/admin/users*', {
    fixture: 'admin/users-list.json'
  }).as('getUsersList')
  
  // Mock listings moderation queue
  cy.intercept('GET', '/api/admin/listings/flagged*', {
    fixture: 'admin/flagged-listings.json'
  }).as('getFlaggedListings')
  
  // Mock system health
  cy.intercept('GET', '/api/admin/system/health', {
    fixture: 'admin/system-health.json'
  }).as('getSystemHealth')
  
  // Mock audit logs
  cy.intercept('GET', '/api/admin/audit-logs*', {
    fixture: 'admin/audit-logs.json'
  }).as('getAuditLogs')
})

// User workflow commands
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="login-submit"]').click();
    cy.url().should('not.include', '/login');
  });
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/');
});

Cypress.Commands.add('createTestUser', (userData: any) => {
  return cy.task('createTestUser', userData);
});

Cypress.Commands.add('createTestListing', (listingData: any) => {
  return cy.task('createTestListing', listingData);
});

Cypress.Commands.add('resetDatabase', () => {
  return cy.task('resetDatabase');
});

Cypress.Commands.add('waitForModeration', (listingId: string) => {
  return cy.task('waitForModeration', listingId);
});

Cypress.Commands.add('approveListing', (listingId: string, moderatorId: string) => {
  return cy.task('approveListing', { listingId, moderatorId });
});