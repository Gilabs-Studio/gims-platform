package mapper

import (
	"time"

	"github.com/gilabs/gims/api/internal/organization/data/models"
	"github.com/gilabs/gims/api/internal/organization/domain/dto"
)

// ToAreaResponse converts Area model to AreaResponse DTO.
// Supervisor/member counts are computed from preloaded EmployeeAreas.
func ToAreaResponse(m *models.Area) *dto.AreaResponse {
	if m == nil {
		return nil
	}

	supervisorCount := 0
	memberCount := 0
	for _, ea := range m.EmployeeAreas {
		if ea.IsSupervisor {
			supervisorCount++
		} else {
			memberCount++
		}
	}

	return &dto.AreaResponse{
		ID:              m.ID,
		Name:            m.Name,
		Description:     m.Description,
		IsActive:        m.IsActive,
		SupervisorCount: supervisorCount,
		MemberCount:     memberCount,
		CreatedAt:       m.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       m.UpdatedAt.Format(time.RFC3339),
	}
}

// ToAreaDetailResponse converts an Area model (with preloaded EmployeeAreas) to a detailed response DTO.
func ToAreaDetailResponse(m *models.Area) *dto.AreaDetailResponse {
	if m == nil {
		return nil
	}

	supervisors := make([]dto.EmployeeInAreaResponse, 0)
	members := make([]dto.EmployeeInAreaResponse, 0)

	for _, ea := range m.EmployeeAreas {
		if ea.Employee == nil {
			continue
		}

		emp := ea.Employee
		empResp := dto.EmployeeInAreaResponse{
			ID:           emp.ID,
			EmployeeCode: emp.EmployeeCode,
			Name:         emp.Name,
			Email:        emp.Email,
			IsSupervisor: ea.IsSupervisor,
		}

		if emp.DivisionID != nil {
			empResp.DivisionID = emp.DivisionID
		}
		if emp.Division != nil {
			empResp.DivisionName = emp.Division.Name
		}
		if emp.JobPosition != nil {
			empResp.JobPosition = emp.JobPosition.Name
		}

		if ea.IsSupervisor {
			supervisors = append(supervisors, empResp)
		} else {
			members = append(members, empResp)
		}
	}

	return &dto.AreaDetailResponse{
		ID:              m.ID,
		Name:            m.Name,
		Description:     m.Description,
		IsActive:        m.IsActive,
		Supervisors:     supervisors,
		Members:         members,
		SupervisorCount: len(supervisors),
		MemberCount:     len(members),
		CreatedAt:       m.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       m.UpdatedAt.Format(time.RFC3339),
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
