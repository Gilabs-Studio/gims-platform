import { apiClient } from "@/lib/api-client";
import type {
  ListSalesRepPerformanceRequest,
  ListSalesRepPerformanceResponse,
  MonthlySalesOverviewResponse,
  GetSalesRepDetailRequest,
  SalesRepDetailResponse,
  GetSalesRepCheckInLocationsRequest,
  SalesRepCheckInLocationsResponse,
  ListSalesRepProductsRequest,
  ListSalesRepProductsResponse,
  ListSalesRepCustomersRequest,
  ListSalesRepCustomersResponse,
} from "../types";

export const salesOverviewReportService = {
  /**
   * List sales rep performance
   * Fetches employees with "Sales Representative" position and their sales metrics
   */
  async listSalesRepPerformance(
    params?: ListSalesRepPerformanceRequest
  ): Promise<ListSalesRepPerformanceResponse> {
    const response = await apiClient.get<ListSalesRepPerformanceResponse>(
      "/reports/sales-overview/performance",
      { params }
    );
    return response.data;
  },

  /**
   * Get monthly sales overview chart data
   */
  async getMonthlySalesOverview(
    startDate?: string,
    endDate?: string
  ): Promise<MonthlySalesOverviewResponse> {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await apiClient.get<MonthlySalesOverviewResponse>(
      "/reports/sales-overview/monthly-overview",
      { params }
    );
    return response.data;
  },

  /**
   * Get detailed stats for a specific sales rep
   */
  async getSalesRepDetail(
    employeeId: string,
    params?: GetSalesRepDetailRequest
  ): Promise<SalesRepDetailResponse> {
    const response = await apiClient.get<SalesRepDetailResponse>(
      `/reports/sales-overview/sales-rep/${employeeId}`,
      { params }
    );
    return response.data;
  },

  /**
   * Get check-in locations for a sales rep (from CRM visit reports)
   */
  async getSalesRepCheckInLocations(
    employeeId: string,
    params?: GetSalesRepCheckInLocationsRequest
  ): Promise<SalesRepCheckInLocationsResponse> {
    const response = await apiClient.get<SalesRepCheckInLocationsResponse>(
      `/reports/sales-overview/sales-rep/${employeeId}/check-in-locations`,
      { params }
    );
    return response.data;
  },

  /**
   * Get products sold by a specific sales rep (from Sales module)
   */
  async getSalesRepProducts(
    employeeId: string,
    params?: ListSalesRepProductsRequest
  ): Promise<ListSalesRepProductsResponse> {
    const response = await apiClient.get<ListSalesRepProductsResponse>(
      `/reports/sales-overview/sales-rep/${employeeId}/products`,
      { params }
    );
    return response.data;
  },

  /**
   * Get customers assigned to a specific sales rep
   */
  async getSalesRepCustomers(
    employeeId: string,
    params?: ListSalesRepCustomersRequest
  ): Promise<ListSalesRepCustomersResponse> {
    const response = await apiClient.get<ListSalesRepCustomersResponse>(
      `/reports/sales-overview/sales-rep/${employeeId}/customers`,
      { params }
    );
    return response.data;
  },
};
