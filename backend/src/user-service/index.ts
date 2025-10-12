/**
 * @fileoverview User service Lambda function for HarborList boat marketplace.
 * 
 * Provides comprehensive user management services including:
 * - User type and tier management (individual, dealer, premium)
 * - User capability assignment and management
 * - Premium membership activation and expiration handling
 * - Sales role functionality for customer and plan management
 * - User tier transitions and validation
 * 
 * Features:
 * - Multi-tier user system with granular capabilities
 * - Premium membership lifecycle management
 * - Sales representative assignment and tracking
 * - Automatic tier downgrade for expired memberships
 * - Comprehensive audit logging for user changes
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, ScanCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import crypto from 'crypto';
import { createResponse, createErrorResponse } from '../shared/utils';
import { 
  User, 
  EnhancedUser, 
  SalesUser, 
  UserRole, 
  UserStatus, 
  AdminPermission,
  UserTier,
  UserCapability,
  UserLimits,
  AuditLog
} from '@harborlist/shared-types';

/**
 * DynamoDB client configuration for user service
 */
const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  }),
});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Environment-based table name configuration with fallback defaults
 */
const USERS_TABLE = process.env.USERS_TABLE || 'harborlist-users';
const USER_TIERS_TABLE = process.env.USER_TIERS_TABLE || 'harborlist-user-tiers';
const USER_CAPABILITIES_TABLE = process.env.USER_CAPABILITIES_TABLE || 'harborlist-user-capabilities';
const AUDIT_LOGS_TABLE = process.env.AUDIT_LOGS_TABLE || 'harborlist-audit-logs';

/**
 * Default user tiers configuration
 */
