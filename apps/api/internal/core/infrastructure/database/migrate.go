package database

import (
	"fmt"
	"log"
	"os"
	"strings"

	core "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/config"
	geographic "github.com/gilabs/gims/api/internal/geographic/data/models"
	hrd "github.com/gilabs/gims/api/internal/hrd/data/models"
	inventory "github.com/gilabs/gims/api/internal/inventory/data/models"
	organization "github.com/gilabs/gims/api/internal/organization/data/models"
	permission "github.com/gilabs/gims/api/internal/permission/data/models"
	product "github.com/gilabs/gims/api/internal/product/data/models"
	refreshToken "github.com/gilabs/gims/api/internal/refresh_token/data/models"
	role "github.com/gilabs/gims/api/internal/role/data/models"
	sales "github.com/gilabs/gims/api/internal/sales/data/models"
	stockOpname "github.com/gilabs/gims/api/internal/stock_opname/data/models"
	supplier "github.com/gilabs/gims/api/internal/supplier/data/models"
	user "github.com/gilabs/gims/api/internal/user/data/models"
	warehouse "github.com/gilabs/gims/api/internal/warehouse/data/models"
)

// AutoMigrate runs database migrations
//
// PRODUCTION SAFETY:
// - This function is SAFE for production use
// - Tables are NEVER dropped in production mode (ENV=production)
// - Drop tables only happens in development mode when DROP_TABLES=true
// - Multiple safety checks prevent accidental data loss
// - No code changes needed for production deployment
func AutoMigrate() error {
	// Check if we should drop all tables (development only)
	// This check has built-in production protection
	if shouldDropTables() {
		log.Println("Development mode: Dropping all tables...")
		if err := DropAllTables(); err != nil {
			return fmt.Errorf("failed to drop tables: %w", err)
		}
		log.Println("All tables dropped successfully")
	}

	// Try to handle constraint issues by attempting to drop constraints that might cause problems
	// This is a workaround for development environments where schema might be out of sync
	if err := handleConstraintIssues(); err != nil {
		log.Printf("Warning: Could not handle constraint issues (this may be expected): %v", err)
	}

	// Use a custom migration approach that handles constraint errors gracefully
	err := migrateWithErrorHandling(
		&user.User{},
		&role.Role{},
		&permission.Permission{},
		&permission.Menu{},
		&refreshToken.RefreshToken{},
		&core.AuditLog{},
		// Geographic entities (Sprint 1)
		&geographic.Country{},
		&geographic.Province{},
		&geographic.City{},
		&geographic.District{},
		&geographic.Village{},
		// Organization entities (Sprint 2)
		&organization.Division{},
		&organization.JobPosition{},
		&organization.BusinessUnit{},
		&organization.BusinessType{},
		&organization.Area{},
		&organization.AreaSupervisor{},
		&organization.AreaSupervisorArea{},
		&organization.Company{},
		// Employee entities (Sprint 3)
		&organization.Employee{},
		&organization.EmployeeArea{},
		// Supplier entities (Sprint 4)
		&supplier.SupplierType{},
		&supplier.Bank{},
		&supplier.Supplier{},
		&supplier.SupplierPhoneNumber{},
		&supplier.SupplierBank{},
		// Product entities (Sprint 4)
		&product.ProductCategory{},
		&product.ProductBrand{},
		&product.ProductSegment{},
		&product.ProductType{},
		&product.UnitOfMeasure{},
		&product.Packaging{},
		&product.ProcurementType{},
		&product.Product{},
		// Warehouse entities (Sprint 4)
		&warehouse.Warehouse{},
		// Core Master Data entities (Sprint 4)
		&core.PaymentTerms{},
		&core.CourierAgency{},
		&core.SOSource{},
		&core.LeaveType{},
		// Sales entities (Sprint 5)
		&sales.SalesQuotation{},
		&sales.SalesQuotationItem{},
		&sales.SalesEstimation{},
		&sales.SalesEstimationItem{},
		// Sales Order entities (Sprint 6)
		&sales.SalesOrder{},
		&sales.SalesOrderItem{},
		// Delivery Order entities (Sprint 6)
		&sales.DeliveryOrder{},
		&sales.DeliveryOrderItem{},
		// Customer Invoice entities (Sprint 7)
		&sales.CustomerInvoice{},
		&sales.CustomerInvoiceItem{},
		// Sales Visit entities (Sprint 7)
		&sales.SalesVisit{},
		&sales.SalesVisitDetail{},
		&sales.SalesVisitProgressHistory{},
		// Sales Targets entities (Sprint 7)
		&sales.YearlyTarget{},
		&sales.MonthlyTarget{},
		// Sales Visit Interest Survey (Sprint 7)
		&sales.SalesVisitInterestQuestion{},
		&sales.SalesVisitInterestOption{},
		&sales.SalesVisitInterestAnswer{},
		// HRD Attendance entities (Sprint 13)
		&hrd.WorkSchedule{},
		&hrd.Holiday{},
		&hrd.AttendanceRecord{},
		&hrd.OvertimeRequest{},
		// HRD Leave Management entities (Sprint 14)
		&hrd.LeaveRequest{},
		// Inventory entities (Sprint 9)
		&inventory.InventoryBatch{},
		&inventory.StockMovement{},
		// Stock Opname entities (Sprint 9)
		&stockOpname.StockOpname{},
		&stockOpname.StockOpnameItem{},
	)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("Database migrations completed")

	// Create search indexes for performance
	if err := createSearchIndexes(); err != nil {
		log.Printf("Warning: Failed to create search indexes (this is non-fatal): %v", err)
	}

	return nil
}

