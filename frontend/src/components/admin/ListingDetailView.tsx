import React, { useState } from 'react';
import { FlaggedListing, ContentFlag, ModerationDecision } from '../../types/admin';

interface ListingDetailViewProps {
  listing: FlaggedListing;
  onModerate: (decision: ModerationDecision) => void;
  onClose: () => void;
  loading?: boolean;
}

const ListingDetailView: React.FC<ListingDetailViewProps> = ({
  listing,
  onModerate,
  onClose,
  loading = false
}) => {
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | 'request_changes'>('approve');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [notifyUser, setNotifyUser] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      alert('Please provide a reason for your decision.');
      return;
    }

    const decision: ModerationDecision = {
      action: selectedAction,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
      notifyUser
    };

    onModerate(decision);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFlagTypeColor = (type: string) => {
    switch (type) {
      case 'fraud': return 'bg-red-100 text-red-800';
      case 'inappropriate': return 'bg-orange-100 text-orange-800';
      case 'spam': return 'bg-yellow-100 text-yellow-800';
      case 'duplicate': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Listing Moderation Review</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Left Panel - Listing Details */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">{listing.title}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Price:</span>
                    <span className="ml-2">${listing.price.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Location:</span>
                    <span className="ml-2">{listing.location.city}, {listing.location.state}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Owner:</span>
                    <span className="ml-2">{listing.ownerName}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <span className="ml-2">{listing.ownerEmail}</span>
                  </div>
                </div>
              </div>

              {/* Images */}
              {listing.images.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Images</h4>
                  <div className="space-y-3">
                    <div className="relative">
                      <img
                        src={listing.images[currentImageIndex]}
                        alt={`Listing image ${currentImageIndex + 1}`}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                      {listing.images.length > 1 && (
                        <div className="absolute inset-0 flex items-center justify-between p-2">
                          <button
                            onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                            disabled={currentImageIndex === 0}
                            className="bg-black bg-opacity-50 text-white p-2 rounded-full disabled:opacity-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setCurrentImageIndex(Math.min(listing.images.length - 1, currentImageIndex + 1))}
                            disabled={currentImageIndex === listing.images.length - 1}
                            className="bg-black bg-opacity-50 text-white p-2 rounded-full disabled:opacity-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    {listing.images.length > 1 && (
                      <div className="flex space-x-2 overflow-x-auto">
                        {listing.images.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`flex-shrink-0 w-16 h-16 rounded border-2 ${
                              index === currentImageIndex ? 'border-blue-500' : 'border-gray-200'
                            }`}
                          >
                            <img
                              src={image}
                              alt={`Thumbnail ${index + 1}`}
                              className="w-full h-full object-cover rounded"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Flags */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Reported Issues ({listing.flags.length})
                </h4>
                <div className="space-y-3">
                  {listing.flags.map((flag, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${getSeverityColor(flag.severity)}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFlagTypeColor(flag.type)}`}>
                            {flag.type}
                          </span>
                          <span className="text-sm font-medium">
                            {flag.severity} severity
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(flag.reportedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{flag.reason}</p>
                      <p className="text-xs text-gray-500">Reported by: {flag.reportedBy}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Moderation Actions */}
          <div className="w-96 border-l border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Moderation Decision</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="action"
                      value="approve"
                      checked={selectedAction === 'approve'}
                      onChange={(e) => setSelectedAction(e.target.value as any)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-green-700">Approve Listing</div>
                      <div className="text-sm text-gray-500">
                        The listing meets platform standards
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="action"
                      value="request_changes"
                      checked={selectedAction === 'request_changes'}
                      onChange={(e) => setSelectedAction(e.target.value as any)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-yellow-700">Request Changes</div>
                      <div className="text-sm text-gray-500">
                        Ask the owner to modify the listing
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="action"
                      value="reject"
                      checked={selectedAction === 'reject'}
                      onChange={(e) => setSelectedAction(e.target.value as any)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-red-700">Reject Listing</div>
                      <div className="text-sm text-gray-500">
                        Remove the listing from the platform
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="Explain your decision..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="Internal notes for other moderators..."
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notifyUser}
                    onChange={(e) => setNotifyUser(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">
                    Send notification to listing owner
                  </span>
                </label>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Submit Decision'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetailView;