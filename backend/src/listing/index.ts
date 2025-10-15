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
import { Listing, Engine, EnhancedListing } from '@harborlist/shared-types';

/**
 * Helper function to validate engine specifications
 * 
 * Validates individual engine data including required fields,
 * horsepower limits, and configuration consistency.
 * 
 * @param engine - Engine object to validate
 * @returns boolean - True if engine is valid
 */
function validateEngine(engine: Engine): boolean {
  if (!engine.type || !engine.horsepower || !engine.fuelType || !engine.condition || !engine.position) {
    return false;
  }

  // Validate horsepower range (1-2000 HP)
  if (engine.horsepower < 1 || engine.horsepower > 2000) {
    return false;
  }

  // Validate position is positive integer
  if (engine.position < 1 || !Number.isInteger(engine.position)) {
    return false;
  }

  // Validate engine type
  const validTypes = ['outboard', 'inboard', 'sterndrive', 'jet', 'electric', 'hybrid'];
  if (!validTypes.includes(engine.type)) {
    return false;
  }

  // Validate fuel type
  const validFuelTypes = ['gasoline', 'diesel', 'electric', 'hybrid'];
  if (!validFuelTypes.includes(engine.fuelType)) {
    return false;
  }

  // Validate condition
  const validConditions = ['excellent', 'good', 'fair', 'needs_work'];
  if (!validConditions.includes(engine.condition)) {
    return false;
  }

  return true;
}

/**
 * Helper function to calculate total horsepower from engines array
 * 
 * @param engines - Array of engine objects
 * @returns number - Total horsepower across all engines
 */
function calculateTotalHorsepower(engines: Engine[]): number {
  return engines.reduce((total, engine) => total + engine.horsepower, 0);
}

/**
 * Helper function to determine engine configuration
 * 
 * @param engineCount - Number of engines
 * @returns string - Engine configuration type
 */
function determineEngineConfiguration(engineCount: number): 'single' | 'twin' | 'triple' | 'quad' {
  switch (engineCount) {
    case 1: return 'single';
    case 2: return 'twin';
    case 3: return 'triple';
    case 4: return 'quad';
    default: return 'single';
  }
}

/**
 * Helper function to generate SEO-friendly URL slug with uniqueness validation
 * 
 * Creates a URL-safe slug from the listing title and ensures uniqueness
 * by appending a suffix if needed.
 * 
 * @param title - Listing title to convert to slug
 * @param listingId - Unique listing ID for fallback
 * @returns Promise<string> - SEO-friendly URL slug
 */
