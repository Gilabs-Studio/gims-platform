package mapper

import (
	"time"

	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
	"github.com/google/uuid"
)

type EmployeeEducationHistoryMapper struct{}

func NewEmployeeEducationHistoryMapper() *EmployeeEducationHistoryMapper {
	return &EmployeeEducationHistoryMapper{}
}

func (m *EmployeeEducationHistoryMapper) ToResponse(education *models.EmployeeEducationHistory) *dto.EmployeeEducationHistoryResponse {
	if education == nil {
		return nil
	}

	response := &dto.EmployeeEducationHistoryResponse{
		ID:            education.ID,
		EmployeeID:    education.EmployeeID,
		Institution:   education.Institution,
		Degree:        education.Degree,
		FieldOfStudy:  education.FieldOfStudy,
		StartDate:     education.StartDate.Format("2006-01-02"),
		GPA:           education.GPA,
		Description:   education.Description,
		DocumentPath:  education.DocumentPath,
		IsCompleted:   education.IsCompleted(),
		DurationYears: education.GetDurationYears(),
		CreatedAt:     education.CreatedAt,
		UpdatedAt:     education.UpdatedAt,
	}

	if education.EndDate != nil {
		endDateStr := education.EndDate.Format("2006-01-02")
		response.EndDate = &endDateStr
	}

	return response
}

func (m *EmployeeEducationHistoryMapper) ToResponseList(educations []*models.EmployeeEducationHistory) []*dto.EmployeeEducationHistoryResponse {
	responses := make([]*dto.EmployeeEducationHistoryResponse, len(educations))
	for i, education := range educations {
		responses[i] = m.ToResponse(education)
	}
	return responses
}

func (m *EmployeeEducationHistoryMapper) FromCreateRequest(req *dto.CreateEmployeeEducationHistoryRequest, userID string) (*models.EmployeeEducationHistory, error) {
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, err
	}

	// Parse userID to UUID
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}

	education := &models.EmployeeEducationHistory{
		EmployeeID:   req.EmployeeID,
		Institution:  req.Institution,
		Degree:       req.Degree,
		FieldOfStudy: req.FieldOfStudy,
		StartDate:    startDate,
		GPA:          req.GPA,
		Description:  req.Description,
		DocumentPath: req.DocumentPath,
		CreatedBy:    userUUID,
		UpdatedBy:    &userUUID,
	}

	if req.EndDate != nil && *req.EndDate != "" {
		endDate, err := time.Parse("2006-01-02", *req.EndDate)
		if err != nil {
			return nil, err
		}
		education.EndDate = &endDate
	}

	return education, nil
}

func (m *EmployeeEducationHistoryMapper) FromUpdateRequest(req *dto.UpdateEmployeeEducationHistoryRequest, existing *models.EmployeeEducationHistory, userID string) error {
	if req.Institution != "" {
		existing.Institution = req.Institution
	}
	if req.Degree != "" {
		existing.Degree = req.Degree
	}
	if req.FieldOfStudy != "" {
		existing.FieldOfStudy = req.FieldOfStudy
	}
	if req.StartDate != "" {
		startDate, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			return err
		}
		existing.StartDate = startDate
	}
	if req.EndDate != nil {
		if *req.EndDate == "" {
			existing.EndDate = nil
		} else {
			endDate, err := time.Parse("2006-01-02", *req.EndDate)
			if err != nil {
				return err
			}
			existing.EndDate = &endDate
		}
	}
	if req.GPA != nil {
		existing.GPA = req.GPA
	}
	if req.Description != "" {
		existing.Description = req.Description
	}
	if req.DocumentPath != "" {
		existing.DocumentPath = req.DocumentPath
	}

	// Parse userID to UUID
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return err
	}
	existing.UpdatedBy = &userUUID

	return nil
}
