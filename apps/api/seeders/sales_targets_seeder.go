package seeders

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/database"
	"github.com/gilabs/crm-healthcare/api/internal/sales/data/models"
	"github.com/google/uuid"
)

// SeedSalesTargets seeds yearly targets with monthly breakdown
func SeedSalesTargets() error {
	db := database.DB

	// Get all areas
	var areas []struct {
		ID   string
		Name string
	}
	if err := db.Table("areas").Find(&areas).Error; err != nil {
		return err
	}

	if len(areas) == 0 {
		fmt.Println("No areas found, skipping sales targets seeder")
		return nil
	}

	// For each area, create targets for current and previous year
	now := time.Now()
	yearsToSeed := []int{now.Year() - 1, now.Year()}

	for _, area := range areas {
		for _, year := range yearsToSeed {
			// Generate target: base + variation per area
			baseTarget := 5000000000.0 // 5B base
			areaVariation := float64(rand.Intn(3000000000)) // +0-3B variation
			totalTarget := baseTarget + areaVariation

			code := fmt.Sprintf("YT-%d-%04d", year, rand.Intn(9999))

			status := models.YearlyTargetStatusApproved
			var approvedAt *time.Time
			if year == now.Year() && now.Month() < 6 {
				// Current year before June: still in draft
				status = models.YearlyTargetStatusDraft
			} else {
				approved := time.Date(year, 1, 15, 10, 0, 0, 0, time.UTC)
				approvedAt = &approved
			}

			yearlyTarget := models.YearlyTarget{
				ID:          uuid.NewString(),
				Code:        code,
				AreaID:      &area.ID,
				Year:        year,
				TotalTarget: totalTarget,
				Notes:       fmt.Sprintf("Sales target for %s - year %d", area.Name, year),
				Status:      status,
				ApprovedAt:  approvedAt,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			}

			// Create 12 monthly targets
			monthlyTargets := make([]models.MonthlyTarget, 12)
			baseMonthly := totalTarget / 12

			for month := 1; month <= 12; month++ {
				// Add±10% variation per month
				variance := (rand.Float64() - 0.5) * 0.2
				targetAmount := baseMonthly * (1 + variance)

				// Calculate actual amount with realistic variation
				actualAmount := 0.0
				// For previous year: all months have actuals
				// For current year: only past months have actuals
				if year < now.Year() || month <= int(now.Month()) {
					// Actual is 70% - 120% of target
					actualVariance := 0.7 + (rand.Float64() * 0.5)
					actualAmount = targetAmount * actualVariance
				}

				monthlyTargets[month-1] = models.MonthlyTarget{
					ID:             uuid.NewString(),
					YearlyTargetID: yearlyTarget.ID,
					Month:          month,
					TargetAmount:   targetAmount,
					ActualAmount:   actualAmount,
					CreatedAt:      time.Now(),
					UpdatedAt:      time.Now(),
				}

				// Calculate achievement
				monthlyTargets[month-1].CalculateAchievement()
			}

			yearlyTarget.MonthlyTargets = monthlyTargets

			// Save to database
			if err := db.Create(&yearlyTarget).Error; err != nil {
				return fmt.Errorf("failed to seed yearly target for %s year %d: %w", area.Name, year, err)
			}

			fmt.Printf("✓ Seeded yearly target: %s (Area: %s, Year: %d)\n", code, area.Name, year)
		}
	}

	return nil
}
