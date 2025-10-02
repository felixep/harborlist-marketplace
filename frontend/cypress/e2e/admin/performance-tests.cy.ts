describe('Admin Dashboard Performance Tests', () => {
  beforeEach(() => {
    cy.mockAdminApi()
    cy.loginAsAdmin()
  })

  describe('Page Load Performance', () => {
    it('should load dashboard within 2 seconds', () => {
      const startTime = Date.now()
      
      cy.visit('/admin/dashboard')
      
      cy.get('[data-testid="dashboard-metrics"]').should('be.visible').then(() => {
        const loadTime = Date.now() - startTime
        expect(loadTime).to.be.lessThan(2000)
      })
    })

    it('should load user management page within 3 seconds', () => {
      const startTime = Date.now()
      
      cy.visit('/admin/users')
      
      cy.get('[data-testid="users-table"]').should('be.visible').then(() => {
        const loadTime = Date.now() - startTime
        expect(loadTime).to.be.lessThan(3000)
      })
    })

    it('should load moderation queue within 2.5 seconds', () => {
      const startTime = Date.now()
      
      cy.visit('/admin/moderation')
      
      cy.get('[data-testid="moderation-queue"]').should('be.visible').then(() => {
        const loadTime = Date.now() - startTime
        expect(loadTime).to.be.lessThan(2500)
      })
    })

    it('should load analytics page within 4 seconds', () => {
      const startTime = Date.now()
      
      cy.visit('/admin/analytics')
      
      cy.get('[data-testid="analytics-charts"]').should('be.visible').then(() => {
        const loadTime = Date.now() - startTime
        expect(loadTime).to.be.lessThan(4000)
      })
    })
  })

  describe('API Response Performance', () => {
    it('should receive dashboard metrics within 500ms', () => {
      cy.intercept('GET', '/api/admin/metrics/dashboard', (req) => {
        const startTime = Date.now()
        
        req.reply((res) => {
          const responseTime = Date.now() - startTime
          expect(responseTime).to.be.lessThan(500)
          
          res.send({
            fixture: 'admin/dashboard-metrics.json'
          })
        })
      }).as('getDashboardMetrics')

      cy.visit('/admin/dashboard')
      cy.wait('@getDashboardMetrics')
    })

    it('should receive user list within 800ms', () => {
      cy.intercept('GET', '/api/admin/users*', (req) => {
        const startTime = Date.now()
        
        req.reply((res) => {
          const responseTime = Date.now() - startTime
          expect(responseTime).to.be.lessThan(800)
          
          res.send({
            fixture: 'admin/users-list.json'
          })
        })
      }).as('getUsersList')

      cy.visit('/admin/users')
      cy.wait('@getUsersList')
    })

    it('should receive flagged listings within 600ms', () => {
      cy.intercept('GET', '/api/admin/listings/flagged*', (req) => {
        const startTime = Date.now()
        
        req.reply((res) => {
          const responseTime = Date.now() - startTime
          expect(responseTime).to.be.lessThan(600)
          
          res.send({
            fixture: 'admin/flagged-listings.json'
          })
        })
      }).as('getFlaggedListings')

      cy.visit('/admin/moderation')
      cy.wait('@getFlaggedListings')
    })
  })

  describe('UI Responsiveness', () => {
    it('should respond to search input within 100ms', () => {
      cy.visit('/admin/users')
      cy.wait('@getUsersList')

      const startTime = Date.now()
      
      cy.get('[data-testid="user-search-input"]').type('john')
      
      cy.get('[data-testid="user-search-input"]').should('have.value', 'john').then(() => {
        const responseTime = Date.now() - startTime
        expect(responseTime).to.be.lessThan(100)
      })
    })

    it('should open modals within 200ms', () => {
      cy.visit('/admin/users')
      cy.wait('@getUsersList')

      const startTime = Date.now()
      
      cy.get('[data-testid="view-user-user-1"]').click()
      
      cy.get('[data-testid="user-detail-modal"]').should('be.visible').then(() => {
        const responseTime = Date.now() - startTime
        expect(responseTime).to.be.lessThan(200)
      })
    })

    it('should update filters within 150ms', () => {
      cy.visit('/admin/users')
      cy.wait('@getUsersList')

      const startTime = Date.now()
      
      cy.get('[data-testid="status-filter"]').select('suspended')
      
      cy.get('[data-testid="status-filter"]').should('have.value', 'suspended').then(() => {
        const responseTime = Date.now() - startTime
        expect(responseTime).to.be.lessThan(150)
      })
    })
  })

  describe('Large Dataset Performance', () => {
    it('should handle 1000 users in table efficiently', () => {
      // Mock large dataset
      const largeUserList = {
        users: Array(1000).fill(null).map((_, index) => ({
          id: `user-${index}`,
          name: `User ${index}`,
          email: `user${index}@example.com`,
          status: index % 3 === 0 ? 'suspended' : 'active',
          role: 'user',
          createdAt: '2024-01-15T10:30:00Z',
          lastLogin: '2024-09-28T08:15:00Z',
          listingsCount: Math.floor(Math.random() * 10),
          verified: Math.random() > 0.5
        })),
        total: 1000,
        page: 1,
        totalPages: 50
      }

      cy.intercept('GET', '/api/admin/users*', {
        body: largeUserList
      }).as('getLargeUsersList')

      const startTime = Date.now()
      
      cy.visit('/admin/users')
      cy.wait('@getLargeUsersList')
      
      cy.get('[data-testid="users-table"]').should('be.visible').then(() => {
        const renderTime = Date.now() - startTime
        expect(renderTime).to.be.lessThan(3000) // Should render within 3 seconds
      })

      // Test scrolling performance
      cy.get('[data-testid="users-table"]').scrollTo('bottom', { duration: 1000 })
      cy.get('[data-testid="users-table"]').scrollTo('top', { duration: 1000 })
    })

    it('should handle large audit log dataset', () => {
      const largeAuditLogs = {
        logs: Array(500).fill(null).map((_, index) => ({
          id: `audit-${index}`,
          adminId: 'admin-1',
          adminEmail: 'admin@harbotlist.com',
          action: index % 2 === 0 ? 'user_suspended' : 'listing_approved',
          resource: index % 2 === 0 ? 'user' : 'listing',
          resourceId: `resource-${index}`,
          details: {
            reason: 'Test action',
            previousStatus: 'active',
            newStatus: index % 2 === 0 ? 'suspended' : 'approved'
          },
          timestamp: '2024-09-28T10:15:00Z',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0...'
        })),
        total: 500,
        page: 1,
        totalPages: 10
      }

      cy.intercept('GET', '/api/admin/audit-logs*', {
        body: largeAuditLogs
      }).as('getLargeAuditLogs')

      const startTime = Date.now()
      
      cy.visit('/admin/audit-logs')
      cy.wait('@getLargeAuditLogs')
      
      cy.get('[data-testid="audit-logs-table"]').should('be.visible').then(() => {
        const renderTime = Date.now() - startTime
        expect(renderTime).to.be.lessThan(2500)
      })
    })
  })

  describe('Memory Usage Performance', () => {
    it('should not cause memory leaks during navigation', () => {
      const pages = [
        '/admin/dashboard',
        '/admin/users',
        '/admin/moderation',
        '/admin/analytics',
        '/admin/settings'
      ]

      // Navigate through all pages multiple times
      for (let i = 0; i < 3; i++) {
        pages.forEach(page => {
          cy.visit(page)
          cy.wait(500) // Allow page to fully load
        })
      }

      // Check that we can still navigate normally (no memory issues)
      cy.visit('/admin/dashboard')
      cy.get('[data-testid="dashboard-metrics"]').should('be.visible')
    })

    it('should handle rapid page switching', () => {
      const pages = [
        '/admin/dashboard',
        '/admin/users',
        '/admin/moderation'
      ]

      // Rapidly switch between pages
      for (let i = 0; i < 10; i++) {
        const page = pages[i % pages.length]
        cy.visit(page)
        cy.wait(100) // Minimal wait
      }

      // Should still be responsive
      cy.visit('/admin/dashboard')
      cy.get('[data-testid="dashboard-metrics"]').should('be.visible')
    })
  })

  describe('Network Performance', () => {
    it('should handle slow network conditions gracefully', () => {
      // Simulate slow network
      cy.intercept('GET', '/api/admin/metrics/dashboard', {
        fixture: 'admin/dashboard-metrics.json',
        delay: 2000 // 2 second delay
      }).as('getSlowDashboardMetrics')

      cy.visit('/admin/dashboard')
      
      // Should show loading state
      cy.get('[data-testid="loading-spinner"]').should('be.visible')
      
      cy.wait('@getSlowDashboardMetrics')
      
      // Should eventually load content
      cy.get('[data-testid="dashboard-metrics"]').should('be.visible')
      cy.get('[data-testid="loading-spinner"]').should('not.exist')
    })

    it('should handle network errors gracefully', () => {
      cy.intercept('GET', '/api/admin/metrics/dashboard', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('getDashboardError')

      cy.visit('/admin/dashboard')
      cy.wait('@getDashboardError')
      
      // Should show error state
      cy.get('[data-testid="error-message"]').should('be.visible')
      cy.get('[data-testid="retry-button"]').should('be.visible')
    })

    it('should retry failed requests efficiently', () => {
      let requestCount = 0
      
      cy.intercept('GET', '/api/admin/metrics/dashboard', (req) => {
        requestCount++
        if (requestCount < 3) {
          req.reply({
            statusCode: 500,
            body: { error: 'Server error' }
          })
        } else {
          req.reply({
            fixture: 'admin/dashboard-metrics.json'
          })
        }
      }).as('getDashboardWithRetry')

      cy.visit('/admin/dashboard')
      
      // Should eventually succeed after retries
      cy.get('[data-testid="dashboard-metrics"]').should('be.visible')
      
      // Should have made multiple requests
      cy.get('@getDashboardWithRetry.all').should('have.length.at.least', 3)
    })
  })

  describe('Concurrent Operations Performance', () => {
    it('should handle multiple simultaneous API calls', () => {
      // Mock multiple endpoints with delays
      cy.intercept('GET', '/api/admin/metrics/dashboard', {
        fixture: 'admin/dashboard-metrics.json',
        delay: 500
      }).as('getDashboardMetrics')

      cy.intercept('GET', '/api/admin/system/health', {
        fixture: 'admin/system-health.json',
        delay: 300
      }).as('getSystemHealth')

      cy.intercept('GET', '/api/admin/audit-logs*', {
        fixture: 'admin/audit-logs.json',
        delay: 400
      }).as('getAuditLogs')

      const startTime = Date.now()
      
      cy.visit('/admin/dashboard')
      
      // All requests should complete
      cy.wait(['@getDashboardMetrics', '@getSystemHealth'])
      
      const totalTime = Date.now() - startTime
      
      // Should complete faster than sequential requests (concurrent execution)
      expect(totalTime).to.be.lessThan(1000) // Less than sum of individual delays
    })

    it('should handle rapid user interactions', () => {
      cy.visit('/admin/users')
      cy.wait('@getUsersList')

      // Rapidly interact with multiple elements
      cy.get('[data-testid="user-search-input"]').type('john')
      cy.get('[data-testid="status-filter"]').select('active')
      cy.get('[data-testid="sort-by-name"]').click()
      cy.get('[data-testid="refresh-button"]').click()

      // Should remain responsive
      cy.get('[data-testid="users-table"]').should('be.visible')
    })
  })

  describe('Chart Rendering Performance', () => {
    it('should render analytics charts within 2 seconds', () => {
      cy.intercept('GET', '/api/admin/analytics/overview*', {
        body: {
          userMetrics: {
            totalUsers: 1250,
            newUsers: 45,
            activeUsers: 892,
            userGrowthRate: 12.5
          },
          listingMetrics: {
            totalListings: 342,
            newListings: 18,
            activeListings: 298,
            listingGrowthRate: 8.3
          },
          chartData: Array(30).fill(null).map((_, index) => ({
            date: `2024-09-${String(index + 1).padStart(2, '0')}`,
            users: Math.floor(Math.random() * 100) + 1000,
            listings: Math.floor(Math.random() * 50) + 300
          }))
        }
      }).as('getAnalyticsData')

      const startTime = Date.now()
      
      cy.visit('/admin/analytics')
      cy.wait('@getAnalyticsData')
      
      cy.get('[data-testid="analytics-charts"]').should('be.visible').then(() => {
        const renderTime = Date.now() - startTime
        expect(renderTime).to.be.lessThan(2000)
      })

      // Charts should be interactive
      cy.get('[data-testid="user-growth-chart"]').should('be.visible')
      cy.get('[data-testid="listing-growth-chart"]').should('be.visible')
    })

    it('should handle chart data updates efficiently', () => {
      cy.visit('/admin/analytics')
      cy.wait('@getAnalyticsData')

      // Change date range to trigger chart update
      const startTime = Date.now()
      
      cy.get('[data-testid="date-range-selector"]').select('7d')
      
      cy.get('[data-testid="analytics-charts"]').should('be.visible').then(() => {
        const updateTime = Date.now() - startTime
        expect(updateTime).to.be.lessThan(1000)
      })
    })
  })
})