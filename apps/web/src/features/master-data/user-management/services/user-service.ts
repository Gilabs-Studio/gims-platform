import apiClient from "@/lib/api-client";
import type { ListUsersResponse, UserResponse, ListRolesResponse, Role, ListPermissionsResponse, Permission, UserPermissionsApiResponse, MenuCategory, RoleMenuAccessAssignment } from "../types";
import type { CreateUserFormData, UpdateUserFormData } from "../schemas/user.schema"; 

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

  async getLimit(): Promise<{ current: number; max: number }> {
    const response = await apiClient.get<{
      success: boolean;
      data: { current: number; max: number };
    }>("/users/limit");
    return response.data.data;
  },
};

export const roleService = {
  async list(params?: { search?: string }): Promise<ListRolesResponse> {
    const response = await apiClient.get<ListRolesResponse>("/roles", { params });
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

  async assignPermissions(
    roleId: string,
    permissionIds: string[],
    assignments?: Array<{ permission_id: string; scope: string }>,
    tolerant: boolean = false
  ): Promise<Role> {
    // Use scope-aware format if assignments provided, otherwise legacy format
    const body = assignments?.length
      ? { assignments }
      : { permission_ids: permissionIds };
    const queryParam = tolerant ? "?tolerant=true" : "";
    const response = await apiClient.post<{ success: boolean; data: Role }>(
      `/roles/${roleId}/permissions${queryParam}`,
      body
    );
    return response.data.data;
  },

  async getMenuAccess(roleId: string): Promise<RoleMenuAccessAssignment[]> {
    const response = await apiClient.get<{
      success: boolean;
      data: { assignments: RoleMenuAccessAssignment[] };
    }>(`/roles/${roleId}/menu-access`);
    return response.data.data.assignments ?? [];
  },

  async updateMenuAccess(
    roleId: string,
    assignments: RoleMenuAccessAssignment[]
  ): Promise<RoleMenuAccessAssignment[]> {
    const response = await apiClient.put<{
      success: boolean;
      data: { assignments: RoleMenuAccessAssignment[] };
    }>(`/roles/${roleId}/menu-access`, { assignments });
    return response.data.data.assignments ?? [];
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

  async getMenuCategories(): Promise<{ success: boolean; data: MenuCategory[] }> {
    const response = await apiClient.get<{ success: boolean; data: MenuCategory[] }>(
      "/permissions/categories/hierarchy"
    );
    return response.data;
  },
};

