# Leave Request Management

Fitur untuk mengelola pengajuan cuti karyawan dengan approval workflow yang komprehensif. Memungkinkan karyawan mengajukan cuti, HRD/manager melakukan approval/rejection, dan sistem mengelola kuota cuti secara otomatis.

## Fitur Utama

- Pengajuan cuti dengan pilihan jenis cuti (annual leave, sick leave, maternity, dll)
- Approval workflow dengan multiple states (pending → approved/rejected/cancelled)
- Kalkulasi sisa kuota cuti otomatis berdasarkan jenis cuti
- Validasi overlap untuk mencegah double booking
- Kalkulasi working days (exclude weekends dan holidays) untuk MULTI_DAY
- Support duration types: HALF_DAY (0.5 hari), FULL_DAY (1 hari), MULTI_DAY (multi hari)
- Row-level locking untuk prevent race conditions saat approval
- Carry-over cuti maksimal 5 hari sampai 31 Maret tahun berikutnya
- IDOR protection: karyawan hanya bisa akses data cuti sendiri
- Form data endpoint untuk dropdown selection (employees dan leave types)

## Business Rules

### 1. Leave Balance Calculation
- **Leave balance = TotalLeaveQuota - UsedLeave**
- Hanya leave types dengan `IsCutAnnualLeave = true` yang memotong kuota annual
- Sick leave tidak memotong kuota annual (`IsCutAnnualLeave = false`)
- Cuti tidak bisa diajukan jika sisa kuota < jumlah hari yang diminta

### 2. Validation Rules
- Pengajuan cuti harus diajukan minimal H-3 (kecuali emergency)
- Start date tidak boleh > end date
- Tidak boleh ada overlapping leave requests untuk employee yang sama
- Manager tidak bisa approve cuti dirinya sendiri (TODO: implement)
- Status PENDING atau REJECTED bisa di-edit/delete, status lainnya tidak

### 3. Duration Calculation
- **HALF_DAY**: 0.5 hari
- **FULL_DAY**: 1 hari
- **MULTI_DAY**: Dihitung working days (exclude weekends & holidays)
  - Weekend: Saturday & Sunday
  - Holidays: Fetched from `holidays` table dalam date range

### 4. Carry-Over Rules
- **Max carry-over**: 5 hari dari tahun sebelumnya
- **Expiry**: 31 Maret tahun berikutnya
- Cuti carry-over yang sudah expire tidak lagi ditambahkan ke balance
- TODO: Implement automatic carry-over calculation

### 5. Status State Machine
```
PENDING → APPROVED (by approver)
        → REJECTED (by approver)
        → CANCELLED (by employee)

REJECTED → PENDING (by re-submission after edit)

APPROVED → Cannot be changed (final state)
CANCELLED → Cannot be changed (final state)
```

### 6. IDOR Protection
- Employee hanya bisa create/update/delete leave request milik sendiri
- Employee hanya bisa view leave request milik sendiri
- Approver bisa view semua leave requests (TODO: implement permission check)

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/hrd/leave-requests/form-data` | Auth | Get dropdown data (employees, leave types) |
| POST | `/api/v1/hrd/leave-requests` | Auth | Submit new leave request |
| GET | `/api/v1/hrd/leave-requests` | Auth | List leave requests with filters |
| GET | `/api/v1/hrd/leave-requests/form-data` | Auth | Get data for form selection |
| GET | `/api/v1/hrd/leave-requests/:id` | leave.read | Get detailed leave request by ID |
| PUT | `/api/v1/hrd/leave-requests/:id` | Auth | Update leave request (only PENDING/REJECTED) |
| DELETE | `/api/v1/hrd/leave-requests/:id` | Auth | Delete leave request (soft delete) |
| GET | `/api/v1/hrd/leave-requests/balance/:employee_id` | Auth | Get employee leave balance |
| POST | `/api/v1/hrd/leave-requests/:id/approve` | leave.approve | Approve leave request |
| POST | `/api/v1/hrd/leave-requests/:id/reject` | leave.approve | Reject leave request |

## Request/Response Schemas

### 1. GET /form-data

**Response:**
```json
{
  "success": true,
  "data": {
    "employees": [
      {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com"
      }
    ],
    "leave_types": [
      {
        "id": "uuid",
        "name": "Annual Leave",
        "code": "AL",
        "max_days": 12
      }
    ]
  }
}
```

### 2. POST / (Create)

**Request Body:**
```json
{
  "employee_id": "uuid",
  "leave_type_id": "uuid",
  "start_date": "2024-01-15",
  "end_date": "2024-01-17",
  "duration": "MULTI_DAY",
  "note": "Family vacation"
}
```

**Response:** Returns detailed leave request (same as GET /:id)

### 3. GET / (List)

**Query Parameters:**
- `page` (int, default: 1)
- `per_page` (int, default: 20, max: 100)
- `employee_id` (string, optional) - Filter by employee
- `status` (string, optional) - PENDING, APPROVED, REJECTED, CANCELLED (case-insensitive)
- `start_date` (string, optional) - Format: YYYY-MM-DD
- `end_date` (string, optional) - Format: YYYY-MM-DD

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "employee_name": "John Doe",
      "leave_type": "Annual Leave",
      "start_date": "2024-01-15",
      "end_date": "2024-01-17",
      "duration": "MULTI_DAY",
      "total_days": 3.0,
      "status": "PENDING",
      "note": "Family vacation",
      "created_at": "2024-01-10T10:00:00+07:00",
      "updated_at": "2024-01-10T10:00:00+07:00"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 45,
      "total_pages": 3
    }
  }
}
```

