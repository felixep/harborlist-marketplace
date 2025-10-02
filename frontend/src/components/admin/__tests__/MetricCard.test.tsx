import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MetricCard from '../MetricCard';
import { MetricCardData } from '../../../types/admin';

describe('MetricCard', () => {
  const mockData: MetricCardData = {
    title: 'Total Users',
    value: 1250,
    change: 12.5,
    trend: 'up',
    icon: '👥',
    color: 'blue'
  };

  it('renders metric card with all data', () => {
    render(<MetricCard data={mockData} />);
    
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1,250')).toBeInTheDocument();
    expect(screen.getByText('👥')).toBeInTheDocument();
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
    expect(screen.getByText('↗️')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    const { container } = render(<MetricCard data={mockData} loading={true} />);
    
    expect(screen.queryByText('Total Users')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('handles string values', () => {
    const stringData: MetricCardData = {
      ...mockData,
      value: '99.9%'
    };
    
    render(<MetricCard data={stringData} />);
    expect(screen.getByText('99.9%')).toBeInTheDocument();
  });

  it('handles negative change with down trend', () => {
    const negativeData: MetricCardData = {
      ...mockData,
      change: -5.2,
      trend: 'down'
    };
    
    render(<MetricCard data={negativeData} />);
    expect(screen.getByText('-5.2%')).toBeInTheDocument();
    expect(screen.getByText('↘️')).toBeInTheDocument();
  });

  it('handles stable trend', () => {
    const stableData: MetricCardData = {
      ...mockData,
      change: 0,
      trend: 'stable'
    };
    
    render(<MetricCard data={stableData} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('→')).toBeInTheDocument();
  });

  it('handles data without change', () => {
    const noChangeData: MetricCardData = {
      title: 'System Status',
      value: 'Healthy',
      icon: '💚',
      color: 'green'
    };
    
    render(<MetricCard data={noChangeData} />);
    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });

  it('applies correct color classes', () => {
    const { container } = render(<MetricCard data={mockData} />);
    
    // Check if blue color classes are applied
    expect(container.querySelector('.text-blue-600')).toBeInTheDocument();
    expect(container.querySelector('.bg-blue-50')).toBeInTheDocument();
  });

  it('formats large numbers correctly', () => {
    const largeNumberData: MetricCardData = {
      ...mockData,
      value: 1234567
    };
    
    render(<MetricCard data={largeNumberData} />);
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });
});