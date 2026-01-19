package repositories

import (
	"context"

	"github.com/gilabs/crm-healthcare/api/internal/product/data/models"
	"gorm.io/gorm"
)

// ProductListParams extends ListParams with product-specific filters
type ProductListParams struct {
	ListParams
	CategoryID        string
	BrandID           string
	SegmentID         string
	TypeID            string
	SupplierID        string
	Status            string
	IsApproved        *bool
}

// ProductRepository defines the interface for product data access
type ProductRepository interface {
	Create(ctx context.Context, product *models.Product) error
	FindByID(ctx context.Context, id string) (*models.Product, error)
	List(ctx context.Context, params ProductListParams) ([]models.Product, int64, error)
	Update(ctx context.Context, product *models.Product) error
	Delete(ctx context.Context, id string) error
}

type productRepository struct {
	db *gorm.DB
}

// NewProductRepository creates a new instance of ProductRepository
func NewProductRepository(db *gorm.DB) ProductRepository {
	return &productRepository{db: db}
}

func (r *productRepository) Create(ctx context.Context, product *models.Product) error {
	return r.db.WithContext(ctx).Create(product).Error
}

func (r *productRepository) FindByID(ctx context.Context, id string) (*models.Product, error) {
	var product models.Product
	err := r.db.WithContext(ctx).
		Preload("Category").
		Preload("Brand").
		Preload("Segment").
		Preload("Type").
		Preload("Uom").
		Preload("PurchaseUom").
		Preload("Packaging").
		Preload("ProcurementType").
		Preload("Supplier").
		Preload("BusinessUnit").
		First(&product, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *productRepository) List(ctx context.Context, params ProductListParams) ([]models.Product, int64, error) {
	var products []models.Product
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Product{})

	// Apply search filter
	if params.Search != "" {
		search := "%" + params.Search + "%"
		query = query.Where("name ILIKE ? OR code ILIKE ? OR barcode ILIKE ? OR sku ILIKE ?", search, search, search, search)
	}

	// Apply filters
	if params.CategoryID != "" {
		query = query.Where("category_id = ?", params.CategoryID)
	}
	if params.BrandID != "" {
		query = query.Where("brand_id = ?", params.BrandID)
	}
	if params.SegmentID != "" {
		query = query.Where("segment_id = ?", params.SegmentID)
	}
	if params.TypeID != "" {
		query = query.Where("type_id = ?", params.TypeID)
	}
	if params.SupplierID != "" {
		query = query.Where("supplier_id = ?", params.SupplierID)
	}
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}
	if params.IsApproved != nil {
		query = query.Where("is_approved = ?", *params.IsApproved)
	}

	// Count total before pagination
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply sorting
	if params.SortBy != "" {
		order := params.SortBy
		if params.SortDir == "desc" {
			order += " DESC"
		} else {
			order += " ASC"
		}
		query = query.Order(order)
	} else {
		query = query.Order("name ASC")
	}

	// Apply pagination
	if params.Limit > 0 {
		query = query.Limit(params.Limit)
	}
	if params.Offset > 0 {
		query = query.Offset(params.Offset)
	}

	// Preload relations
	query = query.
		Preload("Category").
		Preload("Brand").
		Preload("Segment").
		Preload("Type").
		Preload("Uom").
		Preload("PurchaseUom").
		Preload("Packaging").
		Preload("ProcurementType").
		Preload("Supplier").
		Preload("BusinessUnit")

	if err := query.Find(&products).Error; err != nil {
		return nil, 0, err
	}

	return products, total, nil
}

func (r *productRepository) Update(ctx context.Context, product *models.Product) error {
	return r.db.WithContext(ctx).Save(product).Error
}

func (r *productRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.Product{}, "id = ?", id).Error
}
