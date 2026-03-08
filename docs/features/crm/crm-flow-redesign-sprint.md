# CRM Flow Redesign Sprint Plan

> **Date:** 7 March 2026  
> **Objective:** Align CRM flow with ideal business journey: Lead → Activity → Convert → Pipeline/Deal → Task → Visit → Proposal → Deal Won → Customer  
> **Reference:** [crm-journey.md](../../ux-journey/crm.md) | [crm-integration-sprint-planning.md](../../crm-integration-sprint-planning.md)

---

## Gap Analysis: Current vs Ideal Flow

### Current Flow
```
Lead → Convert → Customer (direct)
Activities → Standalone page (separate from lead lifecycle)
Pipeline/Deal → Independent from lead conversion
```

### Ideal Flow (dari Journey UX)
```
Lead (New)
  ↓ Activity (calls, emails, visits — semua tertaut ke Lead ID)
  ↓ Status progression: New → Contacted → Qualified
  ↓ Convert Lead → Pipeline/Deal (bukan Customer langsung)
  ↓
Deal/Pipeline
  ↓ Stage: Qualification → Needs Analysis → Demo → Proposal → Negotiation
  ↓ Tasks, Visits, Visit Reports (tertaut ke Deal)
  ↓
Deal Won → Auto-create Customer + Contact
  ↓
Customer (Active)
  ↓ Projects, Invoices, Support, Contracts
```

### Perubahan yang Diperlukan

| Area | Status Saat Ini | Target | Impact |
|------|----------------|--------|--------|
| Lead Conversion | Lead → Customer langsung | Lead → Deal/Pipeline | Backend + Frontend |
| Activities Page | Standalone page `/crm/activities` | Dipindahkan ke header user tooltip (view-only) + embedded di Lead/Deal detail | Frontend + Seeder |
| Lead Detail | Tidak menampilkan activities | Menampilkan activity log yang tertaut lead_id | Frontend |
| Deal Detail | Tidak menampilkan activities | Menampilkan activity log yang tertaut deal_id | Frontend |
| Pipeline Stages | 5 stages (Qualification → Closed) | 7 stages (+Needs Analysis, +Demo) | Seeder |
| Lead Statuses | 6 statuses (termasuk "Proposal Sent") | 5 statuses (remove "Proposal Sent", karena proposal ada di pipeline stage) | Seeder |
| Converted Badge | Tidak ada visual clickable badge | Badge "Converted → Deal" yang clickable redirect ke deal detail | Frontend |
| Deal Won | Won → Convert to Quotation | Won → Auto-create Customer + bisa Convert to Quotation | Backend |
| Permission Seeder | `crm_activity.{read,create}` | `crm_activity.read` only (view-only, no CRUD dari UI) | Seeder |
| Navigation | Activities di sidebar CRM | Activities di header user tooltip + remove dari sidebar | Frontend |

---

## Sprint Breakdown

---

### Phase 1: Backend — Lead Conversion Redesign
> Lead sekarang convert ke Deal/Pipeline, bukan langsung ke Customer

- [x] **1.1 Update Lead Model** — Pastikan `DealID` field tracking sudah ada (sudah ada: `deal_id`)
- [x] **1.2 Update Lead Conversion Usecase** — Ubah `ConvertLead()` dari create Customer menjadi create Deal:
  - Buat Deal baru dari data Lead:
    - `Title`: Lead company name / full name
    - `PipelineStageID`: Set ke stage pertama (Qualification)
    - `Status`: "open"
    - `LeadID`: reference back ke lead
    - BANT fields inherited dari Lead
    - `AssignedTo`: Lead owner
    - `Value` & `Probability`: dari lead score/probability (jika ada)
  - Update lead:
    - Set `DealID` = new deal ID
    - Set `ConvertedAt`, `ConvertedBy`
    - Set status ke "Converted"
    - **JANGAN** create Customer lagi
  - Return created Deal data
- [x] **1.3 Update ConvertLeadRequest DTO** — Ubah payload:
  - Remove: `customer_id` (tidak perlu lagi)
  - Add: `pipeline_stage_id` (optional, default stage pertama)
  - Add: `deal_title` (optional, default dari lead name)
  - Add: `deal_value` (optional)
  - Keep: `notes`
