package mapper

import (
	"strings"

	"github.com/gilabs/gims/api/internal/purchase/data/models"
	"github.com/gilabs/gims/api/internal/purchase/domain/dto"
)

type SupplierInvoiceMapper struct{}

func NewSupplierInvoiceMapper() *SupplierInvoiceMapper {
	return &SupplierInvoiceMapper{}
}

func (m *SupplierInvoiceMapper) ToListResponse(si *models.SupplierInvoice) *dto.SupplierInvoiceListResponse {
	if si == nil {
		return nil
	}

	var poMini *dto.SupplierInvoicePurchaseOrderMini
	if si.PurchaseOrder != nil {
		poMini = &dto.SupplierInvoicePurchaseOrderMini{ID: si.PurchaseOrder.ID, Code: si.PurchaseOrder.Code}
	}

	var ptMini *dto.SupplierInvoicePaymentTermsMini
	if strings.TrimSpace(si.PaymentTermsNameSnapshot) != "" || si.PaymentTermsDaysSnapshot != nil {
		id := ""
		if si.PaymentTermsID != nil {
			id = strings.TrimSpace(*si.PaymentTermsID)
		}
		ptMini = &dto.SupplierInvoicePaymentTermsMini{ID: id, Name: strings.TrimSpace(si.PaymentTermsNameSnapshot), Days: si.PaymentTermsDaysSnapshot}
	} else if si.PaymentTerms != nil {
		days := si.PaymentTerms.Days
		ptMini = &dto.SupplierInvoicePaymentTermsMini{ID: si.PaymentTerms.ID, Name: si.PaymentTerms.Name, Days: &days}
	}

	var dpMini *dto.SupplierInvoiceAddDownPaymentMini
	if si.DownPaymentInvoice != nil {
		dpMini = &dto.SupplierInvoiceAddDownPaymentMini{
			ID:            si.DownPaymentInvoice.ID,
			Code:          si.DownPaymentInvoice.Code,
			InvoiceNumber: si.DownPaymentInvoice.InvoiceNumber,
			InvoiceDate:   si.DownPaymentInvoice.InvoiceDate,
			DueDate:       si.DownPaymentInvoice.DueDate,
			Amount:        si.DownPaymentInvoice.Amount,
			Status:        string(si.DownPaymentInvoice.Status),
		}
		if si.DownPaymentInvoice.Notes != nil {
			dpMini.Notes = si.DownPaymentInvoice.Notes
		}
	}

	return &dto.SupplierInvoiceListResponse{
		ID:                 si.ID,
		PurchaseOrder:      poMini,
		PaymentTerms:       ptMini,
		Type:               string(si.Type),
		Code:               si.Code,
		InvoiceNumber:      si.InvoiceNumber,
		InvoiceDate:        si.InvoiceDate,
		DueDate:            si.DueDate,
		TaxRate:            si.TaxRate,
		TaxAmount:          si.TaxAmount,
		DeliveryCost:       si.DeliveryCost,
		OtherCost:          si.OtherCost,
		SubTotal:           si.SubTotal,
		Amount:             si.Amount,
		PaidAmount:         si.PaidAmount,
		RemainingAmount:    si.RemainingAmount,
		DownPaymentAmount:  si.DownPaymentAmount,
		DownPaymentInvoice: dpMini,
		Status:             string(si.Status),
		Notes:              si.Notes,
		CreatedAt:          si.CreatedAt,
		UpdatedAt:          si.UpdatedAt,
	}
}

func (m *SupplierInvoiceMapper) ToListResponseList(items []*models.SupplierInvoice) []*dto.SupplierInvoiceListResponse {
	out := make([]*dto.SupplierInvoiceListResponse, 0, len(items))
	for _, it := range items {
		out = append(out, m.ToListResponse(it))
	}
	return out
}

func (m *SupplierInvoiceMapper) ToDetailResponse(si *models.SupplierInvoice) *dto.SupplierInvoiceDetailResponse {
	if si == nil {
		return nil
	}

	var poMini *dto.SupplierInvoicePurchaseOrderMini
	if si.PurchaseOrder != nil {
		poMini = &dto.SupplierInvoicePurchaseOrderMini{ID: si.PurchaseOrder.ID, Code: si.PurchaseOrder.Code}
	}

	var ptMini *dto.SupplierInvoicePaymentTermsMini
	if strings.TrimSpace(si.PaymentTermsNameSnapshot) != "" || si.PaymentTermsDaysSnapshot != nil {
		id := ""
		if si.PaymentTermsID != nil {
			id = strings.TrimSpace(*si.PaymentTermsID)
		}
		ptMini = &dto.SupplierInvoicePaymentTermsMini{ID: id, Name: strings.TrimSpace(si.PaymentTermsNameSnapshot), Days: si.PaymentTermsDaysSnapshot}
	} else if si.PaymentTerms != nil {
		days := si.PaymentTerms.Days
		ptMini = &dto.SupplierInvoicePaymentTermsMini{ID: si.PaymentTerms.ID, Name: si.PaymentTerms.Name, Days: &days}
	}

	var dpMini *dto.SupplierInvoiceAddDownPaymentMini
	if si.DownPaymentInvoice != nil {
		dpMini = &dto.SupplierInvoiceAddDownPaymentMini{
			ID:            si.DownPaymentInvoice.ID,
			Code:          si.DownPaymentInvoice.Code,
			InvoiceNumber: si.DownPaymentInvoice.InvoiceNumber,
			InvoiceDate:   si.DownPaymentInvoice.InvoiceDate,
			DueDate:       si.DownPaymentInvoice.DueDate,
			Amount:        si.DownPaymentInvoice.Amount,
			Status:        string(si.DownPaymentInvoice.Status),
		}
		if si.DownPaymentInvoice.Notes != nil {
			dpMini.Notes = si.DownPaymentInvoice.Notes
		}
	}

	items := make([]dto.SupplierInvoiceItemResponse, 0, len(si.Items))
	for _, it := range si.Items {
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
		items = append(items, dto.SupplierInvoiceItemResponse{
			ID:                  it.ID,
			SupplierInvoiceID:   it.SupplierInvoiceID,
			ProductID:           it.ProductID,
			Product:             productObj,
			Quantity:            it.Quantity,
			Price:               it.Price,
			Discount:            it.Discount,
			SubTotal:            it.SubTotal,
			PurchaseOrderItemID: it.PurchaseOrderItemID,
			CreatedAt:           it.CreatedAt,
			UpdatedAt:           it.UpdatedAt,
		})
	}

	return &dto.SupplierInvoiceDetailResponse{
		ID:                 si.ID,
		PurchaseOrder:      poMini,
		PaymentTerms:       ptMini,
		Type:               string(si.Type),
		Code:               si.Code,
		InvoiceNumber:      si.InvoiceNumber,
		InvoiceDate:        si.InvoiceDate,
		DueDate:            si.DueDate,
		TaxRate:            si.TaxRate,
		TaxAmount:          si.TaxAmount,
		DeliveryCost:       si.DeliveryCost,
		OtherCost:          si.OtherCost,
		SubTotal:           si.SubTotal,
		Amount:             si.Amount,
		PaidAmount:         si.PaidAmount,
		RemainingAmount:    si.RemainingAmount,
		DownPaymentAmount:  si.DownPaymentAmount,
		DownPaymentInvoice: dpMini,
		Status:             string(si.Status),
		Notes:              si.Notes,
		Items:              items,
		CreatedAt:          si.CreatedAt,
		UpdatedAt:          si.UpdatedAt,
	}
}

func (m *SupplierInvoiceMapper) ToDownPaymentListResponse(si *models.SupplierInvoice) *dto.SupplierInvoiceDownPaymentListResponse {
	if si == nil {
		return nil
	}
	var poMini *dto.SupplierInvoicePurchaseOrderMini
	if si.PurchaseOrder != nil {
		poMini = &dto.SupplierInvoicePurchaseOrderMini{ID: si.PurchaseOrder.ID, Code: si.PurchaseOrder.Code}
	}
	regulars := []dto.SupplierInvoiceDownPaymentRegularInvoiceMini{}
	for _, reg := range si.RegularInvoices {
		regulars = append(regulars, dto.SupplierInvoiceDownPaymentRegularInvoiceMini{
			ID:   reg.ID,
			Code: reg.Code,
		})
	}
	return &dto.SupplierInvoiceDownPaymentListResponse{
		ID:              si.ID,
		PurchaseOrder:   poMini,
		Code:            si.Code,
		InvoiceNumber:   si.InvoiceNumber,
		InvoiceDate:     si.InvoiceDate,
		DueDate:         si.DueDate,
		Amount:          si.Amount,
		Status:          string(si.Status),
		Notes:           si.Notes,
		RegularInvoices: regulars,
		CreatedAt:       si.CreatedAt,
		UpdatedAt:       si.UpdatedAt,
	}
}

func (m *SupplierInvoiceMapper) ToDownPaymentListResponseList(items []*models.SupplierInvoice) []*dto.SupplierInvoiceDownPaymentListResponse {
	out := make([]*dto.SupplierInvoiceDownPaymentListResponse, 0, len(items))
	for _, it := range items {
		out = append(out, m.ToDownPaymentListResponse(it))
	}
	return out
}

func (m *SupplierInvoiceMapper) ToDownPaymentDetailResponse(si *models.SupplierInvoice) *dto.SupplierInvoiceDownPaymentDetailResponse {
	if si == nil {
		return nil
	}
	var poMini *dto.SupplierInvoicePurchaseOrderMini
	if si.PurchaseOrder != nil {
		poMini = &dto.SupplierInvoicePurchaseOrderMini{ID: si.PurchaseOrder.ID, Code: si.PurchaseOrder.Code}
	}
	regulars := []dto.SupplierInvoiceDownPaymentRegularInvoiceMini{}
	for _, reg := range si.RegularInvoices {
		regulars = append(regulars, dto.SupplierInvoiceDownPaymentRegularInvoiceMini{
			ID:   reg.ID,
			Code: reg.Code,
		})
	}
	return &dto.SupplierInvoiceDownPaymentDetailResponse{
		ID:              si.ID,
		PurchaseOrder:   poMini,
		Code:            si.Code,
		InvoiceNumber:   si.InvoiceNumber,
		InvoiceDate:     si.InvoiceDate,
		DueDate:         si.DueDate,
		Amount:          si.Amount,
		Status:          string(si.Status),
		Notes:           si.Notes,
		RegularInvoices: regulars,
		CreatedAt:       si.CreatedAt,
		UpdatedAt:       si.UpdatedAt,
	}
}
