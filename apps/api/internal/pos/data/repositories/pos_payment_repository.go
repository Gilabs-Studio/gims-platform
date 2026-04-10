package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/pos/data/models"
	"gorm.io/gorm"
)

// POSPaymentRepository defines data access for POS payments
type POSPaymentRepository interface {
	Create(ctx context.Context, payment *models.POSPayment) error
	Update(ctx context.Context, payment *models.POSPayment) error
	FindByOrderID(ctx context.Context, orderID string) ([]models.POSPayment, error)
	FindByExternalOrderID(ctx context.Context, externalOrderID string) (*models.POSPayment, error)
}

type posPaymentRepository struct {
	db *gorm.DB
}

// NewPOSPaymentRepository creates the concrete implementation
func NewPOSPaymentRepository(db *gorm.DB) POSPaymentRepository {
	return &posPaymentRepository{db: db}
}

func (r *posPaymentRepository) Create(ctx context.Context, payment *models.POSPayment) error {
	return r.db.WithContext(ctx).Create(payment).Error
}

func (r *posPaymentRepository) Update(ctx context.Context, payment *models.POSPayment) error {
	return r.db.WithContext(ctx).Save(payment).Error
}

func (r *posPaymentRepository) FindByOrderID(ctx context.Context, orderID string) ([]models.POSPayment, error) {
	var payments []models.POSPayment
	err := r.db.WithContext(ctx).
		Where("order_id = ?", orderID).
		Order("created_at DESC").
		Find(&payments).Error
	return payments, err
}

func (r *posPaymentRepository) FindByExternalOrderID(ctx context.Context, externalOrderID string) (*models.POSPayment, error) {
	var payment models.POSPayment
	err := r.db.WithContext(ctx).
		Where("external_order_id = ?", externalOrderID).
		First(&payment).Error
	if err != nil {
		return nil, err
	}
	return &payment, nil
}
