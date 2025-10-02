import React, { useState, useEffect } from 'react';
import { ContentPolicies, SettingsUpdateRequest, PlatformSettings } from '@harborlist/shared-types';
import ConfirmationDialog from '../ConfirmationDialog';

interface ContentPoliciesPanelProps {
  settings: ContentPolicies;
  onUpdate: (request: SettingsUpdateRequest) => Promise<void>;
  onValidate: (section: keyof PlatformSettings, data: any) => Promise<boolean>;
  onReset: (section: keyof PlatformSettings, reason: string) => Promise<void>;
  onChange: () => void;
  onSave: () => void;
}

const ContentPoliciesPanel: React.FC<ContentPoliciesPanelProps> = ({
  settings,
  onUpdate,
  onValidate,
  onReset,
  onChange,
  onSave
}) => {
  const [formData, setFormData] = useState<ContentPolicies>(settings);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [activeTab, setActiveTab] = useState<keyof Omit<ContentPolicies, 'lastUpdated' | 'version'>>('termsOfService');

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleInputChange = (field: keyof ContentPolicies, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    onChange();
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.termsOfService.trim()) {
      newErrors.termsOfService = 'Terms of Service is required';
    }

    if (!formData.privacyPolicy.trim()) {
      newErrors.privacyPolicy = 'Privacy Policy is required';
    }

    if (!formData.communityGuidelines.trim()) {
      newErrors.communityGuidelines = 'Community Guidelines is required';
    }

    if (!formData.listingPolicies.trim()) {
      newErrors.listingPolicies = 'Listing Policies is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!changeReason.trim()) {
      alert('Please provide a reason for this change');
      return;
    }

    try {
      setSaving(true);
      const updatedData = {
        ...formData,
        lastUpdated: new Date().toISOString(),
        version: (parseFloat(formData.version) + 0.1).toFixed(1)
      };
      
      await onUpdate({
        section: 'content',
        data: updatedData,
        reason: changeReason
      });
      setShowSaveDialog(false);
      setChangeReason('');
      onSave();
    } catch (error) {
      console.error('Failed to save content policies:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!changeReason.trim()) {
      alert('Please provide a reason for resetting content policies');
      return;
    }

    try {
      setSaving(true);
      await onReset('content', changeReason);
      setShowResetDialog(false);
      setChangeReason('');
      onSave();
    } catch (error) {
      console.error('Failed to reset content policies:', error);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(settings);

  const tabs = [
    { key: 'termsOfService' as const, name: 'Terms of Service', icon: '📋' },
    { key: 'privacyPolicy' as const, name: 'Privacy Policy', icon: '🔒' },
    { key: 'communityGuidelines' as const, name: 'Community Guidelines', icon: '👥' },
    { key: 'listingPolicies' as const, name: 'Listing Policies', icon: '🏷️' }
  ];

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Content Policies</h3>
        <p className="text-sm text-gray-600 mb-6">
          Manage platform policies and guidelines. Changes will be versioned and tracked.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-400">ℹ️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Current Version:</strong> {settings.version} | 
                <strong> Last Updated:</strong> {new Date(settings.lastUpdated).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor={activeTab} className="block text-sm font-medium text-gray-700">
              {tabs.find(tab => tab.key === activeTab)?.name}
            </label>
            <span className="text-sm text-gray-500">
              {getWordCount(formData[activeTab])} words
            </span>
          </div>
          <textarea
            id={activeTab}
            rows={20}
            value={formData[activeTab]}
            onChange={(e) => handleInputChange(activeTab, e.target.value)}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono ${
              errors[activeTab] ? 'border-red-300' : ''
            }`}
            placeholder={`Enter ${tabs.find(tab => tab.key === activeTab)?.name.toLowerCase()}...`}
          />
          {errors[activeTab] && (
            <p className="mt-1 text-sm text-red-600">{errors[activeTab]}</p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            You can use Markdown formatting. HTML tags will be sanitized for security.
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => setShowResetDialog(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Reset to Defaults
        </button>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => setFormData(settings)}
            disabled={!hasChanges}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setShowSaveDialog(true)}
            disabled={!hasChanges || saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Save Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onConfirm={handleSave}
        title="Save Content Policies"
        message="Are you sure you want to save these policy changes? This will create a new version and notify users of policy updates."
        confirmText="Save Changes"
        cancelText="Cancel"
        type="primary"
      >
        <div className="mt-4">
          <label htmlFor="saveReason" className="block text-sm font-medium text-gray-700">
            Reason for change (required)
          </label>
          <textarea
            id="saveReason"
            rows={3}
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Describe the changes and why they were made..."
          />
        </div>
      </ConfirmationDialog>

      {/* Reset Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onConfirm={handleReset}
        title="Reset Content Policies"
        message="Are you sure you want to reset all content policies to their default values? This action cannot be undone and will create a new version."
        confirmText="Reset Policies"
        cancelText="Cancel"
        type="danger"
      >
        <div className="mt-4">
          <label htmlFor="resetReason" className="block text-sm font-medium text-gray-700">
            Reason for reset (required)
          </label>
          <textarea
            id="resetReason"
            rows={3}
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Describe why you're resetting these policies..."
          />
        </div>
      </ConfirmationDialog>
    </div>
  );
};

export default ContentPoliciesPanel;