/**
 * Notification Service
 * 
 * Handles creating, retrieving, and managing user notifications.
 * Notifications can be:
 * - Moderation updates (listing approved/rejected)
 * - System announcements
 * - Messages from other users
 * - Transaction updates
 * - Activity alerts
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  QueryCommand, 
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand
} from '@aws-sdk/lib-dynamodb';
import { createResponse, createErrorResponse, generateId } from '../shared/utils';

// Initialize DynamoDB client
const dynamoDbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
  }),
});

const docClient = DynamoDBDocumentClient.from(dynamoDbClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

// Table names
const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE || 'harborlist-notifications';

// Notification types
export type NotificationType = 
  | 'listing_approved'
  | 'listing_rejected'
  | 'listing_changes_requested'
  | 'listing_inquiry'
  | 'listing_offer'
  | 'system_announcement'
  | 'account_update'
  | 'message'
  | 'transaction_update';

// Notification status
export type NotificationStatus = 'unread' | 'read' | 'archived';

// Notification interface
export interface Notification {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  createdAt: number;
  readAt?: number;
  data?: Record<string, any>; // Additional context data
  actionUrl?: string; // Optional URL to navigate to
  ttl?: number; // Time to live for auto-deletion (90 days default)
}

/**
 * Creates a new notification for a user
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, any>,
  actionUrl?: string
): Promise<Notification> {
  const now = Date.now();
  const notification: Notification = {
    notificationId: generateId(),
    userId,
    type,
    title,
    message,
    status: 'unread',
    createdAt: now,
    data,
    actionUrl,
    ttl: Math.floor(now / 1000) + (90 * 24 * 60 * 60), // 90 days from now
  };

  await docClient.send(new PutCommand({
    TableName: NOTIFICATIONS_TABLE,
    Item: notification,
  }));

  console.log(`Created notification for user ${userId}: ${type} - ${title}`);
  return notification;
}

/**
 * Get notifications for a user with pagination
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 20,
  lastKey?: any,
  status?: NotificationStatus
): Promise<{ notifications: Notification[]; lastKey?: any }> {
  let queryParams: any = {
    TableName: NOTIFICATIONS_TABLE,
    IndexName: 'user-index',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
    Limit: limit,
    ScanIndexForward: false, // Sort by createdAt descending (newest first)
  };

  if (lastKey) {
    queryParams.ExclusiveStartKey = lastKey;
  }

  // If filtering by status, use the user-status-index
  if (status) {
    queryParams.IndexName = 'user-status-index';
    queryParams.KeyConditionExpression = 'userId = :userId AND #status = :status';
    queryParams.ExpressionAttributeNames = {
      '#status': 'status',
    };
    queryParams.ExpressionAttributeValues = {
      ':userId': userId,
      ':status': status,
    };
  }

  const result = await docClient.send(new QueryCommand(queryParams));

  return {
    notifications: (result.Items as Notification[]) || [],
    lastKey: result.LastEvaluatedKey,
  };
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  createdAt: number
): Promise<void> {
  await docClient.send(new UpdateCommand({
    TableName: NOTIFICATIONS_TABLE,
    Key: { notificationId, createdAt },
    UpdateExpression: 'SET #status = :read, readAt = :readAt',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':read': 'read',
      ':readAt': Date.now(),
    },
  }));
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  // Get all unread notifications for the user
  const { notifications } = await getUserNotifications(userId, 100, undefined, 'unread');
  
  if (notifications.length === 0) {
    return 0;
  }

  // Update each notification to read status
  const updatePromises = notifications.map(notification =>
    markNotificationAsRead(notification.notificationId, notification.createdAt)
  );

  await Promise.all(updatePromises);
  return notifications.length;
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
  createdAt: number
): Promise<void> {
  await docClient.send(new DeleteCommand({
    TableName: NOTIFICATIONS_TABLE,
    Key: { notificationId, createdAt },
  }));
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const result = await docClient.send(new QueryCommand({
    TableName: NOTIFICATIONS_TABLE,
    IndexName: 'user-status-index',
    KeyConditionExpression: 'userId = :userId AND #status = :unread',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':userId': userId,
      ':unread': 'unread',
    },
    Select: 'COUNT',
  }));

  return result.Count || 0;
}

/**
 * Lambda handler for notification endpoints
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const path = event.path;
  const method = event.httpMethod;

  console.log(`Notification service - ${method} ${path}`);
  console.log(`[NOTIFICATION] Full path: ${path}, QueryString:`, event.queryStringParameters);

  try {
    // Extract userId from JWT token in the authorizer context
    let userId = '';
    
    if (event.requestContext.authorizer?.claims?.sub) {
      userId = event.requestContext.authorizer.claims.sub;
    } else if (event.queryStringParameters?.userId) {
      // Fallback to query parameter (for testing only, remove in production)
      userId = event.queryStringParameters.userId;
    }

    if (!userId) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'User authentication required', requestId);
    }

    // GET /api/notifications - Get user notifications
    if (method === 'GET' && path.match(/^\/api\/notifications(\/|\?|$)/)) {
      const limit = parseInt(event.queryStringParameters?.limit || '20');
      const status = event.queryStringParameters?.status as NotificationStatus | undefined;
      const lastKey = event.queryStringParameters?.lastKey 
        ? JSON.parse(decodeURIComponent(event.queryStringParameters.lastKey))
        : undefined;

      const result = await getUserNotifications(userId, limit, lastKey, status);
      
      console.log(`[NOTIFICATION] Retrieved ${result.notifications.length} notifications for user ${userId}`);
      
      return createResponse(200, result);
    }

    // GET /api/notifications/unread-count - Get unread count
    if (method === 'GET' && path.match(/^\/api\/notifications\/unread-count\/?$/)) {
      const count = await getUnreadCount(userId);
      console.log(`[NOTIFICATION] Unread count for user ${userId}: ${count}`);
      return createResponse(200, { count });
    }

    // PUT /api/notifications/:id/read - Mark notification as read
    if (method === 'PUT' && path.match(/^\/api\/notifications\/[^/]+\/read\/?$/)) {
      const pathParts = path.split('/');
      const notificationId = pathParts[3] || '';
      const body = JSON.parse(event.body || '{}');
      const createdAt = body.createdAt;

      if (!createdAt) {
        return createErrorResponse(400, 'BAD_REQUEST', 'createdAt required', requestId);
      }

      await markNotificationAsRead(notificationId, createdAt);
      return createResponse(200, { success: true, message: 'Notification marked as read' });
    }

    // PUT /api/notifications/read-all - Mark all as read
    if (method === 'PUT' && path.match(/^\/api\/notifications\/read-all\/?$/)) {
      const count = await markAllNotificationsAsRead(userId);
      return createResponse(200, { success: true, count });
    }

    // DELETE /api/notifications/:id - Delete notification
    if (method === 'DELETE' && path.match(/^\/api\/notifications\/[^/]+\/?$/)) {
      const pathParts = path.split('/');
      const notificationId = pathParts[3] || '';
      const body = JSON.parse(event.body || '{}');
      const createdAt = body.createdAt;

      if (!createdAt) {
        return createErrorResponse(400, 'BAD_REQUEST', 'createdAt required', requestId);
      }

      await deleteNotification(notificationId, createdAt);
      return createResponse(200, { success: true, message: 'Notification deleted' });
    }

    return createErrorResponse(404, 'NOT_FOUND', 'Endpoint not found', requestId);

  } catch (error) {
    console.error('Notification service error:', error);
    return createErrorResponse(500, 'SERVER_ERROR', 'Internal server error', requestId);
  }
};
