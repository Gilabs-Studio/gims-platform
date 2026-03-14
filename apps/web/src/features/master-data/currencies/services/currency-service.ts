import { apiClient } from "@/lib/api-client";
import type { ApiResponse, CreateCurrencyData, Currency, CurrencyListParams, UpdateCurrencyData } from "../types";

const BASE_URL = "/master-data/currencies";

export const currencyService = {
  list: async (params?: CurrencyListParams): Promise<ApiResponse<Currency[]>> => {
    const response = await apiClient.get<ApiResponse<Currency[]>>(BASE_URL, { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Currency>> => {
    const response = await apiClient.get<ApiResponse<Currency>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  create: async (data: CreateCurrencyData): Promise<ApiResponse<Currency>> => {
    const response = await apiClient.post<ApiResponse<Currency>>(BASE_URL, data);
    return response.data;
  },

  update: async (id: string, data: UpdateCurrencyData): Promise<ApiResponse<Currency>> => {
    const response = await apiClient.put<ApiResponse<Currency>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`${BASE_URL}/${id}`);
    return response.data;
  },
};