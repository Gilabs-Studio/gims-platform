package seeders

import (
	"encoding/json"
	"log"

	"gorm.io/gorm/clause"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	loyaltyModels "github.com/gilabs/gims/api/internal/loyalty/data/models"
	"github.com/gilabs/gims/api/internal/loyalty/domain/dto"
)

// Fixed UUID for the default global loyalty programs (hex-only characters).
const (
	DefaultGlobalLoyaltyProgramID = "10a10000-0000-0000-0000-000000000001" // Global (no outlet)
	MieGacoanLoyaltyProgramID     = "10a10000-0000-0000-0000-000000000002" // Mie Gacoan specific
)

// SeedLoyalty creates the default loyalty programs with Bronze/Silver/Gold/Platinum tiers.
func SeedLoyalty() error {
	log.Println("Seeding loyalty programs...")

	adminID := AdminEmployeeID
	standardConfig := dto.LoyaltyConfigJSON{
		PointRules: dto.PointRules{
			AmountPerPoint:       10000,
			PointsPerAmount:      1,
			MinTransactionAmount: 0,
		},
		Tiers: []dto.TierConfig{
			{Name: "Bronze", MinPoints: 0, Multiplier: 1.0, BadgeColor: "#CD7F32"},
			{Name: "Silver", MinPoints: 500, Multiplier: 1.5, BadgeColor: "#C0C0C0"},
			{Name: "Gold", MinPoints: 2000, Multiplier: 2.0, BadgeColor: "#D4AF37"},
			{Name: "Platinum", MinPoints: 5000, Multiplier: 3.0, BadgeColor: "#E5E4E2"},
		},
		Rewards: []dto.RewardConfig{
			{ID: "reward-discount-5k", Name: "Diskon Rp 5.000", Type: "discount_fixed", Value: 5000, PointsRequired: 50, IsActive: true},
			{ID: "reward-discount-10k", Name: "Diskon Rp 10.000", Type: "discount_fixed", Value: 10000, PointsRequired: 100, IsActive: true},
			{ID: "reward-discount-25k", Name: "Diskon Rp 25.000", Type: "discount_fixed", Value: 25000, PointsRequired: 250, IsActive: true},
			{ID: "reward-free-item", Name: "Menu Gratis", Type: "discount_fixed", Value: 0, PointsRequired: 500, IsActive: true},
		},
		PointExpiryDays: 365,
	}

	configBytes, err := json.Marshal(standardConfig)
	if err != nil {
		return err
	}

	desc1 := "Program loyalitas global untuk seluruh outlet. Kumpulkan poin setiap transaksi."
	desc2 := "Program loyalitas khusus Mie Gacoan dengan reward menu spesial."

	outlet1 := MieGacoanOutlet1ID

	programs := []loyaltyModels.LoyaltyProgram{
		{
			ID:          DefaultGlobalLoyaltyProgramID,
			OutletID:    nil,
			Name:        "GIMS Loyalty Program",
			Description: &desc1,
			ConfigJSON:  configBytes,
			IsActive:    true,
			CreatedBy:   &adminID,
		},
		{
			ID:          MieGacoanLoyaltyProgramID,
			OutletID:    &outlet1,
			Name:        "Mie Gacoan Rewards",
			Description: &desc2,
			ConfigJSON:  configBytes,
			IsActive:    true,
			CreatedBy:   &adminID,
		},
	}

	for _, program := range programs {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "config_json", "is_active", "updated_at"}),
		}).Create(&program).Error; err != nil {
			log.Printf("Warning: Failed to seed loyalty program %s: %v", program.ID, err)
		}
	}

	log.Println("Loyalty programs seeded successfully")
	return nil
}

// SeedLoyaltyMembers seeds demo members so POS lookup and redemption have visible sample data.
func SeedLoyaltyMembers() error {
	log.Println("Seeding loyalty members...")

	adminID := AdminEmployeeID
	now := apptime.Now()
	outlet1ID := KimiaFarmaOutlet1ID
	outlet2ID := KimiaFarmaOutlet2ID

	members := []loyaltyModels.LoyaltyMember{
		{
			ID:                LoyaltyMember1ID,
			CustomerID:        Customer1ID,
			ProgramID:         DefaultGlobalLoyaltyProgramID,
			MemberCode:        "MBR-00001",
			EnrolledOutletID:  &outlet1ID,
			CurrentTier:       "Bronze",
			TierBadgeColor:    "#CD7F32",
			LifetimePoints:    320,
			PointBalance:      320,
			JoinedAt:          now,
			LastTransactionAt: &now,
			TotalTransactions: 4,
			CreatedBy:         &adminID,
			UpdatedBy:         &adminID,
		},
		{
			ID:                LoyaltyMember2ID,
			CustomerID:        Customer5ID,
			ProgramID:         DefaultGlobalLoyaltyProgramID,
			MemberCode:        "MBR-00002",
			EnrolledOutletID:  &outlet2ID,
			CurrentTier:       "Gold",
			TierBadgeColor:    "#D4AF37",
			LifetimePoints:    2450,
			PointBalance:      760,
			JoinedAt:          now,
			LastTransactionAt: &now,
			TotalTransactions: 12,
			CreatedBy:         &adminID,
			UpdatedBy:         &adminID,
		},
	}

	for _, member := range members {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"customer_id", "program_id", "member_code", "enrolled_outlet_id", "current_tier", "tier_badge_color", "lifetime_points", "point_balance", "joined_at", "last_transaction_at", "total_transactions", "created_by", "updated_by", "updated_at"}),
		}).Create(&member).Error; err != nil {
			log.Printf("Warning: Failed to seed loyalty member %s: %v", member.MemberCode, err)
		}
	}

	log.Println("Loyalty members seeded successfully")
	return nil
}
