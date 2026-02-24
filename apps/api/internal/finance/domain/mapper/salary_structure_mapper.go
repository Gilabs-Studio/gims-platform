package mapper

import (
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
)

type SalaryStructureMapper struct{}

func NewSalaryStructureMapper() *SalaryStructureMapper {
	return &SalaryStructureMapper{}
}

func (m *SalaryStructureMapper) ToResponse(item *financeModels.SalaryStructure) dto.SalaryStructureResponse {
	if item == nil {
		return dto.SalaryStructureResponse{}
	}
	return dto.SalaryStructureResponse{
		ID:            item.ID,
		EmployeeID:    item.EmployeeID,
		EffectiveDate: item.EffectiveDate,
		BasicSalary:   item.BasicSalary,
		Notes:         item.Notes,
		Status:        string(item.Status),
		CreatedAt:     item.CreatedAt,
		UpdatedAt:     item.UpdatedAt,
	}
}
