import React, { useState, useEffect } from 'react';
import { AdminUser, ModerationWorkflow } from '@harborlist/shared-types';
import { adminApi } from '../../services/adminApi';

interface ModerationWorkloadBalancerProps {
  moderators: AdminUser[];
  onRebalance?: () => void;
  className?: string;
}

interface WorkloadData {
  moderatorId: string;
  moderatorName: string;
  currentLoad: number;
  capacity: number;
  utilizationRate: number;
  averageReviewTime: number;
  pendingItems: number;
  completedToday: number;
  status: 'available' | 'busy' | 'overloaded' | 'offline';
}

const ModerationWorkloadBalancer: React.FC<ModerationWorkloadBalancerProps> = ({
  moderators,
  onRebalance,
  className = ''
}) => {
  const [workloadData, setWorkloadData] = useState<WorkloadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [rebalancing, setRebalancing] = useState(false);
  const [autoBalance, setAutoBalance] = useState(false);

  useEffect(() => {
    loadWorkloadData();
  }, [moderators]);

  const loadWorkloadData = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getModerationWorkload();
      setWorkloadData(response.workload || []);
    } catch (err) {
      console.error('Failed to load workload data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRebalance = async () => {
    try {
      setRebalancing(true);
      await adminApi.rebalanceModerationWorkload();
      await loadWorkloadData();
      onRebalance?.();
    } catch (err) {
      console.error('Failed to rebalance workload:', err);
    } finally {
      setRebalancing(false);
    }
  };

  const handleAutoBalanceToggle = async (enabled: boolean) => {
    try {
      await adminApi.setAutoBalanceMode(enabled);
      setAutoBalance(enabled);
    } catch (err) {
      console.error('Failed to toggle auto-balance:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'overloaded': return 'bg-red-100 text-red-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUtilizationColor = (rate: number) => {
    if (rate < 50) return 'bg-green-500';
    if (rate < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Workload Balancer</h3>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoBalance}
                onChange={(e) => handleAutoBalanceToggle(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Auto-balance</span>
            </label>
            <button
              onClick={handleRebalance}
              disabled={rebalancing}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {rebalancing ? 'Rebalancing...' : 'Rebalance Now'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {workloadData.map((moderator) => (
            <div key={moderator.moderatorId} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <h4 className="font-medium text-gray-900">{moderator.moderatorName}</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(moderator.status)}`}>
                    {moderator.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {moderator.completedToday} completed today
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                <div>
                  <div className="text-sm text-gray-500">Current Load</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {moderator.currentLoad} / {moderator.capacity}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Utilization</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {moderator.utilizationRate}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Avg Review Time</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {moderator.averageReviewTime}min
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Pending Items</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {moderator.pendingItems}
                  </div>
                </div>
              </div>

              {/* Utilization Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getUtilizationColor(moderator.utilizationRate)}`}
                  style={{ width: `${Math.min(moderator.utilizationRate, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          ))}
        </div>

        {workloadData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No moderator workload data available
          </div>
        )}
      </div>
    </div>
  );
};

export default ModerationWorkloadBalancer;