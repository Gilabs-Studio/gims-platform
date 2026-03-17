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
  async getKpis(params?: {
    start_date?: string;
    end_date?: string;
    date_mode?: "year" | "range";
    year?: number;
  }): Promise<CustomerResearchKpisResponse> {
    const queryParams: Record<string, string | number> = {};
    if (params?.start_date) queryParams.start_date = params.start_date;
    if (params?.end_date) queryParams.end_date = params.end_date;
    if (params?.date_mode) queryParams.date_mode = params.date_mode;
    if (params?.year) queryParams.year = params.year;

    const response = await apiClient.get<CustomerResearchKpisResponse>(
      "/reports/customer-research/kpis",
      { params: queryParams }
    );
    return response.data;
  },

  async getRevenueTrend(
    params?: {
      start_date?: string;
      end_date?: string;
      date_mode?: "year" | "range";
      year?: number;
      interval?: "daily" | "weekly" | "monthly";
    }
  ): Promise<RevenueTrendResponse> {
    const queryParams: Record<string, string | number> = {};
    if (params?.start_date) queryParams.start_date = params.start_date;
    if (params?.end_date) queryParams.end_date = params.end_date;
    if (params?.date_mode) queryParams.date_mode = params.date_mode;
    if (params?.year) queryParams.year = params.year;
    if (params?.interval) queryParams.interval = params.interval;

    const response = await apiClient.get<RevenueTrendResponse>(
      "/reports/customer-research/revenue-trend",
      { params: queryParams }
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
