package seeders

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// SeedOpeningBalances creates opening balance journal entries for inventory.
// This ensures GL (General Ledger) balances match subledger (inventory_batches) totals.
// Must run AFTER SeedInventory() and AFTER SeedChartOfAccounts() + SeedFinanceSettings().
func SeedOpeningBalances() error {
	log.Println("Seeding opening balances (inventory GL reconciliation)...")
	db := database.DB
	ctx := context.Background()

	// ============================================================================
	// Step 1: Calculate total inventory value from subledger
	// ============================================================================
	var totalInventoryValue float64
	if err := db.
		Table("inventory_batches").
		Where("is_active = true AND deleted_at IS NULL").
		Select("COALESCE(SUM(current_quantity * cost_price), 0) as total").
		Scan(&totalInventoryValue).Error; err != nil {
		return fmt.Errorf("failed to calculate inventory total: %w", err)
	}

	if totalInventoryValue == 0 {
		log.Println("  ⚠ No inventory batches found, skipping opening balance")
		return nil
	}

	log.Printf("  Inventory subledger total: %.2f", totalInventoryValue)

	// ============================================================================
	// Step 2: Resolve COA IDs
	// ============================================================================
	coaRepo := repositories.NewChartOfAccountRepository(db)

	// Inventory Asset COA
	inventoryAssetCOA, err := coaRepo.FindByCode(ctx, "1400")
	if err != nil || inventoryAssetCOA == nil {
		return fmt.Errorf("failed to find inventory asset COA (1400): %w", err)
	}

	// Retained Earnings COA
	retainedEarningsCOA, err := coaRepo.FindByCode(ctx, "3200")
	if err != nil || retainedEarningsCOA == nil {
		return fmt.Errorf("failed to find retained earnings COA (3200): %w", err)
	}

	// ============================================================================
	// Step 3: Check if opening balance journal already exists
	// ============================================================================
	journalRepo := repositories.NewJournalEntryRepository(db)
	existingJournal, err := journalRepo.FindByReferenceID(ctx, "OPENING_BALANCE", "inventory")
	if err != nil && err != gorm.ErrRecordNotFound {
		return fmt.Errorf("failed to check existing opening balance: %w", err)
	}
	if existingJournal != nil {
		log.Println("  ℹ Opening balance journal already exists, skipping")
		return nil
	}

	// ============================================================================
	// Step 4: Create opening balance journal entry
	// ============================================================================
	journalID := uuid.New().String()
	now := time.Now()

	// Prepare pointers to reference type and ID (can't take address of constants)
	refType := "OPENING_BALANCE"
	refID := "inventory"
	createdByUser := AdminEmployeeID

	// Create journal entry
	journal := models.JournalEntry{
		ID:            journalID,
		Description:   "Opening Balance: Inventory on Hand",
		EntryDate:     now,
		PostedAt:      &now,
		PostedBy:      &createdByUser,
		Status:        models.JournalStatusPosted,
		ReferenceType: &refType,
		ReferenceID:   &refID,
		CreatedBy:     &createdByUser,
		Lines: []models.JournalLine{
			{
				ID:               uuid.New().String(),
				JournalEntryID:   journalID,
				ChartOfAccountID: inventoryAssetCOA.ID,
				Debit:            totalInventoryValue,
				Credit:           0,
				Memo:             "Opening inventory balance from batches",
			},
			{
				ID:               uuid.New().String(),
				JournalEntryID:   journalID,
				ChartOfAccountID: retainedEarningsCOA.ID,
				Debit:            0,
				Credit:           totalInventoryValue,
				Memo:             "Opening inventory credit (Retained Earnings)",
			},
		},
	}

	// Upsert the journal entry
	if err := db.
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "reference_type"}, {Name: "reference_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"description", "entry_date", "posted_at", "status"}),
		}).
		Create(&journal).Error; err != nil {
		return fmt.Errorf("failed to create opening balance journal: %w", err)
	}

	log.Printf("  ✓ Opening balance journal created (%.2f)", totalInventoryValue)
	return nil
}