async function generateUniqueSlug(title: string, listingId: string): Promise<string> {
  // Convert to lowercase and replace spaces/special chars with hyphens
  let baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Ensure slug is not empty and has reasonable length
  if (!baseSlug || baseSlug.length < 3) {
    baseSlug = `boat-${listingId.slice(-8)}`;
  } else if (baseSlug.length > 60) {
    baseSlug = baseSlug.substring(0, 60).replace(/-[^-]*$/, '');
  }

  // Check for uniqueness and append suffix if needed
  let slug = baseSlug;
  let counter = 1;
  
  while (await db.getListingBySlug(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    
    // Prevent infinite loop
    if (counter > 100) {
      slug = `${baseSlug}-${listingId.slice(-8)}`;
      break;
    }
  }

  return slug;
}

/**
 * Helper function to generate SEO-friendly URL slug (synchronous version)
 * 
 * Creates a URL-safe slug from the listing title for immediate use.
 * Used when uniqueness validation is not required.
 * 
 * @param title - Listing title to convert to slug
 * @param listingId - Unique listing ID for fallback
 * @returns string - SEO-friendly URL slug
 */
function generateSlug(title: string, listingId: string): string {
  // Convert to lowercase and replace spaces/special chars with hyphens
  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Ensure slug is not empty and has reasonable length
  if (!slug || slug.length < 3) {
    slug = `boat-${listingId.slice(-8)}`;
  } else if (slug.length > 60) {
    slug = slug.substring(0, 60).replace(/-[^-]*$/, '');
  }

  return slug;
}

/**
 * Helper function to validate engines array consistency
 * 
 * Ensures engines have unique positions and consistent configuration.
 * 
 * @param engines - Array of engines to validate
 * @returns string | null - Error message or null if valid
 */
function validateEnginesArray(engines: Engine[]): string | null {
  if (!engines || engines.length === 0) {
    return 'At least one engine must be specified';
  }

  if (engines.length > 4) {
    return 'Maximum of 4 engines supported';
  }

  // Check for unique positions
  const positions = engines.map(e => e.position);
  const uniquePositions = new Set(positions);
  if (positions.length !== uniquePositions.size) {
    return 'Engine positions must be unique';
  }

  // Validate each engine
  for (const engine of engines) {
    if (!validateEngine(engine)) {
      return `Invalid engine configuration at position ${engine.position}`;
    }
  }

  return null;
}

/**
 * Main Lambda handler for boat listing operations
 * 
 * Handles all CRUD operations for boat listings with proper authentication,
 * authorization, and data validation. Supports RESTful API patterns with
 * comprehensive error handling and response formatting.
 * 
 * Enhanced with multi-engine support, content moderation workflow,
 * and SEO-friendly URL generation.
 * 
 * Supported operations:
 * - GET /listings - Retrieve paginated list of listings
 * - GET /listings/{id} - Retrieve specific listing with view tracking
 * - GET /listings/slug/{slug} - Retrieve listing by SEO slug
 * - POST /listings - Create new listing (authenticated users only)
 * - PUT /listings/{id} - Update existing listing (owner only)
 * - DELETE /listings/{id} - Delete listing (owner only)
 * - POST /listings/{id}/engines - Add/update engines for listing
 * - DELETE /listings/{id}/engines/{engineId} - Remove engine from listing
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
        if (pathParameters.slug && event.path?.includes('/slug/')) {
          return await getListingBySlug(pathParameters.slug, requestId, event);
        } else if (pathParameters.id) {
          // Check if this is a legacy ID-based URL that should redirect to slug
          return await getListingWithRedirect(pathParameters.id, requestId, event);
        } else {
          return await getListings(event, requestId);
        }

      case 'POST':
        if (pathParameters.id && event.path?.includes('/engines')) {
          return await manageListingEngines(pathParameters.id, event, requestId);
        }
        if (pathParameters.id && event.path?.includes('/moderate')) {
          return await processModerationDecision(pathParameters.id, event, requestId);
        }
        if (pathParameters.id && event.path?.includes('/resubmit')) {
          return await resubmitForModeration(pathParameters.id, event, requestId);
        }
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
        if (pathParameters.engineId && event.path?.includes('/engines/')) {
          return await deleteListingEngine(pathParameters.id, pathParameters.engineId, event, requestId);
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
async function getListing(listingId: string, requestId: string, event?: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const listing = await db.getListing(listingId) as EnhancedListing;
    
    if (!listing) {
      return createErrorResponse(404, 'NOT_FOUND', 'Listing not found', requestId);
    }

    // Check if listing is pending moderation
    const isPending = listing.status === 'pending_moderation' || 
                      listing.moderationWorkflow?.status === 'pending_review' ||
                      listing.moderationWorkflow?.status === 'changes_requested';
    
    if (isPending) {
      // Get current user ID if authenticated
      let currentUserId: string | null = null;
      try {
        currentUserId = event ? getUserId(event) : null;
      } catch (error) {
        // User not authenticated
      }

      // Only allow owner or admin to view pending listings
      if (!currentUserId || currentUserId !== listing.ownerId) {
        // Check if user is admin (you can add admin role check here)
        return createErrorResponse(404, 'NOT_FOUND', 'Listing not found', requestId);
      }
    }

    // Increment view count only for active/approved listings
    if (!isPending) {
      await db.incrementViews(listingId);
    }

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

/**
 * Retrieves a specific boat listing by SEO slug
 * 
 * Fetches listing details using the SEO-friendly slug instead of internal ID.
 * Provides clean URLs for better user experience and SEO optimization.
 * Respects moderation workflow - only owners can see pending listings.
 * 
 * @param slug - SEO-friendly URL slug for the listing
 * @param requestId - Request tracking identifier for logging
 * @param event - API Gateway event for authentication context
 * @returns Promise<APIGatewayProxyResult> - Listing data or error response
 * 
 * @throws {Error} When database operations fail or listing not found
 */
async function getListingBySlug(slug: string, requestId: string, event?: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Query listings by slug using GSI
    let result = await db.getListingBySlug(slug) as EnhancedListing;
    
    if (!result) {
      // Check if this is an old slug that should redirect
      const redirect = await db.getSlugRedirect(slug);
      if (redirect) {
        // Return 301 permanent redirect to new slug
        return {
          statusCode: 301,
          headers: {
            'Location': `/listings/slug/${redirect.newSlug}`,
            'Cache-Control': 'public, max-age=31536000', // Cache redirect for 1 year
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Listing URL has changed',
            redirectTo: `/listings/slug/${redirect.newSlug}`,
            oldSlug: slug,
            newSlug: redirect.newSlug,
            listingId: redirect.listingId,
          }),
        };
      }
      
      return createErrorResponse(404, 'NOT_FOUND', 'Listing not found', requestId);
    }

    // Check if listing is pending moderation
    const isPending = result.status === 'pending_moderation' || 
                      result.moderationWorkflow?.status === 'pending_review' ||
                      result.moderationWorkflow?.status === 'changes_requested';
    
    if (isPending) {
      // Get current user ID if authenticated
      let currentUserId: string | null = null;
      try {
        currentUserId = event ? getUserId(event) : null;
      } catch (error) {
        // User not authenticated
      }

      // Only allow owner to view pending listings
      if (!currentUserId || currentUserId !== result.ownerId) {
        return createErrorResponse(404, 'NOT_FOUND', 'Listing not found', requestId);
      }
    }

    // Increment view count only for active/approved listings
    if (!isPending) {
      await db.incrementViews(result.listingId);
    }

    // Fetch owner information
    let listingWithOwner = result;
    try {
      const owner = await db.getUser(result.ownerId);
      listingWithOwner = {
        ...result,
        owner: owner ? {
          id: owner.id,
          name: owner.name,
          email: owner.email
        } : null
      } as any;
    } catch (error) {
      console.warn(`Failed to fetch owner for listing ${result.listingId}:`, error);
    }

    // Fetch engines for the listing
    try {
      const engines = await db.getEnginesByListing(result.listingId);
      listingWithOwner = {
        ...listingWithOwner,
        engines,
        totalHorsepower: calculateTotalHorsepower(engines),
        engineConfiguration: determineEngineConfiguration(engines.length)
      } as any;
    } catch (error) {
      console.warn(`Failed to fetch engines for listing ${result.listingId}:`, error);
    }

    return createResponse(200, { listing: listingWithOwner });
  } catch (error) {
    console.error('Error getting listing by slug:', error);
    return createErrorResponse(500, 'DATABASE_ERROR', 'Failed to retrieve listing', requestId);
  }
}

