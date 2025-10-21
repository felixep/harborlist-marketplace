/**
 * @fileoverview Platform stats hook for real analytics data
 * 
 * Fetches real platform statistics from the analytics API with role-based
 * data segmentation. Staff users get comprehensive analytics, while customers
 * and public users get limited data.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import { getPlatformStats, PlatformStats } from '../services/ratings';

interface UsePlatformStatsReturn {
  stats: PlatformStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch real platform statistics
 * 
 * Automatically fetches platform stats on mount and provides
 * manual refetch capability. Data returned depends on user's
 * authentication status and role:
 * 
 * - Public: activeListings, averageRating, userSatisfactionScore
 * - Customer: Public + totalListings, last30Days.views
 * - Staff: Full analytics including totalUsers, totalEvents, conversionRate
 * 
 * @returns {UsePlatformStatsReturn} Platform stats data, loading state, and refetch function
 * 
 * @example
 * ```tsx
 * function DashboardOverview() {
 *   const { stats, loading, error, refetch } = usePlatformStats();
 * 
 *   if (loading) return <Skeleton />;
 *   if (error) return <ErrorMessage message={error} onRetry={refetch} />;
 * 
 *   return (
 *     <div>
 *       <MetricCard title="Active Listings" value={stats.activeListings} />
 *       <MetricCard title="Average Rating" value={stats.averageRating} />
 *       {stats.totalUsers && (
 *         <MetricCard title="Total Users" value={stats.totalUsers} />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export const usePlatformStats = (): UsePlatformStatsReturn => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPlatformStats();
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch platform stats';
      setError(errorMessage);
      console.error('Platform stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const refetch = () => {
    fetchStats();
  };

  return {
    stats,
    loading,
    error,
    refetch,
  };
};

/**
 * Hook to fetch platform stats with auto-refresh
 * 
 * Similar to usePlatformStats but automatically refetches data
 * at specified intervals.
 * 
 * @param {number} refreshInterval - Interval in milliseconds (default: 60000 = 1 minute)
 * @returns {UsePlatformStatsReturn} Platform stats with auto-refresh
 * 
 * @example
 * ```tsx
 * function LiveDashboard() {
 *   // Refresh every 30 seconds
 *   const { stats, loading } = usePlatformStatsWithRefresh(30000);
 *   
 *   return <RealTimeMetrics data={stats} loading={loading} />;
 * }
 * ```
 */
export const usePlatformStatsWithRefresh = (
  refreshInterval: number = 60000
): UsePlatformStatsReturn => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPlatformStats();
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch platform stats';
      setError(errorMessage);
      console.error('Platform stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up auto-refresh interval
    const intervalId = setInterval(fetchStats, refreshInterval);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  const refetch = () => {
    fetchStats();
  };

  return {
    stats,
    loading,
    error,
    refetch,
  };
};
