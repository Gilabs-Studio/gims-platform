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

	// Fetch required reference data
	var paymentTerms []models.PaymentTerms
	if err := db.Where("is_active = ?", true).Limit(5).Find(&paymentTerms).Error; err != nil {
		return fmt.Errorf("failed to fetch payment terms: %w", err)
	}
	if len(paymentTerms) == 0 {
		log.Println("Warning: No payment terms found. Please seed payment terms first.")
		return nil
	}

	var employees []orgModels.Employee
	if err := db.Where("is_active = ?", true).Limit(5).Find(&employees).Error; err != nil {
		return fmt.Errorf("failed to fetch employees: %w", err)
	}
	if len(employees) == 0 {
		log.Println("Warning: No active employees found. Please seed employees first.")
		return nil
	}

	var businessUnits []orgModels.BusinessUnit
	if err := db.Where("is_active = ?", true).Limit(3).Find(&businessUnits).Error; err != nil {
		return fmt.Errorf("failed to fetch business units: %w", err)
	}
	if len(businessUnits) == 0 {
		log.Println("Warning: No business units found. Please seed business units first.")
		return nil
	}

	var products []productModels.Product
	if err := db.Where("is_active = ?", true).Limit(10).Find(&products).Error; err != nil {
		return fmt.Errorf("failed to fetch products: %w", err)
	}
	if len(products) == 0 {
		log.Println("Warning: No products found. Please seed products first.")
		return nil
	}

	// Sample customer seed data (mirrors customer_seeder.go constants)
	type customerSeed struct {
		ID      string
		Name    string
		Contact string
		Phone   string
		Email   string
	}
	customers := []customerSeed{
		{Customer1ID, "PT Apotek Sehat Sentosa", "Budi Santoso", "+6281234567891", "budi@apoteksehat.co.id"},
		{Customer2ID, "RS Harapan Kita Jakarta", "Dr. Sarah Amelia", "+6281234567892", "sarah@rsharapankita.co.id"},
		{Customer3ID, "Klinik Pratama Medika", "Anton Wijaya", "+6281234567893", "anton@klinikpratama.co.id"},
		{Customer4ID, "RS Siloam Hospitals Surabaya", "Lisa Permata", "+6281234567894", "lisa@siloam.co.id"},
	}

	quotationRepo := repositories.NewSalesQuotationRepository(db)
	ctx := context.Background()

	statuses := []salesModels.SalesQuotationStatus{
		salesModels.SalesQuotationStatusSent,
		salesModels.SalesQuotationStatusApproved,
		salesModels.SalesQuotationStatusSent,
		salesModels.SalesQuotationStatusDraft,
	}

	for i, cust := range customers {
		code, err := quotationRepo.GetNextQuotationNumber(ctx, "SQ")
		if err != nil {
			code = fmt.Sprintf("SQ-%s-%04d", time.Now().Format("200601"), i+1)
		}

		quotationDate := time.Now().AddDate(0, -1, -i*5)
		validUntil := quotationDate.AddDate(0, 1, 0)
		custID := cust.ID
		payTermID := paymentTerms[i%len(paymentTerms)].ID
		empID := employees[i%len(employees)].ID
		buID := businessUnits[i%len(businessUnits)].ID

		// Build items (2 products per quotation)
		var subtotal float64
		var items []salesModels.SalesQuotationItem
		for j := 0; j < 2 && j < len(products); j++ {
			p := products[(i*2+j)%len(products)]
			qty := float64(3 + j)
			price := p.SellingPrice
			discount := float64(0)
			s := qty * price * (1 - discount/100)
			subtotal += s
			items = append(items, salesModels.SalesQuotationItem{
				ProductID: p.ID,
				Quantity:  qty,
				Price:     price,
				Discount:  discount,
			})
		}
		taxRate := 11.0
		taxAmount := subtotal * taxRate / 100
		totalAmount := subtotal + taxAmount

		quotation := salesModels.SalesQuotation{
			Code:            code,
			QuotationDate:   quotationDate,
			ValidUntil:      &validUntil,
			CustomerID:      &custID,
			CustomerName:    cust.Name,
			CustomerContact: cust.Contact,
			CustomerPhone:   cust.Phone,
			CustomerEmail:   cust.Email,
			PaymentTermsID:  &payTermID,
			SalesRepID:      &empID,
			BusinessUnitID:  &buID,
			Subtotal:        subtotal,
			TaxRate:         taxRate,
			TaxAmount:       taxAmount,
			TotalAmount:     totalAmount,
			Status:          statuses[i%len(statuses)],
			Notes:           fmt.Sprintf("Sample quotation for %s", cust.Name),
			CreatedBy:       &empID,
		}

		if quotation.Status == salesModels.SalesQuotationStatusApproved {
			approvedAt := quotationDate.AddDate(0, 0, 2)
			quotation.ApprovedAt = &approvedAt
			quotation.ApprovedBy = &empID
		}

		if err := db.Create(&quotation).Error; err != nil {
			log.Printf("Warning: Failed to create quotation %s: %v", code, err)
			continue
		}

		for _, item := range items {
			item.SalesQuotationID = quotation.ID
			item.CalculateSubtotal()
			if err := db.Create(&item).Error; err != nil {
				log.Printf("Warning: Failed to create quotation item: %v", err)
			}
		}

		log.Printf("✓ Created quotation %s (customer: %s, status: %s)", code, cust.Name, quotation.Status)
	}

	log.Println("Sales quotations seeded successfully")
	return nil
}
