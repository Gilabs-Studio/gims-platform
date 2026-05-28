-- Migration: 20260526_add_kimia_farma_company.sql
-- Author: AI Agent (Antigravity)
-- Purpose: Menambahkan data company "PT. Kimia Farma" yang direferensikan oleh
--          outlet Kimia Farma Cabang Pondok Indah (0e000001-0000-0000-0000-000000000004)
--          tapi tidak ada di tabel companies.
--
--          Log error yang ditemukan:
--          SELECT * FROM "companies" WHERE id = '1a2b3c4d-5e6f-7a8b-9c0d-000000000002'
--          → rows:0
--
-- Rollback:
--   DELETE FROM companies WHERE id = '1a2b3c4d-5e6f-7a8b-9c0d-000000000002';

INSERT INTO companies (
    id,
    tenant_id,
    name,
    address,
    email,
    phone,
    npwp,
    nib,
    timezone,
    status,
    is_approved,
    is_active,
    created_at,
    updated_at
)
VALUES (
    '1a2b3c4d-5e6f-7a8b-9c0d-000000000002',
    'a0000001-0000-0000-0000-000000000001',
    'PT. Kimia Farma',
    'Jl. Budi Kemuhardjo No.1, Jakarta Pusat',
    'info@kimiafarma.co.id',
    '021-3847-000',
    '01.000.001.0-001.000',
    '8120000000001',
    'Asia/Jakarta',
    'approved',
    true,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;
