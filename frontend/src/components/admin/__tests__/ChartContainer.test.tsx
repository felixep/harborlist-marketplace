import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ChartContainer from '../ChartContainer';
import { ChartData } from '../../../types/admin';

describe('ChartContainer', () => {
  const mockChartData: ChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [{
      label: 'Test Data',
      data: [10, 20, 30, 40, 50],
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'rgb(59, 130, 246)',
    }]
  };

  it('renders chart container with title', () => {
    render(
      <ChartContainer
        title="Test Chart"
        data={mockChartData}
        type="line"
      />
    );
    
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    // Check for canvas element instead of mocked chart
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    const { container } = render(
      <ChartContainer
        title="Test Chart"
        data={mockChartData}
        type="line"
        loading={true}
      />
    );
    
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders different chart types', () => {
    const { rerender } = render(
      <ChartContainer
        title="Line Chart"
        data={mockChartData}
        type="line"
      />
    );
    
    expect(screen.getByRole('img')).toBeInTheDocument();
    
    rerender(
      <ChartContainer
        title="Bar Chart"
        data={mockChartData}
        type="bar"
      />
    );
    
    expect(screen.getByRole('img')).toBeInTheDocument();
    
    rerender(
      <ChartContainer
        title="Doughnut Chart"
        data={mockChartData}
        type="doughnut"
      />
    );
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('applies custom height', () => {
    const { container } = render(
      <ChartContainer
        title="Height Test"
        data={mockChartData}
        type="line"
        height={400}
      />
    );
    
    const chartWrapper = container.querySelector('[style*="height: 400px"]');
    expect(chartWrapper).toBeInTheDocument();
  });

  it('uses default height when not specified', () => {
    const { container } = render(
      <ChartContainer
        title="Default Height"
        data={mockChartData}
        type="line"
      />
    );
    
    const chartWrapper = container.querySelector('[style*="height: 300px"]');
    expect(chartWrapper).toBeInTheDocument();
  });

  it('renders chart container structure', () => {
    const { container } = render(
      <ChartContainer
        title="Structure Test"
        data={mockChartData}
        type="line"
      />
    );
    
    // Check for the main container
    expect(container.querySelector('.bg-white.p-6.rounded-lg.shadow')).toBeInTheDocument();
    
    // Check for title
    expect(screen.getByText('Structure Test')).toBeInTheDocument();
    
    // Check for chart wrapper div
    const chartWrapper = container.querySelector('[style*="height"]');
    expect(chartWrapper).toBeInTheDocument();
  });
});