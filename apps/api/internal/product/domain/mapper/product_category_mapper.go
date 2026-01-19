package mapper

import (
	"github.com/gilabs/crm-healthcare/api/internal/product/data/models"
	"github.com/gilabs/crm-healthcare/api/internal/product/domain/dto"
)

// ToProductCategoryResponse converts ProductCategory model to response DTO
func ToProductCategoryResponse(m *models.ProductCategory) dto.ProductCategoryResponse {
	resp := dto.ProductCategoryResponse{
		ID:          m.ID,
		Name:        m.Name,
		Description: m.Description,
		ParentID:    m.ParentID,
		IsActive:    m.IsActive,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}

	if m.Parent != nil {
		parent := ToProductCategoryResponse(m.Parent)
		resp.Parent = &parent
	}

	return resp
}

// ToProductCategoryResponseList converts a slice of ProductCategory models to response DTOs
func ToProductCategoryResponseList(models []models.ProductCategory) []dto.ProductCategoryResponse {
	responses := make([]dto.ProductCategoryResponse, len(models))
	for i, m := range models {
		responses[i] = ToProductCategoryResponse(&m)
	}
	return responses
}
