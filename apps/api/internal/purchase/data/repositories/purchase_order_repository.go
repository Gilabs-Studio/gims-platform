package repositories

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	"github.com/gilabs/gims/api/internal/purchase/data/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PurchaseOrderRepository interface {
	List(ctx context.Context, params PurchaseOrderListParams) ([]*models.PurchaseOrder, int64, error)
	GetByID(ctx context.Context, id string) (*models.PurchaseOrder, error)
	Create(ctx context.Context, po *models.PurchaseOrder) (*models.PurchaseOrder, error)
	Update(ctx context.Context, po *models.PurchaseOrder) (*models.PurchaseOrder, error)
	Delete(ctx context.Context, id string) error
	UpdateStatus(ctx context.Context, id string, status models.PurchaseOrderStatus) (*models.PurchaseOrder, error)
	UpdateStatusWithTimestamp(ctx context.Context, id string, status models.PurchaseOrderStatus, updates map[string]interface{}) (*models.PurchaseOrder, error)
	ExistsByPurchaseRequisitionID(ctx context.Context, prID string) (bool, error)
	ExistsBySalesOrderID(ctx context.Context, soID string) (bool, error)
}

type PurchaseOrderListParams struct {
	Search  string
	Status  string
	SortBy  string
	SortDir string
	Limit   int
	Offset  int
	WithItems bool
}

type purchaseOrderRepository struct {
	db *gorm.DB
}

func NewPurchaseOrderRepository(db *gorm.DB) PurchaseOrderRepository {
	return &purchaseOrderRepository{db: db}
}

func (r *purchaseOrderRepository) List(ctx context.Context, params PurchaseOrderListParams) ([]*models.PurchaseOrder, int64, error) {
	var results []*models.PurchaseOrder
	var total int64

	base := r.db.WithContext(ctx).Model(&models.PurchaseOrder{})

	// Apply scope-based data filtering (OWN/DIVISION/AREA/ALL)
	base = security.ApplyScopeFilter(base, ctx, security.PurchaseScopeQueryOptions())

	if params.Search != "" {
		pattern := "%" + params.Search + "%"
		base = base.Where(
			"code ILIKE ? OR notes ILIKE ? OR order_date ILIKE ?",
			pattern,
			pattern,
			pattern,
		)
	}
	if strings.TrimSpace(params.Status) != "" {
		base = base.Where("status = ?", strings.ToUpper(strings.TrimSpace(params.Status)))
	}

	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	query := r.db.WithContext(ctx).Model(&models.PurchaseOrder{})
	if params.Search != "" {
		pattern := "%" + params.Search + "%"
		query = query.Where(
			"code ILIKE ? OR notes ILIKE ? OR order_date ILIKE ?",
			pattern,
			pattern,
			pattern,
		)
	}
	if strings.TrimSpace(params.Status) != "" {
		query = query.Where("status = ?", strings.ToUpper(strings.TrimSpace(params.Status)))
	}

	sortField := normalizePOSortField(params.SortBy)
	sortDir := strings.ToLower(params.SortDir)
	if sortDir != "asc" {
		sortDir = "desc"
	}
	query = query.Order(sortField + " " + sortDir)

	if params.Limit > 0 {
		query = query.Limit(params.Limit).Offset(params.Offset)
	}

	query = query.
		Preload("Supplier").
		Preload("PaymentTerms").
		Preload("BusinessUnit").
		Preload("Creator").
		Preload("GoodsReceipts").
		Preload("GoodsReceipts.Items").
		Preload("SupplierInvoices").
		Preload("SupplierInvoices.GoodsReceipt").
		Preload("PurchaseRequisition").
		Preload("Items")

	if params.WithItems {
		query = query.
			Preload("Items.Product")
	}

	if err := query.Find(&results).Error; err != nil {
		return nil, 0, err
	}

	return results, total, nil
}

func (r *purchaseOrderRepository) GetByID(ctx context.Context, id string) (*models.PurchaseOrder, error) {
	var po models.PurchaseOrder
	err := r.db.WithContext(ctx).
		Model(&models.PurchaseOrder{}).
		Preload("Supplier").
		Preload("PaymentTerms").
		Preload("BusinessUnit").
		Preload("Creator").
		Preload("PurchaseRequisition.Supplier").
		Preload("PurchaseRequisition.PaymentTerms").
		Preload("PurchaseRequisition.BusinessUnit").
		Preload("PurchaseRequisition.Employee.User").
		Preload("Items.Product").
		First(&po, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &po, nil
}

func (r *purchaseOrderRepository) ExistsByPurchaseRequisitionID(ctx context.Context, prID string) (bool, error) {
	if strings.TrimSpace(prID) == "" {
		return false, nil
	}
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.PurchaseOrder{}).
		Where("purchase_requisition_id = ?", prID).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *purchaseOrderRepository) ExistsBySalesOrderID(ctx context.Context, soID string) (bool, error) {
	if strings.TrimSpace(soID) == "" {
		return false, nil
	}
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.PurchaseOrder{}).
		Where("sales_order_id = ?", soID).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *purchaseOrderRepository) Create(ctx context.Context, po *models.PurchaseOrder) (*models.PurchaseOrder, error) {
	if po == nil {
		return nil, fmt.Errorf("purchase order is nil")
	}

	return po, r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if po.Code == "" {
			code, err := r.getNextCodeLocked(ctx, tx, "PO")
			if err != nil {
				return err
			}
			po.Code = code
		}

		for attempt := 0; attempt < 3; attempt++ {
			sp := fmt.Sprintf("sp_po_create_%d", attempt)
			if err := tx.SavePoint(sp).Error; err != nil {
				return err
			}

			// Avoid double insert: create PO header first, then insert Items explicitly.
			if err := tx.Omit("Items").Create(po).Error; err != nil {
				if rbErr := tx.RollbackTo(sp).Error; rbErr != nil {
					return rbErr
				}

				if isPOUniqueConstraintViolation(err, "idx_purchase_orders_code") {
					code, genErr := r.getNextCodeLocked(ctx, tx, "PO")
					if genErr != nil {
						return genErr
					}
					po.Code = code
					continue
				}
				return err
			}

			if len(po.Items) > 0 {
				for i := range po.Items {
					po.Items[i].PurchaseOrderID = po.ID
					po.Items[i].Discount = clamp(po.Items[i].Discount, 0, 100)
					po.Items[i].Quantity = math.Max(0, po.Items[i].Quantity)
					po.Items[i].Price = math.Max(0, po.Items[i].Price)
					po.Items[i].Subtotal = calcItemSubtotal(po.Items[i].Quantity, po.Items[i].Price, po.Items[i].Discount)
				}
				if err := tx.Create(&po.Items).Error; err != nil {
					return err
				}
			}

			return nil
		}

		return fmt.Errorf("failed to create purchase order: code conflict")
	})
}

func (r *purchaseOrderRepository) Update(ctx context.Context, po *models.PurchaseOrder) (*models.PurchaseOrder, error) {
	if po == nil {
		return nil, fmt.Errorf("purchase order is nil")
	}

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing models.PurchaseOrder
		if err := tx.
			Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&existing, "id = ?", po.ID).Error; err != nil {
			return err
		}

		if err := tx.Model(&existing).Updates(map[string]interface{}{
			"supplier_id":            po.SupplierID,
			"payment_terms_id":       po.PaymentTermsID,
			"business_unit_id":       po.BusinessUnitID,
			"order_date":             po.OrderDate,
			"due_date":               po.DueDate,
			"revision_comment":       po.RevisionComment,
			"notes":                  po.Notes,
			"tax_rate":               po.TaxRate,
			"tax_amount":             po.TaxAmount,
			"delivery_cost":          po.DeliveryCost,
			"other_cost":             po.OtherCost,
			"sub_total":              po.SubTotal,
			"total_amount":           po.TotalAmount,
			"purchase_requisition_id": po.PurchaseRequisitionID,
			"sales_order_id":         po.SalesOrderID,
		}).Error; err != nil {
			return err
		}

		if err := tx.Where("purchase_order_id = ?", po.ID).Delete(&models.PurchaseOrderItem{}).Error; err != nil {
			return err
		}
		if len(po.Items) > 0 {
			for i := range po.Items {
				po.Items[i].PurchaseOrderID = po.ID
				po.Items[i].Discount = clamp(po.Items[i].Discount, 0, 100)
				po.Items[i].Quantity = math.Max(0, po.Items[i].Quantity)
				po.Items[i].Price = math.Max(0, po.Items[i].Price)
				po.Items[i].Subtotal = calcItemSubtotal(po.Items[i].Quantity, po.Items[i].Price, po.Items[i].Discount)
			}
			if err := tx.Create(&po.Items).Error; err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return r.GetByID(ctx, po.ID)
}

func (r *purchaseOrderRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("purchase_order_id = ?", id).Delete(&models.PurchaseOrderItem{}).Error; err != nil {
			return err
		}
		return tx.Delete(&models.PurchaseOrder{}, "id = ?", id).Error
	})
}

func (r *purchaseOrderRepository) UpdateStatus(ctx context.Context, id string, status models.PurchaseOrderStatus) (*models.PurchaseOrder, error) {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing models.PurchaseOrder
		if err := tx.
			Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&existing, "id = ?", id).Error; err != nil {
			return err
		}
		return tx.Model(&existing).Update("status", status).Error
	})
	if err != nil {
		return nil, err
	}
	return r.GetByID(ctx, id)
}

func (r *purchaseOrderRepository) UpdateStatusWithTimestamp(ctx context.Context, id string, status models.PurchaseOrderStatus, updates map[string]interface{}) (*models.PurchaseOrder, error) {
	updates["status"] = status
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing models.PurchaseOrder
		if err := tx.
			Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&existing, "id = ?", id).Error; err != nil {
			return err
		}
		return tx.Model(&existing).Updates(updates).Error
	})
	if err != nil {
		return nil, err
	}
	return r.GetByID(ctx, id)
}



func (r *purchaseOrderRepository) getNextCodeLocked(ctx context.Context, tx *gorm.DB, prefix string) (string, error) {
	now := database.GetDB(ctx, r.db).NowFunc()
	dateStr := now.Format("20060102")
	codePrefix := prefix + "-" + dateStr + "-"

	lockKey := "purchase_order_code:" + dateStr
	if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtext(?))", lockKey).Error; err != nil {
		return "", err
	}

	var last models.PurchaseOrder
	err := tx.WithContext(ctx).
		Unscoped().
		Model(&models.PurchaseOrder{}).
		Select("code").
		Where("code LIKE ?", codePrefix+"%",
		).
		Order("code DESC").
		First(&last).Error

	seq := 1
	if err != nil {
		if err != gorm.ErrRecordNotFound {
			return "", err
		}
	} else if len(last.Code) >= len(codePrefix)+4 {
		lastSeqStr := last.Code[len(last.Code)-4:]
		if n, convErr := strconv.Atoi(lastSeqStr); convErr == nil {
			seq = n + 1
		}
	}

	return codePrefix + formatPOSequence(seq), nil
}

func formatPOSequence(seq int) string {
	return fmt.Sprintf("%04d", seq)
}

func isPOUniqueConstraintViolation(err error, constraintName string) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	if strings.Contains(errStr, "SQLSTATE 23505") && strings.Contains(errStr, constraintName) {
		return true
	}
	return strings.Contains(strings.ToLower(errStr), "duplicate key value") && strings.Contains(errStr, constraintName)
}

func normalizePOSortField(raw string) string {
	switch raw {
	case "code":
		return "code"
	case "order_date":
		return "order_date"
	case "due_date":
		return "due_date"
	case "status":
		return "status"
	case "total_amount":
		return "total_amount"
	case "created_at":
		return "created_at"
	case "updated_at":
		return "updated_at"
	default:
		return "created_at"
	}
}

func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func calcItemSubtotal(qty, price, discount float64) float64 {
	raw := qty * price
	if discount <= 0 {
		return math.Round(raw)
	}
	return math.Round(raw - (raw * (discount / 100)))
}