### 4. GET /:id (Detail)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employee": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "08123456789",
      "employee_code": "EMP-001"
    },
    "leave_type": {
      "id": "uuid",
      "name": "Annual Leave",
      "code": "AL",
      "description": "Annual paid leave",
      "max_days": 12,
      "is_paid": true,
      "is_cut_annual_leave": true
    },
    "start_date": "2024-01-15",
    "end_date": "2024-01-17",
    "duration": "MULTI_DAY",
    "total_days": 3.0,
    "status": "APPROVED",
    "note": "Family vacation",
    "rejection_note": null,
    "approved_by": "uuid-approver",
    "approved_at": "2024-01-12T14:30:00+07:00",
    "is_carry_over": false,
    "remaining_carry_over": 0.0,
    "carry_over_expiry_date": null,
    "created_at": "2024-01-10T10:00:00+07:00",
    "updated_at": "2024-01-12T14:30:00+07:00",
    "created_by": "uuid-employee",
    "updated_by": "uuid-approver"
  }
}
```

### 5. PUT /:id (Update)

**Request Body:**
```json
{
  "leave_type_id": "uuid",
  "start_date": "2024-01-16",
  "end_date": "2024-01-18",
  "duration": "MULTI_DAY",
  "note": "Updated vacation dates"
}
```

**Response:** Returns detailed leave request (same as GET /:id)

**Validation:**
- Only PENDING or REJECTED status can be updated
- Only owner can update their own leave request
- Recalculates total_days if dates or duration changed
- Revalidates balance if leave type changed

### 6. DELETE /:id (Soft Delete)

**Response:**
```json
{
  "success": true,
  "data": null
}
```

### 7. GET /balance/:employee_id

**Response:**
```json
{
  "success": true,
  "data": {
    "employee_id": "uuid",
    "total_leave_quota": 12,
    "used_leave": 5,
    "pending_leave": 2,
    "remaining_balance": 5,
    "carry_over_balance": 3.0,
    "carry_over_expiry_date": "2024-03-31"
  }
}
```

**Balance Calculation:**
- `remaining_balance = total_leave_quota - used_leave`
- `used_leave` = sum of APPROVED leave requests with `IsCutAnnualLeave = true`
- `pending_leave` = sum of PENDING leave requests
- `carry_over_balance` = carry-over dari tahun sebelumnya (max 5 days)

### 8. POST /:id/approve

**Request Body:**
```json
{
  "approved_by": "uuid-approver"  // optional, defaults to current user
}
```

**Response:** Returns detailed leave request (same as GET /:id)

**Business Logic:**
- Only PENDING status can be approved
- Uses row-level locking (FOR UPDATE) to prevent race conditions
- Revalidates balance before approval (balance might have changed)
- Sets `approved_at` timestamp
- TODO: Trigger email notification to employee

### 9. POST /:id/reject

**Request Body:**
```json
{
  "rejection_note": "Reason for rejection",
  "rejected_by": "uuid-rejecter"  // optional, defaults to current user
}
```

**Response:** Returns detailed leave request (same as GET /:id)

**Validation:**
- Only PENDING status can be rejected
- `rejection_note` is required
- TODO: Trigger email notification to employee

## Struktur Folder

### Backend
```
internal/hrd/
├── data/
│   ├── models/
│   │   ├── leave_request.go           # GORM entity
│   │   └── holiday.go                 # Holiday calendar
│   └── repositories/
│       ├── leave_request_repository.go
│       └── holiday_repository.go
├── domain/
│   ├── dto/
│   │   └── leave_request_dto.go       # Request/Response DTOs
│   ├── mapper/
│   │   └── leave_request_mapper.go    # Model ↔ DTO conversion
│   └── usecase/
│       └── leave_request_usecase.go   # Business logic
└── presentation/
    ├── handler/
    │   └── leave_request_handler.go   # HTTP handlers
    └── router/
        └── leave_request_router.go    # Route registration
