# ERP Travel Planner Hardening Plan

# 1. CURRENT STATE SUMMARY

**Technical Summary**
The Travel Planner module (`apps/api/internal/travel_planner`) is currently a highly capable standalone operational tool. It features full itinerary construction, routing with TSP optimization utilizing Nearest Neighbor & Haversine formula, geolocation via Google Places/OSM integration, PDF generation, field expense logging, and CRM integration (Visit Report syncing through backfill logic). 

**Accounting Gap Summary**
Despite collecting financial figures (e.g., `BudgetAmount` and individual `TravelPlanExpense` amounts), the module operates independently of the core ERP Finance engine. 
- No financial entries are minted when expenses are recorded. 
- No disbursement (Cash Bank outflow) tracking when advance cash is provided to travelers.
- There is no formal reconciliation/settlement phase returning underspent funds or processing overspent employee reimbursement via Accounts Payable (AP).

**ERP Compliance Level**
- Operational Level: **High**
- Financial & Audit Compliance Level: **0%** 

---

# 2. TARGET STATE (ERP COMPLIANT DESIGN)

By upgrading the current architecture, the Travel Planner will become an enterprise-grade subset of Accountings & Operations (similar to SAP Travel Management or Odoo Expense).

**Full Lifecycle State Machine:**
1. **DRAFT:** Initial planning.
2. **PENDING_APPROVAL:** Awaits supervisor authorization.
3. **APPROVED (Pending Advance):** Trip is approved, awaiting finance disbursement.
4. **DISBURSED / ACTIVE:** Cash advanced is posted. Operational execution of trip.
5. **COMPLETED (Pending Settlement):** Operations ended, traveler submitted expenses, waiting for settlement check.
6. **SETTLED:** Final reconciliation. Journal entries executed. Missing/surplus funds routed to Payroll/AP/AR appropriately.
7. **CANCELLED:** Gracefully annulled trip.

**Financial Flow Diagram:**
```text
Travel Advance Draft -> Approved -> Finance Disbursement (Journal Advance)
     |
     v
Travel Active -> Operational (Track Expense Structuring)
     |
     v
Settlement Submission -> Manager Approval -> Financial Reconciliation -> (Journal Settlement)
```

**Integration Points with Finance Module:**
- `JournalEntryService`
- `PostingProfileService`
- Core accounting COAs via configuration.

---

# 3. FEATURE BREAKDOWN (DETAILED)

### Feature Name: 1. Travel Advance (Cash Advance / Kasbon)
### Description: Facility for travelers to request and receive prepayments structurally prior to departure.
### Module Impact: Travel Planner, Finance
### Files to Modify:
- `data/models/travel_plan.go`
- `domain/dto/travel_plan_dto.go`
- `presentation/handler/travel_plan_handler.go`
### Business Logic: Finance verifies `BudgetAmount` against internal policies, approves, and marks the trip `DISBURSED`.
### Accounting Impact: Deducts Bank asset, increases Employee Advance liability (Cash Advance).
### API Changes: `POST /api/v1/travel-plans/:id/disburse`
### DB Changes: Add `AdvanceAmount numeric`, `AdvanceDate time`, `AdvanceDocReference varchar` to `travel_plans`.
### Risk: High. Misalignment between disbursement date and journal date.
### Status: NOT_STARTED

### Feature Name: 2. Travel Expense → Journal Integration
### Description: Transform operational tracking into real recognized journal entries inside the core ledger.
### Module Impact: Travel Planner, Finance
### Files to Modify:
- `domain/usecase/travel_plan_usecase.go`
- `data/models/travel_plan.go`
### Business Logic: Validate receipts, aggregate amount by COA category (Meals, Transport), and prepare mapped array for Journaling.
### Accounting Impact: Direct P&L hit upon settlement recognition (Debit Expense, Credit Control Acct).
### API Changes: Implicit update during Expense sync.
### DB Changes: Add `JournalEntryID string`, `ReconciliationStatus enum` to `travel_plan_expenses`.
### Risk: Critical. Modifying un-pushed vs pushed expenses. Pushed expenses must lock the record.
### Status: NOT_STARTED

