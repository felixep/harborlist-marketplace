import React, { useState, useEffect } from 'react';
import { NotificationSettings, NotificationTemplate, SettingsUpdateRequest, PlatformSettings } from '../../../types/admin';
import ConfirmationDialog from '../ConfirmationDialog';

interface NotificationSettingsPanelProps {
  settings: NotificationSettings;
  onUpdate: (request: SettingsUpdateRequest) => Promise<void>;
  onValidate: (section: keyof PlatformSettings, data: any) => Promise<boolean>;
  onReset: (section: keyof PlatformSettings, reason: string) => Promise<void>;
  onChange: () => void;
  onSave: () => void;
}

const NotificationSettingsPanel: React.FC<NotificationSettingsPanelProps> = ({
  settings,
  onUpdate,
  onValidate,
  onReset,
  onChange,
  onSave
}) => {
  const [formData, setFormData] = useState<NotificationSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'templates'>('general');
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleInputChange = (field: keyof NotificationSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
        section: 'notifications',
        data: formData,
        reason: changeReason
      });
      setShowSaveDialog(false);
      setChangeReason('');
      onSave();
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!changeReason.trim()) {
      alert('Please provide a reason for resetting notification settings');
      return;
    }

    try {
      setSaving(true);
      await onReset('notifications', changeReason);
      setShowResetDialog(false);
      setChangeReason('');
      onSave();
    } catch (error) {
      console.error('Failed to reset notification settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateUpdate = (template: NotificationTemplate) => {
    const updatedTemplates = formData.templates.map(t => 
      t.id === template.id ? template : t
    );
    handleInputChange('templates', updatedTemplates);
    setEditingTemplate(null);
  };

  const handleTemplateAdd = () => {
    const newTemplate: NotificationTemplate = {
      id: `template_${Date.now()}`,
      name: 'New Template',
      type: 'email',
      subject: '',
      content: '',
      variables: [],
      active: true
    };
    handleInputChange('templates', [...formData.templates, newTemplate]);
    setEditingTemplate(newTemplate);
  };

  const handleTemplateDelete = (templateId: string) => {
    const updatedTemplates = formData.templates.filter(t => t.id !== templateId);
    handleInputChange('templates', updatedTemplates);
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(settings);

  const tabs = [
    { key: 'general' as const, name: 'General', icon: '⚙️' },
    { key: 'templates' as const, name: 'Templates', icon: '📧' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
        <p className="text-sm text-gray-600 mb-6">
          Configure notification channels and manage email templates.
        </p>
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
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Notification Channels</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📧</span>
                  <div>
                    <h5 className="font-medium text-gray-900">Email Notifications</h5>
                    <p className="text-sm text-gray-500">Send notifications via email</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => handleInputChange('emailEnabled', !formData.emailEnabled)}
                    className={`${
                      formData.emailEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                    role="switch"
                    aria-checked={formData.emailEnabled}
                  >
                    <span
                      aria-hidden="true"
                      className={`${
                        formData.emailEnabled ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                    />
                  </button>
                  <span className="ml-3 text-sm">
                    <span className={`font-medium ${formData.emailEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                      {formData.emailEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📱</span>
                  <div>
                    <h5 className="font-medium text-gray-900">SMS Notifications</h5>
                    <p className="text-sm text-gray-500">Send notifications via SMS</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => handleInputChange('smsEnabled', !formData.smsEnabled)}
                    className={`${
                      formData.smsEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                    role="switch"
                    aria-checked={formData.smsEnabled}
                  >
                    <span
                      aria-hidden="true"
                      className={`${
                        formData.smsEnabled ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                    />
                  </button>
                  <span className="ml-3 text-sm">
                    <span className={`font-medium ${formData.smsEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                      {formData.smsEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🔔</span>
                  <div>
                    <h5 className="font-medium text-gray-900">Push Notifications</h5>
                    <p className="text-sm text-gray-500">Send push notifications to mobile apps</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => handleInputChange('pushEnabled', !formData.pushEnabled)}
                    className={`${
                      formData.pushEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                    role="switch"
                    aria-checked={formData.pushEnabled}
                  >
                    <span
                      aria-hidden="true"
                      className={`${
                        formData.pushEnabled ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                    />
                  </button>
                  <span className="ml-3 text-sm">
                    <span className={`font-medium ${formData.pushEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                      {formData.pushEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-medium text-gray-900">Notification Templates</h4>
            <button
              type="button"
              onClick={handleTemplateAdd}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Template
            </button>
          </div>

          <div className="space-y-3">
            {formData.templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">
                      {template.type === 'email' ? '📧' : template.type === 'sms' ? '📱' : '🔔'}
                    </span>
                    <h5 className="font-medium text-gray-900">{template.name}</h5>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      template.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {template.active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {template.type.toUpperCase()}
                    </span>
                  </div>
                  {template.subject && (
                    <p className="text-sm text-gray-600 mt-1">Subject: {template.subject}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Variables: {template.variables.length > 0 ? template.variables.join(', ') : 'None'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingTemplate(template)}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTemplateDelete(template.id)}
                    className="text-red-600 hover:text-red-900 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
        title="Save Notification Settings"
        message="Are you sure you want to save these notification settings? This will affect how users receive notifications."
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
        title="Reset Notification Settings"
        message="Are you sure you want to reset all notification settings to default values? This action cannot be undone."
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

export default NotificationSettingsPanel;