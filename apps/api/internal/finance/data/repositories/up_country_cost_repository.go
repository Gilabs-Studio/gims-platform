package repositories

import (
	"context"
	"fmt"
	"strings"
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

type UpCountryCostListParams struct {
	Search    string
	StartDate *time.Time
	EndDate   *time.Time
	Status    *financeModels.UpCountryCostStatus
	Limit     int
	Offset    int
	SortBy    string
	SortDir   string
}

type UpCountryCostRepository interface {
	FindByID(ctx context.Context, id string, withRelations bool) (*financeModels.UpCountryCost, error)
	List(ctx context.Context, params UpCountryCostListParams) ([]financeModels.UpCountryCost, int64, error)
	GenerateCode(ctx context.Context, now time.Time) (string, error)
}

type upCountryCostRepository struct {
	db *gorm.DB
}

func NewUpCountryCostRepository(db *gorm.DB) UpCountryCostRepository {
	return &upCountryCostRepository{db: db}
}

func (r *upCountryCostRepository) FindByID(ctx context.Context, id string, withRelations bool) (*financeModels.UpCountryCost, error) {
	var item financeModels.UpCountryCost
	q := r.db.WithContext(ctx)
	if withRelations {
		q = q.Preload("Employees").Preload("Items")
	}
	if err := q.First(&item, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *upCountryCostRepository) List(ctx context.Context, params UpCountryCostListParams) ([]financeModels.UpCountryCost, int64, error) {
	var items []financeModels.UpCountryCost
	var total int64

	q := r.db.WithContext(ctx).Model(&financeModels.UpCountryCost{})

	if s := strings.TrimSpace(params.Search); s != "" {
		like := "%" + s + "%"
		q = q.Where("code ILIKE ? OR purpose ILIKE ? OR location ILIKE ?", like, like, like)
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

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := "created_at"
	if params.SortBy != "" {
		sortCol = params.SortBy
	}
	sortDir := "DESC"
	if strings.ToUpper(params.SortDir) == "ASC" {
		sortDir = "ASC"
	}
	q = q.Order(sortCol + " " + sortDir)

	if params.Limit > 0 {
		q = q.Limit(params.Limit)
		q = q.Offset(params.Offset)
	}

	if err := q.Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *upCountryCostRepository) GenerateCode(ctx context.Context, now time.Time) (string, error) {
	prefix := "UCC-" + now.Format("200601") + "-"
	var count int64
	if err := r.db.WithContext(ctx).Model(&financeModels.UpCountryCost{}).
		Where("code LIKE ?", prefix+"%").
		Count(&count).Error; err != nil {
		return "", err
	}
	return prefix + fmt.Sprintf("%04d", count+1), nil
}
