# Employee Education History Feature (Migrated to Organization Module)

## Overview
Employee education history tracking feature, fully integrated into the Employee Management module under Organization. Originally part of HRD Sprint 14, this feature has been **migrated** into the employee detail modal as a sub-resource, following the same pattern as Employee Contracts.

All CRUD operations are performed within the employee detail modal — no standalone page exists.

## Migration Summary

| Aspect | Before (HRD) | After (Organization) |
|--------|--------------|---------------------|
| Backend path | `/hrd/employee-education-histories` | `/organization/employees/:id/education-histories` |
| Backend module | `internal/hrd/` | `internal/organization/` |
| Frontend location | `features/hrd/education-history/` (standalone page) | `features/master-data/employee/components/education/` (inside employee detail modal) |
| Permissions | `education_history.*` | `employee.read`, `employee.update`, `employee.delete` |
| Routing | `/hrd/education` or `/hrd/education-history` | Inside employee detail modal (no standalone page) |
| i18n namespace | `educationHistory` | `employee.education` |

## Features
- Track employee education from elementary to doctorate level
- Support ongoing education (no end date required) with **only one ongoing education per employee**
- GPA tracking (optional, **1.00–4.00 scale**) with input validation and clamping
- Document upload via FileUpload component: PDF, DOC, DOCX, JPG, JPEG, PNG; max 10MB
- Education Information section in employee detail Overview tab (shows latest/ongoing education)
- Education History tab with timeline design and CRUD actions
- Chronological ordering (most recent first)
- Soft delete for audit trail

## Business Rules

### Education Tracking
- Education levels: ELEMENTARY, JUNIOR_HIGH, SENIOR_HIGH, DIPLOMA, BACHELOR, MASTER, DOCTORATE
- Multiple education records per employee allowed
- **Only one ongoing education** per employee (enforced on both frontend and backend)
- Ongoing education indicated by null `end_date`
- GPA optional (range: **1.00–4.00**; not all programs use GPA system)
- Document path optional (for certificate storage)

### Date Validation
- `end_date` must be after `start_date` (when provided)
- Ongoing education indicated by null `end_date`
- System calculates duration automatically

### GPA Validation
- GPA must be between **1.00 and 4.00** (inclusive)
- Frontend input field restricts input to this range
- Backend binding tag: `min=1,max=4`
- Backend usecase returns `ErrInvalidGPA` if out of range

### Ongoing Education Constraint
- Only **one** ongoing education (no `end_date`) allowed per employee
- Frontend: checkbox is disabled when another ongoing education already exists
- Backend: `FindOngoingByEmployeeID` checks before create/update; returns `ErrOngoingEducationExists`

### Data Integrity
- Employee must exist before adding education history
- Education history belongs to a specific employee (ownership validated)
- Soft delete preserves audit trail
- Created/updated tracking for compliance

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/organization/employees/:id/education-histories` | `employee.read` | List all education histories for an employee |
| POST | `/organization/employees/:id/education-histories` | `employee.update` | Create new education record |
| PUT | `/organization/employees/:id/education-histories/:education_id` | `employee.update` | Update existing record |
| DELETE | `/organization/employees/:id/education-histories/:education_id` | `employee.delete` | Soft delete record |

### Employee Response Integration
The main `GET /organization/employees/:id` response includes a `latest_education` brief object populated automatically:
- Prioritizes **ongoing education** (no end date)
- Falls back to the most recent completed education by `start_date`

## Data Structure

### EmployeeEducationHistory Model
```go
type EmployeeEducationHistory struct {
    ID            uuid.UUID
    EmployeeID    uuid.UUID       // indexed
    Institution   string          // varchar(200)
    Degree        DegreeLevel     // enum
    FieldOfStudy  string          // varchar(200)
    StartDate     time.Time       // date
    EndDate       *time.Time      // date, nullable (nil = ongoing)
    GPA           *float32        // decimal(3,2), nullable, range 1.00–4.00
    Description   string          // text
    DocumentPath  string          // varchar(255)
    CreatedBy     uuid.UUID
    UpdatedBy     *uuid.UUID
    CreatedAt     time.Time
    UpdatedAt     time.Time
    DeletedAt     gorm.DeletedAt  // soft delete
}
```

### DegreeLevel Enum
```go
const (
    DegreeLevelElementary  = "ELEMENTARY"
    DegreeLevelJuniorHigh  = "JUNIOR_HIGH"
    DegreeLevelSeniorHigh  = "SENIOR_HIGH"
    DegreeLevelDiploma     = "DIPLOMA"
    DegreeLevelBachelor    = "BACHELOR"
    DegreeLevelMaster      = "MASTER"
    DegreeLevelDoctorate   = "DOCTORATE"
)
```

### Computed Fields
- `is_completed`: Boolean - true if end_date exists and is in the past
- `duration_years`: Float - calculated duration in years (decimal)

## Request/Response Examples

### Create Request
```json
POST /organization/employees/:employee_id/education-histories

{
  "institution": "University of Indonesia",
  "degree": "BACHELOR",
  "field_of_study": "Computer Science",
  "start_date": "2015-09-01",
  "end_date": "2019-06-30",
  "gpa": 3.75,
  "description": "Bachelor of Computer Science with focus on Software Engineering",
  "document_path": "/uploads/abc123_diploma.pdf"
}
```

### Create Ongoing Education (no end_date)
```json
POST /organization/employees/:employee_id/education-histories

{
  "institution": "Gadjah Mada University",
  "degree": "MASTER",
  "field_of_study": "Information Systems",
  "start_date": "2025-09-01",
  "gpa": 3.90,
  "description": "Currently pursuing Master's degree"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "e1111111-1111-1111-1111-111111111111",
    "employee_id": "11111111-1111-1111-1111-111111111111",
    "institution": "University of Indonesia",
    "degree": "BACHELOR",
    "field_of_study": "Computer Science",
    "start_date": "2015-09-01",
    "end_date": "2019-06-30",
    "gpa": 3.75,
    "description": "Bachelor of Computer Science with focus on Software Engineering",
    "document_path": "/uploads/abc123_diploma.pdf",
    "is_completed": true,
    "duration_years": 3.83,
    "created_at": "2026-02-17T10:00:00+07:00",
    "updated_at": "2026-02-17T10:00:00+07:00"
  },
  "timestamp": "2026-02-17T10:00:00+07:00",
  "request_id": "req_create_edu_123"
}
```

### Update Request
```json
PUT /organization/employees/:employee_id/education-histories/:education_id

