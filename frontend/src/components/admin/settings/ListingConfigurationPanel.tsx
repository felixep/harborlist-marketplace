import React, { useState, useEffect } from 'react';
import { ListingConfiguration, ListingCategory, PricingTier, SettingsUpdateRequest, PlatformSettings } from '@harborlist/shared-types';
import ConfirmationDialog from '../ConfirmationDialog';

interface ListingConfigurationPanelProps {
  settings: ListingConfiguration;
  onUpdate: (request: SettingsUpdateRequest) => Promise<void>;
  onValidate: (section: keyof PlatformSettings, data: any) => Promise<boolean>;
  onReset: (section: keyof PlatformSettings, reason: string) => Promise<void>;
  onChange: () => void;
  onSave: () => void;
}

const ListingConfigurationPanel: React.FC<ListingConfigurationPanelProps> = ({
  settings,
  onUpdate,
  onValidate,
  onReset,
  onChange,
  onSave
}) => {
  const [formData, setFormData] = useState<ListingConfiguration>(settings);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'pricing'>('general');
  const [editingCategory, setEditingCategory] = useState<ListingCategory | null>(null);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleInputChange = (field: keyof ListingConfiguration, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    onChange();
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.maxImages < 1) {
      newErrors.maxImages = 'Must allow at least 1 image';
    }

    if (formData.maxDescriptionLength < 100) {
      newErrors.maxDescriptionLength = 'Must be at least 100 characters';
    }

    if (formData.autoExpireDays < 1) {
      newErrors.autoExpireDays = 'Must be at least 1 day';
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
        section: 'listings',
        data: formData,
        reason: changeReason
      });
      setShowSaveDialog(false);
      setChangeReason('');
      onSave();
    } catch (error) {
      console.error('Failed to save listing configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!changeReason.trim()) {
      alert('Please provide a reason for resetting listing configuration');
      return;
    }

    try {
      setSaving(true);
      await onReset('listings', changeReason);
      setShowResetDialog(false);
      setChangeReason('');
      onSave();
    } catch (error) {
      console.error('Failed to reset listing configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryUpdate = (category: ListingCategory) => {
    const updatedCategories = formData.categories.map(cat => 
      cat.id === category.id ? category : cat
    );
    handleInputChange('categories', updatedCategories);
    setEditingCategory(null);
  };

  const handleCategoryAdd = () => {
    const newCategory: ListingCategory = {
      id: `cat_${Date.now()}`,
      name: 'New Category',
      description: '',
      active: true,
      order: formData.categories.length + 1
    };
    handleInputChange('categories', [...formData.categories, newCategory]);
    setEditingCategory(newCategory);
  };

  const handleCategoryDelete = (categoryId: string) => {
    const updatedCategories = formData.categories.filter(cat => cat.id !== categoryId);
    handleInputChange('categories', updatedCategories);
  };

  const handleTierUpdate = (tier: PricingTier) => {
    const updatedTiers = formData.pricingTiers.map(t => 
      t.id === tier.id ? tier : t
    );
    handleInputChange('pricingTiers', updatedTiers);
    setEditingTier(null);
  };

  const handleTierAdd = () => {
    const newTier: PricingTier = {
      id: `tier_${Date.now()}`,
      name: 'New Tier',
      description: '',
      price: 0,
      features: [],
      active: true,
      order: formData.pricingTiers.length + 1
    };
    handleInputChange('pricingTiers', [...formData.pricingTiers, newTier]);
    setEditingTier(newTier);
  };

  const handleTierDelete = (tierId: string) => {
    const updatedTiers = formData.pricingTiers.filter(tier => tier.id !== tierId);
    handleInputChange('pricingTiers', updatedTiers);
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(settings);

  const tabs = [
    { key: 'general' as const, name: 'General', icon: '⚙️' },
    { key: 'categories' as const, name: 'Categories', icon: '🏷️' },
    { key: 'pricing' as const, name: 'Pricing Tiers', icon: '💰' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Listing Configuration</h3>
        <p className="text-sm text-gray-600 mb-6">
          Configure listing categories, pricing tiers, and general listing settings.
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="maxImages" className="block text-sm font-medium text-gray-700">
                Maximum Images per Listing
              </label>
              <input
                type="number"
                id="maxImages"
                min="1"
                max="20"
                value={formData.maxImages}
                onChange={(e) => handleInputChange('maxImages', parseInt(e.target.value) || 1)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.maxImages ? 'border-red-300' : ''
                }`}
              />
              {errors.maxImages && (
                <p className="mt-1 text-sm text-red-600">{errors.maxImages}</p>
              )}
            </div>

            <div>
              <label htmlFor="maxDescriptionLength" className="block text-sm font-medium text-gray-700">
                Maximum Description Length
              </label>
              <input
                type="number"
                id="maxDescriptionLength"
                min="100"
                value={formData.maxDescriptionLength}
                onChange={(e) => handleInputChange('maxDescriptionLength', parseInt(e.target.value) || 100)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.maxDescriptionLength ? 'border-red-300' : ''
                }`}
              />
              {errors.maxDescriptionLength && (
                <p className="mt-1 text-sm text-red-600">{errors.maxDescriptionLength}</p>
              )}
            </div>

            <div>
              <label htmlFor="autoExpireDays" className="block text-sm font-medium text-gray-700">
                Auto-expire Listings (days)
              </label>
              <input
                type="number"
                id="autoExpireDays"
                min="1"
                value={formData.autoExpireDays}
                onChange={(e) => handleInputChange('autoExpireDays', parseInt(e.target.value) || 1)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.autoExpireDays ? 'border-red-300' : ''
                }`}
              />
              {errors.autoExpireDays && (
                <p className="mt-1 text-sm text-red-600">{errors.autoExpireDays}</p>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="requireApproval"
              type="checkbox"
              checked={formData.requireApproval}
              onChange={(e) => handleInputChange('requireApproval', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="requireApproval" className="ml-2 block text-sm text-gray-900">
              Require Admin Approval for New Listings
            </label>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-medium text-gray-900">Listing Categories</h4>
            <button
              type="button"
              onClick={handleCategoryAdd}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Category
            </button>
          </div>

          <div className="space-y-3">
            {formData.categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h5 className="font-medium text-gray-900">{category.name}</h5>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      category.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {category.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(category)}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategoryDelete(category.id)}
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

      {activeTab === 'pricing' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-medium text-gray-900">Pricing Tiers</h4>
            <button
              type="button"
              onClick={handleTierAdd}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Tier
            </button>
          </div>

          <div className="space-y-3">
            {formData.pricingTiers.map((tier) => (
              <div key={tier.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h5 className="font-medium text-gray-900">{tier.name}</h5>
                    <span className="text-lg font-bold text-green-600">${tier.price}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tier.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {tier.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{tier.description}</p>
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">Features: </span>
                    <span className="text-xs text-gray-700">{tier.features.join(', ')}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingTier(tier)}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTierDelete(tier.id)}
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
        title="Save Listing Configuration"
        message="Are you sure you want to save these listing configuration changes? This will affect how listings are created and managed."
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
        title="Reset Listing Configuration"
        message="Are you sure you want to reset all listing configuration to default values? This action cannot be undone."
        confirmText="Reset Configuration"
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
            placeholder="Describe why you're resetting this configuration..."
          />
        </div>
      </ConfirmationDialog>
    </div>
  );
};

export default ListingConfigurationPanel;