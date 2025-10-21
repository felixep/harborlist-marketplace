/**
 * @fileoverview Real-time Admin Dashboard with Platform Stats
 * 
 * Displays comprehensive platform analytics using real data from the
 * analytics service. Shows role-based metrics with automatic refresh.
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import React from 'react';
import { usePlatformStatsWithRefresh } from '../../hooks/usePlatformStats';
import MetricCard from '../../components/admin/MetricCard';
import { MetricCardData } from '@harborlist/shared-types';

const AdminDashboardOverview: React.FC = () => {
  // Auto-refresh every minute
  const { stats, loading, error, refetch } = usePlatformStatsWithRefresh(60000);

  const getMetricCards = (): MetricCardData[] => {
    if (!stats) return [];

    const cards: MetricCardData[] = [
      {
        title: 'Active Listings',
        value: stats.activeListings || 0,
        change: 0,
        trend: 'stable' as const,
        icon: '⛵',
        color: 'green' as const,
      },
      {
        title: 'Average Rating',
        value: stats.averageRating ? `${stats.averageRating.toFixed(1)} ⭐` : 'N/A',
        change: 0,
        trend: 'stable' as const,
        icon: '⭐',
        color: 'yellow' as const,
      },
      {
        title: 'User Satisfaction',
        value: stats.userSatisfactionScore ? `${stats.userSatisfactionScore.toFixed(1)}/5` : 'N/A',
        change: 0,
        trend: 'up' as const,
        icon: '😊',
        color: 'blue' as const,
      },
      {
        title: 'Total Reviews',
        value: stats.totalReviews || 0,
        change: 0,
        trend: 'stable' as const,
        icon: '💬',
        color: 'purple' as const,
      },
    ];

    // Add staff-only metrics if available
    if (stats.totalUsers !== undefined) {
      cards.push({
        title: 'Total Users',
        value: stats.totalUsers,
        change: 0,
        trend: 'up' as const,
        icon: '👥',
        color: 'indigo' as const,
      });
    }

    if (stats.totalListings !== undefined) {
      cards.push({
        title: 'Total Listings',
        value: stats.totalListings,
        change: 0,
        trend: 'stable' as const,
        icon: '📋',
        color: 'green' as const,
      });
    }

    if (stats.totalViews !== undefined) {
      cards.push({
        title: 'Total Views',
        value: stats.totalViews.toLocaleString(),
        change: 0,
        trend: 'up' as const,
        icon: '👁️',
        color: 'blue' as const,
      });
    }

    if (stats.totalEvents !== undefined) {
      cards.push({
        title: 'Total Events',
        value: stats.totalEvents.toLocaleString(),
        change: 0,
        trend: 'up' as const,
        icon: '📊',
        color: 'purple' as const,
      });
    }

    if (stats.pendingListings !== undefined) {
      cards.push({
        title: 'Pending Listings',
        value: stats.pendingListings,
        change: 0,
        trend: stats.pendingListings > 0 ? 'up' as const : 'stable' as const,
        icon: '⏳',
        color: 'yellow' as const,
      });
    }

    if (stats.conversionRate !== undefined) {
      cards.push({
        title: 'Conversion Rate',
        value: `${stats.conversionRate}%`,
        change: 0,
        trend: 'stable' as const,
        icon: '📈',
        color: 'green' as const,
      });
    }

    return cards;
  };

  if (error && !stats) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">❌</span>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Failed to load platform statistics
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={refetch}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded text-sm font-medium transition-colors"
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time analytics and platform statistics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-500">
            {loading && (
              <span className="flex items-center">
                <span className="animate-spin mr-2">🔄</span>
                Refreshing...
              </span>
            )}
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
          >
            <span className={`mr-2 ${loading ? 'animate-spin' : ''}`}>🔄</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <div className="flex items-center">
          <span className="text-blue-600 mr-2">ℹ️</span>
          <p className="text-sm text-blue-800">
            Dashboard automatically refreshes every minute. Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      {loading && !stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, index) => (
            <MetricCard key={index} data={{
              title: 'Loading...',
              value: 0,
              icon: '⏳',
              color: 'blue'
            }} loading={true} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {getMetricCards().map((metric, index) => (
            <MetricCard key={index} data={metric} />
          ))}
        </div>
      )}

      {/* Last 30 Days Section (if available) */}
      {stats?.last30Days && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Last 30 Days</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Total Views</span>
                <span className="text-2xl font-bold text-gray-900">
                  {stats.last30Days.views?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-blue-600 rounded-full transition-all"
                  style={{ width: '75%' }}
                ></div>
              </div>
            </div>
            {stats.last30Days.events !== undefined && (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Total Events</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {stats.last30Days.events?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-2 bg-green-600 rounded-full transition-all"
                    style={{ width: '60%' }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">About These Metrics</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• <strong>Active Listings:</strong> Currently published and visible to users</p>
          <p>• <strong>User Satisfaction:</strong> Calculated from engagement and feedback metrics</p>
          <p>• <strong>Total Views:</strong> Excludes owner views for accurate analytics</p>
          <p>• <strong>Conversion Rate:</strong> Ratio of views to total listings</p>
          {stats?.totalUsers !== undefined && (
            <p className="text-blue-600 font-medium mt-2">
              ✓ You have access to comprehensive staff analytics
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardOverview;
