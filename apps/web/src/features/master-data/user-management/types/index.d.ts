export interface User {
  id: number | string; // Support both number (from API) and string (for DataTable compatibility)
  name: string;
  username: string;
  photo_profile?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  roles?: Role[];
}

export interface Role {
  id: number | string; // Support both number (from API) and string (for compatibility)
  name: string;
  description?: string;
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
  id: number | string; // Support both number (from API) and string (for compatibility)
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
  data: User[];
  meta: {
    filter?: {
      end_date?: string;
      start_date?: string;
    };
    pagination: {
      limit: number;
      page: number;
      total: number;
    };
    search?: {
      search?: string;
      searchBy?: string;
    };
    searchable_columns?: {
      numeric_columns?: string[];
      string_columns?: string[];
    };
    sort?: {
      sort_by?: string;
      sort_order?: "asc" | "desc";
    };
    sortable_columns?: {
      available_fields?: string[];
    };
  };
}

export interface UserResponse {
  data: User;
  message?: string;
}

export interface RoleResponse {
  data: Role;
  message?: string;
}

export interface ListRolesResponse {
  data: Role[];
  meta?: {
    filter?: {
      end_date?: string;
      start_date?: string;
    };
    pagination?: {
      limit: number;
      page: number;
      total: number;
    };
    search?: {
      search?: string;
      searchBy?: string;
    };
    searchable_columns?: {
      numeric_columns?: string[];
      string_columns?: string[];
    };
    sort?: {
      sort_by?: string;
      sort_order?: "asc" | "desc";
    };
    sortable_columns?: {
      available_fields?: string[];
    };
  };
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

