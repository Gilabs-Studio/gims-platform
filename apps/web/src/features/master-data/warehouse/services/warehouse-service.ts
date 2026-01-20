import { apiClient } from "@/lib/api-client";
import type {
  Warehouse,
  CreateWarehouseData,
  UpdateWarehouseData,
  WarehouseListParams,
  WarehouseListResponse,
  WarehouseSingleResponse,
} from "../types";

const BASE_PATH = "/warehouse";

// ============================================
// Warehouse Service
// ============================================

export const warehouseService = {
  async list(
    params?: WarehouseListParams
  ): Promise<WarehouseListResponse<Warehouse>> {
    const response = await apiClient.get<WarehouseListResponse<Warehouse>>(
      `${BASE_PATH}/warehouses`,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<WarehouseSingleResponse<Warehouse>> {
    const response = await apiClient.get<WarehouseSingleResponse<Warehouse>>(
      `${BASE_PATH}/warehouses/${id}`
    );
    return response.data;
  },

  async create(
    data: CreateWarehouseData
  ): Promise<WarehouseSingleResponse<Warehouse>> {
    const response = await apiClient.post<WarehouseSingleResponse<Warehouse>>(
      `${BASE_PATH}/warehouses`,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateWarehouseData
  ): Promise<WarehouseSingleResponse<Warehouse>> {
    const response = await apiClient.put<WarehouseSingleResponse<Warehouse>>(
      `${BASE_PATH}/warehouses/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<WarehouseSingleResponse<null>> {
    const response = await apiClient.delete<WarehouseSingleResponse<null>>(
      `${BASE_PATH}/warehouses/${id}`
    );
    return response.data;
  },
};
