package security

import (
	"context"

	"gorm.io/gorm"
)

// ScopeQueryOptions configures which database columns to use for scope resolution.
// Different modules use different fields (e.g., sales uses sales_rep_id, purchase uses created_by).
type ScopeQueryOptions struct {
	// OwnerUserIDColumn is the column that stores the owner's user ID (default: "created_by")
	OwnerUserIDColumn string
	// OwnerEmployeeIDColumn is the column that stores the owner's employee ID (e.g., "sales_rep_id")
	OwnerEmployeeIDColumn string
	// DivisionJoinSQL is a subquery that resolves division membership.
	// Example: "sales_rep_id IN (SELECT id FROM employees WHERE division_id = ?)"
	DivisionJoinSQL string
	// AreaIDColumn is the column that stores the area ID (e.g., "delivery_area_id")
	AreaIDColumn string
}

// DefaultScopeQueryOptions returns options suitable for most modules
func DefaultScopeQueryOptions() ScopeQueryOptions {
	return ScopeQueryOptions{
		OwnerUserIDColumn: "created_by",
	}
}

// SalesScopeQueryOptions returns options for sales module
func SalesScopeQueryOptions() ScopeQueryOptions {
	return ScopeQueryOptions{
		OwnerUserIDColumn:     "created_by",
		OwnerEmployeeIDColumn: "sales_rep_id",
		DivisionJoinSQL:       "sales_rep_id IN (SELECT id FROM employees WHERE division_id = ?)",
		AreaIDColumn:          "delivery_area_id",
	}
}

// PurchaseScopeQueryOptions returns options for purchase module
func PurchaseScopeQueryOptions() ScopeQueryOptions {
	return ScopeQueryOptions{
		OwnerUserIDColumn:     "created_by",
		OwnerEmployeeIDColumn: "employee_id",
	}
}

// HRDScopeQueryOptions returns options for HRD module
func HRDScopeQueryOptions() ScopeQueryOptions {
	return ScopeQueryOptions{
		OwnerEmployeeIDColumn: "employee_id",
		DivisionJoinSQL:       "employee_id IN (SELECT id FROM employees WHERE division_id = ?)",
	}
}

// ScopeFilter holds the resolved scope context for query filtering
type ScopeFilter struct {
	Scope      string // OWN, DIVISION, AREA, ALL
	UserID     string
	EmployeeID string
	DivisionID string
	AreaIDs    []string
}

// ApplyToQuery applies scope-based WHERE conditions to a GORM query.
// Returns the same db instance with appropriate filters applied.
// If scope is ALL or empty, no additional filters are added.
func (sf *ScopeFilter) ApplyToQuery(db *gorm.DB, opts ScopeQueryOptions) *gorm.DB {
	switch sf.Scope {
	case "OWN":
		return sf.applyOwn(db, opts)
	case "DIVISION":
		return sf.applyDivision(db, opts)
	case "AREA":
		return sf.applyArea(db, opts)
	default: // ALL or empty
		return db
	}
}

func (sf *ScopeFilter) applyOwn(db *gorm.DB, opts ScopeQueryOptions) *gorm.DB {
	// Build OR conditions: owner by user_id OR owner by employee_id
	conditions := make([]string, 0, 2)
	args := make([]interface{}, 0, 2)

	if columnExists(db, opts.OwnerUserIDColumn) && sf.UserID != "" {
		conditions = append(conditions, opts.OwnerUserIDColumn+" = ?")
		args = append(args, sf.UserID)
	}
	if columnExists(db, opts.OwnerEmployeeIDColumn) && sf.EmployeeID != "" {
		conditions = append(conditions, opts.OwnerEmployeeIDColumn+" = ?")
		args = append(args, sf.EmployeeID)
	}

	if len(conditions) == 0 {
		// No owner columns configured — restrict to nothing for safety
		return db.Where("1 = 0")
	}

	// Join conditions with OR
	combined := conditions[0]
	for i := 1; i < len(conditions); i++ {
		combined += " OR " + conditions[i]
	}
	return db.Where("("+combined+")", args...)
}

func (sf *ScopeFilter) applyDivision(db *gorm.DB, opts ScopeQueryOptions) *gorm.DB {
	if sf.DivisionID == "" {
		// User has no division — fall back to OWN
		return sf.applyOwn(db, opts)
	}

	if opts.DivisionJoinSQL != "" {
		return db.Where(opts.DivisionJoinSQL, sf.DivisionID)
	}

	// Column-aware fallback for modules with heterogeneous ownership columns.
	conditions := make([]string, 0, 2)
	args := make([]interface{}, 0, 2)

	if columnExists(db, opts.OwnerUserIDColumn) {
		conditions = append(conditions, opts.OwnerUserIDColumn+" IN (SELECT user_id FROM employees WHERE division_id = ? AND user_id IS NOT NULL)")
		args = append(args, sf.DivisionID)
	}

	if columnExists(db, opts.OwnerEmployeeIDColumn) {
		conditions = append(conditions, opts.OwnerEmployeeIDColumn+" IN (SELECT id FROM employees WHERE division_id = ?)")
		args = append(args, sf.DivisionID)
	}

	if len(conditions) > 0 {
		combined := conditions[0]
		for i := 1; i < len(conditions); i++ {
			combined += " OR " + conditions[i]
		}
		return db.Where("("+combined+")", args...)
	}

	return sf.applyOwn(db, opts)
}

