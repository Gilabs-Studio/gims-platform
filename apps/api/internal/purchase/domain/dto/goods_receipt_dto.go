package dto

import "time"

type GoodsReceiptListResponse struct {
	ID            string  `json:"id"`
	Code          string  `json:"code"`
	PurchaseOrder *GoodsReceiptPurchaseOrderMini `json:"purchase_order,omitempty"`
	Supplier      *GoodsReceiptSupplierMini `json:"supplier,omitempty"`
	ReceiptDate   *string `json:"receipt_date,omitempty"`
	Notes         *string `json:"notes,omitempty"`
	Status        string  `json:"status"`
	CreatedBy     string  `json:"created_by"`
	CreatedAt     time.Time `json:"created_at"`
}

type GoodsReceiptPurchaseOrderMini struct {
	ID   string `json:"id"`
	Code string `json:"code"`
}

type GoodsReceiptSupplierMini struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type GoodsReceiptDetailResponse struct {
	ID            string  `json:"id"`
	Code          string  `json:"code"`
	PurchaseOrder *GoodsReceiptPurchaseOrderDetail `json:"purchase_order,omitempty"`
	Supplier      *GoodsReceiptSupplierMini `json:"supplier,omitempty"`
	ReceiptDate   *string `json:"receipt_date,omitempty"`
	Notes         *string `json:"notes,omitempty"`
	Status        string  `json:"status"`
	CreatedBy     string  `json:"created_by"`
	CreatedAt     time.Time `json:"created_at"`
	Items         []GoodsReceiptItemResponse `json:"items"`
}

type GoodsReceiptPurchaseOrderDetail struct {
	ID   string `json:"id"`
	Code string `json:"code"`
	Status string `json:"status"`
}

type GoodsReceiptItemResponse struct {
	ID                 string  `json:"id"`
	PurchaseOrderItemID string `json:"purchase_order_item_id"`
	Product            *ProductMini `json:"product,omitempty"`
	QuantityReceived   float64 `json:"quantity_received"`
	Notes              *string `json:"notes,omitempty"`
}

type ProductMini struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	SKU  *string `json:"sku,omitempty"`
}
