import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ModerationAnalytics from '../ModerationAnalytics';
import { adminApi } from '../../../services/adminApi';

// Mock the adminApi
vi.mock('../../../services/adminApi', () => ({
  adminApi: {
    getModerationStats: vi.fn(),
    getModeratorPerformance: vi.fn(),
    getModerationQualityMetrics: vi.fn()
  }
}));

// Mock the chart components
vi.mock('../AnalyticsChart', () => ({
  default: function MockAnalyticsChart({ type, data }: any) {
    return <div data-testid={`chart-${type}`}>Mock Chart: {JSON.stringify(data)}</div>;
  }
}));

vi.mock('../MetricCard', () => ({
  default: function MockMetricCard({ title, value, color }: any) {
    return <div data-testid="metric-card" className={`metric-${color}`}>{title}: {value}</div>;
  }
}));

const mockStats = {
  totalFlagged: 150,
  pendingReview: 25,
  approvedToday: 45,
  rejectedToday: 8,
  averageReviewTime: 2.5,
  queueBacklog: 30,
  slaCompliance: 92,
  flagTypeBreakdown: [
    { type: 'inappropriate', count: 60, percentage: 40 },
    { type: 'spam', count: 45, percentage: 30 },
    { type: 'fraud', count: 30, percentage: 20 },
    { type: 'duplicate', count: 15, percentage: 10 }
  ]
};

const mockModeratorPerformance = {
  moderators: [
    {
      moderatorId: 'mod1',
      moderatorName: 'Alice Johnson',
      assignedItems: 15,
      completedToday: 8,
      completedThisWeek: 35,
      completedThisMonth: 120,
      averageReviewTime: 12,
      accuracyScore: 95,
      workloadBalance: 'medium'
    },
    {
      moderatorId: 'mod2',
      moderatorName: 'Bob Smith',
      assignedItems: 20,
      completedToday: 12,
      completedThisWeek: 48,
      completedThisMonth: 180,
      averageReviewTime: 8,
      accuracyScore: 98,
      workloadBalance: 'high'
    }
  ]
};

const mockQualityMetrics = {
  totalReviews: 500,
  appealedDecisions: 12,
  overturnedDecisions: 3,
  averageConfidenceScore: 4.2,
  consistencyScore: 88
};

