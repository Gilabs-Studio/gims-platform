# CRM Module

Modul Customer Relationship Management (CRM) mengelola siklus pra-penjualan dan aktivitas sales team — mencakup Lead Management, Deal Pipeline, Task & Schedule, Visit Reports, Area Mapping, Contacts, dan master data pendukung (Pipeline Stage, Lead Source, Lead Status, Contact Role, Activity Type).

## Fitur Utama

- **Leads**: Manajemen prospek dengan BANT qualification (Budget, Authority, Need, Timeline), konversi ke Deal, analytics, dan bulk upsert
- **Pipeline (Deals)**: Kanban pipeline deals dengan stage movement, forecasting, stock check, dan konversi ke Sales Quotation
- **Tasks**: Penugasan aktivitas sales dengan due date, assignee, reminders, dan workflow status
- **Schedules**: Kalender kunjungan dan aktivitas yang terhubung dengan Tasks
- **Visit Reports**: Laporan kunjungan dengan GPS check-in/out, foto, approval workflow, dan interest survey
- **Area Mapping**: Visualisasi lokasi customer & lead di peta, heatmap, coverage analysis, dan area capture
- **Sales Target**: Target penjualan tahunan per area/region (moved to CRM menu, managed by Sales backend)
- **Activities**: Timeline aktivitas CRM untuk tracking interaksi dengan lead, deal, dan customer
- **Contacts**: Manajemen kontak per customer dengan role assignment
- **CRM Settings**: Master data untuk pipeline stages, lead sources, lead statuses, contact roles, dan activity types
- **Lead Automation**: Integrasi n8n untuk trigger lead generation melalui backend API

## Business Rules

### Lead Workflow
- **Lead Status**: `new` → `contacted` / `qualified` / `unqualified` → `converted` (ke Deal)
- Lead dapat di-convert ke Deal hanya jika status memungkinkan (qualified/new)
- Saat convert, lead data (customer info, produk interest) dimigrasi ke Deal
- Lead yang sudah converted tidak bisa diedit lagi secara signifikan
- Approval workflow tidak berlaku untuk Lead; Lead menggunakan status lifecycle
- Bulk upsert leads dapat dilakukan untuk import massal

### Deal (Pipeline) Workflow
- **Deal Status**: `open` → `won` / `lost`
- Pipeline Stage merupakan sub-state dari deal (`qualification`, `proposal`, `negotiation`, `closed won`, `closed lost`, dll — configurable via master data)
- Deal harus berstatus `won` sebelum bisa di-convert ke Sales Quotation
- Setiap deal hanya bisa di-convert ke quotation **satu kali** (idempotent)
- Deal harus memiliki minimal satu product item dan customer sebelum konversi
- Stock check membandingkan `requested_quantity` vs `available_stock` di inventory batches
- Move stage dapat dilakukan kapan saja oleh user dengan permission `crm_deal.move_stage`
- Soft-delete dan restore item-level tersedia untuk deal items

### Task Workflow
- **Task Status**: `pending` → `in_progress` → `completed` / `cancelled`
- Task boleh di-assign ke employee lain
- Task dengan due date dan assignee akan otomatis membuat Schedule
- Reminders dapat diattach ke Task dengan custom message dan trigger time
- Task overdue akan muncul di dashboard dengan highlight

### Visit Report Workflow
- **Visit Report Status**: `draft` → `submitted` → `approved` / `rejected`
- Report yang sudah `approved` bersifat immutable
- Report yang `rejected` dapat diedit ulang dan kembali ke arah `submitted`
- Approval hanya bisa dilakukan pada status `submitted`
- Approver tidak boleh approve report miliknya sendiri
- Rejection wajib menyertakan alasan minimal 5 karakter
- Check-in hanya bisa sekali per visit; check-out harus setelah check-in
- Maksimal 5 foto per visit report
- Interest level produk menggunakan skala 1-5
- Visit code auto-generate format: `VISIT-YYYYMM-XXXXX`

### Area Mapping Rules
- GPS capture menyimpan latitude, longitude, dan accuracy
- Heatmap menampilkan density kunjungan per area
- Coverage analysis membandingkan jumlah customer/lead yang aktif vs total
- Map visualization menggabungkan data customer, lead, dan activity metrics

### Target Rules
- Yearly Targets ditampilkan dan dikelola dari menu CRM, namun backend-nya menggunakan domain Sales (`/api/v1/sales/yearly-targets`)
- Target dibuat per area untuk satu tahun fiskal
- Achievement summary menampilkan % pencapaian actual vs target

## Keputusan Teknis

- **Lead conversion merupakan copy-then-link, bukan move**: Data lead disalin ke deal, lalu lead ditandai `converted` dengan referensi ke deal. Trade-off: data history tetap ada, tapi memerlukan sinkronisasi jika deal berubah signifikan.
- **Deal → Quotation conversion menggunakan foreign key `source_deal_id` langsung di SalesQuotation**: Pola 1:1 sederhana, lebih efisien daripada join table. Trade-off: field nullable karena tidak semua quotation berasal dari deal.
- **Task otomatis membuat Schedule**: Decoupling task dan schedule melalui event listener/usecase call. Trade-off: task creation sedikit lebih lambat, tapi calendar view selalu sinkron.
- **Visit Report menggunakan JSONB untuk GPS location**: Flexibilitas menyimpan coordinate + metadata. Trade-off: query geospasial lebih kompleks, tapi schema tetap flat.
- **Approval workflow Visit Report diimplemen manual di usecase**: State machine library dianggap overkill untuk 4 status. Trade-off: validasi tersebar di usecase, tapi lebih readable.
- **Area Mapping memisahkan capture, heatmap, coverage, dan map visualization**: Setiap concern punya endpoint tersendiri untuk mengoptimalkan query. Trade-off: banyak API call saat load full dashboard, tapi setiap query dapat di-cache secara independen.
- **Lead Automation menggunakan n8n webhook melalui backend proxy**: Frontend tidak memanggil n8n langsung untuk alasan security. Trade-off: backend perlu maintain proxy endpoint.

## Struktur Folder

### Backend
```
apps/api/internal/crm/
├── data/
│   ├── models/
│   │   ├── lead.go
│   │   ├── deal.go
│   │   ├── task.go
│   │   ├── schedule.go
│   │   ├── reminder.go
│   │   ├── visit_report.go
│   │   ├── activity.go
│   │   ├── contact.go
│   │   ├── area_capture.go
│   │   ├── pipeline_stage.go
│   │   ├── lead_source.go
│   │   ├── lead_status.go
│   │   ├── contact_role.go
│   │   └── activity_type.go
│   └── repositories/
│       └── *_repository.go
├── domain/
│   ├── dto/
│   │   └── *_dto.go
│   ├── mapper/
│   │   └── *_mapper.go
│   └── usecase/
│       ├── lead_usecase.go
│       ├── deal_usecase.go
│       ├── task_usecase.go
│       ├── schedule_usecase.go
│       ├── visit_report_usecase.go
│       ├── activity_usecase.go
│       ├── contact_usecase.go
│       ├── area_capture_usecase.go
│       ├── area_mapping_usecase.go
│       ├── pipeline_stage_usecase.go
│       ├── lead_source_usecase.go
│       ├── lead_status_usecase.go
│       ├── contact_role_usecase.go
│       ├── activity_type_usecase.go
│       └── lead_automation_usecase.go
└── presentation/
    ├── handler/
    │   └── *_handler.go
    ├── router/
    │   └── *_router.go
    └── routers.go
```

### Frontend
```
apps/web/src/features/crm/
├── lead/                   # Lead CRUD + convert + analytics + bulk upsert
├── deal/                   # Deal pipeline + stage move + convert to quotation + stock check
├── task/                   # Task CRUD + assign + reminders + workflow
├── schedule/               # Schedule CRUD + calendar integration
├── visit-report/           # Visit report CRUD + check-in/out + approval + photos
├── activity/               # Activity timeline + my activities
├── contact/                # Contact CRUD per customer
├── area-mapping/           # Map visualization + heatmap + coverage + capture
├── targets/                # Sales target list (consume Sales backend API)
├── pipeline-stage/         # Master data CRUD
├── lead-source/            # Master data CRUD
├── lead-status/            # Master data CRUD
├── contact-role/           # Master data CRUD
├── activity-type/          # Master data CRUD
├── components/             # Shared CRM components
├── hooks/                  # Shared hooks
└── utils/                  # Shared utilities
```

