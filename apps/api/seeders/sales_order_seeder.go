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

// SeedSalesOrder seeds sample sales order data
func SeedSalesOrder() error {
	db := database.DB

	var count int64
	db.Model(&salesModels.SalesOrder{}).Count(&count)
	if count > 0 {
		log.Println("Sales orders already seeded, skipping...")
		return nil
	}

	log.Println("Seeding sales orders...")

	// Get required reference data
	var quotations []salesModels.SalesQuotation
	if err := db.Preload("Items").Where("status = ?", salesModels.SalesQuotationStatusApproved).Limit(5).Find(&quotations).Error; err != nil {
		log.Printf("Warning: Failed to fetch approved quotations: %v", err)
		// Continue without quotations - can create orders without quotations
	}

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

	var areas []orgModels.Area
	if err := db.Where("is_active = ?", true).Limit(3).Find(&areas).Error; err != nil {
		log.Printf("Warning: Failed to fetch areas: %v", err)
		// Continue without areas
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
	orderRepo := repositories.NewSalesOrderRepository(db)

	// Helper function to calculate totals
	calculateTotals := func(items []salesModels.SalesOrderItem) (subtotal, totalAmount float64) {
		subtotal = 0
		for _, item := range items {
			subtotal += item.Subtotal
		}
		totalAmount = subtotal
		return
	}

	now := time.Now()
	date := func(daysAgo int) time.Time {
		return now.AddDate(0, 0, -daysAgo)
	}

	// Create sample orders with different statuses
	orders := []struct {
		status      salesModels.SalesOrderStatus
		daysAgo     int
		requiredDays int
		itemsCount  int
		notes       string
		fromQuotation bool
	}{
		{
			status:      salesModels.SalesOrderStatusDraft,
			daysAgo:     1,
			requiredDays: 7,
			itemsCount:  3,
			notes:       "Draft order for pharmacy",
			fromQuotation: false,
		},
		{
			status:      salesModels.SalesOrderStatusConfirmed,
			daysAgo:     5,
			requiredDays: 14,
			itemsCount:  5,
			notes:       "Confirmed order from hospital",
			fromQuotation: true,
		},
		{
			status:      salesModels.SalesOrderStatusProcessing,
			daysAgo:     10,
			requiredDays: 30,
			itemsCount:  4,
			notes:       "Processing order",
			fromQuotation: true,
		},
		{
			status:      salesModels.SalesOrderStatusDelivered,
			daysAgo:     20,
			requiredDays: 30,
			itemsCount:  6,
			notes:       "Delivered order for clinic",
			fromQuotation: true,
		},
		{
			status:      salesModels.SalesOrderStatusCancelled,
			daysAgo:     3,
			requiredDays: 7,
			itemsCount:  2,
			notes:       "Cancelled due to customer request",
			fromQuotation: false,
		},
	}

	for i, oData := range orders {
		// Select random references
		paymentTerm := paymentTerms[i%len(paymentTerms)]
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

		// Generate order code
		ctx := context.Background()
		code, err := orderRepo.GetNextOrderNumber(ctx, "SO")
		if err != nil {
			log.Printf("Warning: Failed to generate order code: %v", err)
			// Fallback code
			code = fmt.Sprintf("SO-%s-%04d", time.Now().Format("20060102"), i+1)
		}

		orderDate := date(oData.daysAgo)

		// Create items
		var items []salesModels.SalesOrderItem

		// Check if we should copy from quotation
		var linkedQuotation *salesModels.SalesQuotation
		if oData.fromQuotation && len(quotations) > 0 {
			linkedQuotation = &quotations[i%len(quotations)]
		}

		if linkedQuotation != nil && len(linkedQuotation.Items) > 0 {
			// Copy items from quotation
			items = make([]salesModels.SalesOrderItem, 0, len(linkedQuotation.Items))
			for _, qItem := range linkedQuotation.Items {
				item := salesModels.SalesOrderItem{
					ProductID: qItem.ProductID,
					Quantity:  qItem.Quantity,
					Price:     qItem.Price,
					Discount:  qItem.Discount,
					Subtotal:  (qItem.Price * qItem.Quantity) - qItem.Discount,
				}
				
				// Set quantities based on status (same logic as below)
				if oData.status == salesModels.SalesOrderStatusConfirmed || 
				   oData.status == salesModels.SalesOrderStatusProcessing ||
				   oData.status == salesModels.SalesOrderStatusShipped ||
				   oData.status == salesModels.SalesOrderStatusDelivered {
					item.ReservedQuantity = item.Quantity
				}
				
				if oData.status == salesModels.SalesOrderStatusDelivered {
					item.DeliveredQuantity = item.Quantity
				} else if oData.status == salesModels.SalesOrderStatusProcessing {
					item.DeliveredQuantity = item.Quantity * 0.5 
				}

				items = append(items, item)
			}
		} else {
			// Generate random items
			items = make([]salesModels.SalesOrderItem, 0, oData.itemsCount)
			for j := 0; j < oData.itemsCount && j < len(products); j++ {
				product := products[(i*3+j)%len(products)]
				quantity := float64((j + 1) * 10)
				price := product.SellingPrice
				discount := float64(j * 5000) // Small discount per item

				item := salesModels.SalesOrderItem{
					ProductID: product.ID,
					Quantity:  quantity,
					Price:     price,
					Discount:  discount,
				}
				item.CalculateSubtotal()
				
				// Set reserved quantity based on status
				if oData.status == salesModels.SalesOrderStatusConfirmed || 
				   oData.status == salesModels.SalesOrderStatusProcessing ||
				   oData.status == salesModels.SalesOrderStatusShipped ||
				   oData.status == salesModels.SalesOrderStatusDelivered {
					item.ReservedQuantity = quantity
				}
				
				// Set delivered quantity for delivered orders
				if oData.status == salesModels.SalesOrderStatusDelivered {
					item.DeliveredQuantity = quantity
				} else if oData.status == salesModels.SalesOrderStatusProcessing {
					item.DeliveredQuantity = quantity * 0.5 // Half delivered
				}
				
				items = append(items, item)
			}
		}

		// Calculate totals
		subtotal, totalAmount := calculateTotals(items)

		// Create order
		order := salesModels.SalesOrder{
			Code:           code,
			OrderDate:      orderDate,
			PaymentTermsID: &paymentTerm.ID,
			SalesRepID:     &employee.ID,
			BusinessUnitID: &businessUnit.ID,
			Subtotal:       subtotal,
			TotalAmount:    totalAmount,
			Status:         oData.status,
			Notes:          oData.notes,
		}

		if businessType != nil {
			order.BusinessTypeID = &businessType.ID
		}
		if area != nil {
			order.DeliveryAreaID = &area.ID
		}

		// Link to quotation if available
		if oData.fromQuotation && len(quotations) > 0 {
			quotation := quotations[i%len(quotations)]
			order.SalesQuotationID = &quotation.ID
		}

		// Set workflow fields based on status
		if oData.status == salesModels.SalesOrderStatusConfirmed ||
		   oData.status == salesModels.SalesOrderStatusProcessing ||
		   oData.status == salesModels.SalesOrderStatusShipped ||
		   oData.status == salesModels.SalesOrderStatusDelivered {
			confirmedAt := orderDate.AddDate(0, 0, 1)
			order.ConfirmedAt = &confirmedAt
			if len(employees) > 1 {
				order.ConfirmedBy = &employees[(i+1)%len(employees)].ID
			}
		}

		if oData.status == salesModels.SalesOrderStatusCancelled {
			cancelledAt := orderDate.AddDate(0, 0, 1)
			order.CancelledAt = &cancelledAt
			reason := "Customer request"
			order.CancellationReason = &reason
			if len(employees) > 1 {
				order.CancelledBy = &employees[(i+1)%len(employees)].ID
			}
		}

		// Create order with items
		if err := db.Create(&order).Error; err != nil {
			log.Printf("Warning: Failed to create order %s: %v", code, err)
			continue
		}

		// Create items with order ID
		for j := range items {
			items[j].SalesOrderID = order.ID
			if err := db.Create(&items[j]).Error; err != nil {
				log.Printf("Warning: Failed to create order item: %v", err)
			}
		}

		log.Printf("Created order %s with status %s", code, oData.status)
	}

	log.Println("Sales orders seeded successfully")
	return nil
}