{
  "gpa": 3.85,
  "description": "Updated description with honors",
  "document_path": "/uploads/def456_diploma_updated.pdf"
}
```

### List Response
```json
{
  "success": true,
  "data": [
    {
      "id": "e1111111-1111-1111-1111-111111111111",
      "employee_id": "11111111-1111-1111-1111-111111111111",
      "institution": "University of Indonesia",
      "degree": "BACHELOR",
      "field_of_study": "Computer Science",
      "start_date": "2015-09-01",
      "end_date": "2019-06-30",
      "gpa": 3.75,
      "description": "Bachelor of Computer Science",
      "document_path": "/uploads/abc123_diploma.pdf",
      "is_completed": true,
      "duration_years": 3.83,
      "created_at": "2026-02-17T10:00:00+07:00",
      "updated_at": "2026-02-17T10:00:00+07:00"
    }
  ],
  "timestamp": "2026-02-17T10:00:00+07:00",
  "request_id": "req_list_edu_456"
}
```

## Validation Rules

### Create Request
- `institution`: required, max 200 characters
- `degree`: required, one of valid degree levels
- `field_of_study`: optional, max 200 characters
- `start_date`: required, format YYYY-MM-DD
- `end_date`: optional, format YYYY-MM-DD, must be after start_date
- `gpa`: optional, decimal **1.00–4.00**
- `description`: optional, text
- `document_path`: optional, max 255 characters
- **Ongoing constraint**: If `end_date` is empty, employee must not already have another ongoing education

### Update Request
- All fields optional (omitempty)
- Same validation rules as create for provided fields
- Cannot change employee_id (immutable, derived from URL)
- **Ongoing constraint**: Same as create — cannot set to ongoing if another ongoing exists

## Error Handling

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `EMPLOYEE_NOT_FOUND` | 404 | Employee doesn't exist in database |
| `EDUCATION_HISTORY_NOT_FOUND` | 404 | Education record not found or deleted |
| `VALIDATION_ERROR` | 400 | Invalid input data (dates, GPA range, etc.) |
| `ONGOING_EDUCATION_EXISTS` | 400 | Employee already has an ongoing education |
| `INVALID_GPA` | 400 | GPA not in 1.00–4.00 range |
| `FORBIDDEN` | 403 | Missing required permission |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Common Validation Errors
- "employee not found" - Employee ID doesn't exist
- "education history not found" - Record doesn't exist
- "end date must be after start date" - Invalid date range
- "GPA must be between 1.00 and 4.00" - GPA out of range
- "employee already has an ongoing education" - Only one ongoing allowed
- "education history does not belong to employee" - Ownership mismatch

## Frontend Implementation

### Architecture
Education history components are integrated into the employee detail modal under `apps/web/src/features/master-data/employee/components/education/`:

```
employee/
├── types/index.d.ts              # EmployeeEducationHistory, DegreeLevel, etc.
├── services/employee-service.ts  # API methods for education CRUD
├── hooks/use-employees.ts        # TanStack Query hooks (educationKeys)
├── i18n/en.ts, id.ts             # Translation keys under "employee.education"
└── components/
    └── education/
        ├── index.ts                      # Barrel export
        ├── education-info-card.tsx        # Overview tab section (read-only)
        ├── education-timeline.tsx         # Timeline tab (list + actions)
        ├── create-education-dialog.tsx    # Create dialog with ongoing checkbox
        ├── edit-education-dialog.tsx      # Edit dialog with ongoing checkbox
        └── delete-education-dialog.tsx    # Delete confirmation dialog
