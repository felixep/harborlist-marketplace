import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AuditLogs from '../AuditLogs';
import { useAuditLogs } from '../../../hooks/useAuditLogs';
import { AuditLog } from '@harborlist/shared-types';

// Mock the useAuditLogs hook
vi.mock('../../../hooks/useAuditLogs');
const mockedUseAuditLogs = useAuditLogs as any;

// Mock data
const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    userId: 'user-1',
    userEmail: 'admin@example.com',
    action: 'VIEW_USERS',
    resource: 'users',
    resourceId: undefined,
    details: { path: '/admin/users', method: 'GET', statusCode: 200 },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    timestamp: '2023-12-01T10:00:00Z',
    sessionId: 'session-1'
  },
  {
    id: '2',
    userId: 'user-1',
    userEmail: 'admin@example.com',
    action: 'UPDATE_USER_STATUS',
    resource: 'user',
    resourceId: 'user-123',
    details: { oldStatus: 'active', newStatus: 'suspended', reason: 'Policy violation' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    timestamp: '2023-12-01T10:05:00Z',
    sessionId: 'session-1'
  }
];

const mockPagination = {
  page: 1,
  limit: 50,
  total: 2,
  totalPages: 1
};

const mockStats = {
  totalActions: 100,
  uniqueUsers: 5,
  actionBreakdown: {
    'VIEW_USERS': 30,
    'UPDATE_USER_STATUS': 20,
    'VIEW_DASHBOARD': 50
  },
  resourceBreakdown: {
    'users': 50,
    'dashboard': 50
  },
  hourlyActivity: {
    '2023-12-01T10': 2
  },
  topUsers: [
    {
      userId: 'user-1',
      email: 'admin@example.com',
      count: 50
    }
  ],
  timeRange: '7d',
  startDate: '2023-11-24T00:00:00Z',
  endDate: '2023-12-01T23:59:59Z'
};

