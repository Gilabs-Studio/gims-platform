import { apiClient } from "@/lib/api-client";
import type {
  ListProductPerformanceRequest,
  ListProductPerformanceResponse,
  MonthlyProductSalesResponse,
  GetProductDetailRequest,
  ProductDetailResponse,
  ListProductCustomersRequest,
  ListProductCustomersResponse,
  ListProductSalesRepsRequest,
  ListProductSalesRepsResponse,
  GetProductMonthlyTrendRequest,
  ProductMonthlyTrendResponse,
  ListCategoryPerformanceRequest,
  ListCategoryPerformanceResponse,
  ListSegmentPerformanceRequest,
  ListSegmentPerformanceResponse,
  ListTypePerformanceRequest,
  ListTypePerformanceResponse,
  ListPackagingPerformanceRequest,
  ListPackagingPerformanceResponse,
  ListProcurementTypePerformanceRequest,
  ListProcurementTypePerformanceResponse,
} from "../types";

export const productAnalysisService = {
  /** List product performance (ranked by sales metrics) */
  async listProductPerformance(
    params?: ListProductPerformanceRequest
  ): Promise<ListProductPerformanceResponse> {
    const response = await apiClient.get<ListProductPerformanceResponse>(
      "/reports/product-analysis/performance",
      { params }
    );
    return response.data;
  },

  /** Get monthly product sales overview chart data */
  async getMonthlyProductSales(
    startDate?: string,
    endDate?: string
  ): Promise<MonthlyProductSalesResponse> {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await apiClient.get<MonthlyProductSalesResponse>(
      "/reports/product-analysis/monthly-overview",
      { params }
    );
    return response.data;
  },

  /** Get detailed stats for a specific product */
  async getProductDetail(
    productId: string,
    params?: GetProductDetailRequest
  ): Promise<ProductDetailResponse> {
    const response = await apiClient.get<ProductDetailResponse>(
      `/reports/product-analysis/product/${productId}`,
      { params }
    );
    return response.data;
  },

  /** Get top customers buying a specific product */
  async getProductCustomers(
    productId: string,
    params?: ListProductCustomersRequest
  ): Promise<ListProductCustomersResponse> {
    const response = await apiClient.get<ListProductCustomersResponse>(
      `/reports/product-analysis/product/${productId}/customers`,
      { params }
    );
    return response.data;
  },

  /** Get top sales reps selling a specific product */
  async getProductSalesReps(
    productId: string,
    params?: ListProductSalesRepsRequest
  ): Promise<ListProductSalesRepsResponse> {
    const response = await apiClient.get<ListProductSalesRepsResponse>(
      `/reports/product-analysis/product/${productId}/sales-reps`,
      { params }
    );
    return response.data;
  },

  /** Get monthly trend for a specific product */
  async getProductMonthlyTrend(
    productId: string,
    params?: GetProductMonthlyTrendRequest
  ): Promise<ProductMonthlyTrendResponse> {
    const response = await apiClient.get<ProductMonthlyTrendResponse>(
      `/reports/product-analysis/product/${productId}/monthly-trend`,
      { params }
    );
    return response.data;
  },

  /** List category performance (aggregated from product sales) */
  async listCategoryPerformance(
    params?: ListCategoryPerformanceRequest
  ): Promise<ListCategoryPerformanceResponse> {
    const response = await apiClient.get<ListCategoryPerformanceResponse>(
      "/reports/product-analysis/category-performance",
      { params }
    );
    return response.data;
  },

  /** List segment performance (aggregated from product sales) */
  async listSegmentPerformance(
    params?: ListSegmentPerformanceRequest
  ): Promise<ListSegmentPerformanceResponse> {
    const response = await apiClient.get<ListSegmentPerformanceResponse>(
      "/reports/product-analysis/segment-performance",
      { params }
    );
    return response.data;
  },

  /** List product type performance (aggregated from product sales) */
  async listTypePerformance(
    params?: ListTypePerformanceRequest
  ): Promise<ListTypePerformanceResponse> {
    const response = await apiClient.get<ListTypePerformanceResponse>(
      "/reports/product-analysis/type-performance",
      { params }
    );
    return response.data;
  },

  /** List packaging performance (aggregated from product sales) */
  async listPackagingPerformance(
    params?: ListPackagingPerformanceRequest
  ): Promise<ListPackagingPerformanceResponse> {
    const response = await apiClient.get<ListPackagingPerformanceResponse>(
      "/reports/product-analysis/packaging-performance",
      { params }
    );
    return response.data;
  },

  /** List procurement type performance (aggregated from product sales) */
  async listProcurementTypePerformance(
    params?: ListProcurementTypePerformanceRequest
  ): Promise<ListProcurementTypePerformanceResponse> {
    const response =
      await apiClient.get<ListProcurementTypePerformanceResponse>(
        "/reports/product-analysis/procurement-type-performance",
        { params }
      );
    return response.data;
  },
};
