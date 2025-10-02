describe('Content Moderation Workflow', () => {
  beforeEach(() => {
    cy.mockAdminApi()
    cy.loginAsAdmin()
  })

  it('should display flagged listings queue', () => {
    cy.visit('/admin/moderation')
    
    cy.waitForApi('@getFlaggedListings')
    
    // Check moderation queue
    cy.get('[data-testid="moderation-queue"]').should('be.visible')
    cy.get('[data-testid="flagged-listing-listing-1"]').should('be.visible')
    cy.get('[data-testid="listing-title-listing-1"]').should('contain', '2020 Sea Ray Sundancer')
    cy.get('[data-testid="flag-reason-listing-1"]').should('contain', 'inappropriate_content')
    
    // Check accessibility
    cy.checkA11y()
  })

  it('should filter flagged listings by reason', () => {
    cy.visit('/admin/moderation')
    cy.waitForApi('@getFlaggedListings')
    
    // Mock filtered results
    cy.intercept('GET', '/api/admin/listings/flagged*reason=suspicious_pricing*', {
      body: {
        listings: [{
          id: "listing-2",
          title: "1995 Boston Whaler",
          seller: {
            id: "user-5",
            name: "Alice Johnson",
            email: "alice.johnson@example.com"
          },
          flags: [{
            id: "flag-2",
            reason: "suspicious_pricing",
            description: "Price seems too low for this model",
            reportedBy: "system",
            reportedAt: "2024-09-26T15:30:00Z"
          }],
          status: "flagged",
          createdAt: "2024-09-24T09:15:00Z",
          price: 5000,
          location: "Boston, MA"
        }],
        total: 1
      }
    }).as('filterByReason')
    
    cy.get('[data-testid="flag-reason-filter"]').select('suspicious_pricing')
    
    cy.waitForApi('@filterByReason')
    cy.get('[data-testid="flagged-listing-listing-2"]').should('be.visible')
    cy.get('[data-testid="flag-reason-listing-2"]').should('contain', 'suspicious_pricing')
  })

  it('should open listing detail view for moderation', () => {
    cy.visit('/admin/moderation')
    cy.waitForApi('@getFlaggedListings')
    
    // Mock listing details
    cy.intercept('GET', '/api/admin/listings/listing-1', {
      body: {
        id: "listing-1",
        title: "2020 Sea Ray Sundancer",
        description: "Beautiful boat in excellent condition",
        price: 85000,
        location: "Miami, FL",
        seller: {
          id: "user-3",
          name: "Bob Wilson",
          email: "bob.wilson@example.com"
        },
        images: [
          "https://example.com/boat1.jpg",
          "https://example.com/boat2.jpg"
        ],
        specifications: {
          year: 2020,
          make: "Sea Ray",
          model: "Sundancer",
          length: "35 ft"
        },
        flags: [{
          id: "flag-1",
          reason: "inappropriate_content",
          description: "Contains inappropriate language",
          reportedBy: "user-4",
          reportedAt: "2024-09-27T10:00:00Z"
        }],
        status: "flagged",
        createdAt: "2024-09-25T12:00:00Z"
      }
    }).as('getListingDetails')
    
    cy.get('[data-testid="review-listing-listing-1"]').click()
    
    cy.waitForApi('@getListingDetails')
    cy.get('[data-testid="listing-detail-modal"]').should('be.visible')
    cy.get('[data-testid="listing-detail-title"]').should('contain', '2020 Sea Ray Sundancer')
    cy.get('[data-testid="listing-detail-price"]').should('contain', '$85,000')
    cy.get('[data-testid="flag-details"]').should('be.visible')
  })

  it('should approve a flagged listing', () => {
    cy.visit('/admin/moderation')
    cy.waitForApi('@getFlaggedListings')
    
    // Mock moderation action
    cy.intercept('PUT', '/api/admin/listings/listing-1/moderate', {
      statusCode: 200,
      body: { success: true }
    }).as('approveListing')
    
    cy.get('[data-testid="review-listing-listing-1"]').click()
    cy.get('[data-testid="listing-detail-modal"]').should('be.visible')
    
    cy.get('[data-testid="approve-listing"]').click()
    
    // Confirm approval
    cy.get('[data-testid="moderation-confirmation-modal"]').should('be.visible')
    cy.get('[data-testid="moderation-notes"]').type('Content reviewed and approved')
    cy.get('[data-testid="notify-user-checkbox"]').check()
    cy.get('[data-testid="confirm-moderation"]').click()
    
    cy.waitForApi('@approveListing')
    cy.get('[data-testid="success-toast"]').should('contain', 'Listing approved successfully')
  })

  it('should reject a flagged listing', () => {
    cy.visit('/admin/moderation')
    cy.waitForApi('@getFlaggedListings')
    
    // Mock rejection action
    cy.intercept('PUT', '/api/admin/listings/listing-1/moderate', {
      statusCode: 200,
      body: { success: true }
    }).as('rejectListing')
    
    cy.get('[data-testid="review-listing-listing-1"]').click()
    cy.get('[data-testid="listing-detail-modal"]').should('be.visible')
    
    cy.get('[data-testid="reject-listing"]').click()
    
    // Fill rejection form
    cy.get('[data-testid="moderation-confirmation-modal"]').should('be.visible')
    cy.get('[data-testid="rejection-reason"]').select('inappropriate_content')
    cy.get('[data-testid="moderation-notes"]').type('Contains inappropriate language that violates community guidelines')
    cy.get('[data-testid="notify-user-checkbox"]').check()
    cy.get('[data-testid="confirm-moderation"]').click()
    
    cy.waitForApi('@rejectListing')
    cy.get('[data-testid="success-toast"]').should('contain', 'Listing rejected successfully')
  })

  it('should request changes to a flagged listing', () => {
    cy.visit('/admin/moderation')
    cy.waitForApi('@getFlaggedListings')
    
    // Mock request changes action
    cy.intercept('PUT', '/api/admin/listings/listing-1/moderate', {
      statusCode: 200,
      body: { success: true }
    }).as('requestChanges')
    
    cy.get('[data-testid="review-listing-listing-1"]').click()
    cy.get('[data-testid="listing-detail-modal"]').should('be.visible')
    
    cy.get('[data-testid="request-changes-listing"]').click()
    
    // Fill change request form
    cy.get('[data-testid="moderation-confirmation-modal"]').should('be.visible')
    cy.get('[data-testid="change-request-category"]').select('description')
    cy.get('[data-testid="moderation-notes"]').type('Please remove inappropriate language from the description')
    cy.get('[data-testid="notify-user-checkbox"]').check()
    cy.get('[data-testid="confirm-moderation"]').click()
    
    cy.waitForApi('@requestChanges')
    cy.get('[data-testid="success-toast"]').should('contain', 'Change request sent successfully')
  })

  it('should handle bulk moderation actions', () => {
    cy.visit('/admin/moderation')
    cy.waitForApi('@getFlaggedListings')
    
    // Mock bulk action
    cy.intercept('POST', '/api/admin/listings/bulk-moderate', {
      statusCode: 200,
      body: { 
        success: true,
        processed: 2,
        failed: 0
      }
    }).as('bulkModerate')
    
    // Select multiple listings
    cy.get('[data-testid="select-listing-listing-1"]').check()
    cy.get('[data-testid="select-listing-listing-2"]').check()
    
    // Perform bulk action
    cy.get('[data-testid="bulk-actions-dropdown"]').select('approve')
    cy.get('[data-testid="execute-bulk-action"]').click()
    
    // Confirm bulk action
    cy.get('[data-testid="bulk-confirmation-modal"]').should('be.visible')
    cy.get('[data-testid="bulk-notes"]').type('Bulk approval after review')
    cy.get('[data-testid="confirm-bulk-action"]').click()
    
    cy.waitForApi('@bulkModerate')
    cy.get('[data-testid="success-toast"]').should('contain', '2 listings processed successfully')
  })

  it('should display moderation statistics', () => {
    cy.visit('/admin/moderation')
    
    // Mock moderation stats
    cy.intercept('GET', '/api/admin/moderation/stats', {
      body: {
        totalFlagged: 15,
        pendingReview: 8,
        approvedToday: 12,
        rejectedToday: 3,
        averageReviewTime: 45
      }
    }).as('getModerationStats')
    
    cy.waitForApi('@getModerationStats')
    
    cy.get('[data-testid="moderation-stats"]').should('be.visible')
    cy.get('[data-testid="total-flagged-stat"]').should('contain', '15')
    cy.get('[data-testid="pending-review-stat"]').should('contain', '8')
    cy.get('[data-testid="approved-today-stat"]').should('contain', '12')
    cy.get('[data-testid="rejected-today-stat"]').should('contain', '3')
  })
})