import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TicketTable } from '../TicketTable';
import { SupportTicket } from '@harborlist/shared-types';

const mockTickets: SupportTicket[] = [
  {
    id: 'ticket-1',
    ticketNumber: 'T-2024-001',
    subject: 'Unable to upload boat images',
    description: 'Having trouble uploading images for my boat listing',
    status: 'open',
    priority: 'medium',
    category: 'technical',
    userId: 'user-1',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    assignedTo: null,
    assignedToName: null,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z',
    tags: ['upload', 'images'],
    attachments: [],
    responses: [],
    escalated: false
  },
  {
    id: 'ticket-2',
    ticketNumber: 'T-2024-002',
    subject: 'Payment processing issue',
    description: 'Payment was charged but listing not upgraded',
    status: 'in_progress',
    priority: 'high',
    category: 'billing',
    userId: 'user-2',
    userName: 'Jane Smith',
    userEmail: 'jane@example.com',
    assignedTo: 'admin-1',
    assignedToName: 'Admin User',
    createdAt: '2024-01-14T15:30:00Z',
    updatedAt: '2024-01-15T09:00:00Z',
    tags: ['payment', 'premium'],
    attachments: [],
    responses: [],
    escalated: true,
    escalatedAt: '2024-01-15T08:00:00Z',
    escalationReason: 'Customer is frustrated'
  }
];

