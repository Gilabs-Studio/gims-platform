import apiClient from "@/lib/api-client";
import type {
  SupplierListResponse,
  SupplierResponse,
  SupplierAddDataResponse,
} from "../types";
import type { CreateSupplierFormData, UpdateSupplierFormData } from "../schemas/supplier.schema";

export const supplierService = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    searchBy?: string;
    sort_by?: string;
    sort_order?: "asc" | "desc";
  }): Promise<SupplierListResponse> {
    const response = await apiClient.get<SupplierListResponse>("/master-data/suppliers", {
      params,
    });
    return response.data;
  },

  async getById(id: number): Promise<SupplierResponse> {
    const response = await apiClient.get<SupplierResponse>(`/master-data/suppliers/${id}`);
    return response.data;
  },

  async getAddData(): Promise<SupplierAddDataResponse> {
    const response = await apiClient.get<SupplierAddDataResponse>("/master-data/suppliers/add");
    return response.data;
  },

  async create(data: CreateSupplierFormData): Promise<SupplierResponse> {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, String(value));
        }
      }
    });

    const response = await apiClient.post<SupplierResponse>("/master-data/suppliers", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  async update(id: number, data: UpdateSupplierFormData): Promise<SupplierResponse> {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, String(value));
        }
      }
    });

    const response = await apiClient.put<SupplierResponse>(`/master-data/suppliers/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/master-data/suppliers/${id}`);
  },

  async approve(id: number): Promise<SupplierResponse> {
    const response = await apiClient.post<SupplierResponse>(`/master-data/suppliers/${id}/approve`);
    return response.data;
  },

  async approveAll(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>("/master-data/suppliers/approve-all");
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
    const response = await apiClient.get<Blob>("/master-data/suppliers/export", {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  async downloadTemplate(): Promise<Blob> {
    const response = await apiClient.get<Blob>("/master-data/suppliers/template", {
      responseType: "blob",
    });
    return response.data;
  },

  async import(file: File): Promise<{ success: boolean; message: string; data?: unknown }> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<{ success: boolean; message: string; data?: unknown }>(
      "/master-data/suppliers/import",
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
