// Attendance Record Types - Sprint 13 HRD Attendance Module
// Aligned with enhanced backend DTOs (AttendanceRecordResponse)

// Status enum for attendance
export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "HALF_DAY"
  | "HOLIDAY"
  | "LEAVE"
  | "WFH"
  | "OFF_DAY";

// Check-in type enum
export type CheckInType = "NORMAL" | "WFH" | "FIELD_WORK";

// Attendance record aligned with backend AttendanceRecordResponse
export interface AttendanceRecord {
  readonly id: string;
  readonly employee_id: string;
  readonly employee_name: string;
  readonly employee_code: string;
  readonly division_name?: string;
  readonly date: string;
  readonly check_in_time: string | null;
  readonly check_in_type: CheckInType;
  readonly check_in_latitude: number | null;
  readonly check_in_longitude: number | null;
  readonly check_in_address: string;
  readonly check_in_note: string;
  readonly check_out_time: string | null;
  readonly check_out_latitude: number | null;
  readonly check_out_longitude: number | null;
  readonly check_out_address: string;
  readonly check_out_note: string;
  readonly status: AttendanceStatus;
  readonly working_minutes: number;
  readonly working_hours: string;
  readonly overtime_minutes: number;
  readonly overtime_hours: string;
  readonly late_minutes: number;
  readonly early_leave_minutes: number;
  readonly work_schedule_id: string;
  readonly work_schedule_name?: string;
  readonly leave_request_id: string | null;
  readonly late_reason: string;
  readonly photo_url: string;
  readonly notes: string;
  readonly is_manual_entry: boolean;
  readonly manual_entry_reason: string;
  readonly approved_by: string | null;
  readonly approved_by_name?: string;
  readonly created_at: string;
  readonly updated_at: string;
}

// Today attendance response aligned with backend TodayAttendanceResponse
export interface TodayAttendance {
  readonly has_checked_in: boolean;
  readonly has_checked_out: boolean;
  readonly attendance_record: AttendanceRecord | null;
  readonly work_schedule: WorkScheduleInfo | null;
  readonly is_working_day: boolean;
  readonly is_holiday: boolean;
  readonly holiday_info: HolidayInfo | null;
  readonly current_server_time: string;
  readonly is_late: boolean;
  readonly late_minutes: number;
}

export interface WorkScheduleInfo {
  readonly id: string;
  readonly name: string;
  readonly start_time: string;
  readonly end_time: string;
  readonly is_flexible: boolean;
  readonly flexible_start_time?: string;
  readonly flexible_end_time?: string;
  readonly require_gps: boolean;
  readonly gps_radius_meter: number;
  readonly office_latitude: number;
  readonly office_longitude: number;
  readonly late_tolerance_minutes: number;
}

export interface HolidayInfo {
  readonly id: string;
  readonly name: string;
  readonly date: string;
  readonly type: string;
}

// Monthly stats aligned with backend MonthlyAttendanceStats
export interface MonthlyAttendanceStats {
  readonly employee_id: string;
  readonly year: number;
  readonly month: number;
  readonly present_days: number;
  readonly absent_days: number;
  readonly late_days: number;
  readonly half_days: number;
  readonly leave_days: number;
  readonly holiday_days: number;
  readonly total_working_minutes: number;
  readonly total_working_hours: string;
  readonly total_overtime_minutes: number;
  readonly total_overtime_hours: string;
  readonly total_late_minutes: number;
  readonly total_early_leave_minutes: number;
  readonly attendance_percentage: number;
}

// Request types aligned with backend DTOs
export interface ClockInRequest {
  readonly check_in_type: CheckInType;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly address?: string;
  readonly note?: string;
  readonly late_reason?: string;
  readonly photo_url?: string;
}

export interface ClockOutRequest {
  readonly latitude?: number;
  readonly longitude?: number;
  readonly address?: string;
  readonly note?: string;
}

export interface ManualAttendanceRequest {
  readonly employee_id: string;
  readonly date: string;
  readonly check_in_time?: string;
  readonly check_out_time?: string;
  readonly check_in_type: CheckInType;
  readonly status: AttendanceStatus;
  readonly notes?: string;
  readonly reason?: string;
}

export interface UpdateAttendanceRequest {
  readonly check_in_time?: string;
  readonly check_out_time?: string;
  readonly check_in_type?: CheckInType;
  readonly status?: AttendanceStatus;
  readonly notes?: string;
  readonly manual_entry_reason?: string;
}

// List params aligned with backend ListAttendanceRecordsRequest
export interface ListAttendanceRecordsParams {
  page?: number;
  per_page?: number;
  search?: string;
  employee_id?: string;
  status?: AttendanceStatus;
  check_in_type?: CheckInType;
  date_from?: string;
  date_to?: string;
  is_late?: boolean;
  is_early_leave?: boolean;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

// Form data response aligned with backend AttendanceFormDataResponse
export interface AttendanceFormDataResponse {
  readonly success: boolean;
  readonly data: AttendanceFormData;
}

export interface AttendanceFormData {
  readonly employees: readonly EmployeeFormOption[];
  readonly divisions: readonly DivisionFormOption[];
  readonly schedules: readonly ScheduleFormOption[];
  readonly check_in_types: readonly FormOption[];
  readonly statuses: readonly FormOption[];
}

export interface EmployeeFormOption {
  readonly id: string;
  readonly employee_code: string;
  readonly name: string;
}

export interface DivisionFormOption {
  readonly id: string;
  readonly name: string;
}

export interface ScheduleFormOption {
  readonly id: string;
  readonly name: string;
}

export interface FormOption {
  readonly value: string;
  readonly label: string;
}

// Employee work schedule response
export interface EmployeeScheduleData {
  readonly id: string;
  readonly name: string;
  readonly start_time: string;
  readonly end_time: string;
  readonly is_flexible: boolean;
  readonly flexible_start_time?: string;
  readonly flexible_end_time?: string;
}

export interface EmployeeScheduleResponse {
  readonly success: boolean;
  readonly data: EmployeeScheduleData;
}

// API response wrappers
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
  readonly timestamp: string;
  readonly request_id: string;
}

export interface AttendanceRecordResponse {
  readonly success: boolean;
  readonly data: AttendanceRecord;
  readonly timestamp: string;
  readonly request_id: string;
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
  readonly employeeCode: string;
  readonly divisionName?: string;
  readonly date: Date;
  readonly checkInTime: string | null;
  readonly checkOutTime: string | null;
  readonly checkInType: CheckInType;
  readonly status: AttendanceStatus;
  readonly lateMinutes: number;
  readonly workingHours: string;
  readonly notes: string;
  readonly isManualEntry: boolean;
}

