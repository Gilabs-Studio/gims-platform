package dto

import "time"

// === Product DTOs ===

type CreateProductRequest struct {
	Code              string  `json:"code" binding:"required,min=2,max=50"`
	Name              string  `json:"name" binding:"required,min=2,max=200"`
	ManufacturerPartNumber string `json:"manufacturer_part_number"`
	Description       string  `json:"description"`
	CategoryID        *string `json:"category_id"`
	BrandID           *string `json:"brand_id"`
	SegmentID         *string `json:"segment_id"`
	TypeID            *string `json:"type_id"`
	UomID             *string `json:"uom_id"`
	PurchaseUomID     *string `json:"purchase_uom_id"`
	PurchaseUomConversion float64 `json:"purchase_uom_conversion"`
	PackagingID       *string `json:"packaging_id"`
	ProcurementTypeID *string `json:"procurement_type_id"`
	SupplierID        *string `json:"supplier_id"`
	BusinessUnitID    *string `json:"business_unit_id"`
	CostPrice         float64 `json:"cost_price"`
	SellingPrice      float64 `json:"selling_price"`
	MinStock          float64 `json:"min_stock"`
	MaxStock          float64 `json:"max_stock"`
	TaxType           string  `json:"tax_type"`
	IsTaxInclusive    bool    `json:"is_tax_inclusive"`
	LeadTimeDays      int     `json:"lead_time_days"`
	Barcode           string  `json:"barcode"`
	Sku               string  `json:"sku"`
	Weight            float64 `json:"weight"`
	Volume            float64 `json:"volume"`
	Notes             string  `json:"notes"`
	IsActive          *bool   `json:"is_active"`
}

type UpdateProductRequest struct {
	Code              string  `json:"code" binding:"omitempty,min=2,max=50"`
	Name              string  `json:"name" binding:"omitempty,min=2,max=200"`
	ManufacturerPartNumber string `json:"manufacturer_part_number"`
	Description       string  `json:"description"`
	CategoryID        *string `json:"category_id"`
	BrandID           *string `json:"brand_id"`
	SegmentID         *string `json:"segment_id"`
	TypeID            *string `json:"type_id"`
	UomID             *string `json:"uom_id"`
	PurchaseUomID     *string `json:"purchase_uom_id"`
	PurchaseUomConversion *float64 `json:"purchase_uom_conversion"`
	PackagingID       *string `json:"packaging_id"`
	ProcurementTypeID *string `json:"procurement_type_id"`
	SupplierID        *string `json:"supplier_id"`
	BusinessUnitID    *string `json:"business_unit_id"`
	CostPrice         *float64 `json:"cost_price"`
	SellingPrice      *float64 `json:"selling_price"`
	MinStock          *float64 `json:"min_stock"`
	MaxStock          *float64 `json:"max_stock"`
	TaxType           string  `json:"tax_type"`
	IsTaxInclusive    *bool   `json:"is_tax_inclusive"`
	LeadTimeDays      *int    `json:"lead_time_days"`
	Barcode           string  `json:"barcode"`
	Sku               string  `json:"sku"`
	Weight            *float64 `json:"weight"`
	Volume            *float64 `json:"volume"`
	Notes             string  `json:"notes"`
	IsActive          *bool   `json:"is_active"`
}

type ApproveProductRequest struct {
	Action string `json:"action" binding:"required,oneof=approve reject"`
	Reason string `json:"reason"`
}

// Nested response DTOs
type ProductCategoryBasic struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type ProductBrandBasic struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type ProductSegmentBasic struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type ProductTypeBasic struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type UnitOfMeasureBasic struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Symbol string `json:"symbol"`
}

type PackagingBasic struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type ProcurementTypeBasic struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type SupplierBasic struct {
	ID   string `json:"id"`
	Code string `json:"code"`
	Name string `json:"name"`
}

type BusinessUnitBasic struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type ProductResponse struct {
	ID                string                `json:"id"`
	Code              string                `json:"code"`
	Name              string                `json:"name"`
	ManufacturerPartNumber string           `json:"manufacturer_part_number"`
	Description       string                `json:"description"`
	CategoryID        *string               `json:"category_id"`
	Category          *ProductCategoryBasic `json:"category,omitempty"`
	BrandID           *string               `json:"brand_id"`
	Brand             *ProductBrandBasic    `json:"brand,omitempty"`
	SegmentID         *string               `json:"segment_id"`
	Segment           *ProductSegmentBasic  `json:"segment,omitempty"`
	TypeID            *string               `json:"type_id"`
	Type              *ProductTypeBasic     `json:"type,omitempty"`
	UomID             *string               `json:"uom_id"`
	Uom               *UnitOfMeasureBasic   `json:"uom,omitempty"`
	PurchaseUomID     *string               `json:"purchase_uom_id"`
	PurchaseUom       *UnitOfMeasureBasic   `json:"purchase_uom,omitempty"`
	PurchaseUomConversion float64           `json:"purchase_uom_conversion"`
	PackagingID       *string               `json:"packaging_id"`
	Packaging         *PackagingBasic       `json:"packaging,omitempty"`
	ProcurementTypeID *string               `json:"procurement_type_id"`
	ProcurementType   *ProcurementTypeBasic `json:"procurement_type,omitempty"`
	SupplierID        *string               `json:"supplier_id"`
	Supplier          *SupplierBasic        `json:"supplier,omitempty"`
	BusinessUnitID    *string               `json:"business_unit_id"`
	BusinessUnit      *BusinessUnitBasic    `json:"business_unit,omitempty"`
	CostPrice         float64               `json:"cost_price"`
	SellingPrice      float64               `json:"selling_price"`
	CurrentHpp        float64               `json:"current_hpp"`
	TaxType           string                `json:"tax_type"`
	IsTaxInclusive    bool                  `json:"is_tax_inclusive"`
	CurrentStock      float64               `json:"current_stock"`
	MinStock          float64               `json:"min_stock"`
	MaxStock          float64               `json:"max_stock"`
	LeadTimeDays      int                   `json:"lead_time_days"`
	Barcode           string                `json:"barcode"`
	Sku               string                `json:"sku"`
	Weight            float64               `json:"weight"`
	Volume            float64               `json:"volume"`
	Notes             string                `json:"notes"`
	Status            string                `json:"status"`
	IsApproved        bool                  `json:"is_approved"`
	CreatedBy         *string               `json:"created_by"`
	ApprovedBy        *string               `json:"approved_by"`
	ApprovedAt        *time.Time            `json:"approved_at"`
	IsActive          bool                  `json:"is_active"`
	CreatedAt         time.Time             `json:"created_at"`
	UpdatedAt         time.Time             `json:"updated_at"`
}
