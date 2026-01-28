package usecase

import (
	"context"
	"errors"
	"math"
	"time"

	"github.com/gilabs/gims/api/internal/core/utils"
	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"github.com/gilabs/gims/api/internal/hrd/data/repositories"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
	"github.com/gilabs/gims/api/internal/hrd/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrAttendanceNotFound     = errors.New("attendance record not found")
	ErrAlreadyCheckedIn       = errors.New("already checked in for today")
	ErrNotCheckedIn           = errors.New("not checked in yet")
	ErrAlreadyCheckedOut      = errors.New("already checked out for today")
	ErrGPSRequired            = errors.New("GPS location is required")
	ErrOutsideGPSRadius       = errors.New("you are outside the allowed GPS radius")
	ErrNotWorkingDay          = errors.New("today is not a working day")
	ErrHolidayNoCheckIn       = errors.New("cannot check in on holiday")
)

// AttendanceRecordUsecase defines the interface for attendance record business logic
type AttendanceRecordUsecase interface {
	List(ctx context.Context, req *dto.ListAttendanceRecordsRequest) ([]dto.AttendanceRecordResponse, *utils.PaginationResult, error)
	GetByID(ctx context.Context, id string) (*dto.AttendanceRecordResponse, error)
	GetTodayAttendance(ctx context.Context, employeeID string) (*dto.TodayAttendanceResponse, error)
	ClockIn(ctx context.Context, employeeID string, req *dto.ClockInRequest) (*dto.AttendanceRecordResponse, error)
	ClockOut(ctx context.Context, employeeID string, req *dto.ClockOutRequest) (*dto.AttendanceRecordResponse, error)
	CreateManualEntry(ctx context.Context, req *dto.ManualAttendanceRequest, createdBy string) (*dto.AttendanceRecordResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateAttendanceRecordRequest) (*dto.AttendanceRecordResponse, error)
	Delete(ctx context.Context, id string) error
	GetMonthlyStats(ctx context.Context, req *dto.MonthlyReportRequest) ([]dto.MonthlyAttendanceStats, error)
}

type attendanceRecordUsecase struct {
	attendanceRepo   repositories.AttendanceRecordRepository
	workScheduleRepo repositories.WorkScheduleRepository
	holidayRepo      repositories.HolidayRepository
	mapper           *mapper.AttendanceRecordMapper
	wsMapper         *mapper.WorkScheduleMapper
	holidayMapper    *mapper.HolidayMapper
}

// NewAttendanceRecordUsecase creates a new AttendanceRecordUsecase
func NewAttendanceRecordUsecase(
	attendanceRepo repositories.AttendanceRecordRepository,
	workScheduleRepo repositories.WorkScheduleRepository,
	holidayRepo repositories.HolidayRepository,
) AttendanceRecordUsecase {
	return &attendanceRecordUsecase{
		attendanceRepo:   attendanceRepo,
		workScheduleRepo: workScheduleRepo,
		holidayRepo:      holidayRepo,
		mapper:           mapper.NewAttendanceRecordMapper(),
		wsMapper:         mapper.NewWorkScheduleMapper(),
		holidayMapper:    mapper.NewHolidayMapper(),
	}
}

func (u *attendanceRecordUsecase) List(ctx context.Context, req *dto.ListAttendanceRecordsRequest) ([]dto.AttendanceRecordResponse, *utils.PaginationResult, error) {
	records, total, err := u.attendanceRepo.List(ctx, req)
	if err != nil {
		return nil, nil, err
	}

	responses := u.mapper.ToResponseList(records)

	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	pagination := &utils.PaginationResult{
		Page:       page,
		PerPage:    perPage,
		Total:      int(total),
		TotalPages: int((total + int64(perPage) - 1) / int64(perPage)),
	}

	return responses, pagination, nil
}

func (u *attendanceRecordUsecase) GetByID(ctx context.Context, id string) (*dto.AttendanceRecordResponse, error) {
	ar, err := u.attendanceRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAttendanceNotFound
		}
		return nil, err
	}
	return u.mapper.ToResponse(ar), nil
}