## API Endpoints

### Leads
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/crm/leads` | `crm_lead.read` | List leads |
| GET | `/api/v1/crm/leads/form-data` | `crm_lead.read` | Form data dropdown |
| GET | `/api/v1/crm/leads/analytics` | `crm_lead.read` | Lead analytics |
| GET | `/api/v1/crm/leads/unprocessed` | `crm_lead.read` | Unprocessed leads |
| POST | `/api/v1/crm/leads` | `crm_lead.create` | Create lead |
| POST | `/api/v1/crm/leads/upsert` | `crm_lead.create` | Bulk upsert leads |
| GET | `/api/v1/crm/leads/:id` | `crm_lead.read` | Get lead detail |
| GET | `/api/v1/crm/leads/:id/product-items` | `crm_lead.read` | Lead product items |
| PUT | `/api/v1/crm/leads/:id` | `crm_lead.update` | Update lead |
| DELETE | `/api/v1/crm/leads/:id` | `crm_lead.delete` | Delete lead |
| POST | `/api/v1/crm/leads/:id/convert` | `crm_lead.convert` | Convert lead to deal |

### Deals (Pipeline)
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/crm/deals` | `crm_deal.read` | List deals |
| GET | `/api/v1/crm/deals/form-data` | `crm_deal.read` | Form data dropdown |
| GET | `/api/v1/crm/deals/by-stage` | `crm_deal.read` | Deals grouped by stage |
| GET | `/api/v1/crm/deals/summary` | `crm_deal.read` | Pipeline summary |
| GET | `/api/v1/crm/deals/forecast` | `crm_deal.read` | Forecast data |
| POST | `/api/v1/crm/deals` | `crm_deal.create` | Create deal |
| GET | `/api/v1/crm/deals/:id` | `crm_deal.read` | Get deal detail |
| PUT | `/api/v1/crm/deals/:id` | `crm_deal.update` | Update deal |
| DELETE | `/api/v1/crm/deals/:id` | `crm_deal.delete` | Delete deal |
| POST | `/api/v1/crm/deals/:id/move-stage` | `crm_deal.move_stage` | Move deal stage |
| GET | `/api/v1/crm/deals/:id/history` | `crm_deal.read` | Deal history |
| POST | `/api/v1/crm/deals/:id/convert-to-quotation` | `sales_quotation.create` | Convert to quotation |
| GET | `/api/v1/crm/deals/:id/stock-check` | `crm_deal.read` | Stock check |
| DELETE | `/api/v1/crm/deals/:id/items/:itemId` | `crm_deal.update` | Soft delete deal item |
| POST | `/api/v1/crm/deals/:id/items/:itemId/restore` | `crm_deal.update` | Restore deal item |

### Tasks
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/crm/tasks` | `crm_task.read` | List tasks |
| GET | `/api/v1/crm/tasks/form-data` | `crm_task.read` | Form data dropdown |
| POST | `/api/v1/crm/tasks` | `crm_task.create` | Create task |
| GET | `/api/v1/crm/tasks/:id` | `crm_task.read` | Get task detail |
| PUT | `/api/v1/crm/tasks/:id` | `crm_task.update` | Update task |
| DELETE | `/api/v1/crm/tasks/:id` | `crm_task.delete` | Delete task |
| POST | `/api/v1/crm/tasks/:id/assign` | `crm_task.assign` | Assign task |
| POST | `/api/v1/crm/tasks/:id/complete` | `crm_task.update` | Complete task |
| POST | `/api/v1/crm/tasks/:id/in-progress` | `crm_task.update` | Mark in progress |
| POST | `/api/v1/crm/tasks/:id/cancel` | `crm_task.update` | Cancel task |
| GET | `/api/v1/crm/tasks/:id/reminders` | `crm_task.read` | List reminders |
| POST | `/api/v1/crm/tasks/:id/reminders` | `crm_task.create` | Create reminder |
| GET | `/api/v1/crm/tasks/:id/reminders/:reminderID` | `crm_task.read` | Get reminder |
| PUT | `/api/v1/crm/tasks/:id/reminders/:reminderID` | `crm_task.update` | Update reminder |
| DELETE | `/api/v1/crm/tasks/:id/reminders/:reminderID` | `crm_task.delete` | Delete reminder |

### Schedules
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/crm/schedules` | `crm_schedule.read` | List schedules |
| GET | `/api/v1/crm/schedules/form-data` | `crm_schedule.read` | Form data |
| POST | `/api/v1/crm/schedules` | `crm_schedule.create` | Create schedule |
| GET | `/api/v1/crm/schedules/:id` | `crm_schedule.read` | Get schedule |
| PUT | `/api/v1/crm/schedules/:id` | `crm_schedule.update` | Update schedule |
| DELETE | `/api/v1/crm/schedules/:id` | `crm_schedule.delete` | Delete schedule |

