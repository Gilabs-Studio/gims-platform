package mapper

import (
	"github.com/gilabs/gims/api/internal/purchase/data/models"
	"github.com/gilabs/gims/api/internal/purchase/domain/dto"
)

type PurchasePaymentMapper struct{}

func NewPurchasePaymentMapper() *PurchasePaymentMapper {
	return &PurchasePaymentMapper{}
}

func (m *PurchasePaymentMapper) toInvoiceSummary(si *models.SupplierInvoice) *dto.PurchasePaymentInvoiceSummary {
	if si == nil {
		return nil
	}
	return &dto.PurchasePaymentInvoiceSummary{
		ID:            si.ID,
		Code:          si.Code,
		InvoiceNumber: si.InvoiceNumber,
		InvoiceDate:   si.InvoiceDate,
		DueDate:       si.DueDate,
		TaxRate:       si.TaxRate,
		TaxAmount:     si.TaxAmount,
		Amount:        si.Amount,
		Status:        string(si.Status),
		Notes:         si.Notes,
	}
}

func (m *PurchasePaymentMapper) ToListResponse(p *models.PurchasePayment) *dto.PurchasePaymentListResponse {
	if p == nil {
		return nil
	}
	var bankSummary *dto.PurchasePaymentBankAccountSummary
	if p.BankAccount != nil {
		bankSummary = &dto.PurchasePaymentBankAccountSummary{
			ID:            p.BankAccount.ID,
			Name:          p.BankAccount.Name,
			AccountNumber: p.BankAccount.AccountNumber,
			AccountHolder: p.BankAccount.AccountHolder,
			Currency:      p.BankAccount.Currency,
		}
	}
	return &dto.PurchasePaymentListResponse{
		ID:          p.ID,
		Invoice:     m.toInvoiceSummary(p.SupplierInvoice),
		BankAccount: bankSummary,
		PaymentDate: p.PaymentDate,
		Amount:      p.Amount,
		Method:      string(p.Method),
		Status:      string(p.Status),
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
	}
}

func (m *PurchasePaymentMapper) ToListResponseList(items []*models.PurchasePayment) []*dto.PurchasePaymentListResponse {
	out := make([]*dto.PurchasePaymentListResponse, 0, len(items))
	for _, it := range items {
		out = append(out, m.ToListResponse(it))
	}
	return out
}

func (m *PurchasePaymentMapper) ToDetailResponse(p *models.PurchasePayment) *dto.PurchasePaymentDetailResponse {
	if p == nil {
		return nil
	}
	base := m.ToListResponse(p)
	return &dto.PurchasePaymentDetailResponse{
		PurchasePaymentListResponse: *base,
		ReferenceNumber:             p.ReferenceNumber,
		Notes:                       p.Notes,
	}
}