func (u *attendanceRecordUsecase) GetTodayAttendance(ctx context.Context, employeeID string) (*dto.TodayAttendanceResponse, error) {
	today := time.Now()

	// Get today's attendance record
	ar, err := u.attendanceRepo.FindByEmployeeAndDate(ctx, employeeID, today)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Get work schedule (default for now)
	ws, err := u.workScheduleRepo.FindDefault(ctx)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Check if today is a holiday
	isHoliday, holiday, err := u.holidayRepo.IsHoliday(ctx, today)
	if err != nil {
		return nil, err
	}

	return u.mapper.ToTodayResponse(ar, ws, isHoliday, holiday, u.wsMapper, u.holidayMapper), nil
}

func (u *attendanceRecordUsecase) ClockIn(ctx context.Context, employeeID string, req *dto.ClockInRequest) (*dto.AttendanceRecordResponse, error) {
	today := time.Now()

	// Check if already checked in
	existing, err := u.attendanceRepo.FindByEmployeeAndDate(ctx, employeeID, today)
	if err == nil && existing.CheckInTime != nil {
		return nil, ErrAlreadyCheckedIn
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Get work schedule
	ws, err := u.workScheduleRepo.FindDefault(ctx)
	if err != nil {
		return nil, err
	}

	// Check if today is a working day
	if !ws.IsWorkingDay(int(today.Weekday())) {
		// Allow WFH or field work on non-working days
		if req.CheckInType == string(models.CheckInTypeNormal) {
			return nil, ErrNotWorkingDay
		}
	}

	// Check if holiday
	isHoliday, _, err := u.holidayRepo.IsHoliday(ctx, today)
	if err != nil {
		return nil, err
	}
	if isHoliday && req.CheckInType == string(models.CheckInTypeNormal) {
		return nil, ErrHolidayNoCheckIn
	}

	// GPS validation
	if ws.RequireGPS && req.CheckInType == string(models.CheckInTypeNormal) {
		if req.Latitude == nil || req.Longitude == nil {
			return nil, ErrGPSRequired
		}

		// Calculate distance from office
		distance := u.calculateDistance(ws.OfficeLatitude, ws.OfficeLongitude, *req.Latitude, *req.Longitude)
		if distance > ws.GPSRadiusMeter {
			return nil, ErrOutsideGPSRadius
		}
	}

	// Calculate late minutes
	now := time.Now()
	lateMinutes := 0

	// Parse schedule start time
	scheduleStart, _ := time.Parse("15:04", ws.StartTime)
	scheduleStartToday := time.Date(today.Year(), today.Month(), today.Day(),
		scheduleStart.Hour(), scheduleStart.Minute(), 0, 0, today.Location())

	// Add tolerance
	scheduleStartToday = scheduleStartToday.Add(time.Duration(ws.LateToleranceMinutes) * time.Minute)

	if now.After(scheduleStartToday) {
		lateMinutes = int(now.Sub(scheduleStartToday).Minutes())
	}

	// Determine status
	status := models.AttendanceStatusPresent
	if lateMinutes > 0 {
		status = models.AttendanceStatusLate
	}
	if req.CheckInType == string(models.CheckInTypeWFH) {
		status = models.AttendanceStatusWFH
	}

	// Create or update attendance record
	ar := existing
	if ar == nil {
		ar = &models.AttendanceRecord{
			EmployeeID:     employeeID,
			Date:           today,
			WorkScheduleID: ws.ID,
		}
	}

	ar.CheckInTime = &now
	ar.CheckInType = models.CheckInType(req.CheckInType)
	ar.CheckInLatitude = req.Latitude
	ar.CheckInLongitude = req.Longitude
	ar.CheckInAddress = req.Address
	ar.CheckInNote = req.Note
	ar.LateMinutes = lateMinutes
	ar.Status = status

	if existing == nil {
		err = u.attendanceRepo.Create(ctx, ar)
	} else {
		err = u.attendanceRepo.Update(ctx, ar)
	}

	if err != nil {
		return nil, err
	}

	return u.mapper.ToResponse(ar), nil
}

func (u *attendanceRecordUsecase) ClockOut(ctx context.Context, employeeID string, req *dto.ClockOutRequest) (*dto.AttendanceRecordResponse, error) {
	today := time.Now()

	// Get today's attendance
	ar, err := u.attendanceRepo.FindByEmployeeAndDate(ctx, employeeID, today)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotCheckedIn
		}
		return nil, err
	}

	if ar.CheckInTime == nil {
		return nil, ErrNotCheckedIn
	}

	if ar.CheckOutTime != nil {
		return nil, ErrAlreadyCheckedOut
	}

	// Get work schedule
	ws, _ := u.workScheduleRepo.FindByID(ctx, ar.WorkScheduleID)

	now := time.Now()
	ar.CheckOutTime = &now
	ar.CheckOutLatitude = req.Latitude
	ar.CheckOutLongitude = req.Longitude
	ar.CheckOutAddress = req.Address
	ar.CheckOutNote = req.Note

	// Calculate working minutes
	ar.CalculateWorkingMinutes()

	// Calculate early leave minutes
	if ws != nil {
		scheduleEnd, _ := time.Parse("15:04", ws.EndTime)
		scheduleEndToday := time.Date(today.Year(), today.Month(), today.Day(),
			scheduleEnd.Hour(), scheduleEnd.Minute(), 0, 0, today.Location())

		// Subtract tolerance
		scheduleEndToday = scheduleEndToday.Add(-time.Duration(ws.EarlyLeaveToleranceMinutes) * time.Minute)

		if now.Before(scheduleEndToday) {
			ar.EarlyLeaveMinutes = int(scheduleEndToday.Sub(now).Minutes())
		}

		// Calculate overtime (if worked beyond schedule end time + 30 mins buffer)
		if now.After(scheduleEndToday.Add(30 * time.Minute)) {
			ar.OvertimeMinutes = int(now.Sub(scheduleEndToday).Minutes()) - 30
		}

		// Subtract break duration from working minutes
		ar.BreakMinutes = ws.BreakDuration
		ar.WorkingMinutes -= ar.BreakMinutes
		if ar.WorkingMinutes < 0 {
			ar.WorkingMinutes = 0
		}
	}

	if err := u.attendanceRepo.Update(ctx, ar); err != nil {
		return nil, err
	}

	return u.mapper.ToResponse(ar), nil
}

