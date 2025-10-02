import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TicketDetailModal } from '../TicketDetailModal';
import { SupportTicket } from '../../../../types/admin';

const mockTicket: SupportTicket = {
  id: 'ticket-1',
  ticketNumber: 'T-2024-001',
  subject: 'Unable to upload boat images',
  description: 'I am having trouble uploading images for my boat listing. The upload fails every time.',
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
  responses: [
    {
      id: 'response-1',
      ticketId: 'ticket-1',
      message: 'Thank you for contacting support. We are looking into this issue.',
      isInternal: false,
      authorId: 'admin-1',
      authorName: 'Support Agent',
      authorType: 'admin',
      createdAt: '2024-01-15T11:00:00Z',
      attachments: [],
      readBy: []
    },
    {
      id: 'response-2',
      ticketId: 'ticket-1',
      message: 'Internal note: This seems to be related to the recent server update.',
      isInternal: true,
      authorId: 'admin-2',
      authorName: 'Tech Lead',
      authorType: 'admin',
      createdAt: '2024-01-15T11:30:00Z',
      attachments: [],
      readBy: []
    }
  ],
  escalated: false
};

describe('TicketDetailModal', () => {
  const mockOnClose = vi.fn();
  const mockOnUpdate = vi.fn();
  const mockOnResponse = vi.fn();
  const mockOnAssign = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ticket details correctly', () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onResponse={mockOnResponse}
        onAssign={mockOnAssign}
      />
    );

    expect(screen.getByText('Ticket #T-2024-001')).toBeInTheDocument();
    expect(screen.getByText('Unable to upload boat images')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('technical')).toBeInTheDocument();
  });

  it('shows ticket description in details tab', () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onResponse={mockOnResponse}
        onAssign={mockOnAssign}
      />
    );

    expect(screen.getByText(/I am having trouble uploading images/)).toBeInTheDocument();
  });

  it('shows tags when present', () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onResponse={mockOnResponse}
        onAssign={mockOnAssign}
      />
    );

    expect(screen.getByText('upload')).toBeInTheDocument();
    expect(screen.getByText('images')).toBeInTheDocument();
  });

  it('switches between tabs correctly', () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onResponse={mockOnResponse}
        onAssign={mockOnAssign}
      />
    );

    // Initially on details tab
    expect(screen.getByText(/I am having trouble uploading images/)).toBeInTheDocument();

    // Switch to responses tab
    fireEvent.click(screen.getByText('Responses'));
    expect(screen.getByText('Thank you for contacting support')).toBeInTheDocument();
    expect(screen.getByText('Internal note: This seems to be related')).toBeInTheDocument();

    // Switch to history tab
    fireEvent.click(screen.getByText('History'));
    expect(screen.getByText(/Created:/)).toBeInTheDocument();
    expect(screen.getByText(/Last Updated:/)).toBeInTheDocument();
  });

  it('shows internal responses with proper styling', () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onResponse={mockOnResponse}
        onAssign={mockOnAssign}
      />
    );

    fireEvent.click(screen.getByText('Responses'));
    
    // Check for internal note indicator
    expect(screen.getByText('Internal')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onResponse={mockOnResponse}
        onAssign={mockOnAssign}
      />
    );

    fireEvent.click(screen.getByLabelText('Close'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when Close button is clicked', () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onResponse={mockOnResponse}
        onAssign={mockOnAssign}
      />
    );

    fireEvent.click(screen.getByText('Close'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('updates status when status dropdown is changed', () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onResponse={mockOnResponse}
        onAssign={mockOnAssign}
      />
    );

    const statusSelects = screen.getAllByRole('combobox');
    const statusSelect = statusSelects.find(select => 
      select.querySelector('option[value="open"]')?.selected
    );

    if (statusSelect) {
      fireEvent.change(statusSelect, { target: { value: 'resolved' } });
      expect(mockOnUpdate).toHaveBeenCalledWith('ticket-1', {
        status: 'resolved',
        resolvedAt: expect.any(String)
      });
    }
  });

  it('updates priority when priority dropdown is changed', () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onResponse={mockOnResponse}
        onAssign={mockOnAssign}
      />
    );

    const prioritySelects = screen.getAllByRole('combobox');
    const prioritySelect = prioritySelects.find(select => 
      select.querySelector('option[value="medium"]')?.selected
    );

    if (prioritySelect) {
      fireEvent.change(prioritySelect, { target: { value: 'high' } });
      expect(mockOnUpdate).toHaveBeenCalledWith('ticket-1', { priority: 'high' });
    }
  });

  it('submits response when form is submitted', async () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onResponse={mockOnResponse}
        onAssign={mockOnAssign}
      />
    );

    const textarea = screen.getByPlaceholderText('Type your response...');
    const submitButton = screen.getByText('Send Response');

    fireEvent.change(textarea, { target: { value: 'This is a test response' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnResponse).toHaveBeenCalledWith('ticket-1', 'This is a test response', false);
    });
  });

  it('submits internal response when checkbox is checked', async () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onResponse={mockOnResponse}
        onAssign={mockOnAssign}
      />
    );

    const textarea = screen.getByPlaceholderText('Type your response...');
    const internalCheckbox = screen.getByLabelText('Internal note');
    const submitButton = screen.getByText('Send Response');

    fireEvent.change(textarea, { target: { value: 'Internal note content' } });
    fireEvent.click(internalCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnResponse).toHaveBeenCalledWith('ticket-1', 'Internal note content', true);
    });
  });

  it('shows escalation button for non-escalated tickets', () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onResponse={mockOnResponse}
        onAssign={mockOnAssign}
      />
    );

    expect(screen.getByText('Escalate')).toBeInTheDocument();
  });

  it('does not show escalation button for already escalated tickets', () => {
    const escalatedTicket = { ...mockTicket, escalated: true };
    
    render(
      <TicketDetailModal
        ticket={escalatedTicket}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onResponse={mockOnResponse}
        onAssign={mockOnAssign}
      />
    );

    expect(screen.queryByText('Escalate')).not.toBeInTheDocument();
    expect(screen.getByText('Escalated')).toBeInTheDocument();
  });

  it('shows escalation form when escalate button is clicked', () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onResponse={mockOnResponse}
        onAssign={mockOnAssign}
      />
    );

    fireEvent.click(screen.getByText('Escalate'));
    expect(screen.getByText('Escalate Ticket')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Reason for escalation...')).toBeInTheDocument();
  });

  it('submits escalation when form is submitted', async () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onResponse={mockOnResponse}
        onAssign={mockOnAssign}
      />
    );

    fireEvent.click(screen.getByText('Escalate'));
    
    const reasonTextarea = screen.getByPlaceholderText('Reason for escalation...');
    fireEvent.change(reasonTextarea, { target: { value: 'Customer is very frustrated' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Escalate' }));

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith('ticket-1', {
        escalated: true,
        escalatedAt: expect.any(String),
        escalationReason: 'Customer is very frustrated'
      });
    });
  });

  it('cancels escalation form', () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onResponse={mockOnResponse}
        onAssign={mockOnAssign}
      />
    );

    fireEvent.click(screen.getByText('Escalate'));
    expect(screen.getByText('Escalate Ticket')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Escalate Ticket')).not.toBeInTheDocument();
  });

  it('prevents empty response submission', () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onResponse={mockOnResponse}
        onAssign={mockOnAssign}
      />
    );

    const submitButton = screen.getByText('Send Response');
    fireEvent.click(submitButton);

    expect(mockOnResponse).not.toHaveBeenCalled();
  });

  it('prevents empty escalation submission', () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onResponse={mockOnResponse}
        onAssign={mockOnAssign}
      />
    );

    fireEvent.click(screen.getByText('Escalate'));
    fireEvent.click(screen.getByRole('button', { name: 'Escalate' }));

    expect(mockOnUpdate).not.toHaveBeenCalled();
  });
});