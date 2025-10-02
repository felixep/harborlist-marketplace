import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useSystemHealth } from '../useSystemHealth';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the adminApi
const mockGet = vi.fn();
vi.mock('../../services/adminApi', () => ({
  adminApi: {
    get: mockGet
  }
}));

describe('useSystemHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch health checks successfully', async () => {
    const mockHealthData = {
      healthChecks: [
        {
          service: 'Database',
          status: 'healthy' as const,
          responseTime: 150,
          lastCheck: '2023-01-01T00:00:00Z',
          message: 'Database is responding normally'
        },
        {
          service: 'API Gateway',
          status: 'healthy' as const,
          responseTime: 50,
          lastCheck: '2023-01-01T00:00:00Z',
          message: 'API Gateway is responding normally'
        }
      ],
      overallStatus: 'healthy' as const,
      lastUpdated: '2023-01-01T00:00:00Z'
    };

    mockGet.mockResolvedValueOnce({ data: mockHealthData });

    const { result } = renderHook(() => useSystemHealth());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.healthChecks).toEqual(mockHealthData.healthChecks);
    expect(result.current.overallStatus).toBe('healthy');
    expect(result.current.error).toBeNull();
    expect(mockGet).toHaveBeenCalledWith('/system/health');
  });

  it('should handle fetch error', async () => {
    const errorMessage = 'Failed to fetch health checks';
    mockGet.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useSystemHealth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.healthChecks).toEqual([]);
  });

  it('should refetch health checks when refetch is called', async () => {
    const mockHealthData = {
      healthChecks: [
        {
          service: 'Database',
          status: 'healthy' as const,
          responseTime: 150,
          lastCheck: '2023-01-01T00:00:00Z'
        }
      ],
      overallStatus: 'healthy' as const,
      lastUpdated: '2023-01-01T00:00:00Z'
    };

    mockGet.mockResolvedValue({ data: mockHealthData });

    const { result } = renderHook(() => useSystemHealth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear the mock to verify refetch calls
    mockGet.mockClear();

    // Call refetch
    await result.current.refetch();

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/system/health');
  });

  it('should handle degraded system status', async () => {
    const mockHealthData = {
      healthChecks: [
        {
          service: 'Database',
          status: 'healthy' as const,
          responseTime: 150,
          lastCheck: '2023-01-01T00:00:00Z'
        },
        {
          service: 'API Gateway',
          status: 'degraded' as const,
          responseTime: 500,
          lastCheck: '2023-01-01T00:00:00Z',
          message: 'High response times detected'
        }
      ],
      overallStatus: 'degraded' as const,
      lastUpdated: '2023-01-01T00:00:00Z'
    };

    mockGet.mockResolvedValueOnce({ data: mockHealthData });

    const { result } = renderHook(() => useSystemHealth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.overallStatus).toBe('degraded');
    expect(result.current.healthChecks).toHaveLength(2);
    expect(result.current.healthChecks[1].status).toBe('degraded');
  });
});