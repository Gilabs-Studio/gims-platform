package dto

type GetStockMovementsRequest struct {
	Page        int    `json:"page" form:"page"`
	PerPage     int    `json:"per_page" form:"per_page"`
	Search      string `json:"search" form:"search"`
	WarehouseID string `json:"warehouse_id" form:"warehouse_id"`
	ProductID   string `json:"product_id" form:"product_id"`
	Type        string `json:"type" form:"type"`
	StartDate   string `json:"start_date" form:"start_date"`
	EndDate     string `json:"end_date" form:"end_date"`
}

// StockMovementRequest represents the request to create a stock movement
type StockMovementRequest struct {
	InventoryBatchID string  `json:"inventory_batch_id" binding:"required,uuid"`
	ProductID        string  `json:"product_id" binding:"required,uuid"`
	WarehouseID      string  `json:"warehouse_id" binding:"required,uuid"`
	Type             string  `json:"type" binding:"required,oneof=IN OUT ADJUST TRANSFER"`
	Quantity         float64 `json:"quantity" binding:"required,gt=0"`
	ReferenceType    string  `json:"reference_type" binding:"required,oneof=PO DO OPNAME TRANSFER"`
	ReferenceID      string  `json:"reference_id" binding:"required,uuid"`
	ReferenceNumber  string  `json:"reference_number" binding:"required"`
	Description      string  `json:"description"`
	CreatedBy        *string `json:"created_by"`
}

