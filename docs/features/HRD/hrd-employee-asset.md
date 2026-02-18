# Employee Asset Management

Fitur untuk mengelola aset perusahaan yang dipinjamkan kepada karyawan dengan tracking status peminjaman dan pengembalian. Memungkinkan HRD untuk memantau aset yang sedang dipinjam, kondisi aset saat peminjaman dan pengembalian, serta histori peminjaman per karyawan.

## Fitur Utama

- **CRUD Aset Karyawan**: Pencatatan peminjaman aset (laptop, handphone, kendaraan, dll)
- **Tracking Status**: Distinguish antara aset yang sedang dipinjam (BORROWED) vs sudah dikembalikan (RETURNED)
- **Tracking Kondisi**: Pencatatan kondisi aset saat peminjaman (borrow_condition) dan saat pengembalian (return_condition)
- **Return Asset Action**: Dedicated endpoint untuk menandai aset sebagai dikembalikan dengan validasi tanggal
- **Dashboard Query**: Endpoint khusus untuk menampilkan aset yang sedang dipinjam (borrowed) untuk alert dashboard
- **Search & Filter**: Pencarian berdasarkan nama aset, kode aset, kategori dengan filter status (BORROWED/RETURNED) dan per karyawan
- **Histori per Karyawan**: View semua aset yang pernah dipinjam oleh karyawan tertentu
- **Form Data**: Single endpoint untuk mendapatkan semua data dropdown (employees) untuk form

## Business Rules

### Peminjaman Aset (Create)

- **Asset Code Uniqueness**: Kode aset harus unik **HANYA untuk aset yang sedang dipinjam** (ReturnDate IS NULL)
  - Setelah aset dikembalikan, kode aset yang sama **boleh digunakan lagi** untuk peminjaman baru
  - Validasi: Cek existing asset dengan kode yang sama, jika ada dan `!IsReturned()`, reject
- **Employee Existence**: Karyawan yang meminjam harus exist di database
- **Borrow Date**: Wajib diisi, format YYYY-MM-DD
- **Borrow Condition**: Wajib diisi, pilihan: NEW, GOOD, FAIR, POOR, DAMAGED

### Update Aset (Update)

- **Cannot Update Returned Assets**: Aset yang sudah dikembalikan (ReturnDate NOT NULL) **tidak bisa di-update**
  - Rationale: Immutable record untuk audit trail
- **Asset Code Change Validation**: Jika mengubah kode aset, validasi uniqueness berlaku (hanya untuk unreturned assets)
- **Fields yang bisa diupdate**: AssetName, AssetCode, AssetCategory, BorrowDate, BorrowCondition, Notes

### Pengembalian Aset (Return)

- **Cannot Return Already Returned**: Aset yang sudah dikembalikan tidak bisa dikembalikan lagi
- **Return Date Validation**: Tanggal pengembalian harus **setelah** tanggal peminjaman
  - Validasi: `returnDate.Before(asset.BorrowDate)` → error "Return date must be after borrow date"
- **Return Condition Mandatory**: Kondisi aset saat pengembalian wajib diisi
- **Notes Merging**: Notes peminjaman akan digabung dengan notes pengembalian
  - Format: `<borrow_notes>\n---\nReturn Notes: <return_notes>`

### Computed Fields

- **Status**: Dihitung dari ReturnDate
  - `ReturnDate IS NULL` → BORROWED
  - `ReturnDate IS NOT NULL` → RETURNED
- **DaysBorrowed**: Durasi peminjaman dihitung otomatis
  - Jika belum dikembalikan: `days(now - BorrowDate)`
  - Jika sudah dikembalikan: `days(ReturnDate - BorrowDate)`

### Soft Delete

- Delete menggunakan soft delete (set deleted_at)
- Record tetap tersimpan untuk audit trail
- Tidak muncul di list dan query biasa

## Keputusan Teknis & Trade-offs

### 1. Nullable ReturnDate dan ReturnCondition

**Keputusan**: ReturnDate dan ReturnCondition menggunakan pointer (`*time.Time`, `*AssetCondition`) untuk support NULL values.

**Rationale**:

- Clear distinction antara aset borrowed (NULL) vs returned (set)
- Menghindari zero values (0001-01-01) yang ambiguous
- Memudahkan query filtering (`WHERE return_date IS NULL`)

**Trade-off**:

- Perlu NULL checks di setiap akses: `if asset.ReturnDate != nil`
- Slightly more complex code untuk mapping DTO

**Alternative Considered**: Boolean flag `is_returned` → rejected karena redundant dan bisa out-of-sync dengan ReturnDate.

### 2. Asset Code Reuse After Return

**Keputusan**: Asset code hanya harus unik untuk aset yang **sedang dipinjam** (unreturned). Setelah aset dikembalikan, kode yang sama bisa digunakan untuk peminjaman baru.

**Rationale**:

- Aset fisik yang sama bisa dipinjamkan berkali-kali (e.g., laptop LAP-001 dipinjam A, dikembalikan, lalu dipinjam B)
- Kode aset merefer ke aset fisik, bukan peminjaman record
- Menghindari keharusan generate kode baru untuk aset yang sama

**Trade-off**:

- Validation logic lebih complex: `existingAsset != nil && !existingAsset.IsReturned()`
- Query untuk list aset fisik perlu grouping atau distinct logic

**Alternative Considered**: Unique asset code across all records → rejected karena tidak realistis untuk aset fisik yang sama.

### 3. Cannot Update Returned Assets

**Keputusan**: Aset yang sudah dikembalikan (ReturnDate IS NOT NULL) tidak bisa di-update lewat PUT /:id endpoint.

**Rationale**:

- **Audit trail integrity**: Record pengembalian harus immutable untuk compliance
- **Data consistency**: Mencegah perubahan data historis yang sudah finalized
- **Business logic**: Setelah aset dikembalikan, record menjadi historical data

**Trade-off**:

- Jika ada kesalahan input saat pengembalian, harus soft delete + create new record
- Less flexibility untuk admin correction

**Alternative Considered**: Allow update with audit log → rejected karena complexity vs benefit.

### 4. Computed Status dan DaysBorrowed (Not Stored)

**Keputusan**: Status (BORROWED/RETURNED) dan DaysBorrowed dihitung on-the-fly menggunakan model methods (`GetStatus()`, `DaysBorrowed()`), tidak disimpan di database.

**Rationale**:

- **Always accurate**: Tidak ada risk of stale data
- **Single source of truth**: ReturnDate adalah satu-satunya source untuk status
- **Automatic calculation**: Tidak perlu manual update saat return

**Trade-off**:

- Slight performance overhead: Calculation at query time
- Cannot efficiently filter/sort by DaysBorrowed in SQL (need application-level sort)

**Alternative Considered**: Stored computed columns → rejected karena adds complexity dan risk of inconsistency.

### 5. GIN Indexes untuk Search

**Keputusan**: Menggunakan GIN indexes dengan `gin_trgm_ops` untuk asset_name, asset_code, dan asset_category.

**Rationale**:

- **Fast prefix search**: Support ILIKE queries dengan `text%` pattern
- **Fuzzy search ready**: GIN trgm_ops support similarity search jika dibutuhkan future
- **Backend filtering**: All filtering (search, status, employee_id) dilakukan di database, bukan application

**Trade-off**:

- Slower inserts (GIN index update overhead)
- More disk space untuk index storage

**Alternative Considered**: B-tree indexes → rejected karena tidak support ILIKE efficiently.

### 6. Batch Employee Fetch (N+1 Prevention)

**Keputusan**: Dalam GetAll usecase, setelah fetch assets, extract employee IDs lalu batch fetch employees dengan single query `FindByIDs()`, build map untuk O(1) lookup.

**Rationale**:

- **Performance**: Menghindari N+1 queries (1 query untuk assets + N queries per employee)
- **Scalability**: Constant 2 queries regardless of result size
- **Network efficiency**: Less DB round-trips

**Trade-off**:

- More complex code: Extract IDs → batch fetch → build map → map responses
- Memory overhead: Hold employee map in memory

**Alternative Considered**: GORM Preload → rejected karena less control dan harder to debug.

### 7. Special /borrowed Endpoint

