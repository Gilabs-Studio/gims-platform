import apiClient from "@/lib/api-client";
import type {
  CreateEmployeeAssetRequest,
  EmployeeAssetDetailResponse,
  EmployeeAssetFilters,
  EmployeeAssetFormDataResponse,
  EmployeeAssetListResponse,
  ReturnAssetRequest,
  UpdateEmployeeAssetRequest,
} from "../types";

const BASE_URL = "/hrd/employee-assets";

export const employeeAssetService = {
  /**
   * Get paginated list of employee assets with filters
   */
  getAll: async (filters?: EmployeeAssetFilters) => {
    const params = new URLSearchParams();
    
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.per_page) params.append("per_page", filters.per_page.toString());
    if (filters?.search) params.append("search", filters.search);
    if (filters?.employee_id) params.append("employee_id", filters.employee_id);
    if (filters?.status) params.append("status", filters.status);

    const response = await apiClient.get<EmployeeAssetListResponse>(
      `${BASE_URL}?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get employee asset by ID
   */
  getById: async (id: string) => {
    const response = await apiClient.get<EmployeeAssetDetailResponse>(
      `${BASE_URL}/${id}`
    );
    return response.data;
  },

  /**
   * Get assets for specific employee
   */
  getByEmployeeId: async (employeeId: string, page = 1, perPage = 20) => {
    const response = await apiClient.get<EmployeeAssetListResponse>(
      `${BASE_URL}/employee/${employeeId}?page=${page}&per_page=${perPage}`
    );
    return response.data;
  },

  /**
   * Get currently borrowed assets (for dashboard alerts)
   */
  getBorrowed: async (page = 1, perPage = 20) => {
    const response = await apiClient.get<EmployeeAssetListResponse>(
      `${BASE_URL}/borrowed?page=${page}&per_page=${perPage}`
    );
    return response.data;
  },

  /**
   * Get form data (employees dropdown)
   */
  getFormData: async () => {
    const response = await apiClient.get<EmployeeAssetFormDataResponse>(
      `${BASE_URL}/form-data`
    );
    return response.data;
  },

  /**
   * Create new employee asset (borrow)
   */
  create: async (data: CreateEmployeeAssetRequest) => {
    const response = await apiClient.post<EmployeeAssetDetailResponse>(
      BASE_URL,
      data
    );
    return response.data;
  },

  /**
   * Update employee asset (only unreturned assets)
   */
  update: async (id: string, data: UpdateEmployeeAssetRequest) => {
    const response = await apiClient.put<EmployeeAssetDetailResponse>(
      `${BASE_URL}/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Return asset (mark as returned)
   */
  returnAsset: async (id: string, data: ReturnAssetRequest) => {
    const response = await apiClient.post<EmployeeAssetDetailResponse>(
      `${BASE_URL}/${id}/return`,
      data
    );
    return response.data;
  },

  /**
   * Delete employee asset (soft delete)
   */
  delete: async (id: string) => {
    await apiClient.delete(`${BASE_URL}/${id}`);
  },
};
