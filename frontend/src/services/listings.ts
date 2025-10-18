import { Listing, SearchFilters, SearchResult } from '@harborlist/shared-types';
import { config } from '../config/env';

const API_BASE_URL = config.apiUrl;

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // If we can't parse the error response, use the default message
    }

    if (response.status === 401) {
      errorMessage = 'Authentication required. Please sign in to continue.';
    } else if (response.status === 403) {
      errorMessage = 'You do not have permission to perform this action.';
    }

    throw new ApiError(response.status, errorMessage);
  }

  return response.json();
}

export async function getListings(params?: {
  limit?: number;
  nextToken?: string;
  ownerId?: string;
}): Promise<{ listings: Listing[]; nextToken?: string; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.nextToken) searchParams.set('nextToken', params.nextToken);
  if (params?.ownerId) searchParams.set('ownerId', params.ownerId);

  return apiRequest(`/listings?${searchParams.toString()}`);
}

export async function getListing(
  identifier: string, 
  options?: { bySlug?: boolean }
): Promise<{ listing: Listing }> {
  if (options?.bySlug) {
    return apiRequest(`/listings/slug/${identifier}`);
  }
  return apiRequest(`/listings/${identifier}`);
}

export async function createListing(
  listing: Omit<Listing, 'listingId' | 'createdAt' | 'updatedAt'>
): Promise<{ listingId: string; slug?: string; status?: string; message?: string }> {
  return apiRequest('/listings', {
    method: 'POST',
    body: JSON.stringify(listing),
  });
}

export async function updateListing(id: string, updates: Partial<Listing>): Promise<void> {
  return apiRequest(`/listings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteListing(id: string): Promise<void> {
  return apiRequest(`/listings/${id}`, {
    method: 'DELETE',
  });
}

export async function searchListings(params: SearchFilters & {
  limit?: number;
  offset?: number;
}): Promise<SearchResult> {
  return apiRequest('/search', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function contactOwner(params: {
  listingId: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  message: string;
}): Promise<{ messageId: string }> {
  return apiRequest('/contact', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function uploadMedia(file: File, listingId: string): Promise<{
  uploadId: string;
  url: string;
  thumbnail?: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('listingId', listingId);
  formData.append('type', file.type.startsWith('video/') ? 'video' : 'image');

  const token = localStorage.getItem('authToken');
  
  const response = await fetch(`${API_BASE_URL}/media/upload`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Upload failed: ${response.statusText}`);
  }

  return response.json();
}
