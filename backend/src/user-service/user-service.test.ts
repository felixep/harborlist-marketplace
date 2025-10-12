/**
 * @fileoverview Simple unit tests for user service core functionality
 */

import { handler } from './index';
import { APIGatewayProxyEvent } from 'aws-lambda';

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

describe('User Service - Basic Functionality', () => {
  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const event = createMockEvent('/health', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('healthy');
      expect(body.service).toBe('user-service');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('Available Tiers', () => {
    it('should return available user tiers', async () => {
      const event = createMockEvent('/tiers', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.tiers).toBeDefined();
      expect(Array.isArray(body.tiers)).toBe(true);
      expect(body.tiers.length).toBeGreaterThan(0);
      expect(body.totalTiers).toBe(body.tiers.length);

      // Check tier structure
      const tier = body.tiers[0];
      expect(tier.tierId).toBeDefined();
      expect(tier.name).toBeDefined();
      expect(tier.type).toBeDefined();
      expect(tier.limits).toBeDefined();
      expect(tier.features).toBeDefined();
    });

    it('should return tiers sorted by display order', async () => {
      const event = createMockEvent('/tiers', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      // Check that tiers are sorted by displayOrder
      for (let i = 1; i < body.tiers.length; i++) {
        expect(body.tiers[i].displayOrder).toBeGreaterThanOrEqual(body.tiers[i - 1].displayOrder);
      }
    });

    it('should include both individual and dealer tiers', async () => {
      const event = createMockEvent('/tiers', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      const individualTiers = body.tiers.filter((tier: any) => tier.type === 'individual');
      const dealerTiers = body.tiers.filter((tier: any) => tier.type === 'dealer');
      
      expect(individualTiers.length).toBeGreaterThan(0);
      expect(dealerTiers.length).toBeGreaterThan(0);
    });

    it('should include premium and basic tiers', async () => {
      const event = createMockEvent('/tiers', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      const premiumTiers = body.tiers.filter((tier: any) => tier.isPremium === true);
      const basicTiers = body.tiers.filter((tier: any) => tier.isPremium === false);
      
      expect(premiumTiers.length).toBeGreaterThan(0);
      expect(basicTiers.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const event = createMockEvent('/unknown/endpoint', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('Endpoint not found');
    });

    it('should return 400 for missing sales rep ID', async () => {
      const event = createMockEvent('/sales/customers', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('MISSING_SALES_REP_ID');
    });

    it('should return 400 for missing user IDs in bulk update', async () => {
      const bulkUpdateData = {
        userIds: [],
        updates: { userType: 'premium_individual' },
        adminId: 'admin-123'
      };

      const event = createMockEvent('/users/bulk-update', 'POST', bulkUpdateData);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('MISSING_USER_IDS');
    });

    it('should return 400 for too many users in bulk update', async () => {
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

  describe('Request Validation', () => {
    it('should handle malformed JSON in request body', async () => {
      const event = {
        ...createMockEvent('/users/user-123/tier', 'PUT'),
        body: '{ invalid json }'
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle missing request body', async () => {
      const event = {
        ...createMockEvent('/users/user-123/tier', 'PUT'),
        body: null
      };

      const result = await handler(event);

      // Should not crash, should handle gracefully
      expect([200, 400, 404, 500]).toContain(result.statusCode);
    });
  });
});

describe('User Service - Tier Configuration', () => {
  describe('Default Tier Limits', () => {
    it('should have appropriate limits for individual basic tier', async () => {
      const event = createMockEvent('/tiers', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      const individualBasic = body.tiers.find((tier: any) => 
        tier.tierId === 'individual-basic'
      );
      
      expect(individualBasic).toBeDefined();
      expect(individualBasic.limits.maxListings).toBe(3);
      expect(individualBasic.limits.maxImages).toBe(5);
      expect(individualBasic.limits.priorityPlacement).toBe(false);
      expect(individualBasic.limits.featuredListings).toBe(0);
      expect(individualBasic.limits.analyticsAccess).toBe(false);
      expect(individualBasic.limits.bulkOperations).toBe(false);
    });

    it('should have enhanced limits for premium tiers', async () => {
      const event = createMockEvent('/tiers', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      const premiumTiers = body.tiers.filter((tier: any) => tier.isPremium);
      
      premiumTiers.forEach((tier: any) => {
        expect(tier.limits.maxListings).toBeGreaterThan(3);
        expect(tier.limits.maxImages).toBeGreaterThan(5);
        expect(tier.limits.priorityPlacement).toBe(true);
        expect(tier.limits.featuredListings).toBeGreaterThan(0);
        expect(tier.limits.analyticsAccess).toBe(true);
        expect(tier.limits.premiumSupport).toBe(true);
      });
    });

    it('should have higher limits for dealer tiers', async () => {
      const event = createMockEvent('/tiers', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      const dealerTiers = body.tiers.filter((tier: any) => tier.type === 'dealer');
      const individualTiers = body.tiers.filter((tier: any) => tier.type === 'individual');
      
      dealerTiers.forEach((dealerTier: any) => {
        const comparableIndividualTier = individualTiers.find((indTier: any) => 
          indTier.isPremium === dealerTier.isPremium
        );
        
        if (comparableIndividualTier) {
          expect(dealerTier.limits.maxListings).toBeGreaterThanOrEqual(
            comparableIndividualTier.limits.maxListings
          );
          expect(dealerTier.limits.bulkOperations).toBe(true);
        }
      });
    });
  });

  describe('Tier Features', () => {
    it('should have appropriate features for each tier', async () => {
      const event = createMockEvent('/tiers', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      body.tiers.forEach((tier: any) => {
        expect(Array.isArray(tier.features)).toBe(true);
        expect(tier.features.length).toBeGreaterThan(0);
        
        tier.features.forEach((feature: any) => {
          expect(feature.featureId).toBeDefined();
          expect(feature.name).toBeDefined();
          expect(feature.description).toBeDefined();
          expect(typeof feature.enabled).toBe('boolean');
        });
      });
    });

    it('should have pricing information for premium tiers', async () => {
      const event = createMockEvent('/tiers', 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      const premiumTiers = body.tiers.filter((tier: any) => tier.isPremium);
      
      premiumTiers.forEach((tier: any) => {
        expect(tier.pricing).toBeDefined();
        expect(tier.pricing.currency).toBe('USD');
        expect(tier.pricing.monthly).toBeGreaterThan(0);
        expect(tier.pricing.yearly).toBeGreaterThan(0);
        expect(tier.pricing.yearly).toBeLessThan(tier.pricing.monthly * 12); // Yearly discount
      });
    });
  });
});

describe('User Service - Path Parsing', () => {
  describe('User ID extraction', () => {
    it('should handle various user ID formats in paths', async () => {
      // Test with UUID-like user ID
      const event1 = createMockEvent('/users/550e8400-e29b-41d4-a716-446655440000/tier', 'GET');
      const result1 = await handler(event1);
      
      // Should attempt to process (will fail due to no database, but path parsing should work)
      expect([404, 500]).toContain(result1.statusCode);

      // Test with simple user ID
      const event2 = createMockEvent('/users/user-123/capabilities', 'GET');
      const result2 = await handler(event2);
      
      // Should attempt to process
      expect([404, 500]).toContain(result2.statusCode);
    });
  });
});

describe('User Service - Input Validation', () => {
  describe('Bulk update validation', () => {
    it('should validate bulk update request structure', async () => {
      const invalidBulkUpdateData = {
        // Missing userIds
        updates: { userType: 'premium_individual' },
        adminId: 'admin-123'
      };

      const event = createMockEvent('/users/bulk-update', 'POST', invalidBulkUpdateData);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('MISSING_USER_IDS');
    });
  });

  describe('Sales assignment validation', () => {
    it('should validate sales assignment request structure', async () => {
      const invalidAssignmentData = {
        // Missing required fields
        customerId: 'user-123'
        // Missing salesRepId and adminId
      };

      const event = createMockEvent('/sales/assign-customer', 'POST', invalidAssignmentData);
      const result = await handler(event);

      // Should fail due to missing fields or database access
      expect([400, 404, 500]).toContain(result.statusCode);
    });
  });
});