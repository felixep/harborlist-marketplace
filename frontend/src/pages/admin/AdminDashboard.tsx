import React from 'react';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import MetricCard from '../../components/admin/MetricCard';
import ChartContainer from '../../components/admin/ChartContainer';
import { MetricCardData, SystemAlert } from '@harborlist/shared-types';

const AdminDashboard: React.FC = () => {
  const { metrics, chartData, alerts, loading, error, refetch } = useDashboardMetrics();

  const getMetricCards = (): MetricCardData[] => {
    if (!metrics) return [];

    return [
      {
        title: 'Total Users',
        value: metrics.totalUsers,
        change: 12.5,
        trend: 'up' as const,
        icon: '👥',
        color: 'blue' as const
      },
      {
        title: 'Active Listings',
        value: metrics.activeListings,
        change: 8.2,
        trend: 'up' as const,
        icon: '⛵',
        color: 'green' as const
      },
      {
        title: 'Pending Moderation',
        value: metrics.pendingModeration,
        change: -15.3,
        trend: 'down' as const,
        icon: '⚠️',
        color: 'yellow' as const
      },
      {
        title: 'System Health',
        value: `${metrics.systemHealth.uptime}%`,
        change: 0.1,
        trend: 'stable' as const,
        icon: '💚',
        color: metrics.systemHealth.status === 'healthy' ? 'green' as const : 
               metrics.systemHealth.status === 'warning' ? 'yellow' as const : 'red' as const
      },
      {
        title: 'Revenue Today',
        value: `$${metrics.revenueToday.toLocaleString()}`,
        change: 23.1,
        trend: 'up' as const,
        icon: '💰',
        color: 'purple' as const
      },
      {
        title: 'New Users Today',
        value: metrics.newUsersToday,
        change: 5.7,
        trend: 'up' as const,
        icon: '✨',
        color: 'indigo' as const
      }
    ];
  };

  const AlertBanner: React.FC<{ alert: SystemAlert }> = ({ alert }) => {
    const getAlertStyles = (type: string) => {
      switch (type) {
        case 'error':
          return 'bg-red-50 border-red-200 text-red-800';
        case 'warning':
          return 'bg-yellow-50 border-yellow-200 text-yellow-800';
        case 'info':
          return 'bg-blue-50 border-blue-200 text-blue-800';
        default:
          return 'bg-gray-50 border-gray-200 text-gray-800';
      }
    };

    return (
      <div className={`border-l-4 p-4 mb-4 ${getAlertStyles(alert.type)}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-lg">
              {alert.type === 'error' ? '❌' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">{alert.title}</p>
            <p className="text-sm mt-1">{alert.message}</p>
          </div>
        </div>
      </div>
    );
  };

  if (error && !metrics) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">❌</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Failed to load dashboard metrics
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={refetch}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <button
          onClick={refetch}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
        >
          <span className={`mr-2 ${loading ? 'animate-spin' : ''}`}>🔄</span>
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">System Alerts</h2>
          {alerts.map((alert) => (
            <AlertBanner key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {/* Metrics Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {getMetricCards().map((cardData, index) => (
            <MetricCard key={index} data={cardData} loading={loading} />
          ))}
        </div>
      </div>

      {/* Charts */}
      {chartData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer
            title="User Growth (Last 7 Days)"
            data={chartData.userGrowth}
            type="line"
            loading={loading}
          />
          <ChartContainer
            title="Listing Activity (Last 7 Days)"
            data={chartData.listingActivity}
            type="bar"
            loading={loading}
          />
        </div>
      )}

      {/* System Performance Chart */}
      {chartData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ChartContainer
              title="System Performance"
              data={chartData.systemPerformance}
              type="doughnut"
              height={250}
              loading={loading}
            />
          </div>
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
            {metrics && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Uptime</span>
                  <span className="text-sm font-medium">{metrics.systemHealth.uptime}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Response Time</span>
                  <span className="text-sm font-medium">{metrics.systemHealth.responseTime}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Error Rate</span>
                  <span className="text-sm font-medium">{metrics.systemHealth.errorRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Users Today</span>
                  <span className="text-sm font-medium">{metrics.activeUsersToday}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;