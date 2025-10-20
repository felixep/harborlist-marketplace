/**
 * @fileoverview Comparable boats component for owners to see market comparisons.
 * 
 * Displays similar boats on the market to help owners understand their pricing
 * position and competitive landscape. Only visible to listing owners.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { useQuery } from '@tanstack/react-query';
import { searchListings } from '../../services/listings';
import { Link } from 'react-router-dom';

interface ComparableBoatsProps {
  boatType: string;
  year: number;
  length: number;
  currentListingId: string;
  currentPrice: number;
}

/**
 * Comparable boats component showing similar listings
 * 
 * Features:
 * - Search for similar boats (same type, ±5 years, ±20% length)
 * - Show price comparison (above/below current listing)
 * - Display key specs for quick comparison
 * - Link to view full listing
 * 
 * @param {ComparableBoatsProps} props - Component props
 * @returns {JSX.Element} Comparable boats display
 */
export default function ComparableBoats({
  boatType,
  year,
  length,
  currentListingId,
  currentPrice,
}: ComparableBoatsProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['comparables', boatType, year, length],
    queryFn: () =>
      searchListings({
        boatType: [boatType],
        yearRange: {
          min: year - 5,
          max: year + 5,
        },
        lengthRange: {
          min: Math.floor(length * 0.8),
          max: Math.ceil(length * 1.2),
        },
        limit: 10,
      }),
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getPriceDifference = (price: number) => {
    const diff = price - currentPrice;
    const percentage = ((diff / currentPrice) * 100).toFixed(1);
    
    if (diff > 0) {
      return {
        text: `+${formatPrice(diff)} (+${percentage}%)`,
        color: 'text-red-600',
        icon: '▲',
      };
    } else if (diff < 0) {
      return {
        text: `${formatPrice(diff)} (${percentage}%)`,
        color: 'text-green-600',
        icon: '▼',
      };
    } else {
      return {
        text: 'Same price',
        color: 'text-gray-600',
        icon: '=',
      };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg p-4 h-24" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-red-800">
            Failed to load comparable listings
          </span>
        </div>
      </div>
    );
  }

  // Filter out the current listing and get only active listings
  const comparables = data?.results
    ?.filter((listing: any) => 
      listing.listingId !== currentListingId && 
      listing.status === 'active'
    )
    .slice(0, 5) || [];

  if (comparables.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-yellow-800">
            No comparable listings found at this time
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comparables.map((comparable: any) => {
        const priceDiff = getPriceDifference(comparable.price);
        
        return (
          <Link
            key={comparable.listingId}
            to={`/boat/${comparable.slug || comparable.listingId}`}
            className="block bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h4 className="font-medium text-navy-900 text-sm mb-1">
                  {comparable.boatDetails.year} {comparable.boatDetails.manufacturer} {comparable.boatDetails.model}
                </h4>
                <div className="text-xs text-navy-600">
                  {comparable.boatDetails.length}' • {comparable.location.city}, {comparable.location.state}
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="font-semibold text-navy-900 text-sm">
                  {formatPrice(comparable.price)}
                </div>
                <div className={`text-xs ${priceDiff.color} flex items-center justify-end`}>
                  <span className="mr-1">{priceDiff.icon}</span>
                  <span>{priceDiff.text.split(' ')[0]}</span>
                </div>
              </div>
            </div>
            
            {comparable.boatDetails.condition && (
              <div className="flex items-center text-xs text-navy-500">
                <span className="mr-2">Condition:</span>
                <span className="font-medium">{comparable.boatDetails.condition}</span>
              </div>
            )}
          </Link>
        );
      })}
      
      <div className="pt-3 border-t border-gray-200">
        <p className="text-xs text-navy-500 text-center">
          Showing up to 5 similar boats within ±5 years and ±20% length
        </p>
      </div>
    </div>
  );
}