const defaultMockReturn = {
  auditLogs: mockAuditLogs,
  loading: false,
  error: null,
  pagination: mockPagination,
  stats: mockStats,
  refreshLogs: vi.fn(),
  loadStats: vi.fn(),
  exportLogs: vi.fn(),
  searchLogs: vi.fn(),
  getLogDetails: vi.fn()
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuditLogs.mockReturnValue(defaultMockReturn);
  });

  it('renders audit logs page correctly', () => {
    renderWithRouter(<AuditLogs />);

    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    expect(screen.getByText('Track all administrative actions and system events')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('displays audit logs in table format', () => {
    renderWithRouter(<AuditLogs />);

    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('VIEW_USERS')).toBeInTheDocument();
    expect(screen.getByText('UPDATE_USER_STATUS')).toBeInTheDocument();
    expect(screen.getByText('users')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockedUseAuditLogs.mockReturnValue({
      ...defaultMockReturn,
      loading: true,
      auditLogs: []
    });

    renderWithRouter(<AuditLogs />);

    expect(screen.getByText('Loading audit logs...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    const errorMessage = 'Failed to load audit logs';
    mockedUseAuditLogs.mockReturnValue({
      ...defaultMockReturn,
      error: errorMessage,
      auditLogs: []
    });

    renderWithRouter(<AuditLogs />);

    expect(screen.getByText('Error Loading Audit Logs')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows empty state when no logs found', () => {
    mockedUseAuditLogs.mockReturnValue({
      ...defaultMockReturn,
      auditLogs: [],
      pagination: { ...mockPagination, total: 0 }
    });

    renderWithRouter(<AuditLogs />);

    expect(screen.getByText('No audit logs found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your filters or date range.')).toBeInTheDocument();
  });

  it('toggles filters panel', () => {
    renderWithRouter(<AuditLogs />);

    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    expect(screen.getByLabelText('User Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Action')).toBeInTheDocument();
    expect(screen.getByLabelText('Resource')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
  });

  it('toggles stats panel', () => {
    renderWithRouter(<AuditLogs />);

    const statsButton = screen.getByText('Show Stats');
    fireEvent.click(statsButton);

    expect(screen.getByText('Activity Statistics (Last 7 Days)')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument(); // Total Actions
    expect(screen.getByText('5')).toBeInTheDocument(); // Unique Users
  });

  it('handles filter changes', async () => {
    const mockRefreshLogs = vi.fn();
    mockedUseAuditLogs.mockReturnValue({
      ...defaultMockReturn,
      refreshLogs: mockRefreshLogs
    });

    renderWithRouter(<AuditLogs />);

    // Open filters
    fireEvent.click(screen.getByText('Filters'));

    // Change user email filter
    const userEmailInput = screen.getByLabelText('User Email');
    fireEvent.change(userEmailInput, { target: { value: 'test@example.com' } });

    await waitFor(() => {
      expect(mockRefreshLogs).toHaveBeenCalled();
    });
  });

  it('handles sorting changes', async () => {
    const mockRefreshLogs = vi.fn();
    mockedUseAuditLogs.mockReturnValue({
      ...defaultMockReturn,
      refreshLogs: mockRefreshLogs
    });

    renderWithRouter(<AuditLogs />);

    const sortSelect = screen.getByDisplayValue('Sort by Time');
    fireEvent.change(sortSelect, { target: { value: 'action' } });

    await waitFor(() => {
      expect(mockRefreshLogs).toHaveBeenCalled();
    });
  });

  it('handles sort order toggle', async () => {
    const mockRefreshLogs = vi.fn();
    mockedUseAuditLogs.mockReturnValue({
      ...defaultMockReturn,
      refreshLogs: mockRefreshLogs
    });

    renderWithRouter(<AuditLogs />);

    const sortOrderButton = screen.getByText('↓');
    fireEvent.click(sortOrderButton);

    await waitFor(() => {
      expect(mockRefreshLogs).toHaveBeenCalled();
    });
  });

  it('handles export functionality', async () => {
    const mockExportLogs = vi.fn().mockResolvedValue({
      success: true,
      filename: 'audit-logs-test.csv',
      recordCount: 2
    });

    mockedUseAuditLogs.mockReturnValue({
      ...defaultMockReturn,
      exportLogs: mockExportLogs
    });

    renderWithRouter(<AuditLogs />);

    // Click export button to open menu
    fireEvent.click(screen.getByText('Export'));

    // Click CSV export
    const csvExportButton = screen.getByText('Export as CSV');
    fireEvent.click(csvExportButton);

    await waitFor(() => {
      expect(mockExportLogs).toHaveBeenCalledWith({
        format: 'csv',
        startDate: expect.any(String),
        endDate: expect.any(String)
      });
    });
  });

  it('clears filters when clear button is clicked', async () => {
    const mockRefreshLogs = vi.fn();
    mockedUseAuditLogs.mockReturnValue({
      ...defaultMockReturn,
      refreshLogs: mockRefreshLogs
    });

    renderWithRouter(<AuditLogs />);

    // Open filters
    fireEvent.click(screen.getByText('Filters'));

    // Set some filters
    const userEmailInput = screen.getByLabelText('User Email');
    fireEvent.change(userEmailInput, { target: { value: 'test@example.com' } });

    // Clear filters
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);

    expect(userEmailInput).toHaveValue('');
    await waitFor(() => {
      expect(mockRefreshLogs).toHaveBeenCalled();
    });
  });

  it('displays pagination correctly', () => {
    mockedUseAuditLogs.mockReturnValue({
      ...defaultMockReturn,
      pagination: {
        page: 2,
        limit: 50,
        total: 150,
        totalPages: 3
      }
    });

    renderWithRouter(<AuditLogs />);

    expect(screen.getByText('Showing 51 to 100 of 150 results')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('handles pagination navigation', async () => {
    const mockRefreshLogs = vi.fn();
    mockedUseAuditLogs.mockReturnValue({
      ...defaultMockReturn,
      refreshLogs: mockRefreshLogs,
      pagination: {
        page: 1,
        limit: 50,
        total: 150,
        totalPages: 3
      }
    });

    renderWithRouter(<AuditLogs />);

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockRefreshLogs).toHaveBeenCalled();
    });
  });

  it('expands log details when clicked', () => {
    renderWithRouter(<AuditLogs />);

    const detailsButton = screen.getAllByText('View Details')[0];
    fireEvent.click(detailsButton);

    // Check if details are expanded (the details element should be open)
    const detailsElement = detailsButton.closest('details');
    expect(detailsElement).toHaveAttribute('open');
  });

  it('applies correct action color classes', () => {
    renderWithRouter(<AuditLogs />);

    const viewAction = screen.getByText('VIEW_USERS');
    const updateAction = screen.getByText('UPDATE_USER_STATUS');

    expect(viewAction).toHaveClass('text-gray-600', 'bg-gray-50');
    expect(updateAction).toHaveClass('text-blue-600', 'bg-blue-50');
  });

  it('formats timestamps correctly', () => {
    renderWithRouter(<AuditLogs />);

    // The timestamp should be formatted as a locale string
    const timestamp = new Date('2023-12-01T10:00:00Z').toLocaleString();
    expect(screen.getByText(timestamp)).toBeInTheDocument();
  });
});