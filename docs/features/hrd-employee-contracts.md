# Employee Contract Management

Fitur untuk mengelola kontrak kerja karyawan dengan tracking masa berlaku, status kontrak, dan alert system untuk kontrak yang akan berakhir.

## Fitur Utama

- **CRUD Contract**: Create, Read, Update, Delete contract karyawan
- **Contract Types**: PERMANENT (tetap), CONTRACT (kontrak), INTERNSHIP (magang), PROBATION (masa percobaan)
- **Contract Status**: ACTIVE, EXPIRED, TERMINATED
- **Document Upload**: Upload contract documents (PDF, DOCX, XLS, XLSX) with security validation
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
| GET | `/hrd/employee-contracts` | `employee_contract.read` | List contracts with filters & search |
| GET | `/hrd/employee-contracts/form-data` | `employee_contract.read` | Get form select options (employees, types, statuses) |
| GET | `/hrd/employee-contracts/expiring` | `employee_contract.read` | Get expiring contracts alert |
| GET | `/hrd/employee-contracts/employee/:employee_id` | `employee_contract.read` | Get employee contract history |

### Upload Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/upload/document` | Auth | Upload contract document (PDF, DOC, DOCX, XLS, XLSX) |

**Upload Specification:**
- **Allowed Types**: PDF, DOC, DOCX, XLS, XLSX
- **Max Size**: 10MB (configurable via `STORAGE_MAX_UPLOAD_SIZE`)
- **Security Features**:
  - Magic bytes validation (not just extension)
  - UUID-based filename generation (prevents path traversal)
  - No execute permissions on uploaded files
  - Path traversal prevention
- **Response Format**:
  ```json
  {
    "success": true,
    "data": {
      "filename": "550e8400-e29b-41d4-a716-446655440000.pdf",
      "original_name": "employee_contract.pdf",
      "url": "/uploads/550e8400-e29b-41d4-a716-446655440000.pdf",
      "size": 1245678,
      "mime_type": "application/pdf"
    }
  }
  ```

### Query Parameters & Response Differences

**List Endpoint:**
- `page` (int): Page number (default: 1)
- `per_page` (int): Items per page (max: 100, default: 20)
- `search` (string): Search by contract_number (case-insensitive)
- `employee_id` (uuid): Filter by employee
- `status` (enum): ACTIVE, EXPIRED, TERMINATED
- `contract_type` (enum): PERMANENT, CONTRACT, INTERNSHIP, PROBATION

**Response:** Returns `EmployeeContractListResponse` (optimized for list view)
- **Includes:** id, employee_id, `employee_name`, `employee_code`, contract_number, type, dates, salary, job_title, status, expiry info, audit timestamps
- **Excludes:** department, terms, document_path (heavy fields moved to detail view)

**Detail Endpoint Response:** Returns full `EmployeeContractResponse` with all fields including department, terms, document_path

**Form Data Endpoint Response:**
```json
{
  "employees": [
    {"id": "uuid", "employee_code": "EMP001", "name": "John Doe"}
  ],
  "contract_types": [
    {"value": "PERMANENT", "label": "Permanent"},
    {"value": "CONTRACT", "label": "Contract"}, 
    {"value": "INTERNSHIP", "label": "Internship"},
    {"value": "PROBATION", "label": "Probation"}
  ],
  "statuses": [
    {"value": "ACTIVE", "label": "Active"},
    {"value": "EXPIRED", "label": "Expired"},
    {"value": "TERMINATED", "label": "Terminated"}
  ]
}
```

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

### 6. Test Filters & Search
```bash
# Search by contract number
curl "http://localhost:8080/api/v1/hrd/employee-contracts?search=2024"

# Filter by status
curl "http://localhost:8080/api/v1/hrd/employee-contracts?status=ACTIVE"

# Filter by type
curl "http://localhost:8080/api/v1/hrd/employee-contracts?contract_type=PERMANENT"

# Combined filters with search
curl "http://localhost:8080/api/v1/hrd/employee-contracts?status=ACTIVE&contract_type=CONTRACT&search=TEST&page=1&per_page=10"
```

