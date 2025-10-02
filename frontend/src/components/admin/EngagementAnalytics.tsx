import React from 'react';
import { EngagementMetrics } from '../../types/admin';
import AnalyticsChart from './AnalyticsChart';
import { ChartData } from '../../types/admin';

interface EngagementAnalyticsProps {
  data: EngagementMetrics;
  loading?: boolean;
  onExportData?: (chartData: any, title: string) => void;
}

const EngagementAnalytics: React.FC<EngagementAnalyticsProps> = ({
  data,
  loading = false,
  onExportData
}) => {
  // Prepare chart data for searches over time
  const searchTrendChartData: ChartData = {
    labels: data.searchesByDate.map(item => new Date(item.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Daily Searches',
        data: data.searchesByDate.map(item => item.value),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
      },
    ],
  };

  // Prepare chart data for listing views over time
  const viewTrendChartData: ChartData = {
    labels: data.viewsByDate.map(item => new Date(item.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Daily Views',
        data: data.viewsByDate.map(item => item.value),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
      },
    ],
  };

  // Prepare chart data for inquiries over time
  const inquiryTrendChartData: ChartData = {
    labels: data.inquiriesByDate.map(item => new Date(item.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Daily Inquiries',
        data: data.inquiriesByDate.map(item => item.value),
        borderColor: 'rgba(139, 92, 246, 1)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
      },
    ],
  };

  // Prepare chart data for top search terms
  const searchTermsChartData: ChartData = {
    labels: data.topSearchTerms.slice(0, 10).map(item => item.term),
    datasets: [
      {
        label: 'Search Count',
        data: data.topSearchTerms.slice(0, 10).map(item => item.count),
        backgroundColor: data.topSearchTerms.slice(0, 10).map(item => {
          switch (item.trend) {
            case 'up': return 'rgba(16, 185, 129, 0.7)';
            case 'down': return 'rgba(239, 68, 68, 0.7)';
            default: return 'rgba(107, 114, 128, 0.7)';
          }
        }),
        borderColor: data.topSearchTerms.slice(0, 10).map(item => {
          switch (item.trend) {
            case 'up': return 'rgba(16, 185, 129, 1)';
            case 'down': return 'rgba(239, 68, 68, 1)';
            default: return 'rgba(107, 114, 128, 1)';
          }
        }),
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-gray-200 rounded"></div>
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">User Engagement Analytics</h2>
        <p className="text-gray-600">Search behavior, listing interactions, and user engagement patterns</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Searches</p>
              <p className="text-2xl font-semibold text-gray-900">{data.totalSearches.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Listing Views</p>
              <p className="text-2xl font-semibold text-gray-900">{data.listingViews.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Inquiries</p>
              <p className="text-2xl font-semibold text-gray-900">{data.inquiries.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Inquiry Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{data.inquiryRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          title="Search Activity Trend"
          data={searchTrendChartData}
          type="line"
          height={300}
          description="Daily search activity over time"
          showExport={true}
          onExport={() => handleExport(searchTrendChartData, 'Search Activity Trend')}
        />

        <AnalyticsChart
          title="Listing Views Trend"
          data={viewTrendChartData}
          type="line"
          height={300}
          description="Daily listing views over time"
          showExport={true}
          onExport={() => handleExport(viewTrendChartData, 'Listing Views Trend')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          title="Inquiry Trend"
          data={inquiryTrendChartData}
          type="line"
          height={300}
          description="Daily inquiries over time"
          showExport={true}
          onExport={() => handleExport(inquiryTrendChartData, 'Inquiry Trend')}
        />

        <AnalyticsChart
          title="Top Search Terms"
          data={searchTermsChartData}
          type="bar"
          height={300}
          description="Most popular search terms with trend indicators"
          showExport={true}
          onExport={() => handleExport(searchTermsChartData, 'Top Search Terms')}
        />
      </div>

      {/* Search Terms Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Search Terms Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Search Term
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.topSearchTerms.map((term, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {term.term}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {term.count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      term.trend === 'up' ? 'bg-green-100 text-green-800' :
                      term.trend === 'down' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {term.trend === 'up' && '↗'}
                      {term.trend === 'down' && '↘'}
                      {term.trend === 'stable' && '→'}
                      {term.trend}
                    </span>
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

export default EngagementAnalytics;