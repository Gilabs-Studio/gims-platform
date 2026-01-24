export type YearlyTargetStatus = "draft" | "submitted" | "approved" | "rejected";

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
  readonly status: YearlyTargetStatus;
  readonly monthly_targets?: MonthlyTarget[];
  
  readonly submitted_at?: string;
  readonly submitted_by?: string;
  readonly approved_at?: string;
  readonly approved_by?: string;
  readonly rejected_at?: string;
  readonly rejected_by?: string;
  readonly rejection_reason?: string;
  
  readonly created_at: string;
  readonly updated_at: string;
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
