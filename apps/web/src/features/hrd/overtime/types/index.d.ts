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
  readonly type: OvertimeType;
  readonly type_display: string;
  readonly status: OvertimeStatus;
  readonly status_display: string;
  readonly start_time: string;
  readonly end_time: string;
  readonly requested_minutes: number;
  readonly approved_minutes: number;
  readonly rate_multiplier: number;
  readonly reason: string;
  readonly approved_by_id?: string;
  readonly approved_by_name?: string;
  readonly approved_at?: string;
  readonly rejection_reason?: string;
  readonly is_notified: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CreateOvertimeRequest {
  readonly date: string;
  readonly start_time: string;
  readonly end_time: string;
  readonly reason: string;
  readonly type?: OvertimeType;
}

export interface UpdateOvertimeRequest {
  readonly start_time?: string;
  readonly end_time?: string;
  readonly reason?: string;
}

export interface ApproveOvertimeRequest {
  readonly approved_minutes?: number;
}

export interface RejectOvertimeRequest {
  readonly rejection_reason: string;
}

export interface OvertimeSummary {
  readonly employee_id: string;
  readonly month: number;
  readonly year: number;
  readonly total_requested_minutes: number;
  readonly total_approved_minutes: number;
  readonly pending_count: number;
  readonly approved_count: number;
  readonly rejected_count: number;
  readonly auto_detected_count: number;
  readonly manual_claim_count: number;
}

export interface PendingOvertimeNotification {
  readonly id: string;
  readonly employee_name: string;
  readonly date: string;
  readonly requested_minutes: number;
  readonly type: OvertimeType;
  readonly created_at: string;
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
