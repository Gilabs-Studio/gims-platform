package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ContractType string
type ContractStatus string

const (
	ContractTypePermanent  ContractType = "PERMANENT"
	ContractTypeContract   ContractType = "CONTRACT"
	ContractTypeInternship ContractType = "INTERNSHIP"
	ContractTypeProbation  ContractType = "PROBATION"

	ContractStatusActive     ContractStatus = "ACTIVE"
	ContractStatusExpired    ContractStatus = "EXPIRED"
	ContractStatusTerminated ContractStatus = "TERMINATED"
)

type EmployeeContract struct {
	ID             uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	EmployeeID     uuid.UUID      `gorm:"type:uuid;not null;index:idx_employee_contracts_employee" json:"employee_id"`
	ContractNumber string         `gorm:"type:varchar(50);uniqueIndex:idx_employee_contracts_number;not null" json:"contract_number"`
	ContractType   ContractType   `gorm:"type:varchar(20);not null;index:idx_employee_contracts_type" json:"contract_type"`
	StartDate      time.Time      `gorm:"type:date;not null;index:idx_employee_contracts_dates" json:"start_date"`
	EndDate        *time.Time     `gorm:"type:date;index:idx_employee_contracts_dates" json:"end_date"`
	Salary         float64        `gorm:"type:decimal(15,2);not null" json:"salary"`
	JobTitle       string         `gorm:"type:varchar(100);not null" json:"job_title"`
	Department     string         `gorm:"type:varchar(100)" json:"department"`
	Terms          string         `gorm:"type:text" json:"terms"`
	DocumentPath   string         `gorm:"type:varchar(255)" json:"document_path"`
	Status         ContractStatus `gorm:"type:varchar(20);not null;default:'ACTIVE';index:idx_employee_contracts_status" json:"status"`
	CreatedBy      uuid.UUID      `gorm:"type:uuid" json:"created_by"`
	UpdatedBy      *uuid.UUID     `gorm:"type:uuid" json:"updated_by"`
	CreatedAt      time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt      time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

func (EmployeeContract) TableName() string {
	return "employee_contracts"
}

// BeforeCreate hook to validate contract type
func (ec *EmployeeContract) BeforeCreate(tx *gorm.DB) error {
	if ec.ID == uuid.Nil {
		ec.ID = uuid.New()
	}
	return nil
}

// IsExpiringSoon checks if contract is expiring within the given days
func (ec *EmployeeContract) IsExpiringSoon(days int) bool {
	if ec.EndDate == nil {
		return false // Permanent contracts don't expire
	}
	threshold := time.Now().AddDate(0, 0, days)
	return ec.EndDate.Before(threshold) && ec.EndDate.After(time.Now())
}

// IsActive checks if contract is currently active
func (ec *EmployeeContract) IsActive() bool {
	now := time.Now()
	if ec.Status != ContractStatusActive {
		return false
	}
	if now.Before(ec.StartDate) {
		return false // Not started yet
	}
	if ec.EndDate != nil && now.After(*ec.EndDate) {
		return false // Already ended
	}
	return true
}
