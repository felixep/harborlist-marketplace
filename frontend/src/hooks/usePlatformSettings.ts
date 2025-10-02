import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/adminApi';
import { PlatformSettings, SettingsUpdateRequest, SettingsAuditLog } from '../types/admin';

interface UsePlatformSettingsReturn {
  settings: PlatformSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (request: SettingsUpdateRequest) => Promise<void>;
  validateSettings: (section: keyof PlatformSettings, data: any) => Promise<boolean>;
  resetSettings: (section: keyof PlatformSettings, reason: string) => Promise<void>;
  refreshSettings: () => Promise<void>;
  auditLog: SettingsAuditLog[];
  loadingAuditLog: boolean;
  getAuditLog: (params?: any) => Promise<void>;
}

export const usePlatformSettings = (): UsePlatformSettingsReturn => {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<SettingsAuditLog[]>([]);
  const [loadingAuditLog, setLoadingAuditLog] = useState(false);

  const refreshSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getPlatformSettings();
      setSettings(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (request: SettingsUpdateRequest) => {
    try {
      setError(null);
      await adminApi.updatePlatformSettings(request.section, request.data, request.reason);
      await refreshSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      throw err;
    }
  }, [refreshSettings]);

  const validateSettings = useCallback(async (section: keyof PlatformSettings, data: any): Promise<boolean> => {
    try {
      await adminApi.validateSettings(section, data);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
      return false;
    }
  }, []);

  const resetSettings = useCallback(async (section: keyof PlatformSettings, reason: string) => {
    try {
      setError(null);
      await adminApi.resetSettings(section, reason);
      await refreshSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset settings');
      throw err;
    }
  }, [refreshSettings]);

  const getAuditLog = useCallback(async (params?: any) => {
    try {
      setLoadingAuditLog(true);
      const response = await adminApi.getSettingsAuditLog(params);
      setAuditLog(response.logs || []);
    } catch (err) {
      console.error('Failed to load audit log:', err);
    } finally {
      setLoadingAuditLog(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    validateSettings,
    resetSettings,
    refreshSettings,
    auditLog,
    loadingAuditLog,
    getAuditLog
  };
};