describe('ModerationAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (adminApi.getModerationStats as any).mockResolvedValue(mockStats);
    (adminApi.getModeratorPerformance as any).mockResolvedValue(mockModeratorPerformance);
    (adminApi.getModerationQualityMetrics as any).mockResolvedValue(mockQualityMetrics);
  });

  it('renders loading state initially', () => {
    render(<ModerationAnalytics />);
    
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('loads and displays analytics data', async () => {
    render(<ModerationAnalytics />);
    
    await waitFor(() => {
      expect(screen.getByText('Moderation Analytics')).toBeInTheDocument();
    });

    // Check if metric cards are displayed
    expect(screen.getByText('Queue Backlog: 30')).toBeInTheDocument();
    expect(screen.getByText('Avg Review Time: 2.5h')).toBeInTheDocument();
    expect(screen.getByText('SLA Compliance: 92%')).toBeInTheDocument();
    expect(screen.getByText('Approved Today: 45')).toBeInTheDocument();
  });

  it('displays moderator performance table', async () => {
    render(<ModerationAnalytics />);
    
    await waitFor(() => {
      expect(screen.getByText('Moderator Workload & Performance')).toBeInTheDocument();
    });

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument(); // Accuracy score
    expect(screen.getByText('98%')).toBeInTheDocument(); // Accuracy score
  });

  it('displays quality assurance metrics', async () => {
    render(<ModerationAnalytics />);
    
    await waitFor(() => {
      expect(screen.getByText('Quality Assurance')).toBeInTheDocument();
    });

    expect(screen.getByText('500')).toBeInTheDocument(); // Total reviews
    expect(screen.getByText('12')).toBeInTheDocument(); // Appealed decisions
    expect(screen.getByText('3')).toBeInTheDocument(); // Overturned decisions
    expect(screen.getByText('88%')).toBeInTheDocument(); // Consistency score
  });

  it('handles date range changes', async () => {
    render(<ModerationAnalytics />);
    
    await waitFor(() => {
      expect(screen.getByText('Moderation Analytics')).toBeInTheDocument();
    });

    const startDateInput = screen.getByLabelText('From:');
    const endDateInput = screen.getByLabelText('To:');
    
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });
    
    await waitFor(() => {
      expect(adminApi.getModeratorPerformance).toHaveBeenCalledWith({
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        moderatorId: undefined
      });
    });
  });

  it('handles moderator filter changes', async () => {
    render(<ModerationAnalytics />);
    
    await waitFor(() => {
      expect(screen.getByText('Moderation Analytics')).toBeInTheDocument();
    });

    const moderatorSelect = screen.getByDisplayValue('All Moderators');
    fireEvent.change(moderatorSelect, { target: { value: 'mod1' } });
    
    await waitFor(() => {
      expect(adminApi.getModeratorPerformance).toHaveBeenCalledWith({
        dateRange: expect.any(Object),
        moderatorId: 'mod1'
      });
    });
  });

  it('displays charts when data is available', async () => {
    render(<ModerationAnalytics />);
    
    await waitFor(() => {
      expect(screen.getByText('Moderator Performance')).toBeInTheDocument();
    });

    expect(screen.getByTestId('chart-bar')).toBeInTheDocument();
    expect(screen.getByTestId('chart-doughnut')).toBeInTheDocument();
  });

  it('shows empty state when no performance data', async () => {
    (adminApi.getModeratorPerformance as any).mockResolvedValue({ moderators: [] });
    
    render(<ModerationAnalytics />);
    
    await waitFor(() => {
      expect(screen.getByText('No performance data available')).toBeInTheDocument();
    });
  });

  it('shows empty state when no flag data', async () => {
    (adminApi.getModerationStats as any).mockResolvedValue({ 
      ...mockStats, 
      flagTypeBreakdown: [] 
    });
    
    render(<ModerationAnalytics />);
    
    await waitFor(() => {
      expect(screen.getByText('No flag data available')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (adminApi.getModerationStats as any).mockRejectedValue(new Error('API Error'));
    
    render(<ModerationAnalytics />);
    
    await waitFor(() => {
      expect(screen.getByText('Error loading analytics')).toBeInTheDocument();
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });

    // Should show retry button
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
  });

  it('retries loading data when retry button is clicked', async () => {
    (adminApi.getModerationStats as any)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockStats);
    
    render(<ModerationAnalytics />);
    
    await waitFor(() => {
      expect(screen.getByText('Error loading analytics')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    
    await waitFor(() => {
      expect(screen.getByText('Moderation Analytics')).toBeInTheDocument();
    });
  });

  it('displays workload balance indicators correctly', async () => {
    render(<ModerationAnalytics />);
    
    await waitFor(() => {
      expect(screen.getByText('medium')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
    });
  });

  it('shows correct metric card colors based on values', async () => {
    render(<ModerationAnalytics />);
    
    await waitFor(() => {
      // Queue backlog should be green (under 50)
      const queueBacklogCard = screen.getByText('Queue Backlog: 30');
      expect(queueBacklogCard).toHaveClass('metric-green');
      
      // SLA compliance should be green (over 90%)
      const slaCard = screen.getByText('SLA Compliance: 92%');
      expect(slaCard).toHaveClass('metric-green');
    });
  });

  it('formats time values correctly', async () => {
    render(<ModerationAnalytics />);
    
    await waitFor(() => {
      expect(screen.getByText('12min')).toBeInTheDocument(); // Average review time
      expect(screen.getByText('8min')).toBeInTheDocument(); // Average review time
    });
  });

  it('updates moderator dropdown with performance data', async () => {
    render(<ModerationAnalytics />);
    
    await waitFor(() => {
      const moderatorSelect = screen.getByDisplayValue('All Moderators');
      fireEvent.click(moderatorSelect);
      
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });
});