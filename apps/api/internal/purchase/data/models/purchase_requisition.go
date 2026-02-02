package models

import (
	"time"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	supplierModels "github.com/gilabs/gims/api/internal/supplier/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PurchaseRequisitionStatus represents PR workflow status
type PurchaseRequisitionStatus string

const (
	PurchaseRequisitionStatusDraft     PurchaseRequisitionStatus = "DRAFT"
	PurchaseRequisitionStatusApproved  PurchaseRequisitionStatus = "APPROVED"
	PurchaseRequisitionStatusRejected  PurchaseRequisitionStatus = "REJECTED"
	PurchaseRequisitionStatusConverted PurchaseRequisitionStatus = "CONVERTED"
)

// PurchaseRequisition represents a purchase requisition document
// NOTE: request_date is stored as string (recommended ISO YYYY-MM-DD).
type PurchaseRequisition struct {
	ID string `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`

	Code string `gorm:"type:varchar(50);uniqueIndex;not null" json:"code"`

	SupplierID *string                `gorm:"type:uuid;index" json:"supplier_id"`
	Supplier   *supplierModels.Supplier `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`

	PaymentTermsID *string              `gorm:"type:uuid;index" json:"payment_terms_id"`
	PaymentTerms   *coreModels.PaymentTerms `gorm:"foreignKey:PaymentTermsID" json:"payment_terms,omitempty"`

	BusinessUnitID *string              `gorm:"type:uuid;index" json:"business_unit_id"`
	BusinessUnit   *orgModels.BusinessUnit `gorm:"foreignKey:BusinessUnitID" json:"business_unit,omitempty"`

	EmployeeID *string           `gorm:"type:uuid;index" json:"employee_id"`
	Employee   *orgModels.Employee `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`

	RequestDate string `gorm:"type:varchar(20);index" json:"request_date"`
	Address     *string `gorm:"type:text" json:"address"`
	Notes       string  `gorm:"type:text" json:"notes"`

	Status PurchaseRequisitionStatus `gorm:"type:varchar(20);default:'DRAFT';index" json:"status"`

	TaxRate      float64 `gorm:"type:decimal(5,2);default:0" json:"tax_rate"`
	TaxAmount    float64 `gorm:"type:decimal(15,2);default:0" json:"tax_amount"`
	DeliveryCost float64 `gorm:"type:decimal(15,2);default:0" json:"delivery_cost"`
	OtherCost    float64 `gorm:"type:decimal(15,2);default:0" json:"other_cost"`
	Subtotal     float64 `gorm:"type:decimal(15,2);default:0" json:"subtotal"`
	TotalAmount  float64 `gorm:"type:decimal(15,2);default:0" json:"total_amount"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Items []PurchaseRequisitionItem `gorm:"foreignKey:PurchaseRequisitionID;constraint:OnDelete:CASCADE" json:"items,omitempty"`
}

func (PurchaseRequisition) TableName() string {
	return "purchase_requisitions"
}

func (pr *PurchaseRequisition) BeforeCreate(tx *gorm.DB) error {
	if pr.ID == "" {
		pr.ID = uuid.New().String()
	}
	return nil
}
