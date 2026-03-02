"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeService } from "../services/employee-service";
import type {
  ListEmployeesParams,
  CreateEmployeeData,
  UpdateEmployeeData,

  AssignEmployeeAreasData,
  BulkUpdateEmployeeAreasData,
  CreateEmployeeContractData,
  UpdateEmployeeContractData,
  TerminateEmployeeContractData,
  RenewEmployeeContractData,
  CorrectEmployeeContractData,
} from "../types";

export const employeeKeys = {
  all: ["employees"] as const,
  lists: () => [...employeeKeys.all, "list"] as const,
  list: (filters: ListEmployeesParams) =>
    [...employeeKeys.lists(), filters] as const,
  details: () => [...employeeKeys.all, "detail"] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
  availableUsers: (search?: string, excludeId?: string) =>
    ["available-users", { search, excludeId }] as const,
  formData: () => ["employees", "form-data"] as const,
};

export function useEmployees(params?: ListEmployeesParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: employeeKeys.list(params ?? {}),
    queryFn: () => employeeService.list(params),
    enabled: options?.enabled ?? true,
  });
}

export function useEmployee(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: employeeKeys.detail(id ?? ""),
    queryFn: () => employeeService.getById(id!),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployeeData) => employeeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeData }) =>
      employeeService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}


export function useAssignEmployeeAreas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignEmployeeAreasData }) =>
      employeeService.assignAreas(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
    },
  });
}

export function useBulkUpdateEmployeeAreas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: BulkUpdateEmployeeAreasData;
    }) => employeeService.bulkUpdateAreas(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
    },
  });
}

export function useRemoveEmployeeArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      areaId,
    }: {
      employeeId: string;
      areaId: string;
    }) => employeeService.removeAreaAssignment(employeeId, areaId),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}

export function useAvailableUsers(search?: string, excludeEmployeeId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: employeeKeys.availableUsers(search, excludeEmployeeId),
    queryFn: () =>
      employeeService.getAvailableUsers({
        search,
        exclude_employee_id: excludeEmployeeId,
      }),
    ...options,
  });
}

export function useEmployeeFormData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: employeeKeys.formData(),
    queryFn: () => employeeService.getFormData(),
    staleTime: 5 * 60 * 1000, // Form data rarely changes, cache for 5 minutes
    ...options,
  });
}

// Contract query keys
export const contractKeys = {
  all: ["employee-contracts"] as const,
  lists: (employeeId: string) =>
    [...contractKeys.all, "list", employeeId] as const,
  detail: (employeeId: string, contractId: string) =>
    [...contractKeys.all, "detail", employeeId, contractId] as const,
  active: (employeeId: string) =>
    [...contractKeys.all, "active", employeeId] as const,
};

// Contract hooks
export function useEmployeeContracts(employeeId: string | undefined) {
  return useQuery({
    queryKey: contractKeys.lists(employeeId ?? ""),
    queryFn: () => employeeService.getEmployeeContracts(employeeId!),
    enabled: !!employeeId,
  });
}

export function useActiveContract(employeeId: string | undefined) {
  return useQuery({
    queryKey: contractKeys.active(employeeId ?? ""),
    queryFn: () => employeeService.getActiveContract(employeeId!),
    enabled: !!employeeId,
  });
}

export function useCreateEmployeeContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      data,
    }: {
      employeeId: string;
      data: CreateEmployeeContractData;
    }) => employeeService.createEmployeeContract(employeeId, data),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: contractKeys.lists(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: contractKeys.active(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}

export function useUpdateEmployeeContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      contractId,
      data,
    }: {
      employeeId: string;
      contractId: string;
      data: UpdateEmployeeContractData;
    }) => employeeService.updateEmployeeContract(employeeId, contractId, data),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: contractKeys.lists(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: contractKeys.active(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}

export function useDeleteEmployeeContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      contractId,
    }: {
      employeeId: string;
      contractId: string;
    }) => employeeService.deleteEmployeeContract(employeeId, contractId),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: contractKeys.lists(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: contractKeys.active(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}

export function useTerminateEmployeeContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      contractId,
      data,
    }: {
      employeeId: string;
      contractId: string;
      data: TerminateEmployeeContractData;
    }) =>
      employeeService.terminateEmployeeContract(employeeId, contractId, data),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: contractKeys.lists(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: contractKeys.active(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}

export function useRenewEmployeeContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      contractId,
      data,
    }: {
      employeeId: string;
      contractId: string;
      data: RenewEmployeeContractData;
    }) => employeeService.renewEmployeeContract(employeeId, contractId, data),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: contractKeys.lists(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: contractKeys.active(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}

export function useCorrectActiveEmployeeContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      data,
    }: {
      employeeId: string;
      data: CorrectEmployeeContractData;
    }) => employeeService.correctActiveEmployeeContract(employeeId, data),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: contractKeys.lists(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: contractKeys.active(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}
