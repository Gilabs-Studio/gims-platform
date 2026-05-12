# Module Transaction Coverage

## Purpose

Dokumen ini merangkum coverage workflow transaksi per modul di suite k6 saat ini.

Tujuan utamanya adalah membedakan dengan tegas antara:

- workflow yang sudah benar-benar diimplementasikan di script
- workflow yang baru tercakup secara tidak langsung
- workflow yang masih planned di roadmap Phase 1.5

## Coverage Status Matrix

| Modul | Workflow | Status | Coverage Saat Ini | Referensi |
| --- | --- | --- | --- | --- |
| Sales | SQ → SO → DO → Invoice → Payment → Confirm | Implemented | End-to-end di `transaction-test.js` | [sales/SALES_REVENUE_CYCLE_IMPLEMENTED.md](./sales/SALES_REVENUE_CYCLE_IMPLEMENTED.md) |
| Finance | Payment confirmation → accounting side effect | Partially covered | Tercakup tidak langsung lewat confirm payment di Sales flow | [finance/FINANCE_TRANSACTION_COVERAGE.md](./finance/FINANCE_TRANSACTION_COVERAGE.md) |
| Purchase | PO → GR → Invoice/Payment | Planned | Belum ada script transaction khusus | [purchase/PURCHASE_TRANSACTION_WORKFLOW_PLANNED.md](./purchase/PURCHASE_TRANSACTION_WORKFLOW_PLANNED.md) |
| HRD | Attendance check-in timezone-aware | Planned | Belum ada script transaction khusus | [hrd/HRD_TRANSACTION_WORKFLOW_PLANNED.md](./hrd/HRD_TRANSACTION_WORKFLOW_PLANNED.md) |

## Current Reality

Kalau pertanyaannya adalah “flow transaksi per modul apa yang benar-benar dibuat sekarang?”, jawabannya saat ini adalah:

- Sales sudah ada dan paling lengkap.
- Finance baru ikut ter-cover sebagai efek samping dari payment confirmation di flow Sales.
- Purchase belum dibuat sebagai transaction workflow runnable.
- HRD belum dibuat sebagai transaction workflow runnable.

## Why This Distinction Matters

Tanpa pemisahan ini, pembaca bisa salah mengira bahwa seluruh modul ERP sudah punya transaction benchmark penuh. Padahal status sebenarnya masih bertahap.

Dokumen ini dipakai sebagai peta agar engineer tahu:

- modul mana yang sudah bisa dipakai untuk validasi transaksi nyata
- modul mana yang masih butuh implementasi
- dokumen mana yang menjelaskan detail per modul

## Reading Order

1. [sales/SALES_REVENUE_CYCLE_IMPLEMENTED.md](./sales/SALES_REVENUE_CYCLE_IMPLEMENTED.md)
2. [finance/FINANCE_TRANSACTION_COVERAGE.md](./finance/FINANCE_TRANSACTION_COVERAGE.md)
3. [purchase/PURCHASE_TRANSACTION_WORKFLOW_PLANNED.md](./purchase/PURCHASE_TRANSACTION_WORKFLOW_PLANNED.md)
4. [hrd/HRD_TRANSACTION_WORKFLOW_PLANNED.md](./hrd/HRD_TRANSACTION_WORKFLOW_PLANNED.md)
