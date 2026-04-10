package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/product/data/models"
	"github.com/gilabs/gims/api/internal/product/data/repositories"
	"github.com/gilabs/gims/api/internal/product/domain/dto"
	"github.com/gilabs/gims/api/internal/product/domain/mapper"
	"github.com/google/uuid"
	"gorm.io/gorm"
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
	GetRecipe(ctx context.Context, id string) ([]dto.RecipeItemResponse, error)
	UpdateRecipe(ctx context.Context, id string, items []dto.RecipeItemRequest) ([]dto.RecipeItemResponse, error)
}

type productUsecase struct {
	db           *gorm.DB
	repo         repositories.ProductRepository
	categoryRepo repositories.ProductCategoryRepository
}

// NewProductUsecase creates a new ProductUsecase
func NewProductUsecase(db *gorm.DB, repo repositories.ProductRepository, categoryRepo repositories.ProductCategoryRepository) ProductUsecase {
	return &productUsecase{
		db:           db,
		repo:         repo,
		categoryRepo: categoryRepo,
	}
}

func (u *productUsecase) Create(ctx context.Context, req dto.CreateProductRequest, userID string) (dto.ProductResponse, error) {
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	// Generate Product Code
	prefix := "PRD"
	if req.CategoryID != nil {
		category, err := u.categoryRepo.FindByID(ctx, *req.CategoryID)
		if err == nil && category != nil {
			// Generate prefix from Category Name (uppercase, no spaces, max 3 chars)
			cleanedName := strings.ReplaceAll(strings.ToUpper(category.Name), " ", "")
			runes := []rune(cleanedName)
			if len(runes) >= 3 {
				prefix = string(runes[:3])
			} else if len(runes) > 0 {
				prefix = string(runes)
			}
		}
	}
	
	var imageURL *string
	if req.ImageURL != "" {
		imageURL = &req.ImageURL
	}

	// Format: PREFIX-YYYYMMDD-RAND4 (e.g., MED-20231023-A1B2)
	timestamp := apptime.Now().Format("20060102")
	randomSuffix := strings.ToUpper(uuid.New().String()[:4])
	generatedCode := fmt.Sprintf("%s-%s-%s", prefix, timestamp, randomSuffix)

	// Determine ProductKind defaults
	productKind := models.ProductKindStock
	if req.ProductKind != "" {
		productKind = req.ProductKind
	}

	// IsInventoryTracked defaults: true for STOCK, false for RECIPE/SERVICE
	isInventoryTracked := productKind == models.ProductKindStock
	if req.IsInventoryTracked != nil {
		isInventoryTracked = *req.IsInventoryTracked
	}

	product := &models.Product{
		ID:                     uuid.New().String(),
		Code:                   generatedCode,
		Name:                   req.Name,
		Description:            req.Description,
		ImageURL:               imageURL,
		ManufacturerPartNumber: req.ManufacturerPartNumber,
		CategoryID:             req.CategoryID,
		BrandID:                req.BrandID,
		SegmentID:              req.SegmentID,
		TypeID:                 req.TypeID,
		UomID:                  req.UomID,
		PurchaseUomID:          req.PurchaseUomID,
		PurchaseUomConversion:  req.PurchaseUomConversion,
		PackagingID:            req.PackagingID,
		ProcurementTypeID:      req.ProcurementTypeID,
		SupplierID:             req.SupplierID,
		BusinessUnitID:         req.BusinessUnitID,
		CostPrice:              req.CostPrice,
		SellingPrice:           req.SellingPrice,
		MinStock:               req.MinStock,
		MaxStock:               req.MaxStock,
		TaxType:                req.TaxType,
		IsTaxInclusive:         req.IsTaxInclusive,
		LeadTimeDays:           req.LeadTimeDays,
		Barcode:                req.Barcode,
		Sku:                    generatedCode,
		Weight:                 req.Weight,
		Volume:                 req.Volume,
		Notes:                  req.Notes,
		Status:                 models.ProductStatusApproved,
		IsApproved:             true,
		CreatedBy:              &userID,
		IsActive:               isActive,
		ProductKind:            productKind,
		IsIngredient:           req.IsIngredient,
		IsInventoryTracked:     isInventoryTracked,
		IsPosAvailable:         req.IsPosAvailable,
	}

	// Validate recipe items for RECIPE kind
	if productKind == models.ProductKindRecipe && len(req.RecipeItems) == 0 {
		return dto.ProductResponse{}, errors.New("RECIPE products must have at least one recipe item")
	}

	if err := u.repo.Create(ctx, product); err != nil {
		return dto.ProductResponse{}, err
	}

	// Create recipe items if present
	if len(req.RecipeItems) > 0 {
		if err := u.saveRecipeItems(product.ID, req.RecipeItems); err != nil {
			return dto.ProductResponse{}, fmt.Errorf("failed to save recipe items: %w", err)
		}
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

	if req.Code != "" {
		product.Code = req.Code
	}
	if req.Name != "" {
		product.Name = req.Name
	}
	if req.Description != "" {
		product.Description = req.Description
	}
	if req.ImageURL != nil {
		if *req.ImageURL == "" {
			product.ImageURL = nil
		} else {
			product.ImageURL = req.ImageURL
		}
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
	if req.ProductKind != "" {
		product.ProductKind = req.ProductKind
	}
	if req.IsIngredient != nil {
		product.IsIngredient = *req.IsIngredient
	}
	if req.IsInventoryTracked != nil {
		product.IsInventoryTracked = *req.IsInventoryTracked
	}
	if req.IsPosAvailable != nil {
		product.IsPosAvailable = *req.IsPosAvailable
	}

	// Validate recipe items for RECIPE kind
	if product.ProductKind == models.ProductKindRecipe && len(req.RecipeItems) > 0 {
		// Replace pattern: delete existing + create new
		if err := u.replaceRecipeItems(product.ID, req.RecipeItems); err != nil {
			return dto.ProductResponse{}, fmt.Errorf("failed to update recipe items: %w", err)
		}
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
	_, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return errors.New("product not found")
	}

	// Soft delete product
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

	now := apptime.Now()

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

func (u *productUsecase) GetRecipe(ctx context.Context, id string) ([]dto.RecipeItemResponse, error) {
	product, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return nil, errors.New("product not found")
	}

	if product.ProductKind != models.ProductKindRecipe {
		return nil, errors.New("only RECIPE kind products have recipe items")
	}

	resp := mapper.ToProductResponse(product)
	return resp.RecipeItems, nil
}

func (u *productUsecase) UpdateRecipe(ctx context.Context, id string, items []dto.RecipeItemRequest) ([]dto.RecipeItemResponse, error) {
	product, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return nil, errors.New("product not found")
	}

	if product.ProductKind != models.ProductKindRecipe {
		return nil, errors.New("only RECIPE kind products can have recipe items")
	}

	if len(items) == 0 {
		return nil, errors.New("RECIPE products must have at least one recipe item")
	}

	if err := u.replaceRecipeItems(id, items); err != nil {
		return nil, fmt.Errorf("failed to update recipe items: %w", err)
	}

	// Reload to get full recipe with ingredient details
	product, err = u.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	resp := mapper.ToProductResponse(product)
	return resp.RecipeItems, nil
}

// saveRecipeItems creates recipe items for a product
func (u *productUsecase) saveRecipeItems(productID string, items []dto.RecipeItemRequest) error {
	return database.RetryTx(u.db, func(tx *gorm.DB) error {
		for _, item := range items {
			ri := models.ProductRecipeItem{
				ID:                  uuid.New().String(),
				ProductID:           productID,
				IngredientProductID: item.IngredientProductID,
				Quantity:            item.Quantity,
				UomID:               item.UomID,
				Notes:               item.Notes,
				SortOrder:           item.SortOrder,
			}
			if err := tx.Create(&ri).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// replaceRecipeItems deletes existing recipe items and creates new ones
func (u *productUsecase) replaceRecipeItems(productID string, items []dto.RecipeItemRequest) error {
	return database.RetryTx(u.db, func(tx *gorm.DB) error {
		// Hard-delete existing recipe items (subordinate records, not soft-deleted)
		if err := tx.Unscoped().Where("product_id = ?", productID).Delete(&models.ProductRecipeItem{}).Error; err != nil {
			return err
		}

		for _, item := range items {
			ri := models.ProductRecipeItem{
				ID:                  uuid.New().String(),
				ProductID:           productID,
				IngredientProductID: item.IngredientProductID,
				Quantity:            item.Quantity,
				UomID:               item.UomID,
				Notes:               item.Notes,
				SortOrder:           item.SortOrder,
			}
			if err := tx.Create(&ri).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
