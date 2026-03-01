import { apiClient } from "@/lib/api-client";

export const geoPerformanceService = {
  /**
   * Fetch geo performance data aggregated by geographic area.
   * Supports two modes: sales_order (demand) and paid_invoice (actual revenue).
   */
  async getGeoPerformance(
    params?: GeoPerformanceRequest
  ): Promise<GeoPerformanceResponse> {
    const response = await apiClient.get<GeoPerformanceResponse>(
      "/reports/geo-performance",
      { params }
    );
    return response.data;
  },

  /**
   * Fetch form data (sales rep options) for the filter panel
   */
  async getFormData(): Promise<GeoPerformanceFormDataResponse> {
    const response = await apiClient.get<GeoPerformanceFormDataResponse>(
      "/reports/geo-performance/form-data"
    );
    return response.data;
  },
};
