package mapper

import (
	"github.com/gilabs/gims/api/internal/crm/data/models"
	"github.com/gilabs/gims/api/internal/crm/domain/dto"
)

// ToLeadResponse converts a Lead model to LeadResponse DTO
func ToLeadResponse(lead *models.Lead) dto.LeadResponse {
	resp := dto.LeadResponse{
		ID:              lead.ID,
		Code:            lead.Code,
		FirstName:       lead.FirstName,
		LastName:        lead.LastName,
		CompanyName:     lead.CompanyName,
		Email:           lead.Email,
		Phone:           lead.Phone,
		JobTitle:        lead.JobTitle,
		Address:         lead.Address,
		City:            lead.City,
		Province:        lead.Province,
		LeadSourceID:    lead.LeadSourceID,
		LeadStatusID:    lead.LeadStatusID,
		LeadScore:       lead.LeadScore,
		Probability:     lead.Probability,
		EstimatedValue:  lead.EstimatedValue,
		BudgetConfirmed: lead.BudgetConfirmed,
		BudgetAmount:    lead.BudgetAmount,
		AuthConfirmed:   lead.AuthConfirmed,
		AuthPerson:      lead.AuthPerson,
		NeedConfirmed:   lead.NeedConfirmed,
		NeedDescription: lead.NeedDescription,
		TimeConfirmed:   lead.TimeConfirmed,
		AssignedTo:      lead.AssignedTo,
		CustomerID:      lead.CustomerID,
		ContactID:       lead.ContactID,
		DealID:          lead.DealID,
		ConvertedBy:     lead.ConvertedBy,
		Notes:           lead.Notes,
		CreatedBy:       lead.CreatedBy,
		CreatedAt:       lead.CreatedAt.Format("2006-01-02T15:04:05+07:00"),
		UpdatedAt:       lead.UpdatedAt.Format("2006-01-02T15:04:05+07:00"),
		Latitude:        lead.Latitude,
		Longitude:       lead.Longitude,
		Rating:          lead.Rating,
		RatingCount:     lead.RatingCount,
		Types:           lead.Types,
		OpeningHours:    lead.OpeningHours,
		ThumbnailURL:    lead.ThumbnailURL,
		CID:             lead.CID,
		PlaceID:         lead.PlaceID,
	}

	if lead.TimeExpected != nil {
		t := lead.TimeExpected.Format("2006-01-02")
		resp.TimeExpected = &t
	}

	if lead.ConvertedAt != nil {
		t := lead.ConvertedAt.Format("2006-01-02T15:04:05+07:00")
		resp.ConvertedAt = &t
	}

	if lead.LeadSource != nil {
		resp.LeadSource = &dto.LeadSourceInfo{
			ID:   lead.LeadSource.ID,
			Name: lead.LeadSource.Name,
			Code: lead.LeadSource.Code,
		}
	}

	if lead.LeadStatus != nil {
		resp.LeadStatus = &dto.LeadStatusInfo{
			ID:          lead.LeadStatus.ID,
			Name:        lead.LeadStatus.Name,
			Code:        lead.LeadStatus.Code,
			Color:       lead.LeadStatus.Color,
			Score:       lead.LeadStatus.Score,
			IsConverted: lead.LeadStatus.IsConverted,
		}
	}

	if lead.AssignedEmployee != nil {
		resp.AssignedEmployee = &dto.LeadEmployeeInfo{
			ID:           lead.AssignedEmployee.ID,
			EmployeeCode: lead.AssignedEmployee.EmployeeCode,
			Name:         lead.AssignedEmployee.Name,
		}
	}

	if lead.Customer != nil {
		resp.Customer = &dto.LeadCustomerInfo{
			ID:   lead.Customer.ID,
			Code: lead.Customer.Code,
			Name: lead.Customer.Name,
		}
	}

	return resp
}

// ToLeadResponseList converts a slice of Lead models to LeadResponse DTOs
func ToLeadResponseList(leads []models.Lead) []dto.LeadResponse {
	result := make([]dto.LeadResponse, 0, len(leads))
	for i := range leads {
		result = append(result, ToLeadResponse(&leads[i]))
	}
	return result
}
