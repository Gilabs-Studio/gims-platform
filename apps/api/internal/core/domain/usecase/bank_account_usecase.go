package usecase

import (
	"context"
	"errors"
	"strings"

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
	GetByID(ctx context.Context, id string) (*dto.BankAccountResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateBankAccountRequest) (*dto.BankAccountResponse, error)
	Delete(ctx context.Context, id string) error
}

type bankAccountUsecase struct {
	repo   repositories.BankAccountRepository
	mapper *mapper.BankAccountMapper
}

func NewBankAccountUsecase(repo repositories.BankAccountRepository) BankAccountUsecase {
	return &bankAccountUsecase{repo: repo, mapper: mapper.NewBankAccountMapper()}
}

func (u *bankAccountUsecase) Create(ctx context.Context, req *dto.CreateBankAccountRequest) (*dto.BankAccountResponse, error) {
	if req == nil {
		return nil, errors.New("request is nil")
	}

	currency := strings.TrimSpace(req.Currency)
	if currency == "" {
		currency = "IDR"
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	m := &models.BankAccount{
		Name:             strings.TrimSpace(req.Name),
		AccountNumber:    strings.TrimSpace(req.AccountNumber),
		AccountHolder:    strings.TrimSpace(req.AccountHolder),
		Currency:         currency,
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

func (u *bankAccountUsecase) GetByID(ctx context.Context, id string) (*dto.BankAccountResponse, error) {
	item, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrBankAccountNotFound
		}
		return nil, err
	}
	return u.mapper.ToResponse(item), nil
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
	currency := strings.TrimSpace(req.Currency)
	if currency == "" {
		currency = "IDR"
	}
	item.Name = strings.TrimSpace(req.Name)
	item.AccountNumber = strings.TrimSpace(req.AccountNumber)
	item.AccountHolder = strings.TrimSpace(req.AccountHolder)
	item.Currency = currency
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
