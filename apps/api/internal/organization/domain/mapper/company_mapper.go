package mapper

import (
	"time"

	geographicMapper "github.com/gilabs/gims/api/internal/geographic/domain/mapper"
	"github.com/gilabs/gims/api/internal/organization/data/models"
	"github.com/gilabs/gims/api/internal/organization/domain/dto"
)

// ToCompanyResponse converts Company model to CompanyResponse DTO
func ToCompanyResponse(m *models.Company) *dto.CompanyResponse {
	if m == nil {
		return nil
	}

	resp := &dto.CompanyResponse{
		ID:         m.ID,
		Name:       m.Name,
		Address:    m.Address,
		Email:      m.Email,
		Phone:      m.Phone,
		NPWP:       m.NPWP,
		NIB:        m.NIB,
		VillageID:  m.VillageID,
		Latitude:   m.Latitude,
		Longitude:  m.Longitude,
		DirectorID: m.DirectorID,
		Status:     string(m.Status),
		IsApproved: m.IsApproved,
		CreatedBy:  m.CreatedBy,
		ApprovedBy: m.ApprovedBy,
		IsActive:   m.IsActive,
		CreatedAt:  m.CreatedAt.Format(time.RFC3339),
		UpdatedAt:  m.UpdatedAt.Format(time.RFC3339),
	}

	if m.ApprovedAt != nil {
		formatted := m.ApprovedAt.Format(time.RFC3339)
		resp.ApprovedAt = &formatted
	}

	// Map village if present
	if m.Village != nil {
		resp.Village = geographicMapper.ToVillageResponse(m.Village)
	}

	return resp
}

// ToCompanyResponses converts slice of Company models to slice of CompanyResponse DTOs
func ToCompanyResponses(models []models.Company) []dto.CompanyResponse {
	responses := make([]dto.CompanyResponse, len(models))
	for i, m := range models {
		responses[i] = *ToCompanyResponse(&m)
	}
	return responses
}

// CompanyFromCreateRequest creates Company model from CreateCompanyRequest
func CompanyFromCreateRequest(req *dto.CreateCompanyRequest, createdBy *string) *models.Company {
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	return &models.Company{
		Name:       req.Name,
		Address:    req.Address,
		Email:      req.Email,
		Phone:      req.Phone,
		NPWP:       req.NPWP,
		NIB:        req.NIB,
		VillageID:  req.VillageID,
		Latitude:   req.Latitude,
		Longitude:  req.Longitude,
		DirectorID: req.DirectorID,
		Status:     models.CompanyStatusDraft,
		IsApproved: false,
		CreatedBy:  createdBy,
		IsActive:   isActive,
	}
}
