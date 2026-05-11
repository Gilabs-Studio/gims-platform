import apiClient from "@/lib/api-client";
import type { ApiResponse } from "@/features/crm/targets/types";
import type {
  EmployeeSalesTarget,
  ListSalesTargetsParams,
  CreateSalesTargetInput,
  UpdateSalesTargetInput,
} from "../types";

const BASE_PATH = "/sales/sales-targets";

export const salesTargetsService = {
  async list(params?: ListSalesTargetsParams) {
    const response = await apiClient.get<ApiResponse<EmployeeSalesTarget[]>>(BASE_PATH, {
      params,
    });
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<ApiResponse<EmployeeSalesTarget>>(`${BASE_PATH}/${id}`);
    return response.data;
  },

  async create(data: CreateSalesTargetInput) {
    const response = await apiClient.post<ApiResponse<EmployeeSalesTarget>>(BASE_PATH, data);
    return response.data;
  },

  async update({ id, data }: { id: string; data: UpdateSalesTargetInput }) {
    const response = await apiClient.put<ApiResponse<EmployeeSalesTarget>>(
      `${BASE_PATH}/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string) {
    const response = await apiClient.delete<ApiResponse<void>>(`${BASE_PATH}/${id}`);
    return response.data;
  },
};
