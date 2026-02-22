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

// SalesEstimationRepository defines the interface for sales estimation data access
type SalesEstimationRepository interface {
	FindByID(ctx context.Context, id string) (*models.SalesEstimation, error)
	FindByCode(ctx context.Context, code string) (*models.SalesEstimation, error)
	List(ctx context.Context, req *dto.ListSalesEstimationsRequest) ([]models.SalesEstimation, int64, error)
	ListItems(ctx context.Context, estimationID string, req *dto.ListSalesEstimationItemsRequest) ([]models.SalesEstimationItem, int64, error)
	Create(ctx context.Context, se *models.SalesEstimation) error
	Update(ctx context.Context, se *models.SalesEstimation) error
	Delete(ctx context.Context, id string) error
	GetNextEstimationNumber(ctx context.Context, prefix string) (string, error)
	UpdateStatus(ctx context.Context, id string, status models.SalesEstimationStatus, userID *string, reason *string) error
}

type salesEstimationRepository struct {
	db *gorm.DB
}

// NewSalesEstimationRepository creates a new SalesEstimationRepository
func NewSalesEstimationRepository(db *gorm.DB) SalesEstimationRepository {
	return &salesEstimationRepository{db: db}
}

func (r *salesEstimationRepository) getDB(ctx context.Context) *gorm.DB {
	return database.GetDB(ctx, r.db)
}

func (r *salesEstimationRepository) FindByID(ctx context.Context, id string) (*models.SalesEstimation, error) {
	var estimation models.SalesEstimation
	err := r.getDB(ctx).
		Preload("Customer").
		Preload("SalesRep").
		Preload("BusinessUnit").
		Preload("BusinessType").
		Preload("Area").
		Preload("Items.Product").
		Where("id = ?", id).
		First(&estimation).Error
	if err != nil {
		return nil, err
	}
	return &estimation, nil
}

func (r *salesEstimationRepository) FindByCode(ctx context.Context, code string) (*models.SalesEstimation, error) {
	var estimation models.SalesEstimation
	err := r.getDB(ctx).
		Preload("Customer").
		Preload("SalesRep").
		Preload("BusinessUnit").
		Preload("BusinessType").
		Preload("Area").
		Preload("Items.Product").
		Where("code = ?", code).
		First(&estimation).Error
	if err != nil {
		return nil, err
	}
	return &estimation, nil
}

func (r *salesEstimationRepository) List(ctx context.Context, req *dto.ListSalesEstimationsRequest) ([]models.SalesEstimation, int64, error) {
	var estimations []models.SalesEstimation
	var total int64

	query := r.getDB(ctx).Model(&models.SalesEstimation{})

	// Apply scope-based data filtering (OWN/DIVISION/AREA/ALL)
	query = security.ApplyScopeFilter(query, ctx, security.SalesScopeQueryOptions())

	// Apply search filter (Code, CustomerName, Notes)
	if req.Search != "" {
		search := "%" + req.Search + "%"
		query = query.Where("code ILIKE ? OR customer_name ILIKE ? OR notes ILIKE ?", search, search, search)
	}

	// Apply status filter
	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}

	// Apply date range filter
	if req.DateFrom != "" {
		query = query.Where("estimation_date >= ?", req.DateFrom)
	}
	if req.DateTo != "" {
		query = query.Where("estimation_date <= ?", req.DateTo)
	}

	// Apply filter by sales rep
	if req.SalesRepID != "" {
		query = query.Where("sales_rep_id = ?", req.SalesRepID)
	}

	// Apply filter by business unit
	if req.BusinessUnitID != "" {
		query = query.Where("business_unit_id = ?", req.BusinessUnitID)
	}
	
	// Apply filter by area
	if req.AreaID != "" {
		query = query.Where("area_id = ?", req.AreaID)
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
		sortBy = "estimation_date"
	}
	sortDir := req.SortDir
	if sortDir == "" {
		sortDir = "desc"
	}
	query = query.Order(sortBy + " " + sortDir)

	// Execute query with preloads
	err := query.
		Preload("Customer").
		Preload("SalesRep").
		Preload("BusinessUnit").
		Preload("BusinessType").
		Preload("Area").
		Limit(perPage).
		Offset(offset).
		Find(&estimations).Error
	if err != nil {
		return nil, 0, err
	}

	return estimations, total, nil
}

func (r *salesEstimationRepository) Create(ctx context.Context, se *models.SalesEstimation) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		items := se.Items
		se.Items = nil

		if err := tx.Create(se).Error; err != nil {
			return err
		}

		if len(items) > 0 {
			for i := range items {
				items[i].SalesEstimationID = se.ID
				if err := tx.Create(&items[i]).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

func (r *salesEstimationRepository) Update(ctx context.Context, se *models.SalesEstimation) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		// Update estimation WITHOUT items (Omit Associations)
		if err := tx.Omit("Items").Save(se).Error; err != nil {
			return err
		}

		// Hard-delete existing items to avoid duplicate key constraint
		// Soft-delete leaves rows with same PK, causing conflict on re-create
		if err := tx.Unscoped().Where("sales_estimation_id = ?", se.ID).Delete(&models.SalesEstimationItem{}).Error; err != nil {
			return err
		}

		// Create new items with fresh UUIDs
		if len(se.Items) > 0 {
			for i := range se.Items {
				se.Items[i].ID = "" // Clear existing ID to generate new UUID via BeforeCreate hook
				se.Items[i].SalesEstimationID = se.ID
				se.Items[i].CreatedAt = time.Now()
				se.Items[i].UpdatedAt = time.Now()
				if err := tx.Create(&se.Items[i]).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

func (r *salesEstimationRepository) Delete(ctx context.Context, id string) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete Items first
		if err := tx.Where("sales_estimation_id = ?", id).Delete(&models.SalesEstimationItem{}).Error; err != nil {
			return err
		}

		// Delete Estimation
		return tx.Delete(&models.SalesEstimation{}, "id = ?", id).Error
	})
}

func (r *salesEstimationRepository) GetNextEstimationNumber(ctx context.Context, prefix string) (string, error) {
	var lastEstimation models.SalesEstimation
	var sequence int

	// Find the last estimation with the same prefix
	// Format usually SE-YYYYMMDD-XXXX
	err := r.getDB(ctx).
		Where("code LIKE ?", prefix+"%").
		Order("code DESC").
		First(&lastEstimation).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			sequence = 1
		} else {
			return "", err
		}
	} else {
		var count int64
		// Count records with this prefix to determine sequence (approximate)
		// Or parse the last code. Here we use count logic assuming consecutive creation.
		r.getDB(ctx).Model(&models.SalesEstimation{}).
			Where("code LIKE ?", prefix+"%").
			Count(&count)
		sequence = int(count) + 1
	}

	now := database.GetDB(ctx, r.db).NowFunc()
	dateStr := now.Format("20060102")
	
	code := prefix + "-" + dateStr + "-" + fmt.Sprintf("%04d", sequence)
	
	return code, nil
}

func (r *salesEstimationRepository) UpdateStatus(ctx context.Context, id string, status models.SalesEstimationStatus, userID *string, reason *string) error {
	updates := map[string]interface{}{
		"status": status,
	}

	switch status {
	case models.SalesEstimationStatusApproved:
		updates["approved_by"] = userID
		updates["approved_at"] = database.GetDB(ctx, r.db).NowFunc()
	case models.SalesEstimationStatusRejected:
		updates["rejected_by"] = userID
		updates["rejected_at"] = database.GetDB(ctx, r.db).NowFunc()
		if reason != nil {
			updates["rejection_reason"] = *reason
		}
	case models.SalesEstimationStatusConverted:
		updates["converted_at"] = database.GetDB(ctx, r.db).NowFunc()
	}

	return r.getDB(ctx).Model(&models.SalesEstimation{}).
		Where("id = ?", id).
		Updates(updates).Error
}

func (r *salesEstimationRepository) ListItems(ctx context.Context, estimationID string, req *dto.ListSalesEstimationItemsRequest) ([]models.SalesEstimationItem, int64, error) {
	var items []models.SalesEstimationItem
	var total int64

	page := req.Page
	if page < 1 { page = 1 }
	perPage := req.PerPage
	if perPage < 1 { perPage = 20 }
	if perPage > 100 { perPage = 100 }

	if err := r.getDB(ctx).Model(&models.SalesEstimationItem{}).
		Where("sales_estimation_id = ?", estimationID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := r.getDB(ctx).
		Preload("Product", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "code", "name", "selling_price", "image_url")
		}).
		Where("sales_estimation_id = ?", estimationID).
		Order("created_at ASC").
		Limit(perPage).
		Offset(offset).
		Find(&items).Error
	
	if err != nil {
		return nil, 0, err
	}

	return items, total, nil
}
