package dto

import "github.com/google/uuid"

// CreateLeadRequest defines the request body for creating a lead
type CreateLeadRequest struct {
	FirstName      string  `json:"first_name" binding:"required,min=2,max=100"`
	LastName       string  `json:"last_name" binding:"max=100"`
	CompanyName    string  `json:"company_name" binding:"max=200"`
	Email          string  `json:"email" binding:"omitempty,email,max=100"`
	Phone          string  `json:"phone" binding:"max=30"`
	JobTitle       string  `json:"job_title" binding:"max=100"`
	Address        string  `json:"address"`
	City           string  `json:"city" binding:"max=100"`
	Province       string  `json:"province" binding:"max=100"`
	LeadSourceID   *string `json:"lead_source_id" binding:"omitempty,uuid"`
	LeadStatusID   *string `json:"lead_status_id" binding:"omitempty,uuid"`
	EstimatedValue float64 `json:"estimated_value"`
	Probability    int     `json:"probability" binding:"min=0,max=100"`
	// BANT
	BudgetConfirmed bool    `json:"budget_confirmed"`
	BudgetAmount    float64 `json:"budget_amount"`
	AuthConfirmed   bool    `json:"auth_confirmed"`
	AuthPerson      string  `json:"auth_person" binding:"max=200"`
	NeedConfirmed   bool    `json:"need_confirmed"`
	NeedDescription string  `json:"need_description"`
	TimeConfirmed   bool    `json:"time_confirmed"`
	TimeExpected    *string `json:"time_expected"`
	// Assignment
	AssignedTo *string `json:"assigned_to" binding:"omitempty,uuid"`
	Notes      string  `json:"notes"`
}

// UpdateLeadRequest defines the request body for updating a lead
type UpdateLeadRequest struct {
	FirstName      *string  `json:"first_name" binding:"omitempty,min=2,max=100"`
	LastName       *string  `json:"last_name" binding:"omitempty,max=100"`
	CompanyName    *string  `json:"company_name" binding:"omitempty,max=200"`
	Email          *string  `json:"email" binding:"omitempty,email,max=100"`
	Phone          *string  `json:"phone" binding:"omitempty,max=30"`
	JobTitle       *string  `json:"job_title" binding:"omitempty,max=100"`
	Address        *string  `json:"address"`
	City           *string  `json:"city" binding:"omitempty,max=100"`
	Province       *string  `json:"province" binding:"omitempty,max=100"`
	LeadSourceID   *string  `json:"lead_source_id" binding:"omitempty,uuid"`
	LeadStatusID   *string  `json:"lead_status_id" binding:"omitempty,uuid"`
	EstimatedValue *float64 `json:"estimated_value"`
	Probability    *int     `json:"probability" binding:"omitempty,min=0,max=100"`
	// BANT
	BudgetConfirmed *bool    `json:"budget_confirmed"`
	BudgetAmount    *float64 `json:"budget_amount"`
	AuthConfirmed   *bool    `json:"auth_confirmed"`
	AuthPerson      *string  `json:"auth_person" binding:"omitempty,max=200"`
	NeedConfirmed   *bool    `json:"need_confirmed"`
	NeedDescription *string  `json:"need_description"`
	TimeConfirmed   *bool    `json:"time_confirmed"`
	TimeExpected    *string  `json:"time_expected"`
	// Assignment
	AssignedTo *string `json:"assigned_to" binding:"omitempty,uuid"`
	Notes      *string `json:"notes"`
}

// ConvertLeadRequest defines the request body for converting a lead
type ConvertLeadRequest struct {
	CustomerID  *string `json:"customer_id" binding:"omitempty,uuid"`
	Notes       string  `json:"notes"`
}

// LeadResponse defines the response body for a lead
type LeadResponse struct {
	ID             string              `json:"id"`
	Code           string              `json:"code"`
	FirstName      string              `json:"first_name"`
	LastName       string              `json:"last_name"`
	CompanyName    string              `json:"company_name"`
	Email          string              `json:"email"`
	Phone          string              `json:"phone"`
	JobTitle       string              `json:"job_title"`
	Address        string              `json:"address"`
	City           string              `json:"city"`
	Province       string              `json:"province"`
	LeadSourceID   *string             `json:"lead_source_id"`
	LeadSource     *LeadSourceInfo     `json:"lead_source,omitempty"`
	LeadStatusID   *string             `json:"lead_status_id"`
	LeadStatus     *LeadStatusInfo     `json:"lead_status,omitempty"`
	LeadScore      int                 `json:"lead_score"`
	Probability    int                 `json:"probability"`
	EstimatedValue float64             `json:"estimated_value"`
	// BANT
	BudgetConfirmed bool    `json:"budget_confirmed"`
	BudgetAmount    float64 `json:"budget_amount"`
	AuthConfirmed   bool    `json:"auth_confirmed"`
	AuthPerson      string  `json:"auth_person"`
	NeedConfirmed   bool    `json:"need_confirmed"`
	NeedDescription string  `json:"need_description"`
	TimeConfirmed   bool    `json:"time_confirmed"`
	TimeExpected    *string `json:"time_expected"`
	// Assignment
	AssignedTo       *string             `json:"assigned_to"`
	AssignedEmployee *LeadEmployeeInfo   `json:"assigned_employee,omitempty"`
	// Conversion
	CustomerID  *string          `json:"customer_id"`
	Customer    *LeadCustomerInfo `json:"customer,omitempty"`
	ContactID   *string          `json:"contact_id"`
	DealID      *string          `json:"deal_id"`
	ConvertedAt *string          `json:"converted_at"`
	ConvertedBy *string          `json:"converted_by"`
	// Metadata
	Notes     string  `json:"notes"`
	CreatedBy *string `json:"created_by"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
}

// LeadSourceInfo is a compact representation of lead source
type LeadSourceInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Code string `json:"code"`
}

// LeadStatusInfo is a compact representation of lead status
type LeadStatusInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Code        string `json:"code"`
	Color       string `json:"color"`
	Score       int    `json:"score"`
	IsConverted bool   `json:"is_converted"`
}

// LeadEmployeeInfo is a compact representation of an employee
type LeadEmployeeInfo struct {
	ID           string `json:"id"`
	EmployeeCode string `json:"employee_code"`
	Name         string `json:"name"`
}

// LeadCustomerInfo is a compact representation of a customer
type LeadCustomerInfo struct {
	ID   string `json:"id"`
	Code string `json:"code"`
	Name string `json:"name"`
}

// LeadFormDataResponse holds all options required by the lead form
type LeadFormDataResponse struct {
	Employees    []LeadEmployeeOption  `json:"employees"`
	LeadSources  []LeadSourceOption    `json:"lead_sources"`
	LeadStatuses []LeadStatusOption    `json:"lead_statuses"`
	Customers    []LeadCustomerOption  `json:"customers"`
}

// LeadEmployeeOption for employee dropdown
type LeadEmployeeOption struct {
	ID           uuid.UUID `json:"id"`
	EmployeeCode string    `json:"employee_code"`
	Name         string    `json:"name"`
}

// LeadSourceOption for lead source dropdown
type LeadSourceOption struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Code string `json:"code"`
}

// LeadStatusOption for lead status dropdown
type LeadStatusOption struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Code        string `json:"code"`
	Color       string `json:"color"`
	IsDefault   bool   `json:"is_default"`
	IsConverted bool   `json:"is_converted"`
}

// LeadCustomerOption for customer dropdown
type LeadCustomerOption struct {
	ID   string `json:"id"`
	Code string `json:"code"`
	Name string `json:"name"`
}
