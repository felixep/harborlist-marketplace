import React, { useState, useEffect } from 'react';
import { FeatureFlags, SettingsUpdateRequest, PlatformSettings } from '../../../types/admin';
import ConfirmationDialog from '../ConfirmationDialog';

interface FeatureFlagsPanelProps {
  settings: FeatureFlags;
  onUpdate: (request: SettingsUpdateRequest) => Promise<void>;
  onValidate: (section: keyof PlatformSettings, data: any) => Promise<boolean>;
  onReset: (section: keyof PlatformSettings, reason: string) => Promise<void>;
  onChange: () => void;
  onSave: () => void;
}

const FeatureFlagsPanel: React.FC<FeatureFlagsPanelProps> = ({
  settings,
  onUpdate,
  onValidate,
  onReset,
  onChange,
  onSave
}) => {
  const [formData, setFormData] = useState<FeatureFlags>(settings);
  const [saving, setSaving] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [changeReason, setChangeReason] = useState('');

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleToggle = (flag: keyof FeatureFlags) => {
    setFormData(prev => ({ ...prev, [flag]: !prev[flag] }));
    onChange();
  };

  const handleSave = async () => {
    if (!changeReason.trim()) {
      alert('Please provide a reason for this change');
      return;
    }

    try {
      setSaving(true);
      await onUpdate({
        section: 'features',
        data: formData,
        reason: changeReason
      });
      setShowSaveDialog(false);
      setChangeReason('');
      onSave();
    } catch (error) {
      console.error('Failed to save feature flags:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!changeReason.trim()) {
      alert('Please provide a reason for resetting feature flags');
      return;
    }

    try {
      setSaving(true);
      await onReset('features', changeReason);
      setShowResetDialog(false);
      setChangeReason('');
      onSave();
    } catch (error) {
      console.error('Failed to reset feature flags:', error);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(settings);

  const featureFlags = [
    {
      key: 'userRegistration' as keyof FeatureFlags,
      name: 'User Registration',
      description: 'Allow new users to register for accounts',
      icon: '👤'
    },
    {
      key: 'listingCreation' as keyof FeatureFlags,
      name: 'Listing Creation',
      description: 'Allow users to create new boat listings',
      icon: '🚤'
    },
    {
      key: 'messaging' as keyof FeatureFlags,
      name: 'Messaging System',
      description: 'Enable direct messaging between users',
      icon: '💬'
    },
    {
      key: 'reviews' as keyof FeatureFlags,
      name: 'Reviews & Ratings',
      description: 'Allow users to leave reviews and ratings',
      icon: '⭐'
    },
    {
      key: 'analytics' as keyof FeatureFlags,
      name: 'Analytics Tracking',
      description: 'Collect user behavior analytics',
      icon: '📊'
    },
    {
      key: 'paymentProcessing' as keyof FeatureFlags,
      name: 'Payment Processing',
      description: 'Enable payment processing for transactions',
      icon: '💳'
    },
    {
      key: 'advancedSearch' as keyof FeatureFlags,
      name: 'Advanced Search',
      description: 'Enable advanced search filters and features',
      icon: '🔍'
    },
    {
      key: 'mobileApp' as keyof FeatureFlags,
      name: 'Mobile App Features',
      description: 'Enable mobile-specific features and APIs',
      icon: '📱'
    },
    {
      key: 'socialLogin' as keyof FeatureFlags,
      name: 'Social Login',
      description: 'Allow login with social media accounts',
      icon: '🔗'
    },
    {
      key: 'emailNotifications' as keyof FeatureFlags,
      name: 'Email Notifications',
      description: 'Send email notifications to users',
      icon: '📧'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Feature Flags</h3>
        <p className="text-sm text-gray-600 mb-6">
          Enable or disable platform features. Changes take effect immediately after saving.
        </p>
      </div>

      <div className="space-y-4">
        {featureFlags.map((flag) => (
          <div key={flag.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{flag.icon}</span>
              <div>
                <h4 className="text-sm font-medium text-gray-900">{flag.name}</h4>
                <p className="text-sm text-gray-500">{flag.description}</p>
              </div>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => handleToggle(flag.key)}
                className={`${
                  formData[flag.key] ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                role="switch"
                aria-checked={formData[flag.key]}
              >
                <span
                  aria-hidden="true"
                  className={`${
                    formData[flag.key] ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                />
              </button>
              <span className="ml-3 text-sm">
                <span className={`font-medium ${formData[flag.key] ? 'text-green-600' : 'text-gray-500'}`}>
                  {formData[flag.key] ? 'Enabled' : 'Disabled'}
                </span>
              </span>
            </div>
          </div>
        ))}
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
        title="Save Feature Flags"
        message="Are you sure you want to save these feature flag changes? This will immediately affect platform functionality."
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
            placeholder="Describe why you're making these changes..."
          />
        </div>
      </ConfirmationDialog>

      {/* Reset Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onConfirm={handleReset}
        title="Reset Feature Flags"
        message="Are you sure you want to reset all feature flags to their default values? This action cannot be undone and will immediately affect platform functionality."
        confirmText="Reset Flags"
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
            placeholder="Describe why you're resetting these feature flags..."
          />
        </div>
      </ConfirmationDialog>
    </div>
  );
};

export default FeatureFlagsPanel;