import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/adminApi';

export interface SystemAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  service: string;
  threshold?: {
    metric: string;
    value: number;
    operator: '>' | '<' | '=' | '>=' | '<=';
  };
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: string;
}

export const useSystemAlerts = () => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({ status: 'active' });
      const response = await adminApi.get<{ alerts: SystemAlert[] }>(`/system/alerts?${params}`);
      setAlerts(response.data.alerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system alerts');
      console.error('Failed to fetch system alerts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      await adminApi.post(`/system/alerts/${alertId}/acknowledge`);
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledgedAt: new Date().toISOString() }
          : alert
      ));
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
      throw err;
    }
  }, []);

  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      await adminApi.post(`/system/alerts/${alertId}/resolve`);
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (err) {
      console.error('Failed to resolve alert:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    
    // Poll for new alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  return {
    alerts,
    loading,
    error,
    acknowledgeAlert,
    resolveAlert,
    refetch: fetchAlerts,
  };
};