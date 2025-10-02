import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import HealthCheckCard from '../HealthCheckCard';
import { HealthCheck } from '../../../hooks/useSystemHealth';

describe('HealthCheckCard', () => {
  const mockHealthyCheck: HealthCheck = {
    service: 'Database',
    status: 'healthy',
    responseTime: 150,
    lastCheck: '2023-01-01T12:00:00Z',
    message: 'Database is responding normally'
  };

  const mockDegradedCheck: HealthCheck = {
    service: 'API Gateway',
    status: 'degraded',
    responseTime: 500,
    lastCheck: '2023-01-01T12:00:00Z',
    message: 'High response times detected',
    details: {
      averageResponseTime: '450ms',
      errorRate: '2%'
    }
  };

  const mockUnhealthyCheck: HealthCheck = {
    service: 'Auth Service',
    status: 'unhealthy',
    responseTime: 5000,
    lastCheck: '2023-01-01T12:00:00Z',
    message: 'Service is not responding'
  };

  it('should render healthy service correctly', () => {
    render(<HealthCheckCard healthCheck={mockHealthyCheck} />);

    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('healthy')).toBeInTheDocument();
    expect(screen.getByText('150ms')).toBeInTheDocument();
    expect(screen.getByText('Database is responding normally')).toBeInTheDocument();
  });

  it('should render degraded service correctly', () => {
    render(<HealthCheckCard healthCheck={mockDegradedCheck} />);

    expect(screen.getByText('API Gateway')).toBeInTheDocument();
    expect(screen.getByText('degraded')).toBeInTheDocument();
    expect(screen.getByText('500ms')).toBeInTheDocument();
    expect(screen.getByText('High response times detected')).toBeInTheDocument();
  });

  it('should render unhealthy service correctly', () => {
    render(<HealthCheckCard healthCheck={mockUnhealthyCheck} />);

    expect(screen.getByText('Auth Service')).toBeInTheDocument();
    expect(screen.getByText('unhealthy')).toBeInTheDocument();
    expect(screen.getByText('5.00s')).toBeInTheDocument(); // Should format as seconds
    expect(screen.getByText('Service is not responding')).toBeInTheDocument();
  });

  it('should show details when available', () => {
    render(<HealthCheckCard healthCheck={mockDegradedCheck} />);

    // Check if details section is present
    expect(screen.getByText('View Details')).toBeInTheDocument();
  });

  it('should format response time correctly', () => {
    const fastCheck: HealthCheck = {
      ...mockHealthyCheck,
      responseTime: 50
    };

    const slowCheck: HealthCheck = {
      ...mockHealthyCheck,
      responseTime: 2500
    };

    const { rerender } = render(<HealthCheckCard healthCheck={fastCheck} />);
    expect(screen.getByText('50ms')).toBeInTheDocument();

    rerender(<HealthCheckCard healthCheck={slowCheck} />);
    expect(screen.getByText('2.50s')).toBeInTheDocument();
  });

  it('should apply correct styling for different statuses', () => {
    const { rerender } = render(<HealthCheckCard healthCheck={mockHealthyCheck} />);
    
    // Check for healthy styling (green)
    let card = screen.getByText('Database').closest('div');
    expect(card).toHaveClass('bg-green-100', 'text-green-800', 'border-green-200');

    rerender(<HealthCheckCard healthCheck={mockDegradedCheck} />);
    
    // Check for degraded styling (yellow)
    card = screen.getByText('API Gateway').closest('div');
    expect(card).toHaveClass('bg-yellow-100', 'text-yellow-800', 'border-yellow-200');

    rerender(<HealthCheckCard healthCheck={mockUnhealthyCheck} />);
    
    // Check for unhealthy styling (red)
    card = screen.getByText('Auth Service').closest('div');
    expect(card).toHaveClass('bg-red-100', 'text-red-800', 'border-red-200');
  });

  it('should format last check time correctly', () => {
    // Mock Date.now to return a fixed time
    const mockNow = new Date('2023-01-01T12:05:00Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(mockNow);

    const recentCheck: HealthCheck = {
      ...mockHealthyCheck,
      lastCheck: '2023-01-01T12:04:30Z' // 30 seconds ago
    };

    render(<HealthCheckCard healthCheck={recentCheck} />);
    expect(screen.getByText('30s ago')).toBeInTheDocument();

    vi.restoreAllMocks();
  });
});