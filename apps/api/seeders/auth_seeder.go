package seeders

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"log"
	"os"

	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/database"
	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/config"
	role "github.com/gilabs/crm-healthcare/api/internal/role/data/models"
	user "github.com/gilabs/crm-healthcare/api/internal/user/data/models"
	"golang.org/x/crypto/bcrypt"
)

func getSeedPassword() (string, error) {
	if pw := os.Getenv("SEED_DEFAULT_PASSWORD"); pw != "" {
		return pw, nil
	}

	// Production must never silently create accounts with unknown/weak password.
	if config.AppConfig != nil && config.AppConfig.Server.Env == "production" {
		return "", fmt.Errorf("SEED_DEFAULT_PASSWORD must be set when RUN_SEEDERS=true in production")
	}

	// Dev-only: generate a strong random password and print it once.
	bytes := make([]byte, 24)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(bytes), nil
}

// SeedUsers seeds initial users
func SeedUsers() error {
	// Check if users already exist
	var count int64
	database.DB.Model(&user.User{}).Count(&count)
	if count > 0 {
		log.Println("Users already seeded, skipping...")
		return nil
	}

	// Get roles
	var adminRole, doctorRole, pharmacistRole, viewerRole role.Role
	if err := database.DB.Where("code = ?", "admin").First(&adminRole).Error; err != nil {
		return err
	}
	if err := database.DB.Where("code = ?", "doctor").First(&doctorRole).Error; err != nil {
		return err
	}
	if err := database.DB.Where("code = ?", "pharmacist").First(&pharmacistRole).Error; err != nil {
		return err
	}
	if err := database.DB.Where("code = ?", "viewer").First(&viewerRole).Error; err != nil {
		return err
	}

	seedPassword, err := getSeedPassword()
	if err != nil {
		return err
	}
	if os.Getenv("SEED_DEFAULT_PASSWORD") == "" {
		log.Printf("Dev seed password generated: %s", seedPassword)
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(seedPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	users := []user.User{
		{
			Email:     "admin@example.com",
			Password:  string(hashedPassword),
			Name:      "Admin User",
			AvatarURL: "https://api.dicebear.com/7.x/lorelei/svg?seed=admin@example.com",
			RoleID:    adminRole.ID,
			Status:    "active",
		},
		{
			Email:     "doctor@example.com",
			Password:  string(hashedPassword),
			Name:      "Doctor User",
			AvatarURL: "https://api.dicebear.com/7.x/lorelei/svg?seed=doctor@example.com",
			RoleID:    doctorRole.ID,
			Status:    "active",
		},
		{
			Email:     "pharmacist@example.com",
			Password:  string(hashedPassword),
			Name:      "Pharmacist User",
			AvatarURL: "https://api.dicebear.com/7.x/lorelei/svg?seed=pharmacist@example.com",
			RoleID:    pharmacistRole.ID,
			Status:    "active",
		},
		{
			Email:     "viewer@example.com",
			Password:  string(hashedPassword),
			Name:      "Viewer User",
			AvatarURL: "https://api.dicebear.com/7.x/lorelei/svg?seed=viewer@example.com",
			RoleID:    viewerRole.ID,
			Status:    "active",
		},
	}

	for _, u := range users {
		if err := database.DB.Create(&u).Error; err != nil {
			return err
		}
		log.Printf("Created user: %s (role_id: %s)", u.Email, u.RoleID)
	}

	log.Println("Users seeded successfully")
	return nil
}