- [x] **1.4 Update ConvertLeadResponse** — Return deal data setelah conversion
- [x] **1.5 Update Lead Mapper** — Pastikan `DealID`, `Deal` data di-map ke response
- [x] **1.6 Update Lead FormData** — Remove `customers` dari form data convert (tidak butuh customer selection lagi), add `pipeline_stages`
- [x] **1.7 Add Activities to Lead Detail Response** — Endpoint GET `/crm/leads/:id` harus include `activities` yang tertaut `lead_id`:
  - Preload `Activities` (with ActivityType, Employee) pada lead detail query
  - Tambahkan `Activities []ActivityResponse` ke LeadDetailResponse DTO
  - Limit ke 50 latest activities (paginated jika perlu)

---

### Phase 2: Backend — Pipeline Stage & Status Seeder Update

- [x] **2.1 Update Pipeline Stages Seeder** — Tambah 2 stage baru sesuai journey:
  ```
  1. Qualification    (20%) — sudah ada
  2. Needs Analysis   (35%) — BARU
  3. Demo             (50%) — BARU  
  4. Proposal         (65%) — sudah ada (update probability dari 50% → 65%)
  5. Negotiation      (80%) — sudah ada (update probability dari 75% → 80%)
  6. Closed Won       (100%) — sudah ada
  7. Closed Lost      (0%) — sudah ada
  ```
  - Tambah constant: `PipelineStageNeedsAnalysisID`, `PipelineStageDemoID`
  - Update ordering number semua stages
- [x] **2.2 Update Lead Statuses Seeder** — Remove "Proposal Sent" (pindah ke pipeline stages):
  ```
  1. New              (score=10, default) — tetap
  2. Contacted        (score=30) — tetap
  3. Qualified        (score=60) — update score dari 50 → 60
  4. Converted        (score=100, is_converted) — tetap
  5. Lost             (score=0) — tetap
  ```
  - "Proposal Sent" dihapus karena proposal tracking ada di pipeline stage level
- [x] **2.3 Update Lead Status Description** — "Converted" description dari "converted to customer" menjadi "converted to pipeline/deal"

---

### Phase 3: Backend — Deal Won → Auto-Create Customer

- [x] **3.1 Update Deal MoveStage Usecase** — Saat deal pindah ke stage "Closed Won":
  - **Auto-create Customer** dari deal data (jika `deal.CustomerID` masih nil):
    - Name: Deal title / customer_name field
    - ContactPerson: Deal contact name
    - Source: Lead data (jika ada lead_id)
    - Geographic data dari lead (jika ada)
    - BusinessType, Area, PaymentTerms dari lead defaults
  - **Auto-create Contact** under customer:
    - Name, Phone, Email dari deal/lead contact data
    - Notes: "Auto-created from deal conversion (DEAL-XXX)"
  - Set `deal.CustomerID` = new customer ID
  - Optional: User bisa skip auto-create jika customer sudah dipilih saat create deal
- [x] **3.2 Keep ConvertToQuotation Flow** — Tetap bisa convert ke quotation setelah deal won (existing flow)

---

### Phase 4: Backend — Activity Permissions Update

- [ ] **4.1 Update Permission Seeder** — Ubah `crm_activity` permissions:
  - Keep: `crm_activity.read` (view-only dari header tooltip dan embedded di lead/deal detail)
  - Remove dari role assignment: `crm_activity.create` (activity tetap bisa dibuat secara programmatic dari backend saat log action, tapi UI tidak expose CRUD)
  - Note: Backend endpoint POST `/crm/activities` tetap ada tapi hanya untuk internal use / embedded form di lead/deal detail
- [ ] **4.2 Update Activity List Endpoint** — Add filter `employee_id` agar header tooltip bisa query activities milik user yang login:
  - `GET /crm/activities?employee_id={me}` → semua activities user
  - Already supports `lead_id`, `deal_id`, `customer_id` filters

---

### Phase 5: Backend — Add Activity from Lead/Deal Detail

- [ ] **5.1 Add Inline Activity Creation** — Activity bisa dibuat langsung dari lead detail dan deal detail:
  - Endpoint tetap: `POST /crm/activities`
  - FE akan pre-fill `lead_id` atau `deal_id` secara otomatis
  - Activity types tetap dari dropdown (Call, Email, Meeting, Visit, Follow Up)
- [ ] **5.2 Add Activities to Deal Detail Response** — Sama seperti lead, deal detail harus include activities:
  - Preload `Activities` pada deal detail query
  - Filter by `deal_id`

