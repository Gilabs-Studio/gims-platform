# Employee Certifications Feature (Migrated to Organization Module)

## Overview

Employee professional certification tracking feature, fully integrated into the Employee Management module under Organization. Originally part of HRD, this feature has been **migrated** into the employee detail modal as a sub-resource, following the same pattern as Employee Contracts and Education History.

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

- Track employee professional certifications with expiry management
- Expiry status tracking: valid, expiring soon (within 30 days), expired, no expiry (lifetime)
- Document upload via FileUpload component: PDF, DOC, DOCX, JPG, JPEG, PNG; max 10MB
- Certifications tab with timeline design and CRUD actions (all CRUD operations performed here)
- Chronological ordering by issue date (most recent first)
- Soft delete for audit trail

## Business Rules

### Certification Tracking

- Multiple certifications per employee allowed
- Certificate name, issuing organization, and issue date are required
- Expiry date is optional (null = no expiry / lifetime certification)
- Certificate number optional (for official tracking)
- Document path optional (for certificate file storage)

### Date Validation

- `expiry_date` must be after `issue_date` (when provided)
- Dates must be in YYYY-MM-DD format

### Expiry Status Calculation

- `is_expired`: true if `expiry_date` exists and is in the past
- `days_until_expiry`: days until expiry (999999 if no expiry date)
- Frontend displays status badges:
  - **Valid** (green): expiry > 30 days from now
  - **Expiring Soon** (yellow): expiry within 30 days
  - **Expired** (red): expiry date has passed
  - **No Expiry** (blue): no expiry date set (lifetime)

### Data Integrity

- Employee must exist before adding certification
- Certification belongs to a specific employee (ownership validated)
- Soft delete preserves audit trail
- Created/updated tracking for compliance

## API Endpoints

| Method | Endpoint                                                       | Permission        | Description                             |
| ------ | -------------------------------------------------------------- | ----------------- | --------------------------------------- |
| GET    | `/organization/employees/:id/certifications`                   | `employee.read`   | List all certifications for an employee |
| POST   | `/organization/employees/:id/certifications`                   | `employee.update` | Create new certification record         |
| PUT    | `/organization/employees/:id/certifications/:certification_id` | `employee.update` | Update existing record                  |
| DELETE | `/organization/employees/:id/certifications/:certification_id` | `employee.delete` | Soft delete record                      |

### Employee Response Integration

The main `GET /organization/employees/:id` response includes a `latest_certification` brief object populated automatically:

- Returns the most recent non-expired certification by `issue_date`
- Returns `null` if no valid certifications exist

## Data Structure

### EmployeeCertification Model

```go
type EmployeeCertification struct {
    ID                string          // uuid, primary key
    EmployeeID        string          // uuid, indexed
    CertificateName   string          // varchar(200), required
    IssuedBy          string          // varchar(200), required
    IssueDate         time.Time       // date, required
    ExpiryDate        *time.Time      // date, nullable (nil = no expiry)
    CertificateFile   string          // varchar(255)
    CertificateNumber string          // varchar(100)
    Description       string          // text
    CreatedBy         string          // varchar(255)
    UpdatedBy         string          // varchar(255)
    CreatedAt         time.Time
    UpdatedAt         time.Time
    DeletedAt         gorm.DeletedAt  // soft delete
}
```

### Computed Fields

- `is_expired`: Boolean - true if expiry_date exists and is in the past
- `days_until_expiry`: Integer - days until expiry (999999 if no expiry)

## Request/Response Examples

### Create Request

```json
POST /organization/employees/:employee_id/certifications

{
  "certificate_name": "AWS Certified Solutions Architect - Associate",
  "issued_by": "Amazon Web Services",
  "issue_date": "2024-01-15",
  "expiry_date": "2027-01-15",
  "certificate_number": "AWS-CSA-12345",
  "certificate_file": "/uploads/cert-123.pdf",
  "description": "Cloud architecture and AWS services certification"
}
```

### Create Without Expiry (Lifetime Certification)

```json
POST /organization/employees/:employee_id/certifications

{
  "certificate_name": "Certified Public Accountant",
  "issued_by": "Indonesian Institute of Accountants",
  "issue_date": "2020-06-01",
  "certificate_number": "CPA-ID-98765",
  "description": "Lifetime professional accounting certification"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "c1111111-1111-1111-1111-111111111111",
    "employee_id": "11111111-1111-1111-1111-111111111111",
    "certificate_name": "AWS Certified Solutions Architect - Associate",
    "issued_by": "Amazon Web Services",
    "issue_date": "2024-01-15",
    "expiry_date": "2027-01-15",
    "certificate_file": "/uploads/cert-123.pdf",
    "certificate_number": "AWS-CSA-12345",
    "description": "Cloud architecture and AWS services certification",
    "is_expired": false,
    "days_until_expiry": 365,
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
  "certificate_number": "AWS-CSA-PRO-54321",
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
      "certificate_file": "/uploads/cert-123.pdf",
      "certificate_number": "AWS-CSA-12345",
      "description": "Cloud architecture certification",
      "is_expired": false,
      "days_until_expiry": 365,
      "created_at": "2024-01-15T10:00:00+07:00",
      "updated_at": "2024-01-15T10:00:00+07:00"
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
- `expiry_date`: optional, format YYYY-MM-DD, must be after issue_date
- `certificate_number`: optional, max 100 characters
- `certificate_file`: optional, max 255 characters
- `description`: optional, text

### Update Request

- All fields optional (omitempty)
- Same validation rules as create for provided fields
- Cannot change employee_id (immutable, derived from URL)

## Error Handling

### Error Codes

| Code                          | HTTP Status | Description                                       |
| ----------------------------- | ----------- | ------------------------------------------------- |
| `EMPLOYEE_NOT_FOUND`          | 404         | Employee doesn't exist in database                |
| `CERTIFICATION_NOT_FOUND`     | 404         | Certification record not found or deleted         |
| `VALIDATION_ERROR`            | 400         | Invalid input data (dates, required fields, etc.) |
| `INVALID_CERTIFICATION_DATES` | 400         | Expiry date is not after issue date               |
| `FORBIDDEN`                   | 403         | Missing required permission                       |
| `INTERNAL_ERROR`              | 500         | Unexpected server error                           |

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
        ├── index.ts                         # Barrel export
        ├── certification-info-card.tsx      # (Deprecated - removed from Overview tab)
        ├── certification-timeline.tsx       # Timeline tab (list + actions)
        ├── create-certification-dialog.tsx  # Create dialog with optional expiry
        ├── edit-certification-dialog.tsx    # Edit dialog pre-populated
        └── delete-certification-dialog.tsx  # Delete confirmation dialog
```

