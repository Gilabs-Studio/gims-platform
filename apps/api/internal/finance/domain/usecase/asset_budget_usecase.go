package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrAssetBudgetNotFound = errors.New("asset budget not found")
	ErrInvalidBudgetStatus = errors.New("invalid budget status transition")
	ErrBudgetHasUsage      = errors.New("budget has usage and cannot be deleted")
	ErrActiveBudgetExists  = errors.New("active budget already exists for this fiscal year")
)

type AssetBudgetUsecase interface {
	Create(ctx context.Context, req *dto.CreateAssetBudgetRequest) (*dto.AssetBudgetResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateAssetBudgetRequest) (*dto.AssetBudgetResponse, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*dto.AssetBudgetResponse, error)
	GetByCode(ctx context.Context, code string) (*dto.AssetBudgetResponse, error)
	List(ctx context.Context, req *dto.ListAssetBudgetsRequest) ([]dto.AssetBudgetResponse, int64, error)
	ChangeStatus(ctx context.Context, id string, status models.AssetBudgetStatus) (*dto.AssetBudgetResponse, error)
	GetFormData(ctx context.Context) (*dto.AssetBudgetFormDataResponse, error)
}

type assetBudgetUsecase struct {
	db      *gorm.DB
	repo    repositories.AssetBudgetRepository
	catRepo repositories.AssetCategoryRepository
	mapper  *mapper.AssetBudgetMapper
}

func NewAssetBudgetUsecase(db *gorm.DB, repo repositories.AssetBudgetRepository, catRepo repositories.AssetCategoryRepository, mapper *mapper.AssetBudgetMapper) AssetBudgetUsecase {
	return &assetBudgetUsecase{
		db:      db,
		repo:    repo,
		catRepo: catRepo,
		mapper:  mapper,
	}
}

func (uc *assetBudgetUsecase) Create(ctx context.Context, req *dto.CreateAssetBudgetRequest) (*dto.AssetBudgetResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	// Check if active budget exists for this fiscal year
	activeStatusStr := string(models.AssetBudgetStatusActive)
	existingBudgets, _, err := uc.repo.List(ctx, repositories.AssetBudgetListParams{
		FiscalYear: &req.FiscalYear,
		Status:     &activeStatusStr,
		Limit:      1,
	})
	if err == nil && len(existingBudgets) > 0 {
		return nil, ErrActiveBudgetExists
	}

	budget, err := uc.mapper.ToModel(req)
	if err != nil {
		return nil, err
	}

	// Generate budget code
	code, err := uc.repo.GenerateCode(ctx)
	if err != nil {
		return nil, err
	}
	budget.BudgetCode = code
	budget.CreatedBy = &actorID

	if err := uc.repo.Create(ctx, budget); err != nil {
		return nil, fmt.Errorf("failed to create budget: %w", err)
	}

	// Reload with categories
	created, err := uc.repo.FindByID(ctx, budget.ID)
	if err != nil {
		return nil, err
	}

	resp := uc.mapper.ToResponse(created, true)
	return &resp, nil
}

func (uc *assetBudgetUsecase) Update(ctx context.Context, id string, req *dto.UpdateAssetBudgetRequest) (*dto.AssetBudgetResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}

	budget, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrAssetBudgetNotFound
		}
		return nil, err
	}

	// Only draft or active budgets can be updated
	if budget.Status != models.AssetBudgetStatusDraft && budget.Status != models.AssetBudgetStatusActive {
		return nil, errors.New("only draft or active budgets can be updated")
	}

	// Check if any category has usage
	for _, cat := range budget.Categories {
		if cat.UsedAmount > 0 || cat.CommittedAmount > 0 {
			return nil, errors.New("cannot update budget with usage, create new revision instead")
		}
	}

	if err := uc.mapper.UpdateModel(budget, req); err != nil {
		return nil, err
	}

	if err := uc.repo.Update(ctx, budget); err != nil {
		return nil, fmt.Errorf("failed to update budget: %w", err)
	}

	// Reload
	updated, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	resp := uc.mapper.ToResponse(updated, true)
	return &resp, nil
}

