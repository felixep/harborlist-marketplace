import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { ProgressBar } from './ProgressBar';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number;
  showProgress?: boolean;
  backdrop?: 'light' | 'dark' | 'blur';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const backdropClasses = {
  light: 'bg-white bg-opacity-75',
  dark: 'bg-gray-900 bg-opacity-50',
  blur: 'bg-white bg-opacity-75 backdrop-blur-sm'
};

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message,
  progress,
  showProgress = false,
  backdrop = 'blur',
  size = 'lg',
  className = ''
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        ${backdropClasses[backdrop]} ${className}
      `}
      role="dialog"
      aria-modal="true"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-lg shadow-lg max-w-sm w-full mx-4">
        <LoadingSpinner size={size} />
        
        {message && (
          <p className="text-gray-700 text-center font-medium">{message}</p>
        )}
        
        {showProgress && typeof progress === 'number' && (
          <div className="w-full">
            <ProgressBar
              progress={progress}
              showPercentage
              size="md"
              color="primary"
            />
          </div>
        )}
      </div>
    </div>
  );
};