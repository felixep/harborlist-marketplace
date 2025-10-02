import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useModerationQueue } from '../useModerationQueue';

// Mock the adminApi
const mockAdminApi = {
  getFlaggedListings: vi.fn(),
  getModerationStats: vi.fn(),
  moderateListing: vi.fn(),
  getListingDetails: vi.fn()
};

vi.mock('../../services/adminApi', () => ({
  adminApi: mockAdminApi
}));

const mockListings = [
  {
    listingId: '1',
    title: 'Test Boat 1',
    ownerId: 'owner1',
    ownerName: 'John Doe',
    ownerEmail: 'john@example.com',
    price: 50000,
    location: { city: 'Miami', state: 'FL' },
    images: ['image1.jpg'],
    status: 'pending',
    flags: [
      {
        id: 'flag1',
        type: 'inappropriate',
        reason: 'Inappropriate content',
        reportedBy: 'user1',
        reportedAt: '2024-01-01T10:00:00Z',
        severity: 'high'
      }
    ],
    flaggedAt: '2024-01-01T10:00:00Z'
  }
];

const mockStats = {
  totalFlagged: 10,
  pendingReview: 5,
  approvedToday: 3,
  rejectedToday: 2,
  averageReviewTime: 2.5
};

describe('useModerationQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminApi.getFlaggedListings.mockResolvedValue({ listings: mockListings });
    mockAdminApi.getModerationStats.mockResolvedValue(mockStats);
  });

  it('loads listings and stats on mount', async () => {
    const { result } = renderHook(() => useModerationQueue());

    expect(result.current.loading).toBe(true);
    expect(result.current.listings).toEqual([]);
    expect(result.current.stats).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.listings).toEqual(mockListings);
    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.error).toBeNull();
  });

  it('handles loading error', async () => {
    const errorMessage = 'Failed to load listings';
    mockAdminApi.getFlaggedListings.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useModerationQueue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.listings).toEqual([]);
  });

  it('refreshes listings', async () => {
    const { result } = renderHook(() => useModerationQueue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear the mock calls from initial load
    vi.clearAllMocks();
    mockAdminApi.getFlaggedListings.mockResolvedValue({ listings: mockListings });
    mockAdminApi.getModerationStats.mockResolvedValue(mockStats);

    await act(async () => {
      await result.current.refreshListings();
    });

    expect(mockAdminApi.getFlaggedListings).toHaveBeenCalledTimes(1);
    expect(mockAdminApi.getModerationStats).toHaveBeenCalledTimes(1);
  });

  it('moderates listing successfully', async () => {
    mockAdminApi.moderateListing.mockResolvedValue({});
    
    const { result } = renderHook(() => useModerationQueue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const decision = {
      action: 'approve' as const,
      reason: 'Looks good',
      notifyUser: true
    };

    await act(async () => {
      await result.current.moderateListing('1', decision);
    });

    expect(mockAdminApi.moderateListing).toHaveBeenCalledWith('1', decision);
    
    // Check that the listing status was updated locally
    const updatedListing = result.current.listings.find(l => l.listingId === '1');
    expect(updatedListing?.status).toBe('approved');
    expect(updatedListing?.reviewedAt).toBeDefined();
  });

  it('handles moderation error', async () => {
    const errorMessage = 'Failed to moderate listing';
    mockAdminApi.moderateListing.mockRejectedValue(new Error(errorMessage));
    
    const { result } = renderHook(() => useModerationQueue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const decision = {
      action: 'reject' as const,
      reason: 'Violates policy',
      notifyUser: true
    };

    await expect(
      act(async () => {
        await result.current.moderateListing('1', decision);
      })
    ).rejects.toThrow(errorMessage);
  });

  it('gets listing details', async () => {
    const detailedListing = { ...mockListings[0], additionalDetails: 'more info' };
    mockAdminApi.getListingDetails.mockResolvedValue(detailedListing);
    
    const { result } = renderHook(() => useModerationQueue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let details;
    await act(async () => {
      details = await result.current.getListingDetails('1');
    });

    expect(mockAdminApi.getListingDetails).toHaveBeenCalledWith('1');
    expect(details).toEqual(detailedListing);
  });

  it('handles listing details error gracefully', async () => {
    mockAdminApi.getListingDetails.mockRejectedValue(new Error('Not found'));
    
    const { result } = renderHook(() => useModerationQueue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let details;
    await act(async () => {
      details = await result.current.getListingDetails('1');
    });

    expect(details).toBeNull();
  });

  it('updates listing status correctly for different actions', async () => {
    mockAdminApi.moderateListing.mockResolvedValue({});
    
    const { result } = renderHook(() => useModerationQueue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Test reject action
    await act(async () => {
      await result.current.moderateListing('1', {
        action: 'reject',
        reason: 'Violates policy',
        notifyUser: true
      });
    });

    let updatedListing = result.current.listings.find(l => l.listingId === '1');
    expect(updatedListing?.status).toBe('rejected');

    // Test request_changes action
    await act(async () => {
      await result.current.moderateListing('1', {
        action: 'request_changes',
        reason: 'Needs modification',
        notifyUser: true
      });
    });

    updatedListing = result.current.listings.find(l => l.listingId === '1');
    expect(updatedListing?.status).toBe('under_review');
  });
});