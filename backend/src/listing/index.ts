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
import { ResponseHandler } from '../shared/response-handler';
import { ValidationFramework, CommonRules } from '../shared/validators';
import { getUserFromEvent } from '../shared/auth';
import { Listing, Engine, EnhancedListing } from '@harborlist/shared-types';
import { filterContent, generateFlagReason, getViolationSummary } from '../shared/content-filter';

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
 * by always including a short hash from the listing ID.
 * 
 * Example: "2021 Key West 239CC" -> "2021-key-west-239cc-a1b2c3d4"
 * 
 * @param title - Listing title to convert to slug
 * @param listingId - Unique listing ID for generating hash
 * @returns Promise<string> - SEO-friendly URL slug with unique hash
 */
async function generateUniqueSlug(title: string, listingId: string): Promise<string> {
  // Extract last 8 characters of listing ID for uniqueness
  const uniqueHash = listingId.slice(-8);
  
  // Convert to lowercase and replace spaces/special chars with hyphens
  let baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Ensure slug is not empty and has reasonable length (leaving room for hash)
  if (!baseSlug || baseSlug.length < 3) {
    baseSlug = 'boat';
  } else if (baseSlug.length > 50) {
    baseSlug = baseSlug.substring(0, 50).replace(/-[^-]*$/, '');
  }

  // Always append unique hash to prevent collisions
  const slug = `${baseSlug}-${uniqueHash}`;

  return slug;
}

/**
 * Helper function to generate SEO-friendly URL slug (synchronous version)
 * 
 * Creates a URL-safe slug from the listing title with unique hash.
 * Used when uniqueness validation is not required.
 * 
 * Example: "2021 Key West 239CC" -> "2021-key-west-239cc-a1b2c3d4"
 * 
 * @param title - Listing title to convert to slug
 * @param listingId - Unique listing ID for generating hash
 * @returns string - SEO-friendly URL slug with unique hash
 */
