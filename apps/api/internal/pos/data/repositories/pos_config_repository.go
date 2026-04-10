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

// MidtransConfigRepository defines data access for Midtrans gateway settings
type MidtransConfigRepository interface {
	FindByCompanyID(ctx context.Context, companyID string) (*models.MidtransConfig, error)
	Upsert(ctx context.Context, cfg *models.MidtransConfig) error
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

// ─── MidtransConfig implementation ─────────────────────────────────────────

type midtransConfigRepository struct {
	db *gorm.DB
}

func NewMidtransConfigRepository(db *gorm.DB) MidtransConfigRepository {
	return &midtransConfigRepository{db: db}
}

func (r *midtransConfigRepository) FindByCompanyID(ctx context.Context, companyID string) (*models.MidtransConfig, error) {
	var cfg models.MidtransConfig
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

func (r *midtransConfigRepository) Upsert(ctx context.Context, cfg *models.MidtransConfig) error {
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "company_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"server_key", "client_key", "merchant_id",
			"environment", "is_active", "updated_by", "updated_at",
		}),
	}).Create(cfg).Error
}
