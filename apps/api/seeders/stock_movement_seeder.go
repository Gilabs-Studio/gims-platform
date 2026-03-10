package seeders

import (
	"fmt"
	"log"
	"sort"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	inventoryModels "github.com/gilabs/gims/api/internal/inventory/data/models"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	purchaseModels "github.com/gilabs/gims/api/internal/purchase/data/models"
	salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
	opnameModels "github.com/gilabs/gims/api/internal/stock_opname/data/models"
	"github.com/google/uuid"
)

// movementEvent holds a dated movement for chronological sorting
type movementEvent struct {
	Date    time.Time
	Details inventoryModels.StockMovement
}

// batchKey maps product+warehouse to a batch ID
type batchKey struct {
	ProductID   string
	WarehouseID string
}

// SeedStockMovement generates stock movements from real relational entities:
// - IN  movements from closed Goods Receipt items
// - OUT movements from shipped/delivered Delivery Order items
// - ADJUST movements from posted Stock Opname items with variance
// No dummy data is created — all references point to existing seeded records.
// If any category is missing, all movements are deleted and fully re-seeded for consistent balances.
func SeedStockMovement() error {
	db := database.DB

	// Always remove legacy dummy movements from the old batch-based seeder
	db.Where("ref_number LIKE ?", "GR-INIT-%").Delete(&inventoryModels.StockMovement{})

	// Check which real categories already exist
	var inCount, outCount, adjustCount int64
	db.Model(&inventoryModels.StockMovement{}).Where("ref_type = ?", "GoodsReceipt").Count(&inCount)
	db.Model(&inventoryModels.StockMovement{}).Where("ref_type = ?", "DeliveryOrder").Count(&outCount)
	db.Model(&inventoryModels.StockMovement{}).Where("ref_type = ?", "StockOpname").Count(&adjustCount)

	if inCount > 0 && outCount > 0 && adjustCount > 0 {
		log.Println("Stock movements already seeded for all categories, skipping...")
		return nil
	}

	// If any category is missing, delete all and re-seed from scratch
	// — required for correct chronological running balance across all movement types
	log.Printf("Stock movement gaps detected (IN=%d, OUT=%d, ADJUST=%d) — deleting all and re-seeding...",
		inCount, outCount, adjustCount)
	if err := db.Where("1 = 1").Delete(&inventoryModels.StockMovement{}).Error; err != nil {
		return fmt.Errorf("failed to clear stock movements for re-seed: %w", err)
	}

	log.Println("Seeding stock movements from existing relational entities...")

	adminID := AdminUserID

	// Build product cost lookup
	var products []productModels.Product
	if err := db.Find(&products).Error; err != nil {
		return fmt.Errorf("failed to fetch products: %w", err)
	}
	productCostMap := make(map[string]float64, len(products))
	for _, p := range products {
		productCostMap[p.ID] = p.CostPrice
	}

	// Build batch lookup (product+warehouse → first batch ID) for movement references
	var batches []inventoryModels.InventoryBatch
	if err := db.Where("deleted_at IS NULL").Find(&batches).Error; err != nil {
		return fmt.Errorf("failed to fetch batches: %w", err)
	}

	batchLookup := make(map[batchKey]string)
	for _, b := range batches {
		key := batchKey{ProductID: b.ProductID, WarehouseID: b.WarehouseID}
		if _, exists := batchLookup[key]; !exists {
			batchLookup[key] = b.ID
		}
	}

	var events []movementEvent

	// 1. IN movements from closed Goods Receipts
	newINCount := seedGoodsReceiptMovements(&events, productCostMap, batchLookup, batches, adminID)

	// 2. OUT movements from shipped/delivered Delivery Orders
	newOUTCount := seedDeliveryOrderMovements(&events, productCostMap, batchLookup, batches, adminID)

	// 3. ADJUST movements from posted Stock Opnames
	newADJUSTCount := seedStockOpnameMovements(&events, productCostMap, batchLookup, adminID)

	if len(events) == 0 {
		log.Println("No relational entities found to generate stock movements")
		return nil
	}

	// Sort chronologically for correct running balance calculation
	sort.Slice(events, func(i, j int) bool {
		return events[i].Date.Before(events[j].Date)
	})

	// Calculate running balance per Product+Warehouse from scratch
	balanceMap := make(map[batchKey]float64)
	var movementsToCreate []inventoryModels.StockMovement

	for _, e := range events {
		key := batchKey{ProductID: e.Details.ProductID, WarehouseID: e.Details.WarehouseID}
		current := balanceMap[key]
		current += e.Details.QtyIn - e.Details.QtyOut
		e.Details.Balance = current
		balanceMap[key] = current
		movementsToCreate = append(movementsToCreate, e.Details)
	}

	// Batch insert
	insertBatchSize := 100
	for i := 0; i < len(movementsToCreate); i += insertBatchSize {
		end := i + insertBatchSize
		if end > len(movementsToCreate) {
			end = len(movementsToCreate)
		}
		if err := db.Create(movementsToCreate[i:end]).Error; err != nil {
			return fmt.Errorf("failed to create stock movements batch: %w", err)
		}
	}

	log.Printf("Successfully seeded %d stock movements (IN=%d, OUT=%d, ADJUST=%d)",
		len(movementsToCreate), newINCount, newOUTCount, newADJUSTCount)
	return nil
}

