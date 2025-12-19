import apiClient from "@/lib/api-client";
import type {
  PurchaseRequisitionListResponse,
  PurchaseRequisitionResponse,
  PurchaseRequisitionAddDataResponse,
  ApproveRequisitionResponse,
  RejectRequisitionResponse,
  ConvertRequisitionResponse,
  DeletePurchaseRequisitionResponse,
} from "../types";
import type {
  CreatePurchaseRequisitionFormData,
  UpdatePurchaseRequisitionFormData,
} from "../schemas/purchase-requisition.schema";

export const purchaseRequisitionService = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    searchBy?: string;
    status?: "DRAFT" | "APPROVED" | "REJECTED" | "CONVERTED";
    sort_by?: string;
    sort_order?: "asc" | "desc";
    start_date?: string;
    end_date?: string;
  }): Promise<PurchaseRequisitionListResponse> {
    const response = await apiClient.get<PurchaseRequisitionListResponse>(
      "/purchase/purchase-requisitions",
      {
        params,
      }
    );
    return response.data;
  },

  async getById(id: number): Promise<PurchaseRequisitionResponse> {
    const response = await apiClient.get<PurchaseRequisitionResponse>(
      `/purchase/purchase-requisitions/${id}`
    );
    return response.data;
  },

  async getAddData(): Promise<PurchaseRequisitionAddDataResponse> {
    const response = await apiClient.get<PurchaseRequisitionAddDataResponse>(
      "/purchase/purchase-requisitions/add"
    );
    return response.data;
  },

  async create(
    data: CreatePurchaseRequisitionFormData
  ): Promise<PurchaseRequisitionResponse> {
    const response = await apiClient.post<PurchaseRequisitionResponse>(
      "/purchase/purchase-requisitions",
      data
    );
    return response.data;
  },

  async update(
    id: number,
    data: UpdatePurchaseRequisitionFormData
  ): Promise<PurchaseRequisitionResponse> {
    const response = await apiClient.put<PurchaseRequisitionResponse>(
      `/purchase/purchase-requisitions/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: number): Promise<DeletePurchaseRequisitionResponse> {
    const response = await apiClient.delete<DeletePurchaseRequisitionResponse>(
      `/purchase/purchase-requisitions/${id}`
    );
    return response.data;
  },

  async approve(id: number): Promise<ApproveRequisitionResponse> {
    const response = await apiClient.post<ApproveRequisitionResponse>(
      `/purchase/purchase-requisitions/${id}/approve`
    );
    return response.data;
  },

  async reject(id: number): Promise<RejectRequisitionResponse> {
    const response = await apiClient.post<RejectRequisitionResponse>(
      `/purchase/purchase-requisitions/${id}/reject`
    );
    return response.data;
  },

  async convert(id: number): Promise<ConvertRequisitionResponse> {
    const response = await apiClient.post<ConvertRequisitionResponse>(
      `/purchase/purchase-requisitions/${id}/convert`
    );
    return response.data;
  },
};

