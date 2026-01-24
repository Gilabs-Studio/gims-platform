package dto

// CreateSalesEstimationRequest represents the request to create a sales estimation
type CreateSalesEstimationRequest struct {
	EstimationDate    string   `json:"estimation_date" binding:"required"`
	ExpectedCloseDate *string  `json:"expected_close_date"`
	
	// Customer Info
	CustomerID      *string `json:"customer_id"`
	CustomerName    string  `json:"customer_name" binding:"required"`
	CustomerEmail   string  `json:"customer_email"`
	CustomerPhone   string  `json:"customer_phone"`
	CustomerContact string  `json:"customer_contact"`
	
	// Relations
	SalesRepID      string   `json:"sales_rep_id" binding:"required,uuid"`
	BusinessUnitID  string   `json:"business_unit_id" binding:"required,uuid"`
	BusinessTypeID  *string  `json:"business_type_id"`
	AreaID          *string  `json:"area_id"`
	
	Probability     int      `json:"probability" binding:"gte=0,lte=100"`
	Notes           string   `json:"notes"`
	
	// Financials
	TaxRate         float64  `json:"tax_rate" binding:"gte=0,lte=100"`
	DeliveryCost    float64  `json:"delivery_cost" binding:"gte=0"`
	OtherCost       float64  `json:"other_cost" binding:"gte=0"`
	DiscountAmount  float64  `json:"discount_amount" binding:"gte=0"`
	
	Items           []CreateSalesEstimationItemRequest `json:"items" binding:"required,min=1,dive"`
}

// CreateSalesEstimationItemRequest represents an item in the estimation request
type CreateSalesEstimationItemRequest struct {
	ProductID      string  `json:"product_id" binding:"required,uuid"`
	Quantity       float64 `json:"quantity" binding:"required,gt=0"`
	EstimatedPrice float64 `json:"estimated_price" binding:"required,gt=0"`
	Discount       float64 `json:"discount" binding:"gte=0"`
}

// UpdateSalesEstimationRequest represents the request to update a sales estimation
type UpdateSalesEstimationRequest struct {
	EstimationDate    *string  `json:"estimation_date"`
	ExpectedCloseDate *string  `json:"expected_close_date"`
	
	CustomerID      *string `json:"customer_id"`
	CustomerName    *string `json:"customer_name"`
	CustomerEmail   *string `json:"customer_email"`
	CustomerPhone   *string `json:"customer_phone"`
	CustomerContact *string `json:"customer_contact"`
	
	SalesRepID      *string  `json:"sales_rep_id"`
	BusinessUnitID  *string  `json:"business_unit_id"`
	BusinessTypeID  *string  `json:"business_type_id"`
	AreaID          *string  `json:"area_id"`
	
	Probability     *int     `json:"probability" binding:"omitempty,gte=0,lte=100"`
	Notes           *string  `json:"notes"`
	
	TaxRate         *float64 `json:"tax_rate" binding:"omitempty,gte=0,lte=100"`
	DeliveryCost    *float64 `json:"delivery_cost" binding:"omitempty,gte=0"`
	OtherCost       *float64 `json:"other_cost" binding:"omitempty,gte=0"`
	DiscountAmount  *float64 `json:"discount_amount" binding:"omitempty,gte=0"`
	
	Items           *[]CreateSalesEstimationItemRequest `json:"items" binding:"omitempty,dive"`
}

// ListSalesEstimationsRequest represents the request to list sales estimations
type ListSalesEstimationsRequest struct {
	Page           int    `form:"page" binding:"omitempty,min=1"`
	PerPage        int    `form:"per_page" binding:"omitempty,min=1,max=100"`
	Search         string `form:"search"`
	Status         string `form:"status"`
	DateFrom       string `form:"date_from"`
	DateTo         string `form:"date_to"`
	SalesRepID     string `form:"sales_rep_id"`
	BusinessUnitID string `form:"business_unit_id"`
	AreaID         string `form:"area_id"`
	SortBy         string `form:"sort_by"`
	SortDir        string `form:"sort_dir" binding:"omitempty,oneof=asc desc"`
}

