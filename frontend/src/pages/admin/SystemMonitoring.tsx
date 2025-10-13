import React, { useState } from 'react';
import { useSystemMonitoring } from '../../hooks/useSystemMonitoring';
import HealthCheckCard from '../../components/admin/HealthCheckCard';
import AlertPanel from '../../components/admin/AlertPanel';
import ErrorTrackingPanel from '../../components/admin/ErrorTrackingPanel';
import SystemOverview from '../../components/admin/SystemOverview';
import RealTimeMetrics from '../../components/admin/RealTimeMetrics';
import PerformanceDashboard from '../../components/admin/PerformanceDashboard';
import { 
  ServerIcon, 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  CpuChipIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const SystemMonitoring: React.FC = () => {
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [activeTab, setActiveTab] = useState<'overview' | 'realtime' | 'health' | 'performance' | 'alerts' | 'errors'>('overview');
  
  // Use unified system monitoring hook
  const { 
    data: systemData, 
    loading, 
    error, 
    refetch, 
    acknowledgeAlert, 
    resolveAlert 
  } = useSystemMonitoring(refreshInterval);

  const handleRefreshIntervalChange = (interval: number) => {
    setRefreshInterval(interval);
  };

  const getOverallSystemStatus = () => {
    if (loading) return 'loading';
    if (error) return 'error';
    if (!systemData?.healthChecks || systemData.healthChecks.length === 0) return 'unknown';
    
    // Use the overallStatus from the unified data
    return systemData.overallStatus || 'healthy';
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

  // Show loading state while fetching unified data
  if (loading) {
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
            onClick={refetch}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center"
          >
            <span className={`mr-2 ${loading ? 'animate-spin' : ''}`}>🔄</span>
            Refresh Now
          </button>
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                System Monitoring Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'realtime', label: 'Real-time', icon: EyeIcon },
            { id: 'health', label: 'System Health', icon: ServerIcon },
            { id: 'performance', label: 'Performance', icon: CpuChipIcon },
            { id: 'alerts', label: 'Alerts', icon: ExclamationTriangleIcon, count: systemData?.alerts?.length },
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
      {activeTab === 'overview' && systemData && (
        <SystemOverview
          healthChecks={systemData.healthChecks}
          environment={systemData.environment}
          performance={{
            uptime: systemData.metrics.uptime,
            responseTime: systemData.healthChecks.length ? 
              Math.round(systemData.healthChecks.reduce((sum, h) => sum + h.responseTime, 0) / systemData.healthChecks.length) : 0,
            throughput: systemData.metrics.requestsPerMinute,
            errorRate: systemData.metrics.errorRate?.[systemData.metrics.errorRate.length - 1]?.value || 0
          }}
          loading={loading}
        />
      )}

      {activeTab === 'realtime' && systemData && (
        <RealTimeMetrics
          metrics={{
            cpu: {
              current: systemData.metrics.cpuUsage?.[systemData.metrics.cpuUsage.length - 1]?.value || 0,
              previous: systemData.metrics.cpuUsage?.[systemData.metrics.cpuUsage.length - 2]?.value || 0,
              unit: '%',
              threshold: systemData.environment.isAWS 
                ? { warning: 60, critical: 80 }  // AWS Lambda has different thresholds
                : { warning: 70, critical: 90 }  // Docker has more resources
            },
            memory: {
              current: systemData.metrics.memoryUsage?.[systemData.metrics.memoryUsage.length - 1]?.value || 0,
              previous: systemData.metrics.memoryUsage?.[systemData.metrics.memoryUsage.length - 2]?.value || 0,
              unit: '%',
              threshold: systemData.environment.isAWS 
                ? { warning: 70, critical: 85 }  // AWS Lambda memory limits
                : { warning: 80, critical: 95 }  // Docker has more flexibility
            },
            responseTime: {
              current: systemData.metrics.responseTime?.[systemData.metrics.responseTime.length - 1]?.value || 0,
              previous: systemData.metrics.responseTime?.[systemData.metrics.responseTime.length - 2]?.value || 0,
              unit: 'ms',
              threshold: systemData.environment.isAWS 
                ? { warning: 300, critical: 500 }  // AWS API Gateway timeouts
                : { warning: 500, critical: 1000 } // Local development is more relaxed
            },
            errorRate: {
              current: systemData.metrics.errorRate?.[systemData.metrics.errorRate.length - 1]?.value || 0,
              previous: systemData.metrics.errorRate?.[systemData.metrics.errorRate.length - 2]?.value || 0,
              unit: '%',
              threshold: { warning: 1, critical: 5 } // Same for both environments
            },
            throughput: {
              current: systemData.metrics.requestsPerMinute || 0,
              previous: (systemData.metrics.requestsPerMinute || 0) * 0.95,
              unit: 'req/min'
            },
            activeConnections: {
              current: systemData.metrics.activeConnections || 0,
              previous: (systemData.metrics.activeConnections || 0) * 0.98,
              unit: ''
            }
          }}
          environment={systemData.environment}
          refreshInterval={refreshInterval}
        />
      )}

      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* System Environment Info */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">System Environment</h2>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                systemData?.environment.isAWS 
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {systemData?.environment.isAWS ? '☁️ AWS Cloud' : '🐳 Docker Compose'}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-500 block">Environment Type</span>
                <p className="font-medium text-lg">
                  {systemData?.environment.isAWS ? 'AWS Cloud' : 'Local Development'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-500 block">Deployment Target</span>
                <p className="font-medium text-lg capitalize">
                  {systemData?.environment.deploymentTarget}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-500 block">Region/Location</span>
                <p className="font-medium text-lg">
                  {systemData?.environment.region}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-500 block">Runtime</span>
                <p className="font-medium text-lg">
                  {systemData?.environment.runtime || 'Node.js'}
                </p>
              </div>
            </div>
            
            {/* Environment-specific information */}
            {systemData?.environment.isAWS ? (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-medium text-orange-800 mb-2">AWS Cloud Environment</h3>
                <p className="text-sm text-orange-700">
                  Running on AWS infrastructure with managed services including Lambda functions, 
                  DynamoDB, and API Gateway for scalable, serverless operations.
                </p>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Local Docker Environment</h3>
                <p className="text-sm text-blue-700">
                  Running in Docker Compose with local DynamoDB, Express server, and development tools. 
                  Perfect for development, testing, and local debugging.
                </p>
              </div>
            )}
          </div>

          {/* Detailed Health Checks */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Health Checks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemData?.healthChecks && systemData.healthChecks.length > 0 ? (
                systemData.healthChecks.map((check) => (
                  <HealthCheckCard key={check.service} healthCheck={check} />
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-gray-500">
                  {loading ? 'Loading health checks...' : 'No health checks available'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && systemData && (
        <PerformanceDashboard
          metrics={{
            responseTime: systemData.metrics.responseTime,
            memoryUsage: systemData.metrics.memoryUsage,
            cpuUsage: systemData.metrics.cpuUsage,
            errorRate: systemData.metrics.errorRate
          }}
          systemStats={{
            uptime: systemData.metrics.uptime,
            activeConnections: systemData.metrics.activeConnections,
            requestsPerMinute: systemData.metrics.requestsPerMinute,
            averageResponseTime: systemData.metrics.responseTime.length ? 
              systemData.metrics.responseTime.reduce((sum, m) => sum + m.value, 0) / systemData.metrics.responseTime.length : 0
          }}
          loading={loading}
          onRefresh={refetch}
        />
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h2>
            {systemData?.alerts && systemData.alerts.length > 0 ? (
              <AlertPanel alerts={systemData.alerts} onAcknowledge={acknowledgeAlert} />
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