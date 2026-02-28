# HRD - Work Schedule Management

> **Module:** HRD (Human Resource Development)  
> **Sprint:** 13  
> **Version:** 1.3.0  
> **Status:** ✅ Complete (API + Frontend)  
> **Last Updated:** February 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [System Architecture](#system-architecture)
4. [Data Model](#data-model)
5. [Business Rules](#business-rules)
6. [API Reference](#api-reference)
7. [Frontend Components](#frontend-components)
8. [Permissions](#permissions)
9. [Configuration](#configuration)
10. [Integration Points](#integration-points)
11. [Manual Testing](#manual-testing)
12. [Keputusan Teknis](#keputusan-teknis)
13. [Notes & Improvements](#notes--improvements)

---

## Overview

The Work Schedule Management sub-module allows administrators to create and manage work schedules for employees across different divisions. Schedules define working hours, break times, GPS validation requirements, and tolerance settings for late arrival / early departure.

### Key Features

| Feature                   | Description                                                            |
| ------------------------- | ---------------------------------------------------------------------- |
| Fixed & Flexible Hours    | Supports standard 9-to-5 and flexible start/end time schedules         |
| Division-Based Assignment | Assign schedules to specific divisions via division dropdown           |
| Company-Based GPS         | Select a company to auto-populate GPS coordinates from company data    |
| GPS Validation            | Configurable office coordinates and radius for clock-in validation     |
| Working Days Bitmask      | Flexible working day selection (Mon-Fri, Mon-Sat, custom)              |
| Tolerance Settings        | Grace periods for late arrival and early departure                     |
| Multiple Break Times      | Support for multiple break periods throughout the day                  |
| Auto-Calculated Hours     | Working hours per day automatically calculated from start/end times    |
| Default Schedule          | One general (non-division) schedule can be marked as default           |
| Form Data Endpoint        | Dedicated endpoint to fetch divisions and companies for form dropdowns |
| Detail Modal              | Click on schedule name to view detailed information                    |

---

## Features

### Schedule Types

| Type           | Description                                                                        |
| -------------- | ---------------------------------------------------------------------------------- |
| Fixed Hours    | Standard start/end time (e.g., 08:00–17:00)                                        |
| Flexible Hours | Allowed range for clock-in/out (e.g., clock in 07:00–10:00, clock out 16:00–19:00) |

### Working Days Bitmask

Working days are stored as a bitmask integer for efficient storage and querying:

| Day          | Bit Value | Example          |
| ------------ | --------- | ---------------- |
| Monday       | 1         |                  |
| Tuesday      | 2         |                  |
| Wednesday    | 4         |                  |
| Thursday     | 8         |                  |
| Friday       | 16        |                  |
| Saturday     | 32        |                  |
| Sunday       | 64        |                  |
| **Mon-Fri**  | **31**    | 1+2+4+8+16       |
| **Mon-Sat**  | **63**    | 1+2+4+8+16+32    |
| **All Days** | **127**   | 1+2+4+8+16+32+64 |

### GPS Configuration

- **Require GPS**: Toggle GPS validation on/off per schedule (default: false)
- **GPS Radius**: Allowed distance (meters) from office coordinates
- **Office Location**: Select a company to auto-populate latitude/longitude from company data, or enter coordinates manually
- **Company-Based Coordinates**: When a company is selected, its GPS coordinates are used automatically for attendance validation

### Multiple Break Times

Schedules now support multiple break periods:

- Add/remove break times dynamically in the form
- Each break has start and end time
- Total break duration calculated automatically from all breaks
- Stored as JSON array in the database

---

## System Architecture

### Backend Structure

```
apps/api/internal/hrd/
├── data/
│   ├── models/work_schedule.go
│   └── repositories/work_schedule_repository.go
├── domain/
│   ├── dto/work_schedule_dto.go
│   ├── mapper/work_schedule_mapper.go
│   └── usecase/work_schedule_usecase.go
└── presentation/
    ├── handler/work_schedule_handler.go
    └── router/work_schedule_router.go
```

### Frontend Structure

```
apps/web/src/features/hrd/work-schedules/
├── types/index.d.ts
├── schemas/work-schedule.schema.ts
├── services/work-schedule-service.ts
├── hooks/use-work-schedules.ts
└── components/
    ├── work-schedule-list.tsx
    ├── work-schedule-dialog.tsx
    ├── work-schedule-detail-dialog.tsx
    ├── work-schedule-page-client.tsx
    └── index.ts
```

### Frontend Pages

```
apps/web/app/[locale]/(dashboard)/hrd/work-schedules/
├── page.tsx
└── loading.tsx
```

---

## Data Model

### WorkSchedule

| Field                         | Type        | Description                                         |
| ----------------------------- | ----------- | --------------------------------------------------- |
| id                            | UUID        | Primary key                                         |
| name                          | STRING(100) | Schedule name                                       |
| description                   | STRING(255) | Optional description                                |
| division_id                   | UUID        | Optional division link (nullable)                   |
| is_default                    | BOOL        | Default schedule flag (only one allowed)            |
| is_active                     | BOOL        | Active status                                       |
| start_time                    | STRING(5)   | Work start time (format: "HH:MM")                   |
| end_time                      | STRING(5)   | Work end time (format: "HH:MM")                     |
| is_flexible                   | BOOL        | Flexible hours flag                                 |
| flexible_start_time           | STRING(5)   | Earliest allowed clock-in (flexible mode)           |
| flexible_end_time             | STRING(5)   | Latest allowed clock-in (flexible mode)             |
| breaks                        | JSONB       | Array of break periods [{start_time, end_time}]     |
| working_days                  | INT         | Bitmask for working days (default: 31 = Mon-Fri)    |
| working_hours_per_day         | FLOAT       | **Auto-calculated** from start_time and end_time    |
| late_tolerance_minutes        | INT         | Grace period for late arrival (minutes)             |
| early_leave_tolerance_minutes | INT         | Grace period for early departure (minutes)          |
| require_gps                   | BOOL        | Whether GPS validation is required (default: false) |
| gps_radius_meter              | FLOAT       | Allowed radius from office in meters (default: 100) |
| office_latitude               | FLOAT       | Office GPS latitude                                 |
| office_longitude              | FLOAT       | Office GPS longitude                                |
| created_at                    | TIMESTAMP   | Creation timestamp                                  |
| updated_at                    | TIMESTAMP   | Last update timestamp                               |

### BreakTime Structure

```go
type BreakTime struct {
    StartTime string `json:"start_time"` // Format: "HH:MM"
    EndTime   string `json:"end_time"`   // Format: "HH:MM"
}
```

---

## Business Rules

- **Only one default schedule** allowed across the entire system — setting a new default automatically unsets the previous one
- **Default schedule restriction**: Only general (non-division) schedules can be set as default. Division-specific schedules cannot be set as default — the "Set as Default" button is hidden in the UI and the backend returns `CANNOT_SET_DIVISION_SCHEDULE_AS_DEFAULT` error if attempted via API
- **Division-based lookup**: When an employee clocks in, the system first looks for a schedule assigned to their division; if none found, falls back to the default schedule
- **GPS validation**: Only enforced for `NORMAL` check-in type (not for WFH or FIELD_WORK)
- **Company-based GPS**: When GPS is required, coordinates can be auto-populated from a selected company's data instead of manual entry
- **Late calculation**: `late_minutes = max(0, check_in_time - (start_time + late_tolerance_minutes))`
- **Early leave calculation**: `early_leave_minutes = max(0, (end_time - early_leave_tolerance_minutes) - check_out_time)`
- **Working minutes**: `working_minutes = check_out_time - check_in_time - total_break_minutes`
- **Total break minutes**: Automatically calculated from all break periods
- **Overtime detection**: Triggered when clock-out exceeds `end_time + 30 minutes buffer`
- **Auto-calculated working hours**: Calculated as `(end_time - start_time)` in hours, handles overnight shifts
- Cannot delete the default schedule — must set another as default first

---

## API Reference

### Work Schedule Endpoints

| Method | Endpoint                                     | Permission           | Description                            |
| ------ | -------------------------------------------- | -------------------- | -------------------------------------- |
| GET    | `/api/v1/hrd/work-schedules`                 | work_schedule.read   | List schedules (paginated, filterable) |
| GET    | `/api/v1/hrd/work-schedules/form-data`       | work_schedule.read   | Get form data (divisions + companies)  |
| GET    | `/api/v1/hrd/work-schedules/default`         | work_schedule.read   | Get the default schedule               |
| GET    | `/api/v1/hrd/work-schedules/:id`             | work_schedule.read   | Get schedule by ID                     |
| POST   | `/api/v1/hrd/work-schedules`                 | work_schedule.create | Create a new schedule                  |
| PUT    | `/api/v1/hrd/work-schedules/:id`             | work_schedule.update | Update a schedule                      |
| DELETE | `/api/v1/hrd/work-schedules/:id`             | work_schedule.delete | Delete a schedule                      |
| POST   | `/api/v1/hrd/work-schedules/:id/set-default` | work_schedule.update | Set a general schedule as default      |

### Request Body (Create/Update)

```json
{
  "name": "Standard Office Hours",
  "description": "Standard 9-to-5 schedule",
  "start_time": "08:00",
  "end_time": "17:00",
  "is_flexible": false,
  "breaks": [{ "start_time": "12:00", "end_time": "13:00" }],
  "working_days": 31,
  "late_tolerance_minutes": 15,
  "early_leave_tolerance_minutes": 0,
  "require_gps": false,
  "gps_radius_meter": 100,
  "office_latitude": -6.2088,
  "office_longitude": 106.8456,
  "division_id": null,
  "company_id": null
}
```

**Notes**:

- `working_hours_per_day` is auto-calculated from `start_time` and `end_time` and should not be sent in the request.
- `company_id` is optional — if provided, the company's GPS coordinates are used for `office_latitude` and `office_longitude`.
- The API response includes `division_name` (resolved from `division_id`), which is used for display in the list and detail views.

### Response Body (Form Data)

```json
{
  "success": true,
  "data": {
    "divisions": [{ "id": "uuid", "name": "Engineering" }],
    "companies": [
      {
        "id": "uuid",
        "name": "PT Example",
        "latitude": -6.2088,
        "longitude": 106.8456
      }
    ]
  }
}
```

### Query Parameters (List)

| Parameter     | Type   | Description                            |
| ------------- | ------ | -------------------------------------- |
| `page`        | int    | Page number (default: 1)               |
| `per_page`    | int    | Items per page (default: 20, max: 100) |
| `search`      | string | Search by name or description (ILIKE)  |
| `is_active`   | bool   | Filter by active status                |
| `is_flexible` | bool   | Filter by flexible hours flag          |
| `division_id` | uuid   | Filter by division                     |

---

## Frontend Components

### Work Schedules (`/hrd/work-schedules`)

| Component                  | File                            | Description                                                                            |
| -------------------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| `WorkScheduleList`         | work-schedule-list.tsx          | Paginated table with CRUD actions, default badge, **division column**, clickable names |
| `WorkScheduleDialog`       | work-schedule-dialog.tsx        | Create/Edit form dialog with all config fields                                         |
| `WorkScheduleDetailDialog` | work-schedule-detail-dialog.tsx | Read-only detail modal showing all schedule information                                |
| `WorkSchedulePageClient`   | work-schedule-page-client.tsx   | Page wrapper with animations                                                           |

**Features:**

- List all work schedules with pagination and search
- Default schedule badge indicator
- **Clickable schedule names** — opens detail modal
- Create new schedule with flexible hours configuration
- **Division selection dropdown** — assign schedule to a specific division or leave as general
- **Company-based GPS** — select a company to auto-populate GPS coordinates, with manual fallback
- Working days bitmask selector (Mon-Sun checkboxes)
- **Multiple break times** — add/remove break periods dynamically
- **Auto-calculated working hours** displayed in form
- GPS location and radius configuration
- Late/Early tolerance configuration
- Set default schedule action (only shown for general/non-division schedules)
- Active/Inactive status toggle
- View detail action in dropdown menu

### Detail Modal Features

The detail modal (`WorkScheduleDetailDialog`) displays:

- Schedule name with default badge
- Status badges (Active/Inactive, Flexible, GPS, Division)
- **Assignment section** — displays division name or "All Divisions (General)"
- Work hours (start/end times)
- Flexible hours range (if enabled)
- All break times listed
- Working days
- Auto-calculated working hours per day
- Tolerance settings
- GPS configuration (if enabled)

### Hooks (TanStack Query)

| Hook                      | File                  | Description                                      |
| ------------------------- | --------------------- | ------------------------------------------------ |
| `useWorkSchedules`        | use-work-schedules.ts | Schedule CRUD operations                         |
| `useWorkScheduleFormData` | use-work-schedules.ts | Fetch divisions and companies for form dropdowns |

### i18n Keys

Translations under `hrd.workSchedule`:

- `title`, `description` — Page headers
- `fields.*` — Form field labels (name, startTime, division, officeLocation, coordinates, etc.)
- `placeholders.*` — Form placeholders (selectDivision, allDivisions, selectCompany, manualCoordinates)
- `sections.*` — Section headers (workHours, breakTime, workingDays, tolerance, gpsSettings, assignment)
- `descriptions.*` — Field descriptions (flexible, gps, division, officeLocation)
- `workingDaysOptions.*` — Preset working day labels
- `days.*` — Day abbreviations (Mon, Tue, etc.)
- `actions.*` — Action buttons (create, edit, delete, view)
- `messages.*` — Toast messages (success, error, confirm)

---

## Permissions

| Permission             | Description                         |
| ---------------------- | ----------------------------------- |
| `work_schedule.read`   | View work schedules                 |
| `work_schedule.create` | Create work schedules               |
| `work_schedule.update` | Update work schedules + set default |
| `work_schedule.delete` | Delete work schedules               |

---

## Configuration

### Default Schedules (Seeder)

Two schedules are seeded by default:

```
Standard Office Hours:
- Name: Standard Office Hours
- Start: 08:00
- End: 17:00
- Breaks: [{"start_time": "12:00", "end_time": "13:00"}]
- Working Days: Mon-Fri (31)
- Late Tolerance: 15 min
- Early Leave Tolerance: 0 min
- GPS Required: Yes
- GPS Radius: 200m
- Office: Jakarta coordinates
- Is Default: Yes

Flexible Hours:
- Name: Flexible Hours
- Start: 08:00
- End: 17:00
- Flexible Start: 07:00
- Flexible End: 09:00
- Is Flexible: Yes
- Breaks: [{"start_time": "12:00", "end_time": "13:00"}]
- Working Days: Mon-Fri (31)
- GPS Required: No
- Is Default: No
```

### Configuration Impact

| Setting                         | Impact on Attendance                                                        |
| ------------------------------- | --------------------------------------------------------------------------- |
| `late_tolerance_minutes`        | Determines when an employee is marked as LATE                               |
| `early_leave_tolerance_minutes` | Determines early departure penalty                                          |
| `require_gps`                   | Enables/disables GPS distance check on NORMAL clock-in (default: false)     |
| `gps_radius_meter`              | Maximum distance from office for valid clock-in                             |
| `breaks`                        | Total break time deducted from working minutes (calculated from all breaks) |
| `working_hours_per_day`         | **Auto-calculated** from start/end times, used for overtime baseline        |

---

## Integration Points

### With Attendance Module (Primary)

- Schedule is resolved per employee (division-based → default fallback)
- Clock-in validates GPS based on schedule's `require_gps` and `gps_radius_meter`
- Late minutes calculated against schedule's `start_time + late_tolerance_minutes`
- Early leave against `end_time - early_leave_tolerance_minutes`
- Overtime auto-detected when clock-out > `end_time + 30 min`
- Working minutes reduced by **total break minutes** (calculated from all breaks)
- The `work_schedule_id` is stored on each attendance record
- The `work_schedule_name` is enriched in the attendance detail response

### With Overtime Module

- Overtime auto-detection uses schedule end time as baseline
- Overtime rate can differ by schedule type (weekday vs weekend)

### With Form Data Endpoint

- Active schedules are returned in the `GET /hrd/attendance/form-data` response for dropdown selection
- `GET /hrd/work-schedules/form-data` returns active divisions and active companies (with coordinates) for the schedule form

### With Company Module

- Companies with GPS coordinates are available in the work schedule form for auto-populating office location
- When a company is selected, its `latitude` and `longitude` are used as the schedule's GPS reference point

---

## Manual Testing

1. Login as admin
2. Navigate to `/hrd/work-schedules`
3. Verify default schedule shows "Default" badge
4. **Click on a schedule name** → detail modal should open
5. Click "Add Work Schedule" → fill in all fields
6. Toggle "Flexible Hours" → flexible time fields should appear
7. **Add multiple break times** using the "Add Break" button
8. Verify **working hours per day** is auto-calculated and displayed
9. Select working days via checkboxes
10. Submit → should show success toast, schedule appears in list
11. **Select a Division** from the dropdown → verify it saves correctly
12. **Select a Company** for GPS → verify latitude/longitude auto-populate
13. Test "Manual Coordinates" option → verify manual lat/lng fields appear
14. Test "Set as Default" from dropdown menu on a **general** (non-division) schedule
15. Verify the old default lost its badge
16. Verify "Set as Default" button is **hidden** for division-assigned schedules
17. Test GPS settings: enable GPS and set coordinates/radius
18. Test "View" from dropdown menu → detail modal should open
19. Verify schedule is used during attendance clock-in for associated division

---

## Keputusan Teknis

- **Mengapa division-based schedule lookup (bukan hanya default)**:
  Tiap divisi bisa punya jadwal kerja berbeda (misal sales di lapangan vs admin di kantor). `getScheduleForEmployee()` cek divisi dulu, fallback ke default. Trade-off: 1 extra query per clock-in, tapi akurasi jadwal jauh lebih baik.

- **Mengapa working days pakai bitmask (bukan array)**:
  Bitmask lebih efisien untuk storage dan comparison. Checking if today is a working day: `schedule.WorkingDays & (1 << weekday) != 0`. Trade-off: kurang readable, tapi performant dan standard di ERP systems.

- **Mengapa GPS validation hanya untuk NORMAL check-in type**:
  WFH dan FIELD_WORK secara definisi tidak di kantor. Menvalidasi GPS untuk tipe ini akan selalu gagal. GPS tetap di-log untuk FIELD_WORK (audit trail), tapi tidak divalidasi terhadap office location.

- **Mengapa multiple break times (bukan single break)**:
  Beberapa perusahaan memiliki multiple istirahat (pagi, siang, sore). Dengan array breaks, sistem lebih fleksibel. Break duration dihitung otomatis dari selisih start dan end tiap break.

- **Mengapa working_hours_per_day auto-calculated**:
  Menghindari inkonsistensi data. Kalau admin ganti start/end time tapi lupa update working hours, perhitungan overtime jadi salah. Dengan auto-calculate, data selalu konsisten. Formula: `(end_time - start_time)` dalam jam.

- **Mengapa GPS default false**:
  Tidak semua perusahaan membutuhkan GPS validation. Dengan default false, admin harus consciously enable GPS, mengurangi confusion dan error configuration.

- **Mengapa custom Breaks type dengan Value/Scan methods**:
  PostgreSQL JSONB tidak bisa langsung di-scan ke slice struct. Dengan implementasi driver.Valuer dan sql.Scanner, GORM bisa handle konversi JSONB ↔ Go struct secara otomatis.

- **Mengapa company-based GPS (bukan manual input)**:
  Koordinat kantor sudah ada di data company. Dengan menggunakan data company, mengurangi human error dari salah input koordinat manual, dan memastikan konsistensi antara lokasi kantor dan GPS validation.

- **Mengapa set-default dibatasi untuk jadwal tanpa divisi**:
  Default schedule berfungsi sebagai fallback untuk seluruh karyawan. Schedule yang sudah di-assign ke divisi spesifik tidak seharusnya menjadi fallback general. Ini mencegah konflik logika lookup schedule.

---

## Notes & Improvements

- **Known Limitation**: Schedule changes don't retroactively affect existing attendance records
- **Recent Changes**:
  - ✅ Added support for multiple break times
  - ✅ Removed break_duration field (now calculated from breaks)
  - ✅ Working hours per day now auto-calculated from start/end times
  - ✅ GPS default changed from true to false
  - ✅ Added detail modal for viewing schedule information
  - ✅ Made schedule names clickable in list view
  - ✅ Fixed division_id null handling in edit form
  - ✅ Added division selection dropdown in form (fetched via form-data endpoint)
  - ✅ Added company-based GPS coordinates (auto-populate from company data)
  - ✅ Created `GET /hrd/work-schedules/form-data` endpoint (returns divisions + companies)
  - ✅ Restricted "Set as Default" to general (non-division) schedules only
  - ✅ Added backend validation `ErrCannotSetDivisionScheduleAsDefault`
  - ✅ Added i18n keys for new form fields (placeholders, descriptions)
- **Future Improvement**:
  - Add shift schedule support (morning/afternoon/night shifts)
  - Add schedule calendar view to visualize division assignments
  - Add schedule effective date range (start/end date for schedule validity)
  - Add schedule override for specific dates (e.g., half-day on certain dates)

---

_Document generated for GIMS Platform - Sprint 13: HRD Work Schedule Management_  
_Updated: February 2026 - Version 1.2.0_
