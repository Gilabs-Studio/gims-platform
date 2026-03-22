package dto

import (
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/google/uuid"
)

type CreateAssetRequest struct {
	Code        string `json:"code" binding:"required"`
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`

	CategoryID string `json:"category_id" binding:"required,uuid"`
	LocationID string `json:"location_id" binding:"required,uuid"`

	AcquisitionDate string  `json:"acquisition_date" binding:"required"`
	AcquisitionCost float64 `json:"acquisition_cost" binding:"required,gt=0"`
	SalvageValue    float64 `json:"salvage_value" binding:"omitempty,gte=0"`

	// Extended fields
	SerialNumber *string `json:"serial_number"`
	Barcode      *string `json:"barcode"`
	AssetTag     *string `json:"asset_tag"`

	// Cost Breakdown
	ShippingCost     float64 `json:"shipping_cost" binding:"omitempty,gte=0"`
	InstallationCost float64 `json:"installation_cost" binding:"omitempty,gte=0"`
	TaxAmount        float64 `json:"tax_amount" binding:"omitempty,gte=0"`
	OtherCosts       float64 `json:"other_costs" binding:"omitempty,gte=0"`

	// Depreciation Config Override
	DepreciationMethod    *string `json:"depreciation_method"`
	UsefulLifeMonths      *int    `json:"useful_life_months"`
	DepreciationStartDate *string `json:"depreciation_start_date"`

	// Warranty
	WarrantyStart    *string `json:"warranty_start"`
	WarrantyEnd      *string `json:"warranty_end"`
	WarrantyProvider *string `json:"warranty_provider"`
	WarrantyTerms    *string `json:"warranty_terms"`

	// Insurance
	InsurancePolicyNumber *string  `json:"insurance_policy_number"`
	InsuranceProvider     *string  `json:"insurance_provider"`
	InsuranceStart        *string  `json:"insurance_start"`
	InsuranceEnd          *string  `json:"insurance_end"`
	InsuranceValue        *float64 `json:"insurance_value"`
}

type UpdateAssetRequest struct {
	Code        string `json:"code" binding:"required"`
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`

	CategoryID string `json:"category_id" binding:"required,uuid"`
	LocationID string `json:"location_id" binding:"required,uuid"`

	AcquisitionDate string                    `json:"acquisition_date" binding:"required"`
	AcquisitionCost float64                   `json:"acquisition_cost" binding:"required,gt=0"`
	SalvageValue    float64                   `json:"salvage_value" binding:"omitempty,gte=0"`
	Status          financeModels.AssetStatus `json:"status" binding:"omitempty,oneof=active inactive sold disposed"`

	// Extended fields
	SerialNumber *string `json:"serial_number"`
	Barcode      *string `json:"barcode"`
	AssetTag     *string `json:"asset_tag"`

	// Cost Breakdown
	ShippingCost     float64 `json:"shipping_cost" binding:"omitempty,gte=0"`
	InstallationCost float64 `json:"installation_cost" binding:"omitempty,gte=0"`
	TaxAmount        float64 `json:"tax_amount" binding:"omitempty,gte=0"`
	OtherCosts       float64 `json:"other_costs" binding:"omitempty,gte=0"`

	// Depreciation Config Override
	DepreciationMethod    *string `json:"depreciation_method"`
	UsefulLifeMonths      *int    `json:"useful_life_months"`
	DepreciationStartDate *string `json:"depreciation_start_date"`

	// Warranty
	WarrantyStart    *string `json:"warranty_start"`
	WarrantyEnd      *string `json:"warranty_end"`
	WarrantyProvider *string `json:"warranty_provider"`
	WarrantyTerms    *string `json:"warranty_terms"`

	// Insurance
	InsurancePolicyNumber *string  `json:"insurance_policy_number"`
	InsuranceProvider     *string  `json:"insurance_provider"`
	InsuranceStart        *string  `json:"insurance_start"`
	InsuranceEnd          *string  `json:"insurance_end"`
	InsuranceValue        *float64 `json:"insurance_value"`
}

type ListAssetsRequest struct {
	Page       int                        `form:"page" binding:"omitempty,min=1"`
	PerPage    int                        `form:"per_page" binding:"omitempty,min=1,max=100"`
	Search     string                     `form:"search"`
	Status     *financeModels.AssetStatus `form:"status" binding:"omitempty,oneof=active disposed"`
	CategoryID *string                    `form:"category_id"`
	LocationID *string                    `form:"location_id"`
	StartDate  *string                    `form:"start_date"`
	EndDate    *string                    `form:"end_date"`
	SortBy     string                     `form:"sort_by"`
	SortDir    string                     `form:"sort_dir"`
}

type DepreciateAssetRequest struct {
	AsOfDate string `json:"as_of_date" binding:"required"`
}

type TransferAssetRequest struct {
	LocationID   string `json:"location_id" binding:"required,uuid"`
	TransferDate string `json:"transfer_date" binding:"required"`
	Description  string `json:"description"`
}

type DisposeAssetRequest struct {
	DisposalDate string `json:"disposal_date" binding:"required"`
	Description  string `json:"description"`
}

type SellAssetRequest struct {
	DisposalDate string  `json:"disposal_date" binding:"required"`
	SaleAmount   float64 `json:"sale_amount" binding:"required,gt=0"`
	Description  string  `json:"description"`
}

type RevalueAssetRequest struct {
	RevaluationDate string  `json:"revaluation_date" binding:"required"`
	NewValue        float64 `json:"new_value" binding:"required,gt=0"`
	Description     string  `json:"description"`
}

type AdjustAssetRequest struct {
	AdjustmentDate   string  `json:"adjustment_date" binding:"required"`
	AdjustmentAmount float64 `json:"adjustment_amount" binding:"required"`
	Description      string  `json:"description"`
}

// --- Assignment / Return ---

type AssignAssetRequest struct {
	EmployeeID   string  `json:"employee_id" binding:"required,uuid"`
	DepartmentID *string `json:"department_id" binding:"omitempty,uuid"`
	LocationID   *string `json:"location_id" binding:"omitempty,uuid"`
	Notes        *string `json:"notes"`
}

type ReturnAssetRequest struct {
	ReturnDate   string  `json:"return_date" binding:"required"`
	ReturnReason *string `json:"return_reason"`
}

// --- Attachment ---

type CreateAttachmentRequest struct {
	FileType    string  `json:"file_type" binding:"required"`
	Description *string `json:"description"`
}

// ----- Responses -----

type AssetDepreciationResponse struct {
	ID               string                           `json:"id"`
	AssetID          string                           `json:"asset_id"`
	Period           string                           `json:"period"`
	DepreciationDate time.Time                        `json:"depreciation_date"`
	Method           financeModels.DepreciationMethod `json:"method"`
	Amount           float64                          `json:"amount"`
	Accumulated      float64                          `json:"accumulated"`
	BookValue        float64                          `json:"book_value"`
	JournalEntryID   *string                          `json:"journal_entry_id"`
	CreatedAt        time.Time                        `json:"created_at"`
}

type AssetTransactionResponse struct {
	ID              string                             `json:"id"`
	AssetID         string                             `json:"asset_id"`
	Type            financeModels.AssetTransactionType `json:"type"`
	TransactionDate time.Time                          `json:"transaction_date"`
	Amount          float64                            `json:"amount"`
	Description     string                             `json:"description"`
	Status          string                             `json:"status"`
	ReferenceType   *string                            `json:"reference_type"`
	ReferenceID     *string                            `json:"reference_id"`
	CreatedAt       time.Time                          `json:"created_at"`
}

type AssetAttachmentResponse struct {
	ID          string    `json:"id"`
	AssetID     string    `json:"asset_id"`
	FileName    string    `json:"file_name"`
	FilePath    string    `json:"file_path"`
	FileURL     string    `json:"file_url"`
	FileType    string    `json:"file_type"`
	FileSize    *int      `json:"file_size,omitempty"`
	MimeType    *string   `json:"mime_type,omitempty"`
	Description *string   `json:"description,omitempty"`
	UploadedBy  *string   `json:"uploaded_by,omitempty"`
	UploadedAt  time.Time `json:"uploaded_at"`
	CreatedAt   time.Time `json:"created_at"`
}

type AuditChangeResponse struct {
	Field    string      `json:"field"`
	OldValue interface{} `json:"old_value"`
	NewValue interface{} `json:"new_value"`
}

type AssetAuditLogResponse struct {
	ID          string                 `json:"id"`
	AssetID     string                 `json:"asset_id"`
	Action      string                 `json:"action"`
	Changes     []AuditChangeResponse  `json:"changes,omitempty"`
	PerformedBy *string                `json:"performed_by,omitempty"`
	PerformedAt time.Time              `json:"performed_at"`
	IPAddress   *string                `json:"ip_address,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
}

type AssetAssignmentHistoryResponse struct {
	ID           string     `json:"id"`
	AssetID      string     `json:"asset_id"`
	EmployeeID   *string    `json:"employee_id,omitempty"`
	EmployeeName *string    `json:"employee_name,omitempty"`
	DepartmentID *string    `json:"department_id,omitempty"`
	LocationID   *string    `json:"location_id,omitempty"`
	AssignedAt   time.Time  `json:"assigned_at"`
	AssignedBy   *string    `json:"assigned_by,omitempty"`
	ReturnedAt   *time.Time `json:"returned_at,omitempty"`
	ReturnReason *string    `json:"return_reason,omitempty"`
	Notes        *string    `json:"notes,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

type AssetResponse struct {
	ID          string `json:"id"`
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description"`

	// Identity
	SerialNumber *string `json:"serial_number,omitempty"`
	Barcode      *string `json:"barcode,omitempty"`
	QRCode       *string `json:"qr_code,omitempty"`
	AssetTag     *string `json:"asset_tag,omitempty"`

	// Category / Location
	CategoryID string                 `json:"category_id"`
	Category   *AssetCategoryResponse `json:"category,omitempty"`
	LocationID string                 `json:"location_id"`
	Location   *AssetLocationResponse `json:"location,omitempty"`

	// Organization
	CompanyID      *string `json:"company_id,omitempty"`
	BusinessUnitID *string `json:"business_unit_id,omitempty"`
	DepartmentID   *string `json:"department_id,omitempty"`

	// Assignment
	AssignedToEmployeeID *string    `json:"assigned_to_employee_id,omitempty"`
	AssignmentDate       *time.Time `json:"assignment_date,omitempty"`

	// Acquisition
	AcquisitionDate time.Time `json:"acquisition_date"`
	AcquisitionCost float64   `json:"acquisition_cost"`
	SalvageValue    float64   `json:"salvage_value"`

	// Cost Breakdown
	ShippingCost     float64 `json:"shipping_cost"`
	InstallationCost float64 `json:"installation_cost"`
	TaxAmount        float64 `json:"tax_amount"`
	OtherCosts       float64 `json:"other_costs"`
	TotalCost        float64 `json:"total_cost"`

	// Depreciation
	AccumulatedDepreciation float64 `json:"accumulated_depreciation"`
	BookValue               float64 `json:"book_value"`

	// Depreciation Config
	DepreciationMethod    *string    `json:"depreciation_method,omitempty"`
	UsefulLifeMonths      *int       `json:"useful_life_months,omitempty"`
	DepreciationStartDate *time.Time `json:"depreciation_start_date,omitempty"`

	// Status / Lifecycle
	Status               financeModels.AssetStatus         `json:"status"`
	LifecycleStage       financeModels.AssetLifecycleStage `json:"lifecycle_stage"`
	IsCapitalized        bool                              `json:"is_capitalized"`
	IsDepreciable        bool                              `json:"is_depreciable"`
	IsFullyDepreciated   bool                              `json:"is_fully_deprecated"`
	DisposedAt           *time.Time                        `json:"disposed_at,omitempty"`
	DepreciationProgress float64                           `json:"depreciation_progress"`
	AgeInMonths          int                               `json:"age_in_months"`

	// Parent/Child
	ParentAssetID *string `json:"parent_asset_id,omitempty"`
	IsParent      bool    `json:"is_parent"`

	// Warranty
	WarrantyStart         *time.Time `json:"warranty_start,omitempty"`
	WarrantyEnd           *time.Time `json:"warranty_end,omitempty"`
	WarrantyProvider      *string    `json:"warranty_provider,omitempty"`
	WarrantyTerms         *string    `json:"warranty_terms,omitempty"`
	IsUnderWarranty       bool       `json:"is_under_warranty"`
	WarrantyDaysRemaining int        `json:"warranty_days_remaining"`

	// Insurance
	InsurancePolicyNumber *string    `json:"insurance_policy_number,omitempty"`
	InsuranceProvider     *string    `json:"insurance_provider,omitempty"`
	InsuranceStart        *time.Time `json:"insurance_start,omitempty"`
	InsuranceEnd          *time.Time `json:"insurance_end,omitempty"`
	InsuranceValue        *float64   `json:"insurance_value,omitempty"`
	IsInsured             bool       `json:"is_insured"`

	// Audit
	CreatedBy  *string    `json:"created_by,omitempty"`
	ApprovedBy *string    `json:"approved_by,omitempty"`
	ApprovedAt *time.Time `json:"approved_at,omitempty"`

	// Timestamps
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relations (populated with details)
	Depreciations       []AssetDepreciationResponse      `json:"depreciations,omitempty"`
	Transactions        []AssetTransactionResponse       `json:"transactions,omitempty"`
	Attachments         []AssetAttachmentResponse        `json:"attachments,omitempty"`
	AuditLogs           []AssetAuditLogResponse          `json:"audit_logs,omitempty"`
	AssignmentHistories []AssetAssignmentHistoryResponse `json:"assignment_histories,omitempty"`
}

type CreateAssetFromPurchaseRequest struct {
	Code            string  `json:"code"`
	Name            string  `json:"name"`
	AcquisitionDate string  `json:"acquisition_date"`
	AcquisitionCost float64 `json:"acquisition_cost"`
	ReferenceType   string  `json:"reference_type"`
	ReferenceID     string  `json:"reference_id"`
	CategoryID      *string `json:"category_id"`
	LocationID      *string `json:"location_id"`
}

// AssetMiniResponse is a minimal response for asset references
type AssetMiniResponse struct {
	ID   string `json:"id"`
	Code string `json:"code"`
	Name string `json:"name"`
}

// AvailableAssetCategoryLite for available assets list
type AvailableAssetCategoryLite struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// AvailableAssetLocationLite for available assets list
type AvailableAssetLocationLite struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// AvailableAssetResponse for employee asset borrowing
type AvailableAssetResponse struct {
	ID         string                      `json:"id"`
	Code       string                      `json:"code"`
	Name       string                      `json:"name"`
	Category   *AvailableAssetCategoryLite `json:"category,omitempty"`
	Location   *AvailableAssetLocationLite `json:"location,omitempty"`
	AssetImage string                      `json:"asset_image,omitempty"`
	Status     string                      `json:"status"`
	BookValue  float64                     `json:"book_value"`
}

// UuidPtrToStringPtr converts a uuid.UUID pointer to a string pointer
func UuidPtrToStringPtr(u *uuid.UUID) *string {
	if u == nil {
		return nil
	}
	s := u.String()
	return &s
}
