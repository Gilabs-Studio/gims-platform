package mapper

import (
	"time"

	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
)

type EmployeeContractMapper struct{}

func NewEmployeeContractMapper() *EmployeeContractMapper {
	return &EmployeeContractMapper{}
}

func (m *EmployeeContractMapper) ToResponse(contract *models.EmployeeContract) *dto.EmployeeContractResponse {
	if contract == nil {
		return nil
	}

	response := &dto.EmployeeContractResponse{
		ID:             contract.ID,
		EmployeeID:     contract.EmployeeID,
		ContractNumber: contract.ContractNumber,
		ContractType:   contract.ContractType,
		StartDate:      contract.StartDate.Format("2006-01-02"),
		Salary:         contract.Salary,
		JobTitle:       contract.JobTitle,
		Department:     contract.Department,
		Terms:          contract.Terms,
		DocumentPath:   contract.DocumentPath,
		Status:         contract.Status,
		CreatedAt:      contract.CreatedAt,
		UpdatedAt:      contract.UpdatedAt,
	}

	if contract.EndDate != nil {
		endDateStr := contract.EndDate.Format("2006-01-02")
		response.EndDate = &endDateStr

		// Calculate days until expiry
		if contract.Status == models.ContractStatusActive && contract.EndDate.After(time.Now()) {
			days := int(time.Until(*contract.EndDate).Hours() / 24)
			response.DaysUntilExpiry = &days
			response.IsExpiringSoon = contract.IsExpiringSoon(30) // 30 days threshold
		}
	}

	// Employee field is nil - fetch separately if needed by frontend
	response.Employee = nil

	return response
}

func (m *EmployeeContractMapper) ToResponseList(contracts []*models.EmployeeContract) []*dto.EmployeeContractResponse {
	responses := make([]*dto.EmployeeContractResponse, len(contracts))
	for i, contract := range contracts {
		responses[i] = m.ToResponse(contract)
	}
	return responses
}

// ToListResponse converts contract model to list response (minimal fields + employee name)
func (m *EmployeeContractMapper) ToListResponse(contract *models.EmployeeContract, employeeName, employeeCode string) *dto.EmployeeContractListResponse {
	if contract == nil {
		return nil
	}

	response := &dto.EmployeeContractListResponse{
		ID:             contract.ID,
		EmployeeID:     contract.EmployeeID,
		EmployeeName:   employeeName,
		EmployeeCode:   employeeCode,
		ContractNumber: contract.ContractNumber,
		ContractType:   contract.ContractType,
		StartDate:      contract.StartDate.Format("2006-01-02"),
		Salary:         contract.Salary,
		JobTitle:       contract.JobTitle,
		Status:         contract.Status,
		CreatedAt:      contract.CreatedAt,
		UpdatedAt:      contract.UpdatedAt,
	}

	if contract.EndDate != nil {
		endDateStr := contract.EndDate.Format("2006-01-02")
		response.EndDate = &endDateStr

		// Calculate days until expiry
		if contract.Status == models.ContractStatusActive && contract.EndDate.After(time.Now()) {
			days := int(time.Until(*contract.EndDate).Hours() / 24)
			response.DaysUntilExpiry = &days
			response.IsExpiringSoon = contract.IsExpiringSoon(30)
		}
	}

	return response
}