/**
 * Retrieves a listing by ID with redirect handling for SEO slugs
 * 
 * Fetches listing by ID and returns a redirect response to the SEO-friendly
 * slug URL if the listing has a slug. This maintains backward compatibility
 * with legacy ID-based URLs while encouraging SEO-friendly URLs.
 * 
 * @param listingId - Unique identifier for the boat listing
 * @param requestId - Request tracking identifier for logging
 * @returns Promise<APIGatewayProxyResult> - Listing data or redirect response
 */
async function getListingWithRedirect(listingId: string, requestId: string, event?: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const listing = await db.getListing(listingId) as EnhancedListing;
    
    if (!listing) {
      return createErrorResponse(404, 'NOT_FOUND', 'Listing not found', requestId);
    }

    // Check if listing is pending moderation
    const isPending = listing.status === 'pending_moderation' || 
                      listing.moderationWorkflow?.status === 'pending_review' ||
                      listing.moderationWorkflow?.status === 'changes_requested';
    
    if (isPending) {
      // Get current user ID if authenticated
      let currentUserId: string | null = null;
      try {
        currentUserId = event ? getUserId(event) : null;
      } catch (error) {
        // User not authenticated
      }

      // Only allow owner to view pending listings
      if (!currentUserId || currentUserId !== listing.ownerId) {
        return createErrorResponse(404, 'NOT_FOUND', 'Listing not found', requestId);
      }
    }

    // Check if listing has a slug and should redirect
    const enhancedListing = listing as any;
    if (enhancedListing.slug) {
      // Return 301 permanent redirect to slug-based URL
      return {
        statusCode: 301,
        headers: {
          'Location': `/listings/slug/${enhancedListing.slug}`,
          'Cache-Control': 'public, max-age=31536000', // Cache redirect for 1 year
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Redirecting to SEO-friendly URL',
          redirectTo: `/listings/slug/${enhancedListing.slug}`,
          listingId: listingId,
          slug: enhancedListing.slug,
        }),
      };
    }

    // If no slug, proceed with normal listing retrieval
    return await getListing(listingId, requestId);
  } catch (error) {
    console.error('Error getting listing with redirect:', error);
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
    
    // Filter to only show approved/active listings for public view
    // Pending listings are only visible to their owners (handled in individual getListing calls)
    const publicListings = listingsWithOwners.filter(listing => {
      const enhancedListing = listing as EnhancedListing;
      return listing.status === 'active' || 
             (enhancedListing.moderationWorkflow?.status === 'approved' && listing.status !== 'pending_moderation');
    });
    
    const response: any = {
      listings: publicListings,
      total: publicListings.length,
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
    const body = parseBody<Partial<EnhancedListing>>(event);

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

    // Validate engines if provided
    let engines: Engine[] = [];
    if (body.engines && body.engines.length > 0) {
      const engineValidationError = validateEnginesArray(body.engines);
      if (engineValidationError) {
        return createErrorResponse(400, 'INVALID_ENGINES', engineValidationError, requestId);
      }
      engines = body.engines.map(engine => ({
        ...engine,
        engineId: engine.engineId || generateId(),
        manufacturer: engine.manufacturer ? sanitizeString(engine.manufacturer) : undefined,
        model: engine.model ? sanitizeString(engine.model) : undefined,
      }));
    } else {
      // Create default engine from legacy boatDetails.engine if provided
      if (body.boatDetails!.engine) {
        engines = [{
          engineId: generateId(),
          type: 'outboard', // Default type
          horsepower: 100, // Default horsepower
          fuelType: 'gasoline', // Default fuel type
          condition: body.boatDetails!.condition as any,
          position: 1,
          hours: body.boatDetails!.hours,
        }];
      }
    }

    const listingId = generateId();
    const slug = await generateUniqueSlug(body.title!, listingId);
    const totalHorsepower = calculateTotalHorsepower(engines);
    const engineConfiguration = determineEngineConfiguration(engines.length);

    const enhancedListing: EnhancedListing = {
      listingId,
      ownerId: userId,
      title: sanitizeString(body.title!),
      description: sanitizeString(body.description!),
      slug,
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
        engines,
        totalHorsepower,
        engineConfiguration,
      },
      engines,
      totalHorsepower,
      engineConfiguration,
      features: body.features?.map(f => sanitizeString(f)) || [],
      images: body.images || [],
      videos: body.videos || [],
      thumbnails: body.thumbnails || [],
      status: 'pending_moderation', // Set to pending moderation for content review
      moderationWorkflow: {
        status: 'pending_review',
        reviewedBy: undefined,
        reviewedAt: undefined,
        rejectionReason: undefined,
        moderatorNotes: undefined,
        requiredChanges: undefined,
      },
      views: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Create listing in database
    await db.createListing(enhancedListing as any);

    // Create engines in separate table if any
    if (engines.length > 0) {
      const enginesWithListingId = engines.map(engine => ({
        ...engine,
        listingId,
      }));
      await db.batchCreateEngines(enginesWithListingId);
    }

    // Create moderation queue entry
    await db.createModerationQueue({
      queueId: generateId(),
      listingId,
      submittedBy: userId,
      priority: 'medium',
      flags: [],
      status: 'pending',
      submittedAt: Date.now(),
      escalated: false,
    });

    return createResponse(201, { 
      listingId: enhancedListing.listingId,
      slug: enhancedListing.slug,
      status: 'pending_review',
      message: 'Listing created successfully and submitted for review'
    });
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

    // Update slug if title changed
    if (updates.title && updates.title !== existingListing.title) {
      const newSlug = await generateUniqueSlug(updates.title, listingId);
      (updates as any).slug = newSlug;
      
      // Store old slug for potential redirect handling
      await db.createSlugRedirect((existingListing as any).slug, newSlug, listingId);
    }

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

/**
 * Manages engines for a boat listing (add/update engines)
 * 
 * Handles adding new engines or updating existing engines for a listing.
 * Validates engine specifications and updates listing totals.
 * 
 * @param listingId - Unique identifier for the listing
 * @param event - API Gateway event containing engine data
 * @param requestId - Request tracking identifier for logging
 * @returns Promise<APIGatewayProxyResult> - Success response or error
 */
async function manageListingEngines(listingId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const body = parseBody<{ engines: Engine[] }>(event);

    // Check if listing exists and user owns it
    const existingListing = await db.getListing(listingId);
    if (!existingListing) {
      return createErrorResponse(404, 'NOT_FOUND', 'Listing not found', requestId);
    }

    if (existingListing.ownerId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'You can only modify your own listings', requestId);
    }

    // Validate engines array
    if (!body.engines || !Array.isArray(body.engines)) {
      return createErrorResponse(400, 'INVALID_REQUEST', 'Engines array is required', requestId);
    }

    const engineValidationError = validateEnginesArray(body.engines);
    if (engineValidationError) {
      return createErrorResponse(400, 'INVALID_ENGINES', engineValidationError, requestId);
    }

    // Sanitize engine data
    const engines = body.engines.map(engine => ({
      ...engine,
      engineId: engine.engineId || generateId(),
      manufacturer: engine.manufacturer ? sanitizeString(engine.manufacturer) : undefined,
      model: engine.model ? sanitizeString(engine.model) : undefined,
    }));

    // Get existing engines to determine what to delete
    const existingEngines = await db.getEnginesByListing(listingId);
    const existingEngineIds = existingEngines.map(e => e.engineId);

    // Delete existing engines
    if (existingEngineIds.length > 0) {
      await db.batchDeleteEngines(existingEngineIds);
    }

    // Create new engines
    const enginesWithListingId = engines.map(engine => ({
      ...engine,
      listingId,
    }));
    await db.batchCreateEngines(enginesWithListingId);

    // Update listing with engine information
    await db.updateListingWithEngines(listingId, engines);

    return createResponse(200, { 
      message: 'Engines updated successfully',
      engines: engines.length,
      totalHorsepower: calculateTotalHorsepower(engines),
      engineConfiguration: determineEngineConfiguration(engines.length)
    });
  } catch (error) {
    console.error('Error managing listing engines:', error);
    
    if (error instanceof Error && error.message.includes('User not authenticated')) {
      return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
    }

    return createErrorResponse(500, 'DATABASE_ERROR', 'Failed to update engines', requestId);
  }
}

