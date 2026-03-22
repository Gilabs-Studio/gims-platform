package seeders

import "log"

// seedMinimalData creates a small, deterministic dataset suitable for debugging
// and financial validation. This mode is activated via SEED_MINIMAL_DATA=true.
func seedMinimalData() error {
	log.Println("Seeding minimal dataset (SEED_MINIMAL_DATA=true) ...")

	// Start from a small set of master data.
	// Seed master data with minimal variation (seeders will respect minimal mode).
	if err := seedMasterData(); err != nil {
		return err
	}

	// Seed one representative Sales flow (SQ → SO → DO → INV → PAY)
	if err := SeedSalesIntegrationFlow(); err != nil {
		return err
	}

	// Seed one representative Purchase flow (PR → PO → GR → SI → PAY)
	if err := SeedPurchaseFinanceE2E(); err != nil {
		return err
	}

	return nil
}
