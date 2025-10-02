import { Review, ListingRating } from '@harborlist/shared-types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api-dev.harborlist.com';

export interface CreateReviewData {
  listingId: string;
  rating: number;
  comment?: string;
}

export interface PlatformStats {
  totalListings: number;
  totalReviews: number;
  averageRating: number;
  userSatisfactionScore: number;
}

// Get ratings for a specific listing
export const getListingRating = async (listingId: string): Promise<ListingRating | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/listings/${listingId}/rating`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch rating');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching listing rating:', error);
    return null;
  }
};

// Create a new review
export const createReview = async (reviewData: CreateReviewData): Promise<Review> => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(reviewData),
  });

  if (!response.ok) {
    throw new Error('Failed to create review');
  }

  return await response.json();
};

// Get platform-wide statistics including real satisfaction scores
export const getPlatformStats = async (): Promise<PlatformStats> => {
  try {
    const response = await fetch(`${API_BASE_URL}/stats/platform`);
    if (!response.ok) {
      throw new Error('Failed to fetch platform stats');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    // Return default stats if API is not available yet
    return {
      totalListings: 0,
      totalReviews: 0,
      averageRating: 0,
      userSatisfactionScore: 0,
    };
  }
};

// Calculate satisfaction score from listing quality (fallback when no reviews exist)
export const calculateListingQualityScore = (listings: any[]): number => {
  if (listings.length === 0) return 0;
  
  const qualityScore = listings.reduce((acc, listing) => {
    let score = 0;
    let maxScore = 0;
    
    // Image quality (0-2 points)
    maxScore += 2;
    if (listing.images && listing.images.length > 0) {
      score += listing.images.length >= 3 ? 2 : 1;
    }
    
    // Description quality (0-2 points)
    maxScore += 2;
    if (listing.description) {
      if (listing.description.length > 200) score += 2;
      else if (listing.description.length > 50) score += 1;
    }
    
    // Features completeness (0-1 point)
    maxScore += 1;
    if (listing.features && listing.features.length > 0) {
      score += 1;
    }
    
    // Boat details completeness (0-2 points)
    maxScore += 2;
    if (listing.boatDetails?.manufacturer) score += 1;
    if (listing.boatDetails?.model) score += 1;
    
    // Price reasonableness (0-1 point)
    maxScore += 1;
    if (listing.price && listing.price > 0) score += 1;
    
    return acc + (score / maxScore);
  }, 0);
  
  return qualityScore / listings.length;
};