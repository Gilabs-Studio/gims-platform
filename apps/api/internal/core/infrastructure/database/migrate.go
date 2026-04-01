package database

import (
	"fmt"
	"log"
	"os"
	"strings"

	ai "github.com/gilabs/gims/api/internal/ai/data/models"
	core "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/config"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database/migrations"
	crm "github.com/gilabs/gims/api/internal/crm/data/models"
	customer "github.com/gilabs/gims/api/internal/customer/data/models"
	finance "github.com/gilabs/gims/api/internal/finance/data/models"
	general "github.com/gilabs/gims/api/internal/general/data/models"
	geographic "github.com/gilabs/gims/api/internal/geographic/data/models"
	hrd "github.com/gilabs/gims/api/internal/hrd/data/models"
	inventory "github.com/gilabs/gims/api/internal/inventory/data/models"
	notification "github.com/gilabs/gims/api/internal/notification/data/models"
	organization "github.com/gilabs/gims/api/internal/organization/data/models"
	passwordReset "github.com/gilabs/gims/api/internal/password_reset/data/models"
	permission "github.com/gilabs/gims/api/internal/permission/data/models"
	product "github.com/gilabs/gims/api/internal/product/data/models"
	purchase "github.com/gilabs/gims/api/internal/purchase/data/models"
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

	// PRE-MIGRATION FIX: Change reference_id to varchar to support non-UUID references
	// We ignore the error if the table doesn't exist yet (fresh install)
	_ = DB.Exec(`
		ALTER TABLE journal_entries 
		ALTER COLUMN reference_id TYPE VARCHAR(255) 
		USING reference_id::varchar;
	`)

	// Use a custom migration approach that handles constraint errors gracefully
	// CRITICAL: RolePermission MUST be migrated BEFORE Role.
	// Role has `many2many:role_permissions` which creates the junction table with only 2 columns.
	// If Role migrates first, the scope column from RolePermission gets lost.
	// By migrating RolePermission first, the table is created with scope, and Role's
	// many2many reuses the existing table without dropping scope.
	err := migrateWithErrorHandling(
		&user.User{},
		&role.RolePermission{},
		&role.Role{},
		&permission.Permission{},
		&permission.Menu{},
		&refreshToken.RefreshToken{},
		&passwordReset.PasswordResetRequest{},
		&core.AuditLog{},
		&notification.Notification{},
		// Geographic entities (Sprint 1)
		&geographic.Country{},
		&geographic.Province{},
		&geographic.City{},
		&geographic.District{},
		&geographic.Village{},
		// Timezone data for auto-detection
		&core.TimeZone{},
		&core.Country{},
		// Organization entities (Sprint 2)
		&organization.Division{},
		&organization.JobPosition{},
		&organization.BusinessUnit{},
		&organization.BusinessType{},
		&organization.Area{},
		// NOTE: AreaSupervisor and AreaSupervisorArea removed in Sprint 17.
		// Supervisor role is now captured via EmployeeArea.IsSupervisor flag.
		&organization.Company{},
		// Employee entities (Sprint 3)
		&organization.Employee{},
		&organization.EmployeeArea{},
		// Supplier entities (Sprint 4)
		&supplier.SupplierType{},
		&supplier.Bank{},
		&supplier.Supplier{},
		&supplier.SupplierContact{},
		&supplier.SupplierBank{},
		// Customer entities (Master Data)
		&customer.CustomerType{},
		&customer.Customer{},
		&customer.CustomerBank{},
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
		&core.Currency{},
		&core.BankAccount{},
		// Finance entities (Sprint 10)
		&finance.ChartOfAccount{},
		&finance.FinanceSetting{},
		&finance.JournalEntry{},
		&finance.JournalLine{},
		&finance.JournalReversal{},
		&finance.JournalAttachment{},
		// Finance entities (Sprint 11)
		&finance.Payment{},
		&finance.PaymentAllocation{},
		&finance.Budget{},
		&finance.BudgetItem{},
		&finance.CashBankJournal{},
		&finance.CashBankJournalLine{},
		// Finance entities (Sprint 12)
		&finance.AssetCategory{},
		&finance.AssetLocation{},
		&finance.Asset{},
		&finance.AssetDepreciation{},
		&finance.AssetTransaction{},
		// NEW: Extended Asset entities
		&finance.AssetAttachment{},
		&finance.AssetAuditLog{},
		&finance.AssetAssignmentHistory{},
		&finance.AssetBudget{},
		&finance.AssetBudgetCategory{},
		&finance.FinancialClosing{},
		&finance.AccountingPeriod{},
		&finance.FinancialClosingSnapshot{},
		&finance.FinancialClosingLog{},
		&finance.TaxInvoice{},
		&finance.NonTradePayable{},
		&finance.SalaryStructure{},
		&finance.ValuationRun{},
		&finance.UpCountryCost{},
		&finance.UpCountryCostEmployee{},
		&finance.UpCountryCostItem{},
		// Asset Maintenance entities
		&finance.AssetMaintenanceSchedule{},
		&finance.AssetWorkOrder{},
		&finance.AssetSparePart{},
		&finance.AssetSparePartLink{},
		&finance.WorkOrderSparePart{},
		// Sales entities (Sprint 5)
		&sales.SalesQuotation{},
		&sales.SalesQuotationItem{},
		// Sales Order entities (Sprint 6)
		&sales.SalesOrder{},
		&sales.SalesOrderItem{},
		// Delivery Order entities (Sprint 6)
		&sales.DeliveryOrder{},
		&sales.DeliveryOrderItem{},
		// Customer Invoice entities (Sprint 7)
		&sales.CustomerInvoice{},
		&sales.CustomerInvoiceItem{},
		&sales.SalesReturn{},
		&sales.SalesReturnItem{},
		// Sales Payment entities
		&sales.SalesPayment{},
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
		// Organization Employee Contracts entities (moved from HRD)
		&organization.EmployeeContract{},
		// Organization Employee Education History entities (moved from HRD)
		&organization.EmployeeEducationHistory{},
		// Organization Employee Certifications entities (moved from HRD)
		&organization.EmployeeCertification{},
		// Organization Employee Assets entities (moved from HRD)
		&organization.EmployeeAsset{},
		// HRD Evaluation entities (Sprint 15)
		&hrd.EvaluationGroup{},
		&hrd.EvaluationCriteria{},
		&hrd.EmployeeEvaluation{},
		&hrd.EmployeeEvaluationCriteria{},
		// HRD Recruitment entities (Sprint 15)
		&hrd.RecruitmentRequest{},
		// HRD Recruitment Applicant entities
		&hrd.RecruitmentApplicant{},
		&hrd.ApplicantStage{},
		&hrd.ApplicantActivity{},
		// Organization Employee Signature
		&organization.EmployeeSignature{},
		// Inventory entities (Sprint 9)
		&inventory.InventoryBatch{},
		&inventory.StockMovement{},
		// Stock Opname entities (Sprint 9)
		&stockOpname.StockOpname{},
		&stockOpname.StockOpnameItem{},
		// Purchase entities (Sprint 8)
		&purchase.PurchaseRequisition{},
		&purchase.PurchaseRequisitionItem{},
		&purchase.PurchaseOrder{},
		&purchase.PurchaseOrderItem{},
		&purchase.GoodsReceipt{},
		&purchase.GoodsReceiptItem{},
		&purchase.SupplierInvoice{},
		&purchase.SupplierInvoiceItem{},
		&purchase.PurchasePayment{},
		&purchase.PurchaseReturn{},
		&purchase.PurchaseReturnItem{},
		// AI Assistant entities
		&ai.AIChatSession{},
		&ai.AIChatMessage{},
		&ai.AIActionLog{},
		&ai.AIIntentRegistry{},
		// CRM Settings entities (Sprint 17)
		&crm.PipelineStage{},
		&crm.LeadSource{},
		&crm.LeadStatus{},
		&crm.ContactRole{},
		&crm.ActivityType{},
		// CRM Contact entity (Sprint 18)
		&crm.Contact{},
		// CRM Lead entity (Sprint 19)
		&crm.Lead{},
		&crm.LeadProductItem{},
		// CRM Deal entities (Sprint 20)
		&crm.Deal{},
		&crm.DealProductItem{},
		&crm.DealHistory{},
		// CRM Visit Report entities (Sprint 22)
		&crm.VisitReport{},
		&crm.VisitReportDetail{},
		&crm.VisitReportProgressHistory{},
		&crm.VisitReportInterestAnswer{},
		// CRM Activity, Task & Schedule entities (Sprint 23)
		&crm.Activity{},
		&crm.Task{},
		&crm.Reminder{},
		&crm.Schedule{},
		// CRM Area Mapping entities (Sprint 24)
		&crm.AreaCapture{},
		// General: user dashboard layout preferences
		&general.DashboardLayout{},
	)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("Database migrations completed")

	// Migrate contract data from employees table to employee_contracts table
	if err := migrateEmployeeContractData(); err != nil {
		log.Printf("Warning: Could not migrate employee contract data: %v", err)
	}

	// Safety net: ensure role_permissions.scope column exists even when GORM's
	// AutoMigrate did not add it (e.g. the many2many relationship on Role
	// created the table first without the scope column).
	if err := DB.Exec(`
		ALTER TABLE role_permissions
		ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'ALL'
	`).Error; err != nil {
		log.Printf("Warning: could not ensure role_permissions.scope column: %v", err)
	}

	// Sprint 17: Migrate area_supervisors data to employee_areas
	if err := migrateAreaSupervisorsToEmployeeAreas(); err != nil {
		log.Printf("Warning: Area supervisor migration skipped or failed: %v", err)
	}

	// Safety net for rollout compatibility: older databases may miss the
	// newly introduced goods_receipts.warehouse_id column.
	if err := ensureGoodsReceiptWarehouseColumn(); err != nil {
		return fmt.Errorf("failed to ensure goods receipt warehouse column: %w", err)
	}

	// Safety net for rollout compatibility: older databases may miss
	// customer_contact_id columns introduced in sales documents.
	if err := ensureSalesCustomerContactColumns(); err != nil {
		return fmt.Errorf("failed to ensure sales customer contact columns: %w", err)
	}

	// Create search indexes for performance
	if err := createSearchIndexes(); err != nil {
		log.Printf("Warning: Failed to create search indexes (this is non-fatal): %v", err)
	}

	// Create triggers to enforce closed accounting periods on journal entries
	if err := createJournalEntryPeriodLockTrigger(); err != nil {
		log.Printf("Warning: Failed to create journal entry period lock trigger (this is non-fatal): %v", err)
	}

	// Migrate timezone data for auto-detection (using longitude-based detection for Indonesia)
	if err := migrateTimezoneData(); err != nil {
		log.Printf("Warning: Could not migrate timezone data: %v", err)
	}

	// Remove status column from employee_evaluations table (Sprint 16)
	if err := migrations.RemoveEvaluationStatusColumn(DB); err != nil {
		log.Printf("Warning: Could not remove evaluation status column: %v", err)
	}

	return nil
}

