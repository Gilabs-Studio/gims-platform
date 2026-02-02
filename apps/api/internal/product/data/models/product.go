package models

import (
	"time"

	"github.com/gilabs/gims/api/internal/organization/data/models"
	supplierModels "github.com/gilabs/gims/api/internal/supplier/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ProductStatus represents the approval status of a product
type ProductStatus string

const (
	ProductStatusDraft    ProductStatus = "draft"
	ProductStatusPending  ProductStatus = "pending"
	ProductStatusApproved ProductStatus = "approved"
	ProductStatusRejected ProductStatus = "rejected"
)

// Product represents a product in the ERP system
type Product struct {
	ID                string         `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Code              string         `gorm:"type:varchar(50);uniqueIndex" json:"code"`
	Name              string         `gorm:"type:varchar(200);not null;index" json:"name"`
	Description       string         `gorm:"type:text" json:"description"`
	ImageURL          *string        `gorm:"type:varchar(500)" json:"image_url"`
	ManufacturerPartNumber string    `gorm:"type:varchar(100)" json:"manufacturer_part_number"`
	
	// Relations to lookup tables
	CategoryID        *string         `gorm:"type:uuid;index" json:"category_id"`
	Category          *ProductCategory `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	
	BrandID           *string         `gorm:"type:uuid;index" json:"brand_id"`
	Brand             *ProductBrand   `gorm:"foreignKey:BrandID" json:"brand,omitempty"`
	
	SegmentID         *string         `gorm:"type:uuid;index" json:"segment_id"`
	Segment           *ProductSegment `gorm:"foreignKey:SegmentID" json:"segment,omitempty"`
	
	TypeID            *string         `gorm:"type:uuid;index" json:"type_id"`
	Type              *ProductType    `gorm:"foreignKey:TypeID" json:"type,omitempty"`
	
	UomID             *string         `gorm:"type:uuid;index" json:"uom_id"`
	Uom               *UnitOfMeasure  `gorm:"foreignKey:UomID" json:"uom,omitempty"`
	
	PurchaseUomID     *string         `gorm:"type:uuid;index" json:"purchase_uom_id"`
	PurchaseUom       *UnitOfMeasure  `gorm:"foreignKey:PurchaseUomID" json:"purchase_uom,omitempty"`
	PurchaseUomConversion float64     `gorm:"type:decimal(15,6);default:1" json:"purchase_uom_conversion"`
	
	PackagingID       *string         `gorm:"type:uuid;index" json:"packaging_id"`
	Packaging         *Packaging      `gorm:"foreignKey:PackagingID" json:"packaging,omitempty"`
	
	ProcurementTypeID *string         `gorm:"type:uuid;index" json:"procurement_type_id"`
	ProcurementType   *ProcurementType `gorm:"foreignKey:ProcurementTypeID" json:"procurement_type,omitempty"`
	
	// External relations
	SupplierID        *string         `gorm:"type:uuid;index" json:"supplier_id"`
	Supplier          *supplierModels.Supplier `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	
	BusinessUnitID    *string         `gorm:"type:uuid;index" json:"business_unit_id"`
	BusinessUnit      *models.BusinessUnit `gorm:"foreignKey:BusinessUnitID" json:"business_unit,omitempty"`
	
	// Pricing
	CostPrice         float64         `gorm:"type:decimal(15,2);default:0" json:"cost_price"`
	SellingPrice      float64         `gorm:"type:decimal(15,2);default:0" json:"selling_price"`
	CurrentHpp        float64         `gorm:"type:decimal(15,2);default:0" json:"current_hpp"`
	TaxType           string          `gorm:"type:varchar(50)" json:"tax_type"`
	IsTaxInclusive    bool            `gorm:"default:false" json:"is_tax_inclusive"`
	
	// Stock management
	CurrentStock      float64         `gorm:"type:decimal(15,3);default:0" json:"current_stock"`
	ReservedStock     float64         `gorm:"type:decimal(15,3);default:0" json:"reserved_stock"`
	MinStock          float64         `gorm:"type:decimal(15,3);default:0" json:"min_stock"`
	MaxStock          float64         `gorm:"type:decimal(15,3);default:0" json:"max_stock"`
	LeadTimeDays      int             `gorm:"default:0" json:"lead_time_days"`
	
	// Additional info
	Barcode           string          `gorm:"type:varchar(50);index" json:"barcode"`
	Sku               string          `gorm:"type:varchar(50);index" json:"sku"`
	Weight            float64         `gorm:"type:decimal(10,3);default:0" json:"weight"`
	Volume            float64         `gorm:"type:decimal(10,3);default:0" json:"volume"`
	Notes             string          `gorm:"type:text" json:"notes"`
	
	// Approval workflow
	Status            ProductStatus   `gorm:"type:varchar(20);default:'draft';index" json:"status"`
	IsApproved        bool            `gorm:"default:false;index" json:"is_approved"`
	CreatedBy         *string         `gorm:"type:uuid" json:"created_by"`
	ApprovedBy        *string         `gorm:"type:uuid" json:"approved_by"`
	ApprovedAt        *time.Time      `json:"approved_at"`
	
	// Active status
	IsActive          bool            `gorm:"default:true;index" json:"is_active"`
	
	// Timestamps
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `gorm:"index" json:"updated_at"`
	DeletedAt         gorm.DeletedAt  `gorm:"index" json:"-"`
}

// TableName specifies the table name for Product
func (Product) TableName() string {
	return "products"
}

// BeforeCreate hook to generate UUID
func (p *Product) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return nil
}