const DEFAULT_USER_TIERS: UserTier[] = [
  {
    tierId: 'individual-basic',
    name: 'Individual Basic',
    type: 'individual',
    isPremium: false,
    features: [
      { featureId: 'basic-listings', name: 'Basic Listings', description: 'Create basic boat listings', enabled: true },
      { featureId: 'search', name: 'Search', description: 'Search boat listings', enabled: true }
    ],
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
    pricing: { currency: 'USD' },
    active: true,
    description: 'Basic tier for individual boat sellers',
    displayOrder: 1
  },
  {
    tierId: 'individual-premium',
    name: 'Individual Premium',
    type: 'individual',
    isPremium: true,
    features: [
      { featureId: 'premium-listings', name: 'Premium Listings', description: 'Create premium boat listings with enhanced features', enabled: true },
      { featureId: 'priority-placement', name: 'Priority Placement', description: 'Priority placement in search results', enabled: true },
      { featureId: 'analytics', name: 'Analytics', description: 'Access to listing analytics', enabled: true }
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
    description: 'Premium tier for individual boat sellers with enhanced features',
    displayOrder: 2
  },
  {
    tierId: 'dealer-basic',
    name: 'Dealer Basic',
    type: 'dealer',
    isPremium: false,
    features: [
      { featureId: 'dealer-listings', name: 'Dealer Listings', description: 'Create dealer boat listings', enabled: true },
      { featureId: 'bulk-operations', name: 'Bulk Operations', description: 'Bulk listing management', enabled: true }
    ],
    limits: {
      maxListings: 25,
      maxImages: 15,
      priorityPlacement: false,
      featuredListings: 1,
      analyticsAccess: true,
      bulkOperations: true,
      advancedSearch: true,
      premiumSupport: false
    },
    pricing: { monthly: 99.99, yearly: 999.99, currency: 'USD' },
    active: true,
    description: 'Basic tier for boat dealers',
    displayOrder: 3
  },
  {
    tierId: 'dealer-premium',
    name: 'Dealer Premium',
    type: 'dealer',
    isPremium: true,
    features: [
      { featureId: 'premium-dealer-listings', name: 'Premium Dealer Listings', description: 'Premium dealer listings with all features', enabled: true },
      { featureId: 'priority-placement', name: 'Priority Placement', description: 'Priority placement in search results', enabled: true },
      { featureId: 'advanced-analytics', name: 'Advanced Analytics', description: 'Advanced analytics and reporting', enabled: true }
    ],
    limits: {
      maxListings: 100,
      maxImages: 50,
      priorityPlacement: true,
      featuredListings: 10,
      analyticsAccess: true,
      bulkOperations: true,
      advancedSearch: true,
      premiumSupport: true
    },
    pricing: { monthly: 199.99, yearly: 1999.99, currency: 'USD' },
    active: true,
    description: 'Premium tier for boat dealers with all features',
    displayOrder: 4
  }
];

/**
 * Main Lambda handler for user service endpoints
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const clientInfo = {
    ipAddress: event.requestContext.identity.sourceIp,
    userAgent: event.headers['User-Agent'] || 'unknown'
  };

  try {
    const path = event.path;
    const method = event.httpMethod;
    const body = JSON.parse(event.body || '{}');

    // Route handling
    if (path.endsWith('/health') && method === 'GET') {
      return createResponse(200, { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'user-service'
      });
    } else if (path.includes('/users/') && path.endsWith('/tier') && method === 'GET') {
      const userId = extractUserIdFromPath(path);
      return await handleGetUserTier(userId, requestId, clientInfo);
    } else if (path.includes('/users/') && path.endsWith('/tier') && method === 'PUT') {
      const userId = extractUserIdFromPath(path);
      return await handleUpdateUserTier(userId, body, requestId, clientInfo);
    } else if (path.includes('/users/') && path.endsWith('/capabilities') && method === 'GET') {
      const userId = extractUserIdFromPath(path);
      return await handleGetUserCapabilities(userId, requestId, clientInfo);
    } else if (path.includes('/users/') && path.endsWith('/capabilities') && method === 'PUT') {
      const userId = extractUserIdFromPath(path);
      return await handleUpdateUserCapabilities(userId, body, requestId, clientInfo);
    } else if (path.includes('/users/') && path.endsWith('/membership') && method === 'POST') {
      const userId = extractUserIdFromPath(path);
      return await handleActivatePremiumMembership(userId, body, requestId, clientInfo);
    } else if (path.includes('/users/') && path.endsWith('/membership') && method === 'DELETE') {
      const userId = extractUserIdFromPath(path);
      return await handleDeactivatePremiumMembership(userId, requestId, clientInfo);
    } else if (path.endsWith('/tiers') && method === 'GET') {
      return await handleGetAvailableTiers(requestId, clientInfo);
    } else if (path.endsWith('/users/bulk-update') && method === 'POST') {
      return await handleBulkUserUpdate(body, requestId, clientInfo);
    } else if (path.includes('/sales/customers') && method === 'GET') {
      return await handleGetSalesCustomers(event, requestId, clientInfo);
    } else if (path.includes('/sales/assign-customer') && method === 'POST') {
      return await handleAssignCustomerToSales(body, requestId, clientInfo);
    } else if (path.includes('/sales/performance') && method === 'GET') {
      return await handleGetSalesPerformance(event, requestId, clientInfo);
    }

    return createErrorResponse(404, 'NOT_FOUND', 'Endpoint not found', requestId);
  } catch (error) {
    console.error('User service error:', error);
    await logAuditEvent('USER_SERVICE_ERROR', 'system', { error: error instanceof Error ? error.message : String(error) }, clientInfo, requestId);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }
};

/**
 * Get user tier information
 */
const handleGetUserTier = async (
  userId: string,
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  try {
    const user = await getUserById(userId);
    if (!user) {
      return createErrorResponse(404, 'USER_NOT_FOUND', 'User not found', requestId);
    }

    const enhancedUser = user as EnhancedUser;
    const tierInfo = enhancedUser.membershipDetails || {
      plan: 'individual-basic',
      features: [],
      limits: DEFAULT_USER_TIERS[0].limits,
      autoRenew: false
    };

    // Get tier details
    const tier = await getUserTierById(tierInfo.tierId || 'individual-basic');
    
    return createResponse(200, {
      userId,
      userType: enhancedUser.userType || 'individual',
      tier: tier || DEFAULT_USER_TIERS[0],
      membershipDetails: tierInfo,
      premiumActive: enhancedUser.premiumActive || false,
      premiumExpiresAt: enhancedUser.premiumExpiresAt
    });
  } catch (error) {
    console.error('Get user tier error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get user tier', requestId);
  }
};

/**
 * Update user tier and type
 */
const handleUpdateUserTier = async (
  userId: string,
  body: { userType?: string; tierId?: string; premiumPlan?: string; autoRenew?: boolean },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { userType, tierId, premiumPlan, autoRenew } = body;

  try {
    const user = await getUserById(userId);
    if (!user) {
      return createErrorResponse(404, 'USER_NOT_FOUND', 'User not found', requestId);
    }

    // Validate user type transition
    if (userType && !isValidUserTypeTransition(user, userType)) {
      return createErrorResponse(400, 'INVALID_USER_TYPE_TRANSITION', 'Invalid user type transition', requestId);
    }

    // Get tier information
    let tier: UserTier | null = null;
    if (tierId) {
      tier = await getUserTierById(tierId);
      if (!tier) {
        return createErrorResponse(404, 'TIER_NOT_FOUND', 'User tier not found', requestId);
      }
    }

    // Prepare update data
    const updateData: Partial<EnhancedUser> = {
      updatedAt: new Date().toISOString()
    };

    if (userType) {
      updateData.userType = userType as any;
    }

    if (tier) {
      updateData.membershipDetails = {
        plan: tier.name,
        tierId: tier.tierId,
        features: tier.features.map(f => f.featureId),
        limits: tier.limits,
        autoRenew: autoRenew !== undefined ? autoRenew : true,
        billingCycle: tier.isPremium ? 'monthly' : undefined
      };

      if (tier.isPremium) {
        updateData.premiumActive = true;
        updateData.premiumPlan = tier.name;
        // Set expiration to 30 days from now for monthly plans
        updateData.premiumExpiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
      }
    }

    // Update user
    await updateUser(userId, updateData);

    // Log tier change
    await logAuditEvent('USER_TIER_UPDATED', 'admin', {
      userId,
      oldUserType: (user as EnhancedUser).userType || 'individual',
      newUserType: userType,
      oldTier: (user as EnhancedUser).membershipDetails?.tierId,
      newTier: tierId
    }, clientInfo, requestId);

    return createResponse(200, {
      message: 'User tier updated successfully',
      userId,
      userType: updateData.userType,
      tier,
      membershipDetails: updateData.membershipDetails
    });
  } catch (error) {
    console.error('Update user tier error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to update user tier', requestId);
  }
};

/**
 * Get user capabilities
 */
const handleGetUserCapabilities = async (
  userId: string,
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  try {
    const user = await getUserById(userId);
    if (!user) {
      return createErrorResponse(404, 'USER_NOT_FOUND', 'User not found', requestId);
    }

    const enhancedUser = user as EnhancedUser;
    const capabilities = enhancedUser.capabilities || [];

    // Filter out expired capabilities
    const activeCapabilities = capabilities.filter(cap => 
      !cap.expiresAt || cap.expiresAt > Date.now()
    );

    return createResponse(200, {
      userId,
      capabilities: activeCapabilities,
      totalCapabilities: capabilities.length,
      activeCapabilities: activeCapabilities.length
    });
  } catch (error) {
    console.error('Get user capabilities error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get user capabilities', requestId);
  }
};

/**
 * Update user capabilities
 */
const handleUpdateUserCapabilities = async (
  userId: string,
  body: { capabilities: UserCapability[]; grantedBy: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { capabilities, grantedBy } = body;

  try {
    const user = await getUserById(userId);
    if (!user) {
      return createErrorResponse(404, 'USER_NOT_FOUND', 'User not found', requestId);
    }

    // Validate capabilities
    const validatedCapabilities = capabilities.map(cap => ({
      ...cap,
      grantedBy,
      grantedAt: Date.now()
    }));

    // Update user capabilities
    await updateUser(userId, {
      capabilities: validatedCapabilities,
      updatedAt: new Date().toISOString()
    });

    // Log capability update
    await logAuditEvent('USER_CAPABILITIES_UPDATED', 'admin', {
      userId,
      grantedBy,
      capabilities: validatedCapabilities.map(c => c.feature)
    }, clientInfo, requestId);

    return createResponse(200, {
      message: 'User capabilities updated successfully',
      userId,
      capabilities: validatedCapabilities
    });
  } catch (error) {
    console.error('Update user capabilities error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to update user capabilities', requestId);
  }
};

/**
 * Activate premium membership
 */
const handleActivatePremiumMembership = async (
  userId: string,
  body: { plan: string; billingCycle: 'monthly' | 'yearly'; paymentMethodId?: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { plan, billingCycle, paymentMethodId } = body;

  try {
    const user = await getUserById(userId);
    if (!user) {
      return createErrorResponse(404, 'USER_NOT_FOUND', 'User not found', requestId);
    }

    // Get premium tier
    const tier = await getUserTierByName(plan);
    if (!tier || !tier.isPremium) {
      return createErrorResponse(404, 'PREMIUM_TIER_NOT_FOUND', 'Premium tier not found', requestId);
    }

    // Calculate expiration date
    const expirationDate = billingCycle === 'yearly' 
      ? Date.now() + (365 * 24 * 60 * 60 * 1000)
      : Date.now() + (30 * 24 * 60 * 60 * 1000);

    // Update user with premium membership
    const updateData: Partial<EnhancedUser> = {
      premiumActive: true,
      premiumPlan: plan,
      premiumExpiresAt: expirationDate,
      membershipDetails: {
        plan: tier.name,
        tierId: tier.tierId,
        features: tier.features.map(f => f.featureId),
        limits: tier.limits,
        expiresAt: expirationDate,
        autoRenew: true,
        billingCycle
      },
      billingInfo: {
        ...((user as EnhancedUser).billingInfo || {}),
        paymentMethodId
      },
      updatedAt: new Date().toISOString()
    };

    await updateUser(userId, updateData);

    // Log premium activation
    await logAuditEvent('PREMIUM_MEMBERSHIP_ACTIVATED', 'billing', {
      userId,
      plan,
      billingCycle,
      expiresAt: expirationDate
    }, clientInfo, requestId);

    return createResponse(200, {
      message: 'Premium membership activated successfully',
      userId,
      plan,
      expiresAt: expirationDate,
      features: tier.features,
      limits: tier.limits
    });
  } catch (error) {
    console.error('Activate premium membership error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to activate premium membership', requestId);
  }
};

/**
 * Deactivate premium membership
 */
const handleDeactivatePremiumMembership = async (
  userId: string,
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  try {
    const user = await getUserById(userId);
    if (!user) {
      return createErrorResponse(404, 'USER_NOT_FOUND', 'User not found', requestId);
    }

    // Get basic tier for user type
    const enhancedUser = user as EnhancedUser;
    const userType = enhancedUser.userType || 'individual';
    const basicTierId = userType === 'dealer' ? 'dealer-basic' : 'individual-basic';
    const basicTier = await getUserTierById(basicTierId);

    // Update user to basic tier
    const updateData: Partial<EnhancedUser> = {
      premiumActive: false,
      premiumPlan: undefined,
      premiumExpiresAt: undefined,
      membershipDetails: {
        plan: basicTier?.name || 'Individual Basic',
        tierId: basicTierId,
        features: basicTier?.features.map(f => f.featureId) || [],
        limits: basicTier?.limits || DEFAULT_USER_TIERS[0].limits,
        autoRenew: false
      },
      updatedAt: new Date().toISOString()
    };

    await updateUser(userId, updateData);

    // Log premium deactivation
    await logAuditEvent('PREMIUM_MEMBERSHIP_DEACTIVATED', 'billing', {
      userId,
      previousPlan: enhancedUser.premiumPlan,
      downgradedTo: basicTier?.name
    }, clientInfo, requestId);

    return createResponse(200, {
      message: 'Premium membership deactivated successfully',
      userId,
      downgradedTo: basicTier?.name,
      newLimits: basicTier?.limits
    });
  } catch (error) {
    console.error('Deactivate premium membership error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to deactivate premium membership', requestId);
  }
};

/**
 * Get available user tiers
 */
const handleGetAvailableTiers = async (
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  try {
    // Try to get tiers from database, fallback to defaults
    let tiers: UserTier[] = [];
    
    try {
      const result = await docClient.send(new ScanCommand({
        TableName: USER_TIERS_TABLE,
        FilterExpression: 'active = :active',
        ExpressionAttributeValues: {
          ':active': true
        }
      }));
      
      tiers = result.Items as UserTier[] || [];
    } catch (error) {
      console.log('Using default tiers, database not available:', error);
      tiers = DEFAULT_USER_TIERS;
    }

    // If no tiers in database, use defaults
    if (tiers.length === 0) {
      tiers = DEFAULT_USER_TIERS;
    }

    // Sort by display order
    tiers.sort((a, b) => a.displayOrder - b.displayOrder);

    return createResponse(200, {
      tiers,
      totalTiers: tiers.length
    });
  } catch (error) {
    console.error('Get available tiers error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get available tiers', requestId);
  }
};

/**
 * Bulk update users (admin only)
 */
const handleBulkUserUpdate = async (
  body: { userIds: string[]; updates: Partial<EnhancedUser>; adminId: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { userIds, updates, adminId } = body;

  try {
    if (!userIds || userIds.length === 0) {
      return createErrorResponse(400, 'MISSING_USER_IDS', 'User IDs are required', requestId);
    }

    if (userIds.length > 100) {
      return createErrorResponse(400, 'TOO_MANY_USERS', 'Cannot update more than 100 users at once', requestId);
    }

    const results = [];
    const errors = [];

    // Process each user
    for (const userId of userIds) {
      try {
        const user = await getUserById(userId);
        if (!user) {
          errors.push({ userId, error: 'User not found' });
          continue;
        }

        // Validate updates
        const validatedUpdates = {
          ...updates,
          updatedAt: new Date().toISOString()
        };

        await updateUser(userId, validatedUpdates);
        results.push({ userId, status: 'updated' });

        // Log individual update
        await logAuditEvent('BULK_USER_UPDATE', 'admin', {
          userId,
          adminId,
          updates: Object.keys(updates)
        }, clientInfo, requestId);

      } catch (error) {
        errors.push({ userId, error: error instanceof Error ? error.message : 'Update failed' });
      }
    }

    return createResponse(200, {
      message: 'Bulk user update completed',
      totalUsers: userIds.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Bulk user update error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to perform bulk user update', requestId);
  }
};

/**
 * Get sales customers (sales role only)
 */
const handleGetSalesCustomers = async (
  event: APIGatewayProxyEvent,
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract sales rep ID from token or query params
    const salesRepId = event.queryStringParameters?.salesRepId;
    if (!salesRepId) {
      return createErrorResponse(400, 'MISSING_SALES_REP_ID', 'Sales representative ID is required', requestId);
    }

    // Get sales rep user
    const salesRep = await getUserById(salesRepId);
    if (!salesRep || salesRep.role !== UserRole.SALES) {
      return createErrorResponse(403, 'INVALID_SALES_REP', 'Invalid sales representative', requestId);
    }

    // Get assigned customers
    const salesUser = salesRep as SalesUser;
    const customerIds = salesUser.assignedCustomers || [];

    if (customerIds.length === 0) {
      return createResponse(200, {
        customers: [],
        totalCustomers: 0,
        salesRepId
      });
    }

    // Get customer details
    const customers = [];
    for (const customerId of customerIds) {
      const customer = await getUserById(customerId);
      if (customer) {
        const enhancedCustomer = customer as EnhancedUser;
        customers.push({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          userType: enhancedCustomer.userType || 'individual',
          premiumActive: enhancedCustomer.premiumActive || false,
          premiumPlan: enhancedCustomer.premiumPlan,
          membershipDetails: enhancedCustomer.membershipDetails,
          createdAt: customer.createdAt,
          lastLogin: customer.lastLogin
        });
      }
    }

    return createResponse(200, {
      customers,
      totalCustomers: customers.length,
      salesRepId,
      salesRepName: salesRep.name
    });
  } catch (error) {
    console.error('Get sales customers error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get sales customers', requestId);
  }
};

/**
 * Assign customer to sales representative
 */
const handleAssignCustomerToSales = async (
  body: { customerId: string; salesRepId: string; adminId: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { customerId, salesRepId, adminId } = body;

  try {
    // Validate customer exists
    const customer = await getUserById(customerId);
    if (!customer) {
      return createErrorResponse(404, 'CUSTOMER_NOT_FOUND', 'Customer not found', requestId);
    }

    // Validate sales rep exists and has sales role
    const salesRep = await getUserById(salesRepId);
    if (!salesRep || salesRep.role !== UserRole.SALES) {
      return createErrorResponse(404, 'SALES_REP_NOT_FOUND', 'Sales representative not found', requestId);
    }

    // Update customer with sales rep assignment
    await updateUser(customerId, {
      salesRepId,
      updatedAt: new Date().toISOString()
    });

    // Update sales rep with customer assignment
    const salesUser = salesRep as SalesUser;
    const assignedCustomers = salesUser.assignedCustomers || [];
    if (!assignedCustomers.includes(customerId)) {
      assignedCustomers.push(customerId);
      // Update the sales user's assigned customers
      const salesUpdateData = {
        ...salesUser,
        assignedCustomers,
        updatedAt: new Date().toISOString()
      };
      await updateUser(salesRepId, salesUpdateData);
    }

    // Log assignment
    await logAuditEvent('CUSTOMER_ASSIGNED_TO_SALES', 'admin', {
      customerId,
      customerName: customer.name,
      salesRepId,
      salesRepName: salesRep.name,
      adminId
    }, clientInfo, requestId);

    return createResponse(200, {
      message: 'Customer assigned to sales representative successfully',
      customerId,
      customerName: customer.name,
      salesRepId,
      salesRepName: salesRep.name
    });
  } catch (error) {
    console.error('Assign customer to sales error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to assign customer to sales representative', requestId);
  }
};

/**
 * Get sales performance metrics
 */
const handleGetSalesPerformance = async (
  event: APIGatewayProxyEvent,
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  try {
    const salesRepId = event.queryStringParameters?.salesRepId;
    if (!salesRepId) {
      return createErrorResponse(400, 'MISSING_SALES_REP_ID', 'Sales representative ID is required', requestId);
    }

    const salesRep = await getUserById(salesRepId);
    if (!salesRep || salesRep.role !== UserRole.SALES) {
      return createErrorResponse(403, 'INVALID_SALES_REP', 'Invalid sales representative', requestId);
    }

    const salesUser = salesRep as SalesUser;
    const assignedCustomers = salesUser.assignedCustomers || [];

    // Calculate performance metrics
    const performance = {
      salesRepId,
      salesRepName: salesRep.name,
      totalCustomers: assignedCustomers.length,
      activeCustomers: 0,
      premiumCustomers: 0,
      monthlyRevenue: 0,
      targets: salesUser.salesTargets || {
        monthly: 0,
        quarterly: 0,
        yearly: 0,
        achieved: { monthly: 0, quarterly: 0, yearly: 0 }
      },
      commissionRate: salesUser.commissionRate || 0,
      territory: salesUser.territory
    };

    // Get customer details for metrics
    for (const customerId of assignedCustomers) {
      const customer = await getUserById(customerId);
      if (customer && customer.status === UserStatus.ACTIVE) {
        performance.activeCustomers++;
        
        const enhancedCustomer = customer as EnhancedUser;
        if (enhancedCustomer.premiumActive) {
          performance.premiumCustomers++;
          // Add premium plan revenue (simplified calculation)
          const tier = await getUserTierById(enhancedCustomer.membershipDetails?.tierId || '');
          if (tier && tier.pricing.monthly) {
            performance.monthlyRevenue += tier.pricing.monthly;
          }
        }
      }
    }

    return createResponse(200, performance);
  } catch (error) {
    console.error('Get sales performance error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get sales performance', requestId);
  }
};

// Utility Functions

/**
 * Extract user ID from URL path
 */
function extractUserIdFromPath(path: string): string {
  const matches = path.match(/\/users\/([^\/]+)/);
  return matches ? matches[1] : '';
}

/**
 * Get user by ID
 */
async function getUserById(userId: string): Promise<User | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { id: userId }
    }));

    return result.Item as User || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Update user data
 */
async function updateUser(userId: string, updates: Partial<EnhancedUser>): Promise<void> {
  try {
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) {
      return;
    }

    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { id: userId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    }));
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Get user tier by ID
 */
async function getUserTierById(tierId: string): Promise<UserTier | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: USER_TIERS_TABLE,
      Key: { tierId }
    }));

    return result.Item as UserTier || DEFAULT_USER_TIERS.find(t => t.tierId === tierId) || null;
  } catch (error) {
    console.log('Using default tier, database not available:', error);
    return DEFAULT_USER_TIERS.find(t => t.tierId === tierId) || null;
  }
}

