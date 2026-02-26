package mapper

import (
	geographic "github.com/gilabs/gims/api/internal/geographic/data/models"
	"github.com/gilabs/gims/api/internal/supplier/data/models"
	"github.com/gilabs/gims/api/internal/supplier/domain/dto"
)

// ToSupplierResponse converts Supplier model to response DTO
func ToSupplierResponse(m *models.Supplier) dto.SupplierResponse {
	resp := dto.SupplierResponse{
		ID:             m.ID,
		Code:           m.Code,
		Name:           m.Name,
		SupplierTypeID: m.SupplierTypeID,
		Address:        m.Address,
		ProvinceID:     m.ProvinceID,
		CityID:         m.CityID,
		DistrictID:     m.DistrictID,
		VillageID:      m.VillageID,
		VillageName:    m.VillageName,
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

	// Map other geographic relations if loaded directly
	if m.Province != nil {
		resp.Province = &dto.ProvinceResponse{ID: m.Province.ID, Name: m.Province.Name}
	}
	if m.City != nil {
		resp.City = &dto.CityResponse{ID: m.City.ID, Name: m.City.Name}
	}
	if m.District != nil {
		resp.District = &dto.DistrictResponse{ID: m.District.ID, Name: m.District.Name}
	}

	// Map SupplierType if loaded
	if m.SupplierType != nil {
		supplierType := ToSupplierTypeResponse(m.SupplierType)
		resp.SupplierType = &supplierType
	}

	// Map Village with nested district/city/province if loaded
	if m.Village != nil {
		resp.Village = toVillageResponse(m.Village)
	}

	// Map phone numbers if loaded
	if len(m.PhoneNumbers) > 0 {
		resp.PhoneNumbers = toPhoneNumberResponseList(m.PhoneNumbers)
	}

	// Map bank accounts if loaded
	if len(m.BankAccounts) > 0 {
		resp.BankAccounts = toSupplierBankResponseList(m.BankAccounts)
	}

	return resp
}

// ToSupplierResponseList converts a slice of Supplier models to response DTOs
func ToSupplierResponseList(models []models.Supplier) []dto.SupplierResponse {
	responses := make([]dto.SupplierResponse, len(models))
	for i := range models {
		responses[i] = ToSupplierResponse(&models[i])
	}
	return responses
}

// Helper functions for nested mappings
func toPhoneNumberResponse(m *models.SupplierPhoneNumber) dto.PhoneNumberResponse {
	return dto.PhoneNumberResponse{
		ID:          m.ID,
		SupplierID:  m.SupplierID,
		PhoneNumber: m.PhoneNumber,
		Label:       m.Label,
		IsPrimary:   m.IsPrimary,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}
}

func toPhoneNumberResponseList(models []models.SupplierPhoneNumber) []dto.PhoneNumberResponse {
	responses := make([]dto.PhoneNumberResponse, len(models))
	for i := range models {
		responses[i] = toPhoneNumberResponse(&models[i])
	}
	return responses
}

func toSupplierBankResponse(m *models.SupplierBank) dto.SupplierBankResponse {
	resp := dto.SupplierBankResponse{
		ID:            m.ID,
		SupplierID:    m.SupplierID,
		BankID:        m.BankID,
		AccountNumber: m.AccountNumber,
		AccountName:   m.AccountName,
		Branch:        m.Branch,
		IsPrimary:     m.IsPrimary,
		CreatedAt:     m.CreatedAt,
		UpdatedAt:     m.UpdatedAt,
	}

	if m.Bank != nil {
		bank := ToBankResponse(m.Bank)
		resp.Bank = &bank
	}

	return resp
}

func toSupplierBankResponseList(models []models.SupplierBank) []dto.SupplierBankResponse {
	responses := make([]dto.SupplierBankResponse, len(models))
	for i := range models {
		responses[i] = toSupplierBankResponse(&models[i])
	}
	return responses
}

func toVillageResponse(v *geographic.Village) *dto.VillageResponse {
	if v == nil {
		return nil
	}

	village := &dto.VillageResponse{
		ID:   v.ID,
		Name: v.Name,
	}

	if v.District != nil {
		village.District = &dto.DistrictResponse{
			ID:   v.District.ID,
			Name: v.District.Name,
		}
		if v.District.City != nil {
			village.District.City = &dto.CityResponse{
				ID:   v.District.City.ID,
				Name: v.District.City.Name,
			}
			if v.District.City.Province != nil {
				village.District.City.Province = &dto.ProvinceResponse{
					ID:   v.District.City.Province.ID,
					Name: v.District.City.Province.Name,
				}
			}
		}
	}

	return village
}
