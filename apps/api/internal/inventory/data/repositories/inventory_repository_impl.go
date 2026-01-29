package repositories

import (
	"context"

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
