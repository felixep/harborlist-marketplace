import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlatformSettings } from '../usePlatformSettings';
import { adminApi } from '../../services/adminApi';

// Mock the admin API
jest.mock('../../services/adminApi', () => ({
  adminApi: {
    getPlatformSettings: jest.fn(),
    updatePlatformSettings: jest.fn(),
    validateSettings: jest.fn(),
    resetSettings: jest.fn(),
    getSettingsAuditLog: jest.fn()
  }
}));

const mockAdminApi = adminApi as jest.Mocked<typeof adminApi>;

const mockSettings = {
  general: {
    siteName: 'HarborList',
    siteDescription: 'Test description',
    supportEmail: 'support@test.com',
    maintenanceMode: false,
    registrationEnabled: true,
    maxListingsPerUser: 10,
    sessionTimeout: 60
  },
  features: {
    userRegistration: true,
    listingCreation: true,
    messaging: true,
    reviews: true,
    analytics: true,
    paymentProcessing: false,
    advancedSearch: true,
    mobileApp: false,
    socialLogin: false,
    emailNotifications: true
  },
  content: {
    termsOfService: 'Terms content',
    privacyPolicy: 'Privacy content',
    communityGuidelines: 'Guidelines content',
    listingPolicies: 'Policies content',
    lastUpdated: '2023-01-01T00:00:00.000Z',
    version: '1.0'
  },
  listings: {
    categories: [],
    pricingTiers: [],
    maxImages: 10,
    maxDescriptionLength: 2000,
    requireApproval: false,
    autoExpireDays: 90
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: false,
    templates: []
  }
};

describe('usePlatformSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load settings on mount', async () => {
    mockAdminApi.getPlatformSettings.mockResolvedValue(mockSettings);

    const { result } = renderHook(() => usePlatformSettings());

    expect(result.current.loading).toBe(true);
    expect(result.current.settings).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.settings).toEqual(mockSettings);
    expect(result.current.error).toBe(null);
    expect(mockAdminApi.getPlatformSettings).toHaveBeenCalledTimes(1);
  });

  it('should handle loading error', async () => {
    const errorMessage = 'Failed to load settings';
    mockAdminApi.getPlatformSettings.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => usePlatformSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.settings).toBe(null);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should update settings successfully', async () => {
    mockAdminApi.getPlatformSettings.mockResolvedValue(mockSettings);
    mockAdminApi.updatePlatformSettings.mockResolvedValue({});

    const { result } = renderHook(() => usePlatformSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updateRequest = {
      section: 'general' as const,
      data: { ...mockSettings.general, siteName: 'Updated Name' },
      reason: 'Test update'
    };

    await act(async () => {
      await result.current.updateSettings(updateRequest);
    });

    expect(mockAdminApi.updatePlatformSettings).toHaveBeenCalledWith(
      'general',
      updateRequest.data,
      'Test update'
    );
    expect(mockAdminApi.getPlatformSettings).toHaveBeenCalledTimes(2); // Initial load + refresh after update
  });

  it('should handle update error', async () => {
    mockAdminApi.getPlatformSettings.mockResolvedValue(mockSettings);
    const errorMessage = 'Update failed';
    mockAdminApi.updatePlatformSettings.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => usePlatformSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updateRequest = {
      section: 'general' as const,
      data: { ...mockSettings.general, siteName: 'Updated Name' },
      reason: 'Test update'
    };

    await act(async () => {
      try {
        await result.current.updateSettings(updateRequest);
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('should validate settings', async () => {
    mockAdminApi.getPlatformSettings.mockResolvedValue(mockSettings);
    mockAdminApi.validateSettings.mockResolvedValue({});

    const { result } = renderHook(() => usePlatformSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      const isValid = await result.current.validateSettings('general', mockSettings.general);
      expect(isValid).toBe(true);
    });

    expect(mockAdminApi.validateSettings).toHaveBeenCalledWith('general', mockSettings.general);
  });

  it('should handle validation error', async () => {
    mockAdminApi.getPlatformSettings.mockResolvedValue(mockSettings);
    const errorMessage = 'Validation failed';
    mockAdminApi.validateSettings.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => usePlatformSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      const isValid = await result.current.validateSettings('general', mockSettings.general);
      expect(isValid).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('should reset settings', async () => {
    mockAdminApi.getPlatformSettings.mockResolvedValue(mockSettings);
    mockAdminApi.resetSettings.mockResolvedValue({});

    const { result } = renderHook(() => usePlatformSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.resetSettings('general', 'Test reset');
    });

    expect(mockAdminApi.resetSettings).toHaveBeenCalledWith('general', 'Test reset');
    expect(mockAdminApi.getPlatformSettings).toHaveBeenCalledTimes(2); // Initial load + refresh after reset
  });

  it('should load audit log', async () => {
    mockAdminApi.getPlatformSettings.mockResolvedValue(mockSettings);
    const mockAuditLog = [
      {
        id: 'audit-1',
        adminId: 'admin-1',
        adminEmail: 'admin@test.com',
        section: 'general',
        field: 'siteName',
        oldValue: 'Old Name',
        newValue: 'New Name',
        reason: 'Test change',
        timestamp: '2023-01-01T00:00:00.000Z',
        ipAddress: '127.0.0.1'
      }
    ];
    mockAdminApi.getSettingsAuditLog.mockResolvedValue({ logs: mockAuditLog });

    const { result } = renderHook(() => usePlatformSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.getAuditLog({ section: 'general' });
    });

    expect(result.current.auditLog).toEqual(mockAuditLog);
    expect(mockAdminApi.getSettingsAuditLog).toHaveBeenCalledWith({ section: 'general' });
  });

  it('should refresh settings', async () => {
    mockAdminApi.getPlatformSettings.mockResolvedValue(mockSettings);

    const { result } = renderHook(() => usePlatformSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refreshSettings();
    });

    expect(mockAdminApi.getPlatformSettings).toHaveBeenCalledTimes(2); // Initial load + manual refresh
  });
});