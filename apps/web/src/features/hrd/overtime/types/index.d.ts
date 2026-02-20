// Overtime Request Types - Sprint 13 HRD Attendance Module

export type OvertimeType = "AUTO_DETECTED" | "MANUAL_CLAIM" | "PRE_APPROVED";
export type OvertimeStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";

export interface OvertimeRequest {
  readonly id: string;
  readonly employee_id: string;
  readonly employee_name?: string;
  readonly employee_code?: string;
  readonly division_name?: string;
  readonly attendance_record_id?: string;
  readonly date: string;
  readonly request_type: OvertimeType;
  readonly status: OvertimeStatus;
  readonly start_time: string;
  readonly end_time: string;
  readonly planned_minutes: number;
  readonly planned_hours?: string;
  readonly actual_minutes: number;
  readonly actual_hours?: string;
  readonly approved_minutes: number;
  readonly approved_hours?: string;
  readonly overtime_rate: number;
  readonly compensation_amount: number;
  readonly reason: string;
  readonly description?: string;
  readonly task_details?: string;
  readonly approved_by?: string;
  readonly approved_at?: string;
  readonly rejected_by?: string;
  readonly rejected_at?: string;
  readonly reject_reason?: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CreateOvertimeRequest {
  readonly date: string;
  readonly start_time: string;
  readonly end_time: string;
  readonly reason: string;
  readonly description?: string;
  readonly task_details?: string;
  readonly request_type: OvertimeType;
}

export interface UpdateOvertimeRequest {
  readonly start_time?: string;
  readonly end_time?: string;
  readonly reason?: string;
  readonly description?: string;
  readonly task_details?: string;
}

export interface ApproveOvertimeRequest {
  readonly approved_minutes: number;
}

export interface RejectOvertimeRequest {
  readonly reason: string;
}

export interface ListOvertimeParams {
  readonly page?: number;
  readonly per_page?: number;
  readonly employee_id?: string;
  readonly status?: OvertimeStatus;
  readonly request_type?: OvertimeType;
  readonly date_from?: string;
  readonly date_to?: string;
  readonly sort_by?: string;
  readonly sort_order?: "asc" | "desc";
}

export interface OvertimeSummary {
  readonly employee_id: string;
  readonly month: number;
  readonly year: number;
  readonly total_requested_minutes: number;
  readonly total_approved_minutes: number;
  readonly total_rejected_minutes: number;
  readonly pending_requests: number;
  readonly approved_requests: number;
  readonly rejected_requests: number;
}

export interface PendingOvertimeNotification {
  readonly overtime_request: OvertimeRequest;
  readonly employee_name: string;
  readonly division_name: string;
}

export interface OvertimeListResponse {
  readonly success: boolean;
  readonly data: readonly OvertimeRequest[];
  readonly meta?: {
    readonly pagination: {
      readonly page: number;
      readonly per_page: number;
      readonly total: number;
      readonly total_pages: number;
    };
  };
}

export interface OvertimeResponse {
  readonly success: boolean;
  readonly data: OvertimeRequest;
}

export interface OvertimeSummaryResponse {
  readonly success: boolean;
  readonly data: OvertimeSummary;
}

export interface NotificationsResponse {
  readonly success: boolean;
  readonly data: readonly PendingOvertimeNotification[];
}

export interface DeleteResponse {
  readonly success: boolean;
  readonly message: string;
}
