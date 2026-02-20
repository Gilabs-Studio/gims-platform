// Auth types aligned with new API

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    access_token: string; // Empty in strict mode (HttpOnly cookies)
    refresh_token: string; // Empty in strict mode (HttpOnly cookies)
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  role: Role;
  permissions: Record<string, string>; // code -> scope (OWN|DIVISION|AREA|ALL)
}

export interface Role {
  code: string;
  name: string;
}

export interface Menu {
  id: number;
  name: string;
  icon: string;
  url: string;
  children?: Menu[];
  actions?: MenuAction[];
}

export interface MenuAction {
  id: number;
  code: string;
  name: string;
  action?: string;
  access: boolean;
}

export interface MenusResponse {
  success: boolean;
  data: {
    menus: Menu[];
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
