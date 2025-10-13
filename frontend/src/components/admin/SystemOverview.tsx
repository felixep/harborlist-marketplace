import React from 'react';
import { 
  ServerIcon, 
  CloudIcon, 
  DatabaseIcon, 
  CpuChipIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SignalIcon
} from '@heroicons/react/24/outline';
import { HealthCheck } from '../../hooks/useSystemHealth';

interface SystemOverviewProps {
  healthChecks: HealthCheck[];
  environment: {
    type: string;
    region: string;
    version?: string;
  };
  performance: {
    uptime: number;
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
  loading?: boolean;
}

const ServiceStatusCard: React.FC<{
  service: HealthCheck;
  icon: React.ReactNode;
}> = ({ service, icon }) => {
  const getStatusColor = () => {
    switch (service.status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (service.status) {
      case 'healthy': return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'degraded': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy': return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      default: return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className="mr-3">
            {icon}
          </div>
          <div>
            <h3 className="font-medium capitalize">{service.service}</h3>
            <p className="text-sm opacity-75">{service.message}</p>
          </div>
        </div>
        {getStatusIcon()}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-xs opacity-75">Response Time</span>
          <p className="font-medium">{service.responseTime}ms</p>
        </div>
        <div>
          <span className="text-xs opacity-75">Last Check</span>
          <p className="font-medium text-xs">
            {new Date(service.lastCheck).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {service.details && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <div className="text-sm space-y-1">
            {Object.entries(service.details).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="opacity-75 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PerformanceMetric: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'stable';
}> = ({ label, value, icon, color, trend }) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <SignalIcon className="h-4 w-4 text-green-600" />;
      case 'down': return <SignalIcon className="h-4 w-4 text-red-600 rotate-180" />;
      default: return <SignalIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div className="mr-3" style={{ color }}>
            {icon}
          </div>
          <span className="text-sm font-medium text-gray-600">{label}</span>
        </div>
        {trend && getTrendIcon()}
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {value}
      </div>
    </div>
  );
};

const SystemOverview: React.FC<SystemOverviewProps> = ({
  healthChecks,
  environment,
  performance,
  loading = false
}) => {
  const getServiceIcon = (serviceName: string) => {
    switch (serviceName.toLowerCase()) {
      case 'database':
      case 'dynamodb':
        return <DatabaseIcon className="h-6 w-6" />;
      case 'api':
      case 'gateway':
        return <CloudIcon className="h-6 w-6" />;
      case 'compute':
      case 'lambda':
        return <CpuChipIcon className="h-6 w-6" />;
      default:
        return <ServerIcon className="h-6 w-6" />;
    }
  };

  const getOverallStatus = () => {
    if (loading) return 'loading';
    if (healthChecks.length === 0) return 'unknown';
    
    const hasUnhealthy = healthChecks.some(check => check.status === 'unhealthy');
    const hasDegraded = healthChecks.some(check => check.status === 'degraded');
    
    if (hasUnhealthy) return 'unhealthy';
    if (hasDegraded) return 'degraded';
    return 'healthy';
  };

  const overallStatus = getOverallStatus();

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Environment Info */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">System Overview</h2>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            environment.type === 'aws' 
              ? 'bg-orange-100 text-orange-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            <CloudIcon className="h-4 w-4 mr-1" />
            {environment.type.toUpperCase()} - {environment.region}
          </div>
        </div>
        
        <div className={`p-4 rounded-lg border ${
          overallStatus === 'healthy' ? 'bg-green-50 border-green-200 text-green-800' :
          overallStatus === 'degraded' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
          overallStatus === 'unhealthy' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-gray-50 border-gray-200 text-gray-800'
        }`}>
          <div className="flex items-center">
            <div className="mr-3">
              {overallStatus === 'healthy' && <CheckCircleIcon className="h-6 w-6" />}
              {overallStatus === 'degraded' && <ExclamationTriangleIcon className="h-6 w-6" />}
              {overallStatus === 'unhealthy' && <ExclamationTriangleIcon className="h-6 w-6" />}
              {overallStatus === 'loading' && <ClockIcon className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="font-semibold">
                System Status: {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
              </h3>
              <p className="text-sm opacity-75">
                {healthChecks.length} services monitored
                {environment.version && ` • Version ${environment.version}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PerformanceMetric
            label="System Uptime"
            value={formatUptime(performance.uptime)}
            icon={<ClockIcon className="h-6 w-6" />}
            color="#10B981"
            trend="stable"
          />
          
          <PerformanceMetric
            label="Avg Response Time"
            value={`${performance.responseTime}ms`}
            icon={<SignalIcon className="h-6 w-6" />}
            color="#3B82F6"
            trend={performance.responseTime < 200 ? 'stable' : performance.responseTime < 500 ? 'up' : 'down'}
          />
          
          <PerformanceMetric
            label="Throughput"
            value={`${performance.throughput} req/min`}
            icon={<CpuChipIcon className="h-6 w-6" />}
            color="#8B5CF6"
            trend="up"
          />
          
          <PerformanceMetric
            label="Error Rate"
            value={`${performance.errorRate.toFixed(2)}%`}
            icon={<ExclamationTriangleIcon className="h-6 w-6" />}
            color={performance.errorRate < 1 ? "#10B981" : performance.errorRate < 5 ? "#F59E0B" : "#EF4444"}
            trend={performance.errorRate < 1 ? 'stable' : 'up'}
          />
        </div>
      </div>

      {/* Service Health */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {healthChecks.map((service) => (
            <ServiceStatusCard
              key={service.service}
              service={service}
              icon={getServiceIcon(service.service)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemOverview;