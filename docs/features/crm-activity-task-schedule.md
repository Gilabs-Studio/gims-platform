# CRM Activity, Task & Schedule Management

Fitur untuk mengelola activity log, task management, dan schedule di CRM module.
Activity mencatat semua interaksi secara immutable, Task mengelola pekerjaan yang perlu dilakukan dengan reminder system, dan Schedule mengatur jadwal kerja tim.

## Fitur Utama
- Activity logging immutable (visit, call, email, meeting, follow-up, task, deal, lead)
- Activity timeline view (kronologis terbalik)
- Task CRUD dengan status workflow (pending -> in_progress -> completed/cancelled)
- Task assignment antar employee
- Task priority management (low, medium, high, urgent)
- Reminder system per task (in-app/email type, stored for future background worker)
- Schedule CRUD dengan waktu mulai/selesai dan lokasi
- Schedule reminder minutes before configuration
- Form data endpoints untuk dropdown selection

## Business Rules
- **Activity bersifat immutable**: tidak bisa di-update atau di-delete setelah dibuat
- **Task status flow**: `pending -> in_progress -> completed` atau `pending -> cancelled`
- **Task overdue**: Ditandai otomatis jika `due_date < now()` dan status belum completed/cancelled
- **Reminder**: Disimpan di database, background worker untuk notification di sprint mendatang
- **Schedule**: Validasi `end_at > scheduled_at` jika keduanya disediakan
- **Activity rate limit**: Endpoint create dibatasi untuk mencegah spam (enforced via middleware)
- **All FK validated**: ActivityType, Customer, Contact, Deal, Employee di-validasi sebelum create/update

## Keputusan Teknis
- **Mengapa Activity immutable (no update/delete)**:
  Sebagai audit trail CRM yang tidak boleh dimanipulasi. Trade-off: tidak bisa fix typo, tapi integritas data terjaga.

- **Mengapa Reminder belum ada background worker**:
  Sprint ini fokus pada data model dan CRUD. Notification delivery akan diimplementasi di sprint mendatang. Trade-off: reminder tersimpan tapi belum trigger notification.

- **Mengapa Schedule terpisah dari Task**:
  Schedule bisa berdiri sendiri (meeting, call) atau terikat ke Task. Memberikan fleksibilitas penjadwalan. Trade-off: perlu sinkronisasi manual jika Task di-complete.

- **Mengapa ActivityType referensi ke tabel crm_activity_types**:
  Agar admin bisa menambah tipe activity baru tanpa perubahan code. Field `type` tetap ada sebagai category utama.

## Struktur Folder

### Backend
```
apps/api/internal/crm/
├── data/
│   ├── models/
│   │   ├── activity.go          # Immutable activity log
│   │   ├── task.go              # Task with status/priority
│   │   ├── reminder.go          # Task reminders
│   │   └── schedule.go          # Employee schedules
│   └── repositories/
│       ├── activity_repository.go
│       ├── task_repository.go
│       ├── reminder_repository.go
│       └── schedule_repository.go
├── domain/
│   ├── dto/
│   │   ├── activity_dto.go
│   │   ├── task_dto.go
│   │   └── schedule_dto.go
│   ├── mapper/
│   │   ├── activity_mapper.go
│   │   ├── task_mapper.go
│   │   └── schedule_mapper.go
│   └── usecase/
│       ├── activity_usecase.go
│       ├── task_usecase.go
│       └── schedule_usecase.go
└── presentation/
    ├── handler/
    │   ├── activity_handler.go
    │   ├── task_handler.go
    │   └── schedule_handler.go
    ├── router/
    │   ├── activity_router.go
    │   ├── task_router.go
    │   └── schedule_router.go
    └── routers.go
```

### Frontend
```
apps/web/src/features/crm/
├── activity/
│   ├── types/index.d.ts
│   ├── services/activity-service.ts
│   ├── hooks/
│   │   ├── use-activities.ts
│   │   ├── use-activity-list.ts
│   │   └── use-activity-form.ts
│   ├── components/
│   │   ├── index.tsx
│   │   ├── activity-list.tsx
│   │   ├── activity-form-dialog.tsx
│   │   └── activity-detail-dialog.tsx
│   └── i18n/{en,id}.ts
├── task/
│   ├── types/index.d.ts
│   ├── services/task-service.ts
│   ├── hooks/
│   │   ├── use-tasks.ts
│   │   ├── use-task-list.ts
│   │   └── use-task-form.ts
│   ├── components/
│   │   ├── index.tsx
│   │   ├── task-list.tsx
│   │   └── task-form-dialog.tsx
│   └── i18n/{en,id}.ts
└── schedule/
    ├── types/index.d.ts
    ├── services/schedule-service.ts
    ├── hooks/
    │   ├── use-schedules.ts
    │   ├── use-schedule-list.ts
    │   └── use-schedule-form.ts
    ├── components/
    │   ├── index.tsx
    │   ├── schedule-list.tsx
    │   └── schedule-form-dialog.tsx
    └── i18n/{en,id}.ts
```

