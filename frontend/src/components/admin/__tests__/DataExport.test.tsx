import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DataExport from '../DataExport';
import { DataExportService } from '../../../utils/dataExport';
import { AnalyticsMetrics, DateRange } from '@harborlist/shared-types';

// Mock the DataExportService
jest.mock('../../../utils/dataExport', () => ({
  DataExportService: {
    exportToCSV: jest.fn()
  }
}));

const mockAnalyticsData: AnalyticsMetrics = {
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

const mockDateRange: DateRange = {
  startDate: '2023-01-01',
  endDate: '2023-01-31'
};

describe('DataExport Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders export component with all metric options', () => {
    render(
      <DataExport
        data={mockAnalyticsData}
        dateRange={mockDateRange}
      />
    );

    expect(screen.getByText('Data Export')).toBeInTheDocument();
    expect(screen.getByText('User Metrics')).toBeInTheDocument();
    expect(screen.getByText('Listing Metrics')).toBeInTheDocument();
    expect(screen.getByText('Engagement Metrics')).toBeInTheDocument();
    expect(screen.getByText('Geographic Metrics')).toBeInTheDocument();
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
  });

  it('shows date range in description', () => {
    render(
      <DataExport
        data={mockAnalyticsData}
        dateRange={mockDateRange}
      />
    );

    expect(screen.getByText(/2023-01-01 to 2023-01-31/)).toBeInTheDocument();
  });

  it('allows toggling metric selections', () => {
    render(
      <DataExport
        data={mockAnalyticsData}
        dateRange={mockDateRange}
      />
    );

    const userMetricsCheckbox = screen.getByRole('checkbox', { name: /User Metrics/ });
    expect(userMetricsCheckbox).toBeChecked();

    fireEvent.click(userMetricsCheckbox);
    expect(userMetricsCheckbox).not.toBeChecked();

    fireEvent.click(userMetricsCheckbox);
    expect(userMetricsCheckbox).toBeChecked();
  });

  it('calls DataExportService.exportToCSV when export button is clicked', async () => {
    render(
      <DataExport
        data={mockAnalyticsData}
        dateRange={mockDateRange}
      />
    );

    const exportButton = screen.getByText('Export CSV');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(DataExportService.exportToCSV).toHaveBeenCalledWith(
        mockAnalyticsData,
        {
          dateRange: mockDateRange,
          metrics: ['users', 'listings', 'engagement', 'geographic']
        }
      );
    });
  });

  it('disables export button when no metrics are selected', () => {
    render(
      <DataExport
        data={mockAnalyticsData}
        dateRange={mockDateRange}
      />
    );

    // Uncheck all metrics
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => {
      if (checkbox.checked) {
        fireEvent.click(checkbox);
      }
    });

    const exportButton = screen.getByText('Export CSV');
    expect(exportButton).toBeDisabled();
    expect(screen.getByText('Please select at least one metric category to export.')).toBeInTheDocument();
  });

  it('disables export button when loading', () => {
    render(
      <DataExport
        data={mockAnalyticsData}
        dateRange={mockDateRange}
        loading={true}
      />
    );

    const exportButton = screen.getByText('Export CSV');
    expect(exportButton).toBeDisabled();
  });

  it('disables export button when no data is available', () => {
    render(
      <DataExport
        data={null}
        dateRange={mockDateRange}
      />
    );

    const exportButton = screen.getByText('Export CSV');
    expect(exportButton).toBeDisabled();
    expect(screen.getByText('No data available for export. Please ensure analytics data is loaded.')).toBeInTheDocument();
  });

  it('shows loading state during export', async () => {
    // Mock a delayed export
    (DataExportService.exportToCSV as jest.Mock).mockImplementation(() => {
      return new Promise(resolve => setTimeout(resolve, 100));
    });

    render(
      <DataExport
        data={mockAnalyticsData}
        dateRange={mockDateRange}
      />
    );

    const exportButton = screen.getByText('Export CSV');
    fireEvent.click(exportButton);

    expect(screen.getByText('Exporting...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exporting/ })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });
  });

  it('handles export errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (DataExportService.exportToCSV as jest.Mock).mockRejectedValue(new Error('Export failed'));

    render(
      <DataExport
        data={mockAnalyticsData}
        dateRange={mockDateRange}
      />
    );

    const exportButton = screen.getByText('Export CSV');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Export failed:', expect.any(Error));
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('shows export information', () => {
    render(
      <DataExport
        data={mockAnalyticsData}
        dateRange={mockDateRange}
      />
    );

    expect(screen.getByText('Export includes:')).toBeInTheDocument();
    expect(screen.getByText('Summary metrics for the selected date range')).toBeInTheDocument();
    expect(screen.getByText('Time-series data for trend analysis')).toBeInTheDocument();
    expect(screen.getByText('Categorical breakdowns and distributions')).toBeInTheDocument();
    expect(screen.getByText('Geographic distribution data (if selected)')).toBeInTheDocument();
  });
});