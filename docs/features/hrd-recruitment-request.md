# HRD - Recruitment Request Management

> **Module:** HRD (Human Resource Development)  
> **Sprint:** 15  
> **Version:** 1.0.0  
> **Status:** ✅ Complete (API) | ⏳ Pending (Frontend)  
> **Last Updated:** February 2026

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

---

## Business Rules

| Rule | Description |
|------|-------------|
| **Editability** | Hanya request berstatus DRAFT yang bisa di-edit atau di-hapus |
| **Salary Range** | Jika diisi, `salary_range_min` ≤ `salary_range_max` |
| **Required Count** | Minimal 1, wajib diisi |
| **Expected Start Date** | Harus ≥ request_date |
| **Status Transition** | Hanya transisi valid yang diperbolehkan (lihat Status Workflow) |
| **Filled Count** | Hanya bisa diupdate saat status OPEN, tidak boleh > RequiredCount |
| **Requester** | Otomatis diisi dari user yang login (via JWT user_id → employee) |
| **Approval** | Saat di-approve, `approved_by_id` dan `approved_at` otomatis terisi |
| **Rejection** | Saat di-reject, `rejected_by_id`, `rejected_at`, dan `rejection_notes` terisi |
| **Close** | Saat di-close, `closed_at` otomatis terisi |
| **Division & Position** | FK validation — divisi dan posisi harus exist dan aktif |
| **Soft Delete** | Request dihapus secara soft delete (preserve audit trail) |

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

---

## Data Model

### RecruitmentRequest Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Auto-generated UUID |
| request_code | varchar(50) | UNIQUE, NOT NULL | Auto-generated: RR-YYYYMM-XXXX |
| requested_by_id | uuid | FK → employees, NOT NULL | Requester employee |
| request_date | date | NOT NULL | Date of request |
| division_id | uuid | FK → divisions, NOT NULL | Target division |
| position_id | uuid | FK → job_positions, NOT NULL | Target position |
| required_count | int | NOT NULL, default 1 | Number of positions needed |
| filled_count | int | NOT NULL, default 0 | Number of positions filled |
| employment_type | varchar(20) | NOT NULL, default 'FULL_TIME' | FULL_TIME/PART_TIME/CONTRACT/INTERN |
| expected_start_date | date | NOT NULL | Expected start date |
| salary_range_min | decimal(15,2) | nullable | Minimum salary |
| salary_range_max | decimal(15,2) | nullable | Maximum salary |
| job_description | text | NOT NULL | Position description |
| qualifications | text | NOT NULL | Required qualifications |
| notes | text | nullable | Additional notes |
| priority | varchar(20) | NOT NULL, default 'MEDIUM' | LOW/MEDIUM/HIGH/URGENT |
| status | varchar(20) | NOT NULL, default 'DRAFT' | DRAFT/PENDING/APPROVED/REJECTED/OPEN/CLOSED/CANCELLED |
| approved_by_id | uuid | FK → employees, nullable | Approver employee |
| approved_at | timestamp | nullable | Approval timestamp |
| rejected_by_id | uuid | FK → employees, nullable | Rejector employee |
| rejected_at | timestamp | nullable | Rejection timestamp |
| rejection_notes | text | nullable | Rejection reason |
| closed_at | timestamp | nullable | Closing timestamp |
| created_at | timestamp | auto | Record creation |
| updated_at | timestamp | auto | Record update |
| deleted_at | timestamp | nullable, indexed | Soft delete |
| created_by | uuid | nullable | Audit: creator |
| updated_by | uuid | nullable | Audit: updater |

### Indexes

| Index | Type | Columns |
|-------|------|---------|
| idx_recruitment_requester | B-tree | requested_by_id |
| idx_recruitment_date | B-tree | request_date |
| idx_recruitment_division | B-tree | division_id |
| idx_recruitment_position | B-tree | position_id |
| idx_recruitment_priority | B-tree | priority |
| idx_recruitment_status | B-tree | status |
| idx_recruitment_requests_code_gin | GIN (pg_trgm) | request_code |
| idx_recruitment_requests_desc_gin | GIN (pg_trgm) | job_description |

