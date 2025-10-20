/**
 * @fileoverview Tier management Lambda handlers for admin operations
 * 
 * Provides comprehensive CRUD operations for managing user subscription tiers
 * and their associated features. Handles tier creation, updates, deletion,
 * and feature management with proper validation and access control.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUserFromEvent, requireAdminRole } from '../shared/auth';
import { AdminPermission } from '@harborlist/shared-types';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  region: process.env.AWS_REGION || 'us-east-1',
});

const dynamoDB = DynamoDBDocumentClient.from(client);
const TIERS_TABLE = process.env.TIERS_TABLE_NAME || 'harborlist-user-tiers';

interface TierFeature {
  featureId: string;
  name: string;
  description: string;
  enabled: boolean;
  limits?: Record<string, number>;
}

interface UserTier {
  tierId: string;
  name: string;
  type: 'individual' | 'dealer';
  isPremium: boolean;
  features: TierFeature[];
  limits: {
    maxListings: number;
    maxImages: number;
    priorityPlacement: boolean;
    featuredListings: number;
    analyticsAccess: boolean;
    bulkOperations: boolean;
    advancedSearch: boolean;
    premiumSupport: boolean;
  };
  pricing: {
    monthly?: number;
    yearly?: number;
    currency: string;
  };
  active: boolean;
  description?: string;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Standard API response helper
 */
const response = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify(body),
});

/**
 * Handle authentication and authorization errors
 */
const handleAuthError = (error: Error): APIGatewayProxyResult => {
  const message = error.message.toLowerCase();
  
  if (message.includes('no authentication token') || message.includes('token')) {
    return response(401, {
      success: false,
      message: 'Authentication required',
      error: error.message,
    });
  }
  
  if (message.includes('admin access required') || message.includes('permission')) {
    return response(403, {
      success: false,
      message: 'Insufficient permissions',
      error: 'SYSTEM_CONFIG permission required',
    });
  }
  
  return response(500, {
    success: false,
    message: 'Internal server error',
    error: error.message,
  });
};

/**
 * List all tiers
 * GET /admin/tiers
 */
export const listTiers = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Verify admin authentication
    const user = await getUserFromEvent(event);
    requireAdminRole(user, [AdminPermission.SYSTEM_CONFIG]);

    console.log('Listing all tiers');

    const result = await dynamoDB.send(
      new ScanCommand({
        TableName: TIERS_TABLE,
      })
    );

    const tiers = (result.Items || []).map(item => ({
      ...item,
      isPremium: item.isPremium === 1, // Convert number back to boolean
    })) as UserTier[];
    
    // Sort by displayOrder
    tiers.sort((a, b) => a.displayOrder - b.displayOrder);

    return response(200, {
      success: true,
      tiers,
      count: tiers.length,
    });
  } catch (error) {
    console.error('Error listing tiers:', error);
    if (error instanceof Error) {
      return handleAuthError(error);
    }
    return response(500, {
      success: false,
      message: 'Failed to list tiers',
      error: 'Unknown error',
    });
  }
};

/**
 * Get a specific tier
 * GET /admin/tiers/:tierId
 */
export const getTier = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Verify admin authentication
    const user = await getUserFromEvent(event);
    requireAdminRole(user, [AdminPermission.SYSTEM_CONFIG]);

    const tierId = event.pathParameters?.tierId;

    if (!tierId) {
      return response(400, {
        success: false,
        message: 'Tier ID is required',
      });
    }

    const result = await dynamoDB.send(
      new GetCommand({
        TableName: TIERS_TABLE,
        Key: { tierId },
      })
    );

    if (!result.Item) {
      return response(404, {
        success: false,
        message: 'Tier not found',
      });
    }

    // Convert isPremium number back to boolean
    const tier = {
      ...result.Item,
      isPremium: result.Item.isPremium === 1,
    };

    return response(200, {
      success: true,
      tier,
    });
  } catch (error) {
    console.error('Error getting tier:', error);
    if (error instanceof Error) {
      return handleAuthError(error);
    }
    return response(500, {
      success: false,
      message: 'Failed to get tier',
      error: 'Unknown error',
    });
  }
};

