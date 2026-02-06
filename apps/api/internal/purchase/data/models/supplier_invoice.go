package models

import (
	"time"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	supplierModels "github.com/gilabs/gims/api/internal/supplier/data/models"
	userModels "github.com/gilabs/gims/api/internal/user/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SupplierInvoiceType string

type SupplierInvoiceStatus string

const (
	SupplierInvoiceTypeNormal      SupplierInvoiceType = "NORMAL"
	SupplierInvoiceTypeDownPayment SupplierInvoiceType = "DOWN_PAYMENT"
)

const (
	SupplierInvoiceStatusDraft   SupplierInvoiceStatus = "DRAFT"
	SupplierInvoiceStatusUnpaid  SupplierInvoiceStatus = "UNPAID"
	SupplierInvoiceStatusPartial SupplierInvoiceStatus = "PARTIAL"
	SupplierInvoiceStatusPaid    SupplierInvoiceStatus = "PAID"
)

type SupplierInvoice struct {
	ID string `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`

	Type SupplierInvoiceType `gorm:"type:varchar(20);not null;index" json:"type"`

	PurchaseOrderID string         `gorm:"type:uuid;index;not null" json:"purchase_order_id"`
	PurchaseOrder   *PurchaseOrder `gorm:"foreignKey:PurchaseOrderID" json:"purchase_order,omitempty"`

	SupplierID string                  `gorm:"type:uuid;index;not null" json:"supplier_id"`
	Supplier   *supplierModels.Supplier `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`

	PaymentTermsID *string                `gorm:"type:uuid;index" json:"payment_terms_id"`
	PaymentTerms   *coreModels.PaymentTerms `gorm:"foreignKey:PaymentTermsID" json:"payment_terms,omitempty"`

	Code          string `gorm:"type:varchar(50);uniqueIndex;not null" json:"code"`
	InvoiceNumber string `gorm:"type:varchar(100);index;not null" json:"invoice_number"`
	InvoiceDate   string `gorm:"type:varchar(20);index;not null" json:"invoice_date"`
	DueDate       string `gorm:"type:varchar(20);index;not null" json:"due_date"`

	TaxRate      float64 `gorm:"type:decimal(5,2);default:0" json:"tax_rate"`
	TaxAmount    float64 `gorm:"type:decimal(15,2);default:0" json:"tax_amount"`
	DeliveryCost float64 `gorm:"type:decimal(15,2);default:0" json:"delivery_cost"`
	OtherCost    float64 `gorm:"type:decimal(15,2);default:0" json:"other_cost"`
	SubTotal     float64 `gorm:"type:decimal(15,2);default:0" json:"sub_total"`
	Amount       float64 `gorm:"type:decimal(15,2);default:0" json:"amount"`

	Status SupplierInvoiceStatus `gorm:"type:varchar(20);default:'DRAFT';index" json:"status"`
	Notes  *string              `gorm:"type:text" json:"notes,omitempty"`

	CreatedBy string          `gorm:"type:uuid;index;not null" json:"created_by"`
	Creator   *userModels.User `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`

	Items []SupplierInvoiceItem `gorm:"foreignKey:SupplierInvoiceID;constraint:OnDelete:CASCADE" json:"items,omitempty"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (SupplierInvoice) TableName() string {
	return "supplier_invoices"
}

func (si *SupplierInvoice) BeforeCreate(tx *gorm.DB) error {
	if si.ID == "" {
		si.ID = uuid.New().String()
	}
	return nil
}
