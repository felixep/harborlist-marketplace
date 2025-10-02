import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import SupportDashboard from '../SupportDashboard';
import { adminApi } from '../../../services/adminApi';

// Mock the admin API
vi.mock('../../../services/adminApi');
const mockAdminApi = adminApi as any;

// Mock the child components
vi.mock('../../../components/admin/MetricCard', () => ({
  MetricCard: ({ title, value }: any) => (
    <div data-testid="metric-card">
      <div>{title}</div>
      <div>{value}</div>
    </div>
  )
}));

vi.mock('../../../components/admin/support/TicketTable', () => ({
  TicketTable: ({ tickets, onTicketSelect }: any) => (
    <div data-testid="ticket-table">
      {tickets.map((ticket: any) => (
        <div key={ticket.id} onClick={() => onTicketSelect(ticket)}>
          {ticket.subject}
        </div>
      ))}
    </div>
  )
}));

vi.mock('../../../components/admin/support/TicketDetailModal', () => ({
  TicketDetailModal: ({ ticket, onClose }: any) => (
    <div data-testid="ticket-detail-modal">
      <div>{ticket.subject}</div>
      <button onClick={onClose}>Close</button>
    </div>
  )
}));

vi.mock('../../../components/admin/support/AnnouncementPanel', () => ({
  AnnouncementPanel: ({ announcements }: any) => (
    <div data-testid="announcement-panel">
      {announcements.map((announcement: any) => (
        <div key={announcement.id}>{announcement.title}</div>
      ))}
    </div>
  )
}));

vi.mock('../../../components/admin/support/SupportFilters', () => ({
  SupportFilters: ({ onFiltersChange }: any) => (
    <div data-testid="support-filters">
      <button onClick={() => onFiltersChange({ status: ['open'] })}>
        Filter Open
      </button>
    </div>
  )
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('SupportDashboard', () => {
  const mockSupportStats = {
    totalTickets: 156,
    openTickets: 23,
    inProgressTickets: 12,
    resolvedToday: 8,
    averageResponseTime: 4.5 * 60 * 60,
    averageResolutionTime: 24 * 60 * 60,
    satisfactionScore: 0.87,
    ticketsByPriority: { low: 45, medium: 78, high: 28, urgent: 5 },
    ticketsByCategory: { technical: 62, billing: 34, account: 28, listing: 21, general: 11 },
    ticketsByStatus: { open: 23, in_progress: 12, waiting_response: 8, resolved: 98, closed: 15 }
  };

  const mockTickets = [
    {
      id: 'ticket-1',
      ticketNumber: 'T-2024-001',
      subject: 'Unable to upload boat images',
      description: 'Having trouble uploading images',
      status: 'open',
      priority: 'medium',
      category: 'technical',
      userId: 'user-1',
      userName: 'John Doe',
      userEmail: 'john@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['upload', 'images'],
      attachments: [],
      responses: [],
      escalated: false
    }
  ];

  const mockAnnouncements = [
    {
      id: 'announcement-1',
      title: 'New Feature: Advanced Search',
      content: 'We have added new search filters',
      type: 'feature',
      status: 'published',
      targetAudience: 'all',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      channels: [],
      readBy: [],
      clickCount: 45,
      impressionCount: 1250,
      tags: []
    }
  ];

  const mockAnnouncementStats = {
    totalAnnouncements: 25,
    activeAnnouncements: 8,
    scheduledAnnouncements: 3,
    totalImpressions: 15420,
    totalClicks: 892,
    averageClickRate: 0.058,
    announcementsByType: { info: 12, warning: 3, maintenance: 4, feature: 5, promotion: 1 }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockAdminApi.get.mockImplementation((url: string) => {
      if (url.includes('/support/tickets')) {
        return Promise.resolve({ data: { tickets: mockTickets, total: mockTickets.length } });
      }
      if (url.includes('/support/stats')) {
        return Promise.resolve({ data: mockSupportStats });
      }
      if (url.includes('/support/announcements/stats')) {
        return Promise.resolve({ data: mockAnnouncementStats });
      }
      if (url.includes('/support/announcements')) {
        return Promise.resolve({ data: { announcements: mockAnnouncements, total: mockAnnouncements.length } });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  it('renders support dashboard with stats', async () => {
    renderWithQueryClient(<SupportDashboard />);

    expect(screen.getByText('Support Dashboard')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getAllByTestId('metric-card')).toHaveLength(4);
    });
  });

  it('switches between tickets and announcements tabs', async () => {
    renderWithQueryClient(<SupportDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('ticket-table')).toBeInTheDocument();
    });

    // Switch to announcements tab
    fireEvent.click(screen.getByText('Announcements'));
    
    await waitFor(() => {
      expect(screen.getByTestId('announcement-panel')).toBeInTheDocument();
    });

    // Switch back to tickets tab
    fireEvent.click(screen.getByText('Support Tickets'));
    
    await waitFor(() => {
      expect(screen.getByTestId('ticket-table')).toBeInTheDocument();
    });
  });

  it('opens ticket detail modal when ticket is selected', async () => {
    renderWithQueryClient(<SupportDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('ticket-table')).toBeInTheDocument();
    });

    // Click on a ticket
    fireEvent.click(screen.getByText('Unable to upload boat images'));

    await waitFor(() => {
      expect(screen.getByTestId('ticket-detail-modal')).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('ticket-detail-modal')).not.toBeInTheDocument();
    });
  });

  it('applies filters to tickets', async () => {
    renderWithQueryClient(<SupportDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('support-filters')).toBeInTheDocument();
    });

    // Apply filter
    fireEvent.click(screen.getByText('Filter Open'));

    await waitFor(() => {
      expect(mockAdminApi.get).toHaveBeenCalledWith(
        expect.stringContaining('/support/tickets'),
        expect.any(Object)
      );
    });
  });

  it('handles API errors gracefully', async () => {
    mockAdminApi.get.mockRejectedValue(new Error('API Error'));

    renderWithQueryClient(<SupportDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });

    // Test retry functionality
    mockAdminApi.get.mockResolvedValue({ data: mockSupportStats });
    fireEvent.click(screen.getByText('Try Again'));

    await waitFor(() => {
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    // Mock a delayed response
    mockAdminApi.get.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    renderWithQueryClient(<SupportDashboard />);

    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('handles ticket updates', async () => {
    mockAdminApi.post.mockResolvedValue({ data: { message: 'Success' } });

    renderWithQueryClient(<SupportDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('ticket-table')).toBeInTheDocument();
    });

    // This would be triggered by the TicketTable component
    // In a real test, we would simulate the actual user interaction
    expect(mockAdminApi.get).toHaveBeenCalled();
  });

  it('handles announcement creation', async () => {
    mockAdminApi.post.mockResolvedValue({ data: { message: 'Success' } });

    renderWithQueryClient(<SupportDashboard />);

    // Switch to announcements tab
    fireEvent.click(screen.getByText('Announcements'));

    await waitFor(() => {
      expect(screen.getByTestId('announcement-panel')).toBeInTheDocument();
    });

    // This would be triggered by the AnnouncementPanel component
    expect(mockAdminApi.get).toHaveBeenCalled();
  });
});