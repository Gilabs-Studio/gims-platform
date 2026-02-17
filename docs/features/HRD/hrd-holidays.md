# HRD - Holiday Management

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
9. [Integration Points](#integration-points)
10. [Manual Testing](#manual-testing)
11. [Keputusan Teknis](#keputusan-teknis)
12. [Notes & Improvements](#notes--improvements)

---

## Overview

The Holiday Management sub-module allows administrators to configure company holidays, national holidays, and collective leave days. Holidays impact attendance tracking by automatically marking employees as holiday status and preventing clock-in on national holidays.

### Key Features

| Feature | Description |
|---------|-------------|
| Multi-Type Holidays | Supports National, Collective, and Company holidays |
| Calendar View | Full year calendar visualization of all holidays |
| Batch Import | Import multiple holidays at once (JSON/CSV) |
| Recurring Holidays | Flag holidays that repeat annually (e.g., New Year) |
| Leave Integration | Collective leave can deduct from annual leave quota |
| Holiday Check | API to verify if a specific date is a holiday |

---

## Features

### Holiday Types

| Type | Description |
|------|-------------|
| `NATIONAL` | Government-mandated public holidays |
| `COLLECTIVE` | Company-wide collective leave (Cuti Bersama) |
| `COMPANY` | Company-specific holidays |

### Special Flags

- **Is Collective Leave** (`is_collective_leave`): Marks the day as collective leave
- **Cuts Annual Leave** (`cuts_annual_leave`): Deducts from employee's annual leave quota when enabled
- **Is Recurring** (`is_recurring`): Repeats annually (e.g., New Year, Independence Day)
- **Is Active** (`is_active`): Controls whether the holiday is currently active

---

## System Architecture

### Backend Structure

```
apps/api/internal/hrd/
├── data/
│   ├── models/holiday.go
│   └── repositories/holiday_repository.go
├── domain/
│   ├── dto/holiday_dto.go
│   ├── mapper/holiday_mapper.go
│   └── usecase/holiday_usecase.go
└── presentation/
    ├── handler/holiday_handler.go
    └── router/holiday_router.go
```

### Frontend Structure

```
apps/web/src/features/hrd/holidays/
├── types/index.d.ts
├── schemas/holiday.schema.ts
├── services/holiday-service.ts
├── hooks/use-holidays.ts
└── components/
    ├── holiday-list.tsx
    ├── holiday-dialog.tsx
    ├── holiday-calendar-view.tsx
    ├── holiday-page-client.tsx
    └── index.ts
```

### Frontend Pages

```
apps/web/app/[locale]/(dashboard)/hrd/holidays/
├── page.tsx
└── loading.tsx
```

---

## Data Model

### Holiday

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| date | DATE | Holiday date |
| name | STRING(100) | Holiday name |
| description | STRING(255) | Optional description |
| type | ENUM | `NATIONAL`, `COLLECTIVE`, `COMPANY` |
| year | INT | Year (extracted from date) |
| is_collective_leave | BOOL | Collective leave flag |
| cuts_annual_leave | BOOL | Deducts from annual leave quota |
| is_recurring | BOOL | Repeats annually |
| is_active | BOOL | Active status |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

---

## Business Rules

- Holidays are checked during attendance clock-in — employees cannot clock in (NORMAL type) on national holidays
- Collective leave holidays can optionally deduct from employee annual leave quotas
- Recurring holidays are seeded/checked annually
- Holiday dates must be unique per year (no duplicate dates)
- Batch import validates each entry individually; partial success is supported
- The `year` field is auto-extracted from the `date` field

---

## API Reference

### Holiday Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/hrd/holidays` | holiday.read | List holidays (paginated, filterable) |
| GET | `/api/v1/hrd/holidays/check` | holiday.read | Check if a specific date is a holiday |
| GET | `/api/v1/hrd/holidays/year/:year` | holiday.read | Get all holidays for a specific year |
| GET | `/api/v1/hrd/holidays/calendar/:year` | holiday.read | Calendar view data for a year |
| GET | `/api/v1/hrd/holidays/:id` | holiday.read | Get holiday by ID |
| POST | `/api/v1/hrd/holidays` | holiday.create | Create a single holiday |
| POST | `/api/v1/hrd/holidays/batch` | holiday.create | Batch create holidays |
| PUT | `/api/v1/hrd/holidays/:id` | holiday.update | Update a holiday |
| DELETE | `/api/v1/hrd/holidays/:id` | holiday.delete | Delete a holiday |

### Query Parameters (List)

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | int | Page number (default: 1) |
| `per_page` | int | Items per page (default: 20, max: 100) |
| `year` | int | Filter by year |
| `type` | string | Filter by type (NATIONAL, COLLECTIVE, COMPANY) |
| `is_active` | bool | Filter by active status |

---

## Frontend Components

### Holidays (`/hrd/holidays`)

| Component | File | Description |
|-----------|------|-------------|
| `HolidayList` | holiday-list.tsx | Paginated table with year filter and type badges |
| `HolidayDialog` | holiday-dialog.tsx | Create/Edit holiday form dialog |
| `HolidayCalendarView` | holiday-calendar-view.tsx | Full year calendar visualization |
| `HolidayPageClient` | holiday-page-client.tsx | Page wrapper with tab navigation (List / Calendar) |

**Features:**
- List view with year filter and holiday type badges
- Calendar view showing all holidays in a full year grid
- Create single holiday with type, date, and flags
- Batch import holidays (JSON/CSV format)
- Holiday type selection (National, Collective, Company)
- Recurring holiday flag
- Collective leave and annual leave deduction flags

### Hooks (TanStack Query)

| Hook | File | Description |
|------|------|-------------|
| `useHolidays` | use-holidays.ts | Holiday CRUD + calendar data fetching |

### i18n Keys

Translations under `hrd.holiday`:
- `title`, `description` — Page headers
- `types.*` — Holiday type labels (NATIONAL, COLLECTIVE, COMPANY)
- `fields.*` — Form field labels (date, name, type, etc.)
- `actions.*` — Action buttons (create, edit, delete, import, export)
- `messages.*` — Toast messages (success, error, confirm)

---

## Permissions

| Permission | Description |
|------------|-------------|
| `holiday.read` | View holidays |
| `holiday.create` | Create holidays |
| `holiday.update` | Update holidays |
| `holiday.delete` | Delete holidays |

---

## Integration Points

### With Attendance Module
- During clock-in, the system checks if the current date is a holiday
- National holidays block NORMAL check-in type
- Attendance status is auto-set to `HOLIDAY` on holiday dates

### With Leave Module (Future)
- Collective leave holidays can deduct from annual leave quotas
- Integration planned for Sprint 14+

---

## Manual Testing

1. Login as admin
2. Navigate to `/hrd/holidays`
3. Click "Add Holiday" → fill in name, date, type
4. Submit → should show success toast, holiday appears in list
5. Switch to Calendar view → holiday should be visible on the calendar
6. Click on a holiday in list → edit dialog opens
7. Test batch import with multiple holidays
8. Verify that clock-in is blocked on a national holiday date

---

## Keputusan Teknis

- **Mengapa batch import mendukung partial success**:
  Untuk UX yang lebih baik — jika ada 1-2 holiday yang gagal (misalnya tanggal duplikat), sisanya tetap bisa tersimpan. Response mengembalikan jumlah imported vs skipped.

- **Mengapa year di-extract dari date**:
  Untuk mempermudah query per tahun tanpa perlu parsing date di setiap query. Trade-off: sedikit redundant, tapi performa query jauh lebih baik dengan index pada `year`.

---

## Appendix

### Indonesia National Holidays 2024-2025 (Seeded)

| Date | Name | Type |
|------|------|------|
| 2024-01-01 | Tahun Baru | NATIONAL |
| 2024-02-08 | Isra Mi'raj | NATIONAL |
| 2024-02-10 | Tahun Baru Imlek | NATIONAL |
| 2024-03-11 | Hari Raya Nyepi | NATIONAL |
| 2024-03-29 | Wafat Isa Almasih | NATIONAL |
| 2024-04-10 | Hari Raya Idul Fitri | NATIONAL |
| 2024-04-11 | Hari Raya Idul Fitri | NATIONAL |
| 2024-05-01 | Hari Buruh | NATIONAL |
| 2024-05-09 | Kenaikan Isa Almasih | NATIONAL |
| 2024-05-23 | Hari Raya Waisak | NATIONAL |
| 2024-06-01 | Hari Lahir Pancasila | NATIONAL |
| 2024-06-17 | Hari Raya Idul Adha | NATIONAL |
| 2024-07-07 | Tahun Baru Islam | NATIONAL |
| 2024-08-17 | Hari Kemerdekaan | NATIONAL |
| 2024-09-16 | Maulid Nabi Muhammad | NATIONAL |
| 2024-12-25 | Hari Natal | NATIONAL |

---

## Notes & Improvements

- **Known Limitation**: No automatic holiday sync with external calendars
- **Future Improvement**:
  - Integration with external holiday API for auto-population
  - Holiday notification system for upcoming holidays
  - Regional holiday support (different holidays per office location)
  - Export holidays to iCal/ICS format

---

*Document generated for GIMS Platform - Sprint 13: HRD Holiday Management*
