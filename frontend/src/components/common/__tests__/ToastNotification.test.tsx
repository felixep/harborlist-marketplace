import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToastNotification, Toast } from '../ToastNotification';

const mockOnClose = vi.fn();

const createMockToast = (overrides: Partial<Toast> = {}): Toast => ({
  id: 'test-toast-1',
  type: 'success',
  title: 'Test Title',
  message: 'Test message',
  duration: 5000,
  ...overrides
});

describe('ToastNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders success toast correctly', () => {
    const toast = createMockToast({ type: 'success' });
    render(<ToastNotification toast={toast} onClose={mockOnClose} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('renders error toast correctly', () => {
    const toast = createMockToast({ type: 'error' });
    render(<ToastNotification toast={toast} onClose={mockOnClose} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders warning toast correctly', () => {
    const toast = createMockToast({ type: 'warning' });
    render(<ToastNotification toast={toast} onClose={mockOnClose} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders info toast correctly', () => {
    const toast = createMockToast({ type: 'info' });
    render(<ToastNotification toast={toast} onClose={mockOnClose} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders toast without message', () => {
    const toast = createMockToast({ message: undefined });
    render(<ToastNotification toast={toast} onClose={mockOnClose} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
  });

  it('renders toast with action button', () => {
    const mockAction = vi.fn();
    const toast = createMockToast({
      action: {
        label: 'Retry',
        onClick: mockAction
      }
    });
    render(<ToastNotification toast={toast} onClose={mockOnClose} />);

    const actionButton = screen.getByRole('button', { name: 'Retry' });
    expect(actionButton).toBeInTheDocument();

    fireEvent.click(actionButton);
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const toast = createMockToast();
    render(<ToastNotification toast={toast} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    // Wait for exit animation
    vi.advanceTimersByTime(300);

    expect(mockOnClose).toHaveBeenCalledWith('test-toast-1');
  });

  it('auto-closes after duration', () => {
    const toast = createMockToast({ duration: 1000 });
    render(<ToastNotification toast={toast} onClose={mockOnClose} />);

    // Fast-forward time
    vi.advanceTimersByTime(1000);
    
    // Wait for exit animation
    vi.advanceTimersByTime(300);

    expect(mockOnClose).toHaveBeenCalledWith('test-toast-1');
  });

  it('does not auto-close when persistent', () => {
    const toast = createMockToast({ persistent: true, duration: 1000 });
    render(<ToastNotification toast={toast} onClose={mockOnClose} />);

    // Fast-forward time
    vi.advanceTimersByTime(2000);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('does not auto-close when duration is 0', () => {
    const toast = createMockToast({ duration: 0 });
    render(<ToastNotification toast={toast} onClose={mockOnClose} />);

    // Fast-forward time
    vi.advanceTimersByTime(10000);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    const toast = createMockToast();
    render(<ToastNotification toast={toast} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toHaveAttribute('type', 'button');
    
    // Check for screen reader text
    expect(screen.getByText('Close')).toHaveClass('sr-only');
  });
});