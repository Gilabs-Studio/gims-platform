package seeders

import (
	"fmt"
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm/clause"
)

const financeFoundationFiscalYearID = "f1000001-0000-0000-0000-000000000001"

func SeedFinanceFoundationFiscalYear() error {
	log.Println("Seeding finance foundation fiscal year...")
	db := database.DB

	companyID, err := findPTGiLabsCompanyID(db)
	if err != nil {
		return err
	}

	adminID := AdminEmployeeID
	item := financeModels.FiscalYear{
		ID:        financeFoundationFiscalYearID,
		CompanyID: companyID,
		Name:      "FY 2026",
		StartDate: time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, time.December, 31, 0, 0, 0, 0, time.UTC),
		Status:    financeModels.FiscalYearStatusActive,
		CreatedBy: &adminID,
	}

	if err := db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"company_id", "name", "start_date", "end_date", "status", "created_by", "updated_at",
		}),
	}).Create(&item).Error; err != nil {
		return fmt.Errorf("failed to seed fiscal year: %w", err)
	}

	return nil
}
