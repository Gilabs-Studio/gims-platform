package mapper

import (
	"time"

	"github.com/gilabs/crm-healthcare/api/internal/organization/data/models"
	"github.com/gilabs/crm-healthcare/api/internal/organization/domain/dto"
)

// ToEmployeeResponse converts Employee model to EmployeeResponse DTO
func ToEmployeeResponse(e *models.Employee) dto.EmployeeResponse {
	resp := dto.EmployeeResponse{
		ID:               e.ID,
		EmployeeCode:     e.EmployeeCode,
		Name:             e.Name,
		Email:            e.Email,
		Phone:            e.Phone,
		UserID:           e.UserID,
		DivisionID:       e.DivisionID,
		JobPositionID:    e.JobPositionID,
		CompanyID:        e.CompanyID,
		PlaceOfBirth:     e.PlaceOfBirth,
		Gender:           string(e.Gender),
		Religion:         e.Religion,
		Address:          e.Address,
		VillageID:        e.VillageID,
		NIK:              e.NIK,
		NPWP:             e.NPWP,
		BPJS:             e.BPJS,
		ContractStatus:   string(e.ContractStatus),
		TotalLeaveQuota:  e.TotalLeaveQuota,
		PTKPStatus:       string(e.PTKPStatus),
		IsDisability:     e.IsDisability,
		ReplacementForID: e.ReplacementForID,
		Status:           string(e.Status),
		IsApproved:       e.IsApproved,
		CreatedBy:        e.CreatedBy,
		ApprovedBy:       e.ApprovedBy,
		IsActive:         e.IsActive,
		CreatedAt:        e.CreatedAt.Format(time.RFC3339),
		UpdatedAt:        e.UpdatedAt.Format(time.RFC3339),
	}

	// Date of birth
	if e.DateOfBirth != nil {
		dob := e.DateOfBirth.Format("2006-01-02")
		resp.DateOfBirth = &dob
	}

	// Contract dates
	if e.ContractStartDate != nil {
		start := e.ContractStartDate.Format("2006-01-02")
		resp.ContractStartDate = &start
	}
	if e.ContractEndDate != nil {
		end := e.ContractEndDate.Format("2006-01-02")
		resp.ContractEndDate = &end
	}

	// Approved at
	if e.ApprovedAt != nil {
		at := e.ApprovedAt.Format(time.RFC3339)
		resp.ApprovedAt = &at
	}

	// Division
	if e.Division != nil {
		resp.Division = &dto.DivisionResponse{
			ID:          e.Division.ID,
			Name:        e.Division.Name,
			Description: e.Division.Description,
			IsActive:    e.Division.IsActive,
		}
	}

	// JobPosition
	if e.JobPosition != nil {
		resp.JobPosition = &dto.JobPositionResponse{
			ID:          e.JobPosition.ID,
			Name:        e.JobPosition.Name,
			Description: e.JobPosition.Description,
			IsActive:    e.JobPosition.IsActive,
		}
	}

	// Company
	if e.Company != nil {
		resp.Company = &dto.CompanyBriefResponse{
			ID:   e.Company.ID,
			Name: e.Company.Name,
		}
	}

	// User
	if e.User != nil {
		resp.User = &dto.UserBriefResponse{
			ID:    e.User.ID,
			Name:  e.User.Name,
			Email: e.User.Email,
		}
	}

	// Village with hierarchy
	if e.Village != nil {
		villageResp := &dto.VillageResponse{
			ID:   e.Village.ID,
			Name: e.Village.Name,
		}
		if e.Village.District != nil {
			villageResp.District = &dto.DistrictResponse{
				ID:   e.Village.District.ID,
				Name: e.Village.District.Name,
			}
			if e.Village.District.City != nil {
				villageResp.District.City = &dto.CityResponse{
					ID:   e.Village.District.City.ID,
					Name: e.Village.District.City.Name,
				}
				if e.Village.District.City.Province != nil {
					villageResp.District.City.Province = &dto.ProvinceResponse{
						ID:   e.Village.District.City.Province.ID,
						Name: e.Village.District.City.Province.Name,
					}
				}
			}
		}
		resp.Village = villageResp
	}

	// Replacement for
	if e.ReplacementFor != nil {
		resp.ReplacementFor = &dto.EmployeeBriefResponse{
			ID:           e.ReplacementFor.ID,
			EmployeeCode: e.ReplacementFor.EmployeeCode,
			Name:         e.ReplacementFor.Name,
		}
	}

	// Areas
	if len(e.Areas) > 0 {
		areas := make([]dto.AreaResponse, 0, len(e.Areas))
		for _, ea := range e.Areas {
			if ea.Area != nil {
				areas = append(areas, dto.AreaResponse{
					ID:          ea.Area.ID,
					Name:        ea.Area.Name,
					Description: ea.Area.Description,
					IsActive:    ea.Area.IsActive,
				})
			}
		}
		resp.Areas = areas
	}

	return resp
}

// ToEmployeeListResponse converts a slice of Employee models to response DTOs
func ToEmployeeListResponse(employees []models.Employee) []dto.EmployeeResponse {
	result := make([]dto.EmployeeResponse, 0, len(employees))
	for i := range employees {
		result = append(result, ToEmployeeResponse(&employees[i]))
	}
	return result
}
