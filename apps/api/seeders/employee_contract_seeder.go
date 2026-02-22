package seeders

import (
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/organization/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm/clause"
)

// Employee Contract IDs (fixed UUIDs for consistency)
const (
	AdminContractID      = "c1111111-1111-1111-1111-111111111111"
	ManagerContractID    = "c2222222-2222-2222-2222-222222222222"
	StaffContractID      = "c3333333-3333-3333-3333-333333333333"
	ProbationContractID  = "c4444444-4444-4444-4444-444444444444"
	InternshipContractID = "c5555555-5555-5555-5555-555555555555"
)

// SeedEmployeeContracts seeds initial employee contract data
func SeedEmployeeContracts() error {
	db := database.DB

	log.Println("Seeding employee contracts...")

	// Helper for nullable time
	timePtr := func(t time.Time) *time.Time {
		return &t
	}

	// Parse employee IDs
	adminEmpID, _ := uuid.Parse(AdminEmployeeID)
	managerEmpID, _ := uuid.Parse(ManagerEmployeeID)
	staffEmpID, _ := uuid.Parse(StaffEmployeeID)
	adminUserID, _ := uuid.Parse(AdminUserID)

	// Define employee contracts (simplified structure)
	contracts := []models.EmployeeContract{
		{
			ID:             uuid.MustParse(AdminContractID),
			EmployeeID:     adminEmpID,
			ContractNumber: "CONTRACT-2023-001",
			ContractType:   models.ContractTypePKWTT,
			StartDate:      time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:        nil, // PKWTT contracts have no end date
			DocumentPath:   "/documents/contracts/admin_contract_2023.pdf",
			Status:         models.ContractStatusActive,
			CreatedBy:      adminUserID,
			UpdatedBy:      nil,
		},
		{
			ID:             uuid.MustParse(ManagerContractID),
			EmployeeID:     managerEmpID,
			ContractNumber: "CONTRACT-2023-002",
			ContractType:   models.ContractTypePKWTT,
			StartDate:      time.Date(2023, 2, 1, 0, 0, 0, 0, time.UTC),
			EndDate:        nil, // PKWTT contracts have no end date
			DocumentPath:   "/documents/contracts/manager_contract_2023.pdf",
			Status:         models.ContractStatusActive,
			CreatedBy:      adminUserID,
			UpdatedBy:      nil,
		},
		{
			ID:             uuid.MustParse(StaffContractID),
			EmployeeID:     staffEmpID,
			ContractNumber: "CONTRACT-2024-003",
			ContractType:   models.ContractTypePKWT,
			StartDate:      time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:        timePtr(time.Date(2025, 12, 31, 0, 0, 0, 0, time.UTC)), // 2-year contract
			DocumentPath:   "/documents/contracts/staff_contract_2024.pdf",
			Status:         models.ContractStatusExpired, // Expired
			CreatedBy:      adminUserID,
			UpdatedBy:      nil,
		},
		{
			ID:             uuid.MustParse(ProbationContractID),
			EmployeeID:     staffEmpID,
			ContractNumber: "CONTRACT-2025-004",
			ContractType:   models.ContractTypePKWT,
			StartDate:      time.Date(2025, 10, 1, 0, 0, 0, 0, time.UTC),
			EndDate:        timePtr(time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)), // 6-month contract expiring soon
			DocumentPath:   "/documents/contracts/staff_contract_2025.pdf",
			Status:         models.ContractStatusActive,
			CreatedBy:      adminUserID,
			UpdatedBy:      nil,
		},
		{
			ID:             uuid.MustParse(InternshipContractID),
			EmployeeID:     managerEmpID,
			ContractNumber: "CONTRACT-2024-005",
			ContractType:   models.ContractTypeIntern,
			StartDate:      time.Date(2024, 7, 1, 0, 0, 0, 0, time.UTC),
			EndDate:        timePtr(time.Date(2024, 12, 31, 0, 0, 0, 0, time.UTC)),
			DocumentPath:   "/documents/contracts/intern_2024.pdf",
			Status:         models.ContractStatusExpired, // This contract has already expired
			CreatedBy:      adminUserID,
			UpdatedBy:      nil,
		},
	}

	// Upsert contracts
	// Clean up old contracts with random UUIDs that may conflict on contract_number
	db.Exec("DELETE FROM employee_contracts WHERE contract_number IN (?, ?) AND id NOT IN (?, ?)",
		"CONTRACT-2025-004", "CONTRACT-2024-005", ProbationContractID, InternshipContractID)

	for _, contract := range contracts {
		result := db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "contract_number"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"employee_id", "contract_number", "contract_type", "start_date", "end_date",
				"document_path", "status", "updated_at",
			}),
		}).Create(&contract)

		if result.Error != nil {
			log.Printf("Error seeding employee contract %s: %v", contract.ContractNumber, result.Error)
			return result.Error
		}
	}

	log.Println("Employee contracts seeded successfully")
	log.Printf("- Total contracts seeded: %d", len(contracts))
	log.Printf("- Active contracts: 3")
	log.Printf("- Expired contracts: 2")
	log.Printf("- Expiring soon (< 30 days): 1 (CONTRACT-2025-004)")

	return nil
}
