# Core - Zod v4 Breaking Changes

> **Module:** Frontend Validation  
> **Sprint:** 16+  
> **Version:** Zod v4  
> **Status:** ✅ Fixed di CRM Deal Module — modul lain perlu audit  
> **Last Updated:** April 2026

---

## Table of Contents

1. [Ringkasan](#ringkasan)
2. [Breaking Change 1 — UUID Strictness](#breaking-change-1--uuid-strictness)
3. [Breaking Change 2 — Numeric Null Rejection](#breaking-change-2--numeric-null-rejection)
4. [Helper Pattern Reusable](#helper-pattern-reusable)
5. [File yang Sudah Di-fix](#file-yang-sudah-di-fix)
6. [Checklist Audit untuk Developer](#checklist-audit-untuk-developer)
7. [Notes](#notes)

---

## Ringkasan

Migrasi dari Zod v3 ke Zod v4 memperkenalkan beberapa breaking changes pada validasi schema yang menyebabkan form error muncul padahal data valid — terutama saat memuat data dari API response ke form edit.

Dua breaking change utama yang ditemukan di GIMS Platform:

| # | Masalah | Komponen Zod yang Berubah | Fix |
|---|---------|---------------------------|-----|
| 1 | `z.string().uuid()` menolak UUID valid dari DB | Regex UUID lebih ketat | Ganti ke `z.string()` untuk FK fields |
| 2 | `z.number().optional()` menolak `null` / `NaN` | Parser numeric lebih strict | Tambah `z.preprocess` |

---

## Breaking Change 1 — UUID Strictness

### Problem

`z.string().uuid()` di Zod v4 menerapkan regex UUID yang lebih ketat dibanding v3. UUID valid dari database (misalnya foreign key ke tabel lain) kadang di-reject dengan validation error `"Invalid UUID"`, padahal format UUID-nya secara teknis benar.

Ini terutama muncul untuk **FK fields** (seperti `product_id`, `customer_id`) yang nilainya berasal dari response API dan bukan diinput langsung oleh user.

### Root Cause

Untuk FK fields, validasi UUID di layer Zod tidak memberikan nilai tambah — backend sudah memvalidasi eksistensi entitas via DB query. Strict UUID check di frontend hanya menambah risiko false positive.

### Contoh Error

```
// API response: { product_id: "550e8400-e29b-41d4-a716-446655440000" }
// Form load → Zod parse → ERROR: "Invalid UUID"
```

### Fix

```typescript
// ❌ Zod v3 (berhasil di v3, bermasalah di v4)
product_id: z.string().uuid("Invalid product ID").optional().or(z.literal(""))

// ✅ Zod v4 — biarkan backend yang validasi eksistensi
product_id: z.preprocess(
  (v) => (v === null || v === undefined ? "" : v),
  z.string()
)
```

### Kapan Boleh Tetap Pakai `z.string().uuid()`?

Hanya untuk field yang **wajib diisi user secara langsung** dan tidak berasal dari API response — misalnya form input UUID manual (use case langka). Untuk semua FK dropdown fields, gunakan `z.string()` saja.

---

## Breaking Change 2 — Numeric Null Rejection

### Problem

`z.number().optional().default(0)` di Zod v4 tidak menerima `null` atau `NaN`. Ini menyebabkan validation error pada:

1. **Form load dari API response** — backend mengembalikan `null` untuk field opsional (seperti `discount_percent: null`)
2. **NumericInput yang di-clear user** — komponen NumericInput mengembalikan `NaN` ketika field dikosongkan
3. **Form state stale** — field yang belum disentuh bisa berada dalam state `undefined`

### Root Cause

Zod v4 memperketat parsing numeric: `null`, `undefined`, dan `NaN` tidak secara otomatis di-coerce ke `0`. Developer harus eksplisit menangani kasus-kasus ini.

### Contoh Error

```typescript
// API response: { discount_percent: null, budget_amount: null }
// Form load → Zod parse →
// ERROR: "Expected number, received null" pada discount_percent
// ERROR: "Expected number, received null" pada budget_amount
```

```typescript
// User clear NumericInput → field value = NaN
// User submit → Zod parse →
// ERROR: "Expected number, received nan"
```

### Fix — Gunakan `z.preprocess`

```typescript
// ❌ Zod v3 (berhasil di v3, bermasalah di v4)
discount_percent: z.number().min(0).max(100).optional().default(0)

// ✅ Zod v4 — normalize null/undefined/NaN sebelum validasi
discount_percent: z.preprocess(
  (v) =>
    v === null || v === undefined || (typeof v === "number" && isNaN(v))
      ? 0
      : v,
  z
    .number()
    .min(0, "Discount must be non-negative")
    .max(100, "Discount cannot exceed 100%")
    .optional()
    .default(0),
),
```

### Nilai Default yang Sesuai

| Field Type | Nilai Default Fallback |
|------------|----------------------|
| Optional number (discount, amount) | `0` |
| Required quantity | `1` |
| Price | `0` (lalu validasi `min(0)`) |
| Percentage | `0` |

---

## Helper Pattern Reusable

Untuk mengurangi repetisi, buat helper functions di schema file:

```typescript
// ── Helpers untuk preprocess Zod v4 ──────────────────────────────────

/**
 * Normalize null/undefined → string fallback.
 * Gunakan untuk FK fields dan optional string dari API response.
 */
const nullToStr =
  (fallback = "") =>
  (v: unknown) =>
    v === null || v === undefined ? fallback : v;

/**
 * Normalize null/undefined/NaN → number fallback.
 * Gunakan untuk semua numeric fields yang bisa null dari API.
 */
const nullToNum =
  (fallback = 0) =>
  (v: unknown) =>
    v === null ||
    v === undefined ||
    (typeof v === "number" && isNaN(v as number))
      ? fallback
      : v;

// ── Penggunaan ────────────────────────────────────────────────────────

const schema = z.object({
  // FK string field
  product_id: z.preprocess(nullToStr(""), z.string()),

  // Optional string field
  notes: z.preprocess(nullToStr(""), z.string().max(500)),

  // Required numeric field
  unit_price: z.preprocess(
    nullToNum(0),
    z.number().min(0, "Unit price must be non-negative"),
  ),

  // Optional numeric field dengan range
  discount_percent: z.preprocess(
    nullToNum(0),
    z.number().min(0).max(100).optional().default(0),
  ),

  // Quantity dengan minimum 1
  quantity: z.preprocess(
    nullToNum(1),
    z.number().int().min(1, "Quantity must be at least 1"),
  ),
});
```

---

## File yang Sudah Di-fix

| File | Perubahan | Tanggal |
|------|-----------|---------|
| `apps/web/src/features/crm/deal/schemas/deal.schema.ts` | Semua numeric fields + FK fields pakai preprocess | April 2026 |

### Perubahan Detail di `deal.schema.ts`

**`dealProductItemSchema`:**
- `product_id`: `z.string().uuid().optional()` → `z.preprocess(nullToStr(""), z.string())`
- `product_name`, `product_sku`, `notes`: tambah `z.preprocess(nullToStr(""),...)`
- `unit_price`, `quantity`, `discount_percent`, `discount_amount`: tambah `z.preprocess(nullToNum(n),...)`

**`createDealSchema`:**
- `value`: tambah `z.preprocess(nullToNum(0),...)`
- `budget_amount`: tambah `z.preprocess(nullToNum(0),...)`

---

## Checklist Audit untuk Developer

Gunakan checklist ini saat melakukan audit schema di modul lain:

### Temukan Potensi Masalah

```bash
# Cari semua z.string().uuid() — kandidat false positive
grep -r "z\.string()\.uuid()" apps/web/src/features/ --include="*.ts"

# Cari semua z.number().optional() tanpa preprocess — kandidat null rejection
grep -r "z\.number().*optional" apps/web/src/features/ --include="*.ts"

# Cari semua z.number().default() tanpa preprocess
grep -r "z\.number().*default" apps/web/src/features/ --include="*.ts"
```

### Checklist Per Schema File

- [ ] Semua FK fields (`*_id`) yang datanya dari API response sudah pakai `z.preprocess(nullToStr(""), z.string())`?
- [ ] Semua optional string fields yang bisa `null` dari API sudah pakai `z.preprocess(nullToStr(""), ...)`?
- [ ] Semua numeric fields yang bisa `null`/`NaN` sudah pakai `z.preprocess(nullToNum(n), ...)`?
- [ ] Tidak ada `z.string().uuid()` untuk FK fields yang diisi dari dropdown?
- [ ] Form di-test dengan data yang di-load dari API response (bukan hanya form kosong)?

### Modul yang Perlu Diaudit

| Modul | Schema Files | Prioritas |
|-------|-------------|-----------|
| CRM Lead | `lead/schemas/lead.schema.ts` | Tinggi |
| CRM Contact | `contact/schemas/contact.schema.ts` | Tinggi |
| Finance Invoice | `invoice/schemas/*.ts` | Sedang |
| Finance Purchase | `purchase/schemas/*.ts` | Sedang |
| HRD | `hrd/schemas/*.ts` | Sedang |

---

## Notes

- **Zod v4 tidak backward-compatible** untuk kasus null/NaN — ini adalah breaking change yang disengaja oleh Zod team untuk membuat validasi lebih explicit.
- **Pattern `z.preprocess`** adalah cara idiomatis Zod v4 untuk menangani coercion sebelum validasi.
- **Jangan gunakan `z.coerce.number()`** sebagai shortcut — ini bisa menyembunyikan bug (misalnya string "abc" akan di-coerce ke `NaN` tanpa error).
- **Test form edit** selalu lebih penting dari form create — form edit memuat data dari API yang bisa mengandung `null` fields.