**Keputusan**: Dedicated endpoint GET `/hrd/employee-assets/borrowed` untuk query aset yang sedang dipinjam (ReturnDate IS NULL), diurutkan by borrow_date ASC (oldest first).

**Rationale**:

- **Dashboard widget**: Specific use case untuk alert "Long borrowed assets"
- **Performance**: Optimized query dengan filter dan sort yang fixed
- **Clarity**: Explicit intent vs generic GET dengan filter

**Trade-off**:

- Additional endpoint maintenance
- Could be achieved via GET /?status=BORROWED

**Alternative Considered**: Use generic GET with status filter → chose dedicated endpoint for clarity dan performance.

### 8. Special /return Endpoint (POST)

**Keputusan**: Dedicated endpoint POST `/hrd/employee-assets/:id/return` untuk return action, instead of PATCH atau PUT.

**Rationale**:

- **Semantic clarity**: "Return" adalah business action, bukan generic update
- **Validation separation**: Return memiliki validasi khusus (return date > borrow date) yang berbeda dari update
- **Immutability enforcement**: Clear separation antara "update borrow info" vs "finalize return"

**Trade-off**:

- More endpoints to maintain
- Could be achieved via PUT with special logic

**Alternative Considered**: PATCH with `{ "action": "return" }` → rejected karena less RESTful.

## Struktur Folder

```
internal/hrd/
├── data/
│   ├── models/
│   │   └── employee_asset.go          # GORM model + business methods
│   └── repositories/
│       ├── employee_asset_repository.go      # Interface
│       └── employee_asset_repository_impl.go # GORM implementation
├── domain/
│   ├── dto/
│   │   └── employee_asset_dto.go      # Request/Response DTOs
│   ├── mapper/
│   │   └── employee_asset_mapper.go   # Model ↔ DTO conversions
│   └── usecase/
│       ├── employee_asset_usecase.go       # Interface
│       └── employee_asset_usecase_impl.go  # Business logic
└── presentation/
    ├── handler/
    │   └── employee_asset_handler.go  # HTTP handlers
    └── router/
        └── employee_asset_router.go   # Route definitions
```

## API Endpoints

| Method | Endpoint                                     | Permission              | Description                                          |
| ------ | -------------------------------------------- | ----------------------- | ---------------------------------------------------- |
| GET    | `/hrd/employee-assets`                       | `employee_asset.read`   | List all employee assets with pagination and filters |
| GET    | `/hrd/employee-assets/:id`                   | `employee_asset.read`   | Get asset detail by ID                               |
| GET    | `/hrd/employee-assets/employee/:employee_id` | `employee_asset.read`   | Get all assets borrowed by specific employee         |
| GET    | `/hrd/employee-assets/borrowed`              | `employee_asset.read`   | Get currently borrowed assets (for dashboard alert)  |
| GET    | `/hrd/employee-assets/form-data`             | Auth                    | Get form data (employees dropdown)                   |
| POST   | `/hrd/employee-assets`                       | `employee_asset.create` | Borrow asset (create new record)                     |
| PUT    | `/hrd/employee-assets/:id`                   | `employee_asset.update` | Update asset info (only for unreturned assets)       |
| POST   | `/hrd/employee-assets/:id/return`            | `employee_asset.update` | Mark asset as returned                               |
| DELETE | `/hrd/employee-assets/:id`                   | `employee_asset.delete` | Soft delete asset record                             |

### Query Parameters (GET /hrd/employee-assets)

- `page` (int): Page number (default: 1)
- `per_page` (int): Items per page (default: 20, max: 100)
- `search` (string): Search in asset_name, asset_code, asset_category (prefix search)
- `employee_id` (uuid): Filter by employee
- `status` (string): Filter by status (`BORROWED` | `RETURNED`)

### Request Body Examples

**POST /hrd/employee-assets** (Create - Borrow Asset):

```json
{
  "employee_id": "550e8400-e29b-41d4-a716-446655440000",
  "asset_name": "MacBook Pro 16\" M3 Max",
  "asset_code": "LAP-001",
  "asset_category": "Laptop",
  "borrow_date": "2024-01-15",
  "borrow_condition": "NEW",
  "notes": "For development work"
}
```

