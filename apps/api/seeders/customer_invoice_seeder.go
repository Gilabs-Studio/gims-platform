package seeders

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/gilabs/crm-healthcare/api/internal/core/data/models"
	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/database"
	productModels "github.com/gilabs/crm-healthcare/api/internal/product/data/models"
	salesModels "github.com/gilabs/crm-healthcare/api/internal/sales/data/models"
	"github.com/gilabs/crm-healthcare/api/internal/sales/data/repositories"
)

// SeedCustomerInvoice seeds sample customer invoice data
func SeedCustomerInvoice() error {
	db := database.DB

	var count int64
	db.Model(&salesModels.CustomerInvoice{}).Count(&count)
	if count > 0 {
		log.Println("Customer invoices already seeded, skipping...")
		return nil
	}

	log.Println("Seeding customer invoices...")

	// Get required reference data - only confirmed sales orders
	var salesOrders []salesModels.SalesOrder
	if err := db.Preload("Items").Where("status = ?", salesModels.SalesOrderStatusConfirmed).Limit(5).Find(&salesOrders).Error; err != nil {
		log.Printf("Warning: Failed to fetch confirmed sales orders: %v", err)
		return err
	}
	if len(salesOrders) == 0 {
		log.Println("Warning: No confirmed sales orders found. Please seed sales orders first.")
		return nil
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
	invoiceRepo := repositories.NewCustomerInvoiceRepository(db)

	// Helper function to calculate totals
	calculateTotals := func(items []salesModels.CustomerInvoiceItem, taxRate float64, deliveryCost, otherCost float64) (subtotal, taxAmount, totalAmount float64) {
		subtotal = 0
		for _, item := range items {
			subtotal += item.Subtotal
		}
		taxAmount = subtotal * (taxRate / 100)
		totalAmount = subtotal + taxAmount + deliveryCost + otherCost
		return
	}

	now := time.Now()
	date := func(daysAgo int) time.Time {
		return now.AddDate(0, 0, -daysAgo)
	}

	// Create sample invoices with different statuses
	invoices := []struct {
		status       salesModels.CustomerInvoiceStatus
		daysAgo      int
		dueDaysAfter int
		itemsCount   int
		notes        string
		fromOrder    bool
		paidPercent  float64 // 0 = unpaid, 0.5 = partial, 1.0 = paid
	}{
		{
			status:       salesModels.CustomerInvoiceStatusUnpaid,
			daysAgo:      2,
			dueDaysAfter: 30,
			itemsCount:   3,
			notes:        "Invoice for medical supplies",
			fromOrder:    true,
			paidPercent:  0,
		},
		{
			status:       salesModels.CustomerInvoiceStatusPartial,
			daysAgo:      10,
			dueDaysAfter: 30,
			itemsCount:   4,
			notes:        "Partial payment received",
			fromOrder:    true,
			paidPercent:  0.5,
		},
		{
			status:       salesModels.CustomerInvoiceStatusPaid,
			daysAgo:      20,
			dueDaysAfter: 30,
			itemsCount:   5,
			notes:        "Fully paid invoice",
			fromOrder:    true,
			paidPercent:  1.0,
		},
		{
			status:       salesModels.CustomerInvoiceStatusUnpaid,
			daysAgo:      5,
			dueDaysAfter: 14,
			itemsCount:   2,
			notes:        "Urgent delivery invoice",
			fromOrder:    false,
			paidPercent:  0,
		},
		{
			status:       salesModels.CustomerInvoiceStatusCancelled,
			daysAgo:      3,
			dueDaysAfter: 30,
			itemsCount:   3,
			notes:        "Cancelled due to order cancellation",
			fromOrder:    true,
			paidPercent:  0,
		},
	}

	for i, invData := range invoices {
		// Select random references
		paymentTerm := paymentTerms[i%len(paymentTerms)]

		// Generate invoice code
		ctx := context.Background()
		code, err := invoiceRepo.GetNextInvoiceNumber(ctx, "INV")
		if err != nil {
			log.Printf("Warning: Failed to generate invoice code: %v", err)
			// Fallback code
			code = fmt.Sprintf("INV-%s-%04d", time.Now().Format("20060102"), i+1)
		}

		invoiceDate := date(invData.daysAgo)
		dueDate := invoiceDate.AddDate(0, 0, invData.dueDaysAfter)

		// Create items
		var items []salesModels.CustomerInvoiceItem

		// Check if we should copy from sales order
		var linkedOrder *salesModels.SalesOrder
		if invData.fromOrder && len(salesOrders) > 0 {
			linkedOrder = &salesOrders[i%len(salesOrders)]
		}

		if linkedOrder != nil && len(linkedOrder.Items) > 0 {
			// Copy items from sales order
			items = make([]salesModels.CustomerInvoiceItem, 0, len(linkedOrder.Items))
			for _, soItem := range linkedOrder.Items {
				// Get product to fetch current HPP
				var product productModels.Product
				if err := db.First(&product, "id = ?", soItem.ProductID).Error; err == nil {
					item := salesModels.CustomerInvoiceItem{
						ProductID:  soItem.ProductID,
						Quantity:   soItem.Quantity,
						Price:      soItem.Price,
						Discount:   soItem.Discount,
						HPPAmount:  product.CurrentHpp, // Use current HPP from product
						Subtotal:   (soItem.Price * soItem.Quantity) - soItem.Discount,
					}
					items = append(items, item)
				}
			}
		} else {
			// Generate random items
			items = make([]salesModels.CustomerInvoiceItem, 0, invData.itemsCount)
			for j := 0; j < invData.itemsCount && j < len(products); j++ {
				product := products[(i*3+j)%len(products)]
				quantity := float64((j + 1) * 10)
				price := product.SellingPrice
				discount := float64(j * 5000)

				item := salesModels.CustomerInvoiceItem{
					ProductID:  product.ID,
					Quantity:   quantity,
					Price:      price,
					Discount:   discount,
					HPPAmount:  product.CurrentHpp,
					Subtotal:   (price * quantity) - discount,
				}
				items = append(items, item)
			}
		}

		// Calculate totals
		taxRate := 11.0
		deliveryCost := 0.0
		otherCost := 0.0
		subtotal, taxAmount, totalAmount := calculateTotals(items, taxRate, deliveryCost, otherCost)

		// Create invoice
		invoice := salesModels.CustomerInvoice{
			Code:           code,
			InvoiceDate:    invoiceDate,
			DueDate:        &dueDate,
			Type:           salesModels.CustomerInvoiceTypeRegular,
			PaymentTermsID: &paymentTerm.ID,
			TaxRate:        taxRate,
			TaxAmount:      taxAmount,
			DeliveryCost:   deliveryCost,
			OtherCost:      otherCost,
			Subtotal:       subtotal,
			Amount:         totalAmount,
			Status:         invData.status,
			Notes:          invData.notes,
		}

		// Link to sales order if available
		if linkedOrder != nil {
			invoice.SalesOrderID = &linkedOrder.ID
		}

		// Set payment fields based on status
		if invData.paidPercent > 0 {
			paidAmount := totalAmount * invData.paidPercent
			invoice.PaidAmount = paidAmount
			invoice.RemainingAmount = totalAmount - paidAmount

			if invData.status == salesModels.CustomerInvoiceStatusPaid {
				paymentAt := invoiceDate.AddDate(0, 0, invData.dueDaysAfter-5)
				invoice.PaymentAt = &paymentAt
			}
		}

		// Create invoice with items
		if err := db.Create(&invoice).Error; err != nil {
			log.Printf("Warning: Failed to create invoice %s: %v", code, err)
			continue
		}

		// Create items with invoice ID
		for j := range items {
			items[j].CustomerInvoiceID = invoice.ID
			if err := db.Create(&items[j]).Error; err != nil {
				log.Printf("Warning: Failed to create invoice item: %v", err)
			}
		}

		log.Printf("Created invoice %s with status %s", code, invData.status)
	}

	log.Println("Customer invoices seeded successfully")
	return nil
}
