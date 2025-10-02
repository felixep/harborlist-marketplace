import React, { useState } from 'react';
import { SystemAlert } from '../../hooks/useSystemAlerts';

interface AlertPanelProps {
  alerts: SystemAlert[];
  onAcknowledge: (alertId: string) => Promise<void>;
}

const AlertPanel: React.FC<AlertPanelProps> = ({ alerts, onAcknowledge }) => {
  const [acknowledgingAlerts, setAcknowledgingAlerts] = useState<Set<string>>(new Set());

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledgingAlerts(prev => new Set(prev).add(alertId));
    try {
      await onAcknowledge(alertId);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    } finally {
      setAcknowledgingAlerts(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getAlertBorderColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-green-800 font-medium">No active alerts</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`border rounded-lg p-4 ${getAlertBorderColor(alert.type)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {getAlertIcon(alert.type)}
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                  <span className="text-xs text-gray-500">({alert.service})</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                
                {alert.threshold && (
                  <div className="mt-2 text-xs text-gray-600">
                    <span className="font-medium">Threshold:</span> {alert.threshold.metric} {alert.threshold.operator} {alert.threshold.value}
                  </div>
                )}
                
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>Created: {formatTimestamp(alert.createdAt)}</span>
                  {alert.acknowledgedAt && (
                    <span>Acknowledged: {formatTimestamp(alert.acknowledgedAt)}</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {!alert.acknowledgedAt && (
                <button
                  onClick={() => handleAcknowledge(alert.id)}
                  disabled={acknowledgingAlerts.has(alert.id)}
                  className="px-3 py-1 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {acknowledgingAlerts.has(alert.id) ? 'Acknowledging...' : 'Acknowledge'}
                </button>
              )}
              
              {alert.acknowledgedAt && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                  Acknowledged
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlertPanel;