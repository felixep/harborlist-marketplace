import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createResponse, createErrorResponse } from '../shared/utils';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const LISTINGS_TABLE = process.env.LISTINGS_TABLE || 'boat-listings';
const REVIEWS_TABLE = process.env.REVIEWS_TABLE || 'boat-reviews';

interface PlatformStats {
  totalListings: number;
  activeListings: number;
  totalUsers: number;
  totalReviews: number;
  averageRating: number;
  userSatisfactionScore: number;
  topStates: Array<{ state: string; count: number }>;
  popularBoatTypes: Array<{ type: string; count: number }>;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {});
    }

    const path = event.path;
    
    if (path === '/stats/platform') {
      const stats = await getPlatformStats();
      return createResponse(200, stats);
    }

    return createErrorResponse(404, 'NOT_FOUND', 'Endpoint not found', requestId);
  } catch (error) {
    console.error('Error in stats service:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }
};

async function getPlatformStats(): Promise<PlatformStats> {
  try {
    // Get all listings
    const listingsResult = await docClient.send(new ScanCommand({
      TableName: LISTINGS_TABLE,
    }));

    const listings = listingsResult.Items || [];
    const totalListings = listings.length;
    const activeListings = listings.filter(listing => listing.status === 'active').length;

    // Calculate unique users (listing owners)
    const uniqueUsers = new Set(listings.map(listing => listing.ownerId)).size;

    // Get location statistics
    const stateCount: { [key: string]: number } = {};
    const boatTypeCount: { [key: string]: number } = {};

    listings.forEach(listing => {
      if (listing.location?.state) {
        stateCount[listing.location.state] = (stateCount[listing.location.state] || 0) + 1;
      }
      if (listing.boatDetails?.type) {
        const type = listing.boatDetails.type.toLowerCase();
        boatTypeCount[type] = (boatTypeCount[type] || 0) + 1;
      }
    });

    const topStates = Object.entries(stateCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([state, count]) => ({ state, count }));

    const popularBoatTypes = Object.entries(boatTypeCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));

    // Try to get reviews (this table might not exist yet)
    let totalReviews = 0;
    let averageRating = 0;
    let userSatisfactionScore = 0;

    try {
      const reviewsResult = await docClient.send(new ScanCommand({
        TableName: REVIEWS_TABLE,
      }));

      const reviews = reviewsResult.Items || [];
      totalReviews = reviews.length;

      if (totalReviews > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
        averageRating = totalRating / totalReviews;
        userSatisfactionScore = averageRating;
      }
    } catch (reviewError) {
      // Reviews table doesn't exist yet, that's okay
      console.log('Reviews table not found, using default values');
    }

    return {
      totalListings,
      activeListings,
      totalUsers: uniqueUsers,
      totalReviews,
      averageRating,
      userSatisfactionScore,
      topStates,
      popularBoatTypes,
    };
  } catch (error) {
    console.error('Error getting platform stats:', error);
    throw error;
  }
}