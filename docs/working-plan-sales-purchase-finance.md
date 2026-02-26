# Analisis Modul Sales & Purchase dan Integrasi Finance

Dokumen ini berisi analisis perbandingan antara repository referensi (`erp-api` & `erp-front-end`) dan repository target kita (`apps/api` & `apps/web`) khusus untuk menu-menu Sales dan Purchase, serta rencana kerja (working plan) untuk mengimplementasikan fitur-fitur dan integrasi bisnis yang masih kurang.

## 1. Analisis Menu & Logic (Reference vs Target)

### A. Sales Module

#### 1. Sales Down Payments / Customer Invoices Down Payments
**Logic ERP (Reference):**
- **Flow**: Membuat faktur uang muka (Down Payment) berdasarkan Sales Order yang sudah *Approved*. Nomor faktur di-generate otomatis. Nominal tagihan (Amount) diisi secara manual.
- **RBAC**: Akses CRUD dan `set_pending`.
- **Integrasi Finance**:  
  - Saat pembayaran DP (Customer Invoice Down Payment) terkonfirmasi di menu Payment SO, sistem akan menjurnal: `Debit: Cash/Bank` dan `Credit: 206 (Sales Advances)`.
  - Terdapat juga integrasi attach Tax Invoice.
- **Status di Target (`apps/api`)**:
  - CRUD dan validasi untuk Customer Invoice Down Payment **SUDAH** kita selesaikan melalui `CustomerInvoiceDownPaymentUsecase`.
  - Frontend juga **SUDAH** dibuat di `features/sales/customer-invoice-down-payments`.

#### 2. Payments SO (Customer Payments)
**Logic ERP (Reference):**
- **Flow**: Mencatat penerimaan pembayaran dari pelanggan berdasarkan `CustomerInvoice` (baik Down Payment maupun Regular). 
- **Business Rule**: 
  - Invoice tidak boleh berstatus DRAFT.
  - Memastikan *Remaining Amount* berkurang. Jika lunas, status Invoice menjadi `PAID`, dan Sales Order otomatis menjadi `CLOSED` jika tagihan lunas.
- **Integrasi Finance (Jurnal)**: 
  - `Debit`: Akun Kas/Bank (berdasarkan `BankAccountID` atau default `100`).
  - `Credit`: Akun `206` (Sales Advances) jika jenis invoice down payment, atau akun `108` (Trade Receivables) jika invoice biasa.
  - `Credit` tambahan: Berdasarkan `allocations` (potongan, biaya admin dsb).
- **Status di Target (`apps/api`)**:
  - Pembayaran SO saat ini masih bersifat dasar atau numpang di modul `CustomerInvoiceUsecase.RecordPayment()`, belum memiliki module/menu tersendiri seperti `PaymentSO` di referensi (seperti validasi alokasi Chart of Account saat bayar).
  - Jurnal integrasi ke modul Finance **BELUM** sepenuhnya selaras dan otomatis (seperti `206` vs `108` secara eksplisit melalui Payment allocations).

#### 3. Receivables Recap (Piutang Pelanggan)
**Logic ERP (Reference):**
- **Flow**: Menampilkan status total piutang per pelanggan (Total Receivable, Paid Amount, Outstanding Amount, Aging Days).
- **Business Rule**:
  - Mengkalkulasikan semua invoice (di luar Draft) vs semua payments (Confirmed). 
  - Ada klasifikasi *Aging Category* (Current, Overdue 1-30, Overdue 31-60, dst.).
- **Status di Target (`apps/api` & `apps/web`)**:
  - Menu Receivables Recap **BELUM** diimplementasikan. Kita perlu membuat API `ReceivablesRecap` dan antarmuka UI di Frontend untuk laporan/rekap ini di bawah modul Sales atau Finance.

---

### B. Purchase Module

