/**
 * @fileoverview Dealer Sub-Account Management Service
 * 
 * This service provides functionality for dealers to create and manage sub-accounts
 * for their staff members. Sub-accounts can have delegated permissions and scoped
 * access to specific listings, leads, and features.
 * 
 * Features:
 * - Create sub-accounts under a parent dealer
 * - List all sub-accounts for a dealer
 * - Update sub-account permissions and access scope
 * - Delete/suspend sub-accounts
 * - Query sub-accounts using ParentDealerIndex GSI
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  UpdateCommand,
  DeleteCommand,
  QueryCommand 
} from '@aws-sdk/lib-dynamodb';
import { 
  DealerSubAccount, 
  DealerSubAccountRole, 
  DealerAccessScope, 
  UserStatus 
} from '../types/common';
import { v4 as uuidv4 } from 'uuid';

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.IS_LOCALSTACK === 'true' && {
    endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  }),
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);
const USERS_TABLE = process.env.USERS_TABLE || 'harborlist-users';

/**
 * Interface for creating a new dealer sub-account
 */
export interface CreateSubAccountRequest {
  parentDealerId: string;
  email: string;
  name: string;
  dealerAccountRole: DealerSubAccountRole;
  accessScope: DealerAccessScope;
  delegatedPermissions?: string[];
  createdBy: string;
}

/**
 * Interface for updating a dealer sub-account
 */
export interface UpdateSubAccountRequest {
  subAccountId: string;
  parentDealerId: string;
  dealerAccountRole?: DealerSubAccountRole;
  accessScope?: Partial<DealerAccessScope>;
  delegatedPermissions?: string[];
  status?: UserStatus;
}

/**
 * Interface for dealer sub-account response
 */
export interface SubAccountResponse {
  success: boolean;
  subAccount?: DealerSubAccount;
  error?: string;
  errorCode?: string;
}

/**
 * Interface for listing sub-accounts response
 */
export interface ListSubAccountsResponse {
  success: boolean;
  subAccounts?: DealerSubAccount[];
  count?: number;
  error?: string;
  errorCode?: string;
}

/**
 * Create a new dealer sub-account
 * 
 * @param request - Sub-account creation details
 * @returns SubAccountResponse with created sub-account or error
 */
export async function createSubAccount(request: CreateSubAccountRequest): Promise<SubAccountResponse> {
  try {
    const {
      parentDealerId,
      email,
      name,
      dealerAccountRole,
      accessScope,
      delegatedPermissions = [],
      createdBy
    } = request;

    // Verify parent dealer exists and is a dealer account
    const parentDealer = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { id: parentDealerId }
    }));

    if (!parentDealer.Item) {
      return {
        success: false,
        error: 'Parent dealer not found',
        errorCode: 'PARENT_DEALER_NOT_FOUND'
      };
    }

    if (parentDealer.Item.customerTier !== 'dealer' && parentDealer.Item.customerTier !== 'premium_dealer') {
      return {
        success: false,
        error: 'Parent account must be a dealer account',
        errorCode: 'INVALID_PARENT_ACCOUNT_TYPE'
      };
    }

    // Check if email already exists
    const existingUser = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email
      }
    }));

    if (existingUser.Items && existingUser.Items.length > 0) {
      return {
        success: false,
        error: 'Email already in use',
        errorCode: 'EMAIL_EXISTS'
      };
    }

    // Create sub-account
    const subAccountId = uuidv4();
    const now = new Date().toISOString();

    const subAccount: any = {
      id: subAccountId,
      email,
      name,
      parentDealerId,
      parentDealerName: parentDealer.Item.name,
      dealerAccountRole,
      delegatedPermissions,
      accessScope,
      status: UserStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      createdBy,
      emailVerified: false,
      phoneVerified: false,
      mfaEnabled: false,
      loginAttempts: 0,
      userType: 'customer', // Sub-accounts are customer-type users
      role: 'user',
      isDealerSubAccount: true
    };

    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: subAccount
    }));

    console.log(`✅ Created dealer sub-account: ${email} for parent: ${parentDealerId}`);

    // Return as DealerSubAccount type
    const responseSubAccount: DealerSubAccount = {
      id: subAccount.id,
      email: subAccount.email,
      name: subAccount.name,
      parentDealerId: subAccount.parentDealerId,
      parentDealerName: subAccount.parentDealerName,
      dealerAccountRole: subAccount.dealerAccountRole,
      delegatedPermissions: subAccount.delegatedPermissions,
      accessScope: subAccount.accessScope,
      status: subAccount.status,
      createdAt: subAccount.createdAt,
      createdBy: subAccount.createdBy,
      emailVerified: subAccount.emailVerified
    };

    return {
      success: true,
      subAccount: responseSubAccount
    };
  } catch (error: any) {
    console.error('Error creating dealer sub-account:', error);
    return {
      success: false,
      error: error.message || 'Failed to create sub-account',
      errorCode: 'CREATION_FAILED'
    };
  }
}

/**
 * List all sub-accounts for a parent dealer
 * 
 * @param parentDealerId - ID of the parent dealer
 * @returns ListSubAccountsResponse with array of sub-accounts
 */
export async function listSubAccounts(parentDealerId: string): Promise<ListSubAccountsResponse> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'ParentDealerIndex',
      KeyConditionExpression: 'parentDealerId = :parentId',
      ExpressionAttributeValues: {
        ':parentId': parentDealerId
      },
      ScanIndexForward: false // Sort by createdAt descending (newest first)
    }));

    const subAccounts: DealerSubAccount[] = (result.Items || []).map(item => ({
      id: item.id,
      email: item.email,
      name: item.name,
      parentDealerId: item.parentDealerId,
      parentDealerName: item.parentDealerName,
      dealerAccountRole: item.dealerAccountRole,
      delegatedPermissions: item.delegatedPermissions || [],
      accessScope: item.accessScope,
      status: item.status,
      createdAt: item.createdAt,
      createdBy: item.createdBy,
      lastLogin: item.lastLogin,
      emailVerified: item.emailVerified
    }));

    console.log(`✅ Listed ${subAccounts.length} sub-accounts for dealer: ${parentDealerId}`);

    return {
      success: true,
      subAccounts,
      count: subAccounts.length
    };
  } catch (error: any) {
    console.error('Error listing dealer sub-accounts:', error);
    return {
      success: false,
      error: error.message || 'Failed to list sub-accounts',
      errorCode: 'LIST_FAILED'
    };
  }
}

/**
 * Get a specific sub-account by ID
 * 
 * @param subAccountId - ID of the sub-account
 * @param parentDealerId - ID of the parent dealer (for authorization)
 * @returns SubAccountResponse with sub-account or error
 */
export async function getSubAccount(
  subAccountId: string, 
  parentDealerId: string
): Promise<SubAccountResponse> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { id: subAccountId }
    }));

    if (!result.Item) {
      return {
        success: false,
        error: 'Sub-account not found',
        errorCode: 'SUB_ACCOUNT_NOT_FOUND'
      };
    }

    // Verify this sub-account belongs to the parent dealer
    if (result.Item.parentDealerId !== parentDealerId) {
      return {
        success: false,
        error: 'Unauthorized: sub-account does not belong to this dealer',
        errorCode: 'UNAUTHORIZED_ACCESS'
      };
    }

    const subAccount: DealerSubAccount = {
      id: result.Item.id,
      email: result.Item.email,
      name: result.Item.name,
      parentDealerId: result.Item.parentDealerId,
      parentDealerName: result.Item.parentDealerName,
      dealerAccountRole: result.Item.dealerAccountRole,
      delegatedPermissions: result.Item.delegatedPermissions || [],
      accessScope: result.Item.accessScope,
      status: result.Item.status,
      createdAt: result.Item.createdAt,
      createdBy: result.Item.createdBy,
      lastLogin: result.Item.lastLogin,
      emailVerified: result.Item.emailVerified
    };

    return {
      success: true,
      subAccount
    };
  } catch (error: any) {
    console.error('Error getting dealer sub-account:', error);
    return {
      success: false,
      error: error.message || 'Failed to get sub-account',
      errorCode: 'GET_FAILED'
    };
  }
}

/**
 * Update a dealer sub-account
 * 
 * @param request - Update request with new values
 * @returns SubAccountResponse with updated sub-account or error
 */
