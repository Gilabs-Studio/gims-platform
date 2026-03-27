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
  CreateEmployeeEducationHistoryData,
  UpdateEmployeeEducationHistoryData,
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

export function useEmployees(
  params?: ListEmployeesParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: employeeKeys.list(params ?? {}),
    queryFn: () => employeeService.list(params),
    enabled: options?.enabled ?? true,
  });
}

export function useEmployee(
  id: string | undefined,
  options?: { enabled?: boolean },
) {
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
      queryClient.invalidateQueries({ queryKey: ["available-users"] });
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
      queryClient.invalidateQueries({ queryKey: ["available-users"] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["available-users"] });
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

export function useAvailableUsers(
  search?: string,
  excludeEmployeeId?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: employeeKeys.availableUsers(search, excludeEmployeeId),
    queryFn: () =>
      employeeService.getAvailableUsers({
        search,
        exclude_employee_id: excludeEmployeeId,
      }),
    staleTime: 0,
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

// Education history query keys
export const educationKeys = {
  all: ["employee-education"] as const,
  lists: (employeeId: string) =>
    [...educationKeys.all, "list", employeeId] as const,
};

export function useEmployeeEducationHistories(employeeId: string | undefined) {
  return useQuery({
    queryKey: educationKeys.lists(employeeId ?? ""),
    queryFn: () => employeeService.getEmployeeEducationHistories(employeeId!),
    enabled: !!employeeId,
  });
}

export function useCreateEmployeeEducationHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      data,
    }: {
      employeeId: string;
      data: CreateEmployeeEducationHistoryData;
    }) => employeeService.createEmployeeEducationHistory(employeeId, data),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: educationKeys.lists(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}

export function useUpdateEmployeeEducationHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      educationId,
      data,
    }: {
      employeeId: string;
      educationId: string;
      data: UpdateEmployeeEducationHistoryData;
    }) =>
      employeeService.updateEmployeeEducationHistory(
        employeeId,
        educationId,
        data,
      ),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: educationKeys.lists(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}

export function useDeleteEmployeeEducationHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      educationId,
    }: {
      employeeId: string;
      educationId: string;
    }) =>
      employeeService.deleteEmployeeEducationHistory(employeeId, educationId),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: educationKeys.lists(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}

// Certification query keys
export const certificationKeys = {
  all: ["employee-certification"] as const,
  lists: (employeeId: string) =>
    [...certificationKeys.all, "list", employeeId] as const,
};

export function useEmployeeCertifications(employeeId: string | undefined) {
  return useQuery({
    queryKey: certificationKeys.lists(employeeId ?? ""),
    queryFn: () => employeeService.getEmployeeCertifications(employeeId!),
    enabled: !!employeeId,
  });
}

export function useCreateEmployeeCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      data,
    }: {
      employeeId: string;
      data: import("../types").CreateEmployeeCertificationData;
    }) => employeeService.createEmployeeCertification(employeeId, data),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: certificationKeys.lists(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}

export function useUpdateEmployeeCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      certId,
      data,
    }: {
      employeeId: string;
      certId: string;
      data: import("../types").UpdateEmployeeCertificationData;
    }) => employeeService.updateEmployeeCertification(employeeId, certId, data),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: certificationKeys.lists(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}

export function useDeleteEmployeeCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      certId,
    }: {
      employeeId: string;
      certId: string;
    }) => employeeService.deleteEmployeeCertification(employeeId, certId),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: certificationKeys.lists(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}

// --- Employee Asset Hooks ---

export const assetKeys = {
  all: ["employee-asset"] as const,
  lists: (employeeId: string) =>
    [...assetKeys.all, "list", employeeId] as const,
};

export function useEmployeeAssets(employeeId: string | undefined) {
  return useQuery({
    queryKey: assetKeys.lists(employeeId ?? ""),
    queryFn: () => employeeService.getEmployeeAssets(employeeId!),
    enabled: !!employeeId,
  });
}

export function useCreateEmployeeAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      data,
    }: {
      employeeId: string;
      data: import("../types").CreateEmployeeAssetData;
    }) => employeeService.createEmployeeAsset(employeeId, data),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: assetKeys.lists(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}

export function useUpdateEmployeeAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      assetId,
      data,
    }: {
      employeeId: string;
      assetId: string;
      data: import("../types").UpdateEmployeeAssetData;
    }) => employeeService.updateEmployeeAsset(employeeId, assetId, data),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: assetKeys.lists(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}

export function useReturnEmployeeAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      assetId,
      data,
    }: {
      employeeId: string;
      assetId: string;
      data: import("../types").ReturnEmployeeAssetData;
    }) => employeeService.returnEmployeeAsset(employeeId, assetId, data),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: assetKeys.lists(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}

export function useDeleteEmployeeAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      assetId,
    }: {
      employeeId: string;
      assetId: string;
    }) => employeeService.deleteEmployeeAsset(employeeId, assetId),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: assetKeys.lists(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}

// Signature query keys
export const signatureKeys = {
  all: ["employee-signatures"] as const,
  detail: (employeeId: string) =>
    [...signatureKeys.all, "detail", employeeId] as const,
};

export function useEmployeeSignature(
  employeeId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: signatureKeys.detail(employeeId ?? ""),
    queryFn: () => employeeService.getEmployeeSignature(employeeId!),
    enabled: options?.enabled !== undefined ? options.enabled : !!employeeId,
  });
}

export function useUploadEmployeeSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, file }: { employeeId: string; file: File }) =>
      employeeService.uploadEmployeeSignature(employeeId, file),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: signatureKeys.detail(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}

export function useDeleteEmployeeSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employeeId: string) =>
      employeeService.deleteEmployeeSignature(employeeId),
    onSuccess: (_, employeeId) => {
      queryClient.invalidateQueries({
        queryKey: signatureKeys.detail(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(employeeId),
      });
    },
  });
}
