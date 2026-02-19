# HRD - Recruitment Request Management

> **Module:** HRD (Human Resource Development)  
> **Sprint:** 15  
> **Version:** 1.1.0  
> **Status:** ✅ Complete (API + Frontend)  
> **Last Updated:** February 2026
>
> **Recent Changes (v1.1.0):**
>
> - 🔧 Fixed UUID validation for Division & Position selection
> - 💰 Added Rupiah currency formatting for salary inputs
> - 📝 Enabled editing for REJECTED status (resubmit workflow)
> - 🚀 Added dedicated status action endpoints (submit, approve, reject, open, close, cancel)

---

## Table of Contents

1. [Overview](#overview)
2. [Fitur Utama](#fitur-utama)
3. [Business Rules](#business-rules)
4. [Struktur Folder](#struktur-folder)
5. [Data Model](#data-model)
6. [API Endpoints](#api-endpoints)
7. [Status Workflow](#status-workflow)
8. [Keputusan Teknis](#keputusan-teknis)
9. [Manual Testing](#manual-testing)
10. [Automated Testing](#automated-testing)
11. [Dependencies](#dependencies)
12. [Related Links](#related-links)
13. [Notes & Improvements](#notes--improvements)

---

## Overview

Fitur Recruitment Request Management memungkinkan perusahaan mengelola pengajuan permintaan rekrutmen karyawan baru. Setiap divisi dapat mengajukan kebutuhan posisi baru melalui request yang melewati approval workflow sebelum dibuka untuk proses rekrutmen.

**Business Value**: Standarisasi proses permintaan rekrutmen, tracking status posisi terbuka, dan kontrol approval oleh management.

---

## Fitur Utama

- **Pengajuan Rekrutmen** dengan detail posisi, divisi, jumlah kebutuhan, dan salary range
- **Approval Workflow**: DRAFT → PENDING → APPROVED → OPEN → CLOSED (juga REJECTED, CANCELLED)
- **Priority Levels**: LOW, MEDIUM, HIGH, URGENT
- **Employment Types**: FULL_TIME, PART_TIME, CONTRACT, INTERN
- **Auto-generated Request Code**: Format `RR-YYYYMM-XXXX`
- **Position Tracking**: RequiredCount - FilledCount = OpenPositions
- **Form Data Endpoint** untuk dropdown divisi, posisi, karyawan, dan enum options
- **Rupiah Currency Input** dengan auto-formatting untuk salary range (otomatis memformat angka seperti `20000` → `20.000`)
- **Resubmit Workflow**: REJECTED request dapat diperbaiki dan di-resubmit (kembali ke PENDING)
- **Dedicated Status Endpoints**: Endpoints spesifik untuk setiap status transition (submit, approve, reject, open, close, cancel)

---

## Business Rules

| Rule                    | Description                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Editability**         | Request berstatus DRAFT atau REJECTED bisa di-edit; REJECTED bisa diperbaiki dan di-resubmit (kembali ke PENDING) |
| **Salary Range**        | Jika diisi, `salary_range_min` ≤ `salary_range_max`                                                               |
| **Required Count**      | Minimal 1, wajib diisi                                                                                            |
| **Expected Start Date** | Harus ≥ request_date                                                                                              |
| **Status Transition**   | Hanya transisi valid yang diperbolehkan (lihat Status Workflow)                                                   |
| **Filled Count**        | Hanya bisa diupdate saat status OPEN, tidak boleh > RequiredCount                                                 |
| **Requester**           | Otomatis diisi dari user yang login (via JWT user_id → employee)                                                  |
| **Approval**            | Saat di-approve, `approved_by_id` dan `approved_at` otomatis terisi                                               |
| **Rejection**           | Saat di-reject, `rejected_by_id`, `rejected_at`, dan `rejection_notes` terisi                                     |
| **Close**               | Saat di-close, `closed_at` otomatis terisi                                                                        |
| **Division & Position** | FK validation — divisi dan posisi harus exist dan aktif                                                           |
| **Soft Delete**         | Request dihapus secara soft delete (preserve audit trail)                                                         |

---

## Struktur Folder

### Backend

```
apps/api/internal/hrd/
├── data/
│   ├── models/
│   │   └── recruitment_request.go        # GORM entity + status enums + domain methods
│   └── repositories/
│       ├── recruitment_request_repository.go       # Interface
│       └── recruitment_request_repository_impl.go  # GORM implementation
├── domain/
│   ├── dto/
│   │   └── recruitment_request_dto.go    # Create/Update/Status/FilledCount DTOs + Response + FormData
│   ├── mapper/
│   │   └── recruitment_request_mapper.go # Model ↔ DTO conversion + enrichment
│   └── usecase/
│       ├── recruitment_request_usecase.go      # Interface
│       └── recruitment_request_usecase_impl.go # Business logic implementation
└── presentation/
    ├── handler/
    │   └── recruitment_request_handler.go # HTTP handlers
    ├── router/
    │   └── recruitment_request_router.go  # Route definitions
    └── routers.go                         # Domain aggregator (registration)
```

### Seeder

```
apps/api/seeders/
└── recruitment_request_seeder.go  # 5 sample records with various statuses
```

### Frontend

#### Smart Components

1. **RecruitmentList** (`recruitment-list.tsx`)
   - Client component with search, filter, pagination
   - Status badge color coding (DRAFT=gray, PENDING=yellow, APPROVED=green, etc.)
   - Action menu per row (edit, submit/resubmit, approve, reject, open, close, delete)
   - Permission-based action visibility
   - Edit menu available for DRAFT and REJECTED status
   - Submit action for DRAFT status
   - Resubmit action for REJECTED status (kembali ke PENDING)
   - Loading skeleton state

2. **RecruitmentForm** (`recruitment-form.tsx`)
   - Dialog with 2 tabs: Basic Info + Requirements
   - Controlled inputs with react-hook-form + zod
   - Select dropdowns populated from form-data endpoint (UUID regex validation)
   - Date picker for expected_start_date
   - **RupiahInput component** untuk salary range dengan auto-formatting (e.g., 20000 → 20.000)
   - Salary range validation (min ≤ max)
   - Textareas with character count for description/qualifications/notes
   - On submit: optimistic update + success/error toast
   - Edit mode: pre-populate with existing data (available untuk DRAFT dan REJECTED)
   - Create mode: auto-select logged-in user as requester

3. **RecruitmentDetailModal** (`recruitment-detail-modal.tsx`)
   - Dialog with 3 tabs: General + Requirements + Workflow
   - Enriched data display (requester name, division name, position name)
   - Workflow tab: timeline-style status history (pending approval, rejection notes, etc.)
   - Permission-based edit/delete buttons
   - Status action buttons (submit, resubmit, approve, reject, open, close)
   - Submit/Resubmit buttons untuk DRAFT dan REJECTED status
   - Filled count editor (only when OPEN)

4. **RupiahInput** (`rupiah-input.tsx`)
   - Custom input component untuk currency formatting
   - Auto-format saat mengetik (mis. `20000` → `20.000`)
   - Value disimpan sebagai number (integer)
   - Dikirim ke API dalam bentuk number
   - Support untuk min/max salary range

---

## Data Model

### RecruitmentRequest Table

| Column              | Type          | Constraints                   | Description                                           |
| ------------------- | ------------- | ----------------------------- | ----------------------------------------------------- |
| id                  | uuid          | PK                            | Auto-generated UUID                                   |
| request_code        | varchar(50)   | UNIQUE, NOT NULL              | Auto-generated: RR-YYYYMM-XXXX                        |
| requested_by_id     | uuid          | FK → employees, NOT NULL      | Requester employee                                    |
| request_date        | date          | NOT NULL                      | Date of request                                       |
| division_id         | uuid          | FK → divisions, NOT NULL      | Target division                                       |
| position_id         | uuid          | FK → job_positions, NOT NULL  | Target position                                       |
| required_count      | int           | NOT NULL, default 1           | Number of positions needed                            |
| filled_count        | int           | NOT NULL, default 0           | Number of positions filled                            |
| employment_type     | varchar(20)   | NOT NULL, default 'FULL_TIME' | FULL_TIME/PART_TIME/CONTRACT/INTERN                   |
| expected_start_date | date          | NOT NULL                      | Expected start date                                   |
| salary_range_min    | decimal(15,2) | nullable                      | Minimum salary                                        |
| salary_range_max    | decimal(15,2) | nullable                      | Maximum salary                                        |
| job_description     | text          | NOT NULL                      | Position description                                  |
| qualifications      | text          | NOT NULL                      | Required qualifications                               |
| notes               | text          | nullable                      | Additional notes                                      |
| priority            | varchar(20)   | NOT NULL, default 'MEDIUM'    | LOW/MEDIUM/HIGH/URGENT                                |
| status              | varchar(20)   | NOT NULL, default 'DRAFT'     | DRAFT/PENDING/APPROVED/REJECTED/OPEN/CLOSED/CANCELLED |
| approved_by_id      | uuid          | FK → employees, nullable      | Approver employee                                     |
| approved_at         | timestamp     | nullable                      | Approval timestamp                                    |
| rejected_by_id      | uuid          | FK → employees, nullable      | Rejector employee                                     |
| rejected_at         | timestamp     | nullable                      | Rejection timestamp                                   |
| rejection_notes     | text          | nullable                      | Rejection reason                                      |
| closed_at           | timestamp     | nullable                      | Closing timestamp                                     |
| created_at          | timestamp     | auto                          | Record creation                                       |
| updated_at          | timestamp     | auto                          | Record update                                         |
| deleted_at          | timestamp     | nullable, indexed             | Soft delete                                           |
| created_by          | uuid          | nullable                      | Audit: creator                                        |
| updated_by          | uuid          | nullable                      | Audit: updater                                        |

### Indexes

| Index                             | Type          | Columns         |
| --------------------------------- | ------------- | --------------- |
| idx_recruitment_requester         | B-tree        | requested_by_id |
| idx_recruitment_date              | B-tree        | request_date    |
| idx_recruitment_division          | B-tree        | division_id     |
| idx_recruitment_position          | B-tree        | position_id     |
| idx_recruitment_priority          | B-tree        | priority        |
| idx_recruitment_status            | B-tree        | status          |
| idx_recruitment_requests_code_gin | GIN (pg_trgm) | request_code    |
| idx_recruitment_requests_desc_gin | GIN (pg_trgm) | job_description |

---

## API Endpoints

| Method | Endpoint                                     | Permission          | Description                                                     |
| ------ | -------------------------------------------- | ------------------- | --------------------------------------------------------------- |
| GET    | `/hrd/recruitment-requests`                  | recruitment.read    | List all recruitment requests (paginated, filterable)           |
| GET    | `/hrd/recruitment-requests/:id`              | recruitment.read    | Get recruitment request by ID                                   |
| GET    | `/hrd/recruitment-requests/form-data`        | recruitment.read    | Get form dropdown data (employees, divisions, positions, enums) |
| POST   | `/hrd/recruitment-requests`                  | recruitment.create  | Create new recruitment request                                  |
| PUT    | `/hrd/recruitment-requests/:id`              | recruitment.update  | Update recruitment request (DRAFT or REJECTED only)             |
| DELETE | `/hrd/recruitment-requests/:id`              | recruitment.delete  | Soft delete recruitment request (DRAFT only)                    |
| POST   | `/hrd/recruitment-requests/:id/status`       | recruitment.update  | Update status (approval workflow)                               |
| POST   | `/hrd/recruitment-requests/:id/submit`       | recruitment.update  | Submit for approval (DRAFT/REJECTED → PENDING)                  |
| POST   | `/hrd/recruitment-requests/:id/approve`      | recruitment.approve | Approve request (PENDING → APPROVED)                            |
| POST   | `/hrd/recruitment-requests/:id/reject`       | recruitment.approve | Reject request (PENDING → REJECTED), body: `{ notes?: string }` |
| POST   | `/hrd/recruitment-requests/:id/open`         | recruitment.update  | Open for hiring (APPROVED → OPEN)                               |
| POST   | `/hrd/recruitment-requests/:id/close`        | recruitment.update  | Close request (OPEN → CLOSED)                                   |
| POST   | `/hrd/recruitment-requests/:id/cancel`       | recruitment.update  | Cancel request (DRAFT/PENDING → CANCELLED)                      |
| PUT    | `/hrd/recruitment-requests/:id/filled-count` | recruitment.update  | Update filled count (OPEN only)                                 |

### Status Action Endpoints

Dedicated endpoints untuk status transitions dengan permission control yang lebih granular:

| Endpoint            | Transisi                  | Permission          | Body                 | Catatan                                             |
| ------------------- | ------------------------- | ------------------- | -------------------- | --------------------------------------------------- |
| `POST /:id/submit`  | DRAFT/REJECTED → PENDING  | recruitment.update  | -                    | Submit untuk approval (atau resubmit jika REJECTED) |
| `POST /:id/approve` | PENDING → APPROVED        | recruitment.approve | -                    | Approve oleh authorized approver                    |
| `POST /:id/reject`  | PENDING → REJECTED        | recruitment.approve | `{ notes?: string }` | Reject dengan optional notes                        |
| `POST /:id/open`    | APPROVED → OPEN           | recruitment.update  | -                    | Buka untuk proses rekrutmen                         |
| `POST /:id/close`   | OPEN → CLOSED             | recruitment.update  | -                    | Tutup recruitment                                   |
| `POST /:id/cancel`  | DRAFT/PENDING → CANCELLED | recruitment.update  | -                    | Batalkan request                                    |

**Catatan**:

- Endpoint `/status` tetap tersedia untuk transisi status yang lebih umum (backward compatible)
- **Frontend menggunakan dedicated endpoints** (submit, approve, reject, open, close, cancel) dengan service methods dan hooks yang terpisah untuk setiap action
- Dedicated endpoints memberikan clarity, granular permissions, dan better logging
- Lihat bagian [Frontend Implementation](#frontend-implementation) untuk detail implementasi hooks dan service layer

### Query Parameters (GET list)

| Parameter   | Type   | Description                                                |
| ----------- | ------ | ---------------------------------------------------------- |
| page        | int    | Page number (default: 1)                                   |
| per_page    | int    | Items per page (default: 20, max: 100)                     |
| search      | string | Search by request_code, job_description, or requester name |
| status      | string | Filter by status (DRAFT, PENDING, etc.)                    |
| division_id | string | Filter by division UUID                                    |
| position_id | string | Filter by position UUID                                    |
| priority    | string | Filter by priority (LOW, MEDIUM, HIGH, URGENT)             |

### Schema Validation Notes

**UUID Validation untuk Division & Position:**

- Field `division_id` dan `position_id` menggunakan regex UUID: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- Regex ini lebih permisif dibanding `z.string().uuid()` dan mengikuti pola di employee-contract

**Salary Range Format:**

- **Frontend**: Ditampilkan dengan format Rupiah (e.g., `15.000.000`) menggunakan component `RupiahInput`
- **Backend**: Disimpan sebagai number integer (e.g., `15000000`)
- Validasi: `salary_range_min` harus ≤ `salary_range_max`

### Request Body Examples

**Create:**

```json
{
  "division_id": "ae000001-0000-0000-0000-000000000001",
  "position_id": "ae000002-0000-0000-0000-000000000001",
  "required_count": 2,
  "employment_type": "FULL_TIME",
  "expected_start_date": "2026-04-01",
  "salary_range_min": 15000000,
  "salary_range_max": 25000000,
  "job_description": "Looking for experienced developer...",
  "qualifications": "- 3+ years experience\n- Bachelor's degree",
  "priority": "HIGH",
  "notes": "Urgent replacement for resigned employee"
}
```

**Update Status:**

```json
{
  "status": "APPROVED",
  "notes": "Approved by HR Director"
}
```

**Update Filled Count:**

```json
{
  "filled_count": 1
}
```

### Error Codes

| Error Code                    | HTTP Status | Description                                      |
| ----------------------------- | ----------- | ------------------------------------------------ |
| RECRUITMENT_REQUEST_NOT_FOUND | 404         | Request with given ID not found                  |
| RECRUITMENT_NOT_EDITABLE      | 400         | Request is not in DRAFT status                   |
| RECRUITMENT_NOT_OPEN          | 400         | Request is not in OPEN status (for filled count) |
| INVALID_SALARY_RANGE          | 400         | Salary min > max                                 |
| FILLED_EXCEEDS_REQUIRED       | 400         | Filled count > required count                    |
| DIVISION_NOT_FOUND            | 404         | Division ID does not exist                       |
| POSITION_NOT_FOUND            | 404         | Position ID does not exist                       |
| INVALID_STATUS_TRANSITION     | 400         | Invalid status transition                        |
| VALIDATION_ERROR              | 400         | Request body validation failed                   |

---

## Status Workflow

```
┌─────────┐    submit    ┌─────────┐    approve   ┌──────────┐    open    ┌──────┐    close   ┌────────┐
│  DRAFT  │────────────→│ PENDING │────────────→│ APPROVED │────────→│ OPEN │────────→│ CLOSED │
└─────────┘              └─────────┘              └──────────┘          └──────┘          └────────┘
     │                        │
     │    cancel              │    reject
     │                        ▼
     │                 ┌──────────┐
     │                 │ REJECTED │
     │                 └──────────┘
     │                      │
     │                      │    resubmit (edit → submit)
     │                      ▼
     │               ┌─────────┐
     └──────────────→│ PENDING │
                     └─────────┘
                          │
                          │    cancel
                          ▼
                    ┌───────────┐
                    │ CANCELLED │
                    └───────────┘
```

**Valid Transitions:**
| Dari | Ke | Endpoint | Notes |
| --------- | ------------------- | --------- | ------------------------------- |
| DRAFT | PENDING | `submit` | Submit untuk approval |
| DRAFT | CANCELLED | `cancel` | Batalkan draft |
| PENDING | APPROVED | `approve` | Approve oleh authorized user |
| PENDING | REJECTED | `reject` | Reject dengan optional notes |
| PENDING | CANCELLED | `cancel` | Batalkan pending request |
| APPROVED | OPEN | `open` | Buka untuk proses rekrutmen |
| OPEN | CLOSED | `close` | Tutup recruitment |
| REJECTED | PENDING | `submit` | Resubmit setelah perbaikan |

---

## Frontend Implementation

### Service Layer

**File**: `apps/web/src/features/hrd/recruitment/services/recruitment-service.ts`

Service layer provides methods untuk berinteraksi dengan API:

```typescript
export const RecruitmentService = {
  // CRUD operations
  getAll: (query: RecruitmentListQuery) =>
    apiClient.get("/hrd/recruitment-requests", { params: query }),

  getById: (id: string) => apiClient.get(`/hrd/recruitment-requests/${id}`),

  create: (data: CreateRecruitmentRequest) =>
    apiClient.post("/hrd/recruitment-requests", data),

  update: (id: string, data: UpdateRecruitmentRequest) =>
    apiClient.put(`/hrd/recruitment-requests/${id}`, data),

  delete: (id: string) => apiClient.delete(`/hrd/recruitment-requests/${id}`),

  // Status Action Endpoints (v1.1.0)
  submit: (id: string) =>
    apiClient.post(`/hrd/recruitment-requests/${id}/submit`),

  approve: (id: string) =>
    apiClient.post(`/hrd/recruitment-requests/${id}/approve`),

  reject: (id: string, notes?: string) =>
    apiClient.post(`/hrd/recruitment-requests/${id}/reject`, { notes }),

  open: (id: string) => apiClient.post(`/hrd/recruitment-requests/${id}/open`),

  close: (id: string) =>
    apiClient.post(`/hrd/recruitment-requests/${id}/close`),

  cancel: (id: string) =>
    apiClient.post(`/hrd/recruitment-requests/${id}/cancel`),

  // Legacy status endpoint (backward compatible)
  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient.post(`/hrd/recruitment-requests/${id}/status`, { status, notes }),

  // Other endpoints
  updateFilledCount: (id: string, filledCount: number) =>
    apiClient.put(`/hrd/recruitment-requests/${id}/filled-count`, {
      filled_count: filledCount,
    }),

  getFormData: () => apiClient.get("/hrd/recruitment-requests/form-data"),
};
```

### Hooks (React Query)

**File**: `apps/web/src/features/hrd/recruitment/hooks/use-recruitment.ts`

Hooks menggunakan TanStack Query untuk state management:

```typescript
// Query hooks
export function useRecruitments(query: RecruitmentListQuery);
export function useRecruitment(id: string | null);
export function useRecruitmentFormData();

// Mutation hooks - CRUD
export function useCreateRecruitment();
export function useUpdateRecruitment();
export function useDeleteRecruitment();

// Mutation hooks - Status Actions (v1.1.0)
export function useSubmitRecruitment();
export function useApproveRecruitment();
export function useRejectRecruitment();
export function useOpenRecruitment();
export function useCloseRecruitment();
export function useCancelRecruitment();

// Other mutations
export function useUpdateRecruitmentFilledCount();
```

**Status Action Hooks Implementation:**
Setiap status action hook menggunakan dedicated endpoint:

```typescript
export function useSubmitRecruitment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => RecruitmentService.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitments"] });
    },
  });
}

export function useRejectRecruitment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      RecruitmentService.reject(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitments"] });
    },
  });
}
```

### Component Implementation

#### RecruitmentList Component

**File**: `apps/web/src/features/hrd/recruitment/components/recruitment-list.tsx`

Menggunakan status action hooks untuk dropdown menu actions:

```typescript
export function RecruitmentList() {
  // Status action hooks
  const submitMutation = useSubmitRecruitment();
  const approveMutation = useApproveRecruitment();
  const rejectMutation = useRejectRecruitment();
  const openMutation = useOpenRecruitment();
  const closeMutation = useCloseRecruitment();
  const cancelMutation = useCancelRecruitment();

  // Handler untuk status actions
  const handleStatusAction = async (
    id: string,
    action: StatusAction,
    notes?: string,
  ) => {
    switch (action) {
      case "submit":
        await submitMutation.mutateAsync({ id });
        break;
      case "approve":
        await approveMutation.mutateAsync({ id });
        break;
      case "reject":
        await rejectMutation.mutateAsync({ id, notes });
        break;
      case "open":
        await openMutation.mutateAsync({ id });
        break;
      case "close":
        await closeMutation.mutateAsync({ id });
        break;
      case "cancel":
        await cancelMutation.mutateAsync({ id });
        break;
    }
  };

  // Dropdown menu dengan actions
  // - Edit: DRAFT, REJECTED
  // - Submit: DRAFT
  // - Resubmit: REJECTED
  // - Approve: PENDING
  // - Reject: PENDING
  // - Open: APPROVED
  // - Close: OPEN
  // - Cancel: DRAFT, PENDING
}
```

#### RecruitmentDetailModal Component

**File**: `apps/web/src/features/hrd/recruitment/components/recruitment-detail-modal.tsx`

Workflow tab menampilkan action buttons berdasarkan status:

```typescript
export function RecruitmentDetailModal({ request, ... }) {
  const submitMutation = useSubmitRecruitment();
  const approveMutation = useApproveRecruitment();
  const rejectMutation = useRejectRecruitment();
  const openMutation = useOpenRecruitment();
  const closeMutation = useCloseRecruitment();

  const handleStatusAction = async (action: StatusAction, notes?: string) => {
    // Similar implementation as RecruitmentList
  };

  // Workflow tab buttons:
  // Status DRAFT: [Submit] [Cancel]
  // Status REJECTED: [Resubmit]
  // Status PENDING: [Approve] [Reject]
  // Status APPROVED: [Open]
  // Status OPEN: [Close]
}
```

### i18n Translations

**File**: `apps/web/src/features/hrd/recruitment/i18n/en.ts` & `id.ts`

Status action translations:

```typescript
actions: {
  view: 'View',
  edit: 'Edit',
  delete: 'Delete',
  submit: 'Submit',
  resubmit: 'Resubmit',
  approve: 'Approve',
  reject: 'Reject',
  open: 'Open',
  close: 'Close',
  cancel: 'Cancel',
}
```

---

## Keputusan Teknis

- **Mengapa status enum sebagai string, bukan integer**: Readability di database dan API response. Trade-off: slightly more storage, tapi sangat membantu debugging dan logging.

- **Mengapa request_code auto-generated di repository layer**: Memastikan format konsisten (RR-YYYYMM-XXXX) dan atomic counter per bulan. Trade-off: extra query untuk generate code.

- **Mengapa approval info (approved_by, rejected_by) di model yang sama**: RecruitmentRequest hanya punya satu approval step, jadi tidak perlu separate approval table. Trade-off: jika diibutuhkan multi-level approval di masa depan, perlu refactor.

- **Mengapa enrichment via map-building pattern**: Batch-fetch related entities (employees, divisions, positions) dan build maps untuk O(1) lookup. Menghindari N+1 queries. Trade-off: extra memory untuk maps, tapi insignificant untuk jumlah data normal.

- **Mengapa filled_count diupdate via endpoint terpisah**: Tracking jumlah posisi terisi memerlukan validasi khusus (hanya saat OPEN, tidak boleh > required_count). Trade-off: extra endpoint, tapi lebih explicit.

- **Mengapa soft delete**: Untuk audit trail dan compliance (siapa yang mengajukan, kapan, kenapa di-reject). Trade-off: slightly more complex queries.

### Perubahan v1.1.0 (Latest)

- **UUID Regex untuk Division & Position**: Mengganti `z.string().uuid()` dengan regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` yang lebih permisif dan konsisten dengan pattern di employee-contract module.

- **RupiahInput Component**: Custom input component untuk auto-format currency Indonesia (e.g., 20000 → 20.000). Value tetap disimpan sebagai number di database dan API.

- **REJECTED Edit & Resubmit**: Request yang di-reject sekarang bisa di-edit dan di-resubmit (transisi REJECTED → PENDING) tanpa harus membuat request baru. Ini meningkatkan UX untuk workflow approval.

- **Dedicated Status Endpoints**: Menambah endpoints spesifik untuk setiap status action (submit, approve, reject, open, close, cancel) selain endpoint `/status` yang umum. Ini memberikan:
  - Clarity: Endpoint name jelas menunjukkan action
  - Granular permissions: Setiap endpoint bisa punya permission yang berbeda
  - Better logging: Tracking action spesifik lebih mudah

- **Frontend Implementation dengan Dedicated Hooks**: Frontend menggunakan service methods dan hooks yang terpisah untuk setiap status action (useSubmitRecruitment, useApproveRecruitment, dll) daripada generic useUpdateStatus. Ini memberikan:
  - Type safety: Setiap action punya signature yang jelas
  - Better error handling: Error spesifik per action
  - Loading states: UI bisa menunjukkan loading state spesifik untuk setiap action
  - Optimistic updates: Cache invalidation yang lebih granular

---

## Manual Testing

### Backend (API)

1. **Login** sebagai admin (admin@example.com / admin123)
2. **Create**: POST `/api/v1/hrd/recruitment-requests` dengan body lengkap
   - Verify response berisi auto-generated `request_code` (format RR-YYYYMM-XXXX)
   - Verify `status` = "DRAFT"
3. **List**: GET `/api/v1/hrd/recruitment-requests`
   - Verify pagination, search by request code, filter by status
4. **Get Detail**: GET `/api/v1/hrd/recruitment-requests/:id`
   - Verify embedded requester info, division name, position name
5. **Update**: PUT `/api/v1/hrd/recruitment-requests/:id` (hanya DRAFT)
   - Try update non-DRAFT → should get RECRUITMENT_NOT_EDITABLE error
6. **Submit for Approval** (dedicated endpoint): POST `/api/v1/hrd/recruitment-requests/:id/submit`
7. **Approve** (dedicated endpoint): POST `/api/v1/hrd/recruitment-requests/:id/approve`
   - Verify `approved_by_id` and `approved_at` terisi
8. **Reject** (dedicated endpoint): POST `/api/v1/hrd/recruitment-requests/:id/reject` with body `{ "notes": "Insufficient budget" }`
   - Verify `rejected_by_id`, `rejected_at`, dan `rejection_notes` terisi
9. **Resubmit** (dedicated endpoint): Edit REJECTED request, kemudian POST `/api/v1/hrd/recruitment-requests/:id/submit`
   - Verify status kembali ke PENDING
10. **Open** (dedicated endpoint): POST `/api/v1/hrd/recruitment-requests/:id/open`
11. **Update Filled Count**: PUT `/api/v1/hrd/recruitment-requests/:id/filled-count` with `{"filled_count": 1}`
    - Try filled_count > required_count → should get FILLED_EXCEEDS_REQUIRED error
12. **Close** (dedicated endpoint): POST `/api/v1/hrd/recruitment-requests/:id/close`
    - Verify `closed_at` terisi
    - Verify status menjadi CLOSED
13. **Resubmit REJECTED**:
    - Create request → Submit → Reject (dengan notes)
    - Edit REJECTED request (ubah beberapa field)
    - POST `/api/v1/hrd/recruitment-requests/:id/submit` untuk resubmit
    - Verify status kembali ke PENDING
14. **Delete**: DELETE `/api/v1/hrd/recruitment-requests/:id` (hanya DRAFT)
15. **Form Data**: GET `/api/v1/hrd/recruitment-requests/form-data`
    - Verify employees, divisions, positions, employment types, priorities, statuses

### Frontend (UI)

1. **Login** sebagai admin di `localhost:3000`
2. **Navigate** ke `/hrd/recruitment`
3. **Verify** list tampil dengan data dari seeder (5 records)
4. **Search** by request code → verify filter berfungsi
5. **Filter** by status dropdown → verify hanya record dengan status terpilih yang tampil
6. **Click request code** → verify detail modal terbuka dengan 3 tabs (General, Requirements, Workflow)
7. **Click "Add Request"** → verify form dialog terbuka dengan 2 tabs (Basic Info, Requirements)
8. **Fill form** → select division, position, isi required count, pilih employment type, pilih tanggal, isi job description dan qualifications
9. **Submit** → verify toast success, list ter-refresh dengan record baru
10. **Edit** DRAFT request → verify form pre-filled dengan data existing
11. **Submit for Approval** dari dropdown menu → verify status berubah ke PENDING
12. **Reject** PENDING request dengan notes → verify status berubah ke REJECTED
13. **Edit** REJECTED request → verify form pre-filled, lakukan perbaikan
14. **Resubmit** REJECTED request → verify status berubah ke PENDING (resubmit workflow)
15. **Approve** PENDING request → verify status berubah ke APPROVED
16. **Open** APPROVED request → verify status berubah ke OPEN
17. **Close** OPEN request → verify status berubah ke CLOSED
18. **Delete** DRAFT request → verify dialog konfirmasi, lalu record terhapus

### Testing RupiahInput Component

1. **Navigate** ke form Create/Edit
2. **Focus** pada salary input field
3. **Type** `20000` → verify auto-format menjadi `20.000`
4. **Type** `15000000` → verify auto-format menjadi `15.000.000`
5. **Blur** dari field → verify value tetap terformat
6. **Submit** form → verify API menerima number (bukan string terformat)
7. **Edit** existing request → verify salary display dengan format Rupiah

### Testing Status Action Endpoints (Frontend)

1. **Create** new request → status should be DRAFT
2. **Click Submit button** (dedicated endpoint) → verify:
   - POST request ke `/:id/submit` (bukan `/:id/status`)
   - No request body needed
   - Status berubah ke PENDING
   - Toast notification muncul
3. **As approver, click Reject button** → verify:
   - POST request ke `/:id/reject`
   - Modal muncul untuk input rejection notes
   - Notes dikirim dalam request body
   - Status berubah ke REJECTED
4. **Edit REJECTED request** → verify form editable
5. **Click Resubmit button** → verify:
   - POST request ke `/:id/submit` (reuse submit endpoint)
   - Status berubah ke PENDING
6. **Click Approve button** → verify:
   - POST request ke `/:id/approve`
   - Status berubah ke APPROVED
7. **Click Open button** → verify:
   - POST request ke `/:id/open`
   - Status berubah ke OPEN
8. **Click Close button** → verify:
   - POST request ke `/:id/close`
   - Status berubah ke CLOSED

### Testing Dedicated Hooks

1. **Open React DevTools** → Components tab
2. **Trigger status action** (e.g., Submit)
3. **Verify** component menggunakan hook spesifik (useSubmitRecruitment)
   - Bukan generic useUpdateStatus hook
4. **Verify** loading state spesifik untuk action tersebut
   - Component hanya re-render untuk action yang di-trigger
5. **Verify** error handling spesifik
   - Error message sesuai dengan action yang di-trigger

---

## Automated Testing

- **Unit Tests**: `apps/api/internal/hrd/domain/usecase/recruitment_request_usecase_test.go` (planned)
- **Integration Tests**: `apps/api/test/hrd/recruitment_integration_test.go` (planned)

**Run Tests:**

```bash
# Backend unit tests
cd apps/api && go test ./internal/hrd/...
```

---

## Dependencies

- **Backend**:
  - GORM (models, repository)
  - Gin (HTTP routing, binding validation)
  - PostgreSQL (storage, GIN indexes for text search)
  - Organization module (Division, JobPosition repositories)
  - Employee module (Employee repository for requester/approver lookup)
  - Core errors (centralized error code mapping)

- **Frontend**:
  - TanStack Query (data fetching, caching, optimistic updates)
  - Zod (form validation with i18n messages)
  - react-hook-form (form state management with zodResolver)
  - next-intl (internationalization — EN + ID)
  - shadcn/ui (UI components: Dialog, Table, Badge, Tabs, Select, Calendar, etc.)
  - date-fns (date formatting and parsing)
  - Sonner (toast notifications)
  - Lucide React (icons)
  - **Service Layer Pattern**: Dedicated service methods per API endpoint (RecruitmentService.submit, approve, reject, dll)
  - **Hook Pattern**: Dedicated mutation hooks per action (useSubmitRecruitment, useApproveRecruitment, dll)
- **Integration**:
  - Employee module (untuk requester dan approver data)
  - Organization module (untuk Division dan JobPosition data)
  - Permission module (RBAC: recruitment.read/create/update/delete/approve)

---

## Related Links

- Sprint Planning: `docs/erp-sprint-planning.md` — Sprint 15
- Database Relations: `docs/erp-database-relations.mmd`
- API Standards: `docs/api-standart/README.md`

---

## Notes & Improvements

- **Known Limitation**: Saat ini hanya single-level approval (satu approver). Belum support multi-level approval chain.
- **Recent Improvements (v1.1.0)**:
  - ✅ Fixed UUID validation bug untuk Division & Position selection
  - ✅ Added Rupiah currency formatting untuk salary inputs
  - ✅ Enabled editing untuk REJECTED status (resubmit workflow)
  - ✅ Added dedicated status action endpoints (submit, approve, reject, open, close, cancel)
  - ✅ Implemented dedicated service methods dan hooks untuk setiap status action (useSubmitRecruitment, useApproveRecruitment, dll)
  - ✅ Updated UI components untuk menggunakan dedicated action endpoints daripada generic status endpoint
- **Future Improvement**:
  - Add attachment support (job description documents)
  - Add candidate tracking integration (link ke modul Candidate Management)
  - Multi-level approval workflow (Department Head → HR → Director)
  - Auto-close recruitment request when filled_count == required_count
  - Email notifications untuk status changes
  - Dashboard view dengan recruitment pipeline visualization
- **Performance**: GIN indexes sudah ditambahkan untuk text search pada request_code dan job_description. LEFT JOIN digunakan untuk search by requester name.
