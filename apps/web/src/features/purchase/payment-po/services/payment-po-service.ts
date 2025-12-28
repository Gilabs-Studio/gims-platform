import apiClient from "@/lib/api-client";
import type {
  PaymentPOListResponse,
  PaymentPOResponse,
  PaymentPOAddDataResponse,
  DeletePaymentPOResponse,
  ConfirmPaymentPOResponse,
} from "../types";
import type {
  CreatePaymentPOFormData,
  UpdatePaymentPOFormData,
} from "../schemas/payment-po.schema";

export const paymentPOService = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    searchBy?: string;
    status?: "PENDING" | "CONFIRMED";
    sort_by?: string;
    sort_order?: "asc" | "desc";
    start_date?: string;
    end_date?: string;
  }): Promise<PaymentPOListResponse> {
    const response = await apiClient.get<PaymentPOListResponse>(
      "/purchase/payments",
      {
        params,
      }
    );
    return response.data;
  },

  async getById(id: number): Promise<PaymentPOResponse> {
    const response = await apiClient.get<PaymentPOResponse>(
      `/purchase/payments/${id}`
    );
    return response.data;
  },

  async getAddData(): Promise<PaymentPOAddDataResponse> {
    const response = await apiClient.get<PaymentPOAddDataResponse>(
      "/purchase/payments/add"
    );
    return response.data;
  },

  async create(
    data: CreatePaymentPOFormData
  ): Promise<PaymentPOResponse> {
    const response = await apiClient.post<PaymentPOResponse>(
      "/purchase/payments",
      data
    );
    return response.data;
  },

  async update(
    id: number,
    data: UpdatePaymentPOFormData
  ): Promise<PaymentPOResponse> {
    const response = await apiClient.put<PaymentPOResponse>(
      `/purchase/payments/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: number): Promise<DeletePaymentPOResponse> {
    const response = await apiClient.delete<DeletePaymentPOResponse>(
      `/purchase/payments/${id}`
    );
    return response.data;
  },

  async confirm(id: number): Promise<ConfirmPaymentPOResponse> {
    const response = await apiClient.post<ConfirmPaymentPOResponse>(
      `/purchase/payments/${id}/confirm`
    );
    return response.data;
  },
};
