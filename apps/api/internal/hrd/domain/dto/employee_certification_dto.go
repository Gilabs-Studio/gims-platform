package dto

import "time"

// CreateEmployeeCertificationRequest represents the request body for creating a certification
type CreateEmployeeCertificationRequest struct {
	EmployeeID        string  `json:"employee_id" binding:"required,uuid"`
	CertificateName   string  `json:"certificate_name" binding:"required,max=200"`
	IssuedBy          string  `json:"issued_by" binding:"required,max=200"`
	IssueDate         string  `json:"issue_date" binding:"required"`
	ExpiryDate        *string `json:"expiry_date" binding:"omitempty"`
	CertificateFile   string  `json:"certificate_file" binding:"omitempty,max=255"`
	CertificateNumber string  `json:"certificate_number" binding:"omitempty,max=100"`
	Description       string  `json:"description" binding:"omitempty"`
}

// UpdateEmployeeCertificationRequest represents the request body for updating a certification
type UpdateEmployeeCertificationRequest struct {
	CertificateName   string  `json:"certificate_name" binding:"omitempty,max=200"`
	IssuedBy          string  `json:"issued_by" binding:"omitempty,max=200"`
	IssueDate         string  `json:"issue_date" binding:"omitempty"`
	ExpiryDate        *string `json:"expiry_date" binding:"omitempty"`
	CertificateFile   string  `json:"certificate_file" binding:"omitempty,max=255"`
	CertificateNumber string  `json:"certificate_number" binding:"omitempty,max=100"`
	Description       string  `json:"description" binding:"omitempty"`
}

// EmployeeCertificationResponse represents the response body for certification data
type EmployeeCertificationResponse struct {
	ID                string     `json:"id"`
	EmployeeID        string     `json:"employee_id"`
	EmployeeName      string     `json:"employee_name,omitempty"`
	EmployeeCode      string     `json:"employee_code,omitempty"`
	CertificateName   string     `json:"certificate_name"`
	IssuedBy          string     `json:"issued_by"`
	IssueDate         string     `json:"issue_date"`
	ExpiryDate        *string    `json:"expiry_date"`
	CertificateFile   string     `json:"certificate_file"`
	CertificateNumber string     `json:"certificate_number"`
	Description       string     `json:"description"`
	IsExpired         bool       `json:"is_expired"`
	DaysUntilExpiry   int        `json:"days_until_expiry"`
	CreatedAt         *time.Time `json:"created_at,omitempty"`
	UpdatedAt         *time.Time `json:"updated_at,omitempty"`
}

// EmployeeCertificationFormDataResponse represents form dropdown data
type EmployeeCertificationFormDataResponse struct {
	Employees []EmployeeFormOption `json:"employees"`
}
