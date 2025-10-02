import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/adminApi';
import { PlatformMetrics, DashboardChartData, SystemAlert } from '../types/admin';

interface UseDashboardMetricsReturn {
  metrics: PlatformMetrics | null;
  chartData: DashboardChartData | null;
  alerts: SystemAlert[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useDashboardMetrics = (refreshInterval: number = 30000): UseDashboardMetricsReturn => {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [chartData, setChartData] = useState<DashboardChartData | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      const response = await adminApi.getDashboardMetrics();
      
      // Transform the response to match our interface
      const transformedMetrics: PlatformMetrics = {
        totalUsers: response.totalUsers || 0,
        activeListings: response.activeListings || 0,
        pendingModeration: response.pendingModeration || 0,
        systemHealth: response.systemHealth || {
          status: 'healthy',
          uptime: 99.9,
          responseTime: 150,
          errorRate: 0.1
        },
        revenueToday: response.revenueToday || 0,
        newUsersToday: response.newUsersToday || 0,
        newListingsToday: response.newListingsToday || 0,
        activeUsersToday: response.activeUsersToday || 0,
      };

      // Transform chart data
      const transformedChartData: DashboardChartData = {
        userGrowth: response.chartData?.userGrowth || {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'New Users',
            data: [12, 19, 3, 5, 2, 3, 9],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
          }]
        },
        listingActivity: response.chartData?.listingActivity || {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'New Listings',
            data: [5, 8, 12, 7, 9, 6, 11],
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1,
          }]
        },
        systemPerformance: response.chartData?.systemPerformance || {
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
            borderColor: [
              'rgb(34, 197, 94)',
              'rgb(34, 197, 94)',
              'rgb(251, 191, 36)',
              'rgb(34, 197, 94)',
            ],
            borderWidth: 1,
          }]
        }
      };

      const transformedAlerts: SystemAlert[] = response.alerts || [];

      setMetrics(transformedMetrics);
      setChartData(transformedChartData);
      setAlerts(transformedAlerts);
    } catch (err) {
      console.error('Failed to fetch dashboard metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      
      // Set fallback data for development/testing
      setMetrics({
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

      setChartData({
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
            label: 'System Status (%)',
            data: [98, 99, 97, 100],
            backgroundColor: [
              'rgba(34, 197, 94, 0.8)',
              'rgba(34, 197, 94, 0.8)',
              'rgba(251, 191, 36, 0.8)',
              'rgba(34, 197, 94, 0.8)',
            ],
            borderColor: [
              'rgb(34, 197, 94)',
              'rgb(34, 197, 94)',
              'rgb(251, 191, 36)',
              'rgb(34, 197, 94)',
            ],
            borderWidth: 1,
          }]
        }
      });

      setAlerts([
        {
          id: '1',
          type: 'warning',
          title: 'High Storage Usage',
          message: 'Storage usage is at 85% capacity',
          timestamp: new Date().toISOString(),
          acknowledged: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchMetrics();

    // Set up auto-refresh
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMetrics, refreshInterval]);

  return {
    metrics,
    chartData,
    alerts,
    loading,
    error,
    refetch,
  };
};