### Feature Name: 3. Travel Settlement (Reimbursement / Return)
### Description: Evaluate the net difference between `Travel Advance` and `Travel Expense`. Provide reimbursement to employees or record debt to the company.
### Module Impact: Travel Planner, Finance
### Files to Modify:
- `domain/usecase/travel_plan_usecase.go`
- `presentation/handler/travel_plan_handler.go`
### Business Logic: Triggered when Status shifted to `SETTLED`. Evaluates `TotalExpense - AdvanceAmount`.
### Accounting Impact: Net differences resolve against AP (Employee Payable) or AR (Employee Receivable).
### API Changes: `POST /api/v1/travel-plans/:id/settle`
### DB Changes: Add `SettlementAmount`, `SettlementJournalID`, `SettledAt` to `travel_plans`.
### Risk: High. Complex 3-way matching logic.
### Status: NOT_STARTED

### Feature Name: 4. Approval Workflow (Manager + Finance)
### Description: Multi-tier approval system enforcing oversight before financial execution.
### Module Impact: Travel Planner
### Files to Modify:
- `domain/usecase/travel_plan_usecase.go`
### Business Logic: Validate user role constraints. Managers approve operations, Finance approves budget/advance.
### Accounting Impact: Gatekeeper logic preventing unauthorized liabilities.
### API Changes: `PATCH /api/v1/travel-plans/:id/approve`
### DB Changes: Add `ApprovedBy string`, `FinanceApprovedBy string`, `ApprovedAt time.Time`.
### Risk: Medium. Role RBAC mismatch.
### Status: NOT_STARTED

### Feature Name: 5. Participant Normalization
### Description: Shift from Regex parsing in Notes field to a strict junction relational structure to enforce referential integrity.
### Module Impact: Travel Planner
### Files to Modify:
- `data/models/travel_plan.go`
- `domain/usecase/travel_plan_usecase.go`
### Business Logic: Load participants natively utilizing preloading. Reject invalid IDs. Protect against cascading hard deletes.
### Accounting Impact: None directly, however vital for identifying exact Employee targets for AP/AR accounts.
### API Changes: Update responses to output strictly parsed Participant list formats.
### DB Changes: New junction table `travel_plan_participants (travel_plan_id, employee_id)`.
### Risk: Medium. Breaking payload changes.
### Status: NOT_STARTED

### Feature Name: 6. Finance Posting Profile Integration
### Description: Configuration mappings dictating exactly which G/L COAs absorb the Travel Module impact.
### Module Impact: Finance
### Files to Modify: `apps/api/internal/finance/data/models/posting_profile.go`
### Business Logic: Setup `TRAVEL_EXPENSE_TRANSPORT`, `TRAVEL_EXPENSE_MEAL`, `TRAVEL_ADVANCE_EMPLOYEE`, `TRAVEL_SETTLEMENT_PAYABLE`.
### Accounting Impact: Correct G/L routing.
### API Changes: N/A.
### DB Changes: Updates inside Setting Seeders.
### Risk: Low.
### Status: NOT_STARTED

### Feature Name: 7. Status Machine Upgrade
### Description: Rigid transition logic (e.g. Can't jump to SETTLED from DRAFT).
### Module Impact: Travel Planner
### Files to Modify: `domain/usecase/travel_plan_usecase.go`
### Business Logic: State execution matrix logic gate.
### Accounting Impact: Prevents orphaned ledgers missing preceding advance data.
### API Changes: Transition endpoints.
### DB Changes: Update Status enumerations.
### Risk: Low.
### Status: NOT_STARTED

### Feature Name: 8. Audit Trail & Validation Enforcement
### Description: Protect data via strict immutability checks post payment processing.
### Module Impact: Travel Planner
### Files to Modify: All domains.
### Business Logic: Prevent edits on Trips and Expenses that correspond to `DISBURSED` or `SETTLED` phases. 
### Accounting Impact: Maintains absolute synchronization with immutable Journal Engine.
### API Changes: HTTP 403 on locked entities.
### DB Changes: Adding `Locked` bool toggle.
### Risk: Medium. Frontend UI logic disruption handling locks.
### Status: NOT_STARTED

### Feature Name: 9. Atomic Transaction Handling
### Description: Ensure Journal generation and Trip status updates execute inside solitary un-shatterable DB Transactions.
### Module Impact: Travel Planner
### Files to Modify: `domain/usecase/travel_plan_usecase.go`
### Business Logic: Wrap routines inside `tx.Transaction`.
### Accounting Impact: Guarantees neither Finance nor Travel database will diverge in an out-of-sync split-brain condition.
### API Changes: N/A.
### DB Changes: N/A.
### Risk: Low.
### Status: NOT_STARTED

---

# 4. ACCOUNTING DESIGN (CRITICAL)

**Reference Types:**
- `TRAVEL_ADVANCE`: Used for DP issuance.
- `TRAVEL_EXPENSE`: Used to aggregate intermediate expenses (optional, depending on deferred expense recognition rule).
- `TRAVEL_SETTLEMENT`: Final reckoning of expenses reversing the advance.

**Journal Workflow Example:**

**1. Advance Disbursement (Travel_Advance - Kasbon)**
When `Finance` issues Rp 5.000.000 for travel.
```text
Dr. Employee Cash Advance (Asset/Other Receivable)    5,000,000
    Cr. Operating Bank Account / Cash Account                         5,000,000
```

**2. Settlement Recognition (Travel_Settlement)**
When Trip `Completed`, expenses totaled Rp 6.000.000 (Pegawai Tombok).
```text
Dr. Travel Expense - Transportation                   2,000,000
Dr. Travel Expense - Accommodation                    3,000,000
Dr. Travel Expense - Meals                            1,000,000
    Cr. Employee Cash Advance (Reverse Setup)                         5,000,000
    Cr. Employee Reimbursement Payable (AP / Liability)               1,000,000
```

*Note: If the employee underspent (e.g. spent Rp 4.000.000), the remaining Rp 1.000.000 debit sits inside Cash Advance (Receivable) to be withheld during payroll, or settled by returning cash (Dr. Cash, Cr. Cash Advance).*

---

# 5. IMPLEMENTATION ROADMAP

### PHASE 1 – DATA & STRUCTURE FIX
- [ ] Implement Status Machine Matrix
- [ ] Establish `travel_plan_participants` Normalization & Migration
- [ ] Add basic Finance fields (Advance amount, locked status, linked entry flags) to models

### PHASE 2 – FINANCIAL INTEGRATION
- [ ] Build Posting Profile Seedings (TRAVEL_ADVANCE, TRAVEL_SETTLEMENT)
- [ ] Connect TravelUsecase with JournalEntryUsecase
- [ ] Implement Disbursement API

### PHASE 3 – WORKFLOW & APPROVAL
- [ ] Build Supervisor Approval
- [ ] Build Settlement Compilation (Tally logic for under/over expense math)
- [ ] Execute Settlement API Hook

### PHASE 4 – HARDENING & VALIDATION
- [ ] Attach Transaction atomic wrappers
- [ ] Lock endpoints from post-settlement modification
- [ ] Automated regression testing on COA balancings. 

---

# 6. PROGRESS TRACKING TABLE

| Feature | Task | Status | Verified By | Notes |
|--------|------|--------|------------|------|
| 1. Travel Advance | DB & Model Adjustment | NOT_STARTED | - | - |
| 1. Travel Advance | Disbursement API Logic | NOT_STARTED | - | Creates Journal |
| 2. Expense -> Sync | Mapping ExpenseType COA | NOT_STARTED | - | - |
| 3. Settlement | Settlement Tally Math Logic | NOT_STARTED | - | - |
| 3. Settlement | Settlement Journal Execution | NOT_STARTED | - | AP/AR handling |
| 4. Approval | State Matrix Execution | NOT_STARTED | - | - |
| 5. Participant Normal | Normalize Regex & Migrator | NOT_STARTED | - | - |
| 6. Posting Profile | Profile Settings Setup | NOT_STARTED | - | - |
| 7. Status Upgrade | Route Enforcement Rules | NOT_STARTED | - | - |
| 8. Audit Trail | Immutability DB lock checks| NOT_STARTED | - | - |
| 9. Transactions | Wrapper implementation | NOT_STARTED | - | - |

---

# 7. VERIFICATION CRITERIA
A task is legally `VERIFIED` only if:
1. Operational API logic completes HTTP 2xx.
2. Journal entries exist matching double-entry accounting rules (Dr-Cr equals).
3. No duplicate journals on rapid multi-click retries.
4. Changes reverse cleanly on intentional cancel flows.
5. All UI inputs reject out-of-order state transitions.

---

# 8. FINAL GOAL
End state equates to **Odoo Fleet/Expense** and **SAP Travel Management**. Employee plans a trip, acquires organizational authority via advance budget, logs physical operational metadata tied rigidly to financial expense line items, and finalizes with clear corporate ledger trails handling the AP/AR deficit or surplus smoothly. All without touching rogue API boundaries post-completion.


🔍 ANALISIS KEKURANGAN TRAVEL PLANNER (DEEP – TECHNICAL + BUSINESS + ACCOUNTING)
1. ❌ BUKAN ERP-COMPLIANT (MASIH TOOL OPERASIONAL)

Saat ini Travel Planner hanya:

itinerary
route optimization
expense logging (non-accounting)

👉 Masalah:

Tidak masuk ke accounting cycle (R2R / P2P / O2C)
Tidak berdampak ke:
Cash/Bank
Expense (P&L)
Liability (reimbursement)

📌 Kesimpulan:

Travel Planner saat ini = support tool, bukan financially accountable module

2. ❌ TIDAK ADA FINANCIAL STATE MACHINE
Saat ini:

Status hanya:

draft → active → completed

👉 Ini terlalu lemah untuk ERP.

Harusnya minimal:
draft
submitted
approved (manager)
disbursed (finance kasih uang)
in_progress
settled
closed

📌 Tanpa ini:

tidak bisa kontrol uang keluar
tidak bisa audit
3. ❌ TIDAK ADA CASH FLOW CONTROL
Problem:
BudgetAmount bukan transaksi
TravelPlanExpense tidak mengurangi kas

👉 Dampak:

Cash di sistem ≠ Cash real
Laporan keuangan jadi tidak valid
4. ❌ EXPENSE TIDAK TERJURNAL

Saat ini:

hanya insert ke table

Tidak ada:

journal entry
posting profile
COA mapping

📌 Ini melanggar prinsip:
👉 Every financial event must hit GL

5. ❌ TIDAK ADA ADVANCE / KASBON SYSTEM

Padahal real bisnis:

sebelum travel → karyawan dikasih uang

Saat ini:

tidak ada tracking DP
tidak ada outstanding balance

👉 Dampak:

tidak tahu siapa pegang uang berapa
tidak bisa audit
6. ❌ TIDAK ADA SETTLEMENT / REIMBURSEMENT FLOW

Kasus real:

DP 1jt
expense 1.2jt → perusahaan bayar 200k
atau expense 800k → karyawan balikin 200k

Saat ini:

tidak ada logika ini

👉 Ini CRITICAL di ERP

7. ❌ RELASI USER (PARTICIPANT) SANGAT BURUK

Saat ini:

disimpan dalam string [participants:uuid,uuid]

👉 Ini:

tidak relational
tidak safe
tidak auditable

📌 Harusnya:

travel_plan_participants table
8. ❌ NO APPROVAL / RBAC CONTROL

Tidak ada:

manager approval
finance approval

👉 Semua user bisa:

buat expense
set status
manipulasi data

📌 Risiko: fraud tinggi

9. ❌ TIDAK ADA LINK KE FINANCE ENGINE

Padahal kamu sudah punya:

posting profile
journal engine
idempotent journal

👉 Tapi Travel Planner:

tidak pakai semua itu

📌 Ini missed opportunity besar

10. ❌ TIDAK ADA ATOMICITY (VERY CRITICAL)

Misalnya:

expense dibuat
tapi journal gagal (karena belum ada)

👉 Tidak ada rollback logic