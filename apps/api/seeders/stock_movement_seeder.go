package seeders

import (
	"fmt"
	"log"
	"sort"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	inventoryModels "github.com/gilabs/gims/api/internal/inventory/data/models"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
	userModels "github.com/gilabs/gims/api/internal/user/data/models"
	"github.com/google/uuid"
)

// SeedStockMovement seeds sample stock movements based on existing Inventory Batches and Delivery Orders
func SeedStockMovement() error {
	db := database.DB

	// Check if already seeded with valid data
	var count int64
	db.Model(&inventoryModels.StockMovement{}).Count(&count)
	if count > 0 {
		var emptyCount int64
		// Check for "bad" seeds (empty ref_number)
		db.Model(&inventoryModels.StockMovement{}).Where("ref_number = '' OR ref_number IS NULL").Count(&emptyCount)

		if emptyCount == 0 {
			log.Println("Stock movements already seeded and valid, skipping...")
			return nil
		}
		log.Printf("Found %d stock movements with empty references, re-seeding...", emptyCount)
		// Clean up bad data
		db.Where("ref_number = '' OR ref_number IS NULL").Delete(&inventoryModels.StockMovement{})
	}

	log.Println("Seeding stock movements from existing entities...")

	// 1. Get Admin User for CreatedBy
	var adminUser userModels.User
	if err := db.Where("email = ?", "admin@example.com").First(&adminUser).Error; err != nil {
		// Fallback to any user
		db.First(&adminUser)
	}
	adminID := adminUser.ID
	if adminID == "" {
		adminID = "00000000-0000-0000-0000-000000000000"
	}

	// 2. Fetch all Products for Cost info
	var products []productModels.Product
	if err := db.Find(&products).Error; err != nil {
		return err
	}
	productMap := make(map[string]productModels.Product)
	for _, p := range products {
		productMap[p.ID] = p
	}

	// Internal struct to sort events
	type MovementEvent struct {
		Date         time.Time
		Details      inventoryModels.StockMovement
	}
	var events []MovementEvent

	// 3. Process Inventory Batches (IN Movements / Opening Stock)
	var batches []inventoryModels.InventoryBatch
	if err := db.Find(&batches).Error; err != nil {
		return err
	}
	log.Printf("Found %d batches for IN movements", len(batches))

	for _, batch := range batches {
		prod, ok := productMap[batch.ProductID]
		cost := 0.0
		if ok {
			cost = prod.CostPrice
		}

		// Assume batch creation date is recently, or derive from expiry.
		// Since we don't store CreatedAt in batch struct in the seeder, let's assume Now - 30 days
		date := time.Now().AddDate(0, 0, -30)

		evt := inventoryModels.StockMovement{
			ID:           uuid.NewString(), // Pre-generate ID
			Date:         date,
			MovementType: inventoryModels.MovementTypeIn,
			RefType:      "GoodsReceipt", // Or OpeningStock
			RefID:        uuid.NewString(), // Mock GR ID since we don't have separate GR table yet, or use Batch ID
			RefNumber:    fmt.Sprintf("GR-INIT-%s", batch.BatchNumber),
			Source:       "Initial Stock / Supplier",
			ProductID:    batch.ProductID,
			WarehouseID:  batch.WarehouseID,
			QtyIn:        batch.InitialQuantity,
			QtyOut:       0,
			Cost:         cost,
			InventoryBatchID: &batch.ID,
			CreatedBy:    &adminID,
		}
		
		events = append(events, MovementEvent{
			Date:    date,
			Details: evt,
		})
	}

	// 4. Process Delivery Orders (OUT Movements)
	var deliveryOrders []salesModels.DeliveryOrder
	// Fetch DOs that imply movement (Shipped or Delivered)
	if err := db.Preload("Items").Where("status IN ?", []salesModels.DeliveryOrderStatus{
		salesModels.DeliveryOrderStatusShipped,
		salesModels.DeliveryOrderStatusDelivered,
	}).Find(&deliveryOrders).Error; err != nil {
		return err
	}
	log.Printf("Found %d delivery orders for OUT movements", len(deliveryOrders))

	for _, do := range deliveryOrders {
		// Use ShippedAt date if available, else DeliveryDate
		movementDate := do.DeliveryDate
		if do.ShippedAt != nil {
			movementDate = *do.ShippedAt
		}

		for _, item := range do.Items {
			prod, ok := productMap[item.ProductID]
			cost := 0.0
			if ok {
				cost = prod.CostPrice
			}

			evt := inventoryModels.StockMovement{
				ID:           uuid.NewString(),
				Date:         movementDate,
				MovementType: inventoryModels.MovementTypeOut,
				RefType:      "DeliveryOrder",
				RefID:        do.ID,
				RefNumber:    do.Code, // e.g. DO-2024-0001
				Source:       "Customer", // Ideally should fetch Customer Name from SO -> Customer
				ProductID:    item.ProductID,
				WarehouseID:  "00000000-0000-0000-0000-000000000000", // DO items don't have warehouse_id in the model provided in context?
				// Note: DO Item struct in seeder context didn't show WarehouseID. 
				// In a real app, DO Item allocates from a specific Warehouse.
				// We need to find a warehouse. Let's pick the first one from products or default.
				// For now, let's try to infer from the batches if we had them or just pick a random one/default
				QtyIn:        0,
				QtyOut:       item.Quantity,
				Cost:         cost,
				CreatedBy:    &adminID,
			}
			
			// Try to find a valid warehouse for this product from batches (lazy way)
			// OR just assign to the first warehouse found in batches for this product
			assigned := false
			for _, b := range batches {
				if b.ProductID == item.ProductID {
					evt.WarehouseID = b.WarehouseID
					assigned = true
					break
				}
			}
			if !assigned {
				// Fallback to first warehouse in batches if available, or just skip logic that depends on it
				// For DO items, we really should have a warehouse.
				// Let's query one from DB if we really have to, OR just use a default UUID which might fail validation but better than empty string?
				// Actually, let's just use the first batch's warehouse as a fallback if batches exist
				if len(batches) > 0 {
					evt.WarehouseID = batches[0].WarehouseID
				} else {
					// Extremely unlikely if seed_all runs correctly
					// Only choice is to skip adding this event to avoid FK error
					log.Printf("Warning: Skipping movement for DO Item %s because no warehouse could be determined", item.ID)
					continue
				}
			}

			events = append(events, MovementEvent{
				Date:    movementDate,
				Details: evt,
			})
		}
	}

	// 5. Sort Events by Date
	sort.Slice(events, func(i, j int) bool {
		return events[i].Date.Before(events[j].Date)
	})

	// 6. Calculate Balances and Save
	// We need to track balance per Product + Warehouse
	type BalanceKey struct {
		ProductID   string
		WarehouseID string
	}
	balanceMap := make(map[BalanceKey]float64)

	var movementsToCreate []inventoryModels.StockMovement

	for _, e := range events {
		key := BalanceKey{
			ProductID:   e.Details.ProductID,
			WarehouseID: e.Details.WarehouseID,
		}
		
		current := balanceMap[key]
		
		if e.Details.MovementType == inventoryModels.MovementTypeIn {
			current += e.Details.QtyIn
		} else if e.Details.MovementType == inventoryModels.MovementTypeOut {
			current -= e.Details.QtyOut
		}
		
		e.Details.Balance = current
		balanceMap[key] = current
		
		movementsToCreate = append(movementsToCreate, e.Details)
	}

	// Batch insert
	batchSize := 100
	for i := 0; i < len(movementsToCreate); i += batchSize {
		end := i + batchSize
		if end > len(movementsToCreate) {
			end = len(movementsToCreate)
		}
		
		if err := db.Create(movementsToCreate[i:end]).Error; err != nil {
			log.Printf("Error creating stock movement batch: %v", err)
			return err
		}
	}

	log.Printf("Successfully seeded %d stock movements linked to Batches and DOs!", len(movementsToCreate))
	return nil
}
