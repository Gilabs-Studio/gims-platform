package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/gilabs/crm-healthcare/api/internal/product/data/models"
	"github.com/gilabs/crm-healthcare/api/internal/product/data/repositories"
	"github.com/gilabs/crm-healthcare/api/internal/product/domain/dto"
	"github.com/gilabs/crm-healthcare/api/internal/product/domain/mapper"
	"github.com/google/uuid"
)

// ProductUsecase defines the interface for product business logic
type ProductUsecase interface {
	Create(ctx context.Context, req dto.CreateProductRequest, userID string) (dto.ProductResponse, error)
	GetByID(ctx context.Context, id string) (dto.ProductResponse, error)
	List(ctx context.Context, params repositories.ProductListParams) ([]dto.ProductResponse, int64, error)
	Update(ctx context.Context, id string, req dto.UpdateProductRequest) (dto.ProductResponse, error)
	Delete(ctx context.Context, id string) error
	Submit(ctx context.Context, id string) (dto.ProductResponse, error)
	Approve(ctx context.Context, id string, userID string, req dto.ApproveProductRequest) (dto.ProductResponse, error)
}

type productUsecase struct {
	repo repositories.ProductRepository
}

// NewProductUsecase creates a new ProductUsecase
func NewProductUsecase(repo repositories.ProductRepository) ProductUsecase {
	return &productUsecase{repo: repo}
}

func (u *productUsecase) Create(ctx context.Context, req dto.CreateProductRequest, userID string) (dto.ProductResponse, error) {
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	product := &models.Product{
		ID:                uuid.New().String(),
		Code:              req.Code,
		Name:              req.Name,
		Description:       req.Description,
		ManufacturerPartNumber: req.ManufacturerPartNumber,
		CategoryID:        req.CategoryID,
		BrandID:           req.BrandID,
		SegmentID:         req.SegmentID,
		TypeID:            req.TypeID,
		UomID:             req.UomID,
		PurchaseUomID:     req.PurchaseUomID,
		PurchaseUomConversion: req.PurchaseUomConversion,
		PackagingID:       req.PackagingID,
		ProcurementTypeID: req.ProcurementTypeID,
		SupplierID:        req.SupplierID,
		BusinessUnitID:    req.BusinessUnitID,
		CostPrice:         req.CostPrice,
		SellingPrice:      req.SellingPrice,
		MinStock:          req.MinStock,
		MaxStock:          req.MaxStock,
		TaxType:           req.TaxType,
		IsTaxInclusive:    req.IsTaxInclusive,
		LeadTimeDays:      req.LeadTimeDays,
		Barcode:           req.Barcode,
		Sku:               req.Sku,
		Weight:            req.Weight,
		Volume:            req.Volume,
		Notes:             req.Notes,
		Status:            models.ProductStatusDraft,
		IsApproved:        false,
		CreatedBy:         &userID,
		IsActive:          isActive,
	}

	if err := u.repo.Create(ctx, product); err != nil {
		return dto.ProductResponse{}, err
	}

	// Reload to get relations
	product, err := u.repo.FindByID(ctx, product.ID)
	if err != nil {
		return dto.ProductResponse{}, err
	}

	return mapper.ToProductResponse(product), nil
}

func (u *productUsecase) GetByID(ctx context.Context, id string) (dto.ProductResponse, error) {
	product, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.ProductResponse{}, err
	}
	return mapper.ToProductResponse(product), nil
}

func (u *productUsecase) List(ctx context.Context, params repositories.ProductListParams) ([]dto.ProductResponse, int64, error) {
	products, total, err := u.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return mapper.ToProductResponseList(products), total, nil
}

func (u *productUsecase) Update(ctx context.Context, id string, req dto.UpdateProductRequest) (dto.ProductResponse, error) {
	product, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.ProductResponse{}, err
	}

	// Only allow updates on draft or rejected products
	if product.Status != models.ProductStatusDraft && product.Status != models.ProductStatusRejected {
		return dto.ProductResponse{}, errors.New("can only update draft or rejected products")
	}

	if req.Code != "" {
		product.Code = req.Code
	}
	if req.Name != "" {
		product.Name = req.Name
	}
	if req.Description != "" {
		product.Description = req.Description
	}
	if req.CategoryID != nil {
		product.CategoryID = req.CategoryID
	}
	if req.BrandID != nil {
		product.BrandID = req.BrandID
	}
	if req.SegmentID != nil {
		product.SegmentID = req.SegmentID
	}
	if req.TypeID != nil {
		product.TypeID = req.TypeID
	}
	if req.UomID != nil {
		product.UomID = req.UomID
	}
	if req.PackagingID != nil {
		product.PackagingID = req.PackagingID
	}
	if req.ProcurementTypeID != nil {
		product.ProcurementTypeID = req.ProcurementTypeID
	}
	if req.SupplierID != nil {
		product.SupplierID = req.SupplierID
	}
	if req.BusinessUnitID != nil {
		product.BusinessUnitID = req.BusinessUnitID
	}
	if req.CostPrice != nil {
		product.CostPrice = *req.CostPrice
	}
	if req.SellingPrice != nil {
		product.SellingPrice = *req.SellingPrice
	}
	if req.MinStock != nil {
		product.MinStock = *req.MinStock
	}
	if req.MaxStock != nil {
		product.MaxStock = *req.MaxStock
	}
	if req.Barcode != "" {
		product.Barcode = req.Barcode
	}
	if req.Sku != "" {
		product.Sku = req.Sku
	}
	if req.Weight != nil {
		product.Weight = *req.Weight
	}
	if req.Volume != nil {
		product.Volume = *req.Volume
	}
	if req.Notes != "" {
		product.Notes = req.Notes
	}
	if req.ManufacturerPartNumber != "" {
		product.ManufacturerPartNumber = req.ManufacturerPartNumber
	}
	if req.PurchaseUomID != nil {
		product.PurchaseUomID = req.PurchaseUomID
	}
	if req.PurchaseUomConversion != nil {
		product.PurchaseUomConversion = *req.PurchaseUomConversion
	}
	if req.TaxType != "" {
		product.TaxType = req.TaxType
	}
	if req.IsTaxInclusive != nil {
		product.IsTaxInclusive = *req.IsTaxInclusive
	}
	if req.LeadTimeDays != nil {
		product.LeadTimeDays = *req.LeadTimeDays
	}
	if req.IsActive != nil {
		product.IsActive = *req.IsActive
	}

	// Reset status if was rejected
	if product.Status == models.ProductStatusRejected {
		product.Status = models.ProductStatusDraft
	}

	if err := u.repo.Update(ctx, product); err != nil {
		return dto.ProductResponse{}, err
	}

	// Reload to get relations
	product, err = u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.ProductResponse{}, err
	}

	return mapper.ToProductResponse(product), nil
}

func (u *productUsecase) Delete(ctx context.Context, id string) error {
	product, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return errors.New("product not found")
	}

	// Only allow deletion of draft products
	if product.Status != models.ProductStatusDraft {
		return errors.New("can only delete draft products")
	}

	return u.repo.Delete(ctx, id)
}

func (u *productUsecase) Submit(ctx context.Context, id string) (dto.ProductResponse, error) {
	product, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.ProductResponse{}, err
	}

	if product.Status != models.ProductStatusDraft && product.Status != models.ProductStatusRejected {
		return dto.ProductResponse{}, errors.New("can only submit draft or rejected products")
	}

	product.Status = models.ProductStatusPending

	if err := u.repo.Update(ctx, product); err != nil {
		return dto.ProductResponse{}, err
	}

	// Reload to get relations
	product, err = u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.ProductResponse{}, err
	}

	return mapper.ToProductResponse(product), nil
}

func (u *productUsecase) Approve(ctx context.Context, id string, userID string, req dto.ApproveProductRequest) (dto.ProductResponse, error) {
	product, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.ProductResponse{}, err
	}

	if product.Status != models.ProductStatusPending {
		return dto.ProductResponse{}, errors.New("can only approve/reject pending products")
	}

	now := time.Now()

	if req.Action == "approve" {
		product.Status = models.ProductStatusApproved
		product.IsApproved = true
		product.ApprovedBy = &userID
		product.ApprovedAt = &now
	} else {
		product.Status = models.ProductStatusRejected
		product.IsApproved = false
	}

	if err := u.repo.Update(ctx, product); err != nil {
		return dto.ProductResponse{}, err
	}

	// Reload to get relations
	product, err = u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.ProductResponse{}, err
	}

	return mapper.ToProductResponse(product), nil
}
