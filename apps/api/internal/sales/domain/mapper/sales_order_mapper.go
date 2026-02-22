package mapper

import (
	"time"

	salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
)

// ToSalesOrderResponse converts a SalesOrder model to response DTO
func ToSalesOrderResponse(m *salesModels.SalesOrder) dto.SalesOrderResponse {
	response := dto.SalesOrderResponse{
		ID:                  m.ID,
		Code:                m.Code,
		OrderDate:           m.OrderDate.Format("2006-01-02"),
		Subtotal:            m.Subtotal,
		DiscountAmount:      m.DiscountAmount,
		TaxRate:             m.TaxRate,
		TaxAmount:           m.TaxAmount,
		DeliveryCost:        m.DeliveryCost,
		OtherCost:           m.OtherCost,
		TotalAmount:         m.TotalAmount,
		ReservedStock:       m.ReservedStock,
		CustomerName:        m.CustomerName,
		CustomerContact:     m.CustomerContact,
		CustomerPhone:       m.CustomerPhone,
		CustomerEmail:       m.CustomerEmail,
		Status:              string(m.Status),
		Notes:               m.Notes,
		CreatedAt:           m.CreatedAt.Format(time.RFC3339),
		UpdatedAt:           m.UpdatedAt.Format(time.RFC3339),
	}

	if m.SalesQuotationID != nil {
		response.SalesQuotationID = m.SalesQuotationID
		if m.SalesQuotation != nil {
			quotationResp := ToSalesQuotationResponse(m.SalesQuotation)
			response.SalesQuotation = &quotationResp
		}
	}

	if m.PaymentTermsID != nil {
		response.PaymentTermsID = m.PaymentTermsID
		if m.PaymentTerms != nil {
			response.PaymentTerms = &dto.PaymentTermsResponse{
				ID:          m.PaymentTerms.ID,
				Code:        m.PaymentTerms.Code,
				Name:        m.PaymentTerms.Name,
				Description: m.PaymentTerms.Description,
				Days:        m.PaymentTerms.Days,
			}
		}
	}

	if m.SalesRepID != nil {
		response.SalesRepID = m.SalesRepID
		if m.SalesRep != nil {
			response.SalesRep = &dto.EmployeeResponse{
				ID:           m.SalesRep.ID,
				EmployeeCode: m.SalesRep.EmployeeCode,
				Name:         m.SalesRep.Name,
				Email:        m.SalesRep.Email,
				Phone:        m.SalesRep.Phone,
			}
		}
	}

	if m.BusinessUnitID != nil {
		response.BusinessUnitID = m.BusinessUnitID
		if m.BusinessUnit != nil {
			response.BusinessUnit = &dto.BusinessUnitResponse{
				ID:          m.BusinessUnit.ID,
				Name:        m.BusinessUnit.Name,
				Description: m.BusinessUnit.Description,
			}
		}
	}

	if m.BusinessTypeID != nil {
		response.BusinessTypeID = m.BusinessTypeID
		if m.BusinessType != nil {
			response.BusinessType = &dto.BusinessTypeResponse{
				ID:          m.BusinessType.ID,
				Name:        m.BusinessType.Name,
				Description: m.BusinessType.Description,
			}
		}
	}

	if m.DeliveryAreaID != nil {
		response.DeliveryAreaID = m.DeliveryAreaID
		if m.DeliveryArea != nil {
			response.DeliveryArea = &dto.AreaResponse{
				ID:          m.DeliveryArea.ID,
				Name:        m.DeliveryArea.Name,
				Description: m.DeliveryArea.Description,
			}
		}
	}

	if m.CreatedBy != nil {
		response.CreatedBy = m.CreatedBy
	}

	if m.ConfirmedBy != nil {
		response.ConfirmedBy = m.ConfirmedBy
		if m.ConfirmedAt != nil {
			confirmedAt := m.ConfirmedAt.Format(time.RFC3339)
			response.ConfirmedAt = &confirmedAt
		}
	}

	if m.CancelledBy != nil {
		response.CancelledBy = m.CancelledBy
		if m.CancelledAt != nil {
			cancelledAt := m.CancelledAt.Format(time.RFC3339)
			response.CancelledAt = &cancelledAt
		}
		response.CancellationReason = m.CancellationReason
	}

	// Map items
	if len(m.Items) > 0 {
		response.Items = make([]dto.SalesOrderItemResponse, len(m.Items))
		for i, item := range m.Items {
			response.Items[i] = ToSalesOrderItemResponse(&item)
		}
	}

	// Map delivery orders summary
	if len(m.DeliveryOrders) > 0 {
		response.DeliveryOrders = make([]dto.DeliveryOrderSummary, len(m.DeliveryOrders))
		for i, do := range m.DeliveryOrders {
			deliveryDate := ""
			if !do.DeliveryDate.IsZero() {
				deliveryDate = do.DeliveryDate.Format("2006-01-02")
			}
			response.DeliveryOrders[i] = dto.DeliveryOrderSummary{
				ID:                do.ID,
				Code:              do.Code,
				Status:            string(do.Status),
				DeliveryDate:      deliveryDate,
				IsPartialDelivery: do.IsPartialDelivery,
			}
		}
	}

	// Map customer invoices summary
	if len(m.CustomerInvoices) > 0 {
		response.CustomerInvoices = make([]dto.CustomerInvoiceSummary, len(m.CustomerInvoices))
		for i, inv := range m.CustomerInvoices {
			invoiceDate := ""
			if !inv.InvoiceDate.IsZero() {
				invoiceDate = inv.InvoiceDate.Format("2006-01-02")
			}
			dueDate := ""
			if inv.DueDate != nil && !inv.DueDate.IsZero() {
				dueDate = inv.DueDate.Format("2006-01-02")
			}
			response.CustomerInvoices[i] = dto.CustomerInvoiceSummary{
				ID:          inv.ID,
				Code:        inv.Code,
				Status:      string(inv.Status),
				InvoiceDate: invoiceDate,
				DueDate:     dueDate,
				Amount:      inv.Amount,
				PaidAmount:  inv.PaidAmount,
			}
		}
	}

	return response
}

// ToSalesOrderItemResponse converts a SalesOrderItem model to response DTO
func ToSalesOrderItemResponse(m *salesModels.SalesOrderItem) dto.SalesOrderItemResponse {
	response := dto.SalesOrderItemResponse{
		ID:               m.ID,
		SalesOrderID:     m.SalesOrderID,
		ProductID:        m.ProductID,
		Quantity:         m.Quantity,
		Price:            m.Price,
		Discount:         m.Discount,
		Subtotal:         m.Subtotal,
		ReservedQuantity: m.ReservedQuantity,
		DeliveredQuantity: m.DeliveredQuantity,
		CreatedAt:        m.CreatedAt.Format(time.RFC3339),
		UpdatedAt:        m.UpdatedAt.Format(time.RFC3339),
	}

	if m.Product != nil {
		response.Product = &dto.ProductResponse{
			ID:           m.Product.ID,
			Code:         m.Product.Code,
			Name:         m.Product.Name,
			SellingPrice: m.Product.SellingPrice,
			ImageURL:     m.Product.ImageURL,
		}
	} else if m.ProductCode != "" || m.ProductName != "" {
		// Fallback to snapshot if product relation is missing
		response.Product = &dto.ProductResponse{
			ID:   m.ProductID,
			Code: m.ProductCode,
			Name: m.ProductName,
		}
	}

	// Override with snapshot data if available
	if response.Product != nil {
		if m.ProductCode != "" {
			response.Product.Code = m.ProductCode
		}
		if m.ProductName != "" {
			response.Product.Name = m.ProductName
		}
	}

	return response
}

