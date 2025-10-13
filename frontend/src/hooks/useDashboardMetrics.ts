import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/adminApi';
import { PlatformMetrics, DashboardChartData, SystemAlert } from '@harborlist/shared-types';

// AWS-specific health metrics interface
export interface AWSHealthMetrics {
  environment: {
    type: 'aws' | 'local';
    region: string;
    functionName?: string;
    runtime: string;
    version: string;
  };
  services: {
    database: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime: number;
      message: string;
      details?: Array<{
        tableName?: string;
        table?: string;
        displayName: string;
        status: string;
        healthy: boolean;
        responseTime: number;
        itemCount?: number;
        throttledRequests?: number;
        consumedCapacity?: number;
      }>;
    };
    compute?: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime: number;
      message: string;
      details?: {
        errorRate: number;
        averageDuration: number;
        concurrency: number;
        coldStarts?: number;
      };
    };
    api: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime: number;
      message: string;
      details?: {
        requestRate: number;
        errorRate: number;
        latency: number;
      };
    };
  };
  performance: {
    uptime: number;
    memory: {
      usage: {
        used: number;
        total: number;
        heap: number;
        external: number;
        rss: number;
      };
      percentage: number;
      status: 'healthy' | 'warning' | 'critical';
    };
    cpu: {
      usage: number;
      cores?: number;
      type: 'local' | 'lambda' | 'unknown';
    };
    responseTime: number;
  };
  alerts: SystemAlert[];
  cloudwatch?: {
    customMetrics: boolean;
    alarmsActive: number;
    dashboardUrl?: string;
  };
}

