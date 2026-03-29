package dto

import "time"

type StockOpnameStatus string

const (
	StockOpnameStatusDraft    StockOpnameStatus = "draft"
	StockOpnameStatusPending  StockOpnameStatus = "pending"
	StockOpnameStatusApproved StockOpnameStatus = "approved"
	StockOpnameStatusRejected StockOpnameStatus = "rejected"
	StockOpnameStatusPosted   StockOpnameStatus = "posted"
)

type CreateStockOpnameRequest struct {
	WarehouseID string `json:"warehouse_id" validate:"required,uuid"`
	Date        string `json:"date" validate:"required,datetime=2006-01-02"`
	Description string `json:"description"`
}

type UpdateStockOpnameRequest struct {
	Date        *string `json:"date" validate:"omitempty,datetime=2006-01-02"`
	Description *string `json:"description"`
}

type SaveStockOpnameItemsRequest struct {
	Items []StockOpnameItemRequest `json:"items" validate:"required,dive"`
}

type StockOpnameItemRequest struct {
	ProductID   string   `json:"product_id" validate:"required,uuid"`
	SystemQty   float64  `json:"system_qty"`
	PhysicalQty *float64 `json:"physical_qty"`
	Notes       string   `json:"notes"`
}

type StockOpnameResponse struct {
	ID               string            `json:"id"`
	OpnameNumber     string            `json:"opname_number"`
	WarehouseID      string            `json:"warehouse_id"`
	WarehouseName    string            `json:"warehouse_name,omitempty"`
	Date             time.Time         `json:"date"`
	Status           StockOpnameStatus `json:"status"`
	Description      string            `json:"description"`
	TotalItems       int               `json:"total_items"`
	TotalVarianceQty float64           `json:"total_variance_qty"`
	CreatedBy        *string           `json:"created_by"`
	CreatedByName    string            `json:"created_by_name,omitempty"`
	CreatedAt        time.Time         `json:"created_at"`
	UpdatedAt        time.Time         `json:"updated_at"`
}

type StockOpnameItemResponse struct {
	ID            string   `json:"id"`
	StockOpnameID string   `json:"stock_opname_id"`
	ProductID     string   `json:"product_id"`
	ProductName   string   `json:"product_name,omitempty"`
	ProductCode   string   `json:"product_code,omitempty"`
	SystemQty     float64  `json:"system_qty"`
	PhysicalQty   *float64 `json:"physical_qty"`
	VarianceQty   float64  `json:"variance_qty"`
	UnitCost      float64  `json:"unit_cost"`
	Notes         string   `json:"notes"`
}

type ListStockOpnamesRequest struct {
	Page        int    `query:"page"`
	PerPage     int    `query:"per_page"`
	Search      string `query:"search"`
	WarehouseID string `query:"warehouse_id"`
	Status      string `query:"status"`
	StartDate   string `query:"start_date"`
	EndDate     string `query:"end_date"`
}

type UpdateStockOpnameStatusRequest struct {
	Status string `json:"status" validate:"required"`
}
