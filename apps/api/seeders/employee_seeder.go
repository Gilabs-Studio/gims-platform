package seeders

import (
	"log"
	"os"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	geoModels "github.com/gilabs/gims/api/internal/geographic/data/models"
	"github.com/gilabs/gims/api/internal/organization/data/models"
	"gorm.io/gorm/clause"
)

// SeedEmployees seeds initial employee data linked to users
func SeedEmployees() error {
	db := database.DB

	// Refactored to Upsert/Ensure existence of Fixed Employees
	// We want to ensure Admin/Manager/Staff employees exist.
	
	log.Println("Seeding employees...")

	// Helpers
	strPtr := func(s string) *string {
		return &s
	}
	timePtr := func(t time.Time) *time.Time {
		return &t
	}
	date := func(year int, month time.Month, day int) time.Time {
		return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
	}

	// 1. Get a Village for address
	var village geoModels.Village
	// Try to find a village in Jakarta (DKI)
	db.Joins("JOIN districts ON districts.id = villages.district_id").
		Joins("JOIN cities ON cities.id = districts.city_id").
		Where("cities.name LIKE ?", "%Jakarta%").
		First(&village)

	// Fallback any village if not found
	if village.ID == "" {
		db.First(&village)
	}

	var villageID *string
	if village.ID != "" {
		villageID = &village.ID
	}

	defaultEmail := os.Getenv("SEED_DEFAULT_EMAIL")
	if defaultEmail == "" {
		defaultEmail = "admin@example.com"
	}

	// 2. Define Employees linked to fixed Users and Org Units
	employees := []models.Employee{
		{
			ID:           AdminEmployeeID,
			EmployeeCode: "EMP-001",
			Name:         "Admin User",
			Email:        defaultEmail,
			Phone:        "081234567890",
			UserID:       strPtr(AdminUserID),
			
			// Org Links
			CompanyID:     strPtr(GiLabsCompanyID),
			DivisionID:    strPtr(ITDivisionID),
			JobPositionID: strPtr(ManagerPositionID),
			
			// Personal
			PlaceOfBirth: "Jakarta",
			DateOfBirth:  timePtr(date(1990, 1, 1)),
			Gender:       models.GenderMale,
			Religion:     "Islam",
			Address:      "Jl. Admin No. 1",
			VillageID:    villageID,
			
			// Employment
			ContractStatus:    models.ContractStatusPermanent,
			ContractStartDate: timePtr(date(2023, 1, 1)),
			Status:            models.EmployeeStatusApproved,
			IsApproved:        true,
			IsActive:          true,
		},
		{
			ID:           ManagerEmployeeID,
			EmployeeCode: "EMP-002",
			Name:         "Manager User",
			Email:        "manager@example.com",
			Phone:        "081234567891",
			UserID:       strPtr(ManagerUserID),
			
			// Org Links
			CompanyID:     strPtr(GiLabsCompanyID),
			DivisionID:    strPtr(OpsDivisionID),
			JobPositionID: strPtr(ManagerPositionID),
			
			// Personal
			PlaceOfBirth: "Surabaya",
			DateOfBirth:  timePtr(date(1985, 3, 15)),
			Gender:       models.GenderMale,
			Religion:     "Kristen",
			Address:      "Jl. Manager No. 1",
			VillageID:    villageID,
			
			// Employment
			ContractStatus:    models.ContractStatusPermanent,
			ContractStartDate: timePtr(date(2023, 3, 1)),
			Status:            models.EmployeeStatusApproved,
			IsApproved:        true,
			IsActive:          true,
		},
		{
			ID:           StaffEmployeeID,
			EmployeeCode: "EMP-003",
			Name:         "Staff User",
			Email:        "staff@example.com",
			Phone:        "081234567892",
			UserID:       strPtr(StaffUserID),
			
			CompanyID:     strPtr(GiLabsCompanyID),
			DivisionID:    strPtr(OpsDivisionID),
			JobPositionID: strPtr(StaffPositionID),
			
			PlaceOfBirth: "Bandung",
			DateOfBirth:  timePtr(date(1995, 5, 5)),
			Gender:       models.GenderFemale,
			Religion:     "Islam",
			Address:      "Jl. Staff No. 1",
			VillageID:    villageID,
			
			ContractStatus:    models.ContractStatusPermanent,
			ContractStartDate: timePtr(date(2023, 6, 1)),
			Status:            models.EmployeeStatusApproved,
			IsApproved:        true,
			IsActive:          true,
		},
	}
	
	for _, e := range employees {
		// 1. Check if record with same EmployeeCode exists but different ID
		var existing models.Employee
		err := db.Unscoped().Where("employee_code = ?", e.EmployeeCode).First(&existing).Error
		if err == nil && existing.ID != e.ID {
			log.Printf("Employee code conflict for %s: Existing ID %s, Expected %s. Moving existing...", e.EmployeeCode, existing.ID, e.ID)
			// Instead of deleting (which fails due to FKs), rename the code to clear the unique constraint
			db.Unscoped().Model(&existing).Update("employee_code", e.EmployeeCode+"_old_"+existing.ID[:8])
		}

		// 2. Use OnConflict for ID safety
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			UpdateAll: true,
		}).Create(&e).Error; err != nil {
			log.Printf("Warning: Failed to ensure employee %s: %v", e.Name, err)
			return err
		}
		log.Printf("Ensured employee: %s (code: %s)", e.Name, e.EmployeeCode)
	}

	log.Println("Employees seeded successfully")
	return nil
}