### Visit Reports
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/crm/visits` | `crm_visit.read` | List visit reports |
| GET | `/api/v1/crm/visits/form-data` | `crm_visit.read` | Form data dropdown |
| GET | `/api/v1/crm/visits/by-employee` | `crm_visit.read` | List by employee |
| POST | `/api/v1/crm/visits` | `crm_visit.create` | Create visit report |
| GET | `/api/v1/crm/visits/:id` | `crm_visit.read` | Get visit report |
| PUT | `/api/v1/crm/visits/:id` | `crm_visit.update` | Update visit report |
| DELETE | `/api/v1/crm/visits/:id` | `crm_visit.delete` | Delete visit report |
| GET | `/api/v1/crm/visits/:id/print` | `crm_visit.read` | Print visit report PDF |
| POST | `/api/v1/crm/visits/:id/submit` | `crm_visit.update` | Submit for approval |
| POST | `/api/v1/crm/visits/:id/approve` | `crm_visit.approve` | Approve visit report |
| POST | `/api/v1/crm/visits/:id/reject` | `crm_visit.approve` | Reject visit report |
| POST | `/api/v1/crm/visits/:id/check-in` | `crm_visit.update` | GPS check-in |
| POST | `/api/v1/crm/visits/:id/check-out` | `crm_visit.update` | GPS check-out |
| POST | `/api/v1/crm/visits/:id/photos` | `crm_visit.update` | Upload photos |

### Activities
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/crm/activities` | `crm_activity.read` | List activities |
| GET | `/api/v1/crm/activities/timeline` | `crm_activity.read` | Activity timeline |
| GET | `/api/v1/crm/activities/my-activities` | - | My activities |
| POST | `/api/v1/crm/activities` | `crm_activity.create` | Create activity |
| GET | `/api/v1/crm/activities/:id` | `crm_activity.read` | Get activity |

### Contacts
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/crm/contacts` | `customer.read` | List contacts |
| GET | `/api/v1/crm/contacts/form-data` | `customer.read` | Form data |
| POST | `/api/v1/crm/contacts` | `customer.create` | Create contact |
| GET | `/api/v1/crm/contacts/:id` | `customer.read` | Get contact |
| PUT | `/api/v1/crm/contacts/:id` | `customer.update` | Update contact |
| DELETE | `/api/v1/crm/contacts/:id` | `customer.delete` | Delete contact |

### Area Mapping
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/crm/area-mapping/capture` | `crm_area_mapping.create` | Capture GPS point |
| GET | `/api/v1/crm/area-mapping/captures` | `crm_area_mapping.read` | List captures |
| GET | `/api/v1/crm/area-mapping/heatmap` | `crm_area_mapping.read` | Heatmap data |
| GET | `/api/v1/crm/area-mapping/coverage` | `crm_area_mapping.read` | Coverage analysis |
| GET | `/api/v1/crm/area-mapping/map` | `crm_area_mapping.read` | Map visualization |

