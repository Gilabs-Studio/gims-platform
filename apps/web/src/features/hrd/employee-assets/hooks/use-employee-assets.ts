import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { employeeAssetService } from "../services/employee-asset-service";
import type {
  CreateEmployeeAssetRequest,
  EmployeeAssetFilters,
  ReturnAssetRequest,
  UpdateEmployeeAssetRequest,
} from "../types";

export const EMPLOYEE_ASSET_QUERY_KEYS = {
  all: ["employee-assets"] as const,
  lists: () => [...EMPLOYEE_ASSET_QUERY_KEYS.all, "list"] as const,
  list: (filters?: EmployeeAssetFilters) =>
    [...EMPLOYEE_ASSET_QUERY_KEYS.lists(), filters] as const,
  details: () => [...EMPLOYEE_ASSET_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...EMPLOYEE_ASSET_QUERY_KEYS.details(), id] as const,
  borrowed: () => [...EMPLOYEE_ASSET_QUERY_KEYS.all, "borrowed"] as const,
  byEmployee: (employeeId: string) =>
    [...EMPLOYEE_ASSET_QUERY_KEYS.all, "employee", employeeId] as const,
  formData: () => [...EMPLOYEE_ASSET_QUERY_KEYS.all, "form-data"] as const,
};

/**
 * Hook to fetch paginated employee assets list with filters
 */
export const useEmployeeAssets = (filters?: EmployeeAssetFilters) => {
  return useQuery({
    queryKey: EMPLOYEE_ASSET_QUERY_KEYS.list(filters),
    queryFn: () => employeeAssetService.getAll(filters),
    staleTime: 30000, // 30s
  });
};

/**
 * Hook to fetch employee asset by ID
 */
export const useEmployeeAsset = (id: string | null) => {
  return useQuery({
    queryKey: EMPLOYEE_ASSET_QUERY_KEYS.detail(id ?? ""),
    queryFn: () => employeeAssetService.getById(id!),
    enabled: !!id,
  });
};

/**
 * Hook to fetch borrowed assets (dashboard)
 */
export const useBorrowedAssets = (page = 1, perPage = 20) => {
  return useQuery({
    queryKey: [...EMPLOYEE_ASSET_QUERY_KEYS.borrowed(), page, perPage],
    queryFn: () => employeeAssetService.getBorrowed(page, perPage),
    staleTime: 60000, // 1min
  });
};

/**
 * Hook to fetch assets by employee ID
 */
export const useEmployeeAssetsByEmployee = (
  employeeId: string | null,
  page = 1,
  perPage = 20
) => {
  return useQuery({
    queryKey: [...EMPLOYEE_ASSET_QUERY_KEYS.byEmployee(employeeId ?? ""), page, perPage],
    queryFn: () => employeeAssetService.getByEmployeeId(employeeId!, page, perPage),
    enabled: !!employeeId,
  });
};

/**
 * Hook to fetch form data (employees dropdown)
 */
export const useEmployeeAssetFormData = () => {
  return useQuery({
    queryKey: EMPLOYEE_ASSET_QUERY_KEYS.formData(),
    queryFn: () => employeeAssetService.getFormData(),
    staleTime: 300000, // 5min (employees rarely change during session)
  });
};

/**
 * Hook to create employee asset
 */
export const useCreateEmployeeAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployeeAssetRequest) =>
      employeeAssetService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_ASSET_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_ASSET_QUERY_KEYS.borrowed() });
      toast.success("Asset borrowed successfully");
    },
    onError: (error: Error) => {
      const message =
        (error as Error & { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to borrow asset";
      toast.error(message);
    },
  });
};

/**
 * Hook to update employee asset
 */
export const useUpdateEmployeeAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeAssetRequest }) =>
      employeeAssetService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_ASSET_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({
        queryKey: EMPLOYEE_ASSET_QUERY_KEYS.detail(variables.id),
      });
      toast.success("Asset updated successfully");
    },
    onError: (error: Error) => {
      const message =
        (error as Error & { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to update asset";
      toast.error(message);
    },
  });
};

/**
 * Hook to return asset
 */
export const useReturnAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReturnAssetRequest }) =>
      employeeAssetService.returnAsset(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_ASSET_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_ASSET_QUERY_KEYS.borrowed() });
      queryClient.invalidateQueries({
        queryKey: EMPLOYEE_ASSET_QUERY_KEYS.detail(variables.id),
      });
      toast.success("Asset returned successfully");
    },
    onError: (error: Error) => {
      const message =
        (error as Error & { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to return asset";
      toast.error(message);
    },
  });
};

/**
 * Hook to delete employee asset
 */
export const useDeleteEmployeeAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeeAssetService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_ASSET_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_ASSET_QUERY_KEYS.borrowed() });
      toast.success("Asset deleted successfully");
    },
    onError: (error: Error) => {
      const message =
        (error as Error & { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to delete asset";
      toast.error(message);
    },
  });
};
