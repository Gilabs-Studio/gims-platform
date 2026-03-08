# CRM Task-Schedule & Visit-Activity Integration

Fitur integrasi otomatis antara Task → Schedule dan Visit Report → Activity untuk mengurangi manual data entry oleh Sales & Marketing.

## Fitur Utama

- **Task → Schedule Auto-Create**: Saat Task dibuat dengan `due_date` dan `assigned_to`, Schedule otomatis terbuat
- **Visit → Activity Auto-Create**: Saat Visit Report di-submit, Activity record otomatis terbuat dengan metadata (outcome, GPS, foto)
- **Task di Lead/Deal Detail**: Tab "Tasks" di lead/deal detail menampilkan task terkait
- **Log Visit dari Lead/Deal**: Tombol "Log Visit" langsung dari lead/deal detail
- **Activity Timeline Visit Cards**: Foto gallery dan GPS badge dari visit muncul di activity timeline

## Business Rules

- Task auto-create Schedule hanya jika `due_date` dan `assigned_to` terisi
- Schedule auto-created memiliki status `pending` dan link ke task via `TaskID`
- Jika task di-update (due_date/assigned_to berubah), schedule yang belum `completed` akan di-update otomatis
- Visit Report submit auto-creates Activity dengan type `visit` dan `ActivityTypeID` = Visit
- Activity metadata berisi `outcome`, `has_check_in`, `has_check_out`, dan `photos` array
- Lead/Deal detail menampilkan max 20 tasks, diurutkan: pending/in_progress first, lalu by due_date ASC
- Task bisa punya `lead_id` opsional (selain `customer_id`, `contact_id`, `deal_id`)

## Keputusan Teknis

- **Mengapa Schedule auto-create di usecase, bukan trigger DB**: Memberikan kontrol lebih atas validasi dan error handling. Trade-off: logic lebih kompleks di usecase layer.
- **Mengapa Visit metadata di-store sebagai JSONB**: Fleksibel untuk data bervariasi (foto bisa 0-N, GPS opsional). Trade-off: tidak bisa di-index langsung.
- **Mengapa Tasks di Lead/Deal di-preload via repository, bukan lazy-load di frontend**: Mengurangi round-trip API. Trade-off: response payload sedikit lebih besar.
- **Mengapa limit 20 tasks di preload**: Mencegah response terlalu besar untuk leads/deals dengan banyak task historis.

## Struktur Folder

### Backend
```
apps/api/internal/crm/
├── data/models/
│   ├── task.go          # Task model with LeadID, DealID FK
│   ├── activity.go      # Activity model with VisitReportID, Metadata
│   └── schedule.go      # Schedule model with TaskID FK
├── domain/
│   ├── dto/task_dto.go   # TaskSummaryResponse for embedded lists
│   ├── mapper/task_mapper.go  # ToTaskSummaryResponse/List
│   └── usecase/
│       ├── task_usecase.go     # Auto-create Schedule on task create/update
│       └── visit_report_usecase.go  # Auto-create Activity on submit
└── data/repositories/
    ├── lead_repository.go   # Preload("Tasks") with ordering
    └── deal_repository.go   # Preload("Tasks") with ordering
```

### Frontend
```
apps/web/src/features/crm/
├── task/
│   ├── hooks/use-tasks.ts          # useTasksByLead(), useTasksByDeal()
│   ├── hooks/use-task-form.ts      # defaultValues for lead_id/deal_id
│   └── components/
│       ├── task-embed-list.tsx      # Compact task list for embedding
│       └── task-form-dialog.tsx     # defaultLeadId/defaultDealId props
├── lead/components/lead-detail.tsx  # Tasks tab with TaskEmbedList
├── deal/components/deal-detail-page.tsx  # Tasks tab with TaskEmbedList
├── activity/components/
│   ├── visit-activity-card.tsx      # Photo gallery + GPS badge
│   └── activity-feed-dialog.tsx     # Renders visit cards in timeline
└── visit-report/components/
    └── log-visit-dialog.tsx         # Inline visit logging from lead/deal
```

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/crm/tasks` | crm_task.create | Create task (now supports `lead_id`). Auto-creates Schedule if due_date + assigned_to set |
| GET | `/crm/tasks?lead_id={id}` | crm_task.read | Filter tasks by lead |
| GET | `/crm/tasks?deal_id={id}` | crm_task.read | Filter tasks by deal |
| GET | `/crm/tasks/form-data` | crm_task.read | Returns employees, customers, contacts, deals, leads, statuses, priorities, types |
| GET | `/crm/leads/:id` | crm_lead.read | Response now includes `tasks[]` (max 20, ordered) |
| GET | `/crm/deals/:id` | crm_deal.read | Response now includes `tasks[]` (max 20, ordered) |
| POST | `/crm/visits/:id/submit` | crm_visit.update | Submit visit report. Auto-creates Activity with visit metadata |
| GET | `/crm/activities?lead_id={id}` | crm_activity.read | Activities include visit photos in metadata |

## Cara Test Manual

1. Login sebagai sales rep
2. Buka Lead Detail, klik tab "Tasks"
3. Klik "+ Add Task", isi form dengan due date
4. Save → verifikasi task muncul di tab Tasks
5. Buka Calendar di Tasks page → verifikasi Schedule otomatis terbuat
6. Dari Lead Detail, klik "Log Visit" di Activity tab
7. Isi visit form: check-in, ambil foto, isi result, check-out
8. Submit visit report
9. Verifikasi: Activity baru muncul di timeline dengan foto dan outcome badge
10. Buka Deal Detail → verifikasi tab Tasks juga berfungsi

## Dependencies

- **Backend**: GORM (models/preload), apptime (timezone), PostgreSQL (JSONB for metadata)
- **Frontend**: TanStack Query (useTasksByLead/Deal hooks), shadcn/ui (Tabs, Badge, Avatar), Lucide icons, next-intl (i18n)
- **Integration**: Lead module (FK), Deal module (FK), Activity module (auto-create), Schedule module (auto-create), Visit Report module (trigger)

## Notes & Improvements

- **Known Limitation**: Task auto-schedule hanya support single schedule per task (1:1)
- **Future Improvement**:
  - Recurring tasks dengan auto-schedule berulang
  - Drag-and-drop task ke kalender untuk set due date
  - Batch task assignment dari lead/deal list
  - Visit photo thumbnails di task embed list
- **Performance**: Tasks preload limited to 20 per lead/deal to keep response size manageable
