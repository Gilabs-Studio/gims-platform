package repositories

import (
	"context"
	"strings"

	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	"github.com/gilabs/gims/api/internal/purchase/data/models"
	"gorm.io/gorm"
)

type PurchasePaymentListParams struct {
	Search    string
	Status    string
	Method    string
	InvoiceID string
	StartDate string
	EndDate   string
	SortBy    string
	SortDir   string
	Limit     int
	Offset    int
}

type PurchasePaymentRepository interface {
	List(ctx context.Context, params PurchasePaymentListParams) ([]*models.PurchasePayment, int64, error)
	GetByID(ctx context.Context, id string) (*models.PurchasePayment, error)
	Create(ctx context.Context, p *models.PurchasePayment) error
	Delete(ctx context.Context, id string) error
}

type purchasePaymentRepository struct {
	db *gorm.DB
}

func NewPurchasePaymentRepository(db *gorm.DB) PurchasePaymentRepository {
	return &purchasePaymentRepository{db: db}
}

var purchasePaymentAllowedSort = map[string]string{
	"created_at":     "purchase_payments.created_at",
	"updated_at":     "purchase_payments.updated_at",
	"payment_date":   "purchase_payments.payment_date",
	"amount":         "purchase_payments.amount",
	"method":         "purchase_payments.method",
	"status":         "purchase_payments.status",
	"reference_number": "purchase_payments.reference_number",
}

func (r *purchasePaymentRepository) List(ctx context.Context, params PurchasePaymentListParams) ([]*models.PurchasePayment, int64, error) {
	var items []*models.PurchasePayment
	var total int64

	q := r.db.WithContext(ctx).Model(&models.PurchasePayment{}).
		Preload("SupplierInvoice").
		Preload("BankAccount")

	// Apply scope-based data filtering (OWN/DIVISION/AREA/ALL)
	q = security.ApplyScopeFilter(q, ctx, security.PurchaseScopeQueryOptions())

	if s := strings.TrimSpace(params.Search); s != "" {
		like := "%" + s + "%"
		q = q.Where(
			"purchase_payments.reference_number ILIKE ? OR purchase_payments.notes ILIKE ? OR purchase_payments.method ILIKE ?",
			like, like, like,
		)
	}
	if st := strings.TrimSpace(params.Status); st != "" {
		q = q.Where("purchase_payments.status = ?", st)
	}
	if m := strings.TrimSpace(params.Method); m != "" {
		q = q.Where("purchase_payments.method = ?", m)
	}
	if inv := strings.TrimSpace(params.InvoiceID); inv != "" {
		q = q.Where("purchase_payments.supplier_invoice_id = ?", inv)
	}
	if sd := strings.TrimSpace(params.StartDate); sd != "" {
		q = q.Where("purchase_payments.payment_date >= ?", sd)
	}
	if ed := strings.TrimSpace(params.EndDate); ed != "" {
		q = q.Where("purchase_payments.payment_date <= ?", ed)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := purchasePaymentAllowedSort[params.SortBy]
	if sortCol == "" {
		sortCol = purchasePaymentAllowedSort["created_at"]
	}
	sortDir := strings.ToLower(strings.TrimSpace(params.SortDir))
	if sortDir != "asc" {
		sortDir = "desc"
	}
	q = q.Order(sortCol + " " + sortDir)

	if params.Limit > 0 {
		q = q.Limit(params.Limit)
	}
	if params.Offset > 0 {
		q = q.Offset(params.Offset)
	}

	if err := q.Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *purchasePaymentRepository) GetByID(ctx context.Context, id string) (*models.PurchasePayment, error) {
	var p models.PurchasePayment
	if err := r.db.WithContext(ctx).
		Preload("SupplierInvoice").
		Preload("BankAccount").
		First(&p, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *purchasePaymentRepository) Create(ctx context.Context, p *models.PurchasePayment) error {
	return r.db.WithContext(ctx).Create(p).Error
}

func (r *purchasePaymentRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.PurchasePayment{}, "id = ?", id).Error
}
