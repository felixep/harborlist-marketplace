import React, { useState } from 'react';
import { AnalyticsMetrics, DateRange } from '@harborlist/shared-types';
import { DataExportService } from '../../utils/dataExport';

interface DataExportProps {
  data: AnalyticsMetrics | null;
  dateRange: DateRange;
  loading?: boolean;
}

const DataExport: React.FC<DataExportProps> = ({
  data,
  dateRange,
  loading = false
}) => {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'users',
    'listings',
    'engagement',
    'geographic'
  ]);
  const [isExporting, setIsExporting] = useState(false);

  const metricOptions = [
    { id: 'users', label: 'User Metrics', description: 'Registration trends, active users, regional distribution' },
    { id: 'listings', label: 'Listing Metrics', description: 'Listing creation, categories, pricing data' },
    { id: 'engagement', label: 'Engagement Metrics', description: 'Search behavior, views, inquiries' },
    { id: 'geographic', label: 'Geographic Metrics', description: 'Location-based user and listing distribution' }
  ];

  const handleMetricToggle = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const handleExport = async () => {
    if (!data || selectedMetrics.length === 0) return;

    try {
      setIsExporting(true);
      
      const exportOptions = {
        dateRange,
        metrics: selectedMetrics,
        format: 'csv' as const,
        includeCharts: false
      };

      DataExportService.exportToCSV(data, exportOptions);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const isExportDisabled = loading || !data || selectedMetrics.length === 0 || isExporting;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Data Export</h3>
          <p className="text-sm text-gray-600 mt-1">
            Export analytics data for the selected date range ({dateRange.startDate} to {dateRange.endDate})
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExportDisabled}
          className={`px-4 py-2 rounded-md font-medium ${
            isExportDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
          }`}
        >
          {isExporting ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Exporting...
            </div>
          ) : (
            'Export CSV'
          )}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Select Metrics to Export</h4>
          <div className="space-y-3">
            {metricOptions.map((option) => (
              <label key={option.id} className="flex items-start">
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(option.id)}
                  onChange={() => handleMetricToggle(option.id)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">{option.label}</div>
                  <div className="text-sm text-gray-500">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {selectedMetrics.length === 0 && (
          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
            Please select at least one metric category to export.
          </div>
        )}

        {!data && !loading && (
          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
            No data available for export. Please ensure analytics data is loaded.
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4">
          <p>Export includes:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Summary metrics for the selected date range</li>
            <li>Time-series data for trend analysis</li>
            <li>Categorical breakdowns and distributions</li>
            <li>Geographic distribution data (if selected)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DataExport;