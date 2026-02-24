package seeders

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
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

	// Step 1: Fetch approved estimations to convert to quotations
	var approvedEstimations []salesModels.SalesEstimation
	if err := db.Where("status = ?", salesModels.SalesEstimationStatusApproved).
		Preload("Items.Product").
		Find(&approvedEstimations).Error; err != nil {
		log.Printf("Warning: Failed to fetch approved estimations: %v", err)
		return err
	}

	if len(approvedEstimations) == 0 {
		log.Println("Warning: No approved estimations found. Creating quotations without estimation link...")
	}

	// Step 2: Get required reference data
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

	// Initialize repository for code generation
	quotationRepo := repositories.NewSalesQuotationRepository(db)

	// Step 3: Convert approved estimations to quotations
	for i, estimation := range approvedEstimations {
		// Generate quotation code
		ctx := context.Background()
		code, err := quotationRepo.GetNextQuotationNumber(ctx, "SQ")
		if err != nil {
			log.Printf("Warning: Failed to generate quotation code: %v", err)
			code = fmt.Sprintf("SQ-%s-%04d", time.Now().Format("20060102"), i+1)
		}

		// Quotation date is 2 days after estimation approval
		quotationDate := estimation.EstimationDate.AddDate(0, 0, 2)
		validUntil := quotationDate.AddDate(0, 0, 30) // Valid for 30 days

		// Copy customer data from estimation (snapshot + FK pattern)
		quotation := salesModels.SalesQuotation{
			Code:            code,
			QuotationDate:   quotationDate,
			ValidUntil:      &validUntil,
			CustomerID:      estimation.CustomerID,
			CustomerName:    estimation.CustomerName,
			CustomerContact: estimation.CustomerContact,
			CustomerPhone:   estimation.CustomerPhone,
			CustomerEmail:   estimation.CustomerEmail,
			PaymentTermsID:  &paymentTerms[i%len(paymentTerms)].ID,
			SalesRepID:      estimation.SalesRepID,
			BusinessUnitID:  estimation.BusinessUnitID,
			BusinessTypeID:  estimation.BusinessTypeID,
			Subtotal:        estimation.Subtotal,
			DiscountAmount:  estimation.DiscountAmount,
			TaxRate:         estimation.TaxRate,
			TaxAmount:       estimation.TaxAmount,
			DeliveryCost:    estimation.DeliveryCost,
			OtherCost:       estimation.OtherCost,
			TotalAmount:     estimation.TotalAmount,
			Status:          salesModels.SalesQuotationStatusDraft, // Start as draft
			Notes:           fmt.Sprintf("Converted from estimation %s - %s", estimation.Code, estimation.Notes),
		}

		// Set different statuses for variety
		quotationStatuses := []salesModels.SalesQuotationStatus{
			salesModels.SalesQuotationStatusSent,     // Will be converted to order
			salesModels.SalesQuotationStatusApproved, // Will be converted to order
			salesModels.SalesQuotationStatusSent,     // Will stay as sent
			salesModels.SalesQuotationStatusDraft,    // Will stay as draft
		}
		if i < len(quotationStatuses) {
			quotation.Status = quotationStatuses[i]
		}

		// Set workflow timestamps based on status
		if quotation.Status == salesModels.SalesQuotationStatusApproved {
			approvedAt := quotationDate.AddDate(0, 0, 2)
			quotation.ApprovedAt = &approvedAt
			if len(employees) > 0 {
				quotation.ApprovedBy = &employees[i%len(employees)].ID
			}
		}

		// Set created by
		if len(employees) > 0 {
			quotation.CreatedBy = &employees[i%len(employees)].ID
		}

		// Create quotation
		if err := db.Create(&quotation).Error; err != nil {
			log.Printf("Warning: Failed to create quotation %s: %v", code, err)
			continue
		}

		// Copy items from estimation to quotation
		for _, estItem := range estimation.Items {
			quotItem := salesModels.SalesQuotationItem{
				SalesQuotationID: quotation.ID,
				ProductID:        estItem.ProductID,
				Quantity:         estItem.Quantity,
				Price:            estItem.EstimatedPrice,
				Discount:         estItem.Discount,
			}
			quotItem.CalculateSubtotal()

			if err := db.Create(&quotItem).Error; err != nil {
				log.Printf("Warning: Failed to create quotation item: %v", err)
			}
		}

		// Update estimation to mark as converted
		convertedAt := quotationDate
		if err := db.Model(&estimation).Updates(map[string]interface{}{
			"status":                  salesModels.SalesEstimationStatusConverted,
			"converted_to_quotation_id": quotation.ID,
			"converted_at":             &convertedAt,
		}).Error; err != nil {
			log.Printf("Warning: Failed to update estimation %s: %v", estimation.Code, err)
		}

		log.Printf("✓ Converted estimation %s → quotation %s (customer: %s)", 
			estimation.Code, quotation.Code, quotation.CustomerName)
	}

	log.Printf("Successfully created %d quotations from estimations", len(approvedEstimations))
	log.Println("Sales quotations seeded successfully")
	return nil
}
