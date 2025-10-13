import React from 'react';
import { 
  CircleStackIcon, 
  ServerIcon, 
  CloudIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { AWSHealthMetrics } from '../../hooks/useDashboardMetrics';

interface AWSHealthDashboardProps {
  healthData: AWSHealthMetrics;
  className?: string;
}

interface HealthServiceCardProps {
  title: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  icon: React.ReactNode;
  responseTime: number;
  message: string;
  metrics?: Array<{ label: string; value: string | number }>;
  details?: React.ReactNode;
}

const HealthServiceCard: React.FC<HealthServiceCardProps> = ({
  title,
  status,
  icon,
  responseTime,
  message,
  metrics = [],
  details
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'degraded': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy': return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      default: return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor(status)}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className="mr-3">
            {icon}
          </div>
          <div>
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm opacity-75">{message}</p>
          </div>
        </div>
        <div className="flex items-center">
          {getStatusIcon(status)}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <span className="text-xs opacity-75">Response Time</span>
          <p className="font-medium">{responseTime}ms</p>
        </div>
        <div>
          <span className="text-xs opacity-75">Status</span>
          <p className="font-medium capitalize">{status}</p>
        </div>
      </div>

      {metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-3">
          {metrics.map((metric, index) => (
            <div key={index}>
              <span className="text-xs opacity-75">{metric.label}</span>
              <p className="font-medium">{metric.value}</p>
            </div>
          ))}
        </div>
      )}

      {details && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          {details}
        </div>
      )}
    </div>
  );
};

const DynamoDBTablesList: React.FC<{ tables: AWSHealthMetrics['services']['database']['details'] }> = ({ tables }) => {
  if (!tables || tables.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">Table Status</h4>
      {tables.map((table, index) => (
        <div key={index} className="flex items-center justify-between text-sm">
          <span>{table.displayName}</span>
          <div className="flex items-center space-x-2">
            <span className="text-xs opacity-75">{table.responseTime}ms</span>
            {table.healthy ? (
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
            ) : (
              <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const AWSEnvironmentBadge: React.FC<{ environment: AWSHealthMetrics['environment'] }> = ({ environment }) => {
  const isAWS = environment.type === 'aws';
  
  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
      isAWS 
        ? 'bg-orange-100 text-orange-800' 
        : 'bg-blue-100 text-blue-800'
    }`}>
      <CloudIcon className="h-4 w-4 mr-1" />
      {environment.type.toUpperCase()} - {environment.region}
      {environment.functionName && (
        <span className="ml-2 text-xs opacity-75">
          ({environment.functionName})
        </span>
      )}
    </div>
  );
};

export const AWSHealthDashboard: React.FC<AWSHealthDashboardProps> = ({ 
  healthData, 
  className = '' 
}) => {
  const { environment, services, performance, alerts, cloudwatch } = healthData;

  return (
    <div className={`aws-health-dashboard ${className}`}>
      {/* Environment Information */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">System Health</h2>
          <AWSEnvironmentBadge environment={environment} />
        </div>
        <p className="text-gray-600 mt-1">
          Runtime: {environment.runtime} | Version: {environment.version}
        </p>
      </div>

      {/* Performance Overview */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium mb-3">Performance Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-gray-600">Uptime</span>
            <p className="text-lg font-semibold">
              {Math.round((performance.uptime / 3600) * 10) / 10}h
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Memory Usage</span>
            <p className="text-lg font-semibold">
              {performance.memory.percentage}%
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600">CPU Usage</span>
            <p className="text-lg font-semibold">
              {(performance.cpu.usage * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Response Time</span>
            <p className="text-lg font-semibold">
              {performance.responseTime}ms
            </p>
          </div>
        </div>
      </div>

      {/* AWS Services Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* DynamoDB Health */}
        <HealthServiceCard
          title="DynamoDB"
          status={services.database.status}
          icon={<CircleStackIcon className="h-6 w-6" />}
          responseTime={services.database.responseTime}
          message={services.database.message}
          metrics={services.database.details ? [
            { 
              label: 'Tables', 
              value: services.database.details.length 
            },
            { 
              label: 'Throttled Requests', 
              value: services.database.details.reduce((sum, t) => sum + (t.throttledRequests || 0), 0)
            }
          ] : []}
          details={<DynamoDBTablesList tables={services.database.details} />}
        />

        {/* Lambda Health (if available) */}
        {services.compute && (
          <HealthServiceCard
            title="Lambda Functions"
            status={services.compute.status}
            icon={<ServerIcon className="h-6 w-6" />}
            responseTime={services.compute.responseTime}
            message={services.compute.message}
            metrics={services.compute.details ? [
              { 
                label: 'Error Rate', 
                value: `${(services.compute.details.errorRate * 100).toFixed(2)}%` 
              },
              { 
                label: 'Avg Duration', 
                value: `${services.compute.details.averageDuration}ms` 
              },
              { 
                label: 'Concurrency', 
                value: services.compute.details.concurrency 
              }
            ] : []}
            details={
              services.compute.details?.coldStarts && (
                <div className="text-sm">
                  Cold Starts: {services.compute.details.coldStarts}
                </div>
              )
            }
          />
        )}

        {/* API Gateway Health */}
        <HealthServiceCard
          title="API Gateway"
          status={services.api.status}
          icon={<CloudIcon className="h-6 w-6" />}
          responseTime={services.api.responseTime}
          message={services.api.message}
          metrics={services.api.details ? [
            { 
              label: 'Request Rate', 
              value: `${services.api.details.requestRate}/min` 
            },
            { 
              label: 'Error Rate', 
              value: `${(services.api.details.errorRate * 100).toFixed(2)}%` 
            },
            { 
              label: 'Latency', 
              value: `${services.api.details.latency}ms` 
            }
          ] : []}
        />
      </div>

      {/* CloudWatch Integration Status */}
      {cloudwatch && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CloudIcon className="h-5 w-5 text-blue-600 mr-2" />
              <span className="font-medium">CloudWatch Integration</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Active Alarms: {cloudwatch.alarmsActive}
              </span>
              {cloudwatch.dashboardUrl && (
                <a
                  href={cloudwatch.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View Dashboard →
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium mb-3">Active Alerts</h3>
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div 
                key={alert.id || index}
                className={`p-3 rounded-lg border ${
                  alert.type === 'error' 
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : alert.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{alert.title}</span>
                    <p className="text-sm opacity-75 mt-1">{alert.message}</p>
                  </div>
                  <span className="text-xs opacity-75">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AWSHealthDashboard;