import React, { useState, useEffect } from 'react';
import { usePlatformSettings } from '../../hooks/usePlatformSettings';
import { PlatformSettings as PlatformSettingsType } from '../../types/admin';
import GeneralSettingsPanel from '../../components/admin/settings/GeneralSettingsPanel';
import FeatureFlagsPanel from '../../components/admin/settings/FeatureFlagsPanel';
import ContentPoliciesPanel from '../../components/admin/settings/ContentPoliciesPanel';
import ListingConfigurationPanel from '../../components/admin/settings/ListingConfigurationPanel';
import NotificationSettingsPanel from '../../components/admin/settings/NotificationSettingsPanel';
import SettingsAuditLog from '../../components/admin/settings/SettingsAuditLog';

type SettingsTab = 'general' | 'features' | 'content' | 'listings' | 'notifications' | 'audit';

const PlatformSettings: React.FC = () => {
  const { settings, loading, error, updateSettings, validateSettings, resetSettings, getAuditLog } = usePlatformSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (activeTab === 'audit') {
      getAuditLog();
    }
  }, [activeTab, getAuditLog]);

  const tabs = [
    { id: 'general' as const, name: 'General', icon: '⚙️' },
    { id: 'features' as const, name: 'Features', icon: '🚀' },
    { id: 'content' as const, name: 'Content Policies', icon: '📋' },
    { id: 'listings' as const, name: 'Listings', icon: '🏷️' },
    { id: 'notifications' as const, name: 'Notifications', icon: '🔔' },
    { id: 'audit' as const, name: 'Audit Log', icon: '📊' }
  ];

  const handleTabChange = (tabId: SettingsTab) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave this tab?');
      if (!confirmed) return;
    }
    setActiveTab(tabId);
    setHasUnsavedChanges(false);
  };

  const handleSettingsChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleSettingsSave = async () => {
    setHasUnsavedChanges(false);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Platform Settings</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Settings</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Platform Settings</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No settings data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
        {hasUnsavedChanges && (
          <div className="flex items-center text-amber-600">
            <span className="mr-2">⚠️</span>
            <span className="text-sm font-medium">You have unsaved changes</span>
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'general' && (
            <GeneralSettingsPanel
              settings={settings.general}
              onUpdate={updateSettings}
              onValidate={validateSettings}
              onReset={resetSettings}
              onChange={handleSettingsChange}
              onSave={handleSettingsSave}
            />
          )}
          {activeTab === 'features' && (
            <FeatureFlagsPanel
              settings={settings.features}
              onUpdate={updateSettings}
              onValidate={validateSettings}
              onReset={resetSettings}
              onChange={handleSettingsChange}
              onSave={handleSettingsSave}
            />
          )}
          {activeTab === 'content' && (
            <ContentPoliciesPanel
              settings={settings.content}
              onUpdate={updateSettings}
              onValidate={validateSettings}
              onReset={resetSettings}
              onChange={handleSettingsChange}
              onSave={handleSettingsSave}
            />
          )}
          {activeTab === 'listings' && (
            <ListingConfigurationPanel
              settings={settings.listings}
              onUpdate={updateSettings}
              onValidate={validateSettings}
              onReset={resetSettings}
              onChange={handleSettingsChange}
              onSave={handleSettingsSave}
            />
          )}
          {activeTab === 'notifications' && (
            <NotificationSettingsPanel
              settings={settings.notifications}
              onUpdate={updateSettings}
              onValidate={validateSettings}
              onReset={resetSettings}
              onChange={handleSettingsChange}
              onSave={handleSettingsSave}
            />
          )}
          {activeTab === 'audit' && (
            <SettingsAuditLog />
          )}
        </div>
      </div>
    </div>
  );
};

export default PlatformSettings;