// createSearchIndexes creates GIN indexes for optimized text search
func createSearchIndexes() error {
	// Ensure pg_trgm extension exists (required for GIN trgm_ops)
	if err := DB.Exec("CREATE EXTENSION IF NOT EXISTS pg_trgm").Error; err != nil {
		return fmt.Errorf("failed to create pg_trgm extension: %w", err)
	}

	indexes := []string{
		// User module indexes
		"CREATE INDEX IF NOT EXISTS idx_users_name_gin ON users USING gin (name gin_trgm_ops)",
		"CREATE INDEX IF NOT EXISTS idx_users_email_gin ON users USING gin (email gin_trgm_ops)",

		// HRD leave request search indexes (added for leave request search feature)
		"CREATE INDEX IF NOT EXISTS idx_employees_name_gin ON employees USING gin (name gin_trgm_ops)",
		"CREATE INDEX IF NOT EXISTS idx_leave_types_name_gin ON leave_types USING gin (name gin_trgm_ops)",
		"CREATE INDEX IF NOT EXISTS idx_leave_requests_reason_gin ON leave_requests USING gin (reason gin_trgm_ops)",
	}

	for _, idx := range indexes {
		if err := DB.Exec(idx).Error; err != nil {
			return fmt.Errorf("failed to create index: %w", err)
		}
	}
	return nil
}

// shouldDropTables checks if we should drop all tables (development only)
// This function ensures that tables are NEVER dropped in production mode
func shouldDropTables() bool {
	// CRITICAL: Never drop tables in production
	// Check both config and environment variable for safety
	env := ""
	if config.AppConfig != nil {
		env = config.AppConfig.Server.Env
	}

	// Fallback to environment variable if config is not loaded yet
	if env == "" {
		env = os.Getenv("ENV")
	}

	// Safety check: Never allow in production
	if env == "production" || env == "prod" {
		log.Println("🔒 Production mode detected: Table drop is disabled (safety protection)")
		return false
	}

	// Only allow dropping tables in development mode
	// Check environment variable DROP_TABLES
	dropTables := os.Getenv("DROP_TABLES")
	if dropTables == "true" || dropTables == "1" {
		// Double check: ensure we're not in production
		if env == "" || env == "development" || env == "dev" {
			log.Println("🔧 Development mode: Table drop is enabled")
			return true
		}
		log.Printf("⚠️  Warning: DROP_TABLES is set but ENV=%s is not development. Skipping table drop.", env)
		return false
	}
	return false
}

