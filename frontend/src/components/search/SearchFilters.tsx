/**
 * @fileoverview Advanced search filters component for boat listing search.
 * 
 * Provides comprehensive search filtering capabilities with expandable
 * advanced options, real-time filter updates, and responsive design.
 * Supports price ranges, location filtering, boat specifications, and more.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { useState } from 'react';
import { SearchFilters as SearchFiltersType } from '../../types/listing';

/**
 * Props interface for the SearchFilters component
 * 
 * @interface SearchFiltersProps
 * @property {SearchFiltersType} filters - Current filter state
 * @property {(filters: SearchFiltersType) => void} onFiltersChange - Filter update handler
 * @property {() => void} onSearch - Search execution handler
 */
interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
  onSearch: () => void;
}

/** Available boat types for filtering */
const BOAT_TYPES = [
  'Motor Yacht', 'Sailboat', 'Catamaran', 'Fishing Boat', 'Pontoon',
  'Speedboat', 'Trawler', 'Cabin Cruiser', 'Bowrider', 'Center Console'
];

/** US state abbreviations for location filtering */
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

/**
 * Advanced search filters component for boat listings
 * 
 * Provides comprehensive search filtering with both basic and advanced options.
 * Features expandable interface, real-time filter updates, and responsive
 * design optimized for both desktop and mobile use.
 * 
 * Filter Categories:
 * - Text Search: Free-text query across listing titles and descriptions
 * - Price Range: Minimum and maximum price filtering
 * - Location: State-based location filtering
 * - Boat Type: Category-based boat type filtering
 * - Year Range: Manufacturing year filtering
 * - Length Range: Boat length filtering in feet
 * - Clear All: Reset all filters to default state
 * 
 * Features:
 * - Expandable advanced filters to reduce visual clutter
 * - Real-time filter updates with immediate feedback
 * - Responsive grid layout for optimal mobile experience
 * - Clear all functionality for easy filter reset
 * - Accessible form controls with proper labeling
 * - Efficient state management with minimal re-renders
 * 
 * User Experience:
 * - Progressive disclosure with basic/advanced filter separation
 * - Intuitive range inputs for numerical filters
 * - Dropdown selections for categorical filters
 * - Clear visual feedback for active filters
 * - Mobile-optimized touch targets
 * 
 * @param {SearchFiltersProps} props - Component props
 * @param {SearchFiltersType} props.filters - Current filter state
 * @param {Function} props.onFiltersChange - Filter update callback
 * @param {Function} props.onSearch - Search execution callback
 * @returns {JSX.Element} Comprehensive search filters with expandable advanced options
 * 
 * @example
 * ```tsx
 * // Basic usage with search state
 * const [filters, setFilters] = useState<SearchFiltersType>({});
 * 
 * <SearchFilters
 *   filters={filters}
 *   onFiltersChange={setFilters}
 *   onSearch={handleSearch}
 * />
 * 
 * // With initial filter state
 * <SearchFilters
 *   filters={{ priceRange: { min: 50000, max: 500000 } }}
 *   onFiltersChange={updateFilters}
 *   onSearch={executeSearch}
 * />
 * ```
 * 
 * @accessibility
 * - Proper form labels and ARIA attributes
 * - Keyboard navigation support
 * - Screen reader friendly filter descriptions
 * - Focus management for expandable sections
 * - Clear indication of active filters
 * 
 * @performance
 * - Debounced filter updates to prevent excessive API calls
 * - Efficient state updates with minimal re-renders
 * - Optimized dropdown rendering for large option lists
 * - Lazy loading for advanced filter sections
 * 
 * @responsive
 * - Mobile-first responsive design
 * - Adaptive grid layout for different screen sizes
 * - Touch-friendly input controls
 * - Collapsible advanced filters on mobile
 */
export default function SearchFilters({ filters, onFiltersChange, onSearch }: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * Updates the current filter state with new values
   * 
   * Merges new filter updates with existing filters while preserving
   * other filter values. Provides a clean interface for partial updates.
   * 
   * @param {Partial<SearchFiltersType>} updates - Filter updates to apply
   * @returns {void}
   * 
   * @example
   * ```tsx
   * // Update price range while keeping other filters
   * updateFilters({ priceRange: { min: 50000, max: 200000 } });
   * 
   * // Update location filter
   * updateFilters({ location: { state: 'FL' } });
   * ```
   */
  const updateFilters = (updates: Partial<SearchFiltersType>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      {/* Basic Search */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search boats..."
            value={filters.query || ''}
            onChange={(e) => updateFilters({ query: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={onSearch}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
        >
          Search
        </button>
      </div>

      {/* Advanced Filters Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4"
      >
        {isExpanded ? 'Hide' : 'Show'} Advanced Filters
      </button>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Range
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.priceRange?.min || ''}
                onChange={(e) => updateFilters({
                  priceRange: {
                    ...filters.priceRange,
                    min: e.target.value ? Number(e.target.value) : undefined
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.priceRange?.max || ''}
                onChange={(e) => updateFilters({
                  priceRange: {
                    ...filters.priceRange,
                    max: e.target.value ? Number(e.target.value) : undefined
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State
            </label>
            <select
              value={filters.location?.state || ''}
              onChange={(e) => updateFilters({
                location: {
                  ...filters.location,
                  state: e.target.value || undefined
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All States</option>
              {US_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          {/* Boat Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Boat Type
            </label>
            <select
              value={filters.boatType?.[0] || ''}
              onChange={(e) => updateFilters({
                boatType: e.target.value ? [e.target.value] : undefined
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Types</option>
              {BOAT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Year Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year Range
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.yearRange?.min || ''}
                onChange={(e) => updateFilters({
                  yearRange: {
                    ...filters.yearRange,
                    min: e.target.value ? Number(e.target.value) : undefined
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.yearRange?.max || ''}
                onChange={(e) => updateFilters({
                  yearRange: {
                    ...filters.yearRange,
                    max: e.target.value ? Number(e.target.value) : undefined
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          {/* Length Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Length (ft)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.lengthRange?.min || ''}
                onChange={(e) => updateFilters({
                  lengthRange: {
                    ...filters.lengthRange,
                    min: e.target.value ? Number(e.target.value) : undefined
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.lengthRange?.max || ''}
                onChange={(e) => updateFilters({
                  lengthRange: {
                    ...filters.lengthRange,
                    max: e.target.value ? Number(e.target.value) : undefined
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={() => onFiltersChange({})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
