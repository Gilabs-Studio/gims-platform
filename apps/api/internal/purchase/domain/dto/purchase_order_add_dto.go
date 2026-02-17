package dto

// Add-data DTOs for Purchase Order screens.

type PurchaseOrderAddProduct struct {
	ID         string  `json:"id"`
	Code       string  `json:"code"`
	Name       string  `json:"name"`
	Stock      float64 `json:"stock"`
	CurrentHpp float64 `json:"current_hpp"`
	SupplierID *string `json:"supplier_id"`
	IsActive   bool    `json:"is_active"`
	IsApproved bool    `json:"is_approved"`
}

type PurchaseOrderAddSupplier struct {
	ID       string                `json:"id"`
	Code     string                `json:"code"`
	Name     string                `json:"name"`
	Products []PurchaseOrderAddProduct `json:"products"`
}

type PurchaseOrderAddPaymentTerms struct {
	ID   string `json:"id"`
	Code string `json:"code"`
	Name string `json:"name"`
	Days int    `json:"days"`
}

type PurchaseOrderAddBusinessUnit struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type PurchaseOrderAddResponse struct {
	Suppliers     []PurchaseOrderAddSupplier     `json:"suppliers"`
	PaymentTerms  []PurchaseOrderAddPaymentTerms `json:"payment_terms"`
	BusinessUnits []PurchaseOrderAddBusinessUnit `json:"business_units"`
}
