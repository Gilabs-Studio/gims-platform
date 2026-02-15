package mapper

import (
	"strings"

	"github.com/gilabs/gims/api/internal/purchase/data/models"
	"github.com/gilabs/gims/api/internal/purchase/domain/dto"
)

func safePtrString(v *string) string {
	if v == nil {
		return ""
	}
	return strings.TrimSpace(*v)
}

type PurchaseOrderMapper struct{}

func NewPurchaseOrderMapper() *PurchaseOrderMapper {
	return &PurchaseOrderMapper{}
}

func (m *PurchaseOrderMapper) ToListResponse(po *models.PurchaseOrder) *dto.PurchaseOrderListResponse {
	if po == nil {
		return nil
	}

	supplierObj := any(po.Supplier)
	if strings.TrimSpace(po.SupplierNameSnapshot) != "" || strings.TrimSpace(po.SupplierCodeSnapshot) != "" {
		supplierObj = &struct {
			ID   string `json:"id"`
			Code string `json:"code"`
			Name string `json:"name"`
		}{
			ID:   safePtrString(po.SupplierID),
			Code: strings.TrimSpace(po.SupplierCodeSnapshot),
			Name: strings.TrimSpace(po.SupplierNameSnapshot),
		}
	}

	return &dto.PurchaseOrderListResponse{
		ID:          po.ID,
		Code:        po.Code,
		OrderDate:   po.OrderDate,
		DueDate:     po.DueDate,
		Status:      string(po.Status),
		TotalAmount: po.TotalAmount,
		Supplier:    supplierObj,
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

	supplierObj := any(po.Supplier)
	if strings.TrimSpace(po.SupplierNameSnapshot) != "" || strings.TrimSpace(po.SupplierCodeSnapshot) != "" {
		supplierObj = &struct {
			ID   string `json:"id"`
			Code string `json:"code"`
			Name string `json:"name"`
		}{
			ID:   safePtrString(po.SupplierID),
			Code: strings.TrimSpace(po.SupplierCodeSnapshot),
			Name: strings.TrimSpace(po.SupplierNameSnapshot),
		}
	}

	paymentTermsObj := any(po.PaymentTerms)
	if strings.TrimSpace(po.PaymentTermsNameSnapshot) != "" {
		paymentTermsObj = &struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		}{
			ID:   safePtrString(po.PaymentTermsID),
			Name: strings.TrimSpace(po.PaymentTermsNameSnapshot),
		}
	}

	businessUnitObj := any(po.BusinessUnit)
	if strings.TrimSpace(po.BusinessUnitNameSnapshot) != "" {
		businessUnitObj = &struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		}{
			ID:   safePtrString(po.BusinessUnitID),
			Name: strings.TrimSpace(po.BusinessUnitNameSnapshot),
		}
	}

	items := make([]dto.PurchaseOrderItemResponse, 0, len(po.Items))
	for _, it := range po.Items {
		productObj := any(it.Product)
		if strings.TrimSpace(it.ProductNameSnapshot) != "" || strings.TrimSpace(it.ProductCodeSnapshot) != "" {
			productObj = &struct {
				ID   string `json:"id"`
				Code string `json:"code"`
				Name string `json:"name"`
			}{
				ID:   strings.TrimSpace(it.ProductID),
				Code: strings.TrimSpace(it.ProductCodeSnapshot),
				Name: strings.TrimSpace(it.ProductNameSnapshot),
			}
		}
		items = append(items, dto.PurchaseOrderItemResponse{
			ID:        it.ID,
			ProductID: it.ProductID,
			Quantity:  it.Quantity,
			Price:     it.Price,
			Discount:  it.Discount,
			Subtotal:  it.Subtotal,
			Notes:     it.Notes,
			Product:   productObj,
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
		Supplier:             supplierObj,
		PaymentTerms:         paymentTermsObj,
		BusinessUnit:         businessUnitObj,
		Creator:              po.Creator,
		Items:                items,
		CreatedAt:            po.CreatedAt,
		UpdatedAt:            po.UpdatedAt,
	}
}
