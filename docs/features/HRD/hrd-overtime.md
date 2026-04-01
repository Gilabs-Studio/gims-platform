# HRD - Overtime Management

> **Module:** HRD (Human Resource Development)  
> **Sprint:** 13  
> **Version:** 1.0.0  
> **Status:** ✅ Complete (API + Frontend)  
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
10. [Recent Changes](#recent-changes)

---

## Overview

The HRD Overtime Management module provides comprehensive overtime tracking and approval workflow for employees, including:

- **Overtime Request** submission with time tracking
- **Approval Workflow** with manager/HR approval
- **Calendar & List Views** for easy management
- **Employee Enrichment** - Responses include employee name, code, division, and approver name

### Key Features

| Feature                | Description                                                     |
| ---------------------- | --------------------------------------------------------------- |
| Manual Overtime Entry  | HR/Admin can create overtime requests for employees             |
| Auto-Detected Overtime | System automatically detects overtime from clock-out times      |
| Approval Workflow      | Pending → Approved/Rejected with proper authorization           |
| Calendar View          | Visual calendar showing overtime requests by date               |
| List View              | Tabular view with filtering and sorting                         |
| Employee Selection     | Dropdown to select employee when creating requests              |
| Duration Calculation   | Automatic calculation of overtime duration from start/end times |
| Approver Name Display  | Shows approver name instead of ID in responses                  |

---

## Features

### 1. Overtime Request Types

| Request Type    | Description                                  |
| --------------- | -------------------------------------------- |
| `AUTO_DETECTED` | System automatically detected from clock-out |
| `MANUAL_CLAIM`  | Employee or HR manually submitted claim      |
| `PRE_APPROVED`  | Pre-approved before working overtime         |

### 2. Overtime Status

| Status     | Description            |
| ---------- | ---------------------- |
| `PENDING`  | Waiting for approval   |
| `APPROVED` | Approved by manager/HR |
| `REJECTED` | Rejected with reason   |
| `CANCELED` | Canceled by employee   |

### 3. View Modes

- **Calendar View**: Monthly calendar showing overtime by date with color-coded status badges
- **List View**: Table view with search, filters, and pagination

---

## System Architecture

### Backend Structure

```
apps/api/internal/hrd/
├── data/models/
│   └── overtime_request.go         # GORM entity
├── data/repositories/
│   └── overtime_request_repository.go  # Data access layer
├── domain/dto/
│   └── overtime_request_dto.go     # Request/Response DTOs
├── domain/mapper/
│   └── overtime_request_mapper.go  # Model ↔ DTO mapping
├── domain/usecase/
│   └── overtime_request_usecase.go # Business logic
├── presentation/handler/
│   └── overtime_request_handler.go # HTTP handlers
└── presentation/router/
    └── overtime_request_router.go  # Route definitions
```

### Frontend Structure

```
apps/web/src/features/hrd/overtime/
├── components/
│   ├── overtime-list.tsx           # List/Calendar view component
│   ├── overtime-dialog.tsx         # Create/Edit form dialog
│   ├── overtime-approval-dialog.tsx # Approve/Reject dialog
│   └── index.ts
├── hooks/
│   └── use-overtime.ts             # React Query hooks
├── services/
│   └── overtime-service.ts         # API service
├── types/
│   └── index.d.ts                  # TypeScript types
└── i18n/
    ├── en.ts                       # English translations
    └── id.ts                       # Indonesian translations
```

---

## Data Models

### OvertimeRequest (Database)

| Field                 | Type        | Description                                |
| --------------------- | ----------- | ------------------------------------------ |
| `id`                  | uuid        | Primary key                                |
| `employee_id`         | uuid        | Employee who requested overtime            |
| `date`                | date        | Overtime date                              |
| `request_type`        | enum        | AUTO_DETECTED, MANUAL_CLAIM, PRE_APPROVED  |
| `status`              | enum        | PENDING, APPROVED, REJECTED, CANCELED      |
| `start_time`          | timestamptz | Overtime start time                        |
| `end_time`            | timestamptz | Overtime end time                          |
| `planned_minutes`     | int         | Planned duration in minutes                |
| `actual_minutes`      | int         | Actual duration in minutes                 |
| `approved_minutes`    | int         | Approved duration (can be adjusted)        |
| `reason`              | string      | Reason for overtime (optional)             |
| `description`         | text        | Additional description                     |
| `task_details`        | text        | What work was done                         |
| `approved_by`         | uuid        | Approver employee ID                       |
| `approved_at`         | timestamptz | Approval timestamp                         |
| `rejected_by`         | uuid        | Rejecter employee ID                       |
| `rejected_at`         | timestamptz | Rejection timestamp                        |
| `reject_reason`       | string      | Reason for rejection                       |
| `overtime_rate`       | decimal     | Rate multiplier (1.5x weekday, 2x weekend) |
| `compensation_amount` | decimal     | Calculated compensation                    |

### CreateOvertimeRequestDTO

```go
type CreateOvertimeRequestDTO struct {
    EmployeeID  string  `json:"employee_id"`  // Optional for admin/HR
    Date        string  `json:"date"`         // Required: YYYY-MM-DD
    StartTime   string  `json:"start_time"`   // Required: HH:MM
    EndTime     string  `json:"end_time"`     // Required: HH:MM
    Reason      string  `json:"reason"`       // Optional: max 500 chars
    Description string  `json:"description"`  // Optional
    TaskDetails string  `json:"task_details"` // Optional
    RequestType string  `json:"request_type"` // Required: AUTO_DETECTED|MANUAL_CLAIM|PRE_APPROVED
}
```

### OvertimeRequestResponse

```go
type OvertimeRequestResponse struct {
    ID                 string  `json:"id"`
    EmployeeID         string  `json:"employee_id"`
    EmployeeName       string  `json:"employee_name"`      // Enriched
    EmployeeCode       string  `json:"employee_code"`      // Enriched
    DivisionName       string  `json:"division_name"`      // Enriched
    Date               string  `json:"date"`
    RequestType        string  `json:"request_type"`
    StartTime          string  `json:"start_time"`
    EndTime            string  `json:"end_time"`
    PlannedMinutes     int     `json:"planned_minutes"`
    PlannedHours       string  `json:"planned_hours"`      // Formatted
    ActualMinutes      int     `json:"actual_minutes"`
    ActualHours        string  `json:"actual_hours"`       // Formatted
    ApprovedMinutes    int     `json:"approved_minutes"`
    ApprovedHours      string  `json:"approved_hours"`     // Formatted
    Reason             string  `json:"reason"`
    Description        string  `json:"description"`
    TaskDetails        string  `json:"task_details"`
    Status             string  `json:"status"`
    ApprovedBy         *string `json:"approved_by,omitempty"`
    ApprovedByName     string  `json:"approved_by_name,omitempty"`  // Enriched
    ApprovedAt         *string `json:"approved_at,omitempty"`
    RejectedBy         *string `json:"rejected_by,omitempty"`
    RejectedAt         *string `json:"rejected_at,omitempty"`
    RejectReason       string  `json:"reject_reason"`
    OvertimeRate       float64 `json:"overtime_rate"`
    CompensationAmount float64 `json:"compensation_amount"`
    CreatedAt          string  `json:"created_at"`
    UpdatedAt          string  `json:"updated_at"`
}
```

---

## Business Logic

### 1. Duration Calculation

- **Planned Minutes**: Calculated from start_time and end_time
- **Actual Minutes**: Same as planned for manual claims
- **Approved Minutes**: Can be adjusted by approver (defaults to actual minutes)

### 2. Overtime Rate

- **Weekdays**: 1.5x rate
- **Weekends (Sat/Sun)**: 2.0x rate

### 3. Approval Workflow

```
[PENDING] → [APPROVED] → Compensation calculated
    ↓
[REJECTED] → Reason required
    ↓
[CANCELED] → By employee before approval
```

### 4. Employee Data Enrichment

All list and detail endpoints enrich responses with:

- Employee Name & Code from employee table
- Division Name from division table
- Approver Name from employee table (when approved)

---

## API Reference

### Endpoints

| Method | Endpoint                           | Permission       | Description                |
| ------ | ---------------------------------- | ---------------- | -------------------------- |
| GET    | `/api/v1/hrd/overtime`             | overtime.read    | List all overtime requests |
| GET    | `/api/v1/hrd/overtime/:id`         | overtime.read    | Get overtime request by ID |
| POST   | `/api/v1/hrd/overtime`             | overtime.create  | Create overtime request    |
| PUT    | `/api/v1/hrd/overtime/:id`         | overtime.update  | Update overtime request    |
| DELETE | `/api/v1/hrd/overtime/:id`         | overtime.delete  | Delete overtime request    |
| POST   | `/api/v1/hrd/overtime/:id/approve` | overtime.approve | Approve overtime request   |
| POST   | `/api/v1/hrd/overtime/:id/reject`  | overtime.approve | Reject overtime request    |
| POST   | `/api/v1/hrd/overtime/:id/cancel`  | -                | Cancel own request         |
| GET    | `/api/v1/hrd/overtime/pending`     | overtime.approve | List pending for approval  |
| GET    | `/api/v1/hrd/overtime/my-summary`  | -                | Get own monthly summary    |

### Query Parameters (List)

| Parameter      | Type | Description                                               |
| -------------- | ---- | --------------------------------------------------------- |
| `page`         | int  | Page number (default: 1)                                  |
| `per_page`     | int  | Items per page (default: 20, max: 100)                    |
| `employee_id`  | uuid | Filter by employee                                        |
| `status`       | enum | Filter by status: PENDING, APPROVED, REJECTED, CANCELED   |
| `request_type` | enum | Filter by type: AUTO_DETECTED, MANUAL_CLAIM, PRE_APPROVED |
| `date_from`    | date | Start date filter (YYYY-MM-DD)                            |
| `date_to`      | date | End date filter (YYYY-MM-DD)                              |

### Example Requests

**Create Overtime Request:**

```json
POST /api/v1/hrd/overtime
{
  "employee_id": "33333333-3333-3333-3333-333333333333",
  "date": "2026-03-24",
  "start_time": "18:00",
  "end_time": "21:00",
  "reason": "Project deadline",
  "request_type": "MANUAL_CLAIM"
}
```

**Approve Overtime Request:**

```json
POST /api/v1/hrd/overtime/123e4567-e89b-12d3-a456-426614174000/approve
{
  "approved_minutes": 180
}
```

**Reject Overtime Request:**

```json
POST /api/v1/hrd/overtime/123e4567-e89b-12d3-a456-426614174000/reject
{
  "reason": "Not enough budget"
}
```

---

## Frontend Components

### OvertimeList

Main component displaying overtime requests in calendar or list view.

**Features:**

- View mode toggle (Calendar/List)
- Search by employee name/code
- Filter by status, month, year
- Action dropdowns (View, Edit, Approve, Reject, Delete)
- Pagination

### OvertimeDialog

Form dialog for creating/editing overtime requests.

**Fields:**

- Employee Selection (dropdown with search)
- Date picker
- Start/End time inputs
- Reason (optional)
- Type selection

### OvertimeApprovalDialog

Dialog for approving or rejecting overtime requests.

**Features:**

- Displays request details (employee, time, duration)
- Shows reason for overtime
- Adjust approved minutes (optional)
- Rejection reason input (required for reject)

---

## User Flows

### 1. Create Overtime Request (Admin/HR)

```
1. Click "Add Overtime" button
2. Select employee from dropdown
3. Select overtime date
4. Set start and end times
5. Enter reason (optional)
6. Select request type
7. Submit
8. Request created with PENDING status
```

### 2. Approve Overtime Request (Manager/HR)

```
1. View pending requests
2. Click action menu on a request
3. Select "Approve"
4. Review request details
5. Adjust approved minutes if needed (defaults to planned)
6. Click "Approve"
7. Status changes to APPROVED
8. Approved by name shown in details
```

### 3. Calendar View Navigation

```
1. Toggle to Calendar view
2. Navigate months with prev/next buttons
3. Click on a date to see day's requests
4. Color-coded badges show status
5. Click request to view details
```

---

## Permissions

| Permission         | Description                      |
| ------------------ | -------------------------------- |
| `overtime.read`    | View overtime requests           |
| `overtime.create`  | Create overtime requests         |
| `overtime.update`  | Edit overtime requests           |
| `overtime.delete`  | Delete overtime requests         |
| `overtime.approve` | Approve/reject overtime requests |

---

## Recent Changes

### v1.0.0 (March 2026)

#### Features

- ✅ Initial overtime management implementation
- ✅ Manual overtime entry by admin/HR
- ✅ Approval workflow with status tracking
- ✅ Calendar and List views
- ✅ Employee data enrichment (name, code, division)
- ✅ Approver name display in responses

#### Improvements

- ✅ Reason field now optional (was required)
- ✅ User ID to Employee ID conversion for approver
- ✅ Proper employee lookup by user_id in approve/reject handlers

#### Technical

- ✅ Removed all debug logging
- ✅ Clean production-ready code
- ✅ TypeScript types updated
- ✅ Backend DTO validation updated

---

## Integration Points

### With Attendance Module

- Auto-detected overtime created from clock-out times
- Linked to attendance record via `attendance_record_id`

### With Employee Module

- Employee data enrichment from employee repository
- Division name from division table
- Approver name lookup from employee table

### With Work Schedule Module

- Overtime rate calculation based on date (weekday/weekend)

---

## Notes

- **Reason Field**: Now optional for all overtime requests
- **Approver Display**: Shows approver name instead of ID in UI and API responses
- **Employee Lookup**: System automatically converts user_id (from JWT) to employee_id when approving/rejecting
- **Calendar View**: Shows up to 3 requests per day, with "+N more" indicator

---

## Future Enhancements (Planned)

- [ ] Email notifications for pending approvals
- [ ] Bulk approval/rejection
- [ ] Overtime report export (PDF/Excel)
- [ ] Integration with payroll module
- [ ] Mobile app support

---

## Support

For issues or questions regarding the Overtime Management module:

1. Check the [API Standards](../../api-standart/README.md) for endpoint conventions
2. Review [Attendance Documentation](hrd-attendance.md) for related features
3. Contact the HRD module maintainers