/**
 * Deletes a specific engine from a boat listing
 * 
 * Removes an individual engine and updates the listing's engine configuration
 * and total horsepower calculations.
 * 
 * @param listingId - Unique identifier for the listing
 * @param engineId - Unique identifier for the engine to delete
 * @param event - API Gateway event containing user context
 * @param requestId - Request tracking identifier for logging
 * @returns Promise<APIGatewayProxyResult> - Success response or error
 */
async function deleteListingEngine(listingId: string, engineId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);

    // Check if listing exists and user owns it
    const existingListing = await db.getListing(listingId);
    if (!existingListing) {
      return createErrorResponse(404, 'NOT_FOUND', 'Listing not found', requestId);
    }

    if (existingListing.ownerId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'You can only modify your own listings', requestId);
    }

    // Get current engines
    const engines = await db.getEnginesByListing(listingId);
    const engineToDelete = engines.find(e => e.engineId === engineId);
    
    if (!engineToDelete) {
      return createErrorResponse(404, 'NOT_FOUND', 'Engine not found', requestId);
    }

    // Prevent deletion if it's the only engine
    if (engines.length === 1) {
      return createErrorResponse(400, 'INVALID_OPERATION', 'Cannot delete the only engine. At least one engine is required.', requestId);
    }

    // Delete the engine
    await db.deleteEngine(engineId);

    // Update listing with remaining engines
    const remainingEngines = engines.filter(e => e.engineId !== engineId);
    await db.updateListingWithEngines(listingId, remainingEngines);

    return createResponse(200, { 
      message: 'Engine deleted successfully',
      remainingEngines: remainingEngines.length,
      totalHorsepower: calculateTotalHorsepower(remainingEngines),
      engineConfiguration: determineEngineConfiguration(remainingEngines.length)
    });
  } catch (error) {
    console.error('Error deleting listing engine:', error);
    
    if (error instanceof Error && error.message.includes('User not authenticated')) {
      return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
    }

    return createErrorResponse(500, 'DATABASE_ERROR', 'Failed to delete engine', requestId);
  }
}

