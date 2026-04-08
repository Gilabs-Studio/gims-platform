import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { outletService } from "../services/outlet-service";
import type {
  Outlet,
  CreateOutletData,
  UpdateOutletData,
  OutletListParams,
} from "../types";

// Query key factory
export const outletKeys = {
  all: ["outlets"] as const,
  lists: () => [...outletKeys.all, "list"] as const,
  list: (params?: OutletListParams) =>
    [...outletKeys.lists(), params] as const,
  details: () => [...outletKeys.all, "detail"] as const,
  detail: (id: string) => [...outletKeys.details(), id] as const,
  formData: () => [...outletKeys.all, "form-data"] as const,
};

export function useOutlets(params?: OutletListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: outletKeys.list(params),
    queryFn: () => outletService.list(params),
    enabled: options?.enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOutlet(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: outletKeys.detail(id),
    queryFn: () => outletService.getById(id),
    enabled: options?.enabled ?? !!id,
    staleTime: 0,
  });
}

export function useOutletFormData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: outletKeys.formData(),
    queryFn: () => outletService.getFormData(),
    enabled: options?.enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateOutlet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOutletData) => outletService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outletKeys.lists() });
      // Also invalidate warehouse list since a warehouse may have been created
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
  });
}

export function useUpdateOutlet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOutletData }) =>
      outletService.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: outletKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: outletKeys.detail(variables.id),
      });
      // Also invalidate warehouses in case active status changed
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
  });
}

export function useDeleteOutlet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => outletService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outletKeys.lists() });
    },
  });
}
