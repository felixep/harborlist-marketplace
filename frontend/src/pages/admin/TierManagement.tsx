/**
 * @fileoverview Tier Management page for managing user subscription tiers and features
 * 
 * Allows admins to:
 * - View all available tiers (Free, Premium Individual, Premium Dealer, etc.)
 * - Enable/disable features for each tier
 * - Configure tier limits and pricing
 * - Add new features to tiers
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const ADMIN_TOKEN_KEY = 'adminAuthToken';

// Helper to get authorization headers
const getAuthHeaders = () => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

interface TierFeature {
  featureId: string;
  name: string;
  description: string;
  enabled: boolean;
  limits?: Record<string, number>;
}

interface UserTier {
  tierId: string;
  name: string;
  type: 'individual' | 'dealer';
  isPremium: boolean;
  features: TierFeature[];
  limits: any;
  pricing: {
    monthly?: number;
    yearly?: number;
    currency: string;
  };
  active: boolean;
  description?: string;
  displayOrder: number;
}

// Available features that can be added to tiers
const AVAILABLE_FEATURES: TierFeature[] = [
  {
    featureId: 'priority_placement',
    name: 'Priority Placement',
    description: 'Listings appear higher in search results',
    enabled: true,
  },
  {
    featureId: 'featured_listings',
    name: 'Featured Listings',
    description: 'Showcase listings in premium spots',
    enabled: true,
  },
  {
    featureId: 'analytics_access',
    name: 'Advanced Analytics',
    description: 'Detailed insights and performance metrics',
    enabled: true,
  },
  {
    featureId: 'comparable_listings',
    name: 'Market Comparables',
    description: 'See similar boats on the market with real-time pricing comparisons',
    enabled: true,
    limits: { maxComparables: 5 },
  },
  {
    featureId: 'premium_support',
    name: 'Premium Support',
    description: 'Priority customer support with faster response times',
    enabled: true,
  },
  {
    featureId: 'bulk_operations',
    name: 'Bulk Operations',
    description: 'Manage multiple listings at once',
    enabled: true,
  },
];

export default function TierManagement() {
  const [selectedTier, setSelectedTier] = useState<UserTier | null>(null);
  const [showAddFeatureModal, setShowAddFeatureModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch tiers
  const { data: tiers, isLoading, error } = useQuery<UserTier[]>({
    queryKey: ['tiers'],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL;
      const headers = getAuthHeaders();
      
      console.log('🔍 Fetching tiers from:', `${apiUrl}/admin/tiers`);
      console.log('🔑 Headers:', headers);
      console.log('🎫 Token exists:', !!localStorage.getItem(ADMIN_TOKEN_KEY));
      
      const response = await fetch(`${apiUrl}/admin/tiers`, {
        headers,
      });
      
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.message || 'Failed to fetch tiers');
      }
      
      const data = await response.json();
      console.log('✅ API Response:', data);
      console.log('📊 Tiers count:', data.tiers?.length || 0);
      
      return data.tiers || [];
    },
  });

  console.log('🎨 Component State:', { 
    tiersCount: tiers?.length, 
    isLoading, 
    hasError: !!error,
    errorDetails: error 
  });

  const addFeatureMutation = useMutation({
    mutationFn: async ({ tierId, feature }: { tierId: string; feature: TierFeature }) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/tiers/${tierId}/features`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(feature),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add feature');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiers'] });
      setShowAddFeatureModal(false);
    },
  });

  const removeFeatureMutation = useMutation({
    mutationFn: async ({ tierId, featureId }: { tierId: string; featureId: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/tiers/${tierId}/features/${featureId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove feature');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiers'] });
    },
  });

  const handleAddFeature = (feature: TierFeature) => {
    if (selectedTier) {
      addFeatureMutation.mutate({
        tierId: selectedTier.tierId,
        feature,
      });
    }
  };

  const handleRemoveFeature = (featureId: string) => {
    if (selectedTier) {
      removeFeatureMutation.mutate({
        tierId: selectedTier.tierId,
        featureId,
      });
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading tiers...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tier Management</h1>
        <p className="text-gray-600 mt-1">
          Manage subscription tiers and their features
        </p>
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers?.map((tier) => (
          <div
            key={tier.tierId}
            className={`border-2 rounded-lg p-6 ${
              tier.isPremium ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
                {tier.isPremium && (
                  <span className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full mt-1">
                    Premium
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  ${tier.pricing.monthly || 0}
                </div>
                <div className="text-xs text-gray-500">/month</div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Features</h4>
              {tier.features.length > 0 ? (
                <div className="space-y-2">
                  {tier.features.map((feature) => (
                    <div
                      key={feature.featureId}
                      className="flex items-center justify-between bg-white rounded p-2"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {feature.name}
                        </div>
                        <div className="text-xs text-gray-500">{feature.description}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveFeature(feature.featureId)}
                        className="ml-2 text-red-600 hover:text-red-800"
                        title="Remove feature"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">No features added</div>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedTier(tier);
                setShowAddFeatureModal(true);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Add Feature
            </button>
          </div>
        ))}
      </div>

      {/* Add Feature Modal */}
      {showAddFeatureModal && selectedTier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Add Feature to {selectedTier.name}
              </h2>
              <button
                onClick={() => setShowAddFeatureModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {AVAILABLE_FEATURES.filter(
                (f) => !selectedTier.features.some((tf) => tf.featureId === f.featureId)
              ).map((feature) => (
                <div
                  key={feature.featureId}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleAddFeature(feature)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{feature.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                      {feature.limits && (
                        <div className="text-xs text-gray-500 mt-2">
                          Limits: {JSON.stringify(feature.limits)}
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <span className="text-blue-600">+ Add</span>
                    </div>
                  </div>
                </div>
              ))}

              {AVAILABLE_FEATURES.filter(
                (f) => !selectedTier.features.some((tf) => tf.featureId === f.featureId)
              ).length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  All available features have been added to this tier
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
