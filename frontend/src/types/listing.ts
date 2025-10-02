export interface Location {
  city: string;
  state: string;
  zipCode?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

export interface BoatDetails {
  type: string;
  manufacturer?: string;
  model?: string;
  year: number;
  length: number;
  beam?: number;
  draft?: number;
  engine?: string;
  hours?: number;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Needs Work';
}

export interface Review {
  reviewId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5 stars
  comment?: string;
  createdAt: number;
  verified?: boolean; // if the user actually contacted/viewed the boat
}

export interface ListingRating {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  reviews: Review[];
}

export interface Listing {
  listingId: string;
  ownerId: string;
  title: string;
  description: string;
  price: number;
  location: Location;
  boatDetails: BoatDetails;
  features: string[];
  images: string[];
  videos?: string[];
  thumbnails: string[];
  status: 'active' | 'inactive' | 'sold' | 'pending_moderation' | 'flagged' | 'rejected';
  views?: number;
  rating?: ListingRating;
  createdAt: number;
  updatedAt: number;
  moderationStatus?: 'approved' | 'pending' | 'flagged' | 'rejected';
  flagCount?: number;
  lastModerated?: number;
}

export interface SearchFilters {
  query?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  location?: {
    state?: string;
    radius?: number;
    coordinates?: {
      lat: number;
      lon: number;
    };
  };
  boatType?: string[];
  yearRange?: {
    min?: number;
    max?: number;
  };
  lengthRange?: {
    min?: number;
    max?: number;
  };
  features?: string[];
  sort?: {
    field: string;
    order: string;
  };
}

export interface SearchResult {
  results: Listing[];
  total: number;
  facets?: {
    boatTypes: Array<{ value: string; count: number }>;
    priceRanges: Array<{ range: string; count: number }>;
    locations: Array<{ state: string; count: number }>;
  };
}
