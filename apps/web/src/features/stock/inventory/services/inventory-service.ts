import { apiClient } from "@/lib/api-client";
import type { InventoryStockItem, InventoryFilters, ApiResponse, PaginatedResponse, InventoryTreeWarehouse, InventoryBatchItem } from "../types";

const BASE_URL = "/stock/inventory";

export const inventoryService = {
  getInventory: async (params: InventoryFilters & { page: number; per_page: number }) => {
    const searchParams = new URLSearchParams();
    searchParams.append("page", params.page.toString());
    searchParams.append("per_page", params.per_page.toString());
    
    if (params.search) searchParams.append("search", params.search);
    if (params.warehouse_id && params.warehouse_id !== "all") searchParams.append("warehouse_id", params.warehouse_id);
    if (params.low_stock) searchParams.append("low_stock", "true");

    const response = await apiClient.get<ApiResponse<PaginatedResponse<InventoryStockItem>>>(
      `${BASE_URL}?${searchParams.toString()}`
    );
    return response.data;
  },

  // Tree View
  getTreeWarehouses: async () => {
    const response = await apiClient.get<ApiResponse<InventoryTreeWarehouse[]>>("/stock/tree/warehouses");
    return response.data;
  },

  getTreeProducts: async (warehouseId: string, params: { page: number; per_page: number; search?: string }) => {
    const searchParams = new URLSearchParams();
    searchParams.append("warehouse_id", warehouseId);
    searchParams.append("page", params.page.toString());
    searchParams.append("per_page", params.per_page.toString());
    if (params.search) searchParams.append("search", params.search);

    const response = await apiClient.get<ApiResponse<PaginatedResponse<InventoryStockItem>>>(
      `/stock/tree/products?${searchParams.toString()}`
    );
    return response.data;
  },

  getTreeBatches: async (warehouseId: string, productId: string) => {
    const searchParams = new URLSearchParams();
    searchParams.append("warehouse_id", warehouseId);
    searchParams.append("product_id", productId);

    const response = await apiClient.get<ApiResponse<{ data: InventoryBatchItem[] }>>(
      `/stock/tree/batches?${searchParams.toString()}`
    );
    return response.data;
  },
};