func createJournalEntryPeriodLockTrigger() error {
	// The trigger will prevent inserts/updates of journal entries if their entry_date falls within a closed accounting period.
	// It is intentionally permissive for historical entries when the accounting_periods table is empty.
	if err := DB.Exec(`
		CREATE OR REPLACE FUNCTION enforce_journal_entry_period_not_closed()
		RETURNS trigger AS $$
		BEGIN
			IF EXISTS (
				SELECT 1 FROM accounting_periods
				WHERE status = 'closed'
				  AND NEW.entry_date BETWEEN start_date AND end_date
			) THEN
				RAISE EXCEPTION 'Period is closed (%), cannot modify journal entries in this period', NEW.entry_date;
			END IF;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`).Error; err != nil {
		return err
	}

	if err := DB.Exec(`
		DROP TRIGGER IF EXISTS trg_journal_entry_period_lock ON journal_entries;
		CREATE TRIGGER trg_journal_entry_period_lock
		BEFORE INSERT OR UPDATE ON journal_entries
		FOR EACH ROW EXECUTE FUNCTION enforce_journal_entry_period_not_closed();
	`).Error; err != nil {
		return err
	}
	return nil
}

// tables no longer exist the function silently returns nil.
func migrateAreaSupervisorsToEmployeeAreas() error {
	// Check if the legacy tables still exist
	var exists bool
	DB.Raw(`SELECT EXISTS (
		SELECT 1 FROM information_schema.tables
		WHERE table_schema = 'public' AND table_name = 'area_supervisor_areas'
	)`).Scan(&exists)
	if !exists {
		log.Println("Sprint 17 migration: area_supervisor_areas table not found, skipping.")
		return nil
	}

	// Only migrate if there is data to migrate and the source references employees.
	// The legacy area_supervisors table has name/email/phone but no employee_id.
	// We try to match by email first, then by name as a fallback.
	migrationSQL := `
		INSERT INTO employee_areas (id, employee_id, area_id, is_supervisor, created_at)
		SELECT
			gen_random_uuid()::text,
			e.id,
			asa.area_id,
			true,
			NOW()
		FROM area_supervisor_areas asa
		JOIN area_supervisors asup ON asup.id = asa.area_supervisor_id
		JOIN employees e ON (
			(asup.email <> '' AND lower(e.email) = lower(asup.email))
			OR (asup.email = '' AND lower(e.name) = lower(asup.name))
		)
		WHERE NOT EXISTS (
			SELECT 1 FROM employee_areas ea
			WHERE ea.employee_id = e.id AND ea.area_id = asa.area_id
		)
		ON CONFLICT DO NOTHING;
	`
	result := DB.Exec(migrationSQL)
	if result.Error != nil {
		return fmt.Errorf("area supervisor migration failed: %w", result.Error)
	}

	if result.RowsAffected > 0 {
		log.Printf("Sprint 17 migration: Migrated %d area supervisor records to employee_areas", result.RowsAffected)
	} else {
		log.Println("Sprint 17 migration: No new records to migrate (already migrated or no matches).")
	}

	return nil
}

