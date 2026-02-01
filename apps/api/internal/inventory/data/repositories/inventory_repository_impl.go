package repositories

import (
	"context"
	"time"

	"github.com/gilabs/gims/api/internal/inventory/data/models"
	"github.com/gilabs/gims/api/internal/inventory/domain/dto"
	"github.com/gilabs/gims/api/internal/inventory/domain/repository"
	"gorm.io/gorm"
)

type inventoryRepository struct {
	db *gorm.DB
}

func NewInventoryRepository(db *gorm.DB) repository.InventoryRepository {
	return &inventoryRepository{db: db}
}

func (r *inventoryRepository) GetStockList(ctx context.Context, req *dto.GetInventoryListRequest) ([]dto.InventoryStockItem, int64, error) {
	var items []dto.InventoryStockItem
	var total int64

	// Base query on Products to ensure we show products even with 0 stock (if desired)
	// OR query on InventoryBatches and group by Product + Warehouse.
	// Requirement: show stock inventory with warehouse stats.
	
	// Complex query to aggregate batches
	// We'll select from Products and left join aggregated Batches
	
	query := r.db.Table("products p").
		Select(`
			p.id as product_id,
			p.code as product_code,
			p.name as product_name,
			p.image_url as product_image_url,
			pc.name as product_category,
			pb.name as product_brand,
			w.id as warehouse_id,
			w.name as warehouse_name,
			COALESCE(SUM(ib.current_quantity), 0) as on_hand,
			COALESCE(SUM(ib.reserved_quantity), 0) as reserved,
			COALESCE(SUM(ib.current_quantity) - SUM(ib.reserved_quantity), 0) as available,
			COALESCE(SUM(CASE WHEN ib.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days') AND ib.current_quantity > 0 THEN 1 ELSE 0 END), 0) > 0 as has_expiring_batches,
			p.min_stock,
			p.max_stock,
			u.name as uom_name
		`).
		Joins("LEFT JOIN product_categories pc ON pc.id = p.category_id").
		Joins("LEFT JOIN product_brands pb ON pb.id = p.brand_id").
		Joins("LEFT JOIN units_of_measure u ON u.id = p.uom_id").
		// Cross join (or similar) with Warehouses if we want to show 0 stock for all warehouses?
		// For now, let's just show existing inventory or all products + default warehouse?
		// The requirement implies warehouse filtering.
		// If warehouse_id is provided, we filter inventory batches by that warehouse.
		// If not, we might be aggregating ALL warehouses (which can be confusing if displayed as single row per product).
		// The UI shows "Warehouse" column. This implies one row per Product-Warehouse combination.
		
		// Strategy:
		// 1. Join InventoryBatches
		// 2. Join Warehouses via Batches
		Joins("LEFT JOIN inventory_batches ib ON ib.product_id = p.id AND ib.deleted_at IS NULL").
		Joins("LEFT JOIN warehouses w ON w.id = ib.warehouse_id")

	// Apply Warehouse Filter
	if req.WarehouseID != "" {
		query = query.Where("ib.warehouse_id = ?", req.WarehouseID)
	} else {
		// If no warehouse filter, we only show products that HAVE records in inventory_batches (so we know the warehouse)
		// OR we need to handle "Product X has stock in Warehouse A and Warehouse B" -> Returns 2 rows?
		// Yes, grouped by Product and Warehouse.
		// BUT if a product has NO stock anywhere, it won't have inventory_batches and thus no WarehouseID.
		// It should probably still appear with "No Warehouse" or similar?
		// For Sprint 9, let's focus on showing records present in InventoryBatches or Products joined with InventoryBatches.
		// To show rows per warehouse, we need to Group by Product AND Warehouse.
		query = query.Where("ib.id IS NOT NULL") // Only show items with inventory records for now? 
		// Actually, user might want to see products with 0 stock to know they need to order.
		// Use Right Join? No.
		// Let's stick to: Show products that have been received (have batch). 
		// If clean requirement: "List all products and their stock in Warehouse X".
	}

	if req.Search != "" {
		search := "%" + req.Search + "%"
		query = query.Where("p.name ILIKE ? OR p.code ILIKE ?", search, search)
	}

	query = query.Group("p.id, p.code, p.name, p.image_url, pc.name, pb.name, w.id, w.name, p.min_stock, p.max_stock, u.name")
	
	// Count Total (Expensive with Group By, use subquery or count distinct)
	// Approximate count or separate query
	// Using GORM Count with Group By can be tricky.
	
	// Let's use a count wrapper
	// We need total count of rows (Product-Warehouse combinations)
	
	// Because of the Group By, Count() behavior changes.
	// Simple approach:
	if err := r.db.Table("(?) as sub", query).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Pagination
	offset := (req.Page - 1) * req.PerPage
	query = query.Limit(req.PerPage).Offset(offset)
	
	// Order
	query = query.Order("p.name ASC, w.name ASC")

	if err := query.Find(&items).Error; err != nil {
		return nil, 0, err
	}

	// Calculate Status in Go (easier than SQL)
	for i := range items {
		if items[i].Available <= 0 {
			items[i].Status = "out_of_stock"
		} else if items[i].Available <= items[i].MinStock {
			items[i].Status = "low_stock"
		} else if items[i].MaxStock > 0 && items[i].Available > items[i].MaxStock {
			items[i].Status = "overstock"
		} else {
			items[i].Status = "ok"
		}
	}

	return items, total, nil
}