---

### Phase 6: Frontend — Lead Conversion Redesign

- [x] **6.1 Redesign LeadConvertDialog** — Ubah dari "Convert to Customer" menjadi "Convert to Pipeline":
  - Title: "Convert Lead to Pipeline"
  - Remove: Customer dropdown selection
  - Add: Pipeline stage selection (default: first stage / Qualification)
  - Add: Deal title field (pre-filled dari lead company name)
  - Add: Deal value field (optional)
  - Keep: Notes field
  - Button: "Convert to Pipeline" (bukan "Convert to Customer")
- [x] **6.2 Update useConvertLead Hook** — Update mutation payload sesuai DTO baru
- [x] **6.3 Update Lead Service** — Update `convert()` method payload type
- [x] **6.4 Update Lead Types** — Update `ConvertLeadData` interface:
  ```typescript
  interface ConvertLeadData {
    pipeline_stage_id?: string;
    deal_title?: string;
    deal_value?: number;
    notes?: string;
  }
  ```
- [x] **6.5 Update Lead FormData Types** — Replace `customers` dengan `pipeline_stages` di form data

---

### Phase 7: Frontend — Lead Detail Redesign (Activities Embedded)

- [x] **7.1 Add Activity Timeline Tab** — Di lead detail, tambah tab "Activities" yang menampilkan:
  - Timeline view semua activities yang tertaut ke lead_id
  - Setiap entry: icon type, title, result/notes, timestamp, employee name
  - Sorted by newest first
  - Badge untuk activity type (Call, Email, Visit, Meeting, Follow Up)
- [x] **7.2 Add "Log Activity" Button** — Di lead detail, tambah tombol untuk log activity baru:
  - Quick form: Type dropdown, Title, Result, Notes
  - Auto-fill `lead_id` dari current lead
  - Setelah submit, refresh activity timeline
- [x] **7.3 Add Converted Badge** — Jika lead sudah converted:
  - Tampilkan badge/chip "Converted → Pipeline" dengan icon link
  - Badge clickable → redirect ke `/crm/pipeline/{deal_id}` (deal detail page)
  - Badge color: hijau (success variant)
  - Tampilkan di header area lead detail dan juga di lead list table
- [x] **7.4 Update Lead List Table** — Tambah kolom/indicator:
  - "Converted" badge di status column jika lead sudah converted
  - Badge clickable → navigate ke deal detail
  - Tooltip: "View in Pipeline: {deal title}"

---

### Phase 8: Frontend — Deal Detail Enhancement (Activities + Customer Info)

- [ ] **8.1 Add Activity Timeline Tab** — Di deal detail, tambah tab "Activities":
  - Same component reuse dari lead detail activity timeline
  - Filter by `deal_id`
- [ ] **8.2 Add "Log Activity" Button** — Di deal detail header:
  - Same form component, auto-fill `deal_id`
- [ ] **8.3 Show Lead Origin Badge** — Jika deal berasal dari lead conversion:
  - Badge "From Lead: {lead_code}" clickable → navigate ke lead detail
  - Tampilkan di deal detail header/sidebar
- [ ] **8.4 Show Customer Created Badge** — Saat deal won dan customer auto-created:
  - Badge "Customer Created: {customer_name}" clickable → navigate ke customer detail
  - Tampilkan setelah deal won

---

### Phase 9: Frontend — Activities Migration (Sidebar → Header Tooltip)

- [ ] **9.1 Remove Activities dari Sidebar CRM** — Hapus entry di navigation-config.ts:
  ```typescript
  // REMOVE:
  { name: "Activities", url: "/crm/activities", icon: "activity", permission: "crm_activity.read" }
  ```
- [ ] **9.2 Add Activities Button di Header User Tooltip** — Di user popover (sebelah Settings & Logout):
  - Tambah tombol "My Activities" dengan icon Activity
  - Klik → buka dialog/sheet yang menampilkan semua activities dari user login
  - View-only (no create/edit/delete dari sini)
  - Sorted by newest first
  - Infinite scroll atau pagination
  - Filter by type (Call, Email, Visit, Meeting, Follow Up)
  - Filter by date range
- [ ] **9.3 Create ActivityFeedDialog Component** — Dialog/Sheet fullscreen untuk My Activities:
  - Fetch `GET /crm/activities?employee_id={current_user_employee_id}`
  - Timeline view dengan grouping per hari
  - Setiap entry menampilkan:
    - Activity type icon + badge
    - Title + result
    - Related entity link (Lead name, Deal title, Customer name)
    - Timestamp
  - Clicking entity link → navigate ke entity detail
- [ ] **9.4 Keep Activity Page Route** — Jangan hapus route `/crm/activities` dulu (backward compatibility), tapi redirect ke '/crm/leads' atau tampilkan empty state dengan info bahwa activities dipindah ke header
- [ ] **9.5 Update Route Validator** — Remove `/crm/activities` dari route validator (atau mark sebagai deprecated redirect)

---

### Phase 10: Frontend — Converted Badge Component (Reusable)

- [x] **10.1 Create ConvertedBadge Component** — Reusable badge component:
  ```typescript
  interface ConvertedBadgeProps {
    type: "lead-to-deal" | "deal-to-quotation" | "deal-to-customer";
    targetId: string;
    targetLabel: string; // e.g., "DEAL-202603-00001" atau "PT Klinik Sehat"
    targetUrl: string;   // e.g., "/crm/pipeline/xxx" atau "/customers/xxx"
  }
  ```
  - Visual: Badge/chip with link icon
  - Hover: Tooltip dengan target detail
  - Click: Navigate ke target URL
  - Color coding per type:
    - `lead-to-deal`: Blue (info)
    - `deal-to-quotation`: Purple (special)
    - `deal-to-customer`: Green (success)
- [x] **10.2 Integrate ConvertedBadge di Lead Detail** — Tampilkan setelah lead converted
- [x] **10.3 Integrate ConvertedBadge di Lead List** — Tampilkan di baris tabel lead yang sudah converted
- [x] **10.4 Integrate ConvertedBadge di Deal Detail** — Tampilkan untuk:
  - Origin: "From Lead: LEAD-XXX" (link back ke lead)
  - Result: "Converted to Quotation: QUO-XXX" (existing)
  - Customer: "Customer Created: PT XXX" (saat deal won)
- [x] **10.5 Integrate ConvertedBadge di Kanban Card** — Tampilkan mini badge di deal card jika sudah converted

---

### Phase 11: Seeder & Data Migration

- [ ] **11.1 Update Pipeline Stage Seeder** — Sesuai Phase 2.1
- [ ] **11.2 Update Lead Status Seeder** — Sesuai Phase 2.2
- [ ] **11.3 Update Permission Seeder** — Update role assignments:
  - Admin: Keep `crm_activity.read`
  - Manager: Keep `crm_activity.read`
  - Staff: Keep `crm_activity.read`
  - Remove `crm_activity.create` dari semua role assignments (atau keep tapi hidden dari standalone UI)
  - Note: `crm_activity.create` masih exist sebagai permission tapi tidak di-assign ke role by default (untuk internal/embedded use)
- [ ] **11.4 Update Lead Seeder** — Update sample leads:
  - LeadID5 (yang sudah converted): Set `deal_id` instead of `customer_id` sebagai conversion target
  - Add sample activity logs untuk beberapa leads
- [ ] **11.5 Update Deal Seeder** — Update sample deals:
  - Link beberapa deals ke leads (`lead_id` field)
  - Sesuaikan stage IDs dengan stages baru (Needs Analysis, Demo)
- [ ] **11.6 Add Activity Seeder** — Buat sample activities tertaut ke leads dan deals:
  - Lead activities: Call (New → Contacted), Email follow-up, Meeting (Qualified)
  - Deal activities: Demo scheduled, Proposal sent, Negotiation call

---

### Phase 12: i18n Updates

- [ ] **12.1 Update Lead i18n** — Tambah/ubah translation keys:
  - `convertToPipeline`, `convertToDeal` (ganti `convertToCustomer`)
  - `dealTitle`, `dealValue`, `pipelineStage`
  - `convertedToDeal`, `viewInPipeline`
  - `activityTimeline`, `logActivity`
- [ ] **12.2 Update Deal i18n** — Tambah translation keys:
  - `fromLead`, `customerCreated`
  - `activityTimeline`, `logActivity`
- [ ] **12.3 Update Activity i18n** — Tambah translation keys:
  - `myActivities`, `activityFeed`
  - `relatedEntity`, `viewEntity`
- [ ] **12.4 Update Common Header i18n** — Tambah:
  - `myActivities` untuk header tooltip button

---

### Phase 13: Postman & Documentation

- [ ] **13.1 Update Postman Collection** — Update endpoints:
  - `POST /crm/leads/:id/convert` — new request/response body
  - Document new activity filters
  - Document deal won auto-create customer behavior
- [ ] **13.2 Update Feature Documentation** — Update `docs/features/crm/`:
  - Lead conversion flow
  - Activity lifecycle
  - Pipeline stages
- [ ] **13.3 Update Sprint Planning** — Update `crm-integration-sprint-planning.md` dengan sprint ini

---

## UX Journey Setelah Redesign

### Scenario: Sales Andi — Dari Lead Sampai Customer

#### 1. Andi Menemukan Lead Baru
```
Andi buka CRM → Leads
Klik "Generate Leads" → Google Maps → "Klinik Semarang"
Import 5 leads → Status: NEW
```

#### 2. Andi Mulai Menghubungi Lead
```
Andi buka Lead Detail: "Klinik Sehat Sentosa"
Status: NEW

Klik "Log Activity" →
  Type: Call
  Title: "Telepon perkenalan"
  Result: "Tertarik melihat demo sistem"
  Notes: "Dr. Budi pengambil keputusan"

CRM auto-update: Status → CONTACTED
Activity muncul di timeline lead detail
```

#### 3. Lead Di-qualify
```
Andi update BANT checklist:
✅ Budget Confirmed
✅ Authority Confirmed (Dr. Budi)
✅ Need Confirmed
⬜ Time (belum pasti kapan)

Lead Score naik → 75%
Andi klik status step: QUALIFIED

Log Activity →
  Type: Meeting
  Title: "Meeting online demo"
  Result: "Tertarik, minta proposal"
```

#### 4. Lead Convert ke Pipeline
```
Lead sudah mature → Andi klik "Convert to Pipeline"

Dialog muncul:
  Pipeline Stage: Qualification (default)
  Deal Title: "Klinik Sehat Sentosa - CRM System" (pre-filled)
  Deal Value: Rp 120.000.000
  Notes: "Lead berkualitas, Dr. Budi decision maker"

Klik "Convert" →
  ✅ Deal DEAL-202603-00001 dibuat
  ✅ Lead status → CONVERTED
  ✅ Badge muncul: "Converted → Pipeline: DEAL-202603-00001" (clickable)
  ✅ BANT data inherited ke deal
```

#### 5. Deal Masuk Pipeline Kanban
```
Andi buka Pipeline →
  Kanban Board
  
  [Qualification]     [Needs Analysis]  [Demo]  [Proposal]  [Negotiation]  [Won]  [Lost]
  ┌──────────────┐
  │ Klinik Sehat │
  │ Rp 120jt     │
  │ 20% prob     │
  │ 🏷️ From Lead │
  └──────────────┘

Andi drag ke "Demo" stage →
  Dialog: Reason for move
  "Client setuju untuk demo on-site"
  
  Stage moved → Probability auto-update 50%
```

#### 6. Andi Log Activity dari Deal
```
Di Deal Detail → Tab Activities:
  Klik "Log Activity" →
    Type: Visit
    Title: "Demo CRM on-site"
    Result: "Demo berhasil, client impressed"
    Notes: "Request proposal formal"

Activity muncul di deal timeline
(juga muncul di "My Activities" header tooltip)
```

#### 7. Visit Report
```
Andi buat Visit Report (dari menu Visit Reports):
  Location: Klinik Sehat Sentosa
  Check-in GPS ✅
  Meeting notes, photos
  Check-out GPS ✅
  
  Visit report ter-link ke deal
```

#### 8. Deal Won → Customer Otomatis
```
Setelah negosiasi berhasil:
Andi move stage → "Closed Won"

CRM otomatis:
  ✅ Customer "Klinik Sehat Sentosa" dibuat (dari data lead/deal)
  ✅ Contact "Dr. Budi" dibuat under customer
  ✅ Deal.CustomerID ter-set
  ✅ Badge: "Customer Created: Klinik Sehat Sentosa" (clickable)

Andi bisa lanjut:
  Convert Deal → Sales Quotation (existing flow)
```

#### 9. Activity Feed di Header
```
Andi klik avatar → Tooltip:
  ┌────────────────────┐
  │ Andi Prasetyo       │
  ├────────────────────┤
  │ 📋 My Activities    │ ← BARU
  │ ⚙️ Settings         │
  │ 🚪 Logout           │
  └────────────────────┘

Klik "My Activities" → Sheet muncul:
  ┌─────────────────────────────────────────────┐
  │ My Activities                          ✕    │
  ├─────────────────────────────────────────────┤
  │ Filter: [All Types ▾] [Last 7 days ▾]      │
  ├─────────────────────────────────────────────┤
  │ Today                                       │
  │ 📞 Call — "Follow up Klinik Medika"         │
  │    → Lead: Klinik Medika Jaya               │
  │    14:30                                    │
  │                                             │
  │ 🗓️ Meeting — "Demo CRM on-site"            │
  │    → Deal: DEAL-202603-00001                │
  │    10:00                                    │
  │                                             │
  │ Yesterday                                   │
  │ 📧 Email — "Kirim proposal"                 │
  │    → Deal: DEAL-202603-00001                │
  │    16:00                                    │
  └─────────────────────────────────────────────┘
  
  View-only, no CRUD
  Klik entity link → navigate ke detail
```

---

## Hal-hal yang Teridentifikasi & Tidak Boleh Terlewat

### Yang Sudah Dibahas User:
1. ✅ Lead convert ke Pipeline (bukan Customer)
2. ✅ Activity page dipindah ke header tooltip (view-only)
3. ✅ Lead detail embed activities
4. ✅ Update seeder stages & statuses
5. ✅ Clickable converted badge
6. ✅ Permission update (activity view-only)

### Yang Teridentifikasi Tambahan:
7. ✅ **Deal Won → Auto-create Customer** — Karena lead tidak lagi create customer, customer harus dibuat saat deal won (end of funnel)
8. ✅ **Deal Detail embed activities** — Sama seperti lead, deal juga perlu activity timeline
9. ✅ **Lead-to-Deal backlink** — Deal harus menampilkan badge/link kembali ke lead asal
10. ✅ **Activity Seeder** — Perlu seed sample activities yang tertaut ke leads dan deals
11. ✅ **Lead FormData update** — Remove customers, add pipeline_stages di form data convert
12. ✅ **Embedded Activity Form** — Activity bisa di-log langsung dari lead/deal detail (bukan hanya dari standalone page)
13. ✅ **i18n updates** — Translation keys baru untuk semua UI changes
14. ✅ **Lead "Proposal Sent" status removal** — Proposal tracking pindah ke pipeline stage level (avoid redundancy)

### Potential Edge Cases yang Perlu Dihandle:
15. **Existing converted leads** — Leads yang sudah convert ke customer (data historis): tetap tampilkan badge "Converted → Customer: {name}" untuk backward compatibility
16. **Deal tanpa Lead origin** — Deal bisa dibuat langsung tanpa convert dari lead (manual create deal tetap bisa)
17. **Multiple activities per entity** — Activity timeline harus handle volume besar (pagination/infinite scroll)
18. **Deal Won dengan Customer sudah exist** — Jika deal sudah punya CustomerID (dipilih saat create), skip auto-create customer

---

## Prioritas Implementasi

| Priority | Phase | Effort | Description |
|----------|-------|--------|-------------|
| P0 | Phase 1 | High | Backend Lead Conversion redesign (critical path change) |
| P0 | Phase 2 | Low | Seeder updates (stages & statuses) |
| P0 | Phase 6 | Medium | Frontend Lead Convert Dialog redesign |
| P1 | Phase 3 | Medium | Deal Won → Auto-create Customer |
| P1 | Phase 7 | Medium | Lead Detail — Activity timeline + Log Activity |
| P1 | Phase 10 | Medium | ConvertedBadge reusable component |
| P1 | Phase 11 | Low | Seeder & permission updates |
| P2 | Phase 8 | Medium | Deal Detail — Activity timeline + badges |
| P2 | Phase 9 | Medium | Activities migration to header tooltip |
| P2 | Phase 4 | Low | Activity permission updates |
| P3 | Phase 5 | Low | Inline activity creation from lead/deal |
| P3 | Phase 12 | Low | i18n updates |
| P3 | Phase 13 | Low | Documentation & Postman |

---

## Files yang Akan Berubah

