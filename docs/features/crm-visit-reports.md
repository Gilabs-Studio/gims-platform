# CRM Visit Reports (Sprint 22)

Fitur untuk mengelola laporan kunjungan sales team (visit reports) yang terintegrasi dengan modul CRM.
Menggabungkan fitur ERP SalesVisit (interest survey, product tracking) dengan CRM VisitReport (approval workflow, GPS check-in/out, photos).

## Fitur Utama
- CRUD visit report dengan detail produk interest per kunjungan
- GPS check-in/check-out dengan JSONB location data
- Approval workflow: draft → submitted → approved/rejected
- Upload foto kunjungan (max 5 foto)
- Interest survey menggunakan question/option dari modul Sales
- Progress history tracking untuk semua perubahan status
- Form data endpoint untuk dropdown selection (customers, contacts, employees, deals, leads)
- Filtering & pagination: status, customer, employee, contact, deal, lead, outcome, date range

## Business Rules
- Visit report hanya bisa diedit/dihapus saat status `draft` atau `rejected`
- Report yang sudah `approved` bersifat immutable (tidak bisa dimodifikasi)
- Saat report `rejected`, status kembali ke `draft` jika diedit ulang
- Check-in hanya bisa dilakukan sekali per visit (tidak bisa double check-in)
- Check-out harus dilakukan setelah check-in
- Approval hanya bisa dilakukan pada status `submitted`
- Approver tidak bisa approve report miliknya sendiri (prevent self-approval)
- Rejection wajib menyertakan alasan (minimal 5 karakter)
- Maksimal 5 foto per visit report
- Interest level produk menggunakan skala 1-5
- Interest scoring dihitung dari survey answers (option scores)
- Visit code format: `VISIT-YYYYMM-XXXXX` (auto-generated)

## Keputusan Teknis
- **Mengapa menggabungkan ERP SalesVisit dan CRM VisitReport**: 
  Untuk menghindari duplikasi fitur dan memberikan pengalaman terpadu. ERP punya interest survey yang powerful, CRM punya approval workflow + GPS. Trade-off: model lebih kompleks, tapi pengalaman pengguna lebih baik.

- **Mengapa menggunakan JSONB untuk GPS location**:
  Flexibility tinggi untuk menyimpan latitude, longitude, accuracy dalam satu field. Trade-off: query GPS lebih kompleks, tapi data lebih fleksibel.

- **Mengapa reuse SalesVisitInterestQuestion/Option**:
  Interest survey sudah ada di modul Sales. Reuse FK reference daripada duplikasi tabel. Trade-off: tight coupling ke modul Sales, tapi menghindari data redundancy.

- **Mengapa approval workflow simple (draft/submitted/approved/rejected)**:
  Sesuai kebutuhan bisnis saat ini. State machine library overkill untuk 4 status. Trade-off: manual validation di usecase, tapi lebih sederhana dan mudah di-maintain.

