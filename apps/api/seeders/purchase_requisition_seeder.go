package seeders

import (
	"fmt"
	"log"
	"time"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	purchaseModels "github.com/gilabs/gims/api/internal/purchase/data/models"
	supplierModels "github.com/gilabs/gims/api/internal/supplier/data/models"
)

// SeedPurchaseRequisition seeds sample Purchase Requisition data (Sprint 8)
func SeedPurchaseRequisition() error {
	db := database.DB

	var count int64
	db.Model(&purchaseModels.PurchaseRequisition{}).Count(&count)
	if count > 0 {
		log.Println("Purchase requisitions already seeded, skipping...")
		return nil
	}

	log.Println("Seeding purchase requisitions...")

	var suppliers []supplierModels.Supplier
	if err := db.Where("is_active = ?", true).Limit(3).Find(&suppliers).Error; err != nil {
		return err
	}
	if len(suppliers) == 0 {
		log.Println("Warning: No suppliers found. Please seed suppliers first.")
		return nil
	}

	var paymentTerms []coreModels.PaymentTerms
	if err := db.Where("is_active = ?", true).Limit(3).Find(&paymentTerms).Error; err != nil {
		return err
	}
	if len(paymentTerms) == 0 {
		log.Println("Warning: No payment terms found. Please seed payment terms first.")
		return nil
	}

	var businessUnits []orgModels.BusinessUnit
	if err := db.Where("is_active = ?", true).Limit(3).Find(&businessUnits).Error; err != nil {
		return err
	}
	if len(businessUnits) == 0 {
		log.Println("Warning: No business units found. Please seed business units first.")
		return nil
	}

	var employees []orgModels.Employee
	if err := db.Where("is_active = ?", true).Limit(5).Find(&employees).Error; err != nil {
		return err
	}
	if len(employees) == 0 {
		log.Println("Warning: No employees found. Please seed employees first.")
		return nil
	}

	var products []productModels.Product
	if err := db.Where("is_approved = ?", true).Limit(20).Find(&products).Error; err != nil {
		return err
	}
	if len(products) == 0 {
		log.Println("Warning: No products found. Please seed products first.")
		return nil
	}

	calcItemSubtotal := func(qty, price, discount float64) float64 {
		raw := qty * price
		if discount <= 0 {
			return raw
		}
		if discount > 100 {
			discount = 100
		}
		return raw - (raw * (discount / 100))
	}

	calcTotals := func(items []purchaseModels.PurchaseRequisitionItem, taxRate, deliveryCost, otherCost float64) (subtotal, taxAmount, total float64) {
		subtotal = 0
		for _, it := range items {
			subtotal += it.Subtotal
		}
		if taxRate < 0 {
			taxRate = 0
		}
		if taxRate > 100 {
			taxRate = 100
		}
		taxAmount = subtotal * (taxRate / 100)
		if deliveryCost < 0 {
			deliveryCost = 0
		}
		if otherCost < 0 {
			otherCost = 0
		}
		total = subtotal + taxAmount + deliveryCost + otherCost
		return
	}

	now := time.Now()
	year := now.Format("2006")

	makeCode := func(seq int) string {
		return fmt.Sprintf("PR%s%04d", year, seq)
	}

	seedDefs := []struct {
		status  purchaseModels.PurchaseRequisitionStatus
		daysAgo int
		items   int
		taxRate float64
		notes   string
	}{
		{purchaseModels.PurchaseRequisitionStatusDraft, 1, 3, 11, "Draft PR for restock"},
		{purchaseModels.PurchaseRequisitionStatusApproved, 3, 4, 11, "Approved PR"},
		{purchaseModels.PurchaseRequisitionStatusRejected, 5, 2, 11, "Rejected PR sample"},
		{purchaseModels.PurchaseRequisitionStatusConverted, 7, 3, 11, "Converted PR sample"},
		{purchaseModels.PurchaseRequisitionStatusDraft, 9, 2, 0, "Equipment PR"},
	}

	for i, def := range seedDefs {
		supplier := suppliers[i%len(suppliers)]
		pt := paymentTerms[i%len(paymentTerms)]
		bu := businessUnits[i%len(businessUnits)]
		emp := employees[i%len(employees)]

		requestDate := now.AddDate(0, 0, -def.daysAgo).Format("2006-01-02")

		items := make([]purchaseModels.PurchaseRequisitionItem, 0, def.items)
		for j := 0; j < def.items; j++ {
			p := products[(i+j)%len(products)]
			qty := float64((j % 3) + 1)
			price := float64(10000 + (j * 2500))
			discount := float64(0)
			if j%3 == 2 {
				discount = 5
			}

			itSubtotal := calcItemSubtotal(qty, price, discount)
			items = append(items, purchaseModels.PurchaseRequisitionItem{
				ProductID:     p.ID,
				Quantity:      qty,
				PurchasePrice: price,
				Discount:      discount,
				Subtotal:      itSubtotal,
			})
		}

		subtotal, taxAmount, total := calcTotals(items, def.taxRate, 0, 0)

		pr := purchaseModels.PurchaseRequisition{
			Code:           makeCode(i + 1),
			SupplierID:     &supplier.ID,
			PaymentTermsID: &pt.ID,
			BusinessUnitID: &bu.ID,
			EmployeeID:     &emp.ID,
			RequestDate:    requestDate,
			Notes:          def.notes,
			Status:         def.status,
			TaxRate:        def.taxRate,
			TaxAmount:      taxAmount,
			Subtotal:       subtotal,
			TotalAmount:    total,
			Items:          items,
		}

		if err := db.Create(&pr).Error; err != nil {
			log.Printf("Warning: Failed to create purchase requisition %s: %v", pr.Code, err)
			return err
		}
	}

	log.Println("Purchase requisitions seeded successfully")
	return nil
}
