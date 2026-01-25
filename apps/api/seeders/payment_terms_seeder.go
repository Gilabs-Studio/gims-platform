package seeders

import (
	"fmt"
	"log"

	"github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/google/uuid"
)

// SeedPaymentTerms seeds sample payment terms
func SeedPaymentTerms() error {
	db := database.DB

	var count int64
	db.Model(&models.PaymentTerms{}).Count(&count)
	if count == 0 {
		log.Println("Seeding payment terms...")
		terms := []models.PaymentTerms{
			{Name: "Net 30 Days", Description: "Payment due in 30 days", Days: 30, IsActive: true},
			{Name: "Net 14 Days", Description: "Payment due in 14 days", Days: 14, IsActive: true},
			{Name: "Net 7 Days", Description: "Payment due in 7 days", Days: 7, IsActive: true},
			{Name: "Cash on Delivery", Description: "Payment on delivery", Days: 0, IsActive: true},
			{Name: "Net 60 Days", Description: "Payment due in 60 days", Days: 60, IsActive: true},
		}
		for i := range terms {
			id := uuid.New().String()
			slug := "GEN"
			if len(terms[i].Name) >= 3 {
				slug = terms[i].Name[:3]
			}
			terms[i].ID = id
			terms[i].Code = fmt.Sprintf("PT-%s-%s", slug, id[:4])

			if err := db.Create(&terms[i]).Error; err != nil {
				log.Printf("Warning: Failed to create payment term %s: %v", terms[i].Name, err)
			}
		}
	} else {
		log.Println("Payment terms already seeded, skipping...")
	}
	return nil
}
