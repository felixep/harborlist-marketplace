import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDashboardMetrics } from '../useDashboardMetrics';

// Mock the adminApi
const mockGetDashboardMetrics = vi.fn();
vi.mock('../../services/adminApi', () => ({
  adminApi: {
    getDashboardMetrics: mockGetDashboardMetrics,
  },
}));

describe('useDashboardMetrics', () => {
  const mockApiResponse = {
    totalUsers: 1250,
    activeListings: 342,
    pendingModeration: 8,
    systemHealth: {
      status: 'healthy',
      uptime: 99.9,
      responseTime: 145,
      errorRate: 0.1
    },
    revenueToday: 15420,
    newUsersToday: 23,
    newListingsToday: 12,
    activeUsersToday: 156,
    chartData: {
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
          label: 'System Status',
          data: [98, 99, 97, 100],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(251, 191, 36, 0.8)',
            'rgba(34, 197, 94, 0.8)',
          ],
        }]
      }
    },
    alerts: [
      {
        id: '1',
        type: 'warning',
        title: 'High Storage Usage',
        message: 'Storage usage is at 85% capacity',
        timestamp: '2023-12-01T10:00:00Z',
        acknowledged: false
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with loading state', () => {
    mockGetDashboardMetrics.mockImplementation(() => new Promise(() => {}));
    
    const { result } = renderHook(() => useDashboardMetrics());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.metrics).toBe(null);
    expect(result.current.chartData).toBe(null);
    expect(result.current.alerts).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('should fetch and transform metrics successfully', async () => {
    mockGetDashboardMetrics.mockResolvedValue(mockApiResponse);
    
    const { result } = renderHook(() => useDashboardMetrics());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.metrics).toEqual({
      totalUsers: 1250,
      activeListings: 342,
      pendingModeration: 8,
      systemHealth: {
        status: 'healthy',
        uptime: 99.9,
        responseTime: 145,
        errorRate: 0.1
      },
      revenueToday: 15420,
      newUsersToday: 23,
      newListingsToday: 12,
      activeUsersToday: 156,
    });
    
    expect(result.current.chartData).toBeDefined();
    expect(result.current.chartData?.userGrowth).toBeDefined();
    expect(result.current.chartData?.listingActivity).toBeDefined();
    expect(result.current.chartData?.systemPerformance).toBeDefined();
    
    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0].title).toBe('High Storage Usage');
    expect(result.current.error).toBe(null);
  });

  it('should handle API errors and provide fallback data', async () => {
    const errorMessage = 'API Error';
    mockGetDashboardMetrics.mockRejectedValue(new Error(errorMessage));
    
    const { result } = renderHook(() => useDashboardMetrics());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.error).toBe(errorMessage);
    // Should still provide fallback data
    expect(result.current.metrics).toBeDefined();
    expect(result.current.metrics?.totalUsers).toBe(1250);
    expect(result.current.chartData).toBeDefined();
    expect(result.current.alerts).toHaveLength(1);
  });

  it('should handle missing data in API response', async () => {
    const incompleteResponse = {
      totalUsers: 100,
      // Missing other fields
    };
    
    mockGetDashboardMetrics.mockResolvedValue(incompleteResponse);
    
    const { result } = renderHook(() => useDashboardMetrics());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.metrics).toEqual({
      totalUsers: 100,
      activeListings: 0,
      pendingModeration: 0,
      systemHealth: {
        status: 'healthy',
        uptime: 99.9,
        responseTime: 150,
        errorRate: 0.1
      },
      revenueToday: 0,
      newUsersToday: 0,
      newListingsToday: 0,
      activeUsersToday: 0,
    });
  });

  it('should refetch data when refetch is called', async () => {
    mockGetDashboardMetrics.mockResolvedValue(mockApiResponse);
    
    const { result } = renderHook(() => useDashboardMetrics());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(mockGetDashboardMetrics).toHaveBeenCalledTimes(1);
    
    // Call refetch
    await result.current.refetch();
    
    expect(mockGetDashboardMetrics).toHaveBeenCalledTimes(2);
  });

  it('should set up auto-refresh interval', async () => {
    mockGetDashboardMetrics.mockResolvedValue(mockApiResponse);
    
    const refreshInterval = 5000; // 5 seconds
    renderHook(() => useDashboardMetrics(refreshInterval));
    
    await waitFor(() => {
      expect(mockGetDashboardMetrics).toHaveBeenCalledTimes(1);
    });
    
    // Fast-forward time
    vi.advanceTimersByTime(refreshInterval);
    
    await waitFor(() => {
      expect(mockGetDashboardMetrics).toHaveBeenCalledTimes(2);
    });
  });

  it('should clean up interval on unmount', async () => {
    mockGetDashboardMetrics.mockResolvedValue(mockApiResponse);
    
    const { unmount } = renderHook(() => useDashboardMetrics(5000));
    
    await waitFor(() => {
      expect(mockGetDashboardMetrics).toHaveBeenCalledTimes(1);
    });
    
    unmount();
    
    // Fast-forward time after unmount
    vi.advanceTimersByTime(10000);
    
    // Should not call API again after unmount
    expect(mockGetDashboardMetrics).toHaveBeenCalledTimes(1);
  });
});