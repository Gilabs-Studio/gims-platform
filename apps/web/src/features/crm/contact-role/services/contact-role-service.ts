import { apiClient } from "@/lib/api-client";
import type { ContactRole, CreateContactRoleData, UpdateContactRoleData, ContactRoleListParams, ApiResponse } from "../types";

const BASE_URL = "/crm/contact-roles";

export const contactRoleService = {
  list: async (params?: ContactRoleListParams): Promise<ApiResponse<ContactRole[]>> => {
    const response = await apiClient.get<ApiResponse<ContactRole[]>>(BASE_URL, { params });
    return response.data;
  },
  getById: async (id: string): Promise<ApiResponse<ContactRole>> => {
    const response = await apiClient.get<ApiResponse<ContactRole>>(`${BASE_URL}/${id}`);
    return response.data;
  },
  create: async (data: CreateContactRoleData): Promise<ApiResponse<ContactRole>> => {
    const response = await apiClient.post<ApiResponse<ContactRole>>(BASE_URL, data);
    return response.data;
  },
  update: async (id: string, data: UpdateContactRoleData): Promise<ApiResponse<ContactRole>> => {
    const response = await apiClient.put<ApiResponse<ContactRole>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`${BASE_URL}/${id}`);
    return response.data;
  },
};
