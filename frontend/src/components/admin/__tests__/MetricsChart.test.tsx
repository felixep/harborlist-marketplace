import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import MetricsChart from '../MetricsChart';
import { MetricDataPoint } from '../../../hooks/useSystemMetrics';

describe('MetricsChart', () => {
  const mockData: MetricDataPoint[] = [
    { timestamp: '2023-01-01T12:00:00Z', value: 100 },
    { timestamp: '2023-01-01T12:01:00Z', value: 120 },
    { timestamp: '2023-01-01T12:02:00Z', value: 110 },
    { timestamp: '2023-01-01T12:03:00Z', value: 130 }
  ];

  it('should render chart with title and current value', () => {
    render(
      <MetricsChart
        title="API Response Time"
        data={mockData}
        type="line"
        unit="ms"
        color="#3B82F6"
      />
    );

    expect(screen.getByText('API Response Time')).toBeInTheDocument();
    expect(screen.getByText('130ms')).toBeInTheDocument(); // Current value (last data point)
  });

  it('should show percentage change when data changes', () => {
    render(
      <MetricsChart
        title="Memory Usage"
        data={mockData}
        type="area"
        unit="%"
        color="#10B981"
      />
    );

    // Should show change from previous value (110 to 130 = +18.2%)
    expect(screen.getByText('18.2%')).toBeInTheDocument();
  });

  it('should handle empty data gracefully', () => {
    render(
      <MetricsChart
        title="Empty Chart"
        data={[]}
        type="line"
        unit="ms"
        color="#3B82F6"
      />
    );

    expect(screen.getByText('Empty Chart')).toBeInTheDocument();
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should format values correctly for different units', () => {
    const { rerender } = render(
      <MetricsChart
        title="Response Time"
        data={[{ timestamp: '2023-01-01T12:00:00Z', value: 1500 }]}
        type="line"
        unit="ms"
        color="#3B82F6"
      />
    );

    // Should format as seconds when > 1000ms
    expect(screen.getByText('1.50s')).toBeInTheDocument();

    rerender(
      <MetricsChart
        title="Memory Usage"
        data={[{ timestamp: '2023-01-01T12:00:00Z', value: 65.7 }]}
        type="area"
        unit="%"
        color="#10B981"
      />
    );

    // Should format percentage with one decimal
    expect(screen.getByText('65.7%')).toBeInTheDocument();
  });

  it('should render different chart types', () => {
    const { rerender } = render(
      <MetricsChart
        title="Line Chart"
        data={mockData}
        type="line"
        unit="ms"
        color="#3B82F6"
      />
    );

    // Check for SVG element (chart container)
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();

    rerender(
      <MetricsChart
        title="Area Chart"
        data={mockData}
        type="area"
        unit="%"
        color="#10B981"
      />
    );

    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();

    rerender(
      <MetricsChart
        title="Bar Chart"
        data={mockData}
        type="bar"
        unit="%"
        color="#EF4444"
      />
    );

    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('should show time range labels', () => {
    render(
      <MetricsChart
        title="Test Chart"
        data={mockData}
        type="line"
        unit="ms"
        color="#3B82F6"
      />
    );

    // Should show first and last timestamps
    expect(screen.getByText('12:00:00 PM')).toBeInTheDocument();
    expect(screen.getByText('12:03:00 PM')).toBeInTheDocument();
  });

  it('should handle single data point', () => {
    const singleDataPoint = [{ timestamp: '2023-01-01T12:00:00Z', value: 100 }];

    render(
      <MetricsChart
        title="Single Point"
        data={singleDataPoint}
        type="line"
        unit="ms"
        color="#3B82F6"
      />
    );

    expect(screen.getByText('100ms')).toBeInTheDocument();
    // Should not show percentage change for single data point
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });

  it('should apply custom height', () => {
    render(
      <MetricsChart
        title="Custom Height"
        data={mockData}
        type="line"
        unit="ms"
        color="#3B82F6"
        height={300}
      />
    );

    const svg = screen.getByRole('img', { hidden: true });
    expect(svg).toHaveAttribute('height', '300');
  });

  it('should show trend indicators correctly', () => {
    const increasingData: MetricDataPoint[] = [
      { timestamp: '2023-01-01T12:00:00Z', value: 100 },
      { timestamp: '2023-01-01T12:01:00Z', value: 120 }
    ];

    const decreasingData: MetricDataPoint[] = [
      { timestamp: '2023-01-01T12:00:00Z', value: 120 },
      { timestamp: '2023-01-01T12:01:00Z', value: 100 }
    ];

    const { rerender } = render(
      <MetricsChart
        title="Increasing"
        data={increasingData}
        type="line"
        unit="ms"
        color="#3B82F6"
      />
    );

    // Should show red (bad) trend for increasing response time
    expect(screen.getByText('20.0%')).toHaveClass('text-red-600');

    rerender(
      <MetricsChart
        title="Decreasing"
        data={decreasingData}
        type="line"
        unit="ms"
        color="#3B82F6"
      />
    );

    // Should show green (good) trend for decreasing response time
    expect(screen.getByText('16.7%')).toHaveClass('text-green-600');
  });
});