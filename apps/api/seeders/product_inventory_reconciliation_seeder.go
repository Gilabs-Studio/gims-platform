package seeders

import (
	"fmt"
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
)

// ReconcileProductInventoryAggregates syncs product stock and HPP from inventory batches.
// This keeps seeded data consistent for stock validation and valuation scenarios.
func ReconcileProductInventoryAggregates() error {
	log.Println("Reconciling product inventory aggregates from batches...")

	db := database.DB

	err := db.Exec(`
		WITH batch_totals AS (
			SELECT
				p.id AS product_id,
				COALESCE(SUM(CASE WHEN ib.is_active = true AND ib.deleted_at IS NULL THEN ib.current_quantity ELSE 0 END), 0) AS total_stock,
				COALESCE(SUM(CASE WHEN ib.is_active = true AND ib.deleted_at IS NULL THEN ib.reserved_quantity ELSE 0 END), 0) AS total_reserved,
				COALESCE(SUM(
					CASE
						WHEN ib.is_active = true AND ib.deleted_at IS NULL THEN
							ib.current_quantity * COALESCE(NULLIF(ib.cost_price, 0), NULLIF(p.cost_price, 0), NULLIF(p.current_hpp, 0), 1)
						ELSE 0
					END
				), 0) AS weighted_value,
				COALESCE(SUM(CASE WHEN ib.is_active = true AND ib.deleted_at IS NULL THEN ib.current_quantity ELSE 0 END), 0) AS weighted_qty
			FROM products p
			LEFT JOIN inventory_batches ib ON ib.product_id = p.id
			WHERE p.deleted_at IS NULL
			GROUP BY p.id
		)
		UPDATE products p
		SET
			current_stock = bt.total_stock,
			reserved_stock = LEAST(bt.total_reserved, bt.total_stock),
			current_hpp = CASE
				WHEN bt.weighted_qty > 0 THEN ROUND((bt.weighted_value / bt.weighted_qty)::numeric, 2)
				ELSE COALESCE(NULLIF(p.current_hpp, 0), NULLIF(p.cost_price, 0), 0)
			END,
			updated_at = NOW()
		FROM batch_totals bt
		WHERE p.id = bt.product_id
	`).Error
	if err != nil {
		return fmt.Errorf("failed to reconcile product inventory aggregates: %w", err)
	}

	log.Println("Product inventory aggregates reconciled successfully")
	return nil
}
