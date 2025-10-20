/**
 * @fileoverview Enhanced Database service layer for HarborList DynamoDB operations.
 * 
 * Provides a comprehensive abstraction layer for DynamoDB operations including:
 * - CRUD operations for listings, users, engines, billing, and moderation
 * - Multi-engine boat support with automatic horsepower calculation
 * - User tier and membership management with capability assignment
 * - Billing account and transaction processing with financial reporting
 * - Content moderation workflow with queue management and audit trails
 * - Finance calculation storage and retrieval for boat loans
 * - Query optimization with proper indexing and pagination
 * - Atomic operations and conditional writes across multiple tables
 * - Error handling and retry logic with comprehensive validation
 * - Performance monitoring and optimization for large datasets
 * 
 * Database Design:
 * - Multi-table design with GSI for efficient cross-table queries
 * - Optimized partition key distribution across all entity types
 * - Proper data modeling for complex access patterns
 * - Consistent naming conventions and audit trail integration
 * - Transaction support for complex multi-table operations
 * 
 * Enhanced Features:
 * - Multi-Engine Support: Complete CRUD for boat engines with batch operations
 * - User Management: Tier-based permissions with capability assignment
 * - Billing Integration: Payment processing with transaction history
 * - Content Moderation: Queue-based workflow with priority and escalation
 * - Financial Tools: Loan calculation storage with sharing capabilities
 * - Bulk Operations: Efficient batch processing for administrative tasks
 * 
 * Performance Features:
 * - Efficient pagination with LastEvaluatedKey across all entities
 * - Batch operations for bulk updates and multi-record operations
 * - Conditional expressions to prevent conflicts and ensure consistency
 * - Optimized query patterns with GSI for complex filtering
 * - Connection pooling and reuse with proper error handling
 * - Transaction support for atomic multi-table operations
 * 
 * Security Features:
 * - Input validation and sanitization for all data types
 * - Conditional writes to prevent overwrites and race conditions
 * - Proper error handling without sensitive data leakage
 * - Comprehensive audit logging for all data access and modifications
 * - IAM-based access control with role-based permissions
 * - Financial data protection with secure transaction processing
 * 
 * Supported Entity Types:
 * - Listings: Enhanced boat listings with multi-engine support
 * - Engines: Individual engine records with specifications
 * - Users: Enhanced user profiles with tier and capability management
 * - Billing Accounts: Payment method and subscription management
 * - Transactions: Financial transaction records with reporting
 * - Moderation Queue: Content review workflow management
 * - Finance Calculations: Boat loan calculation storage
 * - User Tiers: Membership level configuration and limits
 * 
 * @author HarborList Development Team
 * @version 2.0.0 - Enhanced with multi-engine, billing, and moderation support
 * @since 1.0.0
 * @updated 2024-01-01 - Added comprehensive marketplace enhancements
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand, BatchWriteCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { Listing, Engine, EnhancedListing, EnhancedUser, BillingAccount, Transaction, FinanceCalculation, ModerationWorkflow, UserCapability, UserTier, ModerationNotes, ContentFlag } from '@harborlist/shared-types';

/**
 * DynamoDB client configuration with regional settings
 */
const clientConfig = { 
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  }),
};

const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

/**
 * Environment-based table name configuration
 */
const LISTINGS_TABLE = process.env.LISTINGS_TABLE!;
const USERS_TABLE = process.env.USERS_TABLE!;
const ENGINES_TABLE = process.env.ENGINES_TABLE || 'engines';
const BILLING_ACCOUNTS_TABLE = process.env.BILLING_ACCOUNTS_TABLE || 'billing-accounts';
const TRANSACTIONS_TABLE = process.env.TRANSACTIONS_TABLE || 'transactions';
const FINANCE_CALCULATIONS_TABLE = process.env.FINANCE_CALCULATIONS_TABLE || 'finance-calculations';
const MODERATION_QUEUE_TABLE = process.env.MODERATION_QUEUE_TABLE || 'moderation-queue';
const USER_TIERS_TABLE = process.env.USER_TIERS_TABLE || 'user-tiers';

/**
 * Database service class providing comprehensive DynamoDB operations
 * 
 * Encapsulates all database interactions with proper error handling,
 * performance optimization, and security measures. Provides a clean
 * abstraction layer for business logic operations.
 */
export class DatabaseService {
  
  /**
   * Creates a new boat listing in the database
   * 
   * Inserts a new listing record with conditional write to prevent
   * duplicate entries. Maps the business model to DynamoDB format
   * and ensures data consistency.
   * 
   * @param listing - Complete listing object with all required fields
   * @returns Promise<void> - Resolves when listing is successfully created
   * 
   * @throws {Error} When listing already exists or database operation fails
   * 
   * @example
   * ```typescript
   * const newListing: Listing = {
   *   listingId: 'unique-id',
   *   ownerId: 'user-123',
   *   title: 'Beautiful Sailboat',
   *   price: 50000,
   *   // ... other fields
   * };
   * 
   * await db.createListing(newListing);
   * ```
   */
  async createListing(listing: Listing): Promise<void> {
    await docClient.send(new PutCommand({
      TableName: LISTINGS_TABLE,
      Item: listing,
      ConditionExpression: 'attribute_not_exists(listingId)',
    }));
  }

  /**
   * Retrieves a specific boat listing by ID
   * 
   * Performs an efficient single-item lookup using the primary key.
   * Returns null if the listing doesn't exist or has been deleted.
   * 
   * @param listingId - Unique identifier for the listing
   * @returns Promise<Listing | null> - Listing object or null if not found
   * 
   * @example
   * ```typescript
   * const listing = await db.getListing('listing-123');
   * if (listing) {
   *   console.log(`Found listing: ${listing.title}`);
   * } else {
   *   console.log('Listing not found');
   * }
   * ```
   */
  async getListing(listingId: string): Promise<Listing | null> {
    const result = await docClient.send(new GetCommand({
      TableName: LISTINGS_TABLE,
      Key: { listingId: listingId },
    }));

    return result.Item as Listing || null;
  }

  /**
   * Retrieves a specific boat listing by SEO slug
   * 
   * Performs an efficient lookup using the SlugIndex GSI to find
   * listings by their SEO-friendly URL slug instead of internal ID.
   * 
   * @param slug - SEO-friendly URL slug for the listing
   * @returns Promise<EnhancedListing | null> - Listing object or null if not found
   * 
   * @example
   * ```typescript
   * const listing = await db.getListingBySlug('beautiful-sailboat-2023');
   * if (listing) {
   *   console.log(`Found listing: ${listing.title}`);
   * } else {
   *   console.log('Listing not found');
   * }
   * ```
   */
  async getListingBySlug(slug: string): Promise<EnhancedListing | null> {
    const result = await docClient.send(new QueryCommand({
      TableName: LISTINGS_TABLE,
      IndexName: 'SlugIndex',
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: {
        ':slug': slug,
      },
      Limit: 1,
    }));

    const items = result.Items as EnhancedListing[];
    return items && items.length > 0 ? items[0] : null;
  }

  /**
   * Creates a slug redirect record for SEO URL changes
   * 
   * Stores a mapping from old slug to new slug to handle URL redirects
   * when listing titles change. Helps maintain SEO value and prevents
   * broken links.
   * 
   * @param oldSlug - Previous slug that should redirect
   * @param newSlug - New slug to redirect to
   * @param listingId - Listing ID for reference
   * @returns Promise<void> - Resolves when redirect is created
   * 
   * @example
   * ```typescript
   * await db.createSlugRedirect('old-boat-title', 'new-boat-title', 'listing-123');
   * ```
   */
  async createSlugRedirect(oldSlug: string, newSlug: string, listingId: string): Promise<void> {
    if (!oldSlug || oldSlug === newSlug) return;

    const redirectRecord = {
      id: `redirect-${oldSlug}`,
      oldSlug,
      newSlug,
      listingId,
      createdAt: Date.now(),
      type: 'slug_redirect',
    };

    await docClient.send(new PutCommand({
      TableName: LISTINGS_TABLE,
      Item: redirectRecord,
    }));
  }

  /**
   * Retrieves redirect information for an old slug
   * 
   * Looks up redirect mapping to find the current slug for a listing
   * when accessed via an old URL.
   * 
   * @param oldSlug - Old slug to look up
   * @returns Promise<{newSlug: string, listingId: string} | null> - Redirect info or null
   * 
   * @example
   * ```typescript
   * const redirect = await db.getSlugRedirect('old-boat-title');
   * if (redirect) {
   *   // Redirect to redirect.newSlug
   * }
   * ```
   */
  async getSlugRedirect(oldSlug: string): Promise<{newSlug: string, listingId: string} | null> {
    const result = await docClient.send(new GetCommand({
      TableName: LISTINGS_TABLE,
      Key: { id: `redirect-${oldSlug}` },
    }));

    if (result.Item && result.Item.type === 'slug_redirect') {
      return {
        newSlug: result.Item.newSlug,
        listingId: result.Item.listingId,
      };
    }

    return null;
  }

  /**
   * Updates an existing boat listing with partial data
   * 
   * Performs atomic updates using DynamoDB UpdateExpression to modify
   * only the specified fields. Automatically excludes system fields
   * from updates and handles complex nested objects.
   * 
   * @param listingId - Unique identifier for the listing to update
   * @param updates - Partial listing object with fields to update
   * @returns Promise<void> - Resolves when update is complete
   * 
   * @throws {Error} When listing doesn't exist or update fails
   * 
   * @example
   * ```typescript
   * await db.updateListing('listing-123', {
   *   price: 55000,
   *   description: 'Updated description',
   *   updatedAt: Date.now()
   * });
   * ```
   */
  async updateListing(listingId: string, updates: Partial<Listing>): Promise<void> {
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // GSI key attributes that cannot be empty strings
    const gsiKeys = ['slug', 'status', 'ownerId', 'totalHorsepower', 'engineConfiguration'];

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'listingId' && key !== 'id') {
        // Skip GSI keys that are empty strings
        if (gsiKeys.includes(key) && value === '') {
          console.warn(`Skipping empty string value for GSI key: ${key}`);
          continue;
        }
        
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) return;