/**
 * Processes moderation decisions for listings
 * 
 * Handles approve, reject, and request changes actions from moderators.
 * Updates listing status and sends notifications to listing owners.
 * 
 * @param listingId - Unique identifier for the listing
 * @param event - API Gateway event containing moderation decision
 * @param requestId - Request tracking identifier for logging
 * @returns Promise<APIGatewayProxyResult> - Success response or error
 */
async function processModerationDecision(listingId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const body = parseBody<{
      action: 'approve' | 'reject' | 'request_changes';
      reason: string;
      publicNotes?: string;
      internalNotes?: string;
      requiredChanges?: string[];
    }>(event);

    // Validate required fields
    validateRequired(body, ['action', 'reason']);

    // Check if listing exists
    const existingListing = await db.getListing(listingId);
    if (!existingListing) {
      return createErrorResponse(404, 'NOT_FOUND', 'Listing not found', requestId);
    }

    // Verify user has moderation permissions (this would be checked via user role/permissions)
    // For now, we'll assume the user is authorized if they reach this endpoint

    const moderationNotes = {
      reviewerId: userId,
      reviewerName: 'Moderator', // This would come from user data
      decision: body.action,
      reason: sanitizeString(body.reason),
      publicNotes: body.publicNotes ? sanitizeString(body.publicNotes) : undefined,
      internalNotes: body.internalNotes ? sanitizeString(body.internalNotes) : undefined,
      requiredChanges: body.requiredChanges?.map(change => sanitizeString(change)),
      reviewDuration: 0, // This would be calculated based on assignment time
      confidence: 'high' as const,
    };

    let newStatus: string;
    let moderationWorkflowStatus: string;

    switch (body.action) {
      case 'approve':
        newStatus = 'active';
        moderationWorkflowStatus = 'approved';
        break;
      case 'reject':
        newStatus = 'rejected';
        moderationWorkflowStatus = 'rejected';
        break;
      case 'request_changes':
        newStatus = 'pending_moderation';
        moderationWorkflowStatus = 'changes_requested';
        break;
      default:
        return createErrorResponse(400, 'INVALID_ACTION', 'Invalid moderation action', requestId);
    }

    // Update listing with moderation decision
    await db.updateListing(listingId, {
      status: newStatus as any,
      moderationWorkflow: {
        status: moderationWorkflowStatus as any,
        reviewedBy: userId,
        reviewedAt: Date.now(),
        rejectionReason: body.action === 'reject' ? body.reason : undefined,
        moderatorNotes: body.internalNotes,
        requiredChanges: body.requiredChanges,
      },
      updatedAt: Date.now(),
    } as any);

    // Update moderation queue status
    await db.updateModerationStatus(listingId, body.action === 'approve' ? 'approved' : 
                                   body.action === 'reject' ? 'rejected' : 'changes_requested', 
                                   moderationNotes);

    // Send notification to listing owner (this would integrate with notification service)
    await sendModerationNotification(existingListing.ownerId, listingId, body.action, body.publicNotes || body.reason);

    return createResponse(200, {
      message: `Listing ${body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : 'returned for changes'}`,
      listingId,
      status: newStatus,
      moderationAction: body.action,
    });
  } catch (error) {
    console.error('Error processing moderation decision:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Missing required fields')) {
        return createErrorResponse(400, 'VALIDATION_ERROR', error.message, requestId);
      }
      if (error.message.includes('User not authenticated')) {
        return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
      }
    }

    return createErrorResponse(500, 'DATABASE_ERROR', 'Failed to process moderation decision', requestId);
  }
}

