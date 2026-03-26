package usecase

import (
	"context"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

// ResolvedEntity holds a resolved entity ID with its display name
type ResolvedEntity struct {
	ID          string `json:"id"`
	DisplayName string `json:"display_name"`
	EntityType  string `json:"entity_type"`
	Code        string `json:"code,omitempty"`
}

// FormDataOptions holds available options for form field dropdowns
type FormDataOptions struct {
	Customers     []string
	Products      []FormDataProduct
	PaymentTerms  []FormDataOption
	BusinessUnits []FormDataOption
}

// FormDataProduct represents a product option for form selection
type FormDataProduct struct {
	Name string
	SKU  string
}

// FormDataOption represents a generic named option
type FormDataOption struct {
	Name string
	Code string
}

// EntityResolver resolves natural language entity references to database IDs
type EntityResolver struct {
	db *gorm.DB
}

// NewEntityResolver creates a new EntityResolver
func NewEntityResolver(db *gorm.DB) *EntityResolver {
	return &EntityResolver{db: db}
}

// ResolveEmployee resolves employee name/code to employee ID
func (r *EntityResolver) ResolveEmployee(ctx context.Context, nameOrCode string) (*ResolvedEntity, error) {
	var result struct {
		ID           string
		EmployeeCode string
		Name         string
	}

	query := r.db.WithContext(ctx).Table("employees").
		Select("id, employee_code, name").
		Where("deleted_at IS NULL")

	// Try exact code match first, then prefix name search
	err := query.Where("LOWER(employee_code) = LOWER(?)", nameOrCode).
		Limit(1).Scan(&result).Error
	if err != nil {
		return nil, fmt.Errorf("ENTITY_RESOLUTION_FAILED: employee query error: %w", err)
	}
	if result.ID != "" {
		return &ResolvedEntity{
			ID:          result.ID,
			DisplayName: result.Name,
			EntityType:  "employee",
			Code:        result.EmployeeCode,
		}, nil
	}

	// Try name search with prefix matching for index usage
	searchTerm := strings.TrimSpace(nameOrCode)
	err = r.db.WithContext(ctx).Table("employees").
		Select("id, employee_code, name").
		Where("deleted_at IS NULL").
		Where("LOWER(name) LIKE LOWER(?)", searchTerm+"%").
		Limit(1).Scan(&result).Error
	if err != nil {
		return nil, fmt.Errorf("ENTITY_RESOLUTION_FAILED: employee search error: %w", err)
	}
	if result.ID != "" {
		return &ResolvedEntity{
			ID:          result.ID,
			DisplayName: result.Name,
			EntityType:  "employee",
			Code:        result.EmployeeCode,
		}, nil
	}

	return nil, fmt.Errorf("ENTITY_NOT_FOUND: employee '%s' not found", nameOrCode)
}

// ResolveProduct resolves product name/code/SKU to product ID
func (r *EntityResolver) ResolveProduct(ctx context.Context, nameOrCode string) (*ResolvedEntity, error) {
	var result struct {
		ID   string
		SKU  string
		Name string
	}

	searchTerm := strings.TrimSpace(nameOrCode)

	// Try exact code/SKU match first
	err := r.db.WithContext(ctx).Table("products").
		Select("id, sku, name").
		Where("deleted_at IS NULL").
		Where("LOWER(sku) = LOWER(?) OR LOWER(code) = LOWER(?)", searchTerm, searchTerm).
		Limit(1).Scan(&result).Error
	if err != nil {
		return nil, fmt.Errorf("ENTITY_RESOLUTION_FAILED: product code query error: %w", err)
	}
	if result.ID != "" {
		return &ResolvedEntity{
			ID:          result.ID,
			DisplayName: result.Name,
			EntityType:  "product",
			Code:        result.SKU,
		}, nil
	}

	// Try name prefix search
	err = r.db.WithContext(ctx).Table("products").
		Select("id, sku, name").
		Where("deleted_at IS NULL").
		Where("LOWER(name) LIKE LOWER(?)", searchTerm+"%").
		Limit(1).Scan(&result).Error
	if err != nil {
		return nil, fmt.Errorf("ENTITY_RESOLUTION_FAILED: product search error: %w", err)
	}
	if result.ID != "" {
		return &ResolvedEntity{
			ID:          result.ID,
			DisplayName: result.Name,
			EntityType:  "product",
			Code:        result.SKU,
		}, nil
	}

	return nil, fmt.Errorf("ENTITY_NOT_FOUND: product '%s' not found", nameOrCode)
}

// ResolveWarehouse resolves warehouse name/code to warehouse ID
func (r *EntityResolver) ResolveWarehouse(ctx context.Context, nameOrCode string) (*ResolvedEntity, error) {
	var result struct {
		ID   string
		Code string
		Name string
	}

	searchTerm := strings.TrimSpace(nameOrCode)

	// Try exact code match first
	err := r.db.WithContext(ctx).Table("warehouses").
		Select("id, code, name").
		Where("deleted_at IS NULL").
		Where("LOWER(code) = LOWER(?)", searchTerm).
		Limit(1).Scan(&result).Error
	if err != nil {
		return nil, fmt.Errorf("ENTITY_RESOLUTION_FAILED: warehouse code query error: %w", err)
	}
	if result.ID != "" {
		return &ResolvedEntity{
			ID:          result.ID,
			DisplayName: result.Name,
			EntityType:  "warehouse",
			Code:        result.Code,
		}, nil
	}

	// Try name prefix search
	err = r.db.WithContext(ctx).Table("warehouses").
		Select("id, code, name").
		Where("deleted_at IS NULL").
		Where("LOWER(name) LIKE LOWER(?)", searchTerm+"%").
		Limit(1).Scan(&result).Error
	if err != nil {
		return nil, fmt.Errorf("ENTITY_RESOLUTION_FAILED: warehouse search error: %w", err)
	}
	if result.ID != "" {
		return &ResolvedEntity{
			ID:          result.ID,
			DisplayName: result.Name,
			EntityType:  "warehouse",
			Code:        result.Code,
		}, nil
	}

	return nil, fmt.Errorf("ENTITY_NOT_FOUND: warehouse '%s' not found", nameOrCode)
}

// ResolveCustomer resolves customer name from sales documents
func (r *EntityResolver) ResolveCustomer(ctx context.Context, name string) (*ResolvedEntity, error) {
	var result struct {
		CustomerName string
	}

	searchTerm := strings.TrimSpace(name)

	// Search in sales quotations for customer name
	err := r.db.WithContext(ctx).Table("sales_quotations").
		Select("customer_name").
		Where("deleted_at IS NULL").
		Where("LOWER(customer_name) LIKE LOWER(?)", searchTerm+"%").
		Limit(1).Scan(&result).Error
	if err != nil {
		return nil, fmt.Errorf("ENTITY_RESOLUTION_FAILED: customer search error: %w", err)
	}
	if result.CustomerName != "" {
		return &ResolvedEntity{
			ID:          "", // Customers have no standalone ID, use name as identifier
			DisplayName: result.CustomerName,
			EntityType:  "customer",
		}, nil
	}

	// Also search in sales estimations
	err = r.db.WithContext(ctx).Table("sales_estimations").
		Select("customer_name").
		Where("deleted_at IS NULL").
		Where("LOWER(customer_name) LIKE LOWER(?)", searchTerm+"%").
		Limit(1).Scan(&result).Error
	if err != nil {
		return nil, fmt.Errorf("ENTITY_RESOLUTION_FAILED: customer estimation search error: %w", err)
	}
	if result.CustomerName != "" {
		return &ResolvedEntity{
			ID:          "",
			DisplayName: result.CustomerName,
			EntityType:  "customer",
		}, nil
	}

	return nil, fmt.Errorf("ENTITY_NOT_FOUND: customer '%s' not found", name)
}

// ResolveSupplier resolves supplier name/code to supplier ID
func (r *EntityResolver) ResolveSupplier(ctx context.Context, nameOrCode string) (*ResolvedEntity, error) {
	var result struct {
		ID   string
		Code string
		Name string
	}

	searchTerm := strings.TrimSpace(nameOrCode)

	// Try exact code match first
	err := r.db.WithContext(ctx).Table("suppliers").
		Select("id, code, name").
		Where("deleted_at IS NULL").
		Where("LOWER(code) = LOWER(?)", searchTerm).
		Limit(1).Scan(&result).Error
	if err != nil {
		return nil, fmt.Errorf("ENTITY_RESOLUTION_FAILED: supplier code query error: %w", err)
	}
	if result.ID != "" {
		return &ResolvedEntity{
			ID:          result.ID,
			DisplayName: result.Name,
			EntityType:  "supplier",
			Code:        result.Code,
		}, nil
	}

	// Try name prefix search
	err = r.db.WithContext(ctx).Table("suppliers").
		Select("id, code, name").
		Where("deleted_at IS NULL").
		Where("LOWER(name) LIKE LOWER(?)", searchTerm+"%").
		Limit(1).Scan(&result).Error
	if err != nil {
		return nil, fmt.Errorf("ENTITY_RESOLUTION_FAILED: supplier search error: %w", err)
	}
	if result.ID != "" {
		return &ResolvedEntity{
			ID:          result.ID,
			DisplayName: result.Name,
			EntityType:  "supplier",
			Code:        result.Code,
		}, nil
	}

	return nil, fmt.Errorf("ENTITY_NOT_FOUND: supplier '%s' not found", nameOrCode)
}

// ResolveArea resolves area name/code to area ID
func (r *EntityResolver) ResolveArea(ctx context.Context, nameOrCode string) (*ResolvedEntity, error) {
	var result struct {
		ID   string
		Code string
		Name string
	}

	searchTerm := sanitizeAreaSearch(strings.TrimSpace(nameOrCode))
	if searchTerm == "" {
		return nil, fmt.Errorf("ENTITY_NOT_FOUND: area '%s' not found", nameOrCode)
	}

	// Try exact code/name match first
	err := r.db.WithContext(ctx).Table("areas").
		Select("id, code, name").
		Where("deleted_at IS NULL").
		Where("LOWER(code) = LOWER(?) OR LOWER(name) = LOWER(?)", searchTerm, searchTerm).
		Limit(1).Scan(&result).Error
	if err != nil {
		return nil, fmt.Errorf("ENTITY_RESOLUTION_FAILED: area query error: %w", err)
	}
	if result.ID != "" {
		return &ResolvedEntity{
			ID:          result.ID,
			DisplayName: result.Name,
			EntityType:  "area",
			Code:        result.Code,
		}, nil
	}

	// Fallback to prefix search
	err = r.db.WithContext(ctx).Table("areas").
		Select("id, code, name").
		Where("deleted_at IS NULL").
		Where("LOWER(name) LIKE LOWER(?)", searchTerm+"%").
		Limit(1).Scan(&result).Error
	if err != nil {
		return nil, fmt.Errorf("ENTITY_RESOLUTION_FAILED: area search error: %w", err)
	}
	if result.ID != "" {
		return &ResolvedEntity{
			ID:          result.ID,
			DisplayName: result.Name,
			EntityType:  "area",
			Code:        result.Code,
		}, nil
	}

	// Last attempt using contains for phrases like "bali full"
	err = r.db.WithContext(ctx).Table("areas").
		Select("id, code, name").
		Where("deleted_at IS NULL").
		Where("LOWER(name) LIKE LOWER(?)", "%"+searchTerm+"%").
		Limit(1).Scan(&result).Error
	if err != nil {
		return nil, fmt.Errorf("ENTITY_RESOLUTION_FAILED: area contains search error: %w", err)
	}
	if result.ID != "" {
		return &ResolvedEntity{
			ID:          result.ID,
			DisplayName: result.Name,
			EntityType:  "area",
			Code:        result.Code,
		}, nil
	}

	return nil, fmt.Errorf("ENTITY_NOT_FOUND: area '%s' not found", nameOrCode)
}

func sanitizeAreaSearch(v string) string {
	lower := strings.ToLower(strings.TrimSpace(v))
	replacements := []string{" area ", " full", " seluruh", " semua", "region", "wilayah"}
	for _, token := range replacements {
		lower = strings.ReplaceAll(lower, token, " ")
	}
	return strings.TrimSpace(lower)
}

// ResolveUserToEmployeeID looks up the employee record linked to a user account.
// Returns the employee ID (UUID) that corresponds to the given user ID.
func (r *EntityResolver) ResolveUserToEmployeeID(ctx context.Context, userID string) (string, error) {
	var result struct {
		ID string
	}
	err := r.db.WithContext(ctx).Table("employees").
		Select("id").
		Where("deleted_at IS NULL AND user_id = ?", userID).
		Limit(1).Scan(&result).Error
	if err != nil {
		return "", fmt.Errorf("ENTITY_RESOLUTION_FAILED: employee lookup by user_id error: %w", err)
	}
	if result.ID != "" {
		return result.ID, nil
	}
	return "", fmt.Errorf("ENTITY_NOT_FOUND: no employee record linked to user '%s'", userID)
}

// ResolveEntitiesFromParameters resolves all entity references in intent parameters
func (r *EntityResolver) ResolveEntitiesFromParameters(ctx context.Context, params map[string]interface{}) (map[string]*ResolvedEntity, error) {
	resolved := make(map[string]*ResolvedEntity)

	// Resolve employee references
	if empName, ok := params["employee_name"].(string); ok && empName != "" {
		entity, err := r.ResolveEmployee(ctx, empName)
		if err != nil {
			return resolved, err
		}
		resolved["employee"] = entity
	}

	// Resolve product references
	if prodName, ok := params["product_name"].(string); ok && prodName != "" {
		entity, err := r.ResolveProduct(ctx, prodName)
		if err != nil {
			return resolved, err
		}
		resolved["product"] = entity
	}

	// Resolve warehouse references
	if whName, ok := params["warehouse_name"].(string); ok && whName != "" {
		entity, err := r.ResolveWarehouse(ctx, whName)
		if err != nil {
			return resolved, err
		}
		resolved["warehouse"] = entity
	}

	// Resolve customer references
	if custName, ok := params["customer_name"].(string); ok && custName != "" {
		entity, err := r.ResolveCustomer(ctx, custName)
		if err != nil {
			return resolved, err
		}
		resolved["customer"] = entity
	}

	// Resolve area references
	if areaName, ok := params["area_name"].(string); ok && areaName != "" {
		entity, err := r.ResolveArea(ctx, areaName)
		if err != nil {
			return resolved, err
		}
		resolved["area"] = entity
	}

	return resolved, nil
}

// ResolvePaymentTerms resolves a payment terms name to its database UUID
func (r *EntityResolver) ResolvePaymentTerms(ctx context.Context, name string) (string, error) {
	var result struct {
		ID   string
		Name string
	}
	searchTerm := strings.TrimSpace(name)

	// Try exact name match (case-insensitive)
	err := r.db.WithContext(ctx).Table("payment_terms").
		Select("id, name").
		Where("deleted_at IS NULL AND is_active = true").
		Where("LOWER(name) = LOWER(?)", searchTerm).
		Limit(1).Scan(&result).Error
	if err != nil {
		return "", fmt.Errorf("ENTITY_RESOLUTION_FAILED: payment terms query error: %w", err)
	}
	if result.ID != "" {
		return result.ID, nil
	}

	// Try prefix search for partial matches (e.g. "Net 14" matching "Net 14 Days")
	err = r.db.WithContext(ctx).Table("payment_terms").
		Select("id, name").
		Where("deleted_at IS NULL AND is_active = true").
		Where("LOWER(name) LIKE LOWER(?)", searchTerm+"%").
		Limit(1).Scan(&result).Error
	if err != nil {
		return "", fmt.Errorf("ENTITY_RESOLUTION_FAILED: payment terms search error: %w", err)
	}
	if result.ID != "" {
		return result.ID, nil
	}

	// Try contains search as last resort (e.g. "14" matching "Net 14 Days")
	err = r.db.WithContext(ctx).Table("payment_terms").
		Select("id, name").
		Where("deleted_at IS NULL AND is_active = true").
		Where("LOWER(name) LIKE LOWER(?)", "%"+searchTerm+"%").
		Limit(1).Scan(&result).Error
	if err != nil {
		return "", fmt.Errorf("ENTITY_RESOLUTION_FAILED: payment terms fuzzy search error: %w", err)
	}
	if result.ID != "" {
		return result.ID, nil
	}

	return "", fmt.Errorf("ENTITY_NOT_FOUND: payment terms '%s' not found", name)
}

// ResolveBusinessUnit resolves a business unit name to its database UUID
func (r *EntityResolver) ResolveBusinessUnit(ctx context.Context, name string) (string, error) {
	var result struct {
		ID   string
		Name string
	}
	searchTerm := strings.TrimSpace(name)

	// Try exact name match (case-insensitive)
	err := r.db.WithContext(ctx).Table("business_units").
		Select("id, name").
		Where("deleted_at IS NULL AND is_active = true").
		Where("LOWER(name) = LOWER(?)", searchTerm).
		Limit(1).Scan(&result).Error
	if err != nil {
		return "", fmt.Errorf("ENTITY_RESOLUTION_FAILED: business unit query error: %w", err)
	}
	if result.ID != "" {
		return result.ID, nil
	}

	// Try prefix search
	err = r.db.WithContext(ctx).Table("business_units").
		Select("id, name").
		Where("deleted_at IS NULL AND is_active = true").
		Where("LOWER(name) LIKE LOWER(?)", searchTerm+"%").
		Limit(1).Scan(&result).Error
	if err != nil {
		return "", fmt.Errorf("ENTITY_RESOLUTION_FAILED: business unit search error: %w", err)
	}
	if result.ID != "" {
		return result.ID, nil
	}

	// Try contains search (e.g. "Retail" matching "Unit A - Retail")
	err = r.db.WithContext(ctx).Table("business_units").
		Select("id, name").
		Where("deleted_at IS NULL AND is_active = true").
		Where("LOWER(name) LIKE LOWER(?)", "%"+searchTerm+"%").
		Limit(1).Scan(&result).Error
	if err != nil {
		return "", fmt.Errorf("ENTITY_RESOLUTION_FAILED: business unit fuzzy search error: %w", err)
	}
	if result.ID != "" {
		return result.ID, nil
	}

	return "", fmt.Errorf("ENTITY_NOT_FOUND: business unit '%s' not found", name)
}

// ResolveProductByName resolves a product name to its database UUID and selling price
func (r *EntityResolver) ResolveProductByName(ctx context.Context, name string) (id string, price float64, err error) {
	var result struct {
		ID           string
		Name         string
		SellingPrice float64
	}
	searchTerm := strings.TrimSpace(name)

	// Try exact name match (case-insensitive)
	err = r.db.WithContext(ctx).Table("products").
		Select("id, name, selling_price").
		Where("deleted_at IS NULL").
		Where("LOWER(name) = LOWER(?)", searchTerm).
		Limit(1).Scan(&result).Error
	if err != nil {
		return "", 0, fmt.Errorf("ENTITY_RESOLUTION_FAILED: product query error: %w", err)
	}
	if result.ID != "" {
		return result.ID, result.SellingPrice, nil
	}

	// Try prefix search for partial names
	err = r.db.WithContext(ctx).Table("products").
		Select("id, name, selling_price").
		Where("deleted_at IS NULL").
		Where("LOWER(name) LIKE LOWER(?)", searchTerm+"%").
		Limit(1).Scan(&result).Error
	if err != nil {
		return "", 0, fmt.Errorf("ENTITY_RESOLUTION_FAILED: product search error: %w", err)
	}
	if result.ID != "" {
		return result.ID, result.SellingPrice, nil
	}

	return "", 0, fmt.Errorf("ENTITY_NOT_FOUND: product '%s' not found", name)
}

// FetchFormDataOptions queries the database for available form options based on intent
func (r *EntityResolver) FetchFormDataOptions(ctx context.Context, intentCode string) *FormDataOptions {
	opts := &FormDataOptions{}

	switch intentCode {
	case "CREATE_SALES_QUOTATION", "CREATE_SALES_ORDER":
		// Fetch distinct customer names from existing sales documents
		var customers []struct{ CustomerName string }
		r.db.WithContext(ctx).Table("sales_quotations").
			Select("DISTINCT customer_name").
			Where("deleted_at IS NULL AND customer_name != ''").
			Order("customer_name").
			Limit(10).Scan(&customers)
		for _, c := range customers {
			opts.Customers = append(opts.Customers, c.CustomerName)
		}

		// Fetch active products
		var products []struct {
			Name string
			SKU  string
		}
		r.db.WithContext(ctx).Table("products").
			Select("name, sku").
			Where("deleted_at IS NULL AND is_active = true").
			Order("name").
			Limit(10).Scan(&products)
		for _, p := range products {
			opts.Products = append(opts.Products, FormDataProduct{Name: p.Name, SKU: p.SKU})
		}

		// Fetch payment terms
		var terms []struct {
			Name string
			Code string
		}
		r.db.WithContext(ctx).Table("payment_terms").
			Select("name, code").
			Where("deleted_at IS NULL AND is_active = true").
			Order("name").Scan(&terms)
		for _, t := range terms {
			opts.PaymentTerms = append(opts.PaymentTerms, FormDataOption{Name: t.Name, Code: t.Code})
		}

		// Fetch business units
		var units []struct{ Name string }
		r.db.WithContext(ctx).Table("business_units").
			Select("name").
			Where("deleted_at IS NULL AND is_active = true").
			Order("name").Scan(&units)
		for _, bu := range units {
			opts.BusinessUnits = append(opts.BusinessUnits, FormDataOption{Name: bu.Name})
		}
	}

	return opts
}
