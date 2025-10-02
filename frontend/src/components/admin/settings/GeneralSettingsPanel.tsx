import React, { useState, useEffect } from 'react';
import { GeneralSettings, SettingsUpdateRequest, PlatformSettings } from '../../../types/admin';
import ConfirmationDialog from '../ConfirmationDialog';

interface GeneralSettingsPanelProps {
  settings: GeneralSettings;
  onUpdate: (request: SettingsUpdateRequest) => Promise<void>;
  onValidate: (section: keyof PlatformSettings, data: any) => Promise<boolean>;
  onReset: (section: keyof PlatformSettings, reason: string) => Promise<void>;
  onChange: () => void;
  onSave: () => void;
}

const GeneralSettingsPanel: React.FC<GeneralSettingsPanelProps> = ({
  settings,
  onUpdate,
  onValidate,
  onReset,
  onChange,
  onSave
}) => {
  const [formData, setFormData] = useState<GeneralSettings>(settings);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [changeReason, setChangeReason] = useState('');

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleInputChange = (field: keyof GeneralSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    onChange();
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.siteName.trim()) {
      newErrors.siteName = 'Site name is required';
    }

    if (!formData.supportEmail.trim()) {
      newErrors.supportEmail = 'Support email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.supportEmail)) {
      newErrors.supportEmail = 'Please enter a valid email address';
    }

    if (formData.maxListingsPerUser < 1) {
      newErrors.maxListingsPerUser = 'Must be at least 1';
    }

    if (formData.sessionTimeout < 15) {
      newErrors.sessionTimeout = 'Must be at least 15 minutes';
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
      await onUpdate({
        section: 'general',
        data: formData,
        reason: changeReason
      });
      setShowSaveDialog(false);
      setChangeReason('');
      onSave();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!changeReason.trim()) {
      alert('Please provide a reason for resetting settings');
      return;
    }

    try {
      setSaving(true);
      await onReset('general', changeReason);
      setShowResetDialog(false);
      setChangeReason('');
      onSave();
    } catch (error) {
      console.error('Failed to reset settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(settings);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
        <p className="text-sm text-gray-600 mb-6">
          Configure basic platform settings and behavior.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="siteName" className="block text-sm font-medium text-gray-700">
            Site Name
          </label>
          <input
            type="text"
            id="siteName"
            value={formData.siteName}
            onChange={(e) => handleInputChange('siteName', e.target.value)}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.siteName ? 'border-red-300' : ''
            }`}
            placeholder="HarborList"
          />
          {errors.siteName && (
            <p className="mt-1 text-sm text-red-600">{errors.siteName}</p>
          )}
        </div>

        <div>
          <label htmlFor="supportEmail" className="block text-sm font-medium text-gray-700">
            Support Email
          </label>
          <input
            type="email"
            id="supportEmail"
            value={formData.supportEmail}
            onChange={(e) => handleInputChange('supportEmail', e.target.value)}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.supportEmail ? 'border-red-300' : ''
            }`}
            placeholder="support@harborlist.com"
          />
          {errors.supportEmail && (
            <p className="mt-1 text-sm text-red-600">{errors.supportEmail}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="siteDescription" className="block text-sm font-medium text-gray-700">
            Site Description
          </label>
          <textarea
            id="siteDescription"
            rows={3}
            value={formData.siteDescription}
            onChange={(e) => handleInputChange('siteDescription', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="The premier marketplace for buying and selling boats"
          />
        </div>

        <div>
          <label htmlFor="maxListingsPerUser" className="block text-sm font-medium text-gray-700">
            Max Listings Per User
          </label>
          <input
            type="number"
            id="maxListingsPerUser"
            min="1"
            value={formData.maxListingsPerUser}
            onChange={(e) => handleInputChange('maxListingsPerUser', parseInt(e.target.value) || 1)}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.maxListingsPerUser ? 'border-red-300' : ''
            }`}
          />
          {errors.maxListingsPerUser && (
            <p className="mt-1 text-sm text-red-600">{errors.maxListingsPerUser}</p>
          )}
        </div>

        <div>
          <label htmlFor="sessionTimeout" className="block text-sm font-medium text-gray-700">
            Session Timeout (minutes)
          </label>
          <input
            type="number"
            id="sessionTimeout"
            min="15"
            value={formData.sessionTimeout}
            onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value) || 15)}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.sessionTimeout ? 'border-red-300' : ''
            }`}
          />
          {errors.sessionTimeout && (
            <p className="mt-1 text-sm text-red-600">{errors.sessionTimeout}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center">
          <input
            id="maintenanceMode"
            type="checkbox"
            checked={formData.maintenanceMode}
            onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-900">
            Maintenance Mode
          </label>
        </div>
        <p className="text-sm text-gray-500 ml-6">
          When enabled, the site will display a maintenance message to users
        </p>

        <div className="flex items-center">
          <input
            id="registrationEnabled"
            type="checkbox"
            checked={formData.registrationEnabled}
            onChange={(e) => handleInputChange('registrationEnabled', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="registrationEnabled" className="ml-2 block text-sm text-gray-900">
            User Registration Enabled
          </label>
        </div>
        <p className="text-sm text-gray-500 ml-6">
          Allow new users to register for accounts
        </p>
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
        title="Save General Settings"
        message="Are you sure you want to save these changes? This will update the platform configuration."
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
        title="Reset General Settings"
        message="Are you sure you want to reset all general settings to their default values? This action cannot be undone."
        confirmText="Reset Settings"
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
            placeholder="Describe why you're resetting these settings..."
          />
        </div>
      </ConfirmationDialog>
    </div>
  );
};

export default GeneralSettingsPanel;