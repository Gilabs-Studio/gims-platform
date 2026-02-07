package dto

import "time"

// CreateEmployeeAssetRequest represents the request to create an employee asset record
type CreateEmployeeAssetRequest struct {
	EmployeeID      string  `json:"employee_id" binding:"required,uuid"`
	AssetName       string  `json:"asset_name" binding:"required,max=200"`
	AssetCode       string  `json:"asset_code" binding:"required,max=100"`
	AssetCategory   string  `json:"asset_category" binding:"required,max=100"`
	BorrowDate      string  `json:"borrow_date" binding:"required"` // Format: YYYY-MM-DD
	BorrowCondition string  `json:"borrow_condition" binding:"required,oneof=NEW GOOD FAIR POOR DAMAGED"`
	Notes           *string `json:"notes" binding:"omitempty,max=1000"`
}

// UpdateEmployeeAssetRequest represents the request to update an employee asset record
type UpdateEmployeeAssetRequest struct {
	AssetName       *string `json:"asset_name" binding:"omitempty,max=200"`
	AssetCode       *string `json:"asset_code" binding:"omitempty,max=100"`
	AssetCategory   *string `json:"asset_category" binding:"omitempty,max=100"`
	BorrowDate      *string `json:"borrow_date" binding:"omitempty"` // Format: YYYY-MM-DD
	BorrowCondition *string `json:"borrow_condition" binding:"omitempty,oneof=NEW GOOD FAIR POOR DAMAGED"`
	Notes           *string `json:"notes" binding:"omitempty,max=1000"`
}

// ReturnAssetRequest represents the request to mark an asset as returned
type ReturnAssetRequest struct {
	ReturnDate      string  `json:"return_date" binding:"required"` // Format: YYYY-MM-DD
	ReturnCondition string  `json:"return_condition" binding:"required,oneof=NEW GOOD FAIR POOR DAMAGED"`
	Notes           *string `json:"notes" binding:"omitempty,max=1000"`
}

// EmployeeAssetResponse represents the employee asset response
type EmployeeAssetResponse struct {
	ID              string                  `json:"id"`
	EmployeeID      string                  `json:"employee_id"`
	Employee        *EmployeeSimpleResponse `json:"employee,omitempty"`
	AssetName       string                  `json:"asset_name"`
	AssetCode       string                  `json:"asset_code"`
	AssetCategory   string                  `json:"asset_category"`
	BorrowDate      string                  `json:"borrow_date"`
	ReturnDate      *string                 `json:"return_date"`
	BorrowCondition string                  `json:"borrow_condition"`
	ReturnCondition *string                 `json:"return_condition"`
	Notes           *string                 `json:"notes"`
	Status          string                  `json:"status"`
	DaysBorrowed    int                     `json:"days_borrowed"`
	CreatedAt       time.Time               `json:"created_at"`
	UpdatedAt       time.Time               `json:"updated_at"`
}

// EmployeeAssetFormDataResponse represents the form data for employee asset dropdown
type EmployeeAssetFormDataResponse struct {
	Employees []EmployeeFormOption `json:"employees"`
}
