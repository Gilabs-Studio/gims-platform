package seeders

import (
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm/clause"
)

const (
	AdminSalary1ID = "5a000001-0000-0000-0000-000000000001"
	AdminSalary2ID = "5a000001-0000-0000-0000-000000000002"
	AdminSalary3ID = "5a000001-0000-0000-0000-000000000003"

	ManagerSalary1ID = "5a000002-0000-0000-0000-000000000001"
	ManagerSalary2ID = "5a000002-0000-0000-0000-000000000002"

	StaffSalary1ID = "5a000003-0000-0000-0000-000000000001"

	SalesRep1Salary1ID = "5a000004-0000-0000-0000-000000000001"
	SalesRep1Salary2ID = "5a000004-0000-0000-0000-000000000002"

	SalesRep2Salary1ID = "5a000005-0000-0000-0000-000000000001"

	FinanceStaffSalary1ID = "5a000006-0000-0000-0000-000000000001"
	FinanceStaffSalary2ID = "5a000006-0000-0000-0000-000000000002"

	HRStaffSalary1ID = "5a000007-0000-0000-0000-000000000001"
)

func SeedSalaryStructures() error {
	log.Println("Seeding salary structures...")

	adminID := AdminEmployeeID
	managerID := ManagerEmployeeID

	type salaryRecord struct {
		id            string
		employeeID    string
		basicSalary   float64
		effectiveDate time.Time
		status        financeModels.SalaryStructureStatus
		notes         string
		createdBy     *string
	}

	records := []salaryRecord{
		{
			id:            AdminSalary1ID,
			employeeID:    AdminEmployeeID,
			basicSalary:   8000000,
			effectiveDate: time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
			status:        financeModels.SalaryStructureStatusInactive,
			notes:         "Initial salary",
			createdBy:     &adminID,
		},
		{
			id:            AdminSalary2ID,
			employeeID:    AdminEmployeeID,
			basicSalary:   10000000,
			effectiveDate: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
			status:        financeModels.SalaryStructureStatusInactive,
			notes:         "Annual increment",
			createdBy:     &adminID,
		},
		{
			id:            AdminSalary3ID,
			employeeID:    AdminEmployeeID,
			basicSalary:   12500000,
			effectiveDate: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
			status:        financeModels.SalaryStructureStatusActive,
			notes:         "Promotion adjustment",
			createdBy:     &adminID,
		},
		{
			id:            ManagerSalary1ID,
			employeeID:    ManagerEmployeeID,
			basicSalary:   12000000,
			effectiveDate: time.Date(2023, 6, 1, 0, 0, 0, 0, time.UTC),
			status:        financeModels.SalaryStructureStatusInactive,
			notes:         "Starting salary",
			createdBy:     &managerID,
		},
		{
			id:            ManagerSalary2ID,
			employeeID:    ManagerEmployeeID,
			basicSalary:   15000000,
			effectiveDate: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
			status:        financeModels.SalaryStructureStatusActive,
			notes:         "Performance review increase",
			createdBy:     &managerID,
		},
		{
			id:            StaffSalary1ID,
			employeeID:    StaffEmployeeID,
			basicSalary:   6500000,
			effectiveDate: time.Date(2025, 3, 1, 0, 0, 0, 0, time.UTC),
			status:        financeModels.SalaryStructureStatusDraft,
			notes:         "Awaiting HR approval",
			createdBy:     &adminID,
		},
		{
			id:            SalesRep1Salary1ID,
			employeeID:    SalesRep1EmployeeID,
			basicSalary:   7000000,
			effectiveDate: time.Date(2023, 3, 1, 0, 0, 0, 0, time.UTC),
			status:        financeModels.SalaryStructureStatusInactive,
			notes:         "Onboarding salary",
			createdBy:     &adminID,
		},
		{
			id:            SalesRep1Salary2ID,
			employeeID:    SalesRep1EmployeeID,
			basicSalary:   8500000,
			effectiveDate: time.Date(2024, 3, 1, 0, 0, 0, 0, time.UTC),
			status:        financeModels.SalaryStructureStatusActive,
			notes:         "After probation ended",
			createdBy:     &adminID,
		},
		{
			id:            SalesRep2Salary1ID,
			employeeID:    SalesRep2EmployeeID,
			basicSalary:   7500000,
			effectiveDate: time.Date(2024, 7, 1, 0, 0, 0, 0, time.UTC),
			status:        financeModels.SalaryStructureStatusActive,
			notes:         "",
			createdBy:     &adminID,
		},
		{
			id:            FinanceStaffSalary1ID,
			employeeID:    FinanceStaffEmployeeID,
			basicSalary:   9000000,
			effectiveDate: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
			status:        financeModels.SalaryStructureStatusActive,
			notes:         "Confirmed after review",
			createdBy:     &adminID,
		},
		{
			id:            FinanceStaffSalary2ID,
			employeeID:    FinanceStaffEmployeeID,
			basicSalary:   11000000,
			effectiveDate: time.Date(2025, 4, 1, 0, 0, 0, 0, time.UTC),
			status:        financeModels.SalaryStructureStatusDraft,
			notes:         "Proposed raise pending approval",
			createdBy:     &adminID,
		},
		{
			id:            HRStaffSalary1ID,
			employeeID:    HRStaffEmployeeID,
			basicSalary:   7200000,
			effectiveDate: time.Date(2025, 2, 1, 0, 0, 0, 0, time.UTC),
			status:        financeModels.SalaryStructureStatusDraft,
			notes:         "Initial proposal",
			createdBy:     &adminID,
		},
	}

	for _, record := range records {
		item := financeModels.SalaryStructure{
			ID:            record.id,
			EmployeeID:    record.employeeID,
			EffectiveDate: record.effectiveDate,
			BasicSalary:   record.basicSalary,
			Notes:         record.notes,
			Status:        record.status,
			CreatedBy:     record.createdBy,
		}

		if err := database.DB.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"employee_id",
				"effective_date",
				"basic_salary",
				"notes",
				"status",
				"updated_at",
			}),
		}).Create(&item).Error; err != nil {
			log.Printf("Warning: Failed to seed salary structure %s: %v", record.id, err)
		}
	}

	log.Println("Salary structures seeded successfully")
	return nil
}