/**
 * Sends notification to listing owner about moderation status
 * 
 * Placeholder function for notification service integration.
 * In a real implementation, this would send email/SMS notifications.
 * 
 * @param ownerId - User ID of the listing owner
 * @param listingId - Listing ID that was moderated
 * @param action - Moderation action taken
 * @param message - Message to send to owner
 */
async function sendModerationNotification(ownerId: string, listingId: string, action: string, message: string): Promise<void> {
  try {
    // This would integrate with your notification service
    console.log(`Sending moderation notification to user ${ownerId} for listing ${listingId}: ${action} - ${message}`);
    
    // Example notification payload:
    const notification = {
      userId: ownerId,
      type: 'moderation_update',
      title: `Listing Moderation Update`,
      message: `Your listing has been ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'returned for changes'}: ${message}`,
      data: {
        listingId,
        action,
        timestamp: Date.now(),
      },
    };

    // Here you would call your notification service
    // await notificationService.send(notification);
  } catch (error) {
    console.error('Failed to send moderation notification:', error);
    // Don't throw error as this is not critical to the moderation process
  }
}

/**
 * Resubmits a listing for moderation after changes
 * 
 * Allows listing owners to resubmit their listing for review
 * after making requested changes.
 * 
 * @param listingId - Unique identifier for the listing
 * @param event - API Gateway event containing user context
 * @param requestId - Request tracking identifier for logging
 * @returns Promise<APIGatewayProxyResult> - Success response or error
 */
