package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/pos/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TableQRTokenRepository defines data access for table QR tokens.
type TableQRTokenRepository interface {
	// GenerateForTable creates (or replaces) an active token for a given table object
	// within a floor plan. The old token is soft-deleted so it becomes invalid.
	GenerateForTable(ctx context.Context, token *models.PosTableQRToken) (*models.PosTableQRToken, error)

	// FindByToken resolves an active token record by its UUID value.
	FindByToken(ctx context.Context, token string) (*models.PosTableQRToken, error)

	// FindByFloorPlan returns all active tokens belonging to a floor plan.
	FindByFloorPlan(ctx context.Context, floorPlanID string) ([]models.PosTableQRToken, error)

	// FindByTableObject returns the active token for a specific table object, if any.
	FindByTableObject(ctx context.Context, floorPlanID, tableObjectID string) (*models.PosTableQRToken, error)

	// Revoke soft-deletes and deactivates the token for a given table object.
	Revoke(ctx context.Context, floorPlanID, tableObjectID string) error
}

type tableQRTokenRepository struct {
	db *gorm.DB
}

// NewTableQRTokenRepository creates a new repository instance.
func NewTableQRTokenRepository(db *gorm.DB) TableQRTokenRepository {
	return &tableQRTokenRepository{db: db}
}

func (r *tableQRTokenRepository) getDB(ctx context.Context) *gorm.DB {
	return database.GetDB(ctx, r.db)
}

// GenerateForTable atomically revokes any existing token and inserts a fresh one.
func (r *tableQRTokenRepository) GenerateForTable(ctx context.Context, token *models.PosTableQRToken) (*models.PosTableQRToken, error) {
	if token.Token == "" {
		token.Token = uuid.New().String()
	}

	err := r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		// Soft-delete existing token for this table object within the floor plan.
		if err := tx.Where(
			"floor_plan_id = ? AND table_object_id = ? AND deleted_at IS NULL",
			token.FloorPlanID, token.TableObjectID,
		).Delete(&models.PosTableQRToken{}).Error; err != nil {
			return err
		}
		return tx.Create(token).Error
	})
	if err != nil {
		return nil, err
	}
	return token, nil
}

// FindByToken resolves an active, non-deleted token by its UUID.
func (r *tableQRTokenRepository) FindByToken(ctx context.Context, token string) (*models.PosTableQRToken, error) {
	// Public lookup — bypass tenant scoping because the token itself encodes tenant context.
	var record models.PosTableQRToken
	err := r.db.
		Where("token = ? AND is_active = true AND deleted_at IS NULL", token).
		First(&record).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

// FindByFloorPlan returns all active tokens for a floor plan, respecting tenant scope.
func (r *tableQRTokenRepository) FindByFloorPlan(ctx context.Context, floorPlanID string) ([]models.PosTableQRToken, error) {
	var records []models.PosTableQRToken
	err := r.getDB(ctx).
		Where("floor_plan_id = ? AND is_active = true AND deleted_at IS NULL", floorPlanID).
		Order("table_label ASC").
		Find(&records).Error
	return records, err
}

// FindByTableObject returns the single active token for a table object.
func (r *tableQRTokenRepository) FindByTableObject(ctx context.Context, floorPlanID, tableObjectID string) (*models.PosTableQRToken, error) {
	var record models.PosTableQRToken
	err := r.getDB(ctx).
		Where("floor_plan_id = ? AND table_object_id = ? AND is_active = true AND deleted_at IS NULL",
			floorPlanID, tableObjectID).
		First(&record).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

// Revoke deactivates and soft-deletes the active token for a table object.
func (r *tableQRTokenRepository) Revoke(ctx context.Context, floorPlanID, tableObjectID string) error {
	return r.getDB(ctx).
		Where("floor_plan_id = ? AND table_object_id = ? AND deleted_at IS NULL",
			floorPlanID, tableObjectID).
		Delete(&models.PosTableQRToken{}).Error
}
