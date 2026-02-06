package mapper

import (
	"time"

	"github.com/gilabs/gims/api/internal/purchase/data/models"
	"github.com/gilabs/gims/api/internal/purchase/domain/dto"
)

type GoodsReceiptMapper struct{}

func NewGoodsReceiptMapper() *GoodsReceiptMapper {
	return &GoodsReceiptMapper{}
}

func (m *GoodsReceiptMapper) ToListResponse(gr *models.GoodsReceipt) *dto.GoodsReceiptListResponse {
	if gr == nil {
		return nil
	}
	var receiptDate *string
	if gr.ReceiptDate != nil {
		s := gr.ReceiptDate.Format(time.RFC3339)
		receiptDate = &s
	}

	resp := &dto.GoodsReceiptListResponse{
		ID:        gr.ID,
		Code:      gr.Code,
		ReceiptDate: receiptDate,
		Notes:     gr.Notes,
		Status:    string(gr.Status),
		CreatedBy: gr.CreatedBy,
		CreatedAt: gr.CreatedAt,
	}

	if gr.PurchaseOrder != nil {
		resp.PurchaseOrder = &dto.GoodsReceiptPurchaseOrderMini{ID: gr.PurchaseOrder.ID, Code: gr.PurchaseOrder.Code}
	}
	if gr.Supplier != nil {
		resp.Supplier = &dto.GoodsReceiptSupplierMini{ID: gr.Supplier.ID, Name: gr.Supplier.Name}
	}

	return resp
}

func (m *GoodsReceiptMapper) ToListResponseList(items []*models.GoodsReceipt) []*dto.GoodsReceiptListResponse {
	res := make([]*dto.GoodsReceiptListResponse, 0, len(items))
	for _, it := range items {
		res = append(res, m.ToListResponse(it))
	}
	return res
}

func (m *GoodsReceiptMapper) ToDetailResponse(gr *models.GoodsReceipt) *dto.GoodsReceiptDetailResponse {
	if gr == nil {
		return nil
	}
	var receiptDate *string
	if gr.ReceiptDate != nil {
		s := gr.ReceiptDate.Format(time.RFC3339)
		receiptDate = &s
	}

	resp := &dto.GoodsReceiptDetailResponse{
		ID:        gr.ID,
		Code:      gr.Code,
		ReceiptDate: receiptDate,
		Notes:     gr.Notes,
		Status:    string(gr.Status),
		CreatedBy: gr.CreatedBy,
		CreatedAt: gr.CreatedAt,
		Items:     make([]dto.GoodsReceiptItemResponse, 0, len(gr.Items)),
	}

	if gr.PurchaseOrder != nil {
		resp.PurchaseOrder = &dto.GoodsReceiptPurchaseOrderDetail{ID: gr.PurchaseOrder.ID, Code: gr.PurchaseOrder.Code, Status: string(gr.PurchaseOrder.Status)}
	}
	if gr.Supplier != nil {
		resp.Supplier = &dto.GoodsReceiptSupplierMini{ID: gr.Supplier.ID, Name: gr.Supplier.Name}
	}

	for _, it := range gr.Items {
		item := dto.GoodsReceiptItemResponse{
			ID:                 it.ID,
			PurchaseOrderItemID: it.PurchaseOrderItemID,
			QuantityReceived:   it.QuantityReceived,
			Notes:              it.Notes,
		}
		if it.Product != nil {
			sku := (*string)(nil)
			if it.Product.Sku != "" {
				s := it.Product.Sku
				sku = &s
			}
			item.Product = &dto.ProductMini{ID: it.Product.ID, Name: it.Product.Name, SKU: sku}
		}
		resp.Items = append(resp.Items, item)
	}

	return resp
}
