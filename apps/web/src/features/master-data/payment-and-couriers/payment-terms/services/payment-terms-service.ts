import { apiClient } from "@/lib/api-client";
import type {
  PaymentTerms,
  CreatePaymentTermsData,
  UpdatePaymentTermsData,
  PaymentTermsListParams,
  ApiResponse,
} from "../types";

const BASE_URL = "/master-data/payment-terms";

export const paymentTermsService = {
  list: async (
    params?: PaymentTermsListParams,
  ): Promise<ApiResponse<PaymentTerms[]>> => {
    const response = await apiClient.get<ApiResponse<PaymentTerms[]>>(BASE_URL, {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<PaymentTerms>> => {
    const response = await apiClient.get<ApiResponse<PaymentTerms>>(
      `${BASE_URL}/${id}`,
    );
    return response.data;
  },

  create: async (
    data: CreatePaymentTermsData,
  ): Promise<ApiResponse<PaymentTerms>> => {
    const response = await apiClient.post<ApiResponse<PaymentTerms>>(
      BASE_URL,
      data,
    );
    return response.data;
  },

  update: async (
    id: string,
    data: UpdatePaymentTermsData,
  ): Promise<ApiResponse<PaymentTerms>> => {
    const response = await apiClient.put<ApiResponse<PaymentTerms>>(
      `${BASE_URL}/${id}`,
      data,
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `${BASE_URL}/${id}`,
    );
    return response.data;
  },
};
