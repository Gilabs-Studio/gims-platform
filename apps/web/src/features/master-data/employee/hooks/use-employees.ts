"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeService } from "../services/employee-service";
import type {
  ListEmployeesParams,
  CreateEmployeeData,
  UpdateEmployeeData,
  ApproveEmployeeData,
  AssignEmployeeAreasData,
  BulkUpdateEmployeeAreasData,
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

export function useEmployees(params?: ListEmployeesParams) {
  return useQuery({
    queryKey: employeeKeys.list(params ?? {}),
    queryFn: () => employeeService.list(params),
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: employeeKeys.detail(id ?? ""),
    queryFn: () => employeeService.getById(id!),
    enabled: !!id,
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

export function useSubmitEmployeeForApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeeService.submitForApproval(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
    },
  });
}

export function useApproveEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveEmployeeData }) =>
      employeeService.approve(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
    },
  });
}

export function useAssignEmployeeAreas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: AssignEmployeeAreasData;
    }) => employeeService.assignAreas(id, data),
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

export function useAvailableUsers(search?: string, excludeEmployeeId?: string) {
  return useQuery({
    queryKey: employeeKeys.availableUsers(search, excludeEmployeeId),
    queryFn: () =>
      employeeService.getAvailableUsers({
        search,
        exclude_employee_id: excludeEmployeeId,
      }),
  });
}

export function useEmployeeFormData() {
  return useQuery({
    queryKey: employeeKeys.formData(),
    queryFn: () => employeeService.getFormData(),
    staleTime: 5 * 60 * 1000, // Form data rarely changes, cache for 5 minutes
  });
}
