package dto

// GetCustomerResearchKpisRequest defines query parameters for KPI endpoint.
type GetCustomerResearchKpisRequest struct {
	StartDate string `form:"start_date"`
	EndDate   string `form:"end_date"`
}

// CustomerResearchKpisResponse returns KPI metrics for customer research.
type CustomerResearchKpisResponse struct {
	TotalCustomers    int     `json:"total_customers"`
	ActiveCustomers   int     `json:"active_customers"`
	InactiveCustomers int     `json:"inactive_customers"`
	TotalRevenue      float64 `json:"total_revenue"`
	AverageOrderValue float64 `json:"average_order_value"`
}

// GetRevenueTrendRequest defines query parameters for trend endpoint.
type GetRevenueTrendRequest struct {
	StartDate string `form:"start_date"`
	EndDate   string `form:"end_date"`
	Interval  string `form:"interval"`
}

// RevenueTrendData represents a single trend point.
type RevenueTrendData struct {
	Period       string  `json:"period"`
	TotalRevenue float64 `json:"total_revenue"`
	TotalOrders  int     `json:"total_orders"`
}

// RevenueTrendResponse contains trend data.
type RevenueTrendResponse struct {
	Data []RevenueTrendData `json:"data"`
}

// ListCustomersRequest defines query parameters for customer table endpoint.
type ListCustomersRequest struct {
	StartDate string `form:"start_date"`
	EndDate   string `form:"end_date"`
	Tab       string `form:"tab,default=top"`
	Search    string `form:"search"`
	Page      int    `form:"page,default=1"`
	PerPage   int    `form:"per_page,default=20"`
	SortBy    string `form:"sort_by,default=revenue"`
	Order     string `form:"order,default=desc"`
}

// ListRevenueByCustomerRequest defines query parameters for revenue-by-customer endpoint.
type ListRevenueByCustomerRequest struct {
	StartDate string `form:"start_date"`
	EndDate   string `form:"end_date"`
	Search    string `form:"search"`
	Page      int    `form:"page,default=1"`
	PerPage   int    `form:"per_page,default=20"`
	Order     string `form:"order,default=desc"`
}

// ListPurchaseFrequencyRequest defines query parameters for purchase-frequency endpoint.
type ListPurchaseFrequencyRequest struct {
	StartDate string `form:"start_date"`
	EndDate   string `form:"end_date"`
	Search    string `form:"search"`
	Page      int    `form:"page,default=1"`
	PerPage   int    `form:"per_page,default=20"`
	Order     string `form:"order,default=desc"`
}

// CustomerRow represents one customer row in the table.
type CustomerRow struct {
	CustomerID        string  `json:"customer_id"`
	CustomerName      string  `json:"customer_name"`
	TotalRevenue      float64 `json:"total_revenue"`
	TotalOrders       int     `json:"total_orders"`
	AverageOrderValue float64 `json:"average_order_value"`
	LastOrderDate     string  `json:"last_order_date,omitempty"`
}

// ListCustomersResponse wraps customer rows.
type ListCustomersResponse struct {
	Data []CustomerRow `json:"data"`
}

// CustomerDetailResponse represents a single customer detail payload.
type CustomerDetailResponse struct {
	CustomerID        string  `json:"customer_id"`
	CustomerName      string  `json:"customer_name"`
	TotalRevenue      float64 `json:"total_revenue"`
	TotalOrders       int     `json:"total_orders"`
	AverageOrderValue float64 `json:"average_order_value"`
	LastOrderDate     string  `json:"last_order_date,omitempty"`
}
