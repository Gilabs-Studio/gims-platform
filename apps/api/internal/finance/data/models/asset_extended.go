package models

import (
	"database/sql/driver"
	"time"

	"github.com/google/uuid"
)

// AssetType enumeration
type AssetType string

const (
	AssetTypeTangible          AssetType = "TANGIBLE"
	AssetTypeIntangible        AssetType = "INTANGIBLE"
	AssetTypeNonDepreciable    AssetType = "NON_DEPRECIABLE"
	AssetTypeConstructionInProgress AssetType = "CONSTRUCTION"
)

// DisposalType enumeration
type DisposalType string

const (
	DisposalTypeSold       DisposalType = "SOLD"
	DisposalTypeScrapped   DisposalType = "SCRAPPED"
	DisposalTypeDonated    DisposalType = "DONATED"
	DisposalTypeTransferred DisposalType = "TRANSFERRED"
	DisposalTypeOther      DisposalType = "OTHER"
)

// AttachmentType enumeration
type AttachmentType string

const (
	AttachmentTypeInvoice   AttachmentType = "INVOICE"
	AttachmentTypeReceipt   AttachmentType = "RECEIPT"
	AttachmentTypePhoto     AttachmentType = "PHOTO"
	AttachmentTypeWarranty  AttachmentType = "WARRANTY"
	AttachmentTypeManual    AttachmentType = "MANUAL"
	AttachmentTypeOther     AttachmentType = "OTHER"
)

// MaintenanceType enumeration
type MaintenanceType string

const (
	MaintenanceTypePreventive MaintenanceType = "PREVENTIVE"
	MaintenanceTypeCorrective MaintenanceType = "CORRECTIVE"
	MaintenanceTypeEmergency  MaintenanceType = "EMERGENCY"
)

// TransferStatus enumeration
type TransferStatus string

const (
	TransferStatusPending   TransferStatus = "PENDING"
	TransferStatusCompleted TransferStatus = "COMPLETED"
	TransferStatusRejected  TransferStatus = "REJECTED"
)

// AssetDepreciationSchedule model
type AssetDepreciationSchedule struct {
	ID     uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	AssetID uuid.UUID `gorm:"type:uuid;not null;index" json:"asset_id"`

	PeriodStartDate    time.Time `gorm:"type:date;not null" json:"period_start_date"`
	PeriodEndDate      time.Time `gorm:"type:date;not null" json:"period_end_date"`
	PeriodMonth        int       `gorm:"type:integer;not null" json:"period_month"`

	DepreciationAmount         float64 `gorm:"type:numeric(18,2);not null" json:"depreciation_amount"`
	AccumulatedDepreciation    float64 `gorm:"type:numeric(18,2);not null" json:"accumulated_depreciation"`
	BookValue                  float64 `gorm:"type:numeric(18,2);not null" json:"book_value"`

	// Accounting Integration
	JournalEntryID *uuid.UUID `gorm:"type:uuid" json:"journal_entry_id"`
	IsPosted       bool `gorm:"type:boolean;default:false;index" json:"is_posted"`
	PostedAt       *time.Time `gorm:"type:timestamp" json:"posted_at"`

	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relations
	Asset *Asset `gorm:"foreignKey:AssetID" json:"asset,omitempty"`
}

// TableName specifies the table name
func (AssetDepreciationSchedule) TableName() string {
	return "asset_depreciation_schedules"
}

// AssetDisposal model
type AssetDisposal struct {
	ID     uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	AssetID uuid.UUID `gorm:"type:uuid;not null;index" json:"asset_id"`

	DisposalType DisposalType `gorm:"type:varchar(50)" json:"disposal_type"`
	DisposalDate time.Time    `gorm:"type:date;not null;index" json:"disposal_date"`

	// Financial Details
	DisposalValue                  *float64 `gorm:"type:numeric(18,2)" json:"disposal_value"`
	AccumulatedDepreciationAtDisposal *float64 `gorm:"type:numeric(18,2)" json:"accumulated_depreciation_at_disposal"`
	GainOrLoss                     *float64 `gorm:"type:numeric(18,2)" json:"gain_or_loss"`

	// Transaction Details
	ReferenceType   *string `gorm:"type:varchar(50)" json:"reference_type"`
	ReferenceNumber *string `gorm:"type:varchar(100)" json:"reference_number"`
	Description     *string `gorm:"type:text" json:"description"`

	// Audit
	ApprovedBy *uuid.UUID `gorm:"type:uuid" json:"approved_by"`
	ApprovedAt *time.Time `gorm:"type:timestamp" json:"approved_at"`
	CreatedBy  *uuid.UUID `gorm:"type:uuid" json:"created_by"`
	CreatedAt  time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt  time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relations
	Asset *Asset `gorm:"foreignKey:AssetID" json:"asset,omitempty"`
}

// TableName specifies the table name
func (AssetDisposal) TableName() string {
	return "asset_disposals"
}

// AuditAction enumeration
type AuditAction string

const (
	AuditActionCreated        AuditAction = "CREATED"
	AuditActionUpdated        AuditAction = "UPDATED"
	AuditActionActivated      AuditAction = "ACTIVATED"
	AuditActionDisposed       AuditAction = "DISPOSED"
	AuditActionTransferred    AuditAction = "TRANSFERRED"
	AuditActionStatusChanged  AuditAction = "STATUS_CHANGED"
)

// AssetTransfer model
type AssetTransfer struct {
	ID     uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	AssetID uuid.UUID `gorm:"type:uuid;not null;index" json:"asset_id"`

	FromLocationID   *uuid.UUID `gorm:"type:uuid" json:"from_location_id"`
	ToLocationID     *uuid.UUID `gorm:"type:uuid" json:"to_location_id"`
	FromDepartmentID *uuid.UUID `gorm:"type:uuid" json:"from_department_id"`
	ToDepartmentID   *uuid.UUID `gorm:"type:uuid" json:"to_department_id"`
	FromCustodianID  *uuid.UUID `gorm:"type:uuid" json:"from_custodian_id"`
	ToCustodianID    *uuid.UUID `gorm:"type:uuid" json:"to_custodian_id"`

	TransferDate time.Time `gorm:"type:date;not null;index" json:"transfer_date"`
	Reason       *string `gorm:"type:text" json:"reason"`

	Status     TransferStatus `gorm:"type:varchar(50);index" json:"status"`
	ApprovedBy *uuid.UUID `gorm:"type:uuid" json:"approved_by"`
	ApprovedAt *time.Time `gorm:"type:timestamp" json:"approved_at"`

	CreatedBy *uuid.UUID `gorm:"type:uuid" json:"created_by"`
	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relations
	Asset *Asset `gorm:"foreignKey:AssetID" json:"asset,omitempty"`
}

// TableName specifies the table name
func (AssetTransfer) TableName() string {
	return "asset_transfers"
}

// AssetMaintenanceLog model
type AssetMaintenanceLog struct {
	ID     uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	AssetID uuid.UUID `gorm:"type:uuid;not null;index" json:"asset_id"`

	MaintenanceType MaintenanceType `gorm:"type:varchar(50);index" json:"maintenance_type"`
	MaintenanceDate time.Time `gorm:"type:date;not null;index" json:"maintenance_date"`

	Description     *string `gorm:"type:text" json:"description"`
	Cost            *float64 `gorm:"type:numeric(18,2)" json:"cost"`

	ServiceProvider *string `gorm:"type:varchar(200)" json:"service_provider"`
	PartsReplaced   *string `gorm:"type:text" json:"parts_replaced"`

	DurationHours        *float64 `gorm:"type:numeric(10,2)" json:"duration_hours"`
	NextMaintenanceDate  *time.Time `gorm:"type:date" json:"next_maintenance_date"`

	RecordedBy *uuid.UUID `gorm:"type:uuid" json:"recorded_by"`
	CreatedAt  time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt  time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relations
	Asset *Asset `gorm:"foreignKey:AssetID" json:"asset,omitempty"`
}

// TableName specifies the table name
func (AssetMaintenanceLog) TableName() string {
	return "asset_maintenance_logs"
}

// Scan implements sql.Scanner interface for AssetType
func (at *AssetType) Scan(value interface{}) error {
	bytes, _ := value.([]byte)
	*at = AssetType(bytes)
	return nil
}

// Value implements driver.Valuer interface for AssetType
func (at AssetType) Value() (driver.Value, error) {
	return string(at), nil
}
