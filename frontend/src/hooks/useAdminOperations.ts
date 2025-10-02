import { useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useLoadingState } from './useLoadingState';
import { adminApi } from '../services/adminApi';
import { ApiError } from '../services/apiClient';

export const useAdminOperations = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const loadingState = useLoadingState();

  const executeOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      successMessage?: string;
      errorMessage?: string;
      loadingMessage?: string;
      showSuccessToast?: boolean;
      showErrorToast?: boolean;
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<T | null> => {
    const {
      successMessage,
      errorMessage = 'Operation failed',
      showSuccessToast = true,
      showErrorToast = true,
      onSuccess,
      onError
    } = options;

    return loadingState.executeAsync(
      operation,
      {
        onSuccess: (result) => {
          if (showSuccessToast && successMessage) {
            showSuccess(successMessage);
          }
          onSuccess?.(result);
        },
        onError: (error) => {
          if (showErrorToast) {
            const message = error instanceof ApiError 
              ? error.message 
              : errorMessage;
            showError('Operation Failed', message);
          }
          onError?.(error);
        }
      }
    );
  }, [loadingState, showSuccess, showError]);

  // User Management Operations
  const updateUserStatus = useCallback(async (
    userId: string, 
    status: string, 
    reason: string
  ) => {
    return executeOperation(
      () => adminApi.updateUserStatus(userId, status, reason),
      {
        successMessage: `User status updated to ${status}`,
        errorMessage: 'Failed to update user status'
      }
    );
  }, [executeOperation]);

  // Listing Moderation Operations
  const moderateListing = useCallback(async (
    listingId: string, 
    decision: any
  ) => {
    return executeOperation(
      () => adminApi.moderateListing(listingId, decision),
      {
        successMessage: `Listing ${decision.action}d successfully`,
        errorMessage: 'Failed to moderate listing'
      }
    );
  }, [executeOperation]);

  // Settings Operations
  const updatePlatformSettings = useCallback(async (
    section: string, 
    data: any, 
    reason: string
  ) => {
    return executeOperation(
      () => adminApi.updatePlatformSettings(section, data, reason),
      {
        successMessage: 'Settings updated successfully',
        errorMessage: 'Failed to update settings'
      }
    );
  }, [executeOperation]);

  // Support Operations
  const updateTicket = useCallback(async (
    ticketId: string, 
    updates: any
  ) => {
    return executeOperation(
      () => adminApi.updateTicket(ticketId, updates),
      {
        successMessage: 'Ticket updated successfully',
        errorMessage: 'Failed to update ticket'
      }
    );
  }, [executeOperation]);

  const assignTicket = useCallback(async (
    ticketId: string, 
    assignedTo: string
  ) => {
    return executeOperation(
      () => adminApi.assignTicket(ticketId, assignedTo),
      {
        successMessage: 'Ticket assigned successfully',
        errorMessage: 'Failed to assign ticket'
      }
    );
  }, [executeOperation]);

  // System Operations
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    return executeOperation(
      () => adminApi.acknowledgeAlert(alertId),
      {
        successMessage: 'Alert acknowledged',
        errorMessage: 'Failed to acknowledge alert'
      }
    );
  }, [executeOperation]);

  const resolveAlert = useCallback(async (alertId: string) => {
    return executeOperation(
      () => adminApi.resolveAlert(alertId),
      {
        successMessage: 'Alert resolved',
        errorMessage: 'Failed to resolve alert'
      }
    );
  }, [executeOperation]);

  // Announcement Operations
  const createAnnouncement = useCallback(async (announcement: any) => {
    return executeOperation(
      () => adminApi.createAnnouncement(announcement),
      {
        successMessage: 'Announcement created successfully',
        errorMessage: 'Failed to create announcement'
      }
    );
  }, [executeOperation]);

  const publishAnnouncement = useCallback(async (announcementId: string) => {
    return executeOperation(
      () => adminApi.publishAnnouncement(announcementId),
      {
        successMessage: 'Announcement published successfully',
        errorMessage: 'Failed to publish announcement'
      }
    );
  }, [executeOperation]);

  // Generic operation executor for custom operations
  const executeCustomOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    successMessage?: string,
    errorMessage?: string
  ): Promise<T | null> => {
    return executeOperation(operation, {
      successMessage,
      errorMessage
    });
  }, [executeOperation]);

  return {
    // State
    isLoading: loadingState.state.isLoading,
    error: loadingState.state.error,
    progress: loadingState.state.progress,

    // Operations
    updateUserStatus,
    moderateListing,
    updatePlatformSettings,
    updateTicket,
    assignTicket,
    acknowledgeAlert,
    resolveAlert,
    createAnnouncement,
    publishAnnouncement,
    executeCustomOperation,

    // Manual state management
    setLoading: loadingState.setLoading,
    setError: loadingState.setError,
    setProgress: loadingState.setProgress,
    reset: loadingState.reset
  };
};