```

### Frontend
```
apps/web/src/features/hrd/leave-request/
├── types/
│   └── index.d.ts                     # TypeScript interfaces
├── schemas/
│   └── leave-request.schema.ts        # Zod validation schemas
├── services/
│   └── leave-request-service.ts       # API client calls
├── hooks/
│   └── use-leave-requests.ts          # TanStack Query hooks
├── components/
│   ├── leave-request-list.tsx         # All-in-one list with table
│   ├── leave-request-form.tsx         # Form with caching
│   └── leave-request-detail-modal.tsx # Detail modal with tabs
├── i18n/
│   ├── en.ts                          # English translations
│   └── id.ts                          # Indonesian translations
└── app/[locale]/(dashboard)/hrd/leave-requests/
    ├── page.tsx                       # Thin wrapper with PermissionGuard
    └── loading.tsx                    # Skeleton loader
```

## Keputusan Teknis

### 1. Mengapa menggunakan soft delete?
**Reason**: Untuk audit trail dan compliance. Leave requests adalah data HR yang sensitive dan harus bisa di-trace untuk audit purposes.
**Trade-off**: Slightly more complex queries (harus selalu filter `deleted_at IS NULL`), tapi GORM handles this automatically.

### 2. Mengapa tidak pakai state machine library?
**Reason**: Status flow relatif sederhana (4 states) dan business rules straightforward. State machine library akan overkill dan menambah complexity.
**Trade-off**: Manual validation di usecase layer, tapi lebih mudah dipahami dan di-maintain.

### 3. Mengapa row-level locking pada approval?
**Reason**: Prevent race condition saat concurrent approvals. Tanpa locking, bisa terjadi double-deduction of leave balance jika 2 approver approve request yang sama simultaneously.
**Trade-off**: Slightly slower performance (acquire lock), tapi critical untuk data integrity.

### 4. Mengapa batch fetching employees dan leave types di List endpoint?
**Reason**: Prevent N+1 query problem. Tanpa batch fetching, akan ada 1 query per leave request untuk fetch employee dan leave type (sangat slow untuk list dengan banyak data).
**Trade-off**: Sedikit lebih complex code (extract IDs, batch fetch, create maps), tapi performance gain signifikan.

### 5. Mengapa split response DTO (list vs detail)?
**Reason**: 
- **List view**: Simplified response dengan employee_name dan leave_type strings (cukup untuk display di table)
- **Detail view**: Full nested objects untuk detail page (employee details, leave type details, all timestamps)
**Trade-off**: Lebih banyak DTOs dan mapper methods, tapi API response lebih optimized (list endpoint tidak transfer data yang tidak diperlukan).

### 6. Mengapa form-data endpoint terpisah?
**Reason**: Frontend needs dropdown data (active employees dan active leave types) untuk form selection. Lebih efficient daripada fetch full list dengan pagination.
**Trade-off**: Extra endpoint, tapi UX better (fast dropdown population) dan prevent unnecessary pagination handling.

## Cara Test Manual

### Backend API Testing

#### 1. Test Create Leave Request
1. Login sebagai employee
2. GET `/hrd/leave-requests/form-data` → get dropdown data
3. POST `/hrd/leave-requests` dengan body:
   ```json
   {
     "employee_id": "<your_employee_id>",
     "leave_type_id": "<annual_leave_id>",
     "start_date": "2024-02-01",
     "end_date": "2024-02-03",
     "duration": "MULTI_DAY",
     "note": "Test leave request"
   }
   ```
4. Should return 201 Created dengan detail leave request
5. Verify `total_days` = 3 (working days calculation)

#### 2. Test List dengan Filter
1. GET `/hrd/leave-requests?status=PENDING&page=1&per_page=10`
2. Should return list dengan employee_name dan leave_type (no IDs)
3. Verify pagination meta correct

#### 3. Test Get Detail
1. GET `/hrd/leave-requests/:id` (dari create step)
2. Should return full details dengan nested employee dan leave_type objects
3. Verify employee details complete (name, email, phone, employee_code)

#### 4. Test Update
1. PUT `/hrd/leave-requests/:id` dengan body:
   ```json
   {
     "start_date": "2024-02-02",
     "end_date": "2024-02-04",
     "note": "Updated dates"
   }
   ```
2. Should return updated detail
3. Verify `total_days` recalculated

#### 5. Test Balance Calculation
1. GET `/hrd/leave-requests/balance/:employee_id`
2. Should return balance summary
3. Verify `remaining_balance = total_quota - used_leave`

#### 6. Test Approval Workflow
1. Logout, login sebagai manager/approver
2. GET `/hrd/leave-requests?status=PENDING` → list pending requests
3. POST `/hrd/leave-requests/:id/approve` dengan body `{}`
4. Should return approved detail
5. Verify `approved_at` timestamp populated
6. GET balance again → verify `used_leave` increased

#### 7. Test Overlap Prevention
1. Login sebagai employee
2. Create leave request for Feb 5-7
3. Try create another leave request for Feb 6-8
4. Should return error `OVERLAPPING_LEAVE_REQUEST`

#### 8. Test IDOR Protection
1. Login sebagai employee A
2. Try GET `/hrd/leave-requests/:id` dari employee B
3. Should return error `FORBIDDEN`

### Frontend UI Testing

#### 1. Test List Page Load
1. Navigate to `/hrd/leave-requests`
2. Should show loading skeleton briefly
3. Should display table with columns: Employee, Leave Type, Start Date, End Date, Days, Status, Actions
4. Verify clickable employee name (text-primary with hover underline)
5. Verify status badges:
   - Pending: Yellow (warning variant)
   - Approved: Green (success variant)
   - Rejected: Red (destructive variant)
   - Cancelled: Gray (secondary variant)

#### 2. Test Search & Filters
1. Type in search box (debounced 500ms) → should filter by employee name or reason
2. Select status filter dropdown → should update results
3. Clear search → should show all results
4. Pagination should update based on filters

#### 3. Test Create Leave Request
1. Click "Add Leave Request" button
2. Form dialog should open with fields:
   - **Employee** (select dropdown with name & email) - only visible in create mode
   - **Leave Type** (select dropdown)
   - **Duration** (select: Full Day, Half Day, Multiple Days) - default: Full Day
   - **Start Date** (date picker)
   - **End Date** (date picker)
   - **Reason** (textarea, min 10 chars, max 500 chars)
3. Test duration auto-adjustment:
   - Select different dates → duration should auto-switch to "Multiple Days"
   - Select same date → duration should stay "Full Day" or "Half Day"
4. Test days calculation:
   - **Half Day**: Should show "0.5 days"
   - **Full Day** (same date): Should show "1 day"
   - **Multiple Days**: Should show actual range (e.g., "3 days")
5. Test validation:
   - Try "Full Day" with different dates → should show error "Date range does not match selected duration"
   - Try "Multiple Days" with same date → should show error
   - Try reason < 10 chars → should show "Reason must be at least 10 characters"
6. Fill valid data → click Submit → should show success toast → dialog closes → list refreshes
7. Verify form caching: Close dialog mid-filling → reopen → previous values should be restored from localStorage

#### 4. Test Edit Leave Request
1. Click "Edit" action button (only available for PENDING/REJECTED status)
2. Form should open with pre-filled values
3. Employee field should NOT be visible in edit mode
4. Update dates and duration → verify auto-adjustment still works
5. Submit → should show success toast → list refreshes with updated data
6. Try edit APPROVED leave request → Edit button should be disabled/hidden

#### 5. Test View Detail Modal
1. Click employee name or "View" action button
2. Modal should open showing:
   - Employee details (name, email, phone, employee code)
   - Leave type details (name, code, description)
   - Date range and duration
   - Total days calculated
   - Reason
   - Status badge
   - Approval info (if approved): Approver name, approval date
   - Rejection info (if rejected): Rejection reason, rejection date
   - Timestamps: Created At, Updated At
3. Close modal → should return to list

#### 6. Test Approve/Reject Workflow
1. Login as manager/approver
2. Navigate to leave requests list
3. Click "Approve" button on PENDING request
4. Confirmation dialog should open
5. Optional notes field available
6. Click Confirm → should show success toast → status badge changes to green "Approved"
7. Click "Reject" button on another PENDING request
8. Rejection dialog should open
9. Rejection reason field (required, min 10 chars)
10. Submit → should show success toast → status badge changes to red "Rejected"
11. Verify optimistic update: Status changes immediately, then reverts if API fails

#### 7. Test Delete Confirmation
1. Click "Delete" action button (only for PENDING/REJECTED)
2. Confirmation dialog should open with warning text
3. Click Cancel → nothing happens
4. Click Delete → should show success toast → item removed from list
5. Try delete APPROVED request → Delete button should be disabled/hidden

#### 8. Test Pagination
1. Verify pagination controls at bottom of table
2. Click "Next" → should load page 2
3. Click "Previous" → should go back to page 1
4. Select per_page dropdown → change to 50 → should show more items
5. Max per_page should be 100 (enforced by backend)

#### 9. Test Loading & Error States
1. Open DevTools Network tab → throttle to "Slow 3G"
2. Navigate to leave requests → should show skeleton loaders
3. Mock 500 error in API → should show error message with retry button
4. Mock empty data → should show "No data available" message

#### 10. Test Form Caching (Create Mode)
1. Click "Add Leave Request"
2. Fill employee, leave type, dates, partial reason
3. Close dialog WITHOUT submitting
4. Reopen dialog → all fields should be restored from localStorage
5. Submit successfully → cache should be cleared
6. Reopen → should show empty form

#### 11. Test Internationalization (i18n)
1. Switch language to Indonesian (ID) via language switcher
2. All labels, placeholders, messages should display in Indonesian
3. Switch back to English (EN) → should display in English
4. Verify translations for:
   - Form labels (Employee, Duration, etc.)
   - Duration options (Full Day → Hari Penuh, Half Day → Setengah Hari)
   - Error messages
   - Success toasts
   - Status badges

#### 12. Test Responsive Design
1. Resize browser to mobile width (375px)
2. Table should be horizontally scrollable
3. Dialogs should fit mobile screen
4. Form fields should stack vertically
5. Buttons should be touch-friendly (44px min height)

#### 13. Test Edge Cases
1. **Concurrent Edit**: Open same leave request in 2 tabs → edit in both → last one wins (no conflict resolution yet)
2. **Stale Data**: List page open → someone approves a request in another session → refresh to see updates
3. **Network Timeout**: Slow network → should show loading state, not freeze
4. **Invalid Dates**: Try set end_date before start_date → should prevent via Calendar disabled prop

## Automated Testing

### Unit Tests
- **Location**: `apps/api/internal/hrd/domain/usecase/leave_request_usecase_test.go`
- **Coverage**: 
  - Balance calculation logic
  - Working days calculation (exclude weekends & holidays)
  - Overlap validation
  - State transition validation
- **Run**: `cd apps/api && go test ./internal/hrd/domain/usecase/...`

### Integration Tests
- **Location**: `apps/api/test/hrd/leave_request_integration_test.go`
- **Coverage**:
  - Full CRUD flow dengan database
  - Approval workflow
  - Concurrent approval (row-level locking test)
- **Run**: `cd apps/api && go test ./test/hrd/...`

### E2E Tests
- **Location**: `apps/web/tests/e2e/hrd/leave-request.spec.ts`
- **Coverage**:
  - Submit leave request dari frontend
  - Approval workflow dari frontend
  - Balance display
- **Run**: `cd apps/web && pnpm test:e2e hrd`

## Dependencies

### Backend
- **GORM**: Models dan query builder
- **Gin**: HTTP routing dan middleware
- **PostgreSQL**: Database (port 5434 in Docker)
- **Redis** (planned): Cache leave balance untuk performance

### Frontend
- **Next.js 16**: App Router dengan server components
- **TanStack Query v5**: Data fetching, caching, optimistic updates
- **React Hook Form**: Form state management
- **Zod**: Schema validation (client-side)
- **shadcn/ui**: UI components (Dialog, Select, Calendar, Badge, etc.)
- **next-intl**: Internationalization (EN/ID)
- **date-fns**: Date manipulation dan formatting
- **Sonner**: Toast notifications
- **Framer Motion**: Page transitions (PageMotion component)

### Integration
- **Employee Module**: Fetch employee data untuk validation dan display
- **Leave Type Module**: Fetch leave type configuration
- **Holiday Module**: Calendar untuk working days calculation
- **User Module**: Authentication dan user_id mapping

## Related Links

- Sprint Planning: `docs/erp-sprint-planning.md` (HRD section)
- Database Relations: `docs/erp-database-relations.mmd`
- API Standards: `docs/api-standart/README.md`
- Security Plan: `docs/TEMPLATE_SECURITY_PERFORMANCE_PLAN.md`

## Notes & Improvements

### Known Limitations

#### Backend
- Saat ini belum support fractional days (contoh: 1.5 days untuk half-day start/end)
- Approval permission check belum implemented (TODO: check if current user has approval permission)
- Email notification belum implemented (TODO: trigger notification on approval/rejection)
- Carry-over calculation masih manual (TODO: automatic carry-over calculation di awal tahun)

#### Frontend
- ✅ **Comprehensive detail modal** - COMPLETED (tabs with General + Timeline, sectioned info cards, action buttons, full nested data)
- ✅ **i18n translations for detail modal** - COMPLETED (all keys added for EN/ID locales)
- Concurrent edit conflict resolution belum implemented (last write wins)
- Real-time updates tidak ada (harus manual refresh untuk lihat perubahan dari user lain)
- Leave balance tidak ditampilkan di form (hanya di detail view)
- Attachment upload belum implemented (backend sudah support attachment_url)

### Future Improvements

#### Feature Enhancements
- **Delegation feature**: Assign substitute/backup person during leave
- **Bulk approval**: Approve multiple leave requests sekaligus untuk manager
- **Calendar view**: Visual calendar untuk leave schedule team
- **Report export**: Export leave history to Excel/PDF
- **Leave allocation**: Auto-allocate leave quota berdasarkan join date
- **Attachment upload**: Support attachment untuk sick leave (medical certificate)
- **Leave balance widget**: Show remaining balance in form before submission

#### Technical Improvements
- **Redis caching**: Cache leave balance dengan event-driven invalidation (saat ada approval)
- **WebSocket/SSE**: Real-time updates untuk concurrent editing detection
- **Notification system**: Email/push notification untuk approval/rejection
- **Mobile app**: Submit leave request dari mobile app
- **Conflict resolution**: Optimistic locking dengan version field
- **Offline support**: PWA dengan offline form submission queue

### Performance Considerations

#### Backend
- Leave balance calculation bisa di-cache di Redis dengan TTL 1 hour
- Consider denormalization: Store employee_name dan leave_type_name di leave_requests table untuk avoid joins
- Pagination default 20 items, max 100 untuk prevent memory issues
- Index sudah dibuat di: `employee_id`, `status`, `start_date`, `end_date` untuk optimize queries
- Batch fetching di List endpoint prevent N+1 queries

#### Frontend
- TanStack Query caching: 5 minutes stale time untuk list, 10 minutes untuk detail
- Optimistic updates untuk approve/reject (immediate UI feedback)
- Form caching di localStorage untuk prevent data loss (auto-save setiap field change)
- Query invalidation setelah mutations (create/update/delete)
- Debounced search (500ms) untuk reduce API calls
- Lazy loading dengan React.lazy() untuk code splitting

### Security Considerations
- **IDOR Protection**: Validated via employee.user_id == current_user_id
- **Row-level locking**: Prevent race conditions on concurrent approvals
- **Soft delete**: Preserve audit trail
- **Input validation**: All DTOs have binding tags for automatic validation (backend) + Zod validation (frontend)
- **CSRF protection**: Applied at middleware level (not endpoint-specific)
- **XSS protection**: React auto-escapes all text content, shadcn/ui components sanitized