## Struktur Folder
```
internal/crm/
├── data/
│   ├── models/
│   │   └── visit_report.go           # VisitReport, Detail, ProgressHistory, InterestAnswer
│   └── repositories/
│       └── visit_report_repository.go # Full GORM repository with scope filtering
├── domain/
│   ├── dto/
│   │   └── visit_report_dto.go        # Create/Update/List/Workflow DTOs + responses
│   ├── mapper/
│   │   └── visit_report_mapper.go     # Model → DTO mapping
│   └── usecase/
│       └── visit_report_usecase.go    # Business logic + approval workflow
└── presentation/
    ├── handler/
    │   └── visit_report_handler.go    # HTTP handlers
    ├── router/
    │   └── visit_report_router.go     # Route definitions
    └── routers.go                     # Domain wiring (updated)
```

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/crm/visits` | crm_visit.read | List visit reports with filters & pagination |
| GET | `/api/v1/crm/visits/form-data` | crm_visit.read | Get form data (customers, contacts, employees, etc.) |
| POST | `/api/v1/crm/visits` | crm_visit.create | Create a new visit report |
| GET | `/api/v1/crm/visits/:id` | crm_visit.read | Get visit report detail |
| PUT | `/api/v1/crm/visits/:id` | crm_visit.update | Update a visit report |
| DELETE | `/api/v1/crm/visits/:id` | crm_visit.delete | Delete a visit report (soft delete) |
| POST | `/api/v1/crm/visits/:id/check-in` | crm_visit.update | GPS check-in to visit |
| POST | `/api/v1/crm/visits/:id/check-out` | crm_visit.update | GPS check-out from visit |
| POST | `/api/v1/crm/visits/:id/submit` | crm_visit.update | Submit for approval |
| POST | `/api/v1/crm/visits/:id/approve` | crm_visit.approve | Approve visit report |
| POST | `/api/v1/crm/visits/:id/reject` | crm_visit.approve | Reject visit report |
| POST | `/api/v1/crm/visits/:id/photos` | crm_visit.update | Upload photo URLs |
| GET | `/api/v1/crm/visits/:id/history` | crm_visit.read | Get progress history |

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VISIT_NOT_FOUND | 404 | Visit report not found |
| VISIT_NOT_DRAFT | 422 | Can only modify draft/rejected reports |
| VISIT_ALREADY_CHECKED_IN | 409 | Already checked in |
| VISIT_NOT_CHECKED_IN | 422 | Must check in before check out |
| VISIT_CANNOT_APPROVE_OWN | 403 | Cannot approve own report |
| VISIT_REJECTION_REASON_REQUIRED | 422 | Rejection reason required |
| VISIT_MAX_PHOTOS_EXCEEDED | 422 | Max 5 photos per report |
| VISIT_NOT_SUBMITTED | 422 | Must be submitted before approval |
| VISIT_APPROVED_IMMUTABLE | 422 | Approved reports cannot be modified |

## Cara Test Manual
1. Login sebagai Sales Rep (SalesRep1)
2. Navigate ke CRM → Visit Reports
3. Klik "Create Visit Report"
4. Isi data: customer, contact, visit date, purpose
5. Tambah detail produk interest (pilih produk, interest level 1-5)
6. Submit → status berubah ke "draft"
7. Lakukan GPS Check-in → verifikasi location tersimpan
8. Lakukan GPS Check-out → isi result dan outcome
9. Klik Submit for Approval → status berubah ke "submitted"
10. Logout, login sebagai Manager
11. Open visit report → Approve → status berubah ke "approved"
12. Verifikasi report tidak bisa diedit lagi
13. Test rejection: submit report baru, reject dengan alasan
14. Verifikasi report kembali ke status editable

## Automated Testing
- **Unit Tests**: `apps/api/internal/crm/domain/usecase/visit_report_usecase_test.go` (TBD)
- **Integration Tests**: `apps/api/test/crm/visit_report_integration_test.go` (TBD)

**Run Tests**:
```bash
cd apps/api && go test ./internal/crm/...
```

## Dependencies
- **Backend**: GORM (models), Gin (HTTP), validator/v10 (validation)
- **Integration**: 
  - Customer module (customer data)
  - Organization module (employee data)
  - Geographic module (village hierarchy)
  - Product module (product data)
  - Sales module (interest survey questions/options)
  - CRM module (contacts, deals, leads)

## Database Tables
- `crm_visit_reports` — Main visit report entity
- `crm_visit_report_details` — Product interest per visit
- `crm_visit_report_progress_history` — Status change audit trail
- `crm_visit_report_interest_answers` — Survey answer per product detail

## Notes & Improvements
- **Known Limitation**: Photos disimpan sebagai URL (upload dilakukan melalui `/api/v1/upload/image`)
- **Future Improvement**:
  - Calendar view untuk schedule kunjungan
  - Route optimization untuk multiple visits per hari
  - Geofencing validation (check-in location vs customer address)
  - Analytics dashboard (visit frequency, conversion rate)
  - Offline mode untuk area tanpa signal
  - Bulk approval untuk manager
