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
