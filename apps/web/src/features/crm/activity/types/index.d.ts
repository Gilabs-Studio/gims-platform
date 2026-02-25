// CRM Activity Types

export interface ActivityRelatedInfo {
  id: string;
  name: string;
}

export interface ActivityDealInfo {
  id: string;
  title: string;
}

export interface Activity {
  id: string;
  type: string;
  activity_type_id?: string | null;
  activity_type?: ActivityTypeInfo | null;
  customer_id?: string | null;
  customer?: ActivityRelatedInfo | null;
  contact_id?: string | null;
  contact?: ActivityRelatedInfo | null;
  deal_id?: string | null;
  deal?: ActivityDealInfo | null;
  lead_id?: string | null;
  visit_report_id?: string | null;
  employee_id: string;
  employee?: ActivityEmployeeInfo | null;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
  created_at: string;
}

export interface ActivityTypeInfo {
  id: string;
  name: string;
  code: string;
  icon: string;
  badge_color: string;
}

export interface ActivityEmployeeInfo {
  id: string;
  employee_code: string;
  name: string;
}

export interface CreateActivityData {
  type: string;
  activity_type_id?: string | null;
  customer_id?: string | null;
  contact_id?: string | null;
  deal_id?: string | null;
  lead_id?: string | null;
  visit_report_id?: string | null;
  employee_id: string;
  description: string;
  timestamp?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ActivityListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
  type?: string;
  activity_type_id?: string;
  customer_id?: string;
  contact_id?: string;
  deal_id?: string;
  lead_id?: string;
  employee_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { pagination?: PaginationMeta; filters?: Record<string, unknown> };
  error?: string;
}