### Lead Automation (n8n)
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/crm/leads/automation/test-connection` | `crm_lead.read` | Test n8n connection |
| POST | `/api/v1/crm/leads/automation/trigger` | `crm_lead.create` | Trigger automation |

### CRM Master Data
| Entity | Endpoints |
|--------|-----------|
| **Pipeline Stages** | `GET/POST /api/v1/crm/pipeline-stages`, `GET/PUT/DELETE /api/v1/crm/pipeline-stages/:id` |
| **Lead Sources** | `GET/POST /api/v1/crm/lead-sources`, `GET/PUT/DELETE /api/v1/crm/lead-sources/:id` |
| **Lead Statuses** | `GET/POST /api/v1/crm/lead-statuses`, `GET/PUT/DELETE /api/v1/crm/lead-statuses/:id` |
| **Contact Roles** | `GET/POST /api/v1/crm/contact-roles`, `GET/PUT/DELETE /api/v1/crm/contact-roles/:id` |
| **Activity Types** | `GET/POST /api/v1/crm/activity-types`, `GET/PUT/DELETE /api/v1/crm/activity-types/:id` |

### Sales Target (CRM Menu, Sales Backend)
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/sales/yearly-targets` | `sales_target.read` | List targets |
| GET | `/api/v1/sales/yearly-targets/:id` | `sales_target.read` | Get target |
| POST | `/api/v1/sales/yearly-targets` | `sales_target.create` | Create target |
| PUT | `/api/v1/sales/yearly-targets/:id` | `sales_target.update` | Update target |
| DELETE | `/api/v1/sales/yearly-targets/:id` | `sales_target.delete` | Delete target |

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `LEAD_NOT_FOUND` | 404 | Lead tidak ditemukan |
| `LEAD_ALREADY_CONVERTED` | 422 | Lead sudah di-convert ke deal |
| `DEAL_NOT_FOUND` | 404 | Deal tidak ditemukan |
| `DEAL_NOT_WON` | 422 | Deal belum won, tidak bisa convert to quotation |
| `DEAL_ALREADY_CONVERTED` | 409 | Deal sudah pernah di-convert ke quotation |
| `DEAL_NO_ITEMS` | 422 | Deal tidak memiliki product items |
| `DEAL_CUSTOMER_REQUIRED` | 422 | Deal wajib memiliki customer sebelum convert |
| `TASK_NOT_FOUND` | 404 | Task tidak ditemukan |
| `TASK_ALREADY_COMPLETED` | 409 | Task sudah completed |
| `VISIT_NOT_FOUND` | 404 | Visit report tidak ditemukan |
| `VISIT_NOT_DRAFT` | 422 | Hanya draft/rejected yang bisa dimodifikasi |
| `VISIT_ALREADY_CHECKED_IN` | 409 | Sudah check-in |
| `VISIT_NOT_CHECKED_IN` | 422 | Belum check-in, tidak bisa check-out |
| `VISIT_CANNOT_APPROVE_OWN` | 403 | Tidak bisa approve report sendiri |
| `VISIT_REJECTION_REASON_REQUIRED` | 422 | Alasan rejection wajib diisi |
| `VISIT_MAX_PHOTOS_EXCEEDED` | 422 | Maksimal 5 foto |
| `VISIT_NOT_SUBMITTED` | 422 | Harus submitted sebelum approve |
| `VISIT_APPROVED_IMMUTABLE` | 422 | Approved report tidak bisa diubah |
| `SCHEDULE_NOT_FOUND` | 404 | Schedule tidak ditemukan |
| `ACTIVITY_NOT_FOUND` | 404 | Activity tidak ditemukan |
| `CONTACT_NOT_FOUND` | 404 | Contact tidak ditemukan |
| `PIPELINE_STAGE_NOT_FOUND` | 404 | Pipeline stage tidak ditemukan |

## Cara Test Manual

### Lead → Deal → Quotation Workflow
1. Login sebagai user dengan permission `crm_lead.create` dan `crm_deal.create`
2. Navigasi ke **CRM → Leads**
3. Klik **Create Lead** — isi nama, perusahaan, contact info, BANT fields
4. Submit → lead status `new`
5. Update lead status ke `qualified`
6. Klik **Convert** → sistem membuatkan Deal baru
7. Navigasi ke **CRM → Pipeline**
8. Open deal yang baru dibuat, tambahkan product items
9. Klik **Check Stock** — verifikasi available stock tiap item
10. Move stage ke `Closed Won`
11. Klik **Convert to Quotation** → sistem membuat Sales Quotation
12. Verifikasi quotation terbuat dengan `source_deal_id` mengarah ke deal

### Task & Schedule
1. Navigasi ke **CRM → Tasks**
2. Klik **Create Task** — isi title, due date, assignee
3. Submit → task status `pending`
4. Klik **Mark In Progress** → status `in_progress`
5. Klik **Assign** → pilih employee lain
6. Navigasi ke **CRM → Schedules**
7. Verifikasi schedule otomatis muncul dari task
8. Kembali ke Task, klik **Complete** → status `completed`

### Visit Report Approval Workflow
1. Login sebagai Sales Rep
2. Navigasi ke **CRM → Visit Reports**
3. Klik **Create Visit Report**
4. Isi customer, contact, visit purpose, produk interest
5. Klik **GPS Check-in** → verifikasi lokasi tersimpan
6. Klik **GPS Check-out** → isi hasil kunjungan
7. Klik **Submit for Approval** → status `submitted`
8. Logout, login sebagai Manager dengan permission `crm_visit.approve`
9. Open visit report → **Approve** → status `approved`
10. Verifikasi report tidak bisa diedit lagi
11. Buat visit report baru, submit, kemudian **Reject** dengan alasan
12. Verifikasi status kembali ke editable

### Area Mapping
1. Navigasi ke **CRM → Area Mapping**
2. Klik **Capture** (biasanya dari mobile app) untuk menyimpan GPS point
3. Lihat **Heatmap** untuk density kunjungan
4. Lihat **Coverage** untuk statistik customer per area
5. Lihat **Map** untuk visualisasi lokasi customer dan lead

## Automated Testing

```bash
# Backend CRM tests
cd apps/api && go test ./internal/crm/domain/usecase/...

# Frontend type checking
cd apps/web && pnpm check-types
```

## Dependencies

- **Backend**: GORM, Gin, validator/v10
- **Cross-domain integrations**:
  - **Sales module**: Deal conversion to quotation, SalesVisit interest questions
  - **Product module**: Product catalog, pricing, stock check
  - **Inventory module**: Stock availability queries
  - **Customer module**: Customer master data
  - **Organization module**: Employee data, area hierarchy
  - **Geographic module**: Village/region hierarchy
- **Frontend**: TanStack Query, React Hook Form, Zod, next-intl, Tailwind CSS, shadcn/ui, map library (Leaflet/Mapbox untuk area mapping)

## Database Tables

- `crm_leads` — Lead master data
- `crm_deals` — Deal master data
- `crm_deal_items` — Product items per deal
- `crm_tasks` — Task master data
- `crm_schedules` — Calendar schedules
- `crm_reminders` — Task reminders
- `crm_visit_reports` — Visit report header
- `crm_visit_report_details` — Product interest per visit
- `crm_visit_report_progress_history` — Status change audit
- `crm_visit_report_interest_answers` — Survey answers
- `crm_activities` — CRM activity log
- `crm_contacts` — Customer contacts
- `crm_area_captures` — GPS capture points
- `crm_pipeline_stages` — Pipeline stage master
- `crm_lead_sources` — Lead source master
- `crm_lead_statuses` — Lead status master
- `crm_contact_roles` — Contact role master
- `crm_activity_types` — Activity type master

## Notes & Improvements

- **Known Limitations**:
  - Converting a Deal to Quotation tidak bisa di-undo dari UI
  - Map visualization di Area Mapping memerlukan library peta eksternal (Third-party API key)
  - Lead automation (n8n) memerlukan konfigurasi webhook manual
- **Future Improvements**:
  - Bulk stage movement untuk multiple deals
  - Email/SMS notification untuk task reminders dan visit report approvals
  - AI lead scoring berdasarkan BANT dan historical conversion
  - Mobile-optimized visit report dengan offline mode
  - Geofencing validation untuk check-in (compare GPS dengan customer address)
  - Advanced forecasting dengan weighted pipeline
  - Integration dengan email client untuk activity auto-logging
