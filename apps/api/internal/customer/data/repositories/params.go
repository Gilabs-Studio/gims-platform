package repositories

// ListParams contains common list parameters
type ListParams struct {
	Search  string
	Limit   int
	Offset  int
	SortBy  string
	SortDir string
}

// CustomerListParams contains customer-specific list parameters
type CustomerListParams struct {
	ListParams
	CustomerTypeID string
	Status         string
	IsApproved     *bool
}