export async function updateSubAccount(request: UpdateSubAccountRequest): Promise<SubAccountResponse> {
  try {
    const {
      subAccountId,
      parentDealerId,
      dealerAccountRole,
      accessScope,
      delegatedPermissions,
      status
    } = request;

    // Verify sub-account exists and belongs to parent dealer
    const existing = await getSubAccount(subAccountId, parentDealerId);
    if (!existing.success) {
      return existing;
    }

    // Build update expression
    const updateExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {};

    if (dealerAccountRole) {
      updateExpressions.push('#role = :role');
      expressionAttributeNames['#role'] = 'dealerAccountRole';
      expressionAttributeValues[':role'] = dealerAccountRole;
    }

    if (accessScope) {
      updateExpressions.push('accessScope = :scope');
      expressionAttributeValues[':scope'] = {
        ...existing.subAccount!.accessScope,
        ...accessScope
      };
    }

    if (delegatedPermissions) {
      updateExpressions.push('delegatedPermissions = :perms');
      expressionAttributeValues[':perms'] = delegatedPermissions;
    }

    if (status) {
      updateExpressions.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = status;
    }

    // Always update the updatedAt timestamp
    updateExpressions.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    if (updateExpressions.length === 1) { // Only updatedAt
      return {
        success: false,
        error: 'No fields to update',
        errorCode: 'NO_UPDATES'
      };
    }

    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { id: subAccountId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ...(Object.keys(expressionAttributeNames).length > 0 && {
        ExpressionAttributeNames: expressionAttributeNames
      })
    }));

    console.log(`✅ Updated dealer sub-account: ${subAccountId}`);

    // Fetch updated sub-account
    return await getSubAccount(subAccountId, parentDealerId);
  } catch (error: any) {
    console.error('Error updating dealer sub-account:', error);
    return {
      success: false,
      error: error.message || 'Failed to update sub-account',
      errorCode: 'UPDATE_FAILED'
    };
  }
}

/**
 * Delete a dealer sub-account
 * 
 * @param subAccountId - ID of the sub-account to delete
 * @param parentDealerId - ID of the parent dealer (for authorization)
 * @returns Response indicating success or error
 */
export async function deleteSubAccount(
  subAccountId: string,
  parentDealerId: string
): Promise<{ success: boolean; error?: string; errorCode?: string }> {
  try {
    // Verify sub-account exists and belongs to parent dealer
    const existing = await getSubAccount(subAccountId, parentDealerId);
    if (!existing.success) {
      return existing;
    }

    await docClient.send(new DeleteCommand({
      TableName: USERS_TABLE,
      Key: { id: subAccountId }
    }));

    console.log(`✅ Deleted dealer sub-account: ${subAccountId}`);

    return {
      success: true
    };
  } catch (error: any) {
    console.error('Error deleting dealer sub-account:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete sub-account',
      errorCode: 'DELETE_FAILED'
    };
  }
}

/**
 * Check if a user has permission to perform an action based on their access scope
 * 
 * @param subAccount - The dealer sub-account
 * @param resource - The resource being accessed (listing, lead, etc.)
 * @param action - The action being performed
 * @returns boolean indicating if access is allowed
 */
export function checkSubAccountPermission(
  subAccount: DealerSubAccount,
  resource: 'listing' | 'lead' | 'analytics' | 'inventory' | 'pricing' | 'financial',
  action: string,
  resourceId?: string
): boolean {
  const { accessScope, dealerAccountRole } = subAccount;

  // Admin role has full access
  if (dealerAccountRole === DealerSubAccountRole.ADMIN) {
    return true;
  }

  // Check specific resource permissions
  switch (resource) {
    case 'listing':
      if (accessScope.listings === 'all') {
        return true;
      }
      if (Array.isArray(accessScope.listings) && resourceId) {
        return accessScope.listings.includes(resourceId);
      }
      return false;

    case 'lead':
      return accessScope.leads === true;

    case 'analytics':
      return accessScope.analytics === true;

    case 'inventory':
      return accessScope.inventory === true;

    case 'pricing':
      // Manager can modify pricing
      return dealerAccountRole === DealerSubAccountRole.MANAGER || accessScope.pricing === true;

    case 'financial':
      return accessScope.financial === true;

    default:
      return false;
  }
}
