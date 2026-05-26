-- Migration: 20260526_add_pos_catalog_index.sql
-- Author: AI Agent (Antigravity)
-- Purpose: Menambahkan composite index pada tabel `products` untuk mempercepat
--          query katalog POS yang teridentifikasi SLOW SQL (>= 100ms).
--
--          Query problematik:
--          SELECT * FROM "products"
--          WHERE tenant_id = ?
--            AND deleted_at IS NULL AND status = 'approved'
--            AND is_approved = true AND is_active = true
--            AND pos_scope IN ('global', 'specific')
--            AND (pos_scope = 'global' OR EXISTS (
--              SELECT 1 FROM product_outlets
--              WHERE product_id = products.id AND outlet_id = ? AND deleted_at IS NULL
--            ))
--          ORDER BY name ASC
--
--          Index pada `product_outlets` untuk mempercepat correlated EXISTS subquery.
--
-- Rollback:
--   DROP INDEX IF EXISTS idx_products_pos_catalog;
--   DROP INDEX IF EXISTS idx_product_outlets_pos_lookup;

-- 1. Composite index pada products untuk kondisi filter POS catalog
CREATE INDEX IF NOT EXISTS idx_products_pos_catalog
    ON products (tenant_id, pos_scope, status, is_approved, is_active, deleted_at, name)
    WHERE deleted_at IS NULL;

-- 2. Composite index pada product_outlets untuk correlated EXISTS subquery
--    (product_id + outlet_id + deleted_at) — covering index untuk EXISTS
CREATE INDEX IF NOT EXISTS idx_product_outlets_pos_lookup
    ON product_outlets (product_id, outlet_id, deleted_at)
    WHERE deleted_at IS NULL;
