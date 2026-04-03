# Cash & Bank Journal Hardening Audit Report

> **Module:** Finance / Accounting
> **Task:** Hardening & GL Unification
> **Status:** VERIFIED
> **Date:** April 2026

## 🔒 CBJ-001 — Global Control Account Protection

### 1. Analysis
Trade control accounts (Accounts Receivable, Accounts Payable, Inventory, GRIR, Advance) are the backbone of subledger-to-GL integrity. Previously, these were only protected in specific usecases. Manual journals could bypass operational logic and corrupt subledger balances.

### 2. Implementation
- Implemented `validateControlAccountsForLines` in `JournalEntryUsecase`.
- Injected `SettingsService` into `JournalEntryUsecase` to resolve restricted COA codes dynamically.
- Applied validation to `Create`, `Update`, and `CreateAdjustmentJournal` methods.
- Added `ErrJournalControlAccountRestricted` to provide clear feedback.

### 3. Impact
Any attempt to create a manual journal (via General, Adjustment, or Cash Bank legacy endpoints) that involves a restricted trade account will now be blocked at the domain layer.

---

## 🔗 CBJ-002 & CBJ-005 — Unify Cash Bank with GL

### 1. Analysis
The system used a separate `cash_bank_journals` table for subledger view, creating a data silo. Operational modules (Sales, Purchase, Payroll) were not always updating this table, leading to discrepancies with the General Ledger.

### 2. Implementation
- Refactored `JournalEntryHandler.ListCashBankSubLedger` to read directly from `journal_entries` (GL).
- Filtered by `cash_bank` domain reference types (`CASH_BANK` and `PAYMENT`).
- Dynamically calculated KPIs (Inflow, Outflow, Net Movement) from GL postings.
- Established **Single Source of Truth**: The Cash & Bank view is now a literal reflection of the GL for those account types.

---

## 🚫 CBJ-003 — Deprecate Redundant CRUD

### 1. Analysis
Since all cash/bank movements should originate from operational modules (Banking & Payments), allowing direct manual CRUD on `cash_bank_journals` was a security and logic risk.

### 2. Implementation
- Updated `RegisterCashBankJournalRoutes` to disable `POST`, `PUT`, and `DELETE`.
- Implemented `deprecatedCashBankWrite` handler that returns `405 Method Not Allowed`.
- Preserved existing `GET` routes for backward compatibility and monitoring.

---

## 🖥️ CBJ-004 — Align FE with Backend

### 1. Analysis
Frontend UI offered "Create" and "Edit" possibilities that were inconsistent with the read-only monitoring nature of a subledger.

### 2. Implementation
- Removed Create/Edit buttons from `CashBankJournalsList`.
- Added `Lock` badge: "Auto-generated transactions only" (translated).
- Added **Source Module** filter to allow filtering entries by Sales, Purchase, Finance, etc.
- Unified data mapping using `mapJournalToUnifiedRow`.
- Fully localized all labels in `en.ts` and `id.ts`.

---

## 🛡️ CBJ-006 — Security & Fraud Hardening

### 1. Actions Taken
- **Tampering Blocked**: Manual AR/AP/Inventory manipulation via journal is now impossible due to the global protection layer.
- **Audit Traceability**: Every entry now carries a `source` module tag and `created_by` metadata, ensuring full transparency of auto-generated journals.

---

## 📊 Summary of Changes

| Task | Component | Change Type | Result |
| :--- | :--- | :--- | :--- |
| **CBJ-001** | `JournalEntryUsecase` | Domain Logic | Global blocking of control account tampering |
| **CBJ-002** | `JournalEntryHandler` | Data Source | GL Unification (Single Source of Truth) |
| **CBJ-003** | `CashBankRouter` | Security | Deprecated direct write API (405) |
| **CBJ-004** | `CashBankJournalsList` | UI/UX | Read-only Monitoring View with Source Filtering |

**VERDICT: ENTERPRISE READY**
