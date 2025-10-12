/**
 * @fileoverview Unit tests for enhanced listing service
 * 
 * Tests multi-engine validation, total horsepower calculation,
 * moderation workflow integration, and SEO slug generation.
 */

import { handler } from './index';
import { db } from '../shared/database';
import { APIGatewayProxyEvent } from 'aws-lambda';

// Mock the database service
jest.mock('../shared/database');
const mockDb = db as jest.Mocked<typeof db>;

// Mock the utils
jest.mock('../shared/utils', () => ({
  createResponse: jest.fn((statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })),
  createErrorResponse: jest.fn((statusCode, code, message, requestId) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: { code, message, requestId } }),
  })),
  parseBody: jest.fn((event) => JSON.parse(event.body || '{}')),
  getUserId: jest.fn(() => 'test-user-123'),
  generateId: jest.fn(() => 'test-id-123'),
  validateRequired: jest.fn(),
  sanitizeString: jest.fn((str) => str),
  validatePrice: jest.fn((price) => price >= 1 && price <= 10000000),
  validateYear: jest.fn((year) => year >= 1900 && year <= new Date().getFullYear() + 1),
}));

describe('Enhanced Listing Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Multi-Engine Validation', () => {
    test('should validate single engine configuration', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        body: JSON.stringify({
          title: 'Test Boat',
          description: 'A test boat',
          price: 50000,
          location: { city: 'Miami', state: 'FL' },
          boatDetails: { type: 'Sailboat', year: 2020, length: 30, condition: 'Excellent' },
          engines: [{
            engineId: 'engine-1',
            type: 'outboard',
            horsepower: 250,
            fuelType: 'gasoline',
            condition: 'excellent',
            position: 1
          }]
        }),
        requestContext: { requestId: 'test-request' } as any,
        pathParameters: null,
      };

      mockDb.createListing.mockResolvedValue();
      mockDb.batchCreateEngines.mockResolvedValue();
      mockDb.createModerationQueue.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(201);
      expect(mockDb.createListing).toHaveBeenCalled();
      expect(mockDb.batchCreateEngines).toHaveBeenCalled();
    });

    test('should validate twin engine configuration', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        body: JSON.stringify({
          title: 'Twin Engine Boat',
          description: 'A twin engine boat',
          price: 75000,
          location: { city: 'Miami', state: 'FL' },
          boatDetails: { type: 'Center Console', year: 2021, length: 28, condition: 'Excellent' },
          engines: [
            {
              engineId: 'engine-1',
              type: 'outboard',
              horsepower: 300,
              fuelType: 'gasoline',
              condition: 'excellent',
              position: 1
            },
            {
              engineId: 'engine-2',
              type: 'outboard',
              horsepower: 300,
              fuelType: 'gasoline',
              condition: 'excellent',
              position: 2
            }
          ]
        }),
        requestContext: { requestId: 'test-request' } as any,
        pathParameters: null,
      };

      mockDb.createListing.mockResolvedValue();
      mockDb.batchCreateEngines.mockResolvedValue();
      mockDb.createModerationQueue.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(201);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.status).toBe('pending_review');
    });

    test('should reject engines with duplicate positions', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        body: JSON.stringify({
          title: 'Invalid Engine Boat',
          description: 'A boat with invalid engine config',
          price: 50000,
          location: { city: 'Miami', state: 'FL' },
          boatDetails: { type: 'Center Console', year: 2020, length: 25, condition: 'Good' },
          engines: [
            {
              engineId: 'engine-1',
              type: 'outboard',
              horsepower: 250,
              fuelType: 'gasoline',
              condition: 'excellent',
              position: 1
            },
            {
              engineId: 'engine-2',
              type: 'outboard',
              horsepower: 250,
              fuelType: 'gasoline',
              condition: 'excellent',
              position: 1 // Duplicate position
            }
          ]
        }),
        requestContext: { requestId: 'test-request' } as any,
        pathParameters: null,
      };

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('INVALID_ENGINES');
      expect(responseBody.error.message).toContain('unique');
    });

    test('should reject more than 4 engines', async () => {
      const engines = Array.from({ length: 5 }, (_, i) => ({
        engineId: `engine-${i + 1}`,
        type: 'outboard' as const,
        horsepower: 200,
        fuelType: 'gasoline' as const,
        condition: 'excellent' as const,
        position: i + 1
      }));

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        body: JSON.stringify({
          title: 'Too Many Engines Boat',
          description: 'A boat with too many engines',
          price: 100000,
          location: { city: 'Miami', state: 'FL' },
          boatDetails: { type: 'Center Console', year: 2020, length: 35, condition: 'Good' },
          engines
        }),
        requestContext: { requestId: 'test-request' } as any,
        pathParameters: null,
      };

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('INVALID_ENGINES');
      expect(responseBody.error.message).toContain('Maximum of 4 engines');
    });
  });

  describe('Total Horsepower Calculation', () => {
    test('should calculate total horsepower correctly for single engine', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { id: 'listing-123' },
        path: '/listings/listing-123/engines',
        body: JSON.stringify({
          engines: [{
            engineId: 'engine-1',
            type: 'outboard',
            horsepower: 350,
            fuelType: 'gasoline',
            condition: 'excellent',
            position: 1
          }]
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      mockDb.getListing.mockResolvedValue({
        listingId: 'listing-123',
        ownerId: 'test-user-123',
        title: 'Test Boat'
      } as any);
      mockDb.getEnginesByListing.mockResolvedValue([]);
      mockDb.batchDeleteEngines.mockResolvedValue();
      mockDb.batchCreateEngines.mockResolvedValue();
      mockDb.updateListingWithEngines.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.totalHorsepower).toBe(350);
      expect(responseBody.engineConfiguration).toBe('single');
    });

    test('should calculate total horsepower correctly for twin engines', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { id: 'listing-123' },
        path: '/listings/listing-123/engines',
        body: JSON.stringify({
          engines: [
            {
              engineId: 'engine-1',
              type: 'outboard',
              horsepower: 300,
              fuelType: 'gasoline',
              condition: 'excellent',
              position: 1
            },
            {
              engineId: 'engine-2',
              type: 'outboard',
              horsepower: 300,
              fuelType: 'gasoline',
              condition: 'excellent',
              position: 2
            }
          ]
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      mockDb.getListing.mockResolvedValue({
        listingId: 'listing-123',
        ownerId: 'test-user-123',
        title: 'Test Boat'
      } as any);
      mockDb.getEnginesByListing.mockResolvedValue([]);
      mockDb.batchDeleteEngines.mockResolvedValue();
      mockDb.batchCreateEngines.mockResolvedValue();
      mockDb.updateListingWithEngines.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.totalHorsepower).toBe(600);
      expect(responseBody.engineConfiguration).toBe('twin');
    });
  });

  describe('Moderation Workflow Integration', () => {
    test('should set listing to pending_review on creation', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        body: JSON.stringify({
          title: 'New Boat Listing',
          description: 'A new boat for sale',
          price: 45000,
          location: { city: 'Fort Lauderdale', state: 'FL' },
          boatDetails: { type: 'Yacht', year: 2019, length: 40, condition: 'Good' },
          engines: [{
            engineId: 'engine-1',
            type: 'inboard',
            horsepower: 400,
            fuelType: 'diesel',
            condition: 'good',
            position: 1
          }]
        }),
        requestContext: { requestId: 'test-request' } as any,
        pathParameters: null,
      };

      mockDb.createListing.mockResolvedValue();
      mockDb.batchCreateEngines.mockResolvedValue();
      mockDb.createModerationQueue.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(201);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.status).toBe('pending_review');
      expect(responseBody.message).toContain('submitted for review');
      expect(mockDb.createModerationQueue).toHaveBeenCalled();
    });

    test('should process approve moderation decision', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { id: 'listing-123' },
        path: '/listings/listing-123/moderate',
        body: JSON.stringify({
          action: 'approve',
          reason: 'Listing meets all requirements',
          publicNotes: 'Your listing has been approved!'
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      mockDb.getListing.mockResolvedValue({
        listingId: 'listing-123',
        ownerId: 'owner-123',
        title: 'Test Boat',
        status: 'pending_moderation'
      } as any);
      mockDb.updateListing.mockResolvedValue();
      mockDb.updateModerationStatus.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toContain('approved');
      expect(responseBody.status).toBe('active');
      expect(mockDb.updateListing).toHaveBeenCalledWith('listing-123', expect.objectContaining({
        status: 'active',
        moderationWorkflow: expect.objectContaining({
          status: 'approved'
        })
      }));
    });

    test('should process reject moderation decision', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { id: 'listing-123' },
        path: '/listings/listing-123/moderate',
        body: JSON.stringify({
          action: 'reject',
          reason: 'Inappropriate content',
          publicNotes: 'Your listing violates our community guidelines'
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      mockDb.getListing.mockResolvedValue({
        listingId: 'listing-123',
        ownerId: 'owner-123',
        title: 'Test Boat',
        status: 'pending_moderation'
      } as any);
      mockDb.updateListing.mockResolvedValue();
      mockDb.updateModerationStatus.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toContain('rejected');
      expect(responseBody.status).toBe('rejected');
    });

    test('should process request changes moderation decision', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { id: 'listing-123' },
        path: '/listings/listing-123/moderate',
        body: JSON.stringify({
          action: 'request_changes',
          reason: 'Missing required information',
          publicNotes: 'Please add more detailed boat specifications',
          requiredChanges: ['Add engine hours', 'Include more photos']
        }),
        requestContext: { requestId: 'test-request' } as any,
      };

      mockDb.getListing.mockResolvedValue({
        listingId: 'listing-123',
        ownerId: 'owner-123',
        title: 'Test Boat',
        status: 'pending_moderation'
      } as any);
      mockDb.updateListing.mockResolvedValue();
      mockDb.updateModerationStatus.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toContain('returned for changes');
      expect(responseBody.status).toBe('pending_moderation');
    });

    test('should allow resubmission after changes requested', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { id: 'listing-123' },
        path: '/listings/listing-123/resubmit',
        body: JSON.stringify({}),
        requestContext: { requestId: 'test-request' } as any,
      };

      mockDb.getListing.mockResolvedValue({
        listingId: 'listing-123',
        ownerId: 'test-user-123',
        title: 'Test Boat',
        moderationWorkflow: { status: 'changes_requested' }
      } as any);
      mockDb.updateListing.mockResolvedValue();
      mockDb.createModerationQueue.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toContain('resubmitted');
      expect(responseBody.status).toBe('pending_review');
      expect(mockDb.createModerationQueue).toHaveBeenCalled();
    });
  });

  describe('SEO Slug Generation', () => {
    test('should retrieve listing by slug', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        pathParameters: { slug: 'beautiful-sailboat-2023' },
        path: '/listings/slug/beautiful-sailboat-2023',
        requestContext: { requestId: 'test-request' } as any,
      };

      const mockListing = {
        listingId: 'listing-123',
        ownerId: 'owner-123',
        title: 'Beautiful Sailboat 2023',
        slug: 'beautiful-sailboat-2023',
        price: 85000
      };

      mockDb.getListingBySlug.mockResolvedValue(mockListing as any);
      mockDb.incrementViews.mockResolvedValue();
      mockDb.getUser.mockResolvedValue({
        id: 'owner-123',
        name: 'John Doe',
        email: 'john@example.com'
      } as any);
      mockDb.getEnginesByListing.mockResolvedValue([{
        engineId: 'engine-1',
        type: 'inboard',
        horsepower: 50,
        fuelType: 'diesel',
        condition: 'good',
        position: 1
      }] as any);

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.listing.slug).toBe('beautiful-sailboat-2023');
      expect(responseBody.listing.totalHorsepower).toBe(50);
      expect(mockDb.incrementViews).toHaveBeenCalledWith('listing-123');
    });

    test('should return 404 for non-existent slug', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        pathParameters: { slug: 'non-existent-boat' },
        path: '/listings/slug/non-existent-boat',
        requestContext: { requestId: 'test-request' } as any,
      };

      mockDb.getListingBySlug.mockResolvedValue(null);

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(404);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Engine Management', () => {
    test('should prevent deletion of the only engine', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'DELETE',
        pathParameters: { id: 'listing-123', engineId: 'engine-1' },
        path: '/listings/listing-123/engines/engine-1',
        requestContext: { requestId: 'test-request' } as any,
      };

      mockDb.getListing.mockResolvedValue({
        listingId: 'listing-123',
        ownerId: 'test-user-123',
        title: 'Test Boat'
      } as any);
      mockDb.getEnginesByListing.mockResolvedValue([{
        engineId: 'engine-1',
        type: 'outboard',
        horsepower: 250,
        fuelType: 'gasoline',
        condition: 'excellent',
        position: 1
      }] as any);

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('INVALID_OPERATION');
      expect(responseBody.error.message).toContain('only engine');
    });

    test('should successfully delete one of multiple engines', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'DELETE',
        pathParameters: { id: 'listing-123', engineId: 'engine-2' },
        path: '/listings/listing-123/engines/engine-2',
        requestContext: { requestId: 'test-request' } as any,
      };

      mockDb.getListing.mockResolvedValue({
        listingId: 'listing-123',
        ownerId: 'test-user-123',
        title: 'Test Boat'
      } as any);
      mockDb.getEnginesByListing.mockResolvedValue([
        {
          engineId: 'engine-1',
          type: 'outboard',
          horsepower: 250,
          fuelType: 'gasoline',
          condition: 'excellent',
          position: 1
        },
        {
          engineId: 'engine-2',
          type: 'outboard',
          horsepower: 250,
          fuelType: 'gasoline',
          condition: 'excellent',
          position: 2
        }
      ] as any);
      mockDb.deleteEngine.mockResolvedValue();
      mockDb.updateListingWithEngines.mockResolvedValue();

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.remainingEngines).toBe(1);
      expect(responseBody.totalHorsepower).toBe(250);
      expect(responseBody.engineConfiguration).toBe('single');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing required fields', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        body: JSON.stringify({
          title: 'Incomplete Boat',
          // Missing required fields
        }),
        requestContext: { requestId: 'test-request' } as any,
        pathParameters: null,
      };

      // Mock validateRequired to throw error
      const { validateRequired } = require('../shared/utils');
      validateRequired.mockImplementation(() => {
        throw new Error('Missing required fields: description, price, location, boatDetails');
      });

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('VALIDATION_ERROR');
    });

    test('should handle unauthorized access', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'PUT',
        pathParameters: { id: 'listing-123' },
        body: JSON.stringify({ title: 'Updated Title' }),
        requestContext: { requestId: 'test-request' } as any,
      };

      mockDb.getListing.mockResolvedValue({
        listingId: 'listing-123',
        ownerId: 'different-user',
        title: 'Test Boat'
      } as any);

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(403);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('FORBIDDEN');
    });

    test('should handle database errors gracefully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        pathParameters: { id: 'listing-123' },
        requestContext: { requestId: 'test-request' } as any,
      };

      mockDb.getListing.mockRejectedValue(new Error('Database connection failed'));

      const result = await handler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('DATABASE_ERROR');
    });
  });
});