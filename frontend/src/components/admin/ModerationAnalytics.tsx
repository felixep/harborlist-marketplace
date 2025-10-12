import React, { useState, useEffect } from 'react';
import { ModerationStats, DateRange, AdminUser } from '@harborlist/shared-types';
import { adminApi } from '../../services/adminApi';
import MetricCard from './MetricCard';
import AnalyticsChart from './AnalyticsChart';

interface ModerationAnalyticsProps {
  className?: string;
}

interface ModeratorPerformance {
  moderatorId: string;
  moderatorName: string;
  assignedItems: number;
  completedToday: number;
  completedThisWeek: number;
  completedThisMonth: number;
  averageReviewTime: number;
  accuracyScore: number;
  workloadBalance: 'low' | 'medium' | 'high' | 'overloaded';
}

interface QualityMetrics {
  totalReviews: number;
  appealedDecisions: number;
  overturnedDecisions: number;
  averageConfidenceScore: number;
  consistencyScore: number;
}

const ModerationAnalytics: React.FC<ModerationAnalyticsProps> = ({ className = '' }) => {
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [moderatorPerformance, setModeratorPerformance] = useState<ModeratorPerformance[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedModerator, setSelectedModerator] = useState<string>('all');

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, selectedModerator]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, performanceResponse, qualityResponse] = await Promise.all([
        adminApi.getModerationStats(),
        adminApi.getModeratorPerformance({ 
          dateRange, 
          moderatorId: selectedModerator !== 'all' ? selectedModerator : undefined 
        }),
        adminApi.getModerationQualityMetrics({ dateRange })
      ]);

      setStats(statsResponse);
      setModeratorPerformance(performanceResponse.moderators || []);
      setQualityMetrics(qualityResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      console.error('Error loading moderation analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const getWorkloadColor = (workload: string) => {
    switch (workload) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-blue-600 bg-blue-100';
      case 'high': return 'text-yellow-600 bg-yellow-100';
      case 'overloaded': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPerformanceChartData = () => {
    if (!moderatorPerformance.length) return null;

    return {
      labels: moderatorPerformance.map(m => m.moderatorName),
      datasets: [
        {
          label: 'Completed This Month',
          data: moderatorPerformance.map(m => m.completedThisMonth),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        },
        {
          label: 'Average Review Time (min)',
          data: moderatorPerformance.map(m => m.averageReviewTime),
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
          yAxisID: 'y1'
        }
      ]
    };
  };

  const getFlagTypeChartData = () => {
    if (!stats?.flagTypeBreakdown) return null;

    return {
      labels: stats.flagTypeBreakdown.map(item => item.type),
      datasets: [{
        data: stats.flagTypeBreakdown.map(item => item.count),
        backgroundColor: [
          '#EF4444', // red
          '#F59E0B', // amber
          '#10B981', // emerald
          '#3B82F6', // blue
          '#8B5CF6', // violet
          '#F97316'  // orange
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 mb-2">Error loading analytics</div>
          <div className="text-gray-600 text-sm mb-4">{error}</div>
          <button
            onClick={loadAnalytics}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <h2 className="text-xl font-semibold text-gray-900">Moderation Analytics</h2>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              />
            </div>
            <select
              value={selectedModerator}
              onChange={(e) => setSelectedModerator(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">All Moderators</option>
              {moderatorPerformance.map(moderator => (
                <option key={moderator.moderatorId} value={moderator.moderatorId}>
                  {moderator.moderatorName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Queue Backlog"
            value={stats.queueBacklog}
            change={stats.queueBacklog > 50 ? -10 : 5}
            trend={stats.queueBacklog > 50 ? 'down' : 'up'}
            icon="queue"
            color={stats.queueBacklog > 50 ? 'red' : 'green'}
          />
          <MetricCard
            title="Avg Review Time"
            value={`${stats.averageReviewTime}h`}
            change={-5}
            trend="up"
            icon="clock"
            color="blue"
          />
          <MetricCard
            title="SLA Compliance"
            value={`${stats.slaCompliance}%`}
            change={stats.slaCompliance >= 90 ? 2 : -5}
            trend={stats.slaCompliance >= 90 ? 'up' : 'down'}
            icon="check"
            color={stats.slaCompliance >= 90 ? 'green' : 'red'}
          />
          <MetricCard
            title="Approved Today"
            value={stats.approvedToday}
            change={10}
            trend="up"
            icon="thumbs-up"
            color="green"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Moderator Performance Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Moderator Performance</h3>
          {getPerformanceChartData() ? (
            <AnalyticsChart
              type="bar"
              data={getPerformanceChartData()!}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                },
                scales: {
                  y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                      display: true,
                      text: 'Completed Reviews'
                    }
                  },
                  y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                      display: true,
                      text: 'Review Time (min)'
                    },
                    grid: {
                      drawOnChartArea: false,
                    },
                  },
                },
              }}
            />
          ) : (
            <div className="text-center text-gray-500 py-8">No performance data available</div>
          )}
        </div>

        {/* Flag Type Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Flag Type Distribution</h3>
          {getFlagTypeChartData() ? (
            <AnalyticsChart
              type="doughnut"
              data={getFlagTypeChartData()!}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                },
              }}
            />
          ) : (
            <div className="text-center text-gray-500 py-8">No flag data available</div>
          )}
        </div>
      </div>

      {/* Moderator Performance Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Moderator Workload & Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Moderator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed Today
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  This Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Review Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Accuracy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workload
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {moderatorPerformance.map((moderator) => (
                <tr key={moderator.moderatorId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {moderator.moderatorName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {moderator.assignedItems}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {moderator.completedToday}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {moderator.completedThisMonth}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {moderator.averageReviewTime}min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {moderator.accuracyScore}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getWorkloadColor(moderator.workloadBalance)}`}>
                      {moderator.workloadBalance}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quality Assurance Metrics */}
      {qualityMetrics && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quality Assurance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{qualityMetrics.totalReviews}</div>
              <div className="text-sm text-gray-500">Total Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{qualityMetrics.appealedDecisions}</div>
              <div className="text-sm text-gray-500">Appealed Decisions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{qualityMetrics.overturnedDecisions}</div>
              <div className="text-sm text-gray-500">Overturned Decisions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{qualityMetrics.consistencyScore}%</div>
              <div className="text-sm text-gray-500">Consistency Score</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModerationAnalytics;