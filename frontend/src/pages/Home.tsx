import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ListingCard from '../components/listing/ListingCard';
import SearchFilters from '../components/search/SearchFilters';
import { SearchFilters as SearchFiltersType, Listing } from '@harborlist/shared-types';
import { searchListings, getListings } from '../services/listings';
import { getPlatformStats, calculateListingQualityScore } from '../services/ratings';

export default function Home() {
  const [filters, setFilters] = useState<SearchFiltersType>({});

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['listings', 'featured'],
    queryFn: () => searchListings({ ...filters, limit: 8 }),
  });

  const { data: allListingsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['listings', 'all'],
    queryFn: () => getListings(),
  });

  // Fetch platform statistics including real user ratings
  const { data: platformStats, isLoading: isLoadingPlatformStats } = useQuery({
    queryKey: ['platform', 'stats'],
    queryFn: () => getPlatformStats(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const listings = allListingsData?.listings || [];

  // Calculate real statistics from data
  const totalListings = listings.length;
  const activeListings = listings.filter((listing: Listing) => listing.status === 'active').length;
  const uniqueStates = new Set(listings.map((l: Listing) => l.location?.state).filter(Boolean)).size;
  const uniqueCities = new Set(listings.map((l: Listing) => l.location?.city).filter(Boolean)).size;
  


  // Calculate category counts from real data
  const getCategoryCount = (type: string) => {
    return listings.filter((listing: Listing) => 
      listing.boatDetails?.type?.toLowerCase().includes(type.toLowerCase())
    ).length;
  };

  // Get real satisfaction score from platform stats or calculate from listing quality
  const getSatisfactionScore = () => {
    // If we have real user ratings, use those
    if (platformStats && platformStats.totalReviews > 0) {
      return {
        score: platformStats.userSatisfactionScore.toFixed(1),
        type: 'user-rating',
        subtitle: `Based on ${platformStats.totalReviews} verified reviews`
      };
    }
    
    // If we have listings but no reviews, calculate quality score
    if (listings.length > 0) {
      const qualityScore = calculateListingQualityScore(listings);
      const displayScore = (4.0 + qualityScore).toFixed(1);
      return {
        score: displayScore,
        type: 'quality-score',
        subtitle: 'Based on listing quality'
      };
    }
    
    // No data available
    return {
      score: null,
      type: 'no-data',
      subtitle: 'Reviews coming soon'
    };
  };

  const satisfactionData = getSatisfactionScore();

  const handleSearch = () => {
    // Navigate to search page with filters
    const searchParams = new URLSearchParams();
    if (filters.query) searchParams.set('q', filters.query);
    if (filters.location?.state) searchParams.set('state', filters.location.state);
    if (filters.boatType?.[0]) searchParams.set('type', filters.boatType[0]);
    
    window.location.href = `/search?${searchParams.toString()}`;
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-transparent to-cyan-600/20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-8">
              <span className="text-6xl animate-bounce">⚓</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight" style={{fontFamily: 'DM Sans'}}>
              Find your next boat—
              <br />
              <span className="text-blue-200">fast and verified.</span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-12 text-blue-100 max-w-2xl mx-auto leading-relaxed">
              Browse thousands of trusted listings across the coast. Connect directly with sellers.
            </p>
            
            {/* Quick Search Bar */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl max-w-5xl mx-auto mb-12 border border-white/20">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Search by make, model, or location..."
                  className="px-4 py-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-slate-900 placeholder-slate-500"
                  value={filters.query || ''}
                  onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                />
                <select className="px-4 py-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-slate-900 bg-white">
                  <option value="">All Types</option>
                  <option value="sailboat">Sailboat</option>
                  <option value="motor">Motor Yacht</option>
                  <option value="fishing">Fishing Boat</option>
                  <option value="pontoon">Pontoon</option>
                </select>
                <input
                  type="text"
                  placeholder="Max Price"
                  className="px-4 py-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-slate-900 placeholder-slate-500"
                />
                <button 
                  onClick={handleSearch} 
                  className="btn-primary btn-lg"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
              <Link to="/search" className="btn-primary btn-lg">
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Browse Boats</span>
                </span>
              </Link>
              <Link to="/create" className="btn-secondary btn-lg">
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>List Your Boat</span>
                </span>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-blue-200">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="font-medium">Verified listings</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="font-medium">Lightning-fast search</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="font-medium">Direct sellers</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Bar */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          {!isLoadingStats && totalListings === 0 && (
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>New Platform</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Be the First to List Your Boat!</h3>
              <p className="text-slate-600 mb-6">Help us launch this premium marketplace by adding your boat listing.</p>
              <Link to="/create" className="btn-primary">
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>List Your Boat</span>
                </span>
              </Link>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="card p-8 card-hover">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-2" style={{fontFamily: 'DM Sans'}}>
                  {isLoadingStats ? (
                    <div className="animate-pulse bg-slate-200 h-10 w-16 rounded mx-auto"></div>
                  ) : (
                    totalListings > 0 ? totalListings.toLocaleString() : '0'
                  )}
                </div>
                <div className="text-lg font-medium text-slate-600">
                  {totalListings === 1 ? 'Boat Listed' : 'Boats Listed'}
                </div>
                <div className="text-sm text-slate-500 mt-2">
                  {activeListings > 0 ? `${activeListings} active listings` : 'Ready for your first listing'}
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="card p-8 card-hover">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-2" style={{fontFamily: 'DM Sans'}}>
                  {isLoadingStats ? (
                    <div className="animate-pulse bg-slate-200 h-10 w-12 rounded mx-auto"></div>
                  ) : (
                    uniqueStates > 0 ? uniqueStates : '0'
                  )}
                </div>
                <div className="text-lg font-medium text-slate-600">
                  {uniqueStates === 1 ? 'State' : 'States'}
                </div>
                <div className="text-sm text-slate-500 mt-2">
                  {uniqueCities > 0 ? `${uniqueCities} cities covered` : 'Growing nationwide'}
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="card p-8 card-hover">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-2" style={{fontFamily: 'DM Sans'}}>
                  {isLoadingStats || isLoadingPlatformStats ? (
                    <div className="animate-pulse bg-slate-200 h-10 w-20 rounded mx-auto"></div>
                  ) : satisfactionData.score ? (
                    `${satisfactionData.score}★`
                  ) : (
                    <div className="text-slate-400">—</div>
                  )}
                </div>
                <div className="text-lg font-medium text-slate-600">
                  {satisfactionData.type === 'user-rating' ? 'User Rating' : 
                   satisfactionData.type === 'quality-score' ? 'Quality Score' : 
                   'Satisfaction'}
                </div>
                <div className="text-sm text-slate-500 mt-2">
                  {satisfactionData.subtitle}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-20" id="featured">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>Featured Boats</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6" style={{fontFamily: 'DM Sans'}}>
              Premium Vessels from 
              <span className="text-blue-600"> Trusted Sellers</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Handpicked boats that meet our highest standards for quality, authenticity, and value. 
              Each listing is verified by our marine experts.
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="card h-96 loading-shimmer" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {searchResults?.results.slice(0, 4).map((listing, index) => (
                  <ListingCard 
                    key={listing.listingId} 
                    listing={listing} 
                    featured={index < 2}
                  />
                ))}
                {searchResults?.results.slice(4, 8).map((listing) => (
                  <ListingCard key={listing.listingId} listing={listing} />
                ))}
              </div>
              
              <div className="text-center mt-12">
                <Link to="/search" className="btn-primary btn-lg">
                  <span className="flex items-center space-x-2">
                    <span>🔍</span>
                    <span>Explore All Boats</span>
                    <span>→</span>
                  </span>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50" id="categories">
        <div className="container-wide">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Browse by <span className="text-blue-600">Category</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Find exactly what you're looking for in our specialized categories
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { name: 'Motor Yachts', emoji: '🛥️', count: getCategoryCount('motor'), description: 'Luxury & Performance' },
              { name: 'Sailboats', emoji: '⛵', count: getCategoryCount('sail'), description: 'Wind-Powered Adventure' },
              { name: 'Fishing Boats', emoji: '🎣', count: getCategoryCount('fishing'), description: 'Sport & Commercial' },
              { name: 'Pontoons', emoji: '🚤', count: getCategoryCount('pontoon'), description: 'Family & Recreation' },
              { name: 'Speedboats', emoji: '🏎️', count: getCategoryCount('speed'), description: 'Thrill & Speed' },
            ].map((category) => (
              <Link
                key={category.name}
                to={`/search?type=${encodeURIComponent(category.name)}`}
                className="group"
              >
                <div className="card-interactive hover-lift">
                  <div className="h-40 bg-gradient-to-br from-blue-100 to-slate-100 relative overflow-hidden flex items-center justify-center">
                    <span className="text-5xl group-hover:scale-110 transition-transform duration-300">
                      {category.emoji}
                    </span>
                    <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  </div>
                  <div className="p-6 text-center">
                    <h3 className="font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-slate-600 mb-2">{category.description}</p>
                    <div className="text-blue-600 font-semibold">
                      {category.count > 0 
                        ? `${category.count} available` 
                        : 'Coming soon'
                      }
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20">
        <div className="container-wide">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Why Choose <span className="text-blue-600">MarineMarket</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              The most trusted platform for serious boat buyers and sellers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center p-8">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl text-white">🛡️</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Verified Listings</h3>
              <p className="text-slate-600 leading-relaxed">
                Every boat listing is verified for authenticity. We ensure accurate information and legitimate sellers for your peace of mind.
              </p>
            </div>

            <div className="text-center p-8">
              <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl text-white">💬</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Direct Communication</h3>
              <p className="text-slate-600 leading-relaxed">
                Connect directly with boat owners through our secure messaging system. No middlemen, no hidden fees.
              </p>
            </div>

            <div className="text-center p-8">
              <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl text-white">⚡</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Lightning Fast</h3>
              <p className="text-slate-600 leading-relaxed">
                Advanced search filters and instant results help you find your perfect boat in minutes, not hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-transparent to-indigo-600/20"></div>
        
        <div className="relative container-wide text-center">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <span className="text-6xl">🚢</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Ready to List Your Boat?
            </h2>
            <p className="text-xl text-blue-100 mb-10 leading-relaxed">
              Join thousands of successful sellers who trust MarineMarket to connect them with serious buyers. 
              List your boat today and reach our premium audience.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/create" className="btn-secondary btn-xl">
                <span className="flex items-center space-x-3">
                  <span>📝</span>
                  <span>List Your Boat</span>
                  <span>→</span>
                </span>
              </Link>
              <Link to="/search" className="btn-ghost text-white border-white/30 hover:bg-white/10">
                <span className="flex items-center space-x-2">
                  <span>🔍</span>
                  <span>Browse Boats</span>
                </span>
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-blue-200 text-sm">
              <div className="flex items-center space-x-2">
                <span>✨</span>
                <span>Free to list</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>📈</span>
                <span>Maximum exposure</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>🤝</span>
                <span>Dedicated support</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
