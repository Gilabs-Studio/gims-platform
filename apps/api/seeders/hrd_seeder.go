package seeders

import (
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"gorm.io/gorm/clause"
)

// Work Schedule IDs (fixed UUIDs for consistency)
const (
	DefaultWorkScheduleID  = "00000000-0000-0000-0000-000000000001"
	FlexibleWorkScheduleID = "00000000-0000-0000-0000-000000000002"
)

// SeedWorkSchedules seeds initial work schedules
func SeedWorkSchedules() error {
	workSchedules := []models.WorkSchedule{
		{
			ID:                         DefaultWorkScheduleID,
			Name:                       "Standard Office Hours",
			Description:                "Standard 08:00 - 17:00 work schedule with 1 hour lunch break",
			IsDefault:                  true,
			IsActive:                   true,
			StartTime:                  "08:00",
			EndTime:                    "17:00",
			IsFlexible:                 false,
			Breaks:                     models.Breaks{{StartTime: "12:00", EndTime: "13:00"}},
			WorkingDays:                31, // Mon-Fri (1+2+4+8+16)
			WorkingHoursPerDay:         8.0,
			LateToleranceMinutes:       15,
			EarlyLeaveToleranceMinutes: 0,
			RequireGPS:                 true,
			GPSRadiusMeter:             200.0,
			OfficeLatitude:             -6.175110, // Jakarta coordinates (example)
			OfficeLongitude:            106.865036,
		},
		{
			ID:                         FlexibleWorkScheduleID,
			Name:                       "Flexible Hours",
			Description:                "Flexible schedule: clock in between 07:00-09:00, must complete 8 hours",
			IsDefault:                  false,
			IsActive:                   true,
			StartTime:                  "08:00",
			EndTime:                    "17:00",
			IsFlexible:                 true,
			FlexibleStartTime:          "07:00",
			FlexibleEndTime:            "09:00",
			Breaks:                     models.Breaks{{StartTime: "12:00", EndTime: "13:00"}},
			WorkingDays:                31,
			WorkingHoursPerDay:         8.0,
			LateToleranceMinutes:       0,
			EarlyLeaveToleranceMinutes: 0,
			RequireGPS:                 false,
		},
	}

	for _, ws := range workSchedules {
		result := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "description", "updated_at"}),
		}).Create(&ws)

		if result.Error != nil {
			log.Printf("Error seeding work schedule %s: %v", ws.Name, result.Error)
			return result.Error
		}
	}

	log.Println("Work schedules seeded successfully")
	return nil
}

