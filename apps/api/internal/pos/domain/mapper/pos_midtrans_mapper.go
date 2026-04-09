package mapper

import (
	"github.com/gilabs/gims/api/internal/pos/data/models"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
)

// ToMidtransConfigResponse maps a MidtransConfig to its DTO response (server key excluded)
func ToMidtransConfigResponse(c *models.MidtransConfig) *dto.MidtransConfigResponse {
	return &dto.MidtransConfigResponse{
		ID:          c.ID,
		CompanyID:   c.CompanyID,
		ClientKey:   c.ClientKey,
		MerchantID:  c.MerchantID,
		Environment: string(c.Environment),
		IsActive:    c.IsActive,
		UpdatedAt:   c.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
