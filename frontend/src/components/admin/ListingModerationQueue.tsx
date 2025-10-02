import React, { useState, useMemo } from 'react';
import { FlaggedListing, ContentFlag } from '../../types/admin';

interface ListingModerationQueueProps {
  listings: FlaggedListing[];
  onSelectListing: (listing: FlaggedListing) => void;
  onQuickAction: (listingId: string, action: 'approve' | 'reject') => void;
  loading?: boolean;
}

const ListingModerationQueue: React.FC<ListingModerationQueueProps> = ({
  listings,
  onSelectListing,
  onQuickAction,
  loading = false
}) => {
  const [sortBy, setSortBy] = useState<'flaggedAt' | 'severity' | 'flagCount'>('flaggedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const sortedAndFilteredListings = useMemo(() => {
    let filtered = listings;

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(listing => listing.status === filterStatus);
    }

    // Apply severity filter
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(listing => 
        listing.flags.some(flag => flag.severity === filterSeverity)
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'flaggedAt':
          aValue = new Date(a.flaggedAt).getTime();
          bValue = new Date(b.flaggedAt).getTime();
          break;
        case 'severity':
          const severityOrder = { high: 3, medium: 2, low: 1 };
          aValue = Math.max(...a.flags.map(f => severityOrder[f.severity]));
          bValue = Math.max(...b.flags.map(f => severityOrder[f.severity]));
          break;
        case 'flagCount':
          aValue = a.flags.length;
          bValue = b.flags.length;
          break;
        default:
          return 0;
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [listings, sortBy, sortOrder, filterStatus, filterSeverity]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHighestSeverity = (flags: ContentFlag[]) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return flags.reduce((highest, flag) => 
      severityOrder[flag.severity] > severityOrder[highest.severity] ? flag : highest
    );
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Moderation Queue</h2>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">
            Moderation Queue ({sortedAndFilteredListings.length})
          </h2>
          
          <div className="flex space-x-4">
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Severity Filter */}
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">All Severity</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Sort Options */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="flaggedAt-desc">Newest First</option>
              <option value="flaggedAt-asc">Oldest First</option>
              <option value="severity-desc">High Severity First</option>
              <option value="flagCount-desc">Most Flags First</option>
            </select>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {sortedAndFilteredListings.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No listings match the current filters.
          </div>
        ) : (
          sortedAndFilteredListings.map((listing) => {
            const highestSeverityFlag = getHighestSeverity(listing.flags);
            
            return (
              <div
                key={listing.listingId}
                className="p-6 hover:bg-gray-50 cursor-pointer"
                onClick={() => onSelectListing(listing)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {listing.title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(listing.status)}`}>
                        {listing.status.replace('_', ' ')}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(highestSeverityFlag.severity)}`}>
                        {highestSeverityFlag.severity} priority
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                      <span>Owner: {listing.ownerName}</span>
                      <span>•</span>
                      <span>${listing.price.toLocaleString()}</span>
                      <span>•</span>
                      <span>{listing.location.city}, {listing.location.state}</span>
                      <span>•</span>
                      <span>{listing.flags.length} flag{listing.flags.length !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {listing.flags.slice(0, 3).map((flag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700"
                        >
                          {flag.type}: {flag.reason}
                        </span>
                      ))}
                      {listing.flags.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                          +{listing.flags.length - 3} more
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-400">
                      Flagged {new Date(listing.flaggedAt).toLocaleDateString()} at{' '}
                      {new Date(listing.flaggedAt).toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {listing.images.length > 0 && (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                    )}
                    
                    {listing.status === 'pending' && (
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickAction(listing.listingId, 'approve');
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          Quick Approve
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickAction(listing.listingId, 'reject');
                          }}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                        >
                          Quick Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ListingModerationQueue;