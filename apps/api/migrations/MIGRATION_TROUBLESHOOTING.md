# Production Migration Issues & Solutions
**Date:** May 11, 2026  
**Branch:** fix/app/finance

---

## Summary of Issues Found

Berdasarkan output migration dan error create asset Anda, ada **3 kategori masalah**:

### 1. **Index Creation Errors** (Non-blocking but need to fix)
```
ERROR: column "code" does not exist
ERROR: column "asset_type" does not exist  
ERROR: column "attachment_type" does not exist
ERROR: column "changed_at" does not exist
ERROR: column "is_active" does not exist
```

**Penyebab:** Schema Anda berbeda dengan migration. Misal:
- Kolom `code` di `asset_locations` tidak ada (mungkin sudah di-rename atau tidak di-create)
- Kolom `asset_type` tidak ada di `fixed_assets` (padahal harus ada)
- Kolom `attachment_type` vs `file_type` (ada mismatch nama)
- Kolom `changed_at` vs `performed_at` (ada mismatch nama)

**Solusi:** Sudah saya patch di `20240115_create_fixed_assets_schema.sql` dengan guard IF EXISTS + DO block untuk setiap index.

---

### 2. **Type Casting Error** (Line 291)
```
ERROR: operator does not exist: uuid = character varying
WHERE id IN (SELECT DISTINCT reference_id FROM journal_entries WHERE ...)
```

**Penyebab:** `journal_entries.reference_id` adalah VARCHAR, bukan UUID. Tapi `fixed_assets.id` adalah UUID. Saat di-compare tanpa casting, PostgreSQL error.

**Solusi:** Sudah saya patch di `20260319_extend_fixed_assets_schema.sql`:
```sql
WHERE id IN (SELECT DISTINCT reference_id::UUID FROM journal_entries ...)
```
Tambahan `::UUID` casting untuk konversi aman.

---

### 3. **FK Constraint Violation** (CRITICAL - Blocking Asset Creation)
```json
{
  "error": "ERROR: insert or update on table \"fixed_assets\" violates foreign key constraint \"fk_fixed_assets_company\" (SQLSTATE 23503)"
}
```

**Penyebab:** Saat insert asset baru, constraint FK `fk_fixed_assets_company` di-enforce, tapi:
- Asset tidak punya `company_id` (NULL)
- ATAU `company_id` tidak ada di tabel `companies`
- ATAU FK constraint terlalu ketat untuk data existing

**Solusi:** Sudah saya buat migration baru `20260511_fix_fk_constraint_violations.sql` yang:
1. Detect apakah ada orphan records
2. Drop FK jika ada violations
3. Populate `company_id` dari tenant's first company
4. Recreate FK dengan aman

---

## Langkah Fix di Production

### Step 1: Run Migration Baru untuk Fix FK Violations

```bash
cd apps/api
# Jalankan migration baru
docker exec gims-platform-db psql -U postgres -d gims_erp_db \
  -f migrations/20260511_fix_fk_constraint_violations.sql
```

### Step 2: Verify Hasil dengan VERIFY_MIGRATION.sql

```bash
# Run verification checks
docker exec gims-platform-db psql -U postgres -d gims_erp_db \
  -f migrations/VERIFY_MIGRATION.sql
```

Cari output:
```
✓ MIGRATIONS OK - Ready for production use
```

Jika masih ada error, lakukan:

### Step 3: Manual Fix (Jika Masih Ada Orphan Records)

```bash
# Check orphan records
docker exec gims-platform-db psql -U postgres -d gims_erp_db << 'EOF'
-- Show orphan company_id records
SELECT id, code, company_id FROM fixed_assets 
WHERE company_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = company_id);
EOF
```

Jika ada hasil, jalankan fix:

```bash
docker exec gims-platform-db psql -U postgres -d gims_erp_db << 'EOF'
-- Fix Option 1: Set company_id ke NULL (safest)
UPDATE fixed_assets
SET company_id = NULL
WHERE company_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = company_id);

-- Or Fix Option 2: Assign ke tenant's first company
UPDATE fixed_assets fa
SET company_id = (
  SELECT c.id FROM companies c
  WHERE c.tenant_id = fa.tenant_id
  ORDER BY c.created_at ASC
  LIMIT 1
)
WHERE fa.company_id IS NULL
  AND fa.tenant_id IS NOT NULL;
EOF
```

### Step 4: Test Create Asset

```bash
# Jalankan seeder atau test API
cd apps/api
go run ./cmd/api/main.go
```

Di aplikasi, coba create asset baru. Seharusnya berhasil tanpa FK error.

---

## Root Cause Analysis

**Mengapa FK error terjadi?**

1. **Old Migration ran successfully** → FK `fk_fixed_assets_company` di-create
2. **Existing data tidak valid** → Ada fixed_assets dengan `company_id = NULL` atau reference ke companies yang tidak ada
3. **New constraints enforce immediately** → Saat insert, PostgreSQL cek FK sebelum insert, gagal karena constraint

**Mengapa migration lama tidak catch ini?**

Karena migration original (20260319) tidak guard:
- Tidak check apakah company_id ada di companies table
- Tidak populate data sebelum FK creation
- Tidak DROP FK jika data violate

---

## Migration Files Updated

✅ `20240115_create_fixed_assets_schema.sql` — Fixed index creation dengan guard
✅ `20260319_extend_fixed_assets_schema.sql` — Fixed type casting, guard update
✅ `20260511_fix_fk_constraint_violations.sql` — **NEW** — Handle FK violations
✅ `VERIFY_MIGRATION.sql` — **NEW** — Verification & debugging script

---

## Testing Checklist

- [ ] Run `20260511_fix_fk_constraint_violations.sql`
- [ ] Run `VERIFY_MIGRATION.sql` dan pastikan output OK
- [ ] Test create asset via API (harus succeed)
- [ ] Test create asset via web UI (harus succeed)
- [ ] Check database: `SELECT COUNT(*) FROM fixed_assets;` (harus > 0)
- [ ] Verify no orphan records: `SELECT COUNT(*) FROM fixed_assets WHERE company_id NOT IN (SELECT id FROM companies);` (harus 0)

---

## If Still Getting Errors

### Error: Still seeing FK violation

1. Verify FK status:
```sql
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'fixed_assets' AND constraint_name LIKE 'fk_%';
```

2. If FK still exists but data is clean, FK should not trigger error. Check:
   - Asset memiliki valid `company_id`
   - FK constraint syntax benar
   - Database transaction isolation level tidak meng-override FK

### Error: Asset creation succeeds but data looks wrong

1. Check jika `company_id` NULL:
```sql
SELECT id, code, company_id FROM fixed_assets WHERE code = 'YOUR-ASSET-CODE';
```

2. Jika NULL dan mau assign: Update langsung atau re-create asset

### Error: Migration itself failed

Check error message terakhir di output. Common issues:
- `column does not exist` → Column really doesn't exist, perlu di-create manual
- `table does not exist` → Table not created yet, migration order wrong
- `type casting error` → Data type mismatch, perlu explicit casting

---

## Prevention untuk Masa Depan

1. **Selalu guard FK creation:**
```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_...')
     AND [data is valid] THEN
    ALTER TABLE ... ADD CONSTRAINT fk_...;
  END IF;
END $$;
```

2. **Validate data sebelum FK:**
```sql
-- Before adding FK, fix data
UPDATE table SET column = valid_value WHERE condition;
```

3. **Test migrations di staging dengan real data**

4. **Keep VERIFY script untuk setiap migration set**

---

## Support & Questions

Jika masih ada error setelah steps di atas:
1. Share output dari `VERIFY_MIGRATION.sql`
2. Share SQL error message lengkap
3. Saya akan debug dan provide script fix spesifik

