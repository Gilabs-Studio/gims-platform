# Employee Education History Feature

## Overview
Employee education history tracking feature for managing employee educational backgrounds from elementary school to doctorate level. Part of Sprint 14 (HRD - Leave & Documents) for comprehensive employee document management.

## Features
- Track employee education from elementary to doctorate level
- Support ongoing education (no end date required)
- GPA tracking (optional, 0–4.0 scale) with auto-cap and form validation (no browser default warning)
- Document upload via FileUpload component (same as HRD Contracts): PDF, DOC, DOCX, XLS, XLSX; max 10MB
- List shows employee name and code (from API); Employee column is clickable to open detail modal
- Detail modal: Employee information section (avatar, name, code, email, position, View profile link) and document section with download
- Search by institution or field of study
- Filter by employee and degree level
- Chronological ordering (most recent first)
- Soft delete for audit trail

## Business Rules

### Education Tracking
- Education levels: ELEMENTARY, JUNIOR_HIGH, SENIOR_HIGH, DIPLOMA, BACHELOR, MASTER, DOCTORATE
- Multiple education records per employee allowed
- Ongoing education supported (end_date nullable)
- GPA optional (not all programs use GPA system)
- Document path optional (for certificate storage)

### Date Validation
- `end_date` must be after `start_date` (when provided)
- Ongoing education indicated by null `end_date`
- System calculates duration automatically

### Data Integrity
- Employee must exist before adding education history
- Soft delete preserves audit trail
- Created/updated tracking for compliance

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/hrd/employee-education-histories` | `education_history.create` | Create new education record |
| PUT | `/hrd/employee-education-histories/:id` | `education_history.update` | Update existing record |
| DELETE | `/hrd/employee-education-histories/:id` | `education_history.delete` | Soft delete record |
| GET | `/hrd/employee-education-histories/:id` | `education_history.read` | Get record details |
| GET | `/hrd/employee-education-histories` | `education_history.read` | List all with pagination/filters; response items include `employee_name` and `employee_code` (enriched from employee) |
| GET | `/hrd/employee-education-histories/employee/:employee_id` | `education_history.read` | Get all records for employee |

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
    EndDate       *time.Time      // date, nullable
    GPA           *float32        // decimal(3,2), nullable
    Description   string          // text
    DocumentPath  string          // varchar(255)
    CreatedBy     string
    UpdatedBy     string
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
{
  "employee_id": "11111111-1111-1111-1111-111111111111",
  "institution": "University of Indonesia",
  "degree": "BACHELOR",
  "field_of_study": "Computer Science",
  "start_date": "2015-09-01",
  "end_date": "2019-06-30",
  "gpa": 3.75,
  "description": "Bachelor of Computer Science with focus on Software Engineering",
  "document_path": "/documents/education/diploma_ui_2019.pdf"
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
    "document_path": "/documents/education/diploma_ui_2019.pdf",
    "is_completed": true,
    "duration_years": 3.83,
    "created_at": "2026-02-06T10:00:00+07:00",
    "updated_at": "2026-02-06T10:00:00+07:00"
  },
  "timestamp": "2026-02-06T10:00:00+07:00",
  "request_id": "req_create_edu_123"
}
```

### List Request (with filters)
```
GET /hrd/employee-education-histories?page=1&per_page=20&search=university&degree=BACHELOR&employee_id=11111111-1111-1111-1111-111111111111
```

### List Response
List items include `employee_name` and `employee_code` (populated by backend from employee record) for display in the table and detail modal fallback.

