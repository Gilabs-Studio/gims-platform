export interface UpdateProfileRequest {
  email: string;
  name: string;
}

export interface ProfileResponse {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  role: {
    code: string;
    name: string;
  };
  status: string;
  created_at: string;
}

export interface ProfileApiResponse {
  data: ProfileResponse;
  meta: Meta;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface AvatarUploadResponse {
  avatar_url: string;
  filename: string;
}

export interface AvatarUploadApiResponse {
  data: AvatarUploadResponse;
  meta: Meta;
}

// Dashboard Metrics Types
export interface CheckInLocationsSummary {
  total_locations: number;
  total_visits: number;
  period?: {
    start: string;
    end: string;
  };
}

export interface ProductsSoldSummary {
  total_products: number;
  total_quantity: number;
  total_revenue: number;
  total_revenue_formatted: string;
  average_revenue: number;
  average_revenue_formatted: string;
}

export interface CustomersSummary {
  total_customers: number;
  total_revenue: number;
  total_revenue_formatted: string;
  average_order_value: number;
  average_order_value_formatted: string;
  total_orders: number;
}

export interface EmployeeDashboardMetrics {
  check_in_locations?: CheckInLocationsSummary;
  products_sold?: ProductsSoldSummary;
  customers?: CustomersSummary;
}

export interface EmployeeDashboardMetricsResponse {
  success: boolean;
  data: EmployeeDashboardMetrics;
}

// Task Types
export interface AssignedTask {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priority?: "LOW" | "MEDIUM" | "HIGH";
  due_date?: string;
  source: "CRM" | "SALES" | "PURCHASE"; // Task source
  reference_id?: string; // CRM Activity, Sales Order, PO ID
  created_at: string;
}

export interface AssignedTasksResponse {
  success: boolean;
  data: AssignedTask[];
}