func columnExists(db *gorm.DB, columnName string) bool {
	if columnName == "" {
		return false
	}

	if db == nil || db.Statement == nil || db.Statement.Model == nil {
		// For queries without a concrete model, keep previous permissive behavior.
		return true
	}

	return db.Migrator().HasColumn(db.Statement.Model, columnName)
}

func (sf *ScopeFilter) applyArea(db *gorm.DB, opts ScopeQueryOptions) *gorm.DB {
	if len(sf.AreaIDs) == 0 {
		// User has no areas — fall back to OWN
		return sf.applyOwn(db, opts)
	}

	if opts.AreaIDColumn != "" {
		return db.Where(opts.AreaIDColumn+" IN ?", sf.AreaIDs)
	}

	// No area column configured — fall back to division
	return sf.applyDivision(db, opts)
}

// NewScopeFilterFromContext creates a ScopeFilter from middleware-injected context values.
// Pass the permission_scope and scope_context from Gin context.
func NewScopeFilterFromContext(scope string, userID, employeeID, divisionID string, areaIDs []string) *ScopeFilter {
	return &ScopeFilter{
		Scope:      scope,
		UserID:     userID,
		EmployeeID: employeeID,
		DivisionID: divisionID,
		AreaIDs:    areaIDs,
	}
}

// ApplyScopeFilter reads scope values from the request context (set by ScopeMiddleware
// and RequirePermission middleware) and applies WHERE conditions to the GORM query.
// This is the main entry point for repositories to enforce data-level authorization.
func ApplyScopeFilter(db *gorm.DB, ctx context.Context, opts ScopeQueryOptions) *gorm.DB {
	scope, _ := ctx.Value("permission_scope").(string)
	if scope == "" || scope == "ALL" {
		return db
	}

	userID, _ := ctx.Value("scope_user_id").(string)
	employeeID, _ := ctx.Value("scope_employee_id").(string)
	divisionID, _ := ctx.Value("scope_division_id").(string)
	areaIDs, _ := ctx.Value("scope_area_ids").([]string)

	filter := &ScopeFilter{
		Scope:      scope,
		UserID:     userID,
		EmployeeID: employeeID,
		DivisionID: divisionID,
		AreaIDs:    areaIDs,
	}
	return filter.ApplyToQuery(db, opts)
}

// StockMovementScopeQueryOptions returns options for stock/inventory module
func StockMovementScopeQueryOptions() ScopeQueryOptions {
	return ScopeQueryOptions{
		OwnerUserIDColumn: "created_by",
		DivisionJoinSQL:   "created_by IN (SELECT user_id FROM employees WHERE division_id = ? AND user_id IS NOT NULL)",
	}
}

// FinanceScopeQueryOptions returns options for finance module
func FinanceScopeQueryOptions() ScopeQueryOptions {
	return ScopeQueryOptions{
		OwnerUserIDColumn: "created_by",
		DivisionJoinSQL:   "created_by IN (SELECT user_id FROM employees WHERE division_id = ? AND user_id IS NOT NULL)",
	}
}

// SalesPaymentScopeQueryOptions returns options for sales payment module
func SalesPaymentScopeQueryOptions() ScopeQueryOptions {
	return ScopeQueryOptions{
		OwnerUserIDColumn: "created_by",
		DivisionJoinSQL:   "created_by IN (SELECT user_id FROM employees WHERE division_id = ? AND user_id IS NOT NULL)",
	}
}

// MixedOwnershipScopeQueryOptions returns options for records owned by either a user or an employee/assignee.
// The employee column is used for division scoping and employee-based OWN access.
func MixedOwnershipScopeQueryOptions(ownerEmployeeIDColumn string) ScopeQueryOptions {
	opts := ScopeQueryOptions{
		OwnerUserIDColumn: "created_by",
	}

	if ownerEmployeeIDColumn != "" {
		opts.OwnerEmployeeIDColumn = ownerEmployeeIDColumn
		opts.DivisionJoinSQL = ownerEmployeeIDColumn + " IN (SELECT id FROM employees WHERE division_id = ?)"
	}

	return opts
}
