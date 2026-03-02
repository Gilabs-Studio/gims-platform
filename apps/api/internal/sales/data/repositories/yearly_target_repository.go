package repositories

import (
	"context"
	"fmt"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	"github.com/gilabs/gims/api/internal/sales/data/models"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	"gorm.io/gorm"
)

// YearlyTargetRepository defines the interface for yearly target data access
type YearlyTargetRepository interface {
	FindByID(ctx context.Context, id string) (*models.YearlyTarget, error)
	List(ctx context.Context, req *dto.ListYearlyTargetsRequest) ([]models.YearlyTarget, int64, error)
	Create(ctx context.Context, yt *models.YearlyTarget) error
	Update(ctx context.Context, yt *models.YearlyTarget) error
	Delete(ctx context.Context, id string) error
	GetNextTargetNumber(ctx context.Context, prefix string) (string, error)
	UpdateStatus(ctx context.Context, id string, status models.YearlyTargetStatus, userID *string, reason *string) error
}

type yearlyTargetRepository struct {
	db *gorm.DB
}

// NewYearlyTargetRepository creates a new YearlyTargetRepository
func NewYearlyTargetRepository(db *gorm.DB) YearlyTargetRepository {
	return &yearlyTargetRepository{db: db}
}

func (r *yearlyTargetRepository) getDB(ctx context.Context) *gorm.DB {
	return database.GetDB(ctx, r.db)
}

func (r *yearlyTargetRepository) FindByID(ctx context.Context, id string) (*models.YearlyTarget, error) {
	var target models.YearlyTarget
	err := r.getDB(ctx).
		Preload("Area").
		Preload("MonthlyTargets").
		Where("id = ?", id).
		First(&target).Error
	if err != nil {
		return nil, err
	}
	return &target, nil
}

func (r *yearlyTargetRepository) List(ctx context.Context, req *dto.ListYearlyTargetsRequest) ([]models.YearlyTarget, int64, error) {
	var targets []models.YearlyTarget
	var total int64

	query := r.getDB(ctx).Model(&models.YearlyTarget{})

	// Apply scope-based data filtering (OWN/DIVISION/AREA/ALL)
	query = security.ApplyScopeFilter(query, ctx, security.DefaultScopeQueryOptions())

	// Apply search filter
	if req.Search != "" {
		search := "%" + req.Search + "%"
		query = query.Where("code ILIKE ? OR notes ILIKE ?", search, search)
	}

	// Apply year filter
	if req.Year != nil {
		query = query.Where("year = ?", *req.Year)
	}

	// Apply area filter
	if req.AreaID != "" {
		query = query.Where("area_id = ?", req.AreaID)
	}

	// Apply status filter
	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
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
		sortBy = "year"
	}
	sortDir := req.SortDir
	if sortDir == "" {
		sortDir = "desc"
	}
	query = query.Order(sortBy + " " + sortDir)

	// Execute query with preloads
	err := query.
		Preload("Area").
		Preload("MonthlyTargets").
		Limit(perPage).
		Offset(offset).
		Find(&targets).Error
	if err != nil {
		return nil, 0, err
	}

	return targets, total, nil
}

func (r *yearlyTargetRepository) Create(ctx context.Context, yt *models.YearlyTarget) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		months := yt.MonthlyTargets
		yt.MonthlyTargets = nil

		if err := tx.Create(yt).Error; err != nil {
			return err
		}

		if len(months) > 0 {
			for i := range months {
				months[i].YearlyTargetID = yt.ID
				if err := tx.Create(&months[i]).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

func (r *yearlyTargetRepository) Update(ctx context.Context, yt *models.YearlyTarget) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		// Update target WITHOUT months
		if err := tx.Omit("MonthlyTargets").Save(yt).Error; err != nil {
			return err
		}

		// Delete existing months
		if err := tx.Where("yearly_target_id = ?", yt.ID).Delete(&models.MonthlyTarget{}).Error; err != nil {
			return err
		}

		// Create new months
		if len(yt.MonthlyTargets) > 0 {
			for i := range yt.MonthlyTargets {
				yt.MonthlyTargets[i].YearlyTargetID = yt.ID
				yt.MonthlyTargets[i].CreatedAt = apptime.Now()
				yt.MonthlyTargets[i].UpdatedAt = apptime.Now()
				if err := tx.Create(&yt.MonthlyTargets[i]).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

func (r *yearlyTargetRepository) Delete(ctx context.Context, id string) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete months first (cascade will handle this automatically)
		if err := tx.Where("yearly_target_id = ?", id).Delete(&models.MonthlyTarget{}).Error; err != nil {
			return err
		}

		// Delete target
		return tx.Delete(&models.YearlyTarget{}, "id = ?", id).Error
	})
}

func (r *yearlyTargetRepository) GetNextTargetNumber(ctx context.Context, prefix string) (string, error) {
	var count int64

	// Count records with this prefix + current year
	now := database.GetDB(ctx, r.db).NowFunc()
	year := now.Year()

	r.getDB(ctx).Model(&models.YearlyTarget{}).
		Where("code LIKE ?", fmt.Sprintf("%s-%d%%", prefix, year)).
		Count(&count)

	sequence := int(count) + 1
	code := fmt.Sprintf("%s-%d-%04d", prefix, year, sequence)

	return code, nil
}

func (r *yearlyTargetRepository) UpdateStatus(ctx context.Context, id string, status models.YearlyTargetStatus, userID *string, reason *string) error {
	updates := map[string]interface{}{
		"status": status,
	}

	switch status {
	case models.YearlyTargetStatusSubmitted:
		updates["submitted_by"] = userID
		updates["submitted_at"] = database.GetDB(ctx, r.db).NowFunc()
	case models.YearlyTargetStatusApproved:
		updates["approved_by"] = userID
		updates["approved_at"] = database.GetDB(ctx, r.db).NowFunc()
	case models.YearlyTargetStatusRejected:
		updates["rejected_by"] = userID
		updates["rejected_at"] = database.GetDB(ctx, r.db).NowFunc()
		if reason != nil {
			updates["rejection_reason"] = *reason
		}
	}

	return r.getDB(ctx).Model(&models.YearlyTarget{}).
		Where("id = ?", id).
		Updates(updates).Error
}
