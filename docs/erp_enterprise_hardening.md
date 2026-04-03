# ERP Enterprise Hardening Plan: Finance (Banking & Payments)

---

### 🔐 HARDENING TASK LIST (MANDATORY)

#### Task ID: PAY-001
- **Module:** Finance (Banking & Payments)
- **Priority:** CRITICAL
- **Description:** Integrate Payment with Journal Engine. Replace manual journal creation natively bypassing core logic.
- **Technical Scope:** `finance/domain/usecase/payment_usecase.go` (Function `Approve`)
- **Acceptance Criteria:** 
  - [x] No `tx.Create(&financeModels.JournalEntry{...})` in `payment_usecase`.
  - [x] `journalEntryService.PostOrUpdateJournal` is invoked.
  - [x] ReferenceType and ReferenceID strictly passed down.
- **Status:** VERIFIED

#### Task ID: PAY-002
- **Module:** Finance
- **Priority:** CRITICAL
- **Description:** Enforce Journal Idempotency.
- **Technical Scope:** `finance/domain/usecase/journal_entry_usecase.go` (Function `PostOrUpdateJournal`)
- **Acceptance Criteria:**
  - [x] DB constraint handles `reference_type` and `reference_id` uniquely for non-manual journals.
  - [x] Prevents double journal entry generation.
- **Status:** VERIFIED

#### Task ID: PAY-003
- **Module:** Finance (Banking & Payments)
- **Priority:** HIGH
- **Description:** Implement DB Locking (Pessimistic Lock)
- **Technical Scope:** `finance/domain/usecase/payment_usecase.go` (Function `Approve`)
- **Acceptance Criteria:**
  - [x] Payment retrieval uses `FOR UPDATE`.
  - [x] Prevents concurrent identical `Approve` API strikes.
- **Status:** VERIFIED

#### Task ID: PAY-004
- **Module:** Finance (Banking & Payments)
- **Priority:** HIGH
- **Description:** Enforce Strict Allocation Reference.
- **Technical Scope:** `finance/domain/usecase/payment_usecase.go` (Function `Create` and `Update`)
- **Acceptance Criteria:**
  - [x] `PaymentAllocation` must require `reference_type` and `reference_id` strictly.
  - [x] Ensures payment allocation targets valid AP / Purchase Invoice.
- **Status:** VERIFIED

#### Task ID: PAY-005
- **Module:** Finance (Banking & Payments)
- **Priority:** MEDIUM
- **Description:** Implement Payment Reverse Flow.
- **Technical Scope:** `finance/domain/usecase/payment_usecase.go` (New Function `Reverse`)
- **Acceptance Criteria:**
  - [x] New status `REVERSED` implemented.
  - [x] Hard deletion of `Posted` payments is blocked.
  - [x] Flow utilizes `ReverseJournal()`.
- **Status:** VERIFIED

#### Task ID: PAY-006
- **Module:** Finance
- **Priority:** HIGH
- **Description:** Validate Accounting Mapping.
- **Technical Scope:** `finance/domain/usecase/payment_usecase.go`
- **Acceptance Criteria:**
  - [x] Allocations correspond identically to debit offsets.
  - [x] Selected `BankAccount` issues matching unified credits.
  - [x] Ledger equals mathematically.
- **Status:** VERIFIED

#### Task ID: PAY-007
- **Module:** Finance
- **Priority:** MEDIUM
- **Description:** Add Concurrency & Failure Test.
- **Technical Scope:** Backend Test Files `payment_usecase_test.go`
- **Acceptance Criteria:**
  - [x] Test ensures double approval rejects nicely.
  - [x] Rollback restores cleanly without phantom line allocations.
- **Status:** VERIFIED

#### Task ID: PAY-008
- **Module:** Finance (UI/UX)
- **Priority:** HIGH
- **Description:** Eliminate Duplicate Cash Bank Journal Entry Point.
- **Technical Scope:** Sidebar Menu Seeders, Next.js UI Frontend Menus (`apps/web/src/features/finance/navigation` / `apps/api/seeders/menu_seeder.go`)
- **Acceptance Criteria:**
  - [x] No visible "Cash Bank Journal" menu inside Banking & Payments.
  - [x] No endpoint mapping allows manual injection from Banking interface.
  - [x] Core backend routes for Cash Bank Journal remain intact internally.
  - [x] Single entry flow solely preserved in Accounting module.
- **Status:** VERIFIED

---

### 📊 PROGRESS TRACKING TABLE

| Task ID | Description | Status | Verified By | Notes |
|--------|------------|--------|------------|------|
| **PAY-001** | Integrate Payment with Journal | VERIFIED | Antigravity AI | Done replacing tx.Create |
| **PAY-002** | Enforce Journal Idempotency | VERIFIED | Antigravity AI | Inherited from Engine |
| **PAY-003** | Implement DB Locking | VERIFIED | Antigravity AI | Added FOR UPDATE |
| **PAY-004** | Enforce Strict Reference | VERIFIED | Antigravity AI | Modified Payment DTO & validation |
| **PAY-005** | Implement Payment Reverse | VERIFIED | Antigravity AI | Added Reverse(), blocks delete |
| **PAY-006** | Validate Accounting Mapping | VERIFIED | Antigravity AI | Checked & enforced by journalUC |
| **PAY-007** | Concurrency & Failure Test | VERIFIED | Antigravity AI | SQLite locked test ensures 1 entry |
| **PAY-008** | Eliminate Duplicate Entry Point | VERIFIED | Antigravity AI | Updated navigation and seeder |

---

### 🔍 VERIFICATION RULE (VERY IMPORTANT)

For each step executed:
1. Cannot proceed to the sequentially next ID until current is **VERIFIED**.
2. Must explain file modifications clearly (Before vs. After).
3. Test case scenarios must be successfully executed.
4. Cannot break downstream boundaries.
