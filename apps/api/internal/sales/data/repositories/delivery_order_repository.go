package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/sales/data/models"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	"gorm.io/gorm"
)

// DeliveryOrderRepository defines the interface for delivery order data access
type DeliveryOrderRepository interface {
	FindByID(ctx context.Context, id string) (*models.DeliveryOrder, error)
	FindByCode(ctx context.Context, code string) (*models.DeliveryOrder, error)
	List(ctx context.Context, req *dto.ListDeliveryOrdersRequest) ([]models.DeliveryOrder, int64, error)
	ListItems(ctx context.Context, deliveryOrderID string, req *dto.ListDeliveryOrderItemsRequest) ([]models.DeliveryOrderItem, int64, error)
	Create(ctx context.Context, do *models.DeliveryOrder) error
	Update(ctx context.Context, do *models.DeliveryOrder) error
	Delete(ctx context.Context, id string) error
	GetNextDeliveryNumber(ctx context.Context, prefix string) (string, error)
	UpdateStatus(ctx context.Context, id string, status models.DeliveryOrderStatus, userID *string, reason *string) error
	Ship(ctx context.Context, id string, userID *string, trackingNumber string) error
	Deliver(ctx context.Context, id string, userID *string, receiverSignature string, receiverName string) error
}

type deliveryOrderRepository struct {
	db *gorm.DB
}

// NewDeliveryOrderRepository creates a new DeliveryOrderRepository
func NewDeliveryOrderRepository(db *gorm.DB) DeliveryOrderRepository {
	return &deliveryOrderRepository{db: db}
}

func (r *deliveryOrderRepository) getDB(ctx context.Context) *gorm.DB {
	return database.GetDB(ctx, r.db)
}

func (r *deliveryOrderRepository) FindByID(ctx context.Context, id string) (*models.DeliveryOrder, error) {
	var deliveryOrder models.DeliveryOrder
	err := r.getDB(ctx).
		Preload("Warehouse").
		Preload("SalesOrder").
		Preload("DeliveredBy").
		Preload("CourierAgency").
		Preload("Items.Product").
		Preload("Items.SalesOrderItem").
		Preload("Items.InventoryBatch").
		Where("id = ?", id).
		First(&deliveryOrder).Error
	if err != nil {
		return nil, err
	}
	return &deliveryOrder, nil
}

func (r *deliveryOrderRepository) FindByCode(ctx context.Context, code string) (*models.DeliveryOrder, error) {
	var deliveryOrder models.DeliveryOrder
	err := r.getDB(ctx).
		Preload("Warehouse").
		Preload("SalesOrder").
		Preload("DeliveredBy").
		Preload("CourierAgency").
		Preload("Items.Product").
		Preload("Items.SalesOrderItem").
		Preload("Items.InventoryBatch").
		Where("code = ?", code).
		First(&deliveryOrder).Error
	if err != nil {
		return nil, err
	}
	return &deliveryOrder, nil
}

func (r *deliveryOrderRepository) List(ctx context.Context, req *dto.ListDeliveryOrdersRequest) ([]models.DeliveryOrder, int64, error) {
	var deliveryOrders []models.DeliveryOrder
	var total int64

	query := r.getDB(ctx).Model(&models.DeliveryOrder{})

	// Apply search filter
	if req.Search != "" {
		search := "%" + req.Search + "%"
		query = query.Where("code ILIKE ? OR tracking_number ILIKE ? OR notes ILIKE ?", search, search, search)
	}

	// Apply status filter
	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}

	// Apply date range filter
	if req.DateFrom != "" {
		query = query.Where("delivery_date >= ?", req.DateFrom)
	}
	if req.DateTo != "" {
		query = query.Where("delivery_date <= ?", req.DateTo)
	}

	// Apply sales order filter
	if req.SalesOrderID != "" {
		query = query.Where("sales_order_id = ?", req.SalesOrderID)
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
		sortBy = "delivery_date"
	}
	sortDir := req.SortDir
	if sortDir == "" {
		sortDir = "desc"
	}
	query = query.Order(sortBy + " " + sortDir)

	// Execute query with preloads
	err := query.
		Preload("Warehouse").
		Preload("SalesOrder").
		Preload("DeliveredBy").
		Preload("CourierAgency").
		Limit(perPage).
		Offset(offset).
		Find(&deliveryOrders).Error
	if err != nil {
		return nil, 0, err
	}

	return deliveryOrders, total, nil
}

