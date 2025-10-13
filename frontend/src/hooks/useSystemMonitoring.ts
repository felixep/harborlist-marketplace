/**
 * @fileoverview Unified system monitoring hook for admin dashboard.
 * 
 * Consolidates all system monitoring data into a single source of truth,
 * eliminating data inconsistencies and reducing API calls.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/adminApi';

// Unified interfaces for system monitoring data
export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: string;
  message?: string;
  details?: Record<string, any>;
}

export interface MetricDataPoint {
  timestamp: string;
  value: number;
}

export interface SystemAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  service: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface SystemMonitoringData {
  // Health data
  healthChecks: HealthCheck[];
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  
  // Performance metrics (time series)
  metrics: {
    responseTime: MetricDataPoint[];
    memoryUsage: MetricDataPoint[];
    cpuUsage: MetricDataPoint[];
    errorRate: MetricDataPoint[];
    uptime: number;
    activeConnections: number;
    requestsPerMinute: number;
  };
  
  // Alerts
  alerts: SystemAlert[];
  
  // Environment info (comprehensive)
  environment: {
    type: 'local' | 'aws';
    region: string;
    version?: string;
    deploymentTarget: 'docker' | 'lambda' | 'ec2' | 'ecs';
    isAWS: boolean;
    isDocker: boolean;
    runtime?: string;
  };
  
  // Last updated timestamp
  lastUpdated: string;
}

interface UseSystemMonitoringReturn {
  data: SystemMonitoringData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string) => Promise<void>;
}

/**
 * Unified system monitoring hook
 * 
 * Fetches all system monitoring data from a single source to ensure consistency.
 * Combines health checks, performance metrics, and alerts into one cohesive data structure.
 * 
 * @param refreshInterval - Auto-refresh interval in milliseconds (default: 30000)
 * @returns Unified system monitoring data and control methods
 */
export const useSystemMonitoring = (refreshInterval: number = 30000): UseSystemMonitoringReturn => {
  const [data, setData] = useState<SystemMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemData = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch all data in parallel for better performance
      const [healthResponse, metricsResponse, alertsResponse] = await Promise.all([
        adminApi.getSystemHealth(),
        adminApi.getSystemMetricsDetailed({ timeRange: '1h', granularity: 'minute' }),
        adminApi.getSystemAlerts({ status: 'active' })
      ]);

      // Construct unified data structure with comprehensive environment info
      const unifiedData: SystemMonitoringData = {
        // Health data
        healthChecks: healthResponse.healthChecks || [],
        overallStatus: healthResponse.overallStatus || 'unknown',
        
        // Metrics data
        metrics: {
          responseTime: metricsResponse.responseTime || [],
          memoryUsage: metricsResponse.memoryUsage || [],
          cpuUsage: metricsResponse.cpuUsage || [],
          errorRate: metricsResponse.errorRate || [],
          uptime: metricsResponse.uptime || 0,
          activeConnections: metricsResponse.activeConnections || 0,
          requestsPerMinute: metricsResponse.requestsPerMinute || 0
        },
        
        // Alerts data
        alerts: alertsResponse.alerts || [],
        
        // Environment data (from health response and metrics metadata)
        environment: {
          type: healthResponse.environment === 'local' ? 'local' : 'aws',
          region: healthResponse.region || 'localhost',
          version: healthResponse.version,
          deploymentTarget: healthResponse.deploymentTarget || 'docker',
          isAWS: healthResponse.isAWS || false,
          isDocker: healthResponse.isDocker || false,
          runtime: metricsResponse._metadata?.environment?.deployment || 
                  (healthResponse.isDocker ? 'Node.js (Docker)' : 
                   healthResponse.isAWS ? 'Node.js (Lambda)' : 'Node.js (Local)')
        },
        
        // Timestamp
        lastUpdated: new Date().toISOString()
      };

      setData(unifiedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch system monitoring data';
      setError(errorMessage);
      console.error('Failed to fetch system monitoring data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      await adminApi.acknowledgeAlert(alertId);
      
      // Update local state
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          alerts: prev.alerts.map(alert => 
            alert.id === alertId 
              ? { ...alert, acknowledgedAt: new Date().toISOString() }
              : alert
          )
        };
      });
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
      throw err;
    }
  }, []);

  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      await adminApi.resolveAlert(alertId);
      
      // Update local state
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          alerts: prev.alerts.filter(alert => alert.id !== alertId)
        };
      });
    } catch (err) {
      console.error('Failed to resolve alert:', err);
      throw err;
    }
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchSystemData();
  }, [fetchSystemData]);

  useEffect(() => {
    fetchSystemData();

    // Set up auto-refresh
    const interval = setInterval(fetchSystemData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchSystemData, refreshInterval]);

  return {
    data,
    loading,
    error,
    refetch,
    acknowledgeAlert,
    resolveAlert,
  };
};