function generateSlug(title: string, listingId: string): string {
  // Extract last 8 characters of listing ID for uniqueness
  const uniqueHash = listingId.slice(-8);
  
  // Convert to lowercase and replace spaces/special chars with hyphens
  let baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Ensure slug is not empty and has reasonable length (leaving room for hash)
  if (!baseSlug || baseSlug.length < 3) {
    baseSlug = 'boat';
  } else if (baseSlug.length > 50) {
    baseSlug = baseSlug.substring(0, 50).replace(/-[^-]*$/, '');
  }

  // Always append unique hash to prevent collisions
  return `${baseSlug}-${uniqueHash}`;
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
  return ResponseHandler.wrapHandler(
    async () => {
      const listing = await db.getListing(listingId) as EnhancedListing;
      
      if (!listing) {
        return ResponseHandler.error('Listing not found', 'NOT_FOUND', 404);
      }

      // Check if listing is pending moderation
      const isPending = listing.status === 'pending_review' || 
                        listing.status === 'under_review' ||
                        listing.moderationWorkflow?.status === 'pending_review' ||
                        listing.moderationWorkflow?.status === 'changes_requested';
      
      if (isPending) {
        // Get current user and check permissions
        let currentUserId: string | null = null;
        let isAdmin = false;
        try {
          if (event) {
            const userPayload = await getUserFromEvent(event);
            currentUserId = userPayload.sub;
            // Check if user has any admin/moderator role
            const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'SUPPORT'];
            isAdmin = userPayload.role ? adminRoles.includes(userPayload.role) : false;
          }
        } catch (error) {
          // User not authenticated
        }

        // Only allow owner or admin/moderator to view pending listings
        if (!isAdmin && (!currentUserId || currentUserId !== listing.ownerId)) {
          return ResponseHandler.error('Listing not found', 'NOT_FOUND', 404);
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

      return ResponseHandler.success({ listing: listingWithOwner });
    },
    { operation: 'Get Listing', requestId }
  );
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
    const isPending = result.status === 'pending_review' || 
                      result.status === 'under_review' ||
                      result.moderationWorkflow?.status === 'pending_review' ||
                      result.moderationWorkflow?.status === 'changes_requested';
    
    if (isPending) {
      // Get current user and check permissions
      let currentUserId: string | null = null;
      let isAdmin = false;
      try {
        if (event) {
          const userPayload = await getUserFromEvent(event);
          currentUserId = userPayload.sub;
          console.log('[getListingBySlug] Authenticated user:', currentUserId);
          console.log('[getListingBySlug] Listing owner:', result.ownerId);
          console.log('[getListingBySlug] User role:', userPayload.role);
          // Check if user has any admin/moderator role
          const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'SUPPORT'];
          isAdmin = userPayload.role ? adminRoles.includes(userPayload.role) : false;
        }
      } catch (error) {
        // User not authenticated
        console.log('[getListingBySlug] Auth error:', error);
      }

      // Only allow owner or admin/moderator to view pending listings
      if (!isAdmin && (!currentUserId || currentUserId !== result.ownerId)) {
        console.log('[getListingBySlug] Access denied - isAdmin:', isAdmin, 'currentUserId:', currentUserId, 'ownerId:', result.ownerId);
        return createErrorResponse(404, 'NOT_FOUND', 'Listing not found', requestId);
      }
      
      console.log('[getListingBySlug] Access granted - user is owner or admin');
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
    const isPending = listing.status === 'pending_review' || 
                      listing.status === 'under_review' ||
                      listing.moderationWorkflow?.status === 'pending_review' ||
                      listing.moderationWorkflow?.status === 'changes_requested';
    
    if (isPending) {
      // Get current user and check permissions
      let currentUserId: string | null = null;
      let isAdmin = false;
      try {
        if (event) {
          const userPayload = await getUserFromEvent(event);
          currentUserId = userPayload.sub;
          // Check if user has any admin/moderator role
          const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'SUPPORT'];
          isAdmin = userPayload.role ? adminRoles.includes(userPayload.role) : false;
        }
      } catch (error) {
        // User not authenticated
      }

      // Only allow owner or admin/moderator to view pending listings
      if (!isAdmin && (!currentUserId || currentUserId !== listing.ownerId)) {
        return createErrorResponse(404, 'NOT_FOUND', 'Listing not found', requestId);
      }
    }

    // Check if noRedirect query parameter is set (for edit page, API clients, etc.)
    const noRedirect = event?.queryStringParameters?.noRedirect === 'true';
    
    // Check if listing has a slug and should redirect
    const enhancedListing = listing as any;
    if (enhancedListing.slug && !noRedirect) {
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

    // If no redirect needed, fetch and return the listing data directly
    return await getListing(listingId, requestId, event);
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
    const ownerIdFilter = queryParams.ownerId;

    // If ownerId is provided, fetch listings for that specific owner
    if (ownerIdFilter) {
      // Verify that the requesting user is authenticated
      let currentUserId: string | null = null;
      try {
        const userPayload = await getUserFromEvent(event);
        currentUserId = userPayload.sub;
      } catch (error) {
        // User not authenticated
      }

      // Only allow users to query their own listings
      if (currentUserId !== ownerIdFilter) {
        return createErrorResponse(403, 'FORBIDDEN', 'You can only view your own listings', requestId);
      }

      const listings = await db.getListingsByOwner(ownerIdFilter);
      
      // Fetch owner information for each listing
      const listingsWithOwners = await Promise.all(
        listings.map(async (listing: any) => {
          try {
            const owner = await db.getUser(listing.ownerId);
            return {
              ...listing,
              owner: owner ? {
                id: owner.id,
                name: owner.name,
                email: owner.email
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
      
      return createResponse(200, {
        listings: listingsWithOwners,
        total: listingsWithOwners.length,
      });
    }

    // Regular public listings query
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
      return listing.status === 'active' || listing.status === 'approved' ||
             (enhancedListing.moderationWorkflow?.status === 'approved' && 
              listing.status !== 'pending_review' && listing.status !== 'under_review');
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
/**
 * Creates a new boat listing with validation and content moderation
 * 
 * ✨ REFACTORED - Uses ResponseHandler & ValidationFramework
 * 
 * @param event - API Gateway event
 * @param requestId - Request tracking identifier
 * @returns Promise<APIGatewayProxyResult> - Creation response
 * 
 * @throws {Error} When validation fails or database operations fail
 */
async function createListing(event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  return ResponseHandler.wrapHandler(
    async () => {
      const userId = getUserId(event);
      const body = parseBody<Partial<EnhancedListing>>(event);

      // Validate required fields using ValidationFramework
      const validationResult = ValidationFramework.validate(body, [
        CommonRules.required('title', 'Title'),
        CommonRules.required('description', 'Description'),
        CommonRules.required('price', 'Price'),
        CommonRules.priceRange('price'),
        CommonRules.required('location', 'Location'),
        CommonRules.required('boatDetails', 'Boat details'),
      ], requestId);

      if (validationResult) {
        return ResponseHandler.error('Validation failed', 'VALIDATION_ERROR', 400);
      }

      // Validate nested location fields
      const locationValidation = ValidationFramework.validate(body.location!, [
        CommonRules.required('city', 'City'),
        CommonRules.required('state', 'State'),
      ], requestId);

      if (locationValidation) {
        return ResponseHandler.error('Location validation failed', 'VALIDATION_ERROR', 400);
      }

      // Validate nested boatDetails fields
      const boatDetailsValidation = ValidationFramework.validate(body.boatDetails!, [
        CommonRules.required('type', 'Boat type'),
        CommonRules.required('year', 'Year'),
        CommonRules.yearRange('year'),
        CommonRules.required('length', 'Length'),
        CommonRules.required('condition', 'Condition'),
      ], requestId);

      if (boatDetailsValidation) {
        return ResponseHandler.error('Boat details validation failed', 'VALIDATION_ERROR', 400);
      }

      // Validate engines if provided
      let engines: Engine[] = [];
      if (body.engines && body.engines.length > 0) {
        const engineValidationError = validateEnginesArray(body.engines);
        if (engineValidationError) {
          return ResponseHandler.error(engineValidationError, 'INVALID_ENGINES', 400);
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
        status: 'pending_review', // Set to pending review for content moderation
        moderationWorkflow: {
          status: 'pending_review',
          reviewedBy: undefined,
          reviewedAt: undefined,
          rejectionReason: undefined,
          moderatorNotes: undefined,
          requiredChanges: undefined,
          submissionType: 'initial', // First time submission
          previousReviewCount: 0,
        },
        views: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Run automated content filter (non-blocking - only flags, doesn't reject)
      const filterResult = filterContent(enhancedListing.title, enhancedListing.description);
      
      // If content violations found, add flags for moderator review
      const flags: any[] = [];
      if (!filterResult.isClean) {
        console.log(`[${requestId}] Content filter detected ${filterResult.violations.length} violations for listing ${listingId}`);
        
        // Create flag for each violation or one combined flag
        const flagId = generateId();
        const flag = {
          id: flagId,
          type: 'inappropriate_content',
          reason: generateFlagReason(filterResult.violations),
          reportedBy: 'system',
          reportedAt: new Date().toISOString(),
          severity: filterResult.severity,
          status: 'pending' as const,
          details: getViolationSummary(filterResult.violations)
        };
        
        flags.push(flag);
        
        // Add violation details to moderator notes (for reference only)
        if (enhancedListing.moderationWorkflow) {
          enhancedListing.moderationWorkflow.moderatorNotes = 
            `AUTO-DETECTED: Content filter flagged this listing\n\n${getViolationSummary(filterResult.violations)}`;
        }
      }

      // Add flags to listing if any (but still save the listing)
      if (flags.length > 0) {
        (enhancedListing as any).flags = flags;
      }

      // Create listing in database (always save, regardless of content filter results)
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

      return ResponseHandler.success(
        {
          listingId: enhancedListing.listingId,
          slug: enhancedListing.slug,
          status: 'pending_review',
          message: 'Listing created successfully and submitted for review'
        },
        { statusCode: 201 }
      );
    },
    { operation: 'Create Listing', requestId, successCode: 201 }
  );
}

async function updateListing(listingId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  return ResponseHandler.wrapHandler(
    async () => {
      const userId = getUserId(event);
      const body = parseBody<Partial<Listing>>(event);

      // Check if listing exists and user owns it
      const existingListing = await db.getListing(listingId);
      if (!existingListing) {
        return ResponseHandler.error('Listing not found', 'NOT_FOUND', 404);
      }

      if (existingListing.ownerId !== userId) {
        return ResponseHandler.error('You can only update your own listings', 'FORBIDDEN', 403);
      }

      // Validate updates
      if (body.price && !validatePrice(body.price)) {
        return ResponseHandler.error('Price must be between $1 and $10,000,000', 'INVALID_PRICE', 400);
      }

      if (body.boatDetails?.year && !validateYear(body.boatDetails.year)) {
        return ResponseHandler.error('Year must be between 1900 and current year + 1', 'INVALID_YEAR', 400);
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
      let newSlug: string | undefined;
      if (updates.title && updates.title !== existingListing.title) {
        newSlug = await generateUniqueSlug(updates.title, listingId);
        (updates as any).slug = newSlug;
        
        // Store old slug for potential redirect handling
        await db.createSlugRedirect((existingListing as any).slug, newSlug, listingId);
      }

      const listingWithWorkflow = existingListing as any;
      const currentTimestamp = Date.now();

      // CASE 1: Listing is ACTIVE (approved) - Create/update pendingUpdate for moderation
      if (existingListing.status === 'active' || existingListing.status === 'approved') {
        console.log(`[PENDING UPDATE] Listing ${listingId} is active - changes will go through moderation`);
        
        // Track price changes in priceHistory
        if (updates.price && updates.price !== existingListing.price) {
          const existingPriceHistory = listingWithWorkflow.priceHistory || [];
          const newPriceEntry = {
            price: updates.price,
            changedAt: currentTimestamp,
            changedBy: userId,
            reason: 'owner_update'
          };
          (updates as any).priceHistory = [...existingPriceHistory, newPriceEntry];
        }
        
        // Build change history for tracking all modifications
        const changeHistory: Array<{ field: string; oldValue: any; newValue: any; timestamp: number }> = [];
        Object.keys(updates).forEach(key => {
          if (key !== 'updatedAt' && (updates as any)[key] !== (existingListing as any)[key]) {
            changeHistory.push({
              field: key,
              oldValue: (existingListing as any)[key],
              newValue: (updates as any)[key],
              timestamp: currentTimestamp
            });
          }
        });
        
        // Create or update pendingUpdate object
        const existingPendingUpdate = listingWithWorkflow.pendingUpdate;
        const accumulatedChanges = existingPendingUpdate?.changes || {};
        const existingChangeHistory = existingPendingUpdate?.changeHistory || [];
        
        (updates as any).pendingUpdate = {
          status: 'pending_review',
          submittedAt: existingPendingUpdate?.submittedAt || currentTimestamp,
          submittedBy: userId,
          lastUpdatedAt: currentTimestamp,
          changes: {
            ...accumulatedChanges,
            ...updates // Accumulate changes - latest values override previous
          },
          changeHistory: [...existingChangeHistory, ...changeHistory],
          moderationWorkflow: {
            status: 'pending_review',
            submissionType: 'update',
            previousReviewCount: 0
          }
        };
        
        // Don't apply updates directly - they stay in pendingUpdate
        // Only update timestamp and pendingUpdate object
        const pendingUpdateData: any = {
          updatedAt: currentTimestamp,
          pendingUpdate: (updates as any).pendingUpdate
        };
        
        if ((updates as any).priceHistory) {
          pendingUpdateData.priceHistory = (updates as any).priceHistory;
        }
        
        await db.updateListing(listingId, pendingUpdateData);
        
        console.log(`✅ Listing ${listingId} - changes accumulated in pendingUpdate (${changeHistory.length} fields changed)`);
        
        // TODO: Send notification to moderators about pending update
        // This will be implemented when moderator notification system is ready
        
        return ResponseHandler.success({ 
          message: 'Changes submitted for review. Your listing will remain visible with current details until approved.',
          pendingReview: true,
          changesCount: changeHistory.length
        });
      }

      // CASE 2: Listing with changes_requested - automatically resubmit for review
      if (listingWithWorkflow.moderationWorkflow?.status === 'changes_requested' && 
          existingListing.status === 'under_review') {
        
        console.log(`[RESUBMIT] Listing ${listingId} updated after changes requested - resubmitting for review`);
        
        // Add history entry for the resubmission
        const existingHistory = listingWithWorkflow.moderationHistory || [];
        const resubmitEntry = {
          action: 'resubmit' as const,
          reviewedBy: userId,
          reviewedAt: currentTimestamp,
          status: 'resubmitted',
          publicNotes: 'Owner updated the listing and resubmitted for review',
        };
        
        // Reset status to pending_review and update moderation workflow for resubmission
        const previousReviewCount = (listingWithWorkflow.moderationWorkflow?.previousReviewCount || 0) + 1;
        
        updates.status = 'pending_review' as any;
        (updates as any).moderationWorkflow = {
          status: 'pending_review',
          submittedAt: currentTimestamp,
          submissionType: 'resubmission',
          previousReviewCount,
        };
        (updates as any).moderationHistory = [...existingHistory, resubmitEntry];
        
        console.log(`✅ Listing ${listingId} resubmitted (review count: ${previousReviewCount}) - status changed to pending_review`);
      }

      // CASE 3: Other statuses - apply updates directly
      await db.updateListing(listingId, updates);

      return ResponseHandler.success({ 
        message: 'Listing updated successfully',
        resubmitted: listingWithWorkflow.moderationWorkflow?.status === 'changes_requested',
        pendingReview: false,
        changesCount: 0
      });
    },
    { operation: 'Update Listing', requestId }
  );
}

async function deleteListing(listingId: string, event: APIGatewayProxyEvent, requestId: string): Promise<APIGatewayProxyResult> {
  return ResponseHandler.wrapHandler(
    async () => {
      const userId = getUserId(event);

      // Check if listing exists and user owns it
      const existingListing = await db.getListing(listingId);
      if (!existingListing) {
        return ResponseHandler.error('Listing not found', 'NOT_FOUND', 404);
      }

      if (existingListing.ownerId !== userId) {
        return ResponseHandler.error('You can only delete your own listings', 'FORBIDDEN', 403);
      }

      await db.deleteListing(listingId);

      return ResponseHandler.success({ message: 'Listing deleted successfully' });
    },
    { operation: 'Delete Listing', requestId }
  );
}

/**
 * Manages engines for a boat listing (add/update engines)
 * 
 * ✨ REFACTORED - Uses ResponseHandler & ValidationFramework
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
  return ResponseHandler.wrapHandler(
    async () => {
      const userId = getUserId(event);
      const body = parseBody<{ engines: Engine[] }>(event);

      // Validate engines array exists
      const validationResult = ValidationFramework.validate(body, [
        CommonRules.required('engines', 'Engines array'),
        CommonRules.arrayNotEmpty('engines', 'Engines'),
      ], requestId);

      if (validationResult) {
        return ResponseHandler.error('Validation failed', 'VALIDATION_ERROR', 400);
      }

      // Check if listing exists and user owns it
      const existingListing = await db.getListing(listingId);
      if (!existingListing) {
        return ResponseHandler.error('Listing not found', 'NOT_FOUND', 404);
      }

      if (existingListing.ownerId !== userId) {
        return ResponseHandler.error('You can only modify your own listings', 'FORBIDDEN', 403);
      }

      // Validate individual engines
      const engineValidationError = validateEnginesArray(body.engines);
      if (engineValidationError) {
        return ResponseHandler.error(engineValidationError, 'INVALID_ENGINES', 400);
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

      return ResponseHandler.success({
        message: 'Engines updated successfully',
        engines: engines.length,
        totalHorsepower: calculateTotalHorsepower(engines),
        engineConfiguration: determineEngineConfiguration(engines.length)
      });
    },
    { operation: 'Manage Listing Engines', requestId }
  );
}

/**
 * Deletes a specific engine from a boat listing
 * 
 * ✨ REFACTORED - Uses ResponseHandler
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
  return ResponseHandler.wrapHandler(
    async () => {
      const userId = getUserId(event);

      // Check if listing exists and user owns it
      const existingListing = await db.getListing(listingId);
      if (!existingListing) {
        return ResponseHandler.error('Listing not found', 'NOT_FOUND', 404);
      }

      if (existingListing.ownerId !== userId) {
        return ResponseHandler.error('You can only modify your own listings', 'FORBIDDEN', 403);
      }

      // Get current engines
      const engines = await db.getEnginesByListing(listingId);
      const engineToDelete = engines.find(e => e.engineId === engineId);
      
      if (!engineToDelete) {
        return ResponseHandler.error('Engine not found', 'NOT_FOUND', 404);
      }

      // Prevent deletion if it's the only engine
      if (engines.length === 1) {
        return ResponseHandler.error('Cannot delete the only engine. At least one engine is required.', 'INVALID_OPERATION', 400);
      }

      // Delete the engine
      await db.deleteEngine(engineId);

      // Update listing with remaining engines
      const remainingEngines = engines.filter(e => e.engineId !== engineId);
      await db.updateListingWithEngines(listingId, remainingEngines);

      return ResponseHandler.success({
        message: 'Engine deleted successfully',
        remainingEngines: remainingEngines.length,
        totalHorsepower: calculateTotalHorsepower(remainingEngines),
        engineConfiguration: determineEngineConfiguration(remainingEngines.length)
      });
    },
    { operation: 'Delete Listing Engine', requestId }
  );
}

/**
 * Processes moderation decisions for listings
 * 
 * ✨ REFACTORED - Uses ResponseHandler & ValidationFramework
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
  return ResponseHandler.wrapHandler(
    async () => {
      const userId = getUserId(event);
      const body = parseBody<{
        action: 'approve' | 'reject' | 'request_changes';
        reason: string;
        publicNotes?: string;
        internalNotes?: string;
        requiredChanges?: string[];
      }>(event);

      // Validate required fields
      const validationResult = ValidationFramework.validate(body, [
        CommonRules.required('action', 'Action'),
        CommonRules.oneOf('action', ['approve', 'reject', 'request_changes'], 'Action'),
        CommonRules.required('reason', 'Reason'),
      ], requestId);

      if (validationResult) {
        return ResponseHandler.error('Validation failed', 'VALIDATION_ERROR', 400);
      }

      // Check if listing exists
      const existingListing = await db.getListing(listingId);
      if (!existingListing) {
        return ResponseHandler.error('Listing not found', 'NOT_FOUND', 404);
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
          newStatus = 'under_review';
          moderationWorkflowStatus = 'changes_requested';
          break;
      }

      // Get existing moderation history
      const existingHistory = (existingListing as any).moderationHistory || [];
      
      console.log(`[MODERATION] Existing history length: ${existingHistory.length}`);
      console.log(`[MODERATION] Existing history:`, JSON.stringify(existingHistory, null, 2));
      
      // Create history entry for this action
      const historyEntry = {
        action: body.action,
        reviewedBy: userId,
        reviewedAt: Date.now(),
        status: moderationWorkflowStatus,
        rejectionReason: body.action === 'reject' ? body.reason : undefined,
        publicNotes: body.publicNotes,
        internalNotes: body.internalNotes,
        requiredChanges: body.requiredChanges,
      };

      console.log(`[MODERATION] New history entry:`, JSON.stringify(historyEntry, null, 2));
      
      const newHistory = [...existingHistory, historyEntry];
      console.log(`[MODERATION] New history array length: ${newHistory.length}`);
      console.log(`[MODERATION] New history array:`, JSON.stringify(newHistory, null, 2));

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
        moderationHistory: newHistory,
        updatedAt: Date.now(),
      } as any);

      // Update moderation queue status
      await db.updateModerationStatus(listingId, body.action === 'approve' ? 'approved' : 
                                     body.action === 'reject' ? 'rejected' : 'changes_requested', 
                                     moderationNotes);

      // Send notification to listing owner (this would integrate with notification service)
      await sendModerationNotification(existingListing.ownerId, listingId, body.action, body.publicNotes || body.reason);

      return ResponseHandler.success({
        message: `Listing ${body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : 'returned for changes'}`,
        listingId,
        status: newStatus,
        moderationAction: body.action,
      });
    },
    { operation: 'Process Moderation Decision', requestId }
  );
}

/**
 * Sends notification to listing owner about moderation status
 * 
 * Creates an in-app notification that the user can view in their notifications inbox.
 * In a future enhancement, this could also send email/SMS notifications.
 * 
 * @param ownerId - User ID of the listing owner
 * @param listingId - Listing ID that was moderated
 * @param action - Moderation action taken
 * @param message - Message to send to owner
 */
async function sendModerationNotification(ownerId: string, listingId: string, action: string, message: string): Promise<void> {
  try {
    // Import notification service functions
    const { createNotification } = await import('../notification-service/index');
    
    // Get listing to get the slug for the action URL
    const listing = await db.getListing(listingId) as any;
    const slug = listing?.slug || listingId;
    
    // Determine notification type and title based on action
    let notificationType: 'listing_approved' | 'listing_rejected' | 'listing_changes_requested';
    let title: string;
    
    switch (action) {
      case 'approve':
        notificationType = 'listing_approved';
        title = '✅ Listing Approved';
        break;
      case 'reject':
        notificationType = 'listing_rejected';
        title = '❌ Listing Rejected';
        break;
      case 'request_changes':
        notificationType = 'listing_changes_requested';
        title = '📝 Changes Requested';
        break;
      default:
        notificationType = 'listing_approved';
        title = 'Listing Update';
    }
    
    // Create the notification
    await createNotification(
      ownerId,
      notificationType,
      title,
      message,
      {
        listingId,
        action,
        timestamp: Date.now(),
      },
      `/boat/${slug}` // Action URL using slug for better UX
    );
    
    console.log(`✅ Notification created for user ${ownerId} about listing ${listingId}: ${action}`);
    
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
  return ResponseHandler.wrapHandler(
    async () => {
      const userId = getUserId(event);

      // Check if listing exists and user owns it
      const existingListing = await db.getListing(listingId);
      if (!existingListing) {
        return ResponseHandler.error('Listing not found', 'NOT_FOUND', 404);
      }

      if (existingListing.ownerId !== userId) {
        return ResponseHandler.error('You can only resubmit your own listings', 'FORBIDDEN', 403);
      }

      // Check if listing is in a state that allows resubmission
      const currentStatus = (existingListing as any).moderationWorkflow?.status;
      if (currentStatus !== 'changes_requested' && currentStatus !== 'rejected') {
        return ResponseHandler.error('Listing is not in a state that allows resubmission', 'INVALID_STATE', 400);
      }

      // Update listing status to pending review
      await db.updateListing(listingId, {
        status: 'pending_review' as any,
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

      return ResponseHandler.success({
        message: 'Listing resubmitted for moderation successfully',
        listingId,
        status: 'pending_review',
      });
    },
    { operation: 'Resubmit For Moderation', requestId }
  );
}
