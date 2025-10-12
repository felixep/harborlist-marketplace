/**
 * @fileoverview Unit tests for user service tier management and sales role functionality
 */

import { handler, processExpiredMemberships } from './index';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { GetCommand, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { 
  User, 
  EnhancedUser, 
  SalesUser, 
  UserRole, 
  UserStatus, 
  UserTier,
  UserCapability 
} from '@harborlist/shared-types';

// Mock DynamoDB client
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock user data
const mockUser: EnhancedUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
  emailVerified: true,
  phoneVerified: false,
  mfaEnabled: false,
  loginAttempts: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  userType: 'individual',
  membershipDetails: {
    plan: 'Individual Basic',
    tierId: 'individual-basic',
    features: ['basic-listings', 'search'],
    limits: {
      maxListings: 3,
      maxImages: 5,
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

const mockSalesUser: SalesUser = {
  ...mockUser,
  id: 'sales-123',
  email: 'sales@example.com',
  name: 'Sales Rep',
  role: UserRole.ADMIN, // SalesUser extends admin role
  permissions: [],
  assignedCustomers: ['user-123', 'user-456'],
  salesTargets: {
    monthly: 10000,
    quarterly: 30000,
    yearly: 120000,
    achieved: {
      monthly: 8000,
      quarterly: 25000,
      yearly: 100000
    }
  },
  commissionRate: 0.05,
  territory: 'West Coast'
};

const mockPremiumTier: UserTier = {
  tierId: 'individual-premium',
  name: 'Individual Premium',
  type: 'individual',
  isPremium: true,
  features: [
    { featureId: 'premium-listings', name: 'Premium Listings', description: 'Premium listings', enabled: true },
    { featureId: 'priority-placement', name: 'Priority Placement', description: 'Priority placement', enabled: true }
  ],
  limits: {
    maxListings: 10,
    maxImages: 20,
    priorityPlacement: true,
    featuredListings: 2,
    analyticsAccess: true,
    bulkOperations: false,
    advancedSearch: true,
    premiumSupport: true
  },
  pricing: { monthly: 29.99, yearly: 299.99, currency: 'USD' },
  active: true,
  description: 'Premium tier for individuals',
  displayOrder: 2
};

// Helper function to create mock API Gateway event
const createMockEvent = (
  path: string,
  method: string,
  body?: any,
  queryStringParameters?: Record<string, string>
): APIGatewayProxyEvent => ({
  httpMethod: method,
  path,
  body: body ? JSON.stringify(body) : null,
  queryStringParameters,
  headers: {
    'User-Agent': 'test-agent'
  },
  requestContext: {
    requestId: 'test-request-id',
    identity: {
      sourceIp: '127.0.0.1'
    }
  }
} as any);

describe('User Service - Tier Management', () => {
  beforeEach(() => {
    ddbMock.reset();
    jest.clearAllMocks();
  });

  describe('GET /users/{userId}/tier', () => {
    it('should return user tier information', async () => {
      ddbMock.on(GetCommand).resolves({ Item: mockUser });

      const event = createMockEvent('/users/user-123/tier', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.userId).toBe('user-123');
      expect(body.userType).toBe('individual');
      expect(body.membershipDetails).toBeDefined();
      expect(body.premiumActive).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      ddbMock.on('GetCommand').resolves({ Item: null });

      const event = createMockEvent('/users/nonexistent/tier', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('PUT /users/{userId}/tier', () => {
    it('should update user tier successfully', async () => {
      ddbMock.on('GetCommand').resolves({ Item: mockUser });
      ddbMock.on('UpdateCommand').resolves({});
      ddbMock.on('PutCommand').resolves({}); // For audit log

      const updateData = {
        userType: 'premium_individual',
        tierId: 'individual-premium',
        autoRenew: true
      };

      const event = createMockEvent('/users/user-123/tier', 'PUT', updateData);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('User tier updated successfully');
      expect(body.userId).toBe('user-123');
    });

    it('should reject invalid user type transition', async () => {
      const invalidUser = { ...mockUser, userType: 'individual' };
      ddbMock.on('GetCommand').resolves({ Item: invalidUser });

      const updateData = {
        userType: 'invalid_type'
      };

      const event = createMockEvent('/users/user-123/tier', 'PUT', updateData);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('INVALID_USER_TYPE_TRANSITION');
    });

    it('should return 404 for non-existent tier', async () => {
      ddbMock.on('GetCommand').resolves({ Item: mockUser });

      const updateData = {
        tierId: 'nonexistent-tier'
      };

      const event = createMockEvent('/users/user-123/tier', 'PUT', updateData);
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('TIER_NOT_FOUND');
    });
  });

  describe('GET /users/{userId}/capabilities', () => {
    it('should return user capabilities', async () => {
      const userWithCapabilities: EnhancedUser = {
        ...mockUser,
        capabilities: [
          {
            feature: 'advanced-analytics',
            enabled: true,
            grantedBy: 'admin-123',
            grantedAt: Date.now()
          },
          {
            feature: 'bulk-operations',
            enabled: true,
            expiresAt: Date.now() + 86400000, // 24 hours from now
            grantedBy: 'admin-123',
            grantedAt: Date.now()
          }
        ]
      };

      ddbMock.on('GetCommand').resolves({ Item: userWithCapabilities });

      const event = createMockEvent('/users/user-123/capabilities', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.userId).toBe('user-123');
      expect(body.capabilities).toHaveLength(2);
      expect(body.activeCapabilities).toBe(2);
    });

    it('should filter out expired capabilities', async () => {
      const userWithExpiredCapabilities: EnhancedUser = {
        ...mockUser,
        capabilities: [
          {
            feature: 'advanced-analytics',
            enabled: true,
            grantedBy: 'admin-123',
            grantedAt: Date.now()
          },
          {
            feature: 'expired-feature',
            enabled: true,
            expiresAt: Date.now() - 86400000, // 24 hours ago (expired)
            grantedBy: 'admin-123',
            grantedAt: Date.now() - 172800000
          }
        ]
      };

      ddbMock.on('GetCommand').resolves({ Item: userWithExpiredCapabilities });

      const event = createMockEvent('/users/user-123/capabilities', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.totalCapabilities).toBe(2);
      expect(body.activeCapabilities).toBe(1);
      expect(body.capabilities).toHaveLength(1);
      expect(body.capabilities[0].feature).toBe('advanced-analytics');
    });
  });

  describe('PUT /users/{userId}/capabilities', () => {
    it('should update user capabilities successfully', async () => {
      ddbMock.on('GetCommand').resolves({ Item: mockUser });
      ddbMock.on('UpdateCommand').resolves({});
      ddbMock.on('PutCommand').resolves({}); // For audit log

      const capabilities: UserCapability[] = [
        {
          feature: 'advanced-analytics',
          enabled: true,
          grantedBy: 'admin-123',
          grantedAt: Date.now()
        }
      ];

      const updateData = {
        capabilities,
        grantedBy: 'admin-123'
      };

      const event = createMockEvent('/users/user-123/capabilities', 'PUT', updateData);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('User capabilities updated successfully');
      expect(body.capabilities).toHaveLength(1);
      expect(body.capabilities[0].feature).toBe('advanced-analytics');
    });
  });
});

describe('User Service - Premium Membership Management', () => {
  beforeEach(() => {
    ddbMock.reset();
    jest.clearAllMocks();
  });

  describe('POST /users/{userId}/membership', () => {
    it('should activate premium membership successfully', async () => {
      ddbMock.on('GetCommand').resolves({ Item: mockUser });
      ddbMock.on('ScanCommand').resolves({ Items: [mockPremiumTier] });
      ddbMock.on('UpdateCommand').resolves({});
      ddbMock.on('PutCommand').resolves({}); // For audit log

      const membershipData = {
        plan: 'Individual Premium',
        billingCycle: 'monthly' as const,
        paymentMethodId: 'pm_123'
      };

      const event = createMockEvent('/users/user-123/membership', 'POST', membershipData);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Premium membership activated successfully');
      expect(body.plan).toBe('Individual Premium');
      expect(body.features).toBeDefined();
      expect(body.limits).toBeDefined();
    });

    it('should return 404 for non-existent premium tier', async () => {
      ddbMock.on('GetCommand').resolves({ Item: mockUser });
      ddbMock.on('ScanCommand').resolves({ Items: [] });

      const membershipData = {
        plan: 'Nonexistent Premium',
        billingCycle: 'monthly' as const
      };

      const event = createMockEvent('/users/user-123/membership', 'POST', membershipData);
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('PREMIUM_TIER_NOT_FOUND');
    });
  });

  describe('DELETE /users/{userId}/membership', () => {
    it('should deactivate premium membership successfully', async () => {
      const premiumUser: EnhancedUser = {
        ...mockUser,
        premiumActive: true,
        premiumPlan: 'Individual Premium',
        premiumExpiresAt: Date.now() + 86400000
      };

      ddbMock.on('GetCommand').resolves({ Item: premiumUser });
      ddbMock.on('UpdateCommand').resolves({});
      ddbMock.on('PutCommand').resolves({}); // For audit log

      const event = createMockEvent('/users/user-123/membership', 'DELETE');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Premium membership deactivated successfully');
      expect(body.downgradedTo).toBeDefined();
      expect(body.newLimits).toBeDefined();
    });
  });
});

describe('User Service - Sales Role Functionality', () => {
  beforeEach(() => {
    ddbMock.reset();
    jest.clearAllMocks();
  });

  describe('GET /sales/customers', () => {
    it('should return sales rep customers', async () => {
      ddbMock.on('GetCommand')
        .resolvesOnce({ Item: mockSalesUser }) // Sales rep
        .resolvesOnce({ Item: mockUser }) // Customer 1
        .resolvesOnce({ Item: { ...mockUser, id: 'user-456' } }); // Customer 2

      const event = createMockEvent('/sales/customers', 'GET', null, { salesRepId: 'sales-123' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.customers).toHaveLength(2);
      expect(body.totalCustomers).toBe(2);
      expect(body.salesRepId).toBe('sales-123');
      expect(body.salesRepName).toBe('Sales Rep');
    });

    it('should return empty list for sales rep with no customers', async () => {
      const salesUserNoCustomers = { ...mockSalesUser, assignedCustomers: [] };
      ddbMock.on('GetCommand').resolves({ Item: salesUserNoCustomers });

      const event = createMockEvent('/sales/customers', 'GET', null, { salesRepId: 'sales-123' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.customers).toHaveLength(0);
      expect(body.totalCustomers).toBe(0);
    });

    it('should return 403 for invalid sales rep', async () => {
      const regularUser = { ...mockUser, role: UserRole.USER };
      ddbMock.on('GetCommand').resolves({ Item: regularUser });

      const event = createMockEvent('/sales/customers', 'GET', null, { salesRepId: 'user-123' });
      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('INVALID_SALES_REP');
    });
  });

  describe('POST /sales/assign-customer', () => {
    it('should assign customer to sales rep successfully', async () => {
      ddbMock.on('GetCommand')
        .resolvesOnce({ Item: mockUser }) // Customer
        .resolvesOnce({ Item: mockSalesUser }); // Sales rep
      ddbMock.on('UpdateCommand').resolves({});
      ddbMock.on('PutCommand').resolves({}); // For audit log

      const assignmentData = {
        customerId: 'user-123',
        salesRepId: 'sales-123',
        adminId: 'admin-123'
      };

      const event = createMockEvent('/sales/assign-customer', 'POST', assignmentData);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Customer assigned to sales representative successfully');
      expect(body.customerId).toBe('user-123');
      expect(body.salesRepId).toBe('sales-123');
    });

    it('should return 404 for non-existent customer', async () => {
      ddbMock.on('GetCommand').resolves({ Item: null });

      const assignmentData = {
        customerId: 'nonexistent',
        salesRepId: 'sales-123',
        adminId: 'admin-123'
      };

      const event = createMockEvent('/sales/assign-customer', 'POST', assignmentData);
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('CUSTOMER_NOT_FOUND');
    });
  });

  describe('GET /sales/performance', () => {
    it('should return sales performance metrics', async () => {
      ddbMock.on('GetCommand')
        .resolvesOnce({ Item: mockSalesUser }) // Sales rep
        .resolvesOnce({ Item: mockUser }) // Customer 1
        .resolvesOnce({ Item: { ...mockUser, id: 'user-456', premiumActive: true } }); // Customer 2 (premium)

      const event = createMockEvent('/sales/performance', 'GET', null, { salesRepId: 'sales-123' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.salesRepId).toBe('sales-123');
      expect(body.totalCustomers).toBe(2);
      expect(body.activeCustomers).toBe(2);
      expect(body.premiumCustomers).toBe(1);
      expect(body.targets).toBeDefined();
      expect(body.commissionRate).toBe(0.05);
    });
  });
});

describe('User Service - Bulk Operations', () => {
  beforeEach(() => {
    ddbMock.reset();
    jest.clearAllMocks();
  });

  describe('POST /users/bulk-update', () => {
    it('should perform bulk user update successfully', async () => {
      ddbMock.on('GetCommand')
        .resolvesOnce({ Item: mockUser })
        .resolvesOnce({ Item: { ...mockUser, id: 'user-456' } });
      ddbMock.on('UpdateCommand').resolves({});
      ddbMock.on('PutCommand').resolves({}); // For audit logs

      const bulkUpdateData = {
        userIds: ['user-123', 'user-456'],
        updates: { userType: 'premium_individual' },
        adminId: 'admin-123'
      };

      const event = createMockEvent('/users/bulk-update', 'POST', bulkUpdateData);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Bulk user update completed');
      expect(body.totalUsers).toBe(2);
      expect(body.successful).toBe(2);
      expect(body.failed).toBe(0);
    });

    it('should handle partial failures in bulk update', async () => {
      ddbMock.on('GetCommand')
        .resolvesOnce({ Item: mockUser })
        .resolvesOnce({ Item: null }); // Non-existent user
      ddbMock.on('UpdateCommand').resolves({});
      ddbMock.on('PutCommand').resolves({}); // For audit logs

      const bulkUpdateData = {
        userIds: ['user-123', 'nonexistent'],
        updates: { userType: 'premium_individual' },
        adminId: 'admin-123'
      };

      const event = createMockEvent('/users/bulk-update', 'POST', bulkUpdateData);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.totalUsers).toBe(2);
      expect(body.successful).toBe(1);
      expect(body.failed).toBe(1);
      expect(body.errors).toHaveLength(1);
    });

    it('should reject bulk update with too many users', async () => {
      const userIds = Array.from({ length: 101 }, (_, i) => `user-${i}`);
      const bulkUpdateData = {
        userIds,
        updates: { userType: 'premium_individual' },
        adminId: 'admin-123'
      };

      const event = createMockEvent('/users/bulk-update', 'POST', bulkUpdateData);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('TOO_MANY_USERS');
    });
  });
});

describe('User Service - Expired Membership Processing', () => {
  beforeEach(() => {
    ddbMock.reset();
    jest.clearAllMocks();
  });

  describe('processExpiredMemberships', () => {
    it('should process expired premium memberships', async () => {
      const expiredUser: EnhancedUser = {
        ...mockUser,
        premiumActive: true,
        premiumPlan: 'Individual Premium',
        premiumExpiresAt: Date.now() - 86400000 // Expired 24 hours ago
      };

      ddbMock.on('ScanCommand').resolves({ Items: [expiredUser] });
      ddbMock.on('UpdateCommand').resolves({});
      ddbMock.on('PutCommand').resolves({}); // For audit log

      await processExpiredMemberships();

      // Verify that UpdateCommand was called to downgrade the user
      expect(ddbMock.commandCalls('UpdateCommand')).toHaveLength(1);
      expect(ddbMock.commandCalls('PutCommand')).toHaveLength(1); // Audit log
    });

    it('should handle no expired memberships', async () => {
      ddbMock.on('ScanCommand').resolves({ Items: [] });

      await processExpiredMemberships();

      // Verify no updates were made
      expect(ddbMock.commandCalls('UpdateCommand')).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      const expiredUser: EnhancedUser = {
        ...mockUser,
        premiumActive: true,
        premiumPlan: 'Individual Premium',
        premiumExpiresAt: Date.now() - 86400000
      };

      ddbMock.on('ScanCommand').resolves({ Items: [expiredUser] });
      ddbMock.on('UpdateCommand').rejects(new Error('Database error'));

      // Should not throw error
      await expect(processExpiredMemberships()).resolves.not.toThrow();
    });
  });
});

describe('User Service - Utility Functions', () => {
  describe('User type transitions', () => {
    it('should validate valid user type transitions', async () => {
      // Test individual to premium_individual transition
      ddbMock.on('GetCommand').resolves({ Item: { ...mockUser, userType: 'individual' } });
      ddbMock.on('UpdateCommand').resolves({});
      ddbMock.on('PutCommand').resolves({});

      const updateData = { userType: 'premium_individual' };
      const event = createMockEvent('/users/user-123/tier', 'PUT', updateData);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should reject invalid user type transitions', async () => {
      ddbMock.on('GetCommand').resolves({ Item: { ...mockUser, userType: 'individual' } });

      const updateData = { userType: 'invalid_type' };
      const event = createMockEvent('/users/user-123/tier', 'PUT', updateData);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('INVALID_USER_TYPE_TRANSITION');
    });
  });

  describe('Health check', () => {
    it('should return healthy status', async () => {
      const event = createMockEvent('/health', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('healthy');
      expect(body.service).toBe('user-service');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      ddbMock.on('GetCommand').rejects(new Error('Database connection failed'));

      const event = createMockEvent('/users/user-123/tier', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should return 404 for unknown endpoints', async () => {
      const event = createMockEvent('/unknown/endpoint', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });
});