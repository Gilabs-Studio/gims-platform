package usecase

import (
	"context"
	"errors"

	"github.com/gilabs/crm-healthcare/api/internal/core/data/models"
	"github.com/gilabs/crm-healthcare/api/internal/core/data/repositories"
	"github.com/gilabs/crm-healthcare/api/internal/core/domain/dto"
	"github.com/gilabs/crm-healthcare/api/internal/core/domain/mapper"
	"github.com/google/uuid"
)

// PaymentTermsUsecase defines the interface for payment terms business logic
type PaymentTermsUsecase interface {
	Create(ctx context.Context, req dto.CreatePaymentTermsRequest) (dto.PaymentTermsResponse, error)
	GetByID(ctx context.Context, id string) (dto.PaymentTermsResponse, error)
	List(ctx context.Context, params repositories.ListParams) ([]dto.PaymentTermsResponse, int64, error)
	Update(ctx context.Context, id string, req dto.UpdatePaymentTermsRequest) (dto.PaymentTermsResponse, error)
	Delete(ctx context.Context, id string) error
}

type paymentTermsUsecase struct {
	repo repositories.PaymentTermsRepository
}

// NewPaymentTermsUsecase creates a new PaymentTermsUsecase
func NewPaymentTermsUsecase(repo repositories.PaymentTermsRepository) PaymentTermsUsecase {
	return &paymentTermsUsecase{repo: repo}
}

func (u *paymentTermsUsecase) Create(ctx context.Context, req dto.CreatePaymentTermsRequest) (dto.PaymentTermsResponse, error) {
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	paymentTerms := &models.PaymentTerms{
		ID:          uuid.New().String(),
		Code:        req.Code,
		Name:        req.Name,
		Description: req.Description,
		Days:        req.Days,
		IsActive:    isActive,
	}

	if err := u.repo.Create(ctx, paymentTerms); err != nil {
		return dto.PaymentTermsResponse{}, err
	}

	return mapper.ToPaymentTermsResponse(paymentTerms), nil
}

func (u *paymentTermsUsecase) GetByID(ctx context.Context, id string) (dto.PaymentTermsResponse, error) {
	paymentTerms, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.PaymentTermsResponse{}, err
	}
	return mapper.ToPaymentTermsResponse(paymentTerms), nil
}

func (u *paymentTermsUsecase) List(ctx context.Context, params repositories.ListParams) ([]dto.PaymentTermsResponse, int64, error) {
	paymentTermsList, total, err := u.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return mapper.ToPaymentTermsResponseList(paymentTermsList), total, nil
}

func (u *paymentTermsUsecase) Update(ctx context.Context, id string, req dto.UpdatePaymentTermsRequest) (dto.PaymentTermsResponse, error) {
	paymentTerms, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.PaymentTermsResponse{}, err
	}

	if req.Code != "" {
		paymentTerms.Code = req.Code
	}
	if req.Name != "" {
		paymentTerms.Name = req.Name
	}
	if req.Description != "" {
		paymentTerms.Description = req.Description
	}
	if req.Days != nil {
		paymentTerms.Days = *req.Days
	}
	if req.IsActive != nil {
		paymentTerms.IsActive = *req.IsActive
	}

	if err := u.repo.Update(ctx, paymentTerms); err != nil {
		return dto.PaymentTermsResponse{}, err
	}

	return mapper.ToPaymentTermsResponse(paymentTerms), nil
}

func (u *paymentTermsUsecase) Delete(ctx context.Context, id string) error {
	_, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return errors.New("payment terms not found")
	}
	return u.repo.Delete(ctx, id)
}
