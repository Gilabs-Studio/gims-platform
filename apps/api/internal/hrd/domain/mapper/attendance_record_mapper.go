package mapper

import (
	"fmt"
	"time"

	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
)

// AttendanceRecordMapper handles mapping between AttendanceRecord model and DTOs
type AttendanceRecordMapper struct{}

// NewAttendanceRecordMapper creates a new AttendanceRecordMapper
func NewAttendanceRecordMapper() *AttendanceRecordMapper {
	return &AttendanceRecordMapper{}
}

// ToResponse converts AttendanceRecord model to response DTO
func (m *AttendanceRecordMapper) ToResponse(ar *models.AttendanceRecord) *dto.AttendanceRecordResponse {
	resp := &dto.AttendanceRecordResponse{
		ID:                ar.ID,
		EmployeeID:        ar.EmployeeID,
		Date:              ar.Date.Format("2006-01-02"),
		CheckInType:       string(ar.CheckInType),
		CheckInLatitude:   ar.CheckInLatitude,
		CheckInLongitude:  ar.CheckInLongitude,
		CheckInAddress:    ar.CheckInAddress,
		CheckInNote:       ar.CheckInNote,
		CheckOutLatitude:  ar.CheckOutLatitude,
		CheckOutLongitude: ar.CheckOutLongitude,
		CheckOutAddress:   ar.CheckOutAddress,
		CheckOutNote:      ar.CheckOutNote,
		Status:            string(ar.Status),
		WorkingMinutes:    ar.WorkingMinutes,
		WorkingHours:      m.formatMinutesToHours(ar.WorkingMinutes),
		OvertimeMinutes:   ar.OvertimeMinutes,
		OvertimeHours:     m.formatMinutesToHours(ar.OvertimeMinutes),
		LateMinutes:       ar.LateMinutes,
		EarlyLeaveMinutes: ar.EarlyLeaveMinutes,
		WorkScheduleID:    ar.WorkScheduleID,
		LeaveRequestID:    ar.LeaveRequestID,
		Notes:             ar.Notes,
		IsManualEntry:     ar.IsManualEntry,
		ManualEntryReason: ar.ManualEntryReason,
		ApprovedBy:        ar.ApprovedBy,
		CreatedAt:         ar.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:         ar.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if ar.CheckInTime != nil {
		checkInStr := ar.CheckInTime.Format("15:04:05")
		resp.CheckInTime = &checkInStr
	}
	if ar.CheckOutTime != nil {
		checkOutStr := ar.CheckOutTime.Format("15:04:05")
		resp.CheckOutTime = &checkOutStr
	}

	return resp
}

// ToResponseList converts a list of AttendanceRecord models to response DTOs
func (m *AttendanceRecordMapper) ToResponseList(records []models.AttendanceRecord) []dto.AttendanceRecordResponse {
	responses := make([]dto.AttendanceRecordResponse, len(records))
	for i, ar := range records {
		responses[i] = *m.ToResponse(&ar)
	}
	return responses
}

// ToTodayResponse creates today's attendance response
func (m *AttendanceRecordMapper) ToTodayResponse(
	ar *models.AttendanceRecord,
	ws *models.WorkSchedule,
	isHoliday bool,
	holiday *models.Holiday,
	wsMapper *WorkScheduleMapper,
	holidayMapper *HolidayMapper,
) *dto.TodayAttendanceResponse {
	resp := &dto.TodayAttendanceResponse{
		HasCheckedIn:      ar != nil && ar.CheckInTime != nil,
		HasCheckedOut:     ar != nil && ar.CheckOutTime != nil,
		IsWorkingDay:      true,
		IsHoliday:         isHoliday,
		CurrentServerTime: time.Now().Format("2006-01-02T15:04:05Z07:00"),
	}

	if ar != nil {
		resp.AttendanceRecord = m.ToResponse(ar)
	}

	if ws != nil {
		resp.WorkSchedule = wsMapper.ToResponse(ws)
		resp.IsWorkingDay = ws.IsWorkingDay(int(time.Now().Weekday()))
	}

	if holiday != nil {
		resp.HolidayInfo = holidayMapper.ToResponse(holiday)
	}

	return resp
}

// ToMonthlyStats converts stats with formatted fields
func (m *AttendanceRecordMapper) ToMonthlyStats(stats *dto.MonthlyAttendanceStats, workingDaysInMonth int) *dto.MonthlyAttendanceStats {
	stats.TotalWorkingHours = m.formatMinutesToHours(stats.TotalWorkingMinutes)
	stats.TotalOvertimeHours = m.formatMinutesToHours(stats.TotalOvertimeMinutes)

	// Calculate attendance percentage
	if workingDaysInMonth > 0 {
		stats.AttendancePercentage = float64(stats.PresentDays+stats.LateDays) / float64(workingDaysInMonth) * 100
	}

	return stats
}

// formatMinutesToHours converts minutes to "Xh Ym" format
func (m *AttendanceRecordMapper) formatMinutesToHours(minutes int) string {
	if minutes <= 0 {
		return "0h 0m"
	}
	hours := minutes / 60
	mins := minutes % 60
	return fmt.Sprintf("%dh %dm", hours, mins)
}