func (u *attendanceRecordUsecase) CreateManualEntry(ctx context.Context, req *dto.ManualAttendanceRequest, createdBy string) (*dto.AttendanceRecordResponse, error) {
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return nil, err
	}

	// Check if record already exists
	existing, err := u.attendanceRepo.FindByEmployeeAndDate(ctx, req.EmployeeID, date)
	if err == nil && existing != nil {
		return nil, errors.New("attendance record already exists for this date")
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Get work schedule
	ws, err := u.workScheduleRepo.FindDefault(ctx)
	if err != nil {
		return nil, err
	}

	ar := &models.AttendanceRecord{
		EmployeeID:        req.EmployeeID,
		Date:              date,
		CheckInType:       models.CheckInType(req.CheckInType),
		Status:            models.AttendanceStatus(req.Status),
		Notes:             req.Notes,
		IsManualEntry:     true,
		ManualEntryReason: req.Reason,
		ApprovedBy:        &createdBy,
		WorkScheduleID:    ws.ID,
	}

	// Parse times if provided
	if req.CheckInTime != nil {
		checkInTime, err := time.Parse("15:04", *req.CheckInTime)
		if err == nil {
			t := time.Date(date.Year(), date.Month(), date.Day(),
				checkInTime.Hour(), checkInTime.Minute(), 0, 0, date.Location())
			ar.CheckInTime = &t
		}
	}

	if req.CheckOutTime != nil {
		checkOutTime, err := time.Parse("15:04", *req.CheckOutTime)
		if err == nil {
			t := time.Date(date.Year(), date.Month(), date.Day(),
				checkOutTime.Hour(), checkOutTime.Minute(), 0, 0, date.Location())
			ar.CheckOutTime = &t
		}
	}

	// Calculate working minutes if both times provided
	ar.CalculateWorkingMinutes()

	if err := u.attendanceRepo.Create(ctx, ar); err != nil {
		return nil, err
	}

	return u.mapper.ToResponse(ar), nil
}

