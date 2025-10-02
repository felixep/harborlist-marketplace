import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PlatformSettings from '../PlatformSettings';
import { usePlatformSettings } from '../../../hooks/usePlatformSettings';

// Mock the hook
jest.mock('../../../hooks/usePlatformSettings');

// Mock the settings panels
jest.mock('../../../components/admin/settings/GeneralSettingsPanel', () => {
  return function MockGeneralSettingsPanel({ settings, onChange, onSave }: any) {
    return (
      <div data-testid="general-settings-panel">
        <div>Site Name: {settings.siteName}</div>
        <button onClick={onChange}>Change</button>
        <button onClick={onSave}>Save</button>
      </div>
    );
  };
});

jest.mock('../../../components/admin/settings/FeatureFlagsPanel', () => {
  return function MockFeatureFlagsPanel({ settings }: any) {
    return (
      <div data-testid="feature-flags-panel">
        <div>User Registration: {settings.userRegistration ? 'Enabled' : 'Disabled'}</div>
      </div>
    );
  };
});

jest.mock('../../../components/admin/settings/ContentPoliciesPanel', () => {
  return function MockContentPoliciesPanel({ settings }: any) {
    return (
      <div data-testid="content-policies-panel">
        <div>Terms: {settings.termsOfService}</div>
      </div>
    );
  };
});

jest.mock('../../../components/admin/settings/ListingConfigurationPanel', () => {
  return function MockListingConfigurationPanel({ settings }: any) {
    return (
      <div data-testid="listing-configuration-panel">
        <div>Max Images: {settings.maxImages}</div>
      </div>
    );
  };
});

jest.mock('../../../components/admin/settings/NotificationSettingsPanel', () => {
  return function MockNotificationSettingsPanel({ settings }: any) {
    return (
      <div data-testid="notification-settings-panel">
        <div>Email Enabled: {settings.emailEnabled ? 'Yes' : 'No'}</div>
      </div>
    );
  };
});

jest.mock('../../../components/admin/settings/SettingsAuditLog', () => {
  return function MockSettingsAuditLog() {
    return <div data-testid="settings-audit-log">Audit Log</div>;
  };
});

const mockUsePlatformSettings = usePlatformSettings as jest.MockedFunction<typeof usePlatformSettings>;

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

