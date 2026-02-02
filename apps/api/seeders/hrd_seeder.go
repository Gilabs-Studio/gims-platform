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
	DefaultWorkScheduleID = "00000000-0000-0000-0000-000000000001"
	FlexibleWorkScheduleID = "00000000-0000-0000-0000-000000000002"
)

// SeedWorkSchedules seeds initial work schedules
func SeedWorkSchedules() error {
	workSchedules := []models.WorkSchedule{
		{
			ID:                        DefaultWorkScheduleID,
			Name:                      "Standard Office Hours",
			Description:               "Standard 08:00 - 17:00 work schedule with 1 hour lunch break",
			IsDefault:                 true,
			IsActive:                  true,
			StartTime:                 "08:00",
			EndTime:                   "17:00",
			IsFlexible:                false,
			BreakStartTime:            "12:00",
			BreakEndTime:              "13:00",
			BreakDuration:             60,
			WorkingDays:               31, // Mon-Fri (1+2+4+8+16)
			WorkingHoursPerDay:        8.0,
			LateToleranceMinutes:      15,
			EarlyLeaveToleranceMinutes: 0,
			RequireGPS:                true,
			GPSRadiusMeter:            200.0,
			OfficeLatitude:            -6.175110, // Jakarta coordinates (example)
			OfficeLongitude:           106.865036,
		},
		{
			ID:                        FlexibleWorkScheduleID,
			Name:                      "Flexible Hours",
			Description:               "Flexible schedule: clock in between 07:00-09:00, must complete 8 hours",
			IsDefault:                 false,
			IsActive:                  true,
			StartTime:                 "08:00",
			EndTime:                   "17:00",
			IsFlexible:                true,
			FlexibleStartTime:         "07:00",
			FlexibleEndTime:           "09:00",
			BreakStartTime:            "12:00",
			BreakEndTime:              "13:00",
			BreakDuration:             60,
			WorkingDays:               31,
			WorkingHoursPerDay:        8.0,
			LateToleranceMinutes:      0,
			EarlyLeaveToleranceMinutes: 0,
			RequireGPS:                false,
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
	currentYear := time.Now().Year()
	
	// Indonesia National Holidays 2024-2025
	holidays := []models.Holiday{
		// 2024 Holidays
		{Date: time.Date(2024, 1, 1, 0, 0, 0, 0, time.Local), Name: "Tahun Baru Masehi", Type: models.HolidayTypeNational, Year: 2024, IsActive: true},
		{Date: time.Date(2024, 2, 8, 0, 0, 0, 0, time.Local), Name: "Isra Mi'raj Nabi Muhammad SAW", Type: models.HolidayTypeNational, Year: 2024, IsActive: true},
		{Date: time.Date(2024, 2, 10, 0, 0, 0, 0, time.Local), Name: "Tahun Baru Imlek", Type: models.HolidayTypeNational, Year: 2024, IsActive: true},
		{Date: time.Date(2024, 3, 11, 0, 0, 0, 0, time.Local), Name: "Hari Suci Nyepi", Type: models.HolidayTypeNational, Year: 2024, IsActive: true},
		{Date: time.Date(2024, 3, 29, 0, 0, 0, 0, time.Local), Name: "Wafat Isa Almasih", Type: models.HolidayTypeNational, Year: 2024, IsActive: true},
		{Date: time.Date(2024, 3, 31, 0, 0, 0, 0, time.Local), Name: "Hari Paskah", Type: models.HolidayTypeNational, Year: 2024, IsActive: true},
		{Date: time.Date(2024, 4, 10, 0, 0, 0, 0, time.Local), Name: "Hari Raya Idul Fitri 1445 H (Hari 1)", Type: models.HolidayTypeNational, Year: 2024, IsActive: true},
		{Date: time.Date(2024, 4, 11, 0, 0, 0, 0, time.Local), Name: "Hari Raya Idul Fitri 1445 H (Hari 2)", Type: models.HolidayTypeNational, Year: 2024, IsActive: true},
		{Date: time.Date(2024, 5, 1, 0, 0, 0, 0, time.Local), Name: "Hari Buruh Internasional", Type: models.HolidayTypeNational, Year: 2024, IsActive: true},
		{Date: time.Date(2024, 5, 9, 0, 0, 0, 0, time.Local), Name: "Kenaikan Isa Almasih", Type: models.HolidayTypeNational, Year: 2024, IsActive: true},
		{Date: time.Date(2024, 5, 23, 0, 0, 0, 0, time.Local), Name: "Hari Raya Waisak", Type: models.HolidayTypeNational, Year: 2024, IsActive: true},
		{Date: time.Date(2024, 6, 1, 0, 0, 0, 0, time.Local), Name: "Hari Lahir Pancasila", Type: models.HolidayTypeNational, Year: 2024, IsActive: true},
		{Date: time.Date(2024, 6, 17, 0, 0, 0, 0, time.Local), Name: "Hari Raya Idul Adha 1445 H", Type: models.HolidayTypeNational, Year: 2024, IsActive: true},
		{Date: time.Date(2024, 7, 7, 0, 0, 0, 0, time.Local), Name: "Tahun Baru Islam 1446 H", Type: models.HolidayTypeNational, Year: 2024, IsActive: true},
		{Date: time.Date(2024, 8, 17, 0, 0, 0, 0, time.Local), Name: "Hari Kemerdekaan RI", Type: models.HolidayTypeNational, Year: 2024, IsActive: true},
		{Date: time.Date(2024, 9, 16, 0, 0, 0, 0, time.Local), Name: "Maulid Nabi Muhammad SAW", Type: models.HolidayTypeNational, Year: 2024, IsActive: true},
		{Date: time.Date(2024, 12, 25, 0, 0, 0, 0, time.Local), Name: "Hari Raya Natal", Type: models.HolidayTypeNational, Year: 2024, IsActive: true},

		// 2025 Holidays
		{Date: time.Date(2025, 1, 1, 0, 0, 0, 0, time.Local), Name: "Tahun Baru Masehi", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{Date: time.Date(2025, 1, 27, 0, 0, 0, 0, time.Local), Name: "Isra Mi'raj Nabi Muhammad SAW", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{Date: time.Date(2025, 1, 29, 0, 0, 0, 0, time.Local), Name: "Tahun Baru Imlek", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{Date: time.Date(2025, 3, 29, 0, 0, 0, 0, time.Local), Name: "Hari Suci Nyepi", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{Date: time.Date(2025, 3, 30, 0, 0, 0, 0, time.Local), Name: "Hari Raya Idul Fitri 1446 H (Hari 1)", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{Date: time.Date(2025, 3, 31, 0, 0, 0, 0, time.Local), Name: "Hari Raya Idul Fitri 1446 H (Hari 2)", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{Date: time.Date(2025, 4, 18, 0, 0, 0, 0, time.Local), Name: "Wafat Isa Almasih", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{Date: time.Date(2025, 4, 20, 0, 0, 0, 0, time.Local), Name: "Hari Paskah", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{Date: time.Date(2025, 5, 1, 0, 0, 0, 0, time.Local), Name: "Hari Buruh Internasional", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{Date: time.Date(2025, 5, 12, 0, 0, 0, 0, time.Local), Name: "Hari Raya Waisak", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{Date: time.Date(2025, 5, 29, 0, 0, 0, 0, time.Local), Name: "Kenaikan Isa Almasih", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{Date: time.Date(2025, 6, 1, 0, 0, 0, 0, time.Local), Name: "Hari Lahir Pancasila", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{Date: time.Date(2025, 6, 6, 0, 0, 0, 0, time.Local), Name: "Hari Raya Idul Adha 1446 H", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{Date: time.Date(2025, 6, 27, 0, 0, 0, 0, time.Local), Name: "Tahun Baru Islam 1447 H", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{Date: time.Date(2025, 8, 17, 0, 0, 0, 0, time.Local), Name: "Hari Kemerdekaan RI", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{Date: time.Date(2025, 9, 5, 0, 0, 0, 0, time.Local), Name: "Maulid Nabi Muhammad SAW", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
		{Date: time.Date(2025, 12, 25, 0, 0, 0, 0, time.Local), Name: "Hari Raya Natal", Type: models.HolidayTypeNational, Year: 2025, IsActive: true},
	}

	// Filter to only current and next year
	var filteredHolidays []models.Holiday
	for _, h := range holidays {
		if h.Year >= currentYear {
			filteredHolidays = append(filteredHolidays, h)
		}
	}

	// Add collective leave examples (Cuti Bersama)
	collectiveLeaves := []models.Holiday{
		{Date: time.Date(2024, 4, 8, 0, 0, 0, 0, time.Local), Name: "Cuti Bersama Idul Fitri", Type: models.HolidayTypeCollective, Year: 2024, IsCollectiveLeave: true, CutsAnnualLeave: true, IsActive: true},
		{Date: time.Date(2024, 4, 9, 0, 0, 0, 0, time.Local), Name: "Cuti Bersama Idul Fitri", Type: models.HolidayTypeCollective, Year: 2024, IsCollectiveLeave: true, CutsAnnualLeave: true, IsActive: true},
		{Date: time.Date(2024, 4, 12, 0, 0, 0, 0, time.Local), Name: "Cuti Bersama Idul Fitri", Type: models.HolidayTypeCollective, Year: 2024, IsCollectiveLeave: true, CutsAnnualLeave: true, IsActive: true},
		{Date: time.Date(2024, 12, 26, 0, 0, 0, 0, time.Local), Name: "Cuti Bersama Natal", Type: models.HolidayTypeCollective, Year: 2024, IsCollectiveLeave: true, CutsAnnualLeave: true, IsActive: true},
	}

	allHolidays := append(filteredHolidays, collectiveLeaves...)

	for _, h := range allHolidays {
		// Use upsert based on date and year
		result := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "date"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "type", "is_collective_leave", "cuts_annual_leave", "updated_at"}),
		}).Create(&h)

		if result.Error != nil {
			log.Printf("Error seeding holiday %s: %v", h.Name, result.Error)
			// Continue with other holidays even if one fails
			continue
		}
	}

	log.Printf("Holidays seeded successfully (%d entries)", len(allHolidays))
	return nil
}
