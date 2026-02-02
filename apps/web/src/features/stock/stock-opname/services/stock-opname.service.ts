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
} from "../types";

const BASE_PATH = "/stock-opnames";

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
      `${BASE_PATH}/${id}/status`,
      data
    );
    return response.data;
  },
  
  // Items
  async getItems(id: string): Promise<StockOpnameItemsListResponse> {
      const response = await apiClient.get<StockOpnameItemsListResponse>(
          `${BASE_PATH}/${id}/items`
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
  }
};
