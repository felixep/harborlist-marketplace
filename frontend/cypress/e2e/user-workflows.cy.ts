/**
 * End-to-End User Workflow Tests (Frontend)
 * Tests complete user journeys through the UI
 * Requirements: 1.1, 2.1, 4.1, 5.1
 */

describe('User Workflows End-to-End', () => {
  beforeEach(() => {
    // Reset database state
    cy.task('resetDatabase');
    cy.visit('/');
  });

  describe('User Registration and Tier Selection', () => {
    it('should complete individual user registration workflow', () => {
      // Step 1: Navigate to registration
      cy.get('[data-testid="register-button"]').click();
      cy.url().should('include', '/register');

      // Step 2: Fill registration form
      cy.get('[data-testid="email-input"]').type('test.individual@example.com');
      cy.get('[data-testid="name-input"]').type('Test Individual User');
      cy.get('[data-testid="password-input"]').type('SecurePass123!');
      cy.get('[data-testid="confirm-password-input"]').type('SecurePass123!');
      
      // Step 3: Select user type
      cy.get('[data-testid="user-type-individual"]').click();
      cy.get('[data-testid="terms-checkbox"]').check();

      // Step 4: Submit registration
      cy.get('[data-testid="register-submit"]').click();

      // Step 5: Verify successful registration
      cy.url().should('include', '/onboarding');
      cy.get('[data-testid="welcome-message"]').should('contain', 'Welcome, Test Individual User');
      cy.get('[data-testid="user-type-display"]').should('contain', 'Individual');
    });

    it('should complete dealer registration workflow', () => {
      // Step 1: Navigate to registration
      cy.get('[data-testid="register-button"]').click();

      // Step 2: Fill basic information
      cy.get('[data-testid="email-input"]').type('test.dealer@example.com');
      cy.get('[data-testid="name-input"]').type('Test Dealer User');
      cy.get('[data-testid="password-input"]').type('SecurePass123!');
      cy.get('[data-testid="confirm-password-input"]').type('SecurePass123!');

      // Step 3: Select dealer type
      cy.get('[data-testid="user-type-dealer"]').click();

      // Step 4: Fill dealer-specific information
      cy.get('[data-testid="business-name-input"]').should('be.visible');
      cy.get('[data-testid="business-name-input"]').type('Test Marine Sales');
      cy.get('[data-testid="business-license-input"]').type('DL123456');
      cy.get('[data-testid="terms-checkbox"]').check();

      // Step 5: Submit registration
      cy.get('[data-testid="register-submit"]').click();

      // Step 6: Verify dealer registration
      cy.url().should('include', '/onboarding');
      cy.get('[data-testid="user-type-display"]').should('contain', 'Dealer');
      cy.get('[data-testid="dealer-features"]').should('be.visible');
    });

    it('should complete premium individual signup workflow', () => {
      // Step 1: Navigate to registration
      cy.get('[data-testid="register-button"]').click();

      // Step 2: Fill basic registration
      cy.get('[data-testid="email-input"]').type('test.premium@example.com');
      cy.get('[data-testid="name-input"]').type('Test Premium User');
      cy.get('[data-testid="password-input"]').type('SecurePass123!');
      cy.get('[data-testid="confirm-password-input"]').type('SecurePass123!');
      cy.get('[data-testid="user-type-individual"]').click();

      // Step 3: Select premium option
      cy.get('[data-testid="premium-option"]').click();
      cy.get('[data-testid="premium-features"]').should('be.visible');

      // Step 4: Fill payment information
      cy.get('[data-testid="card-number"]').type('4242424242424242');
      cy.get('[data-testid="card-expiry"]').type('12/25');
      cy.get('[data-testid="card-cvc"]').type('123');
      cy.get('[data-testid="billing-name"]').type('Test Premium User');

      cy.get('[data-testid="terms-checkbox"]').check();

      // Step 5: Submit premium registration
      cy.get('[data-testid="register-submit"]').click();

      // Step 6: Verify premium signup
      cy.url().should('include', '/onboarding');
      cy.get('[data-testid="premium-badge"]').should('be.visible');
      cy.get('[data-testid="premium-features-intro"]').should('be.visible');
    });
  });

  describe('Multi-Engine Listing Creation', () => {
    beforeEach(() => {
      // Login as dealer user
      cy.login('test.dealer@example.com', 'SecurePass123!');
    });

    it('should create single engine listing', () => {
      // Step 1: Navigate to create listing
      cy.get('[data-testid="create-listing-button"]').click();
      cy.url().should('include', '/create-listing');

      // Step 2: Fill basic listing information
      cy.get('[data-testid="listing-title"]').type('Beautiful 25ft Sportfisher');
      cy.get('[data-testid="listing-description"]').type('Well-maintained sportfisher perfect for offshore fishing');
      cy.get('[data-testid="listing-price"]').type('45000');

      // Step 3: Fill boat details
      cy.get('[data-testid="boat-year"]').type('2018');
      cy.get('[data-testid="boat-make"]').type('Boston Whaler');
      cy.get('[data-testid="boat-model"]').type('Outrage 250');
      cy.get('[data-testid="boat-length"]').type('25');

      // Step 4: Add single engine
      cy.get('[data-testid="add-engine-button"]').click();
      cy.get('[data-testid="engine-type"]').select('outboard');
      cy.get('[data-testid="engine-manufacturer"]').type('Mercury');
      cy.get('[data-testid="engine-model"]').type('Verado 300');
      cy.get('[data-testid="engine-horsepower"]').type('300');
      cy.get('[data-testid="engine-fuel-type"]').select('gasoline');
      cy.get('[data-testid="engine-hours"]').type('150');

      // Step 5: Verify total horsepower calculation
      cy.get('[data-testid="total-horsepower"]').should('contain', '300');

      // Step 6: Add location
      cy.get('[data-testid="location-city"]').type('Miami');
      cy.get('[data-testid="location-state"]').select('FL');
      cy.get('[data-testid="location-zipcode"]').type('33101');

      // Step 7: Submit listing
      cy.get('[data-testid="submit-listing"]').click();

      // Step 8: Verify listing creation
      cy.get('[data-testid="listing-success-message"]').should('be.visible');
      cy.get('[data-testid="moderation-notice"]').should('contain', 'pending review');
    });

    it('should create twin engine listing', () => {
      // Step 1: Navigate to create listing
      cy.get('[data-testid="create-listing-button"]').click();

      // Step 2: Fill basic information
      cy.get('[data-testid="listing-title"]').type('Twin Engine Offshore Cruiser');
      cy.get('[data-testid="listing-description"]').type('Powerful twin engine setup for serious offshore adventures');
      cy.get('[data-testid="listing-price"]').type('125000');

      // Step 3: Fill boat details
      cy.get('[data-testid="boat-year"]').type('2020');
      cy.get('[data-testid="boat-make"]').type('Grady-White');
      cy.get('[data-testid="boat-model"]').type('Canyon 376');
      cy.get('[data-testid="boat-length"]').type('37');

      // Step 4: Add first engine
      cy.get('[data-testid="add-engine-button"]').click();
      cy.get('[data-testid="engine-0-type"]').select('outboard');
      cy.get('[data-testid="engine-0-manufacturer"]').type('Yamaha');
      cy.get('[data-testid="engine-0-model"]').type('F350C');
      cy.get('[data-testid="engine-0-horsepower"]').type('350');
      cy.get('[data-testid="engine-0-fuel-type"]').select('gasoline');

      // Step 5: Add second engine
      cy.get('[data-testid="add-engine-button"]').click();
      cy.get('[data-testid="engine-1-type"]').select('outboard');
      cy.get('[data-testid="engine-1-manufacturer"]').type('Yamaha');
      cy.get('[data-testid="engine-1-model"]').type('F350C');
      cy.get('[data-testid="engine-1-horsepower"]').type('350');
      cy.get('[data-testid="engine-1-fuel-type"]').select('gasoline');

      // Step 6: Verify twin engine configuration
      cy.get('[data-testid="total-horsepower"]').should('contain', '700');
      cy.get('[data-testid="engine-configuration"]').should('contain', 'Twin');
      cy.get('[data-testid="engine-count"]').should('contain', '2');

      // Step 7: Add location and submit
      cy.get('[data-testid="location-city"]').type('Fort Lauderdale');
      cy.get('[data-testid="location-state"]').select('FL');
      cy.get('[data-testid="location-zipcode"]').type('33301');

      cy.get('[data-testid="submit-listing"]').click();

      // Step 8: Verify twin engine listing creation
      cy.get('[data-testid="listing-success-message"]').should('be.visible');
      cy.get('[data-testid="engine-summary"]').should('contain', 'Twin 350HP Yamaha F350C');
    });

    it('should handle engine validation errors', () => {
      // Step 1: Navigate to create listing
      cy.get('[data-testid="create-listing-button"]').click();

      // Step 2: Fill basic information
      cy.get('[data-testid="listing-title"]').type('Test Validation');
      cy.get('[data-testid="listing-price"]').type('50000');

      // Step 3: Try to submit without engines
      cy.get('[data-testid="submit-listing"]').click();

      // Step 4: Verify validation error
      cy.get('[data-testid="engine-error"]').should('contain', 'At least one engine is required');

      // Step 5: Add engine with invalid data
      cy.get('[data-testid="add-engine-button"]').click();
      cy.get('[data-testid="engine-horsepower"]').type('0');

      cy.get('[data-testid="submit-listing"]').click();

      // Step 6: Verify horsepower validation
      cy.get('[data-testid="horsepower-error"]').should('contain', 'Horsepower must be greater than 0');
    });
  });

  describe('Finance Calculator Usage', () => {
    beforeEach(() => {
      // Setup test listing and login
      cy.task('createTestListing', {
        title: 'Test Boat for Finance Calculator',
        price: 75000,
        status: 'active'
      });
      cy.login('test.user@example.com', 'SecurePass123!');
    });

    it('should use finance calculator on listing page', () => {
      // Step 1: Navigate to listing
      cy.visit('/listings/test-boat-for-finance-calculator');

      // Step 2: Open finance calculator
      cy.get('[data-testid="finance-calculator-toggle"]').click();
      cy.get('[data-testid="finance-calculator"]').should('be.visible');

      // Step 3: Verify default values
      cy.get('[data-testid="boat-price"]').should('have.value', '75000');

      // Step 4: Enter loan parameters
      cy.get('[data-testid="down-payment"]').clear().type('15000');
      cy.get('[data-testid="interest-rate"]').clear().type('6.5');
      cy.get('[data-testid="loan-term"]').select('180'); // 15 years

      // Step 5: Verify real-time calculations
      cy.get('[data-testid="loan-amount"]').should('contain', '$60,000');
      cy.get('[data-testid="monthly-payment"]').should('contain', '$525.51');
      cy.get('[data-testid="total-interest"]').should('contain', '$34,591.80');
      cy.get('[data-testid="total-cost"]').should('contain', '$94,591.80');

      // Step 6: View payment schedule
      cy.get('[data-testid="payment-schedule-toggle"]').click();
      cy.get('[data-testid="payment-schedule"]').should('be.visible');
      cy.get('[data-testid="payment-row"]').should('have.length', 180);
    });

    it('should save finance calculation', () => {
      // Step 1: Navigate to listing and open calculator
      cy.visit('/listings/test-boat-for-finance-calculator');
      cy.get('[data-testid="finance-calculator-toggle"]').click();

      // Step 2: Configure calculation
      cy.get('[data-testid="down-payment"]').clear().type('20000');
      cy.get('[data-testid="interest-rate"]').clear().type('6.0');
      cy.get('[data-testid="loan-term"]').select('240'); // 20 years

      // Step 3: Save calculation
      cy.get('[data-testid="save-calculation"]').click();
      cy.get('[data-testid="save-success-message"]').should('be.visible');

      // Step 4: Navigate to saved calculations
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="saved-calculations"]').click();

      // Step 5: Verify saved calculation
      cy.get('[data-testid="calculation-item"]').should('have.length', 1);
      cy.get('[data-testid="calculation-boat-title"]').should('contain', 'Test Boat for Finance Calculator');
      cy.get('[data-testid="calculation-monthly-payment"]').should('contain', '$430.33');
    });

    it('should share finance calculation', () => {
      // Step 1: Create and save calculation
      cy.visit('/listings/test-boat-for-finance-calculator');
      cy.get('[data-testid="finance-calculator-toggle"]').click();
      cy.get('[data-testid="down-payment"]').clear().type('15000');
      cy.get('[data-testid="save-calculation"]').click();

      // Step 2: Generate share link
      cy.get('[data-testid="share-calculation"]').click();
      cy.get('[data-testid="share-url"]').should('be.visible');

      // Step 3: Copy share URL
      cy.get('[data-testid="copy-share-url"]').click();
      cy.get('[data-testid="copy-success"]').should('be.visible');

      // Step 4: Test shared calculation (logout and access)
      cy.logout();
      cy.get('[data-testid="share-url"]').then(($url) => {
        const shareUrl = $url.text();
        cy.visit(shareUrl);
      });

      // Step 5: Verify shared calculation access
      cy.get('[data-testid="shared-calculation"]').should('be.visible');
      cy.get('[data-testid="boat-title"]').should('contain', 'Test Boat for Finance Calculator');
      cy.get('[data-testid="monthly-payment"]').should('contain', '$525.51');
    });

    it('should compare multiple loan scenarios', () => {
      // Step 1: Navigate to listing
      cy.visit('/listings/test-boat-for-finance-calculator');
      cy.get('[data-testid="finance-calculator-toggle"]').click();

      // Step 2: Create first scenario
      cy.get('[data-testid="down-payment"]').clear().type('10000');
      cy.get('[data-testid="loan-term"]').select('120'); // 10 years
      cy.get('[data-testid="add-scenario"]').click();

      // Step 3: Create second scenario
      cy.get('[data-testid="down-payment"]').clear().type('15000');
      cy.get('[data-testid="loan-term"]').select('180'); // 15 years
      cy.get('[data-testid="add-scenario"]').click();

      // Step 4: Create third scenario
      cy.get('[data-testid="down-payment"]').clear().type('20000');
      cy.get('[data-testid="loan-term"]').select('240'); // 20 years
      cy.get('[data-testid="add-scenario"]').click();

      // Step 5: View comparison
      cy.get('[data-testid="compare-scenarios"]').click();
      cy.get('[data-testid="scenario-comparison"]').should('be.visible');

      // Step 6: Verify comparison data
      cy.get('[data-testid="scenario-row"]').should('have.length', 3);
      cy.get('[data-testid="best-monthly-payment"]').should('be.visible');
      cy.get('[data-testid="lowest-total-cost"]').should('be.visible');
    });
  });

  describe('Complete User Journey Integration', () => {
    it('should complete full journey from registration to listing with finance calculation', () => {
      // Step 1: Register as dealer
      cy.get('[data-testid="register-button"]').click();
      cy.get('[data-testid="email-input"]').type('journey.test@example.com');
      cy.get('[data-testid="name-input"]').type('Journey Test User');
      cy.get('[data-testid="password-input"]').type('SecurePass123!');
      cy.get('[data-testid="confirm-password-input"]').type('SecurePass123!');
      cy.get('[data-testid="user-type-dealer"]').click();
      cy.get('[data-testid="business-name-input"]').type('Journey Marine Sales');
      cy.get('[data-testid="terms-checkbox"]').check();
      cy.get('[data-testid="register-submit"]').click();

      // Step 2: Complete onboarding
      cy.url().should('include', '/onboarding');
      cy.get('[data-testid="complete-onboarding"]').click();

      // Step 3: Create listing
      cy.get('[data-testid="create-listing-button"]').click();
      cy.get('[data-testid="listing-title"]').type('Complete Journey Test Boat');
      cy.get('[data-testid="listing-description"]').type('Testing complete user journey');
      cy.get('[data-testid="listing-price"]').type('95000');

      // Add boat details
      cy.get('[data-testid="boat-year"]').type('2019');
      cy.get('[data-testid="boat-make"]').type('Sea Ray');
      cy.get('[data-testid="boat-model"]').type('Sundancer 320');
      cy.get('[data-testid="boat-length"]').type('32');

      // Add engine
      cy.get('[data-testid="add-engine-button"]').click();
      cy.get('[data-testid="engine-type"]').select('inboard');
      cy.get('[data-testid="engine-manufacturer"]').type('MerCruiser');
      cy.get('[data-testid="engine-horsepower"]').type('350');

      // Add location
      cy.get('[data-testid="location-city"]').type('Tampa');
      cy.get('[data-testid="location-state"]').select('FL');

      cy.get('[data-testid="submit-listing"]').click();

      // Step 4: Verify listing creation
      cy.get('[data-testid="listing-success-message"]').should('be.visible');
      cy.get('[data-testid="view-listing"]').click();

      // Step 5: Use finance calculator
      cy.get('[data-testid="finance-calculator-toggle"]').click();
      cy.get('[data-testid="down-payment"]').clear().type('19000');
      cy.get('[data-testid="interest-rate"]').clear().type('6.75');
      cy.get('[data-testid="loan-term"]').select('180');

      // Step 6: Save calculation
      cy.get('[data-testid="save-calculation"]').click();
      cy.get('[data-testid="save-success-message"]').should('be.visible');

      // Step 7: Verify complete journey
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="my-listings"]').click();
      cy.get('[data-testid="listing-item"]').should('have.length', 1);
      cy.get('[data-testid="listing-status"]').should('contain', 'Pending Review');

      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="saved-calculations"]').click();
      cy.get('[data-testid="calculation-item"]').should('have.length', 1);
    });
  });
});