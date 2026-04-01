# HRD - Employee Asset Management

> **Module:** Organization (Master Data > Employees)  
> **Sprint:** —  
> **Version:** 2.0.0  
> **Status:** ✅ Complete (API + Frontend + Finance Assets Integration)  
> **Last Updated:** March 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [System Architecture](#system-architecture)
4. [Data Models](#data-models)
5. [Business Logic](#business-logic)
6. [API Reference](#api-reference)
7. [Frontend Components](#frontend-components)
8. [User Flows](#user-flows)
9. [Permissions](#permissions)
10. [Configuration](#configuration)
11. [Integration Points](#integration-points)
12. [Testing Strategy](#testing-strategy)
13. [Keputusan Teknis](#keputusan-teknis)
14. [Notes & Improvements](#notes--improvements)
15. [Appendix](#appendix)

---

## Overview

Employee Asset Management is a sub-feature of the Employee Management module that tracks company assets borrowed by employees. This feature allows HR administrators to monitor equipment distribution, track asset conditions, and manage returns.

### Key Features

| Feature                    | Description                                                                  |
| -------------------------- | ---------------------------------------------------------------------------- |
| Asset Tracking             | Track company assets borrowed by employees (laptops, phones, monitors, etc.) |
| Finance Assets Integration | Link employee assets to Finance Assets module for centralized inventory      |
| Status Sync                | Auto-update Finance Assets status: active ↔ in_use on borrow/return         |
| Audit Logging              | Automatic audit log entries in Finance Assets for borrow/return events       |
| Status Management          | Status tracking: BORROWED (active) vs RETURNED (completed)                   |
| Condition Tracking         | Track condition at borrow and return time (NEW, GOOD, FAIR, POOR, DAMAGED)   |
| Image Upload               | Optional asset image upload via `/upload/image` endpoint (converted to WebP) |
| Image Preview              | Clickable image thumbnail opens full-size lightbox preview                   |
| Return Workflow            | Return Asset action with date/condition validation                           |
| Timeline View              | Assets tab with timeline design showing chronological history                |
| Days Counter               | Computed days borrowed calculation                                           |
| Soft Delete                | Soft delete for audit trail preservation                                     |

---

## Features

### 1. Asset Lifecycle Management

Track assets from borrowing through return:

| Stage    | Description                                        |
| -------- | -------------------------------------------------- |
| `Create` | Record new asset borrow with details and condition |
| `Update` | Modify asset details (only for unreturned assets)  |
| `Return` | Mark asset as returned with condition and date     |
| `Delete` | Soft delete asset record                           |

### 2. Asset Status

| Status     | Description                             |
| ---------- | --------------------------------------- |
| `BORROWED` | Asset is currently borrowed by employee |
| `RETURNED` | Asset has been returned                 |

### 3. Asset Condition

| Condition | Description                      |
| --------- | -------------------------------- |
| `NEW`     | Brand new, unused                |
| `GOOD`    | Good working condition           |
| `FAIR`    | Fair condition, minor wear       |
| `POOR`    | Poor condition, significant wear |
| `DAMAGED` | Damaged or non-functional        |

### 4. Image Support

- Asset images can be uploaded via `/upload/image` endpoint
- Supports JPEG, PNG, GIF, WebP (auto-converted to WebP)
- Clickable thumbnail opens lightbox with zoom effect
- Images are optional

---

## System Architecture

### Backend Structure

```
apps/api/internal/organization/
├── data/
│   ├── models/
│   │   └── employee_asset.go              # EmployeeAsset model with asset_id FK
│   └── repositories/
│       └── employee_asset_repository.go   # CRUD + FindByAssetID
├── domain/
│   ├── dto/
│   │   └── employee_asset_dto.go          # DTOs with AvailableAssetResponse
│   ├── mapper/
│   │   └── employee_asset_mapper.go
│   └── usecase/
│       └── employee_usecase.go            # Asset methods with Finance Assets integration
├── presentation/
│   ├── handler/
│   │   └── employee_handler.go
│   └── router/
│       └── employee_routers.go

# Finance Assets Integration
apps/api/internal/finance/
├── data/
│   ├── models/
│   │   ├── asset.go                       # Finance Asset model
│   │   └── asset_audit_log.go             # Audit log for status changes
│   └── repositories/
│       ├── asset_repository.go            # UpdateStatus method
│       └── asset_audit_log_repository.go  # Create audit logs
├── domain/
│   └── usecase/
│       └── asset_usecase.go               # GetAvailableAssets method
└── presentation/
    └── handler/
        └── asset_handler.go               # GetAvailableAssets endpoint
```

### Frontend Structure

```
apps/web/src/features/master-data/employee/
├── types/
│   └── index.d.ts                   # EmployeeAsset types and interfaces
├── schemas/
│   └── employee.schema.ts           # Asset validation schemas
├── services/
│   └── employee-service.ts          # getEmployeeAssets, createEmployeeAsset, etc.
├── hooks/
│   └── use-employees.ts             # assetKeys, useEmployeeAssets, mutations
├── i18n/
│   ├── en.ts                        # asset.* translations
│   └── id.ts
└── components/
    ├── assets/
    │   ├── index.ts                 # Barrel exports
    │   ├── asset-timeline.tsx       # Timeline with status/condition badges, image
    │   ├── create-asset-dialog.tsx  # Create form with image upload
    │   ├── edit-asset-dialog.tsx    # Edit form (disabled for returned assets)
    │   ├── return-asset-dialog.tsx  # Return form with date/condition
    │   ├── delete-asset-dialog.tsx  # Confirmation dialog
    │   └── image-lightbox.tsx       # Full-size image preview
    └── employee-detail-modal.tsx    # Assets tab integration
```

---

## Data Models

### EmployeeAsset

| Field            | Type        | Description                                              |
| ---------------- | ----------- | -------------------------------------------------------- |
| id               | UUID        | Primary key                                              |
| employee_id      | UUID        | Employee reference (FK)                                  |
| asset_id         | UUID        | Finance Asset reference (FK, nullable)                   |
| asset_name       | STRING(200) | Asset name/description                                   |
| asset_code       | STRING(100) | Unique asset identifier                                  |
| asset_category   | STRING(100) | Category (Laptop, Phone, etc.)                           |
| borrow_date      | DATE        | Date asset was borrowed                                  |
| return_date      | DATE        | Date asset was returned (nullable)                       |
| borrow_condition | ENUM        | Condition when borrowed (NEW, GOOD, FAIR, POOR, DAMAGED) |
| return_condition | ENUM        | Condition when returned (nullable)                       |
| asset_image      | STRING(255) | Path to uploaded image (nullable)                        |
| notes            | TEXT        | Additional notes                                         |
| status           | ENUM        | BORROWED or RETURNED                                     |
| created_at       | TIMESTAMP   | Record creation                                          |
| updated_at       | TIMESTAMP   | Last update                                              |
| deleted_at       | TIMESTAMP   | Soft delete timestamp                                    |

---

## Business Logic

### Asset Creation (Borrow)

```
1. Validate employee exists
2. If asset_id provided (Finance Assets integration):
   a. Validate asset exists in Finance Assets
   b. Validate asset status = ACTIVE (available)
   c. Check asset not already borrowed
   d. Update Finance Assets status to IN_USE
   e. Create audit log entry (action: "borrowed")
3. Validate asset_code is unique globally
4. Set status = BORROWED
5. Set borrow_date (defaults to today)
6. Store optional image if provided
7. Create employee asset record
```

### Asset Update

```
1. Verify asset exists and belongs to employee
2. Reject if status = RETURNED (immutable for audit)
3. Allow partial updates
4. Asset image can be set to null/empty to remove
```

### Asset Return

```
1. Verify asset exists and status = BORROWED
2. Reject if already returned
3. Validate return_date >= borrow_date
4. Set status = RETURNED
5. Record return_condition (mandatory)
6. If linked to Finance Assets (asset_id exists):
   a. Update Finance Assets status to ACTIVE
   b. Create audit log entry (action: "returned")
7. Optional return notes
```

### Days Borrowed Calculation

```
if status = RETURNED:
    days_borrowed = return_date - borrow_date
else:
    days_borrowed = today - borrow_date
```

---

## API Reference

All endpoints are sub-resources under `/api/v1/organization/employees/:employee_id/assets`.

### Asset Endpoints

| Method | Endpoint                                 | Permission      | Description                        |
| ------ | ---------------------------------------- | --------------- | ---------------------------------- |
| GET    | `/finance/assets/available`              | asset.read      | Get available assets for borrowing |
| GET    | `/employees/:id/assets`                  | employee.read   | Get all assets for an employee     |
| POST   | `/employees/:id/assets`                  | employee.update | Create new asset record            |
| PUT    | `/employees/:id/assets/:asset_id`        | employee.update | Update existing (unreturned) asset |
| POST   | `/employees/:id/assets/:asset_id/return` | employee.update | Mark asset as returned             |
| DELETE | `/employees/:id/assets/:asset_id`        | employee.delete | Soft delete asset record           |

### Request Bodies

**Create Asset:**

```json
{
  "asset_id": "uuid-of-finance-asset", // Optional: Links to Finance Assets
  "asset_name": "MacBook Pro 16\" M3 Max",
  "asset_code": "LAP-001",
  "asset_category": "Laptop",
  "borrow_date": "2026-02-01",
  "borrow_condition": "NEW",
  "asset_image": "/uploads/asset-image.webp",
  "notes": "For development work"
}
```

**Update Asset:**

```json
{
  "asset_name": "MacBook Pro 16\" M3 Max (Updated)",
  "asset_category": "Laptop - Development",
  "asset_image": "/uploads/new-image.webp",
  "notes": "Updated notes"
}
```

**Return Asset:**

```json
{
  "return_date": "2026-02-17",
  "return_condition": "GOOD",
  "notes": "All accessories returned"
}
```

### Response Schema

**EmployeeAssetResponse:**

```json
{
  "id": "uuid",
  "employee_id": "uuid",
  "asset_id": "uuid-of-finance-asset", // Present if linked to Finance Assets
  "asset": {
    // Populated Finance Asset data
    "id": "uuid",
    "code": "AST-202601-0001",
    "name": "MacBook Pro 16\" M3 Max",
    "category": {
      "id": "uuid",
      "name": "Laptop"
    },
    "location": {
      "id": "uuid",
      "name": "Main Office"
    }
  },
  "asset_name": "MacBook Pro 16\" M3 Max",
  "asset_code": "LAP-001",
  "asset_category": "Laptop",
  "borrow_date": "2026-02-01",
  "return_date": null,
  "borrow_condition": "NEW",
  "return_condition": null,
  "asset_image": "/uploads/asset-image.webp",
  "notes": "For development work",
  "status": "BORROWED",
  "days_borrowed": 16,
  "created_at": "2026-02-01T10:30:00+07:00",
  "updated_at": "2026-02-01T10:30:00+07:00"
}
```

---

## Frontend Components

### Assets Tab (Employee Detail Modal)

| Component           | File                    | Description                                                  |
| ------------------- | ----------------------- | ------------------------------------------------------------ |
| `AssetTimeline`     | asset-timeline.tsx      | Timeline view with status/condition badges, image thumbnails |
| `CreateAssetDialog` | create-asset-dialog.tsx | Form for creating new asset borrow                           |
| `EditAssetDialog`   | edit-asset-dialog.tsx   | Edit form (disabled for returned assets)                     |
| `ReturnAssetDialog` | return-asset-dialog.tsx | Return workflow with date/condition                          |
| `DeleteAssetDialog` | delete-asset-dialog.tsx | Confirmation dialog                                          |
| `ImageLightbox`     | image-lightbox.tsx      | Full-size image preview with zoom                            |

### Features

- Timeline layout with status-colored dots (blue=BORROWED, green=RETURNED)
- Each card shows: asset name, code, category, image thumbnail, dates, conditions, days borrowed
- Clickable image thumbnail opens lightbox dialog
- Action buttons: Return (borrowed only), Edit (borrowed only), Delete
- "Add Asset" button at top right
- Chronological ordering by borrow date (most recent first)

### Create/Edit Asset Dialog

- **Asset Selection Dropdown**: Select from available Finance Assets (status = ACTIVE)
- Auto-populated fields when selecting from dropdown:
  - Asset Name (editable)
  - Asset Code (editable)
  - Asset Category (editable)
  - Default image from Finance Assets (can be overridden)
- Manual entry option: Fill all fields manually if asset not in Finance Assets
- Borrow Date auto-fills with today's date
- Image upload uses `uploadEndpoint="/upload/image"`
- Shows "Linked" badge in timeline for Finance Assets-linked items

### Return Asset Dialog

- Shows asset summary (code, name, borrowed since)
- Fields: Return Date* (min = borrow date), Return Condition*, Notes
- Return Date auto-fills with today's date
- Calendar prevents selecting dates before borrow date

---

## User Flows

### Asset Borrow Flow (with Finance Assets Integration)

```mermaid
sequenceDiagram
    participant HR as HR Admin
    participant UI as Employee Modal
    participant API as Backend API
    participant Finance as Finance Assets API
    participant DB as Database

    HR->>UI: Open employee detail modal
    HR->>UI: Click Assets tab
    UI->>API: GET /employees/:id/assets
    API->>DB: Query employee assets
    DB-->>API: Asset list
    API-->>UI: EmployeeAssetResponse[]

    HR->>UI: Click "Add Asset"
    UI->>API: GET /finance/assets/available
    API->>Finance: Query active assets
    Finance-->>API: AvailableAsset[]
    API-->>UI: Dropdown list

    HR->>UI: Select asset from dropdown
    UI->>UI: Auto-fill asset data (name, code, category)
    HR->>UI: Adjust borrow condition, optionally upload image
    UI->>API: POST /employees/:id/assets (with asset_id)
    API->>Finance: Verify asset status = ACTIVE
    API->>Finance: Update status to IN_USE
    API->>Finance: Create audit log (borrowed)
    API->>DB: Create employee asset record
    DB-->>API: Created record
    API-->>UI: EmployeeAssetResponse
    UI-->>HR: Show success toast, refresh list
```

### Asset Return Flow (with Finance Assets Integration)

```mermaid
sequenceDiagram
    participant HR as HR Admin
    participant UI as Asset Timeline
    participant API as Backend API
    participant Finance as Finance Assets API
    participant DB as Database

    HR->>UI: View Assets tab
    HR->>UI: Click "Return" on borrowed asset
    UI->>UI: Open return dialog
    HR->>UI: Select return date and condition
    UI->>API: POST /employees/:id/assets/:asset_id/return
    API->>DB: Update status to RETURNED
    API->>DB: Set return_date and return_condition
    API->>Finance: Check if linked to Finance Asset
    alt Asset is linked
        API->>Finance: Update status to ACTIVE
        API->>Finance: Create audit log (returned)
    end
    DB-->>API: Updated record
    API-->>UI: EmployeeAssetResponse
    UI-->>HR: Show success toast, update timeline
```

---

## Permissions

| Action               | Permission        |
| -------------------- | ----------------- |
| View assets          | `employee.read`   |
| Create/Update/Return | `employee.update` |
| Delete               | `employee.delete` |

---

## Configuration

### i18n Keys

All translations nested under `employee.asset`:

| Key Path                      | Description                                         |
| ----------------------------- | --------------------------------------------------- |
| `employee.asset.fields.*`     | Field labels (assetName, assetCode, category, etc.) |
| `employee.asset.conditions.*` | Condition labels (NEW, GOOD, FAIR, POOR, DAMAGED)   |
| `employee.asset.statuses.*`   | Status labels (BORROWED, RETURNED)                  |
| `employee.asset.actions.*`    | Action buttons                                      |
| `employee.asset.form.*`       | Form titles, placeholders, hints                    |
| `employee.asset.success.*`    | Success messages                                    |
| `employee.asset.error.*`      | Error messages                                      |
| `employee.asset.empty.*`      | Empty state messages                                |
| `employee.tabs.assets`        | Tab label                                           |

---

## Integration Points

### With Employee Module

- Assets are sub-resources of employees
- Accessed via employee detail modal
- Permissions inherit from employee permissions
- Asset history is part of employee profile

### With Finance Assets Module

**Available Assets Endpoint:**

- `GET /api/v1/finance/assets/available` - Returns assets with status = ACTIVE

**Status Synchronization:**
| Employee Action | Finance Assets Status | Audit Log Action |
| --------------- | --------------------- | ---------------- |
| Borrow Asset | ACTIVE → IN_USE | "borrowed" |
| Return Asset | IN_USE → ACTIVE | "returned" |

**Audit Log Entries:**

- **Borrow**: Records status change, employee assignment, borrow date
- **Return**: Records status change, employee removal, return date, return condition

**Data Flow:**

1. HR selects asset from available Finance Assets dropdown
2. Asset data (name, code, category) auto-populated from Finance Assets
3. Optional: Default image from Finance Assets used if no custom image uploaded
4. On borrow: Finance Assets status updated to IN_USE
5. On return: Finance Assets status updated back to ACTIVE

### With Upload Module

- Asset images uploaded via `/upload/image` endpoint
- Returns path stored in `asset_image` field
- Auto-converted to WebP format
- Can use Finance Assets default image if available

---

## Testing Strategy

### Backend Tests

- Unit tests in `employee_usecase_test.go`
- Repository tests for asset CRUD
- Validation tests for unique asset_code

### Frontend Tests

- Component tests for asset timeline
- Dialog form validation tests
- Image upload integration tests

### Manual Testing

1. Navigate to **Master Data > Employees**
2. Click employee to open detail modal
3. Go to **Assets** tab
4. **Create**: Add asset with image, verify auto-filled borrow date
5. **Image Preview**: Click thumbnail, verify lightbox opens
6. **Return**: Return asset, verify date picker constraints
7. **Edit**: Edit borrowed asset, verify returned assets are immutable
8. **Delete**: Delete asset, verify soft delete

---

## Keputusan Teknis

| Decision                                                   | Rationale                                                                                                                                                  |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Image upload via `/upload/image`**                       | The document upload endpoint only accepts PDF/Word/Excel; asset images need the image upload endpoint which accepts JPEG/PNG/GIF/WebP and converts to WebP |
| **Borrow/Return date auto-fill with today**                | Most common use-case is recording asset borrow/return on the same day; reduces friction                                                                    |
| **Return date calendar disables dates before borrow date** | Prevents invalid data at the UI level; borrow date normalized to midnight to avoid timezone edge cases                                                     |
| **Image lightbox with DialogTitle sr-only**                | Radix UI requires DialogTitle for accessibility; hidden visually but available to screen readers                                                           |
| **Frontend client-side sort by borrow date**               | Defensive sort ensures correct ordering regardless of API response order                                                                                   |
| **Returned assets immutable**                              | Audit trail requirement; once returned, asset record should not be modified to maintain historical accuracy                                                |
| **Soft delete instead of hard delete**                     | Preserves complete audit trail for compliance and reporting                                                                                                |
| **Global unique asset_code**                               | Enables cross-employee asset tracking and prevents duplicate codes across organization                                                                     |
| **Finance Assets integration with asset_id**               | Links employee assets to centralized inventory for real-time availability and status synchronization                                                       |
| **Auto-update Finance Assets status**                      | Ensures asset availability is always accurate across modules; IN_USE prevents double-booking                                                               |
| **Audit log on borrow/return**                             | Complete traceability in Finance Assets module for compliance and asset lifecycle tracking                                                                 |
| **Asset status validation on borrow**                      | Only ACTIVE assets can be borrowed; prevents borrowing already-in-use or disposed assets                                                                   |

---

## Notes & Improvements

### Completed Features

- ✅ Timeline view with status and condition badges
- ✅ Image upload with WebP conversion
- ✅ Lightbox image preview
- ✅ Return workflow with validation
- ✅ Days borrowed auto-calculation
- ✅ Soft delete for audit trail
- ✅ **Finance Assets Integration**
  - Available assets endpoint for dropdown selection
  - Auto-populate asset data from Finance Assets
  - Support for Finance Assets default images
- ✅ **Status Synchronization**
  - Auto-update Finance Assets status: ACTIVE ↔ IN_USE
  - Real-time availability tracking
- ✅ **Audit Logging**
  - Automatic audit entries on borrow/return
  - Records status changes and employee assignments
  - Stored in Finance Assets audit trail

### Future Improvements

- Asset barcode/QR code scanning
- Asset inventory report with Finance Assets data
- Bulk asset import from Finance Assets
- Asset depreciation tracking
- Asset maintenance history integration
- Procurement module integration for asset acquisition

---

## Appendix

### Database Migration

**Migration File:** `20260322_add_asset_id_to_employee_assets.sql`

```sql
-- Add asset_id column to employee_assets table
ALTER TABLE employee_assets
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES fixed_assets(id) ON DELETE SET NULL;

-- Add index for asset_id
CREATE INDEX IF NOT EXISTS idx_employee_assets_asset_id ON employee_assets(asset_id);
```

### Error Codes

| Code                      | HTTP Status | Description                         |
| ------------------------- | ----------- | ----------------------------------- |
| `VALIDATION_ERROR`        | 400         | Invalid request body                |
| `ASSET_NOT_FOUND`         | 404         | Asset does not exist                |
| `ASSET_ALREADY_RETURNED`  | 400         | Cannot update/return returned asset |
| `INVALID_RETURN_DATE`     | 400         | Return date before borrow date      |
| `DUPLICATE_ASSET_CODE`    | 400         | Asset code already exists           |
| `EMPLOYEE_NOT_FOUND`      | 404         | Employee does not exist             |
| `FINANCE_ASSET_NOT_FOUND` | 404         | Finance Assets record not found     |
| `ASSET_NOT_AVAILABLE`     | 400         | Finance Asset status is not ACTIVE  |
| `ASSET_ALREADY_BORROWED`  | 400         | Asset is already borrowed           |

---

_Document generated for GIMS Platform - Employee Asset Management_