async function resubmitForModeration(listingId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);

    // Check if listing exists and user owns it
    const existingListing = await db.getListing(listingId);
    if (!existingListing) {
      return createErrorResponse(404, 'NOT_FOUND', 'Listing not found', requestId);
    }

    if (existingListing.ownerId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'You can only resubmit your own listings', requestId);
    }

    // Check if listing is in a state that allows resubmission
    const currentStatus = (existingListing as any).moderationWorkflow?.status;
    if (currentStatus !== 'changes_requested' && currentStatus !== 'rejected') {
      return createErrorResponse(400, 'INVALID_STATE', 'Listing is not in a state that allows resubmission', requestId);
    }

    // Update listing status to pending review
    await db.updateListing(listingId, {
      status: 'pending_moderation' as any,
      moderationWorkflow: {
        status: 'pending_review',
        reviewedBy: undefined,
        reviewedAt: undefined,
        rejectionReason: undefined,
        moderatorNotes: undefined,
        requiredChanges: undefined,
      },
      updatedAt: Date.now(),
    } as any);

    // Create new moderation queue entry
    await db.createModerationQueue({
      queueId: generateId(),
      listingId,
      submittedBy: userId,
      priority: 'medium',
      flags: [],
      status: 'pending',
      submittedAt: Date.now(),
      escalated: false,
    });

    return createResponse(200, {
      message: 'Listing resubmitted for moderation successfully',
      listingId,
      status: 'pending_review',
    });
  } catch (error) {
    console.error('Error resubmitting listing for moderation:', error);
    
    if (error instanceof Error && error.message.includes('User not authenticated')) {
      return createErrorResponse(401, 'UNAUTHORIZED', error.message, requestId);
    }

    return createErrorResponse(500, 'DATABASE_ERROR', 'Failed to resubmit listing', requestId);
  }
}
