package seeders

import (
	"fmt"
	"log"

	"github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/google/uuid"
)

// SeedCourierAgency seeds sample courier agencies
func SeedCourierAgency() error {
	db := database.DB

	var count int64
	db.Model(&models.CourierAgency{}).Count(&count)
	if count == 0 {
		log.Println("Seeding courier agencies...")
		couriers := []models.CourierAgency{
			{Name: "JNE", Description: "Jalur Nugraha Ekakurir", Phone: "021-29278888", TrackingURL: "https://www.jne.co.id/tracking", IsActive: true},
			{Name: "J&T Express", Description: "J&T Express Indonesia", Phone: "021-80661888", TrackingURL: "https://jet.co.id/track", IsActive: true},
			{Name: "SiCepat", Description: "SiCepat Ekspres", Phone: "021-50200050", TrackingURL: "https://www.sicepat.com/checkAwb", IsActive: true},
			{Name: "Pos Indonesia", Description: "Pos Indonesia", Phone: "161", TrackingURL: "https://www.posindonesia.co.id/id/tracking", IsActive: true},
			{Name: "GoSend", Description: "Gojek Instant Delivery", Phone: "021-50849000", TrackingURL: "", IsActive: true},
		}
		for i := range couriers {
			id := uuid.New().String()
			slug := "GEN"
			if len(couriers[i].Name) >= 3 {
				slug = couriers[i].Name[:3]
			}
			couriers[i].ID = id
			couriers[i].Code = fmt.Sprintf("CA-%s-%s", slug, id[:4])

			if err := db.Create(&couriers[i]).Error; err != nil {
				log.Printf("Warning: Failed to create courier agency %s: %v", couriers[i].Name, err)
			}
		}
	} else {
		log.Println("Courier agencies already seeded, skipping...")
	}
	return nil
}
