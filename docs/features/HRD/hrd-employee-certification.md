# Employee Certification Management

## Feature Summary

Employee Certification Management system untuk tracking sertifikasi profesional karyawan dengan fitur expiry tracking dan alert system. Memungkinkan HRD untuk manage certification records, monitor status kedaluwarsa, dan ensure compliance requirements terpenuhi.

**Business Value**: Memastikan karyawan memiliki certifications yang valid, menghindari expired certifications untuk compliance, dan memfasilitasi career development tracking.

## Fitur Utama

- **CRUD Certifications**: Create, read, update, delete certification records untuk karyawan
- **Expiry Tracking**: Monitor certification expiry dates dengan computed fields (is_expired, days_until_expiry)
- **Search & Filter**: Cari berdasarkan certificate name atau issued by, filter by employee
- **Expiring Certifications Alert**: Query certifications yang akan expire dalam X hari (default 30)
- **Optional Expiry**: Support untuk certifications tanpa expiry date (lifetime certifications)
- **Document Management**: Store certificate file paths untuk uploaded documents
- **Form Data Endpoint**: Single endpoint untuk fetch employees dropdown (efficient)

## Business Rules

### Certification Management
- **Employee Validation**: Employee harus exist sebelum bisa create certification
- **Date Validation**: 
  - issue_date format: YYYY-MM-DD (required)
  - expiry_date format: YYYY-MM-DD (optional, nullable)
  - Jika expiry_date provided, harus **after** issue_date
- **Expiry Status**: `is_expired = true` jika expiry_date < now (computed on-the-fly)
- **Days Until Expiry**: 
  - Positive number = days remaining
  - Negative number = days passed since expired
  - 999999 = no expiry date (never expires)

### Search & Pagination
- **Search Fields**: certificate_name OR issued_by (ILIKE prefix matching)
- **Max per_page**: 100 (enforced untuk prevent memory issues)
- **Default per_page**: 20
- **Ordering**: issue_date DESC (newest first)

### Expiring Certifications Query
- **Default Days**: 30 (jika parameter tidak provided)
- **Query Logic**: 
  ```sql
  WHERE expiry_date IS NOT NULL 
    AND expiry_date <= (NOW() + days)
    AND expiry_date >= NOW()
  ORDER BY expiry_date ASC
  ```
- **Use Case**: Dashboard alert system untuk show certifications expiring soon

## Keputusan Teknis & Trade-offs

### 1. Optional Expiry Date (Nullable Field)
**Why**: Beberapa certifications tidak pernah expire (e.g., university degrees, lifetime certifications)

**Implementation**: 
- Field expiry_date as `*time.Time` (nullable)
- Computed field `is_expired = false` jika expiry_date IS NULL
- Computed field `days_until_expiry = 999999` untuk flag no expiry

**Trade-off**: Slightly more complex query logic (need to handle NULL values), but provides flexibility

### 2. Computed Fields (is_expired, days_until_expiry)
**Why**: Avoid stale data in database, always return accurate status

**Implementation**: 
- Calculated in model methods: `IsExpired()`, `DaysUntilExpiry()`
- NOT stored in database (computed on-the-fly)
- Included in DTO response untuk frontend convenience

**Trade-off**: Slight performance overhead vs data accuracy

### 3. Search with Prefix Matching (ILIKE certificate_name%)
**Why**: Leverage GIN indexes untuk performance

**Implementation**:
- GIN index: `CREATE INDEX idx_employee_certifications_name_gin ON employee_certifications USING gin (certificate_name gin_trgm_ops)`
- Search pattern: `WHERE certificate_name ILIKE 'search%' OR issued_by ILIKE 'search%'`

**Trade-off**: Prefix-only search (not full wildcard), but much faster with indexes

### 4. GetFormData Endpoint Pattern
**Why**: Single API call untuk fetch all form options (employees), reduces round-trips

**Implementation**: GET /form-data returns employees array

**Trade-off**: Frontend must fetch all employees at once (could be large dataset), but acceptable for most organizations

### 5. Expiring Certifications Alert System
**Why**: Proactive notification system untuk renew certifications sebelum expired

**Implementation**: 
- Dedicated endpoint: GET /expiring?days=30
- Query only certs dengan expiry_date within range
- Order by expiry_date ASC (urgent first)

**Use Case**: Dashboard widget, email notifications, report generation

### 6. Certificate Number Field (Not in Original Schema)
**Why**: Track official certification numbers untuk verification purposes

**Added**: certificate_number field (max 100 chars, optional)

**Rationale**: Frequent business requirement untuk prove certification validity

### 7. Dialog-Based Forms vs Separate Pages (Frontend)
**Why**: Better UX dengan modal dialogs, maintain context without navigation

**Implementation**: 
- Single page `/hrd/certifications` dengan dialog modals untuk create/edit
- Modal state management di list component (`isFormOpen`, `editingCertification`)
- Dynamic import dengan PermissionGuard untuk code splitting
- Form component reused untuk create dan edit modes (conditional based on `certification` prop)

**Trade-off**: 
- ✅ Better UX: No navigation flicker, context preserved
- ✅ Cleaner state: Local component state instead of URL state
- ✅ Performance: Lazy loaded components
- ❌ Slightly more complex state management (vs simple routing)

**Pattern followed**: Matches quotation pattern across all GIMS features

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/hrd/employee-certifications` | certification.read | List all certifications (paginated, searchable) |
| GET | `/hrd/employee-certifications/:id` | certification.read | Get certification detail by ID |
| GET | `/hrd/employee-certifications/employee/:employee_id` | certification.read | Get all certifications for specific employee |
| GET | `/hrd/employee-certifications/expiring?days=30` | certification.read | Get certifications expiring within X days |
| GET | `/hrd/employee-certifications/form-data` | auth | Get form dropdown data (employees) |
| POST | `/hrd/employee-certifications` | certification.create | Create new certification |
| PUT | `/hrd/employee-certifications/:id` | certification.update | Update existing certification |
| DELETE | `/hrd/employee-certifications/:id` | certification.delete | Delete certification (soft delete) |

## Testing Manual

### Scenario 1: Create Certification dengan Expiry Date
1. Login sebagai HRD staff
2. Navigate ke `/hrd/certifications` (single page)
3. Click "Add Certification" button → **Dialog modal opens**
4. Fill form in dialog:
   - Employee: Select dari dropdown (create mode only)
   - Certificate Name: "AWS Certified Solutions Architect"
   - Issued By: "Amazon Web Services"
   - Issue Date: "2024-01-15" (calendar picker)
   - Expiry Date: "2027-01-15" (3 years from issue, calendar picker)
   - Certificate Number: "AWS-CSA-12345"
   - Description: "Cloud architecture certification"
5. Submit → **Dialog closes**, success toast appears
6. Verify in list: Status badge shows "Valid" (green), days_remaining shown
7. **Note**: No page navigation occurred, context preserved

### Scenario 2: Create Certification tanpa Expiry Date (Lifetime)
1. On `/hrd/certifications`, click "Add Certification"
2. Fill required fields, **leave Expiry Date empty** (no date selected)
3. Submit → Dialog closes, success toast
4. Verify in list: Status badge shows "No Expiry" (gray outline)

### Scenario 3: Expiring Certification Alert
1. Create certification dengan expiry_date = NOW() + 15 days
2. Navigate to dashboard (jika ada widget) atau call GET /expiring?days=30
3. Verify certification appears in expiring list
4. Verify ordered by expiry_date ASC (urgent first)

### Scenario 4: Expired Certification
1. Create certification dengan expiry_date = NOW() - 10 days (manual di database atau adjust dates)
2. Verify in list: 
   - Status badge shows "Expired" (red)
   - days_until_expiry shows negative number (e.g., -10)
   - is_expired = true

### Scenario 5: Date Validation Error
1. Fill form dengan:
   - Issue Date: "2025-01-15"
   - Expiry Date: "2024-01-15" (BEFORE issue date)
2. Submit → Should show validation error: "Expiry date must be after issue date"

### Scenario 6: Search & Filter
1. Search by certificate name: "AWS"
2. Should show all certs with "AWS" in name
3. Filter by employee: Select specific employee
4. Should show only that employee's certs
5. Combine search + filter → Should work together

## Automated Testing

**Unit Tests**: `apps/api/internal/hrd/domain/usecase/employee_certification_usecase_test.go`
- TestCreateCertification_Success
- TestCreateCertification_EmployeeNotFound
- TestCreateCertification_ExpiryBeforeIssue
- TestIsExpired_WithExpiredDate
- TestIsExpired_WithValidDate
- TestIsExpired_WithNullExpiry
- TestDaysUntilExpiry_ValidCert
- TestDaysUntilExpiry_ExpiredCert
- TestDaysUntilExpiry_NoExpiry

**Integration Tests**: `apps/api/test/hrd/certification_integration_test.go`
- TestGetAllCertifications_Pagination
- TestGetExpiringCertifications_WithinDays
- TestGetByEmployeeID_Success

**E2E Tests**: `apps/web/tests/e2e/hrd/certification.spec.ts`
- should create certification with expiry
- should create certification without expiry
- should update certification
- should delete certification
- should search certifications
- should filter by employee

**Run Tests**:
```bash
# Backend unit tests
cd apps/api && go test ./internal/hrd/domain/usecase/...

# Frontend unit tests
cd apps/web && npx pnpm test certification

# E2E tests
cd apps/web && npx pnpm test:e2e hrd/certification
```

## Dependencies

**Backend**:
- **GORM**: Model persistence dengan soft delete
- **Organization Module**: Employee repository untuk validation
- **Core Errors**: Error handling framework
- **Core Response**: Standardized API responses

**Frontend**:
- **TanStack Query**: Data fetching, caching, optimistic updates, query invalidation
- **Zod**: Form validation dengan date refinement (expiry_after_issue rule)
- **date-fns**: Date formatting dan calculations
- **next-intl**: Internationalization dengan parameter interpolation (`{days}`)
- **React Hook Form**: Form state management dengan Controller untuk complex inputs
- **shadcn/ui**: UI components (Dialog, Badge, Table, Form, Popover, Calendar)
- **Dynamic Imports**: Code splitting dengan next/dynamic dan PermissionGuard

**Integration**:
- **Employee Module**: Required untuk fetch employee data (GetFormData)
- **Auth Module**: PermissionGuard untuk authorization checks

## Database Schema

```go
type EmployeeCertification struct {
    ID                string         `gorm:"type:char(36);primaryKey"`
    EmployeeID        string         `gorm:"type:char(36);not null;index"`
    CertificateName   string         `gorm:"type:varchar(200);not null;index:idx_cert_name_gin,type:gin"`
    IssuedBy          string         `gorm:"type:varchar(200);not null;index:idx_issued_by_gin,type:gin"`
    IssueDate         time.Time      `gorm:"type:date;not null"`
    ExpiryDate        *time.Time     `gorm:"type:date"` // Nullable
    CertificateNumber *string        `gorm:"type:varchar(100)"`
    CertificateFile   *string        `gorm:"type:varchar(500)"`
    Description       *string        `gorm:"type:text"`
    CreatedAt         time.Time      `gorm:"autoCreateTime"`
    UpdatedAt         time.Time      `gorm:"autoUpdateTime"`
    DeletedAt         gorm.DeletedAt `gorm:"index"`
}
```

**Indexes**:
- `idx_employee_certifications_name_gin`: GIN index on certificate_name for fast prefix search
- `idx_employee_certifications_issued_by_gin`: GIN index on issued_by for fast prefix search
- `idx_employee_certifications_employee_id`: B-tree index on employee_id for filtering

**Relationships**:
- **EmployeeCertification** belongs to **Employee** (via employee_id)

## Struktur Folder

### Backend
```
internal/hrd/
├── data/
│   ├── models/employee_certification.go                     # Model dengan IsExpired(), DaysUntilExpiry()
│   └── repositories/
│       ├── employee_certification_repository.go             # Interface (7 methods)
│       └── employee_certification_repository_impl.go        # GORM implementation
├── domain/
│   ├── dto/employee_certification_dto.go                    # Create, Update, Response DTOs
│   ├── mapper/employee_certification_mapper.go              # Model ↔ DTO conversions
│   └── usecase/
│       ├── employee_certification_usecase.go                # Interface (9 methods)
│       └── employee_certification_usecase_impl.go           # Business logic
└── presentation/
    ├── handler/employee_certification_handler.go            # 8 HTTP handlers
    └── router/employee_certification_router.go              # Route definitions
```

### Frontend
```
features/hrd/certifications/
├── types/index.d.ts                  # TypeScript interfaces
│                                     # - EmployeeCertification, Employee
│                                     # - CreateCertificationData (with employee_id)
│                                     # - UpdateCertificationData (without employee_id)
│                                     # - CertificationListResponse (pagination: total, total_pages, has_next, has_prev)
│                                     # - ListCertificationsParams, CertificationFormData
├── schemas/certification.schema.ts   # Zod schemas
│                                     # - certification (create): employee_id required
│                                     # - certificationUpdate: employee_id excluded
│                                     # - Date refinement: expiry_date must be after issue_date
├── services/certification-service.ts # API client methods
│                                     # - list() (renamed from getAll())
│                                     # - getById(), create(), update(), delete()
│                                     # - getFormData(), getExpiring()
├── hooks/use-certification.ts        # TanStack Query hooks
│                                     # - Query keys pattern: certificationKeys.lists(), certificationKeys.detail(id)
│                                     # - useCertifications, useCertificationById, useCertificationFormData
│                                     # - useCreateCertification, useUpdateCertification, useDeleteCertification
│                                     # - Mutations return void (no side effects - toast/routing in components)
├── i18n/
│   ├── en.ts                        # English translations
│   │                                # - meta (title, description for page metadata)
│   │                                # - field, common, form labels
│   │                                # - days_remaining: "{days} days remaining" (next-intl syntax)
│   │                                # - status badges, validation messages, toast messages
│   └── id.ts                        # Indonesian translations (mirrors en.ts)
└── components/
    ├── certification-list.tsx        # Main list component
    │                                 # - Modal state management (isFormOpen, editingCertification, viewingCertification)
    │                                 # - Debounced search (500ms)
    │                                 # - Permission-based actions (canCreate, canUpdate, canDelete, canView)
    │                                 # - Status badges: Expired (red), Expiring Soon (yellow), Valid (green), No Expiry (gray)
    │                                 # - Actions dropdown per row (View, Edit, Delete)
    │                                 # - DataTablePagination with rowCount fix (total not total_items)
    ├── certification-form.tsx        # Dialog-based form (NOT separate page)
    │                                 # - Conditional schema: create (with employee_id) vs edit (without)
    │                                 # - React Hook Form with Controller for Select, Calendar
    │                                 # - Optional expiry date with "Clear" button
    │                                 # - Employee dropdown (create mode only)
    │                                 # - Type assertion for employee_id errors (union type workaround)
    │                                 # - Form reset on open/close in useEffect
    └── certification-detail-modal.tsx # Detail view dialog
                                      # - useLocale() hook (not prop drilling)
                                      # - Days remaining calculation with color coding
                                      # - Download certificate button
                                      # - Metadata display (created_at, updated_at)
```

**Page Structure**:
```
app/[locale]/(dashboard)/hrd/certifications/
└── page.tsx                          # Main page with dynamic import
                                      # - PermissionGuard wrapper (employee_certification.read)
                                      # - Dynamic import with loading fallback
                                      # - Named export from certification-list
                                      # - NO separate /new or /[id]/edit pages
```

## Notes & Future Improvements

**Known Limitations**:
- **No Automatic Notifications**: Saat ini belum ada automated email/push notification untuk expiring certs
- **No Certificate Verification**: Belum ada integration dengan external verification systems
- **No Bulk Import**: Create one-by-one only (no CSV/Excel import)

**Future Improvements**:
1. **Email Notifications**: 
   - Auto-send email 30 days before expiry
   - Escalation email jika tidak renewed
   - Digest email untuk manager
2. **Certificate Upload**: 
   - Integrate dengan file upload system
   - OCR untuk auto-extract data from uploaded cert
3. **Certification Templates**: 
   - Pre-defined cert types (AWS, Google Cloud, PMP, etc.)
   - Auto-fill issued_by field
4. **Approval Workflow**: 
   - Manager approval sebelum certification recorded
   - Verification step
5. **Reporting**: 
   - Certification compliance report by department
   - Expiring certs report (scheduled)
   - Employee certification history report
6. **Integration**: 
   - Sync dengan external cert verification APIs (Credly, Accredible)
   - Integration dengan LMS (Learning Management System)

**Performance Considerations**:
- **GetFormData**: Returns all employees (could be hundreds). Consider pagination jika organization besar (1000+ employees)
- **Search**: GIN indexes provide fast search, but initial index build bisa slow untuk large datasets
- **Expiring Query**: Efficient dengan date range query, tapi perlu monitor jika data growth signifikan
- **Frontend Pagination**: Fixed to correctly use `pagination.total` (not `total_items`) to prevent NaN display
- **Modal State**: Local component state prevents unnecessary re-renders from URL changes
- **Dynamic Imports**: Code splitting reduces initial bundle size, components loaded on-demand

## Related Documentation
- Sprint Planning: `docs/erp-sprint-planning.md` (Sprint 14 - EmployeeCertification)
- API Standards: `docs/api-standart/README.md`
- Database Relations: `docs/erp-database-relations.mmd` (EmployeeCertification -> Employee)
- Migration Guidelines: `docs/MIGRATION_GUIDELINES.md`
- Security Plan: `docs/TEMPLATE_SECURITY_PERFORMANCE_PLAN.md`

## Frontend Implementation Notes

### Recent Changes (2026-02-07)
1. **Complete refactor to Dialog-based pattern**:
   - Removed separate `/new` and `/[id]/edit` pages
   - Implemented modal state management in list component
   - Added dynamic imports with PermissionGuard

2. **Type Safety Improvements**:
   - Separated `CreateCertificationData` (with employee_id) and `UpdateCertificationData` (without employee_id)
   - Added type assertions for union type edge cases with ESLint suppressions
   - Fixed pagination response type: `total` instead of `total_items`

3. **i18n Structure**:
   - Organized translations into logical sections: meta, field, common, form, detail, status, empty, validation, toast, alert
   - Fixed parameter syntax for next-intl: `{days}` not `{{days}}`
   - Added missing keys: select_employee, pick_date, employee_code, employee_name, created_at, updated_at

4. **Query Keys Pattern**:
   - Implemented nested query key structure: `certificationKeys.lists()`, `certificationKeys.detail(id)`, `certificationKeys.formData()`
   - Enables fine-grained cache invalidation on mutations

5. **Bug Fixes**:
   - Fixed pagination NaN issue (API returns `total`, not `total_items`)
   - Fixed page count calculation (showed many pages for 6 items)
   - Added proper pagination metadata fields: `has_next`, `has_prev`

## Contributors
- Implemented: Sprint 14 (2026-02-07)
- Frontend Refactored: 2026-02-07
- Last Updated: 2026-02-07
