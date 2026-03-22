import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { assetMaintenanceService } from "../services/asset-maintenance-service";
import type {
  CreateMaintenanceScheduleInput,
  UpdateMaintenanceScheduleInput,
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  UpdateWorkOrderStatusInput,
  WorkOrderSparePartInput,
  CreateSparePartInput,
  UpdateSparePartInput,
  UpdateSparePartStockInput,
  ListMaintenanceSchedulesParams,
  ListWorkOrdersParams,
  ListSparePartsParams,
} from "../types";

const QUERY_KEYS = {
  dashboard: ["asset-maintenance", "dashboard"] as const,
  alerts: ["asset-maintenance", "alerts"] as const,
  formData: ["asset-maintenance", "form-data"] as const,
  schedules: ["asset-maintenance", "schedules"] as const,
  schedule: (id: string) => ["asset-maintenance", "schedules", id] as const,
  workOrders: ["asset-maintenance", "work-orders"] as const,
  workOrder: (id: string) => ["asset-maintenance", "work-orders", id] as const,
  spareParts: ["asset-maintenance", "spare-parts"] as const,
  sparePart: (id: string) => ["asset-maintenance", "spare-parts", id] as const,
};

// ==================== Dashboard & Alerts ====================

export function useMaintenanceDashboard() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard,
    queryFn: () => assetMaintenanceService.getDashboard(),
  });
}

export function useMaintenanceAlerts() {
  return useQuery({
    queryKey: QUERY_KEYS.alerts,
    queryFn: () => assetMaintenanceService.getAlerts(),
  });
}

export function useMaintenanceFormData() {
  return useQuery({
    queryKey: QUERY_KEYS.formData,
    queryFn: () => assetMaintenanceService.getFormData(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ==================== Maintenance Schedules ====================

export function useMaintenanceSchedules(params?: ListMaintenanceSchedulesParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.schedules, params],
    queryFn: () => assetMaintenanceService.listSchedules(params),
  });
}

export function useMaintenanceSchedule(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.schedule(id),
    queryFn: () => assetMaintenanceService.getSchedule(id),
    enabled: !!id,
  });
}

export function useCreateMaintenanceSchedule() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetMaintenance");

  return useMutation({
    mutationFn: assetMaintenanceService.createSchedule,
    onSuccess: () => {
      toast.success(t("toast.scheduleCreated"));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.schedules });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}

export function useUpdateMaintenanceSchedule() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetMaintenance");

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMaintenanceScheduleInput }) =>
      assetMaintenanceService.updateSchedule(id, data),
    onSuccess: (_, variables) => {
      toast.success(t("toast.scheduleUpdated"));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.schedules });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.schedule(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}

export function useDeleteMaintenanceSchedule() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetMaintenance");

  return useMutation({
    mutationFn: assetMaintenanceService.deleteSchedule,
    onSuccess: () => {
      toast.success(t("toast.scheduleDeleted"));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.schedules });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}

// ==================== Work Orders ====================

export function useWorkOrders(params?: ListWorkOrdersParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.workOrders, params],
    queryFn: () => assetMaintenanceService.listWorkOrders(params),
  });
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.workOrder(id),
    queryFn: () => assetMaintenanceService.getWorkOrder(id),
    enabled: !!id,
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetMaintenance");

  return useMutation({
    mutationFn: assetMaintenanceService.createWorkOrder,
    onSuccess: () => {
      toast.success(t("toast.workOrderCreated"));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workOrders });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}

export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetMaintenance");

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkOrderInput }) =>
      assetMaintenanceService.updateWorkOrder(id, data),
    onSuccess: (_, variables) => {
      toast.success(t("toast.workOrderUpdated"));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workOrders });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.workOrder(variables.id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}

export function useUpdateWorkOrderStatus() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetMaintenance");

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkOrderStatusInput }) =>
      assetMaintenanceService.updateWorkOrderStatus(id, data),
    onSuccess: (_, variables) => {
      toast.success(t("toast.workOrderStatusUpdated"));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workOrders });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.workOrder(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.schedules });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}

export function useDeleteWorkOrder() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetMaintenance");

  return useMutation({
    mutationFn: assetMaintenanceService.deleteWorkOrder,
    onSuccess: () => {
      toast.success(t("toast.workOrderDeleted"));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workOrders });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}

export function useAddSparePartToWorkOrder() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetMaintenance");

  return useMutation({
    mutationFn: ({ workOrderId, data }: { workOrderId: string; data: WorkOrderSparePartInput }) =>
      assetMaintenanceService.addSparePartToWorkOrder(workOrderId, data),
    onSuccess: (_, variables) => {
      toast.success(t("toast.sparePartAdded"));
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.workOrder(variables.workOrderId),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.spareParts });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}

export function useRemoveSparePartFromWorkOrder() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetMaintenance");

  return useMutation({
    mutationFn: ({ workOrderId, sparePartUsageId }: { workOrderId: string; sparePartUsageId: string }) =>
      assetMaintenanceService.removeSparePartFromWorkOrder(workOrderId, sparePartUsageId),
    onSuccess: (_, variables) => {
      toast.success(t("toast.sparePartRemoved"));
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.workOrder(variables.workOrderId),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.spareParts });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}

// ==================== Spare Parts ====================

export function useSpareParts(params?: ListSparePartsParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.spareParts, params],
    queryFn: () => assetMaintenanceService.listSpareParts(params),
  });
}

export function useSparePart(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.sparePart(id),
    queryFn: () => assetMaintenanceService.getSparePart(id),
    enabled: !!id,
  });
}

export function useCreateSparePart() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetMaintenance");

  return useMutation({
    mutationFn: assetMaintenanceService.createSparePart,
    onSuccess: () => {
      toast.success(t("toast.sparePartCreated"));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.spareParts });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}

export function useUpdateSparePart() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetMaintenance");

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSparePartInput }) =>
      assetMaintenanceService.updateSparePart(id, data),
    onSuccess: (_, variables) => {
      toast.success(t("toast.sparePartUpdated"));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.spareParts });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.sparePart(variables.id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}

export function useUpdateSparePartStock() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetMaintenance");

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSparePartStockInput }) =>
      assetMaintenanceService.updateSparePartStock(id, data),
    onSuccess: (_, variables) => {
      toast.success(t("toast.stockUpdated"));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.spareParts });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.sparePart(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}

export function useDeleteSparePart() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetMaintenance");

  return useMutation({
    mutationFn: assetMaintenanceService.deleteSparePart,
    onSuccess: () => {
      toast.success(t("toast.sparePartDeleted"));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.spareParts });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}

// ==================== Asset-Spare Part Links ====================

export function useLinkAssetToSparePart() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetMaintenance");

  return useMutation({
    mutationFn: assetMaintenanceService.linkAssetToSparePart,
    onSuccess: () => {
      toast.success(t("toast.assetLinked"));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.spareParts });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}

export function useUnlinkAssetFromSparePart() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetMaintenance");

  return useMutation({
    mutationFn: ({ assetId, sparePartId }: { assetId: string; sparePartId: string }) =>
      assetMaintenanceService.unlinkAssetFromSparePart(assetId, sparePartId),
    onSuccess: () => {
      toast.success(t("toast.assetUnlinked"));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.spareParts });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}
