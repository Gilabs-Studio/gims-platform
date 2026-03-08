# CRM Phase 2 Sprint Plan — Tasks, Schedules & Visit Reports

> **Date:** 8 March 2026
> **Objective:** Minimise manual data entry dan maximise output bagi Sales & Marketing dengan dua perubahan utama: (1) Schedule otomatis dari Task, (2) Visit Report foto & hasil terintegrasi ke Activity Timeline.
> **Reference:** [crm-flow-redesign-sprint.md](./crm-flow-redesign-sprint.md) | [crm-journey.md](../../ux-journey/crm.md)

---

## Gap Analysis: Current vs Ideal UX

### Masalah Utama

| Area | Problem Saat Ini | Dampak ke User |
|------|-----------------|----------------|
| Schedule | Sales harus create Schedule **secara manual** setelah create Task | Double entry — Task & Schedule isinya sama |
| Visit Report → Timeline | Foto, GPS, dan hasil kunjungan **tidak muncul** di Activity Timeline lead/deal | Sales tidak bisa lihat riwayat kunjungan dari satu tempat |
| Visit Report creation | Sales harus buka menu Visit Reports terpisah | Context switch dari lead/deal detail, workflow terputus |
| Task tanpa Lead/Deal link | Task tidak punya `lead_id`, hanya ada `customer_id` + `deal_id` | Tidak bisa track task dari leads yang belum converted |

### Ideal Flow Setelah Sprint Ini

```
Sales buat Task (dengan due_date + assigned_to)
  → Schedule otomatis terbuat (calendar entry)
  → Tidak perlu buka menu Schedules

Sales kunjungi lead/deal (dari Lead/Deal Detail → tab Activities → "Log Visit")
  → Visit Report form pre-fill lead_id/deal_id
  → Check-in GPS → Upload foto → Check-out + Result
  → Submit → Activity otomatis terbuat (dengan foto & GPS di metadata)
  → Foto muncul di Activity Timeline lead/deal
  → Tersimpan di Visit Reports untuk approval manager
```

---

## Perubahan yang Diperlukan

| Area | Status Saat Ini | Target | Impact |
|------|----------------|--------|--------|
| Schedule creation | Manual oleh user | Auto-create dari Task (`due_date` + `assigned_to`) | Backend + Frontend |
| Task → LeadID | Tidak ada `lead_id` di Task model | Tambah `lead_id` FK opsional | Backend + Frontend |
| Schedule sidebar | Menu standalone `/crm/schedules` | Merge calendar ke Tasks page (toggle Table ↔ Calendar) | Frontend |
| Visit Report → Activity | Tidak ada auto-logging | Auto-create Activity saat submit, foto di metadata | Backend |
| Activity Timeline | Tidak render foto/GPS | Render foto gallery + GPS badge dari metadata | Frontend |
| Log Visit dari Lead/Deal | Tidak ada entry point | Tombol "Log Visit" di lead/deal detail → Visit Report inline | Frontend |
| Visit Report sidebar | Standalone menu `/crm/visits` | Tetap ada (untuk manager approval + admin view) | Navigation |

---

## Sprint Breakdown

---

### Phase 1: Backend — Task Model Update (Add LeadID)
> Task saat ini hanya link ke Customer/Contact/Deal. Perlu `lead_id` untuk track task dari leads yang belum converted.

- [x] **1.1 Add `lead_id` ke Task Model** — Tambah FK optional ke `crm_leads`:
  ```go
  LeadID *string `gorm:"type:uuid;index" json:"lead_id"`
  Lead   *Lead   `gorm:"foreignKey:LeadID" json:"lead,omitempty"`
  ```
  - Migration auto via GORM `AutoMigrate`
  - Nullable, tidak breaking change untuk data existing

- [x] **1.2 Update Task DTOs** — `CreateTaskRequest` & `UpdateTaskRequest`:
  ```go
  LeadID *string `json:"lead_id" binding:"omitempty,uuid"`
  ```
  - Add `LeadID`, `Lead *TaskLeadInfo` ke `TaskResponse`
  - Add `TaskLeadInfo` struct: `{ ID, Code, FirstName, LastName }`

- [x] **1.3 Update Task Repository** — Add `lead_id` filter ke `TaskListParams` & Preload `Lead` saat FindByID

- [x] **1.4 Update Task Usecase** — Validate `lead_id` exists (optional FK check) di Create/Update

- [x] **1.5 Update Task FormData** — Add `leads []TaskLeadOption` ke `TaskFormDataResponse`:
  ```go
  type TaskLeadOption struct {
      ID   string `json:"id"`
      Code string `json:"code"`
      Name string `json:"name"` // FirstName + LastName
  }
  ```

---

### Phase 2: Backend — Schedule Auto-Create dari Task
> Saat Task di-create/update/delete dengan `due_date` + `assigned_to`, Schedule otomatis dikelola. User tidak perlu create Schedule manual.

- [x] **2.1 Inject ScheduleRepository ke TaskUsecase** — Tambah `scheduleRepo` ke struct:
  ```go
  type taskUsecase struct {
      taskRepo     repositories.TaskRepository
      scheduleRepo repositories.ScheduleRepository  // NEW
      reminderRepo repositories.ReminderRepository
      // ...existing
  }
  ```
  - Update constructor `NewTaskUsecase()` untuk terima `scheduleRepo`
  - Update `routers.go` untuk pass `scheduleRepo` ke TaskUsecase

- [x] **2.2 Auto-Create Schedule saat Task Create** — Di `taskUsecase.Create()`:
  ```go
  // Setelah task berhasil disimpan, jika due_date + assigned_to ada:
  if task.DueDate != nil && task.AssignedTo != nil {
      schedule := models.Schedule{
          TaskID:      &task.ID,
          EmployeeID:  *task.AssignedTo,
          Title:       task.Title,
          Description: task.Description,
          ScheduledAt: *task.DueDate,
          Status:      "pending",
          ReminderMinutesBefore: 30, // default
          CreatedBy:   &createdBy,
      }
      _ = u.scheduleRepo.Create(ctx, &schedule) // Non-blocking: log error but don't fail task creation
  }
  ```
  - Gunakan `_ =` agar kegagalan schedule tidak rollback task
  - Log warning jika schedule creation gagal

- [x] **2.3 Auto-Update Schedule saat Task Update** — Di `taskUsecase.Update()`:
  - Jika `due_date` atau `assigned_to` berubah: cari existing Schedule by `task_id`, update `ScheduledAt`/`EmployeeID`/`Title`
  - Jika task berubah jadi cancelled: update linked schedule status → `"cancelled"`
  - Jika `due_date` di-remove (set nil): delete linked schedule

- [x] **2.4 Auto-Complete Schedule saat Task Complete** — Di `taskUsecase.Complete()`:
  - Cari Schedule by `task_id`, set status → `"completed"`
  - Record actual completion time

- [x] **2.5 Auto-Delete Schedule saat Task Delete** — Di `taskUsecase.Delete()`:
  - Soft-delete linked Schedule otomatis (atau cascade dari FK)
  - Tambah FK constraint: `ON DELETE CASCADE` di `crm_schedules.task_id` (atau handle di usecase)

- [x] **2.6 Add `FindByTaskID` ke ScheduleRepository** — Method baru untuk usecase di atas:
  ```go
  FindByTaskID(ctx context.Context, taskID string) (*models.Schedule, error)
  ```

---

### Phase 3: Backend — Visit Report Auto-Create Activity saat Submit
> Saat Visit Report di-submit, backend otomatis membuat Activity record dengan foto, GPS, dan link ke lead/deal. Ini adalah inti integrasi visit → timeline.

- [x] **3.1 Inject ActivityRepository ke VisitReportUsecase** — Tambah `activityRepo`:
  ```go
  type visitReportUsecase struct {
      visitRepo    repositories.VisitReportRepository
      activityRepo repositories.ActivityRepository  // NEW
      // ...existing
  }
  ```
  - Update constructor + `routers.go`

- [x] **3.2 Define Visit Activity Metadata Schema** — Struct internal untuk JSONB metadata:
  ```go
  // Dalam visit_report_usecase.go atau package dto
  type VisitActivityMetadata struct {
      VisitCode       string   `json:"visit_code"`
      Purpose         string   `json:"purpose"`
      Outcome         string   `json:"outcome"`    // positive, neutral, negative, very_positive
      Photos          []string `json:"photos"`     // array of WebP URLs
      CheckInAt       *string  `json:"check_in_at"`
      CheckOutAt      *string  `json:"check_out_at"`
      CheckInLat      *float64 `json:"check_in_lat"`
      CheckInLng      *float64 `json:"check_in_lng"`
      CheckOutLat     *float64 `json:"check_out_lat"`
      CheckOutLng     *float64 `json:"check_out_lng"`
      Address         string   `json:"address"`
      ContactPerson   string   `json:"contact_person"`
  }
  ```

- [x] **3.3 Auto-Create Activity saat Visit Submit** — Di `visitReportUsecase.Submit()`:
  ```go
  // Setelah status berhasil diupdate ke "submitted":
  metadata := VisitActivityMetadata{
      VisitCode:     visit.Code,
      Purpose:       visit.Purpose,
      Outcome:       visit.Outcome,
      Photos:        parsePhotosJSON(visit.Photos), // []string dari JSONB
      CheckInAt:     formatTimePtr(visit.CheckInAt),
      CheckOutAt:    formatTimePtr(visit.CheckOutAt),
      CheckInLat:    extractLat(visit.CheckInLocation),
      CheckInLng:    extractLng(visit.CheckInLocation),
      CheckOutLat:   extractLat(visit.CheckOutLocation),
      CheckOutLng:   extractLng(visit.CheckOutLocation),
      Address:       visit.Address,
      ContactPerson: visit.ContactPerson,
  }
  metadataJSON, _ := json.Marshal(metadata)
  metadataStr := string(metadataJSON)

  activity := models.Activity{
      Type:          "visit",
      ActivityTypeID: &visitActivityTypeID, // ID dari seeder "Visit" type
      EmployeeID:    visit.EmployeeID,
      LeadID:        visit.LeadID,
      DealID:        visit.DealID,
      CustomerID:    visit.CustomerID,
      VisitReportID: &visit.ID,
      Description:   fmt.Sprintf("Visit: %s — %s", visit.Purpose, visit.Result),
      Timestamp:     visit.ActualTime or visit.VisitDate (whichever is set),
      Metadata:      &metadataStr,
  }
  _ = u.activityRepo.Create(ctx, &activity) // Non-blocking
  ```

- [x] **3.4 Update Activity pada Visit Approve** — Di `visitReportUsecase.Approve()`:
  - Tidak perlu create activity baru (sudah ada saat submit)
  - Cukup update existing activity metadata: tambah `"approved_at"` ke metadata (opsional, bisa skip)

- [x] **3.5 Add `visitActivityTypeID` Constant** — Pastikan ada Activity Type "Visit" di seeder dengan ID yang stable:
  - Check `crm_activity_task_schedule_seeder.go` untuk ID constant
  - Jika belum ada stable constant, tambah ke `seeders/constants.go`

---

### Phase 4: Backend — Task & Visit Report di Lead/Deal Response
> Task yang terkait lead/deal perlu muncul di response detail untuk frontend bisa render.

- [ ] **4.1 Add Tasks ke Lead Detail Response** — Preload tasks by `lead_id`:
  - Tambah `Tasks []TaskSummary` ke `LeadDetailResponse`
  - Limit 20 latest (sorted by due_date asc, pending first)
  - `TaskSummary`: `{ id, title, type, status, priority, due_date, assigned_employee, is_overdue }`

- [ ] **4.2 Add Tasks ke Deal Detail Response** — Preload tasks by `deal_id`:
  - Sama seperti lead, tambah `Tasks []TaskSummary` ke `DealDetailResponse`

---

### Phase 5: Frontend — Task Form Update (Add LeadID)

- [x] **5.1 Update Task Types** — Add `lead_id`, `lead` ke TypeScript interfaces:
  ```typescript
  export interface TaskLeadInfo {
    id: string;
    code: string;
    name: string;
  }

  export interface Task {
    // ...existing
    lead_id: string | null;
    lead: TaskLeadInfo | null;
  }

  export interface CreateTaskData {
    // ...existing
    lead_id?: string | null;
  }

  export interface TaskFormData {
    // ...existing
    leads: TaskLeadInfo[];
  }
  ```

- [x] **5.2 Update Task Schema** — Add optional `lead_id` ke Zod schema:
  ```typescript
  lead_id: z.string().uuid().optional().nullable(),
  ```

- [x] **5.3 Update Task Form Dialog** — Tambah "Related Lead" selector:
  - Combobox dropdown dari `formData.leads`
  - Gunakan pola yang sama dengan Customer/Deal selector (existing)
  - Show only if `lead_id` not already pre-filled (ketika dari lead detail)

- [x] **5.4 Update Task Service** — Pass `lead_id` di `createTask()` dan `updateTask()` calls

- [x] **5.5 Update Task List** — Tambah filter "Lead" di filter bar + kolom "Lead" di table (jika ada `lead_id`)

---

### Phase 6: Frontend — Schedule Auto-Sync (Hapus Manual Create)

- [x] **6.1 Remove "Create Schedule" Button** — Dari schedule-list.tsx dan navigation:
  - Hapus button "Add Schedule" / "New Schedule" dari `schedule-list.tsx`
  - Schedule hanya bisa dibuat/diubah melalui Task
  - Tampilkan info notice: _"Schedules are automatically created from Tasks with a due date."_

- [x] **6.2 Remove "Schedules" dari CRM Sidebar** — Di `navigation-config.ts`:
  ```typescript
  // REMOVE:
  { name: "Schedules", url: "/crm/schedules", icon: "calendar", permission: "crm_schedule.read" }
  ```
  - Redirect `/crm/schedules` → `/crm/tasks` (backward compat)

- [x] **6.3 Embed Calendar View di Tasks Page** — Tambah toggle Table ↔ Calendar di Tasks page:
  - Pindahkan `schedule-list.tsx` calendar UI ke Tasks page sebagai tab/toggle
  - Calendar tetap menampilkan schedules (auto-generated dari tasks)
  - Klik event di calendar → buka Task detail (bukan Schedule detail)
  - Hapus standalone `/crm/schedules` page setelah calendar embedded di Tasks

- [x] **6.4 Update Schedule Detail Dialog** — Jika user klik schedule di calendar:
  - Redirect/open Task detail dialog (bukan Schedule detail)
  - Schedule detail dialog bisa di-deprecate bertahap

- [x] **6.5 Update Route Validator** — Add `/crm/schedules` sebagai deprecated redirect:
  ```typescript
  // route-validator.ts: mark /crm/schedules as redirect
  ```

---

### Phase 7: Frontend — Activity Timeline Render Visit Photos & GPS

- [x] **7.1 Define `ActivityMetadata` TypeScript Type** — Tambah ke `activity/types/index.d.ts`:
  ```typescript
  export interface VisitActivityMetadata {
    visit_code?: string;
    purpose?: string;
    outcome?: string;
    photos?: string[];
    check_in_at?: string | null;
    check_out_at?: string | null;
    check_in_lat?: number | null;
    check_in_lng?: number | null;
    check_out_lat?: number | null;
    check_out_lng?: number | null;
    address?: string;
    contact_person?: string;
  }
  ```

- [x] **7.2 Parse Metadata di Activity** — Utility function:
  ```typescript
  // activity/utils.ts
  export function parseActivityMetadata(metadata: string | null | undefined): VisitActivityMetadata | null {
    if (!metadata) return null;
    try { return JSON.parse(metadata) as VisitActivityMetadata; }
    catch { return null; }
  }
  ```

- [x] **7.3 Update Activity Timeline Card** — Di activity timeline component (lead/deal detail), untuk activities dengan `type === "visit"`:
  - Tampilkan **photo gallery** (2–3 thumbnail, click → lightbox/full view):
    ```tsx
    {meta?.photos && meta.photos.length > 0 && (
      <div className="flex gap-1 mt-2 flex-wrap">
        {meta.photos.slice(0, 3).map((url, i) => (
          <img key={i} src={url} className="h-16 w-16 rounded object-cover cursor-pointer" />
        ))}
        {meta.photos.length > 3 && (
          <div className="h-16 w-16 rounded bg-muted flex items-center justify-center text-xs">
            +{meta.photos.length - 3}
          </div>
        )}
      </div>
    )}
    ```
  - Tampilkan **GPS check-in badge** jika `check_in_at` ada:
    ```tsx
    {meta?.check_in_at && (
      <Badge variant="outline" className="gap-1 text-xs">
        <MapPin className="h-3 w-3" />
        Checked in {formatTime(meta.check_in_at)}
      </Badge>
    )}
    ```
  - Tampilkan **outcome badge** (color-coded: positive=green, negative=red, neutral=gray):
    ```tsx
    {meta?.outcome && <OutcomeBadge outcome={meta.outcome} />}
    ```
  - Tampilkan **link ke Visit Report** via `visit_report_id`:
    ```tsx
    {activity.visit_report_id && (
      <Link href={`/crm/visits/${activity.visit_report_id}`} className="text-xs text-primary hover:underline">
        {meta?.visit_code ?? "View Visit Report"} →
      </Link>
    )}
    ```

- [x] **7.4 Create `OutcomeBadge` Component** — Reusable badge untuk visit outcome:
  ```typescript
  const outcomeConfig: Record<string, { label: string; className: string }> = {
    very_positive: { label: "Very Positive", className: "text-green-700 bg-green-50 border-green-300" },
    positive:      { label: "Positive",      className: "text-green-600 bg-green-50 border-green-200" },
    neutral:       { label: "Neutral",        className: "text-muted-foreground bg-muted border-border" },
    negative:      { label: "Negative",       className: "text-red-600 bg-red-50 border-red-200" },
  };
  ```

- [x] **7.5 Update `ActivityFeedDialog`** — Apply same visit card enhancements ke "My Activities" header sheet

---

### Phase 8: Frontend — Log Visit dari Lead/Deal Detail
> Sales bisa log visit langsung dari Lead/Deal detail tanpa buka menu Visit Reports.

- [x] **8.1 Add "Log Visit" Button** — Di lead-detail.tsx dan deal-detail-page.tsx, di area yang sama dengan "Log Activity":
  - Button: `<MapPin /> Log Visit`
  - Visible only dengan permission `crm_visit.create`

- [x] **8.2 Create `LogVisitDialog` Component** — Simplified visit report form:
  ```
  apps/web/src/features/crm/visit-report/components/log-visit-dialog.tsx
  ```
  - Pre-fill `lead_id` atau `deal_id` dari context
  - Pre-fill `employee_id` dari current user
  - Required fields only: Purpose (textarea), Contact Person (text)
  - GPS Check-in button (auto-detect location via `navigator.geolocation`)
  - Photo upload (max 5, reuse upload endpoint)
  - Result textarea + Outcome select
  - GPS Check-out button
  - Submit → trigger `POST /crm/visits` + auto-close + invalidate activity queries

- [x] **8.3 Mobile-Friendly GPS Capture** — Di `LogVisitDialog`:
  ```typescript
  const getLocation = (): Promise<GeolocationCoordinates> =>
    new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        reject,
        { enableHighAccuracy: true, timeout: 10000 }
      )
    );
  ```
  - Show loading state saat GPS capturing
  - Show error toast jika GPS denied/timeout

- [x] **8.4 Update Visit Report Service & Hook** — Reuse existing `useCreateVisitReport` mutation:
  - Setelah create berhasil, `invalidateQueries` untuk activity keys dari lead/deal
  - `onSuccess`: toast sukses + close dialog + invalidate `activityKeys.byLead(leadId)`

---

### Phase 9: Frontend — Tasks di Lead/Deal Detail
> Task yang terkait lead/deal ditampilkan di detail page (mirip activity timeline).

- [ ] **9.1 Add Tasks Tab di Lead Detail** — Tab "Tasks" di lead-detail.tsx:
  - Fetch `GET /crm/tasks?lead_id={id}&per_page=20`
  - List compact: title + priority badge + status + due date + assigned employee avatar
  - Quick action: Mark Complete button
  - "Add Task" button → pre-fill `lead_id`

- [ ] **9.2 Add Tasks Tab di Deal Detail** — Sama untuk deal-detail-page.tsx:
  - Fetch `GET /crm/tasks?deal_id={id}&per_page=20`
  - Sorted: overdue first, then by due date asc

- [ ] **9.3 Update `useTasksByLead` & `useTasksByDeal` Hooks** — Query hooks baru:
  ```typescript
  export function useTasksByLead(leadId: string, params?: TaskListParams) {
    return useQuery({
      queryKey: [...taskKeys.lists(), { lead_id: leadId, ...params }],
      queryFn: () => taskService.list({ lead_id: leadId, per_page: 20, ...params }),
      staleTime: 2 * 60 * 1000,
    });
  }
  ```

