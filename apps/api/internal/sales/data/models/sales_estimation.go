package models

import (
	"time"

	customerModels "github.com/gilabs/gims/api/internal/customer/data/models"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SalesEstimationStatus represents the status of a sales estimation
type SalesEstimationStatus string

const (
	SalesEstimationStatusDraft     SalesEstimationStatus = "draft"
	SalesEstimationStatusSubmitted SalesEstimationStatus = "submitted"
	SalesEstimationStatusApproved  SalesEstimationStatus = "approved"
	SalesEstimationStatusRejected  SalesEstimationStatus = "rejected"
	SalesEstimationStatusConverted SalesEstimationStatus = "converted"
)

// SalesEstimation represents a sales estimation document
type SalesEstimation struct {
	ID             string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Code           string    `gorm:"type:varchar(50);uniqueIndex;not null" json:"code"`
	EstimationDate time.Time `gorm:"type:date;not null;index" json:"estimation_date"`
	ExpectedCloseDate *time.Time `gorm:"type:date" json:"expected_close_date"`

	// Customer Info
	CustomerID      *string                    `gorm:"type:uuid;index" json:"customer_id"` // FK to master data customer
	Customer        *customerModels.Customer   `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	CustomerName    string                     `gorm:"type:varchar(255);not null" json:"customer_name"`
	CustomerEmail   string  `gorm:"type:varchar(255)" json:"customer_email"`
	CustomerPhone   string  `gorm:"type:varchar(50)" json:"customer_phone"`
	CustomerContact string  `gorm:"type:varchar(255)" json:"customer_contact"`

	// Relations
	SalesRepID *string             `gorm:"type:uuid;index" json:"sales_rep_id"`
	SalesRep   *orgModels.Employee `gorm:"foreignKey:SalesRepID" json:"sales_rep,omitempty"`

	BusinessUnitID *string                 `gorm:"type:uuid;index" json:"business_unit_id"`
	BusinessUnit   *orgModels.BusinessUnit `gorm:"foreignKey:BusinessUnitID" json:"business_unit,omitempty"`

	BusinessTypeID *string                 `gorm:"type:uuid;index" json:"business_type_id"`
	BusinessType   *orgModels.BusinessType `gorm:"foreignKey:BusinessTypeID" json:"business_type,omitempty"`
	
	AreaID *string `gorm:"type:uuid;index" json:"area_id"`
	Area   *orgModels.Area `gorm:"foreignKey:AreaID" json:"area,omitempty"`

	// Estimation details
	Probability int    `gorm:"type:int;default:0" json:"probability"` // 0-100
	Notes       string `gorm:"type:text" json:"notes"`

	// Financial calculations
	Subtotal       float64 `gorm:"type:decimal(15,2);default:0" json:"subtotal"`
	DiscountAmount float64 `gorm:"type:decimal(15,2);default:0" json:"discount_amount"`
	TaxRate        float64 `gorm:"type:decimal(5,2);default:11.00" json:"tax_rate"` // Default 11% PPN
	TaxAmount      float64 `gorm:"type:decimal(15,2);default:0" json:"tax_amount"`
	DeliveryCost   float64 `gorm:"type:decimal(15,2);default:0" json:"delivery_cost"`
	OtherCost      float64 `gorm:"type:decimal(15,2);default:0" json:"other_cost"`
	TotalAmount    float64 `gorm:"type:decimal(15,2);default:0" json:"total_amount"`

	// Status and workflow
	Status SalesEstimationStatus `gorm:"type:varchar(20);default:'draft';index" json:"status"`

	// Audit fields
	CreatedBy       *string    `gorm:"type:uuid" json:"created_by"`
	ApprovedBy      *string    `gorm:"type:uuid" json:"approved_by"`
	ApprovedAt      *time.Time `json:"approved_at"`
	RejectedBy      *string    `gorm:"type:uuid" json:"rejected_by"`
	RejectedAt      *time.Time `json:"rejected_at"`
	RejectionReason *string    `gorm:"type:text" json:"rejection_reason"`

	// Conversion tracking
	ConvertedToQuotationID *string    `gorm:"type:uuid;index" json:"converted_to_quotation_id"`
	ConvertedAt            *time.Time `json:"converted_at"`

	// Timestamps
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Items []SalesEstimationItem `gorm:"foreignKey:SalesEstimationID;constraint:OnDelete:CASCADE" json:"items,omitempty"`
}

// TableName specifies the table name for SalesEstimation
func (SalesEstimation) TableName() string {
	return "sales_estimations"
}

// BeforeCreate hook to generate UUID
func (se *SalesEstimation) BeforeCreate(tx *gorm.DB) error {
	if se.ID == "" {
		se.ID = uuid.New().String()
	}
	return nil
}

// SalesEstimationItem represents an item in a sales estimation
type SalesEstimationItem struct {
	ID                string           `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SalesEstimationID string           `gorm:"type:uuid;not null;index" json:"sales_estimation_id"`
	SalesEstimation   *SalesEstimation `gorm:"foreignKey:SalesEstimationID" json:"sales_estimation,omitempty"`

	ProductID string                 `gorm:"type:uuid;not null;index" json:"product_id"`
	Product   *productModels.Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`

	Quantity       float64 `gorm:"type:decimal(15,3);not null" json:"quantity"`
	EstimatedPrice float64 `gorm:"type:decimal(15,2);not null" json:"estimated_price"`
	Discount       float64 `gorm:"type:decimal(15,2);default:0" json:"discount"` // Discount amount
	Subtotal       float64 `gorm:"type:decimal(15,2);not null" json:"subtotal"`

	// Timestamps
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name for SalesEstimationItem
func (SalesEstimationItem) TableName() string {
	return "sales_estimation_items"
}

// BeforeCreate hook to generate UUID
func (sei *SalesEstimationItem) BeforeCreate(tx *gorm.DB) error {
	if sei.ID == "" {
		sei.ID = uuid.New().String()
	}
	return nil
}

// CalculateSubtotal calculates the subtotal for the item
func (sei *SalesEstimationItem) CalculateSubtotal() {
	sei.Subtotal = (sei.EstimatedPrice * sei.Quantity) - sei.Discount
}
