# Core - GORM Tenant Scoping via `database.GetDB()`

> **Module:** Core Infrastructure  
> **Sprint:** 16+  
> **Version:** 1.0.0  
> **Status:** ⚠️ Partially Complete — audit LeadProductItem masih pending  
> **Last Updated:** April 2026

---

## Table of Contents

1. [Ringkasan Masalah](#ringkasan-masalah)
2. [Mekanisme `GetDB()`](#mekanisme-getdb)
3. [Root Cause — ErrInvalidField pada INSERT](#root-cause--errinvalidfield-pada-insert)
4. [Gejala & Diagnosis](#gejala--diagnosis)
5. [Cara Fix](#cara-fix)
6. [Tabel Audit Model](#tabel-audit-model)
7. [Exception — Platform-Wide Tables](#exception--platform-wide-tables)
8. [Checklist untuk Developer](#checklist-untuk-developer)
9. [Notes & Improvements](#notes--improvements)

---

## Ringkasan Masalah

Fungsi `database.GetDB()` menambahkan klausul `WHERE tenant_id = ?` ke **semua** query GORM yang dijalankan dalam konteks tenant (authenticated request). Ini bekerja dengan benar untuk SELECT, UPDATE, dan DELETE.

Namun, untuk operasi **CREATE (INSERT)**, GORM akan mencoba meng-assign nilai `tenant_id` ke kolom model melalui WHERE clause yang sama. Jika model tidak memiliki field `TenantID`, GORM mengembalikan `gorm.ErrInvalidField` — yang kemudian menjadi HTTP 500 "invalid field".

**Bug ini pertama kali ditemukan** saat mengedit Deal yang memiliki product items. `DealProductItem` dan `DealHistory` tidak memiliki field `TenantID`, sehingga setiap kali Deal di-create atau di-update dengan items, backend mengembalikan 500.

---

## Mekanisme `GetDB()`

File: `apps/api/internal/core/infrastructure/database/transaction.go`

```go
func GetDB(ctx context.Context, fallback *gorm.DB) *gorm.DB {
    v := ctx.Value(contextKey("tenant_id"))
    if v == nil {
        return fallback
    }
    db := fallback
    if tid, ok := v.(string); ok && tid != "" {
        return db.Where("tenant_id = ?", tid)  // ← Propagate ke INSERT juga!
    }
    return db
}
```

Fungsi ini dipanggil di setiap repository method yang membutuhkan tenant scoping:

```go
// Contoh penggunaan di repository
func (r *dealRepo) Create(ctx context.Context, deal *models.Deal) error {
    db := database.GetDB(ctx, r.db)
    return db.Create(deal).Error
}
```

### Bagaimana GORM Memproses WHERE pada CREATE

Ketika `db.Where("tenant_id = ?", "uuid-xxx").Create(&deal)` dipanggil, GORM melakukan:

1. Menganalisis WHERE clause untuk menemukan kolom yang perlu di-set
2. Mencari field `TenantID` (mapped ke kolom `tenant_id`) di struct model
3. **Jika field tidak ada** → `gorm.ErrInvalidField` → query dibatalkan

Perilaku ini tidak berlaku untuk SELECT karena WHERE hanya memfilter — tidak meng-assign nilai ke field.

---

## Root Cause — ErrInvalidField pada INSERT

### Alur Error (tanpa field TenantID)

```
Authenticated Request
        ↓
Context: tenant_id = "company-uuid-xxx"
        ↓
repository.Create(ctx, deal)
        ↓
database.GetDB(ctx, r.db)
        ↓
db.Where("tenant_id = ?", "company-uuid-xxx")
        ↓
db.Create(&deal)  ← GORM scans model fields
        ↓
DealProductItem tidak punya TenantID field
        ↓
gorm.ErrInvalidField: "invalid field found for struct 'DealProductItem'"
        ↓
HTTP 500 "invalid field"
```

### Alur Normal (dengan field TenantID)

```
Authenticated Request
        ↓
database.GetDB(ctx, r.db)
        ↓
db.Where("tenant_id = ?", "company-uuid-xxx")
        ↓
db.Create(&dealProductItem)
        ↓
GORM assigns: dealProductItem.TenantID = "company-uuid-xxx"
        ↓
INSERT INTO crm_deal_items (tenant_id, ...) VALUES ("company-uuid-xxx", ...)
        ↓
✅ Sukses
```

---

## Gejala & Diagnosis

### Gejala Khas

| Gejala | Nilai |
|--------|-------|
| HTTP Status | 500 |
| Error message | "invalid field" atau "gorm: invalid field found for struct '...'" |
| Hanya terjadi saat | CREATE (POST request) — bukan GET/UPDATE/DELETE |
| Hanya terjadi ketika | Request dari authenticated user (ada tenant_id di context) |
| Tidak terjadi saat | Seeder, migration, atau request tanpa tenant context |

### Cara Diagnosis

1. Cek log backend — cari `gorm.ErrInvalidField`
2. Perhatikan: apakah error hanya muncul saat membuat entitas baru (POST)?
3. Perhatikan: apakah entitas tersebut punya child models yang di-create bersamaan?
4. Cek child model structs — apakah ada `TenantID string` field?

```bash
# Cari model yang mungkin tidak punya TenantID
grep -r "type.*struct" apps/api/internal/crm/data/models/ | grep -v "TenantID"
```

---

## Cara Fix

Tambahkan field `TenantID` ke struct model yang kurang:

```go
// ✅ POLA YANG BENAR
type DealProductItem struct {
    ID       string `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
    DealID   string `gorm:"type:uuid;not null;index" json:"deal_id"`
    TenantID string `gorm:"column:tenant_id;type:uuid;index" json:"tenant_id,omitempty"` // ← WAJIB
    // ... field lainnya
}
```

### Tag yang Harus Digunakan (Exact)

```go
TenantID string `gorm:"column:tenant_id;type:uuid;index" json:"tenant_id,omitempty"`
```

Penjelasan tag:
- `column:tenant_id` — nama kolom di database
- `type:uuid` — tipe PostgreSQL
- `index` — index untuk performa query
- `json:"tenant_id,omitempty"` — tidak di-serialize jika kosong

### ⚠️ Apakah Perlu Migration DB?

**Ya**, jika tabel sudah ada dan kolom `tenant_id` belum ada. GORM AutoMigrate akan menambahkan kolom secara otomatis saat server restart.

Jika ingin manual:
```sql
ALTER TABLE crm_deal_items ADD COLUMN tenant_id uuid;
CREATE INDEX idx_crm_deal_items_tenant_id ON crm_deal_items(tenant_id);
```

---

## Tabel Audit Model

### Modul CRM

| Model | File | Baris | Status |
|-------|------|-------|--------|
| `Deal` | `crm/data/models/deal.go` | ~30 | ✅ Sudah punya TenantID |
| `DealProductItem` | `crm/data/models/deal.go` | ~116 | ✅ Fix April 2026 |
| `DealHistory` | `crm/data/models/deal.go` | ~157 | ✅ Fix April 2026 |
| `Lead` | `crm/data/models/lead.go` | ~30 | ✅ Sudah punya TenantID |
| `LeadProductItem` | `crm/data/models/lead.go` | ~171 | ⚠️ **BELUM DIAUDIT** |
| `PipelineStage` | `crm/data/models/pipeline_stage.go` | - | ℹ️ Perlu audit |
| `Contact` | `crm/data/models/contact.go` | - | ℹ️ Perlu audit |
| `CRMTask` | `crm/data/models/task.go` | - | ℹ️ Perlu audit |
| `Schedule` | `crm/data/models/schedule.go` | - | ℹ️ Perlu audit |
| `VisitReport` | `crm/data/models/visit_report.go` | - | ℹ️ Perlu audit |

### Modul Lain (Perlu Audit)

Setiap modul yang memiliki child models (one-to-many relationship) berpotensi terkena bug ini. Prioritas audit:

| Modul | Child Models yang Perlu Dicek |
|-------|-------------------------------|
| Finance | Invoice items, Purchase order items |
| HRD | Attendance details, Leave request details |
| Inventory | Stock movement details |

---

## Exception — Platform-Wide Tables

Tidak semua model membutuhkan field `TenantID`. Model yang **tidak** menggunakan `database.GetDB()` dan sebagai gantinya menggunakan `r.db.WithContext(ctx)` langsung tidak perlu field ini:

```go
// Model platform-wide — TIDAK perlu TenantID
func (r *userRepo) Create(ctx context.Context, user *models.User) error {
    return r.db.WithContext(ctx).Create(user).Error  // ← Tidak pakai GetDB()
}
```

Contoh model yang tidak perlu TenantID:
- `User` (platform-wide)
- `Role`, `Permission`
- `Company`, `Tenant`
- Konfigurasi global

**Cara mengidentifikasi:** Lihat implementasi repository-nya. Jika `database.GetDB(ctx, r.db)` digunakan, model-nya perlu `TenantID`.

---

## Checklist untuk Developer

Gunakan checklist ini saat membuat model GORM baru:

### Saat Membuat Model Baru

- [ ] Apakah model ini di-create via repository yang menggunakan `database.GetDB()`?
- [ ] Jika ya: apakah struct model punya field `TenantID string`?
- [ ] Apakah tag GORM-nya benar: `gorm:"column:tenant_id;type:uuid;index"`?
- [ ] Apakah sudah di-test dengan authenticated request (bukan seeder/migration)?
- [ ] Apakah ada relasi child model lain yang juga perlu di-audit?

### Saat Debug HTTP 500 "invalid field"

- [ ] Apakah error terjadi hanya pada operasi CREATE?
- [ ] Apakah request dilakukan oleh authenticated user (bukan seeder)?
- [ ] Cek semua model yang terlibat dalam transaksi — semua punya `TenantID`?
- [ ] Lihat log GORM untuk nama struct yang menyebabkan error

### Anti-Pattern yang Harus Dihindari

```go
// ❌ SALAH — child model tanpa TenantID
type InvoiceItem struct {
    ID        string  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
    InvoiceID string  `gorm:"type:uuid;not null;index" json:"invoice_id"`
    // ... tidak ada TenantID!
}

// ✅ BENAR — child model dengan TenantID
type InvoiceItem struct {
    ID        string  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
    InvoiceID string  `gorm:"type:uuid;not null;index" json:"invoice_id"`
    TenantID  string  `gorm:"column:tenant_id;type:uuid;index" json:"tenant_id,omitempty"`
    // ... field lainnya
}
```

---

## Notes & Improvements

- **Pendekatan ideal jangka panjang:** Buat interface atau embedded struct `TenantScoped` yang otomatis meng-handle TenantID, sehingga developer tidak perlu ingat menambahkannya secara manual.
- **Lint rule:** Pertimbangkan membuat custom linter yang memperingatkan jika model di folder `data/models/` tidak memiliki `TenantID` (kecuali dikecualikan secara eksplisit).
- **Audit model lain:** Prioritaskan audit `LeadProductItem` karena modul CRM Lead aktif digunakan.
- **Known model belum diaudit:** `LeadProductItem` di `crm/data/models/lead.go` — harus dicek sebelum fitur Lead dengan products di-deploy ke produksi.
