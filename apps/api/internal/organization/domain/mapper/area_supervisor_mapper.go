package mapper

import (
	"time"

	"github.com/gilabs/gims/api/internal/organization/data/models"
	"github.com/gilabs/gims/api/internal/organization/domain/dto"
)

// ToAreaSupervisorResponse converts AreaSupervisor model to AreaSupervisorResponse DTO
func ToAreaSupervisorResponse(m *models.AreaSupervisor) *dto.AreaSupervisorResponse {
	if m == nil {
		return nil
	}

	resp := &dto.AreaSupervisorResponse{
		ID:        m.ID,
		Name:      m.Name,
		Email:     m.Email,
		Phone:     m.Phone,
		IsActive:  m.IsActive,
		CreatedAt: m.CreatedAt.Format(time.RFC3339),
		UpdatedAt: m.UpdatedAt.Format(time.RFC3339),
	}

	// Map assigned areas
	if len(m.Areas) > 0 {
		resp.Areas = make([]dto.AreaResponse, 0, len(m.Areas))
		for _, assignment := range m.Areas {
			if assignment.Area != nil {
				resp.Areas = append(resp.Areas, *ToAreaResponse(assignment.Area))
			}
		}
	}

	return resp
}

// ToAreaSupervisorResponses converts slice of AreaSupervisor models to slice of AreaSupervisorResponse DTOs
func ToAreaSupervisorResponses(models []models.AreaSupervisor) []dto.AreaSupervisorResponse {
	responses := make([]dto.AreaSupervisorResponse, len(models))
	for i, m := range models {
		responses[i] = *ToAreaSupervisorResponse(&m)
	}
	return responses
}

// AreaSupervisorFromCreateRequest creates AreaSupervisor model from CreateAreaSupervisorRequest
func AreaSupervisorFromCreateRequest(req *dto.CreateAreaSupervisorRequest) *models.AreaSupervisor {
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	return &models.AreaSupervisor{
		Name:     req.Name,
		Email:    req.Email,
		Phone:    req.Phone,
		IsActive: isActive,
	}
}

// ToAreaSupervisorAreaResponse converts AreaSupervisorArea model to response DTO
func ToAreaSupervisorAreaResponse(m *models.AreaSupervisorArea) *dto.AreaSupervisorAreaResponse {
	if m == nil {
		return nil
	}

	resp := &dto.AreaSupervisorAreaResponse{
		ID:               m.ID,
		AreaSupervisorID: m.AreaSupervisorID,
		AreaID:           m.AreaID,
		CreatedAt:        m.CreatedAt.Format(time.RFC3339),
	}

	if m.Area != nil {
		resp.Area = ToAreaResponse(m.Area)
	}

	return resp
}
