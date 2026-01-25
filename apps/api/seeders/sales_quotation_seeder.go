package seeders

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
	"github.com/gilabs/gims/api/internal/sales/data/repositories"
)

// SeedSalesQuotation seeds sample sales quotation data
func SeedSalesQuotation() error {
	db := database.DB

	var count int64
	db.Model(&salesModels.SalesQuotation{}).Count(&count)
	if count > 0 {
		log.Println("Sales quotations already seeded, skipping...")
		return nil
	}

	log.Println("Seeding sales quotations...")

	// Get required reference data
	var paymentTerms []models.PaymentTerms
	if err := db.Where("is_active = ?", true).Limit(5).Find(&paymentTerms).Error; err != nil {
		log.Printf("Warning: Failed to fetch payment terms: %v", err)
		return err
	}
	if len(paymentTerms) == 0 {
		log.Println("Warning: No payment terms found. Please seed payment terms first.")
		return nil
	}

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
	quotationRepo := repositories.NewSalesQuotationRepository(db)

	// Helper function to calculate totals
	calculateTotals := func(items []salesModels.SalesQuotationItem, taxRate, deliveryCost, otherCost, discountAmount float64) (subtotal, taxAmount, totalAmount float64) {
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

	// Create sample quotations with different statuses
	quotations := []struct {
		status      salesModels.SalesQuotationStatus
		daysAgo     int
		validDays   int
		itemsCount  int
		taxRate     float64
		deliveryCost float64
		otherCost   float64
		discount    float64
		notes       string
	}{
		{
			status:      salesModels.SalesQuotationStatusDraft,
			daysAgo:     2,
			validDays:   30,
			itemsCount:  3,
			taxRate:     11.0,
			deliveryCost: 50000,
			otherCost:   0,
			discount:    0,
			notes:       "Initial quotation for pharmacy order",
		},
		{
			status:      salesModels.SalesQuotationStatusSent,
			daysAgo:     5,
			validDays:   14,
			itemsCount:  5,
			taxRate:     11.0,
			deliveryCost: 75000,
			otherCost:   25000,
			discount:    100000,
			notes:       "Quotation sent to hospital procurement",
		},
		{
			status:      salesModels.SalesQuotationStatusApproved,
			daysAgo:     10,
			validDays:   30,
			itemsCount:  4,
			taxRate:     11.0,
			deliveryCost: 100000,
			otherCost:   0,
			discount:    0,
			notes:       "Approved quotation for clinic order",
		},
		{
			status:      salesModels.SalesQuotationStatusRejected,
			daysAgo:     7,
			validDays:   14,
			itemsCount:  2,
			taxRate:     11.0,
			deliveryCost: 30000,
			otherCost:   0,
			discount:    0,
			notes:       "Rejected due to budget constraints",
		},
		{
			status:      salesModels.SalesQuotationStatusConverted,
			daysAgo:     15,
			validDays:   30,
			itemsCount:  6,
			taxRate:     11.0,
			deliveryCost: 150000,
			otherCost:   50000,
			discount:    200000,
			notes:       "Converted to sales order",
		},
		{
			status:      salesModels.SalesQuotationStatusDraft,
			daysAgo:     1,
			validDays:   7,
			itemsCount:  2,
			taxRate:     11.0,
			deliveryCost: 0,
			otherCost:   0,
			discount:    0,
			notes:       "Draft quotation for small order",
		},
	}

	for i, qData := range quotations {
		// Select random references
		paymentTerm := paymentTerms[i%len(paymentTerms)]
		employee := employees[i%len(employees)]
		businessUnit := businessUnits[i%len(businessUnits)]
		var businessType *orgModels.BusinessType
		if len(businessTypes) > 0 {
			businessType = &businessTypes[i%len(businessTypes)]
		}

		// Generate quotation code
		ctx := context.Background()
		code, err := quotationRepo.GetNextQuotationNumber(ctx, "SQ")
		if err != nil {
			log.Printf("Warning: Failed to generate quotation code: %v", err)
			// Fallback code
			code = fmt.Sprintf("SQ-%s-%04d", time.Now().Format("20060102"), i+1)
		}

		quotationDate := date(qData.daysAgo)
		validUntil := quotationDate.AddDate(0, 0, qData.validDays)

		// Create items
		items := make([]salesModels.SalesQuotationItem, 0, qData.itemsCount)
		for j := 0; j < qData.itemsCount && j < len(products); j++ {
			product := products[(i*3+j)%len(products)]
			quantity := float64((j + 1) * 10)
			price := product.SellingPrice
			discount := float64(j * 5000) // Small discount per item

			item := salesModels.SalesQuotationItem{
				ProductID: product.ID,
				Quantity:  quantity,
				Price:     price,
				Discount:  discount,
			}
			item.CalculateSubtotal()
			items = append(items, item)
		}

		// Calculate totals
		subtotal, taxAmount, totalAmount := calculateTotals(
			items,
			qData.taxRate,
			qData.deliveryCost,
			qData.otherCost,
			qData.discount,
		)

		// Create quotation
		quotation := salesModels.SalesQuotation{
			Code:           code,
			QuotationDate:  quotationDate,
			ValidUntil:     &validUntil,
			PaymentTermsID: &paymentTerm.ID,
			SalesRepID:     &employee.ID,
			BusinessUnitID: &businessUnit.ID,
			Subtotal:       subtotal,
			DiscountAmount: qData.discount,
			TaxRate:        qData.taxRate,
			TaxAmount:      taxAmount,
			DeliveryCost:   qData.deliveryCost,
			OtherCost:      qData.otherCost,
			TotalAmount:    totalAmount,
			Status:         qData.status,
			Notes:          qData.notes,
		}

		if businessType != nil {
			quotation.BusinessTypeID = &businessType.ID
		}

		// Set workflow fields based on status
		if qData.status == salesModels.SalesQuotationStatusApproved {
			approvedAt := quotationDate.AddDate(0, 0, 2)
			quotation.ApprovedAt = &approvedAt
			if len(employees) > 1 {
				quotation.ApprovedBy = &employees[(i+1)%len(employees)].ID
			}
		}

		if qData.status == salesModels.SalesQuotationStatusRejected {
			rejectedAt := quotationDate.AddDate(0, 0, 1)
			quotation.RejectedAt = &rejectedAt
			reason := "Budget constraints"
			quotation.RejectionReason = &reason
			if len(employees) > 1 {
				quotation.RejectedBy = &employees[(i+1)%len(employees)].ID
			}
		}

		if qData.status == salesModels.SalesQuotationStatusConverted {
			convertedAt := quotationDate.AddDate(0, 0, 3)
			quotation.ConvertedAt = &convertedAt
		}

		// Create quotation with items
		if err := db.Create(&quotation).Error; err != nil {
			log.Printf("Warning: Failed to create quotation %s: %v", code, err)
			continue
		}

		// Create items with quotation ID
		for j := range items {
			items[j].SalesQuotationID = quotation.ID
			if err := db.Create(&items[j]).Error; err != nil {
				log.Printf("Warning: Failed to create quotation item: %v", err)
			}
		}

		log.Printf("Created quotation %s with status %s", code, qData.status)
	}

	log.Println("Sales quotations seeded successfully")
	return nil
}