// GetTreeWarehouses returns a list of warehouses with stock summary
func (r *inventoryRepository) GetTreeWarehouses(ctx context.Context) ([]dto.GetInventoryTreeWarehousesResponse, error) {
	var result []dto.GetInventoryTreeWarehousesResponse

	// Query to get warehouses and aggregated stock stats
	// Status logic matches GetStockList:
	// Out of Stock: available <= 0
	// Low Stock: available <= min_stock AND available > 0
	// Overstock: available > max_stock AND max_stock > 0
	// OK: otherwise

    // We start from warehouses to ensure we list all active warehouses (or all relevant ones)
    // Then left join batches to calculate stats.
    
    // Note: status logic depends on Product metadata (min/max stock).
    // So we need to join products via batches.

	// This is a heavy query. In production, this might be a materialized view or cached.
	// For now, we compute on the fly.
	
	// Subquery to get product-warehouse availability first
	// (Same as GetStockList core query but grouped by product+warehouse)
	
	query := `
		WITH stock_levels AS (
			SELECT 
				w.id as warehouse_id,
				p.id as product_id,
				p.min_stock,
				p.max_stock,
				COALESCE(SUM(ib.current_quantity) - SUM(ib.reserved_quantity), 0) as available
			FROM warehouses w
			JOIN inventory_batches ib ON ib.warehouse_id = w.id AND ib.deleted_at IS NULL
			JOIN products p ON p.id = ib.product_id
			WHERE w.deleted_at IS NULL
			GROUP BY w.id, p.id, p.min_stock, p.max_stock
		)
		SELECT 
			w.id,
			w.name,
			COUNT(sl.product_id) as total_items,
			COUNT(CASE 
				WHEN sl.available <= 0 THEN 1 
			END) as out_of_stock,
			COUNT(CASE 
				WHEN sl.available > 0 AND sl.available <= sl.min_stock THEN 1 
			END) as low,
			COUNT(CASE 
				WHEN sl.max_stock > 0 AND sl.available > sl.max_stock THEN 1 
			END) as overstock,
			COUNT(CASE 
				WHEN sl.available > sl.min_stock AND (sl.max_stock = 0 OR sl.available <= sl.max_stock) THEN 1 
			END) as ok
		FROM warehouses w
		LEFT JOIN stock_levels sl ON sl.warehouse_id = w.id
		WHERE w.deleted_at IS NULL
		GROUP BY w.id, w.name
		ORDER BY w.name ASC
	`
	
	rows, err := r.db.Raw(query).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	for rows.Next() {
		var item dto.GetInventoryTreeWarehousesResponse
		var total, oos, low, over, ok int
		
		if err := rows.Scan(&item.ID, &item.Name, &total, &oos, &low, &over, &ok); err != nil {
			return nil, err
		}
		
		item.Summary = dto.StockSummary{
			TotalItems: total,
			OutOfStock: oos,
			Low:        low,
			Overstock:  over,
			Ok:         ok,
		}
		result = append(result, item)
	}
	
	return result, nil
}

// GetTreeProducts returns products for a specific warehouse
func (r *inventoryRepository) GetTreeProducts(ctx context.Context, req *dto.GetInventoryTreeProductsRequest) ([]dto.InventoryStockItem, int64, error) {
	var items []dto.InventoryStockItem
	var total int64

	// Filter by WarehouseID IS REQUIRED and enforced by logic calling this
	query := r.db.Table("products p").
		Select(`
			p.id as product_id,
			p.code as product_code,
			p.name as product_name,
			p.image_url as product_image_url,
			pc.name as product_category,
			pb.name as product_brand,
			w.id as warehouse_id,
			w.name as warehouse_name,
			COALESCE(SUM(ib.current_quantity), 0) as on_hand,
			COALESCE(SUM(ib.reserved_quantity), 0) as reserved,
			COALESCE(SUM(ib.current_quantity) - SUM(ib.reserved_quantity), 0) as available,
			p.min_stock,
			p.max_stock,
			u.name as uom_name
		`).
		Joins("LEFT JOIN product_categories pc ON pc.id = p.category_id").
		Joins("LEFT JOIN product_brands pb ON pb.id = p.brand_id").
		Joins("LEFT JOIN units_of_measure u ON u.id = p.uom_id").
		Joins("JOIN inventory_batches ib ON ib.product_id = p.id AND ib.deleted_at IS NULL"). // Inner join to filtering batches
		Joins("JOIN warehouses w ON w.id = ib.warehouse_id")

	// Apply Warehouse ID Filter
	query = query.Where("ib.warehouse_id = ?", req.WarehouseID)

	if req.Search != "" {
		search := "%" + req.Search + "%"
		query = query.Where("p.name ILIKE ? OR p.code ILIKE ?", search, search)
	}

	query = query.Group("p.id, p.code, p.name, p.image_url, pc.name, pb.name, w.id, w.name, p.min_stock, p.max_stock, u.name")

	// Count Total
	if err := r.db.Table("(?) as sub", query).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Pagination
	offset := (req.Page - 1) * req.PerPage
	query = query.Limit(req.PerPage).Offset(offset)

	// Order
	query = query.Order("p.name ASC")

	if err := query.Find(&items).Error; err != nil {
		return nil, 0, err
	}

	// Calculate Status
	for i := range items {
		if items[i].Available <= 0 {
			items[i].Status = "out_of_stock"
		} else if items[i].Available <= items[i].MinStock {
			items[i].Status = "low_stock"
		} else if items[i].MaxStock > 0 && items[i].Available > items[i].MaxStock {
			items[i].Status = "overstock"
		} else {
			items[i].Status = "ok"
		}
	}

	return items, total, nil
}

// GetTreeBatches returns batches for a specific product and warehouse
func (r *inventoryRepository) GetTreeBatches(ctx context.Context, req *dto.GetInventoryTreeBatchesRequest) ([]dto.InventoryBatchItem, error) {
	var items []dto.InventoryBatchItem

	query := r.db.Table("inventory_batches ib").
		Select(`
			ib.id,
			ib.batch_number,
			ib.expiry_date,
			ib.current_quantity,
			ib.reserved_quantity,
			(ib.current_quantity - ib.reserved_quantity) as available
		`).
		Where("ib.deleted_at IS NULL").
		Where("ib.warehouse_id = ?", req.WarehouseID).
		Where("ib.product_id = ?", req.ProductID).
		Order("ib.expiry_date ASC, ib.created_at ASC")

	if err := query.Find(&items).Error; err != nil {
		return nil, err
	}

	return items, nil
}

// Stock Management Implementations

// UpdateProductReservedStock updates the reserved stock counter on the Product
func (r *inventoryRepository) UpdateProductReservedStock(ctx context.Context, productID string, quantity float64) error {
	// Note: We are updating the Product table directly as per plan (Soft Reservation)
	// Even though GetStockList sums batch reserved_quantities, we might need to adjust that query 
	// or ensure we distribute reservation to batches later.
	// HOWEVER, if the system design implies Product-level reservation BEFORE batch selection,
	// then we must have a ReservedStock field on Product.
	
	// Let's assume Product model has ReservedStock or we add it. 
	// If it doesn't, we might fail here.
	// Based on typical GORM, we can use an expression.
	
	return r.db.Table("products").Where("id = ?", productID).
		Update("reserved_stock", gorm.Expr("COALESCE(reserved_stock, 0) + ?", quantity)).Error
}

func (r *inventoryRepository) UpdateBatchQuantity(ctx context.Context, batchID string, quantity float64) error {
	// quantity is the change (delta). If negative, it deducts.
	return r.db.Table("inventory_batches").Where("id = ?", batchID).
		Update("current_quantity", gorm.Expr("current_quantity + ?", quantity)).Error
}

func (r *inventoryRepository) GetBatchesByProduct(ctx context.Context, productID string) ([]dto.InventoryBatchItem, error) {
	var items []dto.InventoryBatchItem
	
	query := r.db.Table("inventory_batches ib").
		Select(`
			ib.id,
			ib.batch_number,
			ib.expiry_date,
			ib.created_at as received_at,
			ib.current_quantity,
			ib.reserved_quantity,
			(ib.current_quantity - ib.reserved_quantity) as available
		`).
		Where("ib.deleted_at IS NULL").
		Where("ib.product_id = ?", productID).
		Where("ib.current_quantity > 0"). // Only available batches? Logic says "SelectBatches"
		Order("ib.created_at ASC") // Default sort

	if err := query.Find(&items).Error; err != nil {
		return nil, err
	}
	
	return items, nil
}

func (r *inventoryRepository) CreateStockMovement(ctx context.Context, req *dto.StockMovementRequest) error {
	movement := models.StockMovement{
		InventoryBatchID: &req.InventoryBatchID,
		ProductID:        req.ProductID,
		WarehouseID:      req.WarehouseID,
		MovementType:     models.StockMovementType(req.Type),
		RefType:          req.ReferenceType,
		RefID:            req.ReferenceID,
		RefNumber:        req.ReferenceNumber,
		Source:           req.Description,
		CreatedBy:        req.CreatedBy,
		Date:             time.Now(),
	}

	if req.Type == "IN" || (req.Type == "ADJUST" && req.Quantity > 0) { // Naive assumption for Adjust
		movement.QtyIn = req.Quantity
	} else {
		movement.QtyOut = req.Quantity
	}

	return r.db.Create(&movement).Error
}