describe('TicketTable', () => {
  const mockOnTicketSelect = vi.fn();
  const mockOnTicketAssign = vi.fn();
  const mockOnTicketUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tickets correctly', () => {
    render(
      <TicketTable
        tickets={mockTickets}
        onTicketSelect={mockOnTicketSelect}
        onTicketAssign={mockOnTicketAssign}
        onTicketUpdate={mockOnTicketUpdate}
      />
    );

    expect(screen.getByText('#T-2024-001')).toBeInTheDocument();
    expect(screen.getByText('#T-2024-002')).toBeInTheDocument();
    expect(screen.getByText('Unable to upload boat images')).toBeInTheDocument();
    expect(screen.getByText('Payment processing issue')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('shows correct priority and status badges', () => {
    render(
      <TicketTable
        tickets={mockTickets}
        onTicketSelect={mockOnTicketSelect}
        onTicketAssign={mockOnTicketAssign}
        onTicketUpdate={mockOnTicketUpdate}
      />
    );

    // Check that select elements are rendered
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
    
    // Check that options exist
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('shows escalated badge for escalated tickets', () => {
    render(
      <TicketTable
        tickets={mockTickets}
        onTicketSelect={mockOnTicketSelect}
        onTicketAssign={mockOnTicketAssign}
        onTicketUpdate={mockOnTicketUpdate}
      />
    );

    expect(screen.getByText('Escalated')).toBeInTheDocument();
  });

  it('shows assigned user or assign button', () => {
    render(
      <TicketTable
        tickets={mockTickets}
        onTicketSelect={mockOnTicketSelect}
        onTicketAssign={mockOnTicketAssign}
        onTicketUpdate={mockOnTicketUpdate}
      />
    );

    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Assign')).toBeInTheDocument();
  });

  it('calls onTicketSelect when ticket number is clicked', () => {
    render(
      <TicketTable
        tickets={mockTickets}
        onTicketSelect={mockOnTicketSelect}
        onTicketAssign={mockOnTicketAssign}
        onTicketUpdate={mockOnTicketUpdate}
      />
    );

    fireEvent.click(screen.getByText('#T-2024-001'));
    expect(mockOnTicketSelect).toHaveBeenCalledWith(mockTickets[0]);
  });

  it('calls onTicketSelect when View button is clicked', () => {
    render(
      <TicketTable
        tickets={mockTickets}
        onTicketSelect={mockOnTicketSelect}
        onTicketAssign={mockOnTicketAssign}
        onTicketUpdate={mockOnTicketUpdate}
      />
    );

    const viewButtons = screen.getAllByText('View');
    fireEvent.click(viewButtons[0]);
    expect(mockOnTicketSelect).toHaveBeenCalledWith(mockTickets[0]);
  });

  it('calls onTicketUpdate when status is changed', () => {
    render(
      <TicketTable
        tickets={mockTickets}
        onTicketSelect={mockOnTicketSelect}
        onTicketAssign={mockOnTicketAssign}
        onTicketUpdate={mockOnTicketUpdate}
      />
    );

    const statusSelects = screen.getAllByRole('combobox');
    const statusSelect = statusSelects.find(select => 
      select.querySelector('option[value="open"]')?.selected
    );
    
    if (statusSelect) {
      fireEvent.change(statusSelect, { target: { value: 'resolved' } });
      expect(mockOnTicketUpdate).toHaveBeenCalledWith('ticket-1', { status: 'resolved' });
    }
  });

  it('calls onTicketUpdate when priority is changed', () => {
    render(
      <TicketTable
        tickets={mockTickets}
        onTicketSelect={mockOnTicketSelect}
        onTicketAssign={mockOnTicketAssign}
        onTicketUpdate={mockOnTicketUpdate}
      />
    );

    const prioritySelects = screen.getAllByRole('combobox');
    const prioritySelect = prioritySelects.find(select => 
      select.querySelector('option[value="medium"]')?.selected
    );
    
    if (prioritySelect) {
      fireEvent.change(prioritySelect, { target: { value: 'high' } });
      expect(mockOnTicketUpdate).toHaveBeenCalledWith('ticket-1', { priority: 'high' });
    }
  });

  it('handles assignment when Assign button is clicked', () => {
    // Mock window.prompt
    const mockPrompt = vi.spyOn(window, 'prompt').mockReturnValue('admin-2');

    render(
      <TicketTable
        tickets={mockTickets}
        onTicketSelect={mockOnTicketSelect}
        onTicketAssign={mockOnTicketAssign}
        onTicketUpdate={mockOnTicketUpdate}
      />
    );

    fireEvent.click(screen.getByText('Assign'));
    expect(mockPrompt).toHaveBeenCalledWith('Enter admin ID to assign to:');
    expect(mockOnTicketAssign).toHaveBeenCalledWith('ticket-1', 'admin-2');

    mockPrompt.mockRestore();
  });

  it('does not assign when prompt is cancelled', () => {
    // Mock window.prompt to return null (cancelled)
    const mockPrompt = vi.spyOn(window, 'prompt').mockReturnValue(null);

    render(
      <TicketTable
        tickets={mockTickets}
        onTicketSelect={mockOnTicketSelect}
        onTicketAssign={mockOnTicketAssign}
        onTicketUpdate={mockOnTicketUpdate}
      />
    );

    fireEvent.click(screen.getByText('Assign'));
    expect(mockOnTicketAssign).not.toHaveBeenCalled();

    mockPrompt.mockRestore();
  });

  it('sorts tickets when column headers are clicked', () => {
    render(
      <TicketTable
        tickets={mockTickets}
        onTicketSelect={mockOnTicketSelect}
        onTicketAssign={mockOnTicketAssign}
        onTicketUpdate={mockOnTicketUpdate}
      />
    );

    // Click on ticket number header to sort
    fireEvent.click(screen.getByText('Ticket #'));
    
    // Check that sort indicator is shown
    expect(screen.getByText('↑')).toBeInTheDocument();

    // Click again to reverse sort
    fireEvent.click(screen.getByText('Ticket #'));
    expect(screen.getByText('↓')).toBeInTheDocument();
  });

  it('shows empty state when no tickets', () => {
    render(
      <TicketTable
        tickets={[]}
        onTicketSelect={mockOnTicketSelect}
        onTicketAssign={mockOnTicketAssign}
        onTicketUpdate={mockOnTicketUpdate}
      />
    );

    expect(screen.getByText('No support tickets found')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(
      <TicketTable
        tickets={mockTickets}
        onTicketSelect={mockOnTicketSelect}
        onTicketAssign={mockOnTicketAssign}
        onTicketUpdate={mockOnTicketUpdate}
      />
    );

    // Check that dates are formatted (exact format may vary based on locale)
    expect(screen.getByText(/Jan 15/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 14/)).toBeInTheDocument();
  });

  it('shows category information', () => {
    render(
      <TicketTable
        tickets={mockTickets}
        onTicketSelect={mockOnTicketSelect}
        onTicketAssign={mockOnTicketAssign}
        onTicketUpdate={mockOnTicketUpdate}
      />
    );

    expect(screen.getByText('technical')).toBeInTheDocument();
    expect(screen.getByText('billing')).toBeInTheDocument();
  });
});