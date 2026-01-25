package mapper

import (
	"time"

	salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
)

var monthNames = map[int]string{
	1: "January", 2: "February", 3: "March", 4: "April",
	5: "May", 6: "June", 7: "July", 8: "August",
	9: "September", 10: "October", 11: "November", 12: "December",
}

// ToYearlyTargetResponse converts a YearlyTarget model to response DTO
func ToYearlyTargetResponse(m *salesModels.YearlyTarget) dto.YearlyTargetResponse {
	totalActual, achievementPercent := m.CalculateAchievements()
	
	response := dto.YearlyTargetResponse{
		ID:                 m.ID,
		Code:               m.Code,
		Year:               m.Year,
		TotalTarget:        m.TotalTarget,
		TotalActual:        totalActual,
		AchievementPercent: achievementPercent,
		Notes:              m.Notes,
		Status:             string(m.Status),
		RejectionReason:    m.RejectionReason,
		CreatedAt:          m.CreatedAt.Format(time.RFC3339),
		UpdatedAt:          m.UpdatedAt.Format(time.RFC3339),
	}

	if m.AreaID != nil {
		response.AreaID = m.AreaID
		if m.Area != nil {
			response.Area = &dto.AreaResponse{
				ID:          m.Area.ID,
				Name:        m.Area.Name,
				Description: m.Area.Description,
			}
		}
	}

	if m.SubmittedBy != nil {
		response.SubmittedBy = m.SubmittedBy
		if m.SubmittedAt != nil {
			submittedAt := m.SubmittedAt.Format(time.RFC3339)
			response.SubmittedAt = &submittedAt
		}
	}

	if m.ApprovedBy != nil {
		response.ApprovedBy = m.ApprovedBy
		if m.ApprovedAt != nil {
			approvedAt := m.ApprovedAt.Format(time.RFC3339)
			response.ApprovedAt = &approvedAt
		}
	}

	if m.RejectedBy != nil {
		response.RejectedBy = m.RejectedBy
		if m.RejectedAt != nil {
			rejectedAt := m.RejectedAt.Format(time.RFC3339)
			response.RejectedAt = &rejectedAt
		}
	}

	// Map monthly targets
	if len(m.MonthlyTargets) > 0 {
		response.MonthlyTargets = make([]dto.MonthlyTargetResponse, len(m.MonthlyTargets))
		for i, mt := range m.MonthlyTargets {
			response.MonthlyTargets[i] = ToMonthlyTargetResponse(&mt)
		}
	}

	return response
}

// ToMonthlyTargetResponse converts a MonthlyTarget model to response DTO
func ToMonthlyTargetResponse(m *salesModels.MonthlyTarget) dto.MonthlyTargetResponse {
	return dto.MonthlyTargetResponse{
		ID:                 m.ID,
		Month:              m.Month,
		MonthName:          monthNames[m.Month],
		TargetAmount:       m.TargetAmount,
		ActualAmount:       m.ActualAmount,
		AchievementPercent: m.AchievementPercent,
		Notes:              m.Notes,
	}
}

// ToYearlyTargetModel converts a CreateYearlyTargetRequest to YearlyTarget model
func ToYearlyTargetModel(req *dto.CreateYearlyTargetRequest, code string) *salesModels.YearlyTarget {
	target := &salesModels.YearlyTarget{
		Code:        code,
		Year:        req.Year,
		TotalTarget: req.TotalTarget,
		Notes:       req.Notes,
		Status:      salesModels.YearlyTargetStatusDraft,
		AreaID:      req.AreaID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Map monthly targets
	if len(req.Months) > 0 {
		target.MonthlyTargets = make([]salesModels.MonthlyTarget, len(req.Months))
		for i, monthReq := range req.Months {
			target.MonthlyTargets[i] = salesModels.MonthlyTarget{
				Month:        monthReq.Month,
				TargetAmount: monthReq.TargetAmount,
				Notes:        monthReq.Notes,
				ActualAmount: 0,
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			}
		}
	}

	return target
}

// UpdateYearlyTargetModel updates a YearlyTarget model from UpdateYearlyTargetRequest
func UpdateYearlyTargetModel(m *salesModels.YearlyTarget, req *dto.UpdateYearlyTargetRequest) {
	if req.AreaID != nil {
		m.AreaID = req.AreaID
	}

	if req.TotalTarget != nil {
		m.TotalTarget = *req.TotalTarget
	}

	if req.Notes != nil {
		m.Notes = *req.Notes
	}

	// Update monthly targets if provided
	if req.Months != nil && len(*req.Months) > 0 {
		m.MonthlyTargets = make([]salesModels.MonthlyTarget, len(*req.Months))
		for i, monthReq := range *req.Months {
			m.MonthlyTargets[i] = salesModels.MonthlyTarget{
				Month:        monthReq.Month,
				TargetAmount: monthReq.TargetAmount,
				Notes:        monthReq.Notes,
				UpdatedAt:    time.Now(),
			}
		}
	}

	m.UpdatedAt = time.Now()
}