/**
 * Get user tier by name
 */
async function getUserTierByName(name: string): Promise<UserTier | null> {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: USER_TIERS_TABLE,
      FilterExpression: '#name = :name AND active = :active',
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ExpressionAttributeValues: {
        ':name': name,
        ':active': true
      }
    }));

    return result.Items && result.Items.length > 0 
      ? result.Items[0] as UserTier 
      : DEFAULT_USER_TIERS.find(t => t.name === name) || null;
  } catch (error) {
    console.log('Using default tier, database not available:', error);
    return DEFAULT_USER_TIERS.find(t => t.name === name) || null;
  }
}

/**
 * Validate user type transition
 */
function isValidUserTypeTransition(user: User, newUserType: string): boolean {
  const enhancedUser = user as EnhancedUser;
  const currentUserType = enhancedUser.userType || 'individual';
  
  // Define valid transitions
  const validTransitions: Record<string, string[]> = {
    'individual': ['individual', 'premium_individual', 'dealer'],
    'premium_individual': ['individual', 'premium_individual', 'dealer', 'premium_dealer'],
    'dealer': ['dealer', 'premium_dealer', 'individual'],
    'premium_dealer': ['dealer', 'premium_dealer', 'individual', 'premium_individual']
  };

  return validTransitions[currentUserType]?.includes(newUserType) || false;
}

