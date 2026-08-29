import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workOrderService } from "../services/work-order.service";
import type {
  CreateDeviationInput,
  CreateWorkOrderInput,
  UpdateWorkOrderStatusInput,
  WorkOrderFilterParams,
} from "../types/work-order.types";

export const workOrderKeys = {
  all: ["manufacturing", "work-orders"] as const,
  lists: () => [...workOrderKeys.all, "list"] as const,
  list: (params?: WorkOrderFilterParams) => [...workOrderKeys.lists(), params] as const,
  details: () => [...workOrderKeys.all, "detail"] as const,
  detail: (id: string) => [...workOrderKeys.details(), id] as const,
};

export function useWorkOrders(params?: WorkOrderFilterParams) {
  return useQuery({
    queryKey: workOrderKeys.list(params),
    queryFn: () => workOrderService.getWorkOrders(params),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useWorkOrderDetail(id: string | null) {
  return useQuery({
    queryKey: id ? workOrderKeys.detail(id) : ["manufacturing", "work-orders", "empty"],
    queryFn: () => (id ? workOrderService.getWorkOrderById(id) : null),
    enabled: Boolean(id),
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkOrderInput) => workOrderService.createWorkOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
    },
  });
}

export function useUpdateWorkOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateWorkOrderStatusInput) => workOrderService.updateWorkOrderStatus(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workOrderKeys.detail(data.id) });
    },
  });
}

export function useLogDeviation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDeviationInput) => workOrderService.logDeviation(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workOrderKeys.detail(data.id) });
    },
  });
}
