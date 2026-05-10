package models

import (
	"time"

	"github.com/google/uuid"
)

// TransferStatus enumeration
type TransferStatus string

const (
	TransferStatusPending  TransferStatus = "pending"
	TransferStatusApproved TransferStatus = "approved"
	TransferStatusRejected TransferStatus = "rejected"
)

// AssetTransfer model
type AssetTransfer struct {
	ID                  uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	TenantID            *uuid.UUID `gorm:"column:tenant_id;type:uuid;index" json:"tenant_id,omitempty"`
	AssetID             uuid.UUID  `gorm:"type:uuid;not null;index" json:"asset_id"`
	SourceTransactionID *uuid.UUID `gorm:"type:uuid;index" json:"source_transaction_id,omitempty"`

	FromLocationID   *uuid.UUID `gorm:"type:uuid" json:"from_location_id"`
	ToLocationID     *uuid.UUID `gorm:"type:uuid" json:"to_location_id"`
	FromDepartmentID *uuid.UUID `gorm:"type:uuid" json:"from_department_id"`
	ToDepartmentID   *uuid.UUID `gorm:"type:uuid" json:"to_department_id"`
	FromCustodianID  *uuid.UUID `gorm:"type:uuid" json:"from_custodian_id"`
	ToCustodianID    *uuid.UUID `gorm:"type:uuid" json:"to_custodian_id"`
	FromEmployeeID   *uuid.UUID `gorm:"type:uuid" json:"from_employee_id,omitempty"`
	ToEmployeeID     *uuid.UUID `gorm:"type:uuid" json:"to_employee_id,omitempty"`

	TransferDate time.Time `gorm:"type:date;not null;index" json:"transfer_date"`
	Reason       *string   `gorm:"type:text" json:"reason"`

	Status     TransferStatus `gorm:"type:varchar(50);index" json:"status"`
	ApprovedBy *uuid.UUID     `gorm:"type:uuid" json:"approved_by"`
	ApprovedAt *time.Time     `gorm:"type:timestamp" json:"approved_at"`

	CreatedBy *uuid.UUID `gorm:"type:uuid" json:"created_by"`
	CreatedAt time.Time  `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time  `gorm:"default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relations
	Asset *Asset `gorm:"foreignKey:AssetID" json:"asset,omitempty"`
}

// TableName specifies the table name
func (AssetTransfer) TableName() string {
	return "asset_transfers"
}
