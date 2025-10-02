import React from 'react';
import { MetricCardData } from '@harborlist/shared-types';

interface MetricCardProps {
  data: MetricCardData;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ data, loading = false }) => {
  const { title, value, change, trend, icon, color } = data;

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'text-blue-600 bg-blue-50',
      green: 'text-green-600 bg-green-50',
      yellow: 'text-yellow-600 bg-yellow-50',
      red: 'text-red-600 bg-red-50',
      purple: 'text-purple-600 bg-purple-50',
      indigo: 'text-indigo-600 bg-indigo-50',
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return '↗️';
      case 'down':
        return '↘️';
      case 'stable':
        return '→';
      default:
        return '';
    }
  };

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-8 w-8 bg-gray-200 rounded"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-20"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <div className={`p-2 rounded-lg ${getColorClasses(color)}`}>
          <span className="text-xl">{icon}</span>
        </div>
      </div>
      
      <div className="flex items-baseline justify-between">
        <p className={`text-2xl font-bold ${getColorClasses(color).split(' ')[0]}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        
        {change !== undefined && (
          <div className={`flex items-center text-sm ${getTrendColor(trend)}`}>
            <span className="mr-1">{getTrendIcon(trend)}</span>
            <span>
              {change > 0 ? '+' : ''}{change}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;