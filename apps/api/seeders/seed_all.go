package seeders

// SeedAll runs all seeders
func SeedAll() error {
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

	// Sales Estimation seeder (Sprint 8)
	if err := SeedSalesEstimation(); err != nil {
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
	
	// Stock Movement seeder (Sprint 9)
	if err := SeedStockMovement(); err != nil {
		return err
	}

	// Stock Opname seeder
	if err := SeedStockOpname(); err != nil {
		return err
	}

	return nil
}

