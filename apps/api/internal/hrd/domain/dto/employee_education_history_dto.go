package dto

import (
	"time"

	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"github.com/google/uuid"
)

type CreateEmployeeEducationHistoryRequest struct {
	EmployeeID   uuid.UUID          `json:"employee_id" binding:"required"`
	Institution  string             `json:"institution" binding:"required,max=200"`
	Degree       models.DegreeLevel `json:"degree" binding:"required,oneof=ELEMENTARY JUNIOR_HIGH SENIOR_HIGH DIPLOMA BACHELOR MASTER DOCTORATE"`
	FieldOfStudy string             `json:"field_of_study" binding:"max=200"`
	StartDate    string             `json:"start_date" binding:"required"`
	EndDate      *string            `json:"end_date"`
	GPA          *float32           `json:"gpa" binding:"omitempty,min=0,max=4"`
	Description  string             `json:"description"`
	DocumentPath string             `json:"document_path" binding:"max=255"`
}

type UpdateEmployeeEducationHistoryRequest struct {
	Institution  string             `json:"institution" binding:"omitempty,max=200"`
	Degree       models.DegreeLevel `json:"degree" binding:"omitempty,oneof=ELEMENTARY JUNIOR_HIGH SENIOR_HIGH DIPLOMA BACHELOR MASTER DOCTORATE"`
	FieldOfStudy string             `json:"field_of_study" binding:"omitempty,max=200"`
	StartDate    string             `json:"start_date" binding:"omitempty"`
	EndDate      *string            `json:"end_date"`
	GPA          *float32           `json:"gpa" binding:"omitempty,min=0,max=4"`
	Description  string             `json:"description"`
	DocumentPath string             `json:"document_path" binding:"omitempty,max=255"`
}

type EmployeeEducationHistoryResponse struct {
	ID            uuid.UUID          `json:"id"`
	EmployeeID    uuid.UUID          `json:"employee_id"`
	Institution   string             `json:"institution"`
	Degree        models.DegreeLevel `json:"degree"`
	FieldOfStudy  string             `json:"field_of_study"`
	StartDate     string             `json:"start_date"`
	EndDate       *string            `json:"end_date"`
	GPA           *float32           `json:"gpa"`
	Description   string             `json:"description"`
	DocumentPath  string             `json:"document_path"`
	IsCompleted   bool               `json:"is_completed"`
	DurationYears float64            `json:"duration_years"`
	CreatedAt     time.Time          `json:"created_at"`
	UpdatedAt     time.Time          `json:"updated_at"`
}

type ListEmployeeEducationHistoriesRequest struct {
	Page       int                 `form:"page" binding:"omitempty,min=1"`
	PerPage    int                 `form:"per_page" binding:"omitempty,min=1,max=100"`
	Search     string              `form:"search"`
	EmployeeID *uuid.UUID          `form:"employee_id"`
	Degree     *models.DegreeLevel `form:"degree" binding:"omitempty,oneof=ELEMENTARY JUNIOR_HIGH SENIOR_HIGH DIPLOMA BACHELOR MASTER DOCTORATE"`
}

// EmployeeEducationHistoryFormDataResponse for form options
type EmployeeEducationHistoryFormDataResponse struct {
	Employees    []EmployeeFormOption `json:"employees"`
	DegreeLevels []DegreeLevelOption  `json:"degree_levels"`
}

// Note: EmployeeFormOption is defined in employee_contract_dto.go and reused here

type DegreeLevelOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}