#### 1. Supplier Invoices Down Payments
**Logic ERP (Reference):**
- **Flow**: Mirip dengan Customer DP, tapi untuk pemasok (Vendor). Tagihan uang muka untuk Purchase Order.
- **Integrasi Finance**:
  - Saat dibayar di `PaymentPO`: `Debit`: Uang Muka Pembelian (Klaim/Advances) - biasanya akun `118` / `106`, dan `Credit`: Kas/Bank.
- **Status di Target (`apps/api`)**:
  - Sudah ada di backend (`supplier_invoice_down_payment_handler.go`) dan frontend (di folder `features/purchase/supplier-invoice-down-payments`). Fiturnya relatif aman.

#### 2. Payment PO (Supplier Payments)
**Logic ERP (Reference):**
- **Flow**: Membayar tagihan dari Pemasok. Pemilihan Bank/Kas dan Allocation (PPH, biaya admin).
- **Business Rule**: Jika terbayar lunas, PO status bisa ditutup.
- **Integrasi Finance**:
  - Konfirmasi payment membuat Jurnal Otomatis (Debit: AP (201) / Uang muka pembelian (118), Credit: Kas/Bank).
- **Status di Target**:
  - Kita memiliki `purchasePaymentEn` dll di frontend, yang menandakan fondasi sudah ada. Namun, validasi penjurnalan dan alokasi COA perlu ditinjau ulang agar seratus persen sesuai referensi ERP.

---

## 2. Fitur & Integrasi yang BELUM Diimplementasikan di GIMS-Platform

Dari bedah kode referensi di atas, berikut adalah hal-hal yang **belum** ada di target repository kita, atau baru sebagian dan perlu ditambahkan:

1. **Jurnal Otomatis Customer Payment (SO) & Down Payment**:
   - Di `gims-platform/apps/api`, pada saat pembayaran SO (Customer Payment), kita perlu memastikan *Accounting Journaling Engine* menghasilkan jurnal yang benar sesuai tipe Invoicenya (`108` Trade Receivables vs `206` Sales Advances), sekaligus mempertimbangkan `allocations`.
2. **Detail Modul Payment SO Terpisah**:
   - ERP referensi memakai `PaymentSOUsecase` / `PaymentSORepository` yang spesifik di modul Sales. Kita perlu membuat `apps/api/internal/sales/.../payment_so_*` dan `PaymentPO` jika di kita sekarang ini baru tergabung dalam invoice atau payment finance secara umum.
3. **Menu dan Report Receivables Recap**:
   - Belum ada API (Backend) maupun UI (Frontend) di modul Sales/Finance untuk melihat Piutang Pelanggan vs Umur Piutang (Aging). ERP referensi punya *Receivables Recap* yang solid dengan kategori *Bad Debt*, *Overdue*, *Current*.
4. **Integrasi Status Closed Otomatis**:
   - Sales Order diubah menjadi `CLOSED` ketika *total confirmed payment* >= *invoice amount* secara komprehensif.

---

## 3. Working Plan (Rencana Kerja Terstruktur)

Untuk melengkapi kekurangan integrasi tersebut, kita akan menjalankannya dalam 3 fase.

### Fase 1: Implementasi Modul Payment SO (Customer Payment) & Relasi Jurnalnya ✅ SELESAI

**Backend (`apps/api`):**
- `internal/sales/data/models/sales_payment.go` — Model `SalesPayment` (tabel `sales_payments`)
- `internal/sales/data/repositories/sales_payment_repository.go` — Repository CRUD + List + Filter
- `internal/sales/domain/dto/sales_payment_dto.go` — DTO request/response
- `internal/sales/domain/mapper/sales_payment_mapper.go` — Mapper model → DTO
- `internal/sales/domain/usecase/sales_payment_usecase.go` — Usecase (Create, Confirm + Journal, Delete, Export)
- `internal/sales/presentation/handler/sales_payment_handler.go` — HTTP Handler (8 endpoints)
- `internal/sales/presentation/router/sales_payment_routers.go` — Router + 6 RBAC permissions
- `internal/sales/presentation/routers.go` — Wiring ke modul Sales
- `internal/core/infrastructure/database/migrate.go` — Auto-migration `SalesPayment`
- `cmd/api/main.go` — Inject `journalUC` & `coaUC` ke Sales module
- `seeders/permission_seeder.go` — 6 permission seeds (read, create, delete, confirm, export, audit_trail)
- `seeders/menu_seeder.go` — Menu "Payments" under Sales