// ToSalesOrderModel converts a CreateSalesOrderRequest to SalesOrder model
func ToSalesOrderModel(req *dto.CreateSalesOrderRequest, code string, createdBy *string) (*salesModels.SalesOrder, error) {
	orderDate, err := time.Parse("2006-01-02", req.OrderDate)
	if err != nil {
		return nil, err
	}

	order := &salesModels.SalesOrder{
		Code:            code,
		OrderDate:       orderDate,
		SalesQuotationID: req.SalesQuotationID,
		PaymentTermsID:  req.PaymentTermsID,
		SalesRepID:      req.SalesRepID,
		BusinessUnitID:  req.BusinessUnitID,
		BusinessTypeID:  req.BusinessTypeID,
		DeliveryAreaID:  req.DeliveryAreaID,
		CustomerName:    req.CustomerName,
		CustomerContact: req.CustomerContact,
		CustomerPhone:   req.CustomerPhone,
		CustomerEmail:   req.CustomerEmail,
		TaxRate:         req.TaxRate,
		DeliveryCost:    req.DeliveryCost,
		OtherCost:       req.OtherCost,
		DiscountAmount:  req.DiscountAmount,
		Notes:           req.Notes,
		Status:          salesModels.SalesOrderStatusDraft,
		ReservedStock:   false,
		CreatedBy:       createdBy,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	// Default tax rate to 11% if not provided
	if req.TaxRate == 0 {
		order.TaxRate = 11.00
	}

	// Map items
	if len(req.Items) > 0 {
		order.Items = make([]salesModels.SalesOrderItem, len(req.Items))
		for i, itemReq := range req.Items {
			order.Items[i] = salesModels.SalesOrderItem{
				ProductID: itemReq.ProductID,
				Quantity:  itemReq.Quantity,
				Price:     itemReq.Price,
				Discount:  itemReq.Discount,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
			order.Items[i].CalculateSubtotal()
		}
	}

	return order, nil
}

// UpdateSalesOrderModel updates a SalesOrder model from UpdateSalesOrderRequest
func UpdateSalesOrderModel(m *salesModels.SalesOrder, req *dto.UpdateSalesOrderRequest) error {
	if req.OrderDate != nil {
		orderDate, err := time.Parse("2006-01-02", *req.OrderDate)
		if err != nil {
			return err
		}
		m.OrderDate = orderDate
	}

	if req.PaymentTermsID != nil {
		m.PaymentTermsID = req.PaymentTermsID
	}

	if req.SalesRepID != nil {
		m.SalesRepID = req.SalesRepID
	}

	if req.BusinessUnitID != nil {
		m.BusinessUnitID = req.BusinessUnitID
	}

	if req.BusinessTypeID != nil {
		m.BusinessTypeID = req.BusinessTypeID
	}

	if req.DeliveryAreaID != nil {
		m.DeliveryAreaID = req.DeliveryAreaID
	}

	if req.TaxRate != nil {
		m.TaxRate = *req.TaxRate
	}

	if req.DeliveryCost != nil {
		m.DeliveryCost = *req.DeliveryCost
	}

	if req.OtherCost != nil {
		m.OtherCost = *req.OtherCost
	}

	if req.DiscountAmount != nil {
		m.DiscountAmount = *req.DiscountAmount
	}

	if req.Notes != nil {
		m.Notes = *req.Notes
	}

	if req.CustomerName != nil {
		m.CustomerName = *req.CustomerName
	}

	if req.CustomerContact != nil {
		m.CustomerContact = *req.CustomerContact
	}

	if req.CustomerPhone != nil {
		m.CustomerPhone = *req.CustomerPhone
	}

	if req.CustomerEmail != nil {
		m.CustomerEmail = *req.CustomerEmail
	}

	// Update items if provided
	if len(req.Items) > 0 {
		m.Items = make([]salesModels.SalesOrderItem, len(req.Items))
		for i, itemReq := range req.Items {
			m.Items[i] = salesModels.SalesOrderItem{
				ProductID: itemReq.ProductID,
				Quantity:  itemReq.Quantity,
				Price:     itemReq.Price,
				Discount:  itemReq.Discount,
				UpdatedAt: time.Now(),
			}
			m.Items[i].CalculateSubtotal()
		}
	}

	m.UpdatedAt = time.Now()
	return nil
}

// ConvertQuotationToOrderModel converts a SalesQuotation to SalesOrder model
func ConvertQuotationToOrderModel(quotation *salesModels.SalesQuotation, deliveryAreaID *string, customerName string, customerContact string, customerPhone string, customerEmail string, notes string, code string, createdBy *string) (*salesModels.SalesOrder, error) {
	order := &salesModels.SalesOrder{
		Code:            code,
		OrderDate:       time.Now(),
		SalesQuotationID: &quotation.ID,
		PaymentTermsID:  quotation.PaymentTermsID,
		SalesRepID:      quotation.SalesRepID,
		BusinessUnitID:  quotation.BusinessUnitID,
		BusinessTypeID:  quotation.BusinessTypeID,
		DeliveryAreaID:  deliveryAreaID,
		CustomerName:    customerName,
		CustomerContact: customerContact,
		CustomerPhone:   customerPhone,
		CustomerEmail:   customerEmail,
		TaxRate:         quotation.TaxRate,
		DeliveryCost:    quotation.DeliveryCost,
		OtherCost:       quotation.OtherCost,
		DiscountAmount:  quotation.DiscountAmount,
		Subtotal:        quotation.Subtotal,
		TaxAmount:       quotation.TaxAmount,
		TotalAmount:     quotation.TotalAmount,
		Notes:           notes,
		Status:          salesModels.SalesOrderStatusDraft,
		ReservedStock:   false,
		CreatedBy:       createdBy,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	// Convert items
	if len(quotation.Items) > 0 {
		order.Items = make([]salesModels.SalesOrderItem, len(quotation.Items))
		for i, item := range quotation.Items {
			order.Items[i] = salesModels.SalesOrderItem{
				ProductID: item.ProductID,
				Quantity:  item.Quantity,
				Price:     item.Price,
				Discount:  item.Discount,
				Subtotal:  item.Subtotal,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
		}
	}

	return order, nil
}