## API Endpoints

### Activity

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/crm/activities` | crm_activity.read | List activities with filters |
| GET | `/crm/activities/timeline` | crm_activity.read | Timeline view (desc order) |
| GET | `/crm/activities/:id` | crm_activity.read | Get activity by ID |
| POST | `/crm/activities` | crm_activity.create | Create new activity |

### Task

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/crm/tasks` | crm_task.read | List tasks with filters |
| GET | `/crm/tasks/form-data` | crm_task.read | Get form dropdown data |
| GET | `/crm/tasks/:id` | crm_task.read | Get task by ID |
| POST | `/crm/tasks` | crm_task.create | Create new task |
| PUT | `/crm/tasks/:id` | crm_task.update | Update task |
| DELETE | `/crm/tasks/:id` | crm_task.delete | Delete task (soft) |
| PUT | `/crm/tasks/:id/assign` | crm_task.assign | Assign task to employee |
| PUT | `/crm/tasks/:id/complete` | crm_task.update | Mark task completed |
| PUT | `/crm/tasks/:id/in-progress` | crm_task.update | Mark task in progress |
| GET | `/crm/tasks/:id/reminders` | crm_task.read | List task reminders |
| GET | `/crm/tasks/:id/reminders/:reminderId` | crm_task.read | Get reminder by ID |
| POST | `/crm/tasks/:id/reminders` | crm_task.create | Create reminder |
| PUT | `/crm/tasks/:id/reminders/:reminderId` | crm_task.update | Update reminder |
| DELETE | `/crm/tasks/:id/reminders/:reminderId` | crm_task.delete | Delete reminder |

### Schedule

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/crm/schedules` | crm_schedule.read | List schedules with filters |
| GET | `/crm/schedules/form-data` | crm_schedule.read | Get form dropdown data |
| GET | `/crm/schedules/:id` | crm_schedule.read | Get schedule by ID |
| POST | `/crm/schedules` | crm_schedule.create | Create new schedule |
| PUT | `/crm/schedules/:id` | crm_schedule.update | Update schedule |
| DELETE | `/crm/schedules/:id` | crm_schedule.delete | Delete schedule (soft) |

## Cara Test Manual

### Activity
1. Login sebagai employee dengan permission `crm_activity.create`
2. Navigate ke `/crm/activities`
3. Click "Add Activity" -> pilih type, employee, description
4. Submit -> should show success toast, activity muncul di list
5. Click activity row -> detail dialog tampil
6. Filter by type -> list ter-filter

### Task
1. Login sebagai employee dengan permission `crm_task.*`
2. Navigate ke `/crm/tasks`
3. Click "Add Task" -> isi title, type, priority, assigned_to
4. Submit -> task muncul di list dengan status "pending"
5. Click kebab menu -> "Mark In Progress" -> status berubah
6. Click kebab menu -> "Mark Complete" -> status berubah, completed_at ter-set
7. Filter by status/priority -> list ter-filter
8. Edit task -> update fields -> verify changes

### Schedule
1. Login sebagai employee dengan permission `crm_schedule.*`
2. Navigate ke `/crm/schedules`
3. Click "Add Schedule" -> isi title, employee, scheduled_at, end_at
4. Submit -> schedule muncul di list
5. Edit schedule -> update status to confirmed
6. Filter by status -> list ter-filter

## Dependencies
- **Backend**: GORM (models), Gin (HTTP), PostgreSQL (storage)
- **Frontend**: TanStack Query (data fetching), Zod (validation), react-hook-form, next-intl (i18n)
- **Integration**: Employee module (employee data), Customer module, Contact module, Deal module, ActivityType (CRM Settings)

## Notes & Improvements
- **Known Limitation**: Reminder notification belum di-trigger (hanya stored di DB)
- **Future Improvement**:
  - Background worker untuk mengirim reminder notifications (in-app/email)
  - Calendar view untuk schedule (week/month)
  - Task dependency/subtask system
  - Activity analytics dan reporting
  - Bulk task assignment
  - Schedule conflict detection
