package usecase

import (
	"context"
	"errors"
	"strings"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrCOANotFound          = errors.New("chart of account not found")
	ErrCOACodeAlreadyExists = errors.New("chart of account code already exists")
	ErrCOAInvalidParent     = errors.New("invalid parent account")
)

type ChartOfAccountUsecase interface {
	Create(ctx context.Context, req *dto.CreateChartOfAccountRequest) (*dto.ChartOfAccountResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateChartOfAccountRequest) (*dto.ChartOfAccountResponse, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*dto.ChartOfAccountResponse, error)
	List(ctx context.Context, req *dto.ListChartOfAccountsRequest) ([]dto.ChartOfAccountResponse, int64, error)
	Tree(ctx context.Context, onlyActive bool) ([]dto.ChartOfAccountTreeNode, error)
}

type chartOfAccountUsecase struct {
	repo   repositories.ChartOfAccountRepository
	mapper *mapper.ChartOfAccountMapper
}

func NewChartOfAccountUsecase(db *gorm.DB, repo repositories.ChartOfAccountRepository, mapper *mapper.ChartOfAccountMapper) ChartOfAccountUsecase {
	_ = db
	return &chartOfAccountUsecase{repo: repo, mapper: mapper}
}

func (uc *chartOfAccountUsecase) Create(ctx context.Context, req *dto.CreateChartOfAccountRequest) (*dto.ChartOfAccountResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}
	req.Code = strings.TrimSpace(req.Code)
	req.Name = strings.TrimSpace(req.Name)
	if req.Code == "" || req.Name == "" {
		return nil, errors.New("code and name are required")
	}

	exists, err := uc.repo.ExistsByCode(ctx, req.Code, nil)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrCOACodeAlreadyExists
	}

	if req.ParentID != nil && strings.TrimSpace(*req.ParentID) != "" {
		if _, err := uc.repo.FindByID(ctx, strings.TrimSpace(*req.ParentID)); err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, ErrCOAInvalidParent
			}
			return nil, err
		}
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	var parentID *string
	if req.ParentID != nil {
		p := strings.TrimSpace(*req.ParentID)
		if p != "" {
			parentID = &p
		}
	}

	item := &financeModels.ChartOfAccount{
		Code:     req.Code,
		Name:     req.Name,
		Type:     req.Type,
		ParentID: parentID,
		IsActive: isActive,
	}
	if err := uc.repo.Create(ctx, item); err != nil {
		return nil, err
	}
	resp := uc.mapper.ToResponse(item)
	return &resp, nil
}

func (uc *chartOfAccountUsecase) Update(ctx context.Context, id string, req *dto.UpdateChartOfAccountRequest) (*dto.ChartOfAccountResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}
	req.Code = strings.TrimSpace(req.Code)
	req.Name = strings.TrimSpace(req.Name)
	if req.Code == "" || req.Name == "" {
		return nil, errors.New("code and name are required")
	}

	existing, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrCOANotFound
		}
		return nil, err
	}

	excludeID := existing.ID
	exists, err := uc.repo.ExistsByCode(ctx, req.Code, &excludeID)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrCOACodeAlreadyExists
	}

	var parentID *string
	if req.ParentID != nil {
		p := strings.TrimSpace(*req.ParentID)
		if p != "" {
			if p == id {
				return nil, ErrCOAInvalidParent
			}
			if _, err := uc.repo.FindByID(ctx, p); err != nil {
				if err == gorm.ErrRecordNotFound {
					return nil, ErrCOAInvalidParent
				}
				return nil, err
			}
			parentID = &p
		}
	}

	isActive := existing.IsActive
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	existing.Code = req.Code
	existing.Name = req.Name
	existing.Type = req.Type
	existing.ParentID = parentID
	existing.IsActive = isActive

	if err := uc.repo.Update(ctx, existing); err != nil {
		return nil, err
	}
	resp := uc.mapper.ToResponse(existing)
	return &resp, nil
}

func (uc *chartOfAccountUsecase) Delete(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("id is required")
	}
	if _, err := uc.repo.FindByID(ctx, id); err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrCOANotFound
		}
		return err
	}
	return uc.repo.Delete(ctx, id)
}

func (uc *chartOfAccountUsecase) GetByID(ctx context.Context, id string) (*dto.ChartOfAccountResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	item, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrCOANotFound
		}
		return nil, err
	}
	resp := uc.mapper.ToResponse(item)
	return &resp, nil
}

func (uc *chartOfAccountUsecase) List(ctx context.Context, req *dto.ListChartOfAccountsRequest) ([]dto.ChartOfAccountResponse, int64, error) {
	if req == nil {
		req = &dto.ListChartOfAccountsRequest{}
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

	params := repositories.ChartOfAccountListParams{
		Search:   req.Search,
		Type:     req.Type,
		ParentID: req.ParentID,
		IsActive: req.IsActive,
		SortBy:   req.SortBy,
		SortDir:  req.SortDir,
		Limit:    perPage,
		Offset:   (page - 1) * perPage,
	}

	items, total, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}

	resp := make([]dto.ChartOfAccountResponse, 0, len(items))
	for i := range items {
		resp = append(resp, uc.mapper.ToResponse(&items[i]))
	}
	return resp, total, nil
}

func (uc *chartOfAccountUsecase) Tree(ctx context.Context, onlyActive bool) ([]dto.ChartOfAccountTreeNode, error) {
	items, err := uc.repo.FindAll(ctx, onlyActive)
	if err != nil {
		return nil, err
	}

	childrenByParent := make(map[string][]financeModels.ChartOfAccount)
	orphans := make([]financeModels.ChartOfAccount, 0)
	existsByID := make(map[string]bool, len(items))
	for _, it := range items {
		existsByID[it.ID] = true
	}

	for _, it := range items {
		if it.ParentID == nil || strings.TrimSpace(*it.ParentID) == "" {
			continue
		}
		pid := strings.TrimSpace(*it.ParentID)
		if !existsByID[pid] {
			orphans = append(orphans, it)
			continue
		}
		childrenByParent[pid] = append(childrenByParent[pid], it)
	}

	var buildTree func(parentID *string, visited map[string]bool) []dto.ChartOfAccountTreeNode
	buildTree = func(parentID *string, visited map[string]bool) []dto.ChartOfAccountTreeNode {
		out := make([]dto.ChartOfAccountTreeNode, 0)
		var children []financeModels.ChartOfAccount
		if parentID != nil {
			children = childrenByParent[strings.TrimSpace(*parentID)]
		} else {
			// roots: ParentID nil OR empty OR parent missing (handled via orphans appended later)
			for _, it := range items {
				if it.ParentID == nil || strings.TrimSpace(*it.ParentID) == "" {
					children = append(children, it)
				}
			}
		}

		for _, it := range children {
			if visited[it.ID] {
				continue
			}
			visited[it.ID] = true
			node := dto.ChartOfAccountTreeNode{
				ID:       it.ID,
				Code:     it.Code,
				Name:     it.Name,
				Type:     it.Type,
				ParentID: it.ParentID,
				IsActive: it.IsActive,
			}
			cid := it.ID
			node.Children = buildTree(&cid, visited)
			out = append(out, node)
		}
		return out
	}

	roots := buildTree(nil, map[string]bool{})
	if len(orphans) > 0 {
		for _, it := range orphans {
			node := dto.ChartOfAccountTreeNode{
				ID:       it.ID,
				Code:     it.Code,
				Name:     it.Name,
				Type:     it.Type,
				ParentID: it.ParentID,
				IsActive: it.IsActive,
				Children: nil,
			}
			cid := it.ID
			node.Children = buildTree(&cid, map[string]bool{it.ID: true})
			roots = append(roots, node)
		}
	}
	return roots, nil
}
