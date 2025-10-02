import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToastProvider, useToast } from '../ToastContext';

// Test component that uses the toast context
const TestComponent: React.FC = () => {
  const { 
    toasts, 
    addToast, 
    removeToast, 
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo
  } = useToast();

  return (
    <div>
      <div data-testid="toast-count">{toasts.length}</div>
      <button onClick={() => showSuccess('Success!', 'Success message')}>
        Show Success
      </button>
      <button onClick={() => showError('Error!', 'Error message')}>
        Show Error
      </button>
      <button onClick={() => showWarning('Warning!', 'Warning message')}>
        Show Warning
      </button>
      <button onClick={() => showInfo('Info!', 'Info message')}>
        Show Info
      </button>
      <button onClick={() => addToast({ type: 'info', title: 'Custom Toast' })}>
        Add Custom Toast
      </button>
      <button onClick={() => removeToast(toasts[0]?.id)}>
        Remove First Toast
      </button>
      <button onClick={clearAllToasts}>
        Clear All Toasts
      </button>
    </div>
  );
};

const renderWithProvider = (maxToasts = 5) => {
  return render(
    <ToastProvider maxToasts={maxToasts}>
      <TestComponent />
    </ToastProvider>
  );
};

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleSpy.mockRestore();
  });

  it('shows success toast', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Success'));

    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
  });

  it('shows error toast', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Error'));

    expect(screen.getByText('Error!')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
  });

  it('shows warning toast', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Warning'));

    expect(screen.getByText('Warning!')).toBeInTheDocument();
    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
  });

  it('shows info toast', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Info'));

    expect(screen.getByText('Info!')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
  });

  it('adds custom toast', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Add Custom Toast'));

    expect(screen.getByText('Custom Toast')).toBeInTheDocument();
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
  });

  it('removes specific toast', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

    fireEvent.click(screen.getByText('Remove First Toast'));
    expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
  });

  it('clears all toasts', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByTestId('toast-count')).toHaveTextContent('2');

    fireEvent.click(screen.getByText('Clear All Toasts'));
    expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
  });

  it('respects maxToasts limit', () => {
    renderWithProvider(2);

    // Add 3 toasts
    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    fireEvent.click(screen.getByText('Show Warning'));

    // Should only have 2 toasts (oldest removed)
    expect(screen.getByTestId('toast-count')).toHaveTextContent('2');
    expect(screen.queryByText('Success!')).not.toBeInTheDocument();
    expect(screen.getByText('Error!')).toBeInTheDocument();
    expect(screen.getByText('Warning!')).toBeInTheDocument();
  });

  it('auto-removes toasts after duration', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

    // Fast-forward past default duration (5000ms) + animation (300ms)
    act(() => {
      vi.advanceTimersByTime(5300);
    });

    expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
  });

  it('does not auto-remove persistent error toasts', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

    // Fast-forward past default duration
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Error toasts are persistent by default
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
  });

  it('generates unique IDs for toasts', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Success'));

    expect(screen.getByTestId('toast-count')).toHaveTextContent('2');
    expect(screen.getAllByText('Success!')).toHaveLength(2);
  });
});