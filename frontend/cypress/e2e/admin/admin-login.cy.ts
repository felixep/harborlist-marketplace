describe('Admin Login Flow', () => {
  beforeEach(() => {
    cy.mockAdminApi()
  })

  it('should display login form correctly', () => {
    cy.visit('/admin/login')
    
    // Check form elements
    cy.get('[data-testid="admin-login-form"]').should('be.visible')
    cy.get('[data-testid="admin-email-input"]').should('be.visible')
    cy.get('[data-testid="admin-password-input"]').should('be.visible')
    cy.get('[data-testid="admin-login-button"]').should('be.visible')
    
    // Check accessibility
    cy.checkA11y()
  })

  it('should show validation errors for empty fields', () => {
    cy.visit('/admin/login')
    
    cy.get('[data-testid="admin-login-button"]').click()
    
    cy.get('[data-testid="email-error"]').should('contain', 'Email is required')
    cy.get('[data-testid="password-error"]').should('contain', 'Password is required')
  })

  it('should show validation error for invalid email format', () => {
    cy.visit('/admin/login')
    
    cy.get('[data-testid="admin-email-input"]').type('invalid-email')
    cy.get('[data-testid="admin-password-input"]').type('password123')
    cy.get('[data-testid="admin-login-button"]').click()
    
    cy.get('[data-testid="email-error"]').should('contain', 'Please enter a valid email')
  })

  it('should successfully login with valid credentials', () => {
    // Mock successful login response
    cy.intercept('POST', '/api/admin/auth/login', {
      statusCode: 200,
      body: {
        token: 'mock-jwt-token',
        user: {
          id: 'admin-1',
          email: 'admin@harbotlist.com',
          name: 'Admin User',
          role: 'admin'
        },
        permissions: ['user_management', 'content_moderation', 'analytics_view']
      }
    }).as('adminLogin')

    cy.visit('/admin/login')
    
    cy.get('[data-testid="admin-email-input"]').type(Cypress.env('ADMIN_EMAIL'))
    cy.get('[data-testid="admin-password-input"]').type(Cypress.env('ADMIN_PASSWORD'))
    cy.get('[data-testid="admin-login-button"]').click()
    
    cy.waitForApi('@adminLogin')
    cy.url().should('include', '/admin/dashboard')
    cy.get('[data-testid="admin-header"]').should('be.visible')
  })

  it('should show error message for invalid credentials', () => {
    cy.intercept('POST', '/api/admin/auth/login', {
      statusCode: 401,
      body: {
        error: 'Invalid credentials'
      }
    }).as('adminLoginFailed')

    cy.visit('/admin/login')
    
    cy.get('[data-testid="admin-email-input"]').type('wrong@email.com')
    cy.get('[data-testid="admin-password-input"]').type('wrongpassword')
    cy.get('[data-testid="admin-login-button"]').click()
    
    cy.waitForApi('@adminLoginFailed')
    cy.get('[data-testid="login-error"]').should('contain', 'Invalid credentials')
  })

  it('should redirect to dashboard if already authenticated', () => {
    // Mock authenticated state
    cy.window().then((win) => {
      win.localStorage.setItem('admin-token', 'mock-jwt-token')
      win.localStorage.setItem('admin-user', JSON.stringify({
        id: 'admin-1',
        email: 'admin@harbotlist.com',
        name: 'Admin User',
        role: 'admin'
      }))
    })

    cy.visit('/admin/login')
    cy.url().should('include', '/admin/dashboard')
  })

  it('should handle session timeout', () => {
    cy.loginAsAdmin()
    
    // Mock expired token response
    cy.intercept('GET', '/api/admin/metrics/dashboard', {
      statusCode: 401,
      body: { error: 'Token expired' }
    }).as('tokenExpired')

    cy.visit('/admin/dashboard')
    cy.waitForApi('@tokenExpired')
    
    // Should redirect to login
    cy.url().should('include', '/admin/login')
    cy.get('[data-testid="session-expired-message"]').should('be.visible')
  })
})