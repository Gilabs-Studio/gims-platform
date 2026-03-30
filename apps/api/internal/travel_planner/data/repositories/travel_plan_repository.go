package repositories

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/travel_planner/data/models"
	"gorm.io/gorm"
)

type TravelPlanListParams struct {
	Search    string
	Mode      *models.TravelMode
	Status    *models.TravelPlanStatus
	StartDate *time.Time
	EndDate   *time.Time
	Limit     int
	Offset    int
}

type TravelPlanRepository interface {
	GenerateCode(ctx context.Context, now time.Time) (string, error)
	Create(ctx context.Context, plan *models.TravelPlan) error
	Update(ctx context.Context, plan *models.TravelPlan) error
	Delete(ctx context.Context, id string) error
	FindByID(ctx context.Context, id string, withRelations bool) (*models.TravelPlan, error)
	List(ctx context.Context, params TravelPlanListParams) ([]models.TravelPlan, int64, error)
	ReplaceDays(ctx context.Context, planID string, days []models.TravelPlanDay) error
}

type travelPlanRepository struct {
	db *gorm.DB
}

func NewTravelPlanRepository(db *gorm.DB) TravelPlanRepository {
	return &travelPlanRepository{db: db}
}

func (r *travelPlanRepository) GenerateCode(ctx context.Context, now time.Time) (string, error) {
	prefix := fmt.Sprintf("TPL-%s", now.Format("200601"))

	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.TravelPlan{}).
		Where("code LIKE ?", prefix+"-%").
		Count(&count).Error
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s-%04d", prefix, count+1), nil
}

func (r *travelPlanRepository) Create(ctx context.Context, plan *models.TravelPlan) error {
	return r.db.WithContext(ctx).Create(plan).Error
}

func (r *travelPlanRepository) Update(ctx context.Context, plan *models.TravelPlan) error {
	return r.db.WithContext(ctx).Save(plan).Error
}

func (r *travelPlanRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.TravelPlan{}, "id = ?", id).Error
}

func (r *travelPlanRepository) FindByID(ctx context.Context, id string, withRelations bool) (*models.TravelPlan, error) {
	q := r.db.WithContext(ctx).Model(&models.TravelPlan{})

	if withRelations {
		q = q.
			Preload("Days", func(db *gorm.DB) *gorm.DB {
				return db.Order("day_index ASC")
			}).
			Preload("Days.Stops", func(db *gorm.DB) *gorm.DB {
				return db.Order("order_index ASC")
			}).
			Preload("Days.Notes", func(db *gorm.DB) *gorm.DB {
				return db.Order("order_index ASC")
			})
	}

	var plan models.TravelPlan
	if err := q.Where("id = ?", id).First(&plan).Error; err != nil {
		return nil, err
	}

	return &plan, nil
}

func (r *travelPlanRepository) List(ctx context.Context, params TravelPlanListParams) ([]models.TravelPlan, int64, error) {
	q := r.db.WithContext(ctx).Model(&models.TravelPlan{})

	if strings.TrimSpace(params.Search) != "" {
		like := "%" + strings.TrimSpace(params.Search) + "%"
		q = q.Where("code ILIKE ? OR title ILIKE ? OR notes ILIKE ?", like, like, like)
	}
	if params.Mode != nil {
		q = q.Where("mode = ?", *params.Mode)
	}
	if params.Status != nil {
		q = q.Where("status = ?", *params.Status)
	}
	if params.StartDate != nil {
		q = q.Where("start_date >= ?", *params.StartDate)
	}
	if params.EndDate != nil {
		q = q.Where("end_date <= ?", *params.EndDate)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var plans []models.TravelPlan
	if err := q.
		Order("created_at DESC").
		Limit(params.Limit).
		Offset(params.Offset).
		Find(&plans).Error; err != nil {
		return nil, 0, err
	}

	return plans, total, nil
}

func (r *travelPlanRepository) ReplaceDays(ctx context.Context, planID string, days []models.TravelPlanDay) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("travel_plan_id = ?", planID).Delete(&models.TravelPlanDay{}).Error; err != nil {
			return err
		}

		for i := range days {
			days[i].TravelPlanID = planID
			if err := tx.Create(&days[i]).Error; err != nil {
				return err
			}
		}

		return nil
	})
}
