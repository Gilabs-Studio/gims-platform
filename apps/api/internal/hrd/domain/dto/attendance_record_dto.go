package dto

// AttendanceRecord DTOs

// ClockInRequest represents the request to clock in
type ClockInRequest struct {
	CheckInType string   `json:"check_in_type" binding:"required,oneof=NORMAL WFH FIELD_WORK"`
	Latitude    *float64 `json:"latitude"`
	Longitude   *float64 `json:"longitude"`
	Address     string   `json:"address" binding:"max=500"`
	Note        string   `json:"note" binding:"max=500"`
}

// ClockOutRequest represents the request to clock out
type ClockOutRequest struct {
	Latitude  *float64 `json:"latitude"`
	Longitude *float64 `json:"longitude"`
	Address   string   `json:"address" binding:"max=500"`
	Note      string   `json:"note" binding:"max=500"`
}

// ManualAttendanceRequest represents the request to create a manual attendance entry
type ManualAttendanceRequest struct {
	EmployeeID   string   `json:"employee_id" binding:"required,uuid"`
	Date         string   `json:"date" binding:"required"`           // YYYY-MM-DD
	CheckInTime  *string  `json:"check_in_time"`                      // HH:MM
	CheckOutTime *string  `json:"check_out_time"`                     // HH:MM
	CheckInType  string   `json:"check_in_type" binding:"required,oneof=NORMAL WFH FIELD_WORK"`
	Status       string   `json:"status" binding:"required,oneof=PRESENT ABSENT LATE HALF_DAY LEAVE WFH"`
	Notes        string   `json:"notes" binding:"max=1000"`
	Reason       string   `json:"reason" binding:"required,max=500"` // Reason for manual entry
}

// UpdateAttendanceRecordRequest represents the request to update an attendance record
type UpdateAttendanceRecordRequest struct {
	CheckInTime       *string  `json:"check_in_time"`
	CheckOutTime      *string  `json:"check_out_time"`
	CheckInType       *string  `json:"check_in_type" binding:"omitempty,oneof=NORMAL WFH FIELD_WORK"`
	Status            *string  `json:"status" binding:"omitempty,oneof=PRESENT ABSENT LATE HALF_DAY LEAVE WFH OFF_DAY HOLIDAY"`
	Notes             *string  `json:"notes" binding:"omitempty,max=1000"`
	ManualEntryReason *string  `json:"manual_entry_reason" binding:"omitempty,max=500"`
}

// ListAttendanceRecordsRequest represents the request to list attendance records
type ListAttendanceRecordsRequest struct {
	Page         int    `form:"page" binding:"omitempty,min=1"`
	PerPage      int    `form:"per_page" binding:"omitempty,min=1,max=100"`
	EmployeeID   string `form:"employee_id" binding:"omitempty,uuid"`
	Status       string `form:"status" binding:"omitempty,oneof=PRESENT ABSENT LATE HALF_DAY LEAVE WFH OFF_DAY HOLIDAY"`
	CheckInType  string `form:"check_in_type" binding:"omitempty,oneof=NORMAL WFH FIELD_WORK"`
	DateFrom     string `form:"date_from"`
	DateTo       string `form:"date_to"`
	IsLate       *bool  `form:"is_late"`
	IsEarlyLeave *bool  `form:"is_early_leave"`
	SortBy       string `form:"sort_by"`
	SortOrder    string `form:"sort_order" binding:"omitempty,oneof=asc desc ASC DESC"`
}

// AttendanceRecordResponse represents the response for an attendance record
type AttendanceRecordResponse struct {
	ID                string   `json:"id"`
	EmployeeID        string   `json:"employee_id"`
	Date              string   `json:"date"`
	CheckInTime       *string  `json:"check_in_time"`
	CheckInType       string   `json:"check_in_type"`
	CheckInLatitude   *float64 `json:"check_in_latitude"`
	CheckInLongitude  *float64 `json:"check_in_longitude"`
	CheckInAddress    string   `json:"check_in_address"`
	CheckInNote       string   `json:"check_in_note"`
	CheckOutTime      *string  `json:"check_out_time"`
	CheckOutLatitude  *float64 `json:"check_out_latitude"`
	CheckOutLongitude *float64 `json:"check_out_longitude"`
	CheckOutAddress   string   `json:"check_out_address"`
	CheckOutNote      string   `json:"check_out_note"`
	Status            string   `json:"status"`
	WorkingMinutes    int      `json:"working_minutes"`
	WorkingHours      string   `json:"working_hours"` // Formatted: "8h 30m"
	OvertimeMinutes   int      `json:"overtime_minutes"`
	OvertimeHours     string   `json:"overtime_hours"` // Formatted: "1h 30m"
	LateMinutes       int      `json:"late_minutes"`
	EarlyLeaveMinutes int      `json:"early_leave_minutes"`
	WorkScheduleID    string   `json:"work_schedule_id"`
	LeaveRequestID    *string  `json:"leave_request_id"`
	Notes             string   `json:"notes"`
	IsManualEntry     bool     `json:"is_manual_entry"`
	ManualEntryReason string   `json:"manual_entry_reason"`
	ApprovedBy        *string  `json:"approved_by"`
	CreatedAt         string   `json:"created_at"`
	UpdatedAt         string   `json:"updated_at"`
}

// TodayAttendanceResponse represents the current day's attendance status
type TodayAttendanceResponse struct {
	HasCheckedIn      bool                      `json:"has_checked_in"`
	HasCheckedOut     bool                      `json:"has_checked_out"`
	AttendanceRecord  *AttendanceRecordResponse `json:"attendance_record"`
	WorkSchedule      *WorkScheduleResponse     `json:"work_schedule"`
	IsWorkingDay      bool                      `json:"is_working_day"`
	IsHoliday         bool                      `json:"is_holiday"`
	HolidayInfo       *HolidayResponse          `json:"holiday_info"`
	CurrentServerTime string                    `json:"current_server_time"` // For client sync
}

// MonthlyAttendanceStats represents monthly attendance statistics
type MonthlyAttendanceStats struct {
	EmployeeID            string `json:"employee_id"`
	Year                  int    `json:"year"`
	Month                 int    `json:"month"`
	PresentDays           int    `json:"present_days"`
	AbsentDays            int    `json:"absent_days"`
	LateDays              int    `json:"late_days"`
	HalfDays              int    `json:"half_days"`
	LeaveDays             int    `json:"leave_days"`
	HolidayDays           int    `json:"holiday_days"`
	TotalWorkingMinutes   int    `json:"total_working_minutes"`
	TotalWorkingHours     string `json:"total_working_hours"` // Formatted
	TotalOvertimeMinutes  int    `json:"total_overtime_minutes"`
	TotalOvertimeHours    string `json:"total_overtime_hours"` // Formatted
	TotalLateMinutes      int    `json:"total_late_minutes"`
	TotalEarlyLeaveMinutes int   `json:"total_early_leave_minutes"`
	AttendancePercentage  float64 `json:"attendance_percentage"`
}

// MonthlyReportRequest represents the request for monthly report
type MonthlyReportRequest struct {
	Year       int    `form:"year" binding:"required,gte=2000,lte=2100"`
	Month      int    `form:"month" binding:"required,gte=1,lte=12"`
	EmployeeID string `form:"employee_id" binding:"omitempty,uuid"`
	DivisionID string `form:"division_id" binding:"omitempty,uuid"`
}