**PUT /hrd/employee-assets/:id** (Update - Only Unreturned):

```json
{
  "asset_name": "MacBook Pro 16\" M3 Max (Updated)",
  "asset_category": "Laptop - Development",
  "notes": "Updated notes"
}
```

**POST /hrd/employee-assets/:id/return** (Return Asset):

```json
{
  "return_date": "2024-06-15",
  "return_condition": "GOOD",
  "notes": "All accessories returned"
}
```

## Frontend Implementation

### Komponen

- **EmployeeAssetList**: "Smart component" yang mengelola state (search, filters, pagination) dan hooks query. Menggunakan `DataTablePagination` untuk navigasi halaman.
  - **Layout**: Mengikuti pola Employee Contracts - header dengan judul dan deskripsi di blok `space-y-2` (tanpa tombol di samping), baris filter satu baris dengan search (`max-w-sm`), filter employee (`w-48`), filter status (`w-48`), `flex-1`, lalu tombol **Borrow Asset** di kanan.
  - **Search**: Memanggil `setPage(1)` saat nilai berubah; filter employee dan status juga reset ke halaman 1.
- **EmployeeAssetForm**: Form dengan React Hook Form dan Zod schema validator untuk create/update aset.
  - **Employee Select Terkontrol**: Menggunakan `value={field.value}` dan `onValueChange={field.onChange}` (bukan `defaultValue`) agar nilai form dan tampilan Select selalu sinkron.
  - **Normalisasi Employee ID**: Menggunakan `useWatch` untuk `employee_id` dan `useEffect` yang normalisasi label (mis. `"EMP-002 - Manager User"`) menjadi ID string agar validasi lulus.
  - **Default Value**: `employee_id` diisi dengan `String(asset?.employee_id ?? "")` agar selalu string.
  - **Borrow Condition Select**: Diubah ke controlled (`value` + `onValueChange`) agar konsisten.
  - **Overflow Handling**: `DialogContent` menggunakan `max-h-[90vh] overflow-y-auto overflow-x-hidden` agar konten scroll di dalam viewport dan tidak overflow horizontal.
- **ReturnAssetModal**: Dialog khusus untuk pengembalian aset dengan validasi tanggal pengembalian harus > tanggal peminjaman.
- **EmployeeAssetDetailModal**: Menampilkan detail aset, histori peminjaman, dan kondisi.
  - **Judul Modal**: `{asset.asset_code} - {asset.asset_name}` dengan deskripsi pakai `t("detail.title")` untuk konsistensi i18n.
  - **Overflow Handling**: `DialogContent` menggunakan `max-h-[90vh] overflow-y-auto overflow-x-hidden`, konten dalam div diberi `min-w-0` agar tidak melebar.

### Hooks & State Management

- **useEmployeeAssets**: Hook untuk fetch list aset dengan filters.
- **useEmployeeAssetFormData**: Hook untuk mendapatkan opsi dropdown employee dengan format label `employee_code - name`.
- **useCreate/Update/DeleteEmployeeAsset**: Mutations untuk CRUD operations dengan auto-invalidation query cache.

### i18n (Internationalization)

- **Key Structure**: Menggunakan struktur hierarkis dengan prefix `employeeAssets.*`
- **Detail Title**: `detail.title` untuk deskripsi modal detail
- **Days Total**: `detail.daysTotal` diubah dari format `{{days}}` ke `{days}` agar next-intl mengisi nilai dengan benar (tidak tampil key mentah)
- **Validation Messages**:
  - `validation.max_length` diubah dari `{{max}}` ke `{max}` untuk menghindari error `MALFORMED_ARGUMENT`
  - `validation.invalid_uuid` untuk validasi employee_id ("Invalid employee selection" / "Pilihan karyawan tidak valid")
  - Contoh: `t("validation.max_length", { max: 255 })` → `"Maximum 255 characters"`
- **Language Files**: `en.ts` dan `id.ts` di folder i18n messages
- **Select Labels**: Employee dropdown menampilkan format `employee_code - name` untuk kemudahan identifikasi

### UX Decisions

