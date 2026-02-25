package seeders

import "os"

// SeedAll runs all seeders
func SeedAll() error {
	// Check for cleanup flag
	if os.Getenv("SEED_CLEANUP_DATABASE") == "true" {
		if err := CleanupDatabase(); err != nil {
			return err
		}
	}

	// Seed in order: roles -> menus -> permissions -> users -> geographic
	if err := SeedRoles(); err != nil {
		return err
	}

	if err := SeedMenus(); err != nil {
		return err
	}

	// Update menu structure for existing menus (migration)
	if err := UpdateMenuStructure(); err != nil {
		return err
	}

	if err := SeedPermissions(); err != nil {
		return err
	}

	if err := SeedUsers(); err != nil {
		return err
	}

	// Geographic seeder (Sprint 1)
	if err := SeedGeographic(); err != nil {
		return err
	}

	// Organization seeder (Sprint 2)
	if err := SeedOrganization(); err != nil {
		return err
	}

	// Employee seeder (Sprint 3)
	if err := SeedEmployees(); err != nil {
		return err
	}

	// Supplier seeder (Sprint 4)
	if err := SeedSupplier(); err != nil {
		return err
	}

	// Product seeder (Sprint 4)
	if err := SeedProduct(); err != nil {
		return err
	}

	// Warehouse seeder (Sprint 4)
	if err := SeedWarehouse(); err != nil {
		return err
	}

	// Inventory seeder (Sprint 4)
	if err := SeedInventory(); err != nil {
		return err
	}

	// Master Data seeders (Sprint 4)
	if err := SeedPaymentTerms(); err != nil {
		return err
	}
	if err := SeedCourierAgency(); err != nil {
		return err
	}
	if err := SeedSOSource(); err != nil {
		return err
	}
	if err := SeedLeaveType(); err != nil {
		return err
	}
	if err := SeedBankAccounts(); err != nil {
		return err
	}

	// Purchase Requisition seeder (Sprint 8)
	if err := SeedPurchaseRequisition(); err != nil {
		return err
	}

	// Customer Master Data seeder (must run before Sales seeders)
	if err := SeedCustomerTypes(); err != nil {
		return err
	}
	if err := SeedCustomers(); err != nil {
		return err
	}

	// Sales Quotation seeder (Sprint 5)
	if err := SeedSalesQuotation(); err != nil {
		return err
	}

	// Sales Order seeder (Sprint 6)
	if err := SeedSalesOrder(); err != nil {
		return err
	}

	// Delivery Order seeder (Sprint 6)
	if err := SeedDeliveryOrder(); err != nil {
		return err
	}

	// Customer Invoice seeder (Sprint 7)
	if err := SeedCustomerInvoice(); err != nil {
		return err
	}

	// Finance - Asset & Closing seeder (Sprint 12)
	if err := SeedFinanceSprint12(); err != nil {
		return err
	}

	// Purchase → Finance E2E data (2025-2026) with correct business flows
	if err := SeedPurchaseFinanceE2E(); err != nil {
		return err
	}

	// Integration Flow seeder (Purchase → Stock → Sales → Finance)
	if err := SeedIntegrationFlow(); err != nil {
		return err
	}

	// Sales Visit Interest Questions seeder (Sprint 7)
	if err := SeedSalesVisitInterestQuestions(); err != nil {
		return err
	}

	// Sales Visit seeder (Sprint 7)
	if err := SeedSalesVisit(); err != nil {
		return err
	}

	// Sales Targets seeder (Sprint 7)
	if err := SeedSalesTargets(); err != nil {
		return err
	}

	// HRD - Work Schedules seeder (Sprint 13)
	if err := SeedWorkSchedules(); err != nil {
		return err
	}

	// HRD - Holidays seeder (Sprint 13)
	if err := SeedHolidays(); err != nil {
		return err
	}

	// HRD - Leave Requests seeder (Sprint 13)
	if err := SeedLeaveRequests(); err != nil {
		return err
	}

	// HRD - Attendance Records seeder (Sprint 13)
	if err := SeedAttendanceRecords(); err != nil {
		return err
	}

	// HRD - Overtime Requests seeder (Sprint 13)
	if err := SeedOvertimeRequests(); err != nil {
		return err
	}

	// HRD - Employee Contracts seeder (Sprint 14)
	if err := SeedEmployeeContracts(); err != nil {
		return err
	}

	// HRD - Employee Education History seeder (Sprint 14)
	if err := SeedEmployeeEducationHistory(); err != nil {
		return err
	}

	// HRD - Employee Certifications seeder (Sprint 14)
	if err := SeedEmployeeCertifications(); err != nil {
		return err
	}

	// HRD - Employee Assets seeder (Sprint 14)
	if err := SeedEmployeeAssets(); err != nil {
		return err
	}

	// HRD - Evaluation Groups seeder (Sprint 15)
	if err := SeedEvaluationGroups(); err != nil {
		return err
	}

	// HRD - Evaluation Criteria seeder (Sprint 15)
	if err := SeedEvaluationCriteria(); err != nil {
		return err
	}

	// HRD - Employee Evaluations seeder (Sprint 15)
	if err := SeedEmployeeEvaluations(); err != nil {
		return err
	}

	// HRD - Recruitment Requests seeder (Sprint 15)
	if err := SeedRecruitmentRequests(); err != nil {
		return err
	}

	// Stock Movement seeder (Sprint 9)
	if err := SeedStockMovement(); err != nil {
		return err
	}

	// Stock Opname seeder
	if err := SeedStockOpname(); err != nil {
		return err
	}

	// AI Intent Registry seeder
	if err := SeedAIIntentRegistry(); err != nil {
		return err
	}

	// CRM Settings seeder (Sprint 17)
	if err := SeedCRMSettings(); err != nil {
		return err
	}

	// CRM Contacts seeder (Sprint 18 - depends on customers + contact roles)
	if err := SeedCRMContacts(); err != nil {
		return err
	}

	// CRM Leads seeder (Sprint 19 - depends on lead sources, statuses, employees, customers)
	if err := SeedCRMLeads(); err != nil {
		return err
	}

	// CRM Deals seeder (Sprint 20 - depends on pipeline stages, customers, contacts, employees, products)
	if err := SeedCRMDeals(); err != nil {
		return err
	}

	// CRM Visit Reports seeder (Sprint 22 - depends on employees, customers, contacts, deals, leads)
	if err := SeedCRMVisitReports(); err != nil {
		return err
	}

	// CRM Activities, Tasks & Schedules seeder (Sprint 23 - depends on employees, customers, contacts, activity types)
	if err := SeedCRMActivitiesTasksSchedules(); err != nil {
		return err
	}

	return nil
}
