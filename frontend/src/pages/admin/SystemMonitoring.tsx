import React, { useState, useEffect } from 'react';
import { useSystemHealth } from '../../hooks/useSystemHealth';
import { useSystemMetrics } from '../../hooks/useSystemMetrics';
import { useSystemAlerts } from '../../hooks/useSystemAlerts';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import HealthCheckCard from '../../components/admin/HealthCheckCard';
import MetricsChart from '../../components/admin/MetricsChart';
import AlertPanel from '../../components/admin/AlertPanel';
import ErrorTrackingPanel from '../../components/admin/ErrorTrackingPanel';
import AWSHealthDashboard from '../../components/admin/AWSHealthDashboard';
import SystemOverview from '../../components/admin/SystemOverview';
import RealTimeMetrics from '../../components/admin/RealTimeMetrics';
import PerformanceDashboard from '../../components/admin/PerformanceDashboard';
import { 
  ServerIcon, 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  CpuChipIcon,
  CloudIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const SystemMonitoring: React.FC = () => {
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [activeTab, setActiveTab] = useState<'overview' | 'realtime' | 'health' | 'performance' | 'alerts' | 'errors'>('overview');
  
  const { healthChecks, loading: healthLoading, error: healthError, refetch: refetchHealth } = useSystemHealth();
  const { metrics, loading: metricsLoading, error: metricsError } = useSystemMetrics(refreshInterval);
  const { alerts, acknowledgeAlert, loading: alertsLoading } = useSystemAlerts();
  const { awsHealth } = useDashboardMetrics();

  useEffect(() => {
    const interval = setInterval(() => {
      refetchHealth();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, refetchHealth]);

  const handleRefreshIntervalChange = (interval: number) => {
    setRefreshInterval(interval);
  };

  const getOverallSystemStatus = () => {
    if (healthLoading) return 'loading';
    if (healthError) return 'error';
    if (!healthChecks || healthChecks.length === 0) return 'unknown';
    
    const hasUnhealthy = healthChecks.some(check => check.status === 'unhealthy');
    const hasDegraded = healthChecks.some(check => check.status === 'degraded');
    
    if (hasUnhealthy) return 'unhealthy';
    if (hasDegraded) return 'degraded';
    return 'healthy';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy': return 'text-red-600 bg-red-50 border-red-200';
      case 'loading': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      case 'loading': return '🔄';
      default: return '❓';
    }
  };

  const systemStatus = getOverallSystemStatus();

  if (healthLoading && metricsLoading && alertsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with System Status */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(systemStatus)}`}>
            <span className="mr-2">{getStatusIcon(systemStatus)}</span>
            System {systemStatus.charAt(0).toUpperCase() + systemStatus.slice(1)}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={refreshInterval}
            onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
            <option value={60000}>1 minute</option>
            <option value={300000}>5 minutes</option>
          </select>
          <button
            onClick={refetchHealth}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center"
          >
            <span className={`mr-2 ${healthLoading ? 'animate-spin' : ''}`}>🔄</span>
            Refresh Now
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'realtime', label: 'Real-time', icon: EyeIcon },
            { id: 'health', label: 'System Health', icon: ServerIcon },
            { id: 'performance', label: 'Performance', icon: CpuChipIcon },
            { id: 'alerts', label: 'Alerts', icon: ExclamationTriangleIcon, count: alerts?.length },
            { id: 'errors', label: 'Error Tracking', icon: ClockIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
              {tab.count && tab.count > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <SystemOverview
          healthChecks={healthChecks || []}
          environment={{
            type: awsHealth?.environment.type || 'local',
            region: awsHealth?.environment.region || 'localhost',
            version: awsHealth?.environment.version
          }}
          performance={{
            uptime: metrics?.uptime || 0,
            responseTime: healthChecks?.length ? 
              Math.round(healthChecks.reduce((sum, h) => sum + h.responseTime, 0) / healthChecks.length) : 0,
            throughput: metrics?.requestsPerMinute || 0,
            errorRate: metrics?.errorRate?.[metrics.errorRate.length - 1]?.value || 0
          }}
          loading={healthLoading}
        />
      )}

      {activeTab === 'realtime' && (
        <RealTimeMetrics
          metrics={{
            cpu: {
              current: metrics?.cpuUsage?.[metrics.cpuUsage.length - 1]?.value || 0,
              previous: metrics?.cpuUsage?.[metrics.cpuUsage.length - 2]?.value || 0,
              unit: '%',
              threshold: { warning: 70, critical: 90 }
            },
            memory: {
              current: metrics?.memoryUsage?.[metrics.memoryUsage.length - 1]?.value || 0,
              previous: metrics?.memoryUsage?.[metrics.memoryUsage.length - 2]?.value || 0,
              unit: '%',
              threshold: { warning: 80, critical: 95 }
            },
            responseTime: {
              current: metrics?.responseTime?.[metrics.responseTime.length - 1]?.value || 0,
              previous: metrics?.responseTime?.[metrics.responseTime.length - 2]?.value || 0,
              unit: 'ms',
              threshold: { warning: 500, critical: 1000 }
            },
            errorRate: {
              current: metrics?.errorRate?.[metrics.errorRate.length - 1]?.value || 0,
              previous: metrics?.errorRate?.[metrics.errorRate.length - 2]?.value || 0,
              unit: '%',
              threshold: { warning: 1, critical: 5 }
            },
            throughput: {
              current: metrics?.requestsPerMinute || 0,
              previous: (metrics?.requestsPerMinute || 0) * 0.95, // Mock previous value
              unit: 'req/min'
            },
            activeConnections: {
              current: metrics?.activeConnections || 0,
              previous: (metrics?.activeConnections || 0) * 0.98, // Mock previous value
              unit: ''
            }
          }}
          refreshInterval={refreshInterval}
        />
      )}

      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* AWS Health Dashboard Integration */}
          {awsHealth && (
            <AWSHealthDashboard healthData={awsHealth} />
          )}

          {/* Detailed Health Checks */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Health Checks</h2>
            {healthError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-red-800">Failed to load health checks: {healthError}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.isArray(healthChecks) && healthChecks.length > 0 ? (
                healthChecks.map((check) => (
                  <HealthCheckCard key={check.service} healthCheck={check} />
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-gray-500">
                  {healthLoading ? 'Loading health checks...' : 'No health checks available'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <PerformanceDashboard
          metrics={{
            responseTime: metrics?.responseTime || [],
            memoryUsage: metrics?.memoryUsage || [],
            cpuUsage: metrics?.cpuUsage || [],
            errorRate: metrics?.errorRate || []
          }}
          systemStats={{
            uptime: metrics?.uptime || 0,
            activeConnections: metrics?.activeConnections || 0,
            requestsPerMinute: metrics?.requestsPerMinute || 0,
            averageResponseTime: metrics?.responseTime?.length ? 
              metrics.responseTime.reduce((sum, m) => sum + m.value, 0) / metrics.responseTime.length : 0
          }}
          loading={metricsLoading}
          onRefresh={refetchHealth}
        />
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h2>
            {alerts && alerts.length > 0 ? (
              <AlertPanel alerts={alerts} onAcknowledge={acknowledgeAlert} />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p>No active alerts</p>
                <p className="text-sm">All systems are operating normally</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'errors' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Error Tracking</h2>
            <ErrorTrackingPanel />
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemMonitoring;