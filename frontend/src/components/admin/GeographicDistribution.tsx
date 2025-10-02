import React from 'react';
import { GeographicMetrics } from '@harborlist/shared-types';
import AnalyticsChart from './AnalyticsChart';
import { ChartData } from '@harborlist/shared-types';

interface GeographicDistributionProps {
  data: GeographicMetrics;
  loading?: boolean;
  onExportData?: (chartData: any, title: string) => void;
}

const GeographicDistribution: React.FC<GeographicDistributionProps> = ({
  data,
  loading = false,
  onExportData
}) => {
  // Prepare chart data for users by state
  const usersByStateChartData: ChartData = {
    labels: data.usersByState.slice(0, 10).map(item => item.state),
    datasets: [
      {
        label: 'Users',
        data: data.usersByState.slice(0, 10).map(item => item.count),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Prepare chart data for listings by state
  const listingsByStateChartData: ChartData = {
    labels: data.listingsByState.slice(0, 10).map(item => item.state),
    datasets: [
      {
        label: 'Listings',
        data: data.listingsByState.slice(0, 10).map(item => item.count),
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Prepare chart data for top cities
  const topCitiesChartData: ChartData = {
    labels: data.topCities.slice(0, 15).map(item => `${item.city}, ${item.state}`),
    datasets: [
      {
        label: 'Activity',
        data: data.topCities.slice(0, 15).map(item => item.count),
        backgroundColor: 'rgba(139, 92, 246, 0.5)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const handleExport = (chartData: any, title: string) => {
    if (onExportData) {
      onExportData(chartData, title);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-gray-200 rounded"></div>
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
          <div className="h-80 bg-gray-200 rounded mt-6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Geographic Distribution</h2>
        <p className="text-gray-600">User and listing distribution across different locations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          title="Users by State (Top 10)"
          data={usersByStateChartData}
          type="bar"
          height={300}
          description="Distribution of users across different states"
          showExport={true}
          onExport={() => handleExport(usersByStateChartData, 'Users by State')}
        />

        <AnalyticsChart
          title="Listings by State (Top 10)"
          data={listingsByStateChartData}
          type="bar"
          height={300}
          description="Distribution of listings across different states"
          showExport={true}
          onExport={() => handleExport(listingsByStateChartData, 'Listings by State')}
        />
      </div>

      <AnalyticsChart
        title="Top Cities by Activity (Top 15)"
        data={topCitiesChartData}
        type="bar"
        height={400}
        description="Most active cities based on combined user and listing activity"
        showExport={true}
        onExport={() => handleExport(topCitiesChartData, 'Top Cities by Activity')}
      />

      {/* Geographic Summary Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Geographic Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Listings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Listing %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.geographicDistribution.slice(0, 20).map((location, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {location.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {location.userCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {location.listingCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {((location.userCount / data.usersByState.reduce((sum, state) => sum + state.count, 0)) * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {((location.listingCount / data.listingsByState.reduce((sum, state) => sum + state.count, 0)) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GeographicDistribution;