- **Filters**: Employee filter (dropdown) dan Status filter (Borrowed/Returned) di toolbar dalam satu baris dengan search dan tombol Borrow Asset di kanan.
- **Asset Code Clickable**: Cell **Asset Code** memakai styling `className="font-medium text-primary hover:underline cursor-pointer"` dan `onClick={() => handleViewDetail(asset)}` sehingga bisa diklik langsung untuk membuka detail (sama seperti kolom Contract Number di halaman contracts).
- **Pagination Reset**: Search dan filter otomatis memanggil `setPage(1)` untuk reset ke halaman pertama saat filter berubah.
- **Row Actions**: Dropdown menu per baris (Edit, Return, Delete, View Detail) yang context-aware (e.g. "Return" hanya muncul jika status BORROWED).
- **Badges**: Visual distinction untuk Status (Borrowed: yellow, Returned: blue) dan Condition (New/Good: standard, Damaged: red).
- **Modals**: Semua action (Form, Return, Detail) menggunakan modal dialog untuk tetap dalam context list. Dialog menggunakan `max-h-[90vh] overflow-y-auto overflow-x-hidden` untuk menghindari overflow viewport.

### Zod Schema Validation

- **Schema File**: `apps/web/src/features/hrd/employee-assets/schemas/employee-asset.schema.ts`
- **Employee ID Validation**: Menggunakan regex UUID permisif (sama dengan employee-contracts)
  - **Pattern**: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
  - **Rationale**: `z.string().uuid()` mengikuti RFC 4122 strict dan bisa menolak UUID yang sebenarnya valid dari API
  - **Implementasi**: Menggunakan `.refine()` dengan regex pattern (bukan `z.uuid()`)
  - **Error Message**: `t("validation.invalid_uuid")` → "Invalid employee selection"
- **Fields**: Asset name, code, category, borrow date, borrow condition, notes, return date, return condition
- **Conditional Validation**: Return fields hanya required untuk action return

### Response Example