// SeedHolidays seeds Indonesia national holidays for current and next year
func SeedHolidays() error {
	log.Println("Seeding holidays...")

	// Indonesia National Holidays 2025-2026
	holidays := []models.Holiday{
		// 2025 National Holidays
		{ID: "c0000001-0000-0000-0000-000000000001", Date: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC), Name: "Tahun Baru Masehi", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{ID: "c0000001-0000-0000-0000-000000000002", Date: time.Date(2025, 1, 27, 0, 0, 0, 0, time.UTC), Name: "Isra Mi'raj Nabi Muhammad SAW", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{ID: "c0000001-0000-0000-0000-000000000003", Date: time.Date(2025, 1, 29, 0, 0, 0, 0, time.UTC), Name: "Tahun Baru Imlek 2576", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{ID: "c0000001-0000-0000-0000-000000000004", Date: time.Date(2025, 3, 29, 0, 0, 0, 0, time.UTC), Name: "Hari Suci Nyepi", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{ID: "c0000001-0000-0000-0000-000000000005", Date: time.Date(2025, 3, 30, 0, 0, 0, 0, time.UTC), Name: "Hari Raya Idul Fitri 1446 H (Hari 1)", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{ID: "c0000001-0000-0000-0000-000000000006", Date: time.Date(2025, 3, 31, 0, 0, 0, 0, time.UTC), Name: "Hari Raya Idul Fitri 1446 H (Hari 2)", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{ID: "c0000001-0000-0000-0000-000000000007", Date: time.Date(2025, 4, 18, 0, 0, 0, 0, time.UTC), Name: "Wafat Isa Almasih", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{ID: "c0000001-0000-0000-0000-000000000008", Date: time.Date(2025, 5, 1, 0, 0, 0, 0, time.UTC), Name: "Hari Buruh Internasional", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{ID: "c0000001-0000-0000-0000-000000000009", Date: time.Date(2025, 5, 12, 0, 0, 0, 0, time.UTC), Name: "Hari Raya Waisak 2569 BE", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{ID: "c0000001-0000-0000-0000-00000000000a", Date: time.Date(2025, 5, 29, 0, 0, 0, 0, time.UTC), Name: "Kenaikan Isa Almasih", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{ID: "c0000001-0000-0000-0000-00000000000b", Date: time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC), Name: "Hari Lahir Pancasila", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{ID: "c0000001-0000-0000-0000-00000000000c", Date: time.Date(2025, 6, 6, 0, 0, 0, 0, time.UTC), Name: "Hari Raya Idul Adha 1446 H", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{ID: "c0000001-0000-0000-0000-00000000000d", Date: time.Date(2025, 6, 27, 0, 0, 0, 0, time.UTC), Name: "Tahun Baru Islam 1447 H", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{ID: "c0000001-0000-0000-0000-00000000000e", Date: time.Date(2025, 8, 17, 0, 0, 0, 0, time.UTC), Name: "Hari Kemerdekaan RI", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{ID: "c0000001-0000-0000-0000-00000000000f", Date: time.Date(2025, 9, 5, 0, 0, 0, 0, time.UTC), Name: "Maulid Nabi Muhammad SAW", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{ID: "c0000001-0000-0000-0000-000000000010", Date: time.Date(2025, 12, 25, 0, 0, 0, 0, time.UTC), Name: "Hari Raya Natal", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},

		// 2026 National Holidays
		{ID: "c0000002-0000-0000-0000-000000000001", Date: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC), Name: "Tahun Baru Masehi", Type: models.HolidayTypeNational, Year: 2026, IsActive: true},
		{ID: "c0000002-0000-0000-0000-000000000002", Date: time.Date(2026, 1, 16, 0, 0, 0, 0, time.UTC), Name: "Isra Mi'raj Nabi Muhammad SAW", Type: models.HolidayTypeNational, Year: 2026, IsActive: true},
		{ID: "c0000002-0000-0000-0000-000000000003", Date: time.Date(2026, 2, 17, 0, 0, 0, 0, time.UTC), Name: "Tahun Baru Imlek 2577", Type: models.HolidayTypeNational, Year: 2026, IsActive: true},
		{ID: "c0000002-0000-0000-0000-000000000004", Date: time.Date(2026, 3, 19, 0, 0, 0, 0, time.UTC), Name: "Hari Suci Nyepi", Type: models.HolidayTypeNational, Year: 2026, IsActive: true},
		{ID: "c0000002-0000-0000-0000-000000000005", Date: time.Date(2026, 3, 20, 0, 0, 0, 0, time.UTC), Name: "Hari Raya Idul Fitri 1447 H (Hari 1)", Type: models.HolidayTypeNational, Year: 2026, IsActive: true},
		{ID: "c0000002-0000-0000-0000-000000000006", Date: time.Date(2026, 3, 21, 0, 0, 0, 0, time.UTC), Name: "Hari Raya Idul Fitri 1447 H (Hari 2)", Type: models.HolidayTypeNational, Year: 2026, IsActive: true},
		{ID: "c0000002-0000-0000-0000-000000000007", Date: time.Date(2026, 4, 3, 0, 0, 0, 0, time.UTC), Name: "Wafat Isa Almasih", Type: models.HolidayTypeNational, Year: 2026, IsActive: true},
		{ID: "c0000002-0000-0000-0000-000000000008", Date: time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC), Name: "Hari Buruh Internasional", Type: models.HolidayTypeNational, Year: 2026, IsActive: true},
		{ID: "c0000002-0000-0000-0000-000000000009", Date: time.Date(2026, 5, 14, 0, 0, 0, 0, time.UTC), Name: "Kenaikan Isa Almasih", Type: models.HolidayTypeNational, Year: 2026, IsActive: true},
		{ID: "c0000002-0000-0000-0000-00000000000a", Date: time.Date(2026, 5, 27, 0, 0, 0, 0, time.UTC), Name: "Hari Raya Idul Adha 1447 H", Type: models.HolidayTypeNational, Year: 2026, IsActive: true},
		{ID: "c0000002-0000-0000-0000-00000000000b", Date: time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC), Name: "Hari Lahir Pancasila", Type: models.HolidayTypeNational, Year: 2026, IsActive: true},
		{ID: "c0000002-0000-0000-0000-00000000000c", Date: time.Date(2026, 6, 17, 0, 0, 0, 0, time.UTC), Name: "Tahun Baru Islam 1448 H", Type: models.HolidayTypeNational, Year: 2026, IsActive: true},
		{ID: "c0000002-0000-0000-0000-00000000000d", Date: time.Date(2026, 8, 17, 0, 0, 0, 0, time.UTC), Name: "Hari Kemerdekaan RI", Type: models.HolidayTypeNational, Year: 2026, IsActive: true},
		{ID: "c0000002-0000-0000-0000-00000000000e", Date: time.Date(2026, 8, 26, 0, 0, 0, 0, time.UTC), Name: "Maulid Nabi Muhammad SAW", Type: models.HolidayTypeNational, Year: 2026, IsActive: true},
		{ID: "c0000002-0000-0000-0000-00000000000f", Date: time.Date(2026, 12, 25, 0, 0, 0, 0, time.UTC), Name: "Hari Raya Natal", Type: models.HolidayTypeNational, Year: 2026, IsActive: true},

		// 2025 Cuti Bersama (Collective Leave)
		{ID: "c0000003-0000-0000-0000-000000000001", Date: time.Date(2025, 3, 28, 0, 0, 0, 0, time.UTC), Name: "Cuti Bersama Idul Fitri", Type: models.HolidayTypeCollective, Year: 2025, IsCollectiveLeave: true, CutsAnnualLeave: true, IsActive: true},
		{ID: "c0000003-0000-0000-0000-000000000002", Date: time.Date(2025, 4, 1, 0, 0, 0, 0, time.UTC), Name: "Cuti Bersama Idul Fitri", Type: models.HolidayTypeCollective, Year: 2025, IsCollectiveLeave: true, CutsAnnualLeave: true, IsActive: true},
		{ID: "c0000003-0000-0000-0000-000000000003", Date: time.Date(2025, 4, 2, 0, 0, 0, 0, time.UTC), Name: "Cuti Bersama Idul Fitri", Type: models.HolidayTypeCollective, Year: 2025, IsCollectiveLeave: true, CutsAnnualLeave: true, IsActive: true},
		{ID: "c0000003-0000-0000-0000-000000000004", Date: time.Date(2025, 12, 26, 0, 0, 0, 0, time.UTC), Name: "Cuti Bersama Natal", Type: models.HolidayTypeCollective, Year: 2025, IsCollectiveLeave: true, CutsAnnualLeave: true, IsActive: true},

		// 2026 Cuti Bersama (Collective Leave)
		{ID: "c0000003-0000-0000-0000-000000000005", Date: time.Date(2026, 3, 18, 0, 0, 0, 0, time.UTC), Name: "Cuti Bersama Idul Fitri", Type: models.HolidayTypeCollective, Year: 2026, IsCollectiveLeave: true, CutsAnnualLeave: true, IsActive: true},
		{ID: "c0000003-0000-0000-0000-000000000006", Date: time.Date(2026, 3, 22, 0, 0, 0, 0, time.UTC), Name: "Cuti Bersama Idul Fitri", Type: models.HolidayTypeCollective, Year: 2026, IsCollectiveLeave: true, CutsAnnualLeave: true, IsActive: true},
		{ID: "c0000003-0000-0000-0000-000000000007", Date: time.Date(2026, 3, 23, 0, 0, 0, 0, time.UTC), Name: "Cuti Bersama Idul Fitri", Type: models.HolidayTypeCollective, Year: 2026, IsCollectiveLeave: true, CutsAnnualLeave: true, IsActive: true},
		{ID: "c0000003-0000-0000-0000-000000000008", Date: time.Date(2026, 12, 24, 0, 0, 0, 0, time.UTC), Name: "Cuti Bersama Natal", Type: models.HolidayTypeCollective, Year: 2026, IsCollectiveLeave: true, CutsAnnualLeave: true, IsActive: true},

		// Company-specific holidays
		{ID: "c0000004-0000-0000-0000-000000000001", Date: time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC), Name: "Hari Ulang Tahun Perusahaan", Type: models.HolidayTypeCompany, Year: 2025, IsActive: true},
		{ID: "c0000004-0000-0000-0000-000000000002", Date: time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC), Name: "Hari Ulang Tahun Perusahaan", Type: models.HolidayTypeCompany, Year: 2026, IsActive: true},
	}

	for _, h := range holidays {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "type", "date", "year", "is_collective_leave", "cuts_annual_leave", "is_active", "updated_at"}),
		}).Create(&h).Error; err != nil {
			log.Printf("Warning: Failed to seed holiday %s (%s): %v", h.Name, h.Date.Format("2006-01-02"), err)
		}
	}

	log.Printf("Holidays seeded successfully (%d entries)", len(holidays))
	return nil
}
