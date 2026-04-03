package seeders

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
	"github.com/gilabs/gims/api/internal/sales/data/repositories"
)

// SeedSalesVisit seeds sample sales visit data
func SeedSalesVisit() error {
	db := database.DB

	var count int64
	db.Model(&salesModels.SalesVisit{}).Count(&count)
	if count > 0 {
		log.Println("Sales visits already seeded, skipping...")
		return nil
	}

	log.Println("Seeding sales visits...")

	// Get required reference data
	var employees []orgModels.Employee
	if err := db.Where("is_active = ?", true).Find(&employees).Error; err != nil {
		log.Printf("Warning: Failed to fetch employees: %v", err)
		return err
	}
	if len(employees) == 0 {
		log.Println("Warning: No active employees found. Please seed employees first.")
		return nil
	}

	var companies []orgModels.Company
	if err := db.Find(&companies).Error; err != nil {
		log.Printf("Warning: Failed to fetch companies: %v", err)
		return err
	}
	if len(companies) == 0 {
		log.Println("Warning: No companies found. Please seed companies first.")
		return nil
	}

	var products []productModels.Product
	if err := db.Where("is_approved = ?", true).Limit(20).Find(&products).Error; err != nil {
		log.Printf("Warning: Failed to fetch products: %v", err)
		return err
	}

	// Initialize repository for code generation
	visitRepo := repositories.NewSalesVisitRepository(db)

	now := time.Now()
	date := func(daysOffset int) time.Time {
		return now.AddDate(0, 0, daysOffset)
	}

	// Create sample visits
	visitsData := []struct {
		status     salesModels.SalesVisitStatus
		daysOffset int
		purpose    string
		result     string
		notes      string
	}{
		{
			status:     salesModels.SalesVisitStatusCompleted,
			daysOffset: -5,
			purpose:    "Routine check-up and product intro",
			result:     "Customer interested in new antibiotics",
			notes:      "Met with Dr. Budi",
		},
		{
			status:     salesModels.SalesVisitStatusCompleted,
			daysOffset: -2,
			purpose:    "Follow up on quotation",
			result:     "Quotation accepted, waiting for PO",
			notes:      "Promised delivery next week",
		},
		{
			status:     salesModels.SalesVisitStatusInProgress,
			daysOffset: 0,
			purpose:    "Discussing bulk order",
			notes:      "Check-in at 09:00 AM",
		},
		{
			status:     salesModels.SalesVisitStatusPlanned,
			daysOffset: 1,
			purpose:    "New product launch presentation",
			notes:      "Bring product samples",
		},
		{
			status:     salesModels.SalesVisitStatusPlanned,
			daysOffset: 3,
			purpose:    "Contract renewal discussion",
			notes:      "Prepare contract draft",
		},
		{
			status:     salesModels.SalesVisitStatusCancelled,
			daysOffset: -1,
			purpose:    "Emergency restock",
			notes:      "Cancelled: Store closed",
		},
		{
			status:     salesModels.SalesVisitStatusCompleted,
			daysOffset: -10,
			purpose:    "Introductory meeting",
			result:     "Good potential",
			notes:      "Need to send company profile",
		},
		{
			status:     salesModels.SalesVisitStatusPlanned,
			daysOffset: 7,
			purpose:    "Monthly review",
			notes:      "Review sales performance",
		},
	}

	for i, vData := range visitsData {
		employee := employees[i%len(employees)]
		company := companies[i%len(companies)]

		visitDate := date(vData.daysOffset)
		// Set time part to all 0 for date field
		visitDateOnly := time.Date(visitDate.Year(), visitDate.Month(), visitDate.Day(), 0, 0, 0, 0, time.UTC)

		scheduledTime := visitDateOnly.Add(9 * time.Hour) // 09:00

		// Generate code
		ctx := context.Background()
		code, err := visitRepo.GetNextVisitNumber(ctx, "SV")
		if err != nil {
			// Fallback
			code = fmt.Sprintf("SV-%s-%04d", time.Now().Format("20060102"), i+1)
		}

		visit := salesModels.SalesVisit{
			Code:          code,
			VisitDate:     visitDateOnly,
			ScheduledTime: &scheduledTime,
			EmployeeID:    employee.ID,
			CompanyID:     &company.ID,
			ContactPerson: "Contact Person", // Simplified
			ContactPhone:  "08123456789",
			Address:       company.Address,
			Purpose:       vData.purpose,
			Notes:         vData.notes,
			Status:        vData.status,
		}

		if vData.result != "" {
			visit.Result = vData.result
		}

		if vData.status == salesModels.SalesVisitStatusInProgress || vData.status == salesModels.SalesVisitStatusCompleted {
			checkIn := visitDateOnly.Add(9 * time.Hour) // 09:00
			visit.CheckInAt = &checkIn
			lat := -6.200000 + (rand.Float64() * 0.01)
			lon := 106.816666 + (rand.Float64() * 0.01)
			visit.Latitude = &lat
			visit.Longitude = &lon
		}

		if vData.status == salesModels.SalesVisitStatusCompleted {
			checkOut := visitDateOnly.Add(10 * time.Hour) // 10:00
			visit.CheckOutAt = &checkOut
		}

		if vData.status == salesModels.SalesVisitStatusCancelled {
			cancelledAt := visitDateOnly.Add(8 * time.Hour)
			visit.CancelledAt = &cancelledAt
		}

		if err := db.Create(&visit).Error; err != nil {
			log.Printf("Warning: Failed to create visit %s: %v", code, err)
			continue
		}

		// Create Details (Products)
		if len(products) > 0 {
			numProducts := rand.Intn(3) + 1
			for j := 0; j < numProducts; j++ {
				product := products[(i+j)%len(products)]
				interest := rand.Intn(6) // 0-5
				notes := "Interested"
				qty := float64(rand.Intn(10) + 1)
				price := product.SellingPrice

				detail := salesModels.SalesVisitDetail{
					SalesVisitID:  visit.ID,
					ProductID:     product.ID,
					InterestLevel: interest,
					Notes:         notes,
					Quantity:      &qty,
					Price:         &price,
				}
				db.Create(&detail)
			}
		}

		// Create History
		initialHistory := salesModels.SalesVisitProgressHistory{
			SalesVisitID: visit.ID,
			FromStatus:   "",
			ToStatus:     salesModels.SalesVisitStatusPlanned,
			Notes:        "Visit created",
			CreatedAt:    visit.CreatedAt,
		}
		db.Create(&initialHistory)

		if visit.Status != salesModels.SalesVisitStatusPlanned {
			history := salesModels.SalesVisitProgressHistory{
				SalesVisitID: visit.ID,
				FromStatus:   salesModels.SalesVisitStatusPlanned,
				ToStatus:     visit.Status,
				Notes:        "Status updated during seeding",
				CreatedAt:    visit.CreatedAt.Add(1 * time.Hour),
			}
			db.Create(&history)
		}

		log.Printf("Created visit %s with status %s", code, vData.status)
	}

	log.Println("Sales visits seeded successfully")
	return nil
}
