/**
 * @fileoverview Boat listing management service for HarborList marketplace.
 * 
 * Provides comprehensive CRUD operations for boat listings including:
 * - Listing creation with validation and sanitization
 * - Listing retrieval with view tracking
 * - Listing updates with ownership verification
 * - Listing deletion with authorization checks
 * - Pagination support for listing queries
 * - Data validation for boat specifications
 * - Image and media management integration
 * 
 * Security Features:
 * - User authentication and authorization
 * - Ownership verification for modifications
 * - Input sanitization to prevent XSS attacks
 * - Data validation for business rules
 * - Audit trail for listing operations
 * 
 * Business Rules:
 * - Price validation ($1 - $10,000,000)
 * - Year validation (1900 - current year + 1)
 * - Required field validation for boat details
 * - Location information requirements
 * - Image and media file management
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { db } from '../shared/database';
import { createResponse, createErrorResponse, parseBody, getUserId, generateId, validateRequired, sanitizeString, validatePrice, validateYear } from '../shared/utils';
import { Listing } from '../types/common';

/**
 * Main Lambda handler for boat listing operations
 * 
 * Handles all CRUD operations for boat listings with proper authentication,
 * authorization, and data validation. Supports RESTful API patterns with
 * comprehensive error handling and response formatting.
 * 
 * Supported operations:
 * - GET /listings - Retrieve paginated list of listings
 * - GET /listings/{id} - Retrieve specific listing with view tracking
 * - POST /listings - Create new listing (authenticated users only)
 * - PUT /listings/{id} - Update existing listing (owner only)
 * - DELETE /listings/{id} - Delete listing (owner only)
 * 
 * @param event - API Gateway proxy event containing request details
 * @returns Promise<APIGatewayProxyResult> - Standardized API response
 * 
 * @throws {Error} When database operations fail or validation errors occur
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const method = event.httpMethod;
    const pathParameters = event.pathParameters || {};

    // CORS preflight requests are handled by API Gateway

    switch (method) {
      case 'GET':
        if (pathParameters.id) {
          return await getListing(pathParameters.id, requestId);
        } else {
          return await getListings(event, requestId);
        }

      case 'POST':
        return await createListing(event, requestId);

      case 'PUT':
        if (!pathParameters.id) {
          return createErrorResponse(400, 'MISSING_ID', 'Listing ID is required', requestId);
        }
        return await updateListing(pathParameters.id, event, requestId);

      case 'DELETE':
        if (!pathParameters.id) {
          return createErrorResponse(400, 'MISSING_ID', 'Listing ID is required', requestId);
        }
        return await deleteListing(pathParameters.id, event, requestId);

      default:
        return createErrorResponse(405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed`, requestId);
    }
  } catch (error) {
    console.error('Error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }
};

/**
 * Retrieves a specific boat listing by ID with view tracking
 * 
 * Fetches listing details from the database and automatically increments
 * the view counter for analytics purposes. Returns comprehensive listing
 * information including boat specifications, images, and location data.
 * 
 * @param listingId - Unique identifier for the boat listing
 * @param requestId - Request tracking identifier for logging
 * @returns Promise<APIGatewayProxyResult> - Listing data or error response
 * 
 * @throws {Error} When database operations fail or listing not found
 */
async function getListing(listingId: string, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const listing = await db.getListing(listingId);
    
    if (!listing) {
      return createErrorResponse(404, 'NOT_FOUND', 'Listing not found', requestId);
    }

    // Increment view count
    await db.incrementViews(listingId);

    // Fetch owner information
    let listingWithOwner = listing;
    try {
      const owner = await db.getUser(listing.ownerId);
      listingWithOwner = {
        ...listing,
        owner: owner ? {
          id: owner.id,
          name: owner.name,
          email: owner.email
        } : null
      } as any;
    } catch (error) {
      console.warn(`Failed to fetch owner for listing ${listingId}:`, error);
    }

    return createResponse(200, { listing: listingWithOwner });
  } catch (error) {
    console.error('Error getting listing:', error);
    return createErrorResponse(500, 'DATABASE_ERROR', 'Failed to retrieve listing', requestId);
  }
}

async function getListings(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    const limit = parseInt(queryParams.limit || '20');
    const nextToken = queryParams.nextToken;

    let lastKey;
    if (nextToken) {
      try {
        lastKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
      } catch (error) {
        return createErrorResponse(400, 'INVALID_TOKEN', 'Invalid pagination token', requestId);
      }
    }

    const result = await db.getListings(limit, lastKey);
    
    // Fetch owner information for each listing
    const listingsWithOwners = await Promise.all(
      result.listings.map(async (listing: any) => {
        try {
          const owner = await db.getUser(listing.ownerId);
          return {
            ...listing,
            owner: owner ? {
              id: owner.id,
              name: owner.name,
              email: owner.email // Optional: include email if needed
            } : null
          };
        } catch (error) {
          console.warn(`Failed to fetch owner for listing ${listing.listingId}:`, error);
          return {
            ...listing,
            owner: null
          };
        }
      })
    );
    
    const response: any = {
      listings: listingsWithOwners,
      total: listingsWithOwners.length,
    };

    if (result.lastKey) {
      response.nextToken = Buffer.from(JSON.stringify(result.lastKey)).toString('base64');
    }

    return createResponse(200, response);
  } catch (error) {
    console.error('Error getting listings:', error);
    return createErrorResponse(500, 'DATABASE_ERROR', 'Failed to retrieve listings', requestId);
  }
}

