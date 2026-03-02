# Core - International Timezone Support (`apptime`)

> **Module:** Core Infrastructure  
> **Sprint:** 15+  
> **Version:** 2.0.0  
> **Status:** ✅ Complete (Phase 1: Global + Phase 2: Per-Company for HRD)  
> **Last Updated:** July 2025

---

## Table of Contents

1. [Ringkasan Fitur](#ringkasan-fitur)
2. [Fitur Utama](#fitur-utama)
3. [Business Rules](#business-rules)
4. [Keputusan Teknis & Trade-offs](#keputusan-teknis--trade-offs)
5. [Struktur Folder](#struktur-folder)
6. [API / Package Reference](#api--package-reference)
7. [Configuration](#configuration)
8. [Migration Guide](#migration-guide)
9. [Cara Test Manual](#cara-test-manual)
10. [Automated Testing](#automated-testing)
11. [Dependencies](#dependencies)
12. [Related Issues / PRs](#related-issues--prs)
13. [Notes & Improvements](#notes--improvements)

---

## Ringkasan Fitur

Package `apptime` menyediakan **centralized, timezone-aware time source** untuk seluruh backend GIMS Platform. Semua business logic yang bergantung pada waktu (attendance, invoicing, code generation, reporting, dsb.) menggunakan timezone yang dikonfigurasi via environment variable, bukan lagi `time.Now()` yang mengikuti timezone OS/container.

### Phase 1 — Global Timezone (v1.0)

**Root Cause:** Docker container default menggunakan UTC. Ketika waktu di Indonesia (WIB, UTC+7) adalah **Senin pagi pukul 00:00–06:59**, di UTC masih **Minggu**. Kode `time.Now().Weekday()` mengembalikan `Sunday` → `IsWorkingDay()` return `false` → frontend menampilkan **"Clock In — Day Off"** padahal hari Senin.

**Solution:** Semua bare `time.Now()` (230+ lokasi) diganti dengan `apptime.Now()` yang selalu mengembalikan waktu dalam timezone bisnis yang dikonfigurasi (`Asia/Jakarta` by default).

### Phase 2 — Per-Company Timezone (v2.0)

**Problem:** Dengan satu global timezone, perusahaan multi-cabang yang beroperasi di timezone berbeda (WIB/WITA/WIT, atau internasional) tidak bisa mendapatkan kalkulasi kehadiran, cuti, dan lembur yang akurat.

**Solution:** `CompanyTimezoneProvider` interface pattern yang memungkinkan:
- Setiap company memiliki `timezone` field (IANA string)
- HRD module (attendance, leave, overtime, auto-absent) menggunakan per-employee timezone via `NowForEmployee()`, `LocationForEmployee()`
- Holiday model mendukung company-scoped holidays via `company_id` field
- Auto-absent worker memproses setiap company group di timezone masing-masing
- DB columns migrated ke `timestamptz` dengan DSN `TimeZone=UTC`

---

## Fitur Utama

### Phase 1 — Global
- **Configurable timezone** via `APP_TIMEZONE` env var (IANA format: `Asia/Jakarta`, `America/New_York`, dll.)
- **Single initialization** — `sync.Once` memastikan `Init()` hanya berjalan sekali
- **Graceful fallback** — Jika IANA timezone gagal di-load (missing tzdata), fallback ke fixed UTC+7 (WIB)
- **Drop-in replacement** — `apptime.Now()` menggantikan `time.Now()` tanpa perlu mengubah signature apapun
- **Helper functions** — `Today()`, `StartOfMonth()`, `Location()` untuk use-case common
- **Zero-downtime migration** — Tidak ada schema change, hanya behavior change pada waktu

### Phase 2 — Per-Company
- **Per-company timezone** — Company model memiliki `timezone varchar(50)` dengan default `Asia/Jakarta`
- **CompanyTimezoneProvider** — Interface pattern (`resolver.go`) agar apptime bisa resolve timezone tanpa circular import
- **Location cache** — `sync.RWMutex` + `map[string]*time.Location` agar `time.LoadLocation()` hanya dipanggil sekali per timezone
- **Per-employee helpers** — `NowForEmployee()`, `LocationForEmployee()`, `TodayForEmployee()`, `StartOfMonthForEmployee()`
- **Per-company helpers** — `NowForCompany()`, `LocationForCompany()`, `TodayForCompany()`
- **Company-scoped holidays** — Holiday model dengan `company_id` nullable: NULL = global, non-NULL = company-specific
- **Per-timezone auto-absent** — Worker iterates company groups, menghitung "kemarin" di timezone masing-masing
- **timestamptz migration** — HRD model columns migrated ke `timestamptz`, DSN `TimeZone=UTC`

---

## Business Rules

### 1. Timezone Resolution
- Global timezone di-resolve **sekali saat startup** dari `APP_TIMEZONE` env var
- Default: `Asia/Jakarta` (WIB, UTC+7) jika tidak diset
- Menggunakan IANA Time Zone Database (standard Go `time.LoadLocation()`)
- **Per-company timezone** di-resolve via `CompanyTimezoneProvider` dari DB (column `companies.timezone`)
- **Per-employee timezone** = timezone dari company tempat employee bekerja (`employees.company_id → companies.timezone`)
- **Fallback chain:** employee → company → global default (`Asia/Jakarta`)
- **Cache:** In-memory 5-minute TTL untuk timezone provider, `*time.Location` cached forever per IANA string

### 2. Holiday Scoping (Phase 2)
- `company_id IS NULL` → Global holiday (NATIONAL, COLLECTIVE) — berlaku untuk semua company
- `company_id = <uuid>` → Company-specific holiday — hanya berlaku untuk company tersebut
- Query pattern: `WHERE (company_id IS NULL OR company_id = ?)` — selalu include global holidays

### 2. Affected Business Logic

| Domain | Impact |
|--------|--------|
| **Attendance** | Weekday calculation (IsWorkingDay), auto-absent worker schedule, check-in/out timestamps |
| **Overtime** | Overtime duration calculation, monthly overtime report period |
| **Leave Request** | Working days calculation, leave balance period |
| **Sales** | Invoice code generation (date prefix), quotation validity period |
| **Purchase** | PO/GR code generation, supplier invoice dates |
| **Finance** | Journal entries, financial closing periods, aging reports, asset depreciation |
| **CRM** | Activity timestamps, visit report dates, deal stage transitions |
| **Report** | Monthly/yearly aggregation, period boundaries |
| **Auth/JWT** | Token issued-at & expiry timestamps |
| **Audit** | Audit trail timestamps |

### 3. Excluded from Migration (Intentional)
- `response.go: generateRequestID()` — Hanya butuh monotonic uniqueness, bukan business timezone
- `response.go: randomString()` — Seed untuk random generation, timezone-irrelevant
- Test files (`*_test.go`) — Tidak di-migrate karena test harus explicit tentang timezone
- `apptime.go` sendiri — Package source, bukan consumer

---

## Keputusan Teknis & Trade-offs

### Mengapa centralized package, bukan global `time.Local`?

**Keputusan:** Membuat package `apptime` daripada set `time.Local` global.

**Alasan:**
- Setting `time.Local` mengubah behavior **seluruh proses**, termasuk third-party libraries yang mungkin expect UTC
- `apptime.Now()` explicit dan searchable — mudah di-grep untuk audit
- Lebih testable — bisa di-mock atau di-override untuk unit test
- Tidak ada side effect ke library GORM, Gin, atau dependency lainnya

**Trade-off:** Developer harus ingat menggunakan `apptime.Now()` bukan `time.Now()`. Mitigasi: CI lint rule bisa mendeteksi bare `time.Now()`.

### Mengapa `sync.Once` + `ensureInit()`?

**Keputusan:** Init menggunakan `sync.Once` dan setiap public function memanggil `ensureInit()`.

**Alasan:**
- Mencegah race condition pada concurrent access
- Aman jika ada package yang memanggil `apptime.Now()` sebelum `main()` memanggil `Init()`
- `ensureInit()` memberikan fallback ke `Asia/Jakarta` tanpa panic

**Trade-off:** Slight overhead dari nil-check pada setiap call. Dalam praktik, overhead negligible karena hanya satu atomic check.

### Mengapa fallback ke fixed UTC+7, bukan panic?

**Keputusan:** Jika `time.LoadLocation()` gagal, gunakan `time.FixedZone("WIB", 7*60*60)` dan log warning.

**Alasan:**
- Aplikasi tetap bisa berjalan meskipun container tidak punya tzdata
- Log warning cukup untuk developer/ops men-detect masalah
- Panic saat startup terlalu harsh untuk timezone resolution failure

**Trade-off:** Fixed zone tidak handle DST (jika di masa depan dibutuhkan untuk timezone yang punya DST). Solusi: Pastikan container include tzdata package.

---

## Struktur Folder

```
apps/api/internal/core/apptime/
├── apptime.go              # Init, Now, Location, Today, StartOfMonth, NowIn, TodayIn, StartOfMonthIn, ResolveLocation (+ location cache)
└── resolver.go             # CompanyTimezoneProvider interface, RegisterProvider, NowForCompany/Employee, LocationForCompany/Employee, etc.

apps/api/internal/organization/data/repositories/
└── timezone_provider.go    # Concrete CompanyTimezoneProvider implementation (DB + 5-min cache)
```

**Files yang di-modify (100+ files across all domains):**

```
apps/api/
├── cmd/api/main.go                           # Init(config.Timezone)
├── internal/
│   ├── core/
│   │   ├── apptime/apptime.go                # NEW — centralized timezone package
│   │   ├── infrastructure/config/config.go   # Added Timezone field
│   │   ├── errors/errors.go                  # apptime.Now()
│   │   ├── middleware/*.go                    # apptime.Now()
│   │   └── response/response.go              # Deprecated GetTimezoneWIB() → delegates to apptime
│   ├── ai/domain/**/*.go                     # apptime.Now(), apptime.Location()
│   ├── auth/domain/**/*.go                   # apptime.Now()
│   ├── crm/domain/**/*.go                    # apptime.Now()
│   ├── finance/domain/**/*.go                # apptime.Now()
│   ├── hrd/domain/**/*.go                    # apptime.Now(), apptime.Location()
│   ├── inventory/domain/**/*.go              # apptime.Now()
│   ├── organization/data/models/*.go         # apptime.Now()
│   ├── purchase/domain/**/*.go               # apptime.Now()
│   ├── report/domain/**/*.go                 # apptime.Now()
│   ├── sales/domain/**/*.go                  # apptime.Now()
│   ├── stock_opname/domain/**/*.go           # apptime.Now()
│   └── ...
├── .env.example                              # APP_TIMEZONE added
├── .env.development.example                  # APP_TIMEZONE added
├── .env.production.example                   # APP_TIMEZONE added
└── docker-compose.yml                        # APP_TIMEZONE env var
```

---

## API / Package Reference

### `apptime.Init(timezone string)`

Inisialisasi timezone aplikasi. Dipanggil **sekali** di `main.go`.

```go
import "github.com/gilabs/gims/api/internal/core/apptime"

apptime.Init("Asia/Jakarta")  // dari config
```

- **Parameter:** IANA timezone string (e.g., `"Asia/Jakarta"`, `"America/New_York"`, `"Europe/London"`)
- **Behavior:** Jika string kosong, default ke `"Asia/Jakarta"`. Jika `time.LoadLocation()` gagal, fallback ke fixed UTC+7.
- **Thread-safety:** Safe to call from multiple goroutines (dibungkus `sync.Once`).

### `apptime.Now() time.Time`

Mengembalikan waktu sekarang dalam timezone aplikasi.

```go
now := apptime.Now()
fmt.Println(now.Weekday()) // Selalu sesuai timezone bisnis
```

### `apptime.Location() *time.Location`

Mengembalikan `*time.Location` yang dikonfigurasi. Untuk digunakan dengan `time.Date()` atau `.In()`.

```go
t := time.Date(2026, 3, 1, 0, 0, 0, 0, apptime.Location())
```

### `apptime.Today() time.Time`

Awal hari ini (00:00:00) dalam timezone aplikasi.

```go
startOfDay := apptime.Today()
```

### `apptime.StartOfMonth(year int, month time.Month) time.Time`

Hari pertama bulan tertentu (00:00:00) dalam timezone aplikasi.

```go
startOfJan := apptime.StartOfMonth(2026, time.January)
```

### Phase 2 — Per-Company/Employee Functions

### `apptime.RegisterProvider(p CompanyTimezoneProvider)`

Mendaftarkan provider yang resolve timezone per-company dari database. Dipanggil sekali setelah DB ready.

```go
tzProvider := orgRepos.NewCompanyTimezoneProvider(database.DB)
apptime.RegisterProvider(tzProvider)
```

### `apptime.NowForEmployee(employeeID string) time.Time`

Waktu sekarang di timezone company tempat employee bekerja. Fallback ke global jika provider nil atau timezone kosong.

### `apptime.LocationForEmployee(employeeID string) *time.Location`

`*time.Location` dari company employee. Berguna untuk `time.Date()` atau `.In()`.

### `apptime.NowForCompany(companyID string) time.Time`

Waktu sekarang di timezone company tertentu.

### `apptime.LocationForCompany(companyID string) *time.Location`

`*time.Location` dari company. Cached per IANA string (bukan per companyID).

### `apptime.TodayForEmployee(employeeID string) time.Time` / `apptime.TodayForCompany(companyID string) time.Time`

Awal hari ini (00:00:00) di timezone employee/company.

### `apptime.StartOfMonthForEmployee(employeeID string, year int, month time.Month) time.Time`

Awal bulan di timezone employee.

### `apptime.ResolveLocation(timezone string) *time.Location`

Resolve IANA string ke `*time.Location` dengan caching. Thread-safe.

### Phase 2: Per-Timezone Functions

### `apptime.ResolveLocation(timezone string) *time.Location`

Resolve IANA timezone string ke `*time.Location` dengan caching. Thread-safe.

```go
loc := apptime.ResolveLocation("Asia/Makassar") // cached after first call
```

### `apptime.NowForEmployee(employeeID string) time.Time`

Waktu sekarang dalam timezone company tempat employee bekerja. Falls back ke global jika provider tidak ter-register atau timezone kosong.

```go
empNow := apptime.NowForEmployee("employee-uuid")
```

### `apptime.LocationForEmployee(employeeID string) *time.Location`

`*time.Location` dari timezone company employee. Untuk digunakan dengan `time.Date()` atau arithmetic.

```go
loc := apptime.LocationForEmployee("employee-uuid")
t := time.Date(2026, 3, 1, 8, 0, 0, 0, loc)
```

### `apptime.NowForCompany(companyID string) time.Time`

Waktu sekarang dalam timezone company tertentu.

### `apptime.LocationForCompany(companyID string) *time.Location`

`*time.Location` dari timezone company. Digunakan oleh auto-absent worker.

### `apptime.TodayForEmployee(employeeID string) time.Time` / `TodayForCompany(companyID string) time.Time`

Awal hari ini (00:00:00) dalam timezone employee/company.

### `apptime.RegisterProvider(p CompanyTimezoneProvider)`

Register provider yang bisa resolve companyID/employeeID → timezone string.

```go
tzProvider := orgRepos.NewCompanyTimezoneProvider(database.DB)
apptime.RegisterProvider(tzProvider)
```

---

## Configuration

### Environment Variable

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_TIMEZONE` | `Asia/Jakarta` | IANA timezone name untuk seluruh business logic |

### Contoh Konfigurasi

```env
# Indonesia (WIB)
APP_TIMEZONE=Asia/Jakarta

# Japan
APP_TIMEZONE=Asia/Tokyo

# US Eastern
APP_TIMEZONE=America/New_York

# UK
APP_TIMEZONE=Europe/London
```

### Docker Compose

```yaml
environment:
  - APP_TIMEZONE=${APP_TIMEZONE:-Asia/Jakarta}
```

### Startup Log

Saat aplikasi start, akan tercetak:

```
apptime: application timezone set to Asia/Jakarta
```

Jika timezone gagal di-load:

```
apptime: failed to load timezone "Invalid/Zone": unknown time zone Invalid/Zone — falling back to fixed UTC+7 (WIB)
apptime: application timezone set to WIB
```

---

## Migration Guide

### Untuk developer yang menambah fitur baru

**WAJIB** menggunakan `apptime` untuk semua operasi waktu yang business-relevant:

```go
import "github.com/gilabs/gims/api/internal/core/apptime"

// ✅ CORRECT — timezone-aware
now := apptime.Now()
today := apptime.Today()
loc := apptime.Location()
startOfMonth := apptime.StartOfMonth(2026, time.March)

// ❌ WRONG — returns UTC in Docker
now := time.Now()
// ❌ WRONG — returns system-local timezone
loc := time.Local
```

### Kapan BOLEH menggunakan `time.Now()` langsung

- **Benchmark / profiling** — Hanya butuh monotonic clock
- **Random seed** — Tidak bergantung pada timezone
- **Request ID generation** — Hanya butuh uniqueness
- **Test files** — Test harus explicit tentang timezone yang digunakan

### Pattern Replacement Reference

| Before | After |
|--------|-------|
| `time.Now()` | `apptime.Now()` |
| `time.Now().In(someLoc)` | `apptime.Now()` (jika someLoc == business timezone) |
| `time.Local` | `apptime.Location()` |
| `time.FixedZone("WIB", 7*60*60)` | `apptime.Location()` |
| `response.GetTimezoneWIB()` | `apptime.Location()` (GetTimezoneWIB masih works tapi deprecated) |

---

## Cara Test Manual

### Verifikasi Fix "Day Off" Bug

1. Set `APP_TIMEZONE=Asia/Jakarta` di `.env`
2. Start Docker container (`docker-compose up -d`)
3. Login sebagai employee pada **hari kerja (Senin-Jumat)**
4. Navigate ke Self-Service > Attendance
5. Verify: Tombol "Clock In" harus muncul (bukan "Clock In — Day Off")
6. Verify: Clock in berhasil, timestamp tercatat dalam WIB

### Verifikasi Timezone Configuration

1. Set `APP_TIMEZONE=America/New_York` di `.env`
2. Restart API server
3. Check startup log: `apptime: application timezone set to America/New_York`
4. Hit any endpoint yang mengembalikan timestamp
5. Verify: Timestamp dalam response sesuai timezone New York

### Verifikasi Fallback

1. Set `APP_TIMEZONE=Invalid/ZoneName` di `.env`
2. Restart API server
3. Check log: Warning message tentang fallback ke UTC+7
4. Verify: API tetap berjalan normal dengan timezone WIB (UTC+7)

### Verifikasi Invoice / Code Generation

1. Set `APP_TIMEZONE=Asia/Jakarta`
2. Create sales quotation via API
3. Verify: Quotation code berisi date prefix yang sesuai WIB (bukan UTC)

---

## Automated Testing

### Verification Commands

```bash
# Verify no bare time.Now() remaining
cd apps/api
python3 -c "
import re, os
count = 0
for root, dirs, files in os.walk('internal'):
    for fn in files:
        if fn.endswith('.go') and not fn.endswith('_test.go') and fn != 'apptime.go' and fn != 'response.go':
            path = os.path.join(root, fn)
            with open(path, 'r') as f:
                for i, line in enumerate(f, 1):
                    if re.search(r'(?<!app)time\.Now\(\)', line):
                        print(f'{path}:{i}: {line.strip()}')
                        count += 1
print(f'Total bare time.Now() calls: {count}')
"

# Verify no bare time.Local remaining
python3 -c "
import re, os
count = 0
for root, dirs, files in os.walk('internal'):
    for fn in files:
        if fn.endswith('.go') and not fn.endswith('_test.go') and fn != 'apptime.go':
            path = os.path.join(root, fn)
            with open(path, 'r') as f:
                for i, line in enumerate(f, 1):
                    if re.search(r'(?<!app)time\.Local\b', line):
                        print(f'{path}:{i}: {line.strip()}')
                        count += 1
print(f'Total bare time.Local references: {count}')
"

# Build verification
go build ./...
go vet ./...
```

### Future: CI Lint Rule (Recommended)

Tambahkan custom lint rule di CI pipeline:

```bash
# Fail CI if any new bare time.Now() is introduced
if grep -rn --include='*.go' -P '(?<!app)time\.Now\(\)' internal/ \
   | grep -v '_test.go' | grep -v 'apptime.go' | grep -v 'response.go'; then
    echo "ERROR: Found bare time.Now() calls. Use apptime.Now() instead."
    exit 1
fi
```

---

## Dependencies

### Internal
- `github.com/gilabs/gims/api/internal/core/infrastructure/config` — Reads `APP_TIMEZONE` env var
- `github.com/gilabs/gims/api/cmd/api/main.go` — Calls `apptime.Init()`

### External (Go standard library only)
- `time` — `time.LoadLocation()`, `time.FixedZone()`, `time.Now()`
- `sync` — `sync.Once` for thread-safe initialization
- `log` — Startup logging

### No third-party dependencies

Package `apptime` hanya menggunakan Go standard library. Tidak ada dependency tambahan.

---

## Related Issues / PRs

- **PR:** [#18 — feat/app/hrd](https://github.com/Gilabs-Studio/gims-platform/pull/18)
- **Root Cause Bug:** Self-attendance "Clock In — Day Off" pada hari Senin (Docker UTC vs WIB mismatch)
- **Scope:** 100+ files modified across all backend domains

---

## Notes & Improvements

### Known Limitations
- **HRD-only scope** — Phase 2 per-company timezone hanya di-apply ke HRD module (attendance, leave, overtime, auto-absent). Module lain (sales, purchase, finance, CRM) masih menggunakan global `apptime.Now()`.
- **No DST handling verification** — Fallback `FixedZone("WIB", 7*60*60)` tidak support DST. Untuk timezone dengan DST (US, Europe), pastikan container include `tzdata` package.
- **Test files not migrated** — File `*_test.go` masih menggunakan `time.Now()`. Test harus explicit tentang timezone.
- **In-memory cache only** — Timezone provider cache tidak shared antar pods/replicas. TTL 5 menit cukup untuk konsistensi eventual.

### Future Improvements
- **Phase 3** — Extend per-company timezone ke sales, purchase, finance, CRM modules
- **CI lint rule** — Otomatis gagalkan build jika ada bare `time.Now()` baru
- **Redis-backed cache** — Untuk multi-replica deployments, share timezone cache via Redis
- **`apptime_test.go`** — Unit test untuk package apptime (Init, fallback, concurrent access, per-company)
- **Admin UI** — Company timezone picker di organization settings
- **Container tzdata** — Pastikan Dockerfile include `tzdata` package untuk production:
  ```dockerfile
  RUN apk add --no-cache tzdata
  ```

### Performance Notes
- `apptime.Now()` menambah overhead ~1 nanosecond per call (satu `time.Now().In(loc)`)
- `ensureInit()` nil-check di-optimize oleh compiler menjadi single pointer comparison
- Tidak ada allocations tambahan — `*time.Location` reused setelah init
