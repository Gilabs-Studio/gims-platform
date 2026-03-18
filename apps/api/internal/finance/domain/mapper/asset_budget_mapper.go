package mapper

import (
	"fmt"
	"time"

	"github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
)

type AssetBudgetMapper struct{}

func NewAssetBudgetMapper() *AssetBudgetMapper {
	return &AssetBudgetMapper{}
}

func (m *AssetBudgetMapper) ToResponse(budget *models.AssetBudget, includeCategories bool) dto.AssetBudgetResponse {
	resp := dto.AssetBudgetResponse{
		ID:          budget.ID,
		BudgetCode:  budget.BudgetCode,
		BudgetName:  budget.BudgetName,
		Description: budget.Description,
		FiscalYear:  budget.FiscalYear,
		StartDate:   budget.StartDate.Format("2006-01-02"),
		EndDate:     budget.EndDate.Format("2006-01-02"),
		TotalBudget: budget.TotalBudget,
		Status:      string(budget.Status),
		CreatedAt:   budget.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   budget.UpdatedAt.Format(time.RFC3339),
	}

	if includeCategories {
		resp.Categories = make([]dto.AssetBudgetCategoryResponse, 0, len(budget.Categories))
		totalAllocated := 0.0

		for _, cat := range budget.Categories {
			resp.Categories = append(resp.Categories, m.ToCategoryResponse(&cat))
			totalAllocated += cat.AllocatedAmount
		}

		// Calculate summary
		totalUsed := budget.TotalUsed()
		totalCommitted := budget.TotalCommitted()
		totalAvailable := totalAllocated - totalUsed - totalCommitted
		utilizationRate := 0.0
		if totalAllocated > 0 {
			utilizationRate = ((totalUsed + totalCommitted) / totalAllocated) * 100
		}

		resp.Summary = dto.AssetBudgetSummaryResponse{
			TotalAllocated:  totalAllocated,
			TotalUsed:       totalUsed,
			TotalCommitted:  totalCommitted,
			TotalAvailable:  totalAvailable,
			UtilizationRate: utilizationRate,
		}
	}

	return resp
}

func (m *AssetBudgetMapper) ToCategoryResponse(cat *models.AssetBudgetCategory) dto.AssetBudgetCategoryResponse {
	categoryID := ""
	if cat.CategoryID != nil {
		categoryID = *cat.CategoryID
	}

	return dto.AssetBudgetCategoryResponse{
		ID:              cat.ID,
		CategoryID:      &categoryID,
		CategoryName:    cat.CategoryName,
		AllocatedAmount: cat.AllocatedAmount,
		UsedAmount:      cat.UsedAmount,
		CommittedAmount: cat.CommittedAmount,
		AvailableAmount: cat.AvailableAmount(),
		Notes:           cat.Notes,
	}
}

func (m *AssetBudgetMapper) ToModel(req *dto.CreateAssetBudgetRequest) (*models.AssetBudget, error) {
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, fmt.Errorf("invalid start_date format")
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return nil, fmt.Errorf("invalid end_date format")
	}

	totalBudget := 0.0
	categories := make([]models.AssetBudgetCategory, 0, len(req.Categories))

	for _, catReq := range req.Categories {
		var catID *string
		if catReq.CategoryID != "" {
			catID = &catReq.CategoryID
		}

		category := models.AssetBudgetCategory{
			CategoryID:      catID,
			CategoryName:    catReq.CategoryName,
			AllocatedAmount: catReq.AllocatedAmount,
			Notes:           catReq.Notes,
		}
		categories = append(categories, category)
		totalBudget += catReq.AllocatedAmount
	}

	return &models.AssetBudget{
		BudgetName:  req.BudgetName,
		Description: req.Description,
		FiscalYear:  req.FiscalYear,
		StartDate:   startDate,
		EndDate:     endDate,
		TotalBudget: totalBudget,
		Status:      models.AssetBudgetStatusDraft,
		Categories:  categories,
	}, nil
}

func (m *AssetBudgetMapper) UpdateModel(budget *models.AssetBudget, req *dto.UpdateAssetBudgetRequest) error {
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return fmt.Errorf("invalid start_date format")
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return fmt.Errorf("invalid end_date format")
	}

	budget.BudgetName = req.BudgetName
	budget.Description = req.Description
	budget.StartDate = startDate
	budget.EndDate = endDate

	// Recalculate total budget and update categories
	totalBudget := 0.0
	newCategories := make([]models.AssetBudgetCategory, 0, len(req.Categories))

	for _, catReq := range req.Categories {
		var catID *string
		if catReq.CategoryID != "" {
			catID = &catReq.CategoryID
		}

		category := models.AssetBudgetCategory{
			CategoryID:      catID,
			CategoryName:    catReq.CategoryName,
			AllocatedAmount: catReq.AllocatedAmount,
			Notes:           catReq.Notes,
		}

		// Preserve usage data if updating existing category
		if catReq.ID != nil && *catReq.ID != "" {
			for _, existingCat := range budget.Categories {
				if existingCat.ID == *catReq.ID {
					category.ID = existingCat.ID
					category.UsedAmount = existingCat.UsedAmount
					category.CommittedAmount = existingCat.CommittedAmount
					break
				}
			}
		}

		newCategories = append(newCategories, category)
		totalBudget += catReq.AllocatedAmount
	}

	budget.TotalBudget = totalBudget
	budget.Categories = newCategories

	return nil
}
