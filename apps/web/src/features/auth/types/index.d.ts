export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  data: {
    token: string;
    user: User;
  };
}

export interface User {
  id: number;
  name: string;
  username: string;
  photo_profile: string;
  avatar_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  roles: Role[];
}

export interface Role {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
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
  access: boolean;
}

export interface MenusResponse {
  data: {
    menus: Menu[];
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
