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
	warehouseModels "github.com/gilabs/gims/api/internal/warehouse/data/models"
	inventoryModels "github.com/gilabs/gims/api/internal/inventory/data/models"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SeedDeliveryOrder seeds sample delivery order data
func SeedDeliveryOrder() error {
	db := database.DB

	var count int64
	db.Model(&salesModels.DeliveryOrder{}).Count(&count)
	if count > 0 {
		log.Println("Delivery orders already seeded, skipping...")
		return nil
	}

	log.Println("Seeding delivery orders...")

	// Get required reference data
	var warehouses []warehouseModels.Warehouse
	if err := db.Where("is_active = ?", true).Limit(3).Find(&warehouses).Error; err != nil {
		log.Printf("Warning: Failed to fetch warehouses: %v", err)
		return err
	}
	if len(warehouses) == 0 {
		log.Println("Warning: No active warehouses found. Please seed warehouses first.")
		return fmt.Errorf("warehouses not found")
	}

	var salesOrders []salesModels.SalesOrder
	if err := db.Where("status = ?", salesModels.SalesOrderStatusApproved).Preload("Items").Limit(5).Find(&salesOrders).Error; err != nil {
		log.Printf("Warning: Failed to fetch sales orders: %v", err)
		return err
	}
	if len(salesOrders) == 0 {
		log.Println("Warning: No approved sales orders found. Please seed sales orders first.")
		return nil
	}

	var employees []orgModels.Employee
	if err := db.Where("is_active = ?", true).Limit(5).Find(&employees).Error; err != nil {
		log.Printf("Warning: Failed to fetch employees: %v", err)
		return err
	}
	if len(employees) == 0 {
		log.Println("Warning: No active employees found. Please seed employees first.")
		return nil
	}

	var courierAgencies []models.CourierAgency
	if err := db.Where("is_active = ?", true).Limit(3).Find(&courierAgencies).Error; err != nil {
		log.Printf("Warning: Failed to fetch courier agencies: %v", err)
		// Continue without courier agencies
	}

	// Initialize repository for code generation
	deliveryRepo := repositories.NewDeliveryOrderRepository(db)

	now := time.Now()
	date := func(daysAgo int) time.Time {
		return now.AddDate(0, 0, -daysAgo)
	}

	// Create sample delivery orders with different statuses
	deliveryOrders := []struct {
		status         salesModels.DeliveryOrderStatus
		daysAgo        int
		itemsCount     int
		notes          string
		trackingNumber string
	}{
		{
			status:         salesModels.DeliveryOrderStatusDraft,
			daysAgo:        1,
			itemsCount:     2,
			notes:          "Draft delivery order",
			trackingNumber: "",
		},
		{
			status:         salesModels.DeliveryOrderStatusPrepared,
			daysAgo:        3,
			itemsCount:     3,
			notes:          "Prepared for shipping",
			trackingNumber: "",
		},
		{
			status:         salesModels.DeliveryOrderStatusShipped,
			daysAgo:        5,
			itemsCount:     4,
			notes:          "Shipped via courier",
			trackingNumber: "TRACK123456789",
		},
		{
			status:         salesModels.DeliveryOrderStatusDelivered,
			daysAgo:        10,
			itemsCount:     5,
			notes:          "Delivered and signed",
			trackingNumber: "TRACK987654321",
		},
	}

	for i, doData := range deliveryOrders {
		// Select sales order
		salesOrder := salesOrders[i%len(salesOrders)]
		
		// Select random references
		employee := employees[i%len(employees)]
		warehouse := warehouses[i%len(warehouses)]
		var courierAgency *models.CourierAgency
		if len(courierAgencies) > 0 {
			courierAgency = &courierAgencies[i%len(courierAgencies)]
		}

		// Generate delivery order code
		ctx := context.Background()
		code, err := deliveryRepo.GetNextDeliveryNumber(ctx, "DO")
		if err != nil {
			log.Printf("Warning: Failed to generate delivery order code: %v", err)
			// Fallback code
			code = fmt.Sprintf("DO-%s-%04d", time.Now().Format("20060102"), i+1)
		}

		deliveryDate := date(doData.daysAgo)
		doID := uuid.New().String()
		pendingMovements := []inventoryModels.StockMovement{}

		// Create items from sales order items
		items := make([]salesModels.DeliveryOrderItem, 0)
		itemCount := 0
		for _, soItem := range salesOrder.Items {
			if itemCount >= doData.itemsCount {
				break
			}
			
			// Calculate quantity to deliver (partial or full)
			quantity := soItem.Quantity
			if doData.status == salesModels.DeliveryOrderStatusPrepared {
				quantity = soItem.Quantity * 0.5 // Partial for prepared status
			}
			
			// Find a batch for this product in the selected warehouse
			var batch inventoryModels.InventoryBatch
			if err := db.Where("product_id = ? AND warehouse_id = ? AND current_quantity >= ?", 
				soItem.ProductID, warehouse.ID, quantity).First(&batch).Error; err != nil {
				// Fallback: any batch for this product
				db.Where("product_id = ?", soItem.ProductID).First(&batch)
			}

			item := salesModels.DeliveryOrderItem{
				ProductID: soItem.ProductID,
				Quantity:  quantity,
			}

			if batch.ID != "" {
				item.InventoryBatchID = &batch.ID
				
				// Synchronize stock based on status (manual update in seeder to bypass UC complexity)
				if doData.status == salesModels.DeliveryOrderStatusPrepared {
					// Reserved
					db.Model(&batch).Update("reserved_quantity", batch.ReservedQuantity + quantity)
					db.Model(&productModels.Product{}).Where("id = ?", soItem.ProductID).
						Update("reserved_stock", gorm.Expr("reserved_stock + ?", quantity))
				} else if doData.status == salesModels.DeliveryOrderStatusShipped || 
						   doData.status == salesModels.DeliveryOrderStatusDelivered {
					// Deducted in database
					db.Model(&batch).Update("current_quantity", batch.CurrentQuantity - quantity)
					db.Model(&productModels.Product{}).Where("id = ?", soItem.ProductID).
						Update("current_stock", gorm.Expr("current_stock - ?", quantity))

					// Create movement record so reconciliation can find it
					movement := inventoryModels.StockMovement{
						InventoryBatchID: &batch.ID,
						ProductID:        soItem.ProductID,
						WarehouseID:      warehouse.ID,
						MovementType:     "OUT",
						RefType:          "DELIVERY_ORDER",
						RefID:            doID, 
						RefNumber:        code,
						QtyOut:           quantity,
						Cost:             batch.CostPrice,
						Date:             deliveryDate,
						Source:           "Seeded Delivery Order",
					}
					pendingMovements = append(pendingMovements, movement)
				}
			}

			items = append(items, item)
			itemCount++
		}

		// Create delivery order
		deliveryOrder := salesModels.DeliveryOrder{
			ID:          doID,
			Code:        code,
			DeliveryDate: deliveryDate,
			WarehouseID:  &warehouse.ID,
			SalesOrderID: salesOrder.ID,
		ReceiverName:  salesOrder.CustomerName,
		ReceiverPhone: salesOrder.CustomerPhone,
			Status:      doData.status,
			Notes:       doData.notes,
		}

		if employee.ID != "" {
			deliveryOrder.DeliveredByID = &employee.ID
		}
		if courierAgency != nil {
			deliveryOrder.CourierAgencyID = &courierAgency.ID
		}

		// Set workflow fields based on status
		if doData.status == salesModels.DeliveryOrderStatusShipped {
			shippedAt := deliveryDate.AddDate(0, 0, 2)
			deliveryOrder.ShippedAt = &shippedAt
			deliveryOrder.TrackingNumber = doData.trackingNumber
			if len(employees) > 1 {
				deliveryOrder.ShippedBy = &employees[(i+1)%len(employees)].ID
			}
		}

		if doData.status == salesModels.DeliveryOrderStatusDelivered {
			shippedAt := deliveryDate.AddDate(0, 0, 2)
			deliveryOrder.ShippedAt = &shippedAt
			deliveryOrder.TrackingNumber = doData.trackingNumber
			if len(employees) > 1 {
				deliveryOrder.ShippedBy = &employees[(i+1)%len(employees)].ID
			}
			
			deliveredAt := deliveryDate.AddDate(0, 0, 5)
			deliveryOrder.DeliveredAt = &deliveredAt
			
			// Placeholder signature (base64 encoded "SIGNED")
			signature := "U0lHTkVE" // Base64 for "SIGNED"
			deliveryOrder.ReceiverSignature = signature
		}

		// Create delivery order with items
		if err := db.Create(&deliveryOrder).Error; err != nil {
			log.Printf("Warning: Failed to create delivery order: %v", err)
			continue
		}

		// Also create movements
		for _, m := range pendingMovements {
			db.Create(&m)
		}

		// Create items with delivery order ID
		for j := range items {
			items[j].DeliveryOrderID = deliveryOrder.ID
			if err := db.Create(&items[j]).Error; err != nil {
				log.Printf("Warning: Failed to create delivery order item: %v", err)
			}
		}

		log.Printf("Created delivery order %s with status %s", code, doData.status)
	}

	log.Println("Delivery orders seeded successfully")
	return nil
}
