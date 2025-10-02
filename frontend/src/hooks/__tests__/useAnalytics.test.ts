import { renderHook, waitFor } from '@testing-library/react';
import { useAnalytics, useUserAnalytics, useListingAnalytics, useEngagementAnalytics, useGeographicAnalytics } from '../useAnalytics';
import { adminApi } from '../../services/adminApi';
import { DateRange } from '../../types/admin';

// Mock the adminApi
jest.mock('../../services/adminApi', () => ({
  adminApi: {
    getUserAnalytics: jest.fn(),
    getListingAnalytics: jest.fn(),
    getEngagementAnalytics: jest.fn(),
    getGeographicAnalytics: jest.fn()
  }
}));

const mockAdminApi = adminApi as jest.Mocked<typeof adminApi>;

const mockDateRange: DateRange = {
  startDate: '2023-01-01',
  endDate: '2023-01-31'
};

const mockUserAnalytics = {
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
};

const mockListingAnalytics = {
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
};

const mockEngagementAnalytics = {
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
};

const mockGeographicAnalytics = {
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
};

describe('useAnalytics Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminApi.getUserAnalytics.mockResolvedValue(mockUserAnalytics);
    mockAdminApi.getListingAnalytics.mockResolvedValue(mockListingAnalytics);
    mockAdminApi.getEngagementAnalytics.mockResolvedValue(mockEngagementAnalytics);
    mockAdminApi.getGeographicAnalytics.mockResolvedValue(mockGeographicAnalytics);
  });

  it('fetches all analytics data successfully', async () => {
    const { result } = renderHook(() => useAnalytics(mockDateRange));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({
      userMetrics: mockUserAnalytics,
      listingMetrics: mockListingAnalytics,
      engagementMetrics: mockEngagementAnalytics,
      geographicMetrics: mockGeographicAnalytics
    });
    expect(result.current.error).toBe(null);

    // Verify all API calls were made with correct parameters
    expect(mockAdminApi.getUserAnalytics).toHaveBeenCalledWith(mockDateRange);
    expect(mockAdminApi.getListingAnalytics).toHaveBeenCalledWith(mockDateRange);
    expect(mockAdminApi.getEngagementAnalytics).toHaveBeenCalledWith(mockDateRange);
    expect(mockAdminApi.getGeographicAnalytics).toHaveBeenCalledWith(mockDateRange);
  });

  it('handles API errors gracefully', async () => {
    const errorMessage = 'Failed to fetch analytics';
    mockAdminApi.getUserAnalytics.mockRejectedValue(new Error(errorMessage));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useAnalytics(mockDateRange));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(errorMessage);
    expect(consoleSpy).toHaveBeenCalledWith('Analytics fetch error:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('refetches data when refetch is called', async () => {
    const { result } = renderHook(() => useAnalytics(mockDateRange));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear previous calls
    jest.clearAllMocks();

    // Call refetch
    result.current.refetch();

    await waitFor(() => {
      expect(mockAdminApi.getUserAnalytics).toHaveBeenCalledWith(mockDateRange);
    });
  });

  it('refetches data when date range changes', async () => {
    const { result, rerender } = renderHook(
      ({ dateRange }) => useAnalytics(dateRange),
      { initialProps: { dateRange: mockDateRange } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear previous calls
    jest.clearAllMocks();

    // Change date range
    const newDateRange = { startDate: '2023-02-01', endDate: '2023-02-28' };
    rerender({ dateRange: newDateRange });

    await waitFor(() => {
      expect(mockAdminApi.getUserAnalytics).toHaveBeenCalledWith(newDateRange);
    });
  });
});

describe('useUserAnalytics Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminApi.getUserAnalytics.mockResolvedValue(mockUserAnalytics);
  });

  it('fetches user analytics data successfully', async () => {
    const { result } = renderHook(() => useUserAnalytics(mockDateRange));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockUserAnalytics);
    expect(result.current.error).toBe(null);
    expect(mockAdminApi.getUserAnalytics).toHaveBeenCalledWith(mockDateRange);
  });

  it('handles errors in user analytics', async () => {
    const errorMessage = 'Failed to fetch user analytics';
    mockAdminApi.getUserAnalytics.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useUserAnalytics(mockDateRange));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(errorMessage);
  });
});

describe('useListingAnalytics Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminApi.getListingAnalytics.mockResolvedValue(mockListingAnalytics);
  });

  it('fetches listing analytics data successfully', async () => {
    const { result } = renderHook(() => useListingAnalytics(mockDateRange));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockListingAnalytics);
    expect(result.current.error).toBe(null);
    expect(mockAdminApi.getListingAnalytics).toHaveBeenCalledWith(mockDateRange);
  });
});

describe('useEngagementAnalytics Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminApi.getEngagementAnalytics.mockResolvedValue(mockEngagementAnalytics);
  });

  it('fetches engagement analytics data successfully', async () => {
    const { result } = renderHook(() => useEngagementAnalytics(mockDateRange));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockEngagementAnalytics);
    expect(result.current.error).toBe(null);
    expect(mockAdminApi.getEngagementAnalytics).toHaveBeenCalledWith(mockDateRange);
  });
});

describe('useGeographicAnalytics Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminApi.getGeographicAnalytics.mockResolvedValue(mockGeographicAnalytics);
  });

  it('fetches geographic analytics data successfully', async () => {
    const { result } = renderHook(() => useGeographicAnalytics(mockDateRange));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockGeographicAnalytics);
    expect(result.current.error).toBe(null);
    expect(mockAdminApi.getGeographicAnalytics).toHaveBeenCalledWith(mockDateRange);
  });
});