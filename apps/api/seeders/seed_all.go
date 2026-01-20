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

	return nil
}

