import { useState, useCallback } from 'react';
import { adminApi } from '../services/adminApi';
import { AuditLog, AuditLogStats } from '@harborlist/shared-types';

interface UseAuditLogsParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

interface AuditLogsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ExportParams {
  format: 'csv' | 'json';
  startDate: string;
  endDate: string;
  userId?: string;
  action?: string;
  resource?: string;
}

export const useAuditLogs = (params: UseAuditLogsParams) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<AuditLogsPagination | null>(null);
  const [stats, setStats] = useState<AuditLogStats | null>(null);

  const refreshLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', params.page.toString());
      queryParams.append('limit', params.limit.toString());
      
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      if (params.userId) queryParams.append('userId', params.userId);
      if (params.action) queryParams.append('action', params.action);
      if (params.resource) queryParams.append('resource', params.resource);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.search) queryParams.append('search', params.search);

      const response = await adminApi.get(`/audit-logs?${queryParams.toString()}`);
      
      if (response.data) {
        setAuditLogs((response.data as any).auditLogs || []);
        setPagination((response.data as any).pagination);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
      setAuditLogs([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [params]);

  const loadStats = useCallback(async (timeRange: string = '7d') => {
    try {
      const response = await adminApi.get(`/audit-logs/stats?timeRange=${timeRange}`);
      setStats(response.data as AuditLogStats);
    } catch (err) {
      console.error('Error fetching audit log stats:', err);
    }
  }, []);

  const exportLogs = useCallback(async (exportParams: ExportParams) => {
    try {
      setLoading(true);
      const response = await adminApi.post('/audit-logs/export', exportParams);
      
      if (response.data) {
        // Create and download file
        const blob = new Blob([(response.data as any).data], {
          type: exportParams.format === 'csv' ? 'text/csv' : 'application/json'
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = (response.data as any).filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return {
          success: true,
          filename: (response.data as any).filename,
          recordCount: (response.data as any).recordCount
        };
      }
    } catch (err) {
      console.error('Error exporting audit logs:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchLogs = useCallback(async (searchTerm: string) => {
    const searchParams = {
      ...params,
      search: searchTerm,
      page: 1 // Reset to first page for search
    };

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', '1');
      queryParams.append('limit', searchParams.limit.toString());
      queryParams.append('search', searchTerm);
      
      if (searchParams.sortBy) queryParams.append('sortBy', searchParams.sortBy);
      if (searchParams.sortOrder) queryParams.append('sortOrder', searchParams.sortOrder);

      const response = await adminApi.get(`/audit-logs?${queryParams.toString()}`);
      
      if (response.data) {
        setAuditLogs((response.data as any).auditLogs || []);
        setPagination((response.data as any).pagination);
      }
    } catch (err) {
      console.error('Error searching audit logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to search audit logs');
    } finally {
      setLoading(false);
    }
  }, [params]);

  const getLogDetails = useCallback(async (logId: string) => {
    try {
      const response = await adminApi.get(`/audit-logs/${logId}`);
      return response.data;
    } catch (err) {
      console.error('Error fetching audit log details:', err);
      throw err;
    }
  }, []);

  return {
    auditLogs,
    loading,
    error,
    pagination,
    stats,
    refreshLogs,
    loadStats,
    exportLogs,
    searchLogs,
    getLogDetails
  };
};

export default useAuditLogs;