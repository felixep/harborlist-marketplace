import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AlertPanel from '../AlertPanel';
import { SystemAlert } from '../../../hooks/useSystemAlerts';

describe('AlertPanel', () => {
  const mockAlerts: SystemAlert[] = [
    {
      id: 'alert-1',
      type: 'critical',
      title: 'Database Connection Timeout',
      message: 'Database queries are timing out frequently',
      service: 'Database',
      threshold: {
        metric: 'response_time',
        value: 5000,
        operator: '>'
      },
      createdAt: '2023-01-01T12:00:00Z',
      resolved: false
    },
    {
      id: 'alert-2',
      type: 'warning',
      title: 'High Memory Usage',
      message: 'Memory usage has exceeded 80% for the last 10 minutes',
      service: 'API Gateway',
      createdAt: '2023-01-01T11:50:00Z',
      acknowledgedAt: '2023-01-01T12:05:00Z',
      resolved: false
    }
  ];

  const mockOnAcknowledge = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Date.now for consistent time formatting
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2023-01-01T12:10:00Z').getTime());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render alerts correctly', () => {
    render(<AlertPanel alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} />);

    expect(screen.getByText('Database Connection Timeout')).toBeInTheDocument();
    expect(screen.getByText('High Memory Usage')).toBeInTheDocument();
    expect(screen.getByText('Database queries are timing out frequently')).toBeInTheDocument();
    expect(screen.getByText('Memory usage has exceeded 80% for the last 10 minutes')).toBeInTheDocument();
  });

  it('should show no alerts message when alerts array is empty', () => {
    render(<AlertPanel alerts={[]} onAcknowledge={mockOnAcknowledge} />);

    expect(screen.getByText('No active alerts')).toBeInTheDocument();
  });

  it('should display correct alert icons for different types', () => {
    render(<AlertPanel alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} />);

    // Critical alert should have red icon
    const criticalAlert = screen.getByText('Database Connection Timeout').closest('div');
    expect(criticalAlert).toHaveClass('bg-red-50', 'border-red-200');

    // Warning alert should have yellow icon
    const warningAlert = screen.getByText('High Memory Usage').closest('div');
    expect(warningAlert).toHaveClass('bg-yellow-50', 'border-yellow-200');
  });

  it('should show threshold information when available', () => {
    render(<AlertPanel alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} />);

    expect(screen.getByText('Threshold:')).toBeInTheDocument();
    expect(screen.getByText('response_time > 5000')).toBeInTheDocument();
  });

  it('should show acknowledge button for unacknowledged alerts', () => {
    render(<AlertPanel alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} />);

    const acknowledgeButtons = screen.getAllByText('Acknowledge');
    expect(acknowledgeButtons).toHaveLength(1); // Only one unacknowledged alert
  });

  it('should show acknowledged status for acknowledged alerts', () => {
    render(<AlertPanel alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} />);

    expect(screen.getByText('Acknowledged')).toBeInTheDocument();
  });

  it('should call onAcknowledge when acknowledge button is clicked', async () => {
    mockOnAcknowledge.mockResolvedValue(undefined);

    render(<AlertPanel alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} />);

    const acknowledgeButton = screen.getByText('Acknowledge');
    fireEvent.click(acknowledgeButton);

    expect(mockOnAcknowledge).toHaveBeenCalledWith('alert-1');
  });

  it('should show loading state while acknowledging', async () => {
    let resolveAcknowledge: () => void;
    const acknowledgePromise = new Promise<void>((resolve) => {
      resolveAcknowledge = resolve;
    });
    mockOnAcknowledge.mockReturnValue(acknowledgePromise);

    render(<AlertPanel alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} />);

    const acknowledgeButton = screen.getByText('Acknowledge');
    fireEvent.click(acknowledgeButton);

    expect(screen.getByText('Acknowledging...')).toBeInTheDocument();

    // Resolve the promise
    resolveAcknowledge!();
    await waitFor(() => {
      expect(screen.queryByText('Acknowledging...')).not.toBeInTheDocument();
    });
  });

  it('should handle acknowledge error gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
    mockOnAcknowledge.mockRejectedValue(new Error('Network error'));

    render(<AlertPanel alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} />);

    const acknowledgeButton = screen.getByText('Acknowledge');
    fireEvent.click(acknowledgeButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to acknowledge alert:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it('should format timestamps correctly', () => {
    render(<AlertPanel alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} />);

    // Should show "10m ago" for alert created at 12:00 when current time is 12:10
    expect(screen.getByText('10m ago')).toBeInTheDocument();
    // Should show "20m ago" for alert created at 11:50 when current time is 12:10
    expect(screen.getByText('20m ago')).toBeInTheDocument();
  });

  it('should show service names correctly', () => {
    render(<AlertPanel alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} />);

    expect(screen.getByText('(Database)')).toBeInTheDocument();
    expect(screen.getByText('(API Gateway)')).toBeInTheDocument();
  });

  it('should handle info type alerts', () => {
    const infoAlert: SystemAlert = {
      id: 'alert-3',
      type: 'info',
      title: 'System Update',
      message: 'System maintenance scheduled',
      service: 'System',
      createdAt: '2023-01-01T12:00:00Z',
      resolved: false
    };

    render(<AlertPanel alerts={[infoAlert]} onAcknowledge={mockOnAcknowledge} />);

    const alertCard = screen.getByText('System Update').closest('div');
    expect(alertCard).toHaveClass('bg-blue-50', 'border-blue-200');
  });
});