import apiClient from "@/lib/api-client";
import type {
  MenuListResponse,
  MenuResponse,
  MenuStatsResponse,
  CreateMenuRequest,
  UpdateMenuRequest,
} from "../types";

export const menuService = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    searchBy?: string;
    sort_by?: string;
    sort_order?: "asc" | "desc";
  }): Promise<MenuListResponse> {
    const response = await apiClient.get<MenuListResponse>("/master-data/menus", {
      params,
    });
    return response.data;
  },

  async getById(id: number): Promise<MenuResponse> {
    const response = await apiClient.get<MenuResponse>(`/master-data/menus/${id}`);
    return response.data;
  },

  async getStats(): Promise<MenuStatsResponse> {
    const response = await apiClient.get<MenuStatsResponse>("/master-data/menus/stats");
    return response.data;
  },

  async create(data: CreateMenuRequest): Promise<MenuResponse> {
    const response = await apiClient.post<MenuResponse>("/master-data/menus", data);
    return response.data;
  },

  async update(id: number, data: UpdateMenuRequest): Promise<MenuResponse> {
    const response = await apiClient.put<MenuResponse>(`/master-data/menus/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/master-data/menus/${id}`);
    return response.data;
  },
};
