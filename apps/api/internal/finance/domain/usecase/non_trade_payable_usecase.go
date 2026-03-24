package usecase

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/mapper"
	notificationService "github.com/gilabs/gims/api/internal/notification/service"
	"gorm.io/gorm"
)

var (
	ErrNonTradePayableNotFound = errors.New("non-trade payable not found")
)

type NonTradePayableUsecase interface {
	Create(ctx context.Context, req *dto.CreateNonTradePayableRequest) (*dto.NonTradePayableResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateNonTradePayableRequest) (*dto.NonTradePayableResponse, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*dto.NonTradePayableResponse, error)
	List(ctx context.Context, req *dto.ListNonTradePayablesRequest) ([]dto.NonTradePayableResponse, int64, error)
	Submit(ctx context.Context, id string) (*dto.NonTradePayableResponse, error)
	Approve(ctx context.Context, id string) (*dto.NonTradePayableResponse, error)
	Reject(ctx context.Context, id string) (*dto.NonTradePayableResponse, error)
	Pay(ctx context.Context, id string, req *dto.PayNonTradePayableRequest) (*dto.NonTradePayableResponse, error)
	GetFormData(ctx context.Context) (*dto.NonTradePayableFormDataResponse, error)
}

type nonTradePayableUsecase struct {
	db        *gorm.DB
	coaRepo   repositories.ChartOfAccountRepository
	repo      repositories.NonTradePayableRepository
	journalUC JournalEntryUsecase
	mapper    *mapper.NonTradePayableMapper
}

func NewNonTradePayableUsecase(db *gorm.DB, coaRepo repositories.ChartOfAccountRepository, repo repositories.NonTradePayableRepository, journalUC JournalEntryUsecase, mapper *mapper.NonTradePayableMapper) NonTradePayableUsecase {
	return &nonTradePayableUsecase{db: db, coaRepo: coaRepo, repo: repo, journalUC: journalUC, mapper: mapper}
}

func parseOptDate(value *string) (*time.Time, error) {
	if value == nil {
		return nil, nil
	}
	v := strings.TrimSpace(*value)
	if v == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", v)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func (uc *nonTradePayableUsecase) Create(ctx context.Context, req *dto.CreateNonTradePayableRequest) (*dto.NonTradePayableResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	d, err := time.Parse("2006-01-02", strings.TrimSpace(req.TransactionDate))
	if err != nil {
		return nil, errors.New("invalid transaction_date")
	}
	due, err := parseOptDate(req.DueDate)
	if err != nil {
		return nil, errors.New("invalid due_date")
	}

	coa, err := uc.coaRepo.FindByID(ctx, strings.TrimSpace(req.ChartOfAccountID))
	if err != nil {
		return nil, err
	}

	code, err := uc.repo.GenerateCode(ctx, d)
	if err != nil {
		return nil, err
	}

	item := &financeModels.NonTradePayable{
		TransactionDate:            d,
		Code:                       code,
		Description:                strings.TrimSpace(req.Description),
		ChartOfAccountID:           strings.TrimSpace(req.ChartOfAccountID),
		ChartOfAccountCodeSnapshot: strings.TrimSpace(coa.Code),
		ChartOfAccountNameSnapshot: strings.TrimSpace(coa.Name),
		ChartOfAccountTypeSnapshot: strings.TrimSpace(string(coa.Type)),
		Amount:                     req.Amount,
		VendorName:                 strings.TrimSpace(req.VendorName),
		DueDate:                    due,
		ReferenceNo:                strings.TrimSpace(req.ReferenceNo),
		Status:                     financeModels.NTPStatusDraft,
		CreatedBy:                  &actorID,
	}
	if err := uc.db.WithContext(ctx).Create(item).Error; err != nil {
		return nil, err
	}

	res := uc.mapper.ToResponse(item)
	return &res, nil
}

func (uc *nonTradePayableUsecase) Update(ctx context.Context, id string, req *dto.UpdateNonTradePayableRequest) (*dto.NonTradePayableResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}

	existing, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrNonTradePayableNotFound
		}
		return nil, err
	}

	d, err := time.Parse("2006-01-02", strings.TrimSpace(req.TransactionDate))
	if err != nil {
		return nil, errors.New("invalid transaction_date")
	}
	due, err := parseOptDate(req.DueDate)
	if err != nil {
		return nil, errors.New("invalid due_date")
	}

	coaID := strings.TrimSpace(req.ChartOfAccountID)
	if coaID == "" {
		return nil, errors.New("chart_of_account_id is required")
	}
	coa, err := uc.coaRepo.FindByID(ctx, coaID)
	if err != nil {
		return nil, err
	}

	coaCodeSnap := strings.TrimSpace(existing.ChartOfAccountCodeSnapshot)
	coaNameSnap := strings.TrimSpace(existing.ChartOfAccountNameSnapshot)
	coaTypeSnap := strings.TrimSpace(existing.ChartOfAccountTypeSnapshot)
	if strings.TrimSpace(existing.ChartOfAccountID) != coaID || (coaCodeSnap == "" && coaNameSnap == "" && coaTypeSnap == "") {
		coaCodeSnap = strings.TrimSpace(coa.Code)
		coaNameSnap = strings.TrimSpace(coa.Name)
		coaTypeSnap = strings.TrimSpace(string(coa.Type))
	}

	if err := uc.db.WithContext(ctx).Model(&financeModels.NonTradePayable{}).Where("id = ?", id).Updates(map[string]interface{}{
		"transaction_date":               d,
		"description":                    strings.TrimSpace(req.Description),
		"chart_of_account_id":            coaID,
		"chart_of_account_code_snapshot": coaCodeSnap,
		"chart_of_account_name_snapshot": coaNameSnap,
		"chart_of_account_type_snapshot": coaTypeSnap,
		"amount":                         req.Amount,
		"vendor_name":                    strings.TrimSpace(req.VendorName),
		"due_date":                       due,
		"reference_no":                   strings.TrimSpace(req.ReferenceNo),
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

func (uc *nonTradePayableUsecase) Delete(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("id is required")
	}
	if _, err := uc.repo.FindByID(ctx, id); err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrNonTradePayableNotFound
		}
		return err
	}
	return uc.db.WithContext(ctx).Delete(&financeModels.NonTradePayable{}, "id = ?", id).Error
}

func (uc *nonTradePayableUsecase) GetByID(ctx context.Context, id string) (*dto.NonTradePayableResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if !security.CheckRecordScopeAccess(uc.db, ctx, &financeModels.NonTradePayable{}, id, security.FinanceScopeQueryOptions()) {
		return nil, ErrNonTradePayableNotFound
	}
	item, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrNonTradePayableNotFound
		}
		return nil, err
	}
	res := uc.mapper.ToResponse(item)
	return &res, nil
}

func (uc *nonTradePayableUsecase) List(ctx context.Context, req *dto.ListNonTradePayablesRequest) ([]dto.NonTradePayableResponse, int64, error) {
	if req == nil {
		req = &dto.ListNonTradePayablesRequest{}
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

	var startDate *time.Time
	if req.StartDate != nil && strings.TrimSpace(*req.StartDate) != "" {
		parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*req.StartDate))
		if err != nil {
			return nil, 0, errors.New("invalid start_date")
		}
		startDate = &parsed
	}
	var endDate *time.Time
	if req.EndDate != nil && strings.TrimSpace(*req.EndDate) != "" {
		parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*req.EndDate))
		if err != nil {
			return nil, 0, errors.New("invalid end_date")
		}
		endDate = &parsed
	}

	items, total, err := uc.repo.List(ctx, repositories.NonTradePayableListParams{
		Search:    req.Search,
		StartDate: startDate,
		EndDate:   endDate,
		SortBy:    req.SortBy,
		SortDir:   req.SortDir,
		Limit:     perPage,
		Offset:    (page - 1) * perPage,
	})
	if err != nil {
		return nil, 0, err
	}

	res := make([]dto.NonTradePayableResponse, 0, len(items))
	for i := range items {
		mapped := uc.mapper.ToResponse(&items[i])
		res = append(res, mapped)
	}
	return res, total, nil
}

func (uc *nonTradePayableUsecase) Submit(ctx context.Context, id string) (*dto.NonTradePayableResponse, error) {
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
			return nil, ErrNonTradePayableNotFound
		}
		return nil, err
	}

	if item.Status != financeModels.NTPStatusDraft {
		return nil, errors.New("only draft non-trade payable can be submitted")
	}

	if err := uc.db.WithContext(ctx).Model(&financeModels.NonTradePayable{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status": financeModels.NTPStatusSubmitted,
	}).Error; err != nil {
		return nil, err
	}

	item.Status = financeModels.NTPStatusSubmitted
	if err := notificationService.CreateApprovalNotification(ctx, uc.db, notificationService.ApprovalNotificationParams{
		PermissionCode: "non_trade_payable.approve",
		EntityType:     "non_trade_payable",
		EntityID:       item.ID,
		Title:          "Non-Trade Payable Approval",
		Message:        "A non-trade payable has been submitted and requires your approval.",
		ActorUserID:    actorID,
	}); err != nil {
		log.Printf("warning: failed to create non-trade payable notification: %v", err)
	}
	res := uc.mapper.ToResponse(item)
	return &res, nil
}

func (uc *nonTradePayableUsecase) Approve(ctx context.Context, id string) (*dto.NonTradePayableResponse, error) {
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
			return nil, ErrNonTradePayableNotFound
		}
		return nil, err
	}

	if item.Status != financeModels.NTPStatusSubmitted {
		return nil, errors.New("only submitted non-trade payable can be approved")
	}

	// NTP Approval creates journal:
	// Debit: Expense Account (item.ChartOfAccountID)
	// Credit: Non-Trade Payable Account (we usually have a specific CoA for NTP,
	// but the logic doc says "Debit Expense CoA, Credit NTP CoA".
	// For simplicity, we use what's in ChartOfAccountID as the "target" (debit side)
	// and we need a default NTP CoA for the credit side.
	// Fixed: Logic doc implies ChartOfAccountID is the one related to the expense.

	// I'll look for a common NTP CoA or ask...
	// Wait, the logic doc says: "Debit Expense CoA, Credit NTP CoA"
	// I'll check if there is a default NTP CoA in the system or if I should pass it.
	// Actually, usually in NTP, the user selects the "target" account (Expense/Asset/etc)
	// and the Credit side is fixed to "Hutang Non-Dagang" (Liability).

	// Let's search for "Hutang Non-Dagang" or similar CoA in the DB or use a placeholder if not found.
	// Typically, it should be in the settings. For now, I'll assume it's provided or I use a hardcoded fallback if I must,
	// but better to have it in the request or logic.

	// Revisiting logic doc:
	// "Debit Expense CoA, Credit NTP CoA"

	// Look up NTP liability account by well-known COA code (stable, unlike name-based ILIKE).
	ntpCoA, err := uc.coaRepo.FindByCode(ctx, COACodeNonTradePayable)
	if err != nil {
		return nil, fmt.Errorf("non-trade payable account (code %s) not found in Chart of Accounts: %w", COACodeNonTradePayable, err)
	}

	refType := "ntp"
	journalReq := &dto.CreateJournalEntryRequest{
		EntryDate:     item.TransactionDate.Format("2006-01-02"),
		Description:   "NTP Approval: " + item.Code + " - " + item.Description,
		ReferenceType: &refType,
		ReferenceID:   &item.ID,
		Lines: []dto.JournalLineRequest{
			{
				ChartOfAccountID: item.ChartOfAccountID,
				Debit:            item.Amount,
				Credit:           0,
				Memo:             item.Description,
			},
			{
				ChartOfAccountID: ntpCoA.ID,
				Debit:            0,
				Credit:           item.Amount,
				Memo:             "Payable record",
			},
		},
	}

	journalRes, err := uc.journalUC.PostOrUpdateJournal(ctx, journalReq)
	if err != nil {
		return nil, err
	}

	if err := uc.db.WithContext(ctx).Model(&financeModels.NonTradePayable{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status": financeModels.NTPStatusApproved,
		// We could store journal reference here if we want
	}).Error; err != nil {
		return nil, err
	}

	item.Status = financeModels.NTPStatusApproved
	res := uc.mapper.ToResponse(item)
	res.JournalID = &journalRes.ID // Assuming we add this to DTO
	return &res, nil
}

func (uc *nonTradePayableUsecase) Reject(ctx context.Context, id string) (*dto.NonTradePayableResponse, error) {
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
			return nil, ErrNonTradePayableNotFound
		}
		return nil, err
	}

	if item.Status != financeModels.NTPStatusSubmitted {
		return nil, errors.New("only submitted non-trade payable can be rejected")
	}

	if err := uc.db.WithContext(ctx).Model(&financeModels.NonTradePayable{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status": financeModels.NTPStatusRejected,
	}).Error; err != nil {
		return nil, err
	}

	item.Status = financeModels.NTPStatusRejected
	res := uc.mapper.ToResponse(item)
	return &res, nil
}

func (uc *nonTradePayableUsecase) Pay(ctx context.Context, id string, req *dto.PayNonTradePayableRequest) (*dto.NonTradePayableResponse, error) {
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
			return nil, ErrNonTradePayableNotFound
		}
		return nil, err
	}

	if item.Status != financeModels.NTPStatusApproved {
		return nil, errors.New("only approved non-trade payable can be paid")
	}

	// Look up NTP liability account by well-known COA code (stable, unlike name-based ILIKE).
	ntpCoA, err := uc.coaRepo.FindByCode(ctx, COACodeNonTradePayable)
	if err != nil {
		return nil, fmt.Errorf("non-trade payable account (code %s) not found in Chart of Accounts: %w", COACodeNonTradePayable, err)
	}

	refType := "ntp_payment"
	journalReq := &dto.CreateJournalEntryRequest{
		EntryDate:     req.PaymentDate,
		Description:   "NTP Payment: " + item.Code + " - Ref: " + req.BankReference,
		ReferenceType: &refType,
		ReferenceID:   &item.ID,
		Lines: []dto.JournalLineRequest{
			{
				ChartOfAccountID: ntpCoA.ID,
				Debit:            req.Amount,
				Credit:           0,
				Memo:             "Settling payable",
			},
			{
				ChartOfAccountID: req.ChartOfAccountID, // Bank/Cash Account
				Debit:            0,
				Credit:           req.Amount,
				Memo:             req.BankReference,
			},
		},
	}

	journalRes, err := uc.journalUC.PostOrUpdateJournal(ctx, journalReq)
	if err != nil {
		return nil, err
	}

	// Update status. If payment amount == item amount, set PAID.
	// For simplicity, we assume full payment here as per logic flow DRAFT -> APPROVED -> PAID
	if err := uc.db.WithContext(ctx).Model(&financeModels.NonTradePayable{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status": financeModels.NTPStatusPaid,
	}).Error; err != nil {
		return nil, err
	}

	item.Status = financeModels.NTPStatusPaid
	res := uc.mapper.ToResponse(item)
	res.JournalID = &journalRes.ID
	return &res, nil
}
