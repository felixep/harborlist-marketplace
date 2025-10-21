import React, { useState } from 'react';
import { FlaggedListing, ContentFlag, ModerationDecision, EnhancedListing } from '@harborlist/shared-types';

interface ListingDetailViewProps {
  listing: FlaggedListing;
  onModerate: (decision: ModerationDecision) => void;
  onClose: () => void;
  loading?: boolean;
}

interface ChangeRequest {
  category: 'title' | 'description' | 'price' | 'images' | 'specifications' | 'other';
  description: string;
  required: boolean;
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
  const [publicNotes, setPublicNotes] = useState('');
  const [notifyUser, setNotifyUser] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [newChangeRequest, setNewChangeRequest] = useState<ChangeRequest>({
    category: 'title',
    description: '',
    required: true
  });
  const [showChangeRequestForm, setShowChangeRequestForm] = useState(false);
  const [reviewConfidence, setReviewConfidence] = useState<'low' | 'medium' | 'high'>('medium');
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'flags'>('details');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      alert('Please provide a reason for your decision.');
      return;
    }

    if (selectedAction === 'request_changes' && changeRequests.length === 0) {
      alert('Please specify at least one change request.');
      return;
    }

    const decision: ModerationDecision = {
      action: selectedAction,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
      notifyUser,
      publicNotes: publicNotes.trim() || undefined,
      changeRequests: selectedAction === 'request_changes' ? changeRequests : undefined,
      confidence: reviewConfidence
    };

    onModerate(decision);
  };

  const addChangeRequest = () => {
    if (!newChangeRequest.description.trim()) {
      alert('Please provide a description for the change request.');
      return;
    }

    setChangeRequests([...changeRequests, { ...newChangeRequest }]);
    setNewChangeRequest({
      category: 'title',
      description: '',
      required: true
    });
    setShowChangeRequestForm(false);
  };

  const removeChangeRequest = (index: number) => {
    setChangeRequests(changeRequests.filter((_, i) => i !== index));
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      title: 'Title',
      description: 'Description',
      price: 'Price',
      images: 'Images',
      specifications: 'Specifications',
      other: 'Other'
    };
    return labels[category] || category;
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
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
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

          {/* Status and Priority Indicators */}
          <div className="flex items-center space-x-4 mb-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              listing.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
              listing.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
              listing.status === 'approved' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {listing.status.replace(/_/g, ' ').toUpperCase()}
            </span>
            
            {listing.flags.length > 0 && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                getSeverityColor(listing.flags.reduce((highest, flag) => 
                  flag.severity === 'high' ? flag : highest.severity === 'high' ? highest : 
                  flag.severity === 'medium' ? flag : highest
                ))
              }`}>
                {listing.flags.reduce((highest, flag) => 
                  flag.severity === 'high' ? flag : highest.severity === 'high' ? highest : 
                  flag.severity === 'medium' ? flag : highest
                ).severity.toUpperCase()} PRIORITY
              </span>
            )}

            <span className="text-sm text-gray-500">
              Flagged {new Date(listing.flaggedAt).toLocaleDateString()}
            </span>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-2 border-b-2 font-medium text-sm ${
                activeTab === 'details' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Listing Details
            </button>
            <button
              onClick={() => setActiveTab('flags')}
              className={`pb-2 border-b-2 font-medium text-sm ${
                activeTab === 'flags' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Reported Issues ({listing.flags.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2 border-b-2 font-medium text-sm ${
                activeTab === 'history' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Moderation History
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Left Panel - Tabbed Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{listing.title}</h3>
                </div>

                {/* Images */}
                {listing.images.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Images ({listing.images.length})</h4>
                    <div className="space-y-3">
                      <div className="relative">
                        <img
                          src={listing.images[currentImageIndex]}
                          alt={`Listing image ${currentImageIndex + 1}`}
                          className="w-full h-96 object-cover rounded-lg"
                        />
                        {listing.images.length > 1 && (
                          <div className="absolute inset-0 flex items-center justify-between p-2">
                            <button
                              onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                              disabled={currentImageIndex === 0}
                              className="bg-black bg-opacity-50 text-white p-2 rounded-full disabled:opacity-50 hover:bg-opacity-70"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setCurrentImageIndex(Math.min(listing.images.length - 1, currentImageIndex + 1))}
                              disabled={currentImageIndex === listing.images.length - 1}
                              className="bg-black bg-opacity-50 text-white p-2 rounded-full disabled:opacity-50 hover:bg-opacity-70"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                          {currentImageIndex + 1} / {listing.images.length}
                        </div>
                      </div>
                      {listing.images.length > 1 && (
                        <div className="flex space-x-2 overflow-x-auto pb-2">
                          {listing.images.map((image, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`flex-shrink-0 w-20 h-20 rounded border-2 ${
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

                {/* Description */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Description</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {listing.description || 'No description provided'}
                    </p>
                  </div>
                </div>

                {/* Basic Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 rounded-lg p-4">
                    <div>
                      <span className="font-medium text-gray-700">Price:</span>
                      <span className="ml-2">${listing.price.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Location:</span>
                      <span className="ml-2">{listing.location?.city}, {listing.location?.state}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Owner:</span>
                      <span className="ml-2">{listing.ownerName}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Email:</span>
                      <span className="ml-2">{listing.ownerEmail}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Listing ID:</span>
                      <span className="ml-2 font-mono text-xs">{listing.listingId}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Created:</span>
                      <span className="ml-2">{listing.createdAt ? new Date(listing.createdAt * 1000).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Boat Details */}
                {(listing as any).boatDetails && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Boat Specifications</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {(listing as any).boatDetails.type && (
                          <div>
                            <span className="font-medium text-gray-700">Type:</span>
                            <span className="ml-2">{(listing as any).boatDetails.type}</span>
                          </div>
                        )}
                        {(listing as any).boatDetails.manufacturer && (
                          <div>
                            <span className="font-medium text-gray-700">Manufacturer:</span>
                            <span className="ml-2">{(listing as any).boatDetails.manufacturer}</span>
                          </div>
                        )}
                        {(listing as any).boatDetails.model && (
                          <div>
                            <span className="font-medium text-gray-700">Model:</span>
                            <span className="ml-2">{(listing as any).boatDetails.model}</span>
                          </div>
                        )}
                        {(listing as any).boatDetails.year && (
                          <div>
                            <span className="font-medium text-gray-700">Year:</span>
                            <span className="ml-2">{(listing as any).boatDetails.year}</span>
                          </div>
                        )}
                        {(listing as any).boatDetails.length && (
                          <div>
                            <span className="font-medium text-gray-700">Length:</span>
                            <span className="ml-2">{(listing as any).boatDetails.length} ft</span>
                          </div>
                        )}
                        {(listing as any).boatDetails.beam && (
                          <div>
                            <span className="font-medium text-gray-700">Beam:</span>
                            <span className="ml-2">{(listing as any).boatDetails.beam} ft</span>
                          </div>
                        )}
                        {(listing as any).boatDetails.draft && (
                          <div>
                            <span className="font-medium text-gray-700">Draft:</span>
                            <span className="ml-2">{(listing as any).boatDetails.draft} ft</span>
                          </div>
                        )}
                        {(listing as any).boatDetails.condition && (
                          <div>
                            <span className="font-medium text-gray-700">Condition:</span>
                            <span className="ml-2">{(listing as any).boatDetails.condition}</span>
                          </div>
                        )}
                        {(listing as any).boatDetails.hours && (
                          <div>
                            <span className="font-medium text-gray-700">Hours:</span>
                            <span className="ml-2">{(listing as any).boatDetails.hours.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Engine Information */}
                      {(listing as any).boatDetails.engines && (listing as any).boatDetails.engines.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h5 className="font-medium text-gray-900 mb-2">Engines</h5>
                          <div className="space-y-3">
                            {(listing as any).boatDetails.engines.map((engine: any, idx: number) => (
                              <div key={idx} className="bg-white rounded p-3">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="font-medium text-gray-700">Make:</span>
                                    <span className="ml-2">{engine.make}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700">Model:</span>
                                    <span className="ml-2">{engine.model}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700">Horsepower:</span>
                                    <span className="ml-2">{engine.horsepower} HP</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700">Fuel:</span>
                                    <span className="ml-2 capitalize">{engine.fuelType}</span>
                                  </div>
                                  {engine.year && (
                                    <div>
                                      <span className="font-medium text-gray-700">Year:</span>
                                      <span className="ml-2">{engine.year}</span>
                                    </div>
                                  )}
                                  {engine.hours && (
                                    <div>
                                      <span className="font-medium text-gray-700">Hours:</span>
                                      <span className="ml-2">{engine.hours.toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          {(listing as any).boatDetails.totalHorsepower && (
                            <div className="mt-2 text-sm">
                              <span className="font-medium text-gray-700">Total Horsepower:</span>
                              <span className="ml-2">{(listing as any).boatDetails.totalHorsepower} HP</span>
                            </div>
                          )}
                        </div>
                      )}
                      {(listing as any).boatDetails.engine && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Engine:</span>
                            <span className="ml-2">{(listing as any).boatDetails.engine}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Features */}
                {(listing as any).features && (listing as any).features.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Features</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex flex-wrap gap-2">
                        {(listing as any).features.map((feature: string, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Specifications */}
                {(listing as any).specifications && Object.keys((listing as any).specifications).length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Additional Specifications</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {Object.entries((listing as any).specifications).map(([key, value]: [string, any]) => (
                          <div key={key}>
                            <span className="font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="ml-2">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'flags' && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">
                  Reported Issues ({listing.flags.length})
                </h4>
                {listing.flags.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No flags reported for this listing
                  </div>
                ) : (
                  <div className="space-y-4">
                    {listing.flags.map((flag, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 ${getSeverityColor(flag.severity)}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFlagTypeColor(flag.type)}`}>
                              {flag.type}
                            </span>
                            <span className="text-sm font-medium capitalize">
                              {flag.severity} severity
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(flag.reportedAt).toLocaleDateString()} at{' '}
                            {new Date(flag.reportedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{flag.reason}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Reported by: {flag.reportedBy}</span>
                          <span className={`px-2 py-1 rounded-full ${
                            flag.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            flag.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                            flag.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {flag.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Moderation History</h4>
                <div className="space-y-3">
                  {listing.reviewedAt ? (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">Previous Review</span>
                        <span className="text-xs text-gray-500">
                          {new Date(listing.reviewedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Reviewed by: {listing.reviewedBy || 'Unknown'}
                      </p>
                      {listing.moderationNotes && (
                        <p className="text-sm text-gray-700 mt-2">
                          Notes: {listing.moderationNotes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No previous moderation history
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Enhanced Moderation Actions */}
          <div className="w-96 border-l border-gray-200 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-6 p-6 pb-12">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Moderation Decision</h4>
                <div className="space-y-3">
                  <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="action"
                      value="approve"
                      checked={selectedAction === 'approve'}
                      onChange={(e) => setSelectedAction(e.target.value as any)}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium text-green-700">Approve Listing</div>
                      <div className="text-sm text-gray-500">
                        The listing meets platform standards and can be published
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="action"
                      value="request_changes"
                      checked={selectedAction === 'request_changes'}
                      onChange={(e) => {
                        setSelectedAction(e.target.value as any);
                        setShowChangeRequestForm(false);
                      }}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium text-yellow-700">Request Changes</div>
                      <div className="text-sm text-gray-500">
                        Ask the owner to modify specific aspects of the listing
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="action"
                      value="reject"
                      checked={selectedAction === 'reject'}
                      onChange={(e) => setSelectedAction(e.target.value as any)}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium text-red-700">Reject Listing</div>
                      <div className="text-sm text-gray-500">
                        Remove the listing permanently from the platform
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Change Requests Section */}
              {selectedAction === 'request_changes' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900">Required Changes</h5>
                    <button
                      type="button"
                      onClick={() => setShowChangeRequestForm(!showChangeRequestForm)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Change Request
                    </button>
                  </div>

                  {changeRequests.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {changeRequests.map((request, index) => (
                        <div key={index} className="flex items-start justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-medium text-yellow-800 bg-yellow-200 px-2 py-1 rounded">
                                {getCategoryLabel(request.category)}
                              </span>
                              {request.required && (
                                <span className="text-xs text-red-600">Required</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700">{request.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeChangeRequest(index)}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {showChangeRequestForm && (
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category
                        </label>
                        <select
                          value={newChangeRequest.category}
                          onChange={(e) => setNewChangeRequest({
                            ...newChangeRequest,
                            category: e.target.value as any
                          })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          <option value="title">Title</option>
                          <option value="description">Description</option>
                          <option value="price">Price</option>
                          <option value="images">Images</option>
                          <option value="specifications">Specifications</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={newChangeRequest.description}
                          onChange={(e) => setNewChangeRequest({
                            ...newChangeRequest,
                            description: e.target.value
                          })}
                          rows={2}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          placeholder="Describe what needs to be changed..."
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newChangeRequest.required}
                            onChange={(e) => setNewChangeRequest({
                              ...newChangeRequest,
                              required: e.target.checked
                            })}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Required change</span>
                        </label>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowChangeRequestForm(false)}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={addChangeRequest}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                  Public Notes (Visible to Owner)
                </label>
                <textarea
                  value={publicNotes}
                  onChange={(e) => setPublicNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="Additional information for the listing owner..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Internal Notes (Moderators Only)
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Confidence
                </label>
                <select
                  value={reviewConfidence}
                  onChange={(e) => setReviewConfidence(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="low">Low - May need second opinion</option>
                  <option value="medium">Medium - Standard review</option>
                  <option value="high">High - Very confident in decision</option>
                </select>
              </div>

              <div className="space-y-3">
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
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
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