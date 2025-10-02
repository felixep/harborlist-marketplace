import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/layout/PageHeader';
import ListingCard from '../components/listing/ListingCard';
import SearchFilters from '../components/search/SearchFilters';
import { SearchFilters as SearchFiltersType } from '@harborlist/shared-types';
import { searchListings } from '../services/listings';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<SearchFiltersType>({});
  const [sortBy, setSortBy] = useState('relevance');

  // Initialize filters from URL params
  useEffect(() => {
    const initialFilters: SearchFiltersType = {};
    
    if (searchParams.get('q')) {
      initialFilters.query = searchParams.get('q') || '';
    }
    if (searchParams.get('state')) {
      initialFilters.location = { state: searchParams.get('state') || '' };
    }
    if (searchParams.get('type')) {
      initialFilters.boatType = [searchParams.get('type') || ''];
    }
    if (searchParams.get('minPrice')) {
      initialFilters.priceRange = { 
        ...initialFilters.priceRange,
        min: Number(searchParams.get('minPrice'))
      };
    }
    if (searchParams.get('maxPrice')) {
      initialFilters.priceRange = { 
        ...initialFilters.priceRange,
        max: Number(searchParams.get('maxPrice'))
      };
    }

    setFilters(initialFilters);
  }, [searchParams]);

  const { data: searchResults, isLoading, refetch } = useQuery({
    queryKey: ['search', filters, sortBy],
    queryFn: () => searchListings({
      ...filters,
      sort: { field: sortBy === 'price-low' ? 'price' : 'createdAt', order: sortBy === 'price-low' ? 'asc' : 'desc' }
    }),
    enabled: Object.keys(filters).length > 0
  });

  const handleFiltersChange = (newFilters: SearchFiltersType) => {
    setFilters(newFilters);
    
    // Update URL params
    const params = new URLSearchParams();
    if (newFilters.query) params.set('q', newFilters.query);
    if (newFilters.location?.state) params.set('state', newFilters.location.state);
    if (newFilters.boatType?.[0]) params.set('type', newFilters.boatType[0]);
    if (newFilters.priceRange?.min) params.set('minPrice', newFilters.priceRange.min.toString());
    if (newFilters.priceRange?.max) params.set('maxPrice', newFilters.priceRange.max.toString());
    
    setSearchParams(params);
  };

  const handleSearch = () => {
    refetch();
  };

  const sortOptions = (
    <select
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value)}
      className="form-select"
    >
      <option value="relevance">Relevance</option>
      <option value="newest">Newest First</option>
      <option value="price-low">Price: Low to High</option>
      <option value="price-high">Price: High to Low</option>
    </select>
  );

  return (
    <>
      <PageHeader
        title={searchResults ? `${searchResults.total} Boats Found` : 'Search Boats'}
        subtitle={filters.query ? `Results for "${filters.query}"` : 'Find your perfect boat'}
        actions={sortOptions}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Search' }
        ]}
      />

      <Layout>
        {/* Search Filters */}
        <div className="mb-8">
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onSearch={handleSearch}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Facets */}
          {searchResults?.facets && (
            <div className="lg:col-span-1">
              <div className="card p-6 sticky top-24">
                <h3 className="font-semibold text-navy-900 mb-4">🔍 Refine Results</h3>
                
                {/* Boat Types */}
                {searchResults.facets.boatTypes && (
                  <div className="mb-6">
                    <h4 className="font-medium text-navy-700 mb-3">Boat Type</h4>
                    <div className="space-y-2">
                      {searchResults.facets.boatTypes.slice(0, 8).map((type) => (
                        <label key={type.value} className="flex items-center hover:bg-ocean-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={filters.boatType?.includes(type.value) || false}
                            onChange={(e) => {
                              const currentTypes = filters.boatType || [];
                              const newTypes = e.target.checked
                                ? [...currentTypes, type.value]
                                : currentTypes.filter(t => t !== type.value);
                              handleFiltersChange({
                                ...filters,
                                boatType: newTypes.length > 0 ? newTypes : undefined
                              });
                            }}
                            className="mr-3 text-ocean-600 focus:ring-ocean-500"
                          />
                          <span className="text-sm text-navy-600">
                            {type.value} <span className="text-ocean-500">({type.count})</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Locations */}
                {searchResults.facets.locations && (
                  <div className="mb-6">
                    <h4 className="font-medium text-navy-700 mb-3">Location</h4>
                    <div className="space-y-2">
                      {searchResults.facets.locations.slice(0, 8).map((location) => (
                        <button
                          key={location.state}
                          onClick={() => handleFiltersChange({
                            ...filters,
                            location: { state: location.state }
                          })}
                          className="block text-sm text-ocean-600 hover:text-ocean-700 hover:bg-ocean-50 p-1 rounded w-full text-left"
                        >
                          📍 {location.state} <span className="text-navy-400">({location.count})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Grid */}
          <div className={searchResults?.facets ? 'lg:col-span-3' : 'lg:col-span-4'}>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="card h-80 loading-wave" />
                ))}
              </div>
            ) : searchResults?.results.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-navy-900 mb-2">No boats found</h3>
                <p className="text-navy-600 mb-6">
                  Try adjusting your search criteria or browse all listings.
                </p>
                <button 
                  onClick={() => handleFiltersChange({})}
                  className="btn-primary"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {searchResults?.results.map((listing) => (
                  <ListingCard key={listing.listingId} listing={listing} />
                ))}
              </div>
            )}

            {/* Load More */}
            {searchResults && searchResults.results.length > 0 && (
              <div className="mt-12 text-center">
                <button className="btn-outline">
                  Load More Results
                </button>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
