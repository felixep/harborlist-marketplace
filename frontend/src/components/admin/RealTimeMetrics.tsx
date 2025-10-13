import React, { useState, useEffect } from 'react';
import { 
  CpuChipIcon, 
  ServerIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

interface MetricValue {
  current: number;
  previous: number;
  unit: string;
  threshold?: {
    warning: number;
    critical: number;
  };
}

interface RealTimeMetricsProps {
  metrics: {
    cpu: MetricValue;
    memory: MetricValue;
    responseTime: MetricValue;
    errorRate: MetricValue;
    throughput: MetricValue;
    activeConnections: MetricValue;
  };
  environment?: {
    type: 'local' | 'aws';
    isAWS: boolean;
    isDocker: boolean;
    deploymentTarget: string;
  };
  refreshInterval?: number;
}

const MetricCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  metric: MetricValue;
  color: string;
}> = ({ title, icon, metric, color }) => {
  const change = metric.current - metric.previous;
  const changePercent = metric.previous !== 0 ? (change / metric.previous) * 100 : 0;
  
  const getStatus = () => {
    if (!metric.threshold) return 'normal';
    if (metric.current >= metric.threshold.critical) return 'critical';
    if (metric.current >= metric.threshold.warning) return 'warning';
    return 'normal';
  };

  const status = getStatus();
  
  const getStatusColor = () => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const formatValue = (value: number) => {
    if (metric.unit === '%') {
      return `${value.toFixed(1)}%`;
    } else if (metric.unit === 'ms') {
      return value < 1000 ? `${value.toFixed(0)}ms` : `${(value / 1000).toFixed(2)}s`;
    } else if (metric.unit === 'req/min') {
      return `${value.toFixed(0)} req/min`;
    }
    return `${value.toFixed(1)}${metric.unit}`;
  };

  return (
    <div className={`bg-white rounded-lg border p-4 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div className="mr-3" style={{ color }}>
            {icon}
          </div>
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        <div className="flex items-center">
          {status === 'critical' && <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />}
          {status === 'warning' && <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />}
          {status === 'normal' && <CheckCircleIcon className="h-4 w-4 text-green-600" />}
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-900">
            {formatValue(metric.current)}
          </div>
          {change !== 0 && (
            <div className={`text-sm flex items-center mt-1 ${
              change > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {change > 0 ? (
                <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-3 w-3 mr-1" />
              )}
              {Math.abs(changePercent).toFixed(1)}%
            </div>
          )}
        </div>
        
        {metric.threshold && (
          <div className="text-xs text-gray-500 text-right">
            <div>Warn: {formatValue(metric.threshold.warning)}</div>
            <div>Crit: {formatValue(metric.threshold.critical)}</div>
          </div>
        )}
      </div>
    </div>
  );
};

const RealTimeMetrics: React.FC<RealTimeMetricsProps> = ({ 
  metrics, 
  environment,
  refreshInterval = 5000 
}) => {
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getOverallHealth = () => {
    const criticalCount = Object.values(metrics).filter(metric => 
      metric.threshold && metric.current >= metric.threshold.critical
    ).length;
    
    const warningCount = Object.values(metrics).filter(metric => 
      metric.threshold && metric.current >= metric.threshold.warning && 
      metric.current < (metric.threshold.critical || Infinity)
    ).length;

    if (criticalCount > 0) return { status: 'critical', count: criticalCount };
    if (warningCount > 0) return { status: 'warning', count: warningCount };
    return { status: 'healthy', count: 0 };
  };

  const health = getOverallHealth();

  return (
    <div className="space-y-6">
      {/* Overall Health Status */}
      <div className={`rounded-lg p-4 border ${
        health.status === 'critical' ? 'bg-red-50 border-red-200' :
        health.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
        'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`mr-3 ${
              health.status === 'critical' ? 'text-red-600' :
              health.status === 'warning' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {health.status === 'critical' && <ExclamationTriangleIcon className="h-6 w-6" />}
              {health.status === 'warning' && <ExclamationTriangleIcon className="h-6 w-6" />}
              {health.status === 'healthy' && <CheckCircleIcon className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                System Status: {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
              </h2>
              <p className="text-sm opacity-75">
                {health.status === 'healthy' 
                  ? `All metrics within normal ranges • ${environment?.isAWS ? 'AWS Cloud' : 'Docker Local'}`
                  : `${health.count} metric${health.count > 1 ? 's' : ''} require attention • ${environment?.isAWS ? 'AWS Cloud' : 'Docker Local'}`
                }
              </p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>Last updated</div>
            <div>{lastUpdate.toLocaleTimeString()}</div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="CPU Usage"
          icon={<CpuChipIcon className="h-6 w-6" />}
          metric={metrics.cpu}
          color="#F59E0B"
        />
        
        <MetricCard
          title="Memory Usage"
          icon={<ServerIcon className="h-6 w-6" />}
          metric={metrics.memory}
          color="#10B981"
        />
        
        <MetricCard
          title="Response Time"
          icon={<ClockIcon className="h-6 w-6" />}
          metric={metrics.responseTime}
          color="#3B82F6"
        />
        
        <MetricCard
          title="Error Rate"
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          metric={metrics.errorRate}
          color="#EF4444"
        />
        
        <MetricCard
          title="Throughput"
          icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
          metric={metrics.throughput}
          color="#8B5CF6"
        />
        
        <MetricCard
          title="Active Connections"
          icon={<ServerIcon className="h-6 w-6" />}
          metric={metrics.activeConnections}
          color="#06B6D4"
        />
      </div>
    </div>
  );
};

export default RealTimeMetrics;