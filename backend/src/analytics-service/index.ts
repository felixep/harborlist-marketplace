/**
 * Analytics Service
 * 
 * Tracks and analyzes user behavior across the platform:
 * - Listing views (authenticated & anonymous)
 * - Clicks, searches, contacts, shares
 * - User engagement metrics
 * - Platform statistics
 * 
 * Supports both authenticated users and anonymous sessions
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  QueryCommand, 
  ScanCommand,
  GetCommand 
} from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const dynamoDbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
  }),
});

const docClient = DynamoDBDocumentClient.from(dynamoDbClient, {
  marshallOptions: {
    removeUndefinedValues: true, // Remove undefined values
    convertEmptyValues: false,
  },
});

// Table names
const ANALYTICS_TABLE = process.env.ANALYTICS_EVENTS_TABLE || 'harborlist-analytics-events';
const LISTINGS_TABLE = process.env.LISTINGS_TABLE || 'harborlist-listings';
const USERS_TABLE = process.env.USERS_TABLE || 'harborlist-users';

// Event types
export enum AnalyticsEventType {
  // Listing interactions
  LISTING_VIEW = 'LISTING_VIEW',
  LISTING_CARD_CLICK = 'LISTING_CARD_CLICK',
  LISTING_IMAGE_VIEW = 'LISTING_IMAGE_VIEW',
  LISTING_IMAGE_EXPAND = 'LISTING_IMAGE_EXPAND',
  LISTING_CONTACT_CLICK = 'LISTING_CONTACT_CLICK',
  LISTING_PHONE_REVEAL = 'LISTING_PHONE_REVEAL',
  LISTING_EMAIL_CLICK = 'LISTING_EMAIL_CLICK',
  LISTING_SHARE = 'LISTING_SHARE',
  LISTING_FAVORITE = 'LISTING_FAVORITE',
  LISTING_UNFAVORITE = 'LISTING_UNFAVORITE',
  
  // Search & discovery
  SEARCH_QUERY = 'SEARCH_QUERY',
  SEARCH_FILTER_APPLY = 'SEARCH_FILTER_APPLY',
  SEARCH_RESULT_CLICK = 'SEARCH_RESULT_CLICK',
  CATEGORY_BROWSE = 'CATEGORY_BROWSE',
  
  // Page views
  PAGE_VIEW = 'PAGE_VIEW',
  HOME_VIEW = 'HOME_VIEW',
  PROFILE_VIEW = 'PROFILE_VIEW',
  
  // User actions
  USER_REGISTER = 'USER_REGISTER',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  
  // Engagement
  TIME_ON_PAGE = 'TIME_ON_PAGE',
  SCROLL_DEPTH = 'SCROLL_DEPTH',
}

interface AnalyticsEvent {
  eventId: string;
  timestamp: string;
  eventType: AnalyticsEventType;
  userId?: string;
  sessionId: string;
  listingId?: string;
  metadata?: {
    page?: string;
    referrer?: string;
    userAgent?: string;
    ipAddress?: string;
    deviceType?: 'mobile' | 'tablet' | 'desktop';
    searchQuery?: string;
    filterCriteria?: any;
    duration?: number;
    scrollPercentage?: number;
    position?: number; // Position in search results
    [key: string]: any;
  };
}

/**
 * Lambda handler for analytics events
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Analytics event:', {
    method: event.httpMethod,
    path: event.path,
    headers: event.headers,
  });

  const requestId = context.awsRequestId;
  // Handle both /api/analytics and /api/stats paths
  const path = event.path.replace('/api/analytics', '').replace('/api/stats', '');
  const method = event.httpMethod;

  try {
    // Track event endpoint
    if (path === '/track' && method === 'POST') {
      return await handleTrackEvent(event, requestId);
    }

    // Get platform stats endpoint (both /api/stats/platform and /api/analytics/stats/platform)
    if (path === '/platform' && method === 'GET') {
      return await handleGetPlatformStats(event, requestId);
    }

    // Get listing analytics
    if (path.match(/^\/listings\/[^\/]+\/stats$/) && method === 'GET') {
      const listingId = path.split('/')[2];
      return await handleGetListingStats(listingId, requestId);
    }

    // Get user analytics (for admins)
    if (path === '/stats/users' && method === 'GET') {
      return await handleGetUserStats(event, requestId);
    }

    // Get top listings by views
    if (path === '/stats/top-listings' && method === 'GET') {
      return await handleGetTopListings(event, requestId);
    }

    return createResponse(404, { error: 'Not Found' });
  } catch (error) {
    console.error('Analytics handler error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }
};

/**
 * Track an analytics event
 */
