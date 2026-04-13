package repositories

import (
	"context"
	"errors"

	"github.com/gilabs/gims/api/internal/pos/data/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// POSConfigRepository defines data access for POS outlet configuration
type POSConfigRepository interface {
	FindByOutletID(ctx context.Context, outletID string) (*models.POSConfig, error)
	Upsert(ctx context.Context, cfg *models.POSConfig) error
}

// XenditConfigRepository defines data access for Xendit gateway settings per company
type XenditConfigRepository interface {
	FindByCompanyID(ctx context.Context, companyID string) (*models.XenditConfig, error)
	Upsert(ctx context.Context, cfg *models.XenditConfig) error
}

// ─── POSConfig implementation ──────────────────────────────────────────────

type posConfigRepository struct {
	db *gorm.DB
}

func NewPOSConfigRepository(db *gorm.DB) POSConfigRepository {
	return &posConfigRepository{db: db}
}

func (r *posConfigRepository) FindByOutletID(ctx context.Context, outletID string) (*models.POSConfig, error) {
	var cfg models.POSConfig
	err := r.db.WithContext(ctx).
		Where("outlet_id = ? AND deleted_at IS NULL", outletID).
		First(&cfg).Error
	if err != nil {
		return nil, err
	}
	return &cfg, nil
}

func (r *posConfigRepository) Upsert(ctx context.Context, cfg *models.POSConfig) error {
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "outlet_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"tax_rate", "service_charge_rate", "allow_discount",
			"max_discount_percent", "print_receipt_auto",
			"receipt_footer", "currency", "updated_by", "updated_at",
		}),
	}).Create(cfg).Error
}

// ─── XenditConfig implementation ─────────────────────────────────────────────

type xenditConfigRepository struct {
	db *gorm.DB
}

func NewXenditConfigRepository(db *gorm.DB) XenditConfigRepository {
	return &xenditConfigRepository{db: db}
}

func (r *xenditConfigRepository) FindByCompanyID(ctx context.Context, companyID string) (*models.XenditConfig, error) {
	var cfg models.XenditConfig
	err := r.db.WithContext(ctx).
		Where("company_id = ? AND deleted_at IS NULL", companyID).
		First(&cfg).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, gorm.ErrRecordNotFound
		}
		return nil, err
	}
	return &cfg, nil
}

func (r *xenditConfigRepository) Upsert(ctx context.Context, cfg *models.XenditConfig) error {
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "company_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"secret_key", "xendit_account_id", "business_name",
			"environment", "connection_status", "is_active",
			"webhook_token", "updated_by", "updated_at",
		}),
	}).Create(cfg).Error
}
