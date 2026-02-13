package models

import (
	"time"

	"gorm.io/gorm"
)

// AssetStatus represents the status of a borrowed asset
type AssetStatus string

const (
	AssetStatusBorrowed AssetStatus = "BORROWED"
	AssetStatusReturned AssetStatus = "RETURNED"
)

// AssetCondition represents the condition of the asset
type AssetCondition string

const (
	AssetConditionNew     AssetCondition = "NEW"
	AssetConditionGood    AssetCondition = "GOOD"
	AssetConditionFair    AssetCondition = "FAIR"
	AssetConditionPoor    AssetCondition = "POOR"
	AssetConditionDamaged AssetCondition = "DAMAGED"
)

// EmployeeAsset represents a company asset borrowed by an employee
type EmployeeAsset struct {
	ID              string          `gorm:"type:char(36);primaryKey" json:"id"`
	EmployeeID      string          `gorm:"type:char(36);not null;index" json:"employee_id"`
	AssetName       string          `gorm:"type:varchar(200);not null;index:idx_asset_name_gin,type:gin" json:"asset_name"`
	AssetCode       string          `gorm:"type:varchar(100);not null;uniqueIndex" json:"asset_code"`
	AssetCategory   string          `gorm:"type:varchar(100);not null;index" json:"asset_category"`
	BorrowDate      time.Time       `gorm:"type:date;not null;index" json:"borrow_date"`
	ReturnDate      *time.Time      `gorm:"type:date;index" json:"return_date"` // NULL if not yet returned
	BorrowCondition AssetCondition  `gorm:"type:varchar(50);not null" json:"borrow_condition"`
	ReturnCondition *AssetCondition `gorm:"type:varchar(50)" json:"return_condition"` // NULL if not yet returned
	Notes           *string         `gorm:"type:text" json:"notes"`
	CreatedAt       time.Time       `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time       `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt       gorm.DeletedAt  `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName specifies the table name for EmployeeAsset
func (EmployeeAsset) TableName() string {
	return "employee_assets"
}

// IsReturned checks if the asset has been returned
func (ea *EmployeeAsset) IsReturned() bool {
	return ea.ReturnDate != nil
}

// GetStatus returns the current status of the asset
func (ea *EmployeeAsset) GetStatus() AssetStatus {
	if ea.IsReturned() {
		return AssetStatusReturned
	}
	return AssetStatusBorrowed
}

// DaysBorrowed calculates the number of days the asset has been borrowed
func (ea *EmployeeAsset) DaysBorrowed() int {
	endDate := time.Now()
	if ea.IsReturned() {
		endDate = *ea.ReturnDate
	}
	duration := endDate.Sub(ea.BorrowDate)
	return int(duration.Hours() / 24)
}
