package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/pos/data/models"
	"gorm.io/gorm"
)

type POSSettlementRepository interface {
	GetPaidDigitalTotal(ctx context.Context, tenantID string) (float64, error)
	GetReservedPayoutTotal(ctx context.Context, tenantID string) (float64, error)
	FindPayoutByIdempotencyKey(ctx context.Context, tenantID, idempotencyKey string) (*models.POSSettlementPayout, error)
	CreatePayout(ctx context.Context, payout *models.POSSettlementPayout) error
	UpdatePayout(ctx context.Context, payout *models.POSSettlementPayout) error
	ListPayouts(ctx context.Context, tenantID string) ([]*models.POSSettlementPayout, error)
}

type posSettlementRepository struct {
	db *gorm.DB
}

func NewPOSSettlementRepository(db *gorm.DB) POSSettlementRepository {
	return &posSettlementRepository{db: db}
}

func (r *posSettlementRepository) scopedDB(ctx context.Context) *gorm.DB {
	return database.GetDB(ctx, r.db).WithContext(ctx)
}

func (r *posSettlementRepository) GetPaidDigitalTotal(ctx context.Context, tenantID string) (float64, error) {
	var total float64
	err := r.scopedDB(ctx).
		Table("pos_payments AS pp").
		Joins("JOIN pos_orders AS po ON po.id = pp.order_id").
		Where("pp.method = ? AND pp.status = ?", models.POSPaymentMethodDigital, models.POSPaymentStatusPaid).
		Where("(pp.tenant_id = ? OR po.tenant_id = ?)", tenantID, tenantID).
		Where("po.deleted_at IS NULL").
		Select("COALESCE(SUM(pp.amount), 0)").
		Scan(&total).Error
	return total, err
}

func (r *posSettlementRepository) GetReservedPayoutTotal(ctx context.Context, tenantID string) (float64, error) {
	var total float64
	err := r.scopedDB(ctx).
		Model(&models.POSSettlementPayout{}).
		Where("tenant_id = ?", tenantID).
		Where("status IN ?", []models.POSSettlementPayoutStatus{
			models.POSSettlementPayoutStatusPending,
			models.POSSettlementPayoutStatusAccepted,
			models.POSSettlementPayoutStatusRequested,
			models.POSSettlementPayoutStatusSucceeded,
		}).
		Select("COALESCE(SUM(amount + fee + vat), 0)").
		Scan(&total).Error
	return total, err
}

func (r *posSettlementRepository) FindPayoutByIdempotencyKey(ctx context.Context, tenantID, idempotencyKey string) (*models.POSSettlementPayout, error) {
	var payout models.POSSettlementPayout
	err := r.scopedDB(ctx).
		Where("tenant_id = ? AND idempotency_key = ?", tenantID, idempotencyKey).
		First(&payout).Error
	if err != nil {
		return nil, err
	}
	return &payout, nil
}

func (r *posSettlementRepository) CreatePayout(ctx context.Context, payout *models.POSSettlementPayout) error {
	return r.scopedDB(ctx).Create(payout).Error
}

func (r *posSettlementRepository) UpdatePayout(ctx context.Context, payout *models.POSSettlementPayout) error {
	return r.scopedDB(ctx).Save(payout).Error
}

func (r *posSettlementRepository) ListPayouts(ctx context.Context, tenantID string) ([]*models.POSSettlementPayout, error) {
	var payouts []*models.POSSettlementPayout
	err := r.scopedDB(ctx).
		Where("tenant_id = ?", tenantID).
		Order("created_at DESC").
		Find(&payouts).Error
	return payouts, err
}
