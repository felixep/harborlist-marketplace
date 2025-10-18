import { 
  EnhancedUser, 
  SalesUser, 
  UserTier, 
  TierFeature, 
  UserLimits, 
  UserCapability,
  UserRole, 
  UserStatus, 
  AdminPermission 
} from '../common';

describe('User Management Types', () => {
  describe('User Enums', () => {
    it('should validate UserRole enum values', () => {
      const expectedRoles = ['user', 'admin', 'super_admin', 'moderator', 'support', 'sales'];
      const actualRoles = Object.values(UserRole);
      
      expect(actualRoles).toEqual(expectedRoles);
      expect(UserRole.USER).toBe('user');
      expect(UserRole.ADMIN).toBe('admin');
      expect(UserRole.SUPER_ADMIN).toBe('super_admin');
      expect(UserRole.MODERATOR).toBe('moderator');
      expect(UserRole.SUPPORT).toBe('support');
      expect(UserRole.SALES).toBe('sales');
    });

    it('should validate UserStatus enum values', () => {
      const expectedStatuses = ['active', 'suspended', 'banned', 'pending_verification'];
      const actualStatuses = Object.values(UserStatus);
      
      expect(actualStatuses).toEqual(expectedStatuses);
      expect(UserStatus.ACTIVE).toBe('active');
      expect(UserStatus.SUSPENDED).toBe('suspended');
      expect(UserStatus.BANNED).toBe('banned');
      expect(UserStatus.PENDING_VERIFICATION).toBe('pending_verification');
    });

    it('should validate AdminPermission enum values', () => {
      const expectedPermissions = [
        'user_management',
        'content_moderation',
        'financial_access',
        'system_config',
        'analytics_view',
        'audit_log_view',
        'tier_management',
        'capability_assignment',
        'billing_management',
        'sales_management'
      ];
      const actualPermissions = Object.values(AdminPermission);
      
      expect(actualPermissions).toEqual(expectedPermissions);
      expect(AdminPermission.USER_MANAGEMENT).toBe('user_management');
      expect(AdminPermission.TIER_MANAGEMENT).toBe('tier_management');
      expect(AdminPermission.BILLING_MANAGEMENT).toBe('billing_management');
    });
  });

  describe('UserLimits Interface', () => {
    it('should validate UserLimits structure', () => {
      const userLimits: UserLimits = {
        maxListings: 10,
        maxImages: 20,
        priorityPlacement: true,
        featuredListings: 2,
        analyticsAccess: true,
        bulkOperations: false,
        advancedSearch: true,
        premiumSupport: false
      };

      expect(userLimits.maxListings).toBe(10);
      expect(userLimits.maxImages).toBe(20);
      expect(userLimits.priorityPlacement).toBe(true);
      expect(userLimits.featuredListings).toBe(2);
      expect(userLimits.analyticsAccess).toBe(true);
      expect(userLimits.bulkOperations).toBe(false);
      expect(userLimits.advancedSearch).toBe(true);
      expect(userLimits.premiumSupport).toBe(false);
    });
  });

  describe('UserCapability Interface', () => {
    it('should validate UserCapability structure', () => {
      const capability: UserCapability = {
        feature: 'premium_listings',
        enabled: true,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        grantedBy: 'admin-123',
        grantedAt: Date.now(),
        metadata: {
          reason: 'Premium upgrade',
          plan: 'premium_individual'
        }
      };

      expect(capability.feature).toBe('premium_listings');
      expect(capability.enabled).toBe(true);
      expect(typeof capability.expiresAt).toBe('number');
      expect(capability.grantedBy).toBe('admin-123');
      expect(typeof capability.grantedAt).toBe('number');
      expect(capability.metadata?.reason).toBe('Premium upgrade');
    });

    it('should support capabilities without expiration', () => {
      const permanentCapability: UserCapability = {
        feature: 'basic_listings',
        enabled: true,
        grantedBy: 'system',
        grantedAt: Date.now()
      };

      expect(permanentCapability.expiresAt).toBeUndefined();
      expect(permanentCapability.metadata).toBeUndefined();
    });
  });

  describe('TierFeature Interface', () => {
    it('should validate TierFeature structure', () => {
      const tierFeature: TierFeature = {
        featureId: 'priority_placement',
        name: 'Priority Placement',
        description: 'Your listings appear higher in search results',
        enabled: true,
        limits: {
          maxPriorityListings: 5,
          boostDuration: 7
        }
      };

      expect(tierFeature.featureId).toBe('priority_placement');
      expect(tierFeature.name).toBe('Priority Placement');
      expect(tierFeature.enabled).toBe(true);
      expect(tierFeature.limits?.maxPriorityListings).toBe(5);
    });
  });

  describe('UserTier Interface', () => {
    it('should validate UserTier structure', () => {
      const userTier: UserTier = {
        tierId: 'premium-individual',
        name: 'Premium Individual',
        type: 'individual',
        isPremium: true,
        features: [
          {
            featureId: 'priority_placement',
            name: 'Priority Placement',
            description: 'Higher search ranking',
            enabled: true
          }
        ],
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
        pricing: {
          monthly: 29.99,
          yearly: 299.99,
          currency: 'USD'
        },
        active: true,
        description: 'Perfect for individual boat sellers',
        displayOrder: 2
      };

      expect(userTier.type).toBe('individual');
      expect(userTier.isPremium).toBe(true);
      expect(userTier.pricing.monthly).toBe(29.99);
      expect(userTier.features).toHaveLength(1);
    });

    it('should validate UserTier type enum values', () => {
      const validTypes: UserTier['type'][] = ['individual', 'dealer'];
      
      validTypes.forEach(type => {
        const tier: UserTier = {
          tierId: 'test',
          name: 'Test Tier',
          type,
          isPremium: false,
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
          pricing: { currency: 'USD' },
          active: true,
          displayOrder: 1
        };
        expect(tier.type).toBe(type);
      });
    });
  });

  describe('EnhancedUser Interface', () => {
    it('should extend base User with enhanced properties', () => {
      const enhancedUser: EnhancedUser = {
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
        userType: 'customer',
        customerTier: 'premium_individual',
        membershipDetails: {
          plan: 'premium-individual',
          tierId: 'premium-individual',
          features: ['priority_placement', 'analytics_access'],
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
          expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
          autoRenew: true,
          billingCycle: 'yearly'
        },
        capabilities: [
          {
            feature: 'premium_listings',
            enabled: true,
            grantedBy: 'system',
            grantedAt: Date.now()
          }
        ],
        premiumActive: true,
        premiumPlan: 'premium-individual',
        premiumExpiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000
      };

      expect(enhancedUser.userType).toBe('customer');
      expect(enhancedUser.customerTier).toBe('premium_individual');
      expect(enhancedUser.membershipDetails.plan).toBe('premium-individual');
      expect(enhancedUser.capabilities).toHaveLength(1);
      expect(enhancedUser.premiumActive).toBe(true);
    });

    it('should validate customerTier enum values', () => {
      const validCustomerTiers: EnhancedUser['customerTier'][] = [
        'individual',
        'dealer',
        'premium_individual',
        'premium_dealer'
      ];

      validCustomerTiers.forEach(customerTier => {
        const user: Partial<EnhancedUser> = {
          userType: 'customer',
          customerTier,
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
        expect(user.userType).toBe('customer');
        expect(user.customerTier).toBe(customerTier);
      });
    });

    it('should support billing information', () => {
      const userWithBilling: Partial<EnhancedUser> = {
        billingInfo: {
          customerId: 'cus_123456789',
          subscriptionId: 'sub_987654321',
          paymentMethodId: 'pm_abcdefghijk',
          billingAddress: {
            street: '123 Main St',
            city: 'Miami',
            state: 'FL',
            zipCode: '33101',
            country: 'US'
          }
        }
      };

      expect(userWithBilling.billingInfo?.customerId).toBe('cus_123456789');
      expect(userWithBilling.billingInfo?.billingAddress?.city).toBe('Miami');
    });
  });

  describe('SalesUser Interface', () => {
    it('should extend EnhancedUser with sales-specific properties', () => {
      const salesUser: SalesUser = {
        id: 'sales-123',
        email: 'sales@example.com',
        name: 'Jane Sales',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        permissions: [
          AdminPermission.USER_MANAGEMENT,
          AdminPermission.TIER_MANAGEMENT,
          AdminPermission.CAPABILITY_ASSIGNMENT
        ],
        emailVerified: true,
        phoneVerified: true,
        mfaEnabled: true,
        loginAttempts: 0,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        userType: 'customer',
        customerTier: 'dealer',
        membershipDetails: {
          features: [],
          limits: {
            maxListings: 100,
            maxImages: 500,
            priorityPlacement: true,
            featuredListings: 10,
            analyticsAccess: true,
            bulkOperations: true,
            advancedSearch: true,
            premiumSupport: true
          },
          autoRenew: false
        },
        capabilities: [],
        premiumActive: false,
        assignedCustomers: ['customer-1', 'customer-2', 'customer-3'],
        salesTargets: {
          monthly: 50000,
          quarterly: 150000,
          yearly: 600000,
          achieved: {
            monthly: 35000,
            quarterly: 120000,
            yearly: 480000
          }
        },
        commissionRate: 0.05,
        territory: 'Southeast',
        managerUserId: 'manager-456'
      };

      expect(salesUser.role).toBe(UserRole.ADMIN);
      expect(salesUser.permissions).toContain(AdminPermission.USER_MANAGEMENT);
      expect(salesUser.assignedCustomers).toHaveLength(3);
      expect(salesUser.salesTargets?.monthly).toBe(50000);
      expect(salesUser.commissionRate).toBe(0.05);
    });

    it('should validate required sales permissions', () => {
      const requiredPermissions = [
        AdminPermission.USER_MANAGEMENT,
        AdminPermission.TIER_MANAGEMENT,
        AdminPermission.CAPABILITY_ASSIGNMENT
      ];

      const salesUser: Partial<SalesUser> = {
        role: UserRole.ADMIN,
        permissions: requiredPermissions
      };

      requiredPermissions.forEach(permission => {
        expect(salesUser.permissions).toContain(permission);
      });
    });
  });
});