func (uc *assetBudgetUsecase) Delete(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("id is required")
	}

	budget, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrAssetBudgetNotFound
		}
		return err
	}

	// Only draft budgets can be deleted
	if budget.Status != models.AssetBudgetStatusDraft {
		return errors.New("only draft budgets can be deleted")
	}

	return uc.repo.Delete(ctx, id)
}

func (uc *assetBudgetUsecase) GetByID(ctx context.Context, id string) (*dto.AssetBudgetResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}

	budget, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrAssetBudgetNotFound
		}
		return nil, err
	}

	resp := uc.mapper.ToResponse(budget, true)
	return &resp, nil
}

func (uc *assetBudgetUsecase) GetByCode(ctx context.Context, code string) (*dto.AssetBudgetResponse, error) {
	code = strings.TrimSpace(code)
	if code == "" {
		return nil, errors.New("code is required")
	}

	budget, err := uc.repo.FindByCode(ctx, code)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrAssetBudgetNotFound
		}
		return nil, err
	}

	resp := uc.mapper.ToResponse(budget, true)
	return &resp, nil
}

func (uc *assetBudgetUsecase) List(ctx context.Context, req *dto.ListAssetBudgetsRequest) ([]dto.AssetBudgetResponse, int64, error) {
	if req == nil {
		req = &dto.ListAssetBudgetsRequest{}
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

	var status *string
	if req.Status != nil {
		status = req.Status
	}

	params := repositories.AssetBudgetListParams{
		FiscalYear: req.FiscalYear,
		Status:     status,
		Search:     req.Search,
		SortBy:     req.SortBy,
		SortDir:    req.SortDir,
		Limit:      perPage,
		Offset:     (page - 1) * perPage,
	}

	budgets, total, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}

	resp := make([]dto.AssetBudgetResponse, 0, len(budgets))
	for _, budget := range budgets {
		mapped := uc.mapper.ToResponse(&budget, true)
		resp = append(resp, mapped)
	}

	return resp, total, nil
}

func (uc *assetBudgetUsecase) ChangeStatus(ctx context.Context, id string, status models.AssetBudgetStatus) (*dto.AssetBudgetResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}

	budget, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrAssetBudgetNotFound
		}
		return nil, err
	}

	// Validate status transition
	currentStatus := budget.Status
	validTransition := false

	switch currentStatus {
	case models.AssetBudgetStatusDraft:
		validTransition = status == models.AssetBudgetStatusActive || status == models.AssetBudgetStatusCancelled
	case models.AssetBudgetStatusActive:
		validTransition = status == models.AssetBudgetStatusClosed
	case models.AssetBudgetStatusClosed:
		validTransition = false // Cannot change from closed
	case models.AssetBudgetStatusCancelled:
		validTransition = false // Cannot change from cancelled
	}

	if !validTransition {
		return nil, ErrInvalidBudgetStatus
	}

	budget.Status = status
	if err := uc.repo.Update(ctx, budget); err != nil {
		return nil, fmt.Errorf("failed to update status: %w", err)
	}

	resp := uc.mapper.ToResponse(budget, true)
	return &resp, nil
}

func (uc *assetBudgetUsecase) GetFormData(ctx context.Context) (*dto.AssetBudgetFormDataResponse, error) {
	categories, _, err := uc.catRepo.List(ctx, repositories.AssetCategoryListParams{
		Limit: 100,
	})
	if err != nil {
		return nil, err
	}

	catResp := make([]dto.AssetCategoryMini, 0, len(categories))
	for _, cat := range categories {
		catResp = append(catResp, dto.AssetCategoryMini{
			ID:   cat.ID,
			Name: cat.Name,
		})
	}

	return &dto.AssetBudgetFormDataResponse{
		Categories: catResp,
	}, nil
}
