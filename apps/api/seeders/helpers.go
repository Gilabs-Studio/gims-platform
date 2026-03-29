package seeders

import (
	"os"
	"strings"

	userModels "github.com/gilabs/gims/api/internal/user/data/models"
	"gorm.io/gorm"
)

// stringPtr creates a pointer to a string
func stringPtr(s string) *string {
	return &s
}

// int64Ptr creates a pointer to an int64
func int64Ptr(i int64) *int64 {
	return &i
}

func isMinimalSeedMode() bool {
	return os.Getenv("SEED_MINIMAL_DATA") == "true"
}

func getAdminID(tx *gorm.DB) string {
	defaultEmail := os.Getenv("SEED_DEFAULT_EMAIL")
	if defaultEmail == "" {
		defaultEmail = "admin@example.com"
	}
	var user userModels.User
	if err := tx.Where("email = ?", defaultEmail).First(&user).Error; err != nil {
		if err := tx.First(&user).Error; err != nil {
			return "00000000-0000-0000-0000-000000000000"
		}
	}
	if user.ID == "" {
		return "00000000-0000-0000-0000-000000000000"
	}
	return user.ID
}

// nilIfEmpty returns nil if the string is empty, otherwise a pointer to the string.
func nilIfEmpty(s string) *string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return &s
}
