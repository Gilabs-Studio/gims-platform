# HRD - Recruitment Management

> **Module:** HRD (Human Resource Development)
> **Sprint:** 15-16
> **Version:** 2.1.0
> **Status:** ✅ Complete (API + Frontend — including Kanban Board Applicant Management)
> **Last Updated:** March 2026
>
> **Recent Changes (v2.1.0):**
>
> - 🎯 **NEW**: Applicant Management with Kanban Board (Pipeline stages: New → Screening → Interview → Offer → Hired/Rejected)
> - 🎯 **NEW**: Drag-and-drop applicant movement between stages
> - 🎯 **NEW**: Auto-updating filled count when applicants are hired
> - 🎯 **NEW**: Activity logging for all applicant actions
> - 🔧 Fixed bidirectional filled count updates (increment on hire, decrement when moving from hired)
> - 🔧 Removed terminal stage restriction — Hired/Rejected applicants can still be moved
> - 💰 Added Rupiah currency formatting for salary inputs
> - 📝 Enabled editing for REJECTED status (resubmit workflow)
> - 📎 **NEW**: File upload support for applicant resume/CV (PDF, DOC, DOCX)
> - 🔧 Fixed i18n translation keys for employment types (camelCase + UPPERCASE variants)
> - 🔧 Fixed resume URL handling to support both full URLs and file paths

---

## Table of Contents

