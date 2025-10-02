import React, { useState } from 'react';
import { TicketFilters, SupportStats } from '@harborlist/shared-types';

interface SupportFiltersProps {
  filters: TicketFilters;
  onFiltersChange: (filters: TicketFilters) => void;
  stats: SupportStats | null;
}

const SupportFilters: React.FC<SupportFiltersProps> = ({
  filters,
  onFiltersChange,
  stats
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key: keyof TicketFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleMultiSelectChange = (key: keyof TicketFilters, value: string, checked: boolean) => {
    const currentValues = (filters[key] as string[]) || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    
    handleFilterChange(key, newValues.length > 0 ? newValues : undefined);
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof TicketFilters];
    return value !== undefined && value !== null && 
           (Array.isArray(value) ? value.length > 0 : true);
  });

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filter Tickets</h3>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
            placeholder="Search tickets..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <div className="space-y-1">
            {['open', 'in_progress', 'waiting_response', 'resolved', 'closed'].map((status) => (
              <label key={status} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(filters.status || []).includes(status)}
                  onChange={(e) => handleMultiSelectChange('status', status, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">
                  {status.replace('_', ' ')}
                </span>
                {stats && (
                  <span className="ml-auto text-xs text-gray-500">
                    {stats.ticketsByStatus[status as keyof typeof stats.ticketsByStatus]}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Priority Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <div className="space-y-1">
            {['urgent', 'high', 'medium', 'low'].map((priority) => (
              <label key={priority} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(filters.priority || []).includes(priority)}
                  onChange={(e) => handleMultiSelectChange('priority', priority, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">
                  {priority}
                </span>
                {stats && (
                  <span className="ml-auto text-xs text-gray-500">
                    {stats.ticketsByPriority[priority as keyof typeof stats.ticketsByPriority]}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <div className="space-y-1">
            {['technical', 'billing', 'account', 'listing', 'general'].map((category) => (
              <label key={category} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(filters.category || []).includes(category)}
                  onChange={(e) => handleMultiSelectChange('category', category, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">
                  {category}
                </span>
                {stats && (
                  <span className="ml-auto text-xs text-gray-500">
                    {stats.ticketsByCategory[category as keyof typeof stats.ticketsByCategory]}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Quick Filters */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quick Filters
          </label>
          <div className="space-y-2">
            <button
              onClick={() => handleFilterChange('status', ['open'])}
              className="w-full text-left px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
            >
              Open Tickets
              {stats && (
                <span className="float-right">{stats.openTickets}</span>
              )}
            </button>
            <button
              onClick={() => handleFilterChange('assignedTo', ['unassigned'])}
              className="w-full text-left px-3 py-2 text-sm bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100"
            >
              Unassigned
            </button>
            <button
              onClick={() => handleFilterChange('priority', ['urgent', 'high'])}
              className="w-full text-left px-3 py-2 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100"
            >
              High Priority
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={filters.dateRange?.startDate || ''}
                  onChange={(e) => handleFilterChange('dateRange', {
                    ...filters.dateRange,
                    startDate: e.target.value
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="date"
                  value={filters.dateRange?.endDate || ''}
                  onChange={(e) => handleFilterChange('dateRange', {
                    ...filters.dateRange,
                    endDate: e.target.value
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                value={(filters.tags || []).join(', ')}
                onChange={(e) => {
                  const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                  handleFilterChange('tags', tags.length > 0 ? tags : undefined);
                }}
                placeholder="Enter tags separated by commas"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Assigned To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned To
              </label>
              <select
                value={(filters.assignedTo || [])[0] || ''}
                onChange={(e) => handleFilterChange('assignedTo', e.target.value ? [e.target.value] : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="unassigned">Unassigned</option>
                <option value="me">Assigned to Me</option>
                {/* In a real implementation, this would be populated with actual admin users */}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700">Active filters:</span>
            {filters.status && filters.status.map(status => (
              <span
                key={status}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                Status: {status}
                <button
                  onClick={() => {
                    const newStatus = filters.status!.filter(s => s !== status);
                    handleFilterChange('status', newStatus.length > 0 ? newStatus : undefined);
                  }}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
            {filters.priority && filters.priority.map(priority => (
              <span
                key={priority}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
              >
                Priority: {priority}
                <button
                  onClick={() => {
                    const newPriority = filters.priority!.filter(p => p !== priority);
                    handleFilterChange('priority', newPriority.length > 0 ? newPriority : undefined);
                  }}
                  className="ml-1 text-orange-600 hover:text-orange-800"
                >
                  ×
                </button>
              </span>
            ))}
            {filters.search && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Search: {filters.search}
                <button
                  onClick={() => handleFilterChange('search', undefined)}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { SupportFilters };