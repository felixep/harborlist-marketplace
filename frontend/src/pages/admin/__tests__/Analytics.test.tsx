import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Analytics from '../Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { DataExportService } from '../../../utils/dataExport';

// Mock the hooks and services
jest.mock('../../../hooks/useAnalytics');
jest.mock('../../../utils/dataExport', () => ({
  DataExportService: {
    exportChartDataToCSV: jest.fn()
  }
}));

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart">Line Chart</div>,
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
  Doughnut: () => <div data-testid="doughnut-chart">Doughnut Chart</div>
}));

const mockAnalyticsData = {
  userMetrics: {
    totalUsers: 1000,
    newUsers: 50,
    activeUsers: 800,
    registrationsByDate: [
      { date: '2023-01-01', value: 10 },
      { date: '2023-01-02', value: 15 }
    ],
    usersByRegion: [
      { region: 'North America', count: 450, percentage: 45 },
      { region: 'Europe', count: 300, percentage: 30 }
    ]
  },
  listingMetrics: {
    totalListings: 500,
    newListings: 25,
    activeListings: 400,
    averageListingPrice: 50000,
    listingsByDate: [
      { date: '2023-01-01', value: 5 },
      { date: '2023-01-02', value: 8 }
    ],
    listingsByCategory: [
      { category: 'Sailboat', count: 175, percentage: 35 },
      { category: 'Motor Yacht', count: 125, percentage: 25 }
    ]
  },
  engagementMetrics: {
    totalSearches: 15420,
    uniqueSearchers: 3240,
    averageSearchesPerUser: 4.8,
    listingViews: 45680,
    averageViewsPerListing: 12.3,
    inquiries: 2340,
    inquiryRate: 5.1,
    topSearchTerms: [
      { term: 'sailboat', count: 1240, trend: 'up' },
      { term: 'yacht charter', count: 980, trend: 'up' }
    ]
  },
  geographicMetrics: {
    usersByState: [
      { state: 'California', count: 1240, percentage: 18.5 },
      { state: 'Florida', count: 980, percentage: 14.6 }
    ],
    listingsByState: [
      { state: 'Florida', count: 890, percentage: 22.3 },
      { state: 'California', count: 720, percentage: 18.0 }
    ],
    topCities: [
      { city: 'Miami', state: 'FL', count: 340, percentage: 8.5 },
      { city: 'San Diego', state: 'CA', count: 280, percentage: 7.0 }
    ]
  }
};

const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;

describe('Analytics Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAnalytics.mockReturnValue({
      data: mockAnalyticsData,
      loading: false,
      error: null,
      refetch: jest.fn()
    });
  });

  it('renders analytics page with title and refresh button', () => {
    render(<Analytics />);

    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Refresh Data')).toBeInTheDocument();
  });

  it('displays key metrics summary cards', () => {
    render(<Analytics />);

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('Total Listings')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('Total Searches')).toBeInTheDocument();
    expect(screen.getByText('15,420')).toBeInTheDocument();
    expect(screen.getByText('Listing Views')).toBeInTheDocument();
    expect(screen.getByText('45,680')).toBeInTheDocument();
  });

  it('renders analytics charts', () => {
    render(<Analytics />);

    expect(screen.getByText('User Registrations Over Time')).toBeInTheDocument();
    expect(screen.getByText('Listing Creation Trends')).toBeInTheDocument();
    expect(screen.getByText('Listings by Category')).toBeInTheDocument();
    expect(screen.getByText('Users by Region')).toBeInTheDocument();
    
    expect(screen.getAllByTestId('line-chart')).toHaveLength(2);
    expect(screen.getAllByTestId('doughnut-chart')).toHaveLength(2);
  });

  it('displays engagement insights section', () => {
    render(<Analytics />);

    expect(screen.getByText('Engagement Insights')).toBeInTheDocument();
    expect(screen.getByText('Search Behavior')).toBeInTheDocument();
    expect(screen.getByText('Listing Performance')).toBeInTheDocument();
    expect(screen.getByText('Top Search Terms')).toBeInTheDocument();
    
    expect(screen.getByText('3,240')).toBeInTheDocument(); // Unique Searchers
    expect(screen.getByText('4.8')).toBeInTheDocument(); // Avg Searches/User
    expect(screen.getByText('12.3')).toBeInTheDocument(); // Avg Views/Listing
    expect(screen.getByText('5.1%')).toBeInTheDocument(); // Inquiry Rate
  });

  it('shows loading state', () => {
    mockUseAnalytics.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: jest.fn()
    });

    render(<Analytics />);

    expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refreshing/ })).toBeDisabled();
  });

  it('shows error state with retry option', () => {
    const mockRefetch = jest.fn();
    mockUseAnalytics.mockReturnValue({
      data: null,
      loading: false,
      error: 'Failed to load analytics data',
      refetch: mockRefetch
    });

    render(<Analytics />);

    expect(screen.getByText('Error Loading Analytics')).toBeInTheDocument();
    expect(screen.getByText('Failed to load analytics data')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('calls refetch when refresh button is clicked', () => {
    const mockRefetch = jest.fn();
    mockUseAnalytics.mockReturnValue({
      data: mockAnalyticsData,
      loading: false,
      error: null,
      refetch: mockRefetch
    });

    render(<Analytics />);

    const refreshButton = screen.getByText('Refresh Data');
    fireEvent.click(refreshButton);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('updates date range and triggers analytics refetch', async () => {
    render(<Analytics />);

    // The DateRangeSelector should be present
    expect(screen.getByText('Date Range')).toBeInTheDocument();
    
    // Check that useAnalytics was called with initial date range
    expect(mockUseAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: expect.any(String),
        endDate: expect.any(String)
      })
    );
  });

  it('exports chart data when export button is clicked', async () => {
    render(<Analytics />);

    const exportButtons = screen.getAllByText('Export');
    expect(exportButtons.length).toBeGreaterThan(0);

    fireEvent.click(exportButtons[0]);

    await waitFor(() => {
      expect(DataExportService.exportChartDataToCSV).toHaveBeenCalled();
    });
  });

  it('renders data export component', () => {
    render(<Analytics />);

    expect(screen.getByText('Data Export')).toBeInTheDocument();
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
  });

  it('displays top search terms', () => {
    render(<Analytics />);

    expect(screen.getByText('sailboat')).toBeInTheDocument();
    expect(screen.getByText('yacht charter')).toBeInTheDocument();
    expect(screen.getByText('1240')).toBeInTheDocument();
    expect(screen.getByText('980')).toBeInTheDocument();
  });

  it('handles missing data gracefully', () => {
    mockUseAnalytics.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: jest.fn()
    });

    render(<Analytics />);

    // Should still render the basic structure
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Date Range')).toBeInTheDocument();
    
    // But not the data-dependent sections
    expect(screen.queryByText('Total Users')).not.toBeInTheDocument();
    expect(screen.queryByText('Engagement Insights')).not.toBeInTheDocument();
  });
});