# Setup Timezone Data untuk Auto-Detect Timezone Company

## Overview

Dokumen ini menjelaskan cara setup data timezone untuk auto-detect timezone berdasarkan lokasi company (latitude/longitude).

## Cara Kerja

1. Frontend sudah menggunakan timezone conversion menggunakan `date-fns-tz`
2. Waktu dari backend (UTC) akan dikonversi ke timezone user saat ditampilkan
3. Timezone default: `Asia/Jakarta` (WIB)

## Langkah 1: Download TimezoneDB Data

### Option A: Download CSV dari TimezoneDB (Recommended)

1. **Daftar/Login ke TimezoneDB**: https://timezonedb.com/register
2. **Download data gratis** (zone.csv, timezone.csv, country.csv) dari:
   - Link: https://timezonedb.com/download
   - Atau API endpoint (free tier): http://api.timezonedb.com/v2.1/get-time-zone

3. **Alternative: Download shapefile** untuk geocoding yang lebih akurat:

   ```bash
   # Download timezone boundaries shapefile
   wget https://github.com/evansiroky/timezone-boundary-builder/releases/download/2024a/timezones-with-oceans.shapefile.zip

   # Extract
   unzip timezones-with-oceans.shapefile.zip -d timezone_data/
   ```

### Option B: Simplified untuk Indonesia (Quick Setup)

Karena Indonesia hanya punya 3 timezone, kita bisa hardcode:

```go
// apps/api/internal/core/apptime/indonesia_timezones.go
package apptime

// IndonesiaTimezoneBoundaries defines rough boundaries for Indonesian timezones
var IndonesiaTimezoneBoundaries = []struct {
    Name      string
    Timezone  string
    MinLong   float64
    MaxLong   float64
    UTCOffset int
}{
    {"WIB", "Asia/Jakarta", 95.0, 120.0, 7},      // Sumatra, Java, etc.
    {"WITA", "Asia/Makassar", 120.0, 135.0, 8},   // Sulawesi, Bali, etc.
    {"WIT", "Asia/Jayapura", 135.0, 141.0, 9},    // Papua, Maluku, etc.
}

// GetIndonesiaTimezone returns timezone name based on longitude
func GetIndonesiaTimezone(longitude float64) string {
    for _, tz := range IndonesiaTimezoneBoundaries {
        if longitude >= tz.MinLong && longitude < tz.MaxLong {
            return tz.Timezone
        }
    }
    return "Asia/Jakarta" // Default to WIB
}
```

## Langkah 2: Backend Implementation

### 2.1 Update Company Model

```go
// apps/api/internal/organization/data/models/company.go

// GetTimezone returns company timezone, auto-detect if not set
func (c *Company) GetTimezone() string {
    if c.Timezone != "" {
        return c.Timezone
    }
    // Auto-detect from office location if available
    if c.OfficeLatitude != 0 && c.OfficeLongitude != 0 {
        return apptime.GetIndonesiaTimezone(c.OfficeLongitude)
    }
    return "Asia/Jakarta" // Default
}
```

### 2.2 Add Service untuk Auto-Detect

```go
// apps/api/internal/organization/domain/usecase/company_usecase.go

func (uc *companyUsecase) detectTimezoneFromLocation(ctx context.Context, lat, long float64) string {
    // Untuk Indonesia, gunakan longitude-based detection
    timezone := apptime.GetIndonesiaTimezone(long)

    // Log untuk debugging
    log.Printf("Auto-detected timezone: lat=%f, long=%f, timezone=%s", lat, long, timezone)

    return timezone
}
```

### 2.3 Update Create/Update Company Handler

```go
// apps/api/internal/organization/presentation/handler/company_handler.go

func (h *CompanyHandler) Create(c *gin.Context) {
    // ... existing code ...

    // Auto-detect timezone if not provided
    if req.Timezone == "" && req.OfficeLatitude != 0 && req.OfficeLongitude != 0 {
        req.Timezone = apptime.GetIndonesiaTimezone(req.OfficeLongitude)
    }

    // ... rest of handler
}
```

## Langkah 3: Frontend Implementation

### 3.1 Update Company Form

Tambahkan dropdown untuk manual timezone selection dengan auto-detect:

```typescript
// Di company form component

const INDONESIA_TIMEZONES = [
  { value: "Asia/Jakarta", label: "WIB (Western Indonesia Time) - UTC+7" },
  { value: "Asia/Makassar", label: "WITA (Central Indonesia Time) - UTC+8" },
  { value: "Asia/Jayapura", label: "WIT (Eastern Indonesia Time) - UTC+9" },
];

function detectTimezone(longitude: number): string {
  if (longitude < 120) return "Asia/Jakarta";
  if (longitude < 135) return "Asia/Makassar";
  return "Asia/Jayapura";
}

// Saat user pick location dari map
const handleLocationSelect = (lat: number, lng: number) => {
  setValue("office_latitude", lat);
  setValue("office_longitude", lng);

  // Auto-detect timezone
  const detectedTimezone = detectTimezone(lng);
  setValue("timezone", detectedTimezone);
};
```

## Langkah 4: Database Migration

Jika belum ada kolom timezone di tabel companies:

```sql
-- Migration: Add timezone column to companies
ALTER TABLE companies ADD COLUMN timezone VARCHAR(50) DEFAULT 'Asia/Jakarta';

-- Update existing companies based on their office location
UPDATE companies
SET timezone = CASE
    WHEN office_longitude < 120 THEN 'Asia/Jakarta'
    WHEN office_longitude < 135 THEN 'Asia/Makassar'
    ELSE 'Asia/Jayapura'
END
WHERE office_longitude IS NOT NULL;
```

## Langkah 5: Testing

### Test Case 1: Clock In WIB

```
Location: Jakarta (-6.2088, 106.8456)
Expected Timezone: Asia/Jakarta (UTC+7)
Action: Clock in at 09:00 WIB
Expected Display: 09:00 (bukan 02:00 UTC)
```

### Test Case 2: Clock In WITA

```
Location: Makassar (-5.1477, 119.4327)
Expected Timezone: Asia/Makassar (UTC+8)
Action: Clock in at 09:00 WITA
Expected Display: 09:00 (bukan 01:00 UTC)
```

### Test Case 3: Clock In WIT

```
Location: Jayapura (-2.5916, 140.6690)
Expected Timezone: Asia/Jayapura (UTC+9)
Action: Clock in at 09:00 WIT
Expected Display: 09:00 (bukan 00:00 UTC)
```

## Perubahan yang Sudah Dilakukan

### Frontend (Sudah Diimplementasi):

1. ✅ Install `date-fns-tz` package
2. ✅ Add timezone utility functions di `utils.ts`
3. ✅ Update semua komponen attendance untuk menggunakan timezone conversion:
   - `header-attendance-button.tsx`
   - `user-menu-attendance.tsx`
   - `use-self-attendance-actions.ts`
   - `attendance-calendar-tab.tsx`
   - `attendance-day-view.tsx`
   - `attendance-list.tsx`
   - `attendance-detail-modal.tsx`

### Fungsi Utility Baru:

- `formatUTCToLocal()` - Convert UTC datetime ke local timezone
- `formatAttendanceTime()` - Format waktu attendance dengan timezone
- `getTimezoneFromLongitude()` - Detect timezone dari longitude
- `getUserTimezone()` - Get timezone user (default: Asia/Jakarta)

## Catatan Penting

1. **Timezones Indonesia**:
   - WIB (UTC+7): Sumatra, Java, Kalimantan Barat/Tengah
   - WITA (UTC+8): Sulawesi, Bali, Nusa Tenggara, Kalimantan Timur/Utara/Selatan
   - WIT (UTC+9): Papua, Maluku

2. **Batas Longitude**:
   - < 120°E = WIB
   - 120°E - 135°E = WITA
   - > 135°E = WIT

3. **Fallback**: Jika auto-detect gagal, gunakan `Asia/Jakarta` sebagai default

## Next Steps

1. Backend: Implementasi auto-detect timezone saat create/update company
2. Backend: Update company handler untuk set timezone dari koordinat
3. Frontend: Update company form dengan auto-detect saat pick location
4. Testing: Verifikasi timezone conversion di berbagai lokasi Indonesia

## Referensi

- TimezoneDB: https://timezonedb.com/
- IANA Timezones: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
- Indonesia Timezones: https://en.wikipedia.org/wiki/Time_in_Indonesia
