# Employee Contract Management

Fitur untuk mengelola kontrak kerja karyawan dengan tracking masa berlaku, status kontrak, dan alert system untuk kontrak yang akan berakhir.

## Fitur Utama

- **CRUD Contract**: Create, Read, Update, Delete contract karyawan
- **Contract Types**: PERMANENT (tetap), CONTRACT (kontrak), INTERNSHIP (magang), PROBATION (masa percobaan)
- **Contract Status**: ACTIVE, EXPIRED, TERMINATED
- **Expiry Tracking**: Monitoring kontrak yang akan berakhir dengan threshold konfigurabel
- **Contract History**: View riwayat kontrak per karyawan (track perubahan posisi/salary)
- **Alert System**: Endpoint khusus untuk mendapatkan kontrak yang akan expire dalam N hari
- **Soft Delete**: Audit trail - kontrak yang dihapus tetap ada di database

## Business Rules Penting

### Contract Type Logic

- **PERMANENT Contracts**:
  - TIDAK BOLEH memiliki `end_date` (null)
  - Untuk karyawan tetap tanpa batas waktu
  - Status default: ACTIVE
  
- **CONTRACT Contracts**:
  - WAJIB memiliki `end_date`
  - Untuk karyawan kontrak dengan jangka waktu tertentu (e.g., 1-2 tahun)
  - Auto-expire saat melewati `end_date` (via scheduled job)
  
- **INTERNSHIP Contracts**:
  - WAJIB memiliki `end_date`
  - Untuk peserta magang/intern
  - Biasanya 3-6 bulan
  
- **PROBATION Contracts**:
  - WAJIB memiliki `end_date`
  - Untuk masa percobaan karyawan baru
  - Biasanya 3-6 bulan sebelum diangkat menjadi permanent/contract

### Data Validation

- **Contract Number**: Unique per sistem, max 50 karakter
- **Dates**: `end_date` harus setelah `start_date`
- **Status Transitions**:
  - ACTIVE → EXPIRED (otomatis saat melewati end_date)
  - ACTIVE → TERMINATED (manual, e.g., resign/PHK)
  - EXPIRED/TERMINATED tidak bisa kembali ke ACTIVE (create new contract instead)
- **Salary**: Optional (nullable) untuk privacy, jika diisi harus > 0

### Expiry Alert Logic

- **Threshold**: Default 30 hari, max 180 hari
- **Calculation**: `days_until_expiry = (end_date - today)`
- **is_expiring_soon**: true jika `days_until_expiry <= 30`
- **Use Case**: Scheduled cron job (daily) untuk kirim email reminder ke HRD

## Keputusan Teknis & Trade-offs

### 1. Mengapa tidak ada relasi langsung ke Employee model?

**Keputusan**: Simpan hanya `employee_id` (UUID) tanpa GORM relationship ke `organization.Employee` model.

**Why**:
- **Cross-domain boundary**: Employee model ada di `internal/organization`, Contract di `internal/hrd`
- **Loose coupling**: Menghindari circular dependency dan tight coupling antar domain
- **Performance**: Frontend bisa fetch employee details terpisah jika diperlukan (lazy loading)
- **Scalability**: Jika di masa depan Employee model di-extract ke microservice terpisah, tidak perlu refactor besar

**Trade-off**: Frontend harus call 2 endpoints untuk mendapatkan contract + employee details. Tapi ini acceptable karena:
- Contract list biasanya menampilkan data minimal (employee_code, name saja)
- Detail view bisa fetch employee info on-demand
- Menghindari N+1 query problem di backend

### 2. Mengapa menggunakan Soft Delete?

**Keputusan**: Implementasi soft delete (set `deleted_at` timestamp) alih-alih hard delete.

**Why**:
- **Audit Trail**: Track history kontrak untuk compliance dan legal purposes
- **Data Recovery**: Admin bisa restore kontrak yang salah dihapus
- **Historical Reports**: Laporan keuangan/HR tetap bisa reference kontrak lama
- **Foreign Key Safety**: Avoid cascade delete issues dengan data terkait (e.g., payroll history)

**Trade-off**: Database size bertambah, tapi manageable dengan partitioning strategies di masa depan.

### 3. Mengapa Expiry Alert System terpisah dari List endpoint?

**Keputusan**: Buat endpoint khusus `/expiring` alih-alih hanya filter di list endpoint.

**Why**:
- **Optimization**: Query `end_date BETWEEN NOW() AND NOW() + N days` lebih efisien dengan index khusus
- **Clarity**: Intent lebih jelas untuk alert/monitoring use case
- **Sorting**: Expiring endpoint sort by `end_date ASC` (most urgent first), berbeda dengan list endpoint
- **Caching**: Bisa apply aggressive caching strategy di backend (e.g., cache 1 hour) karena data jarang berubah

**Trade-off**: Satu endpoint tambahan, tapi benefit untuk performance dan maintainability worth it.

### 4. Mengapa Salary field nullable?

**Keputusan**: `salary` field bisa `null` dan tidak ditampilkan di response jika tidak ada.

**Why**:
- **Privacy**: Tidak semua sistem perlu track salary di contract (bisa di module payroll terpisah)
- **Flexibility**: Beberapa organisasi mungkin tidak ingin simpan salary data di contract table
- **RBAC Extension**: Di masa depan bisa implement permission-based visibility (e.g., hanya HR manager bisa lihat salary)

**Trade-off**: Frontend harus handle nullable salary field (display "-" atau hide field).

## Struktur Folder

```
internal/hrd/
├── data/
│   ├── models/
│   │   └── employee_contract.go       # GORM model, business methods (IsExpiringSoon, IsActive)
│   ├── repositories/
│   │   └── employee_contract_repository.go  # 9 methods: CRUD + expiring + history
│   └── migrations/
│       └── 20260206_create_employee_contracts.sql
├── domain/
│   ├── dto/
│   │   └── employee_contract_dto.go   # Request/Response DTOs with validation tags
│   ├── mapper/
│   │   └── employee_contract_mapper.go # Model ↔ DTO conversion, date calculations
│   └── usecase/
│       └── employee_contract_usecase.go # Business logic: validations, date parsing, employee check
└── presentation/
    ├── handler/
    │   └── employee_contract_handler.go # 7 HTTP handlers
    └── router/
        └── employee_contract_router.go  # Route registration with RBAC
```

## API Endpoints Utama

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/hrd/employee-contracts` | `employee_contract.create` | Create new contract |
| PUT | `/hrd/employee-contracts/:id` | `employee_contract.update` | Update existing contract |
| DELETE | `/hrd/employee-contracts/:id` | `employee_contract.delete` | Soft delete contract |
| GET | `/hrd/employee-contracts/:id` | `employee_contract.read` | Get contract detail |
| GET | `/hrd/employee-contracts` | `employee_contract.read` | List contracts with filters |
| GET | `/hrd/employee-contracts/expiring` | `employee_contract.read` | Get expiring contracts alert |
| GET | `/hrd/employee-contracts/employee/:employee_id` | `employee_contract.read` | Get employee contract history |

### Query Parameters (List & Expiring)

**List Endpoint:**
- `page` (int): Page number (default: 1)
- `per_page` (int): Items per page (max: 100, default: 20)
- `employee_id` (uuid): Filter by employee
- `status` (enum): ACTIVE, EXPIRED, TERMINATED
- `contract_type` (enum): PERMANENT, CONTRACT, INTERNSHIP, PROBATION

**Expiring Endpoint:**
- `days` (int): Days threshold (min: 1, max: 180, default: 30)
- `page`, `per_page`: Pagination

## Cara Test Manual Singkat

### 1. Create PERMANENT Contract (No End Date)
```bash
curl -X POST http://localhost:8080/api/v1/hrd/employee-contracts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "11111111-1111-1111-1111-111111111111",
    "contract_number": "TEST-PERM-001",
    "contract_type": "PERMANENT",
    "start_date": "2026-02-01",
    "salary": 15000000,
    "job_title": "Senior Engineer",
    "department": "IT",
    "status": "ACTIVE"
  }'
```
**Expected**: Success, `end_date` is null

### 2. Test Validation: PERMANENT Cannot Have End Date
```bash
curl -X POST http://localhost:8080/api/v1/hrd/employee-contracts \
  -d '{
    "contract_type": "PERMANENT",
    "end_date": "2027-01-01",
    ...
  }'
```
**Expected**: `400 VALIDATION_ERROR` - "permanent contracts cannot have an end date"

### 3. Create CONTRACT Type (Must Have End Date)
```bash
curl -X POST http://localhost:8080/api/v1/hrd/employee-contracts \
  -d '{
    "contract_type": "CONTRACT",
    "start_date": "2026-02-01",
    "end_date": "2027-02-01",
    ...
  }'
```
**Expected**: Success, contract created with end_date

### 4. Test Expiring Contracts (within 30 days)
```bash
curl "http://localhost:8080/api/v1/hrd/employee-contracts/expiring?days=30" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: Returns contracts expiring before March 8, 2026 (sorted by end_date ASC)

### 5. Test Employee History
```bash
curl "http://localhost:8080/api/v1/hrd/employee-contracts/employee/11111111-1111-1111-1111-111111111111" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: All contracts for employee (active, expired, terminated)

### 6. Test Filters
```bash
# Filter by status
curl "http://localhost:8080/api/v1/hrd/employee-contracts?status=ACTIVE"

# Filter by type
curl "http://localhost:8080/api/v1/hrd/employee-contracts?contract_type=PERMANENT"

# Combined filters
curl "http://localhost:8080/api/v1/hrd/employee-contracts?status=ACTIVE&contract_type=CONTRACT&page=1&per_page=10"
```

### 7. Test Update
```bash
curl -X PUT http://localhost:8080/api/v1/hrd/employee-contracts/:id \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "salary": 18000000,
    "job_title": "Lead Engineer",
    "status": "ACTIVE"
  }'
```
**Expected**: Contract updated, only provided fields changed

### 8. Test Soft Delete
```bash
curl -X DELETE http://localhost:8080/api/v1/hrd/employee-contracts/:id \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: Success message, contract still in DB with `deleted_at` set

## Informasi Testing Otomatis

### Unit Tests
- **Location**: `apps/api/internal/hrd/domain/usecase/employee_contract_usecase_test.go`
- **Coverage**: Business logic validations (date logic, contract type rules, uniqueness checks)

### Integration Tests
- **Location**: `apps/api/test/hrd/employee_contract_integration_test.go`
- **Coverage**: End-to-end API calls with database interaction

### Run Tests
```bash
# Backend unit tests
cd apps/api
go test ./internal/hrd/domain/usecase -v -run TestEmployeeContract

# Backend integration tests
go test ./test/hrd -v -run TestEmployeeContract

# Frontend unit tests (setelah implementasi frontend)
cd apps/web
npx pnpm test employee-contract

# E2E tests (setelah implementasi frontend)
npx pnpm test:e2e hrd/employee-contracts
```

## Dependencies Utama

### Backend
- **GORM**: Model definition, relationships, soft delete
- **UUID**: Unique identifiers (google/uuid)
- **Gin**: HTTP framework, route handlers
- **PostgreSQL**: Database dengan indexes (employee_id, contract_number, dates, status, type)

### Database Indexes (Performance)
```sql
-- Employee lookup
CREATE INDEX idx_employee_contracts_employee ON employee_contracts(employee_id);

-- Unique contract number
CREATE UNIQUE INDEX idx_employee_contracts_number ON employee_contracts(contract_number);

-- Filter by type
CREATE INDEX idx_employee_contracts_type ON employee_contracts(contract_type);

-- Date range queries (expiring contracts)
CREATE INDEX idx_employee_contracts_dates ON employee_contracts(start_date, end_date);

-- Filter by status
CREATE INDEX idx_employee_contracts_status ON employee_contracts(status);

-- Soft delete queries
CREATE INDEX idx_employee_contracts_deleted ON employee_contracts(deleted_at);
```

### Frontend (Belum Implementasi)
- **TanStack Query**: Data fetching, caching, optimistic updates
- **Zod**: Form validation
- **React Hook Form**: Form state management
- **shadcn/ui**: UI components (Table, Form, Dialog, DatePicker)
- **date-fns**: Date calculations and formatting

### Cross-Domain Integration
- **Organization Module**: Validasi employee existence via `orgRepositories.EmployeeRepository`
- **Auth Module**: JWT authentication, permission checking
- **Core Module**: Response format, error handling, pagination utilities

## Related Links

- **Sprint Planning**: `docs/erp-sprint-planning.md` - Sprint 14 HRD - Leave & Documents
- **API Standards**: `docs/api-standart/README.md` - Response format, error codes
- **Database Schema**: `apps/api/internal/hrd/data/migrations/20260206_create_employee_contracts.sql`
- **Postman Collection**: `docs/postman/postman.json` - All 7 endpoints with examples
- **Security Rules**: `.cursor/rules/security.mdc` - RBAC, CSRF, rate limiting

## Notes & Improvements

### Known Limitations
- **No Employee Relationship**: Frontend harus fetch employee details terpisah (by design for loose coupling)
- **No Document Upload**: Field `document_path` hanya string path, belum ada upload mechanism (planned for Sprint 15)
- **No Workflow**: Belum ada approval workflow untuk contract creation/changes (might not needed, HR-only feature)
- **No History Table**: Contract changes not tracked in separate history table (using audit fields `updated_at`, `updated_by` only)

### Future Improvements (Backlog)
1. **Document Upload Integration**:
   - Integrate dengan file upload API (`/api/v1/upload/file`)
   - Store contract documents (PDF, DOCX) di object storage
   - Generate signed URLs untuk download
   
2. **Auto Status Update Scheduled Job**:
   - Cron job daily untuk auto-update status ACTIVE → EXPIRED jika `end_date < today`
   - Send email notification ke HR dan employee
   
3. **Contract Renewal Workflow**:
   - Add "Renew Contract" action yang copy existing contract dengan new dates
   - Template system untuk contract generation
   
4. **Salary History Tracking**:
   - Separate table untuk track perubahan salary over time
   - Chart visualization di frontend
   
5. **Contract Comparison View**:
   - Side-by-side comparison untuk melihat perubahan contract terms
   - Highlight fields yang berubah
   
6. **Export to PDF**:
   - Generate official contract document dari data
   - Digital signature integration

### Performance Notes
- **Expiring Query**: Optimized dengan index `idx_employee_contracts_dates` dan filter `status = 'ACTIVE'` first
- **List Pagination**: Max 100 items per page enforced untuk prevent memory issues
- **Soft Delete**: Use `deleted_at IS NULL` di semua queries (GORM handles automatically)
- **No N+1**: No Preload("Employee") untuk avoid cross-domain N+1 query problem

## Error Handling

### Error Codes

Mengikuti standard dari `docs/api-standart/api-error-codes.md`:

**Validation Errors (400):**
- `VALIDATION_ERROR`: General validation error (invalid format, type mismatch)
- `REQUIRED`: Missing required field
- `INVALID_FORMAT`: Invalid date format atau UUID
- `INVALID_ID`: Invalid UUID format in path parameter

**Resource Errors (404):**
- `CONTRACT_NOT_FOUND`: Contract dengan ID tersebut tidak ditemukan
- `EMPLOYEE_NOT_FOUND`: Employee dengan ID tersebut tidak ditemukan

**Conflict Errors (409):**
- `CONTRACT_NUMBER_EXISTS`: Contract number sudah digunakan

**Authorization Errors (403):**
- `FORBIDDEN`: User tidak memiliki permission yang diperlukan

**Server Errors (500):**
- `INTERNAL_ERROR`: Unexpected error (logged untuk investigation)

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "CONTRACT_NOT_FOUND",
    "message": "Contract with ID xxx not found",
    "details": null
  },
  "timestamp": "2026-02-06T10:00:00+07:00",
  "request_id": "req_error_123"
}
```

## Security Considerations

### RBAC Permissions
- `employee_contract.create`: Create new contracts (HR only)
- `employee_contract.read`: View contracts (HR, Managers)
- `employee_contract.update`: Update contracts (HR only)
- `employee_contract.delete`: Delete contracts (HR Admin only)

### Data Protection
- **Salary Field**: Consider adding permission-based visibility (e.g., `employee_contract.read_salary`)
- **IDOR Prevention**: All endpoints validate contract existence before returning data
- **Audit Trail**: `created_by`, `updated_by` tracked untuk accountability
- **Soft Delete**: Maintain history untuk legal compliance

### Rate Limiting
- Apply rate limiting di sensitive endpoints (Create, Update, Delete)
- Expiring endpoint bisa di-cache aggressively (perubahan data jarang)

## Frontend Implementation Guide (Pending)

### Folder Structure (Belum Dibuat)
```
apps/web/src/features/hrd/employee-contracts/
├── types/index.d.ts                    # TypeScript interfaces
├── schemas/employee-contract.schema.ts # Zod validation schemas
├── services/employee-contract-service.ts # API calls
├── hooks/
│   ├── use-employee-contracts.ts       # List & filters
│   ├── use-employee-contract.ts        # Get by ID
│   ├── use-create-contract.ts          # Create mutation
│   ├── use-update-contract.ts          # Update mutation
│   ├── use-delete-contract.ts          # Delete mutation
│   ├── use-expiring-contracts.ts       # Expiring alert
│   └── use-employee-contract-history.ts # History by employee
├── components/
│   ├── employee-contract-list.tsx      # Table dengan filters
│   ├── employee-contract-form.tsx      # Create/Edit form
│   ├── employee-contract-detail.tsx    # Detail view modal
│   ├── expiring-contracts-alert.tsx    # Alert widget for dashboard
│   └── contract-history-timeline.tsx   # Timeline view for history
└── i18n/
    ├── en.ts   # English translations
    └── id.ts   # Indonesian translations
```

### Key Components Breakdown

1. **List Component** (`employee-contract-list.tsx`):
   - Table dengan sorting, filtering (status, type, employee)
   - Pagination
   - Action buttons: View, Edit, Delete
   - Highlight expiring contracts dengan badge warning
   
2. **Form Component** (`employee-contract-form.tsx`):
   - Dynamic validation: hide `end_date` jika type=PERMANENT
   - Show validation error jika type!=PERMANENT tapi no `end_date`
   - Employee select dengan search (async load dari API)
   - Date pickers dengan min/max validation
   - Salary input dengan currency formatter (IDR)
   
3. **Detail Modal** (`employee-contract-detail.tsx`):
   - Read-only view dengan formatted data
   - Show `is_expiring_soon` badge jika true
   - Download contract document button (jika `document_path` ada)
   - Action buttons: Edit, Delete (permission-based)
   
4. **Expiring Alert Widget** (`expiring-contracts-alert.tsx`):
   - Mini widget untuk HRD dashboard
   - Show count: "3 contracts expiring in 30 days"
   - Click to open full list dengan details
   - Auto-refresh setiap 1 hour

### Translations Structure

**File**: `apps/web/src/features/hrd/employee-contracts/i18n/en.ts`
```typescript
export const employeeContractEn = {
  employeeContract: {
    title: "Employee Contracts",
    createButton: "New Contract",
    // ... fields, messages, errors
    types: {
      PERMANENT: "Permanent",
      CONTRACT: "Contract",
      INTERNSHIP: "Internship",
      PROBATION: "Probation"
    },
    status: {
      ACTIVE: "Active",
      EXPIRED: "Expired",
      TERMINATED: "Terminated"
    }
  }
};
```

**Register**: Import in `src/i18n/request.ts`

### Routes (Belum Dibuat)
```
apps/web/app/[locale]/(dashboard)/hrd/employee-contracts/
├── page.tsx           # List view
├── loading.tsx        # Loading skeleton
├── new/
│   └── page.tsx       # Create form
└── [id]/
    ├── page.tsx       # Detail view
    └── edit/
        └── page.tsx   # Edit form
```

Register routes di `apps/web/src/lib/route-validator.ts` dengan permission `employee_contract.read`