```json
{
  "success": true,
  "data": [
    {
      "id": "e1111111-1111-1111-1111-111111111111",
      "employee_id": "11111111-1111-1111-1111-111111111111",
      "employee_name": "John Doe",
      "employee_code": "EMP-001",
      "institution": "University of Indonesia",
      "degree": "BACHELOR",
      "field_of_study": "Computer Science",
      "start_date": "2015-09-01",
      "end_date": "2019-06-30",
      "gpa": 3.75,
      "is_completed": true,
      "duration_years": 3.83,
      "created_at": "2026-02-06T10:00:00+07:00",
      "updated_at": "2026-02-06T10:00:00+07:00"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

## Validation Rules

### Create Request
- `employee_id`: required, valid UUID format (permissive regex to support seed UUIDs e.g. `11111111-...`), employee must exist
- `institution`: required, max 200 characters
- `degree`: required, one of valid degree levels
- `field_of_study`: optional, max 200 characters
- `start_date`: required, format YYYY-MM-DD
- `end_date`: optional, format YYYY-MM-DD, must be after start_date
- `gpa`: optional, decimal 0.00-4.00
- `description`: optional, text
- `document_path`: optional, max 255 characters

### Update Request
- All fields optional (omitempty)
- Same validation rules as create for provided fields
- Cannot change employee_id (immutable)

## Error Handling

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `EMPLOYEE_NOT_FOUND` | 404 | Employee doesn't exist in database |
| `EDUCATION_HISTORY_NOT_FOUND` | 404 | Education record not found or deleted |
| `VALIDATION_ERROR` | 400 | Invalid input data (dates, GPA range, etc.) |
| `INVALID_ID` | 400 | Invalid UUID format |
| `FORBIDDEN` | 403 | Missing required permission |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Common Validation Errors
- "employee not found" - Employee ID doesn't exist
- "education history not found" - Record doesn't exist
- "end date must be after start date" - Invalid date range
- "GPA must be between 0 and 4.0" - GPA out of range
- "invalid start_date format, must be YYYY-MM-DD" - Date parsing error

## Frontend Implementation

### Architecture
Feature-based structure following established patterns in `apps/web/src/features/hrd/education-history/`:

```
education-history/
├── types/           # TypeScript type definitions
├── schemas/         # Zod validation schemas
├── services/        # API client methods
├── hooks/           # TanStack Query hooks
├── i18n/            # Translations (en + id)
└── components/      # UI components
    ├── education-history-list.tsx
    ├── education-history-form.tsx
    └── education-history-detail-modal.tsx
```

### Components

#### EducationHistoryList
**Purpose**: Main list view with search, filters, pagination, and CRUD actions

**Features**:
- **Search**: Debounced input (500ms) searching institution and field of study
- **Degree Filter**: Dropdown with 8 options (All + 7 degree levels)
- **Pagination**: Server-side with configurable page size (default 20)
- **Permission-based Actions**: Create/Edit/Delete buttons shown only with proper permissions
- **Responsive Table**: 7 columns:
  1. **Employee**: Displays employee name (primary) and employee code (muted secondary line). Cell is clickable (cursor-pointer, hover underline); click opens the detail modal (same as View action). Data from API `employee_name` and `employee_code`.
  2. Institution
  3. Degree (colored badge)
  4. Field of Study
  5. Start Date
  6. Status (Completed/Ongoing badge)
  7. Actions (dropdown menu)

**State Management**:
```typescript
- search: string (debounced)
- page: number (1-indexed)
- pageSize: number
- degreeFilter: DegreeLevel | "all"
- isFormOpen: boolean
- editingEducation: EmployeeEducationHistory | null
- viewingEducation: EmployeeEducationHistory | null
- deletingId: string | null
```

**Degree Badge Colors** (semantic mapping):
- ELEMENTARY/JUNIOR_HIGH: secondary (gray)
- SENIOR_HIGH: default
- DIPLOMA/BACHELOR: info (blue)
- MASTER/DOCTORATE: success (green)

**Actions** (permission-gated):
- View: Opens detail modal (requires `education_history.read`)
- Edit: Opens form in edit mode (requires `education_history.update`)
- Delete: Shows confirmation dialog (requires `education_history.delete`)

#### EducationHistoryForm
**Purpose**: Create/edit dialog form with validation

**Features**:
- **Mode Detection**: Automatically detects create vs edit mode
- **GetFormData Integration**: Fetches employees + degree levels from backend on open
- **React Hook Form**: Form state management with Zod validation
- **Employee Field**: Same pattern as Leave Request—permissive UUID validation; if user selects by label (e.g. "EMP-001 - Name"), form normalizes to UUID via `employees.find(byLabel)` and `setValue("employee_id", id)`. Submit resolves `employee_id` from employees (by id or label) before sending.
- **Reset on Edit Open**: When dialog opens in edit mode, form is reset with `educationHistory` (all fields including document_path); `documentPathDisplay` and "ongoing" checkbox are synced.
- **Ongoing Checkbox**: Custom logic to hide end_date field when checked
- **Date Pickers**: Calendar component with Popover (shadcn/ui)
- **Real-time Validation**: Inline error messages below fields
- **Toast Notifications**: Success/error feedback on submit
- **Accessibility**: Dialog uses `DialogDescription` (title + subtitle) to satisfy aria-describedby and avoid console warnings.

**Form Fields**:
1. `employee_id`: Select dropdown (value = employee id; options show "code - name"; disabled in edit mode)
2. `institution`: Text input (required, max 200 chars)
3. `degree`: Select dropdown (7 options, required)
4. `field_of_study`: Text input (optional, max 200 chars)
5. `start_date`: Date picker (required)
6. `ongoing`: Checkbox (hides end_date when checked)
7. `end_date`: Date picker (optional, hidden if ongoing)
8. `gpa`: Controlled number input (Controller): `inputMode="decimal"`, value clamped to 0–4 on change and onBlur; no native `max` to avoid browser tooltip; Zod validates 0–4.
9. `description`: Textarea (optional)
10. `document_path`: **FileUpload** component (same as HRD Contracts): upload endpoint `/upload/document`, accept `.pdf,.doc,.docx,.xls,.xlsx`, maxSize 10MB; display/clear in edit mode via `documentPathDisplay` state and reset effect.

**Validation**:
- Custom Zod refinement: end_date >= start_date
- GPA: 0.00–4.00 (Zod); input auto-caps at 4 to avoid browser warning
- employee_id: permissive UUID format (same regex as employee contract/leave request)
- Required field indicators with red asterisk

#### EducationHistoryDetailModal
**Purpose**: Read-only detail view with edit/delete actions (aligned with Employee Contract detail modal where applicable)

**Layout Sections**:
1. **Header**: Icon, title, institution name, action buttons. Uses `DialogDescription` (institution name) for accessibility.
2. **Employee Information**: Section similar to contract detail (not in a separate tab). Fetches employee by `employee_id` when modal is open (`useEmployee(displayEducation.employee_id)`). Displays: avatar, name, code, email, position badge, and **View profile** button (Link to `/master-data/employees?openId={employee_id}`). Below that, a grid with employee code, email, phone, position, department. If employee details fail to load, fallback shows `employee_name` / `employee_code` from list response or `employee_id`, plus View profile link.
3. **Education Information**: Institution, degree badge, field, GPA (2-column grid)
4. **Timeline**: Start date, end date, status badge, duration (2-column grid)
5. **Description**: Full text block (if present)
6. **Document Information**: If `document_path` exists: **Download** button (same URL logic as contract—`NEXT_PUBLIC_API_URL` + path, `download` attribute, `target="_blank"`). Otherwise "No document" text.
7. **Timestamps**: Created/updated at (footer)

**InfoRow Component**: Reusable display component with icon, label, value

**Actions**:
- Edit button: Opens EducationHistoryForm in edit mode
- Delete button: Opens DeleteDialog confirmation

### State Management

#### TanStack Query Hooks
Located in `hooks/use-education-history.ts`:

**Query Hooks**:
- `useEducationHistories(params)`: List with filters (search, employee_id, degree, pagination)
- `useEducationHistory(id, options)`: Single record by ID (conditional fetching)
- `useEducationHistoriesByEmployee(employeeId, options)`: All records for employee
- `useEducationHistoryFormData()`: Dropdown options (employees + degree levels, 5min staleTime)

**Mutation Hooks**:
- `useCreateEducationHistory()`: Create with list invalidation
- `useUpdateEducationHistory()`: Update with optimistic updates
- `useDeleteEducationHistory()`: Soft delete with list invalidation

**Query Key Factory**:
```typescript
educationHistoryKeys = {
  all: ["employee-education-histories"],
  lists: () => [...all, "list"],
  list: (params) => [...lists(), params],
  details: () => [...all, "detail"],
  detail: (id) => [...details(), id],
  byEmployee: (employeeId) => [...all, "by-employee", employeeId],
  formData: () => [...all, "form-data"]
}
```

**Optimistic Updates** (useUpdateEducationHistory):
- `onMutate`: Cancel active queries, snapshot previous data
- `onError`: Rollback to snapshot on failure
- `onSettled`: Refetch detail + lists to ensure consistency

#### API Service
Located in `services/education-history-service.ts`:

```typescript
const BASE_PATH = "/hrd/employee-education-histories";

// Methods:
list(params)              // GET with filters
getById(id)               // GET /:id
getByEmployeeId(empId)    // GET /employee/:employeeId
getFormData()             // GET /form-data (NEW endpoint)
create(data)              // POST
update(id, data)          // PUT /:id
delete(id)                // DELETE /:id
```

All methods use `apiClient` wrapper with typed responses.

### Internationalization (i18n)

**Locales**: English (`en`) + Indonesian (`id`)

**Translation Files**:
- `i18n/en.ts`: English translations (117 lines)
- `i18n/id.ts`: Indonesian translations (117 lines)

**Namespace**: `educationHistory`

**Sections**:
1. **common** (26 keys): search, actions, status, CRUD verbs, pagination
2. **main** (23 keys): title, field labels, messages
3. **degrees** (7 keys): Degree level labels (localized)
4. **filters** (4 keys): Filter dropdowns
5. **validation** (6 keys): Error messages
6. **details** (14 keys): Detail modal sections—title, employeeInfo, educationInfo, documentInfo, timeline, noDocument, **viewProfile**, **employeeCode**, **email**, **phone**, **position**, **department**, **downloadDocument**
7. **form** (7 keys): Form placeholders

**Degree Localizations (Indonesian)**:
- ELEMENTARY → SD (Sekolah Dasar)
- JUNIOR_HIGH → SMP (Sekolah Menengah Pertama)
- SENIOR_HIGH → SMA (Sekolah Menengah Atas)
- DIPLOMA → Diploma (D1/D2/D3)
- BACHELOR → Sarjana (S1)
- MASTER → Magister (S2)
- DOCTORATE → Doktor (S3)

**Usage in Components**:
```typescript
import { useTranslations } from "next-intl";
const t = useTranslations("educationHistory");
<p>{t("title")}</p>  // "Employee Education History"
```

### Routing

**Page**: `/hrd/education-history`

**Files**:
- `app/[locale]/hrd/education-history/page.tsx`: Main page (renders EducationHistoryList)
- `app/[locale]/hrd/education-history/loading.tsx`: Loading skeleton during navigation

**Page Component**:
```typescript
import { EducationHistoryList } from "@/features/hrd/education-history/components/education-history-list";
import { PageMotion } from "@/components/page-motion";

export default async function EducationHistoryPage() {
  return (
    <PageMotion>
      <EducationHistoryList />
    </PageMotion>
  );
}
```

**Loading State**: Skeleton UI with header, search, table placeholders

### Permissions

**Required Permissions**:
- `education_history.read`: View list and detail
- `education_history.create`: Create new records
- `education_history.update`: Edit existing records
- `education_history.delete`: Delete records (soft)

**UI Behavior**:
- Add button hidden if no `create` permission
- Edit action hidden if no `update` permission
- Delete action hidden if no `delete` permission
- View action hidden if no `read` permission

**Permission Hook**:
```typescript
const { hasPermission } = useUserPermission();
const canCreate = hasPermission("education_history.create");
```

### UI/UX Features

#### Search & Filters
- **Debounced Search**: 500ms delay prevents excessive API calls
- **Search Scope**: Searches both institution and field_of_study
- **Degree Filter**: Dropdown with "All Degrees" + 7 degree levels
- **Auto-reset Pagination**: Search/filter changes reset to page 1

#### Loading States
- **Skeleton Loading**: 5 placeholder rows during data fetch
- **Button Loading**: Spinner on submit buttons during mutations
- **Query Status**: Loading/error/empty states handled with TanStack Query

#### Error Handling
- **Toast Notifications**: sonner library for success/error messages
- **Inline Validation**: Field errors shown below inputs
- **API Errors**: Displayed via toast with error message
- **Empty States**: "No education histories found" with icon

#### Responsive Design
- **Mobile-friendly**: Table scrolls horizontally on small screens
- **Modal Overflow**: Scrollable content for long forms/details
- **Touch-friendly**: Large click targets for dropdown actions

#### Accessibility
- **Keyboard Navigation**: Tab order through forms
- **ARIA Labels**: Proper labeling for screen readers
- **Error Announcements**: Validation errors announce properly
- **Focus Management**: Auto-focus on modal open

### TypeScript Types

Located in `types/index.d.ts` (115 lines):

**Main Interfaces**:
```typescript
DegreeLevel: "ELEMENTARY" | "JUNIOR_HIGH" | ... | "DOCTORATE"

