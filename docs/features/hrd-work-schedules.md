# HRD - Work Schedule Management

> **Module:** HRD (Human Resource Development)  
> **Sprint:** 13  
> **Version:** 1.0.0  
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

| Feature | Description |
|---------|-------------|
| Fixed & Flexible Hours | Supports standard 9-to-5 and flexible start/end time schedules |
| Division-Based Assignment | Assign schedules to specific divisions or set a company-wide default |
| GPS Validation | Configurable office coordinates and radius for clock-in validation |
| Working Days Bitmask | Flexible working day selection (Mon-Fri, Mon-Sat, custom) |
| Tolerance Settings | Grace periods for late arrival and early departure |
| Break Configuration | Configurable break start/end times and duration |
| Default Schedule | One schedule can be marked as the company-wide default |

---

## Features

### Schedule Types

| Type | Description |
|------|-------------|
| Fixed Hours | Standard start/end time (e.g., 08:00–17:00) |
| Flexible Hours | Allowed range for clock-in/out (e.g., clock in 07:00–10:00, clock out 16:00–19:00) |

### Working Days Bitmask

Working days are stored as a bitmask integer for efficient storage and querying:

| Day | Bit Value | Example |
|-----|-----------|---------|
| Monday | 1 | |
| Tuesday | 2 | |
| Wednesday | 4 | |
| Thursday | 8 | |
| Friday | 16 | |
| Saturday | 32 | |
| Sunday | 64 | |
| **Mon-Fri** | **31** | 1+2+4+8+16 |
| **Mon-Sat** | **63** | 1+2+4+8+16+32 |
| **All Days** | **127** | 1+2+4+8+16+32+64 |

### GPS Configuration

- **Require GPS**: Toggle GPS validation on/off per schedule
- **GPS Radius**: Allowed distance (meters) from office coordinates
- **Office Location**: Latitude/longitude of the office for distance calculation

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

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | STRING(100) | Schedule name |
| description | STRING(255) | Optional description |
| division_id | UUID | Optional division link (nullable) |
| is_default | BOOL | Default schedule flag (only one allowed) |
| is_active | BOOL | Active status |
| start_time | STRING(5) | Work start time (format: "HH:MM") |
| end_time | STRING(5) | Work end time (format: "HH:MM") |
| is_flexible | BOOL | Flexible hours flag |
| flexible_start_time | STRING(5) | Earliest allowed clock-in (flexible mode) |
| flexible_end_time | STRING(5) | Latest allowed clock-in (flexible mode) |
| break_start_time | STRING(5) | Break start time |
| break_end_time | STRING(5) | Break end time |
| break_duration | INT | Break duration in minutes (default: 60) |
| working_days | INT | Bitmask for working days (default: 31 = Mon-Fri) |
| working_hours_per_day | FLOAT | Expected working hours (default: 8.00) |
| late_tolerance_minutes | INT | Grace period for late arrival (minutes) |
| early_leave_tolerance_minutes | INT | Grace period for early departure (minutes) |
| require_gps | BOOL | Whether GPS validation is required (default: true) |
| gps_radius_meter | FLOAT | Allowed radius from office in meters (default: 100) |
| office_latitude | FLOAT | Office GPS latitude |
| office_longitude | FLOAT | Office GPS longitude |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

---

## Business Rules

- **Only one default schedule** allowed across the entire system — setting a new default automatically unsets the previous one
- **Division-based lookup**: When an employee clocks in, the system first looks for a schedule assigned to their division; if none found, falls back to the default schedule
- **GPS validation**: Only enforced for `NORMAL` check-in type (not for WFH or FIELD_WORK)
- **Late calculation**: `late_minutes = max(0, check_in_time - (start_time + late_tolerance_minutes))`
- **Early leave calculation**: `early_leave_minutes = max(0, (end_time - early_leave_tolerance_minutes) - check_out_time)`
- **Working minutes**: `working_minutes = check_out_time - check_in_time - break_duration`
- **Overtime detection**: Triggered when clock-out exceeds `end_time + 30 minutes buffer`
- Cannot delete the default schedule — must set another as default first

---

## API Reference

### Work Schedule Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/hrd/work-schedules` | work_schedule.read | List schedules (paginated, filterable) |
| GET | `/api/v1/hrd/work-schedules/default` | work_schedule.read | Get the default schedule |
| GET | `/api/v1/hrd/work-schedules/:id` | work_schedule.read | Get schedule by ID |
| POST | `/api/v1/hrd/work-schedules` | work_schedule.create | Create a new schedule |
| PUT | `/api/v1/hrd/work-schedules/:id` | work_schedule.update | Update a schedule |
| DELETE | `/api/v1/hrd/work-schedules/:id` | work_schedule.delete | Delete a schedule |
| POST | `/api/v1/hrd/work-schedules/:id/set-default` | work_schedule.update | Set a schedule as default |

### Query Parameters (List)

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | int | Page number (default: 1) |
| `per_page` | int | Items per page (default: 20, max: 100) |
| `search` | string | Search by name or description (ILIKE) |
| `is_active` | bool | Filter by active status |
| `is_flexible` | bool | Filter by flexible hours flag |
| `division_id` | uuid | Filter by division |

---

## Frontend Components

### Work Schedules (`/hrd/work-schedules`)

| Component | File | Description |
|-----------|------|-------------|
| `WorkScheduleList` | work-schedule-list.tsx | Paginated table with CRUD actions, default badge |
| `WorkScheduleDialog` | work-schedule-dialog.tsx | Create/Edit form dialog with all config fields |
| `WorkSchedulePageClient` | work-schedule-page-client.tsx | Page wrapper with animations |

**Features:**
- List all work schedules with pagination and search
- Default schedule badge indicator
- Create new schedule with flexible hours configuration
- Working days bitmask selector (Mon-Sun checkboxes)
- GPS location and radius configuration
- Break time settings
- Late/Early tolerance configuration
- Set default schedule action (from dropdown menu)
- Active/Inactive status toggle

### Hooks (TanStack Query)

| Hook | File | Description |
|------|------|-------------|
| `useWorkSchedules` | use-work-schedules.ts | Schedule CRUD operations |

### i18n Keys

Translations under `hrd.workSchedule`:
- `title`, `description` — Page headers
- `fields.*` — Form field labels (name, startTime, endTime, etc.)
- `workingDaysOptions.*` — Preset working day labels
- `days.*` — Day abbreviations (Mon, Tue, etc.)
- `actions.*` — Action buttons (create, edit, delete)
- `messages.*` — Toast messages (success, error, confirm)

---

## Permissions

| Permission | Description |
|------------|-------------|
| `work_schedule.read` | View work schedules |
| `work_schedule.create` | Create work schedules |
| `work_schedule.update` | Update work schedules + set default |
| `work_schedule.delete` | Delete work schedules |

---

## Configuration

### Default Schedules (Seeder)

Two schedules are seeded by default:

```
Standard Office Hours:
- Name: Standard Office Hours
- Start: 08:00
- End: 17:00
- Break: 12:00 - 13:00 (60 min)
- Working Days: Mon-Fri (31)
- Late Tolerance: 15 min
- Early Leave Tolerance: 10 min
- GPS Required: Yes
- GPS Radius: 100m
- Is Default: Yes

Flexible Hours:
- Name: Flexible Hours
- Start: 08:00
- End: 17:00
- Flexible Start: 07:00
- Flexible End: 10:00
- Is Flexible: Yes
- Working Days: Mon-Fri (31)
- GPS Required: Yes
- Is Default: No
```

### Configuration Impact

| Setting | Impact on Attendance |
|---------|---------------------|
| `late_tolerance_minutes` | Determines when an employee is marked as LATE |
| `early_leave_tolerance_minutes` | Determines early departure penalty |
| `require_gps` | Enables/disables GPS distance check on NORMAL clock-in |
| `gps_radius_meter` | Maximum distance from office for valid clock-in |
| `working_hours_per_day` | Used for overtime calculation baseline |
| `break_duration` | Deducted from total working minutes |

---

## Integration Points

### With Attendance Module (Primary)
- Schedule is resolved per employee (division-based → default fallback)
- Clock-in validates GPS based on schedule's `require_gps` and `gps_radius_meter`
- Late minutes calculated against schedule's `start_time + late_tolerance_minutes`
- Early leave against `end_time - early_leave_tolerance_minutes`
- Overtime auto-detected when clock-out > `end_time + 30 min`
- Working minutes reduced by `break_duration`
- The `work_schedule_id` is stored on each attendance record
- The `work_schedule_name` is enriched in the attendance detail response

### With Overtime Module
- Overtime auto-detection uses schedule end time as baseline
- Overtime rate can differ by schedule type (weekday vs weekend)

### With Form Data Endpoint
- Active schedules are returned in the `GET /hrd/attendance/form-data` response for dropdown selection

---

## Manual Testing

1. Login as admin
2. Navigate to `/hrd/work-schedules`
3. Verify default schedule shows "Default" badge
4. Click "Add Work Schedule" → fill in all fields
5. Toggle "Flexible Hours" → flexible time fields should appear
6. Select working days via checkboxes
7. Submit → should show success toast, schedule appears in list
8. Test "Set as Default" from dropdown menu on a non-default schedule
9. Verify the old default lost its badge
10. Test GPS settings: set coordinates and radius
11. Verify schedule is used during attendance clock-in for associated division

---

## Keputusan Teknis

- **Mengapa division-based schedule lookup (bukan hanya default)**:
  Tiap divisi bisa punya jadwal kerja berbeda (misal sales di lapangan vs admin di kantor). `getScheduleForEmployee()` cek divisi dulu, fallback ke default. Trade-off: 1 extra query per clock-in, tapi akurasi jadwal jauh lebih baik.

- **Mengapa working days pakai bitmask (bukan array)**:
  Bitmask lebih efisien untuk storage dan comparison. Checking if today is a working day: `schedule.WorkingDays & (1 << weekday) != 0`. Trade-off: kurang readable, tapi performant dan standard di ERP systems.

- **Mengapa GPS validation hanya untuk NORMAL check-in type**:
  WFH dan FIELD_WORK secara definisi tidak di kantor. Menvalidasi GPS untuk tipe ini akan selalu gagal. GPS tetap di-log untuk FIELD_WORK (audit trail), tapi tidak divalidasi terhadap office location.

---

## Notes & Improvements

- **Known Limitation**: Schedule changes don't retroactively affect existing attendance records
- **Future Improvement**:
  - Add shift schedule support (morning/afternoon/night shifts)
  - Add schedule calendar view to visualize division assignments
  - Support multiple office locations per schedule
  - Add schedule effective date range (start/end date for schedule validity)
  - Add schedule override for specific dates (e.g., half-day on certain dates)

---

*Document generated for GIMS Platform - Sprint 13: HRD Work Schedule Management*
