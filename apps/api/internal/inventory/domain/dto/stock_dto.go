package dto

import "time"

// InventoryStockItem represents the aggregated stock view for the list
type InventoryStockItem struct {
	ProductID         string  `json:"product_id"`
	ProductCode       string  `json:"product_code"`
	ProductName       string  `json:"product_name"`
	ProductImageURL   *string `json:"product_image_url"`
	ProductCategory   *string `json:"product_category"`
	ProductBrand      *string `json:"product_brand"`
	
	WarehouseID       string  `json:"warehouse_id"`
	WarehouseName     string  `json:"warehouse_name"`
	
	OnHand            float64 `json:"on_hand"`
	Reserved          float64 `json:"reserved"`
	Available         float64 `json:"available"`
	
	MinStock          float64 `json:"min_stock"`
	MaxStock          float64 `json:"max_stock"`
	UomName           string  `json:"uom_name"`
	
	Status            string  `json:"status"` // "ok", "low", "overstock", "out_of_stock"
}

type GetInventoryListRequest struct {
	Page        int    `form:"page"`
	PerPage     int    `form:"per_page"`
	Search      string `form:"search"`
	WarehouseID string `form:"warehouse_id"`
	LowStock    bool   `form:"low_stock"`
}

type GetInventoryListResponse struct {
	Data []InventoryStockItem `json:"data"`
	Meta PaginationMeta       `json:"meta"`
}

type PaginationMeta struct {
	Total       int64 `json:"total"`
	Page        int   `json:"page"`
	PerPage     int   `json:"per_page"`
	TotalPages  int   `json:"total_pages"`
	HasNext     bool  `json:"has_next"`
	HasPrev     bool  `json:"has_prev"`
}

type InventoryBatchItem struct {
	ID               string     `json:"id"`
	BatchNumber      string     `json:"batch_number"`
	ExpiryDate       *time.Time `json:"expiry_date"`
	CurrentQuantity  float64    `json:"current_quantity"`
	ReservedQuantity float64    `json:"reserved_quantity"`
	Available        float64    `json:"available"`
}

// Tree View DTOs

type GetInventoryTreeWarehousesResponse struct {
	ID      string       `json:"id"`
	Name    string       `json:"name"`
	Summary StockSummary `json:"summary"`
}

type StockSummary struct {
	TotalItems int `json:"total_items"`
	Ok         int `json:"ok"`
	Low        int `json:"low"`
	OutOfStock int `json:"out_of_stock"`
	Overstock  int `json:"overstock"`
}

type GetInventoryTreeProductsRequest struct {
	WarehouseID string `form:"warehouse_id" binding:"required"`
	Page        int    `form:"page"`
	PerPage     int    `form:"per_page"`
	Search      string `form:"search"`
}

type GetInventoryTreeProductsResponse struct {
	Data []InventoryStockItem `json:"data"`
	Meta PaginationMeta       `json:"meta"`
}

type GetInventoryTreeBatchesRequest struct {
	WarehouseID string `form:"warehouse_id" binding:"required"`
	ProductID   string `form:"product_id" binding:"required"`
}

type GetInventoryTreeBatchesResponse struct {
	Data []InventoryBatchItem `json:"data"`
}