/**
 * Creates a new boat listing with comprehensive validation
 * 
 * Validates all required fields, sanitizes user input, and creates a new
 * listing record in the database. Performs business rule validation for
 * pricing, boat specifications, and location information.
 * 
 * Required fields:
 * - title: Listing title (sanitized)
 * - description: Detailed description (sanitized)
 * - price: Boat price ($1 - $10,000,000)
 * - location: City, state, optional zip code
 * - boatDetails: Type, year, length, condition
 * 
 * Optional fields:
 * - features: Array of boat features
 * - images: Array of image URLs
 * - videos: Array of video URLs
 * - manufacturer, model, engine details
 * 
 * @param event - API Gateway event containing listing data and user context
 * @param requestId - Request tracking identifier for logging
 * @returns Promise<APIGatewayProxyResult> - Created listing ID or error response
 * 
 * @throws {Error} When validation fails or database operations fail
 */
async function createListing(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const body = parseBody<Partial<Listing>>(event);

    // Validate required fields
    validateRequired(body, ['title', 'description', 'price', 'location', 'boatDetails']);
    validateRequired(body.location!, ['city', 'state']);
    validateRequired(body.boatDetails!, ['type', 'year', 'length', 'condition']);

    // Validate data
    if (!validatePrice(body.price!)) {
      return createErrorResponse(400, 'INVALID_PRICE', 'Price must be between $1 and $10,000,000', requestId);
    }

    if (!validateYear(body.boatDetails!.year)) {
      return createErrorResponse(400, 'INVALID_YEAR', 'Year must be between 1900 and current year + 1', requestId);
    }

    const listing: Listing = {
      listingId: generateId(),
      ownerId: userId,
      title: sanitizeString(body.title!),
      description: sanitizeString(body.description!),
      price: body.price!,
      location: {
        city: sanitizeString(body.location!.city),
        state: body.location!.state,
        zipCode: body.location!.zipCode ? sanitizeString(body.location!.zipCode) : undefined,
        coordinates: body.location!.coordinates,
      },
      boatDetails: {
        type: body.boatDetails!.type,
        manufacturer: body.boatDetails!.manufacturer ? sanitizeString(body.boatDetails!.manufacturer) : undefined,
        model: body.boatDetails!.model ? sanitizeString(body.boatDetails!.model) : undefined,
        year: body.boatDetails!.year,
        length: body.boatDetails!.length,
        beam: body.boatDetails!.beam,
        draft: body.boatDetails!.draft,
        engine: body.boatDetails!.engine ? sanitizeString(body.boatDetails!.engine) : undefined,
        hours: body.boatDetails!.hours,
        condition: body.boatDetails!.condition,
      },
      features: body.features?.map(f => sanitizeString(f)) || [],
      images: body.images || [],
      videos: body.videos || [],
      thumbnails: body.thumbnails || [],
      status: 'active',
      views: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.createListing(listing);

    return createResponse(201, { listingId: listing.listingId });
  } catch (error) {
    console.error('Error creating listing:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Missing required fields')) {
        return createErrorResponse(400, 'VALIDATION_ERROR', error.message, requestId);
      }
      if (error.message.includes('User not authenticated')) {
        return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
      }
    }

    return createErrorResponse(500, 'DATABASE_ERROR', 'Failed to create listing', requestId);
  }
}

async function updateListing(listingId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const body = parseBody<Partial<Listing>>(event);

    // Check if listing exists and user owns it
    const existingListing = await db.getListing(listingId);
    if (!existingListing) {
      return createErrorResponse(404, 'NOT_FOUND', 'Listing not found', requestId);
    }

    if (existingListing.ownerId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'You can only update your own listings', requestId);
    }

    // Validate updates
    if (body.price && !validatePrice(body.price)) {
      return createErrorResponse(400, 'INVALID_PRICE', 'Price must be between $1 and $10,000,000', requestId);
    }

    if (body.boatDetails?.year && !validateYear(body.boatDetails.year)) {
      return createErrorResponse(400, 'INVALID_YEAR', 'Year must be between 1900 and current year + 1', requestId);
    }

    // Sanitize string fields
    const updates: Partial<Listing> = {
      ...body,
      updatedAt: Date.now(),
    };

    if (updates.title) updates.title = sanitizeString(updates.title);
    if (updates.description) updates.description = sanitizeString(updates.description);
    if (updates.features) updates.features = updates.features.map(f => sanitizeString(f));

    await db.updateListing(listingId, updates);

    return createResponse(200, { message: 'Listing updated successfully' });
  } catch (error) {
    console.error('Error updating listing:', error);
    
    if (error instanceof Error && error.message.includes('User not authenticated')) {
      return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
    }

    return createErrorResponse(500, 'DATABASE_ERROR', 'Failed to update listing', requestId);
  }
}

async function deleteListing(listingId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);

    // Check if listing exists and user owns it
    const existingListing = await db.getListing(listingId);
    if (!existingListing) {
      return createErrorResponse(404, 'NOT_FOUND', 'Listing not found', requestId);
    }

    if (existingListing.ownerId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'You can only delete your own listings', requestId);
    }

    await db.deleteListing(listingId);

    return createResponse(200, { message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Error deleting listing:', error);
    
    if (error instanceof Error && error.message.includes('User not authenticated')) {
      return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
    }

    return createErrorResponse(500, 'DATABASE_ERROR', 'Failed to delete listing', requestId);
  }
}
