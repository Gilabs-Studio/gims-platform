package repositories

import (
	"context"

	"gorm.io/gorm"

	inventoryModels "github.com/gilabs/gims/api/internal/inventory/data/models"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
)

// POSCatalogProduct holds product info plus computed available stock for POS display
type POSCatalogProduct struct {
	ProductID   string
	ProductCode string
	ProductName string
	ProductKind string
	Price       float64
	Stock       float64
	ImageURL    string
	Category    string
	IsAvailable bool
}

// POSProductRepository provides product data access needed by the POS domain
type POSProductRepository interface {
	FindByID(ctx context.Context, id string) (*productModels.Product, error)
	FindByIDWithRecipe(ctx context.Context, id string) (*productModels.Product, error)
	FindPOSAvailable(ctx context.Context, warehouseID string) ([]POSCatalogProduct, error)
}

type posProductRepository struct {
	db *gorm.DB
}

// NewPOSProductRepository creates the concrete implementation
func NewPOSProductRepository(db *gorm.DB) POSProductRepository {
	return &posProductRepository{db: db}
}

func (r *posProductRepository) FindByID(ctx context.Context, id string) (*productModels.Product, error) {
	var product productModels.Product
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&product).Error
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *posProductRepository) FindByIDWithRecipe(ctx context.Context, id string) (*productModels.Product, error) {
	var product productModels.Product
	err := r.db.WithContext(ctx).
		Preload("RecipeItems").
		Where("id = ? AND deleted_at IS NULL", id).
		First(&product).Error
	if err != nil {
		return nil, err
	}
	return &product, nil
}

// FindPOSAvailable returns all POS-available products with live stock for the given warehouse.
// When warehouseID is empty, stock values are 0 (catalog only, no stock info).
func (r *posProductRepository) FindPOSAvailable(ctx context.Context, warehouseID string) ([]POSCatalogProduct, error) {
	var products []productModels.Product
	err := r.db.WithContext(ctx).
		Preload("Category").
		Where("is_pos_available = ? AND deleted_at IS NULL AND status = ? AND is_approved = ? AND is_active = ?", true, productModels.ProductStatusApproved, true, true).
		Order("name ASC").
		Find(&products).Error
	if err != nil {
		return nil, err
	}

	// Build a warehouse stock map via a single inventory_batches query
	stockMap := make(map[string]float64)
	if warehouseID != "" {
		var batches []inventoryModels.InventoryBatch
		batchErr := r.db.WithContext(ctx).
			Select("product_id, current_quantity, reserved_quantity").
			Where("warehouse_id = ? AND deleted_at IS NULL AND (expiry_date IS NULL OR expiry_date > CURRENT_TIMESTAMP)", warehouseID).
			Find(&batches).Error
		if batchErr == nil {
			for _, b := range batches {
				avail := b.CurrentQuantity - b.ReservedQuantity
				if avail < 0 {
					avail = 0
				}
				stockMap[b.ProductID] += avail
			}
		}
	}

	result := make([]POSCatalogProduct, 0, len(products))
	for _, p := range products {
		avail := stockMap[p.ID]
		categoryName := ""
		if p.Category != nil {
			categoryName = p.Category.Name
		}
		imageURL := ""
		if p.ImageURL != nil {
			imageURL = *p.ImageURL
		}
		isAvailable := false
		switch p.ProductKind {
		case productModels.ProductKindStock:
			// When a warehouse is specified, only include STOCK products that
			// are actually stocked in that warehouse (avail > 0 proves presence).
			// Without a warehouse context we show all products as a fallback catalog.
			if warehouseID != "" && avail <= 0 {
				continue
			}
			isAvailable = avail > 0
		case productModels.ProductKindRecipe, productModels.ProductKindService:
			// Recipe/Service availability is validated at order-item time, not here.
			isAvailable = true
		default:
			isAvailable = false
		}
		result = append(result, POSCatalogProduct{
			ProductID:   p.ID,
			ProductCode: p.Code,
			ProductName: p.Name,
			ProductKind: p.ProductKind,
			Price:       p.SellingPrice,
			Stock:       avail,
			ImageURL:    imageURL,
			Category:    categoryName,
			IsAvailable: isAvailable,
		})
	}
	return result, nil
}
