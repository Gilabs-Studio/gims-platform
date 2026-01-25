package seeders

import (
	"fmt"
	"log"

	"github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/google/uuid"
)

// SeedLeaveType seeds sample leave types
func SeedLeaveType() error {
	db := database.DB

	var count int64
	db.Model(&models.LeaveType{}).Count(&count)
	if count == 0 {
		log.Println("Seeding leave types...")
		types := []models.LeaveType{
			{Name: "Annual Leave", Description: "Regular annual leave allowance", MaxDays: 12, IsPaid: true, IsActive: true},
			{Name: "Sick Leave", Description: "Leave for medical reasons", MaxDays: 14, IsPaid: true, IsActive: true},
			{Name: "Maternity Leave", Description: "Maternity leave for female employees", MaxDays: 90, IsPaid: true, IsActive: true},
			{Name: "Paternity Leave", Description: "Paternity leave for male employees", MaxDays: 3, IsPaid: true, IsActive: true},
			{Name: "Unpaid Leave", Description: "Leave without pay", MaxDays: 0, IsPaid: false, IsActive: true},
			{Name: "Marriage Leave", Description: "Leave for employee's marriage", MaxDays: 3, IsPaid: true, IsActive: true},
		}
		for i := range types {
			id := uuid.New().String()
			slug := "GEN"
			if len(types[i].Name) >= 3 {
				slug = types[i].Name[:3]
			}
			types[i].ID = id
			types[i].Code = fmt.Sprintf("LT-%s-%s", slug, id[:4])

			if err := db.Create(&types[i]).Error; err != nil {
				log.Printf("Warning: Failed to create leave type %s: %v", types[i].Name, err)
			}
		}
	} else {
		log.Println("Leave types already seeded, skipping...")
	}
	return nil
}