/**
 * Create a new tier
 * POST /admin/tiers
 */
export const createTier = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Verify admin authentication
    const user = await getUserFromEvent(event);
    requireAdminRole(user, [AdminPermission.SYSTEM_CONFIG]);

    if (!event.body) {
      return response(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const tierData: UserTier = JSON.parse(event.body);

    // Validate required fields
    if (!tierData.tierId || !tierData.name || !tierData.type) {
      return response(400, {
        success: false,
        message: 'tierId, name, and type are required',
      });
    }

    // Check if tier already exists
    const existing = await dynamoDB.send(
      new GetCommand({
        TableName: TIERS_TABLE,
        Key: { tierId: tierData.tierId },
      })
    );

    if (existing.Item) {
      return response(409, {
        success: false,
        message: 'Tier with this ID already exists',
      });
    }

    // Set timestamps
    const now = new Date().toISOString();
    const tier: UserTier = {
      ...tierData,
      features: tierData.features || [],
      createdAt: now,
      updatedAt: now,
    };

    // Convert boolean isPremium to number for DynamoDB GSI
    const tierWithNumericPremium = {
      ...tier,
      isPremium: tier.isPremium ? 1 : 0,
    };

    await dynamoDB.send(
      new PutCommand({
        TableName: TIERS_TABLE,
        Item: tierWithNumericPremium,
      })
    );

    return response(201, {
      success: true,
      message: 'Tier created successfully',
      tier,
    });
  } catch (error) {
    console.error('Error creating tier:', error);
    return response(500, {
      success: false,
      message: 'Failed to create tier',
      error: error instanceof Error ? (handleAuthError(error).body ? JSON.parse(handleAuthError(error).body).error : error.message) : 'Unknown error',
    });
  }
};

/**
 * Update an existing tier
 * PUT /admin/tiers/:tierId
 */
export const updateTier = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Verify admin authentication
    const user = await getUserFromEvent(event);
    requireAdminRole(user, [AdminPermission.SYSTEM_CONFIG]);

    const tierId = event.pathParameters?.tierId;

    if (!tierId) {
      return response(400, {
        success: false,
        message: 'Tier ID is required',
      });
    }

    if (!event.body) {
      return response(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const updates = JSON.parse(event.body);

    // Check if tier exists
    const existing = await dynamoDB.send(
      new GetCommand({
        TableName: TIERS_TABLE,
        Key: { tierId },
      })
    );

    if (!existing.Item) {
      return response(404, {
        success: false,
        message: 'Tier not found',
      });
    }

    // Update the tier
    const updatedTier = {
      ...existing.Item,
      ...updates,
      tierId, // Prevent changing the ID
      updatedAt: new Date().toISOString(),
    };

    // Convert boolean isPremium to number for DynamoDB GSI if it exists
    if ('isPremium' in updatedTier) {
      updatedTier.isPremium = updatedTier.isPremium ? 1 : 0;
    }

    await dynamoDB.send(
      new PutCommand({
        TableName: TIERS_TABLE,
        Item: updatedTier,
      })
    );

    return response(200, {
      success: true,
      message: 'Tier updated successfully',
      tier: updatedTier,
    });
  } catch (error) {
    console.error('Error updating tier:', error);
    return response(500, {
      success: false,
      message: 'Failed to update tier',
      error: error instanceof Error ? (handleAuthError(error).body ? JSON.parse(handleAuthError(error).body).error : error.message) : 'Unknown error',
    });
  }
};

/**
 * Delete a tier
 * DELETE /admin/tiers/:tierId
 */
export const deleteTier = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Verify admin authentication
    const user = await getUserFromEvent(event);
    requireAdminRole(user, [AdminPermission.SYSTEM_CONFIG]);

    const tierId = event.pathParameters?.tierId;

    if (!tierId) {
      return response(400, {
        success: false,
        message: 'Tier ID is required',
      });
    }

    // Check if tier exists
    const existing = await dynamoDB.send(
      new GetCommand({
        TableName: TIERS_TABLE,
        Key: { tierId },
      })
    );

    if (!existing.Item) {
      return response(404, {
        success: false,
        message: 'Tier not found',
      });
    }

    // TODO: Check if any users are assigned to this tier
    // If so, prevent deletion or reassign users

    await dynamoDB.send(
      new DeleteCommand({
        TableName: TIERS_TABLE,
        Key: { tierId },
      })
    );

    return response(200, {
      success: true,
      message: 'Tier deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting tier:', error);
    return response(500, {
      success: false,
      message: 'Failed to delete tier',
      error: error instanceof Error ? (handleAuthError(error).body ? JSON.parse(handleAuthError(error).body).error : error.message) : 'Unknown error',
    });
  }
};

/**
 * Add a feature to a tier
 * POST /admin/tiers/:tierId/features
 */
export const addFeatureToTier = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Verify admin authentication
    const user = await getUserFromEvent(event);
    requireAdminRole(user, [AdminPermission.SYSTEM_CONFIG]);

    const tierId = event.pathParameters?.tierId;

    if (!tierId) {
      return response(400, {
        success: false,
        message: 'Tier ID is required',
      });
    }

    if (!event.body) {
      return response(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const feature: TierFeature = JSON.parse(event.body);

    // Check if tier exists
    const result = await dynamoDB.send(
      new GetCommand({
        TableName: TIERS_TABLE,
        Key: { tierId },
      })
    );

    if (!result.Item) {
      return response(404, {
        success: false,
        message: 'Tier not found',
      });
    }

    const tier = result.Item as UserTier;

    // Check if feature already exists
    if (tier.features.some((f) => f.featureId === feature.featureId)) {
      return response(409, {
        success: false,
        message: 'Feature already exists in this tier',
      });
    }

    // Add the feature
    tier.features.push(feature);
    tier.updatedAt = new Date().toISOString();

    await dynamoDB.send(
      new PutCommand({
        TableName: TIERS_TABLE,
        Item: tier,
      })
    );

    return response(200, {
      success: true,
      message: 'Feature added successfully',
      tier,
    });
  } catch (error) {
    console.error('Error adding feature to tier:', error);
    return response(500, {
      success: false,
      message: 'Failed to add feature to tier',
      error: error instanceof Error ? (handleAuthError(error).body ? JSON.parse(handleAuthError(error).body).error : error.message) : 'Unknown error',
    });
  }
};

/**
 * Remove a feature from a tier
 * DELETE /admin/tiers/:tierId/features/:featureId
 */
export const removeFeatureFromTier = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Verify admin authentication
    const user = await getUserFromEvent(event);
    requireAdminRole(user, [AdminPermission.SYSTEM_CONFIG]);

    const tierId = event.pathParameters?.tierId;
    const featureId = event.pathParameters?.featureId;

    if (!tierId || !featureId) {
      return response(400, {
        success: false,
        message: 'Tier ID and Feature ID are required',
      });
    }

    // Check if tier exists
    const result = await dynamoDB.send(
      new GetCommand({
        TableName: TIERS_TABLE,
        Key: { tierId },
      })
    );

    if (!result.Item) {
      return response(404, {
        success: false,
        message: 'Tier not found',
      });
    }

    const tier = result.Item as UserTier;

    // Remove the feature
    const originalLength = tier.features.length;
    tier.features = tier.features.filter((f) => f.featureId !== featureId);

    if (tier.features.length === originalLength) {
      return response(404, {
        success: false,
        message: 'Feature not found in this tier',
      });
    }

    tier.updatedAt = new Date().toISOString();

    await dynamoDB.send(
      new PutCommand({
        TableName: TIERS_TABLE,
        Item: tier,
      })
    );

    return response(200, {
      success: true,
      message: 'Feature removed successfully',
      tier,
    });
  } catch (error) {
    console.error('Error removing feature from tier:', error);
    return response(500, {
      success: false,
      message: 'Failed to remove feature from tier',
      error: error instanceof Error ? (handleAuthError(error).body ? JSON.parse(handleAuthError(error).body).error : error.message) : 'Unknown error',
    });
  }
};

/**
 * Get available features library
 * GET /admin/features
 */
export const getAvailableFeatures = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Verify admin authentication
    const user = await getUserFromEvent(event);
    requireAdminRole(user, [AdminPermission.SYSTEM_CONFIG]);

    const features: TierFeature[] = [
      {
        featureId: 'priority_placement',
        name: 'Priority Placement',
        description: 'Listings appear higher in search results',
        enabled: true,
      },
      {
        featureId: 'featured_listings',
        name: 'Featured Listings',
        description: 'Showcase listings in premium spots',
        enabled: true,
      },
      {
        featureId: 'analytics_access',
        name: 'Advanced Analytics',
        description: 'Detailed insights and performance metrics',
        enabled: true,
      },
      {
        featureId: 'comparable_listings',
        name: 'Market Comparables',
        description: 'See similar boats on the market with real-time pricing comparisons',
        enabled: true,
        limits: { maxComparables: 5 },
      },
      {
        featureId: 'premium_support',
        name: 'Premium Support',
        description: 'Priority customer support with faster response times',
        enabled: true,
      },
      {
        featureId: 'bulk_operations',
        name: 'Bulk Operations',
        description: 'Manage multiple listings at once',
        enabled: true,
      },
      {
        featureId: 'virtual_tours',
        name: 'Virtual Tours',
        description: '360° virtual tours and immersive media',
        enabled: true,
      },
      {
        featureId: 'lead_management',
        name: 'Lead Management',
        description: 'Advanced CRM and lead tracking tools',
        enabled: true,
      },
    ];

    return response(200, {
      success: true,
      features,
      count: features.length,
    });
  } catch (error) {
    console.error('Error getting available features:', error);
    return response(500, {
      success: false,
      message: 'Failed to get available features',
      error: error instanceof Error ? (handleAuthError(error).body ? JSON.parse(handleAuthError(error).body).error : error.message) : 'Unknown error',
    });
  }
};

/**
 * Initialize default tiers
 * POST /admin/tiers/initialize
 */
export const initializeDefaultTiers = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Verify admin authentication
    const user = await getUserFromEvent(event);
    requireAdminRole(user, [AdminPermission.SYSTEM_CONFIG]);

    const defaultTiers: UserTier[] = [
      {
        tierId: 'free-individual',
        name: 'Free Individual',
        type: 'individual',
        isPremium: false,
        features: [],
        limits: {
          maxListings: 3,
          maxImages: 5,
          priorityPlacement: false,
          featuredListings: 0,
          analyticsAccess: false,
          bulkOperations: false,
          advancedSearch: false,
          premiumSupport: false,
        },
        pricing: {
          monthly: 0,
          currency: 'USD',
        },
        active: true,
        description: 'Perfect for private sellers with a few boats',
        displayOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        tierId: 'premium-individual',
        name: 'Premium Individual',
        type: 'individual',
        isPremium: true,
        features: [
          {
            featureId: 'priority_placement',
            name: 'Priority Placement',
            description: 'Listings appear higher in search results',
            enabled: true,
          },
          {
            featureId: 'analytics_access',
            name: 'Advanced Analytics',
            description: 'Detailed insights and performance metrics',
            enabled: true,
          },
          {
            featureId: 'comparable_listings',
            name: 'Market Comparables',
            description: 'See similar boats on the market with real-time pricing comparisons',
            enabled: true,
            limits: { maxComparables: 5 },
          },
        ],
        limits: {
          maxListings: 25,
          maxImages: 20,
          priorityPlacement: true,
          featuredListings: 3,
          analyticsAccess: true,
          bulkOperations: true,
          advancedSearch: true,
          premiumSupport: true,
        },
        pricing: {
          monthly: 9.99,
          yearly: 99,
          currency: 'USD',
        },
        active: true,
        description: 'For serious sellers who want maximum visibility',
        displayOrder: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        tierId: 'free-dealer',
        name: 'Free Dealer',
        type: 'dealer',
        isPremium: false,
        features: [],
        limits: {
          maxListings: 10,
          maxImages: 10,
          priorityPlacement: false,
          featuredListings: 0,
          analyticsAccess: false,
          bulkOperations: false,
          advancedSearch: false,
          premiumSupport: false,
        },
        pricing: {
          monthly: 0,
          currency: 'USD',
        },
        active: true,
        description: 'Get started with dealer features',
        displayOrder: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        tierId: 'premium-dealer',
        name: 'Premium Dealer',
        type: 'dealer',
        isPremium: true,
        features: [
          {
            featureId: 'priority_placement',
            name: 'Priority Placement',
            description: 'Listings appear higher in search results',
            enabled: true,
          },
          {
            featureId: 'featured_listings',
            name: 'Featured Listings',
            description: 'Showcase listings in premium spots',
            enabled: true,
          },
          {
            featureId: 'analytics_access',
            name: 'Advanced Analytics',
            description: 'Detailed insights and performance metrics',
            enabled: true,
          },
          {
            featureId: 'comparable_listings',
            name: 'Market Comparables',
            description: 'See similar boats on the market with real-time pricing comparisons',
            enabled: true,
            limits: { maxComparables: 10 },
          },
          {
            featureId: 'bulk_operations',
            name: 'Bulk Operations',
            description: 'Manage multiple listings at once',
            enabled: true,
          },
          {
            featureId: 'lead_management',
            name: 'Lead Management',
            description: 'Advanced CRM and lead tracking tools',
            enabled: true,
          },
        ],
        limits: {
          maxListings: 100,
          maxImages: 30,
          priorityPlacement: true,
          featuredListings: 10,
          analyticsAccess: true,
          bulkOperations: true,
          advancedSearch: true,
          premiumSupport: true,
        },
        pricing: {
          monthly: 49.99,
          yearly: 499,
          currency: 'USD',
        },
        active: true,
        description: 'Full-featured dealer solution with advanced tools',
        displayOrder: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Insert all default tiers
    for (const tier of defaultTiers) {
      // Check if tier already exists
      const existing = await dynamoDB.send(
        new GetCommand({
          TableName: TIERS_TABLE,
          Key: { tierId: tier.tierId },
        })
      );

      if (!existing.Item) {
        // Convert boolean isPremium to number for DynamoDB GSI
        const tierWithNumericPremium = {
          ...tier,
          isPremium: tier.isPremium ? 1 : 0,
        };
        
        await dynamoDB.send(
          new PutCommand({
            TableName: TIERS_TABLE,
            Item: tierWithNumericPremium,
          })
        );
      }
    }

    return response(200, {
      success: true,
      message: 'Default tiers initialized successfully',
      tiers: defaultTiers,
    });
  } catch (error) {
    console.error('Error initializing default tiers:', error);
    return response(500, {
      success: false,
      message: 'Failed to initialize default tiers',
      error: error instanceof Error ? (handleAuthError(error).body ? JSON.parse(handleAuthError(error).body).error : error.message) : 'Unknown error',
    });
  }
};

/**
 * Main Lambda handler that routes requests to appropriate tier functions
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const path = event.path;

  console.log(`Tier handler: ${method} ${path}`);

  try {
    // Initialize default tiers
    if (method === 'POST' && path.includes('/initialize')) {
      return await initializeDefaultTiers(event);
    }

    // Get available features library
    if (method === 'GET' && path.includes('/features') && !path.includes('/tiers/')) {
      return await getAvailableFeatures(event);
    }

    // Feature management for specific tier
    if (path.includes('/features') && event.pathParameters?.tierId) {
      if (method === 'POST') {
        return await addFeatureToTier(event);
      }
      if (method === 'DELETE') {
        return await removeFeatureFromTier(event);
      }
    }

    // Tier CRUD operations
    if (event.pathParameters?.tierId) {
      switch (method) {
        case 'GET':
          return await getTier(event);
        case 'PUT':
          return await updateTier(event);
        case 'DELETE':
          return await deleteTier(event);
        default:
          return response(405, { message: 'Method not allowed' });
      }
    }

    // List all tiers or create new tier
    switch (method) {
      case 'GET':
        return await listTiers(event);
      case 'POST':
        return await createTier(event);
      default:
        return response(405, { message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Tier handler error:', error);
    return response(500, {
      message: 'Internal server error',
      error: error instanceof Error ? (handleAuthError(error).body ? JSON.parse(handleAuthError(error).body).error : error.message) : 'Unknown error',
    });
  }
};
