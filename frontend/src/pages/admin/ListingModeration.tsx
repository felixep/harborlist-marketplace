import React, { useState } from 'react';
import ListingModerationQueue from '../../components/admin/ListingModerationQueue';
import ListingDetailView from '../../components/admin/ListingDetailView';
import ModerationNotifications from '../../components/admin/ModerationNotifications';
import { useModerationQueue } from '../../hooks/useModerationQueue';
import { useNotifications } from '../../hooks/useNotifications';
import { FlaggedListing, ModerationDecision } from '../../types/admin';

const ListingModeration: React.FC = () => {
  const [selectedListing, setSelectedListing] = useState<FlaggedListing | null>(null);
  const [moderationLoading, setModerationLoading] = useState(false);
  
  const {
    listings,
    stats,
    loading,
    error,
    refreshListings,
    moderateListing,
    getListingDetails
  } = useModerationQueue();

  const { notifications, addNotification, removeNotification } = useNotifications();

  const handleSelectListing = async (listing: FlaggedListing) => {
    try {
      // Get detailed listing information
      const detailedListing = await getListingDetails(listing.listingId);
      setSelectedListing(detailedListing || listing);
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load listing details'
      });
    }
  };

  const handleQuickAction = async (listingId: string, action: 'approve' | 'reject') => {
    try {
      setModerationLoading(true);
      
      const decision: ModerationDecision = {
        action,
        reason: action === 'approve' ? 'Quick approval - no issues found' : 'Quick rejection - violates platform policies',
        notifyUser: true
      };

      await moderateListing(listingId, decision);
      
      addNotification({
        type: 'success',
        title: 'Success',
        message: `Listing ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to moderate listing'
      });
    } finally {
      setModerationLoading(false);
    }
  };

  const handleModerate = async (decision: ModerationDecision) => {
    if (!selectedListing) return;

    try {
      setModerationLoading(true);
      
      await moderateListing(selectedListing.listingId, decision);
      
      addNotification({
        type: 'success',
        title: 'Moderation Complete',
        message: `Listing has been ${decision.action === 'approve' ? 'approved' : 
                  decision.action === 'reject' ? 'rejected' : 'marked for changes'}`
      });
      
      setSelectedListing(null);
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Moderation Failed',
        message: err instanceof Error ? err.message : 'Failed to moderate listing'
      });
    } finally {
      setModerationLoading(false);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Listing Moderation</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error Loading Moderation Queue</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={refreshListings}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Listing Moderation</h1>
        <button
          onClick={refreshListings}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Moderation Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{stats.totalFlagged}</div>
            <div className="text-sm text-gray-500">Total Flagged</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</div>
            <div className="text-sm text-gray-500">Pending Review</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{stats.approvedToday}</div>
            <div className="text-sm text-gray-500">Approved Today</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-red-600">{stats.rejectedToday}</div>
            <div className="text-sm text-gray-500">Rejected Today</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{stats.averageReviewTime}h</div>
            <div className="text-sm text-gray-500">Avg Review Time</div>
          </div>
        </div>
      )}

      {/* Moderation Queue */}
      <ListingModerationQueue
        listings={listings}
        onSelectListing={handleSelectListing}
        onQuickAction={handleQuickAction}
        loading={loading}
      />

      {/* Listing Detail Modal */}
      {selectedListing && (
        <ListingDetailView
          listing={selectedListing}
          onModerate={handleModerate}
          onClose={() => setSelectedListing(null)}
          loading={moderationLoading}
        />
      )}

      {/* Notifications */}
      <ModerationNotifications
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
};

export default ListingModeration;