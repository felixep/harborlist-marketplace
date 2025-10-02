import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import AdminDashboard from '../AdminDashboard';

// Mock the hook
const mockUseDashboardMetrics = vi.fn();
vi.mock('../../../hooks/useDashboardMetrics', () => ({
  useDashboardMetrics: mockUseDashboardMetrics,
}));

// Mock Chart.js components
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart">Line Chart</div>,
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
  Doughnut: () => <div data-testid="doughnut-chart">Doughnut Chart</div>,
}));

vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  BarElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
  ArcElement: {},
}));

describe('AdminDashboard', () => {
  const mockMetrics = {
    totalUsers: 1250,
    activeListings: 342,
    pendingModeration: 8,
    systemHealth: {
      status: 'healthy' as const,
      uptime: 99.9,
      responseTime: 145,
      errorRate: 0.1
    },
    revenueToday: 15420,
    newUsersToday: 23,
    newListingsToday: 12,
    activeUsersToday: 156,
  };

  const mockChartData = {
    userGrowth: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'New Users',
        data: [12, 19, 3, 5, 2, 3, 9],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
      }]
    },
    listingActivity: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'New Listings',
        data: [5, 8, 12, 7, 9, 6, 11],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      }]
    },
    systemPerformance: {
      labels: ['API Health', 'Database', 'Storage', 'CDN'],
      datasets: [{
        label: 'System Status (%)',
        data: [98, 99, 97, 100],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(34, 197, 94, 0.8)',
        ],
      }]
    }
  };

  const mockAlerts = [
    {
      id: '1',
      type: 'warning' as const,
      title: 'High Storage Usage',
      message: 'Storage usage is at 85% capacity',
      timestamp: '2023-12-01T10:00:00Z',
      acknowledged: false
    }
  ];

  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard with metrics and charts', () => {
    mockUseDashboardMetrics.mockReturnValue({
      metrics: mockMetrics,
      chartData: mockChartData,
      alerts: mockAlerts,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Key Metrics')).toBeInTheDocument();
    
    // Check metric cards
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1,250')).toBeInTheDocument();
    expect(screen.getByText('Active Listings')).toBeInTheDocument();
    expect(screen.getByText('342')).toBeInTheDocument();
    expect(screen.getByText('Pending Moderation')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    
    // Check charts
    expect(screen.getByText('User Growth (Last 7 Days)')).toBeInTheDocument();
    expect(screen.getByText('Listing Activity (Last 7 Days)')).toBeInTheDocument();
    expect(screen.getByText('System Performance')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
  });

  it('displays system alerts', () => {
    mockUseDashboardMetrics.mockReturnValue({
      metrics: mockMetrics,
      chartData: mockChartData,
      alerts: mockAlerts,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

    expect(screen.getByText('System Alerts')).toBeInTheDocument();
    expect(screen.getByText('High Storage Usage')).toBeInTheDocument();
    expect(screen.getByText('Storage usage is at 85% capacity')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseDashboardMetrics.mockReturnValue({
      metrics: null,
      chartData: null,
      alerts: [],
      loading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

    // Should show loading skeletons
    const loadingElements = screen.getAllByRole('generic');
    const animatedElements = loadingElements.filter(el => 
      el.className.includes('animate-pulse')
    );
    expect(animatedElements.length).toBeGreaterThan(0);
  });

  it('handles error state', () => {
    const errorMessage = 'Failed to fetch metrics';
    mockUseDashboardMetrics.mockReturnValue({
      metrics: null,
      chartData: null,
      alerts: [],
      loading: false,
      error: errorMessage,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

    expect(screen.getByText('Failed to load dashboard metrics')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('calls refetch when retry button is clicked', async () => {
    const errorMessage = 'Failed to fetch metrics';
    mockUseDashboardMetrics.mockReturnValue({
      metrics: null,
      chartData: null,
      alerts: [],
      loading: false,
      error: errorMessage,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('calls refetch when refresh button is clicked', async () => {
    mockUseDashboardMetrics.mockReturnValue({
      metrics: mockMetrics,
      chartData: mockChartData,
      alerts: [],
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('disables refresh button when loading', () => {
    mockUseDashboardMetrics.mockReturnValue({
      metrics: mockMetrics,
      chartData: mockChartData,
      alerts: [],
      loading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).toBeDisabled();
  });

  it('displays system status information', () => {
    mockUseDashboardMetrics.mockReturnValue({
      metrics: mockMetrics,
      chartData: mockChartData,
      alerts: [],
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(screen.getByText('99.9%')).toBeInTheDocument(); // Uptime
    expect(screen.getByText('145ms')).toBeInTheDocument(); // Response time
    expect(screen.getByText('0.1%')).toBeInTheDocument(); // Error rate
    expect(screen.getByText('156')).toBeInTheDocument(); // Active users today
  });

  it('handles different alert types', () => {
    const multipleAlerts = [
      {
        id: '1',
        type: 'error' as const,
        title: 'System Error',
        message: 'Database connection failed',
        timestamp: '2023-12-01T10:00:00Z',
        acknowledged: false
      },
      {
        id: '2',
        type: 'info' as const,
        title: 'Maintenance Scheduled',
        message: 'System maintenance at 2 AM',
        timestamp: '2023-12-01T11:00:00Z',
        acknowledged: false
      }
    ];

    mockUseDashboardMetrics.mockReturnValue({
      metrics: mockMetrics,
      chartData: mockChartData,
      alerts: multipleAlerts,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

    expect(screen.getByText('System Error')).toBeInTheDocument();
    expect(screen.getByText('Maintenance Scheduled')).toBeInTheDocument();
  });

  it('handles fallback data when API fails', () => {
    mockUseDashboardMetrics.mockReturnValue({
      metrics: mockMetrics,
      chartData: mockChartData,
      alerts: mockAlerts,
      loading: false,
      error: 'API Error',
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

    // Should still display the dashboard with fallback data
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Key Metrics')).toBeInTheDocument();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
  });
});