import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  MaintenanceSchedule,
  WorkOrder,
  SparePart,
  MaintenanceDashboard,
  MaintenanceAlert,
  MaintenanceFormData,
  CreateMaintenanceScheduleInput,
  UpdateMaintenanceScheduleInput,
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  UpdateWorkOrderStatusInput,
  WorkOrderSparePartInput,
  CreateSparePartInput,
  UpdateSparePartInput,
  UpdateSparePartStockInput,
  CreateAssetSparePartLinkInput,
  ListMaintenanceSchedulesParams,
  ListWorkOrdersParams,
  ListSparePartsParams,
} from "../types";

const BASE_URL = "/finance/maintenance";

export const assetMaintenanceService = {
  // Dashboard & Alerts
  getDashboard: async (): Promise<ApiResponse<MaintenanceDashboard>> => {
    const response = await apiClient.get<ApiResponse<MaintenanceDashboard>>(
      `${BASE_URL}/dashboard`,
    );
    return response.data;
  },

  getAlerts: async (): Promise<ApiResponse<MaintenanceAlert[]>> => {
    const response = await apiClient.get<ApiResponse<MaintenanceAlert[]>>(
      `${BASE_URL}/alerts`,
    );
    return response.data;
  },

  // Form Data
  getFormData: async (): Promise<ApiResponse<MaintenanceFormData>> => {
    const response = await apiClient.get<ApiResponse<MaintenanceFormData>>(
      `${BASE_URL}/form-data`,
    );
    return response.data;
  },

  // Maintenance Schedules
  listSchedules: async (
    params?: ListMaintenanceSchedulesParams,
  ): Promise<ApiResponse<MaintenanceSchedule[]>> => {
    const response = await apiClient.get<ApiResponse<MaintenanceSchedule[]>>(
      `${BASE_URL}/schedules`,
      { params },
    );
    return response.data;
  },

  getSchedule: async (id: string): Promise<ApiResponse<MaintenanceSchedule>> => {
    const response = await apiClient.get<ApiResponse<MaintenanceSchedule>>(
      `${BASE_URL}/schedules/${id}`,
    );
    return response.data;
  },

  createSchedule: async (
    data: CreateMaintenanceScheduleInput,
  ): Promise<ApiResponse<MaintenanceSchedule>> => {
    const response = await apiClient.post<ApiResponse<MaintenanceSchedule>>(
      `${BASE_URL}/schedules`,
      data,
    );
    return response.data;
  },

  updateSchedule: async (
    id: string,
    data: UpdateMaintenanceScheduleInput,
  ): Promise<ApiResponse<MaintenanceSchedule>> => {
    const response = await apiClient.put<ApiResponse<MaintenanceSchedule>>(
      `${BASE_URL}/schedules/${id}`,
      data,
    );
    return response.data;
  },

  deleteSchedule: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(
      `${BASE_URL}/schedules/${id}`,
    );
    return response.data;
  },

  // Work Orders
  listWorkOrders: async (
    params?: ListWorkOrdersParams,
  ): Promise<ApiResponse<WorkOrder[]>> => {
    const response = await apiClient.get<ApiResponse<WorkOrder[]>>(
      `${BASE_URL}/work-orders`,
      { params },
    );
    return response.data;
  },

  getWorkOrder: async (id: string): Promise<ApiResponse<WorkOrder>> => {
    const response = await apiClient.get<ApiResponse<WorkOrder>>(
      `${BASE_URL}/work-orders/${id}`,
    );
    return response.data;
  },

  createWorkOrder: async (
    data: CreateWorkOrderInput,
  ): Promise<ApiResponse<WorkOrder>> => {
    const response = await apiClient.post<ApiResponse<WorkOrder>>(
      `${BASE_URL}/work-orders`,
      data,
    );
    return response.data;
  },

  updateWorkOrder: async (
    id: string,
    data: UpdateWorkOrderInput,
  ): Promise<ApiResponse<WorkOrder>> => {
    const response = await apiClient.put<ApiResponse<WorkOrder>>(
      `${BASE_URL}/work-orders/${id}`,
      data,
    );
    return response.data;
  },

  updateWorkOrderStatus: async (
    id: string,
    data: UpdateWorkOrderStatusInput,
  ): Promise<ApiResponse<WorkOrder>> => {
    const response = await apiClient.put<ApiResponse<WorkOrder>>(
      `${BASE_URL}/work-orders/${id}/status`,
      data,
    );
    return response.data;
  },

  deleteWorkOrder: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(
      `${BASE_URL}/work-orders/${id}`,
    );
    return response.data;
  },

  // Work Order Spare Parts
  addSparePartToWorkOrder: async (
    workOrderId: string,
    data: WorkOrderSparePartInput,
  ): Promise<ApiResponse<WorkOrder>> => {
    const response = await apiClient.post<ApiResponse<WorkOrder>>(
      `${BASE_URL}/work-orders/${workOrderId}/spare-parts`,
      data,
    );
    return response.data;
  },

  removeSparePartFromWorkOrder: async (
    workOrderId: string,
    sparePartUsageId: string,
  ): Promise<ApiResponse<WorkOrder>> => {
    const response = await apiClient.delete<ApiResponse<WorkOrder>>(
      `${BASE_URL}/work-orders/${workOrderId}/spare-parts/${sparePartUsageId}`,
    );
    return response.data;
  },

  // Spare Parts
  listSpareParts: async (
    params?: ListSparePartsParams,
  ): Promise<ApiResponse<SparePart[]>> => {
    const response = await apiClient.get<ApiResponse<SparePart[]>>(
      `${BASE_URL}/spare-parts`,
      { params },
    );
    return response.data;
  },

  getSparePart: async (id: string): Promise<ApiResponse<SparePart>> => {
    const response = await apiClient.get<ApiResponse<SparePart>>(
      `${BASE_URL}/spare-parts/${id}`,
    );
    return response.data;
  },

  createSparePart: async (
    data: CreateSparePartInput,
  ): Promise<ApiResponse<SparePart>> => {
    const response = await apiClient.post<ApiResponse<SparePart>>(
      `${BASE_URL}/spare-parts`,
      data,
    );
    return response.data;
  },

  updateSparePart: async (
    id: string,
    data: UpdateSparePartInput,
  ): Promise<ApiResponse<SparePart>> => {
    const response = await apiClient.put<ApiResponse<SparePart>>(
      `${BASE_URL}/spare-parts/${id}`,
      data,
    );
    return response.data;
  },

  updateSparePartStock: async (
    id: string,
    data: UpdateSparePartStockInput,
  ): Promise<ApiResponse<SparePart>> => {
    const response = await apiClient.put<ApiResponse<SparePart>>(
      `${BASE_URL}/spare-parts/${id}/stock`,
      data,
    );
    return response.data;
  },

  deleteSparePart: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(
      `${BASE_URL}/spare-parts/${id}`,
    );
    return response.data;
  },

  // Asset-Spare Part Links
  linkAssetToSparePart: async (
    data: CreateAssetSparePartLinkInput,
  ): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(
      `${BASE_URL}/asset-spare-part-links`,
      data,
    );
    return response.data;
  },

  unlinkAssetFromSparePart: async (
    assetId: string,
    sparePartId: string,
  ): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `${BASE_URL}/asset-spare-part-links/${assetId}/${sparePartId}`,
    );
    return response.data;
  },
};

export default assetMaintenanceService;
