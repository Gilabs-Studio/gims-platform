import apiClient from "@/lib/api-client";
import type {
  PurchaseOrderListResponse,
  PurchaseOrderResponse,
  PurchaseOrderAddDataResponse,
  DeletePurchaseOrderResponse,
  ConfirmPurchaseOrderResponse,
} from "../types";
import type {
  CreatePurchaseOrderFormData,
  UpdatePurchaseOrderFormData,
} from "../schemas/purchase-order.schema";

export const purchaseOrderService = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    searchBy?: string;
    status?: "DRAFT" | "APPROVED" | "REVISED" | "CLOSED";
    sort_by?: string;
    sort_order?: "asc" | "desc";
    start_date?: string;
    end_date?: string;
  }): Promise<PurchaseOrderListResponse> {
    const response = await apiClient.get<PurchaseOrderListResponse>(
      "/purchase/purchase-orders",
      {
        params,
      }
    );
    return response.data;
  },

  async getById(id: number): Promise<PurchaseOrderResponse> {
    const response = await apiClient.get<PurchaseOrderResponse>(
      `/purchase/purchase-orders/${id}`
    );
    return response.data;
  },

  async getAddData(): Promise<PurchaseOrderAddDataResponse> {
    const response = await apiClient.get<PurchaseOrderAddDataResponse>(
      "/purchase/purchase-orders/add"
    );
    return response.data;
  },

  async create(
    data: CreatePurchaseOrderFormData
  ): Promise<PurchaseOrderResponse> {
    const response = await apiClient.post<PurchaseOrderResponse>(
      "/purchase/purchase-orders",
      data
    );
    return response.data;
  },

  async update(
    id: number,
    data: UpdatePurchaseOrderFormData
  ): Promise<PurchaseOrderResponse> {
    const response = await apiClient.put<PurchaseOrderResponse>(
      `/purchase/purchase-orders/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: number): Promise<DeletePurchaseOrderResponse> {
    const response = await apiClient.delete<DeletePurchaseOrderResponse>(
      `/purchase/purchase-orders/${id}`
    );
    return response.data;
  },

  async confirm(id: number): Promise<ConfirmPurchaseOrderResponse> {
    const response = await apiClient.post<ConfirmPurchaseOrderResponse>(
      `/purchase/purchase-orders/${id}/confirm`
    );
    return response.data;
  },
};

