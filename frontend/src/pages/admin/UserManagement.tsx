import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useAdminOperations } from '../../hooks/useAdminOperations';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';

const UserManagement: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const { 
    isLoading, 
    updateUserStatus, 
    executeCustomOperation 
  } = useAdminOperations();
  
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const handleSuspendUser = async (userId: string) => {
    const result = await updateUserStatus(userId, 'suspended', 'Violation of terms of service');
    if (result) {
      // Additional success handling if needed
      console.log('User suspended successfully');
    }
  };

  const handleActivateUser = async (userId: string) => {
    const result = await updateUserStatus(userId, 'active', 'Account reactivated by admin');
    if (result) {
      // Additional success handling if needed
      console.log('User activated successfully');
    }
  };

  const handleTestOperations = () => {
    showSuccess('Success!', 'This is a success message');
    setTimeout(() => showError('Error!', 'This is an error message'), 1000);
    setTimeout(() => showWarning('Warning!', 'This is a warning message'), 2000);
    setTimeout(() => showInfo('Info!', 'This is an info message'), 3000);
  };

  const handleTestAsyncOperation = async () => {
    await executeCustomOperation(
      async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (Math.random() > 0.5) {
          throw new Error('Random error occurred');
        }
        return 'Operation completed successfully';
      },
      'Async operation completed!',
      'Async operation failed'
    );
  };

  return (
    <div className="p-6">
      <LoadingOverlay 
        isVisible={isLoading} 
        message="Processing request..." 
        backdrop="blur"
      />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleTestOperations}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Test Notifications
          </button>
          <button
            onClick={handleTestAsyncOperation}
            disabled={isLoading}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading && <LoadingSpinner size="sm" color="white" />}
            <span>Test Async Operation</span>
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">All Users</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <p className="text-gray-500 mb-4">
              User management interface with toast notifications and loading states.
            </p>
            
            {/* Demo user actions */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Demo User Actions</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSuspendUser('demo-user-1')}
                  disabled={isLoading}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suspend User
                </button>
                <button
                  onClick={() => handleActivateUser('demo-user-1')}
                  disabled={isLoading}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Activate User
                </button>
              </div>
            </div>

            {/* Loading state demo */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Loading States</h3>
              <div className="flex items-center space-x-4">
                <LoadingSpinner size="sm" />
                <LoadingSpinner size="md" />
                <LoadingSpinner size="lg" />
                <LoadingSpinner size="xl" />
              </div>
            </div>

            {/* Error handling demo */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Error Handling</h3>
              <p className="text-sm text-gray-600 mb-2">
                All operations include automatic error reporting and user-friendly error messages.
              </p>
              <button
                onClick={() => {
                  try {
                    throw new Error('Demo error for testing');
                  } catch (error) {
                    showError('Demo Error', 'This is a demonstration of error handling', {
                      action: {
                        label: 'Retry',
                        onClick: () => showInfo('Retry clicked', 'This would retry the operation')
                      }
                    });
                  }
                }}
                className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700"
              >
                Trigger Demo Error
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;