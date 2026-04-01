import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leaveRequestService } from "../services/leave-request-service";
import type {
  LeaveRequest,
  LeaveRequestFilters,
  CreateLeaveRequestPayload,
  UpdateLeaveRequestPayload,
  ApproveLeaveRequestPayload,
  RejectLeaveRequestPayload,
  CancelLeaveRequestPayload,
  LeaveRequestsResponse,
} from "../types";

// Query keys factory
export const leaveRequestKeys = {
  all: ["leave-requests"] as const,
  lists: () => [...leaveRequestKeys.all, "list"] as const,
  list: (filters?: LeaveRequestFilters) =>
    [...leaveRequestKeys.lists(), filters] as const,
  details: () => [...leaveRequestKeys.all, "detail"] as const,
  detail: (id: string) => [...leaveRequestKeys.details(), id] as const,
  formData: () => [...leaveRequestKeys.all, "form-data"] as const,
  myBalance: () => [...leaveRequestKeys.all, "my-balance"] as const,
  employeeBalance: (employeeId: string) =>
    [...leaveRequestKeys.all, "employee-balance", employeeId] as const,
  selfLists: () => [...leaveRequestKeys.all, "self-list"] as const,
  selfList: (filters?: LeaveRequestFilters) =>
    [...leaveRequestKeys.selfLists(), filters] as const,
  selfDetails: () => [...leaveRequestKeys.all, "self-detail"] as const,
  selfDetail: (id: string) => [...leaveRequestKeys.selfDetails(), id] as const,
  myFormData: () => [...leaveRequestKeys.all, "my-form-data"] as const,
  auditTrail: (id: string, params?: { page?: number; per_page?: number }) =>
    [...leaveRequestKeys.all, "audit-trail", id, params] as const,
};

// Query hooks
export function useLeaveRequests(filters?: LeaveRequestFilters) {
  return useQuery({
    queryKey: leaveRequestKeys.list(filters),
    queryFn: () => leaveRequestService.getLeaveRequests(filters),
  });
}

export function useLeaveRequest(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: leaveRequestKeys.detail(id),
    queryFn: () => leaveRequestService.getLeaveRequestById(id),
    enabled: options?.enabled,
  });
}

export function useLeaveFormData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: leaveRequestKeys.formData(),
    queryFn: () => leaveRequestService.getFormData(),
    enabled: options?.enabled,
  });
}

export function useMyLeaveBalance() {
  return useQuery({
    queryKey: leaveRequestKeys.myBalance(),
    queryFn: () => leaveRequestService.getMyLeaveBalance(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useEmployeeLeaveBalance(employeeId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: leaveRequestKeys.employeeBalance(employeeId),
    queryFn: () => leaveRequestService.getEmployeeLeaveBalance(employeeId),
    enabled: options?.enabled,
  });
}

export function useMyLeaveRequests(filters?: LeaveRequestFilters) {
  return useQuery({
    queryKey: leaveRequestKeys.selfList(filters),
    queryFn: () => leaveRequestService.getMyLeaveRequests(filters),
    staleTime: 1000 * 30,
    placeholderData: (previousData) => previousData,
  });
}

export function useMyLeaveRequest(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: leaveRequestKeys.selfDetail(id),
    queryFn: () => leaveRequestService.getMyLeaveRequestById(id),
    enabled: options?.enabled,
  });
}

export function useMyLeaveFormData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: leaveRequestKeys.myFormData(),
    queryFn: () => leaveRequestService.getMyFormData(),
    enabled: options?.enabled,
    staleTime: 1000 * 60 * 10,
  });
}

export function useLeaveRequestAuditTrail(
  id: string,
  params?: { page?: number; per_page?: number },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: leaveRequestKeys.auditTrail(id, params),
    queryFn: () => leaveRequestService.getLeaveRequestAuditTrail(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

// Mutation hooks
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLeaveRequestPayload) =>
      leaveRequestService.createLeaveRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.myBalance() });
    },
  });
}

