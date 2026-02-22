package seeders

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
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

	// Step 1: Fetch approved/sent quotations to convert to orders
	var convertibleQuotations []salesModels.SalesQuotation
	if err := db.Where("status IN ?", []string{
		string(salesModels.SalesQuotationStatusApproved),
		string(salesModels.SalesQuotationStatusSent),
	}).Preload("Items.Product").Limit(3).Find(&convertibleQuotations).Error; err != nil {
		log.Printf("Warning: Failed to fetch convertible quotations: %v", err)
		return err
	}

	if len(convertibleQuotations) == 0 {
		log.Println("Warning: No convertible quotations found. Please seed quotations first.")
		return nil
	}

	// Step 2: Get required reference data

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
		return err
	}
	if len(areas) == 0 {
		log.Println("Warning: No areas found. Please seed areas first.")
		return nil
	}

	// Initialize repository for code generation
	orderRepo := repositories.NewSalesOrderRepository(db)

	// Step 3: Convert quotations to orders
	for i, quotation := range convertibleQuotations {
		// Generate order code
		ctx := context.Background()
		code, err := orderRepo.GetNextOrderNumber(ctx, "SO")
		if err != nil {
			log.Printf("Warning: Failed to generate order code: %v", err)
			code = fmt.Sprintf("SO-%s-%04d", time.Now().Format("20060102"), i+1)
		}

		// Order date is 3 days after quotation date
		orderDate := quotation.QuotationDate.AddDate(0, 0, 3)

		// Set order status to Approved for all converted quotations
		status := salesModels.SalesOrderStatusApproved

		// Create order by copying quotation data (snapshot + FK pattern)
		order := salesModels.SalesOrder{
			Code:              code,
			OrderDate:         orderDate,
			SalesQuotationID:  &quotation.ID, // Link to quotation
			PaymentTermsID:    quotation.PaymentTermsID,
			SalesRepID:        quotation.SalesRepID,
			BusinessUnitID:    quotation.BusinessUnitID,
			BusinessTypeID:    quotation.BusinessTypeID,
			DeliveryAreaID:    &areas[i%len(areas)].ID,
			CustomerID:        quotation.CustomerID,
			CustomerName:      quotation.CustomerName,
			CustomerContact:   quotation.CustomerContact,
			CustomerPhone:     quotation.CustomerPhone,
			CustomerEmail:     quotation.CustomerEmail,
			Subtotal:          quotation.Subtotal,
			DiscountAmount:    quotation.DiscountAmount,
			TaxRate:           quotation.TaxRate,
			TaxAmount:         quotation.TaxAmount,
			DeliveryCost:      quotation.DeliveryCost,
			OtherCost:         quotation.OtherCost,
			TotalAmount:       quotation.TotalAmount,
			Status:            status,
			Notes:             fmt.Sprintf("Converted from quotation %s", quotation.Code),
		}

		// Set stock reservation for approved orders
		if status == salesModels.SalesOrderStatusApproved {
			order.ReservedStock = true
		}

		// Set workflow timestamps based on status
		if status != salesModels.SalesOrderStatusDraft {
			confirmedAt := orderDate.AddDate(0, 0, 1)
			order.ConfirmedAt = &confirmedAt
			if len(employees) > 0 {
				order.ConfirmedBy = &employees[i%len(employees)].ID
			}
		}

		// Set created by
		if len(employees) > 0 {
			order.CreatedBy = &employees[i%len(employees)].ID
		}

		// Create order
		if err := db.Create(&order).Error; err != nil {
			log.Printf("Warning: Failed to create order %s: %v", code, err)
			continue
		}

		// Copy items from quotation to order
		for _, quotItem := range quotation.Items {
			// Fetch product details for snapshot fields
			var productCode, productName string
			if quotItem.Product != nil {
				productCode = quotItem.Product.Code
				productName = quotItem.Product.Name
			}

			orderItem := salesModels.SalesOrderItem{
				SalesOrderID: order.ID,
				ProductID:    quotItem.ProductID,
				Quantity:     quotItem.Quantity,
				Price:        quotItem.Price,
				Discount:     quotItem.Discount,
				Subtotal:     quotItem.Subtotal,
				ProductCode:  productCode,
				ProductName:  productName,
			}

			// Set quantities based on order status (always reserved for Approved)
			if status == salesModels.SalesOrderStatusApproved {
				orderItem.ReservedQuantity = orderItem.Quantity
			}

			// Delivery quantities are initialized to 0 since DO handles fulfillment now
			orderItem.DeliveredQuantity = 0

			if err := db.Create(&orderItem).Error; err != nil {
				log.Printf("Warning: Failed to create order item: %v", err)
			}
		}

		// Update quotation to mark as converted
		convertedAt := orderDate
		if err := db.Model(&quotation).Updates(map[string]interface{}{
			"status":                      salesModels.SalesQuotationStatusConverted,
			"converted_to_sales_order_id": order.ID,
			"converted_at":                &convertedAt,
		}).Error; err != nil {
			log.Printf("Warning: Failed to update quotation %s: %v", quotation.Code, err)
		}

		log.Printf("✓ Converted quotation %s → order %s (customer: %s, status: %s)",
			quotation.Code, order.Code, order.CustomerName, order.Status)
	}

	log.Printf("Successfully created %d orders from quotations", len(convertibleQuotations))
	log.Println("Sales orders seeded successfully")
	return nil
}