**GET /hrd/employee-assets/:id** (Detail):

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "employee_id": "550e8400-e29b-41d4-a716-446655440000",
    "asset_name": "MacBook Pro 16\" M3 Max",
    "asset_code": "LAP-001",
    "asset_category": "Laptop",
    "borrow_date": "2024-01-15",
    "return_date": "2024-06-15",
    "borrow_condition": "NEW",
    "return_condition": "GOOD",
    "notes": "For development work\n---\nReturn Notes: All accessories returned",
    "status": "RETURNED",
    "days_borrowed": 152,
    "employee": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "employee_code": "EMP001",
      "name": "John Doe"
    },
    "created_at": "2024-01-15T10:30:45+07:00",
    "updated_at": "2024-06-15T14:20:30+07:00"
  },
  "meta": null,
  "timestamp": "2024-06-20T15:30:45+07:00",
  "request_id": "req_abc123"
}
```

**GET /hrd/employee-assets** (List with Pagination):

```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "employee_id": "550e8400-e29b-41d4-a716-446655440000",
      "asset_name": "iPhone 15 Pro",
      "asset_code": "PHN-042",
      "asset_category": "Mobile Phone",
      "borrow_date": "2024-06-01",
      "return_date": null,
      "borrow_condition": "NEW",
      "return_condition": null,
      "status": "BORROWED",
      "days_borrowed": 19,
      "employee": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "employee_code": "EMP001",
        "name": "John Doe"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 45,
      "total_pages": 3,
      "has_next": true,
      "has_prev": false
    }
  },
  "timestamp": "2024-06-20T15:30:45+07:00",
  "request_id": "req_abc124"
}
```

## Manual Testing

### Scenario 1: Peminjaman Aset (Happy Path)

1. Login sebagai HRD admin
2. Navigate ke `/hrd/employee-assets`
3. Click "Add Employee Asset" / "Borrow Asset"
4. Isi form:
   - Employee: Select "John Doe (EMP001)"
   - Asset Name: "MacBook Pro 16\""
   - Asset Code: "LAP-001"
   - Asset Category: "Laptop"
   - Borrow Date: "2024-06-01"
   - Borrow Condition: "NEW"
   - Notes: "For development work"
5. Submit → should show success toast
6. Verify asset muncul di list dengan status "BORROWED"
7. Verify `days_borrowed` terisi otomatis

### Scenario 2: Return Aset (Happy Path)

1. Dari list, click action "Return" pada aset borrowed
2. Isi form return:
   - Return Date: "2024-06-20"
   - Return Condition: "GOOD"
   - Notes: "All accessories returned"
3. Submit → success toast
4. Verify status berubah jadi "RETURNED"
5. Verify return_date dan return_condition terisi
6. Verify `days_borrowed` updated (19 days)
7. Verify notes merged dengan separator "---\nReturn Notes:"

### Scenario 3: Duplicate Asset Code (Borrowed) - Should Fail

1. Borrow asset dengan code "LAP-001" (already borrowed di Scenario 1)
2. Fill form dengan data valid, tapi asset_code = "LAP-001"
3. Submit → should return 400 Bad Request
4. Error message: "Asset code already exists and is currently borrowed"

### Scenario 4: Asset Code Reuse After Return - Should Success

1. Return asset "LAP-001" (from Scenario 1)
2. Create new borrow dengan asset code "LAP-001" lagi
3. Submit → **should success** (reuse allowed after return)
4. Verify new record created dengan asset_code yang sama

### Scenario 5: Update Returned Asset - Should Fail

1. Try to update asset yang sudah returned (dari Scenario 2)
2. PUT `/hrd/employee-assets/:id` dengan body:
   ```json
   { "asset_name": "Updated Name" }
   ```
3. Should return 400 Bad Request
4. Error: "Cannot update asset that has been returned"

### Scenario 6: Return Date Before Borrow Date - Should Fail

1. Click "Return" pada borrowed asset
2. Isi return_date = "2024-05-01" (before borrow_date "2024-06-01")
3. Submit → 400 Bad Request
4. Error: "Return date must be after borrow date"

### Scenario 7: Search & Filter

1. Test search dengan query "MacBook" → should show matching assets
2. Test filter status = "BORROWED" → only show unreturned assets
3. Test filter status = "RETURNED" → only show returned assets
4. Test filter employee_id → show assets for specific employee

### Scenario 8: Dashboard Query (GET /borrowed)

1. Call GET `/hrd/employee-assets/borrowed`
2. Verify response only contains borrowed assets (return_date IS NULL)
3. Verify ordering by borrow_date ASC (oldest first = most urgent)
4. Use case: Dashboard widget "Long Borrowed Assets"

### Scenario 9: Asset Code Click to View Detail

1. Navigate ke `/hrd/employee-assets`
2. Klik langsung pada cell **Asset Code** (mis. "LAP-001") di tabel
3. Verify modal detail terbuka tanpa perlu buka dropdown action
4. Verify judul modal menampilkan `{asset_code} - {asset_name}`
5. Verify tidak ada overflow horizontal di modal

### Scenario 10: Employee Selection Validation

1. Buka form Borrow Asset atau Edit Asset
2. Pilih employee dari dropdown (format: "EMP-001 - John Doe")
3. Verify nilai yang tersimpan adalah UUID employee (bukan label string)
4. Submit form → verify success tanpa error "Invalid employee selection"
5. Buka form lagi untuk edit, verify employee select menampilkan employee yang benar
6. **Catatan Validasi UUID**: Schema menggunakan regex UUID permisif (bukan `z.uuid()` strict) untuk menerima UUID valid dari API
   - Pattern: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`

### Scenario 11: Modal Overflow Prevention

1. Buka form Borrow Asset pada layar dengan viewport kecil (mobile/tablet)
2. Verify modal bisa discroll vertikal jika konten panjang
3. Verify tidak ada overflow horizontal (tidak ada horizontal scrollbar)
4. Buka modal Detail Asset dengan data panjang
5. Verify konten tetap dalam viewport dan bisa discroll

## Automated Testing

### Unit Tests

**File**: `apps/api/internal/hrd/domain/usecase/employee_asset_usecase_test.go`

**Test Cases**:

