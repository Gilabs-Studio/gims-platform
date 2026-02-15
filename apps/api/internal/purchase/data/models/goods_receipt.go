package models

import (
	"time"

	supplierModels "github.com/gilabs/gims/api/internal/supplier/data/models"
	userModels "github.com/gilabs/gims/api/internal/user/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GoodsReceiptStatus string

const (
	GoodsReceiptStatusDraft     GoodsReceiptStatus = "DRAFT"
	GoodsReceiptStatusConfirmed GoodsReceiptStatus = "CONFIRMED"
)

type GoodsReceipt struct {
	ID string `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`

	Code string `gorm:"type:varchar(50);uniqueIndex;not null" json:"code"`

	PurchaseOrderID string        `gorm:"type:uuid;index;not null" json:"purchase_order_id"`
	PurchaseOrder   *PurchaseOrder `gorm:"foreignKey:PurchaseOrderID" json:"purchase_order,omitempty"`

	SupplierID string                `gorm:"type:uuid;index;not null" json:"supplier_id"`
	Supplier   *supplierModels.Supplier `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	SupplierCodeSnapshot string      `gorm:"type:varchar(50)" json:"supplier_code_snapshot,omitempty"`
	SupplierNameSnapshot string      `gorm:"type:varchar(200)" json:"supplier_name_snapshot,omitempty"`

	ReceiptDate *time.Time        `gorm:"index" json:"receipt_date,omitempty"`
	Notes       *string           `gorm:"type:text" json:"notes,omitempty"`
	Status      GoodsReceiptStatus `gorm:"type:varchar(20);default:'DRAFT';index" json:"status"`

	CreatedBy string          `gorm:"type:uuid;index;not null" json:"created_by"`
	Creator   *userModels.User `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`

	Items []GoodsReceiptItem `gorm:"foreignKey:GoodsReceiptID;constraint:OnDelete:CASCADE" json:"items,omitempty"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (GoodsReceipt) TableName() string {
	return "goods_receipts"
}

func (gr *GoodsReceipt) BeforeCreate(tx *gorm.DB) error {
	if gr.ID == "" {
		gr.ID = uuid.New().String()
	}
	return nil
}
