package mapper

import (
	"github.com/gilabs/gims/api/internal/purchase/data/models"
	"github.com/gilabs/gims/api/internal/purchase/domain/dto"
)

type PurchaseOrderMapper struct{}

func NewPurchaseOrderMapper() *PurchaseOrderMapper {
	return &PurchaseOrderMapper{}
}

func (m *PurchaseOrderMapper) ToListResponse(po *models.PurchaseOrder) *dto.PurchaseOrderListResponse {
	if po == nil {
		return nil
	}
	return &dto.PurchaseOrderListResponse{
		ID:          po.ID,
		Code:        po.Code,
		OrderDate:   po.OrderDate,
		DueDate:     po.DueDate,
		Status:      string(po.Status),
		TotalAmount: po.TotalAmount,
		Supplier:    po.Supplier,
		CreatedAt:   po.CreatedAt,
	}
}

func (m *PurchaseOrderMapper) ToListResponseList(items []*models.PurchaseOrder) []*dto.PurchaseOrderListResponse {
	out := make([]*dto.PurchaseOrderListResponse, 0, len(items))
	for _, it := range items {
		out = append(out, m.ToListResponse(it))
	}
	return out
}

func (m *PurchaseOrderMapper) ToDetailResponse(po *models.PurchaseOrder) *dto.PurchaseOrderDetailResponse {
	if po == nil {
		return nil
	}
	items := make([]dto.PurchaseOrderItemResponse, 0, len(po.Items))
	for _, it := range po.Items {
		items = append(items, dto.PurchaseOrderItemResponse{
			ID:        it.ID,
			ProductID: it.ProductID,
			Quantity:  it.Quantity,
			Price:     it.Price,
			Discount:  it.Discount,
			Subtotal:  it.Subtotal,
			Notes:     it.Notes,
			Product:   it.Product,
		})
	}

	return &dto.PurchaseOrderDetailResponse{
		ID:                   po.ID,
		Code:                 po.Code,
		SupplierID:           po.SupplierID,
		PaymentTermsID:       po.PaymentTermsID,
		BusinessUnitID:       po.BusinessUnitID,
		CreatedBy:            po.CreatedBy,
		PurchaseRequisitionID: po.PurchaseRequisitionID,
		SalesOrderID:         po.SalesOrderID,
		OrderDate:            po.OrderDate,
		DueDate:              po.DueDate,
		RevisionComment:      po.RevisionComment,
		Notes:                po.Notes,
		Status:               string(po.Status),
		TaxRate:              po.TaxRate,
		TaxAmount:            po.TaxAmount,
		DeliveryCost:         po.DeliveryCost,
		OtherCost:            po.OtherCost,
		SubTotal:             po.SubTotal,
		TotalAmount:          po.TotalAmount,
		Supplier:             po.Supplier,
		PaymentTerms:         po.PaymentTerms,
		BusinessUnit:         po.BusinessUnit,
		Creator:              po.Creator,
		Items:                items,
		CreatedAt:            po.CreatedAt,
		UpdatedAt:            po.UpdatedAt,
	}
}
