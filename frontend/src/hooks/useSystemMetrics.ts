import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/adminApi';

export interface MetricDataPoint {
  timestamp: string;
  value: number;
}

export interface SystemMetrics {
  responseTime: MetricDataPoint[];
  memoryUsage: MetricDataPoint[];
  cpuUsage: MetricDataPoint[];
  errorRate: MetricDataPoint[];
  uptime: number;
  activeConnections: number;
  requestsPerMinute: number;
}

export const useSystemMetrics = (refreshInterval: number = 30000) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      const params = {
        timeRange: '1h',
        granularity: 'minute'
      };
      const response = await adminApi.getSystemMetricsDetailed(params);
      setMetrics(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system metrics');
      console.error('Failed to fetch system metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMetrics, refreshInterval]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics,
  };
};