package repositories

import (
	"context"

	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/database"
	"github.com/gilabs/crm-healthcare/api/internal/sales/data/models"
	"github.com/gilabs/crm-healthcare/api/internal/sales/domain/dto"
	"gorm.io/gorm"
)

// SalesOrderRepository defines the interface for sales order data access
type SalesOrderRepository interface {
	FindByID(ctx context.Context, id string) (*models.SalesOrder, error)
	FindByCode(ctx context.Context, code string) (*models.SalesOrder, error)
	List(ctx context.Context, req *dto.ListSalesOrdersRequest) ([]models.SalesOrder, int64, error)
	ListItems(ctx context.Context, orderID string, req *dto.ListSalesOrderItemsRequest) ([]models.SalesOrderItem, int64, error)
	Create(ctx context.Context, so *models.SalesOrder) error
	Update(ctx context.Context, so *models.SalesOrder) error
	Delete(ctx context.Context, id string) error
	GetNextOrderNumber(ctx context.Context, prefix string) (string, error)
	UpdateStatus(ctx context.Context, id string, status models.SalesOrderStatus, userID *string, reason *string) error
	ReserveStock(ctx context.Context, orderID string) error
	ReleaseStock(ctx context.Context, orderID string) error
}

type salesOrderRepository struct {
	db *gorm.DB
}

// NewSalesOrderRepository creates a new SalesOrderRepository
func NewSalesOrderRepository(db *gorm.DB) SalesOrderRepository {
	return &salesOrderRepository{db: db}
}

func (r *salesOrderRepository) getDB(ctx context.Context) *gorm.DB {
	return database.GetDB(ctx, r.db)
}

func (r *salesOrderRepository) FindByID(ctx context.Context, id string) (*models.SalesOrder, error) {
	var order models.SalesOrder
	err := r.getDB(ctx).
		Preload("SalesQuotation").
		Preload("PaymentTerms").
		Preload("SalesRep").
		Preload("BusinessUnit").
		Preload("BusinessType").
		Preload("DeliveryArea").
		Preload("Items.Product").
		Where("id = ?", id).
		First(&order).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *salesOrderRepository) FindByCode(ctx context.Context, code string) (*models.SalesOrder, error) {
	var order models.SalesOrder
	err := r.getDB(ctx).
		Preload("SalesQuotation").
		Preload("PaymentTerms").
		Preload("SalesRep").
		Preload("BusinessUnit").
		Preload("BusinessType").
		Preload("DeliveryArea").
		Preload("Items.Product").
		Where("code = ?", code).
		First(&order).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *salesOrderRepository) List(ctx context.Context, req *dto.ListSalesOrdersRequest) ([]models.SalesOrder, int64, error) {
	var orders []models.SalesOrder
	var total int64

	query := r.getDB(ctx).Model(&models.SalesOrder{})

	// Apply search filter
	if req.Search != "" {
		search := "%" + req.Search + "%"
		query = query.Where("code ILIKE ? OR notes ILIKE ?", search, search)
	}

	// Apply status filter
	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}

	// Apply date range filter
	if req.DateFrom != "" {
		query = query.Where("order_date >= ?", req.DateFrom)
	}
	if req.DateTo != "" {
		query = query.Where("order_date <= ?", req.DateTo)
	}

	// Apply sales rep filter
	if req.SalesRepID != "" {
		query = query.Where("sales_rep_id = ?", req.SalesRepID)
	}

	// Apply business unit filter
	if req.BusinessUnitID != "" {
		query = query.Where("business_unit_id = ?", req.BusinessUnitID)
	}

	// Apply quotation filter
	if req.SalesQuotationID != "" {
		query = query.Where("sales_quotation_id = ?", req.SalesQuotationID)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	// Apply sorting
	sortBy := req.SortBy
	if sortBy == "" {
		sortBy = "order_date"
	}
	sortDir := req.SortDir
	if sortDir == "" {
		sortDir = "desc"
	}
	query = query.Order(sortBy + " " + sortDir)

	// Execute query with preloads
	err := query.
		Preload("SalesQuotation").
		Preload("PaymentTerms").
		Preload("SalesRep").
		Preload("BusinessUnit").
		Preload("BusinessType").
		Preload("DeliveryArea").
		Limit(perPage).
		Offset(offset).
		Find(&orders).Error
	if err != nil {
		return nil, 0, err
	}

	return orders, total, nil
}

