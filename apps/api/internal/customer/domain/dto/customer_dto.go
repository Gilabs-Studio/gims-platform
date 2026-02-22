package dto

import (
	"time"

	supplierDTO "github.com/gilabs/gims/api/internal/supplier/domain/dto"
)

// === Customer DTOs ===

// CreateCustomerRequest for creating a new customer
type CreateCustomerRequest struct {
	Code           string                      `json:"code" binding:"required,min=2,max=50"`
	Name           string                      `json:"name" binding:"required,min=2,max=200"`
	CustomerTypeID string                      `json:"customer_type_id" binding:"omitempty,uuid"`
	Address        string                      `json:"address" binding:"max=500"`
	VillageID      string                      `json:"village_id" binding:"omitempty,uuid"`
	Email          string                      `json:"email" binding:"omitempty,email,max=100"`
	Website        string                      `json:"website" binding:"max=200"`
	NPWP           string                      `json:"npwp" binding:"max=30"`
	ContactPerson  string                      `json:"contact_person" binding:"max=100"`
	Notes          string                      `json:"notes" binding:"max=1000"`
	Latitude       *float64                    `json:"latitude" binding:"omitempty,min=-90,max=90"`
	Longitude      *float64                    `json:"longitude" binding:"omitempty,min=-180,max=180"`
	IsActive       *bool                       `json:"is_active"`
	PhoneNumbers   []CreatePhoneNumberRequest  `json:"phone_numbers"`
	BankAccounts   []CreateCustomerBankRequest `json:"bank_accounts"`
}

// UpdateCustomerRequest for updating an existing customer
type UpdateCustomerRequest struct {
	Code           string   `json:"code" binding:"omitempty,min=2,max=50"`
	Name           string   `json:"name" binding:"omitempty,min=2,max=200"`
	CustomerTypeID string   `json:"customer_type_id" binding:"omitempty,uuid"`
	Address        string   `json:"address" binding:"max=500"`
	VillageID      string   `json:"village_id" binding:"omitempty,uuid"`
	Email          string   `json:"email" binding:"omitempty,email,max=100"`
	Website        string   `json:"website" binding:"max=200"`
	NPWP           string   `json:"npwp" binding:"max=30"`
	ContactPerson  string   `json:"contact_person" binding:"max=100"`
	Notes          string   `json:"notes" binding:"max=1000"`
	Latitude       *float64 `json:"latitude" binding:"omitempty,min=-90,max=90"`
	Longitude      *float64 `json:"longitude" binding:"omitempty,min=-180,max=180"`
	IsActive       *bool    `json:"is_active"`
}

// ApproveCustomerRequest for approve/reject action
type ApproveCustomerRequest struct {
	Action string `json:"action" binding:"required,oneof=approve reject"`
	Reason string `json:"reason" binding:"max=500"`
}

// CustomerResponse is the response DTO for a customer
type CustomerResponse struct {
	ID             string                     `json:"id"`
	Code           string                     `json:"code"`
	Name           string                     `json:"name"`
	CustomerTypeID *string                    `json:"customer_type_id"`
	CustomerType   *CustomerTypeResponse      `json:"customer_type,omitempty"`
	Address        string                     `json:"address"`
	VillageID      *string                    `json:"village_id"`
	Village        *VillageResponse           `json:"village,omitempty"`
	Email          string                     `json:"email"`
	Website        string                     `json:"website"`
	NPWP           string                     `json:"npwp"`
	ContactPerson  string                     `json:"contact_person"`
	Notes          string                     `json:"notes"`
	Latitude       *float64                   `json:"latitude"`
	Longitude      *float64                   `json:"longitude"`
	Status         string                     `json:"status"`
	IsApproved     bool                       `json:"is_approved"`
	CreatedBy      *string                    `json:"created_by"`
	ApprovedBy     *string                    `json:"approved_by"`
	ApprovedAt     *time.Time                 `json:"approved_at"`
	IsActive       bool                       `json:"is_active"`
	CreatedAt      time.Time                  `json:"created_at"`
	UpdatedAt      time.Time                  `json:"updated_at"`
	PhoneNumbers   []PhoneNumberResponse      `json:"phone_numbers,omitempty"`
	BankAccounts   []CustomerBankResponse     `json:"bank_accounts,omitempty"`
}

// CustomerFormDataResponse for form dropdown options
type CustomerFormDataResponse struct {
	CustomerTypes []CustomerTypeResponse `json:"customer_types"`
}

// === Phone Number DTOs ===

// CreatePhoneNumberRequest for adding a phone number to a customer
type CreatePhoneNumberRequest struct {
	PhoneNumber string `json:"phone_number" binding:"required,max=30"`
	Label       string `json:"label" binding:"max=50"`
	IsPrimary   bool   `json:"is_primary"`
}

// UpdatePhoneNumberRequest for updating a phone number
type UpdatePhoneNumberRequest struct {
	PhoneNumber string `json:"phone_number" binding:"omitempty,max=30"`
	Label       string `json:"label" binding:"max=50"`
	IsPrimary   *bool  `json:"is_primary"`
}

// PhoneNumberResponse is the response DTO for a customer phone number
type PhoneNumberResponse struct {
	ID          string    `json:"id"`
	CustomerID  string    `json:"customer_id"`
	PhoneNumber string    `json:"phone_number"`
	Label       string    `json:"label"`
	IsPrimary   bool      `json:"is_primary"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// === Customer Bank DTOs ===

// CreateCustomerBankRequest for adding a bank account to a customer
type CreateCustomerBankRequest struct {
	BankID        string `json:"bank_id" binding:"required,uuid"`
	AccountNumber string `json:"account_number" binding:"required,max=50"`
	AccountName   string `json:"account_name" binding:"required,max=100"`
	Branch        string `json:"branch" binding:"max=100"`
	IsPrimary     bool   `json:"is_primary"`
}

// UpdateCustomerBankRequest for updating a bank account
type UpdateCustomerBankRequest struct {
	BankID        string `json:"bank_id" binding:"omitempty,uuid"`
	AccountNumber string `json:"account_number" binding:"omitempty,max=50"`
	AccountName   string `json:"account_name" binding:"omitempty,max=100"`
	Branch        string `json:"branch" binding:"max=100"`
	IsPrimary     *bool  `json:"is_primary"`
}

// CustomerBankResponse is the response DTO for a customer bank account
type CustomerBankResponse struct {
	ID            string                    `json:"id"`
	CustomerID    string                    `json:"customer_id"`
	BankID        string                    `json:"bank_id"`
	Bank          *supplierDTO.BankResponse `json:"bank,omitempty"`
	AccountNumber string                    `json:"account_number"`
	AccountName   string                    `json:"account_name"`
	Branch        string                    `json:"branch"`
	IsPrimary     bool                      `json:"is_primary"`
	CreatedAt     time.Time                 `json:"created_at"`
	UpdatedAt     time.Time                 `json:"updated_at"`
}

// === Village Response (reuse geographic chain for nested display) ===

// VillageResponse for nested geographic display
type VillageResponse struct {
	ID       string            `json:"id"`
	Name     string            `json:"name"`
	District *DistrictResponse `json:"district,omitempty"`
}

// DistrictResponse for nested geographic display
type DistrictResponse struct {
	ID   string        `json:"id"`
	Name string        `json:"name"`
	City *CityResponse `json:"city,omitempty"`
}

// CityResponse for nested geographic display
type CityResponse struct {
	ID       string            `json:"id"`
	Name     string            `json:"name"`
	Province *ProvinceResponse `json:"province,omitempty"`
}

// ProvinceResponse for nested geographic display
type ProvinceResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
