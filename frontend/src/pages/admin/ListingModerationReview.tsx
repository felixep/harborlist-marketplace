import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FlaggedListing, ModerationDecision } from '@harborlist/shared-types';
import { useModerationQueue } from '../../hooks/useModerationQueue';
import { useNotifications } from '../../hooks/useNotifications';

interface ChangeRequest {
  category: 'title' | 'description' | 'price' | 'images' | 'specifications' | 'other';
  description: string;
  required: boolean;
}

const ListingModerationReview: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { getListingDetails, moderateListing } = useModerationQueue();
  const { addNotification } = useNotifications();
  
  const [listing, setListing] = useState<FlaggedListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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

  useEffect(() => {
    const loadListing = async () => {
      if (!listingId) {
        navigate('/admin/moderation');
        return;
      }

      try {
        setLoading(true);
        const detailedListing = await getListingDetails(listingId);
        if (!detailedListing) {
          throw new Error('Listing not found');
        }
        setListing(detailedListing);
      } catch (err) {
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to load listing details'
        });
        navigate('/admin/moderation');
      } finally {
        setLoading(false);
      }
    };

    loadListing();
  }, [listingId, getListingDetails, navigate, addNotification]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please provide a reason for your decision.'
      });
      return;
    }

    if (selectedAction === 'request_changes' && changeRequests.length === 0) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please specify at least one change request.'
      });
      return;
    }

    if (!listing) return;

    const decision: ModerationDecision = {
      action: selectedAction,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
      notifyUser,
      publicNotes: publicNotes.trim() || undefined,
      changeRequests: selectedAction === 'request_changes' ? changeRequests : undefined,
      confidence: reviewConfidence
    };

    try {
      setSubmitting(true);
      await moderateListing(listing.listingId, decision);
      
      addNotification({
        type: 'success',
        title: 'Success',
        message: `Listing ${selectedAction === 'approve' ? 'approved' : selectedAction === 'reject' ? 'rejected' : 'changes requested'} successfully`
      });
      
      navigate('/admin/moderation');
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to submit moderation decision'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const addChangeRequest = () => {
    if (!newChangeRequest.description.trim()) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please provide a description for the change request.'
      });
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
    const labels: Record<string, string> = {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading listing details...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Back Button */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/moderation')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Queue
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">Listing Moderation Review</h1>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center space-x-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                listing.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                listing.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
                listing.status === 'approved' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {listing.status.replace(/_/g, ' ').toUpperCase()}
              </span>
              
              {listing.flags.length > 0 ? (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                  getSeverityColor(listing.flags.reduce((highest, flag) => 
                    flag.severity === 'high' ? flag : highest.severity === 'high' ? highest : 
                    flag.severity === 'medium' ? flag : highest
                  ).severity)
                }`}>
                  {listing.flags.reduce((highest, flag) => 
                    flag.severity === 'high' ? flag : highest.severity === 'high' ? highest : 
                    flag.severity === 'medium' ? flag : highest
                  ).severity.toUpperCase()} PRIORITY
                </span>
              ) : null}

              <span className="text-sm text-gray-500">
                Flagged {new Date(listing.flaggedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-6 mt-4">
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
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Listing Content (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'details' && (
              <>
                {/* Title */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold text-gray-900">{listing.title}</h2>
                </div>

                {/* Images */}
                {listing.images.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Images ({listing.images.length})</h3>
                    <div className="space-y-4">
                      <div className="relative">
                        <img
                          src={listing.images[currentImageIndex]}
                          alt={`Listing image ${currentImageIndex + 1}`}
                          className="w-full h-96 object-cover rounded-lg"
                        />
                        {listing.images.length > 1 && (
                          <>
                            <div className="absolute inset-0 flex items-center justify-between p-4">
                              <button
                                onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                                disabled={currentImageIndex === 0}
                                className="bg-black bg-opacity-50 text-white p-3 rounded-full disabled:opacity-50 hover:bg-opacity-70 transition-all"
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setCurrentImageIndex(Math.min(listing.images.length - 1, currentImageIndex + 1))}
                                disabled={currentImageIndex === listing.images.length - 1}
                                className="bg-black bg-opacity-50 text-white p-3 rounded-full disabled:opacity-50 hover:bg-opacity-70 transition-all"
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                            <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                              {currentImageIndex + 1} / {listing.images.length}
                            </div>
                          </>
                        )}
                      </div>
                      {listing.images.length > 1 && (
                        <div className="flex space-x-2 overflow-x-auto pb-2">
                          {listing.images.map((image, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`flex-shrink-0 w-24 h-24 rounded border-2 transition-all ${
                                index === currentImageIndex ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
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
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {listing.description || 'No description provided'}
                    </p>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Price</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">${listing.price.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Location</dt>
                      <dd className="mt-1 text-sm text-gray-900">{listing.location?.city}, {listing.location?.state}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Owner</dt>
                      <dd className="mt-1 text-sm text-gray-900">{listing.ownerName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{listing.ownerEmail}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Listing ID</dt>
                      <dd className="mt-1 text-xs font-mono text-gray-900">{listing.listingId}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {listing.createdAt ? new Date(listing.createdAt * 1000).toLocaleDateString() : 'N/A'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Boat Details */}
                {(listing as any).boatDetails && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Boat Specifications</h3>
                    <dl className="grid grid-cols-2 gap-4">
                      {(listing as any).boatDetails.type && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Type</dt>
                          <dd className="mt-1 text-sm text-gray-900">{(listing as any).boatDetails.type}</dd>
                        </div>
                      )}
                      {(listing as any).boatDetails.manufacturer && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Manufacturer</dt>
                          <dd className="mt-1 text-sm text-gray-900">{(listing as any).boatDetails.manufacturer}</dd>
                        </div>
                      )}
                      {(listing as any).boatDetails.model && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Model</dt>
                          <dd className="mt-1 text-sm text-gray-900">{(listing as any).boatDetails.model}</dd>
                        </div>
                      )}
                      {(listing as any).boatDetails.year && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Year</dt>
                          <dd className="mt-1 text-sm text-gray-900">{(listing as any).boatDetails.year}</dd>
                        </div>
                      )}
                      {(listing as any).boatDetails.length && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Length</dt>
                          <dd className="mt-1 text-sm text-gray-900">{(listing as any).boatDetails.length} ft</dd>
                        </div>
                      )}
                      {(listing as any).boatDetails.beam && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Beam</dt>
                          <dd className="mt-1 text-sm text-gray-900">{(listing as any).boatDetails.beam} ft</dd>
                        </div>
                      )}
                      {(listing as any).boatDetails.draft && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Draft</dt>
                          <dd className="mt-1 text-sm text-gray-900">{(listing as any).boatDetails.draft} ft</dd>
                        </div>
                      )}
                      {(listing as any).boatDetails.condition && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Condition</dt>
                          <dd className="mt-1 text-sm text-gray-900 capitalize">{(listing as any).boatDetails.condition}</dd>
                        </div>
                      )}
                      {(listing as any).boatDetails.hours ? (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Hours</dt>
                          <dd className="mt-1 text-sm text-gray-900">{(listing as any).boatDetails.hours.toLocaleString()}</dd>
                        </div>
                      ) : null}
                    </dl>

                    {/* Engine Information */}
                    {(listing as any).boatDetails.engines && (listing as any).boatDetails.engines.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-base font-medium text-gray-900 mb-4">Engines</h4>
                        <div className="space-y-4">
                          {(listing as any).boatDetails.engines.map((engine: any, idx: number) => (
                            <div key={idx} className="bg-gray-50 rounded-lg p-4">
                              <h5 className="text-sm font-medium text-gray-700 mb-3">Engine {idx + 1}</h5>
                              <dl className="grid grid-cols-2 gap-3">
                                <div>
                                  <dt className="text-xs font-medium text-gray-500">Make</dt>
                                  <dd className="mt-1 text-sm text-gray-900">{engine.make}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs font-medium text-gray-500">Model</dt>
                                  <dd className="mt-1 text-sm text-gray-900">{engine.model}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs font-medium text-gray-500">Horsepower</dt>
                                  <dd className="mt-1 text-sm text-gray-900">{engine.horsepower} HP</dd>
                                </div>
                                <div>
                                  <dt className="text-xs font-medium text-gray-500">Fuel Type</dt>
                                  <dd className="mt-1 text-sm text-gray-900 capitalize">{engine.fuelType}</dd>
                                </div>
                                {engine.year && (
                                  <div>
                                    <dt className="text-xs font-medium text-gray-500">Year</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{engine.year}</dd>
                                  </div>
                                )}
                                {engine.hours ? (
                                  <div>
                                    <dt className="text-xs font-medium text-gray-500">Hours</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{engine.hours.toLocaleString()}</dd>
                                  </div>
                                ) : null}
                              </dl>
                            </div>
                          ))}
                        </div>
                        {(listing as any).boatDetails.totalHorsepower && (
                          <div className="mt-3 text-sm">
                            <span className="font-medium text-gray-700">Total Horsepower:</span>
                            <span className="ml-2 text-gray-900">{(listing as any).boatDetails.totalHorsepower} HP</span>
                          </div>
                        )}
                      </div>
                    )}
                    {(listing as any).boatDetails.engine && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <dt className="text-sm font-medium text-gray-500">Engine</dt>
                        <dd className="mt-1 text-sm text-gray-900">{(listing as any).boatDetails.engine}</dd>
                      </div>
                    )}
                  </div>
                )}

                {/* Features */}
                {(listing as any).features && (listing as any).features.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Features</h3>
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
                )}

                {/* Additional Specifications */}
                {(listing as any).specifications && Object.keys((listing as any).specifications).length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Specifications</h3>
                    <dl className="grid grid-cols-2 gap-4">
                      {Object.entries((listing as any).specifications).map(([key, value]: [string, any]) => (
                        <div key={key}>
                          <dt className="text-sm font-medium text-gray-500 capitalize">{key.replace(/_/g, ' ')}</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </>
            )}

            {activeTab === 'flags' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Reported Issues ({listing.flags.length})
                </h3>
                {listing.flags.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>No flags reported for this listing</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {listing.flags.map((flag, index) => (
                      <div
                        key={index}
                        className={`border-2 rounded-lg p-4 ${getSeverityColor(flag.severity)}`}
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
                          <span className="text-xs text-gray-600">
                            {new Date(flag.reportedAt).toLocaleDateString()} at{' '}
                            {new Date(flag.reportedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{flag.reason}</p>
                        <div className="flex items-center justify-between text-xs text-gray-600">
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
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Moderation History</h3>
                {listing.reviewedAt ? (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">Previous Review</span>
                      <span className="text-sm text-gray-500">
                        {new Date(listing.reviewedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm space-y-2">
                      <p className="text-gray-600">
                        <span className="font-medium">Reviewed by:</span> {listing.reviewedBy || 'Unknown'}
                      </p>
                      {listing.moderationNotes && (
                        <p className="text-gray-700">
                          <span className="font-medium">Notes:</span> {listing.moderationNotes}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>No previous moderation history</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Moderation Form (1/3 width, sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Moderation Decision</h3>
                  <div className="space-y-3">
                    <label className="flex items-start p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
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
                        <div className="text-xs text-gray-500 mt-1">
                          The listing meets platform standards and can be published
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
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
                        <div className="text-xs text-gray-500 mt-1">
                          Ask the owner to modify specific aspects of the listing
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
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
                        <div className="text-xs text-gray-500 mt-1">
                          Remove the listing permanently from the platform
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Change Requests Section */}
                {selectedAction === 'request_changes' && (
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Required Changes</h4>
                      <button
                        type="button"
                        onClick={() => setShowChangeRequestForm(!showChangeRequestForm)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Add Request
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
                                  <span className="text-xs text-red-600 font-medium">Required</span>
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
                          <label className="block text-xs font-medium text-gray-700 mb-1">
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
                          <label className="block text-xs font-medium text-gray-700 mb-1">
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
                            <span className="text-xs text-gray-700">Required change</span>
                          </label>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => setShowChangeRequestForm(false)}
                              className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={addChangeRequest}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low - May need second opinion</option>
                    <option value="medium">Medium - Standard review</option>
                    <option value="high">High - Very confident in decision</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={notifyUser}
                      onChange={(e) => setNotifyUser(e.target.checked)}
                      className="mr-2 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Send notification to listing owner
                    </span>
                  </label>
                </div>

                <div className="flex space-x-3 pt-4 border-t">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      'Submit Decision'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/moderation')}
                    disabled={submitting}
                    className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingModerationReview;
