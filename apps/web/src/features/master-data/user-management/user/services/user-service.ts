import apiClient from "@/lib/api-client";
import type { ListUsersResponse, UserResponse, RoleResponse } from "../types";
import type { CreateUserFormData, UpdateUserFormData } from "../schemas/user.schema";
import type { ListRolesResponse, Role } from "../types";
import type { ListPermissionsResponse, Permission, UserPermissionsApiResponse } from "../types";

export const userService = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    searchBy?: string;
    sort_by?: string;
    sort_order?: "asc" | "desc";
  }): Promise<ListUsersResponse> {
    const response = await apiClient.get<ListUsersResponse>("/users", { params });
    return response.data;
  },

  async getById(id: number | string): Promise<UserResponse> {
    const response = await apiClient.get<UserResponse>(`/users/${id}`);
    return response.data;
  },

  async create(data: CreateUserFormData): Promise<UserResponse> {
    const response = await apiClient.post<UserResponse>("/users", data);
    return response.data;
  },

  async update(id: number | string, data: UpdateUserFormData): Promise<UserResponse> {
    const response = await apiClient.put<UserResponse>(`/users/${id}`, data);
    return response.data;
  },

  async delete(id: number | string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/users/${id}`);
    return response.data;
  },

  async getPermissions(userId: number | string): Promise<UserPermissionsApiResponse> {
    const response = await apiClient.get<UserPermissionsApiResponse>(
      `/users/${userId}/permissions`
    );
    return response.data;
  },

  async getAddData(): Promise<{ data: { roles: Role[] } }> {
    const response = await apiClient.get<{ data: { roles: Role[] } }>("/users/add");
    return response.data;
  },

  async getStats(): Promise<{ data: { total: number }; message: string }> {
    const response = await apiClient.get<{ data: { total: number }; message: string }>(
      "/users/stats"
    );
    return response.data;
  },
};

export const roleService = {
  async list(): Promise<ListRolesResponse> {
    const response = await apiClient.get<ListRolesResponse>("/roles");
    return response.data;
  },

  async getById(id: number | string): Promise<RoleResponse> {
    const response = await apiClient.get<RoleResponse>(`/roles/${id}`);
    return response.data;
  },

  async create(data: { name: string; description?: string }): Promise<RoleResponse> {
    const response = await apiClient.post<RoleResponse>("/roles", data);
    return response.data;
  },

  async update(id: number | string, data: { name?: string; description?: string }): Promise<RoleResponse> {
    const response = await apiClient.put<RoleResponse>(`/roles/${id}`, data);
    return response.data;
  },

  async delete(id: number | string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/roles/${id}`);
    return response.data;
  },

  async getStats(): Promise<{ data: { total: number }; message: string }> {
    const response = await apiClient.get<{ data: { total: number }; message: string }>(
      "/roles/stats"
    );
    return response.data;
  },
};

export const permissionService = {
  async list(): Promise<ListPermissionsResponse> {
    const response = await apiClient.get<ListPermissionsResponse>("/permissions");
    return response.data;
  },

  async getById(id: number | string): Promise<Permission> {
    const response = await apiClient.get<{ data: Permission }>(`/permissions/${id}`);
    return response.data.data;
  },
};