---

### Phase 10: Frontend — i18n Updates

- [x] **10.1 Update Task i18n** — Tambah keys:
  - `relatedLead`, `selectLead`, `logVisit`, `taskCalendar`, `calendarView`, `tableView`

- [x] **10.2 Update Schedule i18n** — Tambah keys:
  - `autoCreatedFromTask`, `manageViaTask`

- [x] **10.3 Update Visit Report i18n** — Tambah keys:
  - `logVisit`, `checkIn`, `checkOut`, `capturingLocation`, `locationCaptured`, `locationError`
  - `outcome.very_positive`, `outcome.positive`, `outcome.neutral`, `outcome.negative`

- [x] **10.4 Update Activity i18n** — Tambah keys:
  - `visitActivity`, `viewVisitReport`, `checkedIn`, `checkedOut`
  - `photos` (untuk foto count label)

---

### Phase 11: Seeder Updates

- [ ] **11.1 Ensure "Visit" ActivityType seeder ada** — Di `crm_activity_task_schedule_seeder.go`:
  - Pastikan ActivityType "Visit" punya stable UUID constant
  - Tambah `VisitActivityTypeID` ke `seeders/constants.go` jika belum ada

- [ ] **11.2 Update Task Seeder** — Link beberapa sample tasks ke leads:
  - Tambah `LeadID` ke beberapa sample tasks
  - Pastikan sample tasks yang punya `DealID` juga diupdate

- [ ] **11.3 Update Visit Report Seeder** — Pastikan sample visits sudah di-submit:
  - Visit yang di-submit akan trigger auto-activity (dalam flow baru)
  - Untuk seeder, buat activity secara langsung (karena seeder tidak lewat usecase)

---

### Phase 12: Postman & Documentation

- [ ] **12.1 Update Postman Collection** — Update/tambah endpoints:
  - `POST /crm/tasks` — tambah `lead_id` field di request body
  - `GET /crm/tasks?lead_id={id}` — new filter param
  - `GET /crm/tasks/form-data` — response sekarang include `leads` array
  - `GET /crm/activities?lead_id={id}` — activity includes visit photos di metadata
  - Note di Visit Report Submit endpoint: "Auto-creates an Activity record with photos"

- [ ] **12.2 Update Feature Documentation** — Update `docs/features/crm/`:
  - Dokumentasikan Flow baru: Task → Schedule (auto)
  - Dokumentasikan Flow baru: Visit → Activity (auto saat submit)
  - Tambah tabel API endpoints baru

---

## UX Journey Setelah Sprint Ini

### Scenario: Andi Buat Task untuk Follow-Up Lead

```
Andi buka Lead Detail: "Klinik Sehat Sentosa"

Klik "+ Add Task" →
  Title: "Follow up proposal"
  Type: Call
  Priority: High
  Due Date: 12 March 2026
  Assigned To: Andi (default = self)
  Related Lead: auto-fill "Klinik Sehat Sentosa"

Save →
  ✅ Task CREATED
  ✅ Schedule otomatis terbuat: 12 March 2026, "Follow up proposal", milik Andi
  ✅ Task muncul di Lead Detail → tab Tasks
  ✅ Calendar di Tasks page menampilkan event 12 March

(Andi TIDAK harus buka menu Schedules)
```

### Scenario: Andi Log Visit Kunjungan Langsung

```
Andi tiba di Klinik Sehat Sentosa
Buka Lead Detail di HP

Klik "Log Visit" →
  LogVisitDialog terbuka:
    Purpose: "Demo produk CRM"
    Contact Person: Dr. Budi
    
  Klik "Check In" →
    GPS captured: -6.2088, 106.8456 ✅
    
  Upload 3 foto →
    Foto1: ruang meeting
    Foto2: demo layar
    Foto3: foto bersama tim
    
  Isi result setelah meeting:
    Result: "Demo berhasil, client terkesan dengan fitur laporan"
    Outcome: Very Positive
    Next Steps: "Kirim proposal harga dalam 3 hari"
    
  Klik "Check Out" →
    GPS captured ✅
    
  Submit →
    ✅ Visit Report VISIT-202603-00001 terbuat (draft → submitted)
    ✅ Activity AUTO-CREATED:
          Type: Visit
          Description: "Visit: Demo produk CRM — Demo berhasil, client terkesan..."
          Metadata: { photos: [...], check_in_at: "10:00", check_out_at: "11:30", outcome: "very_positive", ... }
    ✅ 3 foto muncul di Activity Timeline Lead Detail
    ✅ GPS badge "Checked in 10:00" muncul di timeline

Andi tidak perlu buka menu "Visit Reports" untuk report ini
Manager bisa approve dari menu Visit Reports (/crm/visits)
```