func ensureGoodsReceiptWarehouseColumn() error {
	if err := DB.Exec(`
		ALTER TABLE goods_receipts
		ADD COLUMN IF NOT EXISTS warehouse_id uuid
	`).Error; err != nil {
		return err
	}

	if err := DB.Exec(`
		CREATE INDEX IF NOT EXISTS idx_goods_receipts_warehouse_id
		ON goods_receipts (warehouse_id)
	`).Error; err != nil {
		return err
	}

	if err := DB.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1
				FROM pg_constraint
				WHERE conname = 'fk_goods_receipts_warehouse'
			) THEN
				ALTER TABLE goods_receipts
				ADD CONSTRAINT fk_goods_receipts_warehouse
				FOREIGN KEY (warehouse_id)
				REFERENCES warehouses(id)
				ON UPDATE CASCADE
				ON DELETE SET NULL;
			END IF;
		END $$;
	`).Error; err != nil {
		return err
	}

	return nil
}

func ensureSalesCustomerContactColumns() error {
	if err := DB.Exec(`
		ALTER TABLE sales_quotations
		ADD COLUMN IF NOT EXISTS customer_contact_id uuid
	`).Error; err != nil {
		return err
	}

	if err := DB.Exec(`
		ALTER TABLE sales_orders
		ADD COLUMN IF NOT EXISTS customer_contact_id uuid
	`).Error; err != nil {
		return err
	}

	if err := DB.Exec(`
		CREATE INDEX IF NOT EXISTS idx_sales_quotations_customer_contact_id
		ON sales_quotations (customer_contact_id)
	`).Error; err != nil {
		return err
	}

	if err := DB.Exec(`
		CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_contact_id
		ON sales_orders (customer_contact_id)
	`).Error; err != nil {
		return err
	}

	if err := DB.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1
				FROM pg_constraint
				WHERE conname = 'fk_sales_quotations_customer_contact'
			) THEN
				ALTER TABLE sales_quotations
				ADD CONSTRAINT fk_sales_quotations_customer_contact
				FOREIGN KEY (customer_contact_id)
				REFERENCES crm_contacts(id)
				ON UPDATE CASCADE
				ON DELETE SET NULL;
			END IF;
		END $$;
	`).Error; err != nil {
		return err
	}

	if err := DB.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1
				FROM pg_constraint
				WHERE conname = 'fk_sales_orders_customer_contact'
			) THEN
				ALTER TABLE sales_orders
				ADD CONSTRAINT fk_sales_orders_customer_contact
				FOREIGN KEY (customer_contact_id)
				REFERENCES crm_contacts(id)
				ON UPDATE CASCADE
				ON DELETE SET NULL;
			END IF;
		END $$;
	`).Error; err != nil {
		return err
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

		// HRD employee certification search indexes (Sprint 14)
		"CREATE INDEX IF NOT EXISTS idx_employee_certifications_name_gin ON employee_certifications USING gin (certificate_name gin_trgm_ops)",
		"CREATE INDEX IF NOT EXISTS idx_employee_certifications_issued_by_gin ON employee_certifications USING gin (issued_by gin_trgm_ops)",

		// HRD employee asset search indexes (Sprint 14)
		"CREATE INDEX IF NOT EXISTS idx_employee_assets_name_gin ON employee_assets USING gin (asset_name gin_trgm_ops)",
		"CREATE INDEX IF NOT EXISTS idx_employee_assets_code_gin ON employee_assets USING gin (asset_code gin_trgm_ops)",
		"CREATE INDEX IF NOT EXISTS idx_employee_assets_category_gin ON employee_assets USING gin (asset_category gin_trgm_ops)",

		// HRD evaluation search indexes (Sprint 15)
		"CREATE INDEX IF NOT EXISTS idx_evaluation_groups_name_gin ON evaluation_groups USING gin (name gin_trgm_ops)",
		"CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_name_gin ON evaluation_criteria USING gin (name gin_trgm_ops)",
		// HRD recruitment search indexes (Sprint 15)
		"CREATE INDEX IF NOT EXISTS idx_recruitment_requests_code_gin ON recruitment_requests USING gin (request_code gin_trgm_ops)",
		"CREATE INDEX IF NOT EXISTS idx_recruitment_requests_desc_gin ON recruitment_requests USING gin (job_description gin_trgm_ops)",
		// HRD recruitment applicant search indexes
		"CREATE INDEX IF NOT EXISTS idx_recruitment_applicants_name_gin ON recruitment_applicants USING gin (full_name gin_trgm_ops)",
		"CREATE INDEX IF NOT EXISTS idx_recruitment_applicants_email_gin ON recruitment_applicants USING gin (email gin_trgm_ops)",
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
	// Check environment variable DROP_TABLES or DROP_ALL_TABLES (from package.json scripts)
	dropTables := os.Getenv("DROP_TABLES")
	if dropTables == "" {
		dropTables = os.Getenv("DROP_ALL_TABLES")
	}

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

// migrateEmployeeContractData migrates contract data from employees table to employee_contracts table
// and removes contract fields from employees table
func migrateEmployeeContractData() error {
	// Check if employees table has contract columns
	var hasContractStatus bool
	err := DB.Raw(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = CURRENT_SCHEMA() AND table_name = 'employees' AND column_name = 'contract_status'
		)
	`).Scan(&hasContractStatus).Error
	if err != nil {
		return fmt.Errorf("check contract_status column: %w", err)
	}

	if !hasContractStatus {
		log.Println("Employee contract data migration: contract fields already removed from employees table")
		return nil
	}

	log.Println("Migrating contract data from employees table to employee_contracts table...")

	// Migrate existing contract data to employee_contracts table
	// Only migrate employees that have contract_status set
	result := DB.Exec(`
		INSERT INTO employee_contracts (
			id, employee_id, contract_number, contract_type, start_date, end_date, 
			document_path, status, created_at, updated_at
		)
		SELECT 
			gen_random_uuid(),
			id,
			'EMP-' || employee_code || '-INITIAL',
			CASE 
				WHEN contract_status = 'permanent' THEN 'PKWTT'
				WHEN contract_status = 'contract' THEN 'PKWT'
				WHEN contract_status = 'intern' THEN 'Intern'
				ELSE 'PKWTT'
			END,
			contract_start_date,
			contract_end_date,
			NULL,
			'ACTIVE',
			NOW(),
			NOW()
		FROM employees
		WHERE contract_status IS NOT NULL 
			AND contract_status != ''
			AND NOT EXISTS (
				SELECT 1 FROM employee_contracts ec 
				WHERE ec.employee_id = employees.id
			)
	`)

	if result.Error != nil {
		return fmt.Errorf("migrate contract data: %w", result.Error)
	}

	log.Printf("Migrated %d employee contracts", result.RowsAffected)

	// Drop contract columns from employees table
	columnsToDrop := []string{
		"contract_status",
		"contract_start_date",
		"contract_end_date",
	}

	for _, col := range columnsToDrop {
		var hasCol bool
		err := DB.Raw(`
			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_schema = CURRENT_SCHEMA() AND table_name = 'employees' AND column_name = ?
			)
		`, col).Scan(&hasCol).Error
		if err != nil {
			return fmt.Errorf("check column %s: %w", col, err)
		}

		if hasCol {
			dropSQL := fmt.Sprintf("ALTER TABLE employees DROP COLUMN IF EXISTS %s", col)
			if err := DB.Exec(dropSQL).Error; err != nil {
				return fmt.Errorf("drop column %s: %w", col, err)
			}
			log.Printf("Dropped column employees.%s", col)
		}
	}

	log.Println("Employee contract data migration completed successfully")
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

