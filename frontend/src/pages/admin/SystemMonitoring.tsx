import React, { useState, useEffect } from 'react';
import { useSystemHealth } from '../../hooks/useSystemHealth';
import { useSystemMetrics } from '../../hooks/useSystemMetrics';
import { useSystemAlerts } from '../../hooks/useSystemAlerts';
import HealthCheckCard from '../../components/admin/HealthCheckCard';
import MetricsChart from '../../components/admin/MetricsChart';
import AlertPanel from '../../components/admin/AlertPanel';
import ErrorTrackingPanel from '../../components/admin/ErrorTrackingPanel';

const SystemMonitoring: React.FC = () => {
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const { healthChecks, loading: healthLoading, error: healthError, refetch: refetchHealth } = useSystemHealth();
  const { metrics, loading: metricsLoading, error: metricsError } = useSystemMetrics(refreshInterval);
  const { alerts, acknowledgeAlert, loading: alertsLoading } = useSystemAlerts();

  useEffect(() => {
    const interval = setInterval(() => {
      refetchHealth();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, refetchHealth]);

  const handleRefreshIntervalChange = (interval: number) => {
    setRefreshInterval(interval);
  };

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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
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
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Health Checks Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health</h2>
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

      {/* Alerts Section */}
      {alerts && alerts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Alerts</h2>
          <AlertPanel alerts={alerts} onAcknowledge={acknowledgeAlert} />
        </div>
      )}

      {/* Performance Metrics Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h2>
        {metricsError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-red-800">Failed to load metrics: {metricsError}</p>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MetricsChart
            title="API Response Time"
            data={metrics?.responseTime || []}
            type="line"
            unit="ms"
            color="#3B82F6"
          />
          <MetricsChart
            title="Memory Usage"
            data={metrics?.memoryUsage || []}
            type="area"
            unit="%"
            color="#10B981"
          />
          <MetricsChart
            title="CPU Usage"
            data={metrics?.cpuUsage || []}
            type="line"
            unit="%"
            color="#F59E0B"
          />
          <MetricsChart
            title="Error Rate"
            data={metrics?.errorRate || []}
            type="bar"
            unit="%"
            color="#EF4444"
          />
        </div>
      </div>

      {/* Error Tracking Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Error Tracking</h2>
        <ErrorTrackingPanel />
      </div>
    </div>
  );
};

export default SystemMonitoring;