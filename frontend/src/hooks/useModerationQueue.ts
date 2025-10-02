import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/adminApi';
import { FlaggedListing, ModerationDecision, ModerationStats } from '@harborlist/shared-types';

interface UseModerationQueueReturn {
  listings: FlaggedListing[];
  stats: ModerationStats | null;
  loading: boolean;
  error: string | null;
  refreshListings: () => Promise<void>;
  moderateListing: (listingId: string, decision: ModerationDecision) => Promise<void>;
  getListingDetails: (listingId: string) => Promise<FlaggedListing | null>;
}

export const useModerationQueue = (): UseModerationQueueReturn => {
  const [listings, setListings] = useState<FlaggedListing[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [listingsResponse, statsResponse] = await Promise.all([
        adminApi.getFlaggedListings(),
        adminApi.getModerationStats()
      ]);
      
      setListings(listingsResponse.listings || []);
      setStats(statsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load moderation queue');
      console.error('Error loading moderation queue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const moderateListing = useCallback(async (listingId: string, decision: ModerationDecision) => {
    try {
      await adminApi.moderateListing(listingId, decision);
      
      // Update the listing in the local state
      setListings(prev => prev.map(listing => 
        listing.listingId === listingId 
          ? { 
              ...listing, 
              status: decision.action === 'approve' ? 'approved' : 
                      decision.action === 'reject' ? 'rejected' : 'under_review',
              reviewedAt: new Date().toISOString(),
              moderationNotes: decision.notes
            }
          : listing
      ));

      // Refresh stats
      try {
        const statsResponse = await adminApi.getModerationStats();
        setStats(statsResponse);
      } catch (statsError) {
        console.warn('Failed to refresh moderation stats:', statsError);
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to moderate listing');
    }
  }, []);

  const getListingDetails = useCallback(async (listingId: string): Promise<FlaggedListing | null> => {
    try {
      const response = await adminApi.getListingDetails(listingId);
      return response;
    } catch (err) {
      console.error('Error loading listing details:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshListings();
  }, [refreshListings]);

  return {
    listings,
    stats,
    loading,
    error,
    refreshListings,
    moderateListing,
    getListingDetails
  };
};