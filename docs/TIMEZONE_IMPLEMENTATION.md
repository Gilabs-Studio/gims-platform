# Setup Timezone Auto-Detection - Implementation Summary

## ✅ Sudah Diimplementasikan

### 1. Backend Components

#### A. Timezone Model & Repository (`apps/api/internal/core/data/`)

- **Models**: `timezone.go` - Country dan TimeZone structs
- **Repository**: `timezone_repository.go` - Interface dan implementasi untuk:
  - `GetCurrentTimezone()` - Get timezone info by name
  - `GetTimezoneByCountry()` - Get timezones for a country
  - `DetectTimezoneFromCoordinates()` - **Auto-detect berdasarkan lat/long**
  - `GetSupportedTimezones()` - List all timezones

#### B. Timezone Service (`apps/api/internal/organization/domain/service/`)

- **File**: `timezone_service.go`
- **Fungsi**:
  - `DetectTimezoneFromCoordinates()` - Wrapper untuk repository
  - `ValidateTimezone()` - Validasi timezone name
  - `GetTimezoneForCompany()` - Logic utama untuk company:
    - Gunakan timezone yang sudah di-set jika ada
    - Auto-detect dari koordinat jika tersedia
    - Fallback ke Asia/Jakarta

#### C. Company Usecase Update

- **File**: `apps/api/internal/organization/domain/usecase/company_usecase.go`
- **Perubahan**:
  - Inject `TimezoneService` ke constructor
  - `Create()`: Auto-detect timezone saat create company
  - `Update()`: Auto-update timezone jika koordinat berubah

#### D. Router Update

- **File**: `apps/api/internal/organization/presentation/routers.go`
- **Perubahan**:
  - Initialize `timezoneRepo` dan `timezoneService`
  - Pass ke `NewCompanyUsecase()`

#### E. Database Migration

- **File**: `apps/api/internal/core/infrastructure/database/migrate.go`
- **Perubahan**:
  - Tambah `TimeZone` dan `Country` ke AutoMigrate
  - Fungsi `migrateTimezoneData()` untuk insert Indonesia timezones
  - Script: `apps/api/scripts/import_timezone_data.sh`

### 2. Frontend Components (Timezone Display)

#### A. Utility Functions (`apps/web/src/lib/utils.ts`)

```typescript
- DEFAULT_TIMEZONE = "Asia/Jakarta"
- INDONESIA_TIMEZONES = { WIB, WITA, WIT }
- getTimezoneFromLongitude(longitude) - Detect timezone from longitude
- formatUTCToLocal(utcDate, timezone, format) - Convert UTC ke local
- formatAttendanceTime(timeStr, date, timezone) - Format waktu attendance
- getUserTimezone() - Get timezone user (default: Asia/Jakarta)
```

#### B. Updated Components

Semua komponen attendance sekarang menggunakan timezone conversion:

1. `header-attendance-button.tsx` - Button di header
2. `user-menu-attendance.tsx` - Menu user
3. `use-self-attendance-actions.ts` - Hook untuk self attendance
4. `attendance-calendar-tab.tsx` - Tab calendar
5. `attendance-day-view.tsx` - Day view
6. `attendance-list.tsx` - List view
7. `attendance-detail-modal.tsx` - Detail modal

**Package**: `date-fns-tz` (sudah di-install)

## 🔄 Workflow Auto-Detect Timezone

### Saat Create Company:

1. User input data company + pilih lokasi di map (dapat lat/long)
2. Sebelum save, backend panggil `timezoneService.GetTimezoneForCompany()`
3. Jika timezone tidak di-set manual:
   - Cek longitude lokasi
   - < 120°E → Asia/Jakarta (WIB)
   - 120°E - 135°E → Asia/Makassar (WITA)
   - > 135°E → Asia/Jayapura (WIT)
4. Save company dengan timezone yang terdeteksi

### Saat Update Company:

1. Jika user update koordinat (lat/long)
2. Dan timezone tidak di-set manual
3. Backend auto-detect timezone baru
4. Update company dengan timezone baru

### Saat Clock In/Out:

1. Backend simpan waktu dalam UTC
2. Frontend convert UTC ke local timezone saat display
3. Contoh: 17:43 UTC → 00:43 WIB

## 📊 Timezone Boundaries (Indonesia)

| Zona | Timezone      | Longitude     | UTC Offset | Wilayah                                                       |
| ---- | ------------- | ------------- | ---------- | ------------------------------------------------------------- |
| WIB  | Asia/Jakarta  | < 120°E       | UTC+7      | Sumatra, Java, Kalimantan Barat/Tengah                        |
| WITA | Asia/Makassar | 120°E - 135°E | UTC+8      | Sulawesi, Bali, Nusa Tenggara, Kalimantan Timur/Utara/Selatan |
| WIT  | Asia/Jayapura | > 135°E       | UTC+9      | Papua, Maluku                                                 |

## 🚀 Langkah Selanjutnya (Untuk Developer)

### 1. Build dan Test Backend

```bash
cd apps/api
go build ./cmd/api/main.go
```

### 2. Run Migration

```bash
# Jalankan aplikasi, migration akan otomatis jalan
# atau import manual:
psql -h localhost -U postgres -d gims -f apps/api/data/geodata/time_zone.sql
```

### 3. Test Auto-Detect

```bash
# Test endpoint dengan lokasi berbeda:
# Jakarta (-6.2088, 106.8456) → Asia/Jakarta
# Makassar (-5.1477, 119.4327) → Asia/Makassar
# Jayapura (-2.5916, 140.6690) → Asia/Jayapura
```

### 4. Frontend Update (Company Form)

Tambahkan di company form:

- Map picker untuk pilih lokasi (sudah ada)
- Auto-fill timezone saat lokasi dipilih
- Dropdown manual untuk override timezone

### 5. Testing Checklist

- [ ] Create company Jakarta → timezone Asia/Jakarta
- [ ] Create company Makassar → timezone Asia/Makassar
- [ ] Create company Jayapura → timezone Asia/Jayapura
- [ ] Update koordinat company → timezone auto-update
- [ ] Clock in → waktu tampil sesuai timezone (bukan UTC)
- [ ] Clock out → waktu tampil sesuai timezone

## 📝 Notes

1. **Data Timezone**: Sementara hanya Indonesia (WIB, WITA, WIT)
2. **Fallback**: Jika auto-detect gagal, gunakan Asia/Jakarta
3. **Override**: User bisa set timezone manual jika perlu
4. **Storage**: Backend simpan UTC, frontend convert ke local
5. **Performance**: Longitude-based detection sangat cepat (no API call)

## 🔧 Troubleshooting

### Timezone tidak terdeteksi:

- Cek apakah lat/long tersimpan di company
- Cek log backend untuk error
- Default akan ke Asia/Jakarta

### Waktu masih UTC di frontend:

- Cek apakah `date-fns-tz` sudah terinstall
- Cek apakah komponen sudah di-update
- Cek console untuk error JavaScript

### Migration gagal:

- Cek koneksi database
- Cek apakah tabel sudah ada
- Jalankan manual: `psql -f apps/api/data/geodata/time_zone.sql`

## 📚 Referensi

- TimezoneDB: https://timezonedb.com/
- IANA Timezones: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
- date-fns-tz: https://github.com/marnusw/date-fns-tz
