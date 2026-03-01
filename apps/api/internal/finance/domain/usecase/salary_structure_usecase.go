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
	ErrSalaryStructureNotFound = errors.New("salary structure not found")
)

type SalaryStructureUsecase interface {
	Create(ctx context.Context, req *dto.CreateSalaryStructureRequest) (*dto.SalaryStructureResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateSalaryStructureRequest) (*dto.SalaryStructureResponse, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*dto.SalaryStructureResponse, error)
	List(ctx context.Context, req *dto.ListSalaryStructuresRequest) ([]dto.SalaryStructureResponse, int64, error)
	Approve(ctx context.Context, id string) (*dto.SalaryStructureResponse, error)
}

type salaryStructureUsecase struct {
	db     *gorm.DB
	repo   repositories.SalaryStructureRepository
	mapper *mapper.SalaryStructureMapper
}

func NewSalaryStructureUsecase(db *gorm.DB, repo repositories.SalaryStructureRepository, mapper *mapper.SalaryStructureMapper) SalaryStructureUsecase {
	return &salaryStructureUsecase{db: db, repo: repo, mapper: mapper}
}

func (uc *salaryStructureUsecase) Create(ctx context.Context, req *dto.CreateSalaryStructureRequest) (*dto.SalaryStructureResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)

	eff, err := time.Parse("2006-01-02", strings.TrimSpace(req.EffectiveDate))
	if err != nil {
		return nil, errors.New("invalid effective_date")
	}

	item := &financeModels.SalaryStructure{
		EmployeeID:    strings.TrimSpace(req.EmployeeID),
		EffectiveDate: eff,
		BasicSalary:   req.BasicSalary,
		Notes:         strings.TrimSpace(req.Notes),
		Status:        financeModels.SalaryStructureStatusDraft,
		CreatedBy:     &actorID,
	}

	if err := uc.db.WithContext(ctx).Create(item).Error; err != nil {
		return nil, err
	}

	res := uc.mapper.ToResponse(item)
	return &res, nil
}

func (uc *salaryStructureUsecase) Update(ctx context.Context, id string, req *dto.UpdateSalaryStructureRequest) (*dto.SalaryStructureResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}

	existing, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSalaryStructureNotFound
		}
		return nil, err
	}

	if existing.Status != financeModels.SalaryStructureStatusDraft {
		return nil, errors.New("only draft salary structure can be updated")
	}

	eff, err := time.Parse("2006-01-02", strings.TrimSpace(req.EffectiveDate))
	if err != nil {
		return nil, errors.New("invalid effective_date")
	}

	if err := uc.db.WithContext(ctx).Model(&financeModels.SalaryStructure{}).Where("id = ?", id).Updates(map[string]interface{}{
		"employee_id":    strings.TrimSpace(req.EmployeeID),
		"effective_date": eff,
		"basic_salary":   req.BasicSalary,
		"notes":          strings.TrimSpace(req.Notes),
	}).Error; err != nil {
		return nil, err
	}

	full, _ := uc.repo.FindByID(ctx, id)
	res := uc.mapper.ToResponse(full)
	return &res, nil
}

func (uc *salaryStructureUsecase) Delete(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("id is required")
	}
	existing, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrSalaryStructureNotFound
		}
		return err
	}
	if existing.Status != financeModels.SalaryStructureStatusDraft {
		return errors.New("only draft salary structure can be deleted")
	}
	return uc.db.WithContext(ctx).Delete(&financeModels.SalaryStructure{}, "id = ?", id).Error
}

func (uc *salaryStructureUsecase) GetByID(ctx context.Context, id string) (*dto.SalaryStructureResponse, error) {
	id = strings.TrimSpace(id)
	item, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSalaryStructureNotFound
		}
		return nil, err
	}
	res := uc.mapper.ToResponse(item)
	return &res, nil
}

func (uc *salaryStructureUsecase) List(ctx context.Context, req *dto.ListSalaryStructuresRequest) ([]dto.SalaryStructureResponse, int64, error) {
	if req == nil {
		req = &dto.ListSalaryStructuresRequest{}
	}
	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 10
	}

	var status *financeModels.SalaryStructureStatus
	if req.Status != nil && *req.Status != "" {
		s := financeModels.SalaryStructureStatus(*req.Status)
		status = &s
	}

	items, total, err := uc.repo.List(ctx, repositories.SalaryStructureListParams{
		Search:     req.Search,
		EmployeeID: req.EmployeeID,
		Status:     status,
		Limit:      perPage,
		Offset:     (page - 1) * perPage,
		SortBy:     req.SortBy,
		SortDir:    req.SortDir,
	})
	if err != nil {
		return nil, 0, err
	}

	res := make([]dto.SalaryStructureResponse, 0, len(items))
	for i := range items {
		res = append(res, uc.mapper.ToResponse(&items[i]))
	}
	return res, total, nil
}

func (uc *salaryStructureUsecase) Approve(ctx context.Context, id string) (*dto.SalaryStructureResponse, error) {
	id = strings.TrimSpace(id)
	item, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSalaryStructureNotFound
		}
		return nil, err
	}

	if item.Status != financeModels.SalaryStructureStatusDraft {
		return nil, errors.New("only draft salary structure can be approved")
	}

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Deactivate others
		if err := uc.repo.DeactivateAllByEmployeeID(ctx, tx, item.EmployeeID); err != nil {
			return err
		}
		// Activate this one
		if err := tx.Model(&financeModels.SalaryStructure{}).Where("id = ?", id).Update("status", financeModels.SalaryStructureStatusActive).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	full, _ := uc.repo.FindByID(ctx, id)
	res := uc.mapper.ToResponse(full)
	return &res, nil
}
