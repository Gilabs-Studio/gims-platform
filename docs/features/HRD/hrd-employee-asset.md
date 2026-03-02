# Employee Asset Management (Migrated to Organization Module)

## Overview

Employee asset tracking feature for managing company assets borrowed by employees. Fully integrated into the Employee Management module under Organization. Originally part of HRD, this feature has been **migrated** into the employee detail modal as a sub-resource, following the same pattern as Employee Contracts, Education History, and Certifications.

All CRUD operations are performed within the employee detail modal — no standalone page exists.

## Migration Summary

| Aspect            | Before (HRD)                                        | After (Organization)                                                                 |
| ----------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Backend path      | `/hrd/employee-assets`                              | `/organization/employees/:id/assets`                                                 |
| Backend module    | `internal/hrd/`                                     | `internal/organization/`                                                             |
| Frontend location | `features/hrd/employee-assets/` (standalone page)   | `features/master-data/employee/components/assets/` (inside employee detail modal)    |
| Permissions       | `employee_asset.*`                                  | `employee.read`, `employee.update`, `employee.delete`                                |
| Routing           | `/hrd/employee-assets`                              | Inside employee detail modal (no standalone page)                                    |
| i18n namespace    | `employeeAssets`                                    | `employee.asset`                                                                     |
| Image upload      | N/A                                                 | Optional `asset_image` field (new)                                                   |

## Features

- Track company assets borrowed by employees (laptops, phones, monitors, etc.)
- Status tracking: BORROWED (active) vs RETURNED (completed)
- Condition tracking at borrow and return time (NEW, GOOD, FAIR, POOR, DAMAGED)
- Optional asset image upload (via `/upload/image` endpoint, converted to WebP)
- Clickable image thumbnail on timeline card — opens full-size lightbox preview
- Return Asset action with date/condition validation
- Assets tab with timeline design and CRUD actions (all operations performed here)
- Status badges: Borrowed (blue), Returned (green)
- Condition badges for borrow and return conditions
- Days borrowed counter (computed)
- Chronological ordering by borrow date (most recent first)
- Borrow date auto-fills with today's date on create
- Return date auto-fills with today's date on return
- Return date calendar prevents picking dates before borrow date
- Soft delete for audit trail

## Business Rules

### Asset Management

- Multiple asset records per employee allowed
- Employee must exist before adding asset
- Asset belongs to a specific employee (ownership validated via URL param)
- Asset code must be globally unique
- Soft delete preserves audit trail
- Created/updated tracking for compliance

### Borrow (Create)

- `asset_name` (required, max 200)
- `asset_code` (required, max 100, unique)
- `asset_category` (required, max 100)
- `borrow_date` (required, YYYY-MM-DD) — frontend auto-fills with today's date
- `borrow_condition` (required, one of: NEW, GOOD, FAIR, POOR, DAMAGED)
- `asset_image` (optional, max 255, uploaded via `/upload/image` endpoint — accepts JPEG, PNG, GIF, WebP; converted to WebP)
- `notes` (optional)

### Update

- Cannot update returned assets (immutable for audit trail)
- All fields optional (partial update)
- `asset_image` can be set to null/empty to remove image

### Return

- Cannot return already returned asset
- `return_date` must be after `borrow_date` — frontend calendar disables dates before borrow date
- `return_date` auto-fills with today's date
- `return_condition` is mandatory
- Return notes are optional

### Delete

- Soft delete (sets `deleted_at`)
- Preserves audit trail

## API Endpoints

All endpoints are sub-resources under `/api/v1/organization/employees/:employee_id/assets`.

### GET `/employees/:id/assets`

Get all assets for an employee.

- **Permission**: `employee.read`
- **Response**: Array of `EmployeeAssetResponse`

### POST `/employees/:id/assets`

Create a new asset record.

- **Permission**: `employee.update`
- **Request Body**:

```json
{
  "asset_name": "MacBook Pro 16\" M3 Max",
  "asset_code": "LAP-001",
  "asset_category": "Laptop",
  "borrow_date": "2026-02-01",
  "borrow_condition": "NEW",
  "asset_image": "/uploads/asset-image.jpg",
  "notes": "For development work"
}
```

- **Response**: `EmployeeAssetResponse`

### PUT `/employees/:id/assets/:asset_id`

Update an existing (unreturned) asset.

- **Permission**: `employee.update`
- **Request Body**: All fields optional (partial update)

```json
{
  "asset_name": "MacBook Pro 16\" M3 Max (Updated)",
  "asset_category": "Laptop - Development",
  "asset_image": "/uploads/new-image.jpg",
  "notes": "Updated notes"
}
```

- **Response**: `EmployeeAssetResponse`
- **Error**: 400 if asset already returned

### POST `/employees/:id/assets/:asset_id/return`

Mark an asset as returned.

- **Permission**: `employee.update`
- **Request Body**:

```json
{
  "return_date": "2026-02-17",
  "return_condition": "GOOD",
  "notes": "All accessories returned"
}
```

- **Response**: `EmployeeAssetResponse` with status="RETURNED"
- **Error**: 400 if already returned or return date before borrow date

### DELETE `/employees/:id/assets/:asset_id`

Delete an asset record (soft delete).

- **Permission**: `employee.delete`
- **Response**: Success message

## Response Schema

### EmployeeAssetResponse

```json
{
  "id": "uuid",
  "employee_id": "uuid",
  "asset_name": "MacBook Pro 16\" M3 Max",
  "asset_code": "LAP-001",
  "asset_category": "Laptop",
  "borrow_date": "2026-02-01",
  "return_date": null,
  "borrow_condition": "NEW",
  "return_condition": null,
  "asset_image": "/uploads/asset-image.jpg",
  "notes": "For development work",
  "status": "BORROWED",
  "days_borrowed": 16,
  "created_at": "2026-02-01T10:30:00+07:00",
  "updated_at": "2026-02-01T10:30:00+07:00"
}
```

## Error Codes

| Error Code              | HTTP Status | Description                          |
| ----------------------- | ----------- | ------------------------------------ |
| `VALIDATION_ERROR`      | 400         | Invalid request body                 |
| `ASSET_NOT_FOUND`       | 404         | Asset does not exist                 |
| `ASSET_ALREADY_RETURNED`| 400         | Cannot update/return returned asset  |
| `INVALID_RETURN_DATE`   | 400         | Return date before borrow date       |
| `DUPLICATE_ASSET_CODE`  | 400         | Asset code already exists            |
| `EMPLOYEE_NOT_FOUND`    | 404         | Employee does not exist              |

## File Structure

### Backend (Go)

```
apps/api/internal/organization/
├── data/
│   ├── models/
│   │   └── employee_asset.go          # EmployeeAsset model + enums
│   └── repositories/
│       └── employee_asset_repository.go
├── domain/
│   ├── dto/
│   │   └── employee_asset_dto.go      # Create/Update/Return/Response DTOs
│   ├── mapper/
│   │   └── employee_asset_mapper.go
│   └── usecase/
│       └── employee_usecase.go        # Asset methods embedded in EmployeeUsecase
├── presentation/
│   ├── handler/
│   │   └── employee_handler.go        # Asset handler methods
│   └── router/
│       └── employee_routers.go        # Asset routes under /:id/assets
```

### Frontend (React/Next.js)

```
apps/web/src/features/master-data/employee/
├── types/index.d.ts                   # EmployeeAsset, CreateEmployeeAssetData, etc.
├── services/employee-service.ts       # getEmployeeAssets, createEmployeeAsset, etc.
├── hooks/use-employees.ts             # assetKeys, useEmployeeAssets, mutations
├── i18n/
│   ├── en.ts                          # asset.* translations
│   └── id.ts
├── components/
│   ├── assets/
│   │   ├── index.ts                   # Barrel exports
│   │   ├── asset-timeline.tsx         # Timeline with status/condition badges, image
│   │   ├── create-asset-dialog.tsx    # Create form with image upload
│   │   ├── edit-asset-dialog.tsx      # Edit form (disabled for returned assets)
│   │   ├── return-asset-dialog.tsx    # Return form with date/condition
│   │   └── delete-asset-dialog.tsx    # Confirmation dialog
│   └── employee-detail-modal.tsx      # Assets tab integration
```

## UI Design

### Assets Tab (Timeline)

- Located after "Certifications" tab in employee detail modal
- Timeline layout with status-colored dots (blue=BORROWED, green=RETURNED)
- Each card shows: asset name, code, category, image thumbnail (if present), dates, conditions, days borrowed, notes
- Image thumbnail is clickable — opens a full-size lightbox dialog with zoom-in hover effect
- Lightbox dialog uses a visually-hidden `DialogTitle` for accessibility compliance
- Action buttons: Return (blue, only for borrowed), Edit (only for borrowed), Delete
- "Add Asset" button at top right

### Create/Edit Asset Dialog

- Fields: Asset Name*, Code*, Category*, Borrow Date*, Borrow Condition*, Asset Image (optional file upload), Notes
- Borrow Date auto-fills with today's date
- Image upload uses `uploadEndpoint="/upload/image"` (accepts .jpg, .jpeg, .png, .webp; auto-converts to WebP)
- Image preview after upload

### Return Asset Dialog

- Shows asset summary (code, name, borrowed since)
- Fields: Return Date* (min = borrow date), Return Condition*, Notes
- Return Date auto-fills with today's date
- Calendar prevents selecting dates before borrow date (borrow date normalized to midnight)

### Delete Asset Dialog

- Simple confirmation dialog with asset details

## Permissions

| Action                | Permission        |
| --------------------- | ----------------- |
| View assets           | `employee.read`   |
| Create/Update/Return  | `employee.update` |
| Delete                | `employee.delete` |

## i18n Keys

All translations nested under `employee.asset`:

- `employee.asset.fields.*` - Field labels
- `employee.asset.conditions.*` - Condition labels (NEW, GOOD, FAIR, POOR, DAMAGED)
- `employee.asset.statuses.*` - Status labels (BORROWED, RETURNED)
- `employee.asset.actions.*` - Action buttons
- `employee.asset.form.*` - Form titles, placeholders, hints
- `employee.asset.success.*` - Success messages
- `employee.asset.error.*` - Error messages
- `employee.asset.empty.*` - Empty state messages
- `employee.tabs.assets` - Tab label

## Technical Decisions

| Decision | Rationale |
| --- | --- |
| Image upload via `/upload/image` (not `/upload/document`) | The document upload endpoint only accepts PDF/Word/Excel; asset images need the image upload endpoint which accepts JPEG/PNG/GIF/WebP and converts to WebP |
| Borrow/Return date auto-fills with today | Most common use-case is recording asset borrow/return on the same day; reduces friction |
| Return date calendar disables dates before borrow date | Prevents invalid data at the UI level; borrow date normalized to midnight to avoid timezone edge cases |
| Image lightbox with `DialogTitle sr-only` | Radix UI requires `DialogTitle` for accessibility; hidden visually but available to screen readers |
| Frontend client-side sort by borrow date | Defensive sort in `asset-timeline.tsx` ensures correct ordering regardless of API response order |
| `uploadEndpoint` prop on `FileUpload` | Reusable component supports both document and image uploads via prop; defaults to document |

## How to Test Manually

1. Navigate to **Master Data > Employees**
2. Click on any employee to open the detail modal
3. Go to the **Assets** tab
4. **Create**: Click "Add Asset", fill the form (borrow date should be pre-filled with today), optionally upload an image, submit
5. **Image Preview**: If an asset has an image, hover over the thumbnail (zoom icon appears), click to open lightbox
6. **Return**: Click "Return" on a borrowed asset, return date should be pre-filled with today, try to pick a date before borrow date (should be disabled)
7. **Edit**: Click "Edit" on a borrowed asset, modify fields, submit
8. **Delete**: Click "Delete" on any asset, confirm deletion