- `TestCreate_Success` - Valid borrow asset creation
- `TestCreate_EmployeeNotFound` - Employee doesn't exist
- `TestCreate_DuplicateAssetCode_Borrowed` - Asset code already borrowed
- `TestCreate_DuplicateAssetCode_Returned_Success` - Reuse after return (should pass)
- `TestUpdate_Success` - Update unreturned asset
- `TestUpdate_ReturnedAsset_Fail` - Cannot update returned asset
- `TestReturnAsset_Success` - Valid asset return
- `TestReturnAsset_AlreadyReturned_Fail` - Cannot return twice
- `TestReturnAsset_DateBeforeBorrow_Fail` - Invalid return date
- `TestGetAll_FilterByStatus` - Status filtering works
- `TestGetBorrowed_OnlyUnreturned` - Borrowed endpoint correct

**Run Tests**:

```bash
cd apps/api
go test ./internal/hrd/domain/usecase -v -run TestEmployeeAsset
```

### Integration Tests

**File**: `apps/api/test/hrd/employee_asset_integration_test.go`

**Test Flow**:

1. Setup: Create test employee, create test database
2. Test POST /employee-assets (create borrowed asset)
3. Test GET /employee-assets (list with pagination)
4. Test GET /employee-assets/:id (detail)
5. Test GET /employee-assets/borrowed (dashboard query)
6. Test PUT /employee-assets/:id (update)
7. Test POST /employee-assets/:id/return (return asset)
8. Test PUT /employee-assets/:id after return (should fail)
9. Cleanup: Delete test data

**Run Integration Tests**:

```bash
cd apps/api
go test ./test/hrd -v -run TestEmployeeAssetIntegration
```

### Postman Collection

**File**: `docs/postman/postman.json`

**Endpoints Documented**:

- All 9 endpoints dengan request examples
- Success response examples
- Error response examples (400, 404, 500)
- Query params examples untuk list endpoint
- Auth token setup in collection variables

**Import & Run**:

```bash
# Import collection
# Set environment variables: BASE_URL, AUTH_TOKEN
# Run entire "HRD > Employee Assets" folder
```

## Dependencies

### Backend

- **GORM**: ORM untuk database operations
- **Gin**: HTTP framework untuk routing dan handlers
- **PostgreSQL**: Database dengan pg_trgm extension untuk GIN indexes
- **uuid**: UUID generation untuk ID field

### Frontend

- **TanStack Query**: Data fetching dan caching
- **React Hook Form**: Form state management dengan controlled components
- **Zod**: Form validation schemas (termasuk UUID validation untuk employee_id)
- **date-fns**: Date calculations dan formatting
- **next-intl**: Internationalization dengan format `{days}` (bukan `{{days}}`)
- **shadcn/ui**: Dialog, Select, Table, Badge components

### Integration

- **Employee Module** (`organization.Employee`): Reference untuk employee data
  - Used in: Validation (employee existence), N+1 prevention (batch fetch employees)
  - Dependency: `EmployeeRepository.FindByID()`, `FindByIDs()`

## Related Links

- **Sprint Planning**: `docs/erp-sprint-planning.md` - Sprint 14 checklist
- **Database Relations**: `docs/erp-database-relations.mmd` - HRD ERD section
- **API Standards**: `docs/api-standart/README.md` - Response format, error codes
- **Migration Guidelines**: `docs/MIGRATION_GUIDELINES.md` - Database model registration

## Notes & Improvements

### Recent Changes (Latest Update)

#### UI/UX Improvements (February 2025)

1. **Layout Standardization**: Mengikuti pola Employee Contracts
   - Header tanpa tombol di samping, menggunakan blok `space-y-2`
   - Filter bar dalam satu baris: search + employee filter + status filter + flex-1 + Borrow Asset button
   - Search dan filter reset pagination ke halaman 1

2. **Interactive Asset Code**: Cell Asset Code bisa diklik untuk buka detail modal langsung
   - Styling: `font-medium text-primary hover:underline cursor-pointer`
   - Behavior sama dengan Contract Number di halaman contracts

3. **Modal Overflow Fix**: Menambahkan constraint pada DialogContent
   - `max-h-[90vh] overflow-y-auto overflow-x-hidden` mencegah overflow viewport
   - Detail modal menggunakan `min-w-0` pada konten untuk mencegah horizontal expansion