// seedGoodsReceiptMovements creates IN movements from closed GR items
func seedGoodsReceiptMovements(events *[]movementEvent, costMap map[string]float64, batchLookup map[batchKey]string, batches []inventoryModels.InventoryBatch, adminID string) int {
	db := database.DB
	count := 0

	var receipts []purchaseModels.GoodsReceipt
	if err := db.Preload("Items").
		Where("status = ?", purchaseModels.GoodsReceiptStatusClosed).
		Find(&receipts).Error; err != nil {
		log.Printf("Warning: Failed to fetch goods receipts: %v", err)
		return 0
	}
	log.Printf("Found %d closed goods receipts for IN movements", len(receipts))

	for _, gr := range receipts {
		movementDate := gr.CreatedAt
		if gr.ReceiptDate != nil {
			movementDate = *gr.ReceiptDate
		}

		for _, item := range gr.Items {
			cost := costMap[item.ProductID]

			// Find warehouse from existing batches for this product
			warehouseID := findWarehouseForProduct(item.ProductID, batches)
			if warehouseID == "" {
				log.Printf("Warning: Skipping GR item %s — no warehouse found for product %s", item.ID, item.ProductID)
				continue
			}

			bID := batchLookup[batchKey{ProductID: item.ProductID, WarehouseID: warehouseID}]

			evt := inventoryModels.StockMovement{
				ID:           uuid.NewString(),
				Date:         movementDate,
				MovementType: inventoryModels.MovementTypeIn,
				RefType:      "GoodsReceipt",
				RefID:        gr.ID,
				RefNumber:    gr.Code,
				Source:       fmt.Sprintf("Supplier: %s", gr.SupplierNameSnapshot),
				ProductID:    item.ProductID,
				WarehouseID:  warehouseID,
				QtyIn:        item.QuantityReceived,
				QtyOut:       0,
				Cost:         cost,
				CreatedBy:    &adminID,
			}
			if bID != "" {
				evt.InventoryBatchID = &bID
			}

			*events = append(*events, movementEvent{Date: movementDate, Details: evt})
			count++
		}
	}

	return count
}

