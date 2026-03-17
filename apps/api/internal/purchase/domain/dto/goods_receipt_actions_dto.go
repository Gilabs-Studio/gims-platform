package dto

type CreateGoodsReceiptRequest struct {
	PurchaseOrderID string                          `json:"purchase_order_id" binding:"required,uuid"`
	Notes           *string                         `json:"notes,omitempty"`
	ProofImageURL   *string                         `json:"proof_image_url,omitempty" binding:"omitempty,max=500"`
	Items           []CreateGoodsReceiptItemRequest `json:"items" binding:"required,dive"`
}

type CreateGoodsReceiptItemRequest struct {
	PurchaseOrderItemID string  `json:"purchase_order_item_id" binding:"required,uuid"`
	ProductID           string  `json:"product_id" binding:"required,uuid"`
	QuantityReceived    float64 `json:"quantity_received" binding:"required,gte=0"`
	Notes               *string `json:"notes,omitempty"`
}

type UpdateGoodsReceiptRequest struct {
	Notes         *string                         `json:"notes,omitempty"`
	ProofImageURL *string                         `json:"proof_image_url,omitempty" binding:"omitempty,max=500"`
	Items         []CreateGoodsReceiptItemRequest `json:"items" binding:"required,dive"`
}
