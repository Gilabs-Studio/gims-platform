export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role_id: string;
  role?: Role;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: "active" | "inactive";
  is_protected?: boolean;
  permissions?: Permission[];
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  menu_id?: string;
  menu?: Menu;
  action: string;
  description?: string;
  access?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Menu {
  id: string;
  name: string;
  icon: string;
  url: string;
  parent_id?: string;
  children?: Menu[];
  actions?: Action[];
  order: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface Action {
  id: string;
  code: string;
  name: string;
  access: boolean;
}

export interface MenuWithActions {
  id: string;
  name: string;
  icon: string;
  url: string;
  children?: MenuWithActions[];
  actions?: Action[];
}

export interface UserPermissionsResponse {
  menus: MenuWithActions[];
  permissions?: Permission[];
}

export interface ListUsersResponse {
  success: boolean;
  data: User[];
  meta: {
    pagination: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
    filters?: Record<string, unknown>;
  };
  timestamp: string;
  request_id: string;
}

export interface UserResponse {
  success: boolean;
  data: User;
  timestamp: string;
  request_id: string;
}

export interface RoleResponse {
  success: boolean;
  data: Role;
  timestamp: string;
  request_id: string;
}

export interface ListRolesResponse {
  success: boolean;
  data: Role[];
  timestamp: string;
  request_id: string;
}

export interface PermissionResponse {
  success: boolean;
  data: Permission;
  timestamp: string;
  request_id: string;
}

export interface ListPermissionsResponse {
  success: boolean;
  data: Permission[];
  timestamp: string;
  request_id: string;
}

export interface UserPermissionsApiResponse {
  success: boolean;
  data: UserPermissionsResponse;
  timestamp: string;
  request_id: string;
}

export interface CreateRoleFormData {
  name: string;
  code: string;
  description?: string;
  status?: "active" | "inactive";
}

export interface UpdateRoleFormData {
  name?: string;
  code?: string;
  description?: string;
  status?: "active" | "inactive";
}