### Activity Timeline di Lead Detail (Setelah Sprint)

```
Tab Activities: [Klinik Sehat Sentosa]
─────────────────────────────────────
Today, 12 March 2026
  📍 Visit  "Demo produk CRM"          11:30
     ✅ Very Positive
     [📷][📷][📷] +0
     📞 Check-in 10:00  →  Check-out 11:30
     Contact: Dr. Budi  |  VISIT-202603-00001 →
  
  📞 Call   "Follow up appointment"     09:00

Yesterday, 11 March 2026
  📧 Email  "Kirim brosur produk"       16:30
─────────────────────────────────────
[+ Log Activity]  [📍 Log Visit]
```

---

## Hal-hal yang Perlu Diperhatikan

### Backward Compatibility
1. **Schedule yang sudah dibuat manual** — Tetap ada dan valid. Bedanya: tidak ada linked task_id. Tampilkan note "Manually created" di calendar.
2. **Visit Report yang sudah disubmit** — Tidak akan punya linked Activity (tidak retroactive). Hanya visit baru yang auto-create activity.
3. **Task tanpa due_date** — Schedule tidak dibuat. Task tetap valid tanpa schedule.
4. **Task tanpa AssignedTo** — Schedule tidak dibuat (tidak tahu employee).

### Edge Cases
5. **Task due_date diubah** — Update linked schedule. Jika schedule sudah completed, jangan update.
6. **Visit Report reject lalu resubmit** — Activity sudah ada dari submit pertama. Jangan duplicate. Cek by `visit_report_id` sebelum create.
7. **Visit tanpa foto** — Activity tetap dibuat, `photos: []` di metadata. Timeline tidak render photo section.
8. **GPS denied oleh user** — LogVisitDialog tetap bisa submit tanpa GPS (check_in/out lat/lng null).
9. **Concurrency: dua user menyubmit visit bersamaan** — Gunakan `FOR UPDATE` row lock di Visit submit endpoint.

### Security
10. **GPS data** — Jangan expose precise location ke semua user. Only employee owner + manager yang bisa lihat check-in coords.
11. **Foto upload** — Validasi magic bytes (existing handler), max 5 foto per visit.
12. **Activity metadata injection** — Serialize metadata via `json.Marshal` (Go), bukan string concatenation. Di frontend, parse via `JSON.parse` dalam try-catch.

---

## Prioritas Implementasi

| Priority | Phase | Effort | Description |
|----------|-------|--------|-------------|
| P0 | Phase 2 | Medium | Schedule auto-create dari Task (core pain point) |
| P0 | Phase 3 | Medium | Visit → Activity auto-log dengan foto |
| P0 | Phase 6 | Low | Hapus Create Schedule button, redirect sidebar |
| P1 | Phase 7 | Medium | Activity Timeline render foto & GPS badge |
| P1 | Phase 8 | Medium | Log Visit dialog dari Lead/Deal Detail |
| P1 | Phase 1 | Low | Task model add lead_id |
| P2 | Phase 5 | Low | Task form + list update untuk lead_id |
| P2 | Phase 9 | Medium | Tasks tab di Lead/Deal Detail |
| P3 | Phase 4 | Low | Tasks di Lead/Deal API response |
| P3 | Phase 10 | Low | i18n updates |
| P3 | Phase 11 | Low | Seeder updates |
| P3 | Phase 12 | Low | Postman + docs |

---

## Files yang Akan Berubah

### Backend (apps/api/)

