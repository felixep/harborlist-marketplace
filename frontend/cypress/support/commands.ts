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