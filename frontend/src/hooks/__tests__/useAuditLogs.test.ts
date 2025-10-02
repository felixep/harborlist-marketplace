import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAuditLogs } from '../useAuditLogs';
import { AuditLog } from '@harborlist/shared-types';

// Mock the adminApi
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../../services/adminApi', () => ({
  adminApi: {
    get: mockGet,
    post: mockPost,
    put: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock data
const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    userId: 'user-1',
    userEmail: 'admin@example.com',
    action: 'VIEW_USERS',
    resource: 'users',
    resourceId: undefined,
    details: { path: '/admin/users', method: 'GET' },
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

describe('useAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch audit logs successfully', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        auditLogs: mockAuditLogs,
        pagination: mockPagination
      }
    });

    const { result } = renderHook(() => useAuditLogs({
      page: 1,
      limit: 50
    }));

    expect(result.current.loading).toBe(false);
    expect(result.current.auditLogs).toEqual([]);

    await act(async () => {
      await result.current.refreshLogs();
    });

    expect(mockGet).toHaveBeenCalledWith('/audit-logs?page=1&limit=50');
    expect(result.current.auditLogs).toEqual(mockAuditLogs);
    expect(result.current.pagination).toEqual(mockPagination);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle API errors gracefully', async () => {
    const errorMessage = 'Failed to fetch audit logs';
    mockGet.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useAuditLogs({
      page: 1,
      limit: 50
    }));

    await act(async () => {
      await result.current.refreshLogs();
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.auditLogs).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should build correct query parameters with filters', async () => {
    mockedAdminApi.get.mockResolvedValueOnce({
      data: {
        auditLogs: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }
      }
    });

    const { result } = renderHook(() => useAuditLogs({
      page: 2,
      limit: 25,
      sortBy: 'action',
      sortOrder: 'asc',
      userId: 'user-123',
      action: 'VIEW_USERS',
      resource: 'users',
      startDate: '2023-12-01',
      endDate: '2023-12-02',
      search: 'admin@example.com'
    }));

    await act(async () => {
      await result.current.refreshLogs();
    });

    expect(mockedAdminApi.get).toHaveBeenCalledWith(
      '/audit-logs?page=2&limit=25&sortBy=action&sortOrder=asc&userId=user-123&action=VIEW_USERS&resource=users&startDate=2023-12-01&endDate=2023-12-02&search=admin%40example.com'
    );
  });

  it('should load stats successfully', async () => {
    mockedAdminApi.get.mockResolvedValueOnce({
      data: mockStats
    });

    const { result } = renderHook(() => useAuditLogs({
      page: 1,
      limit: 50
    }));

    await act(async () => {
      await result.current.loadStats('30d');
    });

    expect(mockedAdminApi.get).toHaveBeenCalledWith('/audit-logs/stats?timeRange=30d');
    expect(result.current.stats).toEqual(mockStats);
  });

  it('should export logs successfully', async () => {
    const mockExportResponse = {
      data: 'id,userId,userEmail,action\n1,user-1,admin@example.com,VIEW_USERS',
      filename: 'audit-logs-2023-12-01.csv',
      recordCount: 1
    };

    mockedAdminApi.post.mockResolvedValueOnce({
      data: mockExportResponse
    });

    // Mock URL and DOM methods
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    const mockRevokeObjectURL = vi.fn();
    const mockClick = vi.fn();
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();

    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL
      }
    });

    const mockLink = {
      href: '',
      download: '',
      click: mockClick
    };

    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

    const { result } = renderHook(() => useAuditLogs({
      page: 1,
      limit: 50
    }));

    let exportResult;
    await act(async () => {
      exportResult = await result.current.exportLogs({
        format: 'csv',
        startDate: '2023-12-01',
        endDate: '2023-12-02'
      });
    });

    expect(mockedAdminApi.post).toHaveBeenCalledWith('/audit-logs/export', {
      format: 'csv',
      startDate: '2023-12-01',
      endDate: '2023-12-02'
    });

    expect(exportResult).toEqual({
      success: true,
      filename: 'audit-logs-2023-12-01.csv',
      recordCount: 1
    });

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('should search logs with correct parameters', async () => {
    mockedAdminApi.get.mockResolvedValueOnce({
      data: {
        auditLogs: mockAuditLogs.slice(0, 1),
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }
      }
    });

    const { result } = renderHook(() => useAuditLogs({
      page: 1,
      limit: 50,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    }));

    await act(async () => {
      await result.current.searchLogs('admin@example.com');
    });

    expect(mockedAdminApi.get).toHaveBeenCalledWith(
      '/audit-logs?page=1&limit=50&search=admin%40example.com&sortBy=timestamp&sortOrder=desc'
    );
  });

  it('should get log details successfully', async () => {
    const mockLogDetails = {
      ...mockAuditLogs[0],
      additionalDetails: {
        requestHeaders: { 'User-Agent': 'Mozilla/5.0' },
        responseStatus: 200
      }
    };

    mockedAdminApi.get.mockResolvedValueOnce({
      data: mockLogDetails
    });

    const { result } = renderHook(() => useAuditLogs({
      page: 1,
      limit: 50
    }));

    let logDetails;
    await act(async () => {
      logDetails = await result.current.getLogDetails('1');
    });

    expect(mockedAdminApi.get).toHaveBeenCalledWith('/audit-logs/1');
    expect(logDetails).toEqual(mockLogDetails);
  });

  it('should handle export errors', async () => {
    mockedAdminApi.post.mockRejectedValueOnce(new Error('Export failed'));

    const { result } = renderHook(() => useAuditLogs({
      page: 1,
      limit: 50
    }));

    await act(async () => {
      await expect(result.current.exportLogs({
        format: 'csv',
        startDate: '2023-12-01',
        endDate: '2023-12-02'
      })).rejects.toThrow('Export failed');
    });
  });
});