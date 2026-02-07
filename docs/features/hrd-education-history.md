# Employee Education History Feature

## Overview
Employee education history tracking feature for managing employee educational backgrounds from elementary school to doctorate level. Part of Sprint 14 (HRD - Leave & Documents) for comprehensive employee document management.

## Features
- Track employee education from elementary to doctorate level
- Support ongoing education (no end date required)
- GPA tracking (optional, 0-4.0 scale)
- Document upload support for certificates/diplomas
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
| GET | `/hrd/employee-education-histories` | `education_history.read` | List all with pagination/filters |
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
- `employee_id`: required, valid UUID, employee must exist
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

### Frontend (To Be Implemented)
- **TanStack Query**: Data fetching and caching
- **Zod**: Form validation
- **react-hook-form**: Form state management
- **date-fns**: Date manipulation

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
- Document path is stored, actual file upload handled by Upload Module

## Related Features
- **Employee Contract**: Contract management with education requirement validation (future)
- **Employee Certification**: Professional certifications separate from academic education
- **Recruitment**: Education requirement matching for job postings (future)

## References
- Sprint Planning: `docs/erp-sprint-planning.md` (Sprint 14)
- API Standards: `docs/api-standart/README.md`
- Postman Collection: `docs/postman/EMPLOYEE_EDUCATION_HISTORY_ENDPOINTS.md`
- Database Relations: `docs/erp-database-relations.mmd`