// migrateTimezoneData creates timezone tables and inserts Indonesia timezone data
func migrateTimezoneData() error {
	log.Println("Migrating timezone data...")

	// Create timezone tables if not exist
	err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS countries (
			country_code CHAR(2) PRIMARY KEY,
			country_name VARCHAR(45)
		);

		CREATE TABLE IF NOT EXISTS time_zones (
			id SERIAL PRIMARY KEY,
			zone_name VARCHAR(35) NOT NULL,
			country_code CHAR(2) REFERENCES countries(country_code),
			abbreviation VARCHAR(6) NOT NULL,
			time_start BIGINT NOT NULL,
			gmt_offset INT NOT NULL,
			dst CHAR(1) NOT NULL
		);

		CREATE INDEX IF NOT EXISTS idx_time_zones_zone_name ON time_zones(zone_name);
		CREATE INDEX IF NOT EXISTS idx_time_zones_country_code ON time_zones(country_code);
		CREATE INDEX IF NOT EXISTS idx_time_zones_time_start ON time_zones(time_start);
	`).Error
	if err != nil {
		return fmt.Errorf("failed to create timezone tables: %w", err)
	}

	// Insert Indonesia country
	err = DB.Exec(`
		INSERT INTO countries (country_code, country_name) VALUES (ID, Indonesia)
		ON CONFLICT (country_code) DO NOTHING;
	`).Error
	if err != nil {
		return fmt.Errorf("failed to insert Indonesia country: %w", err)
	}

	// Insert Indonesia timezones (WIB, WITA, WIT)
	err = DB.Exec(`
		INSERT INTO time_zones (zone_name, country_code, abbreviation, time_start, gmt_offset, dst) VALUES
		(Asia/Jakarta, ID, WIB, 0, 25200, 0),
		(Asia/Makassar, ID, WITA, 0, 28800, 0),
		(Asia/Jayapura, ID, WIT, 0, 32400, 0)
		ON CONFLICT DO NOTHING;
	`).Error
	if err != nil {
		return fmt.Errorf("failed to insert Indonesia timezones: %w", err)
	}

	log.Println("Timezone data migration completed")
	return nil
}
