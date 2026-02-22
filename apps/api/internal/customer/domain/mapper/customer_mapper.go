package mapper

import (
	"github.com/gilabs/gims/api/internal/customer/data/models"
	"github.com/gilabs/gims/api/internal/customer/domain/dto"
	supplierDTO "github.com/gilabs/gims/api/internal/supplier/domain/dto"
)

// ToCustomerResponse converts Customer model to response DTO
func ToCustomerResponse(m *models.Customer) dto.CustomerResponse {
	resp := dto.CustomerResponse{
		ID:             m.ID,
		Code:           m.Code,
		Name:           m.Name,
		CustomerTypeID: m.CustomerTypeID,
		Address:        m.Address,
		VillageID:      m.VillageID,
		Email:          m.Email,
		Website:        m.Website,
		NPWP:           m.NPWP,
		ContactPerson:  m.ContactPerson,
		Notes:          m.Notes,
		Latitude:       m.Latitude,
		Longitude:      m.Longitude,
		Status:         string(m.Status),
		IsApproved:     m.IsApproved,
		CreatedBy:      m.CreatedBy,
		ApprovedBy:     m.ApprovedBy,
		ApprovedAt:     m.ApprovedAt,
		IsActive:       m.IsActive,
		CreatedAt:      m.CreatedAt,
		UpdatedAt:      m.UpdatedAt,
	}

	// Map CustomerType if loaded
	if m.CustomerType != nil {
		customerType := ToCustomerTypeResponse(m.CustomerType)
		resp.CustomerType = &customerType
	}

	// Map Village with nested district/city/province if loaded
	if m.Village != nil {
		resp.Village = toVillageResponse(m)
	}

	// Map phone numbers if loaded
	if len(m.PhoneNumbers) > 0 {
		resp.PhoneNumbers = toPhoneNumberResponseList(m.PhoneNumbers)
	}

	// Map bank accounts if loaded
	if len(m.BankAccounts) > 0 {
		resp.BankAccounts = toCustomerBankResponseList(m.BankAccounts)
	}

	return resp
}

// ToCustomerResponseList converts a slice of Customer models to response DTOs
func ToCustomerResponseList(models []models.Customer) []dto.CustomerResponse {
	responses := make([]dto.CustomerResponse, len(models))
	for i := range models {
		responses[i] = ToCustomerResponse(&models[i])
	}
	return responses
}

// toPhoneNumberResponse converts a single CustomerPhoneNumber model to DTO
func toPhoneNumberResponse(m *models.CustomerPhoneNumber) dto.PhoneNumberResponse {
	return dto.PhoneNumberResponse{
		ID:          m.ID,
		CustomerID:  m.CustomerID,
		PhoneNumber: m.PhoneNumber,
		Label:       m.Label,
		IsPrimary:   m.IsPrimary,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}
}

func toPhoneNumberResponseList(models []models.CustomerPhoneNumber) []dto.PhoneNumberResponse {
	responses := make([]dto.PhoneNumberResponse, len(models))
	for i := range models {
		responses[i] = toPhoneNumberResponse(&models[i])
	}
	return responses
}

// toCustomerBankResponse converts a single CustomerBank model to DTO
func toCustomerBankResponse(m *models.CustomerBank) dto.CustomerBankResponse {
	resp := dto.CustomerBankResponse{
		ID:            m.ID,
		CustomerID:    m.CustomerID,
		BankID:        m.BankID,
		AccountNumber: m.AccountNumber,
		AccountName:   m.AccountName,
		Branch:        m.Branch,
		IsPrimary:     m.IsPrimary,
		CreatedAt:     m.CreatedAt,
		UpdatedAt:     m.UpdatedAt,
	}

	if m.Bank != nil {
		bank := supplierDTO.BankResponse{
			ID:        m.Bank.ID,
			Name:      m.Bank.Name,
			Code:      m.Bank.Code,
			SwiftCode: m.Bank.SwiftCode,
			IsActive:  m.Bank.IsActive,
			CreatedAt: m.Bank.CreatedAt,
			UpdatedAt: m.Bank.UpdatedAt,
		}
		resp.Bank = &bank
	}

	return resp
}

func toCustomerBankResponseList(models []models.CustomerBank) []dto.CustomerBankResponse {
	responses := make([]dto.CustomerBankResponse, len(models))
	for i := range models {
		responses[i] = toCustomerBankResponse(&models[i])
	}
	return responses
}

// toVillageResponse maps nested geographic Village chain from Customer model
func toVillageResponse(m *models.Customer) *dto.VillageResponse {
	if m.Village == nil {
		return nil
	}

	village := &dto.VillageResponse{
		ID:   m.Village.ID,
		Name: m.Village.Name,
	}

	if m.Village.District != nil {
		village.District = &dto.DistrictResponse{
			ID:   m.Village.District.ID,
			Name: m.Village.District.Name,
		}
		if m.Village.District.City != nil {
			village.District.City = &dto.CityResponse{
				ID:   m.Village.District.City.ID,
				Name: m.Village.District.City.Name,
			}
			if m.Village.District.City.Province != nil {
				village.District.City.Province = &dto.ProvinceResponse{
					ID:   m.Village.District.City.Province.ID,
					Name: m.Village.District.City.Province.Name,
				}
			}
		}
	}

	return village
}