**Frontend (`apps/web`):**
- `src/features/sales/payments/` — Complete feature folder (types, services, hooks, schemas, i18n, components)
- `app/[locale]/(dashboard)/sales/payments/page.tsx` — Next.js page with PermissionGuard
- `src/i18n/request.ts` — Registered salesPayment namespace (EN & ID)
- `src/lib/navigation-config.ts` — Sidebar nav link

**Security & Performance:**
- ✅ `SELECT ... FOR UPDATE` row locking (race condition prevention)
- ✅ Over-payment guard (sums confirmed payments before allowing)
- ✅ Bank account snapshot (historical data preservation)
- ✅ RBAC per-endpoint permission checks
- ✅ Input sanitization & validation

**Journal Integration:**
- Debit: Bank/Cash account (from `BankAccount.ChartOfAccountID` or fallback `11100`)
- Credit: `11300` (Trade Receivables) untuk invoice biasa, atau `21200` (Sales Advances) untuk DP
- Invoice status otomatis update ke `PARTIAL` / `PAID`
- SO otomatis `CLOSED` jika invoice lunas

### Fase 2: Implementasi Modul Receivables Recap ✅ SELESAI

**Backend (`apps/api`):**
- `internal/sales/data/repositories/receivables_recap_repository.go` — CTE query (aging analysis, summary, export)
- `internal/sales/domain/usecase/receivables_recap_usecase.go` — List, GetSummary, ExportCSV
- `internal/sales/presentation/handler/receivables_recap_handler.go` — 3 endpoints (list, summary, export)
- `internal/sales/presentation/router/receivables_recap_routers.go` — Router + RBAC
- `internal/sales/presentation/routers.go` — Wiring

**Frontend (`apps/web`):**
- `src/features/sales/receivables-recap/` — Complete feature folder (types, services, hooks, i18n, components)
- `app/[locale]/(dashboard)/sales/receivables-recap/page.tsx` — Next.js page
- `src/i18n/request.ts` — Registered receivablesRecap namespace
- `src/lib/navigation-config.ts` — Sidebar nav link

**Security & Performance:**
- ✅ SQL injection protection (whitelisted sort columns)
- ✅ Optimized CTE query (single pass, no N+1)
- ✅ Aging bucket analysis: Current, Overdue 1-30, 31-60, 61-90, Bad Debt (>90)
- ✅ Summary endpoint for dashboard cards
- ✅ CSV export with streaming

### Fase 3: Penyelarasan Integrasi Payment PO ke Finance ✅ VERIFIED

**Review hasil:**
- ✅ `PurchasePaymentUsecase.Confirm()` sudah menggunakan `SELECT ... FOR UPDATE` locking
- ✅ Jurnal otomatis: **Debit** AP `21000` (Trade Payables), **Credit** Bank/Cash
- ✅ Over-payment prevention (sum existing confirmed payments)
- ✅ Invoice status auto-update (`PARTIAL` → `PAID`)
- ✅ Fallback ke akun `11100` (Cash) jika BankAccount tidak punya linked COA
- ✅ Audit trail logging untuk create/delete/confirm/export
- ✅ Frontend Payment PO sudah lengkap (list, form, detail, audit trail)

**Tidak perlu perubahan** — integrasi Payment PO ke Finance sudah lengkap dan selaras dengan pola referensi ERP.

---
**Catatan Penting**: Seluruh 3 fase telah diselesaikan. Modul Sales Payment, Receivables Recap, dan integrasi Purchase Payment ke Finance semuanya sudah berfungsi dengan journal entries otomatis, RBAC, audit trail, dan UI yang konsisten.

