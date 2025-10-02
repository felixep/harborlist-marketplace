import React, { useState, useEffect } from 'react';
import { usePlatformSettings } from '../../../hooks/usePlatformSettings';
import { SettingsAuditLog as AuditLogType } from '../../../types/admin';

const SettingsAuditLog: React.FC = () => {
  const { auditLog, loadingAuditLog, getAuditLog } = usePlatformSettings();
  const [filters, setFilters] = useState({
    section: '',
    adminEmail: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 50
  });

  useEffect(() => {
    getAuditLog(filters);
  }, [filters, getAuditLog]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatValue = (value: any) => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'general': return '⚙️';
      case 'features': return '🚀';
      case 'content': return '📋';
      case 'listings': return '🏷️';
      case 'notifications': return '🔔';
      default: return '📝';
    }
  };

  const getActionColor = (field: string) => {
    if (field.includes('reset') || field.includes('delete')) {
      return 'text-red-600 bg-red-50';
    }
    if (field.includes('create') || field.includes('add')) {
      return 'text-green-600 bg-green-50';
    }
    return 'text-blue-600 bg-blue-50';
  };

  if (loadingAuditLog) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Settings Audit Log</h3>
        <p className="text-sm text-gray-600 mb-6">
          Track all changes made to platform settings with detailed audit information.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Filters</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="section" className="block text-sm font-medium text-gray-700">
              Section
            </label>
            <select
              id="section"
              value={filters.section}
              onChange={(e) => handleFilterChange('section', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Sections</option>
              <option value="general">General</option>
              <option value="features">Features</option>
              <option value="content">Content</option>
              <option value="listings">Listings</option>
              <option value="notifications">Notifications</option>
            </select>
          </div>

          <div>
            <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">
              Admin Email
            </label>
            <input
              type="email"
              id="adminEmail"
              value={filters.adminEmail}
              onChange={(e) => handleFilterChange('adminEmail', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Filter by admin email"
            />
          </div>

          <div>
            <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700">
              From Date
            </label>
            <input
              type="date"
              id="dateFrom"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700">
              To Date
            </label>
            <input
              type="date"
              id="dateTo"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Audit Log Entries */}
      <div className="space-y-4">
        {auditLog.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">📝</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No audit log entries found</h3>
            <p className="text-gray-500">No settings changes match your current filters.</p>
          </div>
        ) : (
          auditLog.map((entry) => (
            <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <span className="text-2xl">{getSectionIcon(entry.section)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(entry.field)}`}>
                        {entry.section}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{entry.field}</span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Admin:</strong> {entry.adminEmail} | 
                      <strong> Time:</strong> {formatTimestamp(entry.timestamp)} |
                      <strong> IP:</strong> {entry.ipAddress}
                    </div>

                    <div className="text-sm text-gray-700 mb-3">
                      <strong>Reason:</strong> {entry.reason}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Old Value
                        </h5>
                        <div className="bg-red-50 border border-red-200 rounded p-2 text-xs font-mono text-red-800 max-h-32 overflow-y-auto">
                          <pre className="whitespace-pre-wrap">{formatValue(entry.oldValue)}</pre>
                        </div>
                      </div>
                      <div>
                        <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          New Value
                        </h5>
                        <div className="bg-green-50 border border-green-200 rounded p-2 text-xs font-mono text-green-800 max-h-32 overflow-y-auto">
                          <pre className="whitespace-pre-wrap">{formatValue(entry.newValue)}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {auditLog.length > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={filters.page === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={auditLog.length < filters.limit}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{filters.page}</span> of audit log entries
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={filters.page === 1}
                  className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700">
                  {filters.page}
                </span>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={auditLog.length < filters.limit}
                  className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsAuditLog;