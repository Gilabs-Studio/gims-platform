"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeContractService } from "../services/employee-contract-service";
import type {
  ListEmployeeContractsParams,
  ExpiringContractsParams,
  CreateEmployeeContractData,
  UpdateEmployeeContractData,
  EmployeeContractListResponse,
} from "../types";

// Query keys
export const employeeContractKeys = {
  all: ["employee-contracts"] as const,
  lists: () => [...employeeContractKeys.all, "list"] as const,
  list: (params?: ListEmployeeContractsParams) =>
    [...employeeContractKeys.lists(), params] as const,
  details: () => [...employeeContractKeys.all, "detail"] as const,
  detail: (id: string) => [...employeeContractKeys.details(), id] as const,
  byEmployee: (employeeId: string) =>
    [...employeeContractKeys.all, "by-employee", employeeId] as const,
  expiring: (params?: ExpiringContractsParams) =>
    [...employeeContractKeys.all, "expiring", params] as const,
  formData: () => [...employeeContractKeys.all, "form-data"] as const,
};

// List employee contracts hook with filters
export function useEmployeeContracts(params?: ListEmployeeContractsParams) {
  return useQuery({
    queryKey: employeeContractKeys.list(params),
    queryFn: () => employeeContractService.list(params),
  });
}

// Get employee contract by ID hook
export function useEmployeeContract(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: employeeContractKeys.detail(id),
    queryFn: () => employeeContractService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

// Get contracts by employee ID
export function useEmployeeContractsByEmployee(
  employeeId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: employeeContractKeys.byEmployee(employeeId),
    queryFn: () => employeeContractService.getByEmployeeId(employeeId),
    enabled: options?.enabled !== undefined ? options.enabled : !!employeeId,
  });
}

// Get expiring contracts
export function useExpiringContracts(params?: ExpiringContractsParams) {
  return useQuery({
    queryKey: employeeContractKeys.expiring(params),
    queryFn: () => employeeContractService.getExpiring(params),
  });
}

// Get form data (employees, contract types, statuses)
export function useEmployeeContractFormData() {
  return useQuery({
    queryKey: employeeContractKeys.formData(),
    queryFn: () => employeeContractService.getFormData(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Create employee contract mutation
export function useCreateEmployeeContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployeeContractData) =>
      employeeContractService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeContractKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeContractKeys.expiring() });
    },
  });
}

// Update employee contract mutation
export function useUpdateEmployeeContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeContractData }) =>
      employeeContractService.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: employeeContractKeys.lists() });

      // Update all list caches optimistically
      queryClient.setQueriesData(
        { queryKey: employeeContractKeys.lists() },
        (old: EmployeeContractListResponse | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((contract) =>
              contract.id === id ? { ...contract, ...data } : contract
            ),
          };
        }
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate detail query
      queryClient.invalidateQueries({
        queryKey: employeeContractKeys.detail(variables.id),
      });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: employeeContractKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeContractKeys.expiring() });
    },
    onError: () => {
      // Revert optimistic updates on error
      queryClient.invalidateQueries({ queryKey: employeeContractKeys.lists() });
    },
  });
}

// Delete employee contract mutation
export function useDeleteEmployeeContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeeContractService.delete(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: employeeContractKeys.lists() });

      // Remove from list cache optimistically
      queryClient.setQueriesData(
        { queryKey: employeeContractKeys.lists() },
        (old: EmployeeContractListResponse | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((contract) => contract.id !== id),
            meta: {
              ...old.meta,
              pagination: old.meta?.pagination
                ? {
                    ...old.meta.pagination,
                    total: old.meta.pagination.total - 1,
                  }
                : undefined,
            },
          };
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeContractKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeContractKeys.expiring() });
    },
    onError: () => {
      // Revert optimistic updates on error
      queryClient.invalidateQueries({ queryKey: employeeContractKeys.lists() });
    },
  });
}