4. **Employee Select Validation Fix**: Mengatasi issue nilai label masuk ke form
   - Select terkontrol dengan `value` + `onValueChange` (bukan `defaultValue`)
   - `useWatch` + `useEffect` untuk normalisasi label → UUID
   - Default value selalu string: `String(asset?.employee_id ?? "")`
   - SelectItem menggunakan `value={String(emp.id)}`

5. **UUID Validation Fix**: Menyelaraskan validasi `employee_id` dengan employee-contracts
   - **Masalah**: `z.string().uuid()` (RFC 4122 strict) menolak UUID valid dari API
   - **Solusi**: Gunakan regex UUID yang permisif: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
   - **Implementasi**: `.refine()` dengan regex di schema (bukan `z.uuid()`)
   - **Pesan error**: Tetap pakai `t("validation.invalid_uuid")` → "Invalid employee selection"

6. **i18n Fix - Detail Days**: Format placeholder diubah dari `{{days}}` ke `{days}`
   - Mengikuti format next-intl untuk proper variable interpolation
   - Key: `employeeAssets.detail.daysTotal`

7. **i18n Fix - Validation Max Length**: Format placeholder diubah dari `{{max}}` ke `{max}`
   - Penyebab error: next-intl memakai satu kurung kurawal untuk interpolasi
   - Dengan `{{max}}`, next-intl menganggap format tidak valid dan memunculkan `MALFORMED_ARGUMENT`
   - **en.ts**: `"Maximum {{max}} characters"` → `"Maximum {max} characters"`
   - **id.ts**: `"Maksimal {{max}} karakter"` → `"Maksimal {max} karakter"`
   - Pemanggilan `t("validation.max_length", { max: 255 })` sekarang berfungsi dengan benar

### Known Limitations

- **No fractional days support**: DaysBorrowed dalam integer, tidak support half-day atau hour precision
- **No asset quantity tracking**: Jika 1 asset code untuk multiple units (e.g., 10 iPhone 15), harus create separate records dengan code berbeda (LAP-001-A, LAP-001-B)
- **No asset maintenance history**: Status kondisi hanya tracked saat borrow dan return, tidak ada intermediate history

### Future Improvements

**1. Asset Transfer Feature**

- Allow transfer aset antar karyawan tanpa return
- API: `POST /employee-assets/:id/transfer { "new_employee_id": "..." }`
- Use case: Karyawan pindah divisi, aset ikut pindah

**2. Asset Maintenance Log**

- Track kondisi aset secara berkala (e.g., monthly check)
- New table: `asset_maintenance_logs` with foreign key ke `employee_assets`
- Dashboard: Maintenance schedule alert

**3. Asset Categories Management**

- Currently asset_category free text → risk of typos dan inconsistency
- Improvement: Create `asset_categories` master table dengan predefined categories
- Add API: GET `/hrd/asset-categories` for dropdown

**4. Reminder/Alert System**

- Email reminder untuk aset yang dipinjam >90 days
- Background job: Daily check borrowed assets, send email ke employee + HRD

**5. Asset QR Code**

- Generate QR code untuk setiap aset
- Mobile app: Scan QR code untuk quick borrow/return
- Reduces manual entry errors

**6. Reporting & Analytics**

- Dashboard: Total assets borrowed vs returned
- Chart: Asset borrow trends per month
- Report: Most frequently borrowed assets
- Report: Assets with frequent damage (condition downgrade)

**7. Bulk Return**

- Allow HRD to return multiple assets at once (e.g., saat karyawan resign)
- API: `POST /employee-assets/bulk-return` dengan array of asset IDs

### Performance Notes

- **GIN Indexes**: Search performance excellent untuk prefix queries (`text%`)
- **N+1 Prevention**: Batch employee fetch keeps GetAll response time <100ms for 100 records
- **Cache Consideration**: For dashboard query (GET /borrowed), consider caching with 5-minute TTL if frequently accessed
- **Pagination**: Enforced max 100 per_page to prevent memory issues

### Code Quality

- **Test Coverage**: Target 80% for usecase layer (business logic)
- **Error Handling**: All errors properly wrapped with context messages
- **Logging**: Consider adding structured logging untuk audit trail (who borrowed, who returned, when)
- **Validation**: Comprehensive validation di DTO layer dengan Gin binding tags
