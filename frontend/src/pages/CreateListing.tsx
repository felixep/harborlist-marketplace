import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../components/auth/AuthProvider';
import { createListing } from '../services/listings';
import ListingForm from '../components/listing/ListingForm';
import { Listing } from '@harborlist/shared-types';

export default function CreateListing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const createMutation = useMutation({
    mutationFn: createListing,
    onSuccess: (data) => {
      navigate(`/listing/${data.listingId}`);
    },
    onError: (error) => {
      console.error('Failed to create listing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create listing. Please try again.';
      alert(`Error: ${errorMessage}`);
    }
  });

  const handleSubmit = (listingData: Omit<Listing, 'listingId' | 'createdAt' | 'updatedAt'>) => {
    createMutation.mutate(listingData);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">List Your Boat</h1>
        <p className="text-gray-600">
          Create a detailed listing to reach thousands of potential buyers across the United States.
        </p>
        {user && (
          <p className="text-sm text-gray-500 mt-2">
            Welcome back, {user.name}! Ready to list your boat?
          </p>
        )}
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-medium">
              1
            </div>
            <span className="ml-2 text-sm font-medium text-blue-600">Boat Details</span>
          </div>
          <div className="flex-1 mx-4 h-0.5 bg-gray-200"></div>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-gray-200 text-gray-600 rounded-full text-sm font-medium">
              2
            </div>
            <span className="ml-2 text-sm font-medium text-gray-600">Photos & Videos</span>
          </div>
          <div className="flex-1 mx-4 h-0.5 bg-gray-200"></div>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-gray-200 text-gray-600 rounded-full text-sm font-medium">
              3
            </div>
            <span className="ml-2 text-sm font-medium text-gray-600">Review & Publish</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <ListingForm
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending}
      />

      {/* Tips Sidebar */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Tips for a Great Listing</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <svg className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Use high-quality photos showing both exterior and interior
          </li>
          <li className="flex items-start">
            <svg className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Write a detailed description highlighting unique features
          </li>
          <li className="flex items-start">
            <svg className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Include maintenance records and recent upgrades
          </li>
          <li className="flex items-start">
            <svg className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Price competitively based on similar boats in your area
          </li>
          <li className="flex items-start">
            <svg className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Respond quickly to inquiries to build buyer confidence
          </li>
        </ul>
      </div>
    </div>
  );
}