### Backend (apps/api/)
| File | Action | Description |
|------|--------|-------------|
| `internal/crm/domain/usecase/lead_usecase.go` | MODIFY | Convert logic: Customer → Deal |
| `internal/crm/domain/dto/lead_dto.go` | MODIFY | Update ConvertLeadRequest/Response |
| `internal/crm/domain/mapper/lead_mapper.go` | MODIFY | Map activities, deal data |
| `internal/crm/data/repositories/lead_repository.go` | MODIFY | Preload Activities on detail |
| `internal/crm/domain/usecase/deal_usecase.go` | MODIFY | Auto-create Customer on Won |
| `internal/crm/data/repositories/deal_repository.go` | MODIFY | Preload Activities on detail |
| `internal/crm/domain/dto/deal_dto.go` | MODIFY | Add activities to response |
| `seeders/crm_seeder.go` | MODIFY | Update stages, statuses |
| `seeders/constants.go` | MODIFY | Add new stage IDs |
| `seeders/permission_seeder.go` | MODIFY | Update activity permissions |
| `seeders/crm_lead_seeder.go` | MODIFY | Update lead conversion data |
| `seeders/crm_deal_seeder.go` | MODIFY | Link deals to leads, new stages |

### Frontend (apps/web/)
| File | Action | Description |
|------|--------|-------------|
| `src/features/crm/lead/components/lead-convert-dialog.tsx` | MODIFY | Convert to Pipeline flow |
| `src/features/crm/lead/components/lead-detail.tsx` | MODIFY | Add activity timeline, converted badge |
| `src/features/crm/lead/components/lead-list.tsx` | MODIFY | Add converted badge column |
| `src/features/crm/lead/types/index.d.ts` | MODIFY | Update conversion types |
| `src/features/crm/lead/services/lead-service.ts` | MODIFY | Update convert payload |
| `src/features/crm/lead/hooks/use-leads.ts` | MODIFY | Update convert hook |
| `src/features/crm/deal/components/deal-detail-page.tsx` | MODIFY | Add activity tab, badges |
| `src/features/crm/deal/components/deal-card.tsx` | MODIFY | Add converted mini badge |
| `src/features/crm/deal/types/index.d.ts` | MODIFY | Add activity types |
| `src/features/crm/activity/components/` | ADD | ActivityFeedDialog, ActivityTimeline (reusable) |
| `src/components/layouts/dashboard-layout.tsx` | MODIFY | Add "My Activities" to user popover |
| `src/lib/navigation-config.ts` | MODIFY | Remove Activities from CRM sidebar |
| `src/lib/route-validator.ts` | MODIFY | Update routes |
| `src/features/crm/lead/i18n/en.ts` | MODIFY | New keys |
| `src/features/crm/lead/i18n/id.ts` | MODIFY | New keys |
| `src/features/crm/deal/i18n/en.ts` | MODIFY | New keys |
| `src/features/crm/deal/i18n/id.ts` | MODIFY | New keys |
| `src/features/crm/activity/i18n/en.ts` | MODIFY | New keys |
| `src/features/crm/activity/i18n/id.ts` | MODIFY | New keys |

### Komponen Baru
| File | Description |
|------|-------------|
| `src/components/crm/converted-badge.tsx` | Reusable clickable badge for conversion status |
| `src/features/crm/activity/components/activity-timeline.tsx` | Reusable timeline component (used in lead/deal detail) |
| `src/features/crm/activity/components/activity-feed-dialog.tsx` | Header tooltip dialog for "My Activities" |
| `src/features/crm/activity/components/log-activity-form.tsx` | Inline form for logging activities from lead/deal |

---

## Testing Checklist

### Backend Tests
- [ ] Lead convert creates Deal (not Customer)
- [ ] Lead convert sets correct BANT inheritance
- [ ] Lead convert sets correct status (Converted)
- [ ] Deal won auto-creates Customer when no existing customer
- [ ] Deal won skips customer creation when customer exists
- [ ] Lead detail includes activities preload
- [ ] Deal detail includes activities preload
- [ ] Activity filter by employee_id works
- [ ] New pipeline stages have correct ordering and probability

### Frontend Tests
- [ ] Lead convert dialog shows pipeline stage selection
- [ ] Lead detail shows activity timeline
- [ ] Lead detail "Log Activity" creates activity with lead_id
- [ ] Converted badge navigates to correct entity
- [ ] Deal detail shows activity timeline
- [ ] "My Activities" in header popover opens dialog
- [ ] Activity feed shows grouped-by-day timeline
- [ ] Activities menu removed from CRM sidebar
- [ ] Backward compatibility: existing converted leads show customer badge