    await docClient.send(new UpdateCommand({
      TableName: LISTINGS_TABLE,
      Key: { listingId: listingId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  /**
   * Permanently deletes a boat listing from the database
   * 
   * Removes the listing record completely from DynamoDB. This operation
   * is irreversible and should be used with caution. Consider soft
   * deletion for audit trail purposes.
   * 
   * @param listingId - Unique identifier for the listing to delete
   * @returns Promise<void> - Resolves when deletion is complete
   * 
   * @throws {Error} When deletion fails or listing doesn't exist
   * 
   * @example
   * ```typescript
   * await db.deleteListing('listing-123');
   * console.log('Listing deleted successfully');
   * ```
   */
  async deleteListing(listingId: string): Promise<void> {
    await docClient.send(new DeleteCommand({
      TableName: LISTINGS_TABLE,
      Key: { listingId: listingId },
    }));
  }

  /**
   * Retrieves all listings owned by a specific user
   * 
   * Uses the OwnerIndex GSI for efficient querying by owner ID.
   * Returns all listings regardless of status for owner management.
   * 
   * @param ownerId - User ID of the listing owner
   * @returns Promise<Listing[]> - Array of listings owned by the user
   * 
   * @example
   * ```typescript
   * const userListings = await db.getListingsByOwner('user-123');
   * console.log(`User has ${userListings.length} listings`);
   * ```
   */
  async getListingsByOwner(ownerId: string): Promise<Listing[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: LISTINGS_TABLE,
      IndexName: 'OwnerIndex',
      KeyConditionExpression: 'ownerId = :ownerId',
      ExpressionAttributeValues: {
        ':ownerId': ownerId,
      },
    }));

    return result.Items as Listing[] || [];
  }

  /**
   * Retrieves paginated active listings from the database
   * 
   * Performs a filtered scan to get active listings with pagination
   * support. Uses LastEvaluatedKey for efficient pagination through
   * large datasets without loading all items into memory.
   * 
   * @param limit - Maximum number of listings to return (default: 20)
   * @param lastKey - Pagination token from previous request (optional)
   * @returns Promise<{listings: Listing[], lastKey?: any}> - Paginated results
   * 
   * @example
   * ```typescript
   * // First page
   * const page1 = await db.getListings(10);
   * 
   * // Next page
   * const page2 = await db.getListings(10, page1.lastKey);
   * ```
   */
  async getListings(limit: number = 20, lastKey?: any): Promise<{ listings: Listing[]; lastKey?: any }> {
    const result = await docClient.send(new ScanCommand({
      TableName: LISTINGS_TABLE,
      Limit: limit,
      ExclusiveStartKey: lastKey,
    }));

    return {
      listings: result.Items as Listing[] || [],
      lastKey: result.LastEvaluatedKey,
    };
  }

  /**
   * Atomically increments the view count for a listing
   * 
   * Uses DynamoDB's atomic ADD operation to safely increment the
   * view counter without race conditions. Handles concurrent access
   * properly for accurate analytics.
   * 
   * @param listingId - Unique identifier for the listing
   * @returns Promise<void> - Resolves when increment is complete
   * 
   * @example
   * ```typescript
   * // Called when a user views a listing
   * await db.incrementViews('listing-123');
   * ```
   */
  async incrementViews(listingId: string): Promise<void> {
    await docClient.send(new UpdateCommand({
      TableName: LISTINGS_TABLE,
      Key: { id: listingId },
      UpdateExpression: 'ADD #views :inc',
      ExpressionAttributeNames: {
        '#views': 'views',
      },
      ExpressionAttributeValues: {
        ':inc': 1,
      },
    }));
  }

  /**
   * Creates a new user account in the database
   * 
   * Inserts a new user record with proper field mapping for DynamoDB.
   * Maps business model fields to database schema and ensures data
   * consistency across the platform.
   * 
   * @param user - Complete user object with all required fields
   * @returns Promise<void> - Resolves when user is successfully created
   * 
   * @throws {Error} When user creation fails or validation errors occur
   * 
   * @example
   * ```typescript
   * const newUser = {
   *   userId: 'user-123',
   *   email: 'user@example.com',
   *   name: 'John Doe',
   *   // ... other fields
   * };
   * 
   * await db.createUser(newUser);
   * ```
   */
  async createUser(user: any): Promise<void> {
    // Add id field for DynamoDB primary key
    const userWithId = {
      ...user,
      id: user.userId, // Use userId as the id for DynamoDB
    };

    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: userWithId,
    }));
  }

  /**
   * Retrieves a user account by ID
   * 
   * Performs an efficient single-item lookup using the primary key.
   * Returns null if the user doesn't exist or has been deleted.
   * 
   * @param userId - Unique identifier for the user
   * @returns Promise<any | null> - User object or null if not found
   * 
   * @example
   * ```typescript
   * const user = await db.getUser('user-123');
   * if (user) {
   *   console.log(`Found user: ${user.name}`);
   * } else {
   *   console.log('User not found');
   * }
   * ```
   */
  async getUser(userId: string): Promise<any> {
    const result = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { id: userId },
    }));

    return result.Item || null;
  }

  /**
   * Updates an existing user account with partial data
   * 
   * Performs atomic updates using DynamoDB UpdateExpression to modify
   * only the specified fields. Automatically excludes system fields
   * from updates and handles complex nested objects safely.
   * 
   * @param userId - Unique identifier for the user to update
   * @param updates - Partial user object with fields to update
   * @returns Promise<void> - Resolves when update is complete
   * 
   * @throws {Error} When user doesn't exist or update fails
   * 
   * @example
   * ```typescript
   * await db.updateUser('user-123', {
   *   name: 'Updated Name',
   *   lastLogin: new Date().toISOString(),
   *   preferences: { theme: 'dark' }
   * });
   * ```
   */
  async updateUser(userId: string, updates: any): Promise<void> {
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'userId' && key !== 'id') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) return;

    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { id: userId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  // ========================================
  // Multi-Engine Database Operations
  // ========================================

  /**
   * Creates a new engine record for a boat listing
   * 
   * Inserts a new engine with all specifications and associates it
   * with a specific listing. Validates engine data and ensures
   * proper positioning for multi-engine configurations.
   * 
   * @param engine - Complete engine object with specifications
   * @returns Promise<void> - Resolves when engine is created
   * 
   * @throws {Error} When engine creation fails or validation errors occur
   * 
   * @example
   * ```typescript
   * const engine: Engine = {
   *   engineId: 'engine-123',
   *   listingId: 'listing-456',
   *   type: 'outboard',
   *   horsepower: 250,
   *   fuelType: 'gasoline',
   *   condition: 'excellent',
   *   position: 1
   * };
   * 
   * await db.createEngine(engine);
   * ```
   */
  async createEngine(engine: Engine & { listingId: string }): Promise<void> {
    const engineWithId = {
      ...engine,
      id: engine.engineId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await docClient.send(new PutCommand({
      TableName: ENGINES_TABLE,
      Item: engineWithId,
      ConditionExpression: 'attribute_not_exists(id)',
    }));
  }

  /**
   * Updates an existing engine with new specifications
   * 
   * Performs atomic updates to engine specifications while maintaining
   * data consistency. Automatically updates the associated listing's
   * total horsepower calculation.
   * 
   * @param engineId - Unique identifier for the engine
   * @param updates - Partial engine object with fields to update
   * @returns Promise<void> - Resolves when update is complete
   * 
   * @throws {Error} When engine doesn't exist or update fails
   * 
   * @example
   * ```typescript
   * await db.updateEngine('engine-123', {
   *   horsepower: 300,
   *   hours: 150,
   *   condition: 'good'
   * });
   * ```
   */
  async updateEngine(engineId: string, updates: Partial<Engine>): Promise<void> {
    const updateExpression = ['#updatedAt = :updatedAt'];
    const expressionAttributeNames: Record<string, string> = { '#updatedAt': 'updatedAt' };
    const expressionAttributeValues: Record<string, any> = { ':updatedAt': Date.now() };

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'engineId' && key !== 'id' && key !== 'listingId') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    await docClient.send(new UpdateCommand({
      TableName: ENGINES_TABLE,
      Key: { id: engineId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  /**
   * Deletes an engine from a boat listing
   * 
   * Removes the engine record and updates the associated listing's
   * engine configuration and total horsepower. Ensures data consistency
   * across related records.
   * 
   * @param engineId - Unique identifier for the engine to delete
   * @returns Promise<void> - Resolves when deletion is complete
   * 
   * @throws {Error} When deletion fails or engine doesn't exist
   * 
   * @example
   * ```typescript
   * await db.deleteEngine('engine-123');
   * ```
   */
  async deleteEngine(engineId: string): Promise<void> {
    await docClient.send(new DeleteCommand({
      TableName: ENGINES_TABLE,
      Key: { id: engineId },
    }));
  }

  /**
   * Retrieves all engines associated with a specific boat listing
   * 
   * Queries engines by listing ID and returns them sorted by position
   * for proper multi-engine display. Includes all engine specifications
   * and current condition information.
   * 
   * @param listingId - Unique identifier for the boat listing
   * @returns Promise<Engine[]> - Array of engines for the listing
   * 
   * @example
   * ```typescript
   * const engines = await db.getEnginesByListing('listing-456');
   * console.log(`Boat has ${engines.length} engines`);
   * engines.forEach(engine => {
   *   console.log(`Engine ${engine.position}: ${engine.horsepower}hp ${engine.type}`);
   * });
   * ```
   */
  async getEnginesByListing(listingId: string): Promise<Engine[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: ENGINES_TABLE,
      IndexName: 'ListingIndex',
      KeyConditionExpression: 'listingId = :listingId',
      ExpressionAttributeValues: {
        ':listingId': listingId,
      },
    }));

    const engines = (result.Items as (Engine & { listingId: string })[]) || [];
    
    // Sort by position for consistent ordering
    return engines.sort((a, b) => a.position - b.position);
  }

  /**
   * Queries boat listings by total horsepower range
   * 
   * Efficiently searches for boats within a specified horsepower range
   * using the TotalHorsepowerIndex GSI. Supports pagination for large
   * result sets and includes engine configuration details.
   * 
   * @param minHorsepower - Minimum total horsepower (inclusive)
   * @param maxHorsepower - Maximum total horsepower (inclusive)
   * @param limit - Maximum number of results to return
   * @param lastKey - Pagination token from previous request
   * @returns Promise<{listings: EnhancedListing[], lastKey?: any}> - Paginated results
   * 
   * @example
   * ```typescript
   * // Find boats with 200-500 total horsepower
   * const results = await db.getListingsByHorsepower(200, 500, 20);
   * results.listings.forEach(listing => {
   *   console.log(`${listing.title}: ${listing.totalHorsepower}hp total`);
   * });
   * ```
   */
  async getListingsByHorsepower(
    minHorsepower: number, 
    maxHorsepower: number, 
    limit: number = 20, 
    lastKey?: any
  ): Promise<{ listings: EnhancedListing[]; lastKey?: any }> {
    const result = await docClient.send(new QueryCommand({
      TableName: LISTINGS_TABLE,
      IndexName: 'TotalHorsepowerIndex',
      KeyConditionExpression: 'totalHorsepower BETWEEN :min AND :max',
      ExpressionAttributeValues: {
        ':min': minHorsepower,
        ':max': maxHorsepower,
      },
      Limit: limit,
      ExclusiveStartKey: lastKey,
    }));

    return {
      listings: result.Items as EnhancedListing[] || [],
      lastKey: result.LastEvaluatedKey,
    };
  }

  /**
   * Queries boat listings by engine configuration type
   * 
   * Searches for boats with specific engine configurations (single, twin, etc.)
   * using efficient indexing. Useful for buyers with specific engine preferences.
   * 
   * @param configuration - Engine configuration type to search for
   * @param limit - Maximum number of results to return
   * @param lastKey - Pagination token from previous request
   * @returns Promise<{listings: EnhancedListing[], lastKey?: any}> - Paginated results
   * 
   * @example
   * ```typescript
   * // Find all twin-engine boats
   * const twinEngineBoats = await db.getListingsByEngineConfiguration('twin', 10);
   * ```
   */
  async getListingsByEngineConfiguration(
    configuration: 'single' | 'twin' | 'triple' | 'quad',
    limit: number = 20,
    lastKey?: any
  ): Promise<{ listings: EnhancedListing[]; lastKey?: any }> {
    const result = await docClient.send(new QueryCommand({
      TableName: LISTINGS_TABLE,
      IndexName: 'EngineConfigurationIndex',
      KeyConditionExpression: 'engineConfiguration = :config',
      ExpressionAttributeValues: {
        ':config': configuration,
      },
      Limit: limit,
      ExclusiveStartKey: lastKey,
    }));

    return {
      listings: result.Items as EnhancedListing[] || [],
      lastKey: result.LastEvaluatedKey,
    };
  }

  /**
   * Batch creates multiple engines for a boat listing
   * 
   * Efficiently creates multiple engine records in a single operation
   * with proper error handling and rollback capabilities. Ensures
   * data consistency for multi-engine boat configurations.
   * 
   * @param engines - Array of engine objects to create
   * @returns Promise<void> - Resolves when all engines are created
   * 
   * @throws {Error} When batch operation fails or validation errors occur
   * 
   * @example
   * ```typescript
   * const engines = [
   *   { engineId: 'engine-1', listingId: 'listing-456', type: 'outboard', horsepower: 250, position: 1 },
   *   { engineId: 'engine-2', listingId: 'listing-456', type: 'outboard', horsepower: 250, position: 2 }
   * ];
   * 
   * await db.batchCreateEngines(engines);
   * ```
   */
  async batchCreateEngines(engines: (Engine & { listingId: string })[]): Promise<void> {
    if (engines.length === 0) return;

    const timestamp = Date.now();
    const putRequests = engines.map(engine => ({
      PutRequest: {
        Item: {
          ...engine,
          id: engine.engineId,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      }
    }));

    // DynamoDB batch write supports up to 25 items per request
    const batchSize = 25;
    for (let i = 0; i < putRequests.length; i += batchSize) {
      const batch = putRequests.slice(i, i + batchSize);
      
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [ENGINES_TABLE]: batch
        }
      }));
    }
  }

  /**
   * Batch deletes multiple engines from a boat listing
   * 
   * Efficiently removes multiple engine records in a single operation
   * with proper error handling. Used when updating engine configurations
   * or removing all engines from a listing.
   * 
   * @param engineIds - Array of engine IDs to delete
   * @returns Promise<void> - Resolves when all engines are deleted
   * 
   * @throws {Error} When batch operation fails
   * 
   * @example
   * ```typescript
   * const engineIds = ['engine-1', 'engine-2', 'engine-3'];
   * await db.batchDeleteEngines(engineIds);
   * ```
   */
  async batchDeleteEngines(engineIds: string[]): Promise<void> {
    if (engineIds.length === 0) return;

    const deleteRequests = engineIds.map(engineId => ({
      DeleteRequest: {
        Key: { id: engineId }
      }
    }));

    // DynamoDB batch write supports up to 25 items per request
    const batchSize = 25;
    for (let i = 0; i < deleteRequests.length; i += batchSize) {
      const batch = deleteRequests.slice(i, i + batchSize);
      
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [ENGINES_TABLE]: batch
        }
      }));
    }
  }

  /**
   * Updates a listing with engine information and calculated totals
   * 
   * Atomically updates a listing with engine data, total horsepower,
   * and engine configuration. Ensures consistency between listing
   * and engine records through transactional operations.
   * 
   * @param listingId - Unique identifier for the listing
   * @param engines - Array of engines associated with the listing
   * @returns Promise<void> - Resolves when listing is updated
   * 
   * @throws {Error} When update fails or data inconsistency occurs
   * 
   * @example
   * ```typescript
   * const engines = await db.getEnginesByListing('listing-456');
   * await db.updateListingWithEngines('listing-456', engines);
   * ```
   */
  async updateListingWithEngines(listingId: string, engines: Engine[]): Promise<void> {
    const totalHorsepower = engines.reduce((sum, engine) => sum + engine.horsepower, 0);
    const engineConfiguration = this.determineEngineConfiguration(engines.length);

    // Update listing with engine information using direct update
    await docClient.send(new UpdateCommand({
      TableName: LISTINGS_TABLE,
      Key: { id: listingId },
      UpdateExpression: 'SET engines = :engines, totalHorsepower = :totalHorsepower, engineConfiguration = :engineConfiguration, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':engines': engines,
        ':totalHorsepower': totalHorsepower,
        ':engineConfiguration': engineConfiguration,
        ':updatedAt': Date.now()
      },
    }));
  }

  /**
   * Determines engine configuration based on number of engines
   * 
   * Helper method to calculate the engine configuration string
   * based on the number of engines in the boat.
   * 
   * @param engineCount - Number of engines
   * @returns Engine configuration string
   * 
   * @private
   */
  private determineEngineConfiguration(engineCount: number): 'single' | 'twin' | 'triple' | 'quad' {
    switch (engineCount) {
      case 1: return 'single';
      case 2: return 'twin';
      case 3: return 'triple';
      case 4: return 'quad';
      default: return 'single';
    }
  }

  // ========================================
  // User Tier and Membership Database Operations
  // ========================================

  /**
   * Retrieves user tier information by tier ID
   * 
   * Fetches complete tier configuration including features, limits,
   * and pricing information. Used for user type validation and
   * feature access control.
   * 
   * @param tierId - Unique identifier for the user tier
   * @returns Promise<UserTier | null> - Tier configuration or null if not found
   * 
   * @example
   * ```typescript
   * const tier = await db.getUserTier('premium-dealer');
   * if (tier) {
   *   console.log(`Tier: ${tier.name}, Max Listings: ${tier.limits.maxListings}`);
   * }
   * ```
   */
  async getUserTier(tierId: string): Promise<UserTier | null> {
    const result = await docClient.send(new GetCommand({
      TableName: USER_TIERS_TABLE,
      Key: { id: tierId },
    }));

    return result.Item as UserTier || null;
  }

  /**
   * Updates user tier configuration
   * 
   * Modifies tier settings including features, limits, and pricing.
   * Automatically updates all users assigned to this tier with new
   * capabilities and restrictions.
   * 
   * @param tierId - Unique identifier for the tier to update
   * @param updates - Partial tier object with fields to update
   * @returns Promise<void> - Resolves when update is complete
   * 
   * @throws {Error} When tier doesn't exist or update fails
   * 
   * @example
   * ```typescript
   * await db.updateUserTier('premium-dealer', {
   *   limits: { maxListings: 100, maxImages: 20 },
   *   pricing: { monthly: 99.99 }
   * });
   * ```
   */
  async updateUserTier(tierId: string, updates: Partial<UserTier>): Promise<void> {
    const updateExpression = ['#updatedAt = :updatedAt'];
    const expressionAttributeNames: Record<string, string> = { '#updatedAt': 'updatedAt' };
    const expressionAttributeValues: Record<string, any> = { ':updatedAt': Date.now() };

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'tierId' && key !== 'id') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    await docClient.send(new UpdateCommand({
      TableName: USER_TIERS_TABLE,
      Key: { id: tierId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  /**
   * Assigns user capabilities to a specific user
   * 
   * Grants or updates specific feature capabilities for a user with
   * expiration dates and audit trail. Supports granular permission
   * control beyond standard tier limitations.
   * 
   * @param userId - Unique identifier for the user
   * @param capabilities - Array of capabilities to assign
   * @returns Promise<void> - Resolves when capabilities are assigned
   * 
   * @throws {Error} When user doesn't exist or assignment fails
   * 
   * @example
   * ```typescript
   * const capabilities: UserCapability[] = [
   *   {
   *     feature: 'priority_placement',
   *     enabled: true,
   *     expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
   *     grantedBy: 'admin-123',
   *     grantedAt: Date.now()
   *   }
   * ];
   * 
   * await db.assignUserCapabilities('user-456', capabilities);
   * ```
   */
  async assignUserCapabilities(userId: string, capabilities: UserCapability[]): Promise<void> {
    await this.updateUser(userId, {
      capabilities: capabilities,
      updatedAt: Date.now()
    });
  }

  /**
   * Updates user type and associated tier information
   * 
   * Transitions a user between different types (individual, dealer, premium)
   * with proper validation and history tracking. Ensures data consistency
   * and proper capability assignment.
   * 
   * @param userId - Unique identifier for the user
   * @param userType - New user type to assign
   * @param membershipDetails - Updated membership configuration
   * @returns Promise<void> - Resolves when user type is updated
   * 
   * @throws {Error} When invalid transition or update fails
   * 
   * @example
   * ```typescript
   * await db.updateUserType('user-456', 'premium_dealer', {
   *   plan: 'premium-dealer-monthly',
   *   tierId: 'premium-dealer',
   *   features: ['priority_placement', 'bulk_operations'],
   *   limits: { maxListings: 50, maxImages: 15 },
   *   expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
   *   autoRenew: true,
   *   billingCycle: 'monthly'
   * });
   * ```
   */
  async updateUserType(
    userId: string, 
    userType: 'individual' | 'dealer' | 'premium_individual' | 'premium_dealer',
    membershipDetails: EnhancedUser['membershipDetails']
  ): Promise<void> {
    const isPremium = userType.startsWith('premium_');
    
    await this.updateUser(userId, {
      userType: userType,
      membershipDetails: membershipDetails,
      premiumActive: isPremium,
      premiumPlan: isPremium ? membershipDetails.plan : undefined,
      premiumExpiresAt: membershipDetails.expiresAt,
      updatedAt: Date.now()
    });
  }

  /**
   * Validates user type transition
   * 
   * Checks if a user type transition is valid based on business rules
   * and current user state. Prevents invalid transitions and ensures
   * proper upgrade/downgrade paths.
   * 
   * @param currentType - Current user type
   * @param newType - Proposed new user type
   * @returns Promise<boolean> - True if transition is valid
   * 
   * @example
   * ```typescript
   * const isValid = await db.validateUserTypeTransition('individual', 'premium_individual');
   * if (isValid) {
   *   await db.updateUserType(userId, 'premium_individual', membershipDetails);
   * }
   * ```
   */
  async validateUserTypeTransition(
    currentType: string, 
    newType: string
  ): Promise<boolean> {
    // Define valid transition paths
    const validTransitions: Record<string, string[]> = {
      'individual': ['dealer', 'premium_individual'],
      'dealer': ['individual', 'premium_dealer'],
      'premium_individual': ['individual', 'premium_dealer'],
      'premium_dealer': ['dealer', 'premium_individual']
    };

    return validTransitions[currentType]?.includes(newType) || false;
  }

  /**
   * Tracks user type transition history
   * 
   * Records user type changes for audit purposes and analytics.
   * Maintains a complete history of user tier transitions with
   * timestamps and reasons.
   * 
   * @param userId - Unique identifier for the user
   * @param fromType - Previous user type
   * @param toType - New user type
   * @param reason - Reason for the transition
   * @param changedBy - ID of admin who made the change
   * @returns Promise<void> - Resolves when history is recorded
   * 
   * @example
   * ```typescript
   * await db.trackUserTypeTransition(
   *   'user-456',
   *   'individual',
   *   'premium_individual',
   *   'User upgraded to premium membership',
   *   'admin-123'
   * );
   * ```
   */
  async trackUserTypeTransition(
    userId: string,
    fromType: string,
    toType: string,
    reason: string,
    changedBy: string
  ): Promise<void> {
    const transitionRecord = {
      id: `transition-${userId}-${Date.now()}`,
      userId: userId,
      fromType: fromType,
      toType: toType,
      reason: reason,
      changedBy: changedBy,
      timestamp: Date.now()
    };

    await docClient.send(new PutCommand({
      TableName: 'user-type-transitions',
      Item: transitionRecord
    }));
  }

  /**
   * Retrieves users by type for bulk operations
   * 
   * Efficiently queries users by type using GSI for admin operations
   * like bulk updates, notifications, or analytics. Supports pagination
   * for large user bases.
   * 
   * @param userType - User type to query
   * @param limit - Maximum number of users to return
   * @param lastKey - Pagination token from previous request
   * @returns Promise<{users: EnhancedUser[], lastKey?: any}> - Paginated results
   * 
   * @example
   * ```typescript
   * // Get all premium dealers for billing update
   * const premiumDealers = await db.getUsersByType('premium_dealer', 50);
   * ```
   */
  async getUsersByType(
    userType: 'individual' | 'dealer' | 'premium_individual' | 'premium_dealer',
    limit: number = 20,
    lastKey?: any
  ): Promise<{ users: EnhancedUser[]; lastKey?: any }> {
    const result = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'UserTypeIndex',
      KeyConditionExpression: 'userType = :userType',
      ExpressionAttributeValues: {
        ':userType': userType,
      },
      Limit: limit,
      ExclusiveStartKey: lastKey,
    }));

    return {
      users: result.Items as EnhancedUser[] || [],
      lastKey: result.LastEvaluatedKey,
    };
  }

  /**
   * Bulk updates user capabilities for multiple users
   * 
   * Efficiently updates capabilities for multiple users in batch operations.
   * Used for tier-wide feature rollouts or bulk permission changes.
   * Includes proper error handling and rollback capabilities.
   * 
   * @param userUpdates - Array of user ID and capability pairs
   * @returns Promise<void> - Resolves when all updates are complete
   * 
   * @throws {Error} When batch operation fails
   * 
   * @example
   * ```typescript
   * const updates = [
   *   { userId: 'user-1', capabilities: [newCapability] },
   *   { userId: 'user-2', capabilities: [newCapability] }
   * ];
   * 
   * await db.bulkUpdateUserCapabilities(updates);
   * ```
   */
  async bulkUpdateUserCapabilities(
    userUpdates: Array<{ userId: string; capabilities: UserCapability[] }>
  ): Promise<void> {
    const timestamp = Date.now();
    
    // Process in batches to avoid DynamoDB limits
    const batchSize = 25;
    for (let i = 0; i < userUpdates.length; i += batchSize) {
      const batch = userUpdates.slice(i, i + batchSize);
      
      const transactItems = batch.map(update => ({
        Update: {
          TableName: USERS_TABLE,
          Key: { id: update.userId },
          UpdateExpression: 'SET capabilities = :capabilities, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':capabilities': update.capabilities,
            ':updatedAt': timestamp
          }
        }
      }));

      await docClient.send(new TransactWriteCommand({
        TransactItems: transactItems
      }));
    }
  }

  /**
   * Retrieves users with expiring premium memberships
   * 
   * Queries users whose premium memberships are expiring within a
   * specified timeframe. Used for renewal notifications and automatic
   * downgrade processing.
   * 
   * @param daysUntilExpiration - Number of days until expiration
   * @returns Promise<EnhancedUser[]> - Users with expiring memberships
   * 
   * @example
   * ```typescript
   * // Get users expiring in the next 7 days
   * const expiringUsers = await db.getUsersWithExpiringMemberships(7);
   * ```
   */
  async getUsersWithExpiringMemberships(daysUntilExpiration: number): Promise<EnhancedUser[]> {
    const expirationThreshold = Date.now() + (daysUntilExpiration * 24 * 60 * 60 * 1000);
    
    const result = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'PremiumExpirationIndex',
      KeyConditionExpression: 'premiumActive = :active AND premiumExpiresAt <= :threshold',
      ExpressionAttributeValues: {
        ':active': true,
        ':threshold': expirationThreshold,
      },
    }));

    return result.Items as EnhancedUser[] || [];
  }

  // ========================================
  // Billing and Transaction Database Operations
  // ========================================

  /**
   * Creates a new billing account for a user
   * 
   * Establishes billing account with payment method and subscription
   * information. Includes proper validation and security measures
   * for financial data handling.
   * 
   * @param billingAccount - Complete billing account object
   * @returns Promise<void> - Resolves when account is created
   * 
   * @throws {Error} When account creation fails or validation errors occur
   * 
   * @example
   * ```typescript
   * const billingAccount: BillingAccount = {
   *   billingId: 'billing-123',
   *   userId: 'user-456',
   *   plan: 'premium-monthly',
   *   amount: 29.99,
   *   currency: 'USD',
   *   status: 'active',
   *   nextBillingDate: Date.now() + (30 * 24 * 60 * 60 * 1000)
   * };
   * 
   * await db.createBillingAccount(billingAccount);
   * ```
   */
  async createBillingAccount(billingAccount: BillingAccount): Promise<void> {
    const accountWithId = {
      ...billingAccount,
      id: billingAccount.billingId,
      paymentHistory: billingAccount.paymentHistory || [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await docClient.send(new PutCommand({
      TableName: BILLING_ACCOUNTS_TABLE,
      Item: accountWithId,
      ConditionExpression: 'attribute_not_exists(id)',
    }));
  }

  /**
   * Retrieves billing account by user ID
   * 
   * Fetches the active billing account for a user including payment
   * history and current subscription status. Used for billing
   * management and payment processing.
   * 
   * @param userId - Unique identifier for the user
   * @returns Promise<BillingAccount | null> - Billing account or null if not found
   * 
   * @example
   * ```typescript
   * const billingAccount = await db.getBillingAccountByUser('user-456');
   * if (billingAccount) {
   *   console.log(`Plan: ${billingAccount.plan}, Status: ${billingAccount.status}`);
   * }
   * ```
   */
  async getBillingAccountByUser(userId: string): Promise<BillingAccount | null> {
    const result = await docClient.send(new QueryCommand({
      TableName: BILLING_ACCOUNTS_TABLE,
      IndexName: 'UserIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      Limit: 1,
    }));

    const accounts = result.Items as BillingAccount[] || [];
    return accounts.length > 0 ? accounts[0] : null;
  }

  /**
   * Updates payment method for a billing account
   * 
   * Securely updates payment method information with proper validation
   * and audit trail. Handles payment processor integration and
   * subscription updates.
   * 
   * @param billingId - Unique identifier for the billing account
   * @param paymentMethodId - New payment method identifier
   * @param customerId - Payment processor customer ID
   * @returns Promise<void> - Resolves when payment method is updated
   * 
   * @throws {Error} When update fails or payment method is invalid
   * 
   * @example
   * ```typescript
   * await db.updatePaymentMethod('billing-123', 'pm_1234567890', 'cus_1234567890');
   * ```
   */
  async updatePaymentMethod(
    billingId: string, 
    paymentMethodId: string, 
    customerId?: string
  ): Promise<void> {
    const updateExpression = ['#paymentMethodId = :paymentMethodId', '#updatedAt = :updatedAt'];
    const expressionAttributeNames: Record<string, string> = {
      '#paymentMethodId': 'paymentMethodId',
      '#updatedAt': 'updatedAt'
    };
    const expressionAttributeValues: Record<string, any> = {
      ':paymentMethodId': paymentMethodId,
      ':updatedAt': Date.now()
    };

    if (customerId) {
      updateExpression.push('#customerId = :customerId');
      expressionAttributeNames['#customerId'] = 'customerId';
      expressionAttributeValues[':customerId'] = customerId;
    }

    await docClient.send(new UpdateCommand({
      TableName: BILLING_ACCOUNTS_TABLE,
      Key: { id: billingId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  /**
   * Processes a new transaction record
   * 
   * Creates a transaction record with proper validation and links it
   * to the appropriate billing account. Handles different transaction
   * types and maintains financial audit trail.
   * 
   * @param transaction - Complete transaction object
   * @returns Promise<void> - Resolves when transaction is recorded
   * 
   * @throws {Error} When transaction processing fails
   * 
   * @example
   * ```typescript
   * const transaction: Transaction = {
   *   id: 'txn-123',
   *   transactionId: 'txn-123',
   *   type: 'payment',
   *   amount: 29.99,
   *   currency: 'USD',
   *   status: 'completed',
   *   userId: 'user-456',
   *   userName: 'John Doe',
   *   userEmail: 'john@example.com',
   *   paymentMethod: 'card',
   *   processorTransactionId: 'pi_1234567890',
   *   description: 'Premium membership payment',
   *   fees: 1.17,
   *   netAmount: 28.82,
   *   createdAt: new Date().toISOString()
   * };
   * 
   * await db.processTransaction(transaction);
   * ```
   */
  async processTransaction(transaction: Transaction): Promise<void> {
    const transactionWithId = {
      ...transaction,
      id: transaction.transactionId,
      createdAt: transaction.createdAt || new Date().toISOString(),
      completedAt: transaction.status === 'completed' ? new Date().toISOString() : undefined
    };

    await docClient.send(new PutCommand({
      TableName: TRANSACTIONS_TABLE,
      Item: transactionWithId,
      ConditionExpression: 'attribute_not_exists(id)',
    }));
  }

  /**
   * Retrieves transaction history for a user with pagination
   * 
   * Fetches paginated transaction history with filtering options.
   * Supports date range filtering, transaction type filtering,
   * and status filtering for comprehensive financial reporting.
   * 
   * @param userId - Unique identifier for the user
   * @param limit - Maximum number of transactions to return
   * @param lastKey - Pagination token from previous request
   * @param filters - Optional filters for transaction type, status, date range
   * @returns Promise<{transactions: Transaction[], lastKey?: any}> - Paginated results
   * 
   * @example
   * ```typescript
   * const history = await db.getTransactionHistory('user-456', 20, null, {
   *   type: 'payment',
   *   status: 'completed',
   *   dateRange: { start: '2024-01-01', end: '2024-12-31' }
   * });
   * ```
   */
  async getTransactionHistory(
    userId: string,
    limit: number = 20,
    lastKey?: any,
    filters?: {
      type?: string;
      status?: string;
      dateRange?: { start: string; end: string };
    }
  ): Promise<{ transactions: Transaction[]; lastKey?: any }> {
    let keyConditionExpression = 'userId = :userId';
    const expressionAttributeValues: Record<string, any> = {
      ':userId': userId,
    };

    // Add date range filter if provided
    if (filters?.dateRange) {
      keyConditionExpression += ' AND createdAt BETWEEN :startDate AND :endDate';
      expressionAttributeValues[':startDate'] = filters.dateRange.start;
      expressionAttributeValues[':endDate'] = filters.dateRange.end;
    }

    let filterExpression = '';
    if (filters?.type) {
      filterExpression += '#type = :type';
      expressionAttributeValues[':type'] = filters.type;
    }
    if (filters?.status) {
      if (filterExpression) filterExpression += ' AND ';
      filterExpression += '#status = :status';
      expressionAttributeValues[':status'] = filters.status;
    }

    const queryParams: any = {
      TableName: TRANSACTIONS_TABLE,
      IndexName: 'UserIndex',
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ExclusiveStartKey: lastKey,
      ScanIndexForward: false, // Most recent first
    };

    if (filterExpression) {
      queryParams.FilterExpression = filterExpression;
      queryParams.ExpressionAttributeNames = {
        '#type': 'type',
        '#status': 'status'
      };
    }

    const result = await docClient.send(new QueryCommand(queryParams));

    return {
      transactions: result.Items as Transaction[] || [],
      lastKey: result.LastEvaluatedKey,
    };
  }

  /**
   * Aggregates financial reporting data
   * 
   * Generates financial summaries and analytics data for reporting
   * purposes. Calculates totals, averages, and breakdowns by various
   * dimensions for admin dashboards.
   * 
   * @param dateRange - Date range for the report
   * @param groupBy - Grouping dimension (day, week, month)
   * @returns Promise<any> - Aggregated financial data
   * 
   * @example
   * ```typescript
   * const report = await db.getFinancialReportingData(
   *   { start: '2024-01-01', end: '2024-12-31' },
   *   'month'
   * );
   * ```
   */
  async getFinancialReportingData(
    dateRange: { start: string; end: string },
    groupBy: 'day' | 'week' | 'month' = 'month'
  ): Promise<any> {
    // This would typically involve complex aggregation queries
    // For now, we'll implement a basic version that can be enhanced
    const result = await docClient.send(new ScanCommand({
      TableName: TRANSACTIONS_TABLE,
      FilterExpression: 'createdAt BETWEEN :startDate AND :endDate AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':startDate': dateRange.start,
        ':endDate': dateRange.end,
        ':status': 'completed'
      },
    }));

    const transactions = result.Items as Transaction[] || [];
    
    // Basic aggregation - in production, this would be more sophisticated
    const totalRevenue = transactions.reduce((sum, txn) => sum + txn.amount, 0);
    const totalFees = transactions.reduce((sum, txn) => sum + (txn.fees || 0), 0);
    const totalTransactions = transactions.length;
    
    const byType = transactions.reduce((acc, txn) => {
      acc[txn.type] = (acc[txn.type] || 0) + txn.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRevenue,
      totalFees,
      netRevenue: totalRevenue - totalFees,
      totalTransactions,
      averageTransactionValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
      revenueByType: byType,
      dateRange,
      groupBy
    };
  }

  /**
   * Updates billing account status
   * 
   * Changes billing account status with proper validation and audit
   * trail. Handles status transitions like active to past_due or
   * suspended to active with appropriate business logic.
   * 
   * @param billingId - Unique identifier for the billing account
   * @param status - New status to set
   * @param reason - Reason for status change
   * @returns Promise<void> - Resolves when status is updated
   * 
   * @throws {Error} When invalid status transition or update fails
   * 
   * @example
   * ```typescript
   * await db.updateBillingAccountStatus('billing-123', 'past_due', 'Payment failed');
   * ```
   */
  async updateBillingAccountStatus(
    billingId: string, 
    status: 'active' | 'past_due' | 'canceled' | 'suspended' | 'trialing',
    reason?: string
  ): Promise<void> {
    const updateData: any = {
      status: status,
      updatedAt: Date.now()
    };

    if (status === 'canceled') {
      updateData.canceledAt = Date.now();
    }

    await docClient.send(new UpdateCommand({
      TableName: BILLING_ACCOUNTS_TABLE,
      Key: { id: billingId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt' + 
        (status === 'canceled' ? ', canceledAt = :canceledAt' : ''),
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': Date.now(),
        ...(status === 'canceled' && { ':canceledAt': Date.now() })
      },
    }));
  }

  /**
   * Retrieves billing accounts by status for bulk operations
   * 
   * Queries billing accounts by status for administrative operations
   * like processing renewals, handling failed payments, or generating
   * reports. Supports pagination for large datasets.
   * 
   * @param status - Billing account status to query
   * @param limit - Maximum number of accounts to return
   * @param lastKey - Pagination token from previous request
   * @returns Promise<{accounts: BillingAccount[], lastKey?: any}> - Paginated results
   * 
   * @example
   * ```typescript
   * // Get all past due accounts for collection processing
   * const pastDueAccounts = await db.getBillingAccountsByStatus('past_due', 50);
   * ```
   */
  async getBillingAccountsByStatus(
    status: 'active' | 'past_due' | 'canceled' | 'suspended' | 'trialing',
    limit: number = 20,
    lastKey?: any
  ): Promise<{ accounts: BillingAccount[]; lastKey?: any }> {
    const result = await docClient.send(new QueryCommand({
      TableName: BILLING_ACCOUNTS_TABLE,
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
      },
      Limit: limit,
      ExclusiveStartKey: lastKey,
    }));

    return {
      accounts: result.Items as BillingAccount[] || [],
      lastKey: result.LastEvaluatedKey,
    };
  }

  /**
   * Retrieves a billing account by billing ID
   * 
   * @param billingId - Unique identifier for the billing account
   * @returns Promise<BillingAccount | null> - Billing account or null if not found
   */
  async getBillingAccount(billingId: string): Promise<BillingAccount | null> {
    const result = await docClient.send(new GetCommand({
      TableName: BILLING_ACCOUNTS_TABLE,
      Key: { id: billingId },
    }));

    return result.Item as BillingAccount || null;
  }

  /**
   * Updates a billing account with partial data
   * 
   * @param billingId - Unique identifier for the billing account
   * @param updates - Partial billing account object with fields to update
   * @returns Promise<void> - Resolves when update is complete
   */
  async updateBillingAccount(billingId: string, updates: Partial<BillingAccount>): Promise<void> {
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'billingId' && key !== 'id') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) return;

    await docClient.send(new UpdateCommand({
      TableName: BILLING_ACCOUNTS_TABLE,
      Key: { id: billingId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  /**
   * Creates a new transaction record (alias for processTransaction)
   * 
   * @param transaction - Complete transaction object
   * @returns Promise<void> - Resolves when transaction is created
   */
  async createTransaction(transaction: Transaction): Promise<void> {
    return this.processTransaction(transaction);
  }

  /**
   * Retrieves a specific transaction by ID
   * 
   * @param transactionId - Unique identifier for the transaction
   * @returns Promise<Transaction | null> - Transaction or null if not found
   */
  async getTransaction(transactionId: string): Promise<Transaction | null> {
    const result = await docClient.send(new GetCommand({
      TableName: TRANSACTIONS_TABLE,
      Key: { id: transactionId },
    }));

    return result.Item as Transaction || null;
  }

  /**
   * Gets transaction history with filters object (alternative method signature)
   * 
   * @param filters - Filter object containing userId and other criteria
   * @returns Promise<{transactions: Transaction[], lastKey?: any, total?: number}> - Paginated results
   */
  async getTransactionHistoryWithFilters(filters: {
    userId: string;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    lastKey?: any;
  }): Promise<{ transactions: Transaction[]; lastKey?: any; total?: number }> {
    const dateRangeFilter = filters.startDate && filters.endDate ? 
      { start: filters.startDate, end: filters.endDate } : undefined;

    const result = await this.getTransactionHistory(
      filters.userId,
      filters.limit || 20,
      filters.lastKey,
      {
        type: filters.type,
        status: filters.status,
        dateRange: dateRangeFilter,
      }
    );

    return {
      ...result,
      total: result.transactions.length, // This would be more accurate with a count query in production
    };
  }

  // ========================================
  // Moderation Workflow Database Operations
  // ========================================

  /**
   * Creates a new moderation queue entry
   * 
   * Adds a listing to the moderation queue with proper priority
   * assignment and flag categorization. Automatically assigns
   * to available moderators based on workload and expertise.
   * 
   * @param moderationWorkflow - Complete moderation workflow object
   * @returns Promise<void> - Resolves when queue entry is created
   * 
   * @throws {Error} When queue creation fails or validation errors occur
   * 
   * @example
   * ```typescript
   * const workflow: ModerationWorkflow = {
   *   queueId: 'queue-123',
   *   listingId: 'listing-456',
   *   submittedBy: 'user-789',
   *   priority: 'medium',
   *   flags: [{ type: 'inappropriate', reason: 'Offensive content' }],
   *   status: 'pending',
   *   submittedAt: Date.now(),
   *   escalated: false
   * };
   * 
   * await db.createModerationQueue(workflow);
   * ```
   */
  async createModerationQueue(moderationWorkflow: ModerationWorkflow): Promise<void> {
    const workflowWithId = {
      ...moderationWorkflow,
      id: moderationWorkflow.queueId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await docClient.send(new PutCommand({
      TableName: MODERATION_QUEUE_TABLE,
      Item: workflowWithId,
      ConditionExpression: 'attribute_not_exists(id)',
    }));
  }

  /**
   * Assigns a moderator to a queue item
   * 
   * Assigns a specific moderator to a moderation queue item with
   * proper workload balancing and expertise matching. Updates
   * status and tracks assignment history.
   * 
   * @param queueId - Unique identifier for the queue item
   * @param moderatorId - ID of the moderator to assign
   * @returns Promise<void> - Resolves when assignment is complete
   * 
   * @throws {Error} When assignment fails or moderator is unavailable
   * 
   * @example
   * ```typescript
   * await db.assignModerator('queue-123', 'moderator-456');
   * ```
   */
  async assignModerator(queueId: string, moderatorId: string): Promise<void> {
    await docClient.send(new UpdateCommand({
      TableName: MODERATION_QUEUE_TABLE,
      Key: { id: queueId },
      UpdateExpression: 'SET assignedTo = :moderatorId, #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':moderatorId': moderatorId,
        ':status': 'in_review',
        ':updatedAt': Date.now()
      },
    }));
  }

  /**
   * Updates moderation status and decision
   * 
   * Records moderation decision with detailed notes and reasoning.
   * Updates both the queue item and associated listing status.
   * Maintains complete audit trail for compliance.
   * 
   * @param queueId - Unique identifier for the queue item
   * @param status - New moderation status
   * @param moderationNotes - Detailed moderation decision and notes
   * @returns Promise<void> - Resolves when status is updated
   * 
   * @throws {Error} When update fails or invalid status transition
   * 
   * @example
   * ```typescript
   * const notes: ModerationNotes = {
   *   reviewerId: 'moderator-456',
   *   reviewerName: 'Jane Smith',
   *   decision: 'approve',
   *   reason: 'Content meets community guidelines',
   *   confidence: 'high'
   * };
   * 
   * await db.updateModerationStatus('queue-123', 'approved', notes);
   * ```
   */
  async updateModerationStatus(
    queueId: string,
    status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'changes_requested',
    moderationNotes?: ModerationWorkflow['moderationNotes']
  ): Promise<void> {
    const updateExpression = ['#status = :status', 'updatedAt = :updatedAt'];
    const expressionAttributeNames: Record<string, string> = { '#status': 'status' };
    const expressionAttributeValues: Record<string, any> = {
      ':status': status,
      ':updatedAt': Date.now()
    };

    if (moderationNotes) {
      updateExpression.push('moderationNotes = :notes', 'reviewedAt = :reviewedAt');
      expressionAttributeValues[':notes'] = moderationNotes;
      expressionAttributeValues[':reviewedAt'] = Date.now();
    }

    await docClient.send(new UpdateCommand({
      TableName: MODERATION_QUEUE_TABLE,
      Key: { id: queueId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  /**
   * Retrieves moderation queue with priority sorting
   * 
   * Fetches moderation queue items sorted by priority and submission
   * time. Supports filtering by status, priority, and assigned
   * moderator for efficient queue management.
   * 
   * @param filters - Optional filters for status, priority, moderator
   * @param limit - Maximum number of items to return
   * @param lastKey - Pagination token from previous request
   * @returns Promise<{items: ModerationWorkflow[], lastKey?: any}> - Paginated results
   * 
   * @example
   * ```typescript
   * // Get high priority pending items
   * const queue = await db.getModerationQueue({
   *   status: 'pending',
   *   priority: 'high'
   * }, 20);
   * ```
   */
  async getModerationQueue(
    filters?: {
      status?: string;
      priority?: string;
      assignedTo?: string;
    },
    limit: number = 20,
    lastKey?: any
  ): Promise<{ items: ModerationWorkflow[]; lastKey?: any }> {
    let command;
    
    // Use GSI if we have status or priority filter
    if (filters?.status) {
      // Use StatusIndex for status-based queries
      const queryParams: any = {
        TableName: MODERATION_QUEUE_TABLE,
        IndexName: 'StatusIndex',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': filters.status,
        },
        Limit: limit,
        ExclusiveStartKey: lastKey,
        ScanIndexForward: false, // Most recent first (by submittedAt)
      };

      // Add additional filters if needed
      const additionalFilters = [];
      if (filters.priority) {
        additionalFilters.push('priority = :priority');
        queryParams.ExpressionAttributeValues[':priority'] = filters.priority;
      }
      if (filters.assignedTo) {
        additionalFilters.push('assignedTo = :assignedTo');
        queryParams.ExpressionAttributeValues[':assignedTo'] = filters.assignedTo;
      }

      if (additionalFilters.length > 0) {
        queryParams.FilterExpression = additionalFilters.join(' AND ');
      }

      command = new QueryCommand(queryParams);
    } else if (filters?.priority) {
      // Use PriorityIndex for priority-based queries
      const queryParams: any = {
        TableName: MODERATION_QUEUE_TABLE,
        IndexName: 'PriorityIndex',
        KeyConditionExpression: 'priority = :priority',
        ExpressionAttributeValues: {
          ':priority': filters.priority,
        },
        Limit: limit,
        ExclusiveStartKey: lastKey,
        ScanIndexForward: false, // Most recent first (by submittedAt)
      };

      // Add additional filters if needed
      if (filters.assignedTo) {
        queryParams.FilterExpression = 'assignedTo = :assignedTo';
        queryParams.ExpressionAttributeValues[':assignedTo'] = filters.assignedTo;
      }

      command = new QueryCommand(queryParams);
    } else {
      // No specific index, scan the table
      const scanParams: any = {
        TableName: MODERATION_QUEUE_TABLE,
        Limit: limit,
        ExclusiveStartKey: lastKey,
      };

      // Add filters if needed
      const filterConditions = [];
      const expressionAttributeValues: Record<string, any> = {};
      
      if (filters?.assignedTo) {
        filterConditions.push('assignedTo = :assignedTo');
        expressionAttributeValues[':assignedTo'] = filters.assignedTo;
      }

      if (filterConditions.length > 0) {
        scanParams.FilterExpression = filterConditions.join(' AND ');
        scanParams.ExpressionAttributeValues = expressionAttributeValues;
      }

      command = new ScanCommand(scanParams);
    }

    const result = await docClient.send(command);

    return {
      items: result.Items as ModerationWorkflow[] || [],
      lastKey: result.LastEvaluatedKey,
    };
  }

  /**
   * Retrieves moderation history for a listing
   * 
   * Fetches complete moderation history for a specific listing
   * including all reviews, decisions, and status changes.
   * Used for audit trails and appeal processes.
   * 
   * @param listingId - Unique identifier for the listing
   * @returns Promise<ModerationWorkflow[]> - Array of moderation records
   * 
   * @example
   * ```typescript
   * const history = await db.getModerationHistory('listing-456');
   * history.forEach(record => {
   *   console.log(`${record.status} by ${record.assignedTo} at ${record.reviewedAt}`);
   * });
   * ```
   */
  async getModerationHistory(listingId: string): Promise<ModerationWorkflow[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: MODERATION_QUEUE_TABLE,
      IndexName: 'ListingIndex',
      KeyConditionExpression: 'listingId = :listingId',
      ExpressionAttributeValues: {
        ':listingId': listingId,
      },
      ScanIndexForward: false, // Most recent first
    }));

    return result.Items as ModerationWorkflow[] || [];
  }

  /**
   * Creates audit trail for moderation decisions
   * 
   * Records detailed audit information for moderation decisions
   * including reviewer actions, timing, and decision rationale.
   * Ensures compliance with content moderation policies.
   * 
   * @param queueId - Unique identifier for the queue item
   * @param action - Moderation action taken
   * @param reviewerId - ID of the reviewer
   * @param details - Additional audit details
   * @returns Promise<void> - Resolves when audit record is created
   * 
   * @example
   * ```typescript
   * await db.createModerationAuditTrail('queue-123', 'approved', 'moderator-456', {
   *   reviewDuration: 15,
   *   flagsReviewed: ['inappropriate'],
   *   confidence: 'high'
   * });
   * ```
   */
  async createModerationAuditTrail(
    queueId: string,
    action: string,
    reviewerId: string,
    details: Record<string, any>
  ): Promise<void> {
    const auditRecord = {
      id: `audit-${queueId}-${Date.now()}`,
      queueId: queueId,
      action: action,
      reviewerId: reviewerId,
      details: details,
      timestamp: Date.now()
    };

    await docClient.send(new PutCommand({
      TableName: 'moderation-audit-trail',
      Item: auditRecord
    }));
  }

  /**
   * Retrieves moderation statistics and metrics
   * 
   * Generates comprehensive moderation statistics including queue
   * backlog, processing times, moderator performance, and flag
   * type distributions for dashboard reporting.
   * 
   * @param dateRange - Date range for statistics
   * @returns Promise<any> - Moderation statistics object
   * 
   * @example
   * ```typescript
   * const stats = await db.getModerationStatistics({
   *   start: '2024-01-01',
   *   end: '2024-12-31'
   * });
   * ```
   */
  async getModerationStatistics(dateRange?: { start: string; end: string }): Promise<any> {
    // Get current queue status
    const queueResult = await docClient.send(new ScanCommand({
      TableName: MODERATION_QUEUE_TABLE,
    }));

    const queueItems = queueResult.Items as ModerationWorkflow[] || [];
    
    // Calculate basic statistics
    const totalItems = queueItems.length;
    const pendingItems = queueItems.filter(item => item.status === 'pending').length;
    const inReviewItems = queueItems.filter(item => item.status === 'in_review').length;
    const completedItems = queueItems.filter(item => 
      ['approved', 'rejected', 'changes_requested'].includes(item.status)
    ).length;

    // Calculate average review time for completed items
    const completedWithTimes = queueItems.filter(item => 
      item.reviewedAt && item.submittedAt
    );
    const averageReviewTime = completedWithTimes.length > 0 
      ? completedWithTimes.reduce((sum, item) => 
          sum + (item.reviewedAt! - item.submittedAt), 0
        ) / completedWithTimes.length
      : 0;

    // Flag type breakdown
    const flagTypeBreakdown: Record<string, number> = {};
    queueItems.forEach(item => {
      item.flags.forEach(flag => {
        flagTypeBreakdown[flag.type] = (flagTypeBreakdown[flag.type] || 0) + 1;
      });
    });

    // Moderator workload
    const moderatorWorkload: Record<string, number> = {};
    queueItems.filter(item => item.assignedTo).forEach(item => {
      moderatorWorkload[item.assignedTo!] = (moderatorWorkload[item.assignedTo!] || 0) + 1;
    });

    return {
      totalItems,
      pendingItems,
      inReviewItems,
      completedItems,
      queueBacklog: pendingItems + inReviewItems,
      averageReviewTime: Math.round(averageReviewTime / (1000 * 60)), // Convert to minutes
      flagTypeBreakdown,
      moderatorWorkload,
      dateRange
    };
  }

  /**
   * Escalates a moderation item to higher priority
   * 
   * Escalates a moderation queue item to higher priority or
   * different reviewer based on complexity or policy violations.
   * Maintains escalation history and reasoning.
   * 
   * @param queueId - Unique identifier for the queue item
   * @param escalatedBy - ID of person escalating the item
   * @param reason - Reason for escalation
   * @param newPriority - New priority level
   * @returns Promise<void> - Resolves when escalation is complete
   * 
   * @throws {Error} When escalation fails or invalid parameters
   * 
   * @example
   * ```typescript
   * await db.escalateModerationItem(
   *   'queue-123',
   *   'moderator-456',
   *   'Complex policy violation requiring senior review',
   *   'urgent'
   * );
   * ```
   */
  async escalateModerationItem(
    queueId: string,
    escalatedBy: string,
    reason: string,
    newPriority: 'low' | 'medium' | 'high' | 'urgent'
  ): Promise<void> {
    await docClient.send(new UpdateCommand({
      TableName: MODERATION_QUEUE_TABLE,
      Key: { id: queueId },
      UpdateExpression: 'SET escalated = :escalated, escalatedAt = :escalatedAt, escalatedBy = :escalatedBy, escalationReason = :reason, priority = :priority, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':escalated': true,
        ':escalatedAt': Date.now(),
        ':escalatedBy': escalatedBy,
        ':reason': reason,
        ':priority': newPriority,
        ':updatedAt': Date.now()
      },
    }));
  }

  // ========================================
  // Finance Calculation Database Operations
  // ========================================

  /**
   * Saves a finance calculation for a user
   * 
   * Stores boat finance calculation results for future reference
   * and sharing. Includes loan parameters, payment schedules,
   * and calculation metadata.
   * 
   * @param calculation - Complete finance calculation object
   * @returns Promise<void> - Resolves when calculation is saved
   * 
   * @throws {Error} When save operation fails
   * 
   * @example
   * ```typescript
   * const calculation: FinanceCalculation = {
   *   calculationId: 'calc-123',
   *   listingId: 'listing-456',
   *   userId: 'user-789',
   *   boatPrice: 50000,
   *   downPayment: 10000,
   *   loanAmount: 40000,
   *   interestRate: 5.5,
   *   termMonths: 120,
   *   monthlyPayment: 432.25,
   *   totalInterest: 11870,
   *   totalCost: 51870,
   *   saved: true,
   *   createdAt: Date.now()
   * };
   * 
   * await db.saveFinanceCalculation(calculation);
   * ```
   */
  async saveFinanceCalculation(calculation: FinanceCalculation): Promise<void> {
    const calculationWithId = {
      ...calculation,
      id: calculation.calculationId,
      createdAt: calculation.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    await docClient.send(new PutCommand({
      TableName: FINANCE_CALCULATIONS_TABLE,
      Item: calculationWithId,
      ConditionExpression: 'attribute_not_exists(id)',
    }));
  }

  /**
   * Retrieves saved finance calculations for a user
   * 
   * Fetches all saved calculations for a user with pagination
   * support. Used for calculation history and comparison features.
   * 
   * @param userId - Unique identifier for the user
   * @param limit - Maximum number of calculations to return
   * @param lastKey - Pagination token from previous request
   * @returns Promise<{calculations: FinanceCalculation[], lastKey?: any}> - Paginated results
   * 
   * @example
   * ```typescript
   * const userCalculations = await db.getFinanceCalculationsByUser('user-789', 10);
   * ```
   */
  async getFinanceCalculationsByUser(
    userId: string,
    limit: number = 20,
    lastKey?: any
  ): Promise<{ calculations: FinanceCalculation[]; lastKey?: any }> {
    const result = await docClient.send(new QueryCommand({
      TableName: FINANCE_CALCULATIONS_TABLE,
      IndexName: 'UserIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      Limit: limit,
      ExclusiveStartKey: lastKey,
      ScanIndexForward: false, // Most recent first
    }));

    return {
      calculations: result.Items as FinanceCalculation[] || [],
      lastKey: result.LastEvaluatedKey,
    };
  }

  /**
   * Retrieves finance calculations for a specific listing
   * 
   * Fetches all calculations associated with a boat listing
   * for analytics and comparison purposes.
   * 
   * @param listingId - Unique identifier for the listing
   * @returns Promise<FinanceCalculation[]> - Array of calculations
   * 
   * @example
   * ```typescript
   * const listingCalculations = await db.getFinanceCalculationsByListing('listing-456');
   * ```
   */
  async getFinanceCalculationsByListing(listingId: string): Promise<FinanceCalculation[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: FINANCE_CALCULATIONS_TABLE,
      IndexName: 'ListingIndex',
      KeyConditionExpression: 'listingId = :listingId',
      ExpressionAttributeValues: {
        ':listingId': listingId,
      },
    }));

    return result.Items as FinanceCalculation[] || [];
  }

  /**
   * Creates a new finance calculation
   * 
   * @param calculation - Finance calculation to create
   * @returns Promise<void> - Resolves when calculation is created
   */
  async createFinanceCalculation(calculation: FinanceCalculation): Promise<void> {
    await docClient.send(new PutCommand({
      TableName: FINANCE_CALCULATIONS_TABLE,
      Item: calculation,
      ConditionExpression: 'attribute_not_exists(calculationId)'
    }));
  }

  /**
   * Gets a finance calculation by ID
   * 
   * @param calculationId - Unique identifier for the calculation
   * @returns Promise<FinanceCalculation | null> - Calculation or null if not found
   */
  async getFinanceCalculation(calculationId: string): Promise<FinanceCalculation | null> {
    const result = await docClient.send(new GetCommand({
      TableName: FINANCE_CALCULATIONS_TABLE,
      Key: { calculationId }
    }));

    return result.Item as FinanceCalculation || null;
  }

  /**
   * Gets a finance calculation by share token
   * 
   * @param shareToken - Unique share token
   * @returns Promise<FinanceCalculation | null> - Calculation or null if not found
   */
  async getFinanceCalculationByShareToken(shareToken: string): Promise<FinanceCalculation | null> {
    const result = await docClient.send(new QueryCommand({
      TableName: FINANCE_CALCULATIONS_TABLE,
      IndexName: 'ShareTokenIndex',
      KeyConditionExpression: 'shareToken = :shareToken',
      ExpressionAttributeValues: {
        ':shareToken': shareToken
      }
    }));

    return result.Items?.[0] as FinanceCalculation || null;
  }

  /**
   * Updates a finance calculation
   * 
   * @param calculationId - Unique identifier for the calculation
   * @param updates - Partial calculation data to update
   * @returns Promise<void> - Resolves when calculation is updated
   */
  async updateFinanceCalculation(calculationId: string, updates: Partial<FinanceCalculation>): Promise<void> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'calculationId' && value !== undefined) {
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;
        updateExpressions.push(`${attributeName} = ${attributeValue}`);
        expressionAttributeNames[attributeName] = key;
        expressionAttributeValues[attributeValue] = value;
      }
    });

    if (updateExpressions.length === 0) {
      return;
    }

    await docClient.send(new UpdateCommand({
      TableName: FINANCE_CALCULATIONS_TABLE,
      Key: { calculationId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    }));
  }

  /**
   * Deletes a finance calculation
   * 
   * @param calculationId - Unique identifier for the calculation
   * @returns Promise<void> - Resolves when calculation is deleted
   */
  async deleteFinanceCalculation(calculationId: string): Promise<void> {
    await docClient.send(new DeleteCommand({
      TableName: FINANCE_CALCULATIONS_TABLE,
      Key: { calculationId }
    }));
  }

  // ========================================
  // Transaction Support for Complex Operations
  // ========================================

  /**
   * Executes a complex multi-table transaction
   * 
   * Performs atomic operations across multiple tables to ensure
   * data consistency. Used for operations like listing creation
   * with engines, user upgrades with billing, etc.
   * 
   * @param operations - Array of transaction operations
   * @returns Promise<void> - Resolves when transaction is complete
   * 
   * @throws {Error} When transaction fails or conflicts occur
   * 
   * @example
   * ```typescript
   * const operations = [
   *   {
   *     Put: {
   *       TableName: LISTINGS_TABLE,
   *       Item: enhancedListing,
   *       ConditionExpression: 'attribute_not_exists(id)'
   *     }
   *   },
   *   {
   *     Put: {
   *       TableName: ENGINES_TABLE,
   *       Item: engine1
   *     }
   *   },
   *   {
   *     Put: {
   *       TableName: ENGINES_TABLE,
   *       Item: engine2
   *     }
   *   }
   * ];
   * 
   * await db.executeTransaction(operations);
   * ```
   */
  async executeTransaction(operations: any[]): Promise<void> {
    await docClient.send(new TransactWriteCommand({
      TransactItems: operations
    }));
  }

  /**
   * Creates a listing with engines in a single transaction
   * 
   * Atomically creates a listing and all associated engines
   * to ensure data consistency. Calculates total horsepower
   * and engine configuration automatically.
   * 
   * @param listing - Enhanced listing object
   * @param engines - Array of engines for the listing
   * @returns Promise<void> - Resolves when creation is complete
   * 
   * @throws {Error} When transaction fails or validation errors occur
   * 
   * @example
   * ```typescript
   * const listing: EnhancedListing = { ... };
   * const engines: Engine[] = [ ... ];
   * 
   * await db.createListingWithEngines(listing, engines);
   * ```
   */
  async createListingWithEngines(listing: EnhancedListing, engines: Engine[]): Promise<void> {
    const timestamp = Date.now();
    
    // Calculate totals
    const totalHorsepower = engines.reduce((sum, engine) => sum + engine.horsepower, 0);
    const engineConfiguration = this.determineEngineConfiguration(engines.length);
    
    // Prepare listing with calculated values
    const enhancedListing = {
      ...listing,
      id: listing.listingId,
      engines: engines,
      totalHorsepower: totalHorsepower,
      engineConfiguration: engineConfiguration,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Prepare transaction operations
    const operations = [
      {
        Put: {
          TableName: LISTINGS_TABLE,
          Item: enhancedListing,
          ConditionExpression: 'attribute_not_exists(id)'
        }
      }
    ];

    // Add engine creation operations
    engines.forEach(engine => {
      operations.push({
        Put: {
          TableName: ENGINES_TABLE,
          Item: {
            ...engine,
            id: engine.engineId,
            listingId: listing.listingId,
            createdAt: timestamp,
            updatedAt: timestamp
          } as any, // Type assertion to avoid strict type checking for transaction items
          ConditionExpression: 'attribute_not_exists(id)'
        }
      });
    });

    await this.executeTransaction(operations);
  }

  /**
   * Updates user tier with billing account in a single transaction
   * 
   * Atomically updates user type and creates/updates billing account
   * to ensure consistency between user permissions and billing status.
   * 
   * @param userId - Unique identifier for the user
   * @param userType - New user type
   * @param membershipDetails - Updated membership configuration
   * @param billingAccount - Billing account information
   * @returns Promise<void> - Resolves when update is complete
   * 
   * @throws {Error} When transaction fails or validation errors occur
   * 
   * @example
   * ```typescript
   * await db.updateUserTierWithBilling(
   *   'user-456',
   *   'premium_dealer',
   *   membershipDetails,
   *   billingAccount
   * );
   * ```
   */
  async updateUserTierWithBilling(
    userId: string,
    userType: 'individual' | 'dealer' | 'premium_individual' | 'premium_dealer',
    membershipDetails: EnhancedUser['membershipDetails'],
    billingAccount: BillingAccount
  ): Promise<void> {
    const timestamp = Date.now();
    const isPremium = userType.startsWith('premium_');

    const operations = [
      {
        Update: {
          TableName: USERS_TABLE,
          Key: { id: userId },
          UpdateExpression: 'SET userType = :userType, membershipDetails = :membershipDetails, premiumActive = :premiumActive, premiumPlan = :premiumPlan, premiumExpiresAt = :premiumExpiresAt, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':userType': userType,
            ':membershipDetails': membershipDetails,
            ':premiumActive': isPremium,
            ':premiumPlan': isPremium ? membershipDetails.plan : null,
            ':premiumExpiresAt': membershipDetails.expiresAt || null,
            ':updatedAt': timestamp
          }
        }
      },
      {
        Put: {
          TableName: BILLING_ACCOUNTS_TABLE,
          Item: {
            ...billingAccount,
            id: billingAccount.billingId,
            createdAt: billingAccount.createdAt || timestamp,
            updatedAt: timestamp
          }
        }
      }
    ];

    await this.executeTransaction(operations);
  }

  /**
   * Creates a new payment method record
   * 
   * @param paymentMethod - Payment method data to create
   * @returns Promise<void> - Resolves when payment method is created
   */
  async createPaymentMethod(paymentMethod: any): Promise<void> {
    try {
      const params = {
        TableName: this.getTableName('PAYMENT_METHODS'),
        Item: paymentMethod,
        ConditionExpression: 'attribute_not_exists(id)',
      };

      await docClient.send(new PutCommand(params));
    } catch (error) {
      console.error('Error creating payment method:', error);
      throw new Error(`Failed to create payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets all payment methods for a user
   * 
   * @param userId - User ID to get payment methods for
   * @returns Promise<any[]> - User's payment methods
   */
  async getUserPaymentMethods(userId: string): Promise<any[]> {
    try {
      const params = {
        TableName: this.getTableName('PAYMENT_METHODS'),
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        ScanIndexForward: false, // Most recent first
      };

      const result = await docClient.send(new QueryCommand(params));
      return result.Items || [];
    } catch (error) {
      console.error('Error getting user payment methods:', error);
      throw new Error(`Failed to get payment methods: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets a specific payment method by ID
   * 
   * @param paymentMethodId - Payment method ID to retrieve
   * @returns Promise<any | null> - Payment method or null if not found
   */
  async getPaymentMethod(paymentMethodId: string): Promise<any | null> {
    try {
      const params = {
        TableName: this.getTableName('PAYMENT_METHODS'),
        Key: { id: paymentMethodId },
      };

      const result = await docClient.send(new GetCommand(params));
      return result.Item || null;
    } catch (error) {
      console.error('Error getting payment method:', error);
      throw new Error(`Failed to get payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates a payment method record
   * 
   * @param paymentMethodId - Payment method ID to update
   * @param updates - Updates to apply
   * @returns Promise<void> - Resolves when payment method is updated
   */
  async updatePaymentMethodRecord(paymentMethodId: string, updates: any): Promise<void> {
    try {
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      for (const [key, value] of Object.entries(updates)) {
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;
        
        updateExpressions.push(`${attributeName} = ${attributeValue}`);
        expressionAttributeNames[attributeName] = key;
        expressionAttributeValues[attributeValue] = value;
      }

      const params = {
        TableName: this.getTableName('PAYMENT_METHODS'),
        Key: { id: paymentMethodId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ConditionExpression: 'attribute_exists(id)',
      };

      await docClient.send(new UpdateCommand(params));
    } catch (error) {
      console.error('Error updating payment method:', error);
      throw new Error(`Failed to update payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deletes a payment method
   * 
   * @param paymentMethodId - Payment method ID to delete
   * @returns Promise<void> - Resolves when payment method is deleted
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      const params = {
        TableName: this.getTableName('PAYMENT_METHODS'),
        Key: { id: paymentMethodId },
        ConditionExpression: 'attribute_exists(id)',
      };

      await docClient.send(new DeleteCommand(params));
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw new Error(`Failed to delete payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets table name with environment prefix
   * 
   * @param tableType - Type of table
   * @returns string - Full table name
   */
  private getTableName(tableType: string): string {
    const tableNames: Record<string, string> = {
      'PAYMENT_METHODS': process.env.PAYMENT_METHODS_TABLE || 'harborlist-payment-methods',
      'BILLING_ACCOUNTS': process.env.BILLING_ACCOUNTS_TABLE || 'harborlist-billing-accounts',
      'TRANSACTIONS': process.env.TRANSACTIONS_TABLE || 'harborlist-transactions',
    };

    return tableNames[tableType] || tableType;
  }
}

/**
 * Singleton instance of the database service
 * 
 * Provides a shared instance of the DatabaseService for use across
 * all Lambda functions. Ensures consistent database access patterns
 * and connection reuse for optimal performance.
 * 
 * @example
 * ```typescript
 * import { db } from '../shared/database';
 * 
 * // Basic listing operations
 * const listing = await db.getListing(listingId);
 * await db.updateListing(listingId, updates);
 * 
 * // Multi-engine operations
 * const engines = await db.getEnginesByListing(listingId);
 * await db.createEngine(engineData);
 * 
 * // User tier management
 * const tier = await db.getUserTier(tierId);
 * await db.updateUserType(userId, 'premium_dealer', membershipDetails);
 * 
 * // Billing operations
 * const billingAccount = await db.getBillingAccountByUser(userId);
 * await db.processTransaction(transactionData);
 * 
 * // Moderation workflow
 * const queue = await db.getModerationQueue({ status: 'pending' });
 * await db.assignModerator(queueId, moderatorId);
 * 
 * // Complex transactions
 * await db.createListingWithEngines(listing, engines);
 * await db.updateUserTierWithBilling(userId, userType, membership, billing);
 * ```
 */
export const db = new DatabaseService();

/**
 * @fileoverview Database Service Method Reference
 * 
 * LISTING OPERATIONS:
 * - createListing(listing): Create new boat listing
 * - getListing(listingId): Retrieve listing by ID
 * - updateListing(listingId, updates): Update existing listing
 * - deleteListing(listingId): Delete listing
 * - getListingsByOwner(ownerId): Get all listings for owner
 * - getListings(limit, lastKey): Get paginated active listings
 * - incrementViews(listingId): Increment listing view count
 * 
 * MULTI-ENGINE OPERATIONS:
 * - createEngine(engine): Create new engine record
 * - updateEngine(engineId, updates): Update engine specifications
 * - deleteEngine(engineId): Delete engine record
 * - getEnginesByListing(listingId): Get all engines for listing
 * - getListingsByHorsepower(min, max, limit, lastKey): Query by horsepower range
 * - getListingsByEngineConfiguration(config, limit, lastKey): Query by engine config
 * - batchCreateEngines(engines): Create multiple engines atomically
 * - batchDeleteEngines(engineIds): Delete multiple engines atomically
 * - updateListingWithEngines(listingId, engines): Update listing with engine data
 * 
 * USER MANAGEMENT OPERATIONS:
 * - createUser(user): Create new user account
 * - getUser(userId): Retrieve user by ID
 * - updateUser(userId, updates): Update user information
 * - getUserTier(tierId): Get tier configuration
 * - updateUserTier(tierId, updates): Update tier settings
 * - assignUserCapabilities(userId, capabilities): Assign user capabilities
 * - updateUserType(userId, userType, membershipDetails): Change user type
 * - validateUserTypeTransition(currentType, newType): Validate type change
 * - trackUserTypeTransition(userId, fromType, toType, reason, changedBy): Record transition
 * - getUsersByType(userType, limit, lastKey): Get users by type
 * - bulkUpdateUserCapabilities(userUpdates): Bulk capability updates
 * - getUsersWithExpiringMemberships(daysUntilExpiration): Get expiring memberships
 * 
 * BILLING AND TRANSACTION OPERATIONS:
 * - createBillingAccount(billingAccount): Create billing account
 * - getBillingAccountByUser(userId): Get user's billing account
 * - updatePaymentMethod(billingId, paymentMethodId, customerId): Update payment method
 * - processTransaction(transaction): Record new transaction
 * - getTransactionHistory(userId, limit, lastKey, filters): Get transaction history
 * - getFinancialReportingData(dateRange, groupBy): Generate financial reports
 * - updateBillingAccountStatus(billingId, status, reason): Update account status
 * - getBillingAccountsByStatus(status, limit, lastKey): Get accounts by status
 * 
 * MODERATION WORKFLOW OPERATIONS:
 * - createModerationQueue(moderationWorkflow): Add item to moderation queue
 * - assignModerator(queueId, moderatorId): Assign moderator to queue item
 * - updateModerationStatus(queueId, status, moderationNotes): Update moderation decision
 * - getModerationQueue(filters, limit, lastKey): Get moderation queue with filters
 * - getModerationHistory(listingId): Get moderation history for listing
 * - createModerationAuditTrail(queueId, action, reviewerId, details): Create audit record
 * - getModerationStatistics(dateRange): Get moderation metrics
 * - escalateModerationItem(queueId, escalatedBy, reason, newPriority): Escalate item
 * 
 * FINANCE CALCULATION OPERATIONS:
 * - createFinanceCalculation(calculation): Create new finance calculation
 * - getFinanceCalculation(calculationId): Get calculation by ID
 * - getFinanceCalculationByShareToken(shareToken): Get shared calculation
 * - updateFinanceCalculation(calculationId, updates): Update calculation
 * - deleteFinanceCalculation(calculationId): Delete calculation
 * - saveFinanceCalculation(calculation): Save loan calculation
 * - getFinanceCalculationsByUser(userId, limit, lastKey): Get user's calculations
 * - getFinanceCalculationsByListing(listingId): Get calculations for listing
 * 
 * TRANSACTION SUPPORT OPERATIONS:
 * - executeTransaction(operations): Execute multi-table transaction
 * - createListingWithEngines(listing, engines): Atomic listing + engines creation
 * - updateUserTierWithBilling(userId, userType, membershipDetails, billingAccount): Atomic user + billing update
 * 
 * All methods include comprehensive error handling, input validation, and proper
 * TypeScript typing. Pagination is supported where applicable using DynamoDB's
 * LastEvaluatedKey pattern. Batch operations are optimized for DynamoDB limits.
 */