---

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/hrd/recruitment-requests` | recruitment.read | List all recruitment requests (paginated, filterable) |
| GET | `/hrd/recruitment-requests/:id` | recruitment.read | Get recruitment request by ID |
| GET | `/hrd/recruitment-requests/form-data` | recruitment.read | Get form dropdown data (employees, divisions, positions, enums) |
| POST | `/hrd/recruitment-requests` | recruitment.create | Create new recruitment request |
| PUT | `/hrd/recruitment-requests/:id` | recruitment.update | Update recruitment request (DRAFT only) |
| DELETE | `/hrd/recruitment-requests/:id` | recruitment.delete | Soft delete recruitment request (DRAFT only) |
| POST | `/hrd/recruitment-requests/:id/status` | recruitment.update | Update status (approval workflow) |
| PUT | `/hrd/recruitment-requests/:id/filled-count` | recruitment.update | Update filled count (OPEN only) |

### Query Parameters (GET list)

| Parameter | Type | Description |
|-----------|------|-------------|
| page | int | Page number (default: 1) |
| per_page | int | Items per page (default: 20, max: 100) |
| search | string | Search by request_code, job_description, or requester name |
| status | string | Filter by status (DRAFT, PENDING, etc.) |
| division_id | string | Filter by division UUID |
| position_id | string | Filter by position UUID |
| priority | string | Filter by priority (LOW, MEDIUM, HIGH, URGENT) |

### Request Body Examples

**Create:**
```json
{
  "division_id": "uuid",
  "position_id": "uuid",
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

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| RECRUITMENT_REQUEST_NOT_FOUND | 404 | Request with given ID not found |
| RECRUITMENT_NOT_EDITABLE | 400 | Request is not in DRAFT status |
| RECRUITMENT_NOT_OPEN | 400 | Request is not in OPEN status (for filled count) |
| INVALID_SALARY_RANGE | 400 | Salary min > max |
| FILLED_EXCEEDS_REQUIRED | 400 | Filled count > required count |
| DIVISION_NOT_FOUND | 404 | Division ID does not exist |
| POSITION_NOT_FOUND | 404 | Position ID does not exist |
| INVALID_STATUS_TRANSITION | 400 | Invalid status transition |
| VALIDATION_ERROR | 400 | Request body validation failed |

---

## Status Workflow

```
┌─────────┐    submit    ┌─────────┐    approve   ┌──────────┐    open    ┌──────┐    close   ┌────────┐
│  DRAFT  │────────────→│ PENDING │────────────→│ APPROVED │────────→│ OPEN │────────→│ CLOSED │
└─────────┘              └─────────┘              └──────────┘          └──────┘          └────────┘
     │                        │
     │    cancel              │    reject
     ▼                        ▼
┌───────────┐          ┌──────────┐
│ CANCELLED │          │ REJECTED │
└───────────┘          └──────────┘
     ▲                        
     │    cancel              
     │                        
┌─────────┐
│ PENDING │ (also can be cancelled)
└─────────┘
```

**Valid Transitions:**
| From | To |
|------|-----|
| DRAFT | PENDING, CANCELLED |
| PENDING | APPROVED, REJECTED, CANCELLED |
| APPROVED | OPEN |
| OPEN | CLOSED |

---

## Keputusan Teknis

- **Mengapa status enum sebagai string, bukan integer**: Readability di database dan API response. Trade-off: slightly more storage, tapi sangat membantu debugging dan logging.

- **Mengapa request_code auto-generated di repository layer**: Memastikan format konsisten (RR-YYYYMM-XXXX) dan atomic counter per bulan. Trade-off: extra query untuk generate code.

- **Mengapa approval info (approved_by, rejected_by) di model yang sama**: RecruitmentRequest hanya punya satu approval step, jadi tidak perlu separate approval table. Trade-off: jika diibutuhkan multi-level approval di masa depan, perlu refactor.

- **Mengapa enrichment via map-building pattern**: Batch-fetch related entities (employees, divisions, positions) dan build maps untuk O(1) lookup. Menghindari N+1 queries. Trade-off: extra memory untuk maps, tapi insignificant untuk jumlah data normal.

- **Mengapa filled_count diupdate via endpoint terpisah**: Tracking jumlah posisi terisi memerlukan validasi khusus (hanya saat OPEN, tidak boleh > required_count). Trade-off: extra endpoint, tapi lebih explicit.

- **Mengapa soft delete**: Untuk audit trail dan compliance (siapa yang mengajukan, kapan, kenapa di-reject). Trade-off: slightly more complex queries.

---

## Manual Testing

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
6. **Submit for Approval**: POST `/api/v1/hrd/recruitment-requests/:id/status` with `{"status": "PENDING"}`
7. **Approve**: POST `/api/v1/hrd/recruitment-requests/:id/status` with `{"status": "APPROVED"}`
   - Verify `approved_by_id` and `approved_at` terisi
8. **Open**: POST `/api/v1/hrd/recruitment-requests/:id/status` with `{"status": "OPEN"}`
9. **Update Filled Count**: PUT `/api/v1/hrd/recruitment-requests/:id/filled-count` with `{"filled_count": 1}`
   - Try filled_count > required_count → should get FILLED_EXCEEDS_REQUIRED error
10. **Close**: POST `/api/v1/hrd/recruitment-requests/:id/status` with `{"status": "CLOSED"}`
    - Verify `closed_at` terisi
11. **Delete**: DELETE `/api/v1/hrd/recruitment-requests/:id` (hanya DRAFT)
12. **Form Data**: GET `/api/v1/hrd/recruitment-requests/form-data`
    - Verify employees, divisions, positions, employment types, priorities, statuses

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
  
- **Integration**:
  - Employee module (untuk requester dan approver data)
  - Organization module (untuk Division dan JobPosition data)
  - Permission module (RBAC: recruitment.read/create/update/delete)

---

## Related Links

- Sprint Planning: `docs/erp-sprint-planning.md` — Sprint 15
- Database Relations: `docs/erp-database-relations.mmd`
- API Standards: `docs/api-standart/README.md`

---

## Notes & Improvements

- **Known Limitation**: Saat ini hanya single-level approval (satu approver). Belum support multi-level approval chain.
- **Future Improvement**:
  - Add attachment support (job description documents)
  - Add candidate tracking integration (link ke modul Candidate Management)
  - Multi-level approval workflow (Department Head → HR → Director)
  - Auto-close recruitment request when filled_count == required_count
  - Email notifications untuk status changes
  - Dashboard view dengan recruitment pipeline visualization
- **Performance**: GIN indexes sudah ditambahkan untuk text search pada request_code dan job_description. LEFT JOIN digunakan untuk search by requester name.
