import { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getListing, updateListingStatus } from '../services/listings';
import { useAuth } from '../components/auth/AuthProvider';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/layout/PageHeader';
import ImageGallery from '../components/listing/ImageGallery';
import ContactForm from '../components/listing/ContactForm';
import BoatSpecs from '../components/listing/BoatSpecs';
import FinanceCalculator from '../components/listing/FinanceCalculator';
import ComparableBoats from '../components/listing/ComparableBoats';
import { useToast } from '../contexts/ToastContext';
import { 
  updateListingMetaTags, 
  updateListingStructuredData, 
  updateCanonicalUrl, 
  cleanupListingSEO,
  shareListing 
} from '../utils/seo';

export default function ListingDetail() {
  const { identifier, slug } = useParams<{ identifier?: string; slug?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [showContactForm, setShowContactForm] = useState(false);
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  // Determine if we're using slug or ID-based URL
  const isSlugRoute = location.pathname.startsWith('/boat/');
  const queryIdentifier = isSlugRoute ? slug : identifier;

  const { data, isLoading, error } = useQuery({
    queryKey: ['listing', queryIdentifier, isSlugRoute ? 'slug' : 'id'],
    queryFn: () => {
      if (isSlugRoute) {
        // Call API with slug parameter
        return getListing(queryIdentifier!, { bySlug: true });
      } else {
        // Call API with ID parameter
        return getListing(queryIdentifier!);
      }
    },
    enabled: !!queryIdentifier,
  });

  // SEO and URL management
  useEffect(() => {
    if (data?.listing) {
      const listing = data.listing;
      
      // If we have an enhanced listing with a slug and we're on an ID-based URL, redirect to slug URL
      if ('slug' in listing && listing.slug && !isSlugRoute) {
        navigate(`/boat/${listing.slug}`, { replace: true });
        return;
      }
      
      // Update SEO meta tags and structured data
      updateListingMetaTags(listing);
      updateListingStructuredData(listing);
      updateCanonicalUrl(listing);
    }
    
    // Cleanup function
    return () => {
      cleanupListingSEO();
    };
  }, [data?.listing, isSlugRoute, navigate]);

  const listing = data?.listing;

  // Check if current user is the owner
  const isOwner = user && listing && user.id === listing.ownerId;
  
  // Check if user has premium access
  const isPremium = user?.premiumActive || false;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  /**
   * Calculates price drop information from price history
   */
  const getPriceDropInfo = () => {
    if (!listing || !(listing as any).priceHistory || (listing as any).priceHistory.length < 2) {
      return { hasDrop: false, previousPrice: 0, dropAmount: 0, dropPercentage: 0 };
    }

    // Get the most recent price change (last entry in array)
    const sortedHistory = [...(listing as any).priceHistory].sort((a: any, b: any) => b.changedAt - a.changedAt);
    const currentPriceEntry = sortedHistory[0];
    const previousPriceEntry = sortedHistory[1];

    // Check if the most recent change was a price drop
    if (previousPriceEntry && currentPriceEntry.price < previousPriceEntry.price) {
      const dropAmount = previousPriceEntry.price - currentPriceEntry.price;
      const dropPercentage = Math.round((dropAmount / previousPriceEntry.price) * 100);
      
      return {
        hasDrop: true,
        previousPrice: previousPriceEntry.price,
        dropAmount,
        dropPercentage
      };
    }

    return { hasDrop: false, previousPrice: 0, dropAmount: 0, dropPercentage: 0 };
  };

  const priceDropInfo = getPriceDropInfo();

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Loading..."
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Search', href: '/search' },
            { label: 'Loading...' }
          ]}
        />
        <Layout>
          <div className="animate-pulse-ocean">
            <div className="h-96 card mb-8 loading-wave" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-8 bg-ocean-200 rounded w-3/4" />
                <div className="h-4 bg-ocean-200 rounded w-1/2" />
                <div className="h-32 bg-ocean-200 rounded" />
              </div>
              <div className="h-64 bg-ocean-200 rounded" />
            </div>
          </div>
        </Layout>
      </>
    );
  }

  if (error || !listing) {
    return (
      <>
        <PageHeader
          title="Boat Not Found"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Search', href: '/search' },
            { label: 'Not Found' }
          ]}
        />
        <Layout>
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-navy-900 mb-4">Listing Not Found</h1>
            <p className="text-navy-600 mb-6">The boat listing you're looking for doesn't exist or has been removed.</p>
            <Link to="/search" className="btn-primary">
              Browse All Boats
            </Link>
          </div>
        </Layout>
      </>
    );
  }

  const handleShare = async () => {
    if (listing) {
      try {
        await shareListing(listing);
      } catch (error) {
        console.error('Failed to share listing:', error);
      }
    }
  };

  const contactButton = (
    <div className="flex space-x-3">
      <button
        onClick={handleShare}
        className="btn-secondary"
        title="Share this listing"
      >
        <span className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
          <span>Share</span>
        </span>
      </button>
      <button
        onClick={() => setShowContactForm(true)}
        className="btn-primary"
      >
        <span className="flex items-center space-x-2">
          <span>📧</span>
          <span>Contact Owner</span>
        </span>
      </button>
    </div>
  );

  return (
    <>
      <PageHeader
        title={listing.title}
        subtitle={`${listing.location.city}, ${listing.location.state}`}
        actions={contactButton}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Search', href: '/search' },
          { label: listing.title }
        ]}
      />

      <Layout>
        {/* Image Gallery */}
        <div className="mb-8">
          <ImageGallery images={listing.images} videos={listing.videos} title={listing.title} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Price & Basic Info */}
            <div className="card p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="price-large">{formatPrice(listing.price)}</div>
                  {priceDropInfo.hasDrop && (
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Price dropped {priceDropInfo.dropPercentage}%</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-navy-900">
                    {listing.boatDetails.year} {listing.boatDetails.type}
                  </div>
                  <div className="text-navy-600">{listing.boatDetails.length}' Length</div>
                </div>
              </div>
              <div className="flex items-center text-navy-600">
                <span className="mr-2">📍</span>
                {listing.location.city}, {listing.location.state}
              </div>
            </div>

            {/* Description */}
            <div className="card p-6 mb-6">
              <h2 className="text-xl font-semibold text-navy-900 mb-4">
                <span className="mr-2">📝</span>Description
              </h2>
              <div className="prose max-w-none text-navy-700">
                {listing.description.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Boat Specifications */}
            <div className="card p-6 mb-6">
              <BoatSpecs boatDetails={listing.boatDetails} />
            </div>

            {/* Features */}
            {listing.features.length > 0 && (
              <div className="card p-6 mb-6">
                <h2 className="text-xl font-semibold text-navy-900 mb-4">
                  <span className="mr-2">⭐</span>Features & Equipment
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {listing.features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <span className="text-seaweed-500 mr-2">✓</span>
                      <span className="text-navy-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comparable Listings - Only for premium owners */}
            {isOwner && (
              <div className="card p-6 mb-6">
                <h2 className="text-xl font-semibold text-navy-900 mb-4">
                  <span className="mr-2">📊</span>Comparable Listings
                  {!isPremium && (
                    <span className="ml-2 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-1 rounded-full">
                      Premium
                    </span>
                  )}
                </h2>
                
                {isPremium ? (
                  <>
                    <p className="text-sm text-navy-600 mb-4">
                      Similar boats currently on the market to help you understand your pricing position.
                    </p>
                    
                    <div className="space-y-4">
                      <ComparableBoats
                        boatType={listing.boatDetails.type}
                        year={listing.boatDetails.year}
                        length={listing.boatDetails.length}
                        currentListingId={listing.listingId}
                        currentPrice={listing.price}
                      />
                    </div>
                  </>
                ) : (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg p-6">
                    <div className="text-center">
                      <div className="text-4xl mb-3">🌟</div>
                      <h3 className="text-lg font-semibold text-navy-900 mb-2">
                        Unlock Market Insights
                      </h3>
                      <p className="text-sm text-navy-600 mb-4">
                        Get instant access to comparable listings and see how your boat compares to similar boats on the market.
                      </p>
                      <ul className="text-left text-sm text-navy-700 mb-6 space-y-2">
                        <li className="flex items-center">
                          <span className="text-seaweed-500 mr-2">✓</span>
                          <span>See up to 5 similar boats in real-time</span>
                        </li>
                        <li className="flex items-center">
                          <span className="text-seaweed-500 mr-2">✓</span>
                          <span>Compare pricing and features instantly</span>
                        </li>
                        <li className="flex items-center">
                          <span className="text-seaweed-500 mr-2">✓</span>
                          <span>Make data-driven pricing decisions</span>
                        </li>
                        <li className="flex items-center">
                          <span className="text-seaweed-500 mr-2">✓</span>
                          <span>Stay competitive in the market</span>
                        </li>
                      </ul>
                      <Link
                        to="/premium"
                        className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg"
                      >
                        Upgrade to Premium
                      </Link>
                      <p className="text-xs text-navy-500 mt-3">
                        Starting at $9.99/month
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Finance Calculator - Hidden for owners */}
            {!isOwner && (
              <FinanceCalculator
                boatPrice={listing.price}
                listingId={listing.listingId}
                className="mb-6"
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Owner Actions Panel - Only visible to owner */}
            {isOwner && (
              <div className="card p-6 mb-6">
                <h3 className="font-semibold text-navy-900 mb-4">
                  <span className="mr-2">⚙️</span>Manage Listing
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate(`/edit/${listing.listingId}`)}
                    className="w-full btn-secondary text-sm py-2"
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <span>✏️</span>
                      <span>Edit Listing</span>
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Mark this listing as sold?')) {
                        updateListingStatus(listing.listingId, 'sold')
                          .then(() => {
                            showSuccess('Success', 'Listing marked as sold');
                            window.location.reload();
                          })
                          .catch(() => showError('Error', 'Failed to update status'));
                      }
                    }}
                    className="w-full btn-secondary text-sm py-2"
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <span>✅</span>
                      <span>Mark as Sold</span>
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this listing permanently?')) {
                        // TODO: Implement delete functionality
                        showError('Not Implemented', 'Delete functionality coming soon');
                      }
                    }}
                    className="w-full bg-red-50 text-red-600 hover:bg-red-100 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <span>🗑️</span>
                      <span>Delete Listing</span>
                    </span>
                  </button>
                </div>
                
                {/* Status Badge */}
                <div className="mt-4 pt-4 border-t border-ocean-100">
                  <div className="text-xs text-navy-500 mb-2">Current Status:</div>
                  <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-medium ${
                    listing.status === 'active' ? 'bg-green-100 text-green-700' :
                    listing.status === 'pending_moderation' ? 'bg-yellow-100 text-yellow-700' :
                    listing.status === 'sold' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {listing.status === 'pending_moderation' ? 'Pending Review' : 
                     listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                  </span>
                </div>
              </div>
            )}

            <div className="card p-6 sticky top-24">
              {/* Price */}
              <div className="text-center mb-6">
                <div className="price-large mb-2">{formatPrice(listing.price)}</div>
                <div className="text-navy-600">
                  {listing.boatDetails.year} {listing.boatDetails.type}
                </div>
              </div>

              {/* Contact Button */}
              <button
                onClick={() => setShowContactForm(true)}
                className="w-full btn-primary mb-6"
              >
                <span className="flex items-center justify-center space-x-2">
                  <span>📧</span>
                  <span>Contact Owner</span>
                </span>
              </button>

              {/* Quick Stats */}
              <div className="border-t border-ocean-100 pt-4">
                <h3 className="font-semibold text-navy-900 mb-3">
                  <span className="mr-2">📊</span>Quick Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-navy-600">Year:</span>
                    <span className="font-medium text-navy-900">{listing.boatDetails.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-navy-600">Length:</span>
                    <span className="font-medium text-navy-900">{listing.boatDetails.length} ft</span>
                  </div>
                  {listing.boatDetails.beam && listing.boatDetails.beam > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-navy-600">Beam:</span>
                      <span className="font-medium text-navy-900">{listing.boatDetails.beam} ft</span>
                    </div>
                  ) : null}
                  {listing.boatDetails.engine ? (
                    <div className="flex justify-between">
                      <span className="text-navy-600">Engine:</span>
                      <span className="font-medium text-navy-900">{listing.boatDetails.engine}</span>
                    </div>
                  ) : null}
                  {listing.boatDetails.hours && listing.boatDetails.hours > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-navy-600">Hours:</span>
                      <span className="font-medium text-navy-900">{listing.boatDetails.hours}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span className="text-navy-600">Condition:</span>
                    <span className="font-medium text-navy-900">{listing.boatDetails.condition}</span>
                  </div>
                </div>
              </div>

              {/* Listing Stats */}
              <div className="border-t border-ocean-100 pt-4 mt-4">
                <div className="text-sm text-navy-500 space-y-2">
                  <div className="flex items-center">
                    <span className="mr-2">🕒</span>
                    Listed: {new Date(listing.createdAt).toLocaleDateString()}
                  </div>
                  {listing.views && listing.views > 0 ? (
                    <div className="flex items-center">
                      <span className="mr-2">👁️</span>
                      Views: {listing.views}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form Modal */}
        {showContactForm && (
          <ContactForm
            listing={listing}
            onClose={() => setShowContactForm(false)}
          />
        )}
      </Layout>
    </>
  );
}