func (r *salesOrderRepository) Create(ctx context.Context, so *models.SalesOrder) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		// Create order
		if err := tx.Create(so).Error; err != nil {
			return err
		}

		// Create items
		if len(so.Items) > 0 {
			for i := range so.Items {
				so.Items[i].SalesOrderID = so.ID
				if err := tx.Create(&so.Items[i]).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

func (r *salesOrderRepository) Update(ctx context.Context, so *models.SalesOrder) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		// Update order
		if err := tx.Save(so).Error; err != nil {
			return err
		}

		// Delete existing items
		if err := tx.Where("sales_order_id = ?", so.ID).Delete(&models.SalesOrderItem{}).Error; err != nil {
			return err
		}

		// Create new items
		if len(so.Items) > 0 {
			for i := range so.Items {
				so.Items[i].SalesOrderID = so.ID
				if err := tx.Create(&so.Items[i]).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

func (r *salesOrderRepository) Delete(ctx context.Context, id string) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete items first (CASCADE should handle this, but explicit for safety)
		if err := tx.Where("sales_order_id = ?", id).Delete(&models.SalesOrderItem{}).Error; err != nil {
			return err
		}

		// Delete order
		return tx.Delete(&models.SalesOrder{}, "id = ?", id).Error
	})
}

func (r *salesOrderRepository) GetNextOrderNumber(ctx context.Context, prefix string) (string, error) {
	var lastOrder models.SalesOrder
	var sequence int

	// Find the last order with the same prefix
	err := r.getDB(ctx).
		Where("code LIKE ?", prefix+"%").
		Order("code DESC").
		First(&lastOrder).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// No previous order, start from 1
			sequence = 1
		} else {
			return "", err
		}
	} else {
		// Extract sequence number from last code
		var count int64
		r.getDB(ctx).Model(&models.SalesOrder{}).
			Where("code LIKE ?", prefix+"%").
			Count(&count)
		sequence = int(count) + 1
	}

	// Generate new code: PREFIX-YYYYMMDD-XXXX
	now := database.GetDB(ctx, r.db).NowFunc()
	dateStr := now.Format("20060102")
	
	// Format sequence with 4 digits
	code := prefix + "-" + dateStr + "-" + formatSequence(sequence)
	
	return code, nil
}

func (r *salesOrderRepository) UpdateStatus(ctx context.Context, id string, status models.SalesOrderStatus, userID *string, reason *string) error {
	updates := map[string]interface{}{
		"status": status,
	}

	switch status {
	case models.SalesOrderStatusConfirmed:
		updates["confirmed_by"] = userID
		updates["confirmed_at"] = database.GetDB(ctx, r.db).NowFunc()
	case models.SalesOrderStatusCancelled:
		updates["cancelled_by"] = userID
		updates["cancelled_at"] = database.GetDB(ctx, r.db).NowFunc()
		if reason != nil {
			updates["cancellation_reason"] = *reason
		}
	}

	return r.getDB(ctx).Model(&models.SalesOrder{}).
		Where("id = ?", id).
		Updates(updates).Error
}

// ReserveStock reserves stock for order items (placeholder - will be implemented with InventoryBatch)
func (r *salesOrderRepository) ReserveStock(ctx context.Context, orderID string) error {
	// TODO: Implement stock reservation logic with InventoryBatch
	// For now, just mark as reserved
	return r.getDB(ctx).Model(&models.SalesOrder{}).
		Where("id = ?", orderID).
		Update("reserved_stock", true).Error
}

// ReleaseStock releases reserved stock for order items
func (r *salesOrderRepository) ReleaseStock(ctx context.Context, orderID string) error {
	// TODO: Implement stock release logic
	// For now, just mark as not reserved
	return r.getDB(ctx).Model(&models.SalesOrder{}).
		Where("id = ?", orderID).
		Update("reserved_stock", false).Error
}

// ListItems retrieves order items with pagination
func (r *salesOrderRepository) ListItems(ctx context.Context, orderID string, req *dto.ListSalesOrderItemsRequest) ([]models.SalesOrderItem, int64, error) {
	var items []models.SalesOrderItem
	var total int64

	// Set defaults
	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	// Count total items
	if err := r.getDB(ctx).Model(&models.SalesOrderItem{}).
		Where("sales_order_id = ?", orderID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Fetch paginated items with minimal preload (only product info)
	offset := (page - 1) * perPage
	err := r.getDB(ctx).
		Preload("Product", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "code", "name", "selling_price", "image_url")
		}).
		Where("sales_order_id = ?", orderID).
		Order("created_at ASC").
		Limit(perPage).
		Offset(offset).
		Find(&items).Error
	
	if err != nil {
		return nil, 0, err
	}

	return items, total, nil
}
