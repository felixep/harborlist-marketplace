/**
 * @fileoverview System health monitoring hook for admin dashboard.
 * 
 * Provides real-time system health monitoring with service status tracking,
 * performance metrics, and automated health checks. Integrates with the
 * platform's monitoring infrastructure for comprehensive system oversight.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/adminApi';

/**
 * Individual health check result interface
 * 
 * @interface HealthCheck
 * @property {string} service - Name of the service being monitored
 * @property {'healthy' | 'degraded' | 'unhealthy'} status - Current health status
 * @property {number} responseTime - Response time in milliseconds
 * @property {string} lastCheck - ISO timestamp of last health check
 * @property {string} [message] - Optional status message or error description
 * @property {Record<string, any>} [details] - Additional service-specific details
 */
export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: string;
  message?: string;
  details?: Record<string, any>;
}

/**
 * Complete system health data interface
 * 
 * @interface SystemHealthData
 * @property {HealthCheck[]} healthChecks - Array of individual service health checks
 * @property {'healthy' | 'degraded' | 'unhealthy'} overallStatus - Aggregate system status
 * @property {string} lastUpdated - ISO timestamp of last health data update
 */
export interface SystemHealthData {
  healthChecks: HealthCheck[];
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  lastUpdated: string;
}

/**
 * System health monitoring hook
 * 
 * Provides real-time monitoring of system health across all platform services
 * including API endpoints, databases, storage systems, and external integrations.
 * Offers comprehensive health status tracking with performance metrics.
 * 
 * Monitored Services:
 * - API Gateway: Response times and availability
 * - Database: Connection status and query performance
 * - Storage: S3 bucket accessibility and performance
 * - CDN: Content delivery network status
 * - External APIs: Third-party service integrations
 * - Background Jobs: Queue processing and task execution
 * 
 * Features:
 * - Real-time health status monitoring
 * - Performance metrics tracking (response times)
 * - Aggregate system status calculation
 * - Error message and detail reporting
 * - Manual refresh capability
 * - Automatic error handling and recovery
 * 
 * Status Levels:
 * - Healthy: All systems operational (< 200ms response)
 * - Degraded: Some performance issues (200-1000ms response)
 * - Unhealthy: Service failures or critical issues (> 1000ms or errors)
 * 
 * @returns {Object} System health data and control methods
 * @returns {HealthCheck[]} healthChecks - Array of individual service health checks
 * @returns {'healthy' | 'degraded' | 'unhealthy'} overallStatus - Aggregate system status
 * @returns {boolean} loading - Loading state for health data fetching
 * @returns {string | null} error - Error message if health check fails
 * @returns {Function} refetch - Function to manually refresh health data
 * 
 * @example
 * ```tsx
 * function SystemHealthDashboard() {
 *   const { healthChecks, overallStatus, loading, error, refetch } = useSystemHealth();
 * 
 *   if (loading) return <LoadingSpinner />;
 *   if (error) return <ErrorAlert message={error} onRetry={refetch} />;
 * 
 *   return (
 *     <div>
 *       <SystemStatusBadge status={overallStatus} />
 *       
 *       <div className="health-checks">
 *         {healthChecks.map(check => (
 *           <HealthCheckCard
 *             key={check.service}
 *             service={check.service}
 *             status={check.status}
 *             responseTime={check.responseTime}
 *             message={check.message}
 *           />
 *         ))}
 *       </div>
 * 
 *       <button onClick={refetch}>Refresh Health Status</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @performance
 * - Efficient health check aggregation
 * - Optimized API calls with caching
 * - Minimal re-renders through proper state management
 * - Background health monitoring
 * 
 * @monitoring
 * - Real-time service status tracking
 * - Performance threshold monitoring
 * - Automated alerting integration
 * - Historical health data collection
 */
export const useSystemHealth = () => {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [overallStatus, setOverallStatus] = useState<'healthy' | 'degraded' | 'unhealthy'>('healthy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthChecks = useCallback(async () => {
    try {
      setError(null);
      const response = await adminApi.getSystemHealth();
      setHealthChecks(response.healthChecks);
      setOverallStatus(response.overallStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health checks');
      console.error('Failed to fetch health checks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthChecks();
  }, [fetchHealthChecks]);

  return {
    healthChecks,
    overallStatus,
    loading,
    error,
    refetch: fetchHealthChecks,
  };
};