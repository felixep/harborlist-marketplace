import React, { useState } from 'react';
import { 
  ChartBarIcon, 
  ClockIcon, 
  CpuChipIcon, 
  ServerIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import MetricsChart from './MetricsChart';
import { MetricDataPoint } from '../../hooks/useSystemMetrics';

interface PerformanceDashboardProps {
  metrics: {
    responseTime: MetricDataPoint[];
    memoryUsage: MetricDataPoint[];
    cpuUsage: MetricDataPoint[];
    errorRate: MetricDataPoint[];
    throughput?: MetricDataPoint[];
    diskUsage?: MetricDataPoint[];
    networkIO?: MetricDataPoint[];
  };
  systemStats: {
    uptime: number;
    activeConnections: number;
    requestsPerMinute: number;
    totalRequests?: number;
    averageResponseTime?: number;
  };
  loading?: boolean;
  onRefresh?: () => void;
}

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
}> = ({ title, value, subtitle, icon, color, trend }) => {
  const getTrendColor = () => {
    if (!trend) return '';
    switch (trend.direction) {
      case 'up': return 'text-red-600';
      case 'down': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="mr-4" style={{ color }}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>
        {trend && (
          <div className={`text-right ${getTrendColor()}`}>
            <div className="flex items-center text-sm">
              {trend.direction === 'up' && (
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 4.414 6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {trend.direction === 'down' && (
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 15.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {Math.abs(trend.value).toFixed(1)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  metrics,
  systemStats,
  loading = false,
  onRefresh
}) => {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getCurrentValue = (data: MetricDataPoint[]) => {
    return data && data.length > 0 ? data[data.length - 1].value : 0;
  };

  const getPreviousValue = (data: MetricDataPoint[]) => {
    return data && data.length > 1 ? data[data.length - 2].value : 0;
  };

  const getTrend = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, direction: 'stable' as const };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      direction: change > 5 ? 'up' as const : change < -5 ? 'down' as const : 'stable' as const
    };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Performance Dashboard</h2>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* System Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="System Uptime"
          value={formatUptime(systemStats.uptime)}
          subtitle="Since last restart"
          icon={<ClockIcon className="h-8 w-8" />}
          color="#10B981"
        />
        
        <StatCard
          title="Active Connections"
          value={systemStats.activeConnections}
          subtitle="Current sessions"
          icon={<ServerIcon className="h-8 w-8" />}
          color="#3B82F6"
        />
        
        <StatCard
          title="Requests/Minute"
          value={systemStats.requestsPerMinute}
          subtitle="Current throughput"
          icon={<ChartBarIcon className="h-8 w-8" />}
          color="#8B5CF6"
          trend={getTrend(
            systemStats.requestsPerMinute,
            systemStats.requestsPerMinute * 0.9 // Mock previous value
          )}
        />
        
        <StatCard
          title="Avg Response Time"
          value={`${getCurrentValue(metrics.responseTime).toFixed(0)}ms`}
          subtitle="Last measurement"
          icon={<CpuChipIcon className="h-8 w-8" />}
          color="#F59E0B"
          trend={getTrend(
            getCurrentValue(metrics.responseTime),
            getPreviousValue(metrics.responseTime)
          )}
        />
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsChart
          title="API Response Time"
          data={metrics.responseTime}
          type="line"
          unit="ms"
          color="#3B82F6"
          height={250}
        />
        
        <MetricsChart
          title="Memory Usage"
          data={metrics.memoryUsage}
          type="area"
          unit="%"
          color="#10B981"
          height={250}
        />
        
        <MetricsChart
          title="CPU Usage"
          data={metrics.cpuUsage}
          type="line"
          unit="%"
          color="#F59E0B"
          height={250}
        />
        
        <MetricsChart
          title="Error Rate"
          data={metrics.errorRate}
          type="bar"
          unit="%"
          color="#EF4444"
          height={250}
        />
      </div>

      {/* Additional Metrics (if available) */}
      {(metrics.throughput || metrics.diskUsage || metrics.networkIO) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {metrics.throughput && (
            <MetricsChart
              title="Throughput"
              data={metrics.throughput}
              type="area"
              unit="req/s"
              color="#8B5CF6"
              height={200}
            />
          )}
          
          {metrics.diskUsage && (
            <MetricsChart
              title="Disk Usage"
              data={metrics.diskUsage}
              type="line"
              unit="%"
              color="#06B6D4"
              height={200}
            />
          )}
          
          {metrics.networkIO && (
            <MetricsChart
              title="Network I/O"
              data={metrics.networkIO}
              type="area"
              unit="MB/s"
              color="#84CC16"
              height={200}
            />
          )}
        </div>
      )}

      {/* Performance Summary */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Response Time</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Current:</span>
                <span className="font-medium">{getCurrentValue(metrics.responseTime).toFixed(0)}ms</span>
              </div>
              <div className="flex justify-between">
                <span>Average:</span>
                <span className="font-medium">
                  {systemStats.averageResponseTime?.toFixed(0) || 'N/A'}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span>Target:</span>
                <span className="font-medium text-green-600">&lt; 200ms</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-2">System Resources</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>CPU:</span>
                <span className="font-medium">{getCurrentValue(metrics.cpuUsage).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Memory:</span>
                <span className="font-medium">{getCurrentValue(metrics.memoryUsage).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Connections:</span>
                <span className="font-medium">{systemStats.activeConnections}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Traffic & Errors</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Requests/min:</span>
                <span className="font-medium">{systemStats.requestsPerMinute}</span>
              </div>
              <div className="flex justify-between">
                <span>Error Rate:</span>
                <span className="font-medium">{getCurrentValue(metrics.errorRate).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Total Requests:</span>
                <span className="font-medium">{formatNumber(systemStats.totalRequests || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;