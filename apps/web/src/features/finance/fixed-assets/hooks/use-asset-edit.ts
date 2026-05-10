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
    old_value: any;
    new_value: any;
    group: string;
    depreciation_impact?: any;
  }>;
  [key: string]: any;
}

/**
 * Hook for editing assets with field classification support
 * - Sends PATCH request to /api/assets/:id
 * - Includes depreciation impact preview in response
 * - Tracks which fields were changed and their classification
 */
export function useAssetEdit() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: { assetId: string; data: Record<string, any> }) => {
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
      } catch (e) {
        // ignore
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Failed to update asset';
      const code = error?.response?.data?.code;

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
    editAsset: async (assetId: string, data: Record<string, any>) => {
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
