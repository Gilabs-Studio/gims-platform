package usecase

import (
	"context"
	"errors"
	"strings"
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrFinancialClosingNotFound = errors.New("financial closing not found")
)

type FinancialClosingUsecase interface {
	Create(ctx context.Context, req *dto.CreateFinancialClosingRequest) (*dto.FinancialClosingResponse, error)
	Approve(ctx context.Context, id string) (*dto.FinancialClosingResponse, error)
	GetByID(ctx context.Context, id string) (*dto.FinancialClosingResponse, error)
	List(ctx context.Context, req *dto.ListFinancialClosingsRequest) ([]dto.FinancialClosingResponse, int64, error)
}

type financialClosingUsecase struct {
	db     *gorm.DB
	repo   repositories.FinancialClosingRepository
	mapper *mapper.FinancialClosingMapper
}

func NewFinancialClosingUsecase(db *gorm.DB, repo repositories.FinancialClosingRepository, mapper *mapper.FinancialClosingMapper) FinancialClosingUsecase {
	return &financialClosingUsecase{db: db, repo: repo, mapper: mapper}
}

func (uc *financialClosingUsecase) Create(ctx context.Context, req *dto.CreateFinancialClosingRequest) (*dto.FinancialClosingResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	periodEnd, err := time.Parse("2006-01-02", strings.TrimSpace(req.PeriodEndDate))
	if err != nil {
		return nil, errors.New("invalid period_end_date")
	}

	item := &financeModels.FinancialClosing{
		PeriodEndDate: periodEnd,
		Status:        financeModels.FinancialClosingStatusDraft,
		Notes:         strings.TrimSpace(req.Notes),
		CreatedBy:     &actorID,
	}
	if err := uc.db.WithContext(ctx).Create(item).Error; err != nil {
		return nil, err
	}

	res := uc.mapper.ToResponse(item)
	return &res, nil
}

func (uc *financialClosingUsecase) Approve(ctx context.Context, id string) (*dto.FinancialClosingResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	item, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrFinancialClosingNotFound
		}
		return nil, err
	}
	if item.Status == financeModels.FinancialClosingStatusApproved {
		res := uc.mapper.ToResponse(item)
		return &res, nil
	}

	// disallow approving older/equal periods than latest approved
	latest, err := uc.repo.LatestApproved(ctx)
	if err == nil {
		if !item.PeriodEndDate.After(latest.PeriodEndDate) {
			return nil, errors.New("cannot approve closing period on/before latest approved period")
		}
	}

	now := time.Now()
	if err := uc.db.WithContext(ctx).Model(&financeModels.FinancialClosing{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":      financeModels.FinancialClosingStatusApproved,
		"approved_at": now,
		"approved_by": actorID,
	}).Error; err != nil {
		return nil, err
	}

	full, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	res := uc.mapper.ToResponse(full)
	return &res, nil
}

func (uc *financialClosingUsecase) GetByID(ctx context.Context, id string) (*dto.FinancialClosingResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	item, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrFinancialClosingNotFound
		}
		return nil, err
	}
	res := uc.mapper.ToResponse(item)
	return &res, nil
}

func (uc *financialClosingUsecase) List(ctx context.Context, req *dto.ListFinancialClosingsRequest) ([]dto.FinancialClosingResponse, int64, error) {
	if req == nil {
		req = &dto.ListFinancialClosingsRequest{}
	}
	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 10
	}
	if perPage > 100 {
		perPage = 100
	}

	items, total, err := uc.repo.List(ctx, repositories.FinancialClosingListParams{
		SortBy:  req.SortBy,
		SortDir: req.SortDir,
		Limit:   perPage,
		Offset:  (page - 1) * perPage,
	})
	if err != nil {
		return nil, 0, err
	}

	res := make([]dto.FinancialClosingResponse, 0, len(items))
	for i := range items {
		mapped := uc.mapper.ToResponse(&items[i])
		res = append(res, mapped)
	}
	return res, total, nil
}