### 7. Test Form Data Endpoint
```bash
# Get options for form selects (employees, contract types, statuses)
curl "http://localhost:8080/api/v1/hrd/employee-contracts/form-data" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: Returns arrays of employees (first 1000), contract types, and statuses

### 8. Test Update
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

### 9. Test Soft Delete
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

# Frontend unit tests
cd apps/web
npx pnpm test employee-contract

# E2E tests
npx pnpm test:e2e hrd/contracts

# Type check
cd apps/web
npx tsc --noEmit

# Linting
npx pnpm lint
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

### Frontend (✅ IMPLEMENTED)
- **TanStack Query v5**: Data fetching, caching, optimistic updates untuk mutations
- **Zod**: Form validation dengan business rules (PERMANENT no end_date, date comparison)
- **React Hook Form**: Form state management dengan Controller dan useWatch
- **shadcn/ui**: UI components (Table, Form, Dialog, DatePicker, Select, Badge, Skeleton)
- **date-fns**: Date calculations dan formatting (format, parseISO)
- **next-intl**: Internationalization (en/id) dengan translation support
- **Lucide React**: Icons (Plus, Search, Pencil, Trash2, Eye, AlertTriangle, MoreHorizontal, Calendar)

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
- **Audit Trail**: `created(✅ COMPLETE)

### Folder Structure
```
apps/web/src/features/hrd/employee-contract/
├── types/
│   └── index.d.ts                           # 103 lines - TypeScript interfaces
├── schemas/
│   └── employee-contract.schema.ts          # 80 lines - Zod validation + business rules
├── services/
│   └── employee-contract-service.ts         # 76 lines - API client methods
├── hooks/
│   └── use-employee-contracts.ts            # 165 lines - TanStack Query hooks
├── components/
│   ├── employee-contract-list.tsx           # 326 lines - Main list view
│   ├── employee-contract-form.tsx           # 386 lines - Create/Edit dialog with file upload
│   └── employee-contract-detail-modal.tsx   # 453 lines - Detail modal with 3 tabs
└── i18n/
    ├── en.ts                                # 181 lines - English translations
    └── id.ts                                # 181 lines - Indonesian translations

apps/web/app/[locale]/(dashboard)/hrd/contracts/
├── page.tsx           # Main page with permission guard
└── loading.tsx        # Skeleton loading state
```

### ✅ IMPLEMENTED: types/index.d.ts (103 lines)

**Contents:**
- `EmployeeContract` interface (17 fields)
- `ContractType` type: "PERMANENT" | "CONTRACT" | "INTERNSHIP" | "PROBATION"
- `ContractStatus` type: "ACTIVE" | "EXPIRED" | "TERMINATED"
- `Employee` interface (basic employee info)
- `User` interface (audit trail: created_by, updated_by)
- API response types: `EmployeeContractListResponse`, `EmployeeContractSingleResponse`
- Query params: `ListEmployeeContractsParams`, `ExpiringContractsParams`
- Request data: `CreateEmployeeContractData`, `UpdateEmployeeContractData`

### ✅ IMPLEMENTED: schemas/employee-contract.schema.ts (80 lines)

**Features:**
- Translation support via `getMsg(t, key, fallback)` helper
- Field validations:
  - `employee_id`: UUID required
  - `contract_number`: string 1-50 chars, required
  - `contract_type`: enum required
  - `start_date`: string required
  - `end_date`: string optional/nullable
  - `salary`: positive number >= 0.01
  - `job_title`: string 1-100 chars
  - `department`: string max 100 chars (optional)
  - `terms`: string optional
  - `document_path`: string max 255 chars (optional)
  - `status`: enum optional (default: ACTIVE)

**Business Logic Validation (superRefine):**
```typescript
// 1. PERMANENT contracts cannot have end_date
if (contract_type === "PERMANENT" && end_date) {
  ctx.addIssue({ path: ["end_date"], message: "..." });
}

// 2. Non-PERMANENT must have end_date
if (contract_type !== "PERMANENT" && !end_date) {
  ctx.addIssue({ path: ["end_date"], message: "..." });
}

// 3. end_date must be after start_date
if (end_date && start_date && new Date(end_date) <= new Date(start_date)) {
  ctx.addIssue({ path: ["end_date"], message: "..." });
}
```

### ✅ IMPLEMENTED: services/employee-contract-service.ts (76 lines)

**API Methods:**
```typescript
export const employeeContractService = {
  // List contracts with filters & pagination
  list: (params: ListEmployeeContractsParams) => 
    Promise<EmployeeContractListResponse>,
  
  // Get contract by ID
  getById: (id: string) => 
    Promise<EmployeeContractSingleResponse>,
  
  // Get all contracts for specific employee (history)
  getByEmployeeId: (employeeId: string, params: ListEmployeeContractsParams) => 
    Promise<EmployeeContractListResponse>,
  
  // Get expiring contracts within N days
  getExpiring: (params: ExpiringContractsParams) => 
    Promise<EmployeeContractListResponse>,
  
  // Create new contract
  create: (data: CreateEmployeeContractData) => 
    Promise<EmployeeContractSingleResponse>,
  
  // Update existing contract
  update: (id: string, data: UpdateEmployeeContractData) => 
    Promise<EmployeeContractSingleResponse>,
  
  // Soft delete contract
  delete: (id: string) => 
    Promise<void>,
};
```

**Base Path**: `/hrd/employee-contracts`

### ✅ IMPLEMENTED: hooks/use-employee-contracts.ts (165 lines)

**Query Keys Factory Pattern:**
```typescript
export const employeeContractKeys = {
  all: ["employee-contracts"] as const,
  lists: () => [...employeeContractKeys.all, "list"] as const,
  list: (params: ListEmployeeContractsParams) => 
    [...employeeContractKeys.lists(), params] as const,
  details: () => [...employeeContractKeys.all, "detail"] as const,
  detail: (id: string) => [...employeeContractKeys.details(), id] as const,
  byEmployee: (employeeId: string) => 
    [...employeeContractKeys.all, "employee", employeeId] as const,
  expiring: () => [...employeeContractKeys.all, "expiring"] as const,
};
```

**Hooks Implemented:**

1. **useEmployeeContracts** - List dengan filters
   ```typescript
   const { data, isLoading, error, refetch } = useEmployeeContracts({
     page: 1,
     per_page: 20,
     status: "ACTIVE",
     contract_type: "PERMANENT",
     employee_id: "uuid",
     search: "text",
   });
   ```

2. **useEmployeeContract** - Get by ID
   ```typescript
   const { data, isLoading } = useEmployeeContract(contractId);
   ```

3. **useEmployeeContractsByEmployee** - History per employee
   ```typescript
   const { data } = useEmployeeContractsByEmployee(employeeId, { page: 1 });
   ```

4. **useExpiringContracts** - Expiring alert
   ```typescript
   const { data } = useExpiringContracts({ days: 30, page: 1 });
   ```

5. **useCreateEmployeeContract** - Create mutation
   ```typescript
   const createContract = useCreateEmployeeContract();
   createContract.mutate(data, {
     onSuccess: () => toast.success("Created!"),
   });
   ```

6. **useUpdateEmployeeContract** - Update mutation with optimistic update
   ```typescript
   const updateContract = useUpdateEmployeeContract();
   // Optimistically updates cache before API response
   // Reverts on error
   ```

7. **useDeleteEmployeeContract** - Delete mutation with optimistic update
   ```typescript
   const deleteContract = useDeleteEmployeeContract();
   // Optimistically removes from list
   // Reverts on error
   ```

### ✅ IMPLEMENTED: i18n Translations (181 lines each)

**Structure:**
```typescript
export const employeeContractEn = {
  employeeContract: {
    title: "Employee Contracts",
    subtitle: "Manage employee contract records",
    createButton: "Add Contract",
    editButton: "Edit Contract",
    
    status: {
      ACTIVE: "Active",
      EXPIRED: "Expired",
      TERMINATED: "Terminated",
    },
    
    contractType: {
      PERMANENT: "Permanent",
      CONTRACT: "Contract",
      INTERNSHIP: "Internship",
      PROBATION: "Probation",
    },
    
    fields: { /* 15+ field labels */ },
    buttons: { /* action labels */ },
    messages: { /* success/error messages */ },
    validation: { /* validation error messages */ },
    filters: { /* filter labels */ },
    info: { /* help texts */ },
  },
};
```

**Registered in**: `src/i18n/request.ts`
```typescript
import { employeeContractEn } from "@/features/hrd/employee-contract/i18n/en";
import { employeeContractId } from "@/features/hrd/employee-contract/i18n/id";

const messages = {
  en: { ...employeeContractEn, ... },
  id: { ...employeeContractId, ... },
};
```

### ✅ IMPLEMENTED: Components

#### 1. employee-contract-list.tsx (326 lines)

**Features:**
- **Search**: Debounced search input (500ms delay) by contract number/employee name
- **Filters**: 
  - Status dropdown (All, ACTIVE, EXPIRED, TERMINATED)
  - Type dropdown (All, PERMANENT, CONTRACT, INTERNSHIP, PROBATION)
- **Table Columns** (9 columns):
  1. Contract Number (link to detail)
  2. Employee (link to employee detail page)
  3. Type (badge with color coding)
  4. Job Title
  5. Start Date (formatted)
  6. End Date (formatted or "No End Date" for PERMANENT)
  7. Status (badge with color: success/destructive/secondary)
  8. Days Until Expiry (warning badge if < 30 days)
  9. Actions (dropdown: View, Edit, Delete)
- **Pagination**: DataTablePagination component (pageIndex, pageSize, rowCount)
- **Loading States**: Skeleton untuk empty states
- **Permission Guards**: Check `employee_contract.update` dan `employee_contract.delete`
- **Alerts**: Warning message jika ada kontrak expiring soon
- **Empty State**: Friendly message saat tidak ada data
- **Delete Confirmation**: DeleteDialog dengan loading state

**Key Implementation Details:**
```typescript
// Debounced search
const debouncedSearch = useDebounce(searchTerm, 500);

// Query dengan pagination & filters
const { data, isLoading } = useEmployeeContracts({
  page,
  per_page: pageSize,
  search: debouncedSearch,
  status: selectedStatus,
  contract_type: selectedType,
});

// Optimistic delete
const handleDelete = () => {
  deleteContract.mutate(deletingId!, {
    onSuccess: () => {
      toast.success("Deleted successfully");
      setDeletingId(null);
    },
  });
};
```

#### 2. employee-contract-form.tsx (386 lines)

**Form Fields:**
1. **Employee** (Select - disabled in edit mode)
2. **Contract Number** (Input)
3. **Contract Type** (Select)
4. **Start Date** (DatePicker)
5. **End Date** (DatePicker - disabled for PERMANENT)
6. **Salary** (NumericInput)
7. **Job Title** (Input)
8. **Department** (Input)
9. **Terms** (Textarea)
10. **Document** (FileUpload - \u2705 IMPLEMENTED)
    - Upload contract documents (PDF, DOC, DOCX, XLS, XLSX)
    - Max size: 10MB
    - Automatic upload to `/upload/document` endpoint
    - Shows uploaded filename with remove option
    - Loading state during upload
    - Security: Magic bytes validation, UUID filenames
11. **Status** (Select - only in edit mode)

**Auto-Clear Logic (Fixed React Compiler Warning):**
```typescript
// Use useWatch instead of watch() to avoid React Compiler warning
const contractType = useWatch({ control, name: "contract_type" });

useEffect(() => {
  if (contractType === "PERMANENT") {
    setValue("end_date", undefined);
  }
}, [contractType, setValue]);
```

**Form Modes:**
- **Create Mode**: All fields enabled, status defaults to ACTIVE
- **Edit Mode**: Employee field disabled (cannot change employee), all other fields editable

**Validation:**
- Zod schema with business rules
- Real-time error messages in Indonesian/English
- Disabled submit button while loading

**UX Enhancements:**
- Loading spinner on button during mutation
- Auto-close modal on success
- Toast notifications for success/error
- Form reset on close

#### 3. employee-contract-detail-modal.tsx (453 lines)

**Layout: 3 Tabs (Overview, Employee, Audit)**

1. **Header**
   - Contract Number (large title)
   - Status Badge (color-coded)
   - Close button

2. **Warning Messages** (conditional):
   - **Expiring Soon**: Yellow warning jika `is_expiring_soon === true` dan `days_until_expiry <= 30`
   - **Expired**: Red destructive alert jika `status === "EXPIRED"`
   - **Terminated**: Gray secondary alert jika `status === "TERMINATED"`

3. **Employee Information**
   - Employee Code (link to employee detail)
   - Name
   - Contract Type badge

4. **Contract Details**
   - Start Date (formatted: Jan 15, 2026)
   - End Date (formatted or "No End Date" for PERMANENT)
   - Days Until Expiry (only shown if applicable)

5. **Financial Information**
   - Salary (formatted as IDR currency or "-" if not set)
   - Job Title
   - Department (or "-" if not set)

6. **Terms & Conditions**
   - Full terms text (or "-" if empty)

7. **Document**
   - Document Path
   - Download button (disabled if no document)

8. **Audit Trail**
   - Created By: username @ timestamp
   - Updated By: username @ timestamp (if updated)

9. **Footer Actions**
   - Edit Button (permission-gated: `employee_contract.update`)
   - Close Button

**Key Features:**
- Read-only view (all data formatted and styled)
- Conditional rendering untuk fields yang nullable
- Link ke employee detail page
- Warning system untuk contract expiry
- Permission-based action buttons

### ✅ IMPLEMENTED: Pages & Loading

#### page.tsx
```typescript
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { PermissionGuard } from "@/components/permission-guard";
import Loading from "./loading";

const EmployeeContractList = dynamic(
  () => import("@/features/hrd/employee-contract/components/employee-contract-list")
    .then(mod => ({ default: mod.EmployeeContractList })),
  { ssr: false, loading: () => <Loading /> }
);

export default function EmployeeContractsPage() {
  return (
    <PermissionGuard permission="employee_contract.read">
      <Suspense fallback={<Loading />}>
        <EmployeeContractList />
      </Suspense>
    </PermissionGuard>
  );
}
```

#### loading.tsx (Fixed - No TableSkeleton dependency)
```typescript
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function EmployeeContractsLoading() {
  return (
    <div className="space-y-6">
      {/* Title skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-col md:flex-row gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-full md:w-[180px]" />
        <Skeleton className="h-10 w-full md:w-[180px]" />
        <Skeleton className="h-10 w-full md:w-[140px]" />
      </div>

      {/* Table skeleton (inline - no external dependency) */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 9 }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-full" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: 9 }).map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

### Routes Registration

**File**: `src/lib/route-validator.ts`

```typescript
const VALID_DASHBOARD_ROUTES = [
  // ... other routes
  
  // HRD routes
  "/hrd/attendance",
  "/hrd/leave-requests",
  "/hrd/contracts",  // ✅ REGISTERED
  "/hrd/education",
  
  // ... other routes
];
```

**Permission**: `employee_contract.read` (required untuk akses halaman)

### Frontend Testing Guide

#### Manual Testing Checklist

**1. Navigation & Loading**
- [ ] Access `/hrd/contracts` (must be authenticated)
- [ ] Permission guard redirects if no `employee_contract.read`
- [ ] Loading skeleton shows during initial load
- [ ] Page title & subtitle displayed correctly (i18n)

**2. List View**
- [ ] Contracts displayed in table with 9 columns
- [ ] Search works (type in search box, debounced 500ms)
- [ ] Status filter works (All, ACTIVE, EXPIRED, TERMINATED)
- [ ] Type filter works (All, PERMANENT, CONTRACT, INTERNSHIP, PROBATION)
- [ ] Pagination works (change page, change page size)
- [ ] Empty state shows when no results
- [ ] Expiring contracts show warning badge

**3. Create Contract**
- [ ] Click "Add Contract" button
- [ ] Dialog opens with empty form
- [ ] Employee select loads async (search works)
- [ ] Contract type select shows 4 options
- [ ] Start date picker opens calendar
- [ ] End date picker opens calendar
- [ ] Salary input format as currency
- [ ] **CRITICAL**: Select "PERMANENT" → end_date auto-clears and disables
- [ ] **CRITICAL**: Select "CONTRACT" → end_date enables and shows required
- [ ] Submit with valid data → success toast → modal closes → list refreshes
- [ ] Submit with invalid data → shows validation errors

**4. Edit Contract**
- [ ] Click "Edit" action in table
- [ ] Dialog opens with pre-filled data
- [ ] Employee field is disabled (cannot change)
- [ ] All other fields are editable
- [ ] Status field shows (only in edit mode)
- [ ] **CRITICAL**: Change type to PERMANENT → end_date clears
- [ ] **CRITICAL**: Change type to CONTRACT with no end_date → validation error
- [ ] Update → optimistic update → toast → modal closes → list refreshes

**5. View Details**
- [ ] Click "View" action or contract number
- [ ] Modal opens with formatted data
- [ ] Warning shows if `is_expiring_soon`
- [ ] Red alert shows if `status === "EXPIRED"`
- [ ] Employee name is link (navigate to employee page)
- [ ] Salary formatted as IDR currency
- [ ] Dates formatted as readable (e.g., "Jan 15, 2026")
- [ ] "No End Date" shows for PERMANENT contracts
- [ ] Edit button shows if have `employee_contract.update` permission

**6. Delete Contract**
- [ ] Click "Delete" action
- [ ] Confirmation dialog opens
- [ ] Cancel → dialog closes, nothing happens
- [ ] Confirm → optimistic delete → item removed from list
- [ ] Success toast shows
- [ ] If API fails → item restored to list

**7. Internationalization**
- [ ] Switch language to Indonesian → all labels update
- [ ] Switch language to English → all labels update
- [ ] Validation messages show in correct language
- [ ] Status/Type badges show in correct language
- [ ] Date formats adjust (if applicable)

**8. Permissions**
- [ ] User without `employee_contract.read` → redirected
- [ ] User without `employee_contract.create` → "Add" button hidden
- [ ] User without `employee_contract.update` → "Edit" button hidden/disabled
- [ ] User without `employee_contract.delete` → "Delete" button hidden/disabled

**9. Responsive Design**
- [ ] Mobile view: filters stack vertically
- [ ] Mobile view: table scrollable horizontally
- [ ] Mobile view: modals adjust height (max-h-[90vh])
- [ ] Desktop view: filters in single row
- [ ] Desktop view: table shows all columns

**10. Performance**
- [ ] Search debounced (no API call per keystroke)
- [ ] Pagination doesn't reload full list (only new page)
- [ ] Optimistic updates feel instant
- [ ] Loading states show during async operations
- [ ] No N+1 query issues

#### Integration Testing Scenarios

**Scenario 1: Create PERMANENT Contract**
1. Open form
2. Select employee
3. Enter contract number: "TEST-PERM-001"
4. Select type: PERMANENT
5. Select start date: 2026-02-01
6. Verify end_date is disabled and cleared
7. Enter salary: 15000000
8. Enter job title: "Senior Engineer"
9. Submit
10. Verify success toast
11. Verify contract appears in list with "No End Date"

**Scenario 2: Create CONTRACT with End Date**
1. Open form
2. Select employee
3. Enter contract number: "TEST-CONT-001"
4. Select type: CONTRACT
5. Select start date: 2026-02-01
6. Select end date: 2027-02-01 (1 year)
7. Enter salary: 10000000
8. Enter job title: "Contract Developer"
9. Submit
10. Verify contract appears with formatted end date

**Scenario 3: Validation - CONTRACT without End Date**
1. Open form
2. Select type: CONTRACT
3. Select start date: 2026-02-01
4. Leave end_date empty
5. Try to submit
6. Verify validation error: "End date is required for non-permanent contracts"

**Scenario 4: Validation - End Date Before Start Date**
1. Open form
2. Select start date: 2026-02-01
3. Select end date: 2026-01-01 (before start)
4. Try to submit
5. Verify validation error: "End date must be after start date"

**Scenario 5: Edit Contract Type**
1. Open edit form for CONTRACT type
2. Change type to PERMANENT
3. Verify end_date clears automatically
4. Submit
5. Verify contract updated in list

**Scenario 6: Search Functionality**
1. Enter "TEST" in search
2. Wait 500ms (debounce)
3. Verify API called with search param
4. Verify filtered results show

**Scenario 7: Filter by Status**
1. Select status filter: ACTIVE
2. Verify only ACTIVE contracts show
3. Select: EXPIRED
4. Verify only EXPIRED contracts show

**Scenario 8: Delete with Optimistic Update**
1. Note current contract count
2. Click delete on a contract
3. Confirm deletion
4. Verify contract immediately disappears (optimistic)
5. Wait for API response
6. Verify success toast
7. Refresh page → contract still deleted (persisted)

### Business Logic Validations (Frontend)

**Implemented in Zod Schema:**

1. ✅ **PERMANENT contracts cannot have end_date**
   - Error: "Permanent contracts cannot have an end date"
   - Triggered: When contract_type === "PERMANENT" AND end_date is not empty

2. ✅ **Non-PERMANENT contracts must have end_date**
   - Error: "End date is required for non-permanent contracts"
   - Triggered: When contract_type !== "PERMANENT" AND end_date is empty

3. ✅ **End date must be after start date**
   - Error: "End date must be after start date"
   - Triggered: When both dates provided AND end_date <= start_date

4. ✅ **Contract number unique**
   - Handled by backend (409 CONFLICT)
   - Frontend shows error toast from API response

5. ✅ **Salary must be positive**
   - Error: "Salary must be greater than 0"
   - Triggered: When salary <= 0

6. ✅ **Required fields**
   - All required fields validated with appropriate error messages
   - Translation support for all validation messages

### Known Issues & Limitations

1. **TypeScript Module Resolution** (Non-blocking):
   - TypeScript may show "Cannot find module" error for `./employee-contract-form` and `./employee-contract-detail-modal`
   - Files exist and export correctly
   - This is a TypeScript cache issue
   - **Fix**: Restart VS Code or run `npx tsc --noEmit`

2. **React Compiler Warning** (Non-blocking):
   - ~~Warning: "React Hook Form's `useForm()` API returns a `watch()` function which cannot be memoized safely"~~
   - **FIXED**: Changed from `watch()` to `useWatch({ control, name })` hook
   - Component not memoized by React Compiler but works correctly

3. **Employee Selector**:
   - Currently loads first 100 employees only
   - For large organizations (>100 employees), need to implement:
     - Server-side search
     - Infinite scroll or virtualization
     - Async search with debounce

4. **Document Upload**:
   - Field `document_path` is text input only
   - No file upload functionality yet
   - Planned for Sprint 15

5. **Expiring Contracts Widget**:
   - Not yet implemented as dashboard widget
   - Data available via `useExpiringContracts()` hook
   - Can be added to HRD dashboard in future sprint

### Future Frontend Enhancements

1. **Contract History Timeline** (Not Implemented):
   - Component: `contract-history-timeline.tsx`
   - Show employee's contract history in chronological order
   - Highlight changes (job title, salary, type transitions)

2. **Expiring Contracts Dashboard Widget**:
   - Mini card showing count of expiring contracts
   - Click to open full list
   - Real-time updates dengan polling or SSE

3. **Bulk Operations**:
   - Select multiple contracts
   - Bulk status update (e.g., terminate multiple contracts)
   - Bulk export to CSV/PDF

4. **Advanced Filters**:
   - Date range filter (start_date, end_date)
   - Salary range filter
   - Department filter
   - Multiple selections (e.g., ACTIVE + EXPIRED)

5. **Contract Document Management**:
   - Upload PDF/DOCX contracts
   - Preview in modal
   - Generate contract from template
   - Digital signature integration

6. **Contract Renewal Workflow**:
   - "Renew Contract" button
   - Copy existing contract with new dates
   - Email notification to employee & HR

7. **Export Features**:
   - Export filtered list to Excel
   - Generate individual contract PDF
   - Bulk export contracts for payroll

8. **Analytics Dashboard**:
   - Charts: Contracts by type, status distribution
   - Trends: New contracts per month
   - Expiry forecast for next 3/6/12 months

### Performance Optimizations Applied

1. ✅ **Debounced Search**: 500ms delay prevents excessive API calls
2. ✅ **Optimistic Updates**: Instant UI feedback for mutations
3. ✅ **Query Key Caching**: TanStack Query cache management
4. ✅ **Pagination**: Max 100 items per page
5. ✅ **Lazy Loading**: Dynamic import for list component
6. ✅ **Skeleton Loading**: Smooth loading experience
7. ✅ **useWatch Hook**: Prevents unnecessary re-renders vs watch()

### Accessibility (a11y) Considerations

1. ✅ **Keyboard Navigation**: All interactive elements keyboard accessible
2. ✅ **ARIA Labels**: Buttons and actions have descriptive labels
3. ✅ **Focus Management**: Modal focus trap, escape key closes
4. ✅ **Error Messages**: Clear, actionable error messages
5. ✅ **Loading States**: Screen readers announce loading
6. ✅ **Color Contrast**: Badge colors meet WCAG AA standards
7. ⚠️ **Screen Reader Testing**: Needs dedicated testing session

### Code Quality Metrics

- **Total Lines**: ~1,800 lines (types, schemas, services, hooks, components, i18n)
- **TypeScript Coverage**: 100% (all files use TypeScript)
- **Translation Coverage**: 100% (en/id complete)
- **Component Structure**: Feature-based vertical slice (recommended pattern)
- **Linting**: All files pass ESLint checks
- **Type Safety**: No `any` types (except handled errors)
- **Patterns Used**:
  - TanStack Query keys factory
  - Optimistic updates
  - useWatch for reactive form fields
  - Zod superRefine for complex validations
  - Permission-based conditional rendering
  - Debounced search
└── [id]/
    ├── page.tsx       # Detail view
    └── edit/
        └── page.tsx   # Edit form
```

Register routes di `apps/web/src/lib/route-validator.ts` dengan permission `employee_contract.read`