EmployeeEducationHistory: {
  id: string
  employee_id: string
  employee_name?: string   // from list API for table and detail fallback
  employee_code?: string   // from list API for table and detail fallback
  institution: string
  degree: DegreeLevel
  field_of_study: string
  start_date: string
  end_date: string | null
  gpa: number | null
  description: string
  document_path: string
  is_completed: boolean
  duration_years: number
  created_at: string
  updated_at: string
}

EmployeeFormOption: { id: string, employee_code: string, name: string }
DegreeLevelOption: { value: DegreeLevel, label: string }

CreateEducationHistoryData: { ... }  // Required fields only
UpdateEducationHistoryData: { ... }  // All optional (Partial)

ListEducationHistoriesParams: {
  page?: number
  per_page?: number
  search?: string
  employee_id?: string
  degree?: DegreeLevel
}
```

**API Response Types**:
```typescript
EducationHistoryListResponse
EducationHistorySingleResponse
EducationHistoryFormDataResponse  // From GetFormData endpoint
```

### Zod Validation Schema

Located in `schemas/education-history.schema.ts` (96 lines):

**Schema Factory**:
```typescript
getEducationHistorySchema(t: Function)
```

**Validations**:
- employee_id: Required; permissive UUID format (regex aligned with leave request / employee contract) so seed UUIDs (e.g. `11111111-...`) pass
- institution: string (1-200 chars), required
- degree: enum [7 values], required
- field_of_study: string (0-200 chars), optional
- start_date: string, required
- end_date: string, optional, nullable
- gpa: number (0-4 range), optional, nullable
- description: string, optional
- document_path: string (0-255 chars), optional

**Custom Refinement**:
```typescript
.refine((data) => {
  if (data.end_date && data.start_date) {
    return new Date(data.end_date) >= new Date(data.start_date);
  }
  return true;
}, {
  message: t("validation.endDateAfterStart"),
  path: ["end_date"]
})
```

### Performance Optimizations

#### TanStack Query Configuration
- **Stale Time**: 5 minutes for form data (employees + degree levels don't change frequently)
- **Cache Time**: Default 5 minutes for list queries
- **Refetch on Window Focus**: Enabled for data freshness
- **Placeholder Data**: Keep previous data during pagination transitions

#### Debouncing
- Search input debounced to 500ms (reduces API calls by ~80%)

#### Optimistic Updates
- Update mutations use optimistic updates for instant UI feedback
- Rollback on error preserves data integrity

#### Lazy Loading
- Detail modal refetches only when opened (enabled option)
- Employee-specific queries conditionally enabled

## Database Schema

### Table: employee_education_histories
- Primary key: `id` (UUID)
- Foreign key: `employee_id` → `employees.id`
- Index: `idx_employee_education_employee` on `employee_id`
- Soft delete: `deleted_at` timestamp

### Search Performance
- GIN index recommended for text search on `institution` and `field_of_study`
- Prefix search pattern: `institution ILIKE 'text%'` (uses index)
- Combined search: `institution ILIKE ? OR field_of_study ILIKE ?`

## Testing

### Manual Testing Steps
1. Login as employee or HR admin
2. Navigate to employee detail page
3. Go to "Education History" tab
4. Click "Add Education"
5. Fill form with valid data (institution, degree, dates)
6. Upload certificate document
7. Submit → should show success
8. Verify new record appears in list (most recent first)
9. Edit record → update GPA or description
10. Delete record → should soft delete (not appear in list)

### Automated Testing
- **Unit Tests**: `apps/api/internal/hrd/domain/usecase/employee_education_history_usecase_test.go`
- **Repository Tests**: `apps/api/internal/hrd/data/repositories/employee_education_history_repository_test.go`
- **Integration Tests**: `apps/api/test/hrd/education_history_integration_test.go`

**Run Tests:**
```bash
# Backend unit tests
cd apps/api && go test ./internal/hrd/...

