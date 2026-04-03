package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

type SystemAccountMappingRepository interface {
	GetByKey(ctx context.Context, key string, companyID *string) (string, error)
	Upsert(ctx context.Context, mapping *financeModels.SystemAccountMapping) error
}

type systemAccountMappingRepository struct {
	db *gorm.DB
}

func NewSystemAccountMappingRepository(db *gorm.DB) SystemAccountMappingRepository {
	return &systemAccountMappingRepository{db: db}
}

func (r *systemAccountMappingRepository) getDB(ctx context.Context) *gorm.DB {
	return database.GetDB(ctx, r.db)
}

func (r *systemAccountMappingRepository) GetByKey(ctx context.Context, key string, companyID *string) (string, error) {
	var m financeModels.SystemAccountMapping
	db := r.getDB(ctx).Where("key = ?", key)
	
	if companyID != nil {
		// Try company specific first, then global
		var cm financeModels.SystemAccountMapping
		err := db.Where("company_id = ?", *companyID).First(&cm).Error
		if err == nil {
			return cm.COACode, nil
		}
	}

	// Global default
	if err := db.Where("company_id IS NULL").First(&m).Error; err != nil {
		return "", err
	}
	return m.COACode, nil
}

func (r *systemAccountMappingRepository) Upsert(ctx context.Context, mapping *financeModels.SystemAccountMapping) error {
	var existing financeModels.SystemAccountMapping
	err := r.getDB(ctx).Where("key = ? AND (company_id = ? OR (company_id IS NULL AND ? IS NULL))", 
		mapping.Key, mapping.CompanyID, mapping.CompanyID).First(&existing).Error
	
	if err == gorm.ErrRecordNotFound {
		return r.getDB(ctx).Create(mapping).Error
	} else if err != nil {
		return err
	}

	existing.COACode = mapping.COACode
	existing.Label = mapping.Label
	return r.getDB(ctx).Save(&existing).Error
}
