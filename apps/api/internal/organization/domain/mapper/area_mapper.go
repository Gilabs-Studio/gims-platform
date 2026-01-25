package mapper

import (
	"time"

	"github.com/gilabs/gims/api/internal/organization/data/models"
	"github.com/gilabs/gims/api/internal/organization/domain/dto"
)

// ToAreaResponse converts Area model to AreaResponse DTO
func ToAreaResponse(m *models.Area) *dto.AreaResponse {
	if m == nil {
		return nil
	}
	return &dto.AreaResponse{
		ID:          m.ID,
		Name:        m.Name,
		Description: m.Description,
		IsActive:    m.IsActive,
		CreatedAt:   m.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   m.UpdatedAt.Format(time.RFC3339),
	}
}

// ToAreaResponses converts slice of Area models to slice of AreaResponse DTOs
func ToAreaResponses(models []models.Area) []dto.AreaResponse {
	responses := make([]dto.AreaResponse, len(models))
	for i, m := range models {
		responses[i] = *ToAreaResponse(&m)
	}
	return responses
}

// AreaFromCreateRequest creates Area model from CreateAreaRequest
func AreaFromCreateRequest(req *dto.CreateAreaRequest) *models.Area {
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	return &models.Area{
		Name:        req.Name,
		Description: req.Description,
		IsActive:    isActive,
	}
}
