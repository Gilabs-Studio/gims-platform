package models

import (
	"time"

	"github.com/google/uuid"
)

// TransferStatus enumeration
type TransferStatus string

const (
	TransferStatusPending   TransferStatus = "PENDING"
	TransferStatusCompleted TransferStatus = "COMPLETED"
	TransferStatusRejected  TransferStatus = "REJECTED"
)

// AssetTransfer model
type AssetTransfer struct {
	ID      uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	AssetID uuid.UUID `gorm:"type:uuid;not null;index" json:"asset_id"`

	FromLocationID   *uuid.UUID `gorm:"type:uuid" json:"from_location_id"`
	ToLocationID     *uuid.UUID `gorm:"type:uuid" json:"to_location_id"`
	FromDepartmentID *uuid.UUID `gorm:"type:uuid" json:"from_department_id"`
	ToDepartmentID   *uuid.UUID `gorm:"type:uuid" json:"to_department_id"`
	FromCustodianID  *uuid.UUID `gorm:"type:uuid" json:"from_custodian_id"`
	ToCustodianID    *uuid.UUID `gorm:"type:uuid" json:"to_custodian_id"`

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
