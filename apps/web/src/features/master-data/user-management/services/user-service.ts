import apiClient from "@/lib/api-client";
import type { User, ListUsersResponse, UserResponse } from "../types";
import type { CreateUserFormData, UpdateUserFormData } from "../schemas/user.schema";
import type { ListRolesResponse, Role } from "../types";
import type { ListPermissionsResponse, Permission, UserPermissionsApiResponse } from "../types";

export const userService = {
  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    role_id?: string;
  }): Promise<ListUsersResponse> {
    const response = await apiClient.get<ListUsersResponse>("/users", { params });
    return response.data;
  },

  async getById(id: string): Promise<UserResponse> {
    const response = await apiClient.get<UserResponse>(`/users/${id}`);
    return response.data;
  },

  async create(data: CreateUserFormData): Promise<UserResponse> {
    const response = await apiClient.post<UserResponse>("/users", data);
    return response.data;
  },

  async update(id: string, data: UpdateUserFormData): Promise<UserResponse> {
    const response = await apiClient.put<UserResponse>(`/users/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },

  async getPermissions(userId: string): Promise<UserPermissionsApiResponse> {
    const response = await apiClient.get<UserPermissionsApiResponse>(
      `/users/${userId}/permissions`
    );
    return response.data;
  },
};

export const roleService = {
  async list(): Promise<ListRolesResponse> {
    const response = await apiClient.get<ListRolesResponse>("/roles");
    return response.data;
  },

  async getById(id: string): Promise<Role> {
    const response = await apiClient.get<{ success: boolean; data: Role }>(`/roles/${id}`);
    return response.data.data;
  },

  async create(data: { name: string; code: string; description?: string; status?: string }): Promise<Role> {
    const response = await apiClient.post<{ success: boolean; data: Role }>("/roles", data);
    return response.data.data;
  },

  async update(
    id: string,
    data: { name?: string; code?: string; description?: string; status?: string }
  ): Promise<Role> {
    const response = await apiClient.put<{ success: boolean; data: Role }>(`/roles/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/roles/${id}`);
  },

  async assignPermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    const response = await apiClient.put<{ success: boolean; data: Role }>(
      `/roles/${roleId}/permissions`,
      { permission_ids: permissionIds }
    );
    return response.data.data;
  },

  async validateUserRole(userId: string, roleId: string): Promise<{ is_valid: boolean }> {
    const response = await apiClient.get<{ success: boolean; data: { is_valid: boolean } }>(
      `/roles/validate/${userId}`,
      { params: { role_id: roleId } }
    );
    return response.data.data;
  },
};

export const permissionService = {
  async list(): Promise<ListPermissionsResponse> {
    const response = await apiClient.get<ListPermissionsResponse>("/permissions");
    return response.data;
  },

  async getById(id: string): Promise<Permission> {
    const response = await apiClient.get<{ success: boolean; data: Permission }>(
      `/permissions/${id}`
    );
    return response.data.data;
  },
};