```

### Employee Detail Modal Integration

#### Overview Tab - Education Information
- Displays the latest/ongoing education in a read-only table layout
- Follows the same `bg-muted/50` table pattern as other sections
- Shows: Institution, Degree, Field of Study, GPA, Start/End Date, Document (clickable download)
- Populated from `employee.latest_education` in the API response

#### Education History Tab
- Timeline design showing all education records chronologically
- Action buttons: Add Education, Edit, Delete (permission-gated)
- Empty state message when no records exist

### Components

#### CreateEducationDialog
- Props: `open`, `onOpenChange`, `employeeId`, `existingEducations`, `onSuccess`
- GPA input: `type="number"`, `step="0.01"`, `min="1"`, `max="4"`, with custom `handleGpaChange` that rejects out-of-range values at input time
- Ongoing checkbox: disabled when `existingEducations` already contains an ongoing record; shows hint text
- Submit validates GPA range (1–4) and ongoing constraint before calling API
- Date picker for end date is disabled when ongoing is checked

#### EditEducationDialog
- Same GPA and ongoing validation as Create
- Pre-populates form from existing education data
- Ongoing checkbox checks `hasOtherOngoing` (excludes current record being edited)

#### DeleteEducationDialog
- Simple confirmation dialog with cancel/delete buttons

### State Management

#### TanStack Query Hooks
Located in `hooks/use-employees.ts`:

**Query Key Factory**:
```typescript
educationKeys = {
  all: ["employee-education-histories"],
  byEmployee: (employeeId) => [...all, employeeId],
}
```

**Hooks**:
- `useEmployeeEducationHistories(employeeId)`: List for employee
- `useCreateEmployeeEducationHistory()`: Create with cache invalidation
- `useUpdateEmployeeEducationHistory()`: Update with cache invalidation
- `useDeleteEmployeeEducationHistory()`: Delete with cache invalidation

#### API Service
Located in `services/employee-service.ts`:

```typescript
// Education history methods on employeeService:
getEmployeeEducationHistories(employeeId)       // GET /:id/education-histories
createEmployeeEducationHistory(employeeId, data) // POST /:id/education-histories
updateEmployeeEducationHistory(employeeId, educationId, data) // PUT /:id/education-histories/:education_id
deleteEmployeeEducationHistory(employeeId, educationId) // DELETE /:id/education-histories/:education_id
```

### Internationalization (i18n)

**Locales**: English (`en`) + Indonesian (`id`)

**Namespace**: `employee.education`

**Key Sections**:
1. `sections` - Section titles
2. `degrees` - Degree level labels (7 keys)
3. `fields` - Field labels (institution, degree, gpa, etc.)
4. `actions` - Action buttons (create, edit, delete, processing)
5. `empty` - Empty state messages
6. `form` - Form-specific labels (titles, placeholders, ongoing label)
7. `success` - Success toast messages
8. `error` - Error toast messages
9. `validation` - Validation error messages (gpaRange, onlyOneOngoing, ongoingExists)

**Degree Localizations (Indonesian)**:
- ELEMENTARY → SD (Sekolah Dasar)
- JUNIOR_HIGH → SMP (Sekolah Menengah Pertama)
- SENIOR_HIGH → SMA (Sekolah Menengah Atas)
- DIPLOMA → Diploma (D1/D2/D3)
- BACHELOR → Sarjana (S1)
- MASTER → Magister (S2)
- DOCTORATE → Doktor (S3)

### Permissions

**Required Permissions** (reuses employee permissions):
- `employee.read`: View education list and details
- `employee.update`: Create and edit education records
- `employee.delete`: Delete education records

**UI Behavior**:
- Add button hidden if no `employee.update` permission
- Edit action hidden if no `employee.update` permission
- Delete action hidden if no `employee.delete` permission

## Database Schema

### Table: employee_education_histories
- Primary key: `id` (UUID, auto-generated)
- Foreign key: `employee_id` → `employees.id`
- Index: `idx_employee_education_employee` on `employee_id`
- Soft delete: `deleted_at` timestamp
- Registered in `migrate.go` as `&organization.EmployeeEducationHistory{}`

## Testing

### Manual Testing Steps
1. Login as HR admin with `employee.read` and `employee.update` permissions
2. Navigate to Master Data → Employees
3. Click on an employee to open the detail modal
4. Go to the **Overview** tab — verify "Education Information" section shows latest/ongoing education
5. Go to the **Education History** tab — verify timeline displays all records
6. Click "Add Education" — fill form with valid data:
   - Institution, degree, field of study, start date
   - Test **ongoing checkbox**: check it → end date should be disabled
   - Test **GPA input**: try entering values > 4 or < 1 → should be rejected
   - Upload a document
   - Submit → verify success toast and record appears in timeline
7. Try adding another ongoing education → should see error "Only one ongoing education allowed"
8. Edit a record → verify form pre-populates, GPA validation works
9. Delete a record → verify confirmation dialog and soft delete
10. Verify employee response includes `latest_education` field

### Backend Test Commands
```bash
cd apps/api
go test ./internal/organization/... -v -run TestEducation
```

## Technical Decisions

### Why Migrate to Organization Module?
- Education history is a sub-resource of employee, not a standalone HRD entity
- Aligns with the Employee Contract migration pattern
- Simplifies frontend by consolidating into the employee detail modal
- Reduces permission complexity (reuse `employee.*` permissions)

### Why Only One Ongoing Education?
- Business requirement: employees typically study one program at a time
- Simplifies the "latest education" display logic in the Overview tab
- Prevents data inconsistency in reporting

### Why GPA Range 1.00–4.00?
- Standard Indonesian university GPA scale
- Values below 1.00 are not meaningful (would indicate failure)
- Frontend input and backend both enforce this range

### Why Sub-Resource URL Pattern?
- `/employees/:id/education-histories` clearly expresses ownership
- Automatic employee validation (employee must exist)
- Consistent with the contract sub-resource pattern
- Prevents IDOR by always scoping to the authenticated employee context

## Related Features
- **Employee Contracts**: Same sub-resource migration pattern
- **Employee Certifications**: Professional certifications (separate from academic education)
- **Employee Detail Modal**: Central UI for all employee sub-resources

## References
- Contract Migration Docs: `docs/features/HRD/hrd-employee-contracts.md`
- API Standards: `docs/api-standart/README.md`
- Postman Collection: `docs/postman/postman.json` (Organization → Employee Education History)