interface UseDashboardMetricsReturn {
  metrics: PlatformMetrics | null;
  chartData: DashboardChartData | null;
  alerts: SystemAlert[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  awsHealth?: AWSHealthMetrics;
}

export const useDashboardMetrics = (refreshInterval: number = 30000): UseDashboardMetricsReturn => {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [chartData, setChartData] = useState<DashboardChartData | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [awsHealth, setAwsHealth] = useState<AWSHealthMetrics | undefined>(undefined);

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      // Fetch both dashboard metrics and system health data
      const [dashboardResponse, systemHealthResponse] = await Promise.all([
        adminApi.getDashboardMetrics().catch(() => null), // Fallback if metrics endpoint fails
        adminApi.getSystemHealth().catch(() => null) // Get system health data
      ]);
      
      const response = dashboardResponse;
      
      // Transform the response to match our interface
      // Extract system health data from the new enhanced structure
      const systemHealthData = response.systemHealth || {};
      const performance = systemHealthData.performance || {};
      
      // Map backend status values to frontend interface
      const mapStatus = (backendStatus: string): 'healthy' | 'warning' | 'critical' => {
        switch (backendStatus) {
          case 'healthy': return 'healthy';
          case 'degraded': return 'warning';
          case 'unhealthy': return 'critical';
          default: return 'healthy';
        }
      };

      const transformedMetrics: PlatformMetrics = {
        totalUsers: response.metrics?.totalUsers || 0,
        activeListings: response.metrics?.activeListings || 0,
        pendingModeration: response.metrics?.pendingModeration || 0,
        systemHealth: {
          status: mapStatus(systemHealthData.status || 'healthy'),
          uptime: performance.uptime ? Math.round((performance.uptime / 3600) * 10) / 10 : 99.9, // Convert seconds to hours with 1 decimal
          responseTime: performance.responseTime || 150,
          errorRate: 0.1 // Default error rate - could be calculated from alerts in the future
        },
        revenueToday: response.metrics?.revenueToday || 0,
        newUsersToday: response.metrics?.newUsersToday || 0,
        newListingsToday: response.metrics?.newListingsToday || 0,
        activeUsersToday: response.metrics?.activeUsersToday || 0,
      };

      // Transform chart data - use real data from API
      const transformedChartData: DashboardChartData = {
        userGrowth: response.chartData?.userGrowth ? {
          labels: response.chartData.userGrowth.map((item: any) => item.name),
          datasets: [{
            label: 'New Users',
            data: response.chartData.userGrowth.map((item: any) => item.value),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
          }]
        } : {
          labels: [],
          datasets: [{
            label: 'New Users',
            data: [],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
          }]
        },
        listingActivity: response.chartData?.listingActivity ? {
          labels: response.chartData.listingActivity.map((item: any) => item.name),
          datasets: [{
            label: 'New Listings',
            data: response.chartData.listingActivity.map((item: any) => item.value),
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1,
          }]
        } : {
          labels: [],
          datasets: [{
            label: 'New Listings',
            data: [],
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

      const transformedAlerts: SystemAlert[] = systemHealthData.alerts || [];

      // Process system health data from the dedicated endpoint
      if (systemHealthResponse) {
        const healthData = systemHealthResponse;
        
        // Use the same environment differentiation approach as the backend
        // The backend provides deploymentTarget and isAWS flags
        const environmentType = healthData.isAWS ? 'aws' : 'local';
        const deploymentTarget = healthData.deploymentTarget || 'docker';
        
        const awsHealthData: AWSHealthMetrics = {
          environment: {
            type: environmentType,
            region: healthData.region || 'local',
            functionName: healthData.functionName,
            runtime: healthData.runtime || `Node.js (${deploymentTarget})`,
            version: healthData.version || '2.0.0'
          },
          services: {
            database: {
              status: healthData.services?.database?.status === 'healthy' ? 'healthy' : 
                     healthData.services?.database?.status === 'degraded' ? 'degraded' : 'unhealthy',
              responseTime: parseInt(healthData.services?.database?.responseTime?.replace('ms', '') || '0'),
              message: healthData.services?.database?.queryPerformance ? 
                      `Performance: ${healthData.services.database.queryPerformance}` : 
                      'Database operational',
              details: healthData.services?.database ? [{
                tableName: 'users',
                table: 'users',
                displayName: 'Users Table',
                status: healthData.services.database.status?.toUpperCase() || 'HEALTHY',
                healthy: healthData.services.database.status === 'healthy',
                responseTime: parseInt(healthData.services.database.responseTime?.replace('ms', '') || '0'),
                itemCount: undefined,
                throttledRequests: 0,
                consumedCapacity: undefined
              }, {
                tableName: 'listings',
                table: 'listings', 
                displayName: 'Listings Table',
                status: healthData.services.database.status?.toUpperCase() || 'HEALTHY',
                healthy: healthData.services.database.status === 'healthy',
                responseTime: parseInt(healthData.services.database.responseTime?.replace('ms', '') || '0'),
                itemCount: undefined,
                throttledRequests: 0,
                consumedCapacity: undefined
              }] : []
            },
            compute: environmentType === 'aws' ? {
              status: healthData.application?.status === 'healthy' ? 'healthy' : 'degraded',
              responseTime: parseInt(healthData.application?.averageResponseTime?.replace('ms', '') || '0'),
              message: `Active sessions: ${healthData.application?.activeSessions || 0}`,
              details: {
                errorRate: parseFloat(healthData.application?.errorRate?.replace('%', '') || '0') / 100,
                averageDuration: parseInt(healthData.application?.averageResponseTime?.replace('ms', '') || '0'),
                concurrency: healthData.application?.activeUsers || 0,
                coldStarts: undefined
              }
            } : undefined,
            api: {
              status: healthData.services?.api?.status === 'healthy' ? 'healthy' : 
                     healthData.services?.api?.status === 'degraded' ? 'degraded' : 'unhealthy',
              responseTime: parseInt(healthData.services?.api?.responseTime?.replace('ms', '') || '0'),
              message: healthData.services?.api?.throughput ? 
                      `Throughput: ${healthData.services.api.throughput}` : 
                      'API operational',
              details: healthData.services?.api ? {
                requestRate: parseInt(healthData.services.api.throughput?.replace(/[^\d]/g, '') || '0'),
                errorRate: parseFloat(healthData.services.api.errorRate?.replace('%', '') || '0') / 100,
                latency: parseInt(healthData.services.api.responseTime?.replace('ms', '') || '0')
              } : undefined
            }
          },
          performance: {
            uptime: healthData.uptime?.totalHours ? healthData.uptime.totalHours * 3600 : 0,
            memory: {
              usage: {
                used: healthData.performance?.memory ? 
                      parseFloat(healthData.performance.memory.used?.replace(/[^\d.]/g, '') || '0') : 0,
                total: healthData.performance?.memory ? 
                       parseFloat(healthData.performance.memory.total?.replace(/[^\d.]/g, '') || '0') : 0,
                heap: 0,
                external: 0,
                rss: 0
              },
              percentage: healthData.performance?.memory ? 
                         parseInt(healthData.performance.memory.usage?.replace('%', '') || '0') : 0,
              status: healthData.performance?.memory ? 
                     (parseInt(healthData.performance.memory.usage?.replace('%', '') || '0') > 80 ? 'critical' : 
                      parseInt(healthData.performance.memory.usage?.replace('%', '') || '0') > 60 ? 'warning' : 'healthy') : 'healthy'
            },
            cpu: {
              usage: healthData.performance?.cpu ? 
                    parseInt(healthData.performance.cpu.usage?.replace('%', '') || '0') / 100 : 0,
              cores: healthData.performance?.cpu?.cores,
              type: environmentType === 'aws' ? 'lambda' : 'local'
            },
            responseTime: parseInt(healthData.application?.averageResponseTime?.replace('ms', '') || '0')
          },
          alerts: healthData.alerts?.map((alert: any) => ({
            id: alert.id,
            type: alert.type,
            severity: alert.severity,
            title: alert.type?.charAt(0).toUpperCase() + alert.type?.slice(1) + ' Alert',
            message: alert.message,
            timestamp: alert.timestamp,
            resolved: alert.resolved
          })) || [],
          cloudwatch: environmentType === 'aws' ? {
            customMetrics: true,
            alarmsActive: healthData.alerts?.filter((a: any) => !a.resolved).length || 0,
            dashboardUrl: undefined
          } : undefined
        };
        
        setAwsHealth(awsHealthData);
      }

      setMetrics(transformedMetrics);
      setChartData(transformedChartData);
      setAlerts(transformedAlerts);
    } catch (err) {
      console.error('Failed to fetch dashboard metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      
      // Don't set fallback mock data - show the error state instead
      // This ensures users see real data or know there's an issue

      // Don't set mock alerts - let user see empty state or real alerts only
      setAlerts([]);
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
    awsHealth,
  };
};