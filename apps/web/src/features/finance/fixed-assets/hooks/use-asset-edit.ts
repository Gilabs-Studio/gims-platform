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
    onMutate: async ({ assetId, data }) => {
      // Cancel outgoing queries for this asset detail
      await queryClient.cancelQueries({ queryKey: financeAssetKeys.detail(assetId) });

      // Snapshot previous asset detail
      const previousAsset = queryClient.getQueryData(financeAssetKeys.detail(assetId));

      // Optimistically update cache for instant feedback
      if (previousAsset) {
        queryClient.setQueryData(financeAssetKeys.detail(assetId), (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          const env = old as { data?: Record<string, unknown> };
          if (env.data && typeof env.data === "object") {
            return {
              ...env,
              data: {
                ...env.data,
                ...data,
              },
            };
          }
          return {
            ...old,
            ...data,
          };
        });
      }

      return { previousAsset };
    },
    onSuccess: (response, variables) => {
      const resData = response.data as unknown as { data?: EditAssetResponse } & EditAssetResponse;
      const assetObj = resData?.data ?? resData;
      const name = assetObj?.name || (assetObj as { asset_name?: string })?.asset_name || "Asset";

      toast.success(`Asset "${name}" updated successfully`, {
        description: `${assetObj?.changed_fields?.length || 0} field(s) changed`,
      });
    },
    onError: (error: unknown, variables, context) => {
      // Rollback cache if mutation failed
      if (context?.previousAsset) {
        queryClient.setQueryData(financeAssetKeys.detail(variables.assetId), context.previousAsset);
      }

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
    onSettled: (_, __, variables) => {
      if (variables?.assetId) {
        queryClient.invalidateQueries({ queryKey: financeAssetKeys.detail(variables.assetId) });
        queryClient.invalidateQueries({ queryKey: financeAssetKeys.auditLogs(variables.assetId) });
      }
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.lists() });
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
