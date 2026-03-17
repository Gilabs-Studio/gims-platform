export interface MonthlyTarget {
  readonly id: string;
  readonly month: number;
  readonly month_name: string;
  readonly target_amount: number;
  readonly actual_amount: number;
  readonly achievement_percent: number;
  readonly notes?: string;
}

export interface YearlyTarget {
  readonly id: string;
  readonly code: string;
  readonly area_id?: string;
  readonly area?: {
    readonly id: string;
    readonly name: string;
  };
  readonly year: number;
  readonly total_target: number;
  readonly total_actual: number;
  readonly achievement_percent: number;
  readonly notes?: string;
  readonly monthly_targets?: MonthlyTarget[];
  
  readonly created_at: string;
  readonly updated_at: string;
}

export interface SalesTargetAuditTrailUser {
  id: string;
  email: string;
  name: string;
}

export interface SalesTargetAuditTrailEntry {
  id: string;
  action: string;
  permission_code: string;
  target_id: string;
  metadata: Record<string, unknown>;
  user?: SalesTargetAuditTrailUser | null;
  created_at: string;
}

export interface ListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  };
  timestamp: string;
  request_id: string;
}
