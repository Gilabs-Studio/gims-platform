package repositories

import (
	"context"
	"strings"
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

type TaxInvoiceListParams struct {
	Search    string
	StartDate *time.Time
	EndDate   *time.Time
	Limit     int
	Offset    int
	SortBy    string
	SortDir   string
}

type TaxInvoiceRepository interface {
	FindByID(ctx context.Context, id string) (*financeModels.TaxInvoice, error)
	List(ctx context.Context, params TaxInvoiceListParams) ([]financeModels.TaxInvoice, int64, error)
}

type taxInvoiceRepository struct {
	db *gorm.DB
}

func NewTaxInvoiceRepository(db *gorm.DB) TaxInvoiceRepository {
	return &taxInvoiceRepository{db: db}
}

func (r *taxInvoiceRepository) FindByID(ctx context.Context, id string) (*financeModels.TaxInvoice, error) {
	var item financeModels.TaxInvoice
	if err := r.db.WithContext(ctx).First(&item, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

var taxInvoiceAllowedSort = map[string]string{
	"created_at":       "tax_invoices.created_at",
	"updated_at":       "tax_invoices.updated_at",
	"tax_invoice_date": "tax_invoices.tax_invoice_date",
	"tax_invoice_number": "tax_invoices.tax_invoice_number",
}

func (r *taxInvoiceRepository) List(ctx context.Context, params TaxInvoiceListParams) ([]financeModels.TaxInvoice, int64, error) {
	var items []financeModels.TaxInvoice
	var total int64

	q := r.db.WithContext(ctx).Model(&financeModels.TaxInvoice{})
	if s := strings.TrimSpace(params.Search); s != "" {
		like := "%" + s + "%"
		q = q.Where("tax_invoices.tax_invoice_number ILIKE ? OR tax_invoices.notes ILIKE ?", like, like)
	}
	if params.StartDate != nil {
		q = q.Where("tax_invoices.tax_invoice_date >= ?", *params.StartDate)
	}
	if params.EndDate != nil {
		q = q.Where("tax_invoices.tax_invoice_date <= ?", *params.EndDate)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := taxInvoiceAllowedSort[params.SortBy]
	if sortCol == "" {
		sortCol = taxInvoiceAllowedSort["tax_invoice_date"]
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
