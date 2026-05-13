'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { financeAssetKeys } from '@/features/finance/assets/hooks/use-finance-assets';

interface EditAssetResponse {
  id: string;
  code: string;
  name: string;
  changed_fields?: Array<{
    field_name: string;
    old_value: unknown;
    new_value: unknown;
    group: string;
    depreciation_impact?: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Hook for editing assets with field classification support
 * - Sends PATCH request to /api/assets/:id
 * - Includes depreciation impact preview in response
 * - Tracks which fields were changed and their classification
 */
export function useAssetEdit() {
  const queryClient = useQueryClient();

  const getErrorResponse = (error: unknown): { message?: string; code?: string } | null => {
    if (!error || typeof error !== 'object' || !('response' in error)) {
      return null;
    }

    const response = (error as { response?: { data?: unknown } }).response;
    const data = response?.data;

    if (!data || typeof data !== 'object') {
      return null;
    }

    return data as { message?: string; code?: string };
  };

  const mutation = useMutation({
    mutationFn: async (params: { assetId: string; data: Record<string, unknown> }) => {
      const response = await apiClient.patch<EditAssetResponse>(
        `/finance/fixed-assets/assets/${params.assetId}`,
        params.data
      );
      return response;
    },
    onSuccess: (response) => {
      const data = response.data;
      toast.success(`Asset "${data.name}" updated successfully`, {
        description: `${data.changed_fields?.length || 0} field(s) changed`,
      });
      // Invalidate queries so detail views refresh
      try {
        const id = response.data?.id;
        if (id) {
          queryClient.invalidateQueries({ queryKey: financeAssetKeys.detail(id) });
        }
        queryClient.invalidateQueries({ queryKey: financeAssetKeys.lists() });
      } catch {
        // ignore
      }
    },
    onError: (error: unknown) => {
      const errorResponse = getErrorResponse(error);
      const message = errorResponse?.message || (error instanceof Error ? error.message : 'Failed to update asset');
      const code = errorResponse?.code;

      if (code === 'ASSET_FIELD_IMMUTABLE') {
        toast.error('Cannot Edit Immutable Fields', {
          description: 'These fields cannot be changed for active assets. Use appropriate actions (e.g., Revaluation) instead.',
        });
      } else if (code === 'ASSET_NOT_FOUND') {
        toast.error('Asset Not Found', {
          description: 'The asset you are trying to edit does not exist.',
        });
      } else {
        toast.error('Update Failed', {
          description: message,
        });
      }
    },
  });

  return {
    editAsset: async (assetId: string, data: Record<string, unknown>) => {
      return mutation.mutateAsync({ assetId, data });
    },
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for fetching asset details (for edit form initialization)
 */
export function useAssetDetails(assetId: string) {
  return useMutation({
    mutationFn: async () => {
      return apiClient.get(`/finance/assets/${assetId}`);
    },
  });
}