async function handleTrackEvent(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const {
      eventType,
      listingId,
      metadata = {}
    } = body;

    if (!eventType) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'eventType is required', requestId);
    }

    // Extract user info
    const userId = extractUserIdFromToken(event.headers);
    const sessionId = body.sessionId || event.headers['x-session-id'] || generateSessionId();

    // Get client info
    const clientInfo = extractClientInfo(event);

    // Create analytics event
    const analyticsEvent: AnalyticsEvent = {
      eventId: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      eventType,
      sessionId,
      ...(userId && { userId }),
      ...(listingId && { listingId }),
      metadata: {
        ...metadata,
        ...clientInfo,
        page: metadata.page || event.headers.referer || 'unknown',
      },
    };

    // Store event in DynamoDB
    await docClient.send(new PutCommand({
      TableName: ANALYTICS_TABLE,
      Item: analyticsEvent,
    }));

    console.log('Analytics event tracked:', {
      eventType,
      userId: userId || 'anonymous',
      sessionId,
      listingId,
    });

    return createResponse(201, {
      success: true,
      eventId: analyticsEvent.eventId,
    });
  } catch (error) {
    console.error('Error tracking event:', error);
    return createErrorResponse(500, 'TRACKING_ERROR', 'Failed to track event', requestId);
  }
}

/**
 * Get platform-wide statistics
 */
async function handleGetPlatformStats(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    // Get total listings
    const listingsResult = await docClient.send(new ScanCommand({
      TableName: LISTINGS_TABLE,
      Select: 'COUNT',
    }));
    const totalListings = listingsResult.Count || 0;

    // Get active listings
    const activeListingsResult = await docClient.send(new ScanCommand({
      TableName: LISTINGS_TABLE,
      FilterExpression: '#status = :active',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':active': 'active' },
      Select: 'COUNT',
    }));
    const activeListings = activeListingsResult.Count || 0;

    // Get total users
    const usersResult = await docClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      Select: 'COUNT',
    }));
    const totalUsers = usersResult.Count || 0;

    // Get total events in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const eventsResult = await docClient.send(new ScanCommand({
      TableName: ANALYTICS_TABLE,
      FilterExpression: '#timestamp >= :thirtyDaysAgo',
      ExpressionAttributeNames: { '#timestamp': 'timestamp' },
      ExpressionAttributeValues: { ':thirtyDaysAgo': thirtyDaysAgo.toISOString() },
      Select: 'COUNT',
    }));
    const totalEvents = eventsResult.Count || 0;

    // Count specific event types
    const viewsResult = await docClient.send(new QueryCommand({
      TableName: ANALYTICS_TABLE,
      IndexName: 'EventTypeIndex',
      KeyConditionExpression: 'eventType = :viewType',
      ExpressionAttributeValues: {
        ':viewType': AnalyticsEventType.LISTING_VIEW,
      },
      Select: 'COUNT',
    }));
    const totalViews = viewsResult.Count || 0;

    // Calculate engagement score (placeholder algorithm)
    const engagementScore = totalEvents > 0 
      ? Math.min(5.0, 3.0 + (totalEvents / totalListings) / 10)
      : 4.0;

    const stats = {
      totalListings,
      activeListings,
      totalUsers,
      totalViews,
      totalEvents,
      averageRating: 4.5, // Placeholder until reviews are implemented
      userSatisfactionScore: parseFloat(engagementScore.toFixed(1)),
      totalReviews: 0, // Placeholder until reviews are implemented
      last30Days: {
        views: totalViews,
        events: totalEvents,
      },
    };

    return createResponse(200, stats);
  } catch (error) {
    console.error('Error getting platform stats:', error);
    return createErrorResponse(500, 'STATS_ERROR', 'Failed to get platform stats', requestId);
  }
}

/**
 * Get analytics for a specific listing
 */
async function handleGetListingStats(
  listingId: string,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    // Query all events for this listing
    const result = await docClient.send(new QueryCommand({
      TableName: ANALYTICS_TABLE,
      IndexName: 'ListingEventsIndex',
      KeyConditionExpression: 'listingId = :listingId',
      ExpressionAttributeValues: {
        ':listingId': listingId,
      },
    }));

    const events = result.Items || [];

    // Calculate statistics
    const stats = {
      listingId,
      totalEvents: events.length,
      views: events.filter(e => e.eventType === AnalyticsEventType.LISTING_VIEW).length,
      clicks: events.filter(e => e.eventType === AnalyticsEventType.LISTING_CARD_CLICK).length,
      contacts: events.filter(e => e.eventType === AnalyticsEventType.LISTING_CONTACT_CLICK).length,
      shares: events.filter(e => e.eventType === AnalyticsEventType.LISTING_SHARE).length,
      favorites: events.filter(e => e.eventType === AnalyticsEventType.LISTING_FAVORITE).length,
      uniqueVisitors: new Set(events.map(e => e.userId || e.sessionId)).size,
      lastViewed: events.length > 0 
        ? events.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0].timestamp 
        : null,
    };

    return createResponse(200, stats);
  } catch (error) {
    console.error('Error getting listing stats:', error);
    return createErrorResponse(500, 'STATS_ERROR', 'Failed to get listing stats', requestId);
  }
}