// ListSalesEstimationItemsRequest represents the request to list estimation items
type ListSalesEstimationItemsRequest struct {
	Page    int `form:"page" binding:"omitempty,min=1"`
	PerPage int `form:"per_page" binding:"omitempty,min=1,max=100"`
}

// UpdateSalesEstimationStatusRequest represents the request to update estimation status
type UpdateSalesEstimationStatusRequest struct {
	Status          string  `json:"status" binding:"required,oneof=submitted approved rejected converted"`
	RejectionReason *string `json:"rejection_reason"`
}

// ConvertToQuotationRequest represents the request to convert estimation to quotation
type ConvertToQuotationRequest struct {
	QuotationDate  string `json:"quotation_date" binding:"required"`
	ValidUntil     *string `json:"valid_until"`
	PaymentTermsID string `json:"payment_terms_id" binding:"required,uuid"`
	InheritItems   bool   `json:"inherit_items"`
}

// SalesEstimationResponse represents the response for a sales estimation
type SalesEstimationResponse struct {
	ID                string                       `json:"id"`
	Code              string                       `json:"code"`
	EstimationDate    string                       `json:"estimation_date"`
	ExpectedCloseDate *string                      `json:"expected_close_date"`
	
	CustomerID      *string `json:"customer_id"`
	CustomerName    string  `json:"customer_name"`
	CustomerEmail   string  `json:"customer_email"`
	CustomerPhone   string  `json:"customer_phone"`
	CustomerContact string  `json:"customer_contact"`
	
	SalesRepID      *string                       `json:"sales_rep_id"`
	SalesRep        *EmployeeResponse             `json:"sales_rep,omitempty"`
	BusinessUnitID  *string                       `json:"business_unit_id"`
	BusinessUnit    *BusinessUnitResponse         `json:"business_unit,omitempty"`
	BusinessTypeID  *string                       `json:"business_type_id"`
	BusinessType    *BusinessTypeResponse         `json:"business_type,omitempty"`
	AreaID          *string                       `json:"area_id"`
	Area            *AreaResponse                 `json:"area,omitempty"` 
	
	Probability     int                           `json:"probability"`
	Notes           string                        `json:"notes"`
	
	Subtotal        float64                       `json:"subtotal"`
	DiscountAmount  float64                       `json:"discount_amount"`
	TaxRate         float64                       `json:"tax_rate"`
	TaxAmount       float64                       `json:"tax_amount"`
	DeliveryCost    float64                       `json:"delivery_cost"`
	OtherCost       float64                       `json:"other_cost"`
	TotalAmount     float64                       `json:"total_amount"`
	
	Status          string                        `json:"status"`
	
	CreatedBy       *string                       `json:"created_by"`
	ApprovedBy      *string                       `json:"approved_by"`
	ApprovedAt      *string                       `json:"approved_at"`
	RejectedBy      *string                       `json:"rejected_by"`
	RejectedAt      *string                       `json:"rejected_at"`
	RejectionReason *string                       `json:"rejection_reason"`
	
	ConvertedToQuotationID *string                `json:"converted_to_quotation_id"`
	ConvertedAt            *string                `json:"converted_at"`
	
	Items                  []SalesEstimationItemResponse `json:"items,omitempty"`
	
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// SalesEstimationItemResponse represents an item in the estimation response
type SalesEstimationItemResponse struct {
	ID                string           `json:"id"`
	SalesEstimationID string           `json:"sales_estimation_id"`
	ProductID         string           `json:"product_id"`
	Product           *ProductResponse `json:"product,omitempty"`
	Quantity          float64          `json:"quantity"`
	EstimatedPrice    float64          `json:"estimated_price"`
	Discount          float64          `json:"discount"`
	Subtotal          float64          `json:"subtotal"`
	CreatedAt         string           `json:"created_at"`
	UpdatedAt         string           `json:"updated_at"`
}


