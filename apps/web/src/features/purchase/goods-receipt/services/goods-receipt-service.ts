import apiClient from "@/lib/api-client";
import type {
  GoodsReceiptListResponse,
  GoodsReceiptResponse,
  GoodsReceiptAddDataResponse,
  DeleteGoodsReceiptResponse,
  ConfirmGoodsReceiptResponse,
} from "../types";
import type {
  CreateGoodsReceiptFormData,
  UpdateGoodsReceiptFormData,
} from "../schemas/goods-receipt.schema";

export const goodsReceiptService = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    searchBy?: string;
    status?: "PENDING" | "RECEIVED" | "PARTIAL";
    sort_by?: string;
    sort_order?: "asc" | "desc";
    start_date?: string;
    end_date?: string;
  }): Promise<GoodsReceiptListResponse> {
    const response = await apiClient.get<GoodsReceiptListResponse>(
      "/purchase/goods-receipts",
      {
        params,
      }
    );
    return response.data;
  },

  async getById(id: number): Promise<GoodsReceiptResponse> {
    const response = await apiClient.get<GoodsReceiptResponse>(
      `/purchase/goods-receipts/${id}`
    );
    return response.data;
  },

  async getAddData(): Promise<GoodsReceiptAddDataResponse> {
    const response = await apiClient.get<GoodsReceiptAddDataResponse>(
      "/purchase/goods-receipts/add"
    );
    return response.data;
  },

  async create(
    data: CreateGoodsReceiptFormData
  ): Promise<GoodsReceiptResponse> {
    const response = await apiClient.post<GoodsReceiptResponse>(
      "/purchase/goods-receipts",
      data
    );
    return response.data;
  },

  async update(
    id: number,
    data: UpdateGoodsReceiptFormData
  ): Promise<GoodsReceiptResponse> {
    const response = await apiClient.put<GoodsReceiptResponse>(
      `/purchase/goods-receipts/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: number): Promise<DeleteGoodsReceiptResponse> {
    const response = await apiClient.delete<DeleteGoodsReceiptResponse>(
      `/purchase/goods-receipts/${id}`
    );
    return response.data;
  },

  async confirm(id: number): Promise<ConfirmGoodsReceiptResponse> {
    const response = await apiClient.post<ConfirmGoodsReceiptResponse>(
      `/purchase/goods-receipts/${id}/confirm`
    );
    return response.data;
  },
};




