import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useSystemAlerts } from '../useSystemAlerts';
import { adminApi } from '../../services/adminApi';

// Mock the adminApi
vi.mock('../../services/adminApi');
const mockAdminApi = vi.mocked(adminApi);

// Mock timers
vi.useFakeTimers();

describe('useSystemAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should fetch system alerts successfully', async () => {
    const mockAlerts = {
      alerts: [
        {
          id: 'alert-1',
          type: 'warning' as const,
          title: 'High Memory Usage',
          message: 'Memory usage has exceeded 80%',
          service: 'API Gateway',
          createdAt: '2023-01-01T00:00:00Z',
          resolved: false
        },
        {
          id: 'alert-2',
          type: 'critical' as const,
          title: 'Database Connection Timeout',
          message: 'Database queries are timing out',
          service: 'Database',
          createdAt: '2023-01-01T00:00:00Z',
          resolved: false
        }
      ]
    };

    mockAdminApi.get.mockResolvedValue({ data: mockAlerts });

    const { result } = renderHook(() => useSystemAlerts());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.alerts).toEqual(mockAlerts.alerts);
    expect(result.current.error).toBeNull();
    expect(mockAdminApi.get).toHaveBeenCalledWith('/system/alerts', {
      params: { status: 'active' }
    });
  });

  it('should handle fetch error', async () => {
    const errorMessage = 'Failed to fetch system alerts';
    mockAdminApi.get.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useSystemAlerts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.alerts).toEqual([]);
  });

  it('should acknowledge alert successfully', async () => {
    const mockAlerts = {
      alerts: [
        {
          id: 'alert-1',
          type: 'warning' as const,
          title: 'High Memory Usage',
          message: 'Memory usage has exceeded 80%',
          service: 'API Gateway',
          createdAt: '2023-01-01T00:00:00Z',
          resolved: false
        }
      ]
    };

    mockAdminApi.get.mockResolvedValue({ data: mockAlerts });
    mockAdminApi.post.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useSystemAlerts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Acknowledge the alert
    await result.current.acknowledgeAlert('alert-1');

    expect(mockAdminApi.post).toHaveBeenCalledWith('/system/alerts/alert-1/acknowledge');
    
    // Check that the alert was updated locally
    const acknowledgedAlert = result.current.alerts.find(alert => alert.id === 'alert-1');
    expect(acknowledgedAlert?.acknowledgedAt).toBeDefined();
  });

  it('should handle acknowledge alert error', async () => {
    const mockAlerts = {
      alerts: [
        {
          id: 'alert-1',
          type: 'warning' as const,
          title: 'High Memory Usage',
          message: 'Memory usage has exceeded 80%',
          service: 'API Gateway',
          createdAt: '2023-01-01T00:00:00Z',
          resolved: false
        }
      ]
    };

    mockAdminApi.get.mockResolvedValue({ data: mockAlerts });
    mockAdminApi.post.mockRejectedValue(new Error('Failed to acknowledge'));

    const { result } = renderHook(() => useSystemAlerts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Acknowledge should throw error
    await expect(result.current.acknowledgeAlert('alert-1')).rejects.toThrow('Failed to acknowledge');
  });

  it('should resolve alert successfully', async () => {
    const mockAlerts = {
      alerts: [
        {
          id: 'alert-1',
          type: 'warning' as const,
          title: 'High Memory Usage',
          message: 'Memory usage has exceeded 80%',
          service: 'API Gateway',
          createdAt: '2023-01-01T00:00:00Z',
          resolved: false
        }
      ]
    };

    mockAdminApi.get.mockResolvedValue({ data: mockAlerts });
    mockAdminApi.post.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useSystemAlerts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.alerts).toHaveLength(1);

    // Resolve the alert
    await result.current.resolveAlert('alert-1');

    expect(mockAdminApi.post).toHaveBeenCalledWith('/system/alerts/alert-1/resolve');
    
    // Check that the alert was removed from the list
    expect(result.current.alerts).toHaveLength(0);
  });

  it('should poll for new alerts every 30 seconds', async () => {
    const mockAlerts = {
      alerts: []
    };

    mockAdminApi.get.mockResolvedValue({ data: mockAlerts });

    renderHook(() => useSystemAlerts());

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockAdminApi.get).toHaveBeenCalledTimes(1);
    });

    // Fast-forward time by 30 seconds
    vi.advanceTimersByTime(30000);

    // Wait for the polling fetch
    await waitFor(() => {
      expect(mockAdminApi.get).toHaveBeenCalledTimes(2);
    });
  });

  it('should cleanup polling interval on unmount', async () => {
    const mockAlerts = {
      alerts: []
    };

    mockAdminApi.get.mockResolvedValue({ data: mockAlerts });

    const { unmount } = renderHook(() => useSystemAlerts());

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockAdminApi.get).toHaveBeenCalledTimes(1);
    });

    // Unmount the hook
    unmount();

    // Clear the mock and advance time
    mockAdminApi.get.mockClear();
    vi.advanceTimersByTime(60000);

    // Should not have been called again after unmount
    expect(mockAdminApi.get).not.toHaveBeenCalled();
  });
});