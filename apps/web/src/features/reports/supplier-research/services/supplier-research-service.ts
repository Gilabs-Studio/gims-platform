import { apiClient } from "@/lib/api-client";
import type {
  ListSupplierDeliveryTimeRequest,
  ListSupplierDeliveryTimeResponse,
  ListSupplierPurchaseVolumeRequest,
  ListSupplierPurchaseVolumeResponse,
  ListSuppliersTableRequest,
  ListSuppliersTableResponse,
  SupplierDetailResponse,
  SupplierResearchKpisResponse,
  SupplierSpendTrendResponse,
} from "../types";

export const supplierResearchService = {
  async getKpis(params?: {
    start_date?: string;
    end_date?: string;
    category_ids?: string[];
    min_purchase_value?: number;
    max_purchase_value?: number;
  }): Promise<SupplierResearchKpisResponse> {
    const response = await apiClient.get<SupplierResearchKpisResponse>(
      "/reports/supplier-research/kpis",
      { params }
    );

    return response.data;
  },

  async getPurchaseVolume(
    params?: ListSupplierPurchaseVolumeRequest
  ): Promise<ListSupplierPurchaseVolumeResponse> {
    const response = await apiClient.get<ListSupplierPurchaseVolumeResponse>(
      "/reports/supplier-research/purchase-volume",
      { params }
    );

    return response.data;
  },

  async getDeliveryTime(
    params?: ListSupplierDeliveryTimeRequest
  ): Promise<ListSupplierDeliveryTimeResponse> {
    const response = await apiClient.get<ListSupplierDeliveryTimeResponse>(
      "/reports/supplier-research/delivery-time",
      { params }
    );

    return response.data;
  },

  async getSpendTrend(params?: {
    start_date?: string;
    end_date?: string;
    category_ids?: string[];
    min_purchase_value?: number;
    max_purchase_value?: number;
    interval?: "daily" | "weekly" | "monthly";
  }): Promise<SupplierSpendTrendResponse> {
    const response = await apiClient.get<SupplierSpendTrendResponse>(
      "/reports/supplier-research/spend-trend",
      { params }
    );

    return response.data;
  },

  async listSuppliers(
    params?: ListSuppliersTableRequest
  ): Promise<ListSuppliersTableResponse> {
    const response = await apiClient.get<ListSuppliersTableResponse>(
      "/reports/supplier-research/suppliers",
      { params }
    );

    return response.data;
  },

  async getSupplierDetail(supplierId: string): Promise<SupplierDetailResponse> {
    const response = await apiClient.get<SupplierDetailResponse>(
      `/reports/supplier-research/suppliers/${supplierId}`
    );

    return response.data;
  },
};
