package seeders

import (
	"fmt"
	"log"

	"github.com/gilabs/crm-healthcare/api/internal/core/data/models"
	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/database"
	"github.com/google/uuid"
)

// SeedSOSource seeds sample default SO sources
func SeedSOSource() error {
	db := database.DB

	var count int64
	db.Model(&models.SOSource{}).Count(&count)
	if count == 0 {
		log.Println("Seeding SO sources...")
		sources := []models.SOSource{
			{Name: "Email", Description: "Orders received via email", IsActive: true},
			{Name: "WhatsApp", Description: "Orders received via WhatsApp", IsActive: true},
			{Name: "Phone Call", Description: "Orders received via phone call", IsActive: true},
			{Name: "Visit", Description: "Direct sales visit", IsActive: true},
			{Name: "E-Catalog", Description: "Orders from Government E-Catalog", IsActive: true},
			{Name: "Marketplace", Description: "Orders from online marketplaces", IsActive: true},
		}
		for i := range sources {
			id := uuid.New().String()
			slug := "GEN"
			if len(sources[i].Name) >= 3 {
				slug = sources[i].Name[:3]
			}
			sources[i].ID = id
			sources[i].Code = fmt.Sprintf("SOS-%s-%s", slug, id[:4])

			if err := db.Create(&sources[i]).Error; err != nil {
				log.Printf("Warning: Failed to create SO source %s: %v", sources[i].Name, err)
			}
		}
	} else {
		log.Println("SO sources already seeded, skipping...")
	}
	return nil
}
