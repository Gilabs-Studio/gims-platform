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

	return nil
}

