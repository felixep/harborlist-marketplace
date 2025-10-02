import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// Create mock functions
const mockGet = vi.fn();

// Mock the adminApi module before importing the hook
vi.mock('../../services/adminApi', () => ({
  adminApi: {
    get: mockGet
  }
}));

// Now import the hook
import { useSystemHealth } from '../useSystemHealth';

describe('useSystemHealth - Simple Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    mockGet.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useSystemHealth());

    expect(result.current.loading).toBe(true);
    expect(result.current.healthChecks).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should handle successful API response', async () => {
    const mockHealthData = {
      healthChecks: [
        {
          service: 'Database',
          status: 'healthy' as const,
          responseTime: 150,
          lastCheck: '2023-01-01T00:00:00Z',
          message: 'Database is responding normally'
        }
      ],
      overallStatus: 'healthy' as const,
      lastUpdated: '2023-01-01T00:00:00Z'
    };

    mockGet.mockResolvedValueOnce({ data: mockHealthData });

    const { result } = renderHook(() => useSystemHealth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.healthChecks).toEqual(mockHealthData.healthChecks);
    expect(result.current.overallStatus).toBe('healthy');
    expect(result.current.error).toBeNull();
    expect(mockGet).toHaveBeenCalledWith('/system/health');
  });

  it('should handle API error', async () => {
    const errorMessage = 'Network error';
    mockGet.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useSystemHealth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.healthChecks).toEqual([]);
  });

  it('should call refetch when refetch function is called', async () => {
    const mockHealthData = {
      healthChecks: [],
      overallStatus: 'healthy' as const,
      lastUpdated: '2023-01-01T00:00:00Z'
    };

    mockGet.mockResolvedValue({ data: mockHealthData });

    const { result } = renderHook(() => useSystemHealth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear previous calls
    mockGet.mockClear();

    // Call refetch
    await result.current.refetch();

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/system/health');
  });
});