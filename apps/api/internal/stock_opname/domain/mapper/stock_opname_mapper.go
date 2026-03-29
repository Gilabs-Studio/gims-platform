package mapper

import (
	"time"

	"github.com/gilabs/gims/api/internal/stock_opname/data/models"
	"github.com/gilabs/gims/api/internal/stock_opname/domain/dto"
)

func ToStockOpnameResponse(m *models.StockOpname) dto.StockOpnameResponse {
	return dto.StockOpnameResponse{
		ID:               m.ID,
		OpnameNumber:     m.OpnameNumber,
		WarehouseID:      m.WarehouseID,
		WarehouseName:    getWarehouseName(m),
		Date:             m.Date,
		Status:           dto.StockOpnameStatus(m.Status),
		Description:      m.Description,
		TotalItems:       m.TotalItems,
		TotalVarianceQty: m.TotalVarianceQty,
		CreatedBy:        m.CreatedBy,
		CreatedAt:        m.CreatedAt,
		UpdatedAt:        m.UpdatedAt,
	}
}

func getWarehouseName(m *models.StockOpname) string {
	if m.Warehouse != nil {
		return m.Warehouse.Name
	}
	return ""
}

func ToStockOpnameItemResponse(m *models.StockOpnameItem) dto.StockOpnameItemResponse {
	return dto.StockOpnameItemResponse{
		ID:            m.ID,
		StockOpnameID: m.StockOpnameID,
		ProductID:     m.ProductID,
		ProductName:   m.Product.Name,
		ProductCode:   m.Product.Code,
		SystemQty:     m.SystemQty,
		PhysicalQty:   m.PhysicalQty,
		VarianceQty:   m.VarianceQty,
		UnitCost:      m.Product.CurrentHpp,
		Notes:         m.Notes,
	}
}

func getProductName(m *models.StockOpnameItem) string {
	if m.Product != nil {
		return m.Product.Name
	}
	return ""
}

func getProductCode(m *models.StockOpnameItem) string {
	if m.Product != nil {
		return m.Product.Code
	}
	return ""
}


func ToStockOpnameModel(req *dto.CreateStockOpnameRequest, opnameNumber string, createdBy *string) (*models.StockOpname, error) {
    date, err := time.Parse("2006-01-02", req.Date)
    if err != nil {
        return nil, err
    }
    return &models.StockOpname{
        OpnameNumber: opnameNumber,
        WarehouseID:  req.WarehouseID,
        Date:         date,
        Description:  req.Description,
        Status:       models.StockOpnameStatusDraft,
        CreatedBy:    createdBy,
        UpdatedBy:    createdBy,
    }, nil
}