| File | Action | Description |
|------|--------|-------------|
| `internal/crm/data/models/task.go` | MODIFY | Add `LeadID`, `Lead` fields |
| `internal/crm/domain/dto/task_dto.go` | MODIFY | Add `lead_id`, `TaskLeadInfo`, `leads` to form data |
| `internal/crm/data/repositories/task_repository.go` | MODIFY | Add `lead_id` filter, preload `Lead` |
| `internal/crm/domain/usecase/task_usecase.go` | MODIFY | Inject scheduleRepo, auto-create/update/complete/delete Schedule |
| `internal/crm/domain/usecase/visit_report_usecase.go` | MODIFY | Inject activityRepo, auto-create Activity on Submit |
| `internal/crm/presentation/routers.go` | MODIFY | Pass scheduleRepo + activityRepo ke respective usecases |
| `seeders/constants.go` | MODIFY | Add `VisitActivityTypeID` constant (if missing) |

### Frontend (apps/web/)

| File | Action | Description |
|------|--------|-------------|
| `src/features/crm/task/types/index.d.ts` | MODIFY | Add `lead_id`, `lead`, `TaskLeadInfo` |
| `src/features/crm/task/schemas/task.schema.ts` | MODIFY | Add `lead_id` field |
| `src/features/crm/task/components/task-form-dialog.tsx` | MODIFY | Add Lead selector |
| `src/features/crm/task/components/task-list.tsx` | MODIFY | Add Lead filter + column |
| `src/features/crm/task/hooks/use-tasks.ts` | MODIFY | Add `useTasksByLead`, `useTasksByDeal` hooks |
| `src/features/crm/task/services/task-service.ts` | MODIFY | Pass `lead_id` in requests |
| `src/features/crm/schedule/components/schedule-list.tsx` | MODIFY | Remove "Add Schedule" button, add info notice |
| `src/features/crm/activity/types/index.d.ts` | MODIFY | Add `VisitActivityMetadata` type |
| `src/features/crm/activity/utils.ts` | MODIFY | Add `parseActivityMetadata()` utility |
| `src/features/crm/lead/components/lead-detail.tsx` | MODIFY | Add Tasks tab + Log Visit button |
| `src/features/crm/deal/components/deal-detail-page.tsx` | MODIFY | Add Tasks tab + Log Visit button |
| `src/lib/navigation-config.ts` | MODIFY | Remove Schedules from CRM sidebar |
| `src/lib/route-validator.ts` | MODIFY | Mark `/crm/schedules` as deprecated redirect |

### Komponen Baru

| File | Description |
|------|-------------|
| `src/features/crm/visit-report/components/log-visit-dialog.tsx` | Simplified visit form dari lead/deal detail |
| `src/features/crm/activity/components/outcome-badge.tsx` | Reusable badge untuk visit outcome |

---

## Testing Checklist

### Backend Tests
- [ ] Task create dengan due_date + assigned_to → Schedule otomatis terbuat
- [ ] Task create tanpa due_date → Schedule TIDAK dibuat
- [ ] Task create tanpa assigned_to → Schedule TIDAK dibuat
- [ ] Task update due_date → linked Schedule terupdate
- [ ] Task cancelled → linked Schedule ter-cancel
- [ ] Task deleted → linked Schedule ter-delete
- [ ] Task completed → linked Schedule ter-complete
- [ ] Visit submit → Activity otomatis terbuat dengan metadata foto
- [ ] Visit resubmit (setelah reject) → Activity tidak duplicate
- [ ] Visit submit tanpa foto → Activity terbuat dengan `photos: []`
- [ ] Visit submit tanpa GPS → Activity terbuat tanpa koordinat
- [ ] Activity metadata valid JSON (termasuk edge case: foto URL dengan special chars)

### Frontend Tests
- [ ] Task form menampilkan Lead selector
- [ ] Task form pre-fill lead_id saat dibuka dari Lead Detail
- [ ] Schedule page redirect ke Tasks page (`/crm/schedules` → `/crm/tasks`)
- [ ] Calendar di Tasks page menampilkan auto-created schedules
- [ ] Activity Timeline menampilkan foto dari visit activity
- [ ] Activity Timeline menampilkan GPS badge
- [ ] Activity Timeline menampilkan OutcomeBadge
- [ ] Log Visit dialog capture GPS berhasil
- [ ] Log Visit dialog submit tanpa GPS (GPS denied) berhasil
- [ ] Setelah Log Visit, activity muncul di timeline tanpa reload manual
- [ ] Tasks tab di Lead Detail menampilkan tasks dengan lead_id
- [ ] Tasks tab di Deal Detail menampilkan tasks dengan deal_id
