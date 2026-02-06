package dto

import (
	"time"

	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"github.com/google/uuid"
)

type CreateEmployeeContractRequest struct {
	EmployeeID     uuid.UUID             `json:"employee_id" binding:"required"`
	ContractNumber string                `json:"contract_number" binding:"required,max=50"`
	ContractType   models.ContractType   `json:"contract_type" binding:"required,oneof=PERMANENT CONTRACT INTERNSHIP PROBATION"`
	StartDate      string                `json:"start_date" binding:"required"`
	EndDate        *string               `json:"end_date"`
	Salary         float64               `json:"salary" binding:"required,gt=0"`
	JobTitle       string                `json:"job_title" binding:"required,max=100"`
	Department     string                `json:"department" binding:"max=100"`
	Terms          string                `json:"terms"`
	DocumentPath   string                `json:"document_path" binding:"max=255"`
	Status         models.ContractStatus `json:"status" binding:"omitempty,oneof=ACTIVE EXPIRED TERMINATED"`
}

type UpdateEmployeeContractRequest struct {
	ContractNumber string                `json:"contract_number" binding:"omitempty,max=50"`
	ContractType   models.ContractType   `json:"contract_type" binding:"omitempty,oneof=PERMANENT CONTRACT INTERNSHIP PROBATION"`
	StartDate      string                `json:"start_date" binding:"omitempty"`
	EndDate        *string               `json:"end_date"`
	Salary         float64               `json:"salary" binding:"omitempty,gt=0"`
	JobTitle       string                `json:"job_title" binding:"omitempty,max=100"`
	Department     string                `json:"department" binding:"omitempty,max=100"`
	Terms          string                `json:"terms"`
	DocumentPath   string                `json:"document_path" binding:"omitempty,max=255"`
	Status         models.ContractStatus `json:"status" binding:"omitempty,oneof=ACTIVE EXPIRED TERMINATED"`
}

type EmployeeContractResponse struct {
	ID              uuid.UUID               `json:"id"`
	EmployeeID      uuid.UUID               `json:"employee_id"`
	Employee        *EmployeeSimpleResponse `json:"employee,omitempty"`
	ContractNumber  string                  `json:"contract_number"`
	ContractType    models.ContractType     `json:"contract_type"`
	StartDate       string                  `json:"start_date"`
	EndDate         *string                 `json:"end_date"`
	Salary          float64                 `json:"salary"`
	JobTitle        string                  `json:"job_title"`
	Department      string                  `json:"department"`
	Terms           string                  `json:"terms"`
	DocumentPath    string                  `json:"document_path"`
	Status          models.ContractStatus   `json:"status"`
	IsExpiringSoon  bool                    `json:"is_expiring_soon"`
	DaysUntilExpiry *int                    `json:"days_until_expiry"`
	CreatedAt       time.Time               `json:"created_at"`
	UpdatedAt       time.Time               `json:"updated_at"`
}

type EmployeeSimpleResponse struct {
	ID           uuid.UUID `json:"id"`
	EmployeeCode string    `json:"employee_code"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	Position     string    `json:"position"`
	Department   string    `json:"department"`
}

type ListEmployeeContractsRequest struct {
	Page         int                    `form:"page" binding:"omitempty,min=1"`
	PerPage      int                    `form:"per_page" binding:"omitempty,min=1,max=100"`
	EmployeeID   *uuid.UUID             `form:"employee_id"`
	Status       *models.ContractStatus `form:"status" binding:"omitempty,oneof=ACTIVE EXPIRED TERMINATED"`
	ContractType *models.ContractType   `form:"contract_type" binding:"omitempty,oneof=PERMANENT CONTRACT INTERNSHIP PROBATION"`
}

type ExpiringContractsRequest struct {
	Page    int `form:"page" binding:"omitempty,min=1"`
	PerPage int `form:"per_page" binding:"omitempty,min=1,max=100"`
	Days    int `form:"days" binding:"omitempty,min=1,max=180"` // Default 30 days
}
