import apiClient from "@/lib/api-client";
import type {
  Company,
  CompanyListResponse,
  CompanyResponse,
  CompanyAddDataResponse,
  ApproveAllResponse,
} from "../types";
import type { CreateCompanyFormData, UpdateCompanyFormData } from "../schemas/company.schema";

export const companyService = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    searchBy?: string;
    sort_by?: string;
    sort_order?: "asc" | "desc";
  }): Promise<CompanyListResponse> {
    const response = await apiClient.get<CompanyListResponse>("/master-data/companies", {
      params,
    });
    return response.data;
  },

  async getById(id: number): Promise<CompanyResponse> {
    const response = await apiClient.get<CompanyResponse>(`/master-data/companies/${id}`);
    return response.data;
  },

  async getAddData(): Promise<CompanyAddDataResponse> {
    const response = await apiClient.get<CompanyAddDataResponse>("/master-data/companies/add");
    return response.data;
  },

  async create(data: CreateCompanyFormData): Promise<CompanyResponse> {
    const response = await apiClient.post<CompanyResponse>("/master-data/companies", data);
    return response.data;
  },

  async update(id: number, data: UpdateCompanyFormData): Promise<CompanyResponse> {
    const response = await apiClient.put<CompanyResponse>(`/master-data/companies/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/master-data/companies/${id}`);
  },

  async approve(id: number): Promise<CompanyResponse> {
    const response = await apiClient.post<CompanyResponse>(`/master-data/companies/${id}/approve`);
    return response.data;
  },

  async approveAll(): Promise<ApproveAllResponse> {
    const response = await apiClient.post<ApproveAllResponse>("/master-data/companies/approve-all");
    return response.data;
  },

  async export(params?: {
    page?: number;
    limit?: number;
    search?: string;
    searchBy?: string;
    sort_by?: string;
    sort_order?: "asc" | "desc";
  }): Promise<Blob> {
    const response = await apiClient.get<Blob>("/master-data/companies/export", {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  async downloadTemplate(): Promise<Blob> {
    const response = await apiClient.get<Blob>("/master-data/companies/template", {
      responseType: "blob",
    });
    return response.data;
  },

  async import(file: File): Promise<{ success: boolean; message: string; data?: unknown }> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<{ success: boolean; message: string; data?: unknown }>(
      "/master-data/companies/import",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },
};

