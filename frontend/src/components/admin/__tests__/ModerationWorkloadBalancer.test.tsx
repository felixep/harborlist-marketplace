import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ModerationWorkloadBalancer from '../ModerationWorkloadBalancer';
import { AdminUser } from '@harborlist/shared-types';
import { adminApi } from '../../../services/adminApi';

// Mock the adminApi
vi.mock('../../../services/adminApi', () => ({
  adminApi: {
    getModerationWorkload: vi.fn(),
    rebalanceModerationWorkload: vi.fn(),
    setAutoBalanceMode: vi.fn()
  }
}));

const mockModerators: AdminUser[] = [
  {
    id: 'mod1',
    email: 'alice@example.com',
    name: 'Alice Johnson',
    role: 'moderator' as any,
    status: 'active' as any,
    permissions: [],
    emailVerified: true,
    phoneVerified: false,
    mfaEnabled: false,
    loginAttempts: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'mod2',
    email: 'bob@example.com',
    name: 'Bob Smith',
    role: 'moderator' as any,
    status: 'active' as any,
    permissions: [],
    emailVerified: true,
    phoneVerified: false,
    mfaEnabled: false,
    loginAttempts: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockWorkloadData = {
  workload: [
    {
      moderatorId: 'mod1',
      moderatorName: 'Alice Johnson',
      currentLoad: 15,
      capacity: 20,
      utilizationRate: 75,
      averageReviewTime: 12,
      pendingItems: 5,
      completedToday: 8,
      status: 'busy'
    },
    {
      moderatorId: 'mod2',
      moderatorName: 'Bob Smith',
      currentLoad: 8,
      capacity: 20,
      utilizationRate: 40,
      averageReviewTime: 10,
      pendingItems: 3,
      completedToday: 12,
      status: 'available'
    }
  ]
};

const defaultProps = {
  moderators: mockModerators,
  onRebalance: vi.fn()
};

describe('ModerationWorkloadBalancer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (adminApi.getModerationWorkload as any).mockResolvedValue(mockWorkloadData);
    (adminApi.rebalanceModerationWorkload as any).mockResolvedValue({});
    (adminApi.setAutoBalanceMode as any).mockResolvedValue({});
  });

  it('renders loading state initially', () => {
    render(<ModerationWorkloadBalancer {...defaultProps} />);
    
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('loads and displays workload data', async () => {
    render(<ModerationWorkloadBalancer {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Workload Balancer')).toBeInTheDocument();
    });

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('15 / 20')).toBeInTheDocument(); // Current load
    expect(screen.getByText('8 / 20')).toBeInTheDocument(); // Current load
  });

  it('displays moderator status correctly', async () => {
    render(<ModerationWorkloadBalancer {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('busy')).toBeInTheDocument();
      expect(screen.getByText('available')).toBeInTheDocument();
    });
  });

  it('shows utilization rates and progress bars', async () => {
    render(<ModerationWorkloadBalancer {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument(); // Utilization rate
      expect(screen.getByText('40%')).toBeInTheDocument(); // Utilization rate
    });

    // Check for progress bars
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(2);
  });

  it('displays performance metrics', async () => {
    render(<ModerationWorkloadBalancer {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('12min')).toBeInTheDocument(); // Average review time
      expect(screen.getByText('10min')).toBeInTheDocument(); // Average review time
      expect(screen.getByText('5')).toBeInTheDocument(); // Pending items
      expect(screen.getByText('3')).toBeInTheDocument(); // Pending items
      expect(screen.getByText('8 completed today')).toBeInTheDocument();
      expect(screen.getByText('12 completed today')).toBeInTheDocument();
    });
  });

  it('handles auto-balance toggle', async () => {
    render(<ModerationWorkloadBalancer {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Workload Balancer')).toBeInTheDocument();
    });

    const autoBalanceCheckbox = screen.getByLabelText('Auto-balance');
    expect(autoBalanceCheckbox).not.toBeChecked();
    
    fireEvent.click(autoBalanceCheckbox);
    
    await waitFor(() => {
      expect(adminApi.setAutoBalanceMode).toHaveBeenCalledWith(true);
    });
  });

  it('handles manual rebalance', async () => {
    const onRebalance = vi.fn();
    render(<ModerationWorkloadBalancer {...defaultProps} onRebalance={onRebalance} />);
    
    await waitFor(() => {
      expect(screen.getByText('Workload Balancer')).toBeInTheDocument();
    });

    const rebalanceButton = screen.getByText('Rebalance Now');
    fireEvent.click(rebalanceButton);
    
    await waitFor(() => {
      expect(adminApi.rebalanceModerationWorkload).toHaveBeenCalled();
      expect(onRebalance).toHaveBeenCalled();
    });
  });

  it('shows loading state during rebalancing', async () => {
    (adminApi.rebalanceModerationWorkload as any).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<ModerationWorkloadBalancer {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Rebalance Now')).toBeInTheDocument();
    });

    const rebalanceButton = screen.getByText('Rebalance Now');
    fireEvent.click(rebalanceButton);
    
    expect(screen.getByText('Rebalancing...')).toBeInTheDocument();
    expect(rebalanceButton).toBeDisabled();
  });

  it('applies correct utilization bar colors', async () => {
    render(<ModerationWorkloadBalancer {...defaultProps} />);
    
    await waitFor(() => {
      const progressBars = document.querySelectorAll('.h-2.rounded-full');
      
      // First moderator (75% utilization) should have yellow color
      expect(progressBars[0]).toHaveClass('bg-yellow-500');
      
      // Second moderator (40% utilization) should have green color
      expect(progressBars[1]).toHaveClass('bg-green-500');
    });
  });

  it('shows empty state when no workload data', async () => {
    (adminApi.getModerationWorkload as any).mockResolvedValue({ workload: [] });
    
    render(<ModerationWorkloadBalancer {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No moderator workload data available')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (adminApi.getModerationWorkload as any).mockRejectedValue(new Error('API Error'));
    
    render(<ModerationWorkloadBalancer {...defaultProps} />);
    
    await waitFor(() => {
      // Should still show the component structure
      expect(screen.getByText('Workload Balancer')).toBeInTheDocument();
    });
  });

  it('displays status badges with correct colors', async () => {
    render(<ModerationWorkloadBalancer {...defaultProps} />);
    
    await waitFor(() => {
      const busyBadge = screen.getByText('busy');
      const availableBadge = screen.getByText('available');
      
      expect(busyBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
      expect(availableBadge).toHaveClass('bg-green-100', 'text-green-800');
    });
  });

  it('updates workload data after rebalancing', async () => {
    const updatedWorkloadData = {
      workload: [
        {
          ...mockWorkloadData.workload[0],
          currentLoad: 12,
          utilizationRate: 60
        },
        {
          ...mockWorkloadData.workload[1],
          currentLoad: 11,
          utilizationRate: 55
        }
      ]
    };

    (adminApi.getModerationWorkload as any)
      .mockResolvedValueOnce(mockWorkloadData)
      .mockResolvedValueOnce(updatedWorkloadData);
    
    render(<ModerationWorkloadBalancer {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    const rebalanceButton = screen.getByText('Rebalance Now');
    fireEvent.click(rebalanceButton);
    
    await waitFor(() => {
      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByText('55%')).toBeInTheDocument();
    });
  });

  it('handles rebalance errors', async () => {
    (adminApi.rebalanceModerationWorkload as any).mockRejectedValue(new Error('Rebalance failed'));
    
    render(<ModerationWorkloadBalancer {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Rebalance Now')).toBeInTheDocument();
    });

    const rebalanceButton = screen.getByText('Rebalance Now');
    fireEvent.click(rebalanceButton);
    
    await waitFor(() => {
      // Button should return to normal state
      expect(screen.getByText('Rebalance Now')).toBeInTheDocument();
      expect(rebalanceButton).not.toBeDisabled();
    });
  });

  it('handles auto-balance toggle errors', async () => {
    (adminApi.setAutoBalanceMode as any).mockRejectedValue(new Error('Toggle failed'));
    
    render(<ModerationWorkloadBalancer {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Workload Balancer')).toBeInTheDocument();
    });

    const autoBalanceCheckbox = screen.getByLabelText('Auto-balance');
    fireEvent.click(autoBalanceCheckbox);
    
    await waitFor(() => {
      // Checkbox should remain unchecked due to error
      expect(autoBalanceCheckbox).not.toBeChecked();
    });
  });
});