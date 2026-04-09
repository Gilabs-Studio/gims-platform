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
	ErrCOANotFound          = errors.New("chart of account not found")
	ErrCOACodeAlreadyExists = errors.New("chart of account code already exists")
	ErrCOAInvalidParent     = errors.New("invalid parent account")
	ErrCOAProtected         = errors.New("chart of account is protected")
	ErrCOAHasChildren       = errors.New("chart of account has child accounts")
	ErrCOAHasTransactions   = errors.New("chart of account already used in transactions")
)

type ChartOfAccountUsecase interface {
	Create(ctx context.Context, req *dto.CreateChartOfAccountRequest) (*dto.ChartOfAccountResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateChartOfAccountRequest) (*dto.ChartOfAccountResponse, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*dto.ChartOfAccountResponse, error)
	List(ctx context.Context, req *dto.ListChartOfAccountsRequest) ([]dto.ChartOfAccountResponse, int64, error)
	Tree(ctx context.Context, onlyActive bool) ([]dto.ChartOfAccountTreeNode, error)
	GetByCode(ctx context.Context, code string) (*dto.ChartOfAccountResponse, error)
	RecalculateAllIsPostable(ctx context.Context) error
}

type openingBalanceJournalManager interface {
	CreateOpeningBalanceJournal(ctx context.Context, account *financeModels.ChartOfAccount) (*dto.JournalEntryResponse, error)
	ReverseOpeningBalance(ctx context.Context, accountID string) (*dto.JournalEntryResponse, error)
}

type chartOfAccountUsecase struct {
	db             *gorm.DB
	repo           repositories.ChartOfAccountRepository
	mapper         *mapper.ChartOfAccountMapper
	journalManager openingBalanceJournalManager
}

func NewChartOfAccountUsecase(db *gorm.DB, repo repositories.ChartOfAccountRepository, mapper *mapper.ChartOfAccountMapper, journalManagers ...openingBalanceJournalManager) ChartOfAccountUsecase {
	uc := &chartOfAccountUsecase{db: db, repo: repo, mapper: mapper}
	if len(journalManagers) > 0 {
		uc.journalManager = journalManagers[0]
	}
	return uc
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
	openingDate, err := parseDateOptional(req.OpeningDate)
	if err != nil {
		return nil, err
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
		Code:           req.Code,
		Name:           req.Name,
		Type:           req.Type,
		ParentID:       parentID,
		IsActive:       isActive,
		IsPostable:     true,
		OpeningBalance: req.OpeningBalance,
		OpeningDate:    openingDate,
	}
	if err := uc.repo.Create(ctx, item); err != nil {
		return nil, err
	}
	if err := uc.repo.RecalculateAllIsPostable(ctx); err != nil {
		return nil, err
	}
	created, err := uc.repo.FindByID(ctx, item.ID)
	if err != nil {
		return nil, err
	}
	if err := uc.handleOpeningBalance(ctx, created, 0); err != nil {
		return nil, err
	}
	resp := uc.mapper.ToResponse(created)
	resp.Level = uc.calculateLevel(ctx, created)
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
	if existing.IsProtected {
		return nil, ErrCOAProtected
	}
	oldOpeningBalance := existing.OpeningBalance
	oldOpeningDate := cloneDatePtr(existing.OpeningDate)

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
			if err := uc.validateNoCircularParent(ctx, id, p); err != nil {
				return nil, err
			}
			parentID = &p
		}
	}
	openingDate, err := parseDateOptional(req.OpeningDate)
	if err != nil {
		return nil, err
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
	existing.OpeningBalance = req.OpeningBalance
	existing.OpeningDate = openingDate

	if err := uc.repo.Update(ctx, existing); err != nil {
		return nil, err
	}
	if err := uc.repo.RecalculateAllIsPostable(ctx); err != nil {
		return nil, err
	}
	updated, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if oldOpeningBalance != updated.OpeningBalance || !sameDate(oldOpeningDate, updated.OpeningDate) {
		if err := uc.handleOpeningBalance(ctx, updated, oldOpeningBalance); err != nil {
			return nil, err
		}
	}
	resp := uc.mapper.ToResponse(updated)
	resp.Level = uc.calculateLevel(ctx, updated)
	return &resp, nil
}

func (uc *chartOfAccountUsecase) Delete(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("id is required")
	}
	existing, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrCOANotFound
		}
		return err
	}
	if existing.IsProtected {
		return ErrCOAProtected
	}
	hasChildren, err := uc.repo.HasChildren(ctx, id)
	if err != nil {
		return err
	}
	if hasChildren {
		return ErrCOAHasChildren
	}
	hasJournalLines, err := uc.repo.IsUsedInJournal(ctx, id)
	if err != nil {
		return err
	}
	if hasJournalLines {
		return ErrCOAHasTransactions
	}
	if err := uc.repo.Delete(ctx, id); err != nil {
		return err
	}
	return uc.repo.RecalculateAllIsPostable(ctx)
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
	resp.Level = uc.calculateLevel(ctx, item)
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
		row := uc.mapper.ToResponse(&items[i])
		row.Level = uc.calculateLevel(ctx, &items[i])
		resp = append(resp, row)
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

	var buildTree func(parentID *string, visited map[string]bool, depth int) []dto.ChartOfAccountTreeNode
	buildTree = func(parentID *string, visited map[string]bool, depth int) []dto.ChartOfAccountTreeNode {
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
				ID:             it.ID,
				Code:           it.Code,
				Name:           it.Name,
				Type:           it.Type,
				ParentID:       it.ParentID,
				IsActive:       it.IsActive,
				IsPostable:     it.IsPostable,
				IsProtected:    it.IsProtected,
				Level:          depth,
				OpeningBalance: it.OpeningBalance,
				OpeningDate:    formatDatePtr(it.OpeningDate),
			}
			cid := it.ID
			node.Children = buildTree(&cid, visited, depth+1)
			out = append(out, node)
		}
		return out
	}

	roots := buildTree(nil, map[string]bool{}, 0)
	if len(orphans) > 0 {
		for _, it := range orphans {
			node := dto.ChartOfAccountTreeNode{
				ID:             it.ID,
				Code:           it.Code,
				Name:           it.Name,
				Type:           it.Type,
				ParentID:       it.ParentID,
				IsActive:       it.IsActive,
				IsPostable:     it.IsPostable,
				IsProtected:    it.IsProtected,
				Level:          uc.calculateLevel(ctx, &it),
				OpeningBalance: it.OpeningBalance,
				OpeningDate:    formatDatePtr(it.OpeningDate),
				Children:       nil,
			}
			cid := it.ID
			node.Children = buildTree(&cid, map[string]bool{it.ID: true}, node.Level+1)
			roots = append(roots, node)
		}
	}
	return roots, nil
}

func (uc *chartOfAccountUsecase) GetByCode(ctx context.Context, code string) (*dto.ChartOfAccountResponse, error) {
	code = strings.TrimSpace(code)
	if code == "" {
		return nil, errors.New("code is required")
	}
	item, err := uc.repo.FindByCode(ctx, code)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrCOANotFound
		}
		return nil, err
	}
	resp := uc.mapper.ToResponse(item)
	resp.Level = uc.calculateLevel(ctx, item)
	return &resp, nil
}

func (uc *chartOfAccountUsecase) RecalculateAllIsPostable(ctx context.Context) error {
	return uc.repo.RecalculateAllIsPostable(ctx)
}

func (uc *chartOfAccountUsecase) handleOpeningBalance(ctx context.Context, account *financeModels.ChartOfAccount, oldBalance float64) error {
	if account == nil {
		return nil
	}
	if account.OpeningBalance == 0 && oldBalance == 0 {
		return nil
	}
	if !account.IsPostable {
		return errors.New("opening balance can only be set for postable accounts")
	}
	if uc.journalManager == nil {
		return errors.New("opening balance journal manager is not configured")
	}
	if _, err := uc.repo.FindOpeningBalanceEquity(ctx); err != nil {
		return errors.New("akun Saldo Awal Ekuitas (3-9999) belum dikonfigurasi")
	}
	if oldBalance != 0 {
		if _, err := uc.journalManager.ReverseOpeningBalance(ctx, account.ID); err != nil {
			return err
		}
	}
	if account.OpeningBalance != 0 {
		_, err := uc.journalManager.CreateOpeningBalanceJournal(ctx, account)
		return err
	}
	return nil
}

func (uc *chartOfAccountUsecase) validateNoCircularParent(ctx context.Context, accountID, parentID string) error {
	current := strings.TrimSpace(parentID)
	for current != "" {
		if current == accountID {
			return ErrCOAInvalidParent
		}
		item, err := uc.repo.FindByID(ctx, current)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				break
			}
			return err
		}
		if item.ParentID == nil || strings.TrimSpace(*item.ParentID) == "" {
			break
		}
		current = strings.TrimSpace(*item.ParentID)
	}
	return nil
}

func formatDatePtr(value *time.Time) *string {
	if value == nil {
		return nil
	}
	v := value.Format("2006-01-02")
	return &v
}

func cloneDatePtr(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	v := *value
	return &v
}

func sameDate(a, b *time.Time) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return a.Format("2006-01-02") == b.Format("2006-01-02")
}

func (uc *chartOfAccountUsecase) calculateLevel(ctx context.Context, item *financeModels.ChartOfAccount) int {
	if item == nil || item.ParentID == nil || strings.TrimSpace(*item.ParentID) == "" {
		return 0
	}

	level := 0
	visited := map[string]bool{}
	currentParentID := strings.TrimSpace(*item.ParentID)
	for currentParentID != "" {
		if visited[currentParentID] {
			break
		}
		visited[currentParentID] = true
		level++

		parent, err := uc.repo.FindByID(ctx, currentParentID)
		if err != nil || parent == nil || parent.ParentID == nil || strings.TrimSpace(*parent.ParentID) == "" {
			break
		}
		currentParentID = strings.TrimSpace(*parent.ParentID)
	}

	return level
}
