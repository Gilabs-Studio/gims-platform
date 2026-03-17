import { apiClient } from "@/lib/api-client";
import type {
  CustomerResearchKpisResponse,
  RevenueTrendResponse,
  ListCustomerResearchRequest,
  ListCustomerResearchResponse,
  CustomerRankResponse,
  CustomerDetailResponse,
  CustomerTopProductsResponse,
} from "../types";

export const customerResearchService = {
  async getKpis(
    startDate?: string,
    endDate?: string
  ): Promise<CustomerResearchKpisResponse> {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await apiClient.get<CustomerResearchKpisResponse>(
      "/reports/customer-research/kpis",
      { params }
    );
    return response.data;
  },

  async getRevenueTrend(
    startDate?: string,
    endDate?: string,
    interval?: "daily" | "weekly" | "monthly"
  ): Promise<RevenueTrendResponse> {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (interval) params.interval = interval;

    const response = await apiClient.get<RevenueTrendResponse>(
      "/reports/customer-research/revenue-trend",
      { params }
    );
    return response.data;
  },

  async listCustomers(
    params?: ListCustomerResearchRequest
  ): Promise<ListCustomerResearchResponse> {
    const response = await apiClient.get<ListCustomerResearchResponse>(
      "/reports/customer-research/customers",
      { params }
    );
    return response.data;
  },

  async getRevenueByCustomer(
    params?: ListCustomerResearchRequest
  ): Promise<CustomerRankResponse> {
    const response = await apiClient.get<CustomerRankResponse>(
      "/reports/customer-research/revenue-by-customer",
      { params }
    );
    return response.data;
  },

  async getPurchaseFrequency(
    params?: ListCustomerResearchRequest
  ): Promise<CustomerRankResponse> {
    const response = await apiClient.get<CustomerRankResponse>(
      "/reports/customer-research/purchase-frequency",
      { params }
    );
    return response.data;
  },

  async getCustomerDetail(
    customerId: string,
    params?: { start_date?: string; end_date?: string }
  ): Promise<CustomerDetailResponse> {
    const response = await apiClient.get<CustomerDetailResponse>(
      `/reports/customer-research/customers/${customerId}`,
      { params }
    );
    return response.data;
  },

  async getCustomerTopProducts(
    customerId: string,
    params?: { start_date?: string; end_date?: string; limit?: number }
  ): Promise<CustomerTopProductsResponse> {
    const response = await apiClient.get<CustomerTopProductsResponse>(
      `/reports/customer-research/customers/${customerId}/products`,
      { params }
    );
    return response.data;
  },
};
