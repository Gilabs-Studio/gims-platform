import { apiClient } from "@/lib/api-client";
import type {
  ListCertificationsParams,
  CertificationFormDataResponse,
  CertificationListResponse,
  CertificationResponse,
  CreateCertificationData,
  ExpiringCertificationsParams,
  UpdateCertificationData,
} from "../types";

const BASE_URL = "/hrd/employee-certifications";

export const certificationService = {
  // List employee certifications with pagination and filters
  list: async (params?: ListCertificationsParams): Promise<CertificationListResponse> => {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.per_page) searchParams.append("per_page", params.per_page.toString());
    if (params?.search) searchParams.append("search", params.search);
    if (params?.employee_id) searchParams.append("employee_id", params.employee_id);

    const queryString = searchParams.toString();
    const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;

    const response = await apiClient.get<CertificationListResponse>(url);
    return response.data;
  },

  // Get a single certification by ID
  getById: async (id: string): Promise<CertificationResponse> => {
    const response = await apiClient.get<CertificationResponse>(`${BASE_URL}/${id}`);
    return response.data;
  },

  // Get certifications expiring within X days
  getExpiring: async (params?: ExpiringCertificationsParams): Promise<CertificationListResponse> => {
    const days = params?.days ?? 30; // Default 30 days
    const response = await apiClient.get<CertificationListResponse>(
      `${BASE_URL}/expiring?days=${days}`
    );
    return response.data;
  },

  // Create a new certification
  create: async (data: CreateCertificationData): Promise<CertificationResponse> => {
    const response = await apiClient.post<CertificationResponse>(BASE_URL, data);
    return response.data;
  },

  // Update an existing certification
  update: async (id: string, data: UpdateCertificationData): Promise<CertificationResponse> => {
    const response = await apiClient.put<CertificationResponse>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  // Delete a certification
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/${id}`);
  },

  // Get form data (employees dropdown)
  getFormData: async (): Promise<CertificationFormDataResponse> => {
    const response = await apiClient.get<CertificationFormDataResponse>(
      `${BASE_URL}/form-data`
    );
    return response.data;
  },
};
