package seeders

import (
	"fmt"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	"github.com/google/uuid"
)

// SeedEmployeeAssets seeds employee asset data
func SeedEmployeeAssets() error {
	db := database.DB

	fmt.Println("🌱 Seeding Employee Assets...")

	// Check if data already exists
	var count int64
	if err := db.Model(&orgModels.EmployeeAsset{}).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to count employee assets: %w", err)
	}

	if count > 0 {
		fmt.Printf("⏭️  Skipping Employee Assets (already seeded: %d records)\n", count)
		return nil
	}

	// Get first 5 employees for asset assignment
	var employees []struct {
		ID string
	}
	if err := db.Table("employees").Select("id").Limit(5).Find(&employees).Error; err != nil {
		return fmt.Errorf("failed to fetch employees: %w", err)
	}

	if len(employees) == 0 {
		fmt.Println("⚠️  No employees found, skipping employee assets seeding")
		return nil
	}

	// Asset data: name, code, category, condition, days ago borrowed, returned (nil if not returned)
	type AssetSeed struct {
		Name            string
		Code            string
		Category        string
		BorrowCondition orgModels.AssetCondition
		ReturnCondition *orgModels.AssetCondition
		DaysAgoBorrowed int
		DaysAgoReturned *int
		Notes           string
	}

	goodCondition := orgModels.AssetConditionGood
	fairCondition := orgModels.AssetConditionFair
	newCondition := orgModels.AssetConditionNew

	days30 := 30
	days90 := 90
	days120 := 120
	days180 := 180

	assetSeeds := []AssetSeed{
		// Currently borrowed assets
		{
			Name:            "MacBook Pro 16\" M3 Max",
			Code:            "LAP-001",
			Category:        "Laptop",
			BorrowCondition: orgModels.AssetConditionNew,
			ReturnCondition: nil,
			DaysAgoBorrowed: 45,
			DaysAgoReturned: nil,
			Notes:           "For development work. Includes charger and USB-C hub.",
		},
		{
			Name:            "iPhone 15 Pro 256GB",
			Code:            "PHN-042",
			Category:        "Mobile Phone",
			BorrowCondition: orgModels.AssetConditionNew,
			ReturnCondition: nil,
			DaysAgoBorrowed: 30,
			DaysAgoReturned: nil,
			Notes:           "For mobile testing and communication.",
		},
		{
			Name:            "Dell Monitor 27\" 4K",
			Code:            "MON-015",
			Category:        "Monitor",
			BorrowCondition: orgModels.AssetConditionGood,
			ReturnCondition: nil,
			DaysAgoBorrowed: 60,
			DaysAgoReturned: nil,
			Notes:           "External display for workstation setup.",
		},
		{
			Name:            "Standing Desk",
			Code:            "FUR-023",
			Category:        "Furniture",
			BorrowCondition: orgModels.AssetConditionNew,
			ReturnCondition: nil,
			DaysAgoBorrowed: 90,
			DaysAgoReturned: nil,
			Notes:           "Ergonomic standing desk with electric height adjustment.",
		},
		// Returned assets
		{
			Name:            "MacBook Air M2",
			Code:            "LAP-008",
			Category:        "Laptop",
			BorrowCondition: orgModels.AssetConditionNew,
			ReturnCondition: &goodCondition,
			DaysAgoBorrowed: 180,
			DaysAgoReturned: &days30,
			Notes:           "Previous laptop. Returned when upgraded to MacBook Pro.",
		},
		{
			Name:            "iPhone 13 128GB",
			Code:            "PHN-025",
			Category:        "Mobile Phone",
			BorrowCondition: orgModels.AssetConditionGood,
			ReturnCondition: &fairCondition,
			DaysAgoBorrowed: 365,
			DaysAgoReturned: &days90,
			Notes:           "Old phone. Screen has minor scratches.",
		},
		{
			Name:            "Logitech MX Master 3",
			Code:            "ACC-056",
			Category:        "Accessories",
			BorrowCondition: orgModels.AssetConditionNew,
			ReturnCondition: &goodCondition,
			DaysAgoBorrowed: 200,
			DaysAgoReturned: &days120,
			Notes:           "Wireless mouse. All buttons working perfectly.",
		},
		{
			Name:            "Sony WH-1000XM5 Headphones",
			Code:            "ACC-071",
			Category:        "Accessories",
			BorrowCondition: orgModels.AssetConditionNew,
			ReturnCondition: &newCondition,
			DaysAgoBorrowed: 150,
			DaysAgoReturned: &days180,
			Notes:           "Noise-cancelling headphones. Case and cables included.",
		},
		{
			Name:            "HP LaserJet Printer",
			Code:            "PRT-005",
			Category:        "Office Equipment",
			BorrowCondition: orgModels.AssetConditionGood,
			ReturnCondition: &fairCondition,
			DaysAgoBorrowed: 100,
			DaysAgoReturned: &days30,
			Notes:           "For home office use. Toner replaced before return.",
		},
	}

	// Create employee assets
	assets := make([]orgModels.EmployeeAsset, 0, len(assetSeeds))
	for i, seed := range assetSeeds {
		// Cycle through employees
		employeeID := employees[i%len(employees)].ID

		borrowDate := time.Now().AddDate(0, 0, -seed.DaysAgoBorrowed)

		var returnDate *time.Time
		if seed.DaysAgoReturned != nil {
			rd := time.Now().AddDate(0, 0, -*seed.DaysAgoReturned)
			returnDate = &rd
		}

		asset := orgModels.EmployeeAsset{
			ID:              uuid.New().String(),
			EmployeeID:      employeeID,
			AssetName:       seed.Name,
			AssetCode:       seed.Code,
			AssetCategory:   seed.Category,
			BorrowDate:      borrowDate,
			ReturnDate:      returnDate,
			BorrowCondition: seed.BorrowCondition,
			ReturnCondition: seed.ReturnCondition,
			Notes:           &seed.Notes,
			CreatedAt:       borrowDate,
			UpdatedAt:       borrowDate,
		}

		assets = append(assets, asset)
	}

	// Bulk insert
	if err := db.Create(&assets).Error; err != nil {
		return fmt.Errorf("failed to seed employee assets: %w", err)
	}

	fmt.Printf("✅ Seeded %d employee assets\n", len(assets))
	fmt.Println("   - 4 currently borrowed assets (for dashboard alerts)")
	fmt.Println("   - 5 returned assets (for history)")
	return nil
}