// seedDeliveryOrderMovements creates OUT movements from shipped/delivered DO items
func seedDeliveryOrderMovements(events *[]movementEvent, costMap map[string]float64, batchLookup map[batchKey]string, batches []inventoryModels.InventoryBatch, adminID string) int {
	db := database.DB
	count := 0

	var deliveryOrders []salesModels.DeliveryOrder
	if err := db.Preload("Items").
		Where("status IN ?", []salesModels.DeliveryOrderStatus{
			salesModels.DeliveryOrderStatusShipped,
			salesModels.DeliveryOrderStatusDelivered,
		}).Find(&deliveryOrders).Error; err != nil {
		log.Printf("Warning: Failed to fetch delivery orders: %v", err)
		return 0
	}
	log.Printf("Found %d shipped/delivered delivery orders for OUT movements", len(deliveryOrders))

	for _, do := range deliveryOrders {
		movementDate := do.DeliveryDate
		if do.ShippedAt != nil {
			movementDate = *do.ShippedAt
		}

		warehouseID := ""
		if do.WarehouseID != nil {
			warehouseID = *do.WarehouseID
		}

		for _, item := range do.Items {
			cost := costMap[item.ProductID]

			// Fallback: find warehouse from existing batches
			itemWarehouse := warehouseID
			if itemWarehouse == "" {
				itemWarehouse = findWarehouseForProduct(item.ProductID, batches)
			}
			if itemWarehouse == "" {
				log.Printf("Warning: Skipping DO item %s — no warehouse found", item.ID)
				continue
			}

			bID := batchLookup[batchKey{ProductID: item.ProductID, WarehouseID: itemWarehouse}]

			evt := inventoryModels.StockMovement{
				ID:           uuid.NewString(),
				Date:         movementDate,
				MovementType: inventoryModels.MovementTypeOut,
				RefType:      "DeliveryOrder",
				RefID:        do.ID,
				RefNumber:    do.Code,
				Source:       "Customer Delivery",
				ProductID:    item.ProductID,
				WarehouseID:  itemWarehouse,
				QtyIn:        0,
				QtyOut:       item.Quantity,
				Cost:         cost,
				CreatedBy:    &adminID,
			}
			if bID != "" {
				evt.InventoryBatchID = &bID
			}

			*events = append(*events, movementEvent{Date: movementDate, Details: evt})
			count++
		}
	}

	return count
}

// seedStockOpnameMovements creates ADJUST movements from posted Stock Opname items with non-zero variance
func seedStockOpnameMovements(events *[]movementEvent, costMap map[string]float64, batchLookup map[batchKey]string, adminID string) int {
	db := database.DB
	count := 0

	var opnames []opnameModels.StockOpname
	if err := db.Preload("Items").
		Where("status = ?", opnameModels.StockOpnameStatusPosted).
		Find(&opnames).Error; err != nil {
		log.Printf("Warning: Failed to fetch posted stock opnames: %v", err)
		return 0
	}
	log.Printf("Found %d posted stock opnames for ADJUST movements", len(opnames))

	for _, opname := range opnames {
		for _, item := range opname.Items {
			if item.VarianceQty == 0 || item.PhysicalQty == nil {
				continue
			}

			cost := costMap[item.ProductID]
			bID := batchLookup[batchKey{ProductID: item.ProductID, WarehouseID: opname.WarehouseID}]

			var qtyIn, qtyOut float64
			if item.VarianceQty > 0 {
				qtyIn = item.VarianceQty // Surplus
			} else {
				qtyOut = -item.VarianceQty // Shortage (stored as positive)
			}

			evt := inventoryModels.StockMovement{
				ID:           uuid.NewString(),
				Date:         opname.Date,
				MovementType: inventoryModels.MovementTypeAdjust,
				RefType:      "StockOpname",
				RefID:        opname.ID,
				RefNumber:    opname.OpnameNumber,
				Source:       fmt.Sprintf("Opname Adjustment (%s)", opname.OpnameNumber),
				ProductID:    item.ProductID,
				WarehouseID:  opname.WarehouseID,
				QtyIn:        qtyIn,
				QtyOut:       qtyOut,
				Cost:         cost,
				CreatedBy:    &adminID,
			}
			if bID != "" {
				evt.InventoryBatchID = &bID
			}

			*events = append(*events, movementEvent{Date: opname.Date, Details: evt})
			count++
		}
	}

	return count
}

// findWarehouseForProduct returns the first warehouse ID that has batches for this product
func findWarehouseForProduct(productID string, batches []inventoryModels.InventoryBatch) string {
	for _, b := range batches {
		if b.ProductID == productID {
			return b.WarehouseID
		}
	}
	return ""
}