/**
 * Log audit event
 */
async function logAuditEvent(
  action: string,
  resource: string,
  details: Record<string, any>,
  clientInfo: { ipAddress: string; userAgent: string },
  requestId: string,
  userId?: string
): Promise<void> {
  try {
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      userId: userId || 'system',
      userEmail: 'system',
      action,
      resource,
      details,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      timestamp: new Date().toISOString(),
      sessionId: requestId
    };

    await docClient.send(new PutCommand({
      TableName: AUDIT_LOGS_TABLE,
      Item: auditLog
    }));
  } catch (error) {
    console.error('Error logging audit event:', error);
    // Don't throw error to avoid breaking main functionality
  }
}

/**
 * Process expired premium memberships (scheduled function)
 */
export const processExpiredMemberships = async (): Promise<void> => {
  try {
    console.log('Processing expired premium memberships...');
    
    const now = Date.now();
    
    // Scan for users with expired premium memberships
    let result;
    try {
      result = await docClient.send(new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: 'premiumActive = :active AND premiumExpiresAt < :now',
        ExpressionAttributeValues: {
          ':active': true,
          ':now': now
        }
      }));
    } catch (error) {
      console.log('Database not available for expired membership processing:', error);
      console.log('Completed processing expired premium memberships (no database)');
      return;
    }

    const expiredUsers = result.Items as EnhancedUser[] || [];
    
    console.log(`Found ${expiredUsers.length} expired premium memberships`);

    for (const user of expiredUsers) {
      try {
        // Determine basic tier for user type
        const userType = user.userType || 'individual';
        const basicTierId = userType === 'dealer' ? 'dealer-basic' : 'individual-basic';
        const basicTier = await getUserTierById(basicTierId);

        // Downgrade to basic tier
        const updateData: Partial<EnhancedUser> = {
          premiumActive: false,
          premiumPlan: undefined,
          premiumExpiresAt: undefined,
          membershipDetails: {
            plan: basicTier?.name || 'Individual Basic',
            tierId: basicTierId,
            features: basicTier?.features.map(f => f.featureId) || [],
            limits: basicTier?.limits || DEFAULT_USER_TIERS[0].limits,
            autoRenew: false
          },
          updatedAt: new Date().toISOString()
        };

        await updateUser(user.id, updateData);

        // Log automatic downgrade
        await logAuditEvent('PREMIUM_MEMBERSHIP_EXPIRED', 'system', {
          userId: user.id,
          previousPlan: user.premiumPlan,
          downgradedTo: basicTier?.name,
          expiredAt: user.premiumExpiresAt
        }, { ipAddress: 'system', userAgent: 'system' }, 'scheduled-task');

        console.log(`Downgraded user ${user.id} from ${user.premiumPlan} to ${basicTier?.name}`);
      } catch (error) {
        console.error(`Error processing expired membership for user ${user.id}:`, error);
      }
    }

    console.log('Completed processing expired premium memberships');
  } catch (error) {
    console.error('Error processing expired memberships:', error);
    // Don't throw error in production - this is a background process
    console.log('Completed processing expired premium memberships (with errors)');
  }
};