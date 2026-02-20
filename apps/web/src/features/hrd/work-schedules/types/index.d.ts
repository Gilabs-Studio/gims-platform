// Work Schedule Types - Sprint 13 HRD Attendance Module

export interface BreakTime {
  readonly start_time: string;
  readonly end_time: string;
}

export interface WorkSchedule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly is_default: boolean;
  readonly is_active: boolean;
  readonly start_time: string;
  readonly end_time: string;
  readonly is_flexible: boolean;
  readonly flexible_start_time?: string;
  readonly flexible_end_time?: string;
  readonly breaks: BreakTime[];
  readonly working_days: number;
  readonly working_days_display: string[];
  readonly working_hours_per_day: number;
  readonly late_tolerance_minutes: number;
  readonly early_leave_tolerance_minutes: number;
  readonly require_gps: boolean;
  readonly gps_radius_meter: number;
  readonly office_latitude?: number;
  readonly office_longitude?: number;
  readonly division_id?: string | null;
  readonly division_name?: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CreateWorkScheduleRequest {
  readonly name: string;
  readonly description?: string;
  readonly start_time: string;
  readonly end_time: string;
  readonly is_flexible?: boolean;
  readonly flexible_start_time?: string;
  readonly flexible_end_time?: string;
  readonly breaks: BreakTime[];
  readonly working_days?: number;
  readonly working_hours_per_day?: number;
  readonly late_tolerance_minutes?: number;
  readonly early_leave_tolerance_minutes?: number;
  readonly require_gps?: boolean;
  readonly gps_radius_meter?: number;
  readonly office_latitude?: number;
  readonly office_longitude?: number;
  readonly division_id?: string | null;
  readonly is_default?: boolean;
  readonly is_active?: boolean;
}

export type UpdateWorkScheduleRequest = Partial<CreateWorkScheduleRequest>;

export interface WorkScheduleListResponse {
  readonly success: boolean;
  readonly data: readonly WorkSchedule[];
  readonly meta?: {
    readonly pagination: {
      readonly page: number;
      readonly per_page: number;
      readonly total: number;
      readonly total_pages: number;
    };
  };
}

export interface WorkScheduleResponse {
  readonly success: boolean;
  readonly data: WorkSchedule;
}

export interface DeleteResponse {
  readonly success: boolean;
  readonly message: string;
}

// Working days bitmask helpers
export const WORKING_DAYS = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 4,
  THURSDAY: 8,
  FRIDAY: 16,
  SATURDAY: 32,
  SUNDAY: 64,
} as const;

export const WEEKDAYS_ONLY = 31; // Mon-Fri
export const ALL_DAYS = 127; // Mon-Sun
