import { 
  User, 
  EnhancedUser, 
  Listing, 
  EnhancedListing, 
  BoatDetails,
  Engine,
  UserRole,
  UserStatus,
  AdminPermission
} from '../common';

describe('Type Compatibility Tests', () => {
  describe('Backward Compatibility', () => {
    it('should maintain compatibility between User and EnhancedUser', () => {
      // Base User should be assignable to EnhancedUser (with additional properties)
      const baseUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'John Doe',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: false,
        mfaEnabled: false,
        loginAttempts: 0,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      // Should be able to extend base user to enhanced user
      const enhancedUser: EnhancedUser = {
        ...baseUser,
        userType: 'individual',
        membershipDetails: {
          features: [],
          limits: {
            maxListings: 5,
            maxImages: 10,
            priorityPlacement: false,
            featuredListings: 0,
            analyticsAccess: false,
            bulkOperations: false,
            advancedSearch: false,
            premiumSupport: false
          },
          autoRenew: false
        },
        capabilities: [],
        premiumActive: false
      };

      expect(enhancedUser.id).toBe(baseUser.id);
      expect(enhancedUser.email).toBe(baseUser.email);
      expect(enhancedUser.userType).toBe('individual');
    });

    it('should maintain compatibility between Listing and EnhancedListing', () => {
      const baseListing: Listing = {
        listingId: 'listing-123',
        ownerId: 'user-456',
        title: 'Test Boat',
        description: 'A great boat',
        price: 50000,
        location: {
          city: 'Miami',
          state: 'FL'
        },
        boatDetails: {
          type: 'Sport Fishing',
          year: 2020,
          length: 30,
          condition: 'Excellent'
        },
        features: ['GPS'],
        images: ['image1.jpg'],
        thumbnails: ['thumb1.jpg'],
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Should be able to extend base listing to enhanced listing
      const enhancedListing: EnhancedListing = {
        ...baseListing,
        slug: 'test-boat-miami-fl',
        engines: [
          {
            engineId: 'engine-1',
            type: 'outboard',
            horsepower: 250,
            fuelType: 'gasoline',
            condition: 'excellent',
            position: 1
          }
        ],
        totalHorsepower: 250,
        engineConfiguration: 'single'
      };

      expect(enhancedListing.listingId).toBe(baseListing.listingId);
      expect(enhancedListing.title).toBe(baseListing.title);
      expect(enhancedListing.slug).toBe('test-boat-miami-fl');
      expect(enhancedListing.engines).toHaveLength(1);
    });

    it('should support legacy BoatDetails format', () => {
      // Legacy format with single engine string
      const legacyBoatDetails: BoatDetails = {
        type: 'Sport Fishing',
        year: 2020,
        length: 30,
        condition: 'Excellent',
        engine: 'Single 250HP Outboard',
        hours: 150
      };

      // New format with engines array
      const modernBoatDetails: BoatDetails = {
        type: 'Sport Fishing',
        year: 2020,
        length: 30,
        condition: 'Excellent',
        engines: [
          {
            engineId: 'engine-1',
            type: 'outboard',
            horsepower: 250,
            fuelType: 'gasoline',
            condition: 'excellent',
            position: 1
          }
        ],
        totalHorsepower: 250,
        engineConfiguration: 'single'
      };

      // Both should be valid BoatDetails
      expect(legacyBoatDetails.type).toBe('Sport Fishing');
      expect(legacyBoatDetails.engine).toBe('Single 250HP Outboard');
      expect(modernBoatDetails.type).toBe('Sport Fishing');
      expect(modernBoatDetails.engines).toHaveLength(1);
    });
  });

  describe('Type Constraints and Validation', () => {
    it('should enforce enum constraints for UserRole', () => {
      const validRoles: UserRole[] = [
        UserRole.USER,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
        UserRole.MODERATOR,
        UserRole.SUPPORT,
        UserRole.SALES
      ];

      validRoles.forEach(role => {
        const user: Partial<User> = { role };
        expect(Object.values(UserRole)).toContain(user.role);
      });
    });

    it('should enforce enum constraints for UserStatus', () => {
      const validStatuses: UserStatus[] = [
        UserStatus.ACTIVE,
        UserStatus.SUSPENDED,
        UserStatus.BANNED,
        UserStatus.PENDING_VERIFICATION
      ];

      validStatuses.forEach(status => {
        const user: Partial<User> = { status };
        expect(Object.values(UserStatus)).toContain(user.status);
      });
    });

    it('should enforce enum constraints for AdminPermission', () => {
      const validPermissions: AdminPermission[] = [
        AdminPermission.USER_MANAGEMENT,
        AdminPermission.CONTENT_MODERATION,
        AdminPermission.FINANCIAL_ACCESS,
        AdminPermission.SYSTEM_CONFIG,
        AdminPermission.ANALYTICS_VIEW,
        AdminPermission.AUDIT_LOG_VIEW,
        AdminPermission.TIER_MANAGEMENT,
        AdminPermission.CAPABILITY_ASSIGNMENT,
        AdminPermission.BILLING_MANAGEMENT,
        AdminPermission.SALES_MANAGEMENT
      ];

      validPermissions.forEach(permission => {
        expect(Object.values(AdminPermission)).toContain(permission);
      });
    });

    it('should enforce Engine type constraints', () => {
      const validEngineTypes: Engine['type'][] = [
        'outboard',
        'inboard',
        'sterndrive',
        'jet',
        'electric',
        'hybrid'
      ];

      const validFuelTypes: Engine['fuelType'][] = [
        'gasoline',
        'diesel',
        'electric',
        'hybrid'
      ];

      const validConditions: Engine['condition'][] = [
        'excellent',
        'good',
        'fair',
        'needs_work'
      ];

      // Test that all combinations are valid
      validEngineTypes.forEach(engineType => {
        validFuelTypes.forEach(fuelType => {
          validConditions.forEach(condition => {
            const engine: Engine = {
              engineId: 'test',
              type: engineType,
              horsepower: 100,
              fuelType,
              condition,
              position: 1
            };

            expect(engine.type).toBe(engineType);
            expect(engine.fuelType).toBe(fuelType);
            expect(engine.condition).toBe(condition);
          });
        });
      });
    });

    it('should enforce numeric constraints', () => {
      const engine: Engine = {
        engineId: 'test',
        type: 'outboard',
        horsepower: 250,
        fuelType: 'gasoline',
        condition: 'excellent',
        position: 1,
        hours: 150,
        year: 2020
      };

      // Numeric fields should be numbers
      expect(typeof engine.horsepower).toBe('number');
      expect(typeof engine.position).toBe('number');
      expect(typeof engine.hours).toBe('number');
      expect(typeof engine.year).toBe('number');

      // Position should be positive integer
      expect(engine.position).toBeGreaterThan(0);
      expect(Number.isInteger(engine.position)).toBe(true);

      // Horsepower should be positive
      expect(engine.horsepower).toBeGreaterThan(0);

      // Hours should be non-negative
      expect(engine.hours).toBeGreaterThanOrEqual(0);

      // Year should be reasonable
      expect(engine.year).toBeGreaterThan(1900);
      expect(engine.year).toBeLessThanOrEqual(new Date().getFullYear() + 1);
    });
  });

  describe('Interface Extension Validation', () => {
    it('should properly extend interfaces without breaking existing properties', () => {
      // Test that EnhancedUser properly extends User
      const enhancedUser: EnhancedUser = {
        // Base User properties
        id: 'user-123',
        email: 'test@example.com',
        name: 'John Doe',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: false,
        mfaEnabled: false,
        loginAttempts: 0,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        // Enhanced properties
        userType: 'individual',
        membershipDetails: {
          features: [],
          limits: {
            maxListings: 5,
            maxImages: 10,
            priorityPlacement: false,
            featuredListings: 0,
            analyticsAccess: false,
            bulkOperations: false,
            advancedSearch: false,
            premiumSupport: false
          },
          autoRenew: false
        },
        capabilities: [],
        premiumActive: false
      };

      // Should be assignable to base User type
      const baseUser: User = enhancedUser;
      expect(baseUser.id).toBe('user-123');
      expect(baseUser.email).toBe('test@example.com');
    });

    it('should properly extend EnhancedListing from Listing', () => {
      const enhancedListing: EnhancedListing = {
        // Base Listing properties
        listingId: 'listing-123',
        ownerId: 'user-456',
        title: 'Test Boat',
        description: 'A great boat',
        price: 50000,
        location: {
          city: 'Miami',
          state: 'FL'
        },
        boatDetails: {
          type: 'Sport Fishing',
          year: 2020,
          length: 30,
          condition: 'Excellent'
        },
        features: ['GPS'],
        images: ['image1.jpg'],
        thumbnails: ['thumb1.jpg'],
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        // Enhanced properties
        slug: 'test-boat-miami-fl',
        engines: [],
        totalHorsepower: 0,
        engineConfiguration: 'single'
      };

      // Should be assignable to base Listing type
      const baseListing: Listing = enhancedListing;
      expect(baseListing.listingId).toBe('listing-123');
      expect(baseListing.title).toBe('Test Boat');
    });
  });

  describe('Optional Property Handling', () => {
    it('should handle optional properties correctly', () => {
      // Engine with minimal required properties
      const minimalEngine: Engine = {
        engineId: 'engine-min',
        type: 'outboard',
        horsepower: 100,
        fuelType: 'gasoline',
        condition: 'good',
        position: 1
      };

      expect(minimalEngine.manufacturer).toBeUndefined();
      expect(minimalEngine.model).toBeUndefined();
      expect(minimalEngine.hours).toBeUndefined();
      expect(minimalEngine.year).toBeUndefined();
      expect(minimalEngine.specifications).toBeUndefined();

      // Engine with all optional properties
      const fullEngine: Engine = {
        engineId: 'engine-full',
        type: 'inboard',
        manufacturer: 'Yamaha',
        model: 'F250',
        horsepower: 250,
        fuelType: 'gasoline',
        hours: 150,
        year: 2022,
        condition: 'excellent',
        specifications: {
          displacement: '4.2L',
          cylinders: 6
        },
        position: 1
      };

      expect(fullEngine.manufacturer).toBe('Yamaha');
      expect(fullEngine.model).toBe('F250');
      expect(fullEngine.hours).toBe(150);
      expect(fullEngine.year).toBe(2022);
      expect(fullEngine.specifications?.displacement).toBe('4.2L');
    });

    it('should handle optional nested objects', () => {
      const userWithBilling: EnhancedUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'John Doe',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: false,
        mfaEnabled: false,
        loginAttempts: 0,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        userType: 'premium_individual',
        membershipDetails: {
          features: [],
          limits: {
            maxListings: 20,
            maxImages: 50,
            priorityPlacement: true,
            featuredListings: 3,
            analyticsAccess: true,
            bulkOperations: false,
            advancedSearch: true,
            premiumSupport: true
          },
          autoRenew: true
        },
        capabilities: [],
        premiumActive: true,
        billingInfo: {
          customerId: 'cus_123',
          billingAddress: {
            street: '123 Main St',
            city: 'Miami',
            state: 'FL',
            zipCode: '33101',
            country: 'US'
          }
        }
      };

      expect(userWithBilling.billingInfo?.customerId).toBe('cus_123');
      expect(userWithBilling.billingInfo?.billingAddress?.city).toBe('Miami');

      // User without billing info should also be valid
      const userWithoutBilling: EnhancedUser = {
        ...userWithBilling,
        billingInfo: undefined
      };

      expect(userWithoutBilling.billingInfo).toBeUndefined();
    });
  });
});