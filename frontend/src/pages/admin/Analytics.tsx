import React, { useState, useMemo } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { DateRange, ChartData } from '@harborlist/shared-types';
import DateRangeSelector from '../../components/admin/DateRangeSelector';
import AnalyticsChart from '../../components/admin/AnalyticsChart';
import DataExport from '../../components/admin/DataExport';
import { DataExportService } from '../../utils/dataExport';

const Analytics: React.FC = () => {
  // Default to last 30 days
  const getDefaultDateRange = (): DateRange => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const { data, loading, error, refetch } = useAnalytics(dateRange);

  // Transform data for charts
  const chartData = useMemo(() => {
    if (!data) return null;

    const userRegistrationChart: ChartData = {
      labels: data.userMetrics.registrationsByDate.map(item => 
        new Date(item.date).toLocaleDateString()
      ),
      datasets: [{
        label: 'New Registrations',
        data: data.userMetrics.registrationsByDate.map(item => item.value),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)'
      }]
    };

    const listingCreationChart: ChartData = {
      labels: data.listingMetrics.listingsByDate.map(item => 
        new Date(item.date).toLocaleDateString()
      ),
      datasets: [{
        label: 'New Listings',
        data: data.listingMetrics.listingsByDate.map(item => item.value),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)'
      }]
    };

    const listingCategoryChart: ChartData = {
      labels: data.listingMetrics.listingsByCategory.map(item => item.category),
      datasets: [{
        label: 'Listings by Category',
        data: data.listingMetrics.listingsByCategory.map(item => item.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)'
        ]
      }]
    };

    const userRegionChart: ChartData = {
      labels: data.userMetrics.usersByRegion.map(item => item.region),
      datasets: [{
        label: 'Users by Region',
        data: data.userMetrics.usersByRegion.map(item => item.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ]
      }]
    };

    return {
      userRegistrationChart,
      listingCreationChart,
      listingCategoryChart,
      userRegionChart
    };
  }, [data]);

  const handleExportChart = (chartData: ChartData, title: string) => {
    DataExportService.exportChartDataToCSV(chartData, title, dateRange);
  };

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Analytics</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Analytics</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={refetch}
                className="mt-2 text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <button
          onClick={refetch}
          disabled={loading}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Date Range Selector */}
      <DateRangeSelector
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Key Metrics Summary */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="text-lg font-medium text-gray-900">{data.userMetrics.totalUsers.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Listings</dt>
                  <dd className="text-lg font-medium text-gray-900">{data.listingMetrics.totalListings.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Searches</dt>
                  <dd className="text-lg font-medium text-gray-900">{data.engagementMetrics.totalSearches.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Listing Views</dt>
                  <dd className="text-lg font-medium text-gray-900">{data.engagementMetrics.listingViews.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {chartData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsChart
            title="User Registrations Over Time"
            data={chartData.userRegistrationChart}
            type="line"
            loading={loading}
            description="Daily new user registrations for the selected period"
            showExport
            onExport={() => handleExportChart(chartData.userRegistrationChart, 'User Registrations Over Time')}
          />

          <AnalyticsChart
            title="Listing Creation Trends"
            data={chartData.listingCreationChart}
            type="line"
            loading={loading}
            description="Daily new listing creation for the selected period"
            showExport
            onExport={() => handleExportChart(chartData.listingCreationChart, 'Listing Creation Trends')}
          />

          <AnalyticsChart
            title="Listings by Category"
            data={chartData.listingCategoryChart}
            type="doughnut"
            loading={loading}
            description="Distribution of listings across different categories"
            showExport
            onExport={() => handleExportChart(chartData.listingCategoryChart, 'Listings by Category')}
          />

          <AnalyticsChart
            title="Users by Region"
            data={chartData.userRegionChart}
            type="doughnut"
            loading={loading}
            description="Geographic distribution of platform users"
            showExport
            onExport={() => handleExportChart(chartData.userRegionChart, 'Users by Region')}
          />
        </div>
      )}

      {/* Engagement Analytics */}
      {data && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Search Behavior</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Unique Searchers</span>
                  <span className="text-sm font-medium">{data.engagementMetrics.uniqueSearchers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Searches/User</span>
                  <span className="text-sm font-medium">{data.engagementMetrics.averageSearchesPerUser.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Listing Performance</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Views/Listing</span>
                  <span className="text-sm font-medium">{data.engagementMetrics.averageViewsPerListing.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Inquiry Rate</span>
                  <span className="text-sm font-medium">{data.engagementMetrics.inquiryRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Top Search Terms</h4>
              <div className="space-y-1">
                {data.engagementMetrics.topSearchTerms.slice(0, 3).map((term, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-sm text-gray-600 truncate">{term.term}</span>
                    <span className="text-sm font-medium">{term.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Export */}
      <DataExport
        data={data}
        dateRange={dateRange}
        loading={loading}
      />
    </div>
  );
};

export default Analytics;