package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	"github.com/gilabs/gims/api/internal/sales/data/models"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	"gorm.io/gorm"
)

// CustomerInvoiceRepository defines the interface for customer invoice data access
type CustomerInvoiceRepository interface {
	FindByID(ctx context.Context, id string) (*models.CustomerInvoice, error)
	FindByCode(ctx context.Context, code string) (*models.CustomerInvoice, error)
	List(ctx context.Context, req *dto.ListCustomerInvoicesRequest) ([]models.CustomerInvoice, int64, error)
	ListItems(ctx context.Context, invoiceID string, req *dto.ListCustomerInvoiceItemsRequest) ([]models.CustomerInvoiceItem, int64, error)
	Create(ctx context.Context, invoice *models.CustomerInvoice) error
	Update(ctx context.Context, invoice *models.CustomerInvoice) error
	Delete(ctx context.Context, id string) error
	GetNextInvoiceNumber(ctx context.Context, prefix string) (string, error)
	UpdateStatus(ctx context.Context, id string, status models.CustomerInvoiceStatus, paidAmount *float64, paymentAt *time.Time, userID *string) error
}

type customerInvoiceRepository struct {
	db *gorm.DB
}

// NewCustomerInvoiceRepository creates a new CustomerInvoiceRepository
func NewCustomerInvoiceRepository(db *gorm.DB) CustomerInvoiceRepository {
	return &customerInvoiceRepository{db: db}
}

func (r *customerInvoiceRepository) getDB(ctx context.Context) *gorm.DB {
	return database.GetDB(ctx, r.db)
}

func (r *customerInvoiceRepository) FindByID(ctx context.Context, id string) (*models.CustomerInvoice, error) {
	var invoice models.CustomerInvoice
	err := r.getDB(ctx).
		Preload("PaymentTerms").
		Preload("SalesOrder").
		Preload("DeliveryOrder").
		Preload("DownPaymentInvoice").
		Preload("Items.Product").
		Where("id = ?", id).
		First(&invoice).Error
	if err != nil {
		return nil, err
	}
	return &invoice, nil
}

func (r *customerInvoiceRepository) FindByCode(ctx context.Context, code string) (*models.CustomerInvoice, error) {
	var invoice models.CustomerInvoice
	err := r.getDB(ctx).
		Preload("PaymentTerms").
		Preload("SalesOrder").
		Preload("DeliveryOrder").
		Preload("Items.Product").
		Where("code = ?", code).
		First(&invoice).Error
	if err != nil {
		return nil, err
	}
	return &invoice, nil
}

func (r *customerInvoiceRepository) List(ctx context.Context, req *dto.ListCustomerInvoicesRequest) ([]models.CustomerInvoice, int64, error) {
	var invoices []models.CustomerInvoice
	var total int64

	query := r.getDB(ctx).Model(&models.CustomerInvoice{})

	// Apply scope-based data filtering (OWN/DIVISION/AREA/ALL)
	query = security.ApplyScopeFilter(query, ctx, security.DefaultScopeQueryOptions())

	// Apply search filter
	if req.Search != "" {
		search := "%" + req.Search + "%"
		query = query.Where("code ILIKE ? OR invoice_number ILIKE ? OR notes ILIKE ?", search, search, search)
	}

	// Apply status filter
	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}

	// Apply type filter
	if req.Type != "" {
		query = query.Where("type = ?", req.Type)
	}

	// Apply date range filter
	if req.DateFrom != "" {
		query = query.Where("invoice_date >= ?", req.DateFrom)
	}
	if req.DateTo != "" {
		query = query.Where("invoice_date <= ?", req.DateTo)
	}

	// Apply due date range filter
	if req.DueDateFrom != "" {
		query = query.Where("due_date >= ?", req.DueDateFrom)
	}
	if req.DueDateTo != "" {
		query = query.Where("due_date <= ?", req.DueDateTo)
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
		sortBy = "invoice_date"
	}
	sortDir := req.SortDir
	if sortDir == "" {
		sortDir = "desc"
	}
	query = query.Order(sortBy + " " + sortDir)

	// Execute query with preloads
	err := query.
		Preload("PaymentTerms").
		Preload("SalesOrder").
		Preload("DownPaymentInvoice").
		Limit(perPage).
		Offset(offset).
		Find(&invoices).Error
	if err != nil {
		return nil, 0, err
	}

	return invoices, total, nil
}

func (r *customerInvoiceRepository) Create(ctx context.Context, invoice *models.CustomerInvoice) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		// Store items temporarily
		items := invoice.Items
		invoice.Items = nil

		// Create invoice without items
		if err := tx.Create(invoice).Error; err != nil {
			return err
		}

		// Create items with the invoice ID
		if len(items) > 0 {
			for i := range items {
				items[i].CustomerInvoiceID = invoice.ID
				if err := tx.Create(&items[i]).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

func (r *customerInvoiceRepository) Update(ctx context.Context, invoice *models.CustomerInvoice) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		// Update invoice WITHOUT associations
		if err := tx.Omit("Items").Save(invoice).Error; err != nil {
			return err
		}

		// Delete existing items
		if err := tx.Where("customer_invoice_id = ?", invoice.ID).Delete(&models.CustomerInvoiceItem{}).Error; err != nil {
			return err
		}

		// Create new items
		if len(invoice.Items) > 0 {
			for i := range invoice.Items {
				invoice.Items[i].CustomerInvoiceID = invoice.ID
				invoice.Items[i].CreatedAt = time.Now()
				invoice.Items[i].UpdatedAt = time.Now()
				if err := tx.Create(&invoice.Items[i]).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

func (r *customerInvoiceRepository) Delete(ctx context.Context, id string) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete items first
		if err := tx.Where("customer_invoice_id = ?", id).Delete(&models.CustomerInvoiceItem{}).Error; err != nil {
			return err
		}

		// Delete invoice
		return tx.Delete(&models.CustomerInvoice{}, "id = ?", id).Error
	})
}

func (r *customerInvoiceRepository) GetNextInvoiceNumber(ctx context.Context, prefix string) (string, error) {
	var lastInvoice models.CustomerInvoice
	var sequence int

	// Find the last invoice with the same prefix
	err := r.getDB(ctx).
		Where("code LIKE ?", prefix+"%").
		Order("code DESC").
		First(&lastInvoice).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			sequence = 1
		} else {
			return "", err
		}
	} else {
		var count int64
		r.getDB(ctx).Model(&models.CustomerInvoice{}).
			Where("code LIKE ?", prefix+"%").
			Count(&count)
		sequence = int(count) + 1
	}

	// Generate new code: PREFIX-YYYYMMDD-XXXX (e.g., INV-20240115-0001)
	now := database.GetDB(ctx, r.db).NowFunc()
	dateStr := now.Format("20060102")
	code := prefix + "-" + dateStr + "-" + fmt.Sprintf("%04d", sequence)

	return code, nil
}

func (r *customerInvoiceRepository) UpdateStatus(ctx context.Context, id string, status models.CustomerInvoiceStatus, paidAmount *float64, paymentAt *time.Time, userID *string) error {
	updates := map[string]interface{}{
		"status": status,
	}

	switch status {
	case models.CustomerInvoiceStatusPaid:
		if paidAmount != nil {
			updates["paid_amount"] = *paidAmount
			updates["remaining_amount"] = 0
		}
		if paymentAt != nil {
			updates["payment_at"] = *paymentAt
		} else {
			updates["payment_at"] = database.GetDB(ctx, r.db).NowFunc()
		}
	case models.CustomerInvoiceStatusPartial:
		if paidAmount != nil {
			updates["paid_amount"] = *paidAmount
		}
	case models.CustomerInvoiceStatusCancelled:
		updates["cancelled_by"] = userID
		updates["cancelled_at"] = database.GetDB(ctx, r.db).NowFunc()
	}

	return r.getDB(ctx).Model(&models.CustomerInvoice{}).
		Where("id = ?", id).
		Updates(updates).Error
}

// ListItems retrieves invoice items with pagination
func (r *customerInvoiceRepository) ListItems(ctx context.Context, invoiceID string, req *dto.ListCustomerInvoiceItemsRequest) ([]models.CustomerInvoiceItem, int64, error) {
	var items []models.CustomerInvoiceItem
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
	if err := r.getDB(ctx).Model(&models.CustomerInvoiceItem{}).
		Where("customer_invoice_id = ?", invoiceID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Fetch paginated items
	offset := (page - 1) * perPage
	err := r.getDB(ctx).
		Preload("Product", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "code", "name", "selling_price", "current_hpp", "image_url")
		}).
		Where("customer_invoice_id = ?", invoiceID).
		Order("created_at ASC").
		Limit(perPage).
		Offset(offset).
		Find(&items).Error

	if err != nil {
		return nil, 0, err
	}

	return items, total, nil
}
