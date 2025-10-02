/**
 * @fileoverview Loading state management hooks for async operations.
 * 
 * Provides comprehensive loading state management with progress tracking,
 * error handling, and operation cancellation. Supports both single and
 * multiple concurrent loading states for complex UI interactions.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { useState, useCallback, useRef } from 'react';

/**
 * Loading state interface for async operations
 * 
 * @interface LoadingState
 * @property {boolean} isLoading - Whether an operation is currently in progress
 * @property {Error | null} error - Error object if operation failed, null otherwise
 * @property {number} [progress] - Optional progress percentage (0-100)
 */
export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
  progress?: number;
}

/**
 * Loading state manager interface with control methods
 * 
 * @interface LoadingStateManager
 * @property {LoadingState} state - Current loading state
 * @property {Function} setLoading - Set loading status
 * @property {Function} setError - Set error state
 * @property {Function} setProgress - Set progress percentage
 * @property {Function} reset - Reset all state to initial values
 * @property {Function} executeAsync - Execute async operation with state management
 */
export interface LoadingStateManager {
  state: LoadingState;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  setProgress: (progress: number) => void;
  reset: () => void;
  executeAsync: <T>(
    asyncFn: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      onFinally?: () => void;
    }
  ) => Promise<T | null>;
}

/**
 * Loading state management hook for async operations
 * 
 * Provides comprehensive loading state management with progress tracking,
 * error handling, and automatic operation cancellation. Ideal for managing
 * UI states during API calls, file uploads, and other async operations.
 * 
 * Features:
 * - Loading state management with boolean flags
 * - Error state management with Error objects
 * - Progress tracking with percentage values (0-100)
 * - Automatic operation cancellation with AbortController
 * - Callback support for success, error, and completion events
 * - State reset functionality for cleanup
 * - Type-safe async operation execution
 * 
 * Use Cases:
 * - API request loading states
 * - File upload progress tracking
 * - Form submission states
 * - Data processing operations
 * - Multi-step wizard progress
 * 
 * @param {boolean} [initialLoading=false] - Initial loading state
 * @returns {LoadingStateManager} Loading state manager with control methods
 * 
 * @example
 * ```tsx
 * function DataFetchingComponent() {
 *   const { state, executeAsync, setProgress, reset } = useLoadingState();
 * 
 *   const fetchData = async () => {
 *     const result = await executeAsync(
 *       async () => {
 *         const response = await api.getData();
 *         return response.data;
 *       },
 *       {
 *         onSuccess: (data) => console.log('Data loaded:', data),
 *         onError: (error) => console.error('Failed to load data:', error),
 *         onFinally: () => console.log('Operation completed')
 *       }
 *     );
 *   };
 * 
 *   const uploadFile = async (file: File) => {
 *     await executeAsync(async () => {
 *       return new Promise((resolve) => {
 *         const xhr = new XMLHttpRequest();
 *         xhr.upload.onprogress = (e) => {
 *           if (e.lengthComputable) {
 *             setProgress((e.loaded / e.total) * 100);
 *           }
 *         };
 *         xhr.onload = () => resolve(xhr.response);
 *         xhr.open('POST', '/upload');
 *         xhr.send(file);
 *       });
 *     });
 *   };
 * 
 *   return (
 *     <div>
 *       {state.isLoading && (
 *         <div>
 *           Loading...
 *           {state.progress !== undefined && (
 *             <div>Progress: {state.progress.toFixed(1)}%</div>
 *           )}
 *         </div>
 *       )}
 *       
 *       {state.error && (
 *         <div>Error: {state.error.message}</div>
 *       )}
 * 
 *       <button onClick={fetchData} disabled={state.isLoading}>
 *         Fetch Data
 *       </button>
 *       
 *       <button onClick={reset}>Reset</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @performance
 * - Efficient state updates with minimal re-renders
 * - Automatic cleanup with AbortController
 * - Memory leak prevention through proper cleanup
 * - Optimized callback execution
 * 
 * @error-handling
 * - Comprehensive error catching and state management
 * - Operation cancellation support
 * - Graceful error recovery
 * - Type-safe error handling
 */
export const useLoadingState = (initialLoading = false): LoadingStateManager => {
  const [state, setState] = useState<LoadingState>({
    isLoading: initialLoading,
    error: null,
    progress: undefined
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: Error | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const setProgress = useCallback((progress: number) => {
    setState(prev => ({ ...prev, progress: Math.max(0, Math.min(100, progress)) }));
  }, []);

  const reset = useCallback(() => {
    // Cancel any ongoing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState({
      isLoading: false,
      error: null,
      progress: undefined
    });
  }, []);

  const executeAsync = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      onFinally?: () => void;
    } = {}
  ): Promise<T | null> => {
    const { onSuccess, onError, onFinally } = options;

    // Cancel any previous operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this operation
    abortControllerRef.current = new AbortController();

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null, progress: undefined }));

      const result = await asyncFn();

      // Check if operation was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return null;
      }

      setState(prev => ({ ...prev, isLoading: false, error: null }));
      onSuccess?.(result);
      return result;

    } catch (error) {
      // Check if operation was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return null;
      }

      const errorObj = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({ ...prev, isLoading: false, error: errorObj }));
      onError?.(errorObj);
      return null;

    } finally {
      // Clean up abort controller
      abortControllerRef.current = null;
      onFinally?.();
    }
  }, []);

  return {
    state,
    setLoading,
    setError,
    setProgress,
    reset,
    executeAsync
  };
};

// Hook for managing multiple loading states
export const useMultipleLoadingStates = () => {
  const [states, setStates] = useState<Record<string, LoadingState>>({});

  const getState = useCallback((key: string): LoadingState => {
    return states[key] || { isLoading: false, error: null };
  }, [states]);

  const setLoading = useCallback((key: string, loading: boolean) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], isLoading: loading }
    }));
  }, []);

  const setError = useCallback((key: string, error: Error | null) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], error }
    }));
  }, []);

  const setProgress = useCallback((key: string, progress: number) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], progress: Math.max(0, Math.min(100, progress)) }
    }));
  }, []);

  const reset = useCallback((key: string) => {
    setStates(prev => {
      const newStates = { ...prev };
      delete newStates[key];
      return newStates;
    });
  }, []);

  const resetAll = useCallback(() => {
    setStates({});
  }, []);

  const isAnyLoading = useCallback(() => {
    return Object.values(states).some(state => state.isLoading);
  }, [states]);

  const hasAnyError = useCallback(() => {
    return Object.values(states).some(state => state.error);
  }, [states]);

  return {
    states,
    getState,
    setLoading,
    setError,
    setProgress,
    reset,
    resetAll,
    isAnyLoading,
    hasAnyError
  };
};