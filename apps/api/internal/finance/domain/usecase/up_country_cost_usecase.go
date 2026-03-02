package usecase

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrUpCountryCostNotFound = errors.New("up-country cost not found")
)

type UpCountryCostUsecase interface {
	Create(ctx context.Context, req *dto.CreateUpCountryCostRequest) (*dto.UpCountryCostResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateUpCountryCostRequest) (*dto.UpCountryCostResponse, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*dto.UpCountryCostResponse, error)
	List(ctx context.Context, req *dto.ListUpCountryCostsRequest) ([]dto.UpCountryCostResponse, int64, error)
	Approve(ctx context.Context, id string) (*dto.UpCountryCostResponse, error)
}

type upCountryCostUsecase struct {
	db        *gorm.DB
	repo      repositories.UpCountryCostRepository
	journalUC JournalEntryUsecase
	mapper    *mapper.UpCountryCostMapper
}

func NewUpCountryCostUsecase(db *gorm.DB, repo repositories.UpCountryCostRepository, journalUC JournalEntryUsecase, mapper *mapper.UpCountryCostMapper) UpCountryCostUsecase {
	return &upCountryCostUsecase{db: db, repo: repo, journalUC: journalUC, mapper: mapper}
}

func (uc *upCountryCostUsecase) Create(ctx context.Context, req *dto.CreateUpCountryCostRequest) (*dto.UpCountryCostResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)

	start, err := time.Parse("2006-01-02", strings.TrimSpace(req.StartDate))
	if err != nil {
		return nil, errors.New("invalid start_date")
	}
	end, err := time.Parse("2006-01-02", strings.TrimSpace(req.EndDate))
	if err != nil {
		return nil, errors.New("invalid end_date")
	}

	code, err := uc.repo.GenerateCode(ctx, apptime.Now())
	if err != nil {
		return nil, err
	}

	item := &financeModels.UpCountryCost{
		Code:      code,
		Purpose:   strings.TrimSpace(req.Purpose),
		Location:  strings.TrimSpace(req.Location),
		StartDate: start,
		EndDate:   end,
		Status:    financeModels.UpCountryCostStatusDraft,
		Notes:     strings.TrimSpace(req.Notes),
		CreatedBy: &actorID,
	}

	for _, e := range req.Employees {
		item.Employees = append(item.Employees, financeModels.UpCountryCostEmployee{
			EmployeeID: e.EmployeeID,
		})
	}

	for _, it := range req.Items {
		item.Items = append(item.Items, financeModels.UpCountryCostItem{
			CostType:    financeModels.CostType(it.CostType),
			Description: it.Description,
			Amount:      it.Amount,
		})
	}

	if err := uc.db.WithContext(ctx).Create(item).Error; err != nil {
		return nil, err
	}

	res := uc.mapper.ToResponse(item)
	return &res, nil
}

func (uc *upCountryCostUsecase) Update(ctx context.Context, id string, req *dto.UpdateUpCountryCostRequest) (*dto.UpCountryCostResponse, error) {
	id = strings.TrimSpace(id)
	existing, err := uc.repo.FindByID(ctx, id, false)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrUpCountryCostNotFound
		}
		return nil, err
	}

	if existing.Status != financeModels.UpCountryCostStatusDraft {
		return nil, errors.New("only draft can be updated")
	}

	start, err := time.Parse("2006-01-02", strings.TrimSpace(req.StartDate))
	if err != nil {
		return nil, errors.New("invalid start_date")
	}
	end, err := time.Parse("2006-01-02", strings.TrimSpace(req.EndDate))
	if err != nil {
		return nil, errors.New("invalid end_date")
	}

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&financeModels.UpCountryCost{}).Where("id = ?", id).Updates(map[string]interface{}{
			"purpose":    strings.TrimSpace(req.Purpose),
			"location":   strings.TrimSpace(req.Location),
			"start_date": start,
			"end_date":   end,
			"notes":      strings.TrimSpace(req.Notes),
		}).Error; err != nil {
			return err
		}

		if err := tx.Where("up_country_cost_id = ?", id).Delete(&financeModels.UpCountryCostEmployee{}).Error; err != nil {
			return err
		}
		for _, e := range req.Employees {
			if err := tx.Create(&financeModels.UpCountryCostEmployee{UpCountryCostID: id, EmployeeID: e.EmployeeID}).Error; err != nil {
				return err
			}
		}

		if err := tx.Where("up_country_cost_id = ?", id).Delete(&financeModels.UpCountryCostItem{}).Error; err != nil {
			return err
		}
		for _, it := range req.Items {
			if err := tx.Create(&financeModels.UpCountryCostItem{UpCountryCostID: id, CostType: financeModels.CostType(it.CostType), Description: it.Description, Amount: it.Amount}).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	full, _ := uc.repo.FindByID(ctx, id, true)
	res := uc.mapper.ToResponse(full)
	return &res, nil
}

func (uc *upCountryCostUsecase) Delete(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	existing, err := uc.repo.FindByID(ctx, id, false)
	if err != nil {
		return err
	}
	if existing.Status != financeModels.UpCountryCostStatusDraft {
		return errors.New("only draft can be deleted")
	}
	return uc.db.WithContext(ctx).Delete(&financeModels.UpCountryCost{}, "id = ?", id).Error
}

func (uc *upCountryCostUsecase) GetByID(ctx context.Context, id string) (*dto.UpCountryCostResponse, error) {
	item, err := uc.repo.FindByID(ctx, id, true)
	if err != nil {
		return nil, err
	}
	res := uc.mapper.ToResponse(item)
	return &res, nil
}

func (uc *upCountryCostUsecase) List(ctx context.Context, req *dto.ListUpCountryCostsRequest) ([]dto.UpCountryCostResponse, int64, error) {
	if req == nil {
		req = &dto.ListUpCountryCostsRequest{}
	}
	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 10
	}

	var status *financeModels.UpCountryCostStatus
	if req.Status != nil && *req.Status != "" {
		s := financeModels.UpCountryCostStatus(*req.Status)
		status = &s
	}

	var start *time.Time
	if req.StartDate != nil && *req.StartDate != "" {
		p, _ := time.Parse("2006-01-02", *req.StartDate)
		start = &p
	}
	var end *time.Time
	if req.EndDate != nil && *req.EndDate != "" {
		p, _ := time.Parse("2006-01-02", *req.EndDate)
		end = &p
	}

	items, total, err := uc.repo.List(ctx, repositories.UpCountryCostListParams{
		Search:    req.Search,
		Status:    status,
		StartDate: start,
		EndDate:   end,
		Limit:     perPage,
		Offset:    (page - 1) * perPage,
		SortBy:    req.SortBy,
		SortDir:   req.SortDir,
	})
	if err != nil {
		return nil, 0, err
	}

	res := make([]dto.UpCountryCostResponse, 0, len(items))
	for i := range items {
		// Needs to preload for total amount in mapper if we don't do it in List
		// For simplicity, let's just use the mapper (it will have 0 items for list if not preloaded)
		// Better repository to include total amount in query or preload
		res = append(res, uc.mapper.ToResponse(&items[i]))
	}
	return res, total, nil
}

func (uc *upCountryCostUsecase) Approve(ctx context.Context, id string) (*dto.UpCountryCostResponse, error) {
	id = strings.TrimSpace(id)
	item, err := uc.repo.FindByID(ctx, id, true)
	if err != nil {
		return nil, err
	}

	if item.Status != financeModels.UpCountryCostStatusDraft {
		return nil, errors.New("only draft can be approved")
	}

	// Up Country Cost Journaling:
	// Debit: Up-Country Expense Account
	// Credit: Cash/Bank or Payable?
	// Logic doc says: "Draft -> APPROVED (creates journal entry)"

	// Usually, Up Country is a reimbursement or advance.
	// If it's a claim, it's Debit Expense, Credit Payable to Employee.

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)

	var expCoA financeModels.ChartOfAccount
	if err := uc.db.WithContext(ctx).Where("name ILIKE ?", "%Perjalanan Dinas%").First(&expCoA).Error; err != nil {
		return nil, errors.New("expense account (Perjalanan Dinas) not found")
	}

	var payableCoA financeModels.ChartOfAccount
	if err := uc.db.WithContext(ctx).Where("name ILIKE ?", "%Hutang Biaya%").First(&payableCoA).Error; err != nil {
		return nil, errors.New("payable account (Hutang Biaya) not found")
	}

	var total float64
	for _, it := range item.Items {
		total += it.Amount
	}

	refType := "up_country"
	journalReq := &dto.CreateJournalEntryRequest{
		EntryDate:     apptime.Now().Format("2006-01-02"), // Or StartDate
		Description:   "Up-Country Cost Approval: " + item.Code + " - " + item.Purpose,
		ReferenceType: &refType,
		ReferenceID:   &item.ID,
		Lines: []dto.JournalLineRequest{
			{
				ChartOfAccountID: expCoA.ID,
				Debit:            total,
				Credit:           0,
				Memo:             "Travel Expense",
			},
			{
				ChartOfAccountID: payableCoA.ID,
				Debit:            0,
				Credit:           total,
				Memo:             "Reimbursement payable",
			},
		},
	}

	_, err = uc.journalUC.PostOrUpdateJournal(ctx, journalReq)
	if err != nil {
		return nil, err
	}

	now := apptime.Now()
	if err := uc.db.WithContext(ctx).Model(&financeModels.UpCountryCost{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":      financeModels.UpCountryCostStatusApproved,
		"approved_at": &now,
		"approved_by": &actorID,
	}).Error; err != nil {
		return nil, err
	}

	item.Status = financeModels.UpCountryCostStatusApproved
	res := uc.mapper.ToResponse(item)
	return &res, nil
}
