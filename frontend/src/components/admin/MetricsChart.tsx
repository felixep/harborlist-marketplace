import React, { useMemo } from 'react';
import { MetricDataPoint } from '../../hooks/useSystemMetrics';

interface MetricsChartProps {
  title: string;
  data: MetricDataPoint[];
  type: 'line' | 'area' | 'bar';
  unit: string;
  color: string;
  height?: number;
}

const MetricsChart: React.FC<MetricsChartProps> = ({
  title,
  data,
  type,
  unit,
  color,
  height = 200
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue || 1;

    return data.map((point, index) => ({
      ...point,
      x: (index / (data.length - 1)) * 100,
      y: ((maxValue - point.value) / range) * 80 + 10, // 10% padding top/bottom
    }));
  }, [data]);

  const currentValue = data && data.length > 0 ? data[data.length - 1]?.value : 0;
  const previousValue = data && data.length > 1 ? data[data.length - 2]?.value : currentValue;
  const change = currentValue - previousValue;
  const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;

  const formatValue = (value: number) => {
    if (unit === '%') {
      return `${value.toFixed(1)}${unit}`;
    } else if (unit === 'ms') {
      return value < 1000 ? `${value.toFixed(0)}${unit}` : `${(value / 1000).toFixed(2)}s`;
    }
    return `${value.toFixed(1)}${unit}`;
  };

  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          No data available
        </div>
      );
    }

    const pathData = chartData.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');

    return (
      <svg width="100%" height={height} className="overflow-visible">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Chart area */}
        {type === 'area' && (
          <path
            d={`${pathData} L 100 90 L 0 90 Z`}
            fill={color}
            fillOpacity="0.2"
            stroke="none"
          />
        )}
        
        {type === 'bar' && chartData.map((point, index) => (
          <rect
            key={index}
            x={point.x - 1}
            y={point.y}
            width="2"
            height={90 - point.y}
            fill={color}
            fillOpacity="0.7"
          />
        ))}

        {(type === 'line' || type === 'area') && (
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {(type === 'line' || type === 'area') && chartData.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3"
            fill={color}
            className="hover:r-4 transition-all duration-200"
          >
            <title>{`${formatValue(point.value)} at ${new Date(point.timestamp).toLocaleTimeString()}`}</title>
          </circle>
        ))}
      </svg>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color }}>
            {formatValue(currentValue)}
          </div>
          {change !== 0 && (
            <div className={`text-sm flex items-center ${
              change > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {change > 0 ? (
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 4.414 6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 15.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {Math.abs(changePercent).toFixed(1)}%
            </div>
          )}
        </div>
      </div>
      
      <div className="relative" style={{ height }}>
        {renderChart()}
      </div>
      
      {data && data.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 flex justify-between">
          <span>{new Date(data[0].timestamp).toLocaleTimeString()}</span>
          <span>{new Date(data[data.length - 1].timestamp).toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
};

export default MetricsChart;