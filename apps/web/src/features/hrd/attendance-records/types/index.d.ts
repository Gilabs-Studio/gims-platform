// Attendance Record Types - Sprint 13 HRD Attendance Module
// Aligned with backend DTOs

// Status enum for attendance
export type AttendanceStatus = 
  | "PRESENT" 
  | "ABSENT" 
  | "LATE" 
  | "EARLY_LEAVE" 
  | "HALF_DAY" 
  | "HOLIDAY" 
  | "LEAVE";

export interface AttendanceRecord {
  readonly id: string;
  readonly employee_id: string;
  readonly employee_name?: string;
  readonly employee_code?: string;
  readonly division_name?: string;
  readonly date: string;
  readonly check_in_time: string | null;
  readonly check_out_time: string | null;
  readonly check_in_latitude: number | null;
  readonly check_in_longitude: number | null;
  readonly check_out_latitude: number | null;
  readonly check_out_longitude: number | null;
  readonly status: AttendanceStatus;
  readonly is_late: boolean;
  readonly late_minutes: number;
  readonly working_minutes: number;
  readonly overtime_minutes: number;
  readonly note: string;
  readonly is_manual_entry: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface TodayAttendance {
  readonly date: string;
  readonly attendance: AttendanceRecord | null;
  readonly work_schedule: {
    readonly name: string;
    readonly start_time: string;
    readonly end_time: string;
    readonly is_flexible: boolean;
    readonly flexible_start_time?: string;
    readonly flexible_end_time?: string;
    readonly require_gps: boolean;
  } | null;
  readonly is_holiday: boolean;
  readonly holiday_name?: string;
  readonly can_clock_in: boolean;
  readonly can_clock_out: boolean;
}

export interface MonthlyAttendanceStats {
  readonly employee_id: string;
  readonly month: number;
  readonly year: number;
  readonly total_working_days: number;
  readonly present_days: number;
  readonly absent_days: number;
  readonly late_days: number;
  readonly leave_days: number;
  readonly half_days: number;
  readonly total_working_minutes: number;
  readonly total_overtime_minutes: number;
  readonly total_late_minutes: number;
  readonly attendance_rate: number;
}

export interface ClockInRequest {
  readonly latitude: number;
  readonly longitude: number;
  readonly note?: string;
}

export interface ClockOutRequest {
  readonly latitude: number;
  readonly longitude: number;
  readonly note?: string;
}

export interface ManualAttendanceRequest {
  readonly employee_id: string;
  readonly date: string;
  readonly check_in_time?: string;
  readonly check_out_time?: string;
  readonly status: AttendanceStatus;
  readonly note?: string;
}

export interface AttendanceRecordListResponse {
  readonly success: boolean;
  readonly data: readonly AttendanceRecord[];
  readonly meta: {
    readonly pagination: {
      readonly page: number;
      readonly per_page: number;
      readonly total: number;
      readonly total_pages: number;
    };
  };
}

export interface AttendanceRecordResponse {
  readonly success: boolean;
  readonly data: AttendanceRecord;
}

export interface TodayAttendanceResponse {
  readonly success: boolean;
  readonly data: TodayAttendance;
}

export interface MonthlyStatsResponse {
  readonly success: boolean;
  readonly data: MonthlyAttendanceStats;
}

export interface ClockActionResponse {
  readonly success: boolean;
  readonly data: AttendanceRecord;
  readonly message?: string;
}

// Calendar view types
export interface CalendarEvent {
  readonly id: string;
  readonly employeeId: string;
  readonly employeeName: string;
  readonly date: Date;
  readonly checkInTime: string | null;
  readonly checkOutTime: string | null;
  readonly status: AttendanceStatus;
  readonly isLate: boolean;
  readonly lateMinutes: number;
  readonly note: string;
}