func (u *attendanceRecordUsecase) Update(ctx context.Context, id string, req *dto.UpdateAttendanceRecordRequest) (*dto.AttendanceRecordResponse, error) {
	ar, err := u.attendanceRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAttendanceNotFound
		}
		return nil, err
	}

	// Apply updates
	if req.CheckInTime != nil {
		checkInTime, err := time.Parse("15:04", *req.CheckInTime)
		if err == nil {
			t := time.Date(ar.Date.Year(), ar.Date.Month(), ar.Date.Day(),
				checkInTime.Hour(), checkInTime.Minute(), 0, 0, ar.Date.Location())
			ar.CheckInTime = &t
		}
	}

	if req.CheckOutTime != nil {
		checkOutTime, err := time.Parse("15:04", *req.CheckOutTime)
		if err == nil {
			t := time.Date(ar.Date.Year(), ar.Date.Month(), ar.Date.Day(),
				checkOutTime.Hour(), checkOutTime.Minute(), 0, 0, ar.Date.Location())
			ar.CheckOutTime = &t
		}
	}

	if req.CheckInType != nil {
		ar.CheckInType = models.CheckInType(*req.CheckInType)
	}

	if req.Status != nil {
		ar.Status = models.AttendanceStatus(*req.Status)
	}

	if req.Notes != nil {
		ar.Notes = *req.Notes
	}

	if req.ManualEntryReason != nil {
		ar.ManualEntryReason = *req.ManualEntryReason
		ar.IsManualEntry = true
	}

	// Recalculate working minutes
	ar.CalculateWorkingMinutes()

	if err := u.attendanceRepo.Update(ctx, ar); err != nil {
		return nil, err
	}

	return u.mapper.ToResponse(ar), nil
}

func (u *attendanceRecordUsecase) Delete(ctx context.Context, id string) error {
	_, err := u.attendanceRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrAttendanceNotFound
		}
		return err
	}

	return u.attendanceRepo.Delete(ctx, id)
}

func (u *attendanceRecordUsecase) GetMonthlyStats(ctx context.Context, req *dto.MonthlyReportRequest) ([]dto.MonthlyAttendanceStats, error) {
	// For now, just get stats for one employee
	// In production, this would handle division-level reports

	if req.EmployeeID == "" {
		return nil, errors.New("employee_id is required")
	}

	stats, err := u.attendanceRepo.GetEmployeeMonthlyStats(ctx, req.EmployeeID, req.Year, req.Month)
	if err != nil {
		return nil, err
	}

	// Calculate working days in month
	firstDay := time.Date(req.Year, time.Month(req.Month), 1, 0, 0, 0, 0, time.Local)
	lastDay := firstDay.AddDate(0, 1, -1)
	workingDays := 0
	for d := firstDay; !d.After(lastDay); d = d.AddDate(0, 0, 1) {
		if d.Weekday() != time.Saturday && d.Weekday() != time.Sunday {
			workingDays++
		}
	}

	formattedStats := u.mapper.ToMonthlyStats(stats, workingDays)

	return []dto.MonthlyAttendanceStats{*formattedStats}, nil
}

// calculateDistance calculates distance between two GPS coordinates in meters using Haversine formula
func (u *attendanceRecordUsecase) calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371000 // Earth radius in meters

	lat1Rad := lat1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	deltaLat := (lat2 - lat1) * math.Pi / 180
	deltaLon := (lon2 - lon1) * math.Pi / 180

	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*
			math.Sin(deltaLon/2)*math.Sin(deltaLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}
