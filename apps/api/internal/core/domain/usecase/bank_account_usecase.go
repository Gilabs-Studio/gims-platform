package usecase

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/data/repositories"
	"github.com/gilabs/gims/api/internal/core/domain/dto"
	"github.com/gilabs/gims/api/internal/core/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrBankAccountNotFound = errors.New("bank account not found")
)

type BankAccountUsecase interface {
	Create(ctx context.Context, req *dto.CreateBankAccountRequest) (*dto.BankAccountResponse, error)
	List(ctx context.Context, params repositories.BankAccountListParams) ([]*dto.BankAccountResponse, int64, error)
	ListUnified(ctx context.Context, params repositories.BankAccountListParams) ([]*dto.UnifiedBankAccountResponse, int64, error)
	ListTransactionHistory(ctx context.Context, id string, limit, offset int) ([]dto.BankAccountTransactionResponse, int64, error)
	GetByID(ctx context.Context, id string) (*dto.BankAccountResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateBankAccountRequest) (*dto.BankAccountResponse, error)
	Delete(ctx context.Context, id string) error
}

type bankAccountUsecase struct {
	repo         repositories.BankAccountRepository
	currencyRepo repositories.CurrencyRepository
	mapper       *mapper.BankAccountMapper
}

func NewBankAccountUsecase(repo repositories.BankAccountRepository) BankAccountUsecase {
	return &bankAccountUsecase{repo: repo, mapper: mapper.NewBankAccountMapper()}
}

func NewBankAccountUsecaseWithCurrency(repo repositories.BankAccountRepository, currencyRepo repositories.CurrencyRepository) BankAccountUsecase {
	return &bankAccountUsecase{repo: repo, currencyRepo: currencyRepo, mapper: mapper.NewBankAccountMapper()}
}

func (u *bankAccountUsecase) resolveCurrency(ctx context.Context, currencyID *string) (*models.Currency, error) {
	if u.currencyRepo == nil || currencyID == nil || *currencyID == "" {
		return nil, nil
	}
	return u.currencyRepo.FindByID(ctx, *currencyID)
}

func (u *bankAccountUsecase) Create(ctx context.Context, req *dto.CreateBankAccountRequest) (*dto.BankAccountResponse, error) {
	if req == nil {
		return nil, errors.New("request is nil")
	}

	resolvedCurrency, err := u.resolveCurrency(ctx, req.CurrencyID)
	if err != nil {
		return nil, err
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	currencyCode := strings.TrimSpace(req.Currency)
	if resolvedCurrency != nil {
		currencyCode = resolvedCurrency.Code
	}
	if currencyCode == "" {
		currencyCode = "IDR"
	}

	m := &models.BankAccount{
		Name:             strings.TrimSpace(req.Name),
		AccountNumber:    strings.TrimSpace(req.AccountNumber),
		AccountHolder:    strings.TrimSpace(req.AccountHolder),
		CurrencyID:       req.CurrencyID,
		CurrencyDetail:   resolvedCurrency,
		Currency:         currencyCode,
		ChartOfAccountID: req.ChartOfAccountID,
		VillageID:        req.VillageID,
		BankAddress:      strings.TrimSpace(req.BankAddress),
		BankPhone:        strings.TrimSpace(req.BankPhone),
		IsActive:         isActive,
	}
	if err := u.repo.Create(ctx, m); err != nil {
		return nil, err
	}
	return u.mapper.ToResponse(m), nil
}

func (u *bankAccountUsecase) List(ctx context.Context, params repositories.BankAccountListParams) ([]*dto.BankAccountResponse, int64, error) {
	items, total, err := u.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return u.mapper.ToResponseList(items), total, nil
}

func (u *bankAccountUsecase) ListUnified(ctx context.Context, params repositories.BankAccountListParams) ([]*dto.UnifiedBankAccountResponse, int64, error) {
	items, total, err := u.repo.ListUnified(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	responses := make([]*dto.UnifiedBankAccountResponse, 0, len(items))
	for _, item := range items {
		response := &dto.UnifiedBankAccountResponse{
			ID:            item.ID,
			SourceType:    item.SourceType,
			Name:          item.Name,
			BankName:      item.BankName,
			BankCode:      item.BankCode,
			AccountNumber: item.AccountNumber,
			AccountHolder: item.AccountHolder,
			CurrencyID:    item.CurrencyID,
			Currency:      item.CurrencyCode,
			OwnerType:     item.OwnerType,
			OwnerID:       item.OwnerID,
			OwnerName:     item.OwnerName,
			OwnerCode:     item.OwnerCode,
			IsActive:      item.IsActive,
			CreatedAt:     item.CreatedAt.Format(time.RFC3339),
			UpdatedAt:     item.UpdatedAt.Format(time.RFC3339),
		}
		if item.CurrencyID != nil {
			decimalPlaces := 0
			if item.CurrencyDecimalPlaces != nil {
				decimalPlaces = *item.CurrencyDecimalPlaces
			}
			response.CurrencyDetail = &dto.CurrencyResponse{
				ID:            *item.CurrencyID,
				Code:          item.CurrencyCode,
				Name:          derefString(item.CurrencyName),
				Symbol:        derefString(item.CurrencySymbol),
				DecimalPlaces: decimalPlaces,
			}
		}
		responses = append(responses, response)
	}
	return responses, total, nil
}

func (u *bankAccountUsecase) GetByID(ctx context.Context, id string) (*dto.BankAccountResponse, error) {
	item, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrBankAccountNotFound
		}
		return nil, err
	}

	res := u.mapper.ToResponse(item)
	history, err := u.repo.ListTransactionHistory(ctx, id, 100)
	if err != nil {
		return nil, err
	}
	if len(history) > 0 {
		res.TransactionHistory = make([]dto.BankAccountTransactionResponse, 0, len(history))
		for _, h := range history {
			res.TransactionHistory = append(res.TransactionHistory, dto.BankAccountTransactionResponse{
				ID:                 h.ID,
				TransactionType:    h.TransactionType,
				TransactionDate:    h.TransactionDate.Format("2006-01-02T15:04:05+07:00"),
				ReferenceType:      h.ReferenceType,
				ReferenceID:        h.ReferenceID,
				ReferenceNumber:    h.ReferenceNumber,
				RelatedEntityType:  h.RelatedEntityType,
				RelatedEntityID:    h.RelatedEntityID,
				RelatedEntityLabel: h.RelatedEntityLabel,
				Amount:             h.Amount,
				Status:             h.Status,
				Description:        h.Description,
			})
		}
	}

	return res, nil
}

func (u *bankAccountUsecase) ListTransactionHistory(ctx context.Context, id string, limit, offset int) ([]dto.BankAccountTransactionResponse, int64, error) {
	if _, err := u.repo.FindByID(ctx, id); err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, 0, ErrBankAccountNotFound
		}
		return nil, 0, err
	}

	history, total, err := u.repo.ListTransactionHistoryPaginated(ctx, id, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]dto.BankAccountTransactionResponse, 0, len(history))
	for _, h := range history {
		responses = append(responses, dto.BankAccountTransactionResponse{
			ID:                 h.ID,
			TransactionType:    h.TransactionType,
			TransactionDate:    h.TransactionDate.Format("2006-01-02T15:04:05+07:00"),
			ReferenceType:      h.ReferenceType,
			ReferenceID:        h.ReferenceID,
			ReferenceNumber:    h.ReferenceNumber,
			RelatedEntityType:  h.RelatedEntityType,
			RelatedEntityID:    h.RelatedEntityID,
			RelatedEntityLabel: h.RelatedEntityLabel,
			Amount:             h.Amount,
			Status:             h.Status,
			Description:        h.Description,
		})
	}

	return responses, total, nil
}

func (u *bankAccountUsecase) Update(ctx context.Context, id string, req *dto.UpdateBankAccountRequest) (*dto.BankAccountResponse, error) {
	if req == nil {
		return nil, errors.New("request is nil")
	}
	item, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrBankAccountNotFound
		}
		return nil, err
	}
	resolvedCurrency, err := u.resolveCurrency(ctx, req.CurrencyID)
	if err != nil {
		return nil, err
	}
	currencyCode := strings.TrimSpace(req.Currency)
	if resolvedCurrency != nil {
		currencyCode = resolvedCurrency.Code
	}
	if currencyCode == "" {
		currencyCode = "IDR"
	}
	item.Name = strings.TrimSpace(req.Name)
	item.AccountNumber = strings.TrimSpace(req.AccountNumber)
	item.AccountHolder = strings.TrimSpace(req.AccountHolder)
	item.CurrencyID = req.CurrencyID
	item.CurrencyDetail = resolvedCurrency
	item.Currency = currencyCode
	item.ChartOfAccountID = req.ChartOfAccountID
	item.VillageID = req.VillageID
	item.BankAddress = strings.TrimSpace(req.BankAddress)
	item.BankPhone = strings.TrimSpace(req.BankPhone)
	if req.IsActive != nil {
		item.IsActive = *req.IsActive
	}

	if err := u.repo.Update(ctx, item); err != nil {
		return nil, err
	}
	return u.mapper.ToResponse(item), nil
}

func (u *bankAccountUsecase) Delete(ctx context.Context, id string) error {
	item, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrBankAccountNotFound
		}
		return err
	}
	return u.repo.Delete(ctx, item.ID)
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
