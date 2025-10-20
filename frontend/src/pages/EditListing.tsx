import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getListing, updateListing } from '../services/listings';
import ListingForm from '../components/listing/ListingForm';
import { useToast } from '../contexts/ToastContext';
import { Listing } from '@harborlist/shared-types';

export default function EditListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListing(id!, { bySlug: false, noRedirect: true }),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Listing>) => updateListing(id!, updates),
    onSuccess: () => {
      showSuccess('Listing Updated', 'Your changes have been saved.');
      navigate('/profile');
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Failed to update listing. Please try again.';
      showError('Update Failed', errorMessage);
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Listing Not Found</h1>
        <p className="text-gray-600 mb-4">The listing you're trying to edit doesn't exist or you don't have permission to edit it.</p>
        <button onClick={() => navigate('/profile')} className="btn-primary">
          Back to Profile
        </button>
      </div>
    );
  }

  const handleSubmit = (updatedData: Omit<Listing, 'listingId' | 'createdAt' | 'updatedAt'>) => {
    updateMutation.mutate(updatedData);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Listing</h1>
        <p className="text-gray-600">
          Update your boat listing details below.
        </p>
      </div>

      <ListingForm
        initialData={data.listing}
        onSubmit={handleSubmit}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}