/**
 * Get user behavior statistics (admin only)
 */
async function handleGetUserStats(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    // TODO: Add admin auth check

    const days = parseInt(event.queryStringParameters?.days || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all events in time range
    const result = await docClient.send(new ScanCommand({
      TableName: ANALYTICS_TABLE,
      FilterExpression: '#timestamp >= :startDate',
      ExpressionAttributeNames: { '#timestamp': 'timestamp' },
      ExpressionAttributeValues: { ':startDate': startDate.toISOString() },
    }));

    const events = result.Items || [];

    // Group events by type
    const eventsByType: { [key: string]: number } = {};
    events.forEach(event => {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
    });

    // Unique users
    const uniqueUsers = new Set(events.filter(e => e.userId).map(e => e.userId)).size;
    const uniqueSessions = new Set(events.map(e => e.sessionId)).size;

    const stats = {
      timeRange: { days, startDate: startDate.toISOString() },
      totalEvents: events.length,
      uniqueUsers,
      uniqueSessions,
      eventsByType,
      averageEventsPerSession: uniqueSessions > 0 ? events.length / uniqueSessions : 0,
    };

    return createResponse(200, stats);
  } catch (error) {
    console.error('Error getting user stats:', error);
    return createErrorResponse(500, 'STATS_ERROR', 'Failed to get user stats', requestId);
  }
}

/**
 * Get top listings by views/engagement
 */
async function handleGetTopListings(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    const limit = parseInt(event.queryStringParameters?.limit || '10');
    const days = parseInt(event.queryStringParameters?.days || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all view events
    const result = await docClient.send(new QueryCommand({
      TableName: ANALYTICS_TABLE,
      IndexName: 'EventTypeIndex',
      KeyConditionExpression: 'eventType = :viewType AND #timestamp >= :startDate',
      ExpressionAttributeNames: { '#timestamp': 'timestamp' },
      ExpressionAttributeValues: {
        ':viewType': AnalyticsEventType.LISTING_VIEW,
        ':startDate': startDate.toISOString(),
      },
    }));

    const events = result.Items || [];

    // Count views per listing
    const viewsByListing: { [key: string]: number } = {};
    events.forEach(event => {
      if (event.listingId) {
        viewsByListing[event.listingId] = (viewsByListing[event.listingId] || 0) + 1;
      }
    });

    // Sort and get top listings
    const topListings = Object.entries(viewsByListing)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([listingId, views]) => ({ listingId, views }));

    return createResponse(200, {
      timeRange: { days, startDate: startDate.toISOString() },
      topListings,
    });
  } catch (error) {
    console.error('Error getting top listings:', error);
    return createErrorResponse(500, 'STATS_ERROR', 'Failed to get top listings', requestId);
  }
}

/**
 * Helper: Extract user ID from JWT token
 */
function extractUserIdFromToken(headers: any): string | undefined {
  const authHeader = headers.Authorization || headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return undefined;
  }

  try {
    const token = authHeader.substring(7);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.sub || payload.userId;
  } catch (error) {
    return undefined;
  }
}

/**
 * Helper: Extract client information
 */
function extractClientInfo(event: APIGatewayProxyEvent) {
  const userAgent = event.headers['User-Agent'] || event.headers['user-agent'] || '';
  const ipAddress = event.requestContext?.identity?.sourceIp || 'unknown';
  
  // Simple device type detection
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/mobile/i.test(userAgent)) deviceType = 'mobile';
  else if (/tablet|ipad/i.test(userAgent)) deviceType = 'tablet';

  return {
    userAgent,
    ipAddress,
    deviceType,
    referrer: event.headers.referer || event.headers.Referer,
  };
}

/**
 * Helper: Generate session ID
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Helper: Create success response
 */
function createResponse(statusCode: number, body: any): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
    },
    body: JSON.stringify(body),
  };
}

/**
 * Helper: Create error response
 */
function createErrorResponse(
  statusCode: number,
  code: string,
  message: string,
  requestId: string
): APIGatewayProxyResult {
  return createResponse(statusCode, {
    error: { code, message, requestId },
  });
}
