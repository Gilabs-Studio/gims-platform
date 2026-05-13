import apiClient from "@/lib/api-client";
import type {
  StockOpnameListResponse,
  StockOpnameSingleResponse,
  StockOpnameItemsListResponse,
  StockOpnameFilter,
  CreateStockOpnameRequest,
  UpdateStockOpnameRequest,
  UpdateStockOpnameStatusRequest,
  SaveStockOpnameItemsRequest,
  StockOpnameItemsFilter,
  ProductStockLedgerFilter,
  ProductStockLedgerListResponse,
  InventoryStockLevelListResponse,
  UserWarehouseInfo,
} from "../types";

const BASE_PATH = "/inventory/opname";
const LEGACY_BASE_PATH = "/stock-opnames";

export const stockOpnameService = {
  async list(
    params?: StockOpnameFilter
  ): Promise<StockOpnameListResponse> {
    const response = await apiClient.get<StockOpnameListResponse>(
      BASE_PATH,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<StockOpnameSingleResponse> {
    const response = await apiClient.get<StockOpnameSingleResponse>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },

  async create(
    data: CreateStockOpnameRequest
  ): Promise<StockOpnameSingleResponse> {
    const response = await apiClient.post<StockOpnameSingleResponse>(
      BASE_PATH,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateStockOpnameRequest
  ): Promise<StockOpnameSingleResponse> {
    const response = await apiClient.put<StockOpnameSingleResponse>(
      `${BASE_PATH}/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },

  async updateStatus(
    id: string,
    data: UpdateStockOpnameStatusRequest
  ): Promise<StockOpnameSingleResponse> {
    const response = await apiClient.post<StockOpnameSingleResponse>(
      `${LEGACY_BASE_PATH}/${id}/status`,
      data
    );
    return response.data;
  },

  async generateJournal(id: string): Promise<StockOpnameSingleResponse> {
    const response = await apiClient.post<StockOpnameSingleResponse>(
      `${BASE_PATH}/${id}/generate-journal`
    );
    return response.data;
  },

  async submitApproval(id: string): Promise<StockOpnameSingleResponse> {
    const response = await apiClient.post<StockOpnameSingleResponse>(
      `${BASE_PATH}/${id}/submit-approval`
    );
    return response.data;
  },
  
  // Items
    async getItems(id: string, params?: StockOpnameItemsFilter): Promise<StockOpnameItemsListResponse> {
      const response = await apiClient.get<StockOpnameItemsListResponse>(
        `${BASE_PATH}/${id}/items`,
        { params }
      );
      return response.data;
  },
  
  async saveItems(id: string, data: SaveStockOpnameItemsRequest): Promise<StockOpnameSingleResponse> {
      // Logic assumes PUT replaces items/updates them
       const response = await apiClient.put<StockOpnameSingleResponse>(
          `${BASE_PATH}/${id}/items`,
          data
      );
      return response.data;
  },

  async getProductLedgers(
    productId: string,
    params?: ProductStockLedgerFilter,
  ): Promise<ProductStockLedgerListResponse> {
    const response = await apiClient.get<ProductStockLedgerListResponse>(
      `/inventory/products/${productId}/ledgers`,
      { params },
    );
    return response.data;
  },

  async getProductStockLevel(
    productId: string,
    warehouseId: string,
  ): Promise<InventoryStockLevelListResponse> {
    const response = await apiClient.get<InventoryStockLevelListResponse>(
      `/inventory/stock`,
      { params: { product_id: productId, warehouse_id: warehouseId, per_page: 1 } },
    );
    return response.data;
  },

  async getMyWarehouses(): Promise<{ success: boolean; data: UserWarehouseInfo[] }> {
    const response = await apiClient.get<{ success: boolean; data: UserWarehouseInfo[] }>(
      `${BASE_PATH}/my-warehouses`,
    );
    return response.data;
  },

  async getItemsAll(id: string, page: number, perPage: number): Promise<StockOpnameItemsListResponse> {
    return this.getItems(id, { page, per_page: perPage });
  },

  async saveItemLines(id: string, data: SaveStockOpnameItemsRequest): Promise<StockOpnameSingleResponse> {
    const response = await apiClient.put<StockOpnameSingleResponse>(
      `${BASE_PATH}/${id}/lines`,
      data
    );
    return response.data;
  },
};