func (r *deliveryOrderRepository) Create(ctx context.Context, do *models.DeliveryOrder) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		// Create delivery order
		if err := tx.Create(do).Error; err != nil {
			return err
		}



		return nil
	})
}

func (r *deliveryOrderRepository) Update(ctx context.Context, do *models.DeliveryOrder) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		// Update delivery order (exclude items to avoid conflict with manual management below)
		if err := tx.Omit("Items").Save(do).Error; err != nil {
			return err
		}

		// Delete existing items
		if err := tx.Where("delivery_order_id = ?", do.ID).Delete(&models.DeliveryOrderItem{}).Error; err != nil {
			return err
		}

		// Create new items
		if len(do.Items) > 0 {
			for i := range do.Items {
				do.Items[i].DeliveryOrderID = do.ID
				if err := tx.Create(&do.Items[i]).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

func (r *deliveryOrderRepository) Delete(ctx context.Context, id string) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete items first (CASCADE should handle this, but explicit for safety)
		if err := tx.Where("delivery_order_id = ?", id).Delete(&models.DeliveryOrderItem{}).Error; err != nil {
			return err
		}

		// Delete delivery order
		return tx.Delete(&models.DeliveryOrder{}, "id = ?", id).Error
	})
}

func (r *deliveryOrderRepository) GetNextDeliveryNumber(ctx context.Context, prefix string) (string, error) {
	var lastDeliveryOrder models.DeliveryOrder
	var sequence int

	// Find the last delivery order with the same prefix
	err := r.getDB(ctx).
		Where("code LIKE ?", prefix+"%").
		Order("code DESC").
		First(&lastDeliveryOrder).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// No previous delivery order, start from 1
			sequence = 1
		} else {
			return "", err
		}
	} else {
		// Extract sequence number from last code
		var count int64
		r.getDB(ctx).Model(&models.DeliveryOrder{}).
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

func (r *deliveryOrderRepository) UpdateStatus(ctx context.Context, id string, status models.DeliveryOrderStatus, userID *string, reason *string) error {
	updates := map[string]interface{}{
		"status": status,
	}

	switch status {
	case models.DeliveryOrderStatusCancelled:
		updates["cancelled_by"] = userID
		updates["cancelled_at"] = database.GetDB(ctx, r.db).NowFunc()
		if reason != nil {
			updates["cancellation_reason"] = *reason
		}
	}

	return r.getDB(ctx).Model(&models.DeliveryOrder{}).
		Where("id = ?", id).
		Updates(updates).Error
}

func (r *deliveryOrderRepository) Ship(ctx context.Context, id string, userID *string, trackingNumber string) error {
	now := database.GetDB(ctx, r.db).NowFunc()
	updates := map[string]interface{}{
		"status":         models.DeliveryOrderStatusShipped,
		"shipped_by":     userID,
		"shipped_at":     now,
		"tracking_number": trackingNumber,
	}

	return r.getDB(ctx).Model(&models.DeliveryOrder{}).
		Where("id = ?", id).
		Updates(updates).Error
}

func (r *deliveryOrderRepository) Deliver(ctx context.Context, id string, userID *string, receiverSignature string, receiverName string) error {
	now := database.GetDB(ctx, r.db).NowFunc()
	updates := map[string]interface{}{
		"status":            models.DeliveryOrderStatusDelivered,
		"delivered_at":      now,
		"receiver_signature": receiverSignature,
		"receiver_name":      receiverName,
	}

	return r.getDB(ctx).Model(&models.DeliveryOrder{}).
		Where("id = ?", id).
		Updates(updates).Error
}

// ListItems retrieves delivery order items with pagination
func (r *deliveryOrderRepository) ListItems(ctx context.Context, deliveryOrderID string, req *dto.ListDeliveryOrderItemsRequest) ([]models.DeliveryOrderItem, int64, error) {
	var items []models.DeliveryOrderItem
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
	if err := r.getDB(ctx).Model(&models.DeliveryOrderItem{}).
		Where("delivery_order_id = ?", deliveryOrderID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Fetch paginated items with minimal preload (only product info)
	offset := (page - 1) * perPage
	err := r.getDB(ctx).
		Preload("Product", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "code", "name", "selling_price", "image_url")
		}).
		Preload("SalesOrderItem").
		Preload("InventoryBatch").
		Where("delivery_order_id = ?", deliveryOrderID).
		Order("created_at ASC").
		Limit(perPage).
		Offset(offset).
		Find(&items).Error
	
	if err != nil {
		return nil, 0, err
	}

	return items, total, nil
}