describe('PlatformSettings', () => {
  const mockUpdateSettings = jest.fn();
  const mockValidateSettings = jest.fn();
  const mockResetSettings = jest.fn();
  const mockGetAuditLog = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePlatformSettings.mockReturnValue({
      settings: mockSettings,
      loading: false,
      error: null,
      updateSettings: mockUpdateSettings,
      validateSettings: mockValidateSettings,
      resetSettings: mockResetSettings,
      refreshSettings: jest.fn(),
      auditLog: [],
      loadingAuditLog: false,
      getAuditLog: mockGetAuditLog
    });
  });

  it('should render loading state', () => {
    mockUsePlatformSettings.mockReturnValue({
      settings: null,
      loading: true,
      error: null,
      updateSettings: mockUpdateSettings,
      validateSettings: mockValidateSettings,
      resetSettings: mockResetSettings,
      refreshSettings: jest.fn(),
      auditLog: [],
      loadingAuditLog: false,
      getAuditLog: mockGetAuditLog
    });

    render(<PlatformSettings />);

    expect(screen.getByText('Platform Settings')).toBeInTheDocument();
    // Should show loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUsePlatformSettings.mockReturnValue({
      settings: null,
      loading: false,
      error: 'Failed to load settings',
      updateSettings: mockUpdateSettings,
      validateSettings: mockValidateSettings,
      resetSettings: mockResetSettings,
      refreshSettings: jest.fn(),
      auditLog: [],
      loadingAuditLog: false,
      getAuditLog: mockGetAuditLog
    });

    render(<PlatformSettings />);

    expect(screen.getByText('Error Loading Settings')).toBeInTheDocument();
    expect(screen.getByText('Failed to load settings')).toBeInTheDocument();
  });

  it('should render settings tabs and content', () => {
    render(<PlatformSettings />);

    // Check that all tabs are present
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByText('Content Policies')).toBeInTheDocument();
    expect(screen.getByText('Listings')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Audit Log')).toBeInTheDocument();

    // Check that general settings panel is shown by default
    expect(screen.getByTestId('general-settings-panel')).toBeInTheDocument();
    expect(screen.getByText('Site Name: HarborList')).toBeInTheDocument();
  });

  it('should switch between tabs', async () => {
    render(<PlatformSettings />);

    // Initially shows general settings
    expect(screen.getByTestId('general-settings-panel')).toBeInTheDocument();

    // Click on Features tab
    fireEvent.click(screen.getByText('Features'));

    await waitFor(() => {
      expect(screen.getByTestId('feature-flags-panel')).toBeInTheDocument();
      expect(screen.getByText('User Registration: Enabled')).toBeInTheDocument();
    });

    // Click on Content Policies tab
    fireEvent.click(screen.getByText('Content Policies'));

    await waitFor(() => {
      expect(screen.getByTestId('content-policies-panel')).toBeInTheDocument();
      expect(screen.getByText('Terms: Terms content')).toBeInTheDocument();
    });
  });

  it('should show unsaved changes warning', async () => {
    render(<PlatformSettings />);

    // Trigger onChange to simulate unsaved changes
    fireEvent.click(screen.getByText('Change'));

    await waitFor(() => {
      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
    });
  });

  it('should prevent tab switching with unsaved changes', async () => {
    // Mock window.confirm to return false (user cancels)
    const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(<PlatformSettings />);

    // Trigger onChange to simulate unsaved changes
    fireEvent.click(screen.getByText('Change'));

    await waitFor(() => {
      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
    });

    // Try to switch tabs
    fireEvent.click(screen.getByText('Features'));

    // Should still be on general tab
    expect(screen.getByTestId('general-settings-panel')).toBeInTheDocument();
    expect(mockConfirm).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to leave this tab?');

    mockConfirm.mockRestore();
  });

  it('should allow tab switching when user confirms', async () => {
    // Mock window.confirm to return true (user confirms)
    const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<PlatformSettings />);

    // Trigger onChange to simulate unsaved changes
    fireEvent.click(screen.getByText('Change'));

    await waitFor(() => {
      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
    });

    // Try to switch tabs
    fireEvent.click(screen.getByText('Features'));

    await waitFor(() => {
      expect(screen.getByTestId('feature-flags-panel')).toBeInTheDocument();
    });

    expect(mockConfirm).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to leave this tab?');

    mockConfirm.mockRestore();
  });

  it('should clear unsaved changes warning after save', async () => {
    render(<PlatformSettings />);

    // Trigger onChange to simulate unsaved changes
    fireEvent.click(screen.getByText('Change'));

    await waitFor(() => {
      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
    });

    // Trigger onSave
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();
    });
  });

  it('should load audit log when audit tab is selected', async () => {
    render(<PlatformSettings />);

    // Click on Audit Log tab
    fireEvent.click(screen.getByText('Audit Log'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-audit-log')).toBeInTheDocument();
      expect(mockGetAuditLog).toHaveBeenCalled();
    });
  });

  it('should handle no settings data', () => {
    mockUsePlatformSettings.mockReturnValue({
      settings: null,
      loading: false,
      error: null,
      updateSettings: mockUpdateSettings,
      validateSettings: mockValidateSettings,
      resetSettings: mockResetSettings,
      refreshSettings: jest.fn(),
      auditLog: [],
      loadingAuditLog: false,
      getAuditLog: mockGetAuditLog
    });

    render(<PlatformSettings />);

    expect(screen.getByText('No settings data available.')).toBeInTheDocument();
  });
});