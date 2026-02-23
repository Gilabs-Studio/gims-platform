# Employee Certification Management (Migrated to Organization Module)

## Overview

Employee certification tracking feature for managing professional certifications with expiry tracking. Fully integrated into the Employee Management module under Organization. Originally part of HRD Sprint 14, this feature has been **migrated** into the employee detail modal as a sub-resource, following the same pattern as Employee Contracts and Education History.

All CRUD operations are performed within the employee detail modal — no standalone page exists.

## Migration Summary

| Aspect            | Before (HRD)                                     | After (Organization)                                                                      |
| ----------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Backend path      | `/hrd/employee-certifications`                   | `/organization/employees/:id/certifications`                                              |
| Backend module    | `internal/hrd/`                                  | `internal/organization/`                                                                  |
| Frontend location | `features/hrd/certifications/` (standalone page) | `features/master-data/employee/components/certifications/` (inside employee detail modal) |
| Permissions       | `certification.*`                                | `employee.read`, `employee.update`, `employee.delete`                                     |
| Routing           | `/hrd/certifications`                            | Inside employee detail modal (no standalone page)                                         |
| i18n namespace    | `certification`                                  | `employee.certification`                                                                  |

## Features

- Track employee professional certifications (AWS, PMP, CISSP, etc.)
- Expiry tracking with computed fields (`is_expired`, `days_until_expiry`)
- Optional expiry date for lifetime/permanent certifications
- Certificate document upload via FileUpload component
- Certifications tab with timeline design and CRUD actions (all operations performed here)
- Status badges: Valid (green), Expiring Soon (yellow), Expired (red), No Expiry (gray)
- Chronological ordering by issue date (most recent first)
- Soft delete for audit trail

## Business Rules

### Certification Management

- Multiple certification records per employee allowed
- Employee must exist before adding certification
- Certification belongs to a specific employee (ownership validated)
- Soft delete preserves audit trail
- Created/updated tracking for compliance

### Date Validation

- `issue_date` format: YYYY-MM-DD (required)
- `expiry_date` format: YYYY-MM-DD (optional, nullable)
- If `expiry_date` provided, it must be **after** `issue_date`

### Expiry Status (computed on-the-fly, not stored)

- `is_expired = true` if `expiry_date < now`; `false` if `expiry_date` is nil
- `days_until_expiry`:
  - Positive number = days remaining
  - Negative number = days passed since expired
  - `999999` = no expiry date (never expires)

### Data Integrity

- Employee must exist before adding certification
- Certification history belongs to a specific employee (ownership validated via URL param)
- Soft delete preserves audit trail
- Created/updated tracking for compliance

## API Endpoints

| Method | Endpoint                                                       | Permission        | Description                             |
| ------ | -------------------------------------------------------------- | ----------------- | --------------------------------------- |
| GET    | `/organization/employees/:id/certifications`                   | `employee.read`   | List all certifications for an employee |
| POST   | `/organization/employees/:id/certifications`                   | `employee.update` | Create new certification                |
| PUT    | `/organization/employees/:id/certifications/:certification_id` | `employee.update` | Update existing certification           |
| DELETE | `/organization/employees/:id/certifications/:certification_id` | `employee.delete` | Soft delete certification               |

### Employee Response Integration

The main `GET /organization/employees/:id` response includes a `latest_certification` brief object populated automatically:

- Returns the most recent **valid** (non-expired) certification by `issue_date`
- Falls back to `nil` if no valid certifications exist

## Data Structure

### EmployeeCertification Model

```go
type EmployeeCertification struct {
    ID                string         // uuid, primary key
    EmployeeID        string         // uuid, indexed
    CertificateName   string         // varchar(200), required
    IssuedBy          string         // varchar(200), required
    IssueDate         time.Time      // date, required
    ExpiryDate        *time.Time     // date, nullable (nil = no expiry)
    CertificateFile   string         // varchar(255), path to uploaded file
    CertificateNumber string         // varchar(100), optional
    Description       string         // text, optional
    CreatedBy         string         // varchar(255)
    UpdatedBy         string         // varchar(255)
    CreatedAt         time.Time
    UpdatedAt         time.Time
    DeletedAt         gorm.DeletedAt // soft delete
}
```

### Model Methods

- `BeforeCreate(tx)`: Auto-generates UUID if ID is empty
- `TableName()`: Returns `"employee_certifications"`
- `IsExpired()`: Returns `true` if `ExpiryDate < now`; `false` if `ExpiryDate` is nil
- `DaysUntilExpiry()`: Returns days remaining (negative if expired, `999999` if no expiry)

## Request/Response Examples

### Create Request

```json
POST /organization/employees/:employee_id/certifications

{
  "certificate_name": "AWS Certified Solutions Architect",
  "issued_by": "Amazon Web Services",
  "issue_date": "2024-01-15",
  "expiry_date": "2027-01-15",
  "certificate_number": "AWS-CSA-12345",
  "certificate_file": "/uploads/abc123_aws_cert.pdf",
  "description": "Cloud architecture certification"
}
```

### Create Permanent Certification (no expiry)

```json
POST /organization/employees/:employee_id/certifications

{
  "certificate_name": "Professional Scrum Master I (PSM I)",
  "issued_by": "Scrum.org",
  "issue_date": "2023-06-01",
  "certificate_number": "PSM-98765",
  "description": "Scrum framework and agile practices"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "c1111111-1111-1111-1111-111111111111",
    "employee_id": "11111111-1111-1111-1111-111111111111",
    "certificate_name": "AWS Certified Solutions Architect",
    "issued_by": "Amazon Web Services",
    "issue_date": "2024-01-15",
    "expiry_date": "2027-01-15",
    "certificate_file": "/uploads/abc123_aws_cert.pdf",
    "certificate_number": "AWS-CSA-12345",
    "description": "Cloud architecture certification",
    "is_expired": false,
    "days_until_expiry": 330,
    "created_at": "2026-02-17T10:00:00+07:00",
    "updated_at": "2026-02-17T10:00:00+07:00"
  },
  "timestamp": "2026-02-17T10:00:00+07:00",
  "request_id": "req_create_cert_123"
}
```

### Update Request

```json
PUT /organization/employees/:employee_id/certifications/:certification_id

{
  "certificate_name": "AWS Certified Solutions Architect - Professional",
  "expiry_date": "2028-01-15",
  "description": "Upgraded to Professional level"
}
```

### List Response

```json
{
  "success": true,
  "data": [
    {
      "id": "c1111111-1111-1111-1111-111111111111",
      "employee_id": "11111111-1111-1111-1111-111111111111",
      "certificate_name": "AWS Certified Solutions Architect",
      "issued_by": "Amazon Web Services",
      "issue_date": "2024-01-15",
      "expiry_date": "2027-01-15",
      "certificate_file": "/uploads/abc123_aws_cert.pdf",
      "certificate_number": "AWS-CSA-12345",
      "description": "Cloud architecture certification",
      "is_expired": false,
      "days_until_expiry": 330,
      "created_at": "2026-02-17T10:00:00+07:00",
      "updated_at": "2026-02-17T10:00:00+07:00"
    }
  ],
  "timestamp": "2026-02-17T10:00:00+07:00",
  "request_id": "req_list_cert_456"
}
```

## Validation Rules

### Create Request

- `certificate_name`: required, max 200 characters
- `issued_by`: required, max 200 characters
- `issue_date`: required, format YYYY-MM-DD
- `expiry_date`: optional, format YYYY-MM-DD, must be after `issue_date`
- `certificate_file`: optional, max 255 characters
- `certificate_number`: optional, max 100 characters
- `description`: optional, text

### Update Request

- All fields optional (omitempty)
- Same validation rules as create for provided fields
- Cannot change `employee_id` (immutable, derived from URL)

## Error Handling

### Error Codes

| Code                          | HTTP Status | Description                               |
| ----------------------------- | ----------- | ----------------------------------------- |
| `EMPLOYEE_NOT_FOUND`          | 404         | Employee doesn't exist in database        |
| `CERTIFICATION_NOT_FOUND`     | 404         | Certification record not found or deleted |
| `VALIDATION_ERROR`            | 400         | Invalid input data (dates, etc.)          |
| `INVALID_CERTIFICATION_DATES` | 400         | Expiry date must be after issue date      |
| `FORBIDDEN`                   | 403         | Missing required permission               |
| `INTERNAL_ERROR`              | 500         | Unexpected server error                   |

### Common Validation Errors