// DropAllTables drops all tables in the database (development only)
// This function has built-in safety checks to prevent accidental data loss
func DropAllTables() error {
	// Safety check: Never allow dropping tables in production
	// Check both config and environment variable for maximum safety
	env := ""
	if config.AppConfig != nil {
		env = config.AppConfig.Server.Env
	}

	// Fallback to environment variable if config is not loaded yet
	if env == "" {
		env = os.Getenv("ENV")
	}

	if env == "production" || env == "prod" {
		return fmt.Errorf("🔒 CRITICAL: Cannot drop tables in production mode (ENV=%s). This is a safety protection", env)
	}

	if DB == nil {
		return fmt.Errorf("database connection is not initialized")
	}

	// Get all table names in the current schema
	var tables []string
	err := DB.Raw(`
		SELECT tablename 
		FROM pg_tables 
		WHERE schemaname = CURRENT_SCHEMA()
		AND tablename NOT LIKE 'pg_%'
		AND tablename NOT LIKE '_prisma_%'
	`).Scan(&tables).Error

	if err != nil {
		return fmt.Errorf("failed to get table list: %w", err)
	}

	if len(tables) == 0 {
		log.Println("No tables to drop")
		return nil
	}

	// Disable foreign key checks temporarily and drop all tables
	// PostgreSQL doesn't have a simple way to disable FK checks, so we use CASCADE
	log.Printf("⚠️  DEVELOPMENT MODE: Dropping %d tables...", len(tables))

	for _, table := range tables {
		// Use CASCADE to drop dependent objects
		dropSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s CASCADE", table)
		if err := DB.Exec(dropSQL).Error; err != nil {
			log.Printf("Warning: Failed to drop table %s: %v", table, err)
			// Continue with other tables
		} else {
			log.Printf("Dropped table: %s", table)
		}
	}

	// Also drop any remaining sequences
	var sequences []string
	_ = DB.Raw(`
		SELECT sequence_name 
		FROM information_schema.sequences 
		WHERE sequence_schema = CURRENT_SCHEMA()
	`).Scan(&sequences).Error

	for _, seq := range sequences {
		dropSQL := fmt.Sprintf("DROP SEQUENCE IF EXISTS %s CASCADE", seq)
		_ = DB.Exec(dropSQL).Error // Ignore errors
	}

	log.Println("✅ All tables and sequences dropped successfully")
	return nil
}

// migrateWithErrorHandling migrates models while handling common constraint errors
func migrateWithErrorHandling(models ...interface{}) error {
	for _, model := range models {
		err := DB.AutoMigrate(model)
		if err != nil {
			// Check if error is PostgreSQL error code 42704 (undefined_object)
			// This happens when trying to DROP a constraint that doesn't exist
			errStr := err.Error()
			if strings.Contains(errStr, "SQLSTATE 42704") ||
				(strings.Contains(errStr, "does not exist") && strings.Contains(errStr, "constraint")) {
				log.Printf("Warning: Constraint error during migration (safe to ignore): %v", err)
				log.Println("GORM will create the necessary constraints. This is expected during schema evolution.")
				// Continue with next model - GORM might have partially succeeded
				continue
			}
			return fmt.Errorf("failed to migrate %T: %w", model, err)
		}
	}

	return nil
}

// handleConstraintIssues attempts to fix common constraint issues before migration
func handleConstraintIssues() error {
	// Check if roles table exists
	var exists bool
	err := DB.Raw("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = CURRENT_SCHEMA() AND table_name = 'roles')").Scan(&exists).Error
	if err != nil || !exists {
		return nil // Table doesn't exist, nothing to fix
	}

	// Get all unique constraints on the roles table
	type ConstraintInfo struct {
		ConstraintName string
	}
	var constraints []ConstraintInfo
	err = DB.Raw(`
		SELECT conname as constraint_name
		FROM pg_constraint
		WHERE conrelid = 'roles'::regclass
		AND contype = 'u'
	`).Scan(&constraints).Error

	if err != nil {
		// If we can't query constraints, that's okay - continue anyway
		return nil
	}

	// Drop all unique constraints on code column (GORM will recreate them)
	for _, constraint := range constraints {
		// Check if this constraint is on the 'code' column
		var columnName string
		err = DB.Raw(`
			SELECT a.attname
			FROM pg_constraint c
			JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
			WHERE c.conname = ?
			AND a.attname = 'code'
			LIMIT 1
		`, constraint.ConstraintName).Scan(&columnName).Error

		if err == nil && columnName == "code" {
			// Drop the constraint
			dropSQL := fmt.Sprintf("ALTER TABLE roles DROP CONSTRAINT IF EXISTS %s", constraint.ConstraintName)
			_ = DB.Exec(dropSQL).Error // Ignore errors - constraint might not exist
		}
	}

	return nil
}
