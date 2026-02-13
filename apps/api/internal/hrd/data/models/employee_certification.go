package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// EmployeeCertification represents employee professional certifications
type EmployeeCertification struct {
	ID                string         `gorm:"type:uuid;primary_key" json:"id"`
	EmployeeID        string         `gorm:"type:uuid;not null;index:idx_employee_certification_employee" json:"employee_id"`
	CertificateName   string         `gorm:"type:varchar(200);not null" json:"certificate_name"`
	IssuedBy          string         `gorm:"type:varchar(200);not null" json:"issued_by"`
	IssueDate         time.Time      `gorm:"type:date;not null" json:"issue_date"`
	ExpiryDate        *time.Time     `gorm:"type:date" json:"expiry_date"`
	CertificateFile   string         `gorm:"type:varchar(255)" json:"certificate_file"`
	CertificateNumber string         `gorm:"type:varchar(100)" json:"certificate_number"`
	Description       string         `gorm:"type:text" json:"description"`
	CreatedBy         string         `gorm:"type:varchar(255)" json:"created_by"`
	UpdatedBy         string         `gorm:"type:varchar(255)" json:"updated_by"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// BeforeCreate hook to generate UUID before creating record
func (e *EmployeeCertification) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}

// TableName specifies the table name for EmployeeCertification
func (EmployeeCertification) TableName() string {
	return "employee_certifications"
}

// IsExpired checks if the certification has expired
func (e *EmployeeCertification) IsExpired() bool {
	if e.ExpiryDate == nil {
		return false // No expiry means it's valid forever
	}
	return e.ExpiryDate.Before(time.Now())
}

// DaysUntilExpiry calculates days remaining until expiry
// Returns negative if expired, 0 if expires today, positive if still valid
func (e *EmployeeCertification) DaysUntilExpiry() int {
	if e.ExpiryDate == nil {
		return 999999 // No expiry
	}
	duration := time.Until(*e.ExpiryDate)
	return int(duration.Hours() / 24)
}