### Employee Detail Modal Integration

#### Certifications Tab (Primary CRUD Location)

- **All CRUD operations are performed in this tab** — no read-only section in Overview
- Timeline design showing all certifications chronologically by issue date
- Status indicators with distinct colors/icons:
  - Valid (green shield): expiry > 30 days
  - Expiring Soon (yellow alert): expiry within 30 days
  - Expired (red x-circle): past expiry date
  - No Expiry (blue infinity): lifetime certification
- Action buttons: Add Certification, Edit, Delete (permission-gated)
- Empty state message when no records exist
- Document filename displayed as clickable download link

### Components

#### CreateCertificationDialog

- Props: `open`, `onOpenChange`, `employeeId`, `onSuccess`
- Fields: certificate name (required), issued by (required), issue date (required), expiry date (optional with "no expiry" checkbox), certificate number, certificate file (FileUpload), description
- "No expiry" checkbox disables expiry date field when checked
- Submit validates expiry > issue date before calling API

#### EditCertificationDialog

- Same form fields as Create
- Pre-populates form from existing certification data
- "No expiry" checkbox pre-set based on whether `expiry_date` is null

#### DeleteCertificationDialog

- Simple confirmation dialog with cancel/delete buttons

### State Management

#### TanStack Query Hooks

Located in `hooks/use-employees.ts`:

**Query Key Factory**:

```typescript
certificationKeys = {
  all: ["employee-certifications"],
  lists: (employeeId) => [...all, employeeId],
};
```

**Hooks**:

- `useEmployeeCertifications(employeeId)`: List for employee
- `useCreateEmployeeCertification()`: Create with cache invalidation
- `useUpdateEmployeeCertification()`: Update with cache invalidation
- `useDeleteEmployeeCertification()`: Delete with cache invalidation

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

1. `sections` - Section titles
2. `fields` - Field labels (certificateName, issuedBy, issueDate, expiryDate, etc.)
3. `status` - Status labels (valid, expiringSoon, expired, noExpiry)
4. `actions` - Action buttons (create, edit, delete, processing, cancel)
5. `empty` - Empty state messages
6. `form` - Form-specific labels (titles, placeholders, noExpiry checkbox)
7. `success` - Success toast messages
8. `error` - Error toast messages
9. `duration` - Duration display messages

### Permissions

**Required Permissions** (reuses employee permissions):

- `employee.read`: View certification list and details
- `employee.update`: Create and edit certifications
- `employee.delete`: Delete certifications

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

## Testing

### Manual Testing Steps

1. Login as HR admin with `employee.read` and `employee.update` permissions
2. Navigate to Master Data → Employees
3. Click on an employee to open the detail modal
4. Go to the **Certifications** tab — verify timeline displays all records with correct status badges
5. Click "Add Certification" — fill form with valid data:
   - Certificate name, issued by, issue date
   - Test **no expiry checkbox**: check it → expiry date should be disabled
   - Upload a document
   - Submit → verify success toast and record appears in timeline
6. Test with expiry date → verify status badge shows correctly (valid/expiring soon)
7. Edit a record → verify form pre-populates, date validation works
8. Delete a record → verify confirmation dialog and soft delete

### Backend Test Commands

```bash
cd apps/api
go test ./internal/organization/... -v -run TestCertification
```

## Technical Decisions

### Why Migrate to Organization Module?

- Certifications are a sub-resource of employee, not a standalone HRD entity
- Aligns with the Employee Contract and Education History migration patterns
- Simplifies frontend by consolidating into the employee detail modal
- Reduces permission complexity (reuse `employee.*` permissions)

### Why No Expiry Instead of Ongoing?

- Unlike education (which has ongoing studies), certifications either have an expiry date or are lifetime
- "No expiry" is a clearer concept for certifications than "ongoing"
- Simplifies status calculation (expired vs valid vs no expiry)

### Why Sub-Resource URL Pattern?

- `/employees/:id/certifications` clearly expresses ownership
- Automatic employee validation (employee must exist)
- Consistent with the contract and education sub-resource patterns
- Prevents IDOR by always scoping to the authenticated employee context

## Related Features

- **Employee Contracts**: Same sub-resource migration pattern
- **Employee Education History**: Academic education tracking (separate from professional certifications)
- **Employee Detail Modal**: Central UI for all employee sub-resources

## References

- Education History Migration Docs: `docs/features/HRD/hrd-education-history.md`
- Contract Migration Docs: `docs/features/HRD/hrd-employee-contracts.md`
- API Standards: `docs/api-standart/README.md`
- Postman Collection: `docs/postman/postman.json` (Organization → Employee Certifications)