# Specific test
go test -v ./internal/hrd/domain/usecase -run TestEmployeeEducationHistory
```

## Dependencies

### Backend
- **GORM**: ORM for database operations
- **Gin**: HTTP framework
- **uuid**: UUID generation

### Frontend (✅ Implemented)
- **TanStack Query v5**: Data fetching, caching, and mutations
- **Zod**: Form validation schemas with i18n support
- **React Hook Form**: Form state management with zodResolver
- **next-intl**: Internationalization (en + id locales)
- **shadcn/ui**: UI component library (Table, Dialog, Select, Calendar, Badge)
- **Lucide React**: Icon library
- **date-fns**: Date formatting and manipulation
- **sonner**: Toast notifications

### Integration
- **Employee Module**: Required for employee validation
- **Upload Module**: For certificate document upload

## Security Considerations

### IDOR Prevention
- Always validate employee_id ownership in frontend
- Backend validates employee exists before any operation
- Permission checks on all endpoints

### Data Privacy
- Education history visible only to:
  - Employee themselves
  - HR department with `education_history.read` permission
  - Direct managers (future enhancement)

### Audit Trail
- Soft delete preserves history
- Created/updated by tracking
- Timestamps for all operations

## Performance Optimization

### Query Optimization
- Index on `employee_id` for employee-specific queries
- GIN index on `institution` and `field_of_study` for text search
- Pagination enforced (max 100 per page)
- Order by `start_date DESC` for chronological display

### Caching Strategy (Future)
- Cache employee's education list in Redis (5 min TTL)
- Invalidate on create/update/delete operations
- Use employee_id as cache key

## Technical Decisions

### Why DegreeLevel Enum?
- Standardizes degree classification across system
- Enables filtering and reporting by degree level
- Prevents data inconsistency from free-text entry
- **Trade-off**: Less flexible for non-standard degrees (use description field for details)

### Why Nullable EndDate?
- Supports ongoing education tracking
- Common use case: employees pursuing part-time degrees
- **Trade-off**: Must handle null checks in frontend

### Why Soft Delete?
- Audit trail requirement for HR compliance
- Ability to restore mistakenly deleted records
- **Trade-off**: Slightly more complex queries (must exclude deleted)

### Why Separate Table (not JSON in Employee)?
- Enables advanced querying (filter by degree, search institution)
- Better normalized database design
- Easier to add features (e.g., education verification status)
- **Trade-off**: Additional table and API endpoints

## Known Limitations & Future Improvements

### Current Limitations
- No education verification workflow (planned for Sprint 15)
- No document expiry tracking for certifications
- No support for partial completion (dropped out)
- No support for non-standard GPA scales (5.0, 100-point, etc.)

### Planned Improvements
- **Sprint 15**: Education verification workflow (HR confirms authenticity)
- **Sprint 16**: Bulk import from resume/CV parsing
- **Future**: Integration with LinkedIn for auto-import
- **Future**: Education requirement matching for job positions
- **Future**: Reporting dashboard (education distribution by department)

## Notes

- All timestamps use **WIB timezone (UTC+7)**
- Soft delete implemented - records never physically removed
- Use pagination for large result sets (enforced max 100 per page)
- Search is case-insensitive and searches both institution and field_of_study
- Computed fields (`is_completed`, `duration_years`) calculated on-the-fly (not stored)
- Document: Stored path from Upload Module; frontend uses FileUpload component (endpoint `/upload/document`, same as HRD Contracts) for upload and display/clear in form; detail modal provides download via API base URL + path.
- List API returns `employee_name` and `employee_code` per item (backend enriches from employee record) for table display and detail modal fallback.

## Related Features
- **Employee Contract**: Contract management with education requirement validation (future)
- **Employee Certification**: Professional certifications separate from academic education
- **Recruitment**: Education requirement matching for job postings (future)

## References
- Sprint Planning: `docs/erp-sprint-planning.md` (Sprint 14)
- API Standards: `docs/api-standart/README.md`
- Postman Collection: `docs/postman/EMPLOYEE_EDUCATION_HISTORY_ENDPOINTS.md`
- Database Relations: `docs/erp-database-relations.mmd`
