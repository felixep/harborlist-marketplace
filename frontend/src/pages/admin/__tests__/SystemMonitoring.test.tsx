import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import SystemMonitoring from '../SystemMonitoring';

// Mock the hooks
const mockUseSystemHealth = vi.fn();
const mockUseSystemMetrics = vi.fn();
const mockUseSystemAlerts = vi.fn();

vi.mock('../../../hooks/useSystemHealth', () => ({
  useSystemHealth: mockUseSystemHealth
}));

vi.mock('../../../hooks/useSystemMetrics', () => ({
  useSystemMetrics: mockUseSystemMetrics
}));

vi.mock('../../../hooks/useSystemAlerts', () => ({
  useSystemAlerts: mockUseSystemAlerts
}));

// Mock the components
vi.mock('../../../components/admin/HealthCheckCard', () => ({
  default: ({ healthCheck }: any) => <div data-testid="health-check-card">{healthCheck.service}</div>
}));

vi.mock('../../../components/admin/MetricsChart', () => ({
  default: ({ title }: any) => <div data-testid="metrics-chart">{title}</div>
}));

vi.mock('../../../components/admin/AlertPanel', () => ({
  default: ({ alerts, onAcknowledge }: any) => (
    <div data-testid="alert-panel">
      {alerts.map((alert: any) => (
        <div key={alert.id}>
          <span>{alert.title}</span>
          <button onClick={() => onAcknowledge(alert.id)}>Acknowledge</button>
        </div>
      ))}
    </div>
  )
}));

vi.mock('../../../components/admin/ErrorTrackingPanel', () => ({
  default: () => <div data-testid="error-tracking-panel">Error Tracking</div>
}));

describe('SystemMonitoring', () => {
  const mockHealthChecks = [
    {
      service: 'Database',
      status: 'healthy' as const,
      responseTime: 150,
      lastCheck: '2023-01-01T12:00:00Z',
      message: 'Database is responding normally'
    },
    {
      service: 'API Gateway',
      status: 'degraded' as const,
      responseTime: 500,
      lastCheck: '2023-01-01T12:00:00Z',
      message: 'High response times detected'
    }
  ];

  const mockMetrics = {
    responseTime: [
      { timestamp: '2023-01-01T12:00:00Z', value: 150 },
      { timestamp: '2023-01-01T12:01:00Z', value: 160 }
    ],
    memoryUsage: [
      { timestamp: '2023-01-01T12:00:00Z', value: 65 },
      { timestamp: '2023-01-01T12:01:00Z', value: 67 }
    ],
    cpuUsage: [
      { timestamp: '2023-01-01T12:00:00Z', value: 45 },
      { timestamp: '2023-01-01T12:01:00Z', value: 47 }
    ],
    errorRate: [
      { timestamp: '2023-01-01T12:00:00Z', value: 0.5 },
      { timestamp: '2023-01-01T12:01:00Z', value: 0.3 }
    ],
    uptime: 3600,
    activeConnections: 75,
    requestsPerMinute: 350
  };

  const mockAlerts = [
    {
      id: 'alert-1',
      type: 'warning' as const,
      title: 'High Memory Usage',
      message: 'Memory usage has exceeded 80%',
      service: 'API Gateway',
      createdAt: '2023-01-01T12:00:00Z',
      resolved: false
    }
  ];

  const mockRefetchHealth = vi.fn();
  const mockAcknowledgeAlert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSystemHealth.mockReturnValue({
      healthChecks: mockHealthChecks,
      overallStatus: 'degraded',
      loading: false,
      error: null,
      refetch: mockRefetchHealth
    });

    mockUseSystemMetrics.mockReturnValue({
      metrics: mockMetrics,
      loading: false,
      error: null,
      refetch: vi.fn()
    });

    mockUseSystemAlerts.mockReturnValue({
      alerts: mockAlerts,
      loading: false,
      error: null,
      acknowledgeAlert: mockAcknowledgeAlert,
      resolveAlert: vi.fn(),
      refetch: vi.fn()
    });
  });

  it('should render system monitoring dashboard', () => {
    render(<SystemMonitoring />);

    expect(screen.getByText('System Monitoring')).toBeInTheDocument();
    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('Active Alerts')).toBeInTheDocument();
    expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    expect(screen.getByText('Error Tracking')).toBeInTheDocument();
  });

  it('should render health check cards', () => {
    render(<SystemMonitoring />);

    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('API Gateway')).toBeInTheDocument();
  });

  it('should render metrics charts', () => {
    render(<SystemMonitoring />);

    expect(screen.getByText('API Response Time')).toBeInTheDocument();
    expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    expect(screen.getByText('CPU Usage')).toBeInTheDocument();
    expect(screen.getByText('Error Rate')).toBeInTheDocument();
  });

  it('should render alerts when present', () => {
    render(<SystemMonitoring />);

    expect(screen.getByText('High Memory Usage')).toBeInTheDocument();
  });

  it('should not render alerts section when no alerts', () => {
    mockUseSystemAlerts.mockReturnValue({
      alerts: [],
      loading: false,
      error: null,
      acknowledgeAlert: mockAcknowledgeAlert,
      resolveAlert: vi.fn(),
      refetch: vi.fn()
    });

    render(<SystemMonitoring />);

    expect(screen.queryByText('Active Alerts')).not.toBeInTheDocument();
  });

  it('should handle refresh interval change', () => {
    render(<SystemMonitoring />);

    const refreshSelect = screen.getByDisplayValue('30 seconds');
    fireEvent.change(refreshSelect, { target: { value: '10000' } });

    expect(refreshSelect).toHaveValue('10000');
  });

  it('should call refetch when refresh button is clicked', () => {
    render(<SystemMonitoring />);

    const refreshButton = screen.getByText('Refresh Now');
    fireEvent.click(refreshButton);

    expect(mockRefetchHealth).toHaveBeenCalled();
  });

  it('should show loading state', () => {
    mockUseSystemHealth.mockReturnValue({
      healthChecks: [],
      overallStatus: 'healthy',
      loading: true,
      error: null,
      refetch: mockRefetchHealth
    });

    mockUseSystemMetrics.mockReturnValue({
      metrics: null,
      loading: true,
      error: null,
      refetch: vi.fn()
    });

    mockUseSystemAlerts.mockReturnValue({
      alerts: [],
      loading: true,
      error: null,
      acknowledgeAlert: mockAcknowledgeAlert,
      resolveAlert: vi.fn(),
      refetch: vi.fn()
    });

    render(<SystemMonitoring />);

    // Should show loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should show health error message', () => {
    mockUseSystemHealth.mockReturnValue({
      healthChecks: [],
      overallStatus: 'unhealthy',
      loading: false,
      error: 'Failed to load health checks',
      refetch: mockRefetchHealth
    });

    render(<SystemMonitoring />);

    expect(screen.getByText('Failed to load health checks: Failed to load health checks')).toBeInTheDocument();
  });

  it('should show metrics error message', () => {
    mockUseSystemMetrics.mockReturnValue({
      metrics: null,
      loading: false,
      error: 'Failed to load metrics',
      refetch: vi.fn()
    });

    render(<SystemMonitoring />);

    expect(screen.getByText('Failed to load metrics: Failed to load metrics')).toBeInTheDocument();
  });

  it('should pass acknowledge function to alert panel', async () => {
    mockAcknowledgeAlert.mockResolvedValue(undefined);

    render(<SystemMonitoring />);

    const acknowledgeButton = screen.getByText('Acknowledge');
    fireEvent.click(acknowledgeButton);

    expect(mockAcknowledgeAlert).toHaveBeenCalledWith('alert-1');
  });
});