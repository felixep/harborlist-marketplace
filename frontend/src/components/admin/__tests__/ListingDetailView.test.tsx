import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import ListingDetailView from '../ListingDetailView';
import { FlaggedListing, ModerationDecision } from '../../../types/admin';

const mockListing: FlaggedListing = {
  listingId: '1',
  title: 'Test Boat for Moderation',
  ownerId: 'owner1',
  ownerName: 'John Doe',
  ownerEmail: 'john@example.com',
  price: 50000,
  location: { city: 'Miami', state: 'FL' },
  images: ['image1.jpg', 'image2.jpg'],
  status: 'pending',
  flags: [
    {
      id: 'flag1',
      type: 'inappropriate',
      reason: 'Contains inappropriate language',
      reportedBy: 'user1@example.com',
      reportedAt: '2024-01-01T10:00:00Z',
      severity: 'high'
    },
    {
      id: 'flag2',
      type: 'fraud',
      reason: 'Suspected fraudulent listing',
      reportedBy: 'user2@example.com',
      reportedAt: '2024-01-01T11:00:00Z',
      severity: 'medium'
    }
  ],
  flaggedAt: '2024-01-01T10:00:00Z'
};

describe('ListingDetailView', () => {
  const mockOnModerate = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders listing details correctly', () => {
    render(
      <ListingDetailView
        listing={mockListing}
        onModerate={mockOnModerate}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Test Boat for Moderation')).toBeInTheDocument();
    expect(screen.getByText('$50,000')).toBeInTheDocument();
    expect(screen.getByText('Miami, FL')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('displays all flags with correct information', () => {
    render(
      <ListingDetailView
        listing={mockListing}
        onModerate={mockOnModerate}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('inappropriate')).toBeInTheDocument();
    expect(screen.getByText('fraud')).toBeInTheDocument();
    expect(screen.getByText('Contains inappropriate language')).toBeInTheDocument();
    expect(screen.getByText('Suspected fraudulent listing')).toBeInTheDocument();
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText('user2@example.com')).toBeInTheDocument();
  });

  it('displays images with navigation', () => {
    render(
      <ListingDetailView
        listing={mockListing}
        onModerate={mockOnModerate}
        onClose={mockOnClose}
      />
    );

    const mainImage = screen.getByAltText('Listing image 1');
    expect(mainImage).toBeInTheDocument();
    expect(mainImage).toHaveAttribute('src', 'image1.jpg');

    // Check thumbnail navigation
    const thumbnails = screen.getAllByRole('button');
    const imageThumbnails = thumbnails.filter(btn => 
      btn.querySelector('img[alt*="Thumbnail"]')
    );
    expect(imageThumbnails).toHaveLength(2);
  });

  it('allows image navigation', () => {
    render(
      <ListingDetailView
        listing={mockListing}
        onModerate={mockOnModerate}
        onClose={mockOnClose}
      />
    );

    const nextButton = screen.getByRole('button', { name: /next/i }) || 
                      screen.getAllByRole('button').find(btn => 
                        btn.querySelector('svg path[d*="M9 5l7 7-7 7"]')
                      );
    
    if (nextButton) {
      fireEvent.click(nextButton);
      const mainImage = screen.getByAltText('Listing image 2');
      expect(mainImage).toHaveAttribute('src', 'image2.jpg');
    }
  });

  it('handles moderation form submission', async () => {
    render(
      <ListingDetailView
        listing={mockListing}
        onModerate={mockOnModerate}
        onClose={mockOnClose}
      />
    );

    // Select reject action
    const rejectRadio = screen.getByDisplayValue('reject');
    fireEvent.click(rejectRadio);

    // Fill in reason
    const reasonTextarea = screen.getByPlaceholderText('Explain your decision...');
    fireEvent.change(reasonTextarea, { target: { value: 'Violates community guidelines' } });

    // Fill in notes
    const notesTextarea = screen.getByPlaceholderText('Internal notes for other moderators...');
    fireEvent.change(notesTextarea, { target: { value: 'Reviewed thoroughly' } });

    // Uncheck notify user
    const notifyCheckbox = screen.getByRole('checkbox');
    fireEvent.click(notifyCheckbox);

    // Submit form
    const submitButton = screen.getByText('Submit Decision');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnModerate).toHaveBeenCalledWith({
        action: 'reject',
        reason: 'Violates community guidelines',
        notes: 'Reviewed thoroughly',
        notifyUser: false
      });
    });
  });

  it('validates required reason field', async () => {
    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <ListingDetailView
        listing={mockListing}
        onModerate={mockOnModerate}
        onClose={mockOnClose}
      />
    );

    // Try to submit without reason
    const submitButton = screen.getByText('Submit Decision');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Please provide a reason for your decision.');
      expect(mockOnModerate).not.toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  it('handles close button click', () => {
    render(
      <ListingDetailView
        listing={mockListing}
        onModerate={mockOnModerate}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i }) ||
                       screen.getAllByRole('button').find(btn => 
                         btn.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]')
                       );
    
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('handles cancel button click', () => {
    render(
      <ListingDetailView
        listing={mockListing}
        onModerate={mockOnModerate}
        onClose={mockOnClose}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows loading state when processing', () => {
    render(
      <ListingDetailView
        listing={mockListing}
        onModerate={mockOnModerate}
        onClose={mockOnClose}
        loading={true}
      />
    );

    expect(screen.getByText('Processing...')).toBeInTheDocument();
    const submitButton = screen.getByText('Processing...');
    expect(submitButton).toBeDisabled();
  });

  it('displays flag severity with correct styling', () => {
    render(
      <ListingDetailView
        listing={mockListing}
        onModerate={mockOnModerate}
        onClose={mockOnClose}
      />
    );

    const highSeverityFlag = screen.getByText('high severity');
    const mediumSeverityFlag = screen.getByText('medium severity');
    
    expect(highSeverityFlag).toBeInTheDocument();
    expect(mediumSeverityFlag).toBeInTheDocument();
  });

  it('defaults to approve action', () => {
    render(
      <ListingDetailView
        listing={mockListing}
        onModerate={mockOnModerate}
        onClose={mockOnClose}
      />
    );

    const approveRadio = screen.getByDisplayValue('approve');
    expect(approveRadio).toBeChecked();
  });

  it('defaults notify user to checked', () => {
    render(
      <ListingDetailView
        listing={mockListing}
        onModerate={mockOnModerate}
        onClose={mockOnClose}
      />
    );

    const notifyCheckbox = screen.getByRole('checkbox');
    expect(notifyCheckbox).toBeChecked();
  });
});