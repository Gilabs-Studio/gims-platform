package seeders

import (
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"gorm.io/gorm/clause"
)

// Attendance Record IDs (hex-only prefixes: d0 = attendance)
const (
	// Admin Employee attendance records
	AttAdminFeb02ID = "d0000001-0000-0000-0000-000000000001"
	AttAdminFeb03ID = "d0000001-0000-0000-0000-000000000002"
	AttAdminFeb04ID = "d0000001-0000-0000-0000-000000000003"
	AttAdminFeb05ID = "d0000001-0000-0000-0000-000000000004"
	AttAdminFeb06ID = "d0000001-0000-0000-0000-000000000005"

	// Manager Employee attendance records
	AttMgrFeb02ID = "d0000002-0000-0000-0000-000000000001"
	AttMgrFeb03ID = "d0000002-0000-0000-0000-000000000002"
	AttMgrFeb04ID = "d0000002-0000-0000-0000-000000000003"
	AttMgrFeb05ID = "d0000002-0000-0000-0000-000000000004"
	AttMgrFeb06ID = "d0000002-0000-0000-0000-000000000005"

	// Staff Employee attendance records
	AttStaffFeb02ID = "d0000003-0000-0000-0000-000000000001"
	AttStaffFeb03ID = "d0000003-0000-0000-0000-000000000002"
	AttStaffFeb04ID = "d0000003-0000-0000-0000-000000000003"
	AttStaffFeb05ID = "d0000003-0000-0000-0000-000000000004"
	AttStaffFeb06ID = "d0000003-0000-0000-0000-000000000005"

	// January 2026 records
	AttAdminJan05ID = "d0000001-0000-0000-0001-000000000001"
	AttAdminJan06ID = "d0000001-0000-0000-0001-000000000002"
	AttAdminJan07ID = "d0000001-0000-0000-0001-000000000003"
	AttAdminJan08ID = "d0000001-0000-0000-0001-000000000004"
	AttAdminJan09ID = "d0000001-0000-0000-0001-000000000005"
	AttAdminJan12ID = "d0000001-0000-0000-0001-000000000006"
	AttAdminJan13ID = "d0000001-0000-0000-0001-000000000007"
	AttAdminJan14ID = "d0000001-0000-0000-0001-000000000008"
	AttAdminJan15ID = "d0000001-0000-0000-0001-000000000009"
	AttAdminJan16ID = "d0000001-0000-0000-0001-00000000000a"

	AttMgrJan05ID = "d0000002-0000-0000-0001-000000000001"
	AttMgrJan06ID = "d0000002-0000-0000-0001-000000000002"
	AttMgrJan07ID = "d0000002-0000-0000-0001-000000000003"
	AttMgrJan08ID = "d0000002-0000-0000-0001-000000000004"
	AttMgrJan09ID = "d0000002-0000-0000-0001-000000000005"

	AttStaffJan05ID = "d0000003-0000-0000-0001-000000000001"
	AttStaffJan06ID = "d0000003-0000-0000-0001-000000000002"
	AttStaffJan07ID = "d0000003-0000-0000-0001-000000000003"
	AttStaffJan08ID = "d0000003-0000-0000-0001-000000000004"
	AttStaffJan09ID = "d0000003-0000-0000-0001-000000000005"

	// Overtime Request IDs (d1 = overtime)
	OTAdminFeb04ID = "d1000001-0000-0000-0000-000000000001"
	OTMgrFeb03ID   = "d1000002-0000-0000-0000-000000000001"
	OTStaffFeb05ID = "d1000003-0000-0000-0000-000000000001"
	OTStaffJan07ID = "d1000003-0000-0000-0001-000000000001"
)

// Helper to create time pointer
func timePtr(t time.Time) *time.Time {
	return &t
}

// Helper to create float pointer
func floatPtr(f float64) *float64 {
	return &f
}

// SeedAttendanceRecords seeds sample attendance records for testing
func SeedAttendanceRecords() error {
	log.Println("Seeding attendance records...")

	// Office coordinates (Jakarta)
	officeLat := -6.175110
	officeLng := 106.865036

	records := []models.AttendanceRecord{
		// ===== January 2026 - Admin Employee (Mon-Fri, week of Jan 5-9) =====
		{
			ID: AttAdminJan05ID, EmployeeID: AdminEmployeeID,
			Date:            time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 1, 5, 7, 55, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 1, 5, 17, 5, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 490, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttAdminJan06ID, EmployeeID: AdminEmployeeID,
			Date:            time.Date(2026, 1, 6, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 1, 6, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 1, 6, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 480, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttAdminJan07ID, EmployeeID: AdminEmployeeID,
			Date:            time.Date(2026, 1, 7, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 1, 7, 8, 5, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 1, 7, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 475, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttAdminJan08ID, EmployeeID: AdminEmployeeID,
			Date:            time.Date(2026, 1, 8, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 1, 8, 8, 30, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 1, 8, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusLate, WorkingMinutes: 450, LateMinutes: 15, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttAdminJan09ID, EmployeeID: AdminEmployeeID,
			Date:            time.Date(2026, 1, 9, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 1, 9, 7, 50, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 1, 9, 17, 10, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 500, WorkScheduleID: DefaultWorkScheduleID,
		},
		// Admin Jan 12-16
		{
			ID: AttAdminJan12ID, EmployeeID: AdminEmployeeID,
			Date:         time.Date(2026, 1, 12, 0, 0, 0, 0, time.UTC),
			CheckInTime:  timePtr(time.Date(2026, 1, 12, 8, 0, 0, 0, time.UTC)),
			CheckInType:  models.CheckInTypeWFH,
			CheckOutTime: timePtr(time.Date(2026, 1, 12, 17, 0, 0, 0, time.UTC)),
			Status:       models.AttendanceStatusWFH, WorkingMinutes: 480, WorkScheduleID: DefaultWorkScheduleID,
			CheckInNote: "WFH - working from home",
		},
		{
			ID: AttAdminJan13ID, EmployeeID: AdminEmployeeID,
			Date:            time.Date(2026, 1, 13, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 1, 13, 7, 58, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 1, 13, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 482, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttAdminJan14ID, EmployeeID: AdminEmployeeID,
			Date:           time.Date(2026, 1, 14, 0, 0, 0, 0, time.UTC),
			Status:         models.AttendanceStatusAbsent,
			WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttAdminJan15ID, EmployeeID: AdminEmployeeID,
			Date:            time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 1, 15, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 1, 15, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 480, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttAdminJan16ID, EmployeeID: AdminEmployeeID,
			Date:            time.Date(2026, 1, 16, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 1, 16, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 1, 16, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 480, WorkScheduleID: DefaultWorkScheduleID,
		},

		// ===== January 2026 - Manager Employee (Jan 5-9) =====
		{
			ID: AttMgrJan05ID, EmployeeID: ManagerEmployeeID,
			Date:            time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 1, 5, 7, 45, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 1, 5, 17, 30, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 525, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttMgrJan06ID, EmployeeID: ManagerEmployeeID,
			Date:            time.Date(2026, 1, 6, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 1, 6, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 1, 6, 17, 15, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 495, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttMgrJan07ID, EmployeeID: ManagerEmployeeID,
			Date:            time.Date(2026, 1, 7, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 1, 7, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 1, 7, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 480, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttMgrJan08ID, EmployeeID: ManagerEmployeeID,
			Date:            time.Date(2026, 1, 8, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 1, 8, 8, 45, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 1, 8, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusLate, WorkingMinutes: 435, LateMinutes: 30, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttMgrJan09ID, EmployeeID: ManagerEmployeeID,
			Date:            time.Date(2026, 1, 9, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 1, 9, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 1, 9, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 480, WorkScheduleID: DefaultWorkScheduleID,
		},

		// ===== January 2026 - Staff Employee (Jan 5-9) =====
		{
			ID: AttStaffJan05ID, EmployeeID: StaffEmployeeID,
			Date:            time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 1, 5, 8, 10, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 1, 5, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 470, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttStaffJan06ID, EmployeeID: StaffEmployeeID,
			Date:            time.Date(2026, 1, 6, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 1, 6, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 1, 6, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 480, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttStaffJan07ID, EmployeeID: StaffEmployeeID,
			Date:            time.Date(2026, 1, 7, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 1, 7, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 1, 7, 19, 30, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 630, OvertimeMinutes: 150, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttStaffJan08ID, EmployeeID: StaffEmployeeID,
			Date:            time.Date(2026, 1, 8, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 1, 8, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 1, 8, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 480, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttStaffJan09ID, EmployeeID: StaffEmployeeID,
			Date:           time.Date(2026, 1, 9, 0, 0, 0, 0, time.UTC),
			Status:         models.AttendanceStatusLeave,
			WorkScheduleID: DefaultWorkScheduleID,
			Notes:          "Annual leave approved",
		},

		// ===== February 2026 - Admin Employee (Mon Feb 2 - Fri Feb 6) =====
		{
			ID: AttAdminFeb02ID, EmployeeID: AdminEmployeeID,
			Date:            time.Date(2026, 2, 2, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 2, 2, 7, 55, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 2, 2, 17, 5, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 490, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttAdminFeb03ID, EmployeeID: AdminEmployeeID,
			Date:            time.Date(2026, 2, 3, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 2, 3, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 2, 3, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 480, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttAdminFeb04ID, EmployeeID: AdminEmployeeID,
			Date:            time.Date(2026, 2, 4, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 2, 4, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 2, 4, 19, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 600, OvertimeMinutes: 120, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttAdminFeb05ID, EmployeeID: AdminEmployeeID,
			Date:         time.Date(2026, 2, 5, 0, 0, 0, 0, time.UTC),
			CheckInTime:  timePtr(time.Date(2026, 2, 5, 8, 0, 0, 0, time.UTC)),
			CheckInType:  models.CheckInTypeWFH,
			CheckOutTime: timePtr(time.Date(2026, 2, 5, 17, 0, 0, 0, time.UTC)),
			Status:       models.AttendanceStatusWFH, WorkingMinutes: 480, WorkScheduleID: DefaultWorkScheduleID,
			CheckInNote: "WFH - project deadline preparation",
		},
		{
			ID: AttAdminFeb06ID, EmployeeID: AdminEmployeeID,
			Date:            time.Date(2026, 2, 6, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 2, 6, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 2, 6, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 480, WorkScheduleID: DefaultWorkScheduleID,
		},

		// ===== February 2026 - Manager Employee (Feb 2 - Feb 6) =====
		{
			ID: AttMgrFeb02ID, EmployeeID: ManagerEmployeeID,
			Date:            time.Date(2026, 2, 2, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 2, 2, 7, 50, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 2, 2, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 490, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttMgrFeb03ID, EmployeeID: ManagerEmployeeID,
			Date:            time.Date(2026, 2, 3, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 2, 3, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 2, 3, 19, 15, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 615, OvertimeMinutes: 135, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttMgrFeb04ID, EmployeeID: ManagerEmployeeID,
			Date:            time.Date(2026, 2, 4, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 2, 4, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 2, 4, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 480, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttMgrFeb05ID, EmployeeID: ManagerEmployeeID,
			Date:            time.Date(2026, 2, 5, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 2, 5, 8, 35, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 2, 5, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusLate, WorkingMinutes: 445, LateMinutes: 20, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttMgrFeb06ID, EmployeeID: ManagerEmployeeID,
			Date:            time.Date(2026, 2, 6, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 2, 6, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 2, 6, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 480, WorkScheduleID: DefaultWorkScheduleID,
		},

		// ===== February 2026 - Staff Employee (Feb 2 - Feb 6) =====
		{
			ID: AttStaffFeb02ID, EmployeeID: StaffEmployeeID,
			Date:            time.Date(2026, 2, 2, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 2, 2, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 2, 2, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 480, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttStaffFeb03ID, EmployeeID: StaffEmployeeID,
			Date:            time.Date(2026, 2, 3, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 2, 3, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeFieldWork,
			CheckInLatitude: floatPtr(-6.2088), CheckInLongitude: floatPtr(106.8456),
			CheckOutTime:     timePtr(time.Date(2026, 2, 3, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(-6.2088), CheckOutLongitude: floatPtr(106.8456),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 480, WorkScheduleID: DefaultWorkScheduleID,
			CheckInNote: "Client visit - PT ABC",
		},
		{
			ID: AttStaffFeb04ID, EmployeeID: StaffEmployeeID,
			Date:            time.Date(2026, 2, 4, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 2, 4, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 2, 4, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 480, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttStaffFeb05ID, EmployeeID: StaffEmployeeID,
			Date:            time.Date(2026, 2, 5, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 2, 5, 8, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 2, 5, 19, 45, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusPresent, WorkingMinutes: 645, OvertimeMinutes: 165, WorkScheduleID: DefaultWorkScheduleID,
		},
		{
			ID: AttStaffFeb06ID, EmployeeID: StaffEmployeeID,
			Date:            time.Date(2026, 2, 6, 0, 0, 0, 0, time.UTC),
			CheckInTime:     timePtr(time.Date(2026, 2, 6, 9, 0, 0, 0, time.UTC)),
			CheckInType:     models.CheckInTypeNormal,
			CheckInLatitude: floatPtr(officeLat), CheckInLongitude: floatPtr(officeLng),
			CheckOutTime:     timePtr(time.Date(2026, 2, 6, 17, 0, 0, 0, time.UTC)),
			CheckOutLatitude: floatPtr(officeLat), CheckOutLongitude: floatPtr(officeLng),
			Status: models.AttendanceStatusLate, WorkingMinutes: 420, LateMinutes: 45, WorkScheduleID: DefaultWorkScheduleID,
		},
	}

	for _, record := range records {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"status", "working_minutes", "overtime_minutes", "late_minutes", "updated_at"}),
		}).Create(&record).Error; err != nil {
			log.Printf("Warning: Failed to seed attendance record %s: %v", record.ID, err)
		}
	}

	log.Printf("Attendance records seeded successfully (%d entries)", len(records))
	return nil
}

// SeedOvertimeRequests seeds sample overtime requests
func SeedOvertimeRequests() error {
	log.Println("Seeding overtime requests...")

	adminID := AdminEmployeeID
	managerID := ManagerEmployeeID
	attAdminFeb04 := AttAdminFeb04ID
	attMgrFeb03 := AttMgrFeb03ID
	attStaffFeb05 := AttStaffFeb05ID
	attStaffJan07 := AttStaffJan07ID

	requests := []models.OvertimeRequest{
		// Auto-detected overtime from Admin's Feb 4 clock-out (19:00)
		{
			ID:                 OTAdminFeb04ID,
			EmployeeID:         AdminEmployeeID,
			Date:               time.Date(2026, 2, 4, 0, 0, 0, 0, time.UTC),
			RequestType:        models.OvertimeTypeAutoDetected,
			StartTime:          time.Date(2026, 2, 4, 17, 0, 0, 0, time.UTC),
			EndTime:            time.Date(2026, 2, 4, 19, 0, 0, 0, time.UTC),
			ActualMinutes:      120,
			ApprovedMinutes:    120,
			Reason:             "Project deployment preparation",
			Description:        "Preparing production deployment and running final tests",
			TaskDetails:        "1. Run integration tests\n2. Build production artifacts\n3. Deploy to staging\n4. Verify staging environment",
			Status:             models.OvertimeStatusApproved,
			ApprovedBy:         &managerID,
			ApprovedAt:         timePtr(time.Date(2026, 2, 5, 9, 0, 0, 0, time.UTC)),
			AttendanceRecordID: &attAdminFeb04,
			OvertimeRate:       1.5,
			CompensationAmount: 150000,
			IsManagerNotified:  true,
			ManagerNotifiedAt:  timePtr(time.Date(2026, 2, 4, 19, 5, 0, 0, time.UTC)),
		},
		// Auto-detected overtime from Manager's Feb 3 clock-out (19:15)
		{
			ID:                 OTMgrFeb03ID,
			EmployeeID:         ManagerEmployeeID,
			Date:               time.Date(2026, 2, 3, 0, 0, 0, 0, time.UTC),
			RequestType:        models.OvertimeTypeAutoDetected,
			StartTime:          time.Date(2026, 2, 3, 17, 0, 0, 0, time.UTC),
			EndTime:            time.Date(2026, 2, 3, 19, 15, 0, 0, time.UTC),
			ActualMinutes:      135,
			Reason:             "Monthly report review",
			Description:        "Reviewing and finalizing monthly performance report",
			Status:             models.OvertimeStatusPending,
			AttendanceRecordID: &attMgrFeb03,
			OvertimeRate:       1.5,
			IsManagerNotified:  false,
		},
		// Staff Feb 5 overtime (19:45 clock-out) - approved
		{
			ID:                 OTStaffFeb05ID,
			EmployeeID:         StaffEmployeeID,
			Date:               time.Date(2026, 2, 5, 0, 0, 0, 0, time.UTC),
			RequestType:        models.OvertimeTypeAutoDetected,
			StartTime:          time.Date(2026, 2, 5, 17, 0, 0, 0, time.UTC),
			EndTime:            time.Date(2026, 2, 5, 19, 45, 0, 0, time.UTC),
			ActualMinutes:      165,
			ApprovedMinutes:    150,
			Reason:             "Urgent client data migration",
			Description:        "Migrating client database to new schema, cannot be interrupted",
			TaskDetails:        "1. Export data from old schema\n2. Transform data format\n3. Import to new schema\n4. Verify data integrity",
			Status:             models.OvertimeStatusApproved,
			ApprovedBy:         &managerID,
			ApprovedAt:         timePtr(time.Date(2026, 2, 6, 9, 30, 0, 0, time.UTC)),
			AttendanceRecordID: &attStaffFeb05,
			OvertimeRate:       1.5,
			CompensationAmount: 187500,
			IsManagerNotified:  true,
			ManagerNotifiedAt:  timePtr(time.Date(2026, 2, 5, 19, 50, 0, 0, time.UTC)),
		},
		// Staff Jan 7 overtime (19:30 clock-out) - manual claim, rejected
		{
			ID:                 OTStaffJan07ID,
			EmployeeID:         StaffEmployeeID,
			Date:               time.Date(2026, 1, 7, 0, 0, 0, 0, time.UTC),
			RequestType:        models.OvertimeTypeManualClaim,
			StartTime:          time.Date(2026, 1, 7, 17, 0, 0, 0, time.UTC),
			EndTime:            time.Date(2026, 1, 7, 19, 30, 0, 0, time.UTC),
			ActualMinutes:      150,
			PlannedMinutes:     150,
			Reason:             "System maintenance work",
			Description:        "Performing scheduled database maintenance",
			Status:             models.OvertimeStatusRejected,
			RejectedBy:         &adminID,
			RejectedAt:         timePtr(time.Date(2026, 1, 8, 10, 0, 0, 0, time.UTC)),
			RejectReason:       "Maintenance was scheduled during normal hours. Please coordinate with IT team.",
			AttendanceRecordID: &attStaffJan07,
			OvertimeRate:       1.5,
			IsManagerNotified:  true,
			ManagerNotifiedAt:  timePtr(time.Date(2026, 1, 7, 20, 0, 0, 0, time.UTC)),
		},
	}

	for _, req := range requests {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"status", "approved_minutes", "compensation_amount", "updated_at"}),
		}).Create(&req).Error; err != nil {
			log.Printf("Warning: Failed to seed overtime request %s: %v", req.ID, err)
		}
	}

	log.Printf("Overtime requests seeded successfully (%d entries)", len(requests))
	return nil
}
