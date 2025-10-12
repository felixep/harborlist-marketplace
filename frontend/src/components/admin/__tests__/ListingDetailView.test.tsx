import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ListingDetailView from '../ListingDetailView';
import { FlaggedListing, ModerationDecision } from '@harborlist/shared-types';

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
      reportedBy: 'user1',
      reportedAt: '2024-01-01T10:00:00Z',
      severity: 'high',
      status: 'pending'
    },
    {
      id: 'flag2',
      type: 'spam',
      reason: 'Suspected spam listing',
      reportedBy: 'user2',
      reportedAt: '2024-01-01T11:00:00Z',
      severity: 'medium',
      status: 'pending'
    }
  ],
  flaggedAt: '2024-01-01T10:00:00Z',
  description: 'This is a test boat listing description.'
};

const defaultProps = {
  listing: mockListing,
  onModerate: vi.fn(),
  onClose: vi.fn(),
  loading: false
};

describe('ListingDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the listing detail view', () => {
    render(<ListingDetailView {...defaultProps} />);
    
    expect(screen.getByText('Listing Moderation Review')).toBeInTheDocument();
    expect(screen.getByText('Test Boat for Moderation')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('displays listing status and priority correctly', () => {
    render(<ListingDetailView {...defaultProps} />);
    
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('HIGH PRIORITY')).toBeInTheDocument();
  });

  it('shows navigation tabs', () => {
    render(<ListingDetailView {...defaultProps} />);
    
    expect(screen.getByText('Listing Details')).toBeInTheDocument();
    expect(screen.getByText('Reported Issues (2)')).toBeInTheDocument();
    expect(screen.getByText('Moderation History')).toBeInTheDocument();
  });

  it('switches between tabs correctly', () => {
    render(<ListingDetailView {...defaultProps} />);
    
    // Click on flags tab
    fireEvent.click(screen.getByText('Reported Issues (2)'));
    expect(screen.getByText('Contains inappropriate language')).toBeInTheDocument();
    
    // Click on history tab
    fireEvent.click(screen.getByText('Moderation History'));
    expect(screen.getByText('No previous moderation history')).toBeInTheDocument();
  });

  it('displays image gallery correctly', () => {
    render(<ListingDetailView {...defaultProps} />);
    
    expect(screen.getByText('Images (2)')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    
    // Should have navigation buttons for multiple images
    const prevButton = screen.getByRole('button', { name: /previous/i });
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it('navigates through images', () => {
    render(<ListingDetailView {...defaultProps} />);
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('displays flags with correct severity and type', () => {
    render(<ListingDetailView {...defaultProps} />);
    
    // Switch to flags tab
    fireEvent.click(screen.getByText('Reported Issues (2)'));
    
    expect(screen.getByText('inappropriate')).toBeInTheDocument();
    expect(screen.getByText('spam')).toBeInTheDocument();
    expect(screen.getByText('High severity')).toBeInTheDocument();
    expect(screen.getByText('Medium severity')).toBeInTheDocument();
  });

  it('handles moderation decision selection', () => {
    render(<ListingDetailView {...defaultProps} />);
    
    const approveRadio = screen.getByLabelText(/Approve Listing/);
    const rejectRadio = screen.getByLabelText(/Reject Listing/);
    const changesRadio = screen.getByLabelText(/Request Changes/);
    
    expect(approveRadio).toBeInTheDocument();
    expect(rejectRadio).toBeInTheDocument();
    expect(changesRadio).toBeInTheDocument();
    
    // Approve should be selected by default
    expect(approveRadio).toBeChecked();
  });

  it('shows change request form when request changes is selected', () => {
    render(<ListingDetailView {...defaultProps} />);
    
    const changesRadio = screen.getByLabelText(/Request Changes/);
    fireEvent.click(changesRadio);
    
    expect(screen.getByText('Required Changes')).toBeInTheDocument();
    expect(screen.getByText('+ Add Change Request')).toBeInTheDocument();
  });

  it('handles adding change requests', () => {
    render(<ListingDetailView {...defaultProps} />);
    
    // Select request changes
    const changesRadio = screen.getByLabelText(/Request Changes/);
    fireEvent.click(changesRadio);
    
    // Click add change request
    fireEvent.click(screen.getByText('+ Add Change Request'));
    
    // Fill out the form
    const categorySelect = screen.getByDisplayValue('Title');
    const descriptionTextarea = screen.getByPlaceholderText('Describe what needs to be changed...');
    
    fireEvent.change(categorySelect, { target: { value: 'description' } });
    fireEvent.change(descriptionTextarea, { target: { value: 'Please improve the description' } });
    
    // Add the change request
    fireEvent.click(screen.getByText('Add'));
    
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Please improve the description')).toBeInTheDocument();
  });

  it('removes change requests', () => {
    render(<ListingDetailView {...defaultProps} />);
    
    // Select request changes and add a change request
    const changesRadio = screen.getByLabelText(/Request Changes/);
    fireEvent.click(changesRadio);
    fireEvent.click(screen.getByText('+ Add Change Request'));
    
    const descriptionTextarea = screen.getByPlaceholderText('Describe what needs to be changed...');
    fireEvent.change(descriptionTextarea, { target: { value: 'Test change request' } });
    fireEvent.click(screen.getByText('Add'));
    
    // Remove the change request
    const removeButton = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeButton);
    
    expect(screen.queryByText('Test change request')).not.toBeInTheDocument();
  });

  it('validates form submission', async () => {
    const onModerate = vi.fn();
    render(<ListingDetailView {...defaultProps} onModerate={onModerate} />);
    
    // Clear the reason field
    const reasonTextarea = screen.getByPlaceholderText('Explain your decision...');
    fireEvent.change(reasonTextarea, { target: { value: '' } });
    
    // Try to submit
    fireEvent.click(screen.getByText('Submit Decision'));
    
    // Should not call onModerate due to validation
    expect(onModerate).not.toHaveBeenCalled();
  });

  it('validates change requests when requesting changes', async () => {
    const onModerate = vi.fn();
    render(<ListingDetailView {...defaultProps} onModerate={onModerate} />);
    
    // Select request changes
    const changesRadio = screen.getByLabelText(/Request Changes/);
    fireEvent.click(changesRadio);
    
    // Fill reason but don't add change requests
    const reasonTextarea = screen.getByPlaceholderText('Explain your decision...');
    fireEvent.change(reasonTextarea, { target: { value: 'Changes needed' } });
    
    // Try to submit
    fireEvent.click(screen.getByText('Submit Decision'));
    
    // Should not call onModerate due to missing change requests
    expect(onModerate).not.toHaveBeenCalled();
  });

  it('submits moderation decision correctly', async () => {
    const onModerate = vi.fn();
    render(<ListingDetailView {...defaultProps} onModerate={onModerate} />);
    
    // Fill out the form
    const reasonTextarea = screen.getByPlaceholderText('Explain your decision...');
    const publicNotesTextarea = screen.getByPlaceholderText('Additional information for the listing owner...');
    const internalNotesTextarea = screen.getByPlaceholderText('Internal notes for other moderators...');
    const confidenceSelect = screen.getByDisplayValue('Medium - Standard review');
    
    fireEvent.change(reasonTextarea, { target: { value: 'Listing meets standards' } });
    fireEvent.change(publicNotesTextarea, { target: { value: 'Great listing!' } });
    fireEvent.change(internalNotesTextarea, { target: { value: 'No issues found' } });
    fireEvent.change(confidenceSelect, { target: { value: 'high' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit Decision'));
    
    expect(onModerate).toHaveBeenCalledWith({
      action: 'approve',
      reason: 'Listing meets standards',
      notes: 'No issues found',
      publicNotes: 'Great listing!',
      notifyUser: true,
      confidence: 'high'
    });
  });

  it('handles close button click', () => {
    const onClose = vi.fn();
    render(<ListingDetailView {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('shows loading state during submission', () => {
    render(<ListingDetailView {...defaultProps} loading={true} />);
    
    const submitButton = screen.getByText('Processing...');
    expect(submitButton).toBeDisabled();
  });

  it('displays review confidence options', () => {
    render(<ListingDetailView {...defaultProps} />);
    
    const confidenceSelect = screen.getByDisplayValue('Medium - Standard review');
    expect(confidenceSelect).toBeInTheDocument();
    
    fireEvent.click(confidenceSelect);
    expect(screen.getByText('Low - May need second opinion')).toBeInTheDocument();
    expect(screen.getByText('High - Very confident in decision')).toBeInTheDocument();
  });

  it('handles notification checkbox', () => {
    render(<ListingDetailView {...defaultProps} />);
    
    const notifyCheckbox = screen.getByLabelText('Send notification to listing owner');
    expect(notifyCheckbox).toBeChecked();
    
    fireEvent.click(notifyCheckbox);
    expect(notifyCheckbox).not.toBeChecked();
  });

  it('displays moderation history when available', () => {
    const listingWithHistory = {
      ...mockListing,
      reviewedAt: '2024-01-01T12:00:00Z',
      reviewedBy: 'moderator1',
      moderationNotes: 'Previously reviewed'
    };
    
    render(<ListingDetailView {...defaultProps} listing={listingWithHistory} />);
    
    // Switch to history tab
    fireEvent.click(screen.getByText('Moderation History'));
    
    expect(screen.getByText('Previous Review')).toBeInTheDocument();
    expect(screen.getByText('Reviewed by: moderator1')).toBeInTheDocument();
    expect(screen.getByText('Notes: Previously reviewed')).toBeInTheDocument();
  });
});