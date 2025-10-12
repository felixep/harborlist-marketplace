import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ListingModerationQueue from '../ListingModerationQueue';
import { FlaggedListing, AdminUser } from '@harborlist/shared-types';

// Mock data
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
        severity: 'high',
        status: 'pending'
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
        severity: 'medium',
        status: 'pending'
      }
    ],
    flaggedAt: '2024-01-02T10:00:00Z',
    reviewedBy: 'mod1'
  }
];

const mockModerators: AdminUser[] = [
  {
    id: 'mod1',
    email: 'mod1@example.com',
    name: 'Moderator One',
    role: 'moderator' as any,
    status: 'active' as any,
    permissions: [],
    emailVerified: true,
    phoneVerified: false,
    mfaEnabled: false,
    loginAttempts: 0,
    sessionTimeout: 60,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'mod2',
    email: 'mod2@example.com',
    name: 'Moderator Two',
    role: 'moderator' as any,
    status: 'active' as any,
    permissions: [],
    emailVerified: true,
    phoneVerified: false,
    mfaEnabled: false,
    loginAttempts: 0,
    sessionTimeout: 60,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockNotifications = [
  {
    id: 'notif1',
    type: 'new_flagged' as const,
    title: 'New Flagged Listing',
    message: 'A new listing has been flagged for review',
    timestamp: '2024-01-01T10:00:00Z',
    priority: 'medium' as const,
    read: false,
    actionRequired: true,
    relatedListingId: '1'
  }
];

const mockAutomation = {
  enabled: true,
  rules: [
    {
      id: 'rule1',
      name: 'High Priority Auto-Assign',
      enabled: true,
      conditions: {
        severity: ['high'],
        reportCount: 2
      },
      actions: {
        autoAssign: true,
        priorityBoost: false,
        escalate: false
      }
    }
  ]
};

const defaultProps = {
  listings: mockListings,
  onSelectListing: vi.fn(),
  onQuickAction: vi.fn(),
  onBulkAction: vi.fn(),
  onAssignModerator: vi.fn(),
  onEscalate: vi.fn(),
  onPriorityChange: vi.fn(),
  onRefresh: vi.fn(),
  onDismissNotification: vi.fn(),
  moderators: mockModerators,
  loading: false,
  realTimeEnabled: true,
  notifications: mockNotifications,
  workflowAutomation: mockAutomation
};

describe('ListingModerationQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the moderation queue with listings', () => {
    render(<ListingModerationQueue {...defaultProps} />);
    
    expect(screen.getByText('Moderation Queue (2)')).toBeInTheDocument();
    expect(screen.getByText('Test Boat 1')).toBeInTheDocument();
    expect(screen.getByText('Test Boat 2')).toBeInTheDocument();
  });

  it('displays loading state correctly', () => {
    render(<ListingModerationQueue {...defaultProps} loading={true} />);
    
    expect(screen.getByText('Moderation Queue')).toBeInTheDocument();
    // Loading skeleton should be present
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('handles listing selection', () => {
    const onSelectListing = vi.fn();
    render(<ListingModerationQueue {...defaultProps} onSelectListing={onSelectListing} />);
    
    fireEvent.click(screen.getByText('Test Boat 1'));
    expect(onSelectListing).toHaveBeenCalledWith(mockListings[0]);
  });

  it('handles quick actions', () => {
    const onQuickAction = vi.fn();
    render(<ListingModerationQueue {...defaultProps} onQuickAction={onQuickAction} />);
    
    const approveButton = screen.getByText('Quick Approve');
    fireEvent.click(approveButton);
    
    expect(onQuickAction).toHaveBeenCalledWith('1', 'approve');
  });

  it('filters listings by status', () => {
    render(<ListingModerationQueue {...defaultProps} />);
    
    const statusFilter = screen.getByDisplayValue('All Status');
    fireEvent.change(statusFilter, { target: { value: 'pending' } });
    
    // Should show only pending listings
    expect(screen.getByText('Test Boat 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Boat 2')).not.toBeInTheDocument();
  });

  it('filters listings by priority', () => {
    render(<ListingModerationQueue {...defaultProps} />);
    
    const priorityFilter = screen.getByDisplayValue('All Priority');
    fireEvent.change(priorityFilter, { target: { value: 'high' } });
    
    // Should show only high priority listings
    expect(screen.getByText('Test Boat 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Boat 2')).not.toBeInTheDocument();
  });

  it('filters listings by assignee', () => {
    render(<ListingModerationQueue {...defaultProps} />);
    
    const assigneeFilter = screen.getByDisplayValue('All Assignees');
    fireEvent.change(assigneeFilter, { target: { value: 'unassigned' } });
    
    // Should show only unassigned listings
    expect(screen.getByText('Test Boat 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Boat 2')).not.toBeInTheDocument();
  });

  it('handles bulk selection', async () => {
    render(<ListingModerationQueue {...defaultProps} />);
    
    // Find the select all checkbox by its attributes
    const selectAllCheckbox = document.querySelector('input[type="checkbox"]');
    if (selectAllCheckbox) {
      fireEvent.click(selectAllCheckbox);
      
      // Wait for bulk actions to appear
      await waitFor(() => {
        expect(screen.getByText('2 items selected')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    }
  });

  it('handles bulk actions', async () => {
    const onBulkAction = vi.fn();
    render(<ListingModerationQueue {...defaultProps} onBulkAction={onBulkAction} />);
    
    // Find the select all checkbox by its attributes
    const selectAllCheckbox = document.querySelector('input[type="checkbox"]');
    if (selectAllCheckbox) {
      fireEvent.click(selectAllCheckbox);
      
      // Wait for bulk actions to appear
      await waitFor(() => {
        expect(screen.getByText('2 items selected')).toBeInTheDocument();
      });
      
      // Click bulk approve
      const bulkApproveButton = screen.getByText('Approve');
      fireEvent.click(bulkApproveButton);
      
      expect(onBulkAction).toHaveBeenCalledWith(['1', '2'], 'approve');
    }
  });

  it('handles moderator assignment', async () => {
    const onAssignModerator = vi.fn();
    render(<ListingModerationQueue {...defaultProps} onAssignModerator={onAssignModerator} />);
    
    // Find the select all checkbox by its attributes
    const selectAllCheckbox = document.querySelector('input[type="checkbox"]');
    if (selectAllCheckbox) {
      fireEvent.click(selectAllCheckbox);
      
      // Wait for bulk actions to appear
      await waitFor(() => {
        expect(screen.getByText('2 items selected')).toBeInTheDocument();
      });
      
      // Select moderator
      const assignSelect = screen.getByDisplayValue('Select moderator...');
      fireEvent.change(assignSelect, { target: { value: 'mod1' } });
      
      // Click assign button
      const assignButton = screen.getByText('Assign');
      fireEvent.click(assignButton);
      
      expect(onAssignModerator).toHaveBeenCalledWith(['1', '2'], 'mod1');
    }
  });

  it('sorts listings correctly', () => {
    render(<ListingModerationQueue {...defaultProps} />);
    
    const sortSelect = screen.getByDisplayValue('Newest First');
    fireEvent.change(sortSelect, { target: { value: 'priority-desc' } });
    
    // High priority listing should appear first
    const listingTitles = screen.getAllByRole('heading', { level: 3 });
    expect(listingTitles[0]).toHaveTextContent('Test Boat 1');
  });

  it('displays auto-refresh functionality', () => {
    render(<ListingModerationQueue {...defaultProps} />);
    
    const autoRefreshCheckbox = screen.getByLabelText('Auto-refresh');
    expect(autoRefreshCheckbox).toBeInTheDocument();
    expect(autoRefreshCheckbox).toBeChecked();
    
    // Should show last updated time
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('shows empty state when no listings match filters', () => {
    render(<ListingModerationQueue {...defaultProps} listings={[]} />);
    
    expect(screen.getByText('No listings match the current filters.')).toBeInTheDocument();
  });

  it('displays listing information correctly', () => {
    render(<ListingModerationQueue {...defaultProps} />);
    
    // Check listing details
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('$50,000')).toBeInTheDocument();
    expect(screen.getByText('Miami, FL')).toBeInTheDocument();
    expect(screen.getByText('high priority')).toBeInTheDocument();
    expect(screen.getByText('inappropriate: Inappropriate content')).toBeInTheDocument();
  });

  it('handles individual listing selection for bulk actions', async () => {
    render(<ListingModerationQueue {...defaultProps} />);
    
    // Find and click individual checkboxes (skip the first one which is select all)
    const checkboxes = screen.getAllByRole('checkbox');
    const listingCheckbox = checkboxes[1]; // Second checkbox should be for individual listing
    
    if (listingCheckbox) {
      fireEvent.click(listingCheckbox);
      
      // Wait for bulk actions to appear
      await waitFor(() => {
        expect(screen.getByText('1 item selected')).toBeInTheDocument();
      });
    }
  });

  it('clears selections when clear button is clicked', async () => {
    render(<ListingModerationQueue {...defaultProps} />);
    
    // Select all items using checkbox input directly
    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheckbox = checkboxes.find(cb => cb.nextElementSibling?.textContent === 'Select All');
    if (selectAllCheckbox) {
      fireEvent.click(selectAllCheckbox);
      
      // Wait for bulk actions to appear
      await waitFor(() => {
        expect(screen.getByText('2 items selected')).toBeInTheDocument();
      });
      
      // Click clear button
      const clearButton = screen.getByText('Clear Selection');
      fireEvent.click(clearButton);
      
      // Bulk actions bar should disappear
      expect(screen.queryByText('2 items selected')).not.toBeInTheDocument();
    }
  });

  it('displays real-time connection status', () => {
    render(<ListingModerationQueue {...defaultProps} realTimeEnabled={true} />);
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(document.querySelector('.bg-green-500')).toBeInTheDocument();
  });

  it('shows notifications panel with unread count', () => {
    render(<ListingModerationQueue {...defaultProps} />);
    
    // Should show notification badge with count - use more specific selector
    const notificationBadge = document.querySelector('.bg-red-500.text-white');
    expect(notificationBadge).toBeInTheDocument();
    expect(notificationBadge).toHaveTextContent('1');
    
    // Click notification button to open panel
    const notificationButton = document.querySelector('button[class*="relative p-2"]');
    if (notificationButton) {
      fireEvent.click(notificationButton);
      expect(screen.getByText('New Flagged Listing')).toBeInTheDocument();
    }
  });

  it('handles notification dismissal', () => {
    const onDismissNotification = vi.fn();
    render(<ListingModerationQueue {...defaultProps} onDismissNotification={onDismissNotification} />);
    
    // Open notifications panel
    const notificationButton = document.querySelector('button[class*="relative p-2"]');
    if (notificationButton) {
      fireEvent.click(notificationButton);
      
      // Wait for panel to open and find dismiss button more specifically
      waitFor(() => {
        const dismissButtons = document.querySelectorAll('button');
        const dismissButton = Array.from(dismissButtons).find(btn => 
          btn.querySelector('svg[viewBox="0 0 24 24"]') && 
          btn.closest('.p-3')
        );
        if (dismissButton) {
          fireEvent.click(dismissButton);
          expect(onDismissNotification).toHaveBeenCalledWith('notif1');
        }
      });
    }
  });

  it('displays workflow automation panel', () => {
    render(<ListingModerationQueue {...defaultProps} />);
    
    // Should show automation button with rule count
    expect(screen.getByText('Automation (1)')).toBeInTheDocument();
    
    // Click to open automation panel
    const automationButton = screen.getByText('Automation (1)');
    fireEvent.click(automationButton);
    
    expect(screen.getByText('Workflow Automation')).toBeInTheDocument();
    expect(screen.getByText('High Priority Auto-Assign')).toBeInTheDocument();
  });

  it('handles bulk escalation', async () => {
    const onEscalate = vi.fn();
    render(<ListingModerationQueue {...defaultProps} onEscalate={onEscalate} />);
    
    // Select items using checkbox input directly
    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheckbox = checkboxes.find(cb => cb.nextElementSibling?.textContent === 'Select All');
    if (selectAllCheckbox) {
      fireEvent.click(selectAllCheckbox);
      
      // Wait for bulk actions to appear
      await waitFor(() => {
        expect(screen.getByText('2 items selected')).toBeInTheDocument();
      });
      
      // Enter escalation reason
      const reasonInput = screen.getByPlaceholderText('Escalation reason...');
      fireEvent.change(reasonInput, { target: { value: 'Urgent review needed' } });
      
      // Click escalate button
      const escalateButton = screen.getByText('Escalate');
      fireEvent.click(escalateButton);
      
      expect(onEscalate).toHaveBeenCalledWith(expect.arrayContaining(['1', '2']), 'Urgent review needed');
    }
  });

  it('handles bulk priority change', async () => {
    const onPriorityChange = vi.fn();
    render(<ListingModerationQueue {...defaultProps} onPriorityChange={onPriorityChange} />);
    
    // Select items using checkbox input directly
    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheckbox = checkboxes.find(cb => cb.nextElementSibling?.textContent === 'Select All');
    if (selectAllCheckbox) {
      fireEvent.click(selectAllCheckbox);
      
      // Wait for bulk actions to appear
      await waitFor(() => {
        expect(screen.getByText('2 items selected')).toBeInTheDocument();
      });
      
      // Change priority
      const prioritySelect = screen.getByDisplayValue('Medium Priority');
      fireEvent.change(prioritySelect, { target: { value: 'high' } });
      
      // Click set priority button
      const setPriorityButton = screen.getByText('Set Priority');
      fireEvent.click(setPriorityButton);
      
      expect(onPriorityChange).toHaveBeenCalledWith(expect.arrayContaining(['1', '2']), 'high');
    }
  });

  it('shows SLA status indicators', () => {
    // Create a listing that's been in queue for over 24 hours
    const oldListing = {
      ...mockListings[0],
      flaggedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
    };
    
    render(<ListingModerationQueue {...defaultProps} listings={[oldListing]} />);
    
    expect(screen.getByText('SLA Breach')).toBeInTheDocument();
  });

  it('shows automation eligibility indicators', () => {
    render(<ListingModerationQueue {...defaultProps} />);
    
    // The first listing has high severity and should show auto-eligible
    expect(screen.getByText('Auto-eligible')).toBeInTheDocument();
  });

  it('handles refresh interval changes', () => {
    render(<ListingModerationQueue {...defaultProps} />);
    
    const intervalSelect = screen.getByDisplayValue('30s');
    fireEvent.change(intervalSelect, { target: { value: '60' } });
    
    expect(intervalSelect).toHaveValue('60');
  });

  it('disables refresh interval when auto-refresh is off', () => {
    render(<ListingModerationQueue {...defaultProps} />);
    
    const autoRefreshCheckbox = screen.getByLabelText('Auto-refresh');
    fireEvent.click(autoRefreshCheckbox); // Turn off auto-refresh
    
    const intervalSelect = screen.getByDisplayValue('30s');
    expect(intervalSelect).toBeDisabled();
  });
});