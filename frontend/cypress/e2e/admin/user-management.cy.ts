describe('User Management Workflow', () => {
  beforeEach(() => {
    cy.mockAdminApi()
    cy.loginAsAdmin()
  })

  it('should display users list with correct information', () => {
    cy.visit('/admin/users')
    
    cy.waitForApi('@getUsersList')
    
    // Check table headers
    cy.get('[data-testid="users-table"]').should('be.visible')
    cy.get('[data-testid="user-name-header"]').should('contain', 'Name')
    cy.get('[data-testid="user-email-header"]').should('contain', 'Email')
    cy.get('[data-testid="user-status-header"]').should('contain', 'Status')
    cy.get('[data-testid="user-actions-header"]').should('contain', 'Actions')
    
    // Check user data
    cy.get('[data-testid="user-row-user-1"]').should('be.visible')
    cy.get('[data-testid="user-name-user-1"]').should('contain', 'John Doe')
    cy.get('[data-testid="user-email-user-1"]').should('contain', 'john.doe@example.com')
    cy.get('[data-testid="user-status-user-1"]').should('contain', 'Active')
    
    // Check accessibility
    cy.checkA11y()
  })

  it('should filter users by search term', () => {
    cy.visit('/admin/users')
    cy.waitForApi('@getUsersList')
    
    // Mock filtered search results
    cy.intercept('GET', '/api/admin/users*search=john*', {
      body: {
        users: [{
          id: "user-1",
          name: "John Doe",
          email: "john.doe@example.com",
          status: "active",
          role: "user",
          createdAt: "2024-01-15T10:30:00Z",
          lastLogin: "2024-09-28T08:15:00Z",
          listingsCount: 3,
          verified: true
        }],
        total: 1,
        page: 1,
        totalPages: 1
      }
    }).as('searchUsers')
    
    cy.get('[data-testid="user-search-input"]').type('john')
    cy.get('[data-testid="search-button"]').click()
    
    cy.waitForApi('@searchUsers')
    cy.get('[data-testid="user-row-user-1"]').should('be.visible')
    cy.get('[data-testid="users-table"] tbody tr').should('have.length', 1)
  })

  it('should filter users by status', () => {
    cy.visit('/admin/users')
    cy.waitForApi('@getUsersList')
    
    // Mock suspended users filter
    cy.intercept('GET', '/api/admin/users*status=suspended*', {
      body: {
        users: [{
          id: "user-2",
          name: "Jane Smith",
          email: "jane.smith@example.com",
          status: "suspended",
          role: "user",
          createdAt: "2024-02-20T14:45:00Z",
          lastLogin: "2024-09-25T16:30:00Z",
          listingsCount: 1,
          verified: false
        }],
        total: 1,
        page: 1,
        totalPages: 1
      }
    }).as('filterSuspendedUsers')
    
    cy.get('[data-testid="status-filter"]').select('suspended')
    
    cy.waitForApi('@filterSuspendedUsers')
    cy.get('[data-testid="user-row-user-2"]').should('be.visible')
    cy.get('[data-testid="user-status-user-2"]').should('contain', 'Suspended')
  })

  it('should open user detail modal', () => {
    cy.visit('/admin/users')
    cy.waitForApi('@getUsersList')
    
    // Mock user details API
    cy.intercept('GET', '/api/admin/users/user-1', {
      body: {
        id: "user-1",
        name: "John Doe",
        email: "john.doe@example.com",
        status: "active",
        role: "user",
        createdAt: "2024-01-15T10:30:00Z",
        lastLogin: "2024-09-28T08:15:00Z",
        listingsCount: 3,
        verified: true,
        profile: {
          phone: "+1-555-0123",
          location: "Miami, FL"
        },
        activity: [
          {
            action: "listing_created",
            timestamp: "2024-09-27T14:30:00Z",
            details: "Created listing: 2020 Sea Ray"
          }
        ]
      }
    }).as('getUserDetails')
    
    cy.get('[data-testid="view-user-user-1"]').click()
    
    cy.waitForApi('@getUserDetails')
    cy.get('[data-testid="user-detail-modal"]').should('be.visible')
    cy.get('[data-testid="user-detail-name"]').should('contain', 'John Doe')
    cy.get('[data-testid="user-detail-email"]').should('contain', 'john.doe@example.com')
    cy.get('[data-testid="user-activity-list"]').should('be.visible')
  })

  it('should suspend a user with reason', () => {
    cy.visit('/admin/users')
    cy.waitForApi('@getUsersList')
    
    // Mock suspend user API
    cy.intercept('PUT', '/api/admin/users/user-1/status', {
      statusCode: 200,
      body: { success: true }
    }).as('suspendUser')
    
    cy.get('[data-testid="user-actions-user-1"]').click()
    cy.get('[data-testid="suspend-user-user-1"]').click()
    
    // Fill suspension form
    cy.get('[data-testid="suspension-modal"]').should('be.visible')
    cy.get('[data-testid="suspension-reason"]').select('terms_violation')
    cy.get('[data-testid="suspension-notes"]').type('Inappropriate behavior in messages')
    cy.get('[data-testid="suspension-duration"]').select('7')
    cy.get('[data-testid="confirm-suspension"]').click()
    
    cy.waitForApi('@suspendUser')
    cy.get('[data-testid="success-toast"]').should('contain', 'User suspended successfully')
  })

  it('should reactivate a suspended user', () => {
    cy.visit('/admin/users')
    cy.waitForApi('@getUsersList')
    
    // Mock reactivate user API
    cy.intercept('PUT', '/api/admin/users/user-2/status', {
      statusCode: 200,
      body: { success: true }
    }).as('reactivateUser')
    
    cy.get('[data-testid="user-actions-user-2"]').click()
    cy.get('[data-testid="reactivate-user-user-2"]').click()
    
    // Confirm reactivation
    cy.get('[data-testid="reactivation-modal"]').should('be.visible')
    cy.get('[data-testid="reactivation-reason"]').type('Appeal approved')
    cy.get('[data-testid="confirm-reactivation"]').click()
    
    cy.waitForApi('@reactivateUser')
    cy.get('[data-testid="success-toast"]').should('contain', 'User reactivated successfully')
  })

  it('should handle pagination correctly', () => {
    cy.visit('/admin/users')
    cy.waitForApi('@getUsersList')
    
    // Mock page 2 data
    cy.intercept('GET', '/api/admin/users*page=2*', {
      body: {
        users: [
          {
            id: "user-21",
            name: "User Twenty One",
            email: "user21@example.com",
            status: "active",
            role: "user",
            createdAt: "2024-03-01T10:00:00Z",
            lastLogin: "2024-09-28T12:00:00Z",
            listingsCount: 2,
            verified: true
          }
        ],
        total: 1250,
        page: 2,
        totalPages: 63
      }
    }).as('getUsersPage2')
    
    cy.get('[data-testid="pagination-next"]').click()
    
    cy.waitForApi('@getUsersPage2')
    cy.get('[data-testid="user-row-user-21"]').should('be.visible')
    cy.get('[data-testid="current-page"]').should('contain', '2')
  })

  it('should export users data', () => {
    cy.visit('/admin/users')
    cy.waitForApi('@getUsersList')
    
    // Mock export API
    cy.intercept('GET', '/api/admin/users/export*', {
      statusCode: 200,
      headers: {
        'content-type': 'text/csv',
        'content-disposition': 'attachment; filename="users-export.csv"'
      },
      body: 'Name,Email,Status,Created At\nJohn Doe,john.doe@example.com,active,2024-01-15'
    }).as('exportUsers')
    
    cy.get('[data-testid="export-users-button"]').click()
    
    cy.waitForApi('@exportUsers')
    cy.get('[data-testid="success-toast"]').should('contain', 'Export completed')
  })
})