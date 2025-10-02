import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useLoadingState, useMultipleLoadingStates } from '../useLoadingState';

describe('useLoadingState', () => {
  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useLoadingState());

    expect(result.current.state).toEqual({
      isLoading: false,
      error: null,
      progress: undefined
    });
  });

  it('initializes with custom loading state', () => {
    const { result } = renderHook(() => useLoadingState(true));

    expect(result.current.state.isLoading).toBe(true);
  });

  it('sets loading state', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.state.isLoading).toBe(true);
  });

  it('sets error state', () => {
    const { result } = renderHook(() => useLoadingState());
    const error = new Error('Test error');

    act(() => {
      result.current.setError(error);
    });

    expect(result.current.state.error).toBe(error);
  });

  it('sets progress state', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.setProgress(50);
    });

    expect(result.current.state.progress).toBe(50);
  });

  it('clamps progress between 0 and 100', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.setProgress(-10);
    });
    expect(result.current.state.progress).toBe(0);

    act(() => {
      result.current.setProgress(150);
    });
    expect(result.current.state.progress).toBe(100);
  });

  it('resets state', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.setLoading(true);
      result.current.setError(new Error('Test'));
      result.current.setProgress(50);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toEqual({
      isLoading: false,
      error: null,
      progress: undefined
    });
  });

  describe('executeAsync', () => {
    it('executes successful async operation', async () => {
      const { result } = renderHook(() => useLoadingState());
      const mockFn = vi.fn().mockResolvedValue('success');
      const onSuccess = vi.fn();

      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.executeAsync(mockFn, { onSuccess });
      });

      expect(mockFn).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith('success');
      expect(returnValue).toBe('success');
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBe(null);
    });

    it('handles async operation error', async () => {
      const { result } = renderHook(() => useLoadingState());
      const error = new Error('Test error');
      const mockFn = vi.fn().mockRejectedValue(error);
      const onError = vi.fn();

      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.executeAsync(mockFn, { onError });
      });

      expect(mockFn).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(error);
      expect(returnValue).toBe(null);
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBe(error);
    });

    it('calls onFinally callback', async () => {
      const { result } = renderHook(() => useLoadingState());
      const mockFn = vi.fn().mockResolvedValue('success');
      const onFinally = vi.fn();

      await act(async () => {
        await result.current.executeAsync(mockFn, { onFinally });
      });

      expect(onFinally).toHaveBeenCalled();
    });

    it('sets loading state during execution', async () => {
      const { result } = renderHook(() => useLoadingState());
      let isLoadingDuringExecution = false;
      
      const mockFn = vi.fn().mockImplementation(async () => {
        isLoadingDuringExecution = result.current.state.isLoading;
        return 'success';
      });

      await act(async () => {
        await result.current.executeAsync(mockFn);
      });

      expect(isLoadingDuringExecution).toBe(true);
      expect(result.current.state.isLoading).toBe(false);
    });

    it('cancels previous operation when new one starts', async () => {
      const { result } = renderHook(() => useLoadingState());
      
      const firstOperation = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('first'), 100))
      );
      const secondOperation = vi.fn().mockResolvedValue('second');

      // Start first operation
      const firstPromise = act(async () => {
        return result.current.executeAsync(firstOperation);
      });

      // Start second operation before first completes
      const secondPromise = act(async () => {
        return result.current.executeAsync(secondOperation);
      });

      const [firstResult, secondResult] = await Promise.all([firstPromise, secondPromise]);

      expect(firstResult).toBe(null); // Cancelled
      expect(secondResult).toBe('second');
    });
  });
});

describe('useMultipleLoadingStates', () => {
  it('initializes with empty states', () => {
    const { result } = renderHook(() => useMultipleLoadingStates());

    expect(result.current.states).toEqual({});
    expect(result.current.isAnyLoading()).toBe(false);
    expect(result.current.hasAnyError()).toBe(false);
  });

  it('gets state for key', () => {
    const { result } = renderHook(() => useMultipleLoadingStates());

    const state = result.current.getState('test-key');
    expect(state).toEqual({
      isLoading: false,
      error: null
    });
  });

  it('sets loading state for key', () => {
    const { result } = renderHook(() => useMultipleLoadingStates());

    act(() => {
      result.current.setLoading('test-key', true);
    });

    expect(result.current.getState('test-key').isLoading).toBe(true);
    expect(result.current.isAnyLoading()).toBe(true);
  });

  it('sets error state for key', () => {
    const { result } = renderHook(() => useMultipleLoadingStates());
    const error = new Error('Test error');

    act(() => {
      result.current.setError('test-key', error);
    });

    expect(result.current.getState('test-key').error).toBe(error);
    expect(result.current.hasAnyError()).toBe(true);
  });

  it('sets progress for key', () => {
    const { result } = renderHook(() => useMultipleLoadingStates());

    act(() => {
      result.current.setProgress('test-key', 75);
    });

    expect(result.current.getState('test-key').progress).toBe(75);
  });

  it('resets specific key', () => {
    const { result } = renderHook(() => useMultipleLoadingStates());

    act(() => {
      result.current.setLoading('test-key', true);
      result.current.setError('test-key', new Error('Test'));
    });

    act(() => {
      result.current.reset('test-key');
    });

    expect(result.current.states['test-key']).toBeUndefined();
  });

  it('resets all states', () => {
    const { result } = renderHook(() => useMultipleLoadingStates());

    act(() => {
      result.current.setLoading('key1', true);
      result.current.setLoading('key2', true);
    });

    act(() => {
      result.current.resetAll();
    });

    expect(result.current.states).toEqual({});
    expect(result.current.isAnyLoading()).toBe(false);
  });

  it('detects any loading state', () => {
    const { result } = renderHook(() => useMultipleLoadingStates());

    act(() => {
      result.current.setLoading('key1', false);
      result.current.setLoading('key2', true);
    });

    expect(result.current.isAnyLoading()).toBe(true);
  });

  it('detects any error state', () => {
    const { result } = renderHook(() => useMultipleLoadingStates());

    act(() => {
      result.current.setError('key1', null);
      result.current.setError('key2', new Error('Test'));
    });

    expect(result.current.hasAnyError()).toBe(true);
  });
});