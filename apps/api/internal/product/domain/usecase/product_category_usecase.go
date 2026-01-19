package usecase

import (
	"context"
	"errors"

	"github.com/gilabs/crm-healthcare/api/internal/product/data/models"
	"github.com/gilabs/crm-healthcare/api/internal/product/data/repositories"
	"github.com/gilabs/crm-healthcare/api/internal/product/domain/dto"
	"github.com/gilabs/crm-healthcare/api/internal/product/domain/mapper"
	"github.com/google/uuid"
)

// ProductCategoryUsecase defines the interface for product category business logic
type ProductCategoryUsecase interface {
	Create(ctx context.Context, req dto.CreateProductCategoryRequest) (dto.ProductCategoryResponse, error)
	GetByID(ctx context.Context, id string) (dto.ProductCategoryResponse, error)
	List(ctx context.Context, params repositories.ListParams) ([]dto.ProductCategoryResponse, int64, error)
	Update(ctx context.Context, id string, req dto.UpdateProductCategoryRequest) (dto.ProductCategoryResponse, error)
	Delete(ctx context.Context, id string) error
}

type productCategoryUsecase struct {
	repo repositories.ProductCategoryRepository
}

// NewProductCategoryUsecase creates a new ProductCategoryUsecase
func NewProductCategoryUsecase(repo repositories.ProductCategoryRepository) ProductCategoryUsecase {
	return &productCategoryUsecase{repo: repo}
}

func (u *productCategoryUsecase) Create(ctx context.Context, req dto.CreateProductCategoryRequest) (dto.ProductCategoryResponse, error) {
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	category := &models.ProductCategory{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Description: req.Description,
		ParentID:    req.ParentID,
		IsActive:    isActive,
	}

	if err := u.repo.Create(ctx, category); err != nil {
		return dto.ProductCategoryResponse{}, err
	}

	return mapper.ToProductCategoryResponse(category), nil
}

func (u *productCategoryUsecase) GetByID(ctx context.Context, id string) (dto.ProductCategoryResponse, error) {
	category, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.ProductCategoryResponse{}, err
	}
	return mapper.ToProductCategoryResponse(category), nil
}

func (u *productCategoryUsecase) List(ctx context.Context, params repositories.ListParams) ([]dto.ProductCategoryResponse, int64, error) {
	categories, total, err := u.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return mapper.ToProductCategoryResponseList(categories), total, nil
}

func (u *productCategoryUsecase) Update(ctx context.Context, id string, req dto.UpdateProductCategoryRequest) (dto.ProductCategoryResponse, error) {
	category, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.ProductCategoryResponse{}, err
	}

	if req.Name != "" {
		category.Name = req.Name
	}
	if req.Description != "" {
		category.Description = req.Description
	}
	if req.ParentID != nil {
		category.ParentID = req.ParentID
	}
	if req.IsActive != nil {
		category.IsActive = *req.IsActive
	}

	if err := u.repo.Update(ctx, category); err != nil {
		return dto.ProductCategoryResponse{}, err
	}

	return mapper.ToProductCategoryResponse(category), nil
}

func (u *productCategoryUsecase) Delete(ctx context.Context, id string) error {
	_, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return errors.New("product category not found")
	}
	return u.repo.Delete(ctx, id)
}
