import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import ListingModerationQueue from '../ListingModerationQueue';
import { FlaggedListing } from '../../../types/admin';

const mockListings: FlaggedListing[] = [
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
  },
  {
    listingId: '2',
    title: 'Test Boat 2',
    ownerId: 'owner2',
    ownerName: 'Jane Smith',
    ownerEmail: 'jane@example.com',
    price: 75000,
    location: { city: 'Tampa', state: 'FL' },
    images: ['image2.jpg'],
    status: 'under_review',
    flags: [
      {
        id: 'flag2',
        type: 'spam',
        reason: 'Spam listing',
        reportedBy: 'user2',
        reportedAt: '2024-01-02T10:00:00Z',
        severity: 'medium'
      }
    ],
    flaggedAt: '2024-01-02T10:00:00Z'
  }
];

describe('ListingModerationQueue', () => {
  const mockOnSelectListing = vi.fn();
  const mockOnQuickAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    render(
      <ListingModerationQueue
        listings={[]}
        onSelectListing={mockOnSelectListing}
        onQuickAction={mockOnQuickAction}
        loading={true}
      />
    );

    expect(screen.getByText('Moderation Queue')).toBeInTheDocument();
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders listings correctly', () => {
    render(
      <ListingModerationQueue
        listings={mockListings}
        onSelectListing={mockOnSelectListing}
        onQuickAction={mockOnQuickAction}
      />
    );

    expect(screen.getByText('Test Boat 1')).toBeInTheDocument();
    expect(screen.getByText('Test Boat 2')).toBeInTheDocument();
    expect(screen.getByText('Owner: John Doe')).toBeInTheDocument();
    expect(screen.getByText('Owner: Jane Smith')).toBeInTheDocument();
  });

  it('displays correct status badges', () => {
    render(
      <ListingModerationQueue
        listings={mockListings}
        onSelectListing={mockOnSelectListing}
        onQuickAction={mockOnQuickAction}
      />
    );

    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('under review')).toBeInTheDocument();
  });

  it('displays severity badges correctly', () => {
    render(
      <ListingModerationQueue
        listings={mockListings}
        onSelectListing={mockOnSelectListing}
        onQuickAction={mockOnQuickAction}
      />
    );

    expect(screen.getByText('high priority')).toBeInTheDocument();
    expect(screen.getByText('medium priority')).toBeInTheDocument();
  });

  it('calls onSelectListing when listing is clicked', () => {
    render(
      <ListingModerationQueue
        listings={mockListings}
        onSelectListing={mockOnSelectListing}
        onQuickAction={mockOnQuickAction}
      />
    );

    fireEvent.click(screen.getByText('Test Boat 1'));
    expect(mockOnSelectListing).toHaveBeenCalledWith(expect.objectContaining({
      listingId: '1',
      title: 'Test Boat 1'
    }));
  });

  it('calls onQuickAction for quick approve', () => {
    render(
      <ListingModerationQueue
        listings={mockListings}
        onSelectListing={mockOnSelectListing}
        onQuickAction={mockOnQuickAction}
      />
    );

    const approveButton = screen.getByText('Quick Approve');
    fireEvent.click(approveButton);
    
    expect(mockOnQuickAction).toHaveBeenCalledWith('1', 'approve');
  });

  it('calls onQuickAction for quick reject', () => {
    render(
      <ListingModerationQueue
        listings={mockListings}
        onSelectListing={mockOnSelectListing}
        onQuickAction={mockOnQuickAction}
      />
    );

    const rejectButton = screen.getByText('Quick Reject');
    fireEvent.click(rejectButton);
    
    expect(mockOnQuickAction).toHaveBeenCalledWith('1', 'reject');
  });

  it('filters listings by status', async () => {
    render(
      <ListingModerationQueue
        listings={mockListings}
        onSelectListing={mockOnSelectListing}
        onQuickAction={mockOnQuickAction}
      />
    );

    const statusFilter = screen.getByDisplayValue('All Status');
    fireEvent.change(statusFilter, { target: { value: 'pending' } });

    await waitFor(() => {
      expect(screen.getByText('Test Boat 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Boat 2')).not.toBeInTheDocument();
    });
  });

  it('filters listings by severity', async () => {
    render(
      <ListingModerationQueue
        listings={mockListings}
        onSelectListing={mockOnSelectListing}
        onQuickAction={mockOnQuickAction}
      />
    );

    const severityFilter = screen.getByDisplayValue('All Severity');
    fireEvent.change(severityFilter, { target: { value: 'high' } });

    await waitFor(() => {
      expect(screen.getByText('Test Boat 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Boat 2')).not.toBeInTheDocument();
    });
  });

  it('sorts listings correctly', async () => {
    render(
      <ListingModerationQueue
        listings={mockListings}
        onSelectListing={mockOnSelectListing}
        onQuickAction={mockOnQuickAction}
      />
    );

    const sortSelect = screen.getByDisplayValue('Newest First');
    fireEvent.change(sortSelect, { target: { value: 'flaggedAt-asc' } });

    // Check that the order has changed (oldest first)
    const listingTitles = screen.getAllByText(/Test Boat/);
    expect(listingTitles[0]).toHaveTextContent('Test Boat 1');
    expect(listingTitles[1]).toHaveTextContent('Test Boat 2');
  });

  it('displays empty state when no listings match filters', () => {
    render(
      <ListingModerationQueue
        listings={[]}
        onSelectListing={mockOnSelectListing}
        onQuickAction={mockOnQuickAction}
      />
    );

    expect(screen.getByText('No listings match the current filters.')).toBeInTheDocument();
  });

  it('displays flag information correctly', () => {
    render(
      <ListingModerationQueue
        listings={mockListings}
        onSelectListing={mockOnSelectListing}
        onQuickAction={mockOnQuickAction}
      />
    );

    expect(screen.getByText('inappropriate: Inappropriate content')).toBeInTheDocument();
    expect(screen.getByText('spam: Spam listing')).toBeInTheDocument();
  });

  it('shows quick action buttons only for pending listings', () => {
    render(
      <ListingModerationQueue
        listings={mockListings}
        onSelectListing={mockOnSelectListing}
        onQuickAction={mockOnQuickAction}
      />
    );

    // Should show quick actions for pending listing
    expect(screen.getByText('Quick Approve')).toBeInTheDocument();
    expect(screen.getByText('Quick Reject')).toBeInTheDocument();
    
    // Should not show quick actions for under_review listing
    const quickButtons = screen.getAllByText(/Quick/);
    expect(quickButtons).toHaveLength(2); // Only for the pending listing
  });
});