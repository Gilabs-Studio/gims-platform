package mapper

import (
	"github.com/gilabs/gims/api/internal/product/data/models"
	"github.com/gilabs/gims/api/internal/product/domain/dto"
)

// ToProductResponse converts Product model to response DTO
func ToProductResponse(m *models.Product) dto.ProductResponse {
	resp := dto.ProductResponse{
		ID:                m.ID,
		Code:              m.Code,
		Name:              m.Name,
		Description:       m.Description,
		ManufacturerPartNumber: m.ManufacturerPartNumber,
		ImageURL:          m.ImageURL,
		CategoryID:        m.CategoryID,
		BrandID:           m.BrandID,
		SegmentID:         m.SegmentID,
		TypeID:            m.TypeID,
		UomID:             m.UomID,
		PurchaseUomID:     m.PurchaseUomID,
		PurchaseUomConversion: m.PurchaseUomConversion,
		PackagingID:       m.PackagingID,
		ProcurementTypeID: m.ProcurementTypeID,
		SupplierID:        m.SupplierID,
		BusinessUnitID:    m.BusinessUnitID,
		CostPrice:         m.CostPrice,
		SellingPrice:      m.SellingPrice,
		CurrentHpp:        m.CurrentHpp,
		TaxType:           m.TaxType,
		IsTaxInclusive:    m.IsTaxInclusive,
		CurrentStock:      m.CurrentStock,
		MinStock:          m.MinStock,
		MaxStock:          m.MaxStock,
		LeadTimeDays:      m.LeadTimeDays,
		Barcode:           m.Barcode,
		Sku:               m.Sku,
		Weight:            m.Weight,
		Volume:            m.Volume,
		Notes:             m.Notes,
		ProductKind:        m.ProductKind,
		IsIngredient:       m.IsIngredient,
		IsInventoryTracked: m.IsInventoryTracked,
		IsPosAvailable:     m.IsPosAvailable,
		Status:            string(m.Status),
		IsApproved:        m.IsApproved,
		CreatedBy:         m.CreatedBy,
		ApprovedBy:        m.ApprovedBy,
		ApprovedAt:        m.ApprovedAt,
		IsActive:          m.IsActive,
		CreatedAt:         m.CreatedAt,
		UpdatedAt:         m.UpdatedAt,
	}

	// Map nested relations
	if m.Category != nil {
		resp.Category = &dto.ProductCategoryBasic{
			ID:   m.Category.ID,
			Name: m.Category.Name,
		}
	}

	if m.Brand != nil {
		resp.Brand = &dto.ProductBrandBasic{
			ID:   m.Brand.ID,
			Name: m.Brand.Name,
		}
	}

	if m.Segment != nil {
		resp.Segment = &dto.ProductSegmentBasic{
			ID:   m.Segment.ID,
			Name: m.Segment.Name,
		}
	}

	if m.Type != nil {
		resp.Type = &dto.ProductTypeBasic{
			ID:   m.Type.ID,
			Name: m.Type.Name,
		}
	}

	if m.Uom != nil {
		resp.Uom = &dto.UnitOfMeasureBasic{
			ID:     m.Uom.ID,
			Name:   m.Uom.Name,
			Symbol: m.Uom.Symbol,
		}
	}

	if m.PurchaseUom != nil {
		resp.PurchaseUom = &dto.UnitOfMeasureBasic{
			ID:     m.PurchaseUom.ID,
			Name:   m.PurchaseUom.Name,
			Symbol: m.PurchaseUom.Symbol,
		}
	}

	if m.Packaging != nil {
		resp.Packaging = &dto.PackagingBasic{
			ID:   m.Packaging.ID,
			Name: m.Packaging.Name,
		}
	}

	if m.ProcurementType != nil {
		resp.ProcurementType = &dto.ProcurementTypeBasic{
			ID:   m.ProcurementType.ID,
			Name: m.ProcurementType.Name,
		}
	}

	if m.Supplier != nil {
		resp.Supplier = &dto.SupplierBasic{
			ID:   m.Supplier.ID,
			Code: m.Supplier.Code,
			Name: m.Supplier.Name,
		}
	}

	if m.BusinessUnit != nil {
		resp.BusinessUnit = &dto.BusinessUnitBasic{
			ID:   m.BusinessUnit.ID,
			Name: m.BusinessUnit.Name,
		}
	}

	// Map recipe items and calculate recipe cost for RECIPE kind products
	if len(m.RecipeItems) > 0 {
		var totalCost float64
		recipeItems := make([]dto.RecipeItemResponse, 0, len(m.RecipeItems))
		for _, item := range m.RecipeItems {
			ri := dto.RecipeItemResponse{
				ID:                  item.ID,
				IngredientProductID: item.IngredientProductID,
				Quantity:            item.Quantity,
				UomID:               item.UomID,
				Notes:               item.Notes,
				SortOrder:           item.SortOrder,
			}

			if item.IngredientProduct != nil {
				costContribution := item.IngredientProduct.CostPrice * item.Quantity
				ri.CostContribution = costContribution
				totalCost += costContribution
				ri.Ingredient = &dto.RecipeIngredientBasic{
					ID:        item.IngredientProduct.ID,
					Code:      item.IngredientProduct.Code,
					Name:      item.IngredientProduct.Name,
					CostPrice: item.IngredientProduct.CostPrice,
				}
			}

			if item.Uom != nil {
				ri.Uom = &dto.UnitOfMeasureBasic{
					ID:     item.Uom.ID,
					Name:   item.Uom.Name,
					Symbol: item.Uom.Symbol,
				}
			}

			recipeItems = append(recipeItems, ri)
		}
		resp.RecipeItems = recipeItems
		resp.RecipeCost = &totalCost
	}

	return resp
}

// ToProductResponseList converts a slice of Product models to response DTOs
func ToProductResponseList(models []models.Product) []dto.ProductResponse {
	responses := make([]dto.ProductResponse, len(models))
	for i, m := range models {
		responses[i] = ToProductResponse(&m)
	}
	return responses
}