- "employee not found" - Employee ID doesn't exist
- "certification not found" - Record doesn't exist
- "expiry date must be after issue date" - Invalid date range
- "certification does not belong to employee" - Ownership mismatch

## Frontend Implementation

### Architecture

Certification components are integrated into the employee detail modal under `apps/web/src/features/master-data/employee/components/certifications/`:

```
employee/
├── types/index.d.ts              # EmployeeCertification, EmployeeCertificationBrief, etc.
├── services/employee-service.ts  # API methods for certification CRUD
├── hooks/use-employees.ts        # TanStack Query hooks (certificationKeys)
├── i18n/en.ts, id.ts             # Translation keys under "employee.certification"
└── components/
    └── certifications/
        ├── index.ts                          # Barrel export
        ├── certification-info-card.tsx        # (Deprecated - removed from Overview tab)
        ├── certification-timeline.tsx         # Timeline tab (list + actions)
        ├── create-certification-dialog.tsx    # Create dialog with no-expiry checkbox
        ├── edit-certification-dialog.tsx      # Edit dialog with no-expiry checkbox
        └── delete-certification-dialog.tsx    # Delete confirmation dialog
```

### Employee Detail Modal Integration

#### Certifications Tab (Primary CRUD Location)

- **All CRUD operations are performed in this tab** — no read-only section in Overview
- Timeline design showing all certification records chronologically by issue date
- Status icons and colors per entry:
  - Valid: green check
  - Expiring Soon (within 30 days): yellow alert
  - Expired: red X
  - No Expiry: blue infinity
- Action buttons: Add Certification, Edit, Delete (permission-gated)
- Document download link when `certificate_file` exists
- Empty state message when no records exist

### Components

#### CreateCertificationDialog

- Props: `open`, `onOpenChange`, `employeeId`, `onSuccess`
- No-expiry checkbox: disables expiry date field when checked
- Client-side validation: expiry date must be after issue date
- Submit calls API, shows success/error toast

#### EditCertificationDialog

- Same form fields as Create, pre-populated with existing data
- No-expiry checkbox based on existing expiry date
- Client-side validation: expiry date must be after issue date

#### DeleteCertificationDialog

- Simple confirmation dialog with cancel/delete buttons

### State Management

#### TanStack Query Hooks

Located in `hooks/use-employees.ts`:

**Query Key Factory**:

```typescript
certificationKeys = {
  all: ["employee-certifications"],
  lists: (employeeId) => [...all, "list", employeeId],
};
```

**Hooks**:

- `useEmployeeCertifications(employeeId)`: List certifications for employee
- `useCreateEmployeeCertification()`: Create with cache invalidation
- `useUpdateEmployeeCertification()`: Update with cache invalidation
- `useDeleteEmployeeCertification()`: Delete with cache invalidation

All mutations invalidate `certificationKeys.lists(employeeId)` to refresh the certifications list in the Certifications tab.

#### API Service

Located in `services/employee-service.ts`:

```typescript
getEmployeeCertifications(employeeId); // GET /:id/certifications
createEmployeeCertification(employeeId, data); // POST /:id/certifications
updateEmployeeCertification(employeeId, certificationId, data); // PUT /:id/certifications/:certification_id
deleteEmployeeCertification(employeeId, certificationId); // DELETE /:id/certifications/:certification_id
```

### Internationalization (i18n)

**Locales**: English (`en`) + Indonesian (`id`)

**Namespace**: `employee.certification`

**Key Sections**:

1. `sections` - Section titles (latestCertification)
2. `fields` - Field labels (certificateName, issuedBy, issueDate, expiryDate, certificateNumber, certificateFile, description, status)
3. `status` - Status badges (valid, expiringSoon, expired, noExpiry)
4. `actions` - Action buttons (create, edit, delete, processing)
5. `empty` - Empty state messages (noCertification, noHistory)
6. `form` - Form-specific labels (createTitle, editTitle, deleteTitle, deleteConfirm, placeholders, noExpiryLabel)
7. `success` - Success toast messages (created, updated, deleted)
8. `error` - Error toast messages (createFailed, updateFailed, deleteFailed)
9. `daysRemaining` - "{days} days remaining"
10. `expiredDaysAgo` - "Expired {days} days ago"

### Permissions

**Required Permissions** (reuses employee permissions):

- `employee.read`: View certification list and details
- `employee.update`: Create and edit certification records
- `employee.delete`: Delete certification records

**UI Behavior**:

- Add button hidden if no `employee.update` permission
- Edit action hidden if no `employee.update` permission
- Delete action hidden if no `employee.delete` permission

## Database Schema

### Table: employee_certifications

- Primary key: `id` (UUID, auto-generated)
- Foreign key: `employee_id` → `employees.id`
- Index: `idx_employee_certification_employee` on `employee_id`
- Soft delete: `deleted_at` timestamp
- Registered in `migrate.go` as `&organization.EmployeeCertification{}`

## Backend Folder Structure

```
internal/organization/
├── data/
│   ├── models/employee_certification.go              # Model with BeforeCreate(), IsExpired(), DaysUntilExpiry()
│   └── repositories/employee_certification_repository.go  # Interface + impl (CRUD, FindByEmployeeID, FindLatestByEmployeeID)
├── domain/
│   ├── dto/employee_certification_dto.go             # Create, Update, Response, BriefResponse DTOs
│   ├── mapper/employee_certification_mapper.go       # ToCertificationResponse, ToCertificationResponseList, ToCertificationBriefResponse
│   └── usecase/employee_usecase.go                   # Certification methods embedded in EmployeeUsecase
└── presentation/
    ├── handler/employee_handler.go                   # Certification HTTP handlers
    └── router/employee_routers.go                    # Routes under /employees/:id/certifications
```

## Testing

### Manual Testing Steps

1. Login as HR admin with `employee.read` and `employee.update` permissions
2. Navigate to Master Data → Employees
3. Click on an employee to open the detail modal
4. Go to the **Certifications** tab — verify timeline displays all records with status badges
5. Click "Add Certification" — fill form with valid data:
   - Certificate name, issued by, issue date
   - Test **no-expiry checkbox**: check it → expiry date field should be disabled
   - Test **date validation**: try setting expiry date before issue date → should show error
   - Upload a certificate document
   - Submit → verify success toast and record appears in timeline
6. Create a certification with expiry date within 30 days → verify "Expiring Soon" badge
7. Edit a record → verify form pre-populates all fields
8. Delete a record → verify confirmation dialog and soft delete

### Backend Test Commands

```bash
cd apps/api
go test ./internal/organization/... -v -run TestCertification
```

## Technical Decisions

### Why Migrate to Organization Module?

- Certification is a sub-resource of employee, not a standalone HRD entity
- Aligns with the Employee Contract and Education History migration patterns
- Simplifies frontend by consolidating into the employee detail modal
- Reduces permission complexity (reuse `employee.*` permissions)

### Why Sub-Resource URL Pattern?

- `/employees/:id/certifications` clearly expresses ownership
- Automatic employee validation (employee must exist)
- Consistent with contract and education sub-resource patterns
- Prevents IDOR by always scoping to the employee context

### Why Optional Expiry Date?

- Some certifications never expire (e.g., PSM I, university-issued certifications)
- `nil` expiry_date indicates permanent/lifetime certification
- Computed fields handle the null case gracefully

### Why Computed Status Fields?

- `is_expired` and `days_until_expiry` are calculated on-the-fly
- Avoids stale data in the database
- Frontend uses these for status badge rendering

## Related Features

- **Employee Contracts**: Same sub-resource migration pattern
- **Employee Education History**: Same sub-resource migration pattern
- **Employee Detail Modal**: Central UI for all employee sub-resources

## References

- Education History Migration Docs: `docs/features/HRD/hrd-education-history.md`
- Contract Migration Docs: `docs/features/HRD/hrd-employee-contracts.md`
- API Standards: `docs/api-standart/README.md`
- Postman Collection: `docs/postman/postman.json` (Organization → Employee Certifications)

## Document Version

| Version | Date       | Changes                                                                                                                                 |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-02-07 | Initial documentation (standalone HRD module)                                                                                           |
| 1.1.0   | 2026-02-07 | Dialog-based pattern refactor, type safety, i18n                                                                                        |
| 2.0.0   | 2026-02-17 | List status filter, detail modal, edit form prefill                                                                                     |
| 2.1.0   | 2026-02-17 | Backend DTO refactor, database schema correction                                                                                        |
| 3.0.0   | 2026-02-17 | **Migration to Organization module** — sub-resource pattern, employee detail modal integration, timeline design, old HRD module removed |
