import { apiClient } from "@/lib/api-client";
import type {
  Contact,
  CreateContactData,
  UpdateContactData,
  ContactListParams,
  ContactFormDataResponse,
  ApiResponse,
} from "../types";

const BASE_URL = "/crm/contacts";

export const contactService = {
  list: async (params?: ContactListParams): Promise<ApiResponse<Contact[]>> => {
    const response = await apiClient.get<ApiResponse<Contact[]>>(BASE_URL, { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Contact>> => {
    const response = await apiClient.get<ApiResponse<Contact>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  create: async (data: CreateContactData): Promise<ApiResponse<Contact>> => {
    const response = await apiClient.post<ApiResponse<Contact>>(BASE_URL, data);
    return response.data;
  },

  update: async (id: string, data: UpdateContactData): Promise<ApiResponse<Contact>> => {
    const response = await apiClient.put<ApiResponse<Contact>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  getFormData: async (): Promise<ApiResponse<ContactFormDataResponse>> => {
    const response = await apiClient.get<ApiResponse<ContactFormDataResponse>>(`${BASE_URL}/form-data`);
    return response.data;
  },
};
