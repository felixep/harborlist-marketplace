import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Listing } from '@harborlist/shared-types';
import { deleteListing, updateListing } from '../../services/listings';
import { useToast } from '../../contexts/ToastContext';

interface OwnerListingCardProps {
  listing: Listing;
}

export default function OwnerListingCard({ listing }: OwnerListingCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError, showWarning } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get the slug for navigation
  const slug = (listing as any).slug;
  const listingUrl = slug ? `/boat/${slug}` : `/listing/${listing.listingId}`;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteListing(listing.listingId),
    onSuccess: () => {
      showSuccess('Listing Deleted', 'Your listing has been deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['customer-listings'] });
      setShowDeleteConfirm(false);
    },
    onError: (error: any) => {
      showError('Delete Failed', error.message || 'Failed to delete listing');
    },
  });

  // Mark as sold mutation
  const markAsSoldMutation = useMutation({
    mutationFn: () => updateListing(listing.listingId, { status: 'sold' }),
    onSuccess: () => {
      showSuccess('Marked as Sold', 'Your listing has been marked as sold.');
      queryClient.invalidateQueries({ queryKey: ['customer-listings'] });
      setShowMenu(false);
    },
    onError: (error: any) => {
      showError('Update Failed', error.message || 'Failed to update listing');
    },
  });

  // Reactivate listing mutation
  const reactivateMutation = useMutation({
    mutationFn: () => updateListing(listing.listingId, { status: 'active' }),
    onSuccess: () => {
      showSuccess('Listing Reactivated', 'Your listing is now active again.');
      queryClient.invalidateQueries({ queryKey: ['customer-listings'] });
      setShowMenu(false);
    },
    onError: (error: any) => {
      showError('Update Failed', error.message || 'Failed to reactivate listing');
    },
  });

  const getStatusBadge = () => {
    const status = listing.status;
    const moderationStatus = (listing as any).moderationWorkflow?.status;

    if (status === 'pending_moderation' || moderationStatus === 'pending_review') {
      return {
        label: 'Pending Review',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: '⏳',
      };
    }
    if (moderationStatus === 'changes_requested') {
      return {
        label: 'Changes Requested',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: '⚠️',
      };
    }
    if (moderationStatus === 'rejected') {
      return {
        label: 'Rejected',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: '❌',
      };
    }
    if (status === 'active') {
      return {
        label: 'Active',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '✓',
      };
    }
    if (status === 'sold') {
      return {
        label: 'Sold',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: '🎉',
      };
    }
    return {
      label: status,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: '',
    };
  };

  const statusBadge = getStatusBadge();
  const imageUrl = listing.images?.[0] || listing.thumbnails?.[0] || 'https://via.placeholder.com/400x300?text=No+Image';
  const price = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(listing.price);

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
        {/* Image */}
        <div className="relative">
          <Link to={listingUrl}>
            <img
              src={imageUrl}
              alt={listing.title}
              className="w-full h-48 object-cover"
            />
          </Link>
          
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${statusBadge.color}`}>
              <span className="mr-1">{statusBadge.icon}</span>
              {statusBadge.label}
            </span>
          </div>

          {/* Views Counter */}
          <div className="absolute top-3 right-3 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs flex items-center">
            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {listing.views || 0} views
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <Link to={listingUrl}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1 hover:text-blue-600 transition-colors">
              {listing.title}
            </h3>
          </Link>
          
          <p className="text-sm text-gray-600 mb-2">
            {listing.boatDetails?.year} • {listing.boatDetails?.length}ft • {listing.location?.city}, {listing.location?.state}
          </p>

          <p className="text-2xl font-bold text-blue-600 mb-3">{price}</p>

          {/* Moderation Message */}
          {(listing as any).moderationWorkflow?.status === 'changes_requested' && (
            <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
              <p className="font-medium">Changes requested:</p>
              <p className="mt-1">{(listing as any).moderationWorkflow?.requiredChanges || 'Please review moderator notes'}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              to={listingUrl}
              className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
            >
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View
            </Link>
            
            <button
              onClick={() => navigate(`/edit/${listing.listingId}`)}
              className="flex items-center justify-center px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors"
            >
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          </div>

          {/* More Actions Dropdown */}
          <div className="relative mt-2">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-full flex items-center justify-center px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors"
            >
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
              More Actions
            </button>

            {showMenu && (
              <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                {listing.status !== 'sold' && (
                  <button
                    onClick={() => {
                      markAsSoldMutation.mutate();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <svg className="h-4 w-4 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mark as Sold
                  </button>
                )}

                {listing.status === 'sold' && (
                  <button
                    onClick={() => {
                      reactivateMutation.mutate();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <svg className="h-4 w-4 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reactivate Listing
                  </button>
                )}

                <button
                  onClick={() => {
                    const url = slug ? `/boat/${slug}` : `/listing/${listing.listingId}`;
                    navigator.clipboard.writeText(`${window.location.origin}${url}`);
                    showSuccess('Link Copied', 'Listing link copied to clipboard');
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <svg className="h-4 w-4 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </button>

                <button
                  onClick={() => {
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + listingUrl)}`, '_blank');
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <svg className="h-4 w-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Share on Facebook
                </button>

                <button
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center border-t border-gray-200"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Listing
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Footer */}
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 grid grid-cols-3 gap-2 text-xs text-gray-600">
          <div className="text-center">
            <div className="font-semibold text-gray-900">{listing.views || 0}</div>
            <div>Views</div>
          </div>
          <div className="text-center border-l border-gray-200">
            <div className="font-semibold text-gray-900">0</div>
            <div>Inquiries</div>
          </div>
          <div className="text-center border-l border-gray-200">
            <div className="font-semibold text-gray-900">
              {new Date(listing.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div>Listed</div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Listing?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{listing.title}"? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  );
}