1. [Overview](#overview)
2. [Fitur Utama](#fitur-utama)
3. [Business Rules](#business-rules)
4. [Struktur Folder](#struktur-folder)
5. [Data Model](#data-model)
6. [API Endpoints](#api-endpoints)
7. [Status Workflow](#status-workflow)
8. [Applicant Pipeline Workflow](#applicant-pipeline-workflow)
9. [Keputusan Teknis](#keputusan-teknis)
10. [Manual Testing](#manual-testing)
11. [Automated Testing](#automated-testing)
12. [Dependencies](#dependencies)
13. [Related Links](#related-links)
14. [Notes & Improvements](#notes--improvements)

---

## Overview

Fitur Recruitment Request Management memungkinkan perusahaan mengelola pengajuan permintaan rekrutmen karyawan baru. Setiap divisi dapat mengajukan kebutuhan posisi baru melalui request yang melewati approval workflow sebelum dibuka untuk proses rekrutmen.

**Business Value**: Standarisasi proses permintaan rekrutmen, tracking status posisi terbuka, kontrol approval oleh management, dan manajemen pelamar dengan Kanban board visual.

### Modules

| Module | Description |
|--------|-------------|
| **Recruitment Request** | Job requisitions with approval workflow (DRAFT → PENDING → APPROVED → OPEN → CLOSED) |
| **Applicant Management** | Kanban board for tracking candidates through hiring pipeline |
| **Activity Tracking** | Audit trail for all applicant actions and stage changes |

---

## Fitur Utama

### Recruitment Request

- **Pengajuan Rekrutmen** dengan detail posisi, divisi, jumlah kebutuhan, dan salary range
- **Approval Workflow**: DRAFT → PENDING → APPROVED → OPEN → CLOSED (juga REJECTED, CANCELLED)
- **Priority Levels**: LOW, MEDIUM, HIGH, URGENT
- **Employment Types**: FULL_TIME, PART_TIME, CONTRACT, INTERN
- **Auto-generated Request Code**: Format `RR-YYYYMM-XXXX`
- **Position Tracking**: RequiredCount - FilledCount = OpenPositions (auto-update via applicant hires)
- **Form Data Endpoint** untuk dropdown divisi, posisi, karyawan, dan enum options
- **Rupiah Currency Input** dengan auto-formatting untuk salary range (otomatis memformat angka seperti `20000` → `20.000`)

### Applicant Management (Kanban Board)

- **Visual Kanban Board**: Pipeline stages (New → Screening → Interview → Offer → Hired/Rejected)
- **Drag & Drop**: Move applicants between stages with optimistic updates
- **Progressive Loading**: Infinite scroll per stage for performance
- **Applicant Tracking**: Full name, email, phone, resume, source, rating, notes
- **Activity Logging**: Automatic audit trail for all actions
- **Bidirectional Filled Count**: Auto-increment when hiring, auto-decrement when moving from hired
- **File Upload**: Resume/CV upload with support for PDF, DOC, DOCX formats

---

## Business Rules

### Recruitment Request

| Rule                    | Description                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Editability**         | Request berstatus DRAFT atau REJECTED bisa di-edit; REJECTED bisa diperbaiki dan di-resubmit (kembali ke PENDING) |
| **Salary Range**        | Jika diisi, `salary_range_min` ≤ `salary_range_max`                                                               |
| **Required Count**      | Minimal 1, wajib diisi                                                                                            |
| **Expected Start Date** | Harus ≥ request_date                                                                                              |
| **Status Transition**   | Hanya transisi valid yang diperbolehkan (lihat Status Workflow)                                                   |
| **Filled Count**        | Otomatis terupdate saat applicant pindah ke/dari stage Hired; manual update via endpoint juga tersedia (OPEN only) |
| **Requester**           | Otomatis diisi dari user yang login (via JWT user_id → employee)                                                  |
| **Approval**            | Saat di-approve, `approved_by_id` dan `approved_at` otomatis terisi                                               |
| **Rejection**           | Saat di-reject, `rejected_by_id`, `rejected_at`, dan `rejection_notes` terisi                                     |
| **Close**               | Saat di-close, `closed_at` otomatis terisi                                                                        |
| **Division & Position** | FK validation — divisi dan posisi harus exist dan aktif                                                           |
| **Soft Delete**         | Request dihapus secara soft delete (preserve audit trail)                                                         |

### Applicant Management

| Rule                    | Description                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Stage Movement**      | Applicant bisa dipindah antar stage apa pun (tidak ada terminal stage lock)                                       |
| **Filled Count Update** | Saat pindah **ke** Hired: `filled_count`++ ; Saat pindah **dari** Hired: `filled_count`--                        |
| **Activity Logging**    | Setiap perpindahan stage tercatat di activity history                                                             |
| **Stage Requirements**  | Setiap recruitment request bisa memiliki multiple applicants di berbagai stage                                    |
| **Source Validation**   | Source applicant harus valid (linkedin, jobstreet, glints, referral, direct, other)                               |

---

## Struktur Folder

### Backend

```
apps/api/internal/hrd/
├── data/
│   ├── models/
│   │   ├── recruitment_request.go        # GORM entity + status enums + domain methods
│   │   ├── recruitment_applicant.go      # GORM entity for applicants
│   │   ├── applicant_stage.go            # Pipeline stage definitions
│   │   └── applicant_activity.go         # Activity log for applicants
│   └── repositories/
│       ├── recruitment_request_repository.go       # Interface
│       ├── recruitment_request_repository_impl.go  # GORM implementation
│       └── recruitment_applicant_repository.go     # Applicant repository
├── domain/
│   ├── dto/
│   │   ├── recruitment_request_dto.go    # Create/Update/Status/FilledCount DTOs
│   │   └── recruitment_applicant_dto.go  # Applicant DTOs
│   ├── mapper/
│   │   └── recruitment_request_mapper.go # Model ↔ DTO conversion + enrichment
│   └── usecase/
│       ├── recruitment_request_usecase.go       # Interface
│       ├── recruitment_request_usecase_impl.go  # Business logic
│       ├── recruitment_applicant_usecase.go     # Applicant usecase interface
│       └── recruitment_applicant_usecase_impl.go # Applicant business logic
└── presentation/
    ├── handler/
    │   ├── recruitment_request_handler.go  # HTTP handlers
│   │   └── recruitment_applicant_handler.go # Applicant HTTP handlers
    ├── router/
    │   ├── recruitment_request_router.go   # Route definitions
    │   └── recruitment_applicant_router.go # Applicant routes
    └── routers.go                          # Domain aggregator (registration)
```

### Seeder

```
apps/api/seeders/
├── recruitment_request_seeder.go      # 5 sample records with various statuses
├── recruitment_applicant_seeder.go    # Sample applicants for RR-202602-0002 & RR-202602-0003
└── seed_all.go                        # Calls SeedApplicantStages() and SeedRecruitmentApplicants()
```

**Seeded Applicants:**
- RR-202602-0002 (Junior Developer): 1 applicant in Screening stage
- RR-202602-0003 (Sales Representative): 2 applicants (1 in Interview, 1 in New)

### Frontend

```
apps/web/src/features/hrd/recruitment/
├── types/
│   └── index.d.ts                     # TypeScript interfaces (entity, params, API responses, form data)
├── schemas/
│   └── recruitment.schema.ts          # Zod schemas with i18n validation messages
├── services/
│   ├── recruitment-service.ts         # API client calls (CRUD + status actions + filled count + form data)
│   └── applicant-service.ts           # Applicant API client calls
├── hooks/
│   ├── use-recruitment.ts             # TanStack Query hooks for requests
│   └── use-applicants.ts              # TanStack Query hooks for applicants (Kanban, optimistic updates)
├── components/
│   ├── recruitment-list.tsx           # Smart list component (search, filter, table/card view, pagination)
│   ├── recruitment-card.tsx           # Card view for grid layout with progress indicator
│   ├── recruitment-overview.tsx       # Statistics cards
│   ├── recruitment-form.tsx           # Dialog form (2 tabs: basic info + requirements)
│   ├── recruitment-detail-page.tsx    # Detail page with Kanban board
│   ├── applicant-kanban-board.tsx     # Main Kanban board with DnD
│   ├── applicant-card.tsx             # Individual applicant card
│   ├── applicant-form.tsx             # Add/edit applicant dialog
│   ├── applicant-detail-sheet.tsx     # Applicant detail slide-out panel
│   └── rupiah-input.tsx               # Rupiah currency input with auto-formatting
└── i18n/
    ├── en.ts                          # English translations
    └── id.ts                          # Indonesian translations
```

### App Route

```
apps/web/app/[locale]/(dashboard)/hrd/
└── recruitment/
    ├── page.tsx                       # Recruitment list
    ├── loading.tsx                    # Skeleton loading
    └── [id]/
        └── page.tsx                   # Detail page with Kanban board
```

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
| filled_count        | int           | NOT NULL, default 0           | Number of positions filled (auto-updated via hires)   |
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

### RecruitmentApplicant Table

| Column                 | Type          | Constraints                   | Description                                           |
| ---------------------- | ------------- | ----------------------------- | ----------------------------------------------------- |
| id                     | uuid          | PK                            | Auto-generated UUID                                   |
| recruitment_request_id | uuid          | FK → recruitment_requests     | Linked recruitment request                            |
| stage_id               | uuid          | FK → applicant_stages         | Current pipeline stage                                |
| full_name              | varchar(255)  | NOT NULL                      | Candidate full name                                   |
| email                  | varchar(255)  | NOT NULL                      | Email address                                         |
| phone                  | varchar(20)   | nullable                      | Phone number                                          |
| resume_url             | varchar(500)  | nullable                      | CV/Resume file URL or file path (e.g., `/uploads/filename.pdf`) |
| source                 | varchar(50)   | NOT NULL                      | linkedin, jobstreet, glints, referral, direct, other  |
| applied_at             | timestamp     | NOT NULL                      | Application date                                      |
| last_activity_at       | timestamp     | NOT NULL                      | Last update timestamp                                 |
| rating                 | tinyint       | nullable                      | 1-5 star rating                                       |
| notes                  | text          | nullable                      | Internal notes                                        |
| created_at             | timestamp     | auto                          | Record creation                                       |
| updated_at             | timestamp     | auto                          | Record update                                         |
| deleted_at             | timestamp     | nullable, indexed             | Soft delete                                           |
| created_by             | uuid          | nullable                      | Who added the applicant                               |
| updated_by             | uuid          | nullable                      | Who last updated                                      |

### ApplicantStage Table

| Column     | Type          | Constraints           | Description                            |
| ---------- | ------------- | --------------------- | -------------------------------------- |
| id         | uuid          | PK                    | Auto-generated UUID                    |
| name       | varchar(100)  | NOT NULL              | Stage name (New, Screening, etc.)      |
| color      | varchar(7)    | NOT NULL              | Hex color for UI (#3b82f6, etc.)       |
| order      | int           | NOT NULL, default 0   | Display order                          |
| is_won     | bool          | NOT NULL, default false | Terminal success stage (Hired)       |
| is_lost    | bool          | NOT NULL, default false | Terminal failure stage (Rejected)    |
| is_active  | bool          | NOT NULL, default true | Whether stage is enabled               |
| created_at | timestamp     | auto                  | Record creation                        |
| updated_at | timestamp     | auto                  | Record update                          |

### ApplicantActivity Table

| Column      | Type          | Constraints               | Description                                       |
| ----------- | ------------- | ------------------------- | ------------------------------------------------- |
| id          | uuid          | PK                        | Auto-generated UUID                               |
| applicant_id| uuid          | FK → recruitment_applicants | Linked applicant                                |
| type        | varchar(50)   | NOT NULL                  | Activity type (created, stage_change, hired, etc.)|
| description | text          | NOT NULL                  | Human-readable description                        |
| metadata    | jsonb         | nullable                  | Additional data (from_stage, to_stage, etc.)      |
| created_at  | timestamp     | auto                      | When action occurred                              |
| created_by  | uuid          | nullable                  | Who performed the action                          |

### Indexes

| Index                               | Type          | Columns                  |
| ----------------------------------- | ------------- | ------------------------ |
| idx_recruitment_requester           | B-tree        | requested_by_id          |
| idx_recruitment_date                | B-tree        | request_date             |
| idx_recruitment_division            | B-tree        | division_id              |
| idx_recruitment_position            | B-tree        | position_id              |
| idx_recruitment_priority            | B-tree        | priority                 |
| idx_recruitment_status              | B-tree        | status                   |
| idx_recruitment_requests_code_gin   | GIN (pg_trgm) | request_code             |
| idx_recruitment_requests_desc_gin   | GIN (pg_trgm) | job_description          |
| idx_recruitment_applicants_request  | B-tree        | recruitment_request_id   |
| idx_recruitment_applicants_stage    | B-tree        | stage_id                 |
| idx_recruitment_applicants_name_gin | GIN (pg_trgm) | full_name                |
| idx_applicant_activities_applicant  | B-tree        | applicant_id             |

### Default Applicant Stages (Seeded)

```go
[
    {Name: "New",        Color: "#6b7280", Order: 0, IsWon: false, IsLost: false},
    {Name: "Screening",  Color: "#3b82f6", Order: 1, IsWon: false, IsLost: false},
    {Name: "Interview",  Color: "#f59e0b", Order: 2, IsWon: false, IsLost: false},
    {Name: "Offer",      Color: "#8b5cf6", Order: 3, IsWon: false, IsLost: false},
    {Name: "Hired",      Color: "#22c55e", Order: 4, IsWon: true,  IsLost: false},
    {Name: "Rejected",   Color: "#ef4444", Order: 5, IsWon: false, IsLost: true}
]
```

---

## API Endpoints

### Recruitment Request Endpoints

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
| PUT    | `/hrd/recruitment-requests/:id/filled-count` | recruitment.update  | Manual update filled count (OPEN only)                          |
| GET    | `/hrd/recruitment-requests/:id/applicants`   | recruitment.read    | Get applicants for this recruitment request                     |

### Recruitment Applicant Endpoints

| Method | Endpoint                                     | Permission          | Description                                                     |
| ------ | -------------------------------------------- | ------------------- | --------------------------------------------------------------- |
| GET    | `/hrd/applicants`                            | recruitment.read    | List applicants (paginated, searchable)                         |
| GET    | `/hrd/applicants/by-stage`                   | recruitment.read    | Get applicants grouped by stage (for Kanban board)              |
| GET    | `/hrd/applicants/:id`                        | recruitment.read    | Get applicant by ID                                             |
| POST   | `/hrd/applicants`                            | recruitment.create  | Create new applicant                                            |
| PUT    | `/hrd/applicants/:id`                        | recruitment.update  | Update applicant information                                    |
| DELETE | `/hrd/applicants/:id`                        | recruitment.delete  | Delete applicant                                                |
| POST   | `/hrd/applicants/:id/move-stage`             | recruitment.update  | Move applicant to different stage (auto-updates filled_count)   |
| GET    | `/hrd/applicants/:id/activities`             | recruitment.read    | Get applicant activity history                                  |
| POST   | `/hrd/applicants/:id/activities`             | recruitment.update  | Add manual activity entry                                       |
| GET    | `/hrd/applicant-stages`                      | recruitment.read    | Get all pipeline stages                                         |

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

**Create Applicant:**

```json
{
  "recruitment_request_id": "uuid",
  "stage_id": "uuid",
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+6281234567890",
  "source": "linkedin",
  "resume_url": "/uploads/resume_abc123.pdf",
  "notes": "Strong React experience"
}
```

**Notes:**
- `resume_url` can be a full URL (`https://...`) or a file path (`/uploads/...`)
- File upload is handled via `FileUpload` component which returns the file path
- Supported formats: PDF, DOC, DOCX
- Max file size: 10MB (configurable in upload handler)

### Error Codes

| Error Code                    | HTTP Status | Description                                      |
| ----------------------------- | ----------- | ------------------------------------------------ |
| RECRUITMENT_REQUEST_NOT_FOUND | 404         | Request with given ID not found                  |
| APPLICANT_NOT_FOUND           | 404         | Applicant with given ID not found                |
| STAGE_NOT_FOUND               | 404         | Stage with given ID not found                    |
| RECRUITMENT_NOT_EDITABLE      | 400         | Request is not in DRAFT status                   |
| RECRUITMENT_NOT_OPEN          | 400         | Request is not in OPEN status (for filled count) |
| INVALID_SALARY_RANGE          | 400         | Salary min > max                                 |
| FILLED_EXCEEDS_REQUIRED       | 400         | Filled count > required count                    |
| DIVISION_NOT_FOUND            | 404         | Division ID does not exist                       |
| POSITION_NOT_FOUND            | 404         | Position ID does not exist                       |
| INVALID_STATUS_TRANSITION     | 400         | Invalid status transition                        |
| INVALID_APPLICANT_SOURCE      | 400         | Source not in allowed list                       |
| VALIDATION_ERROR              | 400         | Request body validation failed                   |

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
| REJECTED | PENDING (resubmit) |

---

## Applicant Pipeline Workflow

The Kanban board tracks applicants through customizable pipeline stages.

### Default Pipeline Stages

```
┌─────────┐    ┌───────────┐    ┌───────────┐    ┌───────┐    ┌───────┐    ┌──────────┐
│   New   │───→│ Screening │───→│ Interview │───→│ Offer │───→│ Hired │    │ Rejected │
│  (gray) │    │  (blue)   │    │ (orange)  │    │(purple│    │(green)│    │   (red)  │
└─────────┘    └───────────┘    └───────────┘    └───────┘    └───┬───┘    └──────────┘
                                                                   │
                                                              IsWon=true

From any stage → Can move to any other stage (no terminal lock)
To Hired       → filled_count++
From Hired     → filled_count--
```

### Applicant Sources

| Source | Description |
|--------|-------------|
| `linkedin` | LinkedIn platform |
| `jobstreet` | JobStreet Indonesia |
| `glints` | Glints platform |
| `referral` | Employee referral |
| `direct` | Direct application |
| `other` | Other sources |

### Activity Types

| Type | Trigger |
|------|---------|
| `created` | Applicant added to system |
| `updated` | Information updated |
| `stage_change` | Moved to different stage |
| `rating_changed` | Rating modified |
| `hired` | Candidate hired |
| `rejected` | Candidate rejected |

---

## Keputusan Teknis

### Recruitment Request

- **Mengapa status enum sebagai string, bukan integer**: Readability di database dan API response. Trade-off: slightly more storage, tapi sangat membantu debugging dan logging.

- **Mengapa request_code auto-generated di repository layer**: Memastikan format konsisten (RR-YYYYMM-XXXX) dan atomic counter per bulan. Trade-off: extra query untuk generate code.

- **Mengapa approval info (approved_by, rejected_by) di model yang sama**: RecruitmentRequest hanya punya satu approval step, jadi tidak perlu separate approval table. Trade-off: jika diibutuhkan multi-level approval di masa depan, perlu refactor.

- **Mengapa enrichment via map-building pattern**: Batch-fetch related entities (employees, divisions, positions) dan build maps untuk O(1) lookup. Menghindari N+1 queries. Trade-off: extra memory untuk maps, tapi insignificant untuk jumlah data normal.

- **Mengapa soft delete**: Untuk audit trail dan compliance (siapa yang mengajukan, kapan, kenapa di-reject). Trade-off: slightly more complex queries.

### Applicant Management

- **Mengapa bidirectional filled_count update**: Saat applicant pindah ke Hired, filled_count bertambah. Saat pindah dari Hired ke stage lain, filled_count berkurang. Ini memastikan tracking posisi terisi selalu akurat meskipun ada perubahan keputusan hiring.

- **Mengapa tidak ada terminal stage lock**: Stage Hired/Rejected tidak lagi mengunci applicant. Ini memungkinkan koreksi jika ada kesalahan input atau perubahan keputusan hiring.

- **Mengapa optimistic updates untuk Kanban**: UI langsung update saat drag-and-drop, sementara API dipanggil di background. Jika gagal, UI rollback. Memberikan UX yang smooth tanpa loading spinner.

- **Mengapa progressive loading per stage**: Setiap kolom Kanban load data secara independen dengan pagination. Ini mencegah load time lambat saat ada banyak applicant di semua stage.

- **Mengapa activity logging terpisah**: Semua actions (create, update, stage_change) tercatat di tabel terpisah untuk audit trail lengkap tanpa membesarkan tabel applicant.

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

### Frontend (UI) — Recruitment Request

1. **Login** sebagai admin di `localhost:3000`
2. **Navigate** ke `/hrd/recruitment`
3. **Verify** list tampil dengan data dari seeder (5 records)
4. **Search** by request code → verify filter berfungsi
5. **Filter** by status dropdown → verify hanya record dengan status terpilih yang tampil
6. **Click card** → verify navigasi ke detail page `/hrd/recruitment/[id]`
7. **Click "Add Request"** → verify form dialog terbuka dengan 2 tabs (Basic Info, Requirements)
8. **Fill form** → select division, position, isi required count, pilih employment type, pilih tanggal, isi job description dan qualifications
9. **Submit** → verify toast success, list ter-refresh dengan record baru
10. **Edit** DRAFT request → verify form pre-filled dengan data existing
11. **Submit for Approval** dari dropdown menu → verify status berubah ke PENDING
12. **Approve** PENDING request → verify status berubah ke APPROVED
13. **Open** APPROVED request → verify status berubah ke OPEN
14. **Close** OPEN request → verify status berubah ke CLOSED
15. **Delete** DRAFT request → verify dialog konfirmasi, lalu record terhapus

### Frontend (UI) — Applicant Management

1. **Open** detail page recruitment request dengan status OPEN
2. **Verify** Kanban board tampil dengan 6 columns (New, Screening, Interview, Offer, Hired, Rejected)
3. **Click "Add Applicant"** button → verify form dialog terbuka
4. **Fill applicant form** (full_name, email, phone, source) → Submit
5. **Verify** applicant muncul di column "New" dengan animasi
6. **Drag applicant** dari New ke Screening → verify optimistic update (instant move)
7. **Refresh page** → verify applicant tetap di Screening (persisted)
8. **Click applicant card** → verify detail sheet terbuka dengan info lengkap
9. **Add note/rating** di detail sheet → verify tersimpan
10. **Drag applicant** ke Hired → verify:
    - Applicant pindah ke column Hired
    - Progress bar di header recruitment bertambah (filled_count++)
    - Open positions berkurang
11. **Drag applicant** dari Hired kembali ke Offer → verify:
    - Applicant pindah ke column Offer
    - Progress bar berkurang (filled_count--)
12. **Drag applicant** ke Rejected → verify activity log tercatat
13. **Verify** activity history di applicant detail sheet menampilkan semua perpindahan stage

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
  - File upload handler (for resume/CV uploads)

- **Frontend**:
  - TanStack Query (data fetching, caching, optimistic updates)
  - Zod (form validation with i18n messages)
  - react-hook-form (form state management with zodResolver)
  - next-intl (internationalization — EN + ID)
  - shadcn/ui (UI components: Dialog, Table, Badge, Tabs, Select, Calendar, etc.)
  - FileUpload component (custom component for file upload with drag-and-drop)
  - date-fns (date formatting and parsing)
  - Sonner (toast notifications)
  - Lucide React (icons)
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

- **Known Limitations**:
  - Single-level approval (satu approver). Belum support multi-level approval chain.
  - Belum ada email notifications untuk status changes
  - File upload tidak ada preview, hanya download link

- **Completed (v2.1.0)**:
  - ✅ Candidate tracking dengan Kanban board
  - ✅ Auto-update filled_count saat applicant hired/rejected
  - ✅ Bidirectional filled_count updates (increment on hire, decrement on un-hire)
  - ✅ Activity logging untuk semua applicant actions
  - ✅ Detail page dengan Kanban board integration
  - ✅ File upload untuk applicant resume/CV (PDF, DOC, DOCX)
  - ✅ Fixed i18n translation keys untuk employment types

- **Future Improvement**:
  - Multi-level approval workflow (Department Head → HR → Director)
  - Auto-close recruitment request when filled_count == required_count
  - Email notifications untuk status changes
  - Dashboard view dengan recruitment metrics
  - Integration dengan Employee module (auto-convert hired applicant to employee)

- **Performance**:
  - GIN indexes untuk text search pada request_code, job_description, applicant name/email
  - LEFT JOIN untuk search by requester name
  - Progressive loading (pagination per stage) untuk Kanban board
  - Optimistic updates untuk smooth drag-and-drop UX

### Internationalization (i18n)

**Employment Type Keys** (supports both formats):
```typescript
employmentType: {
  label: "Employment Type",
  // camelCase variants (for display)
  fullTime: "Full Time",
  partTime: "Part Time",
  contract: "Contract",
  intern: "Intern",
  // UPPERCASE variants (from backend enum: FULL_TIME, PART_TIME, CONTRACT, INTERN)
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERN: "Intern",
}
```

**Applicant Keys**:
```typescript
applicants: {
  title: "Applicants",
  notes: "Notes",  // Section header for applicant notes
  // ... other keys
}
```