export function useUpdateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeaveRequestPayload }) =>
      leaveRequestService.updateLeaveRequest(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: leaveRequestKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => leaveRequestService.deleteLeaveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.myBalance() });
    },
  });
}

export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveLeaveRequestPayload }) =>
      leaveRequestService.approveLeaveRequest(id, data),
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: leaveRequestKeys.lists() });

      // Snapshot previous value
      const previousData = queryClient.getQueriesData({
        queryKey: leaveRequestKeys.lists(),
      });

      // Optimistically update all list queries
      queryClient.setQueriesData<LeaveRequestsResponse>({ queryKey: leaveRequestKeys.lists() }, (old) => {
        if (!old?.data) return old;
        
        return {
          ...old,
          data: old.data.map((item: LeaveRequest) =>
            item.id === id
              ? { ...item, status: "APPROVED" as const }
              : item
          ),
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.myBalance() });
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.auditTrail(variables.id) });
    },
  });
}

export function useRejectLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectLeaveRequestPayload }) =>
      leaveRequestService.rejectLeaveRequest(id, data),
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: leaveRequestKeys.lists() });

      // Snapshot previous value
      const previousData = queryClient.getQueriesData({
        queryKey: leaveRequestKeys.lists(),
      });

      // Optimistically update all list queries
      queryClient.setQueriesData<LeaveRequestsResponse>({ queryKey: leaveRequestKeys.lists() }, (old) => {
        if (!old?.data) return old;
        
        return {
          ...old,
          data: old.data.map((item: LeaveRequest) =>
            item.id === id
              ? { ...item, status: "REJECTED" as const }
              : item
          ),
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.myBalance() });
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.auditTrail(variables.id) });
    },
  });
}

export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelLeaveRequestPayload }) =>
      leaveRequestService.cancelLeaveRequest(id, data),
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: leaveRequestKeys.lists() });

      // Snapshot previous value
      const previousData = queryClient.getQueriesData({
        queryKey: leaveRequestKeys.lists(),
      });

      // Optimistically update all list queries
      queryClient.setQueriesData<LeaveRequestsResponse>({ queryKey: leaveRequestKeys.lists() }, (old) => {
        if (!old?.data) return old;
        
        return {
          ...old,
          data: old.data.map((item: LeaveRequest) =>
            item.id === id
              ? { ...item, status: "CANCELLED" as const }
              : item
          ),
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.myBalance() });
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.auditTrail(variables.id) });
    },
  });
}

export function useReapproveLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveLeaveRequestPayload }) =>
      leaveRequestService.reapproveLeaveRequest(id, data),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: leaveRequestKeys.lists() });

      const previousData = queryClient.getQueriesData({
        queryKey: leaveRequestKeys.lists(),
      });

      queryClient.setQueriesData<LeaveRequestsResponse>({ queryKey: leaveRequestKeys.lists() }, (old) => {
        if (!old?.data) return old;

        return {
          ...old,
          data: old.data.map((item: LeaveRequest) =>
            item.id === id
              ? { ...item, status: "APPROVED" as const }
              : item
          ),
        };
      });

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.myBalance() });
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.auditTrail(variables.id) });
    },
  });
}

export function useCreateMyLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<CreateLeaveRequestPayload, "employee_id">) =>
      leaveRequestService.createMyLeaveRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.selfLists() });
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.myBalance() });
    },
  });
}

export function useUpdateMyLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeaveRequestPayload }) =>
      leaveRequestService.updateMyLeaveRequest(id, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.selfLists() });
      queryClient.invalidateQueries({
        queryKey: leaveRequestKeys.selfDetail(variables.id),
      });
    },
  });
}

export function useCancelMyLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelLeaveRequestPayload }) =>
      leaveRequestService.cancelMyLeaveRequest(id, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.selfLists() });
      queryClient.invalidateQueries({
        queryKey: leaveRequestKeys.selfDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.myBalance() });
    },
  });
}
