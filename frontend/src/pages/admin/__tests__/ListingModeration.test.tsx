import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import ListingModeration from '../ListingModeration';

// Mock the adminApi
const mockAdminApi = {
  getFlaggedListings: vi.fn(),
  getModerationStats: vi.fn(),
  moderateListing: vi.fn(),
  getListingDetails: vi.fn()
};

vi.mock('../../../services/adminApi', () => ({
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

describe('ListingModeration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminApi.getFlaggedListings.mockResolvedValue({ listings: mockListings });
    mockAdminApi.getModerationStats.mockResolvedValue(mockStats);
    mockAdminApi.getListingDetails.mockResolvedValue(mockListings[0]);
    mockAdminApi.moderateListing.mockResolvedValue({});
  });

  it('renders page title and refresh button', async () => {
    render(<ListingModeration />);

    expect(screen.getByText('Listing Moderation')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Refreshing...')).not.toBeInTheDocument();
    });
  });

  it('displays moderation stats', async () => {
    render(<ListingModeration />);

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // totalFlagged
      expect(screen.getByText('5')).toBeInTheDocument(); // pendingReview
      expect(screen.getByText('3')).toBeInTheDocument(); // approvedToday
      expect(screen.getByText('2')).toBeInTheDocument(); // rejectedToday
      expect(screen.getByText('2.5h')).toBeInTheDocument(); // averageReviewTime
    });

    expect(screen.getByText('Total Flagged')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText('Approved Today')).toBeInTheDocument();
    expect(screen.getByText('Rejected Today')).toBeInTheDocument();
    expect(screen.getByText('Avg Review Time')).toBeInTheDocument();
  });

  it('displays listings in moderation queue', async () => {
    render(<ListingModeration />);

    await waitFor(() => {
      expect(screen.getByText('Test Boat 1')).toBeInTheDocument();
      expect(screen.getByText('Owner: John Doe')).toBeInTheDocument();
      expect(screen.getByText('$50,000')).toBeInTheDocument();
    });
  });

  it('handles quick approve action', async () => {
    render(<ListingModeration />);

    await waitFor(() => {
      expect(screen.getByText('Test Boat 1')).toBeInTheDocument();
    });

    const quickApproveButton = screen.getByText('Quick Approve');
    fireEvent.click(quickApproveButton);

    await waitFor(() => {
      expect(mockAdminApi.moderateListing).toHaveBeenCalledWith('1', {
        action: 'approve',
        reason: 'Quick approval - no issues found',
        notifyUser: true
      });
    });
  });

  it('handles quick reject action', async () => {
    render(<ListingModeration />);

    await waitFor(() => {
      expect(screen.getByText('Test Boat 1')).toBeInTheDocument();
    });

    const quickRejectButton = screen.getByText('Quick Reject');
    fireEvent.click(quickRejectButton);

    await waitFor(() => {
      expect(mockAdminApi.moderateListing).toHaveBeenCalledWith('1', {
        action: 'reject',
        reason: 'Quick rejection - violates platform policies',
        notifyUser: true
      });
    });
  });

  it('opens listing detail view when listing is clicked', async () => {
    render(<ListingModeration />);

    await waitFor(() => {
      expect(screen.getByText('Test Boat 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test Boat 1'));

    await waitFor(() => {
      expect(screen.getByText('Listing Moderation Review')).toBeInTheDocument();
      expect(mockAdminApi.getListingDetails).toHaveBeenCalledWith('1');
    });
  });

  it('handles moderation from detail view', async () => {
    render(<ListingModeration />);

    await waitFor(() => {
      expect(screen.getByText('Test Boat 1')).toBeInTheDocument();
    });

    // Open detail view
    fireEvent.click(screen.getByText('Test Boat 1'));

    await waitFor(() => {
      expect(screen.getByText('Listing Moderation Review')).toBeInTheDocument();
    });

    // Fill out moderation form
    const reasonTextarea = screen.getByPlaceholderText('Explain your decision...');
    fireEvent.change(reasonTextarea, { target: { value: 'Listing approved after review' } });

    // Submit decision
    const submitButton = screen.getByText('Submit Decision');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAdminApi.moderateListing).toHaveBeenCalledWith('1', {
        action: 'approve',
        reason: 'Listing approved after review',
        notifyUser: true
      });
    });
  });

  it('displays error state when API fails', async () => {
    mockAdminApi.getFlaggedListings.mockRejectedValue(new Error('API Error'));

    render(<ListingModeration />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Moderation Queue')).toBeInTheDocument();
      expect(screen.getByText('API Error')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('handles refresh button click', async () => {
    render(<ListingModeration />);

    await waitFor(() => {
      expect(screen.getByText('Test Boat 1')).toBeInTheDocument();
    });

    // Clear previous calls
    vi.clearAllMocks();
    mockAdminApi.getFlaggedListings.mockResolvedValue({ listings: mockListings });
    mockAdminApi.getModerationStats.mockResolvedValue(mockStats);

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(screen.getByText('Refreshing...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockAdminApi.getFlaggedListings).toHaveBeenCalled();
      expect(mockAdminApi.getModerationStats).toHaveBeenCalled();
    });
  });

  it('shows success notification after successful moderation', async () => {
    render(<ListingModeration />);

    await waitFor(() => {
      expect(screen.getByText('Test Boat 1')).toBeInTheDocument();
    });

    const quickApproveButton = screen.getByText('Quick Approve');
    fireEvent.click(quickApproveButton);

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Listing approved successfully')).toBeInTheDocument();
    });
  });

  it('shows error notification when moderation fails', async () => {
    mockAdminApi.moderateListing.mockRejectedValue(new Error('Moderation failed'));

    render(<ListingModeration />);

    await waitFor(() => {
      expect(screen.getByText('Test Boat 1')).toBeInTheDocument();
    });

    const quickApproveButton = screen.getByText('Quick Approve');
    fireEvent.click(quickApproveButton);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Moderation failed')).toBeInTheDocument();
    });
  });

  it('closes detail view when close button is clicked', async () => {
    render(<ListingModeration />);

    await waitFor(() => {
      expect(screen.getByText('Test Boat 1')).toBeInTheDocument();
    });

    // Open detail view
    fireEvent.click(screen.getByText('Test Boat 1'));

    await waitFor(() => {
      expect(screen.getByText('Listing Moderation Review')).toBeInTheDocument();
    });

    // Close detail view
    const closeButton = screen.getByText('Cancel');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Listing Moderation Review')).not.toBeInTheDocument();
    });
  });
});