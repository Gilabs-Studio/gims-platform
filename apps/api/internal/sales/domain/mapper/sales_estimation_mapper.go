package mapper

import (
	"time"

	salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
)

// ToSalesEstimationResponse converts a SalesEstimation model to response DTO
func ToSalesEstimationResponse(m *salesModels.SalesEstimation) dto.SalesEstimationResponse {
	response := dto.SalesEstimationResponse{
		ID:                m.ID,
		Code:              m.Code,
		EstimationDate:    m.EstimationDate.Format("2006-01-02"),
		CustomerName:      m.CustomerName,
		CustomerEmail:     m.CustomerEmail,
		CustomerPhone:     m.CustomerPhone,
		CustomerContact:   m.CustomerContact,
		Probability:       m.Probability,
		Subtotal:          m.Subtotal,
		DiscountAmount:    m.DiscountAmount,
		TaxRate:           m.TaxRate,
		TaxAmount:         m.TaxAmount,
		DeliveryCost:      m.DeliveryCost,
		OtherCost:         m.OtherCost,
		TotalAmount:       m.TotalAmount,
		Status:            string(m.Status),
		Notes:             m.Notes,
		CreatedAt:         m.CreatedAt.Format(time.RFC3339),
		UpdatedAt:         m.UpdatedAt.Format(time.RFC3339),
	}

	if m.ExpectedCloseDate != nil {
		expectedCloseDate := m.ExpectedCloseDate.Format("2006-01-02")
		response.ExpectedCloseDate = &expectedCloseDate
	}

	if m.CustomerID != nil {
		response.CustomerID = m.CustomerID
		if m.Customer != nil {
			response.Customer = &dto.CustomerResponse{
				ID:             m.Customer.ID,
				Code:           m.Customer.Code,
				Name:           m.Customer.Name,
				CustomerTypeID: m.Customer.CustomerTypeID,
				Address:        m.Customer.Address,
				Email:          m.Customer.Email,
				ContactPerson:  m.Customer.ContactPerson,
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
	
	if m.AreaID != nil {
		response.AreaID = m.AreaID
		if m.Area != nil {
			response.Area = &dto.AreaResponse{
				ID: m.Area.ID,
				Name: m.Area.Name,
				Description: m.Area.Description,
			}
		}
	}

	if m.CreatedBy != nil {
		response.CreatedBy = m.CreatedBy
	}

	if m.ApprovedBy != nil {
		response.ApprovedBy = m.ApprovedBy
		if m.ApprovedAt != nil {
			approvedAt := m.ApprovedAt.Format(time.RFC3339)
			response.ApprovedAt = &approvedAt
		}
	}

	if m.RejectedBy != nil {
		response.RejectedBy = m.RejectedBy
		if m.RejectedAt != nil {
			rejectedAt := m.RejectedAt.Format(time.RFC3339)
			response.RejectedAt = &rejectedAt
		}
		response.RejectionReason = m.RejectionReason
	}

	if m.ConvertedToQuotationID != nil {
		response.ConvertedToQuotationID = m.ConvertedToQuotationID
		if m.ConvertedAt != nil {
			convertedAt := m.ConvertedAt.Format(time.RFC3339)
			response.ConvertedAt = &convertedAt
		}
	}

	// Map items
	if len(m.Items) > 0 {
		response.Items = make([]dto.SalesEstimationItemResponse, len(m.Items))
		for i, item := range m.Items {
			response.Items[i] = ToSalesEstimationItemResponse(&item)
		}
	}

	return response
}

// ToSalesEstimationItemResponse converts a SalesEstimationItem model to response DTO
func ToSalesEstimationItemResponse(m *salesModels.SalesEstimationItem) dto.SalesEstimationItemResponse {
	response := dto.SalesEstimationItemResponse{
		ID:                m.ID,
		SalesEstimationID: m.SalesEstimationID,
		ProductID:         m.ProductID,
		Quantity:          m.Quantity,
		EstimatedPrice:    m.EstimatedPrice,
		Discount:          m.Discount,
		Subtotal:          m.Subtotal,
		CreatedAt:         m.CreatedAt.Format(time.RFC3339),
		UpdatedAt:         m.UpdatedAt.Format(time.RFC3339),
	}

	if m.Product != nil {
		response.Product = &dto.ProductResponse{
			ID:           m.Product.ID,
			Code:         m.Product.Code,
			Name:         m.Product.Name,
			SellingPrice: m.Product.SellingPrice,
			ImageURL:     m.Product.ImageURL,
		}
	}

	return response
}

// ToSalesEstimationModel converts a CreateSalesEstimationRequest to SalesEstimation model
func ToSalesEstimationModel(req *dto.CreateSalesEstimationRequest, code string, createdBy *string) (*salesModels.SalesEstimation, error) {
	estimationDate, err := time.Parse("2006-01-02", req.EstimationDate)
	if err != nil {
		return nil, err
	}

	salesRepID := req.SalesRepID
	businessUnitID := req.BusinessUnitID

	estimation := &salesModels.SalesEstimation{
		Code:            code,
		EstimationDate:  estimationDate,
		CustomerName:    req.CustomerName,
		CustomerEmail:   req.CustomerEmail,
		CustomerPhone:   req.CustomerPhone,
		CustomerContact: req.CustomerContact,
		CustomerID:      req.CustomerID,
		
		SalesRepID:      &salesRepID,
		BusinessUnitID:  &businessUnitID,
		BusinessTypeID:  req.BusinessTypeID,
		AreaID:          req.AreaID,
		
		Probability:     req.Probability,
		Notes:           req.Notes,
		
		TaxRate:         req.TaxRate,
		DeliveryCost:    req.DeliveryCost,
		OtherCost:       req.OtherCost,
		DiscountAmount:  req.DiscountAmount,
		
		Status:          salesModels.SalesEstimationStatusDraft,
		CreatedBy:       createdBy,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if req.ExpectedCloseDate != nil {
		expectedCloseDate, err := time.Parse("2006-01-02", *req.ExpectedCloseDate)
		if err == nil {
			estimation.ExpectedCloseDate = &expectedCloseDate
		}
	}

	// Default probability if not provided
	if req.Probability == 0 {
		estimation.Probability = 0
	}
	
	// Default tax rate to 11% if not provided
	if req.TaxRate == 0 {
		estimation.TaxRate = 11.00
	}

	// Map items
	if len(req.Items) > 0 {
		estimation.Items = make([]salesModels.SalesEstimationItem, len(req.Items))
		for i, itemReq := range req.Items {
			estimation.Items[i] = salesModels.SalesEstimationItem{
				ProductID:      itemReq.ProductID,
				Quantity:       itemReq.Quantity,
				EstimatedPrice: itemReq.EstimatedPrice,
				Discount:       itemReq.Discount,
				CreatedAt:      time.Now(),
				UpdatedAt:      time.Now(),
			}
			estimation.Items[i].CalculateSubtotal()
		}
	}

	return estimation, nil
}

// UpdateSalesEstimationModel updates a SalesEstimation model from UpdateSalesEstimationRequest
func UpdateSalesEstimationModel(m *salesModels.SalesEstimation, req *dto.UpdateSalesEstimationRequest) error {
	if req.EstimationDate != nil {
		estimationDate, err := time.Parse("2006-01-02", *req.EstimationDate)
		if err != nil {
			return err
		}
		m.EstimationDate = estimationDate
	}

	if req.ExpectedCloseDate != nil {
		expectedCloseDate, err := time.Parse("2006-01-02", *req.ExpectedCloseDate)
		if err == nil {
			m.ExpectedCloseDate = &expectedCloseDate
		}
	}

	if req.CustomerName != nil {
		m.CustomerName = *req.CustomerName
	}
	if req.CustomerEmail != nil {
		m.CustomerEmail = *req.CustomerEmail
	}
	if req.CustomerPhone != nil {
		m.CustomerPhone = *req.CustomerPhone
	}
	if req.CustomerContact != nil {
		m.CustomerContact = *req.CustomerContact
	}
	if req.CustomerID != nil {
		m.CustomerID = req.CustomerID
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
	
	if req.AreaID != nil {
		m.AreaID = req.AreaID
	}

	if req.Probability != nil {
		m.Probability = *req.Probability
	}
	
	if req.Notes != nil {
		m.Notes = *req.Notes
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

	// Update items if provided
	if req.Items != nil && len(*req.Items) > 0 {
		m.Items = make([]salesModels.SalesEstimationItem, len(*req.Items))
		for i, itemReq := range *req.Items {
			m.Items[i] = salesModels.SalesEstimationItem{
				ProductID:      itemReq.ProductID,
				Quantity:       itemReq.Quantity,
				EstimatedPrice: itemReq.EstimatedPrice,
				Discount:       itemReq.Discount,
				UpdatedAt:      time.Now(),
			}
			m.Items[i].CalculateSubtotal()
		}
	}

	m.UpdatedAt = time.Now()
	return nil
}
