package seeders

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/database"
	orgModels "github.com/gilabs/crm-healthcare/api/internal/organization/data/models"
	productModels "github.com/gilabs/crm-healthcare/api/internal/product/data/models"
	salesModels "github.com/gilabs/crm-healthcare/api/internal/sales/data/models"
	"github.com/gilabs/crm-healthcare/api/internal/sales/data/repositories"
)

// SeedSalesEstimation seeds sample sales estimation data
func SeedSalesEstimation() error {
	db := database.DB

	var count int64
	db.Model(&salesModels.SalesEstimation{}).Count(&count)
	if count > 0 {
		log.Println("Sales estimations already seeded, skipping...")
		return nil
	}

	log.Println("Seeding sales estimations...")

	// Get required reference data
	var employees []orgModels.Employee
	if err := db.Where("is_approved = ?", true).Limit(5).Find(&employees).Error; err != nil {
		log.Printf("Warning: Failed to fetch employees: %v", err)
		return err
	}
	if len(employees) == 0 {
		log.Println("Warning: No approved employees found. Please seed employees first.")
		return nil
	}

	var businessUnits []orgModels.BusinessUnit
	if err := db.Where("is_active = ?", true).Limit(3).Find(&businessUnits).Error; err != nil {
		log.Printf("Warning: Failed to fetch business units: %v", err)
		return err
	}
	if len(businessUnits) == 0 {
		log.Println("Warning: No business units found. Please seed business units first.")
		return nil
	}

	var businessTypes []orgModels.BusinessType
	if err := db.Where("is_active = ?", true).Limit(4).Find(&businessTypes).Error; err != nil {
		log.Printf("Warning: Failed to fetch business types: %v", err)
		return nil
	}
	
	var areas []orgModels.Area
	if err := db.Limit(5).Find(&areas).Error; err != nil {
		log.Printf("Warning: Failed to fetch areas: %v", err)
		return nil
	}

	var products []productModels.Product
	if err := db.Where("is_approved = ?", true).Limit(20).Find(&products).Error; err != nil {
		log.Printf("Warning: Failed to fetch products: %v", err)
		return err
	}
	if len(products) == 0 {
		log.Println("Warning: No approved products found. Please seed products first.")
		return nil
	}

	// Initialize repository for code generation
	estimationRepo := repositories.NewSalesEstimationRepository(db)

	// Helper function to calculate totals
	calculateTotals := func(items []salesModels.SalesEstimationItem, taxRate, deliveryCost, otherCost, discountAmount float64) (subtotal, taxAmount, totalAmount float64) {
		subtotal = 0
		for _, item := range items {
			subtotal += item.Subtotal
		}
		subtotalAfterDiscount := subtotal - discountAmount
		if subtotalAfterDiscount < 0 {
			subtotalAfterDiscount = 0
		}
		taxAmount = subtotalAfterDiscount * (taxRate / 100)
		totalAmount = subtotalAfterDiscount + taxAmount + deliveryCost + otherCost
		return
	}

	now := time.Now()
	date := func(daysAgo int) time.Time {
		return now.AddDate(0, 0, -daysAgo)
	}

	// Create sample estimations with different statuses
	estimations := []struct {
		status       salesModels.SalesEstimationStatus
		daysAgo      int
		itemsCount   int
		probability  int
		taxRate      float64
		deliveryCost float64
		otherCost    float64
		discount     float64
		notes        string
		customerName string
	}{
		{
			status:       salesModels.SalesEstimationStatusDraft,
			daysAgo:      1,
			itemsCount:   2,
			probability:  25,
			taxRate:      11.0,
			deliveryCost: 0,
			otherCost:    0,
			discount:     0,
			notes:        "Initial estimation for new prospect",
			customerName: "Klinik Sehat Selalu",
		},
		{
			status:       salesModels.SalesEstimationStatusSubmitted,
			daysAgo:      3,
			itemsCount:   4,
			probability:  50,
			taxRate:      11.0,
			deliveryCost: 50000,
			otherCost:    0,
			discount:     50000,
			notes:        "Submitted for review, awaiting approval",
			customerName: "RSIA Bunda Bahagia",
		},
		{
			status:       salesModels.SalesEstimationStatusApproved,
			daysAgo:      7,
			itemsCount:   5,
			probability:  75,
			taxRate:      11.0,
			deliveryCost: 100000,
			otherCost:    25000,
			discount:     100000,
			notes:        "Approved, ready for quotation",
			customerName: "Apotek Kimia Global",
		},
		{
			status:       salesModels.SalesEstimationStatusRejected,
			daysAgo:      5,
			itemsCount:   3,
			probability:  10,
			taxRate:      11.0,
			deliveryCost: 0,
			otherCost:    0,
			discount:     0,
			notes:        "Customer budget too low",
			customerName: "Klinik Pratama Jaya",
		},
		{
			status:       salesModels.SalesEstimationStatusConverted,
			daysAgo:      10,
			itemsCount:   10,
			probability:  100,
			taxRate:      11.0,
			deliveryCost: 150000,
			otherCost:    50000,
			discount:     500000,
			notes:        "Converted to Quotation successfully",
			customerName: "RS Umum Daerah",
		},
	}

	for i, eData := range estimations {
		// Select random references
		employee := employees[i%len(employees)]
		businessUnit := businessUnits[i%len(businessUnits)]
		var businessType *orgModels.BusinessType
		if len(businessTypes) > 0 {
			businessType = &businessTypes[i%len(businessTypes)]
		}
		var area *orgModels.Area
		if len(areas) > 0 {
			area = &areas[i%len(areas)]
		}

		// Generate estimation code
		ctx := context.Background()
		code, err := estimationRepo.GetNextEstimationNumber(ctx, "SE")
		if err != nil {
			log.Printf("Warning: Failed to generate estimation code: %v", err)
			code = fmt.Sprintf("SE-%s-%04d", time.Now().Format("20060102"), i+1)
		}

		estimationDate := date(eData.daysAgo)
		// Expected close date 30 days from estimation
		expectedClose := estimationDate.AddDate(0, 0, 30)

		// Create items
		items := make([]salesModels.SalesEstimationItem, 0, eData.itemsCount)
		for j := 0; j < eData.itemsCount && j < len(products); j++ {
			product := products[(i*3+j)%len(products)]
			quantity := float64((j + 1) * 5)
			price := product.SellingPrice
			discount := float64(j * 1000) 

			item := salesModels.SalesEstimationItem{
				ProductID:      product.ID,
				Quantity:       quantity,
				EstimatedPrice: price,
				Discount:       discount,
			}
			item.CalculateSubtotal()
			items = append(items, item)
		}

		// Calculate totals
		subtotal, taxAmount, totalAmount := calculateTotals(
			items,
			eData.taxRate,
			eData.deliveryCost,
			eData.otherCost,
			eData.discount,
		)

		// Create estimation
		estimation := salesModels.SalesEstimation{
			Code:              code,
			EstimationDate:    estimationDate,
			ExpectedCloseDate: &expectedClose,
			CustomerName:      eData.customerName,
			CustomerEmail:     fmt.Sprintf("contact@%s.com", fmt.Sprintf("cust%d", i)),
			CustomerPhone:     fmt.Sprintf("0812345678%d", i),
			CustomerContact:   fmt.Sprintf("Contact Person %d", i),
			SalesRepID:        &employee.ID,
			BusinessUnitID:    &businessUnit.ID,
			Probability:       eData.probability,
			Subtotal:          subtotal,
			DiscountAmount:    eData.discount,
			TaxRate:           eData.taxRate,
			TaxAmount:         taxAmount,
			DeliveryCost:      eData.deliveryCost,
			OtherCost:         eData.otherCost,
			TotalAmount:       totalAmount,
			Status:            eData.status,
			Notes:             eData.notes,
		}

		if businessType != nil {
			estimation.BusinessTypeID = &businessType.ID
		}
		
		if area != nil {
			estimation.AreaID = &area.ID
		}

		// Set workflow fields
		if eData.status == salesModels.SalesEstimationStatusApproved {
			approvedAt := estimationDate.AddDate(0, 0, 1)
			estimation.ApprovedAt = &approvedAt
			if len(employees) > 1 {
				estimation.ApprovedBy = &employees[(i+1)%len(employees)].ID
			}
		}

		if eData.status == salesModels.SalesEstimationStatusRejected {
			rejectedAt := estimationDate.AddDate(0, 0, 1)
			estimation.RejectedAt = &rejectedAt
			reason := "Budget constraints"
			estimation.RejectionReason = &reason
			if len(employees) > 1 {
				estimation.RejectedBy = &employees[(i+1)%len(employees)].ID
			}
		}

		if eData.status == salesModels.SalesEstimationStatusConverted {
			convertedAt := estimationDate.AddDate(0, 0, 2)
			estimation.ConvertedAt = &convertedAt
			// We won't link to actual quotation here to avoid circular dependencies complexity in seeding logic
			// But status reflects it
		}
		
		// Use createdBy from random employee
		randomEmployeeID := employees[rand.Intn(len(employees))].ID
		estimation.CreatedBy = &randomEmployeeID

		// Save estimation
		if err := db.Create(&estimation).Error; err != nil {
			log.Printf("Warning: Failed to create estimation %s: %v", code, err)
			continue
		}

		// Save items
		for j := range items {
			items[j].SalesEstimationID = estimation.ID
			if err := db.Create(&items[j]).Error; err != nil {
				log.Printf("Warning: Failed to create estimation item: %v", err)
			}
		}

		log.Printf("Created estimation %s with status %s", code, eData.status)
	}

	log.Println("Sales estimations seeded successfully")
	return nil
}
