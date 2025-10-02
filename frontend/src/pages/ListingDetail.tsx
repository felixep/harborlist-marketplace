import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getListing } from '../services/listings';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/layout/PageHeader';
import ImageGallery from '../components/listing/ImageGallery';
import ContactForm from '../components/listing/ContactForm';
import BoatSpecs from '../components/listing/BoatSpecs';

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const [showContactForm, setShowContactForm] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListing(id!),
    enabled: !!id,
  });

  const listing = data?.listing;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

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

  const contactButton = (
    <button
      onClick={() => setShowContactForm(true)}
      className="btn-primary"
    >
      <span className="flex items-center space-x-2">
        <span>📧</span>
        <span>Contact Owner</span>
      </span>
    </button>
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
                <div className="price-large">{formatPrice(listing.price)}</div>
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
              <div className="card p-6">
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
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
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
                  {listing.boatDetails.beam && (
                    <div className="flex justify-between">
                      <span className="text-navy-600">Beam:</span>
                      <span className="font-medium text-navy-900">{listing.boatDetails.beam} ft</span>
                    </div>
                  )}
                  {listing.boatDetails.engine && (
                    <div className="flex justify-between">
                      <span className="text-navy-600">Engine:</span>
                      <span className="font-medium text-navy-900">{listing.boatDetails.engine}</span>
                    </div>
                  )}
                  {listing.boatDetails.hours && (
                    <div className="flex justify-between">
                      <span className="text-navy-600">Hours:</span>
                      <span className="font-medium text-navy-900">{listing.boatDetails.hours}</span>
                    </div>
                  )}
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
                  {listing.views && (
                    <div className="flex items-center">
                      <span className="mr-2">👁️</span>
                      Views: {listing.views}
                    </div>
                  )}
                  <div className="flex items-center">
                    <span className="mr-2">🆔</span>
                    ID: {listing.listingId}
                  </div>
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
