import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/adminApi';

interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  service: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  count: number;
  firstOccurrence: string;
  lastOccurrence: string;
  resolved: boolean;
}

interface ErrorStats {
  totalErrors: number;
  errorRate: number;
  topErrors: ErrorReport[];
  errorsByService: Record<string, number>;
}

const ErrorTrackingPanel: React.FC = () => {
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedError, setExpandedError] = useState<string | null>(null);

  const fetchErrorStats = async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        timeRange: selectedTimeRange,
        limit: '10'
      });
      const response = await adminApi.get<ErrorStats>(`/system/errors?${params}`);
      setErrorStats(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch error statistics');
      console.error('Failed to fetch error statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrorStats();
  }, [selectedTimeRange]);

  const markErrorAsResolved = async (errorId: string) => {
    try {
      await adminApi.post(`/system/errors/${errorId}/resolve`);
      setErrorStats(prev => prev ? {
        ...prev,
        topErrors: prev.topErrors.map(err => 
          err.id === errorId ? { ...err, resolved: true } : err
        )
      } : null);
    } catch (err) {
      console.error('Failed to mark error as resolved:', err);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getErrorSeverityColor = (count: number) => {
    if (count >= 100) return 'text-red-600 bg-red-100';
    if (count >= 10) return 'text-yellow-600 bg-yellow-100';
    return 'text-blue-600 bg-blue-100';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Error Tracking</h3>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {errorStats && (
        <div className="p-6">
          {/* Error Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{errorStats.totalErrors}</div>
              <div className="text-sm text-gray-600">Total Errors</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{errorStats.errorRate.toFixed(2)}%</div>
              <div className="text-sm text-gray-600">Error Rate</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">
                {Object.keys(errorStats.errorsByService).length}
              </div>
              <div className="text-sm text-gray-600">Affected Services</div>
            </div>
          </div>

          {/* Top Errors */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Top Errors</h4>
            {errorStats.topErrors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p>No errors found in the selected time range</p>
              </div>
            ) : (
              <div className="space-y-3">
                {errorStats.topErrors.map((errorReport) => (
                  <div
                    key={errorReport.id}
                    className={`border rounded-lg p-4 ${errorReport.resolved ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getErrorSeverityColor(errorReport.count)}`}>
                            {errorReport.count} occurrences
                          </span>
                          <span className="text-sm text-gray-600">{errorReport.service}</span>
                          {errorReport.resolved && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                              Resolved
                            </span>
                          )}
                        </div>
                        
                        <h5 className="font-medium text-gray-900 mb-1">{errorReport.message}</h5>
                        
                        {errorReport.endpoint && (
                          <div className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">{errorReport.method}</span> {errorReport.endpoint}
                            {errorReport.statusCode && (
                              <span className="ml-2 text-red-600">({errorReport.statusCode})</span>
                            )}
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          First: {formatTimestamp(errorReport.firstOccurrence)} | 
                          Last: {formatTimestamp(errorReport.lastOccurrence)}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setExpandedError(
                            expandedError === errorReport.id ? null : errorReport.id
                          )}
                          className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md"
                        >
                          {expandedError === errorReport.id ? 'Hide' : 'Details'}
                        </button>
                        
                        {!errorReport.resolved && (
                          <button
                            onClick={() => markErrorAsResolved(errorReport.id)}
                            className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded-md"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {expandedError === errorReport.id && errorReport.stack && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <h6 className="text-sm font-medium text-gray-900 mb-2">Stack Trace</h6>
                        <pre className="text-xs bg-gray-100 p-3 rounded-md overflow-x-auto">
                          {errorReport.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Errors by Service */}
          {Object.keys(errorStats.errorsByService).length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">Errors by Service</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(errorStats.errorsByService).map(([service, count]) => (
                  <div key={service} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">{service}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getErrorSeverityColor(count)}`}>
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorTrackingPanel;