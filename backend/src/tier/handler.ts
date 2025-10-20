/**
 * @fileoverview Main Lambda handler router for tier management
 * Routes requests to appropriate tier management functions
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  listTiers,
  getTier,
  createTier,
  updateTier,
  deleteTier,
  addFeatureToTier,
  removeFeatureFromTier,
  getAvailableFeatures,
  initializeDefaultTiers,
} from './index';

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
          return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Method not allowed' }),
          };
      }
    }

    // List all tiers or create new tier
    switch (method) {
      case 'GET':
        return await listTiers(event);
      case 'POST':
        return await createTier(event);
      default:
        return {
          statusCode: 405,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('Tier handler error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
