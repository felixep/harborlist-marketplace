import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useSystemMetrics } from '../useSystemMetrics';
import { adminApi } from '../../services/adminApi';

// Mock the adminApi
vi.mock('../../services/adminApi');
const mockAdminApi = vi.mocked(adminApi);

// Mock timers
vi.useFakeTimers();

describe('useSystemMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should fetch system metrics successfully', async () => {
    const mockMetrics = {
      responseTime: [
        { timestamp: '2023-01-01T00:00:00Z', value: 150 },
        { timestamp: '2023-01-01T00:01:00Z', value: 160 }
      ],
      memoryUsage: [
        { timestamp: '2023-01-01T00:00:00Z', value: 65 },
        { timestamp: '2023-01-01T00:01:00Z', value: 67 }
      ],
      cpuUsage: [
        { timestamp: '2023-01-01T00:00:00Z', value: 45 },
        { timestamp: '2023-01-01T00:01:00Z', value: 47 }
      ],
      errorRate: [
        { timestamp: '2023-01-01T00:00:00Z', value: 0.5 },
        { timestamp: '2023-01-01T00:01:00Z', value: 0.3 }
      ],
      uptime: 3600,
      activeConnections: 75,
      requestsPerMinute: 350
    };

    mockAdminApi.get.mockResolvedValue({ data: mockMetrics });

    const { result } = renderHook(() => useSystemMetrics(30000));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.metrics).toEqual(mockMetrics);
    expect(result.current.error).toBeNull();
    expect(mockAdminApi.get).toHaveBeenCalledWith('/system/metrics', {
      params: {
        timeRange: '1h',
        granularity: 'minute'
      }
    });
  });

  it('should handle fetch error', async () => {
    const errorMessage = 'Failed to fetch system metrics';
    mockAdminApi.get.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useSystemMetrics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.metrics).toBeNull();
  });

  it('should refresh metrics at specified interval', async () => {
    const mockMetrics = {
      responseTime: [{ timestamp: '2023-01-01T00:00:00Z', value: 150 }],
      memoryUsage: [{ timestamp: '2023-01-01T00:00:00Z', value: 65 }],
      cpuUsage: [{ timestamp: '2023-01-01T00:00:00Z', value: 45 }],
      errorRate: [{ timestamp: '2023-01-01T00:00:00Z', value: 0.5 }],
      uptime: 3600,
      activeConnections: 75,
      requestsPerMinute: 350
    };

    mockAdminApi.get.mockResolvedValue({ data: mockMetrics });

    const refreshInterval = 10000; // 10 seconds
    renderHook(() => useSystemMetrics(refreshInterval));

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockAdminApi.get).toHaveBeenCalledTimes(1);
    });

    // Fast-forward time by the refresh interval
    vi.advanceTimersByTime(refreshInterval);

    // Wait for the interval fetch
    await waitFor(() => {
      expect(mockAdminApi.get).toHaveBeenCalledTimes(2);
    });
  });

  it('should cleanup interval on unmount', async () => {
    const mockMetrics = {
      responseTime: [],
      memoryUsage: [],
      cpuUsage: [],
      errorRate: [],
      uptime: 3600,
      activeConnections: 75,
      requestsPerMinute: 350
    };

    mockAdminApi.get.mockResolvedValue({ data: mockMetrics });

    const { unmount } = renderHook(() => useSystemMetrics(5000));

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockAdminApi.get).toHaveBeenCalledTimes(1);
    });

    // Unmount the hook
    unmount();

    // Clear the mock and advance time
    mockAdminApi.get.mockClear();
    vi.advanceTimersByTime(10000);

    // Should not have been called again after unmount
    expect(mockAdminApi.get).not.toHaveBeenCalled();
  });

  it('should refetch metrics when refetch is called', async () => {
    const mockMetrics = {
      responseTime: [],
      memoryUsage: [],
      cpuUsage: [],
      errorRate: [],
      uptime: 3600,
      activeConnections: 75,
      requestsPerMinute: 350
    };

    mockAdminApi.get.mockResolvedValue({ data: mockMetrics });

    const { result } = renderHook(() => useSystemMetrics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear the mock to verify refetch calls
    mockAdminApi.get.mockClear();

    // Call refetch
    await result.current.refetch();

    expect(mockAdminApi.get).toHaveBeenCalledTimes(